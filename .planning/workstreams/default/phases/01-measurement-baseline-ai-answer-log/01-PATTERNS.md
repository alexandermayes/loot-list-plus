# Phase 1: Measurement Baseline & AI Answer Log - Pattern Map

**Mapped:** 2026-08-28
**Files analyzed:** 7 (2 modified, 5 new)
**Analogs found:** 5 / 7 (2 are genuinely net-new with no in-repo analog — flagged below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|----------------|
| `scripts/analytics/pull-gsc.py` (extend) | utility / CLI script | request-response (HTTP API call) + file-I/O (CSV write) | itself (existing file, extend in place) | exact |
| `scripts/analytics/gsc_clusters.py` | utility (pure function module) | transform | `scripts/analytics/pull-gsc.py`'s `show()`/module-level constants | role-match |
| `scripts/analytics/test_gsc_clusters.py` | test | transform (unit test) | none in-repo Python tests exist — use stdlib `unittest`, structural analog is Vitest `__tests__` convention from CLAUDE.md | no analog (see below) |
| `scripts/analytics/gsc-auth.py` (commit as-is, untracked) | utility / CLI script (one-time OAuth bootstrap) | event-driven (local HTTP loopback callback) | itself — already written, just needs `git add` | exact (no changes needed) |
| `scripts/analytics/exports/*.csv` (data artifacts) | config/data (committed export) | file-I/O (write-once, batch) | none — first committed data artifact in `scripts/analytics/` | no analog |
| `scripts/analytics/RUNBOOK.md` | documentation | n/a (static procedure doc) | none — first markdown doc in `scripts/analytics/` | no analog (see Shared Patterns: docstring style) |
| `scripts/analytics/ai-answer-log.csv` | data (append-only log) | file-I/O (structured CSV) | none — same as exports/*.csv | no analog |

## Pattern Assignments

### `scripts/analytics/pull-gsc.py` (utility script, request-response + file-I/O)

**Analog:** itself, `scripts/analytics/pull-posthog.py` (for CLI-arg-then-env-then-fetch convention)

**File header / docstring pattern** (pull-gsc.py lines 1-24):
```python
#!/usr/bin/env python3
"""
Pull Google Search Console performance data (queries + pages) via the Search
Analytics API, using a stored OAuth refresh token. ...

One-time setup (yours): ...

Then, any session:
    python3 scripts/analytics/pull-gsc.py [days]        # default 90

stdlib only — no node, no google client libraries.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 90
```
When adding `--start`/`--end`/`--csv`, switch the module-level `sys.argv` positional parse to `argparse` inside `main()` (no existing script uses `argparse` yet — this is the one new import besides `csv`). Keep the docstring's "stdlib only" line and usage example updated to show the new flags, matching the existing convention of a runnable one-liner in the docstring.

**Env loading pattern** (pull-gsc.py lines 36-44, identical in pull-posthog.py lines 27-35):
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
Do not change this — reuse verbatim, it is a duplicated-by-design convention across both existing scripts.

**API call pattern with error handling** (pull-gsc.py lines 47-77, 105-123):
```python
def get_access_token(cid, secret, refresh):
    data = urllib.parse.urlencode({...}).encode()
    req = urllib.request.Request(url, data=data, headers={...}, method="POST")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["access_token"]

# call site:
try:
    token = get_access_token(cid, secret, refresh)
except urllib.error.HTTPError as e:
    print(f"Token exchange failed ({e.code}): {e.read().decode('utf-8', 'ignore')}")
    sys.exit(1)
```
Same `try/except urllib.error.HTTPError` + `print` + `sys.exit(1)` shape wraps every network call in this file — replicate it around the new explicit-date-range `query()` calls.

**Date-range base dict, needs extension** (pull-gsc.py lines 103-111):
```python
end = date.today() - timedelta(days=3)  # GSC data lags ~2-3 days
start = end - timedelta(days=DAYS)
...
base = {"startDate": str(start), "endDate": str(end), "rowLimit": 1000, "dataState": "final"}
```
Per RESEARCH.md Pattern 1, add `--start`/`--end` args that override this computed `start`/`end` when provided — keep the trailing-N-days behavior as the default so the existing `python3 scripts/analytics/pull-gsc.py [days]` invocation still works unmodified.

**New: CSV export (RESEARCH.md Code Examples, no existing analog — `csv` module not yet imported anywhere in the repo's Python)**:
```python
import csv

def export_csv(rows, cluster_fn, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["query", "clicks", "impressions", "ctr", "position", "cluster"])
        for r in rows:
            key = r["keys"][0]
            w.writerow([key, r["clicks"], r["impressions"], r["ctr"], r["position"], cluster_fn(key)])
```
Add this alongside the existing `show()` function (lines 80-90) — `show()` stays for stdout/interactive use, `export_csv()` is additive, not a replacement. Follow the same `def name(rows, ...):` signature shape as `show(rows, dim_label)`.

---

### `scripts/analytics/gsc_clusters.py` (new pure module, transform)

**Analog:** No direct file analog exists (no `domain/`-style pure-function module exists in the Python scripts). Structurally mirror the module-level-constant + top-level-function shape already used in `pull-posthog.py`'s `QUERIES` dict (lines 50-69) and `pull-gsc.py`'s `DAYS` constant (line 33) — i.e., constants declared at module scope, uppercase, followed by plain functions with no classes.

**Pattern to follow** (from RESEARCH.md Pattern 2, verbatim keyword lists must come from the sprint plan, not paraphrased):
```python
CLUSTERS = {
    "brand": [...],
    "competitor": [...],
    "problem": [...],
    "expansion": [...],
}
PRECEDENCE = ["brand", "competitor", "problem", "expansion"]

def cluster_query(q: str) -> str:
    ql = q.lower()
    for cluster in PRECEDENCE:
        if any(kw in ql for kw in CLUSTERS[cluster]):
            return cluster
    return "unclustered"
```
Match the existing repo's function style: no type-hinted return docstrings elsewhere in these scripts, but every function does have a clear single responsibility and no side effects except the `main()` entry points — `cluster_query()` should be a pure function with zero I/O, matching `show()`'s formatting-only responsibility but returning a value instead of printing.

Add a module header docstring in the same voice as the other two scripts, e.g. "Pure keyword-based query clustering for GSC baseline segmentation. No I/O, no network — see pull-gsc.py for the caller. stdlib only."

---

### `scripts/analytics/test_gsc_clusters.py` (test, transform)

**No in-repo Python test analog** — this repo has zero existing `.py` test files; the only test convention documented in CLAUDE.md is Vitest/`__tests__` for TypeScript. Use plain stdlib `unittest.TestCase`, one test class, one method per precedence/overlap case named `test_<behavior>`, matching the TS repo's descriptive-test-name convention (`describe`/`it` phrasing) translated to `unittest` method names:
```python
import unittest
from gsc_clusters import cluster_query

class TestClusterQuery(unittest.TestCase):
    def test_brand_keyword_matches_brand(self):
        self.assertEqual(cluster_query("lootlist reviews"), "brand")

    def test_overlap_prefers_brand_over_expansion(self):
        self.assertEqual(cluster_query("classic loot list plus"), "brand")

    def test_overlap_prefers_expansion_over_problem_precedence_example(self):
        # e.g. "classic loot spreadsheet" — problem should win per PRECEDENCE (problem before expansion)
        self.assertEqual(cluster_query("classic loot spreadsheet"), "problem")

    def test_no_match_is_unclustered(self):
        self.assertEqual(cluster_query("random unrelated query"), "unclustered")

if __name__ == "__main__":
    unittest.main()
```
Run with `python3 -m unittest scripts/analytics/test_gsc_clusters.py -v` per RESEARCH.md's Validation Architecture — no config file, no pytest, no requirements.txt.

---

### `scripts/analytics/RUNBOOK.md` (documentation, no analog)

No existing markdown runbook exists anywhere in the repo outside `.claude/` command/workflow docs (which are a different genre — agent instructions, not human procedure docs). Voice/format should match the plain, direct, no-em-dash style already used in the three Python scripts' docstrings (short imperative sentences, numbered setup steps, a runnable command example). Structure per RESEARCH.md's Architecture Patterns:
- State the three AI surfaces explicitly (ChatGPT, Google AI Overviews/AI Mode, Claude — per CONTEXT.md D-01, not the researcher's earlier Perplexity assumption)
- Quote the six fixed prompts verbatim from RESEARCH.md/sprint plan — no paraphrasing
- Session-hygiene instructions per surface (clean/private, logged out)
- Reference the log schema columns so the runbook and `ai-answer-log.csv` stay in sync

**Placement constraint (critical, verified empirically):** must live at `scripts/analytics/RUNBOOK.md`, not `docs/` (fully gitignored) or `scripts/RUNBOOK.md` (matches `scripts/*.md` ignore rule — does not cross into `scripts/analytics/`).

---

### `scripts/analytics/exports/*.csv` and `scripts/analytics/ai-answer-log.csv` (data artifacts, no analog)

No committed CSV/data artifact exists yet in `scripts/analytics/`. Use the `csv.writer`/`csv.DictWriter` pattern shown above for `export_csv()` — header row first, one data row per record, no manual comma-joining (RESEARCH.md Anti-Patterns explicitly warns against hand-rolled `",".join(...)`). For `ai-answer-log.csv`, define the header once and treat the file as append-only:
```python
HEADER = ["date", "ai_surface", "prompt_id", "lootlist_appeared", "factually_correct", "cited_url", "competing_sources"]
```
Filename convention for exports should encode the date range and partial/complete status directly in the name, e.g. `gsc-baseline-cohort-2026-08-24_2026-08-30-PARTIAL-through-08-25.csv`, per RESEARCH.md Pitfall 1 — this is a naming convention, not a code pattern, so there is no code excerpt to copy, just the string-format rule to apply consistently.

---

## Shared Patterns

### stdlib-only import discipline
**Source:** `scripts/analytics/pull-gsc.py:1-24`, `scripts/analytics/gsc-auth.py:1-18`, `scripts/analytics/pull-posthog.py:1-18`
**Apply to:** every new/modified file in this phase
All three existing scripts open with a docstring line asserting "stdlib only" and never import a third-party package. No `requirements.txt` or venv exists anywhere in the repo. `gsc_clusters.py` and the `pull-gsc.py` extension must add only stdlib imports (`argparse`, `csv` — both stdlib, not yet used elsewhere but zero-install).

### `.env.local` secret handling — never print/log/export tokens
**Source:** `scripts/analytics/pull-gsc.py:94-101`, `scripts/analytics/gsc-auth.py:150-154`
**Apply to:** `pull-gsc.py` (extended), any new module that touches env vars
```python
if not (cid and secret and refresh):
    print("Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN in .env.local — see docstring.")
    sys.exit(1)
```
Never write `refresh`/`secret`/`token` values into any CSV, RUNBOOK.md, or print statement — consistent with the existing scripts, which check for presence but never echo values.

### Error handling — try/except HTTPError, print with status code, sys.exit(1)
**Source:** `scripts/analytics/pull-gsc.py:105-123`
**Apply to:** any new network call added to `pull-gsc.py`
```python
except urllib.error.HTTPError as e:
    print(f"... failed ({e.code}): {e.read().decode('utf-8', 'ignore')}")
    sys.exit(1)
```

### CLI arg parsing — currently sys.argv positional, migrate to argparse only where needed
**Source:** `scripts/analytics/pull-gsc.py:33`, `scripts/analytics/pull-posthog.py:24`
**Apply to:** `pull-gsc.py`'s extension for `--start`/`--end`/`--csv`
Existing convention is the simplest possible `sys.argv[1]` positional-with-default. RESEARCH.md's Pattern 1 introduces `argparse` as a net-new but necessary addition once optional named flags are required (positional-only args cannot express `--start`/`--end`/`--csv` cleanly) — this is a deliberate, justified deviation from the existing minimal-argv style, not an accidental one.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `scripts/analytics/RUNBOOK.md` | documentation | n/a | First markdown procedure doc in `scripts/analytics/`; no runbook genre exists elsewhere in the repo outside `.claude/` agent-instruction docs, which are a different genre and not a fair analog |
| `scripts/analytics/test_gsc_clusters.py` | test | transform | Zero existing Python test files in the repo; use stdlib `unittest` per RESEARCH.md's Validation Architecture, translating the TS repo's descriptive-test-name convention into `unittest` method names |
| `scripts/analytics/exports/*.csv`, `scripts/analytics/ai-answer-log.csv` | data | file-I/O | First committed data artifacts under `scripts/analytics/`; only the `csv.writer` code pattern (shown above, extracted from RESEARCH.md's Code Examples) transfers, not a file-level analog |

## Metadata

**Analog search scope:** `scripts/analytics/` (all 3 existing files read in full), `scripts/` (surveyed for other `.py`/test/runbook conventions — none found; all other files are `.ts`/`.js`/`.sql`/`.sh`, a different genre), repo root `.gitignore` (verified placement constraints)
**Files scanned:** 3 existing Python scripts read in full (`pull-gsc.py`, `gsc-auth.py`, `pull-posthog.py`); ~110 other `scripts/` files listed by name only (confirmed non-Python, non-analytics, not relevant)
**Pattern extraction date:** 2026-08-28
</content>
