---
phase: quick-261016-lcr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/api-client.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/addon-format.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/stuck-entries.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-status.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-engine.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/index.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/preload/index.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/App.tsx
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/components/SyncStatus.tsx
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/components/PendingQueue.tsx
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/README.md
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/api-client.test.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/addon-format.test.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/stuck-entries.test.ts
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/sync-status.test.ts
autonomous: true
requirements:
  - GH-320

estimate:
  # estimate-calibration: factor 1, 0 samples, confidence low (derived, not self-rated).
  tokens: 95000
  raw_tokens: 95000
  tasks: 5
  confidence: low

must_haves:
  truths:
    - "A pending award or attendance record the server answers with 400, 404 or 422 is classified permanent; after 3 permanent rejections across passes the companion stops sending it (it is parked) while it stays in profiles.Default.pendingAwards / pendingAttendance of the SavedVariables file (GH #320 follow-up)"
    - "A pending entry the server answers with 401, 403, 408, 429, any 5xx, a non-JSON body or a thrown fetch is transient: it is re-sent on every pass at the existing interval and its attempt count never moves"
    - "Attempt counts live in stuck-entries.json in the Electron userData folder, keyed by kind plus entry identity; nothing is added to the entries in the SavedVariables file, so the addon's export string and the server's import-string parser see exactly the fields the addon wrote"
    - "After a pass the status carries pendingAwards / pendingAttendance (stuck, will be retried) and parkedAwards / parkedAttendance (will not be retried), and lastError is a count-only sentence (or two) that the renderer and the tray show"
    - "The user can remove parked entries from the SavedVariables file through a tray menu item and a renderer button; the removed raw entries are appended to cleared-entries.jsonl in userData first, and the action is refused while a pass is running"
    - "A pass in which every request is accepted still ends with pendingAwards 0, pendingAttendance 0, parkedAwards 0, parkedAttendance 0 and lastError null; a pass whose guild-data fetch throws still writes nothing to the SavedVariables file"
  artifacts:
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/api-client.ts"
      provides: "SubmitOutcome { status, error } per submitted index on SubmitResult.outcomes"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/stuck-entries.ts"
      provides: "classifyRejection, MAX_PERMANENT_ATTEMPTS, StuckStoreData, stuckKey, partitionPending, recordOutcomes, pruneStore, parkedEntries, readStuckStore, writeStuckStore, appendClearedLog"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/addon-format.ts"
      provides: "exported pendingAwardIdentity / pendingAttendanceIdentity and removePendingEntries"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-status.ts"
      provides: "SyncStatus.parkedAwards / parkedAttendance, describeParked, describeStuck"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-engine.ts"
      provides: "SyncConfig.stateDir, syncNow partition and record steps, clearParkedEntries()"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/index.ts"
      provides: "stateDir from app.getPath('userData'), tray menu rebuilt on every status event with a Clear stuck entries item, IPC sync:clearStuck"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/components/PendingQueue.tsx"
      provides: "Will not be retried section with counts and the Clear stuck entries button"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/stuck-entries.test.ts"
      provides: "B1-B9: classification, attempt counting, parking, partition, prune, store round trip, cleared log"
  key_links:
    - from: "sync-engine.ts syncNow"
      to: "stuck-entries.ts partitionPending"
      via: "only sendable pairs are submitted; result.accepted and result.outcomes index into the sendable arrays, never into the full pair arrays"
    - from: "sync-engine.ts syncNow"
      to: "stuck-entries.ts recordOutcomes then writeStuckStore"
      via: "the store is written right after the two submits and before getGuildData, so a failed guild-data fetch still keeps the attempt counts"
    - from: "sync-engine.ts clearParkedEntries"
      to: "addon-format.ts removePendingEntries and lua-writer.ts toLuaTable"
      via: "parked raw entries (by reference) are removed in place and the file is written once; guildData is not touched"
    - from: "index.ts tray and IPC, preload sync.clearStuck, PendingQueue button"
      to: "SyncEngine.clearParkedEntries"
      via: "one engine method behind both the tray item and the renderer button"
---

<objective>
Follow-up to GH #320 (fixed by PR #405): the companion keeps pending awards and attendance the server rejected, but it re-sends every rejected entry on every pass forever, including entries the server will always reject (a 400 for a malformed entry, a 404 for an item the guild does not own), and the user has no way to drop them.

After this plan: each rejected entry is classified permanent (400, 404, 422) or transient (everything else, including 401/403 auth, 429, 5xx and network failures). Permanent rejections are counted per entry in a companion-side store in the Electron userData folder; after 3 of them the entry is parked: it stays in the SavedVariables file but the companion stops sending it. Transient rejections keep retrying at the existing interval with no count. The status reports both groups with count-only sentences; the tray and the renderer show them; a "Clear stuck entries" tray item and renderer button remove the parked entries from the file (after appending them to a local log) and their store records.

Purpose: a dead entry stops hammering the server and stops masking a healthy sync as "stuck", and the officer can clear it without hand-editing a Lua file.
Output: per-entry outcomes from ApiClient, a new pure stuck-entries.ts with a JSON store, exported identity helpers and removePendingEntries in addon-format.ts, parked counts and sentences in sync-status.ts, partition and clear logic in SyncEngine, tray/IPC/preload/renderer wiring, README paragraph, and tests (one new file, three extended).

Decomposition note: tracer-first is not used. The architecture (pairs, accepted indices, SavedVariables write path) was proven by #405; this change adds one policy layer and one action to it. Tasks 1 and 2 are independent building blocks (no shared files), Task 3 wires them in the engine, Task 4 surfaces them, Task 5 documents and ships.
</objective>

<design_decisions>
These are the decisions this plan implements. The executor does not revisit them; open questions go in the SUMMARY and the PR body.

