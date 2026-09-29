---
phase: 08-primitive-contracts
plan: 02
subsystem: ui
tags: [accessibility, aria, modal, focus-trap, react, vitest]

# Dependency graph
requires:
  - phase: 08-primitive-contracts
    provides: 08-01's recorded GO-AHEAD (2026-09-17) and OI-5 resolution ("Upgrade to LootList+ Pro"), both gating this plan's first source edit
provides:
  - "components/ui/modal.tsx's Modal is a real ARIA dialog: role=\"dialog\", aria-modal=\"true\", an accessible name wired from ModalTitle through a new module-internal id-context, a hand-rolled focus trap with initial focus and Tab-wrap, focus return on close, and stacking-aware Escape handling that only the topmost simultaneously-open Modal installs (D-03/D-04)"
  - "JoinGuildModal, OnboardingModal and UpgradeModal each render a real ModalTitle now (D-05), giving all three an accessible name"
  - "components/ui/__tests__/modal.test.tsx (new test directory + file) proving the above with 6 passing vitest assertions"
affects: [08-07]

# Actuals (#2632)
actuals:
  tokens: 4518
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Module-scope subscribable registry (registerOpenModal/unregisterOpenModal/getTopmostModalId/subscribeToModalStack) consumed via React.useSyncExternalStore to let every open Modal instance know, without prop drilling, whether it is the topmost of several simultaneously-open instances."
    - "Context-based id hookup (ModalTitleContext, mirroring card.tsx's CardContext) so a compound component's subcomponent (ModalTitle) can self-assign a DOM id that a sibling ancestor attribute (aria-labelledby) points to, without the caller ever passing an id."

key-files:
  created:
    - components/ui/__tests__/modal.test.tsx
  modified:
    - components/ui/modal.tsx
    - app/components/JoinGuildModal.tsx
    - app/components/OnboardingModal.tsx
    - app/components/UpgradeModal.tsx

key-decisions:
  - "Read 08-DECISIONS.md's OI-5 resolution before touching UpgradeModal: used the recorded wording 'Upgrade to LootList+ Pro' verbatim rather than assuming the plan's own proposed default text."
  - "Focus-return test (Test 4) fixed to use waitFor instead of a synchronous assertion, because Modal's unmount (and the focus-restore cleanup tied to `mounted`) happens TRANSITION_MS (150ms) after `open` flips false, not synchronously with the close click — a test-authoring correction, not an implementation change."

patterns-established:
  - "Modal call sites needing a title no longer need to manage an id themselves — ModalTitle self-assigns from context unless an explicit id prop is passed."

requirements-completed: [PRIM-04]

