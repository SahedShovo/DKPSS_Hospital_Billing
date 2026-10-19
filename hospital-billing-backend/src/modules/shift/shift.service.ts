import { Injectable, Inject, ConflictException, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { shifts, payments, duePayments, refunds } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async openShift(userId: number, dto: OpenShiftDto) {
    const existing = await this.getOpenShiftForUser(userId);
    if (existing) throw new ConflictException('আপনার একটি Shift ইতিমধ্যে চালু আছে');

    const [created] = await this.db
      .insert(shifts)
      .values({
        userId,
        openingCash: Money.of(dto.openingCash).toDb(),
      })
      .returning();
    return created;
  }

  async getOpenShiftForUser(userId: number) {
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(and(eq(shifts.userId, userId), eq(shifts.status, 'OPEN')))
      .limit(1);
    return shift ?? null;
  }

  async getMyCurrentShift(userId: number) {
    const shift = await this.getOpenShiftForUser(userId);
    if (!shift) throw new NotFoundException('কোনো চালু Shift নেই');
    return shift;
  }

  /** Shift-এর হিসাব: opening + payments + due_payments + refunds(negative) */
  async getSummary(shiftId: number, userId: number) {
    const [shift] = await this.db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.userId, userId)))
      .limit(1);
    if (!shift) throw new NotFoundException('Shift পাওয়া যায়নি');

    const [{ sum: paymentsSum }] = await this.db
      .select({ sum: sql<string>`COALESCE(SUM(${payments.amount}),0)` })
      .from(payments)
      .where(eq(payments.shiftId, shiftId));

    const [{ sum: dueSum }] = await this.db
      .select({ sum: sql<string>`COALESCE(SUM(${duePayments.amount}),0)` })
      .from(duePayments)
      .where(eq(duePayments.shiftId, shiftId));

    const [{ sum: refundsSum }] = await this.db
      .select({ sum: sql<string>`COALESCE(SUM(${refunds.amount}),0)` })
      .from(refunds)
      .where(eq(refunds.shiftId, shiftId));

    const expectedCash = Money.of(shift.openingCash)
      .add(paymentsSum)
      .add(dueSum)
      .add(refundsSum);

    return {
      shiftId: shift.id,
      openingCash: shift.openingCash,
      paymentsTotal: Money.of(paymentsSum).toDb(),
      dueCollected: Money.of(dueSum).toDb(),
      refundsTotal: Money.of(refundsSum).toDb(),
      expectedCash: expectedCash.toDb(),
    };
  }

  async closeShift(userId: number, dto: CloseShiftDto) {
    const shift = await this.getOpenShiftForUser(userId);
    if (!shift) throw new NotFoundException('চালু কোনো Shift নেই');

    const summary = await this.getSummary(shift.id, userId);
    const closingCash = Money.of(dto.closingCash);
    const difference = closingCash.subtract(summary.expectedCash);

    const [updated] = await this.db
      .update(shifts)
      .set({
        status: 'CLOSED',
        closingCash: closingCash.toDb(),
        expectedCash: summary.expectedCash,
        difference: difference.toDb(),
        endTime: new Date(),
      })
      .where(eq(shifts.id, shift.id))
      .returning();

    return updated;
  }
}
