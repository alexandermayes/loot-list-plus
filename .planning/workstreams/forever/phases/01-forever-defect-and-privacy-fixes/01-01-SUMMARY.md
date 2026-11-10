---
phase: 01-forever-defect-and-privacy-fixes
plan: 01
subsystem: api
tags: [nextjs, supabase, blp, loot-history, audit-log, vitest]

requires:
  - phase: none
    provides: first plan of the first phase in the forever workstream
provides:
  - "DELETE /api/loot-history/bulk (ids and raid_event_id) awaits recomputeBlpForItems for every affected item before answering"
  - "PATCH /api/loot-history/bulk awaits a recompute when a linked award moves to another raider or is unlinked"
  - "Failed pre-reads answer 500 and write nothing (DELETE both branches, PATCH before-read except PGRST116)"
  - "Award receipts (audit_logs decision_context) keep all nine ScoreComponents keys, whitelist derived from the type"
affects: [06-drop-desk-undo (DESK-07 reads BLP straight after an undo), phase-01 shipping split]

actuals:
  tokens: 7200
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Awaited (not after()) recompute on write paths whose next read must be correct"
    - "Receipt whitelist typed as Record<keyof ScoreComponents, true> so a new component is a compile error until whitelisted"
    - "Route test fake client records filters and a deleted flag so one fake serves read, delete and update paths"

key-files:
  created: []
  modified:
    - app/api/loot-history/bulk/route.ts
    - app/api/loot-history/bulk/__tests__/route.test.ts

key-decisions:
  - "Await the BLP recompute on DELETE and PATCH instead of after() (open question 2 adopted): the success criterion says by the time the request returns"
  - "Unlinking a linked award (character_id null) recomputes, unlike the award-copy guard, because BLP is keyed on character_id"
  - "PGRST116 (no row) on the PATCH before-read keeps today's 200; every other read error is a 500 before any write"
  - "Receipt cap keeps its unit: JSON.stringify(...).length (UTF-16 code units), not UTF-8 bytes (assumption A9)"

patterns-established:
  - "Pre-read then write routes must stop on a failed read when a derived value depends on the read rows"

requirements-completed: [FIX-01, FIX-04]

coverage:
  - id: D1
    description: "Deleting one award by id recomputes that item's BLP before the 200 response (awaited, proven by a held-open recompute)"
    requirement: FIX-01
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#the response waits for the recompute (it is awaited, not deferred with after())"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deleting a whole raid night recomputes each distinct item once (E-03), same item twice recomputes once (E-01), empty and unlinked rows recompute nothing (E-02)"
    requirement: FIX-01
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#E-03 deleting a whole night by raid_event_id recomputes each distinct item once, in any order"
        status: pass
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#E-02 rows with a null raid_event_id or a null loot_item_id answer 200 and make no recompute call"
        status: pass
    human_judgment: false
  - id: D3
    description: "Moving or unlinking a linked award awaits a recompute for that item; notes-only, name-only and same-character edits do not"
    requirement: FIX-01
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#PATCH /api/loot-history/bulk BLP recompute (FIX-01)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A failed DELETE pre-read, failed delete or failed PATCH before-read answers 500 and writes or recomputes nothing"
    requirement: FIX-01
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#a failed pre-read (%s) answers 500, deletes nothing and recomputes nothing"
        status: pass
    human_judgment: false
  - id: D5
    description: "Award receipts store all nine score components for the winner and every top candidate, exact values, worst case under the cap"
    requirement: FIX-04
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#POST /api/loot-history/bulk award receipt (FIX-04)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Receipt size cap boundary pinned: 4095 and 4096 characters stored intact, 4097 stored as the _truncated stub (E-11)"
    requirement: FIX-04
    verification:
      - kind: unit
        ref: "app/api/loot-history/bulk/__tests__/route.test.ts#E-11 a sanitized receipt of exactly 4097 characters is stored as the _truncated stub"
        status: pass
    human_judgment: false
  - id: D7
    description: "Concurrent award writes and recomputes for one item converge to the history-derived BLP (E-04, backstop truth)"
    requirement: FIX-01
    verification: []
    human_judgment: true
    rationale: "Backstop truth by plan design: confirmed by reading recompute_blp_for_item and recomputeBlpForItems, not by a route test. Verifier confirms or abstains to human_needed."

