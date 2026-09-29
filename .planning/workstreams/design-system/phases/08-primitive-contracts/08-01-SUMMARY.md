---
phase: 08-primitive-contracts
plan: 01
subsystem: planning
tags: [design-system, decisions-gate, accessibility, contrast, tailwind]

# Dependency graph
requires:
  - phase: 07-token-foundation
    provides: contrast test utility (__tests__/design-tokens/contrast.ts), --ring token values, Phase 07 baseline capture (2026-09-16-post-phase-07)
provides:
  - "Re-measured live inventory: 61 label call sites across 10 files (55 LabelText + 2 .section-label + 4 Sidebar.tsx), superseding CONTEXT.md's stale 8-site/4-file estimate"
  - "Measured --ring contrast numbers (dark and light) against page, modal surface, and card, computed via the repo's own contrast.ts utility"
  - "Before-baseline determination for Phase 08 (2026-09-16-post-phase-07, justified by an empty git log over the in-scope files)"
  - "User's recorded GO-AHEAD and verbatim resolution of all seven open items (OI-1 through OI-7), including an explicit user-facing copy sign-off for four Sidebar.tsx strings"
affects: [08-02, 08-03, 08-04, 08-05, 08-06, phase-09, phase-10, phase-12]

# Actuals (#2632)
actuals:
  tokens: 3836
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Phase-gate pattern: re-measure scope live (never quote RESEARCH.md/CONTEXT.md numbers), present corrected scope plus named open items, block on an explicit recorded go-ahead before any source edit."

key-files:
  created:
    - .planning/workstreams/design-system/phases/08-primitive-contracts/08-DECISIONS.md
  modified:
    - .planning/workstreams/design-system/STATE.md

key-decisions:
  - "OI-1: keep the corrected 61-site label scope inside Phase 08 with the planned batching (production sites separate from the docs page)."
  - "OI-2: use the fully-prefixed focus-ring string (all four focus-visible: utilities), not D-06's abbreviated draft; leave Input/Textarea/Select's existing focus:outline-none unchanged (minimal-diff)."
  - "OI-3: accept and record the light-mode --ring contrast shortfall (2.913 vs page, 2.726 vs modal surface, both below 3:1) rather than expanding scope to move the token; carried forward as a named finding."
  - "OI-4: migrate AND recase Sidebar.tsx's four hand-rolled label strings (GUILD->Guild, GUILDS->Guilds, CHARACTER->Character, ADMIN SETTINGS->Admin settings) -- an explicit, named user-facing copy sign-off granted by Alexander Mayes, an exception to the milestone's no-copy-change constraint."
  - "OI-5: approved 'Upgrade to LootList+ Pro' as UpgradeModal's visually-hidden ModalTitle text; accepted OnboardingModal's heading picking up text-balance as a side effect."
  - "OI-6: raid-tracking legend skeleton always renders exactly 5 placeholders, never speculating the conditional sixth signup indicator."
  - "OI-7: as=\"span\" at all 55 former LabelText sites; default p left at .section-label and Sidebar sites."

patterns-established:
  - "Decisions-gate document (08-DECISIONS.md) as the single authoritative source every later plan in the phase reads before its first edit, rather than re-deriving scope from CONTEXT.md/RESEARCH.md."

requirements-completed: [TYPE-02, PRIM-02, PRIM-03, PRIM-04, PRIM-05]

coverage:
  - id: D1
    description: "Live re-measured inventory (61 call sites across 10 files) and measured --ring contrast numbers recorded in 08-DECISIONS.md, superseding stale CONTEXT.md/RESEARCH.md figures"
    verification:
      - kind: other
        ref: "grep -roh '[<]LabelText' app components | wc -l -> 55; grep -cE '^\\| ring vs (page|modal surface|card) ' 08-DECISIONS.md -> 3"
        status: pass
    human_judgment: false
  - id: D2
    description: "User's GO-AHEAD and all seven OI-1..OI-7 resolutions recorded verbatim in 08-DECISIONS.md before any source file in app/ or components/ was edited"
    verification:
      - kind: other
        ref: "grep -cE '^\\*\\*Resolution:\\*\\* pending' 08-DECISIONS.md -> 0; grep -cE '^\\*\\*Resolution:\\*\\*' -> 7; grep -q '^## GO-AHEAD'; grep -c '\\[Phase 08\\]: OI-' STATE.md -> 7"
        status: pass
    human_judgment: false

duration: 8min (across two executor sessions, separated by the blocking-human checkpoint)
completed: 2026-09-17
status: complete
---

# Phase 08 Plan 01: Primitive Contracts Decisions Gate Summary

**Re-measured Phase 08's real scope live (61 label call sites, not 8; measured --ring contrast numbers, not asserted ones), then recorded the user's go-ahead and all seven open-item resolutions verbatim in 08-DECISIONS.md, including an explicit copy sign-off for four Sidebar.tsx strings, before any source file was touched.**

