---
phase: 06-week-4-review-next-bet
plan: 06
subsystem: analytics
tags: [search-console, gsc, posthog, hogql, python, csv, sprint-evidence]

requires:
  - phase: 06-week-4-review-next-bet
    provides: "pull-gsc.py --dimension page-query and gsc_review.py threshold rule (06-03); import-safe pull-posthog.py plus the four committed HogQL files (06-04)"
provides:
  - "Four fully-final Search Console exports for the sprint window (Aug 24 to Sep 24, 2026) and the week-4 cohort week (Sep 18 to 24, 2026), with no partial marker"
  - "Four committed PostHog CSV exports (traffic-smoke, cta-funnel, cta-breakdown, activation-milestones) plus a dashboard event map for 2036463 to 2036466"
  - "posthog-02-cta-funnel.hogql extended with four dashboard-confirmed person-scoped steps (marketing_page_viewed, marketing_cta_clicked, discord_oauth_completed, guild_created)"
  - "exports/README.md retitled to Analytics exports, with a Search Console section (extended filename convention, new provenance rows) and a new PostHog section (naming convention, provenance rows, pull status block)"
affects: ["06-08 (06-REVIEW.md draws its search and funnel evidence from these exports)"]

actuals:
  tokens: 8536
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Dashboard-vs-committed-query cross-check (describe-dashboards, then diff its event list against the committed HogQL's step list) before treating a funnel file as complete, rather than trusting the file's original step list alone"

key-files:
  created:
    - scripts/analytics/exports/gsc-sprint-window-page-query-2026-08-24_2026-09-24.csv
    - scripts/analytics/exports/gsc-sprint-window-query-2026-08-24_2026-09-24.csv
    - scripts/analytics/exports/gsc-sprint-window-page-2026-08-24_2026-09-24.csv
    - scripts/analytics/exports/gsc-week4-cohort-query-2026-09-18_2026-09-24.csv
    - scripts/analytics/exports/posthog-traffic-smoke-2026-08-24_2026-09-24.csv
    - scripts/analytics/exports/posthog-cta-funnel-2026-08-24_2026-09-24.csv
    - scripts/analytics/exports/posthog-cta-breakdown-2026-08-24_2026-09-24.csv
    - scripts/analytics/exports/posthog-activation-milestones-2026-08-24_2026-09-24.csv
    - scripts/analytics/exports/posthog-dashboard-events-2036463_2036466.txt
  modified:
    - scripts/analytics/exports/README.md
    - scripts/analytics/queries/week-4-review/posthog-02-cta-funnel.hogql

key-decisions:
  - "Dashboard-charted marketing_page_viewed, marketing_cta_clicked, discord_oauth_completed and guild_created were added as extra cta-funnel steps rather than replacing any existing step: all are separately, genuinely instrumented person-scoped events (confirmed via distinctId: userId in utils/analytics/client.ts / server.ts, no guild: prefix), and the plan's own instruction was to add a dashboard-charted event the file was missing, not reconcile two naming conventions into one."
  - "Premium/monetization events on dashboard 2036466 (premium_checkout_started, premium_subscription_started, pro_modal_viewed, pro_upgrade_clicked) were left unqueried: they answer a subscription-conversion question, not the landing-to-onboarding acquisition question D-09's cta-funnel covers or the activation-milestone question D-02/the milestones file covers, so forcing them into either committed file would misrepresent what each file measures. Documented in exports/README.md and here rather than silently dropped."
  - "Task 2's checkpoint was not presented to the user: pull-posthog.py --check-env reported POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID and POSTHOG_HOST all present (exit 0) before the checkpoint would have been shown, and the plan's own Task 2 instructions say the checkpoint needs no user action in that case."

requirements-completed: [MEAS-03]

coverage:
  - id: D1
    description: "Four fully-final Search Console exports (sprint-window page-query, sprint-window query, sprint-window page, week4-cohort query) are committed with explicit dates and no PARTIAL marker, each with a provenance row in exports/README.md"
    requirement: "MEAS-03"
    verification:
      - kind: other
        ref: "plan 06-06-PLAN.md Task 1 <verify> block: file existence + provenance row per file, PARTIAL-marker absence, header shape for page-query and week4-cohort-query, gsc_review.py threshold run, README em-dash count"
        status: pass
    human_judgment: false
  - id: D2
    description: "PostHog credential presence was checked by name only (never a value) before the D-09 checkpoint; credentials were already present, so no user action was needed"
    requirement: "MEAS-03"
    verification:
      - kind: other
        ref: "python3 scripts/analytics/pull-posthog.py --check-env (exit 0; POSTHOG_PERSONAL_API_KEY/POSTHOG_PROJECT_ID/POSTHOG_HOST all present, no value printed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "All four PostHog HogQL queries ran successfully against the live project and each produced a committed CSV; the dashboard event map for 2036463-2036466 was read and cross-checked against the committed queries, with the gap (four missing cta-funnel steps) closed and the remaining gap (premium events) explicitly recorded rather than silently dropped"
    requirement: "MEAS-03"
    verification:
      - kind: other
        ref: "plan 06-06-PLAN.md Task 3 <verify> block: PostHog pull status block names all four metric-ids, no UUID/guild: in any posthog-* export, every CSV header starts with period, python3 -m unittest discover -s scripts/analytics -p test_pull_posthog.py (19/19 pass), README em-dash count"
        status: pass
      - kind: unit
        ref: "scripts/analytics/test_pull_posthog.py#CommittedHogqlFilesLintCleanTests.test_every_committed_hogql_file_lints_clean (covers the extended posthog-02-cta-funnel.hogql)"
        status: pass
    human_judgment: false

duration: 23min
completed: 2026-09-27
status: complete
---

# Phase 6 Plan 06: Sprint-Window Evidence Pull (Search Console + PostHog) Summary

**Four fully-final Search Console exports for the Aug 24 to Sep 24, 2026 sprint window plus the Sep 18 to 24 week-4 cohort week, and four PostHog CSVs (traffic, CTA funnel, CTA breakdown, activation milestones) whose funnel file now also covers the four extra acquisition/conversion events the pinned dashboards chart.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-09-27T21:31:00Z (approx.)
- **Completed:** 2026-09-27T21:54:00Z
- **Tasks:** 3 (2 `auto`, 1 `checkpoint:human-action` resolved without user action)
- **Files modified:** 11 (9 created, 2 modified)

## Accomplishments

- Pulled all four Search Console exports with explicit dates (`--start`/`--end`, never a relative window): `gsc-sprint-window-page-query-2026-08-24_2026-09-24.csv` (34 rows), `gsc-sprint-window-query-2026-08-24_2026-09-24.csv` (21 rows), `gsc-sprint-window-page-2026-08-24_2026-09-24.csv` (15 rows), `gsc-week4-cohort-query-2026-09-18_2026-09-24.csv` (11 rows) — every pull's `coverage:` line confirmed final data through the requested end date, so no `-PARTIAL-` file was ever written or considered for commit.
- Checked PostHog credential presence via `--check-env` before Task 2's checkpoint: `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` were all already present (exit 0), so the checkpoint required no user action per the plan's own instructions and was not presented.
- Read the four pinned dashboards' tile definitions (`--describe-dashboards`, event names only, never a data value) and diffed them against the committed `posthog-02-cta-funnel.hogql`: found `marketing_page_viewed`, `marketing_cta_clicked`, `discord_oauth_completed`, and `guild_created` charted on dashboards 2036463/2036464 but missing from the funnel file. Confirmed all four are person-scoped (not milestone-scoped) via `utils/analytics/client.ts`/`server.ts`, added them as extra steps at the correct funnel position, and re-ran the query set — all four HogQL files succeeded on the first live run, no syntax correction needed.
- Left four premium/monetization events charted on dashboard 2036466 (`premium_checkout_started`, `premium_subscription_started`, `pro_modal_viewed`, `pro_upgrade_clicked`) unqueried, since they measure subscription-conversion rather than landing-to-onboarding acquisition or an activation milestone; recorded the reasoning in `exports/README.md` and here rather than force-fitting them into either committed file.
- Retitled `exports/README.md` to "Analytics exports", nested the Search Console material under its own heading with an extended filename convention (`sprint-window`, `week4-cohort` kinds; `page-query` dimension) and new provenance rows, and added a `## PostHog` section: naming convention, provenance rows for all four CSVs plus the dashboard-map file, and a `PostHog pull status` block naming all four metric-ids as `exported (N rows)` and the dashboard map as `read (4 of 4 dashboards)`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Pull sprint-window and week-4 GSC exports (D-12)** - `32aec70e` (feat)
2. **Task 2: PostHog credentials check (no user action needed)** - no code change, no separate commit; recorded in this SUMMARY
3. **Task 3: Run PostHog queries, map dashboards, extend cta-funnel.hogql (D-09, D-10)** - `b0968d2e` (feat)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `scripts/analytics/exports/gsc-sprint-window-page-query-2026-08-24_2026-09-24.csv` - page-and-query pairs for the full sprint window, clustered by query
- `scripts/analytics/exports/gsc-sprint-window-query-2026-08-24_2026-09-24.csv` - query-dimension export for the full sprint window
- `scripts/analytics/exports/gsc-sprint-window-page-2026-08-24_2026-09-24.csv` - page-dimension export for the full sprint window
- `scripts/analytics/exports/gsc-week4-cohort-query-2026-09-18_2026-09-24.csv` - week-4 query export, compared against the committed baseline-cohort export
- `scripts/analytics/exports/posthog-traffic-smoke-2026-08-24_2026-09-24.csv` - pageviews/visitors per period (D-10 receiving-vs-instrumentation check)
- `scripts/analytics/exports/posthog-cta-funnel-2026-08-24_2026-09-24.csv` - 12-step person-scoped funnel reach per period
- `scripts/analytics/exports/posthog-cta-breakdown-2026-08-24_2026-09-24.csv` - `landing_cta_clicked` grouped by CTA button, per period
- `scripts/analytics/exports/posthog-activation-milestones-2026-08-24_2026-09-24.csv` - 7-milestone guild-scoped counts per period
- `scripts/analytics/exports/posthog-dashboard-events-2036463_2036466.txt` - tile/event map for the four pinned dashboards
- `scripts/analytics/exports/README.md` - retitled, extended filename convention, new GSC and PostHog provenance rows, new PostHog section
- `scripts/analytics/queries/week-4-review/posthog-02-cta-funnel.hogql` - four extra dashboard-confirmed steps added

## Decisions Made

- Added the four dashboard-charted events as extra funnel steps rather than reconciling them with the pre-existing `landing_*`/`sign_in_clicked`/`guild_creation_*` steps into one naming scheme; both sets are genuinely, separately instrumented in the codebase (confirmed by direct `trackClientEvent`/`trackEvent` call-site search), and the plan's instruction was additive ("add it as an extra step"), not a rename.
- Excluded the four premium/monetization events from both committed query files; they answer a different question (subscription conversion) than either file's declared scope, and forcing them in would blur what each file measures. This is a judgment call the plan's two-bucket instruction (acquisition/onboarding to funnel; milestone to milestones file) did not explicitly cover, since these events are neither.
- Task 2's checkpoint was resolved without presenting it to the user, per the plan's own "if it exits 0 ... this checkpoint needs no user action" instruction, confirmed by the orchestrator's own pre-check before this plan was dispatched.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Added four dashboard-confirmed events to posthog-02-cta-funnel.hogql**
- **Found during:** Task 3 (dashboard map cross-check)
- **Issue:** The committed cta-funnel query, written in plan 06-04 before any live PostHog access, was missing four events (`marketing_page_viewed`, `marketing_cta_clicked`, `discord_oauth_completed`, `guild_created`) that dashboards 2036463/2036464 chart as the sprint's own acquisition/conversion funnel — without them, the committed funnel evidence would under-report the actual instrumented acquisition path.
- **Fix:** Added all four as extra `UNION ALL` branches per period, in the correct funnel position, after confirming each is person-scoped (not guild-scoped) via direct source search.
- **Files modified:** `scripts/analytics/queries/week-4-review/posthog-02-cta-funnel.hogql`
- **Verification:** `lint_hogql` passes; `test_every_committed_hogql_file_lints_clean` passes; live query against PostHog succeeded and returned 36 rows (12 steps x 3 periods), all non-zero.
- **Committed in:** `b0968d2e` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality per Rule 2)
**Impact on plan:** The plan itself anticipated this exact situation ("If the dashboards chart an acquisition or onboarding event that is not among the cta-funnel steps, add it as an extra step") and specified the fix; no scope creep beyond what the plan's own Task 3 action called for.

