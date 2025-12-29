CREATE TYPE "public"."customer_status" AS ENUM('active', 'churned', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."link_method" AS ENUM('manual', 'domain_verified', 'sso', 'invited');--> statement-breakpoint
CREATE TYPE "public"."product_env" AS ENUM('development', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
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
ALTER TABLE "organization_members" ADD COLUMN "is_app_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
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
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");