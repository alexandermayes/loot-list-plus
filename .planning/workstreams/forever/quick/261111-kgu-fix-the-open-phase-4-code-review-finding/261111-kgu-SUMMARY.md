---
phase: quick-261111-kgu
plan: 01
subsystem: discord, master-sheet, overview, addon
tags: [phase-4-review, set-your-five, discord, visibility-route, audit-log, loot-style, drop-desk-prep]
requires: [04-07, 04-13, 04-14, 04-15, 04-18, 04-19]
provides:
  - "discordFetch honours a deadline passed as init.signal; sendDirectMessage takes { signal } (lib/discord.ts)"
  - "IN_FILTER_CHUNK_SIZE = 100 in utils/supabase/paginate.ts, the one .in() chunk constant"
  - "Visibility route: item_ids bounded at 2000, UUID-checked, de-duplicated"
  - "discoveryListStatus and the send gate count Discovery tiers at or below current_phase only"
  - "lib/addon/without-loot-style.ts, one copy for both addon routes"
affects: [app/api/discord/set-your-five, app/api/master-sheet/visibility, app/(app)/overview, app/(app)/guild-settings, app/(app)/audit-log, app/api/addon, lib/discord.ts, lib/loot/guild-award-refs.ts]
tech-stack:
  added: []
  patterns: ["one AbortController per request, its signal on every outbound call, cleared in finally", "a reservation row inserted and checked before the side effect, released if the side effect fails, kept if the release fails", "one shared chunk constant for .in() filters"]
key-files:
  created:
    - lib/__tests__/discord.test.ts
    - lib/addon/without-loot-style.ts
    - lib/addon/__tests__/without-loot-style.test.ts
    - app/(app)/audit-log/__tests__/describe-activity.test.ts
  modified:
    - lib/discord.ts
    - app/api/discord/set-your-five/route.ts
    - app/api/discord/set-your-five/__tests__/route.test.ts
    - utils/supabase/paginate.ts
    - app/api/master-sheet/visibility/route.ts
    - app/api/master-sheet/visibility/__tests__/route.test.ts
    - lib/loot/guild-award-refs.ts
    - app/(app)/overview/components/SetYourFiveCard.tsx
    - app/(app)/overview/components/__tests__/SetYourFiveCard.test.tsx
    - app/(app)/overview/components/DashboardContent.tsx
    - app/(app)/guild-settings/components/GuildSettingsContent.tsx
    - app/(app)/audit-log/_client.tsx
    - app/(app)/master-sheet/components/MasterSheetContent.tsx
    - app/api/addon/export-string/route.ts
    - app/api/addon/guild-data/route.ts
    - lib/updates-data.ts
key-decisions:
  - "The Set your 5 deadline is 55 seconds from the start of the request: 5 under maxDuration, 10 after the no-new-DM budget. Retry-After is not capped; the signal bounds the wait, and cutting a Retry-After short would only earn another 429"
  - "The cooldown row is a reservation inserted before the channel post with its error checked; a failed post deletes it, a failed delete keeps the cooldown (fail closed) and logs a fixed line"
  - "item_ids: at most 2000, every element a UUID, de-duplicated; the two refusal strings are API-only copy"
  - "A null current_phase reads as phase 1 in the card, the send row and the send route, as the tier list endpoint does"
  - "WR-08 is an owner decision and is not changed; the changelog date (IN-02) stays because the Discord updates cron keys its once-only post on it"
status: complete
branch: fix/phase-4-review-warnings
estimate:
  tokens: 200000
  tasks: 7
actuals:
  tokens: 400000
  tasks: 7
  commits: 11
---

# Quick 261111-kgu Plan 01: Fix the open Phase 4 code-review findings Summary

Eleven of the twelve open findings in `04-REVIEW.md` are fixed on one branch from origin/main (b0aa333e), one commit per finding: the five warnings WR-03 to WR-07 and the info findings IN-01 to IN-06. WR-08 is a product default for the owner and is written up with both options. Code PR #511 (`fix/phase-4-review-warnings`), not merged: the owner merges with the admin bypass. This PLAN and SUMMARY, the STATE row and the extended fix-status note in `04-REVIEW.md` are on `gsd/quick-261111-kgu-fix-the-open-phase-4-code-review-finding` as a docs-only PR.

