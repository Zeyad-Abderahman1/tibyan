import { describe, expect, it } from 'vitest';
import { toStudyRichContent } from '../src/features/tibyan-workspace/studyRichContent.js';

describe('study artifact math preview', () => {
  it('keeps Arabic text and renders delimited formulas as math blocks', () => {
    const content = toStudyRichContent('احسب القوة $$F=ma$$ ثم اشرح النتيجة');
    expect(content.blocks.map((block) => block.type)).toEqual(['text', 'math', 'text']);
    expect(content.blocks[1]).toMatchObject({type:'math',latex:'F=ma'});
  });
});
