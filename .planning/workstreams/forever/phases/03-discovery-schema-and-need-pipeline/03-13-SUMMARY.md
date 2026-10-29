---
phase: 03-discovery-schema-and-need-pipeline
plan: 13
subsystem: database
tags: [supabase, seeding, backfill, discovery, need-rows, vitest, forever]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "NEED_DEFINITIONS and needRowColumns (03-03), regenerated database types with list_mode (03-02), Discovery migration guard triggers (03-01), reader inventory tests (03-12)"
provides:
  - "app/services/need-row-seeder.ts: planNeedRows, planDiscoveryFlip, readNeedKeysByTier, seedNeedRows and the one guarded flipTiersToDiscovery"
  - "syncExpansionCatalog inserts Forever tiers as Discovery, switches pre-Discovery matched tiers, seeds 145 need rows per Discovery tier, Forever only"
  - "sync:forever report with tiersToFlip and needRowsToInsert, per expansion and in the totals"
affects: [03-14-list-mode-patch, 03-17-need-lifecycle, phase-04-picker, phase-05-drop-desk]

actuals:
  tokens: 20500
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Pure planner plus thin async writer (planNeedRows / seedNeedRows), read-then-insert because the partial unique index is not a PostgREST conflict target"
    - "Call order tier insert, flip, seed enforced by the test fakes mirroring enforce_loot_item_need_rules (a need row in a non-discovery tier is refused)"
    - "Stateful fakes whose only permitted update is exactly { list_mode: 'discovery' }; every other write throws 'forbidden write'"

key-files:
  created:
    - app/services/need-row-seeder.ts
    - app/services/__tests__/need-row-seeder.test.ts
  modified:
    - app/services/expansionCatalogSync.ts
    - app/services/__tests__/expansionCatalogSync.test.ts
    - app/services/__tests__/expansionSeeder.test.ts
    - scripts/lib/forever-sync.ts
    - scripts/lib/__tests__/forever-sync.test.ts
    - scripts/sync-forever-catalog.ts
    - lib/loot/__tests__/need-reader-inventory.test.ts

key-decisions:
  - "Need keys for matched tiers are read before any write, so a failed read leaves the expansion untouched; the sync's write order is tier insert, flip, seed"
  - "A dry run counts rows for tiers it has not inserted by planning against placeholder tier ids, so the owner sees 145 per tier for new tiers too"
  - "A tier id listed twice is planned once, because a repeat would break the (raid_tier_id, need_key) unique index"
  - "Only matched tiers are candidates for flipping and seeding; duplicate manifest tiers and officer-made tiers are never touched"
  - "need-row-seeder.ts is listed in NEED_READERS as writer (plan 03-13); the boss sentinel scan did not report it, so BOSS_NAME_READERS is unchanged"

patterns-established:
  - "Any file that writes need rows goes in NEED_READERS in the commit that creates it"
  - "Backfill report lines end with the Discovery switch and need-row counts in a fixed phrasing (', switch N to Discovery, need rows would insert M' / ', switched N to Discovery, need rows inserted M')"

requirements-completed: [DISC-01, DISC-06]

duration: 11min
completed: 2026-10-21
status: complete
---

# Phase 3 Plan 13: Need Row Seeder and Forever Backfill Summary

**New Forever guilds get Barrow Deeps, Hyjal Summit and Onyxia's Lair as Discovery tiers with 145 need rows each (435), and the owner-run `sync:forever` backfill switches existing Known Forever tiers to Discovery and seeds their needs, idempotently and Forever-only**

## Performance

- **Duration:** 11 min
- **Started:** 2026-10-21T22:59:30Z
- **Completed:** 2026-10-21T23:10:30Z
- **Tasks:** 3
- **Files modified:** 9 (2 created, 7 modified)

## Accomplishments

