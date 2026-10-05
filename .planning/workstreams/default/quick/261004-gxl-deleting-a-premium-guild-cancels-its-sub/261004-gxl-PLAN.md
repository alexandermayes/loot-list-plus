---
phase: quick-261004-gxl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/billing/cancel-guild-subscription.ts
  - lib/billing/__tests__/cancel-guild-subscription.test.ts
  - app/api/guilds/route.ts
  - app/api/guilds/__tests__/route-delete.test.ts
  - app/(app)/guild-settings/components/GuildSettingsContent.tsx
  - app/api/guilds/delete/route.ts
  - app/api/guilds/delete/__tests__/route.test.ts
  - app/api/admin/clear-all-guilds/route.ts
  - app/api/admin/clear-all-guilds/__tests__/route.test.ts
  - lib/billing/sync.ts
  - lib/billing/__tests__/sync.test.ts
  - app/api/webhooks/stripe/route.ts
  - app/api/webhooks/stripe/__tests__/route.test.ts
autonomous: true
requirements:
  - GXL-R1
  - GXL-R2
  - GXL-R3
  - GXL-R4
  - GXL-R5
  - DELIVERY-R1

estimate:
  # estimate-calibration: factor 1, applied false, 0 samples, confidence low,
  # so tokens equals raw_tokens.
  tokens: 160000
  raw_tokens: 160000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "D-01, D-02, D-04 (GXL-R1, OD-1 A, OD-2 A): deleting a guild from Guild Settings (DELETE /api/guilds) cancels, before delete_guild runs, every subscription Stripe lists for the guild's stored customer whose metadata.guild_id is that guild and whose status is not canceled or incomplete_expired (trialing, active, past_due, unpaid, paused, incomplete, gifted), immediately and with Stripe's defaults (no proration, no final invoice); route test D6 records the order is_guild_master, subscription read, list, cancel, delete_guild."
    - "D-04 (GXL-R1, OD-2 A): if Stripe fails (list error, any cancel error, more than 100 listed) the guild is not deleted and the caller gets 502 with COPY C-3; if Stripe is not configured and the stored row is live, 503 with C-4; if a cancel succeeded but delete_guild then fails, 500 with C-5; a guild with no subscription row or no stored customer (never subscribed, complimentary) makes no Stripe call and deletes exactly as before (tests M5, M6, D5, D7 to D12)."
    - "D-05 (GXL-R2): no Stripe call and no subscription read happen before the caller is known to be allowed to delete the guild: DELETE /api/guilds checks is_guild_master (the rule delete_guild enforces) and answers 403 with C-2, POST /api/guilds/delete keeps its creator check (tests D1 to D4, T1 to T4, P4)."
    - "D-02 (GXL-R1): a subscription of another guild on the same Stripe customer is never cancelled (tests M4, M12)."
    - "D-06 (GXL-R3, OD-3 A): the admin clear-all-guilds route answers 409 with C-6 and deletes nothing while any guild it would delete has a guild_subscriptions row with a subscription id and a status other than canceled or incomplete_expired (tests A1 to A4)."
    - "D-07 (GXL-R4, OD-4 A): every Stripe webhook event for a guild that no longer exists answers 200, writes nothing to guild_subscriptions or guilds, makes no Stripe write, records no conversion event, and revokes the purchaser's Premium Discord role when the subscription's tier is free; a live subscription for a missing guild is logged as an error line; a guild lookup error still answers 500 so Stripe retries (tests S1 to S6, W1 to W7)."
    - "D-08 (GXL-R5): the delete confirmation modal of a Premium guild shows COPY C-1."
    - "D-09 (DELIVERY-R1): three local commits on fix/delete-guild-cancels-subscription, each with the trailer, no migration, nothing pushed, no planning files in WT; full vitest has no new FAIL line against SP/baseline-gxl-vitest.txt; tsc and eslint pass; no em dash in added lines, commit messages or SP/pr-body-gxl.md; no real Stripe call and no .env read."
  artifacts:
    - path: "lib/billing/cancel-guild-subscription.ts"
      provides: "cancellableSubscriptionIds, StripeCancelPort, cancelGuildSubscriptions (never rejects), endGuildBillingBeforeDelete, GUILD_DELETE_BILLING_ERRORS, GUILD_DELETE_CANCELLATION_COMMENT"
      contains: "endGuildBillingBeforeDelete"
    - path: "lib/billing/__tests__/cancel-guild-subscription.test.ts"
      provides: "M1 to M23 with inline fakes, no vi.mock, no stripe import"
      contains: "cancelGuildSubscriptions"
    - path: "app/api/guilds/route.ts"
      provides: "DELETE: is_guild_master pre-check, billing step, then delete_guild"
      contains: "rpc('is_guild_master'"
    - path: "app/api/guilds/__tests__/route-delete.test.ts"
      provides: "D1 to D12 through the real billing module with a fake Stripe and fake Supabase clients"
      contains: "is_guild_master"
    - path: "app/api/guilds/delete/route.ts"
      provides: "POST: billing step after the creator check, before delete_guild"
      contains: "endGuildBillingBeforeDelete"
    - path: "app/api/admin/clear-all-guilds/route.ts"
      provides: "OD-3 A live-subscription refusal before any delete"
      contains: "guild_subscriptions"
    - path: "lib/billing/sync.ts"
      provides: "guildMissing result: no write when the guild row is gone (lookup or foreign key 23503)"
      contains: "guildMissing"
    - path: "app/api/webhooks/stripe/route.ts"
      provides: "guildMissing branch: 200, no write, Discord revoke when not pro"
      contains: "guildMissing"
    - path: "app/(app)/guild-settings/components/GuildSettingsContent.tsx"
      provides: "COPY C-1 in the delete confirmation modal when isPro(activeGuild)"
      contains: "isPro(activeGuild)"
    - path: "/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-gxl.md"
      provides: "Neutral PR body draft"
  key_links:
    - from: "Guild Settings > Danger Zone > Delete guild (GuildSettingsContent.tsx handleDeleteGuild, fetch DELETE /api/guilds)"
      to: "endGuildBillingBeforeDelete(createServiceRoleClient(), getStripe(), guild_id) before supabase.rpc('delete_guild')"
      via: "app/api/guilds/route.ts DELETE"
      pattern: "endGuildBillingBeforeDelete\\("
    - from: "endGuildBillingBeforeDelete"
      to: "Stripe subscriptions.list({ customer, limit: 100 }) and subscriptions.cancel(id, { cancellation_details })"
      via: "StripeCancelPort, satisfied by the Stripe instance from getStripe()"
      pattern: "subscriptions\\.cancel\\("
    - from: "customer.subscription.deleted sent by Stripe after each cancel (often after delete_guild has committed)"
      to: "syncSubscriptionToGuild returns guildMissing; the webhook answers 200 without a write"
      via: "guild lookup by id before the upsert, and the 23503 foreign key code of guild_subscriptions_guild_id_fkey for the race"
      pattern: "guildMissing"
    - from: "admin clear-all-guilds"
      to: "guild_subscriptions live-row check"
      via: "409 before the first delete"
      pattern: "incomplete_expired"
---

<objective>
Deleting a Premium guild must stop its billing. Today the guild's guild_subscriptions row goes with the guild through its ON DELETE CASCADE foreign key, but nothing tells Stripe, so the subscription keeps renewing (or keeps retrying a past_due invoice) for a guild that no longer exists, and every later Stripe event for it fails the webhook with a foreign key error (500, retried by Stripe). This plan cancels the guild's live subscriptions before the guild is deleted, blocks the delete when Stripe fails, makes the webhook acknowledge events for deleted guilds, guards the admin bulk delete, and tells the owner in the delete confirmation. Closes follow-up FU-5 of quick task 261004-0ut.

Purpose: a deleted guild never leaves a live, billing subscription behind, and Stripe events for deleted guilds stop failing the webhook (which, after enough failures, Stripe disables for every guild).
Output: one billing module with tests, three route changes with tests, one sync change, one webhook change, one modal line, three local commits in WT and a PR body draft. No migration, no new package, no Stripe Dashboard change.

## Requirements

- GXL-R1: both guild delete routes cancel every live Stripe subscription of the guild before delete_guild; a Stripe failure blocks the delete (OD-1, OD-2).
- GXL-R2: only a caller allowed to delete the guild can cause a cancel.
- GXL-R3: the admin bulk delete never deletes a guild with a live subscription (OD-3).
- GXL-R4: Stripe webhook events for a deleted guild answer 200 without a write or a retry (OD-4).
- GXL-R5: the delete confirmation tells the owner of a Premium guild what happens to billing (COPY C-1).
- DELIVERY-R1: tests for every branch, full regression, neutral commits and PR body, nothing pushed.

