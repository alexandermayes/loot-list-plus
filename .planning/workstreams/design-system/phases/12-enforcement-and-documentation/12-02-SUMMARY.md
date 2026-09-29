---
phase: 12-enforcement-and-documentation
plan: 02
subsystem: design-system
tags: [design-tokens, yaml, vitest, impeccable, hsl, tailwind]

requires:
  - phase: 12-enforcement-and-documentation
    provides: "Plan 01's answered Phase 12 gate (item 2.6 amendment to D-06, pre-phase-12 baseline)"
provides:
  - "DESIGN.md at the repo root: block-style YAML frontmatter (colors, typography, rounded, spacing) plus an Overview section, proven end-to-end as the design authority"
  - "rgbToHex in __tests__/design-tokens/contrast.ts, the milestone's single HSL/hex conversion implementation"
  - "__tests__/design-tokens/design-md.ts: readDesignMd and parseFrontmatterSubset mirroring the impeccable detector's YAML-subset parser exactly"
  - "__tests__/design-tokens/design-md-parity.test.ts: the ENF-01 frontmatter-layer parity guard, observed red in three drift directions before being accepted green"
affects: [12-03, 12-04, 12-05, 12-06, 12-07]

actuals:
  tokens: 5609
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Frontmatter-as-guarded-mirror: DESIGN.md's tokens are asserted equal to app/globals.css / tailwind.config.js / app/layout.tsx after conversion, never hand-typed from comments"
    - "Numeric-only fontSize keys as the deduplication key for a distinct-pixel-step scale (19 keys, not 29)"

key-files:
  created:
    - DESIGN.md
    - __tests__/design-tokens/design-md.ts
    - __tests__/design-tokens/design-md-parity.test.ts
  modified:
    - __tests__/design-tokens/contrast.ts

key-decisions:
  - "typography.scale carries the 19 numeric-only Tailwind fontSize keys (11,12,13,14,15,16,18,20,24,28,32,40,42,44,48,56,64,72,80), not all 29 keys, per the 12-01 gate's amendment to item 2.6: Tailwind's semantic keys (xs, sm, base...) are exact twins of these numeric keys by the config's own design comment, so filtering to /^\\d+$/ keys yields exactly the 19 distinct pixel steps the gate specified without re-asserting each twin pair"
  - "context.mjs's EXISTING_VISUAL_SYSTEM directive still prints after DESIGN.md exists, because it is gated on ctx.hasProduct (this repo has no PRODUCT.md) rather than ctx.hasDesign; recorded as WINDOWS entry 40 rather than worked around by creating PRODUCT.md or editing the shared impeccable script, both out of ENF-01 scope"

requirements-completed: [ENF-01]

coverage:
  - id: D1
    description: "DESIGN.md exists at the repo root with block-style frontmatter (colors, typography, rounded, spacing) and an Overview section"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts#DESIGN.md frontmatter parity guard (ENF-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every frontmatter colour/typography/rounded/spacing value equals its source (app/globals.css, tailwind.config.js, app/layout.tsx) after conversion, in both directions"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "__tests__/design-tokens/design-md-parity.test.ts (11 tests, all pass)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The parity guard was observed red in three drift directions (DESIGN.md, app/globals.css, tailwind.config.js) before being accepted green, each restored without being committed"
    requirement: "ENF-01"
    verification:
      - kind: unit
        ref: "manual perturb-run-restore cycle, verbatim failures recorded below; git diff --stat confirmed empty after each restore"
        status: pass
    human_judgment: false
  - id: D4
    description: "context.mjs reports DESIGN.md as the design authority (prints a '# DESIGN.md' block) where it previously printed nothing for that file"
    requirement: "ENF-01"
    verification:
      - kind: manual_procedural
        ref: "before/after context.mjs runs, verbatim output recorded below"
        status: pass
    human_judgment: false
  - id: D5
    description: "The wired hook (hook.mjs) newly flags an off-palette literal (#ff8000 in KonamiEasterEgg.tsx) after DESIGN.md exists that it did not flag before, proving the detector's design-system-* rules activated"
    requirement: "ENF-01"
    verification:
      - kind: manual_procedural
        ref: "before/after PostToolUse probe stdout, verbatim recorded below, each with its own session_id"
        status: pass
    human_judgment: false
  - id: D6
    description: "context.mjs's EXISTING_VISUAL_SYSTEM directive did not fully disappear after DESIGN.md existed (it is gated on PRODUCT.md's absence, not DESIGN.md's presence) -- a plan-assumption mismatch against the shared impeccable script's actual branch logic, not something ENF-01's file scope can fix"
    verification: []
    human_judgment: true
    rationale: "Whether this residual directive is acceptable given ENF-01's actual scope (DESIGN.md is authority-in-its-own-right per the script's own code comment) is a judgment call outside what a unit test can certify; recorded as WINDOWS entry 40 for a human/future-phase decision on whether PRODUCT.md work is warranted."

