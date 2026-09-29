---
phase: 02-checkable-conversion-copy
plan: 06
subsystem: copy-repositioning
tags: [copy, positioning, seo, legal-text, manifest]
requires: []
provides: [about-page-broadened, terms-page-broadened, privacy-page-broadened, hero-body-broadened, manifest-superlative-removed, readme-broadened]
affects: [app/about/page.tsx, app/terms/page.tsx, app/privacy/page.tsx, app/components/landing/LandingHero.tsx, public/site.webmanifest, README.md]
actuals: {tokens: 1281, tasks: 2, commits: 2}
tech-stack: {added: [], patterns: []}
key-files:
  created: []
  modified:
    - app/about/page.tsx
    - app/terms/page.tsx
    - app/privacy/page.tsx
    - app/components/landing/LandingHero.tsx
    - public/site.webmanifest
    - README.md
key-decisions:
  - "Applied all six APPROVED-STRING values from 02-COPY-DRAFT.md byte for byte; no wording re-litigated"
  - "README.md's opening description and app/layout.tsx's metadata.description share an identical lead clause through '...reserve runs' but diverge in their trailing clause (README links to getlootlist.com/pricing; layout.tsx states the per-guild price). Both endings are separately approved in 02-COPY-DRAFT.md's sign-off and this divergence pre-dates this plan (it existed in the shipped source before any edit here) — flagged per the task's instruction rather than silently resolved, not treated as a defect since the user already signed off on both distinct strings"
patterns-established: []
requirements-completed: []
coverage:
  - id: D1
    description: "About, Terms, Privacy body/metadata broadened from WoW Classic / World of Warcraft Classic to World of Warcraft"
    requirement: "PROOF-02"
    verification: [{kind: unit, ref: "grep residual-allowance parity + npm run typecheck", status: pass}]
    human_judgment: false
  - id: D2
    description: "Marketing hero body paragraph broadened; H1 and shimmer span untouched"
    requirement: "PROOF-02"
    verification: [{kind: unit, ref: "git diff scoped to LandingHero.tsx line 135 only", status: pass}]
    human_judgment: false
  - id: D3
    description: "public/site.webmanifest description drops 'the ultimate' superlative and 'Classic'; stays valid JSON"
    requirement: "PROOF-02"
    verification: [{kind: unit, ref: "node -e JSON.parse(...) + grep -ci 'the ultimate'", status: pass}]
    human_judgment: false
  - id: D4
    description: "README.md opening description broadened to match the approved product-description phrase"
    requirement: "PROOF-02"
    verification: [{kind: unit, ref: "manual diff against APPROVED-STRING: repos.README.md.3", status: pass}]
    human_judgment: false
duration: 25min
completed: 2026-08-31
status: complete
---

# Phase 2 Plan 06: About/Terms/Privacy/Hero/Manifest/README Repositioning Summary

**Broadened the last six in-repo prose and config surfaces from "WoW Classic"/"World of Warcraft Classic" to "World of Warcraft," and deleted the "ultimate loot management system" superlative from the web app manifest.**

## Performance

- Duration: ~25 minutes
- Tasks: 2/2 completed
- Files modified: 6 (app/about/page.tsx, app/terms/page.tsx, app/privacy/page.tsx, app/components/landing/LandingHero.tsx, public/site.webmanifest, README.md)

## Accomplishments

- Task 1: Broadened the About page's Metadata `title` and `description`, the Terms page's Metadata `description` and body sentence defining the service, and the Privacy page's body sentence defining the service. The five-expansion list on `/about` (Classic Era through Mists of Pandaria) was left byte-identical, confirmed by `grep -c 'Mists of Pandaria'` still returning 1.
- Task 2: Broadened the marketing hero's body paragraph (`LandingHero.tsx` line 135) without touching the H1, shimmer span, counter fetch, or any className. Replaced `public/site.webmanifest`'s `description` with the approved string, removing both "the ultimate" superlative and "Classic," and confirmed the file still parses as valid JSON. Replaced `README.md`'s opening description with its approved broadened string. Ran the full gate battery: `npm run typecheck`, `npm test` (768 tests passed), `npm run lint` (0 errors, 397 pre-existing warnings unrelated to this plan's files), diff-scoped em-dash grep (no output), and confirmed Section F of `02-COPY-DRAFT.md` (the external handoff checklist) exists.

## Task Commits

- `d6ab089`: docs(02-06): broaden positioning on About, Terms, and Privacy
- `63cecda`: docs(02-06): broaden hero copy, strip manifest superlative, align README

## Files Created/Modified

- `app/about/page.tsx` — Metadata `title` and `description` broadened; expansion list untouched
- `app/terms/page.tsx` — Metadata `description` and body sentence broadened
- `app/privacy/page.tsx` — Body sentence broadened
- `app/components/landing/LandingHero.tsx` — Hero body paragraph broadened; H1 untouched
- `public/site.webmanifest` — `description` key replaced, superlative removed, still valid JSON
- `README.md` — Opening product description broadened

## Decisions Made

- Applied all six `APPROVED-STRING` values from `02-COPY-DRAFT.md` verbatim, unescaped, unquoted, with no rewording.
- Flagged (not silently resolved) that `README.md`'s opening description and `app/layout.tsx`'s `metadata.description` share an identical lead clause through "...reserve runs" but diverge in their trailing clause: `README.md` ends with "Learn more at [getlootlist.com](https://www.getlootlist.com) or compare plans on the [pricing page](https://www.getlootlist.com/pricing)." while `app/layout.tsx`'s approved value (`repos.app/layout.tsx.39`, shipped by sibling plan 02-05, out of this plan's scope) ends with "...for $4.99 per month or $39 per year per guild." This divergence pre-dates this plan — it already existed in the shipped source before any edit here — and both distinct endings are separately named and signed off in `02-COPY-DRAFT.md`'s Section E Approved subsection (2026-08-30). Not treated as a defect to fix; documented here per the task's "surface the divergence with both strings quoted" instruction rather than resolved unilaterally.

## Deviations from Plan

None - plan executed exactly as written. All six files matched the plan's `read_first` expectations byte for byte before editing; no unexpected drift was found.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Per D-14, the Discord server description, the GitHub repository description field, and old external posts (Reddit, Blizzard forum) remain founder-owned and unedited by this plan. The handoff checklist for those three items exists at `02-COPY-DRAFT.md` Section F ("External handoff checklist (D-14)") and is confirmed present; it is still outstanding work for the user to execute directly outside this repo.

## Next Phase Readiness

All six surfaces this plan owns now describe the product's scope consistently ("World of Warcraft," not "WoW Classic" / "World of Warcraft Classic"), and the manifest no longer claims to be "the ultimate" anything. Requirement PROOF-02's in-repo scope for this plan's six files is satisfied; REQUIREMENTS.md reconciliation is deferred to the orchestrator per the shared-ID note (multiple sibling plans in this phase declare PROOF-02).

## Self-Check: PASSED

- FOUND: app/about/page.tsx
- FOUND: app/terms/page.tsx
- FOUND: app/privacy/page.tsx
- FOUND: app/components/landing/LandingHero.tsx
- FOUND: public/site.webmanifest
- FOUND: README.md
- FOUND commit: d6ab089
- FOUND commit: 63cecda
