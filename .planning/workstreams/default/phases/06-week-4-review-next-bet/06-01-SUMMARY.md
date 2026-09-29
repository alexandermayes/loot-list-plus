---
phase: 06-week-4-review-next-bet
plan: 01
subsystem: analytics
tags: [python, postgres, supabase-management-api, cohort-analysis, tdd, sprint-evidence]

requires:
  - phase: 06 (plan 04, sibling)
    provides: shares scripts/analytics/queries/week-4-review/ directory (HogQL files); no code dependency
provides:
  - Committed, guarded, read-only SQL for both cohort metrics (activated-7d headline, qualified-7d-proxy secondary), reproducing utils/analytics/funnel.ts's activation/qualification conditions from source rows only
  - scripts/analytics/run-cohort-query.py: lint/read-only/source-row/literal guards, the D-01 dated gate (refuses before 2026-10-02T00:00:00Z, exit code 3, before any Keychain read), --lint-queries/--preflight/--summarize CLI, and the D-04 cohort_verdict/format_pct_change verdict wording
  - Proven-live production read path (Keychain token + Management API), verified with no guild data read
affects: [06-07 (runs these queries live against production on/after 2026-10-02), 06-08 (06-REVIEW.md quotes cohort_verdict text verbatim)]

actuals:
  tokens: 11174
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Cohort CTE + two-row VALUES(baseline,week4) LEFT JOIN shape shared verbatim between both SQL files, so a cohort with zero guilds created still returns a row of zeros rather than disappearing from the output"
    - "Every activity/membership existence check bounds itself by COALESCE(insertion_timestamp, business_date::timestamptz) <= created_at + INTERVAL '7 days', so a later re-run can't count a backdated row"
    - "Lower/upper bound proxy pattern for a metric with no exact reconstruction: same base condition, one extra AND clause distinguishes the conservative bound from the permissive one, both from the same query"
    - "cohort_verdict's swing-sensitivity check re-evaluates target_met at four neighboring counts (baseline±1 skipping the below-zero case, week4±1 skipping negative) rather than a formula, so the definition of 'sensitive' can't drift from what target_met itself computes"

key-files:
  created:
    - scripts/analytics/run-cohort-query.py
    - scripts/analytics/test_run_cohort_query.py
    - scripts/analytics/queries/week-4-review/01-activated-cohort.sql
    - scripts/analytics/queries/week-4-review/02-qualified-cohort-proxy.sql
  modified: []

key-decisions:
  - "Task 1 (tracer) was executed and committed as production-quality code with its own <verify> block, per the tracer task-type contract, not a throwaway spike."
  - "The live --preflight verify step was run by the user, not this executor: the permission classifier blocked the command mid-execution at the prior checkpoint; the user then ran it directly in the orchestrator session on 2026-09-25 (preflight ok: Management API reachable with the Keychain token, EXIT=0) and instructed this continuation to treat that as satisfying the acceptance criterion rather than re-running it. This executor did not touch the Keychain or the Management API at any point."
  - "Task 2 followed a genuine RED-then-GREEN TDD cycle: the qualified-proxy SQL file and the verdict functions did not exist when the <behavior> tests were written and committed; running them first produced 19 real failures (17 errors, 2 assertion failures), confirmed and committed as the RED commit, before any implementation was written."
  - "cohort_verdict's pct_change and format_pct_change's string both derive from one shared _pct_change_decimal helper (Decimal, ROUND_HALF_UP, one place) so the printed percentage and the returned float can never disagree with each other."
  - "summarize_csv branches on which bound columns are present in the CSV header (activated_7d vs the two qualified_7d_*_bound columns) rather than taking a metric-id argument, so it stays a pure function of the file it's given, matching the existing single-argument call sites in main()."

requirements-completed: []

