import { MathRichContentSchema, type MathRichContent } from '@tibyan/contracts';

export function toStudyRichContent(value: string): MathRichContent {
  const segments = value.split(/(\$\$[\s\S]*?\$\$)/g).filter(Boolean);
  const blocks = segments.map((segment, index) => segment.startsWith('$$') && segment.endsWith('$$') && segment.slice(2, -2).trim()
    ? {id:`study-${index}`,type:'math' as const,latex:segment.slice(2,-2).trim(),displayMode:'block' as const}
    : {id:`study-${index}`,type:'text' as const,content:segment,direction:'rtl' as const});
  return MathRichContentSchema.parse({version:1,blocks});
}
