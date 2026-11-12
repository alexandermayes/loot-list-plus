---
phase: 04-discovery-lists-and-score-split
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 63
files_reviewed_list:
  - app/(app)/expansions/[expansionId]/_client.tsx
  - app/(app)/guild-settings/components/GuildSettingsContent.tsx
  - app/(app)/guild-settings/components/SetYourFiveSendRow.tsx
  - app/(app)/loot-list/components/LootListContent.tsx
  - app/(app)/loot-list/components/NeedPicker.tsx
  - app/(app)/loot-list/components/NeedPickerRow.tsx
  - app/(app)/loot-list/components/SetYourFiveLinkEntry.tsx
  - app/(app)/loot-management/components/LootSettingsContent.tsx
  - app/(app)/loot-management/components/SettingsModal.tsx
  - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
  - app/(app)/loot-submissions/components/review-need-lines.ts
  - app/(app)/master-sheet/components/BossSection.tsx
  - app/(app)/master-sheet/components/ItemCandidateModal.tsx
  - app/(app)/master-sheet/components/MasterSheetContent.tsx
  - app/(app)/overview/components/DashboardContent.tsx
  - app/(app)/overview/components/SetYourFiveCard.tsx
  - app/(app)/overview/components/overview-score.ts
  - app/api/addon/export-string/route.ts
  - app/api/addon/guild-data/route.ts
  - app/api/discord/set-your-five/route.ts
  - app/api/guild-settings/route.ts
  - app/api/guilds/route.ts
  - app/api/loot-items/route.ts
  - app/api/loot-list/bootstrap/route.ts
  - app/api/loot-submissions/submit/route.ts
  - app/api/master-sheet/visibility/route.ts
  - app/api/prio-list/route.ts
  - app/api/raid-tiers/route.ts
  - app/components/CreateGuildModal.tsx
  - app/components/LootStylePicker.tsx
  - app/components/NeedLabel.tsx
  - app/components/ScoreBreakdownModal.tsx
  - app/components/ScoreComparisonModal.tsx
  - app/components/ScoreSplit.tsx
  - app/components/need-picker/BudgetLine.tsx
  - app/components/need-picker/NeedCostMarker.tsx
  - app/components/need-picker/NeedQuestionFlow.tsx
  - app/components/need-picker/NeedQuestionSheet.tsx
  - app/components/need-picker/need-slot-icons.ts
  - app/contexts/LootListContext.tsx
  - app/hooks/use-api.ts
  - components/ui/error-state.tsx
  - components/ui/modal.tsx
  - components/ui/segmented-control.tsx
  - components/ui/skeletons.tsx
  - domain/guild/loot-style-presets.ts
  - domain/loot/__fixtures__/class-specs.json
  - domain/loot/need-budget.ts
  - domain/loot/need-defaults.ts
  - domain/loot/need-eligibility.ts
  - domain/loot/need-list-rules.ts
  - domain/loot/need-picks.ts
  - domain/loot/need-questions.ts
  - domain/loot/set-your-five.ts
  - domain/scoring/engine.ts
  - domain/scoring/explain.ts
  - domain/scoring/index.ts
  - domain/types.ts
  - lib/database.types.ts
  - lib/loot/need-lines.ts
  - lib/loot/need-list-scope.ts
  - lib/updates-data.ts
  - proxy.ts
findings:
  critical: 1
  warning: 7
  info: 6
  total: 14
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 63
**Status:** issues_found

