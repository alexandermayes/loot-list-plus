---
phase: 12-enforcement-and-documentation
source: 12-VERIFICATION.md
created: 2026-09-23
updated: 2026-09-24T20:40:38Z
status: complete
---

# Phase 12 — Human Verification (UAT)

All automated checks passed. ENF-01, ENF-02 and ENF-03 were independently verified
against the live codebase. ENF-04 and ENF-05 are correctly recorded as Blocked on the
deploy and are **not** part of this UAT.

These 6 items are the backstop- and judgment-tagged truths the phase's own plans
identified as non-inferable from static analysis. They abstain to `human_needed` rather
than passing on code presence alone.

## Current Test

[testing complete]

## Tests

### 1. Docs-page visual walkthrough at both breakpoints and both themes

Walk `/design-system` at 1440 and 390, in light and dark:

- eleven-row type scale with no pixel labels
- the `.prose-measure` paragraph wraps visibly at the 70ch cap and fills width below it
- the three-child nested-Card stack shows `first:border-t-0` correctly, with no horizontal scroll at 390
- standby / faction / quality / brand swatch labels are all legible
- Tab reaches every control with a visible focus ring
- a Modal traps Tab, closes on Escape (including the stacked-modal tie-break), and returns focus to its trigger

expected: every UI-SPEC E1-E7 item (12-04-PLAN.md `must_haves`, backstop-tagged) renders correctly at both breakpoints and both themes, with no awkward wrapping, clipping, or overflow
why_human: visual layout and legibility judgments that grep and static analysis cannot evaluate
result: pass

### 2. DESIGN.md prose accuracy

Read DESIGN.md's Layout, Elevation & Depth, Components, and Do's and Don'ts prose
sections and confirm they describe shipped behaviour accurately. The guarded tables are
already machine-verified against source; this is about the surrounding sentences.

expected: prose is accurate, and no claim exceeds what the token/parity guard actually checks
why_human: 12-03-PLAN.md tags this a backstop truth ("the accuracy of the surrounding sentences is a reading judgment confirmed at UAT")
result: pass

### 3. No stray contrast ratio outside the guarded table

Confirm DESIGN.md never restates a computed contrast ratio outside the guarded Contrast
record table. Prose may cite the 4.5:1 WCAG threshold, or explicitly-labelled history
from `07-EVIDENCE.md`, but not a fresh computed figure.

expected: no stray ratio
why_human: tagged `verification: judgment` in 12-03-PLAN.md's prohibitions block — a soft gate requiring explicit human sign-off. The verifier's own grep (`[0-9]\.[0-9]{1,3}:1`) found only the 4.5:1 constant and labelled history, but an automated scan is not sign-off for a judgment-tier prohibition.
result: pass

### 4. The `/design-system` walkthrough actually occurred

`/design-system` cannot be captured automatically — it needs a signed-in browser
(WINDOWS entry 39). Gate Section 4 recorded that the end-of-phase UAT covers it in place
of manual screenshots.

expected: item 1's walkthrough was genuinely performed against a running app, not inferred from code
why_human: the substitute for automated visual capture; if this is skipped, the phase's most-changed page has no visual evidence at all
result: pass

### 5. Local-detector attribution correctness

`scripts/design-system/local-detector-run.mjs`'s `pageKeyFor` helper mis-buckets every
finding under the home page via a string-prefix match (WINDOWS entry 55). 12-07
recomputed true attribution from each finding's raw `file` field: the four gating
findings are on `/pricing`, `/research/wow-classic-loot-systems-2026`, and `/changelog`
— **not** `/` as `12-05-SUMMARY.md` records.

expected: the corrected attribution in 12-EVIDENCE.md is right, and 12-05-SUMMARY.md's
superseded figures are understood as superseded rather than contradictory
why_human: judging which of two conflicting recorded attributions is authoritative
result: pass

### 6. ROADMAP MVP / user-story framing (process item)

ROADMAP Phase 12 is marked `**Mode:** mvp` but its goal is not in user-story form.
`mvp-uat-framing` halts UAT generation on that combination. This does not affect
ENF-01/02/03's substance.

Note: `/gsd-mvp-phase 12` is no longer the right tool — it routes into plan-phase, which
hard-stops on a phase that has already executed. The real choice is editing the goal into
user-story form (keeping `Mode: mvp`, since MVP mode genuinely shaped the plans — 12-02
is a tracer slice) versus dropping the `Mode:` line (simpler, but misrepresents how the
phase was planned).

expected: resolved before a standard `/gsd-verify-work 12` pass
why_human: a decision about planning-artifact intent, not a testable behaviour
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
