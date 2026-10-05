---
phase: quick-261003-kfj
plan: 01
subsystem: database
tags: [postgres, rls, supabase, pglite, migrations]

requires:
  - phase: quick-261003-fcg
    provides: migration 20261003120000, the newest migration that existed when the active-guild-membership-policies shape test was written
provides:
  - Equipped items officer rule requires an active membership of the item's character in the officer's guild
  - Equipped items guildmate read rule requires the same (OD-1 resolved as option A)
  - Shape test pinning the migration's exact statement list and Rollback block
  - Anchored ordering check in the j61 (loot list and expansion rules) shape test, closing follow-up FU-1 of quick task 261003-j61
affects: [database, rls-policies, character-equipped-items, loot-submissions]

actuals:
  tokens: 5077
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "RLS policy recreated with an added active-membership conjunct, derived verbatim from the baseline CREATE POLICY text, with an exact header Rollback block pinned by a shape test (same pattern as 20261003180000)"

key-files:
  created:
    - supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql
    - app/services/__tests__/equipped-item-rules-migration.test.ts
  modified:
    - app/services/__tests__/active-guild-membership-policies-migration.test.ts

key-decisions:
  - "OD-1 resolved as option A by the user (2026-10-03): the guildmate read policy on character_equipped_items gets the same active-membership condition in this migration, not a separate follow-up"

patterns-established:
  - "Migration-only PR, merged with --admin, deploying ~12s after merge; preceded by a separate test-only commit anchoring an older shape test's live directory scan before a later migration can fail it"

requirements-completed: [KFJ-R1, KFJ-R2, KFJ-R3, DELIVERY-R1]

