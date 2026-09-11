---
phase: 05-internal-authority-recrawl
plan: 09
subsystem: seo
tags: [search-console, recrawl, url-inspection, sitemap, python-stdlib]

# Dependency graph
requires:
  - phase: 05-internal-authority-recrawl
    provides: "05-08's deploy two, the frozen 11-URL recrawl-targets.json, the 11 prepared rows in RECRAWL-LOG.md, and 05-02's validate-then-append log writer"
provides:
  - "scripts/analytics/RECRAWL-LOG.md: 9 requested rows appended below the 11 prepared rows, each carrying request_date 2026-09-10 and requester Alex Mayes plus the deploy identifiers and both verdicts copied from that URL's prepared row"
  - "REQUIREMENTS.md: LINK-01 Complete; LINK-02 recorded as partially complete naming the two quota-blocked URLs and what closes it"
affects: ["06-week-4-review", "04-PUBLISH-RUNBOOK step 5"]

# Actuals (#2632)
actuals:
  tokens: 2600
  tasks: 2
  commits: 1

key-files:
  modified:
    - scripts/analytics/RECRAWL-LOG.md
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
    - .planning/STATE.md
---

# Phase 05 Plan 09: One-time recrawl requests, recorded

**Submission date:** 2026-09-10
**Requester:** Alex Mayes
**Property:** sc-domain:getlootlist.com
**Sitemap:** sitemap.xml resubmitted once in the same session (confirmed by the user)

## What happened

The user submitted Request indexing in Search Console, once per URL, working down the frozen list in order. Google's daily manual-request quota was exhausted after the ninth URL. The user confirmed by re-inspecting URL 10 that it showed no request, so exactly URLs 1 through 9 were submitted. No browser automation touched Search Console; the deep links the orchestrator generated returned Google 404s and were abandoned in favour of the inspection bar.

## Final log state

| # | URL | requested | request_date | requester |
|---|-----|-----------|--------------|-----------|
| 1 | https://www.getlootlist.com | yes | 2026-09-10 | Alex Mayes |
| 2 | https://www.getlootlist.com/compare | yes | 2026-09-10 | Alex Mayes |
| 3 | https://www.getlootlist.com/pricing | yes | 2026-09-10 | Alex Mayes |
| 4 | https://www.getlootlist.com/about | yes | 2026-09-10 | Alex Mayes |
| 5 | https://www.getlootlist.com/research/wow-classic-loot-systems-2026 | yes | 2026-09-10 | Alex Mayes |
| 6 | https://www.getlootlist.com/blog/loot-priority-lists-vs-loot-council | yes | 2026-09-10 | Alex Mayes |
| 7 | https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026 | yes | 2026-09-10 | Alex Mayes |
| 8 | https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders | yes | 2026-09-10 | Alex Mayes |
| 9 | https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet | yes | 2026-09-10 | Alex Mayes |
| 10 | https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules | no (quota) | | |
| 11 | https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild | no (quota) | | |

Each requested row was appended only through `log-recrawl.py`, with `--check` run immediately before and exiting 0 (not yet requested). The two skipped URLs received no row at all; they remain available to request.

## Mechanical verification

- No URL in the log carries more than one non-empty request_date (counted across the whole file).
- All 11 prepared rows from plan 05-08 are still present and byte-identical to HEAD.
- `log-recrawl.py --check` exits 1 for URLs 1 to 9 and 0 for URLs 10 and 11.
- The em dash count in scripts/analytics/RECRAWL-LOG.md is 0 (the plan's grep gate).

## Statement

No URL was requested more than once, in Search Console or in the log.

## Requirements

- **LINK-01:** Complete. Every marketing surface, the report and every approved guide carry their approved links (plans 05-04 and 05-05).
- **LINK-02:** Partially complete. The sitemap reads the dates module and the parity suites are green (05-06, 05-07), and 9 of 11 requests are recorded. It closes when URLs 10 and 11 carry a request date. Marking it complete now would misstate the log.

## What closes LINK-02

On the next Search Console quota day (24 hours after the first request, roughly): inspect URLs 10 and 11, click Request indexing once each, then run `log-recrawl.py --check` for each, append the two requested rows through the writer, and flip LINK-02 to Complete. Recorded as a pending todo in STATE.md.

## Deviations from plan

- Partial submission due to the Search Console daily quota, handled exactly as the plan's skip clause prescribes: no rows for the skipped URLs, LINK-02 partially complete, skipped URLs named.
- The orchestrator's generated URL Inspection deep links did not work (Google 404); the human used the inspection bar. No effect on the log.
