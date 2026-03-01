-- Ensure enforce_slot_restrictions defaults to false for all guilds
-- and reset any guilds that had it enabled
ALTER TABLE guild_settings ALTER COLUMN enforce_slot_restrictions SET DEFAULT false;
UPDATE guild_settings SET enforce_slot_restrictions = false WHERE enforce_slot_restrictions = true;