## Decisions (locked unless an OD below changes them)

- D-01 (module): new lib/billing/cancel-guild-subscription.ts in the pattern of lib/billing/resume-paused.ts: every Stripe dependency arrives through an injected structural port (StripeCancelPort), the module never imports the stripe package, cancelGuildSubscriptions never rejects, per-element try/catch inside the cancel loop. The only import is a type import of SupabaseClient for endGuildBillingBeforeDelete (as lib/billing/sync.ts does). Routes pass the real client from getStripe() straight in; quick task 260921-w4u proved a Stripe instance satisfies such a port with no cast. If tsc rejects it, use a two-line adapter object whose list and cancel delegate to the Stripe instance, and record that in the SUMMARY.
- D-02 (what is cancelled, OD-1 A): list with exactly { customer: row.stripe_customer_id, limit: 100 } and no status parameter (the SDK documents that the default listing returns every subscription that is not canceled). Cancel each listed subscription whose metadata.guild_id equals the guild id and whose status is not canceled or incomplete_expired, so trialing, active, past_due, unpaid, paused and incomplete (and gifted 100% off subscriptions, which are ordinary active ones) are all cancelled. Cancel with subscriptions.cancel(id, { cancellation_details: { comment: GUILD_DELETE_CANCELLATION_COMMENT } }) where the constant is 'Guild deleted' (visible only in the Stripe Dashboard); no invoice_now and no prorate, so Stripe's defaults apply: no further charge, pending prorations dropped, automatic collection of finalized invoices stopped. A listing with has_more true means more than 100 live subscriptions on one customer: cancel the listed ones and report failure (truncated), so the delete is blocked rather than leaving one behind. The ownership filter is strict equality with the guild id (resume-paused accepts any non-empty guild_id; here another guild's subscription on the same customer must survive).
- D-03 (nothing to cancel): no guild_subscriptions row, or a row whose stripe_customer_id is null (a guild that never subscribed, a complimentary guild whose tier was set by hand), returns nothing_to_cancel without touching Stripe, checked before anything else so free guilds never depend on Stripe. When getStripe() is null (billing not configured): a row whose status is canceled or incomplete_expired is nothing_to_cancel, any other row is not_configured.
- D-04 (order and failure, OD-2 A): in both routes the order is auth, input, permission pre-check, endGuildBillingBeforeDelete, delete_guild, then the existing success work. endGuildBillingBeforeDelete returns { ok: true, canceled } for nothing_to_cancel and canceled, { ok: false, status: 502, error: C-3 } for failed, { ok: false, status: 503, error: C-4 } for not_configured, and { ok: false, status: 500, error: "Couldn't delete guild. Try again." } when the guild_subscriptions read errors or throws. It never throws. When ok is false the route returns that status and error and does not call delete_guild. When delete_guild then fails, the route answers 500 with C-5 if canceled is non-empty, else the existing "Couldn't delete guild. Try again." A retry after a failure is safe: the next listing no longer contains what was already cancelled. OD-2 C variant: endGuildBillingBeforeDelete logs the failure and returns { ok: true, canceled } for failed and not_configured; C-3 and C-4 are unused; tests D7, D8, D11, M21, M22 and P2 expect the delete to proceed.
- D-05 (permission before any Stripe call): DELETE /api/guilds today relies on delete_guild's own is_guild_master guard, which would run after the cancel. Add supabase.rpc('is_guild_master', { target_guild_id: guild_id }) with the user session (EXECUTE is granted to authenticated by 20260930000200 line 148; the function is the exact rule delete_guild checks): error answers 500 with "Couldn't delete guild. Try again.", a result other than true answers 403 with C-2, both with no further call. POST /api/guilds/delete keeps its existing 404 and creator checks, which already run before the new step. Who may delete stays as it is (follow-up FU-1 of 261004-0ut owns that question).
- D-06 (admin bulk delete, OD-3 A): app/api/admin/clear-all-guilds/route.ts, after keepGuildId is resolved and before the first delete, reads guild_subscriptions guild_id where stripe_subscription_id is not null and status is not in (canceled, incomplete_expired), excluding keepGuildId when set. A read error answers 500 with the route's existing "Couldn't delete guilds. Try again."; any row answers 409 with { error: C-6, guild_ids } and deletes nothing. OD-3 C: skip D-06 (no change to that route, follow-up recorded).
- D-07 (webhook, OD-4 A): syncSubscriptionToGuild first looks the guild up by id with the service client: a lookup error returns { tier, error } (500 and a Stripe retry, as for every DB failure today); no row returns { tier, guildMissing: true } with no write; an upsert error whose code is '23503' (guild deleted between lookup and upsert) also returns guildMissing. The webhook route, when guildMissing, logs one line (an error line when the tier is pro, since that is a live subscription for a deleted guild; an info line otherwise), and when the tier is not pro calls syncPremiumDiscordRole(serviceSupabase, guildId, subscription.metadata?.user_id ?? null, false) inside its own try/catch (resolvePurchaser and the multi-guild guard work without the guild row), then answers { received: true } with status 200. It never calls Stripe to change the subscription and records no premium_subscription_started event. The daily /api/cron/sync-discord-premium stays the safety net.
- D-08 (delete confirmation): in the Delete Guild Confirmation Modal of GuildSettingsContent.tsx, render COPY C-1 as a paragraph with className "text-13 text-muted-foreground" at the top of ModalBody, only when isPro(activeGuild) (import isPro from @/domain/guild/feature-flags, as BillingSection does). Write the sentence as a JavaScript string inside braces so the apostrophes need no HTML escaping. The route error texts reach the owner through the existing showNotification in handleDeleteGuild; no other client change.
- D-09 (delivery and hygiene): commits in WT only, one per task, each ending with a blank line and "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; no migration; no push, no PR, no GitHub issue; no planning files in WT; neutral commit messages and PR body (describe the rule, not how billing could have continued); no em dash anywhere. No real Stripe call and no .env read: every test uses fakes. New log lines use a constant first argument and pass ids in an object as the second argument (CodeQL flags request-derived values in a format string; guild_id comes from the request body and subscription fields from the webhook payload).

## Open decisions (the orchestrator records the user's answer in Resolution before execution)

