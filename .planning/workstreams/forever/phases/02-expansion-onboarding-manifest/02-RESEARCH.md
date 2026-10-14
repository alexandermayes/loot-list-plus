# Phase 2: Expansion Onboarding Manifest - Research

**Researched:** 2026-10-13
**Domain:** Data-driven expansion seeding (registry + adapters + native manifest), idempotent catalog sync, offline wago.tools snapshots, source-scan test gates
**Confidence:** HIGH for in-repo facts (every discrete value below was read this session), MEDIUM for zod/Vitest behaviour (official docs plus a local runtime check), LOW for wago.tools endpoint and CSV header details (prior-session probes only; wago was deliberately not contacted this session)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Forever bosses are manifest-only in this phase. There is no bosses table today (bosses exist only as `loot_items.boss_name`, and Forever has no items), and no migration is added. The app resolves a Forever tier's bosses by looking up the manifest raid for that tier's name. Reversibility: reversible.
- **D-02:** The raid and boss list, with the provisional marker, is shown in the setup guide only (`app/(app)/overview/components/SetupGuide.tsx`). Its existing Forever "waiting" rows (driven by `RaidTierStatus`) become the three raids with their bosses once tiers exist. No other surface changes in this phase.
- **D-03:** A provisional boss renders an "Unconfirmed" badge after its name, and each raid with any provisional boss carries one line underneath: "Boss names are confirmed when the raid opens." A raid whose manifest boss list is empty shows one muted line: "Bosses to be announced". This copy is proposed and needs the owner's sign-off before it ships; no em dashes.
- **D-04:** Forever raids use plain names in `raid_tiers.name`: "Barrow Deeps", "Hyjal Summit", "Onyxia's Lair". No "(Forever)" suffix. A guild is one game version, so no guild holds both a Classic and a Forever "Onyxia's Lair"; name-keyed helpers (`utils/bossOrder.ts`, `utils/raidIcons.ts`, `utils/bossImages.ts`, `data/raid-catalog-names.ts`) resolve by expansion plus name where a collision matters, and lookups that are already guild-scoped need no change. Reversibility: costly.
- **D-05:** `data/expansion-phases.ts` gets a `forever` entry with one phase holding all three raids, so Forever tiers seed with `phase = 1`, `is_guild_active = true` and `master_sheet_visible = true`, exactly like Classic Phase 1. No officer toggle is needed before raiders can rank Discovery needs in Phase 3 and 4. `app/services/__tests__/raid-phase-coverage.test.ts` must cover the Forever entry.
- **D-06:** The manifest carries `opens_on: 2026-12-09` per raid as data only. It is shown in the setup guide ("Raids open Dec 9" or similar, owner sign-off) and never drives tier state or any code path in this phase. Dates live in data, never in code.
- **D-07:** Raid order is by raid size: Barrow Deeps (10), Hyjal Summit (20), Onyxia's Lair (40). This sets `sort_order` and the setup guide order.
- **D-08:** Forever guilds created before this phase (expansion row, zero tiers) are reached by an admin script under `scripts/` on the service-role client that iterates every Forever expansion row and calls `syncExpansionCatalog`. It has a dry-run mode that prints the rows it would insert, and the owner runs it once after the code deploy. No lazy sync on any request path, no cron.
- **D-09:** `raid_tiers` has no stable key column and none is added. Once a Forever raid name has shipped, it is frozen in a committed fixture and the manifest gate fails if it changes. A rename is done by adding the new name with `previousNames: [old]`, and sync matches an existing tier on any alias before inserting, so a rename never creates a duplicate tier. Reversibility: reversible.
- **D-10:** When a future Forever tier is added to the manifest, the owner re-runs the same admin script. Sync is idempotent, so the re-run is safe; running it twice changes nothing the second time (EXPN-05).
- **D-11:** For new guilds, `seedExpansionForGuild` creates the expansion row and then calls `syncExpansionCatalog` for Forever only. The five legacy expansions keep today's insert loop, frozen under the golden-row snapshot test. Sync never runs over a legacy expansion (research Pitfall 6; legacy catalogs have diverged per guild).
- **D-12:** Until the owner's Oct 21 input, Barrow Deeps and Hyjal ship with the guide-sourced boss names from the 2026-09-13 todo list, every one marked provisional, with the source noted per entry in the manifest. Onyxia's Lair's boss is provisional too unless a pinned DungeonEncounter fixture confirms her. The Oct 21 input promotes or corrects names by manifest edit.
- **D-13:** The wago.tools refresh workflow runs weekly on a cron plus manual dispatch. It re-pulls the pinned tables for the `1.60.` build prefix with retry and backoff, trims to the ids the manifest references, and opens a PR only if the committed snapshot changed. A 503 after retries exits green with a notice; a wago outage never turns CI red and never blocks a merge.
- **D-14:** If no wago snapshot has been committed yet (wago was 503 on every 2026-10-12 probe), the Forever reference test passes with every boss provisional and the allowlist holding all of them. Nothing in this phase waits on wago. The first successful pull commits the snapshot and starts shrinking the allowlist.
- **D-15:** The provisional allowlist can only shrink. If an allowlisted boss appears in the pinned DungeonEncounter fixture, the gate fails until the manifest entry is promoted (a one-line edit in the same PR as the snapshot).

### Claude's Discretion

- Exact zod schema shape for the manifest (research sketch in `.planning/research/STACK.md` lines 126 to 136 is the starting point), including how `previousNames`, `opens_on`, `verification` and per-entry `source` are modelled.
- Snapshot provenance fields (build, fetchedAt, sha256, source URL, tables pinned) and which wago tables are trimmed and committed (research suggests ItemSparse, DungeonEncounter, Map at minimum).
- Golden-row snapshot format and which columns it pins (research: name, item_slot, wowhead_id, boss_name, classification, allocation_cost, roles, token classes, in insert order).
- How the no-live-fetch test is implemented (source scan for wago.tools and wowhead.com hosts in runtime and test code, modelled on the Phase 1 analytics scan guard).
- Retry and backoff parameters for the snapshot script; admin script name, flags and output format.
- How the setup guide reads the manifest client-side (the registry must stay client-safe; heavy catalogues server-only per `domain/expansion/game.ts` header comment).
- Whether `data/raid-catalog-names.ts` needs a Forever entry for addon session matching (its existing "Hyjal Summit" row is the TBC instance name; lookups are guild-scoped already).

### Deferred Ideas (OUT OF SCOPE)

- Per-guild boss table so an officer can rename a provisional boss in their guild (research Pitfall 7 suggestion). Revisit when the Drop Desk (Phase 5) needs a boss picker; would be an expand-only migration with an RLS matrix.
- Lazy sync on officer visit as a safety net, and a nightly cron sync. Rejected for v1; the admin script is the only path.
- `manifest_key` column on `raid_tiers` for stable matching. Belongs with PLAT-06 (legacy id conversion, after Nov 30).
- Listing bosses on the loot management raid tier screen and the master sheet `BossSection` for Forever. Setup guide only for now.
- An `opens_on`-driven tier activation. Dates stay data-only; tier state is Phase 1 active and visible.

Also out of scope per the phase boundary: Discovery need rows, `list_mode`, the need picker, the Drop Desk, any schema migration, legacy expansion id conversion (PLAT-06), per-guild boss editing.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXPN-01 | Officer creating a Forever guild gets Barrow Deeps, Hyjal Summit and Onyxia's Lair with bosses seeded from a manifest keyed on `wowhead_id`; unverified bosses are marked provisional | Native Forever manifest (zod strict schema), `syncExpansionCatalog` (insert-only, alias-matched), `EXPANSION_PHASES.forever`, SetupGuide list with "Unconfirmed" badge. Bosses are manifest-only per D-01 (no boss rows; the `wowhead_id` key applies to items, which are `{}` for Forever today) |
| EXPN-02 | The seeder resolves every expansion through one registry; no displayName if/else chains remain | `data/expansions/registry.ts` (client-safe meta) plus server-only catalog loader; per-entry `classify` and `roles` replace the chains at `expansionSeeder.ts:449-462` and `:470-481`; source-scan test asserts the chains are gone |
| EXPN-03 | The five existing expansions seed byte-identical rows through adapters (golden-row snapshot test) | Golden capture FIRST against the unmodified seeder using a richer recording mock; `toMatchFileSnapshot` per expansion, one canonical JSON row per line |
| EXPN-04 | A Vitest manifest gate rejects duplicate ids, missing token classes, phase or raid gaps, and name mismatches before merge | Pure `validateManifest` functions exercised on the real registry (expect no errors) and on mutated copies (expect the specific error); legacy adapters use a frozen, ratcheted baseline for pre-existing exceptions (measured below) |
| EXPN-05 | Catalog sync for Forever is idempotent and never deletes or renames a referenced row | Insert-only sync, alias match via `normalizeCatalogName`, stateful in-memory fake proving a second run is a no-op and that no update or delete is ever issued |
| EXPN-06 | wago.tools snapshots are committed with provenance; no runtime or test code fetches wago or Wowhead live | `scripts/expansions/snapshot-reference.ts` (retry, backoff, outage exits 0), committed JSON with provenance, source-scan test with a file floor and self-checks |
</phase_requirements>

## Summary

The phase is mostly refactor plus a small amount of new data. The seeder today is a hand-written registry of five legacy `ExpansionDefinition` objects plus a Forever stub with `raids: []`, and two if/else chains keyed on `expansionData.displayName` choose the classification and role maps per item. Everything the golden-row snapshot must pin is written in one place (`seedExpansionForGuild`, lines 340 to 570), and the legacy data totals about 5,700 items across 34 raids (Classic 838, TBC 734, Wrath 1,359, Cata 979, MoP 1,775), so the snapshot must be a compact, one-row-per-line text file per expansion, not a pretty-format `.snap`. The single most important sequencing rule: capture the golden files against the UNMODIFIED seeder in the first plan, commit them, and only then refactor.

Forever needs three new pieces and each is small: a native manifest (three raids, eight provisional Barrow Deeps bosses taken from the 2026-09-25 section of the 2026-09-13 todo, no Hyjal names exist anywhere in the repo so Hyjal ships with an empty boss list, Onyxia ships with one provisional boss), an insert-only `syncExpansionCatalog` (there is no unique constraint on `raid_tiers (expansion_id, name)`, so idempotency is read-then-insert, not `ON CONFLICT`), and a `forever` entry in `data/expansion-phases.ts`. Adding Forever raids has two non-obvious side effects found this session: `getExpansionSlug('Forever')` returns `null` today (so the existing phase-coverage test fails the moment Forever has raids), and the public `/api/reserve-runs/raid-tiers` route keys off the same slug map (so mapping Forever there silently changes the reserve-run modal for Forever guilds).

