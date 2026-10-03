---
phase: quick-261003-gso
plan: 01
subsystem: api
tags: [nextjs, supabase, vitest, loot-scoring, master-sheet, dashboard]

requires:
  - phase: quick-260929-n27
    provides: findInvalidCharacterIds (lib/loot/guild-award-refs.ts), the active-membership check this plan reuses everywhere
  - phase: quick-260929-n27
    provides: splitCandidatesByMembership (domain/loot/master-sheet-candidates.ts), reused by the new Summary loader
provides:
  - The master sheet's per-phase rankings gate (GH #202) only unlocks a phase from a caller character with an active membership
  - GET /api/addon/export-string builds members from active character_guild_memberships only, with no fallback, and fails loudly on a membership read error
  - lib/loot/master-sheet-summary.ts: loadMasterSheetSummary, the master sheet Summary view's data loader with the active-member filter
  - domain/loot/item-competition.ts: isActiveCompetitor and buildItemCompetition, pure helpers for the dashboard's competition counts and ties
affects: [master-sheet, addon-export, dashboard, discord-bot-priority]

actuals:
  tokens: 18086
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Every read-only surface that counts raiders calls the shared findInvalidCharacterIds (lib/loot/guild-award-refs.ts) rather than reimplementing the active-membership rule; server routes pass the service-role client, client views (Summary, dashboard) pass the browser client"
    - "A membership-read failure is never silently shown as empty or unfiltered data: routes answer 500, the Summary view reaches its existing catch and notification, and the dashboard hides only the affected numbers (competition or ties) for that load"

key-files:
  created:
    - lib/loot/master-sheet-summary.ts
    - lib/loot/__tests__/master-sheet-summary.test.ts
    - domain/loot/item-competition.ts
    - domain/loot/__tests__/item-competition.test.ts
  modified:
    - app/api/master-sheet/visibility/route.ts
    - app/api/master-sheet/visibility/__tests__/route.test.ts
    - app/api/addon/export-string/route.ts
    - app/api/addon/export-string/__tests__/route.test.ts
    - app/(app)/master-sheet/components/MasterSheetContent.tsx
    - app/(app)/overview/components/DashboardContent.tsx

key-decisions:
  - "D-01: one rule everywhere. Every surface calls the real findInvalidCharacterIds instead of a reimplementation; each surface has tests that run it unmocked against a fake client or feed its output to the pure helper"
  - "D-02 (phase gate): filterItemsToEarnedPhases now checks the caller's own characters through findInvalidCharacterIds before the approved-list read; only active caller characters can unlock a phase"
  - "D-03/D-04 (export): the fallback that derived members from any submission in the guild is removed; stats.submissions now counts only approved lists of the exported members[]"
  - "D-05/D-06 (Summary view): loadMasterSheetSummary filters players, total_lists and average_rank to active members; already_awarded is NOT filtered (OD-02), it still counts every copy handed out"
  - "D-07 (dashboard): new pure helpers hold the existing GH #58 rank logic after dropping inactive entries; the viewer's own entries always count even if a membership lookup misreports them"
  - "OD-01 resolved by the user, 2026-10-03: yes, fix the dashboard in this PR (Task 3), not a follow-up"
  - "OD-02 resolved by the user, 2026-10-03: yes, keep counting already-awarded copies given to raiders who later left; only demand is filtered"
  - "OD-03 resolved by the user, 2026-10-03: yes, the addon export's \"{n} submissions\" count should count only exported members"

requirements-completed: [GH-326-R1, GH-326-R2, GH-326-R3, GH-326-R4, GH-326-R5, DASH-R1, DELIVERY-R1]

