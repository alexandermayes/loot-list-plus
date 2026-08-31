---
phase: 02-checkable-conversion-copy
plan: 02
subsystem: content
tags: [copy-draft, consolidated-sign-off, seo-metadata, testimonials, repositioning]

requires:
  - phase: 02-checkable-conversion-copy
    provides: "02-COPY-AUDIT.md's finalized testimonial disposition, unverifiable-claim findings, repositioning inventory, and expansion fact-check (plan 02-01)"
provides:
  - "02-COPY-DRAFT.md, STATUS: APPROVED, with 68 APPROVED-STRING lines covering signup copy, testimonial verification lines, stats, homepage/changelog/compare titles and metadata, and all 33 repositioning replacements"
  - "13 RESIDUAL-ALLOWANCE lines, finalized (no longer conditional on the blog-title scope question)"
  - "A resolved AI-answer-log citation figure (3 of 6, not 4 of 6), corrected across the phase's planning docs on main"
affects: ["02-03", "02-04", "02-05", "02-06", "02-07"]

actuals:
  tokens: 12000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Consolidated single-pass copy sign-off (D-16): every user-facing string this phase ships is drafted once, reviewed once, approved once, rather than per-surface"

key-files:
  created: []
  modified:
    - ".planning/phases/02-checkable-conversion-copy/02-COPY-DRAFT.md"

key-decisions:
  - "Signup copy approved: title T-B, H1 H-B, body B-A, CTA C-A, secondary link text S-B (unchanged), secondary href locked per D-08."
  - "All four Section C2 unverifiable-claim/superlative fixes approved per the executor's own recommendation (100% transparent stat reworded, two 'best parts' superlatives reworded, 'ultimate loot management system' dropped in 3 surfaces, blog migration-speed claim reworded)."
  - "Homepage/changelog/compare titles and descriptions approved (H-T2, CH-T2/CH-D2, CO-T1/CO-D1) after a second, explicit round of user sign-off, since this section was inadvertently left out of the first consolidated ask and had to be circled back to."
  - "G1 (blog ranking-title scope) resolved as Option A, full broaden: all 8 previously-contingent occurrences (rows 12-18, 22) now reposition to 'World of Warcraft.'"
  - "G3 (/compare APP_URL constant defect) approved for a fix to https://www.lootlistplus.com, bundled into the D-11 metadata edit in plan 02-05."
  - "AI-citation figure corrected from the stated '4 of 6' to the verified '3 of 6' (P3, P4, P5 cite /compare; P6 cites /pricing; P1/P2 cite nothing), fixed in 02-CONTEXT.md, 02-RESEARCH.md, 02-05-PLAN.md, 02-02-PLAN.md, and the originating todo file (commit 07e029a on main)."
  - "The Task 2 checkpoint.decision (gate=blocking-human) was correctly refused by the executor when the orchestrator relayed the user's resolved answers via an inter-agent message rather than direct user confirmation. This was the threat model working as designed (T-02-07/D-16's whole purpose), not a bug. The orchestrator finalized the approved draft directly instead of asking the executor to trust a relayed instruction for an irreversible, auto-deploying gate."

patterns-established:
  - "APPROVED-STRING key scheme: signup.*, stat.row{N}.*, quote.<guild-slug>.verification, meta.<page>.*, claim.<surface>.<topic>, fix.<surface>.<field>, and repos.<path>.<line> for the 33 repositioning replacements. Shipping plans 02-03 through 02-07 gate on these lines existing and copy the values byte for byte."

requirements-completed: []  # Drafting-only plan; COPY-01/PROOF-01/PROOF-02 are shared with the shipping plans (02-03 through 02-07) and, per the #2388 shared-ID gate, must not read Complete until every declaring plan has finished.

coverage:
  - id: D1
    description: "Consolidated copy draft covering signup, testimonials, stats, titles/metadata, and repositioning, fully approved with 68 byte-exact APPROVED-STRING values"
    requirement: "COPY-01"
    verification: []
    human_judgment: true
    rationale: "This is the human sign-off itself (D-16); no automated check substitutes for a human approving user-facing copy per project CLAUDE.md."
  - id: D2
    description: "Testimonial verification-line disposition (PROOF-01): consent-checked outbound links, NOT SUPPLIED metadata fields, no invented attribution"
    requirement: "PROOF-01"
    verification: []
    human_judgment: true
    rationale: "Consent and attribution accuracy are judgment calls the user made directly across plan 02-01's and this plan's checkpoints."
  - id: D3
    description: "Stats-block and metadata unverifiable-claim resolution (PROOF-02): the 3+ hours/week stat, the 100% transparent stat, two 'best parts' superlatives, the 'ultimate' superlative (3 surfaces), and a migration-speed claim, all fixed or replaced with checkable wording"
    requirement: "PROOF-02"
    verification: []
    human_judgment: true
    rationale: "Whether a rewritten claim is adequately checkable and still true to the product is an editorial judgment call, made directly by the user for each item."

