---
phase: quick-261002-h0v
verified: 2026-10-02T14:05:00Z
status: human_needed
score: 9/10 must-haves verified
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "INGAME-COMP-SYNC (D-10): one sync pass reads pending, pushes attendance then awards, then fetches guild data, then writes guild data and clears pending in a single file write; if the guild data fetch fails, pending stays and is re-sent"
    test: "Run the built companion 1.1.0 against a test WoW folder (WoW closed) that has one pending award and one pending attendance entry. Watch the network calls, then check the SavedVariables file. Repeat with the API unreachable for GET /api/addon/guild-data only."
    expected: "Calls go attendance POST, then loot-award POST, then guild-data GET; the file is written once with the new guildData and without the sent entries. When the guild-data GET fails, the file is not written and the pending entries are still there for the next pass."
    why_human: "syncNow (companion/src/main/sync-engine.ts 105-156) depends on Electron, fs and chokidar and has no test. The pure parts (applyGuildDataToSavedVars, clear-only-what-was-sent) are tested (S1 to S7) and the order is plain sequential awaits, but no test drives the pass itself."
human_verification:
  - test: "After the server PR deploys: /llp import in game with a fresh export for a guild where one raider has a removed list row and one raider already received a listed item."
    expected: "Neither shows for that item in the loot window; a raider who listed an item twice shows their best rank."
    why_human: "In-game addon behaviour (harvested from the plan's Task 3 human-check)."
  - test: "After the companion is built: run it once against a test WoW folder with WoW closed, then open the game and loot a known item."
    expected: "The loot frame recognizes the item (proves the integer item keys reach the current addon A0), and member ranks are read."
    why_human: "Needs the WoW client and the real addon (harvested from the plan's Task 3 human-check)."
  - test: "Companion sync pass order and fetch-failure behaviour (see behavior_unverified_items)."
    expected: "Push before pull, one write, pending kept when the guild-data fetch fails."
    why_human: "syncNow orchestration has no automated test."
---

# Quick task 261002-h0v: In-game support for several ranks of one item, Verification Report

**Goal:** FU-C (server) and FU-A (companion): awardId-keyed addon awards with a legacy fallback and no double recording in any ship order; award_id/awardId accepted on loot-award and import-string (malformed falls back, never rejected); addon exports drop removed rows, send ranks best last and hide received copies; companion forwards awardedAt and awardId, keeps every rank with numeric item keys that survive re-reads, pushes before pulling in one write and clears only what it sent, version 1.1.0, with tests; current addon and companion keep working. Nothing pushed, tagged or released.
**Verified:** 2026-10-02T14:05:00Z
**Status:** human_needed
**Re-verification:** No, initial verification

