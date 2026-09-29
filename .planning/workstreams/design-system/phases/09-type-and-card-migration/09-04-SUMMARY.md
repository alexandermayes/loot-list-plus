---
phase: 09-type-and-card-migration
plan: 04
subsystem: ui
tags: [tailwind, codemod, type-scale, ratchet-guard, landing]

requires:
  - phase: 09-type-and-card-migration
    provides: "09-03's completed sweep of app/(app)/ (ceiling at 423) and the committed text-sizes.mjs codemod / text-size-map.json mapping table"
provides:
  - "Every file under app/components/ (excluding landing), the landing subtree, every public page (pricing, about, reserve, changelog, blog, global-error), and the shared components/ tree now sizes its text through named Tailwind fontSize scale steps -- no arbitrary text-[Npx] class remains anywhere under app/ or components/"
  - "Both D-02 midpoint deltas landed: the single 22px site in PremiumItemTooltip.tsx rounds up to text-24 (Task 1), and the single 17px site in LandingLootDecision.tsx rounds up to text-18 (Task 2); no text-17 or text-22 alias exists"
  - "The sacred landing hero H1 (LandingHero.tsx, PremiumHero.tsx) renders pixel-identical: every display value present (28, 32, 40, 44, 48, 56, 64, 72, 80) maps onto its own exact-value alias, verified by a pre-apply assertion before the batch was applied"
  - "__tests__/arbitrary-text-sizes.test.ts's ARBITRARY_TEXT_SIZE_CEILING ratcheted down twice more (423 -> 210 -> 73) then removed entirely; the primary assertion is now a plain toHaveLength(0) zero-match scan, proven non-vacuous by a fail-first proof (introduced a marker, watched it fail naming the path:line, removed it, watched it pass again) before the closing commit"
affects: [09-05-card-primitive, 09-06-card-sweep-cont, 09-08-evidence]

actuals:
  tokens: 47200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Applying a codemod over a whole directory then reverting the excluded subtree with git checkout -- (rather than teaching the codemod a subtree-exclusion flag) keeps text-sizes.mjs's single-path-argument contract unchanged while still landing a commit that contains no file under the excluded path"
    - "Closing a ratchet guard requires a fail-first proof in the same session: introduce a synthetic violation, run the test and confirm it fails naming the exact offending path:line, remove the violation, confirm green again -- only then is toHaveLength(0) trusted as non-vacuous rather than assumed"

key-files:
  created: []
  modified:
    - "app/components/{BattlenetCharacterPickerModal,BisImportModal,CharacterCard,CharacterSelector,ClassPrioritySubline,CreateCharacterModal,CreateGuildModal,EditCharacterModal,FeedbackModal,GuardianConversionModal,JoinGuildModal,LoginPage,LootListSummaryView,MultiSelectDropdown,Navigation,OnboardingModal,PremiumItemTooltip,PrioListItemModal,ReserveItemPicker,ScoreBreakdownModal,ScoreComparisonModal,SearchableItemSelect,Sidebar,StyledSelect,ThemeSelector,UpgradeModal,WelcomeScreen,WowSimsImportModal}.tsx (Task 1)"
    - "app/components/landing/{LandingCompare,LandingCTA,LandingFeatures,LandingHero,LandingHowItWorks,LandingLootDecision,LandingNav,LandingValueProps,ParallaxItem,PremiumFeatures,PremiumHero,PremiumPricing}.tsx (Task 2)"
    - "app/pricing/page.tsx, app/about/page.tsx, app/changelog/page.tsx, app/blog/page.tsx, app/global-error.tsx (Task 2)"
    - "app/reserve/join/[token]/page.tsx, app/reserve/join/[token]/components/InlineSettingsEditor.tsx (Task 2)"
    - "components/profile/profile-stats.tsx, components/ui/{classification-badge,date-picker,date-time-picker,info-tooltip,input,modal,searchable-dropdown,segmented-control,select,textarea}.tsx (Task 3)"
    - "__tests__/arbitrary-text-sizes.test.ts (all three tasks: ceiling 423 -> 210 -> 73 -> removed, assertion closed to toHaveLength(0))"