## Issues Encountered

- The activation-milestones export shows all-zero counts for `guild_activated`, `guild_qualified`, `roster_threshold_reached`, `first_raid_recorded`, and `first_loot_awarded` in the `week4` period, while the `sprint_window` and `baseline_week` periods are non-zero. Per D-10 this is committed as-is (the traffic-smoke export confirms PostHog was receiving pageview events throughout week4, ruling out a receiving problem for that period), and is left for the 06-08 review to interpret rather than investigated or explained away here.
- The `cta-funnel` export's `discord_oauth_completed` counts (13,968 events / 344 persons in `sprint_window`) are far larger than `discord_oauth_started` (484 events / 204 persons) for the same period — a ratio that would not make sense for a single-fire OAuth completion event. This is flagged for the 06-08 review's attention but was not diagnosed or altered here, consistent with D-10's "report the gap, do not fix PostHog or the underlying instrumentation" rule; this plan's scope is limited to pulling and committing what PostHog returns.

## User Setup Required

None - no external service configuration required. `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` were already present in `.env.local`; `--check-env` confirmed this without reading or printing any value, and Task 2's checkpoint was resolved without presenting it to the user.

## Next Phase Readiness

- All non-cohort evidence the review needs (Search Console sprint-window and week-4 exports, PostHog funnel/CTA/milestone counts, dashboard event map) is now committed with a reproducing command in `exports/README.md`, ready for plan 06-08's write-up.
- Two data-quality observations (week4 all-zero milestones for 5 of 7 milestones; the disproportionate `discord_oauth_completed` count) are flagged above for 06-08 to address as data, not as this plan's responsibility to resolve.
- MEAS-03 is declared by multiple sibling Phase 6 plans; whether it can be marked complete now depends on whether every declaring plan has a SUMMARY at the time this plan's `requirements.ready-ids` check runs.

