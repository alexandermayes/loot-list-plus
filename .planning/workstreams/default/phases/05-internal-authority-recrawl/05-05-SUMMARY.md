---
phase: 05-internal-authority-recrawl
plan: 05
subsystem: content
tags: [seo, internal-linking, nextjs, vitest, blog, research-report]

# Dependency graph
requires:
  - phase: 03-anonymized-product-data-report
    provides: the research report page and its 45 approved-copy strings (03-COPY-DRAFT.md), which this plan links around but never edits
  - phase: 05-internal-authority-recrawl (plan 03)
    provides: 05-COPY-DRAFT.md, the consolidated D-05 sign-off table naming every link this phase ships (page, sentence, anchor text, target)
provides:
  - The report page linking out to /compare and /pricing via two new connective paragraphs, outside the approved-copy resolver, with no new heading
  - All six D-03 topic-matched blog guides linking in to the research report, one approved anchor each, byte for byte
  - app/blog/__tests__/guide-report-links.test.tsx, a parameterized suite over all nine blog posts proving both link directions and the density ceiling
  - The final linked-guide URL list, cross-checked against 05-COPY-DRAFT.md's RECRAWL-LIST with no disagreement
affects: [05-06, 05-07]

# Actuals (#2632)
actuals:
  tokens: 5392
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Outbound connective text on an approved-copy page declared as separate before/anchor/after object constants, deliberately outside the approved-copy record and its resolver, so the Phase 3 byte-match gate keeps asserting against 03-COPY-DRAFT.md alone"
    - "LINKED_GUIDES/UNLINKED_GUIDES test arrays partition all nine posts by current link status rather than final status, so the same invariant (arrays always name all nine posts) holds true at every point across a multi-task plan, not just at the end"
    - "Per-slug it.each cases instead of a single test looping over every rendered post, so one slow render under CPU load times out its own small test instead of spending the shared default timeout across all nine"

key-files:
  created:
    - app/blog/__tests__/guide-report-links.test.tsx
  modified:
    - app/research/wow-classic-loot-systems-2026/page.tsx
    - app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx
    - app/blog/loot-priority-lists-vs-loot-council/page.tsx
    - app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx
    - app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx
    - app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx
    - app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx
    - app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx

key-decisions:
  - "COMPARE_CONNECTIVE and PRICING_CONNECTIVE declared as before/anchor/after object constants outside APPROVED_STRINGS and its approved() resolver, per D-04, so the two new sentences never touch the byte-matched Phase 3 copy record"
  - "LINKED_GUIDES/UNLINKED_GUIDES split by row order across tasks 2 and 3 (first three guides, then remaining three), with the not-yet-wired approved guides temporarily counted as unlinked so the 'arrays name all nine posts' invariant and the vitest exit-0 gate both hold true after every task, not just the last one"
  - "Split two loop-over-all-nine-posts test cases into per-slug it.each cases, and gave the one remaining whole-corpus aggregate test an explicit 15s timeout, after observing default-5000ms timeout flakiness in a concurrent-CPU-load environment (fix scoped to this plan's own new test file)"

requirements-completed: [LINK-01]

coverage:
  - id: D1
    description: "The report page links out to /compare and /pricing from new connective text outside every 03-COPY-DRAFT.md approved string, with no new heading and the existing copy-parity, heading-count, and CTA assertions unchanged"
    requirement: "LINK-01"
    verification:
      - kind: unit
        ref: "app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx (32/32 passing, including 7 new Phase 5 assertions)"
        status: pass
      - kind: other
        ref: "task 1 automated verify: exactly one /compare link, one /pricing link, one CTA host link, no APPROVED_STRINGS diff, all 45 Phase 3 approved strings still present verbatim except the pre-existing page.read-time recalculation (see Issues Encountered)"
        status: pass
    human_judgment: false
  - id: D2
    description: "All six D-03 topic-matched guides carry exactly one inline anchor to the research report, byte for byte; the three excluded guides carry zero; no guide exceeds the one-link ceiling"
    requirement: "LINK-01"
    verification:
      - kind: unit
        ref: "app/blog/__tests__/guide-report-links.test.tsx (36/36 passing: per-slug linked/unlinked cases, whole-corpus count assertion, no-generic-anchor and no-case-study-link sweeps)"
        status: pass
      - kind: other
        ref: "task 3 automated verify: linked-guide count (6) equals approved-anchor count (6), no post exceeds one report link, no date field touched"
        status: pass
    human_judgment: false
  - id: D3
    description: "Full regression battery (958 tests across 51 files, typecheck) stays green after the link sweep; no new lint/build finding beyond the documented pre-existing local baseline"
    verification:
      - kind: integration
        ref: "npm test (958/958 passing), npm run typecheck (clean)"
        status: pass
      - kind: other
        ref: "npm run build reproduces the pre-existing local NEXT_PUBLIC_SUPABASE_URL prerender failure on /api/guild-count, unrelated to any file this plan touches (see Issues Encountered)"
        status: unknown
    human_judgment: true
    rationale: "npm run build cannot be proven green in this local environment (missing Supabase env var, a documented pre-existing local-only condition per the user's own project notes); a human with production env access or CI should confirm the build gate independently of this local run."

