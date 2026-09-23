import { describe, expect, it } from 'vitest';
import { GeminiExamProvider, DEFAULT_TIBYAN_AI_MODEL, GeminiProviderHttpError } from '../src/index.js';

describe('Gemini exam provider', () => {
  it('allows the newer model a bounded one-minute response window', () => {
    expect((new GeminiExamProvider() as any).timeoutMs).toBe(60_000);
  });
  it('tests connection with a small structured request through the provider', async () => {
    let body: any;
    let url = '';
    const provider = new GeminiExamProvider(async (input, init) => {
      url = input;
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 });
    });
    await expect(provider.testConnection('test-key')).resolves.toBeUndefined();
    expect(body.generationConfig.maxOutputTokens).toBe(128);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'minimal' });
    expect(body.contents[0].parts[0].text).not.toContain('test-key');
    expect(url).toContain(`/models/${DEFAULT_TIBYAN_AI_MODEL}:generateContent`);
  });

  it.each([429, 401, 403, 404])('classifies HTTP %s without leaking credentials', async (status) => {
    const key = 'secret-key-must-not-leak';
    const provider = new GeminiExamProvider(async () => new Response(JSON.stringify({ error: { code: status, status: 'PROVIDER_ERROR', message: `Failure for ${key}` } }), { status }));
    let error: unknown;
    try { await provider.testConnection(key); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(GeminiProviderHttpError);
    expect((error as GeminiProviderHttpError).httpStatus).toBe(status);
    expect(JSON.stringify(error)).not.toContain(key);
    expect((error as Error).message).not.toContain(key);
  });
  it('sends structured schema through the secure provider boundary', async () => {
    let body: any;
    const provider = new GeminiExamProvider(async (_url, init) => {
      body = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"sections":[{"title":"t","content":"c","type":"content","sourcePage":1}]}' }] } }] }), { status: 200 });
    });
    const schema = { type: 'OBJECT', properties: { sections: { type: 'ARRAY' } } };
    const result = await provider.generate({ apiKey: 'secret', prompt: 'draft', model: DEFAULT_TIBYAN_AI_MODEL }, schema);
    expect(body.generationConfig.responseSchema).toEqual(schema);
    expect(result.sections[0].sourcePage).toBe(1);
  });
  it('rejects malformed structured output instead of returning a candidate proposal', async () => {
    const provider = new GeminiExamProvider(async () => new Response(JSON.stringify({ candidates: [{ body: 'free text' }] }), { status: 200 }));
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: DEFAULT_TIBYAN_AI_MODEL })).rejects.toThrow('استجابة الذكاء الاصطناعي غير صالحة');
  });

  it('retries one transient failure before accepting structured output', async () => {
    let calls = 0;
    const provider = new GeminiExamProvider(async () => {
      calls++;
      if (calls === 1) return new Response('{}', { status: 503 });
      return new Response(JSON.stringify({ candidates: [{ body: { version: 1, blocks: [{ id: 'text-1', type: 'text', content: 'س', direction: 'rtl' }] }, modelAnswer: null, questionType: 'SHORT_ANSWER', difficulty: 'MEDIUM', marks: 1 }] }), { status: 200 });
    });
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: DEFAULT_TIBYAN_AI_MODEL })).resolves.toHaveProperty('candidates');
    expect(calls).toBe(2);
  });

  it('aborts a timed-out request with a credential-safe Arabic error', async () => {
    const provider = new GeminiExamProvider((_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }), { timeoutMs: 5 });
    await expect(provider.preview({ apiKey: 'secret-must-not-leak', prompt: 'draft', model: DEFAULT_TIBYAN_AI_MODEL }))
      .rejects.toThrow('انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي');
  });

  it('aborts an explicitly cancelled request with safe Arabic cancellation message', async () => {
    const controller = new AbortController();
    const provider = new GeminiExamProvider((_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    setTimeout(() => controller.abort(), 10);
    await expect(provider.preview({ apiKey: 'secret', prompt: 'draft', model: DEFAULT_TIBYAN_AI_MODEL, signal: controller.signal }))
      .rejects.toThrow('تم إلغاء طلب الذكاء الاصطناعي');
  });
});

