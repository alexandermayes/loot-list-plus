---
phase: quick-261005-maq
plan: 01
subsystem: data
tags: [item-types, classic-wow-raids, wow-classic-items, loot-items-query, vitest, supabase-migration]

requires: []
provides:
  - "Every Classic raid armor piece (341) has an ITEM_TYPES entry from the wow-classic-items package, zone-independent"
  - "A Classic raid armor guard (data/__tests__/classic-catalog-completeness.test.ts) that fails if any piece is missing or disagrees with the package"
  - "A narrowed inferArmorType Plate rule (OD-2 B) that no longer reads greaves, sabatons, breastplate or vambraces as plate"
  - "A gate (data/__tests__/item-types.test.ts) proving no Classic/TBC/Wrath armor piece resolves heavier than its real type"
  - "A draft, unpushed migration branch correcting stored Classic armor types that disagree with the package (OD-1 B)"
affects: [loot-items-picker, reserve-class-restrictions, armor-only-filter, tbc-wrath-armor-mapping-followup]

actuals:
  tokens: 13335
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Generated ITEM_TYPES sections are produced by a throwaway script in SP (never hand-typed), then spliced into the data file to avoid transcription error on hundreds of entries"
    - "Zone-independent completeness guard: derive the checked set from catalog slot membership (ARMOR_SLOTS), not from the package's zone attribution, to close the GH #278 gap where ungapped zone data let Tier 1/2 pieces skip the check"

key-files:
  created:
    - "data/__tests__/item-types.test.ts"
    - "supabase/migrations/20261005120000_correct_stored_classic_armor_types.sql (WTM, unpushed)"
    - "app/services/__tests__/classic-armor-types-migration.test.ts (WTM, unpushed)"
  modified:
    - "data/item-types.ts"
    - "data/__tests__/classic-catalog-completeness.test.ts"
    - "lib/__tests__/loot-items-query.test.ts"

key-decisions:
  - "OD-1 resolved B (2026-10-05, user): draft the stored-value migration now on its own unpushed branch with a static test; the user runs the read-only aggregate check in the Supabase SQL editor; the migration PR opens only if it reports rows."
  - "OD-2 resolved B (2026-10-05, user): map every Classic raid armor piece from the package and narrow inferArmorType's Plate rule to names containing 'plate' but not 'breastplate', dropping the separate 'breastplate', 'sabatons', 'greaves' and 'vambraces' keywords. TBC and Wrath mapping is a follow-up (FU-3), not this PR."

requirements-completed: [M388-R1, M388-R2, M388-R3, M388-R4, M388-R5, DELIVERY-R1]

duration: 70min
completed: 2026-10-05
status: complete
---

# Quick Task 261005-maq: Fix GH #388 (Classic mail armor hidden by a plate name guess) Summary

**Every Classic raid armor piece (341) now has an armor type from the wow-classic-items package instead of a name guess, closing the GH #278 zone-coverage gap for armor types; the Plate name-guess rule is narrowed (OD-2 B); and a draft migration branch (OD-1 B) is ready for the user's pre-merge check.**

## OD-1 and OD-2 Resolutions (applied)

- **OD-1 = B** (user, 2026-10-05): draft the stored-value correction now, on its own unpushed branch (`SP/wt388-mig`, branch `fix/388-stored-classic-armor-types`), with a static test and a read-only aggregate check query (`SP/check-388-stored-armor-types.sql`) the user runs in the Supabase SQL editor. The migration PR (from this draft) opens only if that check reports rows.
- **OD-2 = B** (user, 2026-10-05): map every Classic raid armor piece from the package (149 new entries, on top of the 192 already correct); narrow `inferArmorType`'s Plate rule to names containing `plate` but not `breastplate`, dropping the separate `breastplate`, `sabatons`, `greaves` and `vambraces` keywords (those words name mail and plate pieces alike). TBC and Wrath mapping is deferred (FU-3).

## Branches and Commits

### WT (`fix/388-classic-armor-types`, based on `origin/main` at `6ec51a3a`), app-only PR, no migration

