import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Users, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { Logo, Button, PinPad, Badge } from '@tibyan/design-system';
import type { UserSessionDto, LoginUserDto } from '@tibyan/contracts';
import { UserCard } from './UserCard.js';
import { useAuth } from '../../hooks/useAuth.js';
import { TeacherAvatar } from '../../components/layout/TeacherAvatar.js';

export interface LoginScreenProps {
  onLoginSuccess?: (session: UserSessionDto) => void;
  initialUsers?: LoginUserDto[];
}

export function LoginScreen({ onLoginSuccess, initialUsers }: LoginScreenProps) {
  const { login } = useAuth();

  // Active users state
  const [users, setUsers] = useState<LoginUserDto[]>(initialUsers ?? []);
  const [loadingUsers, setLoadingUsers] = useState(!initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => {
    if (!initialUsers || initialUsers.length === 0) return null;
    const owner = initialUsers.find((u) => u.role === 'OWNER');
    return owner ? owner.id : (initialUsers[0]?.id ?? null);
  });
  const [isSelectingUser, setIsSelectingUser] = useState(false);

  // Authentication & PIN state (ephemeral, never persisted to storage/DOM)
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Account-scoped cooldown state: Record<userId, absoluteDeadlineMs>
  const [cooldownDeadlines, setCooldownDeadlines] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());

  // 1. Fetch active users on mount
  useEffect(() => {
    let isMounted = true;

    async function loadUsers() {
      setLoadingUsers(true);
      try {
        if (typeof window !== 'undefined' && window.tibyan?.auth?.listUsers) {
          const res = await window.tibyan.auth.listUsers();
          if (res.success && isMounted) {
            const list = res.data || [];
            setUsers(list);

            // Default to Owner if available, otherwise first user
            const owner = list.find((u) => u.role === 'OWNER');
            if (owner) {
              setSelectedUserId(owner.id);
            } else if (list.length > 0) {
              setSelectedUserId(list[0]?.id ?? null);
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err?.message || 'تعذر تحميل قائمة المستخدمين.');
        }
      } finally {
        if (isMounted) {
          setLoadingUsers(false);
        }
      }
    }

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Ticker derived from absolute deadlines (handles timer jumps and suspension)
  useEffect(() => {
    const hasActiveDeadlines = Object.values(cooldownDeadlines).some((dl) => dl > Date.now());
    if (!hasActiveDeadlines) return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => clearInterval(interval);
  }, [cooldownDeadlines]);

  // Selected user record and account-scoped lock status
  const selectedUser = users.find((u) => u.id === selectedUserId) || null;
  const activeDeadline = selectedUserId ? (cooldownDeadlines[selectedUserId] ?? 0) : 0;
  const remainingSeconds = activeDeadline > now ? Math.ceil((activeDeadline - now) / 1000) : 0;
  const isAccountLocked = remainingSeconds > 0;

  // 3. User account switching
  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsSelectingUser(false);
    setPin(''); // Always clear previous user's PIN
    setErrorMessage(null); // Always clear previous user's error
  };

  // 4. Handle PIN submission with immediate memory wipe
  const handlePinComplete = useCallback(
    async (completedPin: string) => {
      if (!selectedUserId || submitting) return;

      // Guard: do not submit if current account is locked
      const deadline = cooldownDeadlines[selectedUserId] ?? 0;
      if (deadline > Date.now()) return;

      // Copy completed pin to local lexical variable for IPC call and IMMEDIATELY wipe component buffer
      const submittedPin = completedPin;
      setPin('');

      setSubmitting(true);
      setErrorMessage(null);

      try {
        const res = await login(selectedUserId, submittedPin);

        if (res.success) {
          onLoginSuccess?.(res.data);
        } else {
          if (res.error.code === 'ACCOUNT_LOCKED') {
            const retrySeconds =
              typeof (res.error.details as any)?.retryAfterSeconds === 'number'
                ? (res.error.details as any).retryAfterSeconds
                : 30;
            const newDeadline = Date.now() + retrySeconds * 1000;
            setCooldownDeadlines((prev) => ({ ...prev, [selectedUserId]: newDeadline }));
            setNow(Date.now());
            setErrorMessage(res.error.message || `تم قفل الحساب. يرجى الانتظار ${retrySeconds} ثانية.`);
          } else {
            setErrorMessage(res.error.message || 'رمز PIN غير صحيح. يرجى المحاولة مرة أخرى.');
          }
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'حدث خطأ أثناء التحقق من رمز PIN.');
      } finally {
        // Guarantee buffer is clear regardless of success or error
        setPin('');
        setSubmitting(false);
      }
    },
    [selectedUserId, submitting, cooldownDeadlines, login, onLoginSuccess]
  );

  // Loading users state
  if (loadingUsers) {
    return (
      <div
        className="min-h-screen w-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg-app)] text-[var(--color-text-primary)] select-none relative"
        dir="rtl"
        data-testid="login-screen"
      >
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex flex-col items-center space-y-2">
            <Logo size="md" alt="تِبيان" className="w-12 h-12 rounded-xl p-1.5" />
            <h1 className="text-xl font-bold text-[var(--color-brand-primary)] dark:text-white">
              مساعد المدرس الذكي — تِبيان
            </h1>
          </div>
          <div
            className="p-8 flex flex-col items-center justify-center space-y-3 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-md"
            data-testid="login-loading"
          >
            <Loader2 className="w-8 h-8 text-[var(--color-brand-primary)] dark:text-[#5CE1E6] animate-spin" />
            <span className="text-sm text-[var(--color-text-secondary)]">جاري تحميل الحسابات...</span>
          </div>
        </div>
      </div>
    );
  }

  // Zero users state
  if (users.length === 0) {
    return (
      <div
        className="min-h-screen w-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg-app)] text-[var(--color-text-primary)] select-none relative"
        dir="rtl"
        data-testid="login-screen"
      >
        <div
          className="w-full max-w-md p-8 text-center space-y-4 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] shadow-xl"
          data-testid="login-no-users"
        >
          <ShieldAlert className="w-10 h-10 text-[var(--color-status-warning)] mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-base">لا توجد حسابات مسجلة</h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              يرجى استكمال معالج التهيئة لإنشاء حساب المعلم المسؤول أولاً.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[var(--color-bg-app)] text-[var(--color-text-primary)] select-none relative overflow-hidden"
      dir="rtl"
      data-testid="login-screen"
    >
      {/* Subtle CSS Ambient Depth Layer */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        aria-hidden="true"
        data-testid="login-ambient-bg"
      >
        {/* Dark mode soft radial depth */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[750px] h-[550px] rounded-full bg-[radial-gradient(circle_at_center,rgba(54,85,143,0.2)_0%,rgba(12,20,34,0)_70%)] dark:block hidden" />
        {/* Light mode soft ambient glow */}
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[750px] h-[550px] rounded-full bg-[radial-gradient(circle_at_center,rgba(36,59,103,0.08)_0%,rgba(247,246,242,0)_70%)] dark:hidden block" />
        {/* Very subtle noise/dot texture */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025] [background-image:radial-gradient(#36558f_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      {/* Premium Horizontal Desktop Authentication Stage */}
      <div
        className="relative z-10 w-full max-w-[900px] bg-[var(--color-bg-surface)] dark:bg-[var(--color-bg-surface)]/95 backdrop-blur-xl border border-[var(--color-border-subtle)] rounded-2xl shadow-xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] overflow-hidden"
        data-testid="auth-stage"
      >
        <div className="flex flex-col md:flex-row items-stretch">
          {/* 1. Identity & Branding Panel (RTL Right side) */}
          <div
            className="w-full md:w-[48%] p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-l border-[var(--color-border-subtle)] dark:border-[#1A423F]/40 bg-[var(--color-bg-surface-subtle)]/40 dark:bg-[#081817]/40"
            data-testid="identity-panel"
          >
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-3">
                <Logo
                  size="md"
                  alt="تِبيان"
                  className="w-11 h-11 rounded-xl p-1.5 shadow-sm border border-slate-200/60 dark:border-white/10"
                />
                <div className="flex flex-col">
                  <span className="text-xl font-extrabold text-[var(--color-brand-primary)] dark:text-[#5CE1E6] tracking-tight leading-tight">
                    تِبيان
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)] dark:text-[#95B5B2] font-medium leading-tight">
                    مساعد المدرس الذكي — تِبيان
                  </span>
                </div>
              </div>

              {/* Greeting Headline */}
              <div className="mt-6 sm:mt-7 space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)] tracking-tight">
                  الشاشة مقفلة
                </h1>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  أدخل رمز PIN لفتح مساحة العمل
                </p>
              </div>

              {/* Account Identity Block / Picker */}
              {isSelectingUser ? (
                /* Account Selector View */
                <div className="mt-5 space-y-3" data-testid="account-picker-view">
                  <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border-subtle)] dark:border-[#1E4D4A]/30">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-text-primary)] dark:text-white">
                      <Users className="w-4 h-4 text-[var(--color-brand-primary)] dark:text-[#5CE1E6]" />
                      <span>اختيار الحساب</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSelectingUser(false)}
                      className="text-xs text-[var(--color-text-secondary)] dark:text-[#8EABA8] hover:text-[var(--color-text-primary)] dark:hover:text-white"
                      data-testid="cancel-account-picker-btn"
                    >
                      رجوع
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
                    {users.map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        isSelected={u.id === selectedUserId}
                        onSelect={() => handleSelectUser(u.id)}
                      />
                    ))}
                  </div>
                </div>
              ) : selectedUser ? (
                /* Selected User Card */
                <div className="mt-5 p-4 rounded-2xl bg-[var(--color-bg-surface)] dark:bg-[#071716]/80 border border-[var(--color-border-subtle)] dark:border-[#1E4D4A]/40 shadow-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <TeacherAvatar
                      name={selectedUser.fullName}
                      role={selectedUser.role}
                      size="md"
                      className="ring-2 ring-[var(--color-brand-primary)]/10"
                    />
                    <span className="sr-only" data-testid="lock-screen-avatar">الصورة الرمزية للمعلم</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-bold text-sm sm:text-base text-[var(--color-text-primary)] dark:text-white truncate">
                        {selectedUser.fullName}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--color-text-secondary)] dark:text-[#8EABA8] truncate num-isolate" dir="ltr">
                          @{selectedUser.username}
                        </span>
                        <Badge
                          variant={selectedUser.role === 'OWNER' ? 'primary' : 'neutral'}
                          size="sm"
                          className="text-[10px] py-0 px-1.5 font-medium"
                        >
                          {selectedUser.role === 'OWNER' ? 'المعلم المسؤول' : 'مساعد'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {users.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsSelectingUser(true);
                        setErrorMessage(null);
                      }}
                      className="mt-3 w-full justify-center text-xs text-[var(--color-brand-primary)] dark:text-[#5CE1E6] hover:bg-[var(--color-brand-primary-subtle)]/30 dark:hover:bg-[#5CE1E6]/10 py-1.5 rounded-xl transition-colors"
                      data-testid="switch-account-btn"
                    >
                      تبديل الحساب
                    </Button>
                  )}
                </div>
              ) : null}
            </div>

            {/* Trust & Security Tagline at base of identity column */}
            <div className="mt-6 pt-3 border-t border-[var(--color-border-subtle)]/60 dark:border-[#1E4D4A]/25 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] dark:text-[#6D8E8B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-brand-primary)] dark:text-[#5CE1E6] shrink-0" />
              <span>نظام محلي مشفر ومستقل بالكامل</span>
            </div>
          </div>

          {/* 2. PIN Workspace (RTL Left side) */}
          <div
            className="w-full md:w-[52%] p-6 sm:p-8 flex flex-col items-center justify-center"
            data-testid="pin-workspace"
          >
            <div className="w-full max-w-[300px] space-y-4" data-testid="pin-entry-view">
              {/* Workspace Title & Instruction */}
              <div className="text-center space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] dark:text-white">
                  أدخل رمز PIN للمتابعة
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)] dark:text-[#8EABA8]">
                  رمز سري مكون من 4 أرقام لتأكيد الهوية
                </p>
              </div>

              {/* Alerts: Cooldown or Error */}
              {isAccountLocked ? (
                <div
                  className="p-3.5 rounded-2xl bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border border-[var(--color-status-danger-border)] space-y-1.5 text-center shadow-xs"
                  role="alert"
                  data-testid="cooldown-banner"
                >
                  <div className="flex items-center justify-center gap-1.5 font-bold text-xs">
                    <Lock className="w-3.5 h-3.5" />
                    <span>الحساب مقفل مؤقتاً</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات).
                  </p>
                  <div className="flex items-center justify-center gap-1.5 pt-0.5 font-bold text-base num-isolate">
                    <span>{remainingSeconds}</span>
                    <span className="text-xs font-normal">ثانية متبقية</span>
                  </div>
                </div>
              ) : errorMessage ? (
                <div
                  className="p-3 rounded-xl bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] text-xs border border-[var(--color-status-danger-border)] text-center"
                  role="alert"
                  data-testid="login-error-msg"
                >
                  {errorMessage}
                </div>
              ) : null}

              {/* Submitting Spinner */}
              {submitting && (
                <div
                  className="flex items-center justify-center gap-2 text-xs text-[var(--color-brand-primary)] dark:text-[#5CE1E6] font-medium"
                  data-testid="login-verifying"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري التحقق من رمز PIN...</span>
                </div>
              )}

              {/* PinPad Container */}
              <div className="flex justify-center pt-0.5" data-testid="pin-pad-container">
                <PinPad
                  value={pin}
                  onChange={(val) => {
                    setPin(val);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onComplete={handlePinComplete}
                  disabled={submitting || isAccountLocked}
                  masked={true}
                  label="رمز PIN لتسجيل الدخول"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Local-First Footer Statement */}
      <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)] dark:text-[#6D8E8B] select-none z-10">
        <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-brand-primary)] dark:text-[#5CE1E6] shrink-0" />
        <span>يعمل تِبيان محلياً على جهازك • لا يحتاج اتصالاً بالإنترنت</span>
      </div>
    </div>
  );
}