Code checked in WT (`scratchpad/wtgame`, branch `feat/in-game-item-ranks`, 7 commits over origin/main 4b3f66e6) and on the local branch `feat/in-game-item-ranks-server` (head 589a1987, 3 commits).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | INGAME-SRV-KEY: awardId key 'addon2:' + awardId + ':' + wowheadId + ':' + trimmed lowercased name; re-sends already_recorded from both paths; same-second distinct awardIds become copy 1 and 2; legacy-stored award found via alternate; no/malformed awardId keeps today's key | VERIFIED | `lib/loot/addon-award-insert.ts` 79 (`AWARD_ID = /^[A-Za-z0-9][A-Za-z0-9:._-]{7,63}$/`), 118-132 (`addonAwardKeys`, 200-char cap falls back to legacy), 216-222 (`.in()` only when alternates non-empty, else the original `.eq` chain); steps 2 and 3 write only the primary key. Unit tests A1-A3, L5-L7/L5b, I5-I8/I5b pass. Independent PGlite run against the REAL tv5 migration (unique index `(guild_id, source_award_key)`, per-night copy index) drove the real `insertAddonAward`: V1 legacy-stored then awardId (linked and unlinked) gives one row; V2 C0 keyless then awardId claims the row (absorb rule) and stamps the addon2 key; V3 two same-second awards with distinct awardIds sent interleaved from both paths on different nights (N-4) give exactly two rows; V3b same night gives copies 1,2; V4 malformed awardId keys on awardedAt from every path; V5 unmatched-name variants give one row each; V6 concurrent identical sends give one row. 8/8 PASS (`scratchpad/verify-h0v/pglite-h0v-output.txt`). |
| 2 | INGAME-SRV-EXPORT: both export routes drop removed_at rows and send ranks best last; payload shape and LLP1:1 unchanged | VERIFIED | Both routes select `slot, removed_at` and build items via `buildMemberRankedItems` (`lib/addon/member-ranked-items.ts` 66-92): skips `removed_at`, sorts rank ascending then slot descending, `withFactionVariants` after sorting (mirror right after its source). Higher rank is better in this codebase (pickReceivedEntries drops rank-descending first), so best is last. Addon A0 `Sync:ProcessImport` (addon repo Modules/Sync.lua ~165) and C0 are last-wins, confirmed in source. Tests M1-M8, E1/E1b, G1/G1b pass. Export payload builder only swapped its inline loop for `memberItems`. |
| 3 | INGAME-SRV-PRESKIP: one entry per loot_history award dropped, best rank first (pickReceivedEntries); failed read logs and returns everything with 200 | VERIFIED | `fetchReceivedCounts` (100-131): same select, guild filter, id order and `${character_id}-${wowhead_id}` counting as MasterSheetContent 788-795/1671-1685; explicit page loop checks error per page; error or throw logs with constant first argument and returns null. Routes pass null through to an unskipped build. Tests M3, M5, R1, R2, R2b, E2-E4, G2-G4 pass (E4/G4 assert status 200 and both entries). |
| 4 | INGAME-COMP-AWARD: companion posts awarded_at and award_id; companion key equals export-string key | VERIFIED | `companion/src/main/addon-format.ts` 51-69 forwards raw string awardedAt/awardId (undefined otherwise, dropped by JSON.stringify); `api-client.ts submitAwards` spreads the request into the POST body. P1-P5 pass; P5 imports the real `addonAwardKeys` and shows deep-equal keys for both paths, with and without awardId. |
| 5 | INGAME-COMP-RANKS: items with Lua integer keys; member items (highest) and itemRanks (every rank, highest first) with string keys; round trip keeps key types | VERIFIED | `lua-parser.ts` records numeric keys under the non-enumerable `LUA_NUMBER_KEYS` symbol; `lua-writer.ts` 93-95 writes marked numeric keys as `[n]`, all others unchanged. `convertItemsToLuaFormat` marks its keys; `convertMembersToLuaFormat` writes `items` and `itemRanks` unmarked. A-2: `applyGuildDataToSavedVars` mutates parsed tables in place (`tableAt`), S4 passes. Tests C1-C5, W1-W4, S4, S8 pass. Independent spot check (`scratchpad/verify-h0v/rt.mts`): quotes and backslashes in names round trip, a mixed table `{ "a", "b", x = 1, [10] = 2, [-3] = 4, [1.5] = 5 }` keeps Lua key types, and a second parse/write is byte-identical. |
| 6 | INGAME-COMP-SYNC: read pending, push attendance then awards, fetch, one write that clears pending; fetch failure keeps pending (plus A-3 clear-only-what-was-sent) | PRESENT_BEHAVIOR_UNVERIFIED | `sync-engine.ts` 105-156: sequential awaits in the required order; `getGuildData` throws before `writeSyncResult`, so nothing is written on a fetch failure; `writeSyncResult` re-reads the file and makes one `applyGuildDataToSavedVars` + `writeFileSync`. `clearPendingInSavedVars` removed. A-3 logic (`withoutSent`, awards matched on awardId else awardedAt+wowheadId+name, attendance on raidDate+raidName+startTime, which the addon writes) is tested by S2, S5 (mid-pass award and attendance survive), S6, and my spot check. The empty-pending fix (`{}` treated as none) is covered by P4 and S7. No test drives `syncNow` itself, so the order and fetch-failure path are present but not exercised. |
| 7 | INGAME-COMPAT: every compatibility matrix row holds; current addon and companion keep working | VERIFIED | S1+A0: payload shape unchanged, last-wins now gets the best rank. S1+A0 export string: no awardId means the legacy path (V4, I8). S1+C0: guild-data shape unchanged; keyless path byte-identical (A3). S0+C1: S0 ignores extra award_id and keys on awarded_at. C1+A0: integer item keys match `DB:GetItemByWowheadId` (`items[wowheadId]`, numeric), member ranks `tostring` (ScoreEngine 189, Roster 33); itemRanks is an extra field. A1+S0 then S1: V1. A1+C0+S1: V2. Rollback row is a documented risk and reproduces as stated (INFO line in the PGlite output). In-game confirmation is a human item. |
| 8 | COPY-R1: no in-app text; R-1 to R-6 verbatim in SCRATCH draft; no em dash | VERIFIED | No .tsx/renderer files in the diff; only console log strings changed in the companion. Script check: all six R strings appear verbatim in `scratchpad/release-h0v-companion-notes.md`. No U+2014 or `&mdash;` in any added diff line or in the three drafts. |
| 9 | DELIVERY-R1: commits in WT only with trailer; each commit server-only or companion-only; server branch has only server commits and passes; nothing pushed/tagged/released; nothing under .planning in WT; checks show no new failures | VERIFIED | 7 commits, each with `Co-Authored-By: Claude Opus 5.5`; per-commit file lists: 1a/2a/2b only `app/` and `lib/`, 1b/3a/3b/3c only `companion/`. Server branch: merge-base 4b3f66e6, 3 commits, 12 server files, no `companion/` path, non-companion tree identical to `feat/in-game-item-ranks`. From a `git archive` snapshot of the server branch: 9 server test files, 178 tests pass; `tsc --noEmit` clean. No remote branch, no `companion-v1.1*` tag; WT clean. Zero `.planning/` paths in the diff. Re-run here: root tsc clean, companion tsc clean, companion build passes, eslint on all changed .ts files clean, full vitest 2921/2922 with one 5 s timeout in `__tests__/quality-brand-token-parity.test.ts` (unrelated file) that passes alone (3/3). |
| 10 | FOLLOWUP-FUB: FU-B written up as its own follow-up plan; addon repo untouched | VERIFIED | "Follow-up plan FU-B" section in PLAN (and carried into SUMMARY) with reconciliation, design, tests, version, distribution and stop points. `scratchpad/addon-repo` does not exist; `addon-planner-ro` is clean at its single commit. |

