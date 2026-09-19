import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentCardPreviewModal } from '../src/features/students/cards/StudentCardPreviewModal.js';
import type { StudentDto } from '@tibyan/contracts';

const mockStudents: StudentDto[] = [
  {
    id: 's-1',
    studentCode: 'TB-0001',
    fullName: 'أحمد محمود علي',
    photoPath: null,
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_1',
    languageTrack: 'ARABIC',
    guardianPhone: '01011111111',
    status: 'ACTIVE',
    qrToken: 'TB-0001',
    barcodeValue: 'TB-0001',
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
  },
  {
    id: 's-2',
    studentCode: 'TB-0002',
    fullName: 'سارة إبراهيم حسن',
    photoPath: null,
    educationSystem: 'GENERAL',
    gradeLevel: 'SEC_1',
    languageTrack: 'ARABIC',
    guardianPhone: '01022222222',
    status: 'ACTIVE',
    qrToken: 'TB-0002',
    barcodeValue: 'TB-0002',
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
  },
];

describe('StudentCardPreviewModal Component (TDD)', () => {
  it('returns null when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <StudentCardPreviewModal
        isOpen={false}
        onClose={() => {}}
        students={mockStudents}
      />
    );
    expect(html).toBe('');
  });

  it('renders modal structure with variant switcher, view tabs, and action buttons', () => {
    const html = renderToStaticMarkup(
      <StudentCardPreviewModal
        isOpen={true}
        onClose={() => {}}
        students={mockStudents}
        teacherName="الأستاذ أحمد الشريف"
      />
    );

    expect(html).toContain('data-testid="student-card-preview-modal"');
    expect(html).toContain('معاينة وطباعة بطاقات الطلاب');
    expect(html).toContain('data-testid="tab-variant-full"');
    expect(html).toContain('data-testid="tab-variant-economical"');
    expect(html).toContain('data-testid="tab-single-card"');
    expect(html).toContain('data-testid="tab-a4-sheet"');
    expect(html).toContain('data-testid="btn-print-cards"');
    expect(html).toContain('data-testid="btn-export-pdf"');
    expect(html).toContain('data-testid="btn-close-card-modal"');
    expect(html).toContain('إجمالي الطلاب المحددين: 2 طالب');

    // Confirm no student photo
    expect(html).not.toContain('data-testid="student-avatar"');
  });

  it('renders single card viewport by default with student data and scannable code', () => {
    const html = renderToStaticMarkup(
      <StudentCardPreviewModal
        isOpen={true}
        onClose={() => {}}
        students={mockStudents}
      />
    );

    expect(html).toContain('data-testid="single-card-viewport"');
    expect(html).toContain('أحمد محمود علي');
    expect(html).toContain('TB-0001');
    expect(html).toContain('data-testid="student-qr-svg"');
    expect(html).toContain('data-testid="code128-svg"');
  });

  it('includes dedicated print sheet container for physical printing with 6-up layout', () => {
    const html = renderToStaticMarkup(
      <StudentCardPreviewModal
        isOpen={true}
        onClose={() => {}}
        students={mockStudents}
      />
    );

    expect(html).toContain('print-sheet-root');
    expect(html).toContain('data-testid="student-card-print-sheets"');
  });
});
