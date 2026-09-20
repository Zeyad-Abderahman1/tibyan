const questionTypes = new Set(['MULTIPLE_CHOICE', 'ESSAY', 'SHORT_ANSWER', 'TRUE_FALSE']);
const difficulties = new Set(['EASY', 'MEDIUM', 'HARD', 'ADVANCED']);

function parseCandidateResponse(value: unknown): { candidates: unknown[] } {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { candidates?: unknown }).candidates)) throw new Error();
  const candidates = (value as { candidates: unknown[] }).candidates;
  if (candidates.length > 100 || candidates.some((candidate) => {
    if (!candidate || typeof candidate !== 'object') return true;
    const record = candidate as Record<string, unknown>;
    const body = record.body as Record<string, unknown> | undefined;
    return !body || body.version !== 1 || !Array.isArray(body.blocks) || body.blocks.length === 0 ||
      typeof record.questionType !== 'string' || !questionTypes.has(record.questionType) ||
      typeof record.difficulty !== 'string' || !difficulties.has(record.difficulty) ||
      !Number.isInteger(record.marks) || (record.marks as number) <= 0;
  })) throw new Error();
  return { candidates };
}

export type GeminiFetch = (input: string, init: RequestInit) => Promise<Response>;
export interface GeminiPreviewRequest { apiKey: string; prompt: string; model: string; signal?: AbortSignal; }

/** Provider boundary: no IDs, SQL, commands, or persistence leave this class. */
export class GeminiExamProvider {
  constructor(private readonly fetchImpl: GeminiFetch = fetch) {}

  async preview(request: GeminiPreviewRequest) {
    let response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
      {
        method: 'POST', signal: request.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': request.apiKey },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: request.prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
      }
    );
    if (!response.ok && response.status >= 500) {
      response = await this.fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent`,
        { method: 'POST', signal: request.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': request.apiKey }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: request.prompt }] }], generationConfig: { responseMimeType: 'application/json' } }) }
      );
    }
    if (!response.ok) throw new Error('تعذر الاتصال بخدمة الذكاء الاصطناعي');
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? payload;
    try {
      return parseCandidateResponse(typeof text === 'string' ? JSON.parse(text) : text);
    } catch {
      throw new Error('استجابة الذكاء الاصطناعي غير صالحة');
    }
  }
}
