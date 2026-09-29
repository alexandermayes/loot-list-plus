---
phase: 11-reading-and-browser-surfaces
plan: 02
subsystem: ui
tags: [tailwind, css, prose, typography, vitest, guard-test]

requires:
  - phase: 11-reading-and-browser-surfaces
    provides: "11-01's .prose-measure { max-width: 70ch } definition in app/globals.css and the proven tracer blog post (dkp-is-dead-what-classic-guilds-use-in-2026), which this plan's nine remaining blog posts copy verbatim"
provides:
  - Eleven remaining call sites (eight blog posts, the research page, the compare page, the pricing FAQ answer) migrated to the shared prose-measure class
  - Every one of the twelve TYPE-04 call sites now references one shared class; no page carries its own per-page wrapper width literal
  - __tests__/prose-measure.test.ts -- the TYPE-04 guard, observed both red and green, scoped to the corrected eleven-file absence list
affects: [11-05-after-capture-and-evidence]

actuals:
  tokens: 3565
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "TYPE-04 explicit-file-list guard scope: an absence guard over a fixed array of repo-relative paths, never a directory walk, because two files share the target literal for reasons unrelated to the guard's own concern"
    - "Guard header comments must not spell out the exported constant's own name in prose before its declaration when that guard is itself verified by an external regex keyed on that name -- doing so makes the first regex match the prose sentence, not the array"

key-files:
  created:
    - __tests__/prose-measure.test.ts
  modified:
    - app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx
    - app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx
    - app/blog/how-to-onboard-new-raiders-without-killing-morale/page.tsx
    - app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx
    - app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx
    - app/blog/loot-priority-lists-vs-loot-council/page.tsx
    - app/blog/the-officer-burnout-problem-and-how-to-fix-it/page.tsx
    - app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx
    - app/research/wow-classic-loot-systems-2026/page.tsx
    - app/compare/page.tsx
    - app/pricing/page.tsx

key-decisions:
  - "Task 3's guard header comment avoids spelling out the identifier 'SCANNED_PATHS' in prose before the array declaration, because 11-02-PLAN.md's own <verify> command locates the array via a regex anchored on that exact string -- an earlier draft that used the identifier in the disclosed-scope-limit prose broke that verification by matching the prose sentence instead of the array. Fixed before commit; see Deviations."

patterns-established: []

requirements-completed: [TYPE-04]