duration: 35min
completed: 2026-09-22
status: complete
---

# Phase 12 Plan 02: ENF-01 Tracer -- DESIGN.md Frontmatter, Parity Guard, Hook Activation Summary

**DESIGN.md now exists at the repo root with a block-style frontmatter (13 colours, two typography roles plus a 19-step scale, 11 rounded keys, 4 spacing keys) proven equal to `app/globals.css`/`tailwind.config.js`/`app/layout.tsx` by a guard observed red in three drift directions, and the wired impeccable hook now enforces it.**

## Performance

- **Duration:** 35 min
- **Completed:** 2026-09-22
- **Tasks:** 2 (Task 1 tracer, Task 2 completion)
- **Files modified:** 4 (1 modified, 3 created)

## Accomplishments

- Added `rgbToHex` beside `hslToRgb` in `__tests__/design-tokens/contrast.ts` -- the milestone's single HSL/hex conversion implementation now round-trips both directions.
- Created `__tests__/design-tokens/design-md.ts` (`readDesignMd`, `parseFrontmatterSubset`) reproducing the impeccable detector's `parseYamlSubset`/`parseScalar`/`findTopLevelColon`/`unquoteYamlKey`/`stripInlineYamlComment` semantics exactly, including throwing (rather than silently degrading) on a flow-style value.
- Created `DESIGN.md` at the repo root: block-style frontmatter with `name`, `description`, 13 `colors` keys (primary/accent/background/foreground/border families per D-06), `typography.display`/`typography.body` (matching Tailwind's `5xl`/`base` tuples), `typography.scale` (19 distinct pixel steps per the 12-01 gate's amendment to item 2.6), `rounded` (all 11 `borderRadius` keys) and `spacing` (all 4 spacing-extension keys), followed by the `## Overview` section.
- Created `__tests__/design-tokens/design-md-parity.test.ts`: 11 tests proving every frontmatter value equals its source after conversion, in both directions where applicable, plus a family-coverage assertion (no vacuous pass) and a fail-loud missing-file test.
- Observed the guard red in three distinct drift directions before accepting it green, each perturbation restored and never committed (verbatim outputs below).
- Verified `context.mjs` now prints a `# DESIGN.md` authority block where it printed nothing for that file before, and that the wired hook (`hook.mjs`) newly flags `#ff8000` in `app/components/KonamiEasterEgg.tsx` (an untouched, pre-existing literal) after DESIGN.md exists, where it reported no findings before.

## Task Commits

1. **Task 1: TRACER -- one token family end to end** - `5cbc0afb` (feat)
2. **Task 2: Complete the frontmatter (typography, rounded, spacing)** - `3ac1dcbb` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified

- `DESIGN.md` - The design authority: block-style frontmatter tokens (colors, typography, rounded, spacing) plus the Overview section
- `__tests__/design-tokens/contrast.ts` - Added `rgbToHex(rgb)`, converting an sRGB triple to a lowercase six-digit hex literal
- `__tests__/design-tokens/design-md.ts` - `readDesignMd` and `parseFrontmatterSubset`, the fixed-subset frontmatter parser (no npm dependency)
- `__tests__/design-tokens/design-md-parity.test.ts` - The ENF-01 frontmatter-layer parity guard (11 tests)

## Verbatim Observations (D-04, D-16)

### Before: `context.mjs` output (DESIGN.md did not yet exist)

```
NO_PRODUCT_MD: This project has no PRODUCT.md yet, but it does have an incumbent visual implementation. For `init`, `teach`, `shape`, or any request to create a new surface or replacement visual world, load reference/init.md and create PRODUCT.md with the user first. After init writes PRODUCT.md, reference/new-work.md preserves and documents the incumbent system for an extension or replaces it with the user for a redesign/rebrand. Other narrow refinement commands may read the CSS, tokens, components, and assets and proceed without blocking, then offer `/impeccable init` as a follow-up.

---

BUILD_INIT_REQUIRED: Before shape or any new-surface/redesign flow, init must capture PRODUCT.md with the human or structured simulated user. Init writes product truth only; reference/new-work.md owns every visual decision.

---

SCOPED_EXISTING_ALLOWED: Narrow refinement commands may use the incumbent implementation as authority without blocking on context setup; they must preserve it and offer init afterward.

---

EXISTING_VISUAL_SYSTEM: For refinement or extension, code and assets are incumbent design authority and missing DESIGN.md is a documentation gap. For a redesign/rebrand, keep product truth, content, functions, native affordances, and technical constraints, but treat the old look only as evidence and anti-reference.
```

