---
phase: quick-260929-j7t
plan: 01
status: complete
subsystem: database
tags: [rls, trigger, loot_history, security, migration, gh-313]
requires:
  - "#294 server builders write item.raid_tier_id and expansion_id (lib/loot/loot-history-rows.ts)"
  - "#296 API rule: character_id must be an active member (findInvalidCharacterIds)"
provides:
  - "public.enforce_loot_history_guild_refs() SECURITY DEFINER trigger function, EXECUTE revoked from PUBLIC, anon, authenticated"
  - "BEFORE INSERT OR UPDATE OF (guild_id, raid_event_id, character_id, loot_item_id, raid_tier_id, expansion_id) trigger on public.loot_history"
affects:
  - "every loot_history INSERT and reference-column UPDATE, for every role"
tech-stack:
  added: []
  patterns:
    - "BEFORE ROW trigger for cross-table guild isolation instead of policy WITH CHECK (NEW vs OLD changed-columns rule)"
    - "collect-first-failure then raise once; RLS-equivalent 42501 swapped in only on the failure path for anon/authenticated non-officers"
    - "dollar-quote-aware statement splitter in migration shape tests"
key-files:
  created:
    - supabase/migrations/20260929180000_enforce_loot_history_guild_refs.sql
    - app/services/__tests__/loot-history-guild-refs-migration.test.ts
  modified: []
decisions:
  - "Trigger, not tightened policies (PD-01): policies cannot compare NEW with OLD, triggers also cover service_role, one definition"
  - "UPDATE checks only changed reference groups; guild_id change checks all (PD-03)"
  - "OD-1 active membership, OD-2 NULL expansion_id allowed, OD-3 message is developer-facing (orchestrator accepted defaults)"
  - "Deviation: BEFORE ROW triggers run before RLS WITH CHECK, so a failed check for an anon or authenticated non-officer raises the same 42501 and message RLS gives (no oracle); a passing row is always handed on"
metrics:
  duration: "about 25 min"
  completed: 2026-09-29
estimate:
  tokens: 170000
  tasks: 3
actuals:
  tokens: 5754    # chars/4 over the two changed files (23016 chars)
  tasks: 3
  commits: 4
pr:
  number: 317
  url: https://github.com/alexandermayes/loot-list-plus/pull/317
  state: draft, open, base main
---

# Phase quick-260929-j7t Plan 01: GH #313 loot_history guild reference trigger Summary

A SECURITY DEFINER BEFORE INSERT OR UPDATE trigger on public.loot_history now rejects, for every role including service_role, a raid event, raider (active membership) or loot item, tier or expansion that is not the row's own guild's. UPDATE checks only the references a write changes, so existing rows stay editable. Anon and non-officer callers get exactly RLS's 42501 whatever the row points at. Shipped as draft PR #317.

## Delivery

- **PR:** #317, https://github.com/alexandermayes/loot-list-plus/pull/317 (DRAFT, base main, head fix/313-loot-history-rls, "Fixes #313", no em dash, ends with the Claude Code line). Not merged. No --admin. Nothing pushed to main. No SQL run against any real database.
- **Worktree:** /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt313 (from origin/main 54ef64a8, node_modules symlinked, not staged).
- **Branch diff:** exactly the two repo files (483 insertions).

