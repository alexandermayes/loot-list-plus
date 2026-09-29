---
phase: 09-type-and-card-migration
plan: 05
subsystem: ui
tags: [vitest, testing-library, typescript-compiler-api, codemod, tailwind, card-primitive]

requires:
  - phase: 09-type-and-card-migration
    provides: "09-02's live guard ceiling (232) and the 09-02 checkpoint's disposition of the 6 skipped cn(...) hand-rolled-card sites (excluded, same treatment as the 29 borderless lines); 09-01's committed hand-rolled-cards.mjs codemod and hand-rolled-card-pattern.json, applied here for the first time"
provides:
  - "components/ui/card.tsx: base radius rounded-lg -> rounded-xl (D-06), CardVariant extended to three members with the nested variant (D-10/D-11), proven by components/ui/__tests__/card.test.tsx (5 behaviors, RED then GREEN)"
  - "scripts/codemods/hand-rolled-card-pattern.json: scanExclusions widened from 1 entry to the 6-entry, 09-02-checkpoint-approved set (card.tsx plus the 5 files hosting the 6 cn(...)-built sites)"
  - "scripts/codemods/hand-rolled-cards.mjs: rewritten mutation mechanism (exact-offset text splicing instead of ts.createPrinter().printFile() on a mutated tree) plus two new correctness guards (custom-component-tag skip, interactive-intrinsic-element skip) -- all three found and fixed live, during this plan's first real application of the codemod"
  - "components/, app/components/, and the five public-page directories (customers, research, blog, reserve, guild-select) carry no rewritable hand-rolled card string; HAND_ROLLED_CARD_CEILING at 159 (not the plan's 154 estimate -- reconciled below)"
affects: [09-06, 09-07-nested-card-conversion, 09-08-evidence]

actuals:
  tokens: 24500
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Codemod mutation via exact-offset text splicing against the ORIGINAL source string (tag-identifier span + className-literal span only), sorted descending by start offset and applied in one pass -- not ts.createPrinter().printFile() on a mutated AST, which reformats every untouched line and can misplace a new import before a leading directive prologue"
    - "JSX intrinsic-vs-component tag distinction (lowercase-first vs uppercase-first identifier) as a hard gate before any AST-driven element rename, plus a small denylist of interactive intrinsic tags (button, a, input, select, textarea, option, summary, label) that must never be renamed away from their native element even when lowercase, since Tailwind's disabled:* variants depend on the real :disabled pseudo-class"

key-files:
  created:
    - components/ui/__tests__/card.test.tsx
  modified:
    - components/ui/card.tsx
    - scripts/codemods/hand-rolled-cards.mjs
    - scripts/codemods/hand-rolled-card-pattern.json
    - __tests__/hand-rolled-cards.test.ts
    - components/ui/skeletons.tsx
    - components/ui/searchable-dropdown.tsx
    - components/ui/info-tooltip.tsx
    - app/components/ (18 files)
    - app/customers/[slug]/sections.tsx
    - app/research/wow-classic-loot-systems-2026/page.tsx
    - app/blog/page.tsx
    - app/reserve/join/[token]/page.tsx
    - app/reserve/join/[token]/loading.tsx
    - app/guild-select/create/page.tsx

