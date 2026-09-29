---
phase: 10-colour-literal-migration
plan: 03
subsystem: ui
tags: [tailwindcss, design-tokens, vitest, guard-test, colour-literal]

requires:
  - phase: 10-02
    provides: "The resolved blocking gate: wide COLOR-05 scope (34 occurrences, including landing/ and AccentColorContext.tsx), the separate brand-discord key decision, and the uncommon (not legendary) naming resolution"
provides:
  - "lib/design-system/quality-colors.ts: QUALITY_COLORS (epic, uncommon) and BRAND_COLORS (battlenet, discord, wcl) as the single TS source of truth for the five hex values"
  - "5 named tailwind.config.js theme.extend.colors keys (quality-epic, quality-uncommon, brand-battlenet, brand-discord, brand-wcl) for Tailwind class sites"
  - "All 15 Tailwind arbitrary-value hex class sites across 9 files migrated to the named keys, proven a pure rename by identical rgb-triplet multisets"
  - "__tests__/quality-brand-token-parity.test.ts: deep-equal parity guard between the Tailwind keys and the TS constants, plus a consumer-existence assertion"
affects: [10-05-quality-brand-data-sites, 10-06, 10-07-post-phase-capture]

actuals:
  tokens: 6200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Tailwind class sites and JS/TS data sites for the same hex value use two deliberately duplicated representations (a plain TS data module and named Tailwind theme.extend.colors keys) kept in agreement by a deep-equal parity test, following Phase 07's font-size-alias precedent, because a CJS Tailwind config cannot import a TS module and importing the config into a client bundle would pull the whole design-system module in."
    - "Consumer-existence guard pattern: a test that fails naming any declared constant with zero real consumers under app/ or components/, preventing a second lib/design-system/tokens.ts unconsumed discord entry."

key-files:
  created:
    - "lib/design-system/quality-colors.ts"
    - "__tests__/quality-brand-token-parity.test.ts"
  modified:
    - "lib/design-system/index.ts"
    - "tailwind.config.js"
    - "app/(app)/attendance/components/AttendanceContent.tsx"
    - "app/(app)/raid-tracking/components/RaidCardHeader.tsx"
    - "app/(app)/raid-tracking/components/WeekGroup.tsx"
    - "app/(app)/profile/components/ProfileContent.tsx"
    - "app/(app)/characters/[id]/edit/_client.tsx"
    - "app/components/PremiumItemTooltip.tsx"
    - "app/components/CreateCharacterModal.tsx"
    - "app/components/EditCharacterModal.tsx"
    - "app/components/landing/LandingLootDecision.tsx"

key-decisions:
  - "Scope branch: the WIDE/34-occurrence COLOR-05 scope from 10-02's gate. This plan's own 15-site class-only slice included LandingLootDecision.tsx:72 (the landing site) because the gate approved app/ + components/ including landing/."
  - "Discord branch: added a separate brand-discord Tailwind key at the exact literal #5865f2, not reusing the existing discord key (which resolves to hsl(var(--discord)), a different blue). The duplicate is disclosed in both tailwind.config.js and quality-colors.ts's header comments and routed to Phase 12's design documentation."
  - "Did not edit app/contexts/AccentColorContext.tsx. The 10-03-PLAN.md's own files_modified list, must_haves (D-14: 'AccentColorContext.tsx's ACCENT_COLORS array ... is not itself a literal-spelling problem'), and every task's acceptance criteria (exact file-list assertions on git diff --name-only HEAD~1) exclude this file from this plan's scope. The orchestrator prompt attributed a comment-reword in this file to this plan's scope, but that edit is inconsistent with the plan document I was instructed to execute literally -- flagged below under Deviations rather than actioned, since editing it would have broken this plan's own acceptance criteria in every task."

requirements-completed: [COLOR-05]

