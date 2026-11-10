---
phase: quick-261109-tr1
plan: 01
subsystem: loot-list
tags: [bis-import, officer-prio, bracket-placement, tbc-bis-data, gh-484]
requires: []
provides:
  - "canRankInZone: one pure zone rule shared by the editor pools and Import BIS"
  - "placeBisItems: Import BIS placement moved out of React and gated by officer class prio"
  - "TBC BiS neck data matching each spec's role and raid"
affects: [loot-list-editor, bis-import, data/bis/tbc-bis.ts]
tech-stack:
  added: []
  patterns: ["pure rule in domain/loot, direct-path import, no barrel export"]
key-files:
  created:
    - domain/loot/prio-zones.ts
    - domain/loot/bis-import-placement.ts
    - domain/loot/__tests__/prio-zones.test.ts
    - domain/loot/__tests__/bis-import-placement.test.ts
    - data/__tests__/tbc-bis-necks.test.ts
  modified:
    - app/contexts/LootListContext.tsx
    - app/(app)/loot-list/components/LootListContent.tsx
    - data/bis/tbc-bis.ts
key-decisions:
  - "Brackets 1-4 gated on canRankInZone 'bracket', No Bracket on 'noBracket'; locked ranks are seeded before any gate and never re-judged"
  - "Loot Council skip folded into the zone rule (LC is rankable in no zone)"
status: complete
branch: fix/bis-import-respects-prio
estimate:
  tokens: 90000
  tasks: 3
actuals:
  tokens: 45000
  tasks: 3
  commits: 4
---

# Phase quick-261109-tr1 Plan 01: Import BIS respects officer class prio Summary

Import BIS now skips items the officers prio'd only to other classes, and puts secondary and primary-only-open items in No Bracket only, through one pure `canRankInZone` rule that the editor's three bracket pools also use; the TBC BiS neck data is corrected so every neck drops in its raid and fits the spec's role (GH #484).

Code is on `fix/bis-import-respects-prio` (4 commits, based on origin/main, not pushed, no upstream, no PR). This SUMMARY, PLAN and STATE are uncommitted on the gsd/quick branch for the orchestrator's docs commit.

## Commits (fix/bis-import-respects-prio)

