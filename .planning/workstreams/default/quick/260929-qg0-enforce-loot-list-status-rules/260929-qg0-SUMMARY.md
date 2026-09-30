---
phase: quick-260929-qg0
plan: 01
status: complete
subsystem: loot-submissions
tags: [database, triggers, rls, loot-lists, api-routes]
requires: []
provides:
  - "public.enforce_loot_submission_status_rules() and its BEFORE INSERT OR UPDATE OF trigger on loot_submissions"
  - "public.enforce_loot_submission_item_rules() and its BEFORE INSERT OR UPDATE OR DELETE trigger on loot_submission_items"
  - "loot_submission_snapshots INSERT policy dropped (service role only writes snapshots)"
  - "Active-membership pre-checks in submit (403), review approve (400), revert snapshot path (400) and saveSubmission"
affects: [loot_submissions, loot_submission_items, loot_submission_snapshots, LootListContext]
tech-stack:
  added: []
  patterns: ["#313 trigger pattern: SECURITY DEFINER plpgsql, session role detection, RLS-equivalent 42501 for client callers, 23514 with DETAIL for others"]
key-files:
  created:
    - supabase/migrations/20260930000000_enforce_loot_list_status_rules.sql
    - app/services/__tests__/loot-list-status-rules-migration.test.ts
    - app/api/loot-submissions/submit/__tests__/route.test.ts
    - app/api/loot-submissions/review/__tests__/route.test.ts
    - app/api/loot-submissions/revert/__tests__/route.test.ts
  modified:
    - app/api/loot-submissions/submit/route.ts
    - app/api/loot-submissions/review/route.ts
    - app/api/loot-submissions/revert/route.ts
    - app/contexts/LootListContext.tsx
decisions:
  - "OD-1 applied: R4 included (client non-officer inserts and guild or character moves need an owned character with an active membership)"
  - "OD-2 applied: loot_submission_snapshots_insert dropped in the same migration"
  - "OD-4 applied: new singular C-2 for review and revert"
  - "No pg_trigger_depth fallback in the items trigger: every cascade scenario passed without it"
  - "Follow-up: original_phase follows the R2 rescope rule like phase (merge_phase_groups restores phase from it)"
metrics:
  duration: "about 20 minutes"
  completed: 2026-09-29
estimate:
  tokens: 210000
  tasks: 3
actuals:
  tokens: 18300
  tasks: 3
  commits: 4
---

# Quick 260929-qg0 Plan 01: Enforce loot list status rules Summary

The database now enforces who can move a loot list to pending or approved (officers from a user session, any caller only with an active membership), keeps the review trail and the items of a pending or approved list for officers and the service role, requires an owned, active character for new or moved lists, and only the service role writes snapshots. Submit, review (approve), revert (snapshot path) and saveSubmission check active membership up front with the signed-off messages.

All work is in WT (`scratchpad/wtls`, branch `fix/loot-list-status-rules`, from origin/main 77afa063). Local commits only: nothing pushed, no PR opened, no planning files in WT, no upstream configured.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | 6cbd6e79 | fix(loot-lists): require an active membership and an officer to move a loot list to pending or approved |
| 2 | 717e8ee6 | fix(loot-lists): keep the review trail and items of pending or approved lists for officers, and require an owned, active character on insert |
| 3 | faccc8fa | fix(loot-submissions): check active membership before approving or restoring a loot list |
| (orchestrator) | 39097704 | docs(loot-lists): clarify when the review-trail rule is skipped (header comment wording only, kept) |
| follow-up | bb820ab3 | fix(loot-lists): treat original_phase like phase for pending or approved lists |

Each commit ends with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.

## Final migration

`supabase/migrations/20260930000000_enforce_loot_list_status_rules.sql`, 11 statements:

1. CREATE OR REPLACE FUNCTION public.enforce_loot_submission_status_rules() (plpgsql, SECURITY DEFINER, search_path public, pg_temp)
2. COMMENT ON FUNCTION
3. REVOKE ALL ... FROM PUBLIC, anon, authenticated
4. CREATE OR REPLACE TRIGGER enforce_loot_submission_status_rules BEFORE INSERT OR UPDATE OF status, guild_id, character_id, expansion_id, phase, original_phase, raid_tier_id, reviewed_at, reviewed_by, review_notes, change_rejected_at ON public.loot_submissions FOR EACH ROW (eleven columns)
5. COMMENT ON TRIGGER
6. CREATE OR REPLACE FUNCTION public.enforce_loot_submission_item_rules() (same settings)
7. COMMENT ON FUNCTION
8. REVOKE ALL ... FROM PUBLIC, anon, authenticated
9. CREATE OR REPLACE TRIGGER enforce_loot_submission_item_rules BEFORE INSERT OR UPDATE OR DELETE ON public.loot_submission_items FOR EACH ROW
10. COMMENT ON TRIGGER
11. DROP POLICY IF EXISTS "loot_submission_snapshots_insert" ON public.loot_submission_snapshots

