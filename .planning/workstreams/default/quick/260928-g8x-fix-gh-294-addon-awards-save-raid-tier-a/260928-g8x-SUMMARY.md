---
phase: quick-260928-g8x
plan: 01
subsystem: loot-domain, addon-api, loot-history-api
tags: [gh-294, raid-tier, expansion-id, guild-scoping, pglite, tsc-probe]
status: complete
dependency-graph:
  requires:
    - phase: quick-260927-wbu
      provides: lib/loot/guild-scoped-lookup.ts (resolveGuildLootItem, findGuildLootItemsByWowheadIds), extended here
  provides:
    - lib/loot/loot-history-rows.ts (LootHistoryInsert, LootItemScope, buildAddonAwardRow, buildBulkAwardRow, buildImportStringAwardRow)
    - lib/loot/guild-scoped-lookup.ts (resolveGuildLootItem now returns expansion_id; new resolveGuildLootItemIds, formatInvalidLootItemIdsError)
  affects:
    - app/api/addon/loot-award/route.ts
    - app/api/addon/import-string/route.ts
    - app/api/loot-history/bulk/route.ts
tech-stack:
  added: []
  patterns:
    - "Typed row builders: every loot_history insert payload is produced by a pure function annotated to return Database['public']['Tables']['loot_history']['Insert'], so a missing required column fails npx tsc --noEmit instead of a runtime 500 (proven by a recorded tsc probe)"
    - "Batched guild-scope id resolution: resolveGuildLootItemIds dedupes, rejects malformed (non-UUID) ids without querying, chunks loot_items lookups by 100, and never runs an unscoped existence probe (so a 400 response cannot reveal whether an id belongs to another guild)"
    - "Scratchpad-only PGlite schema-contract check: extracts the loot_history DDL verbatim (with count assertions) from the committed migration, applies it to an in-memory Postgres, and proves each row builder's output is actually accepted (and the pre-fix payload actually rejected) by real Postgres constraints -- not just typed correctly"
key-files:
  created:
    - lib/loot/loot-history-rows.ts
    - lib/loot/__tests__/loot-history-rows.test.ts
    - app/api/loot-history/bulk/__tests__/route.test.ts
  modified:
    - lib/loot/guild-scoped-lookup.ts
    - lib/loot/__tests__/guild-scoped-lookup.test.ts
    - app/api/addon/loot-award/route.ts
    - app/api/addon/loot-award/__tests__/route.test.ts
    - app/api/addon/import-string/route.ts
    - app/api/addon/import-string/__tests__/route.test.ts
    - app/api/loot-history/bulk/route.ts
decisions:
  - "OD-2 (orchestrator, overrides the plan's PD-07): a supplied lootItemId not owned by the guild falls back to the award's wowheadId through the same alias-aware guild-scoped lookup addon awards already use (GH #277), instead of outright rejecting the import. Only when both the id and its wowheadId fallback fail is the whole import rejected with 400. A foreign lootItemId is never written -- either the wowheadId-resolved guild item is written instead, or nothing is written at all."
  - "OD-3 (orchestrator, overrides the plan's PD-04 draft copy): the 400 error message for bulk and import-string is fixed, exact copy -- \"Some loot items aren't in this guild's loot tables. Refresh the page and try again.\" -- and never interpolates the offending ids; ids live only in the separate invalid_loot_item_ids field."
  - "OD-1 and OD-4 left out of this PR per the orchestrator; the three deferred items (addon awards not linked to a raid night, bulk trusting client raid_event_id/character_id, remove-item's untyped insert) are filed as GH #295, #296, #297 and listed under Not in this PR in the PR body."
  - "resolveGuildLootItemIds never runs an unscoped existence probe to distinguish 'another guild's id' from 'no such id' -- both land in invalidIds identically, since that probe would itself leak whether an id exists under another guild (T-294-03)."
  - "Consistency check (plan Step D, Task 1): addon loot-award rows now set raid_tier_id, expansion_id and source 'addon', matching what the bulk route already set for raid_tier_id/expansion_id before this PR; raid_event_id stays unset on addon rows per the plan's PD-01 (neither addon route resolves a raid event; out of scope for GH #294, tracked separately as GH #295)."
  - "D-04 upsert grep (plan Task 2 Step C): grep -n \"upsert\" across all three routes returns zero matches -- none of them use upsert; the bulk route's existing dedupe path is the per-row insert mapping Postgres 23505 to 'duplicate', confirmed unchanged."
