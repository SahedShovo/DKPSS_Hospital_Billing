import { pgTable, serial, integer, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { bills } from './bills.schema';
import { patients } from './patients.schema';
import { users } from './users.schema';
import { shifts } from './shifts.schema';

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  billId: integer('bill_id').notNull().references(() => bills.id),
  receivedBy: integer('received_by').notNull().references(() => users.id),
  shiftId: integer('shift_id').notNull().references(() => shifts.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index('payments_bill_id_idx').on(table.billId),
  paidAtIdx: index('payments_paid_at_idx').on(table.paidAt),
}));

export const duePayments = pgTable('due_payments', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  receivedBy: integer('received_by').notNull().references(() => users.id),
  shiftId: integer('shift_id').notNull().references(() => shifts.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  patientIdIdx: index('due_payments_patient_id_idx').on(table.patientId),
  paidAtIdx: index('due_payments_paid_at_idx').on(table.paidAt),
}));

export const refunds = pgTable('refunds', {
  id: serial('id').primaryKey(),
  billId: integer('bill_id').notNull().references(() => bills.id),
  refundedBy: integer('refunded_by').notNull().references(() => users.id),
  shiftId: integer('shift_id').notNull().references(() => shifts.id),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(), // negative value
  refundedAt: timestamp('refunded_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  billIdIdx: index('refunds_bill_id_idx').on(table.billId),
  refundedAtIdx: index('refunds_refunded_at_idx').on(table.refundedAt),
}));
