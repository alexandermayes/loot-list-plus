-- Migration: Add character equipped items table
-- Purpose: Store gear imported from WowSims for upgrade calculation

-- Table to store imported gear per character
CREATE TABLE character_equipped_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot TEXT NOT NULL,  -- Normalized slot name: Head, Neck, Shoulder, etc.
  wowhead_id INTEGER NOT NULL,
  item_name TEXT,
  enchant_id INTEGER,
  gem_ids INTEGER[],
  imported_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each character can only have one item per slot
  UNIQUE(character_id, slot)
);

-- Index for efficient lookups by character
CREATE INDEX idx_character_equipped_items_character_id
  ON character_equipped_items(character_id);

-- Index for finding characters with specific items
CREATE INDEX idx_character_equipped_items_wowhead_id
  ON character_equipped_items(wowhead_id);

-- RLS policies
ALTER TABLE character_equipped_items ENABLE ROW LEVEL SECURITY;

-- Users can view equipped items for characters in their guilds
CREATE POLICY "Users can view equipped items for guild characters"
  ON character_equipped_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN character_guild_memberships cgm ON cgm.character_id = c.id
      JOIN guild_members gm ON gm.guild_id = cgm.guild_id
      WHERE c.id = character_equipped_items.character_id
      AND gm.user_id = auth.uid()
    )
  );

-- Users can insert/update/delete their own characters' equipped items
CREATE POLICY "Users can manage their own characters' equipped items"
  ON character_equipped_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_equipped_items.character_id
      AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      WHERE c.id = character_equipped_items.character_id
      AND c.user_id = auth.uid()
    )
  );

-- Officers can manage any character's equipped items in their guild
CREATE POLICY "Officers can manage guild characters' equipped items"
  ON character_equipped_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN character_guild_memberships cgm ON cgm.character_id = c.id
      JOIN guild_members gm ON gm.guild_id = cgm.guild_id
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE c.id = character_equipped_items.character_id
      AND gm.user_id = auth.uid()
      AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM characters c
      JOIN character_guild_memberships cgm ON cgm.character_id = c.id
      JOIN guild_members gm ON gm.guild_id = cgm.guild_id
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE c.id = character_equipped_items.character_id
      AND gm.user_id = auth.uid()
      AND gr.position >= 50
    )
  );

-- Add comment for documentation
COMMENT ON TABLE character_equipped_items IS
  'Stores gear imported from WowSims for each character. Used to determine upgrade value when importing BIS lists.';
