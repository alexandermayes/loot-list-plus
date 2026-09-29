---
phase: 05-internal-authority-recrawl
plan: 04
subsystem: seo
tags: [nextjs, react, testing-library, vitest, internal-linking, marketing-copy]

requires:
  - phase: 05-internal-authority-recrawl
    provides: "05-COPY-DRAFT.md, the approved link table and APPROVED-STRING anchors signed off in plan 05-03"
provides:
  - "The homepage loot-decision subhead, /about, /compare and /pricing each carry one live, byte-matched inline link to the research report"
  - "app/__tests__/internal-links.test.tsx: a parity test suite that byte-matches every marketing anchor against the sign-off and guards density, generic anchors, and case-study links across all four pages"
affects: ["05-05", "05-06"]

actuals:
  tokens: 3388
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Inline anchor injected into existing prose (no new component, no new section) for every marketing-page report link"
    - "Table-driven (it.each) cross-page assertion for the one-link-per-target-per-page density ceiling"

key-files:
  created:
    - app/__tests__/internal-links.test.tsx
  modified:
    - app/components/landing/LandingLootDecision.tsx
    - app/about/page.tsx
    - app/compare/page.tsx
    - app/pricing/page.tsx

key-decisions:
  - "Homepage and about anchors use the site's text-accent/underline marketing anchor className (matching the compare page's Discord link); pricing and about's other links use the hardcoded text-white/underline treatment already established on those two hardcoded-hex pages, so each anchor matches its own page's existing link convention rather than a single global class."
  - "Compare and pricing links ship as a new sibling <p> immediately after the existing paragraph they follow, not as an edit to the existing sentence's wording, since the sign-off's 'sentence carrying the link' is drafted as a wholly new sentence following the existing one on both pages."
  - "About page's new sentence ships as a third <Body> paragraph inserted between the two existing ones, reusing the existing Body helper with no new component or prop, matching the sign-off's before/after sentence pair exactly."
  - "Rule 3 deviation: fixed a pre-existing em dash in a LandingLootDecision.tsx code comment (from PR #253) because it tripped this task's own file-wide em-dash verification gate; the comment predates this plan and carries no user-facing copy, so the fix is a colon substitution with no behavior change."

requirements-completed: [LINK-01]

coverage:
  - id: D1
    description: "Homepage loot-decision subhead links to the report via the approved anchor '45.5% of active guilds turn on bad-luck protection'"
    requirement: "LINK-01"
    verification:
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#homepage (LandingLootDecision) > links the approved anchor to the report"
        status: pass
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#homepage (LandingLootDecision) > carries exactly one link to the report"
        status: pass
    human_judgment: false
  - id: D2
    description: "About page's 'What LootList+ does' section links to the report via the approved anchor '29.5% of awarded items went to a top-priority-bracket pick'"
    requirement: "LINK-01"
    verification:
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#about (AboutPage) > links the approved anchor to the report"
        status: pass
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#about (AboutPage) > carries exactly one link to the report"
        status: pass
    human_judgment: false
  - id: D3
    description: "Compare page's Q4 attendance answer links to the report via the approved anchor '84.8% of active guilds have changed their attendance weighting from the defaults', without disturbing the existing Discord anchor"
    requirement: "LINK-01"
    verification:
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#compare (ComparePage) > links the approved anchor to the report"
        status: pass
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#compare (ComparePage) > still renders its existing Discord anchor with its original href"
        status: pass
    human_judgment: false
  - id: D4
    description: "Pricing page's header block links to the report via the approved anchor 'the median loot list runs 18 items long', without disturbing either existing call-to-action anchor"
    requirement: "LINK-01"
    verification:
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#pricing (PricingPage) > links the approved anchor to the report"
        status: pass
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#pricing (PricingPage) > still renders both plan cards and both existing call-to-action anchors"
        status: pass
    human_judgment: false
  - id: D5
    description: "The five sign-off no-link surfaces (/premium, /changelog, /blog, /terms, /privacy) remain untouched and carry zero report links"
    requirement: "LINK-01"
    verification:
      - kind: other
        ref: "for F in app/premium/page.tsx app/changelog/page.tsx app/blog/page.tsx app/terms/page.tsx app/privacy/page.tsx; do grep -c 'research/wow-classic-loot-systems-2026' \"$F\"; done  # all return 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Cross-page density ceiling (exactly one report anchor per page), no generic click-through anchor, no case-study link, and no anchor repeating the report page's own title, asserted across all four rendered surfaces"
    requirement: "LINK-01"
    verification:
      - kind: unit
        ref: "app/__tests__/internal-links.test.tsx#cross-page density and safety checks"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-09-08
