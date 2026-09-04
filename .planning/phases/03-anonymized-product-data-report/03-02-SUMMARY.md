---
phase: 03-anonymized-product-data-report
plan: 02
subsystem: analytics-pipeline
tags: [python, supabase-management-api, k-anonymity, sql, checkpoint-menu]

requires:
  - phase: 03-anonymized-product-data-report
    provides: "Plan 03-01's committed pipeline (research_report.py helpers, run-research-report.py CLI, metrics.json registry seeded with sample-definition, 01-sample-definition.sql, and the apply_floor/quantize_display/build_artifact primitives)"
provides:
  - "A committed, ten-bullet-complete candidate registry: 9 candidate metric entries (1 existing + 8 new) plus 2 support entries, each with exactly one of query_file/unavailable_reason"
  - "Seven new committed query files (02 through 08) covering median list length, attendance weighting, bad-luck protection usage, expansion distribution, funnel-cohort coverage, top-bracket coverage, and top-priority-bracket"
  - "A live, reproducible --menu command: run_all_metrics() executes every registry entry with a query_file against production and assembles it through the same assemble_* helpers the eventual published artifact will use, so the checkpoint menu can never diverge from a later run's output (D-05)"
  - "Three metrics decided by measurement rather than assumption, all verified live against production: the funnel-timing grey-out (2 of 33 active guilds created after instrumentation), and the top-priority-bracket publish decision (16 guilds / 88.5% award coverage clears both bars)"
affects: ["03-03 (the human-checkpoint plan consumes this registry/--menu output directly to pick 3-5 findings)", "03-04 (findings sections, per-finding stat callouts, methodology section will read definition_note and segments from these entries)"]

actuals:
  tokens: 16117
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "run_all_metrics(): one shared query-execution + assembly loop reused by both --menu and the full production run, so a value shown at the human checkpoint is structurally guaranteed to match what a later run of the same committed query would produce"
    - "assemble_breakdown/assemble_scalar_finding/assemble_percentage_from_counts/assemble_median/assemble_support: kind-specific pure assemblers, each returning (\"finding\"|\"unavailable\", entry), composed by run_all_metrics and independently unit-tested"
    - "decide_top_bracket_coverage(): a measured-coverage decision gate (10-guild floor AND 80% award-coverage bar) that a metric must clear before its query file is ever written, applied live against production before deciding the publish/withhold branch"

key-files:
  created:
    - scripts/analytics/queries/wow-classic-loot-systems-2026/02-median-list-length.sql
    - scripts/analytics/queries/wow-classic-loot-systems-2026/03-attendance-weighting.sql
    - scripts/analytics/queries/wow-classic-loot-systems-2026/04-bad-luck-protection-usage.sql
    - scripts/analytics/queries/wow-classic-loot-systems-2026/05-expansion-distribution.sql
    - scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql
    - scripts/analytics/queries/wow-classic-loot-systems-2026/07-top-bracket-coverage.sql
    - scripts/analytics/queries/wow-classic-loot-systems-2026/08-top-priority-bracket.sql
  modified:
    - scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json
    - scripts/analytics/research_report.py
    - scripts/analytics/run-research-report.py
    - scripts/analytics/test_research_report.py

key-decisions:
  - "Registry holds 9 candidate entries, not the plan's literal 'ten' (see Deviations): the plan text says 'add nine more' but names only eight new metric ids, an arithmetic bug. Every one of the sprint plan's ten recommended-dataset bullets is still represented -- bullets 1 and 2 were already combined into plan 03-01's single sample-definition entry."
  - "Kept the plan's mandated 'inline the identical active-guild CTE in every query file' rule over the literal 'grep -c loot_history returns 0' acceptance bullet for 05-expansion-distribution.sql, since the shared CTE's OR-definition legitimately references loot_history for the loot-award clause; the file's own expansion-attribution logic never touches loot_history.expansion_id (verified: raid_events -> raid_tiers -> expansions only)."
  - "top-bracket-coverage's rank-matching join uses character_id + guild_id only, not raid_tier_id: measured live that loot_submissions.raid_tier_id is populated on only 6 of 1331 rows, so a raid-tier-scoped join would have silently excluded nearly every award. Documented as the measure's own limitation in both the query header and the registry definition_note, rather than silently narrowing the result."
  - "top-priority-bracket ships (publish branch): measured live against production, top-bracket-coverage cleared both the 10-guild floor (16 guilds) and the 80% award-coverage bar (88.5%), so 08-top-priority-bracket.sql was written and the registry entry carries the query file plus a definition_note stating the coverage the share rests on."

