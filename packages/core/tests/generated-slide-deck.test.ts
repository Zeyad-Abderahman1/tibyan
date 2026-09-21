import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { openAcademicDatabase, closeAcademicDatabase } from '@tibyan/db';
import { SlideService } from '../src/slides/slide.service.js';
import { MathRichContentSchema } from '@tibyan/contracts';

const settings = {
  sourceDocumentId: '00000000-0000-4000-8000-000000000001', title: 'Motion', gradeLevel: 'SEC_1' as const,
  slideCount: 8, detailLevel: 'DETAILED' as const, includeInteractive: true, includeExamples: true,
  includeSummary: true, theme: 'DARK' as const, layoutTemplate: 'EXPLAIN_EXAMPLE' as const,
};
const slides = Array.from({ length: 8 }, (_, index) => ({ title: `Slide ${index + 1}`, content: index === 0 ? 'Force $$F=ma$$' : `Force ${index + 1}`, sourcePage: 1 }));

describe('generated slide deck persistence', () => {
  const directory = mkdtempSync(join(tmpdir(), 'tibyan-slides-'));
  const filePath = join(directory, 'academic.sqlite');
  afterEach(() => { try { closeAcademicDatabase(); } catch { /* already closed */ } });

  it('reopens exactly eight slides with settings, blocks, and persisted order', () => {
    const database = openAcademicDatabase('2026-2027', { filePath, autoMigrate: true });
    const service = new SlideService(database.db);
    const saved = service.createGeneratedDeck(settings, { slides });
    console.info(`PERSISTED_TEST_DECK_ID=${saved.id}`);
    expect(saved.slides).toHaveLength(8);
    expect(saved.generationSettings?.theme).toBe('DARK');
    expect(saved.generationSettings?.layoutTemplate).toBe('EXPLAIN_EXAMPLE');
    expect(saved.generationSettings?.aspectRatio).toBe('16:9');
    const richContent = MathRichContentSchema.parse(JSON.parse(saved.slides[0]!.blocks[0]!.contentJson));
    expect(richContent.blocks).toHaveLength(2);
    expect(richContent.blocks[1]).toMatchObject({ type: 'math', latex: 'F=ma' });
    const secondBlock = service.addBlock({ slideId: saved.slides[0]!.id, blockType: 'TEXT', contentJson: JSON.stringify({ version: 1, blocks: [{ id: 'extra', type: 'text', content: 'Extra' }] }) });
    service.reorderBlocks({ slideId: saved.slides[0]!.id, blockIds: [secondBlock.id, saved.slides[0]!.blocks[0]!.id] });
    const reversed = saved.slides.map((slide) => slide.id).reverse();
    service.reorderSlides({ deckId: saved.id, slideIds: reversed });
    closeAcademicDatabase();
    const reopenedDb = openAcademicDatabase('2026-2027', { filePath, autoMigrate: true });
    const reopened = new SlideService(reopenedDb.db).getDeck(saved.id);
    expect(reopened.slides).toHaveLength(8);
    expect(reopened.slides.map((slide) => slide.id)).toEqual(reversed);
    expect(reopened.slides[7]!.blocks.map((block) => block.id)).toEqual([secondBlock.id, saved.slides[0]!.blocks[0]!.id]);
    expect(reopened.generationSettings?.theme).toBe('DARK');
    closeAcademicDatabase();
    if (!resolve(directory).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe test cleanup path');
    rmSync(directory, { recursive: true, force: true });
  });
});