key-decisions:
  - "Task 1 executed as TDD: components/ui/__tests__/card.test.tsx written and committed first (RED: 3/5 tests fail, tsc rejects variant=\"nested\"), then card.tsx changed (GREEN: 5/5 pass) -- one test commit, one feat commit."
  - "Found and fixed a real bug in hand-rolled-cards.mjs during Task 2, its first real (non-dry-run) application: printing the whole mutated file via ts.createPrinter().printFile() reformatted every untouched line (collapsed blank lines, changed quote style on new nodes) and, critically, inserted the new Card import BEFORE a leading 'use client' directive in info-tooltip.tsx and searchable-dropdown.tsx -- breaking the Next.js client-boundary contract, which requires the directive to remain the file's first statement. Rewrote the mutation mechanism to compute exact-offset text edits against the original source (tag-identifier rename + className-literal replacement only) applied by descending-offset splicing, with a directive-prologue-aware import insertion point. Verified: both files' 'use client' line is untouched and remains first; diffs shrank from ~1800 changed lines across 3 files to 111."
  - "Found and fixed two more real bugs in hand-rolled-cards.mjs during Task 3, when applied against app/components/'s wider variety of call sites: (1) a className coincidentally matching the D-08 detection regex on a CUSTOM COMPONENT tag (<Button className=\"...bg-background-elevated...rounded-[52px]...border-border-strong...\"> at MultiSelectDropdown.tsx:187 and Navigation.tsx:108; <Link> at app/reserve/join/[token]/page.tsx:848) was being silently renamed to <Card>, discarding that component's own prop contract and semantics for Card's plain div. (2) a className matching D-08 on a native INTERACTIVE intrinsic element (app/reserve/join/[token]/page.tsx:198's <button type=\"button\" disabled={disabled} onClick={...}>) was also being renamed to <Card>, which would have silently broken its disabled:cursor-not-allowed / disabled:opacity-50 utilities (a div can never match the real :disabled pseudo-class) and lost native keyboard activation -- a correctness/accessibility regression directly contradicting this same workstream's Phase 08 PRIM-03/PRIM-04 keyboard-accessibility work. Both classes of site are now detected via an uppercase-tag check and a small interactive-intrinsic-tag denylist, and reported SKIPPED by name and reason rather than rewritten."
  - "HAND_ROLLED_CARD_CEILING closes at 159, not the plan's plan-time estimate of 154. 46 live matching lines existed across app/components/ + the 5 public directories at execution time (not 47 -- a one-line drift consistent with this workstream's established live-vs-plan-time measurement variance), of which 42 were migrated. The remaining 4 (the 2 Button sites, 1 native button, 1 Link) are the newly-discovered correctness exceptions above: they still match the guard's regex because their className was never rewritten, and there is no scanExclusion mechanism for a single line inside an otherwise-migrated file (unlike the file-level cn(...) exclusion from Task 2). The delta (159 vs 154 = 5) is named here rather than silently forced to match, per this workstream's established reconciliation convention (09-01/09-02's Pitfall-1-style discrepancy handling)."
  - "windows append (the WINDOWS.md broken-windows ledger CLI) is currently broken: entry 11's stored status is the literal string \"resolved\", which the CLI's schema validator rejects (valid values appear to be open/waived/fixed), so every windows append call in this session failed with 'Ledger entry 10 has invalid status: resolved' before writing anything new. This is pre-existing corruption from a prior session, out of this plan's file scope (09-05 touches no WINDOWS.md-adjacent files), so per the deviation rules' scope boundary it was not auto-fixed here; the two items that would have been recorded (Task 1's unrun human-check, and the 4 permanently-unresolved hand-rolled sites) are documented in this SUMMARY's Issues Encountered section instead. The ledger append is documented as best-effort/non-blocking per the executor's own instructions, so this did not halt the plan."

requirements-completed: []

