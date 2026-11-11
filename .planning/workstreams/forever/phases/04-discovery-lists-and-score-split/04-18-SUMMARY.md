---
phase: 04-discovery-lists-and-score-split
plan: 18
subsystem: api
tags: [discord, next-route, react, vitest, rate-limit, audit-log, set-your-five]

requires:
  - phase: 04-discovery-lists-and-score-split
    provides: "04-17 list-mode control (an officer can put a Forever tier in Discovery), 04-07 proxy fix so /loot-list?guild=<uuid>&picker=1 survives sign-in"
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "raid_tiers.list_mode and is_guild_active, GET /api/raid-tiers selecting list_mode"
provides:
  - "domain/loot/set-your-five.ts: the one module for the Set your 5 copy, link builder, Discord message body, link parser and link character picker (the Overview card and deep link entry in 04-13 import it)"
  - "POST /api/discord/set-your-five: officer-only sender with a Discovery gate, a 60-minute per-guild cooldown read from audit_logs, bounded DMs and counts-only output"
  - "SetYourFiveSendRow in the Discord integration card of Guild Settings: confirm, Sending..., counts-only result, 60-second client disable"
affects: [04-13, 04-19, 04-11, 04-20]

actuals:
  tokens: 13995
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "A Next route file only exports handlers and route config, so shared route strings live in the domain module and the tunables stay unexported in the route"
    - "Bounded fan-out: a small worker pool pulling from a list, a start budget measured from the request start, and unreached recipients counted as skipped"
    - "Cooldown without a new table: the latest audit_logs row of a fixed table_name per guild, written right after the irreversible step"

key-files:
  created:
    - domain/loot/set-your-five.ts
    - domain/loot/__tests__/set-your-five.test.ts
    - app/api/discord/set-your-five/route.ts
    - app/api/discord/set-your-five/__tests__/route.test.ts
    - app/(app)/guild-settings/components/SetYourFiveSendRow.tsx
    - app/(app)/guild-settings/components/__tests__/SetYourFiveSendRow.test.tsx
  modified:
    - app/(app)/guild-settings/components/GuildSettingsContent.tsx
    - app/hooks/use-api.ts

key-decisions:
  - "Route error strings (not officer, no channel, no Discovery, cooldown, post failed) are exported from domain/loot/set-your-five.ts, not from the route file, because a Next route file may only export handlers and config; the send row reuses the post-failed sentence"
  - "The send row takes hasDiscoveryTier as a prop and renders nothing when it is false, so the D-23 visibility rule is testable without mounting the 1000-line settings page; the page computes it from useRaidTiers(activeExpansion, guild, includeAllPhases)"
  - "The send row shows only officers with manage_settings (the route's own permission) and never fetches tiers for anyone else"
  - "The audit row is written right after the channel post and before the DMs, so the cooldown holds even if the function is cut off mid-send"
  - "Route reasons for 400, 403 and 429 show as the route words them; every other failure shows the post-failed sentence"

patterns-established:
  - "Counts-only logging: the one DM failure log is console.error('[set-your-five] DM send failed', { stage, status }), and the handler's catch logs a fixed message with no error object"

requirements-completed: []

