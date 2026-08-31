# Roadmap: LootList+ Search & AI Sprint Completion

## Overview

The sprint's P0 foundation already shipped (#243 to #247): About is a real entity page, Pricing exists, the homepage hero is rewritten, the acquisition-to-activation funnel is instrumented, and every blog post carries a consistent Zev byline. What remains is the harder half: proof an officer can check, evidence only LootList+ can produce, and a measurement wrap-up that picks the next bet from data.

The order is driven by the calendar and by two user-owned blockers. Measurement instruments go first because the week-4 review is worthless without a baseline and a weekly log, and because the GSC baseline is blocked on the user regenerating OAuth credentials (surfacing that early gives the most time to unblock). Copy and proof come next since they sit on the conversion path. Then the two evidence pages, the report first (unblocked) and the case study second (content blocked on a user-conducted guild interview). Internal linking and one-time recrawl requests come only after every content page is final, because recrawl requests do not benefit from repetition. The week-4 review is last and is calendar-bound to Sep 20 to 24.

**Sprint window:** Aug 26 to Sep 24, 2026. Phases 1 through 5 should land before Sep 19.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Measurement Baseline & AI Answer Log** - Baseline search data and a repeatable weekly AI-answer test so the week-4 review has real before/after numbers
- [ ] **Phase 2: Checkable Conversion Copy** - Signup and homepage say only things an officer can verify
- [ ] **Phase 3: Anonymized Product-Data Report** - Publish a finding nobody else can produce, with every number reproducible
- [ ] **Phase 4: Verified Guild Case Study** - A real guild's before and after, published with content that guild approved
- [ ] **Phase 5: Internal Authority & Recrawl** - Every marketing surface points at the new evidence, then Google is asked once to re-look
- [ ] **Phase 6: Week-4 Review & Next Bet** - Compare the Sep 18 to 24 cohort to baseline and choose what comes next from data

## Phase Details

### Phase 1: Measurement Baseline & AI Answer Log

**Goal**: The sprint's measuring instruments exist and are already collecting, so the week-4 review compares real numbers instead of impressions
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: MEAS-01, MEAS-02
**Success Criteria** (what must be TRUE):

  1. A committed Search Console export covers the Aug 24 to 30 baseline cohort plus the prior three months, with queries grouped into brand, competitor/system, problem, and expansion clusters
  2. A runbook in the repo explains how to run the six fixed AI-answer prompts from a clean, non-personalized session, so any future run is repeatable without re-reading the sprint plan
  3. A results log records, for each prompt in each run: date, whether LootList+ appeared, whether the answer was factually correct, the cited URL, and competing sources
  4. At least one complete test-set run is recorded in the log, establishing the week-1 comparison point for Phase 6

**Checkpoint (user action required)**: MEAS-01 cannot start until the user regenerates Google Search Console OAuth credentials, which `vercel env pull` wiped from `.env.local`. Steps are in the docstring of `scripts/analytics/pull-gsc.py`. If the credentials are not available when this phase runs, MEAS-02 ships on its own and MEAS-01 stays open with the blocker recorded in STATE.md. Do not fabricate or approximate baseline numbers from another source.
**Plans:** 4/5 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md - GSC export tooling: explicit date windows, verbatim query clustering, honest coverage labelling, tested
- [x] 01-02-PLAN.md - AI-answer instrument: self-contained weekly runbook, results log schema, validating appender

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md - Committed baseline exports (prior three months plus the partial cohort) with a provenance README and a dated follow-up in STATE.md
- [x] 01-04-PLAN.md - First complete recorded run: the user performs 18 prompt-surface cells, the executor logs exactly what was reported

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-05-PLAN.md - Dated complete-cohort re-pull, gated on 2026-09-02, replacing the partial export and closing the open item

### Phase 2: Checkable Conversion Copy

