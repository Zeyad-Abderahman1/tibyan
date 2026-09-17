import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  AcademicAuditRepository,
  StudentRepository,
  type AcademicDatabaseConnection,
} from '@tibyan/db';
import {
  StudentService,
  type AuthenticatedUser,
} from '../src/students/student.service.js';
import { PhotoService } from '../src/students/photo.service.js';

describe('Task 5: Students Domain Core & Media Storage Service', () => {
  let tempDir: string;
  let tempMediaDir: string;
  let tempSourceDir: string;
  let acadConn: AcademicDatabaseConnection;
  let photoService: PhotoService;
  let studentService: StudentService;
  let auditRepo: AcademicAuditRepository;
  let studentRepo: StudentRepository;

  const ownerActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'أحمد المالك',
    role: 'OWNER',
    permissions: [],
  };

  const assistantActorWithWrite: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'سارة مساعدة (كامل)',
    role: 'ASSISTANT',
    permissions: ['STUDENTS_READ', 'STUDENTS_WRITE'],
  };

  const assistantActorReadOnly: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'خالد قارئ فقط',
    role: 'ASSISTANT',
    permissions: ['STUDENTS_READ'],
  };

  const assistantActorNoPerms: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'علي بلا صلاحيات',
    role: 'ASSISTANT',
    permissions: [],
  };

  const validJpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const validPngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validWebpHeader = Buffer.concat([
    Buffer.from([0x52, 0x49, 0x46, 0x46]),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from([0x57, 0x45, 0x42, 0x50]),
    Buffer.from([0x56, 0x50, 0x38, 0x20]),
  ]);

  beforeEach(() => {
    closeAllDatabases();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-student-test-'));
    tempMediaDir = path.join(tempDir, 'media');
    tempSourceDir = path.join(tempDir, 'sources');
    fs.mkdirSync(tempMediaDir, { recursive: true });
    fs.mkdirSync(tempSourceDir, { recursive: true });

    const acadDbPath = path.join(tempDir, 'academic-2026-2027.sqlite');
    acadConn = openAcademicDatabase('2026-2027', { filePath: acadDbPath });
    photoService = new PhotoService(tempMediaDir);
    studentService = new StudentService(acadConn.db, photoService);
    auditRepo = new AcademicAuditRepository(acadConn.db);
    studentRepo = new StudentRepository(acadConn.db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    closeAllDatabases();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  // Test 1: Creating a valid student persists the student
  it('1. Creating a valid student persists the student', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'عمر محمود الشريف',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    expect(student.id).toBeDefined();
    expect(student.fullName).toBe('عمر محمود الشريف');
    expect(student.educationSystem).toBe('GENERAL');
    expect(student.gradeLevel).toBe('SEC_1');
    expect(student.languageTrack).toBe('ARABIC');
    expect(student.guardianPhone).toBe('01012345678');
    expect(student.status).toBe('ACTIVE');

    const inDb = studentRepo.findById(student.id);
    expect(inDb).not.toBeNull();
    expect(inDb?.fullName).toBe('عمر محمود الشريف');
    expect(inDb?.guardianPhone).toBe('01012345678');
  });

  // Test 2: studentCode is generated automatically and is unique
  it('2. studentCode is generated automatically and is unique', async () => {
    const s1 = await studentService.createStudent(
      {
        fullName: 'طالب أول',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01011112222',
      },
      ownerActor
    );

    const s2 = await studentService.createStudent(
      {
        fullName: 'طالب ثاني',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_2',
        languageTrack: 'LANG_ENGLISH',
        guardianPhone: '01233334444',
      },
      ownerActor
    );

    expect(s1.studentCode).toMatch(/^ST-\d{4}$/);
    expect(s2.studentCode).toMatch(/^ST-\d{4}$/);
    expect(s1.studentCode).not.toBe(s2.studentCode);
  });

  // Test 3: A forced studentCode collision retries safely rather than silently duplicating
  it('3. A forced studentCode collision retries safely rather than silently duplicating', async () => {
    // Manually pre-seed a student with ST-0002 directly into the database
    const manualId = crypto.randomUUID();
    const now = new Date().toISOString();
    studentRepo.create({
      id: manualId,
      studentCode: 'ST-0002',
      fullName: 'طالب موجود مسبقاً',
      photoPath: null,
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      guardianPhone: '01099998888',
      status: 'ACTIVE',
      qrToken: 'manual-qr-12345678901234567890',
      barcodeValue: 'ST-0002',
      createdAt: now,
      updatedAt: now,
    });

    // Create a student through the service. Since there is 1 student in DB, candidate is ST-0002.
    // The retry mechanism should detect that ST-0002 is occupied and step forward to ST-0003.
    const created = await studentService.createStudent(
      {
        fullName: 'طالب يتفادى التصادم',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    expect(created.studentCode).not.toBe('ST-0002');
    expect(created.studentCode).toBe('ST-0003');
  });

  // Test 4: qrToken is opaque, cryptographically generated, and unique
  it('4. qrToken is opaque, cryptographically generated, and unique', async () => {
    const s1 = await studentService.createStudent(
      {
        fullName: 'طالب تجريبي أ',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    const s2 = await studentService.createStudent(
      {
        fullName: 'طالب تجريبي ب',
        educationSystem: 'EGYPTIAN_BACCALAUREATE',
        gradeLevel: 'SEC_2',
        languageTrack: 'LANG_ENGLISH',
        guardianPhone: '01512345678',
      },
      ownerActor
    );

    // 16 random bytes hex = 32 hex characters
    expect(s1.qrToken).toHaveLength(32);
    expect(s2.qrToken).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/i.test(s1.qrToken)).toBe(true);
    expect(s1.qrToken).not.toBe(s2.qrToken);

    // Verify no PII is encoded
    expect(s1.qrToken).not.toContain(s1.fullName);
    expect(s1.qrToken).not.toContain(s1.guardianPhone);
    expect(s1.qrToken).not.toContain('SEC_1');
  });

  // Test 5: barcodeValue is stable and maps to the intended student code
  it('5. barcodeValue is stable and maps to the intended student code', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب الباركود',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_3',
        languageTrack: 'LANG_ENGLISH',
        guardianPhone: '01112345678',
      },
      ownerActor
    );

    expect(student.barcodeValue).toBe(student.studentCode);
    const foundByBarcode = studentRepo.findByBarcode(student.barcodeValue);
    expect(foundByBarcode?.id).toBe(student.id);
  });

  // Test 6: Student payment override fields do not exist in the created student domain object
  it('6. Student payment override fields do not exist in the created student domain object', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب بلا دفع',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    const raw = student as any;
    expect(raw.paymentOverride).toBeUndefined();
    expect(raw.discountAmount).toBeUndefined();
    expect(raw.customFee).toBeUndefined();
    expect(raw.paymentType).toBeUndefined();
  });

  // Test 7: Student creation produces an academic audit record
  it('7. Student creation produces an academic audit record', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب مدقق',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    const auditLogs = auditRepo.findByEntity('STUDENT', student.id);
    expect(auditLogs).toHaveLength(1);

    const log = auditLogs[0]!;
    expect(log.action).toBe('STUDENT_CREATED');
    expect(log.actorType).toBe('USER');
    expect(log.actorUserId).toBe(ownerActor.userId);
    expect(log.actorNameSnapshot).toBe(ownerActor.fullName);
    expect(log.beforeJson).toBeNull();

    const after = JSON.parse(log.afterJson!);
    expect(after.id).toBe(student.id);
    expect(after.fullName).toBe('طالب مدقق');

    const meta = JSON.parse(log.metadataJson!);
    expect(meta.studentCode).toBe(student.studentCode);
    expect(meta.educationSystem).toBe('GENERAL');
    // Guardian phone must NOT be in audit metadata
    expect(meta.guardianPhone).toBeUndefined();
  });

  // Test 8: Forced audit insertion failure rolls back student creation
  it('8. Forced audit insertion failure rolls back student creation', async () => {
    // Spy on auditRepo insert to throw
    vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
      throw new Error('Forced audit disk failure');
    });

    await expect(
      studentService.createStudent(
        {
          fullName: 'طالب يفشل في التدقيق',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          guardianPhone: '01012345678',
        },
        ownerActor
      )
    ).rejects.toThrow('Forced audit disk failure');

    // Confirm student was rolled back and not persisted
    const allStudents = studentRepo.list();
    expect(allStudents.some((s) => s.fullName === 'طالب يفشل في التدقيق')).toBe(false);
  });

  // Test 9: Student update produces correct before/after audit history
  it('9. Student update produces correct before/after audit history', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'الاسم الأصلي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    const updated = await studentService.updateStudent(
      {
        studentId: student.id,
        fullName: 'الاسم المعدل',
        gradeLevel: 'SEC_2',
      },
      ownerActor
    );

    expect(updated.fullName).toBe('الاسم المعدل');
    expect(updated.gradeLevel).toBe('SEC_2');

    const auditLogs = auditRepo.findByEntity('STUDENT', student.id);
    expect(auditLogs).toHaveLength(2); // CREATED + UPDATED

    const updateLog = auditLogs.find((l) => l.action === 'STUDENT_UPDATED');
    expect(updateLog).toBeDefined();
    const before = JSON.parse(updateLog!.beforeJson!);
    const after = JSON.parse(updateLog!.afterJson!);
    expect(before.fullName).toBe('الاسم الأصلي');
    expect(after.fullName).toBe('الاسم المعدل');
    expect(before.gradeLevel).toBe('SEC_1');
    expect(after.gradeLevel).toBe('SEC_2');
  });

  // Test 10: Soft deactivation changes status to INACTIVE without deleting the row
  it('10. Soft deactivation changes status to INACTIVE without deleting the row', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب يتم تعطيله',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    const deactivated = await studentService.setStudentStatus(student.id, 'INACTIVE', ownerActor);
    expect(deactivated.status).toBe('INACTIVE');

    const fromDb = studentRepo.findById(student.id);
    expect(fromDb).not.toBeNull();
    expect(fromDb?.status).toBe('INACTIVE');

    // Reactivation works
    const reactivated = await studentService.setStudentStatus(student.id, 'ACTIVE', ownerActor);
    expect(reactivated.status).toBe('ACTIVE');

    // Unsupported status rejected
    await expect(
      studentService.setStudentStatus(student.id, 'ARCHIVED' as any, ownerActor)
    ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_STUDENT_STATUS_TRANSITION' }));
  });

  // Test 11: Student notes append rather than overwrite earlier notes
  it('11. Student notes append rather than overwrite earlier notes', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب الملاحظات',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    const note1 = await studentService.addStudentNote(
      {
        studentId: student.id,
        noteText: 'ملاحظة سلوكية أولى',
        tag: 'BEHAVIOR',
      },
      ownerActor
    );

    const note2 = await studentService.addStudentNote(
      {
        studentId: student.id,
        noteText: 'ملاحظة أكاديمية ثانية',
        tag: 'ACADEMIC_WEAKNESS',
      },
      ownerActor
    );

    const allNotes = await studentService.listStudentNotes(student.id, ownerActor);
    expect(allNotes).toHaveLength(2);
    expect(allNotes.map((n) => n.id)).toContain(note1.id);
    expect(allNotes.map((n) => n.id)).toContain(note2.id);
    expect(allNotes.find((n) => n.id === note1.id)?.noteText).toBe('ملاحظة سلوكية أولى');
    expect(allNotes.find((n) => n.id === note2.id)?.noteText).toBe('ملاحظة أكاديمية ثانية');
  });

  // Test 12: Adding a student note creates an audit record
  it('12. Adding a student note creates an audit record', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب تدقيق الملاحظة',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    const note = await studentService.addStudentNote(
      {
        studentId: student.id,
        noteText: 'ملاحظة تدقيقية هامة',
        tag: 'GENERAL',
      },
      ownerActor
    );

    const auditLogs = auditRepo.findByEntity('STUDENT', student.id);
    const noteLog = auditLogs.find((l) => l.action === 'STUDENT_NOTE_ADDED');
    expect(noteLog).toBeDefined();
    expect(noteLog?.actorUserId).toBe(ownerActor.userId);
    const after = JSON.parse(noteLog!.afterJson!);
    expect(after.id).toBe(note.id);
    expect(after.noteText).toBe('ملاحظة تدقيقية هامة');
  });

  // Test 13: Assistant without STUDENTS_READ cannot read student data
  it('13. Assistant without STUDENTS_READ cannot read student data', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب للقراءة',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    await expect(studentService.getStudentById(student.id, assistantActorNoPerms)).rejects.toThrowError(
      expect.objectContaining({ code: 'PERMISSION_DENIED' })
    );

    await expect(studentService.searchStudents({}, assistantActorNoPerms)).rejects.toThrowError(
      expect.objectContaining({ code: 'PERMISSION_DENIED' })
    );

    await expect(studentService.listStudentNotes(student.id, assistantActorNoPerms)).rejects.toThrowError(
      expect.objectContaining({ code: 'PERMISSION_DENIED' })
    );
  });

  // Test 14: Assistant without STUDENTS_WRITE cannot mutate student data
  it('14. Assistant without STUDENTS_WRITE cannot mutate student data', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب محمي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    await expect(
      studentService.createStudent(
        {
          fullName: 'طالب غير مسموح',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          guardianPhone: '01012345678',
        },
        assistantActorReadOnly
      )
    ).rejects.toThrowError(expect.objectContaining({ code: 'PERMISSION_DENIED' }));

    await expect(
      studentService.updateStudent({ studentId: student.id, fullName: 'اسم جديد' }, assistantActorReadOnly)
    ).rejects.toThrowError(expect.objectContaining({ code: 'PERMISSION_DENIED' }));

    await expect(
      studentService.setStudentStatus(student.id, 'INACTIVE', assistantActorReadOnly)
    ).rejects.toThrowError(expect.objectContaining({ code: 'PERMISSION_DENIED' }));

    await expect(
      studentService.addStudentNote(
        { studentId: student.id, noteText: 'ممنوع', tag: 'GENERAL' },
        assistantActorReadOnly
      )
    ).rejects.toThrowError(expect.objectContaining({ code: 'PERMISSION_DENIED' }));
  });

  // Test 15: Assistant with correct permission succeeds
  it('15. Assistant with correct permission succeeds', async () => {
    const student = await studentService.createStudent(
      {
        fullName: 'طالب مساعد كامل',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      assistantActorWithWrite
    );

    expect(student.id).toBeDefined();

    const fetched = await studentService.getStudentById(student.id, assistantActorWithWrite);
    expect(fetched.id).toBe(student.id);

    const updated = await studentService.updateStudent(
      { studentId: student.id, fullName: 'مساعد قام بالتعديل' },
      assistantActorWithWrite
    );
    expect(updated.fullName).toBe('مساعد قام بالتعديل');
  });

  // Test 16: Owner succeeds without explicit user_permission rows
  it('16. Owner succeeds without explicit user_permission rows', async () => {
    expect(ownerActor.permissions).toEqual([]);
    const student = await studentService.createStudent(
      {
        fullName: 'طالب المالك الأكيد',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
      },
      ownerActor
    );

    expect(student.id).toBeDefined();
    const fetched = await studentService.getStudentById(student.id, ownerActor);
    expect(fetched.fullName).toBe('طالب المالك الأكيد');
  });

  // Test 17: Search by name works
  it('17. Search by name works', async () => {
    await studentService.createStudent(
      { fullName: 'أحمد محمود', educationSystem: 'GENERAL', gradeLevel: 'SEC_1', languageTrack: 'ARABIC', guardianPhone: '01011111111' },
      ownerActor
    );
    await studentService.createStudent(
      { fullName: 'إبراهيم علي', educationSystem: 'GENERAL', gradeLevel: 'SEC_1', languageTrack: 'ARABIC', guardianPhone: '01022222222' },
      ownerActor
    );

    const results = await studentService.searchStudents({ searchQuery: 'أحمد' }, ownerActor);
    expect(results).toHaveLength(1);
    expect(results[0]!.fullName).toBe('أحمد محمود');
  });

  // Test 18: Search by studentCode works
  it('18. Search by studentCode works', async () => {
    const s1 = await studentService.createStudent(
      { fullName: 'طالب كود 1', educationSystem: 'GENERAL', gradeLevel: 'SEC_1', languageTrack: 'ARABIC', guardianPhone: '01011111111' },
      ownerActor
    );
    await studentService.createStudent(
      { fullName: 'طالب كود 2', educationSystem: 'GENERAL', gradeLevel: 'SEC_1', languageTrack: 'ARABIC', guardianPhone: '01022222222' },
      ownerActor
    );

    const results = await studentService.searchStudents({ searchQuery: s1.studentCode }, ownerActor);
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(s1.id);
  });

  // Test 19: Search by normalized guardian phone works
  it('19. Search by normalized guardian phone works', async () => {
    await studentService.createStudent(
      { fullName: 'طالب هاتف', educationSystem: 'GENERAL', gradeLevel: 'SEC_1', languageTrack: 'ARABIC', guardianPhone: '01098765432' },
      ownerActor
    );

    const results = await studentService.searchStudents({ searchQuery: '01098765432' }, ownerActor);
    expect(results).toHaveLength(1);
    expect(results[0]!.guardianPhone).toBe('01098765432');
  });

  // Test 20: Filters by education system, grade, track, and status work as defined
  it('20. Filters by education system, grade, track, and status work as defined', async () => {
    const sGeneral = await studentService.createStudent(
      { fullName: 'طالب عام', educationSystem: 'GENERAL', gradeLevel: 'SEC_1', languageTrack: 'ARABIC', guardianPhone: '01011111111' },
      ownerActor
    );
    const sEb = await studentService.createStudent(
      { fullName: 'طالب بكالوريا', educationSystem: 'EGYPTIAN_BACCALAUREATE', gradeLevel: 'SEC_2', languageTrack: 'LANG_ENGLISH', guardianPhone: '01022222222' },
      ownerActor
    );

    // Filter by educationSystem
    const generalOnly = await studentService.searchStudents({ educationSystem: 'GENERAL' }, ownerActor);
    expect(generalOnly.map((s) => s.id)).toContain(sGeneral.id);
    expect(generalOnly.map((s) => s.id)).not.toContain(sEb.id);

    // Filter by gradeLevel
    const ebGradeOnly = await studentService.searchStudents({ gradeLevel: 'SEC_2' }, ownerActor);
    expect(ebGradeOnly.map((s) => s.id)).toContain(sEb.id);
    expect(ebGradeOnly.map((s) => s.id)).not.toContain(sGeneral.id);

    // Filter by status
    await studentService.setStudentStatus(sGeneral.id, 'INACTIVE', ownerActor);
    const activeOnly = await studentService.searchStudents({ status: 'ACTIVE' }, ownerActor);
    expect(activeOnly.map((s) => s.id)).toContain(sEb.id);
    expect(activeOnly.map((s) => s.id)).not.toContain(sGeneral.id);
  });

  // Test 21: Valid JPEG/PNG/WebP photo import copies into the managed academic-year media directory
  it('21. Valid JPEG/PNG/WebP photo import copies into the managed academic-year media directory', async () => {
    const srcFile = path.join(tempSourceDir, 'source-valid.jpg');
    fs.writeFileSync(srcFile, validJpegHeader);

    const student = await studentService.createStudent(
      {
        fullName: 'طالب بالصورة',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
        photoPath: srcFile,
      },
      ownerActor
    );

    expect(student.photoPath).toMatch(/^students\/[a-f0-9-]+-\d+\.jpg$/i);
    const fullPath = photoService.resolveFullPath(student.photoPath!);
    expect(fs.existsSync(fullPath)).toBe(true);

    const content = fs.readFileSync(fullPath);
    expect(content.subarray(0, validJpegHeader.length)).toEqual(validJpegHeader);
  });

  // Test 22: Unsupported or corrupted image input is rejected
  it('22. Unsupported or corrupted image input is rejected', async () => {
    const badFile = path.join(tempSourceDir, 'bad-executable.bin');
    fs.writeFileSync(badFile, Buffer.from('BINARY_EXE_DATA'));

    await expect(
      studentService.createStudent(
        {
          fullName: 'طالب بصورة فاسدة',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          guardianPhone: '01012345678',
          photoPath: badFile,
        },
        ownerActor
      )
    ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_PHOTO' }));
  });

  // Test 23: A malicious source filename cannot escape the managed media directory
  it('23. A malicious source filename cannot escape the managed media directory', async () => {
    const safeEvilFile = path.join(tempSourceDir, 'evil.png');
    fs.writeFileSync(safeEvilFile, validPngHeader);

    const student = await studentService.createStudent(
      {
        fullName: 'طالب فحص الأمان',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
        photoPath: safeEvilFile,
      },
      ownerActor
    );

    const resolved = photoService.resolveFullPath(student.photoPath!);
    expect(resolved.startsWith(path.join(tempMediaDir, 'students'))).toBe(true);
    expect(student.photoPath).not.toContain('..');
    expect(student.photoPath).not.toContain('evil');
  });

  // Test 24: Stored photo path points only to managed application storage
  it('24. Stored photo path points only to managed application storage', async () => {
    const srcFile = path.join(tempSourceDir, 'source.webp');
    fs.writeFileSync(srcFile, validWebpHeader);

    const student = await studentService.createStudent(
      {
        fullName: 'طالب مسار نسبي',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
        photoPath: srcFile,
      },
      ownerActor
    );

    // Stored path must be relative to media root
    expect(student.photoPath?.startsWith('students/')).toBe(true);
    expect(path.isAbsolute(student.photoPath!)).toBe(false);
  });

  // Test 25: Replacing a photo preserves the old photo if the DB update fails
  it('25. Replacing a photo preserves the old photo if the DB update fails', async () => {
    const photo1 = path.join(tempSourceDir, 'photo1.jpg');
    const photo2 = path.join(tempSourceDir, 'photo2.jpg');
    fs.writeFileSync(photo1, validJpegHeader);
    fs.writeFileSync(photo2, validJpegHeader);

    const student = await studentService.createStudent(
      {
        fullName: 'طالب استبدال',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
        photoPath: photo1,
      },
      ownerActor
    );

    const oldFullPath = photoService.resolveFullPath(student.photoPath!);
    expect(fs.existsSync(oldFullPath)).toBe(true);

    // Mock audit insert to fail on update
    vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
      throw new Error('Database transaction abort during photo replacement');
    });

    await expect(
      studentService.updateStudent(
        {
          studentId: student.id,
          photoPath: photo2,
        },
        ownerActor
      )
    ).rejects.toThrow('Database transaction abort during photo replacement');

    // Old photo must still exist!
    expect(fs.existsSync(oldFullPath)).toBe(true);
  });

  // Test 26: If the new photo was copied but the DB transaction fails, the new orphan file is cleaned up
  it('26. If the new photo was copied but the DB transaction fails, the new orphan file is cleaned up', async () => {
    const photo1 = path.join(tempSourceDir, 'photo-new.jpg');
    fs.writeFileSync(photo1, validJpegHeader);

    // Track files in media directory before attempt
    const beforeFiles = fs.readdirSync(path.join(tempMediaDir, 'students'));

    vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
      throw new Error('DB commit failure');
    });

    await expect(
      studentService.createStudent(
        {
          fullName: 'طالب تنظيف الأيتام',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          guardianPhone: '01012345678',
          photoPath: photo1,
        },
        ownerActor
      )
    ).rejects.toThrow('DB commit failure');

    const afterFiles = fs.readdirSync(path.join(tempMediaDir, 'students'));
    expect(afterFiles).toEqual(beforeFiles);
  });

  // Test 27: Successful replacement leaves the new image referenced and cleans the previous managed image
  it('27. Successful replacement leaves the new image referenced and cleans the previous managed image', async () => {
    const photo1 = path.join(tempSourceDir, 'photo1.jpg');
    const photo2 = path.join(tempSourceDir, 'photo2.png');
    fs.writeFileSync(photo1, validJpegHeader);
    fs.writeFileSync(photo2, validPngHeader);

    const student = await studentService.createStudent(
      {
        fullName: 'طالب استبدال ناجح',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
        photoPath: photo1,
      },
      ownerActor
    );

    const oldPath = photoService.resolveFullPath(student.photoPath!);
    expect(fs.existsSync(oldPath)).toBe(true);

    const updated = await studentService.setStudentPhoto(student.id, photo2, ownerActor);

    const newPath = photoService.resolveFullPath(updated.photoPath!);
    expect(fs.existsSync(newPath)).toBe(true);
    expect(fs.existsSync(oldPath)).toBe(false);

    // Audit log should record STUDENT_PHOTO_CHANGED
    const auditLogs = auditRepo.findByEntity('STUDENT', student.id);
    const photoLog = auditLogs.find((l) => l.action === 'STUDENT_PHOTO_CHANGED');
    expect(photoLog).toBeDefined();
  });

  // Test 28: App restart/reopen can resolve the persisted managed photo path correctly
  it('28. App restart/reopen can resolve the persisted managed photo path correctly', async () => {
    const photo1 = path.join(tempSourceDir, 'photo-restart.jpg');
    fs.writeFileSync(photo1, validJpegHeader);

    const student = await studentService.createStudent(
      {
        fullName: 'طالب إعادة التشغيل',
        educationSystem: 'GENERAL',
        gradeLevel: 'SEC_1',
        languageTrack: 'ARABIC',
        guardianPhone: '01012345678',
        photoPath: photo1,
      },
      ownerActor
    );

    // Simulate new service instance after restart
    const restartedPhotoService = new PhotoService(tempMediaDir);
    const restartedStudentService = new StudentService(acadConn.db, restartedPhotoService);

    const retrieved = await restartedStudentService.getStudentById(student.id, ownerActor);
    expect(retrieved.photoPath).toBe(student.photoPath);

    const resolved = restartedPhotoService.resolveFullPath(retrieved.photoPath!);
    expect(fs.existsSync(resolved)).toBe(true);
  });

  // Validation boundary tests
  it('Rejects empty or whitespace-only name', async () => {
    await expect(
      studentService.createStudent(
        {
          fullName: '   ',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          guardianPhone: '01012345678',
        },
        ownerActor
      )
    ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('Rejects invalid Egyptian guardian phone', async () => {
    await expect(
      studentService.createStudent(
        {
          fullName: 'طالب رقم غير مصري',
          educationSystem: 'GENERAL',
          gradeLevel: 'SEC_1',
          languageTrack: 'ARABIC',
          guardianPhone: '12345',
        },
        ownerActor
      )
    ).rejects.toThrowError(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});