(No `# DESIGN.md` block anywhere in the output -- confirmed with `grep -c '^# DESIGN.md'` returning 0.)

### After: `context.mjs` output (DESIGN.md exists)

The same four directives above still print (see "Deviations from Plan" below for why), immediately followed by:

```
# DESIGN.md

---
name: "LootList+"
description: "Transparent loot management for World of Warcraft Classic guilds"
colors:
  primary: "#080a0c"
  primary-foreground: "#ffffff"
  accent: "#e67300"
  accent-foreground: "#ffffff"
  accent-text: "#b85c00"
  background: "#faf8f5"
  background-subtle: "#f3f0ed"
  background-elevated: "#ffffff"
  ...
```

`grep -c '^# DESIGN.md'` returns 1; the file's full frontmatter and Overview section follow in the actual output.

### Before: PostToolUse hook probe of `app/components/KonamiEasterEgg.tsx`

`session_id: enf01-tracer-before-1790117599401`

```json
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"[impeccable@1] Design hook scanned app/components/KonamiEasterEgg.tsx. No deterministic design-quality issues found. That does not mean the design is good: keep following the project design system and the impeccable skill guidance."}}
```

No `[design-system-color]` line.

### After: PostToolUse hook probe of `app/components/KonamiEasterEgg.tsx`

`session_id: enf01-tracer-after-1790118108059`

```
[impeccable@1] Design hook findings requiring review in app/components/KonamiEasterEgg.tsx (4 issue(s)):
- L17 [design-system-color] Color outside DESIGN.md. A literal color is outside the DESIGN.md palette and sidecar tonal ramps. This may be legitimate, but it should be an intentional design-system addition rather than drift. If intentional: `ignore-value design-system-color '#ff8000'`.
- L18 [design-system-color] Color outside DESIGN.md. If intentional: `ignore-value design-system-color '#0070dd'`.
- L20 [design-system-color] Color outside DESIGN.md. If intentional: `ignore-value design-system-color '#ff8000'`.
- L130 [design-system-color] Color outside DESIGN.md. If intentional: `ignore-value design-system-color '#ff8000'`.
```

`#ff8000` (the dark-theme accent, absent from the light-only frontmatter per D-05) is named, exactly as the plan predicted. `KonamiEasterEgg.tsx` was not edited by this plan -- these are pre-existing literals, and the finding is the intended proof of hook activation, not something for this task to fix or suppress.

### Red observation 1: DESIGN.md perturbation (one hex digit of `border`)

```
FAIL __tests__/design-tokens/design-md-parity.test.ts > DESIGN.md frontmatter parity guard (ENF-01) > every colors value equals rgbToHex(hslToRgb(light token)) exactly
AssertionError: DESIGN.md colour(s) drifted from app/globals.css:
border: documented="#d7d2cd" computed="#d7d2cc": expected [ Array(1) ] to have a length of +0 but got 1
```

Restored with the original value; `git diff --stat -- DESIGN.md` was empty before the real commit.

### Red observation 2: app/globals.css perturbation (`--border` lightness +1 percentage point, the G-11-1 direction)

```
FAIL __tests__/design-tokens/design-md-parity.test.ts > DESIGN.md frontmatter parity guard (ENF-01) > every colors value equals rgbToHex(hslToRgb(light token)) exactly
AssertionError: DESIGN.md colour(s) drifted from app/globals.css:
border: documented="#d7d2cc" computed="#d9d5ce": expected [ Array(1) ] to have a length of +0 but got 1
```

Restored with `git checkout -- app/globals.css`; `git diff --stat -- app/globals.css` was empty afterward.

### Red observation 3 (Task 2): tailwind.config.js perturbation (`borderRadius.lg` 12px -> 13px)

```
FAIL __tests__/design-tokens/design-md-parity.test.ts > DESIGN.md frontmatter parity guard (ENF-01) > rounded and Tailwind borderRadius have identical key sets and values, both directions
AssertionError: rounded value(s) drifted from borderRadius:
lg: documented="12px" source="13px": expected [ Array(1) ] to have a length of +0 but got 1
```

