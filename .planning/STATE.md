---
gsd_state_version: 1.0
current_phase: 05
current_phase_name: Internal Authority & Recrawl
status: executing
stopped_at: Completed 05-08-PLAN.md
last_updated: "2026-09-08T18:51:09.026Z"
last_activity: 2026-09-07
last_activity_desc: Phase 05 execution started
state_head: 8c6442fd085e1a7c257a2faf1b27dd642d408bdc
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 32
  completed_plans: 31
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-06)

**Core value:** An officer who lands on the site immediately understands the category, trusts checkable proof, and completes enough setup to become an activated guild (+30% weekly activated guilds by the Sep 18 to 24 cohort)
**Current focus:** Phase 05 — Internal Authority & Recrawl

## Current Position

Phase: 05 (Internal Authority & Recrawl) — EXECUTING
Plan: 5 of 9
Status: Ready to execute
Last activity: 2026-09-07 — Phase 05 execution started

Progress: [████████████████████] 23/23 plans ([███████░░░] 67%)

## Performance Metrics

**Velocity:**

- Total plans completed: 23
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 7 | - | - |
| 1 | 5 | - | - |
| 03 | 6 | - | - |
| 04 | 5 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 25min | 3 tasks | 6 files |
| Phase 01 P03 | 15min | 2 tasks | 5 files |
| Phase 01 P04 | 12min | 2 tasks | 2 files |
| Phase 01 P05 | 6 min | 2 tasks | 4 files |
| Phase 03 P01 | 45min | 2 tasks | 10 files |
| Phase 03 P02 | 68min | 3 tasks | 11 files |
| Phase 03 P03 | 25min | 3 tasks | 7 files |
| Phase 03 P04 | 15m | 1 tasks | 1 files |
| Phase 03 P05 | 45min | 2 tasks | 2 files |
| Phase 03 P06 | 50min | 2 tasks | 11 files |
| Phase 04 P01 | 40min | 2 tasks | 7 files |
| Phase 04 P02 | 40min | 3 tasks | 2 files |
| Phase 04 P03 | 40min | 2 tasks | 3 files |
| Phase 04 P04 | 17min | 2 tasks | 4 files |
| Phase 04 P05 | 15min | 3 tasks | 5 files |
| Phase 05 P01 | 35min | 2 tasks | 2 files |
| Phase 05 P02 | 15min | 3 tasks | 5 files |
| Phase 05 P03 | 15min | 3 tasks | 2 files |
| Phase 05 P08 | 55min | 3 tasks | 6 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Roadmap: Measurement goes first, not last. The week-4 review needs a baseline and several weeks of AI-answer runs, and the GSC blocker needs maximum lead time to clear.
- Roadmap: Report and case study are separate phases so the unblocked report is not held hostage by the user-owned interview.
- Roadmap: Recrawl requests live in Phase 5, after all content is final. Repeat requests do not accelerate indexing.
- [Phase 01]: GSC clustering overlap precedence fixed as brand > competitor > problem > expansion (planner choice, recorded in gsc_clusters.py)
- [Phase 01]: The cohort export's true final-data date (2026-08-26) came from a live coverage_end() query, not the researched estimate (2026-08-25) — the actual reported value is authoritative
- [Phase 02]: Testimonial role/expansion/date metadata omitted, not fabricated (D-02); accepted as data-availability gap at UAT 2026-09-01
- [Phase 02]: Phase complete 2026-09-01 — 7/7 plans, 4/4 UAT passed, SECURITY.md verified (18 threats, 0 open)
- [Ad-hoc]: Premium Discord role sync verified live in prod (grant + revoke); hardening design (backfill, reconciliation incl. comped guilds, await + retry) pending user sign-off
- [Phase 03]: Fixed Cloudflare/urllib User-Agent block (HTTP 403, error code 1010) on the Supabase Management API by setting a curl-like User-Agent in run_sql() -- not documented in RESEARCH.md, discovered live this session
- [Phase 03]: Runner reuses the previous run's generated_at timestamp when the rest of the artifact is unchanged, so re-running over unchanged production data stays git-clean (EVID-02 determinism)
- [Phase 03]: Registry holds 9 candidate entries (plan text arithmetic bug said 'ten'); all ten sprint-plan bullets still represented via sample-definition covering bullets 1-2
- [Phase 03]: top-priority-bracket ships: measured live, snapshot coverage clears both the 10-guild floor (16 guilds) and 80% award-coverage bar (88.5%), correcting RESEARCH.md's uncomputable assumption
- [Phase 03]: D-01 selection (pick-by-id): median-list-length, attendance-weighting, blp-usage, top-priority-bracket published in that order; user delegated the specific pick to the orchestrator's recommendation after asking where findings are published
- [Phase 03]: expansion-distribution recorded as Unavailable (floor-withheld), not Declined: the menu never offered it as a live pickable option
- [Phase 03]: Report copy sign-off: user approved all 45 strings as drafted (approve-all), including drafter defaults for H1/title year difference, eyebrow wording, attendance-weighting framing, and the read-time placeholder (flagged as a pre-ship recalculation item for 03-05/03-06).
- [Phase 03]: Contextual CTA rendered outside the prose wrapper (not nested) since the wrapper's [&_a]:text-accent underline rule would break the filled accent button
- [Phase 03]: JSON download href derived from aggregates.report_slug (not a literal path) to keep the parity gate's single-occurrence count exact, since the JSON extension already appears once in the module's static import statement
- [Phase 03]: page.read-time ships as approved placeholder '6 min read' unrecalculated; 03-05 does not touch the sitemap/robots directive so the recalculation deadline belongs to 03-06
- [Phase 03]: Live-data drift accepted via pinned final snapshot; the research-report window is reproducible against a fixed calendar range but not immune to post-generation re-approvals moving a list's review timestamp out of that window (documented in public/research/README.md and .planning/debug/research-report-one-row-drift.md)
- [Phase 03]: methodology.window sentence revised with fresh user sign-off (2026-09-05) to disclose the live-data reproducibility caveat honestly instead of claiming indefinite reproducibility
- [Phase 03]: Root cause of the reproduction drift documented via systematic debugging (.planning/debug/research-report-one-row-drift.md): confirmed H2 (a legitimate post-window re-approval via an unaudited client-side draft-reversion path), not a pipeline defect
- [Phase 04]: Copy sign-off received: user approved all 18 case-study template strings as drafted (approve-all, 2026-09-06). Section F defaults settled: eyebrow 'Case Study', breadcrumb 'Customers', neutral limitation heading 'What still needs work', CTA mirrors the research report. — ROADMAP copy sign-off gate; plan 04-03 parity gate requires the SIGN-OFF marker
- [Phase 04]: page.title and the rendered H1 are computed from the same resolveH1() call so the browser title, H1 and Article JSON-LD headline can never disagree — Stronger guarantee than two independently templated strings; EVID-04 success criterion 2
- [Phase 04]: isFixtureRouteEnabled() reads process.env.NODE_ENV at call time (not a module constant) so vi.stubEnv can flip production gating mid-test-run — D-08 production filter must be testable without re-importing the registry module
- [Phase 04]: QuoteCard, VerificationLine, TestimonialVerification and QuoteAuthor exported in place from LandingValueProps.tsx rather than extracted to a shared module — TiltCard already lives there and is imported by PremiumFeatures.tsx; extraction would create a circular import or a second consumer rewrite
- [Phase 04]: Eyebrow omit rule implemented as a small exported Eyebrow({ value }) component in page.tsx so an empty approved eyebrow renders no element and is directly testable — Plan 04-03 test requirement; implementation-detail choice within plan discretion
- [Phase 04]: Case-study page chrome (breadcrumb, byline, byline meta, eyebrow) uses text-lg 16px, not the report page's text-sm, so exactly four type sizes (16/20/32/42) ship on the page — 04-03 acceptance criterion on the UI-SPEC type scale; QuoteCard's inherited sizes remain the accepted Phase 3 exception
- [Phase 04]: Publish runbook (04-PUBLISH-RUNBOOK.md) written now, while the route contract is fresh, per D-07: it carries its own atomic robots/sitemap/test commit, contextual link sweep, and one-time recrawl so the case study can publish self-contained after Phase 5's recrawl pass has already run without it.
- [Phase 04]: EVID-05 blocker record honestly updated, not resolved: STATE.md and REQUIREMENTS.md now name the interview kit and the publish runbook as the two artifacts that unblock EVID-05, while the checkbox and traceability row stay unchecked/Blocked.
- [Phase 04]: [Phase 04, plan 05] Proof-strip figure sizing kept on the four already-locked pixel values (42/32/20), not a new fifth size, closing G-04-1 without expanding the type scale — Nearest locked-scale values to the plan's suggested ~28/~22px; staying on-scale avoids introducing an untested fifth type size for a two-gap fix
- [Phase 04]: [Phase 04, plan 05] Fixture size corrected to bare '28' rather than splitting CaseStudy.proofStrip into value+unit fields, closing G-04-3's doubled-unit defect at the data layer with a module-load guard (CASE_STUDY_SIZE_PATTERN) — Templates already append the unit; the data-shape change was explicitly out of scope per the recorded user decision
- [Phase 05]: push-now: pushed 99 pending commits to origin/main as the phase's baseline deploy (D-13); npm run lint's pre-existing config-resolution error confirmed via npm ci and treated as non-blocking per RESEARCH.md Pitfall 6 — Unblocks the entire phase per the plan's checkpoint:decision; the probe script is ready and no Search Console request was made
- [Phase 05]: [Phase 05] Recrawl log built as a Markdown table with a validate-then-append writer (log-recrawl.py), a two-row event model (prepared/requested), and a mechanical already-requested check (--check exits 1 for a URL already requested); Search Console URL Inspection caller (inspect-url.py) reuses pull-gsc.py's OAuth token exchange verbatim with no new consent; 04-PUBLISH-RUNBOOK.md step 5 now points at the one log instead of its own table
- [Phase 05]: [Phase 05] Copy sign-off received for 05-COPY-DRAFT.md (edit-rows, 2026-09-08): 10 of 12 link rows approved byte-for-byte; Link 7 and Link 9 reworded to fix a duplicated word ('our data'/'active guilds') with no change to page, slot, target, or metric_id.
- [Phase 05]: [Phase 05] Attendance-anchor rewording confirmed over the originally endorsed 'X% of guilds weight attendance' phrasing (rows 2, 10, 11 ship the faithful 'changed/differ from the defaults/tune their attendance weighting' variants) because the endorsed phrasing overstated what the attendance-weighting metric measures.
- [Phase 05]: [Phase 05] Guide subset finalized: 6 topic-matched guides linked, 2 recruitment/onboarding guides excluded, officer-burnout guide confirmed no-link. Homepage link slot confirmed as the subhead paragraph. Reused metrics across pages accepted as drafted with no redistribution. 05-COPY-DRAFT.md now STATUS: APPROVED with dated SIGN-OFF, unblocking plans 05-04, 05-05, 05-06.
- [Phase 05]: ui.safety-gate override at wave 3: user chose to continue without a Phase 05 UI-SPEC because the wave adds only inline anchor text inside existing prose (no new components or layout blocks, per D-01), byte-matched to 05-COPY-DRAFT.md by the internal-links and guide-report-links parity suites; the same acknowledgement covers waves 4 and 5 (sitemap and blog-date changes)
- [Phase 05]: [Phase 05] Deploy two is live (buildId dpl_E5T45BTuDDrSZSDZrYv4oH6XkQLX at ded23d70): the link sweep, honest sitemap dates and blog-post date parity are now publicly visible; production probe (11 URLs x 6 checks, twice, identical) and Search Console URL Inspection both confirm readiness with no blocking state; 3 URLs have no crawl history yet (documented normal outcome). — D-13/D-14: recrawl requests must follow deploy two and be proven, not assumed, before the one-shot request in plan 05-09
- [Phase 05]: [Phase 05] Fixed a real file-shape mismatch (Rule 3) between probe-recrawl-urls.py/inspect-url.py's original flat-map design (plans 05-01/05-02) and the nested content-dates.json plus array-shaped recrawl-targets.json this plan needed to pass them; added normalize_dates_map/normalize_anchors_map and a dual-shape load_url_list to both scripts, with 23 new unit tests (172/172 total). — Without the fix, --dates-file and --anchors-file would silently skip every check or crash outright, defeating the plan's own double-proof requirement

