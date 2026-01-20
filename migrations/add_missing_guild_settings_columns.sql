-- Add missing columns to guild_settings table
DO $$
BEGIN
  -- Add class_bonus_priority_single_item if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='class_bonus_priority_single_item') THEN
    ALTER TABLE guild_settings ADD COLUMN class_bonus_priority_single_item BOOLEAN DEFAULT true;
  END IF;

  -- Add raid_roles_overall_bonus_priority if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='raid_roles_overall_bonus_priority') THEN
    ALTER TABLE guild_settings ADD COLUMN raid_roles_overall_bonus_priority BOOLEAN DEFAULT true;
  END IF;

  -- Add single_raider_overall_bonus if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='single_raider_overall_bonus') THEN
    ALTER TABLE guild_settings ADD COLUMN single_raider_overall_bonus BOOLEAN DEFAULT true;
  END IF;

  -- Add single_raider_bonus_single_item if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='single_raider_bonus_single_item') THEN
    ALTER TABLE guild_settings ADD COLUMN single_raider_bonus_single_item BOOLEAN DEFAULT true;
  END IF;

  -- Add role_bonus_priority_single_item if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='role_bonus_priority_single_item') THEN
    ALTER TABLE guild_settings ADD COLUMN role_bonus_priority_single_item BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
