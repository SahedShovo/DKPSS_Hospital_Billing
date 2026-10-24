import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { duePayments, bills, payments, patients, users } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { CreateDuePaymentDto } from './dto/create-due-payment.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@Injectable()
export class DuePaymentService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private auditLog: AuditLogService,
  ) {}

  async getOutstanding(patientId: number, db: any = this.db): Promise<Money> {
    const [{ sum: billDue }] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${bills.dueAmount}),0)` })
      .from(bills)
      .where(and(eq(bills.patientId, patientId), eq(bills.status, 'ACTIVE')));

    return Money.of(billDue);
  }

  async findPatientsWithOutstanding({ page, pageSize }: PageQueryDto) {
    const [patientRows, billRows] = await Promise.all([
      this.db
        .select({ id: patients.id, patientCode: patients.patientCode, name: patients.name, phone: patients.phone })
        .from(patients),
      this.db
        .select({ patientId: bills.patientId, total: sql<string>`COALESCE(SUM(${bills.dueAmount}), 0)` })
        .from(bills)
        .where(eq(bills.status, 'ACTIVE'))
        .groupBy(bills.patientId),
    ]);

    const billDueByPatient = new Map<number, string>(billRows.map((row: any) => [row.patientId, row.total]));
    const outstandingPatients = patientRows.flatMap((patient: any) => {
      const outstanding = Money.of(billDueByPatient.get(patient.id) ?? '0');
      return outstanding.isGreaterThan('0') ? [{ ...patient, outstanding: outstanding.toDb() }] : [];
    }).sort((a: any, b: any) => Money.of(b.outstanding).subtract(a.outstanding).toNumber());

    const offset = (page - 1) * pageSize;
    return {
      items: outstandingPatients.slice(offset, offset + pageSize),
      total: outstandingPatients.length,
      page,
      pageSize,
    };
  }

  async create(dto: CreateDuePaymentDto, receivedBy: number, shiftId: number) {
    const amount = Money.of(dto.amount);
    if (!amount.isGreaterThan('0')) {
      throw new BadRequestException('জমার পরিমাণ ধনাত্মক হতে হবে');
    }

    return this.db.transaction(async (tx: any) => {
      // Serialize due collections for this patient before checking the balance.
      const [patient] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, dto.patientId))
        .for('update');
      if (!patient) throw new NotFoundException('রোগী পাওয়া যায়নি');

      const unpaidBills = await tx
        .select()
        .from(bills)
        .where(and(
          eq(bills.patientId, dto.patientId),
          eq(bills.status, 'ACTIVE'),
          sql`${bills.dueAmount} > 0`,
        ))
        .orderBy(bills.createdAt, bills.id)
        .for('update');
      const outstanding = unpaidBills.reduce(
        (sum: Money, bill: any) => sum.add(bill.dueAmount),
        Money.of('0'),
      );
      if (amount.isGreaterThan(outstanding)) {
        throw new BadRequestException(
          `জমা (${dto.amount}) মোট বাকির (${outstanding.toDb()}) চেয়ে বেশি হতে পারবে না`,
        );
      }

      const [created] = await tx
        .insert(duePayments)
        .values({ patientId: dto.patientId, receivedBy, shiftId, amount: amount.toDb() })
        .returning();

      let remaining = amount;
      const allocations: { billId: number; billNo: string; amount: string }[] = [];

      for (const bill of unpaidBills) {
        if (!remaining.isGreaterThan('0')) break;
        const billDue = Money.of(bill.dueAmount);
        const allocated = remaining.isLessThan(billDue) ? remaining : billDue;
        const newPaid = Money.of(bill.totalPaid).add(allocated);
        const newDue = billDue.subtract(allocated);
        await tx.update(bills)
          .set({ totalPaid: newPaid.toDb(), dueAmount: newDue.toDb(), updatedAt: new Date() })
          .where(eq(bills.id, bill.id));
        await tx.insert(payments).values({
          billId: bill.id,
          receivedBy,
          shiftId,
          duePaymentId: created.id,
          amount: allocated.toDb(),
        });
        allocations.push({ billId: bill.id, billNo: bill.billNo, amount: allocated.toDb() });
        remaining = remaining.subtract(allocated);
      }

      await this.auditLog.log({
        dbOrTx: tx,
        userId: receivedBy,
        action: AuditAction.INSERT,
        tableName: 'due_payments',
        recordId: created.id,
        newValue: { ...created, allocations },
      });

      return { ...created, allocations };
    });
  }

  async findByPatient(patientId: number) {
    return this.db.select().from(duePayments).where(eq(duePayments.patientId, patientId));
  }

  async findOne(id: number) {
    const [receipt] = await this.db
      .select({
        id: duePayments.id,
        patientId: duePayments.patientId,
        receivedBy: duePayments.receivedBy,
        shiftId: duePayments.shiftId,
        amount: duePayments.amount,
        paidAt: duePayments.paidAt,
        patientName: patients.name,
        patientCode: patients.patientCode,
        patientPhone: patients.phone,
        receivedByName: users.fullName,
      })
      .from(duePayments)
      .innerJoin(patients, eq(duePayments.patientId, patients.id))
      .innerJoin(users, eq(duePayments.receivedBy, users.id))
      .where(eq(duePayments.id, id))
      .limit(1);
    if (!receipt) throw new NotFoundException('পেমেন্টের রসিদ পাওয়া যায়নি');
    const allocations = await this.db
      .select({ billId: bills.id, billNo: bills.billNo, amount: payments.amount })
      .from(payments)
      .innerJoin(bills, eq(payments.billId, bills.id))
      .where(eq(payments.duePaymentId, id));
    return { ...receipt, allocations };
  }
}
