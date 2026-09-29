---
phase: quick-260929-j7t
verified: 2026-09-29T15:05:00Z
status: human_needed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "After the migration merges and auto-deploys, in the real Supabase project, send a PostgREST write to loot_history as a real non-officer/authenticated session (or anon key) whose row fails a reference check (e.g. a foreign raid_event_id), and inspect the HTTP response."
    expected: "A 403 with the standard RLS message ('new row violates row-level security policy for table \"loot_history\"'), identical to what that same caller gets today for a bad-reference row with no trigger at all -- never a 400/23514 naming which column failed."
    why_human: "The trigger's information-disclosure fix (the deviation) gates on `current_setting('role', true)` to detect that the caller is 'anon' or 'authenticated' under PostgREST. This matches PostgREST's documented per-request `SET ROLE`/`SET LOCAL ROLE` mechanism, and the PGlite harness emulates that mechanism faithfully (its asUser/asAnon/asService helpers issue the same SET ROLE calls), but neither the harness nor this verification runs against a real PostgREST/Supabase instance. The executor's own SUMMARY and PR body flag this exact assumption as unverified ('I could not check this against the PostgREST docs'). Per the task's own instruction, a real deployed test is warranted here because this is a gap the harness cannot close, and it is the crux of the T-313-03 mitigation (preventing anon/non-officer callers from using the trigger as a guild-membership oracle)."
---

# Phase quick-260929-j7t: GH #313 loot_history guild-reference trigger Verification Report

**Task Goal:** Fix GH #313 with a migration so no loot_history row can reference another guild's raid_event_id, character_id (active membership, NULL allowed), loot_item_id, raid_tier_id or expansion_id, for every role including service_role. Existing write paths keep working, legacy rows stay editable, and the checks reveal nothing to callers RLS would refuse. Delivered as draft PR #317, "Fixes #313".

**Verified:** 2026-09-29T15:05:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

