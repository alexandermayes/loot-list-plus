---
phase: 04-verified-guild-case-study
plan: 03
subsystem: marketing-pages
tags: [nextjs, react-server-components, copy-fidelity, case-study, seo]

requires:
  - phase: 04-verified-guild-case-study (plan 04-01)
    provides: the dynamic `[slug]` route, `data/case-studies` registry, the fixture-gating mechanism, generateStaticParams/generateMetadata, and the base APPROVED_STRINGS/tokensFor/resolveH1 copy-fidelity pattern
  - phase: 04-verified-guild-case-study (plan 04-02)
    provides: 04-COPY-DRAFT.md, the fully signed-off (STATUS/SIGN-OFF: APPROVED 2026-09-06) copy artifact this plan's parity gate checks against
provides:
  - The complete case-study template: proof strip, before/after narrative panels, credible-limitation section, header chrome (breadcrumb, eyebrow, byline with meta row), and the single contextual CTA
  - A general-purpose omit-rule pattern (`ProofStrip`, `buildBylineMeta`) for rendering guild-supplied data that may be partially uncollected, without ever emitting a placeholder or invented value
affects: [phase-05-internal-linking, publish-plan-for-verified-guild-case-study]

actuals:
  tokens: 7269
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Presentational Server Components in a sibling `sections.tsx` module take every string as a prop, holding no copy of their own, so the sign-off artifact stays the single source of wording and each section is unit-testable with reduced-field input instead of a second fixture entry"
    - "Omit-before-render: candidate data blocks are built in a fixed array, then filtered by presence/non-emptiness before the JSX runs, so an uncollected value produces no block at all rather than a placeholder, a dash, or an inferred value (D-05 pattern, reused for both the proof strip and the byline meta row)"
    - "A tiny exported presentational component (`Eyebrow`) makes a copy-artifact-driven omit decision directly unit-testable with an empty value, without needing to fake the committed approved string"

key-files:
  created:
    - app/customers/[slug]/sections.tsx
  modified:
    - app/customers/[slug]/page.tsx
    - app/customers/[slug]/__tests__/page.test.tsx

key-decisions:
  - "The eyebrow's omit rule is implemented as a small exported `Eyebrow({ value })` component in page.tsx (not enumerated in the plan's artifact list for sections.tsx) so the plan's own test requirement -- 'rendering the header with an empty approved eyebrow produces no eyebrow element' -- is directly testable without faking the always-non-empty committed approved string. This is an implementation-detail decision within the plan's stated discretion, not an architectural change."
  - "All new page.tsx typography (breadcrumb, byline, byline meta, eyebrow) uses `text-lg` (16px), not the pre-existing report page's `text-sm` (12px) byline treatment, to satisfy this plan's own acceptance criterion that exactly four type sizes (16/20/32/42) ship on the page. The reused `QuoteCard` component's inherited internal sizes are unaffected (already an accepted exception from Phase 3)."
  - "The dev-server human check could not be completed in this sandboxed environment: the root layout's GuildContextProvider requires a live Supabase client, and no `.env.local` is materialized here, so every route -- not just this one -- returns 500 under `npm run dev`. This is the same pre-existing, out-of-scope baseline gap 04-01's SUMMARY documented for `npm run build`, manifesting differently in dev mode. Flagged for end-of-phase UAT consolidation per `workflow.human_verify_mode=end-of-phase`."

requirements-completed: [EVID-04]

