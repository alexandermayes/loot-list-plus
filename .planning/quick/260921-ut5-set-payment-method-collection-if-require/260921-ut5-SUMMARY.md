---
phase: quick-260921-ut5
plan: 01
subsystem: payments
tags: [stripe, checkout, billing, trials]

requires: []
provides:
  - "Checkout Session sets payment_method_collection: 'if_required' unconditionally, so a $0-due-today session (gift redemption or trial start) shows no card field"
  - "Trial-eligible sessions carry subscription_data.trial_settings.end_behavior.missing_payment_method: 'pause', so a cardless trial pauses at day 15 instead of invoicing"
affects: [billing, premium-checkout, discord-premium-role-sync]

actuals:
  tokens: 520
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Why-comments adjacent to non-obvious Stripe session params (matches the existing managed_payments comment pattern)"

key-files:
  created: []
  modified:
    - "app/api/billing/checkout/route.ts"

key-decisions:
  - "No new test added for the route change - npm run typecheck against stripe@22.5.0's own type declarations (top-level payment_method_collection union, required trial_settings.end_behavior shape) is a stronger gate than a route test asserting params against a self-authored mock; full rationale in the plan's <test_strategy_decision>."
  - "trial_settings placed inside the existing trialEligible ternary spread (not an unconditional sibling of metadata) so it is never sent on a non-trial checkout, avoiding a possible Stripe param rejection on the lapsed-resubscriber path."

patterns-established: []

requirements-completed: [PMC-01, PMC-02, PMC-03, PMC-04]

coverage:
  - id: D1
    description: "Checkout Session sends payment_method_collection: 'if_required' at the top level on every session"
    requirement: PMC-01
    verification:
      - kind: unit
        ref: "npm run typecheck (validates against stripe@22.5.0's SessionCreateParams top-level union type)"
        status: pass
      - kind: other
        ref: "grep -c \"payment_method_collection: 'if_required'\" app/api/billing/checkout/route.ts -> 1"
        status: pass
    human_judgment: true
    rationale: "Whether Stripe's hosted Checkout page actually omits the card field at $0 due is a fact about Stripe's servers, not observable from source or a mock - requires a live test-mode Checkout session (plan Task 2 human-check A)."
  - id: D2
    description: "Trial-eligible sessions send subscription_data.trial_settings.end_behavior.missing_payment_method: 'pause', gated on the same trialEligible spread as trial_period_days"
    requirement: PMC-02
    verification:
      - kind: unit
        ref: "npm run typecheck (validates trial_settings.end_behavior/missing_payment_method as required, non-optional keys)"
        status: pass
      - kind: other
        ref: "grep -c \"missing_payment_method: 'pause'\" app/api/billing/checkout/route.ts -> 1"
        status: pass
    human_judgment: true
    rationale: "Whether a real cardless trial actually transitions to status 'paused' at day 15, and whether the paused status then flips guilds.subscription_tier to 'free' via the untouched webhook chain, are facts about Stripe's servers and a Stripe test clock - requires the live test-mode procedure in plan Task 2 human-check B."
  - id: D3
    description: "A non-trial-eligible checkout (lapsed resubscriber) sends neither trial_period_days nor trial_settings"
    requirement: PMC-03
    verification:
      - kind: unit
        ref: "npm run typecheck; both fields live inside the single trialEligible ? {...} : {} spread at route.ts:93-104"
        status: pass
    human_judgment: false
  - id: D4
    description: "lib/billing/tier.ts, the Stripe webhook, lib/billing/sync.ts, the schema, and scripts/create-gift-code.ts are untouched; no duplicate tierForStatus('paused') test was added"
    requirement: PMC-04
    verification:
      - kind: other
        ref: "git diff --name-only HEAD~1 HEAD -> app/api/billing/checkout/route.ts (exactly one file)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-09-21
status: complete
---

# Phase quick-260921-ut5 Plan 01: Payment-method-collection and trial pause behavior Summary

**Checkout Session now sets `payment_method_collection: 'if_required'` unconditionally and gates `subscription_data.trial_settings.end_behavior.missing_payment_method: 'pause'` inside the existing trial-eligible spread, so a $0-due session shows no card field and a cardless trial pauses instead of invoicing at day 15.**

## Performance

- **Duration:** 12 min
- **Tasks:** 2/2
- **Files modified:** 1

## Accomplishments
- `payment_method_collection: 'if_required'` added as a top-level, unconditional field on the `stripe.checkout.sessions.create` call, removing the card-number requirement on any session where nothing is due today (gift redemptions, trial starts).
- `subscription_data.trial_settings.end_behavior.missing_payment_method: 'pause'` added inside the existing `trialEligible` ternary spread (alongside `trial_period_days`), so a cardless 14-day trial pauses at day 15 instead of generating an unpaid invoice, and never sends trial params on a non-trial (lapsed-resubscriber) checkout.
- Both fields carry an adjacent why-comment matching the house style of the existing `managed_payments` comment.
- Full verification gate run: `npm run typecheck` clean, `npm run lint` 0 errors (397 pre-existing warnings, none touching this file), `npx vitest run` 1261/1261 passing across 77 test files (one transient 5s timeout on an unrelated pre-existing test, `__tests__/hand-rolled-cards.test.ts`, reproduced as passing in isolation in 350ms and passing again on a clean full-suite re-run - confirmed unrelated to this change, see Issues Encountered).

## Task Commits

Each task was committed atomically:

