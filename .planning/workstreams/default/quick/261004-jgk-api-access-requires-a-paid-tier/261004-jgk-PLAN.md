---
phase: quick-261004-jgk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - utils/feature-gate.ts
  - utils/__tests__/feature-gate.test.ts
  - app/api/reserve-runs/[id]/route.ts
  - app/api/reserve-runs/[id]/__tests__/route.test.ts
  - app/api/reserve-runs/[id]/awards/route.ts
  - app/api/reserve-runs/[id]/awards/__tests__/route.test.ts
  - app/api/reserve-runs/[id]/submissions/[subId]/route.ts
  - app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts
  - app/api/reserve-runs/join/[token]/route.ts
  - app/api/reserve-runs/join/[token]/__tests__/route.test.ts
  - app/api/reserve-runs/route.ts
  - app/api/reserve-runs/__tests__/route.test.ts
  - app/(app)/reserve/_client.tsx
autonomous: true
requirements:
  - JGK-R1
  - JGK-R2
  - JGK-R3
  - JGK-R4
  - JGK-R5
  - DELIVERY-R1

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 190000
  raw_tokens: 190000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-01 (JGK-R1, OD-2): guildHasPaidAccess(supabase, guildId, feature) in utils/feature-gate.ts is the one server-side Premium gate. It reads guilds.subscription_tier with the service client and answers true for 'pro' (Stripe active, trialing and past_due, and comped guilds). For 'reserve_runs' a free guild with a reserve run created before 2026-08-27 also answers true (the existing grandfathering). 'guild_api' has no exception. A read error throws. No client flag, cookie or request field is consulted."
    - "D-01: requireReserveAccess keeps its signature and its existing 403 answer (C-1, code premium_required), but its reads now throw on a read error, so create and duplicate answer 500 'Internal server error' instead of telling a paying guild to upgrade."
    - "D-02, D-03 (JGK-R2, OD-3 B): PATCH /api/reserve-runs/[id], POST and DELETE /api/reserve-runs/[id]/awards and PATCH and DELETE /api/reserve-runs/[id]/submissions/[subId] answer 403 { error: C-2, code: 'premium_required' } with no write and no audit row when the run's owner has no reserve access (the run's guild, or for a run with no guild every active guild of its creator, has neither Premium nor reserve grandfathering). This holds for every kind of manager: officer with Manage reserves, creator, and leader link. Premium and grandfathered guilds see no change."
    - "D-04 (JGK-R2, OD-3 B): POST /api/reserve-runs/join/[token] answers 403 { error: C-3, code: 'premium_required' } with no insert and no update for such a run; its validation 400s and the 404 for an unknown token come first, unchanged."
    - "D-05 (OD-3 B, OD-4): reads stay open to the callers allowed today: GET /api/reserve-runs, GET /api/reserve-runs/[id], GET /api/reserve-runs/[id]/audit, GET /api/reserve-runs/join/[token], /api/reserve-runs/items and /api/reserve-runs/raid-tiers. DELETE /api/reserve-runs/[id] stays open to managers, so a guild can always remove its runs."
    - "D-06 (JGK-R3, OD-5 A): GET /api/reserve-runs also returns reserve_access (true, false, or null when the gate read fails, with the runs still returned). The Reserve page shows the C-4 notice and hides both Create run buttons only when reserve_access is false."
    - "D-08 (JGK-R4, OD-8): 'guild_api' is a PaidFeature with unit tests (Premium only, no grandfather read). The GH #271 requirement is recorded in its doc comment, the SUMMARY and the PR body draft. No #271 endpoint is built."
    - "D-10 (DELIVERY-R1): the full vitest run has no new FAIL line against SP/baseline-jgk-vitest.txt (sh SP/new-fails.sh exits 0); npx tsc --noEmit exits 0; eslint on the changed files adds no warning (app/(app)/reserve/_client.tsx keeps its 1 baseline warning); no em dash in added lines, commit messages or SP/pr-body-jgk.md; every commit after 9f239c40 carries the trailer; git diff --name-only origin/main...HEAD lists exactly files_modified; nothing pushed."
  artifacts:
    - path: "utils/feature-gate.ts"
      provides: "PaidFeature, readGuildTier, guildHasPaidAccess, userHasReserveAccess, requireReserveRunPremium; requireReserveAccess on the strict reads"
      contains: "guildHasPaidAccess"
    - path: "utils/__tests__/feature-gate.test.ts"
      provides: "Unit tests for the shared gate against a recording fake (tier, trial and comped as pro, grandfathering, guild_api, read errors, run owner rule)"
      contains: "requireReserveRunPremium"
    - path: "app/api/reserve-runs/[id]/route.ts"
      provides: "PATCH calls requireReserveRunPremium after the manager check; GET and DELETE stay open"
      contains: "requireReserveRunPremium"
    - path: "app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts"
      provides: "First tests for the sign-up edit route: allowed, refused by access, refused by Premium"
      contains: "premium_required"
    - path: "app/api/reserve-runs/join/[token]/route.ts"
      provides: "Guest sign-up refused with C-3 for a run whose owner has no reserve access"
      contains: "requireReserveRunPremium"
    - path: "app/(app)/reserve/_client.tsx"
      provides: "C-4 notice and hidden Create run buttons when reserve_access is false"
      contains: "reserve_access"
    - path: "/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-jgk.md"
      provides: "Neutral PR body draft with the split, open decisions and copy"
  key_links:
    - from: "PATCH run, awards POST and DELETE, sign-ups PATCH and DELETE"
      to: "requireReserveRunPremium in utils/feature-gate.ts"
      via: "called with (serviceSupabase, access.run, 'manager') right after verifyReserveRunAccess allows the caller; access.run already carries guild_id and created_by (utils/reserve-access.ts line 167)"
      pattern: "requireReserveRunPremium\\(serviceSupabase, (access\\.)?run, 'manager'\\)"
    - from: "POST /api/reserve-runs/join/[token]"
      to: "requireReserveRunPremium(serviceSupabase, run, 'guest')"
      via: "the join POST run select gains created_by"
      pattern: "requireReserveRunPremium\\(serviceSupabase, run, 'guest'\\)"
    - from: "requireReserveAccess, requireReserveRunPremium, GET /api/reserve-runs reserve_access"
      to: "guildHasPaidAccess and readGuildTier (guilds.subscription_tier)"
      via: "userHasReserveAccess"
      pattern: "guildHasPaidAccess\\("
    - from: "Reserve page (app/(app)/reserve/_client.tsx)"
      to: "GET /api/reserve-runs reserve_access"
      via: "loadRuns stores data.reserve_access; the notice renders only when it is false"
      pattern: "reserve_access === false"
    - from: "Run page and join page toasts (app/(app)/reserve/runs/[id]/_client.tsx line 306, app/reserve/join/[token]/page.tsx lines 636, 773, 808)"
      to: "C-2 and C-3 error strings"
      via: "both pages already show data.error from these routes; no page change needed"
      pattern: "data.error"
---

<objective>
API access is a paid feature (user decision, 2026-10-04). This quick task investigates every API surface in scope, proposes a three-slice split, and builds the first slice: ONE shared server-side Premium gate in utils/feature-gate.ts, enforced on every reserve-run write route, plus a Reserve page notice for guilds without reserve access. The gate reads guilds.subscription_tier, the field every other Premium check already reads; it never trusts a client flag.

