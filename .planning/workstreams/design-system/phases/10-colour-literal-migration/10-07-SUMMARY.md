---
phase: 10-colour-literal-migration
plan: 07
subsystem: ui
tags: [visual-regression, puppeteer, vitest, evidence, broken-windows-ledger, tailwindcss-cli]

# Dependency graph
requires:
  - phase: 10-05
    provides: "COLOR-05 fully shipped (15 Tailwind class sites + 19 JS/TS data sites, both guards green)"
  - phase: 10-06
    provides: "COLOR-03 fully shipped (--background-inset deleted from both definition sites, six nested-Card conversions, absence guard green), plus WINDOWS.md entry 19 (the pre-existing broken npm run build)"
provides:
  - "A symmetric post-phase-10 after-capture (Home-only fallback, 4 images) at .planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/, with all four image pairs hashed against the before-capture and bucketed"
  - "WINDOWS.md entry 20 naming the after-capture's own Home-only limitation, mirroring entry 15's before-capture limitation"
  - "All five ROADMAP Phase 10 success criteria answered by verbatim command output run this session"
  - "A complete reconciliation list: every concern this phase recorded, with a named destination for each"
affects: [phase-11-reading-and-browser-surfaces, phase-12-enforcement-and-docs]

# Actuals (#2632)
actuals:
  tokens: 3200
  tasks: 2
  commits: 1

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A capture-pair diff that is not byte-identical is triaged by pixel-diff magnitude (max per-channel delta, bounding box) before being called a regression -- a sub-3% max delta confined to one fixed region present identically in both themes traces to an autoplaying <video> element's frame-timing nondeterminism between two separate capture runs, not a code change, and the CSS animation/transition disabling style tag this script already injects does not reach native <video> playback."

key-files:
  created:
    - .planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/
  modified:
    - .planning/WINDOWS.md

key-decisions:
  - "Restarted a stale, unresponsive dev server process (16h56m uptime, hanging on every page request) before capturing, rather than capturing against a broken server or fabricating a fallback reason that wasn't the real one -- confirmed the replacement server serves Home at 200 before running the capture script."
  - "Treated the two differing 1440-viewport image pairs as investigated-and-explained rather than as a Phase 10 regression: pixel-diff analysis (PIL) shows a max per-channel delta of 18/765 confined to identical coordinates (x 0-186, y 512-734) in both light and dark captures, tracing to LandingHero.tsx's autoplaying, unposter'd hero-demo.mp4 video -- no Phase 10 plan touched this file or any file that renders in that region."
  - "Recorded the grep -c vs grep -o discrepancy on ROADMAP criterion 2's faction-count check honestly (4 matching lines, not the 'at least 6' the plan's own acceptance criteria assumed) rather than silently substituting the occurrence-count form to make the number match -- the plan's acceptance criteria used -c's line-count semantics but was evidently written expecting occurrence-count semantics; ROADMAP's own criterion 2 only requires non-zero/up-from-zero, which both forms satisfy."

patterns-established:
  - "A post-phase evidence plan states plainly, by WINDOWS.md entry id, which half of a compound ROADMAP criterion (here: criterion 5's lint/typecheck/test half vs its screenshot half) is met and which is not, rather than reporting the whole criterion as a single pass/fail."

requirements-completed: [COLOR-03, COLOR-04, COLOR-05, COLOR-07]

