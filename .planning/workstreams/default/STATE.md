---
gsd_state_version: 1.0
current_phase: 06
current_phase_name: Week-4 Review & Next Bet
status: executing
stopped_at: Completed 06-06-PLAN.md
last_updated: "2026-09-27T21:57:49.541Z"
last_activity: 2026-09-26
last_activity_desc: Phase 06 execution started
state_head: b0968d2e22e5cb628363ae5b69b8c2193b83fb65
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 41
  completed_plans: 37
  percent: 67
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-06)

**Core value:** An officer who lands on the site immediately understands the category, trusts checkable proof, and completes enough setup to become an activated guild (+30% weekly activated guilds by the Sep 18 to 24 cohort)
**Current focus:** Phase 06 — Week-4 Review & Next Bet

## Current Position

Phase: 06 (Week-4 Review & Next Bet) — EXECUTING
Plan: 6 of 9
Status: Ready to execute
Last activity: 2026-09-30 - Completed quick tasks 260929-qg0, 260929-qzn and 260929-wcr: loot list status rules, guild membership write rules and function grants enforced in the database, PR #328 merged and migrations applied

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
| Phase 06 P02 | 25min | 2 tasks | 6 files |
| Phase 06 P03 | 20min | 2 tasks | 5 files |
| Phase 06 P04 | 15min | 2 tasks | 6 files |
| Phase 06 P01 | 20min | 2 tasks | 4 files |
| Phase 06 P06 | 23min | 3 tasks | 11 files |

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
- [Phase 05]: [Phase 05] 05-09 follow-up 2026-09-13: URLs 10 and 11 requested by Alex Mayes after the quota reset and recorded through log-recrawl.py; all 11 frozen URLs now carry exactly one request date; LINK-02 flipped to Complete.
- [Phase 05]: [Phase 05] 05-09 recrawl submissions recorded 2026-09-10 by Alex Mayes for 9 of 11 frozen URLs plus one sitemap resubmission; the daily Search Console quota blocked URLs 10 and 11, which got no row (a fabricated date would make them permanently unavailable), so LINK-02 is recorded as partially complete rather than complete. No URL was requested more than once.
- [Phase 05]: [Phase 05] Fixed a real file-shape mismatch (Rule 3) between probe-recrawl-urls.py/inspect-url.py's original flat-map design (plans 05-01/05-02) and the nested content-dates.json plus array-shaped recrawl-targets.json this plan needed to pass them; added normalize_dates_map/normalize_anchors_map and a dual-shape load_url_list to both scripts, with 23 new unit tests (172/172 total). — Without the fix, --dates-file and --anchors-file would silently skip every check or crash outright, defeating the plan's own double-proof requirement
- [Phase 05]: GH-258/GH-257: scoped eslint react-hooks ratchet to eslint-config-next's plugin-registration glob and ignored local agent tooling dirs; swapped /api/guild-count ISR export for force-dynamic plus a Cache-Control header, with new vitest coverage, so npm run lint and the build-time prerender no longer fail locally
- [Phase 06]: [Phase 06] error_type (D-08) enforced via validate_row(row, require_error_type=False) cross-field rules; main() calls it with require_error_type=True before append_row's own non-strict call, so the CLI refuses any new miss/error cell with no error_type without invalidating the 18 pre-existing Aug 28 rows
- [Phase 06]: [Phase 06] ai-answer-grid.py's prompt_verdict treats a partially-recorded prompt as decided only when missing cells cannot change the 2-of-3 outcome (already at threshold, or unreachable even in the best case); otherwise it reports incomplete (N of 3 cells recorded) rather than guessing, per D-07/MEAS-03's missing-cell edge case
- [Phase 06]: [Phase 06, plan 03] meets_threshold checks in_band internally so an out-of-band row can never qualify regardless of impressions/CTR; band_medians also filters in-band internally so render_threshold_markdown gets (None, None) correctly on an empty band — Keeps the D-11 4-to-20 band rule enforced in one place instead of requiring every caller to pre-filter correctly
- [Phase 06]: [Phase 06, plan 03] threshold/clusters CLI subcommands validate the CSV header via a direct csv.reader read of the header row, not the first parsed data row — An empty-band export with zero data rows still gets its header validated correctly
- [Phase 06]: PostHog HogQL runner and four sprint-window queries committed (06-04); no live PostHog call made by design — D-09 reproducibility guard: sprint literals + forbidden-token lint stop drift before any network call; live syntax confirmation deferred to 06-06
- [Phase 06]: [Phase 06] 06-01: the blocked live --preflight verify step was run by the user directly in the orchestrator session (2026-09-25, preflight ok, EXIT=0) after the permission classifier blocked this executor's attempt; the continuation treats that recorded run as satisfying the acceptance criterion rather than re-running it
- [Phase 06]: [Phase 06] 06-01: qualified-7d-proxy metric ships as a labelled lower/upper bound (never a single number), gated only in the lower bound by guild_settings.updated_at, because guild_settings has no per-column timestamp for when the raid schedule was actually configured
- [Phase 06]: 06-06: Added dashboard-charted marketing_page_viewed, marketing_cta_clicked, discord_oauth_completed and guild_created as extra cta-funnel steps (confirmed person-scoped), rather than reconciling them with the pre-existing landing_*/sign_in_clicked/guild_creation_* steps.
- [Phase 06]: 06-06: Left four premium/monetization events (premium_checkout_started, premium_subscription_started, pro_modal_viewed, pro_upgrade_clicked) charted on dashboard 2036466 unqueried, since they measure subscription conversion rather than landing-to-onboarding acquisition or an activation milestone.

