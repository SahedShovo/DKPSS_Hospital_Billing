import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { duePayments, bills, patients, users } from '../../database/schema';
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

  async getOutstanding(patientId: number): Promise<Money> {
    const [{ sum: billDue }] = await this.db
      .select({ sum: sql<string>`COALESCE(SUM(${bills.dueAmount}),0)` })
      .from(bills)
      .where(and(eq(bills.patientId, patientId), eq(bills.status, 'ACTIVE')));

    const [{ sum: collected }] = await this.db
      .select({ sum: sql<string>`COALESCE(SUM(${duePayments.amount}),0)` })
      .from(duePayments)
      .where(eq(duePayments.patientId, patientId));

    return Money.of(billDue).subtract(collected);
  }

  async findPatientsWithOutstanding({ page, pageSize }: PageQueryDto) {
    const [patientRows, billRows, paymentRows] = await Promise.all([
      this.db
        .select({ id: patients.id, patientCode: patients.patientCode, name: patients.name, phone: patients.phone })
        .from(patients),
      this.db
        .select({ patientId: bills.patientId, total: sql<string>`COALESCE(SUM(${bills.dueAmount}), 0)` })
        .from(bills)
        .where(eq(bills.status, 'ACTIVE'))
        .groupBy(bills.patientId),
      this.db
        .select({ patientId: duePayments.patientId, total: sql<string>`COALESCE(SUM(${duePayments.amount}), 0)` })
        .from(duePayments)
        .groupBy(duePayments.patientId),
    ]);

    const billDueByPatient = new Map<number, string>(billRows.map((row: any) => [row.patientId, row.total]));
    const collectedByPatient = new Map<number, string>(paymentRows.map((row: any) => [row.patientId, row.total]));
    const outstandingPatients = patientRows.flatMap((patient: any) => {
      const outstanding = Money.of(billDueByPatient.get(patient.id) ?? '0')
        .subtract(collectedByPatient.get(patient.id) ?? '0');
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

    const outstanding = await this.getOutstanding(dto.patientId);
    if (amount.isGreaterThan(outstanding)) {
      throw new BadRequestException(
        `জমা (${dto.amount}) মোট বাকির (${outstanding.toDb()}) চেয়ে বেশি হতে পারবে না`,
      );
    }

    const [created] = await this.db
      .insert(duePayments)
      .values({ patientId: dto.patientId, receivedBy, shiftId, amount: amount.toDb() })
      .returning();

    await this.auditLog.log({
      userId: receivedBy,
      action: AuditAction.INSERT,
      tableName: 'due_payments',
      recordId: created.id,
      newValue: created,
    });

    return created;
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
    return receipt;
  }
}
