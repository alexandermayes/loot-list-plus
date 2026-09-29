---
phase: 09-type-and-card-migration
plan: 03
subsystem: ui
tags: [tailwind, codemod, type-scale, ratchet-guard]

requires:
  - phase: 09-type-and-card-migration
    provides: "09-01's committed text-sizes.mjs codemod and text-size-map.json mapping table; 09-02's live ARBITRARY_TEXT_SIZE_CEILING guard and the answered blocking checkpoint (approve as presented) that authorized the first product-source edit"
provides:
  - "Every file under app/(app)/ (18 route groups, 42 files, 417 lines) sized through a named Tailwind fontSize scale step -- no arbitrary text-[Npx] class remains anywhere under app/(app)/"
  - "The two 8px sub-floor sites in app/(app)/master-sheet/components/BossSection.tsx (D-03) raised to text-11, the TYPE-01 floor"
  - "__tests__/type-scale-floor.test.ts's SUB_11_PATTERN widened from the literal (9|10) alternation to any arbitrary value below 11, so an 8px (or any sub-11) site cannot reintroduce itself unnoticed"
  - "__tests__/arbitrary-text-sizes.test.ts's ARBITRARY_TEXT_SIZE_CEILING ratcheted down three times in this plan: 878 -> 840 (tracer) -> 607 (group A) -> 423 (group B), each decrement equal to its batch's measured matching-line count"
affects: [09-04-type-sweep-cont, 09-05-card-primitive, 09-06-card-sweep-cont, 09-08-evidence]

actuals:
  tokens: 58300
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Batch-by-directory codemod application: dry-run every target directory first, read the full report, confirm the matching-line total against the plan's plan-time expectation, then apply, then lower the ratchet ceiling by exactly that total in the same commit"
    - "Sub-floor scan widening lands in the same commit that clears the sites it would otherwise fail on (never a separate commit), so the guard is never temporarily weakened to keep a commit green"

key-files:
  created: []
  modified:
    - "app/(app)/overview/components/DashboardContent.tsx (Task 1, prior session)"
    - "app/(app)/overview/components/SetupGuide.tsx (Task 1, prior session)"
    - "app/(app)/loot-management/components/{DonationsTab,ItemRow,LootSettingsContent,PriorityListTab,SettingsModal}.tsx"
    - "app/(app)/loot-list/components/LootListContent.tsx"
    - "app/(app)/loot-submissions/components/LootSubmissionsContent.tsx"
    - "app/(app)/master-loot/_client.tsx"
    - "app/(app)/master-sheet/components/{BossSection,ItemCandidateModal,MasterSheetContent,RaidModeView,RaidTierHeader}.tsx"
    - "app/(app)/attendance/components/AttendanceContent.tsx"
    - "app/(app)/guild-settings/components/{BillingSection,ExpansionManager,GuildSettingsContent,InviteCodeManager,MemberManager,RoleManager}.tsx"
    - "app/(app)/raid-tracking/{_client,components/LootHistoryTab,components/PlayerLootModal,components/RaidCardHeader,components/RaidMemberList,components/WeekGroup,import/_client}.tsx"
    - "app/(app)/reserve/{_client,components/CreateReserveRunModal,runs/[id]/_client}.tsx"
    - "app/(app)/profile/{components/ProfileContent,page}.tsx"
    - "app/(app)/characters/{[id]/edit/_client,manage/_client}.tsx"
    - "app/(app)/expansions/[expansionId]/_client.tsx"
    - "app/(app)/audit-log/_client.tsx"
    - "app/(app)/admin/analytics/_client.tsx"
    - "app/(app)/design-system/_client.tsx"
    - "app/(app)/help/_client.tsx"
    - "app/(app)/raid-teams/_client.tsx"
    - "__tests__/arbitrary-text-sizes.test.ts"
    - "__tests__/type-scale-floor.test.ts"

