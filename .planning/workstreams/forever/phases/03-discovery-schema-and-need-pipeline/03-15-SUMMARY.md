---
phase: 03-discovery-schema-and-need-pipeline
plan: 15
subsystem: testing
tags: [postgres, pglite, rls, triggers, vitest, blp, migration-tests]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-01 Discovery migration, seven guard functions and ten triggers, PGlite chain harness
provides:
  - Committed behaviour proofs for every Discovery guard (D-03, D-12, D-17, D-22, D-24, D-26, D-27) run as the officer, raider and superuser roles with row_security on
  - Constraint, pin trigger, four-role RLS and column-grant proofs on the real migration chain
  - Need-keyed BLP accrual proof (DISC-07) with idempotent recomputes
  - Harness helpers query, expectRejected and inRolledBackTransaction
affects: [03-02, phase-04, phase-05]

actuals:
  tokens: 13600
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Every guard rejection sits beside a positive control for the same role, table and row, with the changed-row count asserted"
    - "Rejections run in expectRejected (BEGIN, run, ROLLBACK, resetRole); mutating positive controls run in inRolledBackTransaction"
    - "Locks whose point is that nothing changed (D-22 RPC, D-27 delete) run as plain statements so the read-back cannot pass on a rollback"
    - "Fixtures that need a ranked need or a need row are inserted as the superuser, never by disabling a trigger"

key-files:
  created: []
  modified:
    - app/services/__tests__/discovery-schema-pglite.test.ts
    - app/services/__tests__/helpers/pglite-chain.ts

key-decisions:
  - "RLS matrix asserts an UPDATE of loot_item_need_pins is refused with permission denied for all four roles, not 0 rows, because authenticated holds no UPDATE privilege"
  - "The shared seed moved to a file-level beforeAll so every describe sees the same rows; the seeded pin points at need 2, leaving need 1 with no item behind it for the DISC-07 case"
  - "BLP, draft-list and attendance fixtures live in the describes that use them and persist in order; D-27 is last and re-runs the recompute so it does not depend on test order inside the BLP describe"

patterns-established:
  - "Mutation spot-check: drop a trigger, policy, index or grant after the third-apply test and confirm the matching cases fail (done for 16 mutations, all caught)"

requirements-completed: [DISC-12, DISC-07, DISC-01, DISC-06]

coverage:
  - id: D1
    description: "An officer's direct write cannot switch a legacy tier to Discovery (D-17), leave Discovery with ranked or awarded needs (D-03), write a need row (D-12), claim or give up the Forever expansion name directly or through create_expansion_for_guild (D-24), or move a Known tier into Forever (D-26); the superuser gets the same D-17 and D-03 answers and is not held by D-24 or D-26"
    requirement: DISC-12
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#guards stop direct writes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Known writes pass unchanged for the officer: Classic tier insert, is_guild_active update, item insert, classification update, non-Forever expansion rename and insert, create_expansion_for_guild with another name"
    requirement: DISC-12
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#guards stop direct writes"
        status: pass
    human_judgment: false
  - id: D3
    description: "Constraints name their rejecting object (loot_items_need_shape_check, loot_items_kind_check, raid_tiers_list_mode_check, idx_loot_items_tier_need_key) and the same need_key is accepted in two Forever Discovery tiers"
    requirement: DISC-06
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#constraints"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pin integrity trigger rejects four bad pins for the superuser with check_violation and gives non-officers the row-level-security error; four-role RLS matrix and column grants hold; awarded_item_id is a nullable uuid with no foreign key"
    requirement: DISC-12
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#pin integrity trigger"
        status: pass
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#RLS matrix on loot_item_need_pins"
        status: pass
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#column grants"
        status: pass
    human_judgment: false
  - id: D5
    description: "The D-22 hold stops a raider ranking a need through save_submission_items or a direct insert and leaves the list's live rows unchanged; item saves still work; the superuser can rank a need"
    requirement: DISC-12
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#D-22 need-ranking hold"
        status: pass
    human_judgment: false
  - id: D6
    description: "A need ranked past the hold accrues BLP: the winner has no row, the other raider times_passed 1, recomputes are idempotent in any order, and an unranked need writes nothing"
    requirement: DISC-07
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#BLP accrues on a need row (DISC-07)"
        status: pass
    human_judgment: false
  - id: D7
    description: "An officer's plain DELETE of a ranked, awarded need row is refused and the need, its rankings, its award and its BLP row remain; item delete, service-role delete and the delete_guild cascade still work"
    requirement: DISC-12
    verification:
      - kind: integration
        ref: "app/services/__tests__/discovery-schema-pglite.test.ts#D-27 need-row delete lock"
        status: pass
    human_judgment: false