**Score:** 9/10 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `lib/loot/addon-award-insert.ts` | addonAwardKey, addonAwardKeys, insertAddonAward with alternateKeys | VERIFIED | Exports present; used by both award routes |
| `lib/addon/member-ranked-items.ts` | buildMemberRankedItems, fetchReceivedCounts | VERIFIED | Imported and called in export-string and guild-data |
| `companion/src/main/addon-format.ts` | toPendingAwardRequests, convertItemsToLuaFormat, convertMembersToLuaFormat, applyGuildDataToSavedVars | VERIFIED | Plus readPendingLists, buildGuildDataLua; used by sync-engine.ts |
| `companion/src/main/lua-parser.ts` | parseLuaTable, LUA_NUMBER_KEYS, markLuaNumberKeys | VERIFIED | Marker read by lua-writer.ts |
| `companion/src/main/__tests__/addon-format.test.ts` | companion tests run by root vitest | VERIFIED | 22 tests, in root suite; excluded from companion tsconfig |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| loot-award/route.ts | addonAwardKeys + insertAddonAward | award_id/awarded_at, alternates as third arg | WIRED |
| import-string/route.ts processAward | addonAwardKeys + insertAddonAward | award.awardId/awardedAt | WIRED |
| export-string and guild-data routes | member-ranked-items.ts | buildMemberRankedItems(submissions, fetchReceivedCounts(...)) | WIRED |
| sync-engine.ts | addon-format.ts | toPending*, readPendingLists, buildGuildDataLua, applyGuildDataToSavedVars | WIRED |
| lua-parser.ts LUA_NUMBER_KEYS | lua-writer.ts toLuaObject | marked keys written as [n] | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|---|---|---|---|---|
| export routes members[].items | receivedCounts | loot_history paged query, guild filtered | Yes (null only on error) | FLOWING |
| companion guildData file | guildData | GET /api/addon/guild-data | Yes | FLOWING |
| companion award POST | awarded_at, award_id | parsed SavedVariables pendingAwards | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| New and changed tests | `npx vitest run` on the 10 files | 200/200 | PASS |
| Ship-order dedupe on real schema | `tsx pglite-tv5/verify-h0v-scenarios.mts` | 8/8 | PASS |
| Lua round trip, escaping, mid-pass clear | `tsx verify-h0v/rt.mts` | as expected, second round trip identical | PASS |
| Root tsc / companion tsc / companion build | as named | exit 0 / 0 / 0 | PASS |
| Full vitest | `npx vitest run` (once) | 2921/2922; the timeout file passes alone | PASS |
| Server branch | archive snapshot: 9 server test files + tsc | 178/178, tsc 0 | PASS |

