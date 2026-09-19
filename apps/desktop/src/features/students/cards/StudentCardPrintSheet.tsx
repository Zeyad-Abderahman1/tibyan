import { useMemo } from 'react';
import type { StudentDto } from '@tibyan/contracts';
import { StudentCard, type CardVariant } from './StudentCard.js';

export interface StudentCardPrintSheetProps {
  students: StudentDto[];
  variant?: CardVariant;
  groupName?: string;
  teacherName?: string;
  academicYearLabel?: string;
  className?: string;
}

export const CARDS_PER_PAGE = 6; // 2 columns x 3 rows

/**
 * Standard A4 Portrait Print Sheet (210mm x 297mm).
 * Engineered strictly for physical paper printing:
 * - Deterministic physical mm grid layout (2 cols x 3 rows = 6 cards/page)
 * - Strict CSS page-break-after: always pagination
 * - Zero card clipping or cross-page splitting
 * - 7 or more students creates a clean second page
 */
export function StudentCardPrintSheet({
  students,
  variant = 'full',
  groupName,
  teacherName,
  academicYearLabel = '2026 - 2027',
  className = '',
}: StudentCardPrintSheetProps) {
  // Partition students into exact pages of 6 cards
  const pages = useMemo(() => {
    const result: StudentDto[][] = [];
    for (let i = 0; i < students.length; i += CARDS_PER_PAGE) {
      result.push(students.slice(i, i + CARDS_PER_PAGE));
    }
    return result;
  }, [students]);

  if (students.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-slate-500 font-cairo">
        لم يتم تحديد أي طلاب لطباعة البطاقات.
      </div>
    );
  }

  return (
    <div
      className={`print-sheets-container select-none text-slate-900 bg-white ${className}`}
      data-testid="student-card-print-sheets"
    >
      {pages.map((pageStudents, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1;
        return (
          <div
            key={pageIndex}
            className="a4-print-page relative bg-white mx-auto overflow-hidden flex flex-col justify-between"
            style={{
              width: '210mm',
              height: '297mm',
              minHeight: '297mm',
              maxHeight: '297mm',
              padding: '16mm 14mm',
              boxSizing: 'border-box',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
            data-testid="a4-print-page"
            data-page-number={pageIndex + 1}
          >
            {/* Sheet Header Banner with Trim Instructions */}
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-dashed border-slate-300 text-[9.5px] text-slate-500 font-cairo dir-rtl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0f3d3e]">
                  {variant === 'economical'
                    ? 'تِبيان — بطاقات الطلاب السريعة (اقتصادية)'
                    : 'تِبيان — بطاقات الطلاب الذكية'}
                </span>
                {groupName && <span>• {groupName}</span>}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-slate-400">قص البطاقات على خطوط التحديد (6 بطاقات / صفحة)</span>
                <span className="font-bold font-mono dir-ltr">
                  صفحة {pageIndex + 1} من {pages.length}
                </span>
              </div>
            </div>

            {/* 2 columns x 3 rows Grid (Deterministic 6-up Layout) */}
            <div
              className="grid grid-cols-2 gap-x-[10mm] gap-y-[14mm] justify-center items-center my-auto"
              style={{
                width: '182mm',
                margin: '0 auto',
              }}
            >
              {pageStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex justify-center items-center relative"
                  style={{
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <StudentCard
                    student={student}
                    variant={variant}
                    groupName={groupName}
                    teacherName={teacherName}
                    academicYearLabel={academicYearLabel}
                  />
                </div>
              ))}
            </div>

            {/* Sheet Footer Banner */}
            <div className="flex items-center justify-between pt-2 mt-4 border-t border-dashed border-slate-300 text-[8.5px] text-slate-400 font-cairo dir-rtl">
              <span>نظام تِبيان الذكي لإدارة المعلمين • بطاقات معيارية ISO/IEC 7810 ID-1</span>
              <span className="font-mono dir-ltr">TIBYAN CARDS • 6-UP A4 • OFFLINE WASM</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
