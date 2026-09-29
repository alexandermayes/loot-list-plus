---
phase: 09-type-and-card-migration
plan: 08
subsystem: ui
tags: [vitest, puppeteer, visual-regression, evidence, broken-windows-ledger]

requires:
  - phase: 09-type-and-card-migration
    provides: "09-01 through 09-07's committed codemods, closed guards (arbitrary-text-sizes.test.ts, hand-rolled-cards.test.ts), the Card primitive's rounded-xl base radius and nested variant, the 09-02 before-capture and its D-17 Home-only fallback (WINDOWS.md entry 10)"
provides:
  - "A symmetric after-capture at .planning/workstreams/design-system/baselines/2026-09-19-post-phase-09/ (4 images, Home-only, matching the before-capture's fallback exactly), all four image pairs confirmed byte-identical via md5"
  - "WINDOWS.md entry 13 naming the after-capture's own Home-only limitation, mirroring the Phase 07/08 precedent (entries 6 and 9) for a post-phase baseline that cannot verify authenticated-screen behavior"
  - "09-EVIDENCE.md: Phase 09's closing evidence record, answering all five ROADMAP success criteria with command output run this session, carrying forward every unfixed finding with a named destination, and recording all three measured discrepancies as deltas"
affects: [10-colour-literal-migration, 12-enforcement-and-docs]

actuals:
  tokens: 6858
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A Home-only fallback capture is verified for symmetry by md5 comparison of every image pair, not just a visual glance, before concluding the unintended-and-unexplained bucket is empty"
    - "A second unrun-verify WINDOWS.md entry (mirroring the before-capture's own entry) is recorded for the after-capture's identical limitation, rather than assuming the earlier entry already covers a capture that did not exist yet when it was written"

key-files:
  created:
    - .planning/workstreams/design-system/baselines/2026-09-19-post-phase-09/
    - .planning/workstreams/design-system/phases/09-type-and-card-migration/09-EVIDENCE.md
  modified:
    - .planning/WINDOWS.md

key-decisions:
  - "Re-checked the D-17 precondition read-only this session (GET /api/dev/test-users against the already-running local dev server) rather than assuming the 09-02 result still held; it still returns 404, confirming npm run test:users:create has not been run in the user's own shell since the before-capture. The after-capture therefore falls back to Home-only, symmetric with the before-capture, per the plan's own instruction to follow the fallback rather than attempt to create test users or touch SUPABASE_SERVICE_ROLE_KEY."
  - "Added .planning/WINDOWS.md entry 13 as a new, distinct entry rather than treating entry 10 as already covering the after-capture: entry 10 was recorded when only the before-capture existed and named that specific directory; entry 13 names the after-capture's own directory and its own symmetric limitation, following the exact precedent Phase 07 (entries 4-6) and Phase 08 (entries 7-9) set of a dedicated baseline-scope entry alongside the feature-specific unrun-verify entries."
  - "Ran fresh both-ways fail-first proofs for both guards this session (a scratch text-[13px] site and a scratch bg-background-elevated/border/border-border/rounded-lg site, each caught by name and line, then deleted) rather than citing only the 09-06 historical proof, so 09-EVIDENCE.md's criterion-2 answer is itself a command actually run this session, not a copied claim."
  - "Independently re-confirmed the display-alias discrepancy (44 discussed vs 49 accepted) live this session via a per-alias grep sum across all eight display aliases, rather than citing only 09-02's checkpoint table -- the live count reproduces 49 exactly, so this discrepancy is doubly verified: once by the checkpoint's committed-script measurement, once by this session's independent re-measurement."

requirements-completed: [TYPE-03, PRIM-01]