coverage:
  - id: D1
    description: "An officer's send posts one link-button message to the raid summary channel and DMs each active member with a Discord id, one DM per user, never the sender, answering { posted, sent, skipped }"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#[D-23] POST /api/discord/set-your-five tracer"
        status: pass
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#[DISC-11 ordering] who is counted"
        status: pass
    human_judgment: false
  - id: D2
    description: "The link is ${origin}/loot-list?guild=<id>&picker=1 with no character id or token; the message is plain content plus one style 5 link button, no embed, allowed_mentions parse empty, from fixed strings only"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/set-your-five.test.ts#[D-24] buildSetYourFiveUrl"
        status: pass
      - kind: unit
        ref: "domain/loot/__tests__/set-your-five.test.ts#[D-23] buildSetYourFiveMessage"
        status: pass
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#[T-04-18-03] counts only, nothing identifying"
        status: pass
    human_judgment: false
  - id: D3
    description: "The route refuses a non-officer (403), a guild with no guild-active Discovery tier (400), a missing channel (400) and a second send within 60 minutes (429 with retry_after_minutes), checked in that order before any Discord call; a failed channel post is 502 with no DMs and no audit row"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#[D-30] the 60-minute cooldown"
        status: pass
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#[D-23] the Discovery gate"
        status: pass
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#channel post failure"
        status: pass
    human_judgment: false
  - id: D4
    description: "DMs run 5 at a time and stop starting after 45 seconds; unreached recipients count as skipped; a 403 refusal is skipped silently and any other failure logs only a fixed message with stage and status; maxDuration is 60"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#[D-30] bounded DMs"
        status: pass
      - kind: unit
        ref: "app/api/discord/set-your-five/__tests__/route.test.ts#[D-30] DM outcomes"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Send Set your 5 row: hidden without a Discovery tier, disabled with 'Choose a raid summary channel first.' without a channel, confirm first, Sending..., counts-only role=status result and notification, 60-second disable, error copy keeps the button enabled"
    requirement: "DISC-11"
    verification:
      - kind: unit
        ref: "app/(app)/guild-settings/components/__tests__/SetYourFiveSendRow.test.tsx"
        status: pass
    human_judgment: false
  - id: D6
    description: "A real send against the live Discord API: the link button renders, the channel post and a DM arrive, a member with DMs closed is skipped, and the row looks right in the card at 320px"
    requirement: "DISC-11"
    verification: []
    human_judgment: true
    rationale: "Tests mock Discord (no live fetches by rule) and jsdom has no layout engine; only a send from a staging guild proves Discord accepts the payload and the row lays out in the card."

duration: 7min
completed: 2026-11-10
status: complete
---

# Phase 04 Plan 18: Set your 5 sender Summary

**An officer-only "Set your 5" send: one link-button post in the raid summary channel and a bounded DM to each linked member, gated to Discovery guilds, limited to once an hour from audit_logs, and counts-only end to end.**

## Performance

- **Duration:** about 7 min (first test commit 21:12, last task commit 21:17)
- **Tasks:** 3 (1 tracer, 2 TDD), each run test-first
- **Files:** 8 (6 created, 2 modified)
- **Commits:** 6 task commits

## Accomplishments

- **Shared module (D-14, D-23, D-24).** `domain/loot/set-your-five.ts` holds the three copy constants, `resolveAppOrigin`, `buildSetYourFiveUrl` (guild and picker parameters only), `buildSetYourFiveMessage` (plain content, one style 5 link button, `allowed_mentions: { parse: [] }`, no embed), `parseSetYourFiveParams` (UUID check, picker only for `1`) and `pickLinkCharacter` (main, then oldest, then lowest id). Client-safe, so 04-13's Overview card and deep link entry import it.
- **Route (D-23, D-30).** `POST /api/discord/set-your-five` runs auth (401), `guild_id` (400), `DISCORD_BOT_TOKEN` (503), `manage_settings` (403), then the Discovery gate (`guilds.active_expansion_id` to a guild-active `list_mode = 'discovery'` tier, else 400), the channel check (400), and the cooldown (latest `audit_logs` row with `table_name = 'set_your_five_sends'` for the guild, 429 with `retry_after_minutes`). It reads active memberships and `user_preferences` through `selectAllPagesOrThrow` (chunks of 500), excludes the sender, counts each user once, posts to the channel with `discordFetch`, writes the audit row, then DMs through `sendDirectMessage`.
- **Bounds.** Five workers, no new DM after 45 seconds from the request start, `maxDuration = 60`. A 403 is skipped silently; any other failure logs `'[set-your-five] DM send failed'` with `{ stage, status }`; the handler's own catch logs a fixed message with no error object. The response is `{ posted, sent, skipped }` only.
- **Send row.** `SetYourFiveSendRow` sits under "Announce loot awards" in the Discord integration card: outline sm "Send Set your 5", the UI-SPEC label and helper, the disabled helper without a channel, the default-variant confirm, "Sending...", the `role="status"` counts line plus a success notification, and a 60-second disable. `GuildSettingsContent` passes `hasChannel` from `raidSummaryChannelId` and `hasDiscoveryTier` from `useRaidTiers(..., includeAllPhases)`.

