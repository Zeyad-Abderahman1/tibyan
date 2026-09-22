import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlatformControlChat } from '../src/features/tibyan-workspace/PlatformControlChat.js';
import * as useAssistantModule from '../src/hooks/useAssistant.js';
import type { AssistantMessage, AssistantSession } from '@tibyan/contracts';

describe('PlatformControlChat UI Component', () => {
  const mockSession: AssistantSession = {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'u1',
    title: 'التحكم في المنصة',
    contextScope: 'PLATFORM_CONTROL',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial empty state with Arabic prompt and composer', () => {
    vi.spyOn(useAssistantModule, 'useAssistant').mockReturnValue({
      sessions: [mockSession],
      currentSession: mockSession,
      messages: [],
      loading: false,
      sending: false,
      error: null,
      createSession: vi.fn(),
      selectSession: vi.fn(),
      loadSessions: vi.fn(),
      loadHistory: vi.fn(),
      sendMessage: vi.fn(),
      confirmAction: vi.fn(),
      cancelAction: vi.fn(),
      undoAction: vi.fn(),
      deleteSession: vi.fn(),
    });

    const html = renderToStaticMarkup(<PlatformControlChat />);

    expect(html).toContain('تِبيان — التحكم في المنصة');
    expect(html).toContain('اطرح أي سؤال عن المنصة باللغة العربية');
    expect(html).toContain('data-testid="platform-chat-input"');
    expect(html).toContain('data-testid="platform-chat-send"');
    expect(html).toContain('dir="rtl"');
  });

  it('renders conversation messages including user, assistant, preview card, and receipt', () => {
    const mockMessages: AssistantMessage[] = [
      {
        id: '22222222-2222-2222-2222-222222222221',
        sessionId: mockSession.id,
        role: 'user',
        type: 'text',
        content: 'اعرض عدد الطلاب في كل مجموعة',
        createdAt: new Date().toISOString(),
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        sessionId: mockSession.id,
        role: 'assistant',
        type: 'tool-result',
        toolName: 'list_groups',
        content: '[{"id":"g1"}]',
        createdAt: new Date().toISOString(),
      },
      {
        id: '22222222-2222-2222-2222-222222222223',
        sessionId: mockSession.id,
        role: 'assistant',
        type: 'text',
        content: 'لديك مجموعتان: مجموعة أولى ثانوي (15 طالب) ومجموعة ثانية ثانوي (12 طالب).',
        createdAt: new Date().toISOString(),
      },
      {
        id: '22222222-2222-2222-2222-222222222224',
        sessionId: mockSession.id,
        role: 'assistant',
        type: 'preview',
        previewId: '33333333-3333-3333-3333-333333333333',
        confirmationToken: 'tok-1',
        content: 'تعديل موعد الحصة إلى يوم الأحد 5:00 م',
        createdAt: new Date().toISOString(),
      },
      {
        id: '22222222-2222-2222-2222-222222222225',
        sessionId: mockSession.id,
        role: 'assistant',
        type: 'execution-receipt',
        receiptId: '44444444-4444-4444-4444-444444444444',
        undoAvailable: true,
        undoToken: 'undo-tok-1',
        content: 'تم تحديث موعد الحصة بنجاح.',
        createdAt: new Date().toISOString(),
      },
    ];

    vi.spyOn(useAssistantModule, 'useAssistant').mockReturnValue({
      sessions: [mockSession],
      currentSession: mockSession,
      messages: mockMessages,
      loading: false,
      sending: false,
      error: null,
      createSession: vi.fn(),
      selectSession: vi.fn(),
      loadSessions: vi.fn(),
      loadHistory: vi.fn(),
      sendMessage: vi.fn(),
      confirmAction: vi.fn(),
      cancelAction: vi.fn(),
      undoAction: vi.fn(),
      deleteSession: vi.fn(),
    });

    const html = renderToStaticMarkup(<PlatformControlChat />);

    // User message
    expect(html).toContain('اعرض عدد الطلاب في كل مجموعة');
    // Tool result pill badge instead of raw JSON
    expect(html).toContain('استعلام المنصة: قائمة المجموعات');
    expect(html).not.toContain('[{"id":"g1"}]');
    // Assistant text reply
    expect(html).toContain('لديك مجموعتان: مجموعة أولى ثانوي (15 طالب) ومجموعة ثانية ثانوي (12 طالب).');
    // Confirmation preview card
    expect(html).toContain('يتطلب تأكيد المشرف');
    expect(html).toContain('تعديل موعد الحصة إلى يوم الأحد 5:00 م');
    expect(html).toContain('data-testid="confirm-action"');
    expect(html).toContain('data-testid="reject-action"');
    // Execution receipt with undo
    expect(html).toContain('تم التنفيذ بنجاح');
    expect(html).toContain('تم تحديث موعد الحصة بنجاح.');
    expect(html).toContain('data-testid="undo-action"');
    expect(html).toContain('تراجع');
  });

  it('renders loading typing bubble when sending is true', () => {
    vi.spyOn(useAssistantModule, 'useAssistant').mockReturnValue({
      sessions: [mockSession],
      currentSession: mockSession,
      messages: [],
      loading: false,
      sending: true,
      error: null,
      createSession: vi.fn(),
      selectSession: vi.fn(),
      loadSessions: vi.fn(),
      loadHistory: vi.fn(),
      sendMessage: vi.fn(),
      confirmAction: vi.fn(),
      cancelAction: vi.fn(),
      undoAction: vi.fn(),
      deleteSession: vi.fn(),
    });

    const html = renderToStaticMarkup(<PlatformControlChat />);

    expect(html).toContain('data-testid="chat-loading-indicator"');
    expect(html).toContain('تِبيان يبحث وينفذ الطلب...');
  });

  it('renders error message bubble in Arabic', () => {
    vi.spyOn(useAssistantModule, 'useAssistant').mockReturnValue({
      sessions: [mockSession],
      currentSession: mockSession,
      messages: [],
      loading: false,
      sending: false,
      error: 'تعذر الاتصال بالذكاء الاصطناعي',
      createSession: vi.fn(),
      selectSession: vi.fn(),
      loadSessions: vi.fn(),
      loadHistory: vi.fn(),
      sendMessage: vi.fn(),
      confirmAction: vi.fn(),
      cancelAction: vi.fn(),
      undoAction: vi.fn(),
      deleteSession: vi.fn(),
    });

    const html = renderToStaticMarkup(<PlatformControlChat />);

    expect(html).toContain('تعذر الاتصال بالذكاء الاصطناعي');
  });
});
