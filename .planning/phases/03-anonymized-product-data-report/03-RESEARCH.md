# Phase 3: Anonymized Product-Data Report - Research

**Researched:** 2026-09-03
**Domain:** Prod-data aggregate reporting pipeline (Python + Supabase Management API) feeding a static Next.js article page
**Confidence:** MEDIUM-HIGH — the pipeline mechanics and schema are verified directly against this repo's code; the metric-feasibility findings are the highest-value output and are grounded in code, not training knowledge.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Finding selection flow**
- D-01: Findings are chosen at a human checkpoint: the executor runs ALL candidate aggregate queries from the sprint plan's recommended-dataset list, presents every metric with its real number, and the user picks which become published findings (mirrors the Phase 1/2 checkpoint pattern).
- D-02: The checkpoint menu lists every plan metric, including uncomputable or unpublishable ones, which appear greyed out with the exact reason (e.g., no survey data exists for officer time; top-bracket share only if the data supports it accurately). The user cannot pick greyed-out metrics.
- D-03: Target 3 to 5 findings on a quality bar: publish every genuinely strong, privacy-safe finding, capped around 5.
- D-04: When a segmented breakdown has a segment under the 10-guild floor, small segments merge into an "Other" bucket so breakdowns sum to 100% without exposing small cohorts.

**Reproducibility mechanism**
- D-05: Pipeline is queries → artifact → page: committed SQL files plus a runner that executes them via the Supabase Management API and writes a committed aggregates JSON; the page imports that JSON at build time so published numbers cannot drift from the queries. — Reversibility: costly.
- D-06: Tooling is Python in `scripts/analytics/`, matching the Phase 1 analytics tooling and provenance convention; Supabase Management API with the CLI token from the macOS keychain.
- D-07: The report's methodology section publicly links to the saved-queries directory on GitHub for maximum checkability. — Reversibility: costly.