- `app/services/need-row-seeder.ts` holds the only code path that writes need rows. Every row is `{ raid_tier_id, ...needRowColumns(definition) }` from `NEED_DEFINITIONS`, in tier order then definition order, so two plans of the same input are deep-equal. Seeding is read-then-insert (paged `selectAllPagesOrThrow` read of `kind = 'need'` keys, then one insert); errors throw with the label or the tier ids.
- `syncExpansionCatalog` now reads `id, name, list_mode`, inserts missing tiers with `list_mode: 'discovery'` and `.select('id, name')`, flips matched Known tiers that hold no need rows through `flipTiersToDiscovery` (update filtered by `in id` and `eq list_mode known`), then seeds needs for inserted, flipped and already-Discovery matched tiers in one insert. A Known tier that already holds needs (an officer switched it back, D-03) is neither flipped nor seeded. Duplicates and unmatched custom tiers are never touched. Non-Forever names throw before any query (D-21).
- `seedExpansionForGuild(..., 'Forever')` therefore makes one tier insert (three Discovery rows), one `.select('id, name')`, and one 435-row `loot_items` insert; a need-row insert error lands in the existing catch, rolls the expansion back and returns the generic error.
- `sync:forever` reports, per expansion and in the totals, the tiers to switch and the need rows to insert (ids, manifest tier names and counts only, no em dashes). Dry run then apply then dry run reports zero of each.
- `need-row-seeder.ts` is inventoried in `NEED_READERS` as `writer` (plan 03-13). The legacy seeder loop and its payloads are untouched; the golden files pass under `CI=true`.

## Task Commits

1. **Task 1 (tracer): a new Forever guild gets three Discovery tiers holding 145 need rows each** - `2b032452` (test, RED), `f922a202` (feat)
2. **Task 2: the backfill switches existing Forever tiers once and never touches anything else** - `b4ab3e24` (test, RED), `85fdb4ad` (feat)
3. **Task 3: the dry-run report shows the tiers to switch and the need rows to insert** - `b7c2cbd6` (test, RED), `e4403793` (feat)

**Plan metadata:** the docs commit following this summary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Test fakes in expansionCatalogSync.test.ts and forever-sync.test.ts rebuilt in the Task 1 commit**
- **Found during:** Task 1
- **Issue:** The sync now chains `.select('id, name')` after the tier insert and writes to `loot_items`; the existing fakes returned a bare promise from `insert` and rejected `loot_items`, which broke 6 forever-sync tests and every sync test that inserts tiers. The plan scheduled the fake rewrite for Tasks 2 and 3.
- **Fix:** Rebuilt both fakes (stateful `loot_items`, `insert().select()`, the Discovery flip as the only allowed update, D-17 refusal of a need row in a non-Discovery tier) in Task 1 so every commit stays green. Tasks 2 and 3 then added their scenarios on top.
- **Files modified:** app/services/__tests__/expansionCatalogSync.test.ts, scripts/lib/__tests__/forever-sync.test.ts
- **Commit:** f922a202

**2. [Rule 2 - Missing critical] Owner-facing help text for sync:forever**
- **Found during:** Task 3
- **Issue:** `scripts/sync-forever-catalog.ts` still said the script "inserts the missing tiers" and is insert-only; the owner reads that before running the backfill that now also switches tiers and inserts 435 rows per expansion.
- **Fix:** Updated the header comment and the usage strings only. Wiring and behavior are unchanged.
- **Files modified:** scripts/sync-forever-catalog.ts
- **Commit:** e4403793

**3. [Plan ordering] Need-key read moved ahead of the tier insert**
- **Found during:** Task 2
- **Issue:** The plan text reads the keys after the tier insert. Reading first means a failed read leaves the expansion untouched, and the keys are only needed for matched tiers, which exist before any insert.
- **Fix:** `readNeedKeysByTier` runs before the first write; the write order the database requires (tier insert, flip, seed) is unchanged and asserted in tests.
- **Commit:** 85fdb4ad