coverage:
  - id: D1
    description: "components/ui/card.tsx's base radius moves from rounded-lg (8px) to rounded-xl (12px); CardVariant gains a third member, nested, which paints only the app's existing divider idiom (border-t border-border) with padding passing through via className and no sub-component branch added"
    requirement: PRIM-01
    verification:
      - kind: unit
        ref: "npx vitest run components/ui/__tests__/card.test.tsx (5 tests, all passing)"
        status: pass
      - kind: other
        ref: "node -e union-shape assertion (CardVariant has exactly three members) printed ok; grep -c for the exact rounded-xl base string returns 1; grep -c rounded-lg and CardSection both return 0; git diff HEAD~1 confined to the type alias, docstring and the cn(...) call inside Card, no sub-component touched"
        status: pass
    human_judgment: false
  - id: D2
    description: "components/ui/ (skeletons.tsx's 20 shells + the bg-card synonym shell, searchable-dropdown.tsx, info-tooltip.tsx) migrated onto Card; scanExclusions widened to the 09-02-checkpoint-approved 6-entry set (dropdown-menu.tsx, empty-state.tsx, error-state.tsx, radio-group.tsx, segmented-control.tsx plus card.tsx itself); Phase 08's skeleton card-count tests stay green unedited"
    requirement: PRIM-01
    verification:
      - kind: unit
        ref: "npx vitest run components/ui/__tests__/skeletons.test.tsx __tests__/hand-rolled-cards.test.ts (4 tests, all passing, ceiling 201)"
        status: pass
      - kind: other
        ref: "node scripts/codemods/hand-rolled-cards.mjs components --dry-run reports TOTAL: 0; scanExclusions node -e assertion matches the exact 6-entry set; git diff on the 5 excluded files shows zero changes to their 6 named lines"
        status: pass
    human_judgment: false
  - id: D3
    description: "app/components/ (18 files incl. landing/BlogRelatedPosts.tsx) and the five public-page directories migrated onto Card; app/reserve/join/[token]/page.tsx's existing import extended (not duplicated); the confirmed bg-card/50 synonym site at app/guild-select/create/page.tsx:431 migrated with its opacity modifier preserved via passthrough"
    requirement: PRIM-01
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/hand-rolled-cards.test.ts (ceiling 159, passing)"
        status: pass
      - kind: other
        ref: "Dry-run over all 6 scopes (components, app/components, app/customers, app/research, app/blog, app/reserve, app/guild-select) reports TOTAL: 0 in every scope; grep -c for the reserve/join Card import returns 1 (no duplicate); git diff -- app/ contains no rendered-text change, className/tag lines only"
        status: pass
    human_judgment: false
  - id: D4
    description: "Two codemod correctness bugs found and fixed live in hand-rolled-cards.mjs (custom-component-tag rename, interactive-intrinsic-element rename), each verified by re-running the dry-run and confirming the site now reports SKIPPED with a named reason instead of REWRITTEN"
    verification:
      - kind: other
        ref: "app/components dry-run: MultiSelectDropdown.tsx:187 and Navigation.tsx:108 report SKIPPED (custom component tag <Button>...); app/reserve dry-run: page.tsx:198 reports SKIPPED (interactive intrinsic element <button>...) and page.tsx:848 reports SKIPPED (custom component tag <Link>...)"
        status: pass
    human_judgment: true
    rationale: "Confirming the fix is semantically correct (not just that the tool now skips) required reading the actual JSX at each site (variant=\"outline\" Button with onClick, and a disabled/onClick native button) and reasoning about what a Card-div substitution would have broken -- a judgment call about component semantics, not something a single automated assertion proves on its own."
  - id: D5
    description: "The full lint/typecheck/test gate stays green across all three task commits, and the overall plan-level verification (card.test.tsx + skeletons.test.tsx + hand-rolled-cards.test.ts, all six dry-run scopes at zero) passes at the end"
    requirement: PRIM-01
    verification:
      - kind: unit
        ref: "npx vitest run --maxWorkers=2 (67 files, 1198 tests, all passing) run after each of the three task commits"
        status: pass
      - kind: other
        ref: "npm run typecheck exits 0 and npm run lint reports 0 errors (397 pre-existing warnings, unchanged from before this plan) after each commit"
        status: pass
    human_judgment: false

duration: 48min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 05: Card Primitive Change, Component Test, and Two-Batch Migration Summary

**Card's base radius moved to 12px with a new `nested` divider-only variant (proven by a first-ever `components/ui/*` test), then 33 files across `components/` and `app/components/`+public pages were migrated onto `<Card>` via a rewritten, minimal-diff codemod that turned up and fixed three real correctness bugs (a directive-prologue-breaking import placement, and two component/interactive-element mis-renames) along the way.**

## Performance