duration: 50min
completed: 2026-09-08
status: complete
---

# Phase 5 Plan 5: Internal Authority Link Sweep (Report <-> Guides) Summary

**Report page now links out to /compare and /pricing via two new connective paragraphs outside the approved-copy record, and all six topic-matched blog guides link in to the research report with the approved anchor text, proven both directions by a 36-case parameterized test suite over all nine posts.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-08T04:46:00Z (approx)
- **Completed:** 2026-09-08T05:37:00Z
- **Tasks:** 3
- **Files modified:** 9 (1 created, 8 modified)

## Accomplishments

- The research report page (`/research/wow-classic-loot-systems-2026`) now links out to `/compare` and `/pricing`, each via a new plain `<p>` sibling outside the prose wrapper, next to the existing contextual CTA block, with no new heading and no edit inside `APPROVED_STRINGS`.
- All six D-03 topic-matched guides (`loot-priority-lists-vs-loot-council`, `dkp-is-dead-what-classic-guilds-use-in-2026`, `how-to-handle-loot-drama-without-losing-raiders`, `how-to-run-loot-without-a-spreadsheet`, `why-attendance-tracking-matters-more-than-loot-rules`, `how-to-set-up-a-fair-loot-system-for-your-wow-guild`) now carry exactly one inline anchor to the report, in the sign-off's approved wording, at the sentence the sign-off row named.
- `app/blog/__tests__/guide-report-links.test.tsx` proves both link directions across the entire nine-post corpus: six positive cases, three negative cases (the two excluded guides plus the officer-burnout guide), a whole-corpus count assertion, and sweeps for generic anchors and case-study links.
- The final linked-guide URL set (6 blog URLs) matches `05-COPY-DRAFT.md`'s `RECRAWL-LIST` blog entries exactly, with no disagreement to report.

## Task Commits

Each task was committed atomically:

1. **Task 1: The report page's outbound connective text to /compare and /pricing** - `c5fd816` (feat)
2. **Task 2: The parameterized guide suite and the first half of the approved guide subset** - `c28551e` (feat)
3. **Task 3: The remaining approved guides, and the whole-suite battery over both link directions** - `a259b98` (feat)

**Plan metadata:** commit for this SUMMARY follows (see final_commit step).

## Files Created/Modified

- `app/research/wow-classic-loot-systems-2026/page.tsx` - Adds `COMPARE_CONNECTIVE`/`PRICING_CONNECTIVE` constants and renders them as two plain `<p>` siblings outside the prose wrapper
- `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` - Extends the existing suite with 7 new assertions for the two outbound links, unchanged heading counts, unchanged CTA, no case-study links, and no new structured-data type
- `app/blog/__tests__/guide-report-links.test.tsx` - New parameterized suite (36 tests) over all nine blog posts, proving the link sweep in both directions
- `app/blog/loot-priority-lists-vs-loot-council/page.tsx` - Adds inline anchor to the report ("the median loot list runs 18 items long")
- `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` - Adds inline anchor ("29.5% of awarded items go to a top-priority-bracket rank")
- `app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx` - Adds inline anchor ("45.5% turn on bad-luck protection for exactly this reason")
- `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` - Adds inline anchor ("84.8% of active guilds run attendance settings that differ from the defaults")
- `app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx` - Adds inline anchor ("how 84.8% of active guilds tune their attendance weighting")
- `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` - Adds inline anchor ("raiders rank lists that run a median of 18 items long")

## Decisions Made

