---
phase: 03-anonymized-product-data-report
plan: 03
subsystem: analytics-pipeline
tags: [python, human-checkpoint, k-anonymity, findings-selection]

requires:
  - phase: 03-anonymized-product-data-report
    provides: "Plan 03-02's full ten-metric registry, run_all_metrics()/render_menu() shared execution path, and the three evidence-decided metrics (attendance-weighting, the funnel grey-outs, top-priority-bracket)"
provides: "The D-01 human-chosen selection of 3-5 published findings, committed as a reproducible input file plus its selection record, and the regenerated public artifact carrying exactly those findings and every genuinely unavailable candidate"
affects: ["03-04 (findings/methodology copy reads 03-FINDINGS.md's Selected/Definitions sections and the regenerated artifact's findings array)", "03-05 (sitemap/measurement wrap-up reads the same committed artifact)"]

actuals: { tokens: 7900, tasks: 3, commits: 2 }

tech-stack:
  added: []
  patterns:
    - "load_selection_file()/validate_selection() (research_report.py): a committed selection file is the runner's only input for deciding which computed metrics become published findings; an unknown, greyed-out, or support-kind id in the file halts the run before any artifact is written"
    - "Full-run classification by assembled status, not by selection membership alone: every registry entry still runs through the same run_all_metrics()/assemble_* path --menu uses (D-05), then a non-selected metric's status decides its fate -- 'unavailable' (no numeric value, whether by static registry reason or a runtime floor/coverage decision) is recorded with its reason; 'finding' (computable, just not chosen) is a declined candidate and is excluded from the artifact entirely, never printed or committed"

key-files:
  created:
    - scripts/analytics/queries/wow-classic-loot-systems-2026/published-findings.txt
    - .planning/phases/03-anonymized-product-data-report/03-FINDINGS.md
  modified:
    - scripts/analytics/research_report.py
    - scripts/analytics/run-research-report.py
    - scripts/analytics/test_research_report.py
    - public/research/wow-classic-loot-systems-2026-aggregates.json
    - public/research/wow-classic-loot-systems-2026-aggregates.csv

key-decisions:
  - "User selection (pick-by-id): median-list-length, attendance-weighting, blp-usage, top-priority-bracket, in that publication order. Provenance: the user reviewed the full menu at the checkpoint, asked where the findings are published, and explicitly delegated the specific selection to the orchestrator's recommendation ('going with whatever you suggest'); the orchestrator recommended all four pickable metrics in this order. The attendance-weighting definition nuance (measures guilds that tuned attendance away from shipped defaults, not mere presence) was disclosed at the checkpoint and stands; its exact public wording still requires user sign-off at the plan 03-04 copy checkpoint."
  - "expansion-distribution was not selected because it was never a live pickable option: the menu showed it unavailable (floor-withheld), not declined. Recorded under 03-FINDINGS.md's Unavailable section, not Declined."

patterns-established:
  - "A registry entry with query_file set and unavailable_reason null is not guaranteed to be a real finding at run time -- some (breakdowns) resolve their availability dynamically via apply_floor. The full run must classify every non-selected candidate by its actual assembled status, not by a static registry field, or a genuinely unavailable candidate can silently vanish from the published artifact instead of being recorded with its reason."

requirements-completed: [EVID-01, EVID-02]