coverage:
  - id: D1
    description: "ProofStrip renders the four-block proof strip in contract order, with the D-05 omit rule proven independent of which stat is absent"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#ProofStrip (T-04-13 omit rule)"
        status: pass
      - kind: integration
        ref: "app/customers/[slug]/__tests__/page.test.tsx#Full page: proof strip and narrative panels wired in"
        status: pass
    human_judgment: false
  - id: D2
    description: "NarrativePanels renders exactly two required before/after panels with no accent colour and no clipping"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#NarrativePanels"
        status: pass
    human_judgment: false
  - id: D3
    description: "Header chrome: breadcrumb, eyebrow (omitted cleanly when empty), byline with Zev linked to /about, byline meta row with the omit rule applied"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#buildBylineMeta"
        status: pass
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#Eyebrow"
        status: pass
      - kind: integration
        ref: "app/customers/[slug]/__tests__/page.test.tsx#Full page: header chrome (breadcrumb, eyebrow, byline)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Credible-limitation section renders in standard body treatment, with no accent and no destructive colour token"
    requirement: EVID-04
    verification:
      - kind: integration
        ref: "app/customers/[slug]/__tests__/page.test.tsx#Full page: credible limitation and contextual CTA"
        status: pass
    human_judgment: false
  - id: D5
    description: "Exactly one contextual CTA, rendered inside the article and reported by BlogTracker's existing click delegation, no duplicate ask elsewhere on the page"
    requirement: EVID-04
    verification:
      - kind: integration
        ref: "app/customers/[slug]/__tests__/page.test.tsx#Full page: credible limitation and contextual CTA"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every APPROVED-STRING in 04-COPY-DRAFT.md ships verbatim in page.tsx (copy-fidelity parity gate), and structured data (Article headline, no rating/testimonial schema) still holds after all section work"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#Copy-fidelity parity: every APPROVED-STRING in 04-COPY-DRAFT.md ships in page.tsx"
        status: pass
      - kind: other
        ref: "shell parity loop over 04-COPY-DRAFT.md APPROVED-STRING lines against page.tsx (this plan's own <verify> gate, re-run manually)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Visual hierarchy and layout of the assembled template read correctly at the rendered fixture URL (proof strip dominance, panel stacking, no horizontal scroll, limitation reads as honest not alarming, single filled CTA button)"
    requirement: EVID-04
    verification: []
    human_judgment: true
    rationale: "No browser is available in this sandboxed environment, and the dev server cannot render any route here (missing .env.local causes GuildContextProvider to 500 on every path, including the landing pages, not only this one). This is a purely visual/layout judgment call no automated test can substitute for; flagged for the end-of-phase UAT consolidation."

duration: 40min
completed: 2026-09-06
status: complete
---

# Phase 4 Plan 3: Verified Guild Case Study Template Summary

**Completed the `/customers/{slug}` case-study template: a D-05 omit-safe proof strip, before/after narrative panels, header chrome with an omit-safe eyebrow and byline meta row, a standard-treatment credible-limitation section, and one contextual CTA, with every visible string verified byte-for-byte against the signed-off `04-COPY-DRAFT.md`.**

## Performance

