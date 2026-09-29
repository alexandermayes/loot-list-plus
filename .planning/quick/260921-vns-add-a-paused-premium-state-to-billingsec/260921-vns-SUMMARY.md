---
phase: quick-260921-vns
plan: 01
subsystem: payments
tags: [stripe, billing, react, next.js, vitest]

requires:
  - phase: quick-260921-ut5
    provides: "payment_method_collection if_required + trial_settings.end_behavior.missing_payment_method pause on the Checkout Session, which is what produces a guild in status paused"
provides:
  - "lib/billing/subscription-view.ts: billingViewState() and trialEligible(), the shared client-side predicates for the Premium card's render state and trial copy"
  - "BillingSection three-state render (pro/paused/free/loading) with a PAUSED badge and a portal-only recovery path"
  - "usePremiumCheckout consuming the shared trialEligible predicate instead of restating the rule inline"
affects: [billing, guild-settings, premium-checkout]

actuals:
  tokens: 3092
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Pure, dependency-free predicate module in lib/billing/ (sibling of tier.ts) as the single source of a client-side business rule, imported by two independent call sites"
    - "undefined-vs-null tri-state (loading vs resolved-empty) threaded through a useState default to prevent a one-frame flash of the wrong branch"

key-files:
  created:
    - lib/billing/subscription-view.ts
    - lib/billing/__tests__/subscription-view.test.ts
  modified:
    - app/(app)/guild-settings/components/BillingSection.tsx
    - app/hooks/usePremiumCheckout.ts

key-decisions:
  - "Widened BillingSection's existing select by one column (stripe_subscription_id) rather than having it consume usePremiumCheckout, and hoisted the trial rule into a shared predicate both call sites import - avoids a second network round trip and the hook's wrong optimistic default for this surface (see plan's <trial_rule_reuse_decision>)"
  - "Unit-tested the new pure module only; no BillingSection.test.tsx - the mocking cost (GuildContext, NotificationContext, chained Supabase builder) is net-new scaffolding no existing test pays, and after extraction the component is a switch over three literal strings (see plan's <test_strategy_decision>)"
  - "Free-tier paragraph's second sentence changed from an unconditional trial promise to a trialEligible-gated sentence, dropping the prior 'and starts with a 14-day free trial. No credit card required.' clause entirely rather than appending after it - the plan's read_first assumed a 3-sentence structure that a same-day prior task (260921-v1f) had already merged into 2 sentences; kept the first two sentences intact and replaced the trailing trial claim with the two-way conditional the plan specifies, since leaving the old unconditional promise in place alongside a new conditional one would contradict PPS-04"

requirements-completed: [PPS-01, PPS-02, PPS-03, PPS-04, PPS-05, PPS-06]

coverage:
  - id: D1
    description: "billingViewState() and trialEligible() pure predicates, table-driven tested against all locked branches (tier-wins-over-stale-paused-row, paused-without-customer-id, loading-vs-resolved-empty)"
    requirement: "PPS-01, PPS-02, PPS-04, PPS-05"
    verification:
      - kind: unit
        ref: "lib/billing/__tests__/subscription-view.test.ts (13 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "BillingSection renders a distinct paused state (PAUSED badge + three-beat paragraph + single portal button, no upsell/UpgradeModal) for a free-tier guild with a paused+customer-id subscription row"
    requirement: "PPS-01, PPS-02, PPS-03"
    verification:
      - kind: unit
        ref: "npx vitest run (1274/1274 passing, no regressions); structural greps in Task 2 verify block"
        status: pass
    human_judgment: true
    rationale: "No BillingSection component test exists (see key-decisions); a real paused Stripe subscription and its rendered card were never observed live in this session - human-check A in the plan's Task 3 covers this and was not run (no live Stripe test-mode/Supabase test-project access in this environment)"
  - id: D3
    description: "The portal button, clicked from the paused state, resumes the same Stripe subscription (not a duplicate) and the webhook syncs the tier back to pro"
    requirement: "PPS-02, PPS-03"
    verification: []
    human_judgment: true
    rationale: "Decisive, plan-flagged open risk (<open_risk> section): Stripe's own docs do not confirm the portal alone resumes a subscription paused via missing_payment_method: pause. This can only be settled by human-check B against a live test-clock-paused subscription, which requires Stripe Dashboard + test-mode keys not available to this execution. Explicitly deferred, not resolved, per orchestrator instruction not to pre-build a speculative resume path."
  - id: D4
    description: "Free-tier trial sentence matches actual eligibility (never-subscribed guild sees the trial promise; a guild that already used its trial does not)"
    requirement: "PPS-04"
    verification:
      - kind: unit
        ref: "lib/billing/__tests__/subscription-view.test.ts trialEligible cases (4 tests)"
        status: pass
    human_judgment: true
    rationale: "The predicate is unit-proven; the two rendered sentences were never observed live against real guild_subscriptions rows (human-check C, not run - no live Supabase test-project session)."
  - id: D5
    description: "Copy sign-off on the four user-facing strings (paused paragraph, Add payment method label, both free-tier trial sentences)"
    verification: []
    human_judgment: true
    rationale: "CLAUDE.md requires explicit user sign-off on user-facing copy; not yet solicited in this session (human-check D)."

