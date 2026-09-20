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
      return new Response(JSON.stringify({ candidates: [{ body: { version: 1, blocks: [{ id: 'text-1', type: 'text', content: 'س', direction: 'rtl' }] }, modelAnswer: null, questionType: 'SHORT_ANSWER', difficulty: 'MEDIUM', marks: 1 }] }), { status: 200 });
    });
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: 'gemini-2.5-flash' })).resolves.toHaveProperty('candidates');
    expect(calls).toBe(2);
  });

  it('aborts a timed-out request with a credential-safe Arabic error', async () => {
    const provider = new GeminiExamProvider((_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }), { timeoutMs: 5 });
    await expect(provider.preview({ apiKey: 'secret-must-not-leak', prompt: 'draft', model: 'gemini-2.5-flash' }))
      .rejects.toThrow('انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي');
  });
});
