import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openSystemDatabase, closeAllDatabases, UserRepository } from '@tibyan/db';
import { AssistantOrchestrator } from '../src/assistant/assistant-orchestrator.js';
import { listTools, clearAllTools } from '../src/assistant/tool-registry.js';
import { ALL_PERMISSION_CODES } from '../src/auth/permissions.js';

describe('AssistantOrchestrator & Tool Architecture', () => {
  let systemDb: ReturnType<typeof openSystemDatabase>;
  let userRepo: UserRepository;
  let testUserId: string;

  beforeEach(() => {
    systemDb = openSystemDatabase({ filePath: ':memory:' });
    userRepo = new UserRepository(systemDb.db);
    const user = userRepo.create({
      id: crypto.randomUUID(),
      username: 'teacher',
      fullName: 'أستاذ أحمد',
      role: 'OWNER',
      pinHash: 'hash',
      salt: 'salt',
      failedAttempts: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    testUserId = user.id;
  });

  afterEach(() => {
    closeAllDatabases();
    clearAllTools();
  });

  it('manages sessions and message history correctly', () => {
    const orchestrator = new AssistantOrchestrator({
      systemDb,
      geminiCredentialService: { get: () => 'fake-key' },
      getActiveAcademicYear: () => ({ id: 'y1', name: '2026/2027' }),
      resolveEntityLabel: async () => null,
      buildToolPreview: async () => [],
      executeTool: async () => ({ success: true }),
      undoTool: async () => ({ success: true }),
    });

    const session = orchestrator.createSession(testUserId, 'جلسة اختبارية', 'PLATFORM_CONTROL');
    expect(session.id).toBeDefined();
    expect(session.title).toBe('جلسة اختبارية');
    expect(session.contextScope).toBe('PLATFORM_CONTROL');

    const sessions = orchestrator.listSessions(testUserId);
    expect(sessions.length).toBe(1);
    expect(sessions[0]?.id).toBe(session.id);

    const fetched = orchestrator.getSession(session.id);
    expect(fetched?.title).toBe('جلسة اختبارية');

    orchestrator.deleteSession(session.id);
    expect(orchestrator.listSessions(testUserId).length).toBe(0);
  });

  it('verifies all registered tools have valid PermissionCodes', () => {
    const orchestrator = new AssistantOrchestrator({
      systemDb,
      geminiCredentialService: { get: () => 'fake-key' },
      getActiveAcademicYear: () => null,
      resolveEntityLabel: async () => null,
      buildToolPreview: async () => [],
      executeTool: async () => ({ success: true }),
      undoTool: async () => ({ success: true }),
    });

    orchestrator.getTools();
    const tools = listTools();
    expect(tools.length).toBeGreaterThanOrEqual(50);

    const validCodes = new Set(ALL_PERMISSION_CODES as string[]);
    for (const tool of tools) {
      for (const perm of tool.requiredPermissions) {
        expect(validCodes.has(perm), `Tool ${tool.name} has invalid permission ${perm}`).toBe(true);
      }
    }
  });

  it('executes a multi-step read reasoning loop and synthesizes final answer', async () => {
    const executedCalls: string[] = [];
    let geminiCallCount = 0;

    const mockFetch = vi.fn().mockImplementation(async () => {
      geminiCallCount++;
      if (geminiCallCount === 1) {
        // First proposal: list groups
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        type: 'tool-call',
                        toolCalls: [{ toolName: 'list_groups', toolInput: {} }],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      } else if (geminiCallCount === 2) {
        // Second proposal: get enrollments for group g1
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        type: 'tool-call',
                        toolCalls: [{ toolName: 'get_group_enrollments', toolInput: { groupId: 'g1' } }],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      } else {
        // Final synthesis
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        type: 'reply',
                        reply: 'لديك مجموعة "أولى ثانوي" وبها طالبان مسجلان.',
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        };
      }
    });

    const orchestrator = new AssistantOrchestrator({
      systemDb,
      geminiCredentialService: { get: () => 'valid-secret-key' },
      fetchImpl: mockFetch as any,
      getActiveAcademicYear: () => ({ id: 'y1', name: '2026/2027' }),
      resolveEntityLabel: async () => null,
      buildToolPreview: async () => [],
      executeTool: async (toolName, _input) => {
        executedCalls.push(toolName);
        if (toolName === 'list_groups') {
          return { success: true, data: [{ id: 'g1', name: 'أولى ثانوي' }] };
        }
        if (toolName === 'get_group_enrollments') {
          return { success: true, data: [{ studentId: 's1', studentName: 'أحمد' }, { studentId: 's2', studentName: 'محمد' }] };
        }
        return { success: true, data: {} };
      },
      undoTool: async () => ({ success: true }),
    });

    const session = orchestrator.createSession(testUserId, 'محادثة المجموعات');
    const response = await orchestrator.sendMessage(
      session.id,
      'اعرض المجموعات وعدد الطلاب في كل مجموعة',
      testUserId,
      'أستاذ أحمد',
      'OWNER',
      ALL_PERMISSION_CODES,
    );

    expect(response.success).toBe(true);
    expect(executedCalls).toEqual(['list_groups', 'get_group_enrollments']);
    expect(response.messages.length).toBeGreaterThanOrEqual(4); // user + 2 tool results + final reply
    const finalMsg = response.messages[response.messages.length - 1];
    expect(finalMsg?.role).toBe('assistant');
    expect(finalMsg?.content).toContain('أولى ثانوي');
  });

  it('enforces permissions for assistant users and returns Arabic permission error', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    type: 'tool-call',
                    toolCalls: [{ toolName: 'create_student', toolInput: { fullName: 'طالب جديد' } }],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const orchestrator = new AssistantOrchestrator({
      systemDb,
      geminiCredentialService: { get: () => 'valid-secret-key' },
      fetchImpl: mockFetch as any,
      getActiveAcademicYear: () => ({ id: 'y1', name: '2026/2027' }),
      resolveEntityLabel: async () => null,
      buildToolPreview: async () => [],
      executeTool: async () => ({ success: true }),
      undoTool: async () => ({ success: true }),
    });

    const session = orchestrator.createSession(testUserId, 'جلسة مساعد');
    // Assistant user with only STUDENTS_READ (lacks STUDENTS_WRITE)
    const response = await orchestrator.sendMessage(
      session.id,
      'أضف طالب جديد اسمه علي',
      testUserId,
      'مساعد',
      'ASSISTANT',
      ['STUDENTS_READ'],
    );

    expect(response.success).toBe(false);
    expect(response.error?.code).toBe('PERMISSION_DENIED');
    const errorMsg = response.messages.find((m) => m.type === 'error');
    expect(errorMsg?.content).toContain('ليس لديك الصلاحيات الكافية');
  });

  it('pauses for confirmation on mutations requiring confirmation and executes on confirm', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    type: 'tool-call',
                    toolCalls: [{ toolName: 'create_lesson_plan', toolInput: { title: 'درس الجبر الأول' } }],
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    let toolExecuted = false;

    const orchestrator = new AssistantOrchestrator({
      systemDb,
      geminiCredentialService: { get: () => 'valid-secret-key' },
      fetchImpl: mockFetch as any,
      getActiveAcademicYear: () => ({ id: 'y1', name: '2026/2027' }),
      resolveEntityLabel: async () => null,
      buildToolPreview: async (_name, input) => [
        { entityLabel: input.title as string, changeKind: 'create', changes: [{ field: 'title', label: 'العنوان', after: input.title }] },
      ],
      executeTool: async () => {
        toolExecuted = true;
        return { success: true, data: { id: 'plan-101' }, undoSnapshot: { kind: 'create_lesson_plan', planId: 'plan-101' } };
      },
      undoTool: async () => ({ success: true }),
    });

    const session = orchestrator.createSession(testUserId, 'خطط الدروس');
    const response = await orchestrator.sendMessage(
      session.id,
      'أنشئ خطة درس جديدة للجبر',
      testUserId,
      'أستاذ أحمد',
      'OWNER',
      ALL_PERMISSION_CODES,
    );

    expect(response.success).toBe(true);
    expect(response.preview).toBeDefined();
    expect(toolExecuted).toBe(false); // Paused before execution!

    const previewId = response.preview!.id;
    const confirmResponse = await orchestrator.confirmAction(
      previewId,
      true,
      testUserId,
      'أستاذ أحمد',
      'OWNER',
      ALL_PERMISSION_CODES,
      session.id,
    );

    expect(confirmResponse.success).toBe(true);
    expect(toolExecuted).toBe(true);
    expect(confirmResponse.receipt).toBeDefined();
    expect(confirmResponse.receipt?.undoAvailable).toBe(true);
  });

  it('handles safe Arabic errors for missing credentials and quota limits without leaking keys', async () => {
    // Missing credentials
    const orchestratorNoKey = new AssistantOrchestrator({
      systemDb,
      geminiCredentialService: { get: () => null },
      getActiveAcademicYear: () => null,
      resolveEntityLabel: async () => null,
      buildToolPreview: async () => [],
      executeTool: async () => ({ success: true }),
      undoTool: async () => ({ success: true }),
    });

    const session = orchestratorNoKey.createSession(testUserId);
    const noKeyResponse = await orchestratorNoKey.sendMessage(
      session.id,
      'مرحبا',
      testUserId,
      'معلم',
      'OWNER',
      ALL_PERMISSION_CODES,
    );
    expect(noKeyResponse.success).toBe(false);
    expect(noKeyResponse.error?.code).toBe('GEMINI_CREDENTIAL_MISSING');
    expect(noKeyResponse.messages.some((m) => m.content.includes('لم يتم تكوين مفتاح'))).toBe(true);

    // 429 Quota error
    const mock429 = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });
    const orchestrator429 = new AssistantOrchestrator({
      systemDb,
      geminiCredentialService: { get: () => 'my-top-secret-api-key-12345' },
      fetchImpl: mock429 as any,
      getActiveAcademicYear: () => null,
      resolveEntityLabel: async () => null,
      buildToolPreview: async () => [],
      executeTool: async () => ({ success: true }),
      undoTool: async () => ({ success: true }),
    });

    const session2 = orchestrator429.createSession(testUserId);
    const quotaResponse = await orchestrator429.sendMessage(
      session2.id,
      'مرحبا',
      testUserId,
      'معلم',
      'OWNER',
      ALL_PERMISSION_CODES,
    );
    expect(quotaResponse.success).toBe(false);
    const quotaMsg = quotaResponse.messages.find((m) => m.type === 'error');
    expect(quotaMsg?.content).toContain('تم تجاوز حصة الاستخدام');
    expect(quotaMsg?.content).not.toContain('my-top-secret-api-key-12345');
  });
});
