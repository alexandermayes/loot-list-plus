-- Discovery lists: the schema for raid tiers that run on generic needs.
--
-- Problem
-- -------
-- A Forever guild starts a raid tier without knowing any item. The tier has
-- to run in a Discovery mode where raiders rank generic needs ("Trinket,
-- healing") instead of items, and each need has to be a normal loot_items row
-- so submissions, approval, the master sheet, exports and bad luck protection
-- keep working on a loot_item_id. Every tier and item that exists today has to
-- stay exactly as it is. This is DISC-01, DISC-06, DISC-07 and DISC-12 of the
-- Forever milestone (decisions D-00b to D-00d, D-12, D-15, D-17, D-22, D-24,
-- D-26 and D-27 of phase 3).
--
-- Fix
-- ---
-- raid_tiers.list_mode ('known' or 'discovery', default 'known'). loot_items.kind
-- ('item' or 'need', default 'item') and loot_items.need_key (set only on need
-- rows, unique per raid tier). loot_history.awarded_item_id, a plain nullable
-- uuid that stays null until the Drop Desk writes it. The loot_item_need_pins
-- table, where an officer pins a need to the real item it stands for, with RLS,
-- an integrity trigger and no UPDATE policy. A column grant so browser sessions
-- can read kind and need_key. Seven trigger functions and ten triggers (the
-- pin integrity trigger and nine guards), described next.
--
-- Guards on existing tables
-- -------------------------
-- Officers hold direct PostgREST write rights on raid_tiers, loot_items and
-- expansions, and raiders can insert loot_submission_items directly, so the
-- checks in the API routes alone can be bypassed. The guards below close each
-- bypass in the database, and each one is WHEN gated, so a write that does not
-- touch Discovery never calls a guard function.
--
--   D-17 and D-03, raid_tiers: enforce_raid_tier_list_mode_rules, called by
--   enforce_raid_tier_discovery_forever_only (a tier can be in Discovery only
--   when its expansion is named Forever, for every role) and
--   enforce_raid_tier_known_switch (a tier cannot leave Discovery while a need
--   row of the tier is ranked or awarded, the removed rankings included).
--
--   D-12 and D-17, loot_items: enforce_loot_item_need_rules, called by
--   enforce_loot_item_need_rules_insert and enforce_loot_item_need_rules_update.
--   A browser session never inserts, changes or converts a need row, because
--   need rows come only from the service role seeder. For every role a need row
--   sits only in a tier of an expansion named Forever whose list_mode is
--   discovery.
--
--   D-22, loot_submission_items: enforce_need_ranking_hold. Until the need
--   picker ships, a browser session cannot rank a need. The role setting
--   survives SECURITY DEFINER, so save_submission_items is covered without
--   editing it. It is client only like enforce_loot_submission_item_rules:
--   the service role and migrations are trusted, and test fixtures must be
--   able to rank a need. Phase 4 removes the hold with DROP TRIGGER and DROP
--   FUNCTION.
--
--   D-24, expansions: enforce_expansion_forever_name_lock, called by
--   enforce_expansion_forever_name_insert and enforce_expansion_forever_name_update.
--   The name Forever is the stored identity every Forever rule keys on, the
--   D-17 trigger among them. An officer could otherwise insert an expansion
--   named Forever, or rename one to or from Forever, directly or through
--   create_expansion_for_guild, and so reach Discovery on a legacy tier or
--   strand Discovery tiers under a non-Forever expansion. A browser session is
--   refused. Every app write to expansions runs on the service role, which the
--   lock does not check.
--
--   D-26, raid_tiers: enforce_raid_tier_expansion_lock. The D-17 trigger is
--   gated on list_mode, so an officer could move a Known tier into the guild's
--   Forever expansion with a plain UPDATE of expansion_id and then switch it to
--   Discovery. A browser session can no longer change a tier's expansion. No
--   app path changes raid_tiers.expansion_id, so the lock changes no app path.
--
--   D-27, loot_items: enforce_loot_item_need_delete_lock. Officers hold DELETE
--   on loot_items through the loot_items_delete policy, and a delete cascades
--   to rankings, awards, bad luck protection rows and pins, so one direct
--   delete of a need row would silently drop all of them. A browser session
--   cannot delete a need row with a statement that names loot_items itself. A
--   delete that cascades from a deleted raid tier, expansion or guild is not a
--   direct delete and passes, because delete_guild runs as the signed in
--   guild master. Item rows are untouched by the lock.
--
-- The three locks (D-24, D-26, D-27) read no table, so they run with invoker
-- rights. The four functions that read tables are SECURITY DEFINER. All seven
-- pin search_path and have EXECUTE revoked from PUBLIC, anon and authenticated.
-- Lifting D-17 means replacing enforce_raid_tier_list_mode_rules and editing
-- canSwitchToDiscovery together.
--
-- Readers and writers checked
-- ---------------------------
-- Browser sessions read loot_items through a column grant, so the two new
-- columns need their own grant (below); officer_notes stays unreadable. Every
-- reader of loot_items gets a Discovery branch in the code PRs that follow, and
-- plan 03-12 audits them. The bad luck protection functions key on
-- loot_item_id, so they work on a need row unchanged. save_submission_items is
-- caught by the D-22 trigger and not edited. Every app insert of an expansions
-- row runs on the service role and no route writes expansions.name, so the D-24
-- lock changes no app path, and create_expansion_for_guild is caught by the
-- D-24 insert trigger and not edited. No app path and no SQL function writes
-- raid_tiers.expansion_id, so the D-26 lock changes no app path either. No app
-- path deletes loot_items rows, the scripts that delete catalog rows use the
-- service role key, and delete_guild reaches need rows only through the
-- expansions to raid_tiers to loot_items cascade, which the D-27 lock lets
-- through, so it changes no app path.
--
-- Error contract
-- --------------
-- Constraints: raid_tiers_list_mode_check, loot_items_kind_check and
-- loot_items_need_shape_check (23514), idx_loot_items_tier_need_key (23505).
-- Pins: loot_item_need_pins_guild_item_key (23505), loot_item_need_pins_distinct_check
-- (23514), and the trigger enforce_loot_item_need_pin_refs (23514 with a DETAIL,
-- or the row level security error 42501 for a session that is not an officer
-- of the guild). Guards: enforce_raid_tier_discovery_forever_only and
-- enforce_raid_tier_known_switch raise 23514 naming the tier id.
-- enforce_loot_item_need_rules raises 42501 for a browser session and 23514 for
-- a need row outside a Forever Discovery tier. enforce_need_ranking_hold raises
-- 23514. The three locks raise 42501 with a fixed message and no detail.
--
-- Production safety
-- -----------------
-- SET LOCAL lock_timeout gives up after 5 seconds instead of queueing, and a
-- timeout rolls the whole file back so the next deploy runs it again. The new
-- columns have constant defaults, which are a metadata change with no table
-- rewrite. Every existing row gets kind item and list_mode known, so no
-- existing row can fail a CHECK. CHECK constraints are added NOT VALID and then
-- validated. Every statement is re-runnable. Each CREATE TRIGGER takes a brief
-- SHARE ROW EXCLUSIVE lock on raid_tiers, loot_items, loot_submission_items or
-- expansions, which lock_timeout bounds. The file has no CONCURRENTLY because
-- the deploy script sends it as one batch.
--
-- Not changed
-- -----------
-- The bad luck protection functions, enforce_loot_history_guild_refs,
-- save_submission_items, create_expansion_for_guild, delete_guild and every
-- other existing function body. guild_settings (D-18, so the guild-data addon
-- payload keys stay unchanged). The loot_submission_items slot check. Every
-- existing policy. No data changes: the Forever flip and the need rows go
-- through the reviewed sync.
--
-- Why awarded_item_id has no foreign key yet
-- ------------------------------------------
-- loot_history already has loot_history_loot_item_id_fkey to loot_items. A
-- second foreign key to the same table makes every PostgREST embed between the
-- two tables ambiguous (PGRST201), and about ten readers embed loot_items from
-- loot_history today. Nothing writes the column in this phase. Phase 5 adds the
-- foreign key NOT VALID, then VALIDATE, when the Drop Desk becomes its first
-- writer and those embeds carry an explicit relationship hint.
--
-- Deploy
-- ------
-- One migration-only PR, merged with the admin merge override on a non-raid
-- day. It deploys about 12 seconds after merge. No code that reads the new
-- columns merges before the deploy is confirmed.
--
-- Rollback
-- --------
-- A forward migration. Drop the ten triggers and the seven functions first, then
-- the table. The new columns can be dropped only after the need rows, the
-- Discovery tiers and the pins are removed.
--
--   DROP TRIGGER IF EXISTS "enforce_loot_item_need_delete_lock" ON "public"."loot_items";
--   DROP TRIGGER IF EXISTS "enforce_raid_tier_expansion_lock" ON "public"."raid_tiers";
--   DROP TRIGGER IF EXISTS "enforce_expansion_forever_name_update" ON "public"."expansions";
--   DROP TRIGGER IF EXISTS "enforce_expansion_forever_name_insert" ON "public"."expansions";
--   DROP TRIGGER IF EXISTS "enforce_need_ranking_hold" ON "public"."loot_submission_items";
--   DROP TRIGGER IF EXISTS "enforce_loot_item_need_rules_update" ON "public"."loot_items";
--   DROP TRIGGER IF EXISTS "enforce_loot_item_need_rules_insert" ON "public"."loot_items";
--   DROP TRIGGER IF EXISTS "enforce_raid_tier_known_switch" ON "public"."raid_tiers";
--   DROP TRIGGER IF EXISTS "enforce_raid_tier_discovery_forever_only" ON "public"."raid_tiers";
--   DROP TRIGGER IF EXISTS "enforce_loot_item_need_pin_refs" ON "public"."loot_item_need_pins";
--   DROP FUNCTION IF EXISTS "public"."enforce_loot_item_need_delete_lock"();
--   DROP FUNCTION IF EXISTS "public"."enforce_raid_tier_expansion_lock"();
--   DROP FUNCTION IF EXISTS "public"."enforce_expansion_forever_name_lock"();
--   DROP FUNCTION IF EXISTS "public"."enforce_need_ranking_hold"();
--   DROP FUNCTION IF EXISTS "public"."enforce_loot_item_need_rules"();
--   DROP FUNCTION IF EXISTS "public"."enforce_raid_tier_list_mode_rules"();
--   DROP FUNCTION IF EXISTS "public"."enforce_loot_item_need_pin_refs"();
--   DROP TABLE IF EXISTS "public"."loot_item_need_pins";
--   REVOKE SELECT ("kind", "need_key") ON TABLE "public"."loot_items" FROM "anon", "authenticated";
--   ALTER TABLE "public"."loot_history" DROP COLUMN IF EXISTS "awarded_item_id";
--   ALTER TABLE "public"."loot_items" DROP COLUMN IF EXISTS "need_key", DROP COLUMN IF EXISTS "kind";
--   ALTER TABLE "public"."raid_tiers" DROP COLUMN IF EXISTS "list_mode";

SET LOCAL lock_timeout = '5s';

ALTER TABLE "public"."raid_tiers" ADD COLUMN IF NOT EXISTS "list_mode" "text" NOT NULL DEFAULT 'known';

ALTER TABLE "public"."raid_tiers" DROP CONSTRAINT IF EXISTS "raid_tiers_list_mode_check";

ALTER TABLE "public"."raid_tiers" ADD CONSTRAINT "raid_tiers_list_mode_check" CHECK (("list_mode" = ANY (ARRAY['known'::"text", 'discovery'::"text"]))) NOT VALID;

ALTER TABLE "public"."raid_tiers" VALIDATE CONSTRAINT "raid_tiers_list_mode_check";

COMMENT ON COLUMN "public"."raid_tiers"."list_mode" IS 'How raiders rank loot in this tier: known (items) or discovery (generic needs). Discovery is allowed only for tiers of an expansion named Forever, and a tier cannot leave it while a need of the tier is ranked or awarded. Existing tiers are known.';

ALTER TABLE "public"."loot_items" ADD COLUMN IF NOT EXISTS "kind" "text" NOT NULL DEFAULT 'item';

ALTER TABLE "public"."loot_items" ADD COLUMN IF NOT EXISTS "need_key" "text";

ALTER TABLE "public"."loot_items" DROP CONSTRAINT IF EXISTS "loot_items_kind_check";

ALTER TABLE "public"."loot_items" ADD CONSTRAINT "loot_items_kind_check" CHECK (("kind" = ANY (ARRAY['item'::"text", 'need'::"text"]))) NOT VALID;

ALTER TABLE "public"."loot_items" VALIDATE CONSTRAINT "loot_items_kind_check";

ALTER TABLE "public"."loot_items" DROP CONSTRAINT IF EXISTS "loot_items_need_shape_check";

ALTER TABLE "public"."loot_items" ADD CONSTRAINT "loot_items_need_shape_check" CHECK (((("kind" = 'need'::"text") AND ("need_key" IS NOT NULL) AND ("wowhead_id" IS NULL)) OR (("kind" = 'item'::"text") AND ("need_key" IS NULL)))) NOT VALID;

ALTER TABLE "public"."loot_items" VALIDATE CONSTRAINT "loot_items_need_shape_check";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_items_tier_need_key" ON "public"."loot_items" USING "btree" ("raid_tier_id", "need_key") WHERE ("kind" = 'need'::"text");

COMMENT ON COLUMN "public"."loot_items"."kind" IS 'item for a real catalog item, need for a generic Discovery need (a trigger lets only the server write need rows). Every row that existed before Discovery is item.';

COMMENT ON COLUMN "public"."loot_items"."need_key" IS 'Stable key of a need row, for example trinket.healing. Null on item rows, unique per raid tier on need rows.';

GRANT SELECT ("kind", "need_key") ON TABLE "public"."loot_items" TO "anon", "authenticated";

ALTER TABLE "public"."loot_history" ADD COLUMN IF NOT EXISTS "awarded_item_id" "uuid";

COMMENT ON COLUMN "public"."loot_history"."awarded_item_id" IS 'The real item a need award resolved to. Null until the Drop Desk writes it. Bad luck protection keys on loot_item_id, not on this column. No foreign key yet, see the header of the migration that added it.';

CREATE TABLE IF NOT EXISTS "public"."loot_item_need_pins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "need_id" "uuid" NOT NULL,
    "pinned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loot_item_need_pins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loot_item_need_pins_guild_item_key" UNIQUE ("guild_id", "item_id"),
    CONSTRAINT "loot_item_need_pins_distinct_check" CHECK ("item_id" <> "need_id"),
    CONSTRAINT "loot_item_need_pins_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_item_need_pins_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_item_need_pins_need_id_fkey" FOREIGN KEY ("need_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_item_need_pins_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "idx_loot_item_need_pins_need_id" ON "public"."loot_item_need_pins" USING "btree" ("need_id");

COMMENT ON TABLE "public"."loot_item_need_pins" IS 'An officer pins a real item to the generic need it stands for, once per guild and item. Both rows must be in the same raid tier and guild. Members read, officers insert and delete, nobody updates (unpin is a delete).';

ALTER TABLE "public"."loot_item_need_pins" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "public"."loot_item_need_pins" FROM PUBLIC, "anon", "authenticated";

GRANT SELECT, INSERT, DELETE ON TABLE "public"."loot_item_need_pins" TO "authenticated";

GRANT ALL ON TABLE "public"."loot_item_need_pins" TO "service_role";

DROP POLICY IF EXISTS "Guild members can view need pins" ON "public"."loot_item_need_pins";

CREATE POLICY "Guild members can view need pins" ON "public"."loot_item_need_pins" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "loot_item_need_pins"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR "public"."is_guild_officer"("guild_id")));