**Page presentation**
- D-08: Research article layout: an article-shaped page like the blog posts (opening, H2-per-finding, methodology section) under `/research`, with data tables inline.
- D-09: Data presented as HTML tables plus big-number stat callouts per finding; zero new dependencies; all values are quotable text (crawlable by AI surfaces).
- D-10: Downloads are CSV + JSON: a CSV of the aggregates table and the committed JSON artifact itself.
- D-11: The report carries the Zev author identity: visible byline plus Person schema consistent with the blog posts (#247).

**Dataset window & definitions**
- D-12: Dataset window is fixed calendar months: June 1 to August 31, 2026 (the last 3 complete months). The plan's "previous 90 days" wording is interpreted as this fixed window, never a rolling one. — Reversibility: costly.
- D-13: "Active guild" uses the sprint plan's OR-definition verbatim: at least 1 recorded raid, OR at least 1 loot award, OR at least 5 approved lists during the window (queryable from raid_events, loot_history, loot_submissions). — Reversibility: costly.
- D-14: Expansion segmentation assigns a guild to each expansion where it had qualifying activity during the window, derived from reliable activity tables (raid_events/raid_tiers), NOT `loot_history.expansion_id` (known-unreliable). A guild can count in multiple buckets; the breakdown may sum over 100% and the methodology says so.
- D-15: Raiders are counted as distinct characters with an approved list in the window. No alt-dedup via character_aliases; the methodology states it is a character count.

### Claude's Discretion
- Exact SQL shape of each saved query (aggregate-only, within the definitions above).
- Aggregates JSON schema and the CSV column layout.
- Exact visual styling of stat callouts and tables within the existing Tailwind design system.
- Whether the "top priority bracket" metric is computable accurately enough to offer at the checkpoint (D-02 governs how it is presented if not).
- Draft wording of all page copy (plan copy is the starting point; user sign-off gate applies before ship).

### Deferred Ideas (OUT OF SCOPE)
- Fix "loot list" query cannibalization (changelog vs homepage) — already folded into Phase 2 and shipped.
- Rework /compare search snippet for competitor queries — already folded into Phase 2 and shipped.
- Explore top-of-funnel and paid ads strategy — deferred until after the sprint.
- Review PostHog data for growth experiments — same deferral.
- Redesign admin analytics dashboard — same deferral.
- Fix admin analytics dashboard showing zero data — same deferral.

None of the six relate to the report's scope; keyword matches only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVID-01 | Anonymized data report published at `/research/wow-classic-loot-systems-2026` with methodology, date range, sample definitions, ≥3 findings, each segment ≥10 guilds | Blog article layout pattern verified in `app/blog/*/page.tsx`; sprint plan's exact opening-copy/finding-format template found and quoted below; D-04's floor-merge logic detailed in Common Pitfalls |
| EVID-02 | Every published number reproduces from a saved query committed to the repo | Management API pattern verified in `scripts/deploy-migrations.sh`; JSON build-time import verified feasible via `tsconfig.json` `resolveJsonModule`; two candidate metrics found to be unreliable for this window (funnel-milestone timing) — see Pitfall 1 |
| EVID-03 | Report page is self-canonical, in the sitemap, with metadata/structured data matching visible content, contextual CTA | `app/sitemap.ts` structure verified; Person/Article JSON-LD pattern verified in `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` and `app/about/page.tsx` |
</phase_requirements>

## Summary

This phase has almost no new-technology risk: it reuses three patterns that already exist and work in this codebase — the Phase 1 Python analytics-script convention (`scripts/analytics/`), the Supabase Management-API pattern already used by `scripts/deploy-migrations.sh` to run arbitrary SQL against prod with only a personal access token (no DB password, no service-role key in `.env.local`), and the blog-post article layout/JSON-LD pattern already shipped nine times over in `app/blog/`. Zero new npm or pip packages are required. The real work is disciplined data-pipeline hygiene (SQL → committed JSON/CSV artifact → build-time import, so the page can never say a different number than the query produced) and getting the metric *definitions* right before the D-01 checkpoint runs.

The most important finding in this research is **not** a library choice — it's a data-quality landmine in two of the sprint plan's recommended candidate metrics. The report window is June 1–Aug 31, 2026 (D-12), but the `guild_funnel_milestones` table that would answer "median time from guild creation to qualified setup" and "median time from qualified setup to activation" was created by a migration dated 2026-08-27 — four days before the window closes. Worse, the milestone-evaluation function stamps each column with the *current* time the first time it happens to re-run and finds the condition true, not the historical time the condition became true. For any guild that qualified or activated before Aug 27 and only later triggers a mutation, its timestamp is retroactively wrong. Both candidate metrics should very likely be greyed out at the D-01/D-02 checkpoint with this exact reason, not silently computed and possibly published.

A second load-bearing finding: `guild_settings.attendance_type` is a required, non-null column with a nonzero application-level default (`points-per-raid`, `max_attendance_bonus: 4`). The sprint's "% of active guilds that weight attendance" metric cannot be answered by checking whether this column is set — nearly every guild will show up "true." Bad-luck protection has no such problem (`blp_enabled` is a real nullable boolean a guild must actively flip), so that metric is safe to compute as-is.

**Primary recommendation:** Build the pipeline exactly per D-05/D-06 (committed `.sql` files → a `scripts/analytics/run-research-report.py` runner using the same Management-API-plus-keychain pattern as `deploy-migrations.sh` → a committed JSON/CSV artifact imported by the page at build time via `resolveJsonModule`), reuse the `app/blog/*/page.tsx` layout and `app/about/page.tsx` Person-schema pattern verbatim for structure, and treat the two funnel-milestone metrics and the attendance-weighting metric as pre-flagged checkpoint risks rather than metrics to compute naively.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Aggregate SQL execution against prod | Offline/Batch tooling (`scripts/analytics/`) | — | Runs outside the app's request path via the Supabase Management API with an elevated personal access token; must never be reachable from a route handler |
| Data artifact generation (JSON + CSV) | Offline/Batch tooling | Repo-committed storage | The committed file becomes the durable, reviewable "source of truth" that both the page and the CSV download read from |
| Report page rendering | Frontend Server (SSR, Next.js App Router) | CDN/Static (fully cacheable, no per-request DB calls) | Server Component imports the committed JSON at build time (D-05); no runtime query ever runs |
| Sitemap + structured data | Frontend Server (SSR) | — | `app/sitemap.ts` array entry + Next Metadata API + inline JSON-LD `<script>` tags, same as every blog post |
| Contextual CTA → signup | Browser/Client | API/Backend (existing Discord OAuth flow) | Links into the already-built signup flow from Phase 2; no new auth work |
| Privacy guardrails (10-guild floor, no names) | Offline/Batch tooling (query + runner design) | Human checkpoint (D-01/D-02) | Enforced before an aggregate ever reaches a committed artifact, the checkpoint console, or the page — never as a page-render-time filter |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python 3 (stdlib only) | 3.9.6 confirmed installed [VERIFIED: `python3 --version` this session] | Runner script: calls Management API, aggregates, writes JSON/CSV | Matches the explicit house rule already in this repo: "stdlib only — no node, no google client libraries" [VERIFIED: scripts/analytics/pull-gsc.py:25] |
| Next.js App Router (already in use) | 16.2.12 (repo-pinned) | Page rendering, Metadata API, JSON-LD | Already the framework for every marketing page; no alternative under consideration |
| Supabase Management API | `v1` (`/database/query` endpoint) | Runs the committed SELECT statements against prod without a DB password or service-role key | Already the exact mechanism `scripts/deploy-migrations.sh` uses for prod SQL [VERIFIED: scripts/deploy-migrations.sh:1-20] |
| TypeScript `resolveJsonModule` | n/a (compiler flag) | Lets `page.tsx` `import` the committed JSON artifact directly, guaranteeing build-time binding | Confirmed enabled [VERIFIED: tsconfig.json — `"resolveJsonModule": true`] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Python `unittest` (stdlib) | bundled | Tests for the runner's pure aggregation logic (10-guild floor merge, active-guild OR-definition, JSON schema shape) | Matches the existing convention exactly: `python3 -m unittest discover -s scripts/analytics -p 'test_X.py' -v` [VERIFIED: scripts/analytics/test_gsc_export.py:1-13 docstring] |
| Python `csv` module (stdlib) | bundled | Writes the CSV artifact | Already used by `gsc_export.export_csv` [VERIFIED: scripts/analytics/gsc_export.py:45-58] — avoids the comma-corruption bug the RUNBOOK explicitly warns about |
| Vitest 4.1.0 + Testing Library (already in repo) | pinned in package.json | Optional smoke tests for the page/sitemap self-consistency (see Validation Architecture) | If the planner adds automated coverage for EVID-01/EVID-03 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Management API + keychain token | Supabase JS client with `SUPABASE_SERVICE_ROLE_KEY` | Rejected: no Supabase keys exist in `.env.local` by project convention; the keychain-backed Management API path is the only prod-read path already working in this repo |
| Build-time JSON import | An API route that queries live at request time | Rejected by D-05: would let a published number drift from what the committed query actually produced, defeating EVID-02 |
| Committed JSON under `public/` for both import and download | Committed JSON under `scripts/analytics/exports/` + a small route handler to serve it | See Open Questions — genuinely open, not locked by any decision |

**Installation:**
No new packages. This phase introduces zero new npm or pip dependencies (D-09 explicitly requires "zero new dependencies" for the page; the pipeline reuses stdlib-only Python per D-06/established convention).

**Version verification:** Python 3.9.6 confirmed installed via `python3 --version` this session. No package versions to verify since no packages are being added — `pip index versions` / `npm view` are not applicable.

## Package Legitimacy Audit

**Not applicable.** This phase installs no external npm or pip packages. The pipeline is Python stdlib only (`urllib`, `json`, `csv`, `argparse`, `unittest`), and the page reuses existing repo dependencies (Next.js, React, Tailwind) with zero additions, per D-09 and the existing Phase 1 analytics convention.

**Packages removed due to [SLOP] verdict:** none — no packages proposed.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```text
  scripts/analytics/queries/wow-classic-loot-systems-2026/*.sql   (committed, reviewed SELECT statements)
                          │
                          ▼
  scripts/analytics/run-research-report.py                        (offline, run by a human/executor)
      │  1. reads SUPABASE_ACCESS_TOKEN from macOS Keychain
      │     ("Supabase CLI" entry — same one deploy-migrations.sh uses)
      │  2. POSTs each .sql file's contents to
      │     https://api.supabase.com/v1/projects/{ref}/database/query
      │  3. applies the 10-guild floor + "Other" bucket merge (D-04)
      │  4. prints every candidate metric to the console for the D-01 checkpoint
      │        (greys out uncomputable ones per D-02, with the reason)
      ▼
  Human checkpoint: picks 3–5 findings (D-01, D-03)
      ▼
  Committed artifact: aggregates.json + aggregates.csv               (source of truth, EVID-02)
                          │
                          ▼  (build-time `import`, resolveJsonModule)
  app/research/wow-classic-loot-systems-2026/page.tsx               (Server Component, no runtime DB call)
      │  renders opening copy, H2-per-finding, methodology section, HTML tables, stat callouts
      │  emits Article + Person JSON-LD (mirrors app/blog/*), self-canonical metadata
      ▼
  app/sitemap.ts                                                    (one entry, accurate lastModified — EVID-03)
      │
      ▼
  Contextual "Create your guild free" CTA → existing signup flow (Phase 2 LoginPage)
```

### Recommended Project Structure

```
scripts/analytics/
├── queries/
│   └── wow-classic-loot-systems-2026/
│       ├── 01-active-guilds-and-raiders.sql
│       ├── 02-raid-events-and-loot-awards.sql
│       ├── 03-median-list-length.sql
│       ├── 04-attendance-weighting.sql        # see Pitfall 3 before trusting this one
│       ├── 05-bad-luck-protection-usage.sql
│       ├── 06-expansion-distribution.sql      # route through raid_tiers, never loot_history.expansion_id
│       ├── 07-time-to-qualified.sql           # see Pitfall 1 — likely greyed out
│       └── 08-time-to-activated.sql           # see Pitfall 1 — likely greyed out
├── run-research-report.py                     # runner: Management API calls + floor/merge logic + checkpoint printout
├── test_run_research_report.py                # unit tests for pure logic (no network) — Wave 0 gap
└── exports/                                   # or public/research/ — see Open Questions
    ├── wow-classic-loot-systems-2026-aggregates.json
    └── wow-classic-loot-systems-2026-aggregates.csv

app/research/
└── wow-classic-loot-systems-2026/
    └── page.tsx                               # imports the committed JSON, mirrors app/blog/*/page.tsx layout
```

### Pattern 1: Supabase Management API SQL execution (no DB password, no service-role key)

**What:** POST raw SQL to the project's Management API endpoint with a personal access token; the response is the query result as JSON.
**When to use:** Any prod read that needs data outside what RLS-scoped client queries can see (this report needs guild-level and cross-guild aggregates that no `user_id`-scoped client query could ever return).
**Example (bash, the exact working pattern already in the repo):**
```bash
# Source: scripts/deploy-migrations.sh:20-39 (verified, currently used for prod migrations)
API="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query"

run_sql() {
  local body resp http
  body=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))')
  resp=$(curl -sS -w $'\n%{http_code}' -X POST "$API" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body")
  http=$(printf '%s' "$resp" | tail -n1)
  body=$(printf '%s' "$resp" | sed '$d')
  if [ "$http" -lt 200 ] || [ "$http" -ge 300 ]; then
    echo "Management API error (HTTP $http): $body" >&2
    return 1
  fi
  printf '%s' "$body"
}
```
**Retrieving the token (from a prior verified session; keychain entry confirmed present this session via `security find-generic-password -s "Supabase CLI"`, without printing the secret):**
```bash
T=$(security find-generic-password -s "Supabase CLI" -w)
```

### Pattern 2: Build-time JSON import for reproducibility guarantee (D-05)

**What:** The page component imports the committed aggregates JSON as a TypeScript module, so the numbers rendered are literally the same object the runner wrote — there is no code path where the page could show a different number than the artifact.
**When to use:** Exactly this phase's requirement (EVID-02).
**Example:**
```typescript
// tsconfig.json has "resolveJsonModule": true [VERIFIED this session]
import aggregates from '@/scripts/analytics/exports/wow-classic-loot-systems-2026-aggregates.json'
// or from '@/public/research/...' if that location is chosen — see Open Questions

export default function ResearchReportPage() {
  return (
    <p>{aggregates.activeGuildCount} active guilds used LootList+ between {aggregates.windowStart} and {aggregates.windowEnd}...</p>
  )
}
```

### Pattern 3: Article layout + Person/Article JSON-LD (reuse verbatim)

**What:** Every blog post already follows: `Metadata` export with `alternates.canonical`, an `Article` JSON-LD block, a `BreadcrumbList` JSON-LD block, and a visible byline linking to `/about#creator`.
**When to use:** D-08/D-11 require this exact shape for the report page.
**Example (source verified):**
```typescript
// Source: app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx:8-104 (verified)
export const metadata: Metadata = {
  title: '...',
  description: '...',
  alternates: { canonical: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026' },
  openGraph: { title: '...', description: '...', type: 'article', publishedTime: '...', authors: ['LootList+'], url: '...' },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '...',
  author: {
    '@type': 'Person',
    '@id': 'https://www.getlootlist.com/about#creator',   // exact @id already used on /about — verified
    name: 'Zev',
    description: 'Creator of LootList+ and guild officer and raid lead',
    url: 'https://www.getlootlist.com/about',
  },
  publisher: { '@type': 'Organization', name: 'LootList+', url: 'https://www.getlootlist.com', logo: { '@type': 'ImageObject', url: 'https://www.getlootlist.com/lootlist-icon.svg' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026' },
}
```
The Person `@id` (`https://www.getlootlist.com/about#creator`) is reused, not redefined — verified identical in `app/about/page.tsx:26` and every sampled blog post.

### Anti-Patterns to Avoid

- **Querying with relative date math ("last 90 days"):** D-12 locks a fixed calendar window. `pull-gsc.py`'s own default behavior (`date.today() - timedelta(days=90)`) is exactly the anti-pattern to avoid here — every query in this phase must use the literal `2026-06-01` / `2026-08-31` boundaries so re-running the query after Sep 24 reproduces the same number.
- **Adding Review/AggregateRating schema:** explicitly forbidden by the Phase 2 precedent (D-05 in `02-CONTEXT.md`) and the same self-serving-schema concern applies here even though this page isn't a testimonial surface.
- **Hand-editing the CSV artifact:** the RUNBOOK for this exact directory documents a real comma-corruption bug from hand-editing a CSV — always regenerate via the runner, never patch the file directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV serialization | Manual string-join with commas | Python's `csv` module (`csv.writer`) | A `competing_sources`-style comma-in-value bug is already documented as having happened in this exact directory [VERIFIED: scripts/analytics/RUNBOOK.md §9] |
| k-anonymity / small-cohort suppression | Scattered `if count < 10` checks copy-pasted per finding | One centralized floor-check-and-merge function in the runner, applied to every segmented breakdown before it's ever printed to the checkpoint console | D-04 requires this to be consistent; a per-finding ad hoc check is exactly how a segment leaks by accident |
| Sitemap entry management | Hand-appending to the array and hoping there's no duplicate | Search `app/sitemap.ts` for the slug before adding (it's a flat array with no dedup logic today) | EVID-03 explicitly requires the URL appear exactly once |
| Structured-data authoring | Inventing a new JSON-LD shape for this page | Copy the exact Article/Person/BreadcrumbList shape already shipped on 9 blog posts and `/about` | Consistency is what D-11 asks for, and it's already proven to validate |

