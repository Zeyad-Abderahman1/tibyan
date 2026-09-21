import * as crypto from 'node:crypto';
import {
  type ExamDto,
  type ConfirmAssemblyInput,
  type AssemblyPreviewResult,
  ExamBlueprintSchema,
  ConfirmAssemblyInputSchema,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  type SystemDrizzle,
  ExamRepository,
  AcademicAuditRepository,
  QuestionRepository,
} from '@tibyan/db';
import { validateExamBlueprint, selectBalancedQuestions } from './exam-balancer.js';
import { buildExamVariants } from './exam-variants.js';
import { ExamLayoutEngine } from './exam-layout-engine.js';
import { requirePermission } from '../auth/permissions.js';
import { type AuthActor } from '../sources/pdf-source.service.js';
import { renderMathToStaticHtml } from './katex-renderer.js';

export class ExamService {
  private readonly examRepo: ExamRepository;
  private readonly academicAuditRepo: AcademicAuditRepository;
  private readonly questionRepo: QuestionRepository;

  constructor(
    academicDb: AcademicDrizzle,
    systemDb: SystemDrizzle
  ) {
    this.examRepo = new ExamRepository(academicDb);
    this.academicAuditRepo = new AcademicAuditRepository(academicDb);
    this.questionRepo = new QuestionRepository(systemDb);
  }


  /**
   * Deterministically validates blueprint against current Question Bank
   * and previews balanced selection. No AI, no mutations.
   */
  previewAssembly(blueprintInput: unknown): AssemblyPreviewResult {
    const blueprint = ExamBlueprintSchema.parse(blueprintInput);

    // Retrieve active questions from System DB
    const allQuestions = this.questionRepo.list({ status: 'ACTIVE' });
    const candidates = allQuestions.map((q) => {
      const curriculumTags = this.questionRepo.getCurriculumTagIds(q.id);
      const sourceRefs = this.questionRepo.getSourceReferences(q.id);
      return {
        id: q.id,
        questionType: q.questionType,
        difficulty: q.difficulty,
        defaultMarks: q.defaultMarks,
        curriculumTags,
        sourceReferenceIds: sourceRefs.map((r) => r.sourceReferenceId),
        body: JSON.parse(q.bodyJson),
        modelAnswer: q.modelAnswerJson ? JSON.parse(q.modelAnswerJson) : null,
      };
    });

    const validation = validateExamBlueprint(blueprint, candidates);
    if (!validation.valid) {
      return {
        valid: false,
        conflicts: validation.conflicts,
        selectedQuestions: [],
        totalSelectedMarks: 0,
        totalSelectedQuestions: 0,
      };
    }

    const { selected } = selectBalancedQuestions(blueprint, candidates);
    const selectedQuestions = selected.map((q) => ({
      questionId: q.id,
      marks: q.defaultMarks,
      curriculumNodeIds: q.curriculumTags,
      sourceReferenceIds: q.sourceReferenceIds,
      questionType: q.questionType,
      difficulty: q.difficulty,
      body: q.body,
      modelAnswer: q.modelAnswer,
    }));

    return {
      valid: true,
      conflicts: [],
      selectedQuestions,
      totalSelectedMarks: selectedQuestions.reduce((s, q) => s + q.marks, 0),
      totalSelectedQuestions: selectedQuestions.length,
    };
  }

