CREATE TYPE "public"."zenthea_appointment_status" AS ENUM('scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."zenthea_appointment_type" AS ENUM('consultation', 'follow-up', 'procedure', 'emergency');--> statement-breakpoint
CREATE TYPE "public"."zenthea_clinic_type" AS ENUM('office', 'hospital', 'telehealth');--> statement-breakpoint
CREATE TYPE "public"."zenthea_patient_status" AS ENUM('active', 'inactive', 'discharged');--> statement-breakpoint
CREATE TABLE "zenthea_appointment_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'attendee' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinic_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"type" "zenthea_appointment_type" DEFAULT 'consultation' NOT NULL,
	"status" "zenthea_appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"last_modified_by" uuid,
	"google_calendar_event_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"address" jsonb,
	"phone" text,
	"type" "zenthea_clinic_type" DEFAULT 'office' NOT NULL,
	"timezone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_insurance_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"payer_id" uuid NOT NULL,
	"invoice_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_charges" integer NOT NULL,
	"claim_control_number" text NOT NULL,
	"denial_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zenthea_insurance_claims_claim_control_number_unique" UNIQUE("claim_control_number")
);
--> statement-breakpoint
CREATE TABLE "zenthea_insurance_payers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"payer_id" text NOT NULL,
	"name" text NOT NULL,
	"plan_type" text NOT NULL,
	"contact_info" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zenthea_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "zenthea_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"appointment_id" uuid,
	"invoice_number" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"service_type" text NOT NULL,
	"description" text,
	"due_date" timestamp with time zone NOT NULL,
	"paid_date" timestamp with time zone,
	"payment_method" text,
	"patient_responsibility" integer DEFAULT 0 NOT NULL,
	"insurance_responsibility" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zenthea_invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "zenthea_medical_record_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"medical_record_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" text DEFAULT 'view' NOT NULL,
	"added_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_medical_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"appointment_id" uuid,
	"record_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"data" jsonb,
	"date_recorded" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_confidential" boolean DEFAULT false NOT NULL,
	"tags" jsonb,
	"attachments" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_message_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_to" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"responded_at" timestamp with time zone,
	"declined_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"subject" text,
	"content" text,
	"message_type" text DEFAULT 'general' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"thread_id" text,
	"parent_message_id" uuid,
	"attachments" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"metadata" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" timestamp NOT NULL,
	"email" text,
	"phone" text,
	"address" jsonb,
	"status" "zenthea_patient_status" DEFAULT 'active' NOT NULL,
	"gender" text,
	"preferred_name" text,
	"primary_provider_id" uuid,
	"preferred_clinic_id" uuid,
	"medical_history" jsonb,
	"allergies" jsonb,
	"medications" jsonb,
	"insurance" jsonb,
	"lifestyle" jsonb,
	"family_history" jsonb,
	"immunizations" jsonb,
	"advance_directives" jsonb,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_provider_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" uuid,
	"title" text,
	"gender" text,
	"npi" text,
	"license_number" text,
	"license_state" text,
	"specialties" jsonb,
	"bio" text,
	"languages" jsonb,
	"professional_photo_url" text,
	"visibility" jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"specialty" text NOT NULL,
	"license_number" text NOT NULL,
	"npi" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_slot_locks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"clinic_id" uuid,
	"slot_start" timestamp with time zone NOT NULL,
	"slot_end" timestamp with time zone NOT NULL,
	"locked_by" uuid,
	"session_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_support_access_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"superadmin_id" uuid NOT NULL,
	"target_user_id" uuid,
	"purpose" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"digital_signature" jsonb,
	"expiration_timestamp" timestamp with time zone,
	"approved_by" uuid,
	"denied_by" uuid,
	"denied_reason" text,
	"audit_trail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zenthea_website_builder_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"version" text NOT NULL,
	"version_number" integer NOT NULL,
	"label" text,
	"snapshot" jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
