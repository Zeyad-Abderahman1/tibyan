import { useMemo } from 'react';
import type { StudentDto } from '@tibyan/contracts';
import { StudentCard } from './StudentCard.js';

export interface StudentCardPrintSheetProps {
  students: StudentDto[];
  groupName?: string;
  academicYearLabel?: string;
  className?: string;
}

const CARDS_PER_PAGE = 8; // 2 columns x 4 rows

/**
 * Standard A4 Portrait Print Sheet (210mm x 297mm).
 * Engineered strictly for physical paper printing:
 * - Deterministic physical mm grid layout (2 cols x 4 rows)
 * - Strict CSS page-break-after: always pagination
 * - Zero card clipping or cross-page splitting
 */
export function StudentCardPrintSheet({
  students,
  groupName,
  academicYearLabel = '2026 - 2027',
  className = '',
}: StudentCardPrintSheetProps) {
  // Partition students into exact pages of 8 cards
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
              padding: '14mm 10mm',
              boxSizing: 'border-box',
              pageBreakAfter: isLastPage ? 'auto' : 'always',
              breakAfter: isLastPage ? 'auto' : 'page',
            }}
            data-testid="a4-print-page"
            data-page-number={pageIndex + 1}
          >
            {/* Sheet Header Banner with Trim Instructions */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-dashed border-slate-300 text-[9px] text-slate-500 font-cairo dir-rtl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#0f3d3e]">تِبيان — بطاقات الطلاب الذكية</span>
                {groupName && <span>• {groupName}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">قص البطاقات على طول خطوط التحديد</span>
                <span className="font-bold font-mono dir-ltr">
                  صفحة {pageIndex + 1} من {pages.length}
                </span>
              </div>
            </div>

            {/* 2 columns x 4 rows Grid */}
            <div
              className="grid grid-cols-2 gap-x-[8.8mm] gap-y-[5.5mm] justify-center items-center my-auto"
              style={{
                width: '180mm',
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
                    groupName={groupName}
                    academicYearLabel={academicYearLabel}
                  />
                </div>
              ))}
            </div>

            {/* Sheet Footer with Sheet Timestamp and Guide Marks */}
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-dashed border-slate-300 text-[8.5px] text-slate-400 font-mono dir-ltr">
              <span>TIBYAN TEACHER OS • LOCAL-FIRST • VERIFIED ID-1</span>
              <span>
                TOTAL: {students.length} CARDS • PAGE {pageIndex + 1}/{pages.length}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