patterns-established:
  - "Pattern: a `support`-kind registry entry is evidence for a grey-out or publish/withhold decision, never itself a pickable finding; render_menu prints support entries in their own trailing block and excludes them from the pickable/unavailable tally."

requirements-completed: [EVID-01, EVID-02]

coverage:
  - id: D1
    description: "All ten sprint-plan recommended-dataset bullets are represented in the committed registry (9 candidate entries, since bullets 1-2 were already merged into 03-01's sample-definition), each with exactly one of query_file/unavailable_reason"
    requirement: "EVID-01"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_research_report.py::TestMetricsRegistryCompleteness (4 tests)"
        status: pass
      - kind: other
        ref: "python3 scripts/analytics/run-research-report.py --lint-queries (8 query files pass)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every segmented breakdown passes through apply_floor before it can become a finding; a sub-floor Other bucket withholds the whole breakdown rather than publishing a small cohort"
    requirement: "EVID-01"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_research_report.py::TestAssembleBreakdown, TestExpansionBreakdownFloorBehavior (7 tests)"
        status: pass
      - kind: other
        ref: "python3 scripts/analytics/run-research-report.py --menu (live run: expansion-distribution correctly withheld -- merged Other bucket below the 10-guild floor)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Expansion attribution routes raid_events -> raid_tiers -> expansions, grouped by name text, multi-bucket, never loot_history.expansion_id"
    requirement: "EVID-01"
    verification:
      - kind: other
        ref: "grep -c raid_tiers 05-expansion-distribution.sql >= 1 (actual: 3)"
        status: pass
    human_judgment: true
    rationale: "The literal 'grep -c loot_history returns 0' acceptance bullet fails by construction (the mandated shared active-guild CTE legitimately references loot_history for its loot-award clause); a human should confirm the file's own expansion-attribution logic (verified by inspection to route only through raid_tiers/expansions) is what the plan actually intended to gate on."
  - id: D4
    description: "Attendance-weighting and the two funnel-timing metrics are resolved on evidence, not a naive presence check or an untested assumption"
    requirement: "EVID-02"
    verification:
      - kind: other
        ref: "python3 scripts/analytics/run-research-report.py --menu (live: attendance-weighting=84.8%; time-to-qualified/time-to-activated greyed out with 2/33 measured post-instrumentation guilds)"
        status: pass
      - kind: unit
        ref: "scripts/analytics/test_research_report.py::TestAssembleMedian, TestRegistryPreservesEvidencedReasons"
        status: pass
    human_judgment: false
  - id: D5
    description: "top-priority-bracket is decided by measured loot_submission_snapshots coverage against a stated 10-guild/80%-award bar, not assumption; RESEARCH.md's uncomputable conclusion is corrected"
    requirement: "EVID-02"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_research_report.py::TestDecideTopBracketCoverage (4 tests)"
        status: pass
      - kind: other
        ref: "python3 scripts/analytics/run-research-report.py --menu (live: top-bracket-coverage=4292/4853 awards, 16 guilds; top-priority-bracket=29.5%)"
        status: pass
    human_judgment: false

duration: 68min
completed: 2026-09-04
status: complete
---

# Phase 3 Plan 02: Full Ten-Metric Registry and Two Decided-on-Evidence Metrics Summary

**Extended the candidate registry to every sprint-plan metric (9 candidate entries + 2 support entries), verified the entire pipeline live against production via `--menu`, and resolved all three planned trap metrics on measured evidence: attendance-weighting (84.8%, redefined against shipped defaults), the funnel-timing grey-out (2 of 33 active guilds post-instrumentation), and top-priority-bracket, which research assumed was uncomputable but ships at 29.5% after measured snapshot coverage cleared both the 10-guild floor and an 80% award-coverage bar.**

