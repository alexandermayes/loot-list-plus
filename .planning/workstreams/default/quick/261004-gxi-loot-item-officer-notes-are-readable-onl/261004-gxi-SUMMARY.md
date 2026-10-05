---
phase: quick-261004-gxi
plan: 01
subsystem: database
tags: [postgres, column-privileges, supabase, migrations, pglite, nextjs-api-route]

requires:
  - phase: quick-261003-t28
    provides: BLP and reserve award rules migration (20261003230000), the newest migration on main when this task's shape test's anchor timestamp was chosen
provides:
  - GET /api/loot-items/officer-notes, a server route that answers only callers with the Manage loot permission for their guild's active expansion
  - A migration replacing the loot_items table read privilege of anon and authenticated with column privileges on every column except officer_notes, with a built-in check that refuses to ship an incomplete result
  - A shape test pinning the migration's statements, column list, Rollback block and a ratchet over later migrations
affects: []

actuals:
  tokens: 10575
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Column-level PostgreSQL grants (GRANT SELECT (col, col, ...)) used instead of a table-level grant when exactly one column must stop being session-readable but every other column stays public; a DO block with has_column_privilege checks refuses the migration rather than shipping silently wrong"
    - "Officer-only data exposed through a narrow server route on the service role (GET /api/loot-items/officer-notes) rather than widening RLS, since the existing read already needed every column but one"

key-files:
  created:
    - app/api/loot-items/officer-notes/route.ts
    - app/api/loot-items/officer-notes/__tests__/route.test.ts
    - app/services/__tests__/loot-item-officer-notes-migration.test.ts
    - supabase/migrations/20261004040000_loot_item_officer_notes_officers_only.sql
  modified:
    - app/(app)/loot-management/components/LootSettingsContent.tsx

key-decisions:
  - "OD-1 resolved B (user, 2026-10-04): column privileges plus a server route (app PR first, migration second), not a new table (Option A, needs three ordered PRs) or a view (Option C, needs re-planning)."
  - "OD-2 resolved A (user, 2026-10-04): the route reuses the PATCH writer's permission rule, verifyPermission(..., 'manage_loot'), not a narrower is_guild_officer-only rule (Option B)."
  - "OD-3 resolved: not in this task (user, 2026-10-04). The 'Loot items are viewable by everyone' policy and the three catalog tables that share it stay as they are; tracked as FU-1."
  - "COPY C-1 to C-4 approved by the user as drafted, 2026-10-04 (no new user-facing text; the route's own error texts are never shown on a page)."

requirements-completed: [GXI-R1, GXI-R2, GXI-R3, GXI-R4, DELIVERY-R1]