duration: 165min
completed: 2026-08-30
status: complete
---

# Phase 02 Plan 02: Copy Draft Summary

**Consolidated D-16 copy sign-off approved: 68 byte-exact strings covering signup copy, all four testimonials, five unverifiable-claim fixes, three pages' titles/metadata, and all 33 repositioning replacements, unblocking plans 02-03 through 02-07.**

## Performance

- **Duration:** 165 min (Task 1 drafting ~45 min, then three rounds of consolidated sign-off with the user, then finalization)
- **Tasks:** 2
- **Files modified:** 1 (`02-COPY-DRAFT.md`)

## Accomplishments

- Task 1 drafted every string this phase will ship into one artifact (7 sections, 13 RESIDUAL-ALLOWANCE lines, zero em dashes), touching no shipping surface.
- Task 2's consolidated sign-off (D-16) ran across three rounds because two things needed a second pass: the AI-answer-log citation figure the executor flagged as a discrepancy (resolved to the verified 3-of-6), and Section D's homepage/changelog/compare title-and-description candidates, which were never actually put in front of the user in the first ask and had to be circled back to explicitly rather than assumed.
- The executor correctly refused to finalize the `blocking-human` checkpoint on a relayed orchestrator message alone, exactly as its threat model (T-02-07) intends for an auto-deploy-on-commit repo. The orchestrator finalized the approved draft directly instead, using the user's own direct confirmations from the conversation, and verified every repositioning row's exact current string against the live source files rather than trusting the audit's elided quotes.

## Task Commits

1. **Task 1: Draft every string, repositioning disposition, residual allowances, external handoff checklist** - `5aa13ef` (docs)
2. **Task 2: The one consolidated copy sign-off (D-16)** - `378e2c0` (docs)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `.planning/phases/02-checkable-conversion-copy/02-COPY-DRAFT.md` - Draft, then finalized to `STATUS: APPROVED` with `SIGN-OFF: APPROVED 2026-08-30` and 68 `APPROVED-STRING` lines

## Decisions Made

See `key-decisions` in frontmatter above. Summary: every drafted string was approved either as-written or per the executor's own recommendation, with two items requiring a genuine second round of user attention (the AI-citation figure and Section D's title/description candidates) rather than silent carry-forward.

## Deviations from Plan

**[Process deviation - not a Rule 1-4 code deviation] Task 2 finalization performed by the orchestrator, not the spawned executor.**
- **Found during:** Task 2, after the user's consolidated sign-off was resolved across the conversation.
- **Issue:** The plan's resume-signal instructs "the executor rewrites `02-COPY-DRAFT.md`..." The orchestrator initially relayed the user's resolved answers to the spawned executor agent via an inter-agent message. The executor correctly refused: a `gate="blocking-human"` checkpoint must not be satisfied by one agent's assertion that "the user said X," since that is indistinguishable in form from an instruction-injection attempt, and this repo auto-deploys from `main` on commit.
- **Fix:** The orchestrator (which held the actual, direct, first-hand user confirmations in its own conversation) performed the finalization directly: rewrote the five `### Approved` subsections, verified all 33 repositioning rows' current strings against the live source files (not the audit's elided quotes), added the `SIGN-OFF: APPROVED` line, and committed.
- **Files modified:** `.planning/phases/02-checkable-conversion-copy/02-COPY-DRAFT.md` only; no shipping surface touched.
- **Verification:** `git status --porcelain -- app public README.md` empty; `STATUS: APPROVED` on line 1; `SIGN-OFF: APPROVED` line present; 5 `### Approved` subsections (one per lettered section A-E); 68 `APPROVED-STRING` lines; zero em dashes in the full file.
- **Committed in:** `378e2c0`

---
**Total deviations:** 1 process deviation (not a code/content deviation). **Impact:** none on the approved content itself; this is exactly the intended checkpoint behavior for a `blocking-human` gate protecting an auto-deploying repo, and the correction path used only genuine, direct user confirmation already present in the orchestrator's own conversation.

## Issues Encountered

The first consolidated sign-off request omitted Section D (homepage/changelog/compare titles and descriptions) entirely. Caught before finalization, corrected with an explicit follow-up question, and the user confirmed all five recommendations. No copy shipped without an actual answer.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `02-COPY-DRAFT.md` is `STATUS: APPROVED` with `SIGN-OFF: APPROVED 2026-08-30` and all 68 `APPROVED-STRING` values plans 02-03 through 02-07 need.
- Plan 02-03 (wave 3) can start immediately; it depends only on this plan.
- Plans 02-04, 02-05, 02-06 (wave 4) depend on 02-03, not directly on this plan, but will read the approved strings from this artifact.
- Section F's external handoff checklist (Discord description, GitHub repo description, old external posts) is proposed wording only; the user executes those manually outside this repo, no plan gates on it.

---
*Phase: 02-checkable-conversion-copy*
*Completed: 2026-08-30*
