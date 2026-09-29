---
phase: quick-260921-wiy
plan: 01
subsystem: billing
tags: [stripe, discord, webhook, trial, notifications]
status: complete
dependency-graph:
  requires:
    - lib/discord.ts (discordFetch)
    - lib/billing/resume-paused.ts (injected-port + pure-module precedent)
    - lib/billing/discord-premium.ts (purchaser resolution, pre-refactor)
    - app/api/webhooks/stripe/route.ts (existing switch structure)
  provides:
    - lib/billing/trial-ending.ts (hasPaymentMethodOnFile, trialWarningDecision, discordTimestamp, sanitizeGuildName, buildTrialEndingMessage, notifyTrialEnding)
    - lib/billing/purchaser.ts (resolvePurchaser)
    - "sendDirectMessage exported from lib/discord.ts"
    - "case 'customer.subscription.trial_will_end' in app/api/webhooks/stripe/route.ts"
  affects:
    - lib/billing/discord-premium.ts (refactored to call resolvePurchaser)
tech-stack:
  added: []
  patterns:
    - "Pure decision module + no-throw orchestrator taking an injected port, in one file next to one test file (established by resume-paused.ts, now also applied in trial-ending.ts)"
    - "Four-leg Stripe invoice payment-method resolution chain (subscription default_payment_method -> subscription default_source -> customer invoice_settings.default_payment_method -> customer default_source)"
key-files:
  created:
    - lib/billing/trial-ending.ts
    - lib/billing/__tests__/trial-ending.test.ts
    - lib/billing/purchaser.ts
  modified:
    - lib/discord.ts
    - lib/billing/discord-premium.ts
    - app/api/webhooks/stripe/route.ts
decisions:
  - "sendDirectMessage placed in lib/discord.ts (general Discord-domain module), not a billing-specific module, per the plan's helper_placement_decision - the two-call DM sequence was already hand-written four times across the codebase."
  - "Purchaser resolution extracted to a new neutral module lib/billing/purchaser.ts rather than exported from discord-premium.ts, so trial-ending.ts does not import from a module named for an unrelated feature."
  - "At-least-once DM delivery accepted; no dedupe store (plan's duplicate_dm_decision) - the trialing-status gate and payment-method gate already suppress the two realistic redelivery cases."
  - "hasPaymentMethodOnFile(sub, null) returns false when the customer object is unavailable (retrieve failed or deleted) - resolves toward sending a possibly-unnecessary warning rather than withholding a needed one."
metrics:
  duration: ~75min
  completed: 2026-09-22
actuals:
  tokens: 33000
  tasks: 3
  commits: 4
---

# Phase quick-260921-wiy Plan 01: DM the purchaser on Discord three days before trial end Summary

Added a Discord DM warning three days before a card-less Premium trial ends, via a new `customer.subscription.trial_will_end` webhook case backed by a tested pure decision module, a reusable Discord DM sender, and a shared purchaser-resolution module also adopted by the existing Premium-role sync path.

## What Was Built

**Task 1 (RED/GREEN, 2 commits) - `lib/billing/trial-ending.ts` pure module + tests.**

- `hasPaymentMethodOnFile(sub, customer)`: walks the four-leg Stripe invoice payment-method resolution chain (subscription `default_payment_method` -> subscription `default_source` -> customer `invoice_settings.default_payment_method` -> customer `default_source`), per the SDK docstring's own specification, so an officer who added a card through the billing portal (which sets the CUSTOMER's default, not the subscription's) is not false-alarmed.
- `trialWarningDecision(sub, customer)`: gates on ownership (`metadata.guild_id`) first (zero I/O cost), then `status === 'trialing'` (so a stale redelivery after the trial ended is a no-op), then payment-method presence. Returns `{ warn, reason }`.
- `discordTimestamp(unixSeconds)`: renders Discord timestamp markdown (`<t:...:D>`), rejecting non-finite/non-positive input so a null `trial_end` never renders as literal text.
- `sanitizeGuildName(name)`: strips Discord markdown/mention syntax, collapses whitespace, truncates to 64 chars, returns null when nothing usable remains.
- `buildTrialEndingMessage(...)`: assembles the embed from the user-approved draft copy verbatim (see Copy Sign-Off below), dropping the possessive clause when the guild name is unusable and falling back to "ends soon" when `trial_end` is null.
- 43/43 behavior-table rows pass in `lib/billing/__tests__/trial-ending.test.ts`. RED confirmed first (test committed against a nonexistent module, failed on import) before the implementation commit (GREEN).
- The module imports nothing from `stripe`, `@supabase/supabase-js`, or `@/lib/discord` at the point Task 1 completed (verified: the pure decision surface remains dependency-free after Task 3 appended the orchestrator below it in the same file).