All automated checks below were re-run independently in this session (not taken from SUMMARY.md claims): the shape test, the full vitest suite, tsc, eslint, the PGlite behavior harness, `git diff`, `gh pr view`, and direct grep of the migration SQL and shape-test source.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An officer's own-session PostgREST INSERT/UPDATE of guild A's history with guild B's (or a nonexistent) `raid_event_id` fails 23514 with the same message on both; pre-migration the hole is real | ✓ VERIFIED | Re-ran `scenarios-313.mjs`: `P1` (pre-migration insert succeeds), `R1`/`R2` (both 23514, identical message `loot_history.raid_event_id is not a raid event of this guild`), `U5a` (UPDATE variant also rejected). Migration source lines 140-146. |
| 2 | `character_id`, when set, must have an active `character_guild_memberships` row in the row's guild; NULL with `character_name` is allowed | ✓ VERIFIED | `R3` (foreign raider), `R4` (departed raider, `is_active=false`), `R5` (no membership) all 23514; `W2` (NULL character_id + name) succeeds. Migration source lines 148-156. |
| 3 | `loot_item_id` must resolve through `raid_tiers`/`expansions` to the row's guild; `raid_tier_id` must equal the item's own tier; a non-NULL `expansion_id` must equal that tier's expansion | ✓ VERIFIED | `R6`-`R10` each reject the right column with the right message (`M1`/naming check also confirmed). Migration source lines 160-178. |
| 4 | Legacy/mislinked rows and departed-raider awards stay editable on unrelated-column and re-sent-unchanged updates; raid event deletion still nulls `raid_event_id` on affected awards | ✓ VERIFIED | `U1` (6 legacy rows, notes-only), `U2` (awarded_date-only), `U3`/`U4` (re-sent unchanged values), `U9` (raid event delete nulls a departed-raider row), `U10` (officer deletes own event while a foreign-guild legacy row points at it — see truth 6c below). |
| 5 | The trigger fires for `service_role` (BYPASSRLS) too; every service-role route/script's row shape still passes | ✓ VERIFIED | `S1`-`S5e` (bulk INSERT/UPDATE, addon award, addon import, remove-item shapes) all pass; `S2`/`S3a`/`S3b` reject foreign references for service_role with 23514+DETAIL. |
| 6a | A valid row is always passed through untouched, so RLS alone decides who may write | ✓ VERIFIED | Migration: `IF v_error IS NULL THEN RETURN NEW; END IF;` (line 180-182) precedes the RLS-equivalent gate; shape test asserts `passThrough > lastLookup` and `gate > passThrough`. Confirmed no valid-row scenario (`W1`-`W4`, `S1`, `S5*`) is ever blocked. |
| 6b | A non-officer with a bad reference and a non-officer with good references get the identical error | ✓ VERIFIED | `X1a` (valid refs, non-officer) and `X1b`-`X1d` (foreign event/raider/item, non-officer) all return 42501 with the exact same message; `X1e` asserts the message set has length 1. Same pattern for anon (`X2a`-`X2c`). |
| 6c | An officer deleting their own raid event, while another guild's legacy row points at it, still works | ✓ VERIFIED | `U10a` (officer O_A deletes own event EVA_X via their own session while guild-B legacy row LB1 points at it — succeeds) and `U10b` (LB1's `raid_event_id` is NULL afterward). This is the regression the executor's first ("eager gate") attempt broke and then fixed (SUMMARY Deviation 2). |
| 6d | The service role gets 23514 with DETAIL, never the RLS 42501 | ✓ VERIFIED | `S2`/`S3a`/`S3b` show `23514 ... | DETAIL <column> <id>, guild_id <id>` for service_role on every reference type. |
| 7 | A notes-only UPDATE on a legacy mislinked row succeeds | ✓ VERIFIED | `U1` (6 rows including L1, the row seeded specifically to prove the pre-migration hole). |
| 8 | EXECUTE is revoked from PUBLIC/anon/authenticated but the trigger still fires for them | ✓ VERIFIED | Migration line 200 (`REVOKE ALL ... FROM PUBLIC, "anon", "authenticated"`); `G1a` (`has_function_privilege` false for anon/auth) and `G1b` (direct call fails 42501) while `R1`-`R10`, `X1*`, `X2*` prove the trigger still fires for those same roles. |
| 9 | `search_path` is pinned | ✓ VERIFIED | Migration line 114: `SET "search_path" TO 'public', 'pg_temp'`; `G2` catalog check confirms `proconfig: ["search_path=public, pg_temp"]` on the live function. |
| 10 | No browser-side code writes `loot_history` (only SELECTs) | ✓ VERIFIED | Independently grepped `app/` and `components/` for `.from('loot_history')`: all 9 client-component call sites (`raid-tracking/_client.tsx`, `MasterSheetContent.tsx`, `DashboardContent.tsx`) are `.select(...)`. Every `.insert`/`.update`/`.delete`/`.upsert` call site found by `git grep` is in `app/api/**/route.ts` (service role) or `scripts/*.ts` (service role scripts). |
| 11 | The SQL shape test passes in the full vitest suite, and the scratchpad PGlite proof runs the real migration file and passes every scenario, including idempotent re-apply and rollback | ✓ VERIFIED | Re-ran shape test alone: 9/9 pass. Re-ran full suite: 126 files / 2350 tests passed, 0 failed (matches SUMMARY exactly; baseline was 125/2341). Re-ran `node scenarios-313.mjs`: **85/85 PASS**, including `IDEM` (re-apply) and `RB1a`-`RB1f` (rollback drops/reopens the hole, re-apply closes it, row count unchanged). |
| 12 | One DRAFT PR against `main`, "Fixes #313", no em dash, ends with the Claude Code line; diff is exactly the migration + test; nothing merged, no `--admin`, no push to `main`, no SQL against a real database | ✓ VERIFIED | `gh pr view 317`: `{"baseRefName":"main","isDraft":true,"state":"OPEN"}`. PR body: contains "Fixes #313" (1x), 0 em dashes, last line is the Claude Code line. `git diff --name-only origin/main...HEAD` = exactly the 2 declared files. All 4 commits carry `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No evidence of any push to `main` or `--admin` merge (branch tracks `origin/fix/313-loot-history-rls`, working tree clean). |

**Score:** 8/8 must-haves verified (12/12 individual sub-truths, folding the 4 specifically-requested deviation checks (a)-(d) into truths 6a-6d)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260929180000_enforce_loot_history_guild_refs.sql` | SECURITY DEFINER trigger function + BEFORE INSERT OR UPDATE OF trigger; EXECUTE revoked | ✓ VERIFIED | Read in full. 5 statements exactly, matches shape test's expectations, matches PLAN's D-01 through D-10/PD-01 through PD-09 design. |
| `app/services/__tests__/loot-history-guild-refs-migration.test.ts` | Dollar-quote-aware shape test | ✓ VERIFIED | Read in full; re-ran, 9/9 pass; also passes inside the full suite run. |
| `scratchpad/pglite-313/scenarios-313.mjs` | Scratchpad-only PGlite behavior proof | ✓ VERIFIED (re-run) | Re-executed directly; 85/85 PASS, matches SUMMARY's counts per group exactly. Correctly never committed to the repo (git diff confirms only the 2 repo files changed). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| PostgREST INSERT/UPDATE on `loot_history` (role `authenticated`) | `enforce_loot_history_guild_refs()` | `BEFORE INSERT OR UPDATE OF` the 6 reference columns | ✓ WIRED | Confirmed by direct SQL read and `G2` catalog probe (trigger is enabled, row-level, before, on both INSERT and UPDATE, exact 6-column list). |
| service-role routes (`bulk`, `addon/*`, `remove-item`) | `enforce_loot_history_guild_refs()` | Trigger fires regardless of BYPASSRLS | ✓ WIRED | `S1`-`S5e` prove the trigger runs under `service_role` and every real builder shape passes. |
| `raid_events` DELETE | `loot_history_raid_event_id_fkey ON DELETE SET NULL` | RI action UPDATEs `raid_event_id`, so the trigger fires (no-op since `NULL` never fails) | ✓ WIRED | `U9`, `U10` confirm the cascade still works, including the case where the cascade updates a row in a different guild than the deleting officer's own. |
| `enforce_loot_history_guild_refs()` | `public.is_guild_officer(guild_id)` (deviation, not in original plan) | Only called on the failure path, to decide whether to swap in the RLS-equivalent error | ✓ WIRED | Migration line 188; shape test asserts exactly 1 call and its position after the pass-through return; `X0`-`X2`, `U11` confirm behavior for non-officers/anon/guild-move. |

