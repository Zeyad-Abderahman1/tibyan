import { type AiGradingProposal } from '@tibyan/contracts';
import { type GeminiCredentialService } from '../ai/gemini-credential.service.js';
import { GeminiGradingProvider, type GeminiGradingFetch } from './gemini-grading-provider.js';

export interface AiGradingInput {
  examQuestionId: string;
  questionBody: unknown;
  modelAnswer: unknown;
  rubricCriteria: Array<{ key: string; label: string; maxMarks: number; description?: string }>;
  maxMarks: number;
  recognizedResponse: string | null;
  recognizedOptionLabel: string | null;
  evidenceRefJson: string | null;
}

/**
 * AI-assisted grading service using Gemini.
 * Sends structured prompts to Gemini for constructed-response grading.
 * Returns proposals — never directly persists grades.
 */
export class AiGradingService {
  private provider: GeminiGradingProvider;

  constructor(
    credentialService: GeminiCredentialService,
    fetchImpl?: GeminiGradingFetch,
  ) {
    this.provider = new GeminiGradingProvider(credentialService, fetchImpl);
  }

  /**
   * Request AI grading proposals for a set of questions.
   */
  async gradeQuestions(
    questions: AiGradingInput[],
    signal?: AbortSignal,
  ): Promise<AiGradingProposal[]> {
    if (questions.length === 0) return [];

    const credential = await this.provider.getCredential();
    if (!credential) {
      throw new Error('Gemini credential not configured');
    }

    const prompt = this.buildGradingPrompt(questions);
    const response = await this.provider.generateGrading({
      apiKey: credential.apiKey,
      model: credential.model,
      prompt,
      signal,
    });

    return response.proposals.map((proposal) => {
      // Validate proposal bounds
      const question = questions.find((q) => q.examQuestionId === proposal.examQuestionId);
      if (question) {
        // Clamp awarded marks to max
        proposal.awardedMarks = Math.min(proposal.awardedMarks, question.maxMarks);
        proposal.awardedMarks = Math.max(0, proposal.awardedMarks);

        // Validate rubric criterion totals
        const rubricTotal = proposal.rubricResults.reduce((sum, r) => sum + r.awardedMarks, 0);
        if (rubricTotal > question.maxMarks) {
          // Scale down proportionally
          const scale = question.maxMarks / rubricTotal;
          proposal.rubricResults.forEach((r) => {
            r.awardedMarks = Math.floor(r.awardedMarks * scale);
          });
        }
      }

      // Sanitize — no IDs, SQL, or commands
      delete (proposal as any).examQuestionId;
      return proposal;
    });
  }

  private buildGradingPrompt(questions: AiGradingInput[]): string {
    const questionsPrompt = questions.map((q, idx) => {
      return `  {
    "index": ${idx},
    "maxMarks": ${q.maxMarks},
    "recognizedResponse": ${JSON.stringify(q.recognizedResponse)},
    "recognizedOptionLabel": ${JSON.stringify(q.recognizedOptionLabel)},
    "rubricCriteria": ${JSON.stringify(q.rubricCriteria)}
  }`;
    }).join(',\n');

    return `أنت مصحح اختبارات خبير. قم بتصحيح الإجابات التالية بناءً على المعايير المحددة.

${questionsPrompt}

أعد النتيجة كJSON بالشكل التالي:
{
  "proposals": [
    {
      "examQuestionId": "INDEX",
      "awardedMarks": 0,
      "rubricResults": [
        {
          "criterionKey": "key",
          "criterionLabel": "label",
          "maxMarks": 0,
          "awardedMarks": 0,
          "rationale": "سبب التقييم",
          "source": "AI_PROPOSAL"
        }
      ],
      "reasoning": "شرح موجز للتقييم",
      "confidence": 0.8,
      "uncertaintyFlags": [],
      "evidenceReferences": []
    }
  ]
}

重要: استخدم examQuestionId كالفهرس (index) بدلاً من UUID.`;
  }
}
