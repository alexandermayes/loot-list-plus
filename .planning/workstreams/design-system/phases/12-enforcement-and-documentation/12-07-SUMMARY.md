---
phase: 12-enforcement-and-documentation
plan: 07
subsystem: testing
tags: [design-system, impeccable, ci-gate, evidence, windows-ledger, requirements]

requires:
  - phase: 12-enforcement-and-documentation
    provides: "12-01 through 12-06's shipped ENF-01/02/03 work and the phase gate's Section 1/2.12/4/6 answers this plan closes out under"
provides:
  - "ENF-04 and ENF-05 recorded Blocked on the deploy in REQUIREMENTS.md, ROADMAP.md and WINDOWS.md (D-02's three places), with the full ENF-04 unblock recipe"
  - "12-DETECTOR-LOCAL-FINAL.json: the final local rendered-detector census, config mode, labelled local, with a corrected per-page attribution table"
  - "post-phase-12 after-capture: 20 public-page images, all 20 byte-identical to pre-phase-12"
  - "12-EVIDENCE.md: all five ROADMAP success criteria answered, criteria 4/5 explicitly not met/blocked"
  - "ENF-01 and ENF-02 marked Complete in REQUIREMENTS.md; six new WINDOWS entries (52-57)"
affects: []

actuals:
  tokens: 169500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Corrected-attribution-without-code-change: when a pre-existing measurement wrapper's bug is found outside the plan's declared files_modified, the evidence document recomputes correct figures directly from the raw data and records the bug via WINDOWS rather than editing the wrapper"

key-files:
  created:
    - .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-FINAL.json
    - .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-EVIDENCE.md
    - .planning/workstreams/design-system/baselines/2026-09-23-post-phase-12/
  modified:
    - .planning/workstreams/design-system/REQUIREMENTS.md
    - .planning/workstreams/design-system/ROADMAP.md
    - .planning/WINDOWS.md

key-decisions:
  - "ENF-04/ENF-05 recorded Blocked (deploy) rather than Pending or Complete, in all three D-02 places, after re-verifying live that remote main is still 2e0587ee (304 commits behind, unmoved since 12-01)"
  - "The committed .impeccable/config.json removes zero findings from the final local rendered run, and this is recorded as the correct expected result (not a gap): none of its 13 entries scope to a file among the seven ENF-04 pages or to a gating rule, and design-system-* rules never attach to an http(s) target regardless of config (Gate 2.3)"
  - "Found a pre-existing bug in local-detector-run.mjs's pageKeyFor helper (12-05's wrapper, not touched by this plan): a string-prefix match against the page list buckets every finding under the home page, so both 12-05's and this plan's attribution tables' page labels were wrong. Not fixed in the script (outside this plan's no-code-change scope, WINDOWS 55); 12-EVIDENCE.md's attribution table is recomputed directly from each finding's raw file field instead"
  - "post-phase-12's 20 public-page images are all byte-identical to pre-phase-12's -- no hero-video jitter or other difference appeared this run, so no per-image explanation was needed beyond the hash match itself"

patterns-established: []

requirements-completed: [ENF-04, ENF-05]

coverage:
  - id: D1
    description: "ENF-04 and ENF-05 recorded Blocked on the deploy in REQUIREMENTS.md, ROADMAP.md and WINDOWS.md, each pointing at a WINDOWS entry naming the gate, owner and (for ENF-04) the full seven-point unblock recipe; ENF-01/ENF-02 marked Complete"
    requirement: "ENF-04"
    verification:
      - kind: other
        ref: "node -e verify script (Task 1 acceptance criteria, re-run at close): checks traceability rows read Blocked not Pending/Complete, ROADMAP markers present, WINDOWS entries mention ENF-04/npx impeccable and ENF-05, no em dash"
        status: pass
    human_judgment: false
  - id: D2
    description: "Final local detector run (config mode, labelled local) recorded with a corrected attribution table; post-phase-12 after-capture compared image by image against pre-phase-12, all 20 pairs identical"
    requirement: "ENF-05"
    verification:
      - kind: other
        ref: "node -e verify script (Task 2 acceptance criteria): environment/mode fields, gatingCounts keys present, exactly one post-phase-12 baseline dir with >=20 public pngs; manual md5 hash comparison of all 20 pre/post pairs, all SAME"
        status: pass
    human_judgment: false
  - id: D3
    description: "12-EVIDENCE.md answers all five ROADMAP success criteria (1-3 with reproducible output, 4-5 as blocked with LOCAL interim evidence); full CI set green at the phase's final code state"
    requirement: "ENF-05"
    verification:
      - kind: other
        ref: "node -e verify script (Task 3 acceptance criteria): five Criterion headings present, Criterion 5 not-met with a LOCAL subsection, no em dash; npm run lint (0 errors), npm run typecheck (exit 0), npm test (83/83 files, 1396/1396 tests, default concurrency and --maxWorkers=2), npm run build (exit 0)"
        status: pass
    human_judgment: false

