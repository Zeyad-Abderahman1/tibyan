import type { AssistantSessionRow, AssistantMessageRow } from '@tibyan/db';
import {
  AssistantSessionRepository,
  AssistantMessageRepository,
  AssistantAuditRepository,
  AssistantConfirmationRepository,
} from '@tibyan/db';
import {
  getTool,
  requireTool,
  listToolsSummary,
  type ToolExecutionContext,
  type ToolExecutionResult,
} from './tool-registry.js';
import { generatePreview, isPreviewExpired, type PreviewResult, type PreviewItem } from './preview-engine.js';
import { createConfirmationRecord, type ConfirmationRecord } from './confirmation-workflow.js';
import { executeConfirmedAction, type ExecutionReceiptRecord, type ExecuteActionDeps } from './execute-audit.js';
import { executeUndo, type UndoResult } from './undo-layer.js';
import { buildSafeContext, formatContextForPrompt, type SafeContextPayload } from './context-builder.js';
import { registerAllAssistantTools } from './tools/index.js';
import { DEFAULT_TIBYAN_AI_MODEL } from '../ai/model-config.js';
import { AssistantStructuredResponseSchema } from '@tibyan/contracts';
import { classifyConfirmationPolicy } from './risk-classifier.js';

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

export interface OrchestratorResponse {
  success: boolean;
  messages: AssistantMessageRow[];
  preview?: PreviewResult;
  receipt?: ExecutionReceiptRecord;
  undoResult?: UndoResult;
  error?: {
    code: import('@tibyan/contracts').AssistantErrorCode;
    message: string;
  };
}

export class AssistantOrchestrator {
  private readonly sessionRepo: AssistantSessionRepository;
  private readonly messageRepo: AssistantMessageRepository;
  private readonly auditRepo: AssistantAuditRepository;
  private readonly confirmRepo: AssistantConfirmationRepository;
  private readonly pendingPreviews = new Map<string, PreviewResult & { sessionId?: string }>();
  private readonly pendingConfirmations = new Map<string, ConfirmationRecord>();
  private readonly undoSnapshots = new Map<string, unknown>();
  private toolsRegistered = false;

  constructor(private readonly deps: OrchestratorDeps) {
    const drizzleDb = (deps.systemDb as any)?.db ?? deps.systemDb;
    this.sessionRepo = new AssistantSessionRepository(drizzleDb);
    this.messageRepo = new AssistantMessageRepository(drizzleDb);
    this.auditRepo = new AssistantAuditRepository(drizzleDb);
    this.confirmRepo = new AssistantConfirmationRepository(drizzleDb);
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
  ): Promise<OrchestratorResponse> {
    this.ensureToolsRegistered();

    const session = this.sessionRepo.findById(sessionId);
    if (!session) {
      return {
        success: false,
        messages: [],
        error: { code: 'SESSION_NOT_FOUND', message: 'الجلسة غير موجودة' },
      };
    }

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
      return {
        success: false,
        messages: [userMessage, errorMsg],
        error: {
          code: 'GEMINI_CREDENTIAL_MISSING',
          message: 'لم يتم تكوين مفتاح الذكاء الاصطناعي. يرجى إعداده من الإعدادات أولاً.',
        },
      };
    }

    const history = this.messageRepo.listBySession(sessionId, 50);
    // Exclude the newly inserted userMessage from past history to avoid duplication
    const conversationHistory = history
      .filter((m) => m.id !== userMessage.id)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const toolList = listToolsSummary();
    const systemPrompt = this.buildSystemPrompt(context, toolList);

