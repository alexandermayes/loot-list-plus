---
phase: 10-colour-literal-migration
plan: 02
subsystem: ui
tags: [tailwindcss, guard-test, vitest, tailwindcss-cli, accent-token, checkpoint]

requires:
  - phase: 10-01
    provides: "The faction-toggle tracer that proved the token -> Tailwind key -> call-site class -> guard -> CI loop end-to-end on one file, and the screenshot gate extended to master-sheet/raid-tracking/profile"
provides:
  - "All six purple/violet/pink sites (Sidebar.tsx, AppLayout.client.tsx, OnboardingModal.tsx x2, MasterSheetContent.tsx, ScoreComparisonModal.tsx) migrated onto --accent"
  - "__tests__/purple-gradient-guard.test.ts: COLOR-07 regression guard, observed red on a reverted site and still green with a purple class present under landing/"
  - "The phase's single blocking human gate resolved: recorded answer for the purple/gradient proposal, the --background-inset hover-border pitfall, the --muted delta, the COLOR-05 scope and mechanism, and the Discord-key collision"
affects: [10-03-quality-brand-tokens, 10-04, 10-05, 10-06, 10-07-post-phase-capture]

actuals:
  tokens: 3800
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Multiple --content flags to the tailwindcss CLI silently override rather than merge (only the last flag's file is scanned); the correct form is one --content flag with a comma-separated path list. Recorded here since it inverted the before/after diff for the first attempt at this plan's own verification."
    - "Guard-test family (sourceFiles/matchesIn) extended to a fifth guard, keeping the explicit scan-roots + named path-prefix carve-out + disclosed-scope-limit shape, following COLOR-04's precedent of a directory scan (this guard) rather than an explicit file list (COLOR-06's shape)"

key-files:
  created:
    - "__tests__/purple-gradient-guard.test.ts"
  modified:
    - "app/components/Sidebar.tsx"
    - "app/(app)/AppLayout.client.tsx"
    - "app/components/OnboardingModal.tsx"
    - "app/(app)/master-sheet/components/MasterSheetContent.tsx"
    - "app/components/ScoreComparisonModal.tsx"

key-decisions:
  - "Gate answer: approve as presented (option `approve`), taking the recommended answer on every open item. Recorded verbatim below under 'Blocking gate: recorded answer'."
  - "D-01 through D-04 applied exactly as locked: avatar fallbacks to flat bg-accent, onboarding wash middle stop to accent/10, onboarding animated border to accent/30-70-30, master-sheet button to bg-accent/hover:bg-accent/90/text-accent-foreground (button.tsx:83's convention), score-comparison chip to bg-accent/20 text-accent."
  - "COLOR-07 guard scans app/(app) and app/components as a directory walk (sourceFiles), filtering app/components/landing/ by a path-prefix test rather than an exact-file exclusion set, matching D-05's carve-out and the plan's own required mechanism."

patterns-established:
  - "Fail-first proof for a directory-scan-with-carve-out guard has two required halves, not one: red on a reverted migrated site (proves the guard detects), and still green with the same detection pattern present inside the excluded subtree (proves the carve-out filters rather than the subtree merely being clean)."

requirements-completed: [COLOR-07]

coverage:
  - id: D1
    description: "The phase's single blocking human gate (purple/gradient visual proposal, --background-inset hover-border pitfall, --muted delta, COLOR-05 scope and mechanism, Discord-key collision) presented and resolved as 'approve as presented' before any file under app/ or components/ was edited"
    verification: []
    human_judgment: true
    rationale: "This is the gate itself -- the orchestrator's instructions record the user's prior 'approve as presented' answer to this exact gate; there is no further automated verification for a recorded human decision."
  - id: D2
    description: "All six purple/violet/pink sites migrated to --accent; ROADMAP success criterion 4's exact grep and the wider shade/variant-agnostic grep both return zero under app/(app) and app/components with landing/ excluded"
    requirement: "COLOR-07"
    verification:
      - kind: other
        ref: "grep -rnE '(from-purple-|to-pink-|bg-violet-|text-purple-|via-purple-)' 'app/(app)' app/components | grep -v '/landing/' -- zero matches"
        status: pass
      - kind: other
        ref: "shade-agnostic/variant-prefix-agnostic grep across purple/violet/pink/fuchsia -- zero matches"
        status: pass
      - kind: unit
        ref: "generated Tailwind CSS for the five files (tailwindcss CLI) contains no purple/violet/pink/fuchsia utility, still contains linear-gradient for both onboarding elements"
        status: pass
    human_judgment: false
  - id: D3
    description: "D-01 byte-identical treatment: Sidebar.tsx:795 and AppLayout.client.tsx:236 avatar fallbacks receive the same class treatment (modulo w-/h-/shrink sizing classes)"
    requirement: "COLOR-07"
    verification:
      - kind: other
        ref: "node -e normalized-className-equality check on both files' avatar-fallback lines -- printed 'ok'"
        status: pass
    human_judgment: false
  - id: D4
    description: "Onboarding wash (OnboardingModal.tsx:95) keeps its 200%/200% background-size shimmer geometry; animated border (OnboardingModal.tsx:261) keeps animate-gradient-x motion, both with only hue changed"
    requirement: "COLOR-07"
    verification:
      - kind: other
        ref: "grep -c 'bg-\\[length:200%_200%\\]' app/components/OnboardingModal.tsx == 1 (unchanged); grep -n animate-gradient-x shows the class present on the migrated line"
        status: pass
    human_judgment: false
  - id: D5
    description: "No file under app/components/landing/ touched by either Task 2 or Task 3's commit; landing purple/violet/pink counts unchanged"
    requirement: "COLOR-07"
    verification:
      - kind: other
        ref: "git diff --name-only HEAD~1 for both commits lists only the five named app files (Task 2) and only __tests__/purple-gradient-guard.test.ts (Task 3); grep -rc purple|violet|pink app/components/landing/ | grep -v ':0$' | wc -l == 7, unchanged"
        status: pass
    human_judgment: false
  - id: D6
    description: "COLOR-07 guard stood up, observed red on a reverted migrated site (naming file+line) and still green with a purple class injected under landing/, proving the carve-out filters rather than the subtree merely being clean"
    requirement: "COLOR-07"
    verification:
      - kind: unit
        ref: "manual fail-first run of __tests__/purple-gradient-guard.test.ts with Sidebar.tsx:795 reverted to from-purple-500/to-pink-500 (failed, named Sidebar.tsx:795), then restored and re-verified green; separately, bg-purple-500 injected into app/components/landing/LandingCTA.tsx (guard stayed green; raw grep confirmed the pattern would have matched unfiltered), then reverted"
        status: pass
    human_judgment: false
  - id: D7
    description: "npm run lint zero errors, npm run typecheck exit 0, npx vitest run (and --maxWorkers=2) green across the whole suite"
    verification:
      - kind: unit
        ref: "npm run typecheck; npm run lint; npx vitest run --maxWorkers=2 -- 69 test files / 1204 tests passed, 0 lint errors"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-09-20
status: complete
---

# Phase 10 Plan 02: Purple/Gradient Migration + COLOR-07 Guard Summary

**All six purple/violet/pink sites across five files migrated to the app's existing --accent token behind a resolved blocking human gate, proven by generated-CSS diffing and backstopped by a directory-scan guard observed both red on a reverted site and green with a decoy purple class inside its own excluded subtree.**

## Performance

- **Tasks:** 3/3 complete
- **Files modified:** 5 app files + 1 new test file
- **Commits:** 2 task commits (`5967189e`, `34011799`)

## Blocking gate: recorded answer (verbatim)

**Answer: `approve` — "Approve as presented."** The user had already been presented all six sections of Task 1's gate context (the purple/gradient proposal table, the `--background-inset` costly-reversibility inventory with its hover-border pitfall and `--muted` delta sub-decisions, the COLOR-05 scope question, the COLOR-05 mechanism findings with the Discord-key-collision and naming sub-decisions, the five measured discrepancies, and what won't happen this phase) and chose the recommended option on every open item. No further AskUserQuestion was raised for this plan; the answer below is recorded, not re-derived.

