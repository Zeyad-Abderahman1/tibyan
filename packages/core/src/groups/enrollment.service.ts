import crypto from 'crypto';
import {
  type GroupEnrollmentDto,
  type EnrollStudentInput,
  type UpdateEnrollmentPaymentInput,
  type EndEnrollmentInput,
  EnrollStudentSchema,
  UpdateEnrollmentPaymentSchema,
  EndEnrollmentSchema,
  type PermissionCode,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  getAcademicDatabase,
  GroupRepository,
  StudentRepository,
  EnrollmentRepository,
  AcademicAuditRepository,
  type GroupEnrollmentRow,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import { calculateEffectivePayment, type EffectivePaymentTerms } from './payment-inheritance.js';
import type { AuthenticatedUser } from '../students/student.service.js';

export type EnrollmentErrorCode =
  | 'GROUP_NOT_FOUND'
  | 'GROUP_ARCHIVED'
  | 'STUDENT_NOT_FOUND'
  | 'STUDENT_INACTIVE'
  | 'STUDENT_GROUP_MISMATCH'
  | 'ENROLLMENT_ALREADY_ACTIVE'
  | 'ENROLLMENT_NOT_FOUND'
  | 'INVALID_PAYMENT_OVERRIDE'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class EnrollmentError extends Error {
  constructor(public readonly code: EnrollmentErrorCode, message: string) {
    super(message);
    this.name = 'EnrollmentError';
  }
}

export class EnrollmentService {
  public readonly groupRepo: GroupRepository;
  public readonly studentRepo: StudentRepository;
  public readonly enrollmentRepo: EnrollmentRepository;
  public readonly auditRepo: AcademicAuditRepository;

  constructor(private db?: AcademicDrizzle) {
    this.groupRepo = new GroupRepository(this.db);
    this.studentRepo = new StudentRepository(this.db);
    this.enrollmentRepo = new EnrollmentRepository(this.db);
    this.auditRepo = new AcademicAuditRepository(this.db);
  }

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  private parseSchema<T>(schema: { parse: (v: any) => T }, data: any): T {
    try {
      return schema.parse(data);
    } catch (err: any) {
      throw new EnrollmentError('INVALID_INPUT', err.message || 'Validation error');
    }
  }

  private checkPermission(actor: AuthenticatedUser, permission: PermissionCode): void {
    try {
      requirePermission(actor.role, actor.permissions ?? [], permission);
    } catch (err: any) {
      throw new EnrollmentError(
        'PERMISSION_DENIED',
        err.message || `Permission denied: ${permission}`
      );
    }
  }

  private toEnrollmentDto(
    row: GroupEnrollmentRow,
    groupName?: string,
    studentName?: string,
    studentCode?: string
  ): GroupEnrollmentDto {
    const group = this.groupRepo.findById(row.groupId);
    let effective: EffectivePaymentTerms | undefined;

    if (group) {
      effective = calculateEffectivePayment(
        {
          defaultPaymentType: group.defaultPaymentType,
          defaultPaymentAmount: group.defaultPaymentAmount,
        },
        {
          paymentTypeOverride: row.paymentTypeOverride,
          paymentAmountOverride: row.paymentAmountOverride,
        }
      );
    }

    return {
      id: row.id,
      groupId: row.groupId,
      groupName: groupName ?? group?.name,
      studentId: row.studentId,
      studentName,
      studentCode,
      enrolledAt: row.enrolledAt,
      leftAt: row.leftAt,
      status: row.status as 'ACTIVE' | 'ENDED',
      paymentTypeOverride: row.paymentTypeOverride,
      paymentAmountOverride: row.paymentAmountOverride,
      effectivePaymentType: effective?.paymentType,
      effectivePaymentAmount: effective?.amount,
      isPaymentOverridden: effective?.isOverridden,
      createdAt: row.createdAt,
    };
  }

  /**
   * Enrolls a student into a group after strict validation of compatibility, active status,
   * and absence of duplicate active enrollments.
   */
  async enrollStudent(
    input: EnrollStudentInput,
    actor: AuthenticatedUser
  ): Promise<GroupEnrollmentDto> {
    const validated = this.parseSchema(EnrollStudentSchema, input);
    this.checkPermission(actor, 'GROUPS_WRITE');

    const group = this.groupRepo.findById(validated.groupId);
    if (!group) {
      throw new EnrollmentError('GROUP_NOT_FOUND', `Group not found: ${validated.groupId}`);
    }

    if (group.status === 'ARCHIVED') {
      throw new EnrollmentError('GROUP_ARCHIVED', 'Cannot enroll into an archived group');
    }

    const student = this.studentRepo.findById(validated.studentId);
    if (!student) {
      throw new EnrollmentError('STUDENT_NOT_FOUND', `Student not found: ${validated.studentId}`);
    }

    if (student.status === 'INACTIVE') {
      throw new EnrollmentError('STUDENT_INACTIVE', 'Cannot enroll an inactive student');
    }

    // Strict compatibility checks: educationSystem, gradeLevel, languageTrack
    if (student.educationSystem !== group.educationSystem) {
      throw new EnrollmentError(
        'STUDENT_GROUP_MISMATCH',
        `Education system mismatch: student is ${student.educationSystem}, group is ${group.educationSystem}`
      );
    }

    if (student.gradeLevel !== group.gradeLevel) {
      throw new EnrollmentError(
        'STUDENT_GROUP_MISMATCH',
        `Grade level mismatch: student is ${student.gradeLevel}, group is ${group.gradeLevel}`
      );
    }

    if (student.languageTrack !== group.languageTrack) {
      throw new EnrollmentError(
        'STUDENT_GROUP_MISMATCH',
        `Language track mismatch: student is ${student.languageTrack}, group is ${group.languageTrack}`
      );
    }

    // Check for existing ACTIVE enrollment
    const existingActive = this.enrollmentRepo.findActiveEnrollment(
      validated.groupId,
      validated.studentId
    );
    if (existingActive) {
      throw new EnrollmentError(
        'ENROLLMENT_ALREADY_ACTIVE',
        `Student is already actively enrolled in this group (enrollment ID: ${existingActive.id})`
      );
    }

    const enrollmentId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const created = this.client.transaction((tx) => {
      const enrollmentRepoTx = new EnrollmentRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const row = enrollmentRepoTx.create({
        id: enrollmentId,
        groupId: validated.groupId,
        studentId: validated.studentId,
        enrolledAt: nowIso,
        leftAt: null,
        status: 'ACTIVE',
        paymentTypeOverride: validated.paymentTypeOverride ?? null,
        paymentAmountOverride: validated.paymentAmountOverride ?? null,
        createdAt: nowIso,
      });

      const dto = this.toEnrollmentDto(
        row,
        group.name,
        student.fullName,
        student.studentCode
      );

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action: 'STUDENT_ENROLLED',
        entityType: 'ENROLLMENT',
        entityId: enrollmentId,
        beforeJson: null,
        afterJson: JSON.stringify(dto),
        metadataJson: JSON.stringify({
          groupId: validated.groupId,
          groupName: group.name,
          studentId: validated.studentId,
          studentName: student.fullName,
          studentCode: student.studentCode,
          paymentTypeOverride: validated.paymentTypeOverride,
          paymentAmountOverride: validated.paymentAmountOverride,
        }),
        createdAt: nowIso,
      });

      return row;
    });

    return this.toEnrollmentDto(created, group.name, student.fullName, student.studentCode);
  }

  /**
   * Re-enrolls a student into a group. Creates a new ACTIVE record and preserves previous ENDED rows.
   */
  async reEnrollStudent(
    input: EnrollStudentInput,
    actor: AuthenticatedUser
  ): Promise<GroupEnrollmentDto> {
    return this.enrollStudent(input, actor);
  }

  /**
   * Ends an active enrollment, recording the departure timestamp and preserving the history row.
   */
  async endEnrollment(
    input: EndEnrollmentInput,
    actor: AuthenticatedUser
  ): Promise<GroupEnrollmentDto> {
    const validated = this.parseSchema(EndEnrollmentSchema, input);
    this.checkPermission(actor, 'GROUPS_WRITE');

    const existing = this.enrollmentRepo.findById(validated.enrollmentId);
    if (!existing) {
      throw new EnrollmentError(
        'ENROLLMENT_NOT_FOUND',
        `Enrollment not found: ${validated.enrollmentId}`
      );
    }

    if (existing.status === 'ENDED') {
      return this.toEnrollmentDto(existing);
    }

    const nowIso = new Date().toISOString();

    const ended = this.client.transaction((tx) => {
      const enrollmentRepoTx = new EnrollmentRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      enrollmentRepoTx.endEnrollment(existing.id, nowIso);
      const updated = enrollmentRepoTx.findById(existing.id)!;

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action: 'ENROLLMENT_ENDED',
        entityType: 'ENROLLMENT',
        entityId: existing.id,
        beforeJson: JSON.stringify(this.toEnrollmentDto(existing)),
        afterJson: JSON.stringify(this.toEnrollmentDto(updated)),
        metadataJson: JSON.stringify({
          reason: validated.reason ?? null,
          leftAt: nowIso,
        }),
        createdAt: nowIso,
      });

      return updated;
    });

    return this.toEnrollmentDto(ended);
  }

  /**
   * Updates payment overrides on an existing enrollment row.
   */
  async updateEnrollmentPaymentTerms(
    input: UpdateEnrollmentPaymentInput,
    actor: AuthenticatedUser
  ): Promise<GroupEnrollmentDto> {
    const validated = this.parseSchema(UpdateEnrollmentPaymentSchema, input);
    this.checkPermission(actor, 'GROUPS_WRITE');

    const existing = this.enrollmentRepo.findById(validated.enrollmentId);
    if (!existing) {
      throw new EnrollmentError(
        'ENROLLMENT_NOT_FOUND',
        `Enrollment not found: ${validated.enrollmentId}`
      );
    }

    const nowIso = new Date().toISOString();

    const updated = this.client.transaction((tx) => {
      const enrollmentRepoTx = new EnrollmentRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      const updatedRow = enrollmentRepoTx.updatePaymentOverrides(
        existing.id,
        validated.paymentTypeOverride,
        validated.paymentAmountOverride
      )!;

      auditRepoTx.insert({
        id: crypto.randomUUID(),
        actorType: 'USER',
        actorUserId: actor.userId,
        actorNameSnapshot: actor.fullName,
        action: 'ENROLLMENT_PAYMENT_CHANGED',
        entityType: 'ENROLLMENT',
        entityId: existing.id,
        beforeJson: JSON.stringify(this.toEnrollmentDto(existing)),
        afterJson: JSON.stringify(this.toEnrollmentDto(updatedRow)),
        metadataJson: JSON.stringify({
          paymentTypeOverride: validated.paymentTypeOverride,
          paymentAmountOverride: validated.paymentAmountOverride,
        }),
        createdAt: nowIso,
      });

      return updatedRow;
    });

    return this.toEnrollmentDto(updated);
  }

  /**
   * Calculates the current effective payment terms for an enrollment.
   */
  async getEffectivePaymentTerms(
    enrollmentId: string,
    actor: AuthenticatedUser
  ): Promise<EffectivePaymentTerms> {
    this.checkPermission(actor, 'GROUPS_READ');

    const enrollment = this.enrollmentRepo.findById(enrollmentId);
    if (!enrollment) {
      throw new EnrollmentError('ENROLLMENT_NOT_FOUND', `Enrollment not found: ${enrollmentId}`);
    }

    const group = this.groupRepo.findById(enrollment.groupId);
    if (!group) {
      throw new EnrollmentError('GROUP_NOT_FOUND', `Group not found: ${enrollment.groupId}`);
    }

    return calculateEffectivePayment(
      {
        defaultPaymentType: group.defaultPaymentType,
        defaultPaymentAmount: group.defaultPaymentAmount,
      },
      {
        paymentTypeOverride: enrollment.paymentTypeOverride,
        paymentAmountOverride: enrollment.paymentAmountOverride,
      }
    );
  }

  /**
   * Lists enrollments for a specific group.
   */
  async listGroupEnrollments(
    groupId: string,
    activeOnly: boolean = false,
    actor: AuthenticatedUser
  ): Promise<GroupEnrollmentDto[]> {
    this.checkPermission(actor, 'GROUPS_READ');

    const group = this.groupRepo.findById(groupId);
    if (!group) {
      throw new EnrollmentError('GROUP_NOT_FOUND', `Group not found: ${groupId}`);
    }

    const rows = this.enrollmentRepo.listByGroup(groupId, activeOnly);
    return rows.map((row) => {
      const student = this.studentRepo.findById(row.studentId);
      return this.toEnrollmentDto(row, group.name, student?.fullName, student?.studentCode);
    });
  }

  /**
   * Lists enrollments for a specific student across all groups.
   */
  async listStudentEnrollments(
    studentId: string,
    activeOnly: boolean = false,
    actor: AuthenticatedUser
  ): Promise<GroupEnrollmentDto[]> {
    this.checkPermission(actor, 'GROUPS_READ');

    const student = this.studentRepo.findById(studentId);
    if (!student) {
      throw new EnrollmentError('STUDENT_NOT_FOUND', `Student not found: ${studentId}`);
    }

    const rows = this.enrollmentRepo.listByStudent(studentId, activeOnly);
    return rows.map((row) => {
      const group = this.groupRepo.findById(row.groupId);
      return this.toEnrollmentDto(row, group?.name, student.fullName, student.studentCode);
    });
  }
}
