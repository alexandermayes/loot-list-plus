---
phase: quick-260901-hkj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/billing/discord-premium.ts
  - app/api/webhooks/stripe/route.ts
  - lib/billing/__tests__/discord-premium.test.ts
  - lib/billing/premium-role-diff.ts
  - lib/billing/__tests__/premium-role-diff.test.ts
  - app/api/cron/sync-discord-premium/route.ts
  - vercel.json
autonomous: true
requirements: [QDP-01, QDP-02, QDP-03, QDP-04, QDP-05]

user_setup:
  - service: discord
    why: "The reconciliation cron lists current premium-role holders, which requires the privileged Server Members Intent on the LootList+ bot application. Grants work without it; only revokes are skipped."
    dashboard_config:
      - task: "Enable Server Members Intent"
        location: "Discord Developer Portal -> Applications -> LootList+ bot -> Bot -> Privileged Gateway Intents -> Server Members Intent"
    env_vars: []

estimate:
  tokens: 78000
  raw_tokens: 39000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A completed Stripe checkout leaves the purchaser holding the community Premium role before the webhook responds (D-01)"
    - "A Discord failure during the webhook does not turn a successful DB sync into a 500 (D-01)"
    - "Discord REST calls from the billing path retry on 429 and 5xx instead of failing on the first blip (D-02)"
    - "A purchaser who holds premium on two guilds keeps the role when one subscription ends (D-03)"
    - "A daily cron grants the premium role to every current pro purchaser, including comped guilds, with no manual checking (D-04)"
    - "A daily cron removes the role from holders who no longer own any pro guild (D-04)"
    - "When the bot lacks Server Members Intent the cron logs an actionable error, skips revokes, and still performs grants (D-04)"
    - "A purchaser who is not in the community server is logged visibly rather than silently skipped (D-04)"
    - "All three Discord env vars unset means the webhook path and the cron both no-op cleanly (D-04)"
  artifacts:
    - lib/billing/premium-role-diff.ts
    - lib/billing/__tests__/premium-role-diff.test.ts
    - lib/billing/__tests__/discord-premium.test.ts
    - app/api/cron/sync-discord-premium/route.ts
  key_links:
    - "app/api/webhooks/stripe/route.ts awaits syncPremiumDiscordRole inside its own try/catch"
    - "lib/billing/discord-premium.ts calls discordFetch from lib/discord.ts instead of the global fetch"
    - "app/api/cron/sync-discord-premium/route.ts consumes diffPremiumRoleHolders from lib/billing/premium-role-diff.ts"
    - "vercel.json crons path matches /api/cron/sync-discord-premium exactly"
---

<objective>
Harden the premium Discord role sync so buying or ending Premium adds or removes the community server's Premium role automatically, with no manual checking.

Purpose: today the webhook fires the role call and forgets it, a single Discord blip loses the grant silently, and a purchaser with two premium guilds loses the role when either subscription ends. There is no safety net.
Output: an awaited and retried webhook role call, a multi-guild revoke guard, a pure desired-state diff function with unit tests, and a daily reconciliation cron that doubles as a one-time backfill.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

@lib/billing/discord-premium.ts
@lib/discord.ts
@app/api/webhooks/stripe/route.ts
@app/api/cron/auto-promote-trials/route.ts
@lib/billing/__tests__/tier.test.ts
@vercel.json
</context>

<interface_context>

Facts verified in the codebase. Do not re-derive them.

**Naming correction.** The exported function is `syncPremiumDiscordRole` (not `syncDiscordPremiumRole`). Keep the existing name; do not rename it.

**Existing signature** (`lib/billing/discord-premium.ts`):
```
syncPremiumDiscordRole(serviceSupabase: SupabaseClient, guildId: string, purchaserUserId: string | null, isPro: boolean): Promise<void>
```

**Retry wrapper** (`lib/discord.ts`): `export async function discordFetch(url: string, init?: RequestInit): Promise<Response>`. Retries twice (three attempts total), honors `Retry-After` on 429, retries 5xx, returns the last response on exhaustion, throws only on repeated network errors. It calls the global `fetch` internally, so tests stub `global.fetch`.

