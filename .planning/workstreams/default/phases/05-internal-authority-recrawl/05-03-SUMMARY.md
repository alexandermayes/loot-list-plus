---
phase: 05-internal-authority-recrawl
plan: 03
subsystem: content
tags: [internal-linking, copy-sign-off, seo, research-report]

# Dependency graph
requires:
  - phase: 05-01
    provides: production baseline deploy + recrawl probe tooling
provides:
  - "05-COPY-DRAFT.md: the frozen, approved link table (12 anchors across 11 pages) that plans 05-04 and 05-05 write into code and that plan 05-06 uses for lastmod bumps"
  - "The frozen RECRAWL-LIST (11 URLs) that later plans read instead of re-deriving one"
affects: [05-04, 05-05, 05-06]

# Actuals (#2632)
actuals:
  tokens: 3200
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Consolidated copy-sign-off file with STATUS/SIGN-OFF header markers gating downstream plans (same pattern as 03-COPY-DRAFT.md and 04-COPY-DRAFT.md)"
    - "APPROVED-STRING key = value lines for byte-match parity tests, keyed by page.link-n"

key-files:
  created: []
  modified:
    - ".planning/phases/05-internal-authority-recrawl/05-COPY-DRAFT.md"

key-decisions:
  - "User approved 10 of 12 link rows byte-for-byte as drafted; two rows (Link 7, Link 9) reworded to remove a duplicated word ('our data' / 'active guilds') with no change to page, slot, target, metric_id, or case-study note"
  - "Attendance-anchor rewording confirmed: rows 2, 10 and 11 ship the faithful 'changed / differ from the defaults / tune their attendance weighting' variants; the originally endorsed 'X% of guilds weight attendance' phrasing is not used because it overstates what the metric measures"
  - "Officer-burnout guide confirmed no-link; guide subset final at 6 included / 2 excluded / 1 excluded-as-borderline"
  - "Homepage link slot confirmed as the subhead paragraph, not the caption"
  - "Reused metrics (attendance-weighting across 3 pages, median-list-length across 3 pages) accepted as drafted with no redistribution"

requirements-completed: [LINK-01, LINK-02]

coverage:
  - id: D1
    description: "Link table drafted with all 12 anchors, neighboring-sentence context, metric_id citations, no-link rows, and D-03 guide subset (Task 1, prior commit 7de6db3)"
    requirement: "LINK-01"
    verification:
      - kind: other
        ref: "Task 1 <verify> automated shell block: STATUS: DRAFT header, >=8 APPROVED-STRING lines, RECRAWL-LIST with >=8 URLs, no-link rows, metric_id citations, no em dash, no generic anchors, no smart quotes"
        status: pass
    human_judgment: false
  - id: D2
    description: "Copy sign-off checkpoint answered by the user (edit-rows: two reworded rows, four open questions answered)"
    requirement: "LINK-02"
    verification: []
    human_judgment: true
    rationale: "The checkpoint's purpose is a human wording decision; the answer itself is not something a test asserts, only the resulting file state (covered by D3)"
  - id: D3
    description: "Sign-off recorded and recrawl list frozen: STATUS: APPROVED, dated SIGN-OFF line, both edited rows applied verbatim, all four open questions answered inline, RECRAWL-LIST/table agreement confirmed"
    requirement: "LINK-02"
    verification:
      - kind: other
        ref: "Task 2 <verify> automated shell + python block: STATUS: APPROVED header, dated SIGN-OFF regex match, no em dash, no smart quotes in APPROVED-STRING values, no generic anchors, unique APPROVED-STRING keys with non-empty values, RECRAWL-LIST has no duplicates"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-08
status: complete
---

# Phase 5 Plan 3: Internal Authority Link Sign-Off Summary

**Froze the 12-anchor, 11-page internal link table as `STATUS: APPROVED`, with two rows reworded per user edit and all four open questions (attendance-anchor wording, officer-burnout no-link, homepage slot, reused-metric distribution) answered inline.**

## Performance

