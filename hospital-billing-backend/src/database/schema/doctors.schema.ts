import { pgTable, serial, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer('created_by').notNull().references(() => users.id),
});