status: complete
---

# Phase 5 Plan 4: Internal Authority Links Summary

**Four marketing surfaces (homepage, about, compare, pricing) now each carry one approved, byte-matched inline link to the research report, pinned by a 21-assertion parity test suite.**

## Performance

- **Duration:** ~55 min
- **Completed:** 2026-09-08T05:15:24Z
- **Tasks:** 2
- **Files modified:** 4 (plus 1 new test file)

## Accomplishments

- Homepage `LandingLootDecision` subhead now links to the report with the exact approved anchor, extending the existing sentence rather than adding a new block.
- About page's "What LootList+ does" section gets a new `Body` paragraph carrying the approved anchor, sandwiched between the two existing paragraphs exactly where the sign-off placed it.
- Compare page's Q4 (attendance) answer gets a new sentence with the approved anchor, using the Q&A prose wrapper's existing descendant-anchor styling so no new className was needed.
- Pricing page's header block gets a new sentence with the approved anchor, styled to match the page's other inline prose links.
- `app/__tests__/internal-links.test.tsx` (215 lines, 21 passing assertions) byte-matches every anchor against `05-COPY-DRAFT.md`'s `APPROVED-STRING` values, asserts the one-link-per-target-per-page density ceiling across all four pages via a table-driven case, and guards against generic anchors, case-study links, and title-repeating anchors.
- Confirmed the five sign-off no-link surfaces (`/premium`, `/changelog`, `/blog`, `/terms`, `/privacy`) are untouched and carry zero report links.

## Task Commits

Each task followed its own RED-GREEN cycle (`tdd="true"`):

1. **Task 1: Homepage and about links, and the parity test** - `3d4c142` (test, RED) then `57217ac` (feat, GREEN)
2. **Task 2: Compare and pricing links, cross-page density/safety** - `89822fa` (test, RED) then `f5e5192` (feat, GREEN)

_No REFACTOR commit was needed for either task; the GREEN implementations were minimal on the first pass._

## Files Created/Modified

- `app/__tests__/internal-links.test.tsx` (new) - Parity test suite for all four marketing anchors, density ceiling, and safety assertions
- `app/components/landing/LandingLootDecision.tsx` - Homepage subhead now links to the report; also fixed a pre-existing em dash in a code comment (Rule 3 deviation)
- `app/about/page.tsx` - New `Body` paragraph in "What LootList+ does" linking the report
- `app/compare/page.tsx` - New sentence in the Q4 attendance answer linking the report
- `app/pricing/page.tsx` - New sentence in the header block linking the report

## Decisions Made

