# Phase 6: Week-4 Review & Next Bet - Context

**Gathered:** 2026-09-25
**Status:** Ready for planning

<domain>
## Phase Boundary

An internal, evidence-backed written review (`06-REVIEW.md`) that closes the Search & AI Visibility Sprint. It covers four things: (1) the Sep 18 to 24 activated-guild cohort against the Aug 24 to 30 baseline, in counts and percentages; (2) Search Console pages and queries with meaningful impressions at positions 4 to 20 and weak CTR, plus CTA and funnel drop-off; (3) a week-4 re-run of the six-prompt AI-answer test set compared to the Aug 28 baseline; (4) one next bet (a page or content piece) chosen from that data and approved by the user. The phase produces analysis, data artifacts and a decision. It ships no site changes, no public pages, and no fixes to analytics tooling.

</domain>

<decisions>
## Implementation Decisions

### Cohort timing and comparison
- **D-01:** The cohort comparison runs on or after **2026-10-01**, in one clean pass. That is when the Sep 18 to 24 cohort's 7-day activation window closes, and Search Console data for Sep 24 is final by then (2 to 3 day lag). The review must not publish a partial cohort number. Plans may prepare tooling and non-cohort inputs earlier, but the cohort query and final write-up are gated to on or after Oct 1 with a dated checkpoint. This supersedes the roadmap's "Sep 20 to 24" calendar note for the cohort section.
- **D-02:** Both cohorts are **recomputed from source rows** (guild creation plus the underlying raid, loot-award and list rows that define activation) using one definition, with a 7-day window measured from each guild's creation. Do not rely on `guild_funnel_milestones.activated_at`: the evaluator stamps the time it re-observes a condition, so guilds created Aug 24 to 26 (before migration `20260827000000`) carry late or missing stamps. If the activation definition in `utils/analytics/funnel.ts` cannot be reproduced from source rows, the researcher must say so explicitly and propose the closest faithful reconstruction. Do not silently fall back to the stamps.
- **D-03:** Metrics: **activated guilds are the headline** and the pass/fail line against the +30% target. **Qualified guilds are secondary context**, recomputed the same way. The cohort denominator (guilds created in each week) is reported alongside.
- **D-04:** Verdict format: absolute counts plus percentage change plus a plain-language verdict, with an explicit small-denominator caveat (e.g. "7 vs 5 guilds (+40%): target met, but a one-guild swing would change the result"). No statistical significance test.
- Privacy floor still applies to anything published outside the phase folder. Cohort counts in the internal review are aggregate counts with no guild names or IDs anywhere, including committed exports.

### Week-4 AI-answer run
- **D-05:** The user reruns all **18 cells** (6 fixed prompts × ChatGPT, Google AI Overviews/AI Mode, Claude) following `scripts/analytics/RUNBOOK.md`, in clean non-personalized sessions. Results are recorded through `scripts/analytics/log-ai-answer.py`. This is a `checkpoint:human-action`, exactly like Phase 1 D-02. Never automate the user's browser, and never fabricate or approximate a cell.
- **D-06:** The run happens as soon as convenient, **before Oct 1**. It does not depend on the cohort window, and doing it early lets the Oct 1 write-up happen in one sitting.
- **D-07:** Success criterion 3 is reported as the full 6×3 grid (appeared / factually correct) against the Aug 28 run. A prompt counts as "returns LootList+ correctly" when **at least 2 of 3 surfaces** include LootList+ with correct facts.
- **D-08:** Every miss or error is annotated with an error type (not mentioned, wrong price or plan, outdated feature claim, wrong category, etc.) and the cited URL from the log. These annotations are inputs to the next-bet ranking.

