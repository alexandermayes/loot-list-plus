-- Create loot_history table for tracking awarded items
CREATE TABLE IF NOT EXISTS loot_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  character_name TEXT NOT NULL, -- Denormalized for display when character is deleted
  loot_item_id UUID NOT NULL REFERENCES loot_items(id) ON DELETE CASCADE,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_loot_history_guild_id ON loot_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_loot_history_character_id ON loot_history(character_id);
CREATE INDEX IF NOT EXISTS idx_loot_history_loot_item_id ON loot_history(loot_item_id);
CREATE INDEX IF NOT EXISTS idx_loot_history_awarded_date ON loot_history(awarded_date DESC);
CREATE INDEX IF NOT EXISTS idx_loot_history_guild_date ON loot_history(guild_id, awarded_date DESC);

-- Enable RLS
ALTER TABLE loot_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Guild members can view loot history for their guild
DROP POLICY IF EXISTS "Guild members can view loot history" ON loot_history;
CREATE POLICY "Guild members can view loot history"
  ON loot_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members
      WHERE guild_members.guild_id = loot_history.guild_id
        AND guild_members.user_id = auth.uid()
    )
  );

-- Officers can insert loot history (position >= 50)
DROP POLICY IF EXISTS "Officers can insert loot history" ON loot_history;
CREATE POLICY "Officers can insert loot history"
  ON loot_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = loot_history.guild_id
        AND gm.user_id = auth.uid()
        AND gr.position >= 50
    )
  );

-- Officers can update loot history
DROP POLICY IF EXISTS "Officers can update loot history" ON loot_history;
CREATE POLICY "Officers can update loot history"
  ON loot_history FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = loot_history.guild_id
        AND gm.user_id = auth.uid()
        AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = loot_history.guild_id
        AND gm.user_id = auth.uid()
        AND gr.position >= 50
    )
  );

-- Officers can delete loot history
DROP POLICY IF EXISTS "Officers can delete loot history" ON loot_history;
CREATE POLICY "Officers can delete loot history"
  ON loot_history FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.guild_id = loot_history.guild_id
        AND gm.user_id = auth.uid()
        AND gr.position >= 50
    )
  );

-- Add updated_at trigger (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_loot_history_updated_at'
  ) THEN
    CREATE TRIGGER update_loot_history_updated_at
      BEFORE UPDATE ON loot_history
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