key-decisions:
  - "Both batches (group A: six directories, group B: eleven directories) measured matching-line totals -- 233 and 184 respectively -- exactly matching the plan's own plan-time table before any file was touched, so no reconciliation was needed at either commit (unlike 09-01/09-02's occurrence-vs-line discrepancies)."
  - "The widened SUB_11_PATTERN uses /text-\\[(?:[0-9]|10)px\\]/ (single digit 0-9, or the literal 10, each anchored immediately before 'px]') rather than a numeric-range helper, keeping the guard a single regex constant per the task's 'one constant' instruction; verified not to partially match multi-digit values like 80px or 108px."
  - "design-system/_client.tsx's one site (line 1679, a documentation preview of 'Table header' text) was rewritten identically to any other call site -- class string only, no prose or rendered text node touched, confirmed by a scoped git diff after the batch."

requirements-completed: [TYPE-03]

coverage:
  - id: D1
    description: "Task 2: group-A batch (loot-management, loot-list, loot-submissions, master-loot, master-sheet, attendance -- 14 files, 233 matching lines) codemod-applied, BossSection.tsx's two 8px sub-floor sites raised to text-11, sub-11px scan widened, ceiling lowered 840 -> 607, commit da5ae105"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/arbitrary-text-sizes.test.ts __tests__/type-scale-floor.test.ts (22 tests, all passing)"
        status: pass
      - kind: other
        ref: "grep -rlE 'text-\\[[0-9]+px\\]' over the six group-A directories returns no files; grep -c 'text-11' BossSection.tsx returns 22 (>= 2); re-running the codemod over all six directories reports a zero total"
        status: pass
    human_judgment: false
  - id: D2
    description: "Task 3: group-B batch (the remaining eleven app/(app) route groups -- 26 files, 184 matching lines) codemod-applied, ceiling lowered 607 -> 423, commit 09b9032d; no file under app/(app)/ carries an arbitrary text-[Npx] class"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/arbitrary-text-sizes.test.ts (3 tests, passing at ceiling 423)"
        status: pass
      - kind: other
        ref: "grep -rlE 'text-\\[[0-9]+px\\]' app/(app) returns no files; node scripts/codemods/text-sizes.mjs app/(app) --dry-run reports TOTAL: 0 rewrite(s); git diff for design-system/_client.tsx shows only the className string changed"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full CI gate (lint, typecheck, full test suite at --maxWorkers=2) green on both Task 2 and Task 3 commits, with no file outside each batch's declared scope touched"
    verification:
      - kind: unit
        ref: "npm run typecheck (exit 0), npm run lint (0 errors, pre-existing 397 warnings unchanged), npx vitest run --maxWorkers=2 (66 files / 1193 tests, all passing) -- run after each of the two commits"
        status: pass
    human_judgment: false
  - id: D4
    description: "The ~51-estimate D-04 heading-tightening delta (18px/24px/28px/42px sites with no leading-* class) visibly tightens line-height from inherited 1.5 to 1.2 across this plan's three batches; accepted per the 09-02 checkpoint and reviewed only at the end-of-phase screenshot gate, not by a per-site functional test in this plan"
    verification: []
    human_judgment: true
    rationale: "Visual line-height tightening across 42 files cannot be proven by a unit test; it is the accepted D-04 delta from the 09-02 checkpoint, routed to the end-of-phase screenshot comparison (09-08) per that checkpoint's own terms, not re-litigated here."

duration: 42min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 03: Type Sweep -- Tracer, Group A, Group B (Summary)

**All 18 authenticated route groups under `app/(app)/` (42 files, 417 lines) now size their text through named Tailwind fontSize scale steps instead of arbitrary `text-[Npx]` classes; the guard ceiling ratcheted 878 -> 840 -> 607 -> 423 across three green commits, and the sub-11px floor scan now rejects any value below 11, not just the two literals TYPE-01 originally named.**

## Performance

