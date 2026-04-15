-- Add Stripe billing fields to tenants
ALTER TABLE "tenants" ADD COLUMN "stripe_customer_id" TEXT UNIQUE;
ALTER TABLE "tenants" ADD COLUMN "stripe_subscription_id" TEXT;

-- Create index for Stripe lookups
CREATE INDEX "idx_tenants_stripe_customer" ON "tenants"("stripe_customer_id");
CREATE INDEX "idx_tenants_stripe_subscription" ON "tenants"("stripe_subscription_id");
