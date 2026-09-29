---
phase: quick-260927-wbu
plan: 01
subsystem: loot-domain, addon-api, raid-tracking
tags: [gh-277, faction-alias, guild-scoping, classic-catalog]
status: complete
dependency-graph:
  requires: []
  provides:
    - domain/loot/faction-item-aliases.ts (FACTION_ITEM_ALIASES, wowheadIdCandidates, findByWowheadId, resolveByWowheadId)
    - lib/loot/guild-scoped-lookup.ts (resolveGuildLootItem, findGuildLootItemsByWowheadIds)
  affects:
    - app/api/addon/loot-award/route.ts
    - app/api/addon/import-string/route.ts
    - app/(app)/raid-tracking/_client.tsx
    - data/__tests__/classic-catalog-completeness.test.ts
tech-stack:
  added: []
  patterns:
    - "Exact-id-then-alias resolution order (resolveByWowheadId / findByWowheadId / wowheadIdCandidates)"
    - "Guild scoping via three plain single-column filters (expansions.guild_id -> raid_tiers.expansion_id in(...) -> loot_items.raid_tier_id in(...)), not a nested PostgREST embed filter (replaced after PR review, commit c73279bb)"
key-files:
  created:
    - domain/loot/faction-item-aliases.ts
    - domain/loot/__tests__/faction-item-aliases.test.ts
    - lib/loot/guild-scoped-lookup.ts
    - lib/loot/__tests__/guild-scoped-lookup.test.ts
    - app/api/addon/loot-award/__tests__/route.test.ts
    - app/api/addon/import-string/__tests__/route.test.ts
    - app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts
  modified:
    - app/api/addon/loot-award/route.ts
    - app/api/addon/import-string/route.ts
    - app/(app)/raid-tracking/_client.tsx
    - data/__tests__/classic-catalog-completeness.test.ts
decisions:
  - "SCOPE-01 (user-locked, added after planning): fixed the pre-existing unscoped loot_items lookups in the same PR rather than deferring as OD-02. loot_items has no guild_id column; the addon routes resolved wowhead_id with the service-role client and no guild filter at all, so any guild's row could win for ANY item. New lib/loot/guild-scoped-lookup.ts scopes every lookup to the calling guild's own raid tiers (loot_items -> raid_tiers -> expansions -> guild_id), with active-expansion-then-lowest-raid_tier_id as the deterministic tie-break when a guild owns the same item under more than one of its own expansions."
  - "Removed the dead 'verify item belongs to this guild' raid_tiers check in loot-award/route.ts: it fetched the raid tier but never compared it to guild_id, and is now genuinely redundant since resolveGuildLootItem already proves guild ownership."
  - "Raid-tracking's fallback query (previously a raw unscoped .eq('wowhead_id', ...)) now searches the guild's OWN raid tiers across ALL its expansions (not just current) via findGuildLootItemsByWowheadIds, preserving its 'exists but not in current expansion' vs 'not in database' distinction without leaking another guild's row."
  - "PR review round (commit c73279bb): replaced the two-level nested !inner embed filter in lib/loot/guild-scoped-lookup.ts with three plain, already-proven single-column filters (expansions.guild_id, then raid_tiers.expansion_id in(...), then loot_items.raid_tier_id in(...)), because nothing else in the codebase used the nested-embed shape and it had only run against a fake test client, never real PostgREST. Also stopped discarding each query's error: every error now throws with context instead of silently producing null/[], which the addon routes previously would have rendered as an ordinary 404 'No loot item found' -- a worse regression than #277 itself. loot-award/route.ts now returns a distinct 500 on a lookup-query failure; import-string's per-award try/catch and the raid-tracking fallback's new try/catch both surface the failure without a route-level change, since neither had a single-response-per-lookup shape to begin with."
metrics:
  duration: ~100min
  completed: 2026-09-28
actuals:
  tokens: 58000
  tasks: 4
  commits: 3
---

# Phase quick-260927-wbu Plan 01: Fix GH #277 (Horde quest heads) + guild-scoped lookups (SCOPE-01) Summary

Horde guilds' quest-head awards (Head of Nefarian 19002, Head of Onyxia 18422) now resolve to the guild's own Alliance catalog rows (19003, 18423) through a new faction-alias map, applied at every wowhead_id-to-loot_items lookup site; the same PR also closed a pre-existing cross-guild data leak in those lookups (SCOPE-01, locked user decision), since `loot_items` has no `guild_id` column and the addon routes previously had no guild filter at all.

