---
phase: quick-261002-h0v
plan: 01
subsystem: addon-sync
status: complete
tags: [addon, companion, loot-history, idempotency, exports, savedvariables]
requires:
  - PRs #341 and #342 (261001-tv5, award_copy, source_award_key, keyed addon insert)
  - PR #337 (pickReceivedEntries)
provides:
  - addonAwardKeys (addon2 awardId key plus legacy alternate) and insertAddonAward alternateKeys
  - award_id on POST /api/addon/loot-award, awards[].awardId on POST /api/addon/import-string
  - buildMemberRankedItems and fetchReceivedCounts for both addon export routes
  - companion addon-format.ts (pending requests, items and itemRanks, applyGuildDataToSavedVars)
  - Lua number-key markers in the companion parser and writer
  - companion 1.1.0
affects:
  - GET /api/addon/export-string
  - GET /api/addon/guild-data
  - companion sync engine
tech-stack:
  added: []
  patterns:
    - client-supplied idempotency id embedded with item and name in the key, legacy key as look-up-only alternate
    - hidden non-enumerable Symbol marker to keep Lua number keys through a JS round trip
    - push-before-pull sync with a single read-modify-write that removes only the entries sent
key-files:
  created:
    - lib/addon/member-ranked-items.ts
    - lib/addon/__tests__/member-ranked-items.test.ts
    - companion/src/main/addon-format.ts
    - companion/src/main/__tests__/addon-format.test.ts
  modified:
    - lib/loot/addon-award-insert.ts
    - lib/loot/__tests__/addon-award-insert.test.ts
    - app/api/addon/loot-award/route.ts
    - app/api/addon/loot-award/__tests__/route.test.ts
    - app/api/addon/import-string/route.ts
    - app/api/addon/import-string/__tests__/route.test.ts
    - app/api/addon/export-string/route.ts
    - app/api/addon/export-string/__tests__/route.test.ts
    - app/api/addon/guild-data/route.ts
    - app/api/addon/guild-data/__tests__/route.test.ts
    - companion/src/main/sync-engine.ts
    - companion/src/main/api-client.ts
    - companion/src/main/lua-parser.ts
    - companion/src/main/lua-writer.ts
    - companion/tsconfig.json
    - companion/README.md
    - companion/package.json
    - companion/package-lock.json
decisions:
  - "Addon awards with a valid awardId are keyed 'addon2:' + awardId + ':' + wowheadId + ':' + name, with the legacy awardedAt key looked up (never written) as an alternate"
  - "Addon exports drop removed list rows and one listed entry per received copy (best rank first), and send each raider's ranks best last"
  - "Companion writes guildData.items with Lua integer keys and member items/itemRanks with string keys; parser/writer keep number keys through a round trip"
  - "Companion sync pushes attendance then awards before fetching guild data, then writes once, removing only the pending entries it sent (A-3)"
metrics:
  duration: "about 95 minutes"
  completed: 2026-10-02
estimate:
  tokens: 190000
  tasks: 3
actuals:
  tokens: 28560
  tasks: 3
  commits: 7
---

# Phase quick-261002-h0v Plan 01: In-game support for several ranks of one item Summary

Award-id keys (addon2 plus legacy alternate) on both addon award routes, addon exports without removed rows or received copies and with best rank last, and a companion 1.1.0 that forwards awardedAt and awardId, writes items as Lua integer keys plus every rank in itemRanks, and pushes before it pulls in one SavedVariables write. FU-B (addon release) is written up below and was not executed.

## Commits

All in WT (`scratchpad/wtgame`) on `feat/in-game-item-ranks`, from origin/main 4b3f66e6, each with the Claude trailer. Nothing pushed, tagged, released or opened as a PR.

