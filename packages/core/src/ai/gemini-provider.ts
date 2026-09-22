import { AiExamCandidateSchema, type AiExamCandidate } from '@tibyan/contracts';

function parseCandidateResponse(value: unknown): { candidates: AiExamCandidate[] } {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { candidates?: unknown }).candidates)) throw new Error();
  const candidates = (value as { candidates: unknown[] }).candidates;
  if (candidates.length > 100) throw new Error();
  return { candidates: candidates.map((candidate) => AiExamCandidateSchema.parse(candidate)) };
}

export type GeminiFetch = (input: string, init: RequestInit) => Promise<Response>;
export interface GeminiPreviewRequest { apiKey: string; prompt: string; model: string; signal?: AbortSignal; }
export interface GeminiGenerateRequest {
  apiKey: string;
  prompt: string;
  model: string;
  fileData?: { data: Buffer; mimeType: string };
  signal?: AbortSignal;
  maxOutputTokens?: number;
}
export interface GeminiProviderOptions { timeoutMs?: number; retryDelayMs?: number; }

/** Provider boundary: no IDs, SQL, commands, or persistence leave this class. */
export class GeminiExamProvider {
  private readonly timeoutMs: number;
  private readonly retryDelayMs: number;
  constructor(private readonly fetchImpl: GeminiFetch = fetch, options: GeminiProviderOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.retryDelayMs = options.retryDelayMs ?? 100;
  }

  async preview(request: GeminiPreviewRequest) {
    return this.generate({ ...request, fileData: undefined });
  }

  async testConnection(apiKey: string): Promise<void> {
    const result = await this.generate({
      apiKey, model: 'gemini-2.0-flash', prompt: 'Return {"ok":true} as JSON.', maxOutputTokens: 16,
    }, { type: 'OBJECT', properties: { ok: { type: 'BOOLEAN' } }, required: ['ok'] });
    if (result?.ok !== true) throw new Error('تعذر الاتصال بخدمة تِبيان.');
  }

  async generate(request: GeminiGenerateRequest, responseSchema?: Record<string, unknown>): Promise<any> {
    const controller = new AbortController();
    let timedOut = false;
    const externalAbort = () => controller.abort();
    request.signal?.addEventListener('abort', externalAbort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.timeoutMs);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`;

    const parts: Array<Record<string, unknown>> = [];
    if (request.fileData) {
      parts.push({
        inlineData: {
          mimeType: request.fileData.mimeType,
          data: request.fileData.data.toString('base64'),
        },
      });
    }
    parts.push({ text: request.prompt });

    const init: RequestInit = {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': request.apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', ...(responseSchema ? { responseSchema } : {}), ...(request.maxOutputTokens ? { maxOutputTokens: request.maxOutputTokens } : {}) },
      }),
    };
    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await this.fetchImpl(url, init);
        } catch {
          if (controller.signal.aborted) throw new Error(timedOut ? 'انتهت مهلة الاتصال بخدمة الذكاء الاصطناعي' : 'تم إلغاء طلب الذكاء الاصطناعي');
          if (attempt < 2) { await this.delay(); continue; }
          throw new Error('تعذر الاتصال بخدمة الذكاء الاصطناعي');
        }
        if (response.ok || attempt === 2 || response.status < 500) break;
        await this.delay();
      }
      if (!response?.ok) throw new Error('تعذر الاتصال بخدمة الذكاء الاصطناعي');
      const payload = await response.json();
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? payload;
      try {
        const parsed = typeof text === 'string' ? JSON.parse(text) : text;
        return responseSchema ? parsed : parseCandidateResponse(parsed);
      }
      catch { throw new Error('استجابة الذكاء الاصطناعي غير صالحة'); }
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', externalAbort);
    }
  }

  private async delay(): Promise<void> { if (this.retryDelayMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, this.retryDelayMs)); }
}
