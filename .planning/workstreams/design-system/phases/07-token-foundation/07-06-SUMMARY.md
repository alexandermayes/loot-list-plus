---
phase: 07-token-foundation
plan: 06
subsystem: design-system-tokens
tags: [puppeteer, visual-regression, wcag, contrast, design-tokens, evidence, close-out]

# Dependency graph
requires:
  - phase: 07-02
    provides: The committed pre-phase-07 before baseline (Home-only) and the visual:baseline capture script this plan reuses image for image
  - phase: 07-03
    provides: The 11px type floor, the zero sub-11px-literal guard, and the fixed report order this plan cites
  - phase: 07-04
    provides: The shared WCAG contrast library (contrast.ts), the runnable report.ts this plan extends and re-runs, and the muted/accent/ramp token values this plan records
  - phase: 07-05
    provides: The --standby token and the palette-literal guard whose real (non-absent) contrast numbers this plan's report run confirms
provides:
  - "A committed post-phase-07 visual baseline matching the pre-phase-07 set image for image (Home-only, overview symmetrically skipped in both manifests), proving the phase's appearance change is reviewable from the repository"
  - "07-EVIDENCE.md: the phase's token record, its contrast record in the committed generator's fixed order, the nine D-11 light-mode measurements, all five ROADMAP Phase 07 success criteria answered with command output or artifact paths, and seven carried-forward findings each with a number and a named destination phase"
  - "An additive extension to __tests__/design-tokens/report.ts (a second table for the four D-11 pairs the primary nine-row table did not cover) so no number in the evidence record was typed by hand"
affects: [phase-08-primitives, phase-09-type-card-migration, phase-10-color-migration, phase-12-design-md]

# Actuals (#2632) — pairs with the plan's `estimate` to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 6438
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive second table in a runnable report script, appended after the primary fixed-order table, so a plan that needs a row the report doesn't have yet extends the script rather than typing a number by hand or disturbing the primary table's citations"
    - "Reusing the committed contrast.ts library's exported hslToRgb/contrastRatio functions directly (not the fixed report script) to check a not-shipped alternative value (OI-2 Option B) against real surfaces, so even a road-not-taken number in a carried-forward record is computed, not estimated"

key-files:
  created:
    - .planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/README.md
    - .planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/manifest.json
    - .planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/home-light-1440.png
    - .planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/home-light-390.png
    - .planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/home-dark-1440.png
    - .planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/home-dark-390.png
    - .planning/workstreams/design-system/phases/07-token-foundation/07-EVIDENCE.md
  modified:
    - __tests__/design-tokens/report.ts

key-decisions:
  - "Did not restart the dev server before capturing the after baseline, contrary to the plan's own suggestion, because the orchestrator's explicit precondition constraint for this session forbids starting, stopping, or restarting it (it is owned by the orchestrator). Next.js dev HMR had already applied every committed globals.css/tailwind.config.js change live, and the captured post-phase-07 stylesheet is confirmed current by the manifest's differing git_sha (010babb3, after all five token-family commits, versus the before capture's 073c87fe)."
  - "Extended __tests__/design-tokens/report.ts additively (a second table, not a rewrite of the primary nine-row table) rather than typing the four D-11 pairs (muted/accent vs page and sidebar) by hand into 07-EVIDENCE.md, per the plan's own Rule 3 guidance: the committed report lacked rows the plan requires, and the prohibition against hand-typed contrast numbers applies to the whole evidence record, not only the primary contrast table."
  - "Independently reverified the OI-3 carried-forward numbers (4.360, 4.545) and the light-mode status-token text numbers (1.983, 2.298, 3.003) against the currently committed globals.css using contrast.ts's own ratio() function rather than copying them from 07-04-SUMMARY.md, confirming zero drift between the two before citing either."
  - "Computed the OI-2 Option B (not shipped) accent-text numbers using contrast.ts's exported hslToRgb/contrastRatio functions directly against the real light surfaces, so the carried-forward record's 'both options' numbers' requirement is met by computation, not by retrieving a number from 07-01-PLAN.md's prose."

requirements-completed: [TYPE-01, COLOR-01, COLOR-02, COLOR-06]