### Funnel, CTA drop-off and search data
- **D-09:** Funnel and CTA drop-off numbers come from a **PostHog HogQL pull** (extend or reuse `scripts/analytics/pull-posthog.py`) against the events behind the four pinned dashboards (2036463 to 2036466). Query text and outputs are committed so the numbers are reproducible. The dashboards are only a visual cross-check, and screenshots are included only if they show data. This needs the user's `POSTHOG_PERSONAL_API_KEY` / `POSTHOG_PROJECT_ID` in `.env.local`. If they are missing, add a `checkpoint:human-action` for the user to add them. Never read or print `.env.local`.
- **D-10:** If PostHog data is empty or broken (see the pending "admin analytics dashboard showing zero data" todo), the review **reports the gap**: which drop-off points could not be measured and why. The phase does not diagnose or fix PostHog. The fix stays in its existing todo and may itself be ranked as a next-bet candidate on evidence.
- Respect the project rule that PostHog funnels must not mix user-scoped events with guild-scoped milestone events (different distinct-id spaces).
- **D-11:** "Meaningful impressions" and "weak CTR" are **data-relative** thresholds, derived from the site's own distribution (e.g. an impression floor, and CTR below the site's median for the position 4 to 20 band). The rule is **written down in the review before candidates are listed**, so pages aren't cherry-picked.
- **D-12:** Search Console window: the **sprint window Aug 24 to Sep 24, 2026** (explicit dates, never "last N days"), compared against the Aug 24 to 30 baseline week using the committed baseline export. Reuse the query clusters (brand/competitor/problem/expansion) from `gsc_clusters.py`.

### Review document and next-bet handoff
- **D-13:** The review is `06-REVIEW.md` in the phase folder (internal, not published). Every number traces back to a committed query or export under `scripts/analytics/` (e.g. `scripts/analytics/exports/`, with a provenance row in its `README.md`, following the Phase 1 convention).
- **D-14:** Next bet: the review ranks **2 to 3 candidates** with the supporting evidence (queries, impressions and CTR, AI-answer errors, funnel drop-off) and recommends one. A **`checkpoint:decision` sign-off** lets the user approve or swap it. The approved bet is then captured as a **pending todo** under `.planning/todos/pending/` for the next milestone. It is not added as a roadmap phase in this milestone.
- **D-15:** Candidate pool: bets surfaced by the data, plus the existing SEO todos (the "loot list" query cannibalization between changelog and homepage, and the /compare snippet rework) and a possible WoW Forever landing page, **only if the data supports them**. Each candidate is one page or content piece. Apply the sprint rule "improve the page already earning impressions before creating a new page for a near-duplicate query." Product features (e.g. WoW Forever data support) are not eligible as the bet.
- **D-16:** The case study (EVID-05, blocked on the user interview) is listed as **open sprint carry-over**, not as a next-bet candidate.
- Copy voice rules apply to any user-facing wording that ends up in the next-bet todo: no em dashes.