coverage:
  - id: D1
    description: "post-phase-10 after-capture taken (Home-only fallback, symmetric with the before-capture), all four image pairs hashed and bucketed, WINDOWS.md entry 20 recorded"
    requirement: COLOR-07
    verification:
      - kind: unit
        ref: "ls .planning/workstreams/design-system/baselines/*-post-phase-10/manifest.json && grep -riE 'service_role|eyJ[A-Za-z0-9_-]{10,}' .planning/workstreams/design-system/baselines/*-post-phase-10/ (zero matches) && git status --porcelain app components lib __tests__ scripts (empty)"
        status: pass
      - kind: other
        ref: "md5 hash comparison of all 4 image pairs: 2 SAME, 2 DIFFERENT (explained -- see 'Unintended and unexplained' bucket below)"
        status: pass
    human_judgment: true
    rationale: "The plan's own <human-check> (open before/after side by side, confirm the faction label and raid-tracking Epic-purple backstops) cannot be run in full: the fallback captures Home only, and none of guild-settings, raid-tracking, master-sheet or profile render in a Home-only capture. This is stated plainly below, not absorbed as a pass."
  - id: D2
    description: "All five ROADMAP Phase 10 success criteria answered by their own re-run command, output recorded verbatim in this summary"
    requirement: COLOR-03
    verification:
      - kind: unit
        ref: "grep -rn 'background-inset' app/ components/ lib/ scripts/ tailwind.config.js (zero); grep -rniE five-hex-value pattern app/ components/ (zero); grep -rnE purple-family pattern (zero, both literal and wide forms); npx vitest run <9-file guard family> (40/40 passed); npm run lint (0 errors); npm run typecheck (exit 0); npm run test (72 files/1213 tests passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Reconciliation list produced naming a destination for every concern this phase recorded -- no entry left undestined"
    verification: []
    human_judgment: true
    rationale: "Assembling and judging the completeness of a cross-plan reconciliation list is an editorial judgment call, not a mechanically checkable assertion; the list itself is the deliverable, reproduced in full below for a human or a later phase to audit against."

duration: 50min
completed: 2026-09-21
status: complete
---

# Phase 10 Plan 07: After-Capture, Visual Comparison and Success-Criteria Evidence Summary

**Took the post-phase-10 after-capture (Home-only fallback, symmetric with the before-capture), hashed and bucketed all four image pairs -- explaining the only two that differ as pre-existing video-frame-timing noise unrelated to any Phase 10 file -- and answered all five ROADMAP Phase 10 success criteria with verbatim command output run this session, closing the phase's evidence record with a full reconciliation list.**

## Performance

- **Duration:** ~50 min (includes diagnosing and restarting a stale, hung dev server process before the capture could run)
- **Completed:** 2026-09-21
- **Tasks:** 2/2 complete
- **Files modified:** 6 (5 new baseline files + `manifest.json`, 1 `WINDOWS.md` edit)

## Capture outcome (Task 1)

`GET /api/dev/test-users` was re-checked live this session against a freshly restarted local dev server (the pre-existing dev server process, 16h56m uptime, had gone unresponsive -- every page request timed out after 30s even though the API route still answered; restarted, the replacement server served Home at HTTP 200 within 244ms). The endpoint still returned **404** (`npm run test:users:create` has not been run in this session), so the after-capture falls back to **Home-only** (4 images: `home-{dark,light}-{1440,390}.png`), exactly symmetric with the before-capture's own fallback.

This is recorded as **`.planning/WINDOWS.md` entry 20** (`unrun-verify`, phase 10), stating plainly that ROADMAP success criterion 5's screenshot half is **not met** for the six authenticated screens (overview, guild-settings, loot-management, master-sheet, raid-tracking, profile) and is routed to end-of-phase UAT, exactly as entry 15 already states for the before-capture. Entry 16 (the two modals unreachable by any fixed-route capture -- `OnboardingModal.tsx` and `ScoreComparisonModal.tsx`) was re-confirmed still present and open; this plan added no new information about those two sites, since neither is reachable by a Home-only or even a fully-authenticated fixed-route capture without a synthetic click hook, which this plan does not add.

Committed capture directory: `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/`, containing `manifest.json` and the 4 Home-only PNGs. `grep -riE "service_role|eyJ[A-Za-z0-9_-]{10,}"` over the directory returns zero matches.

## Image-pair hash comparison table

