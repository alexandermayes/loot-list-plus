---
phase: 10-colour-literal-migration
plan: 06
subsystem: ui
tags: [tailwind, css-custom-properties, react, card-primitive, vitest, design-tokens]

# Dependency graph
requires:
  - phase: 10-03
    provides: "lib/design-system/quality-colors.ts and the tailwind.config.js theme.extend.colors keys 10-06's guard reads via the same createRequire interop pattern"
  - phase: 10-04
    provides: "Six of the twelve --background-inset call sites already migrated onto plain background/border treatment (never a real card level); the live remaining-use count this plan's gate re-verified at exactly six"
provides:
  - "The six genuinely card-shaped --background-inset sites converted to <Card variant=\"nested\">"
  - "--background-inset deleted from app/globals.css (:root, .dark) and tailwind.config.js's background colour object -- ROADMAP success criterion 1"
  - "__tests__/background-inset-absence.test.ts (COLOR-03 absence guard), covering all three spellings of the token"
  - "WINDOWS.md entry 19: the pre-existing, phase-unrelated /blog/* production-build break, and the substitute Tailwind-CLI proof used in its place"
affects: [10-07-post-phase-capture, phase-12-design-documentation]

actuals:
  tokens: 3764
  tasks: 4
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Absence-guard triad for a deleted design token: utility-class form (directory scan, any prefix/variant), custom-property form (single-file raw-text scan via matchesIn on a resolved path, not sourceFiles which only walks directories), and config-key form (createRequire interop asserting the key gone AND its siblings present, so the test cannot pass by the whole object disappearing)."
    - "npm run build acceptance criterion substituted with a direct tailwindcss CLI compile-and-grep proof when the full build is broken by an unrelated, independently-reproduced pre-existing bug -- proof scoped to what the criterion actually targets (no unresolved colour reference), deviation tracked in WINDOWS.md rather than silently skipped."

key-files:
  created:
    - __tests__/background-inset-absence.test.ts
  modified:
    - app/(app)/profile/components/ProfileContent.tsx
    - app/(app)/overview/components/DashboardContent.tsx
    - app/components/EditCharacterModal.tsx
    - components/ui/skeletons.tsx
    - app/globals.css
    - tailwind.config.js

key-decisions:
  - "Task 1 gate: proceed, as pre-resolved by the orchestrator and independently re-verified (live six-site diff, hover-affordance treatment, exact deleted lines, and the one-way-door consequence all matched 10-02's recorded answer)."
  - "Task 3's npm run build acceptance criterion accepted a substitute proof (direct tailwindcss CLI compile against the full app/+components/ content glob, exit 0, zero background-inset references in generated CSS) after the orchestrator independently reproduced the build failure at commit 27b3df5e -- the last commit before any Phase 10 work -- proving it is a pre-existing, phase-unrelated /blog/* static-page-data bug, not something this deletion causes. Tracked as WINDOWS.md entry 19, explicitly flagged as needing its own separate investigation."

patterns-established:
  - "A targeted absence test for a config key must also assert its siblings survive, and must be observed failing (not trivially passing) when the whole containing object is removed -- otherwise a guard that reads 'no inset key' is satisfied by deleting far more than intended."

requirements-completed: [COLOR-03]

coverage:
  - id: D1
    description: "The six genuinely card-shaped --background-inset sites (ProfileContent.tsx:908, DashboardContent.tsx:2239 and :2411, EditCharacterModal.tsx:405, skeletons.tsx:69 and :133) converted to <Card variant=\"nested\">, keeping only their original padding/layout classes and dropping fill/border/radius"
    requirement: "COLOR-03"
    verification:
      - kind: unit
        ref: "npx vitest run components/ui/__tests__/card.test.tsx -- green, unchanged nested-variant contract"
        status: pass
      - kind: other
        ref: "grep -rn 'bg-background-inset' app/ components/ -- zero matches after Task 2's commit"
        status: pass
    human_judgment: true
    rationale: "10-02's gate labelled this a costly-reversibility structural change (fill/border/radius removed, replaced by a top divider) that the screenshot gate, not a static assertion, is meant to confirm visually across both themes. The visual screenshot comparison itself was not run by this executor (build/dev-server access out of scope for this session) -- routed to end-of-phase UAT per this workstream's established human_verify_mode=end-of-phase convention (see WINDOWS.md entries 4-9, 13, 15-18)."
  - id: D2
    description: "--background-inset deleted from app/globals.css (:root and .dark, including the .dark block's retiring Phase 07 decision comment) and from tailwind.config.js's background colour object, with the three sibling keys (DEFAULT, subtle, elevated) untouched"
    requirement: "COLOR-03"
    verification:
      - kind: unit
        ref: "node -e assertion: 'inset' not in theme.extend.colors.background; DEFAULT/subtle/elevated all present -- pass"
        status: pass
      - kind: other
        ref: "grep -rn 'background-inset' app/ components/ lib/ scripts/ tailwind.config.js -- zero matches repo-wide"
        status: pass
      - kind: other
        ref: "npx tailwindcss CLI compile against app/**/*.{js,ts,jsx,tsx} + components/**/*.{js,ts,jsx,tsx} -- exit 0, zero background-inset references in generated CSS (substitute for the blocked npm run build criterion, WINDOWS.md entry 19)"
        status: pass
    human_judgment: false
  - id: D3
    description: "__tests__/background-inset-absence.test.ts (COLOR-03 absence guard) covering the utility-class form, the custom-property form, and the Tailwind config key form, observed failing on all four fail-first proof parts"
    requirement: "COLOR-03"
    verification:
      - kind: unit
        ref: "__tests__/background-inset-absence.test.ts -- 4/4 tests pass"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-20
