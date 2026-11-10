---
phase: 03-discovery-schema-and-need-pipeline
plan: 03
subsystem: domain
tags: [typescript, vitest, taxonomy, frozen-list, discovery, list-mode]

requires:
  - phase: 02-forever-catalog
    provides: FOREVER_EXPANSION_NAME, the only Discovery-eligible expansion name
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-01 migration enforce_raid_tier_list_mode_rules, which mirrors the list-mode rules in the database
provides:
  - Frozen 145-row need taxonomy (NEED_DEFINITIONS) with alias lookup, validator and need-row column mapping, client-safe
  - Independent 145-key fixture that gates any change to a shipped need key
  - Pure list-mode switch rules for D-03 (back to Known) and D-17 (Discovery only for Forever)
affects: [03-04, 03-05, 03-12, 03-13, 03-14, phase-04, phase-05]

actuals:
  tokens: 8800
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Frozen taxonomy built once from a slot table, looked up through a Map, never an object indexed by input"
    - "Hand-transcribed JSON fixture deep-equals the shipped list, so a key change has to edit two files on purpose"
    - "Fail-closed switch rules that accept only the exact integer 0 or the exact string 'Forever'"

key-files:
  created:
    - domain/loot/needs.ts
    - domain/loot/__fixtures__/need-keys.json
    - domain/loot/__tests__/needs.test.ts
    - domain/loot/list-mode.ts
    - domain/loot/__tests__/list-mode.test.ts
  modified: []

key-decisions:
  - "NEED_DEFINITIONS is generated from the plan's slot table and armour matrix in a fixed order, not typed out row by row; the independent fixture is what proves the generated keys match the 145 the owner reviewed"
  - "validateNeedDefinitions detects a renamed key with no alias through the key-equals-parts rule; a consistent rename of a shipped key is caught only by the fixture comparison, so the fixture stays hand-written"
  - "needRowColumns returns a fresh object and a fresh roles array on every call, so callers can mutate a payload without touching shared state"
  - "validateNeedDefinitions also rejects a previous name that equals a current name or sits on two rows, mirroring the alias rules for keys"
  - "Both modules stay out of the domain/loot barrel and import only types or the pure expansion game module, so the Phase 4 picker can use them in the browser"

patterns-established:
  - "findNeedDefinition and resolveNeedKey take an optional definitions list (default NEED_DEFINITIONS) so alias rules are tested on a structuredClone"
  - "Switch rules return { allowed: true } or { allowed: false, reason } with the reason exported as a named constant"

requirements-completed: [DISC-01, DISC-06]

coverage:
  - id: D1
    description: "Frozen taxonomy of 145 keys deep-equals the independent fixture, with 19 Big, 22 Medium and 104 Standard rows, D-23 costs, no wands and no dashes"
    requirement: DISC-01
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/needs.test.ts#need taxonomy frozen list"
        status: pass
    human_judgment: false
  - id: D2
    description: "needRowColumns produces a need-row payload (kind need, boss_name Needs, no wowhead_id, armour and role mapping) in one fixed order"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/needs.test.ts#need taxonomy tracer"
        status: pass
      - kind: unit
        ref: "domain/loot/__tests__/needs.test.ts#builds identical need-row payloads on every call (DISC-01 ordering)"
        status: pass
    human_judgment: false
  - id: D3
    description: "validateNeedDefinitions returns nothing for the shipped list and a named error for duplicates, key drift, tier-mirror breaks, dashes and unsafe aliases; retired keys resolve through previousKeys"
    requirement: DISC-01
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/needs.test.ts#validateNeedDefinitions"
        status: pass
    human_judgment: false
  - id: D4
    description: "canSwitchToKnown allows the switch only at integer 0 for both counts and fails closed otherwise; canSwitchToDiscovery allows only the exact name Forever"
    requirement: DISC-01
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/list-mode.test.ts#canSwitchToKnown (D-03)"
        status: pass
      - kind: unit
        ref: "domain/loot/__tests__/list-mode.test.ts#canSwitchToDiscovery (D-17)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The proposed switch reasons and the 145 display names are user-facing copy awaiting owner sign-off"
    requirement: DISC-01
    verification: []
    human_judgment: true
    rationale: "Display names and reason strings are proposed copy; the owner signs them off with the Phase 4 picker copy on Oct 26 (D-10, D-23)"

duration: 6 min
completed: 2026-10-20
status: complete
---

# Phase 3 Plan 03: Need Taxonomy and List-Mode Rules Summary

**Frozen 145-row Discovery need taxonomy (19 Big, 22 Medium, 104 Standard) with a hand-written key fixture as the one-way gate, plus fail-closed D-03 and D-17 list-mode switch rules**

## Performance

- **Duration:** 6 min
- **Started:** 2026-10-20T20:32:00Z
- **Completed:** 2026-10-20T20:37:30Z
- **Tasks:** 3
- **Files created:** 5 (no existing file modified)

## Accomplishments

