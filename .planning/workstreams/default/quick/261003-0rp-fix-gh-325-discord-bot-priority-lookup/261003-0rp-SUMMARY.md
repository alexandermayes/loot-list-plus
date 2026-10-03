---
phase: quick-261003-0rp
plan: 01
subsystem: api
tags: [discord-bot, nextjs, supabase, vitest, loot-scoring]

requires:
  - phase: quick-260929-n27
    provides: findInvalidCharacterIds (lib/loot/guild-award-refs.ts), the active-membership check the master sheet uses
  - phase: quick-260930-x3l
    provides: fetchReceivedCounts and pickReceivedEntries (lib/addon/member-ranked-items.ts, domain/loot/apply-receive-skip.ts), the received-copies skip
provides:
  - A working GET /api/bot/priority that reads approved loot lists through loot_submission_items instead of a loot_submissions.items column that has never existed
  - domain/loot/bot-item-priority.ts: splitBotTiers, collectItemCandidates, orderItemCandidates (pure, reused nowhere else yet)
  - resolveGuildFromDiscord throws on a query error instead of reading it as "no guild linked"
  - discord-bot priorityReply with the Ranks-off (C-1) and list-rank-footer (C-2) replies
affects: [discord-bot, bot-score-route, future-loot-score-pipeline]

actuals:
  tokens: 19336
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Bot read routes mirror the master sheet's visibility route: approved loot_submissions + live loot_submission_items, findInvalidCharacterIds for membership, fetchReceivedCounts/pickReceivedEntries for the received-copies skip"
    - "Officers' Loot and Ranks raid-tier toggles gate what a Discord slash command may search and may show, separate from auth"

key-files:
  created:
    - domain/loot/bot-item-priority.ts
    - domain/loot/__tests__/bot-item-priority.test.ts
    - app/api/bot/priority/__tests__/route.test.ts
    - app/api/bot/__tests__/helpers.test.ts
    - discord-bot/interactions.test.mjs
  modified:
    - app/api/bot/priority/route.ts
    - app/api/bot/_helpers.ts
    - discord-bot/interactions.js

key-decisions:
  - "D-01 to D-07: /priority's read path now mirrors the master sheet (approved loot_submissions + live loot_submission_items, active-member filter, received-copies skip across same-wowhead-id rows, Loot/Ranks tier gate, one line per raider by best remaining rank)"
  - "D-08: resolveGuildFromDiscord now throws on its own query error instead of silently reading it as no_guild_linked; its PR #360 ordering (oldest active guild by created_at then id) is unchanged"
  - "D-11/delivery: all work done in a dedicated worktree on fix/325-bot-priority-lookup, three atomic commits, no push, no PR opened, no migration"
  - "OD-01 (list rank vs Loot Score), OD-02 (guild-level Ranks gate vs per-raider gate) and OD-03 (one line per raider vs per copy) resolved by the user 2026-10-03: implemented as the plan's recommendation in each case (list rank with a footer; the Ranks switch decides, FU-2 stays a follow-up; one line per raider)"
  - "COPY C-1 and C-2 signed off verbatim by the user 2026-10-03; C-3 (retitling the embed) declined, the existing \"Top priority\" title stays"

requirements-completed: [GH-325-R1, GH-325-R2, GH-325-R3, GH-325-R4, GH-325-R5, GH-325-R6, BOT-VIS-R1, DELIVERY-R1]

coverage:
  - id: D1
    description: "/priority lists real, active raiders from approved loot lists, leaving out removed rows, departed raiders and copies already received"
    requirement: "GH-325-R1"
    verification:
      - kind: unit
        ref: "app/api/bot/priority/__tests__/route.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Officers' Ranks toggle hides rankings per raid tier; a Loot-on/Ranks-off tier answers 403 rankings_hidden instead of a false empty answer"
    requirement: "BOT-VIS-R1"
    verification:
      - kind: unit
        ref: "app/api/bot/priority/__tests__/route.test.ts#D-06"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every query the route makes checks its error and answers 500 instead of an empty or unfiltered list on failure"
    requirement: "GH-325-R4"
    verification:
      - kind: unit
        ref: "app/api/bot/priority/__tests__/route.test.ts#D-04"
        status: pass
    human_judgment: false
  - id: D4
    description: "resolveGuildFromDiscord throws on a query error instead of answering no_guild_linked"
    requirement: "GH-325-R6"
    verification:
      - kind: unit
        ref: "app/api/bot/__tests__/helpers.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "Discord bot replies explain hidden rankings (C-1) and footer the sort order (C-2); existing reply strings untouched"
    verification:
      - kind: unit
        ref: "discord-bot/interactions.test.mjs"
        status: pass
    human_judgment: false
  - id: D6
    description: "Full project suite shows no new failures versus the pre-change baseline; tsc and eslint clean on the eight changed files; branch diff is exactly those eight files; nothing pushed, no PR opened, no migration"
    requirement: "DELIVERY-R1"
    verification:
      - kind: other
        ref: "SCRATCH/l8o-new-fails.sh baseline-0rp-vitest.txt final-0rp-vitest.txt (exit 0, 0 new FAIL lines); npx tsc --noEmit; npx eslint <8 files>"
        status: pass
    human_judgment: false
  - id: D7
    description: "OD-01, OD-02 and OD-03 reach the user as open decisions with recommendations; C-1/C-2/C-3 copy reaches the user for sign-off"
    verification: []
    human_judgment: true
    rationale: "This is a product/UX decision (how /priority orders raiders, who may see rankings via Discord, and user-facing copy) that only the user can approve; already signed off 2026-10-03 per the plan's recorded SIGN-OFF, documented below for the record rather than re-litigated here."

