---
phase: 02-checkable-conversion-copy
plan: 01
subsystem: marketing-copy
tags: [audit, evidence, supabase-management-api, testimonials, seo-metadata, wow-classic]

requires: []
provides:
  - "Unverifiable-claim findings across homepage, /about, /pricing, /compare, and both blog posts"
  - "Full 34-occurrence WoW Classic / World of Warcraft Classic repositioning inventory across 13 files"
  - "Expansion count fact-check (5 Classic expansions, confirmed consistent across /about and /pricing)"
  - "Guild verification data (Warcraft Logs URL + activity status) for all 4 homepage QuoteCard guilds"
  - "User-supplied per-quote metadata and finalized testimonial disposition, implementation-ready for plan 02-04"
affects: ["02-02 (copy drafting)", "02-04 (testimonial implementation)"]

actuals:
  tokens: 6504
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Read-only Supabase Management API lookup (keychain-backed personal access token, no new env vars, no new runtime route) for one-time authoring-time guild verification"

key-files:
  created:
    - ".planning/phases/02-checkable-conversion-copy/02-COPY-AUDIT.md"
  modified: []

key-decisions:
  - "Homepage quote count confirmed at 4, not the 5 CONTEXT.md D-01 assumed — the codebase never had a 5th quote and the user confirmed 4 is correct"
  - "User set a stricter, previously undocumented testimonial policy: any quoted guild that does not resolve to a real, active guilds row would be excluded entirely rather than published with approximated data"
  - "That exclusion path was evaluated and not triggered — a second, user-authorized read-only query resolved Indecisive and Bad Guys as real, active guilds under a bracketed guild-tag naming convention (<Indecisive>, <bad guys>); all 4 quotes stay up"
  - "All four quotes carry NOT SUPPLIED for role/expansion-tier/interview-date per D-02 — the user acknowledged the request but did not supply the data, so no card gets that metadata added"
  - "Two Warcraft Logs guild links confirmed for publication (Indecisive, Soul Stoned) per explicit user consent; Crucible and Bad Guys get the plain text-only verified-customer note"

patterns-established:
  - "Read-only, keychain-backed Management API queries are re-runnable mid-execution when the user explicitly authorizes a follow-up (e.g. a fuzzy-match pass) without violating the original 'one query' plan constraint, as long as the additional query stays read-only, aggregate-only, and user-directed"

requirements-completed: [PROOF-01, PROOF-02]

coverage:
  - id: D1
    description: "Unverifiable Claim Findings: swept homepage, /about, /pricing, /compare, and both blog posts for unverifiable marketing claims, with proposed dispositions per row"
    requirement: PROOF-02
    verification:
      - kind: automated
        ref: "grep -q '^## Unverifiable Claim Findings' 02-COPY-AUDIT.md; presence of required rows for LandingValueProps.tsx:143/128, LandingCompare.tsx:91, site.webmanifest:4, compare/page.tsx:32"
        status: pass
    human_judgment: true
    rationale: "Sweep completeness (whether every unverifiable claim across the marketing surface was found) is a judgment call reviewed at the D-16 sign-off; only structural presence of the required rows was automated-verified here."
  - id: D2
    description: "Repositioning Inventory: one row per in-repo WoW Classic / World of Warcraft Classic occurrence (34 rows across 13 files), each with a disposition and a reason for every keep"
    requirement: PROOF-02
    verification:
      - kind: automated
        ref: "grep -rcE 'WoW Classic|World of Warcraft Classic' app/ public/site.webmanifest README.md reconciled to 34 occurrences / 13 files, matching the audit table exactly with zero drift"
        status: pass
    human_judgment: false
  - id: D3
    description: "Expansion Fact Check: confirmed the product supports exactly 5 Classic expansions by cross-referencing /about and /pricing's already-shipped copy"
    requirement: PROOF-02
    verification:
      - kind: automated
        ref: "grep -q '^## Expansion Fact Check' 02-COPY-AUDIT.md; both source strings quoted verbatim"
        status: pass
    human_judgment: true
    rationale: "The cross-reference conclusion (5 expansions, both sources agree) was manually reasoned from file content read this session, not asserted by an automated equality check."
  - id: D4
    description: "Guild Verification Data: resolved Warcraft Logs URL and 30-day activity status for all 4 homepage QuoteCard guilds via read-only Supabase Management API queries"
    requirement: PROOF-01
    verification:
      - kind: automated
        ref: "grep -q '^## Guild Verification Data' and '^ACTIVITY-WINDOW: ' in 02-COPY-AUDIT.md; no UUID pattern, no sbp_/service_role/eyJhbGciOi token prefix anywhere in the artifact"
        status: pass
    human_judgment: true
    rationale: "Matching the bracketed guild-tag name on file (<Indecisive>, <bad guys>) to the plain-text testimonial guild name is a human judgment call on data correctness, not an automated equivalence check. The no-secrets/no-UUID safety checks passed automated grep."
  - id: D5
    description: "Quote Metadata and Testimonial Disposition: recorded user-supplied per-quote answers (all NOT SUPPLIED) and finalized which quotes stay, which get links, ready for plan 02-04 to implement without guessing"
    requirement: PROOF-01
    verification:
      - kind: automated
        ref: "grep -c 'NOT SUPPLIED' 02-COPY-AUDIT.md returns 9 (3 fields x 4 quotes minus context lines); '## Quote Metadata (user supplied)' heading present"
        status: pass
    human_judgment: true
    rationale: "Reflects direct user-supplied answers and a user-directed testimonial policy; fidelity to what the user actually said is the correctness bar, which plan 02-04 and the D-16 sign-off confirm by re-reading this section, not by an automated check."

