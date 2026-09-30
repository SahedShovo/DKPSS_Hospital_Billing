import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from '../../database/drizzle.provider';
import { auditLogs } from '../../database/schema';
import { AuditAction } from '../../common/enums/audit-action.enum';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(@Inject(DRIZZLE) private db: any) {}

  /**
   * কে, কখন, কোন table/record বদলেছে তা লেখে।
   * dbOrTx হিসেবে transaction (tx) পাঠালে সেই একই transaction-এর ভেতরেই log লেখা হয়,
   * তাই bill/payment insert সফল হয়ে audit log fail (বা উল্টো) হওয়ার সুযোগ নেই।
   */
  async log(params: {
    dbOrTx?: any;
    userId: number;
    action: AuditAction;
    tableName: string;
    recordId: number | null;
    oldValue?: unknown;
    newValue?: unknown;
  }) {
    const executor = params.dbOrTx ?? this.db;
    await executor.insert(auditLogs).values({
      userId: params.userId,
      action: params.action,
      tableName: params.tableName,
      recordId: params.recordId,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
    });
  }

  async query(dto: QueryAuditLogDto) {
    const conditions = [];
    if (dto.tableName) conditions.push(eq(auditLogs.tableName, dto.tableName));
    if (dto.recordId) conditions.push(eq(auditLogs.recordId, dto.recordId));
    if (dto.userId) conditions.push(eq(auditLogs.userId, dto.userId));

    const where = conditions.length ? and(...conditions) : undefined;
    const query = this.db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(dto.pageSize ?? 50)
      .offset(((dto.page ?? 1) - 1) * (dto.pageSize ?? 50));
    const countQuery = this.db.select({ total: sql<number>`count(*)::int` }).from(auditLogs);
    const [items, countRows] = await Promise.all([
      where ? query.where(where) : query,
      where ? countQuery.where(where) : countQuery,
    ]);
    return { items, total: countRows[0].total, page: dto.page ?? 1, pageSize: dto.pageSize ?? 50 };
  }
}