## Task Commits

1. **Task 1 (tracer) RED: failing module and route tests** - `3bb42752` (test)
2. **Task 1 (tracer) GREEN: module and officer send route** - `1f4ccf84` (feat)
3. **Task 2 RED: failing gate, cooldown and bounded DM tests** - `cc309145` (test)
4. **Task 2 GREEN: gates, cooldown, bounded DMs, quiet refusals** - `3b1705e7` (feat)
5. **Task 3 RED: failing send row tests** - `5e5edbcb` (test)
6. **Task 3 GREEN: send row in the Discord integration card** - `f28bef9a` (feat)

## Tracer gate

After the tracer GREEN commit I re-ran its `<verify>` (`npx vitest run domain/loot/__tests__/set-your-five.test.ts app/api/discord/set-your-five`, 21 of 21 pass) and its four acceptance greps (`maxDuration` 1, `parse: []` 2, `style: 5` 1, `manage_settings` 1), then continued into Task 2 without a checkpoint, as the orchestrator directed. RED before the implementation failed on the missing modules; Task 2's RED showed 11 of 28 failing for the missing gates, bounds and logging.

## Verification

- `npx vitest run domain/loot/__tests__/set-your-five.test.ts app/api/discord "app/(app)/guild-settings" utils/analytics lib/loot/__tests__/need-reader-inventory.test.ts`: 7 files, 123 tests, all pass
- `npm run typecheck`: no errors
- `npm run lint`: 0 errors, 375 warnings (the same count as after 04-17; none in the new files)
- Acceptance greps: `set_your_five_sends` in the route 2, `SET_YOUR_FIVE_DM_CONCURRENCY = 5` 1, `toBe(429)` in the route test 1, `SetYourFiveSendRow` in GuildSettingsContent 2, `Choose a raid summary channel first.` in the row 1
- Inventory: the route reads `raid_tiers`, `guild_settings`, `guilds`, `audit_logs`, `character_guild_memberships` and `user_preferences` only; no new reader of `loot_items`, `loot_submission_items` or `loot_history`, so `need-reader-inventory.test.ts` needed no entry and stays green
- Privacy: ids in fixtures are synthetic; no names, Discord ids or tokens are written to any file; the test asserts no Discord id, user id, channel id or token reaches the response or any console argument
- Known guild golden fixtures and Lua parity fixtures: untouched

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Route-file exports limited to handlers and config**
- **Found during:** Task 1
- **Issue:** The plan lists the error constants, `SET_YOUR_FIVE_DM_CONCURRENCY`, `SET_YOUR_FIVE_TIME_BUDGET_MS` and `SET_YOUR_FIVE_COOLDOWN_MINUTES` as route exports, but no other route in this repo exports anything but handlers and `maxDuration`, and Next's route type check rejects other exports at build.
- **Fix:** The five error strings are exported from `domain/loot/set-your-five.ts` (the send row reuses the post-failed sentence); the three tunables are unexported constants in the route, still matching the plan's greps. Tests assert the behaviour (5 in flight, 429 with 40 minutes), not the constants.
- **Files modified:** `domain/loot/set-your-five.ts`, `app/api/discord/set-your-five/route.ts`
- **Commit:** `1f4ccf84`, `3b1705e7`

