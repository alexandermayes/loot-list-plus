# Phase 1: Forever Defect and Privacy Fixes - Research

**Researched:** 2026-10-12
**Domain:** Existing-code defect repair in a Next.js 16 / Supabase / discord.js codebase (award and BLP writes, addon and bot read routes, Discord links, analytics privacy, typed DB client). No new libraries, no schema change.
**Confidence:** HIGH for every in-repo finding (all files read this session; baseline typecheck and tests run; two TypeScript spikes run). MEDIUM for the Wowhead Forever URL shape (cited from the milestone brief, not live-checked; live Wowhead fetches are forbidden by Hard Constraint 5). LOW only where marked `[ASSUMED]`.

## Summary

Phase 1 is six code-only fixes in files that already exist. Nothing here needs a migration, a new package, or a live game-data fetch. The branch `gsd/v2.0-forever-loot` has the same application code as `origin/main` (0 behind, 6 ahead, all planning docs; `git diff --stat origin/main HEAD -- app lib utils domain discord-bot companion supabase` is empty), so every line number below is valid on `main`.

The defect todo (`.planning/todos/pending/2026-09-28-fix-five-defects-found-in-the-forever-loot-code-review.md`) is stale in the way the roadmap says. Re-verified against current code: todo #3 (addon awards skip `raid_event_id` and BLP) is fixed (PR #322, merged 2026-09-29); the `slot` column half of #1 is fixed (`item_slot`, PR #301, merged); the `items` select half of #2 is fixed (PR #363, merged). Still open and in scope: wrong table names in two addon routes with every error swallowed (FIX-02), no BLP recompute on award DELETE and PATCH (FIX-01), retail or hardcoded-`/classic/` Wowhead links in three Discord paths plus em dashes in bot embed titles (FIX-03), the receipt whitelist dropping `donationBonus` and `raiderBonus` (FIX-04), the `master_loot_awarded` privacy leak (FIX-05), and the untyped service-role client that let FIX-02's bad table names ship (FIX-06).

Four findings the brief and SUMMARY do not state, and the planner must act on: (1) the two addon route test files use fake clients keyed on the same wrong table names, so the tests pass while the routes are broken; they must be rewritten with real names and a fake that rejects unknown tables. (2) The obvious fix for priorities (`.in('item_id', allItemIds)`) will hit a URL-length limit for large catalogs; filter `guild_item_priorities` by `guild_id` and `raid_tier_id` instead. (3) `master_loot_awarded` does not fire on an award at all; it fires on a submission review, so "reports the item" has no literal referent at that call site (Open Question 1). (4) Typing the service-role client costs about 34 type errors across exactly three route files (spike results below), and a cast-wrapper factory avoids touching nine test files that mock `createServiceRoleClient`.

**Primary recommendation:** Ship as five small PRs in this order: (A) `domain/expansion/wowhead.ts` + FIX-03; (B) FIX-04 + FIX-01 (both in `app/api/loot-history/bulk/route.ts`); (C) FIX-06 typed client + FIX-02 (same two route files, so one PR); (D) FIX-05 analytics. Every change is covered by Vitest route or unit tests; the Loot Score golden fixtures are never touched.

## User Constraints (from CONTEXT.md)

No CONTEXT.md exists for this phase (the user chose to plan without discuss-phase). Per the orchestrator, the roadmap's "Defaults applied" and the REQUIREMENTS.md "Open Decisions" are the recorded decisions. Copied verbatim:

### Locked Decisions
- ROADMAP Phase 1 **Defaults applied**: "bot `/priority` stays ordered by raw list rank and is labelled "by list rank" (Decision 10). FIX-05 changes what existing PostHog dashboards see on `master_loot_awarded` (Decision 19)."
- ROADMAP Phase 1 **Research**: "Standard; skip `--research-phase`. Re-verify each defect against current code before planning, because the defect todo is partly stale (#3 fixed in #322 and can be closed; #1 slot fixed in #290 and #301; #2 items select fixed in #363)."
- ROADMAP **Hard Constraints** that bind this phase: (1) Schema before code (no schema change in this phase); (2) "Copy. The owner signs off user-facing copy before it ships. No em dashes in any user-facing text."; (3) "Privacy. No player or guild names in analytics or published data. New PostHog events carry ids and counts only."; (4) "Known guilds stay byte-identical. Loot Score golden fixtures (`LOOT_SCORE_FIXTURES`, `engine-contracts.test.ts`) and the Lua fixtures do not change for any item-mode input."; (5) "No live game-data fetches"; (6) "Web path stands alone."
- ROADMAP **Dependency note**: "Award DELETE and PATCH recompute (FIX-01) is a prerequisite for Desk undo (DESK-07), and Forever links must be correct before any Forever award reaches Discord."
- ROADMAP **Parallel with Phase 2**: "They touch different files; both add modules under `domain/expansion/` (`wowhead.ts` here, the manifest schema in Phase 2), so merge whichever lands second after a rebase."
- REQUIREMENTS **Open Decisions** applicable here: "bot `/priority` labelled "by list rank" until the shared ranker lands, then Loot Score".

### Claude's Discretion
- Everything not listed above: file layout of the new `wowhead.ts` helper, how to type the service-role client, whether recompute is awaited or deferred, how errors are surfaced in the addon routes, how the analytics fix is tested. Recommendations are given below; items needing owner confirmation are in Open Questions and the Assumptions Log.

### Deferred Ideas (OUT OF SCOPE)
- Bot `/priority` ordering by Loot Score (ROADMAP Cross-Phase Notes: "an owner call, not planned work").
- Discovery lists, Drop Desk, manifest/registry, Known mode transition, simplicity pass (Phases 2 to 8, v2 list).
- Raid assignments (separate tool).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FIX-01 | Officer deleting or editing an award sees BLP recomputed for the affected item in the same request | `app/api/loot-history/bulk/route.ts` DELETE (lines 438-535) and PATCH (540-657) never call `recomputeBlpForItems`; capture item ids before the delete; await the recompute; see "FIX-01" below |
| FIX-02 | Companion receives real BLP and item priorities (queries `blp_tracking` and `guild_item_priorities`; PostgREST errors surface) | `guild-data/route.ts:88,101` and `export-string/route.ts:179,185` use nonexistent tables; companion needs no code change; see "FIX-02" |
| FIX-03 | Every Discord item link for a Forever guild opens `wowhead.com/forever/...`; bot embed titles carry no em dash | Four link sites and four em-dash title sites located; shared `domain/expansion/wowhead.ts`; bot gets `item_url` from the server; see "FIX-03" |
| FIX-04 | Award receipts keep `donationBonus` and `raiderBonus` | `ALLOWED_COMPONENT_KEYS` at `bulk/route.ts:19` omits both; client already sends them; see "FIX-04" |
| FIX-05 | `master_loot_awarded` carries no player name and reports the item, not the review status | `master-loot/_client.tsx:262-266`; the event fires on submission review; see "FIX-05" and Open Question 1 |
| FIX-06 | Addon and bot routes use a typed service-role client so a nonexistent table fails typecheck | Spike proves a cast-wrapper over `SupabaseClient<Database>` works and fails the bad names; 34 follow-on errors in 3 files; see "FIX-06" |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Source: `/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md` (read this session).