coverage:
  - id: D1
    description: "No anon or signed-in session (another guild's member, a raider, a former member, an officer, the guild creator) can read loot_items.officer_notes in any form; every other column and every privilege class keeps working (GXI-R1)"
    requirement: "GXI-R1"
    verification:
      - kind: integration
        ref: "scratchpad PGlite harness (not committed), scenarios-gxi.mjs GXI-READ-1 to GXI-READ-9, GXI-PRIV-1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Officers keep seeing and editing officer notes on Loot Management, through GET /api/loot-items/officer-notes after the Manage loot check and the guild check, before and after the migration (GXI-R2)"
    requirement: "GXI-R2"
    verification:
      - kind: unit
        ref: "app/api/loot-items/officer-notes/__tests__/route.test.ts R1 to R8, G1 to G3"
        status: pass
      - kind: integration
        ref: "scratchpad PGlite harness (not committed), scenarios-gxi.mjs GXI-SVC-1 to GXI-SVC-3"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every other app read and write of loot_items, every service role route and delete_guild work exactly as before the migration (GXI-R3)"
    requirement: "GXI-R3"
    verification:
      - kind: integration
        ref: "scratchpad PGlite harness (not committed), scenarios-gxi.mjs GXI-APP-1 to GXI-APP-11, GXI-SVC-1 to GXI-SVC-3, GXI-DG-1"
        status: pass
    human_judgment: false
  - id: D4
    description: "The migration is idempotent, refuses an incomplete result (a second grantor or an ungranted column), and its Rollback restores the previous privileges exactly; a shape test pins its file and a ratchet guards later migrations (GXI-R4)"
    requirement: "GXI-R4"
    verification:
      - kind: unit
        ref: "app/services/__tests__/loot-item-officer-notes-migration.test.ts (all 9 cases)"
        status: pass
      - kind: integration
        ref: "scratchpad PGlite harness (not committed), scenarios-gxi.mjs GXI-RB-1 to GXI-RB-4, GXI-CAT-COLS, GXI-CAT-POL, GXI-CAT-RLS, GXI-CAT-IDEM, GXI-GUARD-1, GXI-GUARD-2"
        status: pass
    human_judgment: false
  - id: D5
    description: "Production count queries are available for the user to run before and after merge; the OD resolutions and the column review are recorded"
    requirement: "GXI-R4"
    verification: []
    human_judgment: true
    rationale: "Running the Supabase SQL editor count queries and confirming the post-deploy privilege state is a user action against production, not something this executor can verify."
  - id: D6
    description: "Red and green PGlite proof, full regression with no new FAIL line, neutral wording, the app commit first with no migration file, the migration commit holding exactly the migration and its shape test, every commit trailered (DELIVERY-R1)"
    requirement: "DELIVERY-R1"
    verification:
      - kind: other
        ref: "npx vitest run (final, 195/195 files, 3425/3425 tests less 1 pre-existing-flaky timeout, EXIT=1 only on that one unrelated timeout); sh new-fails.sh baseline final (no new FAIL, exit 0); npx tsc --noEmit (EXIT=0); npx eslint --max-warnings 0 on the four new/changed non-legacy files (EXIT=0 each)"
        status: pass
    human_judgment: false

duration: 130min
completed: 2026-10-04
status: complete
---

# Quick task 261004-gxi: Loot item officer notes are readable only by the guild's officers, Summary

**The database stops returning loot_items.officer_notes to any anon or signed-in session (column privileges on every other column, with a DO-block check that refuses an incomplete result), while Loot Management keeps showing and editing officer notes through a new GET /api/loot-items/officer-notes route gated on the same Manage loot permission the PATCH writer already used; proven end to end in a scratchpad PGlite harness and a committed migration shape test.**

## Performance

- **Duration:** ~130 min
- **Tasks:** 3
- **Files modified:** 5 (4 created, 1 modified)

## Commits

1. `c0ab3ef4` `fix(loot-items): officer notes load through a server route` **(app PR, merges and deploys FIRST)**: exactly `app/api/loot-items/officer-notes/route.ts`, `app/api/loot-items/officer-notes/__tests__/route.test.ts`, `app/(app)/loot-management/components/LootSettingsContent.tsx`.
2. `1fd099d5` `fix(db): loot item officer notes are readable only by the guild's officers` **(migration-only PR, merge with the admin merge override only after the app PR is deployed, deploys about 12 seconds after merge)**: exactly `supabase/migrations/20261004040000_loot_item_officer_notes_officers_only.sql`, `app/services/__tests__/loot-item-officer-notes-migration.test.ts`.

Both on branch `fix/loot-item-officer-notes`, 2 commits after `80d437da`. Nothing was pushed; the branch has no upstream.

## OD resolutions and COPY (as applied, recorded by the user, 2026-10-04)