coverage:
  - id: D1
    description: "Committed 01-activated-cohort.sql recomputes 7-day activation per weekly cohort from source rows only (loot_submissions approved-list count, attendance_records/raid_events or loot_history existence), never the funnel-instrumentation milestone table, and travels through lint, the read-only/literal/source-row guards, and the CSV writer"
    requirement: "MEAS-03"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_run_cohort_query.py#LintCohortQueriesTests, AssertCohortLiteralsTests, AssertReadOnlyTests, AssertSourceRowsOnlyTests, RowsToCohortTableTests, WriteAndSummarizeCsvTests"
        status: pass
      - kind: other
        ref: "python3 scripts/analytics/run-cohort-query.py --lint-queries (prints activated-7d, exit 0)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Committed 02-qualified-cohort-proxy.sql produces a labelled conservative lower/upper bound for 7-day qualification (never a single precise number), gating the lower bound on guild_settings.updated_at within the 7-day window and omitting that gate for the upper bound, with no is_active filter on character_guild_memberships"
    requirement: "MEAS-03"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_run_cohort_query.py#QualifiedSqlGuardTests, SummarizeCsvQualifiedTests, LintCohortQueriesTests.test_qualified_sql_passes_lint"
        status: pass
    human_judgment: false
  - id: D3
    description: "cohort_verdict/format_pct_change produce the exact D-04 verdict text (including the one-guild-swing caveat and the zero-baseline undefined case) with integer target-met arithmetic and no significance test, confidence interval, or p-value"
    requirement: "MEAS-03"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_run_cohort_query.py#CohortVerdictTests, FormatPctChangeTests (all <behavior> cases byte-matched)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The runner refuses to run any cohort query before 2026-10-02T00:00:00Z (exit code 3, stderr names the timestamp, checked before any Keychain read), with no bypass flag, environment variable, or clock argument"
    requirement: "MEAS-03"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_run_cohort_query.py#AssertCohortWindowsClosedTests"
        status: pass
      - kind: other
        ref: "python3 scripts/analytics/run-cohort-query.py (default invocation, run 2026-09-25 -- before the gate date): exit 3, stderr contains 2026-10-02T00:00:00+00:00; grep -c 'add_argument' run-cohort-query.py == 5"
        status: pass
    human_judgment: false
  - id: D5
    description: "The production read path (macOS Keychain token, curl-like User-Agent, Supabase Management API) is proven live by a preflight that reads no guild data"
    requirement: "MEAS-03"
    verification:
      - kind: other
        ref: "python3 scripts/analytics/run-cohort-query.py --preflight, run by the user directly in the orchestrator session on 2026-09-25 after the permission classifier blocked this executor's own attempt: output 'preflight ok: Management API reachable with the Keychain token', EXIT=0"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-25
status: complete
---

# Phase 06 Plan 01: Cohort Runner Tracer (Activated Headline + Qualified Proxy) Summary

**A guarded, read-only Management-API runner that recomputes 7-day guild activation and qualification per weekly cohort straight from source rows, with the D-04 verdict wording and the D-01 dated gate proven now so 06-07's Oct 2 run is a single command.**

## Performance

