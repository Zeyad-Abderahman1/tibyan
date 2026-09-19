import crypto from 'crypto';
import {
  type ThermalReceiptDto,
  type ThermalPaperWidth,
  type PaymentMethod,
  type GradeLevel,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  PaymentRepository,
  StudentRepository,
  GroupRepository,
} from '@tibyan/db';
import { FinanceService, formatCentsToArabicEgp, FinanceError } from './finance.service.js';
import type { AuthenticatedUser } from '../students/student.service.js';
import { type AnyActor, isSystemActor } from '../groups/session.service.js';
import { requirePermission } from '../auth/permissions.js';

export const GRADE_LEVEL_ARABIC_NAMES: Record<GradeLevel, string> = {
  PREP_1: 'الصف الأول الإعدادي',
  PREP_2: 'الصف الثاني الإعدادي',
  PREP_3: 'الصف الثالث الإعدادي',
  SEC_1: 'الصف الأول الثانوي',
  SEC_2: 'الصف الثاني الثانوي',
  SEC_3: 'الصف الثالث الثانوي',
};

export const PAYMENT_METHOD_ARABIC_NAMES: Record<PaymentMethod, string> = {
  CASH: 'نقدي',
  VODAFONE_CASH: 'فودافون كاش',
  INSTAPAY: 'إنستاباي',
  BANK_TRANSFER: 'تحويل بنكي',
  OTHER: 'أخرى',
};

export class ThermalReceiptService {
  private readonly paymentRepo: PaymentRepository;
  private readonly studentRepo: StudentRepository;
  private readonly groupRepo: GroupRepository;
  private readonly financeService: FinanceService;

  constructor(private db?: AcademicDrizzle) {
    this.paymentRepo = new PaymentRepository(this.db);
    this.studentRepo = new StudentRepository(this.db);
    this.groupRepo = new GroupRepository(this.db);
    this.financeService = new FinanceService(this.db);
  }

  private requireActorPermissions(actor: AuthenticatedUser | AnyActor): void {
    if (isSystemActor(actor)) return;
    requirePermission(actor.role, actor.permissions ?? [], 'PAYMENTS_READ');
  }

  /**
   * Authoritative loader for thermal receipt data.
   * Loads persisted payment record, student details, group info, and remaining balance.
   * Never mutates the database; safe for idempotent receipt printing and reprinting.
   */
  public async getThermalReceiptData(paymentId: string, actor: AuthenticatedUser | AnyActor): Promise<ThermalReceiptDto> {
    this.requireActorPermissions(actor);

    const payment = this.paymentRepo.findById(paymentId);
    if (!payment) {
      throw new FinanceError('PAYMENT_NOT_FOUND', `سجل الدفعة بالمعرف ${paymentId} غير موجود`);
    }

    const student = this.studentRepo.findById(payment.studentId);
    if (!student) {
      throw new FinanceError('STUDENT_NOT_FOUND', `الطالب المرتبط بالدفعة غير موجود`);
    }

    let groupName: string | undefined;
    if (payment.groupId) {
      const group = this.groupRepo.findById(payment.groupId);
      if (group) {
        groupName = group.name;
      }
    }

    // Get current financial summary for the student to derive remaining balance
    let remainingBalanceCents: number | undefined;
    let remainingBalanceFormatted: string | undefined;
    try {
      const summary = await this.financeService.getStudentFinancialSummary(student.id);
      remainingBalanceCents = summary.remainingBalanceCents;
      remainingBalanceFormatted = formatCentsToArabicEgp(summary.remainingBalanceCents);
    } catch {
      // If summary calculation fails, balance remains undefined without blocking receipt
    }

    const gradeLevel = student.gradeLevel as GradeLevel;
    const gradeLevelNameAr = GRADE_LEVEL_ARABIC_NAMES[gradeLevel] || gradeLevel;
    const paymentMethodNameAr = PAYMENT_METHOD_ARABIC_NAMES[payment.paymentMethod as PaymentMethod] || payment.paymentMethod;

    const teacherName = actor.fullName || 'أ. زياد محمد';
    const operatorName = actor.fullName || 'المسؤول';

    return {
      paymentId: payment.id,
      receiptNumber: payment.receiptNumber,
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.studentCode,
      gradeLevel: student.gradeLevel,
      gradeLevelNameAr,
      groupName,
      amountCents: payment.amountCents,
      amountFormatted: formatCentsToArabicEgp(payment.amountCents),
      paymentMethod: payment.paymentMethod as PaymentMethod,
      paymentMethodNameAr,
      paymentDate: payment.paymentDate,
      periodMonth: payment.periodMonth,
      remainingBalanceCents,
      remainingBalanceFormatted,
      teacherName,
      operatorName,
      notes: payment.notes,
      issuedAt: new Date().toISOString(),
      isTestReceipt: false,
    };
  }

  /**
   * Generates a non-financial test receipt for printer testing.
   * Completely decoupled from persistence, zero DB side effects.
   */
  public generateTestReceiptData(paperWidth: ThermalPaperWidth = '80mm', teacherName?: string): ThermalReceiptDto {
    const dummyId = crypto.randomUUID();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    return {
      paymentId: dummyId,
      receiptNumber: 'TEST-0000',
      studentId: dummyId,
      studentName: 'طالب تجريبي — فحص الطابعة',
      studentCode: 'TB-TEST',
      gradeLevel: 'PREP_1',
      gradeLevelNameAr: 'الصف الأول الإعدادي',
      groupName: `مجموعة الرياضيات (${paperWidth})`,
      amountCents: 15000,
      amountFormatted: formatCentsToArabicEgp(15000),
      paymentMethod: 'CASH',
      paymentMethodNameAr: 'نقدي',
      paymentDate: dateStr,
      periodMonth: dateStr.slice(0, 7),
      remainingBalanceCents: 0,
      remainingBalanceFormatted: formatCentsToArabicEgp(0),
      teacherName: teacherName || 'أ. زياد محمد (مدرس الرياضيات)',
      operatorName: 'المشرف',
      notes: `إيصال اختبار للتأكد من جودة خطوط وأبعاد ورق ${paperWidth}`,
      issuedAt: now.toISOString(),
      isTestReceipt: true,
    };
  }
}
