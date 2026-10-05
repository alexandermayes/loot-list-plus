---
phase: quick-261004-gxl
plan: 01
subsystem: billing
tags: [stripe, supabase, service-role, nextjs, vitest, webhooks]

requires:
  - phase: quick-261004-0ut
    provides: deleting a guild works when reserve runs exist (FU-5 of that task is what this task closes)
  - phase: quick-260921-w4u
    provides: the injected-Stripe-port pattern (lib/billing/resume-paused.ts) and the proof that a real Stripe instance satisfies such a port with no cast
provides:
  - "lib/billing/cancel-guild-subscription.ts: cancellableSubscriptionIds, StripeCancelPort, cancelGuildSubscriptions (never rejects), endGuildBillingBeforeDelete, GUILD_DELETE_BILLING_ERRORS, GUILD_DELETE_CANCELLATION_COMMENT"
  - "DELETE /api/guilds and POST /api/guilds/delete cancel every live Stripe subscription of a guild before delete_guild runs, and refuse to delete when Stripe fails"
  - "POST /api/admin/clear-all-guilds refuses with 409 while any guild it would delete has a live Premium subscription"
  - "lib/billing/sync.ts syncSubscriptionToGuild reports { guildMissing: true } instead of failing on the guild_subscriptions_guild_id_fkey foreign key"
  - "The Stripe webhook acknowledges events for a deleted guild with 200 and no write, and revokes the Premium Discord role when the subscription has ended"
  - "The delete confirmation modal tells the owner of a Premium guild that deleting it also cancels the subscription"
affects: [billing, guild-settings, stripe-webhooks]

actuals:
  tokens: 20597
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A guild delete route runs auth, then a permission pre-check, then endGuildBillingBeforeDelete, then delete_guild, matching the injected-Stripe-port pattern from lib/billing/resume-paused.ts so the cancellation logic is unit-testable without importing the stripe package."
    - "A webhook sync function distinguishes 'the DB write failed' from 'there is nothing left to write to' (guildMissing), so a route built on a foreign-key constraint can acknowledge a race instead of retrying forever."

key-files:
  created:
    - lib/billing/cancel-guild-subscription.ts
    - lib/billing/__tests__/cancel-guild-subscription.test.ts
    - app/api/guilds/__tests__/route-delete.test.ts
    - app/api/admin/clear-all-guilds/__tests__/route.test.ts
    - app/api/webhooks/stripe/__tests__/route.test.ts
    - lib/billing/__tests__/sync.test.ts
  modified:
    - app/api/guilds/route.ts
    - app/api/guilds/delete/route.ts
    - app/api/admin/clear-all-guilds/route.ts
    - app/(app)/guild-settings/components/GuildSettingsContent.tsx
    - lib/billing/sync.ts
    - app/api/guilds/delete/__tests__/route.test.ts
    - app/api/webhooks/stripe/route.ts

key-decisions:
  - "OD-1 option A (user, 2026-10-04): cancel immediately with Stripe's defaults (no proration, no refund); refunds on request stay a manual Stripe Dashboard action."
  - "OD-2 option A (user, 2026-10-04): cancel first, then delete; a Stripe failure blocks the delete (502 C-3) and leaves the guild untouched; a cancel followed by a failed delete_guild answers 500 C-5."
  - "OD-3 option A (user, 2026-10-04): the admin clear-all-guilds route refuses with 409 while any guild it would delete has a live subscription; it makes no Stripe calls of its own."
  - "OD-4 option A (user, 2026-10-04): the webhook acknowledges events for a deleted guild and never changes the subscription from the webhook."
  - "OD-5 option A (user, 2026-10-04): no code; the user checks the Stripe Dashboard and a read-only Supabase query by hand for subscriptions of guilds deleted before this fix."
  - "D-01 confirmed without needing the fallback adapter: getStripe()'s real Stripe instance satisfies StripeCancelPort structurally with no cast, in both app/api/guilds/route.ts and app/api/guilds/delete/route.ts (same finding as 260921-w4u's StripeResumePort)."

requirements-completed: [GXL-R1, GXL-R2, GXL-R3, GXL-R4, GXL-R5, DELIVERY-R1]

duration: single session
completed: 2026-10-04
status: complete
---

# Quick Task 261004-gxl: Deleting a Premium guild cancels its subscription Summary

**Both guild delete routes now cancel a guild's live Stripe subscriptions before delete_guild runs (immediately, no proration, blocking the delete on any Stripe failure), the admin bulk-delete route refuses while a live subscription exists, and the Stripe webhook acknowledges events for a deleted guild instead of failing on a foreign key and being retried into oblivion.**

