-- =====================================================
-- PRODUCTION MIGRATION: Character System Setup
-- =====================================================
-- This migration sets up the character system and migrates existing data
-- Run this ONCE on production database
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create Character System Tables
-- =====================================================

-- 1. Create characters table
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  realm VARCHAR(255),
  class_id UUID REFERENCES wow_classes(id),
  spec_id UUID REFERENCES class_specs(id),
  level INTEGER,
  is_main BOOLEAN DEFAULT false,
  battle_net_id BIGINT,
  region VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_character_per_user UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_battle_net_id ON characters(battle_net_id);
CREATE INDEX IF NOT EXISTS idx_characters_is_main ON characters(is_main);

-- 2. Create character_guild_memberships table
CREATE TABLE IF NOT EXISTS character_guild_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'Member',
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  joined_via VARCHAR(50) DEFAULT 'manual',
  CONSTRAINT unique_character_guild UNIQUE(character_id, guild_id)
);

CREATE INDEX IF NOT EXISTS idx_char_guild_character_id ON character_guild_memberships(character_id);
CREATE INDEX IF NOT EXISTS idx_char_guild_guild_id ON character_guild_memberships(guild_id);
CREATE INDEX IF NOT EXISTS idx_char_guild_role ON character_guild_memberships(role);
CREATE INDEX IF NOT EXISTS idx_char_guild_is_active ON character_guild_memberships(is_active);

-- 3. Create user_active_characters table
CREATE TABLE IF NOT EXISTS user_active_characters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  active_guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_active_character ON user_active_characters(active_character_id);
CREATE INDEX IF NOT EXISTS idx_user_active_guild ON user_active_characters(active_guild_id);

-- 4. Add character_id to loot_submissions
ALTER TABLE loot_submissions
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_loot_submissions_character_id ON loot_submissions(character_id);

-- =====================================================
-- STEP 2: Enable RLS on New Tables
-- =====================================================

ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_guild_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_characters ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: RLS Policies for Characters
-- =====================================================

DROP POLICY IF EXISTS "Users can view own characters" ON characters;
CREATE POLICY "Users can view own characters" ON characters
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guild members can view guild characters" ON characters;
CREATE POLICY "Guild members can view guild characters" ON characters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm1
      INNER JOIN character_guild_memberships cgm2 ON cgm1.guild_id = cgm2.guild_id
      INNER JOIN characters c ON c.id = cgm2.character_id
      WHERE cgm1.character_id = characters.id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own characters" ON characters;
CREATE POLICY "Users can insert own characters" ON characters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own characters" ON characters;
CREATE POLICY "Users can update own characters" ON characters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own characters" ON characters;
CREATE POLICY "Users can delete own characters" ON characters
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- STEP 4: RLS Policies for Character Guild Memberships
-- =====================================================

DROP POLICY IF EXISTS "Users can view own character memberships" ON character_guild_memberships;
CREATE POLICY "Users can view own character memberships" ON character_guild_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Guild members can view guild memberships" ON character_guild_memberships;
CREATE POLICY "Guild members can view guild memberships" ON character_guild_memberships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm2
      INNER JOIN characters c ON c.id = cgm2.character_id
      WHERE c.user_id = auth.uid()
      AND cgm2.guild_id = character_guild_memberships.guild_id
    )
  );

DROP POLICY IF EXISTS "Users can insert own character memberships" ON character_guild_memberships;
CREATE POLICY "Users can insert own character memberships" ON character_guild_memberships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Officers can update guild memberships" ON character_guild_memberships;
CREATE POLICY "Officers can update guild memberships" ON character_guild_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = character_guild_memberships.guild_id
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

DROP POLICY IF EXISTS "Users can delete own character memberships" ON character_guild_memberships;
CREATE POLICY "Users can delete own character memberships" ON character_guild_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 5: RLS Policies for User Active Characters
-- =====================================================

DROP POLICY IF EXISTS "Users can view own active character" ON user_active_characters;
CREATE POLICY "Users can view own active character" ON user_active_characters
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own active character" ON user_active_characters;
CREATE POLICY "Users can insert own active character" ON user_active_characters
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own active character" ON user_active_characters;
CREATE POLICY "Users can update own active character" ON user_active_characters
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own active character" ON user_active_characters;
CREATE POLICY "Users can delete own active character" ON user_active_characters
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- STEP 6: Update Loot Submissions RLS Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view submissions in their guild" ON loot_submissions;
CREATE POLICY "Users can view submissions in their guild" ON loot_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = loot_submissions.guild_id
    )
    OR (
      character_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM characters
        WHERE characters.id = loot_submissions.character_id
        AND characters.user_id = auth.uid()
      )
    )
    OR (
      character_id IS NULL
      AND auth.uid() = loot_submissions.user_id
    )
  );