| File | Before md5 | After md5 | Result |
|---|---|---|---|
| `home-light-1440.png` | `02e03f630401a999355ac6ce1364b558` | `32654ee497ae3397d69dc508100e2221` | **DIFFERENT** -- see below |
| `home-light-390.png` | `5ecde107d848ae001f1a701269fb5a11` | `5ecde107d848ae001f1a701269fb5a11` | SAME |
| `home-dark-1440.png` | `b59abe055d9013a147f25dcb4019b698` | `43a7bad36474e9bc12163431b5aabb26` | **DIFFERENT** -- see below |
| `home-dark-390.png` | `509309eb64fd64ee8a07a1d4a58258b4` | `509309eb64fd64ee8a07a1d4a58258b4` | SAME |

### Bucket: Expected and correct

Empty. No Phase 10 file renders on the public Home page's fixed-route capture (the only screen this Home-only fallback reaches): the faction toggle, the avatar fallbacks, the master-sheet button, the onboarding/score-comparison sites, the quality/brand data sites and the nested-Card conversions all live on authenticated screens this capture did not reach. `ParallaxItem.tsx` and `ClickEffects.tsx` (the two landing-subtree files 10-05 did touch) render as part of Home's hero and value-props sections, but 10-05's own evidence proved every one of their ten migrated sites evaluates to a byte-identical runtime colour string before and after -- so even where Phase 10 code does render on Home, it is proven incapable of producing a pixel difference here.

### Bucket: Expected but reading worse

Empty. Nothing in this bucket, since nothing on the expected-change list applies to a Home-only capture.

### Bucket: Unintended and unexplained -- investigated, both entries explained

Two pairs differ: `home-light-1440.png` and `home-dark-1440.png` (the two 390-viewport pairs are byte-identical). Investigated via a PIL pixel-diff:

- Both differing pairs show a maximum per-channel delta of **18 out of a possible 765** (sum of R+G+B absolute difference), confined to an identical bounding region -- **x: 0-186, y: 512-734** -- in both the light and the dark capture. The region and magnitude are identical across themes, which rules out a theme-dependent CSS or token change (the very thing this phase edits).
- Visual inspection of the region (zoomed crop, both before and after) shows no perceptible difference to the eye.
- The region corresponds to `app/components/landing/LandingHero.tsx`'s dashboard-preview panel, where a static `dashboard-preview.webp` `<Image>` sits under an `autoPlay loop muted playsInline` `<video>` element (`hero-demo.mp4`, `preload="none"`). `scripts/visual/baseline.mjs`'s animation-disabling style tag (`animation: none !important; transition: none !important;`) suppresses CSS animations and transitions but has no effect on native `<video>` playback, which starts asynchronously via the `onCanPlay` handler's `.play()` call. Two separate capture runs, minutes apart, therefore screenshot the video at two slightly different points in its playback timeline -- a source of nondeterminism inherent to any autoplaying video element, present before this plan's capture and unrelated to any file this phase or Phase 10 as a whole touched.
- Confirmed no Phase 10 plan (10-01 through 10-06) modified `LandingHero.tsx`, `hero-demo.mp4`, or `dashboard-preview.webp`.

**Conclusion: both differing pairs are explained.** The unintended-and-unexplained bucket is not empty by count, but every entry in it carries a recorded explanation, satisfying this task's acceptance criterion. Neither difference is a Phase 10 regression, and neither needs a routed destination beyond this record.

## Backstopped visual items (both NOT confirmed by this plan -- stated plainly, not absorbed as a pass)

- **D-11 (faction label darkening):** requires the `/guild-settings` screen, which the Home-only fallback does not reach. **Not confirmed by this plan.**
- **D-13 (item-quality naming resolution, raid-tracking Epic-purple check):** requires the `/raid-tracking` screen, which the Home-only fallback does not reach. **Not confirmed by this plan.**

Both remain held out as backstops per the plan's own `must_haves`, and both are now explicitly covered by the same routed destination as the rest of criterion 5's screenshot half: end-of-phase UAT (WINDOWS.md entries 15 and 20).

## Unreachable modals (re-confirmed, not newly resolved)