The measured legacy data also shapes the gate: duplicate `wowhead_id` within a raid under different bosses is normal for legacy catalogs (Classic 95, Wrath 109, Cata 200, MoP 127 rows), and 33 legacy "Token"-slot items (Wrath 14, Cata 19) have no entry in `TOKEN_CLASS_MAPPING`. A strict gate would fail on day one, so the gate is strict for native manifests and baseline-ratcheted for legacy adapters. zod is NOT a declared dependency (4.3.5 is transitive via eslint tooling); add it exact-pinned, and csv-parse as a dev dependency. Both register as `SUS` ("too-new") in the legitimacy seam only because the latest published versions are days old, so pin older versions and gate the install behind a human-verify checkpoint.

**Primary recommendation:** Plan in this order: (1) golden-row capture on the unmodified seeder, (2) dependencies plus schema plus Forever manifest plus phases entry, (3) registry and adapters with the seeder refactor (golden must pass unchanged), (4) `syncExpansionCatalog` plus seeder Forever branch plus stateful-fake tests, (5) manifest gate plus allowlist plus frozen-name fixture, (6) snapshot script plus provenance plus no-live-fetch scan plus workflow, (7) admin script, (8) SetupGuide list (separate copy-sign-off PR).

## Project Constraints (from CLAUDE.md)

- **GSD workflow enforcement:** repo edits go through a GSD command (`/gsd-execute-phase` for this phase); no direct edits outside a workflow.
- **Planning docs never land directly on `main`;** `main` only moves through PRs. Code PRs use their own branches.
- **Copy voice:** no em dashes in user-facing text; user-facing copy needs owner sign-off (Phase 1 plan 01-09 precedent: copy in its own PR). Applies to the SetupGuide strings and to manifest strings that render (boss names, raid names).
- **Conventions:** kebab-case file names (`expansion-registry.ts` style), PascalCase types, UPPER_SNAKE constants, `import type` for type-only imports, `@/` alias, tests in `__tests__` subdirectories, JSDoc above functions, 2-space indent, trailing commas, `null` for "not found".
- **Domain purity:** `domain/**` modules are pure functions with no dependencies. `domain/expansion/game.ts` and `wowhead.ts` import nothing and are client-imported. `domain/expansion/index.ts` is re-exported by `domain/index.ts`, so a zod-importing file must NOT be added to that barrel.
- **Server-first:** client components must not import heavy catalogs; service-role client is server or script only.
- **No schema changes in this phase** (Standing Constraint 1; no migration). **No live wago.tools or Wowhead fetches** (Standing Constraint 5). **No player or guild names in analytics or published data** (Standing Constraint 3; keep admin script output to ids and counts).
- **CI:** `npm run lint`, `npm run typecheck`, `npm run test` on Node 20 (`.github/workflows/ci.yml`). `tsconfig.json` includes `**/*.ts`, so new scripts and test files are typechecked.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Expansion registry (stored name, slug, game, seed mode) | Static data module (client-safe) | Server seeder | Meta only so SetupGuide and the seeder share it; heavy catalogs stay behind a server-only loader |
| Legacy catalogs and classification/role maps | Server (seeder, via adapter) | none | Existing heavy data files; byte-identical output required |
| Forever manifest (raids, bosses, provisional flags, opens_on) | Static data module (client-safe) | Server (sync), Browser (SetupGuide) | Tiny data, no heavy imports; SetupGuide reads it directly |
| Manifest schema and validation | Test and build time (zod) | none | The gate is the control; runtime trusts typed data |
| Catalog sync (insert missing tiers) | API / Backend (service-role, server or script) | Database | Writes `raid_tiers` with RLS bypass; never from the browser |
| Admin backfill for existing Forever guilds | Local script (service-role) | Database | Owner runs once post-deploy; no request path, no cron |
| Raids-and-bosses list with Unconfirmed badge | Browser / Client (SetupGuide) | none | Presentation of manifest data; tier names come from existing `raid_tiers` query in DashboardContent |
| wago.tools snapshot pull | CI / script (offline tooling) | Repo (committed JSON) | The only network-touching code; excluded from runtime and tests |
| No-live-fetch enforcement | Test (source scan) | none | House pattern from Phase 1 scan guards |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | 4.6.5 (exact pin) | Manifest schema, `z.infer` types, gate parsing | Already chosen in `.planning/research/STACK.md`; 4.x API verified locally on installed 4.3.5 (see Code Examples). 4.6.5 was published 2026-09-13, more than 30 days old; 4.6.6 and 4.6.7 are 2 and 1 days old [VERIFIED: npm registry `npm view zod time`] |
| vitest | 4.1.0 (installed) | Gate tests, golden file snapshots, scan tests | Already the repo framework; `toMatchFileSnapshot` is present in the installed build [VERIFIED: `node_modules/vitest/dist/chunks/test.CTcmp4Su.js` contains it] |
| tsx | ^4.22.4 (installed) | Run the admin and snapshot scripts | Existing script runner (`"seed:classic": "tsx scripts/seed-classic-raids.ts"`) |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| csv-parse | 7.0.2 or 7.0.3, devDependency, exact pin | Parse wago CSV in the snapshot script only | `import { parse } from 'csv-parse/sync'` with `columns: true, bom: true`. 7.0.3 was published 2026-09-25 (18 days old), 7.0.2 on 2026-08-02; prefer 7.0.2 unless 7.0.3 is needed [VERIFIED: npm registry] |
| `@supabase/supabase-js` | 2.106.1 resolved (installed) | Service-role client in sync and admin script | Existing; typed via `createTypedServiceRoleClient` |
| `selectAllPagesOrThrow` | in repo | Page through all Forever `expansions` rows in the admin script | `utils/supabase/paginate.ts`; order by a unique column |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| csv-parse | Hand-rolled split | Rejected: quoted fields with commas and apostrophes in `Name_lang`; see Don't Hand-Roll |
| zod runtime parse in seeder | Gate-only validation | Recommended gate-only: the manifest is static typed data validated in CI, so a runtime parse adds bundle weight and no safety. `STACK.md` suggested parse-once per seed; this is a deliberate, low-risk deviation (planner may keep parse-once if preferred; it is server-side) |
| Pretty-format `.snap` for golden rows | `toMatchFileSnapshot` with line-per-row text | Rejected `.snap`: about 5,700 loot rows would be tens of thousands of lines and unreadable diffs |
| New `valibot` | zod | Rejected: zod already chosen and 4.x covers every need |

**Installation:**
```bash
npm install --save-exact zod@4.6.5
npm install --save-dev --save-exact csv-parse@7.0.2
```

**Version verification (this session):** `npm view zod version` returned 4.6.7 (modified 2026-10-12); `npm view csv-parse version` returned 7.0.3. `postinstall`: none for either. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| zod | npm | multi-year (latest version published 2026-10-12) | about 347M/wk | github.com/colinhacks/zod | SUS (reason `too-new`, applies to the latest version only) | Flagged. Pin 4.6.5 (published 2026-09-13). Planner adds a `checkpoint:human-verify` before install |
| csv-parse | npm | multi-year (latest version published 2026-09-25) | about 20.8M/wk | github.com/adaltas/node-csv | SUS (reason `too-new`, latest version only) | Flagged. Pin 7.0.2 (2026-08-02) or 7.0.3 after review; dev-only; planner adds `checkpoint:human-verify` |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** zod, csv-parse (both mainstream packages; the seam keys on recency of the latest release, and neither has a `postinstall` script). [VERIFIED: `gsd-tools package-legitimacy check --ecosystem npm zod csv-parse`, `npm view <pkg> scripts.postinstall`]

Both names come from `.planning/research/STACK.md` (cited prior research) and were confirmed against the registry this session. Treat the install as needing the human-verify checkpoint, per protocol.

## Architecture Patterns

### System Architecture Diagram

```
                       OFFLINE (CI cron / manual)                          RUNTIME (Vercel)
  wago.tools (flaky, 503)                                                  
        |  retry+backoff (5 tries)                          Guild create / add-expansion route
        v                                                            |
  scripts/expansions/snapshot-reference.ts                           v
        | trim to manifest-referenced ids/names             seedExpansionForGuild(client, guild, name, ...)
        v                                                            |
  data/expansions/forever/reference/wago.json  <--(provenance)       v
        |   (committed, PR if changed)                    data/expansions/registry.ts  (client-safe meta)
        v                                                   |                         |
  VITEST GATE (CI)                                          | kind = 'legacy'         | kind = 'native' (Forever)
   - manifest-gate.test.ts (schema, ids, tokens,            v                         v
     phases, names, frozen names, allowlist ratchet)   catalogs.ts (server-only)   syncExpansionCatalog(client, expansionId)
   - seeder-golden-rows.test.ts (5 legacy, file snapshots)  |  adapters wrap          | read tiers -> match name/alias
   - no-live-fetch.test.ts (source scan)                    |  classicRaids etc.      | insert ONLY missing tiers (one bulk insert)
                                                            v                         v
                                                  frozen insert loop              raid_tiers rows (phase 1, active, visible, sort_order)
                                                  (golden-pinned)
   Owner, once after deploy:                                                                    |
   scripts/sync-forever-catalog.ts --apply  --> iterate Forever expansion rows --> syncExpansionCatalog
                                                                                                v
   Browser: DashboardContent (raid_tiers names) --> SetupGuide --> data/expansions/forever/manifest.ts
            raids in size order, bosses, "Unconfirmed" badge, "Bosses to be announced"
```

### Recommended Project Structure

