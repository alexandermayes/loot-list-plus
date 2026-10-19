# Phase 2: Expansion Onboarding Manifest - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Every expansion, the five legacy ones and Forever, seeds through one `data/expansions/` registry keyed by `wowhead_id`. Forever gets its three raids (Barrow Deeps, Hyjal Summit, Onyxia's Lair) and their bosses from a native manifest with provisional markers; the five legacy expansions are wrapped by adapters and must produce byte-identical rows (golden-row snapshot). A zod manifest schema, a Vitest manifest gate, an idempotent Forever-only `syncExpansionCatalog`, an admin script that runs it over existing Forever guilds, committed wago.tools snapshots with provenance, and a test that no runtime or test code fetches wago or Wowhead live. The display-name if/else chains at `app/services/expansionSeeder.ts:449-462` and `:470-481` and the hand-written registry at `:224-237` are replaced.

Not in this phase: Discovery need rows, `list_mode`, the need picker, the Drop Desk, any schema migration, legacy expansion id conversion (PLAT-06), per-guild boss editing.

Requirements: EXPN-01 to EXPN-06. Window: 2026-10-13 to 2026-10-21. Owner input due Oct 21: Forever boss names for Barrow Deeps and Hyjal (Decision 26).

</domain>

<decisions>
## Implementation Decisions

### Where Forever bosses live
- **D-01:** Forever bosses are manifest-only in this phase. There is no bosses table today (bosses exist only as `loot_items.boss_name`, and Forever has no items), and no migration is added. The app resolves a Forever tier's bosses by looking up the manifest raid for that tier's name. — **Reversibility:** reversible — a per-guild boss table can be added later as an expand-only migration without touching this phase's data; nothing downstream in Phase 3 or 4 needs boss rows (need rows are per tier).
- **D-02:** The raid and boss list, with the provisional marker, is shown in the setup guide only (`app/(app)/overview/components/SetupGuide.tsx`). Its existing Forever "waiting" rows (driven by `RaidTierStatus`) become the three raids with their bosses once tiers exist. No other surface changes in this phase. **Amended 2026-10-14 (owner decision on the plan check):** the raid and boss list renders as its own "Your raids" section after the steps list inside the non-celebration setup guide card, and the existing Forever waiting rows stay exactly as they are (they show only while the guild has no tiers; the list shows only once tiers exist). Copy and placement still get the owner's sign-off on the 02-11 PR.
- **D-03:** A provisional boss renders an "Unconfirmed" badge after its name, and each raid with any provisional boss carries one line underneath: "Boss names are confirmed when the raid opens." A raid whose manifest boss list is empty shows one muted line: "Bosses to be announced". This copy is proposed and needs the owner's sign-off before it ships; no em dashes.

### Forever raid names and tier defaults
- **D-04:** Forever raids use plain names in `raid_tiers.name`: "Barrow Deeps", "Hyjal Summit", "Onyxia's Lair". No "(Forever)" suffix. A guild is one game version, so no guild holds both a Classic and a Forever "Onyxia's Lair"; name-keyed helpers (`utils/bossOrder.ts`, `utils/raidIcons.ts`, `utils/bossImages.ts`, `data/raid-catalog-names.ts`) resolve by expansion plus name where a collision matters, and lookups that are already guild-scoped need no change. — **Reversibility:** costly — once Forever guilds hold tiers under these names, switching to a suffix means renaming rows in every Forever guild and adding aliases for the addon session match. **Amended 2026-10-14 (owner decision on the plan check):** all raid-icon call sites resolve by game. `utils/raidIcons.ts` takes the game and a Forever tier gets a neutral icon, never the Classic Onyxia or TBC Archimonde art (plan 02-12: its own PR, mergeable on code review without copy sign-off, merged no later than PR 3 / plan 02-03). Plan 02-13 wires the six remaining call sites (reserve run list, reserve run detail, create-run modal, public join page, its OG image, master sheet tier header), deriving the game from data each surface already has: the guild's expansion for in-app reserve surfaces, and the run's expansion from the API payload for the public join page and OG image, adding the field to the payload where it is missing. The call-site allowlist ends empty. `utils/bossImages.ts` is the only deferral (Phase 5 loot rows, see `<deferred>`).
- **D-05:** `data/expansion-phases.ts` gets a `forever` entry with one phase holding all three raids, so Forever tiers seed with `phase = 1`, `is_guild_active = true` and `master_sheet_visible = true`, exactly like Classic Phase 1. No officer toggle is needed before raiders can rank Discovery needs in Phase 3 and 4. `app/services/__tests__/raid-phase-coverage.test.ts` must cover the Forever entry.
- **D-06:** The manifest carries `opens_on: 2026-12-09` per raid as data only. It is shown in the setup guide ("Raids open Dec 9" or similar, owner sign-off) and never drives tier state or any code path in this phase. Dates live in data, never in code.
- **D-07:** Raid order is by raid size: Barrow Deeps (10), Hyjal Summit (20), Onyxia's Lair (40). This sets `sort_order` and the setup guide order.

