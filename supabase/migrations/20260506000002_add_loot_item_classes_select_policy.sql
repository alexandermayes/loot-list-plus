-- Add missing SELECT policy on loot_item_classes
-- This is global reference data (which specs can use which items),
-- readable by any authenticated user. Without this policy, RLS
-- silently returns 0 rows on client-side queries.

DROP POLICY IF EXISTS "Authenticated users can view loot item classes" ON loot_item_classes;

CREATE POLICY "Authenticated users can view loot item classes" ON loot_item_classes
  FOR SELECT
  USING (auth.role() = 'authenticated');
