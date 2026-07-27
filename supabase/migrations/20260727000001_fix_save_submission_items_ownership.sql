-- Fix save_submission_items ownership check (regression from 20260722000001).
--
-- Problem
-- -------
-- The auth guard added to save_submission_items authorizes on
-- `s.user_id = auth.uid()`, but loot_submissions.user_id is never populated: the
-- column is nullable with no default, no trigger fills it, and the upsert that
-- creates every row (app/contexts/LootListContext.tsx) writes only character_id,
-- guild_id, expansion_id, phase and status.
--
-- Ownership is modelled through character_id -> characters.user_id, which is what
-- every live RLS policy on the table uses (loot_submissions_select,
-- loot_submissions_update, loot_submission_items_*). The guard mirrored the legacy
-- "Users can create/update own submissions" policies instead, which are leftovers
-- from an older user_id-based model.
--
-- So the owner branch evaluated to NULL for every row and only is_guild_officer()
-- could pass: officers kept working while raiders got
-- 'Not authorized to modify this submission' on both manual save/submit and
-- autosave, i.e. non-officers could no longer save or submit their loot list.
--
-- Fix: authorize on the character's owner (keeping the s.user_id branch for any
-- legacy row that does carry it) or an officer of the guild. The function is
-- SECURITY DEFINER and runs as the owner, so the join on characters is not
-- filtered by that table's RLS. The hardening is unchanged: anon stays revoked and
-- an anonymous caller (auth.uid() IS NULL) still matches no branch.

CREATE OR REPLACE FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  item_count INTEGER;
BEGIN
  -- Authorize: caller must own the submission's character (or the legacy user_id),
  -- or be an officer of its guild.
  IF NOT EXISTS (
    SELECT 1 FROM loot_submissions s
    LEFT JOIN characters c ON c.id = s.character_id
    WHERE s.id = p_submission_id
      AND (
        c.user_id = auth.uid()
        OR s.user_id = auth.uid()
        OR public.is_guild_officer(s.guild_id)
      )
  ) THEN
    RAISE EXCEPTION 'Not authorized to modify this submission';
  END IF;

  -- Delete existing active items (preserve soft-deleted/removed items)
  DELETE FROM loot_submission_items
  WHERE submission_id = p_submission_id
    AND removed_at IS NULL;

  -- Insert new items
  INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot)
  SELECT
    p_submission_id,
    (item->>'loot_item_id')::UUID,
    (item->>'rank')::INTEGER,
    (item->>'slot')::INTEGER
  FROM jsonb_array_elements(p_items) AS item;

  GET DIAGNOSTICS item_count = ROW_COUNT;
  RETURN item_count;
END;
$$;

ALTER FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";
REVOKE ALL ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") FROM "anon";
