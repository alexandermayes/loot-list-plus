-- Create loot_history table to track items awarded to characters
CREATE TABLE IF NOT EXISTS loot_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  loot_item_id UUID NOT NULL REFERENCES loot_items(id) ON DELETE CASCADE,
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  raid_tier_id UUID NOT NULL REFERENCES raid_tiers(id) ON DELETE CASCADE,
  awarded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  awarded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_loot_history_character_id ON loot_history(character_id);
CREATE INDEX IF NOT EXISTS idx_loot_history_loot_item_id ON loot_history(loot_item_id);
CREATE INDEX IF NOT EXISTS idx_loot_history_guild_id ON loot_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_loot_history_awarded_date ON loot_history(awarded_date);

-- Enable RLS
ALTER TABLE loot_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view loot history for their own characters
CREATE POLICY "Users can view own character loot history" ON loot_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM characters
      WHERE characters.id = loot_history.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Guild members can view loot history in their guild
CREATE POLICY "Guild members can view guild loot history" ON loot_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = loot_history.guild_id
    )
  );

-- Officers can insert loot history (award items)
CREATE POLICY "Officers can insert loot history" ON loot_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = loot_history.guild_id
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Officers can update loot history in their guild
CREATE POLICY "Officers can update loot history" ON loot_history
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = loot_history.guild_id
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );

-- Officers can delete loot history in their guild
CREATE POLICY "Officers can delete loot history" ON loot_history
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM character_guild_memberships cgm
      INNER JOIN characters c ON c.id = cgm.character_id
      WHERE c.user_id = auth.uid()
      AND cgm.guild_id = loot_history.guild_id
      AND cgm.role IN ('Officer', 'Guild Master')
    )
  );