```
data/expansions/
├── types.ts                    # ExpansionRegistryEntry, SeedMode, Classification, Role (type-only, no runtime imports)
├── registry.ts                 # CLIENT-SAFE meta: storedName, slug, game, seedMode, hasData. Imports nothing heavy
├── catalogs.ts                 # SERVER-ONLY: legacy adapters (wrap classicRaids, tbcRaids, ... + name maps), forever -> manifest
├── validate.ts                 # pure validators used by the gate (and reusable by tests on mutated copies)
├── forever/
│   ├── manifest.ts             # NATIVE manifest, typed `satisfies z.input<typeof ExpansionManifestSchema>`; client-safe
│   ├── lookup.ts               # getForeverRaidByTierName(name) using alias + normalized matching; client-safe
│   ├── provisional-allowlist.json
│   ├── __fixtures__/shipped-names.json     # frozen shipped raid names (D-09)
│   └── reference/wago.json     # committed snapshot with provenance (placeholder with build: null until first pull)
└── __tests__/
    ├── manifest-gate.test.ts
    ├── forever-reference.test.ts
    ├── no-live-fetch.test.ts
    └── sync-catalog.test.ts    # or app/services/__tests__/ next to the sync
domain/expansion/manifest-schema.ts   # zod schema. NOT exported from domain/expansion/index.ts (would bundle zod into clients)
app/services/expansionSeeder.ts       # registry lookup; frozen legacy loop; Forever -> sync
app/services/__tests__/expansionSeeder-golden.test.ts + __golden__/<slug>.rows.txt
scripts/expansions/snapshot-reference.ts
scripts/sync-forever-catalog.ts
.github/workflows/refresh-wago-snapshot.yml
```

Where `syncExpansionCatalog` lives is the planner's call; `app/services/expansionSeeder.ts` (per `ARCHITECTURE.md`) or a sibling `app/services/expansionCatalogSync.ts` that the seeder imports. A sibling file keeps the seeder under control and lets the admin script import it without the legacy catalog side effects (note: `expansionSeeder.ts` runs `transformClassicRaids()` etc. at import time, loading all five catalogs; the admin script does not need that).

### Pattern 1: Golden-row capture BEFORE refactor