### Pending Todos

8 pending:

- (area: billing) captured 2026-09-21: admin interface for minting Premium gift codes (/admin/gifts, SUPER_ADMIN_IDS-gated) so gifting does not mean hand-clicking a coupon plus promotion code in the Stripe Dashboard. Decision locked: mint codes, do not grant pro directly, so Stripe stays the source of truth and no schema change is needed. Cheap because everything in scripts/lib/gift-code.ts except parseGiftCodeArgs is reusable from an API route. See .planning/todos/pending/2026-09-21-admin-interface-for-minting-premium-gift-codes.md

- (area: data) captured 2026-09-13: build World of Warcraft Forever support (announced BlizzCon 2026-09-12, beta 2026-09-17, launch 2026-11-04) with a repeatable expansion-onboarding format replacing the hand-built per-expansion data files and displayName if/else chains in expansionSeeder.ts; natural next milestone after the sprint closes 2026-09-24. See .planning/todos/pending/2026-09-13-build-world-of-warcraft-forever-support-with-a-repeatable-ex.md

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

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260901-hkj | Harden premium Discord role sync: await webhook role call, discordFetch retry, multi-guild revoke guard, daily reconciliation cron with backfill | 2026-09-01 | 1c13170 |  | [260901-hkj-harden-the-premium-discord-role-sync-awa](./quick/260901-hkj-harden-the-premium-discord-role-sync-awa/) |
| 2 | Make /research and /customers public routes in proxy.ts (crawlers and logged-out visitors got 307 to /?next=); predicate extracted to lib/public-routes.ts with regression tests; closes UAT gap G-04-2 | 2026-09-07 | 27406b5 |  | — |
| 260910-oaz | Fix GH-258 (npm run lint aborting on untracked .cjs agent tooling dirs) by scoping the react-hooks ratchet block and ignoring .claude/.codex/.gsd/.agents; fix GH-257 (npm run build failing at static generation) by swapping /api/guild-count's ISR export for force-dynamic plus a Cache-Control header, with new vitest coverage | 2026-09-10 | 3cf9a3b |  | [260910-oaz-fix-258-repo-wide-npm-run-lint-fails-on-](./quick/260910-oaz-fix-258-repo-wide-npm-run-lint-fails-on-/) |
| 260910-ook | Close GH-257 by documenting in README that a local npm run build needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at build time (root layout providers construct the browser client during prerender) | 2026-09-10 | a0986c0 |  | [260910-ook-close-257-document-that-a-local-npm-run-](./quick/260910-ook-close-257-document-that-a-local-npm-run-/) |
| 260910-oyl | Fix GH-267 (current-week raids missing on Raid Tracking for team guilds): ensure route resolves the team schedule from the expansion first via pickScheduleSource, useRaidTeam defaults to the guild default team with an explicit All-teams sentinel via resolveTeamSelection, and the All-teams banner now says events are only created for a selected team | 2026-09-10 | 98ebc17 |  | [260910-oyl-fix-267-current-week-raids-missing-on-ra](./quick/260910-oyl-fix-267-current-week-raids-missing-on-ra/) |
| 260913-oer | Fix GH-269 (Naxxramas Tier 3 token names and class restrictions wrong): 24 Desecrated token names corrected to their Wowhead ids in data/classic-wow-raids.ts, TOKEN_CLASS_MAPPING fixed per Wowhead (plate Warrior+Rogue, mail Paladin+Hunter+Shaman+Druid, cloth Priest+Mage+Warlock), regression test locks all 743 Classic item names to wow-classic-items, migration 20260913000000 relabels existing loot_items rows and rebuilds their class rows | 2026-09-13 | 280750b |  | [260913-oer-fix-269-naxxramas-tier-3-token-names-and](./quick/260913-oer-fix-269-naxxramas-tier-3-token-names-and/) |
| 260921-ud3 | Add scripts/create-gift-code.ts: CLI that mints a 100%-off Stripe coupon plus a single-use, expiring promotion code for gifting Premium, with a live-mode confirmation gate, secret redaction, code-uniqueness pre-check and a --dry-run that makes no network calls; pure logic split into scripts/lib/gift-code.ts with 30 unit tests; npm run gift:code alias | 2026-09-21 | 329a46fb |  | [260921-ud3-add-scripts-create-gift-code-ts-for-crea](./quick/260921-ud3-add-scripts-create-gift-code-ts-for-crea/) |
| 260921-ut5 | Set payment_method_collection to if_required on the Premium Checkout Session so a 100%-off gift redemption and a $0 trial start no longer demand a card, and set subscription_data.trial_settings.end_behavior.missing_payment_method to pause (gated inside the trialEligible spread) so a card-less trial moves to status paused, which tierForStatus already maps to free | 2026-09-21 | 90807435 |  | [260921-ut5-set-payment-method-collection-if-require](./quick/260921-ut5-set-payment-method-collection-if-require/) |
| 260921-v1f | Revise Premium trial copy in UpgradeModal, PremiumPricing and BillingSection to lead with no credit card required and state that Premium pauses at trial end, aligning user-facing copy with the card-free trial behavior from 260921-ut5 (wording approved by user) | 2026-09-21 | 43defb8d |  | (fast task, no directory) |
| 260921-vns | Add a paused Premium state to BillingSection: extract billingViewState and trialEligible into lib/billing/subscription-view.ts (13 table-driven tests), render pro/paused/free/loading instead of a two-way isPro ternary, give paused guilds a Paused badge and a billing-portal button instead of a checkout entry point (which would have created a duplicate subscription), gate the trial promise on real eligibility, and de-duplicate the eligibility rule in usePremiumCheckout | 2026-09-21 | 3bfcc9a5 |  | [260921-vns-add-a-paused-premium-state-to-billingsec](./quick/260921-vns-add-a-paused-premium-state-to-billingsec/) |
| 260921-w4u | Resume paused subscriptions on payment_method.attached so the Add payment method button keeps its promise: new lib/billing/resume-paused.ts with an injected Stripe port and 22 behavior rows, listing by status=paused as the idempotency guard (safe whether or not the billing portal already resumes), per-element catch so one bad subscription cannot abort the rest, guild_id ownership filter, and failures logged not thrown so Stripe never retries the event | 2026-09-21 | 4f69a7f7 |  | [260921-w4u-resume-paused-subscriptions-when-a-payme](./quick/260921-w4u-resume-paused-subscriptions-when-a-payme/) |
| 260921-wiy | DM the purchaser on Discord three days before a Premium trial ends: new lib/billing/trial-ending.ts (pure decision plus approved copy, 43 tests), sendDirectMessage added to lib/discord.ts, purchaser resolution extracted to lib/billing/purchaser.ts and shared with discord-premium.ts, wired to customer.subscription.trial_will_end. Checks the full four-leg payment-method chain rather than subscription.default_payment_method alone, since the billing portal sets the customer default and a naive check would false-alarm officers who already fixed it | 2026-09-22 | fe9016ec |  | [260921-wiy-dm-the-purchaser-on-discord-three-days-b](./quick/260921-wiy-dm-the-purchaser-on-discord-three-days-b/) |
| 260922-2qm | Install the Jev decision model and a persistent /jev on off status router: state spine that reads OFF for any unparseable state, UserPromptSubmit hook that fails open and emits nothing on any error, four agents pinned to haiku sonnet opus fable, and a skill documenting that Claude Code has no per-message model switch so the note is advice rather than enforcement. OFF by default. Endpoint corrected to https://openrouter.ai/api/alpha/decisions after the documented URL was found to 404 | 2026-09-22 | 1685f8ae |  | [260922-2qm-install-jev-decision-model-and-a-persist](./quick/260922-2qm-install-jev-decision-model-and-a-persist/) |
| 260925-f5j | Let guilds sign up for WoW Forever before raid data exists: 'Forever' expansion seeded with zero raids from one registry that validation reads, official logo tile, Classic-era class gating and Wowhead /forever/ links, a No raids yet empty state on loot list, overview and master sheet, and a Ruleset field (Normal, PvP, Roleplaying, Hardcore plus region, saved as e.g. PvP (US)) in place of Realm for Forever guilds. Also carried two fast fixes: change-expansion no longer wipes a guild's expansions when seeding fails, and PUT /api/guilds/info validates Forever rulesets. Shipped from a clean branch off origin/main as PR #274 | 2026-09-26 | 364b108f |  | [260925-f5j-let-guilds-sign-up-for-wow-forever-befor](./quick/260925-f5j-let-guilds-sign-up-for-wow-forever-befor/) |
| 260926-lj6 | Give every guild a fixed game version (guilds.game, 'classic' or 'forever') so WoW Forever stops behaving like a sixth Classic expansion: migration with Forever backfill shipped alone first (PR #280, applied by Deploy Migrations), then client-safe domain/expansion/game.ts as the single expansion-to-game map, server derivation on POST /api/guilds plus cross-game refusal on add/change-expansion, a Game version choice at signup (WoW Classic or WoW Forever tiles, no subtitles), and Forever guilds no longer see the Add expansion grid, expansion dropdown or Viewing past pill (PR #281). Copy approved by the user | 2026-09-26 | 52fb7805 |  | [260926-lj6-separate-wow-forever-from-the-classic-ex](./quick/260926-lj6-separate-wow-forever-from-the-classic-ex/) |
| fast | Load the five Classic expansion logos on /guild-select/create from local /images/expansions/*.webp instead of beta.softres.it, which failed in production so officers saw empty tiles; object-contain to match the Game version tiles. Verified live: all 7 signup images load (PR #283) | 2026-09-26 | a6c77045 |  | n/a |
| 260927-sfi | Finish hiding the Classic expansion ladder from WoW Forever guilds: PATCH set-current refuses a cross-game expansion (GV-C7/GV-C8, 8-case route test), and Forever-only wording on the Raid Tiers page, guild settings toast, Priorities hint, sheet import, Create reserve run (Classic tiles hidden) and the /help tip; Classic text unchanged. Copy approved by the user (EW-C1 to EW-C12). Shipped as PR #287 | 2026-09-27 | 86c74ce3 |  | [260927-sfi-finish-hiding-the-classic-expansion-ladd](./quick/260927-sfi-finish-hiding-the-classic-expansion-ladd/) |
| 260927-t5j | Announce WoW Forever and make it the default: WoW Forever listed first and preselected in both signup pickers (?game=classic still picks Classic), sign-in keeps the create path, open redirect in app/auth/callback closed via lib/post-auth-redirect.ts, a once-per-user in-app dialog, a CLS-safe dismissible bar on marketing pages, a September 27 Updates entry (auto-posts to the Discord updates channel), and a sweep naming WoW Forever first on the homepage, /pricing, /about, keywords and README. Copy approved by the user. Verified live. Shipped as PR #288 | 2026-09-27 | 21853a3f |  | [260927-t5j-announce-wow-forever-with-an-in-app-moda](./quick/260927-t5j-announce-wow-forever-with-an-in-app-moda/) |
| 260927-wip | Redesign the dashboard setup guide and make the Forever dashboard raid-aware: one progress bar filled to done/total, one row anatomy (solid success check, no strikethrough, accent bar on the current step, real buttons with aria-expanded), current-step number made AA (dark on accent, about 6:1), Forever steps 4 and 5 waiting with 'Not available for WoW Forever yet', and raid-dependent cards hidden for Forever guilds until a raid tier exists. Verified live at 1440px on the Forever test guild and a Classic guild (390px not verifiable: the browser window would not shrink and the site blocks framing). Shipped as PR #291 | 2026-09-28 | dbee288b |  | [260927-wip-redesign-the-dashboard-setup-guide-and-m](./quick/260927-wip-redesign-the-dashboard-setup-guide-and-m/) |
| 260927-sos | Fix GH #279: Classic Phase 4 named "Ahn'Qiraj" instead of "Ruins of Ahn'Qiraj", so AQ20 seeded with no phase and could never be switched on. Phase list fixed plus a catalog-wide raid-phase coverage test (PR #285, draft), then a phase-only backfill migration for existing Classic guilds (PR #286, draft, merges after #285 deploys). Existing guilds keep AQ20 off; officers enable it (user decision, Option A) | 2026-09-27 | 6ac07350 |  | [260927-sos-fix-gh-279-aq20-phase-name-so-ruins-of-a](./quick/260927-sos-fix-gh-279-aq20-phase-name-so-ruins-of-a/) |
| 260927-wbu | Fix GH #277: Horde Head of Nefarian (19002) and Head of Onyxia (18422) now resolve to the Alliance catalog items through a faction alias map (user decision: no new rows, no migration), applied in the addon loot-award and import-string routes and the raid-tracking loot import. Also scoped both addon lookups to the calling guild (they previously picked any guild's loot_items row via the service-role client); follow-ups #289 (repair mis-linked awards) and #290 (in-game exports). PR #292, draft | 2026-09-28 | c73279bb |  | [260927-wbu-fix-gh-277-horde-quest-heads-map-to-the-](./quick/260927-wbu-fix-gh-277-horde-quest-heads-map-to-the-/) |
| 260928-fr8 | Fix GH #289: idempotent migration re-pointing loot_history rows whose item, raid tier or expansion belongs to another guild (all three re-linked together from one own-guild item; match by tier name, then expansion name, then active expansion; ambiguous, no-match and would-duplicate rows left alone). Proven in PGlite (7 of 15 seeded rows repaired, second run 0 changes). PR #298, draft; gated on the production count query and on #294 merging first | 2026-09-28 | fa78bc18 |  | [260928-fr8-fix-gh-289-relink-awards-saved-against-a](./quick/260928-fr8-fix-gh-289-relink-awards-saved-against-a/) |
| 260928-g8x | Fix GH #294: addon and companion award inserts now set raid_tier_id and expansion_id (they omitted the NOT NULL raid_tier_id, so every such award failed); bulk and import-string resolve item ids within the calling guild and take tier and expansion from the server (import-string falls back to the WoW id; otherwise 400 with user-approved copy); loot_history payloads typed against Database Insert. PGlite schema contract 12/12. PR #299, draft; merges before #298. Follow-ups #295, #296, #297 | 2026-09-28 | ba92ae44 |  | [260928-g8x-fix-gh-294-addon-awards-save-raid-tier-a](./quick/260928-g8x-fix-gh-294-addon-awards-save-raid-tier-a/) |
| 260928-i5l | Fix GH #290: both LootList+ addon exports (guild-data for the companion, export-string for the addon) now mirror faction-variant quest heads (19002/19003, 18422/18423) under the sibling faction's wowhead_id via new withFactionVariants helper (exact-rows-win, no mutation); the two Gargul exports (gargul-dft.ts, extracted gargul-export.ts soft-reserve builders) proven by new tests to never mirror, since Gargul links these ids natively; OD-01 fixed in its own commit (guild-data selected a nonexistent loot_items.slot column, always returning zero items). N-01 filed as GH #300 (companion cannot authenticate against these routes yet). PR #301, draft | 2026-09-28 | f6cae73d |  | [260928-i5l-fix-gh-290-in-game-exports-include-horde](./quick/260928-i5l-fix-gh-290-in-game-exports-include-horde/) |
| 260928-iom | Fix GH #300: server side of the companion app's OAuth PKCE login. addon_auth_codes table (single use, 60s, hashed, service role only; PR #302, migration), GET /api/addon/auth plus an officer guild picker (user-approved copy), POST /api/addon/auth/token issuing a guild-scoped sync token, and a shared cookie-or-Bearer gate on all four addon routes, rate-limited, with CSP form-action allowing lootlistplus:. Also cherry-picked the KB-002 Card 'use client' fix (50a91c9e), which the new Server Component page needed on origin/main. PR #303 (stacked on #302) | 2026-09-28 | f004ce68 | Needs Review | [260928-iom-fix-gh-300-companion-app-oauth-pkce-logi](./quick/260928-iom-fix-gh-300-companion-app-oauth-pkce-logi/) |
| 260928-m5n | Sync the unpushed local main (356 ahead, 17 behind) to GitHub: full-history merge kept local on sync/local-main-2026-09-28 (15 conflicts resolved, both intents preserved, LabelText and pixel-size conformance), published as one clean commit on origin/main (9 new analytics exports left out plus a .gitignore rule, fake placeholder redacted, exports README kept at GitHub's version) plus a CodeQL test fix. Draft PR #305, CI green; nested-dialog follow-up #304 | 2026-09-28 | 581e7bd9 | Needs Review | [260928-m5n-sync-unpushed-local-main-to-github-throu](./quick/260928-m5n-sync-unpushed-local-main-to-github-throu/) |
| 260928-x7o | Fix GH #284: 21 verified Classic raid profession recipes (28 raid entries: MC 10, AQ20 8, AQ40 10; all boss drops, Wowhead + AtlasLoot confirmed) added as slot Recipe, Unlimited, cost 0, all classes, shared-table drops in a Shared Boss Loot group per raid. PR #308 (catalog, merged) and PR #309 (backfill migration, plus a fix to #302's brittle migration-ordering test). Follow-up #307 (multi-tier award resolution) | 2026-09-29 | 77b9aa59 |  | [260928-x7o-fix-gh-284-add-classic-raid-profession-r](./quick/260928-x7o-fix-gh-284-add-classic-raid-profession-r/) |
| 260929-fz0 | Fix GH #296 and #297: bulk award route and reassign now check raid_event_id and character_id belong to the calling guild (active membership), with user-approved copy; remove-item builds a typed history row with expansion_id and scopes its item lookups to the guild. Follow-ups #313 (RLS gap) and #314 (master sheet lists departed raiders). Also switched GSD quick tasks to their own gsd/quick-* branches and a docs PR per task. PR #315 | 2026-09-29 | 2b1f2b76 |  | [260929-fz0-fix-gh-296-and-297-harden-remaining-loot](./quick/260929-fz0-fix-gh-296-and-297-harden-remaining-loot/) |
| 260929-j7t | Fix GH #313: BEFORE INSERT/UPDATE trigger on loot_history rejects rows whose raid event, raider (active member) or loot item, tier and expansion belong to another guild, for every role including the service role; UPDATE checks only changed references so legacy rows stay editable; non-officers get the RLS error so nothing is revealed. PGlite 85/85. PR #317 merged, migration applied | 2026-09-29 | f43de43d | Needs Review | [260929-j7t-fix-gh-313-loot-history-rls-checks-refer](./quick/260929-j7t-fix-gh-313-loot-history-rls-checks-refer/) |
| 260929-l3a | Fix GH #295 (and part of #307): addon and companion awards now link to their raid night using the raid-tracking team rules (read-only, never creates a night; unlinked when none matches), re-sends return already recorded instead of duplicating, linked awards count for BLP, import strings use the session's live boss and instance to pick the tier, companion sends attendance before awards (needs a companion release), import dialog shows 'N already recorded' (user-approved). Follow-ups #319, #320, #321. PR #322 | 2026-09-29 | 2a727361 |  | [260929-l3a-fix-gh-307-and-295-addon-awards-pick-the](./quick/260929-l3a-fix-gh-307-and-295-addon-awards-pick-the/) |
| 260929-n27 | Fix GH #314: the master sheet visibility route (rankings, award modal, Gargul/CSV export) now leaves out raiders without an active membership in the guild, using findInvalidCharacterIds, the same check the award routes use; a lookup error returns 500 rather than showing an unfiltered list. Departed raiders hidden, not greyed out (user decision), no new copy, no migration. Follow-ups #325 (bot priority lookup) and #326 (read-only views). PR #324 | 2026-09-29 | 66e05ceb |  | [260929-n27-fix-gh-314-master-sheet-hides-departed-r](./quick/260929-n27-fix-gh-314-master-sheet-hides-departed-r/) |
| 260929-qg0 | Enforce loot list status rules in the database: only officers (or the service role) move a list to pending or approved or change a live list's guild, character, expansion, phase, original phase or tier; every pending or approved list needs an active membership; review fields and the items of live lists are officer-only; snapshots are service-role only. Submit, review and revert check membership first with user-approved copy; manual save runs the auto-save check (closes #314 FU-1). PGlite 177/177 combined. PR #328 | 2026-09-30 | 86e1d6ff | Needs Review | [260929-qg0-enforce-loot-list-status-rules](./quick/260929-qg0-enforce-loot-list-status-rules/) |
| 260929-qzn | Enforce guild membership write rules: membership rows are written by the server and a user session can only leave a guild; user-session guild roles stay below officer level; guild owner and subscription tier are server-managed (new guilds start free); unused membership insert and delete policies dropped; role renames follow the stored name and rejoin assigns the default role. Follow-up: join route accepts any guild id. PGlite 178/178 combined. PR #328 | 2026-09-30 | 86e1d6ff | Verified | [260929-qzn-enforce-guild-membership-write-rules](./quick/260929-qzn-enforce-guild-membership-write-rules/) |
| 260929-wcr | Tighten EXECUTE grants on every public function by caller (PUBLIC default revoked; server-only, signed-in and RLS-helper classes), drop the client read policy on invite codes, pin search_path on four SECURITY DEFINER functions; plus a guarded exec_sql restriction. Confirmed live with anon probes (control 200, server-only 42501). PGlite 372/372 combined. PR #328 | 2026-09-30 | 86e1d6ff | Needs Review | [260929-wcr-tighten-database-function-execute-grants](./quick/260929-wcr-tighten-database-function-execute-grants/) |

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-09-27T21:57:49.119Z
Stopped at: Completed 06-06-PLAN.md
Resume file: None