coverage:
  - id: D1
    description: "filterItemsToEarnedPhases counts approved lists only from the caller's characters with an active membership in the guild; a departed alt (is_active false, NULL, or active only in another guild) no longer unlocks a phase"
    requirement: "GH-326-R3"
    verification:
      - kind: unit
        ref: "app/api/master-sheet/visibility/__tests__/route.test.ts#GH #326: the phase gate counts only the caller's active characters (G1-G7)"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/addon/export-string builds members only from active character_guild_memberships rows; the fallback that derived members from any submission is removed; a membership read error answers 500 and calls trackApiError"
    requirement: "GH-326-R2"
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#GH #326: export members come from active memberships only (X1-X5)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The export's stats.submissions counts only approved lists whose character is in the exported members[]"
    requirement: "GH-326-R2"
    verification:
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#X2"
        status: pass
    human_judgment: false
  - id: D4
    description: "The master sheet Summary view's players, total_lists and average_rank count active members only, via a new loadMasterSheetSummary loader; already_awarded still counts every award regardless of membership"
    requirement: "GH-326-R1"
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/master-sheet-summary.test.ts (S1-S9)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The dashboard's \"others want this\", \"you're #N\", low-competition quick wins and \"Tied with\" leave out raiders without an active membership; the viewer's own entries always count; a membership-lookup failure hides only the affected numbers for that load"
    requirement: "DASH-R1"
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/item-competition.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every surface calls the real findInvalidCharacterIds (no reimplementation); every surface has a test proving it"
    requirement: "GH-326-R4"
    verification:
      - kind: unit
        ref: "app/api/master-sheet/visibility/__tests__/route.test.ts#D-02 contract, lib/loot/__tests__/master-sheet-summary.test.ts#S8"
        status: pass
    human_judgment: false
  - id: D7
    description: "Full test suite shows no new failures versus the pre-change baseline; tsc clean; eslint 0 errors with every file at or under its baseline warning count; branch diff is exactly the ten files_modified paths; no em dash in any added line; nothing pushed, no PR opened, no migration"
    requirement: "DELIVERY-R1"
    verification:
      - kind: other
        ref: "SP/new-fails.sh baseline-gso-vitest.txt final-gso-vitest.txt (exit 0); npx tsc --noEmit; npx eslint <10 files>"
        status: pass
    human_judgment: false
  - id: D8
    description: "OD-01 to OD-03 reach the user with recommendations and the recorded resolutions; the surfaces survey and FU-1 to FU-6 reach the SUMMARY and PR body"
    requirement: "GH-326-R5"
    verification: []
    human_judgment: true
    rationale: "Product decisions already resolved by the user on 2026-10-03 (recorded below and in the plan's OD table); documented here for the record rather than re-litigated. The surfaces survey and follow-ups are informational, not independently testable."

duration: ~50min
completed: 2026-10-03
status: complete
---

# Quick Task 261003-gso: Fix GH #326, read-only views that still counted departed raiders Summary

**Applied the master sheet's active-membership rule (findInvalidCharacterIds) to four more read-only surfaces: the per-phase rankings gate, the addon export's member roster and submission count, the master sheet Summary view's demand numbers, and the dashboard's competition counts and ties; with 30 new tests across four files and a draft PR body surveying every other surface checked.**

## Performance

- **Duration:** ~50 min
- **Tasks:** 3
- **Files modified:** 10 (4 created, 6 modified)
- **Commits:** 4

## Findings: what each surface counted before, and what it counts now

**Phase gate (`app/api/master-sheet/visibility/route.ts`, issue item 3).** Since #314 the master sheet's Rankings view, award modal and Gargul export already leave out raiders without an active membership. The per-phase gate (GH #202) that decides whether a raider has "earned" a phase did not: it read every approved list belonging to any of the caller's characters, including an alt who had since left the guild. `filterItemsToEarnedPhases` now calls `findInvalidCharacterIds` on the caller's own characters before reading approved lists; a departed alt's legacy approved list no longer unlocks a phase for the caller. The existing membership gate at the top of `POST`, the bypass for officers and the guild creator, and the `#314` candidate filter are unchanged.

**Addon export (`app/api/addon/export-string/route.ts`, issue item 2).** The export's member roster came from active `character_guild_memberships` rows "try new table first," but fell back to deriving a roster from *any* `loot_submissions` row in the guild (drafts, pending, rejected, or a raider who left) whenever that read came back empty, including on an unchecked read error. That fallback is deleted outright: a guild with no active member now exports `members: []`, and a failed membership read answers `500` and calls `trackApiError` instead of silently exporting an empty or derived roster. Separately, the export dialog's "{n} submissions" count used to count every approved list in the guild, including lists whose owner isn't in the export; it now counts only approved lists whose character is one of the exported members (OD-03).

**Master sheet Summary view (`MasterSheetContent.tsx`, issue item 1).** The Summary aggregate (players, list counts, average rank per item) had no membership filter anywhere: a raider who left the guild still showed up as a lister, inflating demand. The view's ~180 lines of data-fetching moved into a new `lib/loot/master-sheet-summary.ts` (`loadMasterSheetSummary`), with one addition: right after reading approved submissions, it runs `findInvalidCharacterIds` plus `splitCandidatesByMembership` (the same helper #314 uses on the server) and only carries forward listers with an active membership. `already_awarded` is deliberately **not** filtered (OD-02): it answers "how many copies have been handed out," and those copies stay handed out whoever holds them now.

