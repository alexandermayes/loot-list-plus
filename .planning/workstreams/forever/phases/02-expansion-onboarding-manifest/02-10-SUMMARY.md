---
phase: 02-expansion-onboarding-manifest
plan: 10
subsystem: infra
tags: [supabase, admin-script, tsx, vitest, idempotent-sync, source-scan]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "syncExpansionCatalog, planCatalogSync, CatalogSyncResult (plan 02-03); FOREVER_MANIFEST (plan 02-02)"
provides:
  - "scripts/lib/forever-sync.ts: side-effect-free admin library (parseForeverSyncArgs, ForeverSyncArgError, runForeverSync, formatForeverSyncReport, findDuplicateTierNames, syncExitCode)"
  - "scripts/sync-forever-catalog.ts: owner-run CLI, dry run by default, --apply writes, --help exits 0 before any I/O"
  - "npm script sync:forever"
  - "Post-apply duplicate re-read per expansion: duplicates are reported, never deleted, and make the exit code 1"
  - "Lazy-sync source scan: only app/services/expansionSeeder.ts and scripts/lib/forever-sync.ts may import the sync module"
affects: [02-11]

actuals:
  tokens: 8500
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Thin CLI over a tested library: args parsed before any I/O, typed argument error, env loading and client creation only after --help and flag validation"
    - "Per-item failure isolation: one expansion's read or insert error is recorded with its id and the loop continues, so a partial run is visible and a re-run heals it"
    - "Source-scan guard with a floor, self-checks and an allowlist (same family as typed-client-usage and no-live-fetch)"

key-files:
  created:
    - scripts/lib/forever-sync.ts
    - scripts/lib/__tests__/forever-sync.test.ts
    - scripts/sync-forever-catalog.ts
  modified:
    - package.json

key-decisions:
  - "Dry run is the default and --apply writes; any other argument (for example --aply) is rejected with exit 1 so a typo can never silently run as a dry run the owner mistakes for an apply"
  - "The duplicate re-read lives in the library behind a private readDuplicateTierNames helper that throws on a read error, so an expansion that could not be checked is a failure, never reported clean"
  - "Duplicates are only reported. No unique index exists on raid_tiers (expansion_id, name) and adding one is a migration this phase may not ship, so the owner resolves duplicates by hand"
  - "A failed post-apply re-read lands in failures and not in the expansions list, so the Totals line can undercount tiers inserted for that one expansion; the exit code is 1 and the failure message names the expansion, and an idempotent re-run reports the true state"

patterns-established:
  - "Lazy-sync guard: scan non-test .ts and .tsx under app, lib, utils, domain, components, data, scripts plus root-level .ts files (proxy.ts is the Next 16 middleware), match static import, export-from, dynamic import() and require() paths ending in expansionCatalogSync, compare against a two-file allowlist"

requirements-completed: [EXPN-05]

coverage:
  - id: D1
    description: "Dry run is the default: pages every Forever expansions row (select id, guild_id; eq name Forever; order by id; range), calls sync with dryRun true, inserts nothing, and the report lists each tier that would be inserted with phase and sort_order"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/forever-sync.test.ts#runForeverSync dry run, #formatForeverSyncReport"
        status: pass
    human_judgment: false
  - id: D2
    description: "Apply inserts only missing tiers and is idempotent: a second apply run and a dry run after an apply report nothing to insert for every expansion and make zero insert calls; update, delete and upsert never occur"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/forever-sync.test.ts#runForeverSync apply"
        status: pass
    human_judgment: false
  - id: D3
    description: "Duplicates after apply are listed per expansion and never deleted; duplicates, a failed re-read or any per-expansion failure give exit code 1 while the remaining expansions are still processed"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/forever-sync.test.ts#runForeverSync duplicates, #runForeverSync failures"
        status: pass
    human_judgment: false
  - id: D4
    description: "Argument handling: unknown flags are rejected with exit 1, --help exits 0 without reading .env.local or creating a client, and the sync:forever npm script is wired"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/forever-sync.test.ts#parseForeverSyncArgs"
        status: pass
      - kind: other
        ref: "npm run sync:forever -- --help (exit 0); npm run sync:forever -- --aply (exit 1)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Privacy: only the expansions and raid_tiers tables are touched and the report carries ids, manifest tier names and counts only, with planted guild, player and email values never appearing"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/forever-sync.test.ts#runForeverSync privacy"
        status: pass
    human_judgment: false
  - id: D6
    description: "No request path, middleware, cron or client component imports the sync module; the scan covers over 300 files, includes proxy.ts, and flags every import form on a synthetic route"
    requirement: "EXPN-05"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/forever-sync.test.ts#lazy-sync guard"
        status: pass
    human_judgment: false
  - id: D7
    description: "The owner-run sequence against the real Forever expansions (dry run, apply once, dry run again) produces the expected tiers with no duplicates and a clean second run"
    requirement: "EXPN-05"
    verification: []
    human_judgment: true
    rationale: "The executor never touches a real database; the plan reserves --apply against production for the owner after the PR 3 deploy and this PR's merge (prohibition status: judgment). Run the Owner runbook below and record the expansion count and totals in the phase UAT"

