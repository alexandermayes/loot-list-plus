---
phase: quick-261005-uge
plan: 01
subsystem: domain/loot
tags: [wow-classic-items, item-types, class-proficiencies, vitest, tbc, wrath]

requires:
  - phase: quick-261005-maq
    provides: "Classic raid armor piece types from the wow-classic-items package, the narrowed plate name rule, and the gen-classic-armor-388.ts / check-388-stored-armor-types.sql generator pattern this task reused"
provides:
  - "Every TBC (330) and Wrath (664) raid armor-slot catalog id has an ITEM_TYPES entry taken from the wow-classic-items package"
  - "Two TBC armor-slot catalog items that are package fist weapons (Grip of Mannoroth, Mounting Vengeance) get a weapon_type entry instead of a guessed armor type"
  - "Five pre-existing TBC ITEM_TYPES entries the package does not support (class-agnostic or token slots) are removed"
  - "packageTypeInfo, packageWeaponType and a new uniqueArmorSlotPieces helper live once in data/__tests__/fixtures/package-item-types.ts, shared by the Classic, TBC and Wrath guards and the picker tests"
  - "A read-only, never-run check query (SP/check-uge-stored-tbc-armor-types.sql) for the TBC stored-value risk, per OD-1 Resolution A"
affects: [loot-items-query, item-types, class-proficiencies, future-TBC-stored-value-migration]

actuals:
  tokens: 52000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Generated (never hand-typed) ITEM_TYPES sections from the wow-classic-items package, padded to 46 columns before the trailing comment, one script per expansion addition"
    - "Shared package-type-inference fixture (data/__tests__/fixtures/package-item-types.ts) reused by catalog-completeness guards and picker proof tests across expansions"

key-files:
  created:
    - "data/__tests__/fixtures/package-item-types.ts"
  modified:
    - "data/item-types.ts"
    - "data/__tests__/item-types.test.ts"
    - "data/__tests__/classic-catalog-completeness.test.ts"
    - "lib/__tests__/loot-items-query.test.ts"

key-decisions:
  - "OD-1 resolved A (user, 2026-10-05): generate a read-only, never-run check query (SP/check-uge-stored-tbc-armor-types.sql) so the user can measure the TBC stored-armor-type risk before deciding on a migration."
  - "Five existing TBC ITEM_TYPES entries (Pendant of the Perilous, Totem of the Maelstrom, Totem of Ancestral Guidance, Book of Highborne Hymns, Chestguard of the Vanquished Champion) deleted because the package gives none of these items an armor or weapon type; all five sit in class-agnostic or token slots so the picker never used them."
  - "Grip of Mannoroth (34203) and Mounting Vengeance (34346) get weapon_type: 'Fist Weapon' entries rather than an armor type, matching the package's Off Hand fist weapon classification; their TBC catalog slot (Hands/Waist) is unchanged, out of scope per D-03."

requirements-completed: [UGE-R1, UGE-R2, UGE-R3, UGE-R4, UGE-R5, DELIVERY-R1]

