-- Fix the unique constraint on loot_item_classes
-- The current constraint prevents multiple specs from the same class on an item
-- We need to allow multiple specs per class (e.g., Holy Paladin and Ret Paladin both primary)

-- Drop the old constraint that only allows one class per item
ALTER TABLE loot_item_classes
DROP CONSTRAINT IF EXISTS loot_item_classes_loot_item_id_class_id_key;

-- Add a better constraint that prevents duplicate spec assignments
-- This allows multiple specs from the same class, but not the same spec twice
ALTER TABLE loot_item_classes
ADD CONSTRAINT loot_item_classes_loot_item_id_spec_id_spec_type_key
UNIQUE (loot_item_id, spec_id, spec_type);

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_loot_item_classes_item_spec_type
ON loot_item_classes(loot_item_id, spec_type);
