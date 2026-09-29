# Phase 6: Week-4 Review & Next Bet - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-25
**Phase:** 06-week-4-review-next-bet
**Areas discussed:** Cohort timing & baseline flaw, Week-4 AI-answer run, Funnel & CTA drop-off source, Review doc & next-bet handoff

---

## Cohort timing & baseline flaw

| Option | Description | Selected |
|--------|-------------|----------|
| Wait until Oct 1 | One clean pass; cohorts matured, GSC final | ✓ |
| Run now, labelled partial, re-pull Oct 1 | Phase 1 D-03 pattern | |
| Run now, final as-is | Fastest; undercounts late activators | |

| Option | Description | Selected |
|--------|-------------|----------|
| Recompute both cohorts from source rows | One definition, sidesteps late stamps | ✓ |
| Keep stamps, disclose caveat | Use activated_at, state understatement | |
| Report both | Side by side with gap explained | |

| Option | Description | Selected |
|--------|-------------|----------|
| Activated headline, qualified secondary | Activated is pass/fail vs +30% | ✓ |
| Activated only | Strict success metric | |
| Full funnel per cohort | Signup to qualified to activated | |

| Option | Description | Selected |
|--------|-------------|----------|
| Counts + % + plain verdict with caveat | No stats test | ✓ |
| Add a significance test | e.g. Fisher's exact | |
| Counts and % only, no verdict | Reader judges | |

**User's choice:** All recommended options.

---

## Week-4 AI-answer run

| Option | Description | Selected |
|--------|-------------|----------|
| User reruns all 18 cells, same runbook | Human-action checkpoint, clean before/after | ✓ |
| Reduced run, 1 surface | Not comparable to baseline | |
| Skip, baseline only | Criterion 3 only partly met | |

| Option | Description | Selected |
|--------|-------------|----------|
| As soon as convenient, before Oct 1 | Independent of cohort window | ✓ |
| On Oct 1 with the rest | Every input gathered on the same day | |

| Option | Description | Selected |
|--------|-------------|----------|
| Per-cell grid + majority rule (>=2 of 3) | Full grid vs Aug 28 | ✓ |
| Strict: all 3 surfaces | | |
| Any surface | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Note error type and cited URL | Feeds next-bet choice | ✓ |
| Pass/fail only | | |

**User's choice:** All recommended options.

---

## Funnel & CTA drop-off source

| Option | Description | Selected |
|--------|-------------|----------|
| PostHog HogQL pull, dashboards as cross-check | Reproducible, committed | ✓ |
| Pinned dashboards only | Not reproducible, may show zero | |
| Supabase only | Misses landing-page CTA clicks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Report the gap, don't fix here | Fix stays in existing todo | ✓ |
| Diagnose and fix PostHog in this phase | Scope growth | |

| Option | Description | Selected |
|--------|-------------|----------|
| Data-relative thresholds, stated up front | Avoid cherry-picking | ✓ |
| Fixed numbers | May flag nothing or everything | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Sprint window Aug 24 - Sep 24 vs baseline week | | ✓ |
| Last 28 days | | |
| Sep 18-24 only | Thin impressions | |

**User's choice:** All recommended options.

---

## Review doc & next-bet handoff

| Option | Description | Selected |
|--------|-------------|----------|
| Phase doc + committed data artifacts | Internal 06-REVIEW.md, traceable | ✓ |
| Also publish a public sprint recap | Scope creep | |

| Option | Description | Selected |
|--------|-------------|----------|
| Rank 2-3, user approves at checkpoint, becomes pending todo | | ✓ |
| Review picks, no sign-off | | |
| Approve, then add as roadmap phase | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Data-surfaced + existing SEO todos, one page/content each | Improve-before-create rule | ✓ |
| Data-surfaced only | | |
| Anything incl. product features | Broader than criterion | |

| Option | Description | Selected |
|--------|-------------|----------|
| Case study noted as open carry-over, not a candidate | | ✓ |
| Allow as candidate | | |

**User's choice:** All recommended options.

---

## Claude's Discretion

- Cohort reconstruction SQL and its location
- Exact data-relative threshold formula (stated before candidates)
- 06-REVIEW.md structure and next-bet ranking rubric
- Whether to reuse the GSC scripts as-is or add a page-dimension export

## Deferred Ideas

- Public sprint recap page
- Diagnosing/fixing PostHog admin dashboards (existing todo)
- Next bet as a roadmap phase (goes to a pending todo instead)
- Case study publication (EVID-05, blocked on interview)
