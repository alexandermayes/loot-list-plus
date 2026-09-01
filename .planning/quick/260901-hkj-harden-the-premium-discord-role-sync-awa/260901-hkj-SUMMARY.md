---
phase: quick-260901-hkj
plan: 01
subsystem: payments
tags: [discord, stripe, webhook, cron, billing]

requires: []
provides:
  - Awaited, retried, guarded Discord Premium role sync on the Stripe webhook path
  - Pure diffPremiumRoleHolders desired-state function with full unit coverage
  - Daily /api/cron/sync-discord-premium reconciliation cron with backfill and comped-guild support
affects: [billing, discord-integration]

actuals:
  tokens: 5853
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Desired-state diff extracted as a pure, zero-import function so cron reconciliation logic is unit-testable without mocking Discord or Supabase"
    - "Multi-guild revoke guard: query the resolved purchaser's other pro guilds before any DELETE, so a role only comes off once the last pro guild does"
    - "Null-as-unknown-not-empty: a failed/forbidden member listing returns null current holders, which the diff treats as 'never revoke'"

key-files:
  created:
    - lib/billing/premium-role-diff.ts
    - lib/billing/__tests__/premium-role-diff.test.ts
    - lib/billing/__tests__/discord-premium.test.ts
    - app/api/cron/sync-discord-premium/route.ts
  modified:
    - lib/billing/discord-premium.ts
    - app/api/webhooks/stripe/route.ts
    - vercel.json

key-decisions:
  - "Env var reads moved from module scope into the function body in discord-premium.ts so the env-guard behavior is testable without module-registry gymnastics"
  - "toGrant in diffPremiumRoleHolders is always the full desired set, not a set difference, so the cron's normal run and its one-time backfill are the same code path"
  - "Sequential (not parallelized) grant/revoke loops in the cron, relying on discordFetch's built-in 429/5xx backoff, since holder counts are small"

patterns-established:
  - "Pure diff/decision functions with zero imports for anything that needs to be reachable from a unit test without standing up Supabase or a third-party API double"

requirements-completed: [QDP-01, QDP-02, QDP-03, QDP-04, QDP-05]

coverage:
  - id: D1
    description: "A completed Stripe checkout leaves the purchaser holding the community Premium role before the webhook responds, and a Discord failure never turns a successful DB sync into a 500"
    requirement: "QDP-01"
    verification:
      - kind: unit
        ref: "lib/billing/__tests__/discord-premium.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Discord REST calls from the billing path retry on 429 and 5xx via discordFetch instead of failing on the first blip"
    requirement: "QDP-02"
    verification:
      - kind: unit
        ref: "lib/billing/__tests__/discord-premium.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "A purchaser who holds premium on two guilds keeps the role when one subscription ends (multi-guild revoke guard)"
    requirement: "QDP-03"
    verification:
      - kind: unit
        ref: "lib/billing/__tests__/discord-premium.test.ts (skips the revoke entirely when the purchaser still owns another pro guild)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A daily cron grants the premium role to every current pro purchaser (including comped guilds), revokes from holders who no longer own any pro guild, degrades to grants-only when Server Members Intent is missing, and logs purchasers not found in the community server"
    requirement: "QDP-04"
    verification:
      - kind: unit
        ref: "lib/billing/__tests__/premium-role-diff.test.ts"
        status: pass
      - kind: manual_procedural
        ref: "PLAN.md Task 3 human-check: trigger the deployed cron once with the CRON_SECRET bearer token and confirm the JSON tally / Server Members Intent log line"
        status: unknown
    human_judgment: true
    rationale: "The cron's Discord-facing behavior (real member listing, real grant/revoke against the live community server) can only be confirmed after deploy; recorded as an open item in WINDOWS.md"
  - id: D5
    description: "diffPremiumRoleHolders is a pure, zero-import, zero-async function proving the diff logic is testable without mocking Discord or Supabase"
    requirement: "QDP-05"
    verification:
      - kind: unit
        ref: "lib/billing/__tests__/premium-role-diff.test.ts"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-09-01
status: complete
---

# Quick Task 260901-hkj: Harden the Premium Discord Role Sync Summary

**Webhook role grants/revokes are now awaited and retried, a multi-guild revoke guard stops a two-guild purchaser from losing the role early, and a new daily cron reconciles and backfills the community Premium role including comped guilds.**

## Performance

- **Duration:** 25 min
- **Started:** 2026-09-01T19:27Z (approx)
- **Completed:** 2026-09-01T19:52Z
- **Tasks:** 3 completed
- **Files modified:** 7 (4 created, 3 modified)

## Accomplishments