duration: 55min
completed: 2026-10-03
status: complete
---

# Quick Task 261003-0rp: Fix GH #325, Discord bot /priority lookup Summary

**Rewrote GET /api/bot/priority to read approved loot lists through loot_submission_items (the column it used to query has never existed), added the Loot/Ranks tier gate and a received-copies skip, fixed a silent-error bug in the bot's guild lookup, and added C-1/C-2 Discord replies; with 42 new tests across four files.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 3
- **Files modified:** 8 (4 created new test files + 1 created domain file, 3 modified existing files)
- **Commits:** 3

## Findings: what /priority showed before, and what it shows now

**Before (since commit c50e647d, 2026-05-27):** `GET /api/bot/priority` queried `loot_submissions` for a jsonb `items` column. That column has never existed on `loot_submissions`: the baseline schema has no such column, no migration ever added one, and the generated database types don't list it either. The query's error was silently dropped (`const { data: submissions } = await supabase...` with no error check), so the code always saw an empty result. Every `/priority` lookup, for every item, in every guild, answered "No raiders have ranked this item." The command was advertised in the help article and the May 27 Updates post as showing "who ranks an item highest," but it never worked a single time in production.

The same silent-error pattern was present on four other reads in the route (`raid_tiers`, the `loot_items` fuzzy search, and `characters`), and the route had no active-membership filter at all, so even a working version would have listed raiders who had since left the guild.

**Now:** the route reads approved `loot_submissions` for the resolved guild plus their live (`removed_at IS NULL`) `loot_submission_items` rows, the same path the master sheet's visibility route already uses. A raider is listed only if their character has an active membership in the guild (`findInvalidCharacterIds`, the same check the award routes and master sheet use), and a raider who already received the item is skipped using the master sheet's own rule (`fetchReceivedCounts` + `pickReceivedEntries`), applied across every visible `loot_items` row sharing the item's real Wowhead id. Rankings are only searched in raid tiers with the officers' **Loot** toggle on, and only shown for tiers with **Ranks** on; a Loot-on/Ranks-off tier now answers `403 { error: 'rankings_hidden' }` instead of a false empty list. Every query the route makes checks its error and answers `500` on failure instead of an empty or unfiltered list. Raiders are ordered by raw loot list rank (not Loot Score; see Open Decisions), at most 5, one line per raider using their best remaining entry.

Separately, `resolveGuildFromDiscord` (in `app/api/bot/_helpers.ts`, shared by `/priority` and `/score`) was dropping its own query's error, so a database failure during guild lookup would read as "this Discord server isn't linked" rather than surfacing as a real error. It now throws on that error, so a database failure reaches the existing 500 handling instead. Its guild-resolution order (oldest active guild by `created_at` then `id`, from the recent Discord-links work, PR #360) is unchanged.

## Task Commits

All three commits were made in a dedicated worktree on branch `fix/325-bot-priority-lookup` (branched from `origin/main` at `8019a27d`):

1. **Task 1 (tracer): rewrite /priority's read path**: `7e3b8efb` (fix)
   - Added `domain/loot/bot-item-priority.ts` (three pure helpers: `splitBotTiers`, `collectItemCandidates`, `orderItemCandidates`)
   - Rewrote `app/api/bot/priority/route.ts`'s GET handler end to end
   - Added the tracer test proving an active raider is listed, a departed one is not, and a Ranks-off tier answers `rankings_hidden`