status: complete
---

# Phase 10 Plan 06: Nested-Card Conversion, Token Deletion and the COLOR-03 Absence Guard Summary

**Converted the six card-shaped `--background-inset` sites to `<Card variant="nested">`, deleted the token from both its definition sites, and stood up a three-spelling absence guard -- closing ROADMAP success criterion 1.**

## Performance

- **Duration:** ~25 min across the resumed session (Task 3 verification/commit through Task 4 completion; Task 1 gate and Task 2 conversions were completed in a prior session/executor)
- **Started:** 2026-09-20T17:36:25-07:00 (Task 2 commit, prior session)
- **Completed:** 2026-09-20T17:57:38-07:00 (Task 4 commit)
- **Tasks:** 4/4 (Task 1 gate pre-resolved; Tasks 2-4 executed and committed)
- **Files modified:** 6 (4 conversion files + 2 token-definition files); 1 file created (the guard test)

## Accomplishments

- Converted all six genuinely card-shaped `--background-inset` sites onto `<Card variant="nested">`: `ProfileContent.tsx:908` (guild-list row), `DashboardContent.tsx:2239` and `:2411` (two clickable rows), `EditCharacterModal.tsx:405` (guild-membership row), `skeletons.tsx:69` (`ItemListSkeleton`, mapped list) and `:133` (`GuildCardSkeleton`). Each site kept only its original padding/layout classes; fill, border and radius were dropped for the nested variant's first-child-suppressed top divider.
- Deleted `--background-inset` from both its definition sites (`app/globals.css`'s `:root` and `.dark` blocks, `tailwind.config.js`'s `background` colour object), closing ROADMAP success criterion 1 -- the phase's one-way door.
- Stood up `__tests__/background-inset-absence.test.ts`, the COLOR-03 absence guard, covering all three spellings the token can take, and ran its full four-part fail-first proof.
- Independently verified the accepted build-substitute proof (direct `tailwindcss` CLI compile, exit 0, zero `background-inset` in generated CSS) and documented the pre-existing, phase-unrelated `/blog/*` build break as its own tracked issue (WINDOWS.md entry 19) rather than folding it into this phase's scope.

## Gate answer's exact hover-affordance treatment and where applied

10-02's gate recorded answer (quoted from `10-02-SUMMARY.md`'s "Blocking gate: recorded answer" section):

> **Hover-border pitfall** (`DashboardContent.tsx:2239`/`:2411`, two clickable rows currently carrying `hover:border-accent/50`) | (a) -- drop the hover-border, replace with a muted hover background using the `horizontal-scroll.tsx:68` idiom.

Applied exactly as `hover:bg-muted` at both sites, post-edit:

- `DashboardContent.tsx:2240` -- `className="p-3 sm:p-4 hover:bg-muted transition-colors cursor-pointer"` (the `lootPriority` mapped row)
- `DashboardContent.tsx:2413` -- `className="p-4 hover:bg-muted transition-colors cursor-pointer"` (the `actionsNeeded` mapped row)

`grep -n 'hover:border-accent'` on the file returns no match at either post-edit line. `grep -c 'onClick'` on the file is unchanged at 10 before and after, confirming both click handlers survived.

## Six per-site token-set containment comparisons