coverage:
  - id: D1
    description: "A symmetric after-capture is taken (D-17 fallback: Home-only, 4 images) and confirmed image-for-image identical to the before-capture (byte-for-byte via md5 on all four pairs), closing what the screenshot gate can close for Home while explicitly not claiming coverage of the three authenticated screens"
    requirement: PRIM-01
    verification:
      - kind: other
        ref: "node -e capture-set-symmetry check -> 'ok [ post-phase-09, pre-phase-09 ]'; md5 comparison of all four image pairs -> all four SAME; grep -c 'SERVICE_ROLE|service_role' manifest.json -> 0"
        status: pass
      - kind: manual_procedural
        ref: "The plan's own <human-check> (open the before/after directories side by side and confirm the four named accepted deltas plus the SettingsModal border-to-divider change) could not be run in full: the fallback captures Home only, and none of the four accepted-delta screens (guild-settings, loot-management chips/panels, SettingsModal) render in a Home-only capture."
        status: unknown
    human_judgment: true
    rationale: "Confirming there is truly nothing more to visually verify on Home (versus a difference merely being imperceptible) required looking at all four image pairs directly, and the gap this fallback leaves open (the three authenticated screens) is a judgment call about acceptable risk, not something an automated byte-comparison alone can close -- recorded in WINDOWS.md entry 13 and carried to end-of-phase UAT rather than assumed passing."
  - id: D2
    description: "09-EVIDENCE.md answers all five ROADMAP Phase 09 success criteria with verbatim command output run this session, extends the Phase 08 Guard inventory format, carries forward every unfixed finding with a named destination, and records the three measured discrepancies (13 vs 24/19/25, 44 vs 49, 227/73 vs 232/74) as deltas"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/arbitrary-text-sizes.test.ts __tests__/hand-rolled-cards.test.ts __tests__/type-scale-floor.test.ts components/ui/__tests__/card.test.tsx -> 4 files, 29 tests, all passing"
        status: pass
      - kind: other
        ref: "grep -q '## Guard inventory' -> found; grep -c 'arbitrary-text-sizes|hand-rolled-cards|card.test.tsx|type-scale-floor|nested-card-ancestry' -> 12 (>= 5 required); grep -c em-dash -> 0; npm run typecheck -> exit 0; npm run lint -> 0 errors/397 warnings"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 08: After-Capture, Screenshot Comparison, and Evidence Record Summary

**Took the after-capture (Home-only, symmetric with the before-capture under the still-unmet D-17 precondition), confirmed all four image pairs byte-identical, and wrote 09-EVIDENCE.md closing Phase 09 with command-verified answers to all five ROADMAP success criteria, three measured discrepancies stated as deltas, and every unfixed finding carried forward to milestone C, Phase 10 or Phase 12 by name.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-09-19T21:53:00Z (approx, immediately after 09-07's close, per STATE.md session continuity)
- **Completed:** 2026-09-19T22:15:00Z
- **Tasks:** 2 of 2 completed
- **Files modified:** 6 (4 PNGs + manifest.json created under the new baseline directory, 1 WINDOWS.md entry added, 1 new evidence document created)

## Accomplishments

- Ran `scripts/visual/baseline.mjs --label post-phase-09` against the already-running local dev server; re-checked the D-17 precondition read-only (`GET /api/dev/test-users` still returns 404) and confirmed the after-capture falls back to Home-only, symmetric with the before-capture's 4 images
- Verified the capture-set symmetry check (`node -e` image-list comparison) and, going further than the plan's own acceptance criteria required, confirmed all four image pairs are **byte-identical** via `md5`, proving the sacred hero H1 and the rest of Home render pixel-identical after the full type and card sweep
- Added `.planning/WINDOWS.md` entry 13, naming the after-capture's own Home-only limitation and its end-of-phase UAT destination, mirroring the Phase 07/08 precedent of a dedicated baseline-scope entry (entries 6 and 9)
- Ran fresh both-ways fail-first proofs for both closed guards this session (a scratch arbitrary-text-size site and a scratch hand-rolled-card site, each caught by name and line, then removed), rather than citing only the historical 09-06 proof
- Wrote `09-EVIDENCE.md`: five success-criteria rows each answered by a command run this session, an 11-item `## Carried forward` list with named destinations, a design-quality section handing Phase 12 the eight display steps/base radius/`nested` contract, a three-row measured-discrepancy table, and a `## Guard inventory` table naming every guard and script plus the command that reproduces each

## Task Commits

Each completed task was committed atomically:

1. **Task 1: Take the after-capture and compare it image for image against the before** - `63adc44f` (feat)
2. **Task 2: Write 09-EVIDENCE.md** - `3de5ff00` (docs)

**Plan metadata:** committed alongside this SUMMARY (see the docs commit immediately following).

## Files Created/Modified

- `.planning/workstreams/design-system/baselines/2026-09-19-post-phase-09/` - after-capture (Home-only fallback), 4 PNGs + `manifest.json`
- `.planning/WINDOWS.md` - entry 13, the after-capture's own D-17 fallback recorded as `unrun-verify`
- `.planning/workstreams/design-system/phases/09-type-and-card-migration/09-EVIDENCE.md` - Phase 09's closing evidence record

## Decisions Made

- Re-checked the D-17 precondition live this session rather than assuming the 09-02 result carried forward automatically; it is unchanged (still 404), so the after-capture takes the identical fallback path.
- Added a new, distinct WINDOWS.md entry (13) for the after-capture's limitation rather than treating entry 10 as already sufficient, since entry 10 was written before this capture existed and names only the before-capture's directory.
- Went beyond the plan's literal acceptance criteria (which only required the capture-set-symmetry `node -e` check) by also running an `md5` byte-comparison on every image pair, since a truly rigorous "unintended bucket is empty" claim for a Home-only comparison benefits from more than a visual read of four screenshots.
- Re-ran both guards' fail-first proofs live this session (rather than citing only 09-06's historical proof) so every claim in `09-EVIDENCE.md`'s criterion-2 row is a command this session actually ran, per the plan's own "every command the document cites, when re-run, produces the output the document records" acceptance criterion.