| ID | Question | Options and evidence | Recommendation | Resolution |
|----|----------|----------------------|----------------|------------|
| OD-1 | How should deleting a guild end its subscription? | A: cancel immediately with Stripe's defaults: no proration, no refund, no further charge (D-02). B: cancel immediately and refund the unused part of the period (needs the latest paid invoice's payment, an amount rule, and a refunds call; Stripe's prorate option only credits the customer balance, which is useless once the guild is gone; gifted and trialing subscriptions paid nothing). C: cancel at period end (cancel_at_period_end): the subscription stays live in Stripe for a guild that no longer exists, a past_due one keeps retrying its open invoice until then, and the owner can no longer reach the billing portal (POST /api/billing/portal needs the guild's row, which is gone). Evidence of what the app promises: app/components/landing/PremiumPricing.tsx 103-107 says you keep Premium until the end of the billing period if you cancel later (a guild that still exists); app/components/UpgradeModal.tsx 26 says Cancel anytime; app/terms/page.tsx has no subscription or refund terms; the delete card and modal (GuildSettingsContent.tsx 842-845 and 945-948) say nothing about billing. After a delete there is no guild left to use the paid time. B and C need re-planning. | A, and C-1 tells the owner; refunds on request stay a manual support action in the Stripe Dashboard | A (cancel immediately, no proration or refund; refunds by hand), user, 2026-10-04 |
| OD-2 | Order, and what happens when Stripe fails? | A: cancel first, then delete; any Stripe failure blocks the delete (502, C-3) and leaves the guild untouched; a cancel followed by a failed delete_guild answers 500 with C-5 (the guild still exists, and the customer.subscription.deleted webhook moves it to free). No new table or cron; a guild can never be deleted with a live subscription through these routes. Cost: a Stripe outage blocks deleting a guild that has a stored customer until Stripe recovers; guilds without one are never blocked. B: delete first, then cancel, and on failure store the subscription id in a new table retried by a cron (migration, cron route, alerting; re-plan). C: cancel first, but on a Stripe failure delete anyway and only log (the reported problem returns whenever Stripe fails). | A | A (cancel first; on a Stripe failure do not delete and show an error), user, 2026-10-04 |
| OD-3 | The admin clear-all-guilds route (development, or SUPER_ADMIN_IDS in production) deletes guild rows directly with the admin client. What about live subscriptions? | A: refuse with 409 and C-6 while any guild it would delete has a live guild_subscriptions row (D-06); a bulk tool makes no bulk Stripe writes, and the normal delete path cancels. B: cancel each through endGuildBillingBeforeDelete first and stop at the first failure (re-plan). C: leave it (record a follow-up). | A | A (admin bulk delete refuses with 409 while live subscriptions exist), user, 2026-10-04 |
| OD-4 | A webhook event arrives for a guild that no longer exists and the subscription is still live (only possible for guilds deleted before this fix, or a checkout completed while the guild was being deleted). | A: acknowledge (200), write nothing, log it as an error line, revoke the Discord role only when the tier is not pro; no Stripe write from the webhook (D-07). B: also cancel the subscription from the webhook. Against B: the webhook would cancel real subscriptions on the strength of "this database has no such guild", so any other environment that receives live-mode events with a different database (a preview, or a local stripe listen with live keys) would cancel paying customers; with OD-2 A the delete routes never leave a live subscription behind. B needs re-planning. | A | A (webhook acknowledges and logs, never changes the subscription), user, 2026-10-04 |
| OD-5 | Subscriptions of guilds deleted before this fix may still be live and billing. | A: no code. The SUMMARY gives the user a manual check: in the Stripe Dashboard (source system, nothing exported into chats or planning files) list subscriptions with status active, trialing, past_due, unpaid or paused, read each one's metadata guild_id, then run one read-only query in the Supabase SQL editor returning which of those guild ids have no guilds row; the user decides cancel and refund per customer in the Stripe Dashboard. After this ships, the webhook also logs such a subscription as an error line at its next event. B: a read-only script that lists them (calls the live Stripe API; separate quick task). | A (Premium launched 2026-08-26, so at most a handful; refunds are a support decision) | A (no code; the user checks the Stripe dashboard by hand with the read-only query), user, 2026-10-04 |

## COPY (user sign-off required; no em dash)

SIGN-OFF 2026-10-04: the user approved C-1 to C-6 as drafted and the reused texts.

