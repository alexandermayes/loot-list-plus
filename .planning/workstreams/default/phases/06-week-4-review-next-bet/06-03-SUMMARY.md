---
phase: 06-week-4-review-next-bet
plan: 03
subsystem: analytics
tags: [python, search-console, gsc, stdlib, csv, statistics]

requires:
  - phase: 06-week-4-review-next-bet
    provides: "gsc_export.py CSV writer, pull-gsc.py CLI, gsc_clusters.py cluster_query (Phase 1)"
provides:
  - "gsc_export.CSV_HEADER_PAGE_QUERY and an explicit per-dimension header map in export_csv, raising ValueError for an unknown dimension"
  - "pull-gsc.py --dimension page-query, requesting Search Console dimensions [page, query] and clustering by the query text"
  - "gsc_review.py: RULE_TEXT, BAND_MIN_POSITION/BAND_MAX_POSITION, in_band, band_medians, meets_threshold, candidate_pages, cluster_totals, render_threshold_markdown, render_cluster_markdown, read_csv_rows, and a threshold/clusters CLI"
  - "test_gsc_review.py: 29 unit tests covering every <behavior> case plus a subprocess check of the clusters subcommand against the committed baseline export"
affects: ["06-06 (pulls the sprint-window page-query export and runs gsc_review.py threshold)", "06-08 (week-4 review quotes RULE_TEXT and the cluster comparison)"]

actuals:
  tokens: 7737
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Explicit per-dimension header map in export_csv (query/page/page-query) with a raised ValueError for anything else, replacing the prior two-way ternary that would have silently defaulted page-query to the page header"
    - "A committed, data-relative threshold rule (RULE_TEXT) printed by the CLI before any candidate is computed, so the rule cannot be tuned after seeing results"

key-files:
  created:
    - scripts/analytics/gsc_review.py
    - scripts/analytics/test_gsc_review.py
  modified:
    - scripts/analytics/gsc_export.py
    - scripts/analytics/pull-gsc.py
    - scripts/analytics/test_gsc_export.py

key-decisions:
  - "meets_threshold checks in_band internally (not just impressions/CTR), so an out-of-band row can never qualify regardless of its values — matches the D-11 requirement that candidates only come from the 4-20 band"
  - "band_medians filters to in-band rows internally rather than requiring the caller to pre-filter, so render_threshold_markdown can pass the full row set and still get (None, None) correctly when the band is empty"
  - "threshold/clusters CLI subcommands validate the CSV header via a direct csv.reader read (not the first data row), so an empty-band export with zero data rows still gets the header validated correctly"

requirements-completed: []  # MEAS-03 stays unmarked: declared by all 9 Phase 6 plans, ready only once every plan declaring it has a SUMMARY (requirements.ready-ids confirmed 0/1 ready at close-out)

coverage:
  - id: D1
    description: "pull-gsc.py --dimension page-query exports a combined page-and-query CSV (one row per page/query pair, cluster from the query text), with the existing query and page exports byte-for-byte unchanged"
    requirement: "MEAS-03"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_gsc_export.py#TestExportHelpers (19 tests, includes 6 new page-query cases)"
        status: pass
      - kind: unit
        ref: "scripts/analytics/pull-gsc.py --help | grep -F 'page-query'"
        status: pass
    human_judgment: false
  - id: D2
    description: "gsc_review.py states a committed, data-relative D-11 threshold rule (band medians of impressions and CTR over the position 4-20 band) before printing any candidate, and reports 'no rows in the band' instead of inventing a threshold when the band is empty"
    requirement: "MEAS-03"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_gsc_review.py#TestRenderThresholdMarkdown (rule-precedes-candidate and empty-band tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "gsc_review.py clusters subcommand compares two query exports cluster by cluster (brand, competitor, problem, expansion, unclustered), reusing gsc_clusters labels"
    requirement: "MEAS-03"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_gsc_review.py#TestRenderClusterMarkdown, TestClusterTotals"
        status: pass
      - kind: integration
        ref: "python3 scripts/analytics/gsc_review.py clusters <baseline> <baseline> (subprocess test + manual run, exit 0, all 5 clusters present)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-25
status: complete
---

# Phase 6 Plan 03: Combined GSC export and the D-11/D-12 review rule Summary

