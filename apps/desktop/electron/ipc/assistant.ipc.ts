import { ipcMain, type BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  IPC_CHANNELS,
  SendMessageInputSchema,
  CreateSessionInputSchema,
  ConfirmationInputSchema,
  UndoInputSchema,
  UploadAssistantAttachmentInputSchema,
  type AssistantAttachmentDto,
  GRADE_LEVEL_DEFINITIONS,
  EDUCATION_SYSTEM_DEFINITIONS,
  LANGUAGE_TRACK_DEFINITIONS,
  MATH_BRANCH_DEFINITIONS,
} from '@tibyan/contracts';
import { SlideService, AssistantOrchestrator, StudentImportService } from '@tibyan/core';
import type { Runtime } from '../runtime.js';
import { safeIpcCall } from './errors.js';
import { validateIpcSender } from '../security.js';
import { archiveLessonPlanWithUndo, undoArchivedLessonPlan } from './assistant-lesson-plan-undo.js';

interface StoredAttachment {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
  createdAt: number;
}

export const attachmentStore = new Map<string, StoredAttachment>();

interface CachedPreviewRows {
  previewId: string;
  rows: any[];
  fileName?: string;
  createdAt: number;
}

export const previewRowsCache = new Map<string, CachedPreviewRows>();

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
function cleanupExpiredState() {
  const now = Date.now();
  for (const [id, item] of attachmentStore.entries()) {
    if (now - item.createdAt > TWO_HOURS_MS) {
      attachmentStore.delete(id);
    }
  }
  for (const [id, item] of previewRowsCache.entries()) {
    if (now - item.createdAt > TWO_HOURS_MS) {
      previewRowsCache.delete(id);
    }
  }
}

