-- =====================================================
-- PER-PHASE LOOT SUBMISSIONS
-- =====================================================
-- Change loot submissions from per-raid-tier to per-phase.
-- One submission covers all raids in a content phase.
-- =====================================================

BEGIN;

-- Step 1: Add expansion_id and phase columns to loot_submissions
ALTER TABLE loot_submissions
  ADD COLUMN IF NOT EXISTS expansion_id UUID REFERENCES expansions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS phase INTEGER;

-- Step 2: Create index for phase-based lookups
CREATE INDEX IF NOT EXISTS idx_loot_submissions_phase
  ON loot_submissions(character_id, guild_id, expansion_id, phase);

-- Step 3: Backfill existing submissions from raid_tier_id
UPDATE loot_submissions ls
SET
  expansion_id = rt.expansion_id,
  phase = rt.phase
FROM raid_tiers rt
WHERE ls.raid_tier_id = rt.id
  AND ls.expansion_id IS NULL;

-- Step 4: Add phase_deadlines JSONB column to expansions
-- Format: { "1": "2026-03-01T00:00:00Z", "2": null, ... }
ALTER TABLE expansions
  ADD COLUMN IF NOT EXISTS phase_deadlines JSONB DEFAULT '{}';

COMMIT;