**Cron auth pattern** (all of `app/api/cron/*/route.ts`): read the `authorization` header, compare against the template string `Bearer ${process.env.CRON_SECRET}`, return `{ error: 'Unauthorized' }` with status 401 on mismatch. Then `createServiceRoleClient()` from `@/utils/supabase/service-role`.

**Schema, confirmed in use:**
- `guilds.id`, `guilds.created_by` (nullable), `guilds.subscription_tier` (the single field the app gates on; `'pro'` or `'free'`, written by `syncSubscriptionToGuild`)
- `user_preferences.user_id`, `user_preferences.discord_id` (nullable)

**Comped guilds** are rows with `subscription_tier = 'pro'` and no Stripe subscription, so a query on `subscription_tier` alone already includes them. Do not join `guild_subscriptions`.

**Discord REST v10** endpoints used:
- Role grant/revoke: `PUT|DELETE /guilds/{guild}/members/{user}/roles/{role}` returns 204 on success and 404 when the member is not in the server.
- Member listing: `GET /guilds/{guild}/members?limit=1000` returns an array of member objects shaped `{ user: { id }, roles: string[] }`. Paginate with `&after=<last user id>`. Requires the privileged Server Members Intent; without it Discord returns 403.
</interface_context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Harden the live webhook role path end to end (D-01, D-02, D-03)</name>
  <files>lib/billing/discord-premium.ts, app/api/webhooks/stripe/route.ts, lib/billing/__tests__/discord-premium.test.ts</files>
  <behavior>
    Tests in `lib/billing/__tests__/discord-premium.test.ts`, covering `syncPremiumDiscordRole`:
    - Env guard: with any of the three Discord env vars unset, the function issues zero HTTP calls and resolves.
    - Grant: `isPro` true with a resolvable discord_id issues exactly one request whose method is PUT and whose URL ends with the role id.
    - Revoke, single guild: `isPro` false and the purchaser owns no other pro guild issues exactly one DELETE.
    - Revoke, multi-guild guard: `isPro` false and the guard query returns a row issues zero HTTP calls. This is the regression test for the documented two-guild bug.
    - Purchaser fallback: `purchaserUserId` null falls back to `guilds.created_by`; a null creator issues zero HTTP calls.
    - Missing discord_id: no linked Discord account issues zero HTTP calls.
    - 404 response: resolves without throwing and logs no error (a non-member is an expected outcome on this path).

    Build the Supabase fake as a chainable builder keyed by table name, matching the project's existing mock convention. The exact chains it must support are:
    - `.from('guilds').select('created_by').eq('id', guildId).maybeSingle()`
    - `.from('user_preferences').select('discord_id').eq('user_id', userId).maybeSingle()`
    - `.from('guilds').select('id').eq('created_by', userId).eq('subscription_tier', 'pro').neq('id', guildId).limit(1).maybeSingle()`
    Every intermediate method returns the builder; `maybeSingle` is the only terminal and resolves `{ data, error }`. Stub `global.fetch` with `vi.fn()` and always resolve a 204 so the retry wrapper never sleeps. Restore env and fetch in `afterEach`.
  </behavior>
  <action>
Rework `lib/billing/discord-premium.ts`:

1. Move the `DISCORD_COMMUNITY_GUILD_ID` and `DISCORD_PREMIUM_ROLE_ID` reads from module scope into the function body, alongside the existing bot-token read. They are currently module-level constants captured at import time, which makes the env guard impossible to exercise from a test without module-registry gymnastics. Keep the early return when any of the three is absent.

2. Import `discordFetch` from `@/lib/discord` and route the role call through it instead of the global fetch, preserving the `Authorization` and `X-Audit-Log-Reason` headers verbatim. This is D-02: the wrapper already handles 429 Retry-After and 5xx.

3. Add the multi-guild revoke guard (D-03). When `isPro` is false, before issuing the DELETE, run the guard query listed in the behavior block against `guilds`. A returned row means the resolved purchaser still owns another guild sitting at the pro tier, so return early without touching the role. Comped guilds count as pro here by design, since the query keys on `subscription_tier` alone. Use `.neq('id', guildId)` so the guild being downgraded cannot vote for itself; note that `syncSubscriptionToGuild` has already written this guild's new tier by the time we run.

