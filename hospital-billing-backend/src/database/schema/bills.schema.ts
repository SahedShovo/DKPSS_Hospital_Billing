import { pgTable, serial, varchar, numeric, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patients.schema';
import { users } from './users.schema';
import { doctors } from './doctors.schema';
import { tests } from './tests.schema';
import { packages } from './packages.schema';

export const bills = pgTable('bills', {
  id: serial('id').primaryKey(),
  billNo: varchar('bill_no', { length: 12 }).notNull().unique(),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  billType: varchar('bill_type', { length: 15 }).notNull(), // DOCTOR_VISIT | DIAGNOSTIC | ADMISSION
  discountMode: varchar('discount_mode', { length: 5 }).notNull().default('NONE'), // NONE | BILL | ITEM
  grossAmount: numeric('gross_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  netAmount: numeric('net_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  totalPaid: numeric('total_paid', { precision: 12, scale: 2 }).notNull().default('0'),
  dueAmount: numeric('due_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  status: varchar('status', { length: 10 }).notNull().default('ACTIVE'), // ACTIVE | CANCELLED
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer('created_by').notNull().references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  updatedBy: integer('updated_by').references(() => users.id),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: integer('cancelled_by').references(() => users.id),
}, (table) => ({
  createdAtIdx: index('bills_created_at_idx').on(table.createdAt),
  patientStatusIdx: index('bills_patient_status_idx').on(table.patientId, table.status),
}));

export const billItems = pgTable('bill_items', {
  id: serial('id').primaryKey(),
  billId: integer('bill_id').notNull().references(() => bills.id),
  itemType: varchar('item_type', { length: 20 }).notNull(),
  itemName: varchar('item_name', { length: 150 }).notNull(),
  visitType: varchar('visit_type', { length: 20 }), // CONSULTANT | DUTY_DOCTOR | SURGEON
  doctorId: integer('doctor_id').references(() => doctors.id),
  testId: integer('test_id').references(() => tests.id),
  packageId: integer('package_id').references(() => packages.id),
  details: jsonb('details'),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  itemDiscountPercent: numeric('item_discount_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0'),
}, (table) => ({
  billIdIdx: index('bill_items_bill_id_idx').on(table.billId),
}));
