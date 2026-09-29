---
phase: 07-token-foundation
plan: 04
subsystem: design-system-tokens
tags: [tailwind, contrast, wcag, design-tokens, vitest, css-custom-properties]

# Dependency graph
requires:
  - phase: 07-01
    provides: GO-AHEAD approval for the complete diff plan, satisfying ROADMAP Hard Constraint 2
  - phase: 07-02
    provides: The committed pre-phase-07 before baseline (Home-only) this plan's Task 3 human-check compares against
  - phase: 07-03
    provides: The 11px type floor and pixel-named fontSize aliases in tailwind.config.js and app/globals.css, left intact by this plan
provides:
  - "The single WCAG contrast implementation for this milestone (__tests__/design-tokens/contrast.ts: parseTokens, loadThemeTokens, hslToRgb, hexToRgb, relativeLuminance, contrastRatio, ratio), reused by every later Phase 07 plan and Phase 12's DESIGN.md"
  - "A runnable, fixed-order contrast report (__tests__/design-tokens/report.ts) every commit body and SUMMARY in this milestone cites"
  - "Dark and light --foreground-muted both clearing 4.5:1 on every surface COLOR-01 names"
  - "A new --accent-text token, wired through theme.extend.textColor so text-accent resolves to it with zero call-site churn across all 305 sites"
  - "The dark card family (--background-elevated, --card, --popover, --secondary) lifted to 228 12% 13%, with --border, --border-strong, --input and --muted widened to match, clearing both COLOR-02 floors"
  - "The five OI-3 carried-forward numbers (--destructive, --error, --horde, --info, --alliance against the lifted card) recorded for Phase 12's DESIGN.md"
affects: [07-05-status-tokens, 07-06-post-phase-review, phase-08-primitives, phase-10-color-migration, phase-12-design-md]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 6398
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared WCAG contrast implementation (parseTokens/hslToRgb/relativeLuminance/contrastRatio/ratio) that every contrast assertion and every runnable report in the milestone imports, rather than a second ad hoc formula anywhere"
    - "Runnable fixed-order report script (report.ts) as the single source commit bodies, SUMMARYs and DESIGN.md cite, distinct from the test suite that asserts floors"
    - "Per-utility Tailwind theme override (theme.extend.textColor.accent as an object, not a bare string) to split a text utility's colour source from a shared colour object feeding bg-*/border-*/ring-* utilities, with zero call-site migration"
    - "Guard-test non-vacuity proven inline during verification (temporary revert of each changed value, confirm the specific assertion fails and names the pair, restore) for every token family this plan touched"

key-files:
  created:
    - __tests__/design-tokens/contrast.ts
    - __tests__/design-tokens/report.ts
    - __tests__/design-tokens/fixtures/accent-probe.txt
    - __tests__/token-contrast.test.ts
  modified:
    - app/globals.css
    - tailwind.config.js

key-decisions:
  - "Followed OI-1 Option B exactly: dark card at 228 12% 13%, dark muted text at 0 0% 53% — real margin on every floor over Option A's fractional-lightness alternative."
  - "Followed OI-2 Option A exactly: light --accent-text at 30 100% 36%, matching D-06; accepted the recorded gap that accent-on-cream (4.344) and accent-on-sidebar (4.066) stay under 4.5 because COLOR-01 only requires the white-card surface."
  - "Followed OI-3 accept-and-record exactly: did not touch --destructive/--error/--horde/--info/--alliance even though the card lift pushes three of them below 4.5; recorded the five before/after numbers in the Task 3 commit body and below for Phase 12's DESIGN.md."
  - "Corrected --muted's hex annotation comment from the plan's stated #262626 to the arithmetically accurate #292929 for 0 0% 16% grey (255*0.16 rounds to 41 = 0x29), since the annotation's stated purpose is that the file's own comments stay truthful; every other hex in the plan's value table was independently recomputed and matched exactly."
  - "Used --minify on the tailwindcss CLI probe compile (the plan's own verify command omits it), because Tailwind's default non-minified output puts each declaration on its own line and the plan's grep pattern (\\.text-accent\\{[^}]*\\}) never matches without it."