**4. [Plan ordering] flip functions landed in the Task 1 file**
- `planDiscoveryFlip` and `flipTiersToDiscovery` were written with the rest of `need-row-seeder.ts` and covered by `need-row-seeder.test.ts` in Task 1; Task 2 only wired them into the sync. The `NEED_READERS` entry was added in the same commit that created the file (f922a202), as 03-12 requires, not in Task 3.

**Total deviations:** 4 (1 blocking-fix, 1 missing-critical, 2 ordering). **Impact:** none on behavior or scope; every commit passed its tests.

## Authentication Gates

None. No script was run against Supabase; the seeder and sync are proven with unit tests and fakes only. `npm run sync:forever` was not run, dry run or apply.

## Issues Encountered

None. The tracer gate was satisfied by re-running the Task 1 verify (seeder, seeder-sync and golden tests plus typecheck); it passed before Task 2 began. The interactive human-verify stop for the tracer is deferred to phase end by `workflow.human_verify_mode: end-of-phase`.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema; the only writes are the service-role inserts and the single guarded update the plan's threat model already covers (T-03-13-01 to T-03-13-06).

## Size and effort

D-26: the plan sat at the 100k-token budget with a low-confidence estimate (nine files) and stayed unsplit by owner decision. Actual effort: 9 files touched (2 created, 7 modified; the plan listed 9, of which the boss sentinel test needed no change and `scripts/sync-forever-catalog.ts` was added), 6 commits, about 2,300 lines added across tests and source, roughly 20.5k tokens of realized diff (chars/4 over the changes), about 11 minutes. No task ran long. The size risk did not materialise: the work is mostly test fakes, and rebuilding them once in Task 1 avoided a second rewrite. Two things kept it contained: the 03-12 inventory tests already named the files to update, and the 03-03 taxonomy made the seeder a mapping with no decisions.

## Verification

- `npx vitest run app/services scripts lib/loot/__tests__/need-reader-inventory.test.ts lib/loot/__tests__/needs-boss-sentinel.test.ts --maxWorkers=2`: 704 passed, 1 skipped.
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring`: 364 passed (legacy golden files unchanged).
- `npm run typecheck`: clean. `npm run lint`: 0 errors (375 pre-existing warnings, none in the new files).
- Acceptance greps: `list_mode: 'discovery'` in expansionCatalogSync.ts 2; `needRowColumns(` in need-row-seeder.ts 1; `DISC-01 ordering` in need-row-seeder.test.ts 1; `forbidden write` in expansionCatalogSync.test.ts 4; `[D-05]` 6; `[D-21]` 1; `needRowsToInsert` in forever-sync.ts 5; `app/services/need-row-seeder.ts` in the inventory test 1; the one-update-and-no-delete-or-upsert node check on need-row-seeder.ts exits 0.
- Full `npm test` is run by the orchestrator at wave end.

## Next Phase Readiness

Ready for 03-14 (list-mode PATCH), which adds its own route to `NEED_READERS`. Shipping: PR 4 (Discovery seeding and list mode, branch `feat/forever-discovery-seeding` off `origin/main`) with 03-14, opened only after PR 3 (need readers) has merged and deployed. Nothing was pushed. After PR 4 deploys, the owner runs `npm run sync:forever` (dry run), checks each Forever expansion shows its tiers to switch and 145 need rows per tier, runs `npm run sync:forever -- --apply`, then the dry run again and expects zero of each. That also completes the Phase 2 backfill still owed. Display names stay proposals until the Oct 26 copy review (D-10).

## Self-Check: PASSED

- FOUND: app/services/need-row-seeder.ts
- FOUND: app/services/__tests__/need-row-seeder.test.ts
- FOUND commits: 2b032452, f922a202, b4ab3e24, 85fdb4ad, b7c2cbd6, e4403793

---
*Phase: 03-discovery-schema-and-need-pipeline*
*Completed: 2026-10-21*