### Behavioral Spot-Checks / Probe Execution

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Shape test proves the migration's static shape | `npx vitest run app/services/__tests__/loot-history-guild-refs-migration.test.ts` | 9/9 passed | ✓ PASS |
| Full workspace suite has no regressions | `npx vitest run --maxWorkers=2` (run once) | 126 files / 2350 tests passed, 0 failed | ✓ PASS |
| Type checking clean | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| Lint clean on the new test | `npx eslint app/services/__tests__/loot-history-guild-refs-migration.test.ts` | exit 0, no findings | ✓ PASS |
| PGlite behavioral proof against the real migration file | `node scenarios-313.mjs` (scratchpad harness, in-memory, never touches a real DB) | 85/85 PASS (matches SUMMARY exactly, 3rd independent run) | ✓ PASS |

No probes in the `scripts/*/tests/probe-*.sh` convention apply to this task (it is not a migration-runner/tooling phase in that sense); the PGlite harness above is the task's declared equivalent and was executed directly per the task instructions.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none found (`TBD`, `FIXME`, `XXX`, `TODO`, `HACK`, `PLACEHOLDER` grep returned no matches in either touched file) | — | — |

### Requirements Coverage

Requirement IDs (`GH-313-R1` through `R6`, `DELIVERY-R1`) are declared only in this quick task's own PLAN frontmatter (not mirrored into `.planning/workstreams/default/REQUIREMENTS.md`, which is expected for a `/gsd-quick` task). Each maps to a must-have truth verified above:

