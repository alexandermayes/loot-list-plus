---
phase: quick-261004-ue3
plan: 01
subsystem: api
tags: [discord-bot, premium, feature-gate, pricing-copy, vitest]

requires:
  - phase: quick-261004-jgk
    provides: "utils/feature-gate.ts guildHasPaidAccess and readGuildTier (slice 1, PR #387): one server-side Premium gate reading guilds.subscription_tier, failing closed on a read error"
provides:
  - "PaidFeature key 'discord_bot' (Premium only, no grandfathering)"
  - "app/api/bot/_helpers.ts requireBotLookupAccess: 403 { error: 'premium_required', guild_name, premium_url } for a guild without Premium, null otherwise"
  - "GET /api/bot/priority and GET /api/bot/score refuse a free guild right after guild resolution, before any guild data is read"
  - "Discord bot replies C-5 / C-5b for premium_required on /score and /priority (scoreReply extracted as a pure function)"
  - "Pricing, Premium tooltip, upgrade modal, compare page, Discord help article and Updates entry list Discord bot lookups under Premium"
affects: [discord-bot, billing, pricing, help-content, updates]

actuals:
  tokens: 46000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Bot route gate helper in the checkBotAuth style (null means go on, otherwise a NextResponse returned as is), calling the shared guildHasPaidAccess with a per-surface key"
    - "Bot reply builders as pure functions (priorityReply, scoreReply) so every route answer maps to one embed under unit test"

key-files:
  created:
    - app/api/bot/score/__tests__/route.test.ts
  modified:
    - discord-bot/interactions.js
    - discord-bot/interactions.test.mjs
    - utils/feature-gate.ts
    - utils/__tests__/feature-gate.test.ts
    - app/api/bot/_helpers.ts
    - app/api/bot/__tests__/helpers.test.ts
    - app/api/bot/priority/route.ts
    - app/api/bot/priority/__tests__/route.test.ts
    - app/api/bot/score/route.ts
    - app/pricing/page.tsx
    - app/components/PremiumItemTooltip.tsx
    - app/components/UpgradeModal.tsx
    - app/compare/page.tsx
    - lib/help-content.ts
    - lib/updates-data.ts
    - data/content-dates.json

key-decisions:
  - "The tier decides: active, trialing, past_due and comped guilds (subscription_tier 'pro') get lookups; immediate cutoff for free guilds because bot use was never recorded per guild (user, 2026-10-04)"
  - "Only /score and /priority are gated; /help, announcements, raid summaries, notifications and reactions stay free (user, 2026-10-04)"
  - "OD-1 to OD-7 resolved by the user on 2026-10-05 as recommended (table below)"
  - "COPY C-5, C-5b and M-1 to M-10 approved by the user on 2026-10-05 as drafted (M-7 was out of scope, slice 3)"

requirements-completed: [UE3-R1, UE3-R2, UE3-R3, UE3-R4, DELIVERY-R1]

coverage:
  - id: D1
    description: "/priority and /score answer 403 premium_required for a resolved guild without Premium, before any guild data read; a tier read error answers 500; a Premium guild is unchanged"
    requirement: UE3-R1
    verification:
      - kind: unit
        ref: "app/api/bot/priority/__tests__/route.test.ts#Premium required (discord_bot) (7 new); app/api/bot/score/__tests__/route.test.ts (9, new file); app/api/bot/__tests__/helpers.test.ts#requireBotLookupAccess (4 new); utils/__tests__/feature-gate.test.ts#guildHasPaidAccess discord_bot (4 new)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The bot turns premium_required into C-5 (guild name cleaned for Discord markdown) or C-5b, for both commands; every existing reply string is unchanged"
    requirement: UE3-R2
    verification:
      - kind: unit
        ref: "discord-bot/interactions.test.mjs (12 new; the 9 existing priorityReply tests unchanged)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pricing, Premium tooltip, upgrade modal, compare page, help article and Updates entry carry the signed-off copy; /pricing, /compare and /premium content dates bumped"
    requirement: UE3-R3
    verification:
      - kind: other
        ref: "grep -F for each signed-off string (plan Task 3 verify); full suite incl. app/__tests__/content-dates.test.ts"
        status: pass
    human_judgment: true
    rationale: "Copy checked by tests and grep, not viewed in a browser or in Discord"
  - id: D4
    description: "Bot change is the first commit, touches only discord-bot/, and has its own branch ref feat/bot-premium-reply; no later commit touches discord-bot/"
    requirement: UE3-R4
    verification:
      - kind: other
        ref: "git diff-tree on the first commit; git diff --name-only first..HEAD | grep discord-bot/ (empty); feat/bot-premium-reply == 7c11c0b2"
        status: pass
    human_judgment: false
  - id: D5
    description: "Full suite green, tsc and eslint clean, no em dash added, every commit has the trailer"
    requirement: DELIVERY-R1
    verification:
      - kind: other
        ref: "npx vitest run at f9542c5d: 207 files / 3637 tests passed, EXIT=0; npx tsc --noEmit exit 0; npx eslint --max-warnings 0 on the 15 changed source/test files exit 0"
        status: pass
    human_judgment: false

