---
phase: 04-discovery-lists-and-score-split
plan: 02
subsystem: infra
tags: [supabase-migration, deploy-migrations, github-actions, supabase-types, owner-checkpoint]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-01 migration 20261111120000_need_lists.sql and its PGlite proofs; 04-04 need-defaults.ts and 04-03 need-eligibility.ts shown at the owner stop"
provides:
  - "PR #506 (migration only, five files) merged to main and deployed; Deploy Migrations run 42969511761 applied 20261111120000_need_lists.sql"
  - "Owner's recorded confirmation of the five one-way doors (with the D-08 amended draft-only window) and of the 18 spec defaults (D-09)"
  - "guild_settings.loot_style in lib/database.types.ts (Row string | null, Insert and Update optional), committed on the working branch"
affects: [04-08, 04-09, 04-11, 04-13, 04-15, 04-16, 04-17, 04-18, 04-20, 04-21]

actuals:
  tokens: 400
  tasks: 3
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Migration-only PR merged with --admin on a non-raid day, deploy confirmed from the Deploy Migrations run log before any dependent code ships"
    - "gen:types output is checked against the diff; when it drifts beyond the intended column the types are hand-edited in the award_slot_lock_enabled style"

key-files:
  created: []
  modified:
    - lib/database.types.ts

key-decisions:
  - "Owner confirmed the five one-way doors and accepted the D-08 amended draft-only window on 2026-11-11"
  - "Owner confirmed the 18 spec defaults and the eligibility tables unchanged (D-09, D-10, D-31)"
  - "Hand-edited lib/database.types.ts instead of committing gen:types output, because the regenerated file changed far more than guild_settings.loot_style"

patterns-established:
  - "Types commit naming the deploy run id is the first commit of PR 3"

requirements-completed: [DISC-03, DISC-04, DISC-05, DISC-10]

coverage:
  - id: D1
    description: "PR 1 carried exactly the five migration files and passed CI before the owner merged it"
    requirement: DISC-03
    verification:
      - kind: other
        ref: "gh pr view 506 --json files -q '.files | length' prints 5; CI green before merge (Task 1)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Owner decision on one-way doors, draft-only window and spec defaults recorded with date and words"
    requirement: DISC-10
    verification: []
    human_judgment: true
    rationale: "An owner sign-off is a human decision; no automation can assert it"
  - id: D3
    description: "Migration deployed to production: Deploy Migrations run for the merge commit concluded success and logged the apply line"
    requirement: DISC-04
    verification:
      - kind: other
        ref: "gh run view 42969511761 --log contains 'apply  20261111120000_need_lists.sql'"
        status: pass
    human_judgment: false
  - id: D4
    description: "guild_settings.loot_style typed in lib/database.types.ts"
    requirement: DISC-05
    verification:
      - kind: other
        ref: "npm run typecheck exits 0; three loot_style entries counted by the plan verify script"
        status: pass
    human_judgment: false

duration: "checkpoint-gated (spans the owner decision)"
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 02: Migration deploy gate and loot_style types Summary

**Phase 4 need-lists migration (slot range 1..8, dropped D-22 hold, loot_style column, tier delete guard) merged as PR #506, applied to production by Deploy Migrations run 42969511761, with guild_settings.loot_style typed on the working branch.**

## Performance

- **Completed:** 2026-11-11T06:07Z (Task 3 commit and summary)
- **Tasks:** 3 (Task 2 was the owner decision checkpoint)
- **Files modified:** 1 (`lib/database.types.ts`)

## Owner Confirmations

One-way doors confirmed 2026-11-11: the 1..8 slot range, the three loot_style ids (reward_attendance, even_rotation, officers_decide), the dropped hold (D-22), the tier delete guard, and the draft-only window (D-08 amended: drafts only until PR 3 ships the submit budget and eligibility checks); draft-only window accepted. Owner's words: "doors confirmed, draft-only window accepted, defaults confirmed, merged #506".

D-09 spec defaults confirmed 2026-11-11: all 18 default lists (Enhancement Shaman and Feral as listed), SPECS_WITHOUT_DEFAULT and the eligibility tables (dual-wield classes, relic classes, physical stat by class) accepted without change. Owner's words: "doors confirmed, draft-only window accepted, defaults confirmed, merged #506".

