---
phase: quick-261013-jzw
plan: 01
subsystem: companion
tags: [companion, sync-engine, savedvariables, gh-320]
requirements: [GH-320]
key-files:
  created:
    - companion/src/main/sync-status.ts
    - companion/src/main/__tests__/api-client.test.ts
    - companion/src/main/__tests__/sync-status.test.ts
  modified:
    - companion/src/main/addon-format.ts
    - companion/src/main/api-client.ts
    - companion/src/main/sync-engine.ts
    - companion/src/main/__tests__/addon-format.test.ts
status: complete
completed: 2026-10-13
---

# Quick 261013-jzw: Companion keeps pending awards the server rejected (GH #320)

The companion now removes only the pending awards and attendance the server accepted (any 2xx, including a 200 already_recorded repeat) and keeps rejected ones in SavedVariables for the next pass, with the stuck counts shown in the status.

## Commits (branch fix/320-companion-keep-rejected)

- `e78c4709` fix(companion): pending pairs keep raw entries and submits report accepted indices (GH #320)
- `2bd9934e` fix(companion): keep pending awards and attendance the server rejected and show the stuck counts (GH #320)

## What changed

- addon-format.ts: `PendingPair<T>`, `toPendingAwardPairs`, `toPendingAttendancePairs` (raw entry kept by reference next to its request; non-record entries skipped without shifting the pairing), `acceptedEntries` (ignores out-of-range, non-integer and repeated indices). The old request mappers are now thin wrappers over the pairs. Docs for `SentPending` and `applyGuildDataToSavedVars` updated.
- api-client.ts: `SubmitResult { processed, errors, accepted: number[] }` returned by `submitAwards` and `submitAttendance`; only a 2xx is accepted, a non-2xx or thrown fetch is a reject.
- sync-status.ts (new, pure): `SyncStatus` type moved here (still re-exported from sync-engine.ts), `describeRejected(awards, attendance)`, `statusText(status)`.
- sync-engine.ts: `syncNow` submits `pairs.map(p => p.request)`, writes `acceptedEntries(...)` as `sent`, and sets `pendingAwards` / `pendingAttendance` to the stuck counts with `lastError` set to the `describeRejected` sentence. A fully accepted pass still ends 0, 0, null. A failing guild-data fetch still writes nothing. `getStatusText` delegates to `statusText`.

## Verification

- `npx vitest run companion` (worktree root): 5 files, 71 tests passed. Per file: addon-format 26 (22 existing + R1, R2, R3, S9), api-client 3 (A1 to A3), sync-status 12 (D1 to D6, T1 to T6), authorize-page 7 (untouched). Baseline before changes was 52 across 3 files (the plan's 40 total counted only the main-process files and miscounted sync-status as 11; there are 12 tests).
- Each task was done tests first: RED confirmed (5 failing, then 2 failing plus the missing sync-status module) before GREEN.
- `cd companion && npx tsc --noEmit`: clean, baseline and final.
- `npx eslint` on the 7 touched files: exit 0.
- No em dash bytes in any touched file or in either commit message.
- `git log --oneline origin/main..HEAD` shows exactly the two commits; `git diff --stat origin/main..HEAD` lists only the 7 companion/src/main files (no `.planning/`, no `node_modules`); no renderer changes.

## Deviations from Plan

- Step 0 (unlink companion/node_modules and `npm ci`) was skipped on the caller's instruction: the symlink to the primary checkout's install resolved correctly, so no reinstall was needed and nothing was installed. The typecheck ran against it with a clean baseline.
- Commit trailer is `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` per the caller's override.
- The worktree-branch-name guard from the executor protocol (agent-* branches only) was not applied, because the caller assigned the branch fix/320-companion-keep-rejected explicitly.

## Flags for the user

1. Permanent rejections retry every pass. An entry the server will always reject (for example a 404 "No loot item found", or a 400 for a malformed entry) now stays pending and is re-posted on every pass. No backoff was added, by decision. The stuck count in the status makes it visible. Candidate follow-up: a backoff or a "give up and surface" rule for permanent 4xx responses (threat T-320-02, accepted).
2. The status sentences are user-facing copy and need sign-off. Exact strings from `describeRejected`:
   - D2 (1 award): `1 award was not accepted by the server. It stays in the addon and will be retried on the next sync.`
   - D3 (1 attendance record): `1 attendance record was not accepted by the server. It stays in the addon and will be retried on the next sync.`
   - D4 (2 awards, 1 attendance): `2 awards and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync.`
   - D5 (1 award, 1 attendance): `1 award and 1 attendance record were not accepted by the server. They stay in the addon and will be retried on the next sync.`
   - D6 (3 attendance records): `3 attendance records were not accepted by the server. They stay in the addon and will be retried on the next sync.`
   In the tray the sentence is appended after the last sync time in parentheses: `Last sync: <time> (<sentence>)`.
3. Display quirk left as decided: the renderer shows the sentence in its red lastError style under the green "Connected" label, because renderer changes were out of scope.

## Known Stubs

None.

## Threat Flags

None. The sentence is built from two counts only (no server text, names or tokens), per T-320-03.

## Self-Check: PASSED

Created files exist (sync-status.ts, api-client.test.ts, sync-status.test.ts); commits e78c4709 and 2bd9934e are on the branch.