Chosen option for each of the four open items this gate carried beyond the locked D-01–D-05 proposal:

| Open item | Chosen option |
|---|---|
| **Hover-border pitfall** (`DashboardContent.tsx:2239`/`:2411`, two clickable rows currently carrying `hover:border-accent/50`) | (a) — drop the hover-border, replace with a muted hover background using the `horizontal-scroll.tsx:68` idiom. Not (b) keep a hover border, not (c) accept a border materializing from nothing. *(This item belongs to the `--background-inset` track owned by a later plan in this phase; recorded here because it was answered as part of this plan's single gate.)* |
| **`--muted` delta** (six non-card sites moving from `--background-inset` to `--muted`, a measured visible colour shift in both themes) | Uniform `bg-muted` per D-06's lock — no per-site opacity tuning. *(Same later-plan ownership note as above.)* |
| **COLOR-05 landing scope** | The wide scope: `app/` + `components/` including `landing/`'s 11 lines and including `AccentColorContext.tsx`'s 3 lines, reaching the full 34-occurrence count. `AccentColorContext.tsx:14`'s comment is to be reworded so it no longer spells the green hex literal it doesn't use in code. *(Owned by 10-03/10-05.)* |
| **Discord-key collision** (`tailwind.config.js`'s existing `discord` key resolves to a different blue than the literal COLOR-05 must centralise) | (a) — add a separate `brand-discord` key at the exact literal hex, not reusing the existing `discord` key; record the duplicate as a disclosed finding routed to Phase 12's design documentation. *(Owned by 10-03.)* |

Also confirmed at the gate and applied in this plan's Task 2: the master-sheet button's text colour moves to the `accent-foreground` token (the one part of D-04 not spelled out verbatim — user explicitly confirmed this addition). Green-hex naming ("uncommon", not "legendary") was also confirmed but belongs to 10-03's scope, not this plan's file set.

This plan (10-02) itself only *executes* the purple/gradient portion (Task 2, Task 3); the other four items are recorded here per the gate's own scope but are implemented by 10-03 through 10-06 as their `depends_on: ["10-02"]` frontmatter already expects.

## Accomplishments

- Migrated all six purple/violet/pink sites to `--accent`: two identical avatar-fallback gradients (`Sidebar.tsx:795`, `AppLayout.client.tsx:236`) to a flat `bg-accent`; the onboarding wash (`OnboardingModal.tsx:95`) and animated border (`OnboardingModal.tsx:261`) to single-hue accent gradients keeping their shimmer/pulse motion; the master-sheet export button (`MasterSheetContent.tsx:1742`) to `bg-accent`/`hover:bg-accent/90`/`text-accent-foreground`; the score-comparison rank-icon chip (`ScoreComparisonModal.tsx:73`) to `bg-accent/20 text-accent`.
- Proved the batch with a real generated-CSS before/after diff from the project's own Tailwind CLI, scoped to exactly the five edited files.
- Stood up `__tests__/purple-gradient-guard.test.ts` (COLOR-07 guard): a directory scan of `app/(app)` and `app/components` with `landing/` filtered by path prefix, matching any shade and any variant prefix across the purple/violet/pink/fuchsia hue families.
- Ran the required two-part fail-first proof: guard failed naming a reverted site's exact file and line, then stayed green with a decoy purple class present inside the guard's own excluded `landing/` subtree — proving the carve-out actively filters rather than the subtree merely being clean.

## Task Commits

1. **Task 1: BLOCKING GATE** — no code commit (decision-only task; answer recorded above, already resolved per the orchestrator's instructions before this session began).
2. **Task 2: Replace all six purple/violet/pink sites with accent** — `5967189e` (feat)
3. **Task 3: Stand up the COLOR-07 guard and prove it fails without the migration** — `34011799` (feat)

## Files Created/Modified

- `app/components/Sidebar.tsx` — avatar-fallback gradient to flat `bg-accent`
- `app/(app)/AppLayout.client.tsx` — avatar-fallback gradient to flat `bg-accent` (identical to Sidebar.tsx)
- `app/components/OnboardingModal.tsx` — wash middle stop to `via-accent/10`; animated border stops to `from-accent/30 via-accent/70 to-accent/30`
- `app/(app)/master-sheet/components/MasterSheetContent.tsx` — export button to `bg-accent hover:bg-accent/90 text-accent-foreground`
- `app/components/ScoreComparisonModal.tsx` — rank-icon chip to `bg-accent/20 text-accent`
- `__tests__/purple-gradient-guard.test.ts` — COLOR-07 guard: zero purple/violet/pink/fuchsia class in `app/(app)` and `app/components` with `landing/` excluded

## Task 2 evidence: generated-CSS before/after diff (verbatim excerpts)

Generated via `node_modules/.bin/tailwindcss -c tailwind.config.js -i /tmp/p10-in.css -o <out> --content "<comma-separated 5-file list>"` (one `--content` flag with a comma-separated path list; discovered mid-verification that repeated `--content` flags override rather than merge — the first attempt with five separate flags silently scanned only the last file).

**Removed (purple-family, present in "before" only):**
```css
.bg-purple-500\/20 { background-color: rgb(168 85 247 / 0.2) }
.bg-violet-600 { --tw-bg-opacity: 1; background-color: rgb(124 58 237 / var(--tw-bg-opacity, 1)) }
.from-purple-500 { --tw-gradient-from: #a855f7 ...; --tw-gradient-to: rgb(168 85 247 / 0) ... }
.from-purple-500\/50 { --tw-gradient-from: rgb(168 85 247 / 0.5) ...; --tw-gradient-to: rgb(168 85 247 / 0) ... }
.via-purple-500\/15 { --tw-gradient-stops: var(--tw-gradient-from), rgb(168 85 247 / 0.15) ..., var(--tw-gradient-to) }
.to-pink-500 { --tw-gradient-to: #ec4899 ... }
.to-purple-500\/50 { --tw-gradient-to: rgb(168 85 247 / 0.5) ... }
.text-purple-500 { --tw-text-opacity: 1; color: rgb(168 85 247 / var(--tw-text-opacity, 1)) }
.text-white { --tw-text-opacity: 1; color: rgb(255 255 255 / var(--tw-text-opacity, 1)) }
.hover\:bg-violet-500:hover { --tw-bg-opacity: 1; background-color: rgb(139 92 246 / var(--tw-bg-opacity, 1)) }
```

**Added (accent-family, present in "after" only):**
```css
.from-accent\/30 { --tw-gradient-from: hsl(var(--accent) / 0.3) ...; --tw-gradient-to: hsl(var(--accent) / 0) ... }
.via-accent\/10 { --tw-gradient-stops: var(--tw-gradient-from), hsl(var(--accent) / 0.1) ..., var(--tw-gradient-to) }
.via-accent\/70 { --tw-gradient-to: hsl(var(--accent) / 0) ...; --tw-gradient-stops: ..., hsl(var(--accent) / 0.7) ..., ... }
.to-accent\/30 { --tw-gradient-to: hsl(var(--accent) / 0.3) ... }
.to-accent\/50 { --tw-gradient-to: hsl(var(--accent) / 0.5) ... }
.hover\:bg-accent\/90:hover { background-color: hsl(var(--accent) / 0.9) }
```

Full before/after CSS and the raw `diff` output (87 lines: 49 removed, 19 added) were captured to the session scratchpad; the excerpts above are the load-bearing subset. `bg-gradient-to-br`, `bg-gradient-to-r`, `bg-gradient-to-t` utility declarations (the `background-image: linear-gradient(...)` rules) are byte-identical before and after — confirmed present in the "after" file at three locations, proving both onboarding gradient functions survived the hue swap.

## Verification results

- `grep -rnE "(from-purple-|to-pink-|bg-violet-|text-purple-|via-purple-)" "app/(app)" app/components | grep -v "/landing/"` — zero matches (exit 1, no match found)
- Wider shade-agnostic/variant-prefix-agnostic grep across purple/violet/pink/fuchsia — zero matches
- `grep -rc "purple\|violet\|pink" app/components/landing/ | grep -v ':0$' | wc -l` — `7`, unchanged from the pre-commit baseline (all 7 landing files retain their existing purple, none newly touched)
- `git diff --name-only HEAD~1` for the Task 2 commit — exactly the five named app files, nothing under `app/components/landing/`
- `git diff HEAD~1 -- app/components/OnboardingModal.tsx | grep -c 'animate-gradient-x'` — class present on both the removed and added line
- `grep -c 'bg-\[length:200%_200%\]' app/components/OnboardingModal.tsx` — `1`, unchanged
- D-01 byte-identical check (`node -e` normalized-className comparison of `Sidebar.tsx:795` and `AppLayout.client.tsx:236`) — printed `ok`
- Generated Tailwind CSS for the five files — no `purple`/`violet`/`pink`/`fuchsia` utility; `linear-gradient` declaration still present for both onboarding elements
- `git diff --name-only HEAD~1` for the Task 3 commit — only `__tests__/purple-gradient-guard.test.ts`
- `npm run typecheck` — exit 0
- `npm run lint` — 0 errors, 397 pre-existing warnings (all in unrelated files: `utils/feature-flags.ts`, `utils/server-roles.ts`, `utils/supabase/__tests__/paginate.test.ts`), none touched by this plan
- `npx vitest run` — 68 files / 1202 tests passed (before Task 3's guard file existed: 69 files / 1204 tests passed after)
- `npx vitest run --maxWorkers=2` (final regression re-run) — 69 files / 1204 tests passed

## Task 3: COLOR-07 guard fail-first proof (actual output, this session, both halves)

**Half 1 — red on a reverted site.** `app/components/Sidebar.tsx:795` was temporarily reverted from `bg-accent shrink-0 border border-border` back to `bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 border border-border`, and the guard was re-run:

```
❯ __tests__/purple-gradient-guard.test.ts (2 tests | 1 failed)
     × finds no purple, violet, pink or fuchsia class anywhere under app/(app) or app/components, excluding landing/

FAIL __tests__/purple-gradient-guard.test.ts > purple-gradient guard (COLOR-07) > finds no purple, violet, pink or fuchsia class anywhere under app/(app) or app/components, excluding landing/
AssertionError: /Users/.../app/components/Sidebar.tsx:795: <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shrink-0 border border-border" />: expected [ { …(3) } ] to have a length of +0 but got 1

Test Files  1 failed (1)
     Tests  1 failed | 1 passed (2)
```

The file was then restored byte-for-byte from a pre-edit backup, confirmed clean via `git diff --stat` (empty output), and the guard was re-run and confirmed green again (2/2 passed).

**Half 2 — still green with a purple class present under `landing/`.** `bg-purple-500` was appended to an existing `className` in `app/components/landing/LandingCTA.tsx:67` (a file already carrying unrelated marketing purple). The guard was re-run:

```
❯ __tests__/purple-gradient-guard.test.ts (2 tests) 613ms
   ✓ purple-gradient guard (COLOR-07) > finds no purple, violet, pink or fuchsia class anywhere under app/(app) or app/components, excluding landing/
   ✓ purple-gradient guard (COLOR-07) > fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass

Test Files  1 passed (1)
     Tests  2 passed (2)
```

A direct grep of the guard's own detection pattern against the modified line confirmed it would have matched had the file not been filtered:
```
app/components/landing/LandingCTA.tsx:67:            <span className="font-wow text-shimmer-purple text-48 md:text-80 bg-purple-500">loot</span>.
```
This proves the guard's landing carve-out is an active filter, not an artifact of the subtree happening to be clean. The file was then restored byte-for-byte and confirmed clean via `git diff --stat` (empty output) before the guard's final commit.

## Decisions Made

- Applied D-01 through D-04 exactly as locked in `10-CONTEXT.md`, plus the gate-confirmed addition of the master-sheet button's text colour moving to `accent-foreground` (the one part of D-04 not spelled out verbatim).
- Built the COLOR-07 guard as a directory scan (`sourceFiles(['app/(app)', 'app/components'])` filtered by `!f.includes('/landing/')`) rather than an explicit file list, per the plan's own required mechanism (D-05's carve-out must be a path-prefix filter, not a `sourceFiles` parameter or exact-file exclusion set) and per REQUIREMENTS.md's COLOR-07 wording, which is scoped to the whole authenticated app rather than six named files.
- Widened the detection pattern beyond the six exact strings this migration removed: any of 20 utility prefixes crossed with purple/violet/pink/fuchsia crossed with any standard shade, with an optional variant prefix and alpha suffix — so a differently-shaded or differently-prefixed purple introduced later is still caught.
- Discovered and recorded (not part of any deviation, but worth stating for future plans in this phase): the `tailwindcss` CLI's `--content` flag does not merge across repeated invocations — only the last flag's path is scanned. The correct multi-file form is one `--content` flag with a comma-separated path list. This affects any later plan in this phase (10-03 through 10-06) that reuses this plan's before/after-CSS verification technique.

## Deviations from Plan

None — Task 1's gate was already resolved per the orchestrator's explicit instructions before this session began (no fresh AskUserQuestion was needed or raised). Tasks 2 and 3 executed exactly as written, including the text-colour-to-accent-foreground addition on the master-sheet button, which the gate context itself flagged as needing explicit confirmation and which was confirmed.

## Issues Encountered

- The first attempt at generating the "before" Tailwind CSS used five separate `--content` flags, one per file; this silently produced a CSS file scoped to only the last-named file (only `bg-purple-500/20`/`text-purple-500` from `ScoreComparisonModal.tsx` appeared, none of the gradient/violet utilities from the other four files). Diagnosed by generating a single-file CSS as a sanity check and comparing utility counts, then fixed by passing one `--content` flag with a comma-separated path list, which correctly combined all five files' candidate classes. No impact on the actual migration — only the verification-tooling invocation needed correcting.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- COLOR-07 is fully shipped and guarded: zero purple, violet, pink or fuchsia class remains in the authenticated app, at any shade, under any variant prefix, and the guard's landing carve-out is proven to actively filter rather than merely coincide with a clean subtree.
- Marketing purple on public pages is provably untouched: 7 landing files retain their existing purple counts, unchanged before and after both commits.
- 10-03 through 10-06 now have the recorded gate answers they depend on: the `--background-inset` hover-border and `--muted`-delta decisions (owned by a later plan in this phase), the COLOR-05 wide scope (34 occurrences, including `landing/` and `AccentColorContext.tsx`), the Tailwind-named-key mechanism with a parity guard, and the separate `brand-discord` key decision.
- Two `.planning/WINDOWS.md` items from 10-01 (entries 15, 16 — Home-only capture fallback and the two modals unreachable by fixed-route capture) still carry forward to end-of-phase UAT; this plan did not resolve them and did not need to, since its own `<verify>` blocks used direct Tailwind CSS generation and grep rather than the screenshot gate.

## Self-Check: PASSED

- FOUND: `__tests__/purple-gradient-guard.test.ts`
- FOUND: commit `5967189e`
- FOUND: commit `34011799`

---
*Phase: 10-colour-literal-migration*
*Plan: 02*
*Completed: 2026-09-20*
