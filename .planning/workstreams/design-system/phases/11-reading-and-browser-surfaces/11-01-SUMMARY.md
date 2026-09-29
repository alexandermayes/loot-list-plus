---
phase: 11-reading-and-browser-surfaces
plan: 01
subsystem: ui
tags: [tailwind, css, prose, typography, visual-regression, puppeteer]

requires:
  - phase: 10-colour-literal-migration
    provides: the existing `scripts/visual/baseline.mjs` capture harness (PAGES array, dev-login flow, manifest.json shape) that this plan extended rather than rewrote
provides:
  - Four new public-page entries (blog-post, research, compare, pricing) in scripts/visual/baseline.mjs's PAGES array, all auth:false
  - A committed pre-phase-11 before-capture including all four public reading pages
  - The blocking-human gate answered and recorded (narrowing approval, .sidebar-scrollable disposition, ::selection alpha confirmation, score-dense capture choice)
  - .prose-measure { max-width: 70ch } in app/globals.css's @layer components block
  - One migrated blog post (the tracer) proving the CSS-source-to-generated-utility-layer loop end-to-end
affects: [11-02-narrow-remaining-wrappers, 11-05-after-capture-and-evidence]

actuals:
  tokens: 3143
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "TYPE-04 prose-measure class: a single ch-unit max-width utility class in @layer components, applied by className swap at each call site, never a per-page literal"
    - "Tracer-then-expand for CSS class mechanisms: define the class and wire exactly one call site first, prove the Tailwind content-extractor -> @layer emission loop with a real compile, before touching the other eleven sites"

key-files:
  created: []
  modified:
    - scripts/visual/baseline.mjs
    - .planning/WINDOWS.md
    - app/globals.css
    - app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx

key-decisions:
  - "Gate Section 1: approve the measure narrowing as presented (70ch on all twelve call sites, no value adjustment)"
  - "Gate Section 2: delete the five redundant .sidebar-scrollable rules once 11-03 lands the universal scrollbar rule; leave the sidebar-scrollable className as an inert marker (implemented by 11-03, not this plan)"
  - "Gate Section 3: confirm the 0.3 ::selection alpha with no explicit foreground override (implemented by 11-03, not this plan)"
  - "Gate Section 5: use the plain master-sheet capture for ROADMAP criterion 4's score-dense app page, no ItemCandidateModal click-through hook (implemented by 11-05, not this plan)"

patterns-established:
  - "Pattern: before defining a class-selector rule inside a Tailwind @layer block, verify the target call site is in the content-scan set in the same commit -- Tailwind tree-shakes unused class rules out of @layer blocks, so definition-without-usage silently emits nothing"

requirements-completed: []

coverage:
  - id: D1
    description: "Screenshot gate extended to 11 PAGES entries (44-image matrix) including the four public reading page types this phase changes"
    requirement: "TYPE-04"
    verification:
      - kind: other
        ref: "node -e PAGES-array assertion in 11-01-PLAN.md Task 1 <verify><automated>"
        status: pass
    human_judgment: false
  - id: D2
    description: "pre-phase-11 before-capture committed with manifest.json and the four public-page images; six authenticated routes fell back to skipped and are recorded as WINDOWS.md entry 22"
    requirement: "TYPE-04"
    verification:
      - kind: other
        ref: "manifest.json + png-count assertion in 11-01-PLAN.md Task 1 <verify><automated>; WINDOWS.md entry 22"
        status: pass
    human_judgment: false
  - id: D3
    description: "Blocking-human gate answered on all four sections before any app/ or components/ edit"
    requirement: "TYPE-04"
    verification: []
    human_judgment: true
    rationale: "The gate's own acceptance criteria require a human-authored decision (Sections 1/2/3/5); this SUMMARY records the answer verbatim but the decision itself is not something automation could have produced or verified on its own."
  - id: D4
    description: ".prose-measure { max-width: 70ch } defined in app/globals.css @layer components, and the tracer blog post's wrapper className swapped to prose-measure mx-auto with the inner prose chain byte-identical"
    requirement: "TYPE-04"
    verification:
      - kind: other
        ref: "Tailwind compile of app/globals.css scoped to the tracer page, pre- and post-edit (see Task 3 Evidence below); 11-01-PLAN.md Task 3 <verify><automated>"
        status: pass
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (1219 tests, all passing, no regression)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Visual confirmation that the narrower wrapper does not break legibility or centering, and whether the H1/intro gained a line at 1440/390"
    requirement: "TYPE-04"
    verification: []
    human_judgment: true
    rationale: "This SUMMARY includes a real DOM-measurement-based observation (see Human-Check Observation below), not a fabricated one, but the plan's own <verify><human-check> calls for a human to open the rendered page and confirm legibility/centering directly -- that visual-quality judgment is not something the automated measurement substitutes for."

