-- =====================================================
-- Fix character name capitalization
-- =====================================================
-- WoW character names always have the first letter capitalized
-- and the rest lowercase. This migration fixes existing characters.
-- Handles duplicates by keeping the most recently updated one.
-- =====================================================

-- First, delete duplicates that would conflict after normalization
-- Keep the one with the most recent updated_at (or created_at if updated_at is null)
WITH duplicates AS (
  SELECT id,
         user_id,
         name,
         CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name FROM 2))) as normalized_name,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name FROM 2)))
           ORDER BY COALESCE(updated_at, created_at) DESC, created_at DESC
         ) as rn
  FROM characters
  WHERE name IS NOT NULL
)
DELETE FROM characters
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Now update all character names to have proper capitalization
UPDATE characters
SET name = CONCAT(
  UPPER(LEFT(name, 1)),
  LOWER(SUBSTRING(name FROM 2))
)
WHERE name IS NOT NULL
  AND name != CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name FROM 2)));

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Character name capitalization fixed';
  RAISE NOTICE '========================================';
END $$;
