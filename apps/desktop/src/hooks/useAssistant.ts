import { useState, useCallback, useRef } from 'react';
import type { AssistantSession, AssistantMessage, AssistantResponse } from '@tibyan/contracts';

export interface UseAssistantReturn {
  sessions: AssistantSession[];
  currentSession: AssistantSession | null;
  messages: AssistantMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  createSession: (title?: string, scope?: string, entityId?: string) => Promise<AssistantSession>;
  selectSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  loadHistory: (sessionId: string) => Promise<void>;
  sendMessage: (content: string, scope?: string, entityId?: string, explicitSessionId?: string) => Promise<AssistantResponse>;
  confirmAction: (previewId: string, confirmed: boolean, explicitSessionId?: string) => Promise<void>;
  cancelAction: (previewId: string) => Promise<void>;
  undoAction: (receiptId: string, undoToken: string, explicitSessionId?: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export function useAssistant(): UseAssistantReturn {
  const [sessions, setSessions] = useState<AssistantSession[]>([]);
  const [currentSession, setCurrentSession] = useState<AssistantSession | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<AssistantMessage[]>([]);
  const currentSessionRef = useRef<AssistantSession | null>(null);

  const loadSessions = useCallback(async () => {
    const result = await window.tibyan.assistant.listSessions();
    if (result.success) {
      setSessions(result.data);
    }
  }, []);

  const createSession = useCallback(async (title?: string, scope?: string, entityId?: string) => {
    const result = await window.tibyan.assistant.createSession({
      title,
      context: scope ? { scope: scope as any, entityId } : undefined,
    });
    if (!result.success) throw new Error(result.error?.message ?? 'فشل إنشاء الجلسة');
    const session = result.data;
    currentSessionRef.current = session;
    setSessions((prev) => [session, ...prev]);
    setCurrentSession(session);
    setMessages([]);
    messagesRef.current = [];
    return session;
  }, []);

  const loadHistory = useCallback(async (sessionId: string) => {
    const result = await window.tibyan.assistant.getHistory(sessionId);
    if (result.success) {
      setMessages(result.data.messages);
      messagesRef.current = result.data.messages;
    }
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const result = await window.tibyan.assistant.getSession(sessionId);
      if (result.success) {
        currentSessionRef.current = result.data;
        setCurrentSession(result.data);
        await loadHistory(sessionId);
      }
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  const sendMessage = useCallback(
    async (content: string, scope?: string, entityId?: string, explicitSessionId?: string): Promise<AssistantResponse> => {
      let activeSession = currentSessionRef.current || currentSession;
      let sessionId = explicitSessionId || activeSession?.id;
      if (!sessionId) {
        activeSession = await createSession(scope === 'PLATFORM_CONTROL' ? 'التحكم في المنصة' : undefined, scope, entityId);
        sessionId = activeSession.id;
      }
      if (!sessionId) throw new Error('لا توجد جلسة نشطة');

      setSending(true);
      setError(null);

      // Optimistic user message so teacher immediately sees their submission
      const optimisticMsgId = crypto.randomUUID();
      const optimisticMsg: AssistantMessage = {
        id: optimisticMsgId,
        sessionId,
        role: 'user',
        type: 'text',
        content,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => {
        const next = [...prev, optimisticMsg];
        messagesRef.current = next;
        return next;
      });

      try {
        const result = await window.tibyan.assistant.sendMessage({
          sessionId,
          content,
          context: scope ? { scope: scope as any, entityId } : undefined,
        });

        if (result.success) {
          const response = result.data;
          const returnedMessages = response.messages ?? (response.message ? [response.message] : []);

          setMessages((prev) => {
            // Remove optimistic message and replace with authoritative persisted messages
            const withoutOptimistic = prev.filter((m) => m.id !== optimisticMsgId);
            const existingIds = new Set(withoutOptimistic.map((m) => m.id));
            const newToAppend = returnedMessages.filter((m) => !existingIds.has(m.id));
            const updated = [...withoutOptimistic, ...newToAppend];
            messagesRef.current = updated;
            return updated;
          });

          if (!response.success && response.error) {
            setError(response.error.message);
          }

          return response;
        }

        // Provider/IPC error: keep user message visible and append Arabic error message
        const errMsgText = result.error?.message ?? 'تعذر الاتصال بخدمة تِبيان الذكية.';
        setError(errMsgText);

        const errorResponseMsg: AssistantMessage = {
          id: crypto.randomUUID(),
          sessionId,
          role: 'assistant',
          type: 'error',
          content: errMsgText,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          const updated = [...prev, errorResponseMsg];
          messagesRef.current = updated;
          return updated;
        });

        return {
          success: false,
          messages: [optimisticMsg, errorResponseMsg],
          error: {
            code: (result.error?.code as any) ?? 'GEMINI_UNAVAILABLE',
            message: errMsgText,
          },
        };
      } catch (err) {
        const errMsgText = err instanceof Error ? err.message : 'خطأ غير متوقع';
        setError(errMsgText);

        const errorResponseMsg: AssistantMessage = {
          id: crypto.randomUUID(),
          sessionId,
          role: 'assistant',
          type: 'error',
          content: errMsgText,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          const updated = [...prev, errorResponseMsg];
          messagesRef.current = updated;
          return updated;
        });

        return {
          success: false,
          messages: [optimisticMsg, errorResponseMsg],
          error: {
            code: 'UNKNOWN',
            message: errMsgText,
          },
        };
      } finally {
        setSending(false);
      }
    },
    [currentSession, createSession],
  );

  const confirmAction = useCallback(
    async (previewId: string, confirmed: boolean, explicitSessionId?: string) => {
      setSending(true);
      try {
        const activeSession = currentSessionRef.current || currentSession;
        const sessionId = explicitSessionId || activeSession?.id;
        const result = await window.tibyan.assistant.confirmAction({
          previewId,
          confirmed,
          sessionId,
        });

        if (result.success) {
          const response = result.data;
          const returnedMessages = response.messages ?? (response.message ? [response.message] : []);

          if (returnedMessages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newToAppend = returnedMessages.filter((m) => !existingIds.has(m.id));
              const updated = [...prev, ...newToAppend];
              messagesRef.current = updated;
              return updated;
            });
          }
          return;
        }
        throw new Error(result.error?.message ?? 'فشل تأكيد الإجراء');
      } finally {
        setSending(false);
      }
    },
    [currentSession],
  );

