import { useState, useEffect, useRef } from 'react';
import { Button } from '@tibyan/design-system';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import {
  useCreateTaskSession,
  useTibyanConversation,
  type TaskType,
} from '../../hooks/useTibyanWorkspace.js';
import { TaskSidebar } from './TaskSidebar.js';
import { WorkspaceHistory } from './WorkspaceHistory.js';

export function TibyanWorkspacePage() {
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const createSessionMutation = useCreateTaskSession();
  const { data: conversation } = useTibyanConversation(activeSessionId || undefined);

  const messages = conversation?.messages || [];
  const sending = false; // TODO: wire from assistant hook

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewSession = async () => {
    if (!activeTask) return;
    try {
      const session = await createSessionMutation.mutateAsync({
        taskType: activeTask,
        title: `مهمة ${activeTask}`,
      });
      setActiveSessionId(session.id);
      inputRef.current?.focus();
    } catch {
      // error handled by hook
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleSelectTask = (task: TaskType) => {
    setActiveTask(task);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    // TODO: wire sendMessage via assistant hook
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex" dir="rtl" data-testid="page-tibyan-workspace">
      {/* History sidebar (left) */}
      <WorkspaceHistory
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />

      {/* Main conversation area (center) */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeSessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
                <Bot className="w-8 h-8 text-[var(--color-brand-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                  تِبيان — المساعد الذكي
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {activeTask
                    ? 'اضغط "مهمة جديدة" للبدء'
                    : 'اختر مهمة من القائمة اليمنى للبدء'}
                </p>
              </div>
              {activeTask && !activeSessionId && (
                <Button variant="primary" onClick={handleNewSession} data-testid="btn-start-task">
                  <Sparkles className="w-4 h-4 ml-1" />
                  مهمة جديدة
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    ابدأ المحادثة...
                  </p>
                </div>
              )}
              {messages.map((msg: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-[var(--color-brand-primary)]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-[var(--color-brand-primary)] text-white'
                        : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[var(--color-border-subtle)] p-3">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 resize-none rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]"
                  rows={2}
                  dir="rtl"
                />
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="self-end"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Task sidebar (right) */}
      <TaskSidebar activeTask={activeTask} onSelectTask={handleSelectTask} />
    </div>
  );
}