`.planning/WINDOWS.md` entry 16 -- `OnboardingModal.tsx` (two of the six COLOR-07 sites) and `ScoreComparisonModal.tsx` -- remains open and correctly still routed to end-of-phase UAT. This plan did not attempt a synthetic click hook and confirms the entry is still accurate.

## Task Commits

1. **Task 1: Take the after-capture and compare it against the before-capture** - `24fcda3e` (chore)
2. **Task 2: Answer all five ROADMAP success criteria by re-running their own commands** - no source or baseline file change; this task is pure verification and is recorded in this summary and the final docs/state commit. `git status --porcelain app components lib __tests__ scripts tailwind.config.js` was empty both before and after running every criterion's command.

## Criterion-by-criterion evidence (Task 2, all commands re-run this session, output recorded verbatim)

### Criterion 1 -- `--background-inset` absent from source and config

```
$ grep -rn 'background-inset' app/ components/ lib/ scripts/ tailwind.config.js
(no output, exit 1)
```

Zero matches, repo-wide. The twelve original uses reconciled from 10-04 and 10-06: six non-card sites (`DashboardContent.tsx` x2 progress-bar tracks, `LootListSummaryView.tsx` x3 chip/pills, `horizontal-scroll.tsx` x1 shared hover fill) moved to `bg-muted`/`hover:bg-muted` (10-04); six card-shaped sites (`ProfileContent.tsx`, `DashboardContent.tsx` x2, `EditCharacterModal.tsx`, `skeletons.tsx` x2) converted to `<Card variant="nested">` (10-06), which then deleted the token from both its definition sites (`app/globals.css`'s `:root`/`.dark`, `tailwind.config.js`'s `background` colour object). 6 + 6 = 12, the zero count's full denominator.

### Criterion 2 -- Faction surfaces use `--alliance`/`--horde`, zero blue/red palette or raw rgb

```
$ grep -cE '(border|bg|text|group-hover:text)-(alliance|horde)' "app/(app)/guild-settings/components/GuildSettingsContent.tsx"
4
```

```
$ grep -nE '(border|bg|text)-(blue|red)-[0-9]+' "app/(app)/guild-settings/components/GuildSettingsContent.tsx"
(no output, exit 1)
```

```
$ grep -nE 'rgba?\(' "app/(app)/guild-settings/components/GuildSettingsContent.tsx"
(no output, exit 1)
```

**Recorded discrepancy, not silently reconciled:** this plan's own acceptance criteria stated the faction-token grep "is at least 6," but `grep -c` counts *matching lines*, not occurrences, and two of the four matching lines each carry two faction-token classes (`text-alliance`/`group-hover:text-alliance` on one line, `text-horde`/`group-hover:text-horde` on another). Re-running the same pattern with `-o | wc -l` (occurrence count) gives **8**, comfortably over 6. The plan's acceptance-criteria wording assumed occurrence-count semantics that bash `grep -c` does not provide -- an authoring mismatch in 10-07-PLAN.md itself, not a regression in the migrated code. ROADMAP's own criterion 2 wording only requires the count to be non-zero, "up from zero uses today" -- both the line-count form (4) and the occurrence-count form (8) satisfy that. No fix applied (this plan ships no source or plan-text change); recorded here so the number is never silently substituted to make "at least 6" appear to pass as literally written.

Zero blue/red palette classes and zero raw `rgb()`/`rgba()` calls confirmed by direct re-run, both empty.

### Criterion 3 -- WoW item-quality and brand hex values named as tokens

```
$ grep -rniE "#(a335ee|1eff00|0074E0|5865F2|e35e15)" app/ components/
(no output, exit 1)
```

