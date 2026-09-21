import { describe, expect, it } from 'vitest';
import { ExamLayoutEngine } from '../src/exams/exam-layout-engine.js';

describe('ExamLayoutEngine', () => {
  const snapshot = {
    title: 'اختبار الجبر', durationMinutes: 45, totalMarks: 10,
    sections: [{ title: 'أجب عن الآتي', instructions: 'اكتب خطوات الحل', questions: [{ number: 1, marks: 2, bodyHtml: '<p>أوجد قيمة <span dir="ltr">x</span></p>', answerHtml: '<p dir="ltr">x = 2</p>', answerSpaceLines: 2 }] }],
  };

  it('renders deterministic RTL A4 markup with isolated math and answer-key visibility', () => {
    const engine = new ExamLayoutEngine();
    const student = engine.render(snapshot, 'STUDENT');
    const teacher = engine.render(snapshot, 'TEACHER');
    expect(student).toBe(engine.render(snapshot, 'STUDENT'));
    expect(student).toContain('@page');
    expect(student).toContain('dir="rtl"');
    expect(student).not.toContain('x = 2');
    expect(teacher).toContain('x = 2');
    expect(student).toContain('break-inside: avoid');
  });

  it('rejects executable or remote document fragments', () => {
    expect(() => new ExamLayoutEngine().render({ ...snapshot, title: '<script>alert(1)</script>' }, 'STUDENT')).toThrow();
  });
});