Each row shows the pre-edit class string next to the post-edit one; every padding/flex/grid/gap/sizing/alignment token from the "before" column is present in the "after" column (containment holds in every case). Dropped tokens are the fill (`bg-background-inset`), the four-sided border (`border border-border`) and the radius (`rounded-xl`/`rounded-lg`) -- exactly what the nested variant's top divider replaces.

| # | Site | Before | After | Containment |
|---|---|---|---|---|
| 1 | `ProfileContent.tsx:908` | `flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-background-inset border border-border rounded-lg` | `flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4` | PASS -- all 7 layout/padding tokens preserved; fill/border/radius (3 tokens) dropped |
| 4 | `DashboardContent.tsx:2239` (now :2240) | `bg-background-inset border border-border rounded-xl p-3 sm:p-4 hover:border-accent/50 transition-colors cursor-pointer` | `p-3 sm:p-4 hover:bg-muted transition-colors cursor-pointer` | PASS -- `p-3`, `sm:p-4`, `transition-colors`, `cursor-pointer` preserved; fill/border/radius/hover-border dropped, `hover:bg-muted` added per gate answer |
| 5 | `DashboardContent.tsx:2411` (now :2413) | `bg-background-inset border border-border rounded-xl p-4 hover:border-accent/50 transition-colors cursor-pointer` | `p-4 hover:bg-muted transition-colors cursor-pointer` | PASS -- same pattern as site 4 |
| 9 | `EditCharacterModal.tsx:405` | `flex items-center justify-between gap-3 p-3 bg-background-inset border border-border rounded-lg` | `flex items-center justify-between gap-3 p-3` | PASS -- all 5 layout/padding tokens preserved; fill/border/radius dropped |
| 11 | `skeletons.tsx:69` (`ItemListSkeleton`) | `bg-background-inset border border-border rounded-xl p-4` | `p-4` | PASS -- `p-4` preserved; fill/border/radius dropped |
| 12 | `skeletons.tsx:133` (`GuildCardSkeleton`) | `flex items-center justify-between gap-3 p-4 bg-background-inset border border-border rounded-lg` | `flex items-center justify-between gap-3 p-4` | PASS -- all 4 layout/padding tokens preserved; fill/border/radius dropped |

`git diff HEAD~1 -- app/ components/` (Task 2's commit) confirms no line other than an element-tag or `className` attribute changed.

## Site 12: does GuildCardSkeleton render inside another Card?

**No -- and more precisely, `GuildCardSkeleton` has zero call sites anywhere in the codebase** (`grep -rn 'GuildCardSkeleton' app/ components/ lib/` returns only its own export declaration at `skeletons.tsx:132`). It is an orphaned/unused export, unchanged by this plan. Per the plan's own read_first warning, an un-nested nested-variant Card "renders a bare top divider with no parent edge to sit against" -- that condition is technically true of this component today, but it is never observed because the component is never rendered. Not fixed here (pre-existing, out of this mechanical migration's scope); noted for whoever next touches `skeletons.tsx` or removes dead exports.

## Live zero count asserted before the deletion (Task 3 precondition)

```
$ grep -rn 'bg-background-inset' app/ components/
(no output, exit 1)
```

Confirmed live, immediately before editing `app/globals.css`/`tailwind.config.js`, both by the prior executor and independently re-verified in this session before committing Task 3.

## The exact lines deleted (Task 3)

`app/globals.css`, `:root` block:
```
-    --background-inset: 35 25% 96%;     /* #f7f5f1 - Nested cards inside elevated */
```

`app/globals.css`, `.dark` block (its full wrapped Phase 07 decision comment retired with it):
```
-    --background-inset: 228 12% 10%;    /* #18191f - Nested cards. Deliberately untouched: at
-                                            10% it is now darker than the lifted card (1.079
-                                            vs card), mirroring light mode where inset has
-                                            always been darker than a card (1.086). Token is
-                                            deleted outright in Phase 10 under COLOR-03. */
```

`tailwind.config.js`, `background` colour object:
```
-          inset: "hsl(var(--background-inset))",
```

Raw diff line count: 6 removed in `app/globals.css` (the `.dark` comment wraps across 5 lines plus its declaration line), 1 removed in `tailwind.config.js`, 0 added in either file. (The plan's acceptance-criteria grep, written assuming single-line comments, would read "exactly 2" -- the actual removal is 2 *declarations* across 6 raw lines because of the wrapped multi-line comment; the substance -- two declarations gone, three sibling background keys intact, zero tombstone comments -- matches the plan's `<done>` criterion exactly.)

