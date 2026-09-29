# Phase 3: Anonymized Product-Data Report - Pattern Map

**Mapped:** 2026-09-03
**Files analyzed:** 8 (new) + 2 (modified)
**Analogs found:** 8 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `scripts/analytics/queries/wow-classic-loot-systems-2026/*.sql` | config (static SQL) | batch | `scripts/deploy-migrations.sh` (heredoc SQL sent to Management API) | role-match |
| `scripts/analytics/run-research-report.py` | service (offline runner) | batch/request-response (HTTP to Management API) | `scripts/analytics/pull-gsc.py` | exact |
| `scripts/analytics/test_run_research_report.py` | test | transform (pure logic) | `scripts/analytics/test_gsc_export.py` | exact |
| `scripts/analytics/exports/README.md` (or `public/research/README.md`) | config/doc | file-I/O | `scripts/analytics/exports/README.md` (existing) | exact — extend, don't reinvent |
| `public/research/wow-classic-loot-systems-2026-aggregates.json` | model (data artifact) | file-I/O | none (new artifact type); shape informed by `lib/database.types.ts` query results | no analog |
| `public/research/wow-classic-loot-systems-2026-aggregates.csv` | model (data artifact) | file-I/O | `scripts/analytics/gsc_export.py` (`export_csv`) | exact |
| `app/research/wow-classic-loot-systems-2026/page.tsx` | component (Server Component page) | request-response (build-time JSON import, no runtime DB call) | `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` | exact |
| `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` | test | request-response (render assertions) | none in repo (Wave 0 gap — no blog/landing page test exists) | no analog |
| `app/sitemap.ts` (modified) | route/config | CRUD (array append) | itself — existing array pattern | exact |
| `app/__tests__/sitemap.test.ts` | test | transform | none in repo (Wave 0 gap) | no analog |

## Pattern Assignments

### `scripts/analytics/run-research-report.py` (service, batch)

**Analog:** `scripts/analytics/pull-gsc.py` (structure/CLI/env) + `scripts/deploy-migrations.sh` (Management API auth mechanics)

**Module docstring + stdlib-only convention** (pull-gsc.py lines 1-26):
```python
#!/usr/bin/env python3
"""
Pull Google Search Console performance data ...
stdlib only — no node, no google client libraries.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

import gsc_clusters
import gsc_export
```
Copy this shape: stdlib-only imports, a docstring documenting one-time setup and usage examples (both trailing-window default and explicit `--start`/`--end` forms), and sibling-module imports (`gsc_export`-style) for the new `run-research-report.py`'s own helper modules (e.g., a `research_export.py` for CSV/JSON writing, mirroring `gsc_export.py`).