### Reaching existing Forever guilds
- **D-08:** Forever guilds created before this phase (expansion row, zero tiers) are reached by an admin script under `scripts/` on the service-role client that iterates every Forever expansion row and calls `syncExpansionCatalog`. It has a dry-run mode that prints the rows it would insert, and the owner runs it once after the code deploy. No lazy sync on any request path, no cron.
- **D-09:** `raid_tiers` has no stable key column and none is added. Once a Forever raid name has shipped, it is frozen in a committed fixture and the manifest gate fails if it changes. A rename is done by adding the new name with `previousNames: [old]`, and sync matches an existing tier on any alias before inserting, so a rename never creates a duplicate tier. — **Reversibility:** reversible — a `manifest_key` column can be added later (PLAT-06 territory) and backfilled from the alias list.
- **D-10:** When a future Forever tier is added to the manifest, the owner re-runs the same admin script. Sync is idempotent, so the re-run is safe; running it twice changes nothing the second time (EXPN-05).
- **D-11:** For new guilds, `seedExpansionForGuild` creates the expansion row and then calls `syncExpansionCatalog` for Forever only. The five legacy expansions keep today's insert loop, frozen under the golden-row snapshot test. Sync never runs over a legacy expansion (research Pitfall 6; legacy catalogs have diverged per guild).

### Snapshots and provisional sources
- **D-12:** Until the owner's Oct 21 input, Barrow Deeps and Hyjal ship with the guide-sourced boss names from the 2026-09-13 todo list, every one marked provisional, with the source noted per entry in the manifest. Onyxia's Lair's boss is provisional too unless a pinned DungeonEncounter fixture confirms her. The Oct 21 input promotes or corrects names by manifest edit.
- **D-13:** The wago.tools refresh workflow runs weekly on a cron plus manual dispatch. It re-pulls the pinned tables for the `1.60.` build prefix with retry and backoff, trims to the ids the manifest references, and opens a PR only if the committed snapshot changed. A 503 after retries exits green with a notice; a wago outage never turns CI red and never blocks a merge. **Amended 2026-10-14 (owner reading on the plan check):** the outage set is 403, 429, 500, 502, 503 and 504, network errors and timeouts once retries are exhausted: notice, exit 0. A 404, a missing CSV header, no `1.60.` build or a snapshot that fails the schema exits 1. The script sends only its identifying User-Agent on every attempt and never retries under a different or browser-style identity, so a persistent 403 is an outage with no identity swap.
- **D-14:** If no wago snapshot has been committed yet (wago was 503 on every 2026-10-12 probe), the Forever reference test passes with every boss provisional and the allowlist holding all of them. Nothing in this phase waits on wago. The first successful pull commits the snapshot and starts shrinking the allowlist.
- **D-15:** The provisional allowlist can only shrink. If an allowlisted boss appears in the pinned DungeonEncounter fixture, the gate fails until the manifest entry is promoted (a one-line edit in the same PR as the snapshot). **Amended 2026-10-14 (owner decision on the plan check):** one explicit exception: the Oct 21 owner input (D-12) may add provisional bosses (Hyjal Summit has none today), and that growth is allowed only through a reviewed `PROVISIONAL_CEILING` edit in the same PR as the manifest edit.

### Requirement wording
- **D-16:** EXPN-01's `wowhead_id` key applies to items (Forever has none yet); bosses are manifest entries keyed by name/slug under D-01 until an encounter id is confirmed. EXPN-01 is satisfied by manifest-resolved bosses (tier name to manifest raid to bosses). Recorded 2026-10-14 from the plan check. — **Reversibility:** reversible — an `encounterId` key can be populated per boss later from the DungeonEncounter snapshot.