The header has Problem, Fix, Why triggers, Security, Error contract and Rollback sections. The Rollback drops both triggers and functions and recreates the snapshot INSERT policy verbatim from the baseline.

## Final rule list

- **R1 (every caller, including service_role):** a loot_submissions row may only enter pending or approved (INSERT in either; UPDATE staying in either that changes status, guild_id or character_id) with an active character_guild_memberships row for (character_id, guild_id). NULL ids count as no membership. Moves into draft or rejected are never blocked. Phase, original_phase, expansion and tier changes are not R1 checks.
- **R2 (anon, authenticated):** only an officer of the row's guild may do an R1-type entry, or change guild_id, character_id, expansion_id, phase, original_phase or raid_tier_id of a row that is pending or approved after the write. original_phase is included because merge_phase_groups restores phase from it.
- **R3 (anon, authenticated, non-officers):** reviewed_at, reviewed_by, review_notes, change_rejected_at only NULL or unchanged (NULL on INSERT). Skipped when pg_trigger_depth() > 1, so the membership-loss auto-reject keeps working from a user session.
- **R4 (anon, authenticated, non-officers, OD-1):** an INSERT (including the insert phase of every upsert) or a guild_id or character_id change needs a character owned by auth.uid() with an active membership in the row's guild.
- **Items rule:** for anon and authenticated callers who are not officers of the parent's guild, no item INSERT, UPDATE or DELETE while the parent (old and new, for a move) is pending or approved, including through save_submission_items. Missing parents do not block. Other roles are not checked.
- **Snapshots (OD-2):** only the service role writes snapshots. The SELECT policy is unchanged.
- **Error contract:** client callers get 42501 with the RLS message and no DETAIL. Item DELETE uses 'permission denied for table loot_submission_items'. Other callers can only fail R1: 23514 with the fixed message and a DETAIL naming rule R1, character_id, guild_id and status. The officer lookup only runs when a rule officers may pass has failed.

## Route and client changes (FU-1)

- `submit/route.ts`: after the ownership check, a NULL character_id or a non-empty `findInvalidCharacterIds` result returns 403 with C-1 ("Your character needs to rejoin this guild.") before any write, so resubmission_count is not incremented. A 23514 from the status update returns the same 403. A lookup error returns 500 through the existing catch.
- `review/route.ts`: only for status approved, the same check returns 400 with C-2 ("This raider isn't an active member of this guild. Check the roster, then try again.") before the snapshot write. 23514 maps to the same 400. Reject and pending paths are unchanged.
- `revert/route.ts`: after the no-snapshot fallback and before the item DELETE, the same check returns 400 with C-2. 23514 on the final approved update maps to the same 400. The fallback rejection is unchanged.
- `LootListContext.tsx` saveSubmission: the auto-save membership query runs before the upsert. On error or an inactive membership it throws C-1, so the existing catch shows it and `setIsSaving(false)` still runs. doAutoSave is unchanged.
- No new `console.*` calls.

## Verification

| Check | Baseline | Final |
|-------|----------|-------|
| `npx vitest run` (full) | 132 files, 2478 tests, all passed (`baseline-qg0-vitest.txt`) | 136 files, 2513 tests, all passed (`final-qg0-vitest.txt`, re-run after the follow-up commit). 4 new files, 35 new tests: submit 7, review 7, revert 7, migration shape 14 |
| `npx tsc --noEmit` | clean, 0 lines (`baseline-qg0-tsc.txt`) | clean, 0 lines (`final-qg0-tsc.txt`, re-run after the follow-up commit) |
| `npx eslint` on the changed files | n/a | 0 errors, 2 warnings (`final-qg0-eslint.txt`). Both are on existing lines of LootListContext.tsx (unused `itemName` in removeApprovedItem, a useMemo dependency), which moved down 14 lines. Neither is new. Follow-up: the shape test (the only lintable file changed) is clean (`final-qg0-eslint-followup.txt`) |
| Em dash gate (added lines + commit messages, including bb820ab3) | n/a | pass |
| Wording gate (D-12 regex, added lines + commit messages, including bb820ab3) | n/a | pass |

Output files are in the scratchpad root (`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/`).

### PGlite proof (scratchpad only, never committed)

Directory: `scratchpad/pglite-qg0/` (`scenarios-qg0.mjs`, `scenarios-qg0-full.mjs`, node_modules linked to `../pglite-289/node_modules`).

