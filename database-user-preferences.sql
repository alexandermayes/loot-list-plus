-- User Preferences and Privacy Settings Table
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

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