SIGN-OFF: (blank; the orchestrator records the user's approval or edits here before execution)

- C-1, delete confirmation modal, shown only when isPro(activeGuild) (D-08): "Deleting this guild also cancels its Premium subscription right away. You won't be charged again, and the rest of the current billing period isn't refunded." (Written for OD-1 A. A complimentary guild is also Pro and would see it; it has no subscription to cancel.)
- C-2, DELETE /api/guilds 403 when is_guild_master is not true (D-05): "Only the guild master can delete this guild."
- C-3, 502 when Stripe failed and the guild was not deleted (D-04): "Couldn't cancel this guild's Premium subscription, so the guild wasn't deleted. Try again in a few minutes."
- C-4, 503 when billing is not configured and the stored subscription is live (D-03, D-04): "Billing is unavailable right now, so this guild can't be deleted yet. Try again later."
- C-5, 500 when a subscription was cancelled but delete_guild failed (D-04): "This guild's Premium subscription was cancelled, but the guild couldn't be deleted. Try again."
- C-6, admin clear-all 409 (D-06, admin-facing): "Some of these guilds still have a live Premium subscription. Delete them one at a time from Guild Settings, which cancels the subscription, then try again."
- Reused unchanged: "Couldn't delete guild. Try again." (both delete routes, and now also the failed is_guild_master or subscription read) and "Couldn't delete guilds. Try again." (admin route).
- Not user-facing: the Stripe cancellation comment "Guild deleted" (Stripe Dashboard only).
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261004-0ut-deleting-a-guild-works-when-reserve-runs/261004-0ut-SUMMARY.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/quick/260921-w4u-resume-paused-subscriptions-when-a-payme/260921-w4u-SUMMARY.md

Work locations: WT = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtstripe (branch fix/delete-guild-cancels-subscription from origin/main 80d437da, node_modules symlinked). SP = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad. Do not touch SP/wtrapi, SP/wtnotes, other worktrees or the main checkout's source files; never run git worktree prune. The Bash tool runs zsh: run the verify scripts and any bash one-liner with bash. Paths in this plan without a prefix are relative to WT.

## Investigation findings (verified in WT at 80d437da)

F1. Every guild delete path:

| Path | How it deletes | Stripe today | This plan |
|------|----------------|--------------|-----------|
| DELETE /api/guilds (app/api/guilds/route.ts 427-473), called by Guild Settings > Danger Zone (GuildSettingsContent.tsx 256-280) | supabase.rpc('delete_guild') with the user session; no permission check in the route, delete_guild raises 'Only the guild master can delete this guild' unless is_guild_master | nothing | Task 1 |
| POST /api/guilds/delete (app/api/guilds/delete/route.ts), no caller in the app | 404 and creator checks, then rpc('delete_guild') (fixed by 261004-0ut) | nothing | Task 2 |
| POST /api/admin/clear-all-guilds (development or SUPER_ADMIN_IDS) | admin client deletes from guilds directly (route.ts 117-131) | nothing | Task 2 (OD-3) |
| POST /api/guilds rollbacks (route.ts 149, 169, 289) | service role deletes a guild created in the same request | none possible: the guild has never been through checkout | unchanged |
| POST /api/user/delete-account | refuses while the user created any guild (route.ts 33-56); never deletes a guild | n/a | unchanged |

delete_guild itself never touches guild_subscriptions; the row goes through guild_subscriptions_guild_id_fkey ON DELETE CASCADE (supabase/migrations/20260826000000_guild_subscriptions.sql 20-22). Only the two routes call delete_guild (git grep).

F2. guild_subscriptions is written only by syncSubscriptionToGuild (lib/billing/sync.ts, upsert on guild_id, service role) from the Stripe webhook. It is read by the checkout route (customer reuse and trial rule), the portal route (needs stripe_customer_id, else 404), BillingSection.tsx and usePremiumCheckout.ts (user session, is_guild_officer select policy). guilds.subscription_tier is the entitlement the app reads; it is set to pro or free by the same sync (tierForStatus: active, trialing, past_due are pro).

F3. Stripe ids: one guild_subscriptions row per guild holds stripe_customer_id, stripe_subscription_id, status and period fields of the last synced subscription. Checkout reuses the stored customer, otherwise Stripe creates one from the buyer's email, so a customer normally belongs to one guild; Checkout writes metadata guild_id (session) and guild_id plus user_id (subscription_data) (checkout/route.ts 89-92). A paused guild (tier free) can reach checkout again, so more than one subscription per guild is possible on the stored customer; listing by customer and filtering by metadata.guild_id finds all of them.

F4. Webhook today (app/api/webhooks/stripe/route.ts): subscription events and checkout.session.completed call syncSubscriptionToGuild; for a guild that no longer exists the upsert fails on the foreign key, the route answers 500 (line 203) and Stripe retries the event with backoff for days and can disable the endpoint, which stops tier sync for every guild. With cancel-before-delete, every Premium guild deletion produces a customer.subscription.deleted event that usually arrives after delete_guild commits, so Task 3 must ship in the same PR as Tasks 1 and 2. customer.subscription.deleted is already among the endpoint's events (route doc comment), so no Stripe Dashboard change is needed. trial_will_end and payment_method.attached already answer 200 whatever happens (own try/catch, no guild write).

F5. Branches: complimentary guilds have tier pro set by hand and no row, or a row with no customer (BillingSection shows "Premium is active (complimentary)."); gift codes are 100% off coupons, forever or repeating (scripts/lib/gift-code.ts 208-218), redeemed through Checkout, so a gifted guild has an ordinary active Stripe subscription that would start billing when a repeating coupon ends; trials are trialing subscriptions that pause at trial end without a card (checkout route trial_settings); paused subscriptions are resumed by payment_method.attached (lib/billing/resume-paused.ts) for any guild_id, so a paused subscription left behind by a deleted guild could even be revived by a later card attach. All of these are cancelled by D-02 or skipped by D-03.

F6. Premium Discord role: the webhook calls syncPremiumDiscordRole after a successful sync; it resolves the purchaser from metadata.user_id (falling back to guilds.created_by) and keeps the role while the purchaser created another Pro guild. With the guild gone the sync failed first, so the role stayed until the daily /api/cron/sync-discord-premium (06:30 UTC) revoked it. D-07 revokes it on the deletion event itself.

F7. Stripe SDK 22.5.0 (node_modules/stripe/esm/resources/Subscriptions.d.ts): cancel "cancels a customer's subscription immediately. The customer won't be charged again", pending prorations are removed when invoice_now and prorate are false (both default false), and cancellation stops automatic collection of finalized invoices; list "by default returns a list of subscriptions that have not been canceled"; cancel params accept cancellation_details.comment.

## Interfaces the executor creates (lib/billing/cancel-guild-subscription.ts)

- GUILD_DELETE_CANCELLATION_COMMENT = 'Guild deleted'.
- GUILD_DELETE_BILLING_ERRORS, as const, keys deleteFailed ("Couldn't delete guild. Try again."), cancelFailed (C-3), billingUnavailable (C-4), canceledButNotDeleted (C-5).
- ENDED_SUBSCRIPTION_STATUSES: readonly ['canceled', 'incomplete_expired'].
- interface CancellableSubscriptionLike { id: string; status: string; metadata?: { [key: string]: string } | null }.
- cancellableSubscriptionIds(subs: CancellableSubscriptionLike[] | null | undefined, guildId: string): string[], input order kept.
- interface StripeCancelPort { subscriptions: { list(params: { customer: string; limit: number }): Promise<{ data: CancellableSubscriptionLike[]; has_more: boolean }>; cancel(id: string, params: { cancellation_details: { comment: string } }): Promise<unknown> } }.
- interface GuildSubscriptionRowLike { stripe_customer_id: string | null; status: string | null }.
- interface CancelOutcome { result: 'nothing_to_cancel' | 'canceled' | 'failed' | 'not_configured'; canceled: string[]; failed: string[]; listFailed: boolean; truncated: boolean }. result is failed when the listing failed, any cancel failed or has_more is true (truncated); otherwise canceled when at least one id was cancelled, else nothing_to_cancel.
- cancelGuildSubscriptions(stripe: StripeCancelPort | null, row: GuildSubscriptionRowLike | null, guildId: string): Promise<CancelOutcome>, never rejects.
- type GuildDeleteBillingResult = { ok: true; canceled: string[] } | { ok: false; status: 500 | 502 | 503; error: string }.
- endGuildBillingBeforeDelete(serviceSupabase: SupabaseClient, stripe: StripeCancelPort | null, guildId: string): Promise<GuildDeleteBillingResult>, reads from('guild_subscriptions').select('stripe_customer_id, status').eq('guild_id', guildId).maybeSingle(), never throws, logs cancelled ids (info) and failures (error) with constant messages.

lib/billing/sync.ts after Task 3: syncSubscriptionToGuild(...) returns Promise<{ tier: string; error?: string; guildMissing?: true }>.

## Coverage audit (task description to plan)

| Source item | Where |
|-------------|-------|
| Verify every delete path, guild_subscriptions writes and reads, how Stripe ids are stored | F1, F2, F3 |
| Webhook handlers when the guild row is gone | F4, D-07, Task 3 |
| Gift codes, comped guilds, trials, paused subscriptions | F5, D-02, D-03, tests M5 to M10, M16 |
| Premium Discord role sync | F6, D-07, test W1 |
| Cancel immediately or at period end, proration or refund, with evidence | OD-1 |
| Ordering and failure behaviour | OD-2, D-04 |
| Existing Stripe client and an injected port, tests for every branch (no subscription, active, trialing, paused, already canceled, Stripe error, comped or gift) | D-01, Task 1 behavior M1 to M23 |
| Webhooks tolerate deleted guilds without errors or retries | D-07, Task 3 |
| Delete confirmation copy | D-08, COPY C-1 |
| Admin path | D-06, OD-3 |
| Already-orphaned subscriptions | OD-5 |
| Public repo, no issue, no real Stripe, no .env | D-09 |

No item is missing.
</context>

<tasks>

<task type="tracer">
  <name>Task 1: End-to-end: deleting a Premium guild from Guild Settings cancels its subscription first (module, DELETE /api/guilds, modal copy)</name>
  <files>lib/billing/cancel-guild-subscription.ts, lib/billing/__tests__/cancel-guild-subscription.test.ts, app/api/guilds/route.ts, app/api/guilds/__tests__/route-delete.test.ts, app/(app)/guild-settings/components/GuildSettingsContent.tsx</files>
  <precondition>OD-1 to OD-5 have a Resolution and the COPY block is signed off; OD-1 is A, OD-2 is A or C, OD-4 is A (anything else: stop and return a checkpoint, the plan needs re-planning); WT is on fix/delete-guild-cancels-subscription at 80d437da with an empty git status --porcelain; SP/new-fails.sh exists.</precondition>
  <reversibility rating="reversible">App code only, one commit; reverting it restores the previous delete route. A subscription cancelled in production cannot be un-cancelled, which is why OD-1 and C-1 need sign-off before execution.</reversibility>
  <read_first>lib/billing/resume-paused.ts; lib/billing/__tests__/resume-paused.test.ts lines 1-60 and its resumePausedSubscriptions describe block; lib/billing/stripe.ts; lib/billing/sync.ts; app/api/guilds/route.ts lines 1-12 and 427-475; app/api/guilds/__tests__/route.test.ts lines 1-123; app/(app)/guild-settings/components/GuildSettingsContent.tsx lines 1-40 and 940-985; domain/guild/feature-flags.ts lines 30-37</read_first>
  <behavior>
    Module (lib/billing/__tests__/cancel-guild-subscription.test.ts, inline vi.fn fakes, no vi.mock, no stripe import):
    - M1: cancellableSubscriptionIds returns [] for null, undefined and [].
    - M2: keeps, in input order, subscriptions of the guild with status active, trialing, past_due, unpaid, paused and incomplete.
    - M3: drops canceled and incomplete_expired.
    - M4: drops another guild's guild_id, no metadata, metadata without guild_id, and an empty guild_id.
    - M5: row null (never subscribed, or a complimentary guild with no row): nothing_to_cancel, list and cancel never called.
    - M6: row with stripe_customer_id null (complimentary): nothing_to_cancel, no Stripe call.
    - M7: active: list called once with exactly { customer: 'cus_1', limit: 100 }; cancel called once with 'sub_1' and { cancellation_details: { comment: GUILD_DELETE_CANCELLATION_COMMENT } }; result canceled, canceled ['sub_1'], failed [].
    - M8: trialing is cancelled (canceled ['sub_1']).
    - M9: paused is cancelled.
    - M10: a gifted subscription (status active, its 100% off discount present on the object) is cancelled like any other.
    - M11: already canceled: a list of [] gives nothing_to_cancel with no cancel call; a list holding only a canceled subscription of the guild also gives nothing_to_cancel with no cancel call.
    - M12: another guild's live subscription on the same customer is never cancelled; result nothing_to_cancel.
    - M13: list rejects: result failed, listFailed true, cancel never called, and the call resolves (expect(...).resolves).
    - M14: two live subscriptions and cancel rejects for the first: the second is still cancelled; result failed, canceled ['sub_2'], failed ['sub_1'].
    - M15: has_more true: the listed subscriptions are cancelled, result failed, truncated true.
    - M16: stripe null: a row { stripe_customer_id: 'cus_1', status: 'active' } gives not_configured; a row { stripe_customer_id: 'cus_1', status: 'canceled' } gives nothing_to_cancel; neither throws.
    - M17: endGuildBillingBeforeDelete reads guild_subscriptions with a select containing stripe_customer_id and status and eq('guild_id', guildId).
    - M18: read returns an error: { ok: false, status: 500, error: deleteFailed }, no Stripe call.
    - M19: no row: { ok: true, canceled: [] }.
    - M20: live subscription: { ok: true, canceled: ['sub_1'] }.
    - M21: cancel failure: { ok: false, status: 502, error: C-3 } (OD-2 C: { ok: true }).
    - M22: stripe null with a live row: { ok: false, status: 503, error: C-4 } (OD-2 C: { ok: true }).
    - M23: the read throws: { ok: false, status: 500 }, the call resolves.
    DELETE /api/guilds (app/api/guilds/__tests__/route-delete.test.ts, the real billing module, a fake Stripe and fake Supabase clients writing to one ordered call log):
    - D1: no user: 401, empty log. D2: no guild_id: 400, empty log.
    - D3: is_guild_master returns false: 403 { error: C-2 }, log exactly ['rpc:is_guild_master'].
    - D4: is_guild_master returns an error: 500 { error: "Couldn't delete guild. Try again." }, log exactly ['rpc:is_guild_master'].
    - D5: no subscription row: 200 { success: true, message: 'Guild deleted successfully' }, log exactly ['rpc:is_guild_master', 'read:guild_subscriptions', 'rpc:delete_guild'].
    - D6: active subscription: log exactly ['rpc:is_guild_master', 'read:guild_subscriptions', 'stripe:list', 'stripe:cancel:sub_1', 'rpc:delete_guild'], 200.
    - D7: cancel rejects: 502 { error: C-3 }, no 'rpc:delete_guild'. D8: list rejects: 502 { error: C-3 }, no 'rpc:delete_guild'.
    - D9: cancel succeeds, delete_guild returns an error: 500 { error: C-5 }.
    - D10: no subscription row, delete_guild returns an error: 500 { error: "Couldn't delete guild. Try again." }.
    - D11: getStripe returns null and the row is live: 503 { error: C-4 }, no 'rpc:delete_guild'.
    - D12: the subscription read returns an error: 500 { error: "Couldn't delete guild. Try again." }, no Stripe call, no 'rpc:delete_guild'.
    (OD-2 C: D7, D8 and D11 expect 200 and 'rpc:delete_guild' last.)
  </behavior>
  <action>
Step 0, baseline (per D-09), before any change, from WT with bash and a 600000 ms timeout: write SP/baseline-gxl-vitest.txt as the line HEAD= plus git rev-parse HEAD, then the full npx vitest run output (stdout and stderr), then the line EXIT= plus its exit code; write SP/baseline-gxl-tsc.txt the same way for npx tsc --noEmit.

Step 1, module tests first (per D-01, D-02, D-03, D-04): create lib/billing/__tests__/cancel-guild-subscription.test.ts with rows M1 to M23 of the behavior block, importing from '../cancel-guild-subscription'. Fakes: a stripe object whose subscriptions.list and subscriptions.cancel are vi.fn with per-test resolved or rejected values; for M17 to M23 a service client stand-in whose from(table).select(columns).eq(column, value).maybeSingle() records table, columns and filter and resolves the test's { data, error } (or rejects for M23), passed with a cast to never. Silence console.error and console.log with vi.spyOn in beforeEach and restore in afterEach. Run it: it fails because the module does not exist.

Step 2, module (per D-01 to D-04): create lib/billing/cancel-guild-subscription.ts with the exports listed under "Interfaces the executor creates", a header comment in the style of resume-paused.ts (why the port exists; that free and complimentary guilds never reach Stripe; that cancellation is immediate with Stripe's defaults per OD-1 A; that the strict guild id filter protects another guild's subscription on the same customer). cancelGuildSubscriptions order: D-03 checks, then the stripe-null rule, then list inside try/catch (catch logs with a constant message and returns failed with listFailed), then cancellableSubscriptionIds, then a loop with a try/catch per id, then the result per the Interfaces rules. endGuildBillingBeforeDelete wraps the read and the call in one try/catch and maps the outcome per D-04 (OD-2 C variant as stated in D-04). Constant log messages, ids in a second object argument (D-09). Run Step 1's test: all pass.

Step 3, route tests first (per D-04, D-05): create app/api/guilds/__tests__/route-delete.test.ts, first line the node environment comment of route.test.ts (with its two explanatory lines), importing DELETE from '../route'. Copy the vi.mock lines of route.test.ts lines 11-37 (server, service-role, expansionSeeder, cache, user-bundle, analytics, funnel, discord-server-access) so the module loads the same way, and add vi.mock('@/lib/billing/stripe', () => ({ getStripe: vi.fn(), getPriceId: vi.fn() })). Do not mock the billing module. One ordered log array per test: the user-session fake's rpc(name, args) pushes 'rpc:' plus name and resolves is_guild_master to { data: opts.isMaster ?? true, error: opts.masterError ?? null } and delete_guild to { error: opts.deleteError ?? null }; the service fake's from('guild_subscriptions').select().eq().maybeSingle() pushes 'read:guild_subscriptions' and resolves { data: opts.subRow ?? null, error: opts.subError ?? null }; the fake Stripe's list pushes 'stripe:list' and resolves { data: opts.subs ?? [], has_more: false } or rejects, and cancel(id) pushes 'stripe:cancel:' plus id and resolves or rejects per test. Live row: { stripe_customer_id: 'cus_1', status: 'active' }; live subscription: { id: 'sub_1', status: 'active', metadata: { guild_id: GUILD_ID, user_id: USER_ID } }. Request: a Request with method DELETE and a JSON body, cast to any. Write D1 to D12. Run it: D3, D6 to D9, D11 and D12 fail.

Step 4, route (per D-04, D-05): in app/api/guilds/route.ts add imports of getStripe from '@/lib/billing/stripe' and of endGuildBillingBeforeDelete and GUILD_DELETE_BILLING_ERRORS from '@/lib/billing/cancel-guild-subscription'. In DELETE, after the guild_id check and before the delete_guild call: the is_guild_master pre-check of D-05 (C-2 text written inline), then the billing step of D-04 with createServiceRoleClient() and getStripe(), returning its status and error when ok is false. In the existing delete_guild error branch keep the console.error line and answer 500 with GUILD_DELETE_BILLING_ERRORS.canceledButNotDeleted when billing.canceled is non-empty, else the existing text. Update the comment above the rpc call so it says the permission was checked above and billing ended first. Nothing else in the route changes. Run Step 3's test and app/api/guilds/__tests__/route.test.ts: all pass.

Step 5, modal copy (per D-08): in GuildSettingsContent.tsx import isPro from '@/domain/guild/feature-flags' and add, as the first child of the delete modal's ModalBody, the C-1 paragraph rendered only when isPro(activeGuild) is true, exactly as D-08 describes. No other change in the file.

Step 6, gates and commit (per D-09): npx eslint --max-warnings 0 on the five files and npx tsc --noEmit; fix anything in these files only. Stage exactly the five files. Subject "fix(billing): deleting a guild cancels its Premium subscription first". Body, three neutral lines: before deleting a guild, DELETE /api/guilds now checks the caller may delete it, then cancels every live Stripe subscription of the guild (immediately, no proration) and deletes nothing when Stripe fails; guilds without a stored Stripe customer make no Stripe call; the delete confirmation of a Premium guild says the subscription is cancelled. A blank line, then the trailer line.
  </action>
  <verify>
    <automated>Write this block to SP/verify-gxl-task1.sh and run bash SP/verify-gxl-task1.sh: WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtstripe; SP=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad; M=lib/billing/cancel-guild-subscription.ts; MT=lib/billing/__tests__/cancel-guild-subscription.test.ts; R=app/api/guilds/route.ts; RT=app/api/guilds/__tests__/route-delete.test.ts; UI='app/(app)/guild-settings/components/GuildSettingsContent.tsx'; cd "$WT" && test -z "$(git status --porcelain)" && grep -q '^EXIT=' "$SP/baseline-gxl-vitest.txt" && grep -q '^EXIT=' "$SP/baseline-gxl-tsc.txt" && npx vitest run "$MT" "$RT" app/api/guilds/__tests__/route.test.ts && npx eslint --max-warnings 0 "$M" "$MT" "$R" "$RT" "$UI" && npx tsc --noEmit && grep -q "rpc('is_guild_master'" "$R" && grep -q 'endGuildBillingBeforeDelete(' "$R" && grep -q 'isPro(activeGuild)' "$UI" && ! grep -q "from 'stripe'" "$M" && [ "$(git rev-list --count 80d437da..HEAD)" = "1" ] && [ "$(git show --name-only --format= HEAD | grep . | LC_ALL=C sort | tr '\n' ' ')" = "$UI $RT $R $MT $M " ] && [ "$(git log -1 --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" = "1" ]</automated>
  </verify>
  <done>Baselines exist; the module tests (M1 to M23) and route tests (D1 to D12) failed before their code and pass after; a free or complimentary guild deletes with no Stripe call; a Premium guild's live subscriptions are cancelled before delete_guild, and a Stripe failure blocks the delete with C-3; a caller who may not delete gets 403 with no Stripe call; the modal shows C-1 for a Premium guild; eslint and tsc pass; one commit holds exactly the five files, with the trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The other delete paths: POST /api/guilds/delete ends billing first, the admin bulk delete refuses live subscriptions</name>
  <files>app/api/guilds/delete/route.ts, app/api/guilds/delete/__tests__/route.test.ts, app/api/admin/clear-all-guilds/route.ts, app/api/admin/clear-all-guilds/__tests__/route.test.ts</files>
  <precondition>Task 1 is committed (git rev-list --count 80d437da..HEAD is 1, WT clean); OD-3 has a Resolution (A or C; B: stop, re-plan).</precondition>
  <reversibility rating="reversible">App code only, one commit.</reversibility>
  <read_first>app/api/guilds/delete/route.ts; app/api/guilds/delete/__tests__/route.test.ts; app/api/admin/clear-all-guilds/route.ts; utils/supabase/admin.js (export name only); lib/billing/cancel-guild-subscription.ts (from Task 1, exports only)</read_first>
  <behavior>
    POST /api/guilds/delete (extend the existing file):
    - T1 to T6b keep passing unchanged in what they assert, with a default service fake that has no subscription row and getStripe returning a fake whose list resolves { data: [], has_more: false }.
    - T4 (creator check, 403) and T3 (404) additionally assert no guild_subscriptions read and no Stripe call (P4).
    - T5 (delete_guild error, no subscription) still answers exactly "Couldn't delete guild. Try again.".
    - P1: live subscription: ordered log ['read:guild_subscriptions', 'stripe:list', 'stripe:cancel:sub_1', 'rpc:delete_guild'], 200 with the existing body.
    - P2: cancel rejects: 502 { error: C-3 }, rpcCalls [] and writes [] (OD-2 C: 200 and the rpc called).
    - P3: cancel succeeds, delete_guild returns an error: 500 { error: C-5 }, writes [].
    Admin clear-all-guilds (new file; OD-3 A only):
    - A1: the live-subscription read returns [{ guild_id: 'g-live' }]: 409 { error: C-6, guild_ids: ['g-live'] }, no delete and no update recorded on any table.
    - A2: the read returns []: the existing deletes run (the guilds delete is recorded) and 200 with the existing message.
    - A3: keep_guild_name resolves to 'g-keep': the guild_subscriptions read carries neq('guild_id', 'g-keep') plus the two not filters (stripe_subscription_id is null, status in canceled and incomplete_expired); with [] it proceeds.
    - A4: the read returns an error: 500 { error: "Couldn't delete guilds. Try again." }, no delete recorded.
    - A5: a signed-in user who is not a super admin: 403 and no guild_subscriptions read.
  </behavior>
  <action>
Step 1, POST /api/guilds/delete tests first (per D-04, D-05): in app/api/guilds/delete/__tests__/route.test.ts add vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() })) and vi.mock('@/lib/billing/stripe', () => ({ getStripe: vi.fn(), getPriceId: vi.fn() })); in beforeEach set createServiceRoleClient to a service fake (guild_subscriptions maybeSingle resolving the test's row, default null) and getStripe to a fake Stripe (default empty list), both pushing to one ordered log shared with the existing rpc recorder (make the existing rpc stand-in also push 'rpc:' plus name). Extend T3 and T4 and add P1 to P3 per the behavior block. Run it: P1 to P3 fail, the rest pass.

Step 2, route (per D-04): in app/api/guilds/delete/route.ts import createServiceRoleClient, getStripe, endGuildBillingBeforeDelete and GUILD_DELETE_BILLING_ERRORS; after the creator check and before the rpc call run the billing step exactly as in DELETE /api/guilds (Task 1 Step 4), and make the delete_guild error branch answer C-5 when billing.canceled is non-empty, else the existing text. Nothing else changes. Run the test: all pass.

Step 3, admin tests first (OD-3 A, per D-06; OD-3 C: skip Steps 3 and 4): create app/api/admin/clear-all-guilds/__tests__/route.test.ts with the node environment comment line. Set SUPER_ADMIN_IDS to 'admin-1' inside vi.hoisted so the route's module-level list sees it. Mock '@/utils/supabase/server' (createClient resolving { auth: { getUser } } with the test's user) and '@/utils/supabase/admin' (createAdminClient returning a recording fake). The fake builder supports select, ilike, single (guilds by name resolving the test's keep row), not, neq, eq, delete and update, records every delete and update with its filters and the guild_subscriptions read with its select and filters, and resolves awaited chains with { data, error } from test options (guild_subscriptions: the test's rows or error; others: { data: [], error: null }). Write A1 to A5. Run it: A1, A3 and A4 fail.

