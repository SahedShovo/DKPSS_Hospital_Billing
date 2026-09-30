import { pgTable, serial, integer, varchar, numeric, timestamp } from 'drizzle-orm/pg-core';
import { patients } from './patients.schema';
import { bills } from './bills.schema';
import { users } from './users.schema';

export const admissions = pgTable('admissions', {
  id: serial('id').primaryKey(),
  patientId: integer('patient_id').notNull().references(() => patients.id),
  billId: integer('bill_id').notNull().unique().references(() => bills.id),
  bedType: varchar('bed_type', { length: 10 }).notNull(), // GENERAL | WARD | VIP_CABIN
  bedRate: numeric('bed_rate', { precision: 12, scale: 2 }).notNull(),
  admissionFee: numeric('admission_fee', { precision: 12, scale: 2 }).notNull(),
  admitTime: timestamp('admit_time', { withTimezone: true }).notNull().defaultNow(),
  dischargeTime: timestamp('discharge_time', { withTimezone: true }),
  status: varchar('status', { length: 10 }).notNull().default('ADMITTED'), // ADMITTED | DISCHARGED
  dischargedBy: integer('discharged_by').references(() => users.id),
});