coverage:
  - id: D1
    description: "The character_equipped_items officer policy requires the item's character to have an active membership in the officer's guild; owners and active officers of current members keep full access"
    requirement: KFJ-R1
    verification:
      - kind: integration
        ref: "PGlite pglite-kfj/scenarios-kfj.mjs (scratchpad, not committed): KFJ-READ-1, KFJ-WRITE-1 to KFJ-WRITE-5, KFJ-WRITE-8 to KFJ-WRITE-10"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/equipped-item-rules-migration.test.ts (7 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The guildmate read policy on character_equipped_items requires the same active membership (OD-1 option A)"
    requirement: KFJ-R2
    verification:
      - kind: integration
        ref: "PGlite pglite-kfj/scenarios-kfj.mjs: KFJ-READ-9, KFJ-READ-10, KFJ-READ-11"
        status: pass
    human_judgment: false
  - id: D3
    description: "RLS inventory, reader/writer check and follow-ups recorded"
    requirement: KFJ-R3
    verification:
      - kind: other
        ref: "This SUMMARY's Policy inventory, Readers and writers, and Follow-ups sections"
        status: pass
    human_judgment: false
  - id: D4
    description: "Red/green PGlite proof, shape test, j61 anchor, full regression, neutral wording, local-only commits, PR body draft"
    requirement: DELIVERY-R1
    verification:
      - kind: integration
        ref: "pglite-kfj/run-output-kfj-before.txt (red, 9 FAIL as designed), pglite-kfj/run-output-kfj-task1.txt and run-output-kfj.txt (green, 0 FAIL)"
        status: pass
      - kind: other
        ref: "new-fails.sh against baseline-kfj-vitest.txt / final-kfj-vitest.txt (0 new FAIL); npx tsc --noEmit; npx eslint --max-warnings 0"
        status: pass
    human_judgment: false

duration: 55min
completed: 2026-10-03
status: complete
---

# Quick Task 261003-kfj: Equipped Item Rules Require An Active Guild Membership Summary

**The character_equipped_items officer policy and (OD-1 option A) its guildmate read policy now require the item's character's own membership in the relevant guild to be active, closing the same RLS gap already fixed for loot_submissions and expansions in migration 20261003180000.**

## Performance

- **Duration:** ~55 min
- **Tasks:** 2
- **Files modified:** 3 (1 migration created, 1 test created, 1 test anchored)

## Commits

Branch `fix/equipped-item-rules-active-members` off `origin/main` at `af3af380`. Both local only; nothing pushed, no PR opened.

1. **`2f226474`** `test(db): anchor the active guild membership migration ordering check`
   Rewrites only the j61 shape test's ordering case (`app/services/__tests__/active-guild-membership-policies-migration.test.ts`) to compare against the specific migration that preceded it (`20261003120000`, quick task 261003-fcg) instead of scanning the whole migrations directory, which would otherwise fail as soon as this task's later migration landed (#309). This closes follow-up FU-1 of quick task 261003-j61.

2. **`9fc3a83b`** `fix(db): equipped item rules require an active guild membership`
   **Migration-only PR, merge with `--admin`; deploys about 12 seconds after merge; no app PR needs to land first.**
   Adds `supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql` and its shape test `app/services/__tests__/equipped-item-rules-migration.test.ts`.

## OD-1 Resolution (as applied)

OD-1 was resolved by the user on 2026-10-03 as **option A**: the guildmate read policy ("Users can view equipped items for guild characters") gets the same active-membership condition as the officer policy, in this same migration, rather than being left to a separate follow-up quick task. The migration therefore carries all 5 statements (not the 3-statement minimal form).

## Final Statement List

1. `SET LOCAL lock_timeout = '5s';`
2. `DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items";`
3. `CREATE POLICY "Officers can manage guild characters' equipped items" ...`  -  baseline text with `("cgm"."is_active" = true)` added to both the `USING` and `WITH CHECK` clauses (two occurrences of the base conjunction replaced).
4. `DROP POLICY IF EXISTS "Users can view equipped items for guild characters" ON "public"."character_equipped_items";`
5. `CREATE POLICY "Users can view equipped items for guild characters" ...`  -  baseline text with `("cgm"."is_active" = true)` added alongside the existing `("my_cgm"."is_active" = true)` check (one occurrence replaced).

## Rollback (in the migration header, exact)

```sql
DROP POLICY IF EXISTS "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items";
CREATE POLICY "Officers can manage guild characters' equipped items" ON "public"."character_equipped_items" USING ((EXISTS ( SELECT 1
   FROM "public"."character_guild_memberships" "cgm"
  WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."character_guild_memberships" "cgm"
  WHERE (("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id")))));
DROP POLICY IF EXISTS "Users can view equipped items for guild characters" ON "public"."character_equipped_items";
CREATE POLICY "Users can view equipped items for guild characters" ON "public"."character_equipped_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((("public"."characters" "c"
     JOIN "public"."character_guild_memberships" "cgm" ON (("cgm"."character_id" = "c"."id")))
     JOIN "public"."character_guild_memberships" "my_cgm" ON (("my_cgm"."guild_id" = "cgm"."guild_id")))
     JOIN "public"."characters" "my_c" ON (("my_c"."id" = "my_cgm"."character_id")))
  WHERE (("c"."id" = "character_equipped_items"."character_id") AND ("my_c"."user_id" = "auth"."uid"()) AND ("my_cgm"."is_active" = true)))));
```

This is the exact baseline text (`20260101000000_baseline_schema.sql` lines 3691-3695 and 3886-3891); no data changes either way. Proven byte-for-byte against the red run's recorded reads in PGlite (KFJ-RB-2, KFJ-RB-3), and the migration re-applies cleanly after it (KFJ-RB-4).

## Policy Inventory (character_equipped_items, verified in code and PGlite at af3af380)

| Policy | Command | Rule before | This task |
|--------|---------|-------------|-----------|
| Officers can manage guild characters' equipped items | ALL (USING and WITH CHECK) | a cgm row of the item's character, active or not, whose guild_id satisfies `is_guild_officer` for the caller | recreated with `("cgm"."is_active" = true)` in both clauses |
| Users can manage their own characters' equipped items | ALL | the caller owns the item's character | kept, unchanged |
| Users can view equipped items for guild characters | SELECT | the caller has an active membership (`my_cgm`) in a guild where the item's character has a cgm row, active or not | recreated with `("cgm"."is_active" = true)` added (OD-1 option A) |

Grants: anon, authenticated and service_role have every table privilege (baseline, unchanged); RLS enabled, not forced; no trigger on the table.

## Other Character-Scoped Tables Checked (none share this gap)

| Table | Rule shape | Verdict |
|-------|-----------|---------|
| characters | "Guild members can view guild characters" already requires the target's `cgm.is_active = true`; "Guild members can view submitting characters" follows a loot list in one of the caller's active guilds instead | not this gap; follow-up FU-2 |
| character_guild_memberships | "Guild members can view guild memberships" shows every row of the caller's active guilds (roster, intended); writes are server-side | intended, not a gap |
| loot_history, character_aliases | reads need the caller's active membership; officer writes need `is_guild_officer`; triggers already require the referenced character's membership | covered |
| raid_team_members, blp_credits, blp_tracking, donation_records, attendance_records, reserve_awards, reserve_submissions | reads need the caller's active membership; officer writes need `is_guild_officer`; the referenced character's own membership is not part of any rule | a different rule shape, not this gap; follow-up FU-1 (renumbered from the planner's FU-1 reference, which this migration's FU-1 below supersedes as the live number) |
| loot_submissions, expansions | fixed in 20261003180000 | done |
| user_active_characters | the caller's own row | not applicable |

## Readers and Writers Checked (no app change needed)

| Path | Client | Operation | Access check before the query |
|------|--------|-----------|-------------------------------|
| `app/api/character-gear/route.ts` GET | service role | SELECT | owner, or the caller has an active membership in a guild where the character's membership is active |
| `app/api/character-gear/route.ts` POST | service role | DELETE, INSERT | owner, or the caller has an active Officer/Guild Master role in a guild where the character's membership is active |
| `app/api/character-gear/route.ts` DELETE | service role | DELETE | owner only |
| `app/api/battlenet/characters/sync-gear/route.ts` | service role | DELETE, INSERT | owner |
| `app/api/battlenet/characters/import/route.ts` | service role | INSERT | the caller's own imported character |
| `app/api/characters/[id]/link-battlenet/route.ts` | service role | DELETE, INSERT | owner |
| `app/hooks/use-api.ts`, `app/contexts/LootListContext.tsx` | browser | reads through GET /api/character-gear | as above |
| characters delete (ON DELETE CASCADE) | referential action | DELETE | RLS does not apply |

No SECURITY DEFINER function, view, publication, Discord bot, companion app, addon or script reads or writes `character_equipped_items`. `lib/database.types.ts` has no policy names, so it is unchanged.

## PGlite Results

| Run | File | PASS | FAIL |
|-----|------|------|------|
| Red (before the migration file existed) | `pglite-kfj/run-output-kfj-before.txt` | 13 | 9 (exactly KFJ-READ-1, KFJ-READ-9, KFJ-READ-10, KFJ-CAT-0, KFJ-WRITE-1, KFJ-WRITE-2, KFJ-WRITE-3, KFJ-WRITE-4, KFJ-WRITE-9  -  every control passed) |
| Task 1 (after the migration, first green run) | `pglite-kfj/run-output-kfj-task1.txt` | 29 | 0 |
| Final (Task 2 regression) | `pglite-kfj/run-output-kfj.txt` | 29 | 0 |

The scenario module (`pglite-kfj/scenarios-kfj.mjs`) is scratchpad-only and was never committed.

## Vitest, tsc, eslint

| Check | Baseline (af3af380) | Final (after both commits) | Result |
|-------|---------------------|-----------------------------|--------|
| `npx vitest run` | 183 files / 3244 tests, EXIT=0 | 184 files / 3251 tests, EXIT=0 | No new FAIL line (`new-fails.sh` exit 0); +1 file, +7 tests, both from the new shape test |
| `npx tsc --noEmit` | EXIT=0 | EXIT=0 | clean |
| `npx eslint --max-warnings 0` (both touched test files) | n/a | EXIT=0 | clean |

No FLAKY lines reported by `new-fails.sh`.

## PR Body Draft

`/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-kfj.md`

## Production Catalog Queries (read-only; the user runs these in the Supabase SQL editor, never the executor)

Run query 1 and 2 **before merging**; run query 1 again **after the deploy**; query 3 is optional.

```sql
-- 1. Before merging and after the deploy: how many is_active terms each policy has
--    Before: officer 0, owner 0, member read 1 (the reader's own membership).
--    After: officer 2 (USING and WITH CHECK), owner 0, member read 2 (OD-1 option A).
select policyname, cmd,
       (length(coalesce(qual, '') || coalesce(with_check, ''))
        - length(replace(coalesce(qual, '') || coalesce(with_check, ''), 'is_active', ''))) / length('is_active') as is_active_terms
  from pg_policies
 where schemaname = 'public' and tablename = 'character_equipped_items'
 order by 1;

-- 2. Before merging: the current expressions, to compare with the header Rollback
select policyname, cmd, qual, with_check
  from pg_policies
 where schemaname = 'public' and tablename = 'character_equipped_items'
 order by 1;

-- 3. Optional, before merging: characters with equipped items and no active membership (count only)
select count(distinct cei.character_id) as characters_without_active_membership
  from public.character_equipped_items cei
 where not exists (select 1 from public.character_guild_memberships cgm
                    where cgm.character_id = cei.character_id and cgm.is_active);
```

## Closes Follow-Up

Closes follow-up FU-1 of quick task 261003-j61 (the j61 shape test's ordering check was anchored to a live directory scan and would have failed as soon as this migration landed; it is now anchored to `20261003120000`).

## Follow-Ups (neutral wording, each stated as the rule to adopt)

- **FU-1:** Officer writes on `raid_team_members`, `blp_credits`, `blp_tracking`, `donation_records`, `attendance_records` and `reserve_awards` should check that the referenced character belongs to the row's guild, as the `loot_history` and `character_aliases` triggers already do.
- **FU-2:** Review whether the characters policy "Guild members can view submitting characters" should keep following a loot list once the character's membership is inactive (past list and award views may rely on it).
- **FU-3:** `POST /api/character-gear` should recognise officers with `is_guild_officer` (role position, guild creator) rather than the role names Officer and Guild Master.
- **FU-4:** `GET /api/character-gear` should return only awards from guilds the caller shares with the character.

## Deviations from Plan

None - plan executed exactly as written, with one self-caught correction during execution: the j61 shape test anchor was initially drafted comparing the migration's own timestamp (`20261003180000`) against itself, which is a tautology (`toBeGreaterThan` of a value against itself always fails); corrected to anchor against `20261003120000` (quick task 261003-fcg), the migration that actually preceded 20261003180000 at authoring time, matching D-04's explicit parenthetical reference. Caught by running the test before committing (Rule 1  -  bug, fixed inline before the commit landed, so no separate deviation commit was needed).

A second gap caught the same way: the first green PGlite run showed `KFJ-CAT-2` and `KFJ-CAT-3` failing because the scenario's `catPolicies()` helper selected `policyname, cmd, permissive, roles` but not `qual, with_check`, so the is_active-count checks read `undefined`. Fixed by adding the two missing columns to that query (scratchpad-only file, not part of any commit) before re-running; final green run showed 29/29 PASS.

## Self-Check

All claimed files and commits verified present:

- `supabase/migrations/20261003200000_equipped_item_rules_require_active_membership.sql`  -  FOUND
- `app/services/__tests__/equipped-item-rules-migration.test.ts`  -  FOUND
- `app/services/__tests__/active-guild-membership-policies-migration.test.ts` (modified)  -  FOUND
- Commit `2f226474`  -  FOUND in `git log --oneline af3af380..HEAD`
- Commit `9fc3a83b`  -  FOUND in `git log --oneline af3af380..HEAD`
- `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-kfj.md`  -  FOUND, non-empty, no em dash

## Self-Check: PASSED

---
*Quick task: 261003-kfj*
*Completed: 2026-10-03*
