---
phase: quick-261110-g5c
plan: 01
subsystem: loot-list
tags: [bis-import, officer-prio, phase-groups, submit-validation, tbc-bis-data, dependabot, gh-484]
requires: [quick-261109-tr1]
provides:
  - "resolveListPhases / resolveUnlockedPhaseGroups: one phase-group resolution for Import BIS and the editor"
  - "placeBisItems.skippedForPrioCount and the Import BIS prio notice"
  - "findPrioViolations + zoneForRank: officer prio enforced at submit and marked in the editor"
  - "scripts/count-prio-violations.ts: read-only, aggregate-only count of existing out-of-prio lists"
  - "TBC BiS non-neck data audited and test-pinned (see FU4)"
  - "Open Dependabot alerts patched within their majors (root and companion)"
affects: [bis-import, loot-list-editor, submit-route, data/bis/tbc-bis.ts, package-lock.json, companion/package-lock.json]
tech-stack:
  added: []
  patterns: ["pure rule in domain, service-role read helper in lib, route composes both", "DRAFT copy constants next to the rule they explain"]
key-files:
  created:
    - domain/expansion/__tests__/phase-groups.test.ts
    - app/api/bis-items/__tests__/route.test.ts
    - domain/loot/prio-violations.ts
    - domain/loot/__tests__/prio-violations.test.ts
    - domain/expansion/list-tier-ids.ts
    - domain/expansion/__tests__/list-tier-ids.test.ts
    - lib/loot/prio-check.ts
    - lib/loot/__tests__/prio-check.test.ts
    - scripts/count-prio-violations.ts
    - data/__tests__/tbc-bis-audit.test.ts
  modified:
    - domain/expansion/phase-groups.ts
    - app/api/bis-items/route.ts
    - app/api/loot-list/bootstrap/route.ts
    - domain/loot/bis-import-placement.ts
    - domain/loot/__tests__/bis-import-placement.test.ts
    - app/contexts/LootListContext.tsx
    - app/components/BisImportModal.tsx
    - domain/loot/prio-zones.ts
    - app/api/loot-submissions/submit/route.ts
    - app/api/loot-submissions/submit/__tests__/route.test.ts
    - app/(app)/loot-list/components/LootListContent.tsx
    - data/bis/tbc-bis.ts
    - package.json
    - package-lock.json
    - companion/package.json
    - companion/package-lock.json
key-decisions:
  - "Prio refusal at submit is a 400 with code PRIO_VIOLATION and a prio_violations array, not the 422 'violations' shape, so the client does not format it as bracket rules"
  - "Active award locks are never re-judged by prio, in the import, at submit and in the editor marker"
  - "Transitive Dependabot fixes hold the first patched release; minimatch (patch is a major) and extract-zip (no patch) are listed, not bumped"
  - "The Import BIS prio notice keeps the modal open instead of auto-closing so the raider can read it"
status: complete
branch: fix/bis-import-phase-groups, feat/bis-import-skipped-count, feat/prio-enforced-at-submit, fix/tbc-bis-data-audit, fix/dependabot-2026-11
estimate:
  tokens: 250000
  tasks: 5
actuals:
  tokens: 1100000
  tasks: 5
  commits: 13
---

# Quick 261110-g5c Plan 01: GH #484 follow-ups Summary

Import BIS now draws on every raid of the selected phase group and tells the raider how many BiS items officer prio kept out; submit refuses a list with a ranked item outside its zone's prio pool and the editor marks such items; the rest of the TBC BiS data is audited and pinned; and the open Dependabot alerts are patched without crossing a major. Five branches from origin/main (27be305d), five PRs (#492, #493, #494, #495, #496). The owner signed off the copy of tasks 2 and 3 and the task 4 picks on 2026-11-10 ("Yes, merge those"), and all five PRs are merged.

## How it ran

The PLAN was written at 11:38 in a terminal `claude` session, which then executed tasks 1, 3, 4 and 5 with worktree agents and started a second copy of task 2. A desktop session took task 2 at 11:40 (the one branch nobody held), then took over everything at 11:50 on the owner's go-ahead: the terminal session was interrupted, its three in-progress worktrees were adopted (task 1 complete, task 3 with the editor marker uncommitted, task 5 with three commits), task 4 had not started and was delegated to a fresh agent, and the duplicate task 2 copy on `feat/bis-import-skipped-count-a5c` (worktree `.claude/worktrees/agent-a5cad6ffc1828d059`, uncommitted) was left for the owner to delete, because removing it was refused by auto mode. Commits from the terminal session carry `Co-Authored-By: Claude Opus 5.5`; the rest carry `Claude Fable 5.1`.

## Branches, commits and PRs

| Task | Branch | Commits (base 27be305d) | PR | Copy |
|------|--------|-------------------------|----|------|
| 1 | fix/bis-import-phase-groups | 434966b8, 6f67f8e5 | #493, merged 2026-11-10 as f9bcfdba | none |
| 2 | feat/bis-import-skipped-count | 2a9340b3 | #492, merged 2026-11-10 as 6466408a | DRAFT, signed off 2026-11-10 |
| 3 | feat/prio-enforced-at-submit | 947b1c86, 4063a5ee, 8c27df2b, 446d45d6 | #494, merged 2026-11-10 as 7e17b8fe | DRAFT, signed off 2026-11-10 |
| 4 | fix/tbc-bis-data-audit | a4041e44, 5be3f6e7 | #496, merged 2026-11-10 as 89bae71e | none |
| 5 | fix/dependabot-2026-11 | f97a01ac, 8b39ff06, b08674d9, 26ffb094 | #495, merged 2026-11-10 as 792a54c1 | none |

## Task 1: Import BIS covers the whole phase group (FU1)

`app/api/bis-items/route.ts` filtered raid tiers with `.eq('phase', phase)`, but the client sends the canonical phase of a phase group, so a grouped list imported nothing from the later phases.

- `domain/expansion/phase-groups.ts` gains `resolveUnlockedPhaseGroups` (guild-active tiers, linear unlock, unique phases), `resolveListPhases` (every raw phase of the group keyed by a canonical phase, falling back to the phase itself) and `resolvePhasesSharingGroup` (the disabled-tier diagnostics, so an empty import names a disabled raid from a later phase). 13 unit tests.
- The route reads `current_phase` and `phase_groups` the way the bootstrap route does and queries tiers for every phase of the group. 4 route tests.
- The bootstrap route now calls the shared helper, so Import BIS and the editor cannot disagree about the groups.

Gates: eslint clean on the five files; `tsc --noEmit` clean; 56 targeted tests; full suite 261 files / 5272 tests, two load timeouts (`quality-brand-token-parity`, `no-live-fetch`) passed alone (23 tests).

## Task 2: Import BIS reports what prio kept out (FU2)

`placeBisItems` returns `skippedForPrioCount`: matched, unequipped, non-Loot-Council BiS items left unranked because `canRankInZone(item, 'noBracket')` is false. Locked ranks, equipped items, ids outside the loot table and in-prio items that only ran out of room are not counted. The count flows through `BisImportResult` to `BisImportModal`, which shows one muted line only when it is above zero and then leaves the modal open (no 1.5 s auto-close). `bis_import_completed` carries `skipped_for_prio_count`.

DRAFT copy (BisImportModal, owner sign-off pending): `Skipped {n} BIS item(s) prio'd to other classes`, which reuses the editor's existing "prio'd to other classes" wording.

Tests: 5 new `// regression for #484` cases (counts, zero when all placed, LC/equipped/unknown not counted, locked not counted, in-prio out-of-room not counted). Gates: eslint 0 errors (the one pre-existing exhaustive-deps warning in LootListContext); tsc clean; full suite 259 files / 5262 tests, one load timeout passed alone.

Deviation: the plan said only "show it when above zero"; keeping the modal open when the notice shows is an addition, noted in PR #492 for the owner.

## Task 3: Prio enforced at submit, marked in the editor (FU3)

