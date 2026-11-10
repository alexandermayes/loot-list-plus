# Phase 3: Discovery Schema and Need Pipeline - Research

**Researched:** 2026-10-28
**Domain:** Postgres expand-only schema (already deployed), a typed "need row" pipeline through every reader of `loot_items`, `loot_submission_items` and `loot_history`, derived BLP, owner-run backfill
**Confidence:** HIGH for every in-repo statement tagged VERIFIED (files opened and tests run this session); MEDIUM for reader dispositions carried from the Oct 19 to Oct 21 research and verification documents (tagged CITED); LOW only where tagged ASSUMED

**READ FIRST:** the premise of this research request is out of date. Phase 3 was already researched, planned (19 plans), executed, reviewed and verified on Oct 19 to Oct 21 on a branch that was never pushed, and its migration is already live in production. See "State finding" in the Summary before planning anything. A new plan-phase run from the current `main` would redo shipped work.

<user_constraints>
## User Constraints (from CONTEXT.md)

Copied verbatim from `.planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-CONTEXT.md` as it exists on `main` (gathered 2026-10-19). A later version of this file on the unpushed branch adds D-17 to D-28; those are listed in the next subsection because the deployed migration already encodes them.

### Locked Decisions

**Carried forward (already decided, not re-asked)**
- **D-00a:** Need rows live per raid tier; one picker fans a raider's ranking out to all three Forever raids (owner Decision 1).
- **D-00b:** Column `raid_tiers.list_mode`, values `known` and `discovery`, default `known`.
- **D-00c:** Stat families keep Healing and Spell damage separate (Decision 2); "Tier piece" is off the default picker (Decision 3); separate lists per raid size off (Decision 4); loot-cost columns ship at zero; pins live in `loot_item_need_pins`.
- **D-00d:** The migration is expand-only, ships in its own migration-only PR (`--admin` merge, non-raid day) and is live before any code that reads it; RLS matrix (raider, officer, non-member, ex-member) per new table; PGlite migration test (DISC-12).

**Officer switch and timing**
- **D-01:** Forever raid tiers start in Discovery. Seeding (`syncExpansionCatalog`, `seedMode: 'sync'`) creates Forever tiers with `list_mode = 'discovery'` and their need rows. Every legacy tier stays `known`. Reversibility: costly, need rows and BLP accrue against Discovery tiers from the first raid night.
- **D-02:** Ship the plumbing in Phase 3, hold the visible switch. Schema, need rows and reader branches ship now; the officer-facing toggle and anything raiders see of need rows turn on with the Phase 4 picker, so nobody lands on a half-built screen. Plan-phase decides the gating mechanism (feature flag or simply not rendering the toggle until Phase 4).
- **D-03:** An officer may switch a Discovery tier back to Known only while no one has ranked a need on it and no need award exists; after that the switch is blocked with a reason. The real Known transition (mapping needs to items) stays deferred.
- **D-04:** Changing `list_mode` uses the existing `manage_settings` permission, the same gate as other tier settings in `ExpansionManager`.
- **D-05:** Existing Forever tiers (created by Phase 2 seeding or `sync:forever`) are flipped to Discovery and get their need rows by a reviewed, idempotent backfill limited to the Forever expansion. Legacy tiers are never touched. Planner decides whether the flip is SQL in the migration and the need-row seed runs through the sync path (`npm run sync:forever -- --apply`), so the taxonomy has one TypeScript source. Reversibility: costly, backfilled rows are what raiders rank on.

**Cost scheme**
- **D-06:** Need rows carry the 10-point budget scheme: Big 3, Medium 2, Standard 1, stored in the existing `loot_items.allocation_cost` column (no new cost column). Phase 4's budget reads it. Reversibility: costly.
- **D-07:** Big = weapons and trinkets; Medium = rings, necks, cloaks; Standard = armour slots. Tier stays off the default picker.
- **D-08:** Restriction class is mirrored from the cost tier: Big rows `Reserved`, Medium rows `Limited`, Standard rows `Unlimited`, so readers and bracket validation that key on `classification` keep working without a Discovery special case.

**Need list and naming**
- **D-09:** One need row = slot plus stat family, with armour class only where it matters (e.g. "Chest, Plate, Strength", "Two-hand weapon, Strength", "Trinket, Healing", "Ring, Physical").
- **D-10:** Display names read as plain words with commas ("Two-hand weapon, Strength"); no em dashes. Each row has a stable `need_key` (e.g. `two-hand-weapon.strength`) plus a display name. Display copy is proposed here and signed off by the owner with the Phase 4 picker copy (Oct 26).
- **D-11:** Every Discovery tier gets the same full need set, so a raider's needs map to the same keys in Barrow Deeps, Hyjal Summit and Onyxia's Lair and BLP accrues per tier.
- **D-12:** The taxonomy is a frozen list in `domain/loot/needs.ts` with tests (manifest-gate style). Keys never change once shipped; a rename carries an alias the way tier names carry `previousNames`. It is the single source for seeding, the picker and the Drop Desk. Reversibility: one-way.

**What readers show before Phase 4**
- **D-13:** Need rows render as a NeedLabel: the need name and a neutral icon, no Wowhead link, no boss. On the master sheet they group under a "Needs" section per tier instead of a boss.
- **D-14:** These surfaces exclude Discovery tiers or need rows outright rather than branching: reserves and soft-reserve runs; BIS import; addon and companion exports (filter `kind = 'item'`, so the addon never sees a row without a `wowhead_id`); bot `/priority` stays item-only until the Drop Desk (Phase 5).
- **D-15:** An award against a need records `loot_history.loot_item_id` = the need row and a new `loot_history.awarded_item_id` = the real item (null until the Desk exists). The BLP recompute SQL stays unchanged because it already keys on `loot_item_id`; only reports that show item names read `awarded_item_id`. Reversibility: one-way.
- **D-16:** A reader that meets a need row it was not written for skips it and logs a warning once per request: never crash, never drop silently. Every reader still gets an explicit, tested mode branch (DISC-06); the fallback is a safety net, not the plan.

### Claude's Discretion
- The exact stat family list per slot and which slots carry an armour class, within D-09 and Decision 2 (planner proposes from research; owner reviews with the picker copy).
- The flag or rendering mechanism that holds the switch until Phase 4 (D-02).
- Whether the Forever backfill is pure SQL or SQL plus `sync:forever` (D-05).

### Deferred Ideas (OUT OF SCOPE)
- Bot `/priority` for need rows: arrives with the Drop Desk (Phase 5).
- Known-mode transition (mapping needs to revealed items, closing generic entries): deferred milestone, after Dec 9 plus three resets.
- Pinning revealed items onto needs through the Desk UI: Phases 5 and 6 (the table ships here).

