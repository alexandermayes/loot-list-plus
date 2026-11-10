---
phase: 02-expansion-onboarding-manifest
plan: 06
subsystem: testing
tags: [vitest, manifest-gate, expansions, registry, fixtures, forever]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "FOREVER_MANIFEST and ExpansionManifestSchema (02-02); EXPANSION_PHASES.forever (02-03); EXPANSION_REGISTRY, getExpansionMeta and getExpansionCatalog (02-04); registry pins (02-05)"
provides:
  - "data/expansions/validate.ts: pure gate with eleven named rules (duplicate-id, duplicate-raid-name, duplicate-boss-key, missing-token-class, orphan-token-class, unknown-token-class, legacy-token-exceptions-drift, phase-coverage, name-mismatch, size-order, shipped-name-changed), the native and legacy adapters, and validateExpansion with test overrides"
  - "Real registry passes with zero errors for Classic, TBC, Wrath, Cataclysm, MoP and Forever; every rule has a mutated-copy test asserting its rule name"
  - "Frozen data/expansions/__fixtures__/legacy-token-exceptions.json (33 unmapped legacy Token items: Wrath 14, Cataclysm 19), an equality ratchet that can only shrink"
  - "Frozen data/expansions/forever/__fixtures__/shipped-names.json (Barrow Deeps, Hyjal Summit, Onyxia's Lair) with an independent transcription in the test"
  - "Source scan proving the Forever opening date literal appears only in data/expansions/forever/manifest.ts (D-06)"
affects: [02-07, 02-10, phase-08-forever-launch]

actuals:
  tokens: 12986
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Strict-native, ratcheted-legacy gate: the Forever manifest satisfies every rule outright; legacy catalogs are held to their current shape by a frozen fixture instead of a weakened rule"
    - "Rule functions are exported individually and also wired into validateExpansion, so each is tested in isolation and through the aggregate with an override"
    - "Skeleton stubs in the RED commit keep typecheck green while the new tests fail"

key-files:
  created:
    - "data/expansions/validate.ts"
    - "data/expansions/__fixtures__/legacy-token-exceptions.json"
    - "data/expansions/forever/__fixtures__/shipped-names.json"
  modified:
    - "data/expansions/__tests__/manifest-gate.test.ts"

key-decisions:
  - "The legacy exceptions fixture is keyed by (slug, raid, boss, wowheadId); the item name is carried for readable failures only, so a rename of the display name does not look like a new violation"
  - "name-mismatch checks the phase list through the same resolved phases validate passes to phase-coverage, so an override of one cannot disagree with the other"
  - "shipped-name-changed runs only for native catalogs; legacy raid names are frozen by the golden files instead"
  - "validate.ts imports both fixtures as defaults so the real-registry pass exercises the ratchet and shipped-name rules, while the test imports the same JSON files and transcribes the shipped names independently"

patterns-established:
  - "Probe ids in test titles ([E-EXPN-04 adjacency], [E-EXPN-04 empty], [E-EXPN-04 encoding], [E-EXPN-04 ordering]) so plan truths map to greppable tests"
  - "Date scan: file walk over app, lib, utils, domain, components and data with a floor of 50 files, comment stripping, a literal built by joining parts so the test never holds it, and a synthetic self-check"

requirements-completed: [EXPN-04]

coverage:
  - id: D1
    description: "validateExpansion returns no errors for every registry entry with data: the five legacy adapters and the Forever manifest"
    requirement: "EXPN-04"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#validateExpansion over the real registry"
        status: pass
    human_judgment: false
  - id: D2
    description: "Duplicate wowhead_id fails a native catalog; legacy tolerates the same id under two bosses but not an identical (raid, boss, id) triple; raid names and previousNames that normalize alike fail duplicate-raid-name; two bosses with one key fail duplicate-boss-key"
    requirement: "EXPN-04"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#duplicate-id"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#duplicate-raid-name"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#duplicate-boss-key"
        status: pass
    human_judgment: false
  - id: D3
    description: "Token classes: strict for native catalogs (missing, orphan, unknown), ratcheted for legacy against the 33-entry frozen fixture (new violation fails, stale entry fails as drift)"
    requirement: "EXPN-04"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#token classes (native, strict)"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#token classes (legacy, ratcheted against the fixture)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Phase gaps, empty phases, a raid in two phases, an unphased catalog raid and a curly-apostrophe orphan fail phase-coverage; a raid with zero bosses passes and a zero-raid manifest fails the schema"
    requirement: "EXPN-04"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#phase-coverage (remaining shapes)"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#[E-EXPN-04 empty] raids with no bosses"
        status: pass
    human_judgment: false
  - id: D5
    description: "Name mismatches (registry key, registry game, phase slug, manifest storedName, slug and gameVersion, missing Wowhead domain), size-order ties and decreases, and a renamed shipped raid without previousNames all fail by rule name"
    requirement: "EXPN-04"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#name-mismatch"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#size-order"
        status: pass
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#shipped-name-changed (D-09)"
        status: pass
    human_judgment: false
  - id: D6
    description: "The Forever opening date literal appears in no non-test source file except data/expansions/forever/manifest.ts"
    requirement: "EXPN-04"
    verification:
      - kind: unit
        ref: "data/expansions/__tests__/manifest-gate.test.ts#opening date stays in data (D-06)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-10-17
