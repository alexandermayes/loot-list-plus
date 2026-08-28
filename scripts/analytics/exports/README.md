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
| `gsc-baseline-cohort-query-2026-08-24_2026-08-30-PARTIAL-through-2026-08-26.csv` | query | 2026-08-24 to 2026-08-30 | 2026-08-26 (partial) | 5 | `python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-08-30 --dimension query --csv gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv` |

The reproducing command always uses the bare, unmarked filename passed on the command
line. The script decides at run time whether to append a partial marker, based on what
Search Console actually reports as final, not on what the operator requested.

## The partial cohort export and its dated re-pull

The Aug 24 to 30, 2026 baseline cohort could not be exported complete on the day this
export ran (2026-08-28), because Search Console finalizes data 2 to 3 days after the
fact. At export time, Search Console had only finalized data for the cohort window
through 2026-08-26, so the committed cohort file is named with a `-PARTIAL-through-2026-08-26`
marker and contains 5 data rows rather than a full week's worth.

Search Console is expected to finalize the remaining days of the cohort window
(through 2026-08-30) on or after **2026-09-02**. To re-pull the complete cohort once
that date has passed, run:

```
python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-08-30 --dimension query --csv gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv
```

If the window is then fully final, the script writes the bare filename with no partial
marker. Delete the old `-PARTIAL-through-2026-08-26` file, commit the new complete file
in its place, and update this table's cohort row (true final-data end date, row count,
and the fact that the marker is gone). Plan `01-05` is responsible for closing this out.

The missing days of the cohort window must never be estimated, averaged, extrapolated,
or substituted from any other data source, before or after 2026-09-02. A partial window
is labelled partial with its true last date of final data, or it is not committed.

## Data sensitivity

The committed data in this directory is aggregate Search Console query and page
performance for one property (getlootlist.com). It contains no player names, no guild
names, and no other personal or account-level information; it is search-engine
performance data (clicks, impressions, click-through rate, and average position) at the
query or page level only.
