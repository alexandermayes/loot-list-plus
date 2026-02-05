-- =====================================================
-- Add unique constraint on loot_submissions
-- =====================================================
-- Prevent duplicate submissions for the same character/guild/expansion/phase
-- =====================================================

-- First, clean up any remaining duplicates across all submissions
-- Keep only the most recent submission for each character/guild/expansion/phase combo
DELETE FROM loot_submissions
WHERE id NOT IN (
  SELECT DISTINCT ON (character_id, guild_id, expansion_id, phase) id
  FROM loot_submissions
  ORDER BY character_id, guild_id, expansion_id, phase, created_at DESC
);

-- Add unique constraint
ALTER TABLE loot_submissions
ADD CONSTRAINT loot_submissions_unique_character_guild_expansion_phase
UNIQUE (character_id, guild_id, expansion_id, phase);

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Unique constraint added to loot_submissions!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'One submission per character/guild/expansion/phase.';
  RAISE NOTICE '========================================';
END $$;