- **OD-1: B.** Column privileges plus a server route. anon and authenticated lose the table SELECT privilege and get column-level SELECT on every column except `officer_notes`; officers read notes through `GET /api/loot-items/officer-notes`; a DO block in the migration fails the deploy rather than shipping without effect when another grantor keeps the column readable or a live column is missing from the grant list.
- **OD-2: A.** The route's permission check is `verifyPermission(serviceSupabase, user.id, guildId, 'manage_loot')`, the exact rule `PATCH /api/loot-items` already uses. Anyone who could already save a note can read it back; a custom role with Manage settings but not Manage loot sees no notes (it already could not save one).
- **OD-3: Not in this task.** The `Loot items are viewable by everyone` policy, and the matching policies on `expansions`, `raid_tiers` and `loot_item_classes`, are unchanged. Tracked as **FU-1**.
- **COPY:** C-1 to C-4 approved as drafted. No new user-facing text; a caller who already can't see notes sees the page's existing error text, never a route error string.

## Final statement list (4 statements)

```sql
SET LOCAL lock_timeout = '5s';
REVOKE SELECT ON TABLE "public"."loot_items" FROM "anon", "authenticated";
GRANT SELECT ("id", "raid_tier_id", "name", "boss_name", "item_slot", "wowhead_id", "icon_url", "notes", "created_at", "classification", "item_type", "allocation_cost", "is_available", "roles", "armor_type", "weapon_type", "is_loot_council", "primary_stat") ON TABLE "public"."loot_items" TO "anon", "authenticated";
DO $$ ... (has_column_privilege checks for officer_notes and every other live column, for anon and authenticated; RAISE EXCEPTION on either failure) ... $$;
```

The executable SQL (header comments removed, whitespace collapsed) is byte-identical to the planner's probed candidate (`SP/pglite-gxi/candidate-b.sql`).

**Rollback** (in the migration's header, proven exact in PGlite): a forward migration with two statements, `GRANT SELECT ON TABLE "public"."loot_items" TO "anon", "authenticated"` then `REVOKE SELECT (the same 17 columns) ... FROM "anon", "authenticated"`, restoring the previous table privilege and removing the column grants. No data changes either way; the app change keeps working either way (it uses the service role).

Nothing else changed: no policy, RLS state, INSERT/UPDATE/DELETE privilege, service_role privilege, function, trigger, data or type change. `lib/database.types.ts` is unchanged.

## Context findings (verified at `80d437da`, 45 of 45 migrations applied)

1. **Grants and rules today.** `loot_items` has 19 columns. Before this migration, `relacl` granted `anon`, `authenticated` and `service_role` every table privilege (`arwdDxtm`), with no column ACL. RLS enabled, not forced. Five policies: `Loot items are viewable by everyone` (SELECT, `USING (true)`, every role) plus the four officer-scoped `loot_items_select/insert/update/delete` policies. The only other policies naming `loot_items` are the three officer policies of `loot_item_classes`. Six SECURITY DEFINER functions read `loot_items`; only `delete_guild` names `officer_notes` (it clears it on kept items). No view, trigger or publication exposes the column.
2. **Readers and writers of `officer_notes`.** The only session reader was `LootSettingsContent.tsx`'s `loadLootItems`, now replaced by the new route. The only writer is `PATCH /api/loot-items` (unchanged), which also copies note text into `audit_logs.new_data` (readable by the guild's officers and, on Premium, by `view_audit_log` holders through `/api/audit-logs`): noted, not changed, by this task. `delete_guild` clears it on kept items of a deleted guild.
3. **Every other session read of `loot_items`** (`PriorityListTab.tsx`, `MasterSheetContent.tsx`, `DashboardContent.tsx`, `raid-tracking/_client.tsx`, `LootSubmissionsContent.tsx`, `master-loot/_client.tsx`) lists its own columns and never names `officer_notes`; the one session write (the officer CSV import) never selects it. Every API route, `lib/` reader and script uses the service role.
4. **Column review.** `classification`, `allocation_cost`, `is_available`, `is_loot_council`, `roles`, `armor_type`, `weapon_type`, `primary_stat` and the catalog columns are member-facing by design. `notes` has no reader or writer anywhere in the app, the seeder or any migration (tracked as **FU-2**). `officer_notes` alone is officer-only.
5. **Option evidence.** Candidate B (column privileges), probed in memory before this migration existed: every session read of the column, a wildcard select, a filter, an ORDER BY, a whole-row reference, `to_jsonb`, and an UPDATE/INSERT `RETURNING` of the column all failed with `42501 permission denied for table loot_items`, while every other app read/write shape, the service role and `delete_guild` kept working, the statements re-applied cleanly, the rollback was exact, and the DO check refused both a second grantor and an extra ungranted column. Candidate A (a new table, dropping the column) broke the deployed page read, the deployed PATCH and `delete_guild` until three ordered PRs landed, so it was not chosen.
6. **Tests.** No prior test covered officer notes, `GET`/`PATCH /api/loot-items`, or asserted `loot_items` grants; this task adds both.