Zero matches. Starting figure was 34 occurrences (RESEARCH.md's re-measured total, reconciled against CONTEXT.md's 34-line baseline). The wide/34-occurrence scope branch was locked at 10-02's gate ("approve as presented") and executed in full, including the landing subtree and `AccentColorContext.tsx`. Split: **15 Tailwind arbitrary-value class sites** migrated onto five new named Tailwind colour keys (`quality-epic`, `quality-uncommon`, `brand-battlenet`, `brand-discord`, `brand-wcl`) in 10-03, plus **19 plain JS/TS data sites** (object values, an object key, SVG attributes, inline style strings, a docs display string) migrated onto `QUALITY_COLORS`/`BRAND_COLORS` imports from `lib/design-system/quality-colors.ts` in 10-05. 15 + 19 = 34, the full count accounted for. No narrow-scope branch was taken, so no landing line was excluded from this migration.

### Criterion 4 -- App-side purple/violet/pink/fuchsia gradients resolved

```
$ grep -rnE "(from-purple-|to-pink-|bg-violet-|text-purple-|via-purple-)" "app/(app)" app/components | grep -v "/landing/"
(no output, exit 1)
```

```
$ grep -rnE '(from|to|via|bg|text|border|ring|fill|stroke|hover:bg|hover:text|hover:border|group-hover:bg|group-hover:text)-(purple|violet|pink|fuchsia)-[0-9]+' "app/(app)" app/components | grep -v "/landing/"
(no output, exit 1)
```

Both the ROADMAP-literal grep and the wider shade-agnostic/variant-prefix-agnostic form return zero, under `app/(app)` and `app/components` with `landing/` excluded. All six purple/violet/pink sites (`Sidebar.tsx`, `AppLayout.client.tsx`, `OnboardingModal.tsx` x2, `MasterSheetContent.tsx`, `ScoreComparisonModal.tsx`) moved to `--accent` in 10-02. Marketing purple on public pages is untouched by decision; the 10-02 guard's fail-first proof independently confirmed the `landing/` carve-out actively filters rather than the subtree merely being clean.

### Criterion 5 -- Lint, typecheck, test, and the screenshot half

