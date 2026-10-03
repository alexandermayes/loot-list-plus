---
phase: quick-261003-0ru
plan: 01
subsystem: api
tags: [supabase, rls, service-role, nextjs, vitest, pglite]

requires:
  - phase: quick-260929-qg0
    provides: loot_submissions status rule triggers (R1-R4), snapshot policy drop, membership checks reused by the review route's undo branch
provides:
  - "domain/loot/bulk-delete.ts: BulkDeleteTarget, BULK_DELETE_STATUSES, BULK_DELETE_MAX_IDS, BULK_DELETE_CHUNK_SIZE, bulkDeleteIds, bulkDeleteNotice"
  - "DELETE /api/loot-submissions/delete bulk path rewritten onto the service role with submission_ids, chunked delete, count/requested response"
  - "POST /api/loot-submissions/review undo branch (status pending) restoring an approved/rejected list to pending within a 10 minute window"
  - "Approval snapshot retention: the previous snapshot is kept, not replaced, so an undone re-approval can restore it"
  - "app/(app)/loot-submissions/components/review-notification.ts: holds the review Discord DM until the undo window ends"
affects: [loot-submissions, discord-notifications]

actuals:
  tokens: 22641
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Bulk mutation routes take explicit ids from the client (scoped to what the page shows), re-validate shape and size server-side, then execute entirely on the service role after one officer permission check, never falling back to a user-session client that RLS would silently narrow."
    - "A reversible state transition (review undo) is implemented as a same-file sibling function entered by a recognized value of the same status field, guarded by a status-equality filter on the write so a race during the request fails safely instead of silently overwriting."

key-files:
  created:
    - domain/loot/bulk-delete.ts
    - domain/loot/__tests__/bulk-delete.test.ts
    - app/api/loot-submissions/delete/__tests__/route.test.ts
    - app/(app)/loot-submissions/components/review-notification.ts
    - app/(app)/loot-submissions/components/__tests__/review-notification.test.ts
  modified:
    - app/api/loot-submissions/delete/route.ts
    - app/api/loot-submissions/review/route.ts
    - app/api/loot-submissions/review/__tests__/route.test.ts
    - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx

key-decisions:
  - "OD-1 option A: bulk delete targets the ids the officer's page already shows (filtered by expansion, phase, status, team, search), sent explicitly as submission_ids, not a guild-wide server-side target."
  - "OD-2 option A: the undo is fixed (not removed), requiring the approval snapshot-retention change (D-06) so an undone re-approval restores the pre-approval snapshot."
  - "OD-3 option N1: the review Discord DM is held until the undo window ends (toast timeout, close, next review, or page hide/unmount) and discarded on a successful undo, not sent immediately."
  - "OD-4: the server accepts an undo up to 10 minutes after the review (UNDO_REVIEW_WINDOW_MS), well past the page's 8 second toast, as margin for slow requests and clock skew."

requirements-completed: [0RU-R1, 0RU-R2, 0RU-R3, 0RU-R4, DELIVERY-R1]

duration: single session
completed: 2026-10-03
status: complete
---

# Quick Task 261003-0ru: Officer bulk delete and review undo Summary

**Bulk delete now runs on the service role against officer-chosen ids so it removes every raider's list it names, and reviews can be undone within 10 minutes because approval keeps the previous snapshot instead of replacing it.**

## Performance

- **Duration:** single session
- **Tasks:** 3 of 3 completed
- **Files modified:** 9 (5 created, 4 modified)

## Accomplishments

- GH #352 fixed: Delete pending and Delete all delete every list the officer's page shows them (any raider's, not just the officer's own), using the service role after one permission check, with chunked, UUID-validated, de-duplicated ids and a count/requested response the page can warn on.
- GH #353 fixed: an officer can undo an approval or rejection made in the last 10 minutes. The list returns to pending with its review fields and resubmit-reminder state reset exactly as a fresh pending list has them; an undone approval restores the snapshot that existed before that approval (or no snapshot, for a first approval).
- The review Discord DM is held until the undo window is truly over (the 8 second toast ends, the officer closes it, reviews another list, or leaves/hides the page) and is discarded instead of sent when the officer undoes in time.

