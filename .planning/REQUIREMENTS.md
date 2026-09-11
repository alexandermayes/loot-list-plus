# Requirements: LootList+ Search & AI Sprint Completion

**Defined:** 2026-08-27
**Core Value:** An officer who lands on the site immediately understands the category, trusts checkable proof, and completes enough setup to become an activated guild (+30% weekly activated guilds by the Sep 18–24 cohort)

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Copy

- [x] **COPY-01**: Signup page shows the rewritten officer-intent copy (title, H1, body, CTA, secondary link), taste-checked against the established hero voice, no em dashes

### Proof

- [x] **PROOF-01**: Every homepage testimonial displays name/character, role, guild, expansion/tier, interview date, and a verification link or "Verified LootList+ customer" note
- [x] **PROOF-02**: Unsupported claims (e.g. "3+ hours saved a week") are removed or replaced with checkable product facts

### Evidence

- [x] **EVID-01**: Anonymized data report is published at `/research/wow-classic-loot-systems-2026` with methodology, date range, sample definitions, and at least 3 findings, each published segment ≥10 guilds
- [x] **EVID-02**: Every published report number reproduces from a saved query committed to the repo
- [x] **EVID-03**: Report page is self-canonical, in the sitemap, with metadata/structured data matching visible content and a contextual CTA
- [x] **EVID-04**: Case study page template exists at `/customers/{guild-slug}` following the plan's format (outcome H1, proof strip, before/after, credible limitation)
- [ ] **EVID-05**: Case study is published with user-approved interview content (blocked on user-conducted guild interview)

### Measurement

- [x] **MEAS-01**: GSC baseline is exported and segmented into brand/competitor/problem/expansion query clusters (blocked on user regenerating GSC OAuth creds)
- [x] **MEAS-02**: Weekly AI-answer test set (the plan's 6 fixed prompts) has a runbook and a results log recording date, product inclusion, factual accuracy, cited URL
- [ ] **MEAS-03**: Week-4 review compares the Sep 18–24 cohort to the Aug 24–30 baseline and selects the next bet from observed queries

### Linking

- [x] **LINK-01**: Homepage, Compare, Pricing, About, report, case study, and relevant guides interlink contextually with descriptive anchor text
- [ ] **LINK-02**: Sitemap `lastmod` is accurate and one-time recrawl requests are made after all content is final

## v2 Requirements

Deferred. Tracked but not in current roadmap.

(None — remaining sprint items either ship in this milestone or are explicitly out of scope.)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Sprint #8: Reddit/Blizzard dated corrections | Founder-owned external accounts; user deferred out of this milestone |
| Sprint #13: CurseForge listing + walkthrough video | Requires user's CurseForge/YouTube accounts; deferred |
| New blog volume / keyword-variant pages | Plan explicitly forbids; evidence content only |
| llms.txt, purchased backlinks, AI listicles | Plan's "what not to do" list |
| Separate TMB/DKP/EPGP articles | Not until GSC shows Compare page can't capture the queries |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COPY-01 | Phase 2 | Complete |
| PROOF-01 | Phase 2 | Complete |
| PROOF-02 | Phase 2 | Complete |
| EVID-01 | Phase 3 | Complete |
| EVID-02 | Phase 3 | Complete |
| EVID-03 | Phase 3 | Complete |
| EVID-04 | Phase 4 | Complete |
| EVID-05 | Phase 4 | Blocked (user interview) |
| MEAS-01 | Phase 1 | Complete |
| MEAS-02 | Phase 1 | Complete |
| MEAS-03 | Phase 6 | Pending |
| LINK-01 | Phase 5 | Complete |
| LINK-02 | Phase 5 | Partially complete: sitemap and dates done; 9 of 11 recrawl requests submitted 2026-09-10, 2 blocked by the daily Search Console quota (why-attendance-tracking-matters-more-than-loot-rules, how-to-set-up-a-fair-loot-system-for-your-wow-guild); closes when both carry a request date in scripts/analytics/RECRAWL-LOG.md |

**Coverage:**

- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

**Blocked on user action** (structured as explicit phase checkpoints, not assumed):

- ~~MEAS-01 (Phase 1)~~ RESOLVED 2026-08-28: GSC OAuth credentials restored and verified working
- EVID-05 (Phase 4): as of 2026-09-06, Phase 4 shipped the tested page template and the committed interview kit (`04-INTERVIEW-KIT.md`); only the content remains blocked. User must conduct the guild interview and obtain written quote approval; the unblock path from an approved interview to a live page is `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md`.

---
*Requirements defined: 2026-08-27*
*Last updated: 2026-08-28 after roadmap creation*
