-- Comprehensive fix for guild_settings and loot submission policies
-- This fixes both the 400 error on guild_settings and allows loot list resubmission

-- =====================================================
-- Part 1: Fix guild_settings table and RLS policies
-- =====================================================

-- Add enforce_slot_restrictions column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guild_settings'
    AND column_name = 'enforce_slot_restrictions'
  ) THEN
    ALTER TABLE guild_settings
    ADD COLUMN enforce_slot_restrictions BOOLEAN NOT NULL DEFAULT true;

    COMMENT ON COLUMN guild_settings.enforce_slot_restrictions IS 'When enabled, players can only select one item per slot type (e.g., 1 ring, 1 weapon) in each loot bracket';
  END IF;
END $$;

-- Enable RLS on guild_settings if not already enabled
ALTER TABLE guild_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Guild members can view their guild settings" ON guild_settings;
DROP POLICY IF EXISTS "Officers can update guild settings" ON guild_settings;

-- Create RLS policy: Guild members can view their guild's settings
CREATE POLICY "Guild members can view their guild settings" ON guild_settings
  FOR SELECT
  USING (
    user_is_in_guild(auth.uid(), guild_id)
  );

-- Create RLS policy: Officers and Guild Masters can update guild settings
CREATE POLICY "Officers can update guild settings" ON guild_settings
  FOR UPDATE
  USING (
    user_is_officer_in_guild(auth.uid(), guild_id)
  )
  WITH CHECK (
    user_is_officer_in_guild(auth.uid(), guild_id)
  );

-- Create RLS policy: System can insert guild settings (for new guilds)
DROP POLICY IF EXISTS "System can insert guild settings" ON guild_settings;
CREATE POLICY "System can insert guild settings" ON guild_settings
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Part 2: Fix loot submission policies
-- =====================================================

-- Fix loot_submissions UPDATE policy (allow updates regardless of status)
DROP POLICY IF EXISTS "Users can update character pending submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update their character submissions" ON loot_submissions;

CREATE POLICY "Users can update their character submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Fix loot_submission_items UPDATE policy (allow updates regardless of submission status)
DROP POLICY IF EXISTS "Users can update items in their character submissions" ON loot_submission_items;

CREATE POLICY "Users can update items in their character submissions" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- =====================================================
-- Part 3: Verify fixes
-- =====================================================

-- Verify guild_settings column exists
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'guild_settings'
AND column_name = 'enforce_slot_restrictions';

-- Verify guild_settings policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE tablename = 'guild_settings'
ORDER BY cmd;

-- Verify loot submission policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE tablename IN ('loot_submissions', 'loot_submission_items')
AND cmd IN ('UPDATE', 'DELETE', 'INSERT')
ORDER BY tablename, cmd;
