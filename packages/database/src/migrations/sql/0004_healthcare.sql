CREATE TYPE "public"."booking_status" AS ENUM('pending', 'contacted', 'scheduled', 'confirmed', 'declined', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."appointment_type" AS ENUM('consultation', 'follow_up', 'emergency', 'routine_checkup', 'telehealth');--> statement-breakpoint
CREATE TABLE "booking_requests" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"clinic_id" varchar(255),
	"provider_id" varchar(255),
	"appointment_type_id" varchar(255),
	"patient_name" text NOT NULL,
	"patient_email" text NOT NULL,
	"patient_phone" varchar(50),
	"patient_dob" varchar(50),
	"insurance_provider" text,
	"insurance_member_id" text,
	"preferred_dates" jsonb NOT NULL,
	"preferred_time_of_day" text,
	"notes" text,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"source" text,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" varchar(255) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration" integer NOT NULL,
	"type" "appointment_type" NOT NULL,
	"notes" text,
	"location_id" varchar(255),
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_requests_org_id_idx" ON "booking_requests" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointments_org_id_idx" ON "appointments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "appointments_user_id_idx" ON "appointments" USING btree ("user_id");

-- Enable RLS
ALTER TABLE "booking_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_requests
CREATE POLICY booking_requests_select_member ON booking_requests
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );

CREATE POLICY booking_requests_insert_public ON booking_requests
  FOR INSERT
  WITH CHECK (true); -- Public can submit booking requests

CREATE POLICY booking_requests_update_admin ON booking_requests
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
        AND role IN ('owner', 'admin')
    )
    OR app.is_superadmin()
  );

-- RLS Policies for appointments
CREATE POLICY appointments_select_member ON appointments
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );

CREATE POLICY appointments_insert_member ON appointments
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );

CREATE POLICY appointments_update_member ON appointments
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = app.current_user_id()
    )
    OR app.is_superadmin()
  );
