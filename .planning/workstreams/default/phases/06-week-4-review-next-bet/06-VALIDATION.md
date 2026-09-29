---
phase: 6
slug: week-4-review-next-bet
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-25
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Python `unittest` (stdlib), repo convention in `scripts/analytics/test_*.py` |
| **Config file** | none (discovery-based) |
| **Quick run command** | `python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v` |
| **Full suite command** | `python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v` |
| **Estimated runtime** | ~2 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v`
- **After every plan wave:** Run the same full suite
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

Filled in by the planner/executor per task. Seeded from RESEARCH.md §Validation Architecture:

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-1 | 06-01 | 1 | MEAS-03 | T-06-02, T-06-03, T-06-04 | Cohort literals, read-only guard, dated gate (exit 3 before 2026-10-02T00:00:00Z), live preflight | unit + live | `python3 -m unittest discover -s scripts/analytics -p 'test_run_cohort_query.py' -v` and `python3 scripts/analytics/run-cohort-query.py --preflight` | ❌ W0 | ⬜ pending |
| 6-01-2 | 06-01 | 1 | MEAS-03 | T-06-09 | Qualified proxy as lower and upper bound; D-04 verdict strings pinned | unit | `python3 -m unittest discover -s scripts/analytics -p 'test_run_cohort_query.py' -v` | ❌ W0 | ⬜ pending |
| 6-02-1 | 06-02 | 1 | MEAS-03 | T-06-12 | `error_type` restricted to fixed vocabulary; header-only log change | unit | `python3 -m unittest discover -s scripts/analytics -p 'test_ai_answer_log.py' -v` | ✅ (extend) | ⬜ pending |
| 6-02-2 | 06-02 | 1 | MEAS-03 | T-06-13 | 2-of-3 rule, partial never counts, missing cells incomplete | unit | `python3 -m unittest discover -s scripts/analytics -p 'test_ai_answer_grid.py' -v` | ❌ W0 | ⬜ pending |
| 6-03-1 | 06-03 | 1 | MEAS-03 | T-06-14 | page-query export keys order and cluster on query | unit | `python3 -m unittest discover -s scripts/analytics -p 'test_gsc_export.py' -v` | ✅ (extend) | ⬜ pending |
| 6-03-2 | 06-03 | 1 | MEAS-03 | T-06-08 | D-11 rule printed before candidates | unit | `python3 -m unittest discover -s scripts/analytics -p 'test_gsc_review.py' -v` | ❌ W0 | ⬜ pending |
| 6-04-1 | 06-04 | 1 | MEAS-03 | T-06-05, T-06-07 | HogQL lint, declared-column match, env presence without values | unit | `python3 -m unittest discover -s scripts/analytics -p 'test_pull_posthog.py' -v` | ❌ W0 | ⬜ pending |
| 6-04-2 | 06-04 | 1 | MEAS-03 | T-06-15 | One identity space per HogQL file | lint | inline python in 06-04 Task 2 verify | ❌ W0 | ⬜ pending |
| 6-05-2 | 06-05 | 2 | MEAS-03 | T-06-06 | 18 week-4 cells, error types required, baseline rows unchanged | data check | inline python in 06-05 Task 2 verify | n/a | ⬜ pending |
| 6-06-1 | 06-06 | 2 | MEAS-03 | T-06-11 | No PARTIAL GSC export committed; provenance rows | data check | inline shell in 06-06 Task 1 verify | n/a | ⬜ pending |
| 6-06-3 | 06-06 | 2 | MEAS-03 | T-06-07, T-06-17 | No identifiers in PostHog exports; status block covers all queries | data check | inline python in 06-06 Task 3 verify | n/a | ⬜ pending |
| 6-07-2 | 06-07 | 3 | MEAS-03 | T-06-01, T-06-04 | Two-row identifier-free cohort exports pulled at or after close | data check | inline python in 06-07 Task 2 verify | n/a | ⬜ pending |
| 6-08-1 | 06-08 | 4 | MEAS-03 | T-06-19, T-06-08 | Review numbers match fresh script output; rule before candidates | doc check | inline python in 06-08 Task 1 verify | n/a | ⬜ pending |
| 6-08-2 | 06-08 | 4 | MEAS-03 | T-06-01 | No UUID-shaped string and no typographic long dash in `06-REVIEW.md` | doc check | byte-wise long-dash count plus UUID regex in 06-08 verify | n/a | ⬜ pending |
| 6-09-2 | 06-09 | 5 | MEAS-03 | T-06-20 | One todo in the existing format; no Phase 7 added | doc check | inline python in 06-09 Task 2 verify | n/a | ⬜ pending |

Note: the dotted `python3 -m unittest scripts.analytics.test_x` form does not work in this directory because the tests import sibling modules by bare name (`from research_report import ...`); use the discovery form above.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/analytics/run-cohort-query.py` + `scripts/analytics/test_run_cohort_query.py`
- [ ] `scripts/analytics/queries/week-4-review/*.sql` covered by window-literal and forbidden-column guards
- [ ] AI-answer 6x3 grid script + test (D-07 "2 of 3 surfaces" rule)
- [ ] `log-ai-answer.py` `error_type` extension + new cases in `test_ai_answer_log.py`
- [ ] GSC page+query dimension extension + test following `test_gsc_export.py`

Framework already installed (Python 3 stdlib).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Week-4 AI-answer run (18 cells) | MEAS-03 | Human-run in clean sessions; never automated or fabricated (D-05) | Follow `scripts/analytics/RUNBOOK.md`, log via `log-ai-answer.py` |
| Live Management API / GSC / PostHog pulls | MEAS-03 | Network calls with user credentials; no test doubles by repo convention | Run on or after 2026-10-01 for the cohort; commit outputs with provenance rows |
| Next-bet sign-off | MEAS-03 | User decision (D-14) | `checkpoint:decision` approving or swapping the recommended bet |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