patterns-established:
  - "AccentColorScale type assertion for indexing theme.extend.textColor/colors by key, since Tailwind's own Config type declares those as ResolvableTo<RecursiveKeyValuePair<...>> (possibly a function), matching the existing defensive-import pattern from type-scale-floor.test.ts (defaultImportedConfig ?? createRequire fallback) rather than adding a type suppression."

requirements-completed: []
# COLOR-01 and COLOR-02 are shared with sibling plans 07-05 and 07-06 in this
# phase (both also declare them in their own frontmatter). gsd-tools
# requirements.ready-ids reports 0/2 ready — correct and expected, not a
# gap: they mark complete only once every plan declaring them has a SUMMARY.

coverage:
  - id: D1
    description: "__tests__/design-tokens/contrast.ts exports the single WCAG contrast implementation (parseTokens, loadThemeTokens, hslToRgb, hexToRgb, relativeLuminance, contrastRatio, ratio), fully typed, no any; tolerates alpha-suffixed tokens; throws naming the selector/property on any missing block or token rather than yielding NaN, undefined, or a vacuous empty map"
    requirement: "COLOR-01"
    verification:
      - kind: unit
        ref: "__tests__/token-contrast.test.ts#contrast helper"
        status: pass
      - kind: other
        ref: "npx tsx __tests__/design-tokens/report.ts exits 0 and prints the fixed-order table (page, card, inset, border, border-strong, hover surface, muted text, accent text, standby), with accent text/standby correctly reported as absent before their tokens exist"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dark and light --foreground-muted both clear 4.5:1 on every surface COLOR-01 names (dark vs page/card/sidebar; light vs page), proven non-vacuous by a temporary revert of dark --foreground-muted to 0 0% 40% that failed all three dark assertions by name before being restored"
    requirement: "COLOR-01"
    verification:
      - kind: unit
        ref: "__tests__/token-contrast.test.ts#muted text (COLOR-01)"
        status: pass
      - kind: other
        ref: "grep -c -- '--foreground-muted: 25 6% 42%' app/globals.css -> 1; grep -cE -- '--foreground-muted: 0 0% (52|53)%' app/globals.css -> 1; grep -c -- '--background: 230 18% 3%' app/globals.css -> 1"
        status: pass
    human_judgment: false
  - id: D3
    description: "--accent-text exists in both themes and text-accent resolves to it via theme.extend.textColor.accent (an object, not a bare string) while bg-accent/border-accent/ring-accent/text-accent-foreground keep resolving exactly as before; the compiled-CSS probe confirms this at the stylesheet level, not just the config shape, closing RESEARCH.md assumption A1; the 305 text-accent and 9 text-accent-foreground call sites are unchanged (re-measured with the same grep)"
    requirement: "COLOR-01"
    verification:
      - kind: unit
        ref: "__tests__/token-contrast.test.ts#accent text (COLOR-01) and #text-accent wiring (D-06)"
        status: pass
      - kind: other
        ref: "npx tailwindcss -i app/globals.css -o \"$TMPDIR/accent-probe.css\" --content __tests__/design-tokens/fixtures/accent-probe.txt --minify; grep -oE '\\.text-accent\\{[^}]*\\}' -> .text-accent{color:hsl(var(--accent-text))}; grep -oE '\\.bg-accent\\{[^}]*\\}' -> .bg-accent{background-color:hsl(var(--accent))}; grep -roE 'text-accent\\b' app components | wc -l -> 305; grep -roE 'text-accent-foreground' app components | wc -l -> 9"
        status: pass
    human_judgment: false
  - id: D4
    description: "Dark page-to-card and border-to-card both clear 1.2:1, the card family (--card/--popover/--secondary) moves in exact lockstep with --background-elevated, the hover surface (--muted) stays lighter than the card and clears 1.12:1 against it, --background and --background-subtle are byte-identical to their pre-phase values, and dark --foreground-muted still clears 4.5:1 against the newly lifted card (the paired L13%/53% assertion). Proven non-vacuous by temporarily reverting --border to 0 0% 10% (failed the border-vs-card assertion by name) and --muted to 0 0% 12% (failed the hover-vs-card assertion by name), then restoring both."
    requirement: "COLOR-02"
    verification:
      - kind: unit
        ref: "__tests__/token-contrast.test.ts#surface and border ramp (COLOR-02)"
        status: pass
      - kind: other
        ref: "npx tsx __tests__/design-tokens/report.ts -> dark page 1.223, dark border 1.213 (both clear 1.2); grep -c -- '228 12% 8%' app/globals.css -> 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "The five OI-3 carried-forward numbers (dark --destructive/--error/--horde 4.910 -> 4.360, --info/--alliance 5.118 -> 4.545 against the lifted card) are recorded with their exact values rather than silently absorbed, per the accept-and-record resolution"
    requirement: "COLOR-02"
    verification:
      - kind: other
        ref: "computed via __tests__/design-tokens/contrast.ts's ratio() against the committed globals.css, recorded verbatim in the Task 3 commit body and in this SUMMARY's Accomplishments"
        status: pass
    human_judgment: false
  - id: D6
    description: "The dark surface ramp reads as intended in the actual rendered UI: a card is visibly a card without a second border, its border is visible, a hovered row is still visible and reads lighter than the card, an unchecked switch track is still visible on a card, and the page itself is as deep as before; nothing looks washed out"
    verification: []
    human_judgment: true
    rationale: "The plan's Task 3 <human-check> is a visual review against the committed pre-phase-07 baseline at 1440/390 in both themes, comparing card-dense screens (guild settings, the settings modal, the expansion manager). Per this project's workflow.human_verify_mode=end-of-phase default, that check is deferred to the phase-level UAT rather than performed by this plan's executor (same handling as Plan 03's Task 2 density check). The mechanical proof (all eight ramp behaviors, non-vacuous guards, exact numeric floors) is complete and green; the visual judgment itself is outstanding and recorded in .planning/WINDOWS.md (entry 4) so it surfaces at ship time."