4. Upgrade the failure logging to carry context: the community guild id, the action taken, and the response status. Log ids only, never emails or display names, and never interpolate the bot token. Use a hyphen or a colon where you would reach for a long dash; that character is banned in log strings by CLAUDE.md.

5. Rewrite the file's leading doc comment. It currently advertises fire-and-forget calling and describes the two-guild bug as an accepted edge case. Both statements become false in this task. Document the awaited contract and the guard instead, and keep JSDoc on the exported function.

Then in `app/api/webhooks/stripe/route.ts` (D-01): await the `syncPremiumDiscordRole` call inside its own try/catch nested in the existing `if (!error)` block. Swallow and log any throw so a Discord problem never converts a successful DB sync into a 500 that Stripe would retry. Say plainly in the catch log that the reconciliation cron is the safety net. Leave the surrounding `trackEvent` and tier-error handling untouched.
  </action>
  <verify>
    <automated>npx vitest run lib/billing/__tests__/discord-premium.test.ts && npx tsc --noEmit && test "$(grep -v '^\s*[*/]' lib/billing/discord-premium.ts | grep -c 'fetch(')" -eq 0 && test "$(grep -h 'console\.' lib/billing/discord-premium.ts app/api/webhooks/stripe/route.ts | grep -c '—')" -eq 0 && grep -q 'await syncPremiumDiscordRole' app/api/webhooks/stripe/route.ts</automated>
  </verify>
  <done>All seven behaviors pass. The type check is clean. No lowercase bare-fetch call survives in `discord-premium.ts` outside comments (only `discordFetch`). No console line in either touched file contains a long dash. The webhook awaits the role sync.</done>
  <reversibility rating="reversible">Behavior-only changes to two existing files, revertible with a single git revert; no schema or external state is mutated.</reversibility>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Pure desired-state diff function (D-04, D-05)</name>
  <files>lib/billing/premium-role-diff.ts, lib/billing/__tests__/premium-role-diff.test.ts</files>
  <behavior>
    Tests in `lib/billing/__tests__/premium-role-diff.test.ts` for `diffPremiumRoleHolders`:
    - Grants every desired id, including ids already present in `current`, because PUT is idempotent and self-heals drift.
    - Revokes exactly the current holders absent from `desired`.
    - Returns an empty `toRevoke` when `current` is null, which is the listing-unavailable case.
    - Dedupes repeated desired ids. A purchaser owning two pro guilds appears once in `toGrant` and never in `toRevoke`. This is the cron-side counterpart to the Task 1 guard.
    - Empty desired plus current holders revokes all of them.
    - Both empty yields two empty arrays.
    - Never returns an id in both arrays.
  </behavior>
  <action>
Create `lib/billing/premium-role-diff.ts` exporting a pure function with no imports and no I/O:

```
export interface PremiumRoleDiff { toGrant: string[]; toRevoke: string[] }
export function diffPremiumRoleHolders(desired: Iterable<string>, current: Iterable<string> | null): PremiumRoleDiff
```

Semantics, which are the whole point of extracting this:
- `desired` is every discord id that should hold the role right now.
- `current` is every discord id observed holding it, or null when the member listing could not be read.
- `toGrant` is the deduped `desired` set in full, not the set difference. Re-PUTting an id that already holds the role is a no-op at Discord and keeps the cron correct even when `current` is unknown or stale. This is the backfill property.
- `toRevoke` is `current` minus `desired`, deduped, and is always empty when `current` is null. Refusing to revoke on unknown state is what stops a failed listing call from stripping every subscriber.

Set semantics give the multi-guild safety for free on this path: a purchaser owning two pro guilds contributes one entry to `desired`, so they can never land in `toRevoke`.

Consumers should pull the interface in with a type-only import. Put JSDoc on the exported function explaining why `toGrant` is the full desired set rather than a difference, since that reads like a bug to anyone who has not seen this note.

