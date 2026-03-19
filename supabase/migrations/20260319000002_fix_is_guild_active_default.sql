-- Fix is_guild_active null handling
-- Currently null is treated as true in queries. Add a default and backfill.

-- Backfill: set null values to true (matches current query behavior)
UPDATE raid_tiers SET is_guild_active = true WHERE is_guild_active IS NULL;

-- Add default so new tiers don't get null
ALTER TABLE raid_tiers ALTER COLUMN is_guild_active SET DEFAULT true;
ALTER TABLE raid_tiers ALTER COLUMN is_guild_active SET NOT NULL;