- **Duration:** 48 min
- **Started:** 2026-09-19T20:34:34Z (immediately after 09-04's close, per STATE.md session continuity)
- **Completed:** 2026-09-19T21:22:00Z
- **Tasks:** 3 of 3 completed
- **Files modified:** 33 (1 test file created, 32 modified: `card.tsx`, the two codemod scripts, the guard test, 3 `components/ui/*` files, 24 `app/` files across `app/components/` and the 5 public-page directories, plus 1 `hand-rolled-card-pattern.json`)

## Accomplishments

- `components/ui/card.tsx`: base radius `rounded-lg` (8px) → `rounded-xl` (12px), `CardVariant` extended to `"default" | "unified" | "nested"`, `nested` painting only `border-t border-border` with no fill/radius/all-sides-border, padding passing through via `className`, no sub-component gained a branch
- `components/ui/__tests__/card.test.tsx` written first (TDD RED: 3/5 fail, `tsc` rejects `variant="nested"`), then made green (GREEN: 5/5 pass) -- the first-ever test file for `Card`
- Batch C1: 25 hand-rolled card sites across `components/ui/skeletons.tsx` (all 20 shells + the `bg-card` synonym shell), `searchable-dropdown.tsx`, and `info-tooltip.tsx` migrated onto `<Card>`; `scanExclusions` widened to the 09-02-checkpoint-approved 6-entry set; `HAND_ROLLED_CARD_CEILING` 232 → 201
- Batch C2: 42 hand-rolled card sites across 24 files in `app/components/` (incl. `landing/BlogRelatedPosts.tsx`) and the five public directories (`customers`, `research`, `blog`, `reserve`, `guild-select`) migrated onto `<Card>`; `HAND_ROLLED_CARD_CEILING` 201 → 159
- Rewrote `hand-rolled-cards.mjs`'s mutation mechanism from whole-file AST reprinting to exact-offset text splicing, after discovering (during Batch C1's first real, non-dry-run application) that reprinting reformatted every untouched line and placed the new import before a leading `'use client'` directive
- Added two further correctness guards to the same codemod after discovering (during Batch C2) that it would otherwise rename a styled `<Button>`/`<Link>` component reference, or a native interactive `<button>` element, to `<Card>` -- both now correctly reported `SKIPPED` by name and reason

## Task Commits

Each completed task was committed atomically (Task 1 as two TDD commits):

1. **Task 1a: Add failing Card component test** - `077cfe1b` (test)
2. **Task 1b: Change Card's base radius and add the nested variant** - `188d7836` (feat)
3. **Task 2: Migrate the components/ tree onto Card, widen scanExclusions** - `2568f1fe` (feat)
4. **Task 3: Migrate app/components and public pages onto Card** - `5688967e` (feat)

**Plan metadata:** committed alongside this SUMMARY (see the docs commit immediately following).

## Files Created/Modified

- `components/ui/__tests__/card.test.tsx` - 5-behavior component test for all three `Card` variants
- `components/ui/card.tsx` - base radius + `nested` variant
- `scripts/codemods/hand-rolled-cards.mjs` - rewritten mutation mechanism (exact-offset text splicing) plus custom-component-tag and interactive-intrinsic-tag skip guards
- `scripts/codemods/hand-rolled-card-pattern.json` - `scanExclusions` widened to 6 entries
- `__tests__/hand-rolled-cards.test.ts` - ceiling 232 → 201 → 159, with the full arithmetic documented inline
- `components/ui/skeletons.tsx`, `components/ui/searchable-dropdown.tsx`, `components/ui/info-tooltip.tsx` - migrated onto `<Card>`
- `app/components/*.tsx` (18 files), `app/customers/[slug]/sections.tsx`, `app/research/wow-classic-loot-systems-2026/page.tsx`, `app/blog/page.tsx`, `app/reserve/join/[token]/page.tsx`, `app/reserve/join/[token]/loading.tsx`, `app/guild-select/create/page.tsx` - migrated onto `<Card>`

## Decisions Made