duration: ~45min
completed: 2026-09-23
status: complete
---

# Phase 12 Plan 07: ENF-04/ENF-05 Blocked on the Deploy, Final LOCAL Detector Run, Phase Evidence Summary

**Closes Phase 12 honestly: ENF-04 and ENF-05 recorded Blocked on the deploy (remote main still at `2e0587ee`, 304 commits behind, re-verified live) in REQUIREMENTS.md, ROADMAP.md and `.planning/WINDOWS.md`, with a seven-point ENF-04 unblock recipe; a final `config`-mode local rendered-detector run and a byte-identical post-phase-12 after-capture; and `12-EVIDENCE.md` answering all five ROADMAP success criteria, including a corrected attribution table after finding a pre-existing page-labelling bug in 12-05's measurement wrapper.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-09-23
- **Tasks:** 3 of 3 complete
- **Files modified:** 3 (`REQUIREMENTS.md`, `ROADMAP.md`, `.planning/WINDOWS.md`)
- **Files created:** 22 (`12-DETECTOR-LOCAL-FINAL.json`, `12-EVIDENCE.md`, `2026-09-23-post-phase-12/manifest.json` + 20 PNGs)

## Accomplishments

- Re-verified live (not restated from plan time) that remote `main` is still `2e0587ee`, dated 2026-09-13, and now 304 commits behind local `main` (up from 275 at plan time, 284 at 12-01) -- the remote head itself has not moved. D-01's premise holds.
- Recorded ENF-04 and ENF-05 as **Blocked (deploy)** in all three D-02 places: `REQUIREMENTS.md`'s requirement lines and traceability rows (neither reads Pending or Complete), `ROADMAP.md`'s Phase 12 success criteria 4 and 5 (inline marker, comma not em dash), and two new `.planning/WINDOWS.md` entries (52 for ENF-05, 53 for ENF-04) -- entry 53 carries the full seven-point unblock recipe (milestone-start baseline window, separate post-deploy CI job, pinned-vs-vendored detector version, committed config, no design-system attachment on http(s) targets, the exit-code-2/0 boundary with `em-dash-overuse` confirmed as the only advisory rule, and the page/viewport/output shape to mirror).
- Marked **ENF-01 and ENF-02 Complete** in `REQUIREMENTS.md` via `gsd-tools requirements mark-complete` (ENF-03 was already Complete from 12-04).
- Added a `deviation` WINDOWS entry (54) naming 12-04's full list of remaining hand-typed numeric labels, per gate item 2.10's default branch.
- Ran the final local rendered-detector census (`12-DETECTOR-LOCAL-FINAL.json`, `--mode config`) against the committed `.impeccable/config.json`: 1230 non-advisory findings, identical to 12-05's `--no-config` raw run in every rule's count. Confirmed this is the correct, expected result -- none of the 13 committed config entries scope to a file among the seven ENF-04 pages or to a gating rule, and `design-system-*` rules never attach to an http(s) target regardless of config (Gate 2.3).
- **Found a real bug** in `scripts/design-system/local-detector-run.mjs`'s `pageKeyFor` helper (shipped by 12-05, not touched by this plan): a string-prefix match against the seven-page list buckets every finding under the home page (`/`), because `/`'s URL is a literal string prefix of every other page's URL and `/` is checked first. This means 12-05-SUMMARY.md's own LOCAL attribution table, and my own first read of the final run, both mislabelled every gating finding as occurring on the home page. Recomputed the true per-page breakdown directly from each finding's raw `file` field: the four gating findings are actually on `/pricing` (2 low-contrast), `/research/wow-classic-loot-systems-2026` (1 low-contrast) and `/changelog` (35 nested-cards) -- **zero gating findings on `/`**. Not fixed in the script itself (outside this plan's no-code-change scope); recorded at WINDOWS entry 55, and `12-EVIDENCE.md`'s attribution table uses the corrected figures.
- Captured the `post-phase-12` after-capture (20 public-page images) and hash-compared every pair against `pre-phase-12`: **all 20 pairs byte-identical**, confirming this phase changed no public page. Six authenticated pages and `/design-system` fall back to the end-of-phase UAT walkthrough, same posture as every prior phase (WINDOWS entry 56).
- Wrote `12-EVIDENCE.md`: one section per ROADMAP success criterion. Criteria 1-3 answered with re-run command output (parity guard 22/22, page-absence guard 28/28, purple/yellow ratchet 3/3, `context.mjs`'s `# DESIGN.md` block). Criteria 4 and 5 recorded not met, blocked on the deploy, pointing at the three record locations; criterion 5 carries an explicit `LOCAL measurement` subsection with the corrected attribution table, run parameters (detector version, viewports, origin, config state) and an explicit sentence that it does not satisfy ENF-05.
- Recorded a second, unrelated documentation-accuracy finding at WINDOWS entry 57: `09-EVIDENCE.md`'s prose states Card's base radius is 12px; the correct figure (confirmed by 12-03 against this project's own `tailwind.config.js`, where `lg` is 12px and `xl` is 16px) is 16px. Not fixed in the closed phase's evidence file; DESIGN.md already carries the correct value.
- Re-ran the full CI set at this plan's final code state: `npm run lint` (0 errors, 397 pre-existing warnings), `npm run typecheck` (exit 0), `npm test` (83/83 files, 1396/1396 tests, both at default concurrency and `--maxWorkers=2`, no flakiness observed), `npm run build` (exit 0).

## Task Commits

1. **Task 1: Record ENF-04 and ENF-05 as blocked on the deploy in REQUIREMENTS.md, ROADMAP.md and WINDOWS.md, with the ENF-04 unblock recipe** - `eaae8711` (docs)
2. **Task 2: Final local detector run with the committed config, and the post-phase-12 after-capture compared image by image** - `45da67c8` (feat)
3. **Task 3: 12-EVIDENCE.md answering all five success criteria, with the full CI set green** - `35f954f1` (docs)

**Plan metadata:** recorded in the metadata commit made immediately after this SUMMARY was written.

## Files Created/Modified

- `.planning/workstreams/design-system/REQUIREMENTS.md` - ENF-04/ENF-05 Blocked (deploy) status lines and traceability rows; ENF-01/ENF-02 marked Complete
- `.planning/workstreams/design-system/ROADMAP.md` - Phase 12 success criteria 4 and 5 carry the "not met, blocked on deploy" inline marker (touched nowhere else, per the plan's narrow permission)
- `.planning/WINDOWS.md` - six new phase-12 entries: 52 (ENF-05 Blocked), 53 (ENF-04 Blocked, unblock recipe), 54 (gate 2.10's hand-typed labels), 55 (`local-detector-run.mjs`'s `pageKeyFor` bug), 56 (post-phase-12 after-capture fallback), 57 (`09-EVIDENCE.md`'s stale radius figure)
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-FINAL.json` - final local rendered-detector census, config mode, `environment: "local"`, seven pages, both viewports
- `.planning/workstreams/design-system/baselines/2026-09-23-post-phase-12/` - 20 public-page after-capture images plus manifest, all byte-identical to `pre-phase-12`
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-EVIDENCE.md` - the phase's closing evidence record, one section per ROADMAP success criterion

## Decisions Made

See `key-decisions` in the frontmatter. The most consequential: the discovery and honest handling of the `pageKeyFor` prefix-match bug in `scripts/design-system/local-detector-run.mjs`. Rather than editing that script (which would violate this plan's own "changes no code" scope, discharged by the 12-01 gate), the bug is documented at WINDOWS entry 55 and `12-EVIDENCE.md`'s attribution table is built by reading each finding's raw `file` field directly, bypassing the wrapper's buggy `findings`/`gatingCounts.byPage` grouping. This corrects a real factual error in 12-05-SUMMARY.md's own LOCAL attribution table (which claimed all four gating findings were confined to the home page) without touching a file outside this plan's declared scope.

## Deviations from Plan

### Auto-fixed Issues

None -- no code was written or modified by this plan; every action was a planning-document or evidence-file edit exactly as scoped.

### Documented, Not Fixed (deviation Rule 1, scope-boundary-excluded)

**1. [Rule 1 - Bug, out of file scope] `local-detector-run.mjs`'s `pageKeyFor` prefix-match bug**
- **Found during:** Task 2 (building the corrected attribution table)
- **Issue:** `pageKeyFor` loops the seven-page list and returns the first page whose URL is a string-prefix of the finding's `file` field. Since `/`'s URL (`http://localhost:3100/`) is a literal prefix of every other page's URL and `/` is checked first, every finding in both `12-DETECTOR-LOCAL-RAW.json` (12-05) and `12-DETECTOR-LOCAL-FINAL.json` (this plan) was bucketed under `/`, even though each finding's own `file` field (the true URL) was always correct.
- **Fix:** Not fixed in the script -- `scripts/design-system/local-detector-run.mjs` is outside this plan's declared `files_modified` and its own "changes no code" scope (12-01 gate, Standing Constraint 2's discharge). Instead: documented at `.planning/WINDOWS.md` entry 55 with the exact mechanism and the corrected figures; `12-EVIDENCE.md`'s attribution table is computed by reading each finding's raw `file` field directly.
- **Files modified:** None (documentation only: `.planning/WINDOWS.md`, `12-EVIDENCE.md`).
- **Verification:** Recomputed per-URL counts from `finding.file` on both the raw and final JSON files independently; both agree (`/pricing`: 4 low-contrast total across 2 viewports, `/research/...`: 2, `/changelog`: 70 nested-cards), matching the `gatingCounts` totals exactly (`low-contrast` 6, `nested-cards` 70) with none attributable to `/`.
- **Committed in:** `45da67c8` (WINDOWS entry), `35f954f1` (corrected attribution table in `12-EVIDENCE.md`)

---

**Total deviations:** 0 auto-fixed, 1 documented-not-fixed (a pre-existing bug outside this plan's declared file scope, corrected for in the evidence rather than the source).
**Impact on plan:** No scope creep, no code change. The correction improves the accuracy of this plan's own must-have ("every remaining gating finding carries a written attribution... naming the element") without touching a file this plan was not scoped to touch.

## Issues Encountered

None beyond the documented deviation above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ENF-01, ENF-02 and ENF-03 are Complete; ENF-04 and ENF-05 are Blocked on the deploy, recorded in all three places a future reader would check, with a precise unblock recipe that does not require re-deriving anything this phase already measured.
- The milestone's central claim (zero token/primitive findings) has a LOCAL measurement on record, correctly attributed and labelled, that cannot be mistaken for the deployed run ENF-05 requires.
- Phase 12 is otherwise closed: `npm run lint`/`typecheck`/`test`/`build` all green at the phase's final code state.
- Two items remain for the orchestrator, not this plan (per its own narrow ROADMAP.md permission and explicit instruction not to touch them): fixing Phase 12's goal into user-story form (or dropping its `Mode: mvp` line) before `/gsd-verify-work 12`, and any STATE.md updates.
- Six new WINDOWS entries (52-57) and one deviation record are ready for a future audit or the milestone's eventual `/gsd-verify-work` pass; none require action before that pass.

## Self-Check: PASSED

- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-FINAL.json` - FOUND, `environment: "local"`, `mode: "config"`
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-EVIDENCE.md` - FOUND, five `Criterion N` headings present, no em dash
- `.planning/workstreams/design-system/baselines/2026-09-23-post-phase-12/` - FOUND, `manifest.json` + 20 PNGs, all 20 byte-identical to `pre-phase-12`
- Commit `eaae8711` (Task 1) - FOUND in `git log --oneline`
- Commit `45da67c8` (Task 2) - FOUND in `git log --oneline`
- Commit `35f954f1` (Task 3) - FOUND in `git log --oneline`
- `git ls-remote origin refs/heads/main` re-verified this session - `2e0587ee...`, unchanged
- `.planning/workstreams/design-system/REQUIREMENTS.md` - ENF-04/ENF-05 traceability rows read `Blocked (deploy)`, ENF-01/ENF-02 read `Complete` - FOUND
- `.planning/WINDOWS.md` - entries 52 through 57 present - FOUND
- `npm run lint` - 0 errors (397 pre-existing warnings)
- `npm run typecheck` - exit 0
- `npm test` - 83/83 files, 1396/1396 tests (default concurrency and `--maxWorkers=2`)
- `npm run build` - exit 0

---
*Phase: 12-enforcement-and-documentation*
*Plan: 07 (final plan, phase complete)*
*Completed: 2026-09-23*