## PR

**#292** (draft): https://github.com/alexandermayes/loot-list-plus/pull/292
Branch: `fix/277-horde-heads` (from `origin/main` at `21853a3f`)
Base: `main`

## Commits

- `8a84894e` — fix(277): resolve Horde quest heads through a guild-scoped faction alias map in addon loot-award
  - `domain/loot/faction-item-aliases.ts`, `domain/loot/__tests__/faction-item-aliases.test.ts`
  - `lib/loot/guild-scoped-lookup.ts`, `lib/loot/__tests__/guild-scoped-lookup.test.ts`
  - `app/api/addon/loot-award/route.ts`, `app/api/addon/loot-award/__tests__/route.test.ts`
- `5fa43efd` — fix(277): apply the guild-scoped faction alias to addon import-string and the raid-tracking loot import
  - `app/api/addon/import-string/route.ts`, `app/api/addon/import-string/__tests__/route.test.ts`
  - `app/(app)/raid-tracking/_client.tsx`, `app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts`
  - `data/__tests__/classic-catalog-completeness.test.ts`
- `c73279bb` — fix(277): replace the nested-embed guild scope with plain proven filters and stop swallowing query errors (PR review fixup)
  - `lib/loot/guild-scoped-lookup.ts`, `lib/loot/__tests__/guild-scoped-lookup.test.ts`
  - `app/api/addon/loot-award/route.ts`, `app/api/addon/loot-award/__tests__/route.test.ts`
  - `app/api/addon/import-string/__tests__/route.test.ts`
  - `app/(app)/raid-tracking/_client.tsx`, `app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts`