## Performance
- **Duration:** 68min
- **Started:** 2026-09-04T18:00:00Z (approx.)
- **Completed:** 2026-09-04T18:54:00Z
- **Tasks:** 3 completed
- **Files modified:** 11 (7 new SQL files + metrics.json + research_report.py + run-research-report.py + test_research_report.py)

## Accomplishments
- Extended `metrics.json` from 1 to 11 entries: 9 candidate metrics (each with exactly one of `query_file`/`unavailable_reason`) covering every sprint-plan bullet, plus 2 `support`-kind entries (`funnel-cohort-coverage`, `top-bracket-coverage`) that exist purely as measured evidence and can never be picked as findings.
- Added `03-attendance-weighting.sql` and `04-bad-luck-protection-usage.sql`, both against the identical inlined active-guild CTE; attendance is measured against the seven confirmed `guild_settings` defaults from `domain/scoring/defaults.ts` (Pitfall 3), never a meaningless presence check.
- Added `02-median-list-length.sql` (percentile_cont over non-removed items) and `05-expansion-distribution.sql` (raid_events -> raid_tiers -> expansions, grouped by name text, multi-bucket).
- Added `06-funnel-cohort-coverage.sql` and ran it live: only 2 of 33 active guilds were created on or after the 2026-08-27 funnel-instrumentation date. Finalized both funnel grey-out reasons with that measured number, the instrumentation date, and the current-time-stamping defect in `utils/analytics/funnel.ts`.
- Corrected `03-RESEARCH.md` Assumption A4/Open Question 2: `loot_submission_snapshots` does exist and is a usable point-in-time record. Added `07-top-bracket-coverage.sql`, ran it live (4,853 awards in window, 4,292 with a prior snapshot = 88.5%, 16 active guilds with a usable snapshot), applied the decision rule (>=10 guilds AND >=80% award coverage), and shipped `08-top-priority-bracket.sql` on the publish branch -- measured live at 29.5%.
- Discovered live (not assumption) that `loot_submissions.raid_tier_id` is populated on only 6 of 1331 rows; both new snapshot-coverage queries match on `character_id + guild_id` instead, with the imprecision documented as the measure's own limitation rather than silently absorbed.
- Added `assemble_breakdown` (D-04 floor-aware assembler), `assemble_scalar_finding`/`assemble_percentage_from_counts`/`assemble_median`/`assemble_support`, `decide_top_bracket_coverage`, and `render_menu` to `research_report.py`, each covered by dedicated unit tests.
- Refactored `run-research-report.py`'s `--menu` (and the full run) through one shared `run_all_metrics()` loop so the checkpoint menu and any future committed artifact use the identical assembly path (D-05) -- a value the human sees at the checkpoint cannot diverge from what a later run of the same query produces.
- Verified the entire pipeline live against production three times across the three tasks; `git status --porcelain public/research/` stayed clean throughout (`--menu` writes nothing).

## Task Commits
1. **Task 1: The full ten-metric registry and the two guild-settings breakdowns** - `865e727` (feat)
2. **Task 2: The activity queries and the evidenced funnel grey-out** - `83d5811` (feat)
3. **Task 3: Decide the top-priority-bracket metric on measured snapshot coverage** - `cf5d021` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates)

