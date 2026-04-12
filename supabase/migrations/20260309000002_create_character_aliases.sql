-- =====================================================
-- Create character_aliases table
-- =====================================================
-- Stores name aliases so officers can map unmatched
-- attendance/loot names to real guild members.
-- =====================================================

CREATE TABLE character_aliases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,           -- stored lowercase always
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_character_aliases_unique ON character_aliases(guild_id, alias_name);
CREATE INDEX idx_character_aliases_guild ON character_aliases(guild_id);

-- Enable RLS
ALTER TABLE character_aliases ENABLE ROW LEVEL SECURITY;

-- SELECT: Guild members can view aliases (join through character_guild_memberships)
CREATE POLICY "character_aliases_select" ON character_aliases
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = character_aliases.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = character_aliases.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- INSERT: Officers OR guild creators
CREATE POLICY "character_aliases_insert" ON character_aliases
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = guild_id
      AND g.created_by = auth.uid()
    )
  );

-- UPDATE: Officers OR guild creators
CREATE POLICY "character_aliases_update" ON character_aliases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = character_aliases.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = character_aliases.guild_id
      AND g.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = character_aliases.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = character_aliases.guild_id
      AND g.created_by = auth.uid()
    )
  );

-- DELETE: Officers OR guild creators
CREATE POLICY "character_aliases_delete" ON character_aliases
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      JOIN characters c ON c.id = cgm.character_id
      WHERE cgm.guild_id = character_aliases.guild_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('officer', 'guild_master')
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds g
      WHERE g.id = character_aliases.guild_id
      AND g.created_by = auth.uid()
    )
  );
