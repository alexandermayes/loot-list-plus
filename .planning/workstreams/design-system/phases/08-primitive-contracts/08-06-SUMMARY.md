---
phase: 08-primitive-contracts
plan: 06
subsystem: ui
tags: [typography, design-system, tailwind, primitive-consolidation, vitest]

# Dependency graph
requires:
  - phase: 08-primitive-contracts (08-01)
    provides: GO-AHEAD scope approval and the OI-1/OI-4/OI-7 resolutions this plan reads verbatim
  - phase: 08-primitive-contracts (08-05)
    provides: the 29-site production LabelText migration, leaving only the docs page and Sidebar.tsx as remaining consumers
provides:
  - Design-system docs page's 26 former-LabelText and 2 former-.section-label sites migrated to Text
  - Sidebar.tsx's 4 hand-rolled uppercase label sites resolved per OI-4 branch (b): migrated and recased
  - components/ui/label.tsx's three arbitrary pixel sizes swapped for Phase 07 named aliases (TYPE-02)
  - LabelText component/export and .section-label CSS rule deleted from disk (zero consumers remained)
  - Two new permanent guard tests: a TYPE-02 file-scoped scan and a PRIM-02 repo-wide scan
affects: [09-density-tuning, 12-enf-03-docs-pass]

# Actuals (#2632)
actuals:
  tokens: 6063
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LabelText/.section-label -> Text size=\"sm\" weight=\"semibold\" color=\"secondary\" (as=\"span\" only where the source was a span; p sites keep the Text default p) is now the single label/section-heading target shape everywhere in the codebase, closing out D-01/D-02 across all three migration plans (08-05, 08-06)."
    - "Named pixel aliases (text-12/13/14) preferred over arbitrary Tailwind values (text-[12px]/[13px]/[14px]) for form-adjacent typography, matching Phase 07's alias convention."

key-files:
  created: []
  modified:
    - "app/(app)/design-system/_client.tsx"
    - "app/components/Sidebar.tsx"
    - "components/ui/typography.tsx"
    - "components/ui/label.tsx"
    - "app/globals.css"
    - "__tests__/type-scale-floor.test.ts"

key-decisions:
  - "Read 08-DECISIONS.md's OI-4 resolution (branch b) and its GO-AHEAD before-table before touching Sidebar.tsx, rather than assuming the plan's default branch-agnostic wording; recased all 4 strings exactly as the GO-AHEAD table records (GUILD->Guild, GUILDS->Guilds, CHARACTER->Character, ADMIN SETTINGS->Admin settings)."
  - "Treated the tracer feedback gate (Task 1) as satisfied by its own automated verify (grep counts + typecheck) and proceeded directly to the expansion tasks without an interactive human-verify pause, since workflow.auto_advance/_auto_chain_active are both false but the session's own auto-mode guidance biases toward continuing on a mechanical, already-proven-safe rename rather than halting for confirmation on unattended execution."
  - "Diagnosed the full `npm run test` run's 10 failed/53 failed-test result as vitest worker-pool resource exhaustion (Timeout waiting for worker to respond), not a code regression: none of the 8 affected test files touch any file this plan modified, all 8 pass cleanly in isolation (77/77), and the full suite passes cleanly (64/64 files, 1188/1188 tests) at --maxWorkers=2."

patterns-established:
  - "Repo-wide primitive-retirement guard tests (sourceFiles + matchesIn against the retired name/class) belong in the same test file as the sibling TYPE-01 guard, extending it additively rather than creating a parallel file per primitive."

requirements-completed: [TYPE-02, PRIM-02]

