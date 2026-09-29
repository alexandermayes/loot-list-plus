---
phase: quick-260921-ud3
plan: 01
subsystem: payments
tags: [stripe, cli, promotion-code, gift-code]

requires: []
provides:
  - "scripts/lib/gift-code.ts: pure flag-parsing/validation/code-generation/Stripe-param-builder module"
  - "scripts/create-gift-code.ts: CLI that mints a single-use, expiring, 100%-off Stripe promotion code"
  - "npm run gift:code alias"
affects: [billing, stripe-scripts]

actuals:
  tokens: 5800
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Pure-module-plus-thin-CLI split (scripts/lib/*.ts pure, scripts/*.ts side effects) so vitest can cover business logic with no dotenv/network risk"
    - "Two-pass secret redaction (literal value, then a general sk_live_/sk_test_-shaped regex) to catch Stripe's own partially-masked auth-error text, not just the exact key"

key-files:
  created:
    - scripts/lib/gift-code.ts
    - scripts/lib/__tests__/gift-code.test.ts
    - scripts/create-gift-code.ts
  modified:
    - package.json

key-decisions:
  - "PromotionCodeCreateParams.coupon does not exist in Stripe SDK 22.5.0 — the real shape is a nested promotion: { type: 'coupon', coupon: couponId } object; caught by npm run typecheck against the real Stripe types exactly as PD-6 anticipated, fixed in Task 3 (Rule 1 bug fix)"
  - "Ambiguous-character guarantee (no 0/O/1/I/L/U) applies to the random 8-character suffix, not the full code string — the fixed GIFT_CODE_PREFIX itself contains the letter I by design, so a literal full-string reading of the plan's behavior spec was untestable; test scoped to the generated suffix"
  - "gift-code.ts written as one complete module across Task 1 (including redactStripeSecrets, ahead of its Task 2 test coverage) rather than split further, since removing already-written security-relevant code mid-flight for later re-addition was blocked by the harness's safety classifier; Task 2's commit adds only the redaction tests and the CLI/package.json changes"

patterns-established:
  - "Live-mode Stripe scripts gate on isLiveKey() before any network call, requiring --yes or an interactive TTY confirmation, and refuse non-interactive live runs outright"

requirements-completed: [GIFT-01, GIFT-02, GIFT-03, GIFT-04, GIFT-05, GIFT-06]

coverage:
  - id: D1
    description: "--dry-run prints the exact coupon/promotion-code payload with zero network calls"
    requirement: "GIFT-05"
    verification:
      - kind: other
        ref: "STRIPE_SECRET_KEY=sk_test_<REDACTED_TEST_PLACEHOLDER> npx tsx scripts/create-gift-code.ts --dry-run (tripwire-key grep = 0, contains '100')"
        status: pass
    human_judgment: false
  - id: D2
    description: "A test-mode run creates a single-use, expiring, 100%-off promotion code with gift metadata, backed by a 100%-off coupon; --months N switches to a repeating coupon"
    requirement: "GIFT-01, GIFT-06"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/gift-code.test.ts#buildCouponParams, #buildPromotionCodeParams, #giftMetadata, #resolveGift"
        status: pass
      - kind: other
        ref: "npm run gift:code -- --dry-run --months 3 --expires-in-days 14 (prints 'repeating', tripwire-key grep = 0)"
        status: pass
    human_judgment: true
    rationale: "The dry-run and unit tests prove the payload shape and metadata, but only a real test-mode Stripe creation plus a Checkout redemption (Task 3 human-check) proves the resulting object is genuinely redeemable end to end — that step needs a real sk_test_ key and a browser, which this agent does not have. Deferred; see Known Stubs / Deviations."
  - id: D3
    description: "A live-mode (sk_live_) key creates nothing without --yes or an interactive confirmation; a non-interactive live run without --yes exits non-zero before any Stripe call"
    requirement: "GIFT-03"
    verification:
      - kind: other
        ref: "STRIPE_SECRET_KEY=sk_live_<REDACTED_TEST_PLACEHOLDER> npx tsx scripts/create-gift-code.ts < /dev/null (exit 1, tripwire-key grep = 0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The secret key, or any substring of it, never reaches stdout/stderr on any success, validation-error, or Stripe-failure path"
    requirement: "GIFT-04"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/gift-code.test.ts#redactStripeSecrets (6 cases including Stripe's own partially-masked message shape)"
        status: pass
      - kind: other
        ref: "All four tripwire-key verify commands (Tasks 1-2) grep for the literal tripwire substring and assert zero matches"
        status: pass
    human_judgment: false
  - id: D5
    description: "Missing STRIPE_SECRET_KEY or an invalid numeric flag exits non-zero naming the offending input"
    requirement: "GIFT-02"
    verification:
      - kind: unit
        ref: "scripts/lib/__tests__/gift-code.test.ts#parseGiftCodeArgs (0/-5/abc/2.5/missing-value cases, unrecognised-flag case)"
        status: pass
      - kind: other
        ref: "STRIPE_SECRET_KEY= npx tsx scripts/create-gift-code.ts --dry-run; STRIPE_SECRET_KEY=... --expires-in-days 0 (both exit non-zero)"
        status: pass
    human_judgment: false
  - id: D6
    description: "npm run typecheck, npx vitest run (full suite), and npm run lint all pass with no new findings in this plan's files"
    verification:
      - kind: other
        ref: "npm run typecheck"
        status: pass
      - kind: other
        ref: "npx vitest run (77 files, 1261 tests)"
        status: pass
      - kind: other
        ref: "npm run lint (0 errors; 397 pre-existing warnings elsewhere, none in this plan's files)"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-09-21
status: complete
---

# Quick Task 260921-ud3: Stripe Gift-Code Script Summary

**`npm run gift:code` CLI mints a single-use, expiring, 100%-off Stripe promotion code with a live-mode confirmation gate, a two-pass secret-redaction chokepoint, and a pure/tested `scripts/lib/gift-code.ts` module behind it.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files modified:** 4 (3 created, 1 modified)

## Accomplishments

- `scripts/lib/gift-code.ts`: pure module for flag parsing, code normalization/generation (unambiguous 30-char alphabet via `crypto.randomInt`), expiry math, Stripe coupon/promotion-code param builders, and two-pass secret redaction — no dotenv, no Stripe client, no network, fully unit tested (30 tests)
- `scripts/create-gift-code.ts`: CLI wiring dotenv → arg parsing → dry-run summary → live-mode confirmation gate (flag or TTY prompt, refuses non-interactive live runs) → uniqueness pre-check → coupon + promotion-code creation → redacted error handling
- `package.json`: `gift:code` npm alias added after `seed:help`
- Every verification command in the plan (including four separate tripwire-key greps) confirmed zero leakage of the fake secret key across dry-run, missing-key, invalid-flag, and refused-live-mode paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Pure gift-code module plus an end-to-end dry run** - `ae9d141c` (feat)
2. **Task 2: Live-mode gate, secret redaction, real creation path, npm alias** - `6cbd7afe` (feat)
3. **Task 3: Full gate and a real test-mode proof** - `329a46fb` (fix — typecheck-caught Stripe param shape correction; see Deviations)

**Plan metadata:** committed by the orchestrator in a later step (not this agent, per constraints).

## Files Created/Modified

- `scripts/lib/gift-code.ts` - Pure helpers: `parseGiftCodeArgs`, `normalizeGiftCode`, `generateGiftCode`, `resolveGift`, `giftMetadata`, `buildCouponParams`, `buildPromotionCodeParams`, `isLiveKey`, `redactStripeSecrets`
- `scripts/lib/__tests__/gift-code.test.ts` - 30 unit tests covering every pure helper, including the unambiguous-alphabet guarantee and Stripe's partially-masked auth-error message shape
- `scripts/create-gift-code.ts` - CLI: dotenv load, env guard, dry-run summary, live-mode gate, uniqueness pre-check, coupon/promotion-code creation, redacted error output
- `package.json` - `"gift:code": "tsx scripts/create-gift-code.ts"` added to `scripts`

## Decisions Made

- **PromotionCodeCreateParams shape correction (Rule 1, Task 3):** Stripe SDK 22.5.0's `PromotionCodeCreateParams` has no top-level `coupon` field — the real shape is `promotion: { type: 'coupon', coupon: couponId }`. `npm run typecheck` caught this against the real Stripe param types exactly as PD-6 predicted. Fixed in both `buildPromotionCodeParams` and its unit test; re-verified typecheck, the full vitest suite, and lint all pass clean afterward.
- **Ambiguous-character test scope:** the plan's behavior spec ("200 codes ... contain none of the characters 0, O, 1, I, L, U") is only satisfiable against the random 8-character suffix, since `GIFT_CODE_PREFIX = 'GIFT'` itself contains the letter `I` by design (PD-2's alphabet exclusions apply to `GIFT_CODE_ALPHABET`, not the literal prefix string). Test scoped accordingly.
- **gift-code.ts commit boundary:** `redactStripeSecrets` was written in the same initial pass as the rest of `gift-code.ts` (Task 1's commit) rather than added purely in Task 2, because the harness's security classifier blocked an Edit call that would have temporarily removed the already-written redaction function for later re-addition. Task 2's commit instead adds the redaction unit tests plus all of the CLI/package.json changes. No functional difference from the plan's intent — same code, same task-2-scoped tests, just consolidated at the file level.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected `PromotionCodeCreateParams` shape for Stripe SDK 22.5.0**
- **Found during:** Task 3 (`npm run typecheck`)
- **Issue:** `buildPromotionCodeParams` built `{ coupon: couponId, ... }`, but the installed Stripe SDK's real type requires `{ promotion: { type: 'coupon', coupon: couponId }, ... }`. This would have been a runtime Stripe API rejection on the very first real (non-dry-run) creation call.
- **Fix:** Changed `buildPromotionCodeParams` to emit `promotion: { type: 'coupon', coupon: couponId }`; updated the corresponding unit test assertion.
- **Files modified:** `scripts/lib/gift-code.ts`, `scripts/lib/__tests__/gift-code.test.ts`
- **Verification:** `npm run typecheck` clean; `npx vitest run` (full suite, 1261 tests) clean; `npm run lint` clean for this plan's files.
- **Committed in:** `329a46fb`

---

**Total deviations:** 1 auto-fixed (1 Rule 1 bug fix)
**Impact on plan:** Necessary correctness fix caught by the compiler exactly where PD-6 said it would be; no scope creep, no behavior change beyond the corrected API shape.

## Known Stubs

None. All shipped code paths (dry-run, live-mode gate, uniqueness pre-check, creation, error redaction) are fully implemented, not stubbed.

## Issues Encountered

- **Task 3 human-check not performed by this agent.** The plan's Task 3 verification includes a `<human-check>`: run `npm run gift:code` with a real `sk_test_` key, inspect the resulting coupon/promotion code in the Stripe test-mode dashboard, then start a Premium checkout and confirm the code redeems to a zero total. Per this task's `<critical_safety_rules>` (never run the script against a live key; be conservative about touching `.env.local` at all) and the practical limits of this environment (no browser access to the Stripe-hosted checkout page), this step was not executed. All automated verification for Task 3 (typecheck, full vitest suite, lint) passed. **This is the one open item from the plan's `<verification>` block** — a human with a real test-mode `STRIPE_SECRET_KEY` in `.env.local` needs to run `npm run gift:code` (no flags), check the dashboard, and attempt the checkout redemption to close it out. Recorded as coverage item D2 above with `human_judgment: true`.
- All other plan verification steps (dry-run payload, missing-key exit, invalid-flag exit, live-mode refusal, `--months` repeating coupon, npm alias presence, tripwire-key absence in every output) were executed by this agent and passed.

## User Setup Required

None — no new environment variables. The script reads the existing `STRIPE_SECRET_KEY` that `lib/billing/stripe.ts` already uses.

## Next Phase Readiness

- The script is ready to use for gifting Premium once the Task 3 human-check (real test-mode creation + Checkout redemption) is completed by a human with dashboard/browser access.
- Flagged out of scope per the plan (see `260921-ud3-PLAN.md` `<flagged_out_of_scope>`): Checkout still collects a card even at a zero total (a separate `payment_method_collection` change to `app/api/billing/checkout/route.ts`, not touched here); no revoke script exists yet (dashboard deactivation is the current path).

## Self-Check: PASSED

- FOUND: scripts/lib/gift-code.ts
- FOUND: scripts/lib/__tests__/gift-code.test.ts
- FOUND: scripts/create-gift-code.ts
- FOUND: gift:code alias in package.json
- FOUND: commit ae9d141c (Task 1)
- FOUND: commit 6cbd7afe (Task 2)
- FOUND: commit 329a46fb (Task 3)

---
*Quick task: 260921-ud3*
*Completed: 2026-09-21*
