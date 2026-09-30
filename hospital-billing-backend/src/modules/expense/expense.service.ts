import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { expenses } from '../../database/schema';
import { Money } from '../../common/utils/money.util';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { PageQueryDto } from '../../common/dto/page-query.dto';

@Injectable()
export class ExpenseService {
  constructor(
    @Inject(DRIZZLE) private db: any,
    private auditLog: AuditLogService,
  ) {}

  async create(dto: CreateExpenseDto, enteredBy: number) {
    const amount = Money.of(dto.amount);
    if (!amount.isGreaterThan('0')) {
      throw new BadRequestException('খরচের পরিমাণ ধনাত্মক হতে হবে');
    }

    const [created] = await this.db
      .insert(expenses)
      .values({
        enteredBy,
        expenseDate: dto.expenseDate,
        expenseType: dto.expenseType,
        amount: amount.toDb(),
        description: dto.description ?? null,
      })
      .returning();

    await this.auditLog.log({
      userId: enteredBy,
      action: AuditAction.INSERT,
      tableName: 'expenses',
      recordId: created.id,
      newValue: created,
    });

    return created;
  }

  async findAll() {
    return this.db.select().from(expenses).orderBy(expenses.id);
  }

  async findPage({ page, pageSize }: PageQueryDto) {
    const [items, [{ total }], [{ todayTotal }]] = await Promise.all([
      this.db.select().from(expenses).orderBy(expenses.id).limit(pageSize).offset((page - 1) * pageSize),
      this.db.select({ total: sql<number>`count(*)::int` }).from(expenses),
      this.db.select({ todayTotal: sql<string>`COALESCE(SUM(${expenses.amount}), 0)` }).from(expenses).where(sql`${expenses.expenseDate} = CURRENT_DATE`),
    ]);
    return { items, total, page, pageSize, todayTotal };
  }

  async findOne(id: number) {
    const [expense] = await this.db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    if (!expense) throw new NotFoundException('Expense পাওয়া যায়নি');
    return expense;
  }

  async update(id: number, dto: UpdateExpenseDto, updatedBy: number) {
    const old = await this.findOne(id);

    const setValue: any = {};
    if (dto.expenseDate !== undefined) setValue.expenseDate = dto.expenseDate;
    if (dto.expenseType !== undefined) setValue.expenseType = dto.expenseType;
    if (dto.description !== undefined) setValue.description = dto.description;
    if (dto.amount !== undefined) {
      const amount = Money.of(dto.amount);
      if (!amount.isGreaterThan('0')) {
        throw new BadRequestException('খরচের পরিমাণ ধনাত্মক হতে হবে');
      }
      setValue.amount = amount.toDb();
    }

    const [updated] = await this.db
      .update(expenses)
      .set(setValue)
      .where(eq(expenses.id, id))
      .returning();

    await this.auditLog.log({
      userId: updatedBy,
      action: AuditAction.UPDATE,
      tableName: 'expenses',
      recordId: id,
      oldValue: old,
      newValue: updated,
    });

    return updated;
  }
}