### Claude's Discretion
- Exact zod schema shape for the manifest (research sketch in `.planning/research/STACK.md` lines 126 to 136 is the starting point), including how `previousNames`, `opens_on`, `verification` and per-entry `source` are modelled.
- Snapshot provenance fields (build, fetchedAt, sha256, source URL, tables pinned) and which wago tables are trimmed and committed (research suggests ItemSparse, DungeonEncounter, Map at minimum).
- Golden-row snapshot format and which columns it pins (research: name, item_slot, wowhead_id, boss_name, classification, allocation_cost, roles, token classes, in insert order).
- How the no-live-fetch test is implemented (source scan for wago.tools and wowhead.com hosts in runtime and test code, modelled on the Phase 1 analytics scan guard).
- Retry and backoff parameters for the snapshot script; admin script name, flags and output format.
- How the setup guide reads the manifest client-side (the registry must stay client-safe; heavy catalogues server-only per `domain/expansion/game.ts` header comment).
- Whether `data/raid-catalog-names.ts` needs a Forever entry for addon session matching (its existing "Hyjal Summit" row is the TBC instance name; lookups are guild-scoped already).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/workstreams/forever/ROADMAP.md` (Phase 2 section, Hard Constraints 1 to 7) — goal, success criteria, corrected seeder line numbers, owner input due Oct 21
- `.planning/workstreams/forever/REQUIREMENTS.md` (EXPN-01 to EXPN-06) — the six requirements this phase closes
- `.planning/workstreams/forever/MILESTONE-BRIEF.md` (SEED-001 item, "Hard facts about WoW Forever") — why `wowhead_id` is the key (GH-269), wago product and build facts
- `.planning/workstreams/forever/STATE.md` — Phase 1 decisions carried forward (Forever links match the stored name 'Forever' exactly; typed service-role client; analytics scan guard pattern)

### Research (designs and defaults applied)
- `.planning/research/SUMMARY.md` ("Phase 2: Expansion manifest, SEED-001"; Decision 26; "Live probes 2026-10-12") — deliverables list, provisional default, wago 503 evidence
- `.planning/research/ARCHITECTURE.md` (lines 70 to 100 project structure; 355 to 395 manifest types, seeder change, migration order, per-expansion gate; 193 existing Forever guilds row) — `data/expansions/` layout, `syncExpansionCatalog` semantics, golden-row-first ordering, "do not sync legacy"
- `.planning/research/STACK.md` (lines 9 to 30 dependencies; 126 to 136 manifest schema sketch and snapshot script; 209 csv-parse usage) — zod 4.6.5 pinned exact, csv-parse ^7.0.3 dev-only, wago endpoints
- `.planning/research/PITFALLS.md` (Pitfalls 5, 6, 7) — name-keyed joins, volatile Forever data, offline ingest with provenance, dates in data not code

### Existing gate and workflow models
- `data/__tests__/classic-wow-raids.test.ts` — the per-expansion verification gate the manifest gate is modelled on (independent transcription, not a restatement of the data)
- `app/services/__tests__/raid-phase-coverage.test.ts` — phase coverage test the gate subsumes or extends; must cover the new `forever` entry
- `.github/workflows/refresh-item-data.yml` — the PR-opening workflow pattern the weekly snapshot refresh copies (paths trigger, concurrency group, gh pr create)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `domain/expansion/game.ts`: `EXPANSION_GAMES`, `FOREVER_EXPANSION_NAME = 'Forever'`, `getExpansionGame`, `RaidTierStatus`. Imports nothing and is client-safe; the registry's `storedName` and `game` must agree with it (gate check).
- `app/services/expansionSeeder.ts`: `ExpansionDefinition` / `RaidDefinition` / `BossDefinition` types, `getExpansionDefinition` with its prototype-pollution guard, `SUPPORTED_EXPANSIONS`, `isSupportedExpansion`, `seedExpansionForGuild` (lines 340 to 571). Registry at 224 to 237; classification chain at 449 to 462; role chain at 470 to 481; token class seeding at 509 to 557.
- `app/services/__tests__/expansionSeeder.test.ts`: recording Supabase mock (`from(table)` chainable builder that records insert args). Reuse it to build the golden-row snapshot from the pure "rows the seeder would insert" path.
- `data/expansion-phases.ts`: `EXPANSION_PHASES` keyed by slug, `getExpansionSlug`; raid names must match the catalog exactly (GH-279).
- `app/(app)/overview/components/SetupGuide.tsx` lines 56 to 70 and 211 to 228: `isForeverGuild`, `foreverRaidsLoading`, `foreverAwaitingRaids`, waiting-row rendering. This is where the raids-and-bosses list with the Unconfirmed badge lands.
- `utils/supabase/paginate.ts` `selectAllPagesOrThrow` and `createTypedServiceRoleClient` (Phase 1): the admin script reads Forever expansion rows through these.
- `scripts/backfill-team-event-routing.ts` and `scripts/seed-classic-raids.ts`: existing service-role script shapes to model the admin sync script on (check for a dry-run flag precedent).
- `data/raid-catalog-names.ts`: `RAID_INSTANCE_NAMES` and `CATALOG_GROUP_LABELS` for addon session matching, guild-scoped.

### Established Patterns
- Data files under `data/` are copied into each guild's own `raid_tiers` and `loot_items`; a data change for existing guilds needs a reviewed backfill (`supabase/migrations/20260926233000_add_classic_missing_loot.sql` is the model). Forever is the exception: sync, not SQL backfill.
- Source-scan tests with a site floor and self-checks (Phase 1 analytics guard, `typed-client-usage.test.ts`) are the house pattern for "no code does X"; the no-live-fetch test follows it.
- Independent-transcription gate tests (`classic-wow-raids.test.ts`) transcribe authoritative data separately from the source file.
- Expansion lookups guard against prototype-pollution names (`getExpansionDefinition`, `getExpansionGame`); the registry keeps that guard.
- No em dashes in user-facing copy; owner sign-off on copy in its own PR (Phase 1 plan 01-09 precedent).

### Integration Points
- `seedExpansionForGuild` is called from guild creation and the add-expansion route; Forever branches to `syncExpansionCatalog` after the expansion row is created, legacy path unchanged.
- `getRaidPhase` in the seeder reads `EXPANSION_PHASES` by slug; the new `forever` entry feeds it.
- `SetupGuide.tsx` receives `raidTierStatus` from `DashboardContent.tsx`; it needs the Forever manifest (client-safe registry) to render bosses per tier name.
- `.github/workflows/refresh-item-data.yml` `paths` extends to the manifest location so icon and unique maps refresh when manifest items change (future-proofing; Forever has no items yet).
- Phase 3 seeds need rows per Forever raid tier, so the tier rows this phase creates (names, phase, active) are the rows Phase 3 keys on.

</code_context>

<specifics>
## Specific Ideas

- Setup guide copy to propose for sign-off: badge "Unconfirmed"; raid line "Boss names are confirmed when the raid opens."; empty raid line "Bosses to be announced"; opens-on line along the lines of "Raids open Dec 9".
- The manifest notes the source of every provisional boss name (the 2026-09-13 todo's guide list) so promotion on Oct 21 is a one-line edit with a visible before and after.
- The admin script's dry run should print exactly what sync would insert per guild (tier names and counts), so the owner can eyeball it before the real run.
- Frozen-name fixture plus `previousNames` aliases is the rename mechanism; the gate must fail on a shipped name change that has no alias.

</specifics>

<deferred>
## Deferred Ideas

- Per-guild boss table so an officer can rename a provisional boss in their guild (research Pitfall 7 suggestion). Revisit when the Drop Desk (Phase 5) needs a boss picker; would be an expand-only migration with an RLS matrix.
- Lazy sync on officer visit as a safety net, and a nightly cron sync. Rejected for v1; the admin script is the only path.
- `manifest_key` column on `raid_tiers` for stable matching. Belongs with PLAT-06 (legacy id conversion, after Nov 30).
- Listing bosses on the loot management raid tier screen and the master sheet `BossSection` for Forever. Setup guide only for now.
- An `opens_on`-driven tier activation. Dates stay data-only; tier state is Phase 1 active and visible.
- Forever boss art in `utils/bossImages.ts` (name-keyed, so 'Onyxia' resolves to Classic art). Tied to Phase 5 loot rows: boss images render beside loot rows and Forever has none until then; resolve by expansion plus name (D-04) when Phase 5 adds Forever loot. Recorded 2026-10-14 (owner decision on the plan check).

</deferred>

---

*Phase: 02-expansion-onboarding-manifest*
*Context gathered: 2026-10-13*
*Amended: 2026-10-14 (D-16 added; D-02, D-04, D-13 and D-15 qualified by owner decisions on the plan check)*
