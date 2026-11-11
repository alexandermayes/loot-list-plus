---
phase: 04-discovery-lists-and-score-split
plan: 06
subsystem: domain
tags: [loot-style, presets, guild-settings, vitest, pure-functions]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "plan 04-01 and 04-02 add the guild_settings.loot_style column these ids must match"
provides:
  - "LOOT_STYLE_IDS, LootStyleId, isLootStyleId: the three preset ids with a tuple-based guard"
  - "LOOT_STYLE_KNOB_KEYS and LootStyleKnobs: the 20 scoring knobs a preset sets, and only those"
  - "LOOT_STYLE_PRESETS: three deeply frozen presets (name, line, knobs, summary) in draft copy"
  - "applyLootStyle, presetDiff, presetMatches, lootStyleStatus: apply a preset, count what it would change, and read Custom or Customised from live settings"
affects: [04-15, 04-16, 04-19]

actuals:
  tokens: 5000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Preset lookups sit behind an includes() guard on the id tuple, never object indexing on input"
    - "Numeric knobs compare through Number() so PostgREST numeric strings match, with empty and non-numeric strings treated as different"
    - "Customised is computed from live knobs against the preset map and never stored"

key-files:
  created:
    - domain/guild/loot-style-presets.ts
    - domain/guild/__tests__/loot-style-presets.test.ts
  modified: []

key-decisions:
  - "presetMatches is defined as an empty presetDiff, so the confirm count and the Customised badge cannot disagree"
  - "An empty or whitespace-only string never equals a numeric knob, because Number('') is 0 and would match a zero knob"
  - "even_rotation and officers_decide share the same smaller attendance bonuses (2, 1, 0.5); they differ in bad luck protection (on versus off) and the six bonus flags (off versus on)"

patterns-established:
  - "LootStyleKnobs is a type alias, not an interface, so an applied settings object is assignable to Record<string, unknown> helpers"

requirements-completed: []  # DISC-10 stays open: 04-15 and 04-16 declare it and have no SUMMARY yet (confirmed with requirements.ready-ids)

coverage:
  - id: D1
    description: "Exactly three presets (reward_attendance, even_rotation, officers_decide), each a deeply frozen map of the same 20 knobs, with no setting outside the scoring knobs"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#LOOT_STYLE_PRESETS"
        status: pass
    human_judgment: false
  - id: D2
    description: "isLootStyleId rejects unknown ids, null and prototype names; applyLootStyle returns a new object and leaves unrelated keys alone; an applied preset reads back as an uncustomised preset"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#LOOT_STYLE_IDS and isLootStyleId"
        status: pass
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#applyLootStyle"
        status: pass
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#lootStyleStatus after applyLootStyle"
        status: pass
    human_judgment: false
  - id: D3
    description: "reward_attendance equals today's new-guild knobs (UI-10), asserted knob by knob"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#LOOT_STYLE_PRESETS"
        status: pass
    human_judgment: false
  - id: D4
    description: "presetMatches and presetDiff handle PostgREST numeric strings ('0.00', '4.00'), missing knobs and non-numeric strings; lootStyleStatus returns custom, preset or customised preset"
    requirement: DISC-10
    verification:
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#presetMatches"
        status: pass
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#presetDiff"
        status: pass
      - kind: unit
        ref: "domain/guild/__tests__/loot-style-presets.test.ts#lootStyleStatus"
        status: pass
    human_judgment: false
  - id: D5
    description: "The three preset names, lines, summary lines and every knob value read right to the owner for these guilds"
    verification: []
    human_judgment: true
    rationale: "All names, lines, summaries and knob values are DRAFT for the owner's 04-19 sign-off; a test pins the values, not whether they are the right values"

duration: 5min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 06: Loot Style Presets Summary

