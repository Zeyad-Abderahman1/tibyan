import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Users, Lock, Loader2 } from 'lucide-react';
import { Logo, Card, CardHeader, CardTitle, Button, PinPad, Badge } from '@tibyan/design-system';
import type { UserSessionDto, LoginUserDto } from '@tibyan/contracts';
import { UserCard } from './UserCard.js';
import { useAuth } from '../../hooks/useAuth.js';

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

  return (
    <div
      className="min-h-screen w-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg-app)] text-[var(--color-text-primary)] select-none"
      dir="rtl"
      data-testid="login-screen"
    >
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="lg" alt="تِبيان" className="mb-2" />
          <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">
            مساعد المدرس الذكي — تِبيان
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            من التحضير إلى الامتحان، كل أدوات المدرس في مكان واحد
          </p>
        </div>

        {/* Main Card */}
        <Card variant="elevated" className="border-[var(--color-border-subtle)] shadow-xl overflow-hidden">
          {loadingUsers ? (
            <div className="p-12 flex flex-col items-center justify-center space-y-3" data-testid="login-loading">
              <Loader2 className="w-8 h-8 text-[var(--color-brand-primary)] animate-spin" />
              <span className="text-sm text-[var(--color-text-secondary)]">جاري تحميل الحسابات...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center space-y-4" data-testid="login-no-users">
              <ShieldAlert className="w-10 h-10 text-[var(--color-status-warning)] mx-auto" />
              <div className="space-y-1">
                <h3 className="font-bold text-base">لا توجد حسابات مسجلة</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  يرجى استكمال معالج التهيئة لإنشاء حساب المعلم المسؤول أولاً.
                </p>
              </div>
            </div>
          ) : isSelectingUser ? (
            /* Account Switcher View */
            <div className="p-6 space-y-4" data-testid="account-picker-view">
              <CardHeader className="px-0 pt-0 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--color-brand-primary)]" />
                    <CardTitle className="text-base font-bold">اختيار الحساب</CardTitle>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSelectingUser(false)}
                    className="text-xs text-[var(--color-text-secondary)]"
                    data-testid="cancel-account-picker-btn"
                  >
                    رجوع
                  </Button>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  اختر الحساب الذي ترغب بتسجيل الدخول إليه:
                </p>
              </CardHeader>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
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
          ) : (
            /* PIN Entry View */
            <div className="p-6 space-y-5" data-testid="pin-entry-view">
              {/* Active Selected User Display */}
              {selectedUser && (
                <div className="p-3 rounded-xl bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center font-bold text-sm shrink-0"
                      aria-hidden="true"
                    >
                      {selectedUser.fullName.trim().charAt(0) || 'م'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                        {selectedUser.fullName}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--color-text-secondary)] truncate" dir="ltr">
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
                      className="text-xs text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-subtle)]/50 shrink-0"
                      data-testid="switch-account-btn"
                    >
                      تبديل الحساب
                    </Button>
                  )}
                </div>
              )}

              {/* Cooldown Lockout Banner */}
              {isAccountLocked ? (
                <div
                  className="p-4 rounded-xl bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border border-[var(--color-status-danger-border)] space-y-2 text-center"
                  role="alert"
                  data-testid="cooldown-banner"
                >
                  <div className="flex items-center justify-center gap-2 font-bold text-sm">
                    <Lock className="w-4 h-4" />
                    <span>الحساب مقفل مؤقتاً</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    تم تجاوز الحد الأقصى للمحاولات الخاطئة (5 محاولات).
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1 font-bold text-lg num-isolate">
                    <span>{remainingSeconds}</span>
                    <span className="text-xs font-normal">ثانية متبقية</span>
                  </div>
                </div>
              ) : errorMessage ? (
                <div
                  className="p-3 rounded-lg bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] text-xs border border-[var(--color-status-danger-border)] text-center"
                  role="alert"
                  data-testid="login-error-msg"
                >
                  {errorMessage}
                </div>
              ) : null}

              {/* Submitting Spinner Overlay / Notice */}
              {submitting && (
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-brand-primary)] font-medium" data-testid="login-verifying">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق من رمز PIN...</span>
                </div>
              )}

              {/* Design-System PinPad Primitive */}
              <div className="flex justify-center pt-1" data-testid="pin-pad-container">
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
          )}
        </Card>

        {/* Security / Offline Notice */}
        <p className="text-center text-xs text-[var(--color-text-muted)]">
          تِبيان نظام محلي مشفر يعمل على جهازك الشخصي بدون الحاجة للاتصال بالإنترنت
        </p>
      </div>
    </div>
  );
}