coverage:
  - id: D1
    description: "Modal renders role=\"dialog\", aria-modal=\"true\", and aria-labelledby resolving to ModalTitle's own DOM id"
    requirement: PRIM-04
    verification:
      - kind: unit
        ref: "components/ui/__tests__/modal.test.tsx#renders as an ARIA dialog whose aria-labelledby resolves to the ModalTitle id"
        status: pass
    human_judgment: false
  - id: D2
    description: "Opening a Modal moves focus to the first focusable descendant automatically; Tab wraps from last to first and Shift+Tab wraps from first to last"
    requirement: PRIM-04
    verification:
      - kind: unit
        ref: "components/ui/__tests__/modal.test.tsx#moves focus to the first focusable descendant on mount, with no manual .focus() call"
        status: pass
      - kind: unit
        ref: "components/ui/__tests__/modal.test.tsx#Tab wraps forward from the last focusable element to the first, and Shift+Tab wraps backward"
        status: pass
    human_judgment: false
  - id: D3
    description: "Escape closes the topmost open Modal and calls its onClose; closing returns focus to whatever had focus before that Modal opened"
    requirement: PRIM-04
    verification:
      - kind: unit
        ref: "components/ui/__tests__/modal.test.tsx#pressing Escape while open calls onClose exactly once"
        status: pass
      - kind: unit
        ref: "components/ui/__tests__/modal.test.tsx#returns focus to the trigger button after closing"
        status: pass
    human_judgment: false
  - id: D4
    description: "When two Modals are open at once, exactly the topmost (higher zIndex) one traps focus and responds to Escape; both still carry static role=\"dialog\"/aria-modal semantics (D-04)"
    requirement: PRIM-04
    verification:
      - kind: unit
        ref: "components/ui/__tests__/modal.test.tsx#D-04: only the topmost of two simultaneously-open Modals traps focus and handles Escape"
        status: pass
    human_judgment: false
  - id: D5
    description: "JoinGuildModal, OnboardingModal and UpgradeModal each render a real ModalTitle (D-05), with no visible text content changed"
    requirement: PRIM-04
    verification:
      - kind: other
        ref: "grep -c 'ModalTitle className' app/components/{JoinGuildModal,OnboardingModal,UpgradeModal}.tsx -> 2/1/1; npm run typecheck -> pass"
        status: pass
    human_judgment: true
    rationale: "The grep/typecheck checks prove the elements exist and compile; whether each title reads correctly and looks visually unchanged in the running app (JoinGuildModal/OnboardingModal headings, UpgradeModal's sr-only text) still needs the phase-level manual click-through per 08-VALIDATION.md, deferred to the phase checkpoint before /gsd-verify-work."

# Metrics
duration: 25min
completed: 2026-09-17
status: complete
---

# Phase 08 Plan 02: Modal Accessibility Contract Summary