## Task 3's build-verification deviation (WINDOWS.md entry 19)

`npm run build`, one of Task 3's acceptance criteria, could not be run to completion: production build is broken repo-wide by a pre-existing, phase-unrelated bug -- `TypeError: c.createContext is not a function` during static page-data collection for `/blog/*` pages (a Turbopack SSR bundling issue; which slug fails is nondeterministic across the 9-worker parallel collection). The orchestrator independently confirmed this is not caused by this plan's work: it reproduced the identical failure both on the Task-2-only state (six conversions committed, token deletion stashed) and on a clean checkout of `27b3df5e` -- the last commit before any Phase 10 work began.

**Accepted substitute proof** (user decision: "Accept substitute proof, continue phase 10"): a direct `tailwindcss` CLI compile against the full `app/**/*.{js,ts,jsx,tsx}` + `components/**/*.{js,ts,jsx,tsx}` content glob, independently re-run in this session:

```
$ npx tailwindcss -i ./app/globals.css -o <scratch>.css \
    --content "./app/**/*.{js,ts,jsx,tsx}" --content "./components/**/*.{js,ts,jsx,tsx}"
Rebuilding... Done in 126ms.
$ echo $?
0
$ grep -c 'background-inset' <scratch>.css
0
```

This proves what the `npm run build` criterion was actually targeting -- that the deletion introduces no unresolved colour reference -- without depending on the unrelated broken build. **The broken `/blog/*` production build is tracked as its own separately-open issue, WINDOWS.md entry 19 (`kind: deviation`, `phase: 10`, `status: open`), and is explicitly NOT investigated or fixed as part of this plan.**

## All four parts of the absence guard's fail-first proof

Each reintroduction was made, the guard re-run to observe red, then reverted immediately; final state confirmed byte-identical to pre-reintroduction (`git diff --stat` empty) before moving to the next part.

