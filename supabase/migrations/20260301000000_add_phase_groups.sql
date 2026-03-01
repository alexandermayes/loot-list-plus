-- =============================================================================
-- Add phase_groups column for optional phase merging
-- =============================================================================
-- When NULL (default): each phase is independent (current behavior).
-- When set: JSONB array of phase-number arrays defining groups.
-- Example: [[1, 2], [3], [4], [5]] merges P1+P2 into one loot list.
-- The canonical phase ID (used for submissions) is the min in each group.
-- =============================================================================

ALTER TABLE expansions
  ADD COLUMN IF NOT EXISTS phase_groups JSONB DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN expansions.phase_groups IS 'Optional phase merging config. JSONB array of arrays, e.g. [[1,2],[3]]. NULL = each phase independent (default).';