## Task Commits

1. **Task 1: Officer bulk delete removes every list shown (GH #352)** - `fafd4ecc` (fix)
2. **Task 2: Review route undo and approval snapshot retention (GH #353 server)** - `d3a2f2f8` (fix)
3. **Task 3: Undo on the officer page and the held review DM** - `8814621f` (fix)

All three commits carry the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No migration; no planning or `supabase/` files touched in the worktree.

## OD Resolutions (as applied)

- **OD-1 (option A):** the bulk request's `submission_ids` are exactly `bulkDeleteIds(filteredSubmissions, target)` from the page: the lists currently shown under the selected expansion, phase tab, status filter, team filter and search box. Both bulk buttons are disabled when that list is empty.
- **OD-2 (option A):** fixed, not removed. Required the snapshot-retention change in D-06 (below) so an undone re-approval has something to restore.
- **OD-3 (option N1):** the approval/rejection DM is held, not sent immediately; `createPendingReviewNotification` drops it on a successful undo and sends it on every other way the undo window ends.
- **OD-4 (10 minutes):** `UNDO_REVIEW_WINDOW_MS = 10 * 60 * 1000` in the review route.

## COPY (as shipped, sign-off 2026-10-03)

- **C-1** (400, bulk delete, invalid `submission_ids`): "This page is out of date. Refresh it, then try again."
- **C-2** (Delete pending confirmation): "This will permanently delete the {n} pending {list|lists} shown. Raiders will need to recreate their lists."
- **C-3** (Delete all confirmation): "This will permanently delete the {n} {list|lists} shown, including approved and rejected lists. This action cannot be undone."
- **C-4** (bulk delete warning, count < requested): "Deleted {count} of {requested} lists. The rest changed or were removed after the page loaded."
- **C-5** (400, undo refused): "This review can't be undone anymore. Refresh to see the list's current status."
- **C-6** (undo failure, no server text): "Couldn't undo the review. The list keeps its new status."

C-B1 was not used (OD-2 resolved to option A). Reused existing texts (403 "Only officers can delete loot lists" / "Only officers can review submissions", the roster text, "Failed to delete loot submissions", "Failed to update submission", the delete modal titles and buttons, "Submission deleted", the undo toast's "Approved/Rejected {name}'s submission" and "Reverted {name}'s submission") are unchanged.

## Bulk delete: request and response shape

`DELETE /api/loot-submissions/delete`, bulk path: `{ guild_id, target: 'pending' | 'all', submission_ids: string[] }`.

- Validation order: `guild_id` -> `target` -> `submission_ids` (array, at most 1000 entries, each a UUID; invalid shape/size returns 400 C-1 before any database call) -> de-duplicate -> `verifyPermission` (403 on failure) -> delete.
- Delete runs on the service role in chunks of 100: `.eq('guild_id', guild_id).in('id', chunk).in('status', BULK_DELETE_STATUSES[target]).select('id, character_id, status')`. `BULK_DELETE_STATUSES` is `{ pending: ['pending'], all: ['pending', 'approved', 'rejected'] }`; drafts are never removed by a bulk request.
- Response: `{ success: true, count, requested, message }` where `count` is the number of rows the delete actually returned and `requested` is the number of distinct valid ids sent. A chunk error returns `{ error: 'Failed to delete loot submissions', count, requested }` with 500, after auditing and revalidating whatever was deleted in earlier chunks.
- `logAudit` (service role, one entry listing deleted ids, `count`, `requested`) and `trackEvent('loot_submission_deleted', { count, requested, was_bulk: true })` run whenever `count > 0`; `revalidatePendingSubmissions(guild_id)` always runs.
- The single-submission path (`submission_id` in the body) is unchanged.

## Undo rules (GH #353)

- Entered via `POST /api/loot-submissions/review` with `status: 'pending'` on a list, after the existing auth, body-validation, submission read (now including `reviewed_at`) and officer-permission steps.
- Allowed only when the list's current status is `approved` or `rejected`, `reviewed_at` is present and parses, and `Date.now() - reviewed_at <= 10 minutes`; otherwise 400 C-5. The page's own toast only offers Undo for 8 seconds, so the 10 minute server window is pure margin, not a second UI path.
- The active-membership pre-check (`findInvalidCharacterIds`) runs exactly as the approve branch's; a failing raider gets the existing roster 400 text; a lookup error throws to the outer 500.
- For an **approved** list only: the snapshot this approval wrote is removed first (`DELETE ... WHERE submission_id = $1 AND snapshot_at >= reviewed_at RETURNING ...`, kept in memory), making the previous snapshot (if any) the latest again. A rejected list's undo touches no snapshot.
- The status update is guarded by both `id` and `status = <the status just read>` (`approved` or `rejected`), so a race during the request (another officer, or a concurrent change) fails safely: it sets `status = 'pending'`, `reviewed_at`, `reviewed_by`, `review_notes`, `change_rejected_at` to `null`, and `resubmit_reminded_at`/`resubmit_reminder_count` to their fresh-pending values (`null`/`0`), exactly the state submit and auto-save already leave a pending list in.
- If that guarded update fails or matches no row, any removed snapshot rows are inserted back first (best effort, logged on failure), then: `23514` -> roster 400; no row -> C-5 400; anything else -> 500 "Failed to update submission".
- On success: `logStatusChange` (old status -> pending, `additionalData: { action: 'undo_review', character_id, undone_reviewed_at, snapshots_removed }`), `trackEvent('loot_submission_status_changed', { ..., undo: true })`, `revalidatePendingSubmissions`. `evaluateGuildFunnel` is never called from the undo path: a guild funnel milestone, once set by an approval, is not reversed by undoing that approval.

## Approval snapshot retention (D-06)

One `reviewedAt` timestamp is computed before the snapshot step and reused for both the snapshot's `snapshot_at` and the list's `reviewed_at`, so the undo's `snapshot_at >= reviewed_at` filter removes exactly what that approval wrote. The approve branch now reads the items (error -> 500, no writes), then the latest snapshot by version (`maybeSingle`; error -> 500, no writes); if one exists, every snapshot **except** it is deleted (error -> 500, no writes), then the new snapshot inserts at `latest.version + 1` (or `0` if there was none; error -> 500, no writes). At most two rows per list remain after any approval. Readers checked and left unaffected: the review modal and `revert` (both take the latest by version) and the two research queries (EXISTS check, and latest `snapshot_at` before an award), all of which already tolerate more than one row per list.

## Review DM hold (GH #353, D-08)

`app/(app)/loot-submissions/components/review-notification.ts` exports `sendReviewNotification` (the existing fetch to `/api/discord/send-notification`, now keepalive-aware) and `createPendingReviewNotification`, a small controller (`hold`, `release`, `discard`, `isHolding`) created once per page mount. `handleReview` holds the payload instead of sending it immediately; the 8 second undo-toast timer and the toast's close button both call `release()` before clearing the toast; a `pagehide` listener (and its cleanup) call `release({ keepalive: true })` so closing the tab or navigating away still sends it. A successful undo calls `discard(submissionId)` so the DM for the now-undone review is never sent.

## Verification

**PGlite** (`SP/pglite-0ru/scenarios-0ru.mjs`, run against the rebuilt `pglite-all` harness, `node pglite-all/run.mjs --wt wtofc pglite-0ru/scenarios-0ru.mjs`): **33 PASS, 0 FAIL** in one combined run (DEL-1 through DEL-5, UNDO-1 through UNDO-8). Both `run-output-0ru-task1.txt` and `run-output-0ru-task2.txt` hold this same output: the rebuilt harness's `READY` file did not appear until after Task 2's code was already committed, so the proof for both tasks' SQL shapes ran together in a single pass once the harness was ready, per the resume orchestrator's deferred-PGlite instruction. Deviations from the plan's original harness-copy instructions are documented in the header of `scenarios-0ru.mjs` (adapted to the rebuilt `pglite-all` API: `h.mkList`/`h.asService`/`h.expectOk` etc., invoked directly without the old `--joint --three --0ru` wrapper).

**Vitest:**
- Baseline (`SP/baseline-0ru-vitest.txt`, HEAD `8019a27d`): 168 test files, 3011 tests, EXIT=0, 0 FAIL lines.
- Final (`SP/final-0ru-vitest.txt`, HEAD `8814621f`): 171 test files, 3066 tests, EXIT=0, 0 FAIL lines.
- `SP/0ru-new-fails.sh` gate: 0 new FAIL lines, errors steady at 0, test-file total rose (168 -> 171, the three new files), gate EXIT=0.

**tsc:** `npx tsc --noEmit` EXIT=0 at every checkpoint (Task 1, Task 2, final).

**eslint:** EXIT=0 throughout. `LootSubmissionsContent.tsx` carries the same 4 pre-existing warnings as the Step 0 baseline (`getCanonicalPhase` unused, two `react-hooks/exhaustive-deps`, one `next/image` suggestion) and no new ones. All new/changed files (`domain/loot/bulk-delete.ts` and its test, both route tests, `review-notification.ts` and its test) are clean.

**Text gate:** `git diff origin/main...HEAD -U0` (added lines) and the three commit messages contain no em dash; both are non-empty.

**Git:** 3 commits on `fix/352-353-officer-list-actions`, each with the required trailer; working tree clean; no `.planning/` or `supabase/` files touched; no upstream configured; nothing pushed.

## Deviations from Plan

### Auto-fixed Issues

None beyond the PGlite harness adaptation required by the resume orchestrator's override (not a plan deviation under Rules 1-3: the original harness was lost and explicitly replaced before this execution began). No other Rule 1/2/3 fixes were needed; the plan's design (including D-02 through D-09) implemented cleanly on the first pass, and every test passed without needing a fix-and-retry cycle.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** None. Plan executed as specified, modulo the pre-announced PGlite harness substitution.

## Known Stubs

None. The bulk delete and undo flows are fully wired end to end (no mock data, no placeholder UI states).

## Follow-ups (noted, not part of this task)

- The bulk delete confirmation buttons still read "Keep submission" / "Delete submission" (singular wording left over from the single-delete flow); a later copy pass could make them "Keep lists" / "Delete lists" for the bulk case.
- The review route never sets `reviewed_by`; it has been `NULL` on every row since before this task and the undo's `reviewed_by: null` is therefore a no-op today. Fixing this would be a separate, unrelated change.
- The submit route does not check a list's current status before accepting a resubmission; this task did not touch or need to touch it.
- An undo does not reverse a guild funnel milestone that an approval set (`evaluateGuildFunnel` runs once, by design, and is deliberately not called from the undo path).

## Next Phase Readiness

Both GH #352 and GH #353 are fixed and fully tested (unit, route, and PGlite). No migration is pending. The branch (`fix/352-353-officer-list-actions`, 3 commits on top of `8019a27d`) has not been pushed; a PR can be opened directly from the draft body at `SP/pr-body-0ru.md`.

## Self-Check: PASSED

All 9 created/modified files confirmed present in the worktree (`domain/loot/bulk-delete.ts` and its test, both delete-route files, both review-route files, `review-notification.ts` and its test, `LootSubmissionsContent.tsx`). All 3 commit hashes (`fafd4ecc`, `d3a2f2f8`, `8814621f`) confirmed present in `git log --oneline --all`. This SUMMARY.md and the PR body draft (`SP/pr-body-0ru.md`) confirmed written to disk.

---
*Quick task: 261003-0ru*
*Completed: 2026-10-03*