## How it ran

One desktop session started by the Phase 4 planning session. Two scratch git worktrees under the session scratchpad (code and docs), both cut from origin/main; nothing in the main checkout changed and no branch was switched there. `node_modules` is a symlink to the main checkout's. `GSD_WORKSTREAM=forever` on the `init.quick` call, run from the main checkout's `.claude/gsd-core` with the code worktree as cwd. No subagents: every finding was read, fixed and tested inline, with the route's existing recording fake Supabase client extended where a new operation (insert, delete, lte, the expansions table) was needed.

## Commits (base b0aa333e, branch fix/phase-4-review-warnings, PR #511)

| Finding | Commit | Subject |
|---------|--------|---------|
| WR-03 | 57e442b8 | fix(04-18): bound every Discord call of the Set your 5 send with a deadline |
| WR-04 | a7ea36f9 | fix(04-18): reserve the Set your 5 cooldown before the channel post and fail closed |
| WR-05 | b076867c | fix(04-18): read Set your 5 member preferences in chunks of 100 ids |
| IN-05 | b0329108 | fix(04-15): share one withoutLootStyle helper between the addon routes |
| WR-06 | d723abc2 | fix(04-07): bound, check and de-duplicate item_ids in the master-sheet visibility route |
| WR-07 | 33892c71 | fix(04-13): count only unlocked phases for the Set your 5 card, send row and send |
| IN-01 | d9ef1e95 | fix(04-18): label the Set your 5 send row in the audit log |
| IN-02 | ab6c8d55 | fix(04-19): drop the placeholder note on the Discovery lists changelog date |
| IN-03 | 6eba6480 | fix(04-14): default a null decimal_places to 2 on the master sheet score views |
| IN-04 | d1e8aae1 | fix(04-18): check the bot token after the permission check in the Set your 5 send |
| IN-06 | 4d5e701a | fix(04-18): drop the double cast on the Set your 5 DM body |

## What changed, per finding

### WR-03: every Discord call of the send carries a deadline

`discordFetch` reads `init.signal`. Once it aborts, no further attempt is made, a Retry-After or 5xx retry wait ends at once, and the last response, if there is one, is handed back as it stands (a 429 stays a 429); an already aborted signal makes no request and throws its reason. Without a signal nothing changes, so the officer notifications, raid summary, loot announcements and trial-ending DM keep honouring Retry-After in full. `sendDirectMessage` takes `{ signal }` and passes it to both of its calls.

The route creates one `AbortController` at the top, aborted by a timer at 55 seconds and cleared in `finally`, and passes its signal to the channel post and every DM. A DM that is not ok after the deadline counts as skipped and logs nothing; a channel post cut off by it answers the existing 502. Tests: `lib/__tests__/discord.test.ts` (new, 9 cases, fake timers and a stubbed fetch) and four route cases.

### WR-04: the cooldown is a reservation, written first and checked

The route inserts the `set_your_five_sends` audit row itself with the service client, before the channel post, and checks the insert's error: a failed write answers 500 with nothing sent. If the channel post fails the row is deleted again so the officer can retry at once; if that delete fails the cooldown stands for an hour on a send that did not happen and `[set-your-five] cooldown release failed` (stage only) is logged. `logAudit` is no longer imported by the route. The concurrent-officers race the route comment accepts is narrower but not closed. Five test cases changed or added.

### WR-05: one chunk constant

`utils/supabase/paginate.ts` exports `IN_FILTER_CHUNK_SIZE = 100`. The Set your 5 preference lookup, the visibility route (which had `VISIBILITY_ID_CHUNK`) and `lib/loot/guild-award-refs.ts` (which had `CHUNK_SIZE`) use it; the two existing callers are otherwise unchanged. Test: 250 members produce three `user_preferences` reads of at most 100 ids that together carry every id.

### WR-06: item_ids bounded, checked and de-duplicated

After the shape check: more than 2000 ids answers 400 (`item_ids holds more than 2000 ids`), an element that is not a UUID answers 400 (`item_ids must hold item ids only`), and the ids are de-duplicated before the chunked reads on both the officer and the raider path. Both strings are API-only copy, owner review pending. 2000 sits above the largest request the sheet makes (a Forever phase: 435 need ids; a merged Known phase group: somewhat over 1000 items). Nine test cases, including a repeated id read once and returned once.