metrics:
  duration: ~65min
  completed: 2026-09-28
actuals:
  tokens: 18436
  tasks: 3
  commits: 4
---

# Phase quick-260928-g8x Plan 01: Fix GH #294 (addon awards save raid tier) Summary

Addon and companion loot awards write `raid_tier_id`/`expansion_id` again (was a guaranteed 500 before this fix, since `raid_tier_id` is `NOT NULL` with no default), the bulk and import-string routes now resolve every client-supplied `loot_item_id` against the calling guild on the server before any write (with a wowheadId fallback for import-string per OD-2), and every `loot_history` insert across all three routes is produced by a typed, pure row builder proven against both `npx tsc --noEmit` and a real (in-memory) Postgres schema.

## PR

**#299** (draft): https://github.com/alexandermayes/loot-list-plus/pull/299
Branch: `fix/294-award-writes` (from `origin/main` at `d06516a1`)
Base: `main`
Title: "fix: save raid tier on addon awards and check award item ids belong to the guild (#294)"

## Commits

- `a73eb3cd` — fix(294): save raid tier and expansion on addon loot-award inserts
  - `lib/loot/guild-scoped-lookup.ts`, `lib/loot/__tests__/guild-scoped-lookup.test.ts`
  - `lib/loot/loot-history-rows.ts` (new)
  - `app/api/addon/loot-award/route.ts`, `app/api/addon/loot-award/__tests__/route.test.ts`
- `df37494d` — fix(294): check bulk award item ids belong to the guild and take tier from the server
  - `lib/loot/guild-scoped-lookup.ts`, `lib/loot/__tests__/guild-scoped-lookup.test.ts`
  - `lib/loot/loot-history-rows.ts`
  - `app/api/loot-history/bulk/route.ts`, `app/api/loot-history/bulk/__tests__/route.test.ts` (new)
- `b5b39101` — fix(294): check import-string item ids belong to the guild and type every award row
  - `lib/loot/loot-history-rows.ts`
  - `lib/loot/__tests__/loot-history-rows.test.ts` (new)
  - `app/api/addon/import-string/route.ts`, `app/api/addon/import-string/__tests__/route.test.ts`
- `ba92ae44` — fix(294): silence eslint no-unused-vars on formatInvalidLootItemIdsError
  - `lib/loot/guild-scoped-lookup.ts`

