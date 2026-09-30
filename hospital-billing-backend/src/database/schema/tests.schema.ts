import { pgTable, serial, varchar, numeric, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const tests = pgTable('tests', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull().unique(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer('updated_by').notNull().references(() => users.id),
});