duration: 45min
completed: 2026-09-21
status: complete
---

# Quick Task 260921-vns: Paused Premium State in BillingSection Summary

**Three-state BillingSection render (pro/paused/free) via a new dependency-free `lib/billing/subscription-view.ts` predicate module, giving a trial-lapsed-without-a-card guild a PAUSED badge and a portal-only recovery path instead of the free-tier upsell that previously orphaned its subscription.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-09-21 (session start)
- **Completed:** 2026-09-21T05:59:17Z
- **Tasks:** 3 (2 produced commits; Task 3 was gate + human-check recording only)
- **Files modified:** 4

## Accomplishments
- New `lib/billing/subscription-view.ts` exports `billingViewState()` and `trialEligible()` - pure, dependency-free, modeled on `lib/billing/tier.ts` - with 13 table-driven tests pinning every branch, including the two regression-prone cases (paused-without-a-customer-id must not enter the paused state; Pro tier must win over a stale paused row).
- `BillingSection` now computes one `viewState` and renders three mutually exclusive blocks (`pro` / `paused` / `free`) plus a no-op `loading` state, replacing the old two-way `guildIsPro` ternary. A paused guild gets a PAUSED badge, the locked three-beat paragraph, and exactly one button that reuses the existing (unmodified) `openPortal` callback - no `UpgradeModal`, no checkout entry point.
- `subscription` state now initializes to `undefined` (not `null`) so "lookup unresolved" and "resolved, no row" stay distinct, preventing a one-frame flash of the wrong branch on load.
- Free-tier copy now appends a `trialEligible`-gated sentence instead of unconditionally promising a 14-day trial, so a guild that has already used its trial is not shown a promise the checkout route would refuse.
- `usePremiumCheckout` imports the shared `trialEligible` predicate instead of re-deriving the rule inline - the client-side trial-eligibility rule now exists in exactly one place.
- Full gate green: `npm run typecheck` (0 errors), `npm run lint` (0 errors, pre-existing unrelated warning count unchanged, none in touched files), `npx vitest run` (1274/1274 tests passing across 78 files, no regressions).

## Task Commits

1. **Task 1: Extract billing view-state and trial-eligibility predicates, with tests** - `6e43c10e` (feat)
2. **Task 2: Render the paused state in BillingSection and de-duplicate the trial rule** - `3bfcc9a5` (feat)
3. **Task 3: Run the full gate and record human-checks** - no commit (verification only; automated gates re-confirmed green after Task 2, human-checks recorded below as not-run)

