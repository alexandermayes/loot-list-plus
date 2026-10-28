-- Lock awarded loot list ranks for the rest of the tier (quick task 261028-0gx).
--
-- Problem
-- -------
-- Officers asked that once a raider receives an item that sits on their
-- approved loot list, the rank it sat in stays with that item for the rest
-- of the raid tier, so the received item cannot be moved down to lift
-- another item into the rank its Loot Score came from. Lists are saved
-- through save_submission_items, which deletes every live row of the list
-- and inserts the payload, so a marker on loot_submission_items would not
-- survive a save.
--
-- Fix
-- ---
-- A new table, loot_list_slot_locks, holds one row per locking award: the
-- list, the character, the item, the rank and slot it held and the
-- loot_history row that caused it. A lock is live while released_at is
-- null, and a partial unique index allows one live lock per rank and slot.
-- guild_settings.award_slot_lock_enabled (default false) turns locking on
-- per guild. save_submission_items keeps its ownership check (character
-- owner, legacy user_id or guild officer), its delete of live rows and its
-- insert (removed rows keep their position, GH #354), then refuses the save
-- with SQLSTATE 23514 and the message Rank N is locked to the item name when
-- a live lock no longer finds its item, live, at its rank and slot. The
-- awarded item keeps its allocation cost in its bracket, so the bracket
-- points it used stay spent without a ledger.
--
-- Readers and writers checked
-- ---------------------------
-- Writers, all through the service role: lib/loot/slot-locks.ts creates
-- locks after an award from POST /api/loot-history/bulk, the addon
-- loot-award route and the addon import-string route, and releases them
-- from remove-item (an officer removing the item) and the bulk PATCH (an
-- award moved to another raider). Undoing an award (bulk DELETE) removes
-- its lock through the cascade from loot_history, and deleting a list, an
-- item or a guild cascades the same way. Readers: GET /api/loot-submissions,
-- /api/loot-list/bootstrap, submit, revert and remove-item (service role),
-- the officer review page (a browser session, through the SELECT policy)
-- and save_submission_items (SECURITY DEFINER).
-- Access: RLS on, one SELECT policy that mirrors loot_submission_items_select
-- (an active member of the list guild), SELECT granted to authenticated
-- only, no insert, update or delete for anon or authenticated, and an
-- explicit GRANT ALL to service_role. The baseline default privileges grant
-- every new public table to anon and authenticated, which is why the REVOKE
-- comes first. Every guild_settings reader that selects all columns (the
-- guild-settings route, the addon guild-data and export-string payloads,
-- the sheet import and the dashboard cache) gains one boolean key.
--
-- Production safety
-- -----------------
-- SET LOCAL lock_timeout gives up after 5 seconds instead of queueing, and
-- a timeout rolls the whole file back so the next deploy runs it again. The
-- table is new and empty. The guild_settings column has a constant default,
-- a metadata change with no table rewrite. CREATE OR REPLACE FUNCTION keeps
-- the owner and grants, which the file restates anyway (REVOKE from PUBLIC
-- and anon, EXECUTE for authenticated and service_role, as in
-- 20260930000200). Until the code PR ships and a guild turns the setting on,
-- the table stays empty and every save behaves exactly as before. Every
-- statement is re-runnable.
--
-- Deploy
-- ------
-- Migration-only PR, merged with --admin on a non-raid day, deployed about
-- 12 seconds after merge. The feat/award-slot-lock code PR merges only after
-- this is live, because its routes read loot_list_slot_locks.
--
-- Not changed
-- -----------
-- loot_submission_items, its policies and triggers (the status and need
-- ranking triggers still fire inside the function), loot_history, every
-- other function and grant, and the Loot Score engine.
--
-- Rollback
-- --------
-- Revert the code PR first. Then restore the previous function body by
-- running the CREATE OR REPLACE FUNCTION statement of 20260727000001 again,
-- and after it:
--
--   DROP TABLE IF EXISTS "public"."loot_list_slot_locks";
--   ALTER TABLE "public"."guild_settings" DROP COLUMN IF EXISTS "award_slot_lock_enabled";
--
-- Every lock and the setting are lost, so a later re-apply starts unlocked.

SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS "public"."loot_list_slot_locks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "character_id" "uuid" NOT NULL,
    "loot_item_id" "uuid" NOT NULL,
    "rank" integer NOT NULL,
    "slot" integer NOT NULL,
    "loot_history_id" "uuid" NOT NULL,
    "locked_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "released_at" timestamp with time zone,
    "released_by" "uuid",
    "release_reason" "text",
    CONSTRAINT "loot_list_slot_locks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loot_list_slot_locks_loot_history_id_key" UNIQUE ("loot_history_id"),
    CONSTRAINT "loot_list_slot_locks_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_list_slot_locks_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."loot_submissions"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_list_slot_locks_loot_item_id_fkey" FOREIGN KEY ("loot_item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_list_slot_locks_loot_history_id_fkey" FOREIGN KEY ("loot_history_id") REFERENCES "public"."loot_history"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_list_slot_locks_rank_check" CHECK ("rank" BETWEEN 1 AND 50),
    CONSTRAINT "loot_list_slot_locks_slot_check" CHECK ("slot" >= 1),
    CONSTRAINT "loot_list_slot_locks_release_reason_check" CHECK ("release_reason" IN ('removed_by_officer', 'award_reassigned')),
    CONSTRAINT "loot_list_slot_locks_release_shape_check" CHECK (("released_at" IS NULL) = ("release_reason" IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_list_slot_locks_live_position" ON "public"."loot_list_slot_locks" USING "btree" ("submission_id", "rank", "slot") WHERE ("released_at" IS NULL);

CREATE INDEX IF NOT EXISTS "idx_loot_list_slot_locks_live_submission" ON "public"."loot_list_slot_locks" USING "btree" ("submission_id") WHERE ("released_at" IS NULL);

ALTER TABLE "public"."loot_list_slot_locks" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "loot_list_slot_locks_select" ON "public"."loot_list_slot_locks";

CREATE POLICY "loot_list_slot_locks_select" ON "public"."loot_list_slot_locks" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."loot_submissions" "ls"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."guild_id" = "ls"."guild_id")))
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("ls"."id" = "loot_list_slot_locks"."submission_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))));

REVOKE ALL ON TABLE "public"."loot_list_slot_locks" FROM PUBLIC, "anon", "authenticated";

GRANT SELECT ON TABLE "public"."loot_list_slot_locks" TO "authenticated";

GRANT ALL ON TABLE "public"."loot_list_slot_locks" TO "service_role";

COMMENT ON TABLE "public"."loot_list_slot_locks" IS 'Award slot locks: the rank and slot an awarded item held on an approved loot list, locked to that item for the rest of the tier while released_at is null. Written only by the server through the service role, readable by active members of the list guild, enforced by save_submission_items.';

ALTER TABLE "public"."guild_settings" ADD COLUMN IF NOT EXISTS "award_slot_lock_enabled" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."guild_settings"."award_slot_lock_enabled" IS 'When true, an item awarded from a raider approved loot list locks the rank and slot it held for the rest of the tier (loot_list_slot_locks). Off by default.';

CREATE OR REPLACE FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  item_count INTEGER;
  broken_lock RECORD;
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

  -- Award slot locks: every live lock must still find its item, live, at its
  -- rank and slot. The RAISE rolls back the delete and insert above.
  SELECT l.rank, COALESCE(li.name, 'an awarded item') AS item_name
    INTO broken_lock
    FROM loot_list_slot_locks l
    LEFT JOIN loot_items li ON li.id = l.loot_item_id
   WHERE l.submission_id = p_submission_id
     AND l.released_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM loot_submission_items si
        WHERE si.submission_id = l.submission_id
          AND si.rank = l.rank
          AND si.slot = l.slot
          AND si.loot_item_id = l.loot_item_id
          AND si.removed_at IS NULL
     )
   ORDER BY l.rank DESC, l.slot ASC
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Rank % is locked to %', broken_lock.rank, broken_lock.item_name
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN item_count;
END;
$$;

ALTER FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") TO "authenticated", "service_role";

COMMENT ON FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb") IS 'Replaces the live items of one loot list for its character owner or a guild officer. Refuses, with SQLSTATE 23514 and the message Rank N is locked to the item name, a save that moves, replaces or drops an item from a rank and slot held by a live loot_list_slot_locks row.';
