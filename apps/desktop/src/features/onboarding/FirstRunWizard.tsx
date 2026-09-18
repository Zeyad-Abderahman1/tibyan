import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ArrowLeft, ShieldCheck, Calendar, Sparkles } from 'lucide-react';
import {
  Logo,
  Card,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
} from '@tibyan/design-system';
import type { SetupStateDto, LoginUserDto } from '@tibyan/contracts';

export interface FirstRunWizardProps {
  setupState?: SetupStateDto | null;
  onComplete?: () => void;
}

type WizardStep = 'welcome' | 'owner' | 'resume-auth' | 'academic-year' | 'complete';

export function FirstRunWizard({ setupState, onComplete }: FirstRunWizardProps) {
  const queryClient = useQueryClient();

  // Initial step resolution based on persisted SQLite setup state
  const determineInitialStep = (): WizardStep => {
    if (setupState?.hasOwner && !setupState?.hasActiveAcademicYear) {
      return 'resume-auth';
    }
    if (!setupState?.hasOwner && setupState?.hasActiveAcademicYear) {
      return 'owner';
    }
    return 'welcome';
  };

  const [step, setStep] = useState<WizardStep>(determineInitialStep);

  // Owner Form State (cleared immediately after auth)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // Resume Auth State (for interrupted setup where Owner already exists)
  const [resumePin, setResumePin] = useState('');

  // Academic Year Form State
  const currentYear = new Date().getFullYear();
  const [startYear, setStartYear] = useState<number>(currentYear);
  const derivedYearName = `${startYear}-${startYear + 1}`;

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (step === 'welcome') {
      setStep(determineInitialStep());
    }
  }, [setupState?.hasOwner, setupState?.hasActiveAcademicYear]);

  // Handler: Bootstrap Owner & Immediately Login
  const handleBootstrapOwner = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!fullName.trim()) {
      setErrorMessage('يرجى إدخال اسم المعلم بالكامل.');
      return;
    }
    if (username.trim().length < 3) {
      setErrorMessage('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setErrorMessage('رمز PIN يجب أن يتكون من 4 أرقام عددية بالضبط.');
      return;
    }
    if (pin !== confirmPin) {
      setErrorMessage('رمز PIN وتأكيده غير متطابقين.');
      return;
    }

    setLoading(true);
    try {
      // 1. Call canonical bootstrapOwner IPC
      const bootstrapRes = await window.tibyan.auth.bootstrapOwner({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        pin,
      });

      if (!bootstrapRes.success) {
        setErrorMessage(bootstrapRes.error?.message || 'فشل إنشاء حساب المعلم المسؤول.');
        setLoading(false);
        return;
      }

      const createdUser = bootstrapRes.data;

      // 2. Authoritatively log in with the in-memory PIN to establish MAIN session
      const loginRes = await window.tibyan.auth.loginWithPin({
        userId: createdUser.id,
        pin,
      });

      // 3. Immediately clear PIN from React state
      setPin('');
      setConfirmPin('');

      if (!loginRes.success) {
        setErrorMessage('تم إنشاء الحساب ولكن تعذر تسجيل الدخول التلقائي. يرجى المتابعة.');
        setStep('resume-auth');
        setLoading(false);
        return;
      }

      // 4. Invalidate system/setup queries
      await queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      await queryClient.invalidateQueries({ queryKey: ['setupState'] });

      // If active academic year already exists (interrupted setup recovery), transition to complete
      if (setupState?.hasActiveAcademicYear) {
        setStep('complete');
      } else {
        setStep('academic-year');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ غير متوقع أثناء إعداد الحساب.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Resume Auth for Interrupted Setup
  const handleResumeAuth = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMessage(null);

    if (!/^\d{4}$/.test(resumePin)) {
      setErrorMessage('رمز PIN يجب أن يتكون من 4 أرقام.');
      return;
    }

    setLoading(true);
    try {
      // Fetch users to get Owner ID
      const usersRes = await window.tibyan.auth.listUsers();
      if (!usersRes.success || !usersRes.data) {
        throw new Error('تعذر تحميل بيانات المستخدمين للتحقق.');
      }
      const ownerUser = usersRes.data.find((u: LoginUserDto) => u.role === 'OWNER');
      if (!ownerUser) {
        // Fallback: If no owner found unexpectedly, restart wizard
        setStep('owner');
        setLoading(false);
        return;
      }

      // Authenticate Owner
      const loginRes = await window.tibyan.auth.loginWithPin({
        userId: ownerUser.id,
        pin: resumePin,
      });

      setResumePin(''); // Clear PIN immediately

      if (!loginRes.success) {
        setErrorMessage(loginRes.error?.message || 'رمز PIN غير صحيح.');
        setLoading(false);
        return;
      }

      setStep('academic-year');
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل التحقق من هوية المعلم.');
    } finally {
      setLoading(false);
    }
  };

  // Handler: Create Initial Academic Year
  const handleCreateAcademicYear = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setErrorMessage(null);

    if (startYear < 2000 || startYear > 2100) {
      setErrorMessage('يرجى إدخال سنة صالحة بين 2000 و 2100.');
      return;
    }

    setLoading(true);
    try {
      const createRes = await window.tibyan.system.createAcademicYear({
        name: derivedYearName,
      });

      if (!createRes.success) {
        setErrorMessage(createRes.error?.message || 'فشل إنشاء العام الدراسي.');
        setLoading(false);
        return;
      }

      // Invalidate system and setup queries
      await queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
      await queryClient.invalidateQueries({ queryKey: ['setupState'] });

      setStep('complete');
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ غير متوقع أثناء إنشاء العام الدراسي.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    await queryClient.invalidateQueries({ queryKey: ['setupState'] });
    await queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    onComplete?.();
  };

  return (
    <div
      className="min-h-screen w-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg-app)] text-[var(--color-text-primary)] select-none"
      dir="rtl"
      data-testid="first-run-wizard"
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="lg" alt="تِبيان" className="mb-2" />
          <h1 className="text-2xl font-bold text-[var(--color-brand-primary)] dark:text-[var(--color-text-primary)]">
            مساعد المدرس الذكي — تِبيان
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            تهيئة النظام لأول مرة للبدء في تنظيم حلقاتك ومجموعاتك التعليمية
          </p>
        </div>

        {/* Step Card Container */}
        <Card variant="elevated" className="border-[var(--color-border-subtle)] shadow-lg">
          {/* Step 1: Welcome Screen */}
          {step === 'welcome' && (
            <div className="p-6 space-y-6 text-center" data-testid="wizard-step-welcome">
              <div className="w-12 h-12 rounded-full bg-[var(--color-brand-primary)]/10 dark:bg-[var(--color-brand-accent)]/20 text-[var(--color-brand-primary)] dark:text-[var(--color-brand-accent)] mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-bold">أهلاً بك يا أستاذنا الفاضل</h2>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  تِبيان نظام محلي مستقل صُمم خصيصاً لمساعدتك في متابعة الطلاب، تنظيم الجداول،
                  ورصد الحضور والدرجات بكل سهولة واحترافية. سنقوم الآن بإعداد حسابك كمعلم مسؤول وتحديد
                  عامك الدراسي الأول.
                </p>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="w-full font-semibold"
                onClick={() => setStep('owner')}
                rightIcon={<ArrowLeft className="w-4 h-4" />}
                data-testid="start-wizard-btn"
              >
                البدء في الإعداد
              </Button>
            </div>
          )}

          {/* Step 2: Owner Account Setup */}
          {step === 'owner' && (
            <form onSubmit={handleBootstrapOwner} className="p-6 space-y-5" data-testid="wizard-step-owner">
              <CardHeader className="px-0 pt-0 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[var(--color-brand-primary)]" />
                  <CardTitle>إنشاء حساب المعلم المسؤول</CardTitle>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  هذا الحساب يمتلك الصلاحيات الإدارية الكاملة للنظام ومحمي برمز PIN سري
                </p>
              </CardHeader>

              {errorMessage && (
                <div
                  className="p-3 rounded-md bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] text-xs border border-[var(--color-status-danger-border)]"
                  role="alert"
                  data-testid="wizard-error-msg"
                >
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  id="owner-fullname"
                  label="اسم المعلم بالكامل"
                  placeholder="مثال: الأستاذ أحمد الشريف"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  data-testid="input-owner-fullname"
                />

                <Input
                  id="owner-username"
                  label="اسم المستخدم (لتسجيل الدخول)"
                  placeholder="مثال: teacher"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  helperText="3 أحرف إنجليزية على الأقل"
                  required
                  data-testid="input-owner-username"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="owner-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    label="رمز PIN (4 أرقام)"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    disabled={loading}
                    required
                    data-testid="input-owner-pin"
                  />

                  <Input
                    id="owner-confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    maxLength={4}
                    label="تأكيد رمز PIN"
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    disabled={loading}
                    required
                    data-testid="input-owner-confirm-pin"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  className="w-full font-semibold"
                  data-testid="submit-owner-btn"
                >
                  حفظ الحساب والمتابعة
                </Button>
              </div>
            </form>
          )}

          {/* Step 2b: Resume Authentication for Interrupted Setup */}
          {step === 'resume-auth' && (
            <form onSubmit={handleResumeAuth} className="p-6 space-y-5" data-testid="wizard-step-resume-auth">
              <CardHeader className="px-0 pt-0 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[var(--color-brand-primary)]" />
                  <CardTitle>استكمال الإعداد — تأكيد الهوية</CardTitle>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  تم العثور على حساب معلم موجود مسبقاً. يرجى إدخال رمز PIN لمتابعة إعداد العام الدراسي
                </p>
              </CardHeader>

              {errorMessage && (
                <div
                  className="p-3 rounded-md bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] text-xs border border-[var(--color-status-danger-border)]"
                  role="alert"
                  data-testid="wizard-error-msg"
                >
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  id="resume-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  label="رمز PIN الخاص بالمعلم"
                  placeholder="••••"
                  value={resumePin}
                  onChange={(e) => setResumePin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  disabled={loading}
                  required
                  data-testid="input-resume-pin"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  className="w-full font-semibold"
                  data-testid="submit-resume-auth-btn"
                >
                  تأكيد والمتابعة
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Initial Academic Year */}
          {step === 'academic-year' && (
            <form onSubmit={handleCreateAcademicYear} className="p-6 space-y-5" data-testid="wizard-step-academic-year">
              <CardHeader className="px-0 pt-0 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[var(--color-brand-primary)]" />
                  <CardTitle>تحديد العام الدراسي الأول</CardTitle>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  يتم تخزين بيانات الطلاب والمجموعات والجداول داخل قاعدة بيانات منفصلة لكل عام دراسي
                </p>
              </CardHeader>

              {errorMessage && (
                <div
                  className="p-3 rounded-md bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] text-xs border border-[var(--color-status-danger-border)]"
                  role="alert"
                  data-testid="wizard-error-msg"
                >
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <Input
                  id="academic-start-year"
                  type="number"
                  min={2020}
                  max={2099}
                  label="سنة بدء العام الدراسي"
                  value={startYear}
                  onChange={(e) => setStartYear(parseInt(e.target.value, 10) || currentYear)}
                  disabled={loading}
                  required
                  data-testid="input-start-year"
                />

                <div className="p-3.5 rounded-lg bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)] flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-secondary)]">مسمى العام الدراسي المتتالي:</span>
                  <Badge variant="primary" size="md" className="font-bold text-sm num-isolate" data-testid="derived-year-badge">
                    {derivedYearName}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={loading}
                  className="w-full font-semibold"
                  data-testid="submit-year-btn"
                >
                  إنشاء وتفعيل العام الدراسي
                </Button>
              </div>
            </form>
          )}

          {/* Step 4: Completion */}
          {step === 'complete' && (
            <div className="p-6 space-y-6 text-center" data-testid="wizard-step-complete">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                  تم إعداد تِبيان بنجاح!
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  تم تهيئة حساب المعلم المسؤول وقاعدة بيانات العام الدراسي{' '}
                  <span className="font-semibold text-[var(--color-brand-primary)] num-isolate">
                    {derivedYearName}
                  </span>
                  . النظام جاهز الآن للعمل.
                </p>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full font-semibold"
                onClick={handleFinish}
                data-testid="finish-wizard-btn"
              >
                الدخول إلى البرنامج
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
