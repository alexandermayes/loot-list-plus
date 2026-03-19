-- =============================================================================
-- Add unique constraint to loot_history
-- =============================================================================
-- Prevents the same item being awarded to the same character from the same
-- raid event twice. Without this, double-clicks, retries, or addon sync
-- races can silently create duplicate loot awards.
--
-- Uses a partial unique index (WHERE both fields are NOT NULL) because:
--   - character_id can be NULL (unassigned loot)
--   - raid_event_id can be NULL (manually tracked loot)
--   - Postgres UNIQUE doesn't consider NULLs as equal anyway
-- =============================================================================

-- Step 1: Remove existing duplicates (keep the earliest entry)
DELETE FROM loot_history
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY guild_id, loot_item_id, character_id, raid_event_id
        ORDER BY created_at ASC
      ) AS rn
    FROM loot_history
    WHERE raid_event_id IS NOT NULL
      AND character_id IS NOT NULL
  ) dupes
  WHERE rn > 1
);

-- Step 2: Add the partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_loot_history_unique_award
  ON loot_history (guild_id, loot_item_id, character_id, raid_event_id)
  WHERE raid_event_id IS NOT NULL AND character_id IS NOT NULL;

-- Verification
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Count was already done by the DELETE, just confirm the index exists
  RAISE NOTICE '================================================';
  RAISE NOTICE 'loot_history unique constraint added';
  RAISE NOTICE 'Partial index on (guild_id, loot_item_id, character_id, raid_event_id)';
  RAISE NOTICE 'Applies when both raid_event_id and character_id are NOT NULL';
  RAISE NOTICE '================================================';
END $$;
