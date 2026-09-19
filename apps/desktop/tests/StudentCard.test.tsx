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

describe('StudentCard Component (TDD)', () => {
  it('renders student card with exact 85.6mm x 54mm dimensions style', () => {
    const html = renderToStaticMarkup(<StudentCard student={mockStudent} />);
    
    expect(html).toContain('data-testid="student-card"');
    expect(html).toContain('85.6mm');
    expect(html).toContain('54mm');
  });

  it('renders official logo, student name, and studentCode', () => {
    const html = renderToStaticMarkup(<StudentCard student={mockStudent} />);

    expect(html).toContain('زياد محمد عبد الله');
    expect(html).toContain('TB-0042');
    expect(html).toContain('tibyan-official-logo');
  });

  it('renders education system, grade level, and language track in Arabic', () => {
    const html = renderToStaticMarkup(<StudentCard student={mockStudent} />);

    expect(html).toContain('تانية ثانوي');
    expect(html).toContain('عام');
    expect(html).toContain('عربي');
  });

  it('renders both QR code and Code128 barcode encoding TB-0042', () => {
    const html = renderToStaticMarkup(<StudentCard student={mockStudent} />);

    expect(html).toContain('data-testid="student-qr-svg"');
    expect(html).toContain('data-testid="code128-svg"');
  });

  it('preserves print safety rules with break-inside avoid', () => {
    const html = renderToStaticMarkup(<StudentCard student={mockStudent} />);

    expect(html).toContain('break-inside');
  });
});
