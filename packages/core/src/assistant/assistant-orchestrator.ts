import type { AssistantSessionRow, AssistantMessageRow } from '@tibyan/db';
import {
  AssistantSessionRepository,
  AssistantMessageRepository,
  AssistantAuditRepository,
  AssistantConfirmationRepository,
} from '@tibyan/db';
import {
  requireTool,
  listToolsSummary,
  type ToolExecutionContext,
  type ToolExecutionResult,
} from './tool-registry.js';
import { generatePreview, isPreviewExpired, type PreviewResult, type PreviewItem } from './preview-engine.js';
import { createConfirmationRecord, type ConfirmationRecord } from './confirmation-workflow.js';
import { executeConfirmedAction, type ExecutionReceiptRecord, type ExecuteActionDeps } from './execute-audit.js';
import { executeUndo } from './undo-layer.js';
import { buildSafeContext, formatContextForPrompt, type SafeContextPayload } from './context-builder.js';
import { registerAllAssistantTools } from './tools/index.js';
import { DEFAULT_TIBYAN_AI_MODEL } from '../ai/model-config.js';

export interface OrchestratorDeps {
  systemDb: { db: unknown };
  geminiCredentialService: { get(): string | null };
  fetchImpl?: (input: string, init: RequestInit) => Promise<Response>;
  model?: string;
  getActiveAcademicYear: () => { id: string; name: string } | null;
  resolveEntityLabel: (scope: string, entityId: string) => Promise<string | null>;
  buildToolPreview: (toolName: string, input: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<PreviewItem[]>;
  executeTool: (toolName: string, input: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolExecutionResult>;
  undoTool: (receiptId: string, snapshot: unknown) => Promise<{ success: boolean; error?: string }>;
}

export class AssistantOrchestrator {
  private readonly sessionRepo: AssistantSessionRepository;
  private readonly messageRepo: AssistantMessageRepository;
  private readonly auditRepo: AssistantAuditRepository;
  private readonly confirmRepo: AssistantConfirmationRepository;
  private readonly pendingPreviews = new Map<string, PreviewResult>();
  private readonly pendingConfirmations = new Map<string, ConfirmationRecord>();
  private readonly undoSnapshots = new Map<string, unknown>();
  private toolsRegistered = false;

  constructor(private readonly deps: OrchestratorDeps) {
    this.sessionRepo = new AssistantSessionRepository(deps.systemDb);
    this.messageRepo = new AssistantMessageRepository(deps.systemDb);
    this.auditRepo = new AssistantAuditRepository(deps.systemDb);
    this.confirmRepo = new AssistantConfirmationRepository(deps.systemDb);
  }

  private ensureToolsRegistered(): void {
    if (!this.toolsRegistered) {
      registerAllAssistantTools();
      this.toolsRegistered = true;
    }
  }

  createSession(userId: string, title?: string, scope?: string, entityId?: string): AssistantSessionRow {
    const now = new Date().toISOString();
    return this.sessionRepo.insert({
      id: crypto.randomUUID(),
      userId,
      title: title ?? null,
      contextScope: scope ?? null,
      contextEntityId: entityId ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  listSessions(userId: string): AssistantSessionRow[] {
    return this.sessionRepo.listByUser(userId);
  }

  getSession(sessionId: string): AssistantSessionRow | undefined {
    return this.sessionRepo.findById(sessionId);
  }

  deleteSession(sessionId: string): void {
    this.sessionRepo.delete(sessionId);
  }

  getHistory(sessionId: string, cursor?: string): AssistantMessageRow[] {
    return this.messageRepo.listBySession(sessionId, 100, cursor);
  }

  getTools() {
    this.ensureToolsRegistered();
    return listToolsSummary();
  }

  async sendMessage(
    sessionId: string,
    content: string,
    userId: string,
    actorName: string,
    role: string,
    permissions: string[],
    scope?: string,
    entityId?: string,
  ): Promise<{
    messages: AssistantMessageRow[];
    preview?: PreviewResult;
    receipt?: ExecutionReceiptRecord;
  }> {
    this.ensureToolsRegistered();

    const session = this.sessionRepo.findById(sessionId);
    if (!session) throw new Error('SESSION_NOT_FOUND');

    const now = new Date().toISOString();

    const userMessage = this.messageRepo.insert({
      id: crypto.randomUUID(),
      sessionId,
      role: 'user',
      type: 'text',
      content,
      createdAt: now,
    });

    const context = await buildSafeContext(
      {
        getActiveAcademicYear: this.deps.getActiveAcademicYear,
        resolveEntityLabel: this.deps.resolveEntityLabel,
      },
      scope ?? session.contextScope,
      entityId ?? session.contextEntityId,
    );

    const toolContext: ToolExecutionContext = {
      actorUserId: userId,
      actorName,
      actorRole: role,
      permissions,
      activeAcademicYearId: context.activeAcademicYearId,
    };

    const geminiApiKey = this.deps.geminiCredentialService.get();
    if (!geminiApiKey) {
      const errorMsg = this.messageRepo.insert({
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        type: 'error',
        content: 'لم يتم تكوين مفتاح الذكاء الاصطناعي. يرجى إعداده من الإعدادات أولاً.',
        createdAt: new Date().toISOString(),
      });
      return { messages: [userMessage, errorMsg] };
    }

    const history = this.messageRepo.listBySession(sessionId, 50);
    const conversationHistory = history.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const toolList = listToolsSummary();
    const systemPrompt = this.buildSystemPrompt(context, toolList);

    const messages = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...conversationHistory,
      { role: 'user', parts: [{ text: content }] },
    ];

    try {
      const response = await this.callGemini(geminiApiKey, messages);

      const parsedResponse = this.parseStructuredResponse(response);

      if (parsedResponse.type === 'reply' && parsedResponse.reply) {
        const assistantMsg = this.messageRepo.insert({
          id: crypto.randomUUID(),
          sessionId,
          role: 'assistant',
          type: 'text',
          content: parsedResponse.reply,
          createdAt: new Date().toISOString(),
        });
        return { messages: [userMessage, assistantMsg] };
      }

      if ((parsedResponse.type === 'tool-call' || parsedResponse.type === 'multi-tool-call') && parsedResponse.toolCalls?.length) {
        const toolProposal = parsedResponse.toolCalls[0]!;
        const tool = requireTool(toolProposal.toolName);

        if (tool.riskLevel === 'read-only') {
          const result = await this.deps.executeTool(toolProposal.toolName, toolProposal.toolInput, toolContext);
          const resultMsg = this.messageRepo.insert({
            id: crypto.randomUUID(),
            sessionId,
            role: 'tool-result',
            type: 'tool-result',
            content: result.success ? JSON.stringify(result.data) : `خطأ: ${result.error}`,
            toolCallId: crypto.randomUUID(),
            toolName: toolProposal.toolName,
            toolInputJson: JSON.stringify(toolProposal.toolInput),
            toolOutputJson: JSON.stringify(result.data),
            createdAt: new Date().toISOString(),
          });

          const followUpPrompt = `أداة ${tool.descriptionAr} أعادت النتيجة التالية:\n${JSON.stringify(result.data)}\n\nرجاءًقدم إجابة موجزة للمستخدم بناءً على هذه النتيجة.`;
          const followUpMessages = [
            ...messages,
            { role: 'model', parts: [{ text: `سأستخدم أداة ${tool.descriptionAr}` }] },
            { role: 'user', parts: [{ text: followUpPrompt }] },
          ];
          const followUpResponse = await this.callGemini(geminiApiKey, followUpMessages);
          const followUpParsed = this.parseStructuredResponse(followUpResponse);

          const finalMsg = this.messageRepo.insert({
            id: crypto.randomUUID(),
            sessionId,
            role: 'assistant',
            type: 'text',
            content: followUpParsed.reply ?? followUpResponse,
            createdAt: new Date().toISOString(),
          });

          return { messages: [userMessage, resultMsg, finalMsg] };
        }

        const preview = await generatePreview(
          {
            generateId: () => crypto.randomUUID(),
            buildPreview: (toolName, input) => this.deps.buildToolPreview(toolName, input, toolContext),
            buildSummary: (toolName, items) => this.buildPreviewSummary(toolName, items),
          },
          tool,
          toolProposal.toolInput,
        );

        this.pendingPreviews.set(preview.id, preview);
        const confirmation = createConfirmationRecord(preview);
        this.pendingConfirmations.set(preview.id, confirmation);

        const previewMsg = this.messageRepo.insert({
          id: crypto.randomUUID(),
          sessionId,
          role: 'assistant',
          type: 'preview',
          content: preview.summary,
          toolCallId: crypto.randomUUID(),
          toolName: toolProposal.toolName,
          toolInputJson: JSON.stringify(toolProposal.toolInput),
          confirmationToken: preview.id,
          previewId: preview.id,
          createdAt: new Date().toISOString(),
        });

        return { messages: [userMessage, previewMsg], preview };
      }

      const fallbackMsg = this.messageRepo.insert({
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        type: 'text',
        content: parsedResponse.reply ?? 'عذراً، لم أتمكن من معالجة طلبك. يرجى المحاولة مرة أخرى.',
        createdAt: new Date().toISOString(),
      });

      return { messages: [userMessage, fallbackMsg] };
    } catch (err) {
      const errorMsg = this.messageRepo.insert({
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        type: 'error',
        content: err instanceof Error ? err.message : 'خطأ غير متوقع',
        createdAt: new Date().toISOString(),
      });
      return { messages: [userMessage, errorMsg] };
    }
  }

  async confirmAction(
    previewId: string,
    confirmed: boolean,
    userId: string,
    actorName: string,
    role: string,
    permissions: string[],
    sessionId: string,
  ): Promise<{ messages: AssistantMessageRow[]; receipt?: ExecutionReceiptRecord }> {
    this.ensureToolsRegistered();

    const preview = this.pendingPreviews.get(previewId);
    const confirmation = this.pendingConfirmations.get(previewId);

    if (!preview || !confirmation) {
      throw new Error('CONFIRMATION_NOT_FOUND');
    }

    if (isPreviewExpired(preview)) {
      this.pendingPreviews.delete(previewId);
      this.pendingConfirmations.delete(previewId);
      throw new Error('CONFIRMATION_EXPIRED');
    }

    if (!confirmed) {
      this.pendingPreviews.delete(previewId);
      this.pendingConfirmations.delete(previewId);

      const cancelMsg = this.messageRepo.insert({
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        type: 'text',
        content: 'تم إلغاء الإجراء.',
        createdAt: new Date().toISOString(),
      });

      this.auditRepo.insert({
        id: crypto.randomUUID(),
        actorUserId: userId,
        sessionId,
        toolName: preview.toolName,
        action: 'CANCEL',
        inputSummaryJson: JSON.stringify(preview.toolInput).slice(0, 2000),
        affectedEntitiesJson: '[]',
        outcome: 'CANCELED',
        createdAt: new Date().toISOString(),
      });

      return { messages: [cancelMsg] };
    }

    confirmation.confirmed = true;
    this.confirmRepo.confirm(previewId);

    const toolContext: ToolExecutionContext = {
      actorUserId: userId,
      actorName,
      actorRole: role,
      permissions,
      activeAcademicYearId: this.deps.getActiveAcademicYear()?.id ?? null,
    };

    const execDeps: ExecuteActionDeps = {
      generateId: () => crypto.randomUUID(),
      persistReceipt: (receipt) => {
        this._lastReceipt = receipt;
      },
      persistAudit: (audit) => {
        this.auditRepo.insert(audit);
      },
      persistUndoSnapshot: (receiptId, snapshot) => {
        this.undoSnapshots.set(receiptId, snapshot);
      },
    };

    this._lastReceipt = undefined;

    const result = await executeConfirmedAction(
      execDeps,
      requireTool(preview.toolName),
      preview.toolInput,
      confirmation,
      preview,
      toolContext,
      sessionId,
      async (input, ctx) => this.deps.executeTool(preview.toolName, input, ctx),
    );

    this.pendingPreviews.delete(previewId);
    this.pendingConfirmations.delete(previewId);

    const receiptMsg = this.messageRepo.insert({
      id: crypto.randomUUID(),
      sessionId,
      role: 'assistant',
      type: 'execution-receipt',
      content: result.success ? `تم تنفيذ ${requireTool(preview.toolName).descriptionAr} بنجاح.` : `فشل التنفيذ: ${result.error}`,
      receiptId: result.receipt?.id,
      undoAvailable: result.receipt?.undoAvailable ?? false,
      undoToken: result.receipt?.undoToken,
      createdAt: new Date().toISOString(),
    });

    const confirmMsg = this.messageRepo.insert({
      id: crypto.randomUUID(),
      sessionId,
      role: 'assistant',
      type: 'confirmation',
      content: confirmed ? 'تم تأكيد الإجراء.' : 'تم رفض الإجراء.',
      confirmationToken: previewId,
      previewId,
      createdAt: new Date().toISOString(),
    });

    return { messages: [confirmMsg, receiptMsg], receipt: result.receipt };
  }

  cancelAction(previewId: string): void {
    this.pendingPreviews.delete(previewId);
    this.pendingConfirmations.delete(previewId);
  }

  async undoAction(
    receiptId: string,
    undoToken: string,
    userId: string,
    sessionId: string,
  ): Promise<{ messages: AssistantMessageRow[]; receipt: ExecutionReceiptRecord }> {
    const result = await executeUndo(
      {
        generateId: () => crypto.randomUUID(),
        getReceipt: (id) => this._lastReceipt?.id === id ? this._lastReceipt : undefined,
        getUndoSnapshot: (id) => this.undoSnapshots.get(id),
        persistAudit: (audit) => { this.auditRepo.insert(audit); },
      },
      receiptId,
      undoToken,
      sessionId,
      userId,
      this.deps.undoTool,
    );

    this.undoSnapshots.delete(receiptId);

    const toolName = this._lastReceipt?.toolName ?? 'unknown';
    const undoMsg = this.messageRepo.insert({
      id: crypto.randomUUID(),
      sessionId,
      role: 'assistant',
      type: 'undo-result',
      content: result.success ? `تم التراجع عن الإجراء بنجاح.` : `فشل التراجع: ${result.error}`,
      receiptId,
      createdAt: new Date().toISOString(),
    });

    const receipt: ExecutionReceiptRecord = {
      id: receiptId,
      toolName,
      toolInput: {},
      previewId: '',
      success: result.success,
      undoAvailable: false,
      executedAt: result.undoneAt,
    };

    return { messages: [undoMsg], receipt };
  }

  private _lastReceipt: ExecutionReceiptRecord | undefined;

  private buildSystemPrompt(ctx: SafeContextPayload, tools: Array<{ name: string; description: string; riskLevel: string }>): string {
    const contextStr = formatContextForPrompt(ctx);
    const toolsList = tools.map((t) => `- ${t.name}: ${t.description} (${t.riskLevel})`).join('\n');

    return `أنت مساعد ذكي للمعلم في نظام تبيان. يمكنك مساعدة المعلم في إدارة بياناته التعليمية.

${contextStr ? `السياق:\n${contextStr}\n` : ''}

الأدوات المتاحة:
${toolsList}

قواعد مهمة:
1. لا تُخترع معرفات (IDs). استخدم الأدوات للبحث أولاً.
2. الإجراءات الحساسة تتطلب تأكيداً من المستخدم قبل التنفيذ.
3. أعد دائماً استجابة JSON مهيكلة بالشكل: {"type": "reply"|"tool-call"|"multi-tool-call", "reply": "...", "toolCalls": [{"toolName": "...", "toolInput": {...}}]}
4. إذا لم تكن بحاجة لأداة، استخدم type: "reply".
5. إذا كنت بحاجة لأداة، استخدم type: "tool-call" مع toolName و toolInput.
6. لا تقم بأي إجراء حساس بدون تأكيد صريح من المستخدم.`;
  }

  private async callGemini(apiKey: string, messages: Array<{ role: string; parts: Array<{ text: string }> }>): Promise<string> {
    const model = this.deps.model ?? DEFAULT_TIBYAN_AI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    try {
      const fetchFn = this.deps.fetchImpl ?? fetch;
      const response = await fetchFn(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('تعذر الاتصال بخدمة الذكاء الاصطناعي');
      }

      const payload = await response.json();
      return payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseStructuredResponse(response: string): { type: string; reply?: string; toolCalls?: Array<{ toolName: string; toolInput: Record<string, unknown> }> } {
    try {
      const parsed = JSON.parse(response);
      if (parsed && typeof parsed === 'object') {
        if (['reply', 'tool-call', 'multi-tool-call'].includes(parsed.type)) {
          return parsed;
        }
      }
      return { type: 'reply', reply: response };
    } catch {
      return { type: 'reply', reply: response };
    }
  }

  private buildPreviewSummary(toolName: string, items: PreviewItem[]): string {
    const tool = requireTool(toolName);
    if (items.length === 0) return `إجراء: ${tool.descriptionAr}`;
    const labels = items.map((i) => i.entityLabel).join('، ');
    return `${tool.descriptionAr}: ${labels}`;
  }
}
