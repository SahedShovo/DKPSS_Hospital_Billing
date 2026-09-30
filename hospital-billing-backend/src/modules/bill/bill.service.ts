import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sql, gte, lt, inArray, desc } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { bills, billItems, tests, payments, refunds, admissions, duePayments, patients, packages, packageItems } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { formatSequenceCode, billPrefixFor } from '../../common/utils/code-generator.util';
import { BillCalculationService, BillItemInput } from './bill-calculation.service';
import { CreateDoctorVisitBillDto } from './dto/create-doctor-visit-bill.dto';
import { CreateDiagnosticBillDto } from './dto/create-diagnostic-bill.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { DiscountMode } from '../../common/enums/discount-mode.enum';
import { BillType } from '../../common/enums/bill-type.enum';
import { ItemType } from '../../common/enums/item-type.enum';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { DeleteBillsRangeDto } from './dto/delete-bills-range.dto';
import { BillPageDto } from './dto/bill-page.dto';
import { BillStatus } from '../../common/enums/bill-status.enum';
import { CreatePackageBillDto } from './dto/create-package-bill.dto';

@Injectable()
export class BillService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private calc: BillCalculationService,
    private auditLog: AuditLogService,
  ) {}

  private async generateBillNo(billType: BillType): Promise<string> {
    const [{ lastNumber }] = await this.db
      .select({ lastNumber: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${bills.billNo} FROM 3) AS INTEGER)), 0)` })
      .from(bills)
      .where(eq(bills.billType, billType));
    return formatSequenceCode(billPrefixFor(billType), Number(lastNumber) + 1);
  }

  async createDoctorVisitBill(dto: CreateDoctorVisitBillDto, createdBy: number) {
    const mode = dto.discountMode ?? DiscountMode.NONE;
    const billDiscountPercent = dto.discountPercent ?? '0';

    const calcItems: BillItemInput[] = dto.items.map((i) => ({
      unitPrice: i.unitPrice,
      quantity: i.quantity ?? 1,
      itemDiscountPercent: i.itemDiscountPercent ?? '0',
    }));

    this.calc.validateDiscountMode(mode, billDiscountPercent, calcItems);
    const totals = this.calc.computeTotals(mode, billDiscountPercent, calcItems);
    const billNo = await this.generateBillNo(BillType.DOCTOR_VISIT);

    return this.db.transaction(async (tx: any) => {
      const [bill] = await tx
        .insert(bills)
        .values({
          billNo,
          patientId: dto.patientId,
          billType: BillType.DOCTOR_VISIT,
          discountMode: mode,
          grossAmount: totals.grossAmount,
          discountPercent: Money.of(billDiscountPercent).toDb(),
          discountAmount: totals.discountAmount,
          netAmount: totals.netAmount,
          totalPaid: '0.00',
          dueAmount: totals.netAmount,
          createdBy,
        })
        .returning();

      const itemRows = dto.items.map((item) => {
        const lineAmount = Money.of(item.unitPrice).multiply(item.quantity ?? 1);
        const lineDiscount = lineAmount.percentOf(item.itemDiscountPercent ?? '0');
        return {
          billId: bill.id,
          itemType: ItemType.DOCTOR_VISIT,
          itemName: `Doctor Visit (${item.visitType})`,
          visitType: item.visitType,
          doctorId: item.doctorId,
          unitPrice: Money.of(item.unitPrice).toDb(),
          quantity: item.quantity ?? 1,
          itemDiscountPercent: Money.of(item.itemDiscountPercent ?? '0').toDb(),
          amount: lineAmount.toDb(),
          discountAmount: lineDiscount.toDb(),
        };
      });

      const items = await tx.insert(billItems).values(itemRows).returning();

      await this.auditLog.log({
        dbOrTx: tx,
        userId: createdBy,
        action: AuditAction.INSERT,
        tableName: 'bills',
        recordId: bill.id,
        newValue: { ...bill, items },
      });

      return { ...bill, items };
    });
  }

  async createDiagnosticBill(dto: CreateDiagnosticBillDto, createdBy: number) {
    const mode = dto.discountMode ?? DiscountMode.NONE;
    const billDiscountPercent = dto.discountPercent ?? '0';

    const resolvedItems: {
      testId: number;
      name: string;
      price: string;
      quantity: number;
      itemDiscountPercent: string;
    }[] = [];
    for (const item of dto.items) {
      const [test] = await this.db
        .select()
        .from(tests)
        .where(and(eq(tests.id, item.testId), eq(tests.isActive, true)))
        .limit(1);
      if (!test) throw new NotFoundException(`Test id ${item.testId} পাওয়া যায়নি বা বন্ধ আছে`);
      resolvedItems.push({
        testId: item.testId,
        name: test.name,
        price: test.price,
        quantity: item.quantity ?? 1,
        itemDiscountPercent: item.itemDiscountPercent ?? '0',
      });
    }

    const calcItems: BillItemInput[] = resolvedItems.map((i) => ({
      unitPrice: i.price,
      quantity: i.quantity,
      itemDiscountPercent: i.itemDiscountPercent,
    }));

    this.calc.validateDiscountMode(mode, billDiscountPercent, calcItems);
    const totals = this.calc.computeTotals(mode, billDiscountPercent, calcItems);
    const billNo = await this.generateBillNo(BillType.DIAGNOSTIC);

    return this.db.transaction(async (tx: any) => {
      const [bill] = await tx
        .insert(bills)
        .values({
          billNo,
          patientId: dto.patientId,
          billType: BillType.DIAGNOSTIC,
          discountMode: mode,
          grossAmount: totals.grossAmount,
          discountPercent: Money.of(billDiscountPercent).toDb(),
          discountAmount: totals.discountAmount,
          netAmount: totals.netAmount,
          totalPaid: '0.00',
          dueAmount: totals.netAmount,
          createdBy,
        })
        .returning();

      const itemRows = resolvedItems.map((item) => {
        const lineAmount = Money.of(item.price).multiply(item.quantity);
        const lineDiscount = lineAmount.percentOf(item.itemDiscountPercent);
        return {
          billId: bill.id,
          itemType: ItemType.DIAGNOSTIC,
          itemName: item.name,
          testId: item.testId,
          unitPrice: Money.of(item.price).toDb(),
          quantity: item.quantity,
          itemDiscountPercent: Money.of(item.itemDiscountPercent).toDb(),
          amount: lineAmount.toDb(),
          discountAmount: lineDiscount.toDb(),
        };
      });

      const items = await tx.insert(billItems).values(itemRows).returning();

      await this.auditLog.log({
        dbOrTx: tx,
        userId: createdBy,
        action: AuditAction.INSERT,
        tableName: 'bills',
        recordId: bill.id,
        newValue: { ...bill, items },
      });

      return { ...bill, items };
    });
  }

  async createPackageBill(dto: CreatePackageBillDto, createdBy: number) {
    const [pkg] = await this.db
      .select()
      .from(packages)
      .where(and(eq(packages.id, dto.packageId), eq(packages.isActive, true)))
      .limit(1);
    if (!pkg) throw new NotFoundException('প্যাকেজ পাওয়া যায়নি বা নিষ্ক্রিয়');

    const items = await this.db.select().from(packageItems).where(eq(packageItems.packageId, pkg.id));
    if (!items.length) throw new BadRequestException('এই প্যাকেজে কোনো আইটেম নেই');

    let total = Money.of('0');
    for (const item of items) total = total.add(item.amount);
    // Only the admin-maintained package price is accepted; clients cannot submit a price.
    const packagePrice = pkg.packagePrice ? Money.of(pkg.packagePrice) : total;
    const amount = packagePrice.toDb();
    const billNo = await this.generateBillNo(BillType.PACKAGE);

    return this.db.transaction(async (tx: any) => {
      const [bill] = await tx.insert(bills).values({
        billNo,
        patientId: dto.patientId,
        billType: BillType.PACKAGE,
        discountMode: DiscountMode.NONE,
        grossAmount: amount,
        discountPercent: '0.00',
        discountAmount: '0.00',
        netAmount: amount,
        totalPaid: '0.00',
        dueAmount: amount,
        createdBy,
      }).returning();

      const [billItem] = await tx.insert(billItems).values({
        billId: bill.id,
        itemType: ItemType.PACKAGE,
        itemName: `Package: ${pkg.name}`,
        unitPrice: amount,
        quantity: 1,
        itemDiscountPercent: '0.00',
        amount,
        discountAmount: '0.00',
      }).returning();

      await this.auditLog.log({
        dbOrTx: tx,
        userId: createdBy,
        action: AuditAction.INSERT,
        tableName: 'bills',
        recordId: bill.id,
        newValue: { ...bill, packageId: pkg.id, packageName: pkg.name, items: [billItem] },
      });
      return { ...bill, items: [billItem] };
    });
  }

  async findOne(id: number) {
    const [bill] = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');
    const [items, billPayments, billRefunds, patientRows] = await Promise.all([
      this.db.select().from(billItems).where(eq(billItems.billId, id)),
      this.db.select().from(payments).where(eq(payments.billId, id)),
      this.db.select().from(refunds).where(eq(refunds.billId, id)),
      this.db.select().from(patients).where(eq(patients.id, bill.patientId)).limit(1),
    ]);
    return { ...bill, items, payments: billPayments, refunds: billRefunds, patient: patientRows[0] ?? null };
  }

  async findByPatient(patientId: number) {
    return this.db.select().from(bills).where(eq(bills.patientId, patientId)).orderBy(bills.id);
  }

  async applyDiscount(id: number, dto: ApplyDiscountDto, updatedBy: number) {
    const bill = await this.findOne(id);
    if (bill.billType === BillType.PACKAGE) {
      throw new BadRequestException('প্যাকেজ বিলের মূল্য অ্যাডমিন নির্ধারণ করেন; এই বিলে discount পরিবর্তন করা যাবে না');
    }
    if (bill.status === 'CANCELLED') {
      throw new BadRequestException('Cancelled Bill-এ discount বদলানো যাবে না');
    }

    const calcItems: BillItemInput[] = bill.items.map((i: any) => ({
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      itemDiscountPercent: i.itemDiscountPercent,
    }));

    const mode = dto.discountMode;
    const billDiscountPercent = dto.discountPercent ?? '0';

    this.calc.validateDiscountMode(mode, billDiscountPercent, calcItems);
    const totals = this.calc.computeTotals(mode, billDiscountPercent, calcItems);

    const newDue = Money.of(totals.netAmount).subtract(bill.totalPaid);
    if (newDue.isNegative()) {
      throw new BadRequestException(
        'নতুন discount দিলে জমার (total paid) চেয়ে Net Amount কমে যাচ্ছে — আগে এটা সমাধান করুন',
      );
    }

    const [updated] = await this.db
      .update(bills)
      .set({
        discountMode: mode,
        discountPercent: Money.of(billDiscountPercent).toDb(),
        grossAmount: totals.grossAmount,
        discountAmount: totals.discountAmount,
        netAmount: totals.netAmount,
        dueAmount: newDue.toDb(),
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(bills.id, id))
      .returning();

    await this.auditLog.log({
      userId: updatedBy,
      action: AuditAction.UPDATE,
      tableName: 'bills',
      recordId: id,
      oldValue: bill,
      newValue: updated,
    });

    return updated;
  }

  async recalcAndUpdateBillTotals(billId: number) {
    const [bill] = await this.db.select().from(bills).where(eq(bills.id, billId)).limit(1);
    if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');

    const items = await this.db.select().from(billItems).where(eq(billItems.billId, billId));
    const calcItems: BillItemInput[] = items.map((i: any) => ({
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      itemDiscountPercent: i.itemDiscountPercent,
    }));

    const totals = this.calc.computeTotals(bill.discountMode, bill.discountPercent, calcItems);
    const newDue = Money.of(totals.netAmount).subtract(bill.totalPaid);
    if (newDue.isNegative()) {
      throw new BadRequestException(
        'নতুন হিসাবে Net Amount জমার (total paid) চেয়ে কম হয়ে যাচ্ছে — আগে Refund করুন',
      );
    }

    const [updated] = await this.db
      .update(bills)
      .set({
        grossAmount: totals.grossAmount,
        discountAmount: totals.discountAmount,
        netAmount: totals.netAmount,
        dueAmount: newDue.toDb(),
        updatedAt: new Date(),
      })
      .where(eq(bills.id, billId))
      .returning();

    return updated;
  }

  async cancelBill(id: number, cancelledBy: number) {
    return this.db.transaction(async (tx: any) => {
      const [bill] = await tx.select().from(bills).where(eq(bills.id, id)).for('update');
      if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');
      if (bill.status === 'CANCELLED') {
        throw new BadRequestException('Bill আগেই Cancelled আছে');
      }
      if (!Money.of(bill.totalPaid).equals('0')) {
        throw new BadRequestException(
          `এই Bill-এ ${bill.totalPaid} টাকা জমা আছে — আগে পুরো টাকা Refund করুন, তারপর Cancel করুন`,
        );
      }

      const [updated] = await tx
        .update(bills)
        .set({ status: 'CANCELLED', dueAmount: '0.00', cancelledAt: new Date(), cancelledBy })
        .where(eq(bills.id, id))
        .returning();

      await this.auditLog.log({
        dbOrTx: tx,
        userId: cancelledBy,
        action: AuditAction.UPDATE,
        tableName: 'bills',
        recordId: id,
        oldValue: bill,
        newValue: updated,
      });

      return updated;
    });
  }

  async findAll() {
    return this.db.select().from(bills).orderBy(bills.id);
  }

  private getDateBounds(dto: DeleteBillsRangeDto) {
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না');
    }
    const isValidDate = (value: string) => {
      const [year, month, day] = value.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    };
    if (!isValidDate(dto.startDate) || !isValidDate(dto.endDate)) {
      throw new BadRequestException('তারিখ সঠিক নয়');
    }
    const start = new Date(`${dto.startDate}T00:00:00+06:00`);
    const endExclusive = new Date(new Date(`${dto.endDate}T00:00:00+06:00`).getTime() + 86400000);
    return and(gte(bills.createdAt, start), lt(bills.createdAt, endExclusive));
  }

  async findPage(dto: BillPageDto) {
    const conditions = [];
    if (dto.type) conditions.push(eq(bills.billType, dto.type));
    if (dto.status) conditions.push(eq(bills.status, dto.status));
    const where = conditions.length ? and(...conditions) : undefined;
    const [items, countRows] = await Promise.all([
      this.db.select().from(bills).where(where).orderBy(desc(bills.createdAt), desc(bills.id)).limit(dto.pageSize).offset((dto.page - 1) * dto.pageSize),
      this.db.select({ count: sql<number>`count(*)` }).from(bills).where(where),
    ]);
    return { items, total: Number(countRows[0]?.count ?? 0), page: dto.page, pageSize: dto.pageSize };
  }

  async countByDateRange(dto: DeleteBillsRangeDto) {
    const [row] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(bills)
      .where(this.getDateBounds(dto));
    return { count: Number(row?.count ?? 0) };
  }

  async findByDateRange(dto: DeleteBillsRangeDto) {
    return this.db.select().from(bills).where(this.getDateBounds(dto)).orderBy(bills.createdAt);
  }

  async deleteByDateRange(dto: DeleteBillsRangeDto, userId: number) {
    const dateRangeCondition = this.getDateBounds(dto);

    return this.db.transaction(async (tx: any) => {
      const selectedBills = await tx
        .select()
        .from(bills)
        .where(dateRangeCondition)
        .for('update');
      if (selectedBills.length === 0) return { deletedCount: 0 };

      const billIds = selectedBills.map((bill: any) => bill.id);
      const billPayments = await tx.select({ billId: payments.billId }).from(payments).where(inArray(payments.billId, billIds));
      const billRefunds = await tx.select({ billId: refunds.billId }).from(refunds).where(inArray(refunds.billId, billIds));
      const billAdmissions = await tx.select({ billId: admissions.billId }).from(admissions).where(inArray(admissions.billId, billIds));
      const patientIds: number[] = [...new Set<number>(selectedBills.map((bill: any) => bill.patientId))];
      const patientDuePayments = await tx
        .select({ patientId: duePayments.patientId })
        .from(duePayments)
        .where(inArray(duePayments.patientId, patientIds));

      if (billPayments.length || billRefunds.length || billAdmissions.length || patientDuePayments.length) {
        throw new BadRequestException(
          'এই বিলগুলোর সঙ্গে পেমেন্ট, রিফান্ড, ভর্তি বা রোগীর পুরোনো বাকি জমার রেকর্ড আছে। কোনো বিল মুছে ফেলা হয়নি।',
        );
      }

      const itemsToDelete = await tx.select().from(billItems).where(inArray(billItems.billId, billIds));

      for (const bill of selectedBills) {
        const billItemsForAudit = itemsToDelete.filter((item: any) => item.billId === bill.id);
        await this.auditLog.log({
          dbOrTx: tx,
          userId,
          action: AuditAction.DELETE,
          tableName: 'bills',
          recordId: bill.id,
          oldValue: { bill, items: billItemsForAudit },
        });
      }

      await tx.delete(billItems).where(inArray(billItems.billId, billIds));
      await tx.delete(bills).where(inArray(bills.id, billIds));
      return { deletedCount: selectedBills.length };
    });
  }
}