coverage:
  - id: D1
    description: "The human checkpoint presented every candidate metric with its real number (or its exact unavailable reason) and the user chose which 3-5 become published findings"
    verification: []
    human_judgment: true
    rationale: "user decision exercised at checkpoint"
  - id: D2
    description: "published-findings.txt committed as the reproducible D-01 selection input: 4 metric ids, one per line, in the user's publication order, each validated as pickable (has a query file, no unavailable_reason, kind != support)"
    verification:
      - kind: unit
        ref: "scripts/analytics/test_research_report.py::TestLoadSelectionFile, TestValidateSelection (7 tests)"
        status: pass
      - kind: other
        ref: "plan <verify>: wc -l published-findings.txt == 4 (within 3-5); python3 assertion script confirms every id in metrics.json with a query_file, no unavailable_reason, kind != support"
        status: pass
    human_judgment: false
  - id: D3
    description: "03-FINDINGS.md records the selection: STATUS: APPROVED, SELECTION: APPROVED 2026-09-04 marker, one SELECTED line per finding, Declined (empty, no numbers), Unavailable (verbatim reasons, no numbers), Definitions in force, and decision provenance"
    verification:
      - kind: other
        ref: "grep -qE '^SELECTION: APPROVED [0-9]{4}-[0-9]{2}-[0-9]{2}' 03-FINDINGS.md; grep -c '—' 03-FINDINGS.md == 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "Regenerated aggregates.json/.csv carry exactly the sample block, the 4 selected findings in selection-file order, and the 4 genuinely unavailable candidates (expansion-distribution, time-to-qualified, time-to-activated, officer-time-survey); every published segment clears the 10-guild floor; a second run over unchanged data is byte-identical"
    verification:
      - kind: other
        ref: "plan <verify> python assertion script (order match, floor check, non-empty display) -- pass"
        status: pass
      - kind: unit
        ref: "npm test (822/822 pass, including app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx 8/8)"
        status: pass
      - kind: other
        ref: "diff of two consecutive runs' aggregates.json -- byte-identical"
        status: pass
    human_judgment: false

duration: 25min (this continuation session; Task 1 ran in an earlier session before the checkpoint pause)
completed: 2026-09-04
status: complete
---

# Phase 3 Plan 03: Findings Selection and Artifact Regeneration Summary

**The user picked 4 of 4 pickable candidates (median-list-length, attendance-weighting, blp-usage, top-priority-bracket) from the honest live menu; the selection is now a committed input file the runner reproduces without a human, and the public artifact was rebuilt to carry exactly those findings plus the 4 genuinely unavailable candidates, catching and fixing a bug that had silently dropped a floor-withheld metric from the unavailable list.**

## Performance
- **Duration:** ~25min (this continuation session, resuming after the Task 2 human checkpoint; Task 1 ran ~12:05 in an earlier session)
- **Started:** 2026-09-04 (continuation)
- **Completed:** 2026-09-04T16:08:00-07:00
- **Tasks:** 3 completed (Task 1 in prior session, Task 2 decision recorded this session, Task 3 executed this session)
- **Files modified:** 7 (2 new: published-findings.txt, 03-FINDINGS.md; 5 modified: research_report.py, run-research-report.py, test_research_report.py, aggregates.json, aggregates.csv)

## Accomplishments
- Verified Task 1's prior state before doing any new work: commit `1e4badc` present, 39/39 unit tests passed.
- Recorded the user's `pick-by-id` decision: median-list-length, attendance-weighting, blp-usage, top-priority-bracket, in that publication order, with full provenance (delegated selection, orchestrator's recommendation, attendance-weighting definition nuance disclosed and still pending 03-04 copy sign-off).
- Discovered the plan's `read_first` assumption ("the selection-file code path added by plan 03-01") was incorrect: no such code path existed anywhere in the pipeline. Added `load_selection_file()` and `validate_selection()` to `research_report.py`, and wired `run-research-report.py`'s full run to build `findings` from the selection file in order, rejecting an unknown, greyed-out, or support-kind id before any artifact is written. Added 7 new unit tests (46/46 total pass).
- While wiring the above, found and fixed a real bug: an initial implementation queried production only for the sample metric plus the selected ids, so `expansion-distribution` (computable, not selected, but actually floor-withheld) silently disappeared from the artifact's `unavailable` list instead of being recorded with its reason. Fixed by running every registry entry through the same `run_all_metrics()` path `--menu` uses (D-05), then classifying each non-selected metric by its assembled status rather than by a static registry field: `unavailable` status is recorded (no number ever in that entry); `finding` status that was not selected is excluded entirely (declined, never committed).
- Wrote `published-findings.txt` (4 ids, publication order) and `.planning/phases/03-anonymized-product-data-report/03-FINDINGS.md` (STATUS/SELECTION markers, Selected/Declined/Unavailable/Definitions-in-force sections, no em dash, no declined candidate's number anywhere).
- Regenerated `public/research/wow-classic-loot-systems-2026-aggregates.{json,csv}`: findings array matches the selection file id-for-id and in order; unavailable list now correctly holds all 4 genuinely unavailable candidates; every published segment clears the 10-guild floor; confirmed idempotent (second run over unchanged data is byte-identical).
- Re-ran the full plan `<verification>` block and `npm test` (822/822 pass, including the 8-test research page render suite) after the regeneration.

## Task Commits
1. **Task 1: Generate the candidate menu from the committed queries** - `1e4badc` (fix, prior session) - also carries a Rule 1 deviation (see below)
2. **Task 2: The D-01 decision checkpoint** - recorded in `03-FINDINGS.md` (no separate commit; a `checkpoint:decision` task produces no code)
3. **Task 3: Commit the selection and regenerate the artifact** - `88f575c` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE/ROADMAP/REQUIREMENTS updates)