- D-01 Classification is by HTTP status only. `classifyRejection(status: number | null)` returns 'permanent' for 400, 404 and 422 (the validation answers the two routes give: loot-award 400 at lines 83-87 and 404 at line 108; attendance 400 at lines 45-49; 422 is reserved) and 'transient' for everything else: 401 and 403 (sync-tokens.ts lines 88-120 and 145-151: the token or the officer role, not the entry, is at fault, so the entry must survive a re-login), 408, 429, every 5xx (loot-award 104, 192, 234; attendance 97, 122), and null (a thrown fetch or a non-HTTP failure). The body's `error` string is recorded on the store record for diagnostics, truncated to 200 characters, but is never used to classify and never reaches the status sentence (the count-only rule from #405, threat T-320-03, stays).
- D-02 Give-up rule: `MAX_PERMANENT_ATTEMPTS = 3`. An entry with 3 or more permanent rejections is parked. Transient rejections never increment. An accepted entry (2xx) deletes its record, so an entry rejected twice then accepted leaves nothing behind. Rationale for 3 rather than 1: a 404 can become a 200 when an officer enables the item's raid tier between passes, and three posts cost nothing; a named constant keeps it a one-line change.
- D-03 Store location: companion side, `stuck-entries.json` in the Electron userData folder (`app.getPath('userData')`, passed into the engine as `SyncConfig.stateDir`). Not in the SavedVariables entries. Verified reason: AceDB-3.0 would keep extra fields on an entry, but the addon's `Sync:EncodeExportString` (loot-list-plus-addon Modules/Sync.lua lines 67-78) exports `profile.pendingAwards` and `profile.pendingAttendance` wholesale, and `Sync:ToJSON` (line 367 onward) serializes every key of every table, so any companion field would ride into the in-game export string and on to POST /api/addon/import-string. That is doubt enough; the caller said prefer the companion-side store in that case. Keys are `${kind}:${identity}` with kind 'award' or 'attendance' and identity from the (now exported) pendingAwardIdentity / pendingAttendanceIdentity in addon-format.ts, so an award and a night can never share a record.
- D-04 Parked entries stay in the SavedVariables file (the in-game export path still has them) but are excluded from the companion's requests; the file watcher does not start a pass when only parked entries are pending.
- D-05 Status shape: `pendingAwards` / `pendingAttendance` keep their #405 meaning (rejected this pass, will be retried: transient rejections plus permanent ones under 3 attempts). New `parkedAwards` / `parkedAttendance` are the parked counts. `lastError` is `describeStuck(...)`: the #405 retrying sentence, then a space, then the new parked sentence; whichever are non-null; null when all four counts are 0.
- D-06 Clear action: `SyncEngine.clearParkedEntries()` returns `{ cleared: boolean; awards: number; attendance: number }`. It refuses (`cleared: false`) while `state === 'syncing'`. Otherwise it appends the parked raw entries to `cleared-entries.jsonl` in userData, removes them from the file in one write, deletes their store records, and updates the status. It is reached from the tray item, from IPC `sync:clearStuck` (preload `window.companion.sync.clearStuck()`), and from the renderer button. No confirmation dialog (the log is the safety net; a two-step confirm is a candidate follow-up).
- D-07 Tray: the context menu is rebuilt on every engine status event so the "Status:" line and the enabled state of "Clear stuck entries" are current. Side effect worth naming in the PR: today `createTray` builds the menu once before any engine exists, so the tray has always read "Status: Not connected".

Out of scope, flag in SUMMARY and PR body, do not implement:
- The renderer never calls `window.companion.sync.start` (grep of companion/src/renderer finds no caller), so the engine is only ever started by something outside this UI. Pre-existing; untouched.
- A "Retry stuck entries" action (reset attempts without clearing).
- A two-step confirm on Clear.
- Any change to the addon repo or the server routes.
</design_decisions>

<execution_context>
Worktree only: every path is under /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320. Start by confirming it is detached at origin/main (`git -C <worktree> status -sb`), then `git fetch origin` and `git switch -c fix/320-companion-stuck-entry-backoff origin/main`. Never read or write anything under /Users/alexander.mayes/Code/personal/loot-list-plus (another session works there). The worktree has no gsd-core; follow this plan directly.