**Three frozen loot style presets over 20 scoring knobs, with pure apply, diff and Custom or Customised helpers that read PostgREST numeric strings correctly**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-11T04:21:56Z (approx, from the previous plan's close-out commit)
- **Completed:** 2026-11-11T04:27Z
- **Tasks:** 2
- **Files modified:** 2 (2 created)

## Accomplishments

- `domain/guild/loot-style-presets.ts` holds the three presets as deeply frozen maps of the same 20 `guild_settings` knobs; the three single-item flags are the "pass and see item bonuses" knobs (D-17 amended) and every preset sets them.
- `reward_attendance` equals what a new guild gets today wherever the creation insert sets a value (linear, 8 weeks, signups off, signup weight 0) and the column defaults for the attendance tiers and bad luck protection (UI-10), with the six bonus flags false to match the settings modal's out-of-box state (research A8).
- `lootStyleStatus` returns `{ kind: 'custom' }` for a null, missing or unknown `loot_style` (including `__proto__`), and a preset with `customised` computed from the live knobs, never stored (D-18).
- `presetDiff` returns exactly the knob keys that would change, in knob order, so its length is the `{n}` in the "Replace your settings?" confirm; `presetMatches` is defined as an empty diff so the two cannot disagree.
- Numeric knobs compare through `Number()` so `'0.25'` and `'4.00'` from PostgREST match `0.25` and `4`; empty, whitespace and non-numeric strings never match a number, and a missing knob counts as different.
- The tracer gate held: Task 1's verify and acceptance criteria were re-run after its GREEN commit and passed before Task 2 started. No key was added to `DEFAULT_SETTINGS`, `ScoringConfig` or `withDefaults`, and `domain/scoring/defaults.ts` and `domain/types.ts` are untouched, so the Lua exporter output cannot change.

## Task Commits

1. **Task 1: Tracer, three frozen presets applied and read back** - `2aed9426` (test, RED), `139f8bdc` (feat, GREEN)
2. **Task 2: presetMatches, presetDiff and lootStyleStatus with PostgREST numeric strings** - `7e898996` (test, RED), `65db4a40` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `domain/guild/loot-style-presets.ts` - ids and guard, knob keys and types, the three frozen presets, `applyLootStyle`, `presetDiff`, `presetMatches`, `lootStyleStatus`
- `domain/guild/__tests__/loot-style-presets.test.ts` - 29 tests: key set, freezing, UI-10 equality, prototype ids, apply and read back, numeric strings, diff lists, Custom and Customised states

## Decisions Made

- `presetMatches` is implemented as `presetDiff(...).length === 0` rather than a second comparison loop, so the confirm count and the Customised badge share one definition of "different".
- `even_rotation` and `officers_decide` share the smaller attendance bonuses (2, 1, 0.5) and differ in bad luck protection (on versus off) and the bonus flags (off versus on). That is the plan's proposed value set, kept as written; the owner reviews it with the copy at 04-19.
- Summaries are four plain lines each (attendance maximum, attendance window, bad luck protection, officer bonuses), inside the six-line cap, with no em dashes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] applyLootStyle return type collapsed to never**
- **Found during:** Task 2 (`npm run typecheck`)
- **Issue:** The plan's signature `T & LootStyleKnobs & { loot_style: LootStyleId }` reduces to `never` when T carries `loot_style: null`, which is exactly what a guild with no preset chosen looks like, so no property of the result could be read.
- **Fix:** Added `LootStyleApplied<T> = Omit<T, LootStyleKnobKey | 'loot_style'> & LootStyleKnobs & { loot_style: LootStyleId }` as the return type, and made `LootStyleKnobs` a type alias rather than an interface so applied results are assignable to `Record<string, unknown>` helpers such as `lootStyleStatus`. Runtime behaviour is unchanged.
- **Files modified:** `domain/guild/loot-style-presets.ts`
- **Verification:** `npm run typecheck` exits 0; `npx vitest run domain/guild` passes (111 tests, 6 files).
- **Commit:** `65db4a40`

**2. [Rule 2 - Missing critical] Empty string must not equal a zero knob**
- **Found during:** Task 2
- **Issue:** The plan said to guard non-numeric strings with `Number.isNaN`, but `Number('')` and `Number('  ')` are 0, so a blank value would have matched `signup_weight` 0 and reported an unset knob as matching.
- **Fix:** `knobEquals` treats an empty or whitespace-only string as different before parsing; covered by a test with `blp_maximum: ''`.
- **Files modified:** `domain/guild/loot-style-presets.ts`, `domain/guild/__tests__/loot-style-presets.test.ts`
- **Commit:** `7e898996` (test), `65db4a40` (fix)

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical). **Impact:** type signature and edge-case robustness only; the exported names, knob values and documented behaviour are as planned.

## Authentication Gates

None.

## Issues Encountered

None. `npm run lint` reports 0 errors (375 pre-existing warnings, none in the two files this plan created) and `npm run typecheck` is clean.

## Known Stubs

None.

## Threat Flags

None. Pure functions with no I/O, endpoints, schema or personal data. T-04-06-01 (prototype ids) is mitigated by the tuple guard and tested with `__proto__` and `constructor`; T-04-06-02 (preset flipping unrelated rules) is mitigated by the exact 20-key set assertion and the test that other keys survive `applyLootStyle`.

## Next Phase Readiness

- 04-15 can store `loot_style` through the guild routes and validate it with `isLootStyleId`; a test there should cross-check `LOOT_STYLE_IDS` against the `guild_settings_loot_style_check` ids.
- 04-16 can build the picker from `LOOT_STYLE_PRESETS`, show Custom or Customised from `lootStyleStatus`, and use `presetDiff(...).length` as the `{n}` in "Replace your settings?".
- Owner item for 04-19: every preset name, line, summary line and knob value is DRAFT; changing one later is a code edit, not a migration.
- Shipping: PR 2.

## Self-Check: PASSED

`domain/guild/loot-style-presets.ts` and `domain/guild/__tests__/loot-style-presets.test.ts` exist, and commits 2aed9426, 139f8bdc, 7e898996 and 65db4a40 are on `work/forever-phase-04`. `npx vitest run domain/guild` (111 tests), `npm run lint` (0 errors) and `npm run typecheck` pass.