**Key insight:** Nothing in this phase requires new infrastructure. Every hard problem (prod aggregate access, reproducible data artifacts, article-page structured data) already has a working, verified precedent in this exact repository from Phase 1 (`scripts/analytics/`) and the blog launch (#247). The risk in this phase is not "what library do I need" — it's "did I get the metric definitions right," which is why the Common Pitfalls section below is unusually load-bearing.

## Common Pitfalls

### Pitfall 1: Two funnel-timing candidate metrics are likely unreliable for this window

**What goes wrong:** The sprint plan's recommended dataset includes "median time from guild creation to qualified setup" and "median time from qualified setup to activation." These map directly to `guild_funnel_milestones.qualified_at` and `.activated_at` [VERIFIED: supabase/migrations/20260827000000_guild_funnel_milestones.sql:7-16 — columns `"qualified_at" timestamptz`, `"activated_at" timestamptz`, `"schedule_configured_at" timestamptz`, `"roster_threshold_at" timestamptz`, `"first_raid_at" timestamptz`, `"first_loot_at" timestamptz`]. That table's migration is dated 2026-08-27 — four days before the report window closes (2026-08-31, D-12) and about three months after it opens (2026-06-01). The evaluator only stamps a column the first time it re-runs and finds the condition newly true: `if (!m.qualified_at && qualifiedNow) { updates.qualified_at = now ... }` and `if (!m.activated_at && approvedLists >= LIST_THRESHOLD && (hasRaid || hasLoot)) { updates.activated_at = now ...}` [VERIFIED: utils/analytics/funnel.ts:137-159]. For any guild that already met the conditions before Aug 27 and only later triggers a mutation that runs the evaluator, the timestamp gets stamped with the trigger time, not the true historical time.
**Why it happens:** Fire-and-forget, current-state-only evaluation with no backfill for pre-existing guilds.
**How to avoid:** At the D-01 checkpoint, either compute these metrics only over guilds created on/after 2026-08-27 (very likely too small a slice to clear the 10-guild floor) or grey both out per D-02 with the reason "funnel-milestone instrumentation shipped 2026-08-27, after most of the report window; pre-existing guilds' timestamps reflect an incidental later mutation, not the true milestone date."
**Warning signs:** A "median days to qualify" that's implausibly small, or timestamps clustering suspiciously close to late August.

### Pitfall 2: `loot_history.expansion_id` is unreliable, and `expansions` is guild-scoped, not a shared lookup table

**What goes wrong:** D-14 already flags `loot_history.expansion_id` as unreliable (previously discovered in the Loot History phase-filter work). Additionally, `expansions` itself has a `guild_id` column [VERIFIED: lib/database.types.ts:671-689 — expansions Row includes `guild_id: string | null`], meaning every guild has its own expansion rows rather than sharing one reference table keyed by expansion name. A query that groups by `expansion_id` will fragment identical expansions (e.g. "MoP") across guilds into separate buckets.
**Why it happens:** The schema models expansions per-guild (each guild configures its own expansion timeline/phase settings), not as a shared enum.
**How to avoid:** Join `raid_events → raid_tiers → expansions` and group by `expansions.name` (text), not `expansion_id`, exactly as D-14 specifies, and de-duplicate a guild counted twice under the same expansion name from two different raid tiers.

### Pitfall 3: "% of active guilds that weight attendance" has no safe boolean signal

**What goes wrong:** `guild_settings.attendance_type` is a required (non-null) column, and the application's own default config sets it to `'points-per-raid'` with a nonzero `max_attendance_bonus: 4` [VERIFIED: domain/scoring/defaults.ts:3-13]. A query like "count guilds where attendance_type IS NOT NULL" will return effectively 100% of guilds and say nothing meaningful. `attendance_type` is confirmed to take exactly `'points-per-raid' | 'linear' | 'breakpoint'` [VERIFIED: domain/scoring/attendance-score.ts:49,83 and app/(app)/loot-management/components/SettingsModal.tsx:218].
**Why it happens:** Attendance scoring is on by default for every guild; there's no separate "attendance enabled" boolean to check.
**How to avoid:** Contrast with bad-luck protection, which has a real signal: `blp_enabled: boolean | null` [VERIFIED: lib/database.types.ts:888] defaults to `false` and a guild must actively opt in [VERIFIED: domain/scoring/defaults.ts:35]. "% using BLP" is safe to compute directly; "% weighting attendance" needs an explicit, defensible non-default threshold (e.g., bonus values that differ from the shipped defaults) decided at the D-01/D-02 checkpoint, not assumed to be a simple presence check.

### Pitfall 4: Character and guild names are real row data in every table this report touches

**What goes wrong:** `characters.name` and `guilds.name` are literal player-chosen and guild-chosen strings [VERIFIED: lib/database.types.ts — characters Row `name: string`; guilds Row `name: string`]. Every saved query in this phase joins through `guilds`, `characters`, or both. It is easy to accidentally `SELECT` a name column while debugging a join, and D-01's checkpoint output is displayed in a place a human (and this agent's own future context) can read.
**Why it happens:** Debug-time convenience — pulling `name` alongside an `id` to sanity-check a join is a normal instinct that is unsafe here.
**How to avoid:** Every query file should `SELECT` only aggregates (`COUNT`, `AVG`, `percentile_cont`) and IDs used purely for `JOIN`/`GROUP BY`; never a name column, even transiently. Enforce this via code review of the `.sql` files before the runner touches prod.

