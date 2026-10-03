---
phase: quick-261003-gso
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/api/master-sheet/visibility/route.ts
  - app/api/master-sheet/visibility/__tests__/route.test.ts
  - app/api/addon/export-string/route.ts
  - app/api/addon/export-string/__tests__/route.test.ts
  - lib/loot/master-sheet-summary.ts
  - lib/loot/__tests__/master-sheet-summary.test.ts
  - "app/(app)/master-sheet/components/MasterSheetContent.tsx"
  - domain/loot/item-competition.ts
  - domain/loot/__tests__/item-competition.test.ts
  - "app/(app)/overview/components/DashboardContent.tsx"
autonomous: true
requirements:
  - GH-326-R1
  - GH-326-R2
  - GH-326-R3
  - GH-326-R4
  - GH-326-R5
  - DASH-R1
  - DELIVERY-R1

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 140000
  raw_tokens: 140000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-02/GH-326-R3: in POST /api/master-sheet/visibility, filterItemsToEarnedPhases counts approved lists only from the caller's characters that findInvalidCharacterIds(supabase, guildId, callerCharacterIds) does not report, that is characters with an active membership in guild_id. An alt that left (is_active false or NULL, no row in this guild, or active only in another guild) no longer unlocks a phase. A membership read error returns 500. Officers, view_master_sheet holders and the guild creator still bypass the gate, and the caller membership gate at the top of POST is unchanged."
    - "D-03/GH-326-R2: GET /api/addon/export-string builds members only from character_guild_memberships rows of the guild with is_active true. The fallback that built members from every submission of any status is gone, so a guild with no active member exports members [] with 200. A membership read error returns 500 { error: 'Internal server error' } and calls trackApiError; it never exports an empty or derived roster."
    - "D-04/OD-03: the export's stats.submissions counts only approved lists whose character is in the exported members[]; stats.members and every label in the export dialog are unchanged."
    - "D-05/GH-326-R1: the master sheet Summary view gets its data from loadMasterSheetSummary in lib/loot/master-sheet-summary.ts. After the approved-list read it runs findInvalidCharacterIds(supabase, guildId, ids) and splitCandidatesByMembership, so players, total_lists and average_rank count active members only. A membership read error reaches the view's existing catch and its existing notification. Everything else the view did (items, removed rows, approved only, team filter, sorting input) behaves as before."
    - "D-06/OD-02: the Summary's already_awarded still counts every award of the item in the guild, including copies given to raiders who later left."
    - "D-07/DASH-R1/OD-01: on the dashboard, the 'others want this' count, 'you're #N', the low-competition quick wins and the 'Tied with' names leave out raiders that findInvalidCharacterIds reports for the active guild; the viewer's own entries always count. If that membership read fails, the dashboard shows no competition numbers and no tie names for that load (never unfiltered ones), and the rest of the dashboard still loads without a new error toast."
    - "D-01/GH-326-R4: every surface calls the real findInvalidCharacterIds from lib/loot/guild-award-refs.ts (no copy of the rule), and every surface has tests that run it unmocked against a fake client or feed its output to the pure helper: the visibility route test, the export-string route test, the master-sheet-summary test and the item-competition test."
    - "GH-326-R5: the SUMMARY and the PR body draft carry the surfaces table from the context below (fixed, already correct, intentionally unchanged, follow-up) and FU-1 to FU-5."
    - "D-09/DELIVERY-R1: the work is four commits in WT on fix/326-departed-raiders-read-views with the Claude trailer. git diff --name-only origin/main...HEAD lists exactly the ten files_modified paths: nothing under supabase/ or .planning/, and lib/database.types.ts untouched. Nothing is pushed and no PR is opened. The full vitest run shows no new FAIL lines against SP/baseline-gso-vitest.txt (SP/new-fails.sh exits 0), tsc is clean, eslint has 0 errors and no file above its baseline warning count, and no added line contains an em dash."
  artifacts:
    - path: "app/api/master-sheet/visibility/route.ts"
      provides: "Phase gate counts only the caller's active characters in the guild"
      contains: "findInvalidCharacterIds(supabase, guildId, callerCharacterIds)"
    - path: "app/api/master-sheet/visibility/__tests__/route.test.ts"
      provides: "Phase gate tests with a departed alt, plus the existing #314 tests"
      contains: "CALLER_ALT"
    - path: "app/api/addon/export-string/route.ts"
      provides: "Members from active memberships only, checked membership read, stats.submissions for exported members"
      contains: "membershipsError"
    - path: "app/api/addon/export-string/__tests__/route.test.ts"
      provides: "Departed member, no-active-member guild, membership read error and stats tests"
      contains: "membershipsError"
    - path: "lib/loot/master-sheet-summary.ts"
      provides: "loadMasterSheetSummary: the Summary view's reads, with the active-member filter"
      contains: "loadMasterSheetSummary"
    - path: "lib/loot/__tests__/master-sheet-summary.test.ts"
      provides: "Summary loader tests against a fake client running the real findInvalidCharacterIds"
      contains: "loadMasterSheetSummary"
    - path: "app/(app)/master-sheet/components/MasterSheetContent.tsx"
      provides: "Summary effect calls loadMasterSheetSummary; no inline Summary reads remain"
      contains: "loadMasterSheetSummary(supabase"
    - path: "domain/loot/item-competition.ts"
      provides: "Pure isActiveCompetitor and buildItemCompetition for the dashboard"
      contains: "buildItemCompetition"
    - path: "domain/loot/__tests__/item-competition.test.ts"
      provides: "Unit tests for both helpers"
      contains: "isActiveCompetitor"
    - path: "app/(app)/overview/components/DashboardContent.tsx"
      provides: "Competition and ties filtered through findInvalidCharacterIds"
      contains: "findInvalidCharacterIds(supabase, activeGuild.id"
  key_links:
    - from: "app/api/master-sheet/visibility/route.ts filterItemsToEarnedPhases"
      to: "lib/loot/guild-award-refs.ts findInvalidCharacterIds"
      via: "called first with every caller character id; only the rest feed the approved-list read"
      pattern: "findInvalidCharacterIds\\(supabase, guildId, callerCharacterIds\\)"
    - from: "lib/loot/master-sheet-summary.ts"
      to: "findInvalidCharacterIds and domain/loot/master-sheet-candidates.ts splitCandidatesByMembership"
      via: "between the approved-list read and the characters read"
      pattern: "splitCandidatesByMembership\\("
    - from: "app/(app)/master-sheet/components/MasterSheetContent.tsx Summary effect"
      to: "lib/loot/master-sheet-summary.ts loadMasterSheetSummary"
      via: "awaited inside the existing try/catch"
      pattern: "loadMasterSheetSummary\\(supabase"
    - from: "app/(app)/overview/components/DashboardContent.tsx loadLootPriority"
      to: "findInvalidCharacterIds and domain/loot/item-competition.ts"
      via: "competition IIFE calls buildItemCompetition with the departed ids; the ties filter calls isActiveCompetitor"
      pattern: "buildItemCompetition\\("
    - from: "app/api/addon/export-string/route.ts"
      to: "character_guild_memberships (eq guild_id, eq is_active true)"
      via: "the only member source; error checked"
      pattern: "membershipsError"