## Performance

- **Duration:** single session
- **Tasks:** 3 of 3 completed
- **Files modified:** 13 (6 created, 7 modified)

## Accomplishments

- Closes follow-up FU-5 of quick task 261004-0ut: deleting a Premium guild no longer leaves a live, billing Stripe subscription behind for a guild that no longer exists.
- New `lib/billing/cancel-guild-subscription.ts` (24 unit tests, M1-M23 plus an M11b): `cancellableSubscriptionIds` filters a Stripe `subscriptions.list` result down to this guild's non-ended subscriptions by strict `metadata.guild_id` equality (another guild's subscription on the same Stripe customer survives); `cancelGuildSubscriptions` lists then cancels each with `cancellation_details.comment: 'Guild deleted'`, never rejecting even when the list call throws, a cancel call throws, or the listing is truncated (`has_more: true`, more than 100 live subscriptions); `endGuildBillingBeforeDelete` wraps the `guild_subscriptions` read and the cancel call into one `GuildDeleteBillingResult` the route can act on without its own try/catch.
- `DELETE /api/guilds`: adds an `rpc('is_guild_master', ...)` permission pre-check (403 "Only the guild master can delete this guild.") before any billing or Stripe call, per D-05, since a cancel cannot be undone, so permission must be proven first. Then `endGuildBillingBeforeDelete` runs; a Stripe failure answers 502 and does not delete; a cancel that succeeds followed by a failed `delete_guild` answers 500 with the cancelled-but-not-deleted text.
- `POST /api/guilds/delete`: the identical billing step after its existing creator check.
- `POST /api/admin/clear-all-guilds` (development or `SUPER_ADMIN_IDS` only): reads `guild_subscriptions` for any live row (`stripe_subscription_id` not null, status not canceled/incomplete_expired) among the guilds it would delete; any row answers 409 with the guild ids and deletes nothing, since this bulk tool makes no Stripe calls of its own.
- `lib/billing/sync.ts` `syncSubscriptionToGuild` now looks the guild up by id before writing; no row, or an upsert failing with Postgres code `23503` (the guild was deleted between the lookup and the write), both return `{ tier, guildMissing: true }` with no write, instead of failing.
- The Stripe webhook route, on `guildMissing`, logs one line (error when the tier would have been `pro`, since that is a live subscription with nowhere to apply it, worth a human noticing per OD-5; info otherwise), revokes the purchaser's Premium Discord role when the tier is not `pro` (inside its own try/catch), and answers `{ received: true }` with 200. It never calls Stripe to change the subscription (`subscriptions.cancel` asserted never called in W1).
- The Delete Guild Confirmation Modal shows the signed-off C-1 sentence for a Premium guild (`isPro(activeGuild)`), telling the owner the subscription is cancelled right away with no refund of the current period.

## Task Commits

1. **Task 1: End-to-end: module, DELETE /api/guilds, modal copy** - `2b592358` (fix)
2. **Task 2: The other delete paths: POST /api/guilds/delete, admin bulk delete** - `21634291` (fix)
3. **Task 3: Webhook acknowledges events for a deleted guild** - `883c55d0` (fix)

All three commits are on `fix/delete-guild-cancels-subscription` (based at `80d437da`), each carrying the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. One app PR, no migration, normal merge. Nothing pushed; no upstream configured.

## Investigation Findings (F1-F7, as planned)