### Pitfall 5: RLS is bypassed entirely — the Management API has no query allowlist

**What goes wrong:** The Management API runs arbitrary SQL as if connected directly to Postgres, ignoring Row Level Security entirely. This is exactly why `guild_funnel_milestones` — RLS enabled, zero policies, normally inaccessible to any client-scoped query [VERIFIED: supabase/migrations/20260827000000_guild_funnel_milestones.sql:22-23 — `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` with comment "Service-role only: RLS on with no policies."] — is still queryable this way. The same token that can SELECT can also DROP TABLE.
**Why it happens:** The Management API's `/database/query` endpoint is a raw SQL execution surface by design (it's how `deploy-migrations.sh` runs DDL).
**How to avoid:** Every query the runner executes must come from a committed, reviewed `.sql` file — never a string built at runtime from any variable input. This is already true by construction (all queries are static, fixed-window SELECTs per D-12), but it's worth stating as an explicit constraint for whoever writes the runner.

## Code Examples

### Reading the queries and checking the 10-guild floor (illustrative shape, not a locked schema)

```python
# Source: pattern combines scripts/analytics/pull-gsc.py's request style (stdlib urllib)
# with scripts/deploy-migrations.sh's Management API auth (verified this session)
import json
import subprocess
import urllib.request

def get_access_token() -> str:
    # Mirrors the verified prior-session pattern; keychain entry confirmed
    # present this session via `security find-generic-password -s "Supabase CLI"`
    # (without printing the secret).
    return subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"]
    ).decode().strip()

def run_sql(project_ref: str, token: str, sql: str):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

def apply_floor(segment_counts: dict[str, int], floor: int = 10) -> dict[str, int]:
    """D-04: merge any segment under the floor into 'Other'."""
    kept, other = {}, 0
    for name, count in segment_counts.items():
        if count >= floor:
            kept[name] = count
        else:
            other += count
    if other:
        kept["Other"] = other
    return kept
```

