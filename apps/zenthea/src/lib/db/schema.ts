import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, index, primaryKey, pgEnum } from 'drizzle-orm/pg-core'
import { organizations } from '@startkit/database/schema'
import { users } from '@startkit/database/schema'

/**
 * Zenthea App-Local Schema
 * 
 * Follows the guardrail: "Product tables live in the app".
 * All tenant-scoped tables MUST have organization_id (UUID).
 * 
 * @ai-context Schema for Zenthea healthcare entities.
 */

// --- ENUMS ---

export const patientStatusEnum = pgEnum('zenthea_patient_status', ['active', 'inactive', 'discharged'])
export const patientOrgAccessStatusEnum = pgEnum('zenthea_patient_org_access_status', ['pending', 'active', 'revoked'])
export const appointmentTypeEnum = pgEnum('zenthea_appointment_type', ['consultation', 'follow-up', 'procedure', 'emergency'])
export const appointmentStatusEnum = pgEnum('zenthea_appointment_status', ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'])
export const clinicTypeEnum = pgEnum('zenthea_clinic_type', ['office', 'hospital', 'telehealth'])

// --- CORE TABLES ---

/**
 * Clinics table
 * Each clinic belongs to an organization (tenant).
 */
export const clinics = pgTable(
  'zenthea_clinics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    address: jsonb('address'), // { street, city, state, zipCode, country }
    phone: text('phone'),
    type: clinicTypeEnum('type').notNull().default('office'),
    timezone: text('timezone'), // IANA timezone
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_clinics_org_idx').on(table.organizationId),
  ]
)

/**
 * Patients table
 * Patient records are isolated by organization_id.
 */
export const patients = pgTable(
  'zenthea_patients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dateOfBirth: timestamp('date_of_birth').notNull(),
    email: text('email'),
    phone: text('phone'),
    address: jsonb('address'),
    status: patientStatusEnum('status').notNull().default('active'),
    gender: text('gender'),
    preferredName: text('preferred_name'),
    primaryProviderId: uuid('primary_provider_id').references(() => users.id),
    preferredClinicId: uuid('preferred_clinic_id').references(() => clinics.id),
    medicalHistory: jsonb('medical_history'),
    allergies: jsonb('allergies'),
    medications: jsonb('medications'),
    insurance: jsonb('insurance'),
    lifestyle: jsonb('lifestyle'),
    familyHistory: jsonb('family_history'),
    immunizations: jsonb('immunizations'),
    advanceDirectives: jsonb('advance_directives'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_patients_org_idx').on(table.organizationId),
    index('zenthea_patients_name_idx').on(table.firstName, table.lastName),
    index('zenthea_patients_email_idx').on(table.email),
  ]
)

/**
 * Providers table
 * Additional metadata for users who are providers.
 */
export const providers = pgTable(
  'zenthea_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    specialty: text('specialty').notNull(),
    licenseNumber: text('license_number').notNull(),
    npi: text('npi').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_providers_org_idx').on(table.organizationId),
    index('zenthea_providers_user_idx').on(table.userId),
  ]
)

// --- APPOINTMENTS & SCHEDULING ---

/**
 * Appointments table
 */
export const appointments = pgTable(
  'zenthea_appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id').references(() => clinics.id),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    duration: integer('duration').notNull(), // in minutes
    type: appointmentTypeEnum('type').notNull().default('consultation'),
    status: appointmentStatusEnum('status').notNull().default('scheduled'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id),
    lastModifiedBy: uuid('last_modified_by').references(() => users.id),
    googleCalendarEventId: text('google_calendar_event_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_appointments_org_idx').on(table.organizationId),
    index('zenthea_appointments_patient_idx').on(table.patientId),
    index('zenthea_appointments_clinic_idx').on(table.clinicId),
    index('zenthea_appointments_scheduled_at_idx').on(table.scheduledAt),
  ]
)

/**
 * Appointment Members junction table
 * Tracks users (staff) assigned to an appointment.
 */
export const appointmentMembers = pgTable(
  'zenthea_appointment_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('attendee'), // organizer, attendee, optional
    status: text('status').notNull().default('pending'), // pending, accepted, declined
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_app_members_org_idx').on(table.organizationId),
    index('zenthea_app_members_app_idx').on(table.appointmentId),
    index('zenthea_app_members_user_idx').on(table.userId),
  ]
)

/**
 * Slot Locks table
 * Optimistic locking for booking flow.
 */
