-- Comprehensive Guild Settings System
-- Creates/updates guild_settings table with all loot system configuration options

-- Create guild_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS guild_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE UNIQUE,

  -- General Settings
  raid_days_per_week INTEGER DEFAULT 2,
  first_raid_day INTEGER DEFAULT 2, -- 0=Sunday, 1=Monday, etc
  second_raid_day INTEGER DEFAULT 1,
  third_raid_day INTEGER,
  fourth_raid_day INTEGER,
  fifth_raid_day INTEGER,
  reset_date DATE DEFAULT '2025-01-14',
  decimal_places INTEGER DEFAULT 2, -- 0=Ones, 1=Tenths, 2=Hundredths

  -- Attendance Settings
  attendance_type TEXT DEFAULT 'linear' CHECK (attendance_type IN ('linear', 'breakpoint', 'points-per-raid')),
  rolling_attendance_weeks INTEGER DEFAULT 4,
  use_signups BOOLEAN DEFAULT true,
  signup_weight DECIMAL DEFAULT 0.25,

  -- Attendance Bonus Tiers
  max_attendance_bonus DECIMAL DEFAULT 4.0,
  max_attendance_threshold DECIMAL DEFAULT 0.9,
  middle_attendance_bonus DECIMAL DEFAULT 2.0,
  middle_attendance_threshold DECIMAL DEFAULT 0.5,
  bottom_attendance_bonus DECIMAL DEFAULT 1.0,
  bottom_attendance_threshold DECIMAL DEFAULT 0.25,

  -- Minimum Raids
  minimum_raid_days_enabled BOOLEAN DEFAULT true,
  minimum_raid_days INTEGER DEFAULT 2,

  -- New Member Policy
  new_member_mode TEXT DEFAULT 'raw' CHECK (new_member_mode IN ('raw', 'fair', 'minimum_gate')),

  -- Late/Early Penalty
  late_early_penalty_enabled BOOLEAN DEFAULT true,
  late_early_penalty_value DECIMAL DEFAULT 0.25,

  -- Bad Luck Prevention
  see_item_bonus BOOLEAN DEFAULT true,
  see_item_bonus_value DECIMAL DEFAULT 1.0,
  pass_item_bonus BOOLEAN DEFAULT false,
  pass_item_bonus_value DECIMAL DEFAULT 0.0,

  -- Rank, Role, Class Bonuses
  guild_rank_bonuses_enabled BOOLEAN DEFAULT true,
  number_of_ranks INTEGER DEFAULT 5,
  rank_modifiers JSONB DEFAULT '{"Pro Yiker": 0, "Raid Yiker": 0, "Yiker": -1, "Alt Yiker": -4, "New Yiker": -1}'::jsonb,

  role_bonus_priority_single_item BOOLEAN DEFAULT true,
  class_bonus_priority_single_item BOOLEAN DEFAULT true,
  raid_roles_overall_bonus_priority BOOLEAN DEFAULT true,
  single_raider_overall_bonus BOOLEAN DEFAULT true,
  single_raider_bonus_single_item BOOLEAN DEFAULT true,

  -- Donation Settings
  donation_bonuses_enabled BOOLEAN DEFAULT false,
  donation_cap_enabled BOOLEAN DEFAULT false,
  donation_bonus_type TEXT DEFAULT 'rolling' CHECK (donation_bonus_type IN ('permanent', 'rolling', 'hard-reset')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to existing table if they don't exist
DO $$
BEGIN
  -- General Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='raid_days_per_week') THEN
    ALTER TABLE guild_settings ADD COLUMN raid_days_per_week INTEGER DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='first_raid_day') THEN
    ALTER TABLE guild_settings ADD COLUMN first_raid_day INTEGER DEFAULT 2;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='second_raid_day') THEN
    ALTER TABLE guild_settings ADD COLUMN second_raid_day INTEGER DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='third_raid_day') THEN
    ALTER TABLE guild_settings ADD COLUMN third_raid_day INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='fourth_raid_day') THEN
    ALTER TABLE guild_settings ADD COLUMN fourth_raid_day INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='fifth_raid_day') THEN
    ALTER TABLE guild_settings ADD COLUMN fifth_raid_day INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='reset_date') THEN
    ALTER TABLE guild_settings ADD COLUMN reset_date DATE DEFAULT '2025-01-14';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='decimal_places') THEN
    ALTER TABLE guild_settings ADD COLUMN decimal_places INTEGER DEFAULT 2;
  END IF;

  -- Attendance Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='attendance_type') THEN
    ALTER TABLE guild_settings ADD COLUMN attendance_type TEXT DEFAULT 'linear';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='rolling_attendance_weeks') THEN
    ALTER TABLE guild_settings ADD COLUMN rolling_attendance_weeks INTEGER DEFAULT 4;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='use_signups') THEN
    ALTER TABLE guild_settings ADD COLUMN use_signups BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='signup_weight') THEN
    ALTER TABLE guild_settings ADD COLUMN signup_weight DECIMAL DEFAULT 0.25;
  END IF;

  -- Attendance Bonus Tiers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='max_attendance_bonus') THEN
    ALTER TABLE guild_settings ADD COLUMN max_attendance_bonus DECIMAL DEFAULT 4.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='max_attendance_threshold') THEN
    ALTER TABLE guild_settings ADD COLUMN max_attendance_threshold DECIMAL DEFAULT 0.9;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='middle_attendance_bonus') THEN
    ALTER TABLE guild_settings ADD COLUMN middle_attendance_bonus DECIMAL DEFAULT 2.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='middle_attendance_threshold') THEN
    ALTER TABLE guild_settings ADD COLUMN middle_attendance_threshold DECIMAL DEFAULT 0.5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='bottom_attendance_bonus') THEN
    ALTER TABLE guild_settings ADD COLUMN bottom_attendance_bonus DECIMAL DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='bottom_attendance_threshold') THEN
    ALTER TABLE guild_settings ADD COLUMN bottom_attendance_threshold DECIMAL DEFAULT 0.25;
  END IF;

  -- Minimum Raids
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='minimum_raid_days_enabled') THEN
    ALTER TABLE guild_settings ADD COLUMN minimum_raid_days_enabled BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='minimum_raid_days') THEN
    ALTER TABLE guild_settings ADD COLUMN minimum_raid_days INTEGER DEFAULT 2;
  END IF;

  -- New Member Policy
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='new_member_mode') THEN
    ALTER TABLE guild_settings ADD COLUMN new_member_mode TEXT DEFAULT 'raw';
  END IF;

  -- Late/Early Penalty
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='late_early_penalty_enabled') THEN
    ALTER TABLE guild_settings ADD COLUMN late_early_penalty_enabled BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='late_early_penalty_value') THEN
    ALTER TABLE guild_settings ADD COLUMN late_early_penalty_value DECIMAL DEFAULT 0.25;
  END IF;

  -- Bad Luck Prevention
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='see_item_bonus') THEN
    ALTER TABLE guild_settings ADD COLUMN see_item_bonus BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='see_item_bonus_value') THEN
    ALTER TABLE guild_settings ADD COLUMN see_item_bonus_value DECIMAL DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='pass_item_bonus') THEN
    ALTER TABLE guild_settings ADD COLUMN pass_item_bonus BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='pass_item_bonus_value') THEN
    ALTER TABLE guild_settings ADD COLUMN pass_item_bonus_value DECIMAL DEFAULT 0.0;
  END IF;

  -- Rank, Role, Class Bonuses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='guild_rank_bonuses_enabled') THEN
    ALTER TABLE guild_settings ADD COLUMN guild_rank_bonuses_enabled BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='number_of_ranks') THEN
    ALTER TABLE guild_settings ADD COLUMN number_of_ranks INTEGER DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='rank_modifiers') THEN
    ALTER TABLE guild_settings ADD COLUMN rank_modifiers JSONB DEFAULT '{"Pro Yiker": 0, "Raid Yiker": 0, "Yiker": -1, "Alt Yiker": -4, "New Yiker": -1}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='role_bonus_priority_single_item') THEN
    ALTER TABLE guild_settings ADD COLUMN role_bonus_priority_single_item BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='class_bonus_priority_single_item') THEN
    ALTER TABLE guild_settings ADD COLUMN class_bonus_priority_single_item BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='raid_roles_overall_bonus_priority') THEN
    ALTER TABLE guild_settings ADD COLUMN raid_roles_overall_bonus_priority BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='single_raider_overall_bonus') THEN
    ALTER TABLE guild_settings ADD COLUMN single_raider_overall_bonus BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='single_raider_bonus_single_item') THEN
    ALTER TABLE guild_settings ADD COLUMN single_raider_bonus_single_item BOOLEAN DEFAULT true;
  END IF;

  -- Donation Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='donation_bonuses_enabled') THEN
    ALTER TABLE guild_settings ADD COLUMN donation_bonuses_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='donation_cap_enabled') THEN
    ALTER TABLE guild_settings ADD COLUMN donation_cap_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='donation_bonus_type') THEN
    ALTER TABLE guild_settings ADD COLUMN donation_bonus_type TEXT DEFAULT 'rolling';
  END IF;
END $$;

-- Create index on guild_id
CREATE INDEX IF NOT EXISTS idx_guild_settings_guild_id ON guild_settings(guild_id);

-- Enable RLS
ALTER TABLE guild_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Guild members can view guild settings" ON guild_settings;
DROP POLICY IF EXISTS "Officers can update guild settings" ON guild_settings;
DROP POLICY IF EXISTS "Guild creators can insert initial settings" ON guild_settings;

-- RLS Policies
-- Guild members can view their guild's settings
CREATE POLICY "Guild members can view guild settings"
  ON guild_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_settings.guild_id
      AND c.user_id = auth.uid()
    )
  );

-- Officers can update guild settings
CREATE POLICY "Officers can update guild settings"
  ON guild_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_settings.guild_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Officers can insert guild settings (for new guilds)
CREATE POLICY "Officers can insert guild settings"
  ON guild_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_settings.guild_id
      AND c.user_id = auth.uid()
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guild_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_guild_settings_updated_at ON guild_settings;
CREATE TRIGGER trigger_update_guild_settings_updated_at
  BEFORE UPDATE ON guild_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_guild_settings_updated_at();