## Files Created/Modified
- `scripts/analytics/queries/wow-classic-loot-systems-2026/published-findings.txt` - the committed D-01 selection: 4 metric ids, one per line, publication order
- `.planning/phases/03-anonymized-product-data-report/03-FINDINGS.md` - the selection record: STATUS/SELECTION markers, Selected/Declined/Unavailable/Definitions-in-force sections, decision provenance
- `scripts/analytics/research_report.py` - added `load_selection_file()` and `validate_selection()`
- `scripts/analytics/run-research-report.py` - full run now reads the selection file, validates it, and classifies every non-selected candidate by its assembled status before building `findings`/`unavailable`
- `scripts/analytics/test_research_report.py` - 7 new unit tests (`TestLoadSelectionFile`, `TestValidateSelection`)
- `public/research/wow-classic-loot-systems-2026-aggregates.json` - regenerated: sample block + 4 selected findings + 4 unavailable entries
- `public/research/wow-classic-loot-systems-2026-aggregates.csv` - regenerated in matching row order

## Decisions Made
User selection (`pick-by-id`): median-list-length, attendance-weighting, blp-usage, top-priority-bracket, in that order. Full provenance recorded in `03-FINDINGS.md`'s "Decision provenance" section and in `key-decisions` above: the user delegated the specific pick to the orchestrator's recommendation after asking where findings are published; the attendance-weighting definition nuance was disclosed and stands, pending 03-04 copy sign-off on its exact public wording. `expansion-distribution` was not selected because the live menu never offered it as pickable (floor-withheld), so it is recorded under Unavailable, not Declined.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, carried forward from Task 1] `render_menu` silently omitted the `sample-definition` registry entry**
- **Found during:** Task 1 (prior session)
- **Issue:** The task's own `<verify>` block requires every `metric_id` in `metrics.json` to appear in the `--menu` output, but `render_menu` had no branch for `kind == "count"` (the sample-definition entry's kind), so it was silently dropped.
- **Fix:** `render_menu` now prints a leading non-pickable sample block for `kind == "count"` entries; `run_all_metrics` assembles a display string for the sample block so it flows through the same results dict the menu renders from.
- **Files modified:** `scripts/analytics/research_report.py`, `scripts/analytics/run-research-report.py`
- **Verification:** 39/39 unit tests passed after the fix.
- **Commit:** `1e4badc`

**2. [Rule 2 - Missing critical functionality] The selection-file code path assumed to exist did not exist**
- **Found during:** Task 3, reading `run-research-report.py` per the plan's `read_first` instruction ("the selection-file code path added by plan 03-01")
- **Issue:** No selection-file reading logic existed anywhere in the pipeline. The full run built its `findings` array from every candidate that happened to assemble to `"finding"` status, with no mechanism to restrict publication to a human-chosen subset -- the entire point of this plan's Task 3.
- **Fix:** Added `load_selection_file(path)` (reads one metric id per line, preserves order, returns `[]` for a missing file) and `validate_selection(selection_ids, metrics)` (raises on an unknown, greyed-out, support-kind, or sample-block id) to `research_report.py`. Wired `run-research-report.py`'s full run to load and validate the selection before running any query, then build `findings` from the selection file in order.
- **Files modified:** `scripts/analytics/research_report.py`, `scripts/analytics/run-research-report.py`, `scripts/analytics/test_research_report.py`
- **Verification:** 7 new unit tests pass (46/46 total); the plan's `<verify>` python assertion script confirms the artifact's `findings` array matches the selection file id-for-id and in order.
- **Commit:** `88f575c`