export const slotLocks = pgTable(
  'zenthea_slot_locks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    clinicId: uuid('clinic_id').references(() => clinics.id),
    slotStart: timestamp('slot_start', { withTimezone: true }).notNull(),
    slotEnd: timestamp('slot_end', { withTimezone: true }).notNull(),
    lockedBy: uuid('locked_by').references(() => patients.id),
    sessionId: text('session_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_slot_locks_org_idx').on(table.organizationId),
    index('zenthea_slot_locks_user_slot_idx').on(table.userId, table.slotStart),
    index('zenthea_slot_locks_expires_idx').on(table.expiresAt),
  ]
)

// --- CLINICAL RECORDS ---

/**
 * Medical Records table
 */
export const medicalRecords = pgTable(
  'zenthea_medical_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    recordType: text('record_type').notNull(), // vitals, lab_result, medication, etc.
    title: text('title').notNull(),
    description: text('description'),
    data: jsonb('data'), // Structured clinical data
    dateRecorded: timestamp('date_recorded', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('active'),
    isConfidential: boolean('is_confidential').notNull().default(false),
    tags: jsonb('tags').$type<string[]>(),
    attachments: jsonb('attachments'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_medical_records_org_idx').on(table.organizationId),
    index('zenthea_medical_records_patient_idx').on(table.patientId),
    index('zenthea_medical_records_type_idx').on(table.recordType),
  ]
)

/**
 * Medical Record Members junction table
 * Tracks specific users with shared access to a clinical record.
 */
export const medicalRecordMembers = pgTable(
  'zenthea_medical_record_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    medicalRecordId: uuid('medical_record_id')
      .notNull()
      .references(() => medicalRecords.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permission: text('permission').notNull().default('view'), // view, edit
    addedBy: uuid('added_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_med_record_members_org_idx').on(table.organizationId),
    index('zenthea_med_record_members_record_idx').on(table.medicalRecordId),
    index('zenthea_med_record_members_user_idx').on(table.userId),
  ]
)

// --- MESSAGES & COMMUNICATIONS ---

/**
 * Messages table
 */
export const messages = pgTable(
  'zenthea_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    fromUserId: uuid('from_user_id').references(() => users.id),
    toUserId: uuid('to_user_id').references(() => users.id),
    subject: text('subject'),
    content: text('content'),
    messageType: text('message_type').notNull().default('general'), // appointment, general, urgent, system
    priority: text('priority').notNull().default('normal'), // low, normal, high, urgent
    status: text('status').notNull().default('sent'), // sent, delivered, read, archived
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    threadId: text('thread_id'),
    parentMessageId: uuid('parent_message_id'),
    attachments: jsonb('attachments'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_messages_org_idx').on(table.organizationId),
    index('zenthea_messages_from_idx').on(table.fromUserId),
    index('zenthea_messages_to_idx').on(table.toUserId),
    index('zenthea_messages_thread_idx').on(table.threadId),
  ]
)

/**
 * Message Assignments table
 */
export const messageAssignments = pgTable(
  'zenthea_message_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    assignedBy: uuid('assigned_by').references(() => users.id),
    assignedTo: uuid('assigned_to').references(() => users.id),
    status: text('status').notNull().default('pending'), // pending, in_progress, completed, declined
    notes: text('notes'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    declinedReason: text('declined_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_msg_assignments_org_idx').on(table.organizationId),
    index('zenthea_msg_assignments_msg_idx').on(table.messageId),
    index('zenthea_msg_assignments_to_idx').on(table.assignedTo),
  ]
)

// --- BILLING & INVOICES ---

/**
 * Invoices table
 */
export const invoices = pgTable(
  'zenthea_invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id').references(() => appointments.id),
    invoiceNumber: text('invoice_number').notNull().unique(),
    amount: integer('amount').notNull(), // in cents
    status: text('status').notNull().default('pending'), // pending, paid, overdue, cancelled
    serviceType: text('service_type').notNull(),
    description: text('description'),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    paidDate: timestamp('paid_date', { withTimezone: true }),
    paymentMethod: text('payment_method'),
    patientResponsibility: integer('patient_responsibility').notNull().default(0),
    insuranceResponsibility: integer('insurance_responsibility').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_invoices_org_idx').on(table.organizationId),
    index('zenthea_invoices_patient_idx').on(table.patientId),
    index('zenthea_invoices_status_idx').on(table.status),
  ]
)

/**
 * Insurance Payers table
 */
export const insurancePayers = pgTable(
  'zenthea_insurance_payers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    payerId: text('payer_id').notNull(), // Unique string identifier
    name: text('name').notNull(),
    planType: text('plan_type').notNull(), // hmo, ppo, medicare, etc.
    contactInfo: jsonb('contact_info'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_ins_payers_org_idx').on(table.organizationId),
    index('zenthea_ins_payers_payer_id_idx').on(table.payerId),
  ]
)

/**
 * Insurance Claims table
 */
