import { Injectable, Inject } from '@nestjs/common';
import { and, gte, lte, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { bills, payments, duePayments, refunds, expenses } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { DateRangeDto } from './dto/date-range.dto';

@Injectable()
export class DashboardService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  private formatDhakaDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  }

  private startOfDhakaDay(date: Date): Date {
    return new Date(`${this.formatDhakaDate(date)}T00:00:00+06:00`);
  }

  /**
   * Income = Payments + Refunds(negative) + Old Due Collected
   * Profit = Income - Expense
   */
  async getDailySummary(dto: DateRangeDto) {
    const now = new Date();
    const from = dto.from ? new Date(dto.from) : this.startOfDhakaDay(now);
    const to = dto.to ? new Date(dto.to) : new Date();
    const fromExpenseDate = this.formatDhakaDate(from);
    const toExpenseDate = this.formatDhakaDate(to);

    const [billingRows, cashRows, dueRows, refundRows, expenseRows] = await Promise.all([
      this.db
        .select({ netBilling: sql<string>`COALESCE(SUM(${bills.netAmount}),0)` })
        .from(bills)
        .where(and(gte(bills.createdAt, from), lte(bills.createdAt, to), sql`${bills.status} = 'ACTIVE'`)),
      this.db
        .select({ cashCollection: sql<string>`COALESCE(SUM(${payments.amount}),0)` })
        .from(payments)
        .where(and(
          gte(payments.paidAt, from),
          lte(payments.paidAt, to),
          sql`${payments.duePaymentId} IS NULL`,
        )),
      this.db
        .select({ oldDueCollected: sql<string>`COALESCE(SUM(${duePayments.amount}),0)` })
        .from(duePayments)
        .where(and(gte(duePayments.paidAt, from), lte(duePayments.paidAt, to))),
      this.db
        .select({ refundTotal: sql<string>`COALESCE(SUM(${refunds.amount}),0)` })
        .from(refunds)
        .where(and(gte(refunds.refundedAt, from), lte(refunds.refundedAt, to))),
      this.db
        .select({ expenseTotal: sql<string>`COALESCE(SUM(${expenses.amount}),0)` })
        .from(expenses)
        .where(and(gte(expenses.expenseDate, fromExpenseDate), lte(expenses.expenseDate, toExpenseDate))),
    ]);
    const [{ netBilling }] = billingRows;
    const [{ cashCollection }] = cashRows;
    const [{ oldDueCollected }] = dueRows;
    const [{ refundTotal }] = refundRows;
    const [{ expenseTotal }] = expenseRows;

    const income = Money.of(cashCollection).add(refundTotal).add(oldDueCollected);
    const profit = income.subtract(expenseTotal);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      netBilling: Money.of(netBilling).toDb(),
      cashCollection: Money.of(cashCollection).toDb(),
      oldDueCollected: Money.of(oldDueCollected).toDb(),
      refund: Money.of(refundTotal).toDb(),
      income: income.toDb(),
      expense: Money.of(expenseTotal).toDb(),
      profit: profit.toDb(),
    };
  }
}