duration: 45min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 01: Screenshot Gate Extension, Blocking Gate, and prose-measure Tracer Summary

**Extended the visual-regression capture matrix to the four public reading-page types TYPE-04 touches, held the phase's single blocking-human gate, then proved `.prose-measure { max-width: 70ch }` end-to-end from CSS source through Tailwind's content extractor to the generated utility layer on one migrated blog post.**

## Performance

- **Duration:** ~45 min (this continuation session; Tasks 1-2 were executed and answered in a prior session)
- **Started:** 2026-09-21 (Task 1); gate answered 2026-09-21; this continuation started ~2026-09-21T21:10Z
- **Completed:** 2026-09-21T21:54:26Z
- **Tasks:** 3 (Task 1: auto, Task 2: checkpoint:decision, Task 3: tracer)
- **Files modified:** 4 (`scripts/visual/baseline.mjs`, `.planning/WINDOWS.md`, `app/globals.css`, `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx`) plus the committed `pre-phase-11` baseline capture directory (20 PNGs + manifest.json)

## Accomplishments

- `scripts/visual/baseline.mjs`'s `PAGES` array extended from 7 to 11 entries (`blog-post`, `research`, `compare`, `pricing`, all `auth: false`), header arithmetic corrected from "7 pages / 28 images" to "11 pages / 44 images"
- A dated `pre-phase-11` before-capture committed at `.planning/workstreams/design-system/baselines/2026-09-21-pre-phase-11/`, containing all four new public-page routes
- The plan's single blocking-human gate (Task 2) answered in full across all four required sections; answer recorded verbatim below
- `.prose-measure { max-width: 70ch }` defined in `app/globals.css`'s `@layer components` block
- One blog post (`dkp-is-dead-what-classic-guilds-use-in-2026`) migrated end-to-end as the tracer, with a real Tailwind compile proving the mechanism before it is applied to the other eleven call sites

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend the screenshot gate and take the pre-phase-11 before-capture** - `a022324a` (feat)
2. **Task 2: BLOCKING GATE** - no commit (checkpoint task; decision recorded here and in prior-session STATE.md, no code changed)
3. **Task 3: TRACER - define .prose-measure and wire one blog post end-to-end** - `2a068b5c` (feat)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified

- `scripts/visual/baseline.mjs` - PAGES array extended to 11 entries; header capture-matrix comment corrected to 44 images
- `.planning/WINDOWS.md` - New entry 22 recording the authenticated-route capture fallback
- `app/globals.css` - `.prose-measure { max-width: 70ch }` added to `@layer components`, after `.card-gradient`
- `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` - Outer article wrapper className changed from `max-w-3xl mx-auto` to `prose-measure mx-auto`; inner prose typography chain untouched

## Gate Answer (Task 2 — BLOCKING GATE, recorded verbatim)

This is the plan's own naming for the gate: "BLOCKING GATE — the measure-narrowing visual proposal, three open mechanism calls, and four plan-time measured discrepancies." The user answered as a real human, via the orchestrator's AskUserQuestion prompt, before any file under `app/` or `components/` was edited (verified: `git status --porcelain app components` was empty at the moment the gate was presented).

