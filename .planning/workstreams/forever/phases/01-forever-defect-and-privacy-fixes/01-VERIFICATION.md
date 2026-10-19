---
phase: 01-forever-defect-and-privacy-fixes
verified: 2026-10-13T22:15:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: false
gaps: []
deferred: []
human_verification:

  - test: "Open a real Forever item link from a Discord loot announcement, the post-raid summary, a /priority reply and the reserve page 'Copy for Discord' text"
    expected: "Each opens https://www.wowhead.com/forever/item=<id> on a live Wowhead page (the URL shape was built from the stored wowhead_id and never live-checked)"
    why_human: "Live Wowhead fetches are forbidden in this repo; code, unit tests and grep prove the string, not that the live site resolves it"

  - test: "Owner reviews and signs off the new bot copy: '/priority' titles 'Top priority: <item>', '/score' titles '<name>: Loot Score (<team>)', the raider line 'rank N' separated by a middle dot, and the officer help-article review title '(pending review)'"
    expected: "Owner approves or edits the strings before the plan 01-09 PR merges (Hard Constraint 2)"
    why_human: "Copy sign-off is an owner decision; it gates the PR merge, not the code"

  - test: "Delete a whole raid night with many awards (for example 40 items) on a real guild and time the DELETE /api/loot-history/bulk response"
    expected: "Response returns with BLP already corrected and in acceptable time (recompute is awaited, one RPC per distinct item, serial)"
    why_human: "Unit tests mock the recompute RPC; real latency of N sequential recompute_blp_for_item calls was never measured"

  - test: "On the reserve join page, click 'Copy for Discord' for a Forever run and for a non-Forever run"
    expected: "Forever run pastes wowhead.com/forever/item=<id> links; a non-Forever run pastes the same retail /item= links as before"
    why_human: "No component test covers the copy handler; coverage is grep and typecheck only"
---

# Phase 1: Forever Defect and Privacy Fixes Verification Report

