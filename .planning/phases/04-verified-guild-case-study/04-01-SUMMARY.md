---
phase: 04-verified-guild-case-study
plan: 01
subsystem: marketing-page
tags: [nextjs-app-router, generateStaticParams, jsonld, vitest, case-study]

requires:
  - phase: 02-checkable-conversion-copy
    provides: "QuoteCard/VerificationLine/TestimonialVerification discriminated union in LandingValueProps.tsx, D-05 no-Review/AggregateRating precedent"
  - phase: 03-anonymized-product-data-report
    provides: "APPROVED_STRINGS + {token} resolver copy-fidelity pattern, Article+BreadcrumbList JSON-LD shape, Zev Person @id, sitemap test conventions"
provides:
  - "Typed, committed case-study registry (data/case-studies/) with an empty published list, a dev-only fixture, a NODE_ENV-gated routability switch, and a slug charset guard"
  - "Dynamic app/customers/[slug]/page.tsx route: generateStaticParams, generateMetadata with interim noindex, Article+BreadcrumbList-only JSON-LD, header/lead/reused QuoteCard render"
  - "Exported QuoteCard, VerificationLine, TestimonialVerification, QuoteAuthor from LandingValueProps.tsx for reuse outside the homepage section"
  - "Standing regression guards proving zero production reachability and zero sitemap presence for the unpublished case study"
affects: ["04-02", "04-03", "04-04"]

actuals:
  tokens: 8956
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "generateStaticParams + dynamicParams=false as the first dynamic-route pattern in this repo (D-01), gated by a NODE_ENV-read-at-call-time routability switch rather than a module-level constant so tests can stub it"
    - "Export-in-place for shared homepage components (QuoteCard/VerificationLine) rather than extraction, to avoid a circular import with the existing TiltCard/PremiumFeatures.tsx relationship"

key-files:
  created:
    - data/case-studies/types.ts
    - data/case-studies/index.ts
    - data/case-studies/example-guild-fixture.ts
    - app/customers/[slug]/page.tsx
    - app/customers/[slug]/__tests__/page.test.tsx
  modified:
    - app/components/landing/LandingValueProps.tsx
    - app/__tests__/sitemap.test.ts

key-decisions:
  - "page.title and the rendered H1 are computed from the same resolveH1() call (not two independently-templated strings), guaranteeing they can never disagree -- stronger than the plan's literal 'page.title' key would give on its own"
  - "isFixtureRouteEnabled() reads process.env.NODE_ENV inside the function body at call time, not a module-level constant, so vi.stubEnv can flip it mid-test-run without re-importing the module"
  - "Export in place (add `export` to existing declarations) rather than extracting QuoteCard/VerificationLine/TestimonialVerification/QuoteAuthor into a new shared module, since TiltCard already lives in and is exported from LandingValueProps.tsx and is imported by PremiumFeatures.tsx"

requirements-completed: [EVID-04]

coverage:
  - id: D1
    description: "Typed CaseStudy registry: empty published list, dev-only fixture held outside it, NODE_ENV-gated routable list, and a slug charset assertion at module load"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#every slug in both registries matches the required charset pattern"
        status: pass
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#CASE_STUDY_SLUG_PATTERN rejects malformed slugs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dynamic /customers/[slug] route renders H1, lead, and the reused QuoteCard from the fixture entry, with self-canonical metadata and Article+BreadcrumbList-only JSON-LD"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#renders exactly one level-1 heading, equal to the resolved page.h1 value for the fixture title variant"
        status: pass
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#emits exactly two JSON-LD objects, Article and BreadcrumbList, with headline matching the rendered H1 and the shared Person author id"
        status: pass
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#never emits Review or AggregateRating structured data, at any depth"
        status: pass
    human_judgment: false
  - id: D3
    description: "Zero production reachability: generateStaticParams returns an empty array under NODE_ENV=production, dynamicParams=false, requireCaseStudy throws on any unresolvable/case-differing/percent-encoded slug"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#generateStaticParams() returns an empty array when NODE_ENV is production"
        status: pass
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#slug resolution is exact ASCII equality, not case-folded or percent-decoded"
        status: pass
    human_judgment: false
  - id: D4
    description: "Sitemap absence gate: no /customers/ entry while unpublished, and agreement with listPublishedSlugs() so the guard activates automatically once the first entry ships"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/__tests__/sitemap.test.ts#contains no /customers/ entry while the case study is unpublished"
        status: pass
      - kind: unit
        ref: "app/__tests__/sitemap.test.ts#agrees with listPublishedSlugs(): exactly one sitemap entry per published case-study slug"
        status: pass
    human_judgment: false
  - id: D5
    description: "LandingValueProps.tsx export-boundary widening (QuoteCard, VerificationLine, TestimonialVerification, QuoteAuthor) breaks nothing on the homepage or PremiumFeatures.tsx"
    verification:
      - kind: unit
        ref: "app/components/landing/__tests__/LandingValueProps.test.tsx"
        status: pass
    human_judgment: false
  - id: D6
    description: "Visual review of the rendered fixture template under npm run dev at /customers/example-guild-fixture (D-08 end-of-phase UAT mechanism)"
    verification: []
    human_judgment: true
    rationale: "No browser/visual check was performed in this environment -- only jsdom-rendered assertions. D-08 designates the dev-only fixture route as the mechanism for the user's own visual review at end-of-phase, per workflow.human_verify_mode=end-of-phase; this is a genuine judgment call (spacing, hierarchy, wrapping) that automated tests do not and should not substitute for."

