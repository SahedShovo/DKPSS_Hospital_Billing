import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { payments, bills } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private auditLog: AuditLogService,
  ) {}

  async create(dto: CreatePaymentDto, receivedBy: number, shiftId: number) {
    const amount = Money.of(dto.amount);
    if (!amount.isGreaterThan('0')) {
      throw new BadRequestException('Payment-এর পরিমাণ ধনাত্মক হতে হবে');
    }

    return this.db.transaction(async (tx: any) => {
      const [bill] = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, dto.billId))
        .for('update');

      if (!bill) throw new NotFoundException('Bill পাওয়া যায়নি');
      if (bill.status !== 'ACTIVE') {
        throw new BadRequestException('Cancelled Bill-এ Payment নেওয়া যাবে না');
      }
      if (amount.isGreaterThan(bill.dueAmount)) {
        throw new BadRequestException(
          `Payment (${dto.amount}) Due-এর (${bill.dueAmount}) চেয়ে বেশি হতে পারবে না`,
        );
      }

      const [payment] = await tx
        .insert(payments)
        .values({ billId: dto.billId, receivedBy, shiftId, amount: amount.toDb() })
        .returning();

      const newTotalPaid = Money.of(bill.totalPaid).add(amount);
      const newDue = Money.of(bill.dueAmount).subtract(amount);

      await tx
        .update(bills)
        .set({ totalPaid: newTotalPaid.toDb(), dueAmount: newDue.toDb(), updatedAt: new Date() })
        .where(eq(bills.id, dto.billId));

      await this.auditLog.log({
        dbOrTx: tx,
        userId: receivedBy,
        action: AuditAction.INSERT,
        tableName: 'payments',
        recordId: payment.id,
        newValue: payment,
      });

      return payment;
    });
  }

  async findByBill(billId: number) {
    return this.db.select().from(payments).where(eq(payments.billId, billId));
  }
}