- **Duration:** 42 min (this continuation; Task 1 completed in a prior session)
- **Started:** 2026-09-19T13:15:00Z (approx, continuation agent start)
- **Completed:** 2026-09-19T13:57:00Z
- **Tasks:** 3 of 3 completed (Task 1 was already committed before this continuation; Tasks 2 and 3 executed here)
- **Files modified:** 44 across all three tasks (2 in Task 1, 16 in Task 2, 26 in Task 3), plus the two guard test files

## Accomplishments
- Task 1 (prior session, unchanged): tracer batch proved the whole mechanism end to end on `app/(app)/overview/` -- 2 files, 38 lines, ceiling 878 -> 840
- Task 2: swept the six group-A directories (loot-management, loot-list, loot-submissions, master-loot, master-sheet, attendance) -- 14 files, 233 matching lines, ceiling 840 -> 607; raised BossSection.tsx's two 8px sub-floor sites to text-11 (D-03) and widened `type-scale-floor.test.ts`'s `SUB_11_PATTERN` in the same commit
- Task 3: swept the remaining eleven route groups (guild-settings, raid-tracking, reserve, profile, characters, expansions, audit-log, admin, design-system, help, raid-teams) -- 26 files, 184 matching lines, ceiling 607 -> 423
- Every value in both batches (11-16, 18, 20, 24, 28, 42) mapped 1:1 onto an already-shipped alias via the committed `text-size-map.json`, including the 8 -> 11 sub-floor row
- Both batches' measured matching-line totals (233 and 184) matched the plan's own plan-time table exactly, with no discrepancy to reconcile
- `node scripts/codemods/text-sizes.mjs "app/(app)" --dry-run` reports a zero total at the end of the plan, confirming the codemod's own idempotence across the entire authenticated route tree
- Full CI gate (lint, typecheck, `--maxWorkers=2` full test suite) green on both new commits: 66 test files, 1193 tests, 0 lint errors

## Task Commits

Each completed task was committed atomically:

1. **Task 1: Tracer batch -- sweep app/(app)/overview end to end and ratchet the guard** - `ba697785` (feat, prior session)
2. **Task 2: Sweep app/(app) group A and widen the sub-11px floor scan** - `da5ae105` (feat)
3. **Task 3: Sweep app/(app) group B** - `09b9032d` (feat)

**Plan metadata:** committed alongside this SUMMARY (see the docs commit immediately following).

## Files Created/Modified

**Task 2 (group A, 16 files):**
- `app/(app)/loot-management/components/{DonationsTab,ItemRow,LootSettingsContent,PriorityListTab,SettingsModal}.tsx` - arbitrary text sizes rewritten onto named aliases
- `app/(app)/loot-list/components/LootListContent.tsx`, `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx`, `app/(app)/master-loot/_client.tsx`, `app/(app)/attendance/components/AttendanceContent.tsx` - same
- `app/(app)/master-sheet/components/{BossSection,ItemCandidateModal,MasterSheetContent,RaidModeView,RaidTierHeader}.tsx` - same; BossSection.tsx also carries the D-03 8px -> text-11 sub-floor raise at its two tied-chip/gap-number sites
- `__tests__/arbitrary-text-sizes.test.ts` - ceiling 840 -> 607
- `__tests__/type-scale-floor.test.ts` - `SUB_11_PATTERN` widened from `/text-\[(9|10)px\]/` to `/text-\[(?:[0-9]|10)px\]/`