duration: 40min
completed: 2026-09-06
status: complete
---

# Phase 4 Plan 1: End-to-End Case Study Tracer Summary

**Dynamic `/customers/[slug]` route proven end to end on one dev-only fixture: typed registry, `generateStaticParams`/`dynamicParams=false`, Article+BreadcrumbList JSON-LD, reused `QuoteCard`, and zero production reachability, all under standing regression tests.**

## Performance

- **Duration:** ~40 min
- **Completed:** 2026-09-06T21:11:12Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments

- Widened the export boundary on `app/components/landing/LandingValueProps.tsx` (`TestimonialVerification`, `QuoteAuthor`, `VerificationLine`, `QuoteCard`) without touching markup, class strings, the default export, or `TiltCard`'s existing export that `PremiumFeatures.tsx` depends on.
- Built a typed `data/case-studies/` registry: `CaseStudy`/`CaseStudyTitle`/`CaseStudyProofStrip` contracts, an empty `publishedCaseStudies` array, a dev-only `exampleGuildFixture` entry, and `CASE_STUDY_SLUG_PATTERN` asserted against every registered slug at module load.
- Shipped `app/customers/[slug]/page.tsx`: `dynamicParams = false`, `generateStaticParams()`, `generateMetadata()` with an interim `robots: { index: false, follow: false }`, an `APPROVED_STRINGS` + token-resolver copy-fidelity gate mirroring the research report page, and Article + BreadcrumbList JSON-LD reusing the canonical Zev Person `@id` from `app/about/page.tsx`.
- Proved zero production reachability: `generateStaticParams()` returns `[]` when `NODE_ENV=production` (fixture excluded), and `requireCaseStudy` throws for any slug not in the routable list, including case-differing and percent-encoded variants of the real slug.
- Extended `app/__tests__/sitemap.test.ts` with a standing guard that no `/customers/` URL exists while the registry is unpublished, and that the guard will activate per-slug automatically once `listPublishedSlugs()` returns entries.

## Task Commits

1. **Task 1: End-to-end case study for one fixture guild, from registry to rendered page** - `fad62bb` (feat)
2. **Task 2: Unreachability guarantees, slug guard, and the sitemap absence gate** - `6cf5ed6` (test)

**Plan metadata:** committed separately after this SUMMARY.

## Files Created/Modified

- `data/case-studies/types.ts` - `CaseStudy`, `CaseStudyTitle`, `CaseStudyProofStrip` contracts; interview-sourced-only header comment (D-03)
- `data/case-studies/index.ts` - `publishedCaseStudies` (empty), `isFixtureRouteEnabled`, `listRoutableCaseStudies`, `listPublishedSlugs`, `requireCaseStudy`, `CASE_STUDY_SLUG_PATTERN`
- `data/case-studies/example-guild-fixture.ts` - `exampleGuildFixture`, visibly-labelled dev-only fixture entry (D-09)
- `app/customers/[slug]/page.tsx` - the dynamic route: static params, metadata, JSON-LD, header/lead/quote render
- `app/customers/[slug]/__tests__/page.test.tsx` - full render/metadata/JSON-LD/static-params/slug-guard test suite
- `app/components/landing/LandingValueProps.tsx` - added `export` to `TestimonialVerification`, `QuoteAuthor`, `VerificationLine`, `QuoteCard`
- `app/__tests__/sitemap.test.ts` - extended with `/customers/` absence and `listPublishedSlugs()` agreement assertions

