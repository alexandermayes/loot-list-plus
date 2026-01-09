-- Guild Settings Table
-- This table stores configuration for each guild's loot distribution system

CREATE TABLE IF NOT EXISTS guild_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  
  -- Attendance Settings
  attendance_type TEXT NOT NULL DEFAULT 'linear' CHECK (attendance_type IN ('linear', 'breakpoint')),
  rolling_attendance_weeks INTEGER NOT NULL DEFAULT 4,
  use_signups BOOLEAN NOT NULL DEFAULT true,
  signup_weight DECIMAL(3,2) NOT NULL DEFAULT 0.25,
  
  -- Attendance Bonuses (for breakpoint system)
  max_attendance_bonus DECIMAL(5,2) NOT NULL DEFAULT 4,
  max_attendance_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.9,
  middle_attendance_bonus DECIMAL(5,2) NOT NULL DEFAULT 2,
  middle_attendance_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  bottom_attendance_bonus DECIMAL(5,2) NOT NULL DEFAULT 1,
  bottom_attendance_threshold DECIMAL(3,2) NOT NULL DEFAULT 0.25,
  
  -- Bad Luck Prevention
  see_item_bonus BOOLEAN NOT NULL DEFAULT true,
  see_item_bonus_value DECIMAL(5,2) NOT NULL DEFAULT 1,
  pass_item_bonus BOOLEAN NOT NULL DEFAULT false,
  pass_item_bonus_value DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Rank Modifiers (stored as JSONB)
  rank_modifiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Raid Schedule
  raid_days TEXT[] DEFAULT ARRAY['Sunday', 'Monday'],
  first_raid_week_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(guild_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guild_settings_guild_id ON guild_settings(guild_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_guild_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_guild_settings_updated_at
  BEFORE UPDATE ON guild_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_guild_settings_updated_at();
