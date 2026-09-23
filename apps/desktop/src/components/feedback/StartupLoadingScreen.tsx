import { Logo, Button } from '@tibyan/design-system';

export interface StartupLoadingScreenProps {
  status?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function StartupLoadingScreen({
  status = 'جاري تجهيز مساحة العمل...',
  error = null,
  onRetry,
}: StartupLoadingScreenProps) {
  return (
    <div
      className="h-screen w-screen flex items-center justify-center overflow-hidden bg-[var(--color-bg-app)] text-[var(--color-text-primary)] p-6"
      dir="rtl"
      data-testid="app-loading"
    >
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-sm flex items-center justify-center">
          <Logo size="md" alt="تِبيان" className="w-12 h-12 rounded-xl" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-primary)] dark:text-[var(--color-text-primary)]">
          تِبيان
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
          نظام إدارة المعلم الذكي
        </p>

        {error ? (
          <div className="mt-7 rounded-xl border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] p-4" role="alert" data-testid="startup-error">
            <p className="text-sm font-semibold text-[var(--color-status-danger)]">تعذر بدء تشغيل تِبيان</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{error}</p>
            {onRetry && <Button className="mt-4" size="sm" onClick={onRetry}>إعادة المحاولة</Button>}
          </div>
        ) : (
          <div className="mt-7" aria-live="polite">
            <div className="flex h-6 items-end justify-center gap-1.5 text-[var(--color-brand-primary)]" data-testid="startup-loading-indicator" aria-hidden="true">
              <span className="h-3 w-1.5 rounded-full bg-current animate-pulse" />
              <span className="h-5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:160ms]" />
              <span className="h-3 w-1.5 rounded-full bg-current animate-pulse [animation-delay:320ms]" />
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
