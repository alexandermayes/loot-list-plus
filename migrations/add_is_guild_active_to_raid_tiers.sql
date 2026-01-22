-- Add is_guild_active column to raid_tiers table
-- This controls whether a raid appears in the guild's UI (dropdowns, selectors, etc.)
-- Different from master_sheet_visible which controls if players can see rankings

ALTER TABLE raid_tiers
ADD COLUMN IF NOT EXISTS is_guild_active BOOLEAN DEFAULT true;

-- Set all existing tiers to active by default
UPDATE raid_tiers SET is_guild_active = true WHERE is_guild_active IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN raid_tiers.is_guild_active IS
  'Whether this raid is enabled for the guild (appears in UI). Different from master_sheet_visible which controls player visibility of rankings.';