## Files Created/Modified
- `scripts/analytics/queries/wow-classic-loot-systems-2026/02-median-list-length.sql` - percentile_cont median over non-removed approved-list items
- `scripts/analytics/queries/wow-classic-loot-systems-2026/03-attendance-weighting.sql` - share of active guilds differing from shipped attendance defaults
- `scripts/analytics/queries/wow-classic-loot-systems-2026/04-bad-luck-protection-usage.sql` - share of active guilds with blp_enabled true
- `scripts/analytics/queries/wow-classic-loot-systems-2026/05-expansion-distribution.sql` - multi-bucket expansion breakdown via raid_events -> raid_tiers -> expansions
- `scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql` - support measurement evidencing the funnel-timing grey-out
- `scripts/analytics/queries/wow-classic-loot-systems-2026/07-top-bracket-coverage.sql` - support measurement evidencing the top-priority-bracket decision
- `scripts/analytics/queries/wow-classic-loot-systems-2026/08-top-priority-bracket.sql` - the published top-priority-bracket metric (publish branch)
- `scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json` - extended to 11 entries (9 candidate + 2 support)
- `scripts/analytics/research_report.py` - added `definition_note` carry-through in `build_artifact`, `assemble_breakdown`, `assemble_scalar_finding`, `assemble_percentage_from_counts`, `assemble_median`, `assemble_support`, `decide_top_bracket_coverage`, `render_menu`
- `scripts/analytics/run-research-report.py` - added `run_all_metrics()`; `--menu` and the full run now share one query-execution/assembly path
- `scripts/analytics/test_research_report.py` - 20 new unit tests (39 total, all passing)

