import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, ilike, sql, and, or, inArray } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { admissions, bills, billItems, duePayments, payments, refunds, patients, auditLogs } from '../../database/schema';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { nextPatientCode } from '../../common/utils/patient-code.util';
import { PatientPageDto } from './dto/patient-page.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';

@Injectable()
export class PatientService {
  constructor(@Inject(DRIZZLE) private db: any, private auditLog: AuditLogService) {}

  async create(dto: CreatePatientDto, createdBy: number) {
    return this.db.transaction(async (tx: any) => {
      const patientCode = await nextPatientCode(tx);
      const [created] = await tx
        .insert(patients)
        .values({
          patientCode,
          name: dto.name,
          age: dto.age,
          gender: dto.gender,
          phone: dto.phone,
          address: dto.address,
          refer: dto.refer ?? '',
          createdBy,
        })
        .returning();

      return created;
    });
  }

  async findAll() {
    return this.db.select().from(patients).orderBy(patients.id);
  }

  async findPage(dto: PatientPageDto) {
    const [items, countRows] = await Promise.all([
      this.db
        .select()
        .from(patients)
        .orderBy(patients.id)
        .limit(dto.pageSize)
        .offset((dto.page - 1) * dto.pageSize),
      this.db.select({ count: sql<number>`count(*)` }).from(patients),
    ]);
    return { items, total: Number(countRows[0]?.count ?? 0), page: dto.page, pageSize: dto.pageSize };
  }

  async findOne(id: number) {
    const [patient] = await this.db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);
    if (!patient) throw new NotFoundException('রোগী পাওয়া যায়নি');
    return patient;
  }

  async search(dto: SearchPatientDto) {
    const query = dto.query?.trim();
    if (query) {
      const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
      return this.db
        .select()
        .from(patients)
        .where(or(
          ilike(patients.name, pattern),
          ilike(patients.phone, pattern),
          ilike(patients.patientCode, pattern),
        ))
        .orderBy(patients.id);
    }
    if (dto.patientCode) {
      return this.db.select().from(patients).where(eq(patients.patientCode, dto.patientCode));
    }
    if (dto.phone) {
      return this.db.select().from(patients).where(ilike(patients.phone, `%${dto.phone}%`));
    }
    if (dto.name) {
      return this.db.select().from(patients).where(ilike(patients.name, `%${dto.name}%`));
    }
    return this.db.select().from(patients).orderBy(patients.id);
  }

  async update(id: number, dto: UpdatePatientDto) {
    await this.findOne(id);
    const [updated] = await this.db
      .update(patients)
      .set(dto)
      .where(eq(patients.id, id))
      .returning();
    return updated;
  }

  async remove(id: number, deletedBy: number) {
    return this.db.transaction(async (tx: any) => {
      const [patient] = await tx.select().from(patients).where(eq(patients.id, id)).for('update');
      if (!patient) throw new NotFoundException('রোগী পাওয়া যায়নি');

      const patientBills = await tx.select({ id: bills.id }).from(bills).where(eq(bills.patientId, id));
      const billIds: number[] = patientBills.map((bill: { id: number }) => bill.id);
      const patientAdmissions = await tx.select({ id: admissions.id }).from(admissions).where(eq(admissions.patientId, id));
      const patientDuePayments = await tx.select({ id: duePayments.id }).from(duePayments).where(eq(duePayments.patientId, id));
      const patientPayments = billIds.length
        ? await tx.select({ id: payments.id }).from(payments).where(inArray(payments.billId, billIds))
        : [];
      const patientRefunds = billIds.length
        ? await tx.select({ id: refunds.id }).from(refunds).where(inArray(refunds.billId, billIds))
        : [];

      // Remove audit snapshots containing this patient's data; leave a minimal
      // deletion event below so the admin action remains traceable.
      const auditConditions: any[] = [and(eq(auditLogs.tableName, 'patients'), eq(auditLogs.recordId, id))];
      const addAuditIds = (tableName: string, ids: number[]) => {
        if (ids.length) auditConditions.push(and(eq(auditLogs.tableName, tableName), inArray(auditLogs.recordId, ids)));
      };
      addAuditIds('bills', billIds);
      addAuditIds('payments', patientPayments.map((row: { id: number }) => row.id));
      addAuditIds('refunds', patientRefunds.map((row: { id: number }) => row.id));
      addAuditIds('admissions', patientAdmissions.map((row: { id: number }) => row.id));
      addAuditIds('due_payments', patientDuePayments.map((row: { id: number }) => row.id));
      await tx.delete(auditLogs).where(or(...auditConditions));

      if (billIds.length) {
        await tx.delete(billItems).where(inArray(billItems.billId, billIds));
        await tx.delete(payments).where(inArray(payments.billId, billIds));
        await tx.delete(refunds).where(inArray(refunds.billId, billIds));
      }
      await tx.delete(admissions).where(eq(admissions.patientId, id));
      await tx.delete(duePayments).where(eq(duePayments.patientId, id));
      await tx.delete(bills).where(eq(bills.patientId, id));
      await tx.delete(patients).where(eq(patients.id, id));

      const removed = {
        bills: billIds.length,
        admissions: patientAdmissions.length,
        payments: patientPayments.length,
        refunds: patientRefunds.length,
        duePayments: patientDuePayments.length,
      };
      await this.auditLog.log({
        dbOrTx: tx,
        userId: deletedBy,
        action: AuditAction.DELETE,
        tableName: 'patients',
        recordId: null,
        newValue: { completedAt: new Date().toISOString(), removed },
      });
      return { deleted: true, removed };
    });
  }
}