coverage:
  - id: D1
    description: "Eight remaining blog posts and the research page migrated from max-w-3xl mx-auto to prose-measure mx-auto, inner prose typography chain byte-identical, app/blog/page.tsx untouched"
    requirement: "TYPE-04"
    verification:
      - kind: unit
        ref: "node -e batch assertion in 11-02-PLAN.md Task 1 <verify><automated> (per-file measure-wrapper count, max-w-3xl absence, inner-chain survival, blog index untouched)"
        status: pass
      - kind: other
        ref: "tailwindcss CLI compile scoped to app/blog/**/*.tsx + app/research/**/*.tsx, asserting .prose-measure { max-width: 70ch } is emitted"
        status: pass
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (1219/1219 passing at Task 1's commit)"
        status: pass
    human_judgment: false
  - id: D2
    description: "compare page's wrapper migrated from max-w-4xl mx-auto (896px, the phase's largest single narrowing) to prose-measure mx-auto; pricing FAQ answer gains prose-measure appended to its existing typography with no centering, grey literal and page-level wrapper untouched"
    requirement: "TYPE-04"
    verification:
      - kind: unit
        ref: "node -e assertion in 11-02-PLAN.md Task 2 <verify><automated> (compare measure-wrapper/literal-absence/inner-chain checks; pricing FAQ line composition, no-mx-auto, grey-literal-present, page-wrapper-intact checks)"
        status: pass
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (1219/1219 passing at Task 2's commit)"
        status: pass
    human_judgment: true
    rationale: "Task 2's own <verify><human-check> calls for a human to open /compare and /pricing at 1440 and 390 in both themes and judge legibility, cramping and FAQ alignment directly. This SUMMARY's Human-Check Observation section below is a real Puppeteer DOM-measurement proof (compare's wrapper width, FAQ h3/p left-edge alignment), not a fabricated visual review -- but it is not the qualitative legibility/cramping judgment the plan's human-check asks for, which is left to a human and to 11-05's after-capture comparison, per the same posture 11-01-SUMMARY.md used for its own tracer human-check."
  - id: D3
    description: "__tests__/prose-measure.test.ts: presence of the measure rule and its 70ch value, absence of the wrapper literal across the corrected explicit eleven-file list, presence on the pricing FAQ line, fail-loud-on-missing-path defensive test, observed red before green"
    requirement: "TYPE-04"
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/prose-measure.test.ts (4/4 passing)"
        status: pass
      - kind: other
        ref: "node -e SCANNED_PATHS/shared-helper/TYPE-04-naming assertion in 11-02-PLAN.md Task 3 <verify><automated>"
        status: pass
      - kind: other
        ref: "Fail-first proof: temporarily restored max-w-3xl mx-auto on app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx:128, re-ran the guard (1 of 4 tests failed, naming that exact file and line), then restored the file byte-identical (confirmed via git status --short) and re-ran to green -- see Fail-First Proof section below"
        status: pass
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (1223/1223 passing at Task 3's commit, full suite)"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-09-21
status: complete
---

# Phase 11 Plan 02: Remaining Call-Site Migration and the TYPE-04 Guard Summary

**Migrated the eleven remaining prose-measure call sites (eight blog posts, research, compare, pricing FAQ) to the shared `.prose-measure { max-width: 70ch }` class 11-01 proved, then stood up `__tests__/prose-measure.test.ts` on the corrected eleven-file guard scope and watched it fail and pass by name.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-09-21T15:03Z (Task 1 read/edit)
- **Completed:** 2026-09-21T22:32:28Z (Task 3 commit)
- **Tasks:** 3 (Task 1: auto, Task 2: auto, Task 3: auto)
- **Files modified:** 12 (11 page files + 1 new test file)

## Accomplishments

- All eight remaining blog posts and `app/research/wow-classic-loot-systems-2026/page.tsx` migrated from `max-w-3xl mx-auto` to `prose-measure mx-auto` in one batch commit, with a real Tailwind compile proving `.prose-measure { max-width: 70ch }` is emitted from that exact content set
- `app/compare/page.tsx`'s wrapper migrated from `max-w-4xl mx-auto` (896px -- the phase's single largest narrowing) to `prose-measure mx-auto`
- `app/pricing/page.tsx`'s FAQ answer paragraph gained `prose-measure` appended to its existing typography, with no centering, its grey `text-[#bababa]` literal and out-of-scope page-level wrapper both untouched
- `__tests__/prose-measure.test.ts` created: presence-asserts the measure rule and its `70ch` value, absence-asserts the old wrapper literal across an explicit eleven-file list (excluding the blog index page and pricing's page wrapper by name), presence-asserts the pricing FAQ call site, and was observed failing with a named file and line before being restored to green
- All twelve TYPE-04 call sites (the eleven from this plan plus 11-01's tracer) now reference one shared class; `grep -rn "max-w-3xl mx-auto\|max-w-4xl mx-auto" app/blog app/research app/compare` returns exactly one match, the out-of-scope blog index page

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate the eight remaining blog posts and the research page** - `3a8529b7` (feat)
2. **Task 2: Migrate the compare page wrapper and append the measure to the pricing FAQ answer** - `d2208801` (feat)
3. **Task 3: Stand up the TYPE-04 guard on the corrected eleven-file scope and prove it fails without the migration** - `307822e2` (test)

**Plan metadata:** (pending -- this SUMMARY's own commit)

## Files Created/Modified

- `app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx` - wrapper className swapped to `prose-measure mx-auto`
- `app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx` - same swap
- `app/blog/how-to-onboard-new-raiders-without-killing-morale/page.tsx` - same swap
- `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` - same swap
- `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` - same swap
- `app/blog/loot-priority-lists-vs-loot-council/page.tsx` - same swap
- `app/blog/the-officer-burnout-problem-and-how-to-fix-it/page.tsx` - same swap
- `app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx` - same swap
- `app/research/wow-classic-loot-systems-2026/page.tsx` - same swap
- `app/compare/page.tsx` - wrapper className swapped, narrowing from 896px (the phase's largest single narrowing)
- `app/pricing/page.tsx` - FAQ answer `<p>` gained `prose-measure` appended, no centering added
- `__tests__/prose-measure.test.ts` - new TYPE-04 guard (created)

## Pre-Edit / Post-Edit Grep, Side by Side

**Pre-edit** (`grep -rn "max-w-3xl mx-auto\|max-w-4xl mx-auto" app/blog app/research app/compare app/pricing`, live-verified before any edit in this plan, matching 11-02-PLAN.md's own table exactly):

```
app/blog/the-officer-burnout-problem-and-how-to-fix-it/page.tsx:122:        <div className="max-w-3xl mx-auto">
app/blog/how-to-onboard-new-raiders-without-killing-morale/page.tsx:122:        <div className="max-w-3xl mx-auto">
app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx:118:        <div className="max-w-3xl mx-auto">
app/blog/page.tsx:136:        <div className="max-w-3xl mx-auto">
app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx:122:        <div className="max-w-3xl mx-auto">
app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx:120:        <div className="max-w-3xl mx-auto">
app/research/wow-classic-loot-systems-2026/page.tsx:410:        <div className="max-w-3xl mx-auto">
app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx:128:        <div className="max-w-3xl mx-auto">
app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx:122:        <div className="max-w-3xl mx-auto">
app/blog/loot-priority-lists-vs-loot-council/page.tsx:122:        <div className="max-w-3xl mx-auto">
app/pricing/page.tsx:62:      <div className="max-w-4xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
app/compare/page.tsx:127:        <div className="max-w-4xl mx-auto">
```

**Post-edit** (same grep, run after all three tasks):

```
app/blog/page.tsx:136:        <div className="max-w-3xl mx-auto">
app/pricing/page.tsx:62:      <div className="max-w-4xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
```

Only the two out-of-scope, always-intended-to-survive wrappers remain: the blog index page's card-grid centering and pricing's own page-level wrapper. Every one of the ten in-scope wrapper sites this plan touched (nine blog/research + compare) is gone from this grep's output.

## Fail-First Proof (Task 3)

Per Task 3's `<action>`, the guard was proven non-vacuous before shipping. `app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx:128`'s className was temporarily reverted from `prose-measure mx-auto` back to `max-w-3xl mx-auto`, the guard was re-run, and the output was:

```
 ❯ __tests__/prose-measure.test.ts (4 tests | 1 failed) 85ms
   × finds no max-w-3xl mx-auto / max-w-4xl mx-auto wrapper literal on the eleven named call sites 69ms

 FAIL __tests__/prose-measure.test.ts > prose-measure guard (TYPE-04) > finds no max-w-3xl mx-auto / max-w-4xl mx-auto wrapper literal on the eleven named call sites
AssertionError: /Users/alexander.mayes/Code/personal/loot-list-plus/app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx:128: <div className="max-w-3xl mx-auto">: expected [ { …(3) } ] to have a length of +0 but got 1

- Expected
+ Received

- 0
+ 1

 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

The failure names the exact file (`app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx`) and line (`128`), as the plan requires. The file was then restored; `git status --short` on that path returned empty (byte-identical to its committed state) before the guard was re-run and confirmed green (4/4 passing).

## Human-Check Observation (Task 2 `<verify><human-check>`)

The plan's own human-check asks whether `/compare` and `/pricing` read legibly and un-cramped after the narrowing, in both themes at 1440 and 390, and whether the pricing FAQ answers stay flush-left under their questions. Following 11-01-SUMMARY.md's precedent, rather than fabricating a visual-quality verdict, a direct Puppeteer DOM measurement was taken against the already-running local dev server (port 3100, not newly started):

- **`/compare` at 1440px, both themes:** wrapper width narrows to **703.36px** (matching the tracer blog post's own 70ch resolution -- `ch` resolves against the same 16px Poppins body font regardless of the wrapper's prior width, so both the 768px-origin and 896px-origin wrappers land at the identical rendered pixel width). The H1 ("LootList+ vs TMB, DKP, EPGP and Loot Council") renders at 76.78px height (two line-heights). The comparison table's own `overflow-x-auto` container measures 701.36px, fitting inside the 703.36px wrapper with no overflow at this viewport.
- **`/compare` at 390px, both themes:** wrapper is viewport-clamped to 342px (both before and after this narrowing would produce the same clamp, since both 896px and 703px exceed 390px minus padding). The comparison table itself measures 670px wide and intentionally overflows its `overflow-x-auto` container -- this is the table's existing horizontal-scroll affordance, not a regression introduced by this plan.
- **`/pricing` FAQ, both viewports and both themes:** for the first three FAQ rows, the question (`<h3>`) and the answer (`<p>`, now carrying `prose-measure`) share the identical left edge (320px at 1440, 24px at 390) in every case measured -- confirming the answer stays flush-left directly under its question with no centering introduced, exactly as D-03 requires, regardless of answer length (53 to 202 characters across the three rows sampled).

This measurement is real (Puppeteer against the live dev server, script written to a scratch path outside the repo's tracked tree and deleted after use -- confirmed via `git status --short scripts/visual/` returning empty), not a static-image guess. It confirms the specific structural claims the plan's human-check names (flush-left FAQ alignment, no table overflow at 1440, the largest-narrowing note for 11-05) but is not the full qualitative legibility/cramping visual review a human eye performs -- that judgment is left to a human and to 11-05's after-capture comparison, the same posture 11-01-SUMMARY.md used for its own tracer human-check finding. The 896px-to-70ch narrowing on `/compare` is the phase's largest single re-flow and should be the first thing 11-05's fold-naming exercise checks.

## Decisions Made

- Task 3's guard header comment was written to avoid literally spelling out the identifier `SCANNED_PATHS` in prose before its declaration (using "the scanned-files list" instead), because 11-02-PLAN.md's own `<verify><automated>` command locates the array via `s.match(/SCANNED_PATHS[\s\S]*?\]/)` -- a non-greedy match that stops at the *first* `]` character found after the *first* occurrence of the literal string `SCANNED_PATHS`. An earlier draft used the identifier in the disclosed-scope-limit prose (following the sibling guards' convention of naming things explicitly), which caused that regex to match the prose's own closing bracket (inside an example like `` `max-w-[48rem]` ``) rather than the actual array -- silently reporting 2 scanned paths instead of 11. Caught and fixed before the Task 3 commit; see Deviations below.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guard header comment broke the plan's own SCANNED_PATHS verification regex**
- **Found during:** Task 3, while running the plan's exact `<verify><automated>` command as a pre-commit check (not yet committed)
- **Issue:** The header comment's disclosed-scope-limit prose spelled out the literal identifier `SCANNED_PATHS` twice before the actual `const SCANNED_PATHS = [...]` declaration. The plan's own verification script extracts the array via a non-greedy regex anchored on that identifier and stopping at the first `]`; because the prose itself contained both the identifier and, further down, a bracketed example (`` `max-w-[48rem]` ``), the regex matched prose text instead of the array and reported "2 scanned paths" instead of 11 -- which would have failed the plan's own acceptance criterion, not because the guard was wrong, but because the header comment made it unverifiable by the prescribed method.
- **Fix:** Reworded the two prose references from "SCANNED_PATHS is..." / "corrected SCANNED_PATHS note" to "the absence check below scans..." / "corrected scanned-files note", preserving every substantive disclosure (the eleven-file scope, both excluded files and their reasons) without repeating the exported identifier's exact spelling until its own declaration line.
- **Files modified:** `__tests__/prose-measure.test.ts` (fixed in-place before the Task 3 commit; no separate commit exists for the broken intermediate state)
- **Verification:** Re-ran the plan's exact `node -e` verification command after the fix; it printed `ok`, correctly counting 11 scanned paths and correctly asserting neither excluded file is present
- **Committed in:** `307822e2` (Task 3 commit; the file was corrected before this, its only commit)

---

**Total deviations:** 1 auto-fixed (1 bug). **Impact:** None on shipped behavior -- the guard's actual logic and scope were correct throughout; only the plan's own external verification method was briefly incompatible with an early draft of the header comment's wording, caught and fixed before any commit.

## Issues Encountered

- One full-suite `npx vitest run --maxWorkers=2` run (taken between Task 2 and Task 3, before the new guard file existed) showed a single unrelated failure in a duplicate-rendering harness test outside this plan's scope (not touching any file this plan modifies). An immediate re-run with identical code was fully green (74/74 files, 1223/1223 tests passing, including the four new prose-measure tests). Per STATE.md's own documented Phase 08 worker-pool finding (cited in this plan's `<verification>` block), this is a known flake class in this suite's parallel test execution, not a regression introduced by this plan -- out of scope per the deviation rules' scope-boundary guidance (pre-existing, unrelated to the current task).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- TYPE-04's call-site half is complete: all twelve sites (11-01's tracer plus this plan's eleven) reference the one shared `prose-measure` class; no in-scope page carries its own wrapper width literal
- The TYPE-04 guard (`__tests__/prose-measure.test.ts`) is live, has been observed both red (naming file and line) and green, and is scoped to the corrected eleven-file list per 11-01-SUMMARY.md's discrepancy 2
- `/compare`'s 896px-to-70ch narrowing is the phase's largest single re-flow and is flagged above by name for 11-05's fold-naming exercise to check first, alongside the tracer's own H1 line-gain finding already carried forward by 11-01
- TYPE-04 requirement is **not yet marked complete** at the requirements-tracking level -- 11-05 also declares it and has not yet produced its own SUMMARY.md (shared-ID gate; see `requirements.ready-ids` result recorded at execution time)
- Nothing in this plan touched `app/globals.css`, selection, caret, the scrollbar rule or the dead score selector -- those remain 11-03's and 11-04's work, against the same file, unaffected by anything in this plan

## Self-Check: PASSED

- `app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx` contains `className="prose-measure mx-auto"` and no `max-w-3xl`: FOUND
- All eight other migrated blog post files and `app/research/wow-classic-loot-systems-2026/page.tsx` contain `className="prose-measure mx-auto"` and no `max-w-3xl`: FOUND
- `app/compare/page.tsx` contains `className="prose-measure mx-auto"` and no `max-w-4xl`: FOUND
- `app/pricing/page.tsx` contains `prose-measure` on the FAQ answer line alongside `font-poppins`/`text-[#bababa]`/`leading-relaxed`, no `mx-auto` on that line, and its page-level `max-w-4xl mx-auto px-6...` wrapper intact: FOUND
- `__tests__/prose-measure.test.ts` exists, 4/4 tests passing: FOUND
- Commit `3a8529b7` (Task 1): FOUND in `git log --oneline --all`
- Commit `d2208801` (Task 2): FOUND in `git log --oneline --all`
- Commit `307822e2` (Task 3): FOUND in `git log --oneline --all`
- `git diff --name-only HEAD~1` from Task 3's commit lists exactly `__tests__/prose-measure.test.ts`: CONFIRMED
- `grep -rn "max-w-3xl mx-auto\|max-w-4xl mx-auto" app/blog app/research app/compare` returns exactly one match (`app/blog/page.tsx:136`): CONFIRMED
- Full suite `npx vitest run --maxWorkers=2`: 74/74 files, 1223/1223 tests passing: CONFIRMED

---
*Phase: 11-reading-and-browser-surfaces*
*Completed: 2026-09-21*
