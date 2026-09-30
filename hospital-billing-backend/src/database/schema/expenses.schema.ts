import { pgTable, serial, integer, varchar, numeric, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  enteredBy: integer('entered_by').notNull().references(() => users.id),
  expenseDate: date('expense_date').notNull(),
  expenseType: varchar('expense_type', { length: 50 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index('expenses_created_at_idx').on(table.createdAt),
}));