export function getOrchestrator(runtime: Runtime): AssistantOrchestrator {
  if (!runtime.assistantOrchestrator) {
    runtime.assistantOrchestrator = new AssistantOrchestrator({
      systemDb: runtime.systemDb,
      geminiCredentialService: runtime.geminiCredentialService,
      getActiveAcademicYear: () =>
        runtime.activeAcademicYear
          ? { id: runtime.activeAcademicYear.id, name: runtime.activeAcademicYear.name }
          : null,
      resolveEntityLabel: async (scope: string, entityId: string) => {
        try {
          if (scope === 'student' && runtime.studentService) {
            const actor = runtime.requireAuthenticatedActor();
            const s = await runtime.studentService.getStudentById(entityId, actor);
            return s?.fullName ?? null;
          }
          if (scope === 'group' && runtime.groupService) {
            const actor = runtime.requireAuthenticatedActor();
            const g = await runtime.groupService.getGroupById(entityId, actor);
            return g?.name ?? null;
          }
          if (scope === 'exam' && runtime.examService) {
            const e = runtime.examService.getExam(entityId);
            return e?.title ?? null;
          }
          return null;
        } catch {
          return null;
        }
      },
      buildToolPreview: async (
        toolName: string,
        input: Record<string, unknown>,
        _ctx: import('@tibyan/core').ToolExecutionContext,
      ) => {
        const items: import('@tibyan/core').PreviewItem[] = [];

        if (toolName === 'create_student') {
          items.push({
            entityLabel: (input.fullName as string) ?? 'طالب جديد',
            changeKind: 'create',
            changes: [
              { field: 'fullName', label: 'الاسم الكامل', after: input.fullName },
              { field: 'phone', label: 'رقم الهاتف', after: input.phone },
            ],
          });
        } else if (toolName === 'update_student') {
          items.push({
            entityLabel: 'تحديث بيانات طالب',
            entityId: input.studentId as string,
            changeKind: 'update',
            changes: Object.entries(input)
              .filter(([k]) => k !== 'studentId')
              .map(([field, after]) => ({ field, label: field, after })),
          });
        } else if (toolName === 'create_group') {
          items.push({
            entityLabel: (input.name as string) ?? 'مجموعة جديدة',
            changeKind: 'create',
            changes: [
              { field: 'name', label: 'اسم المجموعة', after: input.name },
              ...(input.gradeLevel ? [{ field: 'gradeLevel', label: 'المرحلة / الصف', after: input.gradeLevel }] : []),
            ],
          });
        } else if (toolName === 'preview_student_import') {
          items.push({
            entityLabel: `معاينة استيراد ملف: ${(input.fileName as string) || 'ملف طلاب'}`,
            changeKind: 'create',
            changes: [{ field: 'fileName', label: 'اسم الملف', after: input.fileName }],
          });
        } else if (toolName === 'execute_student_import') {
          let rowsCount = 0;
          let previewFileName = '';
          if (input.previewId && typeof input.previewId === 'string') {
            const cached = previewRowsCache.get(input.previewId);
            if (cached) {
              const validRows = cached.rows.filter((r) => r.status === 'READY' || r.selected);
              rowsCount = validRows.length;
              previewFileName = cached.fileName ?? '';
            }
          }
          const rawArr = (input.approvedRows ?? input.rows) as unknown[] | undefined;
          if (rowsCount === 0 && Array.isArray(rawArr)) {
            rowsCount = rawArr.length;
          }
          items.push({
            entityLabel: `استيراد ${rowsCount} طالب صالح${previewFileName ? ` من ملف ${previewFileName}` : ''}`,
            changeKind: 'create',
            changes: [
              { field: 'count', label: 'عدد الطلاب الصالحين للاستيراد', after: rowsCount },
              ...(input.previewId ? [{ field: 'previewId', label: 'معرف المعاينة', after: input.previewId }] : []),
            ],
          });
        } else if (toolName === 'update_group') {
          items.push({
            entityLabel: 'تحديث مجموعة',
            entityId: input.groupId as string,
            changeKind: 'update',
            changes: Object.entries(input)
              .filter(([k]) => k !== 'groupId')
              .map(([field, after]) => ({ field, label: field, after })),
          });
        } else if (toolName === 'enroll_student') {
          items.push({
            entityLabel: 'تسجيل طالب في مجموعة',
            changeKind: 'create',
            changes: [
              { field: 'studentId', label: 'الطالب', after: input.studentId },
              { field: 'groupId', label: 'المجموعة', after: input.groupId },
            ],
          });
        } else if (toolName === 'end_enrollment') {
          items.push({
            entityLabel: 'إنهاء تسجيل',
            changeKind: 'delete',
            changes: [{ field: 'enrollmentId', label: 'التسجيل', after: input.enrollmentId }],
            irreversible: true,
          });
        } else if (toolName === 'reschedule_session') {
          items.push({
            entityLabel: 'إعادة جدولة حصة',
            entityId: input.sessionId as string,
            changeKind: 'update',
            changes: [
              { field: 'newDate', label: 'الموعد الجديد', after: input.newDate },
              { field: 'newStartTime', label: 'وقت البدء', after: input.newStartTime },
            ],
          });
        } else if (toolName === 'cancel_session') {
          items.push({
            entityLabel: 'إلغاء حصة',
            entityId: input.sessionId as string,
            changeKind: 'update',
            changes: [{ field: 'reason', label: 'سبب الإلغاء', after: input.reason }],
          });
        } else if (toolName === 'complete_session') {
          items.push({
            entityLabel: 'إتمام حصة',
            entityId: input.sessionId as string,
            changeKind: 'update',
            changes: [{ field: 'status', label: 'الحالة', after: 'COMPLETED' }],
          });
        } else if (toolName === 'create_lesson_plan') {
          items.push({
            entityLabel: (input.title as string) ?? 'خطة درس جديدة',
            changeKind: 'create',
            changes: [{ field: 'title', label: 'العنوان', after: input.title }],
          });
        } else if (toolName === 'update_lesson_plan') {
          items.push({
            entityLabel: 'تحديث خطة درس',
            entityId: input.planId as string,
            changeKind: 'update',
            changes: Object.entries(input)
              .filter(([k]) => k !== 'planId')
              .map(([field, after]) => ({ field, label: field, after })),
          });
        } else if (toolName === 'archive_lesson_plan') {
          items.push({
            entityLabel: 'أرشفة خطة درس',
            entityId: input.planId as string,
            changeKind: 'update',
            changes: [{ field: 'status', label: 'الحالة', after: 'ARCHIVED' }],
          });
        } else if (toolName === 'create_slide_deck') {
          items.push({
            entityLabel: (input.title as string) ?? 'عرض شرائح جديد',
            changeKind: 'create',
            changes: [{ field: 'title', label: 'العنوان', after: input.title }],
          });
        } else if (toolName === 'delete_slide') {
          items.push({
            entityLabel: 'حذف شريحة',
            entityId: input.slideId as string,
            changeKind: 'delete',
            changes: [],
            irreversible: true,
          });
        } else if (toolName === 'record_payment') {
          items.push({
            entityLabel: 'تسجيل دفعة مالية',
            changeKind: 'create',
            changes: [
              { field: 'studentId', label: 'الطالب', after: input.studentId },
              { field: 'amount', label: 'المبلغ', after: input.amount },
            ],
          });
        } else if (toolName === 'create_invoice') {
          items.push({
            entityLabel: 'إصدار فاتورة',
            changeKind: 'create',
            changes: [
              { field: 'studentId', label: 'الطالب', after: input.studentId },
              { field: 'amount', label: 'المبلغ', after: input.amount },
            ],
          });
        } else if (toolName === 'apply_discount') {
          items.push({
            entityLabel: 'تطبيق خصم',
            changeKind: 'create',
            changes: [
              { field: 'studentId', label: 'الطالب', after: input.studentId },
              { field: 'percentage', label: 'النسبة', after: input.percentage },
            ],
          });
        } else if (toolName === 'override_grading_decision') {
          items.push({
            entityLabel: 'تعديل درجة سؤال',
            changeKind: 'update',
            changes: [
              { field: 'questionId', label: 'السؤال', after: input.questionId },
              { field: 'score', label: 'الدرجة الجديدة', after: input.score },
            ],
          });
        } else if (toolName === 'finalize_grading') {
          items.push({
            entityLabel: 'اعتماد نتائج التصحيح النهائية',
            entityId: input.submissionId as string,
            changeKind: 'update',
            changes: [{ field: 'status', label: 'الحالة', after: 'FINALIZED' }],
            irreversible: true,
          });
        } else {
          items.push({
            entityLabel: toolName,
            changeKind: 'update',
            changes: [],
          });
        }
        return items;
      },
      executeTool: async (
        toolName: string,
        input: Record<string, unknown>,
        ctx: import('@tibyan/core').ToolExecutionContext,
      ) => {
        const actor = {
          userId: ctx.actorUserId,
          fullName: ctx.actorName,
          role: ctx.actorRole as any,
          permissions: ctx.permissions as any[],
        };
        try {
          // ─── Students ───────────────────────────────────────────────────
          if (toolName === 'find_students' && runtime.studentService) {
            const result = await runtime.studentService.searchStudents({ searchQuery: (input.query as string) ?? '' }, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_student_details' && runtime.studentService) {
            const result = await runtime.studentService.getStudentById(input.studentId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'list_student_notes' && runtime.studentService) {
            const result = await runtime.studentService.listStudentNotes(input.studentId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_student_status' && runtime.studentService) {
            const student = await runtime.studentService.getStudentById(input.studentId as string, actor);
            return { success: true, data: { studentId: input.studentId, status: student?.status ?? 'UNKNOWN' } };
          }
          if (toolName === 'create_student' && runtime.studentService) {
            const result = await runtime.studentService.createStudent(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'create_student', studentId: result.id },
            };
          }
          if (toolName === 'update_student' && runtime.studentService) {
            const prev = await runtime.studentService.getStudentById(input.studentId as string, actor);
            const { studentId, ...rest } = input;
            const result = await runtime.studentService.updateStudent({ studentId: studentId as string, ...rest } as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'update_student', studentId, previousData: prev },
            };
          }
          if (toolName === 'add_student_note' && runtime.studentService) {
            const result = await runtime.studentService.addStudentNote(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'add_student_note', studentId: input.studentId, noteId: result.id },
            };
          }
          if (toolName === 'preview_student_import' && runtime.academicDb) {
            const service = new StudentImportService(runtime.academicDb.db);
            let buffer: Buffer | undefined;
            let fileName = (input.fileName as string) || 'students.xlsx';

            if (input.attachmentId && typeof input.attachmentId === 'string') {
              const att = attachmentStore.get(input.attachmentId);
              if (att) {
                buffer = att.buffer;
                fileName = att.fileName;
              } else {
                return { success: false, error: 'المرفق غير موجود أو انتهت صلاحيته' };
              }
            } else if (input.fileContentBase64) {
              buffer = Buffer.from(input.fileContentBase64 as string, 'base64');
            } else if (input.filePath && typeof input.filePath === 'string') {
              buffer = fs.readFileSync(input.filePath);
            }

            if (!buffer) {
              return { success: false, error: 'محتوى الملف مفقود' };
            }

            const sheetName = typeof input.sheetName === 'string' && input.sheetName.trim().length > 0
              ? input.sheetName.trim()
              : undefined;

            const preview = await service.parseAndPreview(buffer, fileName, sheetName);
            const previewId = crypto.randomUUID();
            previewRowsCache.set(previewId, {
              previewId,
              rows: preview.rows,
              fileName,
              createdAt: Date.now(),
            });

            return {
              success: true,
              data: {
                previewId,
                fileName: preview.fileName,
                sheetName: preview.sheetName,
                availableSheets: preview.availableSheets,
                totalRows: preview.totalRows,
                validCount: preview.validCount,
                duplicateCount: preview.duplicateCount,
                warningCount: preview.warningCount,
                invalidCount: preview.invalidCount,
                rows: preview.rows,
              },
            };
          }
          if (toolName === 'execute_student_import' && runtime.academicDb) {
            const service = new StudentImportService(runtime.academicDb.db);
            let rawRows: any[] = [];
            if (input.previewId && typeof input.previewId === 'string') {
              const cached = previewRowsCache.get(input.previewId);
              if (cached) {
                rawRows = cached.rows.filter((r: any) => r.status === 'READY' || r.selected);
              }
            }
            if (rawRows.length === 0 && Array.isArray(input.approvedRows ?? input.rows)) {
              rawRows = (input.approvedRows ?? input.rows) as any[];
            }
            if (rawRows.length === 0) {
              return { success: false, error: 'لا توجد بيانات طلاب صالحة للاستيراد من المعاينة' };
            }
            const result = await service.executeImport({ rows: rawRows }, actor);
            return {
              success: result.importedCount > 0 || (result.skippedCount > 0 && result.failedCount === 0),
              data: result,
              undoSnapshot: { kind: 'import_students', studentIds: result.importedStudentIds },
            };
          }

          // ─── Groups ─────────────────────────────────────────────────────
          if (toolName === 'list_groups' && runtime.groupService) {
            const result = await runtime.groupService.listGroups({}, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_group_details' && runtime.groupService) {
            const result = await runtime.groupService.getGroupById(input.groupId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_group_schedule' && runtime.groupService) {
            const slots = await runtime.groupService.listWeeklySchedule(input.groupId as string, actor);
            return { success: true, data: { groupId: input.groupId, scheduleSlots: slots } };
          }
          if (toolName === 'get_group_enrollments' && runtime.enrollmentService) {
            const result = await runtime.enrollmentService.listGroupEnrollments(input.groupId as string, false, actor);
            return { success: true, data: result };
          }
          if (toolName === 'create_group' && runtime.groupService) {
            // Check if group already exists to prevent duplicate creation
            const existingGroups = await runtime.groupService.listGroups({ status: 'ACTIVE' }, actor);
            const groupName = String(input.name ?? '').trim();
            const existing = existingGroups.find((g) => g.name.trim().toLowerCase() === groupName.toLowerCase());
            if (existing) {
              return {
                success: true,
                data: {
                  ...existing,
                  alreadyExists: true,
                  skipped: true,
                  message: `المجموعة '${existing.name}' موجودة بالفعل في النظام، تم تخطي تكرارها.`,
                },
              };
            }

            // Resolve gradeLevel if needed
            let gradeLevel = input.gradeLevel as any;
            if (!gradeLevel || !GRADE_LEVEL_DEFINITIONS.some((g) => g.code === gradeLevel)) {
              const match = GRADE_LEVEL_DEFINITIONS.find(
                (g) =>
                  g.nameAr === groupName ||
                  g.code === gradeLevel ||
                  groupName.includes(g.nameAr) ||
                  (typeof gradeLevel === 'string' && g.nameAr.includes(gradeLevel))
              );
              gradeLevel = match ? match.code : 'SEC_1';
            }

            const payload: any = {
              name: groupName,
              educationSystem: input.educationSystem ?? 'GENERAL',
              gradeLevel,
              languageTrack: input.languageTrack ?? 'ARABIC',
              focusMathBranch: input.focusMathBranch ?? null,
              defaultPaymentType: input.defaultPaymentType ?? 'MONTHLY',
              defaultPaymentAmount: Number(input.defaultPaymentAmount ?? 0),
              schedules: Array.isArray(input.schedules) ? input.schedules : [],
            };

            const result = await runtime.groupService.createGroup(payload, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'create_group', groupId: result.id },
            };
          }
          if (toolName === 'update_group' && runtime.groupService) {
            const prev = await runtime.groupService.getGroupById(input.groupId as string, actor);
            const { groupId, ...rest } = input;
            const result = await runtime.groupService.updateGroup({ groupId: groupId as string, ...rest } as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'update_group', groupId, previousData: prev },
            };
          }
          if (toolName === 'set_group_schedule' && runtime.groupService) {
            const prev = await runtime.groupService.getGroupById(input.groupId as string, actor);
            const result = await runtime.groupService.setWeeklySchedule(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'set_group_schedule', groupId: input.groupId, previousData: prev },
            };
          }
          if (toolName === 'enroll_student' && runtime.enrollmentService) {
            const result = await runtime.enrollmentService.enrollStudent(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'enroll_student', enrollmentId: result.id },
            };
          }
          if (toolName === 'end_enrollment' && runtime.enrollmentService) {
            const result = await runtime.enrollmentService.endEnrollment(input as any, actor);
            return { success: true, data: result };
          }

          // ─── Sessions ───────────────────────────────────────────────────
          if (toolName === 'get_today_sessions' && runtime.sessionService) {
            const today = new Date().toISOString().split('T')[0]!;
            const result = await runtime.sessionService.listSessionsForDateRange({ startDate: today, endDate: today }, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_date_range_sessions' && runtime.sessionService) {
            const result = await runtime.sessionService.listSessionsForDateRange(
              {
                startDate: input.startDate as string,
                endDate: input.endDate as string,
                groupId: input.groupId as string | undefined,
              },
              actor,
            );
            return { success: true, data: result };
          }
          if (toolName === 'get_session_details' && runtime.sessionService) {
            const result = await runtime.sessionService.getSessionById(input.sessionId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'reschedule_session' && runtime.sessionService) {
            const prev = await runtime.sessionService.getSessionById(input.sessionId as string, actor);
            const result = await runtime.sessionService.rescheduleSession(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'reschedule_session', sessionId: input.sessionId, previousData: prev },
            };
          }
          if (toolName === 'cancel_session' && runtime.sessionService) {
            const prev = await runtime.sessionService.getSessionById(input.sessionId as string, actor);
            const result = await runtime.sessionService.cancelSession(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'cancel_session', sessionId: input.sessionId, previousData: prev },
            };
          }
          if (toolName === 'complete_session' && runtime.attendanceService) {
            const result = await runtime.attendanceService.completeSession(input as any, actor);
            return { success: true, data: result };
          }

          // ─── Attendance ─────────────────────────────────────────────────
          if (toolName === 'get_session_attendance' && runtime.attendanceService) {
            const result = await runtime.attendanceService.getSessionRoster(input.sessionId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_student_attendance' && runtime.attendanceService) {
            const result = runtime.attendanceService.attendanceRepo.listByStudentId(input.studentId as string, (input.limit as number) ?? 50);
            return { success: true, data: result };
          }
          if (toolName === 'get_attendance_summary' && runtime.attendanceService) {
            if (input.sessionId) {
              const summary = runtime.attendanceService.attendanceRepo.countByStatusForSession(input.sessionId as string);
              return { success: true, data: summary };
            }
            const today = new Date().toISOString().split('T')[0]!;
            const result = await runtime.attendanceService.getEndOfDayFollowUp(today, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_attendance_follow_up' && runtime.attendanceService) {
            const result = await runtime.attendanceService.getEndOfDayFollowUp((input.date as string) ?? new Date().toISOString().split('T')[0]!, actor);
            return { success: true, data: result };
          }
          if (toolName === 'record_attendance' && runtime.attendanceService) {
            const result = await runtime.attendanceService.recordAttendance(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'record_attendance', recordId: result.id, input },
            };
          }
          if (toolName === 'batch_record_attendance' && runtime.attendanceService) {
            const result = await runtime.attendanceService.batchRecordAttendance(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'update_follow_up_status' && runtime.attendanceService) {
            const result = await runtime.attendanceService.updateFollowUpStatus(input as any, actor);
            return { success: true, data: result };
          }

          // ─── Curriculum ─────────────────────────────────────────────────
          if (toolName === 'list_curriculum_documents' && runtime.curriculumService) {
            const result = runtime.curriculumService.listCatalogs({}, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_curriculum_metadata' && runtime.curriculumService) {
            const result = runtime.curriculumService.getCatalog(input.catalogId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_curriculum_tree' && runtime.curriculumService) {
            const result = runtime.curriculumService.getTree(input.catalogId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'get_group_curriculum_progress' && runtime.curriculumService) {
            const result = runtime.curriculumService.getGroupOverview(input.groupId as string, actor);
            return { success: true, data: result };
          }
          if (toolName === 'list_curriculum_source_documents' && runtime.pdfSourceService) {
            const result = runtime.pdfSourceService.listSources(input.catalogId as string | undefined);
            return { success: true, data: result };
          }
          if (toolName === 'assign_group_curriculum' && runtime.curriculumService) {
            const result = runtime.curriculumService.assignGroupCatalog(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'assign_group_curriculum', groupId: input.groupId },
            };
          }
          if (toolName === 'update_group_curriculum_progress' && runtime.curriculumService) {
            const result = runtime.curriculumService.updateGroupNodeProgress(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'update_group_curriculum_progress', groupId: input.groupId, nodeId: input.nodeId },
            };
          }

          // ─── Question Bank ──────────────────────────────────────────────
          if (toolName === 'list_questions' && runtime.questionBankService) {
            const result = runtime.questionBankService.listQuestions(input as any);
            return { success: true, data: result };
          }
          if (toolName === 'get_question_details' && runtime.questionBankService) {
            const result = runtime.questionBankService.getQuestion(input.questionId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_question_bank_stats' && runtime.questionBankService) {
            const questions = runtime.questionBankService.listQuestions();
            const byType: Record<string, number> = {};
            for (const q of questions) {
              byType[q.questionType] = (byType[q.questionType] ?? 0) + 1;
            }
            return { success: true, data: { totalQuestions: questions.length, byType } };
          }

          // ─── Exams ──────────────────────────────────────────────────────
          if (toolName === 'list_exams' && runtime.examService) {
            const result = runtime.examService.listExams();
            return { success: true, data: result };
          }
          if (toolName === 'get_exam_details' && runtime.examService) {
            const result = runtime.examService.getExam(input.examId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_exam_structure' && runtime.examService) {
            const result = runtime.examService.getExam(input.examId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_exam_source_provenance' && runtime.examService) {
            const exam = runtime.examService.getExam(input.examId as string);
            return { success: true, data: { examId: input.examId, blueprint: exam?.blueprint } };
          }
          if (toolName === 'list_exam_variants' && runtime.examService) {
            const exam = runtime.examService.getExam(input.examId as string);
            return {
              success: true,
              data: {
                examId: input.examId,
                examTitle: exam?.title ?? '',
                variants: exam?.versions ?? [],
                total: exam?.versions?.length ?? 0,
              },
            };
          }

          // ─── Slides ─────────────────────────────────────────────────────
          if (toolName === 'list_slide_decks' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.listDecks();
            return { success: true, data: result };
          }
          if (toolName === 'get_slide_deck' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.getDeck(input.deckId as string);
            return { success: true, data: result };
          }
          if (toolName === 'create_slide_deck' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.createDeck(input as any);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'create_slide_deck', deckId: result.id },
            };
          }
          if (toolName === 'update_slide_deck' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const prev = slideService.getDeck(input.deckId as string);
            const result = slideService.updateDeck(input.deckId as string, input as any);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'update_slide_deck', deckId: input.deckId, previousData: prev },
            };
          }
          if (toolName === 'add_slide_to_deck' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.addSlide(input as any);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'add_slide_to_deck', slideId: result.id },
            };
          }
          if (toolName === 'update_slide' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.updateSlide(input.slideId as string, input as any);
            return { success: true, data: result };
          }
          if (toolName === 'delete_slide' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            slideService.deleteSlide(input.slideId as string);
            return { success: true, data: { deleted: true } };
          }
          if (toolName === 'duplicate_slide' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.duplicateSlide(input.slideId as string);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'duplicate_slide', slideId: result.id },
            };
          }
          if (toolName === 'reorder_slides' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            slideService.reorderSlides(input as any);
            return { success: true, data: { success: true } };
          }
          if (toolName === 'add_block_to_slide' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.addBlock(input as any);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'add_block_to_slide', blockId: result.id },
            };
          }
          if (toolName === 'update_slide_block' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.updateBlock(input.blockId as string, input as any);
            return { success: true, data: result };
          }
          if (toolName === 'delete_slide_block' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            slideService.deleteBlock(input.blockId as string);
            return { success: true, data: { deleted: true } };
          }
          if (toolName === 'reorder_slide_blocks' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            slideService.reorderBlocks(input as any);
            return { success: true, data: { success: true } };
          }
          if (toolName === 'move_slide_block' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            const result = slideService.moveBlock(input as any);
            return { success: true, data: result };
          }

          // ─── Capture & Grading ──────────────────────────────────────────
          if (toolName === 'list_capture_sessions' && runtime.captureService) {
            const result = runtime.captureService.listSessions();
            return { success: true, data: result };
          }
          if (toolName === 'list_submissions' && runtime.captureService) {
            const result = runtime.captureService.listSubmissions(input.sessionId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_grading_status' && runtime.gradingService) {
            const result = runtime.gradingService.getSubmissionStatus(input.submissionId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_grading_decisions' && runtime.gradingService) {
            const result = runtime.gradingService.getDecisions(input.submissionId as string);
            return { success: true, data: result };
          }
          if (toolName === 'create_capture_session' && runtime.captureService) {
            const result = await runtime.captureService.createSession(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'create_capture_session', sessionId: result.id },
            };
          }
          if (toolName === 'associate_submission' && runtime.captureService) {
            const result = await runtime.captureService.associateSubmission(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'review_extracted_answer' && runtime.gradingService) {
            const result = await runtime.gradingService.reviewAnswer(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'override_grading_decision' && runtime.gradingService) {
            const result = await runtime.gradingService.overrideDecision(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'finalize_grading' && runtime.gradingService) {
            await runtime.gradingService.finalize(input as any, actor);
            return { success: true, data: { finalized: true } };
          }

          // ─── Analytics ──────────────────────────────────────────────────
          if (toolName === 'get_exam_analytics' && runtime.analyticsService) {
            const result = runtime.analyticsService.getExamSummary(input.examId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_score_distribution' && runtime.analyticsService) {
            const result = runtime.analyticsService.getScoreDistribution(input.examId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_question_performance' && runtime.analyticsService) {
            const result = runtime.analyticsService.getQuestionPerformance(input.examId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_skill_performance' && runtime.analyticsService) {
            const result = runtime.analyticsService.getSkillPerformance(input.examId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_student_results' && runtime.analyticsService) {
            const result = runtime.analyticsService.listStudentResults(input.examId as string);
            return { success: true, data: result };
          }

          // ─── Finance ────────────────────────────────────────────────────
          if (toolName === 'get_financial_summary' && runtime.financeService) {
            const result = await runtime.financeService.getStudentFinancialSummary(input.studentId as string);
            return { success: true, data: result };
          }
          if (toolName === 'get_finance_kpis' && runtime.financeService) {
            const result = await runtime.financeService.getOverallFinanceKpi();
            return { success: true, data: result };
          }
          if (toolName === 'list_payments' && runtime.financeService) {
            const result = await runtime.financeService.listStudentPayments(input.studentId as string);
            return { success: true, data: result };
          }
          if (toolName === 'list_invoices' && runtime.financeService) {
            const result = input.studentId
              ? runtime.financeService.invoiceRepo.listByStudent(input.studentId as string)
              : runtime.financeService.invoiceRepo.listAll();
            return { success: true, data: result };
          }
          if (toolName === 'list_discounts' && runtime.financeService) {
            const result = await runtime.financeService.listDiscounts(input.studentId as string);
            return { success: true, data: result };
          }
          if (toolName === 'record_payment' && runtime.financeService) {
            const result = await runtime.financeService.recordPayment(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'create_invoice' && runtime.financeService) {
            const result = await runtime.financeService.createInvoice(input as any, actor);
            return { success: true, data: result };
          }
          if (toolName === 'apply_discount' && runtime.financeService) {
            const result = await runtime.financeService.applyDiscount(input as any, actor);
            return { success: true, data: result };
          }

          // ─── Lesson Planning ────────────────────────────────────────────
          if (toolName === 'list_lesson_plans' && runtime.lessonPlannerService) {
            const result = runtime.lessonPlannerService.listLessonPlans();
            return { success: true, data: result };
          }
          if (toolName === 'get_lesson_plan_details' && runtime.lessonPlannerService) {
            const result = runtime.lessonPlannerService.getLessonPlanById(input.planId as string);
            return { success: true, data: result };
          }
          if (toolName === 'list_session_reflections' && runtime.sessionReflectionService) {
            const result = input.sessionId
              ? [await runtime.sessionReflectionService.getReflectionBySessionId(input.sessionId as string, actor)]
              : [];
            return { success: true, data: result };
          }
          if (toolName === 'create_lesson_plan' && runtime.lessonPlannerService) {
            const result = runtime.lessonPlannerService.createLessonPlan(input as any, actor);
            return {
              success: true,
              data: result,
              affectedEntities: [{ entityType: 'lesson-plan', entityId: result.id, label: result.title }],
              undoSnapshot: { kind: 'create_lesson_plan', planId: result.id },
            };
          }
          if (toolName === 'update_lesson_plan' && runtime.lessonPlannerService) {
            const prev = runtime.lessonPlannerService.getLessonPlanById(input.planId as string);
            const { planId, ...rest } = input;
            const result = runtime.lessonPlannerService.updateLessonPlan(planId as string, rest as any, actor);
            return {
              success: true,
              data: result,
              affectedEntities: [{ entityType: 'lesson-plan', entityId: result.id, label: result.title }],
              undoSnapshot: { kind: 'update_lesson_plan', planId, previousData: prev },
            };
          }
          if (toolName === 'archive_lesson_plan' && runtime.lessonPlannerService) {
            const { result, undoSnapshot } = archiveLessonPlanWithUndo(runtime.lessonPlannerService, input.planId as string, actor);
            return { success: true, data: result, undoSnapshot };
          }
          if (toolName === 'create_session_reflection' && runtime.sessionReflectionService) {
            const result = runtime.sessionReflectionService.createReflection(input as any, actor);
            return {
              success: true,
              data: result,
              undoSnapshot: { kind: 'create_session_reflection', reflectionId: result.id },
            };
          }

          // ─── System ─────────────────────────────────────────────────────
          if (toolName === 'get_dashboard_today' && runtime.dashboardService) {
            const result = await runtime.dashboardService.getTodayDashboard();
            return { success: true, data: result };
          }
          if (toolName === 'get_academic_year_info') {
            return {
              success: true,
              data: runtime.activeAcademicYear
                ? { id: runtime.activeAcademicYear.id, name: runtime.activeAcademicYear.name }
                : null,
            };
          }
          if (toolName === 'get_app_info') {
            return {
              success: true,
              data: {
                name: 'Tibyan',
                version: '1.0.0',
                status: 'ONLINE',
                hasActiveAcademicYear: Boolean(runtime.activeAcademicYear),
              },
            };
          }
          if (toolName === 'list_grade_levels') {
            return {
              success: true,
              data: {
                gradeLevels: GRADE_LEVEL_DEFINITIONS,
                total: GRADE_LEVEL_DEFINITIONS.length,
              },
            };
          }
          if (toolName === 'list_education_systems') {
            return {
              success: true,
              data: {
                educationSystems: EDUCATION_SYSTEM_DEFINITIONS,
                total: EDUCATION_SYSTEM_DEFINITIONS.length,
              },
            };
          }
          if (toolName === 'list_language_tracks') {
            return {
              success: true,
              data: {
                languageTracks: LANGUAGE_TRACK_DEFINITIONS,
                total: LANGUAGE_TRACK_DEFINITIONS.length,
              },
            };
          }
          if (toolName === 'list_math_branches') {
            return {
              success: true,
              data: {
                mathBranches: MATH_BRANCH_DEFINITIONS,
                total: MATH_BRANCH_DEFINITIONS.length,
              },
            };
          }
          if (toolName === 'list_academic_years') {
            const years = runtime.academicYearRepo ? runtime.academicYearRepo.listAll() : [];
            return {
              success: true,
              data: {
                academicYears: years.map((y) => ({
                  id: y.id,
                  name: y.name,
                  isActive: y.isActive,
                  isArchived: y.isArchived,
                })),
                activeYear: runtime.activeAcademicYear ? { id: runtime.activeAcademicYear.id, name: runtime.activeAcademicYear.name } : null,
              },
            };
          }
          if (toolName === 'get_application_settings') {
            return {
              success: true,
              data: {
                activeAcademicYear: runtime.activeAcademicYear ? { id: runtime.activeAcademicYear.id, name: runtime.activeAcademicYear.name } : null,
                isSetupComplete: Boolean(runtime.activeAcademicYear),
                systemStatus: 'ONLINE',
              },
            };
          }

          return { success: false, error: 'الأداة غير مدعومة' };
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : 'خطأ غير متوقع' };
        }
      },
      undoTool: async (_receiptId: string, snapshot: unknown) => {
        try {
          if (!snapshot || typeof snapshot !== 'object') {
            return { success: false, error: 'بيانات التراجع غير صالحة' };
          }
          const s = snapshot as Record<string, unknown>;
          const actor = runtime.requireAuthenticatedActor();

          if (s.kind === 'batch' && Array.isArray(s.snapshots)) {
            for (const subSnapshot of (s.snapshots as unknown[]).slice().reverse()) {
              if (subSnapshot && typeof subSnapshot === 'object') {
                const sub = subSnapshot as Record<string, unknown>;
                if (sub.kind === 'create_group' && runtime.groupService && sub.groupId) {
                  await runtime.groupService.updateGroup({ groupId: sub.groupId as string, status: 'ARCHIVED' } as any, actor);
                } else if (sub.kind === 'import_students' && runtime.studentService && Array.isArray(sub.studentIds)) {
                  for (const sid of sub.studentIds as string[]) {
                    await runtime.studentService.updateStudent({ studentId: sid, status: 'ARCHIVED' } as any, actor);
                  }
                } else if (sub.kind === 'create_student' && runtime.studentService && sub.studentId) {
                  await runtime.studentService.updateStudent({ studentId: sub.studentId as string, status: 'ARCHIVED' } as any, actor);
                }
              }
            }
            return { success: true };
          }
          if (s.kind === 'create_group' && runtime.groupService && s.groupId) {
            await runtime.groupService.updateGroup({ groupId: s.groupId as string, status: 'ARCHIVED' } as any, actor);
            return { success: true };
          }
          if (s.kind === 'import_students' && runtime.studentService && Array.isArray(s.studentIds)) {
            for (const sid of s.studentIds as string[]) {
              await runtime.studentService.updateStudent({ studentId: sid, status: 'ARCHIVED' } as any, actor);
            }
            return { success: true };
          }

          if (s.kind === 'archive_lesson_plan' && runtime.lessonPlannerService) {
            undoArchivedLessonPlan(runtime.lessonPlannerService, snapshot, actor);
            return { success: true };
          }
          if (s.kind === 'create_lesson_plan' && runtime.lessonPlannerService) {
            runtime.lessonPlannerService.archiveLessonPlan(s.planId as string, actor);
            return { success: true };
          }
          if (s.kind === 'update_lesson_plan' && runtime.lessonPlannerService) {
            const prev = s.previousData as Record<string, unknown>;
            if (prev) {
              runtime.lessonPlannerService.updateLessonPlan(s.planId as string, prev as any, actor);
            }
            return { success: true };
          }
          if (s.kind === 'update_student' && runtime.studentService) {
            const prev = s.previousData as Record<string, unknown>;
            if (prev) {
              await runtime.studentService.updateStudent({ studentId: s.studentId as string, ...prev } as any, actor);
            }
            return { success: true };
          }
          if (s.kind === 'enroll_student' && runtime.enrollmentService) {
            await runtime.enrollmentService.endEnrollment({ enrollmentId: s.enrollmentId as string } as any, actor);
            return { success: true };
          }
          if (s.kind === 'create_slide_deck' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            slideService.deleteDeck(s.deckId as string);
            return { success: true };
          }
          if (s.kind === 'add_slide_to_deck' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            slideService.deleteSlide(s.slideId as string);
            return { success: true };
          }
          if (s.kind === 'add_block_to_slide' && runtime.academicDb) {
            const slideService = new SlideService(runtime.academicDb.db);
            slideService.deleteBlock(s.blockId as string);
            return { success: true };
          }
          if (s.kind === 'update_group_curriculum_progress' && runtime.curriculumService) {
            runtime.curriculumService.updateGroupNodeProgress({
              groupId: s.groupId as string,
              nodeId: s.nodeId as string,
              status: 'NOT_STARTED',
            } as any, actor);
            return { success: true };
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : 'تعذر التراجع' };
        }
      },
    });
  }
  return runtime.assistantOrchestrator!;
}

export function registerAssistantIpcHandlers(runtime: Runtime, mainWindow: BrowserWindow | null): void {
  ipcMain.handle(IPC_CHANNELS.ASSISTANT_CREATE_SESSION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      const input = payload ? CreateSessionInputSchema.parse(payload) : {};
      const orch = getOrchestrator(runtime);
      return orch.createSession(actor.userId, input.title, input.context?.scope, input.context?.entityId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_LIST_SESSIONS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const actor = runtime.requireAuthenticatedActor();
      return getOrchestrator(runtime).listSessions(actor.userId);
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_SESSION, async (event, sessionId) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const session = getOrchestrator(runtime).getSession(sessionId);
      if (!session) throw new Error('SESSION_NOT_FOUND');
      return session;
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_DELETE_SESSION, async (event, sessionId) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      getOrchestrator(runtime).deleteSession(sessionId);
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_UPLOAD_ATTACHMENT, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      runtime.requireAuthenticatedActor();
      cleanupExpiredState();

      const input = UploadAssistantAttachmentInputSchema.parse(payload);
      const ext = path.extname(input.fileName).toLowerCase();
      const allowedExts = ['.xlsx', '.xls', '.csv', '.pdf'];
      if (!allowedExts.includes(ext)) {
        throw new Error(`نوع الملف غير مدعوم (${ext}). يُرجى رفع ملف بصيغة Excel (.xlsx, .xls) أو CSV (.csv) أو PDF (.pdf).`);
      }

      const buffer = Buffer.from(input.fileContentBase64, 'base64');
      const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
      if (buffer.length > MAX_SIZE_BYTES) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 15 ميجابايت.');
      }

      const attachmentId = crypto.randomUUID();
      let mimeType = input.mimeType || 'application/octet-stream';
      if (ext === '.xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      else if (ext === '.xls') mimeType = 'application/vnd.ms-excel';
      else if (ext === '.csv') mimeType = 'text/csv';
      else if (ext === '.pdf') mimeType = 'application/pdf';

      attachmentStore.set(attachmentId, {
        attachmentId,
        fileName: input.fileName,
        mimeType,
        sizeBytes: buffer.length,
        buffer,
        createdAt: Date.now(),
      });

      const attachmentDto: AssistantAttachmentDto = {
        attachmentId,
        fileName: input.fileName,
        mimeType,
        sizeBytes: buffer.length,
        purpose: 'student_import',
      };

      return attachmentDto;
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_SEND_MESSAGE, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const input = SendMessageInputSchema.parse(payload);
      const orch = getOrchestrator(runtime);
      return orch.sendMessage(
        input.sessionId,
        input.content,
        actor.userId,
        actor.fullName,
        actor.role,
        actor.permissions ?? [],
        input.context?.scope,
        input.context?.entityId,
        input.attachments,
      );
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_HISTORY, async (event, sessionId, cursor) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      const messages = getOrchestrator(runtime).getHistory(sessionId, cursor);
      return { sessionId, messages, hasMore: messages.length === 100 };
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_CONFIRM_ACTION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const input = ConfirmationInputSchema.parse(payload);
      const orch = getOrchestrator(runtime);
      return orch.confirmAction(
        input.previewId,
        input.confirmed,
        actor.userId,
        actor.fullName,
        actor.role,
        actor.permissions ?? [],
        input.sessionId,
      );
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_CANCEL_ACTION, async (event, previewId) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      previewRowsCache.delete(previewId);
      getOrchestrator(runtime).cancelAction(previewId);
      return undefined;
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_UNDO_ACTION, async (event, payload) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(async () => {
      const actor = runtime.requireAuthenticatedActor();
      const input = UndoInputSchema.parse(payload);
      const orch = getOrchestrator(runtime);
      return orch.undoAction(
        input.receiptId,
        input.undoToken,
        actor.userId,
        input.sessionId,
      );
    });
  });

  ipcMain.handle(IPC_CHANNELS.ASSISTANT_GET_TOOLS, async (event) => {
    if (!validateIpcSender(event, mainWindow)) throw new Error('UNAUTHORIZED_IPC_SENDER');
    return safeIpcCall(() => {
      return getOrchestrator(runtime).getTools();
    });
  });
}

export function unregisterAssistantIpcHandlers(): void {
  Object.values(IPC_CHANNELS)
    .filter((ch) => typeof ch === 'string' && ch.startsWith('assistant:'))
    .forEach((ch) => {
      ipcMain.removeHandler(ch as string);
    });
}