duration: 10min
completed: 2026-10-13
status: complete
---

# Phase 1 Plan 01: Award Delete and Edit BLP Recompute, Full Award Receipts Summary

**Awaited BLP recompute on award DELETE (ids and whole night) and PATCH reassign or unlink, with failed reads answering 500 before any write, plus award receipts that keep donation and raider bonus through a ScoreComponents-typed whitelist**

## Performance

- **Duration:** 10 min (this continuation; the tracer task was done by the previous executor in the same plan window)
- **Started:** 2026-10-13T20:47:08Z
- **Completed:** 2026-10-13T20:57:18Z
- **Tasks:** 3 (1 tracer, 2 auto)
- **Files modified:** 2 (both under `app/api/loot-history/bulk/`)

## Accomplishments

- Deleting an award by id, deleting a whole raid night by `raid_event_id`, and moving or unlinking a linked award each await `recomputeBlpForItems(serviceSupabase, guild_id, ...)` before the response, so the officer's next read of bad-luck protection is already correct. Only the affected item ids are recomputed (distinct, linked rows only).
- A failed DELETE pre-read (either branch) or a failed PATCH before-read (anything but PGRST116) answers 500 before any write, so a delete or reassign can no longer commit with its recompute silently skipped.
- Award receipts now store all nine `ScoreComponents` keys. The whitelist is `COMPONENT_KEY_MAP: Record<keyof ScoreComponents, true>`, so adding a component to the type without whitelisting it fails `npm run typecheck`.
- Test file grew from 38 to 68 tests (30 new): DELETE harness (`deleteRows`, `deleteReadError`, `deleteError`, `deleted` call flag), PATCH `patchBeforeError`, and the receipt and cap-boundary suites.

## Task Commits

1. **Task 1: Tracer, deleting one award recomputes that item's BLP before the response returns** - `bf1ac71e` (fix)
2. **Task 2: Night delete, PATCH reassign and unlink, failed-read 500s** - `f36d4d7b` (fix)
3. **Task 3: Receipt whitelist and the 4095/4096/4097 cap tests** - `9f695aa0` (fix)

**Plan metadata:** recorded in the docs commit that carries this file (`docs(01-01): complete award recompute and receipt plan`).

## Files Created/Modified

- `app/api/loot-history/bulk/route.ts` - awaited recompute on DELETE (both branches) and PATCH, read-error 500s, `blpItemsToRecompute` helper, `COMPONENT_KEY_MAP` whitelist
- `app/api/loot-history/bulk/__tests__/route.test.ts` - DELETE, PATCH-recompute and receipt test suites plus the harness additions

## Verification

- `npx vitest run app/api/loot-history/bulk domain/scoring`: 9 files, 422 tests passed.
- `npx tsc --noEmit` ignoring stale `.next/` output: 0 errors. `npx eslint app/api/loot-history/bulk`: clean.
- `git diff --stat -- domain/scoring`: empty (Loot Score golden fixtures untouched, Known-guild guarantee holds).
- Acceptance greps: `await recomputeBlpForItems(serviceSupabase, guild_id` appears 3 times (ids, raid_event_id, PATCH); `PGRST116` present; the pre-read select with `raid_event_id` appears 2 times; `Record<keyof ScoreComponents, true>` 1; `donationBonus: true` 1; `raiderBonus: true` 1; `MAX_AUDIT_PAYLOAD_BYTES = 4096` 1.
- No em dashes in any line added to the two code files.

### One-time non-vacuity checks (both reverted)

