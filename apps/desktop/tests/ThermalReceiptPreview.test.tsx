import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThermalReceiptPreview } from '../src/features/finance/thermal/ThermalReceiptPreview.js';
import type { ThermalReceiptDto } from '@tibyan/contracts';

describe('ThermalReceiptPreview Component', () => {
  const mockReceipt: ThermalReceiptDto = {
    paymentId: 'b0000000-0000-0000-0000-000000000001',
    receiptNumber: 'REC-2026-0099',
    studentId: 'a0000000-0000-0000-0000-000000000001',
    studentName: 'عبد الرحمن محمد إبراهيم حسن الشناوي',
    studentCode: 'TB-4099',
    gradeLevel: 'PREP_2',
    gradeLevelNameAr: 'الصف الثاني الإعدادي',
    groupName: 'مجموعة الهندسة والقياس',
    amountCents: 18000,
    amountFormatted: '١٨٠٫٠٠ ج.م',
    paymentMethod: 'CASH',
    paymentMethodNameAr: 'نقدي',
    paymentDate: '2026-10-15',
    periodMonth: '2026-10',
    remainingBalanceCents: 6000,
    remainingBalanceFormatted: '٦٠٫٠٠ ج.م',
    teacherName: 'أ. زياد محمد (مدرس الرياضيات)',
    operatorName: 'المشرف المالي',
    notes: 'تم سداد دفعة أولى من الرسوم المقررة',
    issuedAt: '2026-10-15T10:30:00.000Z',
    isTestReceipt: false,
  };

  it('renders 80mm receipt with full authoritative details', () => {
    const html = renderToStaticMarkup(<ThermalReceiptPreview receipt={mockReceipt} paperWidth="80mm" />);

    expect(html).toContain('data-testid="thermal-receipt-preview"');
    expect(html).toContain('REC-2026-0099');
    expect(html).toContain('عبد الرحمن محمد إبراهيم حسن الشناوي');
    expect(html).toContain('TB-4099');
    expect(html).toContain('الصف الثاني الإعدادي');
    expect(html).toContain('مجموعة الهندسة والقياس');
    expect(html).toContain('١٨٠٫٠٠ ج.م');
    expect(html).toContain('٦٠٫٠٠ ج.م');
    expect(html).toContain('أ. زياد محمد (مدرس الرياضيات)');
    expect(html).toContain('إيصال استلام رسوم');
    expect(html).toContain('w-[340px]');
  });

  it('renders 58mm compact receipt layout with proper class', () => {
    const html = renderToStaticMarkup(<ThermalReceiptPreview receipt={mockReceipt} paperWidth="58mm" />);

    expect(html).toContain('w-[250px]');
    expect(html).toContain('REC-2026-0099');
    expect(html).toContain('١٨٠٫٠٠ ج.م');
  });

  it('renders test receipt with test indicator badge', () => {
    const testReceipt: ThermalReceiptDto = {
      ...mockReceipt,
      receiptNumber: 'TEST-0000',
      isTestReceipt: true,
    };

    const html = renderToStaticMarkup(<ThermalReceiptPreview receipt={testReceipt} paperWidth="80mm" />);
    expect(html).toContain('*** إيصال اختبار تجريبي ***');
    expect(html).toContain('TEST-0000');
  });
});
