-- Let a raider receive a second copy of one item on one raid night
-- (FU-1 of GH #331 and #293).
--
-- Problem
-- -------
-- A raider may list one item more than once (AQ40 Qiraji Bindings: one
-- 'Shared Boss Loot' loot_items row that several bosses drop). Since #331 and
-- #293 the loot list allows that, but loot_history cannot record it: the
-- unique index idx_loot_history_unique_award on (guild_id, loot_item_id,
-- character_id, raid_event_id) allows only one award of an item to a raider
-- per raid night, so the second real drop is rejected with 23505.
--
-- The same index is also the retry guard of the addon paths (#295, #307,
-- PR #322): a re-sent companion award or a re-imported addon export string
-- hits 23505 and is reported as already recorded. So the index cannot simply
-- be relaxed. It is replaced by an explicit copy number plus a per-award
-- idempotency key.
--
-- Fix
-- ---
-- Two new columns:
--
--   * award_copy smallint NOT NULL DEFAULT 1, CHECK 1 to 10. Which copy of
--     the item this row is for one raider on one raid night. The unique rule
--     becomes (guild_id, loot_item_id, character_id, raid_event_id,
--     award_copy) with the same partial predicate as before, so copy 1 and
--     copy 2 can both exist while a re-insert of the same copy still fails.
--   * source_award_key text NULL, CHECK length 1 to 200. A per-award
--     idempotency key for awards that carry their own identity (the addon
--     award's timestamp, item and raider name). Unique per guild when set.
--
-- How each writer picks them (app code, shipped in a separate PR):
--
--   * Master sheet award: copy 1 first; a deliberate second award is sent as
--     the next free copy after the officer confirms, so a resend of the same
--     intent carries the same copy number and is still a duplicate.
--   * Gargul paste: the n-th identical line of one paste is copy n.
--   * Addon export string (and a future companion that forwards the award
--     timestamp): source_award_key identifies the award; the app picks the
--     next free copy number.
--   * Today's companion sends no key and no copy, so it writes copy 1 and a
--     re-send still fails on the unique index exactly as before.
--
-- No backfill: every existing row becomes copy 1 with no key through the
-- column default. Awards never stored a timestamp, so keys cannot be derived
-- for old rows; the app instead lets one keyed addon award claim an unkeyed
-- row for the same item, raider and night. Existing rows already satisfy the
-- old four-column unique rule, so they cannot violate the new one.
--
-- Production safety
-- -----------------
-- deploy-migrations.sh sends this whole file as one Management API query,
-- which runs as an implicit transaction, and CREATE INDEX CONCURRENTLY is
-- rejected inside a transaction. The indexes are therefore built plainly.
-- loot_history is small, so the write lock is brief, and lock_timeout makes
-- the file give up after 5 seconds instead of queueing behind a long lock;
-- a timeout rolls everything back and the version is not recorded, so the
-- next deploy simply runs it again. Every statement uses IF NOT EXISTS or
-- IF EXISTS, so a partial re-run also finishes cleanly. Both new indexes are
-- created before the old one is dropped, so there is never a moment without
-- a unique guard.
--
-- Deploy window: app code from before this change never names award_copy or
-- source_award_key, so it writes copy 1 by default and every insert behaves
-- exactly as before (a same-night re-insert still raises 23505). The app PR
-- that writes the new columns must merge only after this migration has
-- applied, or every award would fail with an unknown column error.
--
-- GH #313 trigger: enforce_loot_history_guild_refs still fires on every
-- insert, including a second copy. Stamping source_award_key on an existing
-- row is an UPDATE of a column outside the trigger's UPDATE OF list, so it
-- does not re-check the row's references (a raider who has since left the
-- guild does not block it). No function, trigger, policy or grant changes
-- here.
--
-- Rollback: a forward migration can drop the two new indexes and columns and
-- recreate idx_loot_history_unique_award, but only after every row with
-- award_copy above 1 has been merged or deleted, because those rows violate
-- the old rule. Treat a rollback as costly once second copies exist.

SET LOCAL lock_timeout = '5s';

ALTER TABLE "public"."loot_history"
    ADD COLUMN IF NOT EXISTS "award_copy" smallint NOT NULL DEFAULT 1
    CONSTRAINT "loot_history_award_copy_range" CHECK (("award_copy" >= 1) AND ("award_copy" <= 10));

ALTER TABLE "public"."loot_history"
    ADD COLUMN IF NOT EXISTS "source_award_key" "text"
    CONSTRAINT "loot_history_source_award_key_length" CHECK (("source_award_key" IS NULL) OR ((char_length("source_award_key") >= 1) AND (char_length("source_award_key") <= 200)));

CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_history_unique_award_copy" ON "public"."loot_history" USING "btree" ("guild_id", "loot_item_id", "character_id", "raid_event_id", "award_copy") WHERE (("raid_event_id" IS NOT NULL) AND ("character_id" IS NOT NULL));

CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_history_source_award_key" ON "public"."loot_history" USING "btree" ("guild_id", "source_award_key") WHERE ("source_award_key" IS NOT NULL);

DROP INDEX IF EXISTS "public"."idx_loot_history_unique_award";

COMMENT ON COLUMN "public"."loot_history"."award_copy" IS 'Which copy of this item the raider received on this raid night: 1 for the first award, 2 for a second award of the same item on the same night, and so on up to 10.';

COMMENT ON COLUMN "public"."loot_history"."source_award_key" IS 'Identity of the award at its source, used to recognise retries and re-imports of the same award. Set for addon awards (timestamp, item and raider name). Empty for web, Gargul and older awards.';
