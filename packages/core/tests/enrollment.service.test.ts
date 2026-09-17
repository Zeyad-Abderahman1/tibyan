import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  openAcademicDatabase,
  closeAllDatabases,
  AcademicAuditRepository,
  GroupRepository,
  StudentRepository,
  EnrollmentRepository,
  type AcademicDatabaseConnection,
} from '@tibyan/db';
import {
  EnrollmentService,
} from '../src/groups/enrollment.service.js';
import type { AuthenticatedUser } from '../src/students/student.service.js';

describe('Task 6: EnrollmentService', () => {
  let tempDir: string;
  let acadConn: AcademicDatabaseConnection;
  let enrollmentService: EnrollmentService;
  let groupRepo: GroupRepository;
  let studentRepo: StudentRepository;
  let enrollmentRepo: EnrollmentRepository;
  let auditRepo: AcademicAuditRepository;

  const ownerActor: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'أحمد المالك',
    role: 'OWNER',
    permissions: [],
  };

  const assistantWithWrite: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'سارة مساعدة (كامل)',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ', 'GROUPS_WRITE'],
  };

  const assistantReadOnly: AuthenticatedUser = {
    userId: crypto.randomUUID(),
    fullName: 'خالد قارئ فقط',
    role: 'ASSISTANT',
    permissions: ['GROUPS_READ'],
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tibyan-enrollment-test-'));
    const dbPath = path.join(tempDir, 'academic.db');
    acadConn = openAcademicDatabase(dbPath);
    enrollmentService = new EnrollmentService(acadConn.db);
    groupRepo = new GroupRepository(acadConn.db);
    studentRepo = new StudentRepository(acadConn.db);
    enrollmentRepo = new EnrollmentRepository(acadConn.db);
    auditRepo = new AcademicAuditRepository(acadConn.db);
  });

  afterEach(() => {
    closeAllDatabases();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createTestStudent(overrides?: Partial<Parameters<StudentRepository['create']>[0]>) {
    const nowIso = new Date().toISOString();
    return studentRepo.create({
      id: crypto.randomUUID(),
      studentCode: `TB-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: 'طالب تجريبي',
      status: 'ACTIVE',
      gradeLevel: 'SEC_1',
      educationSystem: 'GENERAL',
      languageTrack: 'ARABIC',
      guardianPhone: '01012345678',
      qrToken: crypto.randomUUID(),
      barcodeValue: `TB-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...overrides,
    });
  }

  function createTestGroup(overrides?: Partial<Parameters<GroupRepository['create']>[0]>) {
    const nowIso = new Date().toISOString();
    return groupRepo.create({
      id: crypto.randomUUID(),
      name: 'مجموعة أولى ثانوي أ',
      educationSystem: 'GENERAL',
      gradeLevel: 'SEC_1',
      languageTrack: 'ARABIC',
      defaultPaymentType: 'MONTHLY',
      defaultPaymentAmount: 300,
      status: 'ACTIVE',
      createdAt: nowIso,
      updatedAt: nowIso,
      ...overrides,
    });
  }

  describe('enrollStudent', () => {
    it('enrolls a compatible active student and computes inherited payment terms', async () => {
      const group = createTestGroup({ defaultPaymentType: 'MONTHLY', defaultPaymentAmount: 350 });
      const student = createTestStudent();

      const enrollment = await enrollmentService.enrollStudent(
        {
          groupId: group.id,
          studentId: student.id,
        },
        ownerActor
      );

      expect(enrollment.id).toBeDefined();
      expect(enrollment.groupId).toBe(group.id);
      expect(enrollment.studentId).toBe(student.id);
      expect(enrollment.status).toBe('ACTIVE');
      expect(enrollment.leftAt).toBeNull();
      // Payment inheritance
      expect(enrollment.paymentTypeOverride).toBeNull();
      expect(enrollment.paymentAmountOverride).toBeNull();
      expect(enrollment.effectivePaymentType).toBe('MONTHLY');
      expect(enrollment.effectivePaymentAmount).toBe(350);
      expect(enrollment.isPaymentOverridden).toBe(false);

      // Audit check
      const audits = auditRepo.findByEntity('ENROLLMENT', enrollment.id);
      expect(audits).toHaveLength(1);
      expect(audits[0]!.action).toBe('STUDENT_ENROLLED');
    });

    it('enrolls with payment overrides correctly', async () => {
      const group = createTestGroup({ defaultPaymentType: 'MONTHLY', defaultPaymentAmount: 400 });
      const student = createTestStudent();

      const enrollment = await enrollmentService.enrollStudent(
        {
          groupId: group.id,
          studentId: student.id,
          paymentTypeOverride: 'PER_SESSION',
          paymentAmountOverride: 80,
        },
        assistantWithWrite
      );

      expect(enrollment.paymentTypeOverride).toBe('PER_SESSION');
      expect(enrollment.paymentAmountOverride).toBe(80);
      expect(enrollment.effectivePaymentType).toBe('PER_SESSION');
      expect(enrollment.effectivePaymentAmount).toBe(80);
      expect(enrollment.isPaymentOverridden).toBe(true);
    });

    it('rejects enrollment into an archived group', async () => {
      const group = createTestGroup({ status: 'ARCHIVED' });
      const student = createTestStudent();

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          ownerActor
        )
      ).rejects.toThrow('Cannot enroll into an archived group');
    });

    it('rejects enrollment for an inactive student', async () => {
      const group = createTestGroup();
      const student = createTestStudent({ status: 'INACTIVE' });

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          ownerActor
        )
      ).rejects.toThrow('Cannot enroll an inactive student');
    });

    it('rejects educationSystem mismatch', async () => {
      const group = createTestGroup({ educationSystem: 'GENERAL' });
      const student = createTestStudent({ educationSystem: 'EGYPTIAN_BACCALAUREATE' });

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          ownerActor
        )
      ).rejects.toThrow('Education system mismatch');
    });

    it('rejects gradeLevel mismatch', async () => {
      const group = createTestGroup({ gradeLevel: 'SEC_1' });
      const student = createTestStudent({ gradeLevel: 'SEC_2' });

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          ownerActor
        )
      ).rejects.toThrow('Grade level mismatch');
    });

    it('rejects languageTrack mismatch', async () => {
      const group = createTestGroup({ languageTrack: 'LANG_ENGLISH' });
      const student = createTestStudent({ languageTrack: 'ARABIC' });

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          ownerActor
        )
      ).rejects.toThrow('Language track mismatch');
    });

    it('allows enrollment when focusMathBranch is present on group (focusMathBranch is not matched against student)', async () => {
      const group = createTestGroup({
        gradeLevel: 'SEC_3',
        focusMathBranch: 'APPLIED_MATH',
      });
      const student = createTestStudent({
        gradeLevel: 'SEC_3',
      });

      const enrollment = await enrollmentService.enrollStudent(
        { groupId: group.id, studentId: student.id },
        ownerActor
      );
      expect(enrollment.status).toBe('ACTIVE');
    });

    it('rejects duplicate ACTIVE enrollment for the same student + group', async () => {
      const group = createTestGroup();
      const student = createTestStudent();

      await enrollmentService.enrollStudent(
        { groupId: group.id, studentId: student.id },
        ownerActor
      );

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          ownerActor
        )
      ).rejects.toThrow('Student is already actively enrolled in this group');
    });
  });

  describe('endEnrollment and reEnrollStudent lifecycle', () => {
    it('ends enrollment, sets status = ENDED, sets leftAt, and preserves row', async () => {
      const group = createTestGroup();
      const student = createTestStudent();

      const enrolled = await enrollmentService.enrollStudent(
        { groupId: group.id, studentId: student.id },
        ownerActor
      );

      const ended = await enrollmentService.endEnrollment(
        { enrollmentId: enrolled.id, reason: 'انتقال لمجموعة أخرى' },
        ownerActor
      );

      expect(ended.id).toBe(enrolled.id);
      expect(ended.status).toBe('ENDED');
      expect(ended.leftAt).not.toBeNull();

      // Ensure row is still physically present in SQLite
      const raw = enrollmentRepo.findById(enrolled.id);
      expect(raw).not.toBeNull();
      expect(raw?.status).toBe('ENDED');
      expect(raw?.leftAt).not.toBeNull();

      // Audit check
      const audits = auditRepo.findByEntity('ENROLLMENT', enrolled.id);
      expect(audits).toHaveLength(2);
      expect(audits[0]!.action).toBe('ENROLLMENT_ENDED');
    });

    it('allows re-enrollment after previous enrollment was ENDED, preserving both rows', async () => {
      const group = createTestGroup();
      const student = createTestStudent();

      // 1. Initial enrollment
      const first = await enrollmentService.enrollStudent(
        { groupId: group.id, studentId: student.id },
        ownerActor
      );

      // 2. End enrollment
      await enrollmentService.endEnrollment(
        { enrollmentId: first.id, reason: 'توقف مؤقت' },
        ownerActor
      );

      // 3. Re-enroll
      const second = await enrollmentService.reEnrollStudent(
        {
          groupId: group.id,
          studentId: student.id,
          paymentAmountOverride: 250, // discount on re-enrollment
        },
        ownerActor
      );

      expect(second.id).not.toBe(first.id);
      expect(second.status).toBe('ACTIVE');
      expect(second.effectivePaymentAmount).toBe(250);

      // Verify all enrollments for this student
      const allStudentEnrollments = await enrollmentService.listStudentEnrollments(
        student.id,
        false,
        ownerActor
      );
      expect(allStudentEnrollments).toHaveLength(2);

      const activeOnly = await enrollmentService.listStudentEnrollments(
        student.id,
        true,
        ownerActor
      );
      expect(activeOnly).toHaveLength(1);
      expect(activeOnly[0]!.id).toBe(second.id);
    });
  });

  describe('Independent terms across multiple groups', () => {
    it('allows the same student to be enrolled in two groups with independent effective payment terms', async () => {
      const groupA = createTestGroup({
        name: 'مجموعة الجبر',
        defaultPaymentType: 'MONTHLY',
        defaultPaymentAmount: 300,
      });
      const groupB = createTestGroup({
        name: 'مجموعة الهندسة الفراغية',
        defaultPaymentType: 'PER_SESSION',
        defaultPaymentAmount: 70,
      });
      const student = createTestStudent();

      const enrollA = await enrollmentService.enrollStudent(
        {
          groupId: groupA.id,
          studentId: student.id,
          paymentAmountOverride: 200, // special discount for group A
        },
        ownerActor
      );

      const enrollB = await enrollmentService.enrollStudent(
        {
          groupId: groupB.id,
          studentId: student.id, // inherits group B defaults
        },
        ownerActor
      );

      expect(enrollA.effectivePaymentType).toBe('MONTHLY');
      expect(enrollA.effectivePaymentAmount).toBe(200);
      expect(enrollA.isPaymentOverridden).toBe(true);

      expect(enrollB.effectivePaymentType).toBe('PER_SESSION');
      expect(enrollB.effectivePaymentAmount).toBe(70);
      expect(enrollB.isPaymentOverridden).toBe(false);

      const termsA = await enrollmentService.getEffectivePaymentTerms(enrollA.id, ownerActor);
      expect(termsA.amount).toBe(200);

      const termsB = await enrollmentService.getEffectivePaymentTerms(enrollB.id, ownerActor);
      expect(termsB.amount).toBe(70);
    });
  });

  describe('updateEnrollmentPaymentTerms', () => {
    it('updates payment overrides and logs audit entry', async () => {
      const group = createTestGroup({ defaultPaymentAmount: 300 });
      const student = createTestStudent();

      const enrollment = await enrollmentService.enrollStudent(
        { groupId: group.id, studentId: student.id },
        ownerActor
      );
      expect(enrollment.effectivePaymentAmount).toBe(300);

      const updated = await enrollmentService.updateEnrollmentPaymentTerms(
        {
          enrollmentId: enrollment.id,
          paymentAmountOverride: 220,
        },
        ownerActor
      );

      expect(updated.effectivePaymentAmount).toBe(220);
      expect(updated.paymentAmountOverride).toBe(220);
      expect(updated.isPaymentOverridden).toBe(true);

      const audits = auditRepo.findByEntity('ENROLLMENT', enrollment.id);
      expect(audits[0]!.action).toBe('ENROLLMENT_PAYMENT_CHANGED');
    });
  });

  describe('Authorization and Audit Rollback', () => {
    it('denies ASSISTANT without GROUPS_WRITE from mutating enrollments', async () => {
      const group = createTestGroup();
      const student = createTestStudent();

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          assistantReadOnly
        )
      ).rejects.toThrow(/Permission denied|PERMISSION_DENIED/);
    });

    it('rolls back enrollment if audit log insertion fails', async () => {
      const group = createTestGroup();
      const student = createTestStudent();

      vi.spyOn(AcademicAuditRepository.prototype, 'insert').mockImplementationOnce(() => {
        throw new Error('Forced audit failure');
      });

      await expect(
        enrollmentService.enrollStudent(
          { groupId: group.id, studentId: student.id },
          ownerActor
        )
      ).rejects.toThrow('Forced audit failure');

      const enrolled = enrollmentRepo.listByGroup(group.id);
      expect(enrolled).toHaveLength(0);
    });
  });
});
