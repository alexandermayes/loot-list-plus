-- Comprehensive migration to add all missing guild_settings columns
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
    ALTER TABLE guild_settings ADD COLUMN third_raid_day INTEGER DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='fourth_raid_day') THEN
    ALTER TABLE guild_settings ADD COLUMN fourth_raid_day INTEGER DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='fifth_raid_day') THEN
    ALTER TABLE guild_settings ADD COLUMN fifth_raid_day INTEGER DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='reset_date') THEN
    ALTER TABLE guild_settings ADD COLUMN reset_date DATE DEFAULT '2025-01-14';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='decimal_places') THEN
    ALTER TABLE guild_settings ADD COLUMN decimal_places INTEGER DEFAULT 2;
  END IF;

  -- Attendance Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='guild_settings' AND column_name='attendance_type') THEN
    ALTER TABLE guild_settings ADD COLUMN attendance_type VARCHAR(20) DEFAULT 'linear';
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
    ALTER TABLE guild_settings ADD COLUMN rank_modifiers JSONB DEFAULT '{"Guild Master": 0, "Officer": 0, "Member": 0}'::jsonb;
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
    ALTER TABLE guild_settings ADD COLUMN donation_bonus_type VARCHAR(20) DEFAULT 'rolling';
  END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
