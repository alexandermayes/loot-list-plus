-- Add single_raider_modifiers column to guild_settings
-- Stores per-character permanent score modifiers keyed by character id:
--   {"<character_uuid>": 20, "<character_uuid>": -5}
-- Applied to every loot score for that raider, every week (permanent, not per-item).
-- The existing single_raider_overall_bonus boolean acts as the enable/disable toggle.

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS single_raider_modifiers JSONB DEFAULT '{}';