- `run-output-qg0-task1.txt` (tracer): **18 PASS, 0 FAIL**. Includes the pre-migration control (a raider session UPDATE of their own pending list to approved succeeds), the 23514 service-role case with DETAIL, and the 42501 raider cases.
- `run-output-qg0.txt` (full matrix): **158 PASS, 0 FAIL** after the follow-up (146 before it). Covers:
  - the control;
  - every legitimate flow: auto-save from approved and from pending, rejected stays rejected, fresh draft, saveSubmission shape, submit, approve with snapshot replacement, reject, revert and its fallback, remove-item, the reminder cron, phase-group merge and review_notes edit on a legacy approved row whose raider has left, unrelated updates on that row;
  - membership-loss auto-reject three ways (service role, the raider's own UPDATE, the raider's own DELETE), then rejoin, auto-save, submit and approve;
  - officer approve, item save, phase change and review note;
  - officer-session and raider-session deletes, a guild row delete, a delete_guild stand-in and a character delete, all cascading to items and snapshots, plus a loot item delete cascading to an approved list's item;
  - every blocked case with its expected SQLSTATE (B1 to B10);
  - original_phase (follow-up, O1 to O4): a raider session change on their approved or pending list fails 42501 with no DETAIL, an unchanged re-send passes, the same change on their draft list passes, and an officer session change passes. For an approved list of a departed raider, a plain service-role UPDATE of phase and original_phase passes, and so do both passes of the real merge_phase_groups (merge to phase 1 with original_phase 2, then restore to phase 2 with original_phase NULL);
  - idempotent re-apply;
  - rollback: the triggers and functions are gone, the snapshot policy is back, the control behaviour returns, and re-applying works again.
- To rerun only the tracer, run `node scenarios-qg0.mjs --tracer`. It was re-run after the follow-up: 18 PASS, 0 FAIL (`run-output-qg0-task1-rerun.txt`).
- Timings (informational): a 50-item save_submission_items on a draft list took 1.6 ms before the migration and 2.1 ms after (last run; earlier runs 1.5 to 3.0 ms before, 2.1 to 2.5 ms after).

### libpg-query

`scratchpad/pglite-qg0/parse/parse-qg0.mjs`, output in `scratchpad/pglite-qg0/parse-output-qg0.txt`: **all 11 statements parsed** (re-run after the follow-up) (CreateFunctionStmt x2, CommentStmt x4, GrantStmt x2, CreateTrigStmt x2, DropStmt x1). The Rollback SQL from the header also parsed (4 DropStmt, 1 CreatePolicyStmt). 0 failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Shape-test splitter and semicolons in COMMENT text**
- **Found during:** Task 2 GREEN
- **Issue:** the #313-style splitter is not string-aware, and the first draft of the status function COMMENT used semicolons.
- **Fix:** reworded the COMMENT text without semicolons. No behaviour change.
- **Commit:** 717e8ee6

### Harness-only deviations (scratchpad, not committed)