```
$ npm run lint
...
✖ 397 problems (0 errors, 397 warnings)
```
0 errors. 397 warnings, all pre-existing and unrelated to this phase (unchanged count from 10-02/10-03/10-05's own runs, in `utils/feature-flags.ts`, `utils/server-roles.ts`, `utils/supabase/__tests__/paginate.test.ts`).

```
$ npm run typecheck
> tsc --noEmit
(exit 0)
```

```
$ npm run test
...
 Test Files  72 passed (72)
      Tests  1213 passed (1213)
```
All 72 files / 1213 tests passed on the default-concurrency run; no worker-pool exhaustion was observed, so the `--maxWorkers=2` re-run named in this plan's `<verification>` block was not needed to reach a conclusive green result.

**Screenshot half, stated plainly:** the after-capture fell back to Home-only (see "Capture outcome" above, WINDOWS.md entry 20). **Criterion 5's screenshot half is NOT met by this plan** for the six authenticated screens (overview, guild-settings, loot-management, master-sheet, raid-tracking, profile) or for the two backstopped visual items (D-11, D-13). It is routed to end-of-phase UAT, exactly as the plan requires, and is not reported as a pass under any framing. The lint/typecheck/test third of criterion 5 is fully met.

### Full guard family (this phase's 5 new guards + every prior-phase guard)

```
$ npx vitest run __tests__/background-inset-absence.test.ts __tests__/quality-brand-color-literals.test.ts __tests__/quality-brand-token-parity.test.ts __tests__/purple-gradient-guard.test.ts __tests__/faction-color-literals.test.ts __tests__/token-palette-literals.test.ts __tests__/hand-rolled-cards.test.ts __tests__/arbitrary-text-sizes.test.ts __tests__/type-scale-floor.test.ts
...
 Test Files  9 passed (9)
      Tests  40 passed (40)
```
Green in one run: covers Phase 10's five new guards (`background-inset-absence`, `quality-brand-color-literals`, `quality-brand-token-parity`, `purple-gradient-guard`, `faction-color-literals`) alongside Phase 09's `hand-rolled-cards`/`arbitrary-text-sizes` and Phase 07's `token-palette-literals`/`type-scale-floor`.

### Final source-change proof

```
$ git status --porcelain app components lib __tests__ scripts tailwind.config.js
(no output, exit 0)
```
Empty at the end of both tasks -- this plan shipped no source change, proving T-10-29's mitigation held.

## Reconciliation list -- every concern this phase recorded, with a named destination

| # | Concern | Destination |
|---|---|---|
| 1 | WINDOWS.md #15 -- 10-01's before-capture Home-only fallback (all six authenticated screens) | End-of-phase UAT (10-UAT.md) |
| 2 | WINDOWS.md #16 -- `OnboardingModal.tsx` and `ScoreComparisonModal.tsx` unreachable by fixed-route capture | End-of-phase UAT (10-UAT.md); re-confirmed still open by this plan |
| 3 | WINDOWS.md #17 -- 10-04's unrun progress-bar track-fill contrast human-check | End-of-phase UAT (10-UAT.md) |
| 4 | WINDOWS.md #18 -- 10-04's unrun `horizontal-scroll.tsx` hover-fill human-check | End-of-phase UAT (10-UAT.md) |
| 5 | WINDOWS.md #19 -- pre-existing, phase-unrelated broken `npm run build` (`/blog/*` static-page-data collection, `TypeError: c.createContext is not a function`), independently reproduced at commit `27b3df5e` (pre-Phase-10) | Its own separate investigation, explicitly NOT this phase's job -- open, tracked, unresolved |
| 6 | WINDOWS.md #20 (new, this plan) -- 10-07's own after-capture Home-only fallback | End-of-phase UAT (10-UAT.md); also carries D-11 and D-13's unconfirmed backstop status |
| 7 | `brand-discord`/`discord` duplicate Tailwind key (two near-identical Discord blues in one config, one to two 8-bit steps apart) | Phase 12's design documentation (ENF-01/ENF-02), per 10-02's gate decision (option a) |
| 8 | Measured discrepancy: `--alliance`/`--horde` round-trip one 8-bit step per channel from `blue-500`/`red-500`, not byte-identical as CONTEXT.md/RESEARCH.md originally claimed | Corrected in 10-01-SUMMARY.md and STATE.md; informational only, no further action -- the migration is a rename within one 8-bit step, work unaffected |
| 9 | Measured discrepancy: RESEARCH.md's landing-subtree hex table undercounted by one row (`ParallaxItem.tsx:33` missing; totals row was already correct) | Corrected at 10-02's gate; informational only, already reconciled |
| 10 | Measured discrepancy: the `--muted` substitution on six non-card inset sites is a visible colour change in both themes, not a like-for-like swap | Same destination as WINDOWS.md #17/#18 -- end-of-phase UAT confirms whether it reads acceptably |
| 11 | Measured discrepancy: `--discord`'s existing custom property is not the literal Discord brand hex | Same as concern #7 (this is the same finding, the root cause of the duplicate key) -- Phase 12's design documentation |
| 12 | This plan's own criterion-2 acceptance-criteria wording mismatch (`grep -c` line-count vs the assumed occurrence-count semantics; actual 4 vs the plan's stated "at least 6") | Recorded here, in this summary's Criterion 2 section; no code or plan-text fix needed since ROADMAP's own criterion (non-zero, up from zero) is satisfied either way |
| 13 | Task 1's own hash-comparison flag: `home-{light,dark}-1440.png` pixel-diff, traced to `hero-demo.mp4` autoplay frame-timing nondeterminism | Investigated and explained in this summary's "Unintended and unexplained" bucket above -- not a Phase 10 regression, no further destination needed |
| 14 | COLOR-05 narrow-scope landing exclusions | Not applicable -- the wide/34-occurrence branch was chosen at 10-02's gate, so no landing line was excluded |

No entry above is left without a named destination.

## Files Created/Modified

