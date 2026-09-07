---
phase: 04-verified-guild-case-study
plan: 05
subsystem: ui
tags: [case-study, tailwind, vitest, typography, content-guard]

requires:
  - phase: 04-verified-guild-case-study
    provides: "Plan 04-03's ProofStrip component, the case-study data module, and the copy-fidelity parity test that this plan's fixes had to keep passing"
provides:
  - "proofFigureSizeClass, a pure length-aware sizing function stepping proof-strip figures through 42/32/20px"
  - "A shrink-and-wrap (min-w-0 + break-words) card backstop so no figure can overflow its card at any length"
  - "A two-to-four column responsive grid (four columns starting at lg, not md)"
  - "CASE_STUDY_SIZE_PATTERN, a module-load guard rejecting a unit-carrying CaseStudy.size"
  - "A corrected fixture size ('28' instead of '28-player') closing the doubled-unit defect"
affects: [case-study-publish-runbook, future-case-study-entries]

actuals:
  tokens: 5140
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Length-aware type-scale stepping (digit-led-short / length-and-longest-word / else) kept entirely on the four already-shipped pixel values, introducing no new size token"
    - "data-* attribute as a stable test selector, used here to replace a selector that a style-dependent rule change (dynamic size class) would otherwise break"

key-files:
  created: []
  modified:
    - app/customers/[slug]/sections.tsx
    - app/customers/[slug]/__tests__/page.test.tsx
    - data/case-studies/types.ts
    - data/case-studies/index.ts
    - data/case-studies/example-guild-fixture.ts

key-decisions:
  - "Sizing tiers implemented at exactly 42/32/20px (the nearest already-locked scale values to the plan's ~28px/~22px suggestion), so the page still ships only the four declared pixel sizes"
  - "Block-counting test selector moved from the size class to a new stable data-proof-figure attribute, since the size class became length-dependent and could no longer double as a stable selector"
  - "Fixture size corrected to a bare '28' rather than changing the CaseStudy.proofStrip type shape or the approved copy templates, per the recorded user decision against G-04-1/G-04-3"

requirements-completed: [EVID-04]

coverage:
  - id: D1
    description: "Proof-strip figures render length-aware sizes (42/32/20px) that never overflow or clip their card, with a shrink-and-wrap backstop for any future length (G-04-1)"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#proofFigureSizeClass (G-04-1)"
        status: pass
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#ProofStrip (T-04-13 omit rule)"
        status: pass
      - kind: integration
        ref: "app/customers/[slug]/__tests__/page.test.tsx#Full page: proof strip and narrative panels wired in"
        status: pass
    human_judgment: true
    rationale: "The automated suite proves the sizing rule and the no-clipping/no-md-fourth-size invariants against jsdom-rendered class output, but jsdom performs no real layout, so it cannot itself measure scrollWidth vs clientWidth the way the original UAT finding did. The plan's own verification section defers a real-browser visual re-check to the human UAT re-review after this plan lands."
  - id: D2
    description: "The lead paragraph and meta description carry the roster-size unit exactly once, never doubled, and a future unit-carrying size value cannot be imported (G-04-3)"
    requirement: EVID-04
    verification:
      - kind: unit
        ref: "app/customers/[slug]/__tests__/page.test.tsx#CASE_STUDY_SIZE_PATTERN (G-04-3)"
        status: pass
      - kind: integration
        ref: "app/customers/[slug]/__tests__/page.test.tsx#The proof-strip size token renders its unit exactly once (G-04-3)"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-06
status: complete
---

# Phase 4 Plan 05: Proof-strip length-aware sizing and doubled-unit fix Summary

**Proof-strip figures now step through 42/32/20px by length and longest-word instead of clipping at a fixed 42px, and the fixture's roster count no longer doubles its own unit in the lead sentence.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-06T22:43:49-07:00 (plan committed at `7791188`)
- **Completed:** 2026-09-06T22:57:27-07:00
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- `proofFigureSizeClass(figure)` exported from `sections.tsx`: a pure function returning `'text-5xl' | 'text-4xl' | 'text-2xl'` from three ordered rules (digit-led and <=8 chars -> 42px; <=16 chars and longest word <=9 -> 32px; else 20px), keeping the page on its four already-declared pixel sizes.
- `ProofStrip` cards gained `min-w-0` (shrink below intrinsic content width) and `break-words` (wrap a too-long single word), so no figure of any future length can escape its card even outside the tuned tiers.
- The strip grid now goes to four columns at `lg` instead of `md`, giving phrase-length figures roughly double the card width on tablet and phone.
- `data-proof-figure` attribute added per block, replacing the `.text-5xl` selector every block-counting test previously used (five call sites moved), since the size class is now length-dependent.
- `CaseStudy.size` is documented at the field ("Bare roster count, digits only") and `CASE_STUDY_SIZE_PATTERN` (digits-only, anchored) now throws from the same module-load loop as `CASE_STUDY_SLUG_PATTERN` when an entry's size carries a unit.
- The fixture's `size` field changed from `'28-player'` to `'28'`, since the approved `page.lead` and `page.meta-description` templates already append `-player` after the token; the fixture was carrying the unit twice.
- New coverage: 13 new tests (55 -> 64 in the scoped file; 891 -> 915 in the full suite) covering all three size tiers, the longest-word-not-just-length rule, whitespace-trim equivalence, the 42px-still-exists regression, the shrink/wrap backstop, the two-to-four column grid, the size-pattern accept/reject cases, the exactly-once unit assertions on both the rendered lead and `generateMetadata`'s description, and a full-page sweep proving the strip subtree carries no clipping class and every applied size class is one of the three tiers.