1. **Task 1: Set payment_method_collection and trial_settings on the Premium Checkout Session** - `9080743` (feat)
2. **Task 2: Run the full gate and record the Checkout behavior human-check** - no commit (verification only, no files modified, per task scope)

**Plan metadata:** commit pending (docs commit handled by orchestrator per this workflow's constraints)

## Files Created/Modified
- `app/api/billing/checkout/route.ts` - Added `payment_method_collection: 'if_required'` (top-level, unconditional) and `subscription_data.trial_settings.end_behavior.missing_payment_method: 'pause'` (inside the `trialEligible` spread), each with an adjacent why-comment.

## Decisions Made
- No new test file added for `app/api/billing/checkout/route.ts`. The plan's `<test_strategy_decision>` reasoned that `npm run typecheck` against `stripe@22.5.0`'s own type declarations is a strictly stronger gate than a route test asserting params against a self-authored mock, and that the genuine residual risk (silent future deletion of these fields) is mitigated by the why-comments rather than a test. Followed as planned - no deviation.
- No duplicate `tierForStatus('paused')` test added; `lib/billing/__tests__/tier.test.ts:16` already covers the `paused` -> `free` mapping this change relies on.

## Deviations from Plan

None - plan executed exactly as written. Both fields were placed exactly as specified (top-level unconditional for `payment_method_collection`; inside the `trialEligible` spread for `trial_settings`), and no file outside `app/api/billing/checkout/route.ts` was touched.

## Issues Encountered

One `npx vitest run` invocation reported 1 failed / 1260 passed, with the failure being a 5000ms timeout in `__tests__/hand-rolled-cards.test.ts` (a pre-existing design-system scan test that walks `app/` and `components/` for hand-rolled card markup - unrelated to billing or this change). Re-running that single test file in isolation passed in 350ms, and a second full-suite run passed 1261/1261 across 77 files with no failures. Treated as a transient timeout under load (this environment's test run showed elevated setup/import/environment overhead, ~230s combined, likely contention from a concurrent process), not a regression caused by this change. Per the deviation rules' scope boundary, this is a pre-existing/unrelated flake and was not "fixed" - it self-resolved on re-run and required no code change.

## Human-Checks (Task 2) - NOT PERFORMED IN THIS EXECUTION

The plan's Task 2 human-checks A, B, C and D require a live Stripe test-mode key, a running local dev server reachable in a browser, a Stripe test clock, and a test Supabase project - none of which this execution had access to, and this execution's constraints explicitly prohibit running anything against a live Stripe key or printing `.env.local`/`STRIPE_SECRET_KEY` contents. These are recorded here as outstanding, not fabricated:

- **A. No card prompt when nothing is due today (D-01, PMC-01):** NOT RUN. Requires `sk_test_...` key + `npm run dev` + browser walkthrough of Guild Settings -> Billing -> trial checkout, observing the Stripe Checkout page for the absence of a card-number field at $0.00 due.
- **B. A trial that ends with no card pauses (D-02, PMC-02):** NOT RUN. Requires a Stripe test clock, a clock-bound test customer, a seeded `guild_subscriptions` row in a test Supabase project, advancing the clock 15 days, and observing the subscription status become `paused` (not `past_due`/`active`/`canceled`), then confirming the webhook flips `guilds.subscription_tier` to `free`.
- **C. The gift path still converts rather than pausing (PMC-01, PMC-03):** NOT RUN. Requires the gift-code CLI from quick task 260921-ud3 run against a test key, a test checkout with the code applied, and the same test-clock procedure as B, expecting subscription status `active` (not `paused`) after day 14.
- **D. Copy accuracy - report only, change nothing:** OBSERVED (read-only, no file touched). The three trial-copy strings the plan names are unchanged and still literally true after this change:
  - `app/components/UpgradeModal.tsx:105` - "Starts with a 14-day free trial. Cancel during the trial and you won't be charged."
  - `app/components/landing/PremiumPricing.tsx:104` - "Every new guild starts with a 14-day free trial. Cancel during the trial and you won't be charged..."
  - `app/(app)/guild-settings/components/BillingSection.tsx:115` - "...starts with a 14-day free trial."

  **Flagged follow-up (requires user sign-off per CLAUDE.md copy-voice constraint, not actioned here):** none of these strings is falsified by this change - a user is now less likely to be charged than the copy promises, not more - but the default they imply is inverted. The copy reads as "Premium continues unless you cancel," while after this change an officer who does nothing loses Premium (pauses) on day 15. This plan deliberately does not edit this copy; it is out of scope and requires explicit user sign-off before any change.

**Recommendation:** run human-checks A, B, and C against a Stripe test-mode key before this reaches production traffic on the trial/gift paths, since they are the only gates capable of observing Stripe's actual server-side behavior (Checkout rendering, trial-to-pause transition, webhook-driven tier flip).

## User Setup Required

None - no external service configuration required by this plan itself. (The human-checks above require an existing `sk_test_...` Stripe key and test Supabase project, which are pre-existing local/test infrastructure, not new setup introduced by this change.)

## Next Phase Readiness

The code change is complete, typechecked, linted, and passes the full existing regression suite. What remains before this can be considered fully verified in production is the live Stripe test-mode walkthrough (human-checks A, B, C above) and the user's copy sign-off on the trial-messaging follow-up noted in D. No blockers to merging the code itself.

## Self-Check: PASSED

- FOUND: app/api/billing/checkout/route.ts
- FOUND: commit 9080743 (git log --oneline --all | grep 9080743)

---
*Phase: quick-260921-ut5*
*Completed: 2026-09-21*
