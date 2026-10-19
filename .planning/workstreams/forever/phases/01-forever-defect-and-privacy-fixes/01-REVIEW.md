---
phase: 01-forever-defect-and-privacy-fixes
reviewed: 2026-10-13T15:30:00Z
depth: standard
files_reviewed: 52
files_reviewed_list:
  - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
  - app/(app)/master-loot/_client.tsx
  - app/api/addon/attendance/route.ts
  - app/api/addon/auth/route.ts
  - app/api/addon/auth/token/route.ts
  - app/api/addon/export-string/__tests__/route.test.ts
  - app/api/addon/export-string/route.ts
  - app/api/addon/guild-data/__tests__/route.test.ts
  - app/api/addon/guild-data/route.ts
  - app/api/addon/import-string/route.ts
  - app/api/addon/loot-award/route.ts
  - app/api/addon/sync-token/route.ts
  - app/api/battlenet/characters/import/__tests__/route.test.ts
  - app/api/battlenet/characters/import/route.ts
  - app/api/bot/priority/__tests__/route.test.ts
  - app/api/bot/priority/route.ts
  - app/api/bot/score/route.ts
  - app/api/characters/route.ts
  - app/api/discord/post-raid-summary/route.ts
  - app/api/guilds/__tests__/route.test.ts
  - app/api/guilds/route.ts
  - app/api/loot-history/bulk/__tests__/route.test.ts
  - app/api/loot-history/bulk/route.ts
  - app/api/loot-submissions/remove-item/__tests__/route.test.ts
  - app/api/loot-submissions/remove-item/route.ts
  - app/api/reserve-runs/[id]/awards/__tests__/route.test.ts
  - app/api/reserve-runs/[id]/awards/route.ts
  - app/components/CreateGuildModal.tsx
  - app/components/ItemLink.tsx
  - app/components/PostHogProvider.tsx
  - app/contexts/GuildContext.tsx
  - app/reserve/join/[token]/page.tsx
  - companion/src/main/__tests__/api-client.test.ts
  - discord-bot/help.js
  - discord-bot/help.test.mjs
  - discord-bot/interactions.js
  - discord-bot/interactions.test.mjs
  - domain/expansion/__tests__/wowhead.test.ts
  - domain/expansion/index.ts
  - domain/expansion/wowhead.ts
  - lib/__tests__/discord-loot-announcements.test.ts
  - lib/__tests__/discord-raid-summary.test.ts
  - lib/discord-loot-announcements.ts
  - lib/discord-raid-summary.ts
  - utils/analytics/__tests__/master-loot-events.test.ts
  - utils/analytics/__tests__/no-names-in-analytics.test.ts
  - utils/analytics/master-loot-events.ts
  - utils/supabase/__tests__/paginate.test.ts
  - utils/supabase/__tests__/typed-client-usage.test.ts
  - utils/supabase/__tests__/typed-service-role.test.ts
  - utils/supabase/paginate.ts
  - utils/supabase/typed-service-role.ts
findings:
  critical: 0
  warning: 6
  info: 6
  total: 12
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-10-13T15:30:00Z
**Depth:** standard
**Files Reviewed:** 52
**Status:** issues_found

## Summary

Reviewed the phase's own changes (`git diff 8dbfbd39..HEAD`) plus the code they interact with (`utils/blp/recompute.ts`, `lib/addon/member-ranked-items.ts`, `app/api/bot/_helpers.ts`, the `recompute_blp_for_item` SQL, `utils/analytics/*`). The 26 related test files pass (522 tests), `tsc --noEmit` is clean apart from a stale `.next/dev/types` artifact, and eslint raises no new warnings in changed code.

No blockers found. The core fixes hold up under tracing:

- The error-check-every-read conversion in export-string and guild-data is consistent. Every page of every paged read is ordered by a unique column or a column list ending in one, and the page-boundary logic in `selectAllPagesOrThrow` is correct (a full page requests one more; a short page stops).
- The `recompute_blp_for_item` SQL does read only history rows with a non-null `raid_event_id`, so `blpItemsToRecompute` skipping rows without one is accurate.
- The bot `item_url` regex is anchored, contains no markdown-significant characters, and the fallback preserves the old behaviour.
- The typed-client compile-time guard works (tsconfig includes tests, and a `@ts-expect-error` that stops erroring fails typecheck).

