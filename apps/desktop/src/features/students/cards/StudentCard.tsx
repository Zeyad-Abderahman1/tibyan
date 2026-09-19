import type { StudentDto } from '@tibyan/contracts';
import { Logo } from '@tibyan/design-system';
import { StudentQrCode } from './StudentQrCode.js';
import { Code128Barcode } from './Code128Barcode.js';

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
  groupName?: string;
  teacherName?: string;
  academicYearLabel?: string;
  className?: string;
}

/**
 * Standard physical student ID card: ISO/IEC 7810 ID-1 standard (85.6mm x 54mm).
 * Engineered for 100% theme-independent physical paper printing and optical scanning.
 */
export function StudentCard({
  student,
  groupName,
  academicYearLabel = '2026 - 2027',
  className = '',
}: StudentCardProps) {
  const gradeLabel = GRADE_LABELS[student.gradeLevel] || student.gradeLevel;
  const systemLabel = SYSTEM_LABELS[student.educationSystem] || student.educationSystem;
  const trackLabel = TRACK_LABELS[student.languageTrack] || student.languageTrack;

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
      data-student-id={student.id}
      data-student-code={student.studentCode}
    >
      {/* Top Brand Banner */}
      <div
        className="px-2.5 py-0.5 flex items-center justify-between border-b border-[#c5a880]/40 shrink-0"
        style={{
          background: 'linear-gradient(90deg, #092628 0%, #0f3d3e 100%)',
          color: '#ffffff',
          height: '22px',
          maxHeight: '22px',
        }}
      >
        <div className="flex items-center gap-1.5 h-full">
          <Logo
            size="custom"
            className="p-0 border-none shadow-none rounded-none bg-transparent shrink-0"
            style={{ height: '15px', width: '15px', objectFit: 'contain' }}
          />
          <span className="font-bold text-[11px] tracking-tight text-white font-cairo">تِبيان</span>
          <span className="text-[8.5px] text-[#e6ca9e] font-medium font-cairo">| بطاقة طالب</span>
        </div>
        <div className="flex items-center gap-1 text-[8px] text-white/90 font-mono dir-ltr font-semibold">
          <span>{academicYearLabel}</span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="px-2.5 py-1 flex-1 flex flex-col justify-between overflow-hidden">
        {/* Student Info Row */}
        <div className="flex items-start gap-2">
          {/* Avatar / Photo */}
          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 mt-0.5">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-[#0f3d3e]">
                {student.fullName.slice(0, 1)}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <h2 className="text-[11.5px] font-bold text-slate-900 truncate leading-tight font-cairo">
              {student.fullName}
            </h2>
            <div className="flex items-center gap-1 mt-0.5 text-[8.5px] text-slate-600 font-cairo">
              <span className="font-semibold text-[#0f3d3e]">{gradeLabel}</span>
              <span>•</span>
              <span>{systemLabel}</span>
              <span>•</span>
              <span>{trackLabel}</span>
            </div>
            {groupName && (
              <div className="text-[8px] text-slate-500 truncate mt-0.5 font-cairo">
                {groupName}
              </div>
            )}
          </div>
        </div>

        {/* Machine-Readable Barcodes Footer Row */}
        <div className="flex items-end justify-between gap-1.5 pt-1 border-t border-slate-200 shrink-0">
          {/* Code 128 Barcode */}
          <div className="flex-1 min-w-0 flex flex-col items-center">
            <Code128Barcode
              value={student.studentCode}
              height={14}
              showText={true}
              quietZoneModules={4}
              className="w-full max-w-[48mm]"
            />
          </div>

          {/* QR Code */}
          <div className="shrink-0 flex flex-col items-center">
            <StudentQrCode
              value={student.studentCode}
              size={42}
              quietZoneModules={1}
              className="p-0.5 border border-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Decorative Brand Accent Line */}
      <div
        className="h-0.5 w-full"
        style={{
          background: 'linear-gradient(90deg, #c5a880 0%, #0f3d3e 100%)',
        }}
      />
    </div>
  );
}
