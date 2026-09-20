import { describe, expect, it } from 'vitest';
import { GeminiExamProvider } from '../src/index.js';

describe('Gemini exam provider', () => {
  it('rejects malformed structured output instead of returning a candidate proposal', async () => {
    const provider = new GeminiExamProvider(async () => new Response(JSON.stringify({ candidates: [{ body: 'free text' }] }), { status: 200 }));
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: 'gemini-2.5-flash' })).rejects.toThrow('استجابة الذكاء الاصطناعي غير صالحة');
  });

  it('retries one transient failure before accepting structured output', async () => {
    let calls = 0;
    const provider = new GeminiExamProvider(async () => {
      calls++;
      if (calls === 1) return new Response('{}', { status: 503 });
      return new Response(JSON.stringify({ candidates: [{ body: { version: 1, blocks: [{}] }, questionType: 'SHORT_ANSWER', difficulty: 'MEDIUM', marks: 1 }] }), { status: 200 });
    });
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: 'gemini-2.5-flash' })).resolves.toHaveProperty('candidates');
    expect(calls).toBe(2);
  });
});