## Performance

- **Duration:** 8 min of active execution across two sessions, separated by the blocking-human checkpoint (Task 2) while the user reviewed the corrected scope
- **Started:** 2026-09-17T19:47:32Z (Task 1 commit)
- **Completed:** 2026-09-17T19:55:58Z (Task 3 commit)
- **Tasks:** 3/3 (Task 1 auto, Task 2 checkpoint:decision, Task 3 auto)
- **Files modified:** 2 (08-DECISIONS.md created; STATE.md modified)

## Accomplishments
- Ran live greps against the working tree and recorded a corrected inventory of 61 label call sites across 10 files (55 `LabelText` JSX sites in 8 files, 2 `.section-label` sites, 4 hand-rolled `Sidebar.tsx` sites), superseding CONTEXT.md's stale "8 sites in 4 files" estimate.
- Computed six `--ring` contrast ratios (dark/light against page, modal surface, card) via the repo's own `__tests__/design-tokens/contrast.ts` utility and recorded them to three decimals, correctly identifying the light-mode shortfall against page (2.913) and modal surface (2.726).
- Determined the phase-08 before-baseline via an empty-git-log check over all in-scope files, reusing the post-phase-07 baseline rather than a redundant capture.
- Presented the corrected scope and seven open items to the user at a `checkpoint:decision` gate; the user answered "approve-defaults" with explicit branch/wording answers for OI-4 and OI-5.
- Recorded the user's GO-AHEAD (date, approver, exact scope, verbatim approval message, and an explicit copy-sign-off table for the four Sidebar.tsx strings) and all seven `**Resolution:**` lines in `08-DECISIONS.md`, then appended eight matching entries to `STATE.md`'s `## Decisions` section.

## Task Commits

Each task was committed atomically:

1. **Task 1: Re-measure the phase-08 inventory and the --ring contrast numbers from the live codebase** - `52018f1c` (docs)
2. **Task 2: checkpoint:decision (gate="blocking-human")** - no commit (blocking checkpoint; user answered via the orchestrator's interactive question tool)
3. **Task 3: Record the go-ahead and every open-item resolution verbatim, then commit the gate** - `0f5ccb71` (docs)

_Note: this plan produces no source change anywhere in `app/` or `components/`; both commits touch only `.planning/`._

## Files Created/Modified
- `.planning/workstreams/design-system/phases/08-primitive-contracts/08-DECISIONS.md` - Created in Task 1 with the re-measured inventory, measured contrast table, and before-baseline determination; completed in Task 3 with the `## GO-AHEAD` section and all seven resolved open items.
- `.planning/workstreams/design-system/STATE.md` - Appended eight `[Phase 08]` decision entries (one GO-AHEAD summary plus OI-1 through OI-7) to the `## Decisions` section, matching the Phase 07 entry format.

## Decisions Made
See `key-decisions` in frontmatter above (OI-1 through OI-7) and the full verbatim resolutions in `08-DECISIONS.md`. Most notable: OI-4 resolved to branch (b) — an explicit, named user-facing copy sign-off for four `Sidebar.tsx` strings (`GUILD`->`Guild`, `GUILDS`->`Guilds`, `CHARACTER`->`Character`, `ADMIN SETTINGS`->`Admin settings`), which is a deliberate, recorded exception to the milestone's Standing Constraint 1 ("no user-facing copy changes"), scoped to only these four strings and authorized specifically for plan 08-06's Task 3.

## Deviations from Plan

None - plan executed exactly as written. Task 3 filled all seven `Resolution:` lines with the checkpoint resolutions supplied verbatim by the orchestrator (the user's actual answers, delivered via the interactive question tool rather than this conversation), added the `## GO-AHEAD` section per the plan's own instruction (including the mandatory OI-4 branch-(b) copy-sign-off line naming all four strings' before/after values), and appended the STATE.md decision entries in the Phase 07 format.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
Every later plan in Phase 08 (08-02 through 08-06) can now read `08-DECISIONS.md` for an authoritative, resolved answer to OI-1 through OI-7 before its first source edit, satisfying ROADMAP hard constraint 2. No blockers. Plan 08-04's Modal work is next per the batching order the GO-AHEAD approved (Modal first, then focus rings/skeletons/production label sites, then docs page and primitive deletion, then close-out evidence).

---
*Phase: 08-primitive-contracts*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: `.planning/workstreams/design-system/phases/08-primitive-contracts/08-DECISIONS.md`
- FOUND: `.planning/workstreams/design-system/phases/08-primitive-contracts/08-01-SUMMARY.md`
- FOUND: commit `52018f1c` (Task 1)
- FOUND: commit `0f5ccb71` (Task 3)
