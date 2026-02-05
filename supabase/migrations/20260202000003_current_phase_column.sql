-- Add current_phase to expansions table
-- This controls which phases are visible to raiders (all phases <= current_phase)
ALTER TABLE expansions
  ADD COLUMN IF NOT EXISTS current_phase INTEGER DEFAULT 1;

-- Backfill: Set current_phase based on highest phase with is_active tier
UPDATE expansions e
SET current_phase = COALESCE(
  (SELECT MAX(rt.phase)
   FROM raid_tiers rt
   WHERE rt.expansion_id = e.id
   AND rt.is_active = true),
  1
);