**Goal**: Every claim an officer reads on the path to signup is either verifiable or gone
**Mode:** mvp
**Depends on**: Nothing (can run alongside Phase 1)
**Requirements**: COPY-01, PROOF-01, PROOF-02
**Success Criteria** (what must be TRUE):

  1. The signup page leads with officer-intent copy (title, H1, body, primary CTA, secondary link) that reads in the same voice as the shipped homepage hero, with no em dashes
  2. Every homepage testimonial displays the character or real name, role, guild, expansion or tier, interview date, and either a public verification link or a "Verified LootList+ customer" note
  3. No homepage claim asserts an outcome that cannot be checked; the unsupported stats block is replaced with product facts a visitor can confirm on the site
  4. The user has read and signed off on the final wording of every changed string before it ships, and plan copy was treated as a starting point rather than final text

**Plans:** 6/7 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 02-01-PLAN.md - Evidence gathering: full-surface unverifiable-claims audit, repositioning inventory, expansion fact-check, one read-only guild lookup, and the user-supplied quote metadata checkpoint

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md - Every proposed string drafted into one artifact, then the single consolidated D-16 copy sign-off

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md - Tracer: approved signup copy end to end through metadata, component, cross-domain link, and a new render test, proving the phase gate battery

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md - Homepage proof block: per-quote verification lines, the widened QuoteCard contract, the replaced stat card, and a render test
- [x] 02-05-PLAN.md - Root layout, homepage, changelog, and compare metadata: cannibalization fix, competitor-query rewrite, and the first stop in the repositioning sweep
- [x] 02-06-PLAN.md - Repositioning on About, Terms, Privacy, hero body, web manifest, and README, with the manifest superlative removed

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 02-07-PLAN.md - Blog surfaces per the approved indexed-title decision, title mirrors kept in agreement, and the phase-wide sweep completeness gate

### Phase 3: Anonymized Product-Data Report

**Goal**: The site publishes evidence only LootList+ can produce, and a skeptic can reproduce every number in it
**Mode:** mvp
**Depends on**: Nothing (can run alongside Phase 2)
**Requirements**: EVID-01, EVID-02, EVID-03
**Success Criteria** (what must be TRUE):

  1. `/research/wow-classic-loot-systems-2026` is live with a stated methodology, date range, sample definitions, and at least three findings written as plain-English claims rather than chart titles
  2. Every published segment covers at least 10 guilds, and no player name, guild name, or other identifying detail appears anywhere on the page or in the committed artifacts
  3. Each published number traces to a saved query committed to the repo, and re-running that query reproduces the number
  4. The page is self-canonical, present once in the sitemap, and its metadata and structured data match the visible copy, with a contextual create-your-guild CTA

**Data handling note**: Source data comes from the production database via the Supabase Management API. Pull aggregate measures only. Do not extract raw rows, guild names, or player names into planning artifacts, commits, or chat. Raise the 10-guild floor if a combination of segments could identify a single guild.
**Plans**: TBD
**UI hint**: yes

### Phase 4: Verified Guild Case Study

**Goal**: One real guild's before-and-after story is published as proof, with content that guild approved
**Mode:** mvp
**Depends on**: Phase 3 (shares page conventions, CTA pattern, and canonical/sitemap handling)
**Requirements**: EVID-04, EVID-05
**Success Criteria** (what must be TRUE):

  1. A reusable page template renders at `/customers/{guild-slug}` with an outcome-focused H1, proof strip, before-and-after narrative, and a section for a credible limitation
  2. The case study page is self-canonical, present once in the sitemap, and its metadata matches the visible content
  3. One case study is published using quotes, numbers, and identifying details the interviewed guild approved in writing
  4. The page shows how the story was verified (public profile link where permitted, otherwise a verified-customer note) and claims no outcome the interview did not support

