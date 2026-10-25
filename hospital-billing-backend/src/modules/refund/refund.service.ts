import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { refunds, bills } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { CreateRefundDto } from './dto/create-refund.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { ShiftService } from '../shift/shift.service';

@Injectable()
export class RefundService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private auditLog: AuditLogService,
    private shiftService: ShiftService,
  ) {}

  async create(dto: CreateRefundDto, refundedBy: number, shiftId: number) {
    const amount = Money.of(Money.of(dto.amount).toDb());
    if (!amount.isGreaterThan('0')) {
      throw new BadRequestException('Refund-এর পরিমাণ ধনাত্মক হতে হবে');
    }

    return this.db.transaction(async (tx: any) => {
      await this.shiftService.lockOpenShift(tx, shiftId, refundedBy);
      const [bill] = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, dto.billId))
        .for('update');

      if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');
      if (bill.status !== 'ACTIVE') {
        throw new BadRequestException('Cancelled Bill-এ Refund দেওয়া যাবে না');
      }
      if (amount.isGreaterThan(bill.totalPaid)) {
        throw new BadRequestException(
          `Refund (${dto.amount}) জমার (${bill.totalPaid}) চেয়ে বেশি হতে পারবে না`,
        );
      }

      const negativeAmount = Money.of('0').subtract(amount);
      const [refund] = await tx
        .insert(refunds)
        .values({ billId: dto.billId, refundedBy, shiftId, amount: negativeAmount.toDb() })
        .returning();

      const newTotalPaid = Money.of(bill.totalPaid).subtract(amount);
      const newDue = Money.of(bill.netAmount).subtract(newTotalPaid);

      await tx
        .update(bills)
        .set({ totalPaid: newTotalPaid.toDb(), dueAmount: newDue.toDb(), updatedAt: new Date() })
        .where(eq(bills.id, dto.billId));

      await this.auditLog.log({
        dbOrTx: tx,
        userId: refundedBy,
        action: AuditAction.INSERT,
        tableName: 'refunds',
        recordId: refund.id,
        newValue: refund,
      });

      return refund;
    });
  }

  async findByBill(billId: number) {
    return this.db.select().from(refunds).where(eq(refunds.billId, billId));
  }
}
