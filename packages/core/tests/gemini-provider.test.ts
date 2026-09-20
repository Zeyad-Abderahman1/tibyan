import { describe, expect, it } from 'vitest';
import { GeminiExamProvider } from '../src/index.js';

describe('Gemini exam provider', () => {
  it('rejects malformed structured output instead of returning a candidate proposal', async () => {
    const provider = new GeminiExamProvider(async () => new Response(JSON.stringify({ candidates: [{ body: 'free text' }] }), { status: 200 }));
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: 'gemini-2.5-flash' })).rejects.toThrow('استجابة الذكاء الاصطناعي غير صالحة');
  });
});