## Decisions Made
See `key-decisions` in frontmatter. In summary: registry holds 9 candidate entries (not the plan's literal but arithmetically-wrong "ten"); `05-expansion-distribution.sql` keeps the mandated shared active-guild CTE over a conflicting literal grep bullet; snapshot-coverage joins match on character+guild (not raid_tier_id, which is almost entirely unpopulated); top-priority-bracket ships on the measured publish branch.

## Deviations from Plan

**1. [Rule 1 - Bug] Plan's registry-count arithmetic is off by one**
- **Found during:** Task 1, building the registry
- **Issue:** The plan text says "keep the existing sample-definition entry and add nine more" and its own `<verify>`/`<acceptance_criteria>` hard-code `len(metrics.json) == 10` after Task 1. The plan's own explicit metric-id list, however, names only eight new ids (`median-list-length`, `attendance-weighting`, `blp-usage`, `expansion-distribution`, `time-to-qualified`, `time-to-activated`, `top-priority-bracket`, `officer-time-survey`). 1 existing + 8 named = 9, not 10.
- **Fix:** Built the registry with the 9 entries the explicit list actually supports. Verified this is not a missing sprint-plan bullet: all ten sprint-plan bullets are represented -- bullets 1 ("active guilds and raiders with approved lists") and 2 ("raids tracked and loot awards recorded") were already combined into plan 03-01's single `sample-definition` entry, before this plan ran, and the plan's own `files_modified` frontmatter lists no additional SQL file that would be needed to split them. Adjusted the corresponding unit test (`test_registry_has_nine_candidate_entries_with_required_shape`) and every literal `len(r)==10` check in my own verification to `9` (candidate count), consistent with the plan's own final `<verification>` wording: "ten candidate entries... plus the support entries" reads correctly once the arithmetic bug isn't double-counted. By the plan's end, registry total is 11 (9 candidates + 2 support entries added in Tasks 2-3).
- **Files modified:** `scripts/analytics/queries/wow-classic-loot-systems-2026/metrics.json`, `scripts/analytics/test_research_report.py`
- **Verification:** `python3 -c "..."` registry structural check (unique ids, exactly-one-of invariant) passes at 9 candidates; unit tests pass.
- **Commit:** `865e727`

**2. [Rule 1 - Bug] `05-expansion-distribution.sql`'s literal `grep -c loot_history == 0` acceptance bullet conflicts with the plan's own mandated CTE-inlining rule**
- **Found during:** Task 2, writing the expansion-distribution query
- **Issue:** The plan's Task 2 action text explicitly instructs "Inline the active-guild CTE" for this query, and Task 1 establishes (as a must_haves.truth) that every query in the report reuses the identical active-guild OR-definition, inlined because the Management API runs one statement at a time. That shared CTE legitimately contains `loot_history` (its loot-award-in-window clause). Task 2's acceptance criteria then hard-codes `grep -c 'loot_history' ... returns 0` for this same file -- an unsatisfiable conjunction once the CTE is inlined as required.
- **Fix:** Kept the shared active-guild CTE inlined (satisfying the foundational, phase-wide "identical denominator across every query" truth and D-14's actual substantive concern), and verified the file's own expansion-*attribution* logic never touches `loot_history.expansion_id` -- it routes exclusively through `raid_events -> raid_tiers -> expansions` (`grep -c raid_tiers` returns 3). Did not weaken the active-guild definition to chase the literal grep count, since that would make this query's denominator inconsistent with every other metric in the report -- a materially worse outcome for a phase whose entire point is a single trustworthy denominator.
- **Files modified:** `scripts/analytics/queries/wow-classic-loot-systems-2026/05-expansion-distribution.sql`
- **Verification:** `grep -c raid_tiers` returns 3 (>= 1, passes); `grep -c loot_history` returns 2 (from the shared CTE only, not from any expansion-attribution logic) -- documented here as an unsatisfiable literal criterion rather than silently marked passing.
- **Commit:** `83d5811`

**3. [Rule 1 - Bug] Query header comment tripped the forbidden-column guard by naming `character_name` as a negative example**
- **Found during:** Task 3, writing `07-top-bracket-coverage.sql`'s header
- **Issue:** `assert_no_forbidden_columns` does a raw substring match over the entire file text, including comments (by design, per T-03-10's mitigation). A comment explaining "matched on guild_id, never `character_name`" tripped the guard even though the SQL itself never selects that column.
- **Fix:** Reworded the comment to describe the excluded column without using its literal name ("never the winner's display name column").
- **Files modified:** `scripts/analytics/queries/wow-classic-loot-systems-2026/07-top-bracket-coverage.sql`
- **Verification:** `python3 scripts/analytics/run-research-report.py --lint-queries` passes; `grep -c character_name` on the file returns 0.
- **Commit:** `cf5d021`

**4. [Rule 1 - Bug] `loot_submissions.raid_tier_id` is populated on only 6 of 1331 rows, making the plan's implied per-raid-tier join return zero coverage**
- **Found during:** Task 3, first live run of `07-top-bracket-coverage.sql`
- **Issue:** An initial implementation joined a loot award to the winner's submission via `character_id + guild_id + raid_tier_id`, per the plan's mention of "the relevant raid tier." Run live, this returned `awards_with_prior_snapshot=0` out of 4,853 awards -- a suspiciously total failure. Direct diagnostic queries against production (aggregate-only, `COUNT(*)`) confirmed `loot_submissions.raid_tier_id IS NOT NULL` for only 6 of 1331 rows; the tier-scoped join was silently excluding nearly every award.
- **Fix:** Changed the join to `character_id + guild_id` only (dropping the `raid_tier_id` condition), which correctly matched 4,764-4,853 candidate awards. Documented the resulting imprecision (a winner's other submissions in the same guild count as "usable" without pinpointing the exact list active at award time) directly in both the query header and the published `definition_note`, rather than silently absorbing it.
- **Files modified:** `scripts/analytics/queries/wow-classic-loot-systems-2026/07-top-bracket-coverage.sql`, `08-top-priority-bracket.sql`, `metrics.json`
- **Verification:** Re-ran live: `awards_with_prior_snapshot=4292` of `awards_in_window=4853` (88.5%), `active_guilds_with_usable_snapshots=16`.
- **Commit:** `cf5d021`

**5. [Rule 2 - Missing critical functionality] The pre-existing bare-run `main()` would have crashed or produced wrong values once non-scalar registry entries existed**
- **Found during:** Task 1, before writing any new query files
- **Issue:** The 03-01 `main()` loop assumed every metric with a `query_file` returns exactly one row with one meaningful value column (`value_col = next(iter(row)); value = row[value_col]`), then called `quantize_display(value, metric["kind"])`. Adding `breakdown`/`support`-kind entries (multi-row or multi-column-with-no-single-value results) or 2-column `percentage` entries (numerator, denominator -- not a pre-computed share) would either crash (`quantize_display` raises on an unknown kind) or silently publish the wrong number (e.g. a raw guild count formatted as if it were already a percentage).
- **Fix:** Refactored the query-execution/assembly logic into a shared `run_all_metrics()` used by both `--menu` and the full run, with kind-aware branches (`breakdown` aggregates rows into a segment-count dict; `percentage` with 2 columns computes numerator/denominator; `median` reads a value plus an optional measured-count; `support` wraps the raw row without a formatted display). The full-run artifact-writing path itself was left otherwise untouched (picking findings for publication is explicitly 03-03/03-04's job, not this plan's).
- **Files modified:** `scripts/analytics/run-research-report.py`, `scripts/analytics/research_report.py`
- **Verification:** `--menu` executed live against production three times across the three tasks with zero crashes and correct values (spot-checked attendance-weighting=84.8%=1,224/1,443-scale share, blp-usage=45.5%, top-priority-bracket=29.5%).
- **Commit:** `865e727`

**Total deviations:** 5 auto-fixed (4 Rule 1 bug fixes, 1 Rule 2 missing-critical-functionality fix). **Impact on plan:** All five were necessary for the plan's own stated acceptance criteria and correctness goals to be met; none added scope beyond what this plan's tasks already required. Deviations 1 and 2 are documented plan-text inconsistencies (not implementation bugs) that a human reviewer should be aware of when reading the plan's literal `<verify>` blocks against this SUMMARY.

## Issues Encountered
- The plan's `<verify>` block for Task 1 (`assert len(r)==10`) and Task 2's acceptance bullet (`grep -c loot_history == 0`) do not pass literally, for the reasons documented in Deviations 1 and 2. Every other literal acceptance criterion in the plan passes as written, including the corrected versions of these two.
- `npm run lint` (full project) and `npm run build` (full project) carry the same pre-existing, out-of-scope environment gaps documented in plan 03-01's SUMMARY (`react-hooks/purity` plugin registration, missing `SUPABASE_SERVICE_ROLE_KEY`); not touched by this plan, no Python or SQL file in this plan is affected by either gap.

## User Setup Required
None -- no external service configuration required. The macOS Keychain "Supabase CLI" entry (already present from plan 03-01) was used read-only across three live production runs; its value was never displayed, logged, or committed.

## Next Phase Readiness
- Plan 03-03 can read `metrics.json` and run `--menu` directly to build the human-checkpoint presentation: 4 pickable findings (median-list-length=18.0, attendance-weighting=84.8%, blp-usage=45.5%, top-priority-bracket=29.5%), 4 unavailable metrics with stated reasons (expansion-distribution withheld by the floor, both funnel-timing metrics greyed out with measured evidence, officer-time-survey unavailable by design), plus 2 support measurements not offered as pickable.
- No blockers. The two literal-text/plan-arithmetic inconsistencies (Deviations 1-2) are documented above with their corrected resolutions; they do not block 03-03 from consuming this registry.

## Self-Check: PASSED

- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/02-median-list-length.sql ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/03-attendance-weighting.sql ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/04-bad-luck-protection-usage.sql ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/05-expansion-distribution.sql ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/07-top-bracket-coverage.sql ]` -> FOUND
- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/08-top-priority-bracket.sql ]` -> FOUND
- `git log --oneline --grep="(03-02)"` -> 3 commits found (`865e727`, `83d5811`, `cf5d021`)
- Re-ran plan-level `<verification>`: `python3 -m unittest discover -s scripts/analytics -p 'test_research_report.py' -v` (39/39 pass); `python3 scripts/analytics/run-research-report.py --lint-queries` (8 files pass); `python3 scripts/analytics/run-research-report.py --menu` (exits 0, live against production, no guild/character/realm name in output, correct grey-outs and withholds); `metrics.json` holds 9 candidate + 2 support entries, each with exactly one of `query_file`/`unavailable_reason`; both funnel reasons carry `2026-08-27` and a measured number; the top-bracket decision and its three numbers are recorded above; `git diff --stat` confirms no file under `supabase/migrations/` in this plan's diff.
- `npx vitest run app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` (8/8 pass, confirming plan 03-01's page is unaffected by this plan's changes)

---
*Phase: 03-anonymized-product-data-report*
*Completed: 2026-09-04*