---

<objective>
Fix GH #326. Since #314 the master sheet's award candidates are active guild members only, but several read-only places still count raiders who left. This plan applies the award check's active-member rule (findInvalidCharacterIds in lib/loot/guild-award-refs.ts) to the three places the issue names and to one more read-only surface found in the same family (the dashboard's competition counts and ties), with tests for each surface. It also reports the other surfaces checked and the follow-ups found.

Purpose: officers planning loot from the Summary view, officers exporting to the addon, raiders checking "you're #N" on the dashboard, and the per-phase rankings gate should not count raiders who are no longer in the guild. Legacy approved lists of raiders who left still exist (lists approved before the 2026-09-30 status rules), which is what these views pick up.

Output: one route change for the phase gate, one route change for the addon export, one new lib loader for the Summary view (with MasterSheetContent calling it), one new pure domain helper for the dashboard (with DashboardContent calling it), tests for all of them, four commits in WT, a draft PR body in SP and a SUMMARY in MAIN. No push, no PR, no migration, no SQL.

Task decisions (locked, referenced by ID below):
- D-01: one rule everywhere. Each surface calls findInvalidCharacterIds(client, guildId, characterIds) from lib/loot/guild-award-refs.ts, the same check as the award routes, the loot_history trigger, the master sheet (#314) and the bot's /priority (#325). It dedupes, treats non-UUIDs as invalid, reads character_guild_memberships with eq guild_id, eq is_active true and in character_id in chunks of 100, throws on error and returns the ids with no active row. Do not copy the rule. Server routes pass their service-role client. The two client views (Summary, dashboard) pass their browser client: the viewer of those pages is an active member of the guild, which is what lets them read that guild's list rows in the first place, so the membership read sees the same rows.
- D-02 (issue item 3, phase gate): filterItemsToEarnedPhases in app/api/master-sheet/visibility/route.ts first calls findInvalidCharacterIds(supabase, guildId, callerCharacterIds) and keeps only the caller characters it does not return. With none left it returns []. Only the kept ids go into the approved-list read (loot_submissions select 'phase, expansion_id'). The error is not caught there; it reaches POST's catch (500). The bypass rules and the membership gate at the top of POST are unchanged.
- D-03 (issue item 2, export fallback): in app/api/addon/export-string/route.ts the members come only from the existing active-membership read (eq guild_id, eq is_active true; the same filter as findInvalidCharacterIds). Delete the fallback block that builds members from every submission of the guild. Applying the active-member rule to that block leaves nothing, because it only runs when no character has an active membership, so removing it IS the rule applied. Destructure the membership read's error as membershipsError and throw an Error (constant message, no ids) when it is set, so the existing catch answers 500 with trackApiError instead of exporting an empty or derived roster.
- D-04 (OD-03): stats.submissions counts approved submissions whose character_id is a character_id in the built payload's members[]. stats.members keeps its current value. No label changes.
- D-05 (issue item 1, Summary view): move the data reads of loadAggregateData (app/(app)/master-sheet/components/MasterSheetContent.tsx) into a new exported async function loadMasterSheetSummary(supabase, { guildId, activeTierIds, activeTeamId }) in lib/loot/master-sheet-summary.ts that returns LootListAggregateItem[]. Move the code as it is, with one addition: after the approved-list read, collect the distinct non-null character ids, call findInvalidCharacterIds(supabase, guildId, ids), pass the result to splitCandidatesByMembership (domain/loot/master-sheet-candidates.ts) with the approved submissions and the list rows, and use only the kept submissions, rows and characterIds from then on (the characters read uses the kept characterIds). The effect keeps its guard, loading state, catch, console.error and notification text exactly as they are and sets the returned array.
- D-06 (OD-02): already_awarded is not filtered. It counts copies handed out, and those stay handed out.
- D-07 (OD-01, dashboard): new pure helpers in domain/loot/item-competition.ts. isActiveCompetitor(characterId, inactiveCharacterIds, viewerCharacterId) and buildItemCompetition(entries, viewerCharacterId, inactiveCharacterIds), which holds the existing per-item count and rank loop from DashboardContent (GH #58 rule kept) after dropping entries that are not active competitors. The viewer's own entries always count. DashboardContent calls findInvalidCharacterIds(supabase, activeGuild.id, ids) once for the competition rows (inside the existing "competition data not critical" try/catch, so a failure leaves no competition numbers) and once for the tie rows (inside a new local try/catch that empties the tie rows on failure). Neither failure reaches the outer catch or shows a toast.
- D-08: no migration, no SQL, no new user-facing text (see COPY), no change to response shapes or the export payload shape.
- D-09: delivery. Work only in WT on fix/326-departed-raiders-read-views. Stage explicit paths only. Commit with the trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Do not push, open a PR, add a migration, run SQL against a real database, read any .env file, touch SP/wt354 or any other worktree, run git worktree prune, edit SP/pglite-all, or commit planning docs in WT. Compare the full vitest run against a clean baseline. Run tsc and eslint on the changed files.

Open decisions. They are surfaced in the SUMMARY and the PR body draft. The plan implements each recommendation. Do NOT fill the Resolution column; the user decides before this ships.

| ID | Question | Recommendation | Resolution |
|----|----------|----------------|------------|
| OD-01 | Fix the dashboard's competition numbers and tie names in this PR (not named in #326), or file them as a follow-up? | Fix here (Task 3). Same gap, same rule, raider-facing: a raider who left still raises "N others want this", pushes "you're #N" down, can hide an item from the low-competition quick wins, and can appear under "Tied with". The change is two call sites plus one pure helper. If the user says follow-up, skip Task 3 Steps A and B, keep Steps C to E, drop the three dashboard files from the diff gate, and list it as FU-0. | Yes, fix the dashboard in this PR (Task 3), user, 2026-10-03 |
| OD-02 | Should the Summary's "already awarded" count still include copies given to raiders who later left? | Yes, keep counting them. It answers "how many have been handed out", and those copies are gone whoever holds them now. Only demand (lists, players, average rank) is filtered. | Yes, keep awards to raiders who later left; filter demand only, user, 2026-10-03 |
| OD-03 | Should the addon export dialog's "{n} submissions" count only lists of members in the export? | Yes. Today it counts every approved list in the guild, including lists of raiders who left whose items are not in the export. The label text stays the same. | Yes, count only exported members, user, 2026-10-03 |

COPY: none. No user-facing string is added or changed. Numbers shown in existing places get smaller where they counted raiders who left. Existing error text is reused unchanged: the Summary view's "Couldn't load aggregate data. Try refreshing the page." notification on a membership read failure, and the export dialog showing the route's existing 500 body ("Internal server error") through its existing `data.error` path.

Source coverage:
| Source item | Task |
|---|---|
| GOAL: read-only views stop counting raiders who left (#326) | Task 1 (tracer), Task 2, Task 3 |
| Issue item 3, phase gate (D-02) | Task 1 |
| Issue item 2, export fallback (D-03), export stats (D-04, OD-03) | Task 2 Steps A-B |
| Issue item 1, Summary view (D-05, D-06, OD-02) | Task 2 Steps C-D |
| Extra surface in the family: dashboard (D-07, OD-01) | Task 3 Steps A-B |
| "a test per surface" (D-01, GH-326-R4) | Tasks 1, 2, 3 |
| Survey of other read-only surfaces and follow-ups (GH-326-R5) | context fact 6, Task 3 Steps D-E |
| D-08, D-09 | Task 1 Step A (baseline), Task 3 Step C (verification) |
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md

Paths (shell state does not persist between Bash calls; always use these absolute paths):
- MAIN = /Users/alexander.mayes/Code/personal/loot-list-plus. Only the SUMMARY is written here. Never edit code here.
- WT = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt326. It ALREADY EXISTS on branch fix/326-departed-raiders-read-views from origin/main 5965bf10, node_modules symlinked, clean. ALL code work happens here. Stage explicit paths only, never git add -A or git add .
- SP = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad. Baselines, final outputs and the PR body draft go here, all with "gso" or "326" in the name. SP/new-fails.sh already exists and is used unchanged (run from WT: sh SP/new-fails.sh <baseline> <final>; the final file's first line must be HEAD=<current HEAD>; both files end with EXIT=). The full vitest suite takes about 30 to 45 seconds.
- Do not touch SP/wt354 (another task is running there), any other worktree, or MAIN's source files. Never run git worktree prune. No SQL against a real database; do not read .env files. SP/pglite-all is not needed (no SQL or migration change); never edit it.

PUBLIC REPO: alexandermayes/loot-list-plus is public. Keep commit messages, code comments, the SUMMARY and the PR body draft to product behaviour. Add no database policy analysis to the PR body.

Facts the planner verified in WT at 5965bf10. Executor: re-check any line number with grep before quoting it.

1. Phase gate (issue item 3). app/api/master-sheet/visibility/route.ts (362 lines). Imports findInvalidCharacterIds (line 7) and splitCandidatesByMembership (line 8). filterItemsToEarnedPhases(supabase, guildId, itemIds, callerCharacterIds) at lines 18-110; its docblock (12-17) says one of the caller's characters must have an approved submission for the phase. Line 24 returns [] for no caller characters. The approved-list read is inside a Promise.all at lines 65-78: loot_submissions select 'phase, expansion_id', eq guild_id, eq status approved, in character_id callerCharacterIds. POST (143-362) builds callerCharacterIds from ALL of the user's characters (161-165, any guild), checks membership with a separate character_guild_memberships read selecting 'role' (170-175), bypasses the gate for the creator and for manage_loot or view_master_sheet holders (206-229), and calls filterItemsToEarnedPhases only for everyone else (231-242). The candidate filter from #314 (304-327) also calls findInvalidCharacterIds, selecting 'character_id'. POST's catch (358-361) logs with a constant first argument and returns 500 { error: 'Internal server error' }. Lines 27 and 119 contain existing comments with an em dash; do not edit those lines.
   The client-side gate in MasterSheetContent (approvedPhases, ~547-560 and ~671-681) uses only the selected character's own approved lists, so it is already stricter than the server and needs no change.

2. Addon export (issue item 2). app/api/addon/export-string/route.ts (456 lines). Officer-only via authorizeAddonGuild (verifyOfficerPermissions passes an active officer membership or the guild creator). Lines 131-193: `let memberships` is filled from the character_guild_memberships read (137-150, eq guild_id, eq is_active true, with the characters embed) when it returns rows; otherwise the block at 156-193 reads every loot_submissions row of the guild (any status), dedupes their character ids, reads those characters and invents 'Member' memberships for them. The membership read's error is never checked, so a failed read (data null) also lands in that block. Approved submissions are read at 195-206 with no membership or expansion filter; buildExportPayload only reads memberItems for members (members.map at ~383-404), so departed raiders' items are not exported, but stats.submissions (line ~322) counts all of them, and components/addon/AddonExportDialog.tsx line ~78 shows it as "{stats.submissions} submissions". The catch (~329-333) logs with a constant first argument, calls trackApiError and returns 500 { error: 'Internal server error' }; AddonExportDialog shows data.error on a non-ok answer. The fallback dates from commit 8de31239 (2026-03-07, the first addon endpoints).
   Tests: app/api/addon/export-string/__tests__/route.test.ts (423 lines) has a recording fake (makeClient, resolveRows). Its character_guild_memberships case filters by guild_id only and ignores is_active and errors; existing fixtures are all is_active true, so honouring an is_active filter is safe. Ids there are short strings ('g1', 'c1'), not UUIDs. Existing tests: GH #290 mirroring (2) and E1, E2, E3, E4, E1b (member items). app/api/addon/__tests__/companion-bearer-routes.test.ts calls this route only on its 401/403 paths, so it is unaffected but must still pass.

3. Summary view (issue item 1). MasterSheetContent.tsx (2171 lines, 'use client', browser client from createClient at line 216). The Summary effect is at lines 1031-1211: loadAggregateData returns early unless viewMode is 'aggregate', a phase is selected, guildId is set, canManageLoot is true and activeTierIds (phaseTiers with is_guild_active not false) is non-empty. Its reads, in order: loot_items (in raid_tier_id, eq is_available true, order boss_name then name); list rows via paginatedSelect (loot_submission_items select 'loot_item_id, rank, slot, submission_id', in loot_item_id, is removed_at null, order id, range); loot_submissions select 'id, character_id, status' in id eq status approved (no guild filter; items are guild-specific); characters select 'id, name, class:wow_classes(name, color_hex)' in id; raid_team_members (eq guild_id) only when activeTeamId is set, through buildTeamVisibility (#165); loot_history select 'loot_item:loot_items(wowhead_id)' eq guild_id via paginatedSelect for already_awarded by wowhead_id. It then builds one LootListAggregateItem per item, pushes players for rows of approved submissions whose character row exists and is team-visible, computes total_lists and average_rank with aggregateListStats (#293), and keeps items with total_lists > 0. Every early exit sets [] and loading false; the catch logs 'Error loading aggregate data:' and shows "Couldn't load aggregate data. Try refreshing the page." The deps are [viewMode, selectedPhase, phaseTiers, guildId, canManageLoot, activeTeamId]. No membership filter exists anywhere in it. The block has no em dash.
   Types: LootListAggregateItem is exported from app/components/LootListSummaryView.tsx (line 23); AggregateCharacterRow is a local interface at MasterSheetContent 158-162 used only by this effect; CharacterClass (131) is used elsewhere too. After the move, aggregateListStats (import line 14) and the AggregateCharacterRow interface are no longer used in MasterSheetContent; paginatedSelect and buildTeamVisibility still are (other effects).
   Current counts in MasterSheetContent (Task 2's verify relies on them): one read of loot_submission_items, one read of characters, two reads of loot_submissions, all of the first two inside this effect.
   LootListSummaryView.tsx renders the result and needs no change.

4. Dashboard (found in the survey). app/(app)/overview/components/DashboardContent.tsx (2512 lines, 'use client', browser client at line 449). loadLootPriority(characterIds) starts at 823; characterId = characterIds[0] (827); its outer catch (~1723-1726) shows "Couldn't load your loot priority. Try refreshing the page." Inside a Promise.all, the competition IIFE (comment "Competition: count others wanting the same items" at 1286) reads loot_submission_items with an inner submission embed (character_id, guild_id, status) filtered to the active guild, approved, removed_at null, via paginatedSelect; the loop at 1321-1354 groups rows by item and writes competitionMap[itemId] = { totalWanting, userRank } (GH #58 comment about using the viewer's best rank at ~1337, which contains an em dash); its catch at ~1356-1358 swallows errors ("Competition data not critical"). After the Promise.all, the tie read (~1424-1491) fetches same-rank rows for the viewer's items with the submission and character embeds into `let allSameRankSubmissions`; tiedCharacters (1516-1533) keeps rows whose character is not the viewer. competitionMap also feeds the low-competition quick wins (~1702-1721), and the render shows "you're #N" and "Tied with:" (~2295-2330). No membership check exists. The comment at 1287 contains an em dash; do not edit that line.

5. Reused helpers:
- lib/loot/guild-award-refs.ts findInvalidCharacterIds (line 99), described in D-01. It imports only a type, so client components may import it.
- domain/loot/master-sheet-candidates.ts splitCandidatesByMembership({ submissions, rankings, inactiveCharacterIds }) returns { submissions, rankings, characterIds, departedCharacterIds }; it drops null-character submissions and the rankings of dropped submissions and never mutates inputs.
- utils/supabase/paginate.ts paginatedSelect ignores errors (unchanged behaviour for the moved Summary reads; out of scope).
- Test analog with the real findInvalidCharacterIds: app/api/master-sheet/visibility/__tests__/route.test.ts (436 lines). "// @vitest-environment node", vi.mock of '@/utils/supabase/service-role' and '@/utils/supabase/server', UUID constants (last used suffix ...0013), a generic recording makeClient(tables, { failCgmSelect }) with eq, in, is, order (no-op), range, single and then, baseTables(overrides), and a raider-path test (~347-384) with guild_roles, loot_items, raid_tiers and expansions rows. Domain test style: domain/loot/__tests__/master-sheet-candidates.test.ts.

6. Survey of other read-only surfaces (report in the SUMMARY and PR body; change only the rows marked Fix):
| Surface | Evidence | Counts raiders who left? | Classification |
|---|---|---|---|
| Master sheet Summary view | fact 3 | Yes | Fix (D-05) |
| Addon export members fallback | fact 2 | Yes, when no active membership is read | Fix (D-03) |
| Addon export dialog "{n} submissions" | fact 2 | Yes | Fix (D-04, OD-03) |
| Master sheet phase gate | fact 1 | Yes, a departed alt's approved list | Fix (D-02) |
| Dashboard competition, "you're #N", low-competition quick wins, "Tied with" | fact 4 | Yes | Fix (D-07, OD-01) |
| Master sheet Rankings, award modal, Raid mode, Gargul/CSV export | visibility route since #314 | No | Already correct |
| Discord bot /priority | app/api/bot/priority/route.ts since #325 | No | Already correct |
| Discord bot /score | app/api/bot/score/route.ts ~43-47, active memberships only | No | Already correct |
| Addon guild-data (companion) | app/api/addon/guild-data/route.ts ~67-70, active memberships, no fallback | No | Already correct (error handling is FU-3) |
| Loot list page (LootListContext, /api/loot-list/bootstrap) | own lists only | No | Not affected |
| Loot history, audit log | award and change history | Shows past awards to raiders who left | Intentionally unchanged: history stays history |
| Research report and week-4 queries (scripts/analytics/queries/) | fixed historical windows | Counts lists approved inside the window | Intentionally unchanged: a later departure must not change a published measure |
| Admin analytics, funnel milestones (app/api/admin/analytics, utils/analytics/funnel.ts) | activation history | Same as above | Intentionally unchanged |
| Overview setup guide "lists submitted" step | app/(app)/overview/components/SetupGuide.tsx ~88-104, count of approved lists > 0 | Can count one | FU-4 (low) |
| Officer list pages (loot-submissions page, master-loot review) | management views with actions | Shows them | FU-5 (low): keep showing, maybe a "left the guild" marker |
| Resubmit reminder DMs and the needs-resubmit badge | app/api/cron/resubmit-reminders/route.ts, app/api/loot-submissions/needs-resubmit-count/route.ts | Yes, and it messages them | FU-1 (not read-only) |

Follow-ups (proposed, not filed):
- FU-1 (most visible): when a raider leaves or is kicked, their pending and approved lists become rejected automatically. The daily resubmit-reminder cron treats every rejected list as needing resubmission (NEEDS_RESUBMISSION_OR_FILTER in domain/loot/resubmit.ts) with no membership check, so a raider who left can get up to three Discord DMs (72 hours apart) asking them to resubmit for that guild. The in-app needs-resubmit badge also counts a departed alt's rejected lists in a guild where another of the user's characters is active. It sends messages and stamps reminder counts, so it is not in this read-only family: its own task should filter candidates per guild through findInvalidCharacterIds, with tests.
- FU-2: the addon export-string and guild-data payloads carry attendance (and BLP) entries for characters outside members[] (the attendance map is built from members plus every attendance record). Nothing displays them; check how the addon uses them before trimming.
- FU-3: addon guild-data ignores its membership read error (members [] on failure) and its other read errors; apply D-03's error check there.
- FU-4: the setup guide's "lists submitted" step counts any approved list in the guild (low; a boolean milestone).
- FU-5: officer list pages show lists of raiders who left with no marker (low).
SUMMARY only, not the PR body: the item-counts route (app/api/loot-submissions/item-counts/route.ts) returns per-list row counts for any list ids to any signed-in user without checking the caller's guild (low; counts only). Mention it as FU-6 in the SUMMARY.

Test patterns: see fact 5. Client modules under lib/ and domain/ are tested in the default jsdom environment; route tests start with "// @vitest-environment node".

CodeQL blocks tainted format strings: the first argument of any console.* call must be a constant string; pass dynamic values as later arguments. Log no names or ids. No em dash in any new or changed line, comment, commit message, SUMMARY or PR body.
</context>

<tasks>

<task type="tracer">
  <name>Task 1 (tracer): a departed alt's approved list no longer unlocks a master sheet phase, end to end through POST /api/master-sheet/visibility and the real findInvalidCharacterIds</name>
  <files>app/api/master-sheet/visibility/route.ts, app/api/master-sheet/visibility/__tests__/route.test.ts</files>
  <action>
Step A, baseline (D-09). Confirm git -C WT branch --show-current prints fix/326-departed-raiders-read-views and git -C WT status --short is empty. Before ANY edit, from WT run, as one foreground Bash command with a 600000 ms timeout: { echo "HEAD=$(git rev-parse HEAD)"; npx vitest run; echo "EXIT=$?"; } > SP/baseline-gso-vitest.txt 2>&1. Then npx tsc --noEmit > SP/baseline-gso-tsc.txt 2>&1, then echo "EXIT=$?" >> SP/baseline-gso-tsc.txt. Then record the eslint baseline: npx eslint --max-warnings 9 "app/(app)/master-sheet/components/MasterSheetContent.tsx" and npx eslint --max-warnings 18 "app/(app)/overview/components/DashboardContent.tsx" and npx eslint --max-warnings 0 app/api/master-sheet/visibility/route.ts app/api/addon/export-string/route.ts must all exit 0 (the planner measured 0 errors and 9, 18, 0, 0 warnings); save their output to SP/baseline-gso-eslint.txt. If any count differs, use the measured counts in every later --max-warnings gate and say so in the SUMMARY. Then touch SP/baseline-gso-done. Note the file and test counts and any FAIL lines for the SUMMARY.

Step B, executor verifies first. grep WT to confirm context facts 1, 2, 3 and 4 still hold (line ranges, the approved-list read in filterItemsToEarnedPhases, the membership fallback block in export-string, the Summary effect, the dashboard competition loop and tie read). If anything differs, adapt the wiring (not the rules) and note it in the SUMMARY.

Step C, route (D-01, D-02). In filterItemsToEarnedPhases, after the existing empty-input return, call await findInvalidCharacterIds(supabase, guildId, callerCharacterIds) (do not catch it), keep the caller ids it does not return in a const named activeCallerCharacterIds, return [] when that is empty, and use activeCallerCharacterIds (not callerCharacterIds) in the approved-list read's in('character_id', ...). Change nothing else in the function or in POST. Update the function's docblock: one of the caller's characters with an active membership in this guild (the same check as the award routes, findInvalidCharacterIds) must have an approved submission for the phase; an alt that left does not count (GH #326). Optionally add one sentence to the POST docblock paragraph about the per-phase gate saying the same. Do not touch lines 27 or 119.

Step D, tests first where new (RED, then GREEN). In app/api/master-sheet/visibility/__tests__/route.test.ts add a describe block "GH #326: the phase gate counts only the caller's active characters". Add const CALLER_ALT = 'aaaaaaaa-0000-0000-0000-000000000014' (owned by USER_ID). Base the fixture on the existing raider-path test: guild created by OTHER_USER, CALLER_CHAR active with role 'Member', guild_roles Member position 0 with no permissions, ITEM in TIER_ID phase 1 master_sheet_visible true, EXP_ID with phase_groups null, ACTIVE_CHAR with an approved phase 1 list ranking ITEM. Add CALLER_ALT to characters. CALLER_CHAR has NO approved list; CALLER_ALT has an approved phase 1 list in GUILD (id 'sub-alt'). Cases:
- G1 (tracer): CALLER_ALT's membership in GUILD has is_active false. Expect 200 and four empty arrays (rankings, submissions, characters, memberships). This fails before Step C.
- G2: CALLER_ALT is_active true. Expect 200 and body.characters ids exactly [ACTIVE_CHAR]. ('sub-alt' has no loot_submission_items row, so it only unlocks the phase; the loot_submissions fixture rows carry phase 1 and expansion_id EXP_ID.)
- G3: CALLER_ALT is_active null. Expect the empty answer.
- G4: CALLER_ALT has no membership row in GUILD but an active one in OTHER_GUILD. Expect the empty answer.
- G5: in the G1 setup, the recorded calls contain a character_guild_memberships call with select 'character_id', filters eq guild_id GUILD, eq is_active true and in character_id containing both CALLER_CHAR and CALLER_ALT, and it comes before the loot_submissions call with select 'phase, expansion_id', whose in character_id filter is exactly [CALLER_CHAR].
- G6: G1's tables with failCgmSelect 'character_id'. Expect 500 and { error: 'Internal server error' }. Silence console.error with a spy and restore it.
- G7: the creator path from baseTables (the existing bypass) records no loot_submissions call with select 'phase, expansion_id'.
All existing tests in the file must still pass unchanged.

Commit in WT (explicit paths) with a message such as "fix(master-sheet): only active characters unlock a phase in the rankings gate (#326)" and the trailer "Co-Authored-By: Claude Opus 5.5 &lt;noreply@anthropic.com&gt;".
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt326 && test -f ../baseline-gso-done && grep -q '^EXIT=' ../baseline-gso-vitest.txt && head -1 ../baseline-gso-vitest.txt | grep -q '^HEAD=5965bf10' && npx vitest run app/api/master-sheet/visibility/__tests__/route.test.ts lib/loot/__tests__/guild-award-refs.test.ts domain/loot/__tests__/master-sheet-gate.test.ts domain/loot/__tests__/master-sheet-candidates.test.ts && npx tsc --noEmit && grep -c "findInvalidCharacterIds(supabase, guildId, callerCharacterIds)" app/api/master-sheet/visibility/route.ts && grep -c "CALLER_ALT" app/api/master-sheet/visibility/__tests__/route.test.ts && npx eslint --max-warnings 0 app/api/master-sheet/visibility/route.ts app/api/master-sheet/visibility/__tests__/route.test.ts && test "$(git log origin/main..HEAD --format=%B | grep -c 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')" -ge 1</automated>
  </verify>
  <done>Baselines (vitest, tsc, eslint) are in SP and were taken before any edit. filterItemsToEarnedPhases checks the caller's characters with the real findInvalidCharacterIds before reading approved lists. Tests prove a departed alt (false, NULL, other guild only) no longer unlocks a phase, an active alt still does, a lookup error answers 500, bypass callers never run the gate, and the #314 tests still pass. tsc and eslint are clean and the work is committed.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: the addon export takes members from active memberships only, and the master sheet Summary view leaves out raiders who left</name>
  <files>app/api/addon/export-string/route.ts, app/api/addon/export-string/__tests__/route.test.ts, lib/loot/master-sheet-summary.ts, lib/loot/__tests__/master-sheet-summary.test.ts, app/(app)/master-sheet/components/MasterSheetContent.tsx</files>
  <behavior>
    - Export X1 (D-03): c1 active and c2 with is_active false, both with an approved list. payload.members character ids are exactly ['c1']; no member entry or items for c2.
    - Export X2 (D-04, OD-03): in X1, stats.submissions is 1 (c1's approved list only) and stats.members is 1.
    - Export X3 (D-03): a guild whose only membership row is inactive, with an approved, a draft and a rejected list from three characters, answers 200 with payload.members [], stats.members 0 and stats.submissions 0. No call to the characters table and no loot_submissions call whose select is exactly 'character_id' is recorded.
    - Export X4 (D-03): a failing membership read (fixture flag membershipsError) answers 500 { error: 'Internal server error' }, calls trackApiError once and returns no exportString.
    - Export X5: the recorded character_guild_memberships call has filters ['guild_id', GUILD_ID] and ['is_active', true].
    - Export: the existing GH #290, E1, E2, E3, E4 and E1b tests pass unchanged, and companion-bearer-routes.test.ts still passes.
    - Summary S1 (D-05): ACTIVE (is_active true) and DEPARTED (is_active false) both have approved lists ranking ITEM. The result has one item whose players are only ACTIVE, total_lists 1 and average_rank equal to ACTIVE's rank.
    - Summary S2: a character with is_active null, one with no membership row in GUILD but an active row in OTHER_GUILD, and a submission with character_id null are all absent.
    - Summary S3: when every lister has left, the result is [].
    - Summary S4: draft, pending and rejected lists and removed rows never count (existing behaviour pinned).
    - Summary S5: the recorded membership read has eq guild_id GUILD, eq is_active true and in character_id containing every approved lister, and the characters read's in id holds only the active ids.
    - Summary S6 (D-06, OD-02): a loot_history award of ITEM's wowhead id to DEPARTED still counts in already_awarded.
    - Summary S7 (#165): with activeTeamId TEAM_A, an active raider on TEAM_B is absent and an active raider on no team is kept.
    - Summary S8 (contract, D-01): the set of player character ids equals the approved listers minus findInvalidCharacterIds run on the same fake for GUILD.
    - Summary S9 (D-05): a failing membership read makes loadMasterSheetSummary reject, and no characters read is recorded after it.
  </behavior>
  <action>
Write the new tests first; behaviour that is new must be seen failing (RED) before the code changes.

Step A, export tests. In app/api/addon/export-string/__tests__/route.test.ts: add membershipsError?: boolean to the Fixture interface. In resolveRows, make the character_guild_memberships case also honour an is_active filter when one was recorded (strict equality). In makeClient's then, when the table is character_guild_memberships and fixture.membershipsError is true, resolve { data: null, error: { message: 'cgm boom' } }. Import trackApiError from '@/utils/analytics/server' (already mocked) to assert calls. Add a describe block "GH #326: export members come from active memberships only" with X1 to X5 from the behavior list, reusing baseFixture() and adding a c2 (and c3 for X3) membership, character and submission rows in the same shape as c1's. Silence console.log and console.error with spies and restore them.

Step B, export route (D-03, D-04). In app/api/addon/export-string/route.ts replace lines ~131-193 with a single read: keep the existing character_guild_memberships query unchanged, destructure { data: activeMemberships, error: membershipsError }, throw an Error with a constant message (for example "Failed to read guild memberships for the addon export") when membershipsError is set, and set const memberships = activeMemberships ?? [] with the same element type as before. Keep a console.log of the membership count (constant first argument). Delete the whole fallback branch that builds members from the guild's submissions, including its loot_submissions and characters reads and its console.log lines. Replace the old comment "try new table first, fall back..." with one saying members are the guild's active memberships, the same rule as the award check (findInvalidCharacterIds), and that a guild with no active member exports no members (GH #326). In the stats object, compute submissions as the number of approved submissions whose character_id is one of payload.members' character_id values (D-04). Change nothing else (payload shape, attendance, BLP, priorities, logs). Commit (explicit paths) with a message such as "fix(addon): export members from active memberships only and fail on a membership read error (#326)" and the trailer.

Step C, Summary tests. Create lib/loot/__tests__/master-sheet-summary.test.ts (default jsdom environment is fine; no next/server import). Import loadMasterSheetSummary from '@/lib/loot/master-sheet-summary' and the real findInvalidCharacterIds. Do NOT mock guild-award-refs or master-sheet-candidates. Build a generic recording fake like the visibility test's makeClient (eq, in, is, order no-op, range, then, plus options.fail as a list of { table, select } that resolve { data: null, error: { message: 'boom' } }), with UUID-shaped constants. Fixture tables: loot_items rows (id, name, boss_name, item_slot, wowhead_id, classification, raid_tier_id, is_available true, is_loot_council false), loot_submission_items rows (id, loot_item_id, rank, slot, submission_id, removed_at), loot_submissions rows (id, character_id, status, guild_id), character_guild_memberships rows (character_id, guild_id, is_active), characters rows with class: { name, color_hex } embedded, raid_team_members rows (character_id, raid_team_id, guild_id), loot_history rows (guild_id, loot_item: { wowhead_id }). Call loadMasterSheetSummary(client as never, { guildId: GUILD, activeTierIds: [TIER], activeTeamId: null or TEAM_A }). Cover S1 to S9.

Step D, Summary loader and wiring (D-05, D-06). Create lib/loot/master-sheet-summary.ts with a header comment (master sheet Summary view data: demand per item from approved lists of active members, GH #326) and export async function loadMasterSheetSummary(supabase: SupabaseClient&lt;any, any, any&gt; (type-only import from '@supabase/supabase-js', with the same eslint-disable comment for no-explicit-any that guild-award-refs.ts uses), input: { guildId: string; activeTierIds: string[]; activeTeamId: string | null }): Promise&lt;LootListAggregateItem[]&gt;, importing the type from '@/app/components/LootListSummaryView'. Move the body of loadAggregateData's try block into it as it is: the loot_items read, the paginated list-row read, the approved-list read, the characters read, the team filter, the paginated loot_history read and the aggregate build with aggregateListStats. Each early exit returns []. Move the AggregateCharacterRow shape with it as a local type. Insert the D-05 step between the approved-list read and the characters read: distinct non-null character ids of the approved submissions, then const inactiveCharacterIds = await findInvalidCharacterIds(supabase, guildId, ids) (not caught), then splitCandidatesByMembership({ submissions, rankings: the list rows, inactiveCharacterIds }); if its characterIds is empty return []; from here on use its submissions for approvedSubmissionIds and submissionsById, its rankings for the player loop, and its characterIds for the characters read. Do not filter the loot_history read (D-06). Add a JSDoc that says what is counted, that raiders without an active membership are left out using the award check's rule, that already_awarded counts every award (OD-02), and that a membership read error throws. Any moved comment must contain no em dash.
In MasterSheetContent.tsx replace the moved body with: keep the early-return guard and setAggregateLoading(true); inside the existing try, setAggregateItems(await loadMasterSheetSummary(supabase, { guildId, activeTierIds, activeTeamId })); keep the catch exactly as it is (console.error, the existing notification, setAggregateItems([])) and setAggregateLoading(false) after it. Keep the deps array unchanged. Import loadMasterSheetSummary. Remove the aggregateListStats import and the AggregateCharacterRow interface if nothing else uses them (fact 3). No other change in the file.
Commit (explicit paths) with a message such as "fix(master-sheet): leave raiders who left out of the Summary view (#326)" and the trailer.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt326 && npx vitest run app/api/addon/export-string/__tests__/route.test.ts app/api/addon/__tests__/companion-bearer-routes.test.ts lib/loot/__tests__/master-sheet-summary.test.ts domain/loot/__tests__/master-sheet-candidates.test.ts app/api/master-sheet/visibility/__tests__/route.test.ts && npx tsc --noEmit && ! grep -n "Derive members from characters" app/api/addon/export-string/route.ts && grep -c "membershipsError" app/api/addon/export-string/route.ts && grep -c "findInvalidCharacterIds(supabase, guildId" lib/loot/master-sheet-summary.ts && grep -c "splitCandidatesByMembership(" lib/loot/master-sheet-summary.ts && grep -c "loadMasterSheetSummary(supabase" "app/(app)/master-sheet/components/MasterSheetContent.tsx" && test "$(grep -c "from('loot_submission_items')" "app/(app)/master-sheet/components/MasterSheetContent.tsx")" -eq 0 && test "$(grep -c "from('characters')" "app/(app)/master-sheet/components/MasterSheetContent.tsx")" -eq 0 && npx eslint --max-warnings 9 "app/(app)/master-sheet/components/MasterSheetContent.tsx" && npx eslint --max-warnings 0 app/api/addon/export-string/route.ts app/api/addon/export-string/__tests__/route.test.ts lib/loot/master-sheet-summary.ts lib/loot/__tests__/master-sheet-summary.test.ts && test "$(git log origin/main..HEAD --format=%B | grep -c 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')" -ge 3</automated>
    <human-check>End of phase, on a preview deploy: as an officer of a guild where a raider who left still has an approved list, open Master Sheet, switch to Summary, and confirm that raider is not listed and the item's list count dropped by one, while "already awarded" is unchanged. Generate the addon export and confirm the members and submissions counts.</human-check>
  </verify>
  <done>The export builds members only from active memberships, has no fallback, answers 500 on a membership read error, and counts submissions for exported members only. The Summary view reads through loadMasterSheetSummary, which leaves out raiders who left with the real findInvalidCharacterIds and splitCandidatesByMembership and still counts every award. MasterSheetContent keeps its loading, error text and deps. Every behavior line is a passing test; tsc and eslint gates pass; two more commits with the trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: dashboard competition counts and ties leave out raiders who left; full verification against the baseline, PR body draft and SUMMARY (no push, no PR)</name>
  <files>domain/loot/item-competition.ts, domain/loot/__tests__/item-competition.test.ts, app/(app)/overview/components/DashboardContent.tsx</files>
  <behavior>
    - isActiveCompetitor returns true for the viewer's character id even when it is in the inactive set; false for null, undefined and ''; false for an id in the inactive set; true for any other id.
    - buildItemCompetition with the viewer at rank 30, active A at 40 and departed D at 45 on item X (D in the inactive ids) gives X: { totalWanting: 1, userRank: 2 }. Without D in the inactive ids it gives { totalWanting: 2, userRank: 3 } (the old numbers).
    - An entry with a null or empty character id is not counted.
    - GH #58 kept: the viewer listing X at 40 and 10 and another raider at 20 gives { totalWanting: 1, userRank: 1 }.
    - When the viewer has no entry on an item, userRank equals the number of active listers (the existing rule) and totalWanting counts them.
    - Passing the inactive ids as an array or as a Set gives the same result, and the input entries array is not mutated.
  </behavior>
  <action>
OD-01 gate: if the user resolved OD-01 as "follow-up" before execution, skip Steps A and B, remove the three dashboard files from the Step C diff gate, and record it in the SUMMARY as FU-0. Otherwise do every step.

Step A, helper and tests first (D-07). Create domain/loot/__tests__/item-competition.test.ts in the style of master-sheet-candidates.test.ts covering every behavior line; see it fail. Then create domain/loot/item-competition.ts with a header comment (dashboard "others want this", "you're #N" and ties: only raiders with an active membership count, GH #326) and two exported pure functions, imported by path (not added to domain/loot/index.ts):
- isActiveCompetitor(characterId: string | null | undefined, inactiveCharacterIds: ReadonlySet&lt;string&gt;, viewerCharacterId: string): boolean, per the behavior list.
- buildItemCompetition(entries: Array&lt;{ loot_item_id: string; character_id: string | null; rank: number }&gt;, viewerCharacterId: string, inactiveCharacterIds: Iterable&lt;string&gt;): Record&lt;string, { totalWanting: number; userRank: number }&gt;. It keeps only entries for which isActiveCompetitor is true, then runs the existing loop from DashboardContent (~1321-1354: group by item, unique characters, othersCount, the viewer's best rank per the GH #58 comment, userRank) unchanged in logic. Rewrite the moved GH #58 comment without an em dash. JSDoc: inputs are not mutated; the viewer always counts.

Step B, dashboard wiring (D-01, D-07). In DashboardContent.tsx import findInvalidCharacterIds from '@/lib/loot/guild-award-refs' and both helpers.
- Competition IIFE: after the paginated read, when rows exist, flatten them into entries { loot_item_id, character_id, rank } (skipping rows with no submission, as today), collect the distinct non-empty character ids other than characterId, call await findInvalidCharacterIds(supabase, activeGuild.id, thoseIds) when there are any (else use []), then Object.assign(competitionMap, buildItemCompetition(entries, characterId, departed)). Remove the old inline loop. Keep the existing catch: a lookup error leaves competitionMap empty, as any competition read error does today.
- Ties: declare let departedTieIds: ReadonlySet&lt;string&gt; = new Set() before the tie read. Right after allSameRankSubmissions is assigned from the batched read, collect the distinct non-empty submission character ids other than characterId (the embed may be an object or an array, as the existing code handles), and in a new local try/catch set departedTieIds from await findInvalidCharacterIds(supabase, activeGuild.id, thoseIds) when there are any. In the catch, log with a constant first argument (for example "Dashboard ties: membership check failed:") and set allSameRankSubmissions to [], so no tie names show and nothing reaches the outer catch. In the tiedCharacters filter, keep the existing viewer check and also require isActiveCompetitor(submission?.character_id, departedTieIds, characterId).
- Change nothing else. Do not edit the comment line at ~1287.
Commit (explicit paths) with a message such as "fix(dashboard): leave raiders who left out of competition counts and ties (#326)" and the trailer.

Step C, full verification (D-09). With HEAD final, from WT run as one foreground command (600000 ms timeout): { echo "HEAD=$(git rev-parse HEAD)"; npx vitest run; echo "EXIT=$?"; } > SP/final-gso-vitest.txt 2>&1. Then sh SP/new-fails.sh SP/baseline-gso-vitest.txt SP/final-gso-vitest.txt from WT. A new FAIL counts only if the file also fails alone (the script re-runs it and reports FLAKY otherwise). Fix any real new failure, commit the fix with the trailer, and re-run. Run npx tsc --noEmit, and eslint with the baseline gates: --max-warnings 9 on MasterSheetContent.tsx, --max-warnings 18 on DashboardContent.tsx, --max-warnings 0 on the other eight files. Confirm git diff --name-only origin/main...HEAD lists exactly the ten files_modified paths and that no added line in git diff origin/main...HEAD contains an em dash. Do not push and do not open a PR.

Step D, PR body draft. With the Write tool, write SP/pr326-body.md in plain language, no em dash, with these sections:
- Summary: what officers and raiders saw (counts and gates that included raiders who left) and what changes.
- The fix, one short paragraph per surface: phase gate (D-02), addon export members and stats (D-03, D-04), Summary view (D-05, D-06), dashboard (D-07). Say each uses the award check's rule (findInvalidCharacterIds).
- Other surfaces checked: the fact 6 table without database policy analysis.
- Open decisions: OD-01, OD-02 and OD-03 with recommendation and reasons, marked as awaiting the user.
- Proposed follow-ups (not filed): FU-1 to FU-5 (not FU-6).
- Copy: none added or changed; existing error text reused (COPY in the objective).
- Tests: counts per new or changed test file and the full-suite comparison.
- No migration.
- "Fixes #326" on its own line.
The last line is exactly the robot emoji followed by " Generated with [Claude Code](https://claude.com/claude-code)", with no trailing blank line. Do not create the PR.

Step E, SUMMARY. Write MAIN/.planning/workstreams/default/quick/261003-gso-fix-gh-326-some-read-only-views-still-co/261003-gso-SUMMARY.md covering: what each surface counted before and counts now; the four commits; verification against the baseline (vitest, tsc, eslint per file); OD-01 to OD-03 (open); the surfaces table; FU-1 to FU-6; the COPY status (none); that no migration or SQL was involved. Do not commit it; the orchestrator handles planning docs.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wt326 && npx vitest run domain/loot/__tests__/item-competition.test.ts && npx tsc --noEmit && test "$(grep -c "findInvalidCharacterIds(supabase, activeGuild.id" "app/(app)/overview/components/DashboardContent.tsx")" -ge 2 && grep -c "buildItemCompetition(" "app/(app)/overview/components/DashboardContent.tsx" && grep -c "isActiveCompetitor(" "app/(app)/overview/components/DashboardContent.tsx" && npx eslint --max-warnings 18 "app/(app)/overview/components/DashboardContent.tsx" && npx eslint --max-warnings 9 "app/(app)/master-sheet/components/MasterSheetContent.tsx" && npx eslint --max-warnings 0 domain/loot/item-competition.ts domain/loot/__tests__/item-competition.test.ts app/api/master-sheet/visibility/route.ts app/api/master-sheet/visibility/__tests__/route.test.ts app/api/addon/export-string/route.ts app/api/addon/export-string/__tests__/route.test.ts lib/loot/master-sheet-summary.ts lib/loot/__tests__/master-sheet-summary.test.ts && test -f ../final-gso-vitest.txt && sh ../new-fails.sh ../baseline-gso-vitest.txt ../final-gso-vitest.txt && test "$(git diff --name-only origin/main...HEAD | LC_ALL=C sort | tr '\n' ' ')" = "app/(app)/master-sheet/components/MasterSheetContent.tsx app/(app)/overview/components/DashboardContent.tsx app/api/addon/export-string/__tests__/route.test.ts app/api/addon/export-string/route.ts app/api/master-sheet/visibility/__tests__/route.test.ts app/api/master-sheet/visibility/route.ts domain/loot/__tests__/item-competition.test.ts domain/loot/item-competition.ts lib/loot/__tests__/master-sheet-summary.test.ts lib/loot/master-sheet-summary.ts " && test "$(git diff -U0 origin/main...HEAD | grep -E '^\+[^+]' | grep -c "$(printf '\342\200\224')")" -eq 0 && test -z "$(git status --porcelain --untracked-files=no)" && test "$(git log origin/main..HEAD --format=%B | grep -c 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>')" -ge 4 && test -z "$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)" && test -f ../pr326-body.md && grep -c "Fixes #326" ../pr326-body.md && test "$(grep -c "$(printf '\342\200\224')" ../pr326-body.md)" -eq 0 && tail -n 1 ../pr326-body.md | grep -c "Generated with \[Claude Code\](https://claude.com/claude-code)" && test -f /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-gso-fix-gh-326-some-read-only-views-still-co/261003-gso-SUMMARY.md</automated>
    <human-check>End of phase, on a preview deploy: as a raider in a guild where a raider who left still has an approved list ranking an item you also listed, confirm the dashboard's "you're #N", the "others want this" count and "Tied with" no longer include them.</human-check>
  </verify>
  <done>The dashboard's competition numbers, quick wins and tie names count only active members, the viewer always counts, and a membership read failure hides those numbers for that load without breaking the dashboard. The full suite shows no new FAIL lines against the baseline; tsc is clean; eslint has 0 errors and no file above its baseline warnings. The branch diff is exactly the ten planned files across at least four commits with the trailer, with no em dash in any added line. Nothing is pushed and no PR exists. The PR body draft is in SP and the SUMMARY is written in MAIN and not committed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> POST /api/master-sheet/visibility (session) | guild_id and item_ids are untrusted; the membership gate and the per-phase gate decide what a raider may see |
| addon or companion -> GET /api/addon/export-string (sync token or cookie) | guild_id is untrusted; officer check and token guild scope decide access; the route reads with the service role |
| browser (officer or raider) -> Postgres through the user-bound client | Summary view and dashboard reads are limited by the viewer's own access; filtering by the lister's membership is the app's job |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-326-01 | Elevation of privilege | per-phase rankings gate (GH #202) unlocked by an approved list of a caller's alt that left | medium | mitigate | filterItemsToEarnedPhases passes only caller characters that findInvalidCharacterIds accepts; tests G1 to G6 (false, NULL, other guild only, active alt, recorded filter, lookup error) |
| T-326-02 | Information disclosure | addon export fallback built members from every list of the guild (drafts, rejected, raiders who left) | medium | mitigate | fallback removed; members only from active memberships; tests X1, X3, X5 |
| T-326-03 | Tampering (integrity) | demand and competition numbers inflated by raiders who left (Summary, dashboard, export stats) | low | mitigate | findInvalidCharacterIds plus splitCandidatesByMembership or buildItemCompetition; tests S1 to S8, C1 to C6, X2 |
| T-326-04 | Denial of service / integrity | a failed membership read showing unfiltered data | medium | mitigate | findInvalidCharacterIds throws; routes answer 500; the Summary shows its existing error; the dashboard shows no competition or tie data for that load (tests G6, X4, S9, and the ties try/catch) |
| T-326-05 | Information disclosure | client views now read other raiders' membership rows of the viewer's guild | low | accept | Those rows are already readable to guild members; the result is only used to filter, nothing new is rendered |
| T-326-06 | Information disclosure | server and browser logs | low | mitigate | new console calls keep a constant first argument (CodeQL) and log no names or ids; thrown messages carry no ids beyond what findInvalidCharacterIds already includes |
| T-326-07 | Repudiation / integrity | resubmit reminder DMs sent to raiders who left (FU-1) | low | transfer | Out of this read-only scope; reported as FU-1 with a proposed fix for its own task |
| T-326-SC | Tampering | npm installs | low | accept | No package is installed; node_modules is symlinked and package files are untouched |
</threat_model>

<verification>
- Full npx vitest run in WT shows no new FAIL lines against SP/baseline-gso-vitest.txt (SP/new-fails.sh exits 0); npx tsc --noEmit is clean; eslint has 0 errors, at most 9 warnings in MasterSheetContent.tsx, at most 18 in DashboardContent.tsx and none in the other eight files.
- Each surface has tests that run the real findInvalidCharacterIds against a fake client (visibility route, export-string route, master-sheet-summary) or feed its output through the pure helper (item-competition).
- git diff --name-only origin/main...HEAD is exactly the ten files_modified paths; nothing under supabase/ or .planning/; lib/database.types.ts untouched; no added line has an em dash.
- No push, no PR, no migration, no SQL against a real database, no .env read, SP/wt354 and SP/pglite-all untouched.
</verification>

<success_criteria>
- Officers see Summary demand, and the addon export's members and submissions count, for active members only; "already awarded" still counts every copy handed out (OD-02 pending).
- A raider can only unlock a phase's rankings with an approved list on a character that is still in the guild.
- Raiders see "others want this", "you're #N", quick wins and "Tied with" without raiders who left (OD-01 pending).
- A database error never shows unfiltered data on any of these surfaces.
- OD-01 to OD-03 reach the user with recommendations; no copy needs sign-off; FU-1 (reminder DMs to raiders who left) is reported as the most visible follow-up.
</success_criteria>

<output>
Create `/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261003-gso-fix-gh-326-some-read-only-views-still-co/261003-gso-SUMMARY.md` when done (not committed).
</output>
