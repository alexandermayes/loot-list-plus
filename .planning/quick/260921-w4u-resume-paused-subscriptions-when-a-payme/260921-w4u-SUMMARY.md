---
phase: quick-260921-w4u
plan: 01
subsystem: billing
tags: [stripe, webhook, subscriptions, resume]
status: complete
dependency-graph:
  requires: []
  provides:
    - lib/billing/resume-paused.ts (resumePausedSubscriptions, paymentMethodCustomerId, resumableSubscriptionIds, StripeResumePort, ResumeOutcome, PausedSubscriptionLike)
  affects:
    - app/api/webhooks/stripe/route.ts
tech-stack:
  added: []
  patterns:
    - "injected-port pattern (StripeResumePort) so control-flow properties are unit-testable without mocking the stripe SDK"
    - "per-element try/catch inside a loop, not around it, so one failing Stripe call cannot abort the rest"
key-files:
  created:
    - lib/billing/resume-paused.ts
    - lib/billing/__tests__/resume-paused.test.ts
  modified:
    - app/api/webhooks/stripe/route.ts
decisions:
  - "A real Stripe instance satisfies StripeResumePort structurally with no cast and no adapter - the direct pass-through (`resumePausedSubscriptions(stripe, customerId)`) typechecked on the first try, so the plan's documented two-line-adapter fallback was not needed."
  - "Task 3's operator action and human-checks A-D were run as NOT RUN, per the plan's own <precondition>: this execution has no Stripe Dashboard access, no confirmed-safe test-mode key usable for a live checkout, and no browser tool invoked in this session. Reported here rather than silently skipped."
metrics:
  duration: ~25min
  completed: 2026-09-21
actuals:
  tokens: 3641
  tasks: 3
  commits: 3
---

# Phase quick-260921-w4u Plan 01: Resume paused subscriptions when a payment method is attached Summary

Extracted the paused-subscription resume decision into a dependency-free, injected-port module (`lib/billing/resume-paused.ts`) and wired a new `payment_method.attached` case into the Stripe webhook that calls it — so the "Add payment method" button on a paused Premium card now actually revives the subscription if the billing portal itself doesn't.

## What Was Built

**Task 1 — `lib/billing/resume-paused.ts` + `resume-paused.test.ts` (TDD)**

- `paymentMethodCustomerId(pm)`: extracts a customer id from a Stripe PaymentMethod's `customer` field, handling the bare-string form, the expanded-object form, and null/absent — mirroring `snapshotFromSubscription`'s `string | { id: string }` pattern in `tier.ts`.
- `resumableSubscriptionIds(subs)`: filters a subscription list down to ids whose `metadata.guild_id` is a non-empty string, preserving order and without deduplicating.
- `StripeResumePort`: a two-method structural interface (`subscriptions.list`, `subscriptions.resume`) that lets the orchestrator's failure behavior be tested against a fake that throws on purpose.
- `resumePausedSubscriptions(stripe, customerId)`: calls `subscriptions.list({ customer, status: 'paused', limit: 100 })`, filters through `resumableSubscriptionIds`, and resumes each surviving id in a loop with a **per-element try/catch** (not a catch around the loop). Contracts to never reject or throw — both `list` failure and any `resume` failure are caught, logged, and folded into the returned `ResumeOutcome` (`{ customerId, paused, resumed, failed, listFailed }`).
- Zero imports in the module — every dependency arrives as a parameter, matching the plan's structural gate.
- 22 test rows (5 for `paymentMethodCustomerId`, 10 for `resumableSubscriptionIds`, 7 for `resumePausedSubscriptions`), built with inline `vi.fn()` fakes, no `vi.mock`, no import of the `stripe` module.

Executed as genuine RED → GREEN: the test file was committed first against a temporarily-removed implementation (confirmed failing — `Failed to resolve import "../resume-paused"`), then the implementation was restored and committed once all 22 rows passed.

**Task 2 — `app/api/webhooks/stripe/route.ts`**

- Doc comment's event list goes from 5 to 6, plus a new paragraph explaining what `payment_method.attached` is for and naming endpoint `we_1U8UUlFV7dhwtnIjYXou6I5i` as the Dashboard setting the case is inert without.
- One import line: `paymentMethodCustomerId, resumePausedSubscriptions` from `@/lib/billing/resume-paused`.
- New `case 'payment_method.attached'` placed after the four subscription cases and before `default`. It does all its work inside itself:
  1. Narrows `event.data.object` to `Stripe.PaymentMethod`.
  2. Resolves the customer id via `paymentMethodCustomerId`; on null, logs and returns `received: true`.
  3. Calls `resumePausedSubscriptions(stripe, customerId)` awaited inside its own try/catch (the `syncPremiumDiscordRole` pattern: belt-and-braces over the module's own no-throw contract, so a Stripe failure here can never reach the route's outer catch and produce a 500).
  4. Logs one line distinguishing `listFailed`, zero-paused (portal likely already resumed it), and resumed-ids.
  5. Returns `received: true` at every exit — never falls into the shared `subscription` block, never calls `syncSubscriptionToGuild`, writes nothing to the database.

**A real `Stripe` instance satisfied `StripeResumePort` directly.** Passing `stripe` (the return value of `getStripe()`) straight into `resumePausedSubscriptions(stripe, customerId)` typechecked with no cast and no adapter on the first attempt. The plan's documented two-line-adapter fallback (delegating `list`/`resume` through an object literal) was not needed. This is a durable fact about the installed `stripe@22.5.0` SDK's overloads: its `subscriptions.list`/`.resume` methods are structurally compatible with the minimal port despite being far more heavily overloaded in the SDK's own types.

