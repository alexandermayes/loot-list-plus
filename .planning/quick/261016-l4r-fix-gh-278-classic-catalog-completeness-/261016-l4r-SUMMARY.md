---
phase: quick-261016-l4r
plan: 01
subsystem: data (Classic catalog tests)
tags: [data, classic, tests, gh-278]
requirements: [GH-278]
key-files:
  created:
    - data/__tests__/fixtures/classic-gh278-zoneless.ts
    - data/__tests__/classic-gh278-zoneless.test.ts
  modified:
    - data/__tests__/classic-catalog-completeness.test.ts
    - data/classic-wow-raids.ts
status: complete
completed: 2026-10-16
---

# Quick 261016-l4r: completeness test covers zone-less Classic items (GH #278)

## Commits

Branch fix/278-catalog-completeness-zoneless, PR #428:
- 07eb264e test(data): require every Classic catalog row to be covered by zone, the #278 fixture or the recipe gate
- 201c2861 test(data): place the 32 zone-less Classic drops by in-game source (#278)
- d50cf66a test(data): gate the #278 zone-less fixture against the package and join it into the completeness check
- 9383965e docs(data): point catalog editors at the #278 zone-less fixture

## What changed

- 40 of 736 Classic catalog ids have no `source.zone` in wow-classic-items 2.0.1: 8 Rare recipes already gated by the #284 describe and 32 Epics with no `source` field at all (5 Cache of the Firelord, 18 Onyxia including the T2 helms, 9 Four Horsemen Chest including the Tier 3 tokens). The package has zero items under Onyxia's Lair, so the mapping is keyed by in-game drop source, not package data.
- New fixture `classic-gh278-zoneless.ts` (ZONELESS_SOURCE_RAID, 32 GH278_ZONELESS rows, GH278_PLACED) with its own honesty suite (ids exist in the package, Epic, source undefined, name and icon parity, zone 2159 empty, overlap with GH273_CORE exactly 18705, 18808, 19139, 19140).
- The completeness test now requires every catalog row to be covered by its raid's package zone, the fixture, or slot Recipe, and unions the fixture into the missing-items check so removing a zone-less item fails the suite.
- One header sentence in `data/classic-wow-raids.ts` points editors at the fixture. Catalog rows unchanged.

## Verification

- `npx vitest run data`: 508 tests before, 579 after (10 files)
- RED proofs: empty fixture fails with exactly the 32 rows; removing Shard of the Scale (17064) from the catalog fails 2 tests; removing it from the fixture fails 3 (coverage, 32-count, per-raid count)
- `npm run lint` 0 errors, `npm run typecheck` clean
- CI on PR #428: Test, Companion, CodeQL, Analyze

## Deviations from Plan

- Proof B fails three tests rather than two because of the per-raid count test the plan itself asked for.
- A pre-existing em dash in the GH #277 comment was replaced while that line was restructured.
- PR title shortened to fit 70 characters.

## Flags for the user

- Owner decisions taken as defaults: fixture lives in data/__tests__/fixtures/; mapping keyed by drop source with a boss group per row; the 8 Rare recipes stay covered through the #284 recipe gate; the coverage check spans every catalog row.

## Known Stubs

None.

## Threat Flags

None: test-only change.