2. **Task 2: full behavior coverage + guild-lookup error fix**: `844bcd19` (test)
   - Added `domain/loot/__tests__/bot-item-priority.test.ts` (11 tests for the pure helpers)
   - Extended `app/api/bot/priority/__tests__/route.test.ts` with 30 more tests (34 total): removed rows, submission status, membership edge cases, received-copies skip across same-Wowhead-id rows, the Loot/Ranks gate, ordering, pagination (>1000 rows), every query-error path, and auth
   - Fixed `app/api/bot/_helpers.ts`'s `resolveGuildFromDiscord` to check and throw on its query's error
   - Added `app/api/bot/__tests__/helpers.test.ts` (8 tests for `checkBotAuth` and `resolveGuildFromDiscord`)
3. **Task 3: bot replies, full verification, PR body draft**: `d3c60dfb` (feat)
   - Added `priorityReply(res, itemQuery)` to `discord-bot/interactions.js`, covering every `/priority` answer including the new `rankings_hidden` case (C-1) and a footer on non-empty answers (C-2)
   - Added `discord-bot/interactions.test.mjs` (9 tests)
   - Ran the full suite against the pre-change baseline, tsc, eslint, and the branch-diff check
   - Wrote the PR body draft to SCRATCH (not committed)

No separate "plan metadata" commit was made in the worktree; this SUMMARY and STATE.md updates are handled by the orchestrator in the main checkout per the task's constraints.

## Files Created/Modified

- `domain/loot/bot-item-priority.ts`: pure `splitBotTiers`, `collectItemCandidates`, `orderItemCandidates`; imported by path, not added to `domain/loot/index.ts`
- `domain/loot/__tests__/bot-item-priority.test.ts`: 11 unit tests for the three helpers
- `app/api/bot/priority/route.ts`: rewritten GET handler: Loot/Ranks tier gate, approved-list read via `loot_submission_items`, active-member filter, received-copies skip, checked errors throughout, a local `selectAllPagesOrThrow` paginator
- `app/api/bot/priority/__tests__/route.test.ts`: 34 tests against an in-memory fake Supabase client that runs the real `findInvalidCharacterIds`, `fetchReceivedCounts` and `pickReceivedEntries`
- `app/api/bot/_helpers.ts`: `resolveGuildFromDiscord` now checks and throws on its query's error
- `app/api/bot/__tests__/helpers.test.ts`: 8 tests for `checkBotAuth` and `resolveGuildFromDiscord`
- `discord-bot/interactions.js`: added `priorityReply(res, itemQuery)` (exported alongside `handleInteractionCreate`), a `rankingsHiddenEmbed` helper, and a footer on `priorityEmbed`'s non-empty branch; existing title, item line, raider line and empty-state strings left byte-identical
- `discord-bot/interactions.test.mjs`: 9 tests covering every `priorityReply` branch

## Decisions Made

