-- ============================================================================
-- COMBINED PROFILE MIGRATIONS
-- Run this entire file in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: User Preferences and Privacy Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Privacy Settings
  show_email BOOLEAN DEFAULT false,
  show_discord_username BOOLEAN DEFAULT true,
  show_attendance_stats BOOLEAN DEFAULT true,
  show_loot_history BOOLEAN DEFAULT true,

  -- Notification Preferences
  notify_loot_deadline BOOLEAN DEFAULT true,
  notify_submission_status BOOLEAN DEFAULT true,
  notify_new_raids BOOLEAN DEFAULT true,

  -- Display Preferences
  preferred_display_name VARCHAR(255), -- Override for display name
  bio TEXT,

  -- Discord Verification
  discord_verified BOOLEAN DEFAULT false,
  discord_guild_member BOOLEAN DEFAULT false,
  last_verified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- RLS Policies for user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

-- Users can read their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to auto-create preferences on user signup
CREATE OR REPLACE FUNCTION create_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences when guild member is created
DROP TRIGGER IF EXISTS create_user_preferences_on_member_insert ON guild_members;
CREATE TRIGGER create_user_preferences_on_member_insert
  AFTER INSERT ON guild_members
  FOR EACH ROW
  EXECUTE FUNCTION create_user_preferences();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION 2: Add Discord Server ID to Guilds Table
-- ============================================================================

-- Add Discord server ID to guilds table for Discord verification
ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS discord_server_id VARCHAR(255);

-- Add an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guilds_discord_server_id ON guilds(discord_server_id);

-- Comment explaining the column
COMMENT ON COLUMN guilds.discord_server_id IS 'Discord server (guild) ID for verification. Find this in Discord by enabling Developer Mode and right-clicking the server.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify user_preferences table was created
SELECT 'user_preferences table' as check_name,
       COUNT(*) as row_count
FROM user_preferences;

-- Verify discord_server_id column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'guilds'
  AND column_name = 'discord_server_id';

-- Show all RLS policies on user_preferences
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_preferences';

SELECT '✅ Migrations completed successfully!' as status;