export const insuranceClaims = pgTable(
  'zenthea_insurance_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    payerId: uuid('payer_id')
      .notNull()
      .references(() => insurancePayers.id, { onDelete: 'cascade' }),
    invoiceId: uuid('invoice_id').references(() => invoices.id),
    status: text('status').notNull().default('draft'), // draft, submitted, accepted, denied, paid
    totalCharges: integer('total_charges').notNull(), // in cents
    claimControlNumber: text('claim_control_number').notNull().unique(),
    denialReason: text('denial_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_ins_claims_org_idx').on(table.organizationId),
    index('zenthea_ins_claims_patient_idx').on(table.patientId),
    index('zenthea_ins_claims_status_idx').on(table.status),
  ]
)

// --- INFRASTRUCTURE & SETTINGS ---

/**
 * Support Access Requests table
 * HIPAA: Tracks superadmin access to tenant data with patient consent.
 */
export const supportAccessRequests = pgTable(
  'zenthea_support_access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    superadminId: uuid('superadmin_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetUserId: uuid('target_user_id').references(() => users.id),
    purpose: text('purpose').notNull(),
    status: text('status').notNull().default('pending'), // pending, approved, denied, expired
    digitalSignature: jsonb('digital_signature'),
    expirationTimestamp: timestamp('expiration_timestamp', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => users.id),
    deniedBy: uuid('denied_by').references(() => users.id),
    deniedReason: text('denied_reason'),
    auditTrail: jsonb('audit_trail'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_support_access_org_idx').on(table.organizationId),
    index('zenthea_support_access_status_idx').on(table.status),
  ]
)

/**
 * Website Builder Versions table
 */
export const websiteBuilderVersions = pgTable(
  'zenthea_website_builder_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    version: text('version').notNull(),
    versionNumber: integer('version_number').notNull(),
    label: text('label'),
    snapshot: jsonb('snapshot').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    note: text('note'),
  },
  (table) => [
    index('zenthea_web_builder_org_idx').on(table.organizationId),
    index('zenthea_web_builder_version_idx').on(table.organizationId, table.versionNumber),
  ]
)

/**
 * Notifications table
 */
export const notifications = pgTable(
  'zenthea_notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    resourceType: text('resource_type'),
    resourceId: text('resource_id'),
    metadata: jsonb('metadata'),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_notifications_org_user_idx').on(table.organizationId, table.userId),
    index('zenthea_notifications_is_read_idx').on(table.isRead),
  ]
)

/**
 * Provider Profiles table
 */
export const providerProfiles = pgTable(
  'zenthea_provider_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id'),
    title: text('title'),
    gender: text('gender'),
    npi: text('npi'),
    licenseNumber: text('license_number'),
    licenseState: text('license_state'),
    specialties: jsonb('specialties').$type<string[]>(),
    bio: text('bio'),
    languages: jsonb('languages').$type<string[]>(),
    professionalPhotoUrl: text('professional_photo_url'),
    visibility: jsonb('visibility').notNull(),
    isPublished: boolean('is_published').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_provider_profiles_org_idx').on(table.organizationId),
    index('zenthea_provider_profiles_user_idx').on(table.userId),
  ]
)

/**
 * Invitations table
 * (Extends StartKit's invitation concept with Zenthea-specific fields if needed)
 */
export const invitations = pgTable(
  'zenthea_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    token: text('token').notNull().unique(),
    role: text('role').notNull(),
    status: text('status').notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    invitedBy: uuid('invited_by').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_invitations_org_idx').on(table.organizationId),
    index('zenthea_invitations_email_idx').on(table.email),
  ]
)

// --- PATIENT ACCOUNT & CONSENT ---

/**
 * Patient Accounts table
 * Global identity for patients across multiple organizations.
 * Linked to a Clerk user ID.
 */
export const patientAccounts = pgTable(
  'zenthea_patient_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkUserId: text('clerk_user_id').notNull().unique(),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_patient_accounts_clerk_idx').on(table.clerkUserId),
    index('zenthea_patient_accounts_email_idx').on(table.email),
  ]
)

/**
 * Patient Organization Access table
 * Tracks patient consent/grants for organizations to access their data.
 */
export const patientOrgAccess = pgTable(
  'zenthea_patient_org_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientAccountId: uuid('patient_account_id')
      .notNull()
      .references(() => patientAccounts.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    status: patientOrgAccessStatusEnum('status').notNull().default('pending'),
    requestedByUserId: uuid('requested_by_user_id').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('zenthea_patient_access_account_idx').on(table.patientAccountId),
    index('zenthea_patient_access_org_idx').on(table.organizationId),
    index('zenthea_patient_access_status_idx').on(table.status),
  ]
)
