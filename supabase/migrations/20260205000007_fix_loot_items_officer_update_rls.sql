-- =====================================================
-- Fix RLS policies for loot_items table
-- =====================================================
-- This ensures officers can update loot items (including officer_notes)
-- Uses character_guild_memberships for role check which is the current
-- membership model used throughout the application.
-- =====================================================

-- Enable RLS on loot_items table if not already enabled
ALTER TABLE loot_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Officers can manage loot items" ON loot_items;
DROP POLICY IF EXISTS "Members can view loot items" ON loot_items;
DROP POLICY IF EXISTS "loot_items_select" ON loot_items;
DROP POLICY IF EXISTS "loot_items_update" ON loot_items;
DROP POLICY IF EXISTS "loot_items_insert" ON loot_items;
DROP POLICY IF EXISTS "loot_items_delete" ON loot_items;

-- SELECT: Guild members can view loot items for their guild's expansion
CREATE POLICY "loot_items_select" ON loot_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM raid_tiers rt
      JOIN expansions e ON rt.expansion_id = e.id
      JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rt.id = loot_items.raid_tier_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
    )
  );

-- UPDATE: Officers can update loot items
CREATE POLICY "loot_items_update" ON loot_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM raid_tiers rt
      JOIN expansions e ON rt.expansion_id = e.id
      JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rt.id = loot_items.raid_tier_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master', 'officer', 'guild_master')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_tiers rt
      JOIN expansions e ON rt.expansion_id = e.id
      JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rt.id = loot_items.raid_tier_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master', 'officer', 'guild_master')
    )
  );

-- INSERT: Officers can insert loot items
CREATE POLICY "loot_items_insert" ON loot_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM raid_tiers rt
      JOIN expansions e ON rt.expansion_id = e.id
      JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rt.id = raid_tier_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master', 'officer', 'guild_master')
    )
  );

-- DELETE: Officers can delete loot items
CREATE POLICY "loot_items_delete" ON loot_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM raid_tiers rt
      JOIN expansions e ON rt.expansion_id = e.id
      JOIN character_guild_memberships cgm ON cgm.guild_id = e.guild_id
      JOIN characters c ON c.id = cgm.character_id
      WHERE rt.id = loot_items.raid_tier_id
      AND c.user_id = auth.uid()
      AND cgm.is_active = true
      AND cgm.role IN ('Officer', 'Guild Master', 'officer', 'guild_master')
    )
  );

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Loot items RLS policies updated!';
  RAISE NOTICE 'Officers can now manage loot items';
  RAISE NOTICE '========================================';
END $$;
