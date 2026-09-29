# Phase 5: Internal Authority & Recrawl - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 5-internal-authority-recrawl
**Areas discussed:** Link placement and shape, Anchor text and sign-off, lastmod source of truth, Deploy gate and recrawl record

---

## Link placement and shape

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in existing prose | Sentence-level link where the page already makes the claim the report backs up | ✓ |
| Shared evidence block | Generalize BlogRelatedPosts into a "Proof" block on each page | |
| Both | Inline plus a shared block | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep CTAs as-is | Report and case-study CTAs stay on the app host; marketing links added elsewhere | ✓ |
| Route CTAs through /pricing | Move tested hrefs into the marketing funnel | |
| You decide | Planner picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Topic-matched subset | Only guides the report informs; executor proposes list with reasons | ✓ |
| All 9 guides | Every post gets a link | |
| Only the 4 that already cross-link | Reuse existing cross-linked posts | |

| Option | Description | Selected |
|--------|-------------|----------|
| Compare + Pricing outside approved strings | Report links back to both, in new connective text | ✓ |
| Compare only | Single outbound link | |
| Leave the report as-is | Inbound only | |

**User's choice:** Inline evidence links; CTAs unchanged; topic-matched guides; report links back to Compare and Pricing.
**Notes:** None beyond the selections.

---

## Anchor text and sign-off

| Option | Description | Selected |
|--------|-------------|----------|
| One consolidated sign-off | Single copy-draft table of every link; doubles as the changed-pages record | ✓ |
| Anchors only, sentences at discretion | User approves anchors, executor writes sentences unreviewed | |
| Executor discretion | Ship without a checkpoint | |

| Option | Description | Selected |
|--------|-------------|----------|
| The claim, in the page's voice | Anchor is the specific thing the target proves | ✓ |
| Target page title | Anchor is the destination H1 | |
| You decide | Executor picks per link | |

| Option | Description | Selected |
|--------|-------------|----------|
| One per target per page | No forced links; a page with no natural spot gets none | ✓ |
| Up to two per target | Allow inline plus near-CTA | |
| You decide | Executor sets density | |

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing now; runbook owns it | No case-study links or placeholders; note the natural slot per page | ✓ |
| Pre-draft the anchors now | Sign off case-study anchors before the interview | |
| You decide | Planner chooses | |

**User's choice:** Consolidated sign-off, claim-style anchors, one link per target per page, case-study links left to the runbook.
**Notes:** None beyond the selections.

---

## lastmod source of truth

| Option | Description | Selected |
|--------|-------------|----------|
| Shared dates module | One committed route-to-date map read by the sitemap, cross-checked by a test | ✓ |
| Git commit dates | Derive from last commit touching each route | |
| Fix the literals by hand | Replace new Date() entries, keep duplication | |

| Option | Description | Selected |
|--------|-------------|----------|
| Any visible content change, links included | Links and sentences bump lastmod; refactors do not | ✓ |
| Body copy only, not links | Only section-level changes bump | |
| You decide | Planner sets the rule | |

| Option | Description | Selected |
|--------|-------------|----------|
| Deploy date | lastmod is the day the change became publicly visible | ✓ |
| Commit date of the content change | Use git finalization date | |
| You decide | Planner picks | |

| Option | Description | Selected |
|--------|-------------|----------|
| Derived from newest item | /blog from newest post; /changelog from newest updates-data entry | ✓ |
| Hand-maintained like other pages | One literal per index page | |
| You decide | Planner picks | |

**User's choice:** Shared dates module; any visible change counts; deploy date for Phase 2 to 4 pages; index pages derived from newest item.
**Notes:** None beyond the selections.

---

## Deploy gate and recrawl record

| Option | Description | Selected |
|--------|-------------|----------|
| Two deploys: sprint content first, then links | Baseline deploy of the pending commits, then the link sweep; recrawl after the second | ✓ |
| One deploy with everything | Hold the push until links and dates module are merged | |
| User deploys outside the phase | Phase assumes production already matches main | |

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted probe + GSC URL Inspection | Committed probe asserts 200/canonical/noindex/link/lastmod; user runs inspection | ✓ |
| Manual spot-check only | Eyeball changed pages | |
| You decide | Planner picks depth | |

| Option | Description | Selected |
|--------|-------------|----------|
| One committed log in scripts/analytics | Single append-only record; runbook step-5 table becomes a pointer | ✓ |
| Table inside 05 planning docs | Second table next to the runbook's | |
| You decide | Planner picks location | |

| Option | Description | Selected |
|--------|-------------|----------|
| Executor hands you a checklist; you click | Phase ends at a checkpoint; user submits once each plus sitemap resubmit | ✓ |
| You do the whole recrawl step yourself | Phase delivers tooling only | |
| Browser automation clicks for you | Executor drives GSC UI | |

**User's choice:** Two deploys; scripted probe plus URL Inspection; single recrawl log in scripts/analytics; user clicks the requests from an executor-prepared checklist.
**Notes:** None beyond the selections.

---

## Claude's Discretion

- Dates module location/shape and the derivation helpers for /blog and /changelog
- Probe script language/location and the log's column layout
- Exact sentence per page and connective wording (all presented at sign-off)
- Which guides make the topic-matched subset (proposed with reasons)
- Deploy mechanics and pre-push checks
- Whether the two open Phase 4 medium security items ride along in deploy two

## Deferred Ideas

- Nav/footer "Research" entry (navigation change, not a contextual link)
- Consolidating the per-post blog date copies beyond what the dates module and parity test require
- `/customers` index page (still deferred from Phase 4 D-02)
