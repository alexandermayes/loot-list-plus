---
phase: 05-internal-authority-recrawl
plan: 07
subsystem: seo
tags: [nextjs, vitest, jsonld, structured-data, blog, sitemap]

# Dependency graph
requires:
  - phase: 05-internal-authority-recrawl
    provides: "05-06-SUMMARY.md's data/content-dates.json + lib/content-dates.ts module, and 05-05-SUMMARY.md's confirmed six-guide linked set"
provides:
  - "app/__tests__/blog-dates.test.tsx: the parity gate over all nine blog posts, comparing rendered JSON-LD dateModified, sitemap lastModified, and the dates module, with no exempt slug"
  - "All six linked guides' JSON-LD dateModified bumped to the deploy-two date (2026-09-08), matching their sitemap lastmod exactly"
  - "A corrected data/content-dates.json: how-to-onboard-new-raiders-without-killing-morale's entry fixed from a transcribed 2026-03-10 to the correct 2026-04-10"
affects: ["05-08", "05-09"]

# Actuals (#2632)
actuals:
  tokens: 4379
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BUMPED_SLUGS / NOT_YET_BUMPED_SLUGS / EXCLUDED_SLUGS partition, mirroring guide-report-links.test.tsx's LINKED_GUIDES/UNLINKED_GUIDES split: arrays always name all nine posts combined, with the boundary between bumped and not-yet-bumped moving across the plan's two tasks rather than the array shape changing"
    - "Rendering + parsing script[type=application/ld+json] to read a post's JSON-LD, since no blog post exports its jsonLd object; reused the getJsonLdObjects helper shape from the research report page test"
    - "Date-portion (YYYY-MM-DD) string comparison rather than full-timestamp equality, since the JSON-LD carries a time and Z suffix while the dates module holds a date-only string"

key-files:
  created:
    - app/__tests__/blog-dates.test.tsx
  modified:
    - app/blog/loot-priority-lists-vs-loot-council/page.tsx
    - app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx
    - app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx
    - app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx
    - app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx
    - app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx
    - data/content-dates.json

key-decisions:
  - "Rule 1 bug fix: data/content-dates.json recorded how-to-onboard-new-raiders-without-killing-morale as 2026-03-10, but the pre-existing sitemap literal (new Date(2026, 3, 10), a zero-indexed JS month) and the post's own datePublished/dateModified both read 2026-04-10. Corrected the module to 2026-04-10 rather than leaving an excluded-guide assertion to fail on a data bug unrelated to this plan's own work."
  - "The whole-corpus 'redated count equals linked-guide count' assertion compares the module's blogPostDate() value against each post's pre-milestone carried-forward date, not against the file's own rendered dateModified. This means the assertion is satisfied by 05-06's module-level bump alone and does not gate on this plan's own per-file bump progress, which is intentional: it proves the module itself did not silently redate an untouched post, independent of how many files have been individually bumped so far."
  - "BUMPED_SLUGS/NOT_YET_BUMPED_SLUGS split by the same sign-off row order 05-05 used for its own LINKED_GUIDES/UNLINKED_GUIDES split, keeping task boundaries consistent across the two plans that touch these same six guides."

requirements-completed: [LINK-02]

coverage:
  - id: D1
    description: "app/__tests__/blog-dates.test.tsx is the parity gate between each of the nine blog posts' rendered JSON-LD dateModified, the dates module, and the sitemap lastmod for that post, with no exempt slug and no skipped/pending case"
    requirement: "LINK-02"
    verification:
      - kind: unit
        ref: "app/__tests__/blog-dates.test.tsx (42/42 passing: per-slug dateModified/sitemap-agreement cases for all nine slugs, per-slug datePublished/publishedTime-unchanged cases for all nine slugs, per-slug excluded-guide module-date cases, a nine-slug count assertion, a missing-slug fail-by-name assertion, and the whole-corpus redated-count assertion)"
        status: pass
    human_judgment: false
  - id: D2
    description: "All six linked guides' JSON-LD dateModified equals the module's deploy-two date (2026-09-08), matching their sitemap lastmod exactly; the three excluded guides keep their pre-milestone dates unchanged"
    requirement: "LINK-02"
    verification:
      - kind: unit
        ref: "app/__tests__/blog-dates.test.tsx per-slug READY_SLUGS cases (dateModified-matches-module, sitemap-lastModified-matches-module)"
        status: pass
      - kind: other
        ref: "task 1 and task 2 automated verify: python3 dateModified-vs-module comparison for all 9 slugs, git diff precision check confirming no datePublished/publishedTime line changed in any bumped file, both in the working tree and against origin/main"
        status: pass
    human_judgment: false
  - id: D3
    description: "No post's datePublished or openGraph.publishedTime changed; a post that gained a sentence in 05-05 was modified, not republished. The full regression battery (sitemap, guide-report-links, npm test, typecheck) stays green"
    requirement: "LINK-02"
    verification:
      - kind: unit
        ref: "app/__tests__/blog-dates.test.tsx per-slug datePublished-unchanged and openGraph-consistency cases for all nine slugs"
        status: pass
      - kind: integration
        ref: "npx vitest run app/__tests__/sitemap.test.ts (17/17), npx vitest run app/blog/__tests__/guide-report-links.test.tsx (36/36), npm test (1049/1049), npm run typecheck (clean)"
        status: pass
      - kind: other
        ref: "npm run build reproduces the documented pre-existing local NEXT_PUBLIC_SUPABASE_URL prerender failure on /api/guild-count (05-01/05-05/05-06-SUMMARY.md baseline); TypeScript compiled and the Next.js compile step both succeeded"
        status: unknown
    human_judgment: true
    rationale: "npm run build cannot be proven fully green in this local environment (missing Supabase env var, a documented pre-existing local-only condition affecting only an unrelated API route's static prerendering); a human with production env access or CI should confirm the build gate independently of this local run."