## Files Created/Modified
- `lib/billing/subscription-view.ts` - new pure module: `BillingViewState`, `BillingSubscriptionLike`, `billingViewState()`, `trialEligible()`
- `lib/billing/__tests__/subscription-view.test.ts` - new, 13 tests covering all locked behavior rows
- `app/(app)/guild-settings/components/BillingSection.tsx` - widened `SubscriptionRow`/select by `stripe_subscription_id`; `undefined`-initialized subscription state; three-state render; new PAUSED badge; new paused block with portal button
- `app/hooks/usePremiumCheckout.ts` - one-line de-duplication: `trialEligible(data)` replaces the inline `!data?.stripe_subscription_id` negation

## Decisions Made
See `key-decisions` in frontmatter. In short: shared predicate over consuming the hook (avoids a second query and the hook's wrong optimistic default here); unit-test-only strategy (no component test - extraction makes the defect directly testable without new mocking scaffolding); and a reconciliation of the free-tier copy structure against same-day prior task 260921-v1f's already-merged 2-sentence wording (documented as a deviation below).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug/stale plan assumption] Free-tier paragraph structure reconciled against same-day copy already in the file**
- **Found during:** Task 2 (`BillingSection.tsx`)
- **Issue:** The plan's `<read_first>` and `<action>` assumed the free-tier paragraph was three distinct sentences ending in an unconditional trial promise ("...for the whole guild. Starts with a 14-day free trial. No credit card required."), and instructed keeping "the first two sentences as they are today" then appending a conditional third. The actual current file (already carrying same-day fast task 260921-v1f's revision) had merged the guild-cost and trial-promise clauses into one sentence via a comma: "Premium is $4.99/month or $39/year for the whole guild, and starts with a 14-day free trial. No credit card required." Applying the plan literally (keep-first-two-sentences-then-append) would have left the old unconditional trial promise in place alongside the new conditional sentence, directly contradicting the plan's own objective (PPS-04: stop promising a trial to guilds that won't get one).
- **Fix:** Kept "Your guild is on the free tier." and "Premium is $4.99/month or $39/year for the whole guild." as the two sentences, then appended the plan's exact two-way conditional (`trialEligible` ? the eligible sentence : the ineligible sentence) in place of the old always-on trial/no-card clause.
- **Files modified:** `app/(app)/guild-settings/components/BillingSection.tsx`
- **Verification:** No em dashes; `trialEligible` unit tests cover the predicate; `npm run lint`/`typecheck`/`vitest run` all pass. Exact wording is unresolved pending human-check D (copy sign-off) either way.
- **Committed in:** `3bfcc9a5` (Task 2 commit)

**2. [Documented, not code] Task 2's `UpgradeModal` grep literal count did not match the plan's `<verify>` expectation**
- **Found during:** Task 2 verification
- **Issue:** The plan's structural grep `grep -c "UpgradeModal" ... expect 2` (import + one render site). The actual count is and was already 6, because `showUpgradeModal`/`setShowUpgradeModal` state-variable lines also match the `UpgradeModal` substring. Confirmed via `git show` on the pre-Task-2 committed file: the count was already 6 before this task's edits, so this is a pre-existing miscalibration in the plan's grep, not a regression.
- **Fix:** None needed - the underlying invariant the gate cares about (`<UpgradeModal` render tag appears exactly once, in the free block only) holds: `grep -c "<UpgradeModal"` returns 1.
- **Files modified:** none (informational only)
- **Verification:** `grep -c "<UpgradeModal" "app/(app)/guild-settings/components/BillingSection.tsx"` → 1
- **Committed in:** n/a

---

**Total deviations:** 2 (1 auto-fixed copy reconciliation under Rule 1, 1 informational note on a pre-existing plan grep miscalibration)
**Impact on plan:** No scope creep. Both are narrow corrections that keep the shipped behavior aligned with the plan's stated objective and success criteria.

## Issues Encountered