## Extra check: repo-wide wildcard-select search (orchestrator amendment)

Searched the whole repository (`app`, `components`, `lib`, `utils`, `hooks`, `domain`, `discord-bot`, `companion`, `scripts`, `addon`: the last two directories hold no `loot_items` references at all in this repo) for `.from('loot_items').select('*')`, any quoting variant, and embed syntax such as `loot_items(*)`, `loot_item:loot_items(*)` or `loot_items!...(*)`:

- **No wildcard select or wildcard embed of `loot_items` exists anywhere in the repository.** Every `.from('loot_items')` call (138 occurrences) pairs with an explicit column list; every multi-line template-literal embed of `loot_items` (checked individually: `LootSubmissionsContent.tsx`, `raid-tracking/_client.tsx`, `master-loot/_client.tsx`, `MasterSheetContent.tsx`, `DashboardContent.tsx`, `app/api/loot-submissions/submit`, `app/api/discord/post-raid-summary`, `app/api/prio-list`, `app/api/character-gear`, `app/api/addon/export-string`, `app/api/addon/guild-data`, `app/api/loot-history`) names explicit columns, not `*`.
- **Client used per caller, confirmed:** every browser/user-session file that reads `loot_items` (the page files above) uses `createClient` from `@/utils/supabase/client`; every API route reader uses `createServiceRoleClient()`; every one of the 44 `scripts/*.ts`/`.js` files that touch `loot_items` constructs its client with `process.env.SUPABASE_SERVICE_ROLE_KEY` (checked individually; zero reference `ANON_KEY`).
- **Discord bot and companion app:** neither `discord-bot/` nor `companion/` contains any reference to `loot_items` at all (`grep -rl` returned nothing in either directory); the bot's `/priority` command reads loot data only through `app/api/bot/priority/route.ts` (service role) and the companion app reads only through the addon/server routes, all service-role-gated.
- This confirms D-01's "no session select of every column or returned row on this table" finding independently, and satisfies the guard tests' intent (G1 to G3) at the whole-repo level, not just the four scanned directories the committed guard test covers.

## Route and page (D-02, D-03)

