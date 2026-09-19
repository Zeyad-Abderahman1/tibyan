import type { StudentDto } from '@tibyan/contracts';
import { Logo } from '@tibyan/design-system';
import { StudentQrCode } from './StudentQrCode.js';
import { Code128Barcode } from './Code128Barcode.js';
import { useAuthStore } from '../../auth/auth.state.js';

export type CardVariant = 'full' | 'economical';

const GRADE_LABELS: Record<string, string> = {
  PREP_1: 'أولى إعدادي',
  PREP_2: 'تانية إعدادي',
  PREP_3: 'تالتة إعدادي',
  SEC_1: 'أولى ثانوي',
  SEC_2: 'تانية ثانوي',
  SEC_3: 'تالتة ثانوي',
};

const SYSTEM_LABELS: Record<string, string> = {
  GENERAL: 'عام',
  EGYPTIAN_BACCALAUREATE: 'بكالوريا',
};

const TRACK_LABELS: Record<string, string> = {
  ARABIC: 'عربي',
  LANG_ENGLISH: 'لغات',
};

export interface StudentCardProps {
  student: StudentDto;
  variant?: CardVariant;
  groupName?: string;
  teacherName?: string;
  academicYearLabel?: string;
  className?: string;
}

/**
 * Standard physical student ID card: ISO/IEC 7810 ID-1 standard (85.6mm x 54mm).
 * Engineered for 100% theme-independent physical paper printing and optical scanning.
 * Supports two variants:
 * 1. Full Card: Large code on one side, prominent student info block, subtle Tibyan branding.
 * 2. Economical Card: Ultra-low ink usage, fast scanning, simplified layout.
 */