**Modal is now a real ARIA dialog — role/aria-modal/accessible-name/focus-trap/focus-return/stacking-aware Escape, hand-rolled with a module-scope stack registry and React.useSyncExternalStore, proven by 6 new vitest assertions; JoinGuildModal, OnboardingModal and UpgradeModal each gained a ModalTitle.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-17T19:58:00Z
- **Completed:** 2026-09-17T20:23:00Z
- **Tasks:** 3
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- `Modal` declares `role="dialog"`, `aria-modal="true"`, and an `aria-labelledby` that resolves to whichever `ModalTitle` is rendered inside it, via a new module-internal `ModalTitleContext` (mirrors `card.tsx`'s `CardContext` pattern)
- A hand-rolled focus trap: initial focus moves to the first focusable descendant on mount (or the container itself if there are none), and `Tab`/`Shift+Tab` wrap at both ends instead of escaping the dialog
- Focus returns to whatever had focus before a given `Modal` instance opened, once that instance unmounts — decoupled from topmost status so a second Modal stacking on top doesn't steal focus back prematurely
- A module-scope modal-stack registry (`registerOpenModal`, `unregisterOpenModal`, `getTopmostModalId`, `subscribeToModalStack`), consumed via `React.useSyncExternalStore`, so that when two or more Modals are open at once, exactly the topmost (highest `zIndex`) one installs the focus trap and responds to `Escape` (D-04) — every Modal beneath it stays inert for both
- `JoinGuildModal`, `OnboardingModal` and `UpgradeModal` each render a `ModalTitle` now: the first two convert existing headings (same text, same className), and `UpgradeModal` gains a new `sr-only` title reading "Upgrade to LootList+ Pro" per 08-DECISIONS.md's OI-5 resolution
- `components/ui/__tests__/modal.test.tsx` (new file, new directory) with 6 passing tests covering all of the above, including the two-Modal stacking case

## Task Commits

Each task was committed atomically, following RED/GREEN/expand for the tracer task:

1. **Task 1 (tracer, RED): add failing Modal dialog/focus tests** - `c8d6c755` (test)
2. **Task 1 (tracer, GREEN): wire Modal's dialog semantics, id-context, focus trap and stacking-aware Escape** - `196996f0` (feat)
3. **Task 2: give JoinGuildModal, OnboardingModal and UpgradeModal a real ModalTitle** - `2bf942f5` (feat)
4. **Task 3: expand modal.test.tsx with Tab-wrap and D-04 stacked-modal tests** - `81d579ae` (test)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `components/ui/__tests__/modal.test.tsx` - New vitest component test file (6 tests): dialog semantics, initial focus, Escape, focus-return, Tab-wrap, D-04 stacking
- `components/ui/modal.tsx` - `ModalTitleContext`, modal-stack registry functions, `ModalTitle`'s self-assigned id, `Modal`'s `titleId`/`containerRef`/`isTopmost`, registration/focus-capture/focus-trap effects, `isTopmost`-gated Escape effect, `role`/`aria-modal`/`aria-labelledby`/`tabIndex` on `ModalContainer`
- `app/components/JoinGuildModal.tsx` - Both view headings (`h3` -> `ModalTitle`, same text/className)
- `app/components/OnboardingModal.tsx` - Welcome heading (`h2` -> `ModalTitle`, same conditional text/className)
- `app/components/UpgradeModal.tsx` - New `ModalTitle className="sr-only"` reading "Upgrade to LootList+ Pro"

## Decisions Made

- Read 08-DECISIONS.md's OI-5 Resolution line before writing `UpgradeModal`'s title text, confirming it matched the plan's proposed default ("Upgrade to LootList+ Pro") rather than assuming it.
- Adjusted the focus-return test (Test 4) to `await waitFor(...)` instead of asserting synchronously, since `Modal`'s unmount — and the focus-restore cleanup tied to it — happens `TRANSITION_MS` (150ms) after `open` flips `false`, not immediately on click. This is a test-correctness fix discovered during the GREEN phase, not a change to the implementation the plan specified.

## Deviations from Plan

None - plan executed exactly as written. The one adjustment (test timing via `waitFor`) is documented above under Decisions Made since it corrects the test's async assumptions rather than deviating from the plan's specified implementation behavior.

## Issues Encountered

- One vitest run of the full suite under heavy concurrent load produced 15 failed test files with `[vitest-pool-runner]: Timeout waiting for worker to respond` errors — a resource-contention flake unrelated to this plan's changes (confirmed by stashing this plan's diff entirely and re-running: the same class of worker-timeout failures occurred against the unmodified baseline). Two subsequent clean, non-concurrent full-suite runs with this plan's changes applied passed 1179/1180 and then 1182/1182 respectively, with the one intermittent failure (an unrelated blog-links test) not related to Modal and not reproducing on the next run. Treated as environmental flakiness, not a regression.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `Modal`'s accessibility contract (role/aria-modal/accessible-name/focus-trap/focus-return/stacking-aware Escape) is now proven by an automated test, so later modal-touching plans in this milestone can trust the primitive instead of re-verifying it.
- PRIM-04 is declared by this plan, 08-01 (already summarized), and 08-07 (not yet run) — per the shared-ID gate, PRIM-04 in REQUIREMENTS.md stays open until 08-07 also finishes; that is expected, not a gap in this plan's work.
- The manual click-through of `JoinGuildModal`, `OnboardingModal` and `UpgradeModal` (per 08-VALIDATION.md's Manual-Only Verifications) is deferred to the phase-level checkpoint before `/gsd-verify-work`, as the plan's `<verification>` block specifies.
- Ready for 08-03 (input focus rings) and the remaining Phase 08 plans; no blockers.

---
*Phase: 08-primitive-contracts*
*Completed: 2026-09-17*

## Self-Check: PASSED

- All 6 files (5 key files + this SUMMARY) verified present on disk with `[ -f ]`.
- All 5 commits (`c8d6c755`, `196996f0`, `2bf942f5`, `81d579ae`, `d4bc2ad6`) verified present in `git log`.
- `npx vitest run components/ui/__tests__/modal.test.tsx` -> 6/6 pass.
- `npm run test` (full suite) -> 1182/1182 pass (clean run, no concurrent load).
- `npm run typecheck` -> pass, zero errors.