The module must have zero imports and zero async work. That is the property under test: it keeps the diff logic reachable from a unit test without standing up a Supabase or Discord double.
  </action>
  <verify>
    <automated>npx vitest run lib/billing/__tests__/premium-role-diff.test.ts && npx tsc --noEmit && test "$(grep -cE '^[[:space:]]*(import[[:space:]]|const .*require\(|export .*async )' lib/billing/premium-role-diff.ts)" -eq 0</automated>
  </verify>
  <done>All seven behaviors pass, the type check is clean, and the module has no imports and no async work, proving it is testable without mocking Discord.</done>
</task>

<task type="auto">
  <name>Task 3: Daily reconciliation cron (D-04)</name>
  <files>app/api/cron/sync-discord-premium/route.ts, vercel.json</files>
  <action>
Create `app/api/cron/sync-discord-premium/route.ts` exporting `GET`, following `app/api/cron/auto-promote-trials/route.ts` for shape and auth.

1. Auth: the Bearer CRON_SECRET comparison exactly as the sibling crons do it, 401 on mismatch. Do this before anything else.

2. Env guard: read the three Discord env vars inside the handler. If any is absent, return 200 with a body marking the run skipped and naming the reason. A clean no-op, never an error, so an unconfigured preview deployment stays quiet.

3. Desired set. Use `createServiceRoleClient()`. Select `created_by` from `guilds` where `subscription_tier` equals `'pro'`, drop nulls, dedupe. If the list is empty, skip the second query. Otherwise select `discord_id` from `user_preferences` with `.in('user_id', creatorIds)` and keep the non-null values. Comped guilds are included automatically because the filter is on `subscription_tier` alone.

4. Current holders. Write a local helper that pages `GET /guilds/{guild}/members?limit=1000` through `discordFetch`, following the `after` cursor with the last user id of each page and stopping when a page returns fewer than 1000 entries. Keep members whose `roles` array contains the premium role id and map them to `user.id`. On a 403, log a single actionable error naming Server Members Intent and the Discord Developer Portal path, and return null. On any other non-ok status, log the status and return null. Null means unknown, not empty, which is what makes the diff refuse to revoke.

5. Diff and apply. Call `diffPremiumRoleHolders(desired, current)`. For each `toGrant`, PUT the role through `discordFetch` with the same `X-Audit-Log-Reason` convention used by `discord-premium.ts`. A 404 here is the documented visible case: log a warning that names the discord id and states that the premium purchaser is not in the community server. Do not swallow it. Any other non-ok status logs an error with the status. For each `toRevoke`, DELETE with an audit-log reason, logging failures the same way. Sequential loops are correct here; the wrapper already backs off on 429 and the holder count is small.

6. Return 200 with a JSON tally: granted, revoked, counts of not-in-server and of failures, and a boolean recording whether revokes were skipped because the listing was unavailable. That tally is the thing that makes this observable in Vercel logs without manual checking.

Constraints for the whole file: no long dashes in any log or response string, `import type` for type-only imports, JSDoc on the exported handler describing the schedule and the intent requirement, kebab-case route directory as written. Add no dependencies and do not touch `discord-bot/`.

Then add a fourth entry to the `crons` array in `vercel.json` with path `/api/cron/sync-discord-premium`. Schedule it at `30 6 * * *`, half an hour after the existing auto-promote-trials job, so the two daily jobs do not contend. Preserve the existing three entries and the file's two-space indentation.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx eslint app/api/cron/sync-discord-premium/route.ts && node -e "const c=require('./vercel.json').crons;const e=c.find(x=>x.path==='/api/cron/sync-discord-premium');if(!e)throw new Error('cron entry missing');if(c.length!==4)throw new Error('expected 4 crons, got '+c.length);if(!/^\S+ \S+ \S+ \S+ \S+$/.test(e.schedule))throw new Error('bad schedule');console.log('ok',e.schedule)" && test -f app/api/cron/sync-discord-premium/route.ts && grep -q 'diffPremiumRoleHolders' app/api/cron/sync-discord-premium/route.ts && grep -q 'CRON_SECRET' app/api/cron/sync-discord-premium/route.ts && test "$(grep 'console\.' app/api/cron/sync-discord-premium/route.ts | grep -c '—')" -eq 0</automated>
    <human-check>After deploy, trigger the cron once with the CRON_SECRET bearer token and confirm the JSON tally reports the expected grant count and that the Vercel log shows either a revoke count or the Server Members Intent message.</human-check>
  </verify>
  <done>The route exists, authenticates with CRON_SECRET, consumes the pure diff function, and no-ops cleanly when Discord env vars are unset. `vercel.json` has exactly four cron entries, the new one pointing at the new route path. Type check and lint are clean. No long dash appears in any console line.</done>
  <reversibility rating="costly">The first production run backfills roles across the live community server. Grants are the intended outcome and are individually reversible in Discord, but a wrong desired set would touch many members at once. The audit log reason on every call makes the blast radius reviewable after the fact.</reversibility>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Stripe to webhook route | Signed but externally originated event payload drives tier writes and role changes |