duration: 55min
completed: 2026-08-29
status: complete
---

# Phase 2 Plan 1: Evidence Audit and Guild/Quote Verification Summary

**Full-surface unverifiable-claims audit, a 34-occurrence WoW Classic repositioning inventory, and a two-query Supabase Management API lookup that resolved all four homepage testimonial guilds as real and active — confirming the quote count stays at 4 with no exclusions, contrary to the exclusion policy the user set mid-checkpoint.**

## Performance
- **Duration:** 55 min
- **Started:** 2026-08-29T00:00:00Z (approx, session start)
- **Completed:** 2026-08-29T01:00:00Z (approx)
- **Tasks:** 3 completed (1 auto, 1 auto, 1 checkpoint:human-action)
- **Files modified:** 1 (`.planning/phases/02-checkable-conversion-copy/02-COPY-AUDIT.md`, created then extended across all three tasks)

## Accomplishments
- Swept the full marketing surface (homepage components, /about, /pricing, /compare, both blog posts, and the site-wide metadata that cascades from `app/layout.tsx`) and recorded 11 unverifiable-claim findings, each with a proposed disposition, none pre-applied — all deferred to the D-16 sign-off in plan 02-02
- Inventoried every one of the 34 in-repo "WoW Classic" / "World of Warcraft Classic" occurrences across 13 files, reconciled exactly against a fresh grep with zero drift, and flagged the one bundled sign-off question (blog post title/H1/JSON-LD headline) RESEARCH.md called out as SEO-risk-sensitive
- Fact-checked the "5 supported Classic expansions" replacement stat (D-06) against already-shipped copy on /about and /pricing — confirmed accurate and consistent
- Ran two read-only, aggregate-only Supabase Management API queries (the planned one, plus one user-authorized follow-up) to resolve Warcraft Logs URLs and 30-day activity status for all four homepage testimonial guilds — no guild UUIDs, tokens, or player-level data ever entered the committed artifact
- Closed out the Task 3 checkpoint with the user's answers: quote count confirmed at 4, per-quote role/expansion/interview-date fields marked NOT SUPPLIED per D-02, and a finalized Testimonial Disposition table plan 02-04 can implement directly

## Task Commits
Each task was committed atomically:
1. **Task 1: Audit marketing surface, repositioning inventory, expansion fact-check** - `9cfb92d` (docs)
2. **Task 2: Resolve Warcraft Logs URL and activity flag via Management API** - `40d7045` (docs)
3. **Task 3: Collect user-supplied quote metadata and finalize testimonial disposition** - `25a1da3` (docs)

