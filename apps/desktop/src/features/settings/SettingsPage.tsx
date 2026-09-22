import { useState } from 'react';
import { Palette, Calendar, Users, HardDrive, Sparkles } from 'lucide-react';
import { ThemePreferencesTab } from './ThemePreferencesTab.js';
import { AcademicYearManager } from './AcademicYearManager.js';
import { UserManagementTab } from './UserManagementTab.js';
import { BackupSettingsTab } from './BackupSettingsTab.js';
import { AiSettingsTab } from './AiSettingsTab.js';
import { ContextualDynamicIsland } from '../../components/layout/ContextualDynamicIsland.js';

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

  const islandActions = TABS.map((tab) => ({
    id: tab.id,
    label: tab.label,
    icon: tab.icon,
    active: activeTab === tab.id,
    onClick: () => setActiveTab(tab.id),
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto" data-testid="settings-page">
      {/* Layer 3: Contextual Dynamic Island */}
      <ContextualDynamicIsland title="إعدادات النظام" actions={islandActions} />

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
