-- Migration: Update guild_settings defaults for simplified "out of box" experience
-- This only affects NEW guilds - existing guilds keep their current settings
--
-- Philosophy: Basic formula is Personal Value + Attendance
-- All advanced bonuses (rank, role, class, raider) should be opt-in, not opt-out

-- Update default for use_signups: most guilds don't use formal signup systems
ALTER TABLE guild_settings ALTER COLUMN use_signups SET DEFAULT false;

-- Update default for rolling attendance weeks: 8 weeks gives better data than 4
ALTER TABLE guild_settings ALTER COLUMN rolling_attendance_weeks SET DEFAULT 8;

-- Update default for guild rank bonuses: should be opt-in
ALTER TABLE guild_settings ALTER COLUMN guild_rank_bonuses_enabled SET DEFAULT false;

-- Update defaults for role bonus priorities: should be opt-in
ALTER TABLE guild_settings ALTER COLUMN role_bonus_priority_single_item SET DEFAULT false;

-- Update defaults for class bonus priorities: should be opt-in
ALTER TABLE guild_settings ALTER COLUMN class_bonus_priority_single_item SET DEFAULT false;

-- Update defaults for raid roles overall bonus: should be opt-in
ALTER TABLE guild_settings ALTER COLUMN raid_roles_overall_bonus_priority SET DEFAULT false;

-- Update defaults for single raider bonuses: should be opt-in
ALTER TABLE guild_settings ALTER COLUMN single_raider_overall_bonus SET DEFAULT false;
ALTER TABLE guild_settings ALTER COLUMN single_raider_bonus_single_item SET DEFAULT false;

-- Add comment explaining the philosophy
COMMENT ON TABLE guild_settings IS 'Guild loot system configuration. Defaults are set for simple "out of box" experience where score = Personal Value + Attendance. Advanced features (rank bonuses, role priorities, etc.) are opt-in.';
