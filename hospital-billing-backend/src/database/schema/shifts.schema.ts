import { pgTable, serial, integer, numeric, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const shifts = pgTable('shifts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  openingCash: numeric('opening_cash', { precision: 12, scale: 2 }).notNull(),
  closingCash: numeric('closing_cash', { precision: 12, scale: 2 }),
  expectedCash: numeric('expected_cash', { precision: 12, scale: 2 }),
  difference: numeric('difference', { precision: 12, scale: 2 }),
  status: varchar('status', { length: 6 }).notNull().default('OPEN'), // OPEN | CLOSED
  startTime: timestamp('start_time', { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp('end_time', { withTimezone: true }),
});