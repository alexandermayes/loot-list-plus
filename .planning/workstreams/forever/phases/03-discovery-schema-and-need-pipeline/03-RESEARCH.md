# Phase 3: Discovery Schema and Need Pipeline - Research

**Researched:** 2026-10-19
**Domain:** Postgres expand-only migration, Supabase RLS and column grants, a typed need-row pipeline through ~55 existing readers of `loot_items`, `loot_submission_items` and `loot_history`, derived BLP
**Confidence:** HIGH for every in-repo statement (files opened this session, line ranges quoted); HIGH for the schema design (a draft migration was applied to all 47 existing migrations in PGlite and exercised); MEDIUM for the need taxonomy and the reader dispositions that need owner sign-off (flagged `[ASSUMED]`)

<user_constraints>
## User Constraints (from CONTEXT.md)

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
- **D-12:** The taxonomy is a frozen list in `domain/loot/needs.ts` with tests (manifest-gate style). Keys never change once shipped; a rename carries an alias the way tier names carry `previousNames`. It is the single source for seeding, the picker and the Drop Desk. Reversibility: one-way, shipped `need_key` values are referenced by submissions, BLP and pins.

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
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | Officer can set a raid tier's list mode to Discovery; existing tiers stay Known with unchanged scores (golden fixtures) | `raid_tiers.list_mode` column + CHECK (Migration spec); PATCH `/api/raid-tiers` extension with the missing tier-to-guild ownership check (Pitfall 4); Forever-only seeding and backfill (Seeding); golden command in Validation Architecture; the held switch (Held Switch) |
| DISC-06 | Need rows flow through submissions, approval, snapshots, master sheet, exports and BLP as `loot_items` rows with `kind = 'need'`; every reader has a tested mode branch | Reader Audit (about 55 readers dispositioned with file and line); reader-inventory scan test; `boss_name = 'Needs'`, `NeedLabel` and `ItemLink` guard; bracket-rule skip for need rows |
| DISC-07 | Raider ranked on a need accrues BLP for that need before any item exists | `recompute_blp_for_item` read and exercised in PGlite with a need-keyed row: winner 0, other attendee 1, three recomputes identical (BLP section) |
| DISC-12 | Discovery schema ships expand-only, before the code that reads it, with an RLS matrix per new table and a PGlite migration test | Draft migration applied to the 47 existing migrations in PGlite 0.5.8, twice (idempotent); RLS matrix result for `loot_item_need_pins`; column-grant requirement on `loot_items`; harness recipe; deploy sequencing |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Extracted from `./.claude/CLAUDE.md` and `~/.claude/CLAUDE.md`. Treat as locked.

- Next.js 16 App Router, React 19, TypeScript strict, Supabase (Postgres, Auth, RLS), Tailwind 3, Vitest. Files kebab-case, React components PascalCase, tests in `__tests__/` as `name.test.ts(x)`; import through the `@/` alias, never `../../`.
- Business rules are pure functions in `domain/`; API routes in `app/api/**/route.ts` validate auth and input, then call domain code.
- Every client query carries a `user_id` filter because RLS is the security boundary; the service-role client is for API routes doing batch work only.
- Before handing back: `npm run lint`, `npm run typecheck`, `npm test`.
- Comments say why, not what; keep `// regression for #NNN` references.
- Migration-only PRs need `--admin` merge; migrations auto-deploy about 12 seconds after merge; CodeQL blocks tainted format strings (use a fixed first argument to `console.error`).
- Copy voice: user sign-off required on user-facing copy; no em dashes.
- Public repo: never paste account identifiers, guild names or ids, session URLs or tokens into tracked files; counts and aggregates only. (This document uses synthetic ids only.)
- GSD workflow enforcement: file changes go through a GSD command; planning docs reach GitHub through a docs-only PR from a `gsd/quick-*` branch, never committed directly on `main`.
- Every `gsd-tools` call needs `GSD_WORKSTREAM=forever`.
- Standing constraints from STATE.md: schema changes expand-only in their own migration-only PR, live before the code that reads them, RLS matrix per new table; owner signs off copy; no player or guild names in analytics; Loot Score golden fixtures and Lua fixtures stay byte-identical; no live wago.tools or Wowhead fetches.

## Summary

