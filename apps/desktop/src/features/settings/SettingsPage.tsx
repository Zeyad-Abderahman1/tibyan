import { useState } from 'react';
import { Palette, Calendar, Users, HardDrive, Sparkles } from 'lucide-react';
import { cn } from '@tibyan/design-system';
import { ThemePreferencesTab } from './ThemePreferencesTab.js';
import { AcademicYearManager } from './AcademicYearManager.js';
import { UserManagementTab } from './UserManagementTab.js';
import { BackupSettingsTab } from './BackupSettingsTab.js';
import { AiSettingsTab } from './AiSettingsTab.js';

type SettingsTab = 'theme' | 'academic-years' | 'users' | 'backup' | 'ai';

interface TabItem {
  id: SettingsTab;
  label: string;
  icon: typeof Palette;
  requiresPermission?: string;
}

const TABS: TabItem[] = [
  { id: 'theme', label: 'المظهر والتفضيلات', icon: Palette },
  { id: 'academic-years', label: 'الأعوام الدراسية', icon: Calendar },
  { id: 'users', label: 'إدارة المساعدين', icon: Users, requiresPermission: 'USERS_MANAGE' },
  { id: 'backup', label: 'النسخ الاحتياطي', icon: HardDrive, requiresPermission: 'BACKUP_MANAGE' },
  { id: 'ai', label: 'إعدادات تِبيان الذكية', icon: Sparkles },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('theme');

  return (
    <div className="space-y-6 max-w-6xl mx-auto" data-testid="settings-page">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border-subtle)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
            إعدادات النظام
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            تهيئة تفضيلات العرض وإدارة الأعوام الدراسية وحسابات المساعدين وسجلات النسخ الاحتياطي.
          </p>
        </div>
      </div>

      {/* Tabs Navigation Header */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] overflow-x-auto pb-px">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-primary)]',
                isActive
                  ? 'border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] bg-[var(--color-bg-surface)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)]/50'
              )}
              data-testid={`settings-tab-${tab.id}`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Panel */}
      <div className="pt-2">
        {activeTab === 'theme' && <ThemePreferencesTab />}
        {activeTab === 'academic-years' && <AcademicYearManager />}
        {activeTab === 'users' && <UserManagementTab />}
        {activeTab === 'backup' && <BackupSettingsTab />}
        {activeTab === 'ai' && <AiSettingsTab />}
      </div>
    </div>
  );
}
