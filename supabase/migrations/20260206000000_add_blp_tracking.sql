-- Bad Luck Protection (BLP) tracking system
-- Tracks how many times a player was "in running" for an item but didn't win

-- Create BLP tracking table
CREATE TABLE IF NOT EXISTS blp_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  loot_item_id UUID NOT NULL REFERENCES loot_items(id) ON DELETE CASCADE,
  times_passed INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One BLP record per character per item per guild
  UNIQUE(guild_id, character_id, loot_item_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blp_tracking_guild ON blp_tracking(guild_id);
CREATE INDEX IF NOT EXISTS idx_blp_tracking_character ON blp_tracking(character_id);
CREATE INDEX IF NOT EXISTS idx_blp_tracking_item ON blp_tracking(loot_item_id);
CREATE INDEX IF NOT EXISTS idx_blp_tracking_guild_item ON blp_tracking(guild_id, loot_item_id);

-- Add BLP settings to guild_settings
ALTER TABLE guild_settings
  ADD COLUMN IF NOT EXISTS blp_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blp_increment DECIMAL(5,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS blp_maximum DECIMAL(5,2) DEFAULT 5.0;

-- Enable RLS
ALTER TABLE blp_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Guild members can view BLP data for their guild
CREATE POLICY "Guild members can view BLP"
  ON blp_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = blp_tracking.guild_id
        AND guild_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Officers can insert BLP records
CREATE POLICY "Officers can insert BLP"
  ON blp_tracking
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = blp_tracking.guild_id
        AND gm.user_id = auth.uid()
        AND gr.position >= 50
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds
      WHERE guilds.id = blp_tracking.guild_id
        AND guilds.created_by = auth.uid()
    )
  );

-- RLS Policy: Officers can update BLP records
CREATE POLICY "Officers can update BLP"
  ON blp_tracking
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = blp_tracking.guild_id
        AND gm.user_id = auth.uid()
        AND gr.position >= 50
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds
      WHERE guilds.id = blp_tracking.guild_id
        AND guilds.created_by = auth.uid()
    )
  );

-- RLS Policy: Officers can delete BLP records
CREATE POLICY "Officers can delete BLP"
  ON blp_tracking
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = blp_tracking.guild_id
        AND gm.user_id = auth.uid()
        AND gr.position >= 50
    )
    OR
    EXISTS (
      SELECT 1 FROM guilds
      WHERE guilds.id = blp_tracking.guild_id
        AND guilds.created_by = auth.uid()
    )
  );

-- Function to increment BLP (handles upsert + increment atomically)
CREATE OR REPLACE FUNCTION increment_blp(
  p_guild_id UUID,
  p_character_id UUID,
  p_loot_item_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_times_passed INTEGER;
BEGIN
  INSERT INTO blp_tracking (guild_id, character_id, loot_item_id, times_passed, last_updated_at)
  VALUES (p_guild_id, p_character_id, p_loot_item_id, 1, NOW())
  ON CONFLICT (guild_id, character_id, loot_item_id)
  DO UPDATE SET
    times_passed = blp_tracking.times_passed + 1,
    last_updated_at = NOW()
  RETURNING times_passed INTO v_times_passed;

  RETURN v_times_passed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset BLP (when player wins item)
CREATE OR REPLACE FUNCTION reset_blp(
  p_guild_id UUID,
  p_character_id UUID,
  p_loot_item_id UUID
) RETURNS VOID AS $$
BEGIN
  DELETE FROM blp_tracking
  WHERE guild_id = p_guild_id
    AND character_id = p_character_id
    AND loot_item_id = p_loot_item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_blp(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_blp(UUID, UUID, UUID) TO authenticated;
