---
phase: quick-261013-jzw
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/addon-format.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/api-client.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-engine.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-status.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/addon-format.test.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/api-client.test.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/sync-status.test.ts
autonomous: true
requirements:
  - GH-320

estimate:
  # gsd-core (and so `estimate-calibration`) is not present in this worktree:
  # factor 1.0, 0 samples, so tokens equals raw_tokens and confidence is low.
  tokens: 32000
  raw_tokens: 32000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "After a sync pass in which the server rejected some pending awards or attendance (a non-2xx response or a thrown fetch), those raw entries are still in profiles.Default.pendingAwards / pendingAttendance of the SavedVariables file, and only the entries the server accepted (any 2xx, including 200 with already_recorded) are removed (GH #320)"
    - "After such a pass the status has state 'watching', pendingAwards and pendingAttendance equal to the number of requests not accepted, and lastError set to a plain sentence (for example '2 awards and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync.'), which the renderer already shows and the tray text includes"
    - "A pass in which every request is accepted still ends with pendingAwards 0, pendingAttendance 0 and lastError null, exactly as before"
    - "A pass whose guild-data fetch throws still writes nothing, so every pending entry stays (companion 1.1.0 behaviour, unchanged)"
    - "The request-to-entry pairing survives non-record entries in the pending lists: request index i always maps back to the raw entry it was built from"
  artifacts:
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/addon-format.ts"
      provides: "PendingPair<T>, toPendingAwardPairs, toPendingAttendancePairs, acceptedEntries; toPendingAwardRequests / toPendingAttendanceRequests reimplemented on the pairs"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/api-client.ts"
      provides: "SubmitResult { processed, errors, accepted: number[] } returned by submitAwards and submitAttendance"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-status.ts"
      provides: "Pure SyncStatus type, describeRejected(awards, attendance), statusText(status)"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-engine.ts"
      provides: "syncNow clears only accepted entries and reports stuck counts"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/api-client.test.ts"
      provides: "A1-A3: accepted indices for ok / 500 / thrown / already_recorded"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/sync-status.test.ts"
      provides: "D1-D6 sentence cases and T1-T6 tray text cases"
  key_links:
    - from: "sync-engine.ts syncNow"
      to: "api-client.ts submitAwards / submitAttendance"
      via: "the request array passed is exactly pairs.map(p => p.request), in pair order, so result.accepted indices index into the pairs"
    - from: "sync-engine.ts syncNow"
      to: "addon-format.ts acceptedEntries -> applyGuildDataToSavedVars (via writeSyncResult)"
      via: "sent = { awards: acceptedEntries(awardPairs, acceptedAwards), attendance: acceptedEntries(attendancePairs, acceptedAttendance) }, passed as hadPending ? sent : null"
    - from: "sync-engine.ts syncNow"
      to: "sync-status.ts describeRejected"
      via: "updateStatus({ lastError: describeRejected(stuckAwards, stuckAttendance), pendingAwards: stuckAwards, pendingAttendance: stuckAttendance })"
---

<objective>
Fix GH #320: the companion clears every pending award and attendance record it sent at the end of a sync pass, even ones the server rejected, so a rejected award is silently lost. After this plan the companion removes only the entries the server accepted (2xx, including a 200 already_recorded repeat), keeps rejected entries in SavedVariables for the next pass, and shows how many are stuck (status counts, the renderer's existing lastError line, and the tray text).

Purpose: an officer's in-game awards never disappear without reaching LootList+, and a stuck award is visible instead of invisible.
Output: pair-preserving mappers and acceptedEntries in addon-format.ts, accepted indices from ApiClient, a new pure sync-status.ts, a reworked SyncEngine.syncNow, and three test files (one extended, two new).

Decomposition note: tracer-first is not used here because the caller fixed a two-task split. Task 1 produces pure, tested building blocks (pairs and accepted indices); Task 2 wires them through syncNow and its verify runs the whole companion suite plus the typecheck, which is the end-to-end check this change can get without constructing SyncEngine (it depends on fs, chokidar and WowFinder).

