import { pgTable, serial, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const patients = pgTable('patients', {
  id: serial('id').primaryKey(),
  patientCode: varchar('patient_code', { length: 12 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  age: integer('age').notNull(),
  gender: varchar('gender', { length: 10 }).notNull(), // MALE | FEMALE | OTHER
  phone: varchar('phone', { length: 20 }).notNull(),
  address: text('address').notNull(),
  refer: varchar('refer', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer('created_by').notNull().references(() => users.id),
});