ALTER TABLE "zenthea_appointment_members" ADD CONSTRAINT "zenthea_appointment_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_appointment_members" ADD CONSTRAINT "zenthea_appointment_members_appointment_id_zenthea_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."zenthea_appointments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_appointment_members" ADD CONSTRAINT "zenthea_appointment_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_appointments" ADD CONSTRAINT "zenthea_appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_appointments" ADD CONSTRAINT "zenthea_appointments_patient_id_zenthea_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."zenthea_patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_appointments" ADD CONSTRAINT "zenthea_appointments_clinic_id_zenthea_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."zenthea_clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_appointments" ADD CONSTRAINT "zenthea_appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_appointments" ADD CONSTRAINT "zenthea_appointments_last_modified_by_users_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_clinics" ADD CONSTRAINT "zenthea_clinics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_insurance_claims" ADD CONSTRAINT "zenthea_insurance_claims_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_insurance_claims" ADD CONSTRAINT "zenthea_insurance_claims_patient_id_zenthea_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."zenthea_patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_insurance_claims" ADD CONSTRAINT "zenthea_insurance_claims_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_insurance_claims" ADD CONSTRAINT "zenthea_insurance_claims_payer_id_zenthea_insurance_payers_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."zenthea_insurance_payers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_insurance_claims" ADD CONSTRAINT "zenthea_insurance_claims_invoice_id_zenthea_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."zenthea_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_insurance_payers" ADD CONSTRAINT "zenthea_insurance_payers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_invitations" ADD CONSTRAINT "zenthea_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_invitations" ADD CONSTRAINT "zenthea_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_invoices" ADD CONSTRAINT "zenthea_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_invoices" ADD CONSTRAINT "zenthea_invoices_patient_id_zenthea_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."zenthea_patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_invoices" ADD CONSTRAINT "zenthea_invoices_appointment_id_zenthea_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."zenthea_appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_record_members" ADD CONSTRAINT "zenthea_medical_record_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_record_members" ADD CONSTRAINT "zenthea_medical_record_members_medical_record_id_zenthea_medical_records_id_fk" FOREIGN KEY ("medical_record_id") REFERENCES "public"."zenthea_medical_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_record_members" ADD CONSTRAINT "zenthea_medical_record_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_record_members" ADD CONSTRAINT "zenthea_medical_record_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_records" ADD CONSTRAINT "zenthea_medical_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_records" ADD CONSTRAINT "zenthea_medical_records_patient_id_zenthea_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."zenthea_patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_records" ADD CONSTRAINT "zenthea_medical_records_provider_id_users_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_medical_records" ADD CONSTRAINT "zenthea_medical_records_appointment_id_zenthea_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."zenthea_appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_message_assignments" ADD CONSTRAINT "zenthea_message_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_message_assignments" ADD CONSTRAINT "zenthea_message_assignments_message_id_zenthea_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."zenthea_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_message_assignments" ADD CONSTRAINT "zenthea_message_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_message_assignments" ADD CONSTRAINT "zenthea_message_assignments_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_messages" ADD CONSTRAINT "zenthea_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_messages" ADD CONSTRAINT "zenthea_messages_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_messages" ADD CONSTRAINT "zenthea_messages_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_notifications" ADD CONSTRAINT "zenthea_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_notifications" ADD CONSTRAINT "zenthea_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_patients" ADD CONSTRAINT "zenthea_patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_patients" ADD CONSTRAINT "zenthea_patients_primary_provider_id_users_id_fk" FOREIGN KEY ("primary_provider_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_patients" ADD CONSTRAINT "zenthea_patients_preferred_clinic_id_zenthea_clinics_id_fk" FOREIGN KEY ("preferred_clinic_id") REFERENCES "public"."zenthea_clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_provider_profiles" ADD CONSTRAINT "zenthea_provider_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_provider_profiles" ADD CONSTRAINT "zenthea_provider_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_providers" ADD CONSTRAINT "zenthea_providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_providers" ADD CONSTRAINT "zenthea_providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_slot_locks" ADD CONSTRAINT "zenthea_slot_locks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_slot_locks" ADD CONSTRAINT "zenthea_slot_locks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_slot_locks" ADD CONSTRAINT "zenthea_slot_locks_clinic_id_zenthea_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."zenthea_clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_slot_locks" ADD CONSTRAINT "zenthea_slot_locks_locked_by_zenthea_patients_id_fk" FOREIGN KEY ("locked_by") REFERENCES "public"."zenthea_patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_support_access_requests" ADD CONSTRAINT "zenthea_support_access_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_support_access_requests" ADD CONSTRAINT "zenthea_support_access_requests_superadmin_id_users_id_fk" FOREIGN KEY ("superadmin_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_support_access_requests" ADD CONSTRAINT "zenthea_support_access_requests_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_support_access_requests" ADD CONSTRAINT "zenthea_support_access_requests_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_support_access_requests" ADD CONSTRAINT "zenthea_support_access_requests_denied_by_users_id_fk" FOREIGN KEY ("denied_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_website_builder_versions" ADD CONSTRAINT "zenthea_website_builder_versions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_website_builder_versions" ADD CONSTRAINT "zenthea_website_builder_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zenthea_app_members_org_idx" ON "zenthea_appointment_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_app_members_app_idx" ON "zenthea_appointment_members" USING btree ("appointment_id");--> statement-breakpoint
CREATE INDEX "zenthea_app_members_user_idx" ON "zenthea_appointment_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "zenthea_appointments_org_idx" ON "zenthea_appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_appointments_patient_idx" ON "zenthea_appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "zenthea_appointments_clinic_idx" ON "zenthea_appointments" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX "zenthea_appointments_scheduled_at_idx" ON "zenthea_appointments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "zenthea_clinics_org_idx" ON "zenthea_clinics" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_ins_claims_org_idx" ON "zenthea_insurance_claims" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_ins_claims_patient_idx" ON "zenthea_insurance_claims" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "zenthea_ins_claims_status_idx" ON "zenthea_insurance_claims" USING btree ("status");--> statement-breakpoint
CREATE INDEX "zenthea_ins_payers_org_idx" ON "zenthea_insurance_payers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_ins_payers_payer_id_idx" ON "zenthea_insurance_payers" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "zenthea_invitations_org_idx" ON "zenthea_invitations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_invitations_email_idx" ON "zenthea_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "zenthea_invoices_org_idx" ON "zenthea_invoices" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_invoices_patient_idx" ON "zenthea_invoices" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "zenthea_invoices_status_idx" ON "zenthea_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "zenthea_med_record_members_org_idx" ON "zenthea_medical_record_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_med_record_members_record_idx" ON "zenthea_medical_record_members" USING btree ("medical_record_id");--> statement-breakpoint
CREATE INDEX "zenthea_med_record_members_user_idx" ON "zenthea_medical_record_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "zenthea_medical_records_org_idx" ON "zenthea_medical_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_medical_records_patient_idx" ON "zenthea_medical_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "zenthea_medical_records_type_idx" ON "zenthea_medical_records" USING btree ("record_type");--> statement-breakpoint
CREATE INDEX "zenthea_msg_assignments_org_idx" ON "zenthea_message_assignments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_msg_assignments_msg_idx" ON "zenthea_message_assignments" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "zenthea_msg_assignments_to_idx" ON "zenthea_message_assignments" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "zenthea_messages_org_idx" ON "zenthea_messages" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_messages_from_idx" ON "zenthea_messages" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "zenthea_messages_to_idx" ON "zenthea_messages" USING btree ("to_user_id");--> statement-breakpoint
CREATE INDEX "zenthea_messages_thread_idx" ON "zenthea_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "zenthea_notifications_org_user_idx" ON "zenthea_notifications" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "zenthea_notifications_is_read_idx" ON "zenthea_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "zenthea_patients_org_idx" ON "zenthea_patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_patients_name_idx" ON "zenthea_patients" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX "zenthea_patients_email_idx" ON "zenthea_patients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "zenthea_provider_profiles_org_idx" ON "zenthea_provider_profiles" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_provider_profiles_user_idx" ON "zenthea_provider_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "zenthea_providers_org_idx" ON "zenthea_providers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_providers_user_idx" ON "zenthea_providers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "zenthea_slot_locks_org_idx" ON "zenthea_slot_locks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_slot_locks_user_slot_idx" ON "zenthea_slot_locks" USING btree ("user_id","slot_start");--> statement-breakpoint
CREATE INDEX "zenthea_slot_locks_expires_idx" ON "zenthea_slot_locks" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "zenthea_support_access_org_idx" ON "zenthea_support_access_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_support_access_status_idx" ON "zenthea_support_access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "zenthea_web_builder_org_idx" ON "zenthea_website_builder_versions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_web_builder_version_idx" ON "zenthea_website_builder_versions" USING btree ("organization_id","version_number");