All three commits carry `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Baseline

Worktree created at `wt277` from `origin/main` (`21853a3f`), `node_modules` symlinked from the main checkout. Baseline `npx vitest run`: **81 test files, 1650 tests, 0 failures.**

## Lookup paths fixed (final inventory — matches the plan's inventory, no additions found during execution)

1. **`app/api/addon/loot-award/route.ts`** — resolves `wowhead_id` through `resolveGuildLootItem` (exact id, then alias, scoped to the calling guild). Also fixes the companion app's pending-award ingest, since the companion POSTs to this route without resolving ids itself. Removed the dead "verify belongs to this guild" `raid_tiers` check (fetched but never compared to `guild_id`).
2. **`app/api/addon/import-string/route.ts` `processAward`** — same guild-scoped alias resolution when an award has no `lootItemId`.
3. **Raid-tracking Gargul-format loot import** (`app/(app)/raid-tracking/_client.tsx` — the issue calls this the RCLootCouncil import; no RCLootCouncil-specific importer exists in this repo):
   - `parseLootPreview`, the import handler, and `parseLootImportData` now use `findByWowheadId` instead of a raw `wowhead_id === itemId` comparison.
   - The import handler's "not matched" fallback query now uses `findGuildLootItemsByWowheadIds(supabase, activeGuild.id, wowheadIdCandidates(itemId))`, scoped to the guild's own raid tiers across all its expansions, instead of an unscoped `loot_items` equality query.
4. **`data/__tests__/classic-catalog-completeness.test.ts`** — removed 19002 from `DELIBERATELY_EXCLUDED`; the missing-items check is now alias-aware; added a `Classic faction-variant aliases (#277)` describe block (5 tests: both named-head resolutions, per-alias package/catalog integrity, sibling-set equality).

No lookup site beyond the plan's inventory was found during execution.

## RED evidence for each new/changed test

- **`domain/loot/__tests__/faction-item-aliases.test.ts`** and **`lib/loot/__tests__/guild-scoped-lookup.test.ts`**: pure new modules, module and tests authored together rather than strict test-first (minor TDD-ordering deviation, both fully green on first run — no behavior gap since these are new, self-contained functions with no prior implementation to be RED against).
- **`app/api/addon/loot-award/__tests__/route.test.ts`**: 4 of 6 tests failed against the unmodified route (`expected 404 to be 200`) before the `resolveGuildLootItem` change.
- **`app/api/addon/import-string/__tests__/route.test.ts`**: the Horde-id test failed against the unmodified route with `TypeError: supabase.from(...).select(...).eq(...).limit is not a function` (the fake's shape didn't match the old code's `.limit().single()` chain), then failed the assertion once the fake was fixed, confirming a real behavior gap before `resolveGuildLootItem` was wired in.
- **`app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts`**: verified by a standalone regex check against `git show HEAD:.../_client.tsx` (the pre-Task-2 file) — confirmed 0 `findByWowheadId(` calls, 3 raw `.wowhead_id === itemId` comparisons, 1 raw `.eq('wowhead_id'` filter, and the new imports absent, before the fix.
- **`data/__tests__/classic-catalog-completeness.test.ts`**: removing 19002 from `DELIBERATELY_EXCLUDED` alone (before adding the alias-aware check) turned the missing-items test red with `Blackwing Lair: Head of Nefarian (19002)` reported missing — confirmed, then fixed.

## Final verification (Task 3, before review)

- `npx vitest run`: **86 test files, 1693 tests, 0 failures** (baseline 81/1650 — 5 new files, 43 new tests, no regressions).
- `npx tsc --noEmit`: clean.
- `npx eslint` on the 11 touched files: **0 errors.** 9 pre-existing warnings remain on `app/(app)/raid-tracking/_client.tsx` (unused vars, `react-hooks/exhaustive-deps`); confirmed byte-for-byte present on `origin/main`'s copy of the file before this change (verified via `git show origin/main:... | eslint --stdin`), so none were introduced by this PR.
- `git diff --name-only origin/main...HEAD` lists exactly 11 files (2 more than the plan's 9, due to SCOPE-01's `lib/loot/guild-scoped-lookup.ts` + its test — see Deviations). `git diff --name-only origin/main...HEAD -- supabase data/classic-wow-raids.ts` is empty (D-01 holds: no migration, no Horde catalog rows).
- Branch pushed: `origin/fix/277-horde-heads`. Draft PR #292 opened against `main`, containing "Fixes #277", no em dashes, and closing with the Claude Code line (confirmed via `gh pr view --json` for isDraft/base/head/Fixes-277/no-em-dash; the body's closing-line `endswith` check reported `false` only because GitHub's API appends a trailing `\n\n` to the stored body — raw byte inspection via `gh api repos/.../pulls/292` confirmed the body's actual last content line is exactly `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).
- No merge, no `--admin`, no push to `main`, no SQL, no `supabase db push`, no Management API call. Nothing in the main checkout was touched.

## PR review round (commit c73279bb)

The orchestrator's review of PR #292 required one change before ready-for-review: `lib/loot/guild-scoped-lookup.ts` used a two-level nested `!inner` embed filter (`raid_tiers!inner(expansion_id, expansions!inner(guild_id))` plus `.eq('raid_tiers.expansions.guild_id', guildId)`) that nothing else in the codebase relies on and that had only ever run against a fake test client, never real PostgREST; and every query's `error` was discarded, so a rejected filter or transient DB error would silently produce "no rows," which the addon routes would then render as an ordinary 404 "No loot item found" — indistinguishable from a genuine miss, and a worse regression than #277 itself.

**Fix (commit `c73279bb`):**
- `resolveGuildLootItem` and `findGuildLootItemsByWowheadIds` now resolve the guild scope with three plain, already-proven single-column filters: (a) `expansions.id` where `guild_id = guildId`, (b) `raid_tiers.id`/`expansion_id` where `expansion_id in` (a)'s ids, (c) `loot_items` where `wowhead_id` matches (`.eq` for the single-candidate resolver, `.in` for the batch finder) and `raid_tier_id in` (b)'s ids. A guild with no expansions or no raid tiers returns `null`/`[]` without ever querying `loot_items`.
- Every one of the three queries' `error` is now checked and turned into a thrown `Error` with context (e.g. `Failed to look up loot_items for wowhead_id 19002 (guild guild-1): <message>`) instead of being discarded.
- `app/api/addon/loot-award/route.ts`: the `resolveGuildLootItem` call is now wrapped in try/catch; a thrown lookup error returns **500** with a message distinct from the existing 404 "No loot item found" no-match case, and is logged via `console.error` + `trackApiError` before responding.
- `app/api/addon/import-string/route.ts`: no code change needed — `processAward`'s existing per-award try/catch in the `POST` handler already turns any thrown error (including the new query-failure `Error`) into an `awards.errors++` count, logged via `console.error('Failed to process award:', err)`. The thrown message is now distinct from the genuine-miss `Could not resolve item for wowhead_id X` message, verified by a new test asserting on the logged error's `.message`.
- `app/(app)/raid-tracking/_client.tsx`: the fallback query is now wrapped in its own try/catch; a query failure pushes `Item #<id>: couldn't verify against your guild's data - try again` onto the existing `results.loot.errors` list instead of throwing out of the import loop or being reported as a false "not in database."
- Rewrote all three affected test files (`lib/loot/__tests__/guild-scoped-lookup.test.ts`, `app/api/addon/loot-award/__tests__/route.test.ts`, `app/api/addon/import-string/__tests__/route.test.ts`) to assert the actual query sequence and filter values at each step — proving another guild's expansion/tier id never reaches the `loot_items` query — and added dedicated query-error tests proving each function throws (or the route/import path surfaces a 500/error) rather than resolving to a false no-match. Added a source-guard assertion in `app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts` that the fallback query is wrapped in try/catch pushing to `results.loot.errors`.

**Verification after the fixup:**
- `npx vitest run`: **86 test files, 1708 tests, 0 failures** (15 new tests over the pre-review count: guild-scoped-lookup 8→17, loot-award route 6→9, import-string route 4→6, raid-tracking source guard 7→8).
- `npx tsc --noEmit`: clean (one interim `TS7006` implicit-`any` error on a test callback parameter was fixed before this count).
- `npx eslint` on the 7 files touched by this fixup: **0 errors.** The same 9 pre-existing `_client.tsx` warnings remain (line numbers shifted only from added lines).
- `git diff --name-only origin/main...HEAD -- supabase data/classic-wow-raids.ts`: still empty.
- Pushed with a plain `git push` (no force) — fast-forward, `5fa43efd..c73279bb`.
- PR #292 body updated (`gh pr edit`) to describe the corrected mechanism (three plain filters instead of the nested embed) and refresh the stale test counts; re-verified draft/base/head/Fixes-277/no-em-dash still hold.

## Final commit and test counts (for the coordinator)

**Commit:** `c73279bb6e1eb1b8360ce9f751a3971e1d9b6bfe` (short: `c73279bb`).
**Exact test counts after the fixup:** 86 test files, 1708 tests, 0 failures. `npx tsc --noEmit`: 0 errors. `npx eslint` (all 11 touched files across the whole PR): 0 errors, 9 pre-existing unrelated warnings.

## Deviations from Plan

### Auto-added scope (user-locked SCOPE-01, provided after planning)

**1. [SCOPE-01 / Rule 2 — missing critical functionality] Added guild scoping to all three wowhead_id lookup sites**
- **Found during:** Plan-time locked decision (SCOPE-01), applied throughout Tasks 1-2.
- **Issue:** `app/api/addon/loot-award/route.ts` and `app/api/addon/import-string/route.ts` resolved `wowhead_id` to a `loot_items` row with `.eq('wowhead_id', id).limit(1).single()` on the SERVICE-ROLE client, with no guild filter — `loot_items` has no `guild_id` column, and every guild seeds its own copy of the catalog, so an arbitrary guild's row could be returned for ANY item. The loot-award route fetched the raid tier "to verify it belongs to this guild" but never compared it, so the check was dead.
- **Fix:** New `lib/loot/guild-scoped-lookup.ts` (`resolveGuildLootItem`, `findGuildLootItemsByWowheadIds`) scopes every lookup to the calling guild's own raid tiers, with the alias candidate order layered on top (exact id first). When a guild owns the same item under more than one of its own expansions, the guild's `active_expansion_id` wins; otherwise the lowest `raid_tier_id` is picked, so the result is deterministic rather than query-order-dependent. The dead raid_tiers check in loot-award was removed since guild ownership is now proven at the lookup itself. **Initial implementation used a two-level nested `!inner` embed filter; PR review (see "PR review round" below) required replacing it with three plain, already-proven single-column filters, and required that every query's `error` be checked instead of discarded — both fixed in commit `c73279bb`.**
- **Files modified:** `lib/loot/guild-scoped-lookup.ts` (new), `lib/loot/__tests__/guild-scoped-lookup.test.ts` (new), `app/api/addon/loot-award/route.ts`, `app/api/addon/import-string/route.ts`, `app/(app)/raid-tracking/_client.tsx` (fallback query).
- **Commits:** `8a84894e`, `5fa43efd`, `c73279bb`.
- **Tests:** Both route test suites include a dedicated "SCOPE-01: never awards another guild row, even when it is the first (and only) match" case, plus (after `c73279bb`) an assertion that another guild's tier id never reaches the `loot_items` query; `lib/loot/__tests__/guild-scoped-lookup.test.ts` includes the same at the unit level plus deterministic tie-break and query-error coverage.

This expanded `files_modified` from the plan's 9 files to 11 (the 2 new `lib/loot/guild-scoped-lookup.ts` files).

### Plan-text deviation (justified by SCOPE-01 override)

**2. [Rule 4-adjacent, pre-authorized by locked decision] Raid-tracking source-guard test adjusted from the plan's literal wording**
- **Found during:** Task 2.
- **Issue:** The plan's `<behavior>` block for the source guard specified the fallback query should filter `wowhead_id` with `.in(` directly inline in `_client.tsx`. Since SCOPE-01 requires guild scoping too, the fallback query's Supabase call now lives inside the shared `findGuildLootItemsByWowheadIds` helper rather than inline in `_client.tsx`, so `_client.tsx` itself contains a call to that helper with `wowheadIdCandidates(itemId)` as an argument, not a raw `.in('wowhead_id', ...)`.
- **Resolution:** The test I wrote (`app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts`) checks for the actual implementation shape (import of `findGuildLootItemsByWowheadIds`, exactly one call with `wowheadIdCandidates(itemId)`) instead of the plan's literal `.in(` pattern, while still proving the underlying D-03/D-05 guarantee: zero raw `wowhead_id === itemId` comparisons and zero raw `.eq('wowhead_id', ...)` filters remain in the file.
- **Files modified:** `app/(app)/raid-tracking/__tests__/faction-alias-lookups.test.ts`.
- **Commit:** `5fa43efd`.

No other deviations. Every other must-have and success criterion in the plan (D-01 through D-05, the tracer feedback gate, the exact-id-first ordering, the alias audit, the completeness gate) was implemented as written.

## Known Stubs

None.

## Threat Flags

None. The threat model's disposition on T-277-03 (OD-02, "accept") was superseded by SCOPE-01's explicit instruction to fix the unscoped lookup in this same PR; that fix is reflected as Deviation 1 above rather than a new threat flag, since no new surface was introduced — an existing one was closed.

## OD-01 and OD-02, restated as still open / resolved

- **OD-01 (still open):** In-game exports keyed only by the Alliance id (Gargul DFT prio export in `domain/loot/gargul-dft.ts`, Gargul soft-reserve export in `domain/reserve/gargul-export.ts`, the addon `guild-data`/`export-string` payloads, and the companion's SavedVariables tables read by `ScoreEngine.lua`). When a Horde head drops, those in-game lookups use `19002`/`18422` and find no entry, because every export is keyed by the catalog's Alliance id. The resolution happens in Lua outside this repo. Tracked as **#290** per the coordinator's follow-up numbering; stated in the PR body under "Not in this PR".
- **OD-02 (resolved by SCOPE-01):** The pre-existing unscoped addon lookup is fixed in this PR (see Deviation 1). The remaining, explicitly out-of-scope half of the original OD-02 concern — repairing `loot_history` rows that were *already* mis-linked to another guild's item by the old unscoped query before this fix shipped — is tracked as **#289** (noting the `ON DELETE CASCADE` risk on `loot_history.loot_item_id`), also stated in the PR body under "Not in this PR".

## Self-Check: PASSED

- `domain/loot/faction-item-aliases.ts` — FOUND
- `lib/loot/guild-scoped-lookup.ts` — FOUND
- `app/api/addon/loot-award/route.ts` (modified) — FOUND
- `app/api/addon/import-string/route.ts` (modified) — FOUND
- `app/(app)/raid-tracking/_client.tsx` (modified) — FOUND
- `data/__tests__/classic-catalog-completeness.test.ts` (modified) — FOUND
- Commit `8a84894e` — FOUND in `git log --oneline --all`
- Commit `5fa43efd` — FOUND in `git log --oneline --all`
- Commit `c73279bb` — FOUND in `git log --oneline --all`
- Branch `origin/fix/277-horde-heads` — FOUND on GitHub, up to date with `c73279bb` (pushed with a plain `git push`, no force)
- PR #292 — FOUND, draft, base `main`, head `fix/277-horde-heads`, body updated to describe the corrected lookup mechanism
