import { useState, useEffect, useRef } from 'react';
import { Button } from '@tibyan/design-system';
import { Bot, Plus, Trash2, MessageSquare, FileText, Presentation, BookOpen, StickyNote, Settings } from 'lucide-react';
import {
  useCreateTaskSession,
  useTibyanConversation,
  useTibyanHistory,
  useDeleteHistoryItem,
  tibyanKeys,
  TASK_DEFINITIONS,
  type TaskType,
} from '../../hooks/useTibyanWorkspace.js';
import { useQueryClient } from '@tanstack/react-query';
import { ExamToolUI } from './ExamToolUI.js';
import { SlidesToolUI } from './SlidesToolUI.js';
import { ReviewToolUI } from './ReviewToolUI.js';
import { NotesToolUI } from './NotesToolUI.js';
import { PlatformControlChat } from './PlatformControlChat.js';

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
  { task: 'EXAM' as TaskType, prompt: 'إنشاء اختبار من المنهج' },
  { task: 'SLIDES' as TaskType, prompt: 'جهز شرائح للدرس' },
  { task: 'REVIEW' as TaskType, prompt: 'اعمل مراجعة للمادة' },
  { task: 'NOTES' as TaskType, prompt: 'جهز مذكرة للطلاب' },
];

function renderToolUI(
  taskType: TaskType,
  activeSessionId?: string | null,
  onSessionCreated?: (id: string) => void
) {
  switch (taskType) {
    case 'EXAM':
      return <ExamToolUI />;
    case 'SLIDES':
      return <SlidesToolUI />;
    case 'REVIEW':
      return <ReviewToolUI />;
    case 'NOTES':
      return <NotesToolUI />;
    case 'PLATFORM_CONTROL':
      return <PlatformControlChat sessionId={activeSessionId} onSessionCreated={onSessionCreated} />;
    default:
      return null;
  }
}

export function TibyanWorkspacePage() {
  const qc = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const createSessionMutation = useCreateTaskSession();
  const { data: conversation } = useTibyanConversation(activeSessionId || undefined);
  const { data: sessions } = useTibyanHistory();
  const deleteMutation = useDeleteHistoryItem();

  const messages = conversation?.messages || [];

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
    } catch {
      // error handled by hook
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions?.find((s) => s.id === sessionId);
    if (session?.contextScope) {
      setActiveTask(session.contextScope as TaskType);
    }
    setActiveSessionId(sessionId);
  };

  const handleSelectCapability = (task: TaskType) => {
    setActiveTask(task);
    if (!activeSessionId) {
      handleNewSession(task);
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

  const handleSuggestionClick = (task: TaskType) => {
    setActiveTask(task);
    handleNewSession(task);
  };

  return (
    <div className="h-full flex" dir="rtl" data-testid="page-tibyan-workspace">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeTask ? (
          /* Welcome / Empty State */
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="w-20 h-20 rounded-3xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-[var(--color-brand-primary)]" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">تبيان</h1>
            <p className="text-base text-[var(--color-text-secondary)] mb-8 max-w-md text-center">
              مساعدك الذكي لإدارة العمل التعليمي
            </p>

            {/* Suggestion prompts */}
            <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
              {SUGGESTION_PROMPTS.map((s) => {
                const Icon = TASK_ICONS[s.task] || MessageSquare;
                return (
                  <button
                    key={s.task}
                    onClick={() => handleSuggestionClick(s.task)}
                    className="p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-elevated)] text-right transition-colors group"
                    data-testid={`suggestion-${s.task}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                      <span className="text-xs font-bold text-[var(--color-brand-primary)]">
                        {TASK_DEFINITIONS[s.task]?.labelAr}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                      {s.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : activeTask === 'PLATFORM_CONTROL' ? (
          /* Platform Control: Normal Chat */
          <PlatformControlChat
            sessionId={activeSessionId}
            onSessionCreated={(id) => {
              setActiveSessionId(id);
              qc.invalidateQueries({ queryKey: tibyanKeys.history() });
            }}
          />
        ) : (
          /* Dedicated Tool UI: EXAM / SLIDES / REVIEW / NOTES */
          renderToolUI(activeTask, activeSessionId, (id) => {
            setActiveSessionId(id);
            qc.invalidateQueries({ queryKey: tibyanKeys.history() });
          })
        )}
      </div>

      {/* Right sidebar: Capabilities + History */}
      <div className="w-72 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] flex flex-col" dir="rtl" data-testid="tibyan-right-sidebar">
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[var(--color-brand-primary)]" />
            </div>
            <span className="text-sm font-bold text-[var(--color-text-primary)]">تبيان</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={() => {
              setActiveTask(null);
              setActiveSessionId(null);
            }}
            data-testid="btn-new-session"
          >
            <Plus className="w-4 h-4 ml-1" />
            رئيسي
          </Button>
        </div>

        {/* Capabilities */}
        <div className="p-3">
          <h3 className="text-xs font-bold text-[var(--color-text-secondary)] mb-2 px-1">
            الأدوات
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