- **Duration:** 15 min (continuation agent; excludes checkpoint wait time for user sign-off)
- **Completed:** 2026-09-08T04:40:03Z
- **Tasks:** 3 (Task 1 drafted in a prior session; checkpoint:decision answered by the user; Task 2 executed this session)
- **Files modified:** 1

## Accomplishments

- Applied the user's `edit-rows` decision verbatim: Link 7's anchor and sentence changed from "the median loot list in our data runs 18 items long" to "the median loot list runs 18 items long" (removes the duplicated "our data"); Link 9's anchor and sentence changed from "45.5% of active guilds turn on bad-luck protection for exactly this reason" to "45.5% turn on bad-luck protection for exactly this reason" (removes the duplicated "active guilds"). Page, slot, target, metric_id and case-study note were unchanged on both rows.
- Flipped the file's first line to `STATUS: APPROVED` and appended a dated `SIGN-OFF: APPROVED 2026-09-08` line plus a provenance paragraph naming the checkpoint reply that authorized it, matching the header convention established in `03-COPY-DRAFT.md` and `04-COPY-DRAFT.md`.
- Recorded the user's answer to all four open questions inline, directly beneath each question, without deleting any question: the attendance-anchor rewording is confirmed (not the originally endorsed "84.8% of guilds weight attendance" phrasing), the officer-burnout guide stays no-link, the homepage slot is the subhead (not the caption), and the reused-metric distribution across pages is accepted with no redistribution.
- Re-ran every structural check from Task 1 against the edited file (no em dash, no smart quotes in `APPROVED-STRING` values, no generic "learn more"/"read more" anchors, unique non-empty `APPROVED-STRING` keys) and confirmed the `RECRAWL-LIST` block agrees exactly with the link table: 12 anchors across 11 pages, 11 recrawl URLs, no duplicates, every page carrying a link row appears exactly once.

## Task Commits

1. **Task 1: Draft the link table, the guide subset, and the questions only the user can answer** - `7de6db3` (docs) — completed in the prior session (see `<completed_tasks>` in the resume prompt)
2. **Task 2: Record the sign-off and freeze the recrawl list** - `65719d9` (docs)

**Plan metadata:** committed alongside this SUMMARY (see final commit below)

## Files Created/Modified

- `.planning/phases/05-internal-authority-recrawl/05-COPY-DRAFT.md` - Link sign-off table finalized: `STATUS: APPROVED`, dated `SIGN-OFF` line, two rows reworded, all open questions answered inline, structural checks re-verified

## Decisions Made

- User approved 10 of 12 link rows byte-for-byte as drafted; two rows (Link 7, Link 9) reworded to fix a duplicated word, with no other change to page/slot/target/metric_id/case-study note.
- Attendance-anchor rewording confirmed over the originally endorsed phrasing — the report's evidence page must not be cited by an anchor that overstates what the metric measures.
- Officer-burnout guide confirmed no-link; final guide subset is 6 included, 2 excluded, 1 excluded-as-borderline.
- Homepage link slot confirmed as the subhead paragraph.
- Reused metrics across pages (attendance-weighting x3, median-list-length x3) accepted as drafted; no redistribution.

## Deviations from Plan

None - plan executed exactly as written. Task 2's action, verification, and acceptance criteria were followed precisely: every user edit was applied verbatim, every open question was answered without deletion, the sign-off markers were added in the required format, structural checks were re-run and passed, RECRAWL-LIST/table agreement was confirmed, and the approved file was committed on its own commit.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

`05-COPY-DRAFT.md` now carries both markers (`STATUS: APPROVED` and a dated `SIGN-OFF` line) that plans 05-04, 05-05 and 05-06 assert as a precondition before they run. The frozen `RECRAWL-LIST` (11 URLs) is ready for those plans to read directly rather than re-deriving one. No blockers.

---
*Phase: 05-internal-authority-recrawl*
*Completed: 2026-09-08*

## Self-Check: PASSED

- FOUND: `.planning/phases/05-internal-authority-recrawl/05-COPY-DRAFT.md`
- FOUND: `.planning/phases/05-internal-authority-recrawl/05-03-SUMMARY.md`
- FOUND commit: `7de6db3` (Task 1)
- FOUND commit: `65719d9` (Task 2)
