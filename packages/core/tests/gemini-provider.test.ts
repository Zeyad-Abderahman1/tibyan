import { describe, expect, it } from 'vitest';
import { GeminiExamProvider } from '../src/index.js';

describe('Gemini exam provider', () => {
  it('sends structured schema through the secure provider boundary', async () => {
    let body: any;
    const provider = new GeminiExamProvider(async (_url, init) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"sections":[{"title":"t","content":"c","type":"content","sourcePage":1}]}' }] } }] }), { status: 200 });
    });
    const schema = { type: 'OBJECT', properties: { sections: { type: 'ARRAY' } } };
    const result = await provider.generate({ apiKey: 'secret', prompt: 'draft', model: 'gemini-2.0-flash' }, schema);
    expect(body.generationConfig.responseSchema).toEqual(schema);
    expect(result.sections[0].sourcePage).toBe(1);
  });
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

  it('aborts an explicitly cancelled request with safe Arabic cancellation message', async () => {
    const controller = new AbortController();
    const provider = new GeminiExamProvider((_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    setTimeout(() => controller.abort(), 10);
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: 'gemini-2.5-flash', signal: controller.signal }))
      .rejects.toThrow('تم إلغاء طلب الذكاء الاصطناعي');
  });
});