`GET /api/loot-items/officer-notes`: 401 with no user; 400 `"guild_id and expansion_id are required"` with either missing; 403 (`verifyPermission`'s error or `"Insufficient permissions"`) without Manage loot, checked before any other query; 404 `"Expansion not found in this guild"` when the expansion is not the guild's; 200 `{ notes: {} }` with no raid tiers yet; 200 `{ notes: {...} }` (blank notes skipped) paged past 1000 rows, `Cache-Control: private, no-store`; 500 `"Internal server error"` on any query error (never a partial result). `LootSettingsContent.tsx`'s `loadLootItems` now runs this fetch and the (unchanged, minus the `officer_notes` line) items query in parallel via `Promise.all`, merging notes into each item before the existing state updates; a 403 while the caller lacks Manage loot resolves to no notes, any other failure throws into the page's existing error state. No new user-facing text.

## PGlite proof (scratchpad only, never committed)

| Run | Migrations applied | PASS | FAIL | Exit |
|-----|---------------------|------|------|------|
| Red (no migration file) | 45 of 45 | 16 | 11 | 1 (expected) |
| Task 2 (migration present) | 46 of 46 | 37 | 0 | 0 |
| Final | 46 of 46 | 37 | 0 | 0 |
| Combined | n/a | n/a | n/a | skipped: no migration file with a timestamp greater than `20261004020000` exists on `origin/main`, `fix/reserve-run-api-access` or `fix/delete-guild-cancels-subscription` other than this task's own file |

The red run's FAIL set matched exactly the expected new-rule labels (`GXI-READ-1` to `GXI-READ-9`, `GXI-PRIV-1`, `GXI-CAT-0`), passed every control (`GXI-FIX-1`, `GXI-APP-1` to `GXI-APP-11`, `GXI-SVC-1` to `GXI-SVC-3`, `GXI-DG-1`), wrote `acl-baseline.json`, and the `GXI-OLD-SHAPE` info line reported `ok` (the deployed page's old browser read of `officer_notes` still worked, confirming the app-first deploy order matters). The Task 2 and final runs report zero FAIL lines with every section (FIX, READ, PRIV, APP, SVC, CAT-0, RB, CAT, GUARD, DG) run, including the Rollback restoring the pre-migration ACL exactly (`GXI-RB-2`) and re-applying to restore the post-migration ACL exactly (`GXI-RB-4`), the idempotent re-apply (`GXI-CAT-IDEM`), and both guard refusals (`GXI-GUARD-1` a second grantor, `GXI-GUARD-2` an ungranted column); the `GXI-OLD-SHAPE` line correctly reports `ERR 42501` once the migration is applied.

## Regression results

