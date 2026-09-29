---
status: complete
phase: 04-verified-guild-case-study
source: [04-VERIFICATION.md]
started: 2026-09-06T22:47:53Z
updated: 2026-09-07T06:00:49Z
---

## Current Test

[testing complete]

## Tests

### 1. Visual review of the rendered case-study template at /customers/example-guild-fixture
expected: Layout and hierarchy match 04-UI-SPEC.md's Focal Point, Typography, and Color contracts as judged by eye (the seven checklist items above). This is the D6/D7 coverage item 04-01 and 04-03 could not complete in their sandboxed worktrees because no .env.local was materialized there.
result: pass
reported: "Visual pass (orchestrator in Chrome at 1710px, plus the user screenshot): items 1, 3, 4, 5 and 6 hold, the H1 wraps at one 32px size, no horizontal scroll at desktop. Item 1 is undermined and the strip is visibly broken: every proof-strip figure overflows its card at 42px (measured clientWidth 142 vs scrollWidth 155 to 238); Cataclysm Classic, Tier 11 is clipped to Cataclys and 6 hours to 45 minutes a week spills over the card edge. Separately the lead reads a 28-player-player Cataclysm Classic Tier 11 guild. Mobile could not be captured (window would not shrink); the same 2-column strip math applies there."
note: "Re-checked after gap plan 04-05 (commits 6d9eb76, 20cf110, 9bf3e98) in Chrome at 1543px: all four figures fit their cards (scrollWidth equals clientWidth), sizes 32/20/20/20px, no horizontal scroll, lead reads a 28-player Cataclysm Classic Tier 11 guild. Screenshot saved for the user."

### 2. Case-study page reachable while logged out
expected: A visitor with no LootList+ session (an officer arriving from a search result, or a crawler) who opens /customers/example-guild-fixture under npm run dev, or /customers/{slug} in production once published, receives the page with HTTP 200 rather than a redirect to the landing page.
result: pass
reported: "Orchestrator probe during environment setup: local dev server (placeholder Supabase env) answers GET /customers/example-guild-fixture with 307 to /?next=%2Fcustomers%2Fexample-guild-fixture. Production shows the same for the Phase 3 report: https://www.lootlistplus.com/research/wow-classic-loot-systems-2026 returns 307 to /?next=... while /about returns 200."
note: "Fixed in quick-260906-ure, commit e16de7e: lib/public-routes.ts adds a tested isPublicPathname predicate that admits /research and /customers, with regression coverage in lib/__tests__/public-routes.test.ts."

## Summary

total: 2
passed: 2
issues: 0
pending: 0
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

- gap_id: G-04-1
  truth: "The four proof-strip figures are the most visually dominant element below the H1 and every figure fits inside its card at every width"
  status: resolved
  resolved_by: 04-05-PLAN.md
  resolved_at: 2026-09-06
  reason: "User reported: proof-strip figures overflow and clip their cards (Cataclysm Classic, Tier 11 clipped to Cataclys; 6 hours to 45 minutes a week spills past the card edge); confirmed by measurement, all four figures have scrollWidth greater than clientWidth"
  severity: blocker
  test: 1
  root_cause: "app/customers/[slug]/sections.tsx ProofStrip renders block.figure at text-5xl (42px, font-bold) inside a grid-cols-2 md:grid-cols-4 grid that lives in the page's max-w-3xl (768px) column, giving 142px cards on desktop and about 160px on mobile, with no min-w-0, break-words, or size step-down. 04-UI-SPEC.md sized the 42px figure for short numerals, but the CaseStudy.proofStrip fields are free strings and the interview kit (questions 11 and 12) collects phrases such as 'Cataclysm Classic, Tier 11' and '6 hours to 45 minutes a week', so phrase-length figures are the normal case, not an edge case"
  artifacts:
    - path: "app/customers/[slug]/sections.tsx"
      issue: "ProofStrip figure is fixed at text-5xl with no length-aware sizing, no min-w-0/break-words on the card, and a 4-column grid in a 768px column"
    - path: "data/case-studies/example-guild-fixture.ts"
      issue: "proofStrip values are phrase-length strings, which is realistic for interview answers and must render, so the fixture is right and the component is wrong"
  missing:
    - "Length-aware figure sizing in ProofStrip: a short numeral-led figure keeps the 42px focal size; longer figures step down (for example 28px, then 22px) so the figure always fits, with min-w-0 and break-words on the card as a backstop"
    - "Let the strip breathe: either lg:grid-cols-4 with grid-cols-2 below lg, or a wider strip container, so cards are wide enough for 42px numerals on desktop"
    - "A vitest assertion that renders the fixture and asserts the size class chosen for each figure by length, plus a jsdom-safe guard that no figure element carries whitespace-nowrap or a clamp"
  debug_session: ""
- gap_id: G-04-3
  truth: "The lead paragraph reads 'a 28-player Cataclysm Classic Tier 11 guild', with the size token resolving to a bare count"
  status: resolved
  resolved_by: 04-05-PLAN.md
  resolved_at: 2026-09-06
  reason: "User reported: lead renders 'a 28-player-player Cataclysm Classic Tier 11 guild'"
  severity: major
  test: 1
  root_cause: "The approved string page.lead (and page.meta-description) is '{guild} is a {size}-player {expansion_tier} guild', so CaseStudy.size must resolve to a bare count; data/case-studies/example-guild-fixture.ts line 30 sets size: '28-player', which doubles the unit. data/case-studies/types.ts documents size only as 'string' with no unit rule, and 04-INTERVIEW-KIT.md question 11 does not tell the interviewer to record the bare number"
  artifacts:
    - path: "data/case-studies/example-guild-fixture.ts"
      issue: "size: '28-player' should be size: '28'"
    - path: "data/case-studies/types.ts"
      issue: "size field lacks a doc comment stating it is a bare count because the approved template appends '-player'"
  missing:
    - "Set the fixture size to '28' and add a doc comment on CaseStudy.size"
    - "A vitest assertion that the rendered lead and meta description contain '-player ' exactly once and never 'player-player'"
    - "Optional: a slug-style validation in data/case-studies/index.ts that CaseStudy.size matches /^\\d+$/ so a future real entry cannot repeat the mistake"
  debug_session: ""