duration: 45min
completed: 2026-09-08
status: complete
---

# Phase 5 Plan 7: Blog Post Date Parity Summary

**Added a 42-assertion parity gate (`app/__tests__/blog-dates.test.tsx`) proving every one of the nine blog posts' JSON-LD `dateModified` agrees with `data/content-dates.json` and the sitemap `lastmod`, bumped all six linked guides' structured data to the 2026-09-08 deploy-two date, and fixed a one-month transcription bug in the dates module along the way.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-08T11:26:00Z
- **Tasks:** 2
- **Files modified:** 8 (1 created, 7 modified)

## Accomplishments

- `app/__tests__/blog-dates.test.tsx` parameterizes over all nine blog posts with no exempt slug: per-slug `dateModified`-matches-module and sitemap-`lastModified`-matches-module cases, per-slug `datePublished`-unchanged and `openGraph.publishedTime`-consistency cases, a nine-slug count assertion, a fail-by-name assertion for a slug missing from the module, per-slug excluded-guide module-date checks, and a whole-corpus case proving the number of redated posts equals the number of linked guides (6).
- All six linked guides (`loot-priority-lists-vs-loot-council`, `dkp-is-dead-what-classic-guilds-use-in-2026`, `how-to-handle-loot-drama-without-losing-raiders`, `how-to-run-loot-without-a-spreadsheet`, `why-attendance-tracking-matters-more-than-loot-rules`, `how-to-set-up-a-fair-loot-system-for-your-wow-guild`) now carry `dateModified: '2026-09-08T00:00:00Z'` in their `jsonLd` object, matching `data/content-dates.json` and the sitemap's `lastModified` for that URL exactly. `datePublished` and `openGraph.publishedTime` are untouched in every file.
- The three excluded guides (`guild-recruitment-guide-find-raiders-who-stay`, `how-to-onboard-new-raiders-without-killing-morale`, `the-officer-burnout-problem-and-how-to-fix-it`) keep their pre-milestone dates, proven by a dedicated per-slug assertion comparing the module value against the date each post carried before this milestone.
- Fixed a real bug the new test surfaced: `data/content-dates.json` recorded `how-to-onboard-new-raiders-without-killing-morale` as `2026-03-10`, a one-month transcription error from plan 05-06 (the pre-existing sitemap literal used zero-indexed `new Date(2026, 3, 10)`, meaning April, not March). Corrected to `2026-04-10`, matching the post's own unedited `datePublished`/`dateModified`.

## Final nine-row table: slug, module date, JSON-LD dateModified, sitemap lastmod

All three columns agree for every slug, by design of the parity test.

| Slug | Module date | JSON-LD dateModified | Sitemap lastmod |
|------|-------------|----------------------|------------------|
| loot-priority-lists-vs-loot-council | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| dkp-is-dead-what-classic-guilds-use-in-2026 | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| how-to-handle-loot-drama-without-losing-raiders | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| how-to-run-loot-without-a-spreadsheet | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| why-attendance-tracking-matters-more-than-loot-rules | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| how-to-set-up-a-fair-loot-system-for-your-wow-guild | 2026-09-08 | 2026-09-08 | 2026-09-08 |
| guild-recruitment-guide-find-raiders-who-stay | 2026-05-21 | 2026-05-21 | 2026-05-21 |
| how-to-onboard-new-raiders-without-killing-morale | 2026-04-10 | 2026-04-10 | 2026-04-10 |
| the-officer-burnout-problem-and-how-to-fix-it | 2026-04-19 | 2026-04-19 | 2026-04-19 |

## Task Commits

Each task followed its own RED-GREEN cycle (`tdd="true"`):

1. **Task 1: The nine-post parity gate, and the first half of the date bumps** - `9082272` (test, RED, confirmed 3 of 35 assertions failing against the first three not-yet-bumped linked guides) then `101b9d0` (feat, GREEN, 35/35 passing)
2. **Task 2: The remaining date bumps and the whole-suite battery over both freshness signals** - `d5e855a` (test, RED, confirmed 3 of 42 assertions failing against the remaining three not-yet-bumped guides) then `4ffe363` (feat, GREEN, 42/42 passing)

_No REFACTOR commit was needed for either task; the GREEN implementations were minimal on the first pass._

## Files Created/Modified