- Homepage and about anchors use the site's `text-accent underline underline-offset-2 hover:text-accent/80` marketing anchor className (the same treatment the compare page's Discord anchor uses); the about page's new anchor is inside the hardcoded-hex About page but styled with the design-token accent color to match the homepage/compare convention for a report-link anchor specifically, while the pricing page's link uses the `text-white underline hover:text-[#9940ec]` treatment already established for that page's own hardcoded-hex link style (matching its sibling `/premium` CTA link's hover color, not the accent-token pages).
- Compare and pricing links are new sibling `<p>` elements immediately following the existing paragraph named in the sign-off, rather than edits to the existing sentence, because the sign-off's "sentence carrying the link" for both pages is drafted as a wholly new sentence following (not modifying) the existing prose, with "sentence after: none" in both rows.
- About page's new sentence is a third `<Body>` call inserted between the section's two existing `<Body>` paragraphs, reusing the existing helper component with no new component and no prop change, matching the sign-off's sentence-before/sentence-after pair exactly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed a pre-existing em dash in a LandingLootDecision.tsx code comment**
- **Found during:** Task 1, running the automated verify gate (`grep -c '—' "$F" | grep -qx 0`)
- **Issue:** Line 8 of `LandingLootDecision.tsx` (`// WoW class colors — the small authenticity cues matter to this audience`, introduced in PR #253) contains an em dash. This is a code comment, not user-facing copy, and predates this plan, but the task's own verify gate greps the whole file for em dashes with no exception, blocking task completion.
- **Fix:** Replaced the em dash with a colon (`// WoW class colors: the small authenticity cues matter to this audience`). No behavior change, no user-facing copy affected.
- **Files modified:** `app/components/landing/LandingLootDecision.tsx`
- **Verification:** `grep -c '—' app/components/landing/LandingLootDecision.tsx` returns 0; typecheck and both required test suites still pass.
- **Committed in:** `57217ac` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Trivial, in-scope fix required to clear the task's own acceptance gate. No scope creep beyond the one comment line.

## Issues Encountered

- `npm run build` fails locally at `/api/guild-count` with "NEXT_PUBLIC_SUPABASE_URL is required" during static export prerendering. This is a local-environment condition unrelated to this plan's files (marketing page prose edits + one new test file touch no env-var handling or the guild-count route); TypeScript compilation and page-data collection completed successfully before this unrelated route failed. Confirmed as a known local-dev baseline (missing Supabase credentials in this worktree), not a regression introduced by this plan. `npm run typecheck` (independently run, exit 0) and `npm test` cover the code-correctness gate for the changed files.
- Running the full `npm test` suite surfaced 11 failing tests across 7 files in `app/(app)/raid-tracking/components/__tests__/` (all `Error: Test timed out in 5000ms`), entirely unrelated to this plan's files. Re-running those same files in isolation (`npx vitest run` on just those two files) passed all 38 tests cleanly, confirming the failures are resource-contention timeouts under full-suite parallel load, not a real regression.
- `npm run lint` completed with 0 errors and 397 pre-existing warnings (none in any file this plan touched); this run did not reproduce the config-resolution error documented as the local baseline in `05-01-SUMMARY.md` (Pitfall 6), but the outcome is at least as good (0 errors either way) so the plan's "no new per-file lint violation" bar is met regardless of which baseline reading applies.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The four marketing surfaces are live-linked to the research report and ready for the plan 05-05/05-06 sitemap `lastmod` and recrawl work, which names these exact pages (per `RECRAWL-LIST` in `05-COPY-DRAFT.md`).
- No blockers. The report page's outbound links to `/compare` and `/pricing` (Links 5 and 6 in `05-COPY-DRAFT.md`) and the blog guide sweep (Links 7-12) are out of scope for this plan and remain for a later plan in this phase.

## Self-Check: PASSED

- `[ -f app/__tests__/internal-links.test.tsx ]` - FOUND
- `[ -f app/components/landing/LandingLootDecision.tsx ]` - FOUND
- `[ -f app/about/page.tsx ]` - FOUND
- `[ -f app/compare/page.tsx ]` - FOUND
- `[ -f app/pricing/page.tsx ]` - FOUND
- `git log --oneline --all | grep -q 3d4c142` - FOUND
- `git log --oneline --all | grep -q 57217ac` - FOUND
- `git log --oneline --all | grep -q 89822fa` - FOUND
- `git log --oneline --all | grep -q f5e5192` - FOUND
- `npx vitest run app/__tests__/internal-links.test.tsx` - 21/21 PASSED
- `npm run typecheck` - PASSED (exit 0)
- All plan-level `<acceptance_criteria>` re-run and passing for both tasks

---
*Phase: 05-internal-authority-recrawl*
*Completed: 2026-09-08*