- **GSD workflow:** all repo edits start through a GSD command (`/gsd-execute-phase` for this phase). No direct edits outside a GSD workflow.
- **Planning docs never go on `main` directly.** Code goes on its own `fix/...` branch and PR; planning docs ride a `gsd/quick-*` or milestone branch and a docs-only PR. (Current branch `gsd/v2.0-forever-loot` is a milestone branch, not `main`.)
- **Copy voice:** user sign-off required on user-facing copy; no em dashes in user-facing text. Any replacement for the bot's em-dash titles is new copy and needs sign-off.
- **CI/CD:** CI runs `npm run lint`, `npm run typecheck`, `npm run test` on Node 20 plus a separate `companion` job on Node 22 (`.github/workflows/ci.yml`). CodeQL blocks tainted format strings: never put user-supplied values (item ids, names) in the first argument of `console.*`; pass them as separate arguments, as `utils/blp/recompute.ts` does (`console.error('BLP recompute failed for item', lootItemId, error)`).
- **Conventions:** kebab-case files, `import type` for type-only imports, named exports for functions, pure functions in `domain/`, `@/` alias, tests in `__tests__` next to the code, Supabase `{ data, error }` tuple checked, Route Handler validates then delegates, TypeScript strict.
- **Stack versions** relevant here: Next.js 16.2.12, Vitest 4.1.0, `@supabase/supabase-js` 2.106.1 installed (range `^2.90.0`), Node 20 CI (Node 22.23.0 locally), React 19.2.3.
- **Stale CLAUDE.md facts:** CLAUDE.md says Lua addon scripts live in `addon/`; the brief corrects this (separate repo `alexandermayes/loot-list-plus-addon`). Phase 1 has no Lua change.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| BLP recompute after award delete/edit | API / Backend (`app/api/loot-history/bulk`) | Database (`recompute_blp_for_item` SECURITY DEFINER SQL, unchanged) | BLP is a derived value rebuilt by SQL; the route must call it after every history write |
| Addon BLP and priority payloads | API / Backend (`app/api/addon/guild-data`, `export-string`) | Database (`blp_tracking`, `guild_item_priorities`) | Companion and addon are API consumers; the contract is the JSON shape |
| Wowhead URL construction | Shared pure module (`domain/expansion/wowhead.ts`) | Browser (`ItemLink`), API (Discord posts), Discord bot (receives a URL) | One mapping, three consumers; the bot is a separate deploy and cannot import app code |
| Discord link rendering | API / Backend (`lib/discord-loot-announcements.ts`, `post-raid-summary`, `bot/priority`) | Discord bot (`discord-bot/interactions.js`, formats only) | Server decides the URL; bot displays what it is given |
| Award receipt snapshot | Browser (builds `decision_context`) | API (whitelists and persists to `audit_logs`) | The server whitelist is the sole defect; client already sends full `ScoreComponents` |
| Analytics privacy | Browser (`trackClientEvent` call site) | PostHog (existing dashboards) | The leak is a client call site |
| Typed DB access for addon and bot routes | API / Backend (`utils/supabase/typed-service-role.ts`) | Build (`tsc --noEmit` in CI) | Compile-time guard; no runtime change |

## Re-verification of the defect todo (current branch)

| Todo item | Status on current branch | Evidence |
|-----------|--------------------------|----------|
| #1 `loot_items.slot` | FIXED (PR #301, merged 2026-09-28) | `guild-data/route.ts:82` selects `item_slot`; comment cites "OD-01 (GH #290)"; output key stays `slot` |
| #1 `bad_luck_protection`, `item_priorities` | STILL OPEN, errors swallowed | `guild-data/route.ts:88` and `:101`; `export-string/route.ts:179` and `:185`; no `.error` read on either result |
| #2 `loot_submissions.items` | FIXED (PR #363, merged 2026-10-03) | `bot/priority/route.ts` reads approved `loot_submissions` then `loot_submission_items`; every query checks its error |
| #2 raw-rank ordering | DELIBERATE (Decision 10), already labelled | `discord-bot/interactions.js:97`: `footer: { text: 'Sorted by loot list rank. Loot Scores are on the Master Sheet.' }`, pinned by `interactions.test.mjs:74`. No Phase 1 change except keep the pin |
| #3 addon awards skip `raid_event_id` and BLP | FIXED (PR #322, merged 2026-09-29). Close the todo | `lib/loot/loot-history-rows.ts` `buildAddonAwardRow` sets `raid_event_id: raidEventId ?? null`; `addon/loot-award/route.ts` ends with `if (raidEventId) { after(() => recomputeBlpForItems(supabase, guild_id, [lootItem.id])) }` |
| #4 award DELETE and PATCH never recompute BLP | STILL OPEN | `bulk/route.ts` DELETE and PATCH contain no `recompute` call; only POST does (lines 387-389) |
| #5 retail links and hardcoded `/classic/` | STILL OPEN, plus a third and fourth site | see FIX-03 |
| Extra: receipt drops donation and raider bonus | STILL OPEN | `bulk/route.ts:19` |
| Extra: `master_loot_awarded` leaks `character_name` | STILL OPEN | `master-loot/_client.tsx:262-266` |

`gh pr view` confirmed: #322 MERGED 2026-09-29, #301 MERGED 2026-09-28, #363 MERGED 2026-10-03. "#290" is a GitHub issue number (the fix PR is #301), not a PR. [VERIFIED: gh CLI]

## Standard Stack

### Core
No new runtime or dev dependency. All work uses what is installed.

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------------------|---------|--------------|
| `@supabase/supabase-js` | 2.106.1 | Typed client via `SupabaseClient<Database>` | Already used; `lib/database.types.ts` (generated, 2530 lines) already exports `Database` [VERIFIED: node -e require, file read] |
| `vitest` | 4.1.0 | Route and unit tests | Existing; `vitest.config.ts` globals true, jsdom default, `@` alias [VERIFIED: vitest run output] |
| `next` | 16.2.12 | `after()` from `next/server` | Already imported by the bulk route [VERIFIED: bulk/route.ts:1] |
| `typescript` | 5.x (strict) | `@ts-expect-error` as the typecheck guard | Existing `npm run typecheck` = `tsc --noEmit` [VERIFIED: package.json scripts] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cast-wrapper `createTypedServiceRoleClient()` | Make `createServiceRoleClient` generic or return `SupabaseClient<Database>` for all 145 call sites | Typing all callers would surface errors across 108 files; a separate typed export scopes the change to addon and bot routes (spike A shows even that is 34 errors) |
| Server supplies `item_url` to the bot | Bot imports a copy of the domain map | The bot is a separate deploy ("cannot import app code", `interactions.js:9-10`); a copy would drift |
| Generate types with `supabase gen types` | Hand edit | Not needed; `blp_tracking` and `guild_item_priorities` are already in `database.types.ts` |

**Installation:** none.

**Version verification:** `node -e "console.log(require('@supabase/supabase-js/package.json').version)"` returned `2.106.1`. No `npm view` needed because no package is added.

## Package Legitimacy Audit

No external packages are installed or added by this phase. `gsd-tools query package-legitimacy check` was not run because there is nothing to check.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | - | - | - | - | - | - |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                                OFFICER BROWSER
  Master sheet award modal -------POST /api/loot-history/bulk (decision_context)-----+
  Raid tracking: delete / reassign -- DELETE | PATCH /api/loot-history/bulk ---------+
  Master-loot page: review ---------trackClientEvent('master_loot_awarded') --> PostHog (FIX-05)
                                                                                      |
                                                        verifyPermission(manage_loot) |
                                                                                      v
  +---------------------------- app/api/loot-history/bulk/route.ts ---------------------------+
  | POST : insert loot_history -> logAudit(sanitizeDecisionContext)  [FIX-04 whitelist]        |
  |        -> after(recomputeBlpForItems) -> after(notifyLootAward)                           |
  | DELETE: pre-read rows (item, raid_event) -> delete -> logAudit -> AWAIT recompute [FIX-01] |
  | PATCH : before-read -> update -> logAudit -> AWAIT recompute if raider changed [FIX-01]    |
  +--------------------------------------------+-----------------------------------------------+
                                               | rpc('recompute_blp_for_item')  (SQL unchanged)
                                               v
                           blp_credits / blp_tracking (derived, rebuilt from history)
                                               ^
   COMPANION / ADDON                           | read
   GET /api/addon/guild-data    ---- typed client [FIX-06] ---- blp_tracking, guild_item_priorities [FIX-02]
   GET /api/addon/export-string ---- typed client [FIX-06] ---- (error => 500, not empty)

   DISCORD (FIX-03)
   notifyLootAward (lib/discord-loot-announcements.ts) -+
   POST /api/discord/post-raid-summary ----------------+--> wowheadItemUrl(expansionName, id)  <-- domain/expansion/wowhead.ts
   GET  /api/bot/priority  --> JSON { item_url, ... } -+            ^
        discord-bot/interactions.js renders item_url    |            +-- ItemLink.tsx (browser) re-exports getWowheadDomain
        (falls back to old link if absent)              |
```

### Recommended Project Structure
```
domain/expansion/
  wowhead.ts                         # NEW: EXPANSION_TO_WOWHEAD_DOMAIN, getWowheadDomain, wowheadItemUrl (imports only ./game)
  __tests__/wowhead.test.ts          # NEW
utils/supabase/
  typed-service-role.ts              # NEW: createTypedServiceRoleClient(): SupabaseClient<Database>
  __tests__/typed-service-role.test.ts   # NEW: @ts-expect-error guards
utils/analytics/
  master-loot-events.ts              # NEW (optional): pure props builder for FIX-05 so it is unit-testable
lib/loot/
  guild-expansion-name.ts            # NEW (optional): name lookup shared by announcements and bot (summary already queries expansions)
