# Research report data

This directory holds the committed, reproducible data behind
`/research/wow-classic-loot-systems-2026`. The report page imports
`wow-classic-loot-systems-2026-aggregates.json` at build time, so a published
number can never differ from the query that produced it, and anyone can
re-run the same pull and get the same data back.

## Provenance table

| File | Fixed window | Row count | Generated at | Reproducing command |
|------|--------------|-----------|--------------|----------------------|
| `wow-classic-loot-systems-2026-aggregates.json` | 2026-06-01 to 2026-08-31 | 4 findings, 4 withheld/unavailable metrics | 2026-09-06T01:01:48Z | `python3 scripts/analytics/run-research-report.py` |
| `wow-classic-loot-systems-2026-aggregates.csv` | 2026-06-01 to 2026-08-31 | 8 metric rows | 2026-09-06T01:01:48Z | `python3 scripts/analytics/run-research-report.py` |

The command above uses every default the script ships with: `--queries-dir
scripts/analytics/queries/wow-classic-loot-systems-2026`, `--json
public/research/wow-classic-loot-systems-2026-aggregates.json`, `--csv
public/research/wow-classic-loot-systems-2026-aggregates.csv`, `--start
2026-06-01`, `--end 2026-08-31`, and `--floor 10`. Run it with no flags to
reproduce both committed files exactly.

The window is fixed in place, not a window that moves forward with the
calendar: every query targets the exact same 2026-06-01 through 2026-08-31
range, indefinitely. `generated_at` only changes when the underlying query
results change; re-running the script over unchanged production data reuses
the previously committed timestamp rather than stamping a new one
(`stable_generated_at()` in `run-research-report.py`), so a clean re-run
leaves `git status` quiet.

After the first generation, individual lists were edited, resubmitted, and
re-approved by officers after the window closed. Under the report's
definition, which timestamps a list by officer review when one exists, such
lists move out of the fixed window. The published numbers are the state of
the June 1 to August 31 window as of the generation timestamp above; a later
re-run can differ slightly for the same disclosed reason.

## From a number to the query that produced it

Every saved query lives in
`scripts/analytics/queries/wow-classic-loot-systems-2026/`. Each published
finding's `query_file` field in the committed JSON names the exact `.sql`
file that produced it:

| Metric id | Query file |
|-----------|------------|
| `sample.active_guilds`, `sample.raid_events`, `sample.loot_awards`, `sample.raiders_with_approved_lists` | `01-sample-definition.sql` |
| `median-list-length` | `02-median-list-length.sql` |
| `attendance-weighting` | `03-attendance-weighting.sql` |
| `blp-usage` | `04-bad-luck-protection-usage.sql` |
| `top-priority-bracket` | `08-top-priority-bracket.sql` |

Two more query files support the pipeline but back a withheld or supporting
measurement rather than a published finding: `05-expansion-distribution.sql`
(the expansion breakdown, withheld -- see below) and
`06-funnel-cohort-coverage.sql` and `07-top-bracket-coverage.sql` (coverage
checks that decide whether a candidate clears the guild-privacy floor before
it can be published, not findings themselves).

The report page's own methodology section links this same saved-queries
directory so a reader can go from the page straight to the SQL.

## Metrics the report does not publish

- **Expansion distribution** -- withheld: after merging every segment under
  the 10-guild privacy floor into an "Other" bucket, that merged bucket
  itself holds fewer than 10 guilds, so no segment can be published without
  risking identifying a specific guild.
- **Median time from guild creation to qualified setup** -- withheld: the
  funnel-milestone timestamps needed to measure this only started being
  recorded four days before the window closed, so almost no guild in the
  window has a reliable timestamp for this milestone.
- **Median time from qualified setup to activation** -- withheld for the
  same reason as the item above: the timestamp needed only started being
  recorded four days before the window closed.
- **Self-reported weekly officer time saved** -- not published: no survey of
  this kind has ever been run, and self-reported figures are kept separate
  from behavioral data by design, so there is nothing to report.

The report page's own methodology section states these same four omissions
in the reader-facing copy, in one line each.

## Data sensitivity

The committed data in this directory is aggregate product-usage data for
guilds using LootList+. It contains no player names, no character names, no
guild names, no realms, and no account-level information. Every published
segment covers at least 10 guilds; any breakdown whose merged "Other" bucket
still fell under that floor was withheld entirely rather than published with
a small bucket. No published column is cross-tabulated against another
published column, so no combination of the data in this directory narrows
to one guild.
