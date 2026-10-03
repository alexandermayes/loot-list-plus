---
phase: quick-261003-hv3
plan: 01
subsystem: api
tags: [cron, discord, supabase, loot-submissions, membership-check, vitest]

requires: []
provides:
  - "lib/loot/active-member-lists.ts: keepListsOfActiveMembers, a reusable per-list active-membership filter built on findInvalidCharacterIds"
  - "the resubmit-reminder cron and the needs-resubmit badge both exclude lists whose character left the list's guild"
affects: [resubmit-reminders-cron, needs-resubmit-badge, master-sheet-visibility, submit-route]

actuals:
  tokens: 13542
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Per-list active-membership filtering via findInvalidCharacterIds (same pattern as GH #314's master-sheet visibility fix), now reused a third time"

key-files:
  created:
    - lib/loot/active-member-lists.ts
    - lib/loot/__tests__/active-member-lists.test.ts
    - app/api/cron/resubmit-reminders/__tests__/route.test.ts
    - app/api/loot-submissions/needs-resubmit-count/__tests__/route.test.ts
  modified:
    - app/api/cron/resubmit-reminders/route.ts
    - app/api/loot-submissions/needs-resubmit-count/route.ts
    - domain/loot/resubmit.ts

key-decisions:
  - "OD-01 (user, 2026-10-03): suppression is per list (character in its own guild), never per account"
  - "OD-02 (user, 2026-10-03): a rejoined raider's lists count again for reminders and the badge; nothing is written to skipped lists so this needed no extra code"
  - "OD-03 (user, 2026-10-03): a failing membership check skips the cron's whole run, not just the affected guild(s)"
  - "Orchestrator-approved scope additions (A1-A3, 2026-10-03): the badge route fails closed on a characters-read error; the cron checks its candidate-read and stamp-update errors; the cron's fallback app URL changes to https://www.getlootlist.com"

patterns-established:
  - "keepListsOfActiveMembers<T extends { guild_id, character_id }>(supabase, lists) groups by guild, calls findInvalidCharacterIds once per guild, and filters - a reusable shape for any future surface that lists loot_submissions rows"

requirements-completed:
  - RESUB-R1
  - RESUB-R2
  - RESUB-R3
  - DELIVERY-R1

coverage:
  - id: D1
    description: "The daily resubmit-reminder cron DMs only about lists whose character has an active membership in that list's own guild; a departed raider gets no DM and no stamp"
    requirement: "RESUB-R1"
    verification:
      - kind: unit
        ref: "app/api/cron/resubmit-reminders/__tests__/route.test.ts#R1 (tracer): a departed character gets no DM and no stamp"
        status: pass
      - kind: unit
        ref: "app/api/cron/resubmit-reminders/__tests__/route.test.ts#R3 (D-01, same guild): only the still-active character in the pair is reminded and stamped"
        status: pass
      - kind: unit
        ref: "app/api/cron/resubmit-reminders/__tests__/route.test.ts#R4 (D-01, other guild): only the guild B list is reminded, and the departed guild name is absent"
        status: pass
    human_judgment: false
  - id: D2
    description: "The needs-resubmit badge (sidebar + dashboard alert) counts only lists of the caller's characters that are still active members of the guild"
    requirement: "RESUB-R2"
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/needs-resubmit-count/__tests__/route.test.ts#B1 (D-03): a departed alt is excluded, only the active main is counted"
        status: pass
      - kind: unit
        ref: "app/api/loot-submissions/needs-resubmit-count/__tests__/route.test.ts#B3: every character out of the guild answers count 0 with no loot_submissions call"
        status: pass
    human_judgment: false
  - id: D3
    description: "A failed membership read never sends an unfiltered DM or shows an unfiltered badge count; it answers 500 instead"
    requirement: "RESUB-R1"
    verification:
      - kind: unit
        ref: "app/api/cron/resubmit-reminders/__tests__/route.test.ts#R7 (D-04): a failing membership read answers 500 with nothing sent or stamped"
        status: pass
      - kind: unit
        ref: "app/api/loot-submissions/needs-resubmit-count/__tests__/route.test.ts#B4: a failing membership read answers 500 with the standard message"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every test runs the real findInvalidCharacterIds (and the real keepListsOfActiveMembers) against in-memory fakes; nothing under lib/loot is mocked"
    requirement: "RESUB-R3"
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/active-member-lists.test.ts (9 tests, H1-H6)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Orchestrator scope additions: badge fails closed on a characters-read error; cron checks candidate-read and stamp-update errors; cron fallback URL updated"
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/needs-resubmit-count/__tests__/route.test.ts#A1: a failing characters read answers 500 instead of an unfiltered count"
        status: pass
      - kind: unit
        ref: "app/api/cron/resubmit-reminders/__tests__/route.test.ts#A2: a failing candidate read answers 500 before any DM"
        status: pass
      - kind: unit
        ref: "app/api/cron/resubmit-reminders/__tests__/route.test.ts#A2: a failed stamp is logged, excluded from the count, and the run continues"
        status: pass
      - kind: unit
        ref: "app/api/cron/resubmit-reminders/__tests__/route.test.ts#A3: the fallback app URL is https://www.getlootlist.com when NEXT_PUBLIC_APP_URL is unset"
        status: pass
    human_judgment: false
  - id: D6
    description: "End-of-phase human verification that the sidebar badge and dashboard alert no longer count a departed alt's lists while still counting the active main's, on a preview deploy"
    verification: []
    human_judgment: true
    rationale: "Requires a live preview deploy and a real guild with a departed alt; the plan's <human-check> step, not run in this session (no deploy requested)"

duration: ~90min
completed: 2026-10-03
status: complete
---

# Quick Task 261003-hv3: Stop resubmit reminders and the needs-resubmit badge for departed raiders Summary

**New `keepListsOfActiveMembers` helper reuses the submit route's `findInvalidCharacterIds` check so the daily Discord resubmit-reminder cron and the sidebar/dashboard needs-resubmit badge both stop nagging raiders who left (or were kicked from) the guild, per list rather than per account.**

## Performance

- **Duration:** ~90 min
- **Tasks:** 3 (Task 1 tracer, Task 2 badge, Task 3 verification/PR body/summary)
- **Files modified:** 7 (3 created, 4 modified)
- **Commits:** 2 (both carry the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer)

## What was confirmed from the finding

All five facts the planner recorded were re-verified in WT at commit `f475b60e` before any edit:

1. **Fact 1 (cron, confirmed):** `app/api/cron/resubmit-reminders/route.ts` had no membership check anywhere; every candidate from the `NEEDS_RESUBMISSION_OR_FILTER` query (rejected lists + edited-after-submit drafts, not reminded within 72h, reminder count under 3) got a DM.
2. **Fact 2 (badge, confirmed):** `app/api/loot-submissions/needs-resubmit-count/route.ts` counted every character the user owns in the guild, so a departed alt's lists inflated the count even when the user's main was still active there.
3. **Fact 3 (auto-reject trigger, confirmed):** the `reject_submissions_on_cgm_loss` trigger rejects a departed character's pending/approved lists in that guild only, on `is_active` going false/NULL or an active row being deleted. It does not touch drafts, and it resets nothing for already-rejected lists.
4. **Fact 4 (reminder-field resets, confirmed):** submit/review/revert all reset `resubmit_reminded_at`/`resubmit_reminder_count` to null/0, so an auto-rejected list is a fresh reminder candidate (up to 3 DMs, 72h apart) the next daily run.
5. **Fact 5 (the rule to reuse, confirmed):** `lib/loot/guild-award-refs.ts findInvalidCharacterIds(supabase, guildId, ids)` is exactly what `app/api/loot-submissions/submit/route.ts` already uses to refuse a resubmit from a departed character ("Your character needs to rejoin this guild.").

## Before and after

**Cron (`GET /api/cron/resubmit-reminders`):** before, every rejected/edited-after-submit list across every guild and every user got a DM candidate with no membership check. After, candidates are filtered through `keepListsOfActiveMembers` (one `findInvalidCharacterIds` call per distinct guild among the candidates) immediately after the candidate read and before any characters/preferences/guilds read. A departed character's lists are dropped before a DM is ever built; the characters/guilds reads that follow only ever see kept ids.

**Badge (`GET /api/loot-submissions/needs-resubmit-count`):** before, the count query used every character id the user owns, unconditionally. After, the route calls `findInvalidCharacterIds(supabase, guildId, characterIds)` right after reading the user's characters, keeps only the ids that call does not return, and uses that narrowed list in the count query. If none of the user's characters are still active in the guild, it answers `{ count: 0 }` without querying `loot_submissions` at all (same shape as the existing no-character short-circuit).

## Per list, not per account (D-01/OD-01)

Both surfaces apply the rule to each list independently: a list counts only when its own `character_id` has an active membership in its own `guild_id`. This means:
- A user whose main is still active in a guild keeps getting reminded/counted for the main's lists there, even if an alt of theirs left that same guild (`R3`/`B1`/`B2`).
- A character that left guild A but is active in guild B keeps its guild B reminders and badge count; only its guild A lists are dropped, and the departed guild's name never appears in the DM (`R4`).

## Commits

1. `ffbdb3df` - `fix(cron): stop resubmit reminders for lists of raiders who left the guild` - new `lib/loot/active-member-lists.ts` + tests, cron wiring + tests, candidate-read error check, stamp-error handling, fallback URL change.
2. `025cece0` - `fix(loot-lists): needs-resubmit badge leaves out characters who left the guild` - badge route filtering + tests, characters-read error check, `domain/loot/resubmit.ts` docblock note.

Both commits are local to the WT worktree on branch `fix/resubmit-reminders-active-members`, based on `origin/main` at `f475b60e`. **Nothing was pushed; no PR was opened.**

## Verification against baseline

- **Baseline** (taken before any edit, HEAD `f475b60e`): `npx vitest run` - 176 test files / 3146 tests, `EXIT=0`. `npx tsc --noEmit` - `EXIT=0`. `npx eslint --max-warnings 0` on the three pre-existing files - `EXIT=0`, 0 errors/0 warnings.
- **Final** (HEAD `025cece0`): `npx vitest run` - 179 test files / 3178 tests, `EXIT=0` (all 32 new tests across 3 new files, no regressions). `sh new-fails.sh baseline final` reported `NEW FAIL lines: none`, exit 0.
- `npx tsc --noEmit` - clean. `npx eslint --max-warnings 0` on all seven `files_modified` paths - clean, 0 errors/0 warnings.
- `git diff --name-only origin/main...HEAD` lists exactly the seven `files_modified` paths; nothing under `supabase/` or `.planning/`; `lib/database.types.ts` untouched.
- No added line in `git diff origin/main...HEAD` contains an em dash (the two pre-existing em-dash lines the plan said to leave alone - the cron's "DMs disabled..." comment and `resubmit.ts` lines 4-5 - are untouched, confirmed by line-number diff).
- `git status --porcelain` clean; branch has no upstream configured. No push, no PR, no migration, no SQL against a real database, no `.env` read.

## Open decisions (OD-01 to OD-03) - resolved by the user 2026-10-03

| ID | Question | Recommendation | Resolution |
|----|----------|-----------------|------------|
| OD-01 | Suppress per list or per account? | Per list - matches the submit route's own check | Per list |
| OD-02 | Should a rejoined raider's auto-rejected lists count again? | Yes - nothing is written to skipped lists, so no extra code is needed | Yes |
| OD-03 | On a membership-check failure, skip the whole cron run or just the affected guild(s)? | Skip the whole run - avoids a raider getting two DMs on consecutive days from a per-guild retry | Skip the whole run |

No user-facing copy was added or changed, so no copy sign-off was needed.

## Orchestrator-approved scope additions (A1-A3, 2026-10-03)

These were previously filed as low-priority follow-ups (FU-4, FU-3, FU-2) and were brought into scope by the user before execution. All three are implemented and tested, not deferred:

- **A1 (badge characters-read error):** the badge route now checks the error of its read of the user's characters and throws into the existing catch (500 `Internal server error`) instead of silently proceeding with whatever came back. Test: `A1` in the badge route test file.
- **A2 (cron read/stamp error handling):** the cron's candidate read is now a hand-rolled paginated loop (rather than the error-swallowing `paginatedSelect` helper) that checks each page's error and returns 500 before any DM on failure. The reminder-stamp update loop now checks each chunk's error; a failed stamp is logged with a constant first argument and excluded from the reported `submissions` count, and the run continues rather than aborting. Tests: both `A2` cases in the cron route test file.
- **A3 (cron fallback URL):** `process.env.NEXT_PUBLIC_APP_URL || 'https://lootlistplus.com'` became `|| 'https://www.getlootlist.com'`, matching the fallback already used in `lib/billing/trial-ending.ts`. Test: `A3` in the cron route test file.

## Other flows checked (fact 6 table)

| Surface | Evidence | Same gap? | Classification |
|---|---|---|---|
| Resubmit reminder DM (cron) | fact 1 | Yes | Fixed |
| Needs-resubmit badge (sidebar + dashboard alert) | fact 2 | Yes, a departed alt's lists in a guild where another character is active | Fixed |
| Edited-after-submit drafts of a raider who left | `NEEDS_RESUBMISSION_OR_FILTER`, trigger leaves drafts alone | Yes | Fixed by the same filter |
| Lists an officer rejected before the raider left | trigger touches only pending/approved | Yes | Fixed by the same filter |
| Review outcome DMs | requires a pending list; a departed raider has none | No | Not affected |
| Officer new-submission DMs | sent after submit, which already requires an active membership | No | Not affected |
| Officer pending badge | pending lists of a raider who left move to rejected | No | Not affected |
| Loot list "Sent back for changes" banner, dashboard "Actions needed" | selected character's own lists only | Only if the saved active character is an alt that left | FU-1 (low, not fixed here) |
| Discord bot | no resubmit code | No | Not affected |
| Auto-reject trigger itself | fact 3 | n/a | Intentionally unchanged (already correct) |

## Proposed follow-ups (not filed)

- **FU-1 (low):** only `app/api/guilds/leave/route.ts` clears `user_active_characters`; a character-level leave (`characters/[id]/guilds`) or a kick (`guild-members`) does not. So the saved active character can be an alt that left while the guild stays selected through another character, and then the loot list banner / dashboard "Actions needed" card can still show that alt's auto-rejected lists. Not verified end to end in this session.
- FU-2 (cron fallback URL) and FU-3 (cron read/stamp error handling) were resolved in this PR via the A1-A3 scope additions above, not deferred.
- FU-4 (badge characters-read error) was also resolved via A1 above, not deferred.

## Copy

None. No user-facing string was added or changed; the DM text and the badge/alert text are byte-identical to before. Only the underlying counts and sends now exclude departed raiders.

## No migration / no SQL

No database change was made or needed. The `reject_submissions_on_cgm_loss` trigger is already correct and was not touched. No SQL was run against a real database; no `.env` file was read.

## Deviations from Plan

### Auto-fixed Issues

None beyond the orchestrator-approved scope additions (A1-A3), which were pre-authorized rather than discovered mid-execution, so they are documented above as planned scope rather than as Rule 1-3 deviations.

One implementation deviation from the plan's literal action text, both staying within the plan's intent:
- **The cron's candidate read** (D-07/A2): the plan's Step F described wiring `keepListsOfActiveMembers` in after "the existing paginated candidate read" using `paginatedSelect`. Because `paginatedSelect` silently drops query errors (by design, documented in `utils/supabase/paginate.ts`), and amendment A2 requires the candidate read to check its own error and halt with 500, the candidate read was reimplemented as a small hand-written paginated loop local to the route (same query shape, same filters, same page size) instead of calling the shared `paginatedSelect` helper. The shared helper itself was not modified, so no other caller is affected. This is a Rule 2 (missing critical functionality - error handling) addition, pre-authorized by the orchestrator as part of A2.

**Total deviations:** 1 (Rule 2, pre-authorized via orchestrator amendment A2)
**Impact on plan:** No scope creep; the change is confined to the cron route and does not touch the shared `paginatedSelect` helper or any of its other callers.

## Issues Encountered

One test-authoring issue, caught and fixed before any task commit: the cron route test file's `discordFetch` mock (created via the `vi.mock` factory) persisted its call history across `it` blocks because `vi.restoreAllMocks()` in `afterEach` restores spies but does not clear a factory-created `vi.fn()`'s call log. This caused five tests asserting `expect(discordFetch).not.toHaveBeenCalled()` to fail with stale call counts from earlier tests. Fixed by adding `vi.clearAllMocks()` to the top of `beforeEach`. Not a deviation from the plan (test-infrastructure-only, within Task 1's own test file, fixed before the task's commit).

## Next Phase Readiness

This quick task is self-contained; nothing further is required to land it. The branch (`fix/resubmit-reminders-active-members` in the WT worktree) is ready for the orchestrator to push and open a PR using the draft at `pr-body-hv3.md` whenever it chooses to.

---
*Quick task: 261003-hv3*
*Completed: 2026-10-03*
