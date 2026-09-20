import {
  type AiGenerateCandidatesInput,
  type AiExamCandidate,
  AiGenerateCandidatesInputSchema,
} from '@tibyan/contracts';
import { GeminiExamProvider } from './gemini-provider.js';
import { GeminiCredentialService } from './gemini-credential.service.js';
import { requirePermission } from '../auth/permissions.js';
import { type AuthActor } from '../sources/pdf-source.service.js';

export interface AiExamServiceOptions {
  model?: string;
  provider?: GeminiExamProvider;
}

export class AiExamService {
  private readonly provider: GeminiExamProvider;
  private readonly model: string;

  constructor(
    private readonly credentialService: GeminiCredentialService,
    options: AiExamServiceOptions = {}
  ) {
    this.provider = options.provider ?? new GeminiExamProvider();
    this.model = options.model ?? 'gemini-2.5-flash';
  }

  /**
   * Generates candidate questions using Gemini.
   * Strips all internal IDs before generating prompt.
   * Provider enforces strict structured output conforming to AiExamCandidateSchema.
   */
  async previewCandidates(
    input: AiGenerateCandidatesInput,
    actor: AuthActor,
    signal?: AbortSignal
  ): Promise<{ candidates: AiExamCandidate[] }> {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = AiGenerateCandidatesInputSchema.parse(input);

    const apiKey = this.credentialService.get();
    if (!apiKey) {
      throw new Error('لم يتم تهيئة مفتاح خدمة الذكاء الاصطناعي في إعدادات النظام');
    }

    const prompt = this.buildPrompt(validated);
    return this.provider.preview({
      apiKey,
      model: this.model,
      prompt,
      signal,
    });
  }

  private buildPrompt(input: AiGenerateCandidatesInput): string {
    return [
      `أنت خبير تربوي في إعداد مسائل واختبارات الرياضيات للمناهج المصرية باللغة العربية.`,
      `المطلوب: توليد ${input.count} مسائل اختبارية مطابقة للمواصفات التالية بدقة متناهية:`,
      `- الموضوع أو المعيار: ${input.topicOrStandard}`,
      `- المرحلة والصف الدراسي: ${input.gradeLevel}`,
      `- المسار اللغوي: ${input.languageTrack}`,
      `- نوع المسألة: ${input.questionType}`,
      `- مستوى الصعوبة: ${input.difficulty}`,
      `- الدرجة المخصصة لكل مسألة: ${input.marks}`,
      ``,
      `تعليمات التنسيق الفني:`,
      `1. يجب أن تكون الاستجابة حصراً بصيغة JSON مطابقة تماماً للمخطط التالي:`,
      `{`,
      `  "candidates": [`,
      `    {`,
      `      "body": {`,
      `        "version": 1,`,
      `        "blocks": [`,
      `          { "id": "b1", "type": "text", "content": "نص المسألة بالعربية", "direction": "rtl" },`,
      `          { "id": "b2", "type": "math", "latex": "x^2 + 5x + 6 = 0", "displayMode": "block" }`,
      `        ]`,
      `      },`,
      `      "modelAnswer": {`,
      `        "version": 1,`,
      `        "blocks": [`,
      `          { "id": "a1", "type": "text", "content": "خطوات الحل النموذجي", "direction": "rtl" }`,
      `        ]`,
      `      },`,
      `      "questionType": "${input.questionType}",`,
      `      "difficulty": "${input.difficulty}",`,
      `      "marks": ${input.marks}`,
      `    }`,
      `  ]`,
      `}`,
      `2. لا تُضف أي معرّفات قواعد بيانات (UUIDs) أو حقول خارج المخطط المذكور.`,
      `3. اجعل الصياغة الرياضية سليمة ومكتوبة بصيغة LaTeX القياسية للكتل الرياضية.`,
    ].join('\n');
  }
}