**(a) Utility class reintroduced** at `ProfileContent.tsx:909` (appended ` bg-background-inset` to the already-converted site's className):
```
FAIL: finds no bg-background-inset (or any other utility built on the token) anywhere under app/ or components/
AssertionError: .../ProfileContent.tsx:909: className="...gap-3 p-4 bg-background-inset": expected [ {...} ] to have a length of +0 but got 1
```
Names the exact file and line. Reverted; guard green again.

**(b) Custom-property declaration reintroduced** in `app/globals.css`'s `:root` block (`--background-inset: 35 25% 96%;` inserted after `--background-elevated`):
```
FAIL: finds no --background-inset custom-property declaration in app/globals.css
AssertionError: .../app/globals.css:136: --background-inset: 35 25% 96%;: expected [ {...} ] to have a length of +0 but got 1
```
Reverted; guard green again.

**(c) Config key reintroduced** in `tailwind.config.js` (`inset: "hsl(var(--background-inset))",` re-added to the `background` colour object):
```
FAIL: finds no inset key in tailwind.config.js's background colour object, while its three sibling keys survive
AssertionError: expected true to be false
```
Reverted; guard green again.

**(d) Whole `background` colour object removed** from `tailwind.config.js` (targeted-test proof -- confirms the guard does not trivially pass when there is nothing left to check):
```
FAIL: finds no inset key in tailwind.config.js's background colour object, while its three sibling keys survive
Error: tailwind.config.js: theme.extend.colors.background is missing -- the config was restructured; update this guard rather than reading it as a pass
```
The assertion **fails** (throws) rather than passing -- proving this is a targeted absence test, not one that vacuously passes when the whole surface disappears. Reverted; guard green again, and full six-file diff confirmed clean (`git diff --stat` empty) immediately before the Task 4 commit.

## Task Commits

1. **Task 1: ONE-WAY DOOR gate** -- no code commit (decision-only checkpoint; pre-resolved by the orchestrator as `proceed`, independently re-verified in this session against the live six-site diff, the hover-affordance treatment, and the exact-lines-to-delete before Task 3 ran).
2. **Task 2: Convert the six card-shaped sites to the nested Card variant** -- `fafa187e` (feat) -- completed in a prior session/executor.
3. **Task 3: Delete `--background-inset` from `app/globals.css` and `tailwind.config.js`** -- `7225d57d` (feat)
4. **Task 4: Stand up the COLOR-03 absence guard** -- `7fb4d72d` (feat)

**Plan metadata:** pending (this docs commit)

## Files Created/Modified

- `app/(app)/profile/components/ProfileContent.tsx` -- guild-list row converted to `<Card variant="nested">`
- `app/(app)/overview/components/DashboardContent.tsx` -- two clickable rows converted, hover border replaced with `hover:bg-muted`
- `app/components/EditCharacterModal.tsx` -- guild-membership row converted
- `components/ui/skeletons.tsx` -- `ItemListSkeleton` (mapped) and `GuildCardSkeleton` converted
- `app/globals.css` -- `--background-inset` deleted from `:root` and `.dark`
- `tailwind.config.js` -- `inset` key deleted from the `background` colour object
- `__tests__/background-inset-absence.test.ts` -- new, the COLOR-03 absence guard (4 tests: class form, custom-property form, config-key form with sibling assertion, fail-loud-on-missing-file)

## Decisions Made

- Task 1's gate was pre-resolved as `proceed` by the orchestrator and independently re-verified rather than re-litigated, per the prompt's explicit instruction not to re-ask questions 10-02's gate already answered.
- Task 3's `npm run build` acceptance criterion was satisfied by a substitute proof (direct `tailwindcss` CLI compile-and-grep) after the orchestrator's independent investigation conclusively isolated the build failure to a pre-existing, phase-unrelated bug reproduced at a pre-Phase-10 commit. Tracked in WINDOWS.md (entry 19) as its own open issue, not folded into or treated as resolved by this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed a TypeScript type error in the new guard's config-key assertion**
- **Found during:** Task 4 (writing `__tests__/background-inset-absence.test.ts`)
- **Issue:** `tailwindConfig.theme?.extend?.colors?.background` typed against Tailwind's `ResolvableTo<RecursiveKeyValuePair<...>>` union (which includes a function-returning-config form), so TypeScript rejected reading `.background` directly. `npm run typecheck` failed with `TS2339: Property 'background' does not exist`.
- **Fix:** Followed the established idiom from `__tests__/quality-brand-token-parity.test.ts` -- cast `theme.extend.colors` to `Record<string, unknown>` first, throw if missing, then cast the extracted `background` value the same way before the `'inset' in background` checks.
- **Files modified:** `__tests__/background-inset-absence.test.ts`
- **Verification:** `npm run typecheck` exit 0; guard's four tests still pass; full fail-first proof re-run and confirmed after the fix.
- **Committed in:** `7fb4d72d` (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (1 bug). No scope creep -- fix was required for the guard file itself to typecheck.

**Separately tracked, not a deviation from this plan's own scope:** the `npm run build` production-build break (WINDOWS.md entry 19) is a pre-existing, phase-unrelated defect discovered while attempting Task 3's literal acceptance criterion. It is documented above and in WINDOWS.md but explicitly not investigated or fixed here -- it needs its own dedicated session.

## Issues Encountered

- `npm run build` fails repo-wide on `/blog/*` static page-data collection (`TypeError: c.createContext is not a function`, nondeterministic slug, Turbopack SSR bundling issue) -- pre-existing per the orchestrator's independent reproduction at commit `27b3df5e`. Substitute proof accepted for Task 3; full details in "Task 3's build-verification deviation" above and WINDOWS.md entry 19. **This needs urgent, separate investigation outside this phase's scope.**

## Known Stubs

None.

## Threat Flags

None -- no new network endpoint, auth path, file-access pattern or schema change was introduced. This plan only converts JSX element/class structure and deletes two definition-layer tokens.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- COLOR-03 fully shipped: `--background-inset` is absent from `app/globals.css` and `tailwind.config.js`, all twelve of its uses render as a single card level, and the absence guard is green with a proven four-part fail-first history.
- ROADMAP success criterion 1 is closed.
- 10-07 (post-phase capture) can proceed; the screenshot comparison for these six converted sites (and the two clickable rows' hover affordance) is not yet human-verified -- routed to end-of-phase UAT per this workstream's established `human_verify_mode=end-of-phase` convention, consistent with WINDOWS.md entries 4-9, 13 and 15-18.
- The broken `/blog/*` production build (WINDOWS.md entry 19) blocks any future plan or gate that requires a full `npm run build` to pass, until it is investigated and fixed in its own dedicated session.

## Self-Check: PASSED

- FOUND: `__tests__/background-inset-absence.test.ts`
- FOUND: `.planning/workstreams/design-system/phases/10-colour-literal-migration/10-06-SUMMARY.md`
- FOUND commit: `fafa187e` (Task 2)
- FOUND commit: `7225d57d` (Task 3)
- FOUND commit: `7fb4d72d` (Task 4)

---
*Phase: 10-colour-literal-migration*
*Completed: 2026-09-20*