duration: 29min
completed: 2026-10-20
status: complete
---

# Phase 3 Plan 15: Discovery Guard Behaviour Proofs Summary

**52 PGlite cases run the Discovery guards as officer, raider and superuser sessions on the real migration chain, each rejection paired with a same-role positive control, plus constraint, pin trigger, four-role RLS, grant and need-BLP proofs.**

## Performance

- **Duration:** 29 min (approximate; the start time was not captured at spawn, taken from the first scratch run)
- **Started:** 2026-10-20T20:39:00Z (approximate)
- **Completed:** 2026-10-20T21:08:00Z
- **Tasks:** 3
- **Files modified:** 2 (both test-side; the migration is untouched)

## Accomplishments

- Harness helpers `query`, `expectRejected` (BEGIN, run, ROLLBACK, resetRole, returns the error for SQLSTATE checks) and `inRolledBackTransaction` in `app/services/__tests__/helpers/pglite-chain.ts`.
- Shared seed (five users, two guilds, four characters, three memberships, F1/F2/F3/C1 plus a guild 2 tier, item and need rows, one pin) moved to a file-level `beforeAll`; the 03-01 cases kept and now read the seeded rows.
- `guards stop direct writes`: D-17 (officer update and insert, superuser), D-03 (ranked, removed-ranked and awarded each refused for officer and superuser, allowed with no references), D-12, D-17 placement for the superuser, D-24 (insert, two renames and `create_expansion_for_guild`, with superuser control), D-26 (move, then the follow-up switch as a separate case), and a WHEN-clause check on every table guard.
- `constraints`, `pin integrity trigger`, `RLS matrix on loot_item_need_pins` (officer, raider, ex-member, non-member), `column grants` (including D-15, awarded_item_id nullable uuid with no FK).
- `D-22 need-ranking hold`, `BLP accrues on a need row (DISC-07)` and, last, `D-27 need-row delete lock`, whose officer DELETE runs as a plain statement so the read-back shows the lock kept the need, both rankings, the award and B's BLP row.
- Mutation spot-check: 16 deliberate breakages (dropping each guard trigger, the pin trigger, the unique index, the shape check, the delete policy, the D-27 lock, swapping the D-27 lock for one without the depth rule, granting UPDATE on pins, revoking a column grant) each failed at least one case; the file was restored byte-identical afterwards.

## Task Commits

1. **Task 1: Tracer, officer guard cases with positive controls** - `2ea77636` (test)
2. **Task 2: Constraints, pin trigger, RLS matrix, grants, awarded_item_id** - `6f86681c` (test)
3. **Task 3: D-22 hold, DISC-07 BLP accrual, D-27 delete lock** - `9d51a24b` (test)

**Plan metadata:** committed separately as `docs(03-15)` (SUMMARY, STATE, ROADMAP, REQUIREMENTS).

## Files Created/Modified

- `app/services/__tests__/discovery-schema-pglite.test.ts` - all behaviour describes and the shared seed (52 cases)
- `app/services/__tests__/helpers/pglite-chain.ts` - `query`, `expectRejected`, `inRolledBackTransaction`

## Decisions Made

- The pin UPDATE case asserts `permission denied for table loot_item_need_pins` for all four roles (see deviation 1).
- The seeded pin points at need 2 so need 1 has no item behind it, which keeps the DISC-07 "before any item exists for that need" statement literally true.
- Mutating positive controls that read back (renames, tier switches, `save_submission_items`) read through the superuser inside the open transaction before the rollback, so the read-back shows the write the policy allowed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan assumption] RLS matrix: pin UPDATE is refused, not a 0-row update**
- **Found during:** Task 2
- **Issue:** The plan says an UPDATE of `loot_item_need_pins` "affects 0 rows for everyone". The migration grants authenticated SELECT, INSERT and DELETE only, so Postgres refuses the statement with `permission denied` before any policy runs.
- **Fix:** The case asserts the permission-denied rejection for officer, raider, ex-member and non-member and reads the pin back unchanged. This is stronger than the plan wording. The grant test also pins `UPDATE` as absent.
- **Files modified:** app/services/__tests__/discovery-schema-pglite.test.ts
- **Verification:** mutation `GRANT UPDATE ... TO authenticated` fails five cases.
- **Committed in:** 6f86681c