coverage:
  - id: D1
    description: "A Wrath class picker tracer: Inexorable Sabatons shows only to Warrior, Paladin and Death Knight"
    requirement: "UGE-R1"
    verification:
      - kind: unit
        ref: "lib/__tests__/loot-items-query.test.ts#GH-388 (Wrath): Inexorable Sabatons shows only to classes that can wear plate"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every TBC (330) and Wrath (664) raid armor-slot id mapped from the package, guarded with pinned counts and per-class picker proof"
    requirement: "UGE-R2"
    verification:
      - kind: unit
        ref: "data/__tests__/item-types.test.ts#$expansion raid catalog item types (#388)"
        status: pass
      - kind: unit
        ref: "lib/__tests__/loot-items-query.test.ts#GH-388: every $expansion raid armor piece shows to exactly the classes that can wear it"
        status: pass
    human_judgment: false
  - id: D3
    description: "Existing TBC/Wrath entries agree with the package; five contradicted TBC entries removed"
    requirement: "UGE-R3"
    verification:
      - kind: unit
        ref: "data/__tests__/item-types.test.ts#every ITEM_TYPES entry for a TBC catalog item agrees with the package"
        status: pass
      - kind: unit
        ref: "data/__tests__/item-types.test.ts#no TBC catalog item with slot Back, Token, Quest or Recipe has an ITEM_TYPES entry"
        status: pass
    human_judgment: false
  - id: D4
    description: "One shared package-type helper used by the Classic, TBC and Wrath guards"
    requirement: "UGE-R4"
    verification:
      - kind: unit
        ref: "data/__tests__/classic-catalog-completeness.test.ts (full file, same 339-test count after the fixture move)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No change to inferArmorType, the picker or the catalogs; stored-value risk reported with evidence and a read-only check query"
    requirement: "UGE-R5"
    verification: []
    human_judgment: true
    rationale: "Absence of a code change and the stored-value risk assessment are documented claims, not something a unit test proves; confirmed by manual diff/grep review (see Investigation findings and OD-1 sections below)."
  - id: D6
    description: "Full regression, tsc, eslint, disk-guarded local commits, PR body draft, SUMMARY"
    requirement: "DELIVERY-R1"
    verification:
      - kind: unit
        ref: "SP/new-fails-388.mjs SP/baseline-uge-vitest.json SP/final-uge-vitest.json (no new failures)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (exit 0, both baseline and final)"
        status: pass
      - kind: other
        ref: "npx eslint --max-warnings 0 data/item-types.ts data/__tests__ && npx eslint --max-warnings 3 lib/__tests__/loot-items-query.test.ts (exit 0, both)"
        status: pass
    human_judgment: false

duration: 28min
completed: 2026-10-05
status: complete
---

# Quick Task 261005-uge: TBC and Wrath raid armor pieces use their real armor type Summary

**Every TBC (330) and Wrath (664) raid armor-slot catalog item now carries an ITEM_TYPES entry taken directly from the wow-classic-items package, closing the gap PR #393 left when it narrowed the plate name-guess rule for Classic.**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-10-05T22:10:00-07:00 (approx)
- **Completed:** 2026-10-05T22:37:00-07:00 (approx)
- **Tasks:** 3 (tracer, shared helper + data, report/verification)
- **Files modified:** 4 (plus 1 new fixture file)

## OD-1 Resolution (applied)

**OD-1:** Stored `loot_items.armor_type` values can override this change; TBC rows may hold values written by a one-time January 2026 script (`scripts/populate-item-types.ts`), with no record of whether it ran. Resolution: **A** (user, 2026-10-05), generate a read-only check query, outside the repository, never run by the executor, that the user can paste into the Supabase SQL editor to measure the risk. Delivered as `SP/check-uge-stored-tbc-armor-types.sql` (statement 1: 328-tuple VALUES join against `loot_items`, matched on id and name, `WHERE li.armor_type IS NOT NULL AND li.armor_type <> v.armor_type`; statement 2: the two fist-weapon ids 34203 and 34346). The file was generated by `SP/gen-check-uge.ts` and was never executed against any database.

## RED Evidence (before the fix, in order)

- **Tracer (Task 1, D-01):** before the `39717: { armor_type: 'Plate' }` entry, the Inexorable Sabatons test failed for exactly the 7 non-plate Wrath classes (Hunter, Shaman, Rogue, Druid, Priest, Mage, Warlock) and passed for Warrior, Paladin, Death Knight.
- **T-c / T-d (Task 2 Step 2, before D-06 deletion):** T-c ("every ITEM_TYPES entry for a TBC catalog item agrees with the package") failed listing exactly the five D-06 ids (30022, 30023, 30236, 32330, 34206); T-d ("no TBC catalog item with slot Back, Token, Quest or Recipe has an ITEM_TYPES entry") failed listing exactly 30236. Wrath passed both from the start (zero entries existed yet).
- **T-b (Task 2 Step 3, before the generated data):** failed with 51 TBC lines and 663 Wrath lines (39717 already present from Task 1, so only 663 remaining Wrath ids failed).
- **P-2 / D-07 (Task 2 Step 3, before the generated data):** failed for exactly 7 TBC classes and 7 Wrath classes (14 total): Hunter, Shaman, Rogue, Druid, Priest, Mage, Warlock in both expansions; Warrior, Paladin and Death Knight passed from the start.

All RED counts matched the plan's predicted figures exactly.

## Generated Section Counts