## Decisions Made

- `page.title` and the rendered H1 are computed via the same `resolveH1()` call rather than two independently-maintained templates, so a browser title and an H1 can never silently drift apart (stronger guarantee than the plan's literal "carry a `page.title` key" instruction implied on its own).
- `isFixtureRouteEnabled()` reads `process.env.NODE_ENV` at call time inside the function body, not a module-level constant, so `vi.stubEnv` can flip it mid-test-run without a fresh module import.
- Export-in-place for `QuoteCard`/`VerificationLine`/`TestimonialVerification`/`QuoteAuthor` (not extraction to a new shared module), since `TiltCard` already lives in and is exported from `LandingValueProps.tsx` and is imported by `PremiumFeatures.tsx`; extracting would have forced a circular-import risk or a second consumer rewrite.

## Deviations from Plan

None - plan executed exactly as written. The plan's own text noted an "arithmetic bug" style ambiguity (APPROVED_STRINGS "four keys" vs. five listed) which was resolved by including all five listed keys (`page.title`, `page.h1-preferred`, `page.h1-fallback`, `page.meta-description`, `page.lead`) — a documentation-only ambiguity, not a deviation from any behavioral requirement.

## Issues Encountered

- `npm run build` failed at the unrelated `/api/guild-count` route (`NEXT_PUBLIC_SUPABASE_URL is required`) — this is the same pre-existing, out-of-scope baseline gap documented in `03-06-SUMMARY.md` (no `.env.local` in this environment; the same route failed the exact same way in Phase 3). Verified instead via the Turbopack compile phase (succeeded in 6.9s) and the TypeScript phase (succeeded in 12.0s), both of which completed before the prerender step that failed. No new build finding was introduced by this plan's changes.
- `npm run lint` reports 397 pre-existing warnings, 0 errors, none in any file this plan touched (confirmed via targeted grep of the lint output against `customers`, `case-studies`, and `LandingValueProps`).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The architecture is proven: registry → dynamic route → metadata → JSON-LD → reused quote component, all under test, with zero production reachability confirmed.
- Deliberately out of scope for this plan (per its own instructions): the eyebrow, visible breadcrumb nav, byline meta row, proof strip, before/after narrative panels, credible-limitation section, and contextual CTA. These carry copy that goes through the plan 04-02 sign-off gate and are wired in 04-03.
- EVID-05 (the real guild interview) remains blocked per STATE.md; this plan's fixture proves the template can render a complete entry once that content clears, but ships no real customer content.
- A human visual review of `/customers/example-guild-fixture` under `npm run dev` is still needed (D-08) — not performed in this environment (no browser). Flagged in the coverage block (D6) for the end-of-phase UAT consolidation per `workflow.human_verify_mode=end-of-phase`.

---
*Phase: 04-verified-guild-case-study*
*Completed: 2026-09-06*

## Self-Check: PASSED

- FOUND: data/case-studies/types.ts
- FOUND: data/case-studies/index.ts
- FOUND: data/case-studies/example-guild-fixture.ts
- FOUND: app/customers/[slug]/page.tsx
- FOUND: app/customers/[slug]/__tests__/page.test.tsx
- FOUND: commit fad62bb (git log --oneline --all | grep fad62bb)
- FOUND: commit 6cf5ed6 (git log --oneline --all | grep 6cf5ed6)
- Re-ran all task-level `<acceptance_criteria>` commands: all passed (see Task Commits and Issues Encountered above).
- Re-ran plan-level `<verification>` commands: vitest suites pass (41/41 in scope, 867/867 full suite), typecheck clean, sitemap grep 0, supabase grep 0, em-dash grep empty. `npm run build` fails only at the documented pre-existing `/api/guild-count` baseline gap (see Issues Encountered).