duration: 2 sessions
completed: 2026-10-05
status: complete
---

# Phase quick-261004-ue3: Discord bot lookups require a paid tier Summary

**Paid-tier slice 2 of the 261004-jgk split. The Discord bot's `/score` and `/priority` now answer only for guilds with LootList+ Premium. A free guild gets an orange embed that names the guild and links to the Premium page, and no guild data is read. `/help`, announcements, raid summaries and notifications stay free.**

## Execution note

The executor completed all four commits in its worktree, then the session ended before it ran the final regression, wrote the PR body drafts or this SUMMARY, and the scratchpad (worktree, baselines, `new-fails.sh`) was cleared with it. The orchestrator finished the delivery steps in a fresh session on 2026-10-05: a new detached worktree at `f9542c5d`, the full suite, tsc, eslint, the plan's delivery checks, both PR bodies and this SUMMARY. The original pre-change baseline file was lost; the comparison below uses the plan's verified facts and the per-file test counts at `origin/main` (`743ce74a`).

## What a free guild saw before and sees now

| Command | Before | Now |
|---|---|---|
| `/priority <item>` | Full ranking for every linked guild, whatever its tier | C-5: "Bot lookups are part of LootList+ Premium. An officer can upgrade **{guild}** at https://www.getlootlist.com/premium." |
| `/score <character>` | Full attendance score for every linked guild | C-5, same text |
| Either, guild name empty after cleaning | n/a | C-5b: "...An officer can upgrade your guild at https://www.getlootlist.com/premium." |
| Either, tier read fails | n/a | 500, so the bot's existing retry reply ("couldn't run that lookup" / "couldn't load that score") |
| Premium guild (pro: active, trialing, past_due, comped) | Full answer | Unchanged |
| `/help`, announcements, raid summaries, notifications | Free | Unchanged, free |

## Gate order (both routes)

auth (401, 503) -> parameters (400) -> guild resolution (404 `no_guild_linked`) -> **Premium (403 `premium_required`)** -> data. In `/priority` the gate runs before the `no_active_expansion` 404 and the `raid_tiers` read; in `/score` before the `character_guild_memberships` read. A denied request records reads on the `guilds` table only (asserted in both route test files).

403 body: `{ error: 'premium_required', guild_name, premium_url }`, where `premium_url` is `NEXT_PUBLIC_APP_URL` (trailing slashes removed) or `https://www.getlootlist.com`, plus `/premium`.

Manual check: `grep -rn "requireBotLookupAccess(" app/api` (excluding tests) shows exactly two call sites, `app/api/bot/priority/route.ts:88` and `app/api/bot/score/route.ts:45`, each directly after the `no_guild_linked` block.

## Commits (branch `feat/bot-lookups-paid-tier`, from `origin/main` `743ce74a`)

