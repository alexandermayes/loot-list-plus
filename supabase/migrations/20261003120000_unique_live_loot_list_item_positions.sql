-- Removed loot list items no longer hold their rank and slot (GH #354).
--
-- Problem
-- -------
-- When an item is removed from an approved list (the remove-item route,
-- usually with already_obtained), its loot_submission_items row gets
-- removed_at but keeps its rank and slot. The table has the same
-- UNIQUE (submission_id, rank, slot) rule twice (loot_submission_items_
-- submission_id_rank_slot_key and loot_submission_items_unique_submission_
-- rank_slot, both added in the baseline schema), and both count removed
-- rows. save_submission_items deletes only the live rows of a list and then
-- inserts the payload, so once the list is a draft again, any payload item
-- at a removed row's rank and slot raises 23505 and the save fails.
--
-- Fix
-- ---
-- One partial unique index on rows that are not removed,
-- idx_loot_submission_items_unique_live_rank_slot ON (submission_id, rank,
-- slot) WHERE (removed_at IS NULL), replaces both full UNIQUE constraints.
-- A save, an insert or a restore that would put two live rows at one
-- position still fails 23505, now naming this index. A removed row keeps
-- its rank and slot and no longer blocks a new item there; two live items
-- still cannot share a rank and slot.
--
-- Writers and readers checked
-- ----------------------------
-- No code anywhere upserts loot_submission_items or names either dropped
-- constraint. The only writers that set rank and slot are
-- save_submission_items (deletes every live row of the list, then inserts
-- the payload) and the remove-item route (sets or clears removed_at by row
-- id; see the app-side PR for its mode-aware pick of the row to act on at a
-- shared position, and the 409 it now returns when a restore collides with
-- a live row). No code upserts on (submission_id, rank, slot), so a future
-- upsert keyed on these columns must not rely on this index for
-- ON CONFLICT: PostgREST cannot target a partial unique index for
-- ON CONFLICT without repeating its predicate.
--
-- Production safety
-- -----------------
-- scripts/deploy-migrations.sh sends this whole file as one Management API
-- query, which runs as one implicit transaction, and CREATE INDEX
-- CONCURRENTLY is rejected inside a transaction, so the index is built
-- plainly. SET LOCAL lock_timeout gives up after 5 seconds instead of
-- queueing behind a long lock on loot_submission_items; a timeout rolls the
-- whole file back and the next deploy simply runs it again. The index is
-- created before either constraint is dropped, so the table is never
-- without a unique guard on live rows. Every statement is idempotent
-- (IF NOT EXISTS, IF EXISTS, COMMENT), so a partial re-run also finishes
-- cleanly. Existing data cannot break the new index: the current full
-- UNIQUE rule already forbids any two rows, live or removed, from sharing a
-- position, so no two live rows can exist today. No function, trigger,
-- policy or grant changes here, and lib/database.types.ts is unchanged (it
-- lists only columns and foreign keys for this table).
--
-- Deploy order
-- ------------
-- The app PR (remove-item route and officer review modal changes) ships
-- first and behaves exactly as it does today against the current database,
-- where a position is never shared. This migration-only PR merges and
-- deploys (with --admin, about 12 seconds after merge) once that app
-- deploy is live.
--
-- Not changed
-- -----------
-- save_submission_items (its DELETE and INSERT are unchanged; the INSERT is
-- now checked only against live rows by the new index), every RLS policy,
-- every trigger and grant on this table, and lib/database.types.ts.
--
-- Rollback (costly once a removed row shares a position with another row)
-- -------------------------------------------------------------------------
-- First run, read-only, in the Supabase SQL editor:
--
--   select count(*) as shared_positions
--     from (select 1 from public.loot_submission_items
--            group by submission_id, rank, slot
--           having count(*) > 1) s;
--
-- It must be 0. If it is not, the lists involved need their removed rows
-- moved or deleted first. Then:
--
--   ALTER TABLE "public"."loot_submission_items" ADD CONSTRAINT "loot_submission_items_submission_id_rank_slot_key" UNIQUE ("submission_id", "rank", "slot");
--   DROP INDEX IF EXISTS "public"."idx_loot_submission_items_unique_live_rank_slot";
--
-- Only one constraint comes back: the second was an exact duplicate of the
-- first, so restoring one is enough.

SET LOCAL lock_timeout = '5s';

CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_submission_items_unique_live_rank_slot" ON "public"."loot_submission_items" USING "btree" ("submission_id", "rank", "slot") WHERE ("removed_at" IS NULL);

ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_unique_submission_rank_slot";

ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_submission_id_rank_slot_key";

COMMENT ON INDEX "public"."idx_loot_submission_items_unique_live_rank_slot" IS 'At most one item that is not removed per rank and slot of a loot list. Removed rows keep their rank and slot and do not block a new item there (GH #354).';
