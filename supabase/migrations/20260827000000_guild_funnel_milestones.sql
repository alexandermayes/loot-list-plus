-- Activation-funnel milestones (search & AI visibility sprint, item 4).
--
-- One row per guild recording when each funnel milestone was first reached,
-- so the analytics layer can fire each PostHog event exactly once. Written
-- only by the service role from utils/analytics/funnel.ts.

CREATE TABLE IF NOT EXISTS "public"."guild_funnel_milestones" (
    "guild_id" uuid NOT NULL,
    "schedule_configured_at" timestamptz,
    "loot_settings_completed_at" timestamptz,
    "roster_threshold_at" timestamptz,
    "qualified_at" timestamptz,
    "first_raid_at" timestamptz,
    "first_loot_at" timestamptz,
    "activated_at" timestamptz,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "guild_funnel_milestones_pkey" PRIMARY KEY ("guild_id"),
    CONSTRAINT "guild_funnel_milestones_guild_id_fkey" FOREIGN KEY ("guild_id")
        REFERENCES "public"."guilds"("id") ON DELETE CASCADE
);

-- Service-role only: RLS on with no policies.
ALTER TABLE "public"."guild_funnel_milestones" ENABLE ROW LEVEL SECURITY;
