export interface VariantPlacement { id: string; marks: number; answer: unknown }
export interface ExamVariant {
  label: 'A' | 'B' | 'C' | 'D';
  placementIds: string[];
  totalMarks: number;
  answerKey: Array<{ placementId: string; answer: unknown }>;
}

/** Stable rotation creates equivalent forms without random state or changing authoritative placement data. */
export function buildExamVariants(placements: readonly VariantPlacement[], variantCount: number): ExamVariant[] {
  if (!Number.isInteger(variantCount) || variantCount < 1 || variantCount > 4) throw new Error('عدد النماذج غير صالح');
  if (new Set(placements.map((placement) => placement.id)).size !== placements.length) throw new Error('لا يمكن تكرار مواضع الأسئلة');
  const labels: ExamVariant['label'][] = ['A', 'B', 'C', 'D'];
  const marks = placements.reduce((total, placement) => total + placement.marks, 0);
  if (!placements.every((placement) => Number.isInteger(placement.marks) && placement.marks > 0)) throw new Error('درجات الأسئلة غير صالحة');
  return labels.slice(0, variantCount).map((label, index) => {
    const ordered = placements.length === 0 ? [] : [...placements.slice(index % placements.length), ...placements.slice(0, index % placements.length)];
    return { label, placementIds: ordered.map((placement) => placement.id), totalMarks: marks, answerKey: ordered.map((placement) => ({ placementId: placement.id, answer: placement.answer })) };
  });
}