**Dashboard (`DashboardContent.tsx`, found in the survey, not named in the issue).** "N others want this," "you're #N," the low-competition quick wins, and "Tied with" all counted every approved lister in the guild with no membership check, the same gap as the master sheet had before #314. Two new pure helpers in `domain/loot/item-competition.ts` (`isActiveCompetitor`, `buildItemCompetition`) hold the existing per-item count-and-rank loop (GH #58's "use the viewer's best rank" rule kept intact) after dropping entries without an active membership; the viewer's own entries always count, even if a membership lookup were to misreport them. The competition read and the tied-raider read each call `findInvalidCharacterIds` for the active guild; a failed lookup leaves that one set of numbers empty for the current page load (no competition counts, or no tie names) without reaching the outer catch or showing an error toast, and the rest of the dashboard still loads normally.

## Task Commits

All four commits were made in a dedicated worktree on branch `fix/326-departed-raiders-read-views` (branched from `origin/main` at `5965bf10`):

1. **Task 1 (tracer): phase gate**: `d16080ab` (fix)
   - `filterItemsToEarnedPhases` now calls `findInvalidCharacterIds` before its approved-list read
   - 7 new tests (G1-G7): departed alt (`is_active` false, NULL, active only in another guild), active alt, the recorded call order and filtered ids, a lookup error (500), and the existing creator-bypass path
2. **Task 2 Steps A-B: addon export**: `955c2a83` (fix)
   - Removed the submissions-derived fallback; a membership read error throws; `stats.submissions` counts only exported members' approved lists
   - 5 new tests (X1-X5)
3. **Task 2 Steps C-D: Summary view**: `bdf16b5a` (fix)
   - New `lib/loot/master-sheet-summary.ts` (`loadMasterSheetSummary`), moved verbatim from `MasterSheetContent.tsx`'s Summary effect with the membership filter inserted between the approved-list read and the characters read
   - `MasterSheetContent.tsx`'s Summary effect now calls the loader, keeping its loading state, catch, notification text and deps array unchanged; the now-unused `aggregateListStats` import and `AggregateCharacterRow` interface were removed
   - 9 new tests (S1-S9), run against a fake client with the real `findInvalidCharacterIds` and `splitCandidatesByMembership` (not mocked)
4. **Task 3: dashboard, full verification, PR body**: `788445f4` (fix)
   - New `domain/loot/item-competition.ts` (`isActiveCompetitor`, `buildItemCompetition`); `DashboardContent.tsx`'s competition IIFE and tie read both call `findInvalidCharacterIds` before counting
   - 9 new tests for the pure helpers
   - Full suite run against the pre-change baseline, tsc, eslint, and the branch-diff gate; PR body draft written to SP (not committed)

No separate "plan metadata" commit was made in the worktree; this SUMMARY is handled by the orchestrator in the main checkout per this task's constraints.

## Files Created/Modified

- `app/api/master-sheet/visibility/route.ts`: `filterItemsToEarnedPhases` gates on `findInvalidCharacterIds(supabase, guildId, callerCharacterIds)` before the approved-list read; docblock updated
- `app/api/master-sheet/visibility/__tests__/route.test.ts`: 7 new tests (G1-G7) in a new describe block; all 16 tests in the file pass
- `app/api/addon/export-string/route.ts`: single active-membership read replaces the old try/fallback block; throws on a membership read error; `stats.submissions` recomputed against exported members
- `app/api/addon/export-string/__tests__/route.test.ts`: 5 new tests (X1-X5); `character_guild_memberships` fixture filtering now honours `is_active`; all 12 tests in the file pass
- `lib/loot/master-sheet-summary.ts`: new file, `loadMasterSheetSummary`, the Summary view's data loader with the active-member filter inserted
- `lib/loot/__tests__/master-sheet-summary.test.ts`: new file, 9 tests (S1-S9) against a fake client running the real `findInvalidCharacterIds` and `splitCandidatesByMembership`
- `app/(app)/master-sheet/components/MasterSheetContent.tsx`: Summary effect now calls `loadMasterSheetSummary`; removed now-dead `aggregateListStats` import and `AggregateCharacterRow` interface
- `domain/loot/item-competition.ts`: new file, `isActiveCompetitor` and `buildItemCompetition`, pure helpers holding the dashboard's existing competition/rank logic (GH #58 kept) after the active-membership filter
- `domain/loot/__tests__/item-competition.test.ts`: new file, 9 tests covering both helpers
- `app/(app)/overview/components/DashboardContent.tsx`: competition IIFE and the tie read both call `findInvalidCharacterIds`; `tiedCharacters` filter adds `isActiveCompetitor`

## Decisions Made

