import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusSegmentedControl } from '../src/features/attendance/StatusSegmentedControl.js';
import { LateTimeModal } from '../src/features/attendance/LateTimeModal.js';

describe('StatusSegmentedControl & LateTimeModal', () => {
  it('renders status segmented control with 4 states and active state', () => {
    const html = renderToStaticMarkup(
      <StatusSegmentedControl
        currentStatus="PRESENT"
        studentName="أحمد محمد"
        studentCode="TB-0001"
        onSelectStatus={() => {}}
      />
    );

    expect(html).toContain('حاضر');
    expect(html).toContain('متأخر');
    expect(html).toContain('غائب');
    expect(html).toContain('معذور');
    expect(html).toContain('data-active="true"');
  });

  it('renders late time modal with student name and 24h time input', () => {
    const html = renderToStaticMarkup(
      <LateTimeModal
        isOpen={true}
        studentName="سارة علي"
        initialTime="16:30"
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(html).toContain('سارة علي');
    expect(html).toContain('وقت الحضور');
    expect(html).toContain('16:30');
  });
});
