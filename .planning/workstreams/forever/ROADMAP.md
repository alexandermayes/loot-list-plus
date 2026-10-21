# Roadmap: LootList+ v2.0 WoW Forever Loot: Discovery to Known

**Workstream:** forever (this workstream's phase numbering starts at Phase 1; the default and design-system workstreams keep their own numbering)
**Milestone:** v2.0
**Requirements:** `.planning/workstreams/forever/REQUIREMENTS.md` (44 v1 requirements)
**Brief:** `.planning/workstreams/forever/MILESTONE-BRIEF.md`
**Research:** `.planning/research/SUMMARY.md` (owner defaults in its "Decisions Needed" list are applied unless overridden)

## Hard Dates

| Date | Gate | Phases complete by then |
|------|------|-------------------------|
| 2026-10-31 | Discovery lists usable | 1, 2, 3, 4 |
| 2026-11-04 | Forever worldwide launch (context: new guilds arrive mid-Phase 5) | none |
| 2026-11-30 | Drop Desk live | 5, 6, 7 |
| 2026-12-09 | Forever raids open | Phase 8 cuts are targeted around this date (see Phase 8) |

## Hard Constraints (apply to every phase)

1. **Schema before code.** Migrations auto-deploy about 12 seconds after merge with no CI on the SQL. Every schema change is expand-only, ships as its own migration-only PR (`--admin` merge, on a non-raid day, with local `db reset` evidence), and is live before any code PR that reads it. Every new table gets a raider, officer, non-member and ex-member RLS matrix, because RLS gaps return empty lists instead of errors.
2. **Copy.** The owner signs off user-facing copy before it ships. No em dashes in any user-facing text.
3. **Privacy.** No player or guild names in analytics or published data. New PostHog events carry ids and counts only.
4. **Known guilds stay byte-identical.** Loot Score golden fixtures (`LOOT_SCORE_FIXTURES`, `engine-contracts.test.ts`) and the Lua fixtures do not change for any item-mode input. New score components default to zero.
5. **No live game-data fetches, no dependency on Forever loot.** No runtime or test code calls wago.tools or Wowhead live. Nothing in Phases 1 to 7 needs Forever loot data to exist; unknown bosses and unknown items are supported from the start.
6. **Web path stands alone.** The in-game addon lives in a separate repo (`alexandermayes/loot-list-plus-addon`) and is an accelerator, never a dependency. Master loot on Forever is unconfirmed.
7. **Surface sweep.** Launching Discovery lists (Phase 4) and the free Drop Desk (Phase 7) are feature changes, so each triggers the full surface sweep (site, schema, Discord, GitHub, legal, external posts).

## Overview

Forever hides item stats until an item drops, so named loot lists cannot exist when raids open on Dec 9. This milestone gives Forever guilds a loot path that works with no item data. It starts by fixing the existing award, BLP, link and analytics defects and, in parallel, putting expansion onboarding on a manifest keyed by `wowhead_id`, which gives Forever its raids and bosses. The Discovery schema then ships on its own, ahead of the code that reads it: need rows become ordinary `loot_items` rows that every existing reader handles and that earn BLP. On top of that, raiders get a one-minute need picker and a score split into standing and interest, which meets the Oct 31 date. The Drop Desk follows in two steps. First an officer can settle any drop from the browser correctly and exactly once. Then the raid joins in live: interest responses, one Discord thread per night with a reason on every award, council cards and undo. A rehearsal on a real past raid log and the owner's copy sign-off gate the Nov 30 date. The simplicity audit starts on Oct 26; its cuts ship only after the Desk is stable.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): planned milestone work
- Decimal phases (2.1, 2.2): urgent insertions (marked with INSERTED)

- [x] **Phase 1: Forever Defect and Privacy Fixes** - Awards, BLP, item links and analytics are correct and private before any Forever loot is announced (runs in parallel with Phase 2) (completed 2026-10-13)
- [x] **Phase 2: Expansion Onboarding Manifest** - Forever gets its raids and bosses from a verified manifest keyed by `wowhead_id`, and every expansion seeds through one registry (runs in parallel with Phase 1) (completed 2026-10-19)
- [ ] **Phase 3: Discovery Schema and Need Pipeline** - A raid tier can run in Discovery mode, with need rows that every existing reader handles and that earn BLP
- [ ] **Phase 4: Discovery Lists and Score Split** - Raiders set their needs in under a minute on a phone and see a score they understand (Oct 31 gate)
- [ ] **Phase 5: Drop Desk Core** - An officer settles any drop from the browser in seconds, correctly and exactly once, with no addon and no master loot
- [ ] **Phase 6: Live Raid Night** - Raiders say who is interested, Discord shows every decision with its reason, and any award can be undone
- [ ] **Phase 7: Rehearsal and Launch Readiness** - The Desk is proven on a real past raid, the copy is signed, and mobile checks pass (Nov 30 gate)
- [ ] **Phase 8: Simplicity Pass** - Every surface is cut down to what guilds use, without losing a power feature (audit from Oct 26, cuts after Nov 30)

## Phase Details

### Phase 1: Forever Defect and Privacy Fixes

**Goal**: Officers and raiders can trust every award, BLP number, item link and analytics event before the first Forever award is announced
**Window**: 2026-10-12 to 2026-10-16
**Depends on**: Nothing (first phase)
**Parallel with**: Phase 2. They touch different files; both add modules under `domain/expansion/` (`wowhead.ts` here, the manifest schema in Phase 2), so merge whichever lands second after a rebase.
**Dependency note**: Phase 3 and the Drop Desk build on correct award and BLP writes. Award DELETE and PATCH recompute (FIX-01) is a prerequisite for Desk undo (DESK-07), and Forever links must be correct before any Forever award reaches Discord.
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06
**Success Criteria** (what must be TRUE):

  1. An officer who deletes or edits an award sees bad-luck protection for that item recomputed by the time the request returns
  2. The companion app shows real BLP and item priorities from the addon routes, and a database error reaches the companion as an error instead of an empty list
  3. Pointing an addon or bot route at a table that does not exist fails `npm run typecheck`
  4. In a Forever guild, every item link in loot announcements, the post-raid summary and bot replies opens `wowhead.com/forever/...`, and no bot embed title contains an em dash
  5. An award receipt's audited score snapshot includes donation and raider bonuses, and the `master_loot_awarded` event reports the item and carries no player name

**Plans**: 9/9 plans executed in 3 waves

Plans:
**Wave 1**

- [x] 01-01-PLAN.md (wave 1): awaited BLP recompute on award DELETE and PATCH (FIX-01); receipt keeps donation and raider bonus (FIX-04)
- [x] 01-02-PLAN.md (wave 1): typed service-role client and shared paged reader; companion guild-data reads blp_tracking and guild_item_priorities, pages BLP, priority, item, submission and attendance reads past 1000 rows, and fails loudly on every read, loot_history included (FIX-02, FIX-06)
- [x] 01-03-PLAN.md (wave 1): `domain/expansion/wowhead.ts`; Forever-only links in loot announcements, post-raid summary and reserve Discord copy (FIX-03)
- [x] 01-06-PLAN.md (wave 1): `master_loot_awarded` reports the reviewed list's item ids with no names (null, not 0, on a failed item read); browser analytics drop player and guild names and identify drops email (FIX-05)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-04-PLAN.md (wave 2): bot `/priority` sends `item_url`; bot renders it; bot routes typed (FIX-03, FIX-06)
- [x] 01-07-PLAN.md (wave 2): in-game import string (export-string) reads blp_tracking and guild_item_priorities on the typed client, pages BLP, priority, submission and attendance reads, and fails loudly (FIX-02, FIX-06)
- [x] 01-08-PLAN.md (wave 2): server analytics drop player and guild names; scan guard keeps names and identify email out of every analytics call (FIX-05)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md (wave 3): remaining addon routes on the typed client plus a scan guard (FIX-06)
- [x] 01-09-PLAN.md (wave 3): em-dash-free bot embed titles and `/priority` raider line, gated on owner copy sign-off in its own PR (FIX-03)

**Research**: Standard; skip `--research-phase`. Re-verify each defect against current code before planning, because the defect todo is partly stale (#3 fixed in #322 and can be closed; #1 slot fixed in #290 and #301; #2 items select fixed in #363).
**Defaults applied**: bot `/priority` stays ordered by raw list rank and is labelled "by list rank" (Decision 10). FIX-05 changes what existing PostHog dashboards see on `master_loot_awarded` (Decision 19).

### Phase 2: Expansion Onboarding Manifest

**Goal**: A new Forever guild gets its raids and bosses from a verified manifest keyed by `wowhead_id`, and every expansion, old and new, seeds through one registry
**Window**: 2026-10-13 to 2026-10-21
**Depends on**: Nothing
**Parallel with**: Phase 1 (see the Phase 1 note on `domain/expansion/`).
**Dependency note**: Phase 3 seeds need rows per Forever raid tier, so the Forever tiers must come from the manifest first.
**Requirements**: EXPN-01, EXPN-02, EXPN-03, EXPN-04, EXPN-05, EXPN-06
**Success Criteria** (what must be TRUE):

  1. An officer creating a Forever guild gets Barrow Deeps, Hyjal Summit and Onyxia's Lair with their bosses, and any boss not yet confirmed is visibly marked provisional
  2. Creating a guild in any of the five existing expansions produces byte-identical rows (golden-row snapshot test passes unchanged), and the seeder resolves every expansion through one registry with no display-name if/else chains left
  3. A manifest with a duplicate id, a missing token class, a phase or raid gap, or a name mismatch fails the Vitest gate before merge
  4. Running the Forever catalog sync twice changes nothing the second time, and the sync never deletes or renames a row that a list, award or BLP record points at
  5. wago.tools snapshots are committed with their provenance, and a test fails if any runtime or test code fetches wago.tools or Wowhead live

**Plans**: 13/13 plans executed in 4 waves (revised 2026-10-14 after the plan check: the registry plan and the snapshot plan were each split in two and later plans renumbered; second revision 2026-10-14: raid-icon scoping moved out of 02-11 into its own plan 02-12, merged before PR 3, and plan 02-13 wires the remaining six raid-icon call sites)

Plans:
**Wave 1**

- [x] 02-01-PLAN.md (wave 1): golden-row files for the five legacy expansions, captured from the unmodified seeder (EXPN-03)
- [x] 02-02-PLAN.md (wave 1): owner-vetted zod and csv-parse at exact versions; zod manifest schema and the native Forever manifest with provisional bosses (EXPN-01, EXPN-04, EXPN-06)
- [x] 02-12-PLAN.md (wave 1): raid icons resolve by game, so Forever tiers never show Classic or TBC art; six guild tier surfaces wired; call-site inventory; its own PR, merged before PR 3 (EXPN-01, D-04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md (wave 2): tracer: Forever phases entry, alias lookup, insert-only syncExpansionCatalog and the seeder's Forever branch, so a new Forever guild gets its three tiers (EXPN-01, EXPN-05)
- [x] 02-07-PLAN.md (wave 2): committed wago snapshot placeholder with provenance fields, provisional-boss allowlist ratchet (one reviewed growth exception per D-15) and forced-promotion check (EXPN-06, EXPN-01)
- [x] 02-13-PLAN.md (wave 2): the six remaining raid-icon call sites (reserve run list, run detail, create-run modal, public join page, share card, master sheet tier header) resolve by game; allowlist empty (EXPN-01, D-04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md (wave 3): one client-safe registry plus server-only legacy adapters sharing `data/expansions/types.ts`; display-name chains removed; golden files unchanged; phase coverage through registry slugs (EXPN-02, EXPN-03)
- [x] 02-08-PLAN.md (wave 3): offline wago snapshot library and CLI with retry and backoff under one identifying User-Agent and the owner-confirmed outage-green set (EXPN-06)
- [x] 02-10-PLAN.md (wave 3): owner-run sync:forever admin script, dry run by default, --apply idempotent with duplicate report (EXPN-05)
- [x] 02-11-PLAN.md (wave 3): setup guide lists Forever raids and bosses with Unconfirmed badges in a "Your raids" section after the steps list (copy and placement sign-off in its own PR) (EXPN-01)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-05-PLAN.md (wave 4): registry surface, exact-name guard and client-safety tests; reserve-run Forever 400 pinned (EXPN-02)
- [x] 02-06-PLAN.md (wave 4): Vitest manifest gate: strict native rules, ratcheted legacy exceptions, frozen shipped names, dates-in-data scan (EXPN-04)
- [x] 02-09-PLAN.md (wave 4): no-live-fetch source scan; weekly refresh-wago-snapshot workflow; item-data workflow watches data/expansions (EXPN-06)

**Research**: Light; skip `--research-phase`. Confirm wago CSV headers on the first pull (array columns flatten with `_N` suffixes). wago.tools returned 503 on every probe on 2026-10-12, so the snapshot script needs retry and backoff. Use the corrected seeder line numbers from research (registry at `app/services/expansionSeeder.ts:224-237`, chains at 449 to 462 and 470 to 481), not the brief's.
**Owner input**: Forever boss names for Barrow Deeps and Hyjal by Oct 21 (Decision 26). Until then those bosses ship as provisional.

### Phase 3: Discovery Schema and Need Pipeline

**Goal**: A raid tier can run in Discovery mode, with need rows that flow through every existing reader and earn BLP, while every Known guild stays exactly as it is
**Window**: 2026-10-19 to 2026-10-23
**Depends on**: Phase 1, Phase 2
**Dependency note**: Forever raid tiers must exist (Phase 2) before need rows are seeded per tier. Award and BLP routes are fixed first (Phase 1) so the reader audit starts from correct code. Inside the phase, the migration-only PR deploys before any code PR that reads the new columns. Phase 4 cannot ship reader-dependent code until this phase's migration is live.
**Requirements**: DISC-01, DISC-06, DISC-07, DISC-12
**Success Criteria** (what must be TRUE):

  1. The Discovery migration ships on its own expand-only PR and is live in production before any code that reads it merges; it applies cleanly in a PGlite migration test, and every new table passes a raider, officer, non-member and ex-member RLS matrix
  2. An officer can switch a raid tier to Discovery, and the tier then holds its seeded need rows; every tier that existed before stays Known, and the Loot Score golden fixtures are byte-identical
  3. A need-ranked submission moves through approval, snapshot, master sheet, exports and BLP without being silently dropped or crashing any reader; every reader has a tested mode branch, and addon exports contain item rows only
  4. A raider ranked on a need who attends a raid accrues bad-luck protection for that need before any item for it exists, and recomputing BLP twice gives the same result

**Plans**: 8/19 plans executed in 7 waves, shipped as 4 PRs (PR 1 migration-only, plans 03-01 and 03-15; PR 2 pure need primitives, 03-03 to 03-05; PR 3 need readers after the PR 1 deploy, 03-06 to 03-12 and 03-16 to 03-19; PR 4 seeding and list mode after PR 3 deploys, 03-13 and 03-14, then the owner's `sync:forever` backfill). Plans 03-15 to 03-19 were split out at plan check and keep the next free numbers so no existing plan or threat id changed; waves carry the order.

Plans:
**Wave 1**

- [x] 03-01-PLAN.md (wave 1): Discovery migration (list_mode, kind, need_key, awarded_item_id without an FK yet, loot_item_need_pins with RLS and trigger, kind and need_key column grant, WHEN-gated guard triggers for D-17, D-03 and need rows, the D-22 need-ranking hold, the D-24 Forever name lock, the D-26 tier-move lock and the D-27 need-row delete lock), committed PGlite chain test, regex contract test (DISC-12, DISC-01, DISC-06)
- [x] 03-03-PLAN.md (wave 1): frozen 145-row need taxonomy with fixture gate and aliases, D-23 costs, need-row column mapping, list-mode rules for D-03 and D-17 (DISC-01, DISC-06)
- [x] 03-04-PLAN.md (wave 1): pure need branches: identity key for receive skips, ranked-needs filter, display wowhead id, need copy caps, bracket-rule exemption (DISC-06)
- [x] 03-05-PLAN.md (wave 1): NeedLabel and the hooks-free ItemLink fallback; warn-once need-skip helper (DISC-06)

**Wave 2** *(blocked on 03-01)*

- [x] 03-15-PLAN.md (wave 2): PGlite behaviour proofs: guards as the officer and raider roles with positive controls, constraints, four-role RLS matrix, grants, D-22 hold, need BLP accrual (DISC-12, DISC-07, DISC-01, DISC-06)

**Wave 3** *(blocked on 03-01 and 03-15)*

- [x] 03-02-PLAN.md (wave 3): [BLOCKING] open PR 1, owner merges with `--admin` on a non-raid day, confirm the deploy run, regenerate database types (DISC-12)

**Wave 4** *(blocked on 03-02)*

- [x] 03-06-PLAN.md (wave 4): addon, companion, Gargul and bot exports stay item-only (DISC-06)
- [x] 03-07-PLAN.md (wave 4): raider picker holds needs back behind includeNeeds; BIS and officer item editors exclude or refuse need rows (DISC-06)
- [ ] 03-08-PLAN.md (wave 4): soft-reserve item reads, join and awards exclude needs (DISC-06)
- [ ] 03-09-PLAN.md (wave 4): D-22 hold in the submit route through one pure predicate, plus the need branch for bracket rules and copy caps behind it (DISC-06)
- [ ] 03-10-PLAN.md (wave 4): master sheet and Summary show ranked needs only under "Needs" with identity-keyed skips; Raid Mode guard (DISC-06)
- [ ] 03-11-PLAN.md (wave 4): award history screens and character gear handle need awards (DISC-06)
- [ ] 03-16-PLAN.md (wave 4): no reserve runs on Discovery tiers, Known-only reserve tier list, item-only admin sheet import with its first test (DISC-06)
- [ ] 03-17-PLAN.md (wave 4): approval, snapshot, revert, removal, counts and visibility proven with need-ranked fixtures past the hold (DISC-06)
- [ ] 03-18-PLAN.md (wave 4): need-row tests for the bootstrap, loot-submissions and prio-list routes and the wowhead lookups (DISC-06)
- [ ] 03-19-PLAN.md (wave 4): need awards keyed on the need row with BLP recompute, history-row builders and Discord posts, proven with fixtures past the hold; split from 03-17 per D-28 (DISC-07, DISC-06)

**Wave 5** *(blocked on Wave 4)*

- [ ] 03-12-PLAN.md (wave 5): reader inventory over code, scripts and SQL functions with source markers and need-test citations; 'Needs' boss sentinel test (DISC-06)

**Wave 6**

- [ ] 03-13-PLAN.md (wave 6): need-row seeder; Forever sync creates Discovery tiers with needs and backfills existing Forever tiers, switching before seeding; dry-run report counts (DISC-01, DISC-06)

**Wave 7**

- [ ] 03-14-PLAN.md (wave 7): PATCH /api/raid-tiers list_mode with the tier-to-guild ownership fix, D-03 409 and D-17 guard, switch then seed with compensation; no toggle until Phase 4 (DISC-01)

**Research**: Needs `/gsd-plan-phase 3 --research-phase`. Topics: the reader audit (every reader of `loot_submission_items` and `loot_history`, including BLP SQL, `buildMemberRankedItems`, export, `/priority`, master sheet, `gargul-dft.ts`); BLP keying for need awards (`loot_history.loot_item_id` is the need row, `awarded_item_id` is the real item, recompute SQL unchanged); need key format and stat-family names, settled once.
**Defaults applied**: per-raid-tier need rows with one picker fanning out (owner decision); `list_mode` values `known` and `discovery`; pins in a `loot_item_need_pins` table; stat families keep Healing and Spell damage separate (Decision 2); "Tier piece" off the default picker (Decision 3); separate lists per raid size off (Decision 4); loot-cost columns ship at zero.
**Risk**: Biggest blast radius in the milestone. Between this phase and Phase 4, a Discovery tier has need rows but raiders have no picker yet. Plan-phase decides whether the officer switch is held back until the Phase 4 picker merges. Research gives two cost schemes for need rows: an allocation cost of 1/1/0 by restriction class, and a 10-point budget at Big 3, Medium 2, Standard 1. Settle which one the seeded rows carry here, because Phase 4's budget reads it.

### Phase 4: Discovery Lists and Score Split

**Goal**: A raider in a Discovery guild sets their needs in under a minute on a phone and sees a score they understand, so Forever lists are usable by Oct 31
**Window**: 2026-10-21 to 2026-10-30 (Discovery lists usable gate: 2026-10-31)
**Depends on**: Phase 3
**Dependency note**: Picker and preset UI can start on Oct 21 against the frozen need taxonomy, but code that reads `list_mode`, `kind` or need rows merges only after the Phase 3 migration is live. The standing and interest split is a hard input to the Drop Desk ordering (Phase 5).
**Requirements**: DISC-02, DISC-03, DISC-04, DISC-05, DISC-08, DISC-10, DISC-11
**Success Criteria** (what must be TRUE):

  1. On a phone, a raider in a Discovery guild fills a one-column, five-row need picker (slot, armour class where it matters, stat family) in under 60 seconds, and one save ranks those needs in every Discovery raid tier of the expansion
  2. The raider sees the points budget as one sentence and cannot save a list that goes over it
  3. A raider sees a default list for their spec and can accept it with one "Looks right" tap, and can open the picker straight from a Discord "Set your 5" link
  4. An officer setting up a guild picks one of three loot style presets, with Fine-tune behind a disclosure
  5. Every score shows standing and interest separately, each with a one-sentence explanation, and score totals for Known guilds are unchanged (golden and Lua fixtures byte-identical)

**Plans**: TBD
**UI hint**: yes
**Research**: None needed for the score split (golden fixtures define it). Run `/gsd-ui-phase 4` for the picker and presets.
**Owner inputs**: spec defaults review for all 22 specs, especially Enhancement Shaman (Windfury rework) and Feral, by Oct 26 (Decision 5); copy sign-off for picker, presets and "Set your 5" by Oct 26 (Decision 7); community input for the presets review: a council-style preset that shows attendance, bad luck protection and a future preparation score side by side, and how often raiders may re-rank need rows within a tier.
**Defaults applied**: 10-point budget, Big 3, Medium 2, Standard 1, trinkets Big (Decision 6); standing and interest shown separately (Decision 8). Discovery lists are free.

### Phase 5: Drop Desk Core

**Goal**: An officer settles any drop on raid night from the browser in seconds, correctly and exactly once, with no addon and no master loot
**Window**: 2026-11-02 to 2026-11-16
**Depends on**: Phase 4
**Dependency note**: The Desk reuses the Phase 4 need picker for classification and the standing and interest split for ordering. It also relies on the Phase 3 pin table and Phase 1's award recompute. The first plan extracts the shared candidate ranker from `MasterSheetContent.tsx` with no change to master sheet behaviour. The Desk schema (`loot_drops`, append-only `drop_decisions`, `loot_history.drop_id`, `loot_history.source` allowing `desk`, and the guild-level Desk setting) then ships as its own expand-only PR before any Desk code.
**Requirements**: DESK-01, DESK-02, DESK-03, DESK-05, DESK-06, DESK-08, DESK-11, DESK-12
**Success Criteria** (what must be TRUE):

  1. Once a server-side guild setting turns the Desk on (free for every guild, with no Premium check and no PostHog flag), an officer can record a drop in the browser by pasting an item link or typing a name, even when the boss or the item is unknown, with no addon and no master loot
  2. The officer classifies the drop with the same need picker raiders use; a revealed item can be pinned to its need, and unpinning removes the mapping without changing anyone's BLP credit totals
  3. The officer sees candidates ordered by response (main spec, then off spec, then pass or absent), then total, then standing, each with a one-sentence verdict, and the master sheet's ordering is unchanged
  4. The officer can award, send to council with a reason, or mark disenchanted. The award, its decision record and the BLP recompute land together or not at all, a repeated click never awards twice, and a second officer acting on the same drop sees who claimed it
  5. An addon award for an item the guild has no row for lands in the Desk inbox instead of returning a 404

**Plans**: TBD
**UI hint**: yes
**Research**: Needs `/gsd-plan-phase 5 --research-phase`. Topics: the split between one `SECURITY DEFINER` award RPC (claim, history insert, decision insert, single-bucket BLP recompute in one transaction) and the TypeScript writer around it (team routing, copy numbering, audit, Discord); the addon inbox contract (the companion never retries, so today a Forever award is lost); Desk snapshot latency (a drop should open in under 2 seconds). Run `/gsd-ui-phase 5` for the Desk inside Raid Mode.
**Owner inputs**: addon scope and owner for the separate repo, by Oct 21 (Decision 23); master loot or trade on Forever and the Gargul export, by Nov 9 (Decision 14). The Desk must not depend on either answer.
**Defaults applied**: the Desk is free for all guilds (owner decision); off-spec interest ranks below every main-spec need (Decision 16); candidates are ranked in the browser through the shared pure function, and the server checks the top candidate at award time.

### Phase 6: Live Raid Night

**Goal**: The whole raid takes part on raid night: raiders say who is interested, the guild's Discord shows every decision with its reason, raiders see what it would take to move up, and any mistake can be undone
**Window**: 2026-11-16 to 2026-11-24
**Depends on**: Phase 5
**Dependency note**: Undo reverses the award, decision record and BLP recompute that Phase 5 writes. The "What would it take" line uses the shared ranker Phase 5 extracts. Phase 7 rehearses this phase's Discord thread and undo on real data.
**Requirements**: DESK-04, DESK-07, DESK-09, DESK-10, DISC-09
**Success Criteria** (what must be TRUE):

  1. A raider responds Need, Off-spec or Pass from their phone or from Discord, and the officer's Desk reorders within 5 seconds, including after the officer's connection drops and comes back
  2. The guild's Discord channel shows one message per raid night, edited as drops are settled, with a reason on every award
  3. An officer can undo an award: the drop reopens, BLP is recomputed, and the raid-night Discord message is edited to match
  4. A chase-item or legendary drop opens a council card, and the council's decision publishes a one-line reason
  5. Every score a raider sees carries a "What would it take" line

**Plans**: TBD
**UI hint**: yes
**Research**: Needs `/gsd-plan-phase 6 --research-phase`. Topics: Discord batching and rate limits (debounced edits of one message, limits read from response headers rather than hard-coded); undo semantics across award, BLP and the Discord message; the Desk's own SWR config (poll every 5 seconds only while the Desk is open and visible, revalidate on focus and reconnect; do not reuse the global `swrConfig`).
**Defaults applied**: polling only in v1, with Realtime Broadcast deferred to PLAT-01 (Decision 17); one edited message per raid night (Decision 12); "Count me in for rare drops" defaults on (Decision 15).

### Phase 7: Rehearsal and Launch Readiness

**Goal**: The Drop Desk is proven on a real past raid, its copy is signed off, and it works on a phone, so it can go live by Nov 30
**Window**: 2026-11-23 to 2026-11-28 (Drop Desk live gate: 2026-11-30)
**Depends on**: Phase 6
**Dependency note**: The rehearsal covers everything Phases 4 to 6 built (picker, presets, Desk, Discord thread, undo). Nothing gets rehearsed or signed off before it exists. The em dash test can land earlier and protect Phases 4 to 6, but REH-02 closes here, once the full copy sheet is signed.
**Requirements**: REH-01, REH-02, REH-03
**Success Criteria** (what must be TRUE):

  1. A past raid's real award log replays on a staging guild through the Desk, and `loot_history`, BLP and the Discord post reconcile with the original night
  2. The owner has signed off the copy for the picker, presets, Desk and Discord, and an automated test fails the build if any on-screen text contains an em dash
  3. The picker and the Desk pass 375px mobile checks: every action is reachable, nothing is cut off, and nothing scrolls sideways

**Plans**: TBD
**UI hint**: yes
**Research**: Standard; skip `--research-phase`.
**Owner inputs**: beta guild and beta night (the brief suggests Big Yikes), the named officer authorised to fall back to paper, and the rule for voiding rows, all by Nov 9 (Decision 13). The surface sweep for the free Drop Desk launch runs in this phase.

### Phase 8: Simplicity Pass

**Goal**: Officers and raiders see only what guilds use, in a consumer-grade app that needs no manual, and every power feature stays reachable
**Window**: audit 2026-10-26 to 2026-11-13, alongside Phases 4 to 6; cuts from 2026-12-01. Set the end date at plan time; Forever raids open on Dec 9, so consider freezing navigation for raid-opening week if the cuts are not done by then.
**Depends on**: Phase 7
**Parallel with**: Phases 4 to 7, for the audit (SIMP-01) only. The audit has no dependency and starts Oct 26.
**Dependency note**: The cuts (SIMP-02 to SIMP-05) ship only after Nov 30 (owner decision): cutting before the Desk is stable risks the Nov 30 date, and the officer sidebar needs the Drop Desk entry from Phase 5. The cuts change no scoring formula.
**Requirements**: SIMP-01, SIMP-02, SIMP-03, SIMP-04, SIMP-05
**Success Criteria** (what must be TRUE):

  1. The owner has a keep, move or remove decision for every officer and raider surface, backed by aggregated PostHog usage with no player or guild names
  2. Raiders see a three-entry sidebar (My list, Raid night, History) and officers see those plus Drop Desk, Roster and Settings, in place of today's up to 11 entries
  3. Every retained setting is reachable under Advanced, and no power feature (PPR, priority lists, reserves, Warcraft Logs import, Gargul export) is removed without the owner's sign-off
  4. `LootListContent`, `DashboardContent` and raid tracking are restructured only after characterization tests pin their current behaviour, and those tests still pass afterwards
  5. Help content changes in the same PR as each cut, so no help text describes a screen that has moved or gone

**Plans**: TBD
**UI hint**: yes
**Research**: Needs `/gsd-plan-phase 8 --research-phase`. Navigation needs a UX research pass, because the sidebar proposal is LOW confidence. Run `/gsd-ui-phase 8` before the cuts.
**Owner inputs**: approve the audit, choose the sidebar direction, and confirm no power feature is removed before Nov 30, all by Oct 26 (Decision 18).

## Calendar and Parallel Lanes

| Phase | Window | Lane | Gate it serves |
|-------|--------|------|----------------|
| 1. Forever Defect and Privacy Fixes | Oct 12 to 16 | A (parallel with 2) | Oct 31 |
| 2. Expansion Onboarding Manifest | Oct 13 to 21 | A (parallel with 1) | Oct 31 |
| 3. Discovery Schema and Need Pipeline | Oct 19 to 23 | A | Oct 31 |
| 4. Discovery Lists and Score Split | Oct 21 to 30 | A | Oct 31 |
| 5. Drop Desk Core | Nov 2 to 16 | A | Nov 30 |
| 6. Live Raid Night | Nov 16 to 24 | A | Nov 30 |
| 7. Rehearsal and Launch Readiness | Nov 23 to 28 | A | Nov 30 |
| 8. Simplicity Pass (audit) | Oct 26 to Nov 13 | B (parallel with 4 to 7) | none |
| 8. Simplicity Pass (cuts) | from Dec 1 | after 7 | Dec 9 raid opening (target) |

- **Lane A (critical path):** Phase 1 and Phase 2 in parallel, then 3, 4, 5, 6, 7.
- **Lane B (audit only):** Phase 8's SIMP-01 audit runs from Oct 26 alongside Lane A. The Phase 8 cuts wait for Phase 7.
- **Buffer:** Oct 31 to Nov 1 sits between the Discovery gate and the Desk start. Nov 29 to 30 sits before the Desk gate.

## Progress

**Execution Order:**
1 and 2 in parallel, then 3, 4, 5, 6, 7, 8. Phase 8's audit overlaps 4 to 7; its cuts follow 7.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Forever Defect and Privacy Fixes | 9/9 | Complete    | 2026-10-13 |
| 2. Expansion Onboarding Manifest | 13/13 | Complete    | 2026-10-19 |
| 3. Discovery Schema and Need Pipeline | 8/19 | In Progress|  |
| 4. Discovery Lists and Score Split | 0/TBD | Not started | - |
| 5. Drop Desk Core | 0/TBD | Not started | - |
| 6. Live Raid Night | 0/TBD | Not started | - |
| 7. Rehearsal and Launch Readiness | 0/TBD | Not started | - |
| 8. Simplicity Pass | 0/TBD | Not started | - |

## Requirement Coverage

| Category | Requirements | Phase |
|----------|--------------|-------|
| Defects and privacy | FIX-01 to FIX-06 | 1 |
| Expansion format (SEED-001) | EXPN-01 to EXPN-06 | 2 |
| Discovery lists | DISC-01, DISC-06, DISC-07, DISC-12 | 3 |
| Discovery lists | DISC-02, DISC-03, DISC-04, DISC-05, DISC-08, DISC-10, DISC-11 | 4 |
| Drop Desk | DESK-01, DESK-02, DESK-03, DESK-05, DESK-06, DESK-08, DESK-11, DESK-12 | 5 |
| Drop Desk and Discovery | DESK-04, DESK-07, DESK-09, DESK-10, DISC-09 | 6 |
| Rehearsal | REH-01, REH-02, REH-03 | 7 |
| Simplicity pass | SIMP-01 to SIMP-05 | 8 |

**Mapped:** 44/44 v1 requirements. No orphans, no duplicates.

## Cross-Phase Notes

- **Research's Phase 5 (ranker extraction) is folded into Phase 5 here.** No requirement maps to the extraction on its own. It is the first plan of Drop Desk Core, and the same ranker feeds the Desk ordering (DESK-03) and the "What would it take" line (DISC-09, Phase 6).
- **The Drop Desk is split across Phases 5 and 6** so that the transactional award path is verified by Nov 16, about two weeks before the Nov 30 gate. The raid-facing parts (responses, Discord thread, undo, council card) build on that verified path.
- **Bot `/priority` switching to Loot Score is not a v1 requirement.** It stays "by list rank" (Decision 10). Switching it once the shared ranker exists is an owner call, not planned work.
- **Deferred to later milestones:** the Known mode transition (KNOWN-01, KNOWN-02), everything that needs real Forever drops (DROP-01 to DROP-07), and the platform items (PLAT-01 to PLAT-06). Raid assignments are out of scope; the owner is building them as a separate tool.
- **Community requests captured during Phase 2 (post-v2.0 unless the owner pulls them into Phase 4 or 8):** a council-flavored loot style preset showing attendance, luck and preparation side by side; a preparation or performance score per attendance sheet (0, 0.5, 1) as an additive component that defaults to zero for existing guilds; bad luck protection timers split by upgrade size (weapon or trinket, tier, minor slots); in-game loot list viewing through the addon without a web login, which feeds the Phase 5 addon scope decision.
