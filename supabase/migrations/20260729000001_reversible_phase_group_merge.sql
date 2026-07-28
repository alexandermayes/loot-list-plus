-- Make phase-group merging reversible (GH #207).
--
-- Problem
-- -------
-- merge_phase_groups migrated submissions into a group's canonical (lowest)
-- phase with a plain overwrite:
--
--   UPDATE loot_submissions SET phase = canonical_phase WHERE phase IN (group)
--
-- The pre-merge phase was recorded nowhere and there was no inverse operation:
-- clearing the config only set expansions.phase_groups = NULL, and narrowing a
-- group only ever migrated *into* groups that still had more than one phase.
--
-- So merging [2,3] rewrote every phase-3 submission to phase 2, and un-merging
-- left them stranded at 2 forever. Both the officer queue and the raider's own
-- list are keyed by phase, so the submission dropped out of the phase-3 views
-- entirely — an officer would see a pending list vanish from their approve /
-- reject queue after touching phase grouping under Loot Management.
--
-- Fix
-- ---
-- Remember where each submission came from, and put it back when the phases
-- stop being merged.
--
-- 1. loot_submissions.original_phase records the phase a submission was
--    migrated away from. NULL means "never migrated" — the common case, and
--    the correct one for a list created while the group was already merged
--    (that raider really did submit for the canonical phase).
--
-- 2. merge_phase_groups gains a restore pass that runs BEFORE the merge pass:
--    any submission whose current phase and original_phase are no longer in
--    the same group under the new config goes back to original_phase.
--
-- Ordering matters. Restoring first means the merge pass sees rows at their
-- true phases, so its conflict check is accurate — a reshuffle that would put
-- one character's restored list into a group they already have a list in
-- raises CONFLICT and rolls the whole thing back, rather than silently
-- colliding with loot_submissions_unique_character_guild_expansion_phase.
--
-- COALESCE on write means the ORIGINAL origin survives repeated merges:
-- merging [2,3] then [1,2,3] keeps a phase-3 list pointing at 3, not at 2.

ALTER TABLE "public"."loot_submissions"
  ADD COLUMN IF NOT EXISTS "original_phase" integer;

COMMENT ON COLUMN "public"."loot_submissions"."original_phase" IS
  'Phase this submission was migrated away from by merge_phase_groups. NULL = never migrated. Used to restore the submission when its phases stop being merged (GH #207).';

-- Same 4-arg signature as before: CREATE OR REPLACE preserves the existing
-- ACL, so the anon/authenticated revokes from 20260722000001 stay in force.
CREATE OR REPLACE FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_config JSONB;
  group_arr JSONB;
  canonical_phase INTEGER;
  conflict_count INTEGER;
BEGIN
  -- Treat SQL NULL and JSON null alike: both mean "no merging".
  v_config := CASE
    WHEN p_phase_groups IS NULL OR jsonb_typeof(p_phase_groups) = 'null' THEN '[]'::jsonb
    ELSE p_phase_groups
  END;

  -- Save the config. Store SQL NULL (not JSON null) when merging is cleared,
  -- matching what the route used to write directly.
  UPDATE expansions
  SET phase_groups = CASE
    WHEN p_phase_groups IS NULL OR jsonb_typeof(p_phase_groups) = 'null' THEN NULL
    ELSE p_phase_groups
  END
  WHERE id = p_expansion_id AND guild_id = p_guild_id;

  -- ---------------------------------------------------------------------
  -- Restore pass. A migrated submission goes home as soon as its current
  -- phase and its origin are no longer grouped together — whether the config
  -- was cleared entirely, the group was narrowed, or the phases were
  -- reshuffled into different groups.
  -- ---------------------------------------------------------------------
  UPDATE loot_submissions s
  SET phase = s.original_phase,
      original_phase = NULL
  WHERE s.expansion_id = p_expansion_id
    AND s.guild_id = p_guild_id
    AND s.original_phase IS NOT NULL
    AND s.phase IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_config) AS g(item)
      WHERE g.item @> to_jsonb(s.phase)
        AND g.item @> to_jsonb(s.original_phase)
    )
    -- Don't send a list back to a phase that no longer has any tier: it would
    -- be just as invisible there as it is now, and the canonical phase it
    -- currently sits on is at least real.
    AND EXISTS (
      SELECT 1 FROM raid_tiers rt
      WHERE rt.expansion_id = p_expansion_id
        AND rt.phase = s.original_phase
    );

  -- ---------------------------------------------------------------------
  -- Merge pass (unchanged semantics, now recording where each row came from).
  -- ---------------------------------------------------------------------
  FOR group_arr IN SELECT jsonb_array_elements(p_merged_groups)
  LOOP
    -- Canonical phase = min in group
    SELECT MIN(value::INTEGER) INTO canonical_phase
    FROM jsonb_array_elements_text(group_arr);

    -- Check for conflicts one more time (within transaction)
    SELECT COUNT(*) INTO conflict_count
    FROM (
      SELECT character_id
      FROM loot_submissions
      WHERE expansion_id = p_expansion_id
        AND guild_id = p_guild_id
        AND phase IN (SELECT (value::INTEGER) FROM jsonb_array_elements_text(group_arr))
      GROUP BY character_id
      HAVING COUNT(DISTINCT phase) > 1
    ) conflicts;

    IF conflict_count > 0 THEN
      RAISE EXCEPTION 'CONFLICT: % characters have submissions in multiple phases being merged', conflict_count;
    END IF;

    -- Migrate non-canonical phases to canonical, remembering the origin.
    -- COALESCE keeps the FIRST origin across successive merges.
    UPDATE loot_submissions
    SET phase = canonical_phase,
        original_phase = COALESCE(original_phase, phase)
    WHERE expansion_id = p_expansion_id
      AND guild_id = p_guild_id
      AND phase IN (SELECT (value::INTEGER) FROM jsonb_array_elements_text(group_arr))
      AND phase != canonical_phase;
  END LOOP;

  RETURN p_phase_groups;
END;
$$;

ALTER FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."merge_phase_groups"("p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb") FROM "anon", "authenticated";