No defaults or eligibility change was requested, so `domain/loot/need-defaults.ts`, `domain/loot/need-eligibility.ts` and the defaults test are untouched by this plan. The merge happened on a non-raid day, as the owner confirmed.

## Deploy Record

| Item | Value |
|------|-------|
| PR | #506, https://github.com/alexandermayes/loot-list-plus/pull/506, branch `feat/forever-need-lists-schema` |
| PR files | 5 (the five 04-01 files); commits 3bc40f65, de00f08d, 5bd14e84 are cherry-picks of 0080778f, 7d7206d5, 70684868 |
| Merged | 2026-11-11T06:01:12Z via `gh pr merge 506 --admin --merge` |
| Merge commit | 50a01eeaefc1bccea7b1556a13f24d31cb2440b7 |
| Deploy Migrations run | 42969511761 |
| Run head sha | 50a01eeaefc1bccea7b1556a13f24d31cb2440b7 |
| Run status / conclusion | completed / success |
| Apply line | `apply  20261111120000_need_lists.sql`, after skip lines for the earlier migrations |

Only the run id, sha, conclusion and the apply line were taken from the log; no credential or connection detail was read into any file.

## Accomplishments

- PR 1 opened with only the five migration files, CI green, merged by the owner with `--admin` (Task 1 and Task 2)
- Deploy confirmed from the run log before any dependent code was committed (D-25)
- `origin/main` merged into `work/forever-phase-04` cleanly (the cherry-picked PR 1 files are identical on both sides)
- `guild_settings.loot_style` added to Row (`string | null`), Insert and Update (`?: string | null`), each after `loot_announcements_enabled`

## Task Commits

1. **Task 1: Tracer, PR 1 with five migration files, CI green** - PR #506 (cherry-picks 3bc40f65, de00f08d, 5bd14e84), no working-tree commit
2. **Task 2: Owner confirms one-way doors and spec defaults, merges PR 1** - no commit (decision checkpoint; owner asked for no change)
3. **Task 3: Confirm deploy, apply loot_style types** - `900fdc9a` (feat)

**Plan metadata:** the docs commit that carries this file (docs: complete plan)

## Files Created/Modified

- `lib/database.types.ts` - three `loot_style` entries on guild_settings (Row, Insert, Update)

## Decisions Made

- Hand-edited the types rather than committing `npm run gen:types` output: the regenerated file added a `graphql_public` schema and about 280 lines of unrelated changes, which the plan says to discard in favor of a hand edit (A11 fallback). The slot check and trigger functions need no type change.

## Deviations from Plan

None - plan executed exactly as written. The gen:types drift was an anticipated branch of the plan, not a deviation.

## Issues Encountered

- `npm run gen:types` produced a non-empty file whose diff went well beyond `loot_style`; restored with `git checkout -- lib/database.types.ts` and hand-edited as planned.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The deploy record exists, so PR 3 (Discovery lists: 04-08, 04-09, 04-11, 04-20, 04-13, 04-21, 04-17, 04-18) and PR 4 (presets: 04-15, 04-16) may open. Commit `900fdc9a` (the types) is the first commit of PR 3.
- PR 2 (need primitives and score split: 04-03 to 04-07, 04-10, 04-12, 04-14) carries `need-defaults.ts`; the D-09 line above now exists, so its remaining gate is the copy sign-off in 04-19.
- Until PR 3 ships the submit budget and eligibility checks, production runs in the accepted draft-only window: a raider can save a draft holding need rows, nothing can be submitted.

## Self-Check: PASSED

- `lib/database.types.ts` present and non-empty; three loot_style entries; `npm run typecheck` exits 0
- Commit `900fdc9a` exists and lists only `lib/database.types.ts`
- `One-way doors confirmed`, `draft-only window accepted` and `D-09 spec defaults confirmed` all present in this file
- Run 42969511761 logs `apply  20261111120000_need_lists.sql` (one matching line)

---
*Phase: 04-discovery-lists-and-score-split*
*Completed: 2026-11-11*