- **D-01 to D-07** (locked in the plan, implemented as specified): the read path mirrors the master sheet; active membership and received-copies rules are reused, not reimplemented; the Loot/Ranks gate controls both search and visibility separately; ordering is by raw list rank with one line per raider.
- **D-08**: `resolveGuildFromDiscord` throws on error; its existing ordering is unchanged and pinned by a new test.
- **OD-01: list rank vs. Loot Score** (RESOLVED by the user, 2026-10-03): implemented as the recommendation: raw list rank now, with the C-2 footer stating that, and a full server-side Loot Score pipeline as proposed follow-up FU-1. No server-side Loot Score exists today; it's computed client-side only, across ~300 lines in `MasterSheetContent`, from attendance, team overrides, guild settings, role/rank modifiers, trial status, item priorities, bad luck protection and donations.
- **OD-02: who may see rankings via Discord** (RESOLVED by the user, 2026-10-03): implemented as the recommendation: the guild-level Loot/Ranks toggles decide it, with no per-asker check. **This is the first time rankings can appear in Discord at all**, since the command never worked before; with Ranks on, anyone who can run `/priority` in that server sees the top 5, including non-members. FU-2 (mapping the asker to a LootList+ account and applying the web master sheet's per-raider #202 gate, with an ephemeral reply) remains a follow-up, not filed.
- **OD-03: one line per raider vs. per listed copy** (RESOLVED by the user, 2026-10-03): implemented as the recommendation: one line per raider, using their best remaining entry.
- **COPY**: C-1 and C-2 signed off verbatim by the user on 2026-10-03 and used exactly as drafted. C-3 (retitling the embed from "Top priority" to "Highest ranks for {item_name}") was declined; the existing title stays. The existing "Couldn't find an item matching **{itemQuery}**." reply is reused (no new copy) for the route's `no_items_in_expansion` and `no_active_expansion` answers, which previously fell through to the generic "try again" reply even though retrying couldn't help.

## Deviations from Plan

None. plan executed exactly as written. Task 1's Step B verification confirmed all of the plan's cited facts still held in the worktree (line numbers, exported function names, the approved-list query's location), so no wiring adaptation was needed.

**Orchestrator follow-up (2026-10-03):** two assertions in `discord-bot/interactions.test.mjs` quoted the existing bot strings with a literal em dash. They now use the `\u2014` escape (same string at runtime), so no added line in the branch contains an em dash. The Task 3 commit was amended in place (unpushed): 930630df became d3c60dfb. The 9 bot tests still pass.

## Issues Encountered

One self-caught bug during test-writing (not a deviation from the plan, since it was in test fixtures, not production code): the first version of the D-03 received-copies-skip test fixture omitted `guild_id` from synthetic `loot_history` award rows, so the route's `.eq('guild_id', guild.id)` filter silently excluded them and the test initially failed with the skip not applying. Fixed by adding `guild_id` to the `award()` test-fixture factory before the commit.

## Follow-ups (proposed, not filed)

- **FU-1**: a shared, server-side Loot Score pipeline so `/priority` can order by real Loot Score and `/score` can show the full score its own description promises (today it shows attendance only).
- **FU-2**: map the Discord asker to a LootList+ account, apply the web master sheet's per-raider phase gate (GH #202), and make the `/priority` reply ephemeral. This is how the OD-02 per-raider rule could reach Discord.
- **FU-3**: `/score` (`app/api/bot/score/route.ts`) ignores its own query errors and reads `raid_events` without pagination, so a guild with more than 1000 non-skipped raid events can lose rows. Investigated but not touched in this plan.
- **FU-4 (low)**: the bot auth token compare (`timingSafeEqual` in `app/api/bot/_helpers.ts`) returns early on a length mismatch; a fixed-length digest compare (e.g. SHA-256 + `node:crypto.timingSafeEqual`) would close that small timing gap. Investigated but not touched.

This plan also addresses item 2 of the pending todo `.planning/todos/pending/2026-09-28-fix-five-defects-found-in-the-forever-loot-code-review.md` (the todo file itself was not edited, per the plan's instruction).

## Deploy note

The server-side fix (the route rewrite, the guild-lookup fix) takes effect immediately once this branch is deployed. The Discord bot side (C-1 and C-2 replies) only takes effect once the bot is redeployed on Railway separately. Until that redeploy, a Ranks-off tier will show the bot's existing generic "LootList+ couldn't run that lookup. Try again in a sec." reply instead of the new C-1 message; the underlying rankings are still correctly hidden either way; this is a cosmetic gap only.

## Verification

- Baseline (pre-change, HEAD `8019a27d`): 168 test files, 3011 tests, all passed, 0 FAIL lines, `tsc --noEmit` exit 0.
- Final (post-change, HEAD `d3c60dfb`): 172 test files, 3071 tests, all passed, 0 FAIL lines.
- `sh SCRATCH/l8o-new-fails.sh baseline final`: 0 new FAIL lines, errors 0 vs 0, test file count 168 → 172 (no drop), exit 0.
- `npx tsc --noEmit`: clean.
- `npx eslint` on all eight changed files: clean, no warnings.
- `git diff --name-only origin/main...HEAD`: exactly the eight `files_modified` paths, nothing under `supabase/` or `.planning/`, `lib/database.types.ts` untouched.
- No em dash in any new line of `discord-bot/interactions.js` or in the PR body draft.
- `git status --porcelain`: clean (nothing left uncommitted in the worktree).
- 3 commits on the branch, each carrying the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.
- Nothing pushed; no PR opened; no migration.

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced.

## Threat Flags

None beyond what the plan's own threat model (`<threat_model>` in the PLAN) already covers; see `T-325-01` through `T-325-SC` there, all either mitigated by this plan's tests or explicitly accepted with a stated reason (OD-02's per-asker gap, the length-short-circuit key compare, ilike wildcard characters in item text).

## User Setup Required

None. no external service configuration required. No migration, no new environment variables.

## Next Phase Readiness

- The code is ready for a PR once the user reviews this SUMMARY and the PR body draft (`SCRATCH/pr325-body.md`, not committed; the orchestrator or a follow-up step should surface its content for the actual PR).
- Nothing was pushed and no PR was opened per this task's constraints; the branch `fix/325-bot-priority-lookup` exists only in the worktree.
- FU-1 through FU-4 are candidates for future quick tasks or a small follow-up milestone; none are blocking.
- The Discord bot itself still needs a separate Railway redeploy before C-1/C-2 copy reaches users (the server-side fix is independent and ships without that redeploy).

## Self-Check: PASSED

All 8 created/modified source files and the PR body draft were confirmed present on disk, and all 3 task commit hashes (`7e3b8efb`, `844bcd19`, `d3c60dfb`) were confirmed present in the worktree's git history.

---
*Phase: quick-261003-0rp*
*Completed: 2026-10-03*
