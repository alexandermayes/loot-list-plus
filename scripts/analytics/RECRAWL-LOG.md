# Recrawl Log

This is the one place in this repository that records which URLs have
been submitted to Google Search Console for a recrawl request. It is
shared by Phase 5's own contextual-link sweep and by
`.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md`'s
case-study publish step 5, neither of which keeps a second table of its
own.

This is an event log, not a one-row-per-URL table. A prepared event is
appended once a URL has passed the production probe
(`scripts/analytics/probe-recrawl-urls.py`) and the Search Console URL
Inspection check (`scripts/analytics/inspect-url.py`), with an empty
`request_date` and an empty `requester`. A separate requested event is
appended after a human actually submits the Request Indexing click,
carrying the date and the requester. A URL can therefore appear more
than once; a row with a non-empty `request_date` is what "already
requested" means.

Nothing in this file is ever edited, sorted, deduplicated or removed.
The append order is the audit trail, and a tidied log can no longer
answer whether a URL was already submitted, which is the entire reason
this file exists. Only `scripts/analytics/log-recrawl.py` writes to it.

| url | deploy_sha | deploy_build_id | probe_result | inspection_result | request_date | requester |
|-----|------------|------------------|--------------|--------------------|--------------|-----------|
| https://www.getlootlist.com | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com/compare | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com/pricing | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, no crawl history yet |  |  |
| https://www.getlootlist.com/about | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com/research/wow-classic-loot-systems-2026 | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, no crawl history yet |  |  |
| https://www.getlootlist.com/blog/loot-priority-lists-vs-loot-council | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, no crawl history yet |  |  |
| https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026 | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL |  |  |
| https://www.getlootlist.com | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/compare | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/pricing | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, no crawl history yet | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/about | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/research/wow-classic-loot-systems-2026 | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, no crawl history yet | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/blog/loot-priority-lists-vs-loot-council | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, no crawl history yet | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026 | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-10 | Alex Mayes |
| https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-13 | Alex Mayes |
| https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild | ded23d70 | dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX | pass (6/6 checks, 2 runs identical) | NEUTRAL, INDEXING_ALLOWED, SUCCESSFUL | 2026-09-13 | Alex Mayes |
