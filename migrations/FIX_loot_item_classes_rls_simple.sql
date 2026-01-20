-- =====================================================
-- FIX: Simpler RLS policies for loot_item_classes
-- =====================================================
-- Officers can manage spec assignments
-- =====================================================

BEGIN;

-- Drop problematic policies
DROP POLICY IF EXISTS "Officers can manage loot item classes" ON loot_item_classes;

-- Simpler policy: officers can manage all loot item classes
CREATE POLICY "Officers can manage loot item classes" ON loot_item_classes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
      AND gm.is_active = true
      AND gr.position >= 50
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guild_members gm
      INNER JOIN guild_roles gr ON gr.guild_id = gm.guild_id AND gr.name = gm.role
      WHERE gm.user_id = auth.uid()
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
  RAISE NOTICE 'Officers can now manage spec assignments.';
  RAISE NOTICE 'Refresh browser to edit master loot.';
  RAISE NOTICE '========================================';
END $$;
