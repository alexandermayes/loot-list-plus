---
phase: 04-discovery-lists-and-score-split
plan: 15
subsystem: api
tags: [loot-style, presets, guild-settings, guild-creation, addon-payload, vitest, allowlist]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-01 and 04-02: guild_settings.loot_style (nullable text, guild_settings_loot_style_check) is deployed and declared in lib/database.types.ts"
  - phase: 04-discovery-lists-and-score-split
    provides: "04-06: LOOT_STYLE_IDS, isLootStyleId and LOOT_STYLE_PRESETS[id].knobs"
provides:
  - "PUT /api/guild-settings: loot_style in ALLOWED_SETTINGS_FIELDS; null or one of the three preset ids is stored with the knobs in one update, anything else answers 400 'loot_style must be one of the loot style presets' before writing"
  - "GET /api/guild-settings no-row defaults carry loot_style: null"
  - "POST /api/guilds: optional loot_style, validated before the guild insert and merged with the preset knobs into the same guild_settings insert; without it the insert is today's four fields"
  - "guild-data and export-string settings payloads drop loot_style before spreading or serialising, so a Known guild's keys and bytes do not change"
  - "A test that reads the migration file and asserts LOOT_STYLE_IDS equals the ids in guild_settings_loot_style_check"
affects: [04-16, 04-19]

actuals:
  tokens: 6000
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A preset chosen at creation rides on the creation insert; the settings PUT is never called from creation because it marks the loot_settings_completed_at activation milestone"
    - "Addon routes copy the settings row and delete loot_style (key order of the rest is kept) instead of destructuring it into an unused variable"
    - "A TypeScript id list guarded against its database check constraint by a test that parses the migration file"

key-files:
  created: []
  modified:
    - app/api/guild-settings/route.ts
    - app/api/guild-settings/__tests__/route.test.ts
    - app/api/guilds/route.ts
    - app/api/guilds/__tests__/route.test.ts
    - app/api/addon/guild-data/route.ts
    - app/api/addon/guild-data/__tests__/route.test.ts
    - app/api/addon/export-string/route.ts
    - app/api/addon/export-string/__tests__/route.test.ts

key-decisions:
  - "At creation a loot_style of null or a missing key means no preset; only a present non-null value is checked against isLootStyleId. The settings PUT treats null differently (it stores null, meaning Custom), because there it is an explicit change"
  - "Each route defines its own LOOT_STYLE_INVALID_ERROR constant with the same API-only text, because route modules do not import each other"
  - "The addon routes strip loot_style with a small local copy-and-delete helper rather than a destructure, so the rest-sibling variable does not add an unused-vars lint warning and the remaining key order stays identical"
  - "The 400 for an unknown id in the settings PUT sits after the existing allowlist and award_slot_lock_enabled checks and before the first write, so verifyPermission still runs first and a non-officer still gets 403"

patterns-established:
  - "The addon payload tests compare a row with the column against the same row without it, key for key (guild-data) and string for string (export-string), so any future column added to guild_settings has an obvious place to prove it does not leak"

requirements-completed: []  # DISC-10 stays open: 04-16 declares it and has no SUMMARY yet (confirmed with requirements.ready-ids)

coverage:
  - id: D1
    description: "PUT /api/guild-settings stores a preset id with its knobs in one update, stores null for Custom, refuses any other value with a 400 and no write, and GET defaults include loot_style null"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/api/guild-settings/__tests__/route.test.ts#PUT /api/guild-settings loot_style"
        status: pass
      - kind: unit
        ref: "app/api/guild-settings/__tests__/route.test.ts#GET /api/guild-settings loot_style default"
        status: pass
    human_judgment: false
  - id: D2
    description: "LOOT_STYLE_IDS equals the three ids in guild_settings_loot_style_check in 20261111120000_need_lists.sql"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/api/guild-settings/__tests__/route.test.ts#LOOT_STYLE_IDS against the database check"
        status: pass
    human_judgment: false
  - id: D3
    description: "POST /api/guilds applies a chosen preset inside its own settings insert (knobs plus loot_style), keeps today's four-field insert without one, answers 400 for an unknown id before any guild insert, and never calls the settings PUT or marks the loot settings milestone"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/api/guilds/__tests__/route.test.ts#POST /api/guilds loot style preset"
        status: pass
    human_judgment: false
  - id: D4
    description: "The guild-data and export-string settings payloads omit loot_style, with the remaining keys and the export string unchanged for a Known guild"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "app/api/addon/guild-data/__tests__/route.test.ts#D-30: the companion settings payload leaves loot_style out"
        status: pass
      - kind: unit
        ref: "app/api/addon/export-string/__tests__/route.test.ts#D-30: the import string settings leave loot_style out"
        status: pass
    human_judgment: false
  - id: D5
    description: "The API-only 400 text reads right to the owner"
    verification: []
    human_judgment: true
    rationale: "The message is DRAFT copy for the owner's 04-19 sign-off; it is API-only and the preset picker never shows it, but a test pins the words, not whether they are the right words"

duration: 5min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 15: Loot Style in the Settings Routes Summary

