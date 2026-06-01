-- Add single_raider_modifiers column to guild_settings
-- Stores per-character score modifiers keyed by character id. Each raider can
-- stack multiple entries; the engine sums all currently-active ones and applies
-- the total to every loot score for that raider. expires_at null = permanent,
-- a YYYY-MM-DD date = falls off after that day (used for "this week" boosts/penalties):
--   {"<character_uuid>": [{"amount": 20, "expires_at": null},
--                         {"amount": -2, "expires_at": "2026-06-05"}]}
-- The existing single_raider_overall_bonus boolean acts as the enable/disable toggle.

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS single_raider_modifiers JSONB DEFAULT '{}';
