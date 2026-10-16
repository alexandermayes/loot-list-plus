---
phase: quick-261013-w2s
plan: 01
subsystem: addon-sync
tags: [addon, companion, raid-events, time-zone, gh-355]
requirements: [GH-355]
key-files:
  created:
    - lib/addon/raid-night.ts
    - lib/addon/__tests__/raid-night.test.ts
    - app/api/addon/attendance/__tests__/route.test.ts
  modified:
    - lib/addon/award-session.ts
    - lib/loot/loot-history-rows.ts
    - app/api/addon/attendance/route.ts
    - app/api/addon/loot-award/route.ts
    - app/api/addon/import-string/route.ts
    - companion/src/main/addon-format.ts
    - companion/src/main/api-client.ts
status: complete
completed: 2026-10-13
---

# Quick 261013-w2s: Addon awards and attendance match raid nights in the guild time zone (GH #355 item 2)

The addon stamps everything in UTC, so a US guild's evening raid landed on the next day's raid night. The server now picks the night from the timestamp in the guild's raid time zone (the active expansion's `timezone`, default America/New_York), and the companion sends each attendance session's start time so the server has a timestamp to convert.

## Commits (branch fix/355-raid-night-guild-timezone, PR #414)

- `fcf3c80d` fix(addon): pick raid nights in the guild's raid time zone (#355)
- `8e1c3385` feat(companion): send each attendance session's start time (#355)

## What changed

- `lib/addon/raid-night.ts` (new): `raidNightDate(utcIso, timeZone)` gives the calendar date in the zone, with 00:00 to 05:59 local rolling back to the previous night (read from Intl parts, so DST nights keep the cutoff). Empty zone falls back to America/New_York, an invalid IANA name to UTC. `guildRaidTimeZone(supabase, guildId)` reads `guilds -> expansions!guilds_active_expansion_id_fkey(timezone)`. `findRaidNightForAward` looks up the zoned date first and, when that date has no night, tries the old UTC date so awards from companions that still create UTC-dated nights keep linking.
- `POST /api/addon/attendance`: accepts optional `start_time`; a valid timestamp picks the night through `raidNightDate`, otherwise `raid_date` is used as before. The night used is echoed in the response.
- `POST /api/addon/loot-award`: a valid `awarded_at` picks the night and the stored `awarded_date`; otherwise `awarded_date` as before. Dedupe keys unchanged.
- `POST /api/addon/import-string`: sessions use their `startTime`, awards use their matched session's zoned date or their own `awardedAt`; the stored `awarded_date` matches loot-award. `AwardSessionContext` gains `startTime`; `BuildImportStringAwardRowInput` gains optional `awardedDate`.
- A failed time-zone read is logged and tracked and the request carries on with UTC dates as today.
- Companion: `PendingAttendanceRequest` and `submitAttendance` gain optional `start_time`, forwarded raw from the session's `startTime`. No version bump.

## Verification

- RED first for every task (missing module, 2 failed award-session/loot-history-rows, 3 failed attendance, 5 failed loot-award, 6 failed import-string, 2 failed companion).
- GREEN: `npx vitest run lib/addon utils/raid-events app/api/addon companion lib/loot`: 24 files, 497 tests passed.
- `npm run typecheck` and `cd companion && npx tsc --noEmit`: clean. `npx eslint` on all 15 touched files: clean.
- No em dashes in the diff.

## Deviations from Plan

- `findRaidNightForAward` passes the normalised legacy date (not the raw string) to the lookup; the import-string test expects '2026-09-20' for the first call.
- An import-string award that links through the legacy UTC night stores the UTC date part of `awardedAt`, since the plan only stores the zoned date when it is the linked date.

## Flags for the user

- Product decisions to confirm (flagged in the PR): the 00:00 to 05:59 local rollover, and the UTC-date fallback for awards.
- Nights already created on a UTC date by earlier syncs are not moved; a one-off script could re-date them.
- `PUT /api/guilds/[id]/expansions/[expansionId]` stores any string as `timezone` with no validation; an invalid name now silently means UTC. Worth a validation follow-up.
- Second of three items in #355.

## Known Stubs

None.

## Threat Flags

None. The time zone is read server-side from the guild's own row; request bodies cannot pick a zone.
