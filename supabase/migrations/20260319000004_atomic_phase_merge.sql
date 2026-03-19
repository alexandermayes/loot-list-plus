-- Atomic phase merge: save config + migrate submissions in one transaction.
-- Prevents TOCTOU race where a new submission is created between
-- the conflict check and the migration.

CREATE OR REPLACE FUNCTION merge_phase_groups(
  p_expansion_id UUID,
  p_guild_id UUID,
  p_phase_groups JSONB, -- The new phase_groups config (array of arrays)
  p_merged_groups JSONB -- Only the groups with length > 1 (for migration)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_arr JSONB;
  canonical_phase INTEGER;
  other_phase INTEGER;
  conflict_count INTEGER;
BEGIN
  -- Save the config
  UPDATE expansions
  SET phase_groups = p_phase_groups
  WHERE id = p_expansion_id AND guild_id = p_guild_id;

  -- Migrate submissions for each merged group
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

    -- Migrate non-canonical phases to canonical
    UPDATE loot_submissions
    SET phase = canonical_phase
    WHERE expansion_id = p_expansion_id
      AND guild_id = p_guild_id
      AND phase IN (SELECT (value::INTEGER) FROM jsonb_array_elements_text(group_arr))
      AND phase != canonical_phase;
  END LOOP;

  RETURN p_phase_groups;
END;
$$;