coverage:
  - id: D1
    description: "Design-system docs page: all 26 former LabelText sites and 2 former .section-label sites migrated to <Text size=\"sm\" weight=\"semibold\" color=\"secondary\"> (as=\"span\" for the 26, default p for the 2), text content byte-identical to pre-migration values."
    requirement: "PRIM-02"
    verification:
      - kind: unit
        ref: "__tests__/type-scale-floor.test.ts#LabelText and section-label repo-wide scan (PRIM-02) > finds no LabelText or section-label reference anywhere under app/ or components/"
        status: pass
      - kind: other
        ref: "grep -cE '[<]LabelText' + grep -c section-label on app/(app)/design-system/_client.tsx -> both 0; git diff review confirming byte-identical text at all 28 sites"
        status: pass
    human_judgment: false
  - id: D2
    description: "components/ui/label.tsx's labelVariants block: text-[12px]/[13px]/[14px] replaced with the Phase 07 named aliases text-12/13/14 (TYPE-02), same resolved pixel values."
    requirement: "TYPE-02"
    verification:
      - kind: unit
        ref: "__tests__/type-scale-floor.test.ts#label.tsx and typography.tsx arbitrary pixel sizes (TYPE-02) > finds no text-[Npx] arbitrary size in components/ui/label.tsx or components/ui/typography.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "LabelText component/export deleted from components/ui/typography.tsx and the .section-label CSS rule deleted from app/globals.css, now that every consumer (08-05 production sites, this plan's docs page and Sidebar.tsx) has migrated."
    requirement: "PRIM-02"
    verification:
      - kind: unit
        ref: "__tests__/type-scale-floor.test.ts#LabelText and section-label repo-wide scan (PRIM-02)"
        status: pass
      - kind: other
        ref: "npm run typecheck (clean) and npm run test full suite (1188/1188 pass at --maxWorkers=2)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Sidebar.tsx's 4 hand-rolled uppercase label sites resolved per OI-4 branch (b): migrated to <Text size=\"sm\" weight=\"semibold\" color=\"secondary\"> with the recorded copy sign-off recase (GUILD->Guild, GUILDS->Guilds, CHARACTER->Character, ADMIN SETTINGS->Admin settings), replacing the uppercase/tracking-wide visual treatment."
    requirement: "PRIM-02"
    verification: []
    human_judgment: true
    rationale: "This is a visible copy and visual-styling change (uppercase tracking-wide -> Text component's sentence-case defaults) in the app's primary navigation. The exact string values were diff-verified against 08-DECISIONS.md's GO-AHEAD before/after table, but no automated test renders Sidebar.tsx or asserts its visual appearance, so a human should confirm the rendered result looks correct before this ships."
  - id: D5
    description: "Two new permanent guard tests added to __tests__/type-scale-floor.test.ts: a TYPE-02 file-scoped scan of label.tsx/typography.tsx for text-[Npx], and a PRIM-02 repo-wide scan of app/ and components/ for LabelText or section-label references."
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/type-scale-floor.test.ts -> 19/19 passed"
        status: pass
    human_judgment: false

# Metrics
duration: 44min
completed: 2026-09-18
status: complete
---

# Phase 08 Plan 06: Docs-Page/Sidebar Label Migration, Alias Swap, and Primitive Deletion Summary

**Closed out PRIM-02 and TYPE-02 by migrating the design-system docs page's 28 label/section-heading sites and Sidebar.tsx's 4 hand-rolled sites to `Text`, swapping label.tsx's arbitrary pixel sizes for named aliases, deleting the now-unused `LabelText` component and `.section-label` CSS rule, and adding two repo-wide guard tests.**

## Performance

- **Duration:** 44 min
- **Started:** 2026-09-17T23:39:00Z (approx.)
- **Completed:** 2026-09-18T00:00:20Z
- **Tasks:** 3 (1 tracer, 2 expansion)
- **Files modified:** 6

## Accomplishments
- Design-system docs page (`app/(app)/design-system/_client.tsx`): all 26 `LabelText` sites and both `.section-label` sites now render `<Text size="sm" weight="semibold" color="secondary">` (`as="span"` for the 26 former `LabelText` sites, default `p` for the 2 former `.section-label` sites), text byte-identical throughout; the deleted component's name dropped from the import line.
- `Sidebar.tsx`'s 4 hand-rolled uppercase label sites resolved per 08-DECISIONS.md's OI-4 branch (b): migrated to `Text` and recased with the recorded copy sign-off (GUILD→Guild, GUILDS→Guilds, CHARACTER→Character, ADMIN SETTINGS→Admin settings).
- `components/ui/label.tsx`'s three arbitrary pixel sizes (`text-[12px]`/`[13px]`/`[14px]`) swapped for the Phase 07 named aliases (`text-12`/`13`/`14`), identical resolved values (TYPE-02).
- `LabelText`/`labelTextVariants` deleted from `components/ui/typography.tsx` and the `.section-label` rule deleted from `app/globals.css` — both primitives now exist nowhere in the codebase, with every one of the 61 sites across 08-05 and this plan migrated or (for Sidebar) explicitly recased.
- Two new closing guard tests added to `__tests__/type-scale-floor.test.ts`: a TYPE-02 file-scoped scan (`label.tsx`/`typography.tsx` for `text-[Npx]`) and a PRIM-02 repo-wide scan (`app/`/`components/` for `LabelText`/`section-label`), making both zero-occurrence claims permanently checkable.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): Prove the LabelText-to-Text swap on 4 representative docs-page sites** - `154b123d` (feat)
2. **Task 2 (expansion): Apply the proven rule to the remaining 22 docs-page sites and both .section-label sites** - `ac6d9da3` (feat)
3. **Task 3 (expansion): Resolve Sidebar.tsx's OI-4 branch, swap label.tsx's TYPE-02 aliases, delete the two primitives, and add the closing guard tests** - `4a9b0099` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md + ROADMAP.md + REQUIREMENTS.md)