Step 4, admin route (per D-06): insert the live-subscription read after the keepGuildId block and before the character_guild_memberships delete: from('guild_subscriptions').select('guild_id').not('stripe_subscription_id', 'is', null).not('status', 'in', '(canceled,incomplete_expired)'), plus .neq('guild_id', keepGuildId) when keepGuildId is set; on error console.error with a constant message and the error object, then 500 with the existing "Couldn't delete guilds. Try again."; when any row comes back, 409 with { error: C-6, guild_ids }. A short comment says why (the normal delete path cancels the subscription; this bulk tool does not call Stripe). Run the test: all pass.

Step 5, gates and commit (per D-09): npx eslint --max-warnings 0 on the changed files; npx tsc --noEmit. Stage exactly the files of this task. Subject "fix(billing): every guild delete path handles a live Premium subscription". Body, neutral: POST /api/guilds/delete ends the guild's Stripe billing before delete_guild, the same way as DELETE /api/guilds; the admin clear-all-guilds route deletes nothing while a guild it would delete has a live subscription (omit this clause with OD-3 C). A blank line, then the trailer line.
  </action>
  <verify>
    <automated>Write this block to SP/verify-gxl-task2.sh with OD3 set to the OD-3 Resolution letter on its first line, and run bash SP/verify-gxl-task2.sh: OD3=A; WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtstripe; P=app/api/guilds/delete/route.ts; PT=app/api/guilds/delete/__tests__/route.test.ts; A=app/api/admin/clear-all-guilds/route.ts; AT=app/api/admin/clear-all-guilds/__tests__/route.test.ts; cd "$WT" && test -z "$(git status --porcelain)" && npx vitest run "$PT" && grep -q 'endGuildBillingBeforeDelete(' "$P" && if [ "$OD3" = "A" ]; then npx vitest run "$AT" && grep -q 'incomplete_expired' "$A" && npx eslint --max-warnings 0 "$P" "$PT" "$A" "$AT" && EXPECT="$AT $A $PT $P "; else npx eslint --max-warnings 0 "$P" "$PT" && EXPECT="$PT $P "; fi && npx tsc --noEmit && [ "$(git rev-list --count 80d437da..HEAD)" = "2" ] && [ "$(git show --name-only --format= HEAD | grep . | LC_ALL=C sort | tr '\n' ' ')" = "$EXPECT" ] && [ "$(git log -1 --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" = "1" ]</automated>
  </verify>
  <done>POST /api/guilds/delete cancels live subscriptions after its permission checks and before delete_guild, blocks on a Stripe failure, and keeps every existing answer; with OD-3 A the admin bulk delete answers 409 and deletes nothing while a live subscription exists, and otherwise behaves as before; new tests failed before the code and pass after; eslint and tsc pass; the second commit holds exactly this task's files, with the trailer.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Stripe events for a deleted guild are acknowledged without a write; full regression and PR body</name>
  <files>lib/billing/sync.ts, lib/billing/__tests__/sync.test.ts, app/api/webhooks/stripe/route.ts, app/api/webhooks/stripe/__tests__/route.test.ts, SP/pr-body-gxl.md</files>
  <precondition>Tasks 1 and 2 are committed (git rev-list --count 80d437da..HEAD is 2, WT clean); OD-4 is A.</precondition>
  <reversibility rating="reversible">App code only, one commit.</reversibility>
  <read_first>lib/billing/sync.ts; app/api/webhooks/stripe/route.ts; lib/billing/discord-premium.ts lines 1-60; lib/billing/purchaser.ts</read_first>
  <behavior>
    syncSubscriptionToGuild (lib/billing/__tests__/sync.test.ts, a recording fake client, no vi.mock):
    - S1: guild exists, subscription active: the guilds lookup, then the guild_subscriptions upsert with guild_id, the snapshot fields and updated_at and onConflict 'guild_id', then the guilds update { subscription_tier: 'pro' } with eq('id', guildId); returns { tier: 'pro' }.
    - S2: lookup returns no row: { tier, guildMissing: true }, no upsert, no update.
    - S3: lookup returns an error: error starting with 'guild lookup failed', no upsert.
    - S4: upsert returns { code: '23503' }: { tier, guildMissing: true }, no update.
    - S5: upsert returns another error: error 'guild_subscriptions upsert failed: ' plus its message (unchanged text).
    - S6: tier update error: error 'subscription_tier update failed: ' plus its message (unchanged text).
    Webhook (app/api/webhooks/stripe/__tests__/route.test.ts; the real sync module; fakes for getStripe, createServiceRoleClient, syncPremiumDiscordRole, trackEvent, notifyTrialEnding):
    - W1: customer.subscription.deleted, status canceled, guild missing: 200 { received: true }; no upsert, no guilds update; syncPremiumDiscordRole called once with (the service fake, 'g-gone', 'user-1', false); the fake Stripe's subscriptions.cancel never called.
    - W2: customer.subscription.updated, status active, guild missing: 200; no write; syncPremiumDiscordRole not called; console.error called with a constant string first and an object containing subscriptionId 'sub_1' and guildId 'g-gone' second.
    - W3: checkout.session.completed, subscription retrieved active, guild missing: 200; no write; trackEvent not called.
    - W4: guild lookup error: 500; no upsert.
    - W5: upsert error code 23503: 200; no guilds update.
    - W6: existing guild, status active: upsert and update recorded, syncPremiumDiscordRole called with isPro true, 200.
    - W7: existing guild, customer.subscription.deleted: upsert with status canceled, update { subscription_tier: 'free' }, syncPremiumDiscordRole called with false, 200.
  </behavior>
  <action>
