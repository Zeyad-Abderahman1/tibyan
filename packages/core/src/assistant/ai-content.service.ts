import type { SourceDocumentDto } from '@tibyan/contracts';

export interface ContentGenerationRequest {
  sourceDocumentId: string;
  scope?: string;
  options?: Record<string, unknown>;
}

export interface GeneratedContent {
  type: 'review' | 'notes' | 'slides' | 'exam';
  title: string;
  content: string;
  sourceDocumentId: string;
  generatedAt: string;
}

export interface AiContentProvider {
  generate(prompt: string): Promise<string>;
}

export class AiContentService {
  constructor(
    private readonly aiProvider: AiContentProvider,
    private readonly getDocument: (id: string) => SourceDocumentDto
  ) {}

  async generateReview(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const source = this.getDocument(request.sourceDocumentId);
    const prompt = this.buildReviewPrompt(source, request.scope);
    const result = await this.aiProvider.generate(prompt);
    return {
      type: 'review',
      title: `مراجعة - ${source.title}`,
      content: result,
      sourceDocumentId: request.sourceDocumentId,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateNotes(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const source = this.getDocument(request.sourceDocumentId);
    const prompt = this.buildNotesPrompt(source, request.scope);
    const result = await this.aiProvider.generate(prompt);
    return {
      type: 'notes',
      title: `مذكرة - ${source.title}`,
      content: result,
      sourceDocumentId: request.sourceDocumentId,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateSlides(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const source = this.getDocument(request.sourceDocumentId);
    const prompt = this.buildSlidesPrompt(source, request.scope);
    const result = await this.aiProvider.generate(prompt);
    return {
      type: 'slides',
      title: `شرائح - ${source.title}`,
      content: result,
      sourceDocumentId: request.sourceDocumentId,
      generatedAt: new Date().toISOString(),
    };
  }

  async generateExamFromSource(
    request: ContentGenerationRequest,
    config: { questionCount?: number; difficulty?: string; types?: string[] } = {}
  ): Promise<GeneratedContent> {
    const source = this.getDocument(request.sourceDocumentId);
    const prompt = this.buildExamPrompt(source, request.scope, config);
    const result = await this.aiProvider.generate(prompt);
    return {
      type: 'exam',
      title: `اختبار - ${source.title}`,
      content: result,
      sourceDocumentId: request.sourceDocumentId,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildReviewPrompt(source: SourceDocumentDto, scope?: string): string {
    return `أنشئ مواد مراجعة منهجية للمنهج التالي:
العنوان: ${source.title}
${source.gradeLevel ? `المرحلة: ${source.gradeLevel}` : ''}
${source.subject ? `المادة: ${source.subject}` : ''}
${scope ? `النطاق: ${scope}` : ''}

قدم مراجعة تحتوي على:
1. المفاهيم الرئيسية
2. ملخصات موجزة
3. معادلات مهمة (إن وجدت)
4. أسئلة تدريبية

الرجاء الرد بصيغة JSON.`;
  }

  private buildNotesPrompt(source: SourceDocumentDto, scope?: string): string {
    return `أنشئ مذكرة دراسية للمنهج التالي:
العنوان: ${source.title}
${source.gradeLevel ? `المرحلة: ${source.gradeLevel}` : ''}
${source.subject ? `المادة: ${source.subject}` : ''}
${scope ? `النطاق: ${scope}` : ''}

المذكرة يجب أن تحتوي على:
1. عناوين وأقسام
2. محتوى تعليمي شرح
3. أمثلة تطبيقية
4. ملخص في النهاية

الرجاء الرد بصيغة JSON.`;
  }

  private buildSlidesPrompt(source: SourceDocumentDto, scope?: string): string {
    return `أنشئ عرضاً تعليمياً (شرائح) للمنهج التالي:
العنوان: ${source.title}
${source.gradeLevel ? `المرحلة: ${source.gradeLevel}` : ''}
${source.subject ? `المادة: ${source.subject}` : ''}
${scope ? `النطاق: ${scope}` : ''}

العرض يجب أن يحتوي على:
1. شريحة العنوان
2. شرائح المحتوى (5-10 شرائح)
3. شريحة الملخص
4. شريحة التدريب

لكل شريحة: عنوان + محتوى + ملاحظات المتحدث.
الرجاء الرد بصيغة JSON.`;
  }

  private buildExamPrompt(
    source: SourceDocumentDto,
    scope: string | undefined,
    config: { questionCount?: number; difficulty?: string; types?: string[] }
  ): string {
    const questionCount = config.questionCount || 10;
    const difficulty = config.difficulty || 'متوسط';
    const types = config.types?.join('، ') || 'اختيار من متعدد، أسئلة قصيرة';

    return `أنشئ اختباراً للمنهج التالي:
العنوان: ${source.title}
${source.gradeLevel ? `المرحلة: ${source.gradeLevel}` : ''}
${source.subject ? `المادة: ${source.subject}` : ''}
${scope ? `النطاق: ${scope}` : ''}

عدد الأسئلة: ${questionCount}
مستوى الصعوبة: ${difficulty}
أنواع الأسئلة: ${types}

لكل سؤال: النص + الإجابة الصحيحة + الشرح.
الرجاء الرد بصيغة JSON.`;
  }
}