| # | Commit | Kind | Message |
|---|---|---|---|
| 1a | 5e6f3f22 | server (6 files) | feat(addon): key an addon award by its award id when the addon sends one (FU-C of 261001-tv5) |
| 1b | abcef3d1 | companion (5 files) | feat(companion): forward each award's awardedAt and awardId to loot-award (FU-A of 261001-tv5) |
| 2a | 96b5b4d9 | server (6 files) | fix(addon): leave removed list rows out of addon exports and send each raider's ranks best last (FU-3 of #331, #293) |
| 2b | eba565d1 | server (6 files) | feat(addon): hide copies a raider already received from addon exports (FU-C of 261001-tv5) |
| 3a | de64fc58 | companion (5 files) | feat(companion): keep every rank of an item and write item keys the addon can read (FU-A of 261001-tv5) |
| 3b | 72d3da0e | companion (4 files) | fix(companion): send pending awards and attendance before downloading guild data, in one SavedVariables write (FU-A of 261001-tv5) |
| 3c | 1f223b9f | companion (2 files) | chore(companion): version 1.1.0 |

Every commit touches only server files or only `companion/` files (checked per commit).

**Server branch:** local `feat/in-game-item-ranks-server` from origin/main with 1a, 2a, 2b cherry-picked: 830ba7e4, 92090cab, 589a1987 (head **589a1987**). `git diff --name-only origin/main..feat/in-game-item-ranks-server` lists 12 server files and no `companion/` path; its non-companion tree is identical to `feat/in-game-item-ranks`. On that branch the 9 server test files (178 tests) pass and `npx tsc --noEmit` is clean. WT is back on `feat/in-game-item-ranks`, clean.

## Baseline vs final

| Check | Baseline (origin/main 4b3f66e6) | Final (feat/in-game-item-ranks) |
|---|---|---|
| Full root vitest | 162 files, 2860 tests, all green | 164 files, 2922 tests, all green (clean runs: run 3 and the verify-chain run) |
| Root `npx tsc --noEmit` | clean | clean |
| Companion `npx tsc --noEmit` | clean | clean |
| Companion `npm run build` | not run | passes (electron-vite main, preload, renderer) |
| eslint on changed files | clean | clean (all 18 changed .ts files) |
| Companion tests (root vitest) | none | 22 passed |
| Em dash gate | | none added (code and drafts) |
| Planning-directory gate | | nothing under .planning in WT |
| Task 3 verify chain | | VERIFY_CHAIN_OK |

A-1 record: the first full run had 2 failures (blog-dates JSON-LD, ItemCandidateModal M1) and the second 5 (guide-report-links, AddonImportDialog x2, ItemCandidateModal M1, BulkRaiderBonusModal), all 5-second timeouts or a `findBy` miss under a machine load average near 100 (other processes). None touch files in this plan. Each failing file passed when re-run alone (`final-h0v-rerun-blog-dates.txt`, `final-h0v-rerun-itemcandidate.txt`, `final-h0v-rerun-run2-files.txt`: 5 files, 97 tests), and two later full runs were fully green (`final-h0v-vitest-run3.txt`, `final-h0v-vitest.txt`). The baseline was fully green.

Artifacts in SCRATCH: `baseline-h0v-{vitest,tsc,companion-tsc,eslint}.txt`, `baseline-h0v-done`, `final-h0v-{vitest,vitest-run2,vitest-run3,tsc,companion-tsc,companion-build,eslint,server-branch-tests,server-branch-tsc}.txt`.

## Drafts (SCRATCH only)

- `pr-h0v-server-body.md`: key rules per path, FU-3, OD-1, compatibility, rollback note, verification. No migration, so a normal merge.
- `pr-h0v-companion-body.md`: merge after the server PR; tag companion-v1.1.0 after merge; a person publishes the draft together with the addon release (OD-6).
- `release-h0v-companion-notes.md`: R-1 to R-6 verbatim, marked as signed off on 2026-10-02, with the publisher note about the default body's em dashes.