- `gsd-tools windows append` failed with `Error: Ledger entry 29 has invalid status: "resolved"` - a pre-existing corruption in `.planning/WINDOWS.md` unrelated to this task (entry 29 predates this session). Per the ledger's documented best-effort contract, this does not block execution; the unrun human-checks are instead recorded directly in this SUMMARY's `coverage:` block (D2-D5) and below.
- During Task 2 verification, `git status --porcelain` showed unrelated in-flight modifications to `app/globals.css` and `app/layout.tsx` (a `.tabular-nums` numeral-face fix, tagged `G-11-1`, from a concurrent design-system workstream). These were left untouched and were not staged or committed by this plan - confirmed the two task-2 commits contain only the four files in `files_modified`.

## Human-Checks (Task 3) - Not Run This Session

Per the plan, `workflow.human_verify_mode` is `end-of-phase`, so these are deferred checks rather than a blocking checkpoint, and Task 3 has no automation path to a live Stripe test-mode dashboard, a Supabase test project, or a running `npm run dev` session with real test keys in this execution environment. All four are unresolved and recorded here for the end-of-phase review:

**A. A genuinely paused subscription renders the paused state (PPS-01, PPS-03)** - NOT RUN. Requires a Stripe test clock, a seeded `guild_subscriptions` row, and a live `npm run dev` session against `.env.local` test-mode keys.

**B. The portal resumes the same subscription rather than creating a second one (PPS-02, PPS-03) - decisive** - NOT RUN. This is the single most important open item in the plan (`<open_risk>`): Stripe's own docs say a subscription paused via `missing_payment_method: 'pause'` "remains `paused` until explicitly resumed," and the customer portal's documented feature list does not mention resuming a paused subscription. Per the orchestrator's explicit instruction, this plan does NOT pre-build a server-side `stripe.subscriptions.resume()` path - calling resume on an already-resumed subscription is an error, and this check is what would tell us which case applies. **Follow-up 1 (server-side resume) status: UNDETERMINED - required or not-required cannot be marked until a human runs check B.**

**C. Free-tier trial copy matches actual eligibility (PPS-04)** - NOT RUN. The `trialEligible` predicate itself is unit-tested (4/4 passing); the two rendered sentences were not observed against live `guild_subscriptions` rows.

**D. Copy sign-off (blocking per CLAUDE.md)** - NOT OBTAINED. The four strings below are unreviewed drafts, written exactly as the plan specified them (see the deviation note above for the free-tier sentence structure change):
  - Paused paragraph: "Your trial ended, so Premium is paused. Add a payment method to turn it back on. Your guild data is safe and nothing was lost."
  - Paused button label: "Add payment method" (busy: "Opening…")
  - Free-tier eligible sentence: "It starts with a 14-day free trial, and no credit card is required."
  - Free-tier ineligible sentence: "Your guild has already used its free trial, so Premium starts as soon as you subscribe."

**E. Follow-ups (report only, nothing implemented):**
1. **Server-side resume** - status UNDETERMINED, pending human-check B (see above).
2. **Converge the server trial rule (`app/api/billing/checkout/route.ts:69`) onto the shared predicate** - not implemented, out of scope per plan constraint; recorded as a small, separate follow-up.
3. **`PremiumPricing.tsx` line 104 trial copy + no analytics event on the resume path** - not implemented, out of scope per plan constraint; recorded as a follow-up.

## User Setup Required

None - no external service configuration required. Human-checks A-D above require the user (or a session with live Stripe test-mode + Supabase test-project access) to run the plan's Task 3 `<human-check>` procedure end-to-end before this feature is considered verified in production behavior, and before copy ships as final.

## Next Phase Readiness

- Code, types, lint, and the full existing test suite are all green with no regressions; the four in-scope files match the plan's `files_modified` exactly; all off-limits files (checkout route, webhook, `tier.ts`, `sync.ts`, portal route, `PremiumPricing.tsx`, schema) are untouched.
- Blocking before this can be called fully verified: human-checks A, B (decisive), C, and D from Task 3, run against a live Stripe test-mode session. Follow-up 1's requiredness hinges entirely on B's outcome.

---
*Phase: quick-260921-vns*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 4 files_modified paths exist on disk; both task commits (`6e43c10e`, `3bfcc9a5`) verified present via `git log --oneline --all`.
