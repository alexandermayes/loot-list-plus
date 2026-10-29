---
phase: 03-discovery-schema-and-need-pipeline
plan: 16
subsystem: api
tags: [reserve-runs, sheet-import, discovery, need-rows, list-mode, vitest]
status: complete

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "03-01 migration (raid_tiers.list_mode, loot_items.kind) deployed; 03-02 regenerated database types"
provides:
  - "POST /api/reserve-runs refuses Discovery and missing tiers with 400 RESERVES_UNAVAILABLE_ERROR before any insert"
  - "GET /api/reserve-runs/raid-tiers lists Known tiers only"
  - "Admin sheet import reads kind 'item' rows only, so its update by id can never reach a need row"
  - "First route test for the admin sheet import"
affects: [03-12 reader inventory, 04 picker, 05 drop desk]

tech-stack:
  added: []
  patterns:
    - "Tier gate on a create route: read the tier by id after auth and Premium checks, fail closed on a missing row, answer 500 on a read error"
    - "Recording fake that applies eq and in filters so a missing kind filter really returns the need row"

key-files:
  created:
    - app/api/admin/sheet-import/__tests__/route.test.ts
  modified:
    - app/api/reserve-runs/route.ts
    - app/api/reserve-runs/__tests__/route.test.ts
    - app/api/reserve-runs/raid-tiers/route.ts
    - app/api/reserve-runs/raid-tiers/__tests__/route.test.ts
    - app/api/admin/sheet-import/route.ts

key-decisions:
  - "RESERVES_UNAVAILABLE_ERROR = 'Soft reserves are not available for this raid.' is a module-level constant in the reserve-runs route; proposed copy, held for the owner's Oct 26 sign-off"
  - "The reserve tier read sits after the membership and Premium checks, so a non-member or non-Premium caller gets the same answers as before and never learns a tier's list mode"
  - "A tier read error answers 500 'Failed to create run' (the route's existing create-failure text) rather than adding new copy"

patterns-established:
  - "D-14 item-only closure for service-role writers: filter kind = 'item' on the read that produces ids a later update uses"

requirements-completed: [DISC-06]

duration: 12 min
completed: 2026-10-21
actuals:
  tokens: 9500
  tasks: 2
  commits: 2
---

# Phase 3 Plan 16: Reserve Creation and Admin Import Stay Item-Only Summary

**Soft reserves can be opened and listed only on Known tiers, and the admin sheet import reads item rows only so it can never match or rewrite a need row (D-14).**

## Performance

- **Duration:** about 12 min
- **Tasks:** 2 of 2
- **Files:** 6 (5 modified, 1 created)

## Accomplishments

- POST /api/reserve-runs reads the tier (`id, list_mode`) by id after the membership and Premium checks; a Discovery tier or a tier that matches no row answers 400 with the new constant, a read error answers 500, and no `reserve_runs` insert happens in any of those cases. Known tiers take the existing path.
- GET /api/reserve-runs/raid-tiers adds `.eq('list_mode', 'known')`; the Forever 400 from plan 02-05 is untouched.
- The admin sheet import adds `.eq('kind', 'item')` to the loot_items read whose ids feed the update, so a need row of the same name as a sheet row is never matched. The route's first test proves it with a fake that applies filters: dry run matches only the real item, an apply run updates only the item id, and 401, 403 and the read-error 400 are pinned.

## Task Commits

1. **Task 1 (tracer): reserve run and tier list Known-only** - `2a07fefd` (feat)
2. **Task 2: admin sheet import item-only plus first route test** - `d6e9eaf3` (feat)

Both tasks were TDD: the new cases were written and seen failing (5 failures in task 1, 2 in task 2) before the production edit.

## Tracer gate

Auto mode was not active and `human_verify_mode` is `end-of-phase`, so the tracer's human-verify stop is deferred to phase end. The tracer `<verify>` (`npx vitest run app/api/reserve-runs/__tests__ app/api/reserve-runs/raid-tiers && npm run typecheck`) passed before task 2 started.

## Verification

- `npx vitest run app/api/admin/sheet-import app/api/reserve-runs` : 10 files, 129 tests pass
- `npm run typecheck` : exit 0
- `npx eslint app/api/admin/sheet-import app/api/reserve-runs` : no findings (full `npm run lint` is 0 errors, 375 pre-existing warnings, none in these files)
- Acceptance greps: `RESERVES_UNAVAILABLE_ERROR` in the reserve-runs route 2 (needs at least 2), `.eq('list_mode', 'known')` in raid-tiers 1, `.eq('kind', 'item')` in sheet-import 1, `kind: 'need'` in the sheet-import test 1 (needs at least 1)
- No existing line removed from either existing test file (`git diff --numstat` shows 0 deletions on the raid-tiers test; the reserve-runs test edit only added fixture fields, a `maybeSingle` builder method and new cases)

## Deviations from Plan

None - plan executed exactly as written. One note on test scaffolding: the reserve-runs test fake had no `maybeSingle` and no `raid_tiers` table, so both were added to the helper and `baseFixture` (with a Known `tier-1` and a Discovery `tier-discovery`) so the existing POST cases keep passing unchanged.

## Decisions Made

See key-decisions above. The raid-tiers route still ignores a tiers read error and returns an empty list (existing behaviour, unchanged); the plan's 500 requirement applies to reads this plan introduced.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-03-16-01, T-03-16-02 and T-03-16-03 are mitigated as planned and covered by tests.

## Next Phase Readiness

PR 3 (need readers) items from this plan are ready. The reserve copy is proposed and still needs the owner's Oct 26 sign-off before it ships.

## Self-Check: PASSED

- `app/api/admin/sheet-import/__tests__/route.test.ts` exists; commits `2a07fefd` and `d6e9eaf3` exist
