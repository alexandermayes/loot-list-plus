---
phase: quick-261002-k0n
verified: 2026-10-03T03:25:07Z
status: human_needed
score: 11/11 must-haves verified
behavior_unverified: 0
overrides_applied: 0
coincidental_reliance_items:
  - truth: "ADDON-RANKS: the award count survives /reload"
    reason: fixture-only
    harden: "C5 proves the round trip through the harness's own Lua serializer and a fresh module load. Real WoW SavedVariables writing and AceDB copyDefaults/removeDefaults are not exercised. awardCounts is not in DB.defaults, so AceDB should leave it alone, but the in-game /reload check (human item 1) is the real proof."
human_verification:
  - test: "Install scratchpad/LootListPlus-1.1.0.zip into a test WoW client's Interface/AddOns. Run /llp import with a fresh website export for a guild where one raider listed Qiraji Bindings twice. With two Bindings in one loot window, award the first to that raider, then the second. /reload between the two awards once, and run a fresh /llp import afterwards."
    expected: "After the first award the second Bindings row shows that raider at their second rank (the window rebuilds). After the second award they are gone from the list. A /reload between the awards keeps the second rank; a fresh /llp import resets it to the best rank."
    why_human: "The harness stubs LootFrame (RefreshAll is only a recorded call) and simulates /reload with its own serializer. The real frame rebuild, AceDB and SavedVariables need the game client."
  - test: "After both awards, run /llp export and paste it into the website's addon import. Paste the same string a second time."
    expected: "The website records copy 1 and copy 2 of the item for that raider. The second paste reports both as already recorded."
    why_human: "End to end through the live server's addon2 key (PR #344). Award id format and regex match are proven by tests, but the live import path is an external service."
  - test: "Hover a raider's score in the loot window for a guild with role or raider bonuses turned on."
    expected: "The breakdown lists 'Role bonus' and 'Raider bonus' after 'Rank modifier'. The lines add up to the total, and the tooltip height fits all lines."
    why_human: "UI/ScoreBreakdownTooltip.lua is not loaded by the harness. Layout and rendering need the client."
  - test: "On the website, open the WoW Addon admin page (app/(app)/admin/addon) with an active guild."
    expected: "The info card shows 'Copy the LootList+ addon folder into your WoW AddOns folder. Ask us on Discord for the latest version.' in the same small muted style, and no CurseForge mention."
    why_human: "The render test pins the text; the visual placement and style are a visual check."
---

# Quick Task 261002-k0n: Addon 1.1.0, item ranks and award ids. Verification Report

