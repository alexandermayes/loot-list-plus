-- Add removed_at column to loot_submission_items
-- When set, the item is "removed" from the list but stays visible as reference.
-- The master sheet filters these out so the character no longer competes for the item.
ALTER TABLE loot_submission_items
  ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ DEFAULT NULL;

-- Add removed_by to track who removed it (raider or officer)
ALTER TABLE loot_submission_items
  ADD COLUMN IF NOT EXISTS removed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT NULL;
