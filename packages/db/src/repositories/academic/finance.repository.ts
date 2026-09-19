import { eq, and, sql, desc } from 'drizzle-orm';
import { type AcademicDrizzle, getAcademicDatabase } from '../../connection.js';
import {
  payments,
  invoices,
  invoiceItems,
  studentDiscounts,
  type PaymentRow,
  type NewPaymentRow,
  type InvoiceRow,
  type NewInvoiceRow,
  type InvoiceItemRow,
  type NewInvoiceItemRow,
  type StudentDiscountRow,
  type NewStudentDiscountRow,
} from '../../schema/academic.schema.js';
import type { InvoiceStatus } from '@tibyan/contracts';

export class PaymentRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  insert(data: NewPaymentRow): PaymentRow {
    return this.client.insert(payments).values(data).returning().get();
  }

  create(data: NewPaymentRow): PaymentRow {
    return this.insert(data);
  }

  findById(id: string): PaymentRow | null {
    const row = this.client
      .select()
      .from(payments)
      .where(eq(payments.id, id))
      .get();
    return row ?? null;
  }

  findByReceiptNumber(receiptNumber: string): PaymentRow | null {
    const row = this.client
      .select()
      .from(payments)
      .where(eq(payments.receiptNumber, receiptNumber))
      .get();
    return row ?? null;
  }

  listByStudent(studentId: string): PaymentRow[] {
    return this.client
      .select()
      .from(payments)
      .where(eq(payments.studentId, studentId))
      .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
      .all();
  }

  listAll(options?: { studentId?: string; groupId?: string }): PaymentRow[] {
    const conditions = [];
    if (options?.studentId) conditions.push(eq(payments.studentId, options.studentId));
    if (options?.groupId) conditions.push(eq(payments.groupId, options.groupId));

    const query = this.client.select().from(payments);
    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(desc(payments.paymentDate), desc(payments.createdAt)).all();
    }
    return query.orderBy(desc(payments.paymentDate), desc(payments.createdAt)).all();
  }

  countAll(): number {
    const res = this.client
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .get();
    return res?.count ?? 0;
  }

  totalPaidByStudent(studentId: string, groupId?: string): number {
    const conditions = [eq(payments.studentId, studentId)];
    if (groupId) conditions.push(eq(payments.groupId, groupId));

    const res = this.client
      .select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
      .from(payments)
      .where(and(...conditions))
      .get();
    return res?.total ?? 0;
  }

  totalCollected(): number {
    const res = this.client
      .select({ total: sql<number>`COALESCE(SUM(amount_cents), 0)` })
      .from(payments)
      .get();
    return res?.total ?? 0;
  }
}

export class InvoiceRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  insert(
    invoiceData: NewInvoiceRow,
    itemsData: NewInvoiceItemRow[]
  ): { invoice: InvoiceRow; items: InvoiceItemRow[] } {
    const createdInvoice = this.client
      .insert(invoices)
      .values(invoiceData)
      .returning()
      .get();

    const createdItems: InvoiceItemRow[] = [];
    for (const item of itemsData) {
      const createdItem = this.client
        .insert(invoiceItems)
        .values({
          ...item,
          invoiceId: createdInvoice.id,
        })
        .returning()
        .get();
      createdItems.push(createdItem);
    }

    return { invoice: createdInvoice, items: createdItems };
  }

  create(
    invoiceData: NewInvoiceRow,
    itemsData: NewInvoiceItemRow[]
  ): { invoice: InvoiceRow; items: InvoiceItemRow[] } {
    return this.insert(invoiceData, itemsData);
  }

  findById(id: string): { invoice: InvoiceRow; items: InvoiceItemRow[] } | null {
    const inv = this.client
      .select()
      .from(invoices)
      .where(eq(invoices.id, id))
      .get();
    if (!inv) return null;

    const items = this.client
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, id))
      .all();

    return { invoice: inv, items };
  }

  findByInvoiceNumber(invoiceNumber: string): { invoice: InvoiceRow; items: InvoiceItemRow[] } | null {
    const inv = this.client
      .select()
      .from(invoices)
      .where(eq(invoices.invoiceNumber, invoiceNumber))
      .get();
    if (!inv) return null;

    const items = this.client
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, inv.id))
      .all();

    return { invoice: inv, items };
  }

  listByStudent(studentId: string): Array<{ invoice: InvoiceRow; items: InvoiceItemRow[] }> {
    const invList = this.client
      .select()
      .from(invoices)
      .where(eq(invoices.studentId, studentId))
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))
      .all();

    return invList.map((inv) => {
      const items = this.client
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, inv.id))
        .all();
      return { invoice: inv, items };
    });
  }

  listAll(): Array<{ invoice: InvoiceRow; items: InvoiceItemRow[] }> {
    const invList = this.client
      .select()
      .from(invoices)
      .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))
      .all();

    return invList.map((inv) => {
      const items = this.client
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, inv.id))
        .all();
      return { invoice: inv, items };
    });
  }

  updateStatus(
    id: string,
    status: InvoiceStatus,
    paidCents?: number,
    remainingCents?: number
  ): void {
    const updateData: Partial<NewInvoiceRow> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (paidCents !== undefined) updateData.paidCents = paidCents;
    if (remainingCents !== undefined) updateData.remainingCents = remainingCents;

    this.client
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .run();
  }

  countAll(): number {
    const res = this.client
      .select({ count: sql<number>`count(*)` })
      .from(invoices)
      .get();
    return res?.count ?? 0;
  }
}

export class DiscountRepository {
  constructor(private db?: AcademicDrizzle) {}

  private get client(): AcademicDrizzle {
    return this.db ?? getAcademicDatabase().db;
  }

  insert(data: NewStudentDiscountRow): StudentDiscountRow {
    return this.client.insert(studentDiscounts).values(data).returning().get();
  }

  create(data: NewStudentDiscountRow): StudentDiscountRow {
    return this.insert(data);
  }

  findById(id: string): StudentDiscountRow | null {
    const row = this.client
      .select()
      .from(studentDiscounts)
      .where(eq(studentDiscounts.id, id))
      .get();
    return row ?? null;
  }

  listActiveByStudent(studentId: string, groupId?: string): StudentDiscountRow[] {
    const conditions = [
      eq(studentDiscounts.studentId, studentId),
      eq(studentDiscounts.status, 'ACTIVE'),
    ];
    if (groupId) {
      conditions.push(
        sql`(${studentDiscounts.groupId} = ${groupId} OR ${studentDiscounts.groupId} IS NULL)`
      );
    }

    return this.client
      .select()
      .from(studentDiscounts)
      .where(and(...conditions))
      .orderBy(desc(studentDiscounts.createdAt))
      .all();
  }

  listAllByStudent(studentId: string): StudentDiscountRow[] {
    return this.client
      .select()
      .from(studentDiscounts)
      .where(eq(studentDiscounts.studentId, studentId))
      .orderBy(desc(studentDiscounts.createdAt))
      .all();
  }

  updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE'): void {
    this.client
      .update(studentDiscounts)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(studentDiscounts.id, id))
      .run();
  }
}
