---
phase: quick-260929-qg0
verified: 2026-09-30T06:15:00Z
status: human_needed
score: 10/11 must-haves verified
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "D-11 (FU-1): saveSubmission checks active membership before its upsert, the same way auto-save does, and shows C-1 when the character is not an active member."
    test: "In the app, as a raider whose character's membership is inactive (or removed) in the selected guild, open the loot list and press Save, then Submit."
    expected: "The error toast reads 'Your character needs to rejoin this guild.', no loot_submissions upsert or save_submission_items request is sent, and the saving spinner clears."
    why_human: "LootListContext has no unit test for saveSubmission; the throw-inside-try path and the setIsSaving(false) reset are read from code only."
human_verification:
  - test: "saveSubmission membership check in the running app (see behavior_unverified_items)."
    expected: "C-1 toast, no write, spinner clears."
    why_human: "No automated test covers the React context path."
  - test: "After deploy, as a raider with an active membership: edit an approved list (auto-save to draft), Save, Submit; as an officer: approve, then reject another pending list and revert a resubmitted one."
    expected: "Every step succeeds exactly as before the change."
    why_human: "The database proof runs in PGlite with stand-ins for auth, roles and PostgREST; it relies on the same session-role behaviour inside SECURITY DEFINER functions as the live #313 trigger, but the live Supabase path is not exercised here."
  - test: "Optional, read-only, before merge: count loot_submissions with status in ('pending', 'approved') and no active character_guild_memberships row for (character_id, guild_id)."
    expected: "Informational. Such rows stay editable because the rules fire only on entry into pending or approved and on moves."
    why_human: "No SQL against a real database was allowed in this task."
---

# Quick 260929-qg0: Enforce loot list status rules Verification Report

**Goal:** Enforce loot list status rules on loot_submissions writes (only officers or the service role move a list to pending or approved, an active membership is required, review fields, list items and snapshots follow the same rules), plus submit, review, revert and saveSubmission return clear errors for raiders who are not active members.
**Verified:** 2026-09-30 (worktree `scratchpad/wtls`, branch `fix/loot-list-status-rules`)
**Status:** human_needed
**Re-verification:** No, initial verification

## Branch state

- 4 local commits over origin/main 77afa063 (the SUMMARY lists 3; a 4th, comment-only commit 39097704 "docs(loot-lists): clarify when the review-trail rule is skipped" rewords three header comment lines of the migration and changes no SQL). All checks below ran after that commit.
- No upstream configured; `git ls-remote --heads origin 'fix/loot-list*'` returns nothing, so nothing was pushed.
- Working tree clean; the diff touches only the 9 planned files (no planning files).

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | D-02 R1 for every role: entry into pending or approved (INSERT, status change, guild or character move) needs an active membership; NULL ids count as none; service_role gets 23514 with DETAIL | VERIFIED | Migration lines 140-172: `v_live` COALESCEs a NULL status to false; `v_enters` covers INSERT and UPDATE with a status, guild_id or character_id change; the NOT EXISTS lookup fails for NULL ids. PGlite T6, B8 to B8e (23514 with DETAIL, including NULL character_id, INSERT in approved, guild and character moves) |
| 2 | D-02: moves into draft or rejected never blocked; cgm-loss auto-reject works from service role, raider UPDATE and raider DELETE | VERIFIED | R1 only fires when NEW.status is pending or approved. PGlite B8f, L7e, L13, L13c, L13e |
| 3 | D-03 R2: client callers need is_guild_officer for R1-type entry or for a guild, character, expansion, phase or tier change of a pending or approved row; 42501 with RLS message, no DETAIL | VERIFIED | Lines 178-216. is_guild_officer returns `(target_guild_id IS NOT NULL) AND (...)`, never NULL, so `NOT is_guild_officer(...)` cannot fall through. PGlite T3, T5, T5b, B1, B1b, B2, B3 to B3c, B7; officer passes in T4, L15, L15c. The harness rejects any 42501 that carries a DETAIL |
| 4 | D-04 R3: review fields NULL or unchanged for client non-officers; skipped when pg_trigger_depth() > 1 | VERIFIED | Lines 183-197; pg_trigger_depth appears once. PGlite B4 to B4f, L13c and L13e (nested auto-reject from the raider session), L15d (officer) |
| 5 | D-05 R4: client non-officer INSERT (including the upsert insert phase) and guild or character moves need an owned character with an active membership | VERIFIED | Lines 199-210 (anon has NULL auth.uid() and fails). PGlite B5 to B5f, B6; upsert modelled as INSERT ... ON CONFLICT DO UPDATE, so the BEFORE INSERT phase is exercised (B2, B5f, L1 to L4) |
| 6 | D-06 items rule: client non-officers cannot insert, update or delete items of a pending or approved parent (including save_submission_items); draft and rejected writable; missing parent does not block | VERIFIED | Lines 230-281; UPDATE checks old and new parents. PGlite B9 (all 16 cases), B9b, B9c, and the cascade cases L16 to L18 pass without a depth exemption |
| 7 | D-07: no anon or authenticated snapshot INSERT; service role still writes and reads | VERIFIED | Statement 11 drops the only INSERT policy (baseline has only insert and select policies on the table). PGlite B10 to B10d, L6 to L6b |
| 8 | D-09: every legitimate flow still works | VERIFIED | Trigger is UPDATE OF the ten columns and all rules compare NEW with OLD. PGlite L1 to L18 (auto-save, rejected edit, fresh draft, saveSubmission shape, submit, approve, reject, revert and fallback, remove-item, reminder cron, phase merge and review_notes on a legacy row, cgm-loss three ways, rejoin, officer paths, deletes and cascades), B3d (re-sent unchanged values) |
| 9 | D-10: submit 403 C-1, review approve and revert snapshot path 400 C-2 before any write; 23514 mapped; lookup error 500 | VERIFIED | Route diffs place the check before the resubmission_count update (submit), before the snapshot block (review, approve only) and after the no-snapshot fallback but before the item DELETE (revert). 21 route tests pass, including "writes nothing" and 500 cases |
| 10 | D-11: saveSubmission checks membership before its upsert and shows C-1 | PRESENT_BEHAVIOR_UNVERIFIED | LootListContext.tsx 886-898: same query as auto-save, `throw new Error('Your character needs to rejoin this guild.')` inside the try, so the existing catch shows it and `setIsSaving(false)` after the try/catch runs. No test exercises it; routed to human verification |
| 11 | D-12: neutral wording, no em dashes, nothing pushed, no PR | VERIFIED | Added lines and all 4 commit messages: 0 em dashes, 0 en dashes, 0 matches for the plan's wording regex. No upstream, no remote branch |