- `domain/loot/prio-violations.ts`: `findPrioViolations(entries, items, locks)` maps each rank to its zone with `zoneForRank` (added to prio-zones.ts, same boundaries as the editor pools) and applies `canRankInZone`. Not flagged: Loot Council items (every editor pool lists them), items outside the character's item set, and a rank held by an active award lock on the same item. A parity test checks it against the editor pools for every item and rank. Ordered rank descending then slot ascending.
- `domain/expansion/list-tier-ids.ts` and `lib/loot/prio-check.ts`: the submit route recomputes the character's items and prio flags over the list's phase-group tiers (guild-active, linear unlock), mirroring the bootstrap route. Read failures reject so the route returns 500 instead of skipping the check.
- `POST /api/loot-submissions/submit` refuses with 400, `code: 'PRIO_VIOLATION'` and `prio_violations` naming each item and rank. Lock and bracket checks still run first. 7 route tests.
- The editor shows a "Not your prio" badge next to the boss name of each out-of-prio cell (desktop rows and mobile cards), computed from the same rule over the current rankings; locked ranks are never marked.
- `scripts/count-prio-violations.ts`: read-only, aggregate-only, one pass over the three tables then the rule per list with the item set cached per expansion, phase and spec. Prints counts by status, never a name or id. Requires `--confirm`. Not run against production.

DRAFT copy (domain/loot/prio-violations.ts, owner sign-off pending): refusal `Officers set prio for {item} (rank {n}) to other classes. Move it to Off-spec or remove it, then submit again.` (plural form lists the items); badge `Not your prio`; hover and screen-reader text `Officers set prio for this item to other classes. Move it to Off-spec or remove it before you submit.`

Gates: eslint 0 errors on the eleven files, LootListContent keeps its 17 pre-existing warnings; tsc clean; 44 targeted tests; full suite 262 files / 5283 tests, all passing on the second run (the first had one load timeout).

Closes accepted threat T-261109-02 from 261109-tr1.

## Task 4: TBC BiS data audit (FU4)

Every non-Neck entry of `data/bis/tbc-bis.ts` (1217 entries; the 57 Neck entries are pinned by 261109-tr1) was classified against `data/tbc-raids.ts` and the wow-classic-items tooltips into one bucket, then only the objective buckets were fixed.

| Bucket | Before | After | Treatment |
|---|---|---|---|
| OFF_TABLE (not a raid drop: crafted, badge, reputation, dungeon, quest; includes 38 entries / 36 ids that are tier PIECES) | 182 | 182 | left alone, count pinned |
| SLOT_VARIANT (Head/Shoulder/Chest/Hands/Legs pointing at a Token, Main Hand or Off Hand at a One-Hand, Off Hand at Held In Off-hand, the two Warglaives as Legendary) | 266 | 277 | left alone, alias map in the test |
| WRONG_RAID (mostly T5 tokens cross-listed under SSC and TK, Dragonspine Trophy under Kara/SSC/BT, Tsunami Talisman under TK, Mindstorm Wristbands under SSC) | 175 | 0 | moved to the raid that drops it; a copy already there is dropped |
| WRONG_SLOT (the id was a different item of the same raid; the trailing comment usually names the intended one) | 63 | 0 | comment-named item of the same raid and slot when it fits the role (16), else moved to the loot slot |
| UNUSABLE (mail on druids and rogues, plate on a shaman, swords on shaman/priest/druid, Druid-only Living Root on healers, an Idol on a paladin, a Libram on a shaman, a Defender token on a Mage) | 38 | 0 | replaced with a usable, role-fitting item of the same raid and slot |
| ROLE_MISFIT (tank plate, trinkets and a libram on healers and DPS, caster items on physical lists, physical items on casters and healers) | 40 | 0 | replaced with a role-fitting item of the same raid and slot |
| OK | 453 | 654 | |

