import { pgTable, text, timestamp, varchar, integer, pgEnum, boolean, jsonb, uuid } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'
import { relations } from 'drizzle-orm'

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'contacted',
  'scheduled',
  'confirmed',
  'declined',
  'cancelled',
  'no_show',
])

export const appointmentTypeEnum = pgEnum('appointment_type', [
  'consultation',
  'follow_up',
  'emergency',
  'routine_checkup',
  'telehealth',
])

export const bookingRequests = pgTable('booking_requests', {
  id: varchar('id', { length: 255 }).primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  clinicId: varchar('clinic_id', { length: 255 }),
  providerId: varchar('provider_id', { length: 255 }),
  appointmentTypeId: varchar('appointment_type_id', { length: 255 }),
  patientName: text('patient_name').notNull(),
  patientEmail: text('patient_email').notNull(),
  patientPhone: varchar('patient_phone', { length: 50 }),
  patientDateOfBirth: varchar('patient_dob', { length: 50 }),
  insuranceProvider: text('insurance_provider'),
  insuranceMemberId: text('insurance_member_id'),
  preferredDates: jsonb('preferred_dates').notNull(), // Array of strings
  preferredTimeOfDay: text('preferred_time_of_day'),
  notes: text('notes'),
  status: bookingStatusEnum('status').default('pending').notNull(),
  source: text('source'),
  sourceUrl: text('source_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const appointments = pgTable('appointments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  patientId: varchar('patient_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id), // The provider's user ID
  scheduledAt: timestamp('scheduled_at').notNull(),
  duration: integer('duration').notNull(), // in minutes
  type: appointmentTypeEnum('type').notNull(),
  notes: text('notes'),
  locationId: varchar('location_id', { length: 255 }),
  status: text('status').default('scheduled').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const bookingRequestsRelations = relations(bookingRequests, ({ one }) => ({
  organization: one(organizations, {
    fields: [bookingRequests.organizationId],
    references: [organizations.id],
  }),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  organization: one(organizations, {
    fields: [appointments.organizationId],
    references: [organizations.id],
  }),
  providerUser: one(users, {
    fields: [appointments.userId],
    references: [users.id],
  }),
  creator: one(users, {
    fields: [appointments.createdBy],
    references: [users.id],
  }),
}))