**Checkpoint (user action required)**: EVID-05 is blocked on the user conducting the guild interview (the plan's ten questions, including question ten on public linking) and obtaining quote approval. EVID-04, the template, can ship without it. If the interview has not happened when this phase runs, ship the template, leave the case study unpublished, and record the block in STATE.md. Do not draft or infer customer quotes, guild names, or outcome numbers.
**Plans**: TBD
**UI hint**: yes

### Phase 5: Internal Authority & Recrawl

**Goal**: The new evidence is reachable from every surface that should link to it, and Google is asked exactly once to re-look
**Mode:** mvp
**Depends on**: Phases 2, 3, 4 (all content must be final before recrawl requests)
**Requirements**: LINK-01, LINK-02
**Success Criteria** (what must be TRUE):

  1. Homepage, Compare, Pricing, About, the report, the case study, and the relevant guides link to one another contextually using descriptive anchor text, not repeated generic "learn more" links
  2. The sitemap contains only preferred canonical URLs, and `lastmod` is accurate for every page changed during this milestone
  3. URL Inspection recrawl requests are submitted exactly once per materially changed URL, after the final deployment, with the submitted URLs recorded so nobody re-requests them

**Plans**: TBD

### Phase 6: Week-4 Review & Next Bet

**Goal**: The sprint ends with a decision about what to do next that is defensible from the data
**Mode:** mvp
**Depends on**: Phase 1 (baseline and AI-answer log), Phase 5 (all changes deployed and recrawled)
**Requirements**: MEAS-03
**Calendar-bound**: Sep 20 to 24, 2026. Running this earlier compares an incomplete cohort.
**Success Criteria** (what must be TRUE):

  1. A written review compares the Sep 18 to 24 activated-guild cohort to the Aug 24 to 30 baseline, reported in both absolute counts and percentages because the denominators are small
  2. The review names the pages that have meaningful impressions at positions 4 to 20 with weak CTR, and the CTA drop-off points visible in the funnel dashboards
  3. The review reads the AI-answer log accumulated since Phase 1 and states which of the six prompts now return LootList+ correctly and which do not
  4. The next bet, one page or content piece, is named and justified from observed queries and activation data rather than intuition

**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Measurement Baseline & AI Answer Log | 4/5 | In Progress|  |
| 2. Checkable Conversion Copy | 6/7 | In Progress|  |
| 3. Anonymized Product-Data Report | 0/TBD | Not started | - |
| 4. Verified Guild Case Study | 0/TBD | Not started | - |
| 5. Internal Authority & Recrawl | 0/TBD | Not started | - |
| 6. Week-4 Review & Next Bet | 0/TBD | Not started | - |

## Requirement Coverage

| Requirement | Phase |
|-------------|-------|
| COPY-01 | Phase 2 |
| PROOF-01 | Phase 2 |
| PROOF-02 | Phase 2 |
| EVID-01 | Phase 3 |
| EVID-02 | Phase 3 |
| EVID-03 | Phase 3 |
| EVID-04 | Phase 4 |
| EVID-05 | Phase 4 |
| MEAS-01 | Phase 1 |
| MEAS-02 | Phase 1 |
| MEAS-03 | Phase 6 |
| LINK-01 | Phase 5 |
| LINK-02 | Phase 5 |

13 of 13 v1 requirements mapped. No orphans, no duplicates.

## Cross-Phase Notes

- **Full surface sweep**: Any phase that changes a feature, pricing, or positioning claim triggers the standing sweep across site, schema, Discord, GitHub, legal, and external posts. Phase 2 and Phase 3 are the likely triggers.
- **No em dashes** in any user-facing copy. Enforced repo-wide since #253.
- **Migration-only PRs** need `--admin` merge and auto-deploy to production about 12 seconds after merge. Only Phase 3 is likely to need schema or saved-query changes.
- **Copy sign-off** is a hard gate in Phase 2 and applies to the visible copy in Phases 3 and 4 as well. The sprint plan's copy is a starting point, not final text.

---
*Roadmap created: 2026-08-28*
