import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentCardPrintSheet } from '../src/features/students/cards/StudentCardPrintSheet.js';
import type { StudentDto } from '@tibyan/contracts';

function createMockStudents(count: number): StudentDto[] {
  return Array.from({ length: count }, (_, i) => {
    const num = (i + 1).toString().padStart(4, '0');
    return {
      id: `student-${i + 1}`,
      studentCode: `TB-${num}`,
      fullName: `طالب تجريبي رقم ${i + 1}`,
      photoPath: null,
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_2',
      languageTrack: 'ARABIC',
      guardianPhone: `0100000000${i % 10}`,
      status: 'ACTIVE',
      qrToken: `TB-${num}`,
      barcodeValue: `TB-${num}`,
      createdAt: '2026-09-19T00:00:00.000Z',
      updatedAt: '2026-09-19T00:00:00.000Z',
    };
  });
}

describe('StudentCardPrintSheet Component & Pagination (TDD)', () => {
  it('renders 1 A4 page container for 8 students (2 cols x 4 rows)', () => {
    const students = createMockStudents(8);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    // Exactly 1 A4 page
    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(1);

    // Exactly 8 student cards
    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(8);
  });

  it('renders exactly 2 A4 page containers for 9 students without splitting', () => {
    const students = createMockStudents(9);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(2);

    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(9);
  });

  it('renders exactly 2 A4 page containers for 16 students (8 per page)', () => {
    const students = createMockStudents(16);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(2);

    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(16);
  });

  it('renders exactly 3 A4 page containers for 17 students', () => {
    const students = createMockStudents(17);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(3);

    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(17);
  });

  it('applies print CSS for page break after and fixed A4 mm dimensions', () => {
    const students = createMockStudents(2);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    expect(html).toContain('210mm');
    expect(html).toContain('297mm');
    expect(html).toContain('page-break-after');
  });
});