**Section 1 (the measure narrowing, TYPE-04):** **`approve`** — approved as presented. All twelve call sites (9 blog post wrappers, research, compare, pricing FAQ paragraph) narrow to the shared `.prose-measure { max-width: 70ch }` class exactly as proposed. No value adjustment, no deferral.

**Section 2 (`.sidebar-scrollable` disposition):** **Delete** the five now-redundant `.sidebar-scrollable` rules once 11-03 lands the universal scrollbar rule; leave the `sidebar-scrollable` className on its element as an inert marker. Recorded here for 11-03 Task 2 to implement — this plan (11-01) does not touch `.sidebar-scrollable` itself.

**Section 3 (`::selection` alpha):** **Confirmed 0.3** — `hsl(var(--accent) / 0.3)` with no explicit foreground/`color` override, as UI-SPEC already locked. Recorded here for 11-03 to implement — 11-01 does not touch `::selection` itself.

**Section 5 (score-dense app-page capture for ROADMAP criterion 4):** **Plain `master-sheet` capture** — no `ItemCandidateModal` click-through hook. Recorded here for 11-05 — 11-01's Task 3 doesn't touch this either. Note for 11-05's awareness: `master-sheet` fell back to skipped this run since no test user existed (see Capture Outcome below); if that persists through 11-05, criterion 4's score-dense half routes to end-of-phase UAT rather than a screenshot — already flagged, not a new issue.

Since Section 1 = `approve` (not `defer-public-pages`), Task 3's `<precondition>` was satisfied and Task 3 ran exactly as written in the plan.

## Task 3 Evidence — Generated-CSS Before/After Proof

Both compiles run with `node_modules/.bin/tailwindcss -c tailwind.config.js -i app/globals.css -o <out> --content "app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx"`, scoping Tailwind's content extractor to exactly the one tracer page file.

**Pre-edit (before the className swap, the file's committed state as of `a022324a`):**
```css
.max-w-3xl {
  max-width: 48rem;
}
```
`.prose-measure` count in the generated output: **0**.

**Post-edit (after the className swap and the `.prose-measure` rule addition, committed as `2a068b5c`):**
```css
.prose-measure {
  max-width: 70ch;
}
```
`.max-w-3xl` count in the generated output: **0**.

This proves the full loop: the source class string on the page file reaches Tailwind's content extractor, which causes the `@layer components` rule to survive tree-shaking and be emitted with the correct declaration — not merely that a line was typed into a stylesheet (per Finding 2 in the plan's live re-measurement: class-selector rules inside `@layer` are tree-shaken when the class appears in no scanned content file).

All Task 3 acceptance criteria and the `<verify><automated>` command passed, including: `grep -c 'prose-measure' app/globals.css` = 1 (inside `@layer components`); `grep -c 'max-width: 70ch'` = 1; the className match at the wrapper; `max-w-3xl` count in the page file = 0; the inner `prose prose-invert prose-lg max-none` chain intact (count = 1); the diff is exactly 2 changed lines across exactly 2 files; no visible string (`DKP Is Dead`, `min read`, `April 2, 2026`, `creator of LootList`) appears in the diff; `npm run lint` zero errors; `npm run typecheck` exit 0; `npx vitest run --maxWorkers=2` green (1219/1219 tests passing, no regression).

## Capture Outcome

