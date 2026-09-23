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
  Users,
  CreditCard,
  CalendarCheck,
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
import { Logo, Button, cn } from '@tibyan/design-system';

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EXAM: FileText,
  SLIDES: Presentation,
  REVIEW: BookOpen,
  NOTES: StickyNote,
  PLATFORM_CONTROL: Settings,
};

const SUGGESTION_PROMPTS = [
  {
    task: 'PLATFORM_CONTROL' as TaskType,
    prompt: 'أنشئ مجموعة لكل صف دراسي',
    category: 'إدارة المجموعات',
    icon: Users,
  },
  {
    task: 'PLATFORM_CONTROL' as TaskType,
    prompt: 'اعرض الطلاب غير المسددين هذا الشهر',
    category: 'المتابعة المالية',
    icon: CreditCard,
  },
  {
    task: 'EXAM' as TaskType,
    prompt: 'جهز اختبارًا من منهج الصف الأول الإعدادي',
    category: 'بنك الأسئلة والاختبارات',
    icon: FileText,
  },
  {
    task: 'PLATFORM_CONTROL' as TaskType,
    prompt: 'اعرض حضور الطلاب اليوم',
    category: 'تسجيل الحضور',
    icon: CalendarCheck,
  },
];

function renderToolUI(
  taskType: TaskType,
  activeSessionId?: string | null,
  onSessionCreated?: (id: string) => void,
  initialPrompt?: string
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
      return (
        <PlatformControlChat
          sessionId={activeSessionId}
          initialPrompt={initialPrompt}
          onSessionCreated={onSessionCreated}
        />
      );
    default:
      return null;
  }
}

