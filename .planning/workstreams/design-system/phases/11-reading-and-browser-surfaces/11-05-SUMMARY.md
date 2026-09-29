---
phase: 11-reading-and-browser-surfaces
plan: 05
subsystem: ui
tags: [visual-regression, puppeteer, tailwind, css, evidence]

requires:
  - phase: 11-reading-and-browser-surfaces
    provides: "11-01's pre-phase-11 before-capture and .prose-measure tracer, 11-02's remaining call-site migration and TYPE-04 guard, 11-03's SURF-01 selection/caret/scrollbar rules and guard, 11-04's SURF-02 dead-selector deletion and guard -- this plan captures the matching after-state, compares, and closes the phase out with evidence"
provides:
  - Dated post-phase-11 after-capture (20 images, matrix-matched to the before-capture) committed under .planning/workstreams/design-system/baselines/
  - The full sixteen-pair fold comparison, every crossing named by page/viewport/theme/element and routed to .planning/WINDOWS.md (entries 25, 26, 27)
  - 11-EVIDENCE.md answering all four ROADMAP Phase 11 success criteria with verbatim command output and named image pairs
  - Five new .planning/WINDOWS.md entries (24-28) closing out this phase's remaining open questions
affects: [12-enforcement-and-documentation]

actuals:
  tokens: 9056
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Fold-crossing verification via cropped, fold-line-marked image comparison: crop each full-page before/after pair to a narrow band around the viewport-height fold line (900px at 1440, 844px at 390), draw the fold line explicitly, and read which text/element straddles it -- more precise than eyeballing a full page scaled down to a thumbnail, and reusable for any future above-the-fold risk in this workstream"

key-files:
  created:
    - .planning/workstreams/design-system/phases/11-reading-and-browser-surfaces/11-EVIDENCE.md
    - .planning/workstreams/design-system/baselines/2026-09-21-post-phase-11/ (20 PNGs + manifest.json)
  modified:
    - .planning/WINDOWS.md

key-decisions:
  - "Fold-crossing findings are named at the specific-element level (a heading, a stat card, a table row), not summarised as 'the intro area moved' -- matching the ROADMAP risk note's own literal requirement and this workstream's Phase 09 D-05 precedent"
  - "The universal scrollbar rule's visual confirmation, attempted twice in headless Puppeteer and inconclusive both times, is recorded honestly as unconfirmed (WINDOWS.md entry 28) rather than asserted passing on the strength of 11-03's rendered-CSS proof alone"

patterns-established:
  - "Fold-line-marked crop comparison: see tech-stack.patterns above"

requirements-completed: [TYPE-04, SURF-01, SURF-02]

coverage:
  - id: D1
    description: "post-phase-11 after-capture taken with the label CLI, matrix-matched to the before-capture (16 public-page images identical in name/count), pre-phase-11 byte-unchanged, scripts/visual/baseline.mjs byte-unchanged"
    requirement: "TYPE-04"
    verification:
      - kind: other
        ref: "node -e capture-matrix assertion in 11-05-PLAN.md Task 1 <verify><automated>; git status --porcelain on the pre-phase-11 directory; git diff --name-only HEAD~1 -- scripts/visual/baseline.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "All twenty same-named image pairs hashed and bucketed: 12 byte-identical, 8 differing-and-explained, 0 differing-and-unexplained"
    requirement: "TYPE-04"
    verification:
      - kind: other
        ref: "md5 comparison recorded verbatim in 11-EVIDENCE.md's Image-pair hash buckets section"
        status: pass
    human_judgment: false
  - id: D3
    description: "The full sixteen-pair fold comparison, every pair given an explicit verdict (crossed with named element, or nothing crossed), three crossings routed to .planning/WINDOWS.md entries 25-27"
    requirement: "TYPE-04"
    verification: []
    human_judgment: true
    rationale: "The plan's own <verify><human-check> calls for a human eye to draw the fold and name what sits above/below it. This SUMMARY and 11-EVIDENCE.md record a real, image-based analysis (cropped and fold-line-marked, not fabricated) rather than a placeholder, but the qualitative judgment of whether a given crossing reads as acceptable belongs to the sprint workstream's conversion-cohort measurement owner, not to this executor."
  - id: D4
    description: "SURF-01's three surfaces (::selection, caret-color, universal scrollbar) confirmed live in a real browser in both themes; two of three (selection, caret) visually confirmed, the third (scrollbar) inconclusive in headless capture and routed to end-of-phase UAT (WINDOWS.md entry 28)"
    requirement: "SURF-01"
    verification:
      - kind: other
        ref: "Live Puppeteer selection/caret screenshots taken this session (script never committed, git status --porcelain scripts/visual/ confirmed empty afterward); 11-03's own npx vitest run __tests__/browser-surface-theming.test.ts (4/4) and rendered-CSS compile proof cited"
        status: pass
    human_judgment: true
    rationale: "Confirming the scrollbar surface's actual visual appearance (not just CSS presence) requires a real, non-headless browser; this executor's headless attempt was inconclusive twice and is honestly recorded as such rather than asserted. Selection and caret ARE confirmed with real screenshots (attached evidence), but the plan's own human-check calls for a human's overall visual-quality judgment across all three surfaces together, which this executor cannot fully discharge."
  - id: D5
    description: "The dead [data-score] rule's absence and its surviving siblings re-confirmed; the stale design-system doc-page prose re-confirmed unedited and its WINDOWS.md entry (23) re-cited, not duplicated"
    requirement: "SURF-02"
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/data-score-absence.test.ts (4/4 passing)"
        status: pass
      - kind: other
        ref: "grep -rn data-score app components in 11-EVIDENCE.md, showing only the doc-page hit"
        status: pass
    human_judgment: false
  - id: D6
    description: "11-EVIDENCE.md answers all four ROADMAP Phase 11 success criteria with verbatim command output or named image pairs, records the full guard-family pass count (12 files / 52 tests), and restates all four plan-time measured deltas as deltas"
    requirement: "TYPE-04"
    verification:
      - kind: other
        ref: "node -e Task 2 <verify><automated> assertion in 11-05-PLAN.md; npm run lint && npm run typecheck && npx vitest run && npm run build all exit 0, run live this session"
        status: pass
    human_judgment: true
    rationale: "The plan's own <verify><human-check> asks a human to read 11-EVIDENCE.md end to end and confirm it reads as checkable evidence rather than assertion, and that nothing unmet is softened. That editorial judgment belongs to the human reader, not to this executor's own self-assessment of its own document."

