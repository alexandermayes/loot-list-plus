-- LootList+ Premium: Stripe-backed guild subscriptions.
--
-- guilds.subscription_tier stays the single source of truth the app reads
-- (hasFeature / requirePro); this table records the Stripe state behind it
-- and is kept in sync by the Stripe webhook (service role only).

CREATE TABLE IF NOT EXISTS "public"."guild_subscriptions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "guild_id" uuid NOT NULL,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "status" text,
    "price_id" text,
    "billing_interval" text,
    "current_period_end" timestamptz,
    "cancel_at_period_end" boolean DEFAULT false NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "guild_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guild_subscriptions_guild_id_key" UNIQUE ("guild_id"),
    CONSTRAINT "guild_subscriptions_guild_id_fkey" FOREIGN KEY ("guild_id")
        REFERENCES "public"."guilds"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_guild_subscriptions_stripe_customer"
    ON "public"."guild_subscriptions" ("stripe_customer_id");
CREATE INDEX IF NOT EXISTS "idx_guild_subscriptions_stripe_subscription"
    ON "public"."guild_subscriptions" ("stripe_subscription_id");

ALTER TABLE "public"."guild_subscriptions" ENABLE ROW LEVEL SECURITY;

-- Officers can see their guild's billing state; all writes go through the
-- service role (Stripe webhook + billing API routes), so no write policies.
CREATE POLICY "guild_subscriptions_select" ON "public"."guild_subscriptions"
    FOR SELECT USING ("public"."is_guild_officer"("guild_id"));