coverage:
  - id: D1
    description: "A post-phase-07 baseline directory exists, is committed, and matches the pre-phase-07 image set exactly (same file names, same origin_hostname, same image count, differing git_sha, overview symmetrically skipped in both manifests with the identical reason)"
    verification:
      - kind: other
        ref: "diff <(ls pre-phase-07/*.png | sort) <(ls post-phase-07/*.png | sort) -> no output; node -e manifest origin/count check -> ok; git log -1 --format=%s -> 'docs(07): capture post-phase-07 visual baseline'; grep -rl NEXT_PUBLIC_SUPABASE .planning/workstreams/design-system/baselines/ -> no matches"
        status: pass
    human_judgment: false
  - id: D2
    description: "07-EVIDENCE.md carries the token record, the contrast record (verbatim report.ts output, extended for the D-11 pairs it lacked, diffed against the 07-DECISIONS.md before table), the nine D-11 light-mode measurements, all five ROADMAP Phase 07 success criteria each answered with a command output or artifact path, seven carried-forward findings each with a number and a named destination phase, and a guard inventory naming all four committed test files and the palette guard's recorded scope limit"
    requirement: "TYPE-01, COLOR-01, COLOR-02, COLOR-06"
    verification:
      - kind: other
        ref: "grep for all six section headings -> found; grep -c 4.360 -> 1; grep for 4.910/4.360/4.545/1.079 -> all found; grep for all four guard test file paths -> all found; npx tsx __tests__/design-tokens/report.ts re-run -> rows match 07-EVIDENCE.md verbatim"
        status: pass
      - kind: unit
        ref: "npx vitest run __tests__/type-scale-floor.test.ts __tests__/token-contrast.test.ts __tests__/token-palette-literals.test.ts app/(app)/raid-tracking/components/__tests__/cell-state.test.ts (74/74 passing)"
        status: pass
      - kind: other
        ref: "npm run lint (0 errors, 397 pre-existing warnings), npm run typecheck (exit 0), npm run test (1176/1176 passing)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The phase's actual token changes read correctly on card-dense, authenticated screens: cards visibly read as cards, borders are visible, hovered rows read lighter than their card, standby reads as its own amber distinct from late-yellow and accent-orange, and nothing has become cramped or clipped by the 11px raise"
    verification: []
    human_judgment: true
    rationale: "The post-phase-07 baseline captured by this plan is Home-only (a marketing hero page with no cards, borders, hover surfaces, or standby chips in its visible viewport), because the D-16 fallback (loadtest/test-users.json absent, no service-role credential in scope) applies identically to both the before and after captures. The Home-to-Home comparison in this plan confirms no regression on that page (no layout shift, no clipped/wrapped text, no shrunk text — visually inspected in this plan), but it cannot itself resolve the card-lift, border-ramp, and standby visual judgments that WINDOWS.md entries 4 and 5 (from Plans 04 and 05) are already waiting on. Recorded as WINDOWS.md entry 6, all three routed to end-of-phase UAT per workflow.human_verify_mode=end-of-phase."

# Metrics
duration: 14min
completed: 2026-09-16
status: complete
---

# Phase 07 Plan 06: Close-Out Evidence Record Summary

**Captured a Home-only post-phase-07 visual baseline matching the pre-phase-07 set image for image, then wrote 07-EVIDENCE.md carrying the phase's full token record, a fixed-order contrast record (extended once, additively, to cover four D-11 pairs the committed report script lacked), all five ROADMAP success criteria answered with command output, and seven carried-forward findings each numbered and routed to a named later phase.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-09-16T19:26:00Z (approx)
- **Completed:** 2026-09-16T19:40:00Z (approx)
- **Tasks:** 2 (both complete)
- **Files modified:** 8 (7 created: 5 under the after-baseline directory, 1 README, 1 evidence file; 1 modified: report.ts)

## Accomplishments