Restored with `git checkout -- tailwind.config.js`; `git diff --stat -- tailwind.config.js app/layout.tsx app/globals.css` was empty afterward, and a fresh hook probe (`session_id: enf01-task2-recheck-...`) still reported the `#ff8000` finding, confirming the completed frontmatter still parses for the detector.

## Computed Hex Table (light theme, `rgbToHex(hslToRgb(...))`, never the globals.css comments)

| Key | HSL (`:root`) | Computed hex | globals.css comment (not authoritative) |
|---|---|---|---|
| primary | 220 20% 4% | `#080a0c` | (none -- comment says "Dark button") |
| primary-foreground | 0 0% 100% | `#ffffff` | (none -- comment says "White text") |
| accent | 30 100% 45% | `#e67300` | `#e67300` (matches) |
| accent-foreground | 0 0% 100% | `#ffffff` | (none) |
| accent-text | 30 100% 36% | `#b85c00` | `#b85c00` (matches) |
| background | 35 33% 97% | `#faf8f5` | `#faf8f5` (matches) |
| background-subtle | 35 20% 94% | `#f3f0ed` | `#f2efe9` (differs -- confirms comments are not authoritative) |
| background-elevated | 0 0% 100% | `#ffffff` | `#ffffff` (matches) |
| foreground | 220 20% 4% | `#080a0c` | `#09090c` (differs -- the exact discrepancy 12-01-SUMMARY.md flagged) |
| foreground-secondary | 25 8% 32% | `#58514b` | `#574f49` (differs) |
| foreground-muted | 25 6% 42% | `#726a65` | `#726a65` (matches) |
| border | 35 12% 82% | `#d7d2cc` | `#d4cfc6` (differs) |
| border-strong | 35 10% 70% | `#bab4ab` | `#b8b1a6` (differs) |

## Decisions Made