### Owner decisions recorded only on the unpushed branch (D-17 to D-28), already live in the migration
Source: `git show gsd/v2.0-forever-loot:.planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-CONTEXT.md` and the header of `supabase/migrations/20261020120000_discovery_schema.sql` (which cites D-17, D-22, D-24, D-26, D-27). Treat as locked unless the owner says otherwise.
- **D-17:** the list-mode PATCH accepts `discovery` only for tiers of the Forever expansion (guard in one place).
- **D-18:** loot-cost `guild_settings` columns are deferred to the phase that reads them (4 or 5); they do not ship in this migration.
- **D-19:** a need award consumes the winner's list entry for that need (receive-skip by identity key).
- **D-20:** `@electric-sql/pglite` exact-pinned `0.5.8` devDependency, committed PGlite test.
- **D-21:** ROADMAP success criterion 2 reads "every non-Forever tier stays Known"; Forever tiers are Discovery after the D-05 backfill.
- **D-22:** the need-ranking hold is enforced server side (submit route and the `enforce_need_ranking_hold` trigger) until Phase 4.
- **D-23:** Shield, Off-hand item and Relic need rows cost Medium (2, `Limited`); wands fold into Ranged weapon rows.
- **D-24 / D-26 / D-27:** browser sessions cannot insert or rename a `Forever` expansion, cannot move a tier between expansions, and cannot directly delete a need row.
- **D-25:** the owner confirmed the 145-key need list on 2026-10-21 (recorded in the branch's `03-02-SUMMARY.md`), so keys are frozen.
- **D-28:** plan-split and size notes (informational).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | Officer can set a raid tier's list mode to Discovery; existing tiers stay Known with unchanged scores (golden fixtures) | `raid_tiers.list_mode` is live (migration line 182); golden gate green on `main` (364 tests); PATCH route, seeder and sync flip exist only on the unpushed branch (see Seeding) |
| DISC-06 | Need rows flow through submissions, approval, snapshots, master sheet, exports and BLP as `loot_items` rows with `kind = 'need'`; every reader has a tested mode branch | Reader Audit (branch implementation plus the Oct 27 and Oct 28 delta rows) |
| DISC-07 | Raider ranked on a need accrues BLP for that need before any item exists | BLP section; PGlite test already on `main`, passes |
| DISC-12 | Discovery schema ships expand-only, before the code that reads it, with an RLS matrix per new table and a PGlite migration test | Shipped: PR #459 merged 2026-10-21, deploy run success; 52-test PGlite file and 16-test contract file on `main`, both pass |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

From `.claude/CLAUDE.md` and `~/.claude/CLAUDE.md`; treated as locked.

- Next.js 16 App Router, React 19, TypeScript strict, Supabase (Postgres, Auth, RLS), Tailwind 3, Vitest. Files kebab-case, components PascalCase, tests in `__tests__/` as `name.test.ts(x)`, import through `@/`, never `../../`.
- Business rules are pure functions in `domain/`; API routes in `app/api/**/route.ts` validate auth and input then call domain code.
- Every client query carries a `user_id` filter (RLS is the boundary); the service-role client is for API routes doing batch work only.
- Hand back only after `npm run lint`, `npm run typecheck`, `npm test`.
- Comments say why not what; keep `// regression for #NNN` references.
- Migration-only PRs need `--admin` merge; migrations auto-deploy about 12 seconds after merge; CodeQL blocks tainted format strings (fixed first argument to `console.*`).
- User-facing copy needs owner sign-off; no em dashes anywhere in copy.
- This repo is public: no guild names or ids, account identifiers, session URLs or tokens in tracked files; counts and aggregates only. This document uses none.
- File changes go through a GSD command; planning docs reach GitHub through a docs-only PR from a `gsd/quick-*` branch, never committed on `main`. Every `gsd-tools` call needs `GSD_WORKSTREAM=forever`.
- Standing constraints (STATE.md): expand-only schema in its own migration-only PR live before code that reads it; owner copy sign-off; no player or guild names in analytics; Loot Score golden and Lua fixtures byte-identical; no live wago.tools or Wowhead fetches.

## Summary

**State finding (the most important fact in this document).** On `main` the workstream STATE says Phase 3 is "Ready to plan", but git history shows otherwise. [VERIFIED: `git log --all`, `git branch -r --contains 592cb846`, `gh run list`, `gh pr list`]
- PR #459 (`feat/forever-discovery-schema`) merged to `main` on 2026-10-21 (merge commit `1b8c5b0a`). It carries only the migration `supabase/migrations/20261020120000_discovery_schema.sql`, its contract test, its PGlite test, the `pglite-chain.ts` harness and the exact-pinned devDependency. The Deploy Migrations run `39677113149` for that merge concluded success. So the Discovery schema is live in production and sorts before `20261026120000`, `20261027120000` and `20261028120000`. The instruction to name the Phase 3 migration later than `20261028120000` is moot: there is nothing left to add to the schema for Phase 3.
- The rest of Phase 3 (19 plans, 7 waves) was executed on the local branch `gsd/v2.0-forever-loot` between 2026-10-20 and 2026-10-21: 101 commits ahead of `origin/main`, 42 behind. Its last commit is `592cb846`, and no remote branch contains it (`git branch -r --contains 592cb846` prints nothing; `origin/gsd/v2.0-forever-loot` still points at `a4d10972`). The branch holds the taxonomy, readers, seeder, PATCH route, reader inventory test, research, validation, code review, verification and UAT documents. The verification report on that branch scores 4 of 4 success criteria verified, status `human_needed`. **That work exists only on this machine and should be pushed as a backup branch before anything else.**
- What `main` lacks is therefore: `domain/loot/needs.ts` and friends, the reader branches, `lib/database.types.ts` hunks for the deployed columns (main's types still have no `list_mode`, `kind`, `need_key`, `awarded_item_id` or `loot_item_need_pins`), the seeder and sync flip, the PATCH route, and all planning documents for the phase.
- A dry merge (`git merge-tree --write-tree main gsd/v2.0-forever-loot`) conflicts in only three files: `.planning/workstreams/forever/STATE.md`, `app/api/loot-submissions/submit/route.ts` and its test. `lib/database.types.ts` auto-merges. [VERIFIED: git merge-tree output this session]

**Recommended path for the planner:** do not re-plan Phase 3 from zero. Treat this research as a delta audit. (1) Push the branch. (2) Merge `main` into it and resolve the two code conflicts (both are adjacent additive hunks; see Pitfall 2). (3) Close the post-Oct-21 delta described below (slot-lock readers added on Oct 28, the Equipped column, the types regeneration, the reader-inventory scan). (4) Ship the remaining PRs in the order the branch plans define: PR 2 need primitives (plans 03-03 to 03-05), PR 3 readers and types (03-02 types, 03-06 to 03-12, 03-16 to 03-19), PR 4 seeding and the PATCH route (03-13, 03-14), then the owner-run `sync:forever -- --apply`. (5) Resolve the open warnings WR-01 to WR-05 and UAT items 1 to 5.

**Primary recommendation:** keep every decision in the branch (D-17 to D-28) and the deployed migration as is. The only new engineering the Oct 27 and Oct 28 changes force is small: list `lib/loot/slot-locks.ts` in the reader inventory, decide the slot-lock policy for need awards, add a chain test that exercises the Discovery hold through the Oct 28 `save_submission_items`, and regenerate or re-apply the types hunk.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Discovery or Known mode of a tier | Database (`raid_tiers.list_mode` plus triggers) | API (PATCH route enforces D-03, D-04, D-17) | Behaviour is DB state, not a PostHog flag; triggers close PostgREST bypasses |
| Need taxonomy (keys, names, cost, class) | Domain (`domain/loot/needs.ts`, pure, client-safe) | Database (seeded rows) | One TypeScript source for seeding, picker and Desk (D-12) |
| Need row seeding and Forever backfill | API/Backend service (`app/services`, service role) | Owner-run script `sync:forever` | Insert-only, Forever-only, dry run by default |
| Shape and uniqueness of need rows | Database (CHECKs, partial unique index) | Domain tests | Constraints bind every writer, service role included |
| Reader branches (exclude, label, skip) | API/Backend (routes, `lib/`) | Browser (components) | Routes decide what leaves the server; components only render |
| Need ranking hold until Phase 4 | Database trigger (`enforce_need_ranking_hold`) | API (submit route predicate) | RPC and direct PostgREST inserts both reach the trigger |
| BLP accrual on a need | Database (`recompute_blp_for_item`, unchanged) | API (recompute call sites) | Derived value rebuilt from history, keyed on `loot_item_id` |
| Slot locks on a need award | API (`lib/loot/slot-locks.ts`, service role) | Database (`save_submission_items` check) | New Oct 28 writer that now meets need rows |
| Column visibility of `kind` and `need_key` | Database (column grant) | none | `loot_items` has column-level SELECT for browser roles |

## Standard Stack

### Core
No new runtime dependency. [VERIFIED: `package.json` lines 10-12, 19, 41, 79]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.1.11 (run output this session) | Unit, route, scan, migration tests | Existing runner; `// @vitest-environment node` for routes and migrations |
| @supabase/supabase-js | existing | Typed service-role client | `createTypedServiceRoleClient` and `selectAllPagesOrThrow` are the Phase 1 read pattern every new read follows |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @electric-sql/pglite | 0.5.8 exact, devDependency (already on `main`, `package.json:79`) | In-process Postgres for the migration and RLS-matrix tests | DISC-12; `app/services/__tests__/helpers/pglite-chain.ts` exports `createChainedDb`, `asRole`, `resetRole`, `query`, `inRolledBackTransaction`, `expectRejected` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Flip and seed through the sync path (shipped design on the branch) | `UPDATE raid_tiers SET list_mode = 'discovery' ...` inside the migration | Migration is already deployed and data-free (its header says "No data changes: the Forever flip and the need rows go through the reviewed sync"), so a SQL flip would now need a second migration PR |

**Installation:** none. **Version verification:** `npm view` not re-run; no package is added in this phase, and the one devDependency (PGlite 0.5.8) was approved under D-20 and is already merged.

## Package Legitimacy Audit

No external package is installed by the remaining work.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @electric-sql/pglite 0.5.8 | npm | multi-year (per Oct 19 research) | about 15.8M/wk (per Oct 19 research) | github.com/electric-sql/pglite | rated SUS by the seam on Oct 19 only because the latest release was 5 days old; already approved and merged (D-20) | Approved, already installed; not re-run this session |

**Packages removed due to SLOP verdict:** none. **Packages flagged SUS:** none outstanding.

## Architecture Patterns

### System Architecture Diagram

```
 OWNER-RUN / GUILD CREATION                              RUNTIME (per request)
 +-------------------------------------------+     +-----------------------------------------------+
 | seedExpansionForGuild (service role)      |     | raider picker (bootstrap, /api/loot-items)    |
 | npm run sync:forever [-- --apply]         |     |   fetchFilteredLootItems: kind='item' default |  held until Phase 4
 +----------------+--------------------------+     +-----------------------------------------------+
                  v                                 | save_submission_items RPC / direct insert     |
 syncExpansionCatalog (insert-only, Forever only)   |   -> trigger enforce_need_ranking_hold (D-22) |
   1 insert raid_tiers as 'discovery'               |   -> submit route: isHeldNeedRanking 422      |
   2 flip existing Forever 'known' tiers (guarded)  |   -> bracket rules skip needs, copy caps keep |
   3 read need_keys per tier, insert missing rows   +-----------------------------------------------+
     from domain/loot/needs.ts (145 per tier)       | approval, snapshot, revert, remove-item       |
                  v                                 |   by loot_item_id (works unchanged)           |
 loot_items kind='need', need_key, boss 'Needs',    +-----------------------------------------------+
   classification + allocation_cost 3/2/1           | master sheet, summary, Raid Mode              |
                  |                                 |   ranked needs only under "Needs", NeedLabel  |
                  |                                 +-----------------------------------------------+
                  |                                 | exports: guild-data, export-string, gargul,   |
                  |                                 |   buildMemberRankedItems, bot /priority       |
                  |                                 |   -> items only; warn once on a need          |
                  v                                 +-----------------------------------------------+
 awards: loot_history.loot_item_id = need row       | slot locks (Oct 28): lockAwardedSlots by id   |
         awarded_item_id = NULL until Phase 5       |   -> decision needed for need awards          |
                  v
 recompute_blp_for_item(guild, need row)  SQL unchanged
   contenders: approved lists ranking the row; award events: loot_history rows with raid_event_id
```

### Recommended Project Structure (as built on the branch)
```
domain/loot/needs.ts, list-mode.ts, item-identity.ts, need-ranking-hold.ts (+ __tests__, __fixtures__/need-keys.json)
app/services/need-row-seeder.ts            # planNeedRows, readNeedKeysByTier, seedNeedRows, flipTiersToDiscovery
app/components/NeedLabel.tsx               # ItemLink delegates here when wowheadId is null
lib/loot/need-skip.ts, tier-need-rows.ts   # warn-once helper, ranked-need query
lib/loot/__tests__/need-reader-inventory.test.ts   # scan with floor and self-checks
```

### Pattern 1: a need is a normal `loot_items` row with a discriminator
**What:** `kind = 'need'`, `need_key` set, `wowhead_id` NULL, `boss_name = 'Needs'` sentinel, `item_slot` from the existing slot vocabulary, `classification` and `allocation_cost` from D-06 to D-08. **Why the sentinel:** at least 8 components type `boss_name` as non-null `string` and `RaidModeView.tsx:47-48` calls `.toLowerCase()` on it and on `item_slot`. [VERIFIED: RaidModeView.tsx lines 47-48 quoted in the Reader Audit]
### Pattern 2: reader branch is filter at the query, label at the render, skip with one warning
Exclude (`.eq('kind','item')`) for external consumers and Known-only features; label (`NeedLabel`) where a raider or officer sees what was ranked or won; skip through `lib/loot/need-skip.ts` where a need cannot be represented (D-16).
### Pattern 3: tests copy three house styles
Frozen list with an independent fixture (`data/expansions/__tests__/manifest-gate.test.ts`), migration contract plus PGlite chain (`discovery-schema-migration.test.ts`, `discovery-schema-pglite.test.ts`), and source scan with a floor and synthetic self-checks (`typed-client-usage.test.ts`, `need-reader-inventory.test.ts`).

### Anti-Patterns to Avoid
- **Adding `list_mode` or `kind` to the legacy seeder's insert payload.** The golden files `app/services/__tests__/__golden__/*.rows.txt` pin every legacy row; rely on column defaults. [VERIFIED: expansionSeeder-golden.test.ts header]
- **A PostHog or env flag for the hold.** Behaviour lives in DB state; the hold is a trigger plus a route predicate.
- **Keying received-skip or award counts on `wowhead_id`.** Every need row shares `wowhead_id` NULL.
- **Adding a foreign key from `loot_history.awarded_item_id` to `loot_items` now.** A second FK to one table makes PostgREST embeds ambiguous (PGRST201). [CITED: migration header "Why awarded_item_id has no foreign key yet"]
- **Putting `if (discovery)` branches inside the 2,000-line components.** Use pure helpers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fixture Postgres for RLS and triggers | Mocked clients that "pass" a trigger | `createChainedDb`, `asRole`, `expectRejected` from `app/services/__tests__/helpers/pglite-chain.ts` | The guards key on `current_setting('role')`; only a real role switch exercises them |
| Paged, error-checked reads | `.select()` with silent error swallow | `selectAllPagesOrThrow`, `createTypedServiceRoleClient` | Phase 1 read-error 500 policy (owner decisions 7 and 8) |
| Need identity in maps | `String(wowhead_id)` keys | `itemIdentityKey` from `domain/loot/item-identity.ts` (branch) | needs share `wowhead_id` NULL |
| Warn-once logging | ad hoc `console.warn` in 20 readers | `lib/loot/need-skip.ts` (branch) | one helper, fixed first argument for CodeQL |
| Taxonomy | hand-typed rows in the seeder | `NEED_DEFINITIONS` plus `needRowColumns` | single source, frozen by fixture |

## Reader Audit (DISC-06)

Scope scanned this session: every non-test file in `app`, `lib`, `domain`, `utils`, `companion`, `discord-bot` that reads the three tables, plus SQL. The branch's `need-reader-inventory.test.ts` scans with `READER_PATTERN` over those roots and `scripts`, and its own independent re-audit found 99 matching non-test files, 98 listed. [CITED: branch 03-VERIFICATION.md, Observable Truth 3] Rows tagged VERIFIED were read on `main` this session; the rest are CITED from the branch's research and verification, whose code on `main` is unchanged since the merge base except where the Delta table says so. "Branch disposition" is what the 19 plans implemented. D-13 is NeedLabel, D-14 is exclude, D-16 is skip-and-warn.

### A. Pickers and editors (hold the switch)

| Reader (file:line) | What a need row does today (main code) | Branch disposition | Tests |
|---|---|---|---|
| `lib/loot-items-query.ts:144` `fetchFilteredLootItems` (called by bootstrap and `/api/loot-items` GET) | Selects every `is_available` item of the tiers with no `kind` filter; a need would appear in the raider picker with no boss. [VERIFIED] | Exclude by default, `includeNeeds` option Phase 4 passes (diff read this session) | `lib/__tests__/loot-items-query.test.ts` exists |
| `app/api/bis-items/route.ts:215-228` | `itemsByWowheadId[item.wowhead_id] = item` writes key "null" for needs. [VERIFIED] | Exclude (D-14) | branch adds test |
| `app/api/loot-items/route.ts` PATCH, `specs/route.ts`, `officer-notes/route.ts` | An officer could rewrite `classification` or `allocation_cost` of a need | Guard: refuse need rows with 400 | branch adds tests |
| `LootSettingsContent.tsx`, `PriorityListTab.tsx` (client queries) | Editors list every item of the phase | Exclude (`kind` is readable via the column grant) | source |
| `reserve-runs/*` (items, `[id]`, join, awards, raid-tiers, create) | Soft-reserve lists and the unauthenticated join route would offer needs | Exclude needs and Discovery tiers (D-14) | branch tests |
| `raid-tracking/_client.tsx`, `raid-tracking/import/_client.tsx`, `admin/sheet-import/route.ts` | Name matching of pasted loot lines or classification import | Exclude | branch tests |
| `app/api/prio-list/route.ts` | Embeds `loot_item`; no priority rows exist for needs | ok, test only (review WR-03: the test cannot fail; fix by selecting `kind` or filtering) | weak |

### B. Submission lifecycle

| Reader | Today | Branch disposition | Tests |
|---|---|---|---|
| `save_submission_items` RPC (main definition is the Oct 28 one, `20261028120000_award_slot_locks.sql`) | Inserts `(submission_id, loot_item_id, rank, slot)` from JSON, reads no item metadata, then runs the lock check. [VERIFIED] | Not edited. The D-22 trigger on `loot_submission_items` catches it because `role` survives SECURITY DEFINER | `discovery-schema-pglite.test.ts` D-22 block passes on main against the Oct 28 RPC (run this session) |
| `app/api/loot-submissions/submit/route.ts:87-215` | Validates `allocation_cost` sums per bracket with limit 3 (`bracket-validation.ts:22`, `:264`); a Big need (3) plus a Medium (2) would raise `allocation_limit`. [VERIFIED] | Add `kind` to the select, refuse held needs with 422, drop needs from `validateBracketRules`, keep them in `validateItemCopyLimits` (diff read this session) | route test exists; conflicts with main's lock-check hunk |
| `domain/loot/bracket-validation.ts:112,175,264` | Sums cost, Reserved must sit alone in slot 1. [VERIFIED] | Skip need entries | exists |
| `domain/loot/slot-capacity.ts:59-60`, `item-copies.ts:34-35` | `copyGroupKey` already falls back to `id:${item.id}` when `wowhead_id` is null. [VERIFIED] `maxCopiesForItem` falls to default 1 | Need branch returns 2 for Finger and Trinket | exists |
| review, revert, remove-item, item-counts, `loot-submissions` GET, bootstrap | Ids and names only; `remove-item` `already_obtained` writes `loot_history` with the need id | ok by id; tests added | branch |

### C. Master sheet, summary, Raid Mode

| Reader | Today | Branch disposition |
|---|---|---|
| `lib/loot/master-sheet-summary.ts:147-165` | Counts awards `by wowhead_id`; a need reads `already_awarded` 0. [VERIFIED] | Count by identity key; ranked needs only under "Needs" via `lib/loot/tier-need-rows.ts` |
| `RaidModeView.tsx:47-48` | `ir.item.boss_name.toLowerCase()` and `ir.item.item_slot.toLowerCase()` throw if null. [VERIFIED] | Sentinel plus defensive guard plus test |
| `BossSection.tsx`, `ItemCandidateModal.tsx`, `MasterSheetContent.tsx`, `LootListSummaryView.tsx` | `ItemLink` with null `wowheadId` | LABEL through the `ItemLink` guard (one change covers about 43 call sites) |
| `app/api/master-sheet/visibility/route.ts` | Resolves by id | ok; review WR-02: up to 435 need ids in GET URLs and an unchecked page error. Fix before Forever guilds use the master sheet |

### D. Exports and external consumers (D-14 exclude)

| Reader | Today | Branch disposition |
|---|---|---|
| `app/api/addon/guild-data/route.ts:132,143,209` | Items read has no `kind` filter and emits `wowhead_id: item.wowhead_id`. [VERIFIED] | `.eq('kind','item')`, BLP filtered |
| `companion/src/main/addon-format.ts:367` | `result[String(item.wowhead_id)]`: every need would collide on "null" and corrupt the addon item table. [VERIFIED] | Fixed by excluding at the route, never in the companion |
| `app/api/addon/export-string/route.ts:130,142,192,427` | Flattens tier items with no `kind` check. [VERIFIED] | Skip `isNeedRow` in the flatten and in BLP |
| `lib/addon/member-ranked-items.ts:91,161` | `if (!wowheadId) continue` and `wowheadId == null`: skips needs silently. [VERIFIED] | Replace with a counted skip and one warning per request |
| `domain/loot/gargul-dft.ts:62` | `if (!wowheadId \|\| wowheadId <= 0) continue`: silent. [VERIFIED] | explicit `kind === 'need'` continue plus named test |
| `app/api/bot/priority/route.ts:93-113` | `ilike('name', ...)` matches a need named "Chest, Plate, Strength" and answers with a null wowhead id. [VERIFIED] | `.eq('kind','item')` on all three reads |
| `app/api/addon/loot-award`, `import-string`, `lib/loot/guild-scoped-lookup.ts` | Resolve by wowhead id; a need never matches | ok by construction; test that a need is never returned |

### E. Awards, history, display

| Reader | Today | Branch disposition |
|---|---|---|
| `app/api/character-gear/route.ts:108-147` | `.filter((item) => item.wowhead_id)` silently drops need awards from awarded gear. [VERIFIED] | explicit kind filter, warn once |
| `app/api/loot-history/bulk/route.ts` POST, DELETE, PATCH | Keyed by `loot_item_id`; BLP recompute collects ids with a `raid_event_id` (`:411-413`, `:437-440`). [VERIFIED] | ok, test added |
| `app/components/ItemLink.tsx:50,105,112` | `wowheadId: number`; a null yields `item=null` links and a tooltip request. [VERIFIED] | outer guard returns `NeedLabel` |
| Discord announce and post-raid summary | `wowheadLink` returns `**name**` with no link on a falsy id | ok, tests added |
| `DashboardContent.tsx`, `raid-tracking/_client.tsx`, `LootHistoryTab`, `PlayerLootModal` | by id, `ItemLink` | LABEL via the guard; known deferral: raid event re-import of a need award (branch 03-11 summary) goes to Phase 5 |

### F. SQL
`recompute_blp_for_item`, `recompute_blp_for_event`, `recompute_blp_for_guild`, `increment_blp(_bulk)`, `reset_blp`, `enforce_loot_history_guild_refs`, `delete_guild`: unchanged; see BLP.

### Delta since the branch's merge base (Oct 27 and Oct 28), verified on `main`

| Reader or writer | What it does with a need row | Recommended branch |
|---|---|---|
| `lib/loot/slot-locks.ts` `lockAwardedSlots` (`:49-99`, `lockOneAward` `:101-179`) | Reads `loot_history.loot_item_id`, finds live `loot_submission_items` rows with the same id on the raider's one approved list, and writes a `loot_list_slot_locks` row. Works by id, so a need award on a guild with `award_slot_lock_enabled = true` locks the raider's need rank to the need row. Never rejects. Called from `loot-history/bulk` (`:419-429`), `addon/loot-award` (`:227`), `addon/import-string` (`:279-281`). [VERIFIED] | **Decision needed (Open Question 3).** Safe either way (no crash). Recommend allow, because the lock keeps the 3, 2 or 1 points spent exactly as it does for items, and add a test plus an inventory entry. The alternative is skip with `kind = 'need'` and a warn once |
| `lib/loot/slot-locks.ts` `fetchActiveSlotLocks`, `releaseSlotLock`, `releaseSlotLocksForAward` | By submission id, lock id, history id | ok by id |
| `loot_list_slot_locks` table (`20261028120000_award_slot_locks.sql`) | `loot_item_id` FK `ON DELETE CASCADE` to `loot_items`; `loot_history_id` FK cascade. D-27 lets cascades through | ok; D-03 already counts `loot_history` need rows, so a locked need award also blocks the Known switch |
| `submit/route.ts:98-116` lock check, `revert/route.ts:128`, `remove-item/route.ts:262-295`, `loot-submissions/route.ts:96`, `bootstrap/route.ts:210` | Read active locks by submission id and compare rank, slot and `loot_item_id` | ok by id. Merge order in `submit`: keep the lock check, then the D-22 hold, then bracket rules |
| `domain/loot/equipped-item-level.ts:141-185` `equippedSlotsForLootItem(itemSlot, itemName)` and `ItemCandidateModal.tsx` Equipped column | Display only. All 19 need `item_slot` values (Two-Hand, Main Hand, Off Hand, Ranged, Trinket, Finger, Neck, Back, Shield, Held In Off-hand, Relic and the eight armour slots) map to a comparable slot in the switch, so an officer would see the Equipped column for a need row; nothing reads a need's item level (see next row). Cannot crash | ok, add one test with a need row; no code change |
| `item_base_levels` (`20261027120000`) and `lib/battlenet-item-levels.ts` | **Correction to the request:** there is no `loot_items.item_level` column. [VERIFIED: `lib/database.types.ts` loot_items Row, lines of the `loot_items` block list no `item_level`; the only `item_level` columns are `character_equipped_items.item_level` and `item_base_levels.item_level`] The cache is keyed by `wowhead_id` of equipped gear and is service-role only. A need row never reaches it | none |
| `app/api/addon/guild-data/route.ts:86,308-317` | `select('*')` from `guild_settings` then spreads `...settings` into the payload, so `award_slot_lock_enabled` (Oct 28) is already in the addon `settings` object. D-18's "payload unchanged" no longer holds for that reason, unrelated to Discovery | note for the addon repo; no Phase 3 action |

### Reader inventory test and the merge
The branch's scan fails CI for any matching file that is not listed. Among files changed on `main` since the merge base, `lib/loot/slot-locks.ts` matches `READER_PATTERN` (it calls `.from('loot_history')` and `.from('loot_submission_items')`) and is not in the inventory file (grep count 0). [VERIFIED: regex run this session] A full scan after the merge was not run (Open Question 1). Add an entry for it with disposition `branch` or `ok` per the slot-lock decision, and re-check the marker rules for `submit`, `remove-item`, `revert`, `bootstrap` and `loot-submissions` GET, which `main` changed.

## BLP for need awards (DISC-07), verified

**Recompute SQL.** `recompute_blp_for_item(p_guild_id, p_loot_item_id)` is defined in `supabase/migrations/20260721000001_add_blp_reset_anchor.sql:34-149`; no later migration redefines it (`grep -n "CREATE OR REPLACE FUNCTION.*recompute_blp"` finds only `20260609000001` and `20260721000001`). [VERIFIED] It exits unless `blp_enabled IS TRUE`, deletes the bucket's rows with `DELETE FROM blp_credits  WHERE guild_id = p_guild_id AND loot_item_id = p_loot_item_id;` and the same for `blp_tracking` (lines 68-69), then rebuilds in one statement:
- contenders: `WHERE lsi.loot_item_id = p_loot_item_id AND lsi.removed_at IS NULL AND ls.guild_id = p_guild_id AND ls.status = 'approved'` (lines 73-82)
- award events: `loot_history` rows with `lh.loot_item_id = p_loot_item_id AND lh.raid_event_id IS NOT NULL` and the reset anchor (lines 86-95)
- a "pass" is a contender who attended an award event, did not win it, after their last win of that bucket (lines 115-130)

`recompute_blp_for_event` loops `DISTINCT loot_item_id` of the event's `loot_history` rows (`20260609000001:148-174`); `recompute_blp_for_guild` loops every awarded `loot_item_id` (`20260721000001:157-179`).

**Keying and `awarded_item_id`.** Everything keys on `loot_item_id`. Adding `loot_history.awarded_item_id` (`uuid`, nullable, no FK, migration line 216) changes nothing for BLP: no recompute function selects it. [VERIFIED] With D-15 (`loot_item_id` = the need row) each (guild, need row, tier) is its own bucket, which is the "BLP by slot" design. Need awards accrue correctly with the SQL unchanged. **What the planner must remember:** accrual requires (a) `guild_settings.blp_enabled`, (b) a need award `loot_history` row with a `raid_event_id`, (c) attendance records for the contenders. "Before any item exists" means before any real item is known, not before any award.

**How "recomputing twice gives the same result" is tested today.** The `describe('BLP accrues on a need row (DISC-07)')` block of `app/services/__tests__/discovery-schema-pglite.test.ts:1022-1135` seeds two raiders with approved lists ranking one need, attendance on two nights, one need award to raider A with `awarded_item_id` null, then asserts: winner has no row, raider B `times_passed: 1` with one `blp_credits` row; repeated `recompute_blp_for_item`, `recompute_blp_for_event` and `recompute_blp_for_guild` in two different orders leave `blp_tracking` and `blp_credits` identical (`expect(await snapshot()).toEqual(first)`); an unranked need writes nothing. [VERIFIED: block read and file run this session, 52 tests pass in the Discovery PGlite file]

## Schema as shipped (expand-only migration, DISC-12)

File: `supabase/migrations/20261020120000_discovery_schema.sql` (621 lines), live since 2026-10-21. All values below were read from the file this session.

```sql
-- :182
ALTER TABLE "public"."raid_tiers" ADD COLUMN IF NOT EXISTS "list_mode" "text" NOT NULL DEFAULT 'known';
-- :186
ADD CONSTRAINT "raid_tiers_list_mode_check" CHECK (("list_mode" = ANY (ARRAY['known'::"text", 'discovery'::"text"]))) NOT VALID;   -- then VALIDATE (:188)
-- :192, :194
ALTER TABLE "public"."loot_items" ADD COLUMN IF NOT EXISTS "kind" "text" NOT NULL DEFAULT 'item';
ALTER TABLE "public"."loot_items" ADD COLUMN IF NOT EXISTS "need_key" "text";
-- :198
ADD CONSTRAINT "loot_items_kind_check" CHECK (("kind" = ANY (ARRAY['item'::"text", 'need'::"text"]))) NOT VALID;
-- :204
ADD CONSTRAINT "loot_items_need_shape_check" CHECK (((("kind" = 'need'::"text") AND ("need_key" IS NOT NULL) AND ("wowhead_id" IS NULL)) OR (("kind" = 'item'::"text") AND ("need_key" IS NULL)))) NOT VALID;
-- :208
CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_items_tier_need_key" ON "public"."loot_items" USING "btree" ("raid_tier_id", "need_key") WHERE ("kind" = 'need'::"text");
-- :214
GRANT SELECT ("kind", "need_key") ON TABLE "public"."loot_items" TO "anon", "authenticated";
-- :216
ALTER TABLE "public"."loot_history" ADD COLUMN IF NOT EXISTS "awarded_item_id" "uuid";
```

**Existing `loot_items` constraints a need row meets.** Baseline `loot_items` (`20260101000000_baseline_schema.sql:1888-1909`): only `id` and `name` and `is_loot_council` are NOT NULL; `wowhead_id integer` is nullable and has no uniqueness; `classification` has `CONSTRAINT "loot_items_classification_check" CHECK (("classification" = ANY (ARRAY['Reserved'::"text", 'Limited'::"text", 'Unlimited'::"text"])))`; `allocation_cost integer DEFAULT 0`. So a need row violates nothing existing, and the new shape check forces `wowhead_id` NULL. [VERIFIED]

**`loot_item_need_pins`** (lines 220-261): columns `id`, `guild_id`, `item_id`, `need_id`, `pinned_by` (FK `auth.users` `ON DELETE SET NULL`), `created_at`; `UNIQUE ("guild_id","item_id")`; `CHECK ("item_id" <> "need_id")`; FKs to `guilds`, `loot_items` (twice) all `ON DELETE CASCADE`; RLS on. Policies: select `TO authenticated` for an active guild member or `is_guild_officer(guild_id)`; insert and delete `TO authenticated` for `is_guild_officer`; no UPDATE policy (unpin is a delete). Grants: `REVOKE ALL ... FROM PUBLIC, "anon", "authenticated"`; `GRANT SELECT, INSERT, DELETE ... TO "authenticated"`; `GRANT ALL ... TO "service_role"` (the pattern `20261028120000_award_slot_locks.sql` also uses). `enforce_loot_item_need_pin_refs` (SECURITY DEFINER, `BEFORE INSERT OR UPDATE OF guild_id, item_id, need_id`) requires item kind `item`, need kind `need`, same guild and same raid tier for every role, and raises the RLS error for a non-officer client so it leaks nothing.

**RLS matrix result (committed test, passes).** raider: reads, cannot insert or delete; officer: reads, inserts, deletes; ex-member and non-member: see 0 rows, denied (`describe('RLS matrix on loot_item_need_pins')`, line 781). [VERIFIED: test run this session]

**Guard triggers (ten triggers, seven functions).** `raid_tiers`: `enforce_raid_tier_discovery_forever_only` (WHEN `NEW.list_mode = 'discovery'`, message `raid_tiers.list_mode discovery is only allowed for Forever raid tiers`), `enforce_raid_tier_known_switch` (message `raid_tiers.list_mode cannot leave discovery while needs on the tier are ranked or awarded`), `enforce_raid_tier_expansion_lock`. `loot_items`: `enforce_loot_item_need_rules_insert` and `_update` (browser sessions refused: `loot_items need rows are written only by the server`; every role: `loot_items need rows belong only to Forever raid tiers in Discovery mode`), `enforce_loot_item_need_delete_lock` (`need rows are deleted only by the server`, `pg_trigger_depth() = 1`). `loot_submission_items`: `enforce_need_ranking_hold` (`Need rows cannot be ranked yet`, browser roles only). `expansions`: `enforce_expansion_forever_name_insert` and `_update`. `loot_item_need_pins`: the integrity trigger. The D-24 name lock is safe for production because every app path that inserts an expansion runs on the service role (`app/api/guilds/route.ts:160-166`, `change-expansion/route.ts:113-119`, `[id]/expansions/route.ts:124-130` all pass `serviceSupabase` and `useServiceRole = true`). [VERIFIED]

**What the request's schema proposal asked for, mapped.** `NOT VALID` then `VALIDATE`: done. `loot_history.awarded_item_id`: shipped without a foreign key on purpose (Phase 5 adds it `NOT VALID` then `VALIDATE` with explicit embed hints). The loot-cost columns: deferred by D-18. Nothing else is outstanding in SQL for Phase 3.

**Oct 28 interplay.** `20261028120000_award_slot_locks.sql` redefines `save_submission_items` with the lock check after the delete-then-insert and still inserts `(submission_id, loot_item_id, rank, slot)` only. Because the D-22 hold is a trigger on the table, it still fires. Proof: `CI=true npx vitest run` of the Discovery PGlite file passes on `main` with the Oct 28 file in the chain (`createChainedDb(listMigrationFiles())` applies every migration). [VERIFIED] If Phase 4 or 5 ever redefines this RPC it must start from the Oct 28 definition.

**Types hunk.** Main's `lib/database.types.ts` lacks the deployed columns. The branch's commit `283f8e55` is the hand-applied hunk (61 lines): `awarded_item_id: string | null` on `loot_history` Row, `awarded_item_id?: string | null` on Insert and Update; `kind: string` and `need_key: string | null` on `loot_items` Row (`kind?: string` Insert and Update); `list_mode: string` on `raid_tiers` (`list_mode?: string` Insert and Update); a full `loot_item_need_pins` table block with its four relationships (guilds, loot_items twice, no relationship for `pinned_by`). The generator output was not used because it reformatted unrelated blocks and dropped `recompute_blp_for_guild`. The merge dry run reports this file as auto-merging; run `npm run typecheck` after merging.

## Seeding and the Forever backfill (D-01, D-05, D-11)

**Today on `main`.** `syncExpansionCatalog` (`app/services/expansionCatalogSync.ts:109-145`) reads `raid_tiers` for the expansion, plans missing manifest tiers with `planCatalogSync`, and does one bulk `insert`. Its header says "INSERT-ONLY. This file never updates, deletes or upserts a row." It throws for any name other than `FOREVER_MANIFEST.storedName`, and never writes `loot_items`. `scripts/lib/forever-sync.ts` and `npm run sync:forever` (`package.json:41`, `tsx scripts/sync-forever-catalog.ts`) wrap it: dry run by default, `--apply` writes, unknown flags exit 1, a post-apply duplicate-name check reports but never deletes (STATE 02-10). All three callers of the seeder (`api/guilds`, `change-expansion`, `[id]/expansions`) use the service role.

**Recommendation for D-05 (already implemented on the branch, keep it):** the flip and the need rows both go through the sync path, not SQL. Reasons: the migration is deployed and data-free; one TypeScript source (`NEED_DEFINITIONS`) creates rows for new guilds, the owner-run backfill and the PATCH route; the dry-run report is the "reviewed" step; a Forever guild created between the migration deploy and the code deploy keeps the `known` default and the next sync heals it. Branch implementation, read this session (`app/services/need-row-seeder.ts`): `planNeedRows` (pure, tier order then `NEED_DEFINITIONS` order, a tier id listed twice planned once), `planDiscoveryFlip` (flips only a `known` tier that holds no need rows, so a tier an officer switched back stays Known), `readNeedKeysByTier` (paged, throws on error), `seedNeedRows` (read-then-insert, dry run returns the plan), `flipTiersToDiscovery` (the only update: `.update({ list_mode: 'discovery' }).in('id', ...).eq('list_mode', 'known')`). The DB trigger `enforce_loot_item_need_rules` refuses a need row in a tier that is not yet `discovery`, so callers flip before they seed.

**Idempotency key:** `(raid_tier_id, need_key)` for `kind = 'need'`, enforced by `idx_loot_items_tier_need_key`. Because the index is partial, PostgREST `on_conflict` cannot target it, so seeding is read-then-insert and a concurrent run surfaces as a unique violation that a rerun heals. [CITED: branch 03-RESEARCH.md spike; PostgREST behaviour ASSUMED, see A3]

**Known-guild safety.** Legacy seeding is untouched; the golden rows do not change. Only the Forever path writes `list_mode` or `kind`.

## The held switch (D-02, D-03, D-04)

**Recommendation (shipped on the branch): no UI toggle in Phase 3, plus a server-side hold.** There is no feature-flag infrastructure to reuse (`useFeatureFlag` has no consumers under `app/`, is client-only, and PITFALLS 14 rules out flags for behaviour). The hold has four layers, all already designed:
1. Data and reads: raider picker and every export default to `kind = 'item'` (`fetchFilteredLootItems`, exports, bot).
2. Database: trigger `enforce_need_ranking_hold` refuses a browser session ranking a need, through the RPC or a direct insert (live now).
3. API: submit route answers 422 for a list holding a need (`isHeldNeedRanking`, `NEED_RANKING_HOLD_ERROR = 'Needs cannot be ranked yet.'`).
4. UI: the list-mode toggle is not rendered. The officer-facing toggle belongs in `app/(app)/expansions/[expansionId]/_client.tsx` (the per-tier toggles `handleToggleGuildActive` and `handleToggleMasterSheetVisibility`), not `ExpansionManager.tsx` as CONTEXT says (correction, [CITED: branch 03-RESEARCH.md]).

**What Phase 4 flips** (stated by `domain/loot/need-ranking-hold.ts`, read this session): delete the `isHeldNeedRanking` check in the submit route and the module with its test; ship a migration that drops trigger `enforce_need_ranking_hold` and function `enforce_need_ranking_hold()`; pass `includeNeeds: true` for Discovery tiers in `fetchFilteredLootItems`; remove the ranked-only filter on the master sheet; add the list-mode control to the expansion page. Note the DROP is a relaxation, not an expansion, so state that against standing constraint 1 in the Phase 4 plan. The need branch for bracket rules and copy caps stays.

## Need taxonomy (D-09 to D-12, D-23, D-25)

**Status: frozen and owner-confirmed.** 145 rows per Discovery tier: 19 Big (cost 3, `Reserved`), 22 Medium (cost 2, `Limited`), 104 Standard (cost 1, `Unlimited`). The owner replied "keys confirmed" on 2026-10-21 (branch `03-02-SUMMARY.md`). Display names remain subject to the Oct 26 copy review, which STATE lists as a pending owner input.

Source of truth read this session: `git show gsd/v2.0-forever-loot:domain/loot/needs.ts`. Key format `slot[.armour].stat`, lowercase kebab segments joined by dots (the D-10 example `two-hand-weapon.strength`). Stat keys: `strength`, `agility`, `tank`, `spell-damage`, `healing`, `physical`. Armour keys: `cloth`, `leather`, `mail`, `plate`. Display name: slot name, optional armour, stat, joined by comma and space, for example "Chest, Plate, Strength". No em dashes.

| Slot key (display) | `item_slot` column | Cost tier | Armour class | Stat families | Rows |
|---|---|---|---|---|---|
| `two-hand-weapon` (Two-hand weapon) | Two-Hand | Big, 3, Reserved | none | strength, agility, tank, spell-damage, healing | 5 |
| `main-hand-weapon` (Main hand weapon) | Main Hand | Big | none | strength, agility, tank, spell-damage, healing | 5 |
| `off-hand-weapon` (Off-hand weapon) | Off Hand | Big | none | strength, agility | 2 |
| `ranged-weapon` (Ranged weapon) | Ranged | Big | none | agility, spell-damage, healing (wands fold in, D-23) | 3 |
| `trinket` (Trinket) | Trinket | Big | none | physical, spell-damage, healing, tank | 4 |
| `ring`, `neck`, `back` | Finger, Neck, Back | Medium, 2, Limited | none | physical, spell-damage, healing, tank | 12 |
| `shield` (Shield) | Shield | Medium (D-23) | none | tank, healing, spell-damage | 3 |
| `off-hand-item` (Off-hand item) | Held In Off-hand | Medium (D-23) | none | spell-damage, healing | 2 |
| `relic` (Relic) | Relic | Medium (D-23) | none | strength, agility, tank, spell-damage, healing | 5 |
| `head`, `shoulders`, `chest`, `wrist`, `hands`, `waist`, `legs`, `feet` | Head, Shoulder, Chest, Wrist, Hands, Waist, Legs, Feet | Standard, 1, Unlimited | cloth: spell-damage, healing. leather: agility, tank, healing, spell-damage. mail: agility, strength, spell-damage, healing. plate: strength, tank, healing | 13 per slot | 104 |

Arithmetic check: Big 5 + 5 + 2 + 3 + 4 = 19; Medium 12 + 3 + 2 + 5 = 22; Standard 8 x 13 = 104; total 145. [VERIFIED: computed from the table in `needs.ts`]. Other columns the seeder writes (`needRowColumns`): `boss_name` is the sentinel `'Needs'`, `kind: 'need'`, `is_available: true`, `is_loot_council: false`, `armor_type` for the eight armour slots only, `roles` from the stat family, `primary_stat` `'Strength'` or `'Agility'` for those two families only.

**D-06 and D-08 against existing validation (the flag the request asked for).** D-08's claim holds for `classification` but not for `allocation_cost`. `validateBracketRules` sums `allocation_cost` per bracket against `DEFAULT_MAX_ALLOCATION_POINTS = 3` (`domain/loot/bracket-validation.ts:22`, `:243`, `:264`), so a Big (3) plus a Medium (2) in one bracket raises `allocation_limit`, and `Reserved` must sit alone in slot 1 (`:139-146`). The branch resolves it by excluding need rows from bracket rules (they carry their own 10-point budget, which is Phase 4's DISC-03 check) while keeping copy caps. The owner was told this departure from D-08 (branch plan 03-04 Task 3). Phase 4's picker must enforce the 10-point budget itself.

**How the frozen list is guarded (copy this style).** `data/expansions/__tests__/manifest-gate.test.ts` states that expected names, sizes and boss order "are transcribed by hand from the plan and the 2026-09-13 todo, not read back from the manifest" (constants `EXPECTED_RAID_NAMES`, `EXPECTED_RAID_SIZES`, `EXPECTED_BARROW_DEEPS_BOSSES`) and reads a second independent fixture, `data/expansions/forever/__fixtures__/shipped-names.json`. `domain/loot/__tests__/needs.test.ts` on the branch copies it: deep-equal against `domain/loot/__fixtures__/need-keys.json`, hand-typed `BIG_SLOTS`, `MEDIUM_SLOTS`, `STANDARD_SLOTS`, a 50-key `SPEC_DEFAULTS` list, counts 19, 22, 104, no em or en dash, alias keys resolve.

## Golden fixtures

- **Seed-row goldens:** `app/services/__tests__/__golden__/{classic,tbc,wrath,cata,mop}.rows.txt`, driven by `app/services/__tests__/expansionSeeder-golden.test.ts`, which says "Never fix a failure by updating the snapshot (no `vitest -u`)... Under CI Vitest refuses to write snapshots, so a missing or mismatched file fails the run." They pin the legacy seeder's rows only; Forever is excluded by design. [VERIFIED]
- **Loot Score fixtures:** `LOOT_SCORE_FIXTURES` in `domain/scoring/__tests__/fixtures.ts:69`, exercised by `domain/scoring/__tests__/*.test.ts`. `export-fixtures.ts` writes the JSON the addon repo's Lua parity check consumes (no `.lua` file lives in this repo). [VERIFIED]
- **Baseline:** `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` gives 9 files, 364 tests, all pass on `main` this session. The branch changes nothing under `domain/scoring`, `__golden__` or `expansionSeeder.ts` (`git diff main gsd/v2.0-forever-loot -- <those>` is empty). [VERIFIED]
- **What a Phase 3 change could do to them:** only by touching the legacy seeder's insert payload (adding `list_mode` or `kind`), by editing `domain/scoring`, or by changing how `allocation_cost` or `classification` of existing rows is read. Every branch change is additive and gated on `kind = 'need'` or a Forever name. The gate stays unmodified and green; run it after every plan.

## Common Pitfalls

### Pitfall 1: the finished work is local-only
**What goes wrong:** about 100 commits (code, tests, five review warnings, verification, UAT) exist only on `gsd/v2.0-forever-loot`; a disk problem or a branch reset loses them, and a fresh plan-phase duplicates them. **Proof:** `git branch -r --contains 592cb846` prints nothing; `git rev-parse origin/gsd/v2.0-forever-loot` is `a4d10972`. **Avoid:** push a backup ref first.

### Pitfall 2: merge conflicts in `submit/route.ts` and its test
**What goes wrong:** both sides edited the select and validation block. `main` adds the slot-lock check (`submit/route.ts:98-116`, `findLockViolations`, `fetchActiveSlotLocks` imports) and the branch adds `kind` to the select, the D-22 hold and the bracket filter. **Avoid:** keep both; order: lock check, then held-need 422, then bracket rules over `checkedRows.filter(si => !isNeedRow(si.loot_item))`, then copy limits with `kind`. Re-run the submit route test file.

### Pitfall 3: the reader-inventory scan will fail after the merge
**Proof:** `lib/loot/slot-locks.ts` matches the scan pattern and is not listed. **Avoid:** add the entry in the merge fix-up commit, not in a later plan.

### Pitfall 4: `loot_items` has column-level SELECT grants
`20261004040000_loot_item_officer_notes_officers_only.sql` made browser reads column-by-column, so new columns are unreadable unless granted. The migration grants `("kind", "need_key")` (line 214) and a DO block at the file end asserts `has_column_privilege` and that `officer_notes` stays unreadable. **Avoid:** any new `loot_items` column in Phase 4 needs its own grant and the same assertion.

### Pitfall 5: `wowhead_id` keyed structures collapse needs
`companion/src/main/addon-format.ts:367` (`result[String(item.wowhead_id)]`), `master-sheet-summary.ts:151-165` (award counts), `character-gear/route.ts:147` (`.filter((item) => item.wowhead_id)`), `member-ranked-items.ts:91` and `:161`. **Avoid:** exclude before the payload leaves the server; key by `itemIdentityKey`.

### Pitfall 6: null `boss_name` or `item_slot` crashes Raid Mode
`RaidModeView.tsx:47-48`. **Avoid:** the `'Needs'` sentinel and a non-null `item_slot`, plus the defensive guard and test already on the branch.

### Pitfall 7: bracket cost sum rejects valid need lists
`bracket-validation.ts:22` and `:264`. See the taxonomy section.

### Pitfall 8: fixtures must go in as the superuser
Every guard keys on `coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')`; the service role and migrations are trusted. A test that ranks a need as `authenticated` hits D-22, which is the point; a fixture that needs a ranked need uses the superuser session (as `discovery-schema-pglite.test.ts` does) or a fake client behind the route.

### Pitfall 9: do not give `awarded_item_id` a foreign key in Phase 3
About ten readers embed `loot_items` from `loot_history`; a second FK makes each embed ambiguous. **Avoid:** Phase 5 adds the FK `NOT VALID` then `VALIDATE` and adds explicit relationship hints to those embeds first.

### Pitfall 10: officer delete of a Discovery tier or expansion cascades through need rankings, awards and BLP
D-27 deliberately lets cascades through so `delete_guild` works (`pg_trigger_depth() = 1` in `enforce_loot_item_need_delete_lock`). Branch review WR-04. **Avoid:** owner decision to schedule a guard on `raid_tiers` delete or record the residual with a pinning test.

### Pitfall 11: the master sheet visibility route puts up to 435 need ids in GET URLs
Review WR-02 (three tiers times 145). Also its page error is unchecked, so a failure reads as "no rankings". **Avoid:** chunk or resolve need rows by tier; throw on the page error, before the hold lifts.

### Pitfall 12: PATCH `list_mode` can commit and then fail on another field
Review WR-01. **Avoid:** fold other fields into the same update or apply them first.

### Pitfall 13: the owner has not run `sync:forever` against production
STATE says the run is still owed. Until PR 4 ships and the owner runs `--apply`, existing Forever tiers stay `known` with no need rows, and nothing in production reads the new columns. This is safe, but UAT item 4 cannot pass before then.

### Pitfall 14: slot locks and need awards
See Delta table. A need award can lock the raider's need rank on opt-in guilds; the message reads "Rank N is locked to <need display name>". Not a crash; a product decision.

## Code Examples

### Chain a test through the newest migration and exercise the hold (recommended new test)
```ts
// Source: app/services/__tests__/helpers/pglite-chain.ts (read this session) and discovery-schema-pglite.test.ts:956-972
// @vitest-environment node
const db = await createChainedDb(listMigrationFiles())   // includes 20261028120000
await asRole(db, 'authenticated', RAIDER_USER_ID)
await expect(
  db.query(`SELECT public.save_submission_items($1, $2::jsonb)`, [DRAFT_LIST_ID, items]),
).rejects.toThrow('Need rows cannot be ranked yet')
```
This case already exists and passes on `main` against the Oct 28 RPC; the recommended addition is a second case with an active `loot_list_slot_locks` row, asserting the hold message wins over (or is raised before) the lock message for a payload that holds a need.

### Reader branch with warn-once (branch)
```ts
// Source: git show gsd/v2.0-forever-loot:lib/addon/member-ranked-items.ts pattern; noteNeedSkipped from lib/loot/need-skip.ts
if (isNeedRow(lootItem)) { noteNeedSkipped(scope); continue }
```

## State of the Art

| Old approach | Current approach | When changed | Impact |
|---|---|---|---|
| Table-level SELECT on `loot_items` | Column-level SELECT without `officer_notes` | 2026-10-04 | each new column needs a grant |
| Scratchpad-only PGlite proofs | Committed PGlite chain harness | 2026-10-21 (PR #459) | DISC-12 evidence is re-runnable |
| Derived BLP rebuild from history | `recompute_blp_for_item` | 2026-06-09, anchor 2026-07-21 | needs accrue with no SQL change |
| `idx_loot_history_unique_award` one award per night | copy-aware (`award_copy`) | 2026-10-01 | a raider can win two copies of one need in a night |
| `save_submission_items` without locks | lock check after the insert | 2026-10-28 | later redefinitions must start from this body |

**Deprecated or outdated:** CONTEXT's `ExpansionManager.tsx` as the home of the tier toggle (it is `expansions/[expansionId]/_client.tsx`); the request's `loot_items.item_level` (does not exist); "migration named after `20261028120000`" (already shipped as `20261020120000`).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The only post-merge-base reader the inventory scan will newly flag is `lib/loot/slot-locks.ts`; I checked only files changed on `main`, not a full post-merge scan | Reader Audit | A second unlisted reader fails CI at merge time; fix is one inventory row |
| A2 | Allowing a slot lock on a need award is the right product behaviour | Delta table | Owner may want needs excluded from locks; change is a kind check in `lockAwardedSlots` |
| A3 | PostgREST `on_conflict` accepts only a column list, so the partial unique index cannot be an upsert target | Seeding | If wrong, `upsert(ignoreDuplicates)` would work; read-then-insert merely becomes redundant |
| A4 | Oct 26 owner copy sign-off (display names and reason strings) has not happened yet | Taxonomy | If done, record it; if not, it is overdue (today is Oct 28) and blocks Phase 4 copy |
| A5 | The branch merges into `main` with only the three reported conflicts and typecheck stays green | Summary | Unknown type errors from the 42 main commits; run typecheck and the full suite after the merge |

## Open Questions

1. **Adopt the branch or re-plan?** Known: 19 plans executed and verified (status `human_needed`), migration live, branch unpushed. Unclear: whether the user intended to restart Phase 3. Recommendation: push a backup ref, merge `main` into the branch, then run plan-phase in a "remaining work" mode that produces plans only for the delta (types, inventory entry, slot-lock decision, conflict resolution, warning fixes) and the PR sequence PR 2, PR 3, PR 4, owner backfill.
2. **WR-02 and WR-04 acceptance (UAT item 5).** Known: both are warnings, not gaps. Unclear: schedule before Phase 4 lifts the hold, or record as accepted residuals.
3. **Slot locks on need awards (A2).** Recommendation: allow, add a test and an inventory entry.
4. **Owner copy review (Oct 26).** The 145 display names, `NEED_RANKING_HOLD_ERROR`, `DISCOVERY_FOREVER_ONLY_REASON`, `KNOWN_SWITCH_BLOCKED_REASON`, `NEED_ROW_FIXED_ERROR`, `RESERVES_UNAVAILABLE_ERROR` still need sign-off; keys do not.
5. **Does Phase 4's DROP of the D-22 trigger conflict with standing constraint 1 (expand-only)?** Recommendation: state it explicitly as a relaxation in the Phase 4 plan.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | tests, scripts | yes | v22.23.0 | none needed |
| npm | install, scripts | yes | 10.9.8 | none needed |
| gh CLI | PR merge, deploy-run check | yes | 2.95.0 | none needed |
| Supabase CLI | `npm run gen:types` | yes (path present, version not probed) | not probed | hand-apply the hunk (commit `283f8e55` precedent) |
| @electric-sql/pglite | DISC-12 tests | yes | 0.5.8 (`package.json:79`) | none needed |
| Production database access | owner-run `sync:forever` | owner only, not touched here | not probed | none; owner step |

Missing with no fallback: none for planning.

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json`. [VERIFIED: config read this session]

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11, globals on, jsdom default; `// @vitest-environment node` for routes, migrations, PGlite |
| Config file | `vitest.config.ts` (setup `vitest.setup.ts`) |
| Quick run command | `npx vitest run <touched test paths>` |
| Full suite command | `npm test && npm run typecheck && npm run lint` |
| Golden gate | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` |

### Phase Requirements to Test Map
"On main" means the file exists in the working tree now; "branch" means only on `gsd/v2.0-forever-loot`.

| Success criterion or req | Behavior | Test type | Automated command | File |
|---|---|---|---|---|
| SC1, DISC-12 | Migration shape, order, NOT VALID then VALIDATE, grants, header sections | contract (regex) | `npx vitest run app/services/__tests__/discovery-schema-migration.test.ts` | on main, passes |
| SC1, DISC-12 | Applies on the full chain and twice more; constraints; four-role RLS matrix on `loot_item_need_pins`; grants; guard triggers with positive controls; D-22; D-27 | PGlite | `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts` | on main, 52 tests pass (the contract file has 16, the Oct 28 slot-lock migration file 36) |
| SC4, DISC-07 | Need accrues BLP, winner none, other attendee 1, idempotent in any order | PGlite | same file, `describe('BLP accrues on a need row (DISC-07)')` | on main, passes |
| SC2, DISC-01 | Known tiers stay Known; legacy rows byte-identical; Loot Score fixtures | golden | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` | on main, 364 tests pass |
| SC2, DISC-01 | Taxonomy frozen (145, 19/22/104), costs mirror D-06 to D-08, no dashes, aliases | domain unit | `npx vitest run domain/loot/__tests__/needs.test.ts` | branch |
| SC2, DISC-01 | D-03 and D-17 switch rules fail closed | domain unit | `npx vitest run domain/loot/__tests__/list-mode.test.ts` | branch |
| SC2, DISC-01 | PATCH `list_mode`: ownership 404, D-04 403, D-17 400, D-03 409, seed on switch, revert on failed seed | route | `npx vitest run app/api/raid-tiers` | branch |
| SC2, D-05 | Sync inserts Forever tiers as Discovery with 145 rows each, second run inserts nothing, flips only `known` Forever tiers, never non-Forever | unit | `npx vitest run app/services/__tests__/expansionCatalogSync.test.ts app/services/__tests__/need-row-seeder.test.ts scripts/lib/__tests__/forever-sync.test.ts` | branch (first and third exist on main in older form) |
| SC3, DISC-06 | Every reader inventoried with a disposition; floor and self-checks | source scan | `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts lib/loot/__tests__/needs-boss-sentinel.test.ts` | branch; needs the `slot-locks.ts` entry after merge |
| SC3 | Addon exports are item rows only; BLP map filtered; bot ignores needs | route and unit | `npx vitest run app/api/addon lib/addon domain/loot/__tests__/gargul-dft.test.ts app/api/bot/priority` | branch additions |
| SC3 | Submit: need hold 422, need skips bracket rules, keeps copy caps; lock check kept | route and unit | `npx vitest run app/api/loot-submissions/submit domain/loot/__tests__/bracket-validation.test.ts domain/loot/__tests__/slot-capacity.test.ts domain/loot/__tests__/item-copies.test.ts` | branch; conflicted test file |
| SC3 | Approval, snapshot, revert, remove-item, item-counts, visibility accept a need id | route | `npx vitest run app/api/loot-submissions app/api/master-sheet/visibility` | branch additions |
| SC3 | Master sheet "Needs" group, NeedLabel not a link, Raid Mode does not throw, award counts by identity | component and unit | `npx vitest run lib/loot/__tests__/master-sheet-summary.test.ts "app/(app)/master-sheet/components/__tests__" app/components/__tests__/NeedLabel.test.tsx app/components/__tests__/ItemLink.render.test.tsx` | branch |
| SC3, SC4 | Bulk need award keys `loot_history` on the need row, no `awarded_item_id`, recompute scheduled with the need id | route | `npx vitest run app/api/loot-history/bulk lib/loot/__tests__/loot-history-rows.test.ts` | branch; main also edited this test file |
| Delta | Slot lock written by id for a need award (or skipped, per the decision); chain test with the Oct 28 RPC | route and PGlite | `npx vitest run lib/loot/__tests__/slot-locks.test.ts` plus the new chain case | lib test on main; new cases are Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run` on the touched files (PGlite files run in seconds here).
- **Per wave merge:** full suite command plus the golden gate.
- **Phase gate:** full suite green, golden gate green, types match the deployed schema, `npm run typecheck` clean, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] Merge `main` into the branch and rerun the 64-file phase set; resolve `submit/route.ts` and its test.
- [ ] `lib/loot/__tests__/need-reader-inventory.test.ts`: entry for `lib/loot/slot-locks.ts`.
- [ ] A need-award case in `lib/loot/__tests__/slot-locks.test.ts` per the slot-lock decision.
- [ ] A PGlite case combining an active slot lock and a need payload through `save_submission_items`.
- [ ] `lib/database.types.ts` carries the deployed columns (commit `283f8e55` hunk).

## Security Domain

`security_enforcement` is `true`, `security_asvs_level` 1, `security_block_on` `high` in `.planning/config.json`. [VERIFIED]

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (no new auth surface) | existing `getAuthenticatedUser` |
| V3 Session Management | no | existing |
| V4 Access Control | yes | `verifyPermission(..., 'manage_settings')` plus the tier-to-guild ownership check in PATCH; RLS on `loot_item_need_pins` with `is_guild_officer`; role-keyed triggers; column grants |
| V5 Input Validation | yes | allowlist `list_mode` in `known`, `discovery` server side and by CHECK; `need_key` never user input |
| V8 Data Protection | yes | `officer_notes` stays unreadable to sessions (asserted); exports never carry need rows |
| V14 Configuration | yes | `REVOKE ALL` on every trigger function; `SET search_path` pinned; `lock_timeout` 5 s |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Officer of guild A writes guild B's tier by id (existing PATCH has `.eq('id', tier_id)` with no guild check, `app/api/raid-tiers/route.ts:130`) | Tampering, Elevation | ownership check added by branch plan 03-14 |
| Officer inserts or renames a `Forever` expansion, moves a tier, or deletes a need directly to reach Discovery or drop rankings | Tampering | D-24, D-26, D-27 triggers (live) |
| Cross-guild pin | Tampering, Information disclosure | pin integrity trigger raises the RLS error for non-officers |
| Raider ranks a need by calling the API before Phase 4 | Tampering | D-22 trigger and route predicate |
| Need rows leaking to the addon or public reserve join page | Information disclosure | `kind = 'item'` filters and the reader inventory |
| Public repo leak | Information disclosure | no real ids in fixtures (synthetic uuids); sync report prints ids and counts only |

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `supabase/migrations/20261020120000_discovery_schema.sql` (all 621 lines), `20261028120000_award_slot_locks.sql`, `20261026120000_equipped_item_level.sql`, `20261027120000_item_base_levels.sql`, `20260721000001_add_blp_reset_anchor.sql`, `20260609000001_blp_recompute_from_history.sql`, `20260101000000_baseline_schema.sql:1888-1909`, `lib/loot/slot-locks.ts`, `domain/loot/slot-locks.ts`, `domain/loot/equipped-item-level.ts`, `app/api/loot-submissions/submit/route.ts`, `remove-item/route.ts` (head), `loot-history/bulk/route.ts:395-445`, `app/api/raid-tiers/route.ts:100-135`, `app/services/expansionCatalogSync.ts`, `domain/loot/bracket-validation.ts`, `lib/loot-items-query.ts`, `app/services/__tests__/helpers/pglite-chain.ts`, `app/services/__tests__/discovery-schema-pglite.test.ts` (setup, D-22 and BLP blocks), `data/expansions/__tests__/manifest-gate.test.ts` (head), `app/services/__tests__/expansionSeeder-golden.test.ts` (head), `lib/database.types.ts` (loot_items block), `.planning/config.json`.
- Branch files read via `git show gsd/v2.0-forever-loot:...`: `03-CONTEXT.md`, `03-RESEARCH.md`, `03-VALIDATION.md`, `03-VERIFICATION.md`, `03-UAT.md`, `03-REVIEW.md` (head), `domain/loot/needs.ts`, `domain/loot/list-mode.ts`, `domain/loot/need-ranking-hold.ts`, `app/services/need-row-seeder.ts`, `lib/loot-items-query.ts` diff, `submit/route.ts` diff, commit `283f8e55`.
- Commands run: `CI=true npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts app/services/__tests__/discovery-schema-migration.test.ts app/services/__tests__/award-slot-locks-migration.test.ts` (3 files, 104 tests pass); `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` (9 files, 364 tests pass); `gh run list --workflow=deploy-migrations.yml`; `gh pr list`; `git merge-tree --write-tree`; `git branch -r --contains`.

### Secondary (MEDIUM confidence)
- Branch 03-VERIFICATION.md and 03-RESEARCH.md claims not re-opened on `main` (tagged CITED).

### Tertiary (LOW confidence)
- PostgREST `on_conflict` semantics (A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependency.
- Architecture and schema: HIGH, deployed file read in full and its tests run.
- Reader audit: MEDIUM-HIGH, key readers re-read on `main`, the remainder carried from a verified branch audit.
- Pitfalls: HIGH for those with a cited file and line.

**Research date:** 2026-10-28
**Valid until:** 2026-11-04 (new migrations, the Oct 26 copy review outcome, or a push of the branch change the plan)