export function StudentCard({
  student,
  variant = 'full',
  groupName,
  teacherName,
  academicYearLabel = '2026 - 2027',
  className = '',
}: StudentCardProps) {
  const sessionTeacherName = useAuthStore((s) => s.session?.fullName);
  const resolvedTeacherName = teacherName || sessionTeacherName || 'الأستاذ المشرف';

  const gradeLabel = GRADE_LABELS[student.gradeLevel] || student.gradeLevel;
  const systemLabel = SYSTEM_LABELS[student.educationSystem] || student.educationSystem;
  const trackLabel = TRACK_LABELS[student.languageTrack] || student.languageTrack;

  if (variant === 'economical') {
    return (
      <div
        className={`relative bg-white text-slate-900 overflow-hidden flex flex-col justify-between border border-slate-400 rounded-sm shadow-2xs select-none ${className}`}
        style={{
          width: '85.6mm',
          height: '54mm',
          minWidth: '85.6mm',
          minHeight: '54mm',
          maxWidth: '85.6mm',
          maxHeight: '54mm',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          boxSizing: 'border-box',
          padding: '2.5mm',
        }}
        dir="rtl"
        data-testid="student-card"
        data-card-variant="economical"
        data-student-id={student.id}
        data-student-code={student.studentCode}
      >
        {/* Minimal Ink Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-300">
          <div className="flex items-center gap-1">
            <Logo
              size="custom"
              className="p-0 border-none shadow-none rounded-none bg-transparent shrink-0"
              style={{ height: '11px', width: '11px', objectFit: 'contain' }}
            />
            <span className="font-bold text-[10px] text-slate-800 font-cairo">تِبيان</span>
            <span className="text-[8px] text-slate-500 font-cairo">| بطاقة اقتصادية</span>
          </div>
          <span className="text-[8px] text-slate-500 font-mono dir-ltr">
            {academicYearLabel}
          </span>
        </div>

        {/* Side-by-Side Body: Right Info, Left Dominant Code */}
        <div className="flex-1 flex items-center justify-between gap-2.5 py-1">
          {/* Right Information Block */}
          <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
            <div>
              <h2
                className="text-[13px] font-bold text-slate-950 truncate leading-tight font-cairo"
                data-testid="card-student-name"
              >
                {student.fullName}
              </h2>
              <div className="text-[11px] font-mono font-bold text-slate-900 dir-ltr text-right mt-0.5" data-testid="card-student-code">
                {student.studentCode}
              </div>
            </div>

            <div className="text-[9px] text-slate-700 font-cairo space-y-0.5 pt-0.5 border-t border-slate-200">
              <div data-testid="card-grade">
                <span className="font-semibold text-slate-900">المرحلة:</span> {gradeLabel}
              </div>
              <div data-testid="card-teacher-name">
                <span className="font-semibold text-slate-900">المعلم:</span> {resolvedTeacherName}
              </div>
            </div>
          </div>

          {/* Left Dominant Scannable Code (Large QR Code on pure white background) */}
          <div className="shrink-0 flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded-xs">
            <StudentQrCode
              value={student.studentCode}
              size={110}
              quietZoneModules={1}
              className="w-[29mm] h-[29mm]"
            />
          </div>
        </div>

        {/* Minimal Footer */}
        <div className="flex items-center justify-between pt-0.5 border-t border-slate-200 text-[7.5px] text-slate-500 font-cairo">
          <span>بطاقة تعريف حضور سريعة</span>
          <span className="font-mono dir-ltr">{student.studentCode}</span>
        </div>
      </div>
    );
  }

  // Full Student Card Variant
  return (
    <div
      className={`relative bg-white text-slate-900 overflow-hidden flex flex-col justify-between border border-slate-300 rounded-md shadow-xs select-none ${className}`}
      style={{
        width: '85.6mm',
        height: '54mm',
        minWidth: '85.6mm',
        minHeight: '54mm',
        maxWidth: '85.6mm',
        maxHeight: '54mm',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
        boxSizing: 'border-box',
      }}
      dir="rtl"
      data-testid="student-card"
      data-card-variant="full"
      data-student-id={student.id}
      data-student-code={student.studentCode}
    >
      {/* Top Brand Banner */}
      <div
        className="px-2.5 py-0.5 flex items-center justify-between border-b border-[#c5a880]/40 shrink-0"
        style={{
          background: 'linear-gradient(90deg, #092628 0%, #0f3d3e 100%)',
          color: '#ffffff',
          height: '20px',
          maxHeight: '20px',
        }}
      >
        <div className="flex items-center gap-1.5 h-full">
          <Logo
            size="custom"
            className="p-0 border-none shadow-none rounded-none bg-transparent shrink-0"
            style={{ height: '13px', width: '13px', objectFit: 'contain' }}
          />
          <span className="font-bold text-[11px] tracking-tight text-white font-cairo">تِبيان</span>
          <span className="text-[8px] text-[#e6ca9e] font-medium font-cairo">| بطاقة طالب</span>
        </div>
        <div className="flex items-center gap-1 text-[7.5px] text-white/90 font-mono dir-ltr font-semibold">
          <span>{academicYearLabel}</span>
        </div>
      </div>

      {/* Main Body: Side-by-Side (Information Block beside Large Code Area) */}
      <div className="px-2.5 py-1.5 flex-1 flex flex-row items-stretch justify-between gap-2 overflow-hidden">
        {/* Right Information Block */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="space-y-1">
            <h2
              className="text-[12.5px] font-bold text-slate-950 truncate leading-tight font-cairo"
              data-testid="card-student-name"
            >
              {student.fullName}
            </h2>

            <div className="flex items-center gap-1 text-[8.5px] text-slate-600 font-cairo" data-testid="card-grade">
              <span className="font-semibold text-[#0f3d3e]">{gradeLabel}</span>
              <span>•</span>
              <span>{systemLabel}</span>
              <span>•</span>
              <span>{trackLabel}</span>
            </div>

            <div className="text-[8.5px] text-slate-700 font-cairo font-medium" data-testid="card-teacher-name">
              <span className="text-slate-500 font-normal">المعلم:</span> {resolvedTeacherName}
            </div>

            {groupName && (
              <div className="text-[8px] text-slate-500 truncate font-cairo">
                {groupName}
              </div>
            )}
          </div>

          {/* Code128 Barcode in info block */}
          <div className="pt-1 border-t border-slate-200">
            <Code128Barcode
              value={student.studentCode}
              height={12}
              showText={true}
              quietZoneModules={4}
              className="w-full max-w-[44mm]"
            />
          </div>
        </div>

        {/* Left Scannable Code Area (Large High-Contrast QR Code) */}
        <div className="shrink-0 flex flex-col items-center justify-center p-1 bg-white border border-slate-200 rounded-sm">
          <StudentQrCode
            value={student.studentCode}
            size={110}
            quietZoneModules={1}
            className="w-[28mm] h-[28mm]"
          />
          <span className="font-mono text-[7px] text-slate-400 mt-0.5 tracking-wider dir-ltr" data-testid="card-student-code">
            {student.studentCode}
          </span>
        </div>
      </div>

      {/* Decorative Brand Accent Line */}
      <div
        className="h-0.5 w-full shrink-0"
        style={{
          background: 'linear-gradient(90deg, #c5a880 0%, #0f3d3e 100%)',
        }}
      />
    </div>
  );
}