**What:** Drive the unmodified `seedExpansionForGuild` with a recording fake, canonicalize every recorded insert into one JSON line per row, and assert with `toMatchFileSnapshot`.
**When to use:** First plan of the phase. The committed golden files are the contract that adapters and the registry refactor must not change.
**Details that matter:**
- The existing mock cannot be reused as-is. Its `single()` returns `{ data: null }` for `raid_tiers`, so `tier.id` throws inside the seeder's try block and the seeder returns an error. The golden mock must return a deterministic tier row from `raid_tiers` insert `.select().single()` (for example `{ id: 'tier-<n>' }`), resolve `loot_items` insert `.select('id, name, item_slot')` to the inserted rows plus ids (item_slot must be preserved because `isTokenSlot(item.item_slot)` filters on it), and resolve `wow_classes` select to the class name to id list. Build this as a second helper in the new golden test; do not edit the existing mock used by `expansionSeeder.test.ts`.
- Pin, per expansion, in call order: the `expansions` insert payload, each `raid_tiers` insert payload, each `loot_items` insert array (every row), each `loot_item_classes` insert array. Normalize tier ids to `tier-<n>` and item ids to `item-<n>` so output is deterministic. Serialize each row with sorted keys, one per line, prefixed with a record type (`TIER`, `ITEM`, `CLASS`). Row ORDER is part of the contract.
- `wowhead_id` is inserted as a STRING (`wowheadId: item.wowhead_id.toString()`), and tier inserts carry no `sort_order`. The golden file pins both, so the refactor cannot "helpfully" convert or add them for legacy.
- `vitest` does not write new snapshot files when `process.env.CI` is truthy; a missing or mismatched file fails [CITED: https://vitest.dev/guide/snapshot]. So the golden files MUST be committed, and nobody should run `vitest -u` to "fix" a failure here (a failure means the refactor changed rows).
- Run the real five names through `seedExpansionForGuild(mock, 'g1', name, true, true)` so the chains are exercised end to end.

**Example:**
```typescript
// @vitest-environment node
// Source: pattern; toMatchFileSnapshot per https://vitest.dev/guide/snapshot
import { describe, it, expect } from 'vitest'
import { seedExpansionForGuild } from '../expansionSeeder'

const LEGACY = [
  ['Classic', 'classic'],
  ['The Burning Crusade', 'tbc'],
  ['Wrath of the Lich King', 'wrath'],
  ['Cataclysm', 'cata'],
  ['Mists of Pandaria', 'mop'],
] as const

describe.each(LEGACY)('golden rows: %s', (name, slug) => {
  it('seeds byte-identical rows', async () => {
    const { supabase, recorded } = createSeederRecorder() // richer mock, deterministic ids
    const result = await seedExpansionForGuild(supabase, 'g1', name, true, true)
    expect(result.error).toBeUndefined()
    await expect(canonicalLines(recorded)).toMatchFileSnapshot(`./__golden__/${slug}.rows.txt`)
  })
})
```

### Pattern 2: Registry entry plus adapter (replaces the chains)

**What:** One table keyed by stored expansion name. Each entry carries meta (client-safe) and, in a server-only module, a catalog with its own classification and role lookups, so the seeder never compares `displayName`.
**Shape (types only; names are the planner's):**
```typescript
// data/expansions/types.ts  (no runtime imports)
export type SeedMode = 'legacy-insert' | 'sync'
export interface ExpansionMeta {
  storedName: string      // equals the key; must equal an EXPANSION_GAMES key (gate)
  slug: string            // key into EXPANSION_PHASES (gate)
  game: GameVersion       // must equal getExpansionGame(storedName) (gate)
  seedMode: SeedMode      // 'sync' only for Forever
  hasData: boolean        // false for the seven retail entries so getAvailableExpansions keeps its output
}
```
The server-only loader returns `{ raids: RaidDefinition[]; classify(name): Classification; rolesFor(name): Role[] }` per legacy entry, built from the existing maps (`MOP_ITEM_CLASSIFICATIONS`, `CATA_ITEM_CLASSIFICATIONS`, `WOTLK_ITEM_CLASSIFICATIONS`, `TBC_ITEM_CLASSIFICATIONS`, `ITEM_CLASSIFICATIONS`, and the five `*_ITEM_ROLES`). Keep the name lookup and the `|| 'Unlimited'` and `|| []` defaults exactly (byte-identical). Keep the exported surface the tests and routes use: `SUPPORTED_EXPANSIONS` (order: Classic, The Burning Crusade, Wrath of the Lich King, Cataclysm, Mists of Pandaria, Forever), `isSupportedExpansion`, `getExpansionDefinition` with the own-property guard, `getAvailableExpansions` (still lists the seven null-data retail names with `hasData: false`), `gameMismatchError`, `guildHasExpansion`, `getGuildExpansions`, `getExpansionGame`.
**Latent bug to close:** today the classification chain's final `else` falls back to the Classic maps for ANY unrecognized `displayName`. With a registry, an entry that has items but no classification map must be an explicit gate failure, not a silent Classic fallback (research Pitfall 5: unknown token or item means "needs review").

### Pattern 3: Insert-only, alias-matched sync

**What:** `syncExpansionCatalog(client, { expansionId, expansionName, dryRun? })` reads the guild expansion's existing tiers, matches each manifest raid by normalized name or any `previousNames` alias, and inserts only the missing ones in ONE bulk insert (a single PostgREST statement, so all-or-nothing per guild).
**Rules:**
- Never `update` and never `delete` anything. That alone satisfies "never deletes or renames a referenced row" for `raid_tiers`, and the test asserts the fake received zero update and zero delete calls.
- Do not touch officer-controlled columns on matched tiers (`is_guild_active`, `master_sheet_visible`, `is_active`, `submission_deadline`). Matched tiers produce no write at all.
- Match with `normalizeCatalogName` from `lib/loot/guild-scoped-lookup.ts` (trims, straightens curly apostrophes U+2018/U+2019, collapses whitespace, lowercases) so "Onyxia’s Lair" with a curly apostrophe does not become a duplicate tier.
- Inserted row, mirroring the legacy payload plus `sort_order`: `expansion_id`, `name`, `is_active`, `is_guild_active`, `master_sheet_visible`, `phase`, `sort_order` (D-07: size order, 1 to 3). `phase` comes from `getRaidPhase`-style lookup against `EXPANSION_PHASES.forever` (D-05), not from a second copy in the manifest.
- Return a structured result for the script and the tests: `{ matched: [{ name, tierId, via: 'name' | 'alias' }], inserted: [...rows], dryRun }`. In dry-run, compute and return `inserted` without calling `insert`.
- Check every `{ data, error }` and throw with context (`Failed to read raid_tiers for expansion <id>: ...`), matching the Phase 1 `selectAllPagesOrThrow` style.
**Concurrency caveat:** there is no unique index on `raid_tiers (expansion_id, name)` (only `idx_raid_tiers_expansion_id`, `idx_raid_tiers_name`, `pkey` exist). Idempotency is therefore read-then-insert, and two simultaneous syncs for the same expansion could both insert. Acceptable here because the new-guild path runs once inside the guild-creation request and the admin script is a single owner-run process; the script finishes with a duplicate-name verification query per expansion and prints any duplicates. A unique index would be a migration, which this phase may not ship (note for PLAT-06).

### Pattern 4: Source-scan test with floor and self-checks (house pattern)

Follow `utils/supabase/__tests__/typed-client-usage.test.ts` and `utils/analytics/__tests__/no-names-in-analytics.test.ts`: `// @vitest-environment node`, `fs`/`path` walk with a skip set (`node_modules`, `.next`), a minimum-files floor so the scan cannot go vacuous, a pure `findViolations(source)` function, a self-check that a synthetic violating string IS flagged and a clean one is not. Reuse the `readBalanced` approach from the analytics test to read call arguments if scanning `fetch(` arguments.

### Anti-Patterns to Avoid

- **Re-keying legacy data this phase.** Adapters wrap the existing files and expand name-keyed maps as-is; PLAT-06 does the conversion later.
- **Running sync over legacy expansions** for existing guilds (D-11, Pitfall 6).
- **Putting `phase` in the manifest AND in `EXPANSION_PHASES`.** D-05 makes `EXPANSION_PHASES.forever` the phase source; the manifest lists raid names only and the gate checks each manifest raid appears in exactly one phase entry.
- **Adding `manifest-schema.ts` to the `domain/expansion` barrel** (bundles zod into every client that imports `@/domain`).
- **Lazy sync on any request path or a cron** (explicitly rejected, D-08).
- **A name-keyed token or classification lookup in the native manifest.** Key items, classifications, roles and token classes by `wowhead_id` string; names are display only (GH-269 class).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing of wago tables | `split(',')` | `csv-parse/sync` with `columns: true, bom: true` | Quoted fields, embedded commas and apostrophes in `Name_lang`, BOM, CRLF |
| Manifest validation | ad hoc `if` checks | zod `strictObject` plus `superRefine` | Typos in keys must fail; cross-field rules (verified needs a verifier) are first-class |
| Raid name matching for aliases | `===` on names | `normalizeCatalogName` (existing) | Curly apostrophes and spacing already solved and tested in the repo |
| Paging Forever expansion rows in the script | manual `.range` loop | `selectAllPagesOrThrow` | Handles the 1000-row cap and surfaces errors |
| Typed service-role client | `createClient(...)` with casts | `createTypedServiceRoleClient()` | Phase 1 house rule (FIX-06) |
| Retry and backoff | nested `setTimeout` | one small `withRetry(fn, { attempts, baseMs, capMs, sleep })` with an injectable `sleep` | Testable with a fake sleep; one place for 503 policy |
| Snapshot of 5,700 rows | pretty-format `.snap` | `toMatchFileSnapshot` with line-per-row text | Reviewable diffs |
| Phase and raid coverage | new bespoke checks | extend `raid-phase-coverage.test.ts` logic into `validate.ts` | Already encodes GH-279 orphan-name and no-duplicate-phase rules |

**Key insight:** every piece here is a deceptively simple "just compare two lists" problem whose failure mode is a silent wrong row in a guild (GH-269, GH-279). The value is in the gates, not the code.

## Runtime State Inventory

> This is not a rename migration, but it touches already-created per-guild rows, so the same discipline applies.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Existing Forever guilds have an `expansions` row named `'Forever'` and zero `raid_tiers` (seeder comment: "seeding creates the expansion row only, with zero raid tiers"). Count in production is not queryable from this session (no DB access) | Data migration by script: `scripts/sync-forever-catalog.ts` iterates `expansions` where `name = 'Forever'`; dry-run first, owner applies once (D-08). Code edit alone does not reach these guilds |
| Live service config | None found: no external service stores raid tier names for Forever. The Wowhead tooltip widget loads from `wow.zamimg.com/widgets/power.js` in the browser (`app/layout.tsx:216`) and is unaffected | None |
| OS-registered state | None: no cron or scheduled task is added locally. A GitHub Actions `schedule` is added, which only runs from the default branch | Workflow must be merged to `main` before the cron fires; manual dispatch also requires it on `main` |
| Secrets and env vars | Admin script needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (same as existing scripts). The refresh workflow needs the existing `NPM_RC` secret (same as `refresh-item-data.yml`) and `GITHUB_TOKEN`. No new secret | None new |
| Build artifacts | None: no package rename. New dependencies change `package-lock.json` | Commit the lockfile with the install |

**Nothing else found:** verified by reading `expansionSeeder.ts`, the schema FKs, and the workflow files.

## Common Pitfalls

### Pitfall 1: Adding Forever raids breaks the phase-coverage test and silently changes the reserve-run flow
**What goes wrong:** `getExpansionSlug` reads `EXPANSION_NAME_TO_SLUG`, which has no `'Forever'` key, so `getExpansionSlug('Forever')` is `null`. `raid-phase-coverage.test.ts` skips expansions with zero raids today (its comment (d) says so) and applies the slug, orphan-name and duplicate-phase checks automatically once raids land, so the `has a resolvable slug` test fails for Forever the moment the manifest feeds `raids`. If you "fix" it by adding `'Forever': 'forever'` to the map, `/api/reserve-runs/raid-tiers?expansion=Forever` stops returning 400 "Unknown expansion" and starts returning tiers, and `CreateReserveRunModal` (which for Forever guilds shows "WoW Forever has no raids open yet." only when tiers are empty) will offer Forever raids for reserve runs with no loot.
**How to avoid:** Resolve the slug through the new registry entry (`slug: 'forever'`) for the seeder and for the coverage test, and leave `EXPANSION_NAME_TO_SLUG` untouched (recommended, see Open Question 1). If the planner instead adds it to the map, add a test pinning the reserve-run route behaviour for Forever and note that `.limit(1)` on `expansions` picks ANY guild's Forever expansion, which may be a not-yet-synced one with zero tiers.
**Warning signs:** `raid-phase-coverage` failing with `getExpansionSlug("Forever") returned null`; the reserve-run modal listing Forever raids.

### Pitfall 2: The existing Forever seeder test asserts zero tiers
**What goes wrong:** `expansionSeeder.test.ts` "seeds Forever with zero raid tiers and no error" asserts `fromCalls` does not contain `raid_tiers` and `loot_items`. After this phase Forever seeds three tiers.
**How to avoid:** Update that test deliberately (three tier inserts with the exact payload, still no `loot_items`, `loot_item_classes` or `wow_classes` calls). The existing recording mock needs `select().eq()` thenable results for the sync's existing-tier read; extend it or use the stateful fake.

### Pitfall 3: A strict gate fails on legacy data on day one
**What goes wrong:** Measured this session against `getExpansionDefinition` output: the same `wowhead_id` appears under more than one boss in the same raid (Classic 95, Wrath 109, Cata 200, MoP 127, TBC 0; for example Molten Core "Flamewaker Legplates (18861)" under Lucifron and Magmadar), always under DIFFERENT bosses (zero same-boss duplicates in every expansion). Cross-raid id sharing exists too (Classic 7, TBC 10, Cata 12; the Classic file header documents it). `Token`-slot items with no `TOKEN_CLASS_MAPPING` match: Wrath 14 ("Fragment of Val'anyr"), Cata 19 ("Eternal Ember", "Seething Cinder"); Classic, TBC, MoP have none. All of this is intended multi-boss pool data and by design they get no `loot_item_classes` rows.
**How to avoid:** Make the gate strict for native manifests (unique `wowheadId` keys, every Token item has `tokenClasses`, unknown token is a failure) and baseline-ratcheted for legacy adapters: legacy rule is "no identical `(raid, boss, wowhead_id)` triple, no duplicate raid names", and the token-class check compares against a frozen exception list that may only shrink. Do not tell the planner "duplicate ids fail" without this scoping.

### Pitfall 4: The refresh workflow opens a PR every week because of `fetchedAt`
**What goes wrong:** If the script rewrites the snapshot JSON on every run, the `fetchedAt` timestamp changes and `git diff --quiet` always reports a change. D-13 says open a PR only if the snapshot changed.
**How to avoid:** The script computes a canonical hash of the trimmed data plus the build string and compares with the committed provenance; if equal it does not touch the file. Only a real data or build change rewrites the file (and updates `fetchedAt`).

### Pitfall 5: Workflow PRs opened with `GITHUB_TOKEN` do not start CI
**What goes wrong:** Events caused by `GITHUB_TOKEN` do not trigger other workflow runs, so the bot PR gets no `Test` run [ASSUMED: documented GitHub Actions behaviour, not re-verified this session]. The existing `refresh-item-data.yml` has the same property and relies on human review.
**How to avoid:** Say so in the PR body. Because of D-15, when wago finally lists a bot-snapshot boss, the gate fails until a human promotes the boss in the same PR; the PR body should name that step. Use a fixed branch name (for example `chore/refresh-wago-snapshot`) with `git push --force` and `gh pr create || gh pr edit`, instead of the existing `chore/refresh-item-data-${{ github.run_id }}` pattern, to avoid piling up one PR per week while the previous one is unmerged. `schedule:` and `workflow_dispatch` only exist for workflows on the default branch.

### Pitfall 6: Row order and key order make "byte-identical" flaky
**What goes wrong:** JSON key order follows insertion order; a harmless refactor of the object literal reorders keys and fails the golden file.
**How to avoid:** Canonicalize with sorted keys in the test serializer, keep ROW order (insert order) as part of the contract, and pin value types (the string `wowhead_id`).

### Pitfall 7: `getRaidPhase` returns `null` silently for a name mismatch
**What goes wrong:** An orphan raid name in `EXPANSION_PHASES.forever` yields `phase: null`, so the tier is seeded invisible (`isInInitialPhase` false) and never appears (GH-279). 
**How to avoid:** The gate asserts every manifest raid name appears in exactly one `EXPANSION_PHASES.forever` phase and vice versa (extends the existing orphan and duplicate checks), with exact-string equality (`getRaidPhase` uses `includes`).

### Pitfall 8: SetupGuide visibility is narrower than it looks
**What goes wrong:** The new list only renders for users with `manage_settings` (`DashboardContent.tsx:1996-2003` gates `SetupGuide`), is hidden once dismissed (`localStorage` key `setup-guide-dismissed-<guildId>`), is replaced by the celebration card when all steps are complete (`SetupGuide.tsx:249`), and returns `null` while a Forever guild's tiers are `'loading'` (line 211). A Forever guild whose five steps are done will not see it.
**How to avoid:** This matches D-02 ("setup guide only"); state it in the plan and in UAT so the verifier does not expect the list on other surfaces. Render the list only when `isForeverGuild && raidTierStatus === 'available'` and inside the non-celebration `Card`.

### Pitfall 9: Forever tiers are guild-active only if the DashboardContent query sees them
**What goes wrong:** `DashboardContent.tsx` loads `raid_tiers` with `.eq('is_guild_active', true)` and `raidTierStatus` is `'none'` when that list is empty. Sync inserts with `is_guild_active: true`, so all three appear; an officer who later deactivates a tier removes it from the list. 
**How to avoid:** Pass tier NAMES from the existing `raidTiers` state to SetupGuide (new optional prop such as `raidTierNames`); do not add a second query. Resolve each name through the manifest lookup (alias and normalized match); unknown names are skipped.

### Pitfall 10: zod is not a declared dependency
**What goes wrong:** `node_modules/zod` is 4.3.5, present only as a transitive dependency of eslint tooling (`package-lock.json` lines 12043 to 12045); `package.json` does not declare it. Importing it works until an eslint bump drops it.
**How to avoid:** Declare it (exact pin) as part of the first plan that imports it. Also: the transitive 3.25.76 copy under `chromium-bidi` is isolated and irrelevant.

### Pitfall 11: Scripts and tests are typechecked
`tsconfig.json` includes `**/*.ts` and excludes only `node_modules` and `companion`, so `scripts/expansions/*.ts` and every new test must typecheck in CI (`npm run typecheck`). `csv-parse` types are bundled; keep script code strict-clean.

### Pitfall 12: wago facts are unverified this session
The CSV URL pattern, the build-list JSON shape and exact headers come from prior probes (2026-09-25 success, 2026-10-12 503). Design the script to fail loudly with a clear message if an expected header is missing, and treat the first successful pull as the point where headers are confirmed.

## Code Examples

### zod 4 manifest schema (API verified locally on installed 4.3.5; same API documented for 4.x)

```typescript
// domain/expansion/manifest-schema.ts  (do NOT export from domain/expansion/index.ts)
// Source: zod 4 API https://zod.dev/api ; runtime-checked on installed zod 4.3.5 this session
import { z } from 'zod'

const WowheadId = z.string().regex(/^\d+$/)          // items keyed by wowhead_id as a string, like the DB write path
const Verification = z.literal(['verified', 'provisional'])

const BossSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  verification: Verification,
  verifiedBy: z.literal(['wago-dungeon-encounter', 'owner']).optional(),
  source: z.string().min(1),                           // per-entry provenance note (D-12)
  encounterId: z.int().nullable().default(null),       // wago DungeonEncounter.ID once known
}).superRefine((boss, ctx) => {
  if (boss.verification === 'verified' && !boss.verifiedBy) {
    ctx.addIssue({ code: 'custom', message: 'verified boss needs verifiedBy', path: ['verifiedBy'], input: boss })
  }
})

const RaidSchema = z.strictObject({
  name: z.string().min(1),                             // exact raid_tiers.name
  previousNames: z.array(z.string().min(1)).default([]),
  size: z.int().positive(),                            // 10, 20, 40 (D-07 order)
  opens_on: z.iso.date().nullable(),                   // data only (D-06)
  mapId: z.int().nullable().default(null),             // wago Map.ID once known
  bosses: z.array(BossSchema),                         // empty allowed: "Bosses to be announced"
})

export const ExpansionManifestSchema = z.strictObject({
  slug: z.string().regex(/^[a-z]+$/),
  storedName: z.string().min(1),
  gameVersion: z.literal(['classic', 'forever']),
  reference: z.strictObject({ product: z.string(), buildPrefix: z.string() }),
  raids: z.array(RaidSchema).min(1),
  items: z.record(WowheadId, z.never()).default({}),   // Forever: {} until drops are revealed; Phase 3+ widens this
  tokenClasses: z.record(WowheadId, z.array(z.string()).min(1)).default({}),
})
export type ExpansionManifest = z.infer<typeof ExpansionManifestSchema>
```
Verified behaviours: `z.strictObject` rejects unknown keys (issue code `unrecognized_keys`); `z.object` silently strips them (use `strictObject` so a typo like `previousName` fails); `z.literal([...])` takes an array of values; `z.iso.date()` accepts `YYYY-MM-DD`; `.superRefine((v, ctx) => ctx.addIssue({ code: 'custom', message, path }))` works; `z.int()` exists; `z.infer`, `z.input`, `z.output` are the type helpers; `z.prettifyError` exists for readable gate messages. [CITED: https://zod.dev/api]; [VERIFIED: local run against `node_modules/zod` 4.3.5]

### Forever manifest values (all boss names provisional; sources noted)

```typescript
// data/expansions/forever/manifest.ts   (client-safe: type-only import of the schema)
import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'

const GUIDE_SOURCE =
  '2026-09-13 todo, section "Day-one checklist results, checked 2026-09-25": third-party guides, not in DungeonEncounter'

export const FOREVER_MANIFEST = {
  slug: 'forever',
  storedName: 'Forever',
  gameVersion: 'forever',
  reference: { product: 'wow_classic_beta', buildPrefix: '1.60.' },
  raids: [
    { name: 'Barrow Deeps', previousNames: [], size: 10, opens_on: '2026-12-09', mapId: null, bosses: [
      // Order is the guide's listed order [ASSUMED to be encounter order]. "Well of Sorrow" reads like a place, not a boss: ask the owner.
      { key: 'deepscar-matriarch', name: 'Deepscar Matriarch', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      { key: 'khalith-the-dreadspinner', name: 'Khalith the Dreadspinner', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      { key: 'amethrax', name: 'Amethrax', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      { key: 'ravus-and-darlissa', name: 'Ravus and Darlissa', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      { key: 'elder-tangleclaw', name: 'Elder Tangleclaw', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      { key: 'well-of-sorrow', name: 'Well of Sorrow', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      { key: 'dellynar-songwood', name: "Del'lynar Songwood", verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      { key: 'sonya-darkhallow', name: 'Sonya Darkhallow', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
    ] },
    { name: 'Hyjal Summit', previousNames: [], size: 20, opens_on: '2026-12-09', mapId: null, bosses: [] },   // no names exist in any repo artifact
    { name: "Onyxia's Lair", previousNames: [], size: 40, opens_on: '2026-12-09', mapId: null, bosses: [
      { key: 'onyxia', name: 'Onyxia', verification: 'provisional', source: 'inferred from the raid name [ASSUMED]; confirm via DungeonEncounter or owner', encounterId: null },
    ] },
  ],
  items: {},
  tokenClasses: {},
} as const satisfies ExpansionManifest
```
The eight Barrow Deeps names are quoted from the todo: "Deepscar Matriarch, Khalith the Dreadspinner, Amethrax, Ravus and Darlissa, Elder Tangleclaw, Well of Sorrow, Del'lynar Songwood, Sonya Darkhallow" [VERIFIED: `.planning/todos/pending/2026-09-13-build-world-of-warcraft-forever-support-with-a-repeatable-ex.md`, "Day-one checklist results, checked 2026-09-25", item 1]. The todo says these were reported by third-party guides and were not in DungeonEncounter on 2026-09-25. `opens_on` 2026-12-09 and sizes 10, 20, 40 come from D-06 and D-07 and the milestone brief. (`as const satisfies` plus `z.default` input types may need `z.input`; the planner should use `satisfies z.input<typeof ExpansionManifestSchema>` as `STACK.md` suggests.)

### Phases entry and slug (D-05)

```typescript
// data/expansion-phases.ts -> add to EXPANSION_PHASES (existing shape: { phase, name, raids }[])
forever: [
  { phase: 1, name: 'Phase 1', raids: ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"] },
],
```

### Sync core (skeleton; planner fills error handling and types)

```typescript
// app/services/expansionCatalogSync.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeCatalogName } from '@/lib/loot/guild-scoped-lookup'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import { EXPANSION_PHASES } from '@/data/expansion-phases'

export async function syncExpansionCatalog(
  supabase: SupabaseClient,
  expansionId: string,
  opts: { dryRun?: boolean } = {},
) {
  const { data: existing, error } = await supabase
    .from('raid_tiers').select('id, name').eq('expansion_id', expansionId)
  if (error) throw new Error(`Failed to read raid_tiers for expansion ${expansionId}: ${error.message}`)

  const byName = new Map((existing ?? []).map(t => [normalizeCatalogName(t.name), t.id]))
  const toInsert = []
  const matched = []
  FOREVER_MANIFEST.raids.forEach((raid, index) => {
    const names = [raid.name, ...raid.previousNames].map(normalizeCatalogName)
    const hit = names.find(n => n && byName.has(n))
    if (hit) { matched.push({ name: raid.name, tierId: byName.get(hit), via: hit === names[0] ? 'name' : 'alias' }); return }
    toInsert.push({ expansion_id: expansionId, name: raid.name, is_active: index === 0, is_guild_active: true,
                    master_sheet_visible: true, phase: phaseFor(raid.name), sort_order: index + 1 })
  })
  if (!opts.dryRun && toInsert.length > 0) {
    const { error: insertError } = await supabase.from('raid_tiers').insert(toInsert)   // one statement
    if (insertError) throw new Error(`Failed to insert raid_tiers: ${insertError.message}`)
  }
  return { matched, inserted: toInsert, dryRun: !!opts.dryRun }
}
```
`is_active: index === 0` mirrors the legacy `isActive: index === 0` ([ASSUMED] choice; see Assumptions A2).

### Retry and backoff for the snapshot script

```typescript
// scripts/expansions/snapshot-reference.ts (policy; numbers are recommendations [ASSUMED])
const RETRYABLE = new Set([429, 500, 502, 503, 504])
// attempts: 5; delay = min(capMs, baseMs * 2^attempt) with +/-25% jitter; baseMs 2000, capMs 60000;
// honour Retry-After when present; per-request timeout 30s via AbortSignal.timeout(30_000);
// network errors and timeouts are retryable; 403 and 404 are terminal (404 body "Table not found" means the table does not exist on this build).
// Outcome after exhausted retries on 503: print "::notice::wago.tools unavailable after N attempts, snapshot not refreshed",
// write GITHUB_OUTPUT outage=true, exit 0 (D-13). Any other failure (parse error, missing header, no 1.60. build) exits non-zero.
// Resolve the build by filtering /api/builds on startsWith('1.60.') and taking the HIGHEST numeric last segment;
// the list is NOT date-sorted. Send an identifying User-Agent header (plain scripted fetches got 403 on 2026-09-13) [ASSUMED].
// Take `fetchImpl` and `sleep` as injectable parameters so tests never touch the network.
```

### No-live-fetch scan (shape)

```typescript
// data/expansions/__tests__/no-live-fetch.test.ts  // @vitest-environment node
// Scope: .ts/.tsx under app, lib, utils, domain, components, data, discord-bot + EVERY test file (including this directory), skipping node_modules/.next.
// Excludes: this test file itself and scripts/ (the one approved network site is scripts/expansions/snapshot-reference.ts).
// Rules (comments stripped first):
//  1. no fetch-family call (fetch(, axios, http(s).get/request, got(, XMLHttpRequest, new WebSocket) whose argument text contains 'wago.tools' or 'wowhead.com'
//  2. the host strings 'wago.tools' and 'nether.wowhead.com' appear in no scanned file (baseline today: zero hits outside next.config.ts CSP and scripts/)
//  3. nothing under data/, app/, lib/, utils/, domain/ imports from 'scripts/'
// Floor: scans >= N files (set from the measured count). Self-checks: a synthetic violating string is flagged; a clean string is not.
```
Baseline measured this session: first-party runtime code contains no `fetch` to `wago.tools` or `nether.wowhead.com`; the only `wowhead.com` strings in scanned dirs are link builders (`domain/expansion/wowhead.ts`, `app/components/ItemLink.tsx` `href`), data-file comments, and test fixtures. `next.config.ts:36` lists `https://nether.wowhead.com` in CSP `connect-src` (root file, not scanned). The Wowhead tooltip widget is a third-party browser script loaded from `wow.zamimg.com/widgets/power.js` (`app/layout.tsx:216`); it is out of scope for EXPN-06 by definition (no first-party code fetches), and the plan should say so for the verifier. A synthetic self-check string must be built by concatenation (or the scan must skip its own file) so the test does not flag itself.

### Admin script shape

```typescript
// scripts/sync-forever-catalog.ts   usage: npx tsx scripts/sync-forever-catalog.ts [--apply]
// Precedent: scripts/backfill-team-event-routing.ts is "SAFE BY DEFAULT: dry-run unless you pass --apply" with
//   const APPLY = process.argv.includes('--apply'); env loaded by reading .env.local manually before creating the client.
// Recommend the same: dry-run by default, --apply writes (D-08 only requires that a dry-run mode exists; defaulting to dry-run is safer).
// 1. load .env.local (copy the worktree-aware loader from backfill-team-event-routing.ts:21-27)
// 2. const supabase = createTypedServiceRoleClient()
// 3. const rows = await selectAllPagesOrThrow('forever expansions', (s, e) =>
//      supabase.from('expansions').select('id, guild_id').eq('name', FOREVER_EXPANSION_NAME).order('id').range(s, e))
// 4. for each row: const r = await syncExpansionCatalog(supabase, row.id, { dryRun: !APPLY })
//    print per expansion id: matched count, rows to insert (name, phase, sort_order). IDs and counts only, no guild names.
// 5. after --apply, re-read and report any expansion with duplicate tier names (no unique index exists).
// 6. add "sync:forever": "tsx scripts/sync-forever-catalog.ts" to package.json scripts.
```

### SetupGuide list (placement spec for the planner)

- Add an optional prop to `SetupGuideProps`, for example `raidTierNames?: string[]`; `DashboardContent.tsx` passes `raidTiers.map(t => t.name)` (state declared at line 373, set from the guild-active query near line 700) next to `raidTierStatus={raidTierStatus}` at lines 1997 to 2003.
- Render a new section inside the non-celebration `Card`, after the `</ol>` (the steps list ends near line 460), only when `isForeverGuild && raidTierStatus === 'available'`. The existing waiting rows (`isWaitingStep`, `FOREVER_WAITING_NOTE` = 'Not available for WoW Forever yet', lines 219-220 and 392) stay for `raidTierStatus === 'none'` and are unchanged.
- Look up each tier name with the manifest lookup (alias and normalized), then order by manifest raid size (D-07), show raid name, size ("10-player" style), an opens-on line sourced from `opens_on` ("Raids open Dec 9" or similar, owner sign-off), each boss name with an `Unconfirmed` text badge after provisional bosses (use `components/ui/badge.tsx`; the visible word carries the meaning, not colour), one line per raid with any provisional boss ("Boss names are confirmed when the raid opens."), and one muted line for a raid with no bosses ("Bosses to be announced"). All copy is proposed and needs owner sign-off in its own PR; no em dashes (the existing test file already asserts `document.body.textContent` has no `EM_DASH`).
- `SetupGuide.test.tsx` has a hoisted supabase mock and stubs global `fetch` for the invites call; new tests reuse `renderGuide` with `game: 'forever'`, `raidTierStatus: 'available'` and the new prop. The manifest is static data, so no extra mock is needed.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-written `EXPANSION_DATA` registry and displayName chains | One registry; per-entry classify and role lookups; native manifest for Forever | This phase | Closes EXPN-02; chains at `expansionSeeder.ts:449-462`, `:470-481` and registry `:224-237` go away |
| Seed-once copy of catalog into per-guild rows | Insert-only idempotent sync for Forever; legacy keeps frozen seed loop | This phase | Existing zero-tier Forever guilds are reached by the admin script |
| Name-keyed classification and token class lookups | Native manifest keyed by `wowhead_id`; names display-only | This phase (Forever only) | Avoids a sixth GH-269 copy; legacy conversion is PLAT-06 |
| `z.object` default strip | `z.strictObject` for data files | zod 4 | Typos in a data file fail the gate |

**Deprecated or outdated:** `EXPANSION_NAME_TO_SLUG` stays a legacy name-to-slug map; the brief's seeder line numbers (195-207, 382-405) are stale, use 224-237, 449-462, 470-481.

## Verified In-Repo Facts (quoted verbatim)

These are the discrete values the plan depends on, each read with `Read` this session.

- Registry, `app/services/expansionSeeder.ts:224-237`: `const EXPANSION_DATA: Record<string, ExpansionDefinition | null> = {` with keys in order `'Classic'`, `'The Burning Crusade'`, `'Wrath of the Lich King'`, `'Cataclysm'`, `'Mists of Pandaria'`, `'Forever': FOREVER_DATA`, then `null` for `'Warlords of Draenor'`, `'Legion'`, `'Battle for Azeroth'`, `'Shadowlands'`, `'Dragonflight'`, `'The War Within'`. [VERIFIED: expansionSeeder.ts:224-237]
- Forever stub, `:215-220`: `name: 'Forever', displayName: 'Forever', raids: [], game: EXPANSION_GAMES.Forever`. [VERIFIED: expansionSeeder.ts:215-220]
- Classification chain `:451-462`: `if (expansionData.displayName === 'Mists of Pandaria')` then `CATA`, `'Wrath of the Lich King'`, `'The Burning Crusade'`, final `else { classificationMap = ITEM_CLASSIFICATIONS }`; then `const classification = classificationMap[item.name] || 'Unlimited'` and `const allocation_cost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0`. Role chain `:469-481` is the same shape ending `else { roleMap = CLASSIC_ITEM_ROLES }` and `const roles = roleMap[item.name] || []`. [VERIFIED: expansionSeeder.ts:449-481]
- Tier insert `:429-438` writes exactly `expansion_id`, `name`, `is_active: raid.isActive`, `is_guild_active: isInInitialPhase`, `master_sheet_visible: isInInitialPhase`, `phase: raid.phase`, where `const isInInitialPhase = raid.phase !== null && raid.phase <= 1` (no `sort_order`). [VERIFIED: expansionSeeder.ts:427-438]
- Loot row `:483-493`: `raid_tier_id`, `name`, `item_slot: item.slot`, `wowhead_id: item.wowheadId`, `boss_name: boss.name`, `is_available: true`, `classification`, `allocation_cost`, `roles`. [VERIFIED: expansionSeeder.ts:483-493]
- Token class rows `:538-543`: `loot_item_id`, `class_id`, `spec_id: null`, `spec_type: 'primary'`; token rows are `insertedItems.filter(item => isTokenSlot(item.item_slot))` from `.insert(lootItems).select('id, name, item_slot')`; class ids come from `from('wow_classes').select('id, name')`. [VERIFIED: expansionSeeder.ts:499-557]
- Signature `:340-346`: `seedExpansionForGuild(supabase: SupabaseClient, guildId: string, expansionName: string, setAsCurrent: boolean = true, useServiceRole: boolean = false): Promise<{ expansionId: string; error?: string }>`. Call sites: `app/api/guilds/route.ts:160`, `app/api/guilds/change-expansion/route.ts:113`, `app/api/guilds/[id]/expansions/route.ts:124`, `scripts/seed-test-data.ts:224` and `:241`, `scripts/seed-test-data-multiuser.ts:232` and `:249`. All route callers pass `useServiceRole = true`. [VERIFIED: grep plus Read]
- `domain/expansion/game.ts`: `export const FOREVER_EXPANSION_NAME = 'Forever'` (line 33); `EXPANSION_GAMES` keys `Classic`, `'The Burning Crusade'`, `'Wrath of the Lich King'`, `Cataclysm`, `'Mists of Pandaria'` map to `'classic'`, `[FOREVER_EXPANSION_NAME]: 'forever'` (lines 41-48); `export type RaidTierStatus = 'loading' | 'none' | 'available'` (line 23); `getExpansionGame(name: unknown): GameVersion | null` with an own-property guard (lines 70-75); header (lines 9-13) says the file "must import nothing: client components import it directly, and it must never pull in raid data". [VERIFIED: game.ts:9-75]
- `data/expansion-phases.ts`: `EXPANSION_NAME_TO_SLUG` has keys `'Classic'`, `'Classic WoW'`, `'The Burning Crusade'` (tbc), `'Wrath of the Lich King'` (wrath), `'Cataclysm'` (cata), `'Mists of Pandaria'` (mop) and the six retail names; there is no `'Forever'` key (lines 8-21). `EXPANSION_PHASES: Record<string, PhaseDefinition[]>` with `PhaseDefinition { phase: number; name: string; raids: string[] }` (lines 1-5, 33). Classic phase 1 is `{ phase: 1, name: 'Phase 1', raids: ['Molten Core', "Onyxia's Lair"] }`; TBC phase 3 contains `'Hyjal Summit'`; Wrath uses `'Onyxia\'s Lair (Wrath)'` and `'Naxxramas (Wrath)'`. [VERIFIED: expansion-phases.ts:1-97]
- `raid_tiers` columns (generated types): `expansion_id`, `id`, `is_active`, `is_guild_active`, `master_sheet_visible`, `name`, `phase`, `sort_order`, `submission_deadline`. `loot_items`: `allocation_cost`, `armor_type`, `boss_name`, `classification`, `icon_url`, `id`, `is_available`, `is_loot_council`, `item_slot`, `item_type`, `name`, `notes`, `officer_notes`, `primary_stat`, `raid_tier_id`, `roles`, `weapon_type`, `wowhead_id` (number). [VERIFIED: lib/database.types.ts Row types]
- Tables referencing `raid_tiers` by FK: `guild_item_priorities`, `loot_deadlines`, `loot_history`, `loot_items`, `loot_submissions`, `raid_events`, `reserve_runs`. Referencing `loot_items`: `blp_credits`, `blp_tracking`, `guild_item_priorities`, `loot_history`, `loot_item_classes`, `loot_submission_items`, `reserve_awards`. `raid_tiers.expansion_id` FK is `ON DELETE CASCADE` to `expansions`. No unique constraint on `raid_tiers (expansion_id, name)`: the baseline defines `raid_tiers_pkey` and indexes `idx_raid_tiers_expansion_id`, `idx_raid_tiers_is_active`, `idx_raid_tiers_master_sheet_visible`, `idx_raid_tiers_name`, `idx_raid_tiers_phase`, `idx_raid_tiers_submission_deadline`. [VERIFIED: lib/database.types.ts foreignKeyName entries; supabase/migrations/20260101000000_baseline_schema.sql:2479, 2910-2930, 3381]
- `sort_order` on `raid_tiers` is read by `app/api/reserve-runs/raid-tiers/route.ts` (`.order('phase', ...).order('sort_order', ...)`); the seeder never writes it. [VERIFIED: route.ts:41-46]
- SetupGuide: `FOREVER_WAITING_NOTE = 'Not available for WoW Forever yet'` (line 30), `isForeverGuild` (56), `foreverRaidsLoading` (70), `foreverAwaitingRaids` (71), `isWaitingStep` (219-220), early return `if (dismissed || loading || foreverRaidsLoading) return null` (211), celebration branch `if (celebrating || allComplete)` (249). DashboardContent: `const raidTierStatus: RaidTierStatus = loading ? 'loading' : noRaidTiers ? 'none' : 'available'` (1862), `<SetupGuide ... raidTierStatus={raidTierStatus} />` (1997-2003), tiers query `.select('id, name, is_active, phase').eq('expansion_id', expansionId).eq('is_guild_active', true)` (near 681-684). [VERIFIED]
- Phase 1 reusable assets: `utils/supabase/paginate.ts` exports `paginatedSelect` and `selectAllPagesOrThrow<T>(label, fetchPage, pageSize = 1000)` (throws `Failed to read ${label}: ${message}`); `utils/supabase/typed-service-role.ts` exports `type TypedServiceClient = SupabaseClient<Database>` and `createTypedServiceRoleClient()`; `domain/expansion/wowhead.ts` exports `getWowheadDomain` and `wowheadItemUrl`, with `'Forever': 'forever'` in its map; scan tests: `utils/supabase/__tests__/typed-client-usage.test.ts` (`MIN_ROUTE_FILES = 10`, `findUntypedClientUse`, self-check cases) and `utils/analytics/__tests__/no-names-in-analytics.test.ts` (`SCAN_DIRS = ['app', 'lib', 'utils', 'components']`, `readBalanced`, `extractAnalyticsCalls`). [VERIFIED]
- Scripts: `scripts/backfill-team-event-routing.ts` header "SAFE BY DEFAULT: dry-run unless you pass --apply" and `const APPLY = process.argv.includes('--apply')`; env loaded by reading `.env.local` (worktree-aware); clients built from `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. `scripts/seed-classic-raids.ts` is the older shape (manual `.env.local` parse, `npx tsx scripts/seed-classic-raids.ts <guild_id>`, no dry-run). npm script style: `"seed:classic": "tsx scripts/seed-classic-raids.ts"`. Dry-run precedents also in `create-gift-code.ts`, `populate-missing-types.ts`, `populate-primary-stat.ts`, `purge-test-characters.ts`. [VERIFIED]
- `.github/workflows/refresh-item-data.yml`: `on: push: branches: [main] paths: - "data/*-raids.ts"` plus `workflow_dispatch`; `permissions: contents: write, pull-requests: write`; `concurrency: group: refresh-item-data, cancel-in-progress: false`; Node 22; writes `.npmrc` from `secrets.NPM_RC`; `npm ci`; skips PR when `git diff --quiet -- $maps`; branch `chore/refresh-item-data-${{ github.run_id }}`; `gh pr create --base main --head "$branch"`. [VERIFIED: refresh-item-data.yml:20-80]
- Vitest: `vitest.config.ts` uses `globals: true`, default `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, alias `'@'` to the repo root; scan tests opt into node with the `// @vitest-environment node` docblock; no `.snap` file, `__snapshots__` directory or `toMatchSnapshot`/`toMatchFileSnapshot` call exists anywhere in the repo today, so golden files are new ground. [VERIFIED]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Guide-listed Barrow Deeps names are in encounter order | Forever manifest values | Setup guide boss order is cosmetic; owner confirms Oct 21 |
| A2 | Forever tiers seed `is_active` true for the first raid only, mirroring legacy `index === 0` | Sync core | `is_active` drives "current phase" highlighting in PriorityListTab and master sheet; wrong choice shows a different default tier. Confirm or choose all-true |
| A3 | "Onyxia" is the sole Onyxia's Lair boss name | Forever manifest values | Cosmetic; provisional anyway |
| A4 | wago scripted fetch may need an identifying User-Agent (403 on 2026-09-13, 200 on 2026-09-25) | Retry and backoff | Script fails 403; add header or adjust |
| A5 | Retry parameters (5 attempts, 2s base, 60s cap, 30s timeout) are sensible | Retry and backoff | Tuning only |
| A6 | `GITHUB_TOKEN`-opened PRs do not trigger CI workflows | Pitfall 5 | If wrong, the PR gets a gate run (harmless) |
| A7 | `/api/builds` returns JSON listing builds with a version string; `/db2/<Table>/csv?build=<build>` returns CSV; array columns flatten with `_N` suffixes | wago design | First pull may need header/shape adjustments; STACK.md and the todo describe these from prior probes, not re-verified (wago not contacted this session) |
| A8 | Parsing zod at runtime in the seeder is unnecessary | Standard Stack alternatives | Low; parse-once is cheap if the planner prefers it |
| A9 | `getRaidPhase` style phase lookup via `EXPANSION_PHASES.forever` is the right single source (manifest carries no `phase`) | Pattern 3 | If the owner wants phase in the manifest, add a gate equality check instead |

## Open Questions

1. **Slug resolution for Forever (recommended: registry owns it).**
   - What we know: `getExpansionSlug('Forever')` is `null`; the phase-coverage test and the seeder's `getRaidPhase` need a slug; the reserve-run route uses the same map.
   - What's unclear: whether the owner wants Forever reserve runs to light up now.
   - Recommendation: registry entry carries `slug: 'forever'`; seeder and coverage test resolve through it; leave `EXPANSION_NAME_TO_SLUG` and the reserve-run route unchanged; add one test that the route still answers 400 for `expansion=Forever`.

2. **Dry-run default for the admin script.** CONTEXT requires a dry-run mode; the repo precedent defaults to dry-run with `--apply`. Recommendation: follow the precedent.

3. **wago CSV headers and build list shape.** Unknown until the first successful pull (wago was 503 on every 2026-10-12 probe). The script must validate expected headers (`ID`, `Name_lang`, `MapID`, `OrderIndex`, `DifficultyID` for DungeonEncounter; `ID`, `MapName_lang`, `InstanceType`, `ExpansionID`, `Directory` for Map; `ID` plus the columns the manifest needs for ItemSparse) and fail loudly. Column names are from WoWDBDefs `DungeonEncounter.dbd` and `Map.dbd` (fetched this session from raw.githubusercontent.com, which is not wago or Wowhead); array flattening (`_N`) is not confirmed. [CITED: github.com/wowdev/WoWDBDefs definitions]

4. **Owner input (Oct 21):** Hyjal Summit boss names (none exist), whether "Well of Sorrow" is a boss, Onyxia's Lair boss. Until then: Hyjal empty ("Bosses to be announced"), everything else provisional.

5. **What the trimmed snapshot contains while Forever has no items and unknown map ids.** Recommendation: `DungeonEncounter` rows whose normalized `Name_lang` matches any manifest boss name (any map) plus rows for any manifest `mapId`; `Map` rows for manifest `mapId`s or whose normalized `MapName_lang` matches a manifest raid name; `ItemSparse` rows only for manifest item ids (empty today). Commit a placeholder `reference/wago.json` with `build: null` so imports never fail (D-14).

6. **Requirement wording vs D-01.** EXPN-01 says "bosses seeded from a manifest keyed on `wowhead_id`"; D-01 makes bosses manifest-only (no rows) and items are the `wowhead_id`-keyed part (empty for Forever). The verifier should accept manifest-resolved bosses as satisfying EXPN-01.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | all | yes | 22.23.0 local; CI test job Node 20, refresh workflow Node 22 | none needed |
| npm | installs | yes | 10.9.8 | none |
| tsx | scripts | yes | in `node_modules/.bin` (^4.22.4) | none |
| Vitest | gates | yes | 4.1.0; baseline run this session: 10 files, 573 tests pass for seeder, phase coverage and `data/__tests__` | none |
| zod | schema | partial | 4.3.5 transitive only, not declared | install 4.6.5 exact |
| csv-parse | snapshot script | no | not installed | install 7.0.2 dev exact |
| gh CLI | workflow testing | yes | 2.95.0 | workflow runs in Actions regardless |
| Supabase service-role env | admin script | not probed | `.env.local` is not readable from this session | owner runs the script locally post-deploy |
| wago.tools | snapshot script (offline) | not probed on purpose | 503 on every probe 2026-10-12 (prior research) | D-14: nothing in this phase waits on it |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** csv-parse and a declared zod (install them); wago (placeholder snapshot).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (`globals: true`, jsdom default; scan and golden tests use `// @vitest-environment node`) |
| Config file | `vitest.config.ts`, `vitest.setup.ts` (no change needed) |
| Quick run command | `npx vitest run data/expansions app/services/__tests__ "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"` |
| Full suite command | `npm run lint && npm run typecheck && npm run test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXPN-01 | Forever seeding inserts exactly Barrow Deeps, Hyjal Summit, Onyxia's Lair, `phase 1`, `is_guild_active true`, `master_sheet_visible true`, `sort_order` 1 to 3, no `loot_items` | unit (updated seeder test with stateful fake) | `npx vitest run app/services/__tests__/expansionSeeder.test.ts` | exists, must be updated |
| EXPN-01 | Manifest raids in size order, every non-verified boss is `provisional`, copy contains no em dash | unit | `npx vitest run data/expansions/__tests__/manifest-gate.test.ts` | Wave 0 |
| EXPN-01 | SetupGuide renders three raids, "Unconfirmed" per provisional boss, one confirmation line per raid with provisional bosses, "Bosses to be announced" for empty raid, only when Forever and `available`; hidden for `none`, `loading`, Classic | component | `npx vitest run "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"` | exists, extend |
| EXPN-02 | Every `SUPPORTED_EXPANSIONS` entry resolves through the registry; `expansionSeeder.ts` contains no `displayName ===` comparison and no classification or role if/else chain; exported surface and order unchanged | unit plus source scan | `npx vitest run app/services/__tests__/expansionSeeder.test.ts app/services/__tests__/expansionSeeder-registry.test.ts` | Wave 0 (scan), existing (surface) |
| EXPN-03 | Five expansions produce byte-identical rows | golden file snapshot | `npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts` | Wave 0 (capture BEFORE refactor) |
| EXPN-04 | Gate passes on real registry; fails on mutated copies: duplicate id, Token item with no class, phase gap, raid not in any phase, name mismatch (storedName vs `EXPANSION_GAMES`, slug, wowhead domain), shipped raid name changed without alias, allowlisted boss present in DungeonEncounter fixture, verified boss without verifier | unit (pure validators on real and mutated inputs) | `npx vitest run data/expansions/__tests__/manifest-gate.test.ts data/expansions/__tests__/forever-reference.test.ts app/services/__tests__/raid-phase-coverage.test.ts` | Wave 0 / extend existing |
| EXPN-05 | Sync twice on a stateful fake: second run inserts nothing and state is deep-equal; alias match prevents duplicate; zero `update` and zero `delete` calls ever; matched tiers produce no write; dry-run performs no insert; read error throws | unit | `npx vitest run app/services/__tests__/expansionCatalogSync.test.ts` | Wave 0 |
| EXPN-05 | Admin script dry-run is the default and prints ids and counts only | unit (extracted pure formatter) | `npx vitest run scripts/__tests__/sync-forever-catalog.test.ts` | Wave 0 |
| EXPN-06 | Snapshot provenance parses (build or null, fetchedAt, sha256, source, tables pinned); placeholder valid; script retries 503 with injected fake `fetch` and `sleep`, exits 0 with outage result after exhaustion, does not rewrite when canonical hash unchanged, fails on missing header | unit | `npx vitest run scripts/expansions/__tests__/snapshot-reference.test.ts data/expansions/__tests__/forever-reference.test.ts` | Wave 0 |
| EXPN-06 | No runtime or test code references wago or Wowhead hosts in fetch-family calls; scan floor and self-checks | source scan | `npx vitest run data/expansions/__tests__/no-live-fetch.test.ts` | Wave 0 |

### Success criteria coverage

1. Forever guild gets three raids and bosses with provisional marking: seeder test (rows) plus SetupGuide test (badge); manual UAT on a staging Forever guild (human-verify at end of phase).
2. Golden rows byte-identical and no chains: `expansionSeeder-golden.test.ts` passes unchanged after the refactor plus the registry source scan.
3. Gate rejects duplicate id, missing token class, phase or raid gap, name mismatch: mutated-copy cases in `manifest-gate.test.ts`.
4. Sync twice changes nothing and never deletes or renames: `expansionCatalogSync.test.ts`; owner dry-run output on the real database as UAT.
5. Snapshots committed with provenance; no live fetch: `forever-reference.test.ts` and `no-live-fetch.test.ts`.

### Sampling Rate

- **Per task commit:** the task's scoped `npx vitest run <paths>` (all under 10 seconds; baseline 573 tests in 1.4 s)
- **Per wave merge:** `npx vitest run data app/services utils/supabase "app/(app)/overview" scripts` plus `npm run typecheck`
- **Phase gate:** `npm run lint && npm run typecheck && npm run test` green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `app/services/__tests__/expansionSeeder-golden.test.ts` plus `__golden__/*.rows.txt` (five files) captured from the UNMODIFIED seeder: covers EXPN-03; richer recording mock with deterministic ids
- [ ] `data/expansions/__tests__/manifest-gate.test.ts`, `forever-reference.test.ts`, `no-live-fetch.test.ts`: EXPN-04, EXPN-06
- [ ] `app/services/__tests__/expansionCatalogSync.test.ts` with a stateful in-memory fake for `raid_tiers` (select, insert, and throwing update or delete): EXPN-05
- [ ] `scripts/expansions/__tests__/snapshot-reference.test.ts`, `scripts/__tests__/sync-forever-catalog.test.ts`: EXPN-05, EXPN-06
- [ ] Update `expansionSeeder.test.ts` (Forever now seeds three tiers) and `raid-phase-coverage.test.ts` (slug via registry)
- [ ] Framework install: none; `npm install --save-exact zod@4.6.5` and `npm install --save-dev --save-exact csv-parse@7.0.2` (human-verify checkpoint first)

## Security Domain

`security_enforcement` is enabled in `.planning/config.json` (`security_asvs_level: 1`, `security_block_on: high`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth surface; no new route |
| V3 Session Management | no | none |
| V4 Access Control | yes | Sync and the admin script use the service-role client server-side or locally only; no route exposes sync; no lazy request-path sync (D-08). Owner-run script reads the key from `.env.local` |
| V5 Input Validation | yes | zod `strictObject` on the manifest; header and value validation on wago CSV rows before writing JSON; third-party strings render through React (escaped), no `dangerouslySetInnerHTML` |
| V6 Cryptography | no | sha256 in provenance is an integrity label, via Node `crypto`; no custom crypto |
| V10 Malicious code and supply chain | yes | New deps pinned exact and gated by a human-verify checkpoint; no `postinstall` in either; snapshot output is committed JSON (never generated TS), reviewed in a PR |
| V13 API and web service | yes (outbound) | The snapshot script fetches only hosts it builds from constants; `User-Agent` set; timeouts; no redirects to unknown hosts followed blindly |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Tampered or poisoned wago snapshot arriving via the bot PR | Tampering | Output is data-only JSON, trimmed to manifest ids and names, shape-validated by the gate, human-reviewed PR; gate also forces manifest promotion in the same PR (D-15) |
| Service-role key misuse by the admin script | Elevation of privilege | Local-only, key from `.env.local`, dry-run default, prints ids and counts only (no guild names), never logs the key |
| Duplicate or mis-matched tier rows from concurrent syncs | Tampering (integrity) | Read-then-insert in one bulk statement; post-run duplicate verification; owner-run single process; unique index deferred to a later migration phase |
| Sync deleting or renaming rows that lists, awards, or BLP reference | Tampering | Insert-only by construction; test fails on any update or delete call |
| Live fetch to wago or Wowhead from tests or runtime | Information disclosure and availability | Source-scan test with floor and self-checks; Standing Constraint 5 |
| Guild or player names leaking via script output or analytics | Information disclosure | Output limited to expansion ids and counts; manifest holds no personal data |
| Prototype-pollution style expansion names reaching the registry | Tampering | Keep the own-property guard (`getExpansionDefinition`, `getExpansionGame`) and the existing tests for `constructor`, `__proto__`, `toString` |

## Sources

### Primary (HIGH confidence)

- In-repo files read this session: `app/services/expansionSeeder.ts`, `app/services/__tests__/expansionSeeder.test.ts`, `app/services/__tests__/raid-phase-coverage.test.ts`, `data/expansion-phases.ts`, `data/raid-catalog-names.ts`, `data/__tests__/classic-wow-raids.test.ts`, `data/token-class-mapping.ts`, `domain/expansion/game.ts`, `domain/expansion/wowhead.ts`, `domain/expansion/index.ts`, `domain/index.ts`, `utils/supabase/paginate.ts`, `utils/supabase/typed-service-role.ts`, `utils/supabase/__tests__/typed-client-usage.test.ts`, `utils/analytics/__tests__/no-names-in-analytics.test.ts`, `app/(app)/overview/components/SetupGuide.tsx` and its test, `DashboardContent.tsx` (targeted ranges), `app/api/reserve-runs/raid-tiers/route.ts`, `app/api/guilds/route.ts`, `change-expansion/route.ts`, `[id]/expansions/route.ts`, `scripts/backfill-team-event-routing.ts`, `scripts/seed-classic-raids.ts`, `.github/workflows/refresh-item-data.yml`, `.github/workflows/ci.yml`, `vitest.config.ts`, `vitest.setup.ts`, `tsconfig.json`, `package.json`, `lib/database.types.ts`, `supabase/migrations/20260101000000_baseline_schema.sql` (constraint and index lines), `next.config.ts` (CSP), `lib/loot/guild-scoped-lookup.ts` (`normalizeCatalogName`)
- Planning inputs: `02-CONTEXT.md`, `REQUIREMENTS.md`, `STATE.md`, `.planning/research/STACK.md`, `ARCHITECTURE.md` (lines 70-100, 355-395), `PITFALLS.md` (5, 6, 7), `SUMMARY.md` (Phase 2 section), `.planning/todos/pending/2026-09-13-build-world-of-warcraft-forever-support-with-a-repeatable-ex.md`
- npm registry via `npm view` and the GSD `package-legitimacy check` seam (zod, csv-parse)
- Local measurements this session (tsx scripts against the real catalogs): item counts per expansion, duplicate-id and token-class exceptions; zod 4.3.5 runtime check (`strictObject`, `superRefine`, `z.iso.date`, `z.literal([...])`, `z.int`, `z.prettifyError`); baseline Vitest run (573 tests pass)

### Secondary (MEDIUM confidence)

- https://vitest.dev/guide/snapshot (`toMatchFileSnapshot`, CI does not write snapshots, `-u`), fetched via WebFetch
- https://zod.dev/api (object strictness, literal arrays, `iso.date`, `superRefine`, `infer`), fetched via WebFetch
- https://github.com/wowdev/WoWDBDefs `DungeonEncounter.dbd` and `Map.dbd` column lists, fetched via WebFetch (column names only; wago CSV headers still unconfirmed)

### Tertiary (LOW confidence)

- wago.tools endpoint shape, build-list shape and `_N` header flattening: cited from `STACK.md` and the 2026-09-25 todo notes (prior probes). A web search for wago.tools API documentation returned nothing relevant (unrelated vendors). wago.tools was intentionally not contacted this session. Marked as Open Question 3 and Assumption A7.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH for repo facts and npm versions; MEDIUM for pin choices (the 30-day age reasoning for 4.6.5 is inferred from publish dates, not a stated repo policy)
- Architecture: HIGH (registry, adapters, sync and gate designs follow decisions D-01 to D-15 and measured data)
- Pitfalls: HIGH for items measured in the repo (slug null, zero-tier test, legacy duplicates, no unique index); MEDIUM for GitHub Actions behaviour; LOW for wago specifics

**Research date:** 2026-10-13
**Valid until:** 2026-10-21 for Forever boss data (owner input due); 30 days for the structural findings