**TBC GH-388 ADDITIONS (51 entries):**
| Raid | Count |
|---|---|
| Karazhan | 10 |
| Tempest Keep: The Eye | 4 |
| Hyjal Summit | 1 |
| Black Temple | 14 |
| Zul'Aman | 4 |
| Sunwell Plateau | 18 |

Per type: Cloth 10, Leather 14, Mail 12, Plate 13, Fist Weapon 2 (Grip of Mannoroth 34203, Mounting Vengeance 34346).

**WRATH OF THE LICH KING GH-388 ADDITIONS (664 entries):**
| Raid | Count |
|---|---|
| Naxxramas (Wrath) | 135 |
| Eye of Eternity | 18 |
| Obsidian Sanctum | 14 |
| Ulduar | 139 |
| Trial of the Crusader | 188 |
| Onyxia's Lair (Wrath) | 19 |
| Icecrown Citadel | 134 |
| Ruby Sanctum | 17 |

Per type: Plate 222, Cloth 148, Leather 148, Mail 146.

## Per-Expansion Before / After Table (D-10)

Measured via `plan-scan-uge-388fmt.ts`, run from WT before any commit (`SP/before-uge-388fmt-out.txt`) and after all data commits (`SP/after-uge-388fmt-out.txt`).

| Expansion | armorSlot | mappedArmor (before → after) | mappedWeaponOnArmorSlot (before → after) | unmapped (before → after) |
|---|---|---|---|---|
| Classic | 341 | 341 → 341 (unchanged) | 0 → 0 | 0 → 0 |
| TBC | 330 | 279 → 328 | 0 → 2 | 51 → 0 |
| Wrath | 664 | 0 → 664 | 0 → 0 | 664 → 0 |
| Cata | 377 | 0 → 0 (not in package; out of scope) | 0 → 0 | 377 → 377 |
| MoP | 947 | 18 → 18 (not in package; out of scope) | 0 → 0 | 929 → 929 |

`plan-scan-uge.ts` (`SP/after-scan-uge-out.txt`) confirms, after the data: TBC "disagreeing with package (any slot): 0" and Wrath "disagreeing with package (any slot): 0" (2 occurrences total, matching the verify gate).

## Duplicates and Variants Report (findings 3-4)

- No TBC or Wrath armor-slot id appears in any other catalog (Classic, TBC, Wrath, Cata, MoP), or twice in its own catalog with a different slot or name.
- No new id collides with an existing ITEM_TYPES key; `npx tsc --noEmit` (which rejects duplicate object keys) passed after all data commits.
- Wrath has 169 normal/heroic pairs (heroic names end in " (Heroic)", each its own catalog id); package armor types always agree within a pair; no other name is shared across two ids; no heroic exists without its normal counterpart. 10-man Wrath ids are not present in the catalog (25-man only), so they get no ITEM_TYPES entries.
- The only catalog/package name difference found anywhere in TBC or Wrath: Ikfirus' Sack of Wonder (wowhead_id 50001, and its Heroic pair 50656) versus the package's "Ikfirus's Sack of Wonder", the same item with an apostrophe-placement difference only; does not affect type assignment (matched by id, not name, in the generator).

## Items the Package Lacks

None for TBC or Wrath, every armor-slot catalog id in both expansions exists in the wow-classic-items package (`notInPkg=0` for both in `plan-scan-uge-out.txt`). Cata (377 armor-slot ids) and MoP (947, 18 already mapped) are not covered by the package at all; both are explicitly out of scope (`inferArmorType` still runs for them, unchanged).

## Corrected Entries (D-06)

Five pre-existing TBC `ITEM_TYPES` entries deleted because the wow-classic-items package gives none of these items an armor or weapon type (`SP/plan-scan-uge-out.txt` ANYDISAGREE lines, package type `null` for all five):

| Wowhead ID | Name | Catalog Slot | Removed Entry |
|---|---|---|---|
| 30022 | Pendant of the Perilous | Neck | `{ armor_type: 'Mail' }` |
| 30023 | Totem of the Maelstrom | Relic | `{ armor_type: 'Plate' }` |
| 30236 | Chestguard of the Vanquished Champion | Token | `{ armor_type: 'Leather' }` |
| 32330 | Totem of Ancestral Guidance | Relic | `{ armor_type: 'Leather' }` |
| 34206 | Book of Highborne Hymns | Held In Off-hand | `{ armor_type: 'Plate' }` |