## Deviations from Plan

None - plan executed exactly as written. The one substantive addition beyond the plan's literal text (the `md5` byte-comparison, and re-running the fail-first proofs live rather than citing history) tightens the evidence record's rigor rather than changing its scope, and stays within Task 1/Task 2's own `<files>` lists.

## Issues Encountered

None. The D-17 precondition remains unmet (as it has since 09-02), which is the expected, already-documented fallback path, not a new problem.

## User Setup Required

None - the D-17 precondition (`npm run test:users:create` with `SUPABASE_SERVICE_ROLE_KEY` in the user's own shell) remains outstanding, exactly as it was at 09-02. The user may still run it in their own shell before the end-of-phase UAT walkthrough if they want the full authenticated visual comparison instead of relying on the UAT walkthrough alone.

## Next Phase Readiness

Phase 09 is complete: TYPE-03 and PRIM-01 are both fully shipped and evidenced. `09-EVIDENCE.md` hands Phase 10 the named destination for the 5 card-shaped `bg-background-inset` lines (COLOR-03) and the `DashboardContent.tsx:2365` list-of-item-cards site (left unscheduled, per 09-07's own checkpoint decision), and hands Phase 12 the eight display steps, the `rounded-xl` base radius, and the complete `nested` contract (including the first-child divider decision) in a `DESIGN.md`-ready shape. `.planning/WINDOWS.md` entries 10 and 13 (both `unrun-verify`, both open) and entries 4-9 from Phases 07/08 remain the standing end-of-phase UAT backlog before `/gsd-ship`.

## Self-Check: PASSED

`.planning/workstreams/design-system/baselines/2026-09-19-post-phase-09/manifest.json` and its 4 PNGs confirmed present on disk. `.planning/WINDOWS.md` entry 13 confirmed present (`open_count: 11`, `total_count: 13` in the ledger's own frontmatter after the append). `.planning/workstreams/design-system/phases/09-type-and-card-migration/09-EVIDENCE.md` confirmed present, containing `## Success criteria`, `## Carried forward` and `## Guard inventory`, zero em dashes. Both commit hashes (`63adc44f`, `3de5ff00`) confirmed present via `git log --oneline -3`. Full gate re-confirmed green after both commits: `npx vitest run --maxWorkers=2` (67/67 files, 1199/1199 tests), `npm run typecheck` (exit 0), `npm run lint` (0 errors, 397 pre-existing warnings, unchanged).

---
*Phase: 09-type-and-card-migration*
*Completed: 2026-09-19*