316 entries changed: 195 moved (96 of them dropped as duplicates of an entry already under the right raid), 113 replaced, 8 removed where the raid and slot offered nothing usable. 1113 entries remain. Replacement picks are scored by role match, then class armor type, then item level; 9 are hand picks where the scorer cannot see what matters (weapon speed for Enhancement, bear versus cat staff, a tank's off hand is a shield). The full table is in the appendix below.

Spot check of the classifier before pushing: the ids behind the replaced "Dragon-Quake Shoulderguards", "Whirlwind Bracers", "Belt of Gale Force" and "Wrynn Dynasty Greaves" lines are a mail Int/spell-power shoulder, mail Int/spell-power bracers, a mail Int/spell-power belt and defense/dodge plate legs in the wow-classic-items data, so the trailing comments named other items and the flags were right.

Tier pieces and the loot table: `data/tbc-raids.ts` carries token ids only (54 entries, all under slot `Token`: T4 15, T5 15, T6 24) and no tier piece id. The BiS file points at tokens for 250 entries after the fix (294 before, 44 of those under the wrong raid), which match at import and are ranked under the loot item's slot `Token`. The 38 entries that point at tier pieces never match at import and were left alone as OFF_TABLE.

Test: `data/__tests__/tbc-bis-audit.test.ts` (82 tests: 5 shape tests, 18 specs x raid, slot, usable, role, and 5 `// regression for #484` cases pinned to 28621/28599, 28830, the T5 token ids, 34198/34247 and 32368). Against the original data: 71 failed, 11 passed (raid 18/18 specs, slot 18/18, usable 14/18, role 16/18, all 5 regressions). Against the fixed data: 82/82, and tbc-bis-necks.test.ts still passes.

Gates: eslint on the two files 0 errors, 0 warnings; tsc clean; `vitest run data` 17 files / 1006 tests; full suite 260 files / 5339 tests, two load failures (`quality-brand-token-parity` timeout, `ForeverAnnouncementModal` focus) passed alone (22 tests).

Left alone, for the owner (ids in the appendix table are the ones changed; these were not):

- 127 non-Neck entries whose trailing comment names a different item than the id but which pass all four checks (73 on the table, 54 off it). Some look like a wrong id rather than a stale comment: BT Finger 32528 commented "Ring of Ancient Knowledge" on Holy Paladin, Resto Shaman and Resto Druid; Ele/Balance BT Finger 32527 and 32247; 32526 "Band of the Eternal Champion" on five lists; Ret/Enh BT Feet 32510 "Shadowmaster's Boots"; Ret Gruul Hands 28827; Prot Paladin BT Feet 32268, BT Back 32331, ZA Back 33592, Hyjal Off Hand 30881; Resto Druid SWP Head 34339; Ele/Balance ZA Finger 33497; Ret ZA Waist 33211; 33453 on three healers.
- Off-table oddities that never import: 30018 (a neck) under Prot Warrior SSC Feet, 34003 under Rogue BT Ranged, the Kael'thas encounter weapons 30311/30312/30316/30318, 33491 under Feral/Guardian ZA Two-Hand, 33359 under Enh/Feral/Guardian ZA Waist, 34215 under Holy Paladin SWP Chest, tier piece ids crossed between set variants (31037, 30985, 31014).
- Healer and caster are not told apart (per the plan's rule), so 30626 Sextant of Unstable Currents is now the SSC trinket for Holy Paladin and Resto Shaman and 30108 Lightfathom Scepter the SSC main hand for Elemental, Balance and Shadow.
- Moves leave a few slots with two `bis` entries (Kara Feet on Ret, Prot Paladin and both Warriors; Holy Paladin and Resto Shaman BT Shoulder) and some slots empty (SSC Shoulder/Chest and TK Head for every spec, Holy Paladin BT Waist/Feet/Relic and SWP Two-Hand, Feral/Guardian Gruul Hands). No replacement was invented for an emptied slot.
- Tank specs are never flagged for role, so correctly slotted caster or healer items on Prot Paladin and Prot Warrior lists stay.

## Task 5: Dependabot alerts (FU5)

Every open alert with a patched version inside the current major is at that first patched version:

| Package | Manifest | Now |
|---|---|---|
| next | root | 16.4.1 |
| zod | root | 4.6.6 (pinned exact, as before) |
| dompurify via posthog-js | root | 3.4.17, lockfile only |
| undici via jsdom | root | 7.30.1, lockfile only |
| vite via vitest | root | 8.2.4, lockfile only |
| vitest, @vitest/mocker | root | 4.1.12 |
| postcss-selector-parser via tailwindcss and postcss-nested | root and companion | 6.1.5, lockfile only |
| electron | companion | 43.8.1 |
| vite | companion | 6.4.4 |
| fast-uri via electron-builder > ajv | companion | 3.1.9, lockfile only |

Not fixed, with the reason:

- minimatch (#273 root, #270 companion): the patch is 11.0.1, a major bump. Root: 9.0.9 via eslint-config-next > typescript-eslint > @typescript-eslint/typescript-estree. Companion: 9.0.9 via electron-builder > app-builder-lib > @electron/universal, and 10.2.6 via electron-builder > app-builder-lib. Copies at 3.1.5 and 5.1.9 are below the vulnerable range.
- extract-zip 2.0.1 (#175, #176 root): no patched version; puppeteer > @puppeteer/browsers > extract-zip, devDependency.
- A nested zod 3.25.76 under chromium-bidi (puppeteer) is unchanged; moving it is a major bump of a transitive. Dependabot may keep #262 open against it.

PR #495 supersedes the Dependabot PRs #460, #461, #471, #474, #479, #480, #481 and #491.

Gates (root): `npm run lint` 0 errors, 375 warnings, exactly main's count; `npm run typecheck` clean; `npm test` 259 files / 5257 tests (one load timeout passed alone); `npm run build` clean. Companion has no test script, so `npm run typecheck` and `npm run build` stand in: both clean.

Note for the next dependency pass: `npm install` with the local npm strips the `"libc"` fields from the root lockfile (96 lines of drift); the agent reverted that and kept only the intended lines. A lint run that overlaps a companion build picks up the gitignored `companion/out/renderer` bundle because `eslint.config.mjs` ignores `out/**` but not `companion/out/**`; out of scope here.

## Deviations from Plan

- Task 2 keeps the modal open when the notice shows (see above).
- Task 5 could not fix minimatch within a major; listed as the plan asked.
- Two sessions ran the plan for about ten minutes (see "How it ran"); the duplicate task 2 work is uncommitted on `feat/bis-import-skipped-count-a5c` and is not part of any PR.

## Follow-ups and non-goals (not done)

1. (done 2026-11-10) Owner sign-off on the DRAFT copy in PRs #492 and #494; both merged. The strings keep their DRAFT comments in code until a copy pass renames them.
2. Run `scripts/count-prio-violations.ts --confirm` against production once the owner says so, and record the aggregate counts here.
3. minimatch 11.0.1 needs eslint-config-next / typescript-eslint and electron-builder to move; revisit when those majors land.
4. `eslint.config.mjs` should ignore `companion/out/**` so a stale companion build cannot fail lint.
6. The "Run Load Tests" job failed on every PR of this task because the k6 apt key no longer verified; fixed outside the task by PR #498 (setup-k6-action), merged 2026-11-10 as 975ed436.
5. Delete the `feat/bis-import-skipped-count-a5c` branch and its worktree (`git worktree remove --force .claude/worktrees/agent-a5cad6ffc1828d059 && git branch -D feat/bis-import-skipped-count-a5c`), plus the stale `worktree-agent-*` bookkeeping branches.

## Known Stubs

None.

## Threat Flags

- Task 3 adds a server-side read of the character's item set at submit through the service role; it is scoped by the submission's own character, expansion and phase, and a read failure fails closed (500).
- Task 3's script reads three tables with the service role and prints aggregates only; it refuses to run without `--confirm`.
- No new endpoints, schema changes or file access otherwise. Task 5 changes dependency versions only.

## Self-Check: PASSED

- FOUND on the five branches: the key-files above, each on the branch its task names
- FOUND commits: 434966b8, 6f67f8e5; 2a9340b3; 947b1c86, 4063a5ee, 8c27df2b, 446d45d6; a4041e44, 5be3f6e7; f97a01ac, 8b39ff06, b08674d9, 26ffb094
- Working copy back on gsd/quick-261110-g5c-gh-484-follow-ups-bis-phase-groups-prio-; PLAN and SUMMARY committed there

## Appendix: FU4 change table

Tier abbreviations: Kara, Gruul, Mag, SSC, TK, Hyjal, BT, ZA, SWP. "(comment)" means the entry's own trailing comment named the replacement; "(hand pick)" means the scorer could not decide.

| Spec | Tier | Slot | Old | New | Bucket |
|---|---|---|---|---|---|
| Holy Paladin | Kara | Waist | 28799 Belt of Divine Inspiration (bis) | moved to Gruul / Waist | WRONG_RAID |
| Holy Paladin | Kara | Legs | 28621 Wrynn Dynasty Greaves (bis) | 28748 Legplates of the Innocent | ROLE_MISFIT |
| Holy Paladin | Kara | Trinket | 28528 Moroes' Lucky Pocket Watch (bis) | 28590 Ribbon of Sacrifice | ROLE_MISFIT |
| Holy Paladin | Kara | Relic | 28568 Idol of the Avian Heart (bis) | 28592 Libram of Souls Redeemed | UNUSABLE |
| Holy Paladin | SSC | Shoulder | 30248 Pauldrons of the Vanquished Champion (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Holy Paladin | SSC | Chest | 30236 Chestguard of the Vanquished Champion (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Holy Paladin | SSC | Trinket | 30664 Living Root of the Wildheart (bis) | 30626 Sextant of Unstable Currents | UNUSABLE |
| Holy Paladin | TK | Head | 30242 Helm of the Vanquished Champion (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Holy Paladin | Hyjal | Main Hand | 30885 Archbishop's Slippers (bis) | 30918 Hammer of Atonement | WRONG_SLOT (comment) |
| Holy Paladin | BT | Wrist | 32516 Wraps of Purification (bis) | moved to SSC / Wrist | WRONG_RAID |
| Holy Paladin | BT | Waist | 32528 Blessed Band of Karabor (bis) | dropped, already under BT / Finger | WRONG_SLOT |
| Holy Paladin | BT | Feet | 32517 The Wavemender's Mantle (bis) | moved to BT / Shoulder | WRONG_SLOT |
| Holy Paladin | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | moved to SWP / Trinket | WRONG_RAID |
| Holy Paladin | BT | Relic | 32368 Tome of the Lightbringer (bis) | removed | ROLE_MISFIT |
| Holy Paladin | ZA | Main Hand | 33354 Wub's Cursed Hexblade (alt) | 33468 Dark Blessing | UNUSABLE (hand pick) |
| Holy Paladin | SWP | Two-Hand | 34337 Golden Staff of the Sin'dorei (bis) | removed | UNUSABLE |
| Retribution Paladin | Kara | Head | 28583 Big Bad Wolf's Head (bis) | 28732 Cowl of Defiance | ROLE_MISFIT |
| Retribution Paladin | Kara | Shoulder | 28631 Dragon-Quake Shoulderguards (bis) | 28755 Bladed Shoulderpads of the Merciless | ROLE_MISFIT |
| Retribution Paladin | Kara | Chest | 28746 Fiend Slayer Boots (bis) | moved to Kara / Feet | WRONG_SLOT |
| Retribution Paladin | Kara | Wrist | 28502 Vambraces of Courage (bis) | 28514 Bracers of Maliciousness | ROLE_MISFIT |
| Retribution Paladin | Kara | Hands | 28505 Gauntlets of Renewed Hope (alt) | 28506 Gloves of Dexterous Manipulation | ROLE_MISFIT |
| Retribution Paladin | Kara | Waist | 28566 Crimson Girdle of the Indomitable (bis) | 28656 Girdle of the Prowler | ROLE_MISFIT |
| Retribution Paladin | Kara | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Retribution Paladin | SSC | Chest | 30236 Chestguard of the Vanquished Champion (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Retribution Paladin | SSC | Hands | 29947 Gloves of the Searing Grip (bis) | moved to TK / Hands | WRONG_RAID |
| Retribution Paladin | SSC | Legs | 29950 Greaves of the Bloodwarder (bis) | moved to TK / Legs | WRONG_RAID |
| Retribution Paladin | SSC | Finger | 29997 Band of the Ranger-General (alt) | moved to TK / Finger | WRONG_RAID |
| Retribution Paladin | SSC | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Retribution Paladin | SSC | Two-Hand | 29993 Twinblade of the Phoenix (alt) | moved to TK / Two-Hand | WRONG_RAID |
| Retribution Paladin | TK | Head | 30242 Helm of the Vanquished Champion (bis) | moved to SSC / Head | WRONG_RAID |
| Retribution Paladin | TK | Back | 30098 Razor-Scale Battlecloak (bis) | dropped, already under SSC / Back | WRONG_RAID |
| Retribution Paladin | TK | Trinket | 30627 Tsunami Talisman (bis) | moved to SSC / Trinket | WRONG_RAID |
| Retribution Paladin | Hyjal | Shoulder | 30884 Hatefury Mantle (alt) | 30866 Blood-stained Pauldrons | ROLE_MISFIT |
| Retribution Paladin | Hyjal | Two-Hand | 30910 Tempest of Chaos (bis) | 30902 Cataclysm's Edge | ROLE_MISFIT + WRONG_SLOT (comment) |
| Retribution Paladin | BT | Waist | 32232 Eternium Shell Bracers (bis) | 32606 Girdle of the Lightbearer | ROLE_MISFIT + WRONG_SLOT |
| Retribution Paladin | BT | Finger | 32261 Band of the Abyssal Lord (alt) | 32266 Ring of Deceitful Intent | ROLE_MISFIT (comment) |
| Retribution Paladin | BT | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Protection Paladin | Kara | Chest | 28746 Fiend Slayer Boots (bis) | moved to Kara / Feet | WRONG_SLOT |
| Protection Paladin | Kara | Trinket | 28789 Eye of Magtheridon (alt) | moved to Mag / Trinket | WRONG_RAID |
| Protection Paladin | Kara | Off Hand | 28825 Aldori Legacy Defender (bis) | moved to Gruul / Off Hand | WRONG_RAID |
| Protection Paladin | Gruul | Head | 28795 Bladespire Warbands (alt) | 28801 Maulgar's Warhelm | WRONG_SLOT (comment) |
| Protection Paladin | SSC | Shoulder | 30248 Pauldrons of the Vanquished Champion (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Protection Paladin | SSC | Back | 30084 Pauldrons of the Argent Sentinel (bis) | 30098 Razor-Scale Battlecloak | WRONG_SLOT |
| Protection Paladin | SSC | Chest | 30236 Chestguard of the Vanquished Champion (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Protection Paladin | SSC | Feet | 30020 Fire-Cord of the Magus (bis) | 30081 Warboots of Obliteration | WRONG_SLOT+WRONG_RAID |
| Protection Paladin | TK | Head | 30242 Helm of the Vanquished Champion (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Protection Paladin | TK | Trinket | 30629 Scarab of Displacement (bis) | dropped, already under SSC / Trinket | WRONG_RAID |
| Protection Paladin | TK | Main Hand | 30058 Mallet of the Tides (alt) | dropped, already under SSC / Main Hand | WRONG_RAID |
| Protection Paladin | Hyjal | Shoulder | 30894 Blue Suede Shoes (alt) | 30866 Blood-stained Pauldrons | WRONG_SLOT |
| Protection Paladin | BT | Wrist | 32515 Wristguards of Determination (bis) | moved to TK / Wrist | WRONG_RAID |
| Protection Paladin | BT | Waist | 32232 Eternium Shell Bracers (bis) | moved to BT / Wrist | WRONG_SLOT |
| Protection Paladin | ZA | Off Hand | 33463 Hood of the Third Eye (alt) | 33326 Bulwark of the Amani Empire | WRONG_SLOT (hand pick) |
| Protection Paladin | SWP | Shoulder | 34164 Dragonscale-Encrusted Longblade (bis) | moved to SWP / Main Hand | WRONG_SLOT |
| Restoration Shaman | Kara | Legs | 28740 Rip-Flayer Leggings (bis) | 28591 Earthsoul Leggings | ROLE_MISFIT |
| Restoration Shaman | Kara | Trinket | 28523 Totem of Healing Rains (bis) | dropped, already under Kara / Relic | WRONG_SLOT |
| Restoration Shaman | Kara | Off Hand | 28753 Ring of Recurrence (bis) | moved to Kara / Finger | WRONG_SLOT |
| Restoration Shaman | SSC | Shoulder | 30248 Pauldrons of the Vanquished Champion (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Restoration Shaman | SSC | Chest | 30236 Chestguard of the Vanquished Champion (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Restoration Shaman | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Restoration Shaman | SSC | Trinket | 30664 Living Root of the Wildheart (bis) | 30626 Sextant of Unstable Currents | UNUSABLE |
| Restoration Shaman | SSC | Main Hand | 30095 Fang of the Leviathan (bis) | 30108 Lightfathom Scepter | UNUSABLE |
| Restoration Shaman | TK | Head | 30242 Helm of the Vanquished Champion (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Restoration Shaman | TK | Off Hand | 30049 Fathomstone (alt) | dropped, already under SSC / Off Hand | WRONG_RAID |
| Restoration Shaman | Hyjal | Main Hand | 30885 Archbishop's Slippers (bis) | 30918 Hammer of Atonement | WRONG_SLOT (comment) |
| Restoration Shaman | BT | Wrist | 32516 Wraps of Purification (bis) | moved to SSC / Wrist | WRONG_RAID |
| Restoration Shaman | BT | Waist | 32528 Blessed Band of Karabor (bis) | dropped, already under BT / Finger | WRONG_SLOT |
| Restoration Shaman | BT | Feet | 32517 The Wavemender's Mantle (bis) | moved to BT / Shoulder | WRONG_SLOT |
| Restoration Shaman | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | moved to SWP / Trinket | WRONG_RAID |
| Restoration Shaman | BT | Relic | 32368 Tome of the Lightbringer (bis) | removed | UNUSABLE (hand pick) |
| Elemental Shaman | Kara | Chest | 29754 Chestguard of the Fallen Champion (bis) | dropped, already under Mag / Chest | WRONG_RAID |
| Elemental Shaman | Kara | Legs | 28740 Rip-Flayer Leggings (bis) | 28751 Heart-Flame Leggings | ROLE_MISFIT |
| Elemental Shaman | Kara | Finger | 28727 Pendant of the Violet Eye (alt) | dropped, already under Kara / Trinket | WRONG_SLOT |
| Elemental Shaman | Gruul | Finger | 28823 Eye of Gruul (alt) | moved to Gruul / Trinket | WRONG_SLOT |
| Elemental Shaman | Mag | Ranged | 28782 Crystalheart Pulse-Staff (bis) | moved to Mag / Two-Hand | WRONG_SLOT |
| Elemental Shaman | SSC | Shoulder | 30248 Pauldrons of the Vanquished Champion (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Elemental Shaman | SSC | Back | 29992 Royal Cloak of the Sunstriders (bis) | moved to TK / Back | WRONG_RAID |
| Elemental Shaman | SSC | Chest | 30236 Chestguard of the Vanquished Champion (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Elemental Shaman | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Elemental Shaman | SSC | Finger | 29922 Band of Al'ar (alt) | moved to TK / Finger | WRONG_RAID |
| Elemental Shaman | SSC | Main Hand | 30095 Fang of the Leviathan (bis) | 30108 Lightfathom Scepter | UNUSABLE |
| Elemental Shaman | TK | Head | 30242 Helm of the Vanquished Champion (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Elemental Shaman | TK | Trinket | 30626 Sextant of Unstable Currents (bis) | dropped, already under SSC / Trinket | WRONG_RAID |
| Elemental Shaman | Hyjal | Two-Hand | 30910 Tempest of Chaos (bis) | 30908 Apostle of Argus | UNUSABLE + WRONG_SLOT |
| Elemental Shaman | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | dropped, already under SWP / Trinket | WRONG_RAID |
| Elemental Shaman | ZA | Two-Hand | 33354 Wub's Cursed Hexblade (alt) | moved to ZA / Main Hand | WRONG_SLOT |
| Enhancement Shaman | Kara | Shoulder | 28631 Dragon-Quake Shoulderguards (bis) | 28589 Beastmaw Pauldrons | ROLE_MISFIT |
| Enhancement Shaman | Kara | Chest | 29754 Chestguard of the Fallen Champion (bis) | dropped, already under Mag / Chest | WRONG_RAID |
| Enhancement Shaman | Kara | Wrist | 28503 Whirlwind Bracers (bis) | 28454 Stalker's War Bands | ROLE_MISFIT |
| Enhancement Shaman | Kara | Waist | 28567 Belt of Gale Force (bis) | 28656 Girdle of the Prowler | ROLE_MISFIT |
| Enhancement Shaman | Kara | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Enhancement Shaman | Kara | One-Hand | 28729 Spiteblade (bis) | 28657 Fool's Bane | UNUSABLE (hand pick) |
| Enhancement Shaman | Gruul | Hands | 28824 Gauntlets of Martial Perfection (alt) | 28827 Gauntlets of the Dragonslayer | UNUSABLE (comment) |
| Enhancement Shaman | Mag | Back | 28797 Brute Cloak of the Ogre-Magi (alt) | 28777 Cloak of the Pit Stalker | ROLE_MISFIT + WRONG_RAID (comment) |
| Enhancement Shaman | SSC | Back | 29994 Thalassian Wildercloak (bis) | moved to TK / Back | WRONG_RAID |
| Enhancement Shaman | SSC | Chest | 30236 Chestguard of the Vanquished Champion (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Enhancement Shaman | SSC | Wrist | 29966 Vambraces of Ending (bis) | moved to TK / Wrist | WRONG_RAID |
| Enhancement Shaman | SSC | Legs | 29995 Leggings of Murderous Intent (bis) | moved to TK / Legs | WRONG_RAID |
| Enhancement Shaman | SSC | Finger | 29997 Band of the Ranger-General (bis) | moved to TK / Finger | WRONG_RAID |
| Enhancement Shaman | SSC | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Enhancement Shaman | SSC | Main Hand | 30082 Talon of Azshara (bis) | 30103 Fang of Vashj | UNUSABLE |
| Enhancement Shaman | SSC | Off Hand | 29996 Rod of the Sun King (bis) | moved to TK / Main Hand | WRONG_RAID |
| Enhancement Shaman | TK | Head | 30242 Helm of the Vanquished Champion (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Enhancement Shaman | TK | Trinket | 30627 Tsunami Talisman (bis) | moved to SSC / Trinket | WRONG_RAID |
| Enhancement Shaman | Hyjal | Shoulder | 30880 Quickstrider Moccasins (bis) | 30917 Razorfury Mantle | WRONG_SLOT (comment) |
| Enhancement Shaman | BT | Waist | 32256 Waistwrap of Infinity (bis) | 32346 Boneweave Girdle | ROLE_MISFIT |
| Enhancement Shaman | BT | Finger | 32261 Band of the Abyssal Lord (alt) | 32266 Ring of Deceitful Intent | ROLE_MISFIT (comment) |
| Enhancement Shaman | BT | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Enhancement Shaman | ZA | Main Hand | 33214 Akil'zon's Talonblade (alt) | 33389 Dagger of Bad Mojo | UNUSABLE (hand pick) |
| Enhancement Shaman | ZA | Off Hand | 33214 Akil'zon's Talonblade (alt) | 33640 Fury | UNUSABLE |
| Enhancement Shaman | SWP | Off Hand | 34203 Grip of Mannoroth (bis) | moved to SWP / Hands | WRONG_SLOT |
| Restoration Druid | Kara | Chest | 28735 Earthblood Chestguard (bis) | 28600 Stonebough Jerkin | UNUSABLE |
| Restoration Druid | Kara | Legs | 28740 Rip-Flayer Leggings (bis) | 28591 Earthsoul Leggings | UNUSABLE |
| Restoration Druid | Kara | Trinket | 28568 Idol of the Avian Heart (bis) | dropped, already under Kara / Relic | WRONG_SLOT |
| Restoration Druid | SSC | Shoulder | 30249 Pauldrons of the Vanquished Defender (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Restoration Druid | SSC | Chest | 30237 Chestguard of the Vanquished Defender (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Restoration Druid | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Restoration Druid | SSC | Main Hand | 30095 Fang of the Leviathan (bis) | 30108 Lightfathom Scepter | UNUSABLE |
| Restoration Druid | SSC | Relic | 28568 Idol of the Avian Heart (bis) | dropped, already under Kara / Relic | WRONG_RAID |
| Restoration Druid | TK | Head | 30243 Helm of the Vanquished Defender (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Restoration Druid | TK | Off Hand | 30049 Fathomstone (alt) | dropped, already under SSC / Off Hand | WRONG_RAID |
| Restoration Druid | Hyjal | Main Hand | 30891 Black Featherlight Boots (bis) | 30918 Hammer of Atonement | ROLE_MISFIT + WRONG_SLOT |
| Restoration Druid | BT | Wrist | 32516 Wraps of Purification (bis) | moved to SSC / Wrist | WRONG_RAID |
| Restoration Druid | BT | Waist | 32528 Blessed Band of Karabor (bis) | dropped, already under BT / Finger | WRONG_SLOT |
| Restoration Druid | BT | Feet | 32517 The Wavemender's Mantle (bis) | 32352 Naturewarden's Treads | UNUSABLE + WRONG_SLOT |
| Restoration Druid | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | moved to SWP / Trinket | WRONG_RAID |
| Feral Druid | Kara | Shoulder | 28631 Dragon-Quake Shoulderguards (bis) | 28755 Bladed Shoulderpads of the Merciless | UNUSABLE |
| Feral Druid | Kara | Chest | 29753 Chestguard of the Fallen Defender (bis) | dropped, already under Mag / Chest | WRONG_RAID |
| Feral Druid | Kara | Wrist | 28453 Bracers of the White Stag (bis) | 28514 Bracers of Maliciousness | ROLE_MISFIT |
| Feral Druid | Kara | Waist | 28656 Girdle of the Prowler (bis) | 28750 Girdle of Treachery | UNUSABLE |
| Feral Druid | Gruul | Hands | 28827 Gauntlets of the Dragonslayer (bis) | removed | UNUSABLE |
| Feral Druid | Gruul | Two-Hand | 28794 Axe of the Gronn Lords (bis) | 28800 Hammer of the Naaru | UNUSABLE |
| Feral Druid | Mag | Back | 28797 Brute Cloak of the Ogre-Magi (alt) | 28777 Cloak of the Pit Stalker | ROLE_MISFIT + WRONG_RAID (comment) |
| Feral Druid | SSC | Back | 29994 Thalassian Wildercloak (bis) | moved to TK / Back | WRONG_RAID |
| Feral Druid | SSC | Wrist | 29966 Vambraces of Ending (bis) | moved to TK / Wrist | WRONG_RAID |
| Feral Druid | SSC | Legs | 29995 Leggings of Murderous Intent (bis) | moved to TK / Legs | WRONG_RAID |
| Feral Druid | SSC | Feet | 30104 Cobra-Lash Boots (bis) | 30060 Boots of Effortless Striking | UNUSABLE |
| Feral Druid | SSC | Finger | 29997 Band of the Ranger-General (bis) | moved to TK / Finger | WRONG_RAID |
| Feral Druid | SSC | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Feral Druid | SSC | Two-Hand | 30020 Fire-Cord of the Magus (bis) | 30090 World Breaker | ROLE_MISFIT + WRONG_RAID + WRONG_SLOT |
| Feral Druid | TK | Head | 30243 Helm of the Vanquished Defender (bis) | moved to SSC / Head | WRONG_RAID |
| Feral Druid | TK | Trinket | 30627 Tsunami Talisman (bis) | moved to SSC / Trinket | WRONG_RAID |
| Feral Druid | Hyjal | Shoulder | 30880 Quickstrider Moccasins (alt) | 30917 Razorfury Mantle | UNUSABLE + WRONG_SLOT (comment) |
| Feral Druid | BT | Waist | 32256 Waistwrap of Infinity (bis) | 32265 Shadow-walker's Cord | ROLE_MISFIT |
| Feral Druid | BT | Feet | 32510 Softstep Boots of Tracking (bis) | 32366 Shadowmaster's Boots | UNUSABLE (comment) |
| Feral Druid | BT | Finger | 32261 Band of the Abyssal Lord (alt) | 32266 Ring of Deceitful Intent | ROLE_MISFIT (comment) |
| Feral Druid | BT | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Feral Druid | SWP | Two-Hand | 34247 Apolyon, the Soul-Render (bis) | 34198 Stanchion of Primal Instinct | UNUSABLE |
| Guardian Druid | Kara | Shoulder | 28631 Dragon-Quake Shoulderguards (bis) | 28755 Bladed Shoulderpads of the Merciless | UNUSABLE |
| Guardian Druid | Kara | Chest | 29753 Chestguard of the Fallen Defender (bis) | dropped, already under Mag / Chest | WRONG_RAID |
| Guardian Druid | Kara | Wrist | 28453 Bracers of the White Stag (bis) | 28514 Bracers of Maliciousness | ROLE_MISFIT |
| Guardian Druid | Kara | Waist | 28656 Girdle of the Prowler (bis) | 28750 Girdle of Treachery | UNUSABLE |
| Guardian Druid | Gruul | Hands | 28827 Gauntlets of the Dragonslayer (bis) | removed | UNUSABLE |
| Guardian Druid | Gruul | Two-Hand | 28794 Axe of the Gronn Lords (bis) | 28800 Hammer of the Naaru | UNUSABLE |
| Guardian Druid | Mag | Back | 28797 Brute Cloak of the Ogre-Magi (alt) | 28777 Cloak of the Pit Stalker | ROLE_MISFIT + WRONG_RAID (comment) |
| Guardian Druid | SSC | Back | 29994 Thalassian Wildercloak (bis) | moved to TK / Back | WRONG_RAID |
| Guardian Druid | SSC | Wrist | 29966 Vambraces of Ending (bis) | moved to TK / Wrist | WRONG_RAID |
| Guardian Druid | SSC | Legs | 29995 Leggings of Murderous Intent (bis) | moved to TK / Legs | WRONG_RAID |
| Guardian Druid | SSC | Feet | 30104 Cobra-Lash Boots (bis) | 30060 Boots of Effortless Striking | UNUSABLE |
| Guardian Druid | SSC | Finger | 29997 Band of the Ranger-General (bis) | moved to TK / Finger | WRONG_RAID |
| Guardian Druid | SSC | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Guardian Druid | SSC | Two-Hand | 30020 Fire-Cord of the Magus (bis) | 30021 Wildfury Greatstaff | ROLE_MISFIT + WRONG_RAID + WRONG_SLOT (hand pick) |
| Guardian Druid | TK | Head | 30243 Helm of the Vanquished Defender (bis) | moved to SSC / Head | WRONG_RAID |
| Guardian Druid | TK | Trinket | 30627 Tsunami Talisman (bis) | moved to SSC / Trinket | WRONG_RAID |
| Guardian Druid | Hyjal | Shoulder | 30880 Quickstrider Moccasins (alt) | 30917 Razorfury Mantle | UNUSABLE + WRONG_SLOT (comment) |
| Guardian Druid | BT | Waist | 32256 Waistwrap of Infinity (bis) | 32265 Shadow-walker's Cord | ROLE_MISFIT |
| Guardian Druid | BT | Feet | 32510 Softstep Boots of Tracking (bis) | 32366 Shadowmaster's Boots | UNUSABLE (comment) |
| Guardian Druid | BT | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Guardian Druid | SWP | Two-Hand | 34247 Apolyon, the Soul-Render (bis) | 34198 Stanchion of Primal Instinct | UNUSABLE |
| Balance Druid | Kara | Chest | 29753 Chestguard of the Fallen Defender (bis) | dropped, already under Mag / Chest | WRONG_RAID |
| Balance Druid | Kara | Legs | 28740 Rip-Flayer Leggings (bis) | 28591 Earthsoul Leggings | UNUSABLE |
| Balance Druid | Gruul | Trinket | 28830 Dragonspine Trophy (alt) | 28823 Eye of Gruul | ROLE_MISFIT |
| Balance Druid | SSC | Shoulder | 30249 Pauldrons of the Vanquished Defender (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Balance Druid | SSC | Back | 29992 Royal Cloak of the Sunstriders (bis) | moved to TK / Back | WRONG_RAID |
| Balance Druid | SSC | Chest | 30237 Chestguard of the Vanquished Defender (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Balance Druid | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Balance Druid | SSC | Finger | 29922 Band of Al'ar (alt) | moved to TK / Finger | WRONG_RAID |
| Balance Druid | SSC | Main Hand | 30095 Fang of the Leviathan (bis) | 30108 Lightfathom Scepter | UNUSABLE |
| Balance Druid | TK | Head | 30243 Helm of the Vanquished Defender (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Balance Druid | TK | Trinket | 30626 Sextant of Unstable Currents (bis) | dropped, already under SSC / Trinket | WRONG_RAID |
| Balance Druid | Hyjal | Two-Hand | 30910 Tempest of Chaos (bis) | 30908 Apostle of Argus | UNUSABLE + WRONG_SLOT |
| Balance Druid | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | dropped, already under SWP / Trinket | WRONG_RAID |
| Balance Druid | ZA | Two-Hand | 33354 Wub's Cursed Hexblade (alt) | moved to ZA / Main Hand | WRONG_SLOT |
| Protection Warrior | Kara | Chest | 28746 Fiend Slayer Boots (bis) | moved to Kara / Feet | WRONG_SLOT |
| Protection Warrior | Kara | Trinket | 28789 Eye of Magtheridon (alt) | moved to Mag / Trinket | WRONG_RAID |
| Protection Warrior | Kara | Off Hand | 28825 Aldori Legacy Defender (bis) | dropped, already under Gruul / Off Hand | WRONG_RAID |
| Protection Warrior | SSC | Shoulder | 30249 Pauldrons of the Vanquished Defender (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Protection Warrior | SSC | Back | 30084 Pauldrons of the Argent Sentinel (bis) | 30098 Razor-Scale Battlecloak | WRONG_SLOT |
| Protection Warrior | SSC | Chest | 30237 Chestguard of the Vanquished Defender (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Protection Warrior | TK | Head | 30243 Helm of the Vanquished Defender (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Protection Warrior | TK | Trinket | 30629 Scarab of Displacement (bis) | dropped, already under SSC / Trinket | WRONG_RAID |
| Protection Warrior | TK | Main Hand | 30058 Mallet of the Tides (alt) | dropped, already under SSC / Main Hand | WRONG_RAID |
| Protection Warrior | Hyjal | Shoulder | 30894 Blue Suede Shoes (alt) | 30866 Blood-stained Pauldrons | WRONG_SLOT |
| Protection Warrior | BT | Wrist | 32515 Wristguards of Determination (bis) | moved to TK / Wrist | WRONG_RAID |
| Protection Warrior | BT | Waist | 32232 Eternium Shell Bracers (bis) | moved to BT / Wrist | WRONG_SLOT |
| Protection Warrior | ZA | Off Hand | 33463 Hood of the Third Eye (alt) | 33326 Bulwark of the Amani Empire | WRONG_SLOT (hand pick) |
| Protection Warrior | SWP | Shoulder | 34164 Dragonscale-Encrusted Longblade (bis) | moved to SWP / Main Hand | WRONG_SLOT |
| Arms/Fury Warrior | Kara | Shoulder | 28631 Dragon-Quake Shoulderguards (bis) | 28755 Bladed Shoulderpads of the Merciless | ROLE_MISFIT |
| Arms/Fury Warrior | Kara | Chest | 28746 Fiend Slayer Boots (bis) | moved to Kara / Feet | WRONG_SLOT |
| Arms/Fury Warrior | Kara | Wrist | 28502 Vambraces of Courage (bis) | 28514 Bracers of Maliciousness | ROLE_MISFIT |
| Arms/Fury Warrior | Kara | Hands | 28505 Gauntlets of Renewed Hope (bis) | 29758 Gloves of the Fallen Defender | ROLE_MISFIT (hand pick) |
| Arms/Fury Warrior | Kara | Waist | 28566 Crimson Girdle of the Indomitable (bis) | 28656 Girdle of the Prowler | ROLE_MISFIT |
| Arms/Fury Warrior | Kara | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Arms/Fury Warrior | SSC | Chest | 30237 Chestguard of the Vanquished Defender (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Arms/Fury Warrior | SSC | Legs | 29995 Leggings of Murderous Intent (bis) | moved to TK / Legs | WRONG_RAID |
| Arms/Fury Warrior | SSC | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Arms/Fury Warrior | SSC | Two-Hand | 29993 Twinblade of the Phoenix (bis) | moved to TK / Two-Hand | WRONG_RAID |
| Arms/Fury Warrior | TK | Head | 30243 Helm of the Vanquished Defender (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Arms/Fury Warrior | TK | Trinket | 30627 Tsunami Talisman (bis) | moved to SSC / Trinket | WRONG_RAID |
| Arms/Fury Warrior | Hyjal | Two-Hand | 30910 Tempest of Chaos (bis) | 30902 Cataclysm's Edge | ROLE_MISFIT + WRONG_SLOT (comment) |
| Arms/Fury Warrior | Hyjal | Shoulder | 30884 Hatefury Mantle (alt) | 30866 Blood-stained Pauldrons | ROLE_MISFIT |
| Arms/Fury Warrior | BT | Waist | 32232 Eternium Shell Bracers (bis) | 32606 Girdle of the Lightbearer | ROLE_MISFIT + WRONG_SLOT |
| Arms/Fury Warrior | BT | Finger | 32261 Band of the Abyssal Lord (alt) | 32266 Ring of Deceitful Intent | ROLE_MISFIT (comment) |
| Arms/Fury Warrior | BT | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Holy/Disc Priest | Kara | Trinket | 28528 Moroes' Lucky Pocket Watch (alt) | 28590 Ribbon of Sacrifice | ROLE_MISFIT |
| Holy/Disc Priest | SSC | Shoulder | 30249 Pauldrons of the Vanquished Defender (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Holy/Disc Priest | SSC | Chest | 30237 Chestguard of the Vanquished Defender (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Holy/Disc Priest | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Holy/Disc Priest | SSC | Trinket | 30664 Living Root of the Wildheart (bis) | 30665 Earring of Soulful Meditation | UNUSABLE |
| Holy/Disc Priest | SSC | Main Hand | 30095 Fang of the Leviathan (bis) | 30108 Lightfathom Scepter | UNUSABLE |
| Holy/Disc Priest | SSC | Ranged | 29982 Wand of the Forgotten Star (bis) | moved to TK / Ranged | WRONG_RAID |
| Holy/Disc Priest | TK | Head | 30243 Helm of the Vanquished Defender (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Holy/Disc Priest | TK | Trinket | 30664 Living Root of the Wildheart (bis) | removed | UNUSABLE + WRONG_RAID (hand pick) |
| Holy/Disc Priest | Hyjal | Main Hand | 30891 Black Featherlight Boots (bis) | 30918 Hammer of Atonement | UNUSABLE + WRONG_SLOT |
| Holy/Disc Priest | BT | Wrist | 32516 Wraps of Purification (bis) | moved to SSC / Wrist | WRONG_RAID |
| Holy/Disc Priest | BT | Waist | 32528 Blessed Band of Karabor (bis) | dropped, already under BT / Finger | WRONG_SLOT |
| Holy/Disc Priest | BT | Feet | 32517 The Wavemender's Mantle (bis) | 32239 Slippers of the Seacaller | UNUSABLE + WRONG_SLOT |
| Holy/Disc Priest | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | moved to SWP / Trinket | WRONG_RAID |
| Holy/Disc Priest | BT | Ranged | 32374 Zhar'doom, Greatstaff of the Devourer (bis) | 32343 Wand of Prismatic Focus | WRONG_SLOT (comment) |
| Shadow Priest | Kara | Trinket | 28789 Eye of Magtheridon (bis) | dropped, already under Mag / Trinket | WRONG_RAID |
| Shadow Priest | Gruul | Trinket | 28830 Dragonspine Trophy (alt) | 28823 Eye of Gruul | ROLE_MISFIT |
| Shadow Priest | SSC | Shoulder | 30249 Pauldrons of the Vanquished Defender (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Shadow Priest | SSC | Back | 29992 Royal Cloak of the Sunstriders (bis) | moved to TK / Back | WRONG_RAID |
| Shadow Priest | SSC | Chest | 30237 Chestguard of the Vanquished Defender (alt) | dropped, already under TK / Chest | WRONG_RAID |
| Shadow Priest | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Shadow Priest | SSC | Finger | 29922 Band of Al'ar (alt) | moved to TK / Finger | WRONG_RAID |
| Shadow Priest | SSC | Main Hand | 30095 Fang of the Leviathan (bis) | 30108 Lightfathom Scepter | UNUSABLE |
| Shadow Priest | SSC | Ranged | 29982 Wand of the Forgotten Star (bis) | moved to TK / Ranged | WRONG_RAID |
| Shadow Priest | TK | Head | 30243 Helm of the Vanquished Defender (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Shadow Priest | TK | Trinket | 30626 Sextant of Unstable Currents (bis) | dropped, already under SSC / Trinket | WRONG_RAID |
| Shadow Priest | Hyjal | Two-Hand | 30910 Tempest of Chaos (bis) | 30908 Apostle of Argus | UNUSABLE + WRONG_SLOT |
| Shadow Priest | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | dropped, already under SWP / Trinket | WRONG_RAID |
| Shadow Priest | BT | Ranged | 32348 Soul Cleaver (bis) | 32343 Wand of Prismatic Focus | UNUSABLE + WRONG_SLOT (comment) |
| Shadow Priest | ZA | Two-Hand | 33354 Wub's Cursed Hexblade (alt) | moved to ZA / Main Hand | WRONG_SLOT |
| Mage | Gruul | Trinket | 28830 Dragonspine Trophy (bis) | 28823 Eye of Gruul | ROLE_MISFIT |
| Mage | Gruul | Finger | 28823 Eye of Gruul (alt) | moved to Gruul / Trinket | WRONG_SLOT |
| Mage | Mag | Ranged | 28782 Crystalheart Pulse-Staff (bis) | 28783 Eredar Wand of Obliteration | WRONG_SLOT (comment) |
| Mage | SSC | Back | 28766 Ruby Drape of the Mysticant (bis) | dropped, already under Kara / Back | WRONG_RAID |
| Mage | SSC | Back | 29992 Royal Cloak of the Sunstriders (alt) | moved to TK / Back | WRONG_RAID |
| Mage | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Mage | SSC | Wrist | 28515 Bands of Nefarious Deeds (alt) | dropped, already under Kara / Wrist | WRONG_RAID |
| Mage | SSC | Legs | 30246 Leggings of the Vanquished Defender (bis) | 30247 Leggings of the Vanquished Hero | UNUSABLE (comment) |
| Mage | SSC | Feet | 28585 Ruby Slippers (alt) | moved to Kara / Feet | WRONG_RAID |
| Mage | SSC | Finger | 29922 Band of Al'ar (alt) | moved to TK / Finger | WRONG_RAID |
| Mage | TK | Trinket | 30626 Sextant of Unstable Currents (bis) | dropped, already under SSC / Trinket | WRONG_RAID |
| Mage | Hyjal | Two-Hand | 30910 Tempest of Chaos (bis) | moved to Hyjal / Main Hand | WRONG_SLOT |
| Mage | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | dropped, already under SWP / Trinket | WRONG_RAID |
| Mage | BT | Ranged | 32348 Soul Cleaver (bis) | 32343 Wand of Prismatic Focus | UNUSABLE + WRONG_SLOT (comment) |
| Mage | ZA | Two-Hand | 33354 Wub's Cursed Hexblade (alt) | moved to ZA / Main Hand | WRONG_SLOT |
| Hunter | Kara | Shoulder | 28631 Dragon-Quake Shoulderguards (bis) | 28589 Beastmaw Pauldrons | ROLE_MISFIT |
| Hunter | Kara | Chest | 28621 Wrynn Dynasty Greaves (bis) | 28599 Scaled Breastplate of Carnage | UNUSABLE + WRONG_SLOT |
| Hunter | Kara | Waist | 28567 Belt of Gale Force (bis) | 28656 Girdle of the Prowler | ROLE_MISFIT |
| Hunter | Kara | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Hunter | Gruul | Finger | 28823 Eye of Gruul (alt) | removed | ROLE_MISFIT + WRONG_SLOT |
| Hunter | Mag | Back | 28797 Brute Cloak of the Ogre-Magi (alt) | 28777 Cloak of the Pit Stalker | ROLE_MISFIT + WRONG_RAID (comment) |
| Hunter | SSC | Shoulder | 30250 Pauldrons of the Vanquished Hero (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Hunter | SSC | Back | 29994 Thalassian Wildercloak (bis) | moved to TK / Back | WRONG_RAID |
| Hunter | SSC | Chest | 30238 Chestguard of the Vanquished Hero (bis) | dropped, already under TK / Chest | WRONG_RAID |
| Hunter | SSC | Wrist | 29966 Vambraces of Ending (bis) | moved to TK / Wrist | WRONG_RAID |
| Hunter | SSC | Legs | 29995 Leggings of Murderous Intent (bis) | moved to TK / Legs | WRONG_RAID |
| Hunter | SSC | Finger | 29997 Band of the Ranger-General (bis) | moved to TK / Finger | WRONG_RAID |
| Hunter | SSC | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Hunter | SSC | Main Hand | 32944 Talon of the Phoenix (bis) | moved to TK / Main Hand | WRONG_RAID |
| Hunter | SSC | Off Hand | 29948 Claw of the Phoenix (bis) | moved to TK / Off Hand | WRONG_RAID |
| Hunter | TK | Head | 30244 Helm of the Vanquished Hero (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Hunter | TK | Trinket | 30627 Tsunami Talisman (bis) | moved to SSC / Trinket | WRONG_RAID |
| Hunter | Hyjal | Shoulder | 30880 Quickstrider Moccasins (alt) | 30917 Razorfury Mantle | WRONG_SLOT (comment) |
| Hunter | BT | Waist | 32256 Waistwrap of Infinity (bis) | 32346 Boneweave Girdle | ROLE_MISFIT |
| Hunter | BT | Finger | 32261 Band of the Abyssal Lord (alt) | 32266 Ring of Deceitful Intent | ROLE_MISFIT (comment) |
| Hunter | BT | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Hunter | BT | Main Hand | 32945 Fist of Molten Fury (bis) | moved to Hyjal / Main Hand | WRONG_RAID |
| Hunter | BT | Off Hand | 32946 Claw of Molten Fury (bis) | moved to Hyjal / Off Hand | WRONG_RAID |
| Hunter | ZA | Back | 33592 Cloak of Ancient Rituals (alt) | removed | ROLE_MISFIT |
| Warlock | Kara | Trinket | 28789 Eye of Magtheridon (bis) | moved to Mag / Trinket | WRONG_RAID |
| Warlock | Mag | Ranged | 28782 Crystalheart Pulse-Staff (bis) | 28783 Eredar Wand of Obliteration | WRONG_SLOT (comment) |
| Warlock | SSC | Back | 28766 Ruby Drape of the Mysticant (bis) | dropped, already under Kara / Back | WRONG_RAID |
| Warlock | SSC | Chest | 30238 Chestguard of the Vanquished Hero (alt) | dropped, already under TK / Chest | WRONG_RAID |
| Warlock | SSC | Wrist | 29918 Mindstorm Wristbands (bis) | moved to TK / Wrist | WRONG_RAID |
| Warlock | SSC | Wrist | 30684 Ravager's Cuffs (alt) | moved to Kara / Wrist | WRONG_RAID |
| Warlock | SSC | Ranged | 29982 Wand of the Forgotten Star (bis) | moved to TK / Ranged | WRONG_RAID |
| Warlock | TK | Head | 30244 Helm of the Vanquished Hero (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Warlock | TK | Trinket | 30626 Sextant of Unstable Currents (bis) | moved to SSC / Trinket | WRONG_RAID |
| Warlock | Hyjal | Two-Hand | 30910 Tempest of Chaos (bis) | moved to Hyjal / Main Hand | WRONG_SLOT |
| Warlock | BT | Trinket | 34429 Shifting Naaru Sliver (alt) | dropped, already under SWP / Trinket | WRONG_RAID |
| Warlock | BT | Ranged | 32348 Soul Cleaver (bis) | 32343 Wand of Prismatic Focus | UNUSABLE + WRONG_SLOT (comment) |
| Warlock | ZA | Two-Hand | 33354 Wub's Cursed Hexblade (alt) | moved to ZA / Main Hand | WRONG_SLOT |
| Rogue | Kara | Chest | 28746 Fiend Slayer Boots (bis) | 28601 Chestguard of the Conniver | UNUSABLE + WRONG_SLOT |
| Rogue | Kara | Wrist | 28453 Bracers of the White Stag (bis) | 28514 Bracers of Maliciousness | ROLE_MISFIT |
| Rogue | Kara | Waist | 28656 Girdle of the Prowler (bis) | 28750 Girdle of Treachery | UNUSABLE |
| Rogue | Kara | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Rogue | Mag | Back | 28797 Brute Cloak of the Ogre-Magi (alt) | 28777 Cloak of the Pit Stalker | ROLE_MISFIT + WRONG_RAID (comment) |
| Rogue | SSC | Shoulder | 30248 Pauldrons of the Vanquished Champion (bis) | dropped, already under TK / Shoulder | WRONG_RAID |
| Rogue | SSC | Back | 28672 Drape of the Dark Reavers (bis) | dropped, already under Kara / Back | WRONG_RAID |
| Rogue | SSC | Chest | 30236 Chestguard of the Vanquished Champion (alt) | dropped, already under TK / Chest | WRONG_RAID |
| Rogue | SSC | Wrist | 29966 Vambraces of Ending (bis) | moved to TK / Wrist | WRONG_RAID |
| Rogue | SSC | Feet | 28545 Edgewalker Longboots (bis) | dropped, already under Kara / Feet | WRONG_RAID |
| Rogue | SSC | Finger | 29997 Band of the Ranger-General (bis) | moved to TK / Finger | WRONG_RAID |
| Rogue | SSC | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |
| Rogue | SSC | Trinket | 30450 Warp-Spring Coil (bis) | moved to TK / Trinket | WRONG_RAID |
| Rogue | SSC | Ranged | 29949 Arcanite Steam-Pistol (bis) | moved to TK / Ranged | WRONG_RAID |
| Rogue | TK | Head | 30242 Helm of the Vanquished Champion (bis) | dropped, already under SSC / Head | WRONG_RAID |
| Rogue | TK | Trinket | 30627 Tsunami Talisman (bis) | moved to SSC / Trinket | WRONG_RAID |
| Rogue | Hyjal | Shoulder | 30880 Quickstrider Moccasins (alt) | 30917 Razorfury Mantle | UNUSABLE + WRONG_SLOT (comment) |
| Rogue | BT | Waist | 32256 Waistwrap of Infinity (bis) | 32265 Shadow-walker's Cord | ROLE_MISFIT |
| Rogue | BT | Feet | 32510 Softstep Boots of Tracking (bis) | 32366 Shadowmaster's Boots | UNUSABLE (comment) |
| Rogue | BT | Finger | 32261 Band of the Abyssal Lord (alt) | 32266 Ring of Deceitful Intent | ROLE_MISFIT (comment) |
| Rogue | BT | Trinket | 28830 Dragonspine Trophy (bis) | dropped, already under Gruul / Trinket | WRONG_RAID |