### Sitemap entry (mirrors the existing pattern)

```typescript
// Source: app/sitemap.ts (verified structure)
{
  url: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  lastModified: new Date(2026, 8, /* ship day */ 1),   // accurate lastmod, not `new Date()` — EVID-03/LINK-02
  changeFrequency: 'monthly',
  priority: 0.9,
},
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| n/a | n/a | — | This phase is not migrating off any deprecated approach; it extends the Phase 1 analytics pattern (already current) to a new script and a new page. |

**Deprecated/outdated:** none identified.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The keychain retrieval command is exactly `security find-generic-password -s "Supabase CLI" -w` | Code Examples / Pattern 1 | Low — this session independently confirmed the keychain entry exists under that exact service name via `security find-generic-password -s "Supabase CLI"` (without the `-w` flag, to avoid printing the secret); the `-w` flag is standard `security` CLI syntax for "print password value only," carried from a prior verified session's memory (34 days old) but not re-run with `-w` this session. |
| A2 | "Never echo the token" is the correct operational discipline for the runner script | Security Domain / Pitfall 5 | Low-medium — this is sound general secret-handling practice, but it is not enforced by any code control in this repo; an executor could accidentally print it in a checkpoint's console output if not careful. |
| A3 | The committed JSON/CSV artifact should live under `public/research/` vs `scripts/analytics/exports/` | Standard Stack / Open Questions | Medium — this is explicitly Claude's Discretion per CONTEXT.md and there is no existing precedent in this codebase for a downloadable, build-time-imported data artifact; whichever the planner picks, `resolveJsonModule` makes either technically workable. |
| A4 | The "top priority bracket" metric (share of awarded items in the winner's top priority bracket) is likely uncomputable without a stored point-in-time score snapshot | Open Questions | Medium — no scoring-history table was located in this session's schema review; `domain/scoring/` computes priority live from current settings, not a historical snapshot at time of award. If a snapshot does exist elsewhere, this metric could be viable after all — worth a direct check at the D-01 checkpoint rather than assuming this research's negative finding is exhaustive. |
| A5 | No self-reported officer-time survey instrument exists in this codebase | Open Questions | Low — based on an absence-of-evidence schema/table-name scan, not an exhaustive audit of every third-party integration (e.g., a Typeform or external survey tool this session didn't search for). D-02 already anticipates this metric being greyed out regardless. |

## Open Questions

1. **Where should the committed JSON/CSV artifact live — `public/research/` or `scripts/analytics/exports/`?**
   - What we know: `resolveJsonModule` makes a build-time `import` work from either location; `public/` gives a free direct-download URL with no extra route handler; `scripts/analytics/exports/` matches the Phase 1 provenance-README convention exactly but needs a small route handler (or a build step that copies the file into `public/`) to be downloadable from the page (D-10).
   - What's unclear: no existing precedent in this codebase for a downloadable, build-time-imported data artifact.
   - Recommendation: use `public/research/` as the single source of truth (runner writes there directly), since it satisfies D-05 (build-time import), D-10 (direct download link), and D-09 (zero new dependencies — no route handler needed) simultaneously. This is Claude's Discretion per CONTEXT.md; the planner should confirm.

2. **Is the "top priority bracket" metric computable at all?**
   - What we know: it requires knowing each award's rank on the winner's list *at the time of the award*, not today's live-recomputed priority (D-14/D-15 already establish that historical fidelity matters for this report).
   - What's unclear: whether any table stores a point-in-time score/rank snapshot per award; this session did not find one in `loot_history`'s columns (`awarded_by, awarded_date, character_id, expansion_id, guild_id, loot_item_id, notes, raid_event_id, raid_tier_id, source` — no rank/score column [VERIFIED: lib/database.types.ts:1207-1223]).
   - Recommendation: treat as likely greyed out per D-02's own wording ("only if the data supports it accurately"), but have the D-01 checkpoint explicitly confirm no snapshot table exists elsewhere before finalizing the grey-out reason text.

3. **Does Postgres's `percentile_cont` work through the Management API's `/database/query` endpoint the same as a normal SELECT?**
   - What we know: the endpoint executes arbitrary SQL as a normal Postgres connection would; `percentile_cont(0.5) WITHIN GROUP (ORDER BY x)` is standard Postgres and should work identically.
   - What's unclear: not tested this session (no queries were run against prod, per this phase's data-privacy mandate).
   - Recommendation: confirm with a trivial SELECT during runner development, before writing the median-dependent query files.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| python3 | Runner script | ✓ | 3.9.6 [VERIFIED this session] | — |
| macOS Keychain entry "Supabase CLI" | Management API bearer token | ✓ (entry present, confirmed without reading the secret) [VERIFIED this session via `security find-generic-password -s "Supabase CLI"`] | — | — |
| Supabase Management API | Prod aggregate queries | Assumed reachable (same endpoint `scripts/deploy-migrations.sh` already uses successfully in this repo) | v1 | — |
| Node.js / npm (existing) | Next.js build, Vitest | ✓ per package.json | Node 20 | — |
| pytest | Not used by this repo's convention | ✗ (not installed; confirmed via `which pytest`) | — | No fallback needed — the established convention is `python3 -m unittest discover`, not pytest; this is not a gap. |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none — the only "missing" tool (`pytest`) isn't part of this repo's testing convention in the first place.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (TS/React side) + Python `unittest` stdlib (analytics side) — dual, matching the existing repo split |
| Config file | `vitest.config.ts` (TS side); none for Python — `python3 -m unittest discover` is the established convention [VERIFIED: scripts/analytics/test_gsc_export.py:1-13] |
| Quick run command | `npx vitest run <path>` (TS) / `python3 -m unittest discover -s scripts/analytics -p 'test_run_research_report.py' -v` (Python) |
| Full suite command | `npm test` (TS, runs `vitest run`) / `python3 -m unittest discover -s scripts/analytics -v` (Python) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVID-01 | Page renders methodology, date range, and ≥3 H2 findings | component (Vitest + Testing Library) | `npx vitest run app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` | ❌ Wave 0 (no precedent exists for testing any blog/landing page in this repo) |
| EVID-02 | 10-guild floor merge, active-guild OR-definition, and expansion multi-bucket assignment behave correctly | unit (Python, no network) | `python3 -m unittest discover -s scripts/analytics -p 'test_run_research_report.py' -v` | ❌ Wave 0 — new file |
| EVID-02 | Re-running a saved query against prod reproduces the published number | manual-only | n/a — requires live `SUPABASE_ACCESS_TOKEN`, which does not exist in CI/`.env.local` by project convention | manual, documented per artifact (see README provenance pattern) |
| EVID-03 | Sitemap contains exactly one entry for the slug; JSON-LD `headline`/`description` match visible `<h1>`/meta description | unit (Vitest, parses the exported arrays/objects) | `npx vitest run app/__tests__/sitemap.test.ts` | ❌ Wave 0 — no sitemap test exists today |

### Sampling Rate

- **Per task commit:** the relevant quick-run command above for whatever was just touched.
- **Per wave merge:** `npm test` and `python3 -m unittest discover -s scripts/analytics -v`.
- **Phase gate:** both full suites green before `/gsd-verify-work`; the manual reproduction check (re-running each saved query and diffing against the committed artifact) documented and performed by a human before sign-off.

### Wave 0 Gaps

- [ ] `scripts/analytics/test_run_research_report.py` — covers EVID-02's pure-logic checks (10-guild floor, active-guild OR-definition, expansion bucket assignment, JSON schema shape); no existing file to extend.
- [ ] `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` — covers EVID-01; no test exists for any blog/landing page in this repo today, so this establishes a new pattern rather than following one.
- [ ] `app/__tests__/sitemap.test.ts` — covers EVID-03's "present exactly once" requirement; `app/sitemap.ts` has never been tested.
- Framework install: none — Vitest and Python `unittest` are already present; no new tooling to install.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No new auth surface; this is a static content page and an offline script |
| V3 Session Management | no | n/a |
| V4 Access Control | yes | The Management API personal access token is effectively a superuser-equivalent credential for this project. Standard control: keychain-only retrieval, never placed in `.env.local` or committed files — exactly the pattern `scripts/deploy-migrations.sh` already requires [VERIFIED: scripts/deploy-migrations.sh:11-13] |
| V5 Input Validation | yes | Every SQL statement the runner executes must be static and committed (`.sql` files), never built from runtime string interpolation — there is no user input in this pipeline at all, which is itself the mitigation |
| V6 Cryptography | no | No new cryptographic work |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Re-identification via small-cohort segment combination (e.g., a rare expansion × rare guild-size combo could uniquely identify one guild even if each dimension alone clears 10) | Information Disclosure | 10-guild floor per segment (D-04), "Other" bucket merge, and explicitly raising the floor for any combined/cross-tabulated segment, per the phase's data-handling note |
| Secret leakage of `SUPABASE_ACCESS_TOKEN` into commits, logs, or chat/checkpoint output | Information Disclosure | Keychain-only retrieval, never printed to stdout, never placed in `.env.local` (matches the existing zero-Supabase-secrets-in-`.env.local` convention already documented for this project) |
| Arbitrary SQL execution surface with no query allowlist (the Management API endpoint will run a `DROP TABLE` exactly as readily as a `SELECT`) | Tampering / Elevation of Privilege | Runner only ever executes committed, code-reviewed `.sql` files; no dynamic query construction; a human reviews every `.sql` file before it ever touches prod |
| Self-serving structured data inflating trust signals | Spoofing (of authority) | No Review/AggregateRating schema (Phase 2 D-05 precedent extends here); only Article/Person JSON-LD, matching visible copy exactly |
| Accidental inclusion of `characters.name` / `guilds.name` in a query's SELECT list during debugging | Information Disclosure | Code-review checklist item: every `.sql` file's SELECT list is aggregates and join/group keys only, never a name column (Pitfall 4) |

## Sources

### Primary (HIGH confidence — read directly this session)
- `scripts/deploy-migrations.sh` — Management API auth pattern, endpoint shape, `run_sql()` implementation
- `scripts/analytics/pull-gsc.py`, `gsc_export.py`, `RUNBOOK.md` — Python stdlib convention, CSV-corruption precedent, provenance/reproducibility pattern
- `scripts/analytics/exports/README.md` — provenance-row convention for committed data artifacts
- `lib/database.types.ts` — table shapes for `guilds`, `guild_settings`, `loot_history`, `loot_submissions`, `raid_events`, `raid_tiers`, `expansions`, `characters`, `attendance_records`
- `supabase/migrations/20260827000000_guild_funnel_milestones.sql` — `guild_funnel_milestones` schema and migration date (load-bearing for Pitfall 1)
- `utils/analytics/funnel.ts` — funnel-milestone evaluation logic, `qualified_at`/`activated_at` stamping behavior, `ROSTER_THRESHOLD`/`LIST_THRESHOLD` constants
- `domain/scoring/defaults.ts`, `domain/scoring/attendance-score.ts`, `app/(app)/loot-management/components/SettingsModal.tsx` — `attendance_type` values and defaults (load-bearing for Pitfall 3)
- `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx`, `app/blog/page.tsx`, `app/about/page.tsx` — article layout, metadata, JSON-LD pattern
- `app/sitemap.ts` — sitemap entry structure
- `tsconfig.json` — `resolveJsonModule: true` confirmation
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` §"Product-data report brief and exact template" — working title, slug, meta description, recommended-dataset list, opening-copy and finding-format templates (quoted in full below)
- macOS Keychain — `security find-generic-password -s "Supabase CLI"` entry confirmed present this session (secret value not read or displayed)