- `COMPARE_CONNECTIVE`/`PRICING_CONNECTIVE` are separate before/anchor/after object constants outside `APPROVED_STRINGS`, per D-04, keeping the Phase 3 byte-match gate asserting only against 03-COPY-DRAFT.md.
- The test suite's `LINKED_GUIDES`/`UNLINKED_GUIDES` arrays are split by sign-off row order across tasks 2 and 3, with not-yet-wired approved guides temporarily counted as unlinked, so the "arrays name all nine posts" invariant and each task's own `npx vitest run` exit-0 gate both hold at every point in the plan, not only at the end.
- Two loop-over-all-nine-posts test cases were split into per-slug `it.each` cases (Rule 1 auto-fix), after observing default-5000ms-timeout flakiness under concurrent CPU load in this parallel-worktree environment; the one remaining whole-corpus aggregate assertion was given an explicit 15s timeout instead.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed timeout-prone loop-based RTL tests in the new guide test file**
- **Found during:** Task 3 (running the whole-suite battery)
- **Issue:** Two test cases in `guide-report-links.test.tsx` rendered all nine blog posts in a single `it()` block; under the concurrent CPU load of this parallel-worktree wave, one of these exceeded vitest's default 5000ms per-test timeout on a full-suite run (reproduced once, non-deterministically, alongside unrelated failures in files this plan never touches)
- **Fix:** Split both loops into `it.each(Object.keys(POSTS))` per-slug cases; gave the one remaining necessarily-aggregate assertion (the whole-corpus link count) an explicit 15000ms timeout
- **Files modified:** `app/blog/__tests__/guide-report-links.test.tsx`
- **Verification:** Re-ran the guide suite standalone (36/36 passing, 7.7s) and the full `npm test` battery twice more (958/958 passing both times) with no further flake in this file
- **Committed in:** `a259b98` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for a reliably green test suite under concurrent-agent CPU load. No scope creep -- the fix is contained to this plan's own new test file.

## Issues Encountered

- **Pre-existing, unrelated `npm test` flakiness under concurrent CPU load.** Two separate full-suite `npm test` runs during this plan's execution each surfaced a different set of 1 to 12 timeout failures, all in files this plan never touches (`app/(app)/raid-tracking/components/__tests__/RaidCardHeader.test.tsx`, `RaidMemberList.test.tsx`, `ImportModal.test.tsx`, `SkipDayModal.test.tsx`, and `app/customers/[slug]/__tests__/page.test.tsx`). Every one of these files passed cleanly when run in isolation. This plan is one of two executors running concurrently in separate worktrees (per the parallel-execution context), and the failures are consistent with CPU-contention-driven `userEvent`/timer timeouts, not a deterministic regression. A third full run, after the Task 3 fix above, passed 958/958 with zero failures. Not fixed (out of scope: none of the failing files were modified by this plan).
- **Pre-existing local `npm run build` failure, unrelated to this plan.** `npm run build` fails prerendering `/api/guild-count` with `NEXT_PUBLIC_SUPABASE_URL is required`, reproduced identically before and after this plan's changes. This is a documented pre-existing local-environment condition (missing Supabase credentials in this local checkout), not caused by any file this plan modified. TypeScript compilation and the Next.js build's own compile step both succeeded; only the API route's static prerendering, which needs a live Supabase URL, failed. Recorded in the SUMMARY's `coverage` block (D3) as `human_judgment: true` since this local run cannot prove the build gate green; CI or a human with production env access should confirm it independently.
- **Pre-existing false positive in Task 1's own automated verify script.** The Phase 3 approved-string parity check flags `page.read-time` as "missing" because the report page ships the value recalculated to "7 min read" (per plan 03-06, an explicitly sanctioned recalculation recorded in `03-COPY-DRAFT.md` Section G4 and in `page.tsx`'s own comment), while `03-COPY-DRAFT.md`'s literal `APPROVED-STRING` line still reads the pre-recalculation placeholder "6 min read". Confirmed via `git log -p` that this divergence predates this plan by several commits (introduced in plan 03-06) and that Task 1 never touched `page.read-time`. Every other Phase 3 approved string (44 of 45) matches verbatim. Not fixed (out of scope: pre-existing condition unrelated to this plan's changes).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05-06 (the dates module) can now enumerate exactly which pages this plan visibly changed: the report page and the six linked guides. No date field (`dateModified`, `datePublished`, `publishedTime`) was touched by this plan, preserving 05-06's ownership of every date value.
- Plan 05-07 (or the recrawl checkpoint) has the exact linked-guide URL list, already cross-checked against `05-COPY-DRAFT.md`'s `RECRAWL-LIST` with no disagreement -- the six blog URLs recorded there are exactly the six this plan wired.
- No blocker for the next plan in this phase.

---
*Phase: 05-internal-authority-recrawl*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: app/blog/__tests__/guide-report-links.test.tsx
- FOUND: app/research/wow-classic-loot-systems-2026/page.tsx
- FOUND: .planning/phases/05-internal-authority-recrawl/05-05-SUMMARY.md
- FOUND commit: c5fd816 (feat(05-05): report page links out to /compare and /pricing)
- FOUND commit: c28551e (feat(05-05): wire first three guides to the research report)
- FOUND commit: a259b98 (feat(05-05): wire remaining guides and prove both link directions)
- FOUND commit: 661b172 (docs(05-05): complete internal authority link sweep plan)
