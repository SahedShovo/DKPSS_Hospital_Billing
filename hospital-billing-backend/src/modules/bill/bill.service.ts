import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, and, sql, gte, lt, inArray, desc, notExists } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { bills, billItems, tests, payments, refunds, admissions, duePayments, patients, packages, packageItems } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { nextBillNumber } from '../../common/utils/bill-number.util';
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
import { CreateManualBillDto } from './dto/create-manual-bill.dto';

@Injectable()
export class BillService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private calc: BillCalculationService,
    private auditLog: AuditLogService,
  ) {}

  private itemDiscountAmount(item: any): Money {
    const savedAmount = Money.of(item.itemDiscountValue ?? '0');
    if (!savedAmount.equals('0')) return savedAmount;
    const lineAmount = Money.of(item.unitPrice).multiply(item.quantity);
    return lineAmount.percentOf(item.itemDiscountPercent ?? '0');
  }

  private billDiscountAmount(bill: any, grossAmount: string): Money {
    const savedAmount = Money.of(bill.billDiscountValue ?? '0');
    if (!savedAmount.equals('0')) return savedAmount;
    return Money.of(grossAmount).percentOf(bill.discountPercent ?? '0');
  }

  private calculatedDueAmount(bill: any): string {
    if (bill.status === BillStatus.CANCELLED) return '0.00';
    const due = Money.of(bill.netAmount).subtract(bill.totalPaid);
    return due.isNegative() ? '0.00' : due.toDb();
  }

  async createDoctorVisitBill(dto: CreateDoctorVisitBillDto, createdBy: number) {
    const mode = dto.discountMode ?? DiscountMode.NONE;
    const billDiscountAmount = dto.discountAmount ?? '0';

    const calcItems: BillItemInput[] = dto.items.map((i) => ({
      unitPrice: i.unitPrice,
      quantity: i.quantity ?? 1,
      itemDiscountAmount: i.itemDiscountAmount ?? '0',
    }));

    this.calc.validateDiscountMode(mode, billDiscountAmount, calcItems);
    const totals = this.calc.computeTotals(mode, billDiscountAmount, calcItems);
    return this.db.transaction(async (tx: any) => {
      const billNo = await nextBillNumber(tx, BillType.DOCTOR_VISIT);
      const [bill] = await tx
        .insert(bills)
        .values({
          billNo,
          patientId: dto.patientId,
          billType: BillType.DOCTOR_VISIT,
          discountMode: mode,
          grossAmount: totals.grossAmount,
          billDiscountValue: Money.of(billDiscountAmount).toDb(),
          discountPercent: '0.00',
          discountAmount: totals.discountAmount,
          netAmount: totals.netAmount,
          totalPaid: '0.00',
          dueAmount: totals.netAmount,
          createdBy,
        })
        .returning();

      const itemRows = dto.items.map((item) => {
        const lineAmount = Money.of(item.unitPrice).multiply(item.quantity ?? 1);
        const lineDiscount = Money.of(item.itemDiscountAmount ?? '0');
        return {
          billId: bill.id,
          itemType: ItemType.DOCTOR_VISIT,
          itemName: `Doctor Visit (${item.visitType})`,
          visitType: item.visitType,
          doctorId: item.doctorId,
          unitPrice: Money.of(item.unitPrice).toDb(),
          quantity: item.quantity ?? 1,
          itemDiscountValue: Money.of(item.itemDiscountAmount ?? '0').toDb(),
          itemDiscountPercent: '0.00',
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
    const billDiscountAmount = dto.discountAmount ?? '0';

    const resolvedItems: {
      testId: number;
      name: string;
      price: string;
      quantity: number;
      itemDiscountAmount: string;
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
        itemDiscountAmount: item.itemDiscountAmount ?? '0',
      });
    }

    const calcItems: BillItemInput[] = resolvedItems.map((i) => ({
      unitPrice: i.price,
      quantity: i.quantity,
      itemDiscountAmount: i.itemDiscountAmount,
    }));

    this.calc.validateDiscountMode(mode, billDiscountAmount, calcItems);
    const totals = this.calc.computeTotals(mode, billDiscountAmount, calcItems);
    return this.db.transaction(async (tx: any) => {
      const billNo = await nextBillNumber(tx, BillType.DIAGNOSTIC);
      const [bill] = await tx
        .insert(bills)
        .values({
          billNo,
          patientId: dto.patientId,
          billType: BillType.DIAGNOSTIC,
          discountMode: mode,
          grossAmount: totals.grossAmount,
          billDiscountValue: Money.of(billDiscountAmount).toDb(),
          discountPercent: '0.00',
          discountAmount: totals.discountAmount,
          netAmount: totals.netAmount,
          totalPaid: '0.00',
          dueAmount: totals.netAmount,
          createdBy,
        })
        .returning();

      const itemRows = resolvedItems.map((item) => {
        const lineAmount = Money.of(item.price).multiply(item.quantity);
        const lineDiscount = Money.of(item.itemDiscountAmount);
        return {
          billId: bill.id,
          itemType: ItemType.DIAGNOSTIC,
          itemName: item.name,
          testId: item.testId,
          unitPrice: Money.of(item.price).toDb(),
          quantity: item.quantity,
          itemDiscountValue: Money.of(item.itemDiscountAmount).toDb(),
          itemDiscountPercent: '0.00',
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
    const packageDiscount = Money.of(pkg.packageDiscountAmount ?? '0');
    const additionalDiscount = Money.of(Money.of(dto.additionalDiscountAmount ?? '0').toDb());
    const totalDiscount = packageDiscount.add(additionalDiscount);
    if (packageDiscount.isNegative() || additionalDiscount.isNegative() || totalDiscount.isGreaterThan(packagePrice)) {
      throw new BadRequestException('প্যাকেজের নির্ধারিত ও অতিরিক্ত ছাড়ের যোগফল মূল দামের বেশি হতে পারবে না');
    }
    const amount = packagePrice.toDb();
    const discountAmount = totalDiscount.toDb();
    const finalNetAmount = packagePrice.subtract(totalDiscount).toDb();
    return this.db.transaction(async (tx: any) => {
      const billNo = await nextBillNumber(tx, BillType.PACKAGE);
      const [bill] = await tx.insert(bills).values({
        billNo,
        patientId: dto.patientId,
        billType: BillType.PACKAGE,
        discountMode: totalDiscount.equals('0') ? DiscountMode.NONE : DiscountMode.BILL,
        grossAmount: amount,
        billDiscountValue: discountAmount,
        discountPercent: '0.00',
        discountAmount,
        netAmount: finalNetAmount,
        totalPaid: '0.00',
        dueAmount: finalNetAmount,
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
        details: {
          packageDiscountAmount: packageDiscount.toDb(),
          additionalDiscountAmount: additionalDiscount.toDb(),
        },
      }).returning();

      await this.auditLog.log({
        dbOrTx: tx,
        userId: createdBy,
        action: AuditAction.INSERT,
        tableName: 'bills',
        recordId: bill.id,
        newValue: {
          ...bill,
          packageId: pkg.id,
          packageName: pkg.name,
          packageDiscountAmount: packageDiscount.toDb(),
          additionalDiscountAmount: additionalDiscount.toDb(),
          items: [billItem],
        },
      });
      return { ...bill, items: [billItem] };
    });
  }

  async createManualBill(dto: CreateManualBillDto, billType: BillType.EMERGENCY | BillType.MEDICINE, itemType: ItemType.EMERGENCY | ItemType.MEDICINE, createdBy: number) {
    if (dto.items.some((item) => !item.itemName.trim() || !Number.isInteger(item.quantity ?? 1) || (item.quantity ?? 1) < 1 || Money.of(item.unitPrice).isNegative())) {
      throw new BadRequestException('আইটেমের নাম, অঋণাত্মক দাম এবং অন্তত ১টি সংখ্যা দিতে হবে');
    }
    const mode = dto.discountMode ?? DiscountMode.NONE;
    const billDiscountAmount = dto.discountAmount ?? '0';
    const calcItems: BillItemInput[] = dto.items.map((item) => ({
      unitPrice: item.unitPrice,
      quantity: item.quantity ?? 1,
      itemDiscountAmount: item.itemDiscountAmount ?? '0',
    }));
    this.calc.validateDiscountMode(mode, billDiscountAmount, calcItems);
    const totals = this.calc.computeTotals(mode, billDiscountAmount, calcItems);
    return this.db.transaction(async (tx: any) => {
      const billNo = await nextBillNumber(tx, billType);
      const [bill] = await tx.insert(bills).values({
        billNo,
        patientId: dto.patientId,
        billType,
        discountMode: mode,
        grossAmount: totals.grossAmount,
        billDiscountValue: Money.of(billDiscountAmount).toDb(),
        discountPercent: '0.00',
        discountAmount: totals.discountAmount,
        netAmount: totals.netAmount,
        totalPaid: '0.00',
        dueAmount: totals.netAmount,
        createdBy,
      }).returning();

      const rows = dto.items.map((item) => ({
        billId: bill.id,
        itemType,
        itemName: item.itemName.trim(),
        unitPrice: Money.of(item.unitPrice).toDb(),
        quantity: item.quantity ?? 1,
        itemDiscountValue: Money.of(item.itemDiscountAmount ?? '0').toDb(),
        itemDiscountPercent: '0.00',
        amount: Money.of(item.unitPrice).multiply(item.quantity ?? 1).toDb(),
        discountAmount: Money.of(item.itemDiscountAmount ?? '0').toDb(),
      }));
      const items = await tx.insert(billItems).values(rows).returning();
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

  async findOne(id: number) {
    const [bill] = await this.db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');
    const [items, billPayments, billRefunds, patientRows] = await Promise.all([
      this.db.select().from(billItems).where(eq(billItems.billId, id)),
      this.db.select().from(payments).where(eq(payments.billId, id)),
      this.db.select().from(refunds).where(eq(refunds.billId, id)),
      this.db.select().from(patients).where(eq(patients.id, bill.patientId)).limit(1),
    ]);
    return {
      ...bill,
      dueAmount: this.calculatedDueAmount(bill),
      items,
      payments: billPayments,
      refunds: billRefunds,
      patient: patientRows[0] ?? null,
    };
  }

  async findByPatient(patientId: number) {
    const rows = await this.db.select().from(bills).where(eq(bills.patientId, patientId)).orderBy(bills.id);
    return rows.map((bill: any) => ({ ...bill, dueAmount: this.calculatedDueAmount(bill) }));
  }

  async applyDiscount(id: number, dto: ApplyDiscountDto, updatedBy: number) {
    return this.db.transaction(async (tx: any) => {
      const [bill] = await tx.select().from(bills).where(eq(bills.id, id)).for('update');
      if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');
      if (bill.billType === BillType.PACKAGE) {
        throw new BadRequestException('প্যাকেজ বিলের মূল্য অ্যাডমিন নির্ধারণ করেন; এই বিলে discount পরিবর্তন করা যাবে না');
      }
      if (bill.status === 'CANCELLED') {
        throw new BadRequestException('Cancelled Bill-এ discount বদলানো যাবে না');
      }

      const items = await tx.select().from(billItems).where(eq(billItems.billId, id));
      const calcItems: BillItemInput[] = items.map((item: any) => ({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        itemDiscountAmount: dto.discountMode === DiscountMode.BILL || dto.discountMode === DiscountMode.NONE
          ? '0'
          : this.itemDiscountAmount(item).toDb(),
      }));

      const mode = dto.discountMode;
      const billDiscountValue = dto.discountAmount ?? '0';
      this.calc.validateDiscountMode(mode, billDiscountValue, calcItems);
      const totals = this.calc.computeTotals(mode, billDiscountValue, calcItems);

      const newDue = Money.of(totals.netAmount).subtract(bill.totalPaid);
      if (newDue.isNegative()) {
        throw new BadRequestException(
          'নতুন discount দিলে জমার (total paid) চেয়ে Net Amount কমে যাচ্ছে — আগে এটা সমাধান করুন',
        );
      }

      const [updated] = await tx
        .update(bills)
        .set({
          discountMode: mode,
          billDiscountValue: mode === DiscountMode.BILL ? Money.of(billDiscountValue).toDb() : '0.00',
          discountPercent: '0.00',
          grossAmount: totals.grossAmount,
          discountAmount: totals.discountAmount,
          netAmount: totals.netAmount,
          dueAmount: newDue.toDb(),
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(bills.id, id))
        .returning();

      if (mode === DiscountMode.BILL || mode === DiscountMode.NONE) {
        await tx
          .update(billItems)
          .set({ itemDiscountValue: '0.00', itemDiscountPercent: '0.00', discountAmount: '0.00' })
          .where(eq(billItems.billId, id));
      }

      await this.auditLog.log({
        dbOrTx: tx,
        userId: updatedBy,
        action: AuditAction.UPDATE,
        tableName: 'bills',
        recordId: id,
        oldValue: { ...bill, items },
        newValue: updated,
      });

      return updated;
    });
  }

  async recalcAndUpdateBillTotals(billId: number, db: any = this.db) {
    const [bill] = await db.select().from(bills).where(eq(bills.id, billId)).for('update');
    if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');

    const items = await db.select().from(billItems).where(eq(billItems.billId, billId));
    const calcItems: BillItemInput[] = items.map((i: any) => ({
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      itemDiscountAmount: this.itemDiscountAmount(i).toDb(),
    }));

    const gross = items.reduce((sum: Money, item: any) => sum.add(Money.of(item.unitPrice).multiply(item.quantity)), Money.of('0'));
    const discountValue = this.billDiscountAmount(bill, gross.toDb()).toDb();
    const totals = this.calc.computeTotals(bill.discountMode, discountValue, calcItems);
    const newDue = Money.of(totals.netAmount).subtract(bill.totalPaid);
    if (newDue.isNegative()) {
      throw new BadRequestException(
        'নতুন হিসাবে Net Amount জমার (total paid) চেয়ে কম হয়ে যাচ্ছে — আগে Refund করুন',
      );
    }

    const [updated] = await db
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

  async deleteOne(id: number, deletedBy: number) {
    return this.db.transaction(async (tx: any) => {
      const [bill] = await tx.select().from(bills).where(eq(bills.id, id)).for('update');
      if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');

      const paymentRows = await tx
        .select()
        .from(payments)
        .where(eq(payments.billId, id))
        .for('update');
      const refundRows = await tx
        .select()
        .from(refunds)
        .where(eq(refunds.billId, id))
        .for('update');
      const [admission] = await tx
        .select({ id: admissions.id })
        .from(admissions)
        .where(eq(admissions.billId, id))
        .limit(1);
      if (bill.billType === BillType.ADMISSION || admission) {
        throw new BadRequestException('ভর্তি রেকর্ড যুক্ত বিল মুছবেন না। আগে ভর্তি রেকর্ডটি সঠিকভাবে বন্ধ করতে হবে।');
      }

      const [unallocatedDueReceipt] = await tx
        .select({ id: duePayments.id })
        .from(duePayments)
        .where(and(
          eq(duePayments.patientId, bill.patientId),
          notExists(
            tx.select({ id: payments.id })
              .from(payments)
              .where(eq(payments.duePaymentId, duePayments.id)),
          ),
        ))
        .limit(1);

      if (unallocatedDueReceipt) {
        throw new BadRequestException(
          'রোগীর একটি due receipt কোনো বিলে বরাদ্দ করা নেই। হিসাব মিলিয়ে receipt ঠিক করার পর বিল মুছুন।',
        );
      }

      const items = await tx.select().from(billItems).where(eq(billItems.billId, id));
      const paymentTotal = paymentRows.reduce(
        (sum: Money, payment: any) => sum.add(payment.amount),
        Money.of('0'),
      );
      const refundTotal = refundRows.reduce(
        (sum: Money, refund: any) => sum.add(refund.amount),
        Money.of('0'),
      );
      if (!paymentTotal.add(refundTotal).equals(bill.totalPaid)) {
        throw new BadRequestException(
          'বিলের জমার অঙ্ক payment/refund রেকর্ডের সঙ্গে মিলছে না। হিসাব যাচাই না করে বিল মুছবেন না।',
        );
      }

      const duePaymentIds = [...new Set<number>(
        paymentRows
          .map((payment: any) => payment.duePaymentId)
          .filter((duePaymentId: number | null): duePaymentId is number => duePaymentId !== null),
      )];
      const dueReceiptAdjustments: { before: any; after: any | null }[] = [];

      for (const duePaymentId of duePaymentIds) {
        const [receipt] = await tx
          .select()
          .from(duePayments)
          .where(eq(duePayments.id, duePaymentId))
          .for('update');
        if (!receipt) {
          throw new BadRequestException('বিলের payment একটি due receipt-এর সঙ্গে যুক্ত, কিন্তু receipt পাওয়া যায়নি।');
        }

        const receiptAllocations = await tx
          .select()
          .from(payments)
          .where(eq(payments.duePaymentId, duePaymentId))
          .for('update');
        const allocatedTotal = receiptAllocations.reduce(
          (sum: Money, payment: any) => sum.add(payment.amount),
          Money.of('0'),
        );
        if (!allocatedTotal.equals(receipt.amount)) {
          throw new BadRequestException(
            'due receipt-এর মোট অঙ্ক ও bill-এ বরাদ্দ করা অঙ্ক মিলছে না। হিসাব ঠিক না করে বিল মুছবেন না।',
          );
        }

        const remainingAllocations = receiptAllocations.filter((payment: any) => payment.billId !== id);
        const remainingAmount = remainingAllocations.reduce(
          (sum: Money, payment: any) => sum.add(payment.amount),
          Money.of('0'),
        );
        if (remainingAllocations.length === 0) {
          await tx.delete(duePayments).where(eq(duePayments.id, duePaymentId));
          dueReceiptAdjustments.push({ before: receipt, after: null });
        } else {
          const [updatedReceipt] = await tx
            .update(duePayments)
            .set({ amount: remainingAmount.toDb() })
            .where(eq(duePayments.id, duePaymentId))
            .returning();
          dueReceiptAdjustments.push({ before: receipt, after: updatedReceipt });
        }
      }

      await this.auditLog.log({
        dbOrTx: tx,
        userId: deletedBy,
        action: AuditAction.DELETE,
        tableName: 'bills',
        recordId: id,
        oldValue: {
          bill,
          items,
          payments: paymentRows,
          refunds: refundRows,
          dueReceipts: dueReceiptAdjustments.map(({ before }) => before),
        },
        newValue: {
          dueReceiptAdjustments: dueReceiptAdjustments.map(({ before, after }) => ({ before, after })),
        },
      });

      await tx.delete(payments).where(eq(payments.billId, id));
      await tx.delete(refunds).where(eq(refunds.billId, id));
      await tx.delete(billItems).where(eq(billItems.billId, id));
      await tx.delete(bills).where(eq(bills.id, id));

      return {
        deleted: true,
        billId: id,
        billNo: bill.billNo,
        deletedPaymentCount: paymentRows.length,
        deletedRefundCount: refundRows.length,
        adjustedDueReceiptCount: dueReceiptAdjustments.length,
      };
    });
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
    const rows = await this.db.select().from(bills).orderBy(bills.id);
    return rows.map((bill: any) => ({ ...bill, dueAmount: this.calculatedDueAmount(bill) }));
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
    return {
      items: items.map((bill: any) => ({ ...bill, dueAmount: this.calculatedDueAmount(bill) })),
      total: Number(countRows[0]?.count ?? 0),
      page: dto.page,
      pageSize: dto.pageSize,
    };
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