app/api/loot-history/bulk/route.ts   # FIX-01, FIX-04
app/api/addon/guild-data/route.ts    # FIX-02, FIX-06
app/api/addon/export-string/route.ts # FIX-02, FIX-06
app/api/bot/priority/route.ts        # FIX-03 (item_url), FIX-06
app/api/bot/score/route.ts           # FIX-06 only (2 type errors)
app/api/discord/post-raid-summary/route.ts   # FIX-03
lib/discord-loot-announcements.ts    # FIX-03
discord-bot/interactions.js          # FIX-03
app/components/ItemLink.tsx          # import the moved map; keep `export { getWowheadDomain }`
app/(app)/master-loot/_client.tsx    # FIX-05
```

### Pattern 1: Capture before delete, recompute by item (FIX-01)
**What:** `recompute_blp_for_event` enumerates items from `loot_history` rows of the event, so after the delete it finds nothing. Collect the distinct `loot_item_id` of rows that have a `raid_event_id` BEFORE deleting, then call `recomputeBlpForItems`.
**When to use:** DELETE by `ids`, DELETE by `raid_event_id`, PATCH reassign.
**Example:** see Code Examples.

### Pattern 2: Check every query error and let the route catch answer 500 (FIX-02)
**What:** `app/api/bot/priority/route.ts` already does this (its header: "Every query here checks its error; a failed read returns 500, never an empty or unfiltered list" and a local `selectAllPagesOrThrow`). Copy that behaviour into the two addon routes.
**Careful:** `guild_settings ... .single()` and `expansions ... .single()` legitimately return no row for a guild with no settings row or no active expansion. Use `.maybeSingle()` for those two, and guard `active_expansion_id` null explicitly (the typed client types it `string | null`).

### Pattern 3: Server decides the URL, bot renders it (FIX-03)
**What:** `/api/bot/priority` returns `item_url` next to the existing `item_wowhead_id`. The bot uses `item_url` only when it is a string starting with `https://www.wowhead.com/` (same shape check as `premiumRequiredEmbed`'s `startsWith('https://')`), else falls back to today's link. Deploy order is Vercel app first, Railway bot second, and either order is safe.

