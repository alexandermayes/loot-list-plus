-- Add role_modifiers column to guild_settings
-- Stores per-role score modifiers: {"tank": 2, "healer": 1, "physical": 0, "caster": 0}
-- The existing raid_roles_overall_bonus_priority boolean acts as the enable/disable toggle

ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS role_modifiers JSONB DEFAULT '{}';