Environment facts (verified while planning):
- `companion/node_modules` and the root `node_modules` are symlinks to the primary checkout's installs and resolve. Never run `npm ci`, `npm install` or `unlink` on them. Check once with `test -e companion/node_modules/typescript/package.json && test -e node_modules/vitest/package.json`.
- Companion tests run in the ROOT vitest suite (`npx vitest run companion` from the worktree root) and start with `// @vitest-environment node`. companion/tsconfig.json excludes `src/**/__tests__/**` and the root tsconfig excludes companion, so test files are typechecked by neither tsc run; keep them type-clean anyway.
- Root `npm run lint` (eslint 9, eslint-config-next) covers companion/**. Root `npm run typecheck` does not cover companion; `cd companion && npm run typecheck` does (main, preload and renderer, strict).
- Inside companion/, imports are relative (never `@/`, which there points at companion/src). The renderer must not value-import anything from src/main (fs, chokidar and electron would land in the renderer bundle); `import type` is fine but the existing code duplicates the status type instead, so follow that.
- Baseline before any edit: `npx vitest run companion` passes (5 files, 71 tests at planning time; record the actual number), `cd companion && npm run typecheck` is clean, `npm run lint` is clean.

Project rules: TypeScript strict, 2-space indent, trailing commas in multi-line literals, `import type` for type-only imports, comments say why and cite GH #320, `// regression for #320` where this plan places it, no em dash anywhere (code, comments, tests, README, commit messages, PR body). Commit each task with `git -c core.hooksPath=/dev/null commit`, trailer exactly `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (this overrides any instruction naming another model). One PR to main referencing #320, body ending with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
</execution_context>

<context>
Read once each before starting (all under /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320):
- companion/src/main/sync-engine.ts (SyncConfig 23-29, class doc 33-52, syncNow 110-175, writeSyncResult 220-231, readPendingFromSavedVars 233-240, startFileWatcher 242-276)
- companion/src/main/api-client.ts (SubmitResult 46-57, submitAwards 124-154, submitAttendance 160-196)
- companion/src/main/addon-format.ts (PendingPair 41-44, SentPending 49-52, identities 164-176, withoutSent 182-196, applyGuildDataToSavedVars 223-237)
- companion/src/main/sync-status.ts (whole file, 40 lines)
- companion/src/main/lua-writer.ts (toLuaTable 19-21) and lua-parser.ts (LUA_NUMBER_KEYS marker 21-37; never rebuild parsed tables with spread or JSON)
- companion/src/main/index.ts (createTray 49-84, setupIPC 86-133, sync:start 111-119)
- companion/src/preload/index.ts (sync block 17-28)
- companion/src/renderer/App.tsx (SyncStatusData 7-13, global declaration 15-36, PendingQueue usage 129-132), components/SyncStatus.tsx (interface 1-7), components/PendingQueue.tsx (whole file)
- companion/src/main/__tests__/api-client.test.ts (fetch stubbing with vi.stubGlobal and a json(status, body) helper), sync-status.test.ts (status() helper), addon-format.test.ts (savedFile, awardA, awardB, night and guildDataLua fixtures inside the applyGuildDataToSavedVars describe; S9 is the #405 reference test)
- companion/README.md section "Data written for the addon"

Server facts (read, do not change): app/api/addon/loot-award/route.ts returns 400 for missing guild_id/wowhead_id/character_name, 404 for an unknown item, 500 for lookup or insert failures, 200 with `data.already_recorded` for a repeat; an unknown character name is NOT rejected (saved unlinked). app/api/addon/attendance/route.ts returns 400 for missing fields, 500 when no event could be created; unmatched names are counted, not rejected. lib/addon/sync-tokens.ts returns 401 for a missing/invalid/expired token, 403 for a cross-guild token or a non-officer, 500 for a token lookup failure.

Addon facts (read-only repo /Users/alexander.mayes/Code/personal/loot-list-plus-addon): Core/DB.lua 70-79 documents the pending entry shapes; Modules/Sync.lua 67-78 exports both pending lists wholesale; Sync:ToJSON at 367 serializes every key. Nothing in the addon reads a field the companion might add, and nothing is added by this plan.

Existing test ids (do not reuse): addon-format P1-P5, R1-R3, C1-C5, W1-W4, S1-S10; api-client A1-A3; sync-status D1-D6, T1-T6.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: ApiClient reports a per-entry status and error next to the accepted indices (GH #320)</name>
  <files>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/api-client.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/api-client.test.ts
  </files>
  <read_first>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/api-client.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/api-client.test.ts
  </read_first>
  <precondition>`test -e companion/node_modules/typescript/package.json && test -e node_modules/vitest/package.json` succeeds from the worktree root, and `npx vitest run companion` passes before any edit (record the count).</precondition>
  <behavior>
    - A1 (updated): three awards whose fetches resolve 200, resolve 500 with body { error: 'boom' } and reject with Error('network down') give { processed: 1, errors: 2, accepted: [0], outcomes: [{ status: 200, error: null }, { status: 500, error: 'boom' }, { status: null, error: 'network down' }] }.
    - A2 (updated): two 200s (the second already_recorded) give accepted [0, 1] and outcomes with status 200 and error null for both.
    - A3 (updated): submitAttendance with a 500 then a 200 gives accepted [1] and outcomes [{ status: 500, error: 'boom' }, { status: 200, error: null }].
    - A4: a 404 whose body is { error: 'No loot item found for wowhead_id 20928' } gives outcome { status: 404, error: 'No loot item found for wowhead_id 20928' }; a 502 whose body is plain text 'Bad Gateway' gives { status: 502, error: null }; an error string longer than 200 characters is truncated to 200. // regression for #320
    - A5: a thrown non-Error value (fetch rejects with the string 'nope') gives { status: null, error: null }.
  </behavior>
  <action>
RED first: update A1-A3 in api-client.test.ts to the full shapes above (they use toEqual on the whole result, so they fail until outcomes exists) and add A4 and A5 under the existing describes, with `// regression for #320` on the line above A4. Run `npx vitest run companion/src/main/__tests__/api-client.test.ts` and confirm the new and updated tests fail.

GREEN: in api-client.ts add `export interface SubmitOutcome { status: number | null; error: string | null }` and add `outcomes: SubmitOutcome[]` to SubmitResult, documenting that outcomes[i] describes input i, status null means the fetch threw, and error is the server body's `error` string (JSON only, truncated to 200 characters) or the thrown Error's message. Add a private `rejectionError(res: Response): Promise<string | null>` that reads `res.json().catch(() => null)` and returns the `error` property when it is a string, truncated with slice(0, 200), else null; call it only on non-ok responses (ok responses are not read, as today). In both submit loops push `{ status: res.status, error: res.ok ? null : await this.rejectionError(res) }` on a response and `{ status: null, error: err instanceof Error ? err.message.slice(0, 200) : null }` in the catch. processed, errors and accepted are unchanged. Extend the SubmitResult doc comment (lines 46-52) with one sentence on outcomes and the GH #320 follow-up. No other call sites exist (only sync-engine.ts uses SubmitResult, and it ignores unknown fields until Task 3).

Commit: `fix(companion): report a per-entry status and error from submitAwards and submitAttendance (GH #320)` with the trailer.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320 && npx vitest run companion/src/main/__tests__/api-client.test.ts && (cd companion && npm run typecheck) && npx eslint companion/src/main/api-client.ts companion/src/main/__tests__/api-client.test.ts</automated>
  </verify>
  <done>A1-A5 pass (5 tests in the file), companion typecheck and eslint on the two files are clean, one commit on the branch.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Rejection policy and the userData stuck-entry store, plus identity exports and removePendingEntries (GH #320)</name>
  <files>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/stuck-entries.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/addon-format.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/stuck-entries.test.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/addon-format.test.ts
  </files>
  <read_first>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/addon-format.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/addon-format.test.ts
  </read_first>
  <behavior>
    addon-format.test.ts (new describe `pending identities and removePendingEntries (GH #320 follow-up)` placed after the acceptedEntries describe; S11 goes inside the existing applyGuildDataToSavedVars describe so it can use savedFile/awardB/night):
    - I1 pendingAwardIdentity: an entry with awardId gives `id:` plus the awardId; without one it gives `at:` plus awardedAt, `|`, wowheadId, `|`, the trimmed lowercased characterName; a non-record (null, 7, 'x') gives null.
    - I2 pendingAttendanceIdentity: raidDate, raidName and startTime joined with `|`; a non-record gives null.
    - S11 removePendingEntries(saved, { awards: [awardB], attendance: [night] }) on savedFile() leaves pendingAwards without awardB and pendingAttendance empty, leaves profiles.Default.guildData the same object as before (toBe), keeps the other profile and lootHistory by reference, and a parse of toLuaTable output still writes the [20928] key the S4 fixture has.
    stuck-entries.test.ts (new file, `// @vitest-environment node`, uses fs.mkdtempSync under os.tmpdir() and removes it in afterEach):
    - B1 classifyRejection: 400, 404 and 422 give 'permanent'; 401, 403, 408, 429, 500, 502, 503 and null give 'transient'. // regression for #320
    - B2 recordOutcomes with a permanent outcome creates a record { kind: 'award', attempts: 1, lastStatus: 404, lastError: <the body error>, lastAttemptAt: now }; two more permanent outcomes for the same entry reach attempts 3; isParked is false at 2 and true at 3.
    - B3 a transient outcome (status 500, then null) creates no record and leaves an existing record's attempts unchanged.
    - B4 an accepted outcome (200, and 200 already_recorded is the same thing here) deletes the entry's record.
    - B5 partitionPending('award', pairs [X, Y, Z], data) with X at attempts 3 and Y at attempts 1 gives sendable [Y, Z] and parked [X], each the same pair objects by reference; an attendance record whose identity string equals an award's identity string does not park the award (kind prefix in stuckKey). // regression for #320
    - B6 pruneStore(data, live) removes records whose key is not among the live pending lists and keeps the rest.
    - B7 parkedEntries(data, pending) returns the raw entries (by reference) whose record is parked, as a SentPending with awards and attendance arrays.
    - B8 writeStuckStore then readStuckStore round-trips; readStuckStore on a missing file, on invalid JSON, on version 2, and on a record with attempts 'three' gives the empty store; readStuckStore(null) gives the empty store and writeStuckStore(null, data) does nothing and does not throw.
    - B9 appendClearedLog appends one JSON line per entry with { clearedAt, kind, entry } and a second call appends rather than replaces.
  </behavior>
  <action>
RED first: write the tests above (both files), run `npx vitest run companion/src/main/__tests__/stuck-entries.test.ts companion/src/main/__tests__/addon-format.test.ts`, confirm the new tests fail (the module does not exist; the identities are not exported).

GREEN, addon-format.ts: export pendingAwardIdentity and pendingAttendanceIdentity unchanged (add doc comments: what the identity is built from and that the store in stuck-entries.ts keys on it). Add `export function removePendingEntries(saved: Record<string, unknown>, remove: SentPending): Record<string, unknown>` that does exactly the pending part of applyGuildDataToSavedVars (tableAt into LootListPlusDB.profiles.Default, then withoutSent on both lists) and returns the db table, without touching guildData; make applyGuildDataToSavedVars call it when sent is non-null so there is one implementation. Keep the in-place rule from the existing doc (never rebuild tables with spread or JSON; the LUA_NUMBER_KEYS markers must survive).

GREEN, stuck-entries.ts (new, header comment: pure policy plus a small JSON store, no Electron import, only relative imports, tested by the root suite). Contents, in this order:
- `export type PendingKind = 'award' | 'attendance'` and `export type RejectionClass = 'permanent' | 'transient'`.
- `// regression for #320` above `export const MAX_PERMANENT_ATTEMPTS = 3` with a comment giving the D-02 rationale.
- `export const PERMANENT_STATUSES: ReadonlySet<number> = new Set([400, 404, 422])` and `// regression for #320` above `export function classifyRejection(status: number | null): RejectionClass` (permanent iff the set has the status; the comment lists why 401/403/429/5xx/null are transient per D-01).
- `export interface StuckRecord { kind: PendingKind; attempts: number; lastStatus: number | null; lastError: string | null; lastAttemptAt: string }`, `export interface StuckStoreData { version: 1; entries: Record<string, StuckRecord> }`, `export function emptyStore(): StuckStoreData`.
- `export function stuckKey(kind: PendingKind, entry: unknown): string | null` returning `${kind}:${identity}` using the kind's identity helper from './addon-format', null for a non-record.
- `export function isParked(record: StuckRecord | undefined): boolean` (attempts >= MAX_PERMANENT_ATTEMPTS).
- `export function partitionPending<T>(kind, pairs: readonly PendingPair<T>[], data): { sendable: PendingPair<T>[]; parked: PendingPair<T>[] }` keeping pair order and object identity.
- `export function recordOutcomes<T>(kind, sendable: readonly PendingPair<T>[], outcomes: readonly SubmitOutcome[], data, now: string): void` (import type SubmitOutcome from './api-client'): for index i, status 200-299 deletes the record; classifyRejection permanent upserts attempts + 1 with lastStatus, lastError (already truncated by ApiClient; slice(0, 200) again defensively) and lastAttemptAt = now; transient leaves the store untouched. A null key (non-record entry) is skipped.
- `export function pruneStore(data, live: SentPending): void` deleting every record whose key is not produced by any live entry.
- `export function parkedEntries(data, pending: SentPending): SentPending` returning the raw entries whose record isParked.
- `export function readStuckStore(file: string | null): StuckStoreData`: null path, missing file, unreadable file, invalid JSON, version other than 1, entries not an object, or any record whose attempts is not a finite number all give emptyStore() (a corrupt store must never crash a pass: document this as the T-320-05 mitigation).
- `export function writeStuckStore(file: string | null, data): void`: null path is a no-op; otherwise mkdirSync(dirname, recursive) and writeFileSync JSON with 2-space indent.
- `export function appendClearedLog(file: string | null, cleared: SentPending, now: string): void`: null is a no-op; otherwise append one line per entry `JSON.stringify({ clearedAt: now, kind, entry })` plus a newline, awards then attendance.
Also export the file names as constants: `STUCK_STORE_FILE = 'stuck-entries.json'` and `CLEARED_LOG_FILE = 'cleared-entries.jsonl'`, so sync-engine.ts and the README agree.

Commit: `fix(companion): classify rejections and track permanent ones in a userData store (GH #320)` with the trailer.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320 && npx vitest run companion/src/main/__tests__/stuck-entries.test.ts companion/src/main/__tests__/addon-format.test.ts && (cd companion && npm run typecheck) && npx eslint companion/src/main/stuck-entries.ts companion/src/main/addon-format.ts companion/src/main/__tests__/stuck-entries.test.ts companion/src/main/__tests__/addon-format.test.ts</automated>
  </verify>
  <done>B1-B9, I1, I2 and S11 pass alongside the 27 existing addon-format tests (P1-P5, R1-R3, C1-C5, W1-W4, S1-S10); companion typecheck and eslint on the four files are clean; one commit on the branch.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: SyncEngine parks entries after 3 permanent rejections, reports parked counts, and can clear them (GH #320)</name>
  <files>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-status.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-engine.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/sync-status.test.ts
  </files>
  <read_first>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-engine.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/sync-status.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/__tests__/sync-status.test.ts
  </read_first>
  <precondition>Tasks 1 and 2 are committed on the branch (SubmitResult.outcomes and stuck-entries.ts exist).</precondition>
  <behavior>
    sync-status.test.ts (the status() helper gains parkedAwards: 0 and parkedAttendance: 0; D1-D6 and T1-T6 stay as they are):
    - D7 describeParked(0, 0) is null.
    - D8 describeParked(1, 0) is exactly: 1 award will not be retried. The server rejected it 3 times. Use "Clear stuck entries" to remove it from the addon.
    - D9 describeParked(2, 1) is exactly: 2 awards and 1 attendance record will not be retried. The server rejected them 3 times. Use "Clear stuck entries" to remove them from the addon.
    - D10 describeParked(0, 2) is exactly: 2 attendance records will not be retried. The server rejected them 3 times. Use "Clear stuck entries" to remove them from the addon.
    - D11 describeStuck(2, 1, 1, 0) is describeRejected(2, 1) + ' ' + describeParked(1, 0); describeStuck(0, 0, 1, 0) is describeParked(1, 0) alone; describeStuck(1, 0, 0, 0) is describeRejected(1, 0) alone; describeStuck(0, 0, 0, 0) is null.
    - T7 statusText with lastSync set and lastError = describeStuck(2, 1, 1, 0) gives `Last sync: <lastSync> (<that text>)` (the existing mechanics, locked for the longer sentence).
  </behavior>
  <action>
RED first: extend sync-status.test.ts with D7-D11 and T7 and run it; confirm failures.

GREEN, sync-status.ts: add `parkedAwards: number` and `parkedAttendance: number` to SyncStatus with a doc line each (pending = stuck this pass and retried next pass; parked = permanent rejections reached MAX_PERMANENT_ATTEMPTS, not sent again until cleared). Add `describeParked(awards, attendance)` built like describeRejected (same noun parts and " and " join; singular when the total is 1: "it"; plural: "them") using the number from MAX_PERMANENT_ATTEMPTS imported from './stuck-entries' (a type-free value import; sync-status.ts stays Electron-free). Add `describeStuck(retryingAwards, retryingAttendance, parkedAwards, parkedAttendance)` joining the two non-null sentences with a single space, null when both are null. Keep the count-only rule in the doc comment: no server text, name or token ever reaches these sentences.

GREEN, sync-engine.ts:
- SyncConfig gains `stateDir?: string` (doc: the Electron userData folder; when absent, attempt counts live only in memory for this process and nothing is written). In the constructor derive `private stuckStorePath: string | null` and `private clearedLogPath: string | null` with path.join(stateDir, STUCK_STORE_FILE / CLEARED_LOG_FILE), null without stateDir. Initial status gains parkedAwards: 0 and parkedAttendance: 0.
- Rewrite the class doc (lines 33-52) so step 2 reads: load the store, prune it to the entries still in the file, split pending into sendable and parked, send only sendable, record each outcome (accepted deletes, permanent counts, transient is ignored), write the store; and replace the last paragraph (permanent rejections retried every pass) with the D-02 rule and a pointer to clearParkedEntries.
- syncNow, after building awardPairs and attendancePairs: `const store = readStuckStore(this.stuckStorePath)`; `pruneStore(store, pending)`; `// regression for #320` then partitionPending for both kinds; submit `sendable.map(p => p.request)` for each kind (attendance first, as today); after each submit call recordOutcomes(kind, sendable, result.outcomes, store, now) where now is one `new Date().toISOString()` taken at the start of the pass; after both submits `writeStuckStore(this.stuckStorePath, store)` and only then `getGuildData()` (so a failed fetch keeps the counts). `sent` becomes acceptedEntries over the SENDABLE pair arrays with result.accepted. Counts: `retryingAwards = sendableAwards.length - sent.awards.length`, same for attendance; `parkedAwards = parked.awards.length`, same for attendance. updateStatus with state 'watching', lastSync, lastError: describeStuck(retryingAwards, retryingAttendance, parkedAwards, parkedAttendance), pendingAwards: retryingAwards, pendingAttendance: retryingAttendance, parkedAwards, parkedAttendance. hadPending stays `pending.awards.length > 0 || pending.attendance.length > 0`.
- The console.log lines keep printing counts only.
- Replace readPendingFromSavedVars with a private `readPendingPartition()` that reads the file, loads the store (no prune, no write), partitions both kinds and returns `{ sendableAwards, sendableAttendance, parkedAwards, parkedAttendance }` as numbers. In the watcher's change handler updateStatus with pendingAwards/pendingAttendance = sendable counts and parkedAwards/parkedAttendance = parked counts, and call syncNow only when sendable total > 0 (D-04). toPendingAwardRequests / toPendingAttendanceRequests may become unused in this file; remove the imports if so.
- Add `async clearParkedEntries(): Promise<{ cleared: boolean; awards: number; attendance: number }>` implementing D-06 in this order: if state is 'syncing' return { cleared: false, awards: 0, attendance: 0 }; svPath = getSavedVarsPath(); saved = readSavedVars(svPath) (null gives { cleared: true, 0, 0 }); store = readStuckStore; pending = readPendingLists(saved); parked = parkedEntries(store, pending); if both lists are empty return { cleared: true, 0, 0 }; now = new Date().toISOString(); appendClearedLog(this.clearedLogPath, parked, now); db = removePendingEntries(saved, parked); fs.writeFileSync(svPath, toLuaTable('LootListPlusDB', db), 'utf-8'); pruneStore(store, readPendingLists(saved)) (saved was changed in place, so this drops exactly the parked records); writeStuckStore; updateStatus({ parkedAwards: 0, parkedAttendance: 0, lastError: describeStuck(this.status.pendingAwards, this.status.pendingAttendance, 0, 0) }); return the counts. Wrap in try/catch like syncNow: on an error set state 'error' with the message and return { cleared: false, awards: 0, attendance: 0 }. Doc comment: why the method refuses during a pass (the pass holds the file and the store), why the log is written before the file, and the WoW-owns-the-file caveat from the README.
- getStatus/getStatusText unchanged.

Commit: `fix(companion): park entries after 3 permanent rejections and let the engine clear them (GH #320)` with the trailer.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320 && npx vitest run companion && (cd companion && npm run typecheck) && npx eslint companion/src/main/sync-engine.ts companion/src/main/sync-status.ts companion/src/main/__tests__/sync-status.test.ts</automated>
  </verify>
  <done>The whole companion suite passes (baseline + A4, A5, B1-B9, I1, I2, S11, D7-D11, T7), companion typecheck is clean (sync-engine.ts compiles against the new SubmitResult, store and status shapes), eslint on the three files is clean, one commit on the branch.</done>
</task>

<task type="auto">
  <name>Task 4: Tray, IPC, preload and renderer show parked entries and offer Clear stuck entries (GH #320)</name>
  <files>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/index.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/preload/index.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/App.tsx,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/components/SyncStatus.tsx,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/components/PendingQueue.tsx
  </files>
  <read_first>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/main/index.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/preload/index.ts,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/App.tsx,
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/src/renderer/components/PendingQueue.tsx
  </read_first>
  <precondition>Task 3 is committed (SyncEngine.clearParkedEntries, SyncConfig.stateDir and the parked status fields exist).</precondition>
  <action>
index.ts (main):
- In the `sync:start` handler construct the engine with `{ ...config, stateDir: app.getPath('userData') }` (D-03). Keep the handler's config parameter type as it is; stateDir is added in main, never trusted from the renderer.
- Replace the static menu in createTray with a `buildTrayMenu()` function used by a `refreshTray()` helper that calls `tray?.setContextMenu(buildTrayMenu())`. Items, in order: "Show LootList+ Companion"; separator; "Sync Now" (enabled only when an engine exists and its state is not 'syncing'); the disabled `Status: ${syncEngine?.getStatusText() || 'Not connected'}` line, unchanged text; "Clear stuck entries" (enabled only when an engine exists, state is not 'syncing' and parkedAwards + parkedAttendance > 0; click calls `syncEngine?.clearParkedEntries()`); separator; "Quit". Call refreshTray() at the end of createTray, inside the `syncEngine.on('status', ...)` listener in sync:start right after forwarding to the renderer (D-07), and after `syncEngine?.stop()` in sync:stop and auth:logout. Comment on buildTrayMenu: Electron menus are immutable once built, so the menu is rebuilt on every status event; this also makes the Status line live, which it never was before.
- Add `ipcMain.handle('sync:clearStuck', async () => syncEngine?.clearParkedEntries())`.
- Import type SyncStatus is not needed; use the engine's getStatus() return.

preload/index.ts: add `clearStuck: () => ipcRenderer.invoke('sync:clearStuck')` inside the sync block, after `now`.

renderer/App.tsx: add `parkedAwards: number` and `parkedAttendance: number` to SyncStatusData (lines 7-13) and add `clearStuck: () => Promise<{ cleared: boolean; awards: number; attendance: number } | undefined>` to the sync block of the global declaration. Pass to PendingQueue: `parkedAwards={syncStatus?.parkedAwards || 0}`, `parkedAttendance={syncStatus?.parkedAttendance || 0}`, `onClearStuck={() => window.companion.sync.clearStuck()}`, `clearDisabled={syncStatus?.state === 'syncing'}`.

renderer/components/SyncStatus.tsx: add the same two fields to its local SyncStatusData (lines 1-7). No visual change; its lastError line already shows the describeStuck text.

renderer/components/PendingQueue.tsx: props become `{ awards, attendance, parkedAwards, parkedAttendance, onClearStuck, clearDisabled }`. The empty-state card shows only when awards + attendance + parkedAwards + parkedAttendance is 0 (text unchanged). The existing "Pending sync" section renders when awards + attendance > 0, unchanged. Add a second card (same rounded-lg border classes) when parkedAwards + parkedAttendance > 0: heading `Will not be retried` in the same uppercase heading style as "Pending sync"; rows reuse the labels `Loot awards` and `Attendance records` with the counts in the red `text-red-400` colour; a helper paragraph in `text-xs text-gray-500`: `The server rejected these every time, so the companion has stopped resending them. Clearing removes them from the addon file. Do it while WoW is closed, because the game writes its own copy back at logout.`; then a button labelled `Clear stuck entries` styled like the Settings "Re-detect" outline button but with the red border classes of the "Log out" button, `disabled={clearDisabled}`, `onClick={onClearStuck}`. The number 3 is deliberately not in the renderer copy so it cannot drift from MAX_PERMANENT_ATTEMPTS (the renderer cannot value-import src/main).

Keep every string exactly as written here; they are listed for owner sign-off in the SUMMARY and PR body. No em dashes.

Commit: `fix(companion): show parked entries in the tray and renderer with a Clear stuck entries action (GH #320)` with the trailer.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion && npm run typecheck && cd .. && npx eslint companion/src/main/index.ts companion/src/preload/index.ts companion/src/renderer/App.tsx companion/src/renderer/components/SyncStatus.tsx companion/src/renderer/components/PendingQueue.tsx && npx vitest run companion</automated>
  </verify>
  <done>Companion typecheck (main, preload, renderer) is clean, eslint on the five files is clean, the companion suite still passes, one commit on the branch. The tray menu is rebuilt on every status event and has an enabled "Clear stuck entries" item only when parked entries exist; the renderer shows a "Will not be retried" card with the button.</done>
</task>

<task type="auto">
  <name>Task 5: README paragraph, full verification, and the PR (GH #320)</name>
  <files>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/README.md
  </files>
  <read_first>
    /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320/companion/README.md
  </read_first>
  <precondition>Tasks 1-4 are committed on fix/320-companion-stuck-entry-backoff.</precondition>
  <action>
README.md, section "Data written for the addon": fix the paragraph that says the pass "removes the pending entries it sent" so it says only the entries the server accepted are removed (true since PR #405). Add a paragraph after it: rejected entries are classified by status (400, 404 and 422 permanent; everything else transient); permanent rejections are counted per entry in `stuck-entries.json` in the Electron userData folder; after 3 the entry is parked (kept in the file, not sent again) and the status, tray and renderer say how many; "Clear stuck entries" (tray menu or the Sync status tab) removes parked entries from the file after appending them to `cleared-entries.jsonl` in the same folder; nothing is added to the entries in the SavedVariables file because the addon's export string carries every field of them. One sentence on the WoW-owns-the-file caveat already in the README applies to clearing too.

Full verification from the worktree root, in this order, all must be clean: `npm run lint`; `npm run typecheck`; `cd companion && npm run typecheck && cd ..`; `npx vitest run companion`. Then the em dash byte check over every touched file and every commit message: `git diff --name-only origin/main..HEAD | xargs grep -ln $'\xe2\x80\x94'` prints nothing, and `git log --format=%B origin/main..HEAD | grep -c $'\xe2\x80\x94'` prints 0. Also `git diff --stat origin/main..HEAD` lists only the 15 files in files_modified (no .planning, no node_modules, no companion/out).

Commit: `docs(companion): describe stuck entry backoff and the clear action in the README (GH #320)` with the trailer.

Push the branch and open ONE PR to main with `gh pr create --base main --head fix/320-companion-stuck-entry-backoff`. Title: `fix(companion): stop resending permanently rejected awards and attendance, and let the user clear them (GH #320)`. Body sections: Summary (D-01 to D-07 in two or three sentences each, including that the store is companion-side because the addon exports every field of a pending entry); Verification (the five commands and their results, test counts); Copy for sign-off (the exact strings from the sign-off list below); Side effects and flags (tray Status line is now live; the renderer never calls sync.start, pre-existing; Retry action and two-step confirm deferred); `Refs #320`. The body ends with the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Do not merge.

Write SUMMARY.md next to this PLAN.md in the scratchpad (not inside any git checkout) with: branch, commit list with hashes, verification results, the sign-off string list, deviations, flags. Then report back.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320 && npm run lint && npm run typecheck && (cd companion && npm run typecheck) && npx vitest run companion && test -z "$(git diff --name-only origin/main..HEAD | xargs grep -ln $'\xe2\x80\x94')" && gh pr view --json url -q .url</automated>
  </verify>
  <done>All four check commands clean, no em dash bytes in touched files or commit messages, five commits on the branch, one open PR to main referencing #320 with the required closing line, SUMMARY.md written in the scratchpad.</done>
</task>

</tasks>

<copy_for_sign_off>
Every new user-facing string, exactly as the code must emit it (the owner signs these off; they are a starting point, not gospel; no em dashes):

Status sentence, parked (sync-status.ts describeParked; count-only; shown in the renderer's red lastError line and inside the tray's `Last sync: <time> (...)` parentheses):
1. `1 award will not be retried. The server rejected it 3 times. Use "Clear stuck entries" to remove it from the addon.`
2. `2 awards and 1 attendance record will not be retried. The server rejected them 3 times. Use "Clear stuck entries" to remove them from the addon.`
3. `2 attendance records will not be retried. The server rejected them 3 times. Use "Clear stuck entries" to remove them from the addon.`
4. Combined (describeStuck), for example 2 retrying awards, 1 retrying attendance record, 1 parked award: `2 awards and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync. 1 award will not be retried. The server rejected it 3 times. Use "Clear stuck entries" to remove it from the addon.`

Tray (index.ts):
5. Menu item label: `Clear stuck entries` (disabled when nothing is parked or while syncing). The `Status: ...` and `Sync Now` labels are unchanged.

Renderer (PendingQueue.tsx):
6. Card heading: `Will not be retried`
7. Row labels (reused): `Loot awards`, `Attendance records`
8. Helper text: `The server rejected these every time, so the companion has stopped resending them. Clearing removes them from the addon file. Do it while WoW is closed, because the game writes its own copy back at logout.`
9. Button label: `Clear stuck entries`

Unchanged from PR #405 (already awaiting sign-off there): the retrying sentences D2-D6 in sync-status.test.ts.
</copy_for_sign_off>

<regression_comment_placement>
`// regression for #320` goes on the line above:
- `MAX_PERMANENT_ATTEMPTS` and `classifyRejection` in companion/src/main/stuck-entries.ts
- the partitionPending call in SyncEngine.syncNow (companion/src/main/sync-engine.ts)
- tests A4 (api-client.test.ts), B1 and B5 (stuck-entries.test.ts)
Every new describe block title ends with `(GH #320 follow-up)` so the suite reads as one family with the #405 tests.
</regression_comment_placement>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| server response to companion | status codes and `error` strings from LootList+ cross into the companion's store and logs |
| SavedVariables file to companion | entries written by the addon (and by anything that edits the file) are parsed and keyed |
| userData folder | stuck-entries.json and cleared-entries.jsonl are read back on every pass |
| renderer to main (IPC) | `sync:clearStuck` triggers a file write in main |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-320-04 | Information disclosure | stuck-entries.json, cleared-entries.jsonl | low | accept | Local files in userData holding character names, award ids and a 200-char server error string; the same names already sit in the SavedVariables file on the same disk; no token is ever stored (auth.ts keeps it in safeStorage). Status and tray text stay count-only (T-320-03 from #405 carried forward). |
| T-320-05 | Tampering | readStuckStore | medium | mitigate | A hand-edited or corrupt store (bad JSON, wrong version, non-numeric attempts) reads as empty instead of throwing, so a pass can never be blocked by the store; test B8. |
| T-320-06 | Denial of service / data loss | clearParkedEntries | medium | mitigate | Parked raw entries are appended to cleared-entries.jsonl before the file write; the action is user-initiated (tray or button), refused while a pass runs, and only removes entries whose record is parked; test B7 plus S11 for the exact removal. |
| T-320-07 | Denial of service (server) | syncNow resend loop | medium | mitigate | MAX_PERMANENT_ATTEMPTS caps posts of a permanently rejected entry at 3; transient rejections keep the existing interval (no tighter loop is introduced); tests B2, B3, B5. |
| T-320-08 | Spoofing / elevation | IPC sync:clearStuck | low | accept | The renderer can only call the one engine method; stateDir is set in main from app.getPath and never taken from the renderer. |
| T-320-SC | Tampering | npm/pip/cargo installs | low | accept | No package is added or installed by this plan; companion/node_modules stays the symlinked primary install. |
</threat_model>

<verification>
From /Users/alexander.mayes/Code/personal/loot-list-plus-wt-320 on branch fix/320-companion-stuck-entry-backoff:
- `npm run lint` clean
- `npm run typecheck` clean (root; does not cover companion)
- `cd companion && npm run typecheck` clean (main, preload, renderer)
- `npx vitest run companion` passes: baseline (about 72; PR #405 reported 71 and GH #355 added S10; record the actual count before editing) + A4, A5, B1-B9, I1, I2, S11, D7-D11, T7 = baseline + 22
- No em dash byte in any touched file or commit message
- `git diff --stat origin/main..HEAD` lists exactly the 15 files in files_modified
- One open PR to main, title and closing line as specified, not merged
</verification>

<success_criteria>
- A pending entry answered 400, 404 or 422 three times is no longer posted on later passes, stays in the SavedVariables file, and is counted in parkedAwards / parkedAttendance with the exact describeParked sentence in lastError.
- A pending entry answered 401, 403, 429, 5xx or a network failure is posted on every pass as before and never gains an attempt count.
- An entry rejected once or twice then accepted leaves no store record; a pass with every request accepted ends with all four counts 0 and lastError null.
- The tray menu shows a live Status line and a "Clear stuck entries" item enabled only when parked entries exist; the renderer shows the "Will not be retried" card with the button; both call SyncEngine.clearParkedEntries, which logs, removes, prunes and updates the status, and refuses during a pass.
- Nothing is added to the entries in the SavedVariables file; the addon repo and server routes are untouched.
- The sign-off string list appears verbatim in the PR body and the SUMMARY.
</success_criteria>

<output>
Write `SUMMARY.md` next to this file in the scratchpad (/private/tmp/claude-502/-Users-alexander-mayes-Code-personal-loot-list-plus/3a423c1f-0a32-45cd-8cde-77c0a14c7e60/scratchpad/plans/261016-lcr-follow-up-to-gh-320-companion-stops-retr/SUMMARY.md), never inside a git checkout. The orchestrator handles any planning-docs PR.
</output>