**Goal:** Addon 1.1.0 in the addon repo (verbatim ScoreEngine port with luajit parity tests, per-item rank consumption since the last import, per-award awardId matching the server, Role bonus and Raider bonus lines, version 1.1.0 and a verbatim CHANGELOG); this repo drops addon/ with pointers and shows AP-2 on the admin page; a local zip with one LootListPlus/ folder; nothing pushed, tagged or released; backward compatible with 1.0.0 SavedVariables and older server and companion data.
**Verified:** 2026-10-03T03:25:07Z
**Status:** human_needed (every automated check passed; the plan's own end-of-phase in-game and visual checks remain)
**Re-verification:** No, initial verification

Code checked: addon repo clone `scratchpad/addon-repo` on `feat/addon-1.1.0` (5 commits over 0c67406: 6bb1035, 349ee8e, 0a1f3ed, ef11c23, 5271850); this repo's worktree `scratchpad/wtaddon` on `chore/remove-in-repo-addon-copy` (2 commits over origin/main f87a359c: 9bfaa7b9, 6d7e17fd); `scratchpad/LootListPlus-1.1.0.zip`. Both working trees are clean.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ADDON-PORT: A1 changes only Modules/ScoreEngine.lua, byte-identical to the in-repo copy at 8d81b1dc; message lists the seven source commits | ✓ VERIFIED | `git show 8d81b1dc:addon/LootListPlus/Modules/ScoreEngine.lua \| cmp - <(git show 6bb1035:Modules/ScoreEngine.lua)` identical (also identical at f87a359c). `git log --stat` of 6bb1035: 1 file. Message lists 3a4b1995, 8c74a2af, e7c57b6f, a50aaabb, f1b1e29e, 30a7422b, 6089e0d8; `git log -- addon/...ScoreEngine.lua` in this repo confirms exactly these seven, and spot-checked descriptions (6089e0d8 adds GetRaiderModifier and raiderBonus; 30a7422b is the windowing note; e7c57b6f the rank overrides) are accurate. |
| 2 | ADDON-TESTS: luajit runner loads the real module files, exits 0/1 correctly; parity within 1e-9 against the website engine; fixtures regenerate byte for byte | ✓ VERIFIED | My run of `luajit tests/run.lua`: 60 passed, 0 failed, 0 known gaps, exit 0. `--selftest-fail` exit 1. harness.lua loads Core/Constants, VersionCompat, Utils, DB, Modules/ScoreEngine, Sync, LootDistribution with `loadfile(path)("LootListPlus", LLP)`; only WoW globals are stubbed. 27 attendance (ppr, linear, breakpoint; late, benched, excused, ncns, points_override), 4 loot score, 11 full score cases (import through Sync:ProcessImport, GetItemPriorityList, TOL 1e-9, order asserted). gen_web_fixtures.mts imports `domain/scoring/index.ts`, `__tests__/fixtures.ts` and `lib/addon/member-ranked-items.ts` from LLP_REPO and builds the LLP1:1 string with `deflateRawSync` + base64 as the export route does. Regenerated into a temp dir from a clean checkout at f87a359c (wtsec2): both files byte-identical. From WT HEAD 6d7e17fd only `generatedFrom` differs (W1/W2 are comment-only in domain/scoring). Discrimination: with the 1.0.0 engine swapped in memory (loadfile shim, no file changes), 18 of the 43 parity tests fail (11 T2, 1 T3, 6 T4). |
| 3 | ADDON-RANKS: best unawarded rank, next rank after an award, leaves when all copies awarded; count in profile, survives /reload, any import resets | ✓ VERIFIED (coincidental-reliance, see frontmatter) | Sync.lua ProcessImport builds itemRanks (sorted `a > b`) and items = ranks[1]. SE:GetCurrentItemRank returns `ranks[DB:GetAwardCount(...) + 1]` only when a number; CalculateCharacterItemScore uses it. LD:ConsumeRank increments then RefreshSiblingLists (other unawarded copies with same wowheadId) and LootFrame:RefreshAll. ProcessImport builds a fresh guildData without awardCounts and calls SetGuildData (wholesale replace), so imports reset. Tests passing: C1-C3 (50, rescored to 30, RefreshAll once, gone after two; Jaina unchanged), C4 (reset), C5 (reload keeps count 1 and rank 30), C6 (manual name match), L2 (companion shape). |
| 4 | ADDON-AWARDID: awardId = awardedAt-slot-6hex on AwardItem and ManualAward, matches server AWARD_ID, distinct in one second, in export and history | ✓ VERIFIED | LD:NewAwardId: `tostring(awardedAt) .. "-" .. math.floor(tonumber(slot) or 0) .. "-" .. string.format("%06x", math.random(0, 16777215))`; both award paths read U:GetTimestamp() once (`!%Y-%m-%dT%H:%M:%SZ`). AWARD_ID on origin/main lib/loot/addon-award-insert.ts line 79: `/^[A-Za-z0-9][A-Za-z0-9:._-]{7,63}$/`. I piped `--print-award-ids` into node with that regex read from `git show origin/main:...`: 20 ids, 20 distinct, 0 rejected, max length 30. Server route app/api/addon/import-string reads `award.awardId` into addonAwardKeys (addon2 key). Tests A1 (pending and history), A2 (same second differ; same time and slot differ), A3 (export carries ids). |
| 5 | ADDON-COMPAT: no itemRanks scores on single rank; missing awardCounts is zero; 1.0.0 pending awards export unchanged; companion 1.1.0 guildData works; real LLP1:1 imports; PROTOCOL_VERSION and prefixes unchanged | ✓ VERIFIED | L1 (items only, empty itemRanks fallback, non-number rank gives no entry), A3 (1.0.0 award without awardId exports beside new ones), L2 (integer item keys, string member keys, items + itemRanks, loaded via reload), T5/R2 (string from buildMemberRankedItems: removed 60 absent, Sylvanas's received 45 skipped). GetAwardCount returns 0 when `gd.awardCounts` is nil. Constants.lua: only C.VERSION changed; `C.PROTOCOL_VERSION = 1`, `LLP1:` and `LLP1E:` unchanged; Core/Comms.lua untouched, and BroadcastAward still sends its fixed field list (no awardId). Companion addon-format.ts on origin/main writes items/itemRanks and no awardCounts. |
| 6 | ADDON-VERSION: six .toc at 1.1.0, C.VERSION 1.1.0, CHANGELOG AR-1 to AR-5 verbatim, one commit | ✓ VERIFIED | `grep '## Version'` on all six .toc: 1.1.0. `C.VERSION = "1.1.0"`. CHANGELOG.md compared byte for byte with the plan's AR-1 heading plus AR-2..AR-5 bullets: identical, ASCII only. All eight files in commit 5271850 only. |
| 7 | LLP-REMOVE: W1 deletes addon/ with pointers; nothing imports or reads addon/; tsc clean; full vitest no FAIL beyond baseline; eslint clean | ✓ VERIFIED | 9bfaa7b9 touches README.md, the deleted ScoreEngine.lua, domain/scoring/index.ts and the two fixture files (comments only). `git ls-files addon` empty; `git grep` for `addon/LootListPlus`, `addon/ScoreEngine` finds nothing; `ScoreEngine.lua` hits are the new pointers and a generic comment in domain/loot/faction-item-aliases.ts (no path). No config file refers to a top-level addon/. My `npx tsc --noEmit`: exit 0. The orchestrator's quiet full run (scratchpad/quiet-k0n-vitest.txt, written 20:15 after W2 at 15:30, in wtaddon): 165 files, 2925 tests, all passed, so no FAIL line at all. This closes the SUMMARY's open item. eslint on the five files: 0 errors, the same 3 pre-existing unused-import warnings in export-fixtures.ts as baseline-k0n-eslint.txt. |
| 8 | ADMIN-AP2: W2 separate, replaces the store line with AP-2 verbatim, render test pins AP-2 and absence of the old store name, nothing else changes | ✓ VERIFIED | 6d7e17fd: `_client.tsx` 1 line changed inside the same `<Text size="xs" color="muted">`; text equals AP-2 exactly. New `__tests__/client.test.tsx` P1 getByText(AP2), P2 queryByText(/CurseForge/) null, P3 no-guild message. My run: 1 file, 3 passed. |
| 9 | COPY-K1: only IG-1, IG-2, AP-2 (and AR-1..5 in CHANGELOG) as new player-facing text; AP-1 not applied; no em dash | ✓ VERIFIED | Added string literals in non-test addon Lua: only "1.1.0", "Role bonus", "Raider bonus" and code-only strings ("-", "string", "number", patterns). The ported engine has no Print/SetText. WT in-app change is the AP-2 line only; README and comments are developer docs. AP-1 text absent. perl scan for U+2014 and `&mdash;`/`&#8212;` across added lines and commit messages in both repos and both PR drafts: none. All added addon lines are ASCII. |
| 10 | DELIVERY-K1: local commits only with the trailer; nothing pushed, tagged, released, uploaded or opened as a PR; zip in SCRATCH; no planning files in either repo; no SQL; no .env.local | ✓ VERIFIED | Trailer count 5/5 (addon) and 2/2 (WT). Neither branch has an upstream (`@{u}` fails). `git ls-remote` shows the addon remote has only main, and no remote branch for chore/remove-in-repo-addon-copy. No tags. `gh pr list` empty for both; addon repo has no releases. No `.planning` path in either diff. Generator imports no DB client (member-ranked-items.ts only has a type import of SupabaseClient). No SQL or .env.local use observed. |
| 11 | OD8-OPEN: no packaging metadata, release workflow or store ids; zip in SCRATCH; AP-2 shown | ✓ VERIFIED | No `.pkgmeta`, no `.github`, no `X-Curse`/`X-Wago` lines in the addon repo. Zip is only in scratchpad. AP-2 per truth 8. |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `ADDON/Modules/ScoreEngine.lua` | verbatim port plus GetCurrentItemRank | ✓ VERIFIED | A1 identical to source; A3 adds GetCurrentItemRank (23 lines) and the one-line call change; nothing else in the engine changed. |
| `ADDON/Core/DB.lua` | GetAwardCount, IncrementAwardCount | ✓ VERIFIED | IncrementAwardCount guarded by HasGuildData() and both args; awardCounts only in a comment in DB.defaults. C7 proves defaults stay untouched. |
| `ADDON/Modules/Sync.lua` | items (best) and itemRanks (all, best first) | ✓ VERIFIED | `tonumber(item.rank)` filter, entries without wowhead_id or rank skipped (R1), order-independent (R1). |
| `ADDON/Modules/LootDistribution.lua` | NewAwardId, RefreshSiblingLists, counting | ✓ VERIFIED | Plus ConsumeRank helper (documented deviation 3); findMemberIdByName is file-local and uses DB:GetMembers, no Roster dependency. BLP, auto-trade, broadcast and announcement unchanged. |
| `ADDON/UI/LootFrame.lua` | LF:RefreshAll | ✓ VERIFIED (presence) | Rebuilds via Show(LD.currentItems, LD.currentBossName) only when the file-local frame exists and is shown. Not loaded by the harness; in-game check item 1. |
| `ADDON/UI/ScoreBreakdownTooltip.lua` | Role bonus, Raider bonus | ✓ VERIFIED (presence) | Two lineLabels entries after Rank modifier plus two setLine calls; engine returns roleBonus/raiderBonus. Height is computed from #lineLabels. In-game check item 3. |
| `ADDON/tests/run.lua`, `harness.lua`, `test_*.lua` | runner, stubs, real-module loader | ✓ VERIFIED | Read in full; assertions are substantive (exact ranks, counts, call counts, ids, order). |
| `ADDON/tests/tools/gen_web_fixtures.mts` + fixtures | web-generated fixtures | ✓ VERIFIED | Regenerates byte for byte at f87a359c; synthetic names (Thrall, Jaina, Sylvanas, Anduin, Varok) and synthetic UUIDs; no local paths; ASCII only. |
| `ADDON/CHANGELOG.md` | AR-1..AR-5 verbatim | ✓ VERIFIED | Byte comparison passed. |
| `WT/app/(app)/admin/addon/_client.tsx` + test | AP-2 and render test | ✓ VERIFIED | See truth 8. |
| `scratchpad/LootListPlus-1.1.0.zip` | one top folder, no tests, 1.1.0 | ✓ VERIFIED | One top-level folder `LootListPlus/`; 77 entries; 61 files equal to the 61 tracked non-test files at HEAD, each matching `git show HEAD:path` by sha; no tests/, .planning, .pkgmeta or .github; all six .toc files say 1.1.0; LibDeflate included. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Sync ProcessImport | SE GetCurrentItemRank | `members[id].itemRanks[tostring(wowheadId)]` | ✓ WIRED | Same key format both sides; R1/R2/C1 pass. |
| SE GetCurrentItemRank | DB GetAwardCount | `ranks[count + 1]` | ✓ WIRED | Code read; C2/C3 pass. |
| LD AwardItem / ManualAward | DB IncrementAwardCount and pending award | ConsumeRank, awardId on the record | ✓ WIRED | Both call ConsumeRank after AddPendingAward/AddLootHistory. |
| LD RefreshSiblingLists | LootFrame RefreshAll | only when a sibling was recomputed | ✓ WIRED | C2 asserts exactly one RefreshAll; C3 asserts none for the last copy. |
| Sync EncodeExportString (awards[].awardId) | server import-string route, addonAwardKeys | AWARD_ID, addon2 key | ✓ WIRED | ToJSON serializes every award field (A3 decodes awardId); route line 391 passes `award.awardId`; regex check above. |
| gen_web_fixtures.mts | domain/scoring/index.ts, lib/addon/member-ranked-items.ts | dynamic import from LLP_REPO | ✓ WIRED | `load('domain/scoring/index.ts')` etc. via pathToFileURL; regeneration run confirms. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| Loot window priority lists | per-raider rank | imported itemRanks plus profile awardCounts | Yes, from the import payload and counts written on award | ✓ FLOWING |
| Export string awards | awardId | NewAwardId on each award, stored in pendingAwards | Yes | ✓ FLOWING |
| Parity expectations | expected totals | website's computeScore/calculateAttendanceScore/calculateLootScore | Yes (regenerated) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full luajit suite | `luajit tests/run.lua` | 60 passed, 0 failed, exit 0 | ✓ PASS |
| Runner fails on purpose | `luajit tests/run.lua --selftest-fail` | exit 1 | ✓ PASS |
| Award ids vs server regex | `--print-award-ids` piped to node with AWARD_ID from `git show origin/main:lib/loot/addon-award-insert.ts` | 20/20 match, all distinct | ✓ PASS |
| Parity tests discriminate | 1.0.0 engine swapped in memory via a loadfile shim | 18 of 43 parity tests fail | ✓ PASS |
| Fixture regeneration | generator from a clean f87a359c checkout into a temp dir, `cmp` | both files identical | ✓ PASS |
| Lua compiles | `luajit -b` on every tracked non-library .lua | 0 failures | ✓ PASS |
| Admin render test | `npx vitest run 'app/(app)/admin/addon/__tests__/client.test.tsx'` | 3 passed | ✓ PASS |
| Type check | `npx tsc --noEmit` (wtaddon) | exit 0 | ✓ PASS |
| eslint | five changed files | 0 errors, 3 pre-existing warnings | ✓ PASS |
| Full vitest | not re-run (per instructions); orchestrator's quiet-k0n-vitest.txt | 165 files, 2925 tests passed | ✓ PASS (orchestrator evidence) |

### Lua 5.1 and randomness checks

- `git grep randomseed` (outside Libs): none. math.random is used only in LD:NewAwardId.
- Added non-test, non-library Lua lines (including the A1 port), with comments stripped, scanned for `goto`, `::label::`, `//`, `<<`, `>>`, binary `~`, `&`, `bit.`, `bit32`, `require`, `utf8.`, `table.unpack/pack/move`, `string.pack`, `math.type/tointeger`, `rawlen`, `\u{`, `\z`, `\x` escapes, LuaJIT `LL`/`ULL` literals, `ffi.`, `jit.`: no hits. The same scan on tests/*.lua: no hits.
- No stock Lua 5.1 compiler is installed (lua, lua5.1, luac, luac5.1 all absent), so syntax rests on luajit compilation plus the scan above. This is as the plan allowed.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| ADDON-PORT | 261002-k0n-PLAN | ✓ SATISFIED | Truth 1 |
| ADDON-TESTS | 261002-k0n-PLAN | ✓ SATISFIED | Truth 2 |
| ADDON-RANKS | 261002-k0n-PLAN | ✓ SATISFIED | Truth 3 |
| ADDON-AWARDID | 261002-k0n-PLAN | ✓ SATISFIED | Truth 4 |
| ADDON-COMPAT | 261002-k0n-PLAN | ✓ SATISFIED | Truth 5 |
| ADDON-VERSION | 261002-k0n-PLAN | ✓ SATISFIED | Truth 6 |
| LLP-REMOVE | 261002-k0n-PLAN | ✓ SATISFIED | Truth 7 |
| ADMIN-AP2 | 261002-k0n-PLAN | ✓ SATISFIED | Truth 8 |
| COPY-K1 | 261002-k0n-PLAN | ✓ SATISFIED | Truth 9 |
| DELIVERY-K1 | 261002-k0n-PLAN | ✓ SATISFIED | Truth 10 |
| OD8-OPEN | 261002-k0n-PLAN | ✓ SATISFIED | Truth 11 |

These IDs are local to the quick task; none appear in REQUIREMENTS.md, so nothing is orphaned.

### Anti-Patterns Found

None blocking. No TBD, FIXME, XXX, TODO, HACK or placeholder markers in added lines of either repo.

Info only:

| File | Note | Severity |
|------|------|----------|
| ADDON/Modules/Sync.lua ProcessImport | `tonumber(item.rank)` accepts any numeric string. A hand-crafted import with a rank string like "nan" could produce NaN under a strtod-based Lua 5.1 and break `table.sort` with "invalid order function". The server always sends integers, so this only affects a tampered string. | ℹ️ Info |
| Plan Task 1 verify chain | Re-running it now from WT would show a `generatedFrom` diff, because WT moved from f87a359c to 6d7e17fd after A2. Regeneration from f87a359c is byte-identical, which is what the README documents. | ℹ️ Info |
| WT domain/scoring/__tests__/export-fixtures.ts | 3 unused-import eslint warnings, already in the baseline | ℹ️ Info |

Known limitations N-1 to N-10 (per-officer counting, mid-raid import resets, tooltip and roster show best rank, no donation term, empty default rank_modifiers, BLP pass per copy, reset buttons pointing at defaults, CLAUDE.md addon/ mention, companion write timing, row rebuild cost) are documented in the PLAN and SUMMARY and are out of scope.

### Human Verification Required

### 1. In-game rank walk, /reload and import reset

**Test:** Install scratchpad/LootListPlus-1.1.0.zip into Interface/AddOns, /llp import a fresh export for a guild where one raider listed Qiraji Bindings twice. With two Bindings in one loot window, award both to that raider, with one /reload in between; then /llp import again.
**Expected:** The second row shows the raider's second rank after the first award, the raider leaves after the second, /reload keeps the second rank, a fresh import resets to the best rank.
**Why human:** LootFrame is stubbed in the harness and /reload is simulated; the real frame rebuild, AceDB and SavedVariables need the client.

### 2. Export to the website

**Test:** /llp export after both awards, paste into the website twice.
**Expected:** Copy 1 and copy 2 are recorded; the second paste reports both as already recorded.
**Why human:** Live server path (external service).

### 3. Score breakdown lines

**Test:** Hover a score with role or raider bonuses on.
**Expected:** "Role bonus" and "Raider bonus" lines after "Rank modifier"; lines sum to the total; tooltip fits.
**Why human:** UI file not loaded by the harness; visual.

### 4. Admin page line

**Test:** Open the WoW Addon admin page with an active guild.
**Expected:** The AP-2 line in the info card, same small muted style, no CurseForge.
**Why human:** Visual check; text itself is pinned by the render test.

### Gaps Summary

No gaps. Every must-have holds against the code, not only the SUMMARY. The SUMMARY's one open item (the full vitest gate under heavy load) is resolved by the orchestrator's quiet run, in which all 165 files and 2925 tests passed. The executor's claims I re-checked independently: the byte-identical port, 60/60 luajit tests, the 18-of-43 discrimination result, byte-identical fixture regeneration at f87a359c, 20 ids accepted by the server's own regex, the 77-entry zip matching HEAD minus tests, no em dashes, no upstream, no push, tag, release or PR. All were accurate. The status is human_needed only because of the plan's end-of-phase in-game and visual checks.

Verifier housekeeping: during checks I wrote one temporary comparison file and one temporary generator output directory in the scratchpad and deleted both. I also ran read-only `git ls-remote` and `gh pr list` / `gh release list` calls. No repository files were changed.

---

_Verified: 2026-10-03T03:25:07Z_
_Verifier: Claude (gsd-verifier)_