| Requirement | Description (from PLAN) | Status | Evidence |
|---|---|---|---|
| GH-313-R1 | Foreign/missing raid_event_id rejected, 23514, same message | ✓ SATISFIED | Truth 1 |
| GH-313-R2 | Active-membership character_id check, NULL allowed | ✓ SATISFIED | Truth 2 |
| GH-313-R3 | Item/tier/expansion chain check | ✓ SATISFIED | Truth 3 |
| GH-313-R4 | Legacy rows stay editable; raid event deletion keeps working | ✓ SATISFIED | Truth 4 |
| GH-313-R5 | Trigger covers service_role; write-path audit recorded | ✓ SATISFIED | Truth 5, 10 |
| GH-313-R6 | SQL shape test + PGlite proof, full matrix | ✓ SATISFIED | Truth 11 |
| DELIVERY-R1 | One draft PR, migration-only diff, no merge/push/admin/real-DB SQL | ✓ SATISFIED | Truth 12 |

No orphaned requirements found for this phase.

## Deviation Review (executor-reported, independently verified)

The SUMMARY documents one substantive deviation from the plan: PostgreSQL runs `BEFORE ROW` triggers **before** RLS's `WITH CHECK`, which the plan's key_links had assumed was the other way around. Without a fix, a failed reference check would leak information (via a 23514 naming the broken column) to callers RLS would have refused anyway (anon, non-officer). The executor's fix — raise the RLS-equivalent 42501 instead of 23514 whenever a check fails *and* the effective role is anon/authenticated *and* the caller is not an officer of the row's guild — is present in the shipped migration and is exercised by 9 `X`-group PGlite scenarios plus `U10`/`U11` for the regression the first attempt caused. This verification confirms the deviation:

- Does not weaken any of the plan's original must-have truths (an officer's own-guild writes always still get 23514, per truth 1).
- Is fully covered by the PGlite matrix, independently re-run here with identical results.
- Is disclosed in both the SUMMARY and the PR body, including the one open, genuinely-unverified assumption (see Human Verification below).

This does not require a `overrides:` entry — it is an executor-discovered fix within the plan's stated "planner discretion" boundary (PD-02's REVOKE/SECURITY DEFINER design), not a missed must-have.

## Human Verification Required

### 1. Real-deployment check of the `current_setting('role', true)` gate

**Test:** After this PR merges (`--admin`) and the migration auto-deploys (~12s per CLAUDE.md), from a non-officer or anon session, send a PostgREST write to `loot_history` whose row fails a reference check (e.g., a foreign `raid_event_id`).

**Expected:** A 403 response with the RLS message `new row violates row-level security policy for table "loot_history"` — the same response that caller already gets today for any bad-reference row (since RLS refuses them regardless) — never a 400 naming the failing column.

**Why human:** The gate depends on `current_setting('role', true)` reflecting PostgREST's real per-request role. This matches PostgREST's documented `SET ROLE`/`SET LOCAL ROLE` mechanism, and the PGlite harness's `asUser`/`asAnon`/`asService` helpers emulate exactly that mechanism (confirmed by reading `scenarios-313.mjs`). But neither the harness nor any check in this verification runs against a real Supabase/PostgREST instance — the task explicitly forbids running SQL against a real database. The executor's own SUMMARY and PR body already flag this as the one unverified assumption. Given this is the entire point of the T-313-03 information-disclosure mitigation (the deviation this task added beyond the original plan), it warrants a real post-deploy check before this is treated as fully closed.

## Gaps Summary

No blocking gaps. All 12 must-have sub-truths were independently re-verified against the live worktree, the shape test, the full test suite, and a fresh run of the PGlite harness (not taken on the SUMMARY's word) — every number matches the SUMMARY's claims exactly (9/9 shape test, 126/2350 full suite, 85/85 PGlite, PR draft/open/base-main, 2-file diff, all 4 commit trailers). The only open item is a real-environment sanity check of a mechanism (`current_setting('role', true)`) that is standard PostgREST behavior but was, by the task's own constraints, never exercised against an actual PostgREST/Supabase deployment — hence `human_needed` rather than `passed`.

---

_Verified: 2026-09-29T15:05:00Z_
_Verifier: Claude (gsd-verifier)_
