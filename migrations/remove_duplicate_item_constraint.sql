-- Migration: Remove unique constraint on (submission_id, loot_item_id)
-- This allows the same item to appear in multiple slots at different ranks

-- Drop the old constraint that prevents duplicate items in a submission
ALTER TABLE loot_submission_items
DROP CONSTRAINT IF EXISTS loot_submission_items_submission_id_loot_item_id_key;

-- The slot system already has the proper unique constraint:
-- loot_submission_items_submission_id_rank_slot_key on (submission_id, rank, slot)
-- This allows the same item to appear multiple times as long as it's in different rank/slot combinations

COMMENT ON TABLE loot_submission_items IS 'Stores loot rankings for submissions. With the slot system, the same item can appear in different rank/slot positions.';