**Score:** 10/11 truths verified (1 present, behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/20260930000000_enforce_loot_list_status_rules.sql` | VERIFIED | 11 statements; both functions plpgsql SECURITY DEFINER, search_path public, pg_temp; REVOKE ALL from PUBLIC, anon, authenticated; CREATE OR REPLACE for functions and triggers and DROP POLICY IF EXISTS, so re-runnable; header Rollback recreates the snapshot policy verbatim from baseline line 4157 |
| `app/services/__tests__/loot-list-status-rules-migration.test.ts` | VERIFIED | 14 shape tests pass |
| `app/api/loot-submissions/submit/route.ts` | VERIFIED | findInvalidCharacterIds pre-check, 23514 mapping |
| `app/api/loot-submissions/review/route.ts` | VERIFIED | Approve-only pre-check before snapshot write, 23514 mapping |
| `app/api/loot-submissions/revert/route.ts` | VERIFIED | Snapshot-path pre-check before item DELETE, 23514 mapping |
| `app/contexts/LootListContext.tsx` | VERIFIED (presence) | C-1 text present in saveSubmission before the upsert |
| `scratchpad/pglite-qg0/scenarios-qg0.mjs` | VERIFIED | Loads the real migration and real baseline statements at run time |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| PostgREST upsert and update on loot_submissions | enforce_loot_submission_status_rules() | WIRED | BEFORE INSERT OR UPDATE OF the ten columns, FOR EACH ROW; exercised by PGlite upsert scenarios |
| submit, review, revert routes | R1 backstop | WIRED | Each route imports and calls findInvalidCharacterIds and maps 23514 |
| reject_submissions_on_cgm_loss | status rules trigger | WIRED | Nested UPDATE to rejected passes R1 and R2, R3 skipped by depth (PGlite L13 series) |
| save_submission_items and direct item writes | enforce_loot_submission_item_rules() | WIRED | current_setting('role', true) read inside the SECURITY DEFINER body; PGlite B9 save_submission_items cases |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| New tests | `npx vitest run` on submit, review, revert and the shape test | 4 files, 35 tests passed | PASS |
| Full suite (run once) | `npx vitest run` | 136 files, 2513 tests passed | PASS |
| Types | `npx tsc --noEmit` | exit 0, no output | PASS |
| Lint on changed files | `npx eslint ...` | 0 errors, 2 warnings on lines outside the diff (pre-existing) | PASS |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| PGlite proof | `node scenarios-qg0.mjs` (re-run by the verifier) | RESULT 146/146 passed, 0 FAIL, exit 0 | PASS |
| libpg-query parse | existing `parse-output-qg0.txt` | 11 statements and the rollback parsed, 0 failed | PASS (not re-run) |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| QG0-R1 | SATISFIED | Truths 1 to 3 |
| QG0-R2 | SATISFIED | Truth 4 |
| QG0-R3 | SATISFIED | Truth 5 |
| QG0-R4 | SATISFIED | Truth 6 |
| QG0-R5 | SATISFIED | Truth 7 |
| QG0-R6 | SATISFIED | Truth 8 |
| FU-1 | SATISFIED for routes, NEEDS HUMAN for saveSubmission | Truths 9 and 10 |
| DELIVERY-R1 | SATISFIED | Truth 11 |

### Anti-Patterns Found

No TBD, FIXME or XXX markers and no stubs in the changed files.

### Review notes (not blocking)

1. `original_phase` is not in the loot_submissions trigger's column list or in R2. merge_phase_groups' restore pass (service role) sets `phase` from `original_phase`. The must-have lists five columns and all five are enforced, so this is not a failed truth; a follow-up decision on whether R2 should also cover `original_phase` for pending or approved lists is suggested.
2. The new rules read character_guild_memberships (role, is_active). The write rules on that table are handled by the parallel quick task 260929-qzn (OD-3), which ships in the same PR. The combined proof on the joined branch is the orchestrator's step.
3. In the revert route, a 23514 on the final status update arrives after the items were replaced, leaving the list pending with the snapshot items. This is the route's existing non-transactional order and only happens if membership changes between the pre-check and the write.
4. SUMMARY's note on the officer-session bulk delete (baseline delete policy is owner-only) is pre-existing and unchanged by this task.

### Gaps Summary

No blocking gaps. All database rules are proven in PGlite against the real migration and baseline statements, the route checks are proven by unit tests, and the text and delivery gates pass. One truth (the saveSubmission check) is present and wired but has no automated test, so the status is human_needed.

---

_Verified: 2026-09-30_
_Verifier: Claude (gsd-verifier)_