Phase 3 is one expand-only migration plus a typed "need row" pipeline. A need is a `loot_items` row with `kind = 'need'`, so submissions, approval, snapshots, BLP and awards already work by id. The real work is the readers: about 55 files read `loot_items`, `loot_submission_items` or `loot_history`, and four classes of defect appear when a row has no `wowhead_id`: a hard crash (`RaidModeView.tsx:47-48` calls `.toLowerCase()` on `boss_name` and `item_slot`), data corruption (the companion keys its item table by `String(item.wowhead_id)`, so every need row would collide on `"null"`), a silent drop (character-gear, receive-skip counts, `already_awarded`), and a half-built screen (the master sheet paints every item with no rankings red, so 145 empty need rows per tier would flood a Forever guild's master sheet the day the rows are seeded). BLP needs no SQL change: a spike on PGlite showed a need-keyed row accrues one credit for the other attendee, zero for the winner, and three recomputes leave the same state.

Four findings are not in CONTEXT.md and change the plan. (1) `loot_items` has column-level SELECT grants (`20261004040000_loot_item_officer_notes_officers_only.sql:72`); the new `kind` and `need_key` columns are unreadable by every browser session unless the Discovery migration grants them (proved in PGlite: `permission denied for table loot_items` without the grant, `ok` with it). (2) The existing bracket rule sums `allocation_cost` per bracket against a limit of 3, so need rows costing 3, 2 and 1 would raise `allocation_limit` violations on submit; D-08's claim that bracket validation keeps working without a Discovery branch holds for `classification` but not for `allocation_cost`, so the submit route needs a need branch now. (3) `PATCH /api/raid-tiers` verifies `manage_settings` for the body's `guild_id` but updates `.eq('id', tier_id)` with no check that the tier belongs to that guild; adding `list_mode` to that route without fixing this widens a cross-guild write. (4) The ROADMAP success criterion "every tier that existed before stays Known" conflicts with D-05 (existing Forever tiers flip); read it as "every legacy (non-Forever) tier stays Known".

The repo has no committed PGlite harness: prior migrations pin their shape with a regex contract test and prove behaviour in a scratchpad PGlite run that is not committed. DISC-12 says "PGlite migration test", so this phase should commit the harness. It is cheap: all 47 migrations apply on PGlite 0.5.8 with about 15 lines of stubs and the whole chain takes about 10 seconds. `@electric-sql/pglite` is a new devDependency and the legitimacy seam rates it SUS only because its latest release (0.5.10) is 5 days old; pin 0.5.8 exactly and gate the install behind a human check.

**Primary recommendation:** Ship one DDL-only migration (`list_mode`, `kind`, `need_key`, `awarded_item_id`, `loot_item_need_pins` with RLS and an integrity trigger, plus `GRANT SELECT ("kind","need_key")`), prove it with a committed PGlite harness, then ship the code PR in this order: `domain/loot/needs.ts` taxonomy, reader fixes (kind filters, `ItemLink` guard, bracket skip, master sheet "ranked needs only"), sync/backfill that flips Forever tiers and seeds 145 need rows per tier, and the `PATCH /api/raid-tiers` list_mode route with the ownership fix. Hold the officer switch by not rendering any toggle and keeping every raider-facing picker on `kind = 'item'` until Phase 4.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Discovery/Known mode of a tier | Database (`raid_tiers.list_mode`) | API (PATCH route enforces D-03/D-04) | Behaviour is DB state, never a PostHog flag (PITFALLS 14); every surface reads the same row |
| Need taxonomy (keys, names, cost, class) | Domain (`domain/loot/needs.ts`, pure) | Database (seeded rows) | One TypeScript source for seeding, picker and Desk (D-12); client-safe so no server imports |
| Need row seeding and Forever backfill | API/Backend service (`app/services`, service role) | Owner-run script (`sync:forever`) | Insert-only, Forever-only, dry-run by default; needs ids from tier inserts |
| Shape and uniqueness of need rows | Database (CHECK, partial unique index) | Domain tests | Constraints stop a malformed row from any writer, service role included |
| Reader branches (exclude, label, skip) | API/Backend (routes, `lib/`) | Browser (components) | Routes decide what leaves the server; components only render |
| Rendering a need (NeedLabel, "Needs" group) | Browser / Client | - | Display only; no link, no boss |
| Pin storage and integrity | Database (table, RLS, trigger) | - | Pins have their own RLS; trigger blocks cross-guild pins for every role |
| BLP accrual for needs | Database (`recompute_blp_for_item`, unchanged) | API (recompute call sites, unchanged) | Derived value, idempotent rebuild from history |
| Column visibility of `kind`/`need_key` | Database (column grants) | - | Browser sessions read `loot_items` by column list |
| Held switch | API (reader defaults to items) | Browser (no toggle rendered) | Cheapest hold with zero new flag infrastructure |

## Standard Stack

### Core

No new runtime dependency. Everything is the existing stack. [VERIFIED: package.json scripts `test`, `typecheck`, `lint`, `sync:forever`, `gen:types`]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | ^4.1.11 (installed 4.1.0) | Unit, route, scan and migration-contract tests | Already the runner; `// @vitest-environment node` for route and migration tests (default env is jsdom) |
| @supabase/supabase-js | ^2.90.0 | Typed service-role client in sync and routes | `createTypedServiceRoleClient` + `selectAllPagesOrThrow` are the Phase 1 read pattern every new read must follow |
| zod | 4.6.5 (exact) | Already pinned in Phase 2 | Not needed for `needs.ts`; keep the taxonomy plain TypeScript so it stays client-safe |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @electric-sql/pglite | 0.5.8 (exact, devDependency) | In-process Postgres for the migration and RLS-matrix test | DISC-12. Spiked this session: applies all 47 existing migrations plus the draft |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Committed PGlite harness | House pattern: regex contract test in repo + scratchpad PGlite proof | Cheaper (no dependency) but DISC-12 and success criterion 1 say "applies cleanly in a PGlite migration test"; a scratchpad proof is not reviewable or re-runnable. Recommend committing the harness; keep the regex contract test too (it pins header sections and statement order) |
| Partial unique index + read-then-insert for seeding | Non-partial `UNIQUE (raid_tier_id, need_key)` + `upsert(ignoreDuplicates)` | Plain unique allows NULL `need_key` for all items, so it is valid, but it indexes every legacy row for no benefit. A partial index cannot be the target of `ON CONFLICT (cols)` without its predicate (PGlite: `there is no unique or exclusion constraint matching the ON CONFLICT specification`), so seed by read-then-insert like `syncExpansionCatalog` already does |
| Flip + seed in the owner-run sync | `UPDATE raid_tiers SET list_mode = 'discovery'` inside the migration | See Seeding. Recommended: sync path, keeps the migration DDL-only |

**Installation:**
```bash
npm install --save-dev --save-exact @electric-sql/pglite@0.5.8
```

**Version verification:** `npm view @electric-sql/pglite version` returned 0.5.10 (published 2026-10-14). 0.5.8 was published 2026-08-26 (54 days before today). Maintainers include the ElectricSQL team; license Apache-2.0; repo `github.com/electric-sql/pglite`; `scripts.postinstall` is empty. [VERIFIED: npm registry, `npm view`]. The spike installed 0.5.8 with `--ignore-scripts` and ran the full chain. [VERIFIED: PGlite spike this session]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| @electric-sql/pglite | npm | multi-year; latest 0.5.10 published 2026-10-14 | ~15.8M/wk | github.com/electric-sql/pglite | SUS (reason `too-new`: the latest version is 5 days old; the package is long established) | Flagged. Pin exact 0.5.8; planner adds a `checkpoint:human-verify` task before the install |

**Packages removed due to [SLOP] verdict:** none. (Calling the seam with `@electric-sql/pglite@0.5.8` returns SLOP with reason `does-not-exist` only because the tool does not parse a version suffix; the bare name returned the SUS row above.)
**Packages flagged as suspicious [SUS]:** `@electric-sql/pglite` (checkpoint required; the install must use `--save-exact` and a version at least 30 days old).

Name provenance: the package name `@electric-sql/pglite` and the install line `npm install @electric-sql/pglite` were confirmed on the official docs page. [CITED: pglite.dev/docs]. It also appears in the repo's own history as the scratchpad harness for migrations #294 and #309. [VERIFIED: `git show 3f57adc1`, `git show b7dea47c` commit bodies]

## Architecture Patterns

### System Architecture Diagram

```
                OWNER-RUN / GUILD CREATION                          RUNTIME (per request)
   ┌──────────────────────────────────────────┐        ┌─────────────────────────────────────────────┐
   │ seedExpansionForGuild (seedMode 'sync')  │        │ raider picker (bootstrap, /api/loot-items)  │
   │ npm run sync:forever [--apply]           │        │   -> fetchFilteredLootItems  kind='item'    │  held until Phase 4
   └───────────────┬──────────────────────────┘        ├─────────────────────────────────────────────┤
                   v                                    │ save_submission_items RPC (ids only)        │
   syncExpansionCatalog (insert-only, Forever only)    │   -> submit route: bracket rules SKIP needs, │
     1. insert raid_tiers  (list_mode 'discovery')      │      copy limits use need branch             │
     2. read existing need_keys per tier                │   -> review route: snapshot by id (works)    │
     3. insert missing need rows from domain/loot/      ├─────────────────────────────────────────────┤
        needs.ts (145 per tier)                         │ master sheet / summary / Raid Mode          │
                   v                                    │   -> items + RANKED needs only, NeedLabel,   │
   loot_items (kind 'need', need_key, boss 'Needs',     │      group "Needs", skip by need identity    │
     classification, allocation_cost 3/2/1)             ├─────────────────────────────────────────────┤
                   |                                    │ exports: addon guild-data, export-string,    │
                   |                                    │   buildMemberRankedItems, gargul-dft         │
                   |                                    │   -> kind='item' only, warn once on a need   │
                   v                                    ├─────────────────────────────────────────────┤
   awards: loot_history.loot_item_id = need row         │ /api/bot/priority, reserves, BIS, loot mgmt  │
           loot_history.awarded_item_id = NULL (Phase 5)│   -> kind='item' / exclude discovery tiers   │
                   v                                    └─────────────────────────────────────────────┘
   recompute_blp_for_item(guild, need row)  (SQL unchanged)
     contenders: approved lists ranking the need row
     award_events: need awards at linked raid nights
     -> blp_credits / blp_tracking keyed by the need row id
```

### Recommended Project Structure

```
domain/loot/
├── needs.ts                      # frozen taxonomy: NEED_DEFINITIONS, key/name/cost/class, maxCopiesForNeed, alias map
├── list-mode.ts                  # pure: ListMode type, canSwitchToKnown(counts) with the D-03 rule
├── __tests__/needs.test.ts       # manifest-gate style: hand-transcribed fixture, shape checks
├── __fixtures__/need-keys.json   # independent transcription of the 145 keys (like shipped-names.json)
app/services/
├── needRowSeeder.ts              # planNeedRows (pure) + seedNeedRows (read-then-insert), used by sync and the PATCH route
├── expansionCatalogSync.ts       # MOD: tiers inserted with list_mode 'discovery', then need rows
app/components/NeedLabel.tsx      # neutral icon + name, no link; ItemLink delegates here when wowheadId is null
lib/loot/ranked-need-rows.ts      # one tier-scoped query for need rows that appear in a live ranking (master sheet, summary)
supabase/migrations/<ts>_discovery_schema.sql
app/services/__tests__/discovery-schema-migration.test.ts   # regex shape contract (house pattern)
app/services/__tests__/discovery-schema-pglite.test.ts      # behaviour: apply chain, idempotent, constraints, RLS matrix, BLP, grants
app/services/__tests__/helpers/pglite-chain.ts              # harness: stubs + apply all migrations in order
lib/loot/__tests__/need-reader-inventory.test.ts            # scan: every reader file is in the inventory with a disposition
```

### Pattern 1: Migration shape (expand-only, idempotent, validated constraints)

**What:** Add columns with constant defaults (metadata-only in Postgres 11+), add CHECKs `NOT VALID` then `VALIDATE` (validation takes `SHARE UPDATE EXCLUSIVE`, which does not block writes), create the partial unique index, create the new table with RLS in the same file, grant the new columns. Every statement is re-runnable: `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` before `ADD CONSTRAINT`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE OR REPLACE`.
**When to use:** the single Discovery migration.
**Example:** see Code Examples, "Draft migration" (applied twice in PGlite; idempotent).

### Pattern 2: Need row = a normal `loot_items` row with a discriminator

**What:** `kind = 'need'`, `need_key` set, `wowhead_id` NULL (enforced by `loot_items_need_shape_check`), `boss_name = 'Needs'`, `item_slot`/`armor_type`/`roles`/`primary_stat` filled from the taxonomy so Phase 4's existing proficiency filter keeps working on columns it already reads, `classification` and `allocation_cost` from D-06 to D-08, `is_available = true`, `is_loot_council = false`, `item_type`/`weapon_type` NULL.
**When to use:** the seeder.
**Why `boss_name = 'Needs'` rather than NULL:** `boss_name` is typed as non-null `string` in at least 8 components (`LootListContent.tsx`, `SearchableItemSelect.tsx`, `RaidModeView.tsx`, `LootListSummaryView.tsx`, `master-loot/_client.tsx`, `BossSection.tsx`, `LootSubmissionsContent.tsx`, `MasterSheetContent.tsx`) and `RaidModeView.tsx:47` calls `ir.item.boss_name.toLowerCase()`. A string sentinel makes the master sheet group them as a boss named "Needs" (D-13) with zero component changes, `getBossOrder('Needs')` falls through to `|| 999` so the group sorts last (`utils/bossOrder.ts:352`), and it matches the existing group-label convention ('Trash', 'Shared Boss Loot'). Add `'Needs'` to `CATALOG_GROUP_LABELS` (`data/raid-catalog-names.ts:50-55`) so tier-hint lookups never read it as a boss signal. [ASSUMED: owner has not seen this; D-13 says "no boss", which a sentinel satisfies visually] See Assumptions A4.

### Pattern 3: Reader branch = filter at the query, label at the render, skip with a warning once

**What:** (a) Readers that feed an external consumer or a Known-only feature add `.eq('kind', 'item')` (or filter after the read when the select is an embed). (b) Readers that display what a raider or officer actually ranked or was awarded keep need rows and render a `NeedLabel`. (c) Readers that cannot represent a need skip it through one helper that logs a single warning per request (`warnOnceNeedSkipped(requestScope)`), so D-16 is a shared utility and not 20 ad hoc `console.warn` calls.
**When to use:** every row in the Reader Audit.

### Pattern 4: Tests copy the repo's three styles

1. Frozen list: hand-transcribed JSON fixture compared with the code constant, plus shape checks (`data/expansions/__tests__/manifest-gate.test.ts`, `data/expansions/forever/__fixtures__/shipped-names.json`). Use for `needs.ts`.
2. Migration contract: regex over comment-stripped statements, anchored to a timestamp, with a `MIGRATION_FILE_OVERRIDE` env for self-checks (`app/services/__tests__/second-same-night-award-migration.test.ts`). Use for the shape pin.
3. Source scan with a floor and a synthetic self-check (`utils/supabase/__tests__/typed-client-usage.test.ts`: `MIN_ROUTE_FILES`, "flags a synthetic route", "accepts a synthetic route"). Use for the reader inventory.

### Anti-Patterns to Avoid

- **`list_mode` on the legacy seeder's insert payload.** `app/services/__tests__/__golden__/*.rows.txt` pin every row the legacy seeder sends. Adding `kind: 'item'` or `list_mode: 'known'` to those inserts changes the golden rows. Rely on the column defaults; touch only the Forever sync path. [VERIFIED: `app/services/__tests__/expansionSeeder-golden.test.ts:1-14` header]
- **A PostHog or env flag for the hold.** `useFeatureFlag` has zero consumers in `app/` today and is client-only; the PITFALLS 14 rule is behaviour in DB state. Hold by default-to-items, not by flag.
- **Keying need received-skip on `wowhead_id`.** Every need row shares `wowhead_id = null`, so the key `${character_id}-null` would pool all of a raider's needs.
- **Upserting need rows through PostgREST `on_conflict`.** The unique index is partial; see Alternatives.
- **Selecting `*` or the new columns from a browser session without the grant.** See Pitfall 1.
- **Putting `if (discovery)` branches inside the 2,000-line components.** Put the branch in a pure helper (`ranked-need-rows`, `isNeedRow`, `itemIdentityKey`) and call it from the component.

## Reader Audit (DISC-06)

Every reader of `loot_items`, `loot_submission_items` or `loot_history` in `app/`, `lib/`, `domain/`, `utils/`, `companion/`, `discord-bot/`, plus the SQL. Line numbers are from files opened this session. "Today" is what a need row (`wowhead_id` null, `boss_name` 'Needs' or null) does to the reader unchanged. Dispositions: **EXCLUDE** = add `kind = 'item'` (D-14), **LABEL** = keep and render a NeedLabel (D-13), **KEY** = key by need identity, **OK** = works by id, add a test only, **GUARD** = shared skip-and-warn (D-16). The Phase 4 column says what must change when the picker goes live.

Discovery of the list: `git ls-files` + `grep` for `from('loot_items'|'loot_submission_items'|'loot_history')`, nested `loot_items(`, `loot_item:loot_items(`, `loot_submission_items (`, and the two RPCs. [VERIFIED: grep output this session] Scripts under `scripts/` (seed, migrate, fix-* one-offs) and `scripts/analytics/queries/*.sql` are admin tooling, not request-time readers; they are listed as "scripts" at the end.

### A. Raider and officer pickers, classification editors (hold the switch)

| # | Reader (file:lines) | Today with a need row | Disposition |
|---|---|---|---|
| A1 | `lib/loot-items-query.ts:144-158` `fetchFilteredLootItems`, called by `app/api/loot-list/bootstrap/route.ts:165` and `app/api/loot-items/route.ts` GET | The raider's item picker. A need row would appear as an item with no boss; `canClassUseItem(item.wowhead_id, ...)` and `getItemTypeInfo(item.wowhead_id)` run on `null` | EXCLUDE (`.eq('kind','item')`) with an `includeNeeds` option that Phase 4 passes for Discovery tiers. This is the main hold. Test: `lib/__tests__/loot-items-query.test.ts` |
| A2 | `app/api/bis-items/route.ts:215-222` | Maps `itemsByWowheadId[item.wowhead_id] = item`, a need row writes key `"null"` | EXCLUDE (D-14). Also skip in `LootListContext.tsx` BIS import (it calls this route) |
| A3 | `app/api/loot-items/route.ts` PATCH, allowlist at `:164`, row read at `:178` | An officer could rewrite `classification`/`allocation_cost`/`roles` of a need row, breaking D-06/D-08 and the frozen taxonomy | GUARD: reject `kind = 'need'` rows with 400 ("Need rows are fixed") before the update. Same for `app/api/loot-items/specs/route.ts:66` and `officer-notes/route.ts:79` |
| A4 | `app/(app)/loot-management/components/LootSettingsContent.tsx:663` (client query), `PriorityListTab.tsx:342` (client query) | Officer classification and priority editors list every item of the phase's tiers | EXCLUDE (`.eq('kind','item')`). `kind` is readable once the column grant ships |
| A5 | `app/api/reserve-runs/items/route.ts:19`, `reserve-runs/[id]/route.ts:124`, `reserve-runs/join/[token]/route.ts:142` and `:395`, `reserve-runs/[id]/awards/route.ts:80` | Soft-reserve item lists and validation for a tier; the join route is unauthenticated | EXCLUDE all five; `POST /api/reserve-runs` and `GET /api/reserve-runs/raid-tiers` (reads `raid_tiers` at `:41`) exclude `list_mode = 'discovery'` tiers (D-14) |
| A6 | `app/(app)/raid-tracking/_client.tsx:1245`, `raid-tracking/import/_client.tsx:255` | Loads every item of the expansion's tiers to match pasted loot lines by name | EXCLUDE |
| A7 | `app/api/admin/sheet-import/route.ts:151` (read) and `:224` (update by id) | Admin classification import matched by name | EXCLUDE on the read so an update can never target a need row |
| A8 | `app/api/prio-list/route.ts:58` (embeds `loot_item:loot_items(...)` from `guild_item_priorities`) | No priority rows exist for needs | OK, no change. Test only that a null `wowhead_id` embed does not throw |

### B. Submission lifecycle (ids only, mostly works)

| # | Reader | Today | Disposition |
|---|---|---|---|
| B1 | `save_submission_items` (RPC; `20260727000001_fix_save_submission_items_ownership.sql`) | Inserts `(submission_id, loot_item_id, rank, slot)` from JSON; no item metadata read | OK |
| B2 | `app/api/loot-submissions/submit/route.ts:87-93` select, `:144-172` validation | Feeds `classification`, `item_type`, `item_slot`, `allocation_cost` to `validateBracketRules`. **Need costs 3/2/1 would trip `allocation_limit` (limit 3 per bracket)** | KEY/branch: drop `kind = 'need'` rows from `validateBracketRules` input (add `kind` to the select); keep them in `validateItemCopyLimits`. Phase 4 adds a server budget check (DISC-03). Test: `app/api/loot-submissions/submit/__tests__/route.test.ts` |
| B3 | `domain/loot/bracket-validation.ts:112, 175, 264` | Sums `allocation_cost` per bracket (limit 3, ranks 50-39); Rule 4 treats `Reserved` as "alone at its rank" | Add `kind?: string` to `BracketItem` and skip need entries in `validateBracketRules`, `canPlaceInBracket`, `placeInBracket`. Test: `domain/loot/__tests__/bracket-validation.test.ts` |
| B4 | `domain/loot/item-copies.ts:34-35` `copyGroupKey` | Already falls back to `id:${item.id}` when `wowhead_id` is null | OK |
| B5 | `domain/loot/slot-capacity.ts:88-108` `maxCopiesForItem` | `isUniqueEquipped(null)` is `undefined`, so Finger and Trinket fall to the unflagged default of 1 (`MAX_COPIES_WHEN_UNIQUE_UNKNOWN` only lists `'One-Hand': 2`) | Add `kind?: 'item' \| 'need'` and, for needs, return `maxCopiesForNeed(item_slot)`: 2 for Finger and Trinket, 1 otherwise. Test: `domain/loot/__tests__/slot-capacity.test.ts` |
| B6 | `app/api/loot-submissions/review/route.ts:247-263` | Snapshot `{rank, slot, loot_item_id, item_name}`; name comes from `loot_item.name` | OK (the need display name is the snapshot name). Test with a need row |
| B7 | `app/api/loot-submissions/revert/route.ts:125-160` | Re-inserts by `loot_item_id` | OK |
| B8 | `domain/loot/list-diff.ts` (officer review diff), `LootSubmissionsContent.tsx:685-690` | Keyed by `loot_item_id` and name | OK; render via `ItemLink` guard (E1) |
| B9 | `app/api/loot-submissions/remove-item/route.ts:35-50, 198, 217, 276, 292`, `lib/loot/loot-history-rows.ts` | `already_obtained` inserts a `loot_history` row with `loot_item_id` = the need row, `awarded_item_id` NULL: exactly D-15 | OK (the intended need-award path). Test |
| B10 | `app/api/loot-submissions/route.ts:70`, `loot-list/bootstrap/route.ts:187`, `loot-submissions/item-counts/route.ts:145`, `master-loot/_client.tsx:219, 304, 307`, `admin/diagnose/route.ts:86`, `characters/[id]/route.ts:310`, `user/delete-account/route.ts:122` | Ids and counts only; deletes cascade by FK | OK |
| B11 | `get_guild_submissions` SQL (baseline `:393-420`) | `item_count` counts all live items | OK |
| B12 | Triggers `enforce_loot_submission_item_rules`, `enforce_loot_submission_status_rules` (`20260930000000`) | Check parent list status and membership only | OK |

### C. Master sheet, summary, Raid Mode (the visible half-built-screen risk)

| # | Reader | Today | Disposition |
|---|---|---|---|
| C1 | `MasterSheetContent.tsx:718-722` (loads all items of the active tiers), `:1254-1258` (per-tier loader for the Gargul export), `lib/loot/master-sheet-summary.ts:60-64` | Would load 145 need rows per Discovery tier; `BossSection.tsx:253` and `:402` paint any non-council item with zero rankings `bg-destructive/10` (red), so every unranked need would show red | Load items as today (`kind = 'item'`); for tiers with `list_mode = 'discovery'` add the ranked need rows via `lib/loot/ranked-need-rows.ts` (one tier-scoped embedded-inner query, see Code Examples). Unranked needs never render. Phase 4 removes the filter for Discovery tiers |
| C2 | `MasterSheetContent.tsx:781-790, 826-831, 916-921` receive skip by `${character.id}-${wowhead_id}` | `wowheadIdSet` holds `null`; need awards never count, so a raider who won a need keeps the entry | KEY: introduce `itemIdentityKey(item)` = `wowhead_id != null ? String(wowhead_id) : 'need:' + id` in `domain/loot/` and use it for the history counts and the skip candidates. See Open Question 3 |
| C3 | `master-sheet-summary.ts:151-182` | `awardedCounts[item.wowhead_id]` is `undefined` for needs, so `already_awarded` reads 0 | KEY: count need awards by `loot_item_id` |
| C4 | `BossSection.tsx:258, 408`, `ItemCandidateModal.tsx:460, 692`, `RaidModeView.tsx:118` | `ItemLink` with `wowheadId` null | LABEL via the `ItemLink` guard (E1) |
| C5 | `RaidModeView.tsx:47-48` | `ir.item.boss_name.toLowerCase()` and `ir.item.item_slot.toLowerCase()` throw if either is null | Fixed by the 'Needs' sentinel and a non-null `item_slot`; add a defensive `?? ''` and a test with a need row |
| C6 | `app/api/master-sheet/visibility/route.ts:41, 269` | Resolves allowed ids and rankings by id | OK. Test with a need id |
| C7 | `MasterSheetContent.tsx` BLP: `blpKey = ${character.id}-${item.id}` | Works for needs (BLP keyed by the need row id) | OK |
| C8 | `app/api/blp/route.ts:63-72` | `item_ids` is a GET query string | OK, but see Pitfall 7 on id-list length |

### D. Exports and external consumers (D-14: items only)

| # | Reader | Today | Disposition |
|---|---|---|---|
| D1 | `app/api/addon/guild-data/route.ts:132` loads all items of the tiers; `:206-215` emits `wowhead_id: item.wowhead_id`; `:143` nested `loot_items (wowhead_id)`; `:263-268` BLP map by `loot_item_id` | `items[]` gains rows with `wowhead_id: null`. The companion then writes `result[String(item.wowhead_id)]` (`companion/src/main/addon-format.ts:367`), so all needs collide on `"null"` and corrupt the addon's item table | EXCLUDE: `.eq('kind','item')` on the items read; filter `blp` to item ids; `buildMemberRankedItems` gets the `kind`-aware branch (D4) |
| D2 | `app/api/addon/export-string/route.ts:130` (embedded `loot_items(...)`; tiers must stay in the result, so filter the embed with `.eq('loot_items.kind','item')` or in JS when flattening at `:141-145`) [ASSUMED: PostgREST embed filter syntax not exercised; the JS filter is the safe default], `:190-193` nested wowhead select, `:228-233` BLP | Same payload shape as D1 | EXCLUDE (flatten with `item.kind === 'item'`; add `kind` to the select), filter `blpData` to item ids. `stats.items` keeps counting items only |
| D3 | `lib/addon/member-ranked-items.ts:89-91` `if (!wowheadId) continue` and `:160-161` `wowheadId == null` | Already skips needs, but silently | GUARD: replace with a branch that counts skipped need rows and logs one warning per request (D-16). Test: `lib/addon/__tests__/member-ranked-items.test.ts` |
| D4 | `domain/loot/gargul-dft.ts:62` `if (!wowheadId \|\| wowheadId <= 0) continue` | Skips silently | GUARD with an explicit named test "skips need rows" (and the same warn-once helper at the caller) |
| D5 | `app/api/bot/priority/route.ts:93-98, 110-115` (`ilike('name', ...)`), `:151-155` (sibling rows by `wowhead_id`), `:185-191` rankings | A query like "chest" matches a need named "Chest, Plate, Strength"; the route then answers with `item_wowhead_id: null` | EXCLUDE: `.eq('kind','item')` on all three loot_items reads (D-14, deferred Phase 5) |
| D6 | `app/api/addon/loot-award/route.ts`, `addon/import-string/route.ts`, `lib/loot/guild-scoped-lookup.ts:258, 346, 404, 490` | Resolve by `wowhead_id`; a need row never matches | OK by construction; a unit test that a need row is never returned by `findGuildLootItemsByWowheadIds` |
| D7 | `app/api/addon/attendance/route.ts:110-127`, `app/api/attendance/bulk/route.ts` | Call `recompute_blp_for_event`, which loops `DISTINCT loot_item_id` from `loot_history` | OK (need ids included automatically) |

### E. Display of awards and history

| # | Reader | Today | Disposition |
|---|---|---|---|
| E1 | `app/components/ItemLink.tsx:50` (`wowheadId: number`), `:67-71` icon lookup, `:88-95` href `.../item=${wowheadId}` | 43 call sites in 21 files; a null id yields `item=null` links and a Wowhead tooltip request for `null` | LABEL: split into a hooks-free outer `ItemLink` that returns `<NeedLabel name=... />` when `wowheadId == null` and an inner `WowheadItemLink` with the existing body. One guard covers all 43 sites. Test: `app/components/__tests__/ItemLink.test.ts` |
| E2 | `app/api/loot-history/route.ts:94-118, 155, 244` | Returns `loot_items {name, wowhead_id, boss_name}` | OK; includes `awarded_item_id` later (Phase 5) |
| E3 | `app/api/loot-history/bulk/route.ts:56, 352, 399-412` (POST), `:501-553` (DELETE), `:660-725` (PATCH) | Keyed by `loot_item_id`; recompute collects `loot_item_id` where `raid_event_id` is set | OK (the need award path). Test: POST with a need `loot_item_id` calls `recomputeBlpForItems` with the need id |
| E4 | `app/api/character-gear/route.ts:111-147` | `.filter((item) => item.wowhead_id)` silently drops need awards from "awarded gear" | GUARD (explicit filter on `kind`, warn once) |
| E5 | `lib/discord-loot-announcements.ts:101-112`, `app/api/discord/post-raid-summary/route.ts:148-156, 276-290` | `wowheadLink` returns `**name**` with no link when the id is falsy | OK. Test only |
| E6 | `DashboardContent.tsx:853, 1181, 1305, 1360-1368, 1461, 1751` | Raider's own ranked items by id; `receivedWowheadIds` skips `null` ids | OK for display (LABEL via E1); receive-filter KEY with C2 |
| E7 | `raid-tracking/_client.tsx:538, 657-663, 1885`, `utils/raid-events/link-unlinked-awards.ts:130-188`, `LootHistoryTab.tsx`, `PlayerLootModal.tsx`, `RaidMemberList.tsx`, `ReassignLootModal.tsx` | Loot history by raid event and by id; `ItemLink` for display | OK + LABEL via E1 |
| E8 | `app/api/audit-logs/route.ts`, `utils/analytics/funnel.ts:101`, `utils/analytics/master-loot-events.ts`, `app/api/guild-count/route.ts:24`, `landing-stats/route.ts:25`, `admin/analytics/route.ts:208`, `guild-settings/route.ts:370` | Counts and existence checks; recompute call | OK |

### F. SQL functions and triggers

| # | Reader | Disposition |
|---|---|---|
| F1 | `recompute_blp_for_item` (`20260721000001_add_blp_reset_anchor.sql:34-160`), `recompute_blp_for_event` (`20260609000001_blp_recompute_from_history.sql:148-174`), `recompute_blp_for_guild` (`20260721000001:168-175`), `increment_blp(_bulk)`, `reset_blp` | UNCHANGED. Key everything on `loot_item_id`; see BLP section |
| F2 | `enforce_loot_history_guild_refs` (`20260929180000`) | UNCHANGED: resolves the need row's tier, expansion and guild exactly like an item row. Do not extend it to `awarded_item_id` in this phase (nothing writes it); do it in the Phase 5 migration that adds the writer |
| F3 | `delete_guild`, `reset_guild_season`, `seed_tbc_expansion*` | UNCHANGED. `loot_item_need_pins` has `ON DELETE CASCADE` on `guild_id`, `item_id` and `need_id` |

### Scripts (not request-time)

`scripts/*.ts`, `scripts/*.js` one-offs and `scripts/analytics/queries/**/*.sql` read `loot_submission_items`/`loot_history` for admin and metrics. After Phase 4 the SQL in `wow-classic-loot-systems-2026/` (median list length, bracket coverage) would count need rows; add `AND li.kind = 'item'` if those queries are ever rerun for a Forever sample. No Phase 3 change. [ASSUMED: not exercised]

### Reader inventory test (D-16 made enforceable)

`lib/loot/__tests__/need-reader-inventory.test.ts`: a typed array `NEED_READERS: Array<{ file: string; disposition: 'exclude' | 'label' | 'key' | 'ok' | 'guard'; note: string }>`; the test walks `app`, `lib`, `domain`, `utils` for files whose source matches `/from\(['"](loot_items|loot_submission_items|loot_history)['"]\)|loot_items ?\(|loot_item:loot_items/`, excluding `__tests__`, and fails when a file is missing from the array or the array names a file that no longer matches. Include a floor (the repo has about 55 matching files) and two synthetic self-checks, as in `typed-client-usage.test.ts`. This is what makes "every reader has a mode branch" reviewable and stops the next reader from being forgotten.

## Migration Spec (DISC-12)

Name: `supabase/migrations/<UTC timestamp>_discovery_schema.sql`, timestamp after `20261013120000` (newest existing) and unique. The draft below used `20261020120000`. The test anchors to the timestamp, not a directory scan (the `#309` lesson in `second-same-night-award-migration.test.ts`).

What it contains, in order (one statement per line in the shape test):

1. `SET LOCAL lock_timeout = '5s';`
2. `raid_tiers.list_mode text NOT NULL DEFAULT 'known'`; CHECK `('known','discovery')` `NOT VALID`, then `VALIDATE`.
3. `loot_items.kind text NOT NULL DEFAULT 'item'`, `loot_items.need_key text`; CHECK `kind IN ('item','need')` `NOT VALID` + `VALIDATE`; shape CHECK `(kind='need' AND need_key IS NOT NULL AND wowhead_id IS NULL) OR (kind='item' AND need_key IS NULL)` `NOT VALID` + `VALIDATE`; `CREATE UNIQUE INDEX ... (raid_tier_id, need_key) WHERE kind='need'`.
4. `loot_history.awarded_item_id uuid REFERENCES loot_items(id) ON DELETE SET NULL` + partial index.
5. `loot_item_need_pins` table (unique `(guild_id, item_id)`, `item_id <> need_id`, FKs `ON DELETE CASCADE`), RLS on, three policies (SELECT active member or officer; INSERT and DELETE officer; **no UPDATE policy**: unpin is a delete), grants (`authenticated`: SELECT, INSERT, DELETE; `service_role`: ALL).
6. `enforce_loot_item_need_pin_refs` trigger function (item is `kind='item'`, need is `kind='need'`, same guild, same raid tier; the RLS-masking pattern used by `enforce_reserve_award_refs` so a non-officer sees the RLS error), `REVOKE ALL ... FROM PUBLIC, anon, authenticated`.
7. **`GRANT SELECT ("kind", "need_key") ON TABLE "public"."loot_items" TO "anon", "authenticated";`** (Pitfall 1).

What it must NOT contain: any `UPDATE`/`INSERT`/`DELETE` of data (the Forever flip and need rows go through the sync, see Seeding), the loot-cost `guild_settings` columns (Open Question 4), any change to the `loot_submission_items.slot` CHECK (SUMMARY proposed `BETWEEN 1 AND 8` for tier pieces; Decision 3 keeps tier off the picker, and the cap lives in TypeScript), any trigger on existing tables, any `DROP` of existing objects, `CONCURRENTLY` (the deploy script sends the file as one statement batch; `scripts/deploy-migrations.sh` header and `20261001120000` header).

Header comment sections to copy from the house style (the contract test pins them): Problem, Fix, Readers and writers checked, Error contract, Production safety (lock_timeout, idempotent, no existing row can fail the file), Not changed, Deploy (one migration-only PR, `--admin` merge, non-raid day, about 12 seconds), Rollback (forward migration; note `kind`/`need_key`/`list_mode`/`awarded_item_id` columns can be dropped only after need rows and awards are removed).

Types: after the migration is live, regenerate `lib/database.types.ts` (`npm run gen:types`, which needs the Supabase CLI logged in to the production project) or hand-apply the same diff as PR #342 did for `award_copy`/`source_award_key` (a 6-line generated-style diff, [VERIFIED: `git show 4b3f66e6 -- lib/database.types.ts`]). Either way `npm run typecheck` is the gate: `createTypedServiceRoleClient` rejects a select of a column that is not in the types.

### Deploy sequence (carried from the Phase 1/2 and #331 precedents)

1. PR-A migration-only (plus the migration contract test and, if the harness is committed, the PGlite test and the devDependency; these are not "migration-only" for CodeQL, so decide whether PR-A carries tests or they ride PR-B; the precedent #331/#342 put tests with the migration). Merge with `--admin` on a non-raid day. `deploy-migrations.yml` runs on push to main with `supabase/migrations/**`.
2. Confirm applied: `gh run list --workflow=deploy-migrations.yml --limit 1` shows success (the workflow echoes `apply <file>`).
3. PR-B code (types regen first, then readers, sync, route). Cherry-pick onto `main` as Phase 1 did (PR #456).
4. Owner runs `npm run sync:forever` (dry run) then `-- --apply` against production (service role in `.env.local`), reviews the report, then `npm run sync:forever` again to see zero changes.

## Seeding and the Forever backfill (D-01, D-05, D-11)

Current state: `syncExpansionCatalog` (`app/services/expansionCatalogSync.ts:109-145`) inserts only missing `raid_tiers` rows in one bulk insert; it never writes `loot_items` and, per its header (`:1-10`), "never updates, deletes or upserts a row". Forever manifests carry no items (`FOREVER_MANIFEST.raids[].bosses` only). The legacy loop is separate and golden-pinned.

**Recommended (planner's D-05 decision): both the flip and the need rows go through the extended sync, not the migration.**

- Why: the migration stays DDL-only, so its PGlite test needs no fixtures and the `--admin` review is a pure schema review. One TypeScript path (`planNeedRows` from `domain/loot/needs.ts`) creates need rows for new guilds, the owner-run backfill and the officer switch. The dry-run report is the "reviewed" step D-05 asks for. A Forever guild created between the migration and the code deploy keeps tiers at the `known` default, and the sync heals it on the next run; an in-migration `UPDATE` would not.
- Change: `ForeverTierInsert` gains `list_mode: 'discovery'`; `syncExpansionCatalog` inserts tiers with `.select('id, name')`, then calls `seedNeedRows(supabase, tierIds)`. For matched (existing) tiers, a separate exported function `flipTiersToDiscovery` updates `list_mode` only where it is `'known'` **and** the expansion is the Forever expansion **and** no `loot_submission_items` or `loot_history` reference a need row of that tier (nothing can, today). This is the one deliberate exception to "insert-only"; update the file header and the `fake.writes()` assertions in `app/services/__tests__/expansionCatalogSync.test.ts:170, 235, 282, 311` accordingly (they currently assert zero non-insert writes on matched tiers).
- `seedNeedRows`: read the existing `need_key` set for the tier ids (paged with `selectAllPagesOrThrow`), insert only missing rows in chunks (about 435 rows for three tiers; one insert per tier is fine). A unique violation on the partial index means a concurrent run; treat as "rerun heals", like the duplicate-tier note in the sync header.
- `scripts/lib/forever-sync.ts` report: add per-expansion `needRowsToInsert` and `tiersToFlip` counts (ids and counts only, no names; `formatForeverSyncReport` already follows that rule). Exit code logic unchanged.
- Alternative (acceptable, noted for completeness): a single idempotent `UPDATE raid_tiers rt SET list_mode = 'discovery' FROM expansions e WHERE e.id = rt.expansion_id AND e.name = 'Forever' AND rt.list_mode <> 'discovery'` in the migration. Its advantage is that a PGlite fixture can prove "legacy tiers untouched, Forever flipped" at the SQL level; its costs are the gap-window issue above and a data change in a "migration-only" PR. If chosen, the success-criterion-2 test lives in the PGlite file.

**Success criterion 2 wording.** The ROADMAP says "every tier that existed before stays Known"; D-05 flips existing Forever tiers. The test must assert "every non-Forever tier stays `known`, every Forever tier is `discovery` after the backfill, and the Loot Score golden fixtures are byte-identical". Raise this with the owner when the plan is reviewed so verification does not fail on the literal ROADMAP text. [Conflict found by reading ROADMAP and CONTEXT]

**Officer switch (DISC-01) semantics, Phase 3 API only.** `PATCH /api/raid-tiers` accepts `updates.list_mode` in `{'known','discovery'}`:
- `manage_settings` via `verifyPermission` (already at `route.ts:111`), and **a new ownership check**: the tier's `expansion_id` must belong to `guild_id` (read `raid_tiers.expansion_id`, then `expansions.guild_id`; 404 otherwise). The existing handler updates `.eq('id', tier_id)` with no such check (`route.ts:111-131`), so an officer of any guild can already PATCH `is_guild_active` on another guild's tier by id. Fix it for all fields in the same change; legitimate calls are unaffected.
- To `discovery`: allow only when the tier's expansion is Forever (A6, Open Question 2), then `seedNeedRows` for that tier. To `known`: apply D-03 with `canSwitchToKnown({ rankedNeedCount, needAwardCount })` computed from `loot_submission_items` (any row, removed or not, on this tier's need rows) and `loot_history` (any row with `loot_item_id` in this tier's need rows). On block respond 409 with a fixed reason string. Keep need rows on the switch back to Known (readers filter on `kind`; deleting is unnecessary and risky).
- `GET` adds `list_mode` to the select at `route.ts:48`.
- Audit log via the existing `logAudit` pattern.

## The held switch (D-02, D-03, D-04)

Mechanism: **no UI toggle in Phase 3, and raider-facing readers default to items**. There is no feature-flag infrastructure to reuse: `useFeatureFlag` (`utils/feature-flags.ts:10`) has no consumers under `app/`, is client-only and returns false while loading, and PITFALLS 14 rules it out for behaviour. The three layers:

1. **Data:** need rows exist (seeded) but are invisible to raiders: A1 (`fetchFilteredLootItems` items only), C1 (master sheet shows only ranked needs). No raider can rank a need (no picker, A1), so the master sheet stays unchanged for every Forever guild until Phase 4.
2. **API:** the `PATCH` route and `list_mode` GET field ship and are tested; D-03/D-04 logic is complete.
3. **UI:** do not add the toggle. Correction to CONTEXT: the tier toggles are not in `ExpansionManager.tsx`; they are `handleToggleGuildActive` and `handleToggleMasterSheetVisibility` in `app/(app)/expansions/[expansionId]/_client.tsx:371-420`, gated by `hasPermission('manage_settings')` at `:234`. Phase 4 adds the list-mode control there.

Phase 4 flips two switches: `includeNeeds: true` for Discovery tiers in `fetchFilteredLootItems` and removal of the "ranked only" filter in C1. State that in the Phase 3 plan so Phase 4 knows exactly what to change.

## BLP for need awards (DISC-07), verified

`recompute_blp_for_item` (`20260721000001_add_blp_reset_anchor.sql:34-160`) rebuilds one `(guild, loot_item)` bucket from history: it deletes the bucket's `blp_credits` and `blp_tracking` rows (`:68-69`), then rebuilds. Contenders are `loot_submission_items.loot_item_id = p_loot_item_id` on approved lists (`:73-77`); award events are `loot_history` rows with `loot_item_id = p_loot_item_id` and a `raid_event_id` (`:88-92`); a "pass" is a contender who attended an award event and did not win it after their last win. Keyed purely on `loot_item_id`, so with D-15 (`loot_history.loot_item_id` = the need row) it works unchanged. Caller paths all pass ids through: `utils/blp/recompute.ts:23, 43`, `loot-history/bulk` POST/DELETE/PATCH, `addon/attendance`, `attendance/bulk`, `addon/import-string`, `guild-settings` reset anchor (`recompute_blp_for_guild` loops `DISTINCT loot_item_id` from `loot_history`).

PGlite spike result (draft migration applied; guild with BLP enabled, one Discovery tier, two need rows, two approved lists ranking the same need, two raid events, both raiders attended both; need awarded to raider A at event 1 with `awarded_item_id` NULL):

```
BLP after 1st recompute    [{"name":"B","times_passed":1}]
BLP after 3rd recompute    [{"name":"B","times_passed":1}]
credits for the need       [{"c":1}]
BLP after event recompute  [{"name":"B","times_passed":1}]
```

So the winner (A) holds zero, the other attendee (B) holds one credit, and recomputing three times, or through the event path, gives the same state (success criterion 4). "Before any item exists" means: accrual needs a need award at a linked raid night (the award is what makes the night count), not a real item; nothing in the SQL needs `awarded_item_id`. `enforce_loot_history_guild_refs` accepted the need-keyed insert (it resolves the need row's tier, expansion and guild like any item). The Desk (Phase 5) writes `awarded_item_id`; Phase 3 only adds the column.

Where `awarded_item_id` must be read later: reports that show item names (loot-history list, Discord post, character gear, receive counts for Known transition). Phase 3 selects it nowhere; it only exists and is nullable.

## Need taxonomy proposal (D-09 to D-12) [ASSUMED pending owner review]

145 rows per Discovery tier: **19 Big (cost 3, Reserved), 22 Medium (cost 2, Limited), 104 Standard (cost 1, Unlimited)**. Counts computed by script from the matrix below. Every default row in `.planning/research/FEATURES.md` ("Defaults by class and spec", all 22 specs) exists in this set (checked by hand; the planner's test fixture should include that cross-check).

**Key format:** `<slot>[.<armour>].<stat>`, lowercase kebab segments, `.` separator (matches the D-10 example `two-hand-weapon.strength`; settles SUMMARY Disagreement 8, whose `|` and `:` alternatives are dropped). **Stat-family keys:** `strength`, `agility`, `tank`, `spell-damage`, `healing`, `physical`. **Armour keys:** `cloth`, `leather`, `mail`, `plate`. Display name: slot name, optional armour, stat, joined by `, ` in sentence case ("Chest, Plate, Strength", "Trinket, Spell damage"). No em dashes anywhere.

| Slot key | Display | `item_slot` column | Class / cost | Armour | Stat families |
|---|---|---|---|---|---|
| `two-hand-weapon` | Two-hand weapon | Two-Hand | Reserved / 3 | none | strength, agility, tank, spell-damage, healing |
| `main-hand-weapon` | Main hand weapon | Main Hand | Reserved / 3 | none | strength, agility, tank, spell-damage, healing |
| `off-hand-weapon` | Off-hand weapon | Off Hand | Reserved / 3 | none | strength, agility |
| `ranged-weapon` | Ranged weapon | Ranged | Reserved / 3 | none | agility, spell-damage, healing (wands are the caster ranged slot) |
| `trinket` | Trinket | Trinket | Reserved / 3 | none | physical, spell-damage, healing, tank |
| `ring` | Ring | Finger | Limited / 2 | none | physical, spell-damage, healing, tank |
| `neck` | Neck | Neck | Limited / 2 | none | physical, spell-damage, healing, tank |
| `back` | Back | Back | Limited / 2 | none | physical, spell-damage, healing, tank |
| `shield` | Shield | Shield | Limited / 2 [A2] | none | tank, healing, spell-damage |
| `off-hand-item` | Off-hand item | Held In Off-hand | Limited / 2 [A2] | none | spell-damage, healing |
| `relic` | Relic | Relic | Limited / 2 [A2] | none | strength, agility, tank, spell-damage, healing |
| `head`, `shoulders`, `chest`, `wrist`, `hands`, `waist`, `legs`, `feet` | Head, Shoulders, Chest, Wrist, Hands, Waist, Legs, Feet | Head, Shoulder, Chest, Wrist, Hands, Waist, Legs, Feet | Unlimited / 1 | cloth: spell-damage, healing. leather: agility, tank, healing, spell-damage. mail: agility, strength, spell-damage, healing. plate: strength, tank, healing | per armour class (13 rows per slot) |

Other column mappings (so Phase 4's existing proficiency filter and `copyGroupKey`/`maxCopiesForItem` keep working): `armor_type` = Cloth/Leather/Mail/Plate for the 8 armour slots, else NULL; `roles` from the stat family using the existing `Role` type (`strength`/`agility`/`physical` -> `['physical']`, `tank` -> `['tank']`, `healing` -> `['healer']`, `spell-damage` -> `['caster']`; `domain/loot/spec-role-mapping.ts:4`); `primary_stat` = 'Strength' or 'Agility' for those two families, else NULL; `item_type`, `weapon_type`, `wowhead_id` NULL; `boss_name = 'Needs'`; `is_available = true`; `is_loot_council = false`. `item_slot` values reuse the vocabulary already in `data/*-raids.ts` ('Finger', 'Held In Off-hand', 'Shoulder', ...). [VERIFIED: grep of `slot:` values across `data/*.ts` this session]. `maxCopiesForNeed`: 2 for `item_slot` Finger or Trinket (`MAX_COPIES_PER_SLOT`, `slot-capacity.ts:25-29`), 1 otherwise.

Frozen-list rules for `needs.ts` and its test: `NEED_DEFINITIONS` is `as const` and frozen; each entry carries `key`, `name`, `slot`, `armour`, `stat`, `cost`, `classification`, `previousKeys: []`, `previousNames: []` (alias slots, as `previousNames` on raids). Test: (1) deep-equal against `__fixtures__/need-keys.json`, hand-transcribed independently (planner generates once and commits; later edits must change both, which is the guard); (2) keys unique and match `^[a-z-]+(\.[a-z-]+){1,2}$`; (3) `cost` and `classification` mirror D-06 to D-08 for every row (3/Reserved, 2/Limited, 1/Unlimited); (4) no em dash or en dash in any name; (5) every `previousKeys` entry resolves to a current key; (6) count equals 145 and the per-cost counts equal 19/22/104; (7) the 22 spec defaults from FEATURES all resolve to a key.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| One shared "skip a need row and warn once" | A `console.warn` in each of ~12 readers | One helper in `lib/loot/need-skip.ts` taking a per-request scope object | D-16 says once per request; N call sites drift |
| Paging and error-checking reads | A new `.range()` loop | `selectAllPagesOrThrow` from `utils/supabase/paginate.ts` | Phase 1 rule: a failed page must throw, never return a short list |
| Typed client | `createServiceRoleClient()` in addon/bot code | `createTypedServiceRoleClient()` | `typed-client-usage.test.ts` fails the build otherwise |
| Per-request item identity | `wowhead_id ?? id` inline | `itemIdentityKey(item)` in `domain/loot/` | Receive-skip appears in at least 5 places |
| Guild-scope of an id | A new join | `resolveGuildLootItemIds` (`lib/loot/guild-scoped-lookup.ts`) | Already used by bulk awards; works for need ids |
| Migration shape assertions | New regex helpers | Copy `stripComments`, `splitStatements`, `blankStrings` from `second-same-night-award-migration.test.ts` | Same file conventions |
| In-memory Postgres | Mocking SQL with fakes for RLS | PGlite harness | A fake cannot prove a policy or a column grant; both are the point of DISC-12 |
| Pin integrity | Application-only checks | The trigger in the migration | Service-role writes skip RLS; the trigger applies to every role (the `enforce_reserve_award_refs` pattern) |

**Key insight:** Phase 3 adds almost no new logic. It reuses ids, the existing recompute and the existing seed path, and spends its effort on proving that ~55 readers behave. The risk is a forgotten reader, so the enforcement artifact (inventory scan) matters more than any single fix.

## Runtime State Inventory

Phase 3 changes stored data (it backfills existing Forever tiers), so each category is answered.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Production `raid_tiers` rows of every Forever expansion (count unknown here; the owner's dry run reports it). No `loot_items` exist for Forever tiers (the manifest has no items). No `loot_submission_items`/`loot_history` can reference a need row yet (no picker, no seeded needs). | Data migration through `npm run sync:forever -- --apply` (flip `list_mode` on matched tiers, insert 145 need rows per tier). It is a code-driven backfill, not a rename; no existing record's key changes |
| Live service config | None. Stripe, Discord, PostHog hold no tier or need identifiers. The Discord loot announcement shows the need name in bold if a need is awarded (E5) | None |
| OS-registered state | None | None |
| Secrets and env vars | The owner-run script reads the service-role key from `.env.local` (existing). No new variable | None |
| Build artifacts | `lib/database.types.ts` is generated and stale until regenerated after the migration is live. The companion app (`companion/`) is a separate build that consumes `guild-data`; it needs no change if D1 filters needs out | Regenerate types in PR-B; no companion release |

## Common Pitfalls

### Pitfall 1: New `loot_items` columns are unreadable by every browser session
**What goes wrong:** `20261004040000_loot_item_officer_notes_officers_only.sql:70-72` revokes table-level SELECT from `anon` and `authenticated` and grants a literal column list: `GRANT SELECT ("id", "raid_tier_id", "name", "boss_name", "item_slot", "wowhead_id", "icon_url", "notes", "created_at", "classification", "item_type", "allocation_cost", "is_available", "roles", "armor_type", "weapon_type", "is_loot_council", "primary_stat") ON TABLE "public"."loot_items" TO "anon", "authenticated";`. A new column is not in that list. Every client component that selects `kind` or `need_key` (the master sheet, loot management, dashboard) gets `42501 permission denied for table loot_items`, and the master sheet's loaders swallow errors (`const { data: itemsData } = ...`), so the screen would silently show nothing.
**Why it happens:** column grants replace the table grant; `ADD COLUMN` does not extend them.
**How to avoid:** `GRANT SELECT ("kind", "need_key") ON TABLE "public"."loot_items" TO "anon", "authenticated";` in the Discovery migration; assert it in the PGlite test (authenticated can select `kind, need_key`; still cannot select `officer_notes` or `*`). [VERIFIED: PGlite spike: without the grant `SELECT kind, need_key` as `authenticated` returned `ERR permission denied for table loot_items`; with it, `ok`; `officer_notes` and `*` stay denied]
**Warning signs:** a client query that names `kind` returns an empty page with no visible error.

### Pitfall 2: Need costs trip the bracket allocation rule
**What goes wrong:** `validateBracketRules` sums `entry.item.allocation_cost` per bracket (`domain/loot/bracket-validation.ts:264`) against `maxAllocationPoints` default 3 (`:19`, ranks 50-39). A need list with a Big need (3) and a Standard need (1) in the same bracket reports `allocation_limit`. `submit/route.ts:144-154` passes `allocation_cost` straight through.
**How to avoid:** skip need rows in the bracket function and the submit route now; the 10-point budget is Phase 4's server check.
**Warning signs:** 422 "List violates bracket rules" on a valid need list.

### Pitfall 3: Touching the legacy seeder breaks the golden rows
**What goes wrong:** `expansionSeeder-golden.test.ts` records every Supabase call the legacy seeder makes. Any added field on a legacy insert fails it, and under `CI=true` Vitest refuses to write snapshots.
**How to avoid:** do not edit the legacy loop (`expansionSeeder.ts:298-` onward, from `getExpansionCatalog` through the per-raid `for` at `:306`); rely on column defaults; run `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` before every commit.

### Pitfall 4: PATCH `/api/raid-tiers` has no tier-to-guild check
**What goes wrong:** `route.ts:111` checks `manage_settings` for the body `guild_id`, then `route.ts:130` updates `.eq('id', tier_id)`. An officer of guild A can change guild B's tier fields by id. Adding `list_mode` makes a cross-guild write far more damaging (it would also seed need rows into B).
**How to avoid:** resolve `raid_tiers.expansion_id` -> `expansions.guild_id` and require equality; test with a foreign tier id (404).

### Pitfall 5: Unranked need rows flood the master sheet
**What goes wrong:** see C1. Seeding 145 rows per Forever tier would show 435 red "nobody ranked this" rows the day the sync is applied.
**How to avoid:** ranked-needs-only helper, with a test that a Discovery tier with seeded but unranked needs renders zero need rows, and one ranked need renders under "Needs".

### Pitfall 6: Receive-skip pools all needs under `null`
**What goes wrong:** the skip key is `${character_id}-${wowhead_id}` in `MasterSheetContent.tsx:920`, `lib/addon/member-ranked-items.ts:162`, `domain/loot/apply-receive-skip.ts` and the bot `collectItemCandidates`. If someone "fixes" nulls by defaulting to `0` or `''`, every need of a raider shares one key.
**How to avoid:** `itemIdentityKey`; unit-test two different needs of one raider are never merged.

### Pitfall 7: Id lists in URLs grow by 145 per tier
**What goes wrong:** `MasterSheetContent.tsx:792` and `:1342` send `item_ids=${itemIds.join(',')}` to `/api/blp` as a query string, and `.in('loot_item_id', itemIds)` calls put ids in PostgREST URLs. 435 need ids add about 16 KB (37 chars each). [ASSUMED: gateway limit not measured; MoP already sends 1,700 ids to some of these calls]
**How to avoid:** only ranked needs enter the id lists (the C1 helper), scope need lookups by `raid_tier_id` rather than by id lists, and never add all need ids to a GET.

### Pitfall 8: Idempotent re-run of the migration
**What goes wrong:** `CREATE POLICY` has no `IF NOT EXISTS`; the first draft failed on the second application with `policy ... already exists`.
**How to avoid:** `DROP POLICY IF EXISTS` before each `CREATE POLICY` (house style in `20261003180000`); the PGlite test applies the file twice.

### Pitfall 9: Baseline sets session `row_security = off` and `search_path = ''`
**What goes wrong:** the baseline begins with `SELECT pg_catalog.set_config('search_path', '', false)` and `SET row_security = off`. In PGlite (one session) they leak into later migrations and into RLS tests, producing `relation does not exist` and `query would be affected by row-level security policy`.
**How to avoid:** the harness runs `SET search_path TO public, extensions; RESET role;` before each file and `SET row_security = on` before RLS assertions. [VERIFIED: PGlite spike; both errors reproduced]

### Pitfall 10: ROADMAP success criterion 2 literal text
See Seeding. Verification will fail on "every tier that existed before stays Known" unless it is read as "legacy tiers".

## Code Examples

### Draft migration (verified: applied after all 47 existing migrations, applied a second time, exercised)

```sql
-- Source: spike this session, applied with @electric-sql/pglite 0.5.8 after
-- supabase/migrations/20260101000000..20261013120000 (47 files). Header comments omitted here.
SET LOCAL lock_timeout = '5s';

ALTER TABLE "public"."raid_tiers" ADD COLUMN IF NOT EXISTS "list_mode" "text" NOT NULL DEFAULT 'known';
ALTER TABLE "public"."raid_tiers" DROP CONSTRAINT IF EXISTS "raid_tiers_list_mode_check";
ALTER TABLE "public"."raid_tiers" ADD CONSTRAINT "raid_tiers_list_mode_check" CHECK (("list_mode" = ANY (ARRAY['known'::"text", 'discovery'::"text"]))) NOT VALID;
ALTER TABLE "public"."raid_tiers" VALIDATE CONSTRAINT "raid_tiers_list_mode_check";

ALTER TABLE "public"."loot_items" ADD COLUMN IF NOT EXISTS "kind" "text" NOT NULL DEFAULT 'item';
ALTER TABLE "public"."loot_items" ADD COLUMN IF NOT EXISTS "need_key" "text";
ALTER TABLE "public"."loot_items" DROP CONSTRAINT IF EXISTS "loot_items_kind_check";
ALTER TABLE "public"."loot_items" ADD CONSTRAINT "loot_items_kind_check" CHECK (("kind" = ANY (ARRAY['item'::"text", 'need'::"text"]))) NOT VALID;
ALTER TABLE "public"."loot_items" VALIDATE CONSTRAINT "loot_items_kind_check";
ALTER TABLE "public"."loot_items" DROP CONSTRAINT IF EXISTS "loot_items_need_shape_check";
ALTER TABLE "public"."loot_items" ADD CONSTRAINT "loot_items_need_shape_check" CHECK (((("kind" = 'need'::"text") AND ("need_key" IS NOT NULL) AND ("wowhead_id" IS NULL)) OR (("kind" = 'item'::"text") AND ("need_key" IS NULL)))) NOT VALID;
ALTER TABLE "public"."loot_items" VALIDATE CONSTRAINT "loot_items_need_shape_check";
CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_items_tier_need_key" ON "public"."loot_items" USING "btree" ("raid_tier_id", "need_key") WHERE ("kind" = 'need'::"text");

ALTER TABLE "public"."loot_history" ADD COLUMN IF NOT EXISTS "awarded_item_id" "uuid" REFERENCES "public"."loot_items"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_loot_history_awarded_item_id" ON "public"."loot_history" USING "btree" ("awarded_item_id") WHERE ("awarded_item_id" IS NOT NULL);

CREATE TABLE IF NOT EXISTS "public"."loot_item_need_pins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "guild_id" "uuid" NOT NULL,
    "item_id" "uuid" NOT NULL,
    "need_id" "uuid" NOT NULL,
    "pinned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "loot_item_need_pins_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "loot_item_need_pins_guild_item_key" UNIQUE ("guild_id", "item_id"),
    CONSTRAINT "loot_item_need_pins_distinct_check" CHECK ("item_id" <> "need_id"),
    CONSTRAINT "loot_item_need_pins_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "public"."guilds"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_item_need_pins_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_item_need_pins_need_id_fkey" FOREIGN KEY ("need_id") REFERENCES "public"."loot_items"("id") ON DELETE CASCADE,
    CONSTRAINT "loot_item_need_pins_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_loot_item_need_pins_need_id" ON "public"."loot_item_need_pins" USING "btree" ("need_id");
ALTER TABLE "public"."loot_item_need_pins" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guild members can view need pins" ON "public"."loot_item_need_pins";
CREATE POLICY "Guild members can view need pins" ON "public"."loot_item_need_pins" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."character_guild_memberships" "cgm"
     JOIN "public"."characters" "c" ON (("c"."id" = "cgm"."character_id")))
  WHERE (("cgm"."guild_id" = "loot_item_need_pins"."guild_id") AND ("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true)))) OR "public"."is_guild_officer"("guild_id"));
DROP POLICY IF EXISTS "Officers can insert need pins" ON "public"."loot_item_need_pins";
CREATE POLICY "Officers can insert need pins" ON "public"."loot_item_need_pins" FOR INSERT WITH CHECK ("public"."is_guild_officer"("guild_id"));
DROP POLICY IF EXISTS "Officers can delete need pins" ON "public"."loot_item_need_pins";
CREATE POLICY "Officers can delete need pins" ON "public"."loot_item_need_pins" FOR DELETE USING ("public"."is_guild_officer"("guild_id"));
GRANT SELECT, INSERT, DELETE ON TABLE "public"."loot_item_need_pins" TO "authenticated";
GRANT ALL ON TABLE "public"."loot_item_need_pins" TO "service_role";

GRANT SELECT ("kind", "need_key") ON TABLE "public"."loot_items" TO "anon", "authenticated";

-- enforce_loot_item_need_pin_refs(): SECURITY DEFINER, search_path pinned, REVOKE ALL FROM PUBLIC, anon, authenticated;
-- BEFORE INSERT OR UPDATE OF guild_id, item_id, need_id. Rejects (23514, or the RLS error for a non-officer client):
-- item_id not a kind='item' row of NEW.guild_id; need_id not a kind='need' row of NEW.guild_id; item and need in different raid tiers.
-- Resolve guild through loot_items -> raid_tiers -> expansions.guild_id (the join enforce_loot_history_guild_refs uses).
```

Results from the spike (the PGlite test should assert each):
```
need with wowhead_id        REJECTED  loot_items_need_shape_check
need without key            REJECTED  loot_items_need_shape_check
item with need_key          REJECTED  loot_items_need_shape_check
duplicate need_key in tier  REJECTED  idx_loot_items_tier_need_key
legacy-style insert (no kind) ALLOWED
bad list_mode               REJECTED  raid_tiers_list_mode_check
pin: need from another guild / item is a need / need is an item  REJECTED (trigger)
pin: valid                  ALLOWED
RLS on loot_item_need_pins (select | insert | update | delete):
  officer      1 | allowed (hit unique key) | 0 | 1
  raider       1 | denied (RLS)            | 0 | 0
  ex-member    0 | denied (RLS)            | 0 | 0
  non-member   0 | denied (RLS)            | 0 | 0
authenticated select kind,need_key: ok   select officer_notes: denied   select *: denied
authenticated select raid_tiers.list_mode: ok   select loot_history.awarded_item_id: ok
```

### PGlite harness (stubs required for the Supabase chain)

```ts
// Source: spike this session. Node 22 and PGlite 0.5.8; all 47 migrations applied in about 10 s wall.
// @vitest-environment node
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm' // 20260704000001_create_help_articles.sql needs it

export async function createChainedDb(migrationFiles: string[]) {
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
    CREATE SCHEMA IF NOT EXISTS extensions;
    CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE ROLE supabase_admin NOLOGIN;
    GRANT USAGE ON SCHEMA public, auth, extensions TO anon, authenticated, service_role;
  `)
  for (const file of migrationFiles) {
    // The baseline leaves search_path empty and row_security off for the session (Pitfall 9).
    await db.exec('SET search_path TO public, extensions; RESET role;')
    await db.exec(fs.readFileSync(file, 'utf8'))
  }
  return db
}
// Acting as a user: SET row_security = on; SET role authenticated; SELECT set_config('request.jwt.claim.sub', '<uuid>', false);
// Seed: guilds trigger creates default guild_roles; do not insert guild_roles. Set guild_settings.blp_enabled = true for BLP tests.
```

### Ranked need rows for one tier set (master sheet, summary)

```ts
// lib/loot/ranked-need-rows.ts (proposed). One tier-scoped query, no id list in the URL.
// Embedded !inner is already used in this repo (utils/analytics/funnel.ts raid_events!inner).
const { data } = await supabase
  .from('loot_submission_items')
  .select('loot_item_id, loot_item:loot_items!inner(id, name, boss_name, item_slot, wowhead_id, classification, raid_tier_id, is_loot_council, kind, need_key)')
  .eq('loot_item.kind', 'need')
  .in('loot_item.raid_tier_id', discoveryTierIds)
  .is('removed_at', null)
// distinct by loot_item_id -> rows appended to itemsData; unranked needs never load.
```

### ItemLink guard (one change covers 43 call sites)

```tsx
// app/components/ItemLink.tsx (proposed): keep the existing body as WowheadItemLink so hooks stay unconditional.
const ItemLink = memo(function ItemLink(props: ItemLinkProps) {
  if (props.wowheadId == null) return <NeedLabel name={props.name} className={props.className} />
  return <WowheadItemLink {...props} />
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Table-level SELECT on `loot_items` | Column-level SELECT without `officer_notes` | 2026-10-04 (`20261004040000`) | Every new `loot_items` column needs its own grant |
| Scratchpad-only PGlite proofs | Committed PGlite chain test | this phase | DISC-12 and re-runnable evidence |
| BLP incremental counters | Derived rebuild from history | 2026-06-09 (`20260609000001`) | Need buckets accrue with zero SQL change |
| `idx_loot_history_unique_award` one award per night | Copy-aware unique index (`award_copy`) | 2026-10-01 (`20261001120000`) | A raider can win two awards of one need on one night (copy 2) |

**Deprecated/outdated:**
- ARCHITECTURE.md's `loot_items.need_id` self-reference pin: replaced by `loot_item_need_pins` (SUMMARY Disagreement 2).
- ARCHITECTURE.md's `loot_mode` column name and `|` key separator: replaced by `list_mode` and `.` (CONTEXT D-00b, D-10).
- SUMMARY's `slot BETWEEN 1 AND 8` and `need_id`: not carried; skipped here.

## Validation Architecture

> `workflow.nyquist_validation` is true in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.x, globals on, jsdom default (`// @vitest-environment node` for routes, migrations, PGlite) |
| Config file | `vitest.config.ts` (alias `@` -> repo root; setup `./vitest.setup.ts`) |
| Quick run command | `npx vitest run <paths>` (a touched-file set runs in seconds; the PGlite file about 15 s) |
| Full suite command | `npm test` then `npm run typecheck` and `npm run lint` |
| Golden gate | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` (baseline this session: 14 files, 569 tests pass) |

### Phase Requirements -> Test Map

| Req / Criterion | Behavior | Test Type | Automated Command | File Exists? |
|---|---|---|---|---|
| DISC-12 / SC1 | Migration file shape: order, NOT VALID then VALIDATE pairs, grants incl. `("kind","need_key")`, no data change, header sections | contract (regex) | `npx vitest run app/services/__tests__/discovery-schema-migration.test.ts` | Wave 0 |
| DISC-12 / SC1 | Applies after all existing migrations, applies twice, constraints behave, legacy insert works | PGlite | `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts` | Wave 0 |
| DISC-12 / SC1 | RLS matrix on `loot_item_need_pins`: raider, officer, non-member, ex-member x select/insert/update/delete; pin trigger rejects cross-guild, wrong kind, cross-tier | PGlite | same file | Wave 0 |
| DISC-12 | `authenticated` can select `kind`, `need_key`, `list_mode`, `awarded_item_id`; still denied `officer_notes` and `*` | PGlite | same file | Wave 0 |
| DISC-07 / SC4 | Need-keyed BLP: winner 0, attendee 1, recompute x3 identical, `recompute_blp_for_event` and `_for_guild` identical | PGlite | same file | Wave 0 |
| DISC-07 | Bulk award POST with a need `loot_item_id` and a `raid_event_id` queues recompute for the need id | route | `npx vitest run app/api/loot-history/bulk/__tests__/route.test.ts` | exists, extend |
| DISC-01 / SC2 | `canSwitchToKnown` D-03 rule | unit | `npx vitest run domain/loot/__tests__/list-mode.test.ts` | Wave 0 |
| DISC-01 | PATCH `list_mode`: 400 invalid value, 403 without `manage_settings`, 404 foreign tier, 409 blocked Known switch, discovery switch seeds needs, GET returns `list_mode` | route | `npx vitest run app/api/raid-tiers/__tests__/route.test.ts` | Wave 0 (no test exists today) |
| DISC-01 / SC2 | Sync inserts Forever tiers as `discovery` with 145 need rows each, second run inserts nothing, never touches a non-Forever expansion, flips only `known` Forever tiers | unit | `npx vitest run app/services/__tests__/expansionCatalogSync.test.ts scripts/lib/__tests__/forever-sync.test.ts` | exist, update |
| DISC-01 / SC2 | Known guilds byte-identical | golden | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` | exists, must stay green unmodified |
| DISC-06 | Taxonomy frozen: fixture, uniqueness, cost/class mirror, no dashes, counts 145 = 19/22/104, FEATURES defaults resolve | unit | `npx vitest run domain/loot/__tests__/needs.test.ts` | Wave 0 |
| DISC-06 | Every reader file is in the inventory with a disposition; scan floor; self-checks | scan | `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts` | Wave 0 |
| DISC-06 / SC3 | Picker readers exclude needs (A1 to A7) | unit/route | `npx vitest run lib/__tests__/loot-items-query.test.ts app/api/reserve-runs app/api/loot-items` | partly exist |
| DISC-06 / SC3 | Submit skips need rows in bracket rules, keeps copy limits (Ring and Trinket need 2) | route + unit | `npx vitest run app/api/loot-submissions/submit domain/loot/__tests__/bracket-validation.test.ts domain/loot/__tests__/slot-capacity.test.ts domain/loot/__tests__/item-copies.test.ts` | exist, extend |
| DISC-06 / SC3 | Approval snapshot, revert, remove-item, item-counts, visibility accept a need-ranked list | route | `npx vitest run app/api/loot-submissions app/api/master-sheet/visibility` | exist, extend |
| DISC-06 / SC3 | Master sheet: ranked needs shown under "Needs", unranked hidden, `NeedLabel` not link, `RaidModeView` search does not throw, `already_awarded` counts need awards | unit/component | `npx vitest run lib/loot/__tests__/master-sheet-summary.test.ts "app/(app)/master-sheet/components/__tests__" app/components/__tests__/ItemLink.test.ts` | exist, extend; `NeedLabel` test Wave 0 |
| DISC-06 / SC3 | Addon exports contain item rows only; BLP map filtered; companion shape unchanged for Known | route | `npx vitest run app/api/addon lib/addon domain/loot/__tests__/gargul-dft.test.ts` | exist, extend |
| DISC-06 | Bot `/priority` ignores needs | route | `npx vitest run app/api/bot/priority` | exists, extend |
| DISC-06 | Character gear, Discord announce and summary with a need award | route/unit | `npx vitest run app/api/character-gear lib/__tests__/discord-loot-announcements.test.ts lib/__tests__/discord-raid-summary.test.ts` | exist, extend |

### Sampling Rate

- **Per task commit:** `npx vitest run` on the files the task touched (under 30 s each; the PGlite file is the slowest at about 15 s).
- **Per wave merge:** `npm test && npm run typecheck && npm run lint`, plus `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring`.
- **Phase gate:** full suite green before `/gsd-verify-work`; PR-A merged and the deploy workflow success recorded before PR-B opens.

### Wave 0 Gaps

- [ ] `app/services/__tests__/helpers/pglite-chain.ts` and `discovery-schema-pglite.test.ts`: the harness and the DISC-12 behaviour tests (needs `npm install --save-dev --save-exact @electric-sql/pglite@0.5.8` behind a human-verify checkpoint).
- [ ] `app/services/__tests__/discovery-schema-migration.test.ts`: contract test written against the migration file (copy helpers from `second-same-night-award-migration.test.ts`).
- [ ] `domain/loot/needs.ts`, `domain/loot/__tests__/needs.test.ts`, `domain/loot/__fixtures__/need-keys.json`.
- [ ] `domain/loot/list-mode.ts` and its test.
- [ ] `lib/loot/__tests__/need-reader-inventory.test.ts` (and the `NEED_READERS` table it checks).
- [ ] `app/api/raid-tiers/__tests__/route.test.ts` (no test exists for this route today).
- [ ] `app/components/__tests__/NeedLabel.test.tsx`.

## Security Domain

> `security_enforcement` is absent from `.planning/config.json`, so it is treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (no new auth surface; routes keep `getAuthenticatedUser`) | existing |
| V3 Session Management | no | existing |
| V4 Access Control | **yes** | `verifyPermission(..., 'manage_settings')` plus the tier-to-guild ownership check (Pitfall 4); RLS on `loot_item_need_pins` with `is_guild_officer`; pin trigger for service-role writes; column grants on `loot_items` |
| V5 Input Validation | yes | allowlist `list_mode` in `{'known','discovery'}` server-side and by CHECK; `need_key` is never user input (seeded from the frozen list); reject unknown update keys as the route already does |
| V6 Cryptography | no | n/a |
| V8 Data Protection | yes | `officer_notes` stays unreadable to sessions (assert in the PGlite test); exports must not leak need rows to the addon |
| V14 Configuration | yes | migration grants and `REVOKE ALL` on the trigger function; service-role key stays in `.env.local` for the owner script |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR: officer of guild A writes guild B's tier by id | Tampering / Elevation | Ownership check in PATCH (Pitfall 4); test with a foreign tier id |
| Service-role write bypasses RLS (sync, pins) | Tampering | CHECK constraints and the `enforce_loot_item_need_pin_refs` trigger apply to every role; sync is Forever-only and insert-only except the guarded flip |
| Cross-guild pin (item from guild A, need from guild B) | Information disclosure / Tampering | Trigger rejects; PGlite test asserts |
| Column-grant regression exposes `officer_notes` | Information disclosure | The PGlite test asserts `officer_notes` and `*` denied after the Discovery migration |
| Officer edits a need row's cost or classification | Tampering | PATCH `/api/loot-items` rejects need rows (A3); constraint-level protection is deferred (no column-level update revoke in this phase) |
| Supply chain: new devDependency | Tampering | exact pin 0.5.8, `--ignore-scripts` install check, human-verify checkpoint |
| Need data leaking to the addon or public reserve pages | Information disclosure | `kind = 'item'` filters (D1, D2, A5); source scan test |
| Public repo | Information disclosure | No real ids in fixtures; PGlite uses synthetic uuids; sync report prints ids and counts only (existing rule) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `item_slot` values for need rows reuse the existing vocabulary (Finger, Held In Off-hand, Shoulder, Main Hand, Off Hand, Two-Hand, Ranged) | Taxonomy | Phase 4's slot filter and `maxCopiesForSlot` mismatch; low, caught by the taxonomy test |
| A2 | Shield, Off-hand item and Relic cost Medium (2); D-07 is silent on them (it lists rings, necks, cloaks as Medium and "armour slots" as Standard) | Taxonomy | Owner may want Standard or Big; changes 10 rows' cost and classification and shifts Phase 4 budget copy. Confirm at the Oct 26 picker review |
| A3 | The 145-row matrix of armour x stat combinations (13 per armour slot) and accessory stat families {physical, spell-damage, healing, tank}, no separate Strength/Agility for neck, ring, back, trinket | Taxonomy | Missing a combination a spec needs forces an additive sync later (cheap); an unwanted extra costs only data. Never unsafe, since rows can be added by sync but keys cannot be renamed |
| A4 | `boss_name = 'Needs'` sentinel instead of NULL | Pattern 2 | A reader that treats `boss_name` as a real boss would list "Needs" as one; mitigated by `CATALOG_GROUP_LABELS`. If the owner insists on NULL, add null-safety to the 8 typed-`string` components and RaidModeView |
| A5 | Wands fold into `ranged-weapon` with spell-damage/healing instead of a separate Wand row | Taxonomy | Picker copy "Wand, Spell damage" (FEATURES) becomes "Ranged weapon, Spell damage"; display name can be aliased without a key change |
| A6 | Phase 3's list-mode PATCH accepts `discovery` only for tiers of the Forever expansion | Seeding | If the owner wants any guild to opt a tier into Discovery now, remove the guard; the taxonomy is Forever-oriented and legacy readers were not designed for it |
| A7 | A need award consumes the winner's entry for that need (receive-skip by `itemIdentityKey`) | Reader Audit C2 | If the owner wants the entry to persist across awards, drop the key change; BLP already resets the winner. Matters from the first Desk award (Phase 5) |
| A8 | The loot-cost `guild_settings` columns do not ship in this migration | Migration Spec | If D-00c means they must ship now, add three defaulted columns; note `guild-data` spreads all of `guild_settings` into the addon payload (`route.ts:308-317`), so new keys would appear in the export |
| A9 | PostgREST `on_conflict` takes a column list only, so a partial unique index cannot be an upsert target | Alternatives | If wrong, `upsert(ignoreDuplicates)` would work and the read-then-insert is merely redundant |
| A10 | URL length limits make 435 extra ids in a GET a risk | Pitfall 7 | If limits are generous the ranked-only filter is still correct, just not strictly needed for that reason |
| A11 | `lib/database.types.ts` can be hand-edited in the style of PR #342 as an alternative to `npm run gen:types` | Migration Spec | Mismatch with a regenerated file; `typecheck` and a later regen reconcile it |
| A12 | Analytics SQL under `scripts/analytics/queries/` will count need rows after Phase 4 | Reader Audit scripts | Skewed Forever metrics only; not request-time |

## Open Questions

1. **Does the ROADMAP success criterion 2 mean legacy tiers only?**
   - What we know: D-05 flips existing Forever tiers; ROADMAP SC2 says "every tier that existed before stays Known".
   - What's unclear: whether verification will be read literally.
   - Recommendation: record in the plan that the test asserts "non-Forever tiers stay Known; Forever tiers are Discovery after the backfill"; ask the owner to confirm the reading when approving the plan.

2. **May a non-Forever guild switch a tier to Discovery in Phase 3?**
   - What we know: DISC-01 says "an officer can set a raid tier's list mode to Discovery"; the taxonomy is built for Forever; legacy readers assume items.
   - Recommendation: Forever expansions only for now (A6), keep the check in one place so Phase 4 or the owner can lift it.

3. **Should a need award remove the winner's list entry for that need (A7)?**
   - What we know: for items, a received copy skips one entry (`pickReceivedEntries`). No Phase 3 flow awards a need except `already_obtained` removal and the master sheet award modal.
   - Recommendation: implement `itemIdentityKey` now (pure, tested, unused by Known guilds) and wire it in the skip sites; owner confirms the semantics before the Desk ships.

4. **Do the loot-cost columns ship in this migration (D-00c "loot-cost columns ship at zero")?**
   - What we know: not in any Phase 3 requirement; ARCHITECTURE sketched them in the schema PR; `guild-data` would add keys to the addon payload.
   - Recommendation: defer to the phase that reads them (4 or 5), unless the owner wants a single schema PR for the whole milestone.

5. **Shield, Off-hand item, Relic, Wand classification (A2, A5) and the stat families on accessories (A3).**
   - Recommendation: ship the proposal; the owner reviews with the picker copy (Oct 26). Keys are additive-safe, names are aliasable.

6. **Is the Discord "Loot awarded" post acceptable for a need award before the Desk?** It renders `**Trinket, Healing** -> name`. Works, no link. Recommend accept; the Desk replaces it in Phase 5/6.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | tests, scripts | yes | v22.23.0 | CI uses Node 20; PGlite has no engines constraint |
| npm | install | yes | 10.9.8 | - |
| Supabase CLI | `npm run gen:types` | yes (`/Users/alexander.mayes/.local/bin/supabase`) | 2.108.0 | hand-edit types (A11) |
| Docker | `supabase db reset` (local) | client present; daemon not confirmed | client 29.8.2 | PGlite harness replaces the local reset evidence |
| gh CLI | merge, workflow check | yes | 2.95.0 | - |
| @electric-sql/pglite | DISC-12 test | spiked from a scratch dir (not in the repo) | 0.5.8 | house pattern (contract test + scratchpad proof) |
| Production DB access for the backfill | `sync:forever` | owner-run, `.env.local` | - | none; this is an owner step |

**Missing dependencies with no fallback:** none for planning. The migration deploy and the production backfill are owner actions.
**Missing dependencies with fallback:** committed PGlite (needs the install checkpoint).

## Sources

### Primary (HIGH confidence)
- In-repo files opened this session (line ranges quoted above): `supabase/migrations/20260101000000_baseline_schema.sql` (loot_items `:1888-1909`, loot_history `:1840-1857`, loot_submission_items `:1951-1960`, raid_tiers `:2086-2097`, `is_guild_officer` `:591-611`), `20260721000001_add_blp_reset_anchor.sql`, `20260609000001_blp_recompute_from_history.sql`, `20260727000001_fix_save_submission_items_ownership.sql`, `20260929180000_enforce_loot_history_guild_refs.sql`, `20260930000000_enforce_loot_list_status_rules.sql`, `20261001120000_allow_second_same_night_award.sql`, `20261003230000_blp_and_reserve_award_rules.sql`, `20261004040000_loot_item_officer_notes_officers_only.sql`; `app/services/expansionCatalogSync.ts`, `expansionSeeder.ts`, `scripts/lib/forever-sync.ts`, `scripts/sync-forever-catalog.ts`, `app/api/raid-tiers/route.ts`, `app/(app)/expansions/[expansionId]/_client.tsx`, `lib/loot-items-query.ts`, `lib/addon/member-ranked-items.ts`, `app/api/addon/{guild-data,export-string}/route.ts`, `app/api/bot/priority/route.ts`, `app/api/loot-submissions/{submit,review,revert,remove-item}/route.ts`, `domain/loot/{bracket-validation,slot-capacity,item-copies,apply-receive-skip,gargul-dft,list-diff}.ts`, `app/components/ItemLink.tsx`, master sheet components, `companion/src/main/addon-format.ts`, `.planning/research/{SUMMARY,ARCHITECTURE,PITFALLS,FEATURES}.md`, `.planning/workstreams/forever/{REQUIREMENTS,STATE,MILESTONE-BRIEF}.md`.
- PGlite spike this session (scratch directory, not committed): migration chain, draft migration twice, constraint, grant, trigger, RLS matrix and BLP results quoted above.
- `npm view @electric-sql/pglite` (versions, dates, maintainers, license) and `gsd-tools query package-legitimacy check`.
- [CITED: pglite.dev/docs] package name and install line.

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` default needs per spec and the Q1 to Q3 picker design (research, not owner-confirmed).
- Git history of PRs #294/#299, #309, #342 for the PGlite-outside-the-repo and hand-edited-types precedents.

### Tertiary (LOW confidence)
- Gateway URL length behaviour (A10), PostgREST `on_conflict` semantics (A9): training knowledge, not exercised.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No new runtime dependency; one devDependency verified by spike.
- Architecture: HIGH for schema, grants, constraints, RLS and BLP (run in PGlite); MEDIUM for reader dispositions that depend on owner choices (A4, A6, A7).
- Pitfalls: HIGH for 1 to 4 and 8 to 9 (reproduced or read), MEDIUM for 5 to 7.
- Taxonomy: MEDIUM. Derived from FEATURES defaults and D-06 to D-12; classification of four slots is assumed.

**Research date:** 2026-10-19
**Valid until:** 2026-11-02 (the migration timestamp ordering, Phase 4 picker copy review on Oct 26 and any new migration merged before Phase 3 ships can invalidate details; re-check `ls supabase/migrations | tail -3` and the `loot_items` grant list before writing the migration)