- `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/` - after-capture (Home-only fallback), 4 PNGs + `manifest.json`
- `.planning/WINDOWS.md` - entry 20, the after-capture's own Home-only fallback recorded as `unrun-verify`

## Decisions Made

- Diagnosed and restarted a stale, unresponsive dev server process before capturing (see key-decisions above) rather than accepting a broken capture or a fabricated fallback reason.
- Treated the two differing 1440-viewport image pairs as investigated-and-explained (autoplaying video frame-timing noise, not a Phase 10 code change) after confirming via pixel-diff magnitude, bounding-box symmetry across themes, and a file-touch check against all six 10-0x plans' `key-files`.
- Recorded the criterion-2 `grep -c`/`grep -o` semantics mismatch honestly rather than silently reporting "6+" to match the plan's literal acceptance-criteria wording.

## Deviations from Plan

None that required a fix -- this plan ships no source change by design (`autonomous: true`, threat model T-10-29). Two things worth naming as procedural, not code, deviations:

1. **[Rule 3 - Blocking, procedural only]** The local dev server was found unresponsive (16h56m stale process, every page request timing out) when this plan started. Restarted it (kill + `npm run dev`) before the capture could run at all. No source file was touched; this is an environment fix, not a code fix, and required no user permission since it only affects a local, disposable dev-server process.
2. **[Documented, not fixed]** This plan's own acceptance criteria for criterion 2's faction-token grep assumed occurrence-count semantics that `grep -c` does not provide. Recorded verbatim in the Criterion 2 section above rather than silently substituting `-o | wc -l` to make "at least 6" appear satisfied as literally written.

**Total deviations:** 0 requiring a source-file fix. 1 environment-only fix (dev server restart), 1 honestly-recorded plan-wording discrepancy.

## Issues Encountered

- The pre-existing local dev server process was hung (see above) -- resolved by restart, not a code issue.
- `GET /api/dev/test-users` still returns 404 -- expected, already-documented fallback path (WINDOWS.md entries 10, 13, 15), not a new problem.

## User Setup Required

None for this plan's own scope. The standing outstanding item across Phases 09 and 10 remains: run `npm run test:users:create` (with `SUPABASE_SERVICE_ROLE_KEY` in your own shell, never shared with the agent) if a full authenticated visual comparison is wanted before end-of-phase UAT; otherwise the UAT walkthrough itself covers the six authenticated screens and the two unreachable modals.

## Next Phase Readiness

Phase 10's execution is complete: all four requirements (COLOR-03, COLOR-04, COLOR-05, COLOR-07) are shipped, guarded, and evidenced by command output run this session. All five ROADMAP success criteria are answered -- four fully met by reproducible zero-count greps and a green guard/lint/typecheck/test suite, and the fifth (criterion 5) met on its lint/typecheck/test third while its screenshot third is explicitly NOT met and routed to end-of-phase UAT alongside the two backstopped visual items (D-11, D-13) and the two unreachable modals (WINDOWS.md entry 16).

Per this workstream's standing convention, phase closure still requires code review, a security review if applicable, goal-backward verification (10-VERIFICATION.md) and UAT harvesting (10-UAT.md) before `phase.complete` can run -- none of that is this plan's job. Six open WINDOWS.md entries (15, 16, 17, 18, 19, 20) and this plan's own reconciliation list above are the complete standing backlog for whoever runs those next steps.

## Self-Check: PASSED

- FOUND: `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/manifest.json`
- FOUND: `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/home-light-1440.png`
- FOUND: `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/home-light-390.png`
- FOUND: `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/home-dark-1440.png`
- FOUND: `.planning/workstreams/design-system/baselines/2026-09-21-post-phase-10/home-dark-390.png`
- FOUND: `.planning/WINDOWS.md` entry 20 (`open_count: 18`, `total_count: 20` in the ledger's own frontmatter after the append)
- FOUND: commit `24fcda3e`

---
*Phase: 10-colour-literal-migration*
*Plan: 07*
*Completed: 2026-09-21*
