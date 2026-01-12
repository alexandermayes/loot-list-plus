-- Add slot column to differentiate between the two item slots at each rank
-- This allows both slots to have the same rank value while maintaining uniqueness

-- Add slot column (1 or 2)
ALTER TABLE loot_submission_items
ADD COLUMN slot INTEGER NOT NULL DEFAULT 1 CHECK (slot IN (1, 2));

-- Drop the old unique constraint on (submission_id, rank)
ALTER TABLE loot_submission_items
DROP CONSTRAINT IF EXISTS loot_submission_items_submission_id_rank_key;

-- Add new unique constraint on (submission_id, rank, slot)
ALTER TABLE loot_submission_items
ADD CONSTRAINT loot_submission_items_submission_id_rank_slot_key
UNIQUE (submission_id, rank, slot);

-- Add comment
COMMENT ON COLUMN loot_submission_items.slot IS 'Item slot within the rank (1 or 2). Both slots have equal priority.';