**Management API auth + POST pattern** (`scripts/deploy-migrations.sh` lines 1-39, and the Python equivalent already used in RESEARCH.md's Code Examples section):
```python
def get_access_token() -> str:
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
```
Never build `sql` from string interpolation — always read the full contents of one of the committed `.sql` files in `queries/wow-classic-loot-systems-2026/` and pass it verbatim (Pitfall 5 in RESEARCH.md).

**Env loading pattern** (pull-gsc.py lines 40-48):
```python
def load_env(path=".env.local"):
    env = dict(os.environ)
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env
```
Not directly needed here (no `.env.local` Supabase secrets per project convention — keychain only) but keep the `argparse` CLI convention pull-gsc.py uses for `--start`/`--end`/`--csv` flags; mirror those flag names for consistency (`--start 2026-06-01 --end 2026-08-31`).

**10-guild floor / "Other" bucket merge (D-04)** — no direct in-repo analog; write as one centralized pure function per RESEARCH.md's Don't-Hand-Roll table and Code Examples section:
```python
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
This function must be the single call site for every segmented breakdown before it reaches the checkpoint console or the artifact — never a per-finding ad hoc `if count < 10` check.

---

### `scripts/analytics/test_run_research_report.py` (test, transform)

**Analog:** `scripts/analytics/test_gsc_export.py`

**Test file structure** (lines 1-27):
```python
#!/usr/bin/env python3
"""
Unit tests for gsc_export.py: PARTIAL naming, CSV quoting, row order, and
path guards.

Run with:
    python3 -m unittest discover -s scripts/analytics -p 'test_gsc_export.py' -v

(`python3 -m unittest scripts/analytics/test_gsc_export.py` does not work
here because this file imports the sibling module `gsc_export` by bare
name; the discovery form puts scripts/analytics on sys.path first.)
"""
import csv
import os
import tempfile
import unittest

from gsc_export import (
    CSV_HEADER_PAGE,
    CSV_HEADER_QUERY,
    ...
)
```
Copy this exact docstring pattern (including the "why discovery, not direct invocation" note) and the sibling bare-name import convention. Test targets for the new file per RESEARCH.md's Validation Architecture: `apply_floor` (floor/merge behavior), the active-guild OR-definition, expansion multi-bucket assignment, and JSON artifact schema shape — all pure, no-network functions, following the `TestExportHelpers(unittest.TestCase)` class-per-module convention with one test method per behavior, e.g. `test_apply_floor_merges_segments_under_floor_into_other`.

**Round-trip / path-guard test style** (lines 130-142):
```python
def test_resolve_export_path_rejects_dotdot_segment(self):
    with self.assertRaises(ValueError):
        resolve_export_path("../escape.csv")
```
Apply the same "guard against a path/logic footgun with a dedicated test" style to any path-resolution helper the runner introduces for the JSON/CSV artifact.

---

### CSV artifact writer (part of `run-research-report.py` or a sibling `research_export.py`)

**Analog:** `scripts/analytics/gsc_export.py` (full file, 58 lines)

**CSV writer using `csv.writer`, never manual string-join** (lines 45-58):
```python
def export_csv(rows, path, dimension, cluster_fn=None):
    header = CSV_HEADER_QUERY if dimension == "query" else CSV_HEADER_PAGE
    count = 0
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for row in rows:
            key = row["keys"][0]
            values = [key, row["clicks"], row["impressions"], row["ctr"], row["position"]]
            if dimension == "query":
                values.append(cluster_fn(key) if cluster_fn else "unclustered")
            w.writerow(values)
            count += 1
    return count
```
This is the exact mitigation for the comma-corruption bug RESEARCH.md's Pitfall/Don't-Hand-Roll table cites (`RUNBOOK.md §9`). The new CSV export function should follow this shape: header constant, `csv.writer`, one row per aggregate, return row count for logging/checkpoint display.

**Path safety guard** (lines 17-25):
```python
def resolve_export_path(path):
    if ".." in path.split(os.sep):
        raise ValueError(f"refusing output path containing '..' segment: {path}")
    if os.sep not in path and (os.altsep is None or os.altsep not in path):
        path = os.path.join(EXPORTS_DIR, path)
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    return path
```
Reuse this guard shape if the artifact writer accepts any path input; swap `EXPORTS_DIR` for whichever location the planner locks in (`public/research/` per RESEARCH.md's Open Questions recommendation).

---

### Provenance README (extend, don't rewrite)

**Analog:** `scripts/analytics/exports/README.md` (full file, 66 lines)

**Provenance-row table pattern to replicate** (lines 29-35):
```markdown
## Provenance table

| File | Dimension | Requested window | True final-data end date | Row count | Reproducing command |
|------|-----------|-------------------|---------------------------|-----------|----------------------|
| `gsc-trend-query-2026-05-24_2026-08-23.csv` | query | 2026-05-24 to 2026-08-23 | 2026-08-23 (fully final) | 23 | `python3 scripts/analytics/pull-gsc.py --start ... --dimension query --csv ...` |
```
Every committed artifact for this phase (JSON + CSV) needs an equivalent row: file name, window (fixed `2026-06-01` to `2026-08-31` per D-12), row count, and the exact reproducing command (`python3 scripts/analytics/run-research-report.py --start 2026-06-01 --end 2026-08-31 ...`).

**Data-sensitivity closing note** (lines 60-66):
```markdown
## Data sensitivity

The committed data in this directory is aggregate ... It contains no player names, no guild
names, and no other personal or account-level information ...
```
Copy this closing-note pattern verbatim in spirit for the research artifact's own README/provenance doc — state explicitly that it is aggregate-only, 10-guild floor applied, no player or guild names, per this phase's data-handling mandate.

---

### `app/research/wow-classic-loot-systems-2026/page.tsx` (component, request-response)

**Analog:** `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` (full file, 427 lines)

**Imports** (lines 1-6):
```typescript
import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'
```
Copy this import set; `BlogRelatedPosts` may not apply to a research report (evaluate at plan time), but `LandingNav`/`LandingCTA`/`LandingFooter`/`BlogTracker` (with a new `slug`) should carry over unchanged.

**Metadata + self-canonical pattern** (lines 8-38):
```typescript
export const metadata: Metadata = {
  title: '...',
  description: '...',
  keywords: [...],
  alternates: {
    canonical: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
  openGraph: {
    title: '...',
    description: '...',
    type: 'article',
    publishedTime: '2026-XX-XXT00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
}
```
Working title, slug, and meta description come verbatim from the sprint plan quote in RESEARCH.md (`How WoW Classic Guilds Actually Run Loot in 2026: Data from {N} Guilds`, `/research/wow-classic-loot-systems-2026`, and the exact meta description string).

**Article + Person + BreadcrumbList JSON-LD (D-11, no Review/AggregateRating)** (lines 42-104):
```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '...',
  description: '...',
  datePublished: '...',
  dateModified: '...',
  author: {
    '@type': 'Person',
    '@id': 'https://www.getlootlist.com/about#creator',
    name: 'Zev',
    description: 'Creator of LootList+ and guild officer and raid lead',
    url: 'https://www.getlootlist.com/about',
  },
  publisher: {
    '@type': 'Organization',
    name: 'LootList+',
    url: 'https://www.getlootlist.com',
    logo: { '@type': 'ImageObject', url: 'https://www.getlootlist.com/lootlist-icon.svg' },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026' },
  wordCount: <n>,
  articleSection: 'Guild Management',
  keywords: [...],
}

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.getlootlist.com' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://www.getlootlist.com/blog' }, // change to a "Research" crumb if one exists, else drop to 2-level
    { '@type': 'ListItem', position: 3, name: '<headline>' },
  ],
}
```
Reuse the exact same `Person` `@id` (`https://www.getlootlist.com/about#creator`) — do not redefine it. Do NOT add Review/AggregateRating schema anywhere on this page (Phase 2 D-05 precedent, restated in RESEARCH.md's Anti-Patterns).

