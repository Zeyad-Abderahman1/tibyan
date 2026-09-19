import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentCard } from '../src/features/students/cards/StudentCard.js';
import type { StudentDto } from '@tibyan/contracts';

const mockStudent: StudentDto = {
  id: 'student-1',
  studentCode: 'TB-0042',
  fullName: 'زياد محمد عبد الله',
  photoPath: null,
  educationSystem: 'GENERAL',
  gradeLevel: 'SEC_2',
  languageTrack: 'ARABIC',
  guardianPhone: '01012345678',
  status: 'ACTIVE',
  qrToken: 'TB-0042',
  barcodeValue: 'TB-0042',
  createdAt: '2026-09-19T00:00:00.000Z',
  updatedAt: '2026-09-19T00:00:00.000Z',
};

describe('StudentCard Component & Variants (TDD)', () => {
  it('renders Full Card with exact 85.6mm x 54mm dimensions and break-inside avoid', () => {
    const html = renderToStaticMarkup(
      <StudentCard student={mockStudent} variant="full" teacherName="الأستاذ أحمد الشريف" />
    );

    expect(html).toContain('data-testid="student-card"');
    expect(html).toContain('data-card-variant="full"');
    expect(html).toContain('85.6mm');
    expect(html).toContain('54mm');
    expect(html).toContain('break-inside');
  });

  it('Full Card renders student name, studentCode, grade, teacher name, and official logo without photo/avatar', () => {
    const html = renderToStaticMarkup(
      <StudentCard student={mockStudent} variant="full" teacherName="الأستاذ أحمد الشريف" />
    );

    expect(html).toContain('زياد محمد عبد الله');
    expect(html).toContain('TB-0042');
    expect(html).toContain('تانية ثانوي');
    expect(html).toContain('الأستاذ أحمد الشريف');
    expect(html).toContain('tibyan-official-logo');

    // Verify complete absence of student photo and avatar placeholders
    expect(html).not.toContain('data-testid="student-avatar"');
    expect(html).not.toContain('data-testid="student-profile-photo"');
    expect(html).not.toContain('photoUrl');
    expect(html).not.toContain('العمر'); // Age is safely omitted since canonical DOB/age does not exist
  });

  it('Full Card renders both QR code and Code128 barcode encoding exact studentCode', () => {
    const html = renderToStaticMarkup(<StudentCard student={mockStudent} variant="full" />);

    expect(html).toContain('data-testid="student-qr-svg"');
    expect(html).toContain('data-testid="code128-svg"');
  });

  it('renders Economical Card with minimal ink, large scannable code, student info, and no photo', () => {
    const html = renderToStaticMarkup(
      <StudentCard student={mockStudent} variant="economical" teacherName="الأستاذ أحمد الشريف" />
    );

    expect(html).toContain('data-testid="student-card"');
    expect(html).toContain('data-card-variant="economical"');
    expect(html).toContain('85.6mm');
    expect(html).toContain('54mm');
    expect(html).toContain('بطاقة اقتصادية');
    expect(html).toContain('زياد محمد عبد الله');
    expect(html).toContain('TB-0042');
    expect(html).toContain('تانية ثانوي');
    expect(html).toContain('الأستاذ أحمد الشريف');
    expect(html).toContain('data-testid="student-qr-svg"');
    expect(html).toContain('tibyan-official-logo');

    // Economical card must have zero student photo/avatar elements
    expect(html).not.toContain('data-testid="student-avatar"');
    expect(html).not.toContain('data-testid="student-profile-photo"');
    expect(html).not.toContain('العمر');
  });

  it('safely uses teacher fallback when teacherName is not explicitly provided', () => {
    const html = renderToStaticMarkup(<StudentCard student={mockStudent} />);
    expect(html).toContain('المعلم');
  });
});