**A page-and-query Search Console export dimension plus gsc_review.py, whose committed RULE_TEXT states the position-4-to-20 impressions/CTR threshold before any candidate page is computed.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-09-25T21:34:00Z (approx.)
- **Completed:** 2026-09-25T21:54:35Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `pull-gsc.py --dimension page-query` requests Search Console dimensions `["page", "query"]` and writes a combined CSV (`page,query,clicks,impressions,ctr,position,cluster`) via a new `export_csv` branch, with cluster applied to the query text (never the page URL) and the existing `query`/`page` export shapes unchanged.
- `gsc_export.export_csv` now uses an explicit per-dimension header map (`query`/`page`/`page-query`) and raises `ValueError` for any other dimension, closing the old silent-default-to-page-header gap called out in the plan's interfaces.
- New `gsc_review.py`: the D-11 rule (`RULE_TEXT`, `BAND_MIN_POSITION=4.0`, `BAND_MAX_POSITION=20.0`) is a committed sentence printed by `render_threshold_markdown` before any candidate row; `candidate_pages` groups qualifying page-query rows, ordered by qualifying impressions descending then page ascending; an empty band prints "No rows in the position 4 to 20 band" rather than inventing a threshold.
- `gsc_review.py clusters` subcommand (D-12) compares two query exports cluster-by-cluster, reusing `gsc_clusters` labels; verified live against the committed baseline export (all 5 clusters, zero change against itself).
- 29 new unit tests in `test_gsc_review.py` plus 6 new tests in `test_gsc_export.py`; full `scripts/analytics` suite (269 tests, including the pre-existing 06-01/06-02 test files) passes.

## Task Commits

Each task followed the RED/GREEN TDD cycle with separate test and implementation commits:

1. **Task 1: Combined page and query export (D-12)**
   - `c19948c7` test(06-03): add failing tests for page-query export dimension
   - `3dc4a370` feat(06-03): add page-query export dimension to pull-gsc and gsc_export
2. **Task 2: gsc_review.py threshold rule and cluster comparison**
   - `925b384e` test(06-03): add failing tests for gsc_review D-11 threshold and D-12 clusters
   - `ef368538` feat(06-03): implement gsc_review.py threshold rule and cluster comparison

No REFACTOR commit was needed for either task — the GREEN implementation was already the minimal, clean form.

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `scripts/analytics/gsc_review.py` - D-11 threshold rule, candidate-page rollup, D-12 cluster comparison, two-subcommand CLI
- `scripts/analytics/test_gsc_review.py` - 29 unit tests covering every `<behavior>` case
- `scripts/analytics/gsc_export.py` - added `CSV_HEADER_PAGE_QUERY`, explicit per-dimension header map, `ValueError` for unknown dimensions
- `scripts/analytics/pull-gsc.py` - added `page-query` to `--dimension` choices, requests `["page","query"]` dimensions, docstring example
- `scripts/analytics/test_gsc_export.py` - 6 new tests for the page-query dimension (header, row order, cluster-on-query-not-page, no-cluster-fn default, quoting round-trip, ValueError)

## Decisions Made

- `meets_threshold` checks `in_band` internally rather than relying on the caller to pre-filter, so an out-of-band row can never qualify regardless of its impressions/CTR values.
- `band_medians` also filters to in-band rows internally, so `render_threshold_markdown` can pass the full row set and still correctly get `(None, None)` when the band is empty.
- The threshold/clusters CLI subcommands validate the CSV header via a direct `csv.reader` read of the first row (not the first parsed data row), so a page-query export with zero data rows still validates correctly instead of skipping the check.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. No Search Console API call was made in this plan (as specified — plan 06-06 pulls the live data once Sep 24 is final).

## Next Phase Readiness

- Plan 06-06 can now pull the sprint window with one explicit-date command: `python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-09-24 --dimension page-query --csv gsc-sprint-window-page-query-2026-08-24_2026-09-24.csv`.
- `gsc_review.py threshold <page-query-export>` and `gsc_review.py clusters <baseline-query> <week4-query>` are ready for the week-4 review (plan 06-08) to run against real data once 06-06 commits the exports.
- MEAS-03 intentionally stays unmarked: `requirements.ready-ids` confirmed 0/1 ready at close-out since sibling Phase 6 plans (06-01, 06-04 through 06-09) have not all produced a SUMMARY yet.

---
*Phase: 06-week-4-review-next-bet*
*Completed: 2026-09-25*

## Self-Check: PASSED

- `[ -f scripts/analytics/gsc_review.py ]` → FOUND
- `[ -f scripts/analytics/test_gsc_review.py ]` → FOUND
- `git log --oneline --all --grep="06-03"` → 4 commits found (c19948c7, 3dc4a370, 925b384e, ef368538)
- All 4 `<acceptance_criteria>` groups re-verified: `CSV_HEADER_PAGE_QUERY` count 2, `--help` lists `page-query`, `["page", "query"]` literal present in `write_export`, 19/19 test_gsc_export.py tests pass (>13 required), `RULE_TEXT`/`BAND_MIN_POSITION`/`BAND_MAX_POSITION` present, rule-before-candidate and empty-band tests pass, clusters subcommand against baseline exits 0 with all 5 clusters
- Plan-level `<verification>`: full `scripts/analytics` suite (269 tests) passes; `pull-gsc.py --help` shows `page-query`; threshold/clusters output confirmed manually