- `lib/billing/discord-premium.ts` now routes its Discord REST call through `discordFetch` (429/5xx retry), reads the three Discord env vars inside the function body so the no-op guard is testable, and refuses to revoke when the resolved purchaser still owns another pro guild (comped guilds count).
- `app/api/webhooks/stripe/route.ts` awaits `syncPremiumDiscordRole` inside its own try/catch, so a Discord failure logs and moves on instead of turning a successful DB sync into a 500 that Stripe would retry.
- New `lib/billing/premium-role-diff.ts`: a pure, zero-import `diffPremiumRoleHolders` function. `toGrant` is always the full desired set (idempotent PUT enables backfill-on-first-run); `toRevoke` is empty whenever the current holder list is null (unknown, not empty), so a failed or forbidden Discord listing can never mass-revoke.
- New `app/api/cron/sync-discord-premium/route.ts`: CRON_SECRET-authenticated daily reconciliation cron. Builds the desired set from `guilds.subscription_tier = 'pro'` (comped guilds included automatically), pages the guild member list for current holders, degrades to grants-only with an actionable log line on a 403 (missing Server Members Intent), and returns a JSON tally (granted/revoked/notInServer/failures/revokesSkipped).
- `vercel.json` now schedules the new cron at `30 6 * * *`, thirty minutes after `auto-promote-trials`.
- 15 new unit tests across `discord-premium.test.ts` (8) and `premium-role-diff.test.ts` (7); full `lib/billing` suite (20 tests) passes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden the live webhook role path end to end (D-01, D-02, D-03)** - `a3cbd08` (feat)
2. **Task 2: Pure desired-state diff function (D-04, D-05)** - `0f5a672` (feat)
3. **Task 3: Daily reconciliation cron (D-04)** - `1c13170` (feat)

**Plan metadata:** commit pending (orchestrator handles the docs commit)

## Deviations from Plan

None - plan executed as written. Task 1's failing-then-passing TDD cycle was written and verified as a single commit (test file + implementation together) rather than split into separate RED/GREEN commits; behavior and coverage match the plan's `<behavior>` block exactly, and all 15 new tests plus the 5 pre-existing `tier.test.ts` tests pass.

## Verification Results

1. `npx vitest run lib/billing` - 20/20 tests pass (3 test files: `tier.test.ts`, `discord-premium.test.ts`, `premium-role-diff.test.ts`).
2. `npx tsc --noEmit` - clean.
3. `npx eslint` on all touched/created files - no findings.
4. Two-guild regression proven by test: `discord-premium.test.ts` "skips the revoke entirely when the purchaser still owns another pro guild" issues zero HTTP calls.
5. Unknown-holder-state safety proven by test: `premium-role-diff.test.ts` "returns an empty toRevoke when current is null" and the cron's `listCurrentPremiumHolders` returns `null` on a 403 or any non-ok status.
6. `vercel.json` parses and carries exactly 4 cron entries, verified via `node -e` script per the plan's automated verify command.
7. No long dash (`—`) in any `console.*` line in any touched file. (Three pre-existing em dashes remain in unrelated, untouched comment lines in `app/api/webhooks/stripe/route.ts`; out of scope per the plan's scope boundary since they predate this task and are not console lines.)

## User Setup Required

- **Discord Developer Portal:** Enable **Server Members Intent** for the LootList+ bot application (Applications -> LootList+ bot -> Bot -> Privileged Gateway Intents -> Server Members Intent). Without it, the daily cron logs an actionable error, skips revokes, and still performs grants - the app functions, but reconciliation is grants-only until this is enabled.
- No new environment variables were introduced; the cron reuses the existing `DISCORD_BOT_TOKEN`, `DISCORD_COMMUNITY_GUILD_ID`, `DISCORD_PREMIUM_ROLE_ID`, and `CRON_SECRET`.

## Known Follow-ups (recorded in WINDOWS.md)

- **Unrun verify (open):** Task 3's `<human-check>` — triggering the deployed cron once with the CRON_SECRET bearer token and confirming the JSON tally / Server Members Intent log line — has not been run, since it requires a live deploy and the live Discord API, both excluded from this quick task's constraints. Recorded in `.planning/WINDOWS.md` as an open `unrun-verify` entry against `app/api/cron/sync-discord-premium/route.ts`.

## Threat Flags

None - all seven STRIDE threats in the plan's threat model (T-QDP-01 through T-QDP-07) were addressed by the implementation as specified (CRON_SECRET auth, service-role-only desired-set derivation, id/status-only logging, discordFetch retry/backoff, null-current revoke refusal, audit-log-reason on every call, accepted webhook latency). No new unaddressed surface was introduced.

## Self-Check: PASSED

- FOUND: lib/billing/discord-premium.ts
- FOUND: lib/billing/premium-role-diff.ts
- FOUND: lib/billing/__tests__/discord-premium.test.ts
- FOUND: lib/billing/__tests__/premium-role-diff.test.ts
- FOUND: app/api/cron/sync-discord-premium/route.ts
- FOUND: app/api/webhooks/stripe/route.ts (modified)
- FOUND: vercel.json (modified, 4 cron entries)
- FOUND commit a3cbd08
- FOUND commit 0f5a672
- FOUND commit 1c13170