## Task Commits

Each task was committed atomically:

1. **Task 1: Length-aware proof-strip figure sizing, the card overflow backstop, and the two-to-four column grid (G-04-1)** - `6d9eb76` (feat)
2. **Task 2: The size token reads as a bare count, documented at the type and validated at module load (G-04-3)** - `20cf110` (fix)
3. **Task 3: Cross-cutting overflow guard and the phase gate battery** - `9bf3e98` (test)

_No SUMMARY/metadata commit exists yet at time of writing this section; it follows below._

## Files Created/Modified

- `app/customers/[slug]/sections.tsx` - Adds `proofFigureSizeClass` and its exported `ProofFigureSizeClass` union; applies it to the proof-strip figure element alongside `font-bold text-accent`; adds `data-proof-figure`, `min-w-0`, and `break-words`; grid steps to `lg:grid-cols-4`.
- `app/customers/[slug]/__tests__/page.test.tsx` - New `proofFigureSizeClass` tier-table describe block, new `CASE_STUDY_SIZE_PATTERN` describe block, new doubled-unit describe block, expanded `ProofStrip` describe block (selector migration + new assertions), and a new full-page sweep test.
- `data/case-studies/types.ts` - Doc comment on `CaseStudy.size` naming the unit rule and the enforcing guard.
- `data/case-studies/index.ts` - Exports `CASE_STUDY_SIZE_PATTERN`; extends the existing module-load loop with the size check.
- `data/case-studies/example-guild-fixture.ts` - `size: '28-player'` -> `size: '28'`.

## Decisions Made

- Sizing tiers land at exactly 42/32/20px, the nearest values on the already-locked type scale to the plan's suggested ~28px/~22px, rather than introducing a fifth type size.
- `data-proof-figure` is now the permanent selector for counting proof-strip blocks in tests; the old `.text-5xl` selector is retired everywhere it was used (four sites in the `ProofStrip` describe block, one in the full-page describe block).
- No change to `CaseStudy.proofStrip`'s type shape, no APPROVED-STRING edits, and `04-INTERVIEW-KIT.md` untouched, per the plan's explicit scope boundary.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Phase Gate Battery (Task 3)

| Gate | Command | Result |
|------|---------|--------|
| 1. Scoped suite | `npx vitest run 'app/customers/[slug]/__tests__/page.test.tsx'` | Pass, 64/64 (was 55/55 pre-plan) |
| 2. Full suite | `npm test` | Pass, 915/915 (was 891/891 pre-plan) |
| 3. Types | `npm run typecheck` | Pass, clean |
| 4. Scoped lint | `npx eslint app/customers data/case-studies` | Pass, exit 0, no output |
| 5. Diff-scoped em-dash grep | grep over files changed since `c6f740d` in `app/customers` and `data/case-studies` | Pass, no matches |

`npm run build` intentionally not run (documented pre-existing failure at the unrelated `/api/guild-count` prerender).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- G-04-1 closed: every proof-strip figure sizes and wraps within its card at every tested length; short numeral-led figures still hit the 42px focal size.
- G-04-3 closed: the lead and meta description carry the roster-size unit exactly once; a future unit-carrying `size` value fails at module load, naming the offending value and slug.
- Remaining human step (not a task gate, not required for this plan's completion): the plan's `<verification>` section specifies a real-browser re-check of the two originally failing UAT items at `http://localhost:3100/customers/example-guild-fixture`, at desktop and narrow widths, confirming no `scrollWidth` > `clientWidth` overflow and the corrected lead sentence. This belongs to the `/gsd-verify-work 04` re-review, not to this plan's close-out.
- No blockers for Phase 4 completion introduced by this plan; EVID-05 (the guild interview) remains the phase's only open blocker, unrelated to this plan's scope.

---
*Phase: 04-verified-guild-case-study*
*Completed: 2026-09-06*

## Self-Check: PASSED

All five created/modified files confirmed present on disk (`app/customers/[slug]/sections.tsx`, `app/customers/[slug]/__tests__/page.test.tsx`, `data/case-studies/types.ts`, `data/case-studies/index.ts`, `data/case-studies/example-guild-fixture.ts`). All three task commit hashes (`6d9eb76`, `20cf110`, `9bf3e98`) confirmed present in git log.
