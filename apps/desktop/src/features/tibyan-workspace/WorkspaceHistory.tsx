import { useState } from 'react';
import { Button, Badge } from '@tibyan/design-system';
import {
  Plus,
  Trash2,
  MessageSquare,
  FileText,
  Presentation,
  BookOpen,
  StickyNote,
  Settings,
} from 'lucide-react';
import { useTibyanHistory, useDeleteHistoryItem, useRenameHistoryItem, TASK_DEFINITIONS, type TaskType } from '../../hooks/useTibyanWorkspace.js';

const TASK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  EXAM: FileText,
  SLIDES: Presentation,
  REVIEW: BookOpen,
  NOTES: StickyNote,
  PLATFORM_CONTROL: Settings,
};

interface WorkspaceHistoryProps {
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

export function WorkspaceHistory({
  activeSessionId,
  onSelectSession,
  onNewSession,
}: WorkspaceHistoryProps) {
  const { data: sessions, isLoading } = useTibyanHistory();
  const deleteMutation = useDeleteHistoryItem();
  const renameMutation = useRenameHistoryItem();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل؟ لن يتم حذف الملفات المنشأة.')) return;
    try {
      await deleteMutation.mutateAsync(sessionId);
    } catch {
      // error handled by hook
    }
  };

  const handleRename = async (sessionId: string) => {
    if (!editTitle.trim()) return;
    try {
      await renameMutation.mutateAsync({ sessionId, title: editTitle.trim() });
      setEditingId(null);
    } catch {
      // error handled by hook
    }
  };

  const startRename = (sessionId: string, currentTitle: string) => {
    setEditingId(sessionId);
    setEditTitle(currentTitle);
  };

  return (
    <div className="w-56 border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] flex flex-col" dir="rtl">
      <div className="p-3 border-b border-[var(--color-border-subtle)]">
        <Button variant="primary" size="sm" className="w-full" onClick={onNewSession} data-testid="btn-new-session">
          <Plus className="w-4 h-4 ml-1" />
          مهمة جديدة
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 flex justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
          </div>
        ) : (sessions || []).length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--color-text-secondary)]">
            لا يوجد سجل بعد
          </div>
        ) : (
          (sessions || []).map((session) => {
            const TaskIcon = TASK_ICONS[session.contextScope || ''] || MessageSquare;
            const taskDef = TASK_DEFINITIONS[(session.contextScope || '') as TaskType];
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={`flex items-center gap-2 p-2.5 mx-2 my-1 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[var(--color-brand-primary-bg)] ring-1 ring-[var(--color-brand-primary)]'
                    : 'hover:bg-[var(--color-bg-elevated)]'
                }`}
                onClick={() => onSelectSession(session.id)}
                data-testid={`history-item-${session.id}`}
              >
                <TaskIcon className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {editingId === session.id ? (
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleRename(session.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(session.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="w-full text-xs bg-transparent border-b border-[var(--color-brand-primary)] outline-none py-0.5"
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-xs font-medium text-[var(--color-text-primary)] truncate"
                      onDoubleClick={() => startRename(session.id, session.title || '')}
                    >
                      {session.title}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="accent" size="sm">
                      {taskDef?.labelAr || session.contextScope || 'عام'}
                    </Badge>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">
                      {new Date(session.createdAt).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                </div>
                <button
                  className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded hover:bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] transition-opacity"
                  onClick={(e) => handleDelete(e, session.id)}
                  title="حذف"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
