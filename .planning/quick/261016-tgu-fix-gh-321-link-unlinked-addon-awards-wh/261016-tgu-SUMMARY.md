---
phase: quick-261016-tgu
plan: 01
subsystem: addon API (attendance, import-string), raid-night routing, companion sync
tags: [addon, companion, attendance, raid-nights, blp, gh-321, gh-295]
requirements: [GH-321]
key-files:
  created:
    - utils/raid-events/link-unlinked-awards.ts
    - utils/raid-events/__tests__/link-unlinked-awards.test.ts
  modified:
    - app/api/addon/attendance/route.ts
    - app/api/addon/attendance/__tests__/route.test.ts
    - app/api/addon/import-string/route.ts
    - app/api/addon/import-string/__tests__/route.test.ts
    - companion/src/main/addon-format.ts
    - companion/src/main/sync-engine.ts
    - companion/src/main/__tests__/addon-format.test.ts
status: complete
completed: 2026-10-16
---

# Quick 261016-tgu: link unlinked addon awards when attendance arrives later (GH #321)

## Commits

Website and companion: branch fix/321-backlink-addon-awards, PR #439 (merge commit recorded in STATE.md once merged):
- 595d84d5 fix(addon-api): link addon awards when attendance arrives later (#321)
- 376979a0 fix(companion): send the session's date as awarded_date, not the UTC clock (#321)
- e1bd83dc Merge origin/main (keeps the GH #319 raid_name forwarding next to the #321 awarded_date resolution)

Addon half (Task 3, stamp sessionDate on each award) is not started: it waits for the GH #319 addon PR (loot-list-plus-addon#3) to merge, since both edit the same Lua files.

## What changed

- New utils/raid-events/link-unlinked-awards.ts: planAwardLinks (pure) applies the GH #295 pickAwardRaidEvent rules to the guild's unlinked addon awards on a date and assigns the next free award_copy per (item, raider, night) so the relink never trips idx_loot_history_unique_award_copy; rows that would need copy 11 are skipped and reported. linkUnlinkedAddonAwards does the queries and a guarded update (guild_id filter, raid_event_id still null) and never creates nights.
- POST /api/addon/attendance: after importAttendanceByTeam, the after() callback links that date's unlinked addon awards, then recomputes BLP for the night's events and for the linked items (a linked award can land on another team's night the sync did not touch). A linking failure is logged and tracked; the attendance response is unchanged.
- POST /api/addon/import-string: after all attendance records and before awards, back-links each processed night; linked item ids join the BLP recompute set. Awards accept sessionDate (addon 1.2.0) and use it for the night lookup when no attendance session in the same import matches; malformed values fall back to the awardedAt date.
- Companion: awarded_date is the addon's sessionDate when present, else the raidDate of the pending attendance session that contains awardedAt (matchPendingSession, a small copy of lib/addon/award-session.ts rules since the companion cannot import the website's lib), else the UTC date part of awardedAt as before. sync-engine passes the pending attendance list through.

## Verification

- Root `npx vitest run`: 4105 to 4135 tests (+15 helper, +3 attendance route, +6 import-string, +6 companion), all passing on the executor's tree. After merging origin/main (which carried #319): companion, app/api/addon and utils/raid-events suites 299 tests passing; `npm run typecheck` and companion `tsc --noEmit` clean; eslint clean on the merged files. Full CI on PR #439 pending at the time of writing.

## Deviations from Plan

- The attendance route test file already existed (GH #355); extended instead of created.
- Import-string night lookup goes through the GH #355 findRaidNightForAward helper, which postdates the plan; sessionDate feeds its legacyDate.
- Import-string back-linking is asserted through a mocked linkUnlinkedAddonAwards (wiring, order, BLP set, failure tolerance); the row-level behaviour is covered by the helper tests and the attendance route test, to keep the shared fake builder in that file untouched while #319 edited it too.
- recomputeBlpForItems added for linked items in the attendance route (see above).
- Copies query filters null character_id in code rather than with .not(), so the test fakes need fewer builder methods.

## Flags for the user

- Decision baked in: back-linking runs only on the two addon attendance paths, not when an officer creates a night on the website (/api/raid-events/ensure, /api/attendance/bulk). Say the word and those can follow.
- Addon Task 3 still to do after loot-list-plus-addon#3 merges; its CHANGELOG line will need copy sign-off.

## Known Stubs

None.

## Threat Flags

None. The relink update is scoped by guild_id and only touches rows whose raid_event_id is still null; nights are never created; the unique index is honoured by choosing the copy number rather than bypassing it.