**Plan metadata:** committed together with this SUMMARY (see final commit below).

## Files Created/Modified
- `.planning/phases/02-checkable-conversion-copy/02-COPY-AUDIT.md` - the single evidence artifact plan 02-02 and plan 02-04 draft/implement from; contains Unverifiable Claim Findings, Repositioning Inventory, Expansion Fact Check, Guild Verification Data, Quote Metadata (user supplied), and Testimonial Disposition sections

## Decisions Made
- Homepage quote count confirmed at 4 (CONTEXT.md D-01's "5 quotes" was a documentation drift against the actual codebase, not a real 5th quote)
- User set a new, stricter testimonial policy at the checkpoint: any quoted guild that fails to resolve to a real, active `guilds` row gets excluded entirely rather than published with approximated verification data — this was evaluated (see Deviations) and did not end up excluding anyone
- Per-quote role/expansion-tier/interview-date all marked `NOT SUPPLIED` per D-02; no metadata is invented
- Outbound Warcraft Logs links confirmed for Indecisive and Soul Stoned per explicit user consent; Crucible and Bad Guys (no public WCL URL on file) get the plain text-only note

## Deviations from Plan

**1. [User-directed, not a Rule 1-4 auto-fix] Ran a second read-only Management API query beyond the plan's "exactly one query" instruction**
- **Found during:** Task 3 checkpoint follow-up
- **Issue:** The plan's Task 2 instructed exactly one Management API query. That query returned zero matches for "Indecisive" and "Bad Guys" (case-insensitive, trimmed exact match), which the plan's own flagged assumption treats as a valid terminal state ("UNRESOLVED, ask user"), not a bug to auto-fix.
- **Why deviated:** At the Task 3 checkpoint, the user set a policy that made resolving those two guilds materially important (guilds that don't exist get their testimonial excluded entirely) and explicitly instructed: "before concluding they're unverifiable, do one more reasonable read-only verification pass (fuzzy/partial match, common spacing/punctuation variants, alternate display name) using the same Management API guild lookup you already used." This is an explicit, scoped, read-only instruction from the user relayed through the coordinator, not an executor-invented workaround.
- **Fix:** Ran one additional query using `ILIKE '%indecisive%'` / `ILIKE '%bad%guy%'` against `guilds.name` only (same three-column selection as the original query, no `guilds.id`, no player-level data). Both resolved to exactly one row each, under a bracketed guild-tag naming convention (`<Indecisive>`, `<bad guys>`).
- **Files modified:** `.planning/phases/02-checkable-conversion-copy/02-COPY-AUDIT.md` (Guild Verification Data section updated to reflect the resolved rows; the update itself documents that two total queries were run and why)
- **Verification:** Post-query grep checks confirmed no UUID pattern and no token/secret prefix entered the artifact; the response was written only to the session scratch directory and deleted immediately after the derived rows were transcribed.
- **Commit:** `25a1da3`

---
**Total deviations:** 1 (user-directed query authorization, not an executor auto-fix under Rules 1-4)
**Impact on plan:** None negative. The plan's safety constraints (read-only, aggregate-only, no identifiers committed) were preserved exactly; only the count of permitted queries changed, and only because the user explicitly authorized it after seeing the first query's result.

## Issues Encountered
None beyond the deviation above. The Supabase CLI keychain precondition for Task 2 resolved successfully on the first check.

## Authentication Gates
None. The macOS keychain entry "Supabase CLI" resolved on the first precondition check; no auth gate was hit.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None. This plan produces a planning artifact only; no application code or UI was touched, and no stubbed data was introduced.

## Next Phase Readiness
Plan 02-02 can draft every string this phase needs (unverifiable-claim replacements, repositioning wording, expansion stat) directly from `02-COPY-AUDIT.md` without returning to the codebase or database for a fact. Plan 02-04 has a finalized, implementation-ready Testimonial Disposition table and does not need to re-resolve any guild or re-ask the user for quote metadata. No blockers for either downstream plan.

---
*Phase: 02-checkable-conversion-copy*
*Completed: 2026-08-29*
