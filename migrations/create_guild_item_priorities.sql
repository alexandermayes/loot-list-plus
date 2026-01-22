-- =====================================================
-- Create Guild Item Priorities System
-- Allows guilds to set role, class, and individual priority for each item
-- =====================================================

-- Create the guild_item_priorities table
CREATE TABLE IF NOT EXISTS guild_item_priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES loot_items(id) ON DELETE CASCADE,
  raid_tier_id UUID NOT NULL REFERENCES raid_tiers(id) ON DELETE CASCADE,

  -- Role priorities (1 = highest priority, higher numbers = lower priority, null = not prioritized)
  -- Stored as JSON: {"tank": 1, "healer": 2, "physical": 3, "caster": null}
  role_priorities JSONB DEFAULT '{}',

  -- Class/Spec priorities
  -- Stored as JSON: {"spec_id_1": 1, "spec_id_2": 2, ...}
  class_priorities JSONB DEFAULT '{}',

  -- Individual character priorities (for specific raiders)
  -- Stored as JSON: {"character_id_1": 1, "character_id_2": 2, ...}
  character_priorities JSONB DEFAULT '{}',

  -- Priority bonus values (applied to loot score)
  -- Stored as JSON: {"role": 5, "class": 3, "character": 2}
  priority_bonuses JSONB DEFAULT '{"role": 5, "class": 3, "character": 2}',

  -- Optional notes for loot council
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each item can only have one priority config per guild per tier
  CONSTRAINT unique_item_priority_per_guild UNIQUE(guild_id, item_id, raid_tier_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guild_item_priorities_guild_id ON guild_item_priorities(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_item_priorities_item_id ON guild_item_priorities(item_id);
CREATE INDEX IF NOT EXISTS idx_guild_item_priorities_raid_tier_id ON guild_item_priorities(raid_tier_id);
CREATE INDEX IF NOT EXISTS idx_guild_item_priorities_guild_tier ON guild_item_priorities(guild_id, raid_tier_id);

-- Enable RLS
ALTER TABLE guild_item_priorities ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Guild members can view priorities in their guild
DROP POLICY IF EXISTS "Guild members can view item priorities" ON guild_item_priorities;
CREATE POLICY "Guild members can view item priorities" ON guild_item_priorities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_item_priorities.guild_id
      AND gm.user_id = auth.uid()
      AND gm.is_active = true
    )
  );

-- Officers can insert priorities
DROP POLICY IF EXISTS "Officers can create item priorities" ON guild_item_priorities;
CREATE POLICY "Officers can create item priorities" ON guild_item_priorities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_item_priorities.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
      AND gm.is_active = true
    )
  );

-- Officers can update priorities
DROP POLICY IF EXISTS "Officers can update item priorities" ON guild_item_priorities;
CREATE POLICY "Officers can update item priorities" ON guild_item_priorities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_item_priorities.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
      AND gm.is_active = true
    )
  );

-- Officers can delete priorities
DROP POLICY IF EXISTS "Officers can delete item priorities" ON guild_item_priorities;
CREATE POLICY "Officers can delete item priorities" ON guild_item_priorities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      WHERE gm.guild_id = guild_item_priorities.guild_id
      AND gm.user_id = auth.uid()
      AND gm.role IN ('Officer', 'Guild Master')
      AND gm.is_active = true
    )
  );

-- =====================================================
-- Updated timestamp trigger
-- =====================================================
CREATE OR REPLACE FUNCTION update_guild_item_priorities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_guild_item_priorities_updated_at ON guild_item_priorities;
CREATE TRIGGER set_guild_item_priorities_updated_at
  BEFORE UPDATE ON guild_item_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_guild_item_priorities_updated_at();

-- =====================================================
-- Helper function to calculate priority bonus for a character on an item
-- Returns the priority bonus based on role, class, and individual priority
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_priority_bonus(
  p_guild_id UUID,
  p_item_id UUID,
  p_raid_tier_id UUID,
  p_character_id UUID,
  p_spec_id UUID,
  p_role TEXT  -- 'tank', 'healer', 'physical', 'caster'
) RETURNS NUMERIC AS $$
DECLARE
  v_priority RECORD;
  v_bonus NUMERIC := 0;
  v_role_priority INTEGER;
  v_class_priority INTEGER;
  v_char_priority INTEGER;
  v_bonuses JSONB;
BEGIN
  -- Get priority config for this item
  SELECT * INTO v_priority
  FROM guild_item_priorities
  WHERE guild_id = p_guild_id
    AND item_id = p_item_id
    AND raid_tier_id = p_raid_tier_id;

  -- If no priority config exists, return 0
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  v_bonuses := COALESCE(v_priority.priority_bonuses, '{"role": 5, "class": 3, "character": 2}'::jsonb);

  -- Check role priority (if role is in priority list)
  IF p_role IS NOT NULL AND v_priority.role_priorities ? p_role THEN
    v_role_priority := (v_priority.role_priorities ->> p_role)::INTEGER;
    IF v_role_priority IS NOT NULL THEN
      -- Higher priority (lower number) = higher bonus
      -- Priority 1 gets full bonus, priority 2 gets 75%, etc.
      v_bonus := v_bonus + ((v_bonuses ->> 'role')::NUMERIC / v_role_priority);
    END IF;
  END IF;

  -- Check class/spec priority
  IF p_spec_id IS NOT NULL AND v_priority.class_priorities ? p_spec_id::TEXT THEN
    v_class_priority := (v_priority.class_priorities ->> p_spec_id::TEXT)::INTEGER;
    IF v_class_priority IS NOT NULL THEN
      v_bonus := v_bonus + ((v_bonuses ->> 'class')::NUMERIC / v_class_priority);
    END IF;
  END IF;

  -- Check individual character priority
  IF p_character_id IS NOT NULL AND v_priority.character_priorities ? p_character_id::TEXT THEN
    v_char_priority := (v_priority.character_priorities ->> p_character_id::TEXT)::INTEGER;
    IF v_char_priority IS NOT NULL THEN
      v_bonus := v_bonus + ((v_bonuses ->> 'character')::NUMERIC / v_char_priority);
    END IF;
  END IF;

  RETURN v_bonus;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Verify setup
-- =====================================================
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'guild_item_priorities'
ORDER BY ordinal_position;
