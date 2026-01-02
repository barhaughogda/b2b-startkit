CREATE TYPE "public"."zenthea_patient_org_access_status" AS ENUM('pending', 'active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."billing_event_type" AS ENUM('subscription.created', 'subscription.updated', 'subscription.deleted', 'subscription.trial_will_end', 'invoice.paid', 'invoice.payment_failed', 'charge.succeeded', 'charge.failed', 'charge.refunded');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('month', 'year');--> statement-breakpoint
CREATE TYPE "public"."customer_status" AS ENUM('active', 'churned', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."link_method" AS ENUM('manual', 'domain_verified', 'sso', 'invited');--> statement-breakpoint
CREATE TYPE "public"."product_env" AS ENUM('development', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'suspended', 'locked');--> statement-breakpoint
CREATE TYPE "public"."plan_tier" AS ENUM('free', 'starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused');--> statement-breakpoint
CREATE TYPE "public"."kill_switch_scope" AS ENUM('global', 'product', 'feature', 'organization');--> statement-breakpoint
CREATE TABLE "zenthea_patient_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zenthea_patient_accounts_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "zenthea_patient_org_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_account_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" "zenthea_patient_org_access_status" DEFAULT 'pending' NOT NULL,
	"requested_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"subscription_id" uuid,
	"customer_id" uuid,
	"event_type" "billing_event_type" NOT NULL,
	"stripe_event_id" text,
	"amount" text,
	"currency" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "customer_product_org_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"product_org_id" uuid NOT NULL,
	"link_method" "link_method" DEFAULT 'manual' NOT NULL,
	"linked_by" uuid,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"primary_domain" text,
	"domains" jsonb DEFAULT '[]'::jsonb,
	"stripe_customer_id" text,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"product_id" uuid,
	"customer_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"kid" text NOT NULL,
	"label" text,
	"secret_hash" text NOT NULL,
	"signing_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" uuid,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "product_keys_kid_unique" UNIQUE("kid")
);
--> statement-breakpoint
CREATE TABLE "product_orgs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"external_org_id" text NOT NULL,
	"external_db_id" text,
	"name" text NOT NULL,
	"slug" text,
	"domain" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"product_org_id" uuid,
	"customer_id" uuid,
	"stripe_subscription_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"price_id" text NOT NULL,
	"product_name" text,
	"amount" text NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"interval" "billing_interval" DEFAULT 'month' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"trial_start" timestamp with time zone,
	"trial_end" timestamp with time zone,
	"external_org_id" text,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"base_url" text NOT NULL,
	"env" "product_env" DEFAULT 'development' NOT NULL,
	"status" "product_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"is_superadmin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_role" DEFAULT 'member' NOT NULL,
	"is_app_admin" boolean DEFAULT false NOT NULL,
	"custom_permissions" jsonb DEFAULT '[]'::jsonb,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" "organization_status" DEFAULT 'active' NOT NULL,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"suspended_by" uuid,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_clerk_org_id_unique" UNIQUE("clerk_org_id"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"plan" "plan_tier" DEFAULT 'free' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"usage_limits" jsonb DEFAULT '{}'::jsonb,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"max_seats" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_organization_id_unique" UNIQUE("organization_id"),
	CONSTRAINT "subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"metric" text NOT NULL,
	"value" integer NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"reported_to_stripe" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"user_id" uuid,
	"user_email" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"is_superadmin_action" timestamp with time zone,
	"impersonated_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "superadmin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"admin_email" text NOT NULL,
	"target_organization_id" uuid,
	"target_user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kill_switches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope" "kill_switch_scope" NOT NULL,
	"target_id" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"reason" text,
	"activated_by" uuid,
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kill_switches_scope_target_unique" UNIQUE("scope","target_id")
);
--> statement-breakpoint
ALTER TABLE "zenthea_clinics" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "zenthea_clinics" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "zenthea_patient_org_access" ADD CONSTRAINT "zenthea_patient_org_access_patient_account_id_zenthea_patient_accounts_id_fk" FOREIGN KEY ("patient_account_id") REFERENCES "public"."zenthea_patient_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_patient_org_access" ADD CONSTRAINT "zenthea_patient_org_access_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zenthea_patient_org_access" ADD CONSTRAINT "zenthea_patient_org_access_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_product_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."product_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_org_links" ADD CONSTRAINT "customer_product_org_links_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_org_links" ADD CONSTRAINT "customer_product_org_links_product_org_id_product_orgs_id_fk" FOREIGN KEY ("product_org_id") REFERENCES "public"."product_orgs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_product_org_links" ADD CONSTRAINT "customer_product_org_links_linked_by_users_id_fk" FOREIGN KEY ("linked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_audit_logs" ADD CONSTRAINT "platform_audit_logs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_keys" ADD CONSTRAINT "product_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_orgs" ADD CONSTRAINT "product_orgs_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_product_org_id_product_orgs_id_fk" FOREIGN KEY ("product_org_id") REFERENCES "public"."product_orgs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_suspended_by_users_id_fk" FOREIGN KEY ("suspended_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_impersonated_user_id_users_id_fk" FOREIGN KEY ("impersonated_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "superadmin_audit_logs" ADD CONSTRAINT "superadmin_audit_logs_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "superadmin_audit_logs" ADD CONSTRAINT "superadmin_audit_logs_target_organization_id_organizations_id_fk" FOREIGN KEY ("target_organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "superadmin_audit_logs" ADD CONSTRAINT "superadmin_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kill_switches" ADD CONSTRAINT "kill_switches_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "zenthea_patient_accounts_clerk_idx" ON "zenthea_patient_accounts" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "zenthea_patient_accounts_email_idx" ON "zenthea_patient_accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "zenthea_patient_access_account_idx" ON "zenthea_patient_org_access" USING btree ("patient_account_id");--> statement-breakpoint
CREATE INDEX "zenthea_patient_access_org_idx" ON "zenthea_patient_org_access" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zenthea_patient_access_status_idx" ON "zenthea_patient_org_access" USING btree ("status");--> statement-breakpoint
CREATE INDEX "billing_events_product_id_idx" ON "billing_events" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "billing_events_subscription_id_idx" ON "billing_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "billing_events_customer_id_idx" ON "billing_events" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "billing_events_event_type_idx" ON "billing_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "billing_events_stripe_event_id_idx" ON "billing_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "billing_events_occurred_at_idx" ON "billing_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "customer_product_org_links_customer_id_idx" ON "customer_product_org_links" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customer_product_org_links_product_org_id_idx" ON "customer_product_org_links" USING btree ("product_org_id");--> statement-breakpoint
CREATE INDEX "customers_name_idx" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "customers_primary_domain_idx" ON "customers" USING btree ("primary_domain");--> statement-breakpoint
CREATE INDEX "customers_stripe_customer_id_idx" ON "customers" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_actor_idx" ON "platform_audit_logs" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_action_idx" ON "platform_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_resource_idx" ON "platform_audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_product_id_idx" ON "platform_audit_logs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_customer_id_idx" ON "platform_audit_logs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "platform_audit_logs_created_at_idx" ON "platform_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_keys_product_id_idx" ON "product_keys" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_keys_kid_idx" ON "product_keys" USING btree ("kid");--> statement-breakpoint
CREATE INDEX "product_keys_is_active_idx" ON "product_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "product_orgs_product_id_idx" ON "product_orgs" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_orgs_external_org_id_idx" ON "product_orgs" USING btree ("external_org_id");--> statement-breakpoint
CREATE INDEX "product_orgs_domain_idx" ON "product_orgs" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "product_orgs_product_external_idx" ON "product_orgs" USING btree ("product_id","external_org_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_product_id_idx" ON "product_subscriptions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_product_org_id_idx" ON "product_subscriptions" USING btree ("product_org_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_customer_id_idx" ON "product_subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_stripe_subscription_id_idx" ON "product_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_stripe_customer_id_idx" ON "product_subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_status_idx" ON "product_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "org_members_org_id_idx" ON "organization_members" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "org_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organizations_clerk_org_id_idx" ON "organizations" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organizations_status_idx" ON "organizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_org_id_idx" ON "subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_sub_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "usage_records_org_id_idx" ON "usage_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "usage_records_metric_idx" ON "usage_records" USING btree ("metric");--> statement-breakpoint
CREATE INDEX "usage_records_period_idx" ON "usage_records" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "audit_logs_org_id_idx" ON "audit_logs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "superadmin_audit_admin_idx" ON "superadmin_audit_logs" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "superadmin_audit_action_idx" ON "superadmin_audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "superadmin_audit_created_at_idx" ON "superadmin_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "kill_switches_scope_target_idx" ON "kill_switches" USING btree ("scope","target_id");--> statement-breakpoint
CREATE INDEX "kill_switches_enabled_idx" ON "kill_switches" USING btree ("enabled");