  /**
   * Explicit teacher confirmation of an assembled exam.
   * Generates deterministic variants A/B/C/D, creates Academic DB snapshot,
   * writes academic audit log.
   */
  confirmAssembly(input: ConfirmAssemblyInput, actor: AuthActor): ExamDto {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const validated = ConfirmAssemblyInputSchema.parse(input);

    const examId = crypto.randomUUID();
    const sectionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const questionsSnapshot = validated.placements.map((p, idx) => ({
      id: crypto.randomUUID(),
      examSectionId: sectionId,
      questionIdSnapshot: p.questionId ?? null,
      provenance: p.provenance,
      contentJson: JSON.stringify(p.body),
      answerJson: p.modelAnswer ? JSON.stringify(p.modelAnswer) : null,
      curriculumNodeIdsJson: JSON.stringify(p.curriculumNodeIds),
      sourceReferenceIdsJson: JSON.stringify(p.sourceReferenceIds),
      marks: p.marks,
      answerSpaceLines: p.answerSpaceLines,
      position: idx,
      createdAt: now,
    }));

    // Build deterministic variants A/B/C/D
    const variantInputs = questionsSnapshot.map((q) => ({
      id: q.id,
      marks: q.marks,
      answer: q.answerJson ? JSON.parse(q.answerJson) : null,
    }));
    const variants = buildExamVariants(variantInputs, validated.blueprint.variantCount);

    const versionsSnapshot = variants.map((v) => ({
      id: crypto.randomUUID(),
      examId,
      label: v.label,
      questionOrderJson: JSON.stringify(v.placementIds),
      answerKeyJson: JSON.stringify(v.answerKey),
      createdAt: now,
    }));

    this.examRepo.create({
      exam: {
        id: examId,
        title: validated.blueprint.title,
        blueprintJson: JSON.stringify(validated.blueprint),
        layoutJson: JSON.stringify({ pageSize: 'A4', orientation: 'PORTRAIT' }),
        status: 'CONFIRMED',
        createdAt: now,
        updatedAt: now,
      },
      sections: [
        {
          id: sectionId,
          examId,
          title: validated.sectionTitle,
          instructionsJson: JSON.stringify([]),
          position: 0,
          createdAt: now,
        },
      ],
      questions: questionsSnapshot,
      versions: versionsSnapshot,
    });

    // Write append-only Academic Audit record
    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'CONFIRM_EXAM_ASSEMBLY',
      entityType: 'EXAM',
      entityId: examId,
      afterJson: JSON.stringify({
        examId,
        title: validated.blueprint.title,
        questionCount: questionsSnapshot.length,
        totalMarks: questionsSnapshot.reduce((s, q) => s + q.marks, 0),
        variantCount: versionsSnapshot.length,
      }),
      createdAt: now,
    });

    const snapshot = this.examRepo.findSnapshot(examId);
    if (!snapshot) {
      throw new Error(`Failed to retrieve confirmed exam snapshot for: ${examId}`);
    }

    return this.mapSnapshotToDto(snapshot);
  }

  /**
   * Reverses the latest exam creation if it was the last mutation on this exam.
   */
  undoLastMutation(examId: string, actor: AuthActor): void {
    requirePermission(actor.role, actor.permissions ?? [], 'GROUPS_WRITE');
    const recentAudit = this.academicAuditRepo.findByEntity('EXAM', examId);
    if (recentAudit.length === 0) {
      throw new Error('لا توجد عمليات قابلة للتراجع لهذا الاختبار');
    }

    const latest = recentAudit[0]!;
    if (latest.action !== 'CONFIRM_EXAM_ASSEMBLY') {
      throw new Error('آخر عملية على هذا الاختبار غير قابلة للتراجع التلقائي');
    }

    const now = new Date().toISOString();
    this.examRepo.delete(examId);

    this.academicAuditRepo.insert({
      id: crypto.randomUUID(),
      actorType: actor.userId ? 'USER' : 'SYSTEM',
      actorUserId: actor.userId ?? null,
      actorNameSnapshot: actor.fullName,
      action: 'UNDO_CONFIRM_EXAM_ASSEMBLY',
      entityType: 'EXAM',
      entityId: examId,
      beforeJson: latest.afterJson,
      createdAt: now,
    });
  }

  getExam(examId: string): ExamDto | null {
    const snapshot = this.examRepo.findSnapshot(examId);
    if (!snapshot) return null;
    return this.mapSnapshotToDto(snapshot);
  }

  listExams(): ExamDto[] {
    const all = this.examRepo.list();
    return all.map((row) => {
      const snapshot = this.examRepo.findSnapshot(row.id);
      if (!snapshot) {
        return {
          id: row.id,
          title: row.title,
          blueprint: JSON.parse(row.blueprintJson),
          status: row.status as any,
          sections: [],
          placements: [],
          versions: [],
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      }
      return this.mapSnapshotToDto(snapshot);
    });
  }

  private mapSnapshotToDto(snapshot: NonNullable<ReturnType<ExamRepository['findSnapshot']>>): ExamDto {
    return {
      id: snapshot.exam.id,
      title: snapshot.exam.title,
      blueprint: JSON.parse(snapshot.exam.blueprintJson),
      status: snapshot.exam.status as any,
      sections: snapshot.sections.map((s) => ({
        id: s.id,
        examId: s.examId,
        title: s.title,
        instructionsJson: s.instructionsJson,
        position: s.position,
        createdAt: s.createdAt,
      })),
      placements: snapshot.questions.map((q) => ({
        id: q.id,
        examSectionId: q.examSectionId,
        questionId: q.questionIdSnapshot ?? undefined,
        provenance: q.provenance as any,
        body: JSON.parse(q.contentJson),
        modelAnswer: q.answerJson ? JSON.parse(q.answerJson) : null,
        marks: q.marks,
        answerSpaceLines: q.answerSpaceLines,
        curriculumNodeIds: JSON.parse(q.curriculumNodeIdsJson),
        sourceReferenceIds: JSON.parse(q.sourceReferenceIdsJson),
        position: q.position,
      })),
      versions: snapshot.versions.map((v) => ({
        id: v.id,
        examId: v.examId,
        label: v.label as any,
        questionOrder: JSON.parse(v.questionOrderJson),
        answerKey: JSON.parse(v.answerKeyJson),
        createdAt: v.createdAt,
      })),
      createdAt: snapshot.exam.createdAt,
      updatedAt: snapshot.exam.updatedAt,
    };
  }

  /**
   * Renders professional A4 printable HTML for student, teacher, or answer key.
   * Supports deterministic version ordering A/B/C/D if versionLabel is requested.
   */
  renderPrintableHtml(
    examId: string,
    kind: 'STUDENT' | 'TEACHER' | 'ANSWER_KEY',
    versionLabel?: 'A' | 'B' | 'C' | 'D'
  ): string {
    const snapshot = this.examRepo.findSnapshot(examId);
    if (!snapshot) {
      throw new Error(`الاختبار غير موجود: ${examId}`);
    }

    const dto = this.mapSnapshotToDto(snapshot);
    const layoutEngine = new ExamLayoutEngine();

    // Map content blocks to offline HTML fragments
    const blockToHtml = (block: any): string => {
      if (block.type === 'text') {
        const text = String(block.content ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<span class="text-block" dir="${block.direction ?? 'auto'}">${text}</span>`;
      }
      if (block.type === 'math') {
        const latex = String(block.latex ?? '');
        const isBlock = block.displayMode === 'block';
        return renderMathToStaticHtml(latex, isBlock);
      }
      if (block.type === 'geometry' && block.svgPayload) {
        return `<div class="geometry-container">${block.svgPayload}</div>`;
      }
      return '';
    };

    const docToHtml = (doc: any): string => {
      if (!doc || !Array.isArray(doc.blocks)) return '';
      return doc.blocks.map(blockToHtml).join(' ');
    };

    // If a specific version is requested, reorder questions accordingly
    let placementOrder = dto.placements;
    if (versionLabel) {
      const version = dto.versions.find((v) => v.label === versionLabel);
      if (version) {
        const placementMap = new Map(dto.placements.map((p) => [p.id, p]));
        const ordered = version.questionOrder
          .map((id) => placementMap.get(id))
          .filter((p): p is typeof dto.placements[number] => Boolean(p));
        if (ordered.length > 0) {
          placementOrder = ordered;
        }
      }
    }

    const printableExam = {
      title: `${dto.title}${versionLabel ? ` - نموذج (${versionLabel})` : ''}`,
      durationMinutes: dto.blueprint.durationMinutes,
      totalMarks: dto.blueprint.totalMarks,
      sections: dto.sections.map((section) => ({
        title: section.title,
        instructions: 'أجب عن جميع الأسئلة الآتية:',
        questions: placementOrder
          .filter((p) => !p.examSectionId || p.examSectionId === section.id)
          .map((p, idx) => ({
            number: idx + 1,
            marks: p.marks,
            bodyHtml: docToHtml(p.body),
            answerHtml: p.modelAnswer ? docToHtml(p.modelAnswer) : null,
            answerSpaceLines: p.answerSpaceLines,
          })),
      })),
    };

    return layoutEngine.render(printableExam, kind);
  }
}