- **D-01 to D-09** (locked in the plan, implemented as specified): one shared rule (`findInvalidCharacterIds`) everywhere, server routes pass the service-role client, client views pass the browser client, `already_awarded` stays unfiltered, no migration, worktree-only delivery with the Claude Opus 5.5 trailer.
- **OD-01 (fix the dashboard here, or file as a follow-up?)** RESOLVED by the user, 2026-10-03: yes, fix here (Task 3). Same gap, same rule, raider-facing.
- **OD-02 (should "already awarded" still include copies given to raiders who later left?)** RESOLVED by the user, 2026-10-03: yes, keep counting them; only demand (lists, players, average rank) is filtered.
- **OD-03 (should the export dialog's "{n} submissions" count only lists of members in the export?)** RESOLVED by the user, 2026-10-03: yes, count only exported members.
- **COPY**: none added or changed (recorded in the plan; no sign-off needed). Numbers shown in existing places get smaller where they previously counted raiders who left. Existing error text is reused unchanged in every case.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `lib/loot/master-sheet-summary.ts`'s `loot_history` paginated read failed `tsc` with a loosely-typed `SupabaseClient<any, any, any>`**
- **Found during:** Task 2 Step D (writing the new Summary loader)
- **Issue:** With the `any`-schema client type (matching `guild-award-refs.ts`'s established pattern), Supabase's generated types for the aliased embed `loot_item:loot_items(wowhead_id)` resolved to an array shape rather than the single-object shape the real foreign key produces at runtime, so `paginatedSelect`'s generic argument did not type-check.
- **Fix:** Added a narrow `as unknown as PromiseLike<{ data: ... }>` cast on that one query, matching the shape the code already correctly handles at runtime. No other type widened.
- **Files modified:** `lib/loot/master-sheet-summary.ts`
- **Verification:** `npx tsc --noEmit` clean; the 9 Summary loader tests (S1-S9) pass, including S6 which exercises this exact read.
- **Committed in:** `bdf16b5a` (Task 2 commit)

**2. [Rule 1 - Bug] Import cleanup after moving the Summary effect's body out of `MasterSheetContent.tsx`**
- **Found during:** Task 2 Step D
- **Issue:** The initial edit accidentally dropped the `buildTeamVisibility` import, which is still used by two other effects in the file (the #165 team-filter logic at the Gargul export and a second block near line 1384), while correctly dropping the now-unused `aggregateListStats` import.
- **Fix:** Re-added `import { buildTeamVisibility } from '@/domain/loot/apply-team-filter'` before committing.
- **Files modified:** `app/(app)/master-sheet/components/MasterSheetContent.tsx`
- **Verification:** `npx tsc --noEmit` clean; `npx eslint` on the file shows 9 warnings, 0 errors, matching the measured baseline exactly.
- **Committed in:** `bdf16b5a` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1, caught and corrected before committing)
**Impact on plan:** Both were self-caught during the same task before any commit; no scope creep, no behavior change beyond what the plan specified.

## Issues Encountered

None beyond the two auto-fixed items above.

## Follow-ups (proposed, not filed)

- **FU-1 (most visible):** when a raider leaves or is kicked, their pending and approved lists become rejected automatically. The daily resubmit-reminder cron and the in-app needs-resubmit badge have no membership check, so a raider who left can still get up to three Discord DMs asking them to resubmit, and the badge can count a departed alt's rejected lists in a guild where another of the user's characters is active. This sends messages and stamps reminder counts, so it needs its own task rather than belonging to this read-only fix.
- **FU-2:** the addon export-string and guild-data payloads carry attendance (and BLP) entries for characters outside the exported `members[]`. Nothing displays them today; worth checking how the addon actually uses them before trimming.
- **FU-3:** addon `guild-data` (the companion app endpoint) ignores its membership read error (`members: []` on failure) and its other read errors; it should get the same error check this task adds to `export-string`.
- **FU-4 (low):** the overview setup guide's "lists submitted" step counts any approved list in the guild (it is a one-time boolean milestone, so the exposure is small).
- **FU-5 (low):** officer list pages (loot-submissions page, master-loot review) show lists of raiders who left with no marker; officers reviewing history still need to see them, so hiding is wrong, but a "left the guild" label could help.
- **FU-6** (not carried into the PR body, informational only): `app/api/loot-submissions/item-counts/route.ts` returns per-list row counts for any list ids to any signed-in user without checking the caller's guild. Low severity (counts only, no names), but worth a look separately.

## Survey of other read-only surfaces

| Surface | Counts raiders who left? | Classification |
|---|---|---|
| Master sheet Summary view | Yes | Fixed (this task) |
| Addon export members fallback | Yes, when no active membership is read | Fixed (this task) |
| Addon export dialog "{n} submissions" | Yes | Fixed (this task) |
| Master sheet phase gate | Yes, a departed alt's approved list | Fixed (this task) |
| Dashboard competition, "you're #N", low-competition quick wins, "Tied with" | Yes | Fixed (this task) |
| Master sheet Rankings, award modal, Raid mode, Gargul/CSV export | No | Already correct (fixed in #314) |
| Discord bot /priority | No | Already correct (fixed in #325) |
| Discord bot /score | No | Already correct |
| Addon guild-data (companion) | No | Already correct (error handling is FU-3) |
| Loot list page (own lists only) | No | Not affected |
| Loot history, audit log | Shows past awards to raiders who left | Intentionally unchanged: history stays history |
| Research report and week-4 queries | Counts lists approved inside a fixed historical window | Intentionally unchanged: a later departure must not change a published measure |
| Admin analytics, funnel milestones | Same as above | Intentionally unchanged |
| Overview setup guide "lists submitted" step | Can count one | FU-4 (low) |
| Officer list pages (loot-submissions page, master-loot review) | Shows them, no marker | FU-5 (low) |
| Resubmit reminder DMs and the needs-resubmit badge | Yes, and it messages them | FU-1 (not read-only) |

## Copy

None added or changed. Numbers shown in existing places get smaller where they previously counted raiders who left. Existing error text is reused unchanged: the Summary view's "Couldn't load aggregate data. Try refreshing the page." notification on a membership read failure, and the export dialog showing the route's existing 500 body ("Internal server error") through its existing `data.error` path.

## No migration

This task reads the existing `character_guild_memberships` table only. No schema change, no SQL migration, and no change to any response shape or the export payload shape. No `.env` file was read.

## Verification

- Baseline (pre-change, HEAD `5965bf10`): 175 test files, 3126 tests, 1 pre-existing unrelated FAIL (`__tests__/quality-brand-token-parity.test.ts`, a 5-second timeout on an existing brand-token-consumer scan, not touched by this task), `tsc --noEmit` exit 0. eslint baseline measured exactly as the plan predicted: 0 errors / 9 warnings (`MasterSheetContent.tsx`), 0 errors / 18 warnings (`DashboardContent.tsx`), 0 errors / 0 warnings on the two route files, so no gate adjustment was needed.
- Final (post-change, HEAD `788445f4`): 177 test files, 3156 tests, all passed (the baseline's flaky timeout test passed on this run).
- `sh SP/new-fails.sh baseline-gso-vitest.txt final-gso-vitest.txt`: 0 new FAIL lines, errors 0 vs 0, test file count 175 -> 177 (2 new files, no drop), exit 0.
- `npx tsc --noEmit`: clean.
- `npx eslint` on all ten changed files: 0 errors; `MasterSheetContent.tsx` 9 warnings, `DashboardContent.tsx` 18 warnings (both at baseline), the other eight files 0 warnings.
- `git diff --name-only origin/main...HEAD`: exactly the ten `files_modified` paths, nothing under `supabase/` or `.planning/`, `lib/database.types.ts` untouched.
- No em dash in any added line across the branch diff, the PR body draft, or this SUMMARY.
- `git status --porcelain`: clean.
- 4 commits on the branch, each carrying the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.
- Nothing pushed; no PR opened; no migration; no SQL run against a real database; no `.env` file read; `SP/wt354` and `SP/pglite-all` untouched.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced.

## Threat Flags

None beyond what the plan's own threat model already covers (`T-326-01` through `T-326-SC`), all mitigated by this task's tests or explicitly accepted with a stated reason (client views reading other raiders' membership rows they can already see; logs and thrown messages carrying no new ids).

## User Setup Required

None. No external service configuration required. No migration, no new environment variables.

## Next Phase Readiness

- The code is ready for a PR once the user reviews this SUMMARY and the PR body draft (`SP/pr326-body.md`, not committed; the orchestrator or a follow-up step should surface its content for the actual PR).
- Nothing was pushed and no PR was opened per this task's constraints; the branch `fix/326-departed-raiders-read-views` exists only in the worktree.
- FU-1 through FU-6 are candidates for future quick tasks; FU-1 is the most visible (raiders who left still get resubmit DMs) and should be picked up soon.

## Self-Check: PASSED

All 10 created/modified source files and the PR body draft were confirmed present on disk, and all 4 task commit hashes (`d16080ab`, `955c2a83`, `bdf16b5a`, `788445f4`) were confirmed present in the worktree's git history.

---
*Phase: quick-261003-gso*
*Completed: 2026-10-03*