### Probe Execution

Step 7c: not applicable (no probes declared).

### Requirements Coverage

| Requirement | Status | Evidence |
|---|---|---|
| INGAME-SRV-KEY | SATISFIED | Truth 1 |
| INGAME-SRV-EXPORT | SATISFIED | Truth 2 |
| INGAME-SRV-PRESKIP | SATISFIED | Truth 3 |
| INGAME-COMP-AWARD | SATISFIED | Truth 4 |
| INGAME-COMP-RANKS | SATISFIED | Truth 5 |
| INGAME-COMP-SYNC | NEEDS HUMAN | Truth 6 (pure logic tested, orchestration untested) |
| INGAME-COMPAT | SATISFIED (code level) | Truth 7; in-game confirmation is a human item |
| COPY-R1 | SATISFIED | Truth 8 |
| DELIVERY-R1 | SATISFIED | Truth 9 |
| FOLLOWUP-FUB | SATISFIED | Truth 10 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| (all changed files) | | TBD/FIXME/XXX/TODO/HACK | none found | |
| `companion/src/main/sync-engine.ts` | 138-144 | status sets pendingAwards/pendingAttendance to 0 even when entries added mid-pass remain | Info | Status counter only; the entries stay in the file and are sent next pass |
| `companion/src/main/__tests__/addon-format.test.ts` | 373 | S7 title says "clears to []" but asserts only the read side | Info | The clear is covered by S2 and the spot check |

### Notes (non-blocking)

- The local branch `feat/in-game-item-ranks-server` tracks `origin/main` as its upstream (`branch.*.merge = refs/heads/main`). `push.default` is unset (simple), so a bare `git push` refuses rather than pushing to main, but push it with an explicit `git push -u origin feat/in-game-item-ranks-server`.
- Rollout race: a legacy-only request and an awardId request for the same award arriving at the same moment during the S0 to S1 deploy overlap could both insert. Narrow, deploy-window only, and no S1-era path drops the awardId.
- The documented limits reproduce as stated: T-h0v-03 (legacy-stored award 1 then awardId award 2 in the same second gives one row) and the S1 rollback risk (addon2-stored then legacy-only re-send gives two rows).
- Already there before this work, not changed: keyless unlinked awards (C0 without a night) are not deduplicated (tv5); the Lua parser does not decode `\0` or `\ddd` escapes symmetrically with the writer.
- syncNow order change: a slow or failing attendance/award push now delays the guild-data refresh in the same pass. Submit methods count HTTP errors instead of throwing, so only a network-level throw before the fetch would skip the write, and pending is then kept.

### Human Verification Required

1. **In-game /llp import after the server deploy.** Test: fresh export for a guild with a removed list row and an already-received item. Expected: neither shows; double-listed raider shows best rank. Why human: needs the game client.
2. **Companion-written data read by the current addon.** Test: run the built companion with WoW closed, then open the game and loot a known item. Expected: item recognized (integer keys). Why human: needs the game client and the real addon.
3. **Companion sync pass order and fetch failure.** Test: one pending award plus attendance; observe the call order and the single write; repeat with guild-data unreachable. Expected: attendance, awards, then guild-data; one write without the sent entries; on fetch failure no write and pending kept. Why human: syncNow has no automated test.

### Gaps Summary

No gaps. All server truths are proven by unit tests and by an independent PGlite run of the real insert against the real tv5 migration, covering every ship order in the matrix. Companion formatting, Lua key types, A-2 in-place updates and A-3 clear-only-what-was-sent are tested. The one open item: no test drives the companion's syncNow orchestration (push-before-pull order, fetch-failure keeps pending). The code is plainly sequential, but that needs a human run along with the plan's two in-game checks.

---

_Verified: 2026-10-02T14:05:00Z_
_Verifier: Claude (gsd-verifier)_
