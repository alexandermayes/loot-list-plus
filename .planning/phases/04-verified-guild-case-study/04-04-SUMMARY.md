---
phase: 04-verified-guild-case-study
plan: 04
subsystem: content
tags: [seo, sitemap, planning-records, case-study, publish-runbook]

requires:
  - phase: 04-verified-guild-case-study
    provides: "04-01 shipped the dynamic route, data module and interim robots directive; 04-02 shipped the interview kit; 04-03 shipped the copy-fidelity-gated template with the approved strings"
provides:
  - "A self-contained publish runbook (04-PUBLISH-RUNBOOK.md) covering the entry gate, registry entry, copy resolution, the atomic robots/sitemap/test commit, the contextual link sweep, the one-time recrawl with its submission log, the closing record update, and rollback"
  - "COVERAGE.md declaring no external API integration in this phase, for the seal-time API coverage gate"
  - "An honest EVID-05 blocker record in STATE.md naming the two unblocking artifacts"
  - "A dated blocked-on-user-action entry in REQUIREMENTS.md pointing at the runbook"
affects: ["Phase 5 (recrawl request; the runbook exists so the case study's own recrawl is not folded into Phase 5's one-time pass)", "whoever runs the eventual publish once the guild interview clears"]

actuals:
  tokens: 6300
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Self-contained publish runbook: a single ordered document assumed to require no other context than itself plus the approved interview record, written ahead of the event it describes while the route contract is fresh"
    - "Guard-swap discipline: the sitemap absence assertion added in 04-01 is documented to be swapped for a single-occurrence assertion at publish time, in the same commit, rather than deleted, so the sitemap stays guarded against duplicates and lingering robots overrides going forward"

key-files:
  created:
    - .planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md
    - .planning/phases/04-verified-guild-case-study/COVERAGE.md
  modified:
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "The publish runbook is written now, while the route contract from 04-01/04-03 is fresh, rather than reconstructed later from a cold read of the code, per D-07"
  - "EVID-05 stays explicitly unresolved: the STATE.md blocker entry is rewritten to state what changed (template shipped, kit ready) without striking through or marking it resolved, and the REQUIREMENTS.md checkbox stays unchecked"
  - "Pre-existing em dashes in unrelated STATE.md/REQUIREMENTS.md content (from Phase 1/2/3/4 entries this plan did not touch) were left as-is: the task's instruction was to change nothing else in either file, and fixing unrelated historical content is out of this plan's scope per the deviation rules' scope boundary"

requirements-completed: []

coverage:
  - id: D1
    description: "04-PUBLISH-RUNBOOK.md exists as an ordered, checkable procedure: entry gate, six numbered steps naming publishedCaseStudies, app/sitemap.ts and app/__tests__/sitemap.test.ts by real identifiers, the atomic-commit rationale, a per-URL recrawl submission log, and a rollback procedure for permission withdrawal"
    requirement: EVID-05
    verification:
      - kind: other
        ref: "grep -qiF checks for publishedCaseStudies / app/sitemap.ts / 'same commit' / recrawl / 'anchor text' / rollback, all pass (this session)"
        status: pass
      - kind: other
        ref: "wc -l: 80 lines (min_lines 55 satisfied)"
        status: pass
    human_judgment: false
  - id: D2
    description: "COVERAGE.md contains the reasoned no-external-API declaration for the seal-time API coverage gate"
    verification:
      - kind: other
        ref: "grep -qi 'no external api' COVERAGE.md, pass (this session)"
        status: pass
    human_judgment: false
  - id: D3
    description: "STATE.md's Phase 4 blocker entry updated to name EVID-05, 04-INTERVIEW-KIT.md and 04-PUBLISH-RUNBOOK.md, not struck through or marked resolved; REQUIREMENTS.md's EVID-05 checkbox stays unchecked and the traceability row stays Blocked, with the blocked-on-user-action bullet dated and pointing at the runbook"
    requirement: EVID-05
    verification:
      - kind: other
        ref: "task 2's diff-scoped verify script (EVID-05/kit/runbook grep + checkbox grep + em-dash diff-scope check), pass (this session)"
        status: pass
      - kind: other
        ref: "git diff --name-only + git diff content review confirms only the blocker line (STATE.md) and the blocked-on-user-action bullet (REQUIREMENTS.md) changed; EVID-04 row untouched"
        status: pass
    human_judgment: false
  - id: D4
    description: "No em dash in any file this plan wrote or edited; no guild name, quote or customer figure appears anywhere in the runbook, coverage declaration, or the two updated records"
    verification:
      - kind: other
        ref: "grep -c '—' returns 0 for 04-PUBLISH-RUNBOOK.md and COVERAGE.md; diff-scoped em-dash check on STATE.md/REQUIREMENTS.md finds none in the added lines (pre-existing em dashes elsewhere in those files are unrelated content, out of scope)"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-06
status: complete
---

# Phase 04 Plan 04: Publish Runbook and EVID-05 Blocker Record Summary

**Self-contained publish runbook for the case study (entry gate through rollback), a no-external-API coverage declaration, and an honest EVID-05 blocker record naming the two artifacts that unblock it.**

## Performance