**Task 3 — gates, operator action, human-checks**

Automated gates run and recorded below. The operator action (enabling `payment_method.attached` on the live Stripe Dashboard endpoint) and human-checks A through D all require Stripe Dashboard access, a confirmed-safe test-mode key, and/or interactive browser checkout flows that are not available to this autonomous execution — per the plan's own `<precondition>` on Task 3, these are recorded **NOT RUN** rather than fabricated or silently skipped.

## Verification

- `npx vitest run lib/billing/__tests__/resume-paused.test.ts` — **22/22 passed**.
- `npm run typecheck` — passed, 0 errors (also the gate that confirmed the direct `stripe` pass-through, no adapter needed).
- `npm run lint` — **0 errors**, 397 pre-existing warnings, none in files touched by this plan.
- `npx vitest run` (full suite) — **80 test files passed, 1302 tests passed** (the new `resume-paused.test.ts` contributes 22 of the 1302).
- Structural greps (Task 2): `case 'payment_method.attached'` occurs 1×; `payment_method.attached` occurs 3× (doc comment's event list, the explanatory paragraph, and the case label — at least the required 2); `resumePausedSubscriptions` occurs exactly 2× (imported, called once — comment wording was adjusted to avoid inflating this count); `paymentMethodCustomerId` occurs exactly 2×; `syncSubscriptionToGuild` stays at exactly 2× (unchanged — no DB write leaked into the new case).
- `git diff --stat` over the six out-of-scope files (`app/api/billing/checkout/route.ts`, `app/api/billing/portal/route.ts`, `lib/billing/sync.ts`, `lib/billing/tier.ts`, `lib/billing/subscription-view.ts`, `BillingSection.tsx`) — **empty, byte-identical**.
- `git status --porcelain -- app lib` — exactly the three files in `files_modified`: `lib/billing/resume-paused.ts`, `lib/billing/__tests__/resume-paused.test.ts`, `app/api/webhooks/stripe/route.ts`.

## TDD Gate Compliance

- RED: `289a2736` `test(quick-260921-w4u): add failing tests for paused-subscription resume decision` — confirmed failing (module did not resolve) before commit.
- GREEN: `a23e6191` `feat(quick-260921-w4u): extract resume-paused decision into a tested module` — all 22 rows passing before commit.
- No REFACTOR commit was needed; the implementation written to pass GREEN needed no subsequent cleanup.

## Operator Action (RPS-08) — NOT RUN

**Reason:** requires live Stripe Dashboard access to edit webhook endpoint `we_1U8UUlFV7dhwtnIjYXou6I5i`, which this autonomous execution does not have (per Task 3's `<precondition>`).

The endpoint currently lists 5 events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`). Until a human adds `payment_method.attached` as a **sixth, additional** event (all five existing ones must remain selected), the code shipped in this plan is inert in production — Stripe will not deliver the event this handler depends on.

## Human-Check A — The handler is a no-op on an ordinary card attach (RPS-02) — NOT RUN

**Reason:** requires `npm run dev` + `stripe listen` + a real test-mode Stripe Checkout completed in a browser with test card 4242 4242 4242 4242, none of which this autonomous execution can perform (no browser tool invoked this session, and per the constraints, nothing may be run against Stripe without a confirmed-safe test-mode setup).

## Human-Check B — A paused subscription is resumed when a card is attached (RPS-01, RPS-05, RPS-07) — NOT RUN

**Reason:** requires a Stripe test clock, a seeded Supabase row, a real trial-to-paused flow, and an interactive portal card attach — same access gap as above. **The open question this plan exists to answer (whether Stripe's billing portal already resumes a `missing_payment_method: 'pause'` subscription on its own, or whether this plan's handler is the only thing that does) remains unanswered.** It requires this specific human-run check against real Stripe test-mode data.

## Human-Check C — A paused subscription that is not ours is left alone (RPS-03) — NOT RUN

**Reason:** requires creating a subscription with no `metadata.guild_id` on the same test-mode account and attaching a payment method to it — same access gap.

## Human-Check D — A Stripe failure does not become a 500 (RPS-04) — NOT RUN

**Reason:** requires either a deliberately-broken test-mode key or resending a webhook event via the Stripe Dashboard for a nonexistent customer — same access gap.

## Follow-ups (unchanged from plan, none implemented here)

1. **Close out the portal-resume question in the product's own documentation.** Status: **still open** — human-check B, which was the only way to observe the answer, was NOT RUN this session.
2. **Reconcile paused subscriptions on a schedule.** Not implemented; recorded per plan.
3. **Analytics on the recovery funnel.** Not implemented; recorded per plan.
4. **Converge the server trial rule onto the shared predicate.** Not implemented; recorded per plan.

## Deviations from Plan

None affecting behavior or scope. One wording adjustment: the try/catch comment and error-log message around `resumePausedSubscriptions` in the webhook case were phrased to avoid repeating the exact identifier string a third and fourth time, because the plan's own structural grep (`grep -cF "resumePausedSubscriptions" ... # expect 2`) counts comment text along with code — the fix keeps the explanatory comments while satisfying the exact-count gate the plan specified.

## Self-Check: PASSED

- `lib/billing/resume-paused.ts` — FOUND
- `lib/billing/__tests__/resume-paused.test.ts` — FOUND
- `app/api/webhooks/stripe/route.ts` — modified, FOUND
- Commit `289a2736` — FOUND (`git log --oneline --all | grep 289a2736`)
- Commit `a23e6191` — FOUND
- Commit `4f69a7f7` — FOUND
