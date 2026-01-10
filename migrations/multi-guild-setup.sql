-- Multi-Guild Architecture Migration
-- This migration adds support for multi-guild functionality including:
-- - Guild invite codes
-- - User active guild tracking
-- - Guild creation metadata
-- - Guild member join tracking

-- =============================================================================
-- 1. CREATE NEW TABLES
-- =============================================================================

-- Guild Invite Codes Table
-- Stores invite codes that can be shared to allow users to join guilds
CREATE TABLE IF NOT EXISTS guild_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  code VARCHAR(12) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,

  CONSTRAINT unique_active_code UNIQUE (code, is_active)
);

-- Indexes for invite codes
CREATE INDEX IF NOT EXISTS idx_invite_codes_guild ON guild_invite_codes(guild_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON guild_invite_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON guild_invite_codes(created_by);

-- User Active Guilds Table
-- Tracks which guild is currently active for each user
CREATE TABLE IF NOT EXISTS user_active_guilds (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for active guilds
CREATE INDEX IF NOT EXISTS idx_active_guilds_user ON user_active_guilds(user_id);
CREATE INDEX IF NOT EXISTS idx_active_guilds_guild ON user_active_guilds(active_guild_id);

-- =============================================================================
-- 2. ALTER EXISTING TABLES
-- =============================================================================

-- Guilds Table Enhancements
-- Add metadata about guild creation and status
ALTER TABLE guilds
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_discord_verification BOOLEAN DEFAULT false;

-- Create index on guild creator
CREATE INDEX IF NOT EXISTS idx_guilds_created_by ON guilds(created_by);

-- Guild Members Table Enhancements
-- Track how and when members joined
ALTER TABLE guild_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS joined_via VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS invite_code_id UUID REFERENCES guild_invite_codes(id);

-- Add check constraint for joined_via (using DO block since IF NOT EXISTS not supported for constraints)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_joined_via'
  ) THEN
    ALTER TABLE guild_members
    ADD CONSTRAINT check_joined_via
    CHECK (joined_via IN ('manual', 'invite_code', 'discord_verify'));
  END IF;
END $$;

-- Indexes for guild members
CREATE INDEX IF NOT EXISTS idx_guild_members_joined_via ON guild_members(joined_via);
CREATE INDEX IF NOT EXISTS idx_guild_members_invite_code ON guild_members(invite_code_id);

-- =============================================================================
-- 3. ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on new tables
ALTER TABLE guild_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_guilds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Officers can view guild invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can create invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can update invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Officers can delete invite codes" ON guild_invite_codes;
DROP POLICY IF EXISTS "Users can view their own active guild" ON user_active_guilds;
DROP POLICY IF EXISTS "Users can update their own active guild" ON user_active_guilds;
DROP POLICY IF EXISTS "Users can insert their own active guild" ON user_active_guilds;

-- Guild Invite Codes Policies
-- Users can view invite codes for guilds they're officers in
CREATE POLICY "Officers can view guild invite codes"
  ON guild_invite_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_invite_codes.guild_id
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'Officer'
    )
  );

-- Officers can insert invite codes for their guilds
CREATE POLICY "Officers can create invite codes"
  ON guild_invite_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_invite_codes.guild_id
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'Officer'
    )
  );

-- Officers can update invite codes (deactivate, etc)
CREATE POLICY "Officers can update invite codes"
  ON guild_invite_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_invite_codes.guild_id
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'Officer'
    )
  );

-- Officers can delete invite codes
CREATE POLICY "Officers can delete invite codes"
  ON guild_invite_codes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = guild_invite_codes.guild_id
        AND guild_members.user_id = auth.uid()
        AND guild_members.role = 'Officer'
    )
  );

-- User Active Guilds Policies
-- Users can view their own active guild
CREATE POLICY "Users can view their own active guild"
  ON user_active_guilds FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own active guild
CREATE POLICY "Users can update their own active guild"
  ON user_active_guilds FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own active guild
CREATE POLICY "Users can insert their own active guild"
  ON user_active_guilds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 4. HELPER FUNCTIONS
-- =============================================================================

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(12) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude I, O, 0, 1 for clarity
  result VARCHAR(12) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to validate invite code
CREATE OR REPLACE FUNCTION is_invite_code_valid(code_input VARCHAR(12))
RETURNS BOOLEAN AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM guild_invite_codes
  WHERE code = code_input
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check expiration
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < NOW() THEN
    RETURN false;
  END IF;

  -- Check max uses
  IF code_record.max_uses IS NOT NULL AND code_record.current_uses >= code_record.max_uses THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. DATA MIGRATION FOR EXISTING USERS
-- =============================================================================

-- Set default values for existing guild members
UPDATE guild_members
SET
  joined_at = NOW(),
  joined_via = 'manual'
WHERE joined_at IS NULL OR joined_via IS NULL;

-- Create active guild entries for all existing users
-- Each user gets their first guild as their active guild
INSERT INTO user_active_guilds (user_id, active_guild_id, updated_at)
SELECT DISTINCT ON (user_id)
  user_id,
  guild_id,
  NOW()
FROM guild_members
ORDER BY user_id, id ASC
ON CONFLICT (user_id) DO NOTHING;

-- Set created_by for existing guilds based on first officer
UPDATE guilds g
SET created_by = (
  SELECT gm.user_id
  FROM guild_members gm
  WHERE gm.guild_id = g.id
    AND gm.role = 'Officer'
  ORDER BY gm.id ASC
  LIMIT 1
)
WHERE created_by IS NULL;

-- =============================================================================
-- 6. AUDIT AND VERIFICATION
-- =============================================================================

-- Count guilds with invite code support
DO $$
BEGIN
  RAISE NOTICE 'Multi-guild migration completed successfully';
  RAISE NOTICE 'Guild Invite Codes table created';
  RAISE NOTICE 'User Active Guilds table created';
  RAISE NOTICE 'Enhanced guilds and guild_members tables';
  RAISE NOTICE 'Applied RLS policies';
  RAISE NOTICE 'Migrated % existing users', (SELECT COUNT(DISTINCT user_id) FROM guild_members);
END $$;