    const conversationContents: Array<{ role: string; parts: Array<{ text: string }> }> = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...conversationHistory,
      { role: 'user', parts: [{ text: content }] },
    ];

    const generatedMessages: AssistantMessageRow[] = [userMessage];
    const MAX_TOOL_STEPS = 8;
    let stepCount = 0;
    const executedToolSignatures = new Set<string>();

    try {
      while (stepCount < MAX_TOOL_STEPS) {
        const responseText = await this.callGemini(geminiApiKey, conversationContents);
        const parsedResponse = this.parseStructuredResponse(responseText);

        if (parsedResponse.type === 'reply' || !parsedResponse.toolCalls || parsedResponse.toolCalls.length === 0) {
          const replyText = parsedResponse.reply || responseText || 'تمت معالجة طلبك بنجاح.';
          const assistantMsg = this.messageRepo.insert({
            id: crypto.randomUUID(),
            sessionId,
            role: 'assistant',
            type: 'text',
            content: replyText,
            createdAt: new Date().toISOString(),
          });
          generatedMessages.push(assistantMsg);
          return { success: true, messages: generatedMessages };
        }

        // Handle tool calls proposed by the model
        let reachedConfirmation = false;
        let anyToolExecuted = false;

        for (const toolProposal of parsedResponse.toolCalls) {
          stepCount++;
          if (stepCount > MAX_TOOL_STEPS) {
            break;
          }

          const toolSig = `${toolProposal.toolName}:${JSON.stringify(toolProposal.toolInput ?? {})}`;
          if (executedToolSignatures.has(toolSig)) {
            // Abort repetitive tool calls
            continue;
          }
          executedToolSignatures.add(toolSig);

          const tool = getTool(toolProposal.toolName);
          if (!tool) {
            conversationContents.push({
              role: 'user',
              parts: [{ text: `خطأ: الأداة "${toolProposal.toolName}" غير مسجلة في النظام.` }],
            });
            continue;
          }

          // Permission enforcement
          if (role !== 'OWNER') {
            const missing = tool.requiredPermissions.filter((p) => !permissions.includes(p));
            if (missing.length > 0) {
              const permErrMsg = `ليس لديك الصلاحيات الكافية لتشغيل أداة ${tool.descriptionAr} (${tool.name}). الصلاحيات المطلوبة: ${missing.join(', ')}`;
              const errorMsg = this.messageRepo.insert({
                id: crypto.randomUUID(),
                sessionId,
                role: 'assistant',
                type: 'error',
                content: permErrMsg,
                createdAt: new Date().toISOString(),
              });
              generatedMessages.push(errorMsg);
              return {
                success: false,
                messages: generatedMessages,
                error: { code: 'PERMISSION_DENIED', message: permErrMsg },
              };
            }
          }

          const confirmationPolicy = classifyConfirmationPolicy(tool, toolProposal.toolInput);
          if (confirmationPolicy === 'required') {
            // Generate preview and pause for user confirmation
            const preview = await generatePreview(
              {
                generateId: () => crypto.randomUUID(),
                buildPreview: (name, input) => this.deps.buildToolPreview(name, input, toolContext),
                buildSummary: (name, items) => this.buildPreviewSummary(name, items),
              },
              tool,
              toolProposal.toolInput,
            );

            const previewWithSession = Object.assign(preview, { sessionId });
            this.pendingPreviews.set(preview.id, previewWithSession);
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

            generatedMessages.push(previewMsg);
            reachedConfirmation = true;
            return {
              success: true,
              messages: generatedMessages,
              preview,
            };
          }

          // Execute read-only or immediate action
          const result = await this.deps.executeTool(toolProposal.toolName, toolProposal.toolInput, toolContext);
          anyToolExecuted = true;

          const resultMsg = this.messageRepo.insert({
            id: crypto.randomUUID(),
            sessionId,
            role: 'tool-result',
            type: 'tool-result',
            content: result.success ? JSON.stringify(result.data) : `خطأ: ${result.error}`,
            toolCallId: crypto.randomUUID(),
            toolName: toolProposal.toolName,
            toolInputJson: JSON.stringify(toolProposal.toolInput),
            toolOutputJson: JSON.stringify(result.data ?? null),
            createdAt: new Date().toISOString(),
          });
          generatedMessages.push(resultMsg);

          conversationContents.push({
            role: 'model',
            parts: [{ text: JSON.stringify({ type: 'tool-call', toolCalls: [toolProposal] }) }],
          });
          conversationContents.push({
            role: 'user',
            parts: [
              {
                text: `أعادت أداة ${tool.descriptionAr} (${tool.name}) النتيجة التالية:\n${JSON.stringify(result.data ?? result.error)}\n\nإذا كنت بحاجة لمعلومات أخرى استدعِ أداة أخرى، وإلا لخص وقدم الإجابة النهائية للمعلم باللغة العربية.`,
              },
            ],
          });
        }

        if (reachedConfirmation) {
          break;
        }

        if (!anyToolExecuted) {
          // No executable tools proposed; terminate loop
          break;
        }
      }

      // If loop finished through tool executions, solicit final synthesis if not already provided
      const lastMsg = generatedMessages[generatedMessages.length - 1];
      if (lastMsg && lastMsg.role !== 'assistant') {
        const finalSynthesis = await this.callGemini(geminiApiKey, [
          ...conversationContents,
          {
            role: 'user',
            parts: [{ text: 'يرجى تقديم إجابة نهائية واضحة ومهذبة للمعلم بناءً على البيانات المستخرجة أعلاه.' }],
          },
        ]);
        const finalParsed = this.parseStructuredResponse(finalSynthesis);
        const finalMsg = this.messageRepo.insert({
          id: crypto.randomUUID(),
          sessionId,
          role: 'assistant',
          type: 'text',
          content: finalParsed.reply ?? finalSynthesis ?? 'تم جلب البيانات بنجاح.',
          createdAt: new Date().toISOString(),
        });
        generatedMessages.push(finalMsg);
      }

      return { success: true, messages: generatedMessages };
    } catch (err) {
      const errorContent = err instanceof Error ? err.message : 'خطأ غير متوقع';
      const errorMsg = this.messageRepo.insert({
        id: crypto.randomUUID(),
        sessionId,
        role: 'assistant',
        type: 'error',
        content: errorContent,
        createdAt: new Date().toISOString(),
      });
      generatedMessages.push(errorMsg);
      return {
        success: false,
        messages: generatedMessages,
        error: {
          code: 'GEMINI_UNAVAILABLE',
          message: errorContent,
        },
      };
    }
  }

  async confirmAction(
    previewId: string,
    confirmed: boolean,
    userId: string,
    actorName: string,
    role: string,
    permissions: string[],
    sessionId?: string,
  ): Promise<OrchestratorResponse> {
    this.ensureToolsRegistered();

    const preview = this.pendingPreviews.get(previewId);
    const confirmation = this.pendingConfirmations.get(previewId);

    if (!preview || !confirmation) {
      return {
        success: false,
        messages: [],
        error: { code: 'CONFIRMATION_NOT_FOUND', message: 'طلب التأكيد غير موجود أو انتهت صلاحيته' },
      };
    }

    const resolvedSessionId = sessionId || preview.sessionId || this.sessionRepo.listByUser(userId)[0]?.id;
    if (!resolvedSessionId) {
      return {
        success: false,
        messages: [],
        error: { code: 'SESSION_NOT_FOUND', message: 'الجلسة غير موجودة' },
      };
    }

    if (isPreviewExpired(preview)) {
      this.pendingPreviews.delete(previewId);
      this.pendingConfirmations.delete(previewId);
      return {
        success: false,
        messages: [],
        error: { code: 'CONFIRMATION_EXPIRED', message: 'انتهت صلاحية طلب التأكيد' },
      };
    }

    if (!confirmed) {
      this.pendingPreviews.delete(previewId);
      this.pendingConfirmations.delete(previewId);

      const cancelMsg = this.messageRepo.insert({
        id: crypto.randomUUID(),
        sessionId: resolvedSessionId,
        role: 'assistant',
        type: 'text',
        content: 'تم إلغاء الإجراء.',
        createdAt: new Date().toISOString(),
      });

      this.auditRepo.insert({
        id: crypto.randomUUID(),
        actorUserId: userId,
        sessionId: resolvedSessionId,
        toolName: preview.toolName,
        action: 'CANCEL',
        inputSummaryJson: JSON.stringify(preview.toolInput).slice(0, 2000),
        affectedEntitiesJson: '[]',
        outcome: 'CANCELED',
        createdAt: new Date().toISOString(),
      });

      return { success: true, messages: [cancelMsg] };
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
      resolvedSessionId,
      async (input, ctx) => this.deps.executeTool(preview.toolName, input, ctx),
    );

    this.pendingPreviews.delete(previewId);
    this.pendingConfirmations.delete(previewId);

    const toolDef = requireTool(preview.toolName);
    const receiptMsg = this.messageRepo.insert({
      id: crypto.randomUUID(),
      sessionId: resolvedSessionId,
      role: 'assistant',
      type: 'execution-receipt',
      content: result.success ? `تم تنفيذ ${toolDef.descriptionAr} بنجاح.` : `فشل التنفيذ: ${result.error}`,
      receiptId: result.receipt?.id,
      undoAvailable: result.receipt?.undoAvailable ?? false,
      undoToken: result.receipt?.undoToken,
      createdAt: new Date().toISOString(),
    });

    const confirmMsg = this.messageRepo.insert({
      id: crypto.randomUUID(),
      sessionId: resolvedSessionId,
      role: 'assistant',
      type: 'confirmation',
      content: 'تم تأكيد الإجراء وتنفيذه.',
      confirmationToken: previewId,
      previewId,
      createdAt: new Date().toISOString(),
    });

    return {
      success: result.success,
      messages: [confirmMsg, receiptMsg],
      receipt: result.receipt,
      error: result.error ? { code: 'TOOL_EXECUTION_FAILED', message: result.error } : undefined,
    };
  }

  cancelAction(previewId: string): void {
    this.pendingPreviews.delete(previewId);
    this.pendingConfirmations.delete(previewId);
  }

  async undoAction(
    receiptId: string,
    undoToken: string,
    userId: string,
    sessionId?: string,
  ): Promise<OrchestratorResponse> {
    const resolvedSessionId = sessionId || this.sessionRepo.listByUser(userId)[0]?.id;
    if (!resolvedSessionId) {
      return {
        success: false,
        messages: [],
        error: { code: 'SESSION_NOT_FOUND', message: 'الجلسة غير موجودة' },
      };
    }

    const result = await executeUndo(
      {
        generateId: () => crypto.randomUUID(),
        getReceipt: (id) => (this._lastReceipt?.id === id ? this._lastReceipt : undefined),
        getUndoSnapshot: (id) => this.undoSnapshots.get(id),
        persistAudit: (audit) => {
          this.auditRepo.insert(audit);
        },
      },
      receiptId,
      undoToken,
      resolvedSessionId,
      userId,
      this.deps.undoTool,
    );

    this.undoSnapshots.delete(receiptId);

    const toolName = this._lastReceipt?.toolName ?? 'unknown';
    const undoMsg = this.messageRepo.insert({
      id: crypto.randomUUID(),
      sessionId: resolvedSessionId,
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

    return {
      success: result.success,
      messages: [undoMsg],
      receipt,
      undoResult: result,
      error: result.error ? { code: 'UNDO_FAILED', message: result.error } : undefined,
    };
  }

  private _lastReceipt: ExecutionReceiptRecord | undefined;

  private buildSystemPrompt(
    ctx: SafeContextPayload,
    tools: Array<{ name: string; description: string; riskLevel: string }>,
  ): string {
    const contextStr = formatContextForPrompt(ctx);
    const toolsList = tools.map((t) => `- ${t.name}: ${t.description} (${t.riskLevel})`).join('\n');

    return `أنت "تِبيان" — المساعد الذكي للمعلم في نظام تِبيان لإدارة العمل التعليمي.
تتحدث باللغة العربية بأسلوب مهني وواضح وموجز.

${contextStr ? `السياق الحالي للمنصة:\n${contextStr}\n` : ''}

الأدوات المتاحة للنظام:
${toolsList}

تعليمات وقواعد العمل:
1. عند طلب المعلم لأي معلومة أو بيانات (مثل الطلاب، المجموعات، الحصص، الغياب، الدرجات، المالية):
   استدعِ الأداة المناسبة بصيغة JSON مهيكلة:
   {"type": "tool-call", "toolCalls": [{"toolName": "اسم_الأداة", "toolInput": {}}]}
2. عندما تتوفر لديك البيانات أو يجيب المعلم على سؤال عادي:
   أجب باللغة العربية الطبيعية بصيغة:
   {"type": "reply", "reply": "إجابتك باللغة العربية هنا"}
3. لا تخترع أية معرفات (IDs) أو بيانات غير موجودة، وابحث دائماً بالأدوات أولاً.
4. الإجراءات والتعديلات الحساسة (إنشاء، تعديل، حذف، تسجيل حضور، ماليات) تتطلب دائماً معاينة وتأكيد من المعلم.
5. أعد دائماً استجابة JSON صالحة فقط، دون نصوص خارج كائن JSON.`;
  }

  private async callGemini(
    apiKey: string,
    messages: Array<{ role: string; parts: Array<{ text: string }> }>,
  ): Promise<string> {
    const model = this.deps.model ?? DEFAULT_TIBYAN_AI_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);

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
        if (response.status === 429) {
          throw new Error('تم تجاوز حصة الاستخدام أو حد الطلبات لنموذج الذكاء الاصطناعي. يرجى المحاولة لاحقاً.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('تعذر الوصول إلى خدمة تِبيان بالمفتاح المحفوظ. تحقق من صحة المفتاح في الإعدادات.');
        }
        if (response.status === 404) {
          throw new Error(`تعذر العثور على نموذج الذكاء الاصطناعي (${model}).`);
        }
        throw new Error(`تعذر الاتصال بخدمة تِبيان الذكية (رمز الاستجابة: ${response.status}).`);
      }

      const payload = await response.json();
      return payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private parseStructuredResponse(response: string): {
    type: string;
    reply?: string;
    toolCalls?: Array<{ toolName: string; toolInput: Record<string, unknown> }>;
  } {
    try {
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed === 'object') {
        const validated = AssistantStructuredResponseSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data as any;
        }
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