- **Route and guard tests:** `app/api/loot-items/officer-notes/__tests__/route.test.ts`, 12/12 passing (R1 to R8, G1, the G1 self-test, G2, G3).
- **Migration shape test:** `app/services/__tests__/loot-item-officer-notes-migration.test.ts`, 9/9 passing.
- **vitest (route test + loot-management/components, combined sanity run):** 6/6 files, 67/67 tests pass.
- **vitest (`app/services`, full):** 23/23 files, 327/327 tests pass.
- **vitest (baseline, before this branch's changes, HEAD `80d437da`):** 193 test files (164 passed, 29 failed under concurrent sibling-worktree load), 3404 tests (3358 passed, 46 failed), `EXIT=1`.
- **vitest (final, after this branch's changes):** 195 test files (194 passed, 1 failed), 3425 tests (3424 passed, 1 failed), `EXIT=1`.
- **`new-fails.sh` (baseline vs. final):** `NEW FAIL lines: none`: the one final-run failure (`__tests__/hand-rolled-cards.test.ts`, a 5-second test timeout under load) is the identical FAIL line text already present in the baseline, so it is not counted as new. Errors unchanged (0 to 0); test file total rose 193 to 195 (this task's two new test files). Exit 0.
- **`npx tsc --noEmit`:** exit 0 (baseline and final).
- **`npx eslint --max-warnings 0`** on the four new/changed non-legacy files (`route.ts`, `route.test.ts`, the shape test, and checked in isolation): exit 0 each.
- **Text gate:** no em dash in the branch's added lines, its commit messages, or either PR body draft.

### Known limitation: `LootSettingsContent.tsx` eslint warnings (not a new issue)

`npx eslint --max-warnings 0` on the full five-file set exits 1, solely because `LootSettingsContent.tsx` already carries 11 pre-existing warnings (`@typescript-eslint/no-unused-vars` on `StyledSelect`, `specMapping`, `allRoles`, `ItemClassRelation`, `member`, `confirm`, `hasSettingsChanges`, `toggleRole`; `react-hooks/exhaustive-deps` on three hooks). Confirmed via `git stash` that these are byte-identical to the file at `80d437da` (same messages, only shifted by the net lines this task added): none are caused by this task's diff, and D-03 explicitly forbids touching anything else in this file. `npm run lint` (the actual CI gate, plain `eslint` with no `--max-warnings`) is unaffected: ESLint's default exit code only reflects errors, not warnings, so CI passes. This is logged here rather than silently fixed, per the scope-boundary rule.

## Production count queries

Run in the Supabase SQL editor (read-only, aggregate only):

```sql
-- 1. Before merging the migration PR: grants, columns and publications of loot_items.
select relacl from pg_class where oid = 'public.loot_items'::regclass;
select a.attnum, a.attname, a.attacl
  from pg_attribute a
 where a.attrelid = 'public.loot_items'::regclass and a.attnum > 0 and not a.attisdropped
 order by a.attnum;
select pubname from pg_publication_tables where schemaname = 'public' and tablename = 'loot_items';

-- 2. Before merging (sizing): items carrying officer notes, guilds that use them, and the unused notes column.
select count(*) filter (where li.officer_notes is not null and btrim(li.officer_notes) <> '') as items_with_officer_notes,
       count(distinct e.guild_id) filter (where li.officer_notes is not null and btrim(li.officer_notes) <> '') as guilds_with_officer_notes,
       count(*) filter (where li.notes is not null and btrim(li.notes) <> '') as items_with_notes_column
  from public.loot_items li
  left join public.raid_tiers rt on rt.id = li.raid_tier_id
  left join public.expansions e on e.id = rt.expansion_id;

-- 3. After the migration deploy. Expected: anon false false true, authenticated false false true, service_role true true true.
select r.role,
       has_table_privilege(r.role, 'public.loot_items', 'SELECT') as table_select,
       has_column_privilege(r.role, 'public.loot_items', 'officer_notes', 'SELECT') as officer_notes_select,
       has_column_privilege(r.role, 'public.loot_items', 'name', 'SELECT') as name_select
  from (values ('anon'), ('authenticated'), ('service_role')) r(role);
```

Run query 1 and 2 before merging the migration PR; run query 3 after its deploy.

## PR body drafts

- App PR: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-gxi-app.md`
- Migration-only PR: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-gxi.md`

## Publication note

The docs PR carrying this PLAN and this SUMMARY should merge only after the migration PR is deployed, so the published planning record does not describe a database state production has not yet reached.

## Follow-ups (neutral wording, each stated as the rule to adopt)

- **FU-1** (OD-3): decide whether `loot_items` rows, and the `expansions`, `raid_tiers` and `loot_item_classes` catalog rows that share the same read-by-everyone policy, should be readable only by the owning guild's active members and the server.
- **FU-2**: `loot_items.notes` has no reader or writer anywhere in the app; confirm it is empty (count query 2) and drop or document it.
- **FU-3**: decide whether audit entries for loot item changes should keep the officer note text verbatim in `audit_logs.new_data`, given officers and Premium `view_audit_log` holders can already read it there.

## Task Commits

1. **Task 1: Tracer, officers read notes through the server route end to end**: `c0ab3ef4` (fix)
2. **Task 2: The database keeps officer notes from every user session**: `1fd099d5` (fix)

Task 3 (full regression, combined run, PR bodies and this summary) added no code commit; no gate-fixup commit was needed beyond the one in-flight wording fix below.

## Files Created/Modified

- `app/api/loot-items/officer-notes/route.ts`: the new GET route (D-02).
- `app/api/loot-items/officer-notes/__tests__/route.test.ts`: route tests R1 to R8 and guard tests G1 to G3 (D-04).
- `app/(app)/loot-management/components/LootSettingsContent.tsx`: `loadLootItems` merges notes from the new route instead of selecting the column (D-03).
- `supabase/migrations/20261004040000_loot_item_officer_notes_officers_only.sql`: the migration (D-01).
- `app/services/__tests__/loot-item-officer-notes-migration.test.ts`: the migration shape test (D-05).

## Decisions Made

See OD-1, OD-2, OD-3 resolutions above (all resolved by the user, 2026-10-04, and recorded in the plan before execution). COPY C-1 to C-4 approved as drafted.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Reworded the migration's Deploy section to avoid a literal double-hyphen CLI flag**
- **Found during:** Task 2, Step 4/5 (writing the migration header, then the shape test's "no stray double hyphen" check)
- **Issue:** D-01's header prose rule forbids two consecutive hyphens anywhere outside comment markers, heading underlines and the Rollback SQL. The Deploy section's first draft said "merged with --admin", whose CLI flag itself contains a literal double hyphen, tripping the file's own constraint (caught by a test case in the committed shape test).
- **Fix:** Reworded to "merged with the admin merge override" (same meaning, no double hyphen).
- **Files modified:** `supabase/migrations/20261004040000_loot_item_officer_notes_officers_only.sql`
- **Verification:** the shape test's double-hyphen case passes; the executable SQL (header stripped) is still byte-identical to `candidate-b.sql`.
- **Committed in:** `1fd099d5` (Task 2 commit; found and fixed before that commit, not a separate gate-fixup)

**2. [Rule 1 - Bug] `NextRequest` instead of a plain `Request` in the route test's request builder**
- **Found during:** Task 1, Step 1 (writing the route test)
- **Issue:** The route reads query parameters via `request.nextUrl.searchParams`. A plain `Request` (as the character-aliases test model uses for its `POST`, which reads the body instead) has no `.nextUrl`, so every GET call threw before reaching any assertion.
- **Fix:** Built the test's request with `new NextRequest(url)` instead of `new Request(url)`, matching the pattern already used by `character-gear`'s existing GET route test.
- **Files modified:** `app/api/loot-items/officer-notes/__tests__/route.test.ts`
- **Verification:** all 12 route and guard tests pass.
- **Committed in:** `c0ab3ef4` (Task 1 commit; found and fixed before that commit)

---

**Total deviations:** 2 auto-fixed (both Rule 1, both caught and corrected before their respective task commit, so neither appears as a separate gate-fixup commit).
**Impact on plan:** No scope creep. Both fixes were necessary for the file/test to do what the plan already specified; neither changes a requirement, a column, a permission rule or any committed behavior.

## Issues Encountered

**Pre-existing eslint warnings in `LootSettingsContent.tsx` conflict with the plan's `--max-warnings 0` verify gate on that file.** See "Known limitation" above under Regression results. Confirmed unrelated to this task's diff (byte-identical warning set before and after, via `git stash` comparison) and out of scope to fix per D-03's "nothing else changes" instruction and the scope-boundary rule. `npm run lint` (the real CI gate) is unaffected since it does not pass `--max-warnings`.

## User Setup Required

None - no external service configuration required. The production count queries above are for the user to run against Supabase before merging the migration PR and after its deploy; they are not blocking this summary.

## Next Phase Readiness

- The app commit (`c0ab3ef4`) and the migration commit (`1fd099d5`) are both on `fix/loot-item-officer-notes`, 2 commits after `80d437da`, ready to open as two PRs: the app PR first, the migration-only PR second (merges only after the app PR is deployed).
- FU-1, FU-2 and FU-3 above are recorded for separate follow-up tasks; none blocks this task.
- No blockers for opening and merging the app PR first.

---
*Phase: quick-261004-gxi*
*Completed: 2026-10-04*

## Self-Check: PASSED

- FOUND: `app/api/loot-items/officer-notes/route.ts`
- FOUND: `app/api/loot-items/officer-notes/__tests__/route.test.ts`
- FOUND: `app/services/__tests__/loot-item-officer-notes-migration.test.ts`
- FOUND: `supabase/migrations/20261004040000_loot_item_officer_notes_officers_only.sql`
- FOUND: commit `c0ab3ef4` in `git log --oneline --all` (branch `fix/loot-item-officer-notes`)
- FOUND: commit `1fd099d5` in `git log --oneline --all` (branch `fix/loot-item-officer-notes`)
- FOUND: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-gxi-app.md`
- FOUND: `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-gxi.md`
