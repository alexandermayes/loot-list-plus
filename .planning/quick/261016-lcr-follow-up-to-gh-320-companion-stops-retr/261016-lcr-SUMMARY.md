---
phase: quick-261016-lcr
plan: 01
subsystem: companion (sync engine, API client, tray, renderer)
tags: [companion, sync, backoff, gh-320]
requirements: [GH-320]
key-files:
  created:
    - companion/src/main/stuck-entries.ts
    - companion/src/main/__tests__/stuck-entries.test.ts
  modified:
    - companion/src/main/api-client.ts
    - companion/src/main/addon-format.ts
    - companion/src/main/sync-engine.ts
    - companion/src/main/sync-status.ts
    - companion/src/main/index.ts
    - companion/src/renderer/components/PendingQueue.tsx
    - companion/README.md
status: complete
completed: 2026-10-16
---

# Quick 261016-lcr: companion stops resending permanently rejected entries (GH #320 follow-up)

## Commits

Branch fix/320-companion-stuck-entry-backoff, PR #435, squash-merged to main as 9907d824 after copy sign-off:
- abdd6ca1 test(companion): expect per-entry outcomes from submitAwards and submitAttendance (GH #320)
- 89ff5791 fix(companion): report a per-entry status and error from submitAwards and submitAttendance (GH #320)
- 5129883b test(companion): add failing tests for rejection classification, the stuck-entry store and removePendingEntries (GH #320)
- 638f6206 fix(companion): classify rejections and track permanent ones in a userData store (GH #320)
- a4211daa test(companion): add failing tests for the parked status sentences (GH #320)
- 0dfc5350 fix(companion): park entries after 3 permanent rejections and let the engine clear them (GH #320)
- 9dd09660 fix(companion): show parked entries in the tray and renderer with a Clear stuck entries action (GH #320)
- 1248e146 docs(companion): describe stuck entry backoff and the clear action in the README (GH #320)

## What changed

- `submitAwards` and `submitAttendance` return a per-entry outcome (status and error) instead of accepted indices only.
- Rejections are classified by HTTP status: 400, 404 and 422 are permanent; 401, 403, 408, 429, 5xx, non-JSON bodies and thrown fetches are transient and keep retrying on the existing interval.
- After 3 permanent rejections across passes an entry is parked: it stays in SavedVariables (so the in-game export still has it) but is left out of requests, and the file watcher no longer starts a pass for parked-only pending data. Parked state lives in `stuck-entries.json` in Electron userData, keyed by the pending entry identity, because the addon's export string serialises every pending-entry field and a companion field would leak into POST /api/addon/import-string.
- SyncStatus gains parkedAwards and parkedAttendance; the tray menu (now rebuilt on every status event, so its Status line is live for the first time) and the renderer PendingQueue card show a "Will not be retried" section with a "Clear stuck entries" action that logs to `cleared-entries.jsonl` and removes the entries from the file; refused while a pass is running.

## Verification

- `npx vitest run companion`: 72 tests before, 92 after (20 new, each seen failing first)
- `npm run lint` 0 errors; `npm run typecheck` clean; `cd companion && npm run typecheck && npm run build` clean with the three output files present
- CI on PR #435 green before merge

## Deviations from Plan

- 8 commits (red and green per TDD task) instead of 5.
- 20 new tests, matching the plan's itemised list rather than its stated 22.
- Pre-existing em dashes in unrelated companion/README.md sections left alone.

## Flags for the user

- Copy signed off 2026-10-16 (verbatim in PR #435): the parked sentences ("1 award will not be retried. The server rejected it 3 times. Use "Clear stuck entries" to remove it from the addon." and plural forms), tray item and button "Clear stuck entries", card heading "Will not be retried", and the helper text "The server rejected these every time, so the companion has stopped resending them. Clearing removes them from the addon file. Do it while WoW is closed, because the game writes its own copy back at logout."
- Pre-existing gap, not fixed: the renderer never calls window.companion.sync.start, so the engine is only started from the main process.
- Deferred: a "Retry stuck entries" action and a two-step confirm on Clear.

## Known Stubs

None.

## Threat Flags

- A corrupt stuck-entries.json reads as empty (test B8); Clear logs before it writes the SavedVariables file and is refused during a pass; MAX_PERMANENT_ATTEMPTS caps repeated posts of a bad entry.