Step 1, sync tests first (per D-07): create lib/billing/__tests__/sync.test.ts with S1 to S6. The fake client's from('guilds').select('id').eq('id', id).maybeSingle() resolves the test's lookup; from('guild_subscriptions').upsert(payload, options) records and resolves { error }; from('guilds').update(payload).eq(column, value) records and resolves { error }. Run it: S2 to S4 fail.

Step 2, sync (per D-07): in lib/billing/sync.ts add the lookup before the upsert and the 23503 rule after it, widen the return type with guildMissing?: true, and extend the doc comment: why the lookup exists (a webhook event can arrive after its guild was deleted, and deleting a Premium guild now cancels its subscription first, so customer.subscription.deleted routinely arrives for a deleted guild) and why 23503 is treated the same (a delete between the lookup and the upsert). Run: all pass.

Step 3, webhook tests first (per D-07): create app/api/webhooks/stripe/__tests__/route.test.ts with the node environment comment line. vi.mock '@/lib/billing/stripe' (getStripe), '@/utils/supabase/service-role' (createServiceRoleClient), '@/lib/billing/discord-premium' (syncPremiumDiscordRole), '@/utils/analytics/server' (trackEvent), '@/lib/billing/trial-ending' (notifyTrialEnding). vi.stubEnv STRIPE_WEBHOOK_SECRET to 'whsec_test' in beforeEach and vi.unstubAllEnvs in afterEach. The fake Stripe has webhooks.constructEvent returning the test's event, subscriptions.retrieve resolving the test's subscription, and subscriptions.cancel as a vi.fn that must stay uncalled. The service fake is the sync.test.ts recorder with the test's lookup, upsert and update results. Subscriptions carry metadata { guild_id, user_id: 'user-1' } and an items.data[0] with a price id and a monthly interval. Requests: a POST Request with a stripe-signature header and any text body, cast to any. Spy on console.error and console.log. Write W1 to W7. Run it: W1 to W3 and W5 fail.

