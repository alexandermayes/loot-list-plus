-- =====================================================
-- FIX: Add RLS policies for loot_item_classes
-- =====================================================
-- Officers need to manage Primary/Secondary spec assignments
-- =====================================================

BEGIN;

-- Enable RLS on loot_item_classes
ALTER TABLE loot_item_classes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Everyone can view loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Officers can manage loot item classes" ON loot_item_classes;

-- Allow everyone to view (needed for filtering loot lists)
CREATE POLICY "Everyone can view loot item classes" ON loot_item_classes
  FOR SELECT
  USING (true);

-- Allow officers to insert/update/delete
CREATE POLICY "Officers can manage loot item classes" ON loot_item_classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      INNER JOIN loot_items li ON li.id = loot_item_classes.loot_item_id
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = li.guild_id
      AND gm.is_active = true
      AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      INNER JOIN loot_items li ON li.id = loot_item_classes.loot_item_id
      WHERE gm.user_id = auth.uid()
      AND gm.guild_id = li.guild_id
      AND gm.is_active = true
      AND gr.position >= 50
    )
  );

COMMIT;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Loot Item Classes RLS Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Officers can now manage Primary/Secondary';
  RAISE NOTICE 'spec assignments for loot items.';
  RAISE NOTICE 'Refresh browser to edit master loot.';
  RAISE NOTICE '========================================';
END $$;