**2. [Rule 1 - Test fixture] Valid values for existing check constraints**
- **Found during:** Tasks 1 and 3
- **Issue:** First runs used a classification of 'Big 3' (allowed: Reserved, Limited, Unlimited) and slot 3 (allowed: 1, 2).
- **Fix:** Classification 'Limited'; the extra ranking uses rank 3, slot 1.
- **Files modified:** app/services/__tests__/discovery-schema-pglite.test.ts
- **Committed in:** 2ea77636, 9d51a24b

**3. [Rule 3 - Blocking] TypeScript target rejects the regex `s` flag**
- **Found during:** Task 1 typecheck
- **Fix:** Replaced `.*` with `[\s\S]*` in the WHEN-clause regex.
- **Committed in:** 2ea77636

---

**Total deviations:** 3 auto-fixed (2 test-fixture/assumption bugs, 1 blocking)
**Impact on plan:** No change to scope; the migration is untouched and every behaviour line in the plan has a case.

## Issues Encountered

- **TDD order:** the guards already existed (plan 03-01), so there was no RED commit; the cases passed on first correct run. The mutation spot-check above stands in as the proof the cases have teeth. One early attempt (mutating before the "third apply" test) showed no failures because that test re-applies the migration and restores the dropped trigger; the mutations were re-run after it.
- **Tracer gate:** auto mode was off and `workflow.human_verify_mode` is `end-of-phase`, so I re-ran the tracer's automated verify (vitest and typecheck, both green) and continued. Human verification of the slice is left to the phase-level step.
- **Scratch placeholder left behind:** an untracked scratch probe at `app/services/__tests__/scratch/probe.test.ts` (now a skipped placeholder test, not committed) could not be deleted because the delete command was held by the permission layer and not run. Delete the `app/services/__tests__/scratch/` directory by hand.
- An unrelated formatter expanded the test file to about 1200 lines after writes; meaning is unchanged.
- `npm run lint`: 0 errors, 375 warnings, the same count as before this plan.

## Verification Results

- `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts app/services/__tests__/discovery-schema-migration.test.ts`: 68 of 68 pass (52 plus 16).
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring`: 364 of 364 pass.
- `npm run typecheck` clean; `npm run lint` 0 errors.
- Acceptance greps all met: `guards stop direct writes` 1, `[D-17]` 3, `[D-03]` 1, `[D-12]` 1, `[D-24]` 2, `create_expansion_for_guild` 2, `[D-26]` 2, `moved between expansions only by the server` 1, `expectRejected` export 1, `RLS matrix on loot_item_need_pins` 1, `ex-member` 2, `idx_loot_items_tier_need_key` 2, `DISC-06 adjacency` 1, `save_submission_items` 3, `[D-22]` 3, `DISC-07 ordering` 1, `DISC-07 empty` 1, `recompute_blp_for_guild` 1, `disable trigger` 0, `[D-27]` 4, `deleted only by the server` 1, `delete_guild` 1.

## Known Stubs

None.

## Threat Flags

None. The tests add no network endpoint, auth path or schema; seed ids are synthetic and the guild names are 'Test Guild' and 'Other Guild' (T-03-15-04).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Ready for 03-02: PR 1 now carries the migration (03-01) plus these test commits (`2ea77636`, `6f86681c`, `9d51a24b`); plan 03-02 cherry-picks them together.
- Remove the untracked `app/services/__tests__/scratch/` directory before opening the PR.

## Self-Check: PASSED

- Modified files exist; commits `2ea77636`, `6f86681c` and `9d51a24b` are in `git log`.
- Every task's acceptance criteria and the plan-level verification re-run and passing (see Verification Results).

---
*Phase: 03-discovery-schema-and-need-pipeline*
*Completed: 2026-10-20*