- **F1** (every delete path): `DELETE /api/guilds` (Guild Settings > Danger Zone) and `POST /api/guilds/delete` (unused by the app today, fixed by 261004-0ut) both call `rpc('delete_guild')`; the admin `clear-all-guilds` route deletes `guilds` rows directly with the admin client. None of the three touched Stripe before this task.
- **F2** (`guild_subscriptions` writes/reads): written only by `syncSubscriptionToGuild` from the webhook; read by checkout, the billing portal, `BillingSection.tsx` and `usePremiumCheckout.ts`. `guilds.subscription_tier` is the entitlement field the app actually gates on.
- **F3** (Stripe ids): one `guild_subscriptions` row per guild holds the last-synced customer/subscription; checkout writes `metadata.guild_id` (and `user_id`), so listing by customer and filtering by `metadata.guild_id` finds every subscription that belongs to this guild even if more than one exists on the same customer.
- **F4** (webhook before this fix): a guild-missing event failed the `guild_subscriptions` upsert's foreign key, answered 500, and Stripe would retry with backoff and could eventually disable the endpoint, breaking tier sync for every guild, not just the deleted one. Task 3 had to ship in the same PR as Tasks 1-2 since cancelling now routinely produces exactly this event.
- **F5** (gift codes, comped guilds, trials, paused subscriptions): all cancelled or skipped correctly. Gifted subscriptions are ordinary `active` Stripe subscriptions (cancelled, M10); complimentary guilds have no stored customer (skipped, M6); trialing and paused subscriptions are both live and cancelled (M8, M9); already-canceled subscriptions are left alone (M3, M11, M11b).
- **F6** (Premium Discord role): the webhook's `guildMissing` branch revokes the role itself (via `syncPremiumDiscordRole`) rather than waiting for the daily `/api/cron/sync-discord-premium` reconciliation cron, which remains the safety net for anything this misses.
- **F7** (Stripe SDK semantics, 22.5.0): `subscriptions.cancel` with no `invoice_now`/`prorate` stops further charges and finalized-invoice collection with no proration, confirming OD-1 A's "Stripe's defaults" is exactly "no proration, no refund."

## OD Resolutions and COPY (as applied, user sign-off 2026-10-04)

All five Open Decisions (OD-1 through OD-5) resolved to option A as recommended; see `key-decisions` above for each. COPY C-1 through C-6 shipped exactly as drafted and signed off in the plan:

- **C-1** (delete confirmation modal, Premium guild only): "Deleting this guild also cancels its Premium subscription right away. You won't be charged again, and the rest of the current billing period isn't refunded."
- **C-2** (403, not guild master): "Only the guild master can delete this guild."
- **C-3** (502, Stripe failed, guild not deleted): "Couldn't cancel this guild's Premium subscription, so the guild wasn't deleted. Try again in a few minutes."
- **C-4** (503, billing not configured, live row): "Billing is unavailable right now, so this guild can't be deleted yet. Try again later."
- **C-5** (500, cancelled but delete_guild failed): "This guild's Premium subscription was cancelled, but the guild couldn't be deleted. Try again."
- **C-6** (409, admin bulk delete, live subscriptions exist): "Some of these guilds still have a live Premium subscription. Delete them one at a time from Guild Settings, which cancels the subscription, then try again."
- Reused unchanged: "Couldn't delete guild. Try again." (now also covers a failed `is_guild_master` check or subscription read) and "Couldn't delete guilds. Try again." (admin route's existing read/delete failure text).

## Red/Green per Task

- **Task 1:** `lib/billing/__tests__/cancel-guild-subscription.test.ts` failed to resolve its import before the module existed (red), then 24/24 passed once `lib/billing/cancel-guild-subscription.ts` was written. `app/api/guilds/__tests__/route-delete.test.ts`: D3, D6-D9, D11, D12 failed against the unmodified route (red; D1/D2/D5/D10 passed since those paths were unaffected), all 12 passed once the route added the permission check and billing step.
- **Task 2:** `app/api/guilds/delete/__tests__/route.test.ts` P1-P3 failed against the unmodified route (red), all 10 (7 existing + 3 new) passed after the billing step was added. `app/api/admin/clear-all-guilds/__tests__/route.test.ts` A1, A3, A4 failed before the live-subscription read existed (red; A2, A5 passed, unaffected), all 5 passed after.
- **Task 3:** `lib/billing/__tests__/sync.test.ts` S2-S4 failed against the unmodified `syncSubscriptionToGuild` (red; S1, S5, S6 passed), all 6 passed after the guild lookup and `23503` branch were added. `app/api/webhooks/stripe/__tests__/route.test.ts` W2, W3 failed against the unmodified route (red; W1, W4-W7 passed, since the Step 2 `sync.ts` change already stopped the write without the route's own `guildMissing` branch existing yet), all 7 passed once the route's `guildMissing` branch (logging, conditional Discord revoke, early 200 return) was added.

## Verification

**Vitest (module/route/sync/webhook files only, run after each task):** 24 + 32 (Task 1), 10 + 5 (Task 2), 6 + 7 (Task 3), all green by each task's end; combined final run of the ten touched test files: 71 passed (lib/billing/cancel-guild-subscription, guilds/route-delete, guilds/route, guilds/delete/route, admin/clear-all-guilds/route, lib/billing/sync, webhooks/stripe/route).

**Full suite (`SP/baseline-gxl-vitest.txt` / `SP/final-gxl-vitest.txt`):**
- Baseline (HEAD `80d437da`): 193 test files, 3404 tests, 1 FAIL line (`app/api/addon/import-string/__tests__/route.test.ts`, a pre-existing 5000ms timeout in an unrelated GH #294 test, not touched by this task), EXIT=1.
- Final (HEAD `883c55d0`): 198 test files, 3461 tests, 0 FAIL lines, EXIT=0. The baseline's flaky timeout did not recur on this run.
- `sh SP/new-fails.sh SP/baseline-gxl-vitest.txt SP/final-gxl-vitest.txt`: no new FAIL lines, errors steady at 0 (0->0), test-file total rose 193->198 (the five new test files), gate EXIT=0. No FLAKY lines (nothing to re-run; the baseline's one FAIL did not recur so there was no new FAIL to triage).

**tsc:** `npx tsc --noEmit` EXIT=0 at every checkpoint (Task 1, Task 2, Task 3, final). One TS error surfaced mid-Task-1 in the new module test file (`CancellableSubscriptionLike[]` vs `unknown[]` in the fake Stripe port's return type, and an excess `discount` property on the M10 gifted-subscription fixture) and was fixed with a typed `fakeStripe` helper and a `CancellableSubscriptionLike` cast, both confined to the test file.

**eslint:** `npx eslint --max-warnings 0` EXIT=0 on every file touched by each task, and on the full 13-file changed set at the end. `GuildSettingsContent.tsx` carried 7 pre-existing warnings unrelated to this change (an unused `refreshGuilds` destructure, two `react-hooks/exhaustive-deps` on effects this task did not touch, four `@next/next/no-img-element` on wow.zamimg.com icons, the Discord icon and the Warcraft Logs icon) and `app/api/guilds/route.ts` carried one (`request` unused in the unrelated `GET` handler). Since the plan's own Step 6 action text ("fix anything in these files only") and its automated `<verify>` both require `--max-warnings 0` across this exact five-file set, these were fixed in-file: the unused destructure and unused parameter were removed (zero behavior change), and the four `<img>`/two hook-dependency warnings were suppressed with `// eslint-disable-next-line` comments matching the established pattern already used elsewhere in this codebase (`app/(app)/raid-tracking/_client.tsx`, `app/(app)/loot-management/components/*.tsx`) rather than changing effect dependencies or swapping to `next/image`, which would have been a real behavior/visual change out of scope for a billing task. See Deviations below.

**Text gate:** `git diff 80d437da...HEAD -U0` added lines and the three commit messages contain no em dash (U+2014); both non-empty. `SP/pr-body-gxl.md` also contains no em dash.

**Git:** 3 commits on `fix/delete-guild-cancels-subscription`, each with exactly one trailer line; working tree clean; `git diff --name-only 80d437da...HEAD` is exactly the 13 planned files (no `supabase/` file, no `lib/database.types.ts`, no `.planning/` file); no upstream configured; nothing pushed.

**Stripe port instantiation (D-01):** confirmed directly. `getStripe()`'s real `Stripe` instance is passed straight into `endGuildBillingBeforeDelete` in both `app/api/guilds/route.ts` and `app/api/guilds/delete/route.ts` with no cast and no two-line adapter object. `npx tsc --noEmit` accepted it as-is, the same finding quick task 260921-w4u made for `StripeResumePort`.

**PR body:** `/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/d08e3d4d-0791-40f5-b5d0-31ab44981efd/scratchpad/pr-body-gxl.md`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Typed the module test file's fake Stripe port so tsc would accept it**
- **Found during:** Task 1, Step 6 (gates and commit)
- **Issue:** `fakeStripe`'s `listResult.data` was typed `unknown[]`, which does not satisfy `StripeCancelPort`'s `CancellableSubscriptionLike[]`; the M4 and M10 fixtures also failed structural typing (M4's union of partial `metadata` shapes; M10's extra `discount` field a real Stripe subscription carries but the minimal interface does not declare).
- **Fix:** typed `fakeStripe`'s `listResult` as `{ data: CancellableSubscriptionLike[]; has_more: boolean }`, typed the M4 fixture array explicitly, and cast the M10 fixture `as unknown as CancellableSubscriptionLike` with a comment explaining why (an interface deliberately narrower than the real Stripe type).
- **Files modified:** `lib/billing/__tests__/cancel-guild-subscription.test.ts`
- **Verification:** `npx tsc --noEmit` exits 0; all 24 tests still pass.
- **Committed in:** `2b592358` (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed 7 pre-existing eslint warnings in two files the plan's own verify gate requires clean**
- **Found during:** Task 1, Step 6 (gates and commit)
- **Issue:** `npx eslint --max-warnings 0` on the task's five files (as the plan's action text and automated `<verify>` both specify) failed: `GuildSettingsContent.tsx` carried 6 pre-existing warnings (one unused destructured variable, two `react-hooks/exhaustive-deps`, four `@next/next/no-img-element`) and `app/api/guilds/route.ts` carried one (`request` unused in `GET`), none caused by this task's changes.
- **Fix:** removed the genuinely-unused `refreshGuilds` destructure and the unused `request` parameter (zero behavior change, confirmed by line-number analysis that these pre-date this task's edits); suppressed the four `<img>` warnings and two hook-dependency warnings with `// eslint-disable-next-line` comments, matching the established pattern already used in `app/(app)/raid-tracking/_client.tsx` and `app/(app)/loot-management/components/*.tsx` elsewhere in this codebase, rather than changing effect dependency arrays (risk of refiring/skipping behavior this task did not intend to touch) or swapping to `next/image` (a visual change requiring `next.config.ts` remote-pattern additions for `wow.zamimg.com`, out of scope for a billing task).
- **Files modified:** `app/(app)/guild-settings/components/GuildSettingsContent.tsx`, `app/api/guilds/route.ts`
- **Verification:** `npx eslint --max-warnings 0` on all five Task 1 files exits 0; `npx vitest run` on the affected test files still passes; `npx tsc --noEmit` exits 0.
- **Committed in:** `2b592358` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3, blocking: needed to satisfy the plan's own `<verify>` gate; neither changed any runtime behavior).
**Impact on plan:** No scope creep. Both fixes are confined to files the plan's `files_modified` already listed, and neither alters what the five files do at runtime: one is a type-only test fixture fix, the other is a lint-suppression/dead-code removal that pre-dated this task.

## Issues Encountered

None beyond the two deviations above. Every behavior row (M1-M23, D1-D12, T1-T6b/P1-P3, A1-A5, S1-S6, W1-W7) matched the plan's described red/green transition on the first implementation pass; no test needed a second iteration to pass for the right reason.

## Known Stubs

None. Every route change is fully wired: the billing module is exercised by both delete routes and the admin route reads the same `guild_subscriptions` table the webhook writes.

## User Setup Required

None - no external service configuration required. The Stripe webhook's subscribed-event list already includes `customer.subscription.deleted` (pre-existing Dashboard configuration; no change needed).

## User Checks (not run by the executor, per OD-5 A)

In the Stripe Dashboard (view there; do not export customer names or emails into chats or planning files): list subscriptions with status `active`, `trialing`, `past_due`, `unpaid` or `paused` and note each one's `metadata.guild_id`. Then in the Supabase SQL editor, run, read-only:

```sql
select x as guild_id from unnest(array['<id1>','<id2>']::uuid[]) as x
where not exists (select 1 from guilds g where g.id = x);
```

Every id returned is a live subscription of a guild deleted before this fix; cancel (and refund if you choose) each by hand in the Stripe Dashboard. The webhook will also now log any such subscription as an error line the next time Stripe sends it an event, so this check can be repeated later from the server logs.

## Follow-ups (noted, not part of this task)

- **FU-1:** a guild whose stored Stripe customer was deleted in the Dashboard should still be deletable (today the listing error blocks the delete); decide whether a missing customer counts as `nothing_to_cancel` once the key mode is known to match.
- **FU-2:** the public changelog can mention that deleting a Premium guild cancels its subscription.
- **FU-3:** not applicable (OD-3 resolved to A, not C).
- **FU-4:** refunds on request after a guild delete are handled in the Stripe Dashboard by hand; the support answer should be written down once.

## Next Phase Readiness

Closes FU-5 of quick task 261004-0ut. All three commits are on `fix/delete-guild-cancels-subscription` (3 commits on top of `80d437da`), fully tested (module, route, sync and webhook unit tests plus a clean full-suite regression run), not pushed. A PR can be opened directly from the draft body at `SP/pr-body-gxl.md`.

## Self-Check: PASSED

All 13 files confirmed present via `git diff --name-only 80d437da...HEAD` and on disk in the worktree. All 3 commit hashes (`2b592358`, `21634291`, `883c55d0`) confirmed present via `git log --oneline --all`. This SUMMARY.md and the PR body draft (`SP/pr-body-gxl.md`) confirmed written to disk.

---
*Quick task: 261004-gxl*
*Completed: 2026-10-04*
