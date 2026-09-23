import { describe, expect, it } from 'vitest';
import { DEFAULT_TIBYAN_AI_MODEL, AiExamService, GeminiGradingProvider, createGeminiContentProvider } from '../src/index.js';
import { AssistantOrchestrator } from '../src/assistant/assistant-orchestrator.js';

describe('authoritative Tibyan AI model', () => {
  it('selects Gemini 3.5 Flash-Lite', () => {
    expect(DEFAULT_TIBYAN_AI_MODEL).toBe('gemini-3.5-flash-lite');
  });

  it('uses one model for Exam, Slides, Review, and Notes content generation', async () => {
    const models: string[] = [];
    const provider = createGeminiContentProvider({ get: () => 'fixture-key' }, {
      generate: async (request: { model: string }) => { models.push(request.model); return {}; },
    } as any);
    for (const type of ['exam', 'slides', 'review', 'notes']) {
      await provider.generate({ prompt: type, responseSchema: {}, fileData: { data: Buffer.from('source'), mimeType: 'application/pdf' } });
    }
    expect(models).toEqual(Array(4).fill(DEFAULT_TIBYAN_AI_MODEL));
  });

  it('uses the same model for Exam candidate generation', async () => {
    let seenModel = '';
    const service = new AiExamService({ get: () => 'fixture-key' } as any, {
      provider: { preview: async (request: { model: string }) => { seenModel = request.model; return { candidates: [] }; } } as any,
    });
    await service.previewCandidates({ topicOrStandard: 'القوة', gradeLevel: 'SEC_1', languageTrack: 'ARABIC', questionType: 'SHORT_ANSWER', difficulty: 'MEDIUM', marks: 1, count: 1, curriculumNodeIds: [], sourceReferenceIds: [] }, { role: 'OWNER', permissions: [] } as any);
    expect(seenModel).toBe(DEFAULT_TIBYAN_AI_MODEL);
  });

  it('uses the same model for Platform Control chat', async () => {
    let url = '';
    const orchestrator = Object.create(AssistantOrchestrator.prototype) as any;
    orchestrator.deps = { fetchImpl: async (input: string) => {
      url = input;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }), { status: 200 });
    } };
    await orchestrator.callGemini('fixture-key', [{ role: 'user', parts: [{ text: 'مرحبا' }] }]);
    expect(url).toContain(`/models/${DEFAULT_TIBYAN_AI_MODEL}:generateContent`);
  });

  it('uses the same model and actual stored key for AI grading', async () => {
    const provider = new GeminiGradingProvider({ get: () => 'fixture-key' } as any);
    expect(await provider.getCredential()).toEqual({ apiKey: 'fixture-key', model: DEFAULT_TIBYAN_AI_MODEL });
  });
});
