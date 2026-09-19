import { describe, it, expect, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThermalReceiptModal } from '../src/features/finance/thermal/ThermalReceiptModal.js';
import type { ThermalReceiptDto } from '@tibyan/contracts';

describe('ThermalReceiptModal Component Suite', () => {
  const sampleReceipt: ThermalReceiptDto = {
    paymentId: 'b0000000-0000-0000-0000-000000000001',
    receiptNumber: 'REC-2026-0042',
    studentId: 'a0000000-0000-0000-0000-000000000001',
    studentName: 'محمود السيد علي',
    studentCode: 'TB-4001',
    gradeLevel: 'PREP_1',
    gradeLevelNameAr: 'الصف الأول الإعدادي',
    groupName: 'مجموعة الجبر - أولى إعدادي',
    amountCents: 12000,
    amountFormatted: '١٢٠٫٠٠ ج.م',
    paymentMethod: 'CASH',
    paymentMethodNameAr: 'نقدي',
    paymentDate: '2026-10-01',
    periodMonth: '2026-10',
    remainingBalanceCents: 0,
    remainingBalanceFormatted: '٠٫٠٠ ج.م',
    teacherName: 'الأستاذ أحمد الشريف',
    operatorName: 'المسؤول',
    notes: 'دفعة شهر أكتوبر',
    issuedAt: new Date().toISOString(),
    isTestReceipt: false,
  };

  beforeEach(() => {
    (globalThis as any).window = {
      tibyan: {
        thermal: {
          listPrinters: async () => ({ success: true, data: [] }),
          getReceiptData: async () => ({ success: true, data: sampleReceipt }),
          printReceipt: async () => ({ success: true }),
          testPrint: async () => ({ success: true }),
        },
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
      },
    };
  });

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <ThermalReceiptModal
        isOpen={false}
        onClose={() => {}}
        initialReceipt={sampleReceipt}
      />
    );

    expect(html).toBe('');
  });

  it('renders modal with thermal preview and controls when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <ThermalReceiptModal
        isOpen={true}
        onClose={() => {}}
        initialReceipt={sampleReceipt}
      />
    );

    expect(html).toContain('data-testid="thermal-receipt-modal"');
    expect(html).toContain('REC-2026-0042');
    expect(html).toContain('محمود السيد علي');
    expect(html).toContain('data-testid="paper-width-80mm"');
    expect(html).toContain('data-testid="paper-width-58mm"');
    expect(html).toContain('data-testid="printer-select"');
    expect(html).toContain('data-testid="confirm-print-receipt-button"');
    expect(html).toContain('data-testid="test-print-button"');
  });

  it('displays printer options and auto-cut controls', () => {
    const html = renderToStaticMarkup(
      <ThermalReceiptModal
        isOpen={true}
        onClose={() => {}}
        initialReceipt={sampleReceipt}
      />
    );

    expect(html).toContain('إعدادات الطابعة');
    expect(html).toContain('قص الورق آلياً (Auto-cut)');
    expect(html).toContain('طريقة الإرسال');
    expect(html).toContain('Windows Driver');
    expect(html).toContain('ESC/POS Network');
  });
});