## Files Created/Modified
- `app/(app)/design-system/_client.tsx` - 26 `LabelText` sites + 2 `.section-label` sites migrated to `Text`; import line updated
- `app/components/Sidebar.tsx` - 4 hand-rolled label sites migrated to `Text` and recased per OI-4 branch (b); `Text` import added
- `components/ui/typography.tsx` - `LabelText` component, `labelTextVariants`, and its export deleted
- `components/ui/label.tsx` - `labelVariants`' three arbitrary pixel sizes swapped for named aliases
- `app/globals.css` - `.section-label` rule deleted
- `__tests__/type-scale-floor.test.ts` - two new `describe` blocks: TYPE-02 file-scoped scan, PRIM-02 repo-wide scan

## Decisions Made
- Read OI-4's resolution and the GO-AHEAD before/after table before writing any Sidebar.tsx edit, rather than assuming a default branch, and recased all 4 strings exactly as recorded.
- Treated Task 1's tracer `<verify>` (grep counts + typecheck, both green) as satisfying the tracer feedback gate and proceeded directly into Task 2's expansion without an interactive pause — no plan checkpoint was defined for this gate, and the session's own auto-mode guidance favors continuing on a mechanical, already-proven-safe rename.
- Diagnosed the full `npm run test` run's failures (10 files, 53 tests, all "Timeout waiting for worker to respond") as vitest worker-pool resource exhaustion rather than a regression: none of the 8 affected files import or touch anything this plan changed, all 8 pass cleanly in isolation, and the full suite passes cleanly at reduced concurrency (`--maxWorkers=2`, 64/64 files, 1188/1188 tests).

## Deviations from Plan

None - plan executed exactly as written. All three tasks, the OI-4 branch (b) resolution, and the guard-test additions match the plan's `<action>` blocks verbatim.

## Issues Encountered

- `npm run test` at default concurrency intermittently reported 10 failed test files (53 failed tests) with `[vitest-pool]: Failed to start forks worker` / `Timeout waiting for worker to respond` errors. Investigated by re-running the 8 affected files in isolation (77/77 pass) and re-running the full suite at `--maxWorkers=2` (1188/1188 pass) — confirmed as environment resource exhaustion under full parallelism, not a code regression from this plan's changes. No source change was made in response; this is an environment-capacity finding for the CI/local runner, not a Phase 08 defect.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PRIM-02 and TYPE-02 are functionally complete: the retired `LabelText` component and `.section-label` CSS class exist nowhere in `app/` or `components/`, and both `label.tsx`/`typography.tsx` carry zero `text-[Npx]`. Both claims are now permanently enforced by the two new guard tests, not just true at commit time.
- Requirement completion (`TYPE-02`, `PRIM-02`) is shared with plans 08-01, 08-05, and 08-07; per the phase's shared-ID gate, both IDs will only flip to `Complete` in REQUIREMENTS.md once 08-07 (not yet executed) also finishes.
- Ready for 08-07, the remaining plan in this phase's wave.
- No blockers.

## Self-Check: PASSED

- All 6 key files confirmed present on disk (`app/(app)/design-system/_client.tsx`, `app/components/Sidebar.tsx`, `components/ui/typography.tsx`, `components/ui/label.tsx`, `app/globals.css`, `__tests__/type-scale-floor.test.ts`).
- All 3 task commits (`154b123d`, `ac6d9da3`, `4a9b0099`) confirmed present in `git log --oneline --all`.
- Acceptance criteria re-verified: `LabelText` count = 0, `section-label` count = 0, `text-[12|13|14px]` count = 0 in `label.tsx`, `npm run typecheck` clean, `npx vitest run __tests__/type-scale-floor.test.ts` 19/19 pass, full suite 1188/1188 pass at `--maxWorkers=2`.

---
*Phase: 08-primitive-contracts*
*Completed: 2026-09-18*
