import crypto from 'crypto';
import {
  type PaymentDto,
  type RecordPaymentInput,
  type StudentDiscountDto,
  type ApplyDiscountInput,
  type InvoiceDto,
  type CreateInvoiceInput,
  type StudentFinancialSummaryDto,
  type OverallFinanceKpiDto,
  type GroupSubscriptionSummaryDto,
  type FinancialStatus,
  RecordPaymentInputSchema,
  ApplyDiscountInputSchema,
  CreateInvoiceInputSchema,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  getAcademicDatabase,
  PaymentRepository,
  InvoiceRepository,
  DiscountRepository,
  StudentRepository,
  GroupRepository,
  EnrollmentRepository,
  SessionRepository,
  AcademicAuditRepository,
} from '@tibyan/db';
import { requirePermission } from '../auth/permissions.js';
import type { AuthenticatedUser } from '../students/student.service.js';
import { type AnyActor, isSystemActor } from '../groups/session.service.js';

export type FinanceErrorCode =
  | 'STUDENT_NOT_FOUND'
  | 'GROUP_NOT_FOUND'
  | 'INVOICE_NOT_FOUND'
  | 'PAYMENT_NOT_FOUND'
  | 'DISCOUNT_NOT_FOUND'
  | 'INVALID_AMOUNT'
  | 'INVALID_DISCOUNT'
  | 'DISCOUNT_EXCEEDS_CHARGES'
  | 'PERMISSION_DENIED'
  | 'INVALID_INPUT';

export class FinanceError extends Error {
  constructor(public readonly code: FinanceErrorCode, message: string) {
    super(message);
    this.name = 'FinanceError';
  }
}

// --- Money Helper Functions ---

export function egpToCents(egp: number): number {
  return Math.round(egp * 100);
}

export function centsToEgp(cents: number): number {
  return cents / 100;
}