key-decisions:
  - "Task 1 applied scripts/codemods/text-sizes.mjs over the whole app/components directory (the script takes one path argument and has no subtree-exclusion flag), then reverted app/components/landing via git checkout -- before staging, rather than teaching the codemod a new flag for one batch boundary. The resulting commit contains zero files under app/components/landing, satisfying the plan's acceptance criterion without modifying the committed script."
  - "Both live re-measurements (213 matching lines / 28 files for Task 1, 137 matching lines / 19 files for Task 2, 73 matching lines / 11 files for Task 3) matched the plan's plan-time table exactly across all three tasks -- no reconciliation was needed, continuing 09-03's pattern rather than 09-01/09-02's occurrence-vs-line discrepancies."
  - "The pre-apply assertion for Task 2 (every display value 28/32/40/44/48/56/64/72/80 maps to its own identical-value alias) was run via a one-line node check against text-size-map.json before applying the codemod, exactly as the plan's action text specifies, rather than trusting the mapping table's prior verification from 09-01/09-02."
  - "The Task 3 ratchet closure followed the plan's exact fail-first-proof instruction: a temporary `text-[13px]` marker line was appended to Navigation.tsx (a file already migrated, so the marker was unambiguous), the guard test was run and failed naming Navigation.tsx:217 exactly, the marker was removed, and the guard passed again -- all before the closing commit, so the zero-match assertion is proven non-vacuous rather than assumed correct by inspection."

requirements-completed: [TYPE-03]

coverage:
  - id: D1
    description: "Task 1: swept app/components/ excluding the landing subtree (28 files, 213 matching lines, 214 occurrences), rounded PremiumItemTooltip.tsx's 22px site to text-24 (D-02), left 32/40/42px sites unchanged in size, ceiling 423 -> 210, commit aa6a57c4"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/arbitrary-text-sizes.test.ts (3 tests, passing at ceiling 210)"
        status: pass
      - kind: other
        ref: "grep -rlE 'text-\\[[0-9]+px\\]' app/components --exclude-dir=landing returns no files; grep -c 'text-24' PremiumItemTooltip.tsx returns 1; node check confirms no text-22 alias exists; git show --stat lists no file under app/components/landing/"
        status: pass
    human_judgment: false
  - id: D2
    description: "Task 2: swept app/components/landing/, app/pricing/, app/about/, app/reserve/, app/changelog/, app/blog/, app/global-error.tsx (19 files, 137 matching lines, 168 occurrences), every display value confirmed to map to its own identical-value alias before applying, rounded LandingLootDecision.tsx's 17px site to text-18 (D-02), ceiling 210 -> 73, commit 57ba7d37"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/arbitrary-text-sizes.test.ts (3 tests, passing at ceiling 73)"
        status: pass
      - kind: other
        ref: "grep -rlE over the seven-item scope returns no files; node check over text-size-map.json confirms all nine display values map identity; grep -c 'text-18' LandingLootDecision.tsx returns 1 and no text-17 alias exists; git diff scoped to landing/pricing/about shows only class-attribute string changes"
        status: pass
    human_judgment: false
  - id: D3
    description: "Task 3: swept components/ (11 files, 73 matching lines, 81 rewrites), closed the ratchet by removing ARBITRARY_TEXT_SIZE_CEILING and changing the primary assertion to toHaveLength(0), proven non-vacuous by a fail-first proof, commit 2cadbf02; no file under app/ or components/ carries an arbitrary text-[Npx] class"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/arbitrary-text-sizes.test.ts __tests__/type-scale-floor.test.ts (3 + 19 tests, all passing); fail-first proof performed and reverted this session (marker added, guard failed naming Navigation.tsx:217, marker removed, guard passed)"
        status: pass
      - kind: other
        ref: "grep -rlE 'text-\\[[0-9]+px\\]' app components returns no files; node scripts/codemods/text-sizes.mjs app --dry-run and node scripts/codemods/text-sizes.mjs components --dry-run each report TOTAL: 0 rewrite(s); node check confirms the ceiling constant string is absent and toHaveLength(0) is present"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full CI gate (typecheck, lint, full test suite at --maxWorkers=2) green after all three commits, with no file outside each batch's declared scope touched"
    verification:
      - kind: unit
        ref: "npm run typecheck (exit 0) x3, npm run lint (0 errors, pre-existing 397 warnings unchanged) x3, npx vitest run --maxWorkers=2 (66 files / 1193 tests, all passing) x3 -- run after each of the three commits"
        status: pass
    human_judgment: false
  - id: D5
    description: "Task 2's human-check (compare the committed pre-phase-09 Home images against the current hero render at both widths and both themes, confirm /pricing and /about copy unchanged) could not be run directly: the automated pre-apply mapping assertion and the scoped git diff both confirmed the change is class-attribute-only and every display value resolves to its own identical pixel alias, but no running dev server or screenshot comparison was performed in this plan"
    verification: []
    human_judgment: true
    rationale: "This plan's tasks are all type=\"auto\" with no checkpoint of their own; the visual pixel-identity claim is provable by the mapping-table identity assertion and the scoped diff (both performed and both passed), but the literal side-by-side image comparison against the committed pre-phase-09 baseline is routed to the end-of-phase screenshot/UAT gate (09-08), following the same pattern 09-02/09-03 used for D-04's line-height tightening and the Home-only baseline limitation."

duration: 18min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 04: Type Sweep Finish -- app/components, Landing/Public, components/ (Summary)

