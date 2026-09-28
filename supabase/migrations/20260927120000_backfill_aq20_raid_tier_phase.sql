-- Backfill the missing Phase 4 assignment on existing Classic AQ20 tiers (GH #279).
--
-- (1) The cause: data/expansion-phases.ts named the Classic Phase 4 raid
-- "Ahn'Qiraj", but data/classic-wow-raids.ts (the catalog
-- app/services/expansionSeeder.ts actually copies into every guild) names the
-- raid "Ruins of Ahn'Qiraj". getRaidPhase does an exact name match, so it
-- never found a phase for that raid. Since the phase system shipped on
-- 2026-02-04 (commit 5febb4f5), every Classic guild's AQ20 raid_tiers row was
-- seeded with phase NULL.
--
-- (2) Why that matters: a NULL-phase tier is invisible everywhere phase-keyed.
-- There is no Phase card, and so no per-tier on/off toggle, on the expansion
-- settings page. /api/raid-tiers filters by phase <= current_phase, and SQL
-- drops NULLs there. The loot-list bootstrap requires phase != null. PATCH
-- .../phase with phase 4 returned 404 "No tiers found for phase 4", because no
-- Classic tier had phase 4 -- so Phase 4 could not even be selected.
--
-- (3) What this migration does: it sets phase to 4 on the existing rows and
-- nothing else. The companion code change (data/expansion-phases.ts, same PR)
-- makes new guilds seed AQ20 at phase 4 from now on.
--
-- (4) What it deliberately leaves alone: is_guild_active, master_sheet_visible,
-- is_active and expansions.current_phase. Whether guilds already past Phase 4
-- should have AQ20 switched on for them is open product decision OD-01,
-- recorded in quick task 260927-sos and the pull request. If the user decides
-- to switch it on, that ships as a separate follow-up migration -- not this
-- one.
--
-- (5) Idempotency: the phase IS NULL guard means a second run matches zero
-- rows. Any tier that already has a phase set (for example one an officer set
-- by hand) is never overwritten.
--
-- (6) Why 'Classic WoW' is matched too: 'Classic WoW' is an older name for the
-- same expansion that the app still recognises (see
-- 20260926233000_add_classic_missing_loot.sql for the same join shape and
-- reasoning).
--
-- (7) The deploy window from OD-02: migrations apply about 12 seconds after
-- merge, while the Vercel deploy takes minutes. A guild created in that window
-- is seeded by the pre-fix code (AQ20 phase NULL). Verification query 2 below
-- finds any such straggler after the deploy finishes; the same idempotent
-- UPDATE fixes it if one shows up.
--
-- app/services/__tests__/aq20-phase-backfill-migration.test.ts asserts this
-- statement's shape and phase literal against what the seeder itself writes,
-- so the SQL and data/expansion-phases.ts cannot drift apart again.

UPDATE public.raid_tiers rt
SET phase = 4
FROM public.expansions e
WHERE e.id = rt.expansion_id
  AND e.name IN ('Classic', 'Classic WoW')
  AND rt.name = 'Ruins of Ahn''Qiraj'
  AND rt.phase IS NULL;

-- Verification only, NOT executed. Run these read-only queries in Supabase
-- Studio; do not run them from this executor. All three return aggregate
-- counts, never per-guild or per-player data.
--
-- Query 1: Classic AQ20 tiers grouped by phase. After the deploy finishes,
-- every row should be at phase 4.
-- SELECT rt.phase, count(*) AS tier_count
-- FROM raid_tiers rt
-- JOIN expansions e ON e.id = rt.expansion_id
-- WHERE e.name IN ('Classic', 'Classic WoW') AND rt.name = 'Ruins of Ahn''Qiraj'
-- GROUP BY rt.phase
-- ORDER BY rt.phase;
--
-- Query 2: every raid_tiers row with phase NULL, in any expansion. Expect no
-- rows. A row here after the deploy is a straggler from the OD-02 deploy
-- window; ship the same UPDATE again as a follow-up migration.
-- SELECT e.name AS expansion_name, rt.name AS tier_name, count(*) AS tier_count
-- FROM raid_tiers rt
-- JOIN expansions e ON e.id = rt.expansion_id
-- WHERE rt.phase IS NULL
-- GROUP BY e.name, rt.name
-- ORDER BY e.name, rt.name;
--
-- Query 3: the OD-01 population, read-only sizing only (do not act on this
-- without a decision). Classic expansions at current_phase >= 4, and how many
-- of their AQ20 tiers are still switched off for the guild, grouped by
-- current_phase.
-- SELECT e.current_phase, count(*) AS guild_count,
--        count(*) FILTER (WHERE rt.is_guild_active = false) AS aq20_still_off
-- FROM expansions e
-- JOIN raid_tiers rt ON rt.expansion_id = e.id AND rt.name = 'Ruins of Ahn''Qiraj'
-- WHERE e.name IN ('Classic', 'Classic WoW') AND e.current_phase >= 4
-- GROUP BY e.current_phase
-- ORDER BY e.current_phase;