All four commits carry `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Baseline

Worktree created at `wt294` from `origin/main` (`d06516a1`), `node_modules` symlinked from the main checkout. Baseline `npx vitest run`: **87 test files, 1722 tests, 0 failures.** Baseline `npx tsc --noEmit`: clean.

## OD-2: import-string fallback behavior (all four branches tested)

Per the orchestrator's locked decision, a supplied `lootItemId` that does not resolve within the calling guild now falls back to the award's `wowheadId` through the guild-scoped, alias-aware lookup (`resolveGuildLootItem`, GH #277), instead of outright rejecting. Only when both the `lootItemId` and the `wowheadId` fallback fail is the whole import rejected with 400. Tested branches (all in `app/api/addon/import-string/__tests__/route.test.ts`):

1. **Valid id** (guild owns it directly): checked via `loot_items` filtered by `id` and the guild's tier ids; its payload carries the server's tier and expansion.
2. **Foreign id, wowheadId resolves**: the foreign id is never written; the wowheadId-resolved guild item is written instead.
3. **Foreign id, wowheadId does not resolve**: whole import rejected 400, `invalid_loot_item_ids` lists the id, `importAttendanceByTeam` not called, zero inserts.
4. **Missing id** (no `lootItemId` supplied): existing wowheadId-only path, unaffected by OD-2 — still resolves (or errors per-award as before).

A fifth test covers a mix of one guild-owned id and one fully-unresolvable foreign id in the same import: rejected 400, zero inserts (no partial write).

## OD-3: exact 400 copy

Both the bulk route and the import-string route use `formatInvalidLootItemIdsError`, which returns the fixed string `"Some loot items aren't in this guild's loot tables. Refresh the page and try again."` regardless of which ids are invalid. The offending ids are returned only in the separate `invalid_loot_item_ids` JSON field. No em dashes. This exact string is asserted in both route test suites.

## Schema contract (PGlite)

Installed only in the scratchpad folder `pglite-294` (`@electric-sql/pglite@0.5.8`, pinned with `--save-exact --ignore-scripts`; repository verified as `git+https://github.com/electric-sql/pglite.git` before install). Never added to the repo's `package.json`/`package-lock.json` (confirmed by the file-diff check below). The script (`contract-294.ts`) extracts the `loot_history` DDL verbatim from `supabase/migrations/20260101000000_baseline_schema.sql` with count assertions (1 CREATE TABLE, 1 PRIMARY KEY, 6 FOREIGN KEY constraints, 1 unique index), scans every other migration for stale `loot_history` DDL, applies the extracted DDL to an in-memory Postgres, and proves every row builder's output is accepted while the pre-fix payload is rejected.

```
PASS extraction: 1 CREATE TABLE, 1 PRIMARY KEY, 6 FOREIGN KEY constraints, 1 unique index found
PASS scan: no loot_history DDL found in 27 other migration file(s)
PASS schema: extracted DDL applied to in-memory Postgres with no error
PASS schema-contract: loot_history.raid_tier_id is_nullable = 'NO'
PASS seed: one row per parent table (plus a second expansion/tier/item pair) inserted
PASS negative-control: pre-fix payload rejected (23502 raid_tier_id)
loot-award builder row: {"id":"dfc01463-93b1-45ad-9eb5-7b6d121decb9","raid_tier_id":"33333333-3333-3333-3333-333333333333","expansion_id":"22222222-2222-2222-2222-222222222222","source":"addon","awarded_date":"2026-01-01"}
PASS loot-award: builder row accepted by Postgres
import-string (wowheadId path) builder row: {"id":"a5defab9-b3ae-4214-a17c-f191f86c2707","raid_tier_id":"33333333-3333-3333-3333-333333333333","expansion_id":"22222222-2222-2222-2222-222222222222","source":"addon","awarded_date":"2026-01-05"}
PASS import-string (wowheadId path): builder row accepted by Postgres
import-string (supplied lootItemId) builder row: {"id":"806a9311-88f6-4208-9896-64c81188a337","raid_tier_id":"33333333-3333-3333-3333-333333333334","expansion_id":"22222222-2222-2222-2222-222222222223","source":"addon","awarded_date":"2026-01-02"}
PASS import-string (supplied lootItemId): builder row accepted by Postgres
bulk (raid_event_id + character_id) builder row: {"id":"1fa8c3ed-c93a-4d85-bc21-62434afd4a0d","raid_tier_id":"33333333-3333-3333-3333-333333333333","expansion_id":"22222222-2222-2222-2222-222222222222","source":"web","awarded_date":"2026-01-10"}
PASS bulk (raid_event_id + character_id): builder row accepted by Postgres
bulk (no awarded_date) builder row: {"id":"3e40a90b-dcfc-46ac-b10f-387903ead2f4","raid_tier_id":"33333333-3333-3333-3333-333333333334","expansion_id":"22222222-2222-2222-2222-222222222223","source":"web","awarded_date":"2026-09-28"} CURRENT_DATE: 2026-09-28
PASS bulk (no awarded_date): DB default CURRENT_DATE applied
PASS dedupe: unique award index rejects the duplicate (23505)
All PGlite schema-contract checks passed.
```