- **Duration:** ~20 min (this continuation session; Task 1's original authoring happened in a prior, checkpoint-halted session)
- **Started:** 2026-09-25T22:11:49Z (continuation resume)
- **Completed:** 2026-09-25T22:18:12Z
- **Tasks:** 2 completed
- **Files modified:** 4 (all created; 0 modified)

## Accomplishments

- `scripts/analytics/queries/week-4-review/01-activated-cohort.sql`: the activated-7d headline, reconstructed from `loot_submissions`/`attendance_records`/`raid_events`/`loot_history` only, bounded by each row's own insertion timestamp so a later re-run can't count a backdated row
- `scripts/analytics/queries/week-4-review/02-qualified-cohort-proxy.sql`: the qualified-7d-proxy secondary metric as an honest lower/upper bound, driven by the same cohort shape, gated only in the lower bound by `guild_settings.updated_at`
- `scripts/analytics/run-cohort-query.py`: `assert_cohort_literals`, `assert_read_only`, `assert_source_rows_only`, `lint_cohort_queries`, `assert_cohort_windows_closed` (the D-01 gate), `rows_to_cohort_table`, `export_path_for`, `write_cohort_csv`, `format_pct_change`, `cohort_verdict`, `summarize_csv`, and a `main()` with exactly five CLI flags (`--lint-queries`, `--preflight`, `--summarize`, `--queries-dir`, `--project-ref`) and no date/clock override
- 47 unit tests in `scripts/analytics/test_run_cohort_query.py` exercise every pure function and every `<behavior>` verdict case exactly; full `scripts/analytics` suite is 307 tests, 0 failures
- Production read path (Keychain token to Management API) confirmed live with no guild data read

## Task Commits

Each task was committed atomically. Task 2 (`tdd="true"`) followed a genuine RED-then-GREEN sequence:

1. **Task 1 (tracer): activated-7d end-to-end path** - `0d3f93ff` (feat) — SQL file, runner guards/gate/CLI, 28 tests; written and offline-verified in the prior (checkpoint-halted) session, re-verified offline in this session before commit, then committed by explicit path
2. **Task 2 RED: failing tests for qualified-proxy metric and D-04 verdict wording** - `ff52dc18` (test) — committed while `02-qualified-cohort-proxy.sql`, `format_pct_change`, and `cohort_verdict` did not yet exist; confirmed 19 real failures (17 `FileNotFoundError`/`AttributeError`, 2 assertion failures on lint expecting both files) before any implementation was written
3. **Task 2 GREEN: qualified-proxy SQL + verdict functions** - `c18dd72b` (feat) — full implementation; all 19 new tests plus the full 307-test suite pass; no refactor commit needed (implementation was clean on first pass)

**Plan metadata:** commit hash recorded after this SUMMARY is committed (see below)

## Files Created/Modified

- `scripts/analytics/run-cohort-query.py` - Management API cohort runner: guards, dated gate, CLI, verdict wording
- `scripts/analytics/test_run_cohort_query.py` - 47 unit tests covering every pure function in the runner
- `scripts/analytics/queries/week-4-review/01-activated-cohort.sql` - headline metric, source-rows-only, 7-day activation per cohort
- `scripts/analytics/queries/week-4-review/02-qualified-cohort-proxy.sql` - secondary metric, conservative lower/upper bound proxy

## Decisions Made

See `key-decisions` in frontmatter. In brief: Task 1 shipped as real tracer code, not a spike; the blocked live `--preflight` step was run by the user directly (not re-run by this executor) and its recorded output is treated as satisfying that acceptance criterion; Task 2 ran a real RED-then-GREEN cycle; the verdict percentage and its display string share one Decimal helper; `summarize_csv` branches on which columns are present rather than taking a metric-id parameter.

## Deviations from Plan

None beyond the checkpoint resolution already recorded as a normal-flow authentication/permission gate below. Both tasks' `<action>`, `<behavior>`, and `<acceptance_criteria>` blocks were implemented and verified as specified; no auto-fixes (Rules 1-3) or architectural questions (Rule 4) were needed.

## Authentication/Permission Gates

- **Task 1's live `--preflight` verify step was blocked by the permission classifier** in the prior session (a `security find-generic-password` Keychain read plus a live Management API POST). This is not a bug in the plan or the runner -- it's the permission system correctly gating a live credential read. The user (Alexander Mayes) resolved it by running the command directly in the orchestrator session on 2026-09-25, producing:
  ```
  preflight ok: Management API reachable with the Keychain token
  EXIT=0
  ```
  This continuation was explicitly instructed to treat that recorded run as satisfying the acceptance criterion and not to re-run `--preflight` itself. No other live network call was made by this plan (the dated gate forbids the actual cohort run until 2026-10-02 regardless).

## Issues Encountered

None. Task 1's files were found already correct on disk (matching the plan verbatim) when re-verified offline in this continuation; no fixes were required before committing them.

## User Setup Required

None - no external service configuration required. The Keychain "Supabase CLI" entry already existed and was proven live by the user's preflight run above.

## Next Phase Readiness

- Both cohort SQL files, the runner, and the verdict wording are committed, guarded, and fully unit-tested. Plan 06-07 only needs the calendar to reach 2026-10-02T00:00:00Z and then run `python3 scripts/analytics/run-cohort-query.py` once.
- `06-REVIEW.md` (plan 06-08) can quote `cohort_verdict`'s text templates verbatim -- they are fixed by test, including the small-denominator swing caveat and the zero-baseline undefined case.
- MEAS-03 intentionally left unmarked: it is declared by multiple sibling plans in this phase (per the plan frontmatter's shared-ID convention) and stays unmarked until every declaring plan has a SUMMARY, per this session's explicit instruction.
- No blockers for 06-07.

---
*Phase: 06-week-4-review-next-bet*
*Completed: 2026-09-25*

## Self-Check: PASSED

- All 4 created files verified present on disk (`[ -f ]`).
- All 3 task commit hashes (`0d3f93ff`, `ff52dc18`, `c18dd72b`) verified in `git log --oneline`.
- Full `scripts/analytics` suite re-run: 307 tests, 0 failures, 0 skipped (up from 288 before this plan).
- Plan-level `<verification>` re-run: `--lint-queries` lists both metric-ids; default invocation (run before 2026-10-02) exits 3 with the dated-gate message in stderr; `git status --porcelain scripts/analytics/exports` empty (no export written by this plan).
- `--preflight` not re-run by this executor per the continuation's explicit instruction; its user-run result on 2026-09-25 is recorded above and in the `coverage` block (D5).