# Metrics
duration: 55min
completed: 2026-09-16
status: complete
---

# Phase 07 Plan 04: Muted and Accent Contrast, Dark Surface Ramp Summary

**Fixed both COLOR-01 contrast failures (dark muted text 3.235:1 -> 4.601:1 on a card, light accent text 3.093:1 -> 4.613:1 on white) and both COLOR-02 surface floors (dark page-to-card 1.086:1 -> 1.223:1, border-to-card 1.062:1 -> 1.213:1), all computed by one new shared WCAG contrast library instead of asserted in prose.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-09-16T18:46:36Z (approx, per STATE.md)
- **Completed:** 2026-09-16T19:05:30Z (approx)
- **Tasks:** 3 (all complete)
- **Files modified:** 6 (4 created under `__tests__/`, 2 modified: `app/globals.css`, `tailwind.config.js`)

## Accomplishments

- Created `__tests__/design-tokens/contrast.ts`: the single WCAG 2.x contrast implementation for this milestone (`parseTokens`, `loadThemeTokens`, `hslToRgb`, `hexToRgb`, `relativeLuminance`, `contrastRatio`, `ratio`), fully typed with no `any`, tolerating alpha-suffixed tokens (`--accent-subtle: ... / 0.2`) and throwing named errors on any missing block, missing token, or empty/whitespace-only theme block rather than yielding a vacuous pass.
- Created `__tests__/design-tokens/report.ts`: a runnable, fixed-order contrast report (page, card, inset, border, border-strong, hover surface, muted text, accent text, standby — dark then light) that every commit body and this SUMMARY cite from, printing `absent` for a token that does not exist yet rather than throwing, so it stayed runnable at every commit in this plan.
- Task 1: raised dark `--foreground-muted` from `0 0% 40%` to `0 0% 53%` and light `--foreground-muted` from `25 6% 45%` to `25 6% 42%` (OI-1 Option B paired with the eventual card lift). Both clear 4.5:1 on every surface COLOR-01 names.
- Task 2: added `--accent-text` (light `30 100% 36%` per OI-2 Option A, dark `30 100% 50%` identical to `--accent`) and a `theme.extend.textColor.accent` override in `tailwind.config.js`, so `text-accent` resolves to `--accent-text` while `bg-accent`/`border-accent`/`ring-accent`/`text-accent-foreground` are completely unaffected. Closed RESEARCH.md assumption A1 with a compiled-CSS probe, not just the config shape: `.text-accent{color:hsl(var(--accent-text))}` and `.bg-accent{background-color:hsl(var(--accent))}`. None of the 305 `text-accent` or 9 `text-accent-foreground` call sites changed.
- Task 3: lifted dark `--background-elevated`/`--card`/`--popover`/`--secondary` from `228 12% 8%` to `228 12% 13%`; widened `--border` (`0 0% 10%` -> `0 0% 18%`), `--border-strong` (`0 0% 22%` -> `0 0% 26%`), and `--input` (follows `--border`, per OI-4); raised `--muted` (`0 0% 12%` -> `0 0% 16%`, per OI-5). `--background`, `--background-subtle` and `--background-inset` are byte-identical to their pre-phase values.
- Recorded the five OI-3 carried-forward numbers (see table below) rather than silently absorbing the contrast drop the card lift causes on tokens outside this plan's scope.
- Extended `__tests__/token-contrast.test.ts` across all three commits to 25 passing assertions across 5 describe blocks (`contrast helper`, `muted text (COLOR-01)`, `accent text (COLOR-01)`, `text-accent wiring (D-06)`, `surface and border ramp (COLOR-02)`), every changed value proven non-vacuous during verification by a temporary revert that failed the specific named assertion before being restored.