- **Fixture seeding:** fixtures are seeded by the superuser with `session_replication_role = replica`, so legacy states (for example an approved list whose raider has left) can exist before a scenario runs. The trigger correctly refused such a fixture when seeded normally. No scenario uses replica mode.
- **Stand-ins, documented in the harness header (as in #313):**
  - auth schema and roles;
  - reduced guilds, guild_roles, characters, expansions, raid_tiers and loot_items;
  - a permissive SELECT policy on guilds and characters;
  - a guild-owner DELETE policy on guilds;
  - a reduced delete_guild with the real delete order and a created_by check in place of is_guild_master;
  - expansions.phase_groups and raid_tiers.phase added to the stand-ins, so the real merge_phase_groups from 20260729000001 (with its ALTER OWNER and REVOKE) runs. Some scenarios also model a merge as a plain service-role UPDATE of phase and original_phase.
  - Everything else is taken verbatim from the baseline and later migrations: the four real tables, their constraints, FKs, indexes, the 24 policies (17 on the loot tables after the two 20260722000002 drops), grants, is_guild_officer, reject_submissions_on_cgm_loss and its trigger, character_belongs_to_user, get_user_guild_ids, the three ALTER migrations, the original_phase ALTER and save_submission_items from 20260727000001.
- **libpg-query:** the installed build exports only `parse`, with no plpgsql parser. Statements are parsed, and the plpgsql bodies are proven by running them in PGlite.
- **No cascade fallback:** the items trigger has no pg_trigger_depth exemption. All cascade scenarios passed with the parent-not-found rule alone, so pg_trigger_depth appears once, in R3, as planned.

### Follow-up additions (after the orchestrator's review)

- **original_phase (bb820ab3):**
  - Added to the trigger's UPDATE OF list and to `v_rescoped`.
  - Mentioned in the header R1 and R2 text, the "eleven columns" note, the in-body R2 comment and the function COMMENT.
  - Shape test updated. It fails against the previous migration (2 tests) and passes against the new one (14 of 14).
- **Writers of original_phase, checked:**
  - The only writer is merge_phase_groups, in its merge and restore passes.
  - Its only app caller is `app/api/guilds/[id]/expansions/[expansionId]/phase-groups/route.ts`, which uses `createServiceRoleClient()` for both calls, so those writes only face R1.
  - No app, lib, script, bot or companion code writes the column.
  - One detail for review: 20260722000001 and 20260729000001 revoke EXECUTE on merge_phase_groups from anon and authenticated, but not from PUBLIC, and the baseline has no PUBLIC revoke for it. Whether a user session can still reach it depends on the live ACL, which was not checked (no SQL against a real database). If a user session can call it, the trigger still sees the session role, so R2 applies to a non-officer's change of phase or original_phase on a pending or approved list.
- **D-11 test: skipped.**
  - No test harness for LootListContext exists. `app/contexts/__tests__` does not exist, and no test renders LootListProvider.
  - The provider is about 1200 lines and depends on GuildContext, ExpansionContext, SWR, the Supabase client and notifications, so a harness would be a large new build.
  - The saveSubmission change is 14 lines and mirrors the doAutoSave membership check.

### Process note

- Commits were made on `fix/loot-list-status-rules` as the orchestrator instructed. This is not an `agent-*` worktree branch, so the executor's per-agent branch allow-list was not applied. The deny-list check (not main, not detached) held.

## Notes for review

- **Seed scripts:** `scripts/seed-test-data.ts` (line ~364) and `scripts/seed-test-data-multiuser.ts` (lines 203 and 376) insert memberships with `is_active: true` before inserting pending lists through the service role, so R1 passes. If a membership insert fails (the scripts only warn), the pending insert for that character now gets 23514.
- **save_submission_items on a pending or approved list:** a non-officer gets 'permission denied for table loot_submission_items', because the function's first write is the DELETE of existing items. The app never calls it in that state: the parent is saved as draft or rejected first.
- **Officer bulk delete (unchanged by this plan):** `/api/loot-submissions/delete` bulk runs with the officer's session. The baseline `loot_submissions_delete` policy only allows the character owner, so in PGlite an officer-session bulk delete removed only the officer's own list. This may be worth a separate look. Out of scope, not changed.
- **Existing rows:** production rows that already break the new rules (for example a pending or approved list with no active membership) were not counted, because no SQL was run against a real database. They stay editable, because the rules only fire on entry into pending or approved and on moves. Optional read-only check before merge: count loot_submissions with status in ('pending', 'approved') and no active membership for (character_id, guild_id).

## Follow-up (OD-3)

The membership table's write rules are handled in a separate quick task, built in parallel from origin/main and shipped together with this change in one PR. The orchestrator runs the combined PGlite proof on the joined branch. That work is not in this plan.

## Threat Flags

None. The change adds no endpoint, auth path or schema column. It narrows client writes on three existing tables and adds pre-checks to three existing routes.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260930000000_enforce_loot_list_status_rules.sql
- FOUND: app/services/__tests__/loot-list-status-rules-migration.test.ts
- FOUND: app/api/loot-submissions/{submit,review,revert}/__tests__/route.test.ts
- FOUND: commits 6cbd6e79, 717e8ee6, faccc8fa on fix/loot-list-status-rules
- FOUND: scratchpad/pglite-qg0/run-output-qg0-task1.txt, run-output-qg0.txt, parse-output-qg0.txt

## Delivery (orchestrator, 2026-09-30)

- Shipped together with 260929-qg0, 260929-qzn, 260929-wcr and a guarded exec_sql grant migration (20260930000300) in PR #328, squash-merged as 86e1d6ff after every CI check passed.
- The combined branch was rebuilt as clean commits with a tree identical to the proven head. Full suite on it: 141 files, 2554 tests passing. PGlite with all migrations applied: loot-list 177/177, membership 178/178, joint flows 144/144, function grants 372/372, exec_sql 15/15.
- Deploy Migrations applied all four migrations in production on 2026-09-30 at 17:42 UTC. The Vercel production deploy succeeded.
- Live read-only anon probes after deploy: get_guild_expansions returns 200 (still public); get_guild_current_expansion and is_past_deadline return 42501 permission denied (now service-role only).
- Still open: a manual smoke test of the app flows, and the read-only catalog queries in the Supabase SQL editor.