The concerns are failure modes the new awaited-recompute path does not surface, a privacy cleanup that is only partial, an ordering key whose semantics were not examined, and gaps in the two scan-style guard tests.

## Warnings

### WR-01: Awaited BLP recompute failure is swallowed; the officer gets 200 with stale BLP

**File:** `app/api/loot-history/bulk/route.ts:529-538, 578-583, 725` (callee `utils/blp/recompute.ts:21-31`)
**Issue:** The phase moved the recompute from fire-and-forget to awaited so the officer's next read is correct. But `recomputeBlpForItems` only `console.error`s an RPC failure and returns `void`, so when the RPC fails the delete or reassign has already committed, the route answers `{ success: true }`, and BLP stays stale with no signal to the officer, to `trackApiError`, or to a retry. The route comments ("this cannot fail a delete that already committed") treat "never throws" as the goal, but that turns the case the awaiting was meant to fix back into a silent one. The route tests mock `recomputeBlpForItems`, so no test exercises an RPC failure. The doc comment on `recompute.ts` ("Fire-and-forget at the call site; errors are logged, not thrown") is now also wrong for these call sites.
**Fix:** Have the helper return the ids that failed and let the route surface them without failing the committed write:
```ts
// utils/blp/recompute.ts
export async function recomputeBlpForItems(...): Promise<{ failed: string[] }> {
  const failed: string[] = []
  for (const lootItemId of ids) {
    const { error } = await supabase.rpc('recompute_blp_for_item', { p_guild_id: guildId, p_loot_item_id: lootItemId })
    if (error) { console.error('BLP recompute failed for item', lootItemId, error); failed.push(lootItemId) }
  }
  return { failed }
}
// route: const { failed } = await recomputeBlpForItems(...)
// if (failed.length) { trackApiError(user.id, 'DELETE /api/loot-history/bulk', new Error(`BLP recompute failed for ${failed.length} item(s)`)); return NextResponse.json({ success: true, blp_stale: true }) }
```
Add a route test where the mocked recompute reports a failure.

### WR-02: Whole-night delete awaits one sequential RPC per distinct item inside the request

**File:** `app/api/loot-history/bulk/route.ts:533-538` (callee `utils/blp/recompute.ts:21-31`)
**Issue:** `DELETE { raid_event_id }` now awaits `recompute_blp_for_item` once per distinct item, sequentially. Each call deletes and rebuilds `blp_credits` and `blp_tracking` for the (guild, item). A raid night with 30 to 60 distinct awards makes the delete request take a sum of that many RPC round trips. If the serverless function times out partway, the delete has already committed and the client sees an error, while only some items were recomputed, so BLP ends up partially stale. The ids branch has the same shape but usually passes few items.
**Fix:** Bound the work without giving up the awaited guarantee, for example run the per-item RPCs in small concurrent batches (4 to 8 at a time) inside `recomputeBlpForItems`, and set an explicit `maxDuration` on the route. If the item count exceeds a threshold, fall back to `after()` plus the stale flag from WR-01.

### WR-03: Approved-submission "newest wins" ordering uses a nullable `created_at`, and the winner semantics were not checked

**File:** `app/api/addon/export-string/route.ts:~197-199`, `app/api/addon/guild-data/route.ts:~127-129`
**Issue:** The reads are now ordered `created_at ASC, id ASC` so that `buildMemberRankedItems`' keep-the-last rule (`entriesByCharacter.set(sub.character_id, entries)`) gives the newest submission. Two problems:
1. `loot_submissions.created_at` is nullable (`string | null` in `database.types.ts`). Postgres sorts NULLs last on ASC, so a row with a null `created_at` is treated as the newest and wins.
2. `created_at` is the row's creation time. A resubmitted or edited submission (`resubmission_count`, `version`, `reviewed_at`, `updated_at` all exist) keeps its original `created_at`, so an older approved row that was never touched can outrank a recently re-approved one. The comment says "newest approved submission", but the key does not measure that.
Also, last-wins replaces the whole item list per character, so with one approved submission per phase the "winner" is a different phase's list; this is pre-existing but was previously nondeterministic and is now deterministic in a way that may be wrong.
**Fix:** Order by the column that records the approval or last change, with nulls first, and add the id tiebreak:
```ts
.order('updated_at', { ascending: true, nullsFirst: true })
.order('id', { ascending: true })
```
Confirm with the owner which column defines "current", and consider keying the map by (character, phase) instead of character only.

