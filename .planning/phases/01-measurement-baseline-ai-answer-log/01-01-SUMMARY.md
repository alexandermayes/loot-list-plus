---
phase: 01-measurement-baseline-ai-answer-log
plan: 01
subsystem: analytics-instrumentation
tags: [python, gsc, search-console, csv, clustering, unittest, stdlib]

requires: []
provides:
  - "scripts/analytics/gsc_clusters.py: pure keyword clustering (CLUSTERS, PRECEDENCE, CLUSTER_NAMES, cluster_query())"
  - "scripts/analytics/gsc_export.py: CSV export helpers (resolve_export_path, partial_suffix_path, max_date, export_csv)"
  - "scripts/analytics/pull-gsc.py: --start/--end/--dimension/--csv CLI surface over the existing Search Analytics pull, with honest PARTIAL coverage labelling"
  - "scripts/analytics/gsc-auth.py tracked in git (one-time OAuth bootstrap, previously untracked)"
affects: ["01-02 (AI answer log runbook)", "01-03 (committed exports)", "01-05 (replacement cohort export)", "Phase 6 (report reads these exports)"]

actuals:
  tokens: 6423
  tasks: 3
  commits: 3

tech-stack:
  added: [argparse, csv (stdlib, first use in this repo's Python)]
  patterns:
    - "Pure transform module (gsc_clusters.py) with no I/O, mirroring domain/ layer conventions from the TS codebase"
    - "csv.writer/csv.DictReader only for CSV I/O, never hand-rolled string joining"
    - "Precompiled regex word-boundary guards ((?<![a-z0-9])kw(?![a-z0-9])) instead of str.split word boundaries, to correctly handle lootlist+ and short keywords like tmb/dkp/cata/mop"
    - "stdlib unittest with discovery-form invocation (python3 -m unittest discover -s scripts/analytics -p 'test_*.py') documented in each test module's docstring, since sibling-module bare imports break direct-path invocation"

key-files:
  created:
    - scripts/analytics/gsc_clusters.py
    - scripts/analytics/gsc_export.py
    - scripts/analytics/test_gsc_clusters.py
    - scripts/analytics/test_gsc_export.py
  modified:
    - scripts/analytics/pull-gsc.py
    - scripts/analytics/gsc-auth.py (newly tracked, content unchanged)

key-decisions:
  - "Cluster overlap precedence fixed as brand > competitor > problem > expansion (planner choice per RESEARCH.md Assumption A2, recorded as a code comment in gsc_clusters.py)"
  - "PARTIAL coverage labelling derived from a live second date-dimension query (coverage_end()), never assumed from the run date, so the filename always states true data coverage"
  - "resolve_export_path's '..' rejection is a local-operator hygiene guard (threat T-01-02), not a security boundary"

patterns-established:
  - "New stdlib-only Python analytics scripts follow: module docstring ending in 'stdlib only', presence-only credential checks, try/except urllib.error.HTTPError + sys.exit(1) around every network call"

requirements-completed: [MEAS-01]

coverage:
  - id: D1
    description: "Pure keyword clustering module (gsc_clusters.py): four clusters transcribed verbatim from the sprint plan, fixed overlap precedence, normalisation (case, typographic apostrophe, whitespace), word-boundary-safe short-keyword matching, total function that never raises"
    requirement: "MEAS-01"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_gsc_clusters.py::TestClusterQuery (17 tests: all four clusters, full CLUSTERS keyword iteration, three overlap precedence pairs, case insensitivity, typographic apostrophe, short-keyword word-boundary guard, None/empty/whitespace degenerate input, CLUSTER_NAMES membership)"
        status: pass
    human_judgment: false
  - id: D2
    description: "CSV export helpers (gsc_export.py): path resolution with '..' rejection and EXPORTS_DIR default, PARTIAL coverage naming for short/no-data windows, max_date over a date-dimension response, and quoted CSV writing preserving row order"
    requirement: "MEAS-01"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_gsc_export.py::TestExportHelpers (13 tests: partial_suffix_path unchanged/through/no-data cases, max_date empty/out-of-order, query vs page header selection, comma+quote round trip via csv.DictReader, row-order preservation, empty-row count, resolve_export_path bare/explicit/'..' cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "pull-gsc.py extended with --start/--end/--dimension/--csv, coverage_end() live final-data check, write_export() wiring, with the pre-existing trailing-window stdout report left unchanged"
    requirement: "MEAS-01"
    verification:
      - kind: e2e
        ref: "python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-08-25 --dimension query --csv <tmp>.csv — exits 0, last line 'wrote: <path>', header exactly 'query,clicks,impressions,ctr,position,cluster', all cluster values in the closed five-value set (re-run in this session, still passing); plus invalid-month and --start-without---end negative cases exit non-zero as required"
        status: pass
      - kind: manual_procedural
        ref: "Task 1 tracer feedback checkpoint (type=checkpoint:human-verify, gate=blocking) presented the CLI flag contract and the query,clicks,impressions,ctr,position,cluster column order for sign-off before expansion tasks ran"
        status: pass
    human_judgment: true
    rationale: "This deliverable's flag names and column order become a fixed contract that committed exports and the Phase 6 report both read (reversibility: costly). The plan required explicit human sign-off at a tracer checkpoint before expansion, not just automated verification. The user responded 'approved' to that checkpoint; recording human_judgment: true documents that the sign-off, not just the passing command, is what closed this deliverable."
  - id: D4
    description: "gsc-auth.py (one-time OAuth bootstrap) brought under version control with no content changes, confirmed to contain only environment-variable names and no literal credential values"
    requirement: "MEAS-01"
    verification:
      - kind: unit
        ref: "git ls-files --error-unmatch scripts/analytics/gsc-auth.py (exits 0); grep -rn 'GOCSPX|apps.googleusercontent.com' scripts/analytics/gsc-auth.py (returns only variable-name/message text, no literal secret)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-28
status: complete
---

# Phase 01 Plan 01: GSC Clustered-Export Instrument Summary

**Extended `pull-gsc.py` with an explicit-window `--start`/`--end`/`--dimension`/`--csv` CLI, live PARTIAL coverage labelling, and a keyword-clustering pipeline (`gsc_clusters.py` + `gsc_export.py`), pinned by 30 passing stdlib unittest tests with zero network access.**

## Performance
- **Duration:** Task 1 ran in a prior session (tracer, committed `d953dbd`); this session executed Tasks 2-3 and close-out, ~25 min
- **Started (this session):** 2026-08-28T21:xx (continuation from approved tracer checkpoint)
- **Completed:** 2026-08-28
- **Tasks:** 3/3 (Task 1 verified present from prior session, not redone)
- **Files modified:** 6 (2 new modules, 2 new test modules, 1 extended script, 1 newly tracked script)

## Accomplishments
- `gsc_clusters.py`: a pure, total, five-value clustering function (`brand`/`competitor`/`problem`/`expansion`/`unclustered`) with fixed overlap precedence, case/apostrophe normalisation, and word-boundary-safe short-keyword matching (`tmb`, `dkp`, `cata`, `mop` no longer false-match inside longer words)
- `gsc_export.py`: path resolution, honest PARTIAL-coverage filename suffixing driven by a live second Search Console query rather than an assumption, and `csv.writer`-only export preserving row order
- `pull-gsc.py`: explicit historical windows (`--start`/`--end`) now coexist with the original trailing-N-days invocation with zero behaviour change to the latter
- `gsc-auth.py`, the only record of how the OAuth credentials were minted, is now tracked in git
- 30 unit tests (17 clustering + 13 export helper) run offline in ~0.07s and all pass
- The tracer feedback checkpoint (Task 1's live end-to-end pull, CLI flag names, and CSV column order) was presented to the user and approved before Tasks 2-3 ran

## Task Commits
1. **Task 1: End-to-end clustered export for one explicit window (tracer)** - `d953dbd` (feat) — completed in prior session
2. **Task 2: Clustering unit tests covering precedence, overlap, and degenerate input** - `6eaf779` (test)
3. **Task 3: Export helper unit tests for PARTIAL naming, quoting, and row order** - `04e38ff` (test)

**Plan metadata:** (recorded after this summary commits)

## Files Created/Modified
- `scripts/analytics/gsc_clusters.py` - pure keyword clustering module; no changes needed in Tasks 2-3, all 17 tests passed against the Task 1 implementation as written
- `scripts/analytics/gsc_export.py` - CSV export helpers; no changes needed in Tasks 2-3, all 13 tests passed against the Task 1 implementation as written
- `scripts/analytics/test_gsc_clusters.py` - 17 tests: cluster reachability, full-keyword-list iteration, three overlap precedence pairs, case insensitivity, typographic apostrophe, short-keyword word-boundary guard, degenerate input, CLUSTER_NAMES membership
- `scripts/analytics/test_gsc_export.py` - 13 tests: PARTIAL naming (unchanged/through/no-data), max_date ordering, query-vs-page header selection, comma+quote CSV round trip, row-order preservation, empty-row count, resolve_export_path bare/explicit/`..` cases
- `scripts/analytics/pull-gsc.py` - unchanged in this session (extended in Task 1); re-verified still correct
- `scripts/analytics/gsc-auth.py` - unchanged in this session (tracked in Task 1); re-verified still tracked with no literal credential values

## Decisions Made
None new in this session — Tasks 2-3 wrote tests against the Task 1 implementation and it satisfied every behaviour on the first run, so no `gsc_clusters.py` or `gsc_export.py` code changes were required (no GREEN-phase fix commit exists because none was needed).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written for Tasks 2 and 3.

**One self-correction during RED phase (not a deviation, expected TDD behavior):** the first draft of `test_competitor_keyword_matches_competitor` used the query "thatsmybis vs lootlist", which contains both a competitor keyword and a brand keyword — by the fixed precedence (brand before competitor) this correctly resolves to `brand`, not `competitor`. The test's own expectation was wrong, not the module; fixed the test query to "thatsmybis addon reviews" before it was committed, per the plan's explicit instruction not to relax a test to make it pass while re-checking whether the test itself encoded a wrong expectation.

**Total deviations:** 0 auto-fixed. **Impact:** none — Task 1's tracer implementation of `gsc_clusters.py` and `gsc_export.py` was already fully correct against every behavior the plan specified for Tasks 2 and 3.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. The GSC OAuth credentials were already restored and verified in a prior session (see STATE.md).

## Next Phase Readiness
Ready. MEAS-01's tooling half is complete: any explicit historical window can be exported, clustered, and honestly labelled; the clustering rule and precedence live in version control with tests; the one-time OAuth bootstrap is tracked; the pre-existing trailing-window invocation is unregressed. Plan 01-02 (AI answer log) and 01-03 (committed exports) can proceed — 01-03 will use this plan's CLI directly to produce the Aug 24-30 baseline cohort export.

---
*Phase: 01-measurement-baseline-ai-answer-log*
*Completed: 2026-08-28*

## Self-Check: PASSED

- `scripts/analytics/gsc_clusters.py` — FOUND
- `scripts/analytics/gsc_export.py` — FOUND
- `scripts/analytics/test_gsc_clusters.py` — FOUND
- `scripts/analytics/test_gsc_export.py` — FOUND
- `git log --oneline --all | grep d953dbd` — FOUND (Task 1, prior session)
- `git log --oneline --all | grep 6eaf779` — FOUND (Task 2)
- `git log --oneline --all | grep 04e38ff` — FOUND (Task 3)
- Full suite `python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v` — 30 tests, OK
- Plan-level explicit-window export re-run — exits 0, header exact match, all cluster values in closed set
- Default trailing-window invocation (`pull-gsc.py 7`) — still produces the four-section stdout report
- `git ls-files --error-unmatch scripts/analytics/gsc-auth.py` — exits 0
- `git status --porcelain scripts/analytics/exports` — empty (tests wrote no files into the repository)