- `app/__tests__/blog-dates.test.tsx` (new) - the 42-assertion parity gate over all nine blog posts
- `app/blog/loot-priority-lists-vs-loot-council/page.tsx` - `dateModified` bumped to `2026-09-08T00:00:00Z`
- `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` - `dateModified` bumped
- `app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx` - `dateModified` bumped
- `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` - `dateModified` bumped
- `app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx` - `dateModified` bumped
- `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` - `dateModified` bumped
- `data/content-dates.json` - fixed `how-to-onboard-new-raiders-without-killing-morale` from `2026-03-10` to `2026-04-10`

## Decisions Made

- The whole-corpus "redated count equals linked-guide count" assertion is a pure module-level check (`blogPostDate(slug)` vs. the pre-milestone carried-forward value), independent of per-file bump progress. This is why it already passed at the start of task 2, before that task's own three file bumps landed: plan 05-06 redated the module for all six linked guides in one commit, and this assertion is designed to catch the module itself silently redating an untouched post, not to gate on this plan's own file-level progress.
- Fixed the `how-to-onboard-new-raiders-without-killing-morale` transcription bug in `data/content-dates.json` (Rule 1) rather than leaving it, since the plan's own excluded-guide assertion would otherwise fail on a genuine pre-existing data error unrelated to anything this plan changed, and a false "the module redated an untouched guide" failure would have obscured the real bug (an off-by-one-month value, not a freshness violation).
- Kept `NOT_YET_BUMPED_SLUGS` as a named, empty array after task 2 rather than deleting it, so the test file's structural shape (three named arrays combining to `ALL_SLUGS`) stays legible as a record of how the plan split its own work across two tasks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a one-month transcription error in data/content-dates.json**
- **Found during:** Task 1, read_first review of `data/content-dates.json` cross-checked against the pre-existing sitemap literal
- **Issue:** `data/content-dates.json` recorded `how-to-onboard-new-raiders-without-killing-morale` as `2026-03-10`. The pre-existing (pre-05-06) `app/sitemap.ts` literal was `new Date(2026, 3, 10)`, and JavaScript's `Date` constructor takes a zero-indexed month, so month index `3` is April, not March. The post's own `datePublished`, `dateModified`, and `openGraph.publishedTime` all independently confirm `2026-04-10`. Left uncorrected, this plan's own excluded-guide assertion ("the module date equals the date the post carried before this milestone") would have failed on this pre-existing data bug rather than proving the guide untouched.
- **Fix:** Corrected `data/content-dates.json`'s entry for this slug from `2026-03-10` to `2026-04-10`.
- **Files modified:** `data/content-dates.json`
- **Verification:** `npx vitest run app/__tests__/sitemap.test.ts` (17/17, unaffected since no test hardcodes this route's specific date) and `npx vitest run app/__tests__/content-dates.test.ts` (19/19) both still pass after the fix; the new parity test's excluded-guide case for this slug passes with the corrected value.
- **Committed in:** `101b9d0` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 bug, discovered in plan 05-06's data, not this plan's own new code)
**Impact on plan:** The fix was necessary for this plan's own excluded-guide assertion to prove what it claims to prove (that an untouched page's date is genuinely unchanged, not that a data bug happens to cancel out). No scope creep: the fix is a single JSON value, and no test hardcodes the old (incorrect) value anywhere in the suite.

## Issues Encountered

None beyond the deviation documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Every blog post's structured data now agrees with both the dates module and the sitemap, closing the loop 05-06 opened by rewiring the sitemap alone. Plan 05-08's deploy-two verification and any date-correction logic has a stable, tested target to check against production.
- The final nine-row table above gives plan 05-08's probe the exact expected `dateModified`/`lastmod` values to check once the deploy lands.
- No blocker for the next plan in this phase. The recrawl request itself remains gated on deploy two per D-13, unaffected by this plan.

## Self-Check: PASSED

- `[ -f app/__tests__/blog-dates.test.tsx ]` - FOUND
- `[ -f app/blog/loot-priority-lists-vs-loot-council/page.tsx ]` - FOUND
- `[ -f app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx ]` - FOUND
- `[ -f app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx ]` - FOUND
- `[ -f app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx ]` - FOUND
- `[ -f app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx ]` - FOUND
- `[ -f app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx ]` - FOUND
- `[ -f data/content-dates.json ]` - FOUND
- `git log --oneline --all | grep -q 9082272` - FOUND
- `git log --oneline --all | grep -q 101b9d0` - FOUND
- `git log --oneline --all | grep -q d5e855a` - FOUND
- `git log --oneline --all | grep -q 4ffe363` - FOUND
- `npx vitest run app/__tests__/blog-dates.test.tsx` - 42/42 PASSED
- `npx vitest run app/__tests__/sitemap.test.ts` - 17/17 PASSED
- `npx vitest run app/blog/__tests__/guide-report-links.test.tsx` - 36/36 PASSED
- `npm test` - 1049/1049 PASSED
- `npm run typecheck` - PASSED (exit 0)
- All plan-level `<acceptance_criteria>` re-run and passing for both tasks

---
*Phase: 05-internal-authority-recrawl*
*Completed: 2026-09-08*