### WR-04: Guild-name super property is only cleared inside the active-guild effect, and historical person data is untouched

**File:** `app/contexts/GuildContext.tsx:871-905`, `app/components/PostHogProvider.tsx:73-85`
**Issue:** The privacy sweep removes names and email from what is sent going forward, but:
1. `posthog.unregister('guild_name')` sits inside an effect that returns early on `if (!activeGuild?.id) return`. A returning user who has no active guild (left their guild, new session before guilds load, or the `/auth` and landing routes where `GuildContextProvider` has no guild) keeps the old `guild_name` super property in localStorage, and PostHog attaches it to every event they send. Super properties persist across sessions, so this is the exact leak the unregister was added to stop.
2. Stopping `identify` from sending `email`, `display_name`, `current_guild` and group `name` does not remove values already stored on the person and group profiles in PostHog. Nothing in the phase removes them (no `$unset`, no PostHog-side cleanup task is referenced).
3. `discord_id` is still sent as a person property. It is a stable external identifier for a person; the owner decision only named email, so this is a call to confirm rather than a bug.
**Fix:** Move the unregister to a mount-level effect that does not depend on a guild (for example in `PostHogProvider` after init), run it once per load, and also `posthog.unregister('current_guild')`. Track a separate cleanup item to `$unset` `email`, `display_name`, `current_guild` and group `name` in PostHog (or delete via the PostHog API), and confirm the `discord_id` decision.

### WR-05: The analytics privacy scan has blind spots that let the same defect return

**File:** `utils/analytics/__tests__/no-names-in-analytics.test.ts:34-80, 150-175`
**Issue:** The scan is textual and only inspects arguments of a fixed callee list, so several routes to a leak pass:
- Aliased or optional receivers: `ph.capture(`, `posthog?.capture(`, `window.posthog.capture(`, `usePostHog()` results named otherwise. `CALLEE_PATTERN` needs the literal `posthog.` or `client.`.
- Unlisted sinks: `posthog.setPersonProperties`, `posthog.people.set`, `$set` payloads, and the server `identifyUser(userId, properties)` in `utils/analytics/server.ts` (exported, currently no callers, so a future caller with `{ email }` is not scanned).
- Shorthand name keys: `BARE_NAME_KEY` requires `name:`, so `trackEvent({ properties: { name } })` or `{ realm, name }` passes.
- Email is checked only for `identify`; `trackEvent({ properties: { email } })` passes.
- Properties built in a variable and passed by reference (acknowledged in the header, but `trackEvent({ event, properties: props })` is not even flagged as "opaque argument").
- `readBalanced` does not understand regex literals or nested template-literal `${}` containing backticks, so a quote character in either can desynchronise the scan and swallow or truncate a later call (the self-checks cover parentheses, strings and comments but not these).
**Fix:** Broaden the pattern to `\b\w+\??\.(capture|identify|register|group|setPersonProperties|set)\s*\(` restricted to files that import posthog or use `usePostHog`, add `identifyUser` to `IDENTIFY_CALLEES`, treat a bare `name` shorthand and any `email` key in any analytics call as a violation, and have the scan flag calls whose properties argument is a bare identifier so it must be reviewed. Add self-check cases for `posthog?.capture` and `{ name }`.

### WR-06: The typed-client guard stops at the route boundary, and two `as` casts hide the nullability it reports

**File:** `app/api/bot/score/route.ts:~144-153`, `lib/addon/member-ranked-items.ts:30,117`, `app/api/bot/_helpers.ts:59-62`, `utils/supabase/__tests__/typed-client-usage.test.ts:20-27, 55-58`
**Issue:**
- `bot/score` casts `recordsResult.data` to `AttendanceInput['records']` and the whole spread guild_settings row to `Partial<ScoringConfig>`. These are exactly the places where the typed client reports `attended: boolean | null` and nullable settings columns; the cast removes the signal and passes the entire settings row (extra columns included) into the engine. The comments explain the intent (preserve pre-typed behaviour), which is reasonable, but nothing records or tests how a null flag is treated by `computeAttendance`.
- The stated purpose of the typed client (catch the bad-table class of defect) does not reach the shared helpers both routes depend on: `fetchReceivedCounts` takes `SupabaseClient<any, any, any>` and casts its rows, and `resolveGuildFromDiscord` / `findInvalidCharacterIds` take the untyped client. A wrong column in those select strings still compiles.
- `typed-client-usage.test.ts` scans `route.ts` files only (not `_helpers.ts` or `lib/addon/*`) and the pattern looks for `createServiceRoleClient(` or its import specifier; a route using `createClient(...)` from supabase-js directly is not caught.
**Fix:** Type the helpers' client parameter as `TypedServiceClient` and drop the `as Array<...>` in `fetchReceivedCounts` (the typed select will infer the row). For `bot/score`, narrow explicitly (`records.map(r => ({ ...r, attended: r.attended ?? false, ... }))`) after confirming the engine's null handling with a test, or add a test that pins today's null behaviour. Extend the scan to `app/api/addon`, `app/api/bot` and `lib/addon` for any `.ts`, and add `createClient(` to the forbidden calls.

