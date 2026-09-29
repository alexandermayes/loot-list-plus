---
phase: 02-checkable-conversion-copy
plan: 05
subsystem: seo-metadata
tags: [metadata, seo, jsonld, precondition-resolved]
requires: []
provides:
  - "app/layout.tsx, app/(landing)/landing/page.tsx, app/changelog/layout.tsx, and app/compare/page.tsx all repositioned to World of Warcraft with the D-09/D-10/D-11 metadata rewrite applied"
  - "The /compare APP_URL domain defect fixed (G3), so every CTA on that page now sends officers to the signup domain instead of the marketing homepage"
affects: [app/layout.tsx, "app/(landing)/landing/page.tsx", app/changelog/layout.tsx, app/compare/page.tsx]
actuals: {tokens: 15000, tasks: 3, commits: 3}
tech-stack: {added: [], patterns: []}
key-files:
  created: []
  modified:
    - app/layout.tsx
    - "app/(landing)/landing/page.tsx"
    - app/changelog/layout.tsx
    - app/compare/page.tsx
key-decisions:
  - "Task 1 shipped exactly as approved, no deviation."
  - "Task 2's precondition (a RESIDUAL-ALLOWANCE line for app/changelog/layout.tsx) was genuinely missing from 02-COPY-DRAFT.md; the executor correctly halted rather than proceed on an unmet precondition or accept an orchestrator's assertion that a signed-off document's bookkeeping gap was fine to close. The actual user confirmed the fix directly (\"yes confirmed\") before the orchestrator added the line and completed Tasks 2-3 itself."
  - "Homepage/changelog title split applied per D-09/D-10 to fix the /changelog query-cannibalization finding (514/597 impressions on the top generic query at 0.19% CTR)."
  - "Compare page's three self-descriptions (metadata.description, openGraph.description, jsonLd.description) now agree, using the corrected 3-of-6 AI-citation figure."
  - "/compare's APP_URL constant fixed from https://www.getlootlist.com to https://www.lootlistplus.com (G3), matching every sibling marketing-to-signup CTA in the codebase."
patterns-established: []
requirements-completed: []  # Shared with sibling plans (COPY-01/PROOF-02); orchestrator reconciles REQUIREMENTS.md once all declaring plans in this phase finish.
coverage:
  - id: D1
    description: "Root layout metadata title/description/openGraph-alt and both JSON-LD @graph node descriptions broadened from WoW Classic to World of Warcraft"
    requirement: "PROOF-02"
    verification:
      - kind: unit
        ref: "npm run typecheck; residual-allowance parity check for app/layout.tsx"
        status: pass
    human_judgment: false
  - id: D2
    description: "Homepage and changelog titles/descriptions authored together to fix query cannibalization (D-09/D-10), openGraph/twitter drift closed on the homepage"
    requirement: "PROOF-02"
    verification:
      - kind: unit
        ref: "npm run typecheck; residual-allowance parity check for both files; git diff confirms LandingHero.tsx and locked fields (canonical, image, siteName, locale, type) untouched"
        status: pass
    human_judgment: false
  - id: D3
    description: "Compare page's title/description/openGraph/jsonLd rewritten to checkable, non-superlative claims (D-11) using the verified 3-of-6 AI-citation figure; APP_URL domain defect fixed"
    requirement: "PROOF-02"
    verification:
      - kind: unit
        ref: "npm run typecheck; npm test (768/768); npm run lint (0 errors); residual-allowance parity check; diff-scoped em-dash grep clean; JSON-LD plain-prose check clean"
        status: pass
    human_judgment: false
duration: 95min
completed: 2026-08-31
status: complete
---

# Phase 02 Plan 05: Search Surface Metadata Sweep Summary

**Root layout, homepage, changelog, and compare page all repositioned to World of Warcraft with checkable D-09/D-10/D-11 metadata, plus the /compare APP_URL domain defect fixed.**

## Performance

- Duration: ~95min (Task 1: ~25min, then a precondition halt, then Tasks 2-3 completed after the bookkeeping gap was resolved with direct user confirmation)
- Tasks completed: 3 of 3
- Files modified: 4 (`app/layout.tsx`, `app/(landing)/landing/page.tsx`, `app/changelog/layout.tsx`, `app/compare/page.tsx`)

## Accomplishments

- Task 1 (root layout sweep): all six occurrences of the narrower positioning phrase in `app/layout.tsx` resolved per the approved disposition table, title default, description, openGraph image alt, and both JSON-LD `@graph` node descriptions now read "World of Warcraft". The `keywords` array (line 40) was left byte-identical per its approved "keep" disposition.
- Task 2 (homepage + changelog, authored together per D-09/D-10): homepage title now leads with searched terms ("Loot Lists, Attendance & Loot Score Tracking"), its description/openGraph.description/twitter.description drift is closed (all three now agree, none carries the dropped "ultimate"/"Classic" superlative), and the changelog gets an unambiguous changelog-intent title and description with no noindex.
- Task 3 (compare page): title/description/openGraph/jsonLd rewritten to checkable claims naming the actual competitor systems and features compared, using the corrected 3-of-6 AI-citation figure (not the originally stated 4-of-6). The `/compare` `APP_URL` constant fixed from the marketing domain to the signup domain (`https://www.lootlistplus.com`), matching every sibling CTA file.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Sweep the root layout first, metadata and JSON-LD graph together | `1bd2d1c` | `app/layout.tsx` |
| 2 | Fix the query cannibalization by authoring the homepage and changelog titles together | `9cb77f5` | `app/(landing)/landing/page.tsx`, `app/changelog/layout.tsx` |
| 3 | Rewrite the compare page for competitor queries and run the gate battery | `eb637a1` | `app/compare/page.tsx` |

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified

- `app/layout.tsx` - title default, description, openGraph image alt, two JSON-LD `@graph` node descriptions
- `app/(landing)/landing/page.tsx` - title, description, openGraph title/description/image-alt, twitter title/description
- `app/changelog/layout.tsx` - title, description, openGraph title/description
- `app/compare/page.tsx` - metadata title/description, openGraph title/description, jsonLd headline/description, `APP_URL` constant

## Decisions Made

See `key-decisions` in frontmatter. Summary: Task 1 shipped clean. Task 2 correctly halted on a genuine missing precondition (no `RESIDUAL-ALLOWANCE` line existed for `app/changelog/layout.tsx`, since that file was never part of the Section E repositioning inventory). The executor refused an orchestrator-relayed assertion that the gap was fine to close, exactly as its threat model intends for a document carrying the user's sign-off stamp; the actual user then confirmed directly, the orchestrator added the missing bookkeeping line and completed Tasks 2 and 3, verifying every acceptance criterion itself rather than asking the executor to trust a second relayed message.

## Deviations from Plan

**[Process deviation, not a Rule 1-4 code deviation] Tasks 2 and 3 completed by the orchestrator directly, after a genuine precondition halt.**
- **Found during:** Task 2's precondition check.
- **Issue:** `02-COPY-DRAFT.md` was missing `RESIDUAL-ALLOWANCE: app/changelog/layout.tsx = 0` (a planner oversight, that file was correctly excluded from the Section E inventory since it never contained "WoW Classic" text, but Task 2 was scoped to touch it anyway without a corresponding allowance line). The executor correctly refused to proceed on the orchestrator's assertion that adding the line was fine, since `02-COPY-DRAFT.md` carries `SIGN-OFF: APPROVED`, and refused again even after being told the value was "confirmed" via a relayed message, holding out for the actual user's own direct word.
- **Fix:** The user confirmed directly in the conversation. The orchestrator added the line, then completed Task 2 (homepage/changelog) and Task 3 (compare page) itself, verifying every acceptance criterion listed in the plan (typecheck, residual-allowance parity, `LandingHero.tsx`/locked-field untouched checks, em-dash diff scan, JSON-LD plain-prose check, full test suite, lint) before committing.
- **Files modified:** `app/(landing)/landing/page.tsx`, `app/changelog/layout.tsx`, `app/compare/page.tsx`, plus the one-line `02-COPY-DRAFT.md` bookkeeping fix (already present from before this plan's Task 2, applied while resolving the precondition).
- **Verification:** `npm run typecheck` exits 0; `npm test` 768/768 passing; `npm run lint` 0 errors; residual-allowance counts match for all three files; `git diff` confirms `LandingHero.tsx` and every locked field (canonical, image URL/dimensions, siteName, locale, type) untouched; diff-scoped em-dash grep clean; no JSON-LD field contains `<`, `>`, or `&`.
- **Committed in:** `9cb77f5` (Task 2), `eb637a1` (Task 3).

---
**Total deviations:** 1 process deviation (not a code/content deviation). **Impact:** none on the shipped content itself; this is the intended precondition-halt behavior for a checkpoint tied to a signed-off artifact, resolved with genuine, direct user confirmation rather than an agent's relayed assertion.

## Issues Encountered

Task 2's precondition was genuinely unmet when first checked (see deviation above). Resolved before Task 2 or Task 3 shipped anything; no partial or self-approved state was ever committed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready. All four of this plan's files are repositioned and gate-clean. Plan 02-07 (wave 5, the final consistency sweep) can proceed once 02-04 and 02-06 also close out. The `/compare` `APP_URL` fix removes a real defect (officers clicking any CTA on that page previously landed on the marketing homepage instead of the signup flow).

---
*Phase: 02-checkable-conversion-copy*
*Completed: 2026-08-31*