coverage:
  - id: D1
    description: "QUALITY_COLORS and BRAND_COLORS created as the single TS source of truth for the five hex values, lowercase-normalised, with a header naming COLOR-05/D-12/D-13 and the D-13 naming precedents; lib/design-system/index.ts re-exports it additively"
    requirement: "COLOR-05"
    verification:
      - kind: unit
        ref: "npx tsx -e key/hex-format check on QUALITY_COLORS/BRAND_COLORS -- printed 'ok'"
        status: pass
      - kind: other
        ref: "grep -c 'quality-colors' lib/design-system/index.ts == 2; git diff -- lib/design-system/tokens.ts empty (existing dead discord entry untouched)"
        status: pass
    human_judgment: false
  - id: D2
    description: "5 named tailwind.config.js theme.extend.colors keys added in the existing WoW class-colour shape, with brand-discord as a disclosed duplicate of the existing discord key; rename proven executably via identical rgb-triplet multisets from probe files"
    requirement: "COLOR-05"
    verification:
      - kind: unit
        ref: "node -e tailwind.config.js key/hex-format check -- printed 'ok'; generated Tailwind CSS for arbitrary-value vs named-key probe files -- sorted rgb-triplet multisets identical"
        status: pass
    human_judgment: false
  - id: D3
    description: "All 15 Tailwind arbitrary-value hex class sites (Epic purple x3, WCL orange x2, Discord blurple x1/3-utility, Battle.net blue x4, Uncommon green x5) across 9 files migrated to named keys; no bracketed form of the five colours remains under app/ or components/; PremiumItemTooltip.tsx:21's unrelated Legendary orange left untouched"
    requirement: "COLOR-05"
    verification:
      - kind: other
        ref: "grep -rnE '\\[#(a335ee|1eff00|0074E0|5865F2|e35e15)\\]' app/ components/ -i -- zero matches; grep -c ff8000 PremiumItemTooltip.tsx unchanged at 1"
        status: pass
      - kind: unit
        ref: "generated Tailwind CSS for the nine real touched files before (git show HEAD) and after -- sorted rgb-triplet multisets identical"
        status: pass
      - kind: other
        ref: "git diff HEAD~1 -- app/ | grep -vE 'className|class=' -- 0 non-class-attribute lines"
        status: pass
    human_judgment: false
  - id: D4
    description: "Parity guard deep-equals the 5 Tailwind keys against the TS constants and asserts every constant has a real consumer under app/ or components/, naming the tokens.ts unconsumed discord entry as the precedent it prevents; both halves of the fail-first proof observed"
    requirement: "COLOR-05"
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/quality-brand-token-parity.test.ts -- 3/3 passed"
        status: pass
      - kind: other
        ref: "manual fail-first: (a) one hex digit altered in tailwind.config.js -- parity test failed naming 'epic' with a readable diff, restored to green; (b) unused sixth BRAND_COLORS.fakeUnusedProbe added -- consumer-existence test failed naming 'fakeUnusedProbe', restored to green"
        status: pass
    human_judgment: false
  - id: D5
    description: "npm run lint zero errors, npm run typecheck exit 0, npx vitest run (and --maxWorkers=2) green across the whole suite"
    verification:
      - kind: unit
        ref: "npm run typecheck; npm run lint; npx vitest run --maxWorkers=2 -- 70 test files / 1207 tests passed, 0 lint errors (397 pre-existing warnings, unrelated files, unchanged from 10-02's baseline)"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-09-20
status: complete
---

# Phase 10 Plan 03: Quality/Brand Colour Tokens (Class Sites) Summary

**Five WoW-quality and external-brand hex colours (Epic purple, Uncommon green, Battle.net blue, Discord blurple, Warcraft Logs orange) centralised into a TypeScript constants module and five named Tailwind keys, with all 15 arbitrary-value class sites migrated and a deep-equal parity guard proving the two representations never drift.**

## Performance

- **Tasks:** 3/3 complete
- **Files modified:** 2 new files + 10 modified files (1 constants module, 1 test file, 1 index re-export, 1 Tailwind config, 9 component files with class-site edits, of which 1 is also the index file)
- **Commits:** 3 task commits (`d8aa2182`, `a8479ee3`, `673ca2e9`)

## Scope branch statement (backstop verification, per plan requirement)

