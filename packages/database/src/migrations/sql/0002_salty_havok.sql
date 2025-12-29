CREATE TYPE "public"."billing_event_type" AS ENUM('subscription.created', 'subscription.updated', 'subscription.deleted', 'subscription.trial_will_end', 'invoice.paid', 'invoice.payment_failed', 'charge.succeeded', 'charge.failed', 'charge.refunded');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('month', 'year');--> statement-breakpoint
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
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_subscription_id_product_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."product_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_product_org_id_product_orgs_id_fk" FOREIGN KEY ("product_org_id") REFERENCES "public"."product_orgs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subscriptions" ADD CONSTRAINT "product_subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_events_product_id_idx" ON "billing_events" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "billing_events_subscription_id_idx" ON "billing_events" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "billing_events_customer_id_idx" ON "billing_events" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "billing_events_event_type_idx" ON "billing_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "billing_events_stripe_event_id_idx" ON "billing_events" USING btree ("stripe_event_id");--> statement-breakpoint
CREATE INDEX "billing_events_occurred_at_idx" ON "billing_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "product_subscriptions_product_id_idx" ON "product_subscriptions" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_product_org_id_idx" ON "product_subscriptions" USING btree ("product_org_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_customer_id_idx" ON "product_subscriptions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_stripe_subscription_id_idx" ON "product_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_stripe_customer_id_idx" ON "product_subscriptions" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "product_subscriptions_status_idx" ON "product_subscriptions" USING btree ("status");