**Task 2 (1 commit) - shared Discord DM sender and purchaser resolution.**

- `sendDirectMessage(botToken, recipientId, body)` added to `lib/discord.ts`: performs the open-channel-then-post-message sequence already hand-written four times in the codebase, through `discordFetch` (existing 429/5xx retry unchanged). Never throws - each of the three awaited/parsed steps (open channel, parse channel JSON, send message) is individually caught, returning a structured `{ ok, stage, status }` outcome. Existing call sites (notify-officers, send-notification, resubmit-reminders) were NOT refactored onto it, per plan scope.
- `lib/billing/purchaser.ts` added: `resolvePurchaser(serviceSupabase, guildId, purchaserUserId)` extracts the purchaser-resolution chain (prefer passed id, fall back to `guilds.created_by`, read `discord_id` from `user_preferences`) that previously lived inline in `discord-premium.ts`.
- `lib/billing/discord-premium.ts` rewritten to call `resolvePurchaser`; logic preserved exactly (env-var guard, multi-guild guard, 404-is-fine handling, outer try/catch all unchanged). `discord-premium.test.ts` passes unedited: **8/8**.

**Task 3 (1 commit) - orchestrator + webhook wiring.**

- `notifyTrialEnding(serviceSupabase, stripe, subscription)` appended to `lib/billing/trial-ending.ts`: cheap gates (ownership, trial status) before any I/O; skips the Stripe customer retrieve entirely when the subscription's own legs already resolve a payment method; resolves the purchaser via the shared module; reads the guild name from `guilds.name` (not subscription metadata, which only carries `guild_id`/`user_id`); builds and sends the DM with `allowed_mentions: { parse: [] }`; treats a 403 (DMs closed to the bot) as a quiet `console.log`, any other send failure as `console.error`. Never throws - every awaited call that can reject (customer retrieve, purchaser resolution, guild-name read) is individually caught.
- `app/api/webhooks/stripe/route.ts`: added `case 'customer.subscription.trial_will_end'`, wrapped in its own try/catch, returning early rather than falling through into the shared `subscription` tier-sync path (a trialing subscription's tier does not change on this event). Route doc-comment event list extended.
- **Structural typing result:** the real `Stripe.Subscription` (cast once via the file's existing `event.data.object as Stripe.Subscription` pattern, identical to every other case in this switch) and the real `stripe` client (passed with zero cast as the `TrialEndingStripePort`) both satisfied the module's structural interfaces with `tsc --noEmit` passing clean. One adaptation was needed: the Stripe SDK types `Customer.deleted` as `void` (a discriminant trick against `DeletedCustomer.deleted: true`), which is incompatible with a naive `deleted?: boolean` field on our port's return type. Fixed by typing that one field `deleted?: unknown` - the narrowest type both `void` and `true` satisfy - which resolved the mismatch with no cast anywhere in the calling code.

**Deviation (Rule 1 - bug, found during Task 3):** `sendDirectMessage`'s `channelRes.json()` call was unguarded - a 2xx response with an unparseable body would have thrown out of a function contracted to never throw. Wrapped in its own try/catch, folded into the Task 3 commit since it was discovered while wiring `notifyTrialEnding` and verifying the never-throws chain end-to-end.

## Verification

- `npx vitest run lib/billing/__tests__/trial-ending.test.ts`: **43/43 passed** (Task 1 gate).
- `npx vitest run lib/billing/__tests__/discord-premium.test.ts && npm run typecheck`: **8/8 passed**, typecheck clean (Task 2 gate).
- `npm run typecheck && npm run lint && npx vitest run`: typecheck clean; lint **0 errors** (397 pre-existing warnings, none in files this plan touched, unchanged count from before this plan); full suite **81 files / 1345 tests, all passed** (Task 3 gate, re-run after the deviation fix above).

## Operator Action (A) and Human-Checks (B, C, D): NOT RUN

Per Task 3's `<precondition>`, these require Stripe Dashboard access, a test-mode secret key, the ability to edit live webhook endpoint `we_1U8UUlFV7dhwtnIjYXou6I5i`, a Discord account linked to a test purchaser, and (for B) sending a real Discord message and running a live Stripe test clock. None of that is available to this autonomous execution, and the task's explicit constraints prohibit running anything against a live Stripe key or sending a real Discord message. All four are recorded as **NOT RUN**, with the reason above.

**What is known and recorded accurately (per the orchestrator's live-verified fact, supplied at the start of this execution, not independently re-verified by this agent):** the live webhook endpoint `we_1U8UUlFV7dhwtnIjYXou6I5i` currently has exactly **5** events selected - `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`. Both `payment_method.attached` (from quick task 260921-w4u) and `customer.subscription.trial_will_end` (this plan) are still missing. This resolves the five-versus-six discrepancy the plan's human-check A flagged: the true prior count is 5, not 5 and not 6 as either prior task's description assumed. The operator action remains: add both missing events (5 -> 7 total), without removing any of the five listed above. **This has not been done** - it requires manual Stripe Dashboard access this execution does not have. Until it is done, every line of code this plan adds is dead in production and officers will keep losing Premium with no warning.

Human-checks B, C, D (a real DM firing, quiet degradation for no-linked-Discord, and no-DM-when-card-on-file) all require the operator action to be live first, plus a real Discord account and Stripe test clock, so they are NOT RUN for the same reason and remain outstanding regardless of the operator action's completion.

## Copy Sign-Off

The user signed off on the plan's `<draft_copy>` exactly as drafted before this execution began, including the closing data-safety paragraph and the "Nothing is charged before then, and nothing is charged if you do nothing" sentence (2026-09-22). `buildTrialEndingMessage`'s doc comment was updated to record the copy as approved (not pending sign-off) while still pointing at the plan's `<draft_copy>` as the source of record. The strings were implemented verbatim - no shortening or rewording. The degraded-case behavior from the table (dropping the possessive clause when the guild name is missing rather than substituting a placeholder; falling back to "ends soon" when `trial_end` is null) is preserved and covered by tests. **What remains unverified is the rendered output against a real Discord client** (date formatting, actual visual layout) - that is part of human-check B, NOT RUN.

## Follow-ups (from the plan's `<followups>`, all deferred, none started)

1. Converge the four hand-rolled DM implementations (notify-officers, send-notification, resubmit-reminders) onto `sendDirectMessage`. Deferred - behaviour-bearing, needs its own verification.
2. Stale app-URL fallback at `app/api/cron/resubmit-reminders/route.ts:116` (`https://lootlistplus.com` vs canonical `https://www.getlootlist.com`). Not touched by this plan; `trial-ending.ts` uses the canonical fallback.
3. A billing-notification opt-out preference. Deferred - `user_preferences` has no billing column today.
4. Dedupe for at-least-once DM delivery, if a notification-history table is ever added. Deferred per the plan's `<duplicate_dm_decision>`.
5. Copy sign-off - **resolved during this execution**, not deferred (see above).

## Known Stubs

None. No hardcoded empty values, placeholder text, or unwired data sources were introduced by this plan.

## Threat Flags

None beyond what the plan's `<threat_model>` already covers (T-wiy-01 through T-wiy-05, all mitigated or accepted as designed). No new network endpoints, auth paths, or schema changes were introduced outside that register.

## Self-Check: PASSED

- `lib/billing/trial-ending.ts`: FOUND
- `lib/billing/__tests__/trial-ending.test.ts`: FOUND
- `lib/billing/purchaser.ts`: FOUND
- `lib/discord.ts`: FOUND
- `app/api/webhooks/stripe/route.ts`: FOUND
- Commit `6813ebdb` (test, RED): FOUND
- Commit `b4d6ba68` (feat, GREEN, Task 1): FOUND
- Commit `bfd4b63b` (feat, Task 2): FOUND
- Commit `fe9016ec` (feat, Task 3): FOUND
- `export function sendDirectMessage` in `lib/discord.ts`: FOUND
- `resolvePurchaser` imported and called in `lib/billing/discord-premium.ts`: FOUND
