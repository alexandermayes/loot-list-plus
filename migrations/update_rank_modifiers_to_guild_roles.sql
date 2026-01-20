-- Update rank_modifiers to use actual guild roles instead of hardcoded names
-- This migration updates existing guild_settings to use Guild Master, Officer, Member as the default roles

-- First, ensure the rank_modifiers column exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='rank_modifiers') THEN
    ALTER TABLE guild_settings ADD COLUMN rank_modifiers JSONB DEFAULT '{"Guild Master": 0, "Officer": 0, "Member": 0}'::jsonb;
  END IF;
END $$;

-- Update default value for new rows
ALTER TABLE guild_settings
  ALTER COLUMN rank_modifiers SET DEFAULT '{"Guild Master": 0, "Officer": 0, "Member": 0}'::jsonb;

-- Update ALL existing rows to use the new format (regardless of current value)
-- This handles NULL, empty objects, and old formats
UPDATE guild_settings
SET rank_modifiers = '{"Guild Master": 0, "Officer": 0, "Member": 0}'::jsonb;
