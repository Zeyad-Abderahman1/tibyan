import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CompleteSessionModal } from '../src/features/attendance/CompleteSessionModal.js';

describe('CompleteSessionModal', () => {
  it('renders auto-absence warning when unmarked students exist', () => {
    const html = renderToStaticMarkup(
      <CompleteSessionModal
        isOpen={true}
        groupName="مجموعة الأوائل"
        summary={{
          totalStudents: 20,
          present: 15,
          late: 2,
          absent: 1,
          excused: 0,
          unmarked: 2,
        }}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(html).toContain('مجموعة الأوائل');
    expect(html).toContain('إنهاء الحصة');
    expect(html).toContain('>2<');
    expect(html).toContain('طالب لم يتم تسجيل حضورهم');
    expect(html).toContain('غائبين');
    expect(html).toContain('data-testid="confirm-complete-session-btn"');
  });

  it('renders clean confirmation when all students are already marked', () => {
    const html = renderToStaticMarkup(
      <CompleteSessionModal
        isOpen={true}
        groupName="مجموعة المتفوقين"
        summary={{
          totalStudents: 20,
          present: 18,
          late: 1,
          absent: 1,
          excused: 0,
          unmarked: 0,
        }}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(html).toContain('مجموعة المتفوقين');
    expect(html).not.toContain('سيقوم النظام تلقائيًا بتسجيلهم كـ');
  });
});
