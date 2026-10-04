-- Deleting a guild removes its reserve runs and keeps expansions still used outside the guild.
--
-- Problem
-- -------
-- delete_guild deleted a guild's expansions (which cascades to its raid
-- tiers and loot items) before deleting the guild row. Three references
-- from reserve_runs and reserve_awards to that catalog have no ON DELETE
-- action, so any reserve run that used the guild's raid tiers or expansion,
-- including a run owned by the guild being deleted, stopped the whole call
-- with a foreign key error. Several other tables (raid events, loot
-- history, loot lists and their items, item priorities, loot deadlines,
-- another guild's active expansion pointer) also reference a guild's
-- catalog, and the cascade from deleting that catalog removed or cleared
-- those rows of other guilds without any error. A run with no guild, or a
-- run created for another guild, can end up pointing at this guild's raid
-- tiers because reserve runs created with no guild take the first
-- expansion matching the requested name from any guild, and the run create
-- route stores the submitted expansion and raid tier ids without checking
-- they belong to the caller's guild.
--
-- Fix
-- ---
-- delete_guild now deletes the guild's own reserve runs (their
-- submissions, awards and audit rows go with them through their foreign
-- keys) before it touches the guild's expansions. It then keeps, detached
-- from the guild (guild_id set to NULL), any expansion that a row outside
-- the guild still references through its raid tiers or loot items, instead
-- of deleting it. The existing expansions delete then only removes the
-- expansions nothing outside the guild still needs, which cascades to
-- their raid tiers and loot items exactly as before.
--
-- Expansions used outside the guild
-- ----------------------------------
-- The keep check covers every reference from a row outside the guild (a
-- different guild, or no guild at all) to one of the guild's expansions,
-- raid tiers or loot items: reserve runs and their awards, raid events,
-- loot history, BLP tracking and credits, loot lists and their items, item
-- priorities, loot deadlines, and another guild's active expansion
-- pointer. A row with no guild counts as outside. A kept expansion is
-- detached rather than deleted or re-pointed at another guild's copy,
-- because every guild has its own copy of the expansion catalog and
-- detaching keeps every id the outside rows point at, with no foreign key
-- change and no rewrite of another guild's data. The expansion, its raid
-- tiers and its loot items stay readable exactly as before. The deleted
-- guild's officer notes are free text written by that guild's own
-- officers, so they are cleared from any kept loot item, while the item's
-- other columns are unchanged.
--
-- Callers checked
-- ----------------
-- Only the guild master (the creator, or a member whose guild role
-- position is at least 100) may call delete_guild, and everyone else gets
-- the existing error. anon has no EXECUTE grant.
--
-- Production safety
-- ------------------
-- One call is one statement in one transaction, and any error rolls back every
-- statement the function ran, including the new ones. SET LOCAL
-- lock_timeout keeps the deploy from queueing behind a long-running
-- statement. Every statement here is idempotent, so re-running this file is
-- safe.
--
-- Not changed
-- ------------
-- The guard, the function signature, LANGUAGE, SECURITY DEFINER,
-- search_path, the owner and the EXECUTE grants are unchanged. Every other
-- statement of the function, their order, and the RAISE text are
-- unchanged. No foreign key, trigger, policy or other function changes.
--
-- Deploy
-- -------
-- One migration-only PR. Merge order: this file sorts after the migrations
-- of two other quick tasks that fix related reserve run rules, so it
-- should merge after both of their PRs, though scripts/deploy-migrations.sh
-- applies every unrecorded file in timestamp order regardless.
--
-- Rollback
-- --------
-- A forward migration with the statements below restores the previous
-- function and its grants. An expansion already detached by a delete made
-- under this version stays detached, and no other data changes either way.
--   CREATE OR REPLACE FUNCTION "public"."delete_guild"("p_guild_id" "uuid") RETURNS "void"
--       LANGUAGE "plpgsql" SECURITY DEFINER
--       SET "search_path" TO 'public', 'pg_temp'
--       AS $$
--   BEGIN
--     -- Only the guild master (creator or a role at position >= 100) may delete.
--     IF NOT public.is_guild_master(p_guild_id) THEN
--       RAISE EXCEPTION 'Only the guild master can delete this guild';
--     END IF;
--     -- Delete in dependency order
--     DELETE FROM loot_submission_items WHERE submission_id IN (
--       SELECT id FROM loot_submissions WHERE guild_id = p_guild_id
--     );
--     DELETE FROM loot_submissions WHERE guild_id = p_guild_id;
--     DELETE FROM loot_history WHERE guild_id = p_guild_id;
--     DELETE FROM attendance_records WHERE raid_event_id IN (
--       SELECT id FROM raid_events WHERE guild_id = p_guild_id
--     );
--     DELETE FROM raid_events WHERE guild_id = p_guild_id;
--     DELETE FROM character_guild_memberships WHERE guild_id = p_guild_id;
--     DELETE FROM guild_invite_codes WHERE guild_id = p_guild_id;
--     DELETE FROM guild_settings WHERE guild_id = p_guild_id;
--     DELETE FROM guild_roles WHERE guild_id = p_guild_id;
--     DELETE FROM audit_logs WHERE guild_id = p_guild_id;
--     DELETE FROM blp_tracking WHERE guild_id = p_guild_id;
--     DELETE FROM character_aliases WHERE guild_id = p_guild_id;
--     DELETE FROM guild_item_priorities WHERE guild_id = p_guild_id;
--     -- Clear active guild references
--     UPDATE user_active_characters
--     SET active_guild_id = NULL
--     WHERE active_guild_id = p_guild_id;
--     -- Delete raid teams and members
--     DELETE FROM raid_team_members WHERE raid_team_id IN (
--       SELECT id FROM raid_teams WHERE guild_id = p_guild_id
--     );
--     DELETE FROM raid_teams WHERE guild_id = p_guild_id;
--     -- Delete expansions
--     DELETE FROM expansions WHERE guild_id = p_guild_id;
--     -- Finally delete the guild
--     DELETE FROM guilds WHERE id = p_guild_id;
--   END;
--   $$;
--   REVOKE ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") FROM PUBLIC, "anon";
--   GRANT EXECUTE ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") TO "authenticated", "service_role";

SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION "public"."delete_guild"("p_guild_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_kept uuid[];
BEGIN
  -- Only the guild master (creator or a role at position >= 100) may delete.
  IF NOT public.is_guild_master(p_guild_id) THEN
    RAISE EXCEPTION 'Only the guild master can delete this guild';
  END IF;

  -- Delete in dependency order
  DELETE FROM loot_submission_items WHERE submission_id IN (
    SELECT id FROM loot_submissions WHERE guild_id = p_guild_id
  );
  DELETE FROM loot_submissions WHERE guild_id = p_guild_id;
  DELETE FROM loot_history WHERE guild_id = p_guild_id;
  DELETE FROM attendance_records WHERE raid_event_id IN (
    SELECT id FROM raid_events WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_events WHERE guild_id = p_guild_id;
  DELETE FROM character_guild_memberships WHERE guild_id = p_guild_id;
  DELETE FROM guild_invite_codes WHERE guild_id = p_guild_id;
  DELETE FROM guild_settings WHERE guild_id = p_guild_id;
  DELETE FROM guild_roles WHERE guild_id = p_guild_id;
  DELETE FROM audit_logs WHERE guild_id = p_guild_id;
  DELETE FROM blp_tracking WHERE guild_id = p_guild_id;
  DELETE FROM character_aliases WHERE guild_id = p_guild_id;
  DELETE FROM guild_item_priorities WHERE guild_id = p_guild_id;

  -- Clear active guild references
  UPDATE user_active_characters
  SET active_guild_id = NULL
  WHERE active_guild_id = p_guild_id;

  -- Delete reserve runs. Their submissions, awards and audit rows go with them.
  DELETE FROM reserve_runs WHERE guild_id = p_guild_id;

  -- Keep an expansion, with its raid tiers and loot items, detached from
  -- this guild (rather than deleted) while a row outside this guild still
  -- uses it.
  SELECT coalesce(array_agg(e.id), '{}') INTO v_kept
  FROM expansions e
  WHERE e.guild_id = p_guild_id
    AND (
      EXISTS (SELECT 1 FROM reserve_runs r
              WHERE r.guild_id IS DISTINCT FROM p_guild_id
                AND (r.expansion_id = e.id
                     OR r.raid_tier_id IN (SELECT rt.id FROM raid_tiers rt WHERE rt.expansion_id = e.id)))
      OR EXISTS (SELECT 1 FROM reserve_awards a
                 JOIN reserve_runs r ON r.id = a.reserve_run_id
                 JOIN loot_items li ON li.id = a.loot_item_id
                 JOIN raid_tiers rt ON rt.id = li.raid_tier_id
                 WHERE rt.expansion_id = e.id AND r.guild_id IS DISTINCT FROM p_guild_id)
      OR EXISTS (SELECT 1 FROM raid_events re
                 JOIN raid_tiers rt ON rt.id = re.raid_tier_id
                 WHERE rt.expansion_id = e.id AND re.guild_id IS DISTINCT FROM p_guild_id)
      OR EXISTS (SELECT 1 FROM loot_history lh
                 WHERE lh.guild_id IS DISTINCT FROM p_guild_id
                   AND (lh.expansion_id = e.id
                        OR lh.raid_tier_id IN (SELECT rt.id FROM raid_tiers rt WHERE rt.expansion_id = e.id)
                        OR lh.loot_item_id IN (SELECT li.id FROM loot_items li JOIN raid_tiers rt ON rt.id = li.raid_tier_id WHERE rt.expansion_id = e.id)))
      OR EXISTS (SELECT 1 FROM blp_tracking bt
                 WHERE bt.guild_id IS DISTINCT FROM p_guild_id
                   AND (bt.expansion_id = e.id
                        OR bt.loot_item_id IN (SELECT li.id FROM loot_items li JOIN raid_tiers rt ON rt.id = li.raid_tier_id WHERE rt.expansion_id = e.id)))
      OR EXISTS (SELECT 1 FROM blp_credits bc
                 WHERE bc.guild_id IS DISTINCT FROM p_guild_id
                   AND (bc.expansion_id = e.id
                        OR bc.loot_item_id IN (SELECT li.id FROM loot_items li JOIN raid_tiers rt ON rt.id = li.raid_tier_id WHERE rt.expansion_id = e.id)))
      OR EXISTS (SELECT 1 FROM loot_submissions s
                 WHERE s.guild_id IS DISTINCT FROM p_guild_id
                   AND (s.expansion_id = e.id
                        OR s.raid_tier_id IN (SELECT rt.id FROM raid_tiers rt WHERE rt.expansion_id = e.id)))
      OR EXISTS (SELECT 1 FROM loot_submission_items si
                 JOIN loot_submissions s ON s.id = si.submission_id
                 JOIN loot_items li ON li.id = si.loot_item_id
                 JOIN raid_tiers rt ON rt.id = li.raid_tier_id
                 WHERE rt.expansion_id = e.id AND s.guild_id IS DISTINCT FROM p_guild_id)
      OR EXISTS (SELECT 1 FROM guild_item_priorities gp
                 WHERE gp.guild_id IS DISTINCT FROM p_guild_id
                   AND (gp.raid_tier_id IN (SELECT rt.id FROM raid_tiers rt WHERE rt.expansion_id = e.id)
                        OR gp.item_id IN (SELECT li.id FROM loot_items li JOIN raid_tiers rt ON rt.id = li.raid_tier_id WHERE rt.expansion_id = e.id)))
      OR EXISTS (SELECT 1 FROM loot_deadlines ld
                 WHERE ld.guild_id IS DISTINCT FROM p_guild_id
                   AND ld.raid_tier_id IN (SELECT rt.id FROM raid_tiers rt WHERE rt.expansion_id = e.id))
      OR EXISTS (SELECT 1 FROM guilds og
                 WHERE og.id <> p_guild_id AND og.active_expansion_id = e.id)
    );
  -- The deleted guild's officer notes on a kept item are this guild's own
  -- free text; clear them so nothing of the deleted guild's officers lingers.
  UPDATE loot_items li SET officer_notes = NULL
  FROM raid_tiers rt
  WHERE rt.id = li.raid_tier_id AND rt.expansion_id = ANY (v_kept) AND li.officer_notes IS NOT NULL;
  UPDATE expansions SET guild_id = NULL WHERE id = ANY (v_kept);

  -- Delete raid teams and members
  DELETE FROM raid_team_members WHERE raid_team_id IN (
    SELECT id FROM raid_teams WHERE guild_id = p_guild_id
  );
  DELETE FROM raid_teams WHERE guild_id = p_guild_id;

  -- Delete expansions
  DELETE FROM expansions WHERE guild_id = p_guild_id;

  -- Finally delete the guild
  DELETE FROM guilds WHERE id = p_guild_id;
END;
$$;

REVOKE ALL ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") FROM PUBLIC, "anon";
GRANT EXECUTE ON FUNCTION "public"."delete_guild"("p_guild_id" "uuid") TO "authenticated", "service_role";