| Commit | Message |
|--------|---------|
| `997a4fbd` | fix(item-types): Dragonstalker's Greaves is typed as mail |
| `a3596446` | fix(item-types): every Classic raid armor piece has its armor type from the item data |
| `2478c924` | fix(item-types): name-based armor guesses no longer read greaves, sabatons, vambraces or breastplates as plate |
| `44ea0fc8` | docs(item-types): reword the Plate-rule comment without an em dash |

Files changed in WT (only these four, confirmed by diff against `6ec51a3a`): `data/item-types.ts`, `data/__tests__/classic-catalog-completeness.test.ts`, `data/__tests__/item-types.test.ts`, `lib/__tests__/loot-items-query.test.ts`.

### WTM (`fix/388-stored-classic-armor-types`, created from `6ec51a3a`), migration-only PR, needs `--admin` merge

| Commit | Message |
|--------|---------|
| `b1a20525` | fix(db): correct stored armor types that disagree with the item data for Classic raid armor |

Files changed in WTM: `supabase/migrations/20261005120000_correct_stored_classic_armor_types.sql`, `app/services/__tests__/classic-armor-types-migration.test.ts`.

Neither branch has an upstream configured; nothing was pushed; no PR or GitHub issue was opened or commented on; no SQL was run against any database.

## RED Evidence (failing before each change)