### Secondary (MEDIUM confidence)
- A prior session's memory (`prod-sql-via-management-api.md`, 34 days old) — corroborated this session by independently re-reading `scripts/deploy-migrations.sh` and confirming the keychain entry still exists; the exact `-w` flag syntax was not re-run this session (see Assumption A1)

### Tertiary (LOW confidence)
- None used as the basis for a stated fact — every claim above is either read from code this session or explicitly tagged `[ASSUMED]` in the Assumptions Log.

### Sprint plan exact copy (quoted verbatim for planner use)

> Working title: `How WoW Classic Guilds Actually Run Loot in 2026: Data from {N} Guilds`
> Slug: `/research/wow-classic-loot-systems-2026`
> Meta description: `An anonymized look at how WoW Classic guilds use ranked lists, attendance, bad-luck protection, and officer judgment to distribute raid loot.`
>
> Opening copy: `Between {start date} and {end date}, {N} active guilds used LootList+ to manage {A} raid events and {L} loot awards across {R} raiders with approved lists. We analyzed aggregated, anonymized activity to see how Classic guilds balance wishlist rank, attendance, bad-luck protection, and officer judgment. No player or guild names are included in the dataset.` / `This is product usage data, not a survey of every WoW guild. It shows how guilds using a transparent, list-based system behave in practice.`
>
> Finding format: H2 `{Plain-English finding, not a vague chart title}` — `{One sentence with the number. One paragraph explaining what it means for an officer. One paragraph explaining limits or alternative interpretations.}`
>
> CTA: Heading `See how the same rules work with your roster.` / Body `Create a free guild, import your raiders, and compare the priority order before your next raid night.` / CTA `Create your guild free`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every tool/pattern (Python stdlib, Management API, `resolveJsonModule`, blog layout) was confirmed present and working in this exact repo this session, not assumed from training knowledge.
- Architecture: HIGH — the pipeline shape is locked by D-05/D-06/D-12 through D-15; this research only confirmed the mechanics are feasible with existing tools.
- Pitfalls: HIGH for Pitfalls 1, 2, 4, 5 (each grounded in a specific file read this session); MEDIUM for Pitfall 3 (grounded in code, but "what counts as genuinely weighting attendance" is ultimately a judgment call for the D-01/D-02 checkpoint, not a fact this research can settle).

**Research date:** 2026-09-03
**Valid until:** ~2026-09-24 (sprint window close) — this research is tied to a fixed dataset window (D-12) and a fixed sprint deadline; it does not need to survive past ship.

---

**Note on this research session's own data handling:** No production data was queried during this research. All schema findings above come from reading committed migration files, TypeScript type definitions, and application code — never from executing a SQL query against the live database. The actual aggregate-query execution happens at the D-01 checkpoint during plan execution, at which point the phase's data-handling note applies in full: aggregate measures only, no raw rows, no names, 10-guild floor, and the retention/compliance warning should be surfaced to the user before any prod-derived number is displayed in that checkpoint.
