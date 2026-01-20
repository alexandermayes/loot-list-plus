-- =====================================================
-- COMPLETE FIX: Loot Submission Items with Slot Column
-- =====================================================
-- 1. Add slot column if missing
-- 2. Fix any duplicate data
-- 3. Update constraints
-- 4. Fix RLS policies
-- =====================================================

BEGIN;

-- ========== PART 1: Add slot column ==========

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

-- ========== PART 2: Fix RLS policies ==========

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can insert own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can update own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Users can delete own submission items" ON loot_submission_items;
DROP POLICY IF EXISTS "Guild members can view submission items" ON loot_submission_items;

-- Enable RLS
ALTER TABLE loot_submission_items ENABLE ROW LEVEL SECURITY;

-- Allow users to view items for submissions in their guild
CREATE POLICY "Guild members can view submission items" ON loot_submission_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      WHERE ls.id = loot_submission_items.submission_id
      AND EXISTS (
        SELECT 1 FROM character_guild_memberships cgm
        INNER JOIN characters c ON c.id = cgm.character_id
        WHERE c.user_id = auth.uid()
        AND cgm.guild_id = ls.guild_id
      )
    )
  );

-- Allow users to insert items for their own character's submissions
CREATE POLICY "Users can insert own submission items" ON loot_submission_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
    )
  );

-- Allow users to update items for their own character's pending submissions
CREATE POLICY "Users can update own submission items" ON loot_submission_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND ls.status = 'pending'
    )
  );

-- Allow users to delete items from their own character's pending submissions
CREATE POLICY "Users can delete own submission items" ON loot_submission_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM loot_submissions ls
      INNER JOIN characters c ON c.id = ls.character_id
      WHERE ls.id = loot_submission_items.submission_id
      AND c.user_id = auth.uid()
      AND ls.status = 'pending'
    )
  );

COMMIT;

-- Confirmation message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Loot Submission Items Fixed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Slot column added and constraints updated.';
  RAISE NOTICE 'RLS policies updated for character system.';
  RAISE NOTICE 'Refresh browser to submit loot lists.';
  RAISE NOTICE '========================================';
END $$;
