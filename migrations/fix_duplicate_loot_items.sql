-- Clean up duplicate loot submission items
-- Keep only one entry for each (submission_id, rank, slot) combination

-- Use a CTE to identify which rows to keep (keep the first one by ID)
WITH rows_to_keep AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY submission_id, rank, slot ORDER BY id) as rn
    FROM loot_submission_items
  ) sub
  WHERE rn = 1
)
DELETE FROM loot_submission_items
WHERE id NOT IN (SELECT id FROM rows_to_keep);

-- Verify the slot column exists
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

-- Ensure the unique constraint exists
ALTER TABLE loot_submission_items
DROP CONSTRAINT IF EXISTS loot_submission_items_submission_id_rank_slot_key;

ALTER TABLE loot_submission_items
ADD CONSTRAINT loot_submission_items_submission_id_rank_slot_key
UNIQUE (submission_id, rank, slot);