- Task 1 followed the plan's explicit `tdd="true"` instruction: test file written and committed first (RED), then the implementation (GREEN), as two separate commits rather than one.
- The two codemod fixes (minimal-diff text splicing; component/interactive-tag exclusion) were applied as Rule 1 auto-fixes to the codemod script itself, never as hand-patches to the generated files, per this plan's own standing rule ("the codemod is the author... never hand-patch").
- The ceiling closed at 159, not the plan's stated 154; the 5-line delta is fully reconciled and named in both the test file's own comment and this SUMMARY's `key-decisions`, following this workstream's established discrepancy-naming convention rather than being silently forced to match.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] hand-rolled-cards.mjs's whole-file reprint broke the 'use client' directive-first contract**
- **Found during:** Task 2, the codemod's first real (non-dry-run) application
- **Issue:** `printer.printFile()` on the mutated tree reformatted every line of a touched file (collapsed blank lines, changed quote style on new nodes) and, in files with a leading `'use client'` directive (`info-tooltip.tsx`, `searchable-dropdown.tsx`), inserted the new `Card` import BEFORE the directive -- Next.js requires the directive to remain the file's first statement for the client-boundary contract to apply.
- **Fix:** Rewrote the mutation mechanism to compute exact-offset text edits against the original source string (only the tag-identifier span and the className-literal span), applied via descending-offset splicing; import insertion now explicitly walks past any leading directive prologue.
- **Files modified:** `scripts/codemods/hand-rolled-cards.mjs`
- **Verification:** Re-ran the dry-run (byte-identical report to the pre-fix run); applied and confirmed both files' `'use client'` line is untouched and remains line 1; diff size for the 3-file batch shrank from ~1800 changed lines to 111.
- **Committed in:** `2568f1fe` (Task 2 commit)