| Commit | Message |
|---|---|
| cf7271b4 | fix(db): reject loot_history rows linked to another guild's raid event (#313) (Task 1, tracer) |
| ce80ae4f | fix(db): also check the loot_history raider and loot item belong to the guild (#313) (Task 2) |
| 57f3d991 | fix(db): give callers RLS refuses the RLS error before the loot_history reference checks (#313) (deviation, first version) |
| 3fb0601c | fix(db): only swap in the RLS error once a loot_history check has failed (#313) (deviation, corrected) |

All four commits carry `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Approach

- **Trigger over policies (PD-01).** A policy WITH CHECK cannot compare NEW with OLD, so a notes edit on a legacy mislinked row or on a departed raider's award would fail. A trigger also fires for service_role (BYPASSRLS), so it catches future route, script and migration bugs (#277, #294, #296 were all route bugs). It is one definition, where policies would need two copies. The four loot_history policies are unchanged (G3 byte-identical snapshot).
- **Rules:** raid_event_id is a raid_events row of the guild (D-03). character_id has an active cgm row in the guild, NULL with character_name allowed (D-04). The item resolves through loot_items -> raid_tiers -> expansions to the guild (D-05). raid_tier_id equals the item's own tier, and a non-NULL expansion_id equals that tier's expansion (D-06).
- **Changed columns only on UPDATE (D-07, PD-03).** The trigger is declared `UPDATE OF` the six columns, and NEW vs OLD flags inside cover re-sent unchanged values. A guild_id change checks everything. Raid event deletion (ON DELETE SET NULL) keeps working.
- **Error contract (PD-07).** 23514, a fixed message per rule raised via `RAISE USING MESSAGE` (never a format string), ids in DETAIL only, and the same message for a nonexistent id as for a foreign one (the trigger runs before the FK checks).
- **Security (PD-02).** SECURITY DEFINER, `search_path` pinned to public, pg_temp, schema-qualified names, EXECUTE revoked from PUBLIC, anon and authenticated, read-only body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Oracle for callers RLS refuses (plan premise was wrong)**
- **Found during:** Task 1/2 (probe before the harness, then confirmed by the Task 2 matrix)
- **Issue:** The plan's key_links say the trigger "fires after the RLS WITH CHECK admits the officer", and T-313-03's "no existence oracle" mitigation depends on that. In PostgreSQL, BEFORE ROW triggers run before the RLS WITH CHECK (confirmed in PGlite with order-probe.mjs). With the planned body, anon (public key) and signed-in non-officers got 23514 naming the failing column instead of RLS's 42501, so they could learn whether a raid event, raider or item belongs to any guild. Evidence: run-output-313-task2-pre-gate.txt shows 75/81, with X1b, X1c, X1d, X1e, X2b and X2c failing.
- **Fix:** Checks record the first failure. A passing row is always handed on (RLS alone decides who may write). Only if a check failed, and `current_setting('role', true)` is anon or authenticated, and `NOT public.is_guild_officer(NEW.guild_id)`, does the trigger raise `new row violates row-level security policy for table "loot_history"` with 42501. Otherwise it raises the 23514. The RAISE count went from the plan's 5 literal RAISEs to 5 `v_error` literals plus 2 `RAISE USING` statements, and the shape test was adjusted to match (still 5 SQL statements, same order).
- **Files modified:** both repo files. **Commits:** 57f3d991, 3fb0601c.

**2. [Rule 1 - Bug] My first gate version broke raid event deletes via an officer's own session**
- **Found during:** self-review after 57f3d991
- **Issue:** The eager gate (refuse before any check) also fired on the ON DELETE SET NULL cascade. An officer deleting their own raid event with their session got a 42501 whenever another guild's legacy row pointed at it. Evidence: run-output-313-eager-gate.txt shows 81/83, with U10a and U10b failing.
- **Fix:** Made the gate lazy (failure path only), as described above. Added U10 (the cascade case) and U11 (moving a row into a guild the officer does not run gets RLS's 42501). **Commit:** 3fb0601c.

**3. [Rule 3 - Harness] The baseline statement splitter had to honour double-quoted identifiers**
- One policy name contains an apostrophe ("Officers can manage guild characters' equipped items"). Scratchpad only.

**Additions beyond the plan's matrix (harness only):** all baseline loot_history indexes copied (not only the unique one); SELECT on the reduced tables granted to anon as well (Supabase default grants); DELETE on raid_events granted to authenticated for U10; PF2-pre (the single-row loop without the trigger) for a ratio; U4 (re-sending the unchanged raid event and item group); X0 to X2 (non-officer and anon oracle checks); LB1 (a guild B row on a guild A event), which changes AQ1's expected raid-event count from 1 to 2.

**Unverified assumption, surfaced in the PR:** the gate reads `current_setting('role', true)`, which PostgREST sets per request. The ctx7 CLI is not installed and no Context7 MCP was available, so I could not check this against the PostgREST docs. If the setting were missing, the swap would not happen and behaviour would fall back to the plain checks. It cannot block a write that RLS would allow.

## Write-path audit (D-08, re-confirmed in WT)

No client-side (RLS-subject) code writes loot_history. Every browser call is a SELECT: MasterSheetContent.tsx (3), DashboardContent.tsx (3), raid-tracking/_client.tsx (3).

| Path | Client | Write | Result |
|---|---|---|---|
| POST /api/loot-history/bulk | service role | INSERT per row, buildBulkAwardRow | passes (S5a) |
| PATCH /api/loot-history/bulk | service role | UPDATE character_id/character_name/notes, new id checked active | passes (S5e) |
| DELETE /api/loot-history/bulk (2), POST /api/user/delete-account | service role | DELETE | unaffected |
| POST /api/addon/loot-award | service role | INSERT buildAddonAwardRow | passes (S5b) |
| POST /api/addon/import-string | service role | INSERT buildImportStringAwardRow | passes (S5c) |
| POST /api/loot-submissions/remove-item (already_obtained) | service role | INSERT buildRemoveItemHistoryRow | passes (S5d), OD-1 |
| scripts/backfill-team-event-routing.ts | service role | UPDATE raid_event_id same guild; DELETE dupes | passes / unaffected |
| scripts/link-loot-to-raids.ts | service role | UPDATE raid_event_id | passes unless raid_events.guild_id disagrees (script logs and continues) |
| scripts/seed-test-data-multiuser.ts | service role | batch INSERT; active memberships first; pool tier belongs to pool expansion, items from that tier (confirmed) | passes |
| scripts/purge-test-characters.ts | service role | DELETE | unaffected |
| delete_guild, reset_guild_season | definer SQL | DELETE | unaffected |
| 20260825000000_dedupe_raid_events.sql | migration | applied, same-guild re-point | unaffected |
| discord-bot, companion, addon | n/a | no references | unaffected |

## PGlite proof

The harness is scratchpad only: /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pglite-313/scenarios-313.mjs, with output in run-output-313.txt (plus run2 and run3). It uses @electric-sql/pglite 0.5.8 (PostgreSQL 18.3), symlinked from pglite-289, with nothing installed. It runs the real WT migration file, with baseline statements extracted verbatim at run time (35 statements).

**Result: 85/85 PASS on all three runs.** Counts per group:

| Group | PASS |
|---|---|
| P (hole is real before the migration) | 3 |
| APPLY | 1 |
| IDEM (re-apply) | 1 |
| AQ (audit query counts 2, 3, 1, 1, 1) | 1 |
| W (valid, NULL raider, NULL event, NULL expansion) | 4 |
| R (each foreign reference 23514, same message for nonexistent, never 23503, right column named) | 12 |
| N (23502 kept, RLS 42501 kept) | 2 |
| U (legacy and departed rows editable, changed refs re-checked, guild move, delete cascades incl. U10/U11) | 24 |
| S (service_role rejections, every builder shape and bulk PATCH pass) | 10 |
| X (anon and non-officer get identical RLS 42501 and message) | 9 |
| M (no uuid in any 23514 message) | 1 |
| G (no EXECUTE, direct call 42501, trigger catalog, policies unchanged) | 4 |
| PF (every perf row lands) | 4 |
| EX (index scans for all three lookups) | 3 |
| RB (rollback drops both, reopens hole, rows untouched, re-apply closes it) | 6 |

**Bulk timing (PGlite WASM, three runs):**

| Measure | Without trigger | With trigger |
|---|---|---|
| PF0/PF1 1000-row set-based INSERT, service_role | 31.1 to 35.1 ms | 49.6 to 53.2 ms (1.49x to 1.66x, about +0.02 ms/row) |
| PF2 100 single-row INSERTs (bulk route shape) | 18.3 to 19.4 ms | 18.7 to 20.4 ms (1.02x to 1.08x, about 0.2 ms/row) |

## Verification (against the Task 1 baseline)

| Check | Baseline (origin/main 54ef64a8) | Final (3fb0601c) |
|---|---|---|
| `npx vitest run --maxWorkers=2` | 125 files, 2341 tests passed, 0 failed | 126 files, 2350 tests passed, 0 failed |
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx eslint app/services/__tests__/loot-history-guild-refs-migration.test.ts` | n/a | exit 0, no findings |
| Shape test alone | n/a | 9/9 passed; mutation checks (eager gate, dropped `is_active = true`) each fail it |

No pre-existing failures, no new failures.

## Open decisions (defaults applied, orchestrator accepted)

- **OD-1:** Active membership required for character_id. A remove-item history row for a submission re-approved after its raider left would fail. The route reports `history_recorded: false`, and the item removal still succeeds.
- **OD-2:** A NULL expansion_id is accepted.
- **OD-3:** Trigger messages are treated as developer-facing, not user copy. They are plain, carry no ids and have no em dashes.
- **New, for review:** the RLS-error swap mirrors today's `is_guild_officer(guild_id)` INSERT/UPDATE policies. If those are loosened later, a newly allowed writer with a bad reference is still rejected, just with the RLS message instead of 23514.

## Threat Flags

None beyond the plan's register. T-313-03 is now actually mitigated for callers RLS refuses (it was not under the plan's body; see Deviation 1).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: supabase/migrations/20260929180000_enforce_loot_history_guild_refs.sql (in WT)
- FOUND: app/services/__tests__/loot-history-guild-refs-migration.test.ts (in WT)
- FOUND: scratchpad/pglite-313/scenarios-313.mjs and run-output-313.txt
- FOUND commits: cf7271b4, ce80ae4f, 57f3d991, 3fb0601c (on origin/fix/313-loot-history-rls)
- FOUND: PR #317 open, draft, base main
