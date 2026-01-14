-- =====================================================
-- Character System Migration - Phase 1 (v3 - Fixed)
-- =====================================================
-- This migration transforms LootList+ from user-based to character-based
-- Allows users to create multiple characters per guild with individual loot lists
-- Fixed: Handles all existing policy names (old and new) before recreation
-- =====================================================

-- =====================================================
-- 1. Create characters table
-- =====================================================
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

-- Indexes for performance (drop and recreate to avoid conflicts)
DROP INDEX IF EXISTS idx_characters_user_id;
DROP INDEX IF EXISTS idx_characters_battle_net_id;
DROP INDEX IF EXISTS idx_characters_is_main;

CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_battle_net_id ON characters(battle_net_id);
CREATE INDEX idx_characters_is_main ON characters(is_main);

-- =====================================================
-- 2. Create character_guild_memberships table
-- =====================================================
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

-- Indexes for performance
DROP INDEX IF EXISTS idx_char_guild_character_id;
DROP INDEX IF EXISTS idx_char_guild_guild_id;
DROP INDEX IF EXISTS idx_char_guild_role;
DROP INDEX IF EXISTS idx_char_guild_is_active;

CREATE INDEX idx_char_guild_character_id ON character_guild_memberships(character_id);
CREATE INDEX idx_char_guild_guild_id ON character_guild_memberships(guild_id);
CREATE INDEX idx_char_guild_role ON character_guild_memberships(role);
CREATE INDEX idx_char_guild_is_active ON character_guild_memberships(is_active);

-- =====================================================
-- 3. Create user_active_characters table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_active_characters (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  active_guild_id UUID REFERENCES guilds(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
DROP INDEX IF EXISTS idx_user_active_character;
DROP INDEX IF EXISTS idx_user_active_guild;

CREATE INDEX idx_user_active_character ON user_active_characters(active_character_id);
CREATE INDEX idx_user_active_guild ON user_active_characters(active_guild_id);

-- =====================================================
-- 4. Add character_id to loot_submissions
-- =====================================================
ALTER TABLE loot_submissions
  ADD COLUMN IF NOT EXISTS character_id UUID REFERENCES characters(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_loot_submissions_character_id;
CREATE INDEX idx_loot_submissions_character_id ON loot_submissions(character_id);

-- =====================================================
-- 5. Enable RLS on all new tables
-- =====================================================
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_guild_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_active_characters ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS Policies for characters table
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
-- 7. RLS Policies for character_guild_memberships table
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

DROP POLICY IF EXISTS "Users can update own character memberships" ON character_guild_memberships;
CREATE POLICY "Users can update own character memberships" ON character_guild_memberships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = character_guild_memberships.character_id
      AND characters.user_id = auth.uid()
    )
  )
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

DROP POLICY IF EXISTS "Officers can delete guild memberships" ON character_guild_memberships;
CREATE POLICY "Officers can delete guild memberships" ON character_guild_memberships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = character_guild_memberships.guild_id
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- =====================================================
-- 8. RLS Policies for user_active_characters table
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
-- 9. Update loot_submissions RLS policies for characters
-- =====================================================
-- Drop both OLD policy names and NEW policy names to handle all cases
DROP POLICY IF EXISTS "Users can view submissions in their guild" ON loot_submissions;
DROP POLICY IF EXISTS "Users can insert their own submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update their own pending submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can insert character submissions" ON loot_submissions;
DROP POLICY IF EXISTS "Users can update character pending submissions" ON loot_submissions;

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
-- 10. Create helpful database functions
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_characters_in_guild(p_user_id UUID, p_guild_id UUID)
RETURNS TABLE (
  character_id UUID,
  character_name VARCHAR,
  character_realm VARCHAR,
  character_level INTEGER,
  character_is_main BOOLEAN,
  membership_role VARCHAR,
  class_name VARCHAR,
  class_color VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.realm,
    c.level,
    c.is_main,
    cgm.role,
    wc.name,
    wc.color_hex
  FROM characters c
  INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id
  LEFT JOIN wow_classes wc ON wc.id = c.class_id
  WHERE c.user_id = p_user_id
  AND cgm.guild_id = p_guild_id
  AND cgm.is_active = true
  ORDER BY c.is_main DESC, c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_character_guilds(p_character_id UUID)
RETURNS TABLE (
  guild_id UUID,
  guild_name VARCHAR,
  guild_icon_url TEXT,
  membership_role VARCHAR,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.icon_url,
    cgm.role,
    cgm.joined_at
  FROM guilds g
  INNER JOIN character_guild_memberships cgm ON cgm.guild_id = g.id
  WHERE cgm.character_id = p_character_id
  AND cgm.is_active = true
  ORDER BY cgm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Migration Complete
-- =====================================================
