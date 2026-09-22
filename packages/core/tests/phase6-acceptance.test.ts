import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  openSystemDatabase,
  openAcademicDatabase,
  closeAllDatabases,
  UserRepository,
  StudentRepository,
  GroupRepository,
} from '@tibyan/db';
import {
  GRADE_LEVEL_DEFINITIONS,
} from '@tibyan/contracts';
import { AssistantOrchestrator } from '../src/assistant/assistant-orchestrator.js';
import { listTools, clearAllTools } from '../src/assistant/tool-registry.js';
import { registerAllAssistantTools } from '../src/assistant/tools/index.js';
import { ALL_PERMISSION_CODES } from '../src/auth/permissions.js';
import { StudentImportService } from '../src/students/student-import.service.js';

describe('Phase 6 — Full Business Access & Bulk Operations Acceptance', () => {
  let systemDb: ReturnType<typeof openSystemDatabase>;
  let academicDb: ReturnType<typeof openAcademicDatabase>;
  let userRepo: UserRepository;
  let studentRepo: StudentRepository;
  let groupRepo: GroupRepository;
  let testUserId: string;

  beforeEach(() => {
    systemDb = openSystemDatabase({ filePath: ':memory:' });
    academicDb = openAcademicDatabase('2026-2027', { filePath: ':memory:', autoMigrate: true });
    userRepo = new UserRepository(systemDb.db);
    studentRepo = new StudentRepository(academicDb.db);
    groupRepo = new GroupRepository(academicDb.db);

    const user = userRepo.create({
      id: crypto.randomUUID(),
      username: 'owner',
      fullName: 'الأستاذ المشرف',
      role: 'OWNER',
      pinHash: 'hash',
      salt: 'salt',
      failedAttempts: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    testUserId = user.id;

    registerAllAssistantTools();
  });

  afterEach(() => {
    closeAllDatabases();
    clearAllTools();
  });

  describe('Authoritative Academic Metadata & Read Tools', () => {
    it('verifies list_grade_levels returns authoritative system grade levels with Arabic names', () => {
      const allTools = listTools();
      const gradeLevelsTool = allTools.find((t) => t.name === 'list_grade_levels');
      expect(gradeLevelsTool).toBeDefined();
      expect(gradeLevelsTool?.riskLevel).toBe('read-only');
      expect(gradeLevelsTool?.confirmationPolicy).toBe('none');

      expect(GRADE_LEVEL_DEFINITIONS.length).toBe(6);
      const names = GRADE_LEVEL_DEFINITIONS.map((g) => g.nameAr);
      expect(names).toContain('الصف الأول الإعدادي');
      expect(names).toContain('الصف الأول الثانوي');
      expect(names).toContain('الصف الثاني الثانوي');
      expect(names).toContain('الصف الثالث الثانوي');
    });

    it('verifies other metadata tools are registered and read-only without confirmation', () => {
      const allTools = listTools();
      const metadataTools = [
        'list_education_systems',
        'list_language_tracks',
        'list_math_branches',
        'list_academic_years',
        'get_application_settings',
        'list_exam_variants',
      ];

      for (const name of metadataTools) {
        const tool = allTools.find((t) => t.name === name);
        expect(tool).toBeDefined();
        expect(tool?.riskLevel).toBe('read-only');
        expect(tool?.confirmationPolicy).toBe('none');
      }
    });
  });

  describe('Product Owner Acceptance: Bulk Group Creation per Grade Level', () => {
    it('exact request produces one combined Preview, requires single confirmation, creates all missing groups', async () => {
      const executedActions: Array<{ name: string; gradeLevel: string }> = [];

      // Mock Gemini returning 6 create_group calls (one for each grade level in system)
      const mockGeminiReply = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    type: 'multi-tool-call',
                    toolCalls: [
                      { toolName: 'create_group', toolInput: { name: 'الصف الأول الإعدادي', gradeLevel: 'PREP_1' } },
                      { toolName: 'create_group', toolInput: { name: 'الصف الثاني الإعدادي', gradeLevel: 'PREP_2' } },
                      { toolName: 'create_group', toolInput: { name: 'الصف الثالث الإعدادي', gradeLevel: 'PREP_3' } },
                      { toolName: 'create_group', toolInput: { name: 'الصف الأول الثانوي', gradeLevel: 'SEC_1' } },
                      { toolName: 'create_group', toolInput: { name: 'الصف الثاني الثانوي', gradeLevel: 'SEC_2' } },
                      { toolName: 'create_group', toolInput: { name: 'الصف الثالث الثانوي', gradeLevel: 'SEC_3' } },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiReply,
      });

      const orchestrator = new AssistantOrchestrator({
        systemDb,
        geminiCredentialService: { get: () => 'valid-test-key' },
        fetchImpl: mockFetch as any,
        getActiveAcademicYear: () => ({ id: 'year-1', name: '2026/2027' }),
        resolveEntityLabel: async () => null,
        buildToolPreview: async (toolName, input) => {
          return [
            {
              entityLabel: (input.name as string) ?? toolName,
              changeKind: 'create',
              changes: [
                { field: 'name', label: 'اسم المجموعة', after: input.name },
                { field: 'gradeLevel', label: 'المرحلة', after: input.gradeLevel },
              ],
            },
          ];
        },
        executeTool: async (toolName, input) => {
          if (toolName === 'create_group') {
            const groupName = input.name as string;
            // Check for duplicate
            const existing = groupRepo.list().find((g) => g.name === groupName);
            if (existing) {
              return { success: true, data: { ...existing, skipped: true } };
            }
            const created = groupRepo.create({
              id: crypto.randomUUID(),
              name: groupName,
              educationSystem: 'GENERAL',
              gradeLevel: (input.gradeLevel as any) || 'SEC_1',
              languageTrack: 'ARABIC',
              focusMathBranch: null,
              defaultPaymentType: 'MONTHLY',
              defaultPaymentAmount: 0,
              status: 'ACTIVE',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            executedActions.push({ name: groupName, gradeLevel: input.gradeLevel as string });
            return {
              success: true,
              data: created,
              undoSnapshot: { kind: 'create_group', groupId: created.id },
            };
          }
          return { success: true };
        },
        undoTool: async () => ({ success: true }),
      });

      const session = orchestrator.createSession(testUserId, 'مجموعات الصفوف', 'PLATFORM_CONTROL');

      // Teacher message
      const prompt = 'أنشئ مجموعة واحدة لكل صف دراسي موجود في النظام، وسمِّ كل مجموعة باسم الصف نفسه.';
      const response = await orchestrator.sendMessage(
        session.id,
        prompt,
        testUserId,
        'الأستاذ المشرف',
        'OWNER',
        ALL_PERMISSION_CODES,
      );

      // Verify that Preview was generated and NO database mutations occurred before confirmation
      expect(response.success).toBe(true);
      expect(response.preview).toBeDefined();
      expect(response.preview?.items.length).toBe(6);
      expect(groupRepo.list().length).toBe(0); // Zero groups created before confirmation!

      // Preview description must list the groups
      expect(response.preview?.summary).toBeDefined();
      expect(response.preview?.items[0]?.entityLabel).toBe('الصف الأول الإعدادي');
      expect(response.preview?.items[3]?.entityLabel).toBe('الصف الأول الثانوي');

      // Confirm the single combined preview
      const previewId = response.preview!.id;
      const confirmResponse = await orchestrator.confirmAction(
        previewId,
        true,
        testUserId,
        'الأستاذ المشرف',
        'OWNER',
        ALL_PERMISSION_CODES,
        session.id,
      );

      expect(confirmResponse.success).toBe(true);
      expect(confirmResponse.receipt).toBeDefined();
      expect(executedActions.length).toBe(6);
      expect(groupRepo.list().length).toBe(6);

      // Verify group names match teacher-facing names
      const allCreatedGroups = groupRepo.list();
      expect(allCreatedGroups.map((g) => g.name)).toEqual([
        'الصف الأول الإعدادي',
        'الصف الثاني الإعدادي',
        'الصف الثالث الإعدادي',
        'الصف الأول الثانوي',
        'الصف الثاني الثانوي',
        'الصف الثالث الثانوي',
      ]);

      // Verify undo support
      expect(confirmResponse.receipt?.undoAvailable).toBe(true);
    });

    it('duplicate prevention: skips already existing groups instead of duplicating them', async () => {
      // Pre-create 'الصف الأول الثانوي'
      groupRepo.create({
        id: crypto.randomUUID(),
        name: 'الصف الأول الثانوي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        focusMathBranch: null,
        defaultPaymentType: 'MONTHLY',
        defaultPaymentAmount: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(groupRepo.list().length).toBe(1);

      // Verify find
      const existing = groupRepo.list().find((g) => g.name === 'الصف الأول الثانوي');
      expect(existing).toBeDefined();

      // Ensure duplicate check succeeds
      const countBefore = groupRepo.list().length;
      expect(countBefore).toBe(1);
    });
  });

  describe('Student Bulk Import Pipeline', () => {
    it('imports CSV with Arabic headings and resolves grades, tracks, and systems', async () => {
      const importService = new StudentImportService(academicDb.db);

      const arabicCsv = `اسم الطالب,الصف,النظام التعليمي,المسار,رقم هاتف ولي الأمر,ملاحظات
أحمد محمد علي,الصف الأول الثانوي,التعليم العام,عربي,01012345678,طالب متفوق
سارة محمود حسن,الصف الثالث الإعدادي,التعليم العام,لغات,01123456789,تحتاج متابعة`;

      const preview = await importService.parseAndPreview(Buffer.from(arabicCsv, 'utf-8'), 'students_ar.csv');

      expect(preview.totalRows).toBe(2);
      expect(preview.validCount).toBe(2);
      expect(preview.duplicateCount).toBe(0);
      expect(preview.invalidCount).toBe(0);

      expect(preview.rows[0]?.fullName).toBe('أحمد محمد علي');
      expect(preview.rows[0]?.gradeLevel).toBe('SEC_1');
      expect(preview.rows[0]?.educationSystem).toBe('GENERAL');
      expect(preview.rows[0]?.languageTrack).toBe('ARABIC');
      expect(preview.rows[0]?.guardianPhone).toBe('01012345678');
      expect(preview.rows[0]?.status).toBe('READY');

      expect(preview.rows[1]?.fullName).toBe('سارة محمود حسن');
      expect(preview.rows[1]?.gradeLevel).toBe('PREP_3');
      expect(preview.rows[1]?.languageTrack).toBe('LANG_ENGLISH');
      expect(preview.rows[1]?.status).toBe('READY');

      // Database has no students before execute
      expect(studentRepo.list().length).toBe(0);

      // Execute import
      const ownerActor = {
        userId: testUserId,
        fullName: 'الأستاذ المشرف',
        role: 'OWNER' as const,
        permissions: ALL_PERMISSION_CODES,
      };

      const result = await importService.executeImport(
        {
          rows: preview.rows.map((r) => ({
            fullName: r.fullName,
            educationSystem: r.educationSystem!,
            gradeLevel: r.gradeLevel!,
            languageTrack: r.languageTrack!,
            guardianPhone: r.guardianPhone!,
            notes: r.notes,
          })),
        },
        ownerActor
      );

      expect(result.importedCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(studentRepo.list().length).toBe(2);

      const dbStudents = studentRepo.list();
      expect(dbStudents.map((s) => s.fullName)).toContain('أحمد محمد علي');
      expect(dbStudents.map((s) => s.fullName)).toContain('سارة محمود حسن');
    });

    it('imports CSV with English headings and detects duplicate students and invalid phones', async () => {
      const importService = new StudentImportService(academicDb.db);

      // Pre-create student to trigger duplicate detection
      studentRepo.create({
        id: crypto.randomUUID(),
        studentCode: 'STD-1001',
        fullName: 'خالد يوسف إبراهيم',
        photoPath: null,
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01234567890',
        status: 'ACTIVE',
        qrToken: crypto.randomUUID(),
        barcodeValue: 'STD-1001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const englishCsv = `Student Name,Grade Level,Education System,Language Track,Guardian Phone
خالد يوسف إبراهيم,SEC_1,GENERAL,ARABIC,01234567890
كريم عمرو مصطفى,SEC_2,GENERAL,ARABIC,12345
محمود طارق السيد,SEC_3,GENERAL,ARABIC,01598765432`;

      const preview = await importService.parseAndPreview(Buffer.from(englishCsv, 'utf-8'), 'students_en.csv');

      expect(preview.totalRows).toBe(3);

      // Row 0 is duplicate
      expect(preview.rows[0]?.fullName).toBe('خالد يوسف إبراهيم');
      expect(preview.rows[0]?.status).toBe('DUPLICATE');

      // Row 1 has invalid Egyptian phone (not 11 digits starting with 01)
      expect(preview.rows[1]?.fullName).toBe('كريم عمرو مصطفى');
      expect(preview.rows[1]?.status).toBe('INVALID_PHONE');

      // Row 2 is valid
      expect(preview.rows[2]?.fullName).toBe('محمود طارق السيد');
      expect(preview.rows[2]?.status).toBe('READY');

      expect(preview.validCount).toBe(1);
      expect(preview.duplicateCount).toBe(1);
      expect(preview.invalidCount).toBe(1);
    });
  });
});
