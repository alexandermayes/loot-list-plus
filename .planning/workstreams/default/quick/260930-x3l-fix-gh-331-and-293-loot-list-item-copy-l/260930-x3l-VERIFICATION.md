---
phase: quick-260930-x3l
verified: 2026-10-01T13:30:00Z
status: human_needed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
coincidental_reliance_items:
  - truth: "Client and server use the same counting and the same copyGroupRule on the same rows"
    reason: undeclared-precondition
    harden: "The client counts only listed ids found in lootItems, which LootListContext filters to the guild's active tiers. The server counts every active loot_submission_items row. The row sets match only while every listed item belongs to an active tier. If a list still holds a copy from a tier the guild has since turned off, the server can return a 422 the client did not predict. The message is still clear, and the plan kept this ('ignored, as today'). To close it, feed copyLimitState the full phase catalog, or declare the precondition."
human_verification:
  - test: "On a Classic AQ40 loot list, add Qiraji Bindings of Command in Bracket 1 and again in No Bracket, then open the picker in any Bracket 1-4 row and in an Off-spec row."
    expected: "The main-spec pickers show Bindings as unavailable. Off-spec still offers it, and a third main-spec copy cannot be picked. With 2 in Off-spec as well, the item leaves the unranked panel."
    why_human: "copyLimitState and the props are tested and wired. Whether the picker and the drag panel look and behave right in the browser needs a person."
  - test: "Put the same non-token item from two bosses on one list (or a single-slot token in Brackets 1-4 and in No Bracket), then try to submit."
    expected: "The C-1 banner appears and Submit is blocked. If the client is bypassed, the server returns 'Bracket rules violated. Whole list: \"X\" is listed 2 times (max 1)' (or 'Main spec: ...' for the token)."
    why_human: "The banner rendering and the toast text in the real UI are visual."
  - test: "On an approved list holding two copies of a non-unique ring (or Bindings twice), remove one copy from the raider view, then Undo. Repeat from the officer review panel."
    expected: "Only the clicked cell or row changes. The other copy stays listed, and only the clicked button shows the busy state."
    why_human: "The per-row helpers and route are tested. The full click flow through confirm, fetch and SWR refresh is a UI flow."
  - test: "On the master sheet, open the award modal for an item where one raider holds two entries, after awarding that raider one copy."
    expected: "The raider's best-ranked entry is skipped and the other stays. No duplicate-key warning in the console. The raider does not tie with or contest themselves, and the candidate count counts distinct raiders."
    why_human: "The modal rendering and the console key warnings need a running app."
---

# Quick 260930-x3l: Loot list item copy limits (GH #331, #293) Verification Report

