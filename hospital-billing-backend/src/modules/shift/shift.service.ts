import { Injectable, Inject, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { shifts, payments, duePayments, refunds, users } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';

@Injectable()
export class ShiftService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  async openShift(userId: number, dto: OpenShiftDto) {
    const openingCash = Money.of(dto.openingCash);
    if (openingCash.isNegative()) throw new BadRequestException('শুরুর ক্যাশ ঋণাত্মক হতে পারবে না');

    return this.db.transaction(async (tx: any) => {
      // Serialize shift opening requests for the same user.
      const [user] = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for('update');
      if (!user) throw new NotFoundException('ইউজার পাওয়া যায়নি');
      const existing = await this.getOpenShiftForUser(userId, tx);
      if (existing) throw new ConflictException('আপনার একটি Shift ইতিমধ্যে চালু আছে');

      const [created] = await tx
        .insert(shifts)
        .values({ userId, openingCash: openingCash.toDb() })
        .returning();
      return created;
    });
  }

  async getOpenShiftForUser(userId: number, db: any = this.db) {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.userId, userId), eq(shifts.status, 'OPEN')))
      .limit(1);
    return shift ?? null;
  }

  /** Lock and verify the active shift inside the caller's transaction. */
  async lockOpenShift(db: any, shiftId: number, userId: number) {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(and(
        eq(shifts.id, shiftId),
        eq(shifts.userId, userId),
        eq(shifts.status, 'OPEN'),
      ))
      .for('update');
    if (!shift) throw new ForbiddenException('এই Shift বন্ধ বা আর চালু নেই — নতুন Shift খুলে আবার চেষ্টা করুন');
    return shift;
  }

  async getMyCurrentShift(userId: number) {
    const shift = await this.getOpenShiftForUser(userId);
    if (!shift) throw new NotFoundException('কোনো চালু Shift নেই');
    return shift;
  }

  /** Shift-এর হিসাব: opening + regular payments + due receipts + refunds(negative). */
  async getSummary(shiftId: number, userId: number, db: any = this.db) {
    const [shift] = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.id, shiftId), eq(shifts.userId, userId)))
      .limit(1);
    if (!shift) throw new NotFoundException('Shift পাওয়া যায়নি');

    const [{ sum: paymentsSum }] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${payments.amount}),0)` })
      .from(payments)
      .where(and(eq(payments.shiftId, shiftId), sql`${payments.duePaymentId} IS NULL`));

    const [{ sum: dueSum }] = await db
      .select({ sum: sql<string>`COALESCE(SUM(${duePayments.amount}),0)` })
      .from(duePayments)
      .where(eq(duePayments.shiftId, shiftId));

    const [{ sum: refundsSum }] = await db
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
    const closingCash = Money.of(dto.closingCash);
    if (closingCash.isNegative()) throw new BadRequestException('শেষের ক্যাশ ঋণাত্মক হতে পারবে না');

    return this.db.transaction(async (tx: any) => {
      const [shift] = await tx
        .select()
        .from(shifts)
        .where(and(eq(shifts.userId, userId), eq(shifts.status, 'OPEN')))
        .limit(1)
        .for('update');
      if (!shift) throw new NotFoundException('চালু কোনো Shift নেই');

      // Collection services lock the same shift row before inserting cash entries.
      // This summary therefore includes every completed collection before close.
      const summary = await this.getSummary(shift.id, userId, tx);
      const difference = closingCash.subtract(summary.expectedCash);
      const [updated] = await tx
        .update(shifts)
        .set({
          status: 'CLOSED',
          closingCash: closingCash.toDb(),
          expectedCash: summary.expectedCash,
          difference: difference.toDb(),
          endTime: new Date(),
        })
        .where(and(eq(shifts.id, shift.id), eq(shifts.status, 'OPEN')))
        .returning();
      return updated;
    });
  }
}
