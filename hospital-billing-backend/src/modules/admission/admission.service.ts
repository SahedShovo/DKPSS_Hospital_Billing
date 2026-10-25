import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { admissions, bills, billItems, patients } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { calculateBedBlocks } from '../../common/utils/date.util';
import { nextBillNumber } from '../../common/utils/bill-number.util';
import { BillType } from '../../common/enums/bill-type.enum';
import { ItemType } from '../../common/enums/item-type.enum';
import { AdmissionStatus } from '../../common/enums/admission-status.enum';
import { BillService } from '../bill/bill.service';
import { CreateAdmissionDto } from './dto/create-admission.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@Injectable()
export class AdmissionService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private billService: BillService,
    private auditLog: AuditLogService,
  ) {}

  async getActiveAdmissionForPatient(patientId: number, db: any = this.db) {
    const [admission] = await db
      .select()
      .from(admissions)
      .where(
        and(eq(admissions.patientId, patientId), eq(admissions.status, AdmissionStatus.ADMITTED)),
      )
      .limit(1);
    return admission ?? null;
  }

  async admitPatient(dto: CreateAdmissionDto, createdBy: number) {
    const bedRateValue = Money.of(dto.bedRate);
    const admissionFeeValue = Money.of(dto.admissionFee);
    if (bedRateValue.isNegative() || admissionFeeValue.isNegative()) {
      throw new BadRequestException('ভর্তি ফি ও বেড চার্জ ঋণাত্মক হতে পারবে না');
    }
    const admitTime = dto.admitTime ? new Date(dto.admitTime) : new Date();
    const bedBlocks = calculateBedBlocks(admitTime, new Date());
    const bedAmount = bedRateValue.multiply(bedBlocks);
    const grossAmount = admissionFeeValue.add(bedAmount);

    return this.db.transaction(async (tx: any) => {
      // Lock the patient so concurrent admission requests cannot both pass the check.
      const [patient] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, dto.patientId))
        .for('update');
      if (!patient) throw new NotFoundException('রোগী পাওয়া যায়নি');

      const existing = await this.getActiveAdmissionForPatient(dto.patientId, tx);
      if (existing) {
        throw new ConflictException('এই রোগী ইতিমধ্যে ভর্তি আছে — নতুন Admission দেওয়া যাবে না');
      }
      const billNo = await nextBillNumber(tx, BillType.ADMISSION);

      const [bill] = await tx
        .insert(bills)
        .values({
          billNo,
          patientId: dto.patientId,
          billType: BillType.ADMISSION,
          discountMode: 'NONE',
          grossAmount: grossAmount.toDb(),
          billDiscountValue: '0.00',
          discountPercent: '0.00',
          discountAmount: '0.00',
          netAmount: grossAmount.toDb(),
          totalPaid: '0.00',
          dueAmount: grossAmount.toDb(),
          createdBy,
        })
        .returning();

      await tx.insert(billItems).values([
        {
          billId: bill.id,
          itemType: ItemType.ADMISSION_FEE,
          itemName: 'Admission Fee',
          unitPrice: Money.of(dto.admissionFee).toDb(),
          quantity: 1,
          amount: Money.of(dto.admissionFee).toDb(),
          discountAmount: '0.00',
        },
        {
          billId: bill.id,
          itemType: ItemType.BED,
          itemName: `Bed Charge (${dto.bedType})`,
          unitPrice: Money.of(dto.bedRate).toDb(),
          quantity: bedBlocks,
          amount: bedAmount.toDb(),
          discountAmount: '0.00',
        },
      ]);

      const [admission] = await tx
        .insert(admissions)
        .values({
          patientId: dto.patientId,
          billId: bill.id,
          bedType: dto.bedType,
          bedRate: Money.of(dto.bedRate).toDb(),
          admissionFee: Money.of(dto.admissionFee).toDb(),
          admitTime,
        })
        .returning();

      await this.auditLog.log({
        dbOrTx: tx,
        userId: createdBy,
        action: AuditAction.INSERT,
        tableName: 'admissions',
        recordId: admission.id,
        newValue: { ...admission, bill },
      });

      return { ...admission, bill };
    });
  }

  async findOne(id: number) {
    const [admission] = await this.db
      .select()
      .from(admissions)
      .where(eq(admissions.id, id))
      .limit(1);
    if (!admission) throw new NotFoundException('Admission পাওয়া যায়নি');
    return admission;
  }

  async refreshBedCharge(id: number) {
    return this.db.transaction(async (tx: any) => {
      const [admission] = await tx.select().from(admissions).where(eq(admissions.id, id)).for('update');
      if (!admission) throw new NotFoundException('Admission পাওয়া যায়নি');
      if (admission.status !== AdmissionStatus.ADMITTED) {
        throw new BadRequestException('Discharged Admission-এর Bed Charge রিফ্রেশ করা যাবে না');
      }
      await tx.select().from(bills).where(eq(bills.id, admission.billId)).for('update');
      await this.syncBedItem(admission, new Date(), tx);
      return this.billService.recalcAndUpdateBillTotals(admission.billId, tx);
    });
  }

  async discharge(id: number, dischargedBy: number) {
    return this.db.transaction(async (tx: any) => {
      const [admission] = await tx.select().from(admissions).where(eq(admissions.id, id)).for('update');
      if (!admission) throw new NotFoundException('Admission পাওয়া যায়নি');
      if (admission.status !== AdmissionStatus.ADMITTED) {
        throw new BadRequestException('এই রোগী আগেই Discharge হয়েছে');
      }

      const dischargeTime = new Date();
      await tx.select().from(bills).where(eq(bills.id, admission.billId)).for('update');
      await this.syncBedItem(admission, dischargeTime, tx);
      const [updated] = await tx
        .update(admissions)
        .set({ status: AdmissionStatus.DISCHARGED, dischargeTime, dischargedBy })
        .where(eq(admissions.id, id))
        .returning();

      const bill = await this.billService.recalcAndUpdateBillTotals(admission.billId, tx);
      await this.auditLog.log({
        dbOrTx: tx,
        userId: dischargedBy,
        action: AuditAction.UPDATE,
        tableName: 'admissions',
        recordId: id,
        oldValue: admission,
        newValue: { ...updated, bill },
      });

      return { ...updated, bill };
    });
  }

  async findAllActive() {
    return this.db
      .select({
        id: admissions.id,
        patientId: admissions.patientId,
        patientName: patients.name,
        patientCode: patients.patientCode,
        billId: admissions.billId,
        bedType: admissions.bedType,
        bedRate: admissions.bedRate,
        admissionFee: admissions.admissionFee,
        admitTime: admissions.admitTime,
        dischargeTime: admissions.dischargeTime,
        status: admissions.status,
        dischargedBy: admissions.dischargedBy,
      })
      .from(admissions)
      .innerJoin(patients, eq(admissions.patientId, patients.id))
      .where(eq(admissions.status, AdmissionStatus.ADMITTED));
  }

  async findActivePage({ page, pageSize }: PageQueryDto) {
    const selection = {
      id: admissions.id, patientId: admissions.patientId, patientName: patients.name,
      patientCode: patients.patientCode, billId: admissions.billId, bedType: admissions.bedType,
      bedRate: admissions.bedRate, admissionFee: admissions.admissionFee, admitTime: admissions.admitTime,
      dischargeTime: admissions.dischargeTime, status: admissions.status, dischargedBy: admissions.dischargedBy,
    };
    const [items, [{ total }]] = await Promise.all([
      this.db.select(selection).from(admissions).innerJoin(patients, eq(admissions.patientId, patients.id))
        .where(eq(admissions.status, AdmissionStatus.ADMITTED)).orderBy(admissions.id)
        .limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(admissions)
        .where(eq(admissions.status, AdmissionStatus.ADMITTED)),
    ]);
    return { items, total, page, pageSize };
  }

  private async syncBedItem(admission: any, referenceTime: Date, db: any = this.db) {
    const blocks = calculateBedBlocks(new Date(admission.admitTime), referenceTime);
    const bedAmount = Money.of(admission.bedRate).multiply(blocks);

    await db
      .update(billItems)
      .set({ quantity: blocks, amount: bedAmount.toDb() })
      .where(and(eq(billItems.billId, admission.billId), eq(billItems.itemType, ItemType.BED)));
  }
}