No visible change: Neck, Relic and Held In Off-hand are class-agnostic slots in the picker (`isClassAgnosticSlot`), and Token rows take the token-eligibility path instead; `lib/loot-items-query.ts` is the only production reader of `ITEM_TYPES`. The "// Additional TK items" comment above the 30236 line and its adjacent blank line were removed together, leaving exactly one blank line before the ZUL'GURUB (Classic) header, matching the surrounding section-spacing convention. None of the five deleted lines contained an em dash.

## Stored-Value Evidence (finding 7, risk not proof)

No app, lib, utils or domain code writes `loot_items.armor_type` today; `app/services/expansionSeeder.ts` writes none. Two historical scripts could have: `scripts/populate-item-types.ts` (2026-01-30) filled empty rows from that day's ITEM_TYPES plus an old name guess, with no record it ever ran; `scripts/populate-missing-types.ts` ran once against production on 2026-03-01, but only filled rows with both columns empty, from Wowhead data that agrees with the package. `data/wrath-raids.ts` was added 2026-03-03, after both scripts, so no Wrath row should ever hold a value this change needs to override. For TBC, if the January script ran, 96 TBC armor ids could hold a stored value the current package data contradicts (85 where the 2026-01-30 catalog's name matched the package's name for that id, 33 of those heavier than the real type). This is risk evidence only, not proof a migration is needed.

**Per OD-1 Resolution A:** `SP/check-uge-stored-tbc-armor-types.sql` (328-tuple VALUES statement plus a 2-id fist-weapon statement) was generated by `SP/gen-check-uge.ts` and left outside the repository. **How to read it:** an empty result from statement 1 means no TBC guild's `loot_items` row holds a stored `armor_type` that disagrees with the wow-classic-items package for a TBC raid armor piece, meaning the risk did not materialize and no migration is needed. Any returned row is evidence that a TBC stored-value migration (matched on id and name, same shape as `fix/388-stored-classic-armor-types`) should be considered. Statement 2 reports whatever stored `armor_type`/`weapon_type` values the two fist-weapon ids (34203, 34346) currently hold, for the same reason.

## Investigation Findings (1-9, from plan context, confirmed during execution)

1. Picker (`lib/loot-items-query.ts`) unchanged since PR #393: stored `armor_type`/`weapon_type` first, then `ITEM_TYPES`, then a name guess; class-agnostic slots return before the armor check; `ITEM_TYPES` is read only by this one function.
2. TBC: 724 unique catalog ids, 330 unique armor-slot ids, 279 already mapped (all agreed with the package), 51 unmapped before this task.
3. Wrath: 1250 unique catalog ids, 664 unique armor-slot ids, 0 mapped before this task.
4. No cross-catalog or in-catalog duplicates on any TBC/Wrath armor-slot id; `tsc` enforces no key collisions.
5. Exactly five existing entries the package contradicted, all TBC, all in class-agnostic or token slots (see Corrected Entries above).
6. Effect for rows with no stored type: TBC 38 items change visibility, 13 unchanged; Wrath 469 change, 195 unchanged (full breakdown in the PR body).
7. Stored-value risk: see above; Wrath believed clean, TBC unproven risk, check query delivered per OD-1 A.
8. Baselines from #393 carried forward: full suite ~45-60s; eslint has exactly 3 pre-existing unused-argument warnings in `lib/__tests__/loot-items-query.test.ts` and none in `data/`; `SP/new-fails-388.mjs` works unchanged in `wtuge` since its `/wt388/` path-marker is simply absent, leaving the full (identical) path in both baseline and final keys.
9. Cata (377 armor-slot ids) and MoP (947, 18 mapped) are not in the wow-classic-items package; explicitly out of scope; `inferArmorType` still runs for them, unchanged.

## Task Commits

All four commits made in WT (`SP/wtuge`, branch `fix/tbc-wrath-armor-types`, based on `d6320167`):

1. **Task 1 (tracer):** `839609ca2d713bade23dcbbdae5b7b0962da1aea`, `fix(item-types): Inexorable Sabatons is typed as plate`
   Files: `data/item-types.ts`, `lib/__tests__/loot-items-query.test.ts`