**Task goal:** Copies on a loot list are counted by the real item (wowhead_id, falling back to loot_items.id) across bosses, tiers and sections. The limit is 1 by default, 2 for non-unique rings, trinkets and one-handers, and the gear-slot count per spec group for tokens. The submit route enforces the same rule, and downstream views handle two copies correctly. The signed-off copy C-1 to C-5 is used verbatim.
**Verified:** 2026-10-01
**Status:** human_needed (every automated check passed; four UI flows still need a person)
**Re-verification:** No, initial verification
**Code:** WT `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wtdup`, branch `fix/331-293-item-copy-limits`, HEAD 75ea2713, merge-base origin/main 01d4eb0a, 4 commits, no upstream (not pushed). The working tree was clean before and after verification.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-A/GH-293-R1: copies are counted by real item (wowhead_id, else id) across bosses, tiers and every section, in the picker, banner, submit button and route | VERIFIED | `copyGroupKey` in domain/loot/item-copies.ts. Non-token groups use one bucket for the whole list (`bucketKey`). LootListContent uses one `copyLimitState` memo for the disabled sets, `duplicateItems` (which drives canSubmit) and `unrankedItemsAll`. The submit route calls `validateItemCopyLimits` with `wowhead_id` now in the select. Tests: unique ring main plus off is over; Desecrated from two loot_items ids at 45 and 30 gives 422. |
| 2 | OD-1: tokens are counted per spec group (main = ranks 50-25, off = 24-1). Bindings 2+2; a third in one group is over; a single-slot token is 1+1 | VERIFIED | `specGroupForRank` uses `rank >= 25`. Spot check: 50, 39, 38, 25 are main and 24, 1 are off. item-copies tests cover Bindings 2 main, 2+2, 3 main over with off copies untouched, and Desecrated 1+1 ok and 2 main over. The route test gives 200 for 2+2 and 422 for 3 main. |
| 3 | D-B/GH-331-R1: TOKEN_MAX_COPIES has the 20 verified entries; every other token is 1 | VERIFIED | data/token-copies.ts holds exactly 20928:2, 20932:2, 21232:3, 21237:2, 47242/47557-47559:5, 52025-52030:5, 105857-105859 and 105866-105868:5. It reports 322/322 resolved and 0 unresolved. `maxCopiesForItem` returns `TOKEN_MAX_COPIES[id] ?? 1` (1 for a null id). The data test pins the object. |
| 4 | D-B/GH-293-R2: paired items get 2 when not Unique; 918 ids (669/249); 39 added; 19147 flipped; Classic 'Weapon' paired only when in ONE_HAND_WEAPON_IDS (33) | VERIFIED | Diff against origin/main: 40 `+` lines (39 new ids plus 19147) and one `-` line (19147 true). 19140, 19147 and 21891 are false; 19434, 22722, 21620 and 21836 are true. ONE_HAND_WEAPON_IDS has 33 ids, including 17068 and 19351 but not 17103. Spot check: Cauterizing Band 2, Ring of Spell Power 2 (not unique), Deathbringer 2, Maladath 1, Azuresong 1. |
| 5 | D-C: extra copies can go in any section; each copy is checked by the existing bracket rules | VERIFIED | No section rule was added. The route still runs `validateBracketRules` on every row (copies included), followed by `validateItemCopyLimits`. Client bracket validation is unchanged. |
| 6 | D-D/SRV-R1: submit returns 422 with rule item_copy_limit and labels "Main spec", "Off-spec" or "Whole list", using the same copyGroupRule; any Token row makes a token group; a valid list reaches pending | VERIFIED | Both `copyLimitState` and `validateItemCopyLimits` go through the shared `countBuckets` and `copyGroupRule`. A 5000-case random property check over a mixed catalog (Token plus Quest rows sharing 20928, null wowhead, a unique ring from two bosses, Classic Weapon) found 0 cases where client and server disagree on over-limit. The 422 body is `{ error, violations }` and no status update happens; route tests assert this. See the coincidental-reliance advisory about the active-tier catalog. |
| 7 | DS-R1: remove and restore act on exactly one row (the position sent, else the best-ranked match), and both UIs send rank and slot and update one cell | VERIFIED | `pickTargetRow` in remove-item/route.ts updates `.eq('id', target.id)` (remove also keeps `.is('removed_at', null)`). Audit and `ranks_removed` hold `[target.rank]`. Route tests cover: per-row remove, no-position best rank, 404 writes nothing, 400 already removed, per-row restore, no-position restore, 400 not removed. LootListContext sends rank and slot and calls `removeRankingAt(prev, id, position)`. LootSubmissionsContent passes `{ rank: item.rank, slot: item.slot }` from all four buttons and uses `withoutDetailRow`, `restoreDetailRow` and `detailRowKey`. Helper tests pass. No-position behaviour is unchanged for single-row items. For multi-row items it now acts on one row by design, and no caller omits the position. |
| 8 | DS-R2: the master sheet skips across rows best rank first (same order as applyGlobalReceiveSkip, slot 1 first on a tie); keys and explanations are per entry; no self-ties; the Summary counts lists and averages best ranks | VERIFIED | Both paths share `pickReceivedEntries`. MasterSheetContent builds `skipCandidates` with the same sub and character filters the loop uses, and `remainingSkips` is gone. Spot check: received 1 of entries (30,1), (50,2), (50,1) skips (50,1). applyGlobalReceiveSkip keeps x and y, the same result. ItemCandidateModal keys by `rankingEntryKey`, and its contest, snapshot and count use `bestEntryPerCharacter`. RaidModeView and LootListSummaryView key per entry. `aggregateListStats` is tested. No ranking-list key built only from character_id remains (the 4 left are member pickers). |
| 9 | DS-R3: the review diff is a multiset | VERIFIED | `diffListItems` in domain/loot/list-diff.ts cancels the shared ranks and pairs the rest as moves. `computeDiff` delegates to it. 7 tests pass: one added, one removed, one moved, single-copy move, swap, identical, order. |
| 10 | COPY-R1: new user-facing text is exactly C-1 to C-5; no em dash in any added line | VERIFIED | C-1 banner, C-2 title and description, C-3 bullet and C-4 chip all match the PLAN word for word (`aren&apos;t`/`aren\'t` are JSX/JS escapes). C-5 is the labels plus `"${name \|\| 'Unknown'}" is listed ${count} times (max ${limit})`. A scan of added string literals found nothing else new: the three remove-item errors were already on origin/main. Added lines with an em dash or entity: 0. Commit messages: 0. |
| 11 | DELIVERY-R1: no migration and nothing under supabase/ or .planning/; commits carry the trailer; not pushed; full vitest, tsc and eslint show no new failures | VERIFIED | 30 changed files, none under supabase/ or .planning/. All 4 commits carry `Co-Authored-By: Claude Opus 5.5`. No upstream. tsc is clean. In the full vitest run, 3 tests timed out at 5s and 3 files failed to start a worker (the machine was loaded). All 6 files pass when run alone. Totals: 152 files, 2686 tests, matching the SUMMARY. ESLint: 0 errors, and each large component has the same per-rule warning counts as origin/main (LootListContext 2 to 1). |