Step 4, webhook (per D-07): in app/api/webhooks/stripe/route.ts destructure guildMissing from syncSubscriptionToGuild and, immediately after that call, add the guildMissing branch of D-07: constant log messages with { eventType, subscriptionId, guildId, status } as the second argument (error line when tier is pro, info line otherwise), the Discord revoke inside its own try/catch when tier is not pro, then return { received: true }. Add one paragraph to the route's doc comment: events can arrive after their guild was deleted (deleting a Premium guild cancels its subscription first); they are acknowledged with 200 and nothing is written, so Stripe does not retry; the route never changes a subscription. Nothing else in the route changes. Run: all pass, and the sync tests still pass.

Step 5, commit (per D-09): npx eslint --max-warnings 0 on the four files; npx tsc --noEmit. Stage exactly the four files. Subject "fix(billing): Stripe events for a deleted guild are acknowledged without a write". Body, neutral: syncSubscriptionToGuild reports a missing guild instead of failing on the foreign key, and the webhook answers 200 for such events without writing (and removes the purchaser's Premium Discord role when the subscription has ended), so the cancellation event that follows a guild delete is not retried. A blank line, then the trailer line.

Step 6, full verification (per D-09), in this order: (1) text gate: git diff 80d437da...HEAD -U0 to SP/final-gxl-diff.txt; its added lines and git log 80d437da..HEAD --format=%B are non-empty and contain no em dash; a failure is fixed with one more commit touching only the affected files, with the trailer. (2) npx tsc --noEmit to SP/final-gxl-tsc.txt (exit 0) and npx eslint --max-warnings 0 on every changed file to SP/final-gxl-eslint.txt (exit 0). (3) PR body SP/pr-body-gxl.md: a suggested title line "Deleting a Premium guild cancels its subscription", then Summary (two or three sentences: deleting a guild removed its subscription record but left the Stripe subscription live; both delete routes now cancel the guild's live subscriptions first and delete nothing when Stripe fails; webhook events for a deleted guild are acknowledged); Changes (the module, the two routes and their permission check, the admin refusal per OD-3, the sync and webhook change, the modal line); Tests (the new and extended test files with their row counts; full suite with no new failures; every Stripe call in tests is a fake); Deploy (one app PR, no migration, normal merge; the webhook change ships with the cancel so the customer.subscription.deleted event that follows each cancel is acknowledged; no Stripe Dashboard change, that event is already subscribed); a blank line and the line "🤖 Generated with [Claude Code](https://claude.com/claude-code)". Neutral wording, no follow-ups, no em dash. (4) Last, with no change in WT while it runs: the full suite to SP/final-gxl-vitest.txt in the baseline layout (first line HEAD=, last line EXIT=), foreground, 600000 ms timeout; gate it with sh SP/new-fails.sh SP/baseline-gxl-vitest.txt SP/final-gxl-vitest.txt run from WT. Any later commit means running the suite again. (5) WT clean, branch changes exactly the files of the OD-3 resolution, no migration file, lib/database.types.ts unchanged, no planning files in WT, no upstream, nothing pushed.
  </action>
  <verify>
    <automated>Write this block to SP/verify-gxl-task3.sh with OD3 set to the OD-3 Resolution letter on its first line, and run bash SP/verify-gxl-task3.sh: OD3=A; WT=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/wtstripe; SP=/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad; if [ "$OD3" = "A" ]; then FILES="app/(app)/guild-settings/components/GuildSettingsContent.tsx app/api/admin/clear-all-guilds/__tests__/route.test.ts app/api/admin/clear-all-guilds/route.ts app/api/guilds/__tests__/route-delete.test.ts app/api/guilds/delete/__tests__/route.test.ts app/api/guilds/delete/route.ts app/api/guilds/route.ts app/api/webhooks/stripe/__tests__/route.test.ts app/api/webhooks/stripe/route.ts lib/billing/__tests__/cancel-guild-subscription.test.ts lib/billing/__tests__/sync.test.ts lib/billing/cancel-guild-subscription.ts lib/billing/sync.ts "; else FILES="app/(app)/guild-settings/components/GuildSettingsContent.tsx app/api/guilds/__tests__/route-delete.test.ts app/api/guilds/delete/__tests__/route.test.ts app/api/guilds/delete/route.ts app/api/guilds/route.ts app/api/webhooks/stripe/__tests__/route.test.ts app/api/webhooks/stripe/route.ts lib/billing/__tests__/cancel-guild-subscription.test.ts lib/billing/__tests__/sync.test.ts lib/billing/cancel-guild-subscription.ts lib/billing/sync.ts "; fi; cd "$WT" && test -z "$(git status --porcelain)" && npx vitest run lib/billing/__tests__/sync.test.ts app/api/webhooks/stripe/__tests__/route.test.ts lib/billing/__tests__/cancel-guild-subscription.test.ts app/api/guilds/__tests__/route-delete.test.ts app/api/guilds/delete/__tests__/route.test.ts && grep -q 'guildMissing' lib/billing/sync.ts && grep -q 'guildMissing' app/api/webhooks/stripe/route.ts && npx tsc --noEmit > "$SP/final-gxl-tsc.txt" 2>&1 && test -f "$SP/final-gxl-eslint.txt" && npx eslint --max-warnings 0 lib/billing/sync.ts lib/billing/__tests__/sync.test.ts app/api/webhooks/stripe/route.ts app/api/webhooks/stripe/__tests__/route.test.ts > /dev/null && grep -q '^EXIT=' "$SP/baseline-gxl-vitest.txt" && grep -q '^EXIT=' "$SP/final-gxl-vitest.txt" && test "$SP/final-gxl-vitest.txt" -nt "$(git rev-parse --git-path logs/HEAD)" && sh "$SP/new-fails.sh" "$SP/baseline-gxl-vitest.txt" "$SP/final-gxl-vitest.txt" && git diff 80d437da...HEAD -U0 > "$SP/final-gxl-diff.txt" && ADDED=$(grep '^+' "$SP/final-gxl-diff.txt" | grep -v '^+++') && [ -n "$ADDED" ] && MSGS=$(git log 80d437da..HEAD --format=%B) && [ -n "$MSGS" ] && EMDASH=$(printf '\342\200\224') && ! printf '%s\n%s\n' "$ADDED" "$MSGS" | grep -qF "$EMDASH" && test -s "$SP/pr-body-gxl.md" && ! grep -qF "$EMDASH" "$SP/pr-body-gxl.md" && N=$(git rev-list --count 80d437da..HEAD) && [ "$N" -ge 3 ] && [ "$(git log 80d437da..HEAD --format=%B | grep -c '^Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>$')" = "$N" ] && [ "$(git diff --name-only 80d437da...HEAD | LC_ALL=C sort | tr '\n' ' ')" = "$FILES" ] && test -z "$(git diff --name-only 80d437da...HEAD -- supabase lib/database.types.ts .planning)" && test -z "$(git status --porcelain)" && ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' > /dev/null 2>&1</automated>
    <human-check>Not blocking execution. After merge, optionally in Stripe test mode (local dev server with stripe listen, never live keys): create a guild, start a trial, delete the guild from Guild Settings; the test subscription shows Canceled with the comment "Guild deleted", the webhook log shows the deleted-guild info line with status 200, and a free guild still deletes with no Stripe call. Then run the OD-5 A orphan check in the Stripe Dashboard and the Supabase SQL editor (see output).</human-check>
  </verify>
  <done>Webhook events for a deleted guild answer 200 with no write and no Stripe call, revoke the Discord role when the subscription ended, and a lookup error still answers 500; S and W rows failed before the code and pass after; the full suite has no new FAIL line against the baseline; tsc and eslint pass; no em dash in added lines, commit messages or the PR body; every commit has the trailer; the branch changes exactly the planned files, no migration; WT clean, no upstream, nothing pushed; SP/pr-body-gxl.md exists.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser (user session) to DELETE /api/guilds and POST /api/guilds/delete | Untrusted guild_id; the route's permission check must run before any Stripe call, because a cancel cannot be undone |
| app server to Stripe API | Service secret key; the routes now make irreversible writes (cancel) on behalf of the guild |
| Stripe to POST /api/webhooks/stripe | Signed events (signature check unchanged); event data is untrusted text in logs |
| admin client to guilds (clear-all-guilds) | Bypasses RLS and delete_guild; development or SUPER_ADMIN_IDS only |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-gxl-01 | Elevation of privilege | DELETE /api/guilds: delete_guild's guard runs after the new cancel, so any signed-in user could cancel another guild's subscription | high | mitigate | D-05 is_guild_master pre-check before the billing step; POST keeps its creator check first; tests D1 to D4, T3, T4 assert no read and no Stripe call |
| T-gxl-02 | Tampering | cancelling another guild's subscription that shares the Stripe customer | medium | mitigate | D-02 strict metadata.guild_id equality; tests M4, M12 |
| T-gxl-03 | Repudiation | a deleted guild keeps a live, billing subscription (the reported problem) | high | mitigate | D-04 cancel first and block on any Stripe failure or truncated listing; tests M13 to M15, D6 to D8, P1, P2 |
| T-gxl-04 | Denial of service | webhook 500s for deleted guilds lead Stripe to disable the endpoint, stopping tier sync for every guild | high | mitigate | D-07 guildMissing (lookup and 23503) answers 200; tests S2, S4, W1 to W3, W5; Task 3 ships in the same PR |
| T-gxl-05 | Denial of service | a Stripe outage blocks deleting a guild that has a stored customer | low | accept | OD-2 A trade-off; free guilds never call Stripe (D-03); a retry is safe |
| T-gxl-06 | Tampering | the admin bulk delete leaves live subscriptions behind | medium | mitigate | D-06 409 before any delete (OD-3 A); tests A1 to A4 |
| T-gxl-07 | Tampering | a webhook in a non-production environment cancelling live subscriptions | medium | mitigate | OD-4 A: the webhook never writes to Stripe; test W1 asserts cancel is never called |
| T-gxl-08 | Information disclosure | Stripe or database error details in responses | low | mitigate | fixed COPY texts in responses; details only in server logs |
| T-gxl-09 | Tampering | request or event values in log format strings (CodeQL) | low | mitigate | D-09 constant first argument, ids in an object |
| T-gxl-10 | Information disclosure | public repository wording | low | mitigate | D-09 neutral commits and PR body; follow-ups only in the SUMMARY |

No package installs, so there is no supply-chain gate.
</threat_model>

<verification>
- Module, route, sync and webhook test files pass; every new behavior row was seen failing before its code (record the red runs in the SUMMARY).
- Full vitest: sh SP/new-fails.sh SP/baseline-gxl-vitest.txt SP/final-gxl-vitest.txt exits 0.
- npx tsc --noEmit exits 0; eslint --max-warnings 0 exits 0 on every changed file.
- git diff 80d437da...HEAD changes exactly the planned files (13 with OD-3 A, 11 with OD-3 C), no supabase/ file, no lib/database.types.ts, no planning file.
- No em dash in added lines, commit messages or SP/pr-body-gxl.md; every commit has the trailer; nothing pushed.
</verification>

<success_criteria>
- Deleting a Premium guild through either delete route cancels its live Stripe subscriptions first, immediately and without proration (OD-1 A), and a Stripe failure leaves the guild in place with C-3 (OD-2 A).
- Free and complimentary guilds delete exactly as before, with no Stripe call.
- Nobody but a caller allowed to delete the guild can trigger a cancel.
- With OD-3 A, the admin bulk delete never deletes a guild with a live subscription.
- Webhook events for deleted guilds answer 200 without writes or Stripe calls, and end the Premium Discord role when the subscription ended.
- The delete confirmation of a Premium guild shows the signed-off C-1.
- OD resolutions and COPY sign-off are applied exactly.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/261004-gxl-deleting-a-premium-guild-cancels-its-sub/261004-gxl-SUMMARY.md when done (main checkout, not WT). Include: every commit hash and subject, marked "one app PR, no migration, normal merge"; the OD resolutions and the COPY as applied; findings F1 to F7 in short; the red and green runs per task; baseline versus final vitest, tsc and eslint results with any FLAKY lines; whether a Stripe instance satisfied StripeCancelPort directly or needed the adapter (D-01); the path of SP/pr-body-gxl.md; a note that this closes FU-5 of quick task 261004-0ut.

User checks (not run by the executor): with OD-5 A, in the Stripe Dashboard (view there, do not export customer names or emails into chats or planning files) list subscriptions with status active, trialing, past_due, unpaid or paused and note each metadata guild_id; then in the Supabase SQL editor run, read-only, select x as guild_id from unnest(array['<id1>','<id2>']::uuid[]) as x where not exists (select 1 from guilds g where g.id = x); every id returned is a live subscription of a deleted guild, to cancel (and refund if the user decides) in the Stripe Dashboard.

Follow-ups, neutral, each stated as the rule to adopt: FU-1 a guild whose stored Stripe customer was deleted in the Stripe Dashboard should still be deletable (today the listing error blocks the delete; decide whether a missing customer counts as nothing to cancel once the key mode is known to match); FU-2 the public changelog can mention that deleting a Premium guild cancels its subscription; FU-3 only if OD-3 is C, the admin clear-all-guilds route should refuse or cancel live subscriptions before deleting guilds; FU-4 refunds on request after a guild delete are handled in the Stripe Dashboard, and the support answer should be written down once.
</output>
