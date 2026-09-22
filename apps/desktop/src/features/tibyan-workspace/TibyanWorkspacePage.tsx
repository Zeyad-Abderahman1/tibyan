import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Trash2,
  MessageSquare,
  FileText,
  Presentation,
  BookOpen,
  StickyNote,
  Settings,
  History,
  Sparkles,
  X,
} from 'lucide-react';
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
import { ContextualDynamicIsland } from '../../components/layout/ContextualDynamicIsland.js';
import { TibyanBrand, Button, cn } from '@tibyan/design-system';

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EXAM: FileText,
  SLIDES: Presentation,
  REVIEW: BookOpen,
  NOTES: StickyNote,
  PLATFORM_CONTROL: Settings,
};

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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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
    setIsHistoryOpen(false);
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

  // Approved Dynamic Island items for Tibyan:
  // رئيسي, إنشاء اختبار, إنشاء شرائح, إنشاء مراجعة, إنشاء مذكرة, التحكم في المنصة, السجل
  const islandActions = [
    {
      id: 'home',
      label: 'رئيسي',
      icon: Sparkles,
      active: activeTask === null,
      onClick: () => {
        setActiveTask(null);
        setActiveSessionId(null);
      },
    },
    {
      id: 'exam',
      label: 'إنشاء اختبار',
      icon: FileText,
      active: activeTask === 'EXAM',
      onClick: () => handleSelectCapability('EXAM'),
    },
    {
      id: 'slides',
      label: 'إنشاء شرائح',
      icon: Presentation,
      active: activeTask === 'SLIDES',
      onClick: () => handleSelectCapability('SLIDES'),
    },
    {
      id: 'review',
      label: 'إنشاء مراجعة',
      icon: BookOpen,
      active: activeTask === 'REVIEW',
      onClick: () => handleSelectCapability('REVIEW'),
    },
    {
      id: 'notes',
      label: 'إنشاء مذكرة',
      icon: StickyNote,
      active: activeTask === 'NOTES',
      onClick: () => handleSelectCapability('NOTES'),
    },
    {
      id: 'platform-control',
      label: 'التحكم في المنصة',
      icon: Settings,
      active: activeTask === 'PLATFORM_CONTROL',
      onClick: () => handleSelectCapability('PLATFORM_CONTROL'),
    },
    {
      id: 'history',
      label: 'السجل',
      icon: History,
      badge: (sessions || []).length || undefined,
      onClick: () => setIsHistoryOpen((prev) => !prev),
    },
  ];

  return (
    <div className="relative h-full flex flex-col min-h-0 space-y-4" dir="rtl" data-testid="page-tibyan-workspace">
      {/* Layer 3: Contextual Dynamic Island for Tibyan AI Tools */}
      <ContextualDynamicIsland title="مساعد تِبيان الذكي" actions={islandActions} />

      {/* Main Tibyan Workspace Canvas */}
      <div className={cn(
        'relative flex min-h-0 overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]',
        activeTask ? 'flex-1' : 'shrink-0 min-h-[410px]'
      )}>
        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
          {!activeTask ? (
            /* Home / Centered Welcome State */
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center select-none" data-testid="tibyan-home-view">
              <div className="mb-4">
                <TibyanBrand size="lg" showWordmark={false} />
              </div>
              <h1 className="text-3xl font-extrabold text-[var(--color-text-primary)] mb-2 tracking-tight">
                تِبيان
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto leading-relaxed">
                مساعدك الذكي المتكامل لإدارة الحصص والطلاب والاختبارات والمناهج التعليمية
              </p>

              {/* Suggestion Prompts Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-xl w-full">
                {SUGGESTION_PROMPTS.map((s) => {
                  const Icon = TASK_ICONS[s.task] || MessageSquare;
                  return (
                    <button
                      key={s.task}
                      onClick={() => handleSuggestionClick(s.task)}
                      className="p-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-subtle)]/60 hover:bg-[var(--color-bg-surface-subtle)] text-right transition-all group flex items-start gap-3 shadow-2xs hover:shadow-xs"
                      data-testid={`suggestion-${s.task}`}
                    >
                      <div className="p-2 rounded-lg bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))] shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))] mb-0.5">
                          {TASK_DEFINITIONS[s.task]?.labelAr}
                        </span>
                        <p className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
                          {s.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : activeTask === 'PLATFORM_CONTROL' ? (
            /* Platform Control: Clean Chat Viewport */
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

        {/* Lightweight History Drawer (Left/Overlay, accessible via Island 'السجل') */}
        {isHistoryOpen && (
          <aside
            className="absolute inset-y-0 start-0 w-80 bg-[var(--color-bg-surface)] border-e border-[var(--color-border-subtle)] shadow-xl z-30 flex flex-col animate-in slide-in-from-left duration-200"
            data-testid="tibyan-history-drawer"
            aria-label="سجل محادثات وأدوات تِبيان"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))]" />
                <span className="text-sm font-bold text-[var(--color-text-primary)]">سجل المهام</span>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)]"
                aria-label="إغلاق السجل"
                data-testid="close-history-drawer-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* History Sessions List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {(sessions || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--color-text-muted)]">
                  لا يوجد سجل جلسات سابقة بعد
                </div>
              ) : (
                (sessions || []).map((session) => {
                  const TaskIcon = TASK_ICONS[session.contextScope || ''] || MessageSquare;
                  const taskDef = TASK_DEFINITIONS[(session.contextScope || '') as TaskType];
                  const isActive = session.id === activeSessionId;

                  return (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={cn(
                        'group flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-colors border',
                        isActive
                          ? 'bg-[var(--color-brand-primary)]/10 border-[var(--color-brand-primary)]/30 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))]'
                          : 'border-transparent hover:bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-primary)]'
                      )}
                      data-testid={`history-item-${session.id}`}
                    >
                      <TaskIcon className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {session.title || taskDef?.labelAr || 'جلسة'}
                        </p>
                        <span className="text-[10px] text-[var(--color-text-muted)]">
                          {new Date(session.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] transition-opacity"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        title="حذف الجلسة"
                        data-testid={`delete-history-${session.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-[var(--color-border-subtle)]">
              <Button
                variant="secondary"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setActiveTask(null);
                  setActiveSessionId(null);
                  setIsHistoryOpen(false);
                }}
                data-testid="btn-new-session"
              >
                <Plus className="w-3.5 h-3.5 ms-1" />
                <span>جلسة جديدة</span>
              </Button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