**Score:** 11/11 truths verified (0 present but behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| scripts/fetch-token-copies.ts | VERIFIED | 407 lines. Parses the objective-of and currency-for listviews and chains token-to-token rewards. With network calls blocked, the cached pages regenerate it identically, and the cache gained no new files (331 before and after). |
| data/token-copies.ts | VERIFIED | Generated, 20 entries. `git diff -I Generated` is empty after regeneration. |
| domain/loot/item-copies.ts | VERIFIED | Exports copyGroupKey, specGroupForRank, copyGroupRule, copyLimitState, validateItemCopyLimits and the three labels. Imported by LootListContent and the submit route. |
| domain/loot/slot-capacity.ts | VERIFIED | Token branch and Classic Weapon branch. Imports TOKEN_MAX_COPIES and ONE_HAND_WEAPON_IDS. |
| data/item-unique.ts | VERIFIED | 918 ids plus 33 ONE_HAND_WEAPON_IDS. Running the script on origin/main's map, with network blocked, reproduces the committed file exactly; the script logs "Package flags that override the cache: 19147" and "No Wowhead tooltips needed". |
| domain/loot/list-row-updates.ts | VERIFIED | Used by LootListContext, LootListContent and LootSubmissionsContent. |
| domain/loot/list-diff.ts | VERIFIED | Used by LootSubmissionsContent computeDiff. |
| domain/loot/ranking-entries.ts | VERIFIED | Used by ItemCandidateModal, RaidModeView, LootListSummaryView and MasterSheetContent. |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| submit/route.ts | validateItemCopyLimits | WIRED | Runs on the same `itemRows` as validateBracketRules. `wowhead_id` and `name` are selected. |
| LootListContent.tsx | copyLimitState | WIRED | mainSpecAtLimit goes to the 4 Bracket configs and No Bracket. offSpecAtLimit goes to Off-spec. overLimit feeds duplicateItems, and both sets feed unrankedItemsAll. |
| maxCopiesForItem | token-copies / item-unique | WIRED | TOKEN_MAX_COPIES, ONE_HAND_WEAPONS Set, ITEM_UNIQUE. |
| LootListContext / LootSubmissionsContent | POST remove-item | WIRED | The body carries rank and slot, and the route updates by row id. All 4 remove-item fetch sites send a position. There are no other callers in app, lib, discord-bot, companion or addon. |
| MasterSheetContent loadAllRankings | pickReceivedEntries | WIRED | Computed once before the per-item loop. `skippedRows.has(r)` is checked in the loop. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| LootListContent copy limits | rankings, lootItems | LootListContext (submission rows, /api/loot-items filtered to active tiers) | Yes | FLOWING (see advisory) |
| submit route copy check | itemRows | loot_submission_items with loot_item join (wowhead_id selected) | Yes | FLOWING |
| Master sheet skip | allRankingsData, receivedItemCounts | /api/master-sheet/visibility (rank, slot selected), loot_history | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| New and changed tests | `npx vitest run` on the 11 files | 11 files, 124 tests passed | PASS |
| Full suite | `npx vitest run` | 146 passed, 3 timed out, 3 failed to start a worker under load. All 6 passed alone (2, 21, 29, 7, 10 and 4 tests). Total 152 files, 2686 tests. | PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | PASS |
| Token data regeneration (no network) | `NODE_OPTIONS=--import no-network.mjs npx tsx scripts/fetch-token-copies.ts --cache-dir SCRATCH/wh` | 322 tokens, 20 above 1, 0 unresolved; diff empty | PASS |
| Unique map regeneration from origin/main cache | same preload, `scripts/fetch-item-unique.ts` | 879 to 918; overrides 19147; identical to HEAD | PASS |
| Limits and boundaries | `npx tsx SCRATCH/verify-x3l-spot.ts` | Bindings 2, Cauterizing 2, 19147 not unique (2), Deathbringer 2, Maladath 1, Azuresong 1; spec boundaries correct | PASS |
| Client and server agreement | same script, 5000 random lists | 0 mismatches (2316 over-limit cases) | PASS |
| Skip order parity | same script | pickReceivedEntries matches applyGlobalReceiveSkip | PASS |
| ESLint per file vs origin/main | `eslint -f json` on HEAD vs `git show origin/main:f \| eslint --stdin` | Same rule breakdown in all 5 large components; 0 errors | PASS |

### Probe Execution

Not applicable: no probe scripts were declared, and this is not a migration or tooling phase.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| GH-331-R1 | SATISFIED | Truths 2 and 3 |
| GH-293-R1 | SATISFIED | Truth 1 |
| GH-293-R2 | SATISFIED | Truth 4 |
| SRV-R1 | SATISFIED | Truth 6 |
| DS-R1 | SATISFIED | Truth 7 |
| DS-R2 | SATISFIED | Truth 8 |
| DS-R3 | SATISFIED | Truth 9 |
| COPY-R1 | SATISFIED | Truth 10 |
| DELIVERY-R1 | SATISFIED | Truth 11 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (added lines) | - | TBD, FIXME, XXX, TODO, HACK | none found | - |
| remove-item/route.ts | 126-129 | A rank sent without a slot becomes `slot: NaN`, so the request returns 404 | Info | Safe failure, and no current caller does this |
| LootListContext.tsx filteredLootItems | 1146-1164 | The client catalog is limited to active tiers | Info | See the coincidental-reliance advisory |

Existing approved lists are not changed. There is no migration, backfill or new write path apart from the per-row soft delete and restore. The copy check runs only on submit. A list that is already approved and now over a limit (for example a single-slot token in both Brackets 1-4 and No Bracket) shows the C-1 banner. It stays approved, nothing is deleted, and it cannot be resubmitted until it is fixed. This is the documented effect of OD-1.

### Human Verification Required

1. **Picker and drag panel per spec group.** Add Bindings in Bracket 1 and in No Bracket. Main-spec pickers should block it, Off-spec should still offer it, and with 2 more in Off-spec it should leave the unranked panel.
2. **Banner and submit error.** A cross-boss duplicate shows the C-1 banner and blocks Submit. If the client is bypassed, the server's "Whole list" or "Main spec" message is shown.
3. **Remove or Undo one of two copies.** In both the raider view and the officer review, only the clicked copy changes.
4. **Award modal with two entries for one raider.** Their best entry is skipped after an award, there are no duplicate-key warnings, there are no self-ties, and the candidate count counts distinct raiders.

### Gaps Summary

No gaps. All 11 must-haves are backed by code, tests and independent spot checks run in this process. The SUMMARY's claims held: the commits, the 918/669/249 counts, the 20 token entries, identical regeneration, the 152 files and 2686 tests, and the per-file eslint counts. One advisory (not a gap): client and server agree on the same rows only while every listed item belongs to an active tier. That limit already existed and the plan kept it.

---

_Verified: 2026-10-01_
_Verifier: Claude (gsd-verifier)_