- **Tracer (D-01):** `lib/__tests__/loot-items-query.test.ts` GH-388 block, before the 16941 ITEM_TYPES entry: 2 of 44 tests failed (Hunter and Shaman saw no row for Dragonstalker's Greaves; Plate guessed from "greaves" hid it). After the entry: all 44 pass, 0 failures.
- **G-2 / completeness guard (D-03):** `data/__tests__/classic-catalog-completeness.test.ts` "Classic raid armor types (#388)" block, before the generated 148-entry block (16941 already mapped by the tracer): 148 of 339 tests failed (one per unmapped piece, each line formatted `<raid> | <name> (<id>): ITEM_TYPES none, package {...}`). After the generated block: 0 failures, 339 pass.
- **P-1 / per-class picker proof (D-04):** `lib/__tests__/loot-items-query.test.ts` "every Classic raid armor piece shows to exactly the classes that can wear it" block, before the generated data: 7 of 9 classes failed (every class except Warrior and Paladin, whose wearable set already matched the old 192-entry baseline). Combined with G-2, 8 of 393 tests failed before Task 2's data; after, 0 failures, 393 pass.
- **I-gate (D-06, OD-2 B):** `data/__tests__/item-types.test.ts`, before narrowing the Plate rule: 5 of 12 tests failed, the gate test failed listing exactly the 16 Wrath pieces named in the OD-2 Resolution (all `guess=Plate pkg=Mail`, e.g. Necrophotic Greaves, Breastplate of Cruel Intent), plus 4 of the 6 "returns undefined" unit cases (Dragonstalker's Greaves, Sabatons of the Flamewalker, Dragonstalker's Breastplate, Scourge Hunter's Vambraces, all still guessed Plate under the old rule). After narrowing the rule: 0 failures, 12 pass.

## Generated Section Counts (D-02)

CLASSIC GH-388 ADDITIONS, 149 entries total, inserted after the CLASSIC GH-273 ADDITIONS section:

| Raid | Entries |
|------|---------|
| Molten Core | 19 |
| Blackwing Lair | 16 |
| Zul'Gurub | 8 |
| Ruins of Ahn'Qiraj | 28 |
| Temple of Ahn'Qiraj | 51 |
| Naxxramas | 27 |

By type: Plate 54, Cloth 39, Mail 31, Leather 25. Combined with the 192 pieces already mapped before this task, all 341 unique Classic raid armor-slot catalog ids now have a package-agreeing ITEM_TYPES entry.

## Other-Expansions Report (D-10), Before vs After

Scans run with `npx tsx` against the catalogs and the wow-classic-items package; "hidden" = a name guess that disagrees with the package in either direction (a lighter guess, e.g. Cloth for a Leather item, never actually hides anything, `canWearArmorType` only compares against each class's heaviest armor).

| Expansion | Unique items | Armor-slot items | ITEM_TYPES armor entries (before→after) | Unmapped armor-slot (before→after) | Unmapped w/ Plate guess (before→after) | Unmapped wrong guesses that hide (before→after) | Package coverage |
|---|---|---|---|---|---|---|---|
| Classic | 736 | 341 | 192 → 341 | 149 → 0 | 29 → 0 | 9 → 0 | 341/341 |
| TBC | 724 | 330 | 279 → 279 | 51 → 51 | 5 → 2 | 1 → 1 (lighter Cloth guess, Cowl of Gul'dan; never hid anything) | 328/330 |
| Wrath | 1250 | 664 | 0 → 0 | 664 → 664 | 94 → 42 | 19 → 3 (remaining 3 are lighter Cloth guesses) | 664/664 |
| Cata | 767 | 377 | 0 → 0 | 377 → 377 | 30 → 16 | n/a (no package source) | 0/377 |
| MoP | 1648 | 947 | 18 → 18 | 929 → 929 | 94 → 77 | n/a (no package source) | 0/947 |

Only Classic data changed (no ITEM_TYPES entries added for TBC, Wrath, Cata or MoP, per OD-2 B). The Plate-guess and wrong-guess-hides counts for TBC/Wrath/Cata/MoP moved as a side effect of narrowing `inferArmorType` everywhere it runs (the Classic 16 Wrath wrongly-hidden pieces named in OD-2 become visible; some unmapped Wrath/TBC plate-named pieces that lost their name hint now show to every class, the same way most unmapped armor in those catalogs already behaves, see FU-3/FU-4). Cata and MoP have no in-repo package source (FU-5).

## Investigation Findings (verified in WT at `6ec51a3a`, carried from planning)

1. Picker resolution (`lib/loot-items-query.ts` 168-200): token slots use `canClassUseToken`; otherwise stored `armor_type`/`weapon_type` first; `ITEM_TYPES` only when both are empty; `inferArmorType`/`inferWeaponType` only when both are still empty; weapon check, then class-agnostic slots, then `canWearArmorType`. The loot-items API returns the raw stored `armor_type`.
2. `inferArmorType` (pre-change): undefined outside the 8 armor slots; Cloth for robe/cloth/cowl; Plate for plate/breastplate/sabatons/greaves/vambraces; Mail for mail/chain. "plate" also matched legplates and breastplate. `canWearArmorType` is "not heavier than the class's maxArmorType", so a Cloth result never hides anything.
3. Classic catalog (pre-change): 736 unique ids, 341 unique armor-slot ids, 192 mapped (all agreed with the package), 149 unmapped: 9 hidden (Plate guess, real Mail), 33 correct guesses, 107 with no guess.
4. wow-classic-items 2.0.1 covers all Vanilla, TBC and WotLK Classic items; every armor-slot id in the Classic, TBC and Wrath catalogs is in it; TBC lists two fist weapons (Grip of Mannoroth 34203, Mounting Vengeance 34346) under armor slots. Cata and MoP ids are not in it.
5. Other expansions (pre-change counts): see the before columns of the D-10 table above.
6. Rule precision on checkable armor pieces: Plate result 112/144 correct; "plate but not breastplate" 57/59 correct (misses: Legplates of Ten Storms, Bloodstained Legplates, both now mapped Classic pieces); Mail 8/8; Cloth 41/47 (misses lighter, harmless).
7. Stored values: the seeder and Classic backfill migrations never set `armor_type`; `scripts/populate-item-types.ts` (2026-01-30) can disagree with current ITEM_TYPES and the name guess; `scripts/populate-missing-types.ts` (2026-03-01, run against production) filled from Wowhead tooltip data, which agrees with the package. Stored-only readers: the reserve-run join route/page (`canClassReserveItem`) and `LootListContent.tsx`'s armor-only filter.
8. GH #276 (open) asks for class-locked set filtering from the package tooltip "Classes:" line; this change narrows but does not close it ("Refs #276").
9. Precedent: `a5325c11` (2026-03-29) removed "gauntlets" from the Plate rule after a Shaman could not select Worldstorm Gauntlets.
10. Early catalogs listed some names under other ids; lookups are by `wowhead_id`, so such rows are left alone (both by the app change and the migration draft).
11. Baselines: eslint pre-existing warnings were exactly the 3 unused-argument warnings in `lib/__tests__/loot-items-query.test.ts` (lines 26/37 before this task's edits shifted them to 28/39). No PGlite installed; no package installs needed.

## Test Counts Per File (final, WT)

| File | Tests |
|------|-------|
| `data/__tests__/classic-catalog-completeness.test.ts` | 339 (all pass) |
| `data/__tests__/item-types.test.ts` (new) | 12 (all pass) |
| `lib/__tests__/loot-items-query.test.ts` | 54 (all pass) |
| `app/services/__tests__/classic-armor-types-migration.test.ts` (WTM, new) | 6 (all pass) |

## Baseline vs Final Results

### Vitest (full suite, WT)

- **Baseline** (`SP/baseline-388-vitest.txt`, HEAD `6ec51a3a`): 9 test files failed, 29 tests failed (timeouts in `ItemCandidateModal.test.tsx` and others, under the harness's parallel-execution load at the time); 200 test files / 3654 tests passed. `EXIT=1`.
- **Final** (`SP/final-388-vitest.txt`, after all 4 WT commits): 210 test files passed, 3718 tests passed, 0 failed. `EXIT=0`.
- `node SP/new-fails-388.mjs SP/baseline-388-vitest.json SP/final-388-vitest.json` → "No new failures." (exit 0). The baseline's 29 failures did not recur and nothing new failed; the flakiness documented in the baseline was not caused by this task's changes and had cleared by the final run.

### tsc

- Baseline (`SP/baseline-388-tsc.txt`): `EXIT=0`, no output.
- Task 1 (`SP/task1-388-tsc.txt`): `EXIT=0`.
- Final WT (`SP/final-388-tsc.txt`): `EXIT=0`, no output.
- WTM (`SP/task3-388-tsc.txt`): `EXIT=0`, no output.

### eslint

- Baseline (`SP/baseline-388-eslint.txt`): 3 pre-existing warnings in `lib/__tests__/loot-items-query.test.ts` (lines 26, 37, 37, unused `_cols`/`_column`/`_opts`), 0 errors. `EXIT=0`.
- Final WT (`SP/final-388-eslint.txt`): same 3 pre-existing warnings (now at lines 28, 39, 39 after the GH-388 test block was inserted above them), 0 new warnings on `data/item-types.ts` or `data/__tests__`. `EXIT=0`.
- WTM (`SP/task3-388-eslint.txt`): `EXIT=0`, no output (clean on the new migration test file).

No flaky lines recorded beyond the baseline's 9-file timeout batch, which did not reproduce on the final run.

## PR Body Drafts

- App PR: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/331da5ac-3e3c-42a8-a81a-1d8985a423b4/scratchpad/pr-body-388.md` ("Fixes #388", "Refs #276").
- Migration PR (OD-1 B): `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/331da5ac-3e3c-42a8-a81a-1d8985a423b4/scratchpad/pr-body-388-migration.md` ("Refs #388").
- Migration file (WTM, unpushed): `supabase/migrations/20261005120000_correct_stored_classic_armor_types.sql`.

## Read-Only Check Query for the User (OD-1 B)

Before deciding whether to open the migration PR, run this in the Supabase SQL editor (file: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/331da5ac-3e3c-42a8-a81a-1d8985a423b4/scratchpad/check-388-stored-armor-types.sql`, 341 tuples, read-only, returns item ids/types/counts only, no guild data):

```sql
SELECT v.wowhead_id, li.armor_type AS stored, v.armor_type AS package_type, count(*) AS row_count
FROM loot_items li
JOIN (
  VALUES
    -- 341 tuples: (wowhead_id, name, package_armor_type)
    ...
) AS v(wowhead_id, name, armor_type)
  ON li.wowhead_id = v.wowhead_id
  AND lower(li.name) = lower(v.name)
WHERE li.armor_type IS NOT NULL
  AND li.armor_type <> v.armor_type
GROUP BY 1, 2, 3
ORDER BY 1, 2;
```

An empty result means no guild's stored data disagrees with the package, and the migration PR (`fix/388-stored-classic-armor-types`, commit `b1a20525`) can stay unopened. Any row means the migration should be opened as a PR and merged with `--admin` (migrations apply about 12 seconds after merge).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed an em dash introduced into a modified code comment**
- **Found during:** Task 2, Step 6 (text gate check)
- **Issue:** The narrowed Plate-rule doc comment I wrote in `data/item-types.ts` touched a pre-existing line that already contained an em dash (`// Note: "gauntlets" excluded, used...`), adding a trailing period to it. Because the line's content changed, it counted as a newly-added line under the plan's "no em dash in any added line" rule, even though the em dash itself was pre-existing and not something the plan asked me to touch.
- **Fix:** Reverted that one line back to its original, byte-identical text (no added period) so it no longer appears as a changed/added line in the diff, and reworded the new GH-388 note (which legitimately needed new text) to avoid an em dash entirely.
- **Files modified:** `data/item-types.ts`
- **Verification:** `git diff 6ec51a3a -- data/item-types.ts` (working tree) showed no em dash in any `+` line; re-ran `data/__tests__/item-types.test.ts` and `npx tsc --noEmit`, both clean.
- **Committed in:** `44ea0fc8` (separate fixup commit, since Task 2's commit 3, `2478c924`, had already landed with the issue; touches only `data/item-types.ts`, a files_modified path)

---

**Total deviations:** 1 auto-fixed (Rule 1 - text-gate bug, not a code-behavior bug)
**Impact on plan:** No behavior change; a public-facing comment wording fix. No scope creep.

## Handoff Notes

None, no context-length checkpoint was hit; the plan executed in one continuous session with baselines through final verification all captured. `SP/388-handoff.txt` was not created because it was never needed.

## Follow-Ups (neutral wording, as rules to adopt)

- **FU-1:** The expansion seeder should write `armor_type` and `weapon_type` from ITEM_TYPES when it creates `loot_items` rows, so the reserve class check and the "armor only" filter see the same type as the picker.
- **FU-2:** The loot-items API (or the reserve routes) should use the same resolved type as the picker instead of the raw stored column.
- **FU-3** (OD-2 is B): TBC and Wrath raid armor pieces should take their type from the package as Classic now does (TBC 51 unmapped armor-slot ids including 2 fist weapons misfiled under armor slots; Wrath 664 unmapped armor-slot ids, 0 currently mapped).
- **FU-4:** Wrath's 16 pieces that were hidden by a plate guess before this task's rule narrowing are now visible as a side effect, but remain otherwise unmapped (no ITEM_TYPES entry); FU-3 would close this properly.
- **FU-5:** Cata and MoP have no in-repo source for armor types (377 and 947 armor-slot pieces), so a source should be chosen before they get entries.
- **FU-6:** The TBC catalog lists Grip of Mannoroth (34203) and Mounting Vengeance (34346) in Hands and Waist although they are fist weapons.
- **FU-7:** Stored `weapon_type` values written by the 2026-01-30 script may disagree with today's ITEM_TYPES the same way; the same read-only aggregate check approach applies.
- **FU-8:** GH #276 (class-locked set pieces) stays open.

## Self-Check: PASSED

- SUMMARY.md exists at its expected path.
- `SP/pr-body-388.md`, `SP/pr-body-388-migration.md`, `SP/check-388-stored-armor-types.sql` all exist.
- All four WT commits (`997a4fbd`, `a3596446`, `2478c924`, `44ea0fc8`) found in `git log --oneline --all` inside the WT worktree.
- The WTM commit (`b1a20525`) found in `git log --oneline --all` inside the WTM worktree.