status: complete
---

# Phase 2 Plan 06: Manifest Gate Summary

**Vitest manifest gate with eleven named rules, strict for the Forever manifest and ratcheted by a frozen 33-entry fixture for the five legacy catalogs, passing on the real registry and failing by rule name on every mutated copy**

## Performance

- **Duration:** about 25 min (continuation run after the tracer checkpoint; Task 1 ran in an earlier session)
- **Started:** 2026-10-17T22:43:16-07:00 (first plan commit, Task 1 RED)
- **Completed:** 2026-10-18T06:02:00Z
- **Tasks:** 2 (Task 1 tracer, Task 2 remaining rules)
- **Files modified:** 4 (1 existing test file extended, 3 created)

## Accomplishments

- `validateExpansion(storedName, overrides?)` runs all eleven rules and returns `[]` for Classic, The Burning Crusade, Wrath of the Lich King, Cataclysm, Mists of Pandaria and Forever; retail "coming soon" rows return `[]`, an unknown name returns one `name-mismatch`.
- Tracer (Task 1): duplicate-id and phase-coverage over the real registry, lifted from `raid-phase-coverage.test.ts` into pure functions.
- Task 2 added raid-name and boss-key uniqueness, native-strict and legacy-ratcheted token classes, name-mismatch, size-order and shipped-name-changed, plus the two frozen fixtures and the D-06 date scan.
- The legacy fixture was generated from the live catalogs and counted before freezing: 33 entries, Wrath of the Lich King 14 and Cataclysm 19, matching the planning measurement, so no discrepancy report was needed.
- Full suite green: `npm test` 230 files, 4357 tests; `data/expansions` plus `app/services` 29 files, 579 tests; golden seeder files untouched.

## Task Commits

1. **Task 1 (tracer) RED: failing tests for duplicate-id and phase-coverage** - `358aac36` (test)
2. **Task 1 (tracer) GREEN: implement the rules and validateExpansion** - `f06d3787` (feat)
3. **Task 2 RED: failing tests for the remaining rules, fixtures and date scan** - `642bc695` (test)
4. **Task 2 GREEN: implement the remaining rules and wire all eleven** - `8219acf6` (feat)

**Plan metadata:** the `docs(02-06)` commit that adds this summary and the forever tracking files.

## Files Created/Modified

- `data/expansions/validate.ts` - pure gate: types, `catalogFromManifest`, `catalogFromLegacy`, eleven rule functions, `legacyTokenViolations`, `validateExpansion` with `GateOverrides`
- `data/expansions/__tests__/manifest-gate.test.ts` - real-registry pass, one or more mutated-copy cases per rule, fixture equality checks, date scan with synthetic self-check
- `data/expansions/__fixtures__/legacy-token-exceptions.json` - 33 frozen unmapped legacy Token items, sorted by slug, raid, boss, wowheadId
- `data/expansions/forever/__fixtures__/shipped-names.json` - the three shipped Forever raid names

## Decisions Made

- Legacy exceptions are matched on (slug, raid, boss, wowheadId); the name is informational. Entries for another slug never count against a catalog.
- The aggregate imports both fixtures as defaults so the plain real-registry run covers the ratchet and shipped-name rules; tests still import the JSON directly and transcribe the shipped names by hand so neither can drift alone.
- `shipped-name-changed` and `duplicate-boss-key` apply to native catalogs only; `size-order` skips raids with no size, which covers legacy.
- Maintenance rule recorded in the test: once a Forever raid name ships, append it to `shipped-names.json` and never remove it; rename a raid by adding the old name to `previousNames`. A legacy Token that gains a class mapping must be removed from the exceptions fixture or the gate reports drift.

## Deviations from Plan

None - plan executed exactly as written.

The plan allowed either one or two commits for Task 2; because the task carries `tdd="true"`, it was split into a RED test commit (with signature-only stubs so typecheck stayed green) and a GREEN implementation commit, matching Task 1.

## Issues Encountered

- A first attempt to generate the exceptions fixture by copying a script into the repo and deleting it afterwards was held by the sandbox and never ran. The generator was rerun from the scratchpad with `tsx --tsconfig`, nothing was left in the repo, and the output was verified (33 total, 14 and 19) before it was copied into place.

## Known Stubs

None. The RED commit briefly held signature-only stubs in `validate.ts`; the GREEN commit replaced all of them.

## Threat Flags

None - test and data only, no new runtime surface. Threat register T-02-06-01 through T-02-06-04 are mitigated as planned: one rule per failure class with a mutated-copy test, equality ratchet on the legacy fixture, frozen shipped names with independent transcription, and the date source scan.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EXPN-04 is satisfied: the gate rejects duplicate ids, missing token classes, phase or raid gaps and name mismatches before merge, while today's data passes.
- Plans 02-07 and 02-10 can lean on the gate; any new Forever raid, boss key or tokenClasses entry is checked on the next `npm test`.
- Only plan 02-09 in this phase is still without a SUMMARY.

## Self-Check: PASSED

- Files exist: validate.ts, manifest-gate.test.ts, both fixtures.
- Commits found: 358aac36, f06d3787, 642bc695, 8219acf6.
- Acceptance: fixture totals 33 (14 and 19); shipped-names fixture equals the transcription; the three required greps are present in the test; typecheck exit 0; lint 0 errors; full test suite green.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-17*