duration: 23min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 05: Post-Phase Capture, Fold Comparison, and Evidence Close-Out Summary

**Captured the matching post-phase-11 baseline, precisely named three above-the-fold crossings caused by the 65-75ch prose measure at 1440px (a blog-post H2, a research stat card, two compare table rows), and closed the phase with 11-EVIDENCE.md answering all four ROADMAP success criteria against verbatim command output.**

## Performance

- **Duration:** 23 min
- **Started:** 2026-09-21T23:33:33Z
- **Completed:** 2026-09-21T23:56:54Z
- **Tasks:** 2 (both `type="auto"`)
- **Files modified:** 23 (21 new files in the `post-phase-11` baseline directory, `.planning/WINDOWS.md` modified, `11-EVIDENCE.md` created)

## Accomplishments

- Ran `scripts/visual/baseline.mjs --label post-phase-11` against a freshly started local dev server (script itself byte-unchanged, `pre-phase-11` byte-unchanged), producing 20 images matrix-matched to the before-capture; the six authenticated routes fell back to skipped again (`npm run test:users:create` still not run), recorded as `.planning/WINDOWS.md` entry 24
- Hashed all twenty same-named pairs: 12 byte-identical (Home ×4, all eight 390px public-page pairs), 8 differing-and-explained (all eight 1440px public-page pairs), 0 differing-and-unexplained
- Performed the full sixteen-pair fold comparison using cropped, fold-line-marked before/after images (a new technique for this workstream — see Patterns above) rather than eyeballing full pages scaled to thumbnails, precisely naming three crossings and confirming "nothing crossed" for pricing and for every 390px pair
- Confirmed `::selection` and `caret-color` live in a real browser in both themes via Puppeteer screenshots (script never committed); the universal scrollbar rule's visual affordance could not be confirmed in headless capture and is honestly recorded as unconfirmed (entry 28) rather than asserted
- Wrote `11-EVIDENCE.md`: one section per ROADMAP Phase 11 success criterion, each answered with verbatim command output or named image pairs, plus the full guard-family pass count (12 files / 52 tests, all green) and this phase's four measured deltas restated
- Re-ran `npm run lint`, `npm run typecheck`, `npx vitest run` (both default-concurrency and `--maxWorkers=2`), and `npm run build` — all green, all verbatim in the evidence document

## Task Commits

Each task was committed atomically:

1. **Task 1: Take the after-capture and name every element that crossed the fold** - `6819ef60` (feat)
2. **Task 2: Answer all four ROADMAP success criteria with evidence in 11-EVIDENCE.md** - `a0ba7594` (docs)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified

