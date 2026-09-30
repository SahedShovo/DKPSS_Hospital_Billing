import { pgTable, serial, varchar, numeric, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const packages = pgTable('packages', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 150 }).notNull().unique(),
  packagePrice: numeric('package_price', { precision: 12, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer('created_by').notNull().references(() => users.id),
});

export const packageItems = pgTable('package_items', {
  id: serial('id').primaryKey(),
  packageId: integer('package_id').notNull().references(() => packages.id, { onDelete: 'cascade' }),
  itemType: varchar('item_type', { length: 20 }).notNull(),
  itemName: varchar('item_name', { length: 150 }).notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
});