12 PASS lines, 0 FAIL lines, exit 0.

## Typecheck probe (D-05)

With the `raid_tier_id` line deleted from `buildAddonAwardRow`'s returned object, `npx tsc --noEmit` in `wt294` failed with:

```
lib/loot/loot-history-rows.ts(53,3): error TS2741: Property 'raid_tier_id' is missing in type '{ guild_id: string; character_id: string | null; character_name: string; loot_item_id: string; expansion_id: string; awarded_date: string; awarded_by: string; source: string; notes: string | null; }' but required in type '{ awarded_by?: string | null | undefined; awarded_date?: string | undefined; character_id?: string | null | undefined; character_name?: string | null | undefined; created_at?: string | null | undefined; ... 8 more ...; updated_at?: string | ... 1 more ... | undefined; }'.
```

Restored with `git checkout -- lib/loot/loot-history-rows.ts`; `git status --porcelain` then listed no tracked changes, and a rerun of `npx tsc --noEmit` was clean.

## Final verification

- `npx vitest run` (full suite): **89 test files, 1760 tests, 0 failures** (baseline 87/1722 — 2 new files, 38 new tests, no regressions). One session note: the first two full-suite attempts hit `[vitest-pool]: Failed to start forks worker` / `Timeout waiting for worker to respond` from a heavily loaded shared host (`uptime` load average ~294 on 10 CPUs, likely from concurrent sibling agent sessions) — not a code defect. A rerun with `--maxWorkers=2` completed cleanly; the suite itself needs no special flags to pass.
- `npx tsc --noEmit`: clean.
- `npx eslint` on all ten touched files: **0 errors, 0 warnings** (one warning — unused `_invalidIds` param on `formatInvalidLootItemIdsError`, kept for a stable call-site signature per OD-3 — silenced with a targeted eslint-disable comment, commit `ba92ae44`).
- `git diff --name-only origin/main...HEAD` lists exactly the 10 files in the plan's `files_modified`. `git diff --name-only origin/main...HEAD -- supabase package.json package-lock.json` is empty (no migration change, no repo dependency change).
- Branch pushed: `origin/fix/294-award-writes`. Draft PR #299 opened against `main`, verified via `gh pr view --json`: `isDraft=true`, `baseRefName=main`, body contains "Fixes #294" and "#289", no em dash in title+body, body ends with the exact Claude Code closing line.
- No merge, no `--admin`, no push to `main`, no SQL against a real database, no change under `supabase/migrations`.

## Deviations from Plan

### Locked decisions overriding the plan (not auto-fixes; orchestrator-directed before execution)

