---
phase: 04-verified-guild-case-study
plan: 02
subsystem: content
tags: [interview-kit, copy-sign-off, content-tokens, consent-record]

# Dependency graph
requires:
  - phase: 04-verified-guild-case-study (context + UI spec)
    provides: "04-CONTEXT.md decisions D-03 and D-04, and 04-UI-SPEC.md's Copywriting Contract with the five locked page-frame templates"
provides:
  - "04-INTERVIEW-KIT.md: the sprint plan's ten questions verbatim, questions 11 and 12 for roster size, expansion and tier, and months using, the question-ten linking ask, and a written-approval checklist"
  - "04-COPY-DRAFT.md with STATUS: APPROVED, SIGN-OFF: APPROVED 2026-09-06, 18 APPROVED-STRING lines, and 13 CONTENT-TOKEN declarations bound to CaseStudy fields"
affects: ["04-03 (parity gate reads every APPROVED-STRING line; halts without the sign-off marker)", "04-04 (publish runbook points the user at the interview kit)"]

actuals:
  tokens: 30000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "CONTENT-TOKEN: <token> = <CaseStudy field> declaration convention, new alongside Phase 3's APPROVED-STRING and NUMBER-TOKEN lines, so a copy token can only be satisfied by a registry field and never by a hand-typed literal"

key-files:
  created:
    - .planning/phases/04-verified-guild-case-study/04-INTERVIEW-KIT.md
    - .planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md
  modified: []

key-decisions:
  - "Copy sign-off: user approved all 18 strings as drafted (approve-all, 2026-09-06). Section F defaults settled: eyebrow shown reading 'Case Study', breadcrumb reads 'Customers', limitation heading neutral ('What still needs work'), CTA mirrors the research report's CTA verbatim."
  - "Added questions numbered 11 and 12, appended after the ten required questions, so the required ten keep their sprint-plan numbering"
  - "Interview kit is an internal working document with no sign-off gate of its own; only the public-page strings went through the gate"
  - "Question nine's limitation answer is recorded as a publish blocker if the guild declines to name one, not a gap the page absorbs, since the roadmap requires the limitation section"

patterns-established:
  - "Proof-strip figures (roster, expansion and tier, tenure) are collected in the interview, never read from the guild's LootList+ account data, which is a separate consent surface (D-03)"

requirements-completed: []  # EVID-04 shared with 04-01 and 04-03; not marked complete by this plan

coverage:
  - id: D1
    description: "Interview kit carries the ten sprint-plan questions verbatim plus roster, expansion and tier, and tenure asks, the linking ask, and a written-approval checklist"
    requirement: "EVID-04"
    verification:
      - kind: other
        ref: "grep -c 'May the page link your Warcraft Logs' 04-INTERVIEW-KIT.md returns 1; kit is 63+ lines; questions 11 and 12 present"
        status: pass
  - id: D2
    description: "Every visible template string exists as an APPROVED-STRING with guild values as declared CONTENT-TOKEN placeholders; user sign-off recorded in assertable form"
    requirement: "EVID-04"
    verification:
      - kind: other
        ref: "head -1 04-COPY-DRAFT.md is 'STATUS: APPROVED'; grep '^SIGN-OFF: APPROVED ' matches; 18 APPROVED-STRING lines; 13 CONTENT-TOKEN lines; em-dash grep returns 0 for both files"
        status: pass

duration: 40min
completed: 2026-09-06
status: complete
---

# Phase 4 Plan 2: Interview Kit and Copy Sign-Off Summary

## Performance

- Duration: ~40min across two sessions (drafting session, then sign-off on resume)
- Tasks: 3 (2 auto, 1 blocking-human checkpoint)
- Commits: 3

## Accomplishments

- The user can run the guild interview and the approval round from one document. The ten sprint-plan questions appear verbatim with a "Feeds:" note mapping each to the page field it fills, plus questions 11 and 12 covering the three proof-strip figures the required ten never collect.
- The kit states in plain words that roster, expansion and tenure figures come from the interview and must not be pulled from the guild's LootList+ account data.
- The written-approval checklist enumerates the quote, guild name, byline, expansion and tier, each number individually, and the linking permission, and records that a verbal yes is insufficient.
- Every visible string the case-study template renders exists once as an `APPROVED-STRING` line, with 13 `CONTENT-TOKEN` declarations each naming the exact `CaseStudy` field it resolves from.
- Copy sign-off received: `approve-all` on 2026-09-06. The draft's first line reads `STATUS: APPROVED`, every section's strings sit under `### Approved`, and `SIGN-OFF: APPROVED 2026-09-06` is appended. Plan 04-03's precondition is satisfied.

## Task Commits

1. Task 1, interview kit: `04bc02b` docs(04-02): add guild interview kit with ten verbatim questions plus additions
2. Task 2, copy draft: `f6ebac6` docs(04-02): draft copy for the case-study template with declared content tokens
3. Task 3, sign-off: recorded in the commit carrying this SUMMARY (approve-all marker applied to 04-COPY-DRAFT.md)

## Files Created/Modified

- `.planning/phases/04-verified-guild-case-study/04-INTERVIEW-KIT.md` (created)
- `.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md` (created, then marked approved)

## Decisions Made

- User approved all 18 strings as drafted, settling Section F's four open calls by their defaults (eyebrow shown, breadcrumb "Customers", neutral limitation heading, CTA mirrored from the research report).
- Added questions numbered 11 and 12 after the required ten, so the required questions can be quoted against the sprint plan without an offset.

## Deviations from Plan

None. The plan's checkpoint resolved with `approve-all`, so no redraft round was needed.

## Issues Encountered

None.

## User Setup Required

The guild interview itself remains a user action. Run it from `04-INTERVIEW-KIT.md`; EVID-05 stays blocked until the interview is conducted and written approval is obtained. Plan 04-04 records that blocker.

## Next Phase Readiness

- Plan 04-01 (template, registry types, fixture) is wave 1 and can run now.
- Plan 04-03 depends on 04-01 and this plan; its sign-off precondition is now satisfied.

## Self-Check: PASSED

- `head -1 04-COPY-DRAFT.md` = `STATUS: APPROVED`
- `grep -E '^SIGN-OFF: APPROVED '` matches
- 18 `APPROVED-STRING:` lines, 13 `CONTENT-TOKEN:` lines, 0 `### Drafted` headings remaining
- em-dash grep returns 0 for both artifacts
- No guild name, quote, role, realm, or customer figure in either file
