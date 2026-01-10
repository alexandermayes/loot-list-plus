-- Add enforce_slot_restrictions setting to guild_settings
-- This setting restricts loot lists to one item per slot type per bracket

ALTER TABLE guild_settings
ADD COLUMN enforce_slot_restrictions BOOLEAN NOT NULL DEFAULT true;

-- Add comment
COMMENT ON COLUMN guild_settings.enforce_slot_restrictions IS 'When enabled, players can only select one item per slot type (e.g., 1 ring, 1 weapon) in each loot bracket';
