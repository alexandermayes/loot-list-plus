-- Fix token loot_item_classes entries that have null spec_type
-- Tokens should always be 'primary' for the classes that can use them
-- (the class restrictions are already correctly set via the class_id)

UPDATE loot_item_classes
SET spec_type = 'primary'
WHERE spec_type IS NULL
  AND loot_item_id IN (
    SELECT id FROM loot_items WHERE item_slot = 'Token'
  );
