---
phase: 02-expansion-onboarding-manifest
verified: 2026-10-19T10:40:00Z
status: passed
score: 4/5 roadmap success criteria verified outright, 1 conditional (SC5 snapshot half, routed to human verification)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  is_re_verification: false
gaps: []
deferred: []
human_verification:

  - test: "After the branch is on main, run the Refresh wago snapshot workflow once via workflow_dispatch (Actions tab)"
    expected: "Run is green. Either (a) it commits a real snapshot to data/expansions/forever/reference/wago.json (build, fetchedAt and sha256 non-null, non-empty DungeonEncounter/Map/ItemSparse tables) and opens one PR, or (b) wago is in outage and the run exits green with a notice. If a PR opens, run npm test locally before merging (the bot PR does not trigger CI). Any boss wago now lists must be promoted in the same PR (D-15)."
    why_human: "The committed wago.json is the D-14 placeholder (build, fetchedAt, sha256 null, empty tables). Scheduled and dispatched workflows only run from the default branch, and live wago fetches are forbidden in this verification. Also confirms the research assumptions about the wago endpoint, build list shape and CSV headers (A4, A7)."

  - test: "Owner signs off the setup guide 'Your raids' copy and placement (plan 02-11), before that PR merges"
    expected: "Owner approves or edits: heading 'Your raids', badge 'Unconfirmed', note 'Boss names are confirmed when the raid opens.', empty-raid line 'Bosses to be announced', 'Raids open Dec 9' / 'Opens <date>' lines, '<n>-player' size label, and the placement after the steps list. Only the string constants at the top of SetupGuide.tsx and their test assertions change if wording changes."
    why_human: "Copy sign-off is an owner decision (project constraint: user sign-off on user-facing copy); it gates the PR merge, not the code."

  - test: "After the code deploys, the owner runs 'npm run sync:forever' (dry run) then 'npm run sync:forever -- --apply' against the real database"
    expected: "Dry run lists, per existing Forever expansion row, the missing tiers (Barrow Deeps, Hyjal Summit, Onyxia's Lair) and writes nothing. --apply inserts only the missing tiers; a second --apply run inserts nothing. The final duplicate-name report lists any pre-existing duplicate tier names without touching them."
    why_human: "Needs the service-role key and live Supabase. Unit tests use a recording fake client; no automated check has touched real rows."

  - test: "Create a new Forever guild and open the overview setup guide; also open a Classic guild's setup guide"
    expected: "Forever guild gets three raid tiers (Barrow Deeps, Hyjal Summit, Onyxia's Lair, in that order, all active and visible, phase 1). The 'Your raids' section lists 8 Barrow Deeps bosses each with an Unconfirmed badge, Hyjal Summit with 'Bosses to be announced', and Onyxia with an Unconfirmed badge; raid tiers show the neutral icon, never Classic or TBC raid art. The Classic guild shows no raid list and its tier icons are unchanged."
    why_human: "Visual appearance and a real guild-creation flow on live Supabase. Component and seeder behavior are covered by tests with mocks."

  - test: "Owner supplies Forever boss names for Barrow Deeps and Hyjal Summit (due 2026-10-21, Decision 26)"
    expected: "Names land as one-line manifest edits. Any growth of the provisional set (Hyjal has none today) goes through a reviewed PROVISIONAL_CEILING edit in the same PR (D-15). Also answer the open question in the manifest header: is 'Well of Sorrow' a boss or a place?"
    why_human: "Owner input, not code. Until then every boss ships provisional, which is the specified behavior."
---

# Phase 2: Expansion Onboarding Manifest Verification Report