- Asserted the dev-server precondition read-only (`curl` 200, zero `nextjs-portal` matches) and the pre-phase-07 baseline's presence, then ran `npm run visual:baseline -- --label post-phase-07` without restarting the orchestrator-owned dev server. The result matched the before set exactly: same four image names, same `origin_hostname: "localhost"`, differing `git_sha` (`010babb3` vs `073c87fe`), and `overview` symmetrically skipped in both manifests with the identical reason (`GET /api/dev/test-users returned 404`).
- Wrote a `README.md` inside the after directory naming the paired before directory, the bracketed commit range (`073c87fe..010babb3`, 15 commits), and the one-sentence summary of what changed. Visually inspected all four Home image pairs (light/dark x 1440/390): identical layout, no clipped or shrunk text, no visible string change — the marketing hero page shows no cards, borders, or hover surfaces, so this comparison cannot itself judge the ramp/standby changes (see D3 above and WINDOWS entry 6).
- Ran `npx tsx __tests__/design-tokens/report.ts` and found its fixed nine-row table cannot produce four of the nine pairs D-11 requires (muted/accent text against the page and the sidebar, not just the card). Extended the script additively with a second, clearly separate table rather than typing those four numbers by hand — a Rule 3 deviation the plan's own phase-state guidance pre-authorized.
- Independently reverified every carried-forward number against the currently committed `globals.css` using `contrast.ts`'s own `ratio()`/`hslToRgb`/`contrastRatio` functions before citing it: the OI-3 numbers (4.360, 4.545) matched 07-04-SUMMARY exactly; the light-mode status-token numbers (`--warning` 1.983, `--success` 2.298, `--standby` 3.003) matched the plan's own stated values exactly; the OI-2 Option B (not shipped) numbers were computed fresh since no prior artifact had run them.
- Wrote `07-EVIDENCE.md` with all six required sections in order: Token record, Contrast record, Light mode measured and unchanged, Success criteria, Carried forward, Guard inventory. Answered all five ROADMAP Phase 07 success criteria with command output or artifact paths (sub-11px grep = 0; contrast rows quoted from the report; border/page ramp before-and-after values; palette-literal grep = 0 across all five files plus the real standby numbers; lint/typecheck/test results plus the two baseline directory names).
- Recorded seven carried-forward findings, each numbered and routed: the three OI-3 tokens that dropped below 4.5 (destructive/error/horde, 4.910 to 4.360, horde also to Phase 10 COLOR-04), the two OI-3 tokens that lost headroom but stayed above the floor (info/alliance, 5.118 to 4.545), the inset-darker-than-card inversion (routed to Phase 10 COLOR-03, which deletes the token), light-mode status-token text contrast as a class (warning/success/standby all under 4.5 as text on white, routed to Phase 12 and milestone B), the accepted OI-2 light-accent gap with both options' numbers (Option A shipped: 4.613/4.344/4.066; Option B not shipped: 5.324/5.014/4.693), the 11px density consequence (routed to Phase 09 and milestone C per D-03/OI-8), and a note that this plan's Home-only capture cannot itself resolve WINDOWS entries 4 and 5 (recorded as a new entry 6).

## Task Commits

Each task was committed atomically:

1. **Task 1: Capture the matching after baseline** - `3e5d4585` (docs)
2. **Task 2: Emit the phase evidence record and answer the five success criteria** - split across two commits: `790fe351` (fix: additive report.ts extension, a Rule 3 deviation strictly needed to complete the task) and `4f946b32` (docs: the evidence file itself)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified

- `.planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/` - the after capture (4 PNGs, manifest.json, README.md)
- `__tests__/design-tokens/report.ts` - additive second table for the four D-11 pairs the primary table didn't cover
- `.planning/workstreams/design-system/phases/07-token-foundation/07-EVIDENCE.md` - the phase's evidence record

## Decisions Made

- Did not restart the dev server before capturing, per the orchestrator's explicit precondition constraint for this session (see key-decisions in frontmatter for the full reasoning and the verification that the captured stylesheet is current).
- Extended `report.ts` additively rather than hand-typing the four missing D-11 pairs, per the plan's own Rule 3 guidance.
- Independently reverified every carried-forward number against the live `globals.css` rather than copying it from a prior SUMMARY, closing the small residual risk that a copied number could silently drift from the code.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The committed report script lacked four rows the plan's D-11 deliverable requires**
- **Found during:** Task 2 (building the `## Light mode, measured and unchanged` section)
- **Issue:** `__tests__/design-tokens/report.ts`'s fixed nine-row table only measures muted text and accent text against `--background-elevated` (the card). D-11 also requires those two rows measured against the page and the sidebar in light mode, and the plan's own must-haves prohibit typing any contrast number into the evidence record by hand.
- **Fix:** Added a second, clearly separate table to `report.ts` (`printD11ExtraReport`) computing `muted text vs page`, `muted text vs sidebar`, `accent text vs page`, `accent text vs sidebar` for both themes, reusing the same `ratio()`/`loadThemeTokens` functions the primary table uses. The primary table's fixed order, and every existing citation of it in 07-04's commit bodies and SUMMARY, are untouched.
- **Files modified:** `__tests__/design-tokens/report.ts`
- **Verification:** `npm run typecheck` exit 0; `npx vitest run __tests__/token-contrast.test.ts` still 31/31 passing; new rows reproduce the OI-1/OI-2 planning-time predictions exactly (dark muted-vs-page 5.625, muted-vs-sidebar 5.462; light accent-vs-page 4.344, accent-vs-sidebar 4.066), confirming no drift.
- **Committed in:** `790fe351`