2. **Task 2 Step 1 (shared helper):** `f2c0303bf4b842aa6b8b5fcf0ed8afc38267bae5`, `test(item-types): share the package item type helper between catalog guards`
   Files: `data/__tests__/classic-catalog-completeness.test.ts`, `data/__tests__/fixtures/package-item-types.ts`
3. **Task 2 Step 2 (five-entry correction):** `6bf2a80a839e23943cc63482aa1376a29e7433ea`, `fix(item-types): five TBC items that are not armor no longer carry an armor type`
   Files: `data/item-types.ts`, `data/__tests__/item-types.test.ts`
4. **Task 2 Step 4 (TBC/Wrath data + picker proof):** `f6cf5de16fc97ae36ed803fab2ba6638ab8d0493`, `fix(item-types): TBC and Wrath raid armor pieces have armor types from the item data`
   Files: `data/__tests__/fixtures/package-item-types.ts`, `data/__tests__/item-types.test.ts`, `data/item-types.ts`, `lib/__tests__/loot-items-query.test.ts`

Every commit message ends with the required trailer. No fifth fixup commit was needed (the text gate passed cleanly on the first pass).

This is an app-only change; no migration drafted or applied.

## Files Created/Modified

- `data/item-types.ts` - TBC GH-388 ADDITIONS section (51 entries), WRATH OF THE LICH KING GH-388 ADDITIONS section (664 entries), five contradicted TBC entries removed, JSDoc updated (ITEM_TYPES top comment and ARMOR_SLOTS comment)
- `data/__tests__/fixtures/package-item-types.ts` (new) - `PackageItem` type, `packageWeaponType`, `packageTypeInfo` (moved verbatim from the Classic suite) and new `uniqueArmorSlotPieces(raids)` helper
- `data/__tests__/classic-catalog-completeness.test.ts` - imports the shared helper functions instead of defining them locally; drops now-unused `WeaponType`/`ItemTypeInfo` type imports; same 339-test count before and after
- `data/__tests__/item-types.test.ts` - new `describe.each` block over TBC/Wrath with T-a (pinned armor-slot counts), T-b (package agreement per id), T-c (any-slot package agreement) and T-d (no entry on Back/Token/Quest/Recipe); 12 → 20 tests
- `lib/__tests__/loot-items-query.test.ts` - Wrath tracer block (Inexorable Sabatons, D-01) and a TBC/Wrath picker-proof `describe.each` block (D-07, `WRATH_CLASSES` const); 55 → 86 tests

## Test Counts Per Changed File

| File | Before | After | Delta |
|---|---|---|---|
| `data/__tests__/item-types.test.ts` | 12 | 20 | +8 |
| `data/__tests__/classic-catalog-completeness.test.ts` | 339 | 339 | 0 (helper move, no behavior change) |
| `lib/__tests__/loot-items-query.test.ts` | 55 | 86 | +31 |

## Baseline vs Final Verification

**Vitest (full suite):**
- Baseline (`SP/baseline-uge-vitest.txt`/`.json`, HEAD=d6320167606809c01be41ae4631e4db176f79026): 210 test files, 1 failed / 209 passed; 3718 tests, 1 failed / 3717 passed; EXIT=1. The one failure was `app/components/__tests__/ForeverAnnouncementModal.test.tsx` (a pre-existing, unrelated flaky timeout on `waitFor`), unconnected to this change.
- Final (`SP/final-uge-vitest.txt`/`.json`, after all 4 commits): 210 test files, 210 passed; 3758 tests, 3758 passed; EXIT=0. The ForeverAnnouncementModal flake did not recur in this run (confirms it is flaky/load-sensitive, not related to this change).
- `node SP/new-fails-388.mjs SP/baseline-uge-vitest.json SP/final-uge-vitest.json` → `No new failures.` (exit 0).

**tsc:** Baseline `npx tsc --noEmit` → EXIT=0. Final → EXIT=0 (also confirms no duplicate `ITEM_TYPES` keys across the 51 + 664 new entries).

**eslint:** Baseline `npx eslint data/item-types.ts data/__tests__ lib/__tests__/loot-items-query.test.ts` → 3 pre-existing unused-argument warnings in `lib/__tests__/loot-items-query.test.ts`, none in `data/`, EXIT=0. Final (`npx eslint --max-warnings 0 data/item-types.ts data/__tests__` plus `npx eslint --max-warnings 3 lib/__tests__/loot-items-query.test.ts`) → same 3 pre-existing warnings only, EXIT=0 both commands. No new warnings introduced.

