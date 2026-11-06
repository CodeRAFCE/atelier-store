CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"status" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"method" text,
	"error_code" text,
	"error_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_status_valid" CHECK ("payments"."status" in ('created', 'authorized', 'captured', 'failed', 'refunded'))
);
--> statement-breakpoint
ALTER TABLE "stripe_events" RENAME TO "payment_events";--> statement-breakpoint
ALTER TABLE "payment_events" RENAME CONSTRAINT "stripe_events_pkey" TO "payment_events_pkey";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "stripe_checkout_session_id" TO "razorpay_order_id";--> statement-breakpoint
ALTER TABLE "orders" RENAME COLUMN "stripe_payment_intent_id" TO "razorpay_payment_id";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_stripe_checkout_session_id_unique";--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_stripe_payment_intent_id_unique";--> statement-breakpoint
ALTER TABLE "payment_events" DROP CONSTRAINT "stripe_events_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'inr';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "razorpay_refund_id" text;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_status_expires_at_idx" ON "orders" USING btree ("status","expires_at");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_razorpay_order_id_unique" UNIQUE("razorpay_order_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_razorpay_refund_id_unique" UNIQUE("razorpay_refund_id");