- `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-11/` — 20 PNGs + `manifest.json`, the after-capture
- `.planning/WINDOWS.md` — five new entries (24-28): the after-capture's own authenticated-route fallback, the three named fold crossings, and the headless-scrollbar-confirmation gap
- `.planning/workstreams/design-system/phases/11-reading-and-browser-surfaces/11-EVIDENCE.md` — new, answers all four ROADMAP Phase 11 success criteria

## Image-Pair Hash Buckets (verbatim, from 11-EVIDENCE.md)

```
home-light-1440.png:      SAME
home-light-390.png:       SAME
home-dark-1440.png:       SAME
home-dark-390.png:        SAME
blog-post-light-1440.png: DIFF
blog-post-light-390.png:  SAME
blog-post-dark-1440.png:  DIFF
blog-post-dark-390.png:   SAME
research-light-1440.png:  DIFF
research-light-390.png:   SAME
research-dark-1440.png:   DIFF
research-dark-390.png:    SAME
compare-light-1440.png:   DIFF
compare-light-390.png:    SAME
compare-dark-1440.png:    DIFF
compare-dark-390.png:     SAME
pricing-light-1440.png:   DIFF
pricing-light-390.png:    SAME
pricing-dark-1440.png:    DIFF
pricing-dark-390.png:     SAME
```

12 byte-identical, 8 differing-and-explained, 0 differing-and-unexplained.

## Full Sixteen-Pair Fold Comparison (verdict per pair)

