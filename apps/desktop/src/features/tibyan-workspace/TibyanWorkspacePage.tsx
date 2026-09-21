import { useState, useEffect, useRef } from 'react';
import { Button } from '@tibyan/design-system';
import { Send, Bot, User, Loader2, Plus, Trash2, MessageSquare, FileText, Presentation, BookOpen, StickyNote, Settings } from 'lucide-react';
import {
  useCreateTaskSession,
  useTibyanConversation,
  useTibyanHistory,
  useDeleteHistoryItem,
  TASK_DEFINITIONS,
  type TaskType,
} from '../../hooks/useTibyanWorkspace.js';

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EXAM: FileText,
  SLIDES: Presentation,
  REVIEW: BookOpen,
  NOTES: StickyNote,
  PLATFORM_CONTROL: Settings,
};

const CAPABILITIES = [
  { task: 'EXAM' as TaskType, label: 'إنشاء اختبار', icon: FileText },
  { task: 'SLIDES' as TaskType, label: 'إنشاء شرائح', icon: Presentation },
  { task: 'REVIEW' as TaskType, label: 'إنشاء مراجعة', icon: BookOpen },
  { task: 'NOTES' as TaskType, label: 'إنشاء مذكرة', icon: StickyNote },
  { task: 'PLATFORM_CONTROL' as TaskType, label: 'التحكم في المنصة', icon: Settings },
];

const SUGGESTION_PROMPTS = [
  'إنشاء اختبار من المنهج',
  'جهز شرائح للدرس',
  'اعمل مراجعة للمادة',
  'جهز مذكرة للطلاب',
];

export function TibyanWorkspacePage() {
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const createSessionMutation = useCreateTaskSession();
  const { data: conversation } = useTibyanConversation(activeSessionId || undefined);
  const { data: sessions } = useTibyanHistory();
  const deleteMutation = useDeleteHistoryItem();

  const messages = conversation?.messages || [];
  const sending = false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewSession = async (taskType?: TaskType) => {
    const task = taskType || activeTask;
    if (!task) return;
    try {
      const session = await createSessionMutation.mutateAsync({
        taskType: task,
        title: TASK_DEFINITIONS[task]?.labelAr || task,
      });
      setActiveSessionId(session.id);
      setActiveTask(task);
      inputRef.current?.focus();
    } catch {
      // error handled by hook
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleSelectCapability = (task: TaskType) => {
    setActiveTask(task);
    if (!activeSessionId) {
      handleNewSession(task);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟ لن يتم حذف الملفات المنشأة.')) return;
    try {
      await deleteMutation.mutateAsync(sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setActiveTask(null);
      }
    } catch {
      // error handled by hook
    }
  };

  return (
    <div className="h-full flex" dir="rtl" data-testid="page-tibyan-workspace">
      {/* Main conversation area (center/left) */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeSessionId ? (
          /* Welcome / Empty State */
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-[var(--color-brand-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">تِبيان</h1>
            <p className="text-base text-[var(--color-text-secondary)] mb-8 max-w-md text-center">
              مساعدك الذكي لإدارة العمل
            </p>

            {/* Suggestion prompts */}
            <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
              {SUGGESTION_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setInput(prompt);
                    if (!activeTask) {
                      handleNewSession('EXAM');
                    }
                  }}
                  className="p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] text-right text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Conversation */
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
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-[var(--color-brand-primary)]" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[var(--color-bg-elevated)] flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="w-4 h-4 text-[var(--color-text-secondary)]" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-[var(--color-border-subtle)] p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 items-end bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-subtle)] p-2 focus-within:ring-2 focus-within:ring-[var(--color-brand-primary)]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeSessionId ? "اكتب رسالتك هنا..." : "ماذا تريد أن تفعل؟"}
                className="flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none min-h-[44px] max-h-[200px]"
                rows={1}
                dir="rtl"
                data-testid="tibyan-composer"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={activeSessionId ? handleSend : () => handleNewSession()}
                disabled={activeSessionId ? !input.trim() || sending : !activeTask}
                className="rounded-xl h-10 w-10 p-0 flex items-center justify-center"
                data-testid="tibyan-send-btn"
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

      {/* Right sidebar: Capabilities + History */}
      <div className="w-72 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] flex flex-col" dir="rtl" data-testid="tibyan-right-sidebar">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[var(--color-brand-primary)]" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text-primary)]">تِبيان</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => {
              if (activeTask) {
                handleNewSession(activeTask);
              } else {
                setActiveTask(null);
                setActiveSessionId(null);
              }
            }}
            data-testid="btn-new-session"
          >
            <Plus className="w-4 h-4 ml-1" />
            محادثة جديدة
          </Button>
        </div>

        {/* Capabilities */}
        <div className="p-3">
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2 px-1">
            ماذا تريد أن تفعل؟
          </h3>
          <div className="space-y-1">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              const isActive = activeTask === cap.task;
              return (
                <button
                  key={cap.task}
                  onClick={() => handleSelectCapability(cap.task)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--color-brand-primary-bg)] text-[var(--color-brand-primary)] font-medium'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-elevated)] hover:text-[var(--color-text-primary)]'
                  }`}
                  data-testid={`capability-${cap.task}`}
                >
                  <Icon className="w-4 h-4" />
                  {cap.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-[var(--color-border-subtle)]" />

        {/* History */}
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2 px-1">
            السجل
          </h3>
          <div className="space-y-1">
            {(sessions || []).length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] px-1 py-2">
                لا يوجد سجل بعد
              </p>
            ) : (
              (sessions || []).map((session) => {
                const TaskIcon = TASK_ICONS[session.contextScope || ''] || MessageSquare;
                const taskDef = TASK_DEFINITIONS[(session.contextScope || '') as TaskType];
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectSession(session.id)}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[var(--color-brand-primary-bg)] ring-1 ring-[var(--color-brand-primary)]'
                        : 'hover:bg-[var(--color-bg-elevated)]'
                    }`}
                    data-testid={`history-item-${session.id}`}
                  >
                    <TaskIcon className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">
                        {session.title || taskDef?.labelAr || 'محادثة'}
                      </p>
                      <span className="text-[10px] text-[var(--color-text-tertiary)]">
                        {new Date(session.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] transition-opacity"
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      title="حذف"
                      data-testid={`delete-history-${session.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