**Phase Goal:** A new Forever guild gets its raids and bosses from a verified manifest keyed by `wowhead_id`, and every expansion, old and new, seeds through one registry
**Verified:** 2026-10-19
**Status:** human_needed (no gaps; 5 human items, none a code defect)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria, the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An officer creating a Forever guild gets Barrow Deeps, Hyjal Summit and Onyxia's Lair with their bosses, and unconfirmed bosses are visibly marked provisional | VERIFIED (data and rendering by test; live flow is human item 4) | `data/expansions/forever/manifest.ts`: three raids in size order (10/20/40), 8 Barrow Deeps bosses, Hyjal empty, Onyxia 1 boss, every boss `verification: 'provisional'` with a `source`. `seedExpansionForGuild` (called from `app/api/guilds/route.ts`, `change-expansion/route.ts`, `[id]/expansions/route.ts`) hands `seedMode: 'sync'` to `syncExpansionCatalog`, which inserts tiers with phase 1, active and master-sheet-visible. `SetupGuide.tsx` `ForeverRaidList` renders each manifest raid and boss with an `Unconfirmed` badge, the provisional note, and 'Bosses to be announced' for an empty raid; wired from `DashboardContent.tsx:2003` (`raidTierNames`) and rendered after the steps list at `SetupGuide.tsx:538`. Per D-02 the list shows in the setup guide only. Raid icons resolve by game (neutral icon for Forever) at every one of the 15 call sites; the gameless allowlist is `[]`. |
| 2 | The five existing expansions produce byte-identical rows (golden snapshot passes unchanged) and the seeder resolves every expansion through one registry with no display-name if/else chains | VERIFIED | Golden files (6,977 lines across classic, tbc, wrath, cata, mop) were committed in `a10edf33` and `4e6cbd6b` before any seeder edit and have no later commit; the golden suite passes. Mutation check: changing the classification default in `data/expansions/catalogs.ts` made 5 of 6 golden tests fail (reverted, `git status` clean), so the snapshot is sensitive. `app/services/expansionSeeder.ts` builds definitions from `EXPANSION_REGISTRY` (`data/expansions/registry.ts`, keys in the old order, prototype-pollution guard kept); `grep` for `displayName ===` or per-name comparisons in the seeder returns nothing; classification and role maps come from the `LegacyCatalog` adapter in `data/expansions/catalogs.ts` (`kind: 'legacy'`, with a discriminated union so a non-legacy catalog cannot reach the insert loop). |
| 3 | A manifest with a duplicate id, a missing token class, a phase or raid gap, or a name mismatch fails the Vitest gate before merge | VERIFIED | `data/expansions/validate.ts` has one rule per class (`duplicate-id`, `missing-token-class`, `phase-coverage`, `name-mismatch`, plus `duplicate-raid-name`, `duplicate-boss-key`, `size-order`, `shipped-name-changed`, orphan/unknown token class) and `validateExpansion` runs all of them for every registry row with data. `manifest-gate.test.ts` (779 lines) has a mutated-copy test per rule and ratchets the 33 legacy token-class exceptions (14 Wrath, 19 Cata) against a fixture. Own mutation check: changing Hyjal Summit's size from 20 to 10 made the gate fail with `size-order` (3 tests failed, reverted). Frozen shipped names are in `forever/__fixtures__/shipped-names.json` and compared to an independent transcription. |
| 4 | Running the Forever catalog sync twice changes nothing the second time, and sync never deletes or renames a row that a list, award or BLP record points at | VERIFIED | `app/services/expansionCatalogSync.ts` is insert-only: a read of `raid_tiers`, a pure `planCatalogSync`, and one bulk `insert` of only the missing manifest raids. Existing tiers are matched on normalized name or `previousNames` alias and get no write. `expansionCatalogSync.test.ts` covers the `[EXPN-05 idempotent]` second run, alias match with no rename, curly-apostrophe/case variants, leaves duplicates and unmatched tiers alone, dry run does zero inserts, and a source scan that the file has no update/delete/upsert call. No migration was added in the phase (checked the file list of every `(02-` commit: zero under `supabase/migrations`). Residual: idempotency is read-then-insert with no unique index, so two simultaneous syncs could both insert; documented in the file header, mitigated by the owner-run script's duplicate-name report (see Warnings). |
| 5 | wago.tools snapshots are committed with their provenance, and a test fails if any runtime or test code fetches wago.tools or Wowhead live | PARTIAL: no-live-fetch half VERIFIED, snapshot half is the documented D-14 placeholder, routed to human item 1 | No-live-fetch: `data/expansions/__tests__/no-live-fetch.test.ts` (3 rules, comments stripped, site floor, self-checks) passes; own mutation check: a temporary `fetch('https://www.wowhead.com/...')` in `utils/` made it fail with "rule 1: fetch call names the wago or Wowhead host" (file removed, clean). Only `scripts/lib/wago-snapshot.ts` holds the wago host in code. Snapshot: `wago.json` is committed with the provenance fields (`source`, `product`, `buildPrefix`) but `build`, `fetchedAt`, `sha256` are null and the three tables are empty. This is exactly D-14 and the verifier note in plans 02-07 and 02-09, so it is a human item, not a gap. The pipeline that fills it exists: `scripts/lib/wago-snapshot.ts` (single identifying User-Agent on every attempt, retry set 403/429/500/502/503/504 with backoff, outage exits green), `scripts/expansions/snapshot-reference.ts`, and `.github/workflows/refresh-wago-snapshot.yml` (weekly cron plus `workflow_dispatch`, no push or pull_request trigger, fixed PR branch, opens a PR only if the snapshot changed). |