export function TibyanWorkspacePage() {
  const qc = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskType | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
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

  const handleNewSession = async (taskType?: TaskType, promptText?: string) => {
    const task = taskType || activeTask;
    if (!task) return;
    try {
      const session = await createSessionMutation.mutateAsync({
        taskType: task,
        title: TASK_DEFINITIONS[task]?.labelAr || task,
      });
      setActiveSessionId(session.id);
      setActiveTask(task);
      if (promptText) {
        setInitialPrompt(promptText);
      }
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
    setInitialPrompt(undefined);
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
        setInitialPrompt(undefined);
      }
    } catch {
      // error handled by hook
    }
  };

  const handleSuggestionClick = (task: TaskType, promptText: string) => {
    setActiveTask(task);
    setInitialPrompt(promptText);
    if (task === 'PLATFORM_CONTROL') {
      handleNewSession(task, promptText);
    }
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
        setInitialPrompt(undefined);
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
      active: isHistoryOpen,
      onClick: () => setIsHistoryOpen((prev) => !prev),
    },
  ];

  return (
    <div
      className="relative flex-1 h-full min-h-[calc(100vh-var(--topbar-height)-3rem)] flex flex-col min-h-0 select-none"
      dir="rtl"
      data-testid="page-tibyan-workspace"
    >
      {/* Layer 3: Contextual Dynamic Island for Tibyan AI Tools (Centered) */}
      <div className="flex justify-center w-full shrink-0 mb-3">
        <ContextualDynamicIsland title="مساعد تِبيان الذكي" actions={islandActions} />
      </div>

      {/* Main Tibyan Workspace Canvas (Spacious, full height, no permanent history shrinkage) */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shadow-xs">
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {!activeTask ? (
            /* Home / Centered Welcome State */
            <div
              className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center select-none max-w-4xl w-full mx-auto my-auto overflow-y-auto"
              data-testid="tibyan-home-view"
            >
              <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] mb-5 flex items-center justify-center p-3 transition-transform duration-300 hover:scale-105">
                <Logo size="lg" variant="modern" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] mb-2.5 tracking-tight">
                تِبيان
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mb-8 max-w-xl mx-auto leading-relaxed">
                مساعدك الذكي المتكامل لإدارة الحصص والطلاب والاختبارات والمناهج التعليمية
              </p>

              {/* Suggestion Prompts Grid (4 Prominent Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl w-full">
                {SUGGESTION_PROMPTS.map((s) => {
                  const Icon = s.icon || MessageSquare;
                  return (
                    <button
                      key={s.prompt}
                      type="button"
                      onClick={() => handleSuggestionClick(s.task, s.prompt)}
                      className="p-4 sm:p-4.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface-subtle)]/70 hover:bg-[var(--color-bg-surface-subtle)] hover:border-[var(--color-brand-primary)]/40 hover:shadow-xs text-right transition-all group flex items-start gap-3.5 shadow-2xs cursor-pointer"
                      data-testid={`suggestion-${s.task}`}
                    >
                      <div className="p-2.5 rounded-xl bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))] shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))] mb-1">
                          {s.category}
                        </span>
                        <p className="text-xs sm:text-sm font-medium text-[var(--color-text-primary)] line-clamp-2 leading-relaxed">
                          {s.prompt}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : activeTask === 'PLATFORM_CONTROL' ? (
            /* Platform Control: Clean ChatGPT-style Viewport */
            <PlatformControlChat
              sessionId={activeSessionId}
              initialPrompt={initialPrompt}
              onSessionCreated={(id) => {
                setActiveSessionId(id);
                qc.invalidateQueries({ queryKey: tibyanKeys.history() });
              }}
            />
          ) : (
            /* Dedicated Tool UI: EXAM / SLIDES / REVIEW / NOTES (Full Workspace Width) */
            <div className="flex-1 w-full overflow-hidden">
              {renderToolUI(
                activeTask,
                activeSessionId,
                (id) => {
                  setActiveSessionId(id);
                  qc.invalidateQueries({ queryKey: tibyanKeys.history() });
                },
                initialPrompt
              )}
            </div>
          )}
        </div>
      </div>

      {/* History Overlay Backdrop */}
      {isHistoryOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-200"
          onClick={() => setIsHistoryOpen(false)}
          data-testid="history-drawer-backdrop"
          aria-hidden="true"
        />
      )}

      {/* History Drawer (Physical LEFT: left-0) */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 w-[320px] bg-[var(--color-bg-surface)] border-e border-[var(--color-border-subtle)] shadow-2xl z-50 flex flex-col transition-all duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
          isHistoryOpen
            ? 'translate-x-0 opacity-100 visible'
            : '-translate-x-full opacity-0 invisible pointer-events-none'
        )}
        data-testid="tibyan-history-drawer"
        aria-label="سجل محادثات وأدوات تِبيان"
        dir="rtl"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between shrink-0 bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))]" />
            <span className="text-sm font-bold text-[var(--color-text-primary)]">سجل محادثات تِبيان</span>
          </div>
          <button
            type="button"
            onClick={() => setIsHistoryOpen(false)}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-subtle)] transition-colors"
            aria-label="إغلاق السجل"
            data-testid="close-history-drawer-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* History Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {(sessions || []).length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--color-text-muted)] leading-relaxed">
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
                    'group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors border',
                    isActive
                      ? 'bg-[var(--color-brand-primary)]/10 border-[var(--color-brand-primary)]/30 text-[var(--color-brand-primary-emphasis,var(--color-brand-primary))]'
                      : 'border-transparent hover:bg-[var(--color-bg-surface-subtle)] text-[var(--color-text-primary)]'
                  )}
                  data-testid={`history-item-${session.id}`}
                >
                  <TaskIcon className="w-4 h-4 shrink-0 text-[var(--color-text-secondary)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {session.title || taskDef?.labelAr || 'جلسة محادثة'}
                    </p>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-mono num-isolate">
                      {new Date(session.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] transition-opacity"
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
        <div className="p-3.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] shrink-0">
          <Button
            variant="primary"
            size="sm"
            className="w-full text-xs font-semibold py-2.5"
            onClick={() => {
              setActiveTask('PLATFORM_CONTROL');
              setActiveSessionId(null);
              setInitialPrompt(undefined);
              setIsHistoryOpen(false);
            }}
            data-testid="btn-new-session"
          >
            <Plus className="w-4 h-4 ms-1.5" />
            <span>جلسة جديدة</span>
          </Button>
        </div>
      </aside>
    </div>
  );
}
