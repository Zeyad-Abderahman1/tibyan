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
  sendMessage: (content: string, scope?: string, entityId?: string) => Promise<AssistantResponse>;
  confirmAction: (previewId: string, confirmed: boolean) => Promise<void>;
  cancelAction: (previewId: string) => Promise<void>;
  undoAction: (receiptId: string, undoToken: string) => Promise<void>;
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

  const loadSessions = useCallback(async () => {
    const result = await window.tibyan.assistant.listSessions();
    if (result.success) setSessions(result.data);
  }, []);

  const createSession = useCallback(async (title?: string, scope?: string, entityId?: string) => {
    const result = await window.tibyan.assistant.createSession({ title, context: scope ? { scope: scope as any, entityId } : undefined });
    if (!result.success) throw new Error(result.error?.message ?? 'فشل إنشاء الجلسة');
    const session = result.data;
    setSessions((prev) => [session, ...prev]);
    setCurrentSession(session);
    setMessages([]);
    messagesRef.current = [];
    return session;
  }, []);

  const selectSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const result = await window.tibyan.assistant.getSession(sessionId);
      if (result.success) {
        setCurrentSession(result.data);
        await loadHistory(sessionId);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (sessionId: string) => {
    const result = await window.tibyan.assistant.getHistory(sessionId);
    if (result.success) {
      setMessages(result.data.messages);
      messagesRef.current = result.data.messages;
    }
  }, []);

  const sendMessage = useCallback(async (content: string, scope?: string, entityId?: string) => {
    if (!currentSession) {
      await createSession(undefined, scope, entityId);
    }
    const sessionsResult = await window.tibyan.assistant.listSessions();
    const sessionId = currentSession?.id ?? (sessionsResult.success ? sessionsResult.data[0]?.id : undefined);
    if (!sessionId) throw new Error('لا توجد جلسة نشطة');

    setSending(true);
    setError(null);
    try {
      const result = await window.tibyan.assistant.sendMessage({
        sessionId,
        content,
        context: scope ? { scope: scope as any, entityId } : undefined,
      });

      if (result.success) {
        const response = result.data;
        if (response.message) {
          setMessages((prev) => [...prev, response.message!]);
          messagesRef.current = [...messagesRef.current, response.message!];
        }
        return response;
      }
      throw new Error(result.error?.message ?? 'فشل إرسال الرسالة');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطأ غير متوقع';
      setError(msg);
      throw err;
    } finally {
      setSending(false);
    }
  }, [currentSession, createSession]);

  const confirmAction = useCallback(async (previewId: string, confirmed: boolean) => {
    setSending(true);
    try {
      const result = await window.tibyan.assistant.confirmAction({ previewId, confirmed });
      if (result.success) {
        const response = result.data;
        if (response.message) {
          setMessages((prev) => [...prev, response.message!]);
          messagesRef.current = [...messagesRef.current, response.message!];
        }
        return;
      }
      throw new Error(result.error?.message ?? 'فشل تأكيد الإجراء');
    } finally {
      setSending(false);
    }
  }, []);

  const cancelAction = useCallback(async (previewId: string) => {
    await window.tibyan.assistant.cancelAction(previewId);
  }, []);

  const undoAction = useCallback(async (receiptId: string, undoToken: string) => {
    setSending(true);
    try {
      const result = await window.tibyan.assistant.undoAction({ receiptId, undoToken });
      if (result.success) {
        const receipt = result.data;
        const undoMsg: AssistantMessage = {
          id: crypto.randomUUID(),
          sessionId: currentSession?.id ?? '',
          role: 'assistant',
          type: 'undo-result',
          content: receipt.success ? 'تم التراجع بنجاح' : `فشل التراجع: ${receipt.error}`,
          receiptId,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, undoMsg]);
      }
    } finally {
      setSending(false);
    }
  }, [currentSession]);

  const deleteSession = useCallback(async (sessionId: string) => {
    await window.tibyan.assistant.deleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setMessages([]);
      messagesRef.current = [];
    }
  }, [currentSession]);

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