### WR-07: locked phases do not count

`discoveryListStatus` takes `currentPhase` and counts a Discovery tier only at or below it; a null `current_phase` reads as phase 1 and a tier without a phase never counts, as the tier list endpoint does. The Overview reads `current_phase` with the `phase_deadlines` it already fetches and treats a failed read as a status error, so the card stays hidden rather than guessing (E3). `GuildSettingsContent` drops `includeAllPhases`, so the endpoint's linear unlock filter applies to the send row. The send route reads `expansions.current_phase` and adds `.lte('phase', current)` to its Discovery gate; a failed read answers 500 with nothing sent. Ten test cases.

### IN-01 to IN-06

- IN-01: `describeActivity` answers `sent Set your 5 to the guild` for `set_your_five_sends` rows and `getCategory` files them under Members. `describeActivity`, `getCategory` and `AuditLog` are exported for the test (three cases). The table filter dropdown does not list the new table; that is another copy string.
- IN-02: comment only. The date stays at November 10, 2026: the Discord updates cron keys its once-only post on the date slug (`updates:posted:november-10-2026`), so changing it after the merge would post the entry a second time. If the owner wants the date corrected, check that key first.
- IN-03: both master sheet call sites (raid mode view, score comparison modal) pass `decimal_places ?? 2`.
- IN-04: the order is auth, input, permission, then the bot token. Two tests.
- IN-05: `lib/addon/without-loot-style.ts` holds the one copy; both addon routes import it; four unit tests. Still a denylist.
- IN-06: `sendDirectMessage`'s `body` is `object`; the cast is gone.

## Not fixed

- **WR-08** (owner decision): whether a new guild's six officer-bonus flags follow the column defaults (on) or the Reward attendance preset (off) is a product default, and the preset's values were reviewed with the copy under D-17. Either (a) leave the six flags out of `REWARD_ATTENDANCE` when applied at creation so new guilds keep today's defaults, or (b) keep the preset and record under D-17 that every new guild starts with officer bonuses off, checking the `PriorityListTab` and `ScoreBreakdownModal` wording. Both need a copy change in the "What this sets" list, so the owner picks.
- **IN-05 allowlist**: the helper is still a denylist; an allowlist of the fields the Lua side reads stays a follow-up.
- Follow-ups already recorded in `04-REVIEW.md` before this task and untouched here: the CR-01 database rule for item slots, the WR-02 cross-server channel check and the two other readers of the stored channel id.

## DRAFT copy, owner sign-off pending

- Audit log summary for a send row: `sent Set your 5 to the guild` (IN-01, `app/(app)/audit-log/_client.tsx`).
- API-only refusals in the visibility route: `item_ids holds more than 2000 ids`, `item_ids must hold item ids only` (WR-06).

No em dashes in any new string.

## Gates (branch head 4d5e701a)

- `npm run lint`: 0 errors, 375 warnings, the same count as origin/main at b0aa333e (checked file by file for every touched file as well: no new warnings).
- `npm run typecheck`: clean.
- `npm test`: 324 files, 6515 tests, all passing in 56 s, no timeouts, no re-runs.

## Threats

- T-261111-01 (WR-03): the deadline is only as good as the signal reaching every outbound call; a future Discord call in the route without `signal: deadline.signal` is unbounded again. Mitigation: the route test asserts the same signal on the channel post and every DM.
- T-261111-02 (WR-04): two officers confirming within the same second still both pass the cooldown read and both post. Accepted, as before; the window is narrower.
- T-261111-03 (WR-06): the 2000 bound is a guess above today's largest request; a future expansion phase group past it would see 400s on the master sheet. Mitigation: the constant and its reasoning are at the top of the route.

## Next

- Owner: review PR #511 (DRAFT copy in IN-01, API-only strings in WR-06), decide WR-08, merge with the admin bypass; merge the docs PR after it.
- Then `/gsd-verify-work 4` (UAT) and Phase 5 (Drop Desk Core).
- The two scratch worktrees can be removed once the PRs merge: `git -C <repo-root> worktree remove <path>` for `.../scratchpad/wt-p4-fix` and `.../scratchpad/wt-p4-docs` under `$SCRATCHPAD`.
