import { useState } from 'react';
import { Sun, Moon, Laptop, Check, AlertCircle } from 'lucide-react';
import { Card, useTheme } from '@tibyan/design-system';
import { useSettings, useUpdateTheme } from '../../hooks/useSettings.js';

interface ThemeOption {
  id: 'light' | 'dark' | 'system';
  title: string;
  description: string;
  icon: typeof Sun;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    title: 'المظهر الفاتح',
    description: 'واجهة ناصعة بألوان متباينة مناسبة للقاعات المضاءة جيداً.',
    icon: Sun,
  },
  {
    id: 'dark',
    title: 'المظهر الداكن',
    description: 'واجهة داكنة مريحة للعين تقلل إجهاد البصر أثناء العمل المطول.',
    icon: Moon,
  },
  {
    id: 'system',
    title: 'تلقائي (حسب النظام)',
    description: 'تكييف مظهر النظام تلقائياً بالتزامن مع إعدادات نظام تشغيل ويندوز.',
    icon: Laptop,
  },
];

export function ThemePreferencesTab() {
  const { data: settings } = useSettings();
  const { theme: currentTheme, setTheme } = useTheme();
  const updateThemeMutation = useUpdateTheme();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeTheme = settings?.theme || currentTheme;

  const handleSelectTheme = async (themeId: 'light' | 'dark' | 'system') => {
    setErrorMsg(null);
    setTheme(themeId);
    try {
      await updateThemeMutation.mutateAsync({ theme: themeId });
    } catch (err: any) {
      setErrorMsg(err?.message || 'تعذر حفظ المظهر المحدد.');
    }
  };

  return (
    <div className="space-y-6" data-testid="theme-preferences-tab">
      <div>
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          مظهر النظام والسمة البصرية
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          اختر المظهر المفضل لواجهة تِبيان بما يلائم بيئة عملك وإضاءة المكان.
        </p>
      </div>

      {errorMsg && (
        <div
          className="flex items-center gap-2 p-3 bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] rounded-lg text-xs"
          role="alert"
          data-testid="theme-error-banner"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {THEME_OPTIONS.map((opt) => {
          const isSelected = activeTheme === opt.id;
          const Icon = opt.icon;

          return (
            <Card
              key={opt.id}
              variant={isSelected ? 'outlined' : 'default'}
              className={`p-5 cursor-pointer transition-all relative border-2 ${
                isSelected
                  ? 'border-[var(--color-brand-primary)] bg-[var(--color-bg-surface)] ring-2 ring-[var(--color-brand-primary)]/10'
                  : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]'
              }`}
              onClick={() => handleSelectTheme(opt.id)}
              data-testid={`theme-card-${opt.id}`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected
                      ? 'bg-[var(--color-brand-primary)] text-white'
                      : 'bg-[var(--color-bg-app)] text-[var(--color-text-secondary)]'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                {isSelected && (
                  <span
                    className="w-5 h-5 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center text-xs"
                    aria-label="المظهر المفعل"
                    data-testid={`theme-selected-${opt.id}`}
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                )}
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
                  {opt.title}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between p-4 bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-lg">
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
          <span className="font-medium text-[var(--color-text-primary)]">المظهر النشط حالياً:</span>
          <span className="font-bold text-[var(--color-brand-primary)]">
            {activeTheme === 'light'
              ? 'المظهر الفاتح'
              : activeTheme === 'dark'
              ? 'المظهر الداكن'
              : 'تلقائي (حسب النظام)'}
          </span>
        </div>
        {updateThemeMutation.isPending && (
          <span className="text-xs text-[var(--color-text-secondary)] animate-pulse">
            جاري حفظ التفضيلات...
          </span>
        )}
      </div>
    </div>
  );
}