**3. [Rule 1 - Bug] An initial selection-scoped query runner dropped a genuinely unavailable candidate from the artifact**
- **Found during:** Task 3, immediately after regenerating the artifact for the first time and comparing its `unavailable` list against Task 1's menu output
- **Issue:** The first implementation (`run_selected_metrics`) queried production only for the sample metric plus the selected ids, on the reasoning that a declined candidate's number should never be computed. This correctly avoided declined-but-computable candidates, but also silently skipped `expansion-distribution` entirely -- a metric that carries no static `unavailable_reason` in `metrics.json` (its unavailability is a runtime floor-withhold decision, discovered only by actually running and assembling its breakdown). The regenerated artifact's `unavailable` list held only 3 entries instead of the 4 the checkpoint menu showed.
- **Fix:** Removed `run_selected_metrics`; the full run now calls `run_all_metrics(metrics, args, token)` directly (the same path `--menu` uses, per D-05), then classifies each non-selected, non-support, non-sample metric by its assembled status: `"unavailable"` (never carries a numeric value, whether from a static registry reason or a runtime floor/coverage decision) is recorded with its reason; `"finding"` that was not selected is a declined candidate, excluded from the artifact entirely and never printed. This is safe under the D-01 prohibition because an `unavailable` entry structurally never contains a number (verified by existing unit tests on `assemble_breakdown`'s `WITHHELD` path).
- **Files modified:** `scripts/analytics/run-research-report.py`
- **Verification:** Re-ran the full pipeline live: `unavailable` now lists `expansion-distribution, time-to-qualified, time-to-activated, officer-time-survey` (4, matching the checkpoint menu's "4 unavailable" count exactly). Confirmed no numeric value appears anywhere in the `expansion-distribution` unavailable entry. A second run over unchanged data produced a byte-identical `aggregates.json`.
- **Commit:** `88f575c` (same commit as deviation 2; discovered and fixed before that commit was made)

**Total deviations:** 3 (1 carried forward from Task 1, 2 new this session: 1 Rule 2 missing-functionality fix, 1 Rule 1 bug fix). **Impact on plan:** All three were necessary for the plan's own stated `must_haves` and acceptance criteria to be met (a complete honest menu; an artifact holding only the sample block, the selected findings, and the unavailable list); none added scope beyond what Task 3 already required.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required. The macOS Keychain "Supabase CLI" entry (already present) was used read-only across this session's production runs; its value was never displayed, logged, or committed.

## Next Phase Readiness
- Plan 03-04 can read `03-FINDINGS.md`'s Selected/Definitions-in-force sections and the regenerated `aggregates.json`'s `findings` array directly for its copy and methodology sections. The attendance-weighting definition's exact public wording still requires user sign-off at the 03-04 copy checkpoint (flagged in `03-FINDINGS.md`'s Decision provenance section).
- No blockers.

## Self-Check: PASSED

- `[ -f scripts/analytics/queries/wow-classic-loot-systems-2026/published-findings.txt ]` -> FOUND
- `[ -f .planning/phases/03-anonymized-product-data-report/03-FINDINGS.md ]` -> FOUND
- `[ -f public/research/wow-classic-loot-systems-2026-aggregates.json ]` -> FOUND
- `[ -f public/research/wow-classic-loot-systems-2026-aggregates.csv ]` -> FOUND
- `git log --oneline --grep="(03-03)"` -> 2 commits found (`1e4badc`, `88f575c`)
- Re-ran plan-level `<verification>`: `--menu` exits 0 with no numeric unavailable lines; `published-findings.txt` holds 4 valid ids; `03-FINDINGS.md` carries `STATUS: APPROVED` and `SELECTION: APPROVED 2026-09-04`; artifact `findings` order matches the selection file exactly; every published segment clears the 10-guild floor; `npm test` 822/822 pass; `grep -c '—' 03-FINDINGS.md` returns 0; no declined candidate's number appears in `03-FINDINGS.md`
- Confirmed idempotency: two consecutive full runs over unchanged production data produced byte-identical `aggregates.json`

---
*Phase: 03-anonymized-product-data-report*
*Completed: 2026-09-04*
