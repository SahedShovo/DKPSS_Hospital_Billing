import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, ilike, sql, and, or } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { admissions, bills, duePayments, patients, auditLogs } from '../../database/schema';
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
      const patientAdmissions = await tx.select({ id: admissions.id }).from(admissions).where(eq(admissions.patientId, id));
      const patientDuePayments = await tx.select({ id: duePayments.id }).from(duePayments).where(eq(duePayments.patientId, id));
      if (patientBills.length || patientAdmissions.length || patientDuePayments.length) {
        throw new ConflictException(
          'এই রোগীর বিল, ভর্তি বা পেমেন্টের রেকর্ড আছে—হিসাবের ইতিহাস রাখতে রোগী মুছে ফেলা যাবে না।',
        );
      }

      // Only an unbilled patient may be hard-deleted; financial history is retained.
      await tx.delete(auditLogs).where(and(eq(auditLogs.tableName, 'patients'), eq(auditLogs.recordId, id)));
      await tx.delete(patients).where(eq(patients.id, id));

      const removed = {
        bills: 0,
        admissions: 0,
        payments: 0,
        refunds: 0,
        duePayments: 0,
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
