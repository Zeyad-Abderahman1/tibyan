import type { AiContentProvider } from '../assistant/ai-content.service.js';
import { DEFAULT_TIBYAN_AI_MODEL } from './model-config.js';
import { GeminiExamProvider } from './gemini-provider.js';

/** Core-owned adapter shared by Exam, Slides, Review, and Notes. */
export function createGeminiContentProvider(
  credentialService: { get(): string | null },
  provider: Pick<GeminiExamProvider, 'generate'> = new GeminiExamProvider(),
): AiContentProvider {
  return {
    generate: ({ prompt, responseSchema, fileData }) => {
      const apiKey = credentialService.get();
      if (!apiKey) throw new Error('لم يتم إعداد مفتاح تِبيان الذكي.');
      return provider.generate({ apiKey, model: DEFAULT_TIBYAN_AI_MODEL, prompt, fileData }, responseSchema);
    },
  };
}
