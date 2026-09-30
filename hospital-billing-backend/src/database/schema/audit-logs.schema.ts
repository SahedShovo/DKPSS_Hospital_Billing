import { pgTable, bigserial, integer, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  action: varchar('action', { length: 20 }).notNull(),
  tableName: varchar('table_name', { length: 50 }).notNull(),
  recordId: integer('record_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});