1. **after() wrapping fails the await test (Task 1, previous executor):** wrapping the DELETE recompute in `after(() => ...)` made exactly one test fail (the pending-until-released test); the route was restored byte for byte.
2. **Deleting a map key fails typecheck (Task 3):** removing `raiderBonus: true` from `COMPONENT_KEY_MAP` made `tsc --noEmit` report `route.ts(21,7): error TS2741: Property 'raiderBonus' is missing in type ... but required in type 'Record<keyof ScoreComponents, true>'`. Restored; typecheck back to 0 errors.

## Decisions Made

- Awaited recompute everywhere (researcher default OQ2), accepting assumption A1 below.
- Unlinking includes a recompute on purpose (one-line comment in the route).
- The A9 unit is preserved and pinned by the E-11 tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Process slip, no code impact:** while doing the typecheck non-vacuity check I ran `git checkout -- app/api/loot-history/bulk/route.ts` to undo the temporary key deletion. Because Task 3's route edit was not yet committed, that also discarded it. I had taken a backup of the file immediately before the deletion, restored it, and re-ran vitest (422 passed), tsc (0 errors) and eslint (clean) before committing Task 3. Nothing was lost; noted so the next non-vacuity check commits or copies first.

## Assumptions and Observations

- **A1 (DELETE latency):** no real latency was measured. Every test mocks the recompute RPC, and no deployed whole-night delete was run. The route exports no `maxDuration`. If a real night times out, the planned fallback is `after()` for the `raid_event_id` branch only. Open: someone should time one real whole-night delete after ship.
- **A9 (receipt cap unit):** the cap compares `JSON.stringify(sanitized).length` with `> 4096`. That counts UTF-16 code units, not UTF-8 bytes, so a receipt with non-ASCII names can hold more than 4096 bytes. The E-11 tests pin this existing unit at 4095, 4096 and 4097 characters. Switching to a byte count is outside FIX-04 and was not done.
- **E-04 (backstop truth, left for the verifier):** `recomputeBlpForItems` rebuilds each item through the `recompute_blp_for_item` RPC from history at execution time and is documented as idempotent and order-independent. One caveat worth the verifier's attention: it logs RPC errors that Supabase returns, but a thrown exception (for example a network failure inside `supabase.rpc`) is not caught there. On DELETE or PATCH that would reach the route's outer try/catch and answer 500 after the write had committed. This was not changed (`utils/blp/recompute.ts` is outside the plan) and is not covered by a test.
- **E-12 note:** JSON has no NaN or Infinity, so over HTTP both arrive as null; the sanitizer drops them either way. The test sends them through `JSON.stringify` and asserts the stored result.
- **Accepted cost (A1):** the raid tracking re-import flow (DELETE by `raid_event_id`, then POST) now recomputes each item of the night twice, once awaited on DELETE and once in `after()` on POST. Both runs are idempotent.

## Open Follow-up Todo for the Owner (owner decision 6, 2026-10-13, assumption A8)

The owner accepted deferring these; no code was written for them in this phase. Please schedule:

- **BLP recompute on account deletion:** `app/api/user/delete-account/route.ts` deletes the departing account's `loot_history` rows without recomputing BLP. Until fixed, other raiders' BLP for the items in those rows can stay stale until that item's BLP is next rebuilt from history (a later raid-linked award write, edit or delete of the same item in the guild triggers that).
- **Raid event deletion cascade:** deleting a raid event cascades to its `loot_history` rows and that path is not audited and does not recompute BLP.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths or schema changes. The route still filters every pre-read, delete and update on the verified `guild_id`, and no user-supplied value goes into the first argument of any console call.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FIX-01 and FIX-04 are done for the bulk route; this is also the prerequisite for Desk undo (DESK-07, Phase 6).
- Shipping: PR 1 of the phase, code only on its own `fix/...` branch, no migration, no ordering constraint against the other PRs. The three commits above are the PR's content; this plan did not create the branch or PR.
- Ready for the other wave 1 plans (01-02, 01-03, 01-06).

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*

## Self-Check: PASSED

- FOUND: app/api/loot-history/bulk/route.ts
- FOUND: app/api/loot-history/bulk/__tests__/route.test.ts
- FOUND commits: bf1ac71e, f36d4d7b, 9f695aa0
