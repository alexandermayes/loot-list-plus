# Search Console exports

This directory holds committed, reproducible Google Search Console exports for the
`getlootlist.com` property. They exist so the Phase 6 week-4 review can read a fixed,
versioned snapshot of search performance rather than re-pulling live numbers, and so
anyone can re-run the exact same pull later and get the same shape of data back.

## Filename convention

Every filename follows:

```
gsc-<kind>-<dimension>-<start>_<end>[-PARTIAL-through-<true-end-date>].csv
```

- `<kind>` is either `trend` (the rolling three-month window that precedes the cohort)
  or `baseline-cohort` (the fixed Aug 24 to 30, 2026 week the sprint plan measures against).
- `<dimension>` is either `query` or `page`, matching the Search Console dimension the
  pull was run against. Query-dimension files carry a `cluster` column; page-dimension
  files do not, since clustering applies to query text, not URLs.
- `<start>` and `<end>` are the ISO dates that were requested on the command line.
- The optional `-PARTIAL-through-<true-end-date>` marker is appended automatically by
  the export script (`gsc_export.partial_suffix_path`) whenever Search Console had not
  yet finalized data for the whole requested window at export time. The date in the
  marker is the true last date of final data, discovered by a live query against the
  API's date dimension, never assumed from the documented 2-3 day lag. A file without
  this marker means the requested window was fully final when it was pulled.

## Provenance table

| File | Dimension | Requested window | True final-data end date | Row count | Reproducing command |
|------|-----------|-------------------|---------------------------|-----------|----------------------|
| `gsc-trend-query-2026-05-24_2026-08-23.csv` | query | 2026-05-24 to 2026-08-23 | 2026-08-23 (fully final) | 23 | `python3 scripts/analytics/pull-gsc.py --start 2026-05-24 --end 2026-08-23 --dimension query --csv gsc-trend-query-2026-05-24_2026-08-23.csv` |
| `gsc-trend-page-2026-05-24_2026-08-23.csv` | page | 2026-05-24 to 2026-08-23 | 2026-08-23 (fully final) | 10 | `python3 scripts/analytics/pull-gsc.py --start 2026-05-24 --end 2026-08-23 --dimension page --csv gsc-trend-page-2026-05-24_2026-08-23.csv` |
| `gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv` | query | 2026-08-24 to 2026-08-30 | 2026-08-30 (fully final) | 6 | `python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-08-30 --dimension query --csv gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv` |

The reproducing command always uses the bare, unmarked filename passed on the command
line. The script decides at run time whether to append a partial marker, based on what
Search Console actually reports as final, not on what the operator requested.

## The cohort re-pull (completed 2026-09-03)

The Aug 24 to 30, 2026 baseline cohort was first exported on 2026-08-28, while Search
Console had only finalized data through 2026-08-26, so the committed file carried a
`-PARTIAL-through-2026-08-26` marker and 5 data rows.

The complete window was re-pulled on **2026-09-03** (plan `01-05`), after Search Console
confirmed final data through 2026-08-30. The script wrote the bare, unmarked filename,
and the superseded `-PARTIAL-through-2026-08-26` file was removed from the repository,
so exactly one cohort export remains: `gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv`
(6 rows, fully final).

The filename convention and the partial-marker semantics above still apply to all future
exports: a window that is not fully final at export time gets a `-PARTIAL-through-<date>`
marker carrying the true last date of final data. Missing days of any window must never
be estimated, averaged, extrapolated, or substituted from any other data source. A
partial window is labelled partial with its true last date of final data, or it is not
committed.

## Data sensitivity

The committed data in this directory is aggregate Search Console query and page
performance for one property (getlootlist.com). It contains no player names, no guild
names, and no other personal or account-level information; it is search-engine
performance data (clicks, impressions, click-through rate, and average position) at the
query or page level only.