### Pending Todos

6 pending:

- (area: seo) captured 2026-08-28 from the GSC baseline:
  - Fix "loot list" query cannibalization (changelog vs homepage)
  - Rework /compare search snippet for competitor queries
- (area: analytics, growth) captured 2026-08-29 from admin dashboard screenshots — out of scope for the current sprint, deferred until Phases 2-6 land:
  - Fix admin analytics dashboard showing zero data (Blog/Funnel/Traffic — likely a PostHog config issue)
  - Redesign admin analytics dashboard (more detail, animations)
  - Review PostHog data for growth experiments (A/B tests to raise usage/signups)
  - Explore top-of-funnel and paid ads strategy (needs budget/platform scoping before any spend)

### Blockers/Concerns

- **[Deploy] Nothing from Phases 2 to 4 is live.** Local `main` is roughly 100 commits ahead of `origin/main`; production still serves the pre-sprint build (old sitemap, no research report, and an auth-gated /research path). Push and deploy before Phase 5, because the one-time recrawl requests must follow the final deployment.
- **[Phase 4 security] Two medium items open, non-blocking.** JSON-LD is injected without escaping `<`, and the guild public-profile URL has no https-only check; both belong in the case-study publish commit (`04-SECURITY.md` T-04-CR1, T-04-CR2).
- ~~**[Phase 1] GSC OAuth credentials wiped.**~~ RESOLVED 2026-08-28: user recreated the OAuth client (Testing mode, added as test user), authorized via `scripts/analytics/gsc-auth.py` (new local-loopback helper, not yet committed), and `pull-gsc.py` verified a full pull. App published to production and token re-minted 2026-08-28, so no 7-day expiry.
- **[Phase 4] Guild interview not conducted; EVID-05 blocked.** EVID-04 shipped as a tested template at `/customers/[slug]` with an empty published registry, so no case-study URL is reachable in production. The committed interview kit (`04-INTERVIEW-KIT.md`) names the twelve questions and the written-approval checklist the user runs the interview from. EVID-05 remains blocked on the user conducting that interview and obtaining written approval; `04-PUBLISH-RUNBOOK.md` is the self-contained path from an approved interview to a live page. No quote, guild name or outcome number may be drafted on the guild's behalf.
- **[Timeline] Sprint window closes Sep 24, 2026.** Phase 6 is calendar-bound to Sep 20 to 24, which leaves Phases 1 through 5 to land by Sep 19.
- **[Phase 3] Production data access.** Report numbers come from the production database via the Supabase Management API only. Aggregate measures only, minimum 10 guilds per published segment, no player or guild names in artifacts or commits.
- ~~**[Phase 1] Baseline cohort export is partial.**~~ RESOLVED 2026-09-03: complete Aug 24 to 30 window pulled with Search Console final data through 2026-08-30 (live coverage query, not assumed); committed as `scripts/analytics/exports/gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv` (6 rows) and the superseded PARTIAL file removed; evidence in the provenance row of `scripts/analytics/exports/README.md` (plan 01-05, D-03 discharged).
- ~~**03-06 Task 2 paused**: re-running scripts/analytics/run-research-report.py against production no longer reproduces the committed artifact byte-for-byte. sample.raiders_with_approved_lists dropped 452->451 and median-list-length's denominator dropped 583->582 (stable across two consecutive re-runs); all other findings (attendance-weighting, blp-usage, top-priority-bracket) matched exactly.~~ RESOLVED 2026-09-05/06: root cause diagnosed (`.planning/debug/research-report-one-row-drift.md`, H2 confirmed) as a legitimate post-window re-approval moving a list out of the fixed window under the COALESCE definition, not a pipeline defect. User authorized pin-and-fix: publish the pipeline's next snapshot as final.
- ~~**03-06 Task 2 re-halted**: a second re-run (2026-09-05) of run-research-report.py surfaced ADDITIONAL drift beyond the diagnosed single-row case in .planning/debug/research-report-one-row-drift.md. raiders_with_approved_lists matched the diagnosed value (451) but median-list-length's denominator is now 581 (diagnosed/expected 582) and top-priority-bracket's denominator moved 2296->2298 (value 29.486->29.504, display still rounds to 29.5). This is new, undiagnosed movement in production data since the debug session concluded.~~ RESOLVED 2026-09-06: user accepted this as further evidence the dataset is live and authorized pinning whatever the pipeline reports at execution time, gated only on the four displayed finding values (18.0/84.8/45.5/29.5) staying unchanged after rounding. Final snapshot pinned 2026-09-06T01:01:48Z: sample.raiders_with_approved_lists=451, median-list-length denominator=581, top-priority-bracket denominator=2298 (value 29.504, displays 29.5); all four displayed finding values held; every published segment cleared the 10-guild floor; a second immediate re-run reproduced byte-identically (idempotence proven).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260901-hkj | Harden premium Discord role sync: await webhook role call, discordFetch retry, multi-guild revoke guard, daily reconciliation cron with backfill | 2026-09-01 | 1c13170 | [260901-hkj-harden-the-premium-discord-role-sync-awa](./quick/260901-hkj-harden-the-premium-discord-role-sync-awa/) |
| 2 | Make /research and /customers public routes in proxy.ts (crawlers and logged-out visitors got 307 to /?next=); predicate extracted to lib/public-routes.ts with regression tests; closes UAT gap G-04-2 | 2026-09-07 | 27406b5 | — |

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-09-08T18:51:08.787Z
Stopped at: Completed 05-08-PLAN.md
Resume file: None