This plan executed on the **WIDE/34-occurrence branch**: `app/` + `components/` including `landing/`'s lines and including `AccentColorContext.tsx`'s own lines, per 10-02's gate answer ("approve as presented," recorded verbatim in `10-02-SUMMARY.md`). Concretely for this plan's 15-site class-only slice, that meant `app/components/landing/LandingLootDecision.tsx:72` (site 15 in the plan's table) was in scope and was migrated. All 15 sites from the plan's plan-time table were migrated; none were dropped.

## Discord branch statement

Added a **separate `brand-discord` key** at the exact literal `#5865f2`, not reusing the existing `discord` key (which resolves to `hsl(var(--discord))`, a measurably different Discord blue). Both `tailwind.config.js` and `lib/design-system/quality-colors.ts` carry a comment disclosing the duplicate and routing its reconciliation to Phase 12's design documentation.

## Accomplishments

- Created `lib/design-system/quality-colors.ts` exporting `QUALITY_COLORS` (`epic`, `uncommon`) and `BRAND_COLORS` (`battlenet`, `discord`, `wcl`) as frozen `as const` objects, each value lowercase-normalised and copied verbatim from the live grep (`#a335ee`, `#1eff00`, `#0074e0`, `#5865f2`, `#e35e15`).
- Added an additive `export * from './quality-colors'` to `lib/design-system/index.ts`, leaving the existing `tokens.ts` export and convenience re-export list untouched.
- Added 5 named `theme.extend.colors` keys to `tailwind.config.js` in the identical shape as the 13 existing WoW class-colour keys, with a header comment naming COLOR-05, the duplication mechanism, and the disclosed Discord-key collision.
- Migrated all 15 Tailwind arbitrary-value hex class sites (Epic purple x3, Warcraft Logs orange x2, Discord blurple x1 three-utility site, Battle.net blue x4, Uncommon green x5) across 9 files onto the named keys in one commit, leaving `PremiumItemTooltip.tsx:21`'s unrelated Legendary orange (`#ff8000`) untouched.
- Proved the migration a pure rename twice: once against synthetic probe files (Task 1) and once against the nine real touched files' actual before/after content (Task 2), both times by generating Tailwind CSS and diffing the sorted `rgb(...)` triplet multiset.
- Stood up `__tests__/quality-brand-token-parity.test.ts`: a deep-equal assertion between the 5 Tailwind keys and the TS constants, a consumer-existence assertion naming any constant with zero real consumers under `app/` or `components/`, and the fail-loud-on-missing-file defensive test copied from `token-palette-literals.test.ts`.
- Ran both halves of the required fail-first proof on the parity guard and restored the repository to a clean, green state after each.

## Task Commits

1. **Task 1: Create the constants module and the five named Tailwind colour keys** — `d8aa2182` (feat)
2. **Task 2: Migrate all 15 Tailwind arbitrary-value hex class sites onto the named keys** — `a8479ee3` (feat)
3. **Task 3: Stand up the parity guard between the Tailwind keys and the TS module** — `673ca2e9` (feat)

## Files Created/Modified

- `lib/design-system/quality-colors.ts` — new: `QUALITY_COLORS`/`BRAND_COLORS`, dependency-free TS data module
- `lib/design-system/index.ts` — additive re-export of the new module
- `tailwind.config.js` — 5 new `theme.extend.colors` keys after the existing WoW class-colour block
- `app/(app)/attendance/components/AttendanceContent.tsx` — WCL orange link to `text-brand-wcl`
- `app/(app)/raid-tracking/components/RaidCardHeader.tsx` — Epic purple span, WCL orange link, Discord blurple button (3 utilities) to named keys
- `app/(app)/raid-tracking/components/WeekGroup.tsx` — Epic purple span to `text-quality-epic`
- `app/(app)/profile/components/ProfileContent.tsx` — Battle.net blue chip to `brand-battlenet`
- `app/(app)/characters/[id]/edit/_client.tsx` — Battle.net blue chip to `brand-battlenet`
- `app/components/PremiumItemTooltip.tsx` — 5 identical Uncommon green lines to `text-quality-uncommon` (line 21's unrelated orange untouched)
- `app/components/CreateCharacterModal.tsx` — Battle.net blue chip to `brand-battlenet`
- `app/components/EditCharacterModal.tsx` — Battle.net blue chip to `brand-battlenet`
- `app/components/landing/LandingLootDecision.tsx` — Epic purple text to `text-quality-epic`
- `__tests__/quality-brand-token-parity.test.ts` — new: parity + consumer-existence + fail-loud guard

## Task 1 evidence: rename proof (probe files)

Generated via `node_modules/.bin/tailwindcss -c tailwind.config.js -i in.css -o out.css --content <probe-file>` against two scratch probe files -- one using all five arbitrary-value forms with the same opacity modifiers the 15 live sites use, one using the five named utilities with identical modifiers.

**Sorted rgb-triplet multiset, both probes (identical):**
```
rgb(0 116 224 / 0.1)
rgb(0 116 224 / 0.3)
rgb(163 53 238 / var(--tw-text-opacity, 1)
rgb(227 94 21 / var(--tw-text-opacity, 1)
rgb(30 255 0 / var(--tw-text-opacity, 1)
rgb(59 130 246 / 0.5)
rgb(59 130 246 / 0.5)
rgb(88 101 242 / 0.1)
rgb(88 101 242 / 0.5)
rgb(88 101 242 / var(--tw-text-opacity, 1)
```
`diff` between the two sorted lists: empty.

## Task 2 evidence: rename proof (nine real files)

"Before" content taken from `git show HEAD` (post-Task-1 commit, pre-Task-2 edits); "after" content is the working tree post-edit. Generated via one `--content` flag with a comma-separated 9-file list (per 10-02's discovered `--content`-flag-merging pitfall).

**Sorted rgb-triplet multiset, both before and after (identical):**
```
rgb(0 0 0 / 0.05)
rgb(0 0 0 / 0.1)          (x5)
rgb(0 116 224 / 0.1)
rgb(0 116 224 / 0.3)
rgb(153 64 236 / 0.1)
rgb(153 64 236 / var(--tw-bg-opacity, 1)
rgb(153 64 236 / var(--tw-border-opacity, 1)
rgb(153 64 236 / var(--tw-text-opacity, 1)
rgb(163 53 238 / var(--tw-text-opacity, 1)
rgb(186 186 186 / 0.6)
rgb(186 186 186 / var(--tw-text-opacity, 1)
rgb(227 94 21 / var(--tw-text-opacity, 1)
rgb(255 128 0 / var(--tw-text-opacity, 1)
rgb(255 209 0 / var(--tw-text-opacity, 1)
rgb(255 255 255 / 0.1)
rgb(255 255 255 / var(--tw-text-opacity, 1)
rgb(255 32 32 / var(--tw-text-opacity, 1)
rgb(26 26 46 / 0.95)
rgb(30 255 0 / var(--tw-text-opacity, 1)
rgb(56 56 56 / 0.4)
rgb(56 56 56 / 0.6)
rgb(56 56 56 / var(--tw-border-opacity, 1)
rgb(59 130 246 / 0.5)     (x2)
rgb(74 74 106 / var(--tw-border-opacity, 1)
rgb(8 8 8 / 0.4)
rgb(8 8 8 / var(--tw-bg-opacity, 1)
rgb(88 101 242 / 0.1)
rgb(88 101 242 / 0.5)
rgb(88 101 242 / var(--tw-text-opacity, 1)
```
`diff` between the two sorted lists: empty.

## Task 3 evidence: parity guard fail-first proof (both halves, actual output)

**Half (a) — value drift.** `tailwind.config.js`'s `"quality-epic"` value was temporarily changed from `#a335ee` to `#a335ef`, then re-run:
```
AssertionError: expected { epic: '#a335ef', ... } to deeply equal { epic: '#a335ee', ... }
- Expected
+ Received
  {
    "battlenet": "#0074e0",
    "discord": "#5865f2",
-   "epic": "#a335ee",
+   "epic": "#a335ef",
    "uncommon": "#1eff00",
    "wcl": "#e35e15",
  }
```
File restored byte-for-byte (`git diff --stat` empty), guard re-run and confirmed green (3/3 passed).

**Half (b) — unconsumed constant.** An unused sixth key, `fakeUnusedProbe: '#123456'`, was temporarily added to `BRAND_COLORS`, then re-run:
```
AssertionError: no consumer found under app/ or components/ for: fakeUnusedProbe: expected [ 'fakeUnusedProbe' ] to have a length of +0 but got 1
```
(The parity test also failed, as expected, since the added key has no mapped Tailwind counterpart.) File restored byte-for-byte (`git diff --stat` empty), guard re-run and confirmed green (3/3 passed).

## Verification results

- `grep -rnE "\[#(a335ee|1eff00|0074E0|5865F2|e35e15)\]" app/ components/ -i` — zero matches
- `grep -rc "quality-epic|quality-uncommon|brand-battlenet|brand-discord|brand-wcl" app/ | grep -v ':0$' | wc -l` — `9` (all nine touched files)
- `grep -rn 'text-\[\${|bg-\[\${|border-\[\${' app/ components/` — zero matches (no interpolated class name anywhere)
- `grep -c 'ff8000' app/components/PremiumItemTooltip.tsx` — `1`, unchanged from baseline
- `git diff HEAD~1 -- app/ | grep -E '^[+-]' | grep -vE '^[+-]{3}' | grep -vE 'className|class=' | grep -c .` — `0`
- `git diff --name-only HEAD~1 HEAD` for each commit — exactly the files that commit's acceptance criteria named
- `git diff -- lib/design-system/tokens.ts` — empty
- `npm run typecheck` — exit 0 (after one Rule-1 fix, see Deviations)
- `npm run lint` — 0 errors, 397 pre-existing warnings, none touched by this plan (unchanged from 10-02's baseline)
- `npx vitest run` — 70 files / 1207 tests passed (69/1204 before Task 3's new test file; +1 file/+3 tests after)
- `npx vitest run --maxWorkers=2` (final regression re-run) — 70 files / 1207 tests passed

## Decisions Made

- Followed the plan's locked scope/mechanism decisions exactly: wide COLOR-05 scope (34 occurrences), separate `brand-discord` key, `uncommon` naming.
- Normalised all five hex values to lowercase in both the TS module and the Tailwind config, and made the parity guard compare on lowercase-normalised values, so casing differences (the source hex used uppercase `0074E0`/`5865F2`) can never cause a false parity failure.
- Built the consumer-existence check to iterate over the TS module's actual declared keys (not a fixed expected list), so it naturally catches an added, unmapped constant during the fail-first proof rather than needing separate test-only logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a TypeScript type error in the new parity guard test**
- **Found during:** Task 3, running `npm run typecheck` per the task's `<verify>` block
- **Issue:** `tailwind.config.js`'s inferred `theme.extend.colors` type is `ResolvableTo<RecursiveKeyValuePair<string, string>>`, which has no string index signature, so indexing it with a dynamic `tailwindKey` variable failed with TS7053, and a subsequent assignment of the resulting `unknown` value to a `string | undefined`-typed record failed with TS2322.
- **Fix:** Cast the resolved `theme.extend.colors` object to `Record<string, unknown>` immediately after the existing-ness guard clause (matching `type-scale-floor.test.ts`'s own `as Record<string, [...]>` cast on the same config shape), and narrowed the per-key lookup to `typeof value === 'string' ? value.toLowerCase() : undefined` instead of passing the raw `unknown` through.
- **Files modified:** `__tests__/quality-brand-token-parity.test.ts`
- **Verification:** `npm run typecheck` exit 0; `npx vitest run __tests__/quality-brand-token-parity.test.ts` still 3/3 green; full fail-first proof re-run and re-confirmed after the fix
- **Committed in:** `673ca2e9` (Task 3 commit — fixed before the task's own commit, not a follow-up)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Fix was required for the task's own stated `npm run typecheck exit 0` acceptance criterion. No scope creep -- confined to the new test file this task was already creating.

### Scope note (not an action taken)

The orchestrator's task prompt stated that `app/contexts/AccentColorContext.tsx:14`'s comment reword (part of 10-02's approved gate proposal) belonged to this plan's file scope. It does not: `10-03-PLAN.md`'s `files_modified` frontmatter, its `must_haves` (D-14 explicitly excludes `AccentColorContext.tsx`'s `ACCENT_COLORS` array from centralisation as "a different feature ... not itself a literal-spelling problem"), and every task's acceptance criteria (each asserts an exact `git diff --name-only HEAD~1` file list that does not include this file) are all internally consistent in excluding it. Editing it under any of this plan's three tasks would have broken that task's own acceptance criterion. I executed `10-03-PLAN.md` literally as instructed and did not touch `AccentColorContext.tsx`. This comment reword most plausibly belongs to 10-05 (the JS/TS data-site plan, which reads this same file's `ACCENT_COLORS`/`ACCENT_FILTERS` per its own `<read_first>`), but it is not listed in 10-05's known scope either as far as this plan's context extends -- flagging here so the phase owner can route it explicitly rather than have it silently dropped.

## Issues Encountered

None beyond the typecheck fix documented above.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- COLOR-05's class-site half is fully shipped and guarded: all 15 arbitrary-value hex class sites are gone, replaced by named Tailwind keys, with the rename proven twice by identical generated rgb-triplet multisets (once on synthetic probes, once on the nine real touched files).
- The parity guard is live and has been observed failing on both a value drift and an unconsumed constant, then restored to green — both fail-first halves the plan required.
- 10-05 (the 19 JS/TS data sites plus the COLOR-05 absence guard) can now import `QUALITY_COLORS`/`BRAND_COLORS` from `lib/design-system/quality-colors.ts` directly; the module and its five values are stable and will not change under 10-05.
- Flagged for the phase owner: `AccentColorContext.tsx:14`'s comment reword (spelling `#1eff00` when the file's actual code value is `#15b300`) was locked at 10-02's gate but is not in 10-03's or (as far as this plan's context shows) 10-05's declared file scope. Needs explicit routing before end-of-phase UAT, or it will be silently missed.

## Self-Check: PASSED

- FOUND: `lib/design-system/quality-colors.ts`
- FOUND: `__tests__/quality-brand-token-parity.test.ts`
- FOUND: commit `d8aa2182`
- FOUND: commit `a8479ee3`
- FOUND: commit `673ca2e9`

---
*Phase: 10-colour-literal-migration*
*Plan: 03*
*Completed: 2026-09-20*