DROP POLICY IF EXISTS "Officers can insert need pins" ON "public"."loot_item_need_pins";

CREATE POLICY "Officers can insert need pins" ON "public"."loot_item_need_pins" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_guild_officer"("guild_id"));

DROP POLICY IF EXISTS "Officers can delete need pins" ON "public"."loot_item_need_pins";

CREATE POLICY "Officers can delete need pins" ON "public"."loot_item_need_pins" FOR DELETE TO "authenticated" USING ("public"."is_guild_officer"("guild_id"));

CREATE OR REPLACE FUNCTION "public"."enforce_loot_item_need_pin_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_item_kind text;
  v_item_tier uuid;
  v_item_guild uuid;
  v_need_kind text;
  v_need_tier uuid;
  v_need_guild uuid;
  v_error text;
  v_detail text;
BEGIN
  SELECT li.kind, li.raid_tier_id, e.guild_id
    INTO v_item_kind, v_item_tier, v_item_guild
  FROM public.loot_items li
  LEFT JOIN public.raid_tiers rt ON rt.id = li.raid_tier_id
  LEFT JOIN public.expansions e ON e.id = rt.expansion_id
  WHERE li.id = NEW.item_id;

  SELECT li.kind, li.raid_tier_id, e.guild_id
    INTO v_need_kind, v_need_tier, v_need_guild
  FROM public.loot_items li
  LEFT JOIN public.raid_tiers rt ON rt.id = li.raid_tier_id
  LEFT JOIN public.expansions e ON e.id = rt.expansion_id
  WHERE li.id = NEW.need_id;

  IF v_item_kind IS DISTINCT FROM 'item' THEN
    v_error := 'loot_item_need_pins.item_id is not an item row';
    v_detail := format('item_id %s', NEW.item_id);
  ELSIF v_need_kind IS DISTINCT FROM 'need' THEN
    v_error := 'loot_item_need_pins.need_id is not a need row';
    v_detail := format('need_id %s', NEW.need_id);
  ELSIF v_item_guild IS DISTINCT FROM NEW.guild_id THEN
    v_error := 'loot_item_need_pins.item_id is not an item of this guild';
    v_detail := format('item_id %s, guild_id %s', NEW.item_id, NEW.guild_id);
  ELSIF v_need_guild IS DISTINCT FROM NEW.guild_id THEN
    v_error := 'loot_item_need_pins.need_id is not a need of this guild';
    v_detail := format('need_id %s, guild_id %s', NEW.need_id, NEW.guild_id);
  ELSIF v_item_tier IS DISTINCT FROM v_need_tier THEN
    v_error := 'loot_item_need_pins.item_id and need_id are not in the same raid tier';
    v_detail := format('item_id %s, need_id %s', NEW.item_id, NEW.need_id);
  END IF;

  IF v_error IS NULL THEN
    RETURN NEW;
  END IF;

  -- A BEFORE trigger runs before the RLS WITH CHECK. A caller RLS would
  -- refuse anyway gets the error RLS gives, so the check reveals nothing
  -- about another guild's rows.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND NOT public.is_guild_officer(NEW.guild_id) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'new row violates row-level security policy for table "loot_item_need_pins"',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RAISE EXCEPTION USING MESSAGE = v_error, ERRCODE = 'check_violation', DETAIL = v_detail;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_loot_item_need_pin_refs"() IS 'Keeps a need pin pointing at an item row and a need row of its own guild and the same raid tier, for every role including service_role. When a check fails for an anon or authenticated caller who is not an officer of the guild, the RLS error is raised instead. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_loot_item_need_pin_refs"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_loot_item_need_pin_refs" BEFORE INSERT OR UPDATE OF "guild_id", "item_id", "need_id" ON "public"."loot_item_need_pins" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_loot_item_need_pin_refs"();