**loot_style is allowlisted and validated in the settings PUT, applied inside the guild creation settings insert, and stripped from both addon settings payloads, with a migration cross-check of the three preset ids**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-11T06:20Z (approx, from the previous plan's close-out commit)
- **Completed:** 2026-11-11T06:25Z
- **Tasks:** 3
- **Files modified:** 8 (0 created)

## Accomplishments

- `PUT /api/guild-settings` accepts `loot_style`. A preset id and its knobs land in one update; `null` stores Custom; anything else (including `__proto__`, a number or a boolean) answers 400 with `loot_style must be one of the loot style presets` and records no write. The database check stays the backstop.
- `GET /api/guild-settings` includes `loot_style: null` in the no-row defaults.
- The tracer gate held: Task 1's verify and acceptance criteria were re-run after its GREEN commit and passed before Task 2 started.
- `LOOT_STYLE_IDS` is cross-checked against the `guild_settings_loot_style_check` ARRAY in `supabase/migrations/20261111120000_need_lists.sql` by a test that reads the file, so a preset id added in code without a migration (or the reverse) fails the suite.
- `POST /api/guilds` takes an optional `loot_style`. A valid id spreads `LOOT_STYLE_PRESETS[id].knobs` and `loot_style` into the same `guild_settings` insert (22 keys including `guild_id`); no id keeps exactly `{ guild_id, attendance_type: 'linear', rolling_attendance_weeks: 8, use_signups: false, signup_weight: 0 }`; an unknown id answers 400 before `guilds` is touched.
- Creation never calls the settings PUT and never passes `lootSettingsUpdated`, so `loot_settings_completed_at` is not marked at creation (research F4); a test asserts it for both paths.
- `guild-data` and `export-string` remove `loot_style` from the settings row before it is spread or serialised. Tests compare a row with the column to the same row without it: the same keys in the same order for guild-data, and an identical export string for export-string.

## Task Commits

Each task was committed atomically (TDD: failing test, then implementation):

1. **Task 1: Tracer, a preset applied through PUT /api/guild-settings round-trips** - `7b310f50` (test), `2cb74950` (feat)
2. **Task 2: Guild creation applies a chosen preset inside its own settings insert** - `dd6c5165` (test), `c29fd117` (feat)
3. **Task 3: The addon payloads leave loot_style out** - `72fc9258` (test), `740edc09` (feat)

**Plan metadata:** recorded by the docs commit that follows this summary.

## Files Created/Modified

- `app/api/guild-settings/route.ts` - `loot_style` in the allowlist, `LOOT_STYLE_INVALID_ERROR`, the 400 check, `loot_style: null` in the GET defaults
- `app/api/guild-settings/__tests__/route.test.ts` - preset round trip, null, invalid values, non-officer still 403, GET default, migration cross-check
- `app/api/guilds/route.ts` - optional `loot_style`, its own `LOOT_STYLE_INVALID_ERROR`, preset knobs merged into the settings insert
- `app/api/guilds/__tests__/route.test.ts` - insert shape with and without a preset, 400 before any guild insert, no milestone call
- `app/api/addon/guild-data/route.ts` and `app/api/addon/export-string/route.ts` - `withoutLootStyle` applied to the settings row
- `app/api/addon/guild-data/__tests__/route.test.ts` and `app/api/addon/export-string/__tests__/route.test.ts` - payload key and byte tests; the fixture `guild_settings` row type now allows extra columns

## Decisions Made

- Creation treats `loot_style` null or missing as no preset; the settings PUT stores null as Custom. Different meaning, because creation has nothing to reset.
- Each route keeps its own `LOOT_STYLE_INVALID_ERROR` string (route modules do not import each other); both carry the same API-only text.
- The addon routes use a copy-and-delete helper instead of a rest destructure, which keeps the remaining key order and avoids an unused-variable warning.
- The settings PUT validates `loot_style` after `verifyPermission` and the allowlist, so authorisation is unchanged (T-04-15-02) and a non-officer still receives 403.

## Deviations from Plan

None - plan executed exactly as written.

## Authentication Gates

None.

## Issues Encountered

None. `npm run lint` reports 0 errors; its 375 warnings are pre-existing, and the four under `app/api/guilds/` are in route files this plan did not touch.

## Known Stubs

None. No placeholder values flow to rendering; the 400 text is API-only copy and is DRAFT for the 04-19 sign-off.

## Threat Flags

None. The plan's register (T-04-15-01 to T-04-15-04) is covered: ids validated in both routes plus the database check, `verifyPermission` unchanged, no settings PUT or `lootSettingsUpdated` at creation, and `loot_style` removed from both addon payloads. No new endpoint, auth path or schema change was introduced.

## Verification

- `npx vitest run app/api/guild-settings app/api/guilds app/api/addon` - 381 tests pass (17 files)
- `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts domain/guild` - 141 tests pass; this plan adds no reader of `loot_items`, `loot_submission_items` or `loot_history`, so the inventory is unchanged
- `npm run typecheck` - clean
- `npm run lint` - 0 errors
- Acceptance greps: `'loot_style'` appears twice in the settings route, `isLootStyleId(` once, the migration filename once in the settings test; `LOOT_STYLE_PRESETS` appears twice in the guilds route and `lootSettingsUpdated` zero times; `loot_style` appears four times in each addon route

## Next Phase Readiness

Ready for 04-16: the preset UI can call `PUT /api/guild-settings` with `{ ...knobs, loot_style }` and `POST /api/guilds` with `loot_style`. DISC-10 stays open until 04-16 ships. PR 4 opens only after the 04-02 deploy is recorded, which it is.

## Self-Check: PASSED

- Commits `7b310f50`, `2cb74950`, `dd6c5165`, `c29fd117`, `72fc9258`, `740edc09` exist on `work/forever-phase-04`
- All eight modified files exist and the plan creates no new files
- Every task's acceptance criteria and the plan-level verification were re-run and pass
