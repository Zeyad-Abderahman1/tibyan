import { describe, expect, it } from 'vitest';
import { AiContentService, SourceContextService } from '../src/index.js';
import { deflateSync } from 'node:zlib';

const source = { id: 'source-id', title: 'Physics', pageCount: 2, gradeLevel: null, subject: null } as any;
const pdf = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Page >> endobj\nstream\nBT (Newton laws of motion) Tj ET\nendstream\n2 0 obj << /Type /Page >> endobj\nstream\nBT (Force equals mass times acceleration) Tj ET\nendstream');

describe('AI source generation boundary', () => {
  it('sends actual page text to the provider and retains source page provenance', async () => {
    let seen = '';
    let fileData: Buffer | undefined;
    const context = new SourceContextService(() => source, async () => ({ data: pdf, mimeType: 'application/pdf' }));
    const service = new AiContentService({ generate: async (request) => {
      seen = request.prompt;
      fileData = request.fileData?.data;
      return { questions: [{ body: 'What is force?', type: 'SHORT_ANSWER', correctAnswer: 'Mass times acceleration', marks: 1, sourcePage: 2 }] };
    } }, context);
    const result = await service.generateExamFromSource({ sourceDocumentId: source.id });
    expect(seen).toContain('Newton laws of motion');
    expect(seen).toContain('صفحة 2');
    expect(fileData).toEqual(pdf);
    expect(result.data.questions[0]?.sourcePage).toBe(2);
  });

  it('rejects image-only sources before the provider is called', async () => {
    let called = false;
    const context = new SourceContextService(() => source, async () => ({ data: Buffer.from('%PDF-1.4\n/Image'), mimeType: 'application/pdf' }));
    const service = new AiContentService({ generate: async () => { called = true; return {}; } }, context);
    await expect(service.generateNotes({ sourceDocumentId: source.id })).rejects.toThrow('لا يحتوي على نص قابل للاستخراج');
    expect(called).toBe(false);
  });

  it('rejects malformed provider output in Core', async () => {
    const context = new SourceContextService(() => source, async () => ({ data: pdf, mimeType: 'application/pdf' }));
    const service = new AiContentService({ generate: async () => ({ slides: [{ title: 'Missing content' }] }) }, context);
    await expect(service.generateSlides({ sourceDocumentId: source.id })).rejects.toThrow('استجابة الذكاء الاصطناعي غير صالحة');
  });

  it('rejects invented page provenance', async () => {
    const context = new SourceContextService(() => source, async () => ({ data: pdf, mimeType: 'application/pdf' }));
    const service = new AiContentService({ generate: async () => ({ sections: [{ title: 'Claim', content: 'Text', type: 'content', sourcePage: 99 }] }) }, context);
    await expect(service.generateReview({ sourceDocumentId: source.id })).rejects.toThrow('استجابة الذكاء الاصطناعي غير صالحة');
  });

  it('extracts text from a separately referenced compressed PDF content stream', async () => {
    const compressed = deflateSync(Buffer.from('BT (Velocity changes with time) Tj ET'));
    const file = Buffer.concat([
      Buffer.from('%PDF-1.4\n1 0 obj << /Type /Page /Contents 2 0 R >> endobj\n2 0 obj << /Filter /FlateDecode /Length ' + compressed.length + ' >>\nstream\n'),
      compressed,
      Buffer.from('\nendstream\nendobj'),
    ]);
    const context = new SourceContextService(() => source, async () => ({ data: file, mimeType: 'application/pdf' }));
    const result = await context.load(source.id);
    expect(result.pages).toEqual([{ page: 1, text: 'Velocity changes with time' }]);
  });

  it('rejects a provider response that does not meet exact MCQ and written counts', async () => {
    const context = new SourceContextService(() => source, async () => ({ data: pdf, mimeType: 'application/pdf' }));
    const service = new AiContentService({ generate: async () => ({ questions: [{ body: 'Q', type: 'SHORT_ANSWER', correctAnswer: 'A', marks: 1, sourcePage: 1 }] }) }, context);
    await expect(service.generateExamFromSource({ sourceDocumentId: source.id }, { mcqCount: 5, writtenCount: 3, questionCount: 8 })).rejects.toThrow('تعذر توليد العدد المطلوب');
  });
});
