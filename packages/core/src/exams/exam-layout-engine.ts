export type ExamOutputKind = 'STUDENT' | 'TEACHER' | 'ANSWER_KEY';
export interface PrintableQuestion { number: number; marks: number; bodyHtml: string; answerHtml?: string | null; answerSpaceLines: number }
export interface PrintableExam { title: string; durationMinutes: number; totalMarks: number; sections: Array<{ title: string; instructions: string; questions: PrintableQuestion[] }> }

const unsafe = (value: string) => /<script\b|\bon[a-z]+\s*=|javascript:|https?:\/\/(?!www\.w3\.org\/)/i.test(value);
const text = (value: string) => {
  if (unsafe(value)) throw new Error('محتوى الطباعة غير آمن');
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
const fragment = (value: string) => { if (unsafe(value)) throw new Error('محتوى الطباعة غير آمن'); return value; };

/** Converts an authoritative snapshot into one deterministic, offline printable document. */
import { KATEX_CSS } from './katex-css.js';

export class ExamLayoutEngine {
  render(exam: PrintableExam, kind: ExamOutputKind): string {
    if (!Number.isInteger(exam.durationMinutes) || exam.durationMinutes <= 0 || !Number.isInteger(exam.totalMarks) || exam.totalMarks <= 0) throw new Error('بيانات الاختبار غير صالحة');
    const sections = exam.sections.map((section) => `<section class="exam-section"><h2>${text(section.title)}</h2><p class="instructions">${text(section.instructions)}</p>${section.questions.map((question) => this.question(question, kind)).join('')}</section>`).join('');
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#0f172a;line-height:1.65}.exam-header{border-bottom:2px solid #0f766e;margin-bottom:12px}.exam-meta{display:flex;justify-content:space-between;direction:rtl}.exam-section{break-inside: avoid;page-break-inside: avoid;margin:12px 0}.question{break-inside: avoid;page-break-inside: avoid;border:1px solid #cbd5e1;padding:10px;margin:8px 0}.marks{float:left;font-weight:bold}.answer-space{border-bottom:1px dotted #94a3b8;height:1.7em}.answer{background:#ecfdf5;padding:8px}.math{direction:ltr;unicode-bidi:isolate}${KATEX_CSS}</style></head><body><header class="exam-header"><h1>${text(exam.title)}</h1><div class="exam-meta"><span>الزمن: ${exam.durationMinutes} دقيقة</span><span>الدرجة الكلية: ${exam.totalMarks}</span></div></header>${sections}</body></html>`;
  }

  private question(question: PrintableQuestion, kind: ExamOutputKind): string {
    if (!Number.isInteger(question.number) || question.number < 1 || !Number.isInteger(question.marks) || question.marks <= 0 || question.answerSpaceLines < 0) throw new Error('سؤال غير صالح للطباعة');
    const answer = kind === 'STUDENT' ? '' : question.answerHtml ? `<div class="answer">${fragment(question.answerHtml)}</div>` : '';
    const space = kind === 'ANSWER_KEY' ? '' : Array.from({ length: question.answerSpaceLines }, () => '<div class="answer-space"></div>').join('');
    return `<article class="question"><span class="marks">(${question.marks} درجات)</span><strong>س${question.number}.</strong>${fragment(question.bodyHtml)}${space}${answer}</article>`;
  }
}