**2. [Rule 1 - Bug] hand-rolled-cards.mjs would rename a custom component reference (<Button>, <Link>) to <Card>**
- **Found during:** Task 3, applying the codemod to `app/components/`'s wider variety of call sites
- **Issue:** The AST visitor's "safe to rewrite" check only verified the tag name was a simple `ts.Identifier`, which is also true for capitalized component references (`<Button className="...">` at `MultiSelectDropdown.tsx:187` and `Navigation.tsx:108`; `<Link className="...">` at `app/reserve/join/[token]/page.tsx:848`). Renaming these to `<Card>` would have discarded each component's own prop contract and semantics for Card's plain div.
- **Fix:** Added a lowercase-first-letter check (JSX's own intrinsic-vs-component convention) before rewriting; a component-tag match is now reported `SKIPPED` with reason `custom component tag <Tag>, not a native intrinsic element`.
- **Files modified:** `scripts/codemods/hand-rolled-cards.mjs`
- **Verification:** Re-ran the dry-run; all 3 sites now report `SKIPPED` with the new reason instead of `REWRITTEN`.
- **Committed in:** `5688967e` (Task 3 commit)

**3. [Rule 1 - Bug] hand-rolled-cards.mjs would rename a native interactive <button> to <Card>**
- **Found during:** Task 3, same application
- **Issue:** `app/reserve/join/[token]/page.tsx:198` is a native `<button type="button" disabled={disabled} onClick={...} className="...">` whose `disabled:cursor-not-allowed` and `disabled:opacity-50` Tailwind variants depend on the real `:disabled` pseudo-class. Renaming it to `<Card>` (a plain div) would have silently broken both utilities (a div can never be `:disabled`) and lost native keyboard activation -- directly contradicting this same workstream's Phase 08 keyboard-accessibility work.
- **Fix:** Added a small denylist of interactive intrinsic tags (`button`, `a`, `input`, `select`, `textarea`, `option`, `summary`, `label`) that are never rewritten even though they're lowercase; reported `SKIPPED` with reason `interactive intrinsic element <button>, would lose native keyboard/disabled/ARIA semantics as Card's plain div`.
- **Files modified:** `scripts/codemods/hand-rolled-cards.mjs`
- **Verification:** Re-ran the dry-run; the site now reports `SKIPPED` with the new reason instead of `REWRITTEN`.
- **Committed in:** `5688967e` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 1 - codemod correctness bugs, found and fixed at the tool level, never hand-patched at the site level)
**Impact on plan:** All three fixes were necessary for correctness (contract-breaking directive placement) or correctness/accessibility (component and interactive-element semantics). No scope creep: no additional files were touched beyond the plan's own `<files>` lists, and the codemod's detection/report format and every other behavior are unchanged. The only externally-visible consequence is the ceiling closing at 159 instead of 154, reconciled above.

## Issues Encountered

**Ceiling discrepancy (154 planned vs. 159 actual), fully reconciled.** See `key-decisions` above for the full arithmetic: 46 live matches (not 47) minus 42 actual rewrites (4 sites permanently excepted by the two Rule-1 fixes) = 159. The 4 excepted sites (`app/components/MultiSelectDropdown.tsx:193`, `app/components/Navigation.tsx:112`, `app/reserve/join/[token]/page.tsx:202` and `:850` at their post-migration line numbers) remain hand-rolled indefinitely -- there is no file-level `scanExclusions` mechanism for a single line inside an otherwise-migrated file (unlike Task 2's 5 fully-excluded `cn(...)` host files). Whoever plans the phase's next card-sweep batch (09-06 or later) should either accept these 4 as a permanent, named exception alongside the 6 `cn(...)` sites, or schedule a manual, judgment-based conversion (e.g. wrapping each in a `<Card>` ancestor rather than renaming the interactive element itself) -- this plan does not decide which, since that is an architectural/design call outside a mechanical sweep's scope.

**The WINDOWS.md broken-windows ledger CLI (`gsd-tools windows append`) is currently broken.** Every invocation this session failed with `Ledger entry 10 has invalid status: "resolved"` (0-indexed; corresponds to ledger id 11, whose JSON `status` field reads the literal string `"resolved"` -- not one of the tool's accepted values, apparently `open`/`waived`/`fixed`). This is pre-existing corruption from a prior session (entry 11 was recorded by the 09-05/09-06 reconciliation work referenced in `STATE.md`), not something this plan's own files touch, so per the deviation rules' scope boundary it was not auto-fixed here. The two items that would have been recorded are documented instead:
- *(would-be unrun-verify)* Task 1's `<human-check>`: opening the design-system page and one screen from the 11 existing `Card` importers (e.g. `/sheet-import`) in both themes to confirm the 4px radius delta and nothing else moved -- not run this session; routed to end-of-phase UAT per `workflow.human_verify_mode=end-of-phase`, consistent with how prior Phase 07/08/09 plans have handled the same kind of visual check.
- *(would-be deviation)* The 4 permanently-hand-rolled sites named above, which need a future decision (exception vs. manual conversion) before the card-sweep ratchet can close to zero.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`components/ui/card.tsx` now exposes the `nested` variant Phase 10 and this phase's own later nested-conversion plan (09-07) depend on, proven by a real component test. `HAND_ROLLED_CARD_CEILING` sits at 159 with every remaining match's identity known (either genuinely unswept `app/(app)/` files carrying real card strings, or the 4 permanently-excepted sites named above). Whoever plans 09-06 (if it still exists as a distinct batch) or the phase's next card-sweep step should read this SUMMARY's "Ceiling discrepancy" note before writing that plan's acceptance criteria, exactly as 09-02's flag about the 6 `cn(...)` sites was carried forward into this plan.

## Self-Check: PASSED

`components/ui/__tests__/card.test.tsx` confirmed present on disk, 5/5 passing. `components/ui/card.tsx`'s `CardVariant` union confirmed to have exactly three members via the same `node -e` assertion used in Task 1's acceptance criteria. `scripts/codemods/hand-rolled-card-pattern.json`'s `scanExclusions` confirmed to be the exact 6-entry set. `__tests__/hand-rolled-cards.test.ts`'s ceiling confirmed at 159 both by reading the file and by an independent `tsx`-run live measurement matching exactly. All four task commit hashes (`077cfe1b`, `188d7836`, `2568f1fe`, `5688967e`) confirmed present via `git log --oneline -6`. Dry-run over all 6 scopes (`components`, `app/components`, `app/customers`, `app/research`, `app/blog`, `app/reserve`, `app/guild-select`) confirmed to report `TOTAL: 0 rewrite(s)` in every scope. Full gate (`npm run typecheck`, `npm run lint`, `npx vitest run --maxWorkers=2`) confirmed green after the final commit: 0 typecheck errors, 0 lint errors (397 pre-existing warnings, unchanged), 67/67 test files and 1198/1198 tests passing.

---
*Phase: 09-type-and-card-migration*
*Completed: 2026-09-19*