### Claude's Discretion
- Exact SQL for the source-row cohort reconstruction, and whether it lives as a new saved query next to `scripts/analytics/queries/`.
- Exact data-relative threshold formula (D-11), provided it is stated before candidates are listed.
- Structure and section order of `06-REVIEW.md`, and the ranking rubric for next-bet candidates.
- Whether the Search Console pull reuses `pull-gsc.py` / `gsc_export.py` as-is or adds a page-dimension export, as long as dates are explicit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and success criteria
- `.planning/workstreams/default/ROADMAP.md` §Phase 6: goal, 4 success criteria, dependencies on Phases 1 and 5
- `.planning/workstreams/default/REQUIREMENTS.md`: MEAS-03
- `.planning/PROJECT.md`: core value metric (7-day activated guilds per weekly cohort, +30% target), privacy and copy constraints
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` §"September 20–24: Measure and choose the next bet", item 15 in the plan table, the §GSC query groups ("Review queries with meaningful impressions and positions 4–20. Improve the page already earning impressions before creating a new page"), and §"Weekly Google and AI-answer test set" (the 6 verbatim prompts)

### Baseline and AI-answer instruments (Phase 1)
- `.planning/workstreams/default/phases/01-measurement-baseline-ai-answer-log/01-CONTEXT.md`: D-01 (3 surfaces, 18 cells), D-02 (human-run, never fabricated), D-03 (partial data labelled, never approximated)
- `scripts/analytics/RUNBOOK.md`: AI-answer runbook, prompts, session hygiene
- `scripts/analytics/ai-answer-log.csv`: Aug 28 baseline run (18 rows)
- `scripts/analytics/log-ai-answer.py`: validating log appender
- `scripts/analytics/exports/README.md`: provenance convention for committed exports
- `scripts/analytics/exports/gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv`: baseline week GSC export
- `scripts/analytics/pull-gsc.py`, `scripts/analytics/gsc_export.py`, `scripts/analytics/gsc_clusters.py`: GSC pull, export and clustering

### Activation data
- `supabase/migrations/20260827000000_guild_funnel_milestones.sql`: milestone table (instrumentation date Aug 27)
- `scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql`: documents the late-stamp pitfall behind D-02
- `utils/analytics/funnel.ts`: the activation and qualification definitions to reproduce from source rows
- `scripts/analytics/run-research-report.py`: pattern for querying production via the Supabase Management API (curl-like User-Agent fix, aggregate-only output)

### Funnel and PostHog
- `scripts/analytics/pull-posthog.py`: HogQL pull script (needs `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_HOST`)
- `.planning/todos/pending/`: the admin-dashboard zero-data todo and the two SEO todos (cannibalization, /compare snippet), referenced by D-10 and D-15

### Recrawl context (Phase 5)
- `scripts/analytics/RECRAWL-LOG.md`: which URLs were recrawled and when (useful for reading post-change GSC movement)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `pull-gsc.py` already applies the 2 to 3 day lag (`date.today() - timedelta(days=3)`). For D-12, pass explicit start and end dates rather than relative windows (Phase 1 pitfall).
- `gsc_clusters.py` / `gsc_export.py`: cluster precedence brand > competitor > problem > expansion, already tested (`test_gsc_clusters.py`, `test_gsc_export.py`).
- `log-ai-answer.py` plus `test_ai_answer_log.py`: validated appender for the D-05 run.
- `run-research-report.py` / `research_report.py`: Management API SQL runner with aggregate-only output and determinism conventions, usable for the D-02 source-row cohort queries.
- `pull-posthog.py`: stdlib HogQL client. It currently pulls traffic, and funnel-event queries would need adding.

### Established Patterns
- Analytics tooling is stdlib Python in `scripts/analytics/` with `test_*.py` unit tests beside it.
- Committed exports carry explicit date ranges in the filename and a provenance row in `exports/README.md`.
- Human-only steps (AI-answer runs, GSC clicks) are `checkpoint:human-action` tasks. Nothing is fabricated or approximated.
- Production DB access is only via the Supabase Management API (CLI token in the macOS keychain). There are no Supabase keys in `.env.local`.

### Integration Points
- Output lands in the phase folder (`06-REVIEW.md`), `scripts/analytics/exports/` (data), `scripts/analytics/ai-answer-log.csv` (week-4 rows), and `.planning/todos/pending/` (approved next bet).

</code_context>

<specifics>
## Specific Ideas

- Verdict phrasing model: "7 vs 5 guilds (+40%): target met, but a one-guild swing would change the result."
- AI-answer error annotations are meant to feed directly into the next-bet ranking. For example, a surface citing an outdated page is evidence for improving that page.
- The dashboard zero-data problem is itself a legitimate next-bet candidate only if the evidence supports it, not by default.

</specifics>

<deferred>
## Deferred Ideas

- Publishing a public sprint recap page: a new capability, not in this phase.
- Diagnosing or fixing the PostHog admin dashboards: stays in its existing todo (D-10).
- Adding the next bet as a roadmap phase: it goes to a pending todo for the next milestone instead (D-14).
- Case study publication (EVID-05): remains blocked on the user interview and is tracked as carry-over (D-16).

</deferred>

---

*Phase: 06-week-4-review-next-bet*
*Context gathered: 2026-09-25*