1. `7c11c0b2` feat(discord-bot): explain Premium in /score and /priority replies. **Bot commit; branch ref `feat/bot-premium-reply` points here.** Touches only `discord-bot/interactions.js` and `discord-bot/interactions.test.mjs`.
2. `007e876e` feat(bot): /priority lookups need LootList+ Premium (key, helper, /priority gate, /priority tests)
3. `270ca5fb` feat(bot): /score lookups need LootList+ Premium (/score gate, the route's first tests, key and helper unit tests)
4. `f9542c5d` feat(pricing): list Discord bot lookups under Premium, with an Updates entry

All four end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Test counts

| File | origin/main | HEAD |
|---|---|---|
| `discord-bot/interactions.test.mjs` | 9 | 21 |
| `app/api/bot/priority/__tests__/route.test.ts` | 32 | 39 |
| `app/api/bot/score/__tests__/route.test.ts` | (none) | 9 |
| `app/api/bot/__tests__/helpers.test.ts` | 8 | 12 |
| `utils/__tests__/feature-gate.test.ts` | 31 | 35 |

Full suite at `f9542c5d`: 207 test files / 3637 tests passed, 0 failed, `EXIT=0` (72.7s). `npx tsc --noEmit` exit 0. `npx eslint --max-warnings 0` on the 15 changed `.ts/.tsx/.js/.mjs` files exit 0.

## Open decisions (resolved by the user, 2026-10-05)

| ID | Question | Resolution |
|---|---|---|
| OD-1 | How the bot and app changes ship | Two PRs: bot first (redeployed on Railway), then the app PR |
| OD-2 | A Discord server linked to more than one guild | Check only the guild the bot resolves to |
| OD-3 | Updates entry (M-9) | In the app PR, dated the merge day |
| OD-4 | Reply visibility | Public reply, like every other bot reply |
| OD-5 | "(Premium)" in command descriptions | Command descriptions unchanged |
| OD-6 | Where the reply links | /premium |
| OD-7 | A fifth landing Premium card | No new landing card |

## COPY as shipped

All approved as drafted on 2026-10-05; none edited or rejected.

- C-5, C-5b: bot replies, verbatim as above.
- M-1 pricing free list: "Discord announcements and raid-tool workflows"
- M-2 pricing Premium list and M-10 upgrade modal: "Discord bot lookups with /score and /priority"
- M-3 pricing FAQ: "...Premium adds multi-team support, the officer activity feed, reserve runs, and Discord bot lookups."
- M-4 pricing meta description: "Run ranked loot lists, attendance, and transparent item priority free. Premium adds raid teams, reserve runs, and Discord bot lookups for $4.99/month."
- M-5 Premium tooltip: "+ Discord Bot Lookups" and "Equip: Answers /score and /priority in your Discord server."
- M-6 compare page: "LootList+ Premium is optional and adds multiple raid teams, reserve runs, the officer activity feed, and Discord bot lookups for $4.99 per month or $39 per year per guild."
- M-8 help article: "`/score` and `/priority` answer for guilds with LootList+ Premium, including guilds on a free trial. `/help` works for every guild."
- M-9 Updates entry, dated October 5, 2026: "Discord bot lookups join Premium" (category feature).
- Content dates: `/pricing`, `/compare`, `/premium` set to 2026-10-05.

Copy was checked by tests and grep, not in a browser or in Discord.

## Deploy order

1. Merge the bot PR #390 (`feat/bot-premium-reply`, one commit). It is inert alone: no route answers `premium_required` until the app PR ships.
2. Redeploy the bot on Railway (a manual step; the bot does not deploy on merge).
3. Rebase `feat/bot-lookups-paid-tier` on main (the identical bot commit drops out), then merge the app PR #391 (opened as a draft). Vercel deploys it; the post-update cron posts the M-9 entry to the LootList+ Discord updates channel within the hour.

Pre-merge check for step 3: if the app PR merges on a day after October 5, 2026, change the M-9 date and the three content dates to the merge day first, because the cron posts each Updates date only once.

Merging the app PR before the bot is redeployed would show free guilds the generic retry replies instead of C-5 until the redeploy.

## Follow-ups (not filed)

- FU-1: nothing records bot use per guild; a trackEvent on each lookup and each premium_required refusal would show demand and conversion.
- FU-2: officers cannot choose which guild a shared Discord server answers for (OD-2).
- FU-3 (from 261003-0rp): /score ignores the errors of its membership, team, raid_events and attendance reads, and reads raid_events without pagination. The new gate runs before those reads.
- FU-4: `discord-bot/lootlist-api.js` falls back to `https://lootlistplus.com` when `LOOTLIST_API_BASE_URL` is unset, the stale origin `lib/billing/trial-ending.ts` warns about.
- FU-5: slice 3 revisits the pricing raid-tool line, the tooltip, the compare sentence and the upgrade modal for addon and companion sync.

## Deviations from Plan

- The plan said to leave the OD Resolution column blank; the user resolved all seven before execution, so the table records the resolutions.
- Final verification, PR bodies and this SUMMARY were produced by the orchestrator in a later session (see Execution note); the code commits are the executor's, unchanged.

## User Setup Required

Redeploy the Discord bot on Railway after the bot PR merges and before the app PR merges. No migration, no environment variable change.

---
*Phase: quick-261004-ue3*
*Completed: 2026-10-05*