## Full fixed-order contrast report (before -> after this plan)

| pair | dark before | dark after | light before | light after | floor |
|------|------------:|-----------:|--------------:|-------------:|-------|
| page | 1.086 | 1.223 | 1.062 | 1.062 | 1.2 (dark, COLOR-02) |
| card (vs inset) | 1.044 | 1.079 | 1.086 | 1.086 | recorded |
| inset (vs page) | — | 1.134 | — | 1.022 | recorded |
| border | 1.062 | 1.213 | 1.504 | 1.504 | 1.2 (dark, COLOR-02) |
| border-strong | 1.587 | 1.649 | — | 2.061 | recorded |
| hover surface | 1.122 | 1.131 | — | 1.242 | 1.12 (dark, recorded) |
| muted text | 3.235-5.181* | 4.601 | 4.743 | 5.305 | 4.5 (COLOR-01) |
| accent text | 7.354 | 6.530 | 3.093 | 4.613 | 4.5 (COLOR-01) |
| standby | absent | absent | absent | absent | Plan 05 |

*Dark muted-vs-card was 3.235 pre-phase; after Task 1 alone (card still unlifted) it measured 5.181; after Task 3 lifts the card it settles at 4.601, the final paired value.

## OI-3 carried-forward numbers (accept-and-record, not fixed in this plan)

| token | vs lifted card, before | vs lifted card, after |
|-------|------------------------:|------------------------:|
| `--destructive` | 4.910 | 4.360 |
| `--error` | 4.910 | 4.360 |
| `--horde` | 4.910 | 4.360 |
| `--info` | 5.118 | 4.545 |
| `--alliance` | 5.118 | 4.545 |

`--horde` is also tracked against Phase 10's COLOR-04. None of these five tokens were changed by this plan; they are recorded here and in the Task 3 commit body for Phase 12's DESIGN.md.

## Task Commits

Each task was committed atomically:

1. **Task 1: Build the contrast instrument and fix muted text in both themes** - `5d6be30f` (fix)
2. **Task 2: Add the --accent-text token and split the text-accent utility from the accent colour object** - `880b6ef3` (feat)
3. **Task 3: Lift the dark surface and border ramp so a card is visibly a card** - `65197349` (fix)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `__tests__/design-tokens/contrast.ts` - the single WCAG contrast implementation for this milestone
- `__tests__/design-tokens/report.ts` - the runnable fixed-order contrast report
- `__tests__/design-tokens/fixtures/accent-probe.txt` - one-line class-string fixture for the compiled-CSS probe
- `__tests__/token-contrast.test.ts` - the executable form of COLOR-01 and COLOR-02 (25 assertions, 5 describe blocks)
- `app/globals.css` - light/dark `--foreground-muted`; new `--accent-text` in both themes; dark `--background-elevated`/`--card`/`--popover`/`--secondary`/`--muted`/`--border`/`--border-strong`/`--input` lifted or widened
- `tailwind.config.js` - new `theme.extend.textColor.accent` (DEFAULT/foreground/subtle)

## Decisions Made

- OI-1 Option B, OI-2 Option A and OI-3 accept-and-record followed exactly as recorded in 07-DECISIONS.md (see key-decisions in frontmatter for detail and rationale).
- Corrected the plan's stated `--muted` hex annotation (`#262626`) to the arithmetically accurate `#292929` for `0 0% 16%` grey. Every other hex value in the plan's own value table was independently recomputed via the HSL-to-RGB formula and matched the plan exactly (`#726a65`, `#878787`, `#b85c00`, `#ff8000`, `#1d1f25`, `#2e2e2e`, `#424242`); only this one row's stated hex did not match the arithmetic, so it was corrected to keep the file's own annotations truthful, which is the explicit purpose the plan states for these comments.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tailwindcss CLI needs `--minify` for the compiled-CSS probe grep to match**
- **Found during:** Task 2 (compiled-CSS probe closing RESEARCH.md assumption A1)
- **Issue:** The plan's own `<verify>` command compiles the probe stylesheet without `--minify`. Tailwind's default (non-minified) CLI output places each selector and declaration on its own line, so the plan's grep pattern `\.text-accent\{[^}]*\}` (which assumes selector and body on one line) never matches, and `grep -q 'accent-text'` silently fails without a clear error signal.
- **Fix:** Added `--minify` to the `tailwindcss` CLI invocation, producing single-line rules (`.text-accent{color:hsl(var(--accent-text))}`) that the grep pattern matches as written.
- **Files modified:** none (verification-only; the fix is in the command invocation, recorded in the Task 2 commit body)
- **Verification:** Ran both the corrected and uncorrected commands side by side; only the `--minify` version produces a match, confirming the grep pattern requires it.
- **Committed in:** `880b6ef3` (Task 2 commit body documents the deviation)

**2. [Rule 1 - Bug] Type assertion needed for strict-mode indexing of Tailwind's Config type**
- **Found during:** Task 2 (extending `__tests__/token-contrast.test.ts` with the `text-accent wiring (D-06)` describe block)
- **Issue:** `npm run typecheck` failed with `Property 'accent' does not exist on type 'ResolvableTo<RecursiveKeyValuePair<string, string>>'` when indexing `themeExtend.textColor.accent` and `themeExtend.colors.accent` directly, because Tailwind's own `Config` type declares those theme keys as possibly a function rather than a plain object.
- **Fix:** Added an explicit `AccentColorScale` type assertion (`{ DEFAULT: string; foreground?: string; subtle?: string }`) before indexing, matching this codebase's established pattern of an explicit, accurate assertion over a type suppression (same approach `type-scale-floor.test.ts` uses for `fontSize`).
- **Files modified:** `__tests__/token-contrast.test.ts`
- **Verification:** `npm run typecheck` exits 0.
- **Committed in:** `880b6ef3` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug). **Impact on plan:** Both fixes were necessary to make the plan's own verification commands and strict-mode typecheck actually pass as intended; no scope creep, no call-site or token-value changes beyond what the plan specified.

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None - no external service configuration required by this plan.