COMMENT ON TRIGGER "enforce_loot_item_need_pin_refs" ON "public"."loot_item_need_pins" IS 'Keeps need pins within one guild and one raid tier. See public.enforce_loot_item_need_pin_refs().';

CREATE OR REPLACE FUNCTION "public"."enforce_raid_tier_list_mode_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_expansion_name text;
BEGIN
  IF NEW.list_mode = 'discovery' THEN
    -- D-17: Discovery runs only on tiers of the Forever expansion.
    SELECT e.name INTO v_expansion_name
    FROM public.expansions e
    WHERE e.id = NEW.expansion_id;

    IF v_expansion_name IS DISTINCT FROM 'Forever' THEN
      RAISE EXCEPTION USING
        MESSAGE = 'raid_tiers.list_mode discovery is only allowed for Forever raid tiers',
        ERRCODE = 'check_violation',
        DETAIL = format('raid_tier_id %s, expansion_id %s', NEW.id, NEW.expansion_id);
    END IF;

    RETURN NEW;
  END IF;

  -- D-03: the tier is leaving Discovery. Removed rankings count, so a need a
  -- raider ranked and then dropped still blocks the switch.
  IF EXISTS (
    SELECT 1
    FROM public.loot_submission_items lsi
    JOIN public.loot_items li ON li.id = lsi.loot_item_id
    WHERE li.raid_tier_id = NEW.id AND li.kind = 'need'
  ) OR EXISTS (
    SELECT 1
    FROM public.loot_history lh
    JOIN public.loot_items li ON li.id = lh.loot_item_id
    WHERE li.raid_tier_id = NEW.id AND li.kind = 'need'
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'raid_tiers.list_mode cannot leave discovery while needs on the tier are ranked or awarded',
      ERRCODE = 'check_violation',
      DETAIL = format('raid_tier_id %s', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_raid_tier_list_mode_rules"() IS 'D-17 and D-03 for every role including service_role. Called by two WHEN gated triggers on raid_tiers: a tier in discovery must belong to an expansion named exactly Forever, and a tier cannot leave discovery while a loot submission item (removed or not) or a loot history row points at one of its need rows. Lifting D-17 means replacing this function and editing canSwitchToDiscovery together. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_raid_tier_list_mode_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_raid_tier_discovery_forever_only" BEFORE INSERT OR UPDATE OF "list_mode", "expansion_id" ON "public"."raid_tiers" FOR EACH ROW WHEN (NEW.list_mode = 'discovery') EXECUTE FUNCTION "public"."enforce_raid_tier_list_mode_rules"();

COMMENT ON TRIGGER "enforce_raid_tier_discovery_forever_only" ON "public"."raid_tiers" IS 'D-17: Discovery only on tiers of the Forever expansion. Runs only when the new list_mode is discovery. See public.enforce_raid_tier_list_mode_rules().';

CREATE OR REPLACE TRIGGER "enforce_raid_tier_known_switch" BEFORE UPDATE OF "list_mode" ON "public"."raid_tiers" FOR EACH ROW WHEN (OLD.list_mode = 'discovery' AND NEW.list_mode <> 'discovery') EXECUTE FUNCTION "public"."enforce_raid_tier_list_mode_rules"();

COMMENT ON TRIGGER "enforce_raid_tier_known_switch" ON "public"."raid_tiers" IS 'D-03: a tier leaves Discovery only with no ranked or awarded need. Runs only when list_mode leaves discovery. See public.enforce_raid_tier_list_mode_rules().';

CREATE OR REPLACE FUNCTION "public"."enforce_loot_item_need_rules"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_in_forever_discovery boolean;
BEGIN
  -- D-12: need rows come only from the service role seeder. A browser session
  -- is refused before any tier lookup, so the message reveals nothing.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'loot_items need rows are written only by the server',
      ERRCODE = 'insufficient_privilege';
  END IF;

  -- D-17: for every role a need row is placed only in a Forever Discovery tier.
  IF NEW.kind = 'need' AND (
    TG_OP = 'INSERT'
    OR NEW.raid_tier_id IS DISTINCT FROM OLD.raid_tier_id
    OR OLD.kind IS DISTINCT FROM 'need'
  ) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.raid_tiers rt
      JOIN public.expansions e ON e.id = rt.expansion_id
      WHERE rt.id = NEW.raid_tier_id
        AND rt.list_mode = 'discovery'
        AND e.name = 'Forever'
    ) INTO v_in_forever_discovery;

    IF NOT v_in_forever_discovery THEN
      RAISE EXCEPTION USING
        MESSAGE = 'loot_items need rows belong only to Forever raid tiers in Discovery mode',
        ERRCODE = 'check_violation',
        DETAIL = format('raid_tier_id %s', NEW.raid_tier_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_loot_item_need_rules"() IS 'D-12 and D-17. An anon or authenticated session never inserts, changes or converts a need row (need rows come only from the service role seeder). For every role a need row can be placed only in a tier of an expansion named Forever whose list_mode is discovery. Called by two WHEN gated triggers on loot_items, so item rows never reach it. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_loot_item_need_rules"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_loot_item_need_rules_insert" BEFORE INSERT ON "public"."loot_items" FOR EACH ROW WHEN (NEW.kind = 'need') EXECUTE FUNCTION "public"."enforce_loot_item_need_rules"();

COMMENT ON TRIGGER "enforce_loot_item_need_rules_insert" ON "public"."loot_items" IS 'D-12 and D-17 for an inserted need row. Never runs for an item row. See public.enforce_loot_item_need_rules().';

CREATE OR REPLACE TRIGGER "enforce_loot_item_need_rules_update" BEFORE UPDATE ON "public"."loot_items" FOR EACH ROW WHEN (OLD.kind = 'need' OR NEW.kind = 'need') EXECUTE FUNCTION "public"."enforce_loot_item_need_rules"();

COMMENT ON TRIGGER "enforce_loot_item_need_rules_update" ON "public"."loot_items" IS 'D-12 and D-17 for an update that touches a need row, including a conversion to or from need. Never runs for an update of an item row. See public.enforce_loot_item_need_rules().';

CREATE OR REPLACE FUNCTION "public"."enforce_need_ranking_hold"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Client only, like enforce_loot_submission_item_rules: the service role and
  -- migrations are trusted writers, and test fixtures must be able to rank a
  -- need. The role setting is unchanged inside a SECURITY DEFINER function, so
  -- save_submission_items is caught here without being edited.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND NEW.loot_item_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM public.loot_items li
       WHERE li.id = NEW.loot_item_id AND li.kind = 'need'
     ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'Need rows cannot be ranked yet',
      ERRCODE = 'check_violation',
      DETAIL = format('loot_item_id %s', NEW.loot_item_id);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_need_ranking_hold"() IS 'D-22: until the need picker ships, an anon or authenticated session cannot rank a need row, directly or through save_submission_items. Phase 4 drops this function and its trigger when the picker ships. Service role writers and migrations are not checked. SECURITY DEFINER with EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_need_ranking_hold"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_need_ranking_hold" BEFORE INSERT OR UPDATE OF "loot_item_id" ON "public"."loot_submission_items" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_need_ranking_hold"();

COMMENT ON TRIGGER "enforce_need_ranking_hold" ON "public"."loot_submission_items" IS 'D-22 hold on ranking need rows from a browser session. No WHEN clause because the need test needs a lookup. Dropped in Phase 4. See public.enforce_need_ranking_hold().';

CREATE OR REPLACE FUNCTION "public"."enforce_expansion_forever_name_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- Forever (FOREVER_EXPANSION_NAME) is the stored identity every Forever rule
  -- keys on, the D-17 trigger among them. The WHEN clauses limit this lock to a
  -- Forever insert and a rename to or from Forever, with the same exact match
  -- as the D-17 trigger, so another spelling gains nothing. The role setting
  -- survives SECURITY DEFINER, so create_expansion_for_guild is covered
  -- without being edited. The service role, the owner-run sync and migrations
  -- are trusted and not checked.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'expansions named Forever are created and renamed only by the server',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_expansion_forever_name_lock"() IS 'D-24: an anon or authenticated session cannot insert an expansion named Forever or rename one to or from Forever, directly or through create_expansion_for_guild. Called by two WHEN gated triggers on expansions. The service role and the owner-run sync are not checked. Invoker rights because it reads no table, EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_expansion_forever_name_lock"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_expansion_forever_name_insert" BEFORE INSERT ON "public"."expansions" FOR EACH ROW WHEN (NEW.name = 'Forever') EXECUTE FUNCTION "public"."enforce_expansion_forever_name_lock"();

COMMENT ON TRIGGER "enforce_expansion_forever_name_insert" ON "public"."expansions" IS 'D-24: browser sessions cannot insert an expansion named Forever. Runs only for that name. See public.enforce_expansion_forever_name_lock().';

CREATE OR REPLACE TRIGGER "enforce_expansion_forever_name_update" BEFORE UPDATE OF "name" ON "public"."expansions" FOR EACH ROW WHEN (OLD.name IS DISTINCT FROM NEW.name AND (OLD.name = 'Forever' OR NEW.name = 'Forever')) EXECUTE FUNCTION "public"."enforce_expansion_forever_name_lock"();

COMMENT ON TRIGGER "enforce_expansion_forever_name_update" ON "public"."expansions" IS 'D-24: browser sessions cannot rename an expansion to or from Forever. Runs only for such a rename. See public.enforce_expansion_forever_name_lock().';

CREATE OR REPLACE FUNCTION "public"."enforce_raid_tier_expansion_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- A tier's expansion decides whether D-17 lets it run in Discovery, and the
  -- D-17 trigger is gated on the new list_mode, so a Known tier moved into the
  -- guild's Forever expansion would pass it and could then be switched. No app
  -- path changes a tier's expansion, so this refuses only browser sessions.
  -- The service role and migrations are trusted and not checked.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION USING
      MESSAGE = 'raid tiers are moved between expansions only by the server',
      ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_raid_tier_expansion_lock"() IS 'D-26: an anon or authenticated session cannot move a raid tier to another expansion. Called by one trigger gated on a changed expansion_id. The service role and migrations are not checked. Invoker rights because it reads no table, EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_raid_tier_expansion_lock"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_raid_tier_expansion_lock" BEFORE UPDATE OF "expansion_id" ON "public"."raid_tiers" FOR EACH ROW WHEN (OLD.expansion_id IS DISTINCT FROM NEW.expansion_id) EXECUTE FUNCTION "public"."enforce_raid_tier_expansion_lock"();

COMMENT ON TRIGGER "enforce_raid_tier_expansion_lock" ON "public"."raid_tiers" IS 'D-26: browser sessions cannot change raid_tiers.expansion_id. Runs only when the expansion changes. Update only: an insert picks its expansion under the insert policy and the D-17 trigger. See public.enforce_raid_tier_expansion_lock().';

CREATE OR REPLACE FUNCTION "public"."enforce_loot_item_need_delete_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  -- A direct delete of a need row cascades to its rankings, awards, BLP rows
  -- and pins, so a browser session may not issue one (D-27). The depth rule
  -- keeps guild deletion working: it runs as the signed in guild master and
  -- reaches need rows only by cascade, one trigger level deeper. The service
  -- role and migrations are trusted and not checked.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND pg_trigger_depth() = 1 THEN
    RAISE EXCEPTION USING
      MESSAGE = 'need rows are deleted only by the server',
      ERRCODE = 'insufficient_privilege';
  END IF;

  -- OLD, not NULL: a BEFORE DELETE trigger that returned NULL would silently
  -- skip the delete for the trusted writers.
  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION "public"."enforce_loot_item_need_delete_lock"() IS 'D-27: an anon or authenticated session cannot delete a need row with a statement that names the table itself (pg_trigger_depth() = 1). A delete that cascades from a deleted raid tier, expansion or guild passes, so delete_guild still works for the signed in guild master. Called by one trigger gated on OLD.kind = need, so item deletes never reach it. The service role and migrations are not checked. Invoker rights because it reads no table, EXECUTE revoked from PUBLIC, anon and authenticated.';

REVOKE ALL ON FUNCTION "public"."enforce_loot_item_need_delete_lock"() FROM PUBLIC, "anon", "authenticated";

CREATE OR REPLACE TRIGGER "enforce_loot_item_need_delete_lock" BEFORE DELETE ON "public"."loot_items" FOR EACH ROW WHEN (OLD.kind = 'need') EXECUTE FUNCTION "public"."enforce_loot_item_need_delete_lock"();

COMMENT ON TRIGGER "enforce_loot_item_need_delete_lock" ON "public"."loot_items" IS 'D-27: browser sessions cannot directly delete a need row. Runs only for need rows. See public.enforce_loot_item_need_delete_lock().';

DO $$
DECLARE
  v_role text;
  v_column text;
  v_trigger text;
  v_table text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH v_column IN ARRAY ARRAY['kind', 'need_key'] LOOP
      IF NOT has_column_privilege(v_role, 'public.loot_items', v_column, 'SELECT') THEN
        RAISE EXCEPTION 'loot_items.% is not readable by %', v_column, v_role;
      END IF;
    END LOOP;
    IF has_column_privilege(v_role, 'public.loot_items', 'officer_notes', 'SELECT') THEN
      RAISE EXCEPTION 'loot_items.officer_notes is readable by %', v_role;
    END IF;
  END LOOP;

  IF has_table_privilege('anon', 'public.loot_item_need_pins', 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') THEN
    RAISE EXCEPTION 'loot_item_need_pins is accessible to anon';
  END IF;
  IF has_table_privilege('authenticated', 'public.loot_item_need_pins', 'UPDATE') THEN
    RAISE EXCEPTION 'loot_item_need_pins is updatable by authenticated';
  END IF;

  FOR v_trigger, v_table IN
    SELECT * FROM (VALUES
      ('enforce_loot_item_need_pin_refs', 'loot_item_need_pins'),
      ('enforce_raid_tier_discovery_forever_only', 'raid_tiers'),
      ('enforce_raid_tier_known_switch', 'raid_tiers'),
      ('enforce_loot_item_need_rules_insert', 'loot_items'),
      ('enforce_loot_item_need_rules_update', 'loot_items'),
      ('enforce_need_ranking_hold', 'loot_submission_items'),
      ('enforce_expansion_forever_name_insert', 'expansions'),
      ('enforce_expansion_forever_name_update', 'expansions'),
      ('enforce_raid_tier_expansion_lock', 'raid_tiers'),
      ('enforce_loot_item_need_delete_lock', 'loot_items')
    ) AS t (trigger_name, table_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger tg
      WHERE tg.tgname = v_trigger
        AND tg.tgrelid = ('public.' || v_table)::regclass
        AND NOT tg.tgisinternal
    ) THEN
      RAISE EXCEPTION 'trigger % is missing on %', v_trigger, v_table;
    END IF;
  END LOOP;
END
$$;