Purpose: today only creating and copying a run check Premium (app/api/reserve-runs/route.ts lines 144-146, app/api/reserve-runs/[id]/duplicate/route.ts lines 66-68). Every other reserve route works for any guild forever. A guild whose trial or subscription lapsed can keep reusing an old run: PATCH unlocks it, re-dates it and edits its hard reserves (app/api/reserve-runs/[id]/route.ts lines 196-243), guests keep signing up, and awards keep being logged. The same gate is what the Discord bot (slice 2), the addon and companion (slice 3) and the future guild API (GH #271) will call.

Output: three local commits in WT with tests, the full regression run, a neutral PR body draft at SP/pr-body-jgk.md and the SUMMARY in MAIN. No migration, no push, no PR, no GitHub issue.

## Proposed split (the whole request does not fit one quick task)

| Slice | Scope | Paths | Why separate |
|---|---|---|---|
| 1 (THIS PLAN) | Shared gate in utils/feature-gate.ts; reserve-run server enforcement; Reserve page notice; 'guild_api' key defined for #271 | 13 files, below | Reserve runs are already sold as Premium (app/pricing/page.tsx line 31), so no marketing copy changes; the gate gets proven on one surface first |
| 2 (next quick task) | Discord bot lookups /score and /priority | app/api/bot/score/route.ts (gate after resolveGuildFromDiscord, lines 37-39), app/api/bot/priority/route.ts (lines 80-82), a new 'discord_bot' key, discord-bot/interactions.js reply C-5 for both commands, tests (priority tests exist, score has none), help and pricing copy M-1 to M-4 and M-8 | The bot is a separate Railway deploy; an un-redeployed bot shows "LootList+ couldn't run that lookup. Try again in a sec." (discord-bot/interactions.js line 92) for any new error, so the bot redeploy must ship first. Rollout per OD-1. |
| 3 (after slice 2) | Addon export and import, companion sync and companion login | One choke point for four routes: authorizeAddonGuild (lib/addon/sync-tokens.ts lines 128-145) used by attendance, export-string, guild-data and loot-award; plus import-string (verifyOfficerPermissions on the payload guild, route.ts line 141), sync-token POST, the companion consent (app/api/addon/auth/route.ts POST, line 93) and code exchange (app/api/addon/auth/token/route.ts line 56); a new 'addon_sync' key with the OD-1 rollout rule; copy C-6 to C-8 and M-5 to M-7 | Ten handlers, a desktop app that shows server error strings verbatim (companion/src/main/api-client.ts lines 81-84 and 100-103), and a rollout rule (OD-1) that needs its own usage reads |
| GH #271 | Read-only guild loot history API | Not built here. Requirement recorded: every request resolves the API credential's guild on the server and calls guildHasPaidAccess(supabase, guildId, 'guild_api') before any read; Premium only (trials and comped count per OD-2), no grandfathering because no guild has used it | Separate feature task |

## Requirements (quick task)

- JGK-R1: one shared server-side Premium gate, reading the existing subscription field, failing closed with 500 on a read error (D-01, D-09).
- JGK-R2: every reserve-run write route enforces the gate on the server for every kind of caller (D-02, D-03, D-04), per OD-3.
- JGK-R3: a guild without reserve access is told why on the Reserve page, from a server-computed flag (D-06), per OD-5.
- JGK-R4: the gate for GH #271 is defined and the requirement recorded (D-08).
- JGK-R5: investigation with evidence, split, open decisions and copy recorded in the SUMMARY and the PR body draft (Task 3).
- DELIVERY-R1: baseline and final regression, tsc, eslint, neutral wording, local commits with the trailer, PR body draft (D-10).

## Decisions (locked unless an OD below changes them)

- D-01 (shared gate, utils/feature-gate.ts; JGK-R1, OD-2). Keep checkSubscriptionTier and requirePro byte-for-byte (raid teams and audit log use them; their tests assert a read error reads as free; see FU-1). Add, with JSDoc on each:
  - Rewrite the file header: server-side Premium gating; guilds.subscription_tier is the only entitlement source (kept in sync from Stripe by lib/billing/sync.ts; comped guilds are set to pro by hand); routes never gate on a client flag; usage examples for requireReserveAccess, requireReserveRunPremium and guildHasPaidAccess.
  - export type PaidFeature = 'reserve_runs' | 'guild_api'. Its JSDoc says: 'reserve_runs' keeps the pre-2026-08-27 grandfathering; 'guild_api' is the read-only loot history API for guilds (GH #271), which must call guildHasPaidAccess with this key on every request, Premium only with no grandfathering; Discord bot lookups and addon sync get their own keys when they move to Premium.
  - readGuildTier(supabase, guildId): Promise of 'pro' or 'free'. guilds select subscription_tier eq id, maybeSingle. A read error throws new Error with a constant prefix plus error.message (for example "readGuildTier: guild read failed: " + message). No row reads as 'free'; anything other than 'pro' reads as 'free'.
  - guildHasPaidAccess(supabase, guildId, feature: PaidFeature): Promise of boolean. readGuildTier 'pro' returns true with no other read. Otherwise, for 'reserve_runs' only, reserve_runs select id eq guild_id lt created_at RESERVE_GRANDFATHER_CUTOFF limit 1 (the existing read, keep the constant and its comment), throwing on a read error; true when a row exists. Every other case returns false.
  - userHasReserveAccess(supabase, userId, guildId?: string | null): Promise of boolean. With a guildId: guildHasPaidAccess(guildId, 'reserve_runs'). Without: characters select id eq user_id, then character_guild_memberships select guild_id in character_id eq is_active true (the existing personal-run path), each throwing on a read error; deduplicate guild ids; true when any guildHasPaidAccess(gid, 'reserve_runs') is true; false with no characters or no active membership.
  - requireReserveAccess: same signature, same denied body and status (403 { error: C-1, code: 'premium_required' }, text unchanged); now returns allowed when userHasReserveAccess(supabase, userId, guildId) is true. Remove the private guildHasReserveAccess (its logic now lives in guildHasPaidAccess).
  - requireReserveRunPremium(supabase, run: { guild_id: string | null; created_by: string }, audience: 'manager' | 'guest'): Promise of { allowed: true } or { allowed: false; error: NextResponse }. Allowed when userHasReserveAccess(supabase, run.created_by, run.guild_id) is true. The run's owner decides, never the caller: a run with no guild qualifies through its creator's active guilds, the same rule its creator met at create time. Denied: 403 { error: C-2 for 'manager' or C-3 for 'guest', code: 'premium_required' }.
  - OD-2 as recommended: no status other than the tier is read, so trials, past_due and comped guilds count. If the user resolves OD-2 differently, stop and return to planning (it needs a second entitlement read from guild_subscriptions).

- D-02 (tracer, PATCH /api/reserve-runs/[id]; OD-3 B): directly after the existing verifyReserveRunAccess block (route.ts lines 174-184) and before any body handling, call requireReserveRunPremium(serviceSupabase, run, 'manager') on the run that block returns; on denial return its error. No update, no trackEvent, no audit row. Replace the docstring's "Officer-only." with "Run managers only (leader link, the creator while an active member of the run's guild, officers with Manage reserves). The run's guild needs Premium or reserve grandfathering." GET and DELETE code are unchanged; DELETE's docstring "Officer-only." becomes "Run managers only. Does not need Premium, so a guild can always remove its runs."

- D-03 (other manager writes; OD-3 B): the same call, the same placement (right after the access check, before any other read or write), audience 'manager', in POST and DELETE of app/api/reserve-runs/[id]/awards/route.ts (lines 34-44 and 158-167) and PATCH and DELETE of app/api/reserve-runs/[id]/submissions/[subId]/route.ts (lines 39-48 and 116-125). Where the access condition reads only `!access.allowed`, widen it to `!access.allowed || !access.run` with the same status mapping, so access.run is non-null. Fix each "Officer-only" docstring to "Run managers only; the run's guild needs Premium or reserve grandfathering."

- D-04 (guest sign-up, POST /api/reserve-runs/join/[token]; OD-3 B): add created_by to the run select at line 290. After the existing 404 for an unknown token (line ~293) and before the status check (line 298), call requireReserveRunPremium(serviceSupabase, run, 'guest'); on denial return its error with no insert or update. Validation 400s stay first. GET is unchanged (D-05). Leader-link actions on the join page call the D-02 and D-03 routes, so they get C-2.

- D-05 (stays open, from the audit below; OD-3 B, OD-4): GET list, GET run, GET audit, GET join, DELETE run, items and raid-tiers get no Premium call. The link preview (app/reserve/join/[token]/layout.tsx and opengraph-image.tsx) is unchanged. Create and duplicate keep their call order from 261004-29l (membership, then requireReserveAccess) and need no route change: D-01 changes requireReserveAccess underneath them.

- D-06 (Reserve page, OD-5 A): in GET /api/reserve-runs, after the membership check and the reserve_runs read, compute reserve_access with guildHasPaidAccess(serviceSupabase, guildId, 'reserve_runs') inside its own try/catch: true or false as returned; on a thrown read error, console.error with a constant first argument ("Reserve runs GET: reserve access read failed:") and the error second, and reserve_access null. The response becomes { success: true, runs, reserve_access }; runs are returned in every case. In app/(app)/reserve/_client.tsx: keep a reserveAccess state (boolean or null, initial null) set from data.reserve_access in loadRuns. When reserveAccess === false: render the C-4 notice above the filter tabs using Alert, AlertTitle and AlertDescription from components/ui/alert (variant info) with a Button (variant outline, size sm, asChild) wrapping a next/link Link to /premium with the C-4 button text; hide the header Create run button; and when there are no runs, render nothing in place of the EmptyState (the notice explains the page). Everything else on the page is unchanged. Add no eslint warning (the file has 1 at baseline, the img element at line 169).

- D-07 (tests): route tests start with "// @vitest-environment node" plus the two explanatory comment lines used in app/api/reserve-runs/[id]/__tests__/route.test.ts. Reuse each file's recording fake and extend it where a case needs it (a guilds table; an lt filter that compares strings). Fixture runs used for denial cases must have created_at on or after 2026-08-27 (the [id] fixture uses 2026-10-01), otherwise the guild is grandfathered and the case proves nothing. Unit-test the gate against a recording fake with real reads, not mocks. Route files that already mock everything around them (awards) mock '@/utils/feature-gate' and assert the call arguments plus the pass-through of a denial.

- D-08 (GH #271; OD-8): 'guild_api' ships in PaidFeature with unit tests; nothing calls it yet. The SUMMARY and PR body state the requirement: the #271 API resolves the credential's guild on the server and calls guildHasPaidAccess(supabase, guildId, 'guild_api') before any read; Premium only; no grandfathering. Do not file an issue.

- D-09 (fail closed and errors): every gate read throws on error; each route that reaches the gate already wraps its body in try/catch and answers 500 { error: 'Internal server error' } with a constant first argument to console.error (CodeQL blocks tainted format strings: never put a request value or error text in the first argument). A gate error never grants access and never answers premium_required. The one exception is the list's display flag (D-06), which degrades to null and grants nothing.

- D-10 (delivery): work only in WT on feat/api-access-paid-tier. Stage explicit paths only, never git add -A or git add . Commit messages end with the line "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" exactly, whatever model executes. Do not push, open a PR, file an issue, add a migration, edit lib/database.types.ts, run SQL against a real database, read any .env file, call Stripe or Discord, or put planning files in WT. Do not touch SP/wtstripe, SP/wtnotes, the main checkout's source files or any other worktree; never run git worktree prune. Keep commit messages, comments and the PR body neutral and specific (public repository). No em dash in any added line, commit message or the PR body.

## Open decisions (surfaced in the SUMMARY and PR body draft; the plan implements each recommendation; do NOT mark them resolved)

| ID | Question | Options | Recommendation and evidence | Blocks | Resolution |
|---|---|---|---|---|---|
| OD-1 | Rollout for guilds that use the bot, addon or companion on the free tier today | A immediate cutoff when each slice ships; B dated grace period (for example free until 30 days after an Updates announcement); C grandfather guilds with recorded use before a cutoff date | C where use is recorded, A where it is not. Precedent: reserve runs grandfather "forever, never claw a feature back from someone who was using it" (utils/feature-gate.ts lines 33-38). Addon use is recorded: loot_history rows with source 'addon' (lib/loot/loot-history-rows.ts lines 77 and 173) and addon_sync_tokens rows (baseline schema line 1286). Bot use is not recorded per guild (the bot routes only call trackApiError: app/api/bot/score/route.ts line 174, app/api/bot/priority/route.ts line 262), and /priority listed no raider until the GH #325 fix on 2026-10-03, so few guilds rely on it. Trade-off: C means paid conversion on these surfaces comes from new guilds only; pick B if existing free users should convert too. | Slices 2 and 3 (not this slice) | Addon and companion: grandfather guilds with recorded use; bot: immediate cutoff (slices 2 and 3), user, 2026-10-04 |
| OD-2 | Do trials, comped guilds and payment-retry guilds count as Premium for API access? | A yes (the tier decides); B exclude trials | A. guilds.subscription_tier is the single entitlement field (supabase/migrations/20260826000000_guild_subscriptions.sql lines 3-5; lib/billing/sync.ts lines 5-7), writable only by the server (supabase/migrations/20260930000100_enforce_guild_membership_write_rules.sql lines 77-84). tierForStatus maps active, trialing and past_due to pro and everything else, including paused, to free (lib/billing/tier.ts lines 12-21). Comped guilds are pro with no subscription row (lib/billing/subscription-view.ts lines 22-27; app/api/cron/sync-discord-premium/route.ts line 41). Gift codes are Stripe promotion codes at checkout (app/api/billing/checkout/route.ts line 88), so they arrive as active or trialing. A trial that ends without a card pauses and drops to free (same file, lines 95-102). B needs a second entitlement read and hides the features the 14-day trial exists to show. | This slice (D-01) | Yes, the tier decides (active, trialing, past_due, comped count), user, 2026-10-04 |
| OD-3 | What happens to the existing reserve runs of a guild with no reserve access (lapsed Premium, never grandfathered)? | A everything gated, including viewing and the public join page; B read only: viewing stays, every write is refused (edit, lock, unlock, complete, awards, sign-up edits, guest sign-ups, create, copy), deleting a run stays allowed; C status quo (only create and copy gated) | B. It closes the reuse gap (PATCH can unlock, re-date and re-open an old run: app/api/reserve-runs/[id]/route.ts lines 196-243) while keeping the promise the trial-ending notice makes, "Your guild data is safe either way" (lib/billing/trial-ending.ts line 206). Deleting stays open because removing your own data should never need a subscription. Trade-off: a guild whose Premium pauses mid-raid cannot lock or award until it upgrades; past_due keeps Premium during payment retries, which covers failed renewals. If A: also call requireReserveRunPremium in GET run (after the viewer check, 'manager'), GET audit ('manager'), GET join (after the run lookup, 'guest') and return runs [] from the list when reserve_access is false. If C: skip D-02 to D-04 and keep D-01 and D-06. | This slice | Read only (viewing and deleting stay open, every write refused; pre-2026-08-27 runs stay grandfathered), user, 2026-10-04 |
| OD-4 | Gate the catalog routes /api/reserve-runs/items and /api/reserve-runs/raid-tiers? | A keep public; B require sign-in plus Premium | A. They take no guild or run (items/route.ts lines 9-23; raid-tiers/route.ts lines 11-47), return the shared item catalog the public join page already shows, and there is no guild to check. | This slice | Keep the item catalog and raid tier routes public (recommendation), orchestrator, 2026-10-04 |
| OD-5 | What does the Reserve page show a guild without reserve access? | A the C-4 notice and no Create run buttons, from a server flag; B status quo: Create run is shown, the whole form is filled, then a C-1 toast (app/(app)/reserve/components/CreateReserveRunModal.tsx line 259) | A. Today the page never mentions Premium (app/(app)/reserve/_client.tsx lines 85-146). The flag comes from the server gate because the client only knows the tier, not grandfathering (domain/guild/feature-flags.ts lines 21-36). | Task 3 only | Reserve page notice plus hidden Create buttons (approved with copy C-4), user, 2026-10-04 |
| OD-6 | Does the in-game addon download stay free, with only sync gated? | A yes; B no | A. The addon is not distributed through the app (no download route under app/), and it shows "your latest synced data" (lib/help-content.ts line 1351), so gating the sync routes already gates its data. Note: the user put the manual export and import routes in scope too (components/addon/AddonExportDialog.tsx line 23, components/addon/AddonImportDialog.tsx line 36, mounted on the officer Addon page app/(app)/admin/addon/_client.tsx lines 139-144), so a free guild gets no data into the addon at all. Alternative to consider: gate only the companion's automatic sync and keep manual copy-paste export and import free. | Slice 3 | Deferred to slice 3 (ask the user then) |
| OD-7 | Which bot commands are gated? | A /score and /priority; B every command | A. Only these two read guild data, through resolveGuildFromDiscord (app/api/bot/_helpers.ts lines 58-76). /help answers support questions, and the bot's loot announcements and notifications are not lookups; keep them free. | Slice 2 | Gate only /score and /priority; /help and announcements stay free (approved with the rollout answer), user, 2026-10-04 |
| OD-8 | Gate for the guild API (GH #271) | A Premium only, trials and comped included, no grandfathering; B also allow grandfathered guilds | A. Nothing to grandfather: no guild has used it. Defined now as 'guild_api' (D-08). | Nothing now | GH #271 is Premium only (user scope 2026-10-04) |
| OD-9 | When does the marketing copy change? | A with each slice that moves a feature; B all at once now | A. Reserve runs are already sold as Premium (app/pricing/page.tsx lines 31 and 38; app/components/PremiumItemTooltip.tsx lines 34 and 44; app/compare/page.tsx line 193), so this slice changes no marketing copy. The pricing page lists "Discord and raid-tool workflows" as free (app/pricing/page.tsx line 23); M-1 to M-9 ship with slices 2 and 3, and an Updates entry should go out before any cutoff. | Slices 2 and 3 | Deferred to slices 2 and 3 (marketing copy changes ship with them; ask the user then) |

## COPY (all needs user sign-off; no em dashes; straight apostrophes)

SIGN-OFF 2026-10-04: the user approved slice 1 copy C-2, C-3 and C-4 as drafted (C-1 unchanged). C-5 to C-8 and M-1 to M-9 are drafts for later slices and are NOT signed off.

Implemented in this slice:
- C-1 (EXISTING, unchanged; create and duplicate refused): "Reserve runs are a LootList+ Premium feature. Upgrade your guild to create new runs."
- C-2 (NEW; a manager's edit, lock, award or sign-up change on a run whose owner has no reserve access; shown as the existing error toast on the run page and on the join page's leader actions): "Reserve runs are a LootList+ Premium feature, so this run is read only until its guild upgrades."
- C-3 (NEW; a guest's sign-up on such a run; shown in the join form's existing error line): "This run can't take reserves right now because its guild doesn't have LootList+ Premium. Let your raid leader know."
- C-4 (NEW; Reserve page notice when reserve_access is false): title "Reserve runs need LootList+ Premium"; body "Your guild can still open its existing runs. Creating runs, taking sign-ups and recording awards need Premium."; button "See Premium" (links to /premium, which already tells non-officers to ask an officer, app/components/landing/PremiumPricing.tsx lines 98-101).

Drafts for later slices (not implemented here; sign-off now saves a round trip):
- C-5 (slice 2; bot reply to /score and /priority for a guild without access, orange embed, description only): "Bot lookups are part of LootList+ Premium. An officer can upgrade **{guild_name}** at {premium_url}."
- C-6 (slice 3; Addon page export and import, shown as the existing toast): "Addon sync is part of LootList+ Premium. An officer can upgrade your guild on the Premium page."
- C-7 (slice 3; companion app, shown verbatim for guild data, export, award and attendance sync): "Companion sync needs LootList+ Premium for this guild. An officer can upgrade at {premium_url}, then sync again."
- C-8 (slice 3; companion login guild picker, label next to a guild without access): "Premium needed"
- M-1 (pricing page FREE_FEATURES line 23): replace "Discord and raid-tool workflows" with "Discord notifications and loot announcements".
- M-2 (pricing page PREMIUM_FEATURES, add two lines): "Discord bot lookups with /score and /priority" and "In-game addon and companion app sync".
- M-3 (pricing FAQ "Is LootList+ actually free?", line 38): "Yes. The core system for loot lists, attendance, priority scores, and raid distribution is available without a subscription. Premium adds multi-team support, the officer activity feed, reserve runs, Discord bot lookups, and addon sync."
- M-4 (pricing metadata description, line 11): "Run ranked loot lists, attendance, and transparent item priority free. Premium adds multiple raid teams, reserve runs, bot lookups, and addon sync for $4.99/month."
- M-5 (Premium tooltip, app/components/PremiumItemTooltip.tsx after line 34 and after line 44): "+ Addon and Companion Sync" with "Equip: Keeps the in-game addon in sync with your guild's lists, awards and attendance."; "+ Discord Bot Lookups" with "Equip: Answers /score and /priority in your Discord server."
- M-6 (compare page line 193): "LootList+ Premium is optional and adds multiple raid teams, reserve runs, the officer activity feed, Discord bot lookups, and addon sync for $4.99 per month or $39 per year per guild."
- M-7 (help article "The addon and companion app", lib/help-content.ts after line 1342): "The addon is free to install. Syncing it with LootList+, by export and import or through the companion app, is part of LootList+ Premium."
- M-8 (help, Discord slash commands, lib/help-content.ts lines 747-748, add a line): "/score and /priority answer for guilds with LootList+ Premium. /help works for everyone."
- M-9 (Updates entry before any cutoff, lib/updates-data.ts): title "Bot lookups and addon sync are moving to Premium"; text drafted with the OD-1 resolution and its date.

If the user edits any implemented line before execution, use the signed-off text verbatim. Record in the SUMMARY which lines were approved, edited or rejected.

## Follow-ups (SUMMARY and PR body only; not filed)

- FU-1: requirePro and checkSubscriptionTier (raid teams, audit log) still read a failed tier lookup as free, which shows a Premium upsell to a paying guild during a database error; move them onto readGuildTier.
- FU-2: the join page shows the sign-up form on a run that cannot take reserves and only says so after submit; GET join could return a flag so the page shows C-3 up front.
- FU-3: the run page still shows edit, lock and award controls that will be refused with C-2; GET run could return reserve_access to hide them.
- FU-4: reserve grandfathering is read from existing runs created before 2026-08-27; a grandfathered guild that deletes all of them loses it. Consider recording it on the guild.
- FU-5: client display checks (domain/guild/feature-flags.ts isPro and hasFeature) know only the tier, not grandfathering; anything that needs the full rule should ask the server, as D-06 does.

Source coverage:
| Source item | Task |
|---|---|
| GOAL: one shared server-side gate; reserve runs enforced on the server | Task 1 (tracer), Task 2, Task 3 |
| D-01, D-09 | Task 1 |
| D-02 | Task 1 |
| D-03 | Task 2 |
| D-04, D-06 | Task 3 |
| D-05 (stays open) | Task 1 (DELETE and GET checks), Task 3 (join GET check) |
| D-07 | Tasks 1 to 3 |
| D-08 | Task 1 (key and tests), Task 3 (SUMMARY, PR body) |
| D-10, JGK-R5 | Task 1 Step A (baseline), Task 3 (verification, SUMMARY, PR body) |
| Bot (surface 1), addon and companion (surface 2) | Split: slices 2 and 3, scoped in the table above; investigation recorded in Task 3 |
| GH #271 (surface 4) | D-08 |
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/todos/pending/2026-10-04-put-api-access-behind-paid-tiers.md

Paths (shell state does not persist between Bash calls; always use these absolute paths; the Bash tool runs zsh, so run every verify block as bash -c with the block in single quotes; the blocks below contain no single quote):
- MAIN = /Users/alexander.mayes/Code/personal/loot-list-plus. Only the SUMMARY is written here, at MAIN/.planning/workstreams/default/quick/261004-jgk-api-access-requires-a-paid-tier/261004-jgk-SUMMARY.md. Never edit code here.
- WT = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtpaid, branch feat/api-access-paid-tier from origin/main 9f239c40, node_modules symlinked, clean. ALL code work happens here. Repo paths in this plan are WT-relative.
- SP = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad. Baselines, final outputs and the PR body draft go here. SP/new-fails.sh compares FAIL lines (usage, from WT: sh SP/new-fails.sh <baseline> <final>; the final file's first line must be HEAD=<current HEAD>, both files end with an EXIT= line).

Facts the planner verified in WT at 9f239c40. Executor: re-check any line number with grep before quoting it.

1. How Premium is decided today:
- guilds.subscription_tier ('free' or 'pro', NOT NULL default 'free', CHECK constraint, baseline schema lines 1808-1810) is the only field the app gates on. guild_subscriptions records the Stripe state behind it (migration 20260826000000 lines 3-5). lib/billing/sync.ts syncSubscriptionToGuild upserts the row and sets the tier from tierForStatus (lines 13-33). Only the server can change the tier (migration 20260930000100 lines 77-84).
- tierForStatus (lib/billing/tier.ts lines 12-21): active, trialing, past_due give 'pro'; paused, canceled, unpaid, incomplete and null give 'free'. Trials: 14 days, one per guild (checkout route lines 69 and 95), ending in 'paused' without a card (line 102). Gift codes: Stripe promotion codes (line 88). Comped: tier 'pro' set by hand, no row (subscription-view.ts lines 22-27, BillingSection.tsx line 116 "Premium is active (complimentary).").
- Server helpers (utils/feature-gate.ts): checkSubscriptionTier (lines 15-31) reads the tier and treats a read error as free; RESERVE_GRANDFATHER_CUTOFF '2026-08-27T00:00:00Z' (line 38) and guildHasReserveAccess (lines 40-54, ignores its read error); requireReserveAccess (lines 59-92; personal runs qualify through any active guild of the user, reads ignore errors); requirePro (lines 98-118).
- Server callers: requireReserveAccess in POST /api/reserve-runs (line 145) and POST /[id]/duplicate (line 67); requirePro in app/api/audit-logs/route.ts line 47 and the four raid-teams routes. No other route reads the tier for gating.
- Client display only: domain/guild/feature-flags.ts isPro and hasFeature (lines 21-36), fed by GuildContext (app/contexts/GuildContext.tsx line 882) and the user bundle (lib/cache/user-bundle.ts line 122); used by Sidebar, raid-teams, audit-log and PremiumPricing for display.

2. Surfaces and paths:
- Reserve runs: 10 route files, 15 handlers (list GET and create POST; run GET, PATCH, DELETE; awards POST, DELETE; sign-ups PATCH, DELETE; duplicate POST; audit GET; join GET, POST; items GET; raid-tiers GET) plus the join link preview. Premium is checked in 2 of them (create, duplicate). Managers are decided by verifyReserveRunAccess and decideReserveRunManager (utils/reserve-access.ts lines 130-177: leader token, creator while an active member, Manage reserves); its run select (line 167) returns guild_id and created_by. A free guild today sees the Create run button and a C-1 toast only after filling the form; every other action works.
- Discord bot: 2 API routes (app/api/bot/score, app/api/bot/priority) behind checkBotAuth (shared BOT_API_KEY, app/api/bot/_helpers.ts lines 29-43). The guild is the oldest active guild whose discord_server_id is the Discord server id the bot sends (resolveGuildFromDiscord, lines 58-76). Bot commands: /score, /priority, /help (discord-bot/commands.js). A free guild today gets full answers.
- Addon and companion: 8 route files, 10 handlers. authenticateAddonRequest (lib/addon/sync-tokens.ts lines 81-120) takes a session cookie or a Bearer sync token scoped to one guild; authorizeAddonGuild (lines 128-145) checks the token's guild and officer permission, and is used by attendance, export-string, guild-data and loot-award. import-string uses the session plus verifyOfficerPermissions on the guild inside the payload (line 141). sync-token POST and DELETE issue and revoke tokens; /api/addon/auth (GET, POST) is the companion consent page, /api/addon/auth/token the PKCE exchange. Callers: the officer Addon page dialogs and the companion (companion/src/main/api-client.ts lines 75, 94, 118, 152; auth.ts lines 85, 115). A free guild today gets everything.

3. Test patterns: app/api/reserve-runs/[id]/__tests__/route.test.ts (recording fake makeClient with tables, errorOn per table, eq and in filters, single, maybeSingle, thenable; Fixture has no guilds table and no lt filter yet). app/api/reserve-runs/join/[token]/__tests__/route.test.ts (similar fake; guilds rows { id, name }; eq, in, ilike). app/api/reserve-runs/[id]/awards/__tests__/route.test.ts mocks '@/utils/reserve-access' (verifyReserveRunAccess resolves { allowed: true, actor: 'officer', run: baseRun }) and uses a narrow fake. app/api/reserve-runs/__tests__/route.test.ts mocks '@/utils/feature-gate' as { requireReserveAccess: vi.fn() }. utils/__tests__/feature-gate.test.ts uses a one-shape mockSupabase (from, select, eq, single); keep its 7 existing tests unchanged.

4. Baseline eslint on the changed source files: only app/(app)/reserve/_client.tsx line 169 (no-img-element warning).
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): one shared Premium gate in utils/feature-gate.ts, enforced end to end on PATCH /api/reserve-runs/[id]</name>
  <files>utils/feature-gate.ts, utils/__tests__/feature-gate.test.ts, app/api/reserve-runs/[id]/route.ts, app/api/reserve-runs/[id]/__tests__/route.test.ts</files>
  <behavior>
    - readGuildTier: 'pro' gives 'pro'; 'free', null tier and no row give 'free'; a guilds read error rejects.
    - guildHasPaidAccess (D-01, OD-2): a 'pro' guild gives true for 'reserve_runs' and 'guild_api' with no reserve_runs read recorded. A free guild with a reserve run created 2026-08-26 gives true for 'reserve_runs' and false for 'guild_api' (and 'guild_api' makes no reserve_runs read). A free guild whose only run was created 2026-08-27T00:00:00Z or later gives false. A reserve_runs read error rejects; a guilds read error rejects.
    - userHasReserveAccess: with a guildId it follows guildHasPaidAccess. With no guildId: a user with an active membership in a 'pro' guild gives true; a user whose only membership in a 'pro' guild is inactive gives false; a user with no characters gives false with no membership read; a characters or memberships read error rejects.
    - requireReserveAccess: allowed for a 'pro' guild; denied with status 403 and body { error: C-1 exactly, code: 'premium_required' } for a free non-grandfathered guild; rejects on a read error (no denial body).
    - requireReserveRunPremium: a guild run of a 'pro' guild is allowed; of a free non-grandfathered guild gives 403 with C-2 for 'manager' and C-3 for 'guest', code 'premium_required'. A run with no guild is decided by run.created_by's active guilds: the creator active in a 'pro' guild allows it whoever calls; a creator with no Premium guild denies it.
    - PATCH run (D-02, tracer): with the guild 'pro' (the fixture default) every existing PATCH test passes unchanged. With the guild free and no pre-cutoff run: the creator, an officer with Manage reserves and the leader token each get 403 { error: C-2, code: 'premium_required' }, zero reserve_runs update calls and logReserveAudit not called. With a pre-cutoff run of the same guild added (created_at 2026-08-01T00:00:00.000Z): 200 and one update. The run with no guild (RUN_RN, creator SOLO): SOLO with no Premium guild gets 403 C-2; after giving SOLO an active membership in a second 'pro' guild, 200. With errorOn guilds: 500 { error: 'Internal server error' } and no update. Not-found, 401 and 403 answers still come before the gate (a non-manager on a free guild gets 403 'Forbidden', not premium_required).
    - Stays open (D-05): with the guild free and no pre-cutoff run, DELETE by the creator gives 200 and deletes; GET by an active member gives 200.
  </behavior>
  <action>
Step A, baseline (D-10). Confirm git -C WT branch --show-current prints feat/api-access-paid-tier, git -C WT status --short is empty and git -C WT rev-parse HEAD starts with 9f239c40. Before ANY edit, from WT run one Bash command: { echo "HEAD=$(git rev-parse HEAD)"; npx vitest run; echo "EXIT=$?"; } > SP/baseline-jgk-vitest.txt 2>&1, then npx tsc --noEmit > SP/baseline-jgk-tsc.txt 2>&1; echo "EXIT=$?" >> SP/baseline-jgk-tsc.txt, then npx eslint utils/feature-gate.ts app/api/reserve-runs "app/(app)/reserve/_client.tsx" > SP/baseline-jgk-eslint.txt 2>&1; echo "EXIT=$?" >> SP/baseline-jgk-eslint.txt (wrap it in bash -c; the full suite takes about 30 to 45 seconds). Note file and test counts and any pre-existing FAIL lines verbatim for the SUMMARY.

Step B, verify the context facts with grep in WT (feature-gate line numbers, the PATCH access block, the verifyReserveRunAccess select at utils/reserve-access.ts line 167). If anything differs, adapt the wiring, not the rules, and note it in the SUMMARY.

Step C, tests first. In utils/__tests__/feature-gate.test.ts keep the existing mockSupabase and its 7 tests. Add a second, generic recording fake (makeTableClient(tables, errorOn?)) that supports from, select, eq, in, lt (string comparison), limit, maybeSingle, single and a thenable, records every call as { table, filters }, and answers from fixture rows; errorOn names a table whose every read returns { data: null, error: { message: 'boom' } }. Add describe blocks for readGuildTier, guildHasPaidAccess, userHasReserveAccess, requireReserveAccess and requireReserveRunPremium covering every behavior line above (UUID-shaped ids). In app/api/reserve-runs/[id]/__tests__/route.test.ts add guilds to Fixture and to makeClient's tables, add an lt filter kind (row value less than the given string) and builder method, default guilds to [{ id: GUILD_ID, subscription_tier: 'pro' }], and add the PATCH, DELETE and GET cases above. Run both files and confirm the new cases fail for the expected reason before Step D.

Step D, implement D-01 in utils/feature-gate.ts exactly as specified in the objective (readGuildTier, PaidFeature with its #271 JSDoc, guildHasPaidAccess, userHasReserveAccess, requireReserveAccess on top of userHasReserveAccess with its C-1 body unchanged, requireReserveRunPremium with C-2 and C-3 verbatim from the COPY block, the private guildHasReserveAccess removed, checkSubscriptionTier and requirePro untouched). Then implement D-02 in app/api/reserve-runs/[id]/route.ts: import requireReserveRunPremium, call it right after the access block with the run that block returns and audience 'manager', return its error on denial, and update the PATCH and DELETE docstrings as D-02 says. Change nothing else in the file.

Step E, run the two test files plus app/api/reserve-runs/__tests__/route.test.ts and app/api/reserve-runs/[id]/duplicate/__tests__/route.test.ts (they mock requireReserveAccess and must still pass), then npx tsc --noEmit. Commit in WT with explicit paths and a message such as "feat(reserve-runs): one server-side Premium gate, enforced on run edits" whose body names guildHasPaidAccess and the rule (the run's guild, or for a run with no guild its creator's guilds, needs Premium or reserve grandfathering), ending with the trailer line "Co-Authored-By: Claude Opus 5.5 &lt;noreply@anthropic.com&gt;".
  </action>
  <verify>
    <automated>bash -c 'cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtpaid && grep -q "^EXIT=" ../baseline-jgk-vitest.txt && grep -q "^EXIT=" ../baseline-jgk-tsc.txt && npx vitest run utils/__tests__/feature-gate.test.ts "app/api/reserve-runs/[id]/__tests__/route.test.ts" app/api/reserve-runs/__tests__/route.test.ts "app/api/reserve-runs/[id]/duplicate/__tests__/route.test.ts" && npx tsc --noEmit && grep -q "export async function guildHasPaidAccess" utils/feature-gate.ts && grep -q "export async function requireReserveRunPremium" utils/feature-gate.ts && grep -q "guild_api" utils/feature-gate.ts && grep -q "requireReserveRunPremium(serviceSupabase, run, .manager.)" "app/api/reserve-runs/[id]/route.ts" && grep -q "Upgrade your guild to create new runs." utils/feature-gate.ts && git log -1 --format=%B | grep -q "^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$"'</automated>
  </verify>
  <done>Baselines are saved in SP and were taken before any edit. utils/feature-gate.ts holds the one shared gate with strict reads, the 'guild_api' key and the run-owner rule; its unit tests cover tiers, grandfathering, read errors and runs with no guild. PATCH /api/reserve-runs/[id] refuses every kind of manager with C-2 on a run whose owner has no reserve access, makes no write, and works unchanged for Premium and grandfathered guilds; DELETE and GET stay open. tsc is clean and the work is committed with the trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: awards and sign-up edits need the run owner's reserve access</name>
  <files>app/api/reserve-runs/[id]/awards/route.ts, app/api/reserve-runs/[id]/awards/__tests__/route.test.ts, app/api/reserve-runs/[id]/submissions/[subId]/route.ts, app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts</files>
  <behavior>
    - Awards (D-03): add vi.mock('@/utils/feature-gate', () => ({ requireReserveRunPremium: vi.fn() })) and default it to resolve { allowed: true } in beforeEach; the 8 existing tests pass unchanged. New: POST calls requireReserveRunPremium once with (the client, baseRun, 'manager'); when it resolves { allowed: false, error: a 403 response with { error: 'gate', code: 'premium_required' } }, POST answers that status and body, makes no reserve_awards insert, no reserve_submissions or loot_items read and no logReserveAudit call. DELETE: the same pass-through with no reserve_awards read or delete. When verifyReserveRunAccess denies (403 'Forbidden'), requireReserveRunPremium is not called. When requireReserveRunPremium rejects, the answer is 500 'Internal server error' with nothing written.
    - Sign-ups (D-03, new test file, the first for this route): mock '@/utils/supabase/service-role', '@/utils/supabase/server', '@/utils/reserve-access' (verifyReserveRunAccess), '@/utils/feature-gate' (requireReserveRunPremium) and '@/utils/reserve-audit'; a small recording fake for reserve_submissions (select with eq id and eq reserve_run_id plus single; update with select and single; delete). PATCH by an allowed manager with { character_name: 'Fixed' } gives 200 and one update; PATCH when the gate denies gives the gate's 403 and no reserve_submissions call at all; DELETE when the gate denies gives 403 and no delete; DELETE allowed deletes; an access denial (403 'Forbidden', or 404 'Run not found') never calls the gate; requireReserveRunPremium is called with audience 'manager' and the run from verifyReserveRunAccess.
  </behavior>
  <action>
Tests first (D-07): extend app/api/reserve-runs/[id]/awards/__tests__/route.test.ts and create app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts (first line "// @vitest-environment node" plus the two explanatory comment lines from app/api/reserve-runs/[id]/__tests__/route.test.ts) with every behavior line above. Read app/api/reserve-runs/[id]/submissions/[subId]/route.ts fully first so the fake answers its exact chain (loadSubmission at lines 11-24, the update and delete further down). Confirm the new cases fail.

Then implement D-03 in both route files: import requireReserveRunPremium from '@/utils/feature-gate'; in POST and DELETE of awards and PATCH and DELETE of sign-ups, right after the existing access check (widen `!access.allowed` to `!access.allowed || !access.run` where needed, keeping the existing status mapping), call requireReserveRunPremium(serviceSupabase, access.run, 'manager') (or the local run variable where the handler already assigns one) and return its error on denial, before loadSubmission, the award lookups, any write or any audit call. Update the "Officer-only" docstrings as D-03 says. Change nothing else.

Run the two test files and tsc. Commit with explicit paths and a message such as "feat(reserve-runs): awards and sign-up edits need the run's guild to have Premium" ending with the trailer line "Co-Authored-By: Claude Opus 5.5 &lt;noreply@anthropic.com&gt;".
  </action>
  <verify>
    <automated>bash -c 'cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtpaid && npx vitest run "app/api/reserve-runs/[id]/awards/__tests__/route.test.ts" "app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts" && npx tsc --noEmit && test "$(grep -c "requireReserveRunPremium(" "app/api/reserve-runs/[id]/awards/route.ts")" -eq 2 && test "$(grep -c "requireReserveRunPremium(" "app/api/reserve-runs/[id]/submissions/[subId]/route.ts")" -eq 2 && git log -1 --format=%B | grep -q "^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$"'</automated>
  </verify>
  <done>Logging or removing an award and editing or removing a sign-up are refused with the gate's answer, before any read or write, when the run's owner has no reserve access, for every kind of manager; the sign-up route has its first tests; tsc is clean; committed with the trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: guest sign-ups need the run owner's reserve access, the Reserve page explains Premium, full regression, SUMMARY and PR body draft</name>
  <files>app/api/reserve-runs/join/[token]/route.ts, app/api/reserve-runs/join/[token]/__tests__/route.test.ts, app/api/reserve-runs/route.ts, app/api/reserve-runs/__tests__/route.test.ts, app/(app)/reserve/_client.tsx</files>
  <behavior>
    - Join POST (D-04): fixture guilds rows gain subscription_tier, default 'pro' (existing tests pass unchanged); the fake gains an lt filter. With the guild free and no pre-cutoff run, a guest POST to the open run gives 403 { error: C-3 exactly, code: 'premium_required' } with no reserve_submissions insert or update. A guest POST to RUN_SOLO (no guild) whose creator SOLO has no Premium guild gives the same 403; with SOLO active in a 'pro' guild it is accepted. A missing character name still gives the existing 400 and an unknown token the existing 404 before any guilds read. A guilds read error gives 500 and nothing written. The leader-token holder is a guest here too (the join POST is the sign-up form).
    - Join GET stays open (D-05): with the guild free, GET on the open run still gives 200 with the same payload keys.
    - List GET (D-06): the feature-gate mock gains guildHasPaidAccess (default resolves true). An active member gets { success: true, runs, reserve_access: true }; with guildHasPaidAccess resolving false, reserve_access false and the runs still returned; with it rejecting, reserve_access null, 200, runs returned and console.error called with a constant string first argument; a non-member gets 403 and guildHasPaidAccess is not called; guildHasPaidAccess is called with (the client, the guild id, 'reserve_runs').
    - Reserve page (D-06): with reserve_access false the page renders the C-4 title, body and a "See Premium" link to /premium, and no "Create run" button; with true or null it renders exactly as before.
  </behavior>
  <action>
Tests first for the two route files (D-07), covering every route behavior line above; confirm they fail. Join fixture runs used for denial cases must have created_at on or after 2026-08-27; check the fixture's run() defaults.

Implement D-04 in app/api/reserve-runs/join/[token]/route.ts (created_by added to the POST run select, the gate with audience 'guest' after the 404 and before the status check; GET untouched; reword nothing else). Implement D-06 in app/api/reserve-runs/route.ts (the reserve_access flag in its own try/catch after the reserve_runs read; response { success: true, runs, reserve_access }; update the GET docstring: "List reserve runs for a guild. Active members of the guild only; never returns the raid leader token. reserve_access says whether the guild can create runs and change them (Premium or grandfathered), or null when that could not be read."). Implement D-06 in app/(app)/reserve/_client.tsx exactly as specified, with the C-4 strings verbatim from the COPY block, and add no eslint warning. Run the two route tests, tsc and eslint on the changed files. Commit with explicit paths and a message such as "feat(reserve-runs): guest sign-ups need the run's guild to have Premium, and the Reserve page says so" ending with the trailer line "Co-Authored-By: Claude Opus 5.5 &lt;noreply@anthropic.com&gt;".

Full regression (D-10), after the last commit, from WT in one bash -c: { echo "HEAD=$(git rev-parse HEAD)"; npx vitest run; echo "EXIT=$?"; } > SP/final-jgk-vitest.txt 2>&1, then sh SP/new-fails.sh SP/baseline-jgk-vitest.txt SP/final-jgk-vitest.txt (must exit 0), npx tsc --noEmit (exit 0), npx eslint on every changed .ts and .tsx file (no new warning against SP/baseline-jgk-eslint.txt). Then confirm: git diff --name-only origin/main...HEAD lists exactly the 13 files_modified paths; no added line in git diff origin/main...HEAD and no commit message after 9f239c40 contains an em dash; every commit after 9f239c40 ends with the trailer line; git status --short is empty; nothing is pushed (the branch has no upstream).

PR body draft at SP/pr-body-jgk.md (neutral, specific, no em dash, ending with the line "🤖 Generated with [Claude Code](https://claude.com/claude-code)"): what changed (the shared gate and its rule; which reserve routes now need Premium and which stay open; the Reserve page notice), why (lapsed guilds could keep reusing runs; one gate for every paid API surface), the test list, the three-slice split with slices 2 and 3 scoped, the GH #271 requirement (D-08), the open decisions OD-1 to OD-9 with their recommendations and blank resolutions, the COPY lines (implemented and drafted) for sign-off, and FU-1 to FU-5. Keep database policy analysis out.

SUMMARY at MAIN/.planning/workstreams/default/quick/261004-jgk-api-access-requires-a-paid-tier/261004-jgk-SUMMARY.md using the summary template: baseline and final counts with any pre-existing FAIL lines verbatim, the three commits, the investigation findings (context facts 1 and 2, with the per-surface path counts and what a free guild sees today), the split, the open decisions table with blank Resolution, the COPY block and which lines the user approved, edited or rejected, the follow-ups, and a note that the Reserve page notice was checked by tests and tsc, not in a browser. Do not edit STATE.md, ROADMAP.md or the todo; the orchestrator files the planning docs.
  </action>
  <verify>
    <automated>bash -c 'cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtpaid && npx vitest run "app/api/reserve-runs/join/[token]/__tests__/route.test.ts" app/api/reserve-runs/__tests__/route.test.ts && npx tsc --noEmit && grep -q "requireReserveRunPremium(serviceSupabase, run, .guest.)" "app/api/reserve-runs/join/[token]/route.ts" && grep -q "reserve_access === false" "app/(app)/reserve/_client.tsx" && grep -q "Reserve runs need LootList+ Premium" "app/(app)/reserve/_client.tsx" && test "$(head -1 ../final-jgk-vitest.txt)" = "HEAD=$(git rev-parse HEAD)" && sh ../new-fails.sh ../baseline-jgk-vitest.txt ../final-jgk-vitest.txt && test "$(git diff --name-only origin/main...HEAD | wc -l | tr -d " ")" -eq 13 && test -z "$(git status --short)" && ! git diff origin/main...HEAD | grep "^+" | grep -q "$(printf "\xe2\x80\x94")" && ! git log origin/main..HEAD --format=%B | grep -q "$(printf "\xe2\x80\x94")" && test "$(git log origin/main..HEAD --format=%H | wc -l | tr -d " ")" -eq "$(git log origin/main..HEAD --format=%B | grep -c "^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$")" && test -f ../pr-body-jgk.md && ! grep -q "$(printf "\xe2\x80\x94")" ../pr-body-jgk.md && test -f /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261004-jgk-api-access-requires-a-paid-tier/261004-jgk-SUMMARY.md'</automated>
  </verify>
  <done>Guest sign-ups on a run whose owner has no reserve access are refused with C-3 and nothing written, while the join page still loads; the list returns reserve_access and the Reserve page shows C-4 without Create run buttons only when it is false; the full suite shows no new FAIL line; tsc and eslint are clean; exactly the 13 planned files changed across three commits with the trailer; the PR body draft and the SUMMARY carry the split, the open decisions, the copy and the follow-ups; nothing is pushed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser or guest to reserve-run API | Signed-in users, leader-link holders and anonymous guests call routes that read and write with the service role; the route is the only gate (reserve tables are server-only since #380) |
| client display state to server decision | GuildContext's subscription_tier and the list's reserve_access are display hints; the server decides every write |
| app to database (billing read) | The gate's tier and grandfather reads can fail; a failure must not grant access or mislabel a paying guild |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jgk-01 | Elevation of privilege | PATCH run, awards, sign-ups, join POST | high | mitigate | D-02 to D-04: requireReserveRunPremium on every write handler, whoever the manager is (officer, creator, leader link) and for guests; tests per route |
| T-jgk-02 | Spoofing | Premium status supplied by the client | high | mitigate | D-01: the gate reads guilds.subscription_tier with the service client; no request field, cookie or client flag is read; reserve_access (D-06) only drives display and every write re-checks |
| T-jgk-03 | Elevation of privilege | Run with no guild gated on the caller | medium | mitigate | D-01: requireReserveRunPremium decides by run.created_by's active guilds, so a guest or leader-link holder cannot qualify a run through their own guild; unit-tested |
| T-jgk-04 | Denial of service | Billing read failure | medium | mitigate | D-01, D-09: strict reads throw, routes answer 500 and write nothing; never allow on error and never answer premium_required on error; the list flag degrades to null |
| T-jgk-05 | Information disclosure | Premium status probe | low | mitigate | D-02, D-03: the gate runs after verifyReserveRunAccess, so a non-manager gets 401 or 403 before any tier read; the join POST tells a link holder only that the run's guild lacks Premium (accepted: the join page already shows the guild name) |
| T-jgk-06 | Tampering | Log injection, CodeQL tainted format strings | low | mitigate | D-09: constant first argument to every new console.error; error text only as a later argument or inside a thrown Error |
| T-jgk-07 | Repudiation | Refused writes leave no trace | low | accept | A refused write changes nothing, so there is nothing to audit; reserve audit rows stay for successful writes only |
</threat_model>

<verification>
- Task verifies pass in order; the Task 1 baseline exists before any edit.
- sh SP/new-fails.sh SP/baseline-jgk-vitest.txt SP/final-jgk-vitest.txt exits 0 with the final file's first line equal to HEAD.
- npx tsc --noEmit exits 0; eslint shows no new warning on the changed files.
- git diff --name-only origin/main...HEAD equals files_modified; no em dash in added lines, commit messages or SP/pr-body-jgk.md; every commit carries the trailer; nothing pushed; no issue filed.
- Manual reading check by the executor: grep every handler under app/api/reserve-runs for requireReserveRunPremium and requireReserveAccess and confirm the result matches D-02 to D-05 exactly (gated: PATCH run, awards POST and DELETE, sign-ups PATCH and DELETE, join POST, create, duplicate; open: list GET, run GET, run DELETE, audit GET, join GET, items, raid-tiers). Record the table in the SUMMARY.
</verification>

<success_criteria>
- One shared server-side gate exists (guildHasPaidAccess) reading guilds.subscription_tier, with the reserve grandfathering and a 'guild_api' key for GH #271, failing closed with 500 on a read error.
- Every reserve-run write is refused on the server for a run whose owner has no reserve access, for every kind of caller, with C-2 or C-3; Premium and grandfathered guilds see no change; reads and deleting stay open per OD-3 B and OD-4.
- The Reserve page shows C-4 and no Create run buttons only when the server says the guild has no reserve access.
- The SUMMARY and PR body draft carry the investigation, the three-slice split, OD-1 to OD-9 with blank resolutions, the COPY block for sign-off and FU-1 to FU-5.
- Three local commits with the trailer; no push, no PR, no issue, no migration.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261004-jgk-api-access-requires-a-paid-tier/261004-jgk-SUMMARY.md when done, and the PR body draft at /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-jgk.md.
</output>
