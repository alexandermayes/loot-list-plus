# Phase 6: Week-4 Review & Next Bet - Pattern Map

**Mapped:** 2026-09-25
**Files analyzed:** 11 (new/modified)
**Analogs found:** 10 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scripts/analytics/run-cohort-query.py` | script / query-runner | request-response (HTTP to Management API) | `scripts/analytics/run-research-report.py` | role-match (same pattern, narrower purpose) |
| `scripts/analytics/test_run_cohort_query.py` | test | transform (pure assembly logic) | `scripts/analytics/test_research_report.py` | role-match |
| `scripts/analytics/queries/week-4-review/activated-cohort.sql` | config/query | batch (aggregate SQL) | `scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql` | exact (same header convention) |
| `scripts/analytics/queries/week-4-review/qualified-cohort.sql` | config/query | batch | `scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql` | exact (documents the same late-stamp pitfall) |
| `scripts/analytics/queries/week-4-review/cohort-denominator.sql` | config/query | batch | `scripts/analytics/queries/wow-classic-loot-systems-2026/05-expansion-distribution.sql` | role-match |
| AI-answer 6x3 grid script (e.g. `scripts/analytics/ai-answer-grid.py`) | script / report | transform (CSV group-by + aggregation) | `scripts/analytics/log-ai-answer.py` (its `read_rows()`) | role-match (read-side sibling of an append-only CSV tool) |
| `scripts/analytics/test_ai_answer_grid.py` | test | transform | `scripts/analytics/test_ai_answer_log.py` | exact (same importlib-by-path pattern needed for a hyphenated filename) |
| `scripts/analytics/log-ai-answer.py` (extend: `error_type` column) | script / CRUD (append) | event-driven / CRUD (append-only log) | itself (extend in place) | exact |
| `scripts/analytics/test_ai_answer_log.py` (extend) | test | transform | itself (extend in place) | exact |
| GSC threshold helper (e.g. `scripts/analytics/gsc_threshold.py`) | utility | transform (pure function over CSV rows) | `scripts/analytics/gsc_clusters.py` | role-match (pure, tested, imported by `pull-gsc.py`/`gsc_export.py`) |
| `scripts/analytics/test_gsc_threshold.py` | test | transform | `scripts/analytics/test_gsc_clusters.py` | exact |
| `scripts/analytics/pull-gsc.py` (extend: `--dimension page-query`) | script / CLI | request-response (HTTP to GSC API) | itself (extend in place) | exact |
| `scripts/analytics/gsc_export.py` (extend: `CSV_HEADER_PAGE_QUERY`, combined export) | utility | transform + file-I/O | itself (extend in place) | exact |
| `scripts/analytics/test_gsc_export.py` (extend) | test | transform | itself (extend in place) | exact |
| `scripts/analytics/pull-posthog.py` (extend: funnel/CTA HogQL queries) | script / CLI | request-response (HTTP to PostHog HogQL API) | itself (extend `QUERIES` dict in place) | exact |
| `scripts/analytics/exports/README.md` (add provenance rows) | docs / config | batch (manual table edit) | itself (Phase 1 provenance rows already present) | exact |
| `.planning/workstreams/default/phases/06-week-4-review-next-bet/06-REVIEW.md` | docs | transform (synthesis of all above) | none in-repo (new artifact type) | no analog — follow structure in RESEARCH.md's own recommendation |
| `.planning/todos/pending/<date>-<next-bet-slug>.md` | config / docs | CRUD (create one file) | `.planning/todos/pending/2026-08-28-fix-loot-list-query-cannibalization-changelog-vs-homepage.md` | exact |

## Pattern Assignments

### `scripts/analytics/run-cohort-query.py` (script, request-response)

**Analog:** `scripts/analytics/run-research-report.py`

**Module docstring / stdlib-only convention** (lines 1-31):
```python
#!/usr/bin/env python3
"""
Run the committed research-report queries for wow-classic-loot-systems-2026
against production via the Supabase Management API...
stdlib only -- no node, no google client libraries, no pip packages
(argparse, csv, decimal, json, os, subprocess, sys, urllib.request,
urllib.error, unittest).
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
```
Copy this docstring shape (one-time setup note, stdlib-only line) and import list. The new script should NOT `from run_research_report import ...` (hyphenated filename, not importable as a module) — instead copy or share `get_access_token()`/`run_sql()` verbatim, and `from research_report import assert_window_literals, assert_no_forbidden_columns, parse_query_header` (that module has no hyphen and is import-safe, no network/file I/O at import time).

**Keychain token + Management API call** (verbatim, reuse as-is):
```python
# Source: scripts/analytics/run-research-report.py:107-113
def get_access_token() -> str:
    return subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"]
    ).decode().strip()

def run_sql(project_ref: str, token: str, sql: str):
    req = urllib.request.Request(
        MANAGEMENT_API.format(ref=project_ref),
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.7.1",   # required: default urllib UA is blocked by
                                            # Cloudflare (HTTP 403, error code 1010)
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"Management API error (HTTP {e.code}): {body}") from None
```
`DEFAULT_PROJECT_REF = "zjnhjstbqekudlsozsvi"` (`run-research-report.py:76`) — reuse this constant.

**Query-header / guard functions** (reuse from `research_report.py`, do not duplicate):
```python
# Source: scripts/analytics/research_report.py:114-141
def assert_window_literals(sql_text, path):
    """D-12 reproducibility guard: raises ValueError unless both
    WINDOW_START and WINDOW_END appear literally in the SQL body."""
    missing = [w for w in (WINDOW_START, WINDOW_END) if w not in sql_text]
    if missing:
        raise ValueError(...)

def assert_no_forbidden_columns(sql_text, path):
    """T-03-01 guard: raises ValueError naming the offending token if any
    entry of FORBIDDEN_SQL_TOKENS appears in the (lowercased) SQL text."""
    lowered = sql_text.lower()
    for token in FORBIDDEN_SQL_TOKENS:
        if token in lowered:
            raise ValueError(...)
```
Note: `WINDOW_START`/`WINDOW_END` and `FORBIDDEN_SQL_TOKENS` are module constants scoped to the Phase 3 report's own window (2026-06-01..2026-08-31). The new script needs **its own** window-literal guard for the two Phase 6 cohort weeks (2026-08-24/2026-08-30 baseline, 2026-09-18/2026-09-24 week-4) — copy the *function shape*, define new constants, don't import the Phase 3 constants.

**Aggregate-only output, no per-guild rows.** Follow `run-research-report.py`'s convention of writing JSON/CSV under `scripts/analytics/exports/`, never per-row identity data (see forbidden-token guard above).

---

### `.sql` files under `scripts/analytics/queries/week-4-review/` (config, batch)

**Analog:** `scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql` and `06-funnel-cohort-coverage.sql`

**Header convention** (from `parse_query_header()` in `research_report.py`): every `.sql` file starts with a `key: value` header block (required keys include `columns`), parsed line-by-line before the `-- SQL body` — read `research_report.py`'s `REQUIRED_HEADER_KEYS` and `parse_query_header()` for the exact key set and copy that header shape into each new file. `06-funnel-cohort-coverage.sql` is the direct precedent for documenting the late-stamp pitfall this phase's cohort queries must avoid (per D-02); read it for the comment style used to explain why raw timestamps aren't trustworthy.

**Cohort reconstruction SQL** (proposed by RESEARCH.md, use as the literal starting point for `activated-cohort.sql`):
```sql
-- activated_by_day7(guild_id) :=
--   (SELECT COUNT(DISTINCT ls.character_id) FROM loot_submissions ls
--    WHERE ls.guild_id = g.id AND ls.status = 'approved'
--      AND COALESCE(ls.reviewed_at, ls.submitted_at) <= g.created_at + INTERVAL '7 days') >= 5
--   AND (
--     EXISTS (SELECT 1 FROM attendance_records ar JOIN raid_events re ON re.id = ar.raid_event_id
--             WHERE re.guild_id = g.id AND re.raid_date <= (g.created_at + INTERVAL '7 days')::date)
--     OR EXISTS (SELECT 1 FROM loot_history lh
--                WHERE lh.guild_id = g.id AND lh.awarded_date <= (g.created_at + INTERVAL '7 days')::date)
--   )
```
Never add `AND attended = true` to the raid-attendance check — the live evaluator (`utils/analytics/funnel.ts:95-99`) does an existence-only check, no attended filter.

---

### AI-answer 6x3 grid script (transform, new file)

**Analog:** `scripts/analytics/log-ai-answer.py` (read-side conventions: `HEADER`, `SURFACES`, `PROMPT_IDS`, `read_rows()`)

**Read the append-only log without mutating it** (lines 130-139):
```python
def read_rows(log_path):
    """Return every data row in log_path, in append (file) order.

    The log is append only: two cells with the same date, surface, and
    prompt id are two separate records, not a collision, because a
    legitimate re-run of a cell must remain visible rather than quietly
    replacing the first result. Never sorts, deduplicates, or rewrites.
    """
    with open(log_path, newline="") as f:
        return list(csv.DictReader(f))
```
The new grid script should import `read_rows`, `HEADER`, `SURFACES`, `PROMPT_IDS` from `log-ai-answer.py` via the same `importlib.util.spec_from_file_location` trick `test_ai_answer_log.py` already uses (hyphenated filename, not a plain-name-importable module) — see the Testing pattern below.

**Grouping/aggregation logic:** filter rows by `date == "2026-08-28"` (baseline) vs. the week-4 date, group by `(ai_surface, prompt_id)`, then apply D-07: a prompt "returns LootList+ correctly" when `>= 2` of 3 surfaces have `lootlist_appeared == "yes" AND factually_correct == "yes"` (do not count `"partial"`).

---

### `scripts/analytics/log-ai-answer.py` (extend in place — `error_type` column, CRUD/append)

**Current schema, vocabulary-check pattern, and append discipline** (lines 23-99):
```python
HEADER = [
    "date", "ai_surface", "prompt_id", "lootlist_appeared",
    "factually_correct", "cited_url", "competing_sources", "notes",
]
SURFACES = ["chatgpt", "google-ai-overviews", "claude"]
PROMPT_IDS = ["P1", "P2", "P3", "P4", "P5", "P6"]
APPEARED_VALUES = ["yes", "no"]
CORRECT_VALUES = ["yes", "no", "partial", "n/a"]

def validate_row(row):
    """Return a list of human readable problems with row, empty when valid."""
    problems = []
    for field in REQUIRED_FIELDS:
        if not row.get(field):
            problems.append(f"{field} is required and cannot be empty")
    surface = row.get("ai_surface")
    if surface and surface not in SURFACES:
        problems.append(f"ai_surface must be one of {SURFACES}, got {surface!r}")
    ...
```
**Extension pattern (D-08):** add `"error_type"` as a new *optional* trailing key in `HEADER` (default `""`), add an `ERROR_TYPES` vocabulary list (e.g. `not_mentioned`, `wrong_price_or_plan`, `outdated_feature_claim`, `wrong_category`, `other`) mirroring `SURFACES`/`APPEARED_VALUES`, and add one more `if error_type and error_type not in ERROR_TYPES:` block in `validate_row`, exactly matching the existing vocabulary-check shape above. Because `append_row()` does `[row.get(column, "") for column in HEADER]` (line 125), this is safe for new rows without touching the writer. The **existing header row already written to `ai-answer-log.csv`** needs a one-line manual edit to add `error_type`, or old rows read via `csv.DictReader` will misalign — call this out explicitly as a migration step in the plan.

**CLI flag pattern to copy** (lines 142-170): add `parser.add_argument("--error-type", default="", dest="error_type", help="...")` following the exact shape of `--cited-url`/`--competing-sources`.

---

### GSC threshold helper (utility, new file — e.g. `gsc_threshold.py`)

**Analog:** `scripts/analytics/gsc_clusters.py` (pure function, no network, imported by `pull-gsc.py`/`gsc_export.py`, tested by `test_gsc_clusters.py`)

Follow the same shape: a single pure function taking parsed GSC rows (dicts with `position`, `ctr`, `impressions` keys) restricted to the position 4-20 band, returning the band's median impression count and median CTR, then a boolean predicate `meets_threshold(row, median_impressions, median_ctr)`. This directly implements D-11's rule:
> "meaningful impressions" = at or above the band's own median impression count; "weak CTR" = below the band's own median CTR.

Write `test_gsc_threshold.py` following `test_gsc_export.py`'s structure (see below) — pure input/output assertions, no I/O, no network.

---

### `scripts/analytics/pull-gsc.py` (extend in place — `--dimension page-query`)

**Current CLI dimension choice and query/export wiring** (verified structure): `--dimension` is `choices=["query", "page"]` (pull-gsc.py:102); `query()` already accepts an arbitrary `dimensions` list, and `write_export()` calls it with `{**base, "dimensions": [args.dimension]}` (pull-gsc.py:68-81).

**Extension:** add `"page-query"` to the `choices` list, and when selected pass `dimensions: ["page", "query"]` to the same `query()` call, writing rows with both keys populated. Explicit `--start`/`--end` are already required by this script (not relative windows) — reuse as-is for D-12's Aug 24-Sep 24 sprint window.

---

### `scripts/analytics/gsc_export.py` (extend in place — combined page+query CSV header)

**Current header constants and `export_csv` dimension branch** (lines 1-58, read in full):
```python
CSV_HEADER_QUERY = ["query", "clicks", "impressions", "ctr", "position", "cluster"]
CSV_HEADER_PAGE = ["page", "clicks", "impressions", "ctr", "position"]
...
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
**Extension:** add `CSV_HEADER_PAGE_QUERY = ["page", "query", "clicks", "impressions", "ctr", "position", "cluster"]` and a branch in `export_csv` for `dimension == "page-query"` that reads `row["keys"][0]` (page) and `row["keys"][1]` (query) — GSC's combined-dimension response returns a `keys` list of length 2 in dimension order. Also extend `partial_suffix_path` usage/filenames to follow the `exports/README.md` naming convention (`gsc-<kind>-<dimension>-<start>_<end>[-PARTIAL-...]`).

**Test pattern to extend:** `test_gsc_export.py` uses `unittest`, imports helpers directly by name (`from gsc_export import CSV_HEADER_PAGE, CSV_HEADER_QUERY, ...`), and is run via `python3 -m unittest discover -s scripts/analytics -p 'test_gsc_export.py' -v` since discovery is required for bare-name sibling imports. Add `CSV_HEADER_PAGE_QUERY` cases following the existing `test_partial_suffix_path_*` / `test_max_date_*` naming style.

---

### `scripts/analytics/pull-posthog.py` (extend in place — funnel/CTA HogQL queries)

**Current structure — env loading, HogQL POST, `QUERIES` dict** (lines 1-96, read in full):
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

def hogql(host, project, key, query):
    body = json.dumps({"query": {"kind": "HogQLQuery", "query": query}}).encode()
    req = urllib.request.Request(
        f"{host}/api/projects/{project}/query/",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

QUERIES = {
    "Top pages (pageviews)": f"""...""",
    "Top referrers": f"""...""",
    "Top entry (landing) pages": f"""...""",
}
```
**Extension pattern (D-09):** add new entries to `QUERIES` (or a second dict, e.g. `FUNNEL_QUERIES`) for (a) the CTA/landing funnel — query `events` filtered by `distinct_id`/`person_id` for `landing_cta_clicked`, `guild_creation_started`, `guild_creation_completed`, `onboarding_viewed`, `onboarding_guild_joined` — and (b) the guild-activation funnel — query using `groups.guild` (or equivalent HogQL group-column syntax, confirm live) for `guild_qualified`, `first_raid_recorded`, `first_loot_awarded`, `guild_activated`. **Never** filter or `UNION` these two sets on the same `distinct_id` column — see `utils/analytics/funnel.ts:171` and `utils/analytics/server.ts:63-72` for the identity-space split (milestone events use `distinctId: "guild:${guildId}"` + `groups: {guild: guildId}`; CTA events use the browser's real distinct_id via `trackClientEvent`). This script has no existing test file (network-calling glue code) — that's consistent with repo convention (`pull-gsc.py`, `gsc-auth.py` also untested); don't add one, just extend `QUERIES`/`main()` in the same style.

**Env var check pattern to reuse** (lines 77-79):
```python
if not key or not project:
    print("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID in .env.local — see the docstring.")
    sys.exit(1)
```
Never read/print raw `.env.local` contents elsewhere — this is the only place the script touches the file, and it never echoes the key value.

---

### `scripts/analytics/exports/README.md` (extend — provenance rows)

**Analog:** the file's own existing convention (self-referential — extend in place)

**Filename convention and provenance table row shape** (verbatim, lines 8-40):
```
gsc-<kind>-<dimension>-<start>_<end>[-PARTIAL-through-<true-end-date>].csv
```
```markdown
| File | Dimension | Requested window | True final-data end date | Row count | Reproducing command |
|------|-----------|-------------------|---------------------------|-----------|----------------------|
| `gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv` | query | 2026-08-24 to 2026-08-30 | 2026-08-30 (fully final) | 6 | `python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-08-30 --dimension query --csv gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv` |
```
Add one row per new committed export (sprint-window GSC pulls, cohort SQL outputs, PostHog funnel outputs), each with the exact reproducing command. Follow the "Data sensitivity" section's closing pattern too — state explicitly that the new export contains no player/guild names, matching:
```markdown
## Data sensitivity

The committed data in this directory is aggregate Search Console query and page
performance for one property (getlootlist.com). It contains no player names, no guild
names, and no other personal or account-level information...
```
If a re-pull supersedes an earlier partial file, follow the "cohort re-pull" section's narrative style (state original partial pull date, gap, re-pull date and plan/task id, and that the superseded file was removed from the repo).

---

### `.planning/todos/pending/<date>-<slug>.md` (new file, CRUD/create)

**Analog:** `.planning/todos/pending/2026-08-28-fix-loot-list-query-cannibalization-changelog-vs-homepage.md`

**Full frontmatter + body shape** (verbatim, all 21 lines):
```markdown
---
created: 2026-08-28T23:39:47.318Z
title: Fix "loot list" query cannibalization (changelog vs homepage)
area: seo
severity: minor
files:
  - app/changelog/
  - scripts/analytics/exports/gsc-trend-query-2026-05-24_2026-08-23.csv
  - scripts/analytics/exports/gsc-trend-page-2026-05-24_2026-08-23.csv
---

## Problem

The committed GSC baseline (May 24 to Aug 23, 2026) shows the top generic query "loot list" earned 597 impressions (59% of all site impressions) at position 7.3 with only 1.0% CTR, and the page soaking up those impressions is /changelog (514 impressions, position 12.4, 0.19% CTR), not the homepage. ...

## Solution

Phase 2 (Checkable Conversion Copy) scope: retitle/re-meta the changelog page so it stops competing for the generic query ...
```
Use this exact shape for the approved next-bet todo: `created` ISO timestamp, `title`, `area: seo` (or `content`), `severity`, `files:` list pointing at the target route, `## Problem` (with the supporting evidence: queries/impressions/CTR, AI-answer error citations, funnel drop-off point) and `## Solution` (the recommended approach). No em dashes in the body copy (D-14 copy-voice rule). Never name a guild or include a `guild_id` anywhere in the todo body.

---

## Shared Patterns

### Stdlib-only Python, no new dependencies
**Source:** every file's docstring under `scripts/analytics/` (`run-research-report.py:29-31`, `pull-gsc.py`, `pull-posthog.py:17`, `log-ai-answer.py:15`)
**Apply to:** every new/extended script in this phase.
```python
"""
stdlib only -- no node, no google client libraries, no pip packages.
"""
```

### Management API auth via macOS Keychain (never `.env.local` Supabase keys)
**Source:** `scripts/analytics/run-research-report.py:107-127`
**Apply to:** `run-cohort-query.py` only (the sole file in this phase reading production DB rows).
```python
def get_access_token() -> str:
    return subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"]
    ).decode().strip()
```

### Query-header + window-literal + forbidden-column guards
**Source:** `scripts/analytics/research_report.py:100-141` (`parse_query_header`, `assert_window_literals`, `assert_no_forbidden_columns`)
**Apply to:** every new `.sql` file under `scripts/analytics/queries/week-4-review/`.

### Vocabulary-checked, append-only CSV logs with `csv.writer`/`csv.DictReader` (never hand-edited or comma-joined)
**Source:** `scripts/analytics/log-ai-answer.py:60-139`
**Apply to:** the `error_type` extension and any script that reads `ai-answer-log.csv`.

### Explicit `--start`/`--end` dates, never relative windows, for anything touching D-12's sprint window
**Source:** `scripts/analytics/pull-gsc.py` CLI shape (`--start`/`--end` required, `coverage_end()` discovers true final-data date live rather than assuming the 2-3 day lag)
**Apply to:** every GSC pull and the cohort SQL's window literals.

### Provenance rows for every committed export, following the exact filename convention
**Source:** `scripts/analytics/exports/README.md:8-40`
**Apply to:** every new file written to `scripts/analytics/exports/`.

### Never mix PostHog identity spaces (guild-group vs. person/distinct_id)
**Source:** `utils/analytics/funnel.ts:171`, `utils/analytics/server.ts:63-72`
**Apply to:** the `pull-posthog.py` funnel/CTA extension (D-09).

### Test discovery convention for hyphenated script filenames
**Source:** `scripts/analytics/test_ai_answer_log.py:1-29` (`importlib.util.spec_from_file_location`)
**Apply to:** any new test file for a script whose filename contains a hyphen (`run-cohort-query.py`, `pull-gsc.py`, `pull-posthog.py`, `log-ai-answer.py`).
```python
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_PATH = os.path.join(_THIS_DIR, "log-ai-answer.py")
_spec = importlib.util.spec_from_file_location("log_ai_answer", _MODULE_PATH)
log_ai_answer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(log_ai_answer)
```
Run via: `python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v`

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `06-REVIEW.md` | docs | transform (synthesis) | No prior internal (non-published) review document exists in this repo; RESEARCH.md itself proposes structure (activated/qualified verdict, GSC threshold rule stated before candidates, 6x3 grid, ranking rubric, checkpoint:decision). Use RESEARCH.md's "Next-Bet Inputs" and "D-02...Reproducibility Verdict" sections as the content model, not a code analog. |

## Metadata

**Analog search scope:** `scripts/analytics/` (all files and tests), `scripts/analytics/queries/wow-classic-loot-systems-2026/`, `scripts/analytics/exports/README.md`, `.planning/todos/pending/`, `utils/analytics/funnel.ts`, `utils/analytics/server.ts`
**Files scanned:** `run-research-report.py`, `research_report.py`, `pull-gsc.py`, `gsc_export.py`, `gsc_clusters.py`, `pull-posthog.py`, `log-ai-answer.py`, `test_ai_answer_log.py`, `test_gsc_export.py`, `exports/README.md`, 8 pending todo files (1 read in full), `01-sample-definition.sql`/`06-funnel-cohort-coverage.sql` headers
**Pattern extraction date:** 2026-09-25