  const cancelAction = useCallback(async (previewId: string) => {
    await window.tibyan.assistant.cancelAction(previewId);
  }, []);

  const undoAction = useCallback(
    async (receiptId: string, undoToken: string, explicitSessionId?: string) => {
      setSending(true);
      try {
        const activeSession = currentSessionRef.current || currentSession;
        const sessionId = explicitSessionId || activeSession?.id;
        const result = await window.tibyan.assistant.undoAction({
          receiptId,
          undoToken,
          sessionId,
        });

        if (result.success) {
          const response = result.data;
          const returnedMessages = response.messages ?? (response.message ? [response.message] : []);

          if (returnedMessages.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newToAppend = returnedMessages.filter((m) => !existingIds.has(m.id));
              const updated = [...prev, ...newToAppend];
              messagesRef.current = updated;
              return updated;
            });
          }
        } else {
          throw new Error(result.error?.message ?? 'فشل التراجع عن الإجراء');
        }
      } finally {
        setSending(false);
      }
    },
    [currentSession],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await window.tibyan.assistant.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId || currentSessionRef.current?.id === sessionId) {
        currentSessionRef.current = null;
        setCurrentSession(null);
        setMessages([]);
        messagesRef.current = [];
      }
    },
    [currentSession],
  );

  return {
    sessions,
    currentSession,
    messages,
    loading,
    sending,
    error,
    createSession,
    selectSession,
    loadSessions,
    loadHistory,
    sendMessage,
    confirmAction,
    cancelAction,
    undoAction,
    deleteSession,
  };
}
