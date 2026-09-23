import { type AiGradingResponse, AiGradingResponseSchema } from '@tibyan/contracts';
import { type GeminiCredentialService } from '../ai/gemini-credential.service.js';
import { DEFAULT_TIBYAN_AI_MODEL } from '../ai/model-config.js';

export type GeminiGradingFetch = (input: string, init: RequestInit) => Promise<Response>;

export interface GeminiGradingRequest {
  apiKey: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
}

/**
 * Provider boundary for AI grading via Gemini.
 * No IDs, SQL, commands, or persistence leave this class.
 */
export class GeminiGradingProvider {
  private readonly timeoutMs = 30_000;
  private readonly retryDelayMs = 200;

  constructor(
    private readonly credentialService: GeminiCredentialService,
    private readonly fetchImpl: GeminiGradingFetch = fetch,
  ) {}

  async getCredential(): Promise<{ apiKey: string; model: string } | null> {
    const apiKey = this.credentialService.get();
    return apiKey ? { apiKey, model: DEFAULT_TIBYAN_AI_MODEL } : null;
  }

  async generateGrading(request: GeminiGradingRequest): Promise<AiGradingResponse> {
    const controller = new AbortController();
    let timedOut = false;
    const externalAbort = () => controller.abort();
    request.signal?.addEventListener('abort', externalAbort, { once: true });
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`;
    const init: RequestInit = {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': request.apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    };

    try {
      let response: Response | undefined;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          response = await this.fetchImpl(url, init);
        } catch {
          if (controller.signal.aborted) {
            throw new Error(timedOut
              ? 'انتهت مهلة الاتصال بخدمة التصحيح الذكي'
              : 'تم إلغاء طلب التصحيح الذكي');
          }
          if (attempt < 2) {
            await this.delay();
            continue;
          }
          throw new Error('تعذر الاتصال بخدمة التصحيح الذكي');
        }
        if (response.ok || attempt === 2 || response.status < 500) break;
        await this.delay();
      }

      if (!response?.ok) {
        throw new Error('تعذر الاتصال بخدمة التصحيح الذكي');
      }

      const payload = await response.json();
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? payload;

      try {
        const parsed = typeof text === 'string' ? JSON.parse(text) : text;
        return AiGradingResponseSchema.parse(parsed);
      } catch {
        throw new Error('استجابة التصحيح الذكي غير صالحة');
      }
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener('abort', externalAbort);
    }
  }

  private async delay(): Promise<void> {
    if (this.retryDelayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, this.retryDelayMs));
    }
  }
}
