---
phase: 03-discovery-schema-and-need-pipeline
plan: 02
subsystem: database
tags: [supabase, migration, deploy, database-types, github-actions]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plans 03-01 and 03-15 migration, PGlite harness and behaviour proofs; plan 03-03 need key fixture
provides:
  - PR 1 (migration only) merged to main and the Discovery schema applied in production
  - Owner confirmation of the frozen need key list (D-25), so PR 2 may merge
  - lib/database.types.ts declaring list_mode, kind, need_key, awarded_item_id and loot_item_need_pins
affects: [03-06, 03-07, 03-08, 03-09, 03-10, 03-11, 03-12, 03-13, 03-14, 03-16, 03-17, 03-18, 03-19, phase-04, phase-05]

actuals:
  tokens: 14000
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Hand-apply only the relevant hunks of gen:types output when the generator also reformats or drops unrelated blocks"

key-files:
  created: []
  modified:
    - lib/database.types.ts

key-decisions:
  - "gen:types wrote a non-empty file but its diff reformatted unrelated blocks, added unrelated tables and dropped recompute_blp_for_guild, so the file was restored and only the ten Discovery hunks were applied (61 added lines, 0 removed)"
  - "The owner chose the merge day (Wed 2026-10-21, not a raid day) and authorized the --admin merge, which the orchestrator ran"

requirements-completed: [DISC-12]

coverage:
  - id: D1
    description: "PR 1 carried exactly the six migration files of plans 03-01 and 03-15 and every CI check passed before the owner-authorized --admin merge"
    requirement: DISC-12
    verification:
      - kind: ci
        ref: "PR 459 checks: Test, CodeQL, Analyze (x2), Companion, Vercel"
        status: pass
    human_judgment: false
  - id: D2
    description: "The Discovery schema is live in production: the Deploy Migrations run for the PR 1 merge commit concluded success and applied 20261020120000_discovery_schema.sql"
    requirement: DISC-12
    verification:
      - kind: ci
        ref: "Deploy Migrations run 39677113149 (log line: apply  20261020120000_discovery_schema.sql)"
        status: pass
    human_judgment: false
  - id: D3
    description: "lib/database.types.ts declares the Discovery columns and the loot_item_need_pins table and the repository type checks with it"
    requirement: DISC-12
    verification:
      - kind: unit
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D4
    description: "The owner confirmed the 145-key need list before PR 2 freezes it (D-25)"
    requirement: DISC-12
    verification: []
    human_judgment: true

duration: 1 day (waiting on owner checkpoint)
completed: 2026-10-21
status: complete
---

# Phase 3 Plan 02: Discovery Schema Deploy Gate Summary

**Discovery migration merged and applied in production (run 39677113149), with database types carrying list_mode, kind, need_key, awarded_item_id and loot_item_need_pins.**

## Accomplishments

- PR 1 (#459, branch `feat/forever-discovery-schema`) held only the six migration files of plans 03-01 and 03-15 and passed every CI check.
- The owner confirmed the need key list and the merge day; PR 1 merged with `--admin`; the deploy applied the migration.
- `lib/database.types.ts` now describes the live schema, so reader plans can type-check selects of the new columns.

## Owner decisions

D-25 need keys confirmed 2026-10-21: the owner replied "keys confirmed" to the 145-key list in `domain/loot/__fixtures__/need-keys.json` (19 Big, 22 Medium, 104 Standard), with no key added, dropped or renamed. PR 2 (plans 03-03 to 03-05) may now merge; keys freeze when it does (D-12), and display names stay with the Oct 26 review (D-10).

Merge: the owner confirmed Wednesday 2026-10-21 is not a raid day, chose the day and authorized the merge. The orchestrator ran `gh pr merge 459 --admin --merge` on the owner's instruction. PR #459 state MERGED at 2026-10-21T21:14:10Z, merge commit `1b8c5b0a94de302c7438aabf9119ae1cc2fa518a`.

## Deploy confirmation (DISC-12)

| Field | Value |
| ----- | ----- |
| Workflow | Deploy Migrations |
| Run id | 39677113149 |
| Head sha | 1b8c5b0a94de302c7438aabf9119ae1cc2fa518a |
| Status / conclusion | completed / success |
| Run started | 2026-10-21T21:14:13Z |
| Log line | `apply  20261020120000_discovery_schema.sql` |

All earlier migrations printed `skip` in the same log; only the Discovery file was applied. From here the 03-06 to 03-14 and 03-16 to 03-19 reader plans may open their PRs (D-00d).

## Task Commits

1. **Task 1: PR 1 tracer** - PR #459 on `feat/forever-discovery-schema`, cherry-picks `500fa1a8`, `759164bd`, `8e1b3798`, `7072cd48`, `1e8bc8f5` onto origin/main `a4d10972` (originals on the working branch: `a831a2fd`, `34db2a27`, `2ea77636`, `6f86681c`, `9d51a24b`)
2. **Task 2: Owner checkpoint** - no commit (D-25 confirmation and merge, recorded above)
3. **Task 3: Database types** - `283f8e55` (chore: Discovery columns and loot_item_need_pins in database types)

The working branch also took a merge of origin/main (`5df60100`) so it contains the merged PR 1 before the types commit.

## Files Created/Modified

- `lib/database.types.ts` - `raid_tiers.list_mode`, `loot_items.kind` and `need_key`, `loot_history.awarded_item_id` (Row, Insert, Update each) and a `loot_item_need_pins` table block with its three relationships, in alphabetical table order.

## Decisions Made

See key-decisions above. The types file is hand-applied rather than generator output, so the live-schema proof is the deploy log (the plan's A11 fallback, taken for a different reason: output not empty but noisy).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] gen:types output carried unrelated drift**
- **Found during:** Task 3
- **Issue:** `npm run gen:types` wrote a non-empty file, but the diff was 339 additions and 14 deletions: formatting changes to the generic helper types, a `graphql` schema block, several tables the committed types lacked, and the removal of a multi-line `recompute_blp_for_guild` definition. Committing it would have mixed unrelated changes into a types-only gate commit.
- **Fix:** Saved the generator diff to the session scratchpad, restored the file with `git checkout -- lib/database.types.ts`, and applied only the ten hunks that add the Discovery columns and `loot_item_need_pins` (61 insertions, 0 deletions). This is the plan's own hand-edit fallback, using the generator's exact text.
- **Files modified:** lib/database.types.ts
- **Verification:** `npm run typecheck` exits 0; the node presence check for list_mode, need_key, awarded_item_id, loot_item_need_pins and `kind:` passes; `git log -1 --name-only` lists only lib/database.types.ts
- **Commit:** `283f8e55`

The unrelated type drift (other tables absent from the committed types, `recompute_blp_for_guild` formatting) is pre-existing and out of scope; it is left for a separate types refresh.

## Authentication Gates

None. The gen:types call authenticated with the owner's existing CLI session; no credential was printed or recorded.

## Issues Encountered

None beyond the deviation above.

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

- The D-25 line above unblocks PR 2 (plans 03-03 to 03-05).
- The recorded deploy run unblocks PR 3 and PR 4 reader plans; the types commit `283f8e55` is the first commit of PR 3.

## Self-Check: PASSED

- lib/database.types.ts: FOUND
- Commit 283f8e55: FOUND
- PR 459 state MERGED, deploy run 39677113149 success with the apply line present: confirmed
