---
status: testing
phase: 04-verified-guild-case-study
source: [04-VERIFICATION.md]
started: 2026-09-06T22:47:53Z
updated: 2026-09-07T04:16:47Z
---

## Current Test

number: 1
name: Visual review of the rendered case-study template at /customers/example-guild-fixture
expected: |
  With the dev server running (a working .env.local with Supabase env is required, since every route 500s without it), open /customers/example-guild-fixture and confirm all seven items hold:
  1. The four proof-strip figures are the most visually dominant element below the H1
  2. The H1 wraps at a single 32px size on narrow and wide windows (no clamp, no size split)
  3. The before/after panels sit side by side on desktop and stack on mobile with no clipped text
  4. The limitation section reads as honest, not alarming, and carries no accent or destructive color
  5. The quote block matches the homepage testimonial look
  6. There is exactly one filled accent "Create your guild free" button
  7. No horizontal scrollbar appears at any width
awaiting: user response

## Tests

### 1. Visual review of the rendered case-study template at /customers/example-guild-fixture
expected: Layout and hierarchy match 04-UI-SPEC.md's Focal Point, Typography, and Color contracts as judged by eye (the seven checklist items above). This is the D6/D7 coverage item 04-01 and 04-03 could not complete in their sandboxed worktrees because no .env.local was materialized there.
result: [pending]

### 2. Case-study page reachable while logged out
expected: A visitor with no LootList+ session (an officer arriving from a search result, or a crawler) who opens /customers/example-guild-fixture under npm run dev, or /customers/{slug} in production once published, receives the page with HTTP 200 rather than a redirect to the landing page.
result: pass
reported: "Orchestrator probe during environment setup: local dev server (placeholder Supabase env) answers GET /customers/example-guild-fixture with 307 to /?next=%2Fcustomers%2Fexample-guild-fixture. Production shows the same for the Phase 3 report: https://www.lootlistplus.com/research/wow-classic-loot-systems-2026 returns 307 to /?next=... while /about returns 200."
note: "Fixed in quick-260906-ure, commit e16de7e: lib/public-routes.ts adds a tested isPublicPathname predicate that admits /research and /customers, with regression coverage in lib/__tests__/public-routes.test.ts."

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- gap_id: G-04-2
  truth: "A logged-out visitor or crawler receives the case-study page (and the Phase 3 research report) with HTTP 200 instead of a redirect to the landing page"
  status: resolved
  resolved_by: quick-260906-ure
  resolved_at: 2026-09-06
  reason: "Orchestrator probe: proxy.ts redirects unauthenticated requests for /customers/* and /research/* to /?next=<path>; confirmed on production for the live research report"
  severity: blocker
  test: 2
  root_cause: "proxy.ts isPublicRoute allowlist (lines 297 to 304) enumerates public paths explicitly and was never extended for /research (Phase 3) or /customers (Phase 4); every other path falls through to refreshSupabaseSession and the unauthenticated redirect at line 319"
  artifacts:
    - path: "proxy.ts"
      issue: "isPublicRoute lacks pathname.startsWith('/research') and pathname.startsWith('/customers/')"
  missing:
    - "Add /research and /customers/ prefixes to isPublicRoute in proxy.ts"
    - "Add a regression test asserting the public-route predicate admits /research/... and /customers/... and still gates /overview"
    - "Deploy so the live research report stops redirecting crawlers"
  debug_session: ""