> **Fix status (2026-11-11):** CR-01, WR-01 and WR-02 were fixed before the Phase 4 PRs merged. WR-03 to WR-07 and IN-01 to IN-06 are fixed in quick task 261111-kgu (branch `fix/phase-4-review-warnings`, PR #511); see "Fixes applied" under each finding. WR-08 stays open as an owner decision (see "Not fixed" under it). The frontmatter status and counts are left as reviewed.

| Finding | Commit | Subject |
|---------|--------|---------|
| CR-01 | a4e8ef85 | fix(04-08): refuse item rows outside slots 1 and 2 and need rows outside the tier slot range at submit |
| CR-01 | ecdbe3e8 | fix(04-21): surface review rows the rank table cannot place |
| WR-01 | 727d2d45 | fix(04-08): enforce the need list shape at submit |
| WR-02 | 995eea62 | fix(04-18): validate the raid summary channel id before building the bot URL |
| WR-02 | 895a652d | fix(04-15): validate raid_summary_channel_id in the guild settings PUT |
| WR-03 | 57e442b8 | fix(04-18): bound every Discord call of the Set your 5 send with a deadline |
| WR-04 | a7ea36f9 | fix(04-18): reserve the Set your 5 cooldown before the channel post and fail closed |
| WR-05 | b076867c | fix(04-18): read Set your 5 member preferences in chunks of 100 ids |
| WR-06 | d723abc2 | fix(04-07): bound, check and de-duplicate item_ids in the master-sheet visibility route |
| WR-07 | 33892c71 | fix(04-13): count only unlocked phases for the Set your 5 card, send row and send |
| IN-01 | d9ef1e95 | fix(04-18): label the Set your 5 send row in the audit log |
| IN-02 | ab6c8d55 | fix(04-19): drop the placeholder note on the Discovery lists changelog date |
| IN-03 | 6eba6480 | fix(04-14): default a null decimal_places to 2 on the master sheet score views |
| IN-04 | d1e8aae1 | fix(04-18): check the bot token after the permission check in the Set your 5 send |
| IN-05 | b0329108 | fix(04-15): share one withoutLootStyle helper between the addon routes |
| IN-06 | 4d5e701a | fix(04-18): drop the double cast on the Set your 5 DM body |

## Summary

I reviewed the 63 listed files at standard depth. New files were read whole. The large files that predate the phase were read as changed hunks with surrounding context. I also read the callers and callees the diff depends on: `lib/discord.ts`, `utils/audit/log.ts`, `utils/server-roles.ts`, `utils/supabase/paginate.ts`, `lib/post-auth-redirect.ts`, `domain/loot/list-row-updates.ts`, `domain/loot/bracket-validation.ts`, `domain/loot/item-identity.ts` and the `20261111120000_need_lists.sql` migration.

The pure domain code is in good shape: budget, eligibility, tier slots, grouping and the standing/interest split are consistent with each other and with the picker. The proxy `next` change is safe because `isSafeNextPath` still guards it, and every OAuth entry point I found URL-encodes `next`. The addon routes drop `loot_style` correctly. The Discord route fails closed on its reads, logs only fixed stage and status values, and returns counts only. It has no PII in logs and no tainted format strings.

The main problem sits on the server trust boundary:

- **CR-01 (blocker):** The migration widened `loot_submission_items.slot` to 1..8 for every row. Nothing server-side limits item rows to slots 1 and 2 any more. The officer review modal silently drops item rows at slots 3 to 8, so a hand-built list can carry hidden rows into approval.
- **WR-01:** The submit route does not enforce the five-pick shape of a need list either.
- **Discord route:** It has an unvalidated channel id in a bot-authenticated URL, an unbounded rate-limit wait, a best-effort cooldown write and a URL-size risk in its member lookup.
- **Master-sheet visibility route:** It has no cap on `item_ids`.

Everything else is lower severity.

## Critical Issues

### CR-01: Item rows at slots 3 to 8 are accepted server-side and are invisible to officer review

**File:** `app/api/loot-submissions/submit/route.ts:107-237`, `app/(app)/loot-submissions/components/review-need-lines.ts:74-76`, `domain/loot/list-row-updates.ts:139`

**Issue:** The Phase 4 migration replaced `loot_submission_items_slot_check` (slot 1 or 2) with `loot_submission_items_slot_range_check` (slot 1 to 8) for every row, not only need rows. Its own header says `save_submission_items` "never checks the slot value, so the table check is the whole rule". That RPC is granted to `authenticated` and the browser calls it directly, so any raider can write item rows at slots 3 to 8. Nothing else bounds item slots:
- `validateBracketRules` only sums allocation points and item types per bracket. Rule 4 compares counts per rank for Reserved items only.
- Zero-cost items and the "No Bracket" zone, ranks 38 to 25 and below, have no per-rank cap at all.
- `validateItemCopyLimits` does not look at slot.
- The submit route never checks `row.slot` for item rows.

Two things make this worse. The Known-list rule "two items per rank" was enforced only by the DB check that this phase removed. The officer review modal then hides the evidence. `buildReviewRows` sends every non-need row (and any malformed need row) to `groupDetailRowsByRank`, which does `if (slot !== 1 && slot !== 2) continue`. Those rows never reach the review table. The `review-need-lines.ts` header says "no row is ever left out of a line", which is false for rows at slot 3 and above. An officer can approve a list whose extra rows they never saw. The master sheet reads the same rows by item id through the visibility route, so those items get the full interest score from the rank they sit on.

**Fix:** Enforce the slot rule in the submit route, which is the only server gate, and make the review modal surface anything it cannot place.

```ts
// submit/route.ts, after itemRows is built and before the bracket rules
const badItemSlot = itemRows.find(
  (row) => !isNeedRow(row.loot_item) && Number(row.slot) !== 1 && Number(row.slot) !== 2,
)
if (badItemSlot) {
  return NextResponse.json(
    { error: 'List violates bracket rules', violations: [{ bracket: 'List', rule: 'item_slot', detail: 'Items use slot 1 or 2.' }] },
    { status: 422 },
  )
}
// need rows: slot must be 1..MAX_NEED_TIER_SLOTS (import from need-picks)
```

In `buildReviewRows`, also return the rows `groupDetailRowsByRank` skipped, for example as an "Other rows" line, so nothing is dropped. Longer term, add a database-level rule that item rows keep slot <= 2, for example a trigger on `loot_submission_items` checking `loot_items.kind`. Do the same for need rows at ranks outside 46 to 50 (see WR-01).

**Fixes applied:**

- `a4e8ef85` (04-08): `app/api/loot-submissions/submit/route.ts` refuses, with 422 and a bracket-rule style violation, any non-need row whose slot is not 1 or 2 (`rule: 'item_slot'`) and any need row whose slot is outside 1..`MAX_NEED_TIER_SLOTS` (`rule: 'need_slot'`). The check runs after the rows are read and before the bracket rules, so nothing is written. It covers every live row, including rows of turned-off tiers, because no editor or picker save produces these slots. The `violations[].detail` lines are API-only copy, marked owner review pending. The need-reader inventory note for the route mentions the slot rule. Tests in `app/api/loot-submissions/submit/__tests__/route.test.ts` ("row slots (CR-01)"): an item row at slot 3 is refused before any write and before the prio read; the same in a turned-off tier; an ordinary Known list on slots 1 and 2 passes; need rows on slots 1 to 8 pass; a need row at slot 9 is refused; the 15-row Discovery list passes.
- `ecdbe3e8` (04-21): `buildReviewRows` returns `otherRows`, which holds every row that is not in a need line and sits outside slots 1 and 2. `itemRows` now holds slots 1 and 2 only. `LootSubmissionsContent.tsx` shows each other row at its rank under an "Other row" label (API-only copy, owner review pending), on desktop and mobile, with the existing remove and undo controls. The header comment no longer claims that no row is ever left out. Tests in `review-need-lines.test.ts` ("rows the rank table cannot place (CR-01)"): an item row at slot 3, a need row with no key at slot 4, a removed stray row, every row accounted for exactly once, and need rows at tier slots 6 to 8 staying in their line. The empty-list case now also expects `otherRows: []`.
- **Follow-up, not built (schema frozen this phase):** a database rule that keeps item rows at slot <= 2, for example a trigger on `loot_submission_items` that checks `loot_items.kind`. Until then the submit route is the gate and the review modal is the backstop.

## Warnings

### WR-01: A saved need list's shape is not enforced server-side (more than five picks, picks stacked at one rank, ranks outside 46 to 50)

**File:** `app/api/loot-submissions/submit/route.ts:244-270`, `domain/loot/need-list-rules.ts:33-43`, `domain/loot/need-budget.ts:36-65`

**Issue:** The server checks only the 10-point budget (counted once per distinct `(rank, need_key)`) and eligibility. The picker's own contract is exactly five picks at ranks 50 to 46, one key per rank, and `readNeedPositions` has a `consistent` flag for lists that "cannot have come from the picker". The submit route never uses it. A direct RPC save can therefore submit:
- ten distinct cost-1 needs, which fits the 10-point budget, at ranks 50 down to 41; or
- five distinct needs all at rank 50, so every one reads as "number 1 pick" on the score split.

`need-budget.ts` acknowledges the stacking case (T-04-03-01) but only prevents it from lowering the budget count, not from being submitted. Officers do review before a list counts (D-27), so this is a fairness and integrity gap rather than an auto-approval, but the rule is exactly the kind the doc comment says the server must refuse "with the same words" as the picker. Note too that rows in a tier with `is_guild_active = false` skip the check entirely (the GH #357 filter), which matters here because the picker deliberately carries those rows through unchanged.

**Fix:** Add a pure `checkNeedShape(rows)` to `need-list-rules.ts` and call it next to `checkNeedList`. It should require ranks in `NEED_PICK_RANKS`, at most `NEED_PICK_COUNT` distinct `(rank, need_key)` picks, one `need_key` per rank, and `slot <= MAX_NEED_TIER_SLOTS`. Return 422 with a stable code.

**Fixes applied:**

- `727d2d45` (04-08): `checkNeedShape(rows)` in `domain/loot/need-list-rules.ts` returns `{ ok: true }` or `{ ok: false, code: 'NEED_SHAPE_INVALID', message, details: { rule, picks, ranks } }`. The rules are `one_key_per_rank`, `pick_count` (more than `NEED_PICK_COUNT` distinct `(rank, need_key)` picks), `rank` (outside `NEED_PICK_RANKS`) and `slot` (outside 1..`MAX_NEED_TIER_SLOTS`). The same key once per tier slot at one rank is the fan-out and counts as one pick. A row with no key counts as a key of its own. The submit route runs it after the budget and eligibility checks, so those signed-off messages still answer first. It answers 422 with one plain sentence (API-only copy, owner review pending) before any write. The shape is judged over the active-tier rows, the same GH #357 set as the budget, because the picker carries an earlier save's rows in a turned-off tier through unchanged. The route comment documents this.
- Tests: `domain/loot/__tests__/need-list-rules.test.ts` ("checkNeedShape (WR-01)", 12 cases: the picker's 15 rows, gaps, a Ring at two ranks, slots 1 to 8 and an empty list pass; ten cost-1 needs, five keys at rank 50, a second key at rank 49, rank 45, slot 9 and a keyless row are refused). `app/api/loot-submissions/submit/__tests__/route.test.ts` ("need list shape (WR-01)"): ten cost-1 needs at ranks 50 to 41 are refused; a second key at rank 49 is refused; the 15-row picker list passes; a picker list beside carried-over turned-off-tier rows passes; budget answers before shape. Two existing cases changed. "Accepts five keys at one rank when they sum to 10" now expects `NEED_SHAPE_INVALID`. In the Ring copy-cap test, the passing two-Ring list moves its second pick from rank 40 to 49.
- Known edge: a tier turned back on whose stale rows disagree with the active picks at a rank is refused until the raider re-saves in the picker, which rewrites that tier's rows.

### WR-02: Officer-controlled `raid_summary_channel_id` is interpolated unvalidated into a bot-token URL

**File:** `app/api/discord/set-your-five/route.ts:107,186`, `app/api/guild-settings/route.ts:104` (allowlist), `lib/discord.ts:127`

**Issue:** `raid_summary_channel_id` is stored as free text. The PUT allowlist has no snowflake validation, and this phase touched that route without adding one. The new route reads it back and builds `https://discord.com/api/v10/channels/${channelId}/messages` with `Authorization: Bot <token>`. The host is fixed. But `fetch` normalizes dot segments, so a value such as `123/../../guilds/<id>/x?` re-targets the authenticated POST to other Discord API paths, with a fixed message body. The value can also be a real channel id in any other server the bot is in, so an officer of one guild can make the shared bot post and DM in another community. The set-your-five send is the first caller that also DMs every member, so it raises the impact.

**Fix:** Validate in the route before use, and ideally in the PUT too. This is the same guard any route interpolating the id should have.

```ts
const SNOWFLAKE = /^\d{17,20}$/
if (!channelId || !SNOWFLAKE.test(channelId)) {
  return NextResponse.json({ error: SET_YOUR_FIVE_NO_CHANNEL_ERROR }, { status: 400 })
}
```

**Fixes applied:**

- `995eea62` (04-18): `app/api/discord/set-your-five/route.ts` requires `raid_summary_channel_id` to match `/^\d{17,20}$/` before any Discord call. A missing or malformed id gets the existing 400 `SET_YOUR_FIVE_NO_CHANNEL_ERROR`. `lib/discord.ts` is unchanged: it has no helper that builds a URL from a stored channel id (`sendDirectMessage` uses the id Discord returns). Tests in `app/api/discord/set-your-five/__tests__/route.test.ts`: six malformed values (dot-segment path, letters, query string, too few digits, too many digits, leading space) are refused with no `discordFetch` or DM call.
- `895a652d` (04-15): `app/api/guild-settings/route.ts` accepts `raid_summary_channel_id` as null or an empty string (both stored as null) or a snowflake. Anything else gets 400 `raid_summary_channel_id must be a Discord channel id or null` (API-only copy, owner review pending) before any write. The guild settings page is the only writer. It saves an id from the Discord channel list or null, so that flow is unchanged. The Discord bot does not write the field. Tests in `app/api/guild-settings/__tests__/route.test.ts`: a snowflake is stored, null and empty string clear to null, eight malformed values (paths, letters, lengths, a leading space, a number, a boolean, an object) are refused with no write, and a non-officer still gets 403 first.
- Not changed: `app/api/discord/post-raid-summary/route.ts` and `lib/discord-loot-announcements.ts` also interpolate the stored id. Values written from now on pass the PUT guard, but a malformed value stored before this fix still reaches those two readers. Adding the same guard there, or a one-off check of stored rows, is a follow-up.
- **Follow-up, not built:** the cross-server case. A real channel id from another server the bot is in is still a valid snowflake. Closing it needs a check that the channel belongs to the guild's linked Discord server (`GET /channels/{id}` and compare `guild_id`) at save time or before sending.

### WR-03: The DM loop has no per-request deadline, so a Discord rate limit can run past `maxDuration` after the side effects have happened

**File:** `app/api/discord/set-your-five/route.ts:215-234`, `lib/discord.ts:31-37`

**Issue:** The 45 second budget is checked only before a DM starts. `discordFetch` sleeps for the full `Retry-After` header with no cap, up to three attempts per call and two calls per DM, and nothing passes an `AbortSignal`. A 429 with a long `Retry-After` on a DM started at second 44 can block past the 60 second `maxDuration`. The host then kills the function after the channel post and the audit row, and the officer sees a generic failure for a send that mostly succeeded.

**Fix:** Pass a deadline signal into the DM calls (`signal: AbortSignal.timeout(Math.max(0, startedAt + BUDGET - Date.now()))`) and cap `Retry-After` in `discordFetch` (for example `Math.min(waitMs, 5000)`), or skip the retry sleep when the remaining budget is smaller than the wait.

**Fixes applied:**

- `57e442b8` (04-18): `lib/discord.ts` `discordFetch` reads `init.signal`. Once it aborts, no further attempt is made, a Retry-After or 5xx retry wait ends at once, and the last response, if any, is handed back as it stands (a 429 stays a 429); an already aborted signal makes no request and throws its reason. Without a signal nothing changes, so the other callers keep honouring Retry-After in full. `sendDirectMessage` takes `{ signal }` and passes it to both calls. The route creates one `AbortController`, aborted 55 seconds after the start of the request (5 seconds under `maxDuration`, 10 after the no-new-DM budget) and cleared in `finally`, and passes its signal to the channel post and every DM. A DM that is not ok after the deadline counts as skipped and logs nothing; a channel post cut off by it answers the existing 502. Tests: `lib/__tests__/discord.test.ts` (new, 9 cases with fake timers) and four route cases (one signal on every call, a DM in flight at the deadline is skipped with no log, a failure before the deadline still logs, the post cut off answers 502).
- Not done: no cap on Retry-After itself. The deadline bounds the request; cutting a Retry-After short would only earn another 429.

### WR-04: The cooldown is written best-effort and after the post, so it fails open

**File:** `app/api/discord/set-your-five/route.ts:116-138,195-210`, `utils/audit/log.ts:79-95`

**Issue:** The cooldown reads `audit_logs` and fails closed on a read error. The write goes through `logAudit`, which swallows every insert error, and the route has no way to notice. If the insert fails, the next send is not throttled. The same holds if the function is cut off between the channel post (line 186) and the audit write (line 202). The comment on line 199 says the cooldown "holds even if the function is cut off mid-send", which is only true if the insert succeeded. The route comment already accepts the concurrent-officers race, but this is a separate fail-open path.

**Fix:** Insert the reservation row directly with the service client before posting, and check `error`. Delete the row (or return 5xx) if the channel post fails. That also narrows the concurrent-send window.

**Fixes applied:**

- `a7ea36f9` (04-18): the route inserts the `set_your_five_sends` audit row itself, before the channel post, with the insert's error checked: a failed write answers 500 with nothing sent. If the channel post fails the row is deleted again so the officer can retry at once; if that delete fails, the cooldown stands for an hour on a send that did not happen and a fixed line (`[set-your-five] cooldown release failed`, stage only) says so. `logAudit` is no longer imported by the route. The concurrent-officers race the route comment accepts is narrower (the reservation lands before the post) but not closed. Tests: the row is written before the post with fixed columns (`new_data: { posted: true }`, no recipients), a failed write sends nothing, a failed post releases the row by id, a failed release still answers 502 and logs once.

### WR-05: `PREFERENCE_CHUNK_SIZE = 500` risks overrunning the request URL

**File:** `app/api/discord/set-your-five/route.ts:31,163-171`

**Issue:** Each `.in('user_id', chunk)` puts every id in the PostgREST URL. 500 UUIDs is roughly 19 KB. The visibility route in this same phase uses 100 for exactly this reason (its WR-02 comment). A guild with a few hundred active members would get a gateway or PostgREST error from `selectAllPagesOrThrow`. The route returns 500 before anything is sent, so the feature breaks for larger guilds rather than degrading.

**Fix:** Use 100, matching `VISIBILITY_ID_CHUNK` and `CHUNK_SIZE` in `guild-award-refs.ts`. Share one constant.

**Fixes applied:**

- `b076867c` (04-18): `utils/supabase/paginate.ts` exports `IN_FILTER_CHUNK_SIZE = 100`, the one constant the finding asked for; the visibility route and `lib/loot/guild-award-refs.ts` use it in place of their own 100s and are otherwise unchanged. The Set your 5 preference lookup reads in chunks of that size. Test: 250 members produce three `user_preferences` reads of at most 100 ids that together carry every id.

### WR-06: The master-sheet visibility route has no bound or shape check on `item_ids`

**File:** `app/api/master-sheet/visibility/route.ts:181-185,54-66,292-305`

**Issue:** Chunking turned one failing query into an unbounded sequential loop of service-role queries: `item_ids.length / 100` pages, each paginated. Any active guild member can post an arbitrarily long array. Elements are not checked to be strings or UUIDs, so one bad element now yields a 500 (the old `paginatedSelect` swallowed errors and returned an empty result). Duplicate ids spread across chunks produce duplicate `rankings` and `items` rows, because `.in()` no longer de-duplicates across chunks.

**Fix:**

```ts
const ids = Array.isArray(item_ids) ? [...new Set(item_ids)] : null
if (!ids || ids.length > 2000 || !ids.every((id) => typeof id === 'string' && UUID.test(id))) {
  return NextResponse.json({ error: 'guild_id and item_ids[] are required' }, { status: 400 })
}
```

**Fixes applied:**

- `d723abc2` (04-07): after the shape check, at most 2000 ids per request (`item_ids holds more than 2000 ids`, 400), every element a UUID (`item_ids must hold item ids only`, 400) and the ids de-duplicated before the chunked reads on both the officer and the raider path. Both error strings are API-only copy, owner review pending. The bound sits above the largest request the sheet makes (a Forever phase: 435 need ids; a merged Known phase group: somewhat over 1000 items). Tests: 2001 ids answer 400 before any read, 2000 ids are served in 20 chunks, five malformed elements (number, null, object, non-UUID string, SQL fragment) answer 400 before any read, an id repeated across chunks is read once and returned once, the raider path is given the de-duplicated list.

### WR-07: The Overview "Set your 5" card counts Discovery tiers in locked phases

**File:** `app/(app)/overview/components/DashboardContent.tsx:695-700,722-731`, `app/(app)/overview/components/SetYourFiveCard.tsx:82-102`

**Issue:** The tier read is `.eq('is_guild_active', true)` across all phases, with no `phase <= current_phase` filter. `discoveryListStatus` counts a Discovery tier in a phase the raider cannot open yet. If a guild flips an upcoming phase to Discovery while the current one is Known, the raider sees "Set your 5" with no way to satisfy it, since no list can exist for a locked phase. The card then links to the 50-rank editor for the unlocked phase. The Send row in guild settings has the same gate, so the officer is offered a send that points raiders at the wrong screen.

**Fix:** Restrict `discoveryPhases` to phases at or below the expansion's `current_phase` (the Overview already has `currentExpansion`). Do the same in the `hasDiscoveryTier` check in `GuildSettingsContent.tsx`.

**Fixes applied:**

- `33892c71` (04-13, with the 04-18 send row and route): `discoveryListStatus` takes `currentPhase` and counts a Discovery tier only at or below it; a null `current_phase` reads as phase 1 and a tier without a phase never counts, both as the tier list endpoint does. The Overview reads `current_phase` with the `phase_deadlines` it already fetches and treats a failed read as a status error, so the card stays hidden rather than guessing (E3). `GuildSettingsContent` drops `includeAllPhases` from its `useRaidTiers` call, so the endpoint's linear unlock filter applies to the send row. The send route reads `expansions.current_phase` for the active expansion and adds `.lte('phase', current)` to its Discovery gate; a failed read answers 500 with nothing sent. Tests: five `discoveryListStatus` cases (locked phase not counted, counted once unlocked, a list in a locked phase ignored, null current phase, tier without a phase) and five route cases.

### WR-08: The default loot style flips six scoring flags that column defaults leave on, for every new guild

**File:** `domain/guild/loot-style-presets.ts:92-118`, `app/api/guilds/route.ts:225-240`, `app/components/CreateGuildModal.tsx:99-103`

**Issue:** `CreateGuildModal` always sends `loot_style: 'reward_attendance'` unless the officer changes it, and `POST /api/guilds` spreads that preset's knobs onto the settings insert. The preset sets `guild_rank_bonuses_enabled`, `raid_roles_overall_bonus_priority`, `single_raider_overall_bonus` and the three `*_single_item` flags to false. The baseline schema defaults them to true, and the previous insert left them at the default. The code comment in `CreateGuildModal.tsx` says leaving the picker alone "changes nothing", and research A8 (cited in the preset file) argues the flags have no effect with nothing configured. Scores are indeed identical at creation. But `single_raider_overall_bonus` also gates the per-raider bonus UI (`PriorityListTab` reads `!!s.single_raider_overall_bonus`, the raider-bonus lookup in `domain/scoring/modifiers.ts` returns nothing when it is off), and `ScoreBreakdownModal` describes that feature as "free for every guild". An officer who adds a bonus or a rank modifier later gets no effect until they find the toggle in Fine-tune. This applies to every new guild of every game, not only Forever. If the owner accepted this as D-17, record it as a known default change. Otherwise make the default preset leave those flags at their column defaults.

**Fix:** Either leave the six flags out of `REWARD_ATTENDANCE` when applied at creation, or note in the summary list ("Officer bonuses: off") that this is a change from today's new-guild behaviour.

**Not fixed (owner decision):** whether a new guild's six officer-bonus flags should follow the column defaults (on) or the Reward attendance preset (off) is a product default, not a code defect, and the preset's values were reviewed with the copy under D-17. Two ways to close it, for the owner to pick: (a) leave the six flags out of `REWARD_ATTENDANCE` when it is applied at creation (`app/api/guilds/route.ts`), so a new guild keeps today's defaults and the preset's "Officer bonuses: off" line changes; or (b) keep the preset as it is and record in `04-CONTEXT.md` under D-17 that every new guild now starts with officer bonuses off, with the `PriorityListTab` and `ScoreBreakdownModal` wording checked against it. Either way a one-line note in the "What this sets" list is user-facing copy for sign-off.

## Info

### IN-01: The audit log page renders the new send row with a raw table name

**File:** `app/api/discord/set-your-five/route.ts:29,202-210`, `app/(app)/audit-log/_client.tsx:425`

**Issue:** `set_your_five_sends` has no branch in the audit log summary, so officers see "<actor> created set your five sends". The `getCategory` switch also does not know it.

**Fix:** Add a branch with a readable label, for example "sent Set your 5 to the guild", and a category.

**Fixes applied:**

- `d9ef1e95` (04-18): `describeActivity` answers `sent Set your 5 to the guild` for `set_your_five_sends` rows (DRAFT copy, owner sign-off pending) and `getCategory` files them under Members. `describeActivity`, `getCategory` and the `AuditLog` type are exported for the test; three unit tests in `app/(app)/audit-log/__tests__/describe-activity.test.ts`. Not changed: the table filter dropdown (`TABLE_OPTIONS`) does not list the new table; adding it is another copy string.

### IN-02: The update entry's date is a placeholder with a "set before merge" note

**File:** `lib/updates-data.ts:16-19`

**Issue:** The comment says the date `November 10, 2026` is a placeholder to set to the ship date before merge. It also says the Discord updates cron posts the newest entry publicly after merge. If it merges unchanged, the post is dated wrongly.

**Fix:** Set the date at merge, or make it a checklist item in the PR description.

**Fixes applied:**

- `ab6c8d55` (04-19): the placeholder comment is replaced by one that says why the date stays. The entry merged on 2026-11-11 with the date `November 10, 2026`; the Discord updates cron keys its once-only post on the date slug (`updates:posted:november-10-2026`), so changing the date after the merge would post the entry a second time. If the owner wants the date corrected, check that key in Redis first; if the post has not happened yet the date can still change safely.

### IN-03: `decimalPlaces` can be null at runtime and bypasses the modal's default

**File:** `app/(app)/master-sheet/components/MasterSheetContent.tsx:2062`, `app/components/ScoreComparisonModal.tsx:240`, `app/components/ScoreSplit.tsx:42`

**Issue:** `guild_settings.decimal_places` is nullable in the schema. A default parameter (`= 2`) applies only to `undefined`, so `null` reaches `toFixed(null)` and scores round to integers. `explainScore` already guards with `??`.

**Fix:** Pass `guildSettings?.decimal_places ?? 2`, matching line 1314 of the same file.

**Fixes applied:**

- `6eba6480` (04-14): both call sites in `MasterSheetContent.tsx` (the raid mode view and the score comparison modal) pass `guildSettings?.decimal_places ?? 2`, as the Gargul export on the same page already did. `ItemCandidateModal` and `BossSection` already defaulted the same way.

### IN-04: The Discord route answers 503 before the permission check

**File:** `app/api/discord/set-your-five/route.ts:63-66`

**Issue:** Any signed-in user learns whether the bot token is configured. Minor, but the order is auth, input, token, permission rather than auth, input, permission, token.

**Fix:** Move the token check after `verifyPermission`.

**Fixes applied:**

- `d1e8aae1` (04-18): the order is auth, input, permission, then the token. Tests: a user without `manage_settings` gets 403 with the token missing; an officer gets 503 after the permission check.

### IN-05: `withoutLootStyle` is duplicated and is a denylist

**File:** `app/api/addon/export-string/route.ts:48-57`, `app/api/addon/guild-data/route.ts:46-55`

**Issue:** The helper is copied into both routes. A denylist also means any column added to `guild_settings` later reaches the addon payload by default, which is the same mechanism that made this phase need the helper.

**Fix:** Move it to `lib/` as one function, and consider an allowlist of the fields the Lua side reads.

**Fixes applied:**

- `b0329108` (04-15): `lib/addon/without-loot-style.ts` holds the one copy; both addon routes import it. Behaviour and key order are unchanged, so Known guilds' payloads stay byte-identical (D-30). Four unit tests. Not changed: it is still a denylist. An allowlist of the fields the Lua side reads stays a follow-up.

### IN-06: Double cast on the Discord message body

**File:** `app/api/discord/set-your-five/route.ts:221`

**Issue:** `message as unknown as Record<string, unknown>` hides a type mismatch. `SetYourFiveMessage` is a plain object type, so widening `sendDirectMessage`'s `body` parameter (or `message`'s declared type) removes the cast.

**Fix:** Change the `body` parameter in `lib/discord.ts` to `object` or `Record<string, unknown>` and drop the cast.

**Fixes applied:**

- `4d5e701a` (04-18): `sendDirectMessage`'s `body` is `object`, which every caller already satisfies, and the route passes its typed message without a cast.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
