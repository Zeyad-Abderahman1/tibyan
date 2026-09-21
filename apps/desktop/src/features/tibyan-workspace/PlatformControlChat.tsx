import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@tibyan/design-system';
import { Send, Bot, User, Loader2, AlertTriangle, CheckCircle, Undo2, X } from 'lucide-react';
import { useAssistant } from '../../hooks/useAssistant.js';

export function PlatformControlChat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    sending,
    error,
    currentSession,
    createSession,
    sendMessage,
    confirmAction,
    undoAction,
    loadSessions,
  } = useAssistant();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');

    try {
      if (!currentSession) {
        await createSession('التحكم في المنصة', 'PLATFORM_CONTROL');
      }
      await sendMessage(text, 'PLATFORM_CONTROL');
    } catch {
      // error handled by hook
    }
  }, [input, sending, currentSession, createSession, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirm = async (previewId: string, confirmed: boolean) => {
    try {
      await confirmAction(previewId, confirmed);
    } catch {
      // error handled by hook
    }
  };

  const handleUndo = async (receiptId: string, undoToken: string) => {
    try {
      await undoAction(receiptId, undoToken);
    } catch {
      // error handled by hook
    }
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-[var(--color-brand-primary)]" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                اطرح أي سؤال عن التحكم في المنصة
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                يمكنني مساعدتك في إدارة الطلاب والمجموعات والجدول والمالية
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`chat-message-${idx}`}
          >
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-[var(--color-brand-primary)]" />
              </div>
            )}
            <div className="max-w-[70%] space-y-1">
              {/* Confirmation card */}
              {msg.type === 'preview' && msg.confirmationToken && (
                <div className="rounded-2xl border border-[var(--color-status-warning)] bg-[var(--color-status-warning-bg)] p-3 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning)]" />
                    <span className="text-xs font-bold text-[var(--color-status-warning)]">
                      يتطلب تأكيد
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] mb-3">{msg.content}</p>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConfirm(msg.previewId!, true)}
                      data-testid="confirm-action"
                    >
                      <CheckCircle className="w-3 h-3 ml-1" />
                      تأكيد
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfirm(msg.previewId!, false)}
                      data-testid="reject-action"
                    >
                      <X className="w-3 h-3 ml-1" />
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}

              {/* Execution receipt with undo */}
              {msg.type === 'execution-receipt' && msg.undoAvailable && msg.receiptId && msg.undoToken && (
                <div className="rounded-2xl border border-[var(--color-status-success)] bg-[var(--color-status-success-bg)] p-3 mb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[var(--color-status-success)]" />
                      <span className="text-xs font-bold text-[var(--color-status-success)]">
                        تم التنفيذ
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUndo(msg.receiptId!, msg.undoToken!)}
                      data-testid="undo-action"
                    >
                      <Undo2 className="w-3 h-3 ml-1" />
                      تراجع
                    </Button>
                  </div>
                </div>
              )}

              {/* Regular message */}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[var(--color-brand-primary)] text-white'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                }`}
              >
                {msg.content}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="flex justify-center">
            <div className="px-3 py-1 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] text-xs">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--color-border-subtle)] p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 items-end bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-subtle)] p-2 focus-within:ring-2 focus-within:ring-[var(--color-brand-primary)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none min-h-[44px] max-h-[200px]"
              rows={1}
              dir="rtl"
              data-testid="platform-chat-input"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="rounded-xl h-10 w-10 p-0 flex items-center justify-center"
              data-testid="platform-chat-send"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