- **typography.scale carries 19 keys, not 29** (12-01 gate item 2.6's amendment to D-06): Tailwind's `fontSize` config has 29 total keys, but 10 of them (`xs`, `sm`, `base`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`) are exact pixel-value twins of 10 purely-numeric keys (`11`, `12`, `13`, `14`, `16`, `18`, `20`, `24`, `32`, `42`) by the config's own design comment ("each one is a twin of the semantic step above it, not a new size"). Filtering to keys matching `/^\d+$/` yields exactly the 19 distinct pixel steps the gate specified (`11,12,13,14,15,16,18,20,24,28,32,40,42,44,48,56,64,72,80`) with no re-assertion of duplicate values, and those keys are literal Tailwind config keys, so the guard's key-set assertion stays a straightforward source-of-truth comparison rather than an invented grouping.
- **DESIGN.md frontmatter is entirely block-style YAML** per the gate's carry-forward constraint: no key anywhere uses a `{`/`[`-opening value; `parseFrontmatterSubset` throws (rather than silently degrading like the real detector) if one ever appears, so a future regression fails the guard loudly instead of quietly disabling the design-system-* rules.
- **Overview section content** follows the document.md spec's shape (2-3 paragraphs plus a Key Characteristics list) and states the guard-tested/normative relationship explicitly, so a reader of DESIGN.md itself understands its scope limit without needing this SUMMARY.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed an ES2017-incompatible regex flag**
- **Found during:** Task 2 (typecheck gate)
- **Issue:** The Poppins source-text assertion in `design-md-parity.test.ts` used the `s` (dotAll) regex flag, which requires targeting ES2018 or later; `tsconfig.json` targets ES2017, so `tsc --noEmit` failed with `TS1501`.
- **Fix:** Replaced `.` (with the `s` flag) with an equivalent `[^}]*` character class, which already matches newlines without needing dotAll.
- **Files modified:** `__tests__/design-tokens/design-md-parity.test.ts`
- **Verification:** `npm run typecheck` exits 0; the test still passes.
- **Committed in:** `3ac1dcbb` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, blocking the typecheck gate).
**Impact on plan:** No scope creep; the fix is a mechanical regex-syntax correction with no behavior change to the assertion's intent.

## Issues Encountered

**`context.mjs`'s `EXISTING_VISUAL_SYSTEM` directive did not disappear after DESIGN.md was created**, contrary to the plan's acceptance-criteria wording ("prints a `# DESIGN.md` block ... and no EXISTING_VISUAL_SYSTEM directive"). Reading `context.mjs`'s source (`.claude/skills/impeccable/scripts/context.mjs` lines ~1110-1148) shows the four `NO_PRODUCT_MD`/`BUILD_INIT_REQUIRED`/`SCOPED_EXISTING_ALLOWED`/`EXISTING_VISUAL_SYSTEM` directives are emitted whenever `!ctx.hasProduct && ctx.hasVisualImplementation` -- gated on **PRODUCT.md's absence**, not on DESIGN.md's presence. This repository has no `PRODUCT.md` anywhere (confirmed by `find`), so the directive prints unconditionally regardless of DESIGN.md. The `# DESIGN.md` block is pushed additionally, immediately after, when `ctx.hasDesign` is true (a comment in the source explains this is deliberate: "DESIGN.md is authority in its own right and does not depend on PRODUCT.md existing").

This is a plan-authoring assumption that does not hold against the live tool, not a defect in this plan's own files. Two ways exist to make the literal sub-clause true -- write a `PRODUCT.md` for the whole project, or change `context.mjs`'s branch condition to also check `ctx.hasDesign` -- and both are out of ENF-01's scope (files_modified for this plan is DESIGN.md and three `__tests__/design-tokens/` files only; `context.mjs` is shared impeccable-skill infrastructure other phases and other projects depend on, and writing a whole-project PRODUCT.md is an unrelated, much larger undertaking). Per the deviation rules' Rule 4 threshold (architectural changes need explicit approval, not autonomous action), this was left as-is and recorded as **WINDOWS entry 40** for a human or a later phase to decide whether it is worth pursuing.

The **substantive claim the acceptance criterion exists to prove is still true and independently verified**: `context.mjs` now prints a `# DESIGN.md` authority block where it printed nothing for that file before, and the wired hook enforces DESIGN.md's colours (see the before/after hook probes above). Only the literal "and no EXISTING_VISUAL_SYSTEM line" sub-clause is unmet, and it is unmet because that clause's premise (the two are mutually exclusive in `context.mjs`'s logic) does not hold in this repository's current state.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ENF-01's frontmatter-layer architecture is proven end to end on colours, typography, rounded and spacing: DESIGN.md exists, is guard-tested against every relevant source file in both directions, is read by `context.mjs` as the design authority, and is enforced by the wired hook.
- 12-03 can now write DESIGN.md's body sections (Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts) and the body-layer parity guard on top of this frontmatter without re-deriving the colour/typography/rounded/spacing source-of-truth logic -- `contrast.ts`'s `rgbToHex` and `design-md.ts`'s parser are ready to reuse.
- 12-04 through 12-07 depend on DESIGN.md existing and the hook enforcing it; both are now true.
- WINDOWS entry 40 (the `context.mjs` EXISTING_VISUAL_SYSTEM finding) is open and should be considered before any future PRODUCT.md-related work in this repo.

## Self-Check: PASSED

- `DESIGN.md` -- FOUND at repo root
- `__tests__/design-tokens/design-md.ts` -- FOUND
- `__tests__/design-tokens/design-md-parity.test.ts` -- FOUND
- `__tests__/design-tokens/contrast.ts` contains `rgbToHex` -- FOUND (`grep -n "export function rgbToHex"` matches)
- Commit `5cbc0afb` (Task 1) -- FOUND in `git log --oneline`
- Commit `3ac1dcbb` (Task 2) -- FOUND in `git log --oneline`
- `npx vitest run __tests__/design-tokens/design-md-parity.test.ts` -- 11/11 tests pass
- `npm test -- --maxWorkers=2` (full suite) -- 82 files, 1356 tests, all pass
- `npm run lint` -- 0 errors (397 pre-existing warnings, unchanged count)
- `npm run typecheck` -- exits 0
- `git diff --stat -- app/globals.css tailwind.config.js app/layout.tsx package.json package-lock.json` -- empty (no source, config or dependency changed)
- `node -e "...includes('—')..."` on DESIGN.md -- prints `ok` (no em dash)
- `node .claude/skills/impeccable/scripts/context.mjs | grep -c '^# DESIGN.md'` -- 1 (>= 1, criterion met)
- `node .claude/skills/impeccable/scripts/context.mjs | grep -c EXISTING_VISUAL_SYSTEM` -- 1 (criterion not met; see "Issues Encountered" -- recorded as WINDOWS entry 40, substantive DESIGN.md-authority claim independently verified)

---
*Phase: 12-enforcement-and-documentation*
*Plan: 02*
*Completed: 2026-09-22*