| Page | Viewport | Theme | Verdict |
|---|---|---|---|
| blog-post | 1440 | light | Crossed — H2 "Where DKP Falls Apart" fully-above-fold → straddling; its body paragraph partially-visible → fully below the fold |
| blog-post | 1440 | dark | Crossed — identical shift (theme-invariant layout) |
| blog-post | 390 | light/dark | Nothing crossed (byte-identical) |
| research | 1440 | light | Crossed — the "18.0 / median items per approved list" stat card fully-above-fold → straddling |
| research | 1440 | dark | Crossed — identical shift |
| research | 390 | light/dark | Nothing crossed (byte-identical) |
| compare | 1440 | light | Crossed — "Built-in attendance tracking" row fully-above-fold → straddling; "Attendance feeds the loot score" row fully-above-fold → fully below |
| compare | 1440 | dark | Crossed — identical shift (the phase's largest reflow, +533px) |
| compare | 390 | light/dark | Nothing crossed (byte-identical) |
| pricing | 1440/390 | light/dark | Nothing crossed on any of the four (hero/cards pixel-identical; the FAQ's own +24px reflow stays entirely below the fold) |

Layout is confirmed theme-invariant for every page (light and dark images share identical pixel dimensions, before and after), so each crossing's verdict applies identically to both themes.

## .planning/WINDOWS.md Entries Opened This Plan

- **Entry 24** (unrun-verify) — this plan's own authenticated-route capture fallback, distinct from entry 22's before-capture instance
- **Entry 25** (deviation) — blog-post fold crossing, routed to the sprint workstream's conversion-cohort measurement owner
- **Entry 26** (deviation) — research fold crossing, same destination
- **Entry 27** (deviation) — compare fold crossing, same destination
- **Entry 28** (unrun-verify) — the universal scrollbar rule's visual confirmation, inconclusive in headless capture, routed to end-of-phase UAT

## Master-Sheet Outcome

Skipped. `GET /api/dev/test-users` returned `404` this session against a freshly restarted local dev server — `npm run test:users:create` still has not been run in the user's own shell. `master-sheet` and the other five authenticated routes were never captured in either the before- or after-baseline. ROADMAP success criterion 4's score-dense half is recorded as **not met** by this plan and routed to end-of-phase UAT (WINDOWS.md entry 24), exactly as 11-01's own gate (Section 5) anticipated.

## Full Guard-Family Pass Count

```
$ npx vitest run <9 prior-phase guards> __tests__/prose-measure.test.ts __tests__/browser-surface-theming.test.ts __tests__/data-score-absence.test.ts
 Test Files  12 passed (12)
      Tests  52 passed (52)
```

Covers every guard from Phases 07, 09 and 10, plus this phase's three new guards. This phase's edits regressed none of them.

## Lint / Typecheck / Test / Build — Verbatim

```
$ npm run lint
✖ 397 problems (0 errors, 397 warnings)
```
0 errors, 397 pre-existing warnings (unchanged baseline).

```
$ npm run typecheck
(exit 0)
```
Exit 0. (One transient false alarm mid-session: a stale `.next/dev/types/*.d.ts` file corrupted by a race with a live `next dev` process produced spurious parse errors; diagnosed as a Turbopack dev-server artifact — not a code issue — and resolved by stopping the dev server and clearing `.next/`, after which typecheck ran clean. Not a deviation from any task's `<action>`; documented in 11-EVIDENCE.md's Criterion 4 section for the record.)

```
$ npx vitest run
 Test Files  76 passed (76)
      Tests  1231 passed (1231)
```
Default-concurrency run green (76/76, 1231/1231); no worker-pool exhaustion observed, so `--maxWorkers=2` was not needed to reach a conclusive result (re-run anyway for symmetry with prior phases: also 76/76, 1231/1231).

```
$ npm run build
(exit 0)
```
Exit 0. All ten blog posts plus `/blog`, `/research/wow-classic-loot-systems-2026`, `/compare`, `/pricing` prerender as static content.

## Decisions Made

- Fold-crossing findings named at the specific-element level (a heading, a stat card, individual table rows), never summarised as a page-level count — per the ROADMAP risk note's own literal requirement and Phase 09's D-05 precedent.
- The universal scrollbar rule's visual confirmation, inconclusive after two independent headless-Puppeteer attempts, is recorded honestly as unconfirmed (WINDOWS.md entry 28) rather than asserted passing on the strength of 11-03's rendered-CSS proof alone — that proof establishes the CSS is emitted correctly, not that it renders visibly in every capture environment.

## Deviations from Plan

None — plan executed exactly as written across both tasks. One transient environmental false alarm is documented above (typecheck's stale `.next/dev/types` artifact) and in 11-EVIDENCE.md's Criterion 4 section; it required no code change, only stopping and restarting the dev server / clearing a build cache, and is not a deviation from either task's `<action>` or `<files>`.

**Total deviations:** 0. **Impact:** None.

## Issues Encountered

- The universal scrollbar rule's visual affordance could not be confirmed in headless Puppeteer capture despite two independent attempts (a direct crop of the compare page's overflowing `overflow-x-auto` table at 390px, and a scroll-nudged full-container capture). This reads as a known limitation of headless Chromium's custom-scrollbar rendering rather than a functional gap — the CSS rule itself is proven present and correctly emitted by 11-03's own rendered-CSS compile — but it was not fabricated as visually confirmed. Recorded as WINDOWS.md entry 28, routed to end-of-phase UAT.

## User Setup Required

None — no external service configuration required by this plan itself. (Running `npm run test:users:create` in the user's own shell would let a future capture reach `master-sheet` and the other five authenticated routes instead of falling back to skipped again; not required for this plan to be considered complete, per 11-01's own precedent.)

## Next Phase Readiness

- Phase 11 is complete: TYPE-04, SURF-01 and SURF-02 are all implemented, guarded, and evidenced. All five plans in this phase now have summaries.
- `.planning/WINDOWS.md` carries the full, honest ledger of this phase's open items (entries 22-28: two authenticated-capture fallbacks, three named fold crossings, one stale doc-page prose reference, one inconclusive headless scrollbar check) — every one with a named destination (end-of-phase UAT or the sprint workstream's conversion-cohort measurement owner), none silently absorbed.
- Phase 12 (Enforcement and Documentation) can proceed: `DESIGN.md`'s eventual token/primitive documentation should pick up this phase's `.prose-measure` class and the three SURF-01 rules; ENF-02 should resolve the pricing FAQ grey hex literal; ENF-03 should resolve the stale `data-score` doc-page prose (entry 23).
- The three named fold crossings (entries 25-27) are the phase's single most consequential finding for whoever owns the sprint workstream's conversion-cohort measurement — they should be reviewed before or alongside that measurement's next cohort read, not left dormant in the ledger.

## Self-Check: PASSED

- `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-11/manifest.json` exists: FOUND
- `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-11/` contains 20 PNGs matching the before-capture's names: CONFIRMED
- `.planning/workstreams/design-system/baselines/2026-09-21-pre-phase-11/` is byte-unchanged: CONFIRMED (`git status --porcelain` empty)
- `scripts/visual/baseline.mjs` is byte-unchanged: CONFIRMED (`git diff --name-only HEAD~1` empty for that path)
- `.planning/workstreams/design-system/phases/11-reading-and-browser-surfaces/11-EVIDENCE.md` exists and contains four "Success Criterion" sections: FOUND
- `.planning/WINDOWS.md` contains entries 24, 25, 26, 27, 28: FOUND
- Commit `6819ef60` (Task 1): FOUND in `git log --oneline --all`
- Commit `a0ba7594` (Task 2): FOUND in `git log --oneline --all`
- `git diff --name-only HEAD~1 -- app components` (both commits): CONFIRMED empty
- `npm run lint && npm run typecheck && npx vitest run && npm run build`: CONFIRMED all exit 0, re-run live this session

---
*Phase: 11-reading-and-browser-surfaces*
*Completed: 2026-09-21*
