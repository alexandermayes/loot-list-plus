-- Add accent_color column to user_preferences table
-- This allows users to customize their UI accent color

ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN user_preferences.accent_color IS 'User-selected accent color in hex format (e.g., #ff8000). NULL means use default.';