**Every remaining `text-[Npx]` site under `app/` and `components/` now sizes its text through a named Tailwind fontSize scale step: 58 files across three green commits, both D-02 midpoint deltas landed (22px and 17px), the sacred landing hero H1 confirmed pixel-identical by a pre-apply identity assertion, and the TYPE-03 ratchet guard closed to a plain zero-match assertion proven non-vacuous by a fail-first proof.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-19T20:14:00Z (approx)
- **Completed:** 2026-09-19T20:32:00Z
- **Tasks:** 3 of 3 completed
- **Files modified:** 58 product source files plus `__tests__/arbitrary-text-sizes.test.ts` across all three tasks (28 in Task 1, 19 in Task 2, 11 in Task 3)

## Accomplishments

- Task 1: swept `app/components/` excluding the landing subtree -- 28 files, 213 matching lines, 214 occurrences, exactly matching the plan's plan-time table; `PremiumItemTooltip.tsx`'s single 22px site rounded up to `text-24` (D-02) with no `text-22` alias created; ceiling 423 -> 210
- Task 2: swept `app/components/landing/` plus every public page (`app/pricing/`, `app/about/`, `app/reserve/`, `app/changelog/`, `app/blog/`, `app/global-error.tsx`) -- 19 files, 137 matching lines, 168 occurrences, exactly matching the plan's plan-time table; confirmed via a pre-apply `node` check that all nine display values (28, 32, 40, 44, 48, 56, 64, 72, 80) map onto their own identical-pixel alias before touching the sacred hero; `LandingLootDecision.tsx`'s single 17px site rounded up to `text-18` (D-02) with no `text-17` alias created; ceiling 210 -> 73
- Task 3: swept `components/` -- 11 files, 73 matching lines, 81 rewrites, exactly matching the plan's plan-time table; every value (11-14, 16, 18, 20) mapped 1:1 onto an already-shipped alias, no size delta; closed the ratchet -- deleted `ARBITRARY_TEXT_SIZE_CEILING` and switched the primary assertion to `toHaveLength(0)`, proven non-vacuous by a fail-first proof (a temporary `text-[13px]` marker made the guard fail naming the exact `path:line`, then pass again once removed)
- A repo-wide `grep -rlE 'text-\[[0-9]+px\]' app components` returns no files -- ROADMAP Phase 09 success criterion 1 for the type sweep is met
- Both `node scripts/codemods/text-sizes.mjs app --dry-run` and `node scripts/codemods/text-sizes.mjs components --dry-run` report `TOTAL: 0 rewrite(s)`, confirming the codemod's own idempotence across the entire tree
- Full CI gate (typecheck, lint, `--maxWorkers=2` full test suite) green after all three commits: 66 test files, 1193 tests, 0 lint errors, 397 pre-existing warnings unchanged

## Task Commits

Each completed task was committed atomically:

