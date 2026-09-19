import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentCardPrintSheet, CARDS_PER_PAGE } from '../src/features/students/cards/StudentCardPrintSheet.js';
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

describe('StudentCardPrintSheet Component & 6-Up Pagination (TDD)', () => {
  it('has CARDS_PER_PAGE set to exactly 6', () => {
    expect(CARDS_PER_PAGE).toBe(6);
  });

  it('renders 1 A4 page container for 6 students (2 cols x 3 rows)', () => {
    const students = createMockStudents(6);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    // Exactly 1 A4 page
    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(1);

    // Exactly 6 student cards
    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(6);
  });

  it('renders exactly 2 A4 page containers for 7 students (6 on page 1, 1 on page 2) without splitting', () => {
    const students = createMockStudents(7);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(2);

    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(7);
  });

  it('renders exactly 2 A4 page containers for 12 students (2 full pages of 6)', () => {
    const students = createMockStudents(12);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(2);

    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(12);
  });

  it('renders exactly 3 A4 page containers for 13 students', () => {
    const students = createMockStudents(13);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    const pageMatches = html.match(/data-testid="a4-print-page"/g);
    expect(pageMatches?.length).toBe(3);

    const cardMatches = html.match(/data-testid="student-card"/g);
    expect(cardMatches?.length).toBe(13);
  });

  it('renders economical variant on sheet with minimal ink and 6 cards per page', () => {
    const students = createMockStudents(6);
    const html = renderToStaticMarkup(
      <StudentCardPrintSheet students={students} variant="economical" teacherName="الأستاذ أحمد الشريف" />
    );

    expect(html).toContain('data-card-variant="economical"');
    expect(html).toContain('بطاقة اقتصادية');
    expect(html).not.toContain('data-testid="student-avatar"');
  });

  it('applies print CSS for page break after and fixed A4 mm dimensions', () => {
    const students = createMockStudents(2);
    const html = renderToStaticMarkup(<StudentCardPrintSheet students={students} />);

    expect(html).toContain('210mm');
    expect(html).toContain('297mm');
    expect(html).toContain('page-break-after');
  });
});