---

**Total deviations:** 1 auto-fixed (1 blocking, Rule 3). **Impact on plan:** Necessary to satisfy the plan's own "no hand-typed contrast number" prohibition for a deliverable (D-11) the committed report script did not yet support producing. No scope creep: the extension is additive, does not alter the primary table's nine rows or their fixed order, and is exactly the kind of fail-loud additive change the plan's phase-state guidance pre-authorized as a Rule 3 deviation.

## Issues Encountered

None beyond the one deviation above.

## User Setup Required

None - no external service configuration required by this plan.

## Next Phase Readiness

- Phase 07 (Token Foundation) is complete: all six plans have summaries, and `07-EVIDENCE.md` plus this SUMMARY are what Phase 08 reads to know what the tokens now are, and what Phase 12 reads to write `DESIGN.md`.
- TYPE-01, COLOR-01, COLOR-02, and COLOR-06 are all ready to mark complete: this is the last plan declaring any of the four, and `requirements.ready-ids` should report all four ready now that this SUMMARY exists.
- Three visual judgments remain open in `.planning/WINDOWS.md` (entries 4, 5, and this plan's new entry 6), all routed to the same end-of-phase UAT per `workflow.human_verify_mode=end-of-phase`. None of them block Phase 08 from starting, since Phase 08 builds on the token *values* (proven numerically) rather than on a completed visual sign-off.
- Six carried-forward findings from `07-EVIDENCE.md`'s `## Carried forward` section need a home in later phases' planning context: three route to Phase 10 (COLOR-03, COLOR-04, and the general colour-migration awareness of the two narrowed-headroom tokens), two route to Phase 12 (DESIGN.md documentation of the OI-3 drop and the light-mode status-token-as-text constraint, plus milestone B awareness of the same), and one routes to Phase 09 and milestone C (the 11px density consequence).
- No blockers remain for the design-system workstream to continue with Phase 08 (Primitive Contracts).

---
*Phase: 07-token-foundation*
*Completed: 2026-09-16*

## Self-Check: PASSED

Verified all created files exist on disk: the post-phase-07 baseline directory (README.md, manifest.json, 4 PNGs) and `07-EVIDENCE.md`. Verified all three commits (`3e5d4585`, `790fe351`, `4f946b32`) appear in `git log --oneline --all`. Re-ran every automated acceptance criterion from both tasks: Task 1 - `diff` of the two baseline image-name lists produces no output; the manifest origin/count/git_sha check prints `ok`; `git log -1 --format=%s` (at the time of that commit) matched `docs(07): capture post-phase-07 visual baseline`; `grep -rl NEXT_PUBLIC_SUPABASE .planning/workstreams/design-system/baselines/` prints nothing. Task 2 - all six section headings present in `07-EVIDENCE.md`; `grep -c 4.360` -> 1; `4.910`/`4.360`/`4.545`/`1.079` all present; all four guard test file paths named; `grep -rE "text-\[(9|10)px\]" app components | wc -l` -> `0`; `npx vitest run __tests__/type-scale-floor.test.ts __tests__/token-contrast.test.ts __tests__/token-palette-literals.test.ts "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts"` -> 74/74 passing; `npm run lint` (0 errors, 397 pre-existing warnings), `npm run typecheck` (exit 0), `npm run test` (1176/1176 passing) all exit 0; `git log --oneline` for the phase confirms one commit per token family with no family mixed into another (D-12).