| Vercel cron scheduler to cron route | Public HTTPS endpoint that mutates Discord role state for every subscriber |
| App to Discord REST | Privileged bot token crosses to a third party; responses are untrusted input |
| Service-role Supabase client | Bypasses RLS, so query filters are the only access control on the desired set |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QDP-01 | Spoofing | app/api/cron/sync-discord-premium/route.ts | high | mitigate | Bearer CRON_SECRET comparison before any work, 401 on mismatch, identical to the three existing crons (Task 3 step 1) |
| T-QDP-02 | Elevation of Privilege | cron desired-set query | high | mitigate | Desired set derived only from service-role reads of `guilds.subscription_tier` and `user_preferences.discord_id`; no request input reaches the query, so a caller cannot name who gets the role |
| T-QDP-03 | Information Disclosure | console logging in both paths | medium | mitigate | Log guild ids, discord ids, action and HTTP status only; no emails, display names, or Stripe customer data; bot token never interpolated into log output (Task 1 step 4, Task 3 step 6) |
| T-QDP-04 | Denial of Service | Discord REST call volume | medium | mitigate | All calls go through `discordFetch`, which honors 429 Retry-After and caps retries at three attempts; member listing paginates at the 1000 maximum; loops are sequential rather than fanned out |
| T-QDP-05 | Tampering | role revocation on unknown state | high | mitigate | `diffPremiumRoleHolders` returns an empty revoke list when the holder listing is null, so a failed or forbidden listing call can never strip the role from paying subscribers (Task 2) |
| T-QDP-06 | Repudiation | role grants and revokes | low | mitigate | `X-Audit-Log-Reason` preserved on every grant and revoke across both the webhook and cron paths, so Discord's server audit log attributes each change |
| T-QDP-07 | Denial of Service | webhook awaiting a third party | medium | accept | Awaiting Discord adds latency to the webhook and is the explicit intent of D-01; bounded by the wrapper's three attempts, and the try/catch keeps a Discord failure from producing a 500 that Stripe would retry |

Package legitimacy gate: not applicable. This plan installs nothing and adds no dependency, per the stated constraint.
</threat_model>

<verification>
1. `npx vitest run lib/billing` passes, covering the new diff tests, the new sync tests, and the existing tier tests.
2. `npx tsc --noEmit` is clean.
3. `npm run lint` (plain `eslint`; `next lint` was removed in Next 16) reports no new findings in the touched files.
4. The two-guild regression is proven by test, not by inspection: a revoke with another pro guild present issues zero HTTP calls.
5. Unknown holder state is proven safe by test: a null current set yields zero revokes.
6. `vercel.json` parses and carries exactly four cron entries.
7. No console line in any touched file contains a long dash.
</verification>

<success_criteria>
- Buying Premium adds the community role before the webhook responds; a Discord outage during that window logs and returns 200 rather than 500.
- Ending one of two premium subscriptions leaves the purchaser's role intact.
- A daily cron reconciles the full desired set, backfills on first run, includes comped guilds, and reports a tally.
- A missing Server Members Intent degrades to grants-only with one actionable log line, never to a failed cron or a mass revoke.
- A purchaser who never joined the community server shows up in the logs instead of vanishing.
- No new dependencies, no changes to `discord-bot/`, no changes to `lib/billing/tier.ts`.
</success_criteria>

<output>
Create `.planning/quick/260901-hkj-harden-the-premium-discord-role-sync-awa/260901-hkj-SUMMARY.md` when done.
</output>