## Info

### IN-01: Raid summary prints "[null](url)" when an item has a wowhead id but no name

**File:** `lib/discord-raid-summary.ts:34-38`
**Issue:** `formatRaidSummaryLootLine` accepts `itemName: string | null`. With a `wowheadId` and a null name it interpolates the name directly, producing `[null](https://...)`. The non-link branch correctly falls back to `'Unknown Item'`.
**Fix:** Use `const name = itemName || 'Unknown Item'` in both branches.

### IN-02: Post-raid-summary ignores the expansion read error, so a failed read silently gives a Forever guild the classic link

**File:** `app/api/discord/post-raid-summary/route.ts:~116-124`
**Issue:** `const { data: expansion } = await ... .single()` discards `error`. If the read fails, `expansionName` stays null and every loot line links to `/classic/item=`, which is wrong for a Forever guild, with no log. `expansion?.name as string | undefined` is also a cast the typed select makes unnecessary.
**Fix:** Destructure `error`, `console.error` it (the announcement path in `lib/discord-loot-announcements.ts` already does), and drop the cast.

### IN-03: Bot silently falls back to the retail link when `item_url` fails the shape check

**File:** `discord-bot/interactions.js:78-93`
**Issue:** A server-sent `item_url` that does not match `WOWHEAD_ITEM_URL` (for example a future domain with a dot, or uppercase) is dropped without a log and replaced by the retail `/item=` link, which for a Forever guild sends officers to the wrong game version. Today's server output always matches, so this is a diagnosability gap only.
**Fix:** `console.warn('priority: ignoring item_url that failed the shape check')` in the fallback branch.

### IN-04: `readOrThrow` and `readRowsOrThrow` are duplicated verbatim in two routes, and one read still throws a message-less error

**File:** `app/api/addon/export-string/route.ts:36-47`, `app/api/addon/guild-data/route.ts:34-45`, `app/api/addon/export-string/route.ts:~172`
**Issue:** The two helpers are copy-pasted into both routes, and the active-memberships read in export-string still throws `'Failed to read guild memberships for the addon export'` without the PostgREST message while its sibling reads include it. The attendance grouping block is also duplicated.
**Fix:** Move the helpers next to `selectAllPagesOrThrow` in `utils/supabase/paginate.ts`, and use `readOrThrow('character_guild_memberships', await ...)` for the membership read.

### IN-05: New 500 branches in bulk DELETE and PATCH return the raw database error message to the client

**File:** `app/api/loot-history/bulk/route.ts:~505-507, 551-553, 671-673`
**Issue:** `NextResponse.json({ error: readError.message }, { status: 500 })` exposes PostgREST and Postgres error text to the browser. The existing delete and update branches do the same, but the new branches extend it, while the rest of the phase answers a generic `'Internal server error'`.
**Fix:** Log the message server-side and return `{ error: 'Internal server error' }`, matching the addon routes.

### IN-06: Per-submission N+1 read on the master-loot review page now fetches ids it only uses for analytics

**File:** `app/(app)/master-loot/_client.tsx:214-226`
**Issue:** Replacing the head count with a full select of `loot_item_id` for every submission in the list means the page transfers every item id for every submission just to fill one analytics event (and the item count). It is a correctness-neutral change, but it also means a failed item read shows "0 items" in the UI (`item_count ?? 0`) while the analytics report "unknown", so the two now disagree.
**Fix:** Keep the head count for the UI, and fetch the ids lazily inside the review handler for the single submission being reviewed.

---

_Reviewed: 2026-10-13T15:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
