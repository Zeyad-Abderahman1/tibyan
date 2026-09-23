import { Card } from '@tibyan/design-system';
import {
  FileText,
  Presentation,
  BookOpen,
  StickyNote,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { TASK_DEFINITIONS, type TaskType } from '../../hooks/useTibyanWorkspace.js';

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Presentation,
  BookOpen,
  StickyNote,
  Settings,
};

interface TaskSidebarProps {
  activeTask: TaskType | null;
  onSelectTask: (task: TaskType) => void;
}

export function TaskSidebar({ activeTask, onSelectTask }: TaskSidebarProps) {
  return (
    <div className="w-64 border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] p-3 space-y-2 overflow-y-auto" dir="rtl">
      <h2 className="text-sm font-bold text-[var(--color-text-primary)] mb-3 px-1">
        مهام تِبيان
      </h2>
      {(Object.keys(TASK_DEFINITIONS) as TaskType[]).map((taskType) => {
        const def = TASK_DEFINITIONS[taskType];
        const Icon = ICON_MAP[def.icon] || FileText;
        const isActive = activeTask === taskType;
        return (
          <Card
            key={taskType}
            variant={isActive ? 'elevated' : 'default'}
            className={`p-3 cursor-pointer transition-all hover:shadow-sm ${
              isActive
                ? 'ring-2 ring-[var(--color-brand-primary)] bg-[var(--color-brand-primary-bg)]'
                : 'hover:bg-[var(--color-bg-elevated)]'
            }`}
            onClick={() => onSelectTask(taskType)}
            data-testid={`task-card-${taskType}`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isActive
                    ? 'bg-[var(--color-brand-primary)] text-white'
                    : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {def.labelAr}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                  {def.descriptionAr}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