- **Duration:** 17 min
- **Started:** 2026-09-06T22:19:33Z
- **Completed:** 2026-09-06T22:36:40Z
- **Tasks:** 2 completed
- **Files modified:** 4 (2 created, 2 edited)

## Accomplishments

- `04-PUBLISH-RUNBOOK.md` written: entry gate on the written approval record, six numbered steps (registry entry, copy resolution, the atomic robots-removal/sitemap-entry/test-swap commit, the contextual link sweep, the one-time recrawl with a submission log table, and the closing record update), and a rollback procedure for permission withdrawal
- `COVERAGE.md` written declaring no external API integration in this phase, satisfying the seal-time API coverage gate
- `.planning/STATE.md`'s Phase 4 blocker entry rewritten to state what shipped (tested template, empty published registry, no reachable production URL) and what remains blocked (EVID-05, pending the interview), naming both unblocking artifacts, without marking the blocker resolved
- `.planning/REQUIREMENTS.md`'s blocked-on-user-action bullet for EVID-05 dated 2026-09-06 and pointed at the runbook; the EVID-05 checkbox and traceability row left unchanged (still unchecked, still Blocked); the EVID-04 row untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: The self-contained publish runbook and the coverage declaration** - `3e0cab9` (docs)
2. **Task 2: Record EVID-05 blocked in STATE.md and REQUIREMENTS.md** - `c8b8d60` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` - The self-contained publish path from an approved interview to a live, indexed, contextually-linked page, with its own recrawl request and a rollback procedure
- `.planning/phases/04-verified-guild-case-study/COVERAGE.md` - The no-external-API declaration for the seal-time API coverage gate
- `.planning/STATE.md` - Phase 4 blocker entry rewritten to reflect what shipped (template) and what remains blocked (EVID-05 content)
- `.planning/REQUIREMENTS.md` - EVID-05 blocked-on-user-action bullet dated and pointed at the runbook

## Decisions Made

- The runbook is written now, while the route contract from 04-01/04-03 is fresh, per D-07's rationale that a runbook written after Phase 5's recrawl has already run is worth less than one written today
- The blocker record intentionally does not strike through or resolve the EVID-05 entry: it states what changed (template shipped) without overstating what is still true (content still blocked)
- Pre-existing em dashes elsewhere in `STATE.md` and `REQUIREMENTS.md` (from prior phases' entries, e.g. lines about copy sign-off, decisions, and out-of-scope items this plan never touched) were left untouched. The task instructed "change nothing else in either file," and fixing unrelated historical content sits outside this plan's scope boundary; the diff-scoped verification (which only checks lines this plan's diff introduced) confirms zero em dashes were added by this plan's edits.

## Deviations from Plan

None - plan executed exactly as written. The single scope clarification above (pre-existing em dashes left untouched) is not a deviation from an instruction; it is the instruction ("change nothing else") applied literally, consistent with the deviation rules' scope boundary (only auto-fix issues directly caused by the current task's changes).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None. This plan writes planning documents only; no stub data, placeholder UI, or unwired component was introduced.

## Threat Flags

None. This plan's threat model (T-04-15 through T-04-18, T-04-SC) is fully addressed by the artifacts as written: the blocker record is not struck through, the runbook's atomic-commit step and rollback procedure are in place, the recrawl submission table exists, no guild name/quote/figure was written, and no package was installed.

## Next Phase Readiness

- Phase 4 is complete: EVID-04 shipped and verified (Complete in REQUIREMENTS.md); EVID-05 is honestly recorded as blocked on the user-conducted interview, with both unblocking artifacts (`04-INTERVIEW-KIT.md`, `04-PUBLISH-RUNBOOK.md`) in place and cross-referenced
- Phase 5 can proceed without the case study, as the roadmap specifies; the case study's own contextual-link sweep and recrawl request are carried entirely by `04-PUBLISH-RUNBOOK.md` and will not need to be folded into Phase 5's one-time pass
- No blocker remains that this plan was responsible for closing; the sole remaining blocker (EVID-05 content) is explicitly a user-owned action (conduct the interview, obtain written approval)

---
*Phase: 04-verified-guild-case-study*
*Completed: 2026-09-06*

## Self-Check: PASSED

- Both created files verified present on disk: `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md`, `.planning/phases/04-verified-guild-case-study/COVERAGE.md`.
- Both commits verified in `git log --oneline`: `3e0cab9`, `c8b8d60`.
- Task 1 acceptance criteria re-verified: six numbered steps plus entry gate and rollback present; `publishedCaseStudies`, `app/sitemap.ts`, `app/__tests__/sitemap.test.ts` named by real identifiers; same-commit rationale stated; recrawl submission table present; rollback procedure present; `COVERAGE.md` declaration present; `grep -c '—'` returns 0 for both files; no guild name, quote, or customer figure found in either file.
- Task 2 acceptance criteria re-verified: STATE.md blocker entry names EVID-05, `04-INTERVIEW-KIT.md`, `04-PUBLISH-RUNBOOK.md`, not struck through; REQUIREMENTS.md still shows `- [ ] **EVID-05**` and `Blocked` in the traceability row; EVID-04 row unchanged; `git diff` for both files shows only the intended scoped changes; no em dash introduced by this plan's edits (diff-scoped check).