| # | SHA | Subject |
|---|-----|---------|
| 1 | dd98f467 | refactor(loot-list): move BiS import placement into domain/loot |
| 2 | 94b989bf | fix(loot-list): BiS import respects officer class prio (#484) |
| 3 | 06773684 | fix(bis): TBC BiS necks match each spec's role and raid (#484) |
| 4 | fc469398 | refactor(loot-list): editor bracket pools share the prio zone rule |

All four end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `git diff --stat origin/main..fix/bis-import-respects-prio` lists exactly the eight files in the plan (640 insertions, 173 deletions). No file deletions.

## Gates

| Check | Baseline (origin/main) | Final |
|-------|------------------------|-------|
| eslint LootListContext.tsx | 0 errors, 1 warning | 0 errors, 1 warning (same exhaustive-deps warning) |
| eslint LootListContent.tsx | 0 errors, 17 warnings | 0 errors, 17 warnings |
| eslint 5 new files | n/a | 0 errors, 0 warnings |
| `npm run lint` (whole repo) | not recorded | 0 errors, 375 warnings (all pre-existing files; none from new files) |
| `npm run typecheck` | clean | clean |
| `npm test` files | 256 passed, 1 skipped (257) | 259 passed, 1 skipped (260) |
| `npm test` tests | 5113 passed, 1 skipped (5114) | 5251 passed, 1 skipped (5252) |

New tests: +138 (domain/loot/__tests__/prio-zones.test.ts and bis-import-placement.test.ts: 18; data/__tests__/tbc-bis-necks.test.ts: 120). The untracked `app/services/__tests__/scratch/` probe did not change the counts in any visible way and was not touched.

## Regression evidence

### Import BIS (before the gate, against the verbatim extraction)

Two of the four `// regression for #484` cases failed, as the plan required (the other two are guards that pass both before and after):

```
FAIL ... > does not place an item prio'd only to other classes anywhere in ranks 50-25
AssertionError: expected [ 'tank-neck', 'free' ] to not include 'tank-neck'

FAIL ... > puts secondary and primary-only-open items in No Bracket even with Bracket 1 empty
AssertionError: expected { '50-1': 'sec', '50-2': 'open' } to deeply equal { '38-1': 'sec', '38-2': 'open' }
```

After the gate all 18 tests in both files pass. The parity oracle in prio-zones.test.ts checks `canRankInZone` against the pre-fix inline pool predicates over all 108 flag combinations, which is what proves the editor pools did not change.

### Neck data (before the table was applied)

`data/__tests__/tbc-bis-necks.test.ts` against the old data: 76 failed, 70 passed (146 tests). After the table: 120 passed, 0 failed (fewer tests because 12 removed entries no longer generate per-entry cases and the Mage SSC alt neck merged into one).

Failure breakdown before: neck entries that are not a Neck drop of that raid, neck entries whose role does not fit the spec (including a tank neck on DPS and healer specs, caster necks on physical specs), the "no other slot points at a neck" check (the 3 healer SSC Back rows), the Pendant of Titans regression and the Hunter physical-only regression.

## Neck data changes (data/bis/tbc-bis.ts)

30 replacements, 12 Neck removals, 3 Back removals, 8 comment-only fixes. No other slot or entry was touched (checked with `git diff -U0`: every changed line is a Neck line, plus the Mage multi-line Neck and the three Back 30008 rows).

### Replacements

| Spec | Raid | Old id | New id |
|------|------|--------|--------|
| Retribution Paladin | Karazhan | 28530 | 28745 Mithril Chain of Heroism |
| Retribution Paladin | Black Temple | 32362 | 32260 Choker of Endless Nightmares |
| Retribution Paladin | Zul'Aman (alt) | 33296 | 33297 The Savage's Choker |
| Retribution Paladin | Sunwell Plateau | 34358 | 34177 Clutch of Demise |
| Protection Paladin | Serpentshrine Cavern | 30007 | 30099 Frayed Tether of the Drowned |
| Elemental Shaman | Serpentshrine Cavern | 30015 | 30008 Pendant of the Lost Ages |
| Balance Druid | Serpentshrine Cavern | 30015 | 30008 Pendant of the Lost Ages |
| Shadow Priest | Serpentshrine Cavern | 30015 | 30008 Pendant of the Lost Ages |
| Warlock | Serpentshrine Cavern | 30015 | 30008 Pendant of the Lost Ages |
| Mage | Serpentshrine Cavern | 30015 bis + 29368 alt | single 30008 bis, Pendant of the Lost Ages |
| Enhancement Shaman | Karazhan | 28530 | 28745 Mithril Chain of Heroism |
| Enhancement Shaman | Serpentshrine Cavern | 30017 | 30059 Choker of Animalistic Fury |
| Enhancement Shaman | Black Temple | 32362 | 32260 Choker of Endless Nightmares |
| Feral Druid | Serpentshrine Cavern | 30017 | 30059 Choker of Animalistic Fury |
| Feral Druid | Black Temple | 32362 | 32260 Choker of Endless Nightmares |
| Feral Druid | Sunwell Plateau | 34186 | 34177 Clutch of Demise |
| Guardian Druid | Serpentshrine Cavern | 30017 | 30099 Frayed Tether of the Drowned |
| Guardian Druid | Sunwell Plateau | 34186 | 34178 Collar of the Pit Lord |
| Protection Warrior | Karazhan | 28509 | 28516 Barbed Choker of Discipline |
| Protection Warrior | Serpentshrine Cavern | 30007 | 30099 Frayed Tether of the Drowned |
| Arms/Fury Warrior | Karazhan | 28530 | 28745 Mithril Chain of Heroism |
| Arms/Fury Warrior | Black Temple | 32362 | 32260 Choker of Endless Nightmares |
| Arms/Fury Warrior | Sunwell Plateau | 34358 | 34177 Clutch of Demise |
| Hunter | Karazhan | 28530 | 28509 Worgen Claw Necklace |
| Hunter | Serpentshrine Cavern | 30017 | 30059 Choker of Animalistic Fury |
| Hunter | Black Temple | 32362 | 32260 Choker of Endless Nightmares |
| Hunter | Zul'Aman (alt) | 33278 | 33297 The Savage's Choker |
| Rogue | Serpentshrine Cavern | 29381 | 30059 Choker of Animalistic Fury |
| Rogue | Black Temple | 32361 | 32591 Choker of Serrated Blades |
| Rogue | Zul'Aman (alt) | 33278 | 33297 The Savage's Choker |

### Removals

| Spec | Raid | Slot | Removed id |
|------|------|------|-----------|
| Holy Paladin, Restoration Shaman, Restoration Druid | Magtheridon's Lair | Neck | 28781 |
| Holy Paladin, Restoration Shaman, Restoration Druid, Holy/Disc Priest | Serpentshrine Cavern | Neck | 30018 |
| Feral Druid, Guardian Druid | Gruul's Lair | Neck | 28822 |
| Warlock | Gruul's Lair | Neck | 28822 |
| Protection Paladin, Protection Warrior | Zul'Aman | Neck | 33278 |
| Restoration Shaman, Restoration Druid, Holy/Disc Priest | Serpentshrine Cavern | Back | 30008 (a neck the importer ranks as a neck) |

Comment-only fixes: five `32349` Neck comments (Elemental Shaman, Balance Druid, Shadow Priest, Mage, Warlock) now read Translucent Spellthread Necklace; the three `32362` Neck comments on Protection Paladin, Protection Warrior and Guardian Druid now read Pendant of Titans.

## Deviations from Plan

None to scope. Notes on execution details:

- The BiS file uses double-quoted tier keys for Gruul's, Magtheridon's and Zul'Aman, so my first edit pass applied the single-quoted-tier rows and a second pass applied the rest. Table applied in full; the final test run covers every row.
- `git switch -c fix/bis-import-respects-prio origin/main` set origin/main as the upstream; I unset it so the fix branch has no upstream, as the plan's verification expects.
- The Task 1 tracer's `<verify>` was re-run end to end after the fix commit (tests, typecheck, lint, grep counts) and passed before moving to Tasks 2 and 3.
- `placeBisItems` takes `PrioZoneItem` fields through `BisPlacementItem`; `PhaseLootItem` satisfies it structurally, so no cast was needed at the call site.

## Follow-ups and non-goals (not done)

1. Server-side prio enforcement at submit or save (`save_submission_items` RPC, `app/api/loot-submissions/submit/route.ts`). It would reject lists that were valid before an officer re-prio'd; needs an owner decision and copy. A raider who bypasses the editor can still save out-of-prio ranks (threat T-261109-02, accepted).
2. Lists that already contain BiS-imported out-of-prio items. Officers see them in review; an aggregate count would need production access.
3. BiS data outside the Neck slot. The orchestrator's audit of all 1290 TBC BiS entries against `data/tbc-raids.ts` found 206 ids that are not raid drops (quest, badge or crafted items the importer can never match), 175 listed under a raid other than the one that drops them, and about 60 that point at an item in a different slot (for example Shoulder entries that are boots); tier-token rows excluded. That is a separate data pass needing an authoritative source.
4. Telling the raider how many BiS items were skipped for prio. Needs new copy and owner sign-off, so `placeBisItems` returns no skipped count and `BisImportResult` is unchanged.
5. The import reads `itemsData.items` while the pools read the active-tier-filtered `lootItems`, so with a stale API cache the import could place an item from a tier the guild switched off. Not part of #484; not changed.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths, file access or schema changes. T-261109-01 (import tampering) and T-261109-03 (pool regression) mitigated as planned; T-261109-04 honoured (synthetic ids only, the reporter appears nowhere).

## Self-Check: PASSED

- FOUND: domain/loot/prio-zones.ts, domain/loot/bis-import-placement.ts, both test files under domain/loot/__tests__, data/__tests__/tbc-bis-necks.test.ts (on fix/bis-import-respects-prio)
- FOUND commits: dd98f467, 94b989bf, 06773684, fc469398 on fix/bis-import-respects-prio
- Fix branch has no upstream; working copy is back on gsd/quick-261109-tr1-bis-import-respects-officer-class-prio-g; PLAN.md present and uncommitted