**Page body structure: header, byline, prose article body** (lines 106-153):
```tsx
export default function BlogPost() {
  return (
    <main className="bg-background overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #0f0e12 0%, #080808 40%)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <LandingNav />
      <article className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <BlogTracker slug="..." title="..." />
        <div className="max-w-3xl mx-auto">
          <nav className="mb-8 text-sm text-foreground-secondary">...</nav>
          <header className="mb-12">
            <p className="text-sm font-medium text-accent mb-3">Guide</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">...</h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">...</p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <span>By <a href="/about" className="...">Zev</a>, creator of LootList+</span>
              <span>&middot;</span>
              <time dateTime="...">...</time>
              <span>&middot;</span>
              <span>N min read</span>
            </div>
          </header>
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl ...">
            {/* content: opening copy, H2-per-finding, HTML tables, methodology section */}
          </div>
        </div>
      </article>
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
```
D-08/D-09 add: inline `<table>` markup and stat-callout `<div>`s (styled within the existing Tailwind design system, no new deps) go inside the same `prose` content block, one per finding, following the H2-claim → number-sentence → officer-meaning-paragraph → limits-paragraph structure (finding format template quoted verbatim in RESEARCH.md).

**Build-time JSON import (D-05)** — no analog in `app/blog/` (blog posts are hand-written prose, not data-driven); use RESEARCH.md's own verified pattern:
```typescript
import aggregates from '@/public/research/wow-classic-loot-systems-2026-aggregates.json'
// tsconfig.json already has "resolveJsonModule": true — verified
```
Render every number in the page body from this imported object; never compute or fetch a number at request time.

---

### `app/sitemap.ts` (modified, CRUD)

**Analog:** itself — existing flat array, one object per URL (lines 1-114)

