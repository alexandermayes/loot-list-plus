-- Add slot column to differentiate between the two item slots at each rank
-- This allows both slots to have the same rank value while maintaining uniqueness

-- Add slot column (1 or 2) if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loot_submission_items' AND column_name = 'slot'
  ) THEN
    ALTER TABLE loot_submission_items
    ADD COLUMN slot INTEGER NOT NULL DEFAULT 1 CHECK (slot IN (1, 2));
  END IF;
END $$;

-- Fix duplicate rows: Assign slot numbers to existing duplicates
-- For each (submission_id, rank) pair that has duplicates, number them 1, 2, etc.
WITH ranked_items AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY submission_id, rank ORDER BY id) as row_num
  FROM loot_submission_items
)
UPDATE loot_submission_items
SET slot = LEAST(ranked_items.row_num, 2)
FROM ranked_items
WHERE loot_submission_items.id = ranked_items.id
AND ranked_items.row_num > 1;

-- Delete any items beyond slot 2 (shouldn't happen, but just in case)
DELETE FROM loot_submission_items
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (PARTITION BY submission_id, rank ORDER BY id) as row_num
    FROM loot_submission_items
  ) sub
  WHERE row_num > 2
);

-- Drop the old unique constraint on (submission_id, rank)
ALTER TABLE loot_submission_items
DROP CONSTRAINT IF EXISTS loot_submission_items_submission_id_rank_key;

-- Add new unique constraint on (submission_id, rank, slot)
ALTER TABLE loot_submission_items
DROP CONSTRAINT IF EXISTS loot_submission_items_submission_id_rank_slot_key;

ALTER TABLE loot_submission_items
ADD CONSTRAINT loot_submission_items_submission_id_rank_slot_key
UNIQUE (submission_id, rank, slot);

-- Add comment
COMMENT ON COLUMN loot_submission_items.slot IS 'Item slot within the rank (1 or 2). Both slots have equal priority.';
