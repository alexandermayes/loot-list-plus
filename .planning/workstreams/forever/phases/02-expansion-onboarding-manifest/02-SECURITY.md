---
phase: 02
slug: expansion-onboarding-manifest
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-10-19
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: authored at plan time (all 13 PLAN files carry a `<threat_model>` block; the 63 rows below are the plans' rows verbatim, ids are per plan plus the cross-cutting T-02-SC). Verification depth: ASVS L1 (grep and test evidence against the implementation at HEAD c546ca52 on gsd/v2.0-forever-loot). Block threshold: high. Verified by the gsd-security-auditor on 2026-10-19 with the phase test set run one-shot under CI=true (48 files, 927 tests, exit 0), golden files byte-identical, working tree clean, no live wago.tools or Wowhead requests, no secrets found in the 61 changed files.

Totals: 63 threats (9 high, 24 medium, 30 low); 56 mitigate, 7 accept, 0 transfer. All closed. threats_open: 0 at or above high; 0 open below the threshold.

---

## Trust Boundaries

| Boundary | Description | Data Crossing | Plans |
|----------|-------------|---------------|-------|
| test recorder to seeder | A fake Supabase client drives the real seeder; nothing crosses a network or database boundary | see description | 02-01 |
| npm registry to repo | Third-party package code enters the dependency tree and the client bundle (zod) or dev tooling (csv-parse) | see description | 02-02 |
| manifest data to UI | Manifest strings (raid and boss names) render in the browser in plan 02-11 | see description | 02-02 |
| guild-creation and add-expansion routes to service-role client | Routes call the seeder with a service-role client that bypasses RLS; sync writes raid_tiers through it | see description | 02-03 |
| existing per-guild rows to sync | Rows that lists, awards and BLP point at (raid_tiers referenced by loot_items, loot_submissions, loot_history, raid_events, reserve_runs and others) | see description | 02-03 |
| route input to registry | Guild-creation, add-expansion and change-expansion routes pass a client-supplied expansion name into getExpansionDefinition and isSupportedExpansion | see description | 02-04, 02-05 |
| server-only catalogs to client bundles | registry.ts is client-safe; catalogs.ts must never be imported by client code | see description | 02-04, 02-05 |
| public reserve-run route | Unauthenticated GET keyed by expansion name | see description | 02-04, 02-05 |
| developer edits to data files to CI | The gate is the control between a manifest or catalog edit and a merge that copies data into guilds | see description | 02-06 |
| committed snapshot to gate | The reference test trusts the committed JSON shape | see description | 02-07 |
| snapshot rows to manifest | A future snapshot can confirm (and so force promotion of) a provisional boss | see description | 02-07 |
| wago.tools to snapshot script | Untrusted third-party CSV and JSON enter the repo through the scheduled workflow | see description | 02-08 |
| snapshot script to committed file | The script is the only writer of the committed snapshot | see description | 02-08 |
| GitHub Actions to repository | The workflow holds contents and pull-requests write and pushes a bot branch | see description | 02-09 |
| wago.tools to bot PR | Untrusted fetched data arrives as a PR diff | see description | 02-09 |
| runtime and test code to external hosts | The scan guards that no first-party code reaches wago or Wowhead at runtime or test time | see description | 02-09 |
| owner workstation to production database | The script runs locally with the service-role key from .env.local and bypasses RLS | see description | 02-10 |
| script output to terminal and UAT notes | Whatever the script prints may be pasted into planning docs | see description | 02-10 |
| database tier names to the browser | raid_tiers.name values (officer-editable) are matched against the manifest in a client component | see description | 02-11 |
| manifest data to the DOM | Raid and boss names render as text | see description | 02-11 |
| tier names to icon URLs | raid_tiers.name values (officer-editable) select an icon from a name map in client and server-rendered code | see description | 02-12 |
| run detail API to the browser | GET /api/reserve-runs/[id] returns run data to managers and to viewers through an allow-list | see description | 02-13 |
| run payload to the icon lookup | expansion_name and raid_tier_name from the API select an icon in client code | see description | 02-13 |
| share token to the service-role OG route | the public OG image route reads run, tier, guild and now expansion rows with the service-role client | see description | 02-13 |

---

## Threat Register

Mitigation column: the control as verified, with file and line or test evidence from the audit.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01-01 | Tampering (contract drift) | golden files | medium | mitigate | Golden files committed a10edf33 and 4e6cbd6b (2026-10-14) before the first seeder edit 0fe585c1 (2026-10-16); the seeder at a10edf33 equals the merge-base and current origin/main; expansionSeeder-golden.test.ts:237 uses toMatchFileSnapshot and ci.yml runs `npm run test` on PRs (Actions sets CI=true) | closed |
| T-02-01-02 | Repudiation (silent re-baseline) | update flag on the golden suite | medium | mitigate | Header at expansionSeeder-golden.test.ts:8-10 forbids `vitest -u`; the seeder-editing plans 02-03, 02-04 and 02-05 verify with CI=true; `git diff 4e6cbd6b HEAD -- __golden__` is empty | closed |
| T-02-01-03 | Information disclosure | golden file contents | low | accept | Rationale holds: only public catalog rows with synthetic ids (g1, exp-1, tier-N); 0 UUIDs, emails or tokens across the 5 files | closed |
| T-02-SC | Tampering (supply chain) | npm install of zod and csv-parse | high | mitigate | package.json:75 zod "4.6.5" and :88 csv-parse "7.0.2", exact with no caret; package-lock.json:12052 and :5774 resolve with integrity hashes; neither package has install scripts; both files committed together in d3d250ed; owner approval recorded at 02-02-SUMMARY.md:95-102 | closed |
| T-02-02-01 | Elevation of privilege (bundle reach) | zod in client bundles | low | mitigate | domain/expansion/index.ts:1-4 does not export manifest-schema; manifest.ts:20 and lookup.ts:9 use `import type`; runtime zod appears only in domain/expansion/*-schema.ts and scripts/ | closed |
| T-02-02-02 | Tampering (data typo) | FOREVER_MANIFEST | medium | mitigate | manifest-schema.ts:24-77 uses z.strictObject throughout; independent transcription at manifest-gate.test.ts:44-55; unknown-key tests at :143 and :149 | closed |
| T-02-02-03 | Spoofing (unverified data shown as fact) | provisional bosses | low | mitigate | All 9 bosses are 'provisional' with a source (manifest.ts:43-50, :69); superRefine at manifest-schema.ts:36-52 requires verifiedBy for a verified boss; Unconfirmed badge at SetupGuide.tsx:104 | closed |
| T-02-02-04 | Information disclosure | manifest contents | low | accept | Rationale holds: manifest.ts holds raid names, sizes, dates, boss names and source notes only | closed |
| T-02-04-01 | Tampering (prototype pollution) | getExpansionMeta, getExpansionCatalog, getExpansionDefinition | medium | mitigate | Own-property guards at registry.ts:40 and catalogs.ts:132; getExpansionDefinition resolves through getExpansionMeta (expansionSeeder.ts:70-74) | closed |
| T-02-04-02 | Tampering (wrong rows for existing expansions) | legacy adapters | high | mitigate | Golden suite passes under CI=true and the files are unchanged since capture; legacy defaults kept at catalogs.ts:96 (or 'Unlimited') and :98 (or []); verifier mutation check: 5 of 6 golden tests fail when the default changes | closed |
| T-02-04-03 | Tampering (silent fallback) | classification and role selection | medium | mitigate | Module-load throws at expansionSeeder.ts:43-47; `catalog.kind !== 'legacy'` throws at :255-256; the registry test asserts native iff seedMode is 'sync' and that only Forever syncs | closed |
| T-02-04-04 | Information disclosure (bundle reach) | registry.ts | low | mitigate | registry.ts:12-13 imports only domain/expansion/game plus type-only types; client-safe scan at expansionSeeder-registry.test.ts:285-320 | closed |
| T-02-04-05 | Elevation of privilege (unintended public surface) | /api/reserve-runs/raid-tiers | low | mitigate | raid-tiers/route.ts is unchanged since the merge-base; EXPANSION_NAME_TO_SLUG is not in the data/expansion-phases.ts diff | closed |
| T-02-05-01 | Tampering (prototype pollution) | getExpansionMeta, getExpansionCatalog, getExpansionDefinition | medium | mitigate | NEAR_MISSES 'constructor', '__proto__', 'toString', '', undefined and 42 are tested against all three lookups (expansionSeeder-registry.test.ts:237-249) | closed |
| T-02-05-02 | Tampering (silent fallback returns) | seeder source | medium | mitigate | findChainViolations synthetic self-check at expansionSeeder-registry.test.ts:145, clean source at :156, real seeder scan at :166 | closed |
| T-02-05-03 | Information disclosure (bundle reach) | registry.ts, forever/manifest.ts, forever/lookup.ts | low | mitigate | CLIENT_UNSAFE_IMPORT flags runtime zod, catalogs, raid, classification and role files, app/services and utils/supabase; applied to registry, types, manifest and lookup with a non-vacuous check | closed |
| T-02-05-04 | Elevation of privilege (unintended public surface) | /api/reserve-runs/raid-tiers | low | mitigate | raid-tiers/__tests__/route.test.ts:44-50: Forever gets 400 and createServiceRoleClient is never called; :66 asserts getExpansionSlug('Forever') is null | closed |
| T-02-06-01 | Tampering (bad data reaches guilds) | manifest and catalog edits | high | mitigate | Each validate.ts rule has a mutated-copy test (manifest-gate.test.ts:256-700); the real registry gives zero errors for all 6 expansions (:242-245); CI runs on every PR | closed |
| T-02-06-02 | Repudiation (baseline creep) | legacy exception fixture | medium | mitigate | Fixture total of 33 checked at manifest-gate.test.ts:461; computed set equals the fixture at :468; a missing entry, a stale entry and an empty fixture each fail (:477, :485, :493) | closed |
| T-02-06-03 | Tampering (rename duplicates tiers) | shipped raid names | medium | mitigate | shipped-names.json equals the transcription (manifest-gate.test.ts:662); a rename without an alias fails (:670) | closed |
| T-02-06-04 | Tampering (date drives behaviour) | opening date literal in code | low | mitigate | D-06 scan at manifest-gate.test.ts:716-780 (50-file floor, comments stripped, self-checks); the only holder of the date literal is the manifest | closed |
| T-02-03-01 | Tampering (integrity of referenced rows) | syncExpansionCatalog | high | mitigate | No .update, .delete or .upsert in expansionCatalogSync.ts, forever-sync.ts or the CLI (grep); one insert at expansionCatalogSync.ts:136; the test fake throws on any forbidden write (expansionCatalogSync.test.ts:22-68); :344 asserts none in any scenario; source scan at :397 | closed |
| T-02-03-02 | Tampering (duplicate tiers) | read-then-insert sync | medium | mitigate | Matching is normalized and alias-aware (lookup.ts:28); one bulk insert; tests at expansionCatalogSync.test.ts:173 and :195; post-apply duplicate check at forever-sync.ts:152-156; the missing unique index is documented at :16-20 | closed |
| T-02-03-03 | Elevation of privilege (scope creep of a service-role write) | sync called on a legacy expansion | high | mitigate | Throws before any query for a name other than Forever (expansionCatalogSync.ts:117); test :331-341 asserts fromCalls is empty; reached only from expansionSeeder.ts:244 (seedMode 'sync') | closed |
| T-02-03-04 | Denial of service (half-seeded guild) | seeder Forever branch | low | mitigate | Sync runs inside the seeder's try (catch at expansionSeeder.ts:378); guild creation deletes the guild on a seed error (app/api/guilds/route.ts:167-171); runForeverSync heals add-expansion leftovers (forever-sync.ts:130-170); see residual risk 4 | closed |
| T-02-03-05 | Tampering (invisible tier) | phase lookup | medium | mitigate | A null phase throws (expansionCatalogSync.ts:86); test at expansionCatalogSync.test.ts:365 | closed |
| T-02-03-06 | Tampering (prototype pollution) | findManifestRaid | low | mitigate | Array comparison in lookup.ts:28-46; forever-lookup.test.ts:28-39: 'constructor' and '__proto__' return null | closed |
| T-02-08-01 | Tampering (poisoned snapshot) | refreshSnapshot output | high | mitigate | JSON-only write (snapshot-reference.ts:67-70); header check at wago-snapshot.ts:255, integer check at :226, trim at :282, schema check before write at :423-428; the directory is JSON-only (forever-reference.test.ts:109); merge needs a reviewed PR and D-15 applies; see residual risk 2 | closed |
| T-02-08-02 | Denial of service (outage turns CI red) | wago availability | medium | mitigate | withRetry: 5 attempts, cap 60 s (wago-snapshot.ts:163); retryable set 403, 429, 500, 502, 503 and 504 at :75; an outage returns before any write; ::notice:: then exit 0 (snapshot-reference.ts:100-107) | closed |
| T-02-08-03 | Information disclosure (live fetch in tests) | test suite | medium | mitigate | Injected fetchImpl (wago-snapshot.ts:117); global fetch stubbed to throw and asserted unused (wago-snapshot.test.ts:34-46); no host literal in tests | closed |
| T-02-08-04 | Spoofing (redirect to unknown host) | outbound requests | low | mitigate | Only BUILDS_URL and tableUrl (wago-snapshot.ts:64-70) are built from WAGO_BASE_URL (:382, :394); the build must match a numeric pattern; a 404 is terminal (wago-snapshot.test.ts:593) | closed |
| T-02-08-05 | Tampering (CSV injection into later tooling) | parsed strings | low | accept | Rationale holds: no app, lib or components code reads wago.json; only reference-check.ts and its test do | closed |
| T-02-08-07 | Spoofing (identity swap to get past bot protection) | request headers | medium | mitigate | One headers object, User-Agent only (wago-snapshot.ts:118), and no fallback UA; tests at wago-snapshot.test.ts:547, :560-568 and :571 | closed |
| T-02-08-06 | Repudiation (a lasting block hidden as green) | persistent 403 or 5xx | low | mitigate | The notice names the attempt count and last status (snapshot-reference.ts:102-104) | closed |
| T-02-10-01 | Elevation of privilege (service-role misuse) | scripts/sync-forever-catalog.ts | high | mitigate | Dry run by default; unknown flags throw (forever-sync.ts:57-76; tests forever-sync.test.ts:184-205); writes only through syncExpansionCatalog; only expansions and raid_tiers are touched (test :489); no workflow or app module invokes it | closed |
| T-02-10-02 | Information disclosure | script output | medium | mitigate | Selects only 'id, guild_id' and 'id, name'; the error path prints the message only (sync-forever-catalog.ts:93-96); planted guild, player and email values never print (forever-sync.test.ts:464-498); see residual risk 6 | closed |
| T-02-10-03 | Tampering (duplicate tiers from concurrent runs) | apply | medium | mitigate | Re-read after apply (forever-sync.ts:111-123, :152-156); exits 1 (:229-231) and never deletes | closed |
| T-02-10-04 | Repudiation (silent partial run) | per-expansion failures | low | mitigate | Each failure is recorded with its id and message and the loop continues (forever-sync.ts:164-166); exits 1 | closed |
| T-02-10-05 | Elevation of privilege (sync exposed on a request path) | app code | medium | mitigate | Guard at forever-sync.test.ts:556-600: 300-file floor including proxy.ts; only the seeder and the script library import the sync module; five synthetic import forms are flagged | closed |
| T-02-09-01 | Elevation of privilege (workflow token scope) | refresh-wago-snapshot.yml | medium | mitigate | refresh-wago-snapshot.yml:26-33: schedule and dispatch triggers only; contents and pull-requests write only; :81 stages one file; :77 and :83 push a fixed bot branch, never main; the step output passes through an env var (:70) | closed |
| T-02-09-02 | Tampering (unreviewed data merge) | bot PR | high | mitigate | No merge or auto-merge step in .github/; the PR body states that CI did not run (:92) and lists promotions (:85-89); the main ruleset requires 1 approval and 3 checks and the snapshot workflow is not one of them; CI runs again on push to main; see residual risk 8 | closed |
| T-02-09-03 | Denial of service (red CI from an outage) | snapshot step | medium | mitigate | Outage exits 0; no push or pull_request trigger; not a required check | closed |
| T-02-09-04 | Information disclosure and availability (live fetch at runtime or test) | app, lib, utils, domain, components, data, discord-bot and all tests | medium | mitigate | no-live-fetch.test.ts: 700-file floor (:61), three rules (:236-246), discord-bot included (:44), self-checks at :323-436, zero offenders; verifier mutation check fired | closed |
| T-02-09-05 | Repudiation (PR pile-up hides changes) | weekly PRs | low | mitigate | Fixed branch with `checkout -B`, `push --force` and a `gh pr edit` fallback (refresh-wago-snapshot.yml:77-104); see residual risk 3 | closed |
| T-02-09-06 | Tampering (secret exposure) | NPM_RC usage | low | accept | Rationale holds: same .npmrc step as ci.yml and refresh-item-data.yml; .npmrc is gitignored (.gitignore:57); only wago.json is staged | closed |
| T-02-07-01 | Tampering (poisoned snapshot) | committed snapshot shape | high | mitigate | reference-snapshot-schema.ts:22-119: strict rows with z.int columns, null-build invariants and a buildPrefix check; the committed file is parsed at forever-reference.test.ts:71; strictness tests at :116-188; the writer validates before writing; D-15 test at :382 | closed |
| T-02-07-02 | Tampering (integrity drift) | committed snapshot | medium | mitigate | sha256 recomputed for any non-null build (forever-reference.test.ts:101-107); canonical-payload tests at :190-245 | closed |
| T-02-07-03 | Denial of service (outage blocks work) | wago availability | medium | mitigate | The placeholder wago.json parses and the suite stays green (forever-reference.test.ts:70-95; auditor run) | closed |
| T-02-07-04 | Spoofing (unverified boss shown as fact) | allowlist ratchet | medium | mitigate | All 9 bosses provisional; the allowlist holds 9, matching PROVISIONAL_CEILING 9 (reference-check.ts:38; test :299); ratchet errors at :77-87 (tests :337-377); a confirmed boss fails until promoted (:382); see residual risk 1 | closed |
| T-02-12-01 | Spoofing (Forever raid presented as a Classic or TBC raid) | getRaidIcon, getRaidIconLarge | low | mitigate | The Forever branch never reads the map (utils/raidIcons.ts:98, :103); tests raidIcons.test.ts:30-41; inventory test at :282-312 | closed |
| T-02-12-02 | Tampering (prototype-pollution names as tier names) | Forever lookup path | low | mitigate | raidIcons.test.ts:55-60: proto names with 'forever' give the neutral icon | closed |
| T-02-12-03 | Tampering (hostile tier name on the Classic path) | Classic lookup path | low | accept | Rationale holds: the Classic expression is byte-identical to the merge-base; worst case is a broken image on the fixed zamimg prefix; see residual risk 5 | closed |
| T-02-12-04 | Repudiation (unreviewed copy shipped without sign-off) | this PR | low | mitigate | The app diffs in ed363aa4 and 976dca3f only add a game argument; no string or JSX text changed | closed |
| T-02-13-01 | Information disclosure | GET /api/reserve-runs/[id] expansion_name | low | mitigate | expansion_name is added after the canView check and outside RUN_VIEWER_FIELDS (reserve-runs/[id]/route.ts:136-160); [id]/__tests__/route.test.ts:453-465 and :288-296: viewers get no raid_leader_token or created_by | closed |
| T-02-13-02 | Tampering (unexpected expansion name) | run detail page, join page, OG image | low | mitigate | getExpansionGame own-property guard (domain/expansion/game.ts:70-75); `?? 'classic'` at runs/[id]/_client.tsx:637, join/[token]/page.tsx:892 and opengraph-image.tsx:55 | closed |
| T-02-13-03 | Elevation of privilege (service-role read widened) | opengraph-image | low | mitigate | opengraph-image.tsx:49-51 uses select('name') filtered by the run's own expansion_id, inside the existing try; the only input is still the share token | closed |
| T-02-13-04 | Denial of service | OG image extra query | low | accept | Rationale holds: the read joins the existing Promise.all (opengraph-image.tsx:44-52); on failure the fallback is 'classic' (:27-28, catch at :73) | closed |
| T-02-13-05 | Spoofing (Forever raid presented as a Classic or TBC raid) | six reserve and master sheet surfaces | low | mitigate | 15 calls in 12 app/ files all pass a game; GAMELESS_CALL_ALLOWLIST is empty (raidIcons.test.ts:212); no callers outside app/ | closed |
| T-02-11-01 | Tampering (XSS through names) | ForeverRaidList | low | mitigate | Manifest strings render as React text (SetupGuide.tsx:59-118); tier names are only matched, never shown; no dangerouslySetInnerHTML | closed |
| T-02-11-02 | Spoofing (unverified boss shown as fact) | boss list | medium | mitigate | Badge at SetupGuide.tsx:104 and note at :111; SetupGuide.test.tsx:391-393 asserts 9 Unconfirmed badges, 2 notes and 1 "Bosses to be announced" | closed |
| T-02-11-03 | Repudiation (unapproved copy shipped) | new strings | low | mitigate | Constants at SetupGuide.tsx:34-42; owner sign-off is 02-UAT.md test 2 (pass, 2026-10-19); the source comment still says awaiting sign-off, see residual risk 9 | closed |
| T-02-11-04 | Information disclosure | setup guide visibility | low | accept | Rationale holds: gated by hasPermission('manage_settings') (DashboardContent.tsx:1996); public manifest data only | closed |
| T-02-11-05 | Tampering (prototype pollution via tier name) | foreverRaidsForTierNames | low | mitigate | Uses findManifestRaid plus a Map keyed by numeric index (lookup.ts:53-67); proto tests in forever-lookup.test.ts:28-39 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

The planned mitigation text for each row is in the owning plan's `<threat_model>` block (02-01-PLAN.md through 02-13-PLAN.md).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-02-01 | T-02-01-03 | Golden files hold only public catalog data (item names, ids, slots) and synthetic ids; no guild, player or secret data | Plan 02-01 | 2026-10-19 |
| R-02-02 | T-02-02-04 | The Forever manifest is public game data only; no personal or guild data | Plan 02-02 | 2026-10-19 |
| R-02-03 | T-02-08-05 | Snapshot values are stored as JSON strings and no runtime code reads wago.json; manifest names, not snapshot names, render through React escaping | Plan 02-08 | 2026-10-19 |
| R-02-04 | T-02-09-06 | NPM_RC is written to a gitignored .npmrc only for npm ci, the same pattern as ci.yml and refresh-item-data.yml; only wago.json is staged | Plan 02-09 | 2026-10-19 |
| R-02-05 | T-02-12-03 | The Classic icon lookup is unchanged by design so no Classic-line icon moves; the worst case is a broken image URL on the fixed icon host, as today (optional own-property guard noted in residual risk 5) | Plan 02-12 | 2026-10-19 |
| R-02-06 | T-02-13-04 | One more single-row read inside the existing Promise.all of the OG route; any failure keeps the existing fallback values | Plan 02-13 | 2026-10-19 |
| R-02-07 | T-02-11-04 | The setup guide is already limited to manage_settings users of the guild and shows public game data only | Plan 02-11 | 2026-10-19 |

*Accepted risks do not resurface in future audit runs.*

---

## Residual Risk (optional follow-ups, not open threats)

The declared controls are in place; these are weaknesses next to them, recorded so a later plan can pick them up. The first four match code review warnings in 02-REVIEW.md.

1. T-02-07-04 (WR-02): promotion matches boss names across the whole snapshot. `findPromotableBosses` (data/expansions/forever/reference-check.ts:91-111) and the DungeonEncounter filter in `trimToManifest` (scripts/lib/wago-snapshot.ts:282) would mark Forever Onyxia promotable from a Classic Onyxia row, and `checkVerifiedEncounters` (:113-131) only checks that an encounter id exists somewhere. Expected fix: scope matching by DungeonEncounter.MapID joined to Map, or by the manifest mapId, and require the cited row's name to equal the boss name.
2. T-02-08-01 (WR-06): a header-only 200 response is written as an updated snapshot with empty tables (scripts/lib/wago-snapshot.ts:392-428), which silently disables the D-15 forcing function. Expected fix: throw before trimming if the untrimmed DungeonEncounter or Map table is empty, and log the untrimmed row counts.
3. T-02-09-05 (WR-04): .github/workflows/refresh-wago-snapshot.yml:80-83 uses `git push --force`, which discards reviewer commits the PR body invites. Expected fix: fetch the branch and push with `--force-with-lease`, or tell reviewers not to push to the bot branch.
4. T-02-03-04 (WR-01): app/api/guilds/[id]/expansions/route.ts:124-133 does not roll back a failed Forever sync, so a retry from the UI is blocked until the owner runs `npm run sync:forever -- --apply`. Expected fix: in the sync branch at app/services/expansionSeeder.ts:244-250, delete the new expansion row and clear the active pointer on failure.
5. T-02-12-03 (WR-05, accepted): utils/raidIcons.ts:98 and :103 have no own-property guard on the Classic path. Optional fix: a hasOwnProperty check or a Map.
6. T-02-10-02 (IN-01): the duplicate report (scripts/lib/forever-sync.ts:93-103, :205-210) prints every duplicated raid_tiers.name, including officer-made names, with guild ids by design; only counts from this output may enter tracked files. Optional fix: report only duplicates where `findManifestRaid(name)` is not null.
7. T-02-02-01: no test pins that the domain barrel leaves out the schema modules; the client-safe scan flags direct zod imports only. Optional fix: add the schema paths to CLIENT_UNSAFE_IMPORT (app/services/__tests__/expansionSeeder-registry.test.ts:93-101) and assert that domain/expansion/index.ts does not export them.
8. T-02-09-02: the bot PR runs no CI; under the main ruleset it merges only after a pushed commit or an admin bypass, and a bypass skips CI on that PR. The push-to-main CI run still runs the gate afterwards.
9. T-02-11-03 (IN-02): the "PROPOSED, awaiting owner sign-off" comment at app/(app)/overview/components/SetupGuide.tsx:34-36 is stale now that UAT test 2 passed.

Unregistered change (WR-03, no threat row and no SUMMARY flag): .github/workflows/refresh-item-data.yml:25-27 now also triggers on `data/expansions/**`. The workflow holds contents and pull-requests write and runs the Wowhead fetchers, none of which read that directory; the trigger is push-to-main only, so no untrusted code runs with the token. The cost is extra Wowhead crawls, for example after every merged snapshot PR. Expected fix: drop the path or narrow it to data/expansions/forever/manifest.ts, and correct the header comment.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-19 | 63 | 63 | 0 | /gsd-secure-phase 02 (gsd-security-auditor, L1 grep and test evidence; phase test set 48 files / 927 tests green one-shot; main ruleset read once, read-only) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-19