DROP POLICY IF EXISTS "Users can insert character submissions" ON loot_submissions;
CREATE POLICY "Users can insert character submissions" ON loot_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM character_guild_memberships
      WHERE character_guild_memberships.character_id = loot_submissions.character_id
      AND character_guild_memberships.guild_id = loot_submissions.guild_id
    )
  );

DROP POLICY IF EXISTS "Users can update character pending submissions" ON loot_submissions;
CREATE POLICY "Users can update character pending submissions" ON loot_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_submissions.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 7: DATA MIGRATION - Create Characters from Guild Members
-- =====================================================

-- Create characters for all existing guild members
INSERT INTO characters (user_id, name, realm, class_id, level, is_main, created_at)
SELECT DISTINCT
  gm.user_id,
  gm.character_name,
  NULL as realm,  -- Will be filled in later if available
  gm.class_id,
  NULL as level,
  true as is_main,  -- Mark first character as main
  gm.joined_at
FROM guild_members gm
WHERE gm.is_active = true
  AND gm.character_name IS NOT NULL
  AND gm.character_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM characters c
    WHERE c.user_id = gm.user_id
    AND c.name = gm.character_name
  )
ON CONFLICT (user_id, name) DO NOTHING;

-- =====================================================
-- STEP 8: DATA MIGRATION - Create Character Guild Memberships
-- =====================================================

-- Create character_guild_memberships for all migrated characters
INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active, joined_at, joined_via)
SELECT DISTINCT
  c.id as character_id,
  gm.guild_id,
  gm.role,
  gm.is_active,
  gm.joined_at,
  'migration' as joined_via
FROM guild_members gm
INNER JOIN characters c ON c.user_id = gm.user_id AND c.name = gm.character_name
WHERE NOT EXISTS (
  SELECT 1 FROM character_guild_memberships cgm
  WHERE cgm.character_id = c.id
  AND cgm.guild_id = gm.guild_id
)
ON CONFLICT (character_id, guild_id) DO NOTHING;

-- =====================================================
-- STEP 9: DATA MIGRATION - Set Active Characters
-- =====================================================

-- Set active character for each user based on their current guild membership
INSERT INTO user_active_characters (user_id, active_character_id, active_guild_id, updated_at)
SELECT DISTINCT ON (gm.user_id)
  gm.user_id,
  c.id as active_character_id,
  gm.guild_id as active_guild_id,
  NOW() as updated_at
FROM guild_members gm
INNER JOIN characters c ON c.user_id = gm.user_id AND c.name = gm.character_name
WHERE gm.is_active = true
ORDER BY gm.user_id, gm.joined_at ASC
ON CONFLICT (user_id) DO UPDATE
  SET active_character_id = EXCLUDED.active_character_id,
      active_guild_id = EXCLUDED.active_guild_id,
      updated_at = NOW();

-- =====================================================
-- STEP 10: DATA MIGRATION - Link Loot Submissions to Characters
-- =====================================================

-- Link existing loot submissions to characters
UPDATE loot_submissions ls
SET character_id = c.id
FROM guild_members gm
INNER JOIN characters c ON c.user_id = gm.user_id AND c.name = gm.character_name
WHERE ls.user_id = gm.user_id
  AND ls.guild_id = gm.guild_id
  AND ls.character_id IS NULL;

-- =====================================================
-- STEP 11: Log Migration Results
-- =====================================================

DO $$
DECLARE
  character_count INT;
  membership_count INT;
  active_count INT;
  submission_count INT;
BEGIN
  SELECT COUNT(*) INTO character_count FROM characters;
  SELECT COUNT(*) INTO membership_count FROM character_guild_memberships WHERE joined_via = 'migration';
  SELECT COUNT(*) INTO active_count FROM user_active_characters;
  SELECT COUNT(*) INTO submission_count FROM loot_submissions WHERE character_id IS NOT NULL;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Characters created: %', character_count;
  RAISE NOTICE 'Guild memberships migrated: %', membership_count;
  RAISE NOTICE 'Active characters set: %', active_count;
  RAISE NOTICE 'Loot submissions linked: %', submission_count;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (run these separately after migration)
-- =====================================================

-- Check characters
-- SELECT user_id, name, is_main FROM characters ORDER BY created_at DESC LIMIT 10;

-- Check memberships
-- SELECT c.name, g.name as guild, cgm.role
-- FROM character_guild_memberships cgm
-- INNER JOIN characters c ON c.id = cgm.character_id
-- INNER JOIN guilds g ON g.id = cgm.guild_id
-- LIMIT 10;

-- Check active characters
-- SELECT u.email, c.name as character, g.name as guild
-- FROM user_active_characters uac
-- INNER JOIN auth.users u ON u.id = uac.user_id
-- INNER JOIN characters c ON c.id = uac.active_character_id
-- INNER JOIN guilds g ON g.id = uac.active_guild_id
-- LIMIT 10;