Scope fences (from the caller's decided direction):
- No renderer changes (no edits to companion/src/renderer/**). No new fields on SyncStatus; the stuck counts reuse pendingAwards / pendingAttendance and the message reuses lastError.
- No new backoff: the existing interval timer and file watcher re-trigger passes.
- A rejection the server will always give (for example a 404 "No loot item found", or a 400 for a malformed entry) now retries every pass. That is accepted for this fix; document it in the code comment and the SUMMARY.
</objective>

<execution_context>
Worktree only: every path is under /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 on branch fix/320-companion-keep-rejected. Never read or write anything under /Users/alexander.mayes/Code/personal/loot-list-plus (another session commits there). The worktree has no .claude/ or gsd-core; there is no execute-plan workflow file to load, so follow this plan directly.

Project rules: TypeScript strict, 2-space indent, trailing commas in multi-line literals, `import type` for type-only imports, relative imports inside companion (never `@/`), comments explain why and cite GH #320, no em dashes anywhere (code, comments, test names, commit messages, SUMMARY). Companion tests run in the ROOT vitest suite and start with the line `// @vitest-environment node`; companion/tsconfig.json excludes __tests__, and the root tsconfig excludes companion, so test files are not typechecked by either tsc run.
</execution_context>

<context>
Read once each before starting (all absolute):
- /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-engine.ts (syncNow lines 105-156, getStatusText 165-170, readPendingFromSavedVars 217-224, class doc 34-47, SyncStatus 26-32)
- /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/api-client.ts (submitAwards 106-134, submitAttendance 136-168)
- /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/addon-format.ts (request mappers 44-88, SentPending 31-36, withoutSent 120-138, applyGuildDataToSavedVars doc 149-163)
- /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/addon-format.test.ts (style reference; 22 tests: P1-P5, C1-C5, W1-W4, S1-S8; savedFile, awardA, awardB, night and guildDataLua live inside the applyGuildDataToSavedVars describe)

Facts the executor can rely on (verified while planning):
- Only sync-engine.ts calls submitAwards / submitAttendance / toPendingAwardRequests / toPendingAttendanceRequests. Nothing imports SyncStatus from sync-engine.ts (index.ts imports only SyncEngine; the renderer duplicates the type in App.tsx and SyncStatus.tsx, which stay untouched).
- api-client.ts has only a type import from addon-format.ts, so the root vitest suite can import ApiClient without loading Electron, chokidar or fs.
- companion/node_modules in this worktree is a DANGLING SYMLINK to /Users/alexander.mayes/Code/personal/loot-list-plus/companion/node_modules (which does not exist). Root node_modules is a symlink to the main checkout's node_modules and works for vitest and eslint (read only). companion/node_modules is gitignored (.gitignore line 6), so a real install there is never committed.
- Root eslint.config.mjs does not ignore companion/, so `npx eslint <companion files>` from the root lints them.
- None of the four existing files contains an em dash today (byte check returned 0 for each).
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pending pairs keep each raw entry next to its request, and ApiClient reports which requests were accepted (GH #320)</name>
  <files>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/addon-format.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/api-client.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/addon-format.test.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/api-client.test.ts
  </files>
  <read_first>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/addon-format.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/api-client.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/addon-format.test.ts
  </read_first>
  <behavior>
    - R1: toPendingAwardPairs(raw)[0].entry is the same object as raw[0] (toBe), and its request equals toPendingAwardRequests(raw)[0]; toPendingAttendancePairs(rawNights)[0].entry toBe rawNights[0] and its request equals { raid_date, raid_name, attended }.
    - R2: with awards raw [first, 'junk', null, 7, second], toPendingAwardPairs gives 2 pairs, pairs[0].entry toBe raw[0], pairs[1].entry toBe raw[4], pairs[1].request.character_name is second's name; with attendance raw [night, [], night2], pairs[1].entry toBe raw[2]; toPendingAwardPairs({}) and toPendingAttendancePairs(undefined) give [].
    - A1: submitAwards with three awards whose fetches resolve 200, resolve 500 and reject (network down) returns exactly { processed: 1, errors: 2, accepted: [0] }; fetch is called 3 times, the first call's URL is the base URL plus /api/addon/loot-award and its JSON body includes guild_id 'g1'.
    - A2: submitAwards with two awards whose fetches resolve 200 { data: { id } } then 200 { data: { already_recorded: true } } returns { processed: 2, errors: 0, accepted: [0, 1] }.
    - A3: submitAttendance with two records whose fetches resolve 500 then 200 returns { processed: 1, errors: 1, accepted: [1] } (indices, not a count), and posts to /api/addon/attendance.
    - The 22 existing addon-format tests stay green unchanged.
  </behavior>
  <action>
Step 0, environment (do this before any edit). From the worktree root run `npx vitest run companion` and confirm the baseline is 22 passed. Then make the companion typecheck runnable without touching the main checkout: if `test -L companion/node_modules` is true, run `unlink companion/node_modules` (this removes only the dangling link in the worktree; never use `rm -rf` with a trailing slash, which would follow the link into the main checkout), then `cd companion && npm ci --ignore-scripts`. That installs only what the committed companion/package-lock.json already pins (no new packages); `--ignore-scripts` skips Electron's binary download, which tsc does not need. Then run `npx tsc --noEmit` inside companion and record the baseline result (expected clean; if there are pre-existing errors, note them and only treat NEW errors as failures). If the install fails (for example no network), record that in the SUMMARY, skip the tsc step in both tasks, and continue with vitest and eslint; do not install anything anywhere else.

Step 1, RED. In addon-format.test.ts add `toPendingAttendancePairs` and `toPendingAwardPairs` to the existing alphabetical import list from '../addon-format'. Add a new describe block right after the toPendingAwardRequests describe, titled `toPendingAwardPairs and toPendingAttendancePairs (GH #320)`, with tests named `R1 pairs keep each raw entry by reference next to the request built from it` and `R2 a non-record entry is skipped without shifting the pairing`, implementing the R1 and R2 behaviours above. Use the file's AWARDED_AT and AWARD_ID constants; build the night objects inline with raidDate '2026-09-20', raidName "Temple of Ahn'Qiraj", startTime '2026-09-20T19:00:00Z', attended ['Thrall'] (the shared `night` fixture is scoped inside another describe, so do not reach for it). The second award in R2 uses wowheadId 16921 and characterName 'Jaina'.

Create companion/src/main/__tests__/api-client.test.ts. Its first three lines copy the header of addon-format.test.ts (the `// @vitest-environment node` line first, then the two comment lines about the root suite and the companion tsconfig). Import `afterEach, describe, expect, it, vi` from 'vitest', `ApiClient` from '../api-client', and `import type { PendingAwardRequest } from '../addon-format'`. Add small helpers: `json(status, body)` returning a `new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })`; `client()` that constructs `new ApiClient('https://lootlist.test')` and calls `setAuth({ token: 'sync-token', guildId: 'g1' })` before returning it; and `award(wowheadId)` returning a PendingAwardRequest with character_name 'Thrall', awarded_at '2026-09-20T20:00:00Z' and awarded_date '2026-09-20'. Register `afterEach(() => vi.unstubAllGlobals())`. Stub fetch per test with `vi.stubGlobal('fetch', fetchMock)` where fetchMock is a `vi.fn()` chained with mockResolvedValueOnce / mockRejectedValueOnce in call order. Write describe `ApiClient.submitAwards (GH #320)` with `A1 only a 2xx is accepted: ok, 500 and a thrown fetch give accepted [0]` and `A2 a 200 already_recorded repeat is an accept`, and describe `ApiClient.submitAttendance (GH #320)` with `A3 accepted holds input indices: a 500 then a 200 give accepted [1]`, implementing A1 to A3 above (A3 records: raid_date '2026-09-20', raid_name "Temple of Ahn'Qiraj", attended ['Thrall'], and a second with raid_date '2026-09-21'). Run the two test files and confirm the new tests fail (missing exports, missing accepted) while the 22 old ones pass.

Step 2, GREEN, addon-format.ts. After PendingAttendanceRequest add an exported generic interface `PendingPair<T>` with fields `entry: unknown` and `request: T`, doc-commented as: the raw SavedVariables entry (the same object, not a copy) next to the request built from it, so the sync engine can clear only the entries the server accepted (GH #320). Turn the loop of toPendingAwardRequests into `export function toPendingAwardPairs(raw: unknown): PendingPair<PendingAwardRequest>[]` that pushes `{ entry, request: {...the same six fields as today...} }`, and the loop of toPendingAttendanceRequests into `export function toPendingAttendancePairs(raw: unknown): PendingPair<PendingAttendanceRequest>[]` likewise. Move each existing doc comment onto its pair function and add one sentence: non-record entries are skipped, so pair i and request i always describe the same entry. Reimplement `toPendingAwardRequests(raw)` as returning `toPendingAwardPairs(raw).map(p => p.request)` and `toPendingAttendanceRequests(raw)` as `toPendingAttendancePairs(raw).map(p => p.request)`, each with a one-line doc saying it is the requests alone (used to count pending data). Field mapping must stay byte-for-byte identical so P1 to P5 and S7 keep passing.

Step 3, GREEN, api-client.ts. Add `export interface SubmitResult { processed: number; errors: number; accepted: number[] }` with a doc comment: accepted holds the indices, into the array that was submitted, of the requests that got a 2xx; a 200 with already_recorded is a repeat the server already has and counts as accepted; any other status or a thrown fetch is a reject, which the sync engine keeps in SavedVariables for the next pass (GH #320). Change both submitAwards and submitAttendance to return `Promise<SubmitResult>`. Keep the sequential awaited loop and the request bodies exactly as today, but iterate with an indexed `for (let i = 0; i < awards.length; i++)` loop (records for attendance) and on `res.ok` both increment processed and push i onto a local `accepted: number[]`; non-ok and catch still increment errors. Return `{ processed, errors, accepted }`. Keep submitAttendance's existing inline parameter type. Extend both method doc comments with one sentence about the accepted indices citing GH #320. sync-engine.ts needs no change in this task (it still reads processed and errors).

Step 4. Run the verify commands. Then commit only these four files with explicit paths (never `git add -A` or `git add .`; never stage .planning/). Commit message subject: `fix(companion): pending pairs keep raw entries and submits report accepted indices (GH #320)`, a short body saying why (the sync engine needs to know which raw entry each accepted request came from), and the final line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No em dashes in the message.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 && npx vitest run companion/src/main/__tests__/addon-format.test.ts companion/src/main/__tests__/api-client.test.ts && (cd companion && npx tsc --noEmit) && npx eslint companion/src/main/addon-format.ts companion/src/main/api-client.ts companion/src/main/__tests__/addon-format.test.ts companion/src/main/__tests__/api-client.test.ts && ! LC_ALL=C grep -n $'\xe2\x80\x94' companion/src/main/addon-format.ts companion/src/main/api-client.ts companion/src/main/__tests__/addon-format.test.ts companion/src/main/__tests__/api-client.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - vitest reports 27 passed, 0 failed for the two files (24 in addon-format.test.ts: the 22 existing plus R1 and R2; 3 in api-client.test.ts: A1 to A3).
    - `grep -c "export function toPendingAwardPairs\|export function toPendingAttendancePairs\|export interface PendingPair" companion/src/main/addon-format.ts` prints 3.
    - `grep -c "accepted.push(i)" companion/src/main/api-client.ts` prints 2 and `grep -c "Promise<SubmitResult>" companion/src/main/api-client.ts` prints 2.
    - `cd companion && npx tsc --noEmit` shows no errors beyond the Step 0 baseline (or the SUMMARY records why tsc was skipped).
    - eslint exits 0 for the four files (if eslint fails on configuration rather than on these files' code, record it in the SUMMARY and continue).
    - The em dash byte check finds nothing; `git log -1 --format=%B` contains `GH #320` and ends with the Co-Authored-By line.
    - `git show --stat HEAD` lists only the four files of this task.
  </acceptance_criteria>
  <done>Pairs keep each raw SavedVariables entry by reference next to its request (non-record entries skipped without shifting), submitAwards and submitAttendance return accepted indices where only a 2xx (including already_recorded) counts, the 22 old tests and 5 new ones pass, typecheck and lint are clean, and Task 1 is committed on fix/320-companion-keep-rejected.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: syncNow clears only accepted entries and shows the stuck counts (GH #320)</name>
  <files>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/addon-format.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-engine.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-status.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/addon-format.test.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/__tests__/sync-status.test.ts
  </files>
  <read_first>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/companion/src/main/sync-engine.ts
  </read_first>
  <behavior>
    - R3 acceptedEntries: with pairs from three distinct award records a, b, c: acceptedEntries(pairs, [2, 0]) gives [c, a] (each toBe the raw object, in the order of the accepted list); acceptedEntries(pairs, [5, -1, 1.5, 1]) gives [b] (out-of-range and non-integer indices ignored); acceptedEntries(pairs, [1, 1]) gives [b] once; acceptedEntries(pairs, []) gives [].
    - S9: savedFile() (pendingAwards [awardA, awardB], pendingAttendance [night]), pairs built from readPendingLists(saved), the server accepted award index 0 only and no attendance; applyGuildDataToSavedVars(saved, guildDataLua(), { awards: acceptedEntries(awardPairs, [0]), attendance: acceptedEntries(attendancePairs, []) }) leaves profile.pendingAwards equal to [awardB] and profile.pendingAttendance equal to [night].
    - D1 describeRejected(0, 0) is null.
    - D2 describeRejected(1, 0) is exactly `1 award was not accepted by the server. It stays in the addon and will be retried on the next sync.`
    - D3 describeRejected(0, 1) is exactly `1 attendance record was not accepted by the server. It stays in the addon and will be retried on the next sync.`
    - D4 describeRejected(2, 1) is exactly `2 awards and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync.`
    - D5 describeRejected(1, 1) is exactly `1 award and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync.`
    - D6 describeRejected(0, 3) is exactly `3 attendance records were not accepted by the server. They stay in the addon and will be retried on the next sync.`
    - T1 statusText of a syncing status is `Syncing...`; T2 an error status with lastError 'WoW installation not found at: X' gives `Error: WoW installation not found at: X`; T3 watching with lastSync '2026-10-13T12:00:00.000Z' and lastError describeRejected(2, 1) gives `Last sync: 2026-10-13T12:00:00.000Z (` + that sentence + `)`; T4 watching with that lastSync and lastError null gives `Last sync: 2026-10-13T12:00:00.000Z`; T5 idle with no lastSync and no lastError gives `Not synced yet`; T6 idle with lastError set but lastSync null gives `Not synced yet`.
  </behavior>
  <action>
Step 1, RED. In addon-format.test.ts add `acceptedEntries` to the alphabetical import list. Add a describe titled `acceptedEntries (GH #320)` after the Task 1 pairs describe, with one test `R3 picks the entries at the accepted indices and ignores out-of-range, non-integer and repeated ones` covering the R3 behaviour (three award records with distinct awardedAt values). Inside the existing `applyGuildDataToSavedVars (FU-A of 261001-tv5, D-10)` describe, after S8, add `S9 with only the accepted entries in sent, a rejected award and a rejected night stay pending (GH #320)` covering S9, using the describe's own savedFile, awardA, awardB, night and guildDataLua, and the same `(db as any)` access with the eslint-disable comment the S tests already use.

Create companion/src/main/__tests__/sync-status.test.ts with the same three header lines as api-client.test.ts, importing `describe, expect, it` from 'vitest', `describeRejected` and `statusText` from '../sync-status', and `import type { SyncStatus } from '../sync-status'`. Add a helper `status(partial: Partial<SyncStatus> = {}): SyncStatus` defaulting to state 'watching', lastSync null, lastError null, pendingAwards 0, pendingAttendance 0. Write describe `describeRejected (GH #320)` with D1 to D6 and describe `statusText (GH #320)` with T1 to T6, each test name starting with its ID and asserting the exact strings in the behaviour list with toBe. Run and confirm the new tests fail (sync-status.ts and acceptedEntries do not exist yet).

Step 2, GREEN, new companion/src/main/sync-status.ts. File header doc comment: pure status shape and wording for the sync engine, with no Electron, chokidar or file system imports, so the root vitest suite can test it (mirror the addon-format.ts header), GH #320. Move the `SyncStatus` interface here from sync-engine.ts with its five fields unchanged and export it. Export `describeRejected(awards: number, attendance: number): string | null`: build a parts list where awards greater than 0 adds `${awards} award` with an s when awards is not 1, and attendance greater than 0 adds `${attendance} attendance record` with an s when attendance is not 1; with no parts return null; join parts with ' and '; use 'was' and 'It stays' when awards plus attendance is 1, otherwise 'were' and 'They stay'; return `<parts> <was|were> not accepted by the server. <It stays|They stay> in the addon and will be retried on the next sync.` so D2 to D6 match exactly. Doc-comment it as the sentence shown in the renderer's lastError line and the tray, numbers only (no server error text or character names). Export `statusText(status: SyncStatus): string` with these branches in order: state 'syncing' gives 'Syncing...'; state 'error' gives `Error: ${status.lastError}`; lastSync and lastError both set gives `Last sync: ${status.lastSync} (${status.lastError})`; lastSync set gives `Last sync: ${status.lastSync}`; otherwise 'Not synced yet'. The first, second, fourth and fifth branches are today's getStatusText unchanged.

Step 3, GREEN, addon-format.ts. Add `export function acceptedEntries<T>(pairs: readonly PendingPair<T>[], accepted: readonly number[]): unknown[]` after the pair functions: it walks accepted in order, skips any index that is not an integer in 0..pairs.length-1 or that was already taken (track a Set), and returns pairs[i].entry for the rest. Doc comment: the raw entries the server accepted in this pass, for applyGuildDataToSavedVars to clear; rejected entries are not returned, so they stay pending (GH #320). Update the SentPending doc comment: it holds raw pending entries as the addon wrote them, both the lists readPendingLists returns and, at the end of a pass, the accepted subset that applyGuildDataToSavedVars clears. Update the applyGuildDataToSavedVars doc so `sent` is described as the entries the server accepted in this pass (only when the pass had pending data), and add that rejected entries and entries the addon added during the pass both stay for the next sync. Leave withoutSent and the identity functions unchanged.

Step 4, GREEN, sync-engine.ts.
(a) Delete the SyncStatus interface. Add `import { describeRejected, statusText } from './sync-status'`, `import type { SyncStatus } from './sync-status'`, and `export type { SyncStatus }` so the type stays exported from sync-engine.ts. In the './addon-format' import list add `acceptedEntries`, `toPendingAttendancePairs` and `toPendingAwardPairs`, and keep `toPendingAttendanceRequests` and `toPendingAwardRequests` (readPendingFromSavedVars still uses them).
(b) In syncNow step 1, rename the raw read to `pending` (same expression as today's `sent`), then build `awardPairs = toPendingAwardPairs(pending.awards)` and `attendancePairs = toPendingAttendancePairs(pending.attendance)`. Declare `let acceptedAttendance: number[] = []` and `let acceptedAwards: number[] = []`.
(c) Step 2 keeps its order and the #295 comment (attendance first). When attendancePairs is non-empty, call `this.api.submitAttendance(attendancePairs.map(p => p.request))` and assign `acceptedAttendance = result.accepted`; when awardPairs is non-empty, call `this.api.submitAwards(awardPairs.map(p => p.request))` and assign `acceptedAwards = result.accepted`. Keep the console.log calls with their constant first argument (no interpolated format strings; CodeQL blocks tainted format strings).
(d) Step 3 (getGuildData) unchanged, including its comment.
(e) Step 4: build `const sent: SentPending = { awards: acceptedEntries(awardPairs, acceptedAwards), attendance: acceptedEntries(attendancePairs, acceptedAttendance) }`, keep `hadPending` computed from the raw `pending` lists exactly as today, and keep `this.writeSyncResult(svPath, guildData, hadPending ? sent : null)` so guild data is still written on every successful pass. Comment: only accepted entries are removed; rejected ones stay in the file for the next pass (GH #320).
(f) Compute `stuckAwards = awardPairs.length - sent.awards.length` and `stuckAttendance = attendancePairs.length - sent.attendance.length`, then `updateStatus` with state 'watching', lastSync now, `lastError: describeRejected(stuckAwards, stuckAttendance)`, `pendingAwards: stuckAwards`, `pendingAttendance: stuckAttendance`. When everything was accepted this is 0, 0 and null, identical to today. The catch block is unchanged.
(g) getStatusText becomes `return statusText(this.status)`.
(h) Rewrite the class doc comment: step 4 says the single write replaces guildData and removes only the pending entries the server accepted (a 2xx, including a repeat it already had); rejected entries stay in the file and are sent again on the next pass, and their counts and a sentence go into the status (GH #320). Keep the "If step 3 fails nothing is written" note, reworded so it says all pending data is then sent again (awards dedupe by key, attendance upserts). Add one sentence: a rejection the server will always give (for example a 404 for an item it does not know) is retried every pass, and the status count is what makes it visible.

Step 5. Run the verify commands (full companion suite, typecheck, eslint on every touched file, em dash check). Commit only these five files with explicit paths (never stage .planning/). Subject: `fix(companion): keep pending awards and attendance the server rejected and show the stuck counts (GH #320)`, a short why-body, and the final line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. No em dashes. Do not push and do not open a PR.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 && npx vitest run companion && (cd companion && npx tsc --noEmit) && npx eslint companion/src/main/addon-format.ts companion/src/main/api-client.ts companion/src/main/sync-engine.ts companion/src/main/sync-status.ts companion/src/main/__tests__/addon-format.test.ts companion/src/main/__tests__/api-client.test.ts companion/src/main/__tests__/sync-status.test.ts && ! LC_ALL=C grep -n $'\xe2\x80\x94' companion/src/main/addon-format.ts companion/src/main/api-client.ts companion/src/main/sync-engine.ts companion/src/main/sync-status.ts companion/src/main/__tests__/addon-format.test.ts companion/src/main/__tests__/api-client.test.ts companion/src/main/__tests__/sync-status.test.ts && ! git log -2 --format=%B | LC_ALL=C grep -n $'\xe2\x80\x94'</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run companion` reports 40 passed, 0 failed across 3 files (addon-format.test.ts 26: the 22 existing plus R1, R2, R3, S9; api-client.test.ts 3; sync-status.test.ts 11: D1 to D6 and T1 to T6).
    - `grep -c "acceptedEntries(awardPairs, acceptedAwards)" companion/src/main/sync-engine.ts` prints 1 and `grep -c "acceptedEntries(attendancePairs, acceptedAttendance)" companion/src/main/sync-engine.ts` prints 1.
    - `grep -c "describeRejected(stuckAwards, stuckAttendance)" companion/src/main/sync-engine.ts` prints 1 and `grep -c "return statusText(this.status)" companion/src/main/sync-engine.ts` prints 1.
    - `grep -c "hadPending ? sent : null" companion/src/main/sync-engine.ts` prints 1 (guild data is still written on every successful pass).
    - `grep -c "^export interface SyncStatus" companion/src/main/sync-status.ts` prints 1, `grep -c "^export interface SyncStatus" companion/src/main/sync-engine.ts` prints 0, and `grep -c "export type { SyncStatus }" companion/src/main/sync-engine.ts` prints 1.
    - `grep -c "GH #320" companion/src/main/sync-engine.ts` is at least 1 and the class doc no longer says the entries "that were sent" are removed.
    - `git diff --stat HEAD~2 -- companion/src/renderer` prints nothing (no renderer changes).
    - Typecheck shows no new errors (or the SUMMARY records why it was skipped); eslint exits 0; both em dash checks find nothing.
    - `git log -2 --format=%s` shows the two task commits, each containing `GH #320`; `git status --short` shows no staged or modified tracked files outside .planning/.
  </acceptance_criteria>
  <done>A pass removes only the raw entries whose requests got a 2xx, keeps rejected ones in SavedVariables, sets pendingAwards / pendingAttendance to the stuck counts with a plain-sentence lastError (shown by the renderer and appended to the tray text), and behaves exactly as before when everything is accepted or when the guild-data fetch fails; 40 companion tests pass, typecheck and lint are clean, and Task 2 is committed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| companion -> LootList+ API | Each pending award or attendance record is POSTed with the sync token; the response status decides whether the local entry is cleared |
| SavedVariables file -> companion | The addon writes profile.pendingAwards / pendingAttendance; entries may be malformed (non-records, wrong types) |
| companion status -> renderer and tray | lastError text is displayed to the officer |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-320-01 | Tampering (data integrity) | sync-engine.ts syncNow, addon-format.ts acceptedEntries | high | mitigate | Index misalignment could clear the wrong award. Pairs keep the raw entry next to its request (R1, R2), the exact `pairs.map(p => p.request)` array is what gets submitted, and acceptedEntries ignores out-of-range, non-integer and repeated indices (R3); S9 proves a rejected award and night survive the write |
| T-320-02 | Denial of service | ApiClient submit loop on every pass | low | accept | An entry the server always rejects (404 unknown item, 400 malformed) is re-posted once per pass. Passes are bounded by the configured interval and the file watcher, requests stay sequential, and the stuck count in the status makes the loop visible; no backoff by decision. Recorded in the SUMMARY as a follow-up candidate |
| T-320-03 | Information disclosure | sync-status.ts describeRejected, statusText | low | mitigate | The sentence is built from two numbers only; no server error bodies, character names or tokens reach lastError or the tray text (D1 to D6 pin the exact strings) |
| T-320-04 | Spoofing | ApiClient auth headers | low | accept | Unchanged: the same Bearer sync token and guild_id are sent; this plan does not touch auth |
| T-320-SC | Tampering | npm ci inside companion/ | low | mitigate | No new packages are added. `npm ci --ignore-scripts` installs only versions pinned in the committed companion/package-lock.json and runs no install scripts; the dangling symlink is removed with `unlink` so nothing is written into the main checkout |
</threat_model>

<verification>
From /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357:
1. `npx vitest run companion` gives 40 passed, 0 failed.
2. `cd companion && npx tsc --noEmit` gives no errors beyond the Step 0 baseline.
3. `npx eslint` on the seven touched companion files exits 0.
4. No em dash bytes in any touched file or in the two commit messages.
5. `git log --oneline -3` shows the two GH #320 commits on fix/320-companion-keep-rejected on top of 523e2efe; nothing pushed, no PR, no .planning/ files committed.
</verification>

<success_criteria>
- Rejected pending awards and attendance stay in SavedVariables after a pass; accepted ones (2xx, including already_recorded) are removed.
- The status after a pass carries the stuck counts in pendingAwards / pendingAttendance and the describeRejected sentence in lastError, with state 'watching'; the tray text appends it in parentheses after the last sync time.
- Behaviour when everything is accepted, and when the guild-data fetch fails, is unchanged.
- No renderer edits, no new SyncStatus fields, no new dependencies.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/.planning/quick/261013-jzw-fix-gh-320-the-companion-keeps-pending-a/261013-jzw-SUMMARY.md when done (do NOT commit it). Include:
- The two commit hashes and subjects, and the final test counts per file.
- Whether companion/node_modules had to be reinstalled (dangling symlink replaced by a local `npm ci --ignore-scripts`, gitignored) and the typecheck baseline.
- Caveat: an entry the server always rejects (for example a 404 "No loot item found") now retries every pass; no backoff by decision; candidate follow-up.
- Copy sign-off needed: the describeRejected sentences are user-facing (renderer lastError line and tray). Per project rules the user signs off on user-facing copy; list the exact D2 to D6 strings for review.
- Known display quirk left as decided: the renderer shows the sentence in its red lastError style under the green "Connected" label, because renderer changes were out of scope.
- No em dashes anywhere in the SUMMARY.
</output>