- **Duration:** 40 min
- **Started:** 2026-09-06T21:46:00Z (approx, following STATE.md's recorded wave-2 handoff)
- **Completed:** 2026-09-06T22:13:05Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- `app/customers/[slug]/sections.tsx` created: `ProofStrip` (four-block strip with the D-05 omit rule, proven independent of which stat is missing), `NarrativePanels` (the required two-panel before/after account), `buildBylineMeta` (the same omit rule applied to byline meta items), `LimitationSection` (standard body treatment, no accent, no destructive colour), and `ContextualCta` (the single conversion ask, rendered outside any prose wrapper)
- `app/customers/[slug]/page.tsx` extended with 13 new `APPROVED_STRINGS` keys (proof-strip captions, narrative labels, eyebrow, breadcrumb label, byline, limitation heading, CTA heading/body/button), all copied verbatim from `04-COPY-DRAFT.md`, and wired every new section into the page in the contract order: breadcrumb, eyebrow, H1, lead, byline meta, proof strip, before/after panels, quote block, limitation, CTA
- A small exported `Eyebrow` component in `page.tsx` makes the eyebrow's omit rule directly testable with an empty value
- Full copy-fidelity parity gate run and passed: every `APPROVED-STRING` line in `04-COPY-DRAFT.md` ships verbatim in `page.tsx` (0 missing keys)
- Full suite battery run and passed: `npm test` (887/887), `npm run typecheck` (clean), `npm run lint` (0 errors, 397 pre-existing warnings, none in files this plan touched); `npm run build` compiles and typechecks cleanly and fails only at the documented pre-existing `/api/guild-count` baseline gap

## Task Commits

Each task was committed atomically:

1. **Task 1: The proof strip and the before-and-after narrative panels** - `2130815` (feat)
2. **Task 2: Header chrome, the credible limitation, the contextual CTA, and the copy-fidelity parity gate** - `c05655b` (feat)

## Files Created/Modified

- `app/customers/[slug]/sections.tsx` - Pure presentational Server Components: `ProofStrip`, `NarrativePanels`, `buildBylineMeta`, `LimitationSection`, `ContextualCta`
- `app/customers/[slug]/page.tsx` - Extended `APPROVED_STRINGS`, added `Eyebrow`, wired all five new sections into the template in the contract order
- `app/customers/[slug]/__tests__/page.test.tsx` - 40 total tests (12 new describe blocks covering the omit rule, header chrome, limitation, CTA, and the full copy-fidelity parity gate)

## Decisions Made

- The eyebrow's omit rule is implemented as a small exported `Eyebrow({ value })` component in `page.tsx`, not enumerated in the plan's `sections.tsx` artifact list, so the plan's own test requirement (empty approved eyebrow renders no element) is directly testable. Within the plan's stated implementation discretion; not an architectural change.
- All new typography on the page uses `text-lg` (16px) rather than the pre-existing research-report page's `text-sm` (12px) byline treatment, to hold the page to exactly four type sizes (16/20/32/42) per this plan's own acceptance criteria. `QuoteCard`'s inherited internal sizes are an already-accepted Phase 3 exception and untouched here.
- The dev-server human check could not be completed in this environment (see Issues Encountered). Recorded as a `human_judgment: true` coverage entry (D7) for end-of-phase UAT consolidation.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' preconditions were verified (the sign-off marker in `04-COPY-DRAFT.md`), all acceptance criteria commands were run and passed, and no auto-fix, missing-critical-functionality, or architectural-change rule was triggered.

## Issues Encountered

- `npm run dev` could not render the fixture page in this sandboxed environment: the root layout's `GuildContextProvider` requires a live Supabase client at render time, and `.env.local` is not materialized in this worktree (no Supabase keys are ever committed to the repo, per project policy). Every route under `npm run dev` returns 500 with `@supabase/ssr: Your project's URL and API key are required`, not only `/customers/example-guild-fixture` -- this is the same pre-existing, out-of-scope baseline gap `04-01-SUMMARY.md` documented for `npm run build`'s `/api/guild-count` prerender failure, manifesting differently in dev mode. Verified instead: the full build's Turbopack compile phase (11.3s) and TypeScript phase (30.9s) both completed successfully before the unrelated `/api/guild-count` prerender failure, and the build's `.next/server/app/customers/[slug]/` output contains only the compiled route module, no generated static page for the fixture slug -- confirming production reachability stays at zero, consistent with `isFixtureRouteEnabled()` returning `false` under `NODE_ENV=production`. The human visual review of layout/hierarchy at `http://localhost:3100/customers/example-guild-fixture` (proof-strip dominance, panel stacking, no horizontal scroll, limitation reading as honest, single filled CTA button) is deferred to the end-of-phase UAT consolidation per `workflow.human_verify_mode=end-of-phase` (see coverage entry D7).
- `npm run lint` reports 397 pre-existing warnings, 0 errors, none in any file this plan touched (confirmed via targeted grep of the lint output for "customers").

## Known Stubs

None. No stub, placeholder, or hardcoded-empty value was introduced. The proof strip and byline meta row's omit rule is the designed correct behavior for a stat the interview did not collect (D-05), not a stub -- it is exercised and asserted by dedicated tests for both an end-position omission (tenure) and a start-position omission (roster).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- EVID-04 (the case-study template) is complete: all four roadmap-required sections render (outcome-focused H1, proof strip, before/after narrative, credible limitation), the proof strip out-ranks everything below it, and every visible string is provably the string the user approved via the copy-fidelity parity gate.
- The single remaining item for this plan is the end-of-phase human visual review at the fixture URL (D7 in the coverage block above), which could not run in this sandboxed environment. It should be performed with a working `.env.local` before the phase's UAT consolidation closes.
- EVID-05 (the real guild interview) remains blocked per STATE.md; this plan ships zero real customer content, matching D-06's phase-shape decision. The template is ready to render a real entry the moment the interview clears and a registry entry is committed.
- No new architectural surface was introduced: this plan composed presentational components on top of 04-01's route architecture and 04-02's approved copy, exactly as scoped.

---
*Phase: 04-verified-guild-case-study*
*Completed: 2026-09-06*