---
*Phase: 06-week-4-review-next-bet*
*Completed: 2026-09-27*

## Self-Check: PASSED

- All 9 created files verified present on disk (`[ -f ]`).
- Both task commit hashes (`32aec70e`, `b0968d2e`) verified in `git log --oneline --all`.
- Task 1 `<acceptance_criteria>`: all four GSC files present with no PARTIAL marker; page-query header `page,query,clicks,impressions,ctr,position,cluster` and week4-cohort-query header `query,clicks,impressions,ctr,position,cluster` both exact; README.md has a provenance row for each of the four files; `gsc_review.py threshold` prints its `Rule:` line first; README.md contains zero typographic long dash bytes.
- Task 3 `<acceptance_criteria>`: README.md has a `## PostHog` section with a `PostHog pull status` block naming all four metric-ids; every PostHog CSV starts with a `period` column with no UUID-shaped string or `guild:` distinct id; `posthog-dashboard-events-2036463_2036466.txt` exists and lists event names (no data values); `test_every_committed_hogql_file_lints_clean` passes (19/19 `test_pull_posthog.py` tests pass); no PostHog setting, dashboard, or admin analytics code was changed.
- Plan-level `<verification>`: four final GSC exports with provenance rows exist and nothing partial was committed; credentials were checked by name only and the PostHog status block covers all four queries plus the dashboard map; no identifier appears in any PostHog export.
- Full `scripts/analytics` suite re-run: 307 tests, 0 failures.