**Phase Goal:** Officers and raiders can trust every award, BLP number, item link and analytics event before the first Forever award is announced.
**Verified:** 2026-10-13
**Status:** human_needed (all automated checks pass; four human items remain, none a code gap)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An officer who deletes or edits an award sees BLP recomputed by the time the request returns | VERIFIED | `app/api/loot-history/bulk/route.ts`: DELETE by `raid_event_id` (line ~535) and by `ids` both `await recomputeBlpForItems(serviceSupabase, guild_id, items)` after the delete and before `NextResponse.json({success:true})`. PATCH awaits the recompute when `character_id` changes (move or unlink) on a linked row. Pre-read and before-read errors return 500 and write nothing. `blpItemsToRecompute` dedupes per item and skips null `raid_event_id`/`loot_item_id`. The RPC `recompute_blp_for_item` (migration 20260721000001) deletes and rebuilds counter and journal from history, so removing the row corrects BLP. Behavioral evidence: named tests "the response waits for the recompute (awaited, not after())", "E-03 the by-night recompute is awaited before the response returns", "the reassign response waits for the recompute" ran and passed (68/68 in the file). Not coincidental: ordering is enforced by `await`. |
| 2 | Companion shows real BLP and item priorities; a DB error reaches the companion as an error, not an empty list | VERIFIED | `app/api/addon/guild-data/route.ts` and `export-string/route.ts` read `blp_tracking` (`character_id, loot_item_id, times_passed`) and `guild_item_priorities` (`item_id, role_priorities, ...`) through `selectAllPagesOrThrow` (each page's error throws, ordered by unique `id`, pages of 1000), all on `createTypedServiceRoleClient`. Table and column names exist in `lib/database.types.ts`. Errors throw into the route catch and answer 500 `{error}`; the `loot_history` receive-skip read returns null on error and is converted to a throw. Companion `api-client.ts getGuildData()` throws on `!res.ok`, and `sync-engine.ts` catches, sets state `error` and writes nothing, so pending data is kept. No `bad_luck_protection` or `item_priorities` table reference remains in app code (only a doc comment). |
| 3 | Pointing an addon or bot route at a nonexistent table fails `npm run typecheck` | VERIFIED | Every `route.ts` under `app/api/addon` (8) and `app/api/bot` (2) uses `createTypedServiceRoleClient` (`SupabaseClient<Database>`); no route imports the untyped module. Scan guard `utils/supabase/__tests__/typed-client-usage.test.ts` (floor of 10 routes, synthetic violating and clean cases) passes. I independently proved the mechanism: a scratch file calling `.from('bad_luck_protection')` on the typed client fails tsc with TS2769, and `.eq('nonexistent_col')` fails TS2345. See warning W1 on helper modules. |
| 4 | In a Forever guild every item link in loot announcements, post-raid summary and bot replies opens `wowhead.com/forever/...`; no bot embed title contains an em dash | VERIFIED (code); live URL and copy sign-off are human items | `domain/expansion/wowhead.ts` `wowheadItemUrl()` returns `https://www.wowhead.com/forever/item=<id>` when the stored expansion name is 'Forever' (matches `expansionSeeder.ts` and migration `20260926120000`). Call sites: `lib/discord-loot-announcements.ts` (expansion name read from `guilds.active_expansion_id`), `lib/discord-raid-summary.ts` (passes `'classic'` fallback so non-Forever links are unchanged), `app/api/discord/post-raid-summary/route.ts` (passes `expansionName`), `app/api/bot/priority/route.ts` (reads expansion, sends `item_url`), `discord-bot/interactions.js` (renders `item_url` after a strict `https://www.wowhead.com/[a-z0-9-]/item=N` shape check, falls back to retail link for an older app), reserve page copy text. No other Wowhead link builder exists in app, lib, utils, domain or discord-bot. Em dashes: all bot embed titles are clean (`Top priority: ...`, `<name>: Loot Score`, `(pending review)` help title); the `/priority` raider line uses a middle dot. Tests assert no U+2014 in every `/priority` and `/score` embed. discord-bot tests 40/40 pass. |
| 5 | Award receipt's audited score snapshot includes donation and raider bonuses; `master_loot_awarded` reports the item and carries no player name | VERIFIED | Receipt: `COMPONENT_KEY_MAP: Record<keyof ScoreComponents, true>` includes `donationBonus` and `raiderBonus`, so omitting a future component is a compile error; `sanitizeComponents` iterates all keys; `ItemCandidateModal.rankingToComponents` sends both fields for winner and top candidates. Analytics: `_client.tsx` now calls `buildMasterLootAwardedProps` which emits `guild_id, submission_id, new_status, item_count, loot_item_ids` (ids read from `loot_submission_items`, null on failed read, never 0). Old `item_name: status` and `character_name` are gone. Scan guard `no-names-in-analytics.test.ts` passes. Related FIX-05 hygiene also verified: `guild_created`, `character_created`, `reserve_item_awarded`, `guild_creation_completed` no longer send names; `posthog.identify` in `PostHogProvider.tsx` and `GuildContext.tsx` sends no email or name. |

**Score:** 5/5 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `utils/supabase/typed-service-role.ts` | Typed service-role factory | VERIFIED | `SupabaseClient<Database>`; used by all 10 addon and bot routes |
| `utils/supabase/paginate.ts` `selectAllPagesOrThrow` | Error-checking paged reader | VERIFIED | Throws `Failed to read <label>` per page; used in guild-data and export-string |
| `utils/supabase/__tests__/typed-client-usage.test.ts` | FIX-06 scan guard | VERIFIED | Passing, non-vacuous (route floor plus synthetic cases) |
| `domain/expansion/wowhead.ts` + index export | Forever-aware URL helper | VERIFIED | Imports nothing; 5 consumers |
| `utils/analytics/master-loot-events.ts` | Name-free props builder | VERIFIED | Wired into `master-loot/_client.tsx` |
| `utils/analytics/__tests__/no-names-in-analytics.test.ts` | Privacy scan guard | VERIFIED | Passing |
| `app/api/loot-history/bulk/route.ts` | Awaited recompute and receipt keys | VERIFIED | See truths 1 and 5 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| loot-history bulk DELETE/PATCH | `recompute_blp_for_item` RPC | `await recomputeBlpForItems` | WIRED | Before response in both branches |
| guild-data / export-string | `blp_tracking`, `guild_item_priorities` | typed client plus `selectAllPagesOrThrow` | WIRED | Real tables, errors throw |
| companion `getGuildData` | UI error state | `!res.ok` throw, sync-engine catch | WIRED | Pending data preserved |
| `/api/bot/priority` | `discord-bot/interactions.js` | `item_url` field | WIRED | Shape-checked before render |
| `ItemCandidateModal` | bulk POST receipt | `winner_components` / `top_candidates[].components` | WIRED | Includes donation and raider |
| master-loot review handler | PostHog | `buildMasterLootAwardedProps` | WIRED | No names |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| guild-data `blp` map | `blpRows` | `blp_tracking` paged select | Yes | FLOWING |
| guild-data `priorities` map | `priorityRows` | `guild_item_priorities` paged select | Yes | FLOWING |
| export-string BLP and priorities | `blpData`, priority rows | same two tables | Yes | FLOWING |
| `master_loot_awarded.loot_item_ids` | `submission.loot_item_ids` | `loot_submission_items` select | Yes (null on failed read) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Typecheck of source | `npm run typecheck` | Only error is a stale generated `.next/dev/types/validator.ts` reference to a removed `app/api/raid-events/route.js` (gitignored build artifact, no source errors) | PASS (see W3) |
| Typed client rejects a bad table and column | scratch tsc with `.from('bad_luck_protection')` and `.eq('nonexistent_col')` | TS2769 and TS2345 raised | PASS |
| Phase-area tests | `vitest run utils/analytics utils/supabase app/api/addon app/api/bot app/api/loot-history lib/__tests__ domain/expansion app/api/discord master-loot app/api/reserve` | 37 files, 750 tests pass | PASS |
| Bot tests | `vitest run discord-bot` | 40 pass | PASS |
| Full suite | `vitest run` (once) | 3966 pass, 1 fail: `__tests__/quality-brand-token-parity.test.ts` 5000 ms timeout under load; passes alone (3/3). Unrelated (COLOR-05, design-system workstream, untouched by this phase) | PASS with note |
| Lint on changed files | `eslint` | 0 errors, 38 pre-existing style warnings | PASS |

### Probe Execution

Step 7c: SKIPPED. No probes declared by any plan.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| FIX-01 | 01-01 | BLP recomputed on award delete and edit in same request | SATISFIED | Truth 1 |
| FIX-02 | 01-02, 01-07 | Companion gets real BLP and priorities; PostgREST errors surface | SATISFIED | Truth 2 |
| FIX-03 | 01-03, 01-04, 01-09 | Forever Discord links; no em dash in bot embed titles | SATISFIED (code); live-URL and copy sign-off pending | Truth 4 |
| FIX-04 | 01-01 | Receipt keeps `donationBonus` and `raiderBonus` | SATISFIED | Truth 5 |
| FIX-05 | 01-06, 01-08 | `master_loot_awarded` carries no player name, reports item | SATISFIED | Truth 5 |
| FIX-06 | 01-02, 01-04, 01-05, 01-07 | Typed service-role client for addon and bot routes | SATISFIED | Truth 3 |

All six IDs appear in plan frontmatter and in REQUIREMENTS.md (marked Complete). REQUIREMENTS.md maps no other ID to Phase 1, so there are no orphaned requirements.

### Anti-Patterns Found

No `TBD`, `FIXME`, `XXX`, `TODO` or `HACK` markers were added in any non-test file touched by the phase. No stubs, hollow props or static returns in the verified paths. No migrations in the phase diff.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/addon/export-string/route.ts` | 314 | Debug `loot_items` count read ignores its error | Info | Log only; does not affect the payload |

### Warnings (not blockers)

- **W1. Shared helpers still use untyped clients.** `lib/addon/sync-tokens.ts` (`createServiceRoleClient()`, queries `addon_sync_tokens`), `lib/addon/member-ranked-items.ts` (`SupabaseClient<any,any,any>`, queries `loot_history`) and `app/api/bot/_helpers.ts` (untyped `SupabaseClient`, queries `guilds`) are called by the addon and bot routes but are not type-guarded. SC3 as written ("route") holds and the scan guard covers only `route.ts` files, so a wrong table name inside these four helper queries would still compile. Consider typing them in a later phase or a quick task.
- **W2. Remaining non-title em dashes in the bot.** `discord-bot/help.js` (footer line 344, fallback description line 352, digest line 126), `commands.js` slash description and `help-review.js` still contain em dashes. This is the recorded owner decision 3 deferral to Phase 7 REH-02, outside SC4's "embed title" wording. Noted so it is not forgotten.
- **W3. Stale `.next` generated types** make `npm run typecheck` exit non-zero locally (`.next/dev/types/validator.ts` references a removed route). This is a gitignored artifact, not a source error; deleting `.next/dev` or running a build clears it. CI is unaffected.
- **W4. Accepted bounds.** The `character_guild_memberships` read in both addon routes is a single read capped at 1000 rows (accepted in 01-02 and 01-07). Non-Forever guilds keep their pre-existing link domains (owner decision 2).

### Human Verification Required

1. **Live Forever URL shape.** Test: open a Forever item link from each of the four surfaces. Expected: resolves on `wowhead.com/forever/item=<id>`. Why human: live fetches forbidden.
2. **Owner copy sign-off for plan 01-09 strings.** Gates the PR merge (Hard Constraint 2). Why human: owner decision.
3. **Whole-night DELETE latency.** Test: delete a large raid night on a real guild. Expected: acceptable response time with BLP already correct. Why human: RPC is mocked in tests.
4. **Reserve page "Copy for Discord".** Test: copy for a Forever and a non-Forever run. Expected: forever and retail links respectively. Why human: no component test.

### Gaps Summary

No gaps. Every roadmap success criterion is backed by code I read and by tests I ran, and the one type-safety mechanism (SC3) was proven non-vacuous with my own scratch compile. The status is `human_needed` only because four items cannot be verified programmatically; none blocks proceeding to Phase 2 or 3 on the code side, though the 01-09 PR must not merge before owner copy sign-off.

---

_Verified: 2026-10-13_
_Verifier: Claude (gsd-verifier)_