- `domain/loot/needs.ts` builds `NEED_DEFINITIONS` from the slot table and armour matrix in one fixed order, frozen at every level. Costs are 3, 2 and 1 by tier with the classification mirrored (Reserved, Limited, Unlimited), Shield, Off-hand item and Relic are Medium, and wands live in the Ranged weapon rows (D-23).
- `findNeedDefinition`, `resolveNeedKey` and `needRowColumns` give the seeder, picker and Drop Desk one lookup and one row payload. The lookup goes through a Map, so `constructor` and `__proto__` return null.
- `domain/loot/__fixtures__/need-keys.json` is a hand-written copy of the 145 keys. The test deep-equals `NEED_DEFINITIONS` against it, so any added, dropped, renamed or reordered key fails CI until both files are edited on purpose.
- `validateNeedDefinitions` names duplicates, key drift, tier-mirror breaks, dashes and unsafe aliases; a clone-based test shows a retired key still resolving through `previousKeys`.
- `domain/loot/list-mode.ts` holds `ListMode`, `isListMode`, `canSwitchToKnown` (D-03) and `canSwitchToDiscovery` (D-17). `canSwitchToDiscovery` is the single application-side D-17 guard; the database mirror is `enforce_raid_tier_list_mode_rules` from plan 03-01.

## Task Commits

1. **Task 1 (tracer): taxonomy produces need rows** - `15db1ec8` (test, RED), `d24feafe` (feat, GREEN)
2. **Task 2: frozen-list gate** - `65ff2b79` (test, RED, with the fixture), `134b7294` (feat, GREEN: validator and alias-aware lookup)
3. **Task 3: list-mode rules** - `6b2ebd90` (test, RED), `39be3822` (feat, GREEN)

The tracer's `<verify>` (`npx vitest run domain/loot/__tests__/needs.test.ts && npm run typecheck`) passed at commit time and again with the full gate in place. Under `human_verify_mode: end-of-phase` the interactive tracer checkpoint is deferred to phase end.

## Files Created

- `domain/loot/needs.ts` - frozen taxonomy, alias lookup, validator, need-row columns
- `domain/loot/__fixtures__/need-keys.json` - independent transcription of the 145 shipped keys
- `domain/loot/__tests__/needs.test.ts` - tracer cases and the frozen-list gate (28 tests)
- `domain/loot/list-mode.ts` - list-mode type and the D-03 and D-17 rules
- `domain/loot/__tests__/list-mode.test.ts` - boundary tests (7 tests)

## Decisions Made

See `key-decisions` in the frontmatter. The main one: the list is generated from the slot table rather than typed out, and the hand-written fixture is the guard that proves the generation matches the keys the owner reviewed.

## Deviations from Plan

None - plan executed exactly as written. The plan's `validateNeedDefinitions` signature and the optional `definitions` argument on `findNeedDefinition` were followed; `resolveNeedKey` takes the same optional argument for symmetry, and the validator also checks previous names (an extension of the alias rules, not a change to them).

**Total deviations:** 0 auto-fixed. **Impact:** none.

## Issues Encountered

None. `npm run lint` reports 0 errors (375 pre-existing warnings, none in the new files); `npm run typecheck` and the full `npm test` run (247 files, 4810 tests) pass.

## Merge Gate for PR 2 (D-25)

PR 2 (branch `feat/forever-need-primitives`, plans 03-03, 03-04 and 03-05) must not merge until the owner confirms the frozen need key list at the 03-02 Task 2 stop (PR 1's merge stop), because merging freezes the keys (D-12). If PR 2 is otherwise ready before that stop, it waits. The PR 2 merge is recorded only after `03-02-SUMMARY.md` holds the `D-25 need keys confirmed` line. As of this plan, `03-02-SUMMARY.md` does not exist, so the confirmation is still owed. The list the owner reviews is `domain/loot/__fixtures__/need-keys.json`, which `NEED_DEFINITIONS` deep-equals.

## Known Stubs

None.

## Threat Flags

None. The two modules read no database column, expose no endpoint and import nothing server-only. T-03-03-01 to T-03-03-04 are mitigated as planned (fixture deep-equal and validator, Map lookup, exact-name Discovery guard, integer-zero Known guard).

## Next Phase Readiness

Plans 03-04 and 03-05 can import `NEED_BOSS_NAME` and `needRowColumns` now. Seeding (03-13) and the PATCH route (03-14) read these modules at PR 4. Display names and switch reason strings are proposed copy awaiting the Oct 26 owner sign-off.

## Self-Check: PASSED

- Files exist: needs.ts, need-keys.json, needs.test.ts, list-mode.ts, list-mode.test.ts (all FOUND)
- Commits exist: 15db1ec8, d24feafe, 65ff2b79, 134b7294, 6b2ebd90, 39be3822 (all FOUND)
- Plan verification: `npx vitest run domain/loot/__tests__/needs.test.ts domain/loot/__tests__/list-mode.test.ts` 35 passed; `npm run typecheck` and `npm run lint` exit 0; type-only-import check on needs.ts exits 0; fixture has 145 unique keys