export function formatCentsToArabicEgp(cents: number): string {
  const egp = cents / 100;
  return `${egp.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
}

export class FinanceService {
  public readonly paymentRepo: PaymentRepository;
  public readonly invoiceRepo: InvoiceRepository;
  public readonly discountRepo: DiscountRepository;
  public readonly studentRepo: StudentRepository;
  public readonly groupRepo: GroupRepository;
  public readonly enrollmentRepo: EnrollmentRepository;
  public readonly sessionRepo: SessionRepository;
  public readonly auditRepo: AcademicAuditRepository;

  constructor(private db?: AcademicDrizzle) {
    this.paymentRepo = new PaymentRepository(this.db);
    this.invoiceRepo = new InvoiceRepository(this.db);
    this.discountRepo = new DiscountRepository(this.db);
    this.studentRepo = new StudentRepository(this.db);
    this.groupRepo = new GroupRepository(this.db);
    this.enrollmentRepo = new EnrollmentRepository(this.db);
    this.sessionRepo = new SessionRepository(this.db);
    this.auditRepo = new AcademicAuditRepository(this.db);
  }

  public get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  private requireActorPermissions(actor: AuthenticatedUser | AnyActor, permission: 'PAYMENTS_READ' | 'PAYMENTS_WRITE'): void {
    if (isSystemActor(actor)) return;
    requirePermission(actor.role, actor.permissions ?? [], permission);
  }

  // --- Sequential Identifier Generators ---

  private generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    let count = this.paymentRepo.countAll() + 1;
    let receiptNumber = `REC-${year}-${count.toString().padStart(4, '0')}`;
    while (this.paymentRepo.findByReceiptNumber(receiptNumber)) {
      count++;
      receiptNumber = `REC-${year}-${count.toString().padStart(4, '0')}`;
    }
    return receiptNumber;
  }

  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    let count = this.invoiceRepo.countAll() + 1;
    let invoiceNumber = `INV-${year}-${count.toString().padStart(4, '0')}`;
    while (this.invoiceRepo.findByInvoiceNumber(invoiceNumber)) {
      count++;
      invoiceNumber = `INV-${year}-${count.toString().padStart(4, '0')}`;
    }
    return invoiceNumber;
  }

  // --- Payments ---

  async recordPayment(
    rawInput: RecordPaymentInput,
    actor: AuthenticatedUser | AnyActor
  ): Promise<PaymentDto> {
    this.requireActorPermissions(actor, 'PAYMENTS_WRITE');

    const input = RecordPaymentInputSchema.parse(rawInput);
    const student = this.studentRepo.findById(input.studentId);
    if (!student) {
      throw new FinanceError('STUDENT_NOT_FOUND', `الطالب بالمعرف ${input.studentId} غير موجود`);
    }

    let groupName: string | undefined = undefined;
    if (input.groupId) {
      const group = this.groupRepo.findById(input.groupId);
      if (!group) {
        throw new FinanceError('GROUP_NOT_FOUND', `المجموعة بالمعرف ${input.groupId} غير موجودة`);
      }
      groupName = group.name;
    }

    const now = new Date().toISOString();
    const paymentId = crypto.randomUUID();
    const receiptNumber = this.generateReceiptNumber();

    const actorUserId = isSystemActor(actor) ? null : actor.userId;
    const actorName = actor.fullName;

    const newPayment = this.paymentRepo.insert({
      id: paymentId,
      receiptNumber,
      studentId: student.id,
      groupId: input.groupId ?? null,
      amountCents: input.amountCents,
      paymentMethod: input.paymentMethod,
      paymentDate: input.paymentDate,
      periodMonth: input.periodMonth ?? null,
      notes: input.notes ?? null,
      recordedByUserId: actorUserId ?? 'SYSTEM',
      createdAt: now,
      updatedAt: now,
    });

    // Atomic Audit Log
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: isSystemActor(actor) ? 'SYSTEM' : 'USER',
      actorUserId,
      actorNameSnapshot: actorName,
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      beforeJson: null,
      afterJson: JSON.stringify(newPayment),
      metadataJson: JSON.stringify({
        receiptNumber,
        studentId: student.id,
        amountCents: input.amountCents,
        paymentMethod: input.paymentMethod,
      }),
      createdAt: now,
    });

    return {
      id: newPayment.id,
      receiptNumber: newPayment.receiptNumber,
      studentId: newPayment.studentId,
      studentName: student.fullName,
      studentCode: student.studentCode,
      groupId: newPayment.groupId,
      groupName,
      amountCents: newPayment.amountCents,
      paymentMethod: newPayment.paymentMethod,
      paymentDate: newPayment.paymentDate,
      periodMonth: newPayment.periodMonth,
      notes: newPayment.notes,
      recordedByUserId: newPayment.recordedByUserId,
      createdAt: newPayment.createdAt,
      updatedAt: newPayment.updatedAt,
    };
  }

  async listStudentPayments(studentId: string): Promise<PaymentDto[]> {
    const student = this.studentRepo.findById(studentId);
    if (!student) {
      throw new FinanceError('STUDENT_NOT_FOUND', `الطالب غير موجود`);
    }

    const rows = this.paymentRepo.listByStudent(studentId);
    return rows.map((r) => {
      let groupName: string | undefined = undefined;
      if (r.groupId) {
        const group = this.groupRepo.findById(r.groupId);
        groupName = group?.name;
      }

      return {
        id: r.id,
        receiptNumber: r.receiptNumber,
        studentId: r.studentId,
        studentName: student.fullName,
        studentCode: student.studentCode,
        groupId: r.groupId,
        groupName,
        amountCents: r.amountCents,
        paymentMethod: r.paymentMethod,
        paymentDate: r.paymentDate,
        periodMonth: r.periodMonth,
        notes: r.notes,
        recordedByUserId: r.recordedByUserId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  }

  // --- Discounts ---

  async applyDiscount(
    rawInput: ApplyDiscountInput,
    actor: AuthenticatedUser | AnyActor
  ): Promise<StudentDiscountDto> {
    this.requireActorPermissions(actor, 'PAYMENTS_WRITE');

    const input = ApplyDiscountInputSchema.parse(rawInput);
    const student = this.studentRepo.findById(input.studentId);
    if (!student) {
      throw new FinanceError('STUDENT_NOT_FOUND', `الطالب غير موجود`);
    }

    let groupName: string | undefined = undefined;
    if (input.groupId) {
      const group = this.groupRepo.findById(input.groupId);
      if (!group) {
        throw new FinanceError('GROUP_NOT_FOUND', `المجموعة غير موجودة`);
      }
      groupName = group.name;
    }

    const now = new Date().toISOString();
    const discountId = crypto.randomUUID();
    const actorUserId = isSystemActor(actor) ? null : actor.userId;
    const actorName = actor.fullName;

    const newDiscount = this.discountRepo.insert({
      id: discountId,
      studentId: student.id,
      groupId: input.groupId ?? null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      reason: input.reason,
      status: 'ACTIVE',
      appliedByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    });

    // Audit log
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: isSystemActor(actor) ? 'SYSTEM' : 'USER',
      actorUserId,
      actorNameSnapshot: actorName,
      action: 'DISCOUNT_APPLIED',
      entityType: 'STUDENT_DISCOUNT',
      entityId: discountId,
      beforeJson: null,
      afterJson: JSON.stringify(newDiscount),
      metadataJson: JSON.stringify({
        studentId: student.id,
        discountType: input.discountType,
        discountValue: input.discountValue,
      }),
      createdAt: now,
    });

    return {
      id: newDiscount.id,
      studentId: newDiscount.studentId,
      groupId: newDiscount.groupId,
      groupName,
      discountType: newDiscount.discountType,
      discountValue: newDiscount.discountValue,
      reason: newDiscount.reason,
      status: newDiscount.status,
      appliedByUserId: newDiscount.appliedByUserId,
      createdAt: newDiscount.createdAt,
      updatedAt: newDiscount.updatedAt,
    };
  }

  async listDiscounts(studentId: string): Promise<StudentDiscountDto[]> {
    const rows = this.discountRepo.listAllByStudent(studentId);
    return rows.map((r) => {
      let groupName: string | undefined = undefined;
      if (r.groupId) {
        const group = this.groupRepo.findById(r.groupId);
        groupName = group?.name;
      }
      return {
        id: r.id,
        studentId: r.studentId,
        groupId: r.groupId,
        groupName,
        discountType: r.discountType,
        discountValue: r.discountValue,
        reason: r.reason,
        status: r.status,
        appliedByUserId: r.appliedByUserId,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  }

  // --- Financial Summary & Balance Calculations ---

  async getStudentFinancialSummary(studentId: string): Promise<StudentFinancialSummaryDto> {
    const student = this.studentRepo.findById(studentId);
    if (!student) {
      throw new FinanceError('STUDENT_NOT_FOUND', `الطالب غير موجود`);
    }

    const enrollments = this.enrollmentRepo.listByStudent(studentId);
    const paymentsList = this.paymentRepo.listByStudent(studentId);
    const activeDiscounts = this.discountRepo.listActiveByStudent(studentId);

    let totalChargesCents = 0;
    const subscriptions: GroupSubscriptionSummaryDto[] = [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    for (const enr of enrollments) {
      if (enr.status !== 'ACTIVE' && !enr.leftAt) continue;

      const group = this.groupRepo.findById(enr.groupId);
      if (!group) continue;

      const paymentType = enr.paymentTypeOverride ?? group.defaultPaymentType;
      const rateCents = enr.paymentAmountOverride !== null && enr.paymentAmountOverride !== undefined
        ? egpToCents(enr.paymentAmountOverride)
        : egpToCents(group.defaultPaymentAmount);

      let groupChargeCents = 0;
      let monthsCount = 0;
      let sessionsCount = 0;

      if (paymentType === 'MONTHLY') {
        // Calculate number of active months since enrollment date
        const enrolledDate = new Date(enr.enrolledAt);
        const startYear = enrolledDate.getFullYear();
        const startMonth = enrolledDate.getMonth();
        
        monthsCount = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
        if (monthsCount < 1) monthsCount = 1;

        groupChargeCents = rateCents * monthsCount;
      } else {
        // PER_SESSION billing
        const groupSessions = this.sessionRepo.listByGroup(group.id);
        const completedSessions = groupSessions.filter(
          (s) => s.status === 'COMPLETED' || s.effectiveDate <= now.toISOString().slice(0, 10)
        );
        sessionsCount = completedSessions.length;
        groupChargeCents = rateCents * sessionsCount;
      }

      const groupPaidCents = paymentsList
        .filter((p) => p.groupId === group.id)
        .reduce((sum, p) => sum + p.amountCents, 0);

      const groupBalanceCents = Math.max(0, groupChargeCents - groupPaidCents);

      subscriptions.push({
        groupId: group.id,
        groupName: group.name,
        paymentType,
        rateCents,
        enrolledAt: enr.enrolledAt,
        sessionsCount: paymentType === 'PER_SESSION' ? sessionsCount : undefined,
        monthsCount: paymentType === 'MONTHLY' ? monthsCount : undefined,
        totalChargeCents: groupChargeCents,
        totalPaidCents: groupPaidCents,
        balanceCents: groupBalanceCents,
      });

      totalChargesCents += groupChargeCents;
    }

    // Calculate Discounts
    let totalDiscountsCents = 0;
    for (const d of activeDiscounts) {
      if (d.discountType === 'PERCENTAGE') {
        const applicableCharges = d.groupId
          ? (subscriptions.find((s) => s.groupId === d.groupId)?.totalChargeCents ?? 0)
          : totalChargesCents;
        const discountAmount = Math.round((applicableCharges * d.discountValue) / 100);
        totalDiscountsCents += discountAmount;
      } else {
        totalDiscountsCents += d.discountValue;
      }
    }

    // Discounts cannot make payable amount negative
    totalDiscountsCents = Math.min(totalDiscountsCents, totalChargesCents);
    const netPayableCents = Math.max(0, totalChargesCents - totalDiscountsCents);

    // Total Payments
    const totalPaidCents = paymentsList.reduce((sum, p) => sum + p.amountCents, 0);
    const remainingBalanceCents = Math.max(0, netPayableCents - totalPaidCents);

    // Status Determination
    let status: FinancialStatus = 'UNPAID';
    if (netPayableCents === 0 || remainingBalanceCents === 0) {
      status = 'PAID';
    } else if (totalPaidCents > 0) {
      status = 'PARTIALLY_PAID';
    } else {
      status = 'UNPAID';
    }

    const recentPayments: PaymentDto[] = paymentsList.slice(0, 10).map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      studentId: p.studentId,
      studentName: student.fullName,
      studentCode: student.studentCode,
      groupId: p.groupId,
      amountCents: p.amountCents,
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      periodMonth: p.periodMonth,
      notes: p.notes,
      recordedByUserId: p.recordedByUserId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return {
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.studentCode,
      guardianPhone: student.guardianPhone,
      gradeLevel: student.gradeLevel,
      totalChargesCents,
      totalDiscountsCents,
      netPayableCents,
      totalPaidCents,
      remainingBalanceCents,
      status,
      subscriptions,
      recentPayments,
    };
  }

  async listAllSummaries(filter?: {
    groupId?: string;
    status?: FinancialStatus;
    search?: string;
  }): Promise<StudentFinancialSummaryDto[]> {
    const studentsList = this.studentRepo.list({
      searchQuery: filter?.search,
      status: 'ACTIVE',
    });

    const summaries: StudentFinancialSummaryDto[] = [];
    for (const student of studentsList) {
      const summary = await this.getStudentFinancialSummary(student.id);

      // Filter by group if requested
      if (filter?.groupId) {
        const isInGroup = summary.subscriptions.some((s) => s.groupId === filter.groupId);
        if (!isInGroup) continue;
      }

      // Filter by status if requested
      if (filter?.status && summary.status !== filter.status) {
        continue;
      }

      summaries.push(summary);
    }

    return summaries;
  }

  async getOverallFinanceKpi(): Promise<OverallFinanceKpiDto> {
    const summaries = await this.listAllSummaries();

    let totalChargesCents = 0;
    let totalCollectedCents = 0;
    let totalOutstandingCents = 0;
    let totalDiscountsCents = 0;
    let paidStudentsCount = 0;
    let unpaidStudentsCount = 0;

    for (const s of summaries) {
      totalChargesCents += s.totalChargesCents;
      totalCollectedCents += s.totalPaidCents;
      totalOutstandingCents += s.remainingBalanceCents;
      totalDiscountsCents += s.totalDiscountsCents;
      if (s.status === 'PAID') {
        paidStudentsCount++;
      } else {
        unpaidStudentsCount++;
      }
    }

    return {
      totalChargesCents,
      totalCollectedCents,
      totalOutstandingCents,
      totalDiscountsCents,
      activeStudentsCount: summaries.length,
      paidStudentsCount,
      unpaidStudentsCount,
    };
  }

  // --- Invoicing ---

  async createInvoice(
    rawInput: CreateInvoiceInput,
    actor: AuthenticatedUser | AnyActor
  ): Promise<InvoiceDto> {
    this.requireActorPermissions(actor, 'PAYMENTS_WRITE');

    const input = CreateInvoiceInputSchema.parse(rawInput);
    const student = this.studentRepo.findById(input.studentId);
    if (!student) {
      throw new FinanceError('STUDENT_NOT_FOUND', `الطالب غير موجود`);
    }

    let groupName: string | undefined = undefined;
    if (input.groupId) {
      const group = this.groupRepo.findById(input.groupId);
      groupName = group?.name;
    }

    // Calculate subtotal from items
    let subtotalCents = 0;
    const itemsData = input.items.map((item) => {
      const amountCents = item.quantity * item.unitPriceCents;
      subtotalCents += amountCents;
      return {
        id: crypto.randomUUID(),
        invoiceId: '', // Set by repository
        description: item.description,
        itemType: item.itemType,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        amountCents,
        sessionId: item.sessionId ?? null,
      };
    });

    const discountCents = Math.min(input.discountCents ?? 0, subtotalCents);
    const totalCents = Math.max(0, subtotalCents - discountCents);

    // Payments already made for this student
    const totalPaid = this.paymentRepo.totalPaidByStudent(student.id, input.groupId ?? undefined);
    const paidCents = Math.min(totalPaid, totalCents);
    const remainingCents = Math.max(0, totalCents - paidCents);

    const status = remainingCents === 0 ? 'PAID' : paidCents > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

    const now = new Date().toISOString();
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = this.generateInvoiceNumber();

    const { invoice: createdInvoice, items: createdItems } = this.invoiceRepo.insert(
      {
        id: invoiceId,
        invoiceNumber,
        studentId: student.id,
        groupId: input.groupId ?? null,
        issueDate: input.issueDate,
        dueDate: input.dueDate ?? null,
        periodMonth: input.periodMonth ?? null,
        subtotalCents,
        discountCents,
        totalCents,
        paidCents,
        remainingCents,
        status,
        notes: input.notes ?? null,
        createdAt: now,
        updatedAt: now,
      },
      itemsData
    );

    // Audit log
    const actorUserId = isSystemActor(actor) ? null : actor.userId;
    const actorName = actor.fullName;
    this.auditRepo.insert({
      id: crypto.randomUUID(),
      actorType: isSystemActor(actor) ? 'SYSTEM' : 'USER',
      actorUserId,
      actorNameSnapshot: actorName,
      action: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: invoiceId,
      beforeJson: null,
      afterJson: JSON.stringify(createdInvoice),
      metadataJson: JSON.stringify({
        invoiceNumber,
        studentId: student.id,
        totalCents,
      }),
      createdAt: now,
    });

    return {
      id: createdInvoice.id,
      invoiceNumber: createdInvoice.invoiceNumber,
      studentId: createdInvoice.studentId,
      studentName: student.fullName,
      studentCode: student.studentCode,
      groupId: createdInvoice.groupId,
      groupName,
      issueDate: createdInvoice.issueDate,
      dueDate: createdInvoice.dueDate,
      periodMonth: createdInvoice.periodMonth,
      subtotalCents: createdInvoice.subtotalCents,
      discountCents: createdInvoice.discountCents,
      totalCents: createdInvoice.totalCents,
      paidCents: createdInvoice.paidCents,
      remainingCents: createdInvoice.remainingCents,
      status: createdInvoice.status,
      notes: createdInvoice.notes,
      items: createdItems.map((i) => ({
        id: i.id,
        invoiceId: i.invoiceId,
        description: i.description,
        itemType: i.itemType,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        amountCents: i.amountCents,
        sessionId: i.sessionId,
      })),
      createdAt: createdInvoice.createdAt,
      updatedAt: createdInvoice.updatedAt,
    };
  }

  async getInvoice(invoiceId: string): Promise<InvoiceDto> {
    const result = this.invoiceRepo.findById(invoiceId);
    if (!result) {
      throw new FinanceError('INVOICE_NOT_FOUND', `الفاتورة غير موجودة`);
    }

    const { invoice, items } = result;
    const student = this.studentRepo.findById(invoice.studentId);
    let groupName: string | undefined = undefined;
    if (invoice.groupId) {
      const group = this.groupRepo.findById(invoice.groupId);
      groupName = group?.name;
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentId: invoice.studentId,
      studentName: student?.fullName,
      studentCode: student?.studentCode,
      groupId: invoice.groupId,
      groupName,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      periodMonth: invoice.periodMonth,
      subtotalCents: invoice.subtotalCents,
      discountCents: invoice.discountCents,
      totalCents: invoice.totalCents,
      paidCents: invoice.paidCents,
      remainingCents: invoice.remainingCents,
      status: invoice.status,
      notes: invoice.notes,
      items: items.map((i) => ({
        id: i.id,
        invoiceId: i.invoiceId,
        description: i.description,
        itemType: i.itemType,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        amountCents: i.amountCents,
        sessionId: i.sessionId,
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  async listStudentInvoices(studentId: string): Promise<InvoiceDto[]> {
    const student = this.studentRepo.findById(studentId);
    const results = this.invoiceRepo.listByStudent(studentId);

    return results.map(({ invoice, items }) => {
      let groupName: string | undefined = undefined;
      if (invoice.groupId) {
        const group = this.groupRepo.findById(invoice.groupId);
        groupName = group?.name;
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        studentId: invoice.studentId,
        studentName: student?.fullName,
        studentCode: student?.studentCode,
        groupId: invoice.groupId,
        groupName,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        periodMonth: invoice.periodMonth,
        subtotalCents: invoice.subtotalCents,
        discountCents: invoice.discountCents,
        totalCents: invoice.totalCents,
        paidCents: invoice.paidCents,
        remainingCents: invoice.remainingCents,
        status: invoice.status,
        notes: invoice.notes,
        items: items.map((i) => ({
          id: i.id,
          invoiceId: i.invoiceId,
          description: i.description,
          itemType: i.itemType,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
          amountCents: i.amountCents,
          sessionId: i.sessionId,
        })),
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      };
    });
  }
}