No flaky lines beyond the one pre-existing, unrelated test file noted above.

## PR Body Draft

`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/331da5ac-3e3c-42a8-a81a-1d8985a423b4/scratchpad/pr-body-uge.md`, title "TBC and Wrath raid armor pieces use their real armor type", with Summary, Changes, Tests, Effect, Stored values, Deploy and Rollback sections, ending with the required "Generated with Claude Code" line. Contains "Refs #388" and "Refs #276"; no em dash; no reporter details.

## Check Query Path

`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/331da5ac-3e3c-42a8-a81a-1d8985a423b4/scratchpad/check-uge-stored-tbc-armor-types.sql`, generated by `SP/gen-check-uge.ts`; read-only; returns item ids, types and row counts only; never run against any database by the executor. See "Stored-Value Evidence" above for how to read a result.

## Handoff Notes

None. The plan completed in a single session with no disk-guard stop and no checkpoint needed. `SP/disk-guard-uge.sh` reported healthy free space (consistently 16-19 GB) at every check.

## Decisions Made

- OD-1 resolved **A** by the user (2026-10-05): generate the read-only TBC stored-armor-type check query rather than reporting evidence only (see OD-1 Resolution section above).
- The five contradicted TBC entries (D-06) were deleted outright rather than kept with a "removed" comment, per D-11's explicit instruction, differing from one pre-existing in-file comment-removal precedent (`// 30028: ... removed`) that was not followed here since the plan specified otherwise.

## Deviations from Plan

None - plan executed exactly as written. All RED evidence, generated counts, scan outputs and verification gates matched the plan's predicted figures exactly on the first attempt; no auto-fixes, no architectural questions, and the text gate (no em dash, non-empty diff) passed without needing the optional fixup commit.

## Known Stubs

None. No placeholder values, empty arrays/objects flowing to UI, or "coming soon" text were introduced. This plan only adds data-table entries and tests; no new UI surface.

## Threat Flags

None found. All new/changed surface (generated `ITEM_TYPES` entries, the shared test fixture, the read-only check-query generator) stays within the plan's declared `<threat_model>` trust boundaries (package data, public repository, check query never run); no new network endpoint, auth path, file-access pattern or schema change was introduced.

## Issues Encountered

One self-correction during execution: the Task 1 D-01 data-line comment was initially padded to 47 characters before the trailing `//` instead of the plan-specified 46; caught immediately via the exact-length check against the regex in Task 1's verify block and fixed before committing. No other issues.

## User Setup Required

None - no external service configuration required. App-only change; no migration.

## Next Phase Readiness

- This closes the remaining scope of GH #388 for TBC and Wrath (Classic was closed by PR #393 / quick task 261005-maq).
- GH #276 (class-locked set pieces) remains open; this task narrows but does not close it (noted as FU-6 below).
- Follow-ups, stated as rules to adopt (carried or newly identified; none implemented here, all out of scope per D-09):
  - **FU-1:** `app/services/expansionSeeder.ts` should write `armor_type` and `weapon_type` from `ITEM_TYPES` when it creates `loot_items` rows (carried from #388).
  - **FU-2:** the loot-items API or the reserve routes should use the picker's resolved type instead of the raw stored column (carried).
  - **FU-3:** if the TBC check query (`SP/check-uge-stored-tbc-armor-types.sql`) returns rows when run by the user, TBC stored armor types that contradict the item data should be corrected by a migration matched on id and name.
  - **FU-4:** the TBC catalog should list Grip of Mannoroth (34203) and Mounting Vengeance (34346) in an off-hand weapon slot rather than Hands and Waist, with existing rows corrected too.
  - **FU-5:** Cata and MoP need a reliable armor-type source before they get `ITEM_TYPES` entries (377 and 947 armor-slot ids; `inferArmorType` still runs for them).
  - **FU-6:** GH #276, class-locked set pieces, stays open.

## Self-Check: PASSED

All five files_modified paths found on disk; all four commit hashes found in WT's git log; `SP/pr-body-uge.md` and `SP/check-uge-stored-tbc-armor-types.sql` found in SP; this SUMMARY.md found at its expected path. No missing items.

---
*Phase: quick-261005-uge*
*Completed: 2026-10-05*