1. **Task 1: Sweep app/components excluding landing/** - `aa6a57c4` (feat)
2. **Task 2: Sweep app/components/landing and the public pages, including the sacred hero** - `57ba7d37` (feat)
3. **Task 3: Sweep components/ and take the type ceiling to zero** - `2cadbf02` (feat)

**Plan metadata:** committed alongside this SUMMARY (see the docs commit immediately following).

## Files Created/Modified

**Task 1 (28 files):**
- `app/components/{BattlenetCharacterPickerModal,BisImportModal,CharacterCard,CharacterSelector,ClassPrioritySubline,CreateCharacterModal,CreateGuildModal,EditCharacterModal,FeedbackModal,GuardianConversionModal,JoinGuildModal,LoginPage,LootListSummaryView,MultiSelectDropdown,Navigation,OnboardingModal,PremiumItemTooltip,PrioListItemModal,ReserveItemPicker,ScoreBreakdownModal,ScoreComparisonModal,SearchableItemSelect,Sidebar,StyledSelect,ThemeSelector,UpgradeModal,WelcomeScreen,WowSimsImportModal}.tsx`
- `__tests__/arbitrary-text-sizes.test.ts` - ceiling 423 -> 210

**Task 2 (19 files):**
- `app/components/landing/{LandingCompare,LandingCTA,LandingFeatures,LandingHero,LandingHowItWorks,LandingLootDecision,LandingNav,LandingValueProps,ParallaxItem,PremiumFeatures,PremiumHero,PremiumPricing}.tsx`
- `app/pricing/page.tsx`, `app/about/page.tsx`, `app/changelog/page.tsx`, `app/blog/page.tsx`, `app/global-error.tsx`
- `app/reserve/join/[token]/page.tsx`, `app/reserve/join/[token]/components/InlineSettingsEditor.tsx`
- `__tests__/arbitrary-text-sizes.test.ts` - ceiling 210 -> 73

**Task 3 (11 files):**
- `components/profile/profile-stats.tsx`, `components/ui/{classification-badge,date-picker,date-time-picker,info-tooltip,input,modal,searchable-dropdown,segmented-control,select,textarea}.tsx`
- `__tests__/arbitrary-text-sizes.test.ts` - `ARBITRARY_TEXT_SIZE_CEILING` removed, assertion closed to `toHaveLength(0)`, header comment updated to describe a closed guard

## Decisions Made

- `text-sizes.mjs` takes a single path argument with no subtree-exclusion flag, so Task 1 applied it to the whole `app/components` directory and then reverted the landing subtree with `git checkout --` before staging, rather than adding a new flag to the committed script for one batch boundary. The resulting commit contains zero files under `app/components/landing/`.
- Every batch's live matching-line and occurrence count matched the plan's plan-time table exactly (213/214, 137/168, 73/81) -- no reconciliation was needed across any of the three tasks, continuing 09-03's pattern.
- Task 2's pre-apply mapping assertion (every display value 28 through 80 maps to its own identical-pixel alias) was re-run live via `node` against `text-size-map.json` immediately before applying the codemod, per the plan's explicit instruction to verify rather than trust the mapping table's prior verification.
- Task 3's ratchet closure followed the plan's fail-first-proof instruction literally: a temporary `text-[13px]` marker appended to `Navigation.tsx` made the guard fail naming `Navigation.tsx:217` exactly; removing the marker restored a clean pass. This proves the closed `toHaveLength(0)` assertion is non-vacuous rather than merely inspected.

## Deviations from Plan

None - all three tasks executed exactly as written. Every acceptance criterion in `09-04-PLAN.md` for all three tasks was checked directly (grep scans, ceiling arithmetic, mapping-table identity checks, scoped `git diff` review, idempotence re-runs, the fail-first proof) and passed without needing a codemod fix, a mapping-table addition, or a hand-patched site. No `SKIPPED` entry appeared in any dry-run report.

## Issues Encountered

None. All three batches' dry-run reports matched the plan's plan-time table exactly on the first attempt (file counts, matching-line counts, and pixel values present all matched); no unmapped pixel value and no out-of-scope file appeared in any report.

## User Setup Required

None. This plan carried no checkpoint of its own (all three tasks are `type="auto"`); the phase's single blocking checkpoint (09-02 Task 3) was already answered before 09-03 started.

## Next Phase Readiness

Plan 09-04 is complete. Every file under `app/` and `components/` now sizes its text through the type scale; `ARBITRARY_TEXT_SIZE_CEILING` is gone and `__tests__/arbitrary-text-sizes.test.ts` asserts a plain zero-match, matching the shape `__tests__/type-scale-floor.test.ts`'s existing guards use. TYPE-03 is fully shipped. The card sweep (PRIM-01, 09-05/09-06) may proceed independently; it does not depend on this plan beyond the shared guard-test file convention. One item remains open from Task 2's `<verify>` block: the literal side-by-side pixel comparison of the landing hero and the `/pricing`/`/about` copy check against the committed pre-phase-09 baseline images was not performed directly in this plan (no dev server was started; the pre-apply mapping-table identity assertion and the scoped `git diff` review are the automated proof this plan's `type="auto"` tasks carry). This is routed to the end-of-phase screenshot/UAT gate (09-08) by name, following the same pattern 09-02/09-03 used for the D-04 line-height tightening and the Home-only baseline limitation -- it does not block this plan's completion since no checkpoint task required it here. WINDOWS.md entry 11 (the 09-02 card-guard reconciliation flag) remains open for 09-05/09-06, unaffected by this plan.

## Self-Check: PASSED

`grep -rlE 'text-\[[0-9]+px\]' app components` confirmed empty (exit 1, no matches). `node scripts/codemods/text-sizes.mjs app --dry-run` and `node scripts/codemods/text-sizes.mjs components --dry-run` both confirmed `TOTAL: 0 rewrite(s)`. `grep -c 'text-24' app/components/PremiumItemTooltip.tsx` confirmed 1. `grep -c 'text-18' app/components/landing/LandingLootDecision.tsx` confirmed 1. Both `text-17` and `text-22` confirmed absent from `tailwind.config.js`'s `fontSize` map. All three commit hashes (`aa6a57c4`, `57ba7d37`, `2cadbf02`) confirmed present via `git log --oneline`. `__tests__/arbitrary-text-sizes.test.ts` confirmed on disk with no `ARBITRARY_TEXT_SIZE_CEILING` string and a `toHaveLength(0)` primary assertion. Full test suite (`npx vitest run --maxWorkers=2`) confirmed green at 1193/1193 after the final commit.

---
*Phase: 09-type-and-card-migration*
*Completed: 2026-09-19*
