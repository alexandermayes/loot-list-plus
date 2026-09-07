---
phase: quick-260906-ure
plan: 01
subsystem: infra
tags: [nextjs, middleware, vitest, seo, auth]

# Dependency graph
requires:
  - phase: 03-anonymized-product-data-report
    provides: "/research/wow-classic-loot-systems-2026 report page"
  - phase: 04-verified-guild-case-study
    provides: "/customers/[slug] case-study template and the G-04-2 UAT gap"
provides:
  - "lib/public-routes.ts exporting a pure, tested isPublicPathname predicate"
  - "proxy.ts delegating its public-route bypass branch to isPublicPathname"
  - "G-04-2 marked resolved in 04-UAT.md with the fix commit recorded"
affects: [05-recrawl-and-measurement-wrap-up]

# Actuals (#2632)
actuals:
  tokens: 1969
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Middleware routing decisions extracted into a pure, framework-free predicate module under lib/ so they get direct vitest coverage instead of only end-to-end coverage."

key-files:
  created:
    - lib/public-routes.ts
    - lib/__tests__/public-routes.test.ts
  modified:
    - proxy.ts
    - .planning/phases/04-verified-guild-case-study/04-UAT.md

key-decisions:
  - "Boundary matching (=== '/research' or startsWith('/research/')), not bare startsWith, so a lookalike path like /researchers stays gated (settled in the plan, not re-litigated here)."
  - "The pre-existing allowlist entries were moved verbatim from proxy.ts with no reordering or tightening, keeping this a pure extract-and-extend refactor."

patterns-established:
  - "Pattern: middleware routing predicates live in lib/*.ts as pure functions with zero framework imports, verified by a structural test asserting no next/server or @supabase import, so the auth-gate logic is unit-testable without a running server."

requirements-completed: [EVID-03, EVID-04, G-04-2]

coverage:
  - id: D1
    description: "isPublicPathname admits /research and /customers (exact and child paths) while every previously public path stays public and protected/lookalike paths stay gated"
    requirement: "EVID-03"
    verification:
      - kind: unit
        ref: "lib/__tests__/public-routes.test.ts#isPublicPathname"
        status: pass
      - kind: e2e
        ref: "curl against npm run dev on port 3100: /research/... and /customers/... return 200, /overview returns 307"
        status: pass
    human_judgment: false
  - id: D2
    description: "proxy.ts delegates its public-route bypass branch to isPublicPathname with the inline allowlist expression removed"
    requirement: "EVID-04"
    verification:
      - kind: other
        ref: "grep gates in the plan's <verify> block: isPublicPathname appears >=2 times in proxy.ts, the old ].includes(pathname) expression is gone, lib/public-routes.ts has zero next/server or @supabase imports"
        status: pass
    human_judgment: false
  - id: D3
    description: "G-04-2 marked resolved in 04-UAT.md with the fix commit recorded, original failure record preserved"
    requirement: "G-04-2"
    verification:
      - kind: other
        ref: ".planning/phases/04-verified-guild-case-study/04-UAT.md (status: resolved, resolved_by/resolved_at, Test 2 result: pass with note)"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-06
status: complete
---

# Phase quick-260906-ure Plan 01: Make /research and /customers public in middleware Summary

**Extracted the inline public-route allowlist from proxy.ts into a tested `isPublicPathname` predicate in `lib/public-routes.ts` and added `/research` and `/customers` to it, closing UAT gap G-04-2 where logged-out officers and crawlers were 307-redirected off the sprint's evidence pages.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-06T22:55:00Z (approx.)
- **Completed:** 2026-09-06T23:17:38Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `lib/public-routes.ts` now owns the public-route decision as a pure, exported `isPublicPathname(pathname)` function with zero framework imports, plus an exported `exactPublicPaths` array so tests assert over the real list instead of retyping literals.
- `/research` and `/customers` (and their children) are now public using exact-or-child boundary matching, so lookalikes like `/researchers` and `/customersecret` stay gated.
- `lib/__tests__/public-routes.test.ts` adds 4 tests covering the newly public paths, every previously public path, four still-gated app routes, and two boundary lookalikes.
- End-to-end proof against a running `npm run dev`: `/research/wow-classic-loot-systems-2026` and `/customers/example-guild-fixture` return HTTP 200; `/overview` still returns 307.
- UAT gap G-04-2 marked `status: resolved` in `04-UAT.md`, Test 2 changed from `issue` to `pass`, Summary counts updated to `passed: 1, issues: 0`, with the original failure record (`reason`, `root_cause`, `artifacts`, `missing`) preserved untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract the public-route predicate, admit /research and /customers, prove it end to end** - `e16de7e` (feat)
2. **Task 2: Mark G-04-2 resolved in the Phase 4 UAT ledger** - `27406b5` (docs)

_Task 1 followed the TDD RED/GREEN cycle: the test file was written and run first (import failure confirming RED), then `lib/public-routes.ts` was created and `proxy.ts` was rewritten to delegate to it (GREEN), all committed together as one atomic commit per the plan's task boundary._

## Files Created/Modified
- `lib/public-routes.ts` - Pure `isPublicPathname` predicate plus exported `exactPublicPaths` allowlist; no framework imports.
- `lib/__tests__/public-routes.test.ts` - Regression suite: 4 newly public paths, all previously public paths, 4 still-gated paths, 2 boundary lookalikes.
- `proxy.ts` - Imports and delegates to `isPublicPathname`; inline allowlist expression removed; no other branch touched.
- `.planning/phases/04-verified-guild-case-study/04-UAT.md` - G-04-2 marked resolved, Test 2 marked pass with a fix-commit note, Summary counts updated.

## Decisions Made
None beyond what the plan already settled (boundary matching, verbatim allowlist migration) - executed exactly as specified in `<decisions>`.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<verify>` gates passed on the first attempt with no auto-fixes required.

## Issues Encountered

None. The dev-server gate needed the documented placeholder-Supabase-env workaround from the environment notes (`.env.local` intentionally lacks Supabase credentials); this was anticipated by the plan's `<precondition>` and produced the expected result (200/200/307, never 307/307/307).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The fix is committed to `main` but has not been deployed. Per the plan's `<followups>`: until this deploys, the live production research report still answers crawlers with a 307. The Phase 5 recrawl pass should run only after this deploys, not before.
- Test 1 in `04-UAT.md` (visual review of the fixture case-study page) remains pending and unaffected by this task.

---
*Phase: quick-260906-ure*
*Completed: 2026-09-06*

## Self-Check: PASSED

- FOUND: lib/public-routes.ts
- FOUND: lib/__tests__/public-routes.test.ts
- FOUND: proxy.ts
- FOUND: .planning/phases/04-verified-guild-case-study/04-UAT.md
- FOUND: commit e16de7e
- FOUND: commit 27406b5
