---
phase: quick-261016-l9e
plan: 01
subsystem: domain/scoring
tags: [scoring, settings, gh-411]
requirements: [GH-411]
key-files:
  modified:
    - domain/scoring/defaults.ts
    - domain/scoring/__tests__/calculations.test.ts
status: complete
completed: 2026-10-16
---

# Quick 261016-l9e: align the raid_roles_overall_bonus_priority default (GH #411)

## Commits

- b92a2190 (PR #423, squash of branch fix/411-align-raid-roles-default): `fix(scoring): align the raid_roles_overall_bonus_priority default with the database (GH #411)`

## What changed

- `DEFAULT_SETTINGS.raid_roles_overall_bonus_priority` is now `true`, matching the `guild_settings` column default and the settings GET fallback.
- A `// regression for #411` assertion pins the value next to the #399 one.

## Verification

- `vitest run domain/scoring/__tests__/calculations.test.ts`: 95 pass
- `vitest run domain app/api/guild-settings lib/sheet-import`: 752 pass with the flag flipped, before the new assertion was added
- `npm run lint` (0 errors, 2 pre-existing warnings in unrelated files), `tsc --noEmit` clean

## Deviations from Plan

None.

## Flags for the user

- This is the behaviour decision #411 asked for: the code side moved to the database's `true`. Veto by reverting PR #423 if you wanted the database default changed instead.

## Known Stubs

None.

## Threat Flags

None.