**2. [Rule 3 - Blocking] `hasDiscoveryTier` prop and `list_mode` on the RaidTier type**
- **Found during:** Task 3
- **Issue:** The behaviour "hidden when hasDiscoveryTier is false" needs the visibility rule in something testable without mounting the full settings page, and `RaidTier` in `app/hooks/use-api.ts` had no `list_mode` field (the endpoint has returned it since 04-17).
- **Fix:** `SetYourFiveSendRow` takes a third prop, `hasDiscoveryTier`, and renders nothing without it; `RaidTier` gained an optional `list_mode`. `app/hooks/use-api.ts` is not in the plan's `files_modified`.
- **Files modified:** `app/(app)/guild-settings/components/SetYourFiveSendRow.tsx`, `app/hooks/use-api.ts`
- **Commit:** `f28bef9a`

**3. [Rule 1 - Bug] A label tied to the button replaced the button's accessible name**
- **Found during:** Task 3
- **Issue:** With `htmlFor` pointing at the button, its accessible name became "Ask raiders to set their 5" instead of "Send Set your 5".
- **Fix:** The `Label` has no `htmlFor`; the button points at the helper text with `aria-describedby`.
- **Files modified:** `app/(app)/guild-settings/components/SetYourFiveSendRow.tsx`
- **Commit:** `f28bef9a`

**Total deviations:** 3 auto-fixed (1 Rule 1, 2 Rule 3). **Impact:** none on scope or behaviour; one extra optional type field and one extra prop.

## Notes for the owner and the next plans

- **Copy is DRAFT for 04-19:** the module strings, the row's label, helper, confirm, result sentences and the route's error sentences. No em dashes.
- **Opt-out (open question carried from research).** No member opt-out ships (D-30); members who close DMs are skipped quietly. Ask before the first real send if you want one.
- **Timing edge.** The 45-second budget governs when a DM may start, not when it ends. `discordFetch` retries 429 and 5xx up to three times with the server's wait, so a DM started late can run past 60 seconds and the host would cut the function. The audit row is already written by then, so the cooldown still holds and unreached members simply were not messaged.
- **Cooldown race (accepted, low).** Two officers confirming in the same second can both pass; the confirm modal and the 60-second client disable make this unlikely, and the cost is one extra post.
- **Shipping.** PR 3, with 04-17, the picker (04-11, 04-20) and after 04-02 records the deploy. The link opens `/loot-list?guild=<id>&picker=1`; the deep link entry that reads it with `parseSetYourFiveParams` and `pickLinkCharacter` is 04-13, so do not send from a deploy that lacks it.
- **Backstop owed.** One send from a staging guild to see Discord accept the payload and the row at 320px (coverage D6).
- **Requirements:** DISC-11 is shared with 04-07, 04-13 and 04-19, none of which has a SUMMARY yet except 04-07, so `requirements.ready-ids` reports it not ready and it was not marked complete here.
- **Commit trailers.** The repo's commit-msg hook appends its own `Co-Authored-By` trailer; each commit also carries the session's attribution line, so each shows two.

## Authentication Gates

None.

## Known Stubs

None. Every value in the row comes from the page's tier and settings reads or the route's response.

## Threat Flags

None. The one new endpoint, its Discord calls and its audit row are all in the plan's threat model (T-04-18-01 to T-04-18-07), each mitigated and tested: permission before any read or send, cooldown plus confirm plus client disable plus Discovery gate, counts-only output with a no-id assertion on responses and console, link of guild and picker only, fixed-string message with empty `allowed_mentions`, an audit row per send, and a bounded loop with `maxDuration`.

## Self-Check: PASSED

- Created files exist: `domain/loot/set-your-five.ts`, `domain/loot/__tests__/set-your-five.test.ts`, `app/api/discord/set-your-five/route.ts`, `app/api/discord/set-your-five/__tests__/route.test.ts`, `app/(app)/guild-settings/components/SetYourFiveSendRow.tsx`, `app/(app)/guild-settings/components/__tests__/SetYourFiveSendRow.test.tsx`
- Commits exist on `work/forever-phase-04`: `3bb42752`, `1f4ccf84`, `cc309145`, `3b1705e7`, `5e5edbcb`, `f28bef9a`
- All task acceptance criteria and the plan-level verification re-run and pass (see Verification)