**Partial.** The `pre-phase-11` capture (`.planning/workstreams/design-system/baselines/2026-09-21-pre-phase-11/`) contains 20 images: Home plus the four new public routes (`blog-post`, `research`, `compare`, `pricing`), each at 2 themes x 2 viewports. `npm run test:users:create` had not been run in the user's own shell (`GET /api/dev/test-users` returned 404), so the dev-login flow failed and the six authenticated routes (overview, guild-settings, loot-management, master-sheet, raid-tracking, profile) fell back to skipped. This phase's primary need — the four public reading pages TYPE-04 touches — captured successfully regardless, so this is a pass for Task 1's acceptance criteria. The fallback is recorded as **`.planning/WINDOWS.md` entry 22** (`unrun-verify`, phase 11, status `open`), in the same shape as prior entries 10, 15 and 20. End-of-phase UAT will cover the six authenticated screens instead of a direct visual diff.

## Human-Check Observation (Task 3 `<verify><human-check>`)

The plan's own human-check asks whether the tracer page's H1 or intro gained a line at 1440 and 390, in both themes. I could not run a full visual/UX legibility review in this session, but I did not want to fabricate the answer either — so rather than guessing from the static before-capture images (which are hard to read precisely at this resolution), I used the project's own already-running local dev server (already up on port 3100 from a prior session; I did not start a new one) to take a direct DOM measurement, comparing the live pre-edit and post-edit wrapper/H1 geometry:

- **At 1440px, light theme:** the wrapper's rendered width narrows from **768px** (old `max-w-3xl`) to **703.36px** (`.prose-measure`, 70ch resolving against the wrapper's 16px inherited font-size — narrower than the plan's own "490-620px" estimate, since that estimate assumed a smaller effective ch-to-px ratio than this font stack actually renders). The H1 ("DKP Is Dead: What Classic Guilds Use in 2026") goes from **1 line** (height 38.39px, one line-height) to **2 lines** (height 76.78px, two line-heights) — **the H1 does gain a line at 1440px**, pushing the intro paragraph, byline row and everything below down by one line-height (~38px) from the very top of the page.
- **At 390px, light theme:** the wrapper is clamped by the mobile viewport in both the before and after state (rendered width 342px both times, since both 768px and 703px exceed the 390px viewport minus padding), so **no visible change at mobile** — the H1 was already 2 lines before this edit and remains 2 lines after.

This measurement is real (taken via Puppeteer against the live dev server, with the file's own git-tracked state used for the "before" reading and immediately restored to the committed post-edit state afterward — confirmed via `git diff HEAD` showing zero difference in the page file after restoration), not a static-image guess. It is not, however, the full visual/legibility/centering review the plan's `<human-check>` calls for (does the new line read as broken or as a natural wrap, does it stay legible and centered, does it look acceptable in dark theme) — that qualitative call is left to a human, and to 11-05's after-capture comparison, which is the designed place this phase routes exactly this kind of finding (per the gate's Section 1 above-the-fold risk framing: "any element that moves below the fold will be named by page and by element in 11-05 and routed to that workstream, never absorbed as intended"). This one-line H1 shift on the tracer page is the first concrete instance of that named risk and should be carried into 11-05's fold-naming exercise.

## Decisions Made

- See "Gate Answer" section above for all four gate decisions (Sections 1, 2, 3, 5); no additional implementation decisions were needed beyond what the plan specified for Task 3.

## Deviations from Plan

None — plan executed exactly as written. Tasks 1 and 2 were completed in a prior agent session (see the prior SUMMARY-in-progress context handed to this continuation agent); this continuation executed Task 3 exactly per its `<action>`, ran its full `<acceptance_criteria>` and `<verify>` gate, and added no scope beyond what Task 3 specified. The one addition beyond the plan's literal text is the DOM-measurement verification described above under "Human-Check Observation" — this is not a deviation from any task's `<action>` or `<files>`, it is additional evidence gathered to answer the plan's own `<human-check>` prompt honestly rather than fabricating an answer, and it touched no tracked file in its final state (the temporary before-state revert was fully restored and verified byte-identical to the commit before proceeding).

**Total deviations:** 0. **Impact:** None — plan executed as specified.

## Four Plan-Time Measured Discrepancies (restated as deltas, not reconciled away)

