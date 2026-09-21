import { useState, useEffect, useRef } from 'react';
import { Button } from '@tibyan/design-system';
import { MessageSquare, Plus, Trash2, Send, Bot, User, Loader2, AlertCircle, Undo2, Check, X, Sparkles } from 'lucide-react';
import { useAssistant } from '../../hooks/useAssistant.js';
import type { AssistantMessage } from '@tibyan/contracts';

export function AssistantPage() {
  const {
    sessions,
    currentSession,
    messages,
    sending,
    error,
    createSession,
    selectSession,
    loadSessions,
    sendMessage,
    confirmAction,
    undoAction,
    deleteSession,
  } = useAssistant();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    try {
      await sendMessage(text);
    } catch {
      // error handled by hook
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewSession = async () => {
    await createSession();
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex" dir="rtl" data-testid="page-assistant">
      {/* Sidebar - Sessions */}
      <div className="w-64 border-l border-[var(--color-border)] bg-[var(--color-surface-secondary)] flex flex-col">
        <div className="p-3 border-b border-[var(--color-border)]">
          <Button
            variant="primary"
            size="sm"
            className="w-full flex items-center gap-2 justify-center"
            onClick={handleNewSession}
          >
            <Plus className="w-4 h-4" />
            محادثة جديدة
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`px-3 py-2.5 cursor-pointer border-b border-[var(--color-border)] transition-colors group ${
                currentSession?.id === session.id
                  ? 'bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]'
                  : 'hover:bg-[var(--color-surface-hover)]'
              }`}
              onClick={() => selectSession(session.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="text-sm truncate">{session.title ?? 'محادثة'}</span>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:text-[var(--color-status-danger)] transition-opacity"
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {sessions.length === 0 && (
            <div className="p-4 text-center text-[var(--color-text-secondary)] text-sm">
              لا توجد محادثات بعد
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentSession ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} onConfirm={confirmAction} onUndo={undoAction} />
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-[var(--color-text-secondary)] text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التفكير...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {error && (
              <div className="px-4 py-2 bg-[var(--color-status-danger)]/10 text-[var(--color-status-danger)] text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-[var(--color-border)]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب رسالتك هنا..."
                  rows={1}
                  className="flex-1 resize-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/50"
                  disabled={sending}
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-[var(--color-brand-primary)]" />
              </div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                مساعد تبيان الذكي
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                اطرح سؤالاً أو اطلب المساعدة في إدارة بياناتك التعليمية
              </p>
              <Button variant="primary" onClick={handleNewSession}>
                <Sparkles className="w-4 h-4 ml-2" />
                ابدأ محادثة
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onConfirm,
  onUndo,
}: {
  message: AssistantMessage;
  onConfirm: (previewId: string, confirmed: boolean) => Promise<void>;
  onUndo: (receiptId: string, undoToken: string) => Promise<void>;
}) {
  const isUser = message.role === 'user';
  const isPreview = message.type === 'preview';
  const isReceipt = message.type === 'execution-receipt';
  const isUndo = message.type === 'undo-result';
  const isError = message.type === 'error';

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 ${
          isUser
            ? 'bg-[var(--color-brand-primary)] text-white'
            : isPreview
            ? 'bg-[var(--color-status-warning)]/10 border border-[var(--color-status-warning)]/30'
            : isReceipt
            ? 'bg-[var(--color-status-success)]/10 border border-[var(--color-status-success)]/30'
            : isUndo
            ? 'bg-[var(--color-status-info)]/10 border border-[var(--color-status-info)]/30'
            : isError
            ? 'bg-[var(--color-status-danger)]/10 border border-[var(--color-status-danger)]/30'
            : 'bg-[var(--color-surface-secondary)]'
        }`}
        dir="rtl"
      >
        <div className="flex items-start gap-2">
          {!isUser && (
            <div className="shrink-0 mt-0.5">
              {isPreview ? <Sparkles className="w-4 h-4 text-[var(--color-status-warning)]" /> :
               isReceipt ? <Check className="w-4 h-4 text-[var(--color-status-success)]" /> :
               isUndo ? <Undo2 className="w-4 h-4 text-[var(--color-status-info)]" /> :
               isError ? <AlertCircle className="w-4 h-4 text-[var(--color-status-danger)]" /> :
               <Bot className="w-4 h-4 text-[var(--color-brand-primary)]" />}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {isPreview && message.previewId && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="primary" onClick={() => onConfirm(message.previewId!, true)}>
                  <Check className="w-3.5 h-3.5 ml-1" />
                  تأكيد
                </Button>
                <Button size="sm" variant="secondary" onClick={() => onConfirm(message.previewId!, false)}>
                  <X className="w-3.5 h-3.5 ml-1" />
                  رفض
                </Button>
              </div>
            )}
            {isReceipt && message.undoAvailable && message.undoToken && message.receiptId && (
              <div className="mt-2">
                <Button size="sm" variant="secondary" onClick={() => onUndo(message.receiptId!, message.undoToken!)}>
                  <Undo2 className="w-3.5 h-3.5 ml-1" />
                  تراجع
                </Button>
              </div>
            )}
          </div>
          {isUser && (
            <div className="shrink-0 mt-0.5">
              <User className="w-4 h-4 text-white/70" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