## Next Phase Readiness

- The Task 3 `<human-check>` (visual density/card-readability review of the dark surface ramp against the committed pre-phase-07 baseline, at 1440/390 in both themes) has not yet been performed — per this project's `workflow.human_verify_mode=end-of-phase` default, it is deferred to the phase-level UAT rather than run mid-plan, matching Plan 03's handling of its own Task 2 density check. Recorded in `.planning/WINDOWS.md` (entry 4) so it surfaces at `/gsd-ship` time. The mechanical proof (all eight ramp behaviors, non-vacuous guards, exact numeric floors matching the plan's own value table) is complete and green.
- COLOR-01 and COLOR-02 are not yet marked complete in REQUIREMENTS.md: `requirements.ready-ids` reports both `0/2 ready` because sibling plans 07-05 and 07-06 in this phase also declare them and have not yet produced a SUMMARY. They will mark complete the moment the last declaring plan finishes.
- Plan 05 (status tokens / standby) can now build on the corrected muted and accent tokens and the lifted card family; the `report.ts` script will stop printing `standby` as `absent` once that plan adds the token.
- Phase 12's DESIGN.md should pick up: the full fixed-order contrast table above, the five OI-3 carried-forward numbers, and the closed RESEARCH.md assumption A1 evidence (the two compiled-CSS grep outputs).
- No blockers remain for Phase 07 execution to continue with Plan 05.

---
*Phase: 07-token-foundation*
*Completed: 2026-09-16*

## Self-Check: PASSED

Verified all four created files exist on disk: `__tests__/design-tokens/contrast.ts`, `__tests__/design-tokens/report.ts`, `__tests__/design-tokens/fixtures/accent-probe.txt`, `__tests__/token-contrast.test.ts`. Verified all three commits (`5d6be30f`, `880b6ef3`, `65197349`) appear in `git log --oneline --all`. Re-ran every automated acceptance criterion from all three tasks: Task 1 - `grep -c -- '--foreground-muted: 25 6% 42%' app/globals.css` -> 1, `grep -cE -- '--foreground-muted: 0 0% (52|53)%' app/globals.css` -> 1, `grep -c -- '--background: 230 18% 3%' app/globals.css` -> 1, `grep -c -- '--background-subtle: 225 15% 5%' app/globals.css` -> 1; Task 2 - `grep -cE -- '--accent-text: 30 100% (33|36)%' app/globals.css` -> 1, `grep -c -- '--accent-text: 30 100% 50%' app/globals.css` -> 1, the `node -e` config-shape check -> `ok`, `grep -roE 'text-accent\b' app components | wc -l` -> 305, `grep -roE 'text-accent-foreground' app components | wc -l` -> 9; Task 3 - `grep -cE -- '228 12% (13|12\.5)%' app/globals.css` -> 4, `grep -c -- '--muted: 0 0% 16%' app/globals.css` -> 1, `grep -c -- '--border: 0 0% 18%' app/globals.css` -> 1, `grep -c -- '--border-strong: 0 0% 26%' app/globals.css` -> 1, `grep -c -- '--input: 0 0% 18%' app/globals.css` -> 1, `grep -c -- '228 12% 8%' app/globals.css` -> 0. `npx vitest run __tests__/token-contrast.test.ts` -> 25/25 passing across 5 describe blocks. `npx tsx __tests__/design-tokens/report.ts` -> exits 0, fixed order confirmed, dark page 1.223 and dark border 1.213 both clear 1.2. `npm run lint`, `npm run typecheck`, `npm run test` (1166 tests) all exit 0. Full plan diff (`git diff 3ad3d9bf HEAD --name-only`) touches exactly the 6 files in the plan's `files_modified` list, no more, no less.