No in-app text was added or changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Empty pending lists crashed every companion sync**
- **Found during:** Task 1 (Step D)
- **Issue:** an empty Lua table (`pendingAwards = {}`, which both the companion's own clear and WoW write) parses as `{}`, not `[]`, and `readPendingFromSavedVars` called `.map` on it, so a sync with nothing pending threw.
- **Fix:** `toPendingAwardRequests`, `toPendingAttendanceRequests` and `readPendingLists` treat a non-array as none; P4 and S7 cover it.
- **Files:** companion/src/main/addon-format.ts, companion/src/main/sync-engine.ts
- **Commits:** abcef3d1, 72d3da0e

**2. [A-3 amendment] applyGuildDataToSavedVars takes the sent pending lists instead of a boolean**
- **Issue:** the plan's `clearPending: boolean` cannot keep entries the addon adds during a pass.
- **Fix:** third parameter `sent: SentPending | null` (the raw lists read at the start of the pass, null when none). Each sent entry removes one file entry with the same identity: awards on `awardId`, else `awardedAt` + `wowheadId` + trimmed lowercased name; attendance on `raidDate` + `raidName` + `startTime`. The final write re-reads the file first. S5 and S6 cover it. PD-05 is unchanged (failed POSTs are still cleared).
- **Commit:** 72d3da0e

**3. [Rule 2 - Robustness] fetchReceivedCounts also returns null when the client throws**
- **Issue:** a throwing client (for example the companion-bearer test fake, which has no `range()`) would have turned the export into a 500.
- **Fix:** the page loop sits in a try/catch that logs with a constant first argument and returns null, so the export goes out unskipped (R2b).
- **Commit:** eba565d1

**4. [CodeQL] Constant first argument on the two moved sync log lines**
- The template-literal `Synced ...` logs became `console.log('Synced awards:', processed, 'errors:', errors)` (and the same for attendance) in the rewritten `syncNow`. The untouched watcher line keeps its template literal (pre-existing).
- **Commit:** 72d3da0e

**5. Version bump by hand**
- `npm version 1.1.0 --no-git-tag-version` also reformatted three arrays in package.json, so package.json was restored and only its version line changed; package-lock.json kept npm's two version-field edits.
- **Commit:** 1f223b9f

**6. Small additions beyond the plan's exports**
- addon-format.ts also exports `PendingAttendanceRequest`, `SentPending`, `toPendingAttendanceRequests`, `readPendingLists` and `buildGuildDataLua` (the guildData table the sync engine writes, tested in S8). addon-award-insert.ts also exports the `AddonAwardKeyInput` and `AddonAwardKeys` types.
- If the `addon2:` key would exceed 200 characters (very long name), the key falls back to the legacy key (tested).

## Threat model

T-h0v-01, 02, 04, 05 and 08 mitigations are in place and tested (awardId pattern and item/name inside the key, legacy alternate, guild-filtered history read, removed rows dropped, constant log strings). No new endpoints, auth paths or schema changes.

## Human checks (for the user, after delivery)

1. After the server PR deploys: `/llp import` in game with a fresh export for a guild where one raider has a removed list row and one raider already received a listed item; neither shows for that item.
2. After the companion is built: run it once against a test WoW folder with WoW closed, then open the game and check that a known item opens the loot frame (proves the integer keys).

## Open questions

- None blocking. N-1 to N-7 and FU-T5 from the plan still stand as candidates for follow-ups.

## Follow-up plan FU-B (carried over unchanged from the PLAN)

Start after the server PR is live (OD-4). It needs the user's answers to OD-2, OD-3, OD-7, OD-8 and OD-9. If OD-7 is yes, the follow-up planner adds a blocking human checkpoint before brew install luajit.

- Where: clone with gh repo clone alexandermayes/loot-list-plus-addon into SCRATCH/addon-repo. Work on a local branch feat/item-ranks-award-id and commit locally only. A small this-repo branch from origin/main handles B7.
- B1, reconcile (OD-3): copy this repo's addon/LootListPlus/Modules/ScoreEngine.lua (origin/main) over Modules/ScoreEngine.lua verbatim. Commit it alone as "Port the web-parity ScoreEngine from the LootList+ repo". The message lists 3a4b1995, 8c74a2af, e7c57b6f, a50aaabb, f1b1e29e, 30a7422b and 6089e0d8. Check first that the file still calls only DB functions present in Core/DB.lua.
- B2, data:
  - Sync:ProcessImport sets members[cid].items[tostring(id)] to the highest rank (today the last entry wins) and itemRanks[tostring(id)] to every rank, highest first, the same shape the companion writes (D-08).
  - DB gains GetAwardCount(characterId, wowheadId) and IncrementAwardCount(characterId, wowheadId) on guildData.awardCounts[characterId][tostring(wowheadId)]. The table is created on demand and resets whenever guildData is replaced (OD-2).
- B3, ScoreEngine.CalculateCharacterItemScore:
  - ranks = member.itemRanks[key], falling back to { member.items[key] } when itemRanks is missing.
  - used = DB:GetAwardCount(...).
  - rank = ranks[used + 1]. With no rank left it returns nil, so the raider leaves the list, matching pickReceivedEntries.
  - Everything else is unchanged.
- B4, LootDistribution:
  - AwardItem and ManualAward add awardId = awardedAt .. "-" .. (slotIndex or 0) .. "-" .. string.format("%06x", math.random(0, 16777215)), which matches the server's D-01 pattern and is at most 31 characters.
  - AwardItem increments the winner's count. ManualAward increments the count of a member whose name matches case-insensitively.
  - After any award, recompute priorityList for every other not-yet-awarded current item with the same wowheadId, and refresh it. Call LootFrame:Show to re-lay rows out when the row count changes.
  - Comms broadcast is unchanged. Export is unchanged apart from the new field (Sync:ToJSON serializes it).
- B5, tests: with luajit, add tests/run.lua (plain Lua 5.1; stub LLP, DB with an in-memory profile, date and math.random). Cover:
  - ProcessImport items and itemRanks
  - consumption: ranks 50, then 30, then off the list
  - legacy single rank
  - count reset on SetGuildData and survival across a simulated reload (the table lives in the profile)
  - two same-second awards get different awardIds that match the server pattern
  - ToJSON includes awardId
  - the second item's list is recomputed after an award

  Run with luajit tests/run.lua and chain it with &&. Without luajit, do the manual checks in B8 only.
- B6, version (OD-9): set ## Version: 1.1.0 in all six .toc files, in a commit of its own.
- B7, this repo (OD-3): delete addon/ (grep first that nothing references addon/LootListPlus). Add a pointer comment to the domain/scoring module header naming Modules/ScoreEngine.lua in alexandermayes/loot-list-plus-addon as the Lua port to update with scoring changes. One small PR.
- B8, manual in-game checks (after an install):
  - Two Bindings drop from one boss and raider X listed them twice. Award one to X; the second item's list shows X at their second rank. Award it to X too; /llp export pasted on the website records copy 1 and copy 2. Pasting it again reports both as already recorded.
  - A /reload between the awards keeps the count, and /llp import of fresh data resets it.
- Stop points: no push to the addon repo, no tag, no release and no packaging upload without the user's explicit permission. The orchestrator asks after B1 to B7 are committed locally. Publish the companion draft together with the addon release (OD-6).
- Compatibility: see the A1 rows of the matrix. A1 needs no server or companion change beyond this plan, and works degraded with C0.
- COPY: AR-1 to AR-5 above. No new in-game strings unless the user asks for a copy indicator, which would need its own COPY sign-off.

Note for FU-B from this execution: companion 1.1.0 writes `itemRanks` exactly as B2 expects (string keys, every rank highest first), and the server accepts the B4 awardId format (`2026-09-20T20:00:00Z-1-a1b2c3` is the tested example).

## Self-Check: PASSED

- Files: lib/addon/member-ranked-items.ts, companion/src/main/addon-format.ts and both new test files exist in WT; the three drafts exist in SCRATCH.
- Commits: 5e6f3f22, abcef3d1, 96b5b4d9, eba565d1, de64fc58, 72d3da0e, 1f223b9f on feat/in-game-item-ranks; 830ba7e4, 92090cab, 589a1987 on feat/in-game-item-ranks-server.

## Delivery (orchestrator, 2026-10-02)

- Server PR #344 (the three server commits) squash-merged as 0ef72135 after every CI check passed; the Vercel production deploy succeeded.
- The four companion commits were cherry-picked onto the new main (companion files only; companion tests 52/52, root and companion tsc clean) and shipped as PR #346, squash-merged as 8d81b1dc after every CI check passed.
- Tag companion-v1.1.0 pushed on 8d81b1dc (user-approved). The release workflow builds the installers and creates a DRAFT release; it stays unpublished until the addon 1.1.0 release (FU-B) is ready and checked in game (OD-6).
- Still open: the manual checks in the verification report (/llp import in game, the current addon reading companion data, one companion sync order run), and FU-B (addon repo: port this repo's ScoreEngine.lua first, then ranks and awardId, then the release; luajit approved for tests).