**1. [Orchestrator decision OD-2] import-string lootItemId resolution changed from outright rejection (plan's PD-07) to a wowheadId fallback**
- **Found during:** Before Task 3 execution (delivered in the orchestrator's locked-decisions block).
- **Change:** The plan's Step B (as originally written, PD-07) rejected the whole import with 400 whenever ANY supplied `lootItemId` did not resolve within the guild. OD-2 instead requires falling back to the award's `wowheadId` through the guild-scoped alias-aware lookup first; only when that also fails is the import rejected.
- **Implementation:** `resolveImportAwardScopes` in `app/api/addon/import-string/route.ts` batches the direct guild-ownership check via `resolveGuildLootItemIds`, then for every id that came back unowned, calls `resolveGuildLootItem(supabase, guildId, award.wowheadId)` as a fallback. `processAward` receives the pre-resolved scope (covering both the directly-owned and fallback-resolved cases) and only falls through to its own wowheadId resolution when no `lootItemId` was supplied at all.
- **Files modified:** `app/api/addon/import-string/route.ts`, `app/api/addon/import-string/__tests__/route.test.ts`.
- **Commit:** `b5b39101`.
- **Tests:** All four required branches (valid id, foreign+resolves, foreign+fails, missing id) plus a mixed-batch case; see the OD-2 section above.

**2. [Orchestrator decision OD-3] 400 error copy fixed to an exact string, ids removed from the message**
- **Found during:** Before Task 2 execution (delivered in the orchestrator's locked-decisions block).
- **Change:** The plan's PD-04 proposed `"Loot items not found in this guild: " + ids.join(', ')`, flagged for sign-off. OD-3 supplies the approved exact copy instead, with ids excluded from the message entirely.
- **Implementation:** `formatInvalidLootItemIdsError` in `lib/loot/guild-scoped-lookup.ts` returns the fixed string regardless of its `ids` argument (kept for a stable call-site signature).
- **Files modified:** `lib/loot/guild-scoped-lookup.ts`, `app/api/loot-history/bulk/route.ts`, `app/api/addon/import-string/route.ts`, and their test files.
- **Commits:** `df37494d`, `b5b39101`.

**3. [Deferred by orchestrator] OD-1 and OD-4 left out of this PR**
- The orchestrator directed that OD-1 and OD-4 (not detailed to the executor beyond "leave them out") be excluded, filed as follow-up issues instead. Combined with the plan's own already-scoped-out items, the PR body's "Not in this PR" section lists all three: addon/companion awards not linked to a raid night (GH #295), the bulk route still trusting client `raid_event_id`/`character_id` (GH #296), and `app/api/loot-submissions/remove-item/route.ts`'s untyped insert (GH #297).

### Auto-fixed issues (Rule 1/3)

**4. [Rule 3 — blocking lint issue] `formatInvalidLootItemIdsError`'s unused `ids` parameter**
- **Found during:** Final `npx eslint` pass in Task 3.
- **Issue:** OD-3's fixed-string implementation left the `ids` parameter genuinely unused, tripping `@typescript-eslint/no-unused-vars` as a warning.
- **Fix:** Added a targeted `eslint-disable-next-line` comment explaining the parameter is kept for a stable call-site signature.
- **Files modified:** `lib/loot/guild-scoped-lookup.ts`.
- **Commit:** `ba92ae44`.

No other deviations. Every other must-have (D-01, D-04 through D-07) was implemented exactly as planned; D-02/D-03 were implemented per OD-2/OD-3 as described above.

## Known Stubs

None.

## Threat Flags

None. Every threat in the plan's threat register (T-294-01 through T-294-07, T-294-SC) was mitigated as planned; T-294-05 (bulk `raid_event_id`/`character_id` unchecked) remains an accepted, explicitly out-of-scope risk per the threat model, now tracked as GH #296.

## Self-Check: PASSED

- `lib/loot/loot-history-rows.ts` — FOUND
- `lib/loot/__tests__/loot-history-rows.test.ts` — FOUND
- `app/api/loot-history/bulk/__tests__/route.test.ts` — FOUND
- `lib/loot/guild-scoped-lookup.ts` (modified) — FOUND
- `app/api/addon/loot-award/route.ts` (modified) — FOUND
- `app/api/addon/import-string/route.ts` (modified) — FOUND
- `app/api/loot-history/bulk/route.ts` (modified) — FOUND
- Commit `a73eb3cd` — FOUND in `git log --oneline --all`
- Commit `df37494d` — FOUND in `git log --oneline --all`
- Commit `b5b39101` — FOUND in `git log --oneline --all`
- Commit `ba92ae44` — FOUND in `git log --oneline --all`
- Branch `origin/fix/294-award-writes` — FOUND on GitHub, up to date with `ba92ae44`
- PR #299 — FOUND, draft, base `main`, head `fix/294-award-writes`