duration: 2 min
completed: 2026-10-17
status: complete
---

# Phase 02 Plan 10: Owner-run Forever Catalog Sync Summary

**Dry-run-first `npm run sync:forever` that pages every Forever expansion, inserts only the missing manifest tiers through the insert-only sync, re-reads each expansion after `--apply` to report (never delete) duplicate tier names, isolates per-expansion failures, and exits 1 on any failure or duplicate**

## Performance

- **Duration:** 2 min for this continuation (Task 2 and the close-out); Task 1 ran in an earlier session
- **Started:** 2026-10-17T04:17:39Z (continuation)
- **Completed:** 2026-10-17T04:19:27Z (production commits; SUMMARY and state commits follow)
- **Tasks:** 2
- **Files modified:** 4 (3 created, package.json modified)

## Accomplishments

- Owner command `npm run sync:forever` lists, per Forever expansion id, which tiers sync would insert (Barrow Deeps phase 1 sort 1, Hyjal Summit phase 1 sort 2, Onyxia's Lair phase 1 sort 3 for an empty expansion) with nothing written; `--apply` inserts them.
- Apply is idempotent and insert-only: a second apply run and a dry run after an apply both report nothing to insert for every expansion, with zero insert calls and zero update, delete or upsert calls (the fake throws on those).
- After `--apply`, each expansion's `raid_tiers` is re-read (`id, name` by `expansion_id`) and normalized duplicate names are reported under their first-seen spelling; duplicates, a failed re-read or any per-expansion failure make the exit code 1, and the other expansions are still processed.
- Output and reads stay private: only `expansions` and `raid_tiers` are touched, and the report holds expansion ids, guild ids, manifest tier names and counts, verified against planted guild, player and email values.
- Lazy-sync guard: a source scan of 300+ non-test files (including `proxy.ts`, the Next 16 middleware) proves only the seeder and the script library import `expansionCatalogSync`, and flags static import, export-from, dynamic import() and require() forms on a synthetic route.

## Task Commits

1. **Task 1: Tracer, dry-run sync across every Forever expansion** - `f4fd4e43` (test, RED), `91855183` (feat, GREEN). Checkpoint approved by the user.
2. **Task 2: Apply idempotency, duplicates and failures, privacy, lazy-sync guard** - `bf5f5183` (test, RED), `8ddb289d` (feat, GREEN)

**Plan metadata:** recorded in the docs(02-10) commits that follow this file.

## TDD Gate Compliance

Task 1 and Task 2 each have a `test(...)` commit followed by a `feat(...)` commit. Task 2's RED was only partly red, stated plainly:

- Failed on first run (3 of 27): the duplicate list after apply and exit code 1, the post-apply re-read of `id, name` by `expansion_id`, and a failed re-read landing in failures. These needed the new wiring.
- Passed on first write (the other new cases): idempotent second apply, dry run after apply, per-expansion failure isolation, 1001-row paging, privacy, and the lazy-sync scan. Task 1's library and `syncExpansionCatalog` already satisfied them, so they are regression pins and not driven by a failing test. They were not weakened or rewritten to manufacture a RED.

## Files Created/Modified

- `scripts/lib/forever-sync.ts` - side-effect-free admin library; Task 2 added the private `readDuplicateTierNames` re-read and wired `findDuplicateTierNames` into the apply path.
- `scripts/lib/__tests__/forever-sync.test.ts` - 27 tests over a two-table fake client (expansions: select/eq/order/range; stateful raid_tiers with read-failure switches; update, delete, upsert and any other table throw), plus the lazy-sync source scan.
- `scripts/sync-forever-catalog.ts` - thin CLI: args first, `--help` exits 0 before any I/O, `.env.local` loader, `createTypedServiceRoleClient`, report, `process.exitCode` from `syncExitCode`.
- `package.json` - `"sync:forever": "tsx scripts/sync-forever-catalog.ts"`.

## Decisions Made

See `key-decisions` in the frontmatter. In short: dry run by default with unknown flags rejected; the re-read throws on error so an unchecked expansion is a failure; duplicates are reported, never deleted, because the unique index needs a migration outside this phase.

## Deviations from Plan

None - plan executed exactly as written.

Two small notes that are not deviations:

- The test file grew an extra fake-client option (`failReads`, `failReadsAfterInsert`) and a `tierSelects()` recorder; both are test-local.
- The plan's Task 2 scan lists "root-level .ts files (middleware.ts included)". This repo has no `middleware.ts`; the Next 16 equivalent is `proxy.ts`, which the root-level scan picks up and the test asserts is scanned.

## Issues Encountered

- A failed post-apply re-read puts the expansion in `failures` only, so for that one expansion the Totals line can undercount tiers inserted. Recorded as a decision above; exit code and message are still correct, and an idempotent re-run shows the true state.
- Prettier is not part of this repo's checks (`npm run lint` is eslint only); the test file keeps the repo's no-semicolon single-quote style.

## Verification Results

- `CI=true npx vitest run scripts/lib/__tests__/forever-sync.test.ts`: 27 passed.
- `CI=true npx vitest run scripts app/services`: 28 files, 487 tests passed.
- `npm run sync:forever -- --help`: exit 0, prints the `--apply` usage. `npm run sync:forever -- --aply`: exit 1.
- `npm run lint`: 0 errors (377 pre-existing warnings, none in this plan's files). `npx eslint scripts/lib scripts/sync-forever-catalog.ts`: clean.
- `npm run typecheck`: only the known pre-existing `.next/dev/types/validator.ts` error (missing `app/api/raid-events/route.js`).
- `grep -c findDuplicateTierNames scripts/lib/forever-sync.ts`: 2. `grep -c syncExitCode scripts/sync-forever-catalog.ts`: 2.
- The script itself was never run without `--help` or an invalid flag; no real database was touched.

## Owner runbook

Run once, after the plan 02-03 migration and sync code are deployed and this PR has merged, from an up-to-date `main` with `.env.local` present.

1. Dry run: `npm run sync:forever`. Check that every Forever expansion id lists Barrow Deeps, Hyjal Summit and Onyxia's Lair as would insert (or already matched), and that the output holds no guild or player names. Nothing is written.
2. Apply once: `npm run sync:forever -- --apply`. Check exit code 0 and `Duplicate tier names: none`. If a duplicate is listed it is not deleted; resolve it by hand and re-run.
3. Confirm: `npm run sync:forever` again. Every expansion should report would insert 0.

Record the expansion count and the Totals line in the phase UAT. Re-running the same sequence after a future manifest addition is how new tiers reach existing guilds.

## User Setup Required

None - no external service configuration required beyond the existing `.env.local` the owner already uses for other scripts.

## Known Stubs

None.

## Threat Flags

None. The script adds no network endpoint or auth path; it is a local owner-run process on the service-role key, covered by T-02-10-01 to T-02-10-05.

## Next Phase Readiness

- Ready for 02-11 (wave 3).
- Open for the owner: the Owner runbook above (human-judgment item D7).

## Self-Check: PASSED

Verified after writing: created files exist (`scripts/lib/forever-sync.ts`, `scripts/lib/__tests__/forever-sync.test.ts`, `scripts/sync-forever-catalog.ts`), `package.json` holds the `sync:forever` script, and commits `f4fd4e43`, `91855183`, `bf5f5183`, `8ddb289d` exist in `git log`. All Task 2 acceptance criteria re-run and pass.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-17*