**Score:** 4 of 5 verified outright; SC5 is conditionally met by design (placeholder plus working pipeline), with the first real run as the human check.

### Supporting truths and CONTEXT decisions checked

| Decision / claim | Status | Evidence |
|------------------|--------|----------|
| D-01 bosses manifest-only, no migration | HONORED | No bosses table; no file under `supabase/migrations` in any phase commit. |
| D-02/D-03 setup guide only, badge and copy | HONORED (copy awaits sign-off) | `SetupGuide.tsx` lines 36-41 constants; no em dash in `SetupGuide.tsx` or the manifest. |
| D-04 plain raid names, raid icons by game | HONORED | Manifest names plain; `getRaidIcon(name, game)` returns `FOREVER_RAID_ICON` for `forever`; 15 call sites checked by grep all pass a game; `utils/bossImages.ts` deferral recorded. |
| D-05 `forever` phase entry | HONORED | `data/expansion-phases.ts` changed; `raid-phase-coverage.test.ts` resolves slugs through the registry and covers Forever. |
| D-06 dates in data only | HONORED | Date-in-source scan in the gate (floor-checked) plus a source scan in `expansionCatalogSync.test.ts` that `opens_on` is never read there. |
| D-08/D-10 admin script, dry run default | HONORED | `scripts/sync-forever-catalog.ts` is dry-run unless `--apply`, unknown flags exit 1; `npm run sync:forever` registered in `package.json`; 27 tests in `forever-sync.test.ts` pass. |
| D-09 aliases and frozen names | HONORED | `findManifestRaid` matches `previousNames`; shipped-names fixture and `shipped-name-changed` rule. |
| D-11 sync never runs over a legacy expansion | HONORED | `syncExpansionCatalog` throws for any name other than the manifest's stored name before touching the client. |
| D-13 outage set, no identity swap | HONORED | `RETRYABLE_STATUSES` is {403,429,500,502,503,504}; one `USER_AGENT` constant sent on every request. |
| D-14/D-15 placeholder and allowlist ratchet | HONORED | Allowlist of 9 entries equals the provisional boss set; `PROVISIONAL_CEILING = 9`; `forever-reference.test.ts` passes with the placeholder. |
| D-16 bosses keyed by slug, items by wowhead_id | HONORED (note) | The roadmap goal says "keyed by `wowhead_id`". Under the amended D-16, `items` and `tokenClasses` are keyed by wowhead_id string (`WowheadIdSchema`) and bosses by slug until an encounter id is confirmed; Forever has no items yet and `items` is `z.never()` so an early item fails the gate. This matches the recorded owner decision, so it is not a gap. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `domain/expansion/manifest-schema.ts` | strict zod schema | VERIFIED | `z.strictObject` throughout, kept out of the domain barrel; zod pinned exact `4.6.5`. |
| `data/expansions/forever/manifest.ts` | native manifest | VERIFIED | 3 raids, provisional bosses with sources. |
| `data/expansions/registry.ts`, `types.ts`, `catalogs.ts` | one client-safe registry plus server-only adapters | VERIFIED | Registry imports only game module and types; catalogs server-only; seeder consumes both. |
| `app/services/expansionCatalogSync.ts` | insert-only idempotent sync | VERIFIED | See SC4. |
| `data/expansions/validate.ts` and `__tests__/manifest-gate.test.ts` | gate | VERIFIED | See SC3. |
| `app/services/__tests__/__golden__/*.rows.txt` (5) | frozen legacy rows | VERIFIED | Untouched since 02-01. |
| `scripts/sync-forever-catalog.ts`, `scripts/lib/forever-sync.ts` | owner admin script | VERIFIED | Dry run by default, typed service-role client, duplicate report. |
| `scripts/lib/wago-snapshot.ts`, `scripts/expansions/snapshot-reference.ts` | offline snapshot library and CLI | VERIFIED | 61 library tests pass; csv-parse pinned exact `7.0.2` as a dev dependency. |
| `.github/workflows/refresh-wago-snapshot.yml`, `refresh-item-data.yml` | weekly refresh; item-data watches `data/expansions/**` | VERIFIED (not yet run, human item 1) | Read in full; no inbound trigger beyond cron and dispatch; step output goes through an env var, not script text. |
| `data/expansions/forever/reference/wago.json` | committed snapshot with provenance | PLACEHOLDER (by D-14) | Provenance template only; real rows pending first run. |
| `data/expansions/__tests__/no-live-fetch.test.ts` | scan guard | VERIFIED | Mutation-checked. |
| `SetupGuide.tsx` `ForeverRaidList`, `utils/raidIcons.ts` | UI and icons | VERIFIED | Wired and rendering manifest data (Level 4: data comes from `FOREVER_MANIFEST` through `foreverRaidsForTierNames`, filtered by the guild's real tier names). |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `expansionSeeder.ts` | registry and catalogs | `EXPANSION_REGISTRY`, `getExpansionCatalog` | WIRED |
| `expansionSeeder.ts` | `expansionCatalogSync.ts` | `seedMode === 'sync'` branch after expansion row creation | WIRED |
| `app/api/guilds/route.ts` (+2 routes) | `seedExpansionForGuild` | direct call | WIRED |
| `expansionCatalogSync.ts` | manifest and `EXPANSION_PHASES.forever` | `findManifestRaid`, `getRaidPhase` (throws on a null phase, GH-279 class) | WIRED |
| `DashboardContent.tsx` | `SetupGuide.tsx` | `raidTierNames={raidTiers.map(t => t.name)}` | WIRED |
| `SetupGuide.tsx` | manifest | `foreverRaidsForTierNames` from `data/expansions/forever/lookup.ts` (client-safe) | WIRED |
| `validate.ts` | registry, manifest, phases, legacy adapters | `validateExpansion` | WIRED |
| `refresh-wago-snapshot.yml` | `snapshot-reference.ts` | `npx tsx scripts/expansions/snapshot-reference.ts` | WIRED |
| `package.json` `sync:forever` | `scripts/sync-forever-catalog.ts` | tsx | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase test surface | `CI=true npx vitest run data/expansions domain/expansion app/services/__tests__ scripts utils/__tests__/raidIcons.test.ts "app/(app)/overview/components/__tests__/SetupGuide.test.tsx" app/api/reserve-runs` | 46 files, 915 tests passed | PASS |
| Gate fails on a bad manifest | edit Hyjal size 20 to 10, run `manifest-gate.test.ts`, `git checkout` the file | `size-order` error, 3 tests failed | PASS (rule fires) |
| Golden suite is sensitive | change legacy classification default, run golden suite, `git checkout` | 5 of 6 tests failed | PASS (rule fires) |
| No-live-fetch scan fires | add a temp file with a Wowhead `fetch`, run scan, delete | rule 1 violation reported | PASS (rule fires) |
| Working tree after checks | `git status --short` excluding untracked | no tracked changes; golden files unmodified | PASS |

No live wago.tools or Wowhead request was made. No server was started.

### Probe Execution

SKIPPED: no `scripts/*/tests/probe-*.sh` files exist and no plan declares one.

### Requirements Coverage

All six IDs appear in plan frontmatter, REQUIREMENTS.md and the ROADMAP phase block; no orphaned requirement.

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| EXPN-01 | 02-02, 02-03, 02-07, 02-11, 02-12, 02-13 | Forever guild gets the three raids with manifest bosses, unverified marked provisional | SATISFIED (live flow and copy sign-off are human items 2 and 4) | SC1 evidence; manifest, sync, lookup, SetupGuide, raid icons. |
| EXPN-02 | 02-04, 02-05 | Seeder resolves every expansion through one registry; no displayName chains | SATISFIED | SC2 evidence; `expansionSeeder-registry.test.ts` pins surface, ordering and client-safety. |
| EXPN-03 | 02-01, 02-04 | Five legacy expansions seed byte-identical rows through adapters | SATISFIED | Golden files unchanged; suite passes; mutation-sensitive. |
| EXPN-04 | 02-02, 02-06 | Vitest manifest gate rejects duplicate ids, missing token classes, phase/raid gaps, name mismatches | SATISFIED | SC3 evidence. |
| EXPN-05 | 02-03, 02-10 | Forever catalog sync idempotent, never deletes or renames a referenced row | SATISFIED (live run is human item 3) | SC4 evidence. |
| EXPN-06 | 02-02, 02-07, 02-08, 02-09 | wago snapshots committed with provenance; no live wago or Wowhead fetch | SATISFIED for the guard and pipeline; snapshot content conditional | SC5 evidence; first real run is human item 1. REQUIREMENTS.md already marks it Complete, which holds for the code deliverable; the data arrives with the first run. |

### Anti-Patterns Found

None blocking. `TBD`, `FIXME`, `XXX` scan over every file touched by the phase's `(02-` commits: zero hits. No migration touched. No em dash in `SetupGuide.tsx` or the manifest. Hardcoded-empty hits (`bosses: []` for Hyjal, `items: {}`, empty `wago.json` tables) are deliberate data states per D-03, D-14 and the schema's `z.never()`, not stubs: nothing renders them as if they were data, and the UI shows the specified 'Bosses to be announced' line.

### Warnings (non-blocking)

1. Sync idempotency is read-then-insert with no unique index on `(expansion_id, name)` (a migration is out of scope for this phase). Two concurrent syncs for one expansion could create duplicate tiers. Mitigated: new-guild path runs once inside guild creation, the admin script is single-process and ends with a duplicate-name report. A future `manifest_key` or unique index belongs with PLAT-06.
2. The reserve-run raid-tiers route still returns 400 for Forever (`getExpansionSlug('Forever')` is null by design and pinned by a test in 02-05). Forever reserve runs are out of this phase's scope; note it for whichever phase enables them.
3. A second name-to-slug map (`EXPANSION_NAME_TO_SLUG` in `data/expansion-phases.ts`) still exists beside the registry. It is not a display-name chain in the seeder and is pinned by tests, so it does not violate SC2, but it is a second source of truth the registry could absorb later.

### Prior-phase regression

Phase 1 (`01-VERIFICATION.md`, status passed, 5/5): its shared module `domain/expansion/wowhead.ts` and its tests are inside the 915-test run above and pass. The orchestrator reports the full suite (231 files, 4377 tests), build, typecheck (one known stale `.next` error) and lint (0 errors) green on HEAD. No Phase 1 regression found.

### Pre-existing, out of scope

Stale generated `.next/dev/types/validator.ts` typecheck error, 377 lint warnings, and the 5 s flake in `__tests__/quality-brand-token-parity.test.ts` under load.

## Gaps Summary

No gaps. Every roadmap success criterion is satisfied in the codebase; SC5's snapshot half is the documented placeholder and waits on the first successful workflow run. The five human items above (first workflow run, owner copy sign-off, owner-run sync against the real database, a live visual check, and the owner's boss names due 2026-10-21) are all things only the owner or a live environment can do.

---

_Verified: 2026-10-19_
_Verifier: Claude (gsd-verifier)_