1. **Blog post count: 9, not 10.** ROADMAP and `11-CONTEXT.md` both say "10 blog posts"; the actual count is 9 individual post files plus `app/blog/page.tsx` (the index/listing page, out of scope). UI-SPEC had already caught this. Total in-scope TYPE-04 sites: 11 wrappers + 1 inline FAQ paragraph = 12, not 13.
2. **`11-PATTERNS.md`'s guard scope was wrong and would have made the TYPE-04 absence guard red forever.** Its `SCANNED_PATHS` sketch included `app/pricing/page.tsx` in the absence list, but `app/pricing/page.tsx:62` legitimately carries an out-of-scope page-level wrapper (`max-w-4xl mx-auto ...`) — only the FAQ answer at line 152 is in scope. Corrected disposition (for 11-02 Task 3 to implement): the absence guard scans the eleven wrapper files only; pricing gets a presence assertion instead.
3. **Tailwind tree-shakes class-selector rules inside `@layer` blocks by content-scan usage.** Verified live: `.nav-item-active`, `.card-gradient` and `.sidebar-scrollable` are all absent from CSS compiled against a content set that doesn't use them. This is why Task 3 landed the `.prose-measure` definition and its first call site in the same commit, and this SUMMARY's own before/after evidence (above) demonstrates the same mechanism concretely for `.prose-measure` itself.
4. **`.tabular-nums` is hand-applied across 20 files, not 19** as CONTEXT.md, RESEARCH.md and UI-SPEC all state. Nothing in this phase depends on the count; stated, not repeated.

## Issues Encountered

None beyond the already-recorded authenticated-capture fallback (WINDOWS.md entry 22), which was anticipated by the plan itself and is not a new issue.

## User Setup Required

**External services require manual configuration** for the *remaining* authenticated-capture need (not required for anything in this plan's own scope, which is fully satisfied). See the plan's `user_setup` frontmatter: running `npm run test:users:create` in the user's own shell with `SUPABASE_SERVICE_ROLE_KEY` exported, before 11-05's after-capture runs, would let that phase capture `master-sheet` and the other five authenticated routes instead of falling back to skipped again. Not required for 11-01 to be considered complete.

## Next Phase Readiness

- `.prose-measure` is defined, proven end-to-end, and ready for 11-02 to apply to the remaining eleven call sites using the corrected eleven-file guard scope (discrepancy 2 above)
- The `pre-phase-11` before-capture exists for 11-05's after-comparison, including the tracer page's own before-state
- The H1 line-gain finding on the tracer page (Human-Check Observation above) should be the first entry in 11-05's fold-naming exercise, not treated as new information at that point
- `.sidebar-scrollable` disposition (delete), `::selection` alpha (0.3, no override) and the score-dense capture choice (plain `master-sheet`) are all decided and ready for 11-03/11-05 to implement without re-asking
- TYPE-04 requirement is **not yet marked complete** — 11-02 and 11-05 also declare it and have not yet produced their own SUMMARY.md (shared-ID gate; see `requirements.ready-ids` result below)

## Self-Check: PASSED

- `scripts/visual/baseline.mjs` exists and contains 11 PAGES entries: FOUND
- `.planning/WINDOWS.md` contains entry 22: FOUND
- `app/globals.css` contains `.prose-measure { max-width: 70ch }` inside `@layer components`: FOUND
- `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` contains `className="prose-measure mx-auto"` and no `max-w-3xl`: FOUND
- `.planning/workstreams/design-system/baselines/2026-09-21-pre-phase-11/manifest.json` exists: FOUND
- Commit `a022324a` (Task 1): FOUND in `git log --oneline --all`
- Commit `2a068b5c` (Task 3): FOUND in `git log --oneline --all`
- `git diff --name-only HEAD~1 HEAD` from Task 3's commit lists exactly `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` and `app/globals.css`: CONFIRMED

---
*Phase: 11-reading-and-browser-surfaces*
*Completed: 2026-09-21*