### Anti-Patterns to Avoid
- **Fire-and-forget recompute for DELETE and PATCH.** Success criterion 1 says "by the time the request returns"; `after()` runs after the response is sent. Await it (Open Question 2 records the tradeoff).
- **Using `recompute_blp_for_event` after a delete.** It reads the rows that were just deleted.
- **Fixing the table names but leaving fake clients that accept any table.** That is exactly how the defect shipped.
- **Typing every `createServiceRoleClient()` call site.** 145 call sites in 108 files; out of scope and noisy.
- **A grep-based "no names in analytics" test over all events.** At least six other call sites currently send names (Open Question 5); a global guard would fail on day one.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| BLP recompute | New TS arithmetic for passes after a delete | `recomputeBlpForItems` (`utils/blp/recompute.ts`) calling SQL `recompute_blp_for_item` | SQL is order-independent and idempotent; it returns early (rows untouched) when the guild has BLP off; it clears and rebuilds `blp_credits` and `blp_tracking` for the item, so deleting the only award zeroes it |
| Wowhead domain mapping | A second map in Discord code | Move `EXPANSION_TO_WOWHEAD_DOMAIN` out of `ItemLink.tsx` into `domain/expansion/wowhead.ts` and import it | One source of truth; the existing `ItemLink.test.ts` asserts `getWowheadDomain('Forever')` is `'forever'` |
| Guild game detection | `guild.name` or realm sniffing | `getGuildGame(guild)` / `FOREVER_EXPANSION_NAME` from `domain/expansion/game.ts` | Documented as the single source (D-05, D-07) |
| Paged error-checking reads | Another local loop | Lift `selectAllPagesOrThrow` from `app/api/bot/priority/route.ts` into `utils/supabase/paginate.ts` (its sibling `paginatedSelect` ignores errors, per the bot route's own comment) | PostgREST caps responses at 1000 rows (`supabase/config.toml:18`, `max_rows = 1000`) |
| Typed table checking | Runtime table allow-lists | `SupabaseClient<Database>` | Compile-time, zero runtime cost |

**Key insight:** every one of these defects came from a duplicate or untyped copy of something that already had a correct home (a wrong table name, a second URL map, a second whitelist). The fixes consolidate rather than add.

## Phase detail by requirement

### FIX-01: BLP recompute on award DELETE and PATCH

**Current code** [VERIFIED: Read of `app/api/loot-history/bulk/route.ts` this session]:
- POST collects `blpItemIds` only when `blpEnabled && item.loot_item_id && item.raid_event_id` and runs `after(() => recomputeBlpForItems(serviceSupabase, guild_id, [...blpItemIds]))` (lines ~387-389).
- DELETE (438-535) has two branches. Both pre-read `select('id, loot_item_id, character_id, character_name')` for the audit log (neither selects `raid_event_id`), delete, then `logAudit`. No recompute. The pre-read error is ignored.
- PATCH (540-657) allows only `['character_id', 'character_name', 'notes']`, pre-reads `select('character_id, character_name, notes, loot_item_id, raid_event_id, award_copy')`, updates, `logAudit`s. No recompute. Name-only or notes-only edits cannot change BLP (BLP is keyed on `character_id`).
- UI callers: `raid-tracking/_client.tsx:893` (PATCH reassign), `:1101` (DELETE one by `ids`), `:1725` and `:2027` (DELETE by `raid_event_id` before a re-import POST), `master-sheet/components/ItemCandidateModal.tsx:359` (DELETE one, "Undo award"). [VERIFIED: grep + Read]

**Plan:**
1. DELETE: add `raid_event_id` to both pre-read selects. Treat a pre-read error as a 500 BEFORE deleting (otherwise a silent read failure silently skips the recompute). After a successful delete and audit, compute distinct `loot_item_id` of pre-read rows where `raid_event_id` and `loot_item_id` are non-null, and `await recomputeBlpForItems(serviceSupabase, guild_id, ids)` before `NextResponse.json({ success: true })`. Rows with a null `raid_event_id` cannot affect BLP (the SQL only reads `loot_history` rows `WHERE ... raid_event_id IS NOT NULL`), so skipping them is correct.
2. PATCH: after a successful update, if `'character_id' in sanitized` and the new value differs from `beforeRow.character_id` and `beforeRow.loot_item_id` and `beforeRow.raid_event_id` are set, `await recomputeBlpForItems(serviceSupabase, guild_id, [beforeRow.loot_item_id])`.
3. No `blp_enabled` pre-check is required: the SQL returns early with rows untouched when BLP is off (migration `20260609000001`: "When BLP is disabled, leave existing rows untouched ... and bail."; `addon/loot-award/route.ts` relies on the same: "The SQL returns early when the guild has BLP off."). POST's pre-check exists only because it already reads settings.
4. The re-import flow (DELETE by event, then POST) now runs recompute twice per item. Both are idempotent; final state is correct regardless of interleaving because the SQL reads history at execution time. Accept the extra latency.

**Why await, not `after()`:** success criterion 1 ("by the time the request returns") and DESK-07 (undo) both need the number to be right when the UI refetches. `recomputeBlpForItems` swallows RPC errors (logs, never throws), so awaiting cannot turn a recompute failure into a failed delete. Cost: one RPC per distinct item, sequentially. For a whole-night delete this is the item count of the night. `[ASSUMED]` that this stays inside the function time limit; no `maxDuration` is exported by the route and I did not check the Vercel plan (Open Question 2).

**Tests that constrain this change** [VERIFIED: Read]: `app/api/loot-history/bulk/__tests__/route.test.ts` imports only `POST` and `PATCH` (no DELETE tests exist). Its `makeClient` fake returns `{ data: null }` for any `loot_history` select resolved through `then`, so DELETE needs a new fixture field (for example `deleteRows`) and the `then` branch must return it. The file mocks `@/utils/blp/recompute` (`recomputeBlpForItems: vi.fn()`) and `after` as `(fn) => fn()`. The existing POST test `'blp_enabled with a raid_event_id still schedules recomputeBlpForItems'` must stay green.

### FIX-02: Addon BLP and priority reads

**Current defect** [VERIFIED: Read]:
- `app/api/addon/guild-data/route.ts:88`: `supabase.from('bad_luck_protection').select('character_id, loot_item_id, times_passed').eq('guild_id', guildId)`; `:101` `.from('item_priorities').select('loot_item_id, role_priorities, class_priorities, character_priorities, priority_bonuses').in('loot_item_id', lootItemIds)`.
- `app/api/addon/export-string/route.ts:179` (`item_priorities`) and `:185` (`bad_luck_protection`), same shapes.
- Real tables (`lib/database.types.ts`): `blp_tracking` Row has `character_id`, `loot_item_id`, `times_passed`, `guild_id`, `expansion_id` (lines 278-288). `guild_item_priorities` Row has `item_id` (FK to `loot_items.id`), `guild_id`, `raid_tier_id`, `role_priorities`, `class_priorities`, `character_priorities`, `priority_bonuses` (lines 780-793). The column is `item_id`, not `loot_item_id`.
- No `.error` is read on either result, so PostgREST's "relation does not exist" became an empty map.

**Contract to preserve** (the companion and Lua addon consume it; `companion/src/main/api-client.ts` `GuildData`): `priorities: Record<string, unknown>` keyed by loot item id; `blp: Record<characterId, Record<lootItemId, number>>`. Map `p.item_id` back to the existing output key. The companion needs NO code change: `getGuildData()` already throws `new Error(error.error || ...)` on a non-OK response, so a 500 from the route reaches the user as an error. Companion typecheck is a separate package (`companion/package.json` script `typecheck`, excluded from the root `tsconfig.json`); it only needs to be re-run if `GuildData` is touched, which this phase should not do.

**Plan:**
1. Rename tables and column as above in both routes.
2. Filter priorities by `.eq('guild_id', guildId)` and `.in('raid_tier_id', raidTierIds)`, NOT `.in('item_id', allItemIds)`. A catalog can exceed 1700 items (`lib/loot-items-query.ts` comment: "MoP has 1700+ items per guild"); 1700 UUIDs in a query string is roughly 65 KB, far over typical URL limits. `[ASSUMED]` exact proxy limits; the safe course is not to depend on them. `app/api/prio-list/route.ts` already reads `guild_item_priorities` by `guild_id` plus optional `raid_tier_id`.
3. Check `.error` on every query in both routes. Throw inside the existing `try`, so the existing catch answers 500 `{ error: 'Internal server error' }` and `trackApiError` fires (as the routes do today for other failures). Preserve the no-row cases: `guild_settings` with no row must still yield `settings: {}` (guild-data) / null settings (export-string), and a guild with `active_expansion_id` null must not 500.
4. Row-cap: the BLP read (`blp_tracking` for the whole guild) and `loot_items` in guild-data are unpaginated top-level reads and truncate silently at 1000 rows (`supabase/config.toml:18`). Recommended: use an error-throwing paged read (lift `selectAllPagesOrThrow`) at least for `blp_tracking`, `guild_item_priorities` and, in guild-data, `loot_items`. Whether to include `loot_items` is Open Question 7 (it is adjacent to FIX-02 but is a separate latent bug).
5. Rewrite the two route test fixtures (see Test Constraints below).

**Test constraints** [VERIFIED: Read of both test files]: `guild-data/__tests__/route.test.ts` and `export-string/__tests__/route.test.ts` define `Fixture` keys `bad_luck_protection` and `item_priorities` (guild-data lines 70, 89, 118-122; export-string lines 81, 102, 138-142) and a `resolveRows` switch on those names. The fakes therefore pass against the broken routes. Rewrite to `blp_tracking` and `guild_item_priorities` (rows carry `item_id`, `guild_id`, `raid_tier_id`), and make the fake `from(table)` throw (or return `{ data: null, error }`) for any table not in an allow-list, which mirrors PostgREST. Add tests: (a) BLP appears in `blp[charId][itemId]`; (b) priorities appear in `priorities[itemId]` with the default `priority_bonuses` `{ role: 5, class: 3, character: 2 }` when null (existing behaviour); (c) each query failing returns 500 and not an empty 200; (d) the request queries `blp_tracking` and `guild_item_priorities` by name. Also keep `app/api/addon/__tests__/companion-bearer-routes.test.ts` and `lib/addon/__tests__` green.

### FIX-03: Forever Wowhead links and em-dash titles

**Link sites** [VERIFIED: Read]:

| Site | Line | Today |
|------|------|-------|
| `lib/discord-loot-announcements.ts` `wowheadLink` | 32-34 | `` `[**${itemName}**](https://www.wowhead.com/item=${wowheadId})` `` (retail, no domain) |
| `app/api/discord/post-raid-summary/route.ts` | 281 | `` `[${item.name}](https://www.wowhead.com/classic/item=${item.wowhead_id}) → ${charName}` `` (hardcoded `/classic/`, wrong for TBC, Wrath, Cata, MoP guilds too) |
| `discord-bot/interactions.js` `priorityEmbed` | 79-81 | `` `[**${payload.item_name}**](https://www.wowhead.com/item=${payload.item_wowhead_id})` `` |
| `app/reserve/join/[token]/page.tsx` "Copy for Discord" | 682 | `` `- ${item.name}: https://www.wowhead.com/item=${item.wowhead_id}` `` (client page, pasted into Discord by a raider; NOT in the roadmap's list, see Open Question 6) |

The in-app link is already correct: `ItemLink.tsx:43-57` maps `'Forever': 'forever'` and line 121 builds `https://www.wowhead.com/${domain}/item=${wowheadId}`; `ItemLink.test.ts` asserts it. A guild keeps exactly one active expansion (`app/api/guilds/change-expansion/route.ts` header: deletes the guild's other expansions), so the guild's active expansion name is the right input for server-built links.

**Plan:**
1. New `domain/expansion/wowhead.ts` (imports only `./game`, same constraint as `game.ts`: "must import nothing" beyond itself since client components import it directly). Move `EXPANSION_TO_WOWHEAD_DOMAIN` and `getWowheadDomain` from `ItemLink.tsx` verbatim; add `wowheadItemUrl(expansionName, wowheadId)`. `ItemLink.tsx` imports and re-exports `getWowheadDomain` so `app/components/__tests__/ItemLink.test.ts` passes unchanged. Add `export * from './wowhead'` to `domain/expansion/index.ts` (the one line Phase 2 may also touch; resolve on rebase) and have client code import from the module path, not the barrel.
2. Unknown or retail expansion name returns today's retail form `https://www.wowhead.com/item=ID` (keeps current behaviour for the fallback).
3. `notifyLootAward`: extend the guild select to include `active_expansion_id`, look up the expansion name, pass it to `wowheadItemUrl`. The function "never throws" (file header), so a failed name lookup must fall back to the retail link, not throw.
4. `post-raid-summary`: the route already reads `expansions` (`select('current_phase')`, query starts at line 116); extend to `select('current_phase, name')`. Extract the loot-line formatter into a pure function (for example `formatRaidSummaryLootLine`) so it is unit-testable; the route itself has no test file today.
5. `/api/bot/priority`: on the ok path only, look up the active expansion name and add `item_url` (string or null when `wowhead_id` is null). Add that lookup to the route's "every query error returns 500" case table (`route.test.ts` lines 776-800). Keep `item_wowhead_id` in the payload (back-compat for an older bot).
6. `discord-bot/interactions.js`: use `payload.item_url` when it is a string starting with `https://www.wowhead.com/`, else build the current link from `item_wowhead_id`.

**Em dashes in bot embed titles** [VERIFIED: Read + grep]: `interactions.js:64-65` (`/score` title `${payload.character_name} — Loot Score` with and without team), `:85` and `:95` (`Top priority — ${payload.item_name}`). The description line at `:91` also contains ` — rank ${r.rank}`. `discord-bot/help.js:267` has an embed title `'🆕 New help article — pending review'` (an officer-ops channel post, not a raider reply). The existing tests assert the em dash with escapes, which a literal grep misses: `interactions.test.mjs:72` `expect(embed.title).toBe('Top priority — Bilegrip Boots')` and `:207` `expect(embed.title).toBe('Active — Loot Score')`. Both must change. Replacement strings are new user-facing copy and need owner sign-off (proposal only, not decided): `Top priority: ${item}`, `${name}: Loot Score` and `${name}: Loot Score (${team})`, and ` · rank N` using the middle dot the bot footer already uses (`${payload.guild_name} · LootList+`).

**Test constraints:** `discord-bot/interactions.test.mjs` is picked up by the root `vitest run` (default include globs match `.mjs`; confirmed by the 22-file run that included `discord-bot`). The bot has no typecheck and no lint of its own beyond root ESLint (`.js` files get `no-require-imports` off). `discord-bot/package.json` has no test script and is not typechecked; `tsconfig.json` `include` lists only `**/*.ts`, `**/*.tsx`, `**/*.mts`.

### FIX-04: Receipt snapshot keeps `donationBonus` and `raiderBonus`

**Defect** [VERIFIED: `app/api/loot-history/bulk/route.ts:19`]:
`const ALLOWED_COMPONENT_KEYS = ['itemRank', 'attendanceScore', 'rankModifier', 'roleBonus', 'priorityBonus', 'trialPenalty', 'badLuckBonus'] as const`

**Source of truth** [VERIFIED: `domain/types.ts:264-274`]:
```
export interface ScoreComponents {
  itemRank: number
  attendanceScore: number
  rankModifier: number
  roleBonus: number
  badLuckBonus: number
  priorityBonus: number
  trialPenalty: number
  donationBonus: number
  raiderBonus: number
}
```
The client already sends all nine: `ItemCandidateModal.tsx` `rankingToComponents` returns `donationBonus: r.donation_bonus` and `raiderBonus: r.raider_bonus`, used for `winner_components` and each `top_candidates[].components`. `sanitizeComponents` (route lines ~60-68) iterates `ALLOWED_COMPONENT_KEYS` only, so both are dropped before `logAudit`.

**Plan:** derive the whitelist from the type so adding a component later cannot silently drop it again:
```ts
import type { ScoreComponents } from '@/domain/types'
const COMPONENT_KEY_MAP: Record<keyof ScoreComponents, true> = {
  itemRank: true, attendanceScore: true, rankModifier: true, roleBonus: true, badLuckBonus: true,
  priorityBonus: true, trialPenalty: true, donationBonus: true, raiderBonus: true,
}
const ALLOWED_COMPONENT_KEYS = Object.keys(COMPONENT_KEY_MAP) as Array<keyof ScoreComponents>
```
A missing key is a compile error (`Record<keyof ScoreComponents, true>` requires every key). Key order in the stored JSON may change; that is harmless for a JSON snapshot.

**Size cap check:** `MAX_AUDIT_PAYLOAD_BYTES = 4096` (line 27). If the JSON exceeds it, the whole snapshot is replaced by `{ outcome_type, awarded_character_id, _truncated: true }`, losing the score snapshot silently. Estimated worst case after the change (3 candidates each with two 64-char strings, 9 components with long floats, plus winner components) is about 2.5 KB. `[ASSUMED]` estimate; add a test with long floats and 64-char names that asserts no `_truncated`.

**Tests:** there are no existing tests of `sanitizeDecisionContext` (nothing in `route.test.ts` mentions `decision_context`). Add POST tests that pass a full `decision_context` and assert the `logAudit` mock's `newData.decision_context.winner_components` and `top_candidates[0].components` include `donationBonus` and `raiderBonus`, plus an exhaustiveness test over `Object.keys` of a full `ScoreComponents` literal. The receipt is internal (audit_logs), it also stores `player_name`; that is existing and not analytics.

### FIX-05: `master_loot_awarded`

**Current code** [VERIFIED: `app/(app)/master-loot/_client.tsx:261-266`]:
```
const submission = submissions.find(s => s.id === submissionId)
trackClientEvent('master_loot_awarded', {
  guild_id: guildId,
  item_name: status,
  character_name: submission?.member?.character_name || 'Unknown'
})
```
This is inside `handleReview(submissionId, status: 'approved' | 'rejected')`, after `/api/loot-submissions/review` succeeds. It is the only emitter of the event (`utils/analytics/client.ts:88` is the type-union member; grep over the repo found no other call). So the event reports a loot-list review, not an award, and `item_name` is the string `'approved'` or `'rejected'`. There is no single item at this call site: a submission holds many (`Submission.item_count: number` is available in the page state).

A sibling review flow, `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx:529-538`, emits `submission_reviewed` and `pending_submission_approved|rejected` with `{ guild_id, submission_id, new_status | (none), character_name }`, so it also sends a player name (Open Question 5).

**Plan (needs owner confirmation, Open Question 1):** keep the event name (Decision 19 approves changing properties, not renaming); remove `character_name`; remove `item_name: status`; send ids and counts only: `{ guild_id, submission_id, new_status: status, item_count }`. This satisfies "no player name" and "not the review status as the item". It does NOT literally "report the item", because no item exists here. If the owner wants a real item on this event, the award path (`loot_item_awarded` is already emitted server-side by the bulk POST with ids only) is the right place, and this client event should be renamed or retired; that is a dashboard decision, not a code one.

**Testability:** the component is large and context-heavy. Extract a tiny pure builder (for example `buildMasterLootEventProps(guildId, submission, status)`) and unit-test that the returned object has no `character_name` and no `item_name` equal to a status. Do not add a repo-wide "no names in analytics" scan (see Anti-Patterns).

### FIX-06: Typed service-role client

**Why the defect was invisible:** `utils/supabase/service-role.ts` returns `createClient(url, key, opts)` with no `Database` generic, so every `.from('anything')` type-checks. No file in `app`, `lib` or `utils` uses `createClient<Database>` [VERIFIED: grep]. Helpers take `SupabaseClient` (default generics) or `SupabaseClient<any, any, any>` (`lib/addon/*`, `lib/loot/*`, `utils/server-roles.ts`, `utils/audit/log.ts`, `app/api/bot/_helpers.ts`) or `ReturnType<typeof createServiceRoleClient>` (`utils/blp/recompute.ts`, `utils/raid-events/team-routing.ts`, `addon/import-string/route.ts` lines 267, 314, 419).

**Spikes run this session (scratch tsconfigs in the session scratchpad, no repo file changed):**
- **Spike B:** a `SupabaseClient<Database>` value is accepted by `recomputeBlpForItems`, `routeRecordsToTeamEvents`, `verifyPermission`, `fetchReceivedCounts`, `resolveGuildLootItem`, `logAudit` with zero errors; the only error was the intentional `.from('bad_luck_protection')`.
- **Spike C:** this wrapper compiles, and both `@ts-expect-error` lines are consumed (meaning the nonexistent table and the nonexistent filter column each produce a compile error):
```ts
export type TypedServiceClient = SupabaseClient<Database>
export function createTypedServiceRoleClient(): TypedServiceClient {
  return createServiceRoleClient() as TypedServiceClient
}
```
- **Spike A (everything under `app/api/addon/**` and `app/api/bot/**` pointed at a typed factory):** 34 errors in exactly three files. `export-string/route.ts` 13, `addon/guild-data/route.ts` 19, `bot/score/route.ts` 2. `import-string`, `loot-award`, `attendance`, `auth`, `auth/token`, `sync-token` and `bot/priority` are clean. The errors fall into three groups:
  1. the intended ones: `'bad_luck_protection'`, `'item_priorities'`, and the downstream `SelectQueryError` property accesses (these disappear once FIX-02's names are used);
  2. nullability: DB columns are `string | null` where local interfaces say `string` (`expansions.current_phase`, `raid_tiers.phase`, `character_guild_memberships.role`, `guilds.active_expansion_id`, `loot_submissions.character_id`, `attendance_records.raid_event_id`). Fix by narrowing at the mapping (skip null `character_id`, treat null `active_expansion_id` explicitly) and, for `RankedSubmission.character_id` in `lib/addon/member-ranked-items.ts`, widening the local type to `string | null`;
  3. `bot/score/route.ts:143` and `:145`: DB `attendance_type: string` versus domain union `'linear' | 'breakpoint' | 'points-per-raid'`, and nullable booleans versus the domain's non-null. Use narrow `as` casts with a comment; do NOT substitute defaults (`?? false`), because that could change `computeAttendance` inputs and the bot's numbers.

**Plan:** add `utils/supabase/typed-service-role.ts` (above) and switch exactly the ten route files under `app/api/addon/**` and `app/api/bot/**` that call `createServiceRoleClient()` (`sync-token` x2 calls, `attendance`, `auth`, `auth/token`, `loot-award`, `export-string`, `guild-data`, `import-string`, `bot/score`, `bot/priority`) to it; replace the three `ReturnType<typeof createServiceRoleClient>` annotations in `import-string/route.ts` with `TypedServiceClient`.
**Why a wrapper that calls `createServiceRoleClient()` rather than a second `createClient`:** nine existing test files mock `@/utils/supabase/service-role` with `vi.mock(..., () => ({ createServiceRoleClient: vi.fn() }))` (`addon/__tests__/companion-bearer-routes`, `addon/auth/__tests__/pkce-flow`, `addon/export-string`, `addon/guild-data`, `addon/loot-award`, `addon/import-string`, `bot/score`, `bot/priority`, and `lib/addon/__tests__/sync-tokens.test.ts`; `rate-limit.test.ts` is not in that list). Note `lib/addon/sync-tokens.ts:16` also imports `createServiceRoleClient` (a lib, not a route); leave it untyped unless a typed need appears. A wrapper that delegates keeps those mocks working with no edits; a second factory would make every one of them fail with a missing-export error.
**Regression guard (this is success criterion 3):** `utils/supabase/__tests__/typed-service-role.test.ts` containing `// @ts-expect-error` lines for a nonexistent table (`bad_luck_protection`) and a nonexistent column. If someone later loosens the type to `any`, `npm run typecheck` fails because the directive is unused. Add a small Vitest file-scan test that fails if any `app/api/addon/**/route.ts` or `app/api/bot/**/route.ts` imports `createServiceRoleClient` directly (so a new route cannot silently use the untyped client). `tsconfig.json` `include` covers `**/*.ts`, so the test file is type-checked.
**Limit to know:** the typed client catches bad table names and bad filter columns at the call, but a bad column inside a `.select('...')` string only surfaces where the returned row is used (as a `SelectQueryError` type, seen in spike A at `guild-data/route.ts:168-180`). Consume typed rows without `as` casts to keep that protection.

## Common Pitfalls

### Pitfall 1: Recompute after delete finds nothing
**What goes wrong:** calling `recomputeBlpForEvents(guildId, [raidEventId])` after the DELETE. `recompute_blp_for_event` loops `SELECT DISTINCT loot_item_id FROM loot_history WHERE raid_event_id = ...`, which is now empty.
**How to avoid:** read affected item ids first, then `recomputeBlpForItems`.
**Warning signs:** a DELETE test that passes with a mocked recompute but never asserts the item id argument.

### Pitfall 2: Fake clients that agree with the bug
**What goes wrong:** the guild-data and export-string tests key fixtures on `bad_luck_protection` and `item_priorities`; fixing the routes makes the old tests fail, and "fixing" the tests by renaming only the keys leaves a fake that would again accept any table.
**How to avoid:** make fakes reject unknown table names; assert the queried table names explicitly.

### Pitfall 3: `.in('item_id', everyItemId)` URL length
**What goes wrong:** priorities query with 1700 UUIDs. **How to avoid:** `eq guild_id` plus `in raid_tier_id` (a handful of ids), as `prio-list` does.

### Pitfall 4: Turning legitimate "no row" into a 500
**What goes wrong:** `.single()` on `guild_settings` or `expansions` errors with no row; throwing on that would 500 a guild that today exports with empty settings (and `guilds.active_expansion_id` is nullable). **How to avoid:** `.maybeSingle()` plus explicit null handling; only real PostgREST errors throw.

### Pitfall 5: 1000-row cap hides BLP and items
**What goes wrong:** fixing the table name then silently truncating at 1000 rows for a large guild. **How to avoid:** paged, error-throwing reads (Pattern in Don't Hand-Roll).

### Pitfall 6: Bot and app deploy independently
**What goes wrong:** a bot that requires `item_url` breaks against an older app, or an app that drops `item_wowhead_id` breaks an older bot. **How to avoid:** additive payload (keep `item_wowhead_id`), bot falls back when `item_url` is missing or not an `https://www.wowhead.com/` string.

### Pitfall 7: `—` hides em dashes from grep
**What goes wrong:** `interactions.test.mjs` asserts em dashes as `—` escapes, so `grep "—"` misses them. **How to avoid:** grep for both `—` and `\\u2014` when verifying; add a test asserting no embed title built by `priorityReply` or `scoreReply` contains U+2014.

### Pitfall 8: Classic Discord links change
**What goes wrong:** using the full expansion map also changes Classic-era guilds' Discord links (today retail `/item=` in announcements and the bot, `/classic/` in the summary) to era-correct domains (`classic`, `tbc`, `wotlk`, `cata`, `mop-classic`). This is arguably correct and matches `ItemLink`, but it is visible to every guild (Assumption A2, Open Question 3).

### Pitfall 9: Typed-client "fixes" that change runtime values
**What goes wrong:** satisfying nullability with `?? false` or `?? 0` in `bot/score` or the addon exports changes numbers or payload shape. **How to avoid:** narrow with guards or casts; run the existing route tests and `domain/scoring` tests.

### Pitfall 10: Local typecheck noise
`npm run typecheck` fails locally at baseline with two errors from stale generated `.next/types/validator.ts` and `.next/dev/types/validator.ts` ("Cannot find module '../../app/api/raid-events/route.js'"); `.next` is gitignored and `app/api/raid-events` has no `route.ts`. CI runs on a clean checkout and does not see them. Use `npx tsc --noEmit 2>&1 | grep -v '^\.next/'` locally, or delete `.next/`. [VERIFIED: ran `npm run typecheck`; `git check-ignore .next`]

## Code Examples

### FIX-01: DELETE (ids branch) and PATCH, sketch
```ts
// Source: derived from app/api/loot-history/bulk/route.ts (current shape) + utils/blp/recompute.ts
function blpItemsToRecompute(rows: Array<{ loot_item_id: string | null; raid_event_id: string | null }> | null) {
  return [...new Set((rows ?? [])
    .filter(r => r.loot_item_id && r.raid_event_id)
    .map(r => r.loot_item_id as string))]
}

// DELETE, ids branch
const { data: toDelete, error: readError } = await serviceSupabase
  .from('loot_history')
  .select('id, loot_item_id, character_id, character_name, raid_event_id')
  .in('id', ids)
  .eq('guild_id', guild_id)
if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
// ... existing delete + logAudit loop ...
await recomputeBlpForItems(serviceSupabase, guild_id, blpItemsToRecompute(toDelete))

// PATCH, after a successful update
if ('character_id' in sanitized && sanitized.character_id !== beforeRow?.character_id
    && beforeRow?.loot_item_id && beforeRow?.raid_event_id) {
  await recomputeBlpForItems(serviceSupabase, guild_id, [beforeRow.loot_item_id])
}
```

### FIX-02: guild-data BLP and priorities, sketch
```ts
// Source: lib/database.types.ts (blp_tracking, guild_item_priorities) + app/api/prio-list/route.ts pattern
const blpRows = await selectAllPagesOrThrow('blp_tracking', (s, e) =>
  supabase.from('blp_tracking').select('character_id, loot_item_id, times_passed')
    .eq('guild_id', guildId).order('id', { ascending: true }).range(s, e))

const prioRows = await selectAllPagesOrThrow('guild_item_priorities', (s, e) =>
  supabase.from('guild_item_priorities')
    .select('item_id, role_priorities, class_priorities, character_priorities, priority_bonuses')
    .eq('guild_id', guildId).in('raid_tier_id', raidTierIds).order('id', { ascending: true }).range(s, e))

for (const p of prioRows) {
  priorities[p.item_id] = {            // output key unchanged: loot item id
    role_priorities: p.role_priorities || {},
    class_priorities: p.class_priorities || {},
    character_priorities: p.character_priorities || {},
    priority_bonuses: p.priority_bonuses || { role: 5, class: 3, character: 2 },
  }
}
```

### FIX-03: shared helper, sketch
```ts
// domain/expansion/wowhead.ts  (imports only ./game; EXPANSION_TO_WOWHEAD_DOMAIN moved verbatim from ItemLink.tsx:43-57)
export function getWowheadDomain(expansionName: string | undefined | null): string | null {
  if (!expansionName) return null
  return EXPANSION_TO_WOWHEAD_DOMAIN[expansionName] ?? null
}
export function wowheadItemUrl(expansionName: string | undefined | null, wowheadId: number): string {
  const domain = getWowheadDomain(expansionName)
  return domain && domain !== 'wow'
    ? `https://www.wowhead.com/${domain}/item=${wowheadId}`
    : `https://www.wowhead.com/item=${wowheadId}`   // today's retail/unknown behaviour
}
```
Expected: `wowheadItemUrl('Forever', 271940)` is `https://www.wowhead.com/forever/item=271940` (URL shape [CITED: MILESTONE-BRIEF.md, "wowhead.com/forever/item=<id>"]; id 271940 is the example the SUMMARY probe used).

### FIX-05: props, sketch
```ts
// Source: app/(app)/master-loot/_client.tsx:261-266 (current), changed
trackClientEvent('master_loot_awarded', {
  guild_id: guildId,
  submission_id: submissionId,
  new_status: status,
  item_count: submission?.item_count ?? null,
})
```

### FIX-06: typecheck guard, sketch
```ts
// utils/supabase/__tests__/typed-service-role.test.ts
const typed = createTypedServiceRoleClient()
// @ts-expect-error the real table is blp_tracking
void typed.from('bad_luck_protection')
// @ts-expect-error loot_items has item_slot, not slot
void typed.from('loot_items').select('id').eq('slot', 'x')
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Untyped `createServiceRoleClient()` | Typed `SupabaseClient<Database>` for addon and bot routes | This phase | Bad tables fail `tsc` |
| Fire-and-forget BLP recompute on POST | Same for POST; awaited for DELETE and PATCH | This phase | Undo (DESK-07) reads correct BLP |
| Retail or `/classic/` Wowhead links in Discord | `wowheadItemUrl(expansionName, id)` | This phase | Forever links open `/forever/` |

**Deprecated/outdated:** the todo's items #3, #1-slot, #2-items (fixed); CLAUDE.md's `addon/` directory (separate repo).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Awaiting `recomputeBlpForItems` inside DELETE and PATCH stays within the serverless time limit for a whole-night delete (one sequential RPC per distinct item); no `maxDuration` is set in the route and the Vercel plan limit was not checked | FIX-01 | A very large night times out the delete response after the delete already committed; mitigation is `after()` for the by-event branch only |
| A2 | The owner accepts Classic-era guilds' Discord links changing from retail or `/classic/` to the era-specific domain (alternative: Forever-only change). **Resolved 2026-10-13: the owner chose Forever-only (Open Question 3).** | FIX-03, Pitfall 8 | Visible link change for every guild; easy to narrow to Forever-only in `wowheadItemUrl` |
| A3 | `https://www.wowhead.com/forever/item=<id>` is the correct public URL (brief states it; not live-checked because live Wowhead fetches are forbidden; SUMMARY recorded a bot-challenge 202 for that page) | FIX-03 | Links 404; trivially fixable in one helper |
| A4 | Replacement bot title and description separators (colon, middle dot) are acceptable copy; they are proposals needing owner sign-off | FIX-03 | Copy rewrite only |
| A5 | Worst-case `decision_context` JSON after adding two keys stays under 4096 bytes (estimate about 2.5 KB) | FIX-04 | Snapshot silently replaced by the `_truncated` stub; covered by the planned test |
| A6 | A 1700-UUID `.in()` filter exceeds practical URL limits; exact limit not measured | FIX-02 | Only affects choice of filter; the recommended filter is safe either way |
| A7 | PostHog dashboards that read `item_name` or `character_name` on `master_loot_awarded` exist (Decision 19 says dashboards are affected); their contents cannot be inspected from the repo | FIX-05 | Dashboard breakage is already accepted by Decision 19 |
| A8 | Other `loot_history` deletion paths (raid event deletion cascade, `user/delete-account`) were not audited for BLP; they are outside FIX-01's wording | FIX-01 | Stale BLP after those paths; separate bug |

## Open Questions (RESOLVED)

All seven questions are resolved (owner answers recorded 2026-10-13; the rest resolved during planning). Each resolution names its owning plan.

1. **What should `master_loot_awarded` report as "the item"? (needs owner)**
   - Known: the event fires on submission review, with `item_name` set to `'approved'` or `'rejected'` and a player name; there is no single item at that site.
   - Unclear: whether the owner meant "stop mislabelling" or wants an item identity.
   - Recommendation: keep the event name, drop the name, send `{ guild_id, submission_id, new_status, item_count }`. If a real item is wanted, move item-level reporting to the award path and retire this event.
   - **RESOLVED (owner decision 1, 2026-10-13; plan 01-06):** keep the event name and send `{ guild_id, submission_id, new_status, item_count, loot_item_ids }`, where `loot_item_ids` are the ids of the reviewed submission's live loot items (ids only, no names). This satisfies success criterion 5 "reports the item" as written; ROADMAP and REQUIREMENTS wording are not amended.
2. **Await or `after()` for DELETE and PATCH recompute?**
   - Known: criterion 1 says "by the time the request returns"; `after()` returns first.
   - Unclear: Vercel function limit for the by-event delete on large nights.
   - Recommendation: await for `ids` DELETE and PATCH (one item); await for the by-event DELETE too unless a cap is known, with `after()` as the fallback for that branch only.
   - **RESOLVED (plan 01-01):** await on all three paths (DELETE by `ids`, DELETE by `raid_event_id`, PATCH). `after()` for the by-event branch only stays the documented fallback if assumption A1 fails on a real night.
3. **Classic-era guild links:** change to era-specific domains (recommended, matches `ItemLink`) or Forever-only?
   - **RESOLVED (owner decision 2, 2026-10-13; plan 01-03, consumed by plan 01-04):** Forever-only. Every non-Forever guild's links stay byte-identical to today. Era-correct links for older expansions are an opt-in follow-up, recorded as deferred and not planned.
4. **Other em dashes in bot output:** only the `/score` and `/priority` titles are in the roadmap criterion. `help.js:267` (ops-channel embed title) and many non-title strings (`help.js`, `digest.js`, `feedback.js`, `closures.js`) contain em dashes. Fix just the raider-facing `interactions.js` strings (recommended; REH-02's em-dash test in Phase 7 sweeps the rest) or include `help.js:267`?
   - **RESOLVED (owner decision 3, 2026-10-13; plan 01-04):** fix every bot embed title this phase (both `interactions.js` titles, `help.js:267`, and the `/priority` raider line). The remaining user-facing bot em dashes (`feedback.js:327`, `help.js:344` and `:352`, `commands.js:24`, `digest.js:126`) are deferred to Phase 7 REH-02 as an owner-accepted exception to Hard Constraint 2, recorded in plan 01-04. The four replacement strings still need owner sign-off before plan 01-04 merges. Planning also found `feedback.js:324`, `help-review.js:94` and `help.js:129`, proposed for the same deferral and flagged for the owner to confirm.
5. **Other analytics call sites that send names:** `LootSubmissionsContent.tsx:533,538` (`character_name`), `app/api/characters/route.ts:205` (`character_name`), `app/api/reserve-runs/[id]/awards/route.ts:122` (`character_name`), `app/api/battlenet/characters/import/route.ts:438` (`character_name`), `CreateGuildModal.tsx:385` and `app/api/guilds/route.ts:318` (`guild_name`). Hard Constraint 3 binds new events, and FIX-05 names one event. Sweep them in this phase or log as a follow-up?
   - **RESOLVED (plans 01-06 and 01-08):** sweep in this phase. Plan 01-06 cleans the browser sites and the PostHog super, group and person properties; plan 01-08 cleans the server sites and adds the scan guard. Per owner decision 4 (2026-10-13), `email` is dropped from `posthog.identify` in `app/components/PostHogProvider.tsx` and `discord_id` stays.
6. **Reserve "Copy for Discord" (`app/reserve/join/[token]/page.tsx:682`)** builds retail links a raider pastes into Discord; not in the roadmap's list of three sites. Include (needs the run's expansion name on a public token page) or defer?
   - **RESOLVED (plan 01-03):** included. `run.expansion_name` is already loaded on the public token page, so the fix is one line.
7. **Row-cap scope in `guild-data`:** include paging for `loot_items` (MoP 1700+ items) as part of FIX-02, or only for BLP and priorities?
   - **RESOLVED (plan 01-02):** page `loot_items` in guild-data too (ordered by name then id). export-string (plan 01-07) reads items through an embedded select that the top-level row cap does not truncate, so it pages only BLP and priorities.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all | yes | v22.23.0 local (CI uses 20; companion job uses 22) | - |
| npm / `npx` | vitest, tsc | yes | present | - |
| Vitest | tests | yes | 4.1.0 | - |
| `gh` CLI | PR checks, history | yes | authenticated (queried PRs) | - |
| `node .claude/gsd-core/bin/gsd-tools.cjs` | commit, state | yes | present | - |
| Supabase local / `db reset` | not needed (no migration) | n/a | - | - |
| Network access to wago.tools or Wowhead | not needed and forbidden | n/a | - | - |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (`globals: true`, default env jsdom; route tests opt into `// @vitest-environment node`) |
| Config file | `/Users/alexander.mayes/Code/personal/loot-list-plus/vitest.config.ts` (+ `vitest.setup.ts`) |
| Quick run command | `npx vitest run <paths>` |
| Full suite command | `npm run test` (= `vitest run`) |
| Type gate | `npm run typecheck` (`tsc --noEmit`); locally filter stale `.next` errors, see Pitfall 10 |
| Baseline (this session) | `npx vitest run app/api/loot-history app/api/addon app/api/bot discord-bot domain/scoring app/components/__tests__/ItemLink.test.ts`: 22 files, 620 tests, all passed in 1.5 s. Typecheck: only the 2 stale `.next` errors |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | DELETE by ids recomputes the distinct items with a `raid_event_id`, awaited before the response | route unit | `npx vitest run app/api/loot-history/bulk` | extend (no DELETE tests today) |
| FIX-01 | DELETE by `raid_event_id` recomputes every distinct item of that night | route unit | same | extend |
| FIX-01 | PATCH reassign calls recompute for `[loot_item_id]`; notes-only or same-character does not | route unit | same | extend |
| FIX-01 | Pre-read error returns 500 and deletes nothing; delete error returns 500 and recomputes nothing | route unit | same | extend |
| FIX-02 | guild-data and export-string query `blp_tracking` and `guild_item_priorities` by name; `blp` and `priorities` payload shapes unchanged | route unit | `npx vitest run app/api/addon` | rewrite fixtures |
| FIX-02 | Each query error returns 500, not an empty 200 | route unit | same | add |
| FIX-02 | Guild with no settings row or null `active_expansion_id` still returns 200 | route unit | same | add |
| FIX-03 | `wowheadItemUrl('Forever', id)` is `/forever/item=`; each era maps; unknown falls back to retail | unit | `npx vitest run domain/expansion` | new `wowhead.test.ts` |
| FIX-03 | `notifyLootAward` builds `/forever/` links for a Forever guild and never throws on a failed name lookup | unit (fake supabase, mock `@/lib/discord`) | `npx vitest run lib/__tests__` | new |
| FIX-03 | Raid summary loot line uses `wowheadItemUrl` (extracted pure formatter) | unit | `npx vitest run app/api/discord lib` | new |
| FIX-03 | `/api/bot/priority` ok payload carries `item_url`; expansion lookup error returns 500 | route unit | `npx vitest run app/api/bot` | extend |
| FIX-03 | Bot renders `item_url` when valid, falls back otherwise; no em dash in any `priorityReply` or `scoreReply` title; "by list rank" footer pinned | bot unit | `npx vitest run discord-bot` | update 2 assertions (`:72`, `:207`), add |
| FIX-04 | `decision_context` components keep all nine keys through `logAudit`; payload under cap | route unit | `npx vitest run app/api/loot-history/bulk` | add |
| FIX-05 | Event props builder has no `character_name` and no status-as-item | unit | `npx vitest run utils/analytics` | new |
| FIX-06 | Nonexistent table and column fail typecheck; addon and bot routes use only the typed factory | type + scan | `npm run typecheck` and `npx vitest run utils/supabase` | new |
| All | Loot Score golden fixtures unchanged | unit | `npx vitest run domain/scoring` | existing, must not be edited |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched paths>` (under 10 s).
- **Per wave merge:** `npx vitest run app/api domain discord-bot lib utils` plus `npx tsc --noEmit 2>&1 | grep -v '^\.next/'`.
- **Phase gate (before `/gsd-verify-work`):** `npm run lint && npm run typecheck && npm run test` green on a clean checkout (or with `.next` removed). If `companion/` is touched (not expected): `cd companion && npm run typecheck`.

### Wave 0 Gaps
- [ ] `domain/expansion/__tests__/wowhead.test.ts` (FIX-03)
- [ ] `lib/__tests__/discord-loot-announcements.test.ts` (FIX-03; mock `@/lib/discord` `discordFetch`)
- [ ] `utils/supabase/__tests__/typed-service-role.test.ts` (FIX-06)
- [ ] DELETE harness in `app/api/loot-history/bulk/__tests__/route.test.ts` (fixture field for pre-read rows; import `DELETE`)
- [ ] Rewrite fakes in `app/api/addon/guild-data/__tests__/route.test.ts` and `app/api/addon/export-string/__tests__/route.test.ts` (rename tables, reject unknown tables)
- [ ] Optional: `utils/analytics/__tests__/master-loot-events.test.ts` (FIX-05)
- Framework install: none.

## Security Domain

`security_enforcement` is not set to false in `.planning/config.json` (key absent), so this section applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no change | addon routes keep `authenticateAddonRequest` and `authorizeAddonGuild`; bot routes keep `checkBotAuth` (all untouched) |
| V3 Session Management | no | - |
| V4 Access Control | yes | bulk route keeps `verifyPermission(..., 'manage_loot')` before any read or write; every DELETE and PATCH filter keeps `.eq('guild_id', guild_id)`; the new recompute passes the caller's `guild_id`, never a row's |
| V5 Input Validation | yes | PATCH already whitelists fields; DELETE `ids` is an unvalidated array (existing, guild-scoped); `decision_context` is whitelisted and size-capped; bot validates `item_url` shape before rendering into markdown |
| V6 Cryptography | no | - |
| V8/V13 Data protection and API | yes | Privacy: FIX-05 removes a player name from PostHog; no new analytics fields beyond ids and counts |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Cross-guild write via a client-supplied id | Tampering / Elevation | Keep `guild_id` filters on every `loot_history` delete and update; recompute uses the request's verified `guild_id` |
| Markdown or mention injection through a URL or name in a public embed | Spoofing | Bot accepts `item_url` only if it starts with `https://www.wowhead.com/`; item names already come from the DB; keep existing `safeGuildName` handling |
| Player identity in analytics | Information disclosure | Ids and counts only (Hard Constraint 3) |
| Tainted format strings in logs (CodeQL) | Tampering | Never interpolate user values into the first `console.*` argument |
| Service-role client used with a typo'd table | Integrity | Typed client for addon and bot routes (FIX-06) |
| Silent failure returning empty data | Integrity | Check and surface every PostgREST error (FIX-02) |

## Sources

### Primary (HIGH confidence, files read this session)
- `/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/forever/{REQUIREMENTS,ROADMAP,STATE,MILESTONE-BRIEF}.md`, `.planning/research/SUMMARY.md`, `.planning/todos/pending/2026-09-28-fix-five-defects-found-in-the-forever-loot-code-review.md`, `.planning/config.json`, `.claude/CLAUDE.md`
- `app/api/loot-history/bulk/route.ts` (full) and `__tests__/route.test.ts` (fake client, POST and PATCH suites)
- `app/api/addon/{guild-data,export-string,loot-award}/route.ts`, the first two with their tests; `lib/loot/loot-history-rows.ts`; `utils/blp/recompute.ts`; `supabase/migrations/20260609000001_blp_recompute_from_history.sql`, `20260721000001_add_blp_reset_anchor.sql` (header), `20261003230000_blp_and_reserve_award_rules.sql` (header)
- `app/api/bot/{priority,score}/route.ts`, `app/api/bot/_helpers.ts`, `app/api/bot/priority/__tests__/route.test.ts`; `discord-bot/{interactions.js,interactions.test.mjs,lootlist-api.js,package.json}`; `companion/src/main/api-client.ts`, `companion/package.json`
- `lib/discord-loot-announcements.ts`, `app/api/discord/post-raid-summary/route.ts`, `app/components/ItemLink.tsx`, `domain/expansion/{index,game}.ts`, `app/reserve/join/[token]/page.tsx` (lines 660-700)
- `app/(app)/master-loot/_client.tsx`, `utils/analytics/client.ts`, `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx` (515-550), `domain/types.ts`, `domain/scoring/engine.ts`, `app/(app)/master-sheet/components/{ItemCandidateModal,BossSection}.tsx` (relevant ranges)
- `utils/supabase/{service-role,admin,server,paginate}.ts`, `lib/db.ts`, `lib/database.types.ts` (blp_tracking, guild_item_priorities, loot_items, raid_tiers, expansions, guilds), `lib/loot-items-query.ts`, `supabase/config.toml`, `vitest.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.github/workflows/ci.yml`
- Commands run: `gh pr view 322 301 363` (merged states), `git rev-list --left-right --count origin/main...HEAD` (`0 6`), `npm run typecheck` (2 stale `.next` errors only), `npx vitest run ...` (22 files, 620 tests pass), three scratch `tsc` spikes (A, B, C) against copies of tsconfig in the session scratchpad
- The `research-plan` MCP provider seam was not used: this phase needs no library docs or web research (all code-grounded), so no provider fetches were made and no cache entries written.

### Secondary (MEDIUM confidence)
- `MILESTONE-BRIEF.md` and `SUMMARY.md` for the Wowhead Forever URL shape and Decision numbers (cited, not re-probed; live probes forbidden)

### Tertiary (LOW confidence)
- None beyond the `[ASSUMED]` items in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing added; versions read from `node_modules` and `package.json`.
- Architecture: HIGH for FIX-01, 02, 04, 06 (code read, spikes run); MEDIUM for FIX-03 (Wowhead URL shape cited) and FIX-05 (semantic mismatch needs owner input).
- Pitfalls: HIGH, each found in code or reproduced by a spike or baseline run.

**Research date:** 2026-10-12
**Valid until:** 2026-10-19 (the files are changing under active milestone work; re-run `git diff origin/main` on the listed files before planning if more than a week passes)