**Task 3 (group B, 26 files):**
- `app/(app)/guild-settings/components/{BillingSection,ExpansionManager,GuildSettingsContent,InviteCodeManager,MemberManager,RoleManager}.tsx`
- `app/(app)/raid-tracking/{_client,components/LootHistoryTab,components/PlayerLootModal,components/RaidCardHeader,components/RaidMemberList,components/WeekGroup,import/_client}.tsx`
- `app/(app)/reserve/{_client,components/CreateReserveRunModal,runs/[id]/_client}.tsx`
- `app/(app)/profile/{components/ProfileContent,page}.tsx`
- `app/(app)/characters/{[id]/edit/_client,manage/_client}.tsx`
- `app/(app)/expansions/[expansionId]/_client.tsx`, `app/(app)/audit-log/_client.tsx`, `app/(app)/admin/analytics/_client.tsx`, `app/(app)/design-system/_client.tsx`, `app/(app)/help/_client.tsx`, `app/(app)/raid-teams/_client.tsx`
- `__tests__/arbitrary-text-sizes.test.ts` - ceiling 607 -> 423

## Decisions Made
- Both batches were dry-run per directory first, and every directory's report total was re-summed via a shared `sort -u | wc -l` check to confirm the LINE count (not occurrence count) matched the plan's own table before applying -- both matched exactly (233 and 184), unlike 09-01/09-02's codemod-vs-guard reconciliations.
- The widened `SUB_11_PATTERN` stays a single regex constant (`/text-\[(?:[0-9]|10)px\]/`) rather than a numeric-comparison helper, per the task's "one constant, in the spirit of TYPE-01" instruction; verified it does not partially match multi-digit values (80px, 108px) that happen to start with a digit 0-9 or "10".
- The 09-02 checkpoint's user response ("trust it, continue") meant Task 1's tracer-feedback gate did not require a separate manual visual check before Tasks 2 and 3 proceeded; Tasks 2 and 3 carry no `checkpoint:*` of their own (`type="auto"`), so no further gate was expected or hit in this plan.

## Deviations from Plan

None - both Task 2 and Task 3 executed exactly as written. Every acceptance criterion in 09-03-PLAN.md for both tasks was checked directly (grep scans, ceiling arithmetic, idempotence re-runs, `git diff` scoping for `design-system/_client.tsx`) and passed without needing a codemod fix, a mapping-table addition, or a hand-patched site.

## Issues Encountered

None. Both batches' dry-run reports were internally consistent with the plan's plan-time table on the first attempt; no unmapped pixel value, no SKIPPED entry, and no out-of-scope file appeared in either report.

## User Setup Required

None - this plan's blocking checkpoint (Task 1's tracer-feedback gate) was already resolved by the user before this continuation started ("trust it, continue"); no further human input was required for Tasks 2 or 3.

## Next Phase Readiness

Plan 09-03 is complete. Every file under `app/(app)/` now sizes its text through the type scale, the sub-11px floor scan is generalized so the specific 8px regression cannot recur, and the ratchet ceiling sits at 423 -- exactly the plan's `<success_criteria>` target. 09-04 (the next type-sweep batch, per 09-CONTEXT.md's D-14 batch order: `app/components`, then landing/public, then `components/`) may proceed against this ceiling. No screen density concern was surfaced during this plan beyond the D-03 (accepted, applied) and D-04 (accepted, deferred to the end-of-phase screenshot gate) deltas already named at the 09-02 checkpoint -- neither requires a new entry in the milestone-C routing list.

## Self-Check: PASSED

`grep -rlE 'text-\[[0-9]+px\]' "app/(app)"` confirmed empty (exit 1, no matches). `node scripts/codemods/text-sizes.mjs "app/(app)" --dry-run` confirmed `TOTAL: 0 rewrite(s)`. `grep -c 'text-11' "app/(app)/master-sheet/components/BossSection.tsx"` confirmed 22 (>= 2). Both commit hashes (`da5ae105`, `09b9032d`) confirmed present via `git log --oneline`. `ARBITRARY_TEXT_SIZE_CEILING` confirmed at 423 in `__tests__/arbitrary-text-sizes.test.ts` on disk. Full test suite (`npx vitest run --maxWorkers=2`) confirmed green at 1193/1193 after the final commit.

---
*Phase: 09-type-and-card-migration*
*Completed: 2026-09-19*