**Entry shape to append** (mirrors blog-post entries, lines 84-88):
```typescript
{
  url: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  lastModified: new Date(2026, 8, /* ship day, 0-indexed month = Sep */),
  changeFrequency: 'monthly',
  priority: 0.9,
},
```
Before adding, grep `app/sitemap.ts` for the slug to confirm no duplicate exists (there is no dedup logic in this file today — EVID-03 requires exactly one entry). Use a literal `new Date(2026, 8, N)` construction like every other dated entry, never `new Date()`, so `lastModified` doesn't drift on every rebuild.

## Shared Patterns

### Management API SQL execution (no DB password, no service-role key)
**Source:** `scripts/deploy-migrations.sh` lines 20-39
**Apply to:** `run-research-report.py`'s query-execution function
```bash
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
The token always comes from the macOS Keychain (`security find-generic-password -s "Supabase CLI" -w`), never from `.env.local` (project-wide convention — zero Supabase secrets in `.env.local`).

### Article/Person/BreadcrumbList JSON-LD (no self-serving Review schema)
**Source:** `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` lines 42-104, `app/about/page.tsx` (Person `@id` origin)
**Apply to:** `app/research/wow-classic-loot-systems-2026/page.tsx`
Reuse the exact `Person` `@id` string and `Organization`/`logo` block; never add `Review`/`AggregateRating` (Phase 2 D-05 precedent).

### CSV writing via stdlib `csv` module
**Source:** `scripts/analytics/gsc_export.py` lines 45-58
**Apply to:** the aggregates CSV artifact writer
Never hand-build comma-joined strings — always `csv.writer`, one header constant, one row-writing loop.

### Provenance-row documentation for committed artifacts
**Source:** `scripts/analytics/exports/README.md` lines 29-35, 60-66
**Apply to:** whatever README documents the JSON/CSV artifacts for this phase (D-05/D-06 reproducibility requirement, EVID-02)
Table columns: File, window, row count, reproducing command; plus a closing "Data sensitivity" note stating aggregate-only, no names, 10-guild floor applied.

### Python unittest module structure
**Source:** `scripts/analytics/test_gsc_export.py` lines 1-27
**Apply to:** `scripts/analytics/test_run_research_report.py`
Docstring with the exact `python3 -m unittest discover -s scripts/analytics -p '<file>' -v` run command and the "why discovery form, not direct invocation" note; sibling bare-name imports; one `unittest.TestCase` subclass, one test method per behavior.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `public/research/wow-classic-loot-systems-2026-aggregates.json` | model (data artifact) | file-I/O | No prior committed, build-time-imported JSON data artifact exists in this repo; RESEARCH.md's own Code Examples/Pattern 2 section is the closest thing to a template — use `tsconfig.json`'s `resolveJsonModule: true` and design the schema per Claude's Discretion (CONTEXT.md) |
| `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` | test | request-response | No blog/landing page in this repo has ever been tested (RESEARCH.md Wave 0 gap) — establish the pattern fresh with Vitest + Testing Library, following the general component-test conventions used elsewhere in `app/components/**/__tests__/` for structure (render, query by role/text, assert) |
| `app/__tests__/sitemap.test.ts` | test | transform | `app/sitemap.ts` has never been tested (RESEARCH.md Wave 0 gap) — write a plain Vitest unit test importing the `sitemap()` function and asserting the new URL appears exactly once |
| `apply_floor` / 10-guild-floor merge logic | utility (pure function) | transform | No k-anonymity/small-cohort suppression utility exists anywhere in this codebase; write fresh per the Code Examples shape already given in RESEARCH.md, centralized as a single function, never per-finding ad hoc checks |

## Metadata

**Analog search scope:** `app/blog/`, `app/sitemap.ts`, `scripts/analytics/`, `scripts/deploy-migrations.sh`, `app/about/page.tsx` (Person schema source), `lib/database.types.ts` (schema reference only, not a code pattern)
**Files scanned:** ~15 (9 blog posts listed, 4 read/grepped directly, plus sitemap, deploy-migrations.sh, gsc_export.py, test_gsc_export.py, pull-gsc.py, exports/README.md)
**Pattern extraction date:** 2026-09-03
