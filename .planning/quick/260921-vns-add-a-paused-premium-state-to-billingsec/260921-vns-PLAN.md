---
phase: quick-260921-vns
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/billing/subscription-view.ts
  - lib/billing/__tests__/subscription-view.test.ts
  - app/(app)/guild-settings/components/BillingSection.tsx
  - app/hooks/usePremiumCheckout.ts
autonomous: true
requirements:
  - PPS-01
  - PPS-02
  - PPS-03
  - PPS-04
  - PPS-05
  - PPS-06

estimate:
  # Factor 0.18 derived from the only calibration data in the repo
  # (.planning/workstreams/design-system/estimation-calibration.json, 6 samples,
  # mean actual/estimate 0.175). Those samples are from a different workstream,
  # so confidence stays low rather than med despite the sample count.
  tokens: 7000
  raw_tokens: 40000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "An officer whose guild sits at the `free` tier with a live Stripe subscription in status `paused` sees a distinct paused state in the Premium card: a PAUSED badge beside the heading, a paragraph carrying all three locked beats (the trial ended and Premium is paused / adding a payment method turns it back on / their guild data is safe), and one button. They do NOT see the free-tier upsell (PPS-01)"
    - "That button opens the existing Stripe customer portal through the unchanged `POST /api/billing/portal`, so a paused guild can reach billing at all - today the only portal button in the file lives inside the `guildIsPro` true-branch and a paused guild renders the false-branch (PPS-02, Bug 1)"
    - "The paused state offers no path into `UpgradeModal` or Stripe Checkout, so recovery cannot mint a second subscription that `guild_subscriptions`' upsert-on-`guild_id` would orphan the paused one behind (PPS-03, Bug 2)"
    - "The free-tier paragraph promises a 14-day trial only when the guild is actually trial eligible. A guild that has ever held a subscription gets a sentence that does not promise a trial, matching what `app/api/billing/checkout/route.ts:69` will actually grant it (PPS-04, Bug 3)"
    - "The client-side trial-eligibility rule exists in exactly one place: a shared predicate that both `BillingSection` and `usePremiumCheckout` import. The rule is not written a third time (PPS-05)"
    - "A viewer without `manage_settings` still sees nothing - the component's existing early return is unchanged, and no new data is fetched for them (PPS-01)"
    - "`app/api/billing/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`, `lib/billing/tier.ts`, `lib/billing/sync.ts`, `app/components/landing/PremiumPricing.tsx`, `app/api/billing/portal/route.ts` and the database schema are byte-identical to their pre-plan state (PPS-06)"
    - "`npm run typecheck`, `npm run lint` and `npx vitest run` all pass"
  artifacts:
    - "lib/billing/subscription-view.ts - new, pure, dependency-free: `billingViewState()` and `trialEligible()`"
    - "lib/billing/__tests__/subscription-view.test.ts - new, the automated gate for every branch of both predicates"
    - "app/(app)/guild-settings/components/BillingSection.tsx - modified: one widened select, three guarded branches in place of the two-way ternary, one new badge, one new button"
    - "app/hooks/usePremiumCheckout.ts - modified: one line, the inline eligibility negation replaced by a call to the shared predicate"
  key_links:
    - "`billingViewState` must return `'paused'` ONLY when a `stripe_customer_id` is present. `POST /api/billing/portal` returns 404 `No billing account for this guild` when the row has no customer id (portal/route.ts:44-46), so a paused state rendered without one would put an Add-payment-method button on screen that is guaranteed to fail. The customer id is the precondition for the button existing, not just for it succeeding."
    - "`maybeSingle()` resolves `data` to `null` when there is no row. The component therefore needs THREE states, not two: `undefined` = lookup not finished, `null` = finished and no row. Collapsing them makes a paused guild flash the free-tier upsell and makes a lapsed guild flash the 14-day-trial promise - re-showing, for one frame, the exact copy Bug 3 is about. `useState` must be initialized to `undefined`, not `null`."
    - "`guildIsPro` wins over `paused`. A complimentary Pro guild (tier set manually, `stripe_customer_id` null) and any guild carrying a stale paused row must keep rendering the Pro branch. Tier is the entitlement source of truth; the subscription row is only used to explain the tier."
    - "Recovery must route through the portal, not checkout. `syncSubscriptionToGuild` upserts `guild_subscriptions` with `onConflict: 'guild_id'` (lib/billing/sync.ts:18-20), so a second subscription overwrites `stripe_subscription_id` and the paused one becomes untracked and unbillable-against. The portal acts on the SAME `sub_...`."
    - "`app/api/billing/portal/route.ts` is reached by BOTH branches after this change and is not modified. Its `verifyPermission(..., 'manage_settings')` is the real authorization; the component's `canManage` is presentation only."
---

<objective>
Give a guild whose Premium trial ended without a payment method a state that says so and a button that can fix it, and stop the free-tier copy from promising a trial to guilds that will not get one.

Purpose: earlier today `app/api/billing/checkout/route.ts` started sending `payment_method_collection: 'if_required'` and `trial_settings.end_behavior.missing_payment_method: 'pause'` (commit 90807435), and commit 9b8c4bce taught the webhook to sync `customer.subscription.paused` / `.resumed`. Together they created a user-visible state that no UI in the app handles: a guild on the `free` tier with a live, paused Stripe subscription. Today that officer lands on the free-tier upsell, whose only button starts a fresh checkout - the one recovery path that orphans their paused subscription instead of resuming it.

Output: one new pure module plus its tests, a three-state render in `BillingSection`, and a one-line de-duplication in `usePremiumCheckout`.

Scope boundary: `app/api/billing/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`, `lib/billing/tier.ts`, `lib/billing/sync.ts`, the database schema and `app/components/landing/PremiumPricing.tsx` are all off-limits. `app/api/billing/portal/route.ts` is read but not modified - the paused button reuses it exactly as the Pro branch does.

Tracer-first decomposition is deliberately not applied. Every layer this touches is already shipped and proven: the portal route, the webhook, the tier mapping and the `openPortal` callback all exist and work. There is no architecture to prove end-to-end, only a missing branch in one component. The plan is therefore the predicate, the render, and the gate.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/workstreams/default/STATE.md
@.claude/CLAUDE.md
@app/(app)/guild-settings/components/BillingSection.tsx
@app/hooks/usePremiumCheckout.ts
@app/api/billing/portal/route.ts
@app/api/billing/checkout/route.ts
@lib/billing/tier.ts
</context>

<trial_rule_reuse_decision>
The constraint asked for a justified choice between having `BillingSection` consume `usePremiumCheckout` for its `trialAvailable` value and having it add `stripe_subscription_id` to its own existing select. **Decision: neither in isolation. Widen the existing select, and hoist the rule itself into a shared predicate that both call sites import.**

Why not consume the hook:

1. It would fire a second network round trip for data the component is already fetching. `BillingSection` runs a `guild_subscriptions` select in its own `useEffect`; `usePremiumCheckout` runs an independent select against the same row of the same table. Calling the hook means two queries where one column added to the existing query answers the question for free.
2. The hook does not expose what this component needs. `BillingSection` must know `status` and `stripe_customer_id` to decide between the paused and free branches at all; the hook returns neither. So the component keeps its own query regardless, and the hook's value would be strictly redundant.
3. The hook is a checkout driver, not a data source. It owns `startCheckout`, a `redirecting` state machine, and a `pro_upgrade_clicked` analytics event keyed on a `source` string. Mounting all of that in the paused branch - the branch whose entire purpose is to NOT start a checkout - couples the fix to the thing it is fixing.
4. Its optimistic default is wrong for this surface. The hook initializes `trialAvailable` to `true` and corrects it after the query resolves, which is harmless where it is used because only officers can act on it. Here that default is the bug: a lapsed guild would render the 14-day-trial promise for a frame. This plan instead withholds the sentence until the lookup resolves.

Why not simply inline `!sub?.stripe_subscription_id` in the component: that is the "third place" the constraint warns about. The rule already lives at `app/api/billing/checkout/route.ts:69` (server, authoritative) and in `usePremiumCheckout` (client). A third copy means a future change to eligibility silently desynchronizes the copy from the behavior - which is exactly the shape of Bug 3.

So Task 1 extracts `trialEligible()` into `lib/billing/subscription-view.ts`, `BillingSection` imports it, and `usePremiumCheckout` is edited to import it too. Client-side copies go from two to one.

The server copy in `app/api/billing/checkout/route.ts:69` stays duplicated, deliberately: that file is explicitly out of scope for this task, and the server rule must remain independently enforced anyway - a client predicate is a copy hint, never an authorization. Converging the route onto the same predicate is recorded as a follow-up in `<followups>`.
</trial_rule_reuse_decision>

<test_strategy_decision>
The constraint asked for a reasoned decision on a test file rather than a default. **Decision: yes to a pure-module unit test, no to a `BillingSection` component test.** The constraint's premise is also worth correcting: the repo has 22 `.test.tsx` files, not "almost no component tests" - including `RaidMemberList`, `SkipDayModal` and `LoginPage`. Component testing is an established practice here. It is still the wrong tool for this change.

Against a `BillingSection.test.tsx`:

1. **The mocking cost is net-new scaffolding, not reuse.** `BillingSection` needs `useGuildContext` (guild + `hasPermission`), `useNotification`, and a Supabase client whose chained `.from().select().eq().maybeSingle().then()` builder resolves per test. Grep confirms **no existing test in the repo mocks `GuildContext`**; only `LoginPage.test.tsx` mocks `utils/supabase/client` at all. So the first such test pays for the whole harness, and every future guild-settings test inherits whatever shape it guesses at.
2. **It would assert JSX, not the defect.** After extraction the component is a switch over three literal strings. A render test would mostly restate that branch `'paused'` renders the word "Paused" - a change-detector over copy the user still has to sign off on.
3. **The defect is branch selection, and extraction makes it directly testable.** Bugs 1, 2 and 3 are all one question: given a tier and a subscription row, which state is this? That is a pure function, and it takes nine table-driven cases with no DOM, no context and no mocks to pin completely - including the two cases most likely to regress (`paused` with no `stripe_customer_id`, and Pro-tier-wins-over-stale-paused-row).
4. **House precedent points the same way.** `lib/billing/tier.ts` carries the comment "Kept dependency-free so it's trivially unit-testable" and has `lib/billing/__tests__/tier.test.ts`; quick task 260921-ud3 extracted `scripts/lib/gift-code.ts` for the same reason. The new module is a sibling of `tier.ts` in both location and character.
5. **The extraction carries no risk of the kind that blocked it last time.** Quick task 260921-ut5 declined extraction because it would have meant lifting shipped, revenue-carrying payment-path code out of a working route purely to enable a test. Here the extracted logic is new in this very change, plus one line moved out of a hook. Nothing shipped is restructured.

What the unit test cannot reach - that a genuinely paused Stripe subscription produces the row shape the predicate expects, and that the portal resumes rather than duplicates - is captured in Task 3's `<human-check>`, per `workflow.human_verify_mode: end-of-phase`.
</test_strategy_decision>

<open_risk>
**The locked design promises "add a payment method turns it back on". Stripe's docs do not currently guarantee that the portal alone does this. Task 3's human-check B is what settles it, and it is the single most important gate in this plan.**

Stripe's trials documentation says of the `pause` end behavior: *"The subscription moves to the `paused` status and sends this event after a free trial ends without a payment method and if the subscription's `missing_payment_method` end behavior is set to `pause`. **The subscription remains `paused` until explicitly resumed.**"* The customer portal's documented feature list covers "Update payment methods" and "Update subscriptions" but says nothing about resuming a paused subscription.

Two possible outcomes, both already scoped:

- **Portal resume works** (adding a payment method resumes the same `sub_...`, Stripe fires `customer.subscription.resumed`, the webhook case added in 9b8c4bce syncs the tier back to `pro`): nothing further is needed. This plan is complete as written.
- **Portal resume does not work** (the card attaches but status stays `paused`): the shipped copy becomes a false promise and the follow-up in `<followups>` becomes required, not optional - a server-side resume. Do NOT pre-build it. Calling `stripe.subscriptions.resume()` on a subscription Stripe already resumed is an error, so speculative implementation is wrong until the check answers the question.

This plan ships the locked shape either way. It does not re-litigate the design, and it does not widen scope on a guess.
</open_risk>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extract the billing view-state and trial-eligibility predicates, with tests</name>
  <files>lib/billing/subscription-view.ts, lib/billing/__tests__/subscription-view.test.ts</files>
  <read_first>
Read `lib/billing/tier.ts` first. It is the sibling this module is modelled on: a file header comment stating the module's purpose, a `switch`-or-guard body with no imports at all, and a doc comment above each export explaining the non-obvious case. Match that voice and density. Read `lib/billing/__tests__/tier.test.ts` for the test file's shape.

Then note the two facts from `app/(app)/guild-settings/components/BillingSection.tsx` that drive the signatures:
- the select at line 40 returns a row through `.maybeSingle()`, so `data` is `null` when the guild has no `guild_subscriptions` row at all
- `guildIsPro` at line 33 comes from `isPro(activeGuild)`, i.e. from `guilds.subscription_tier`, which is synced by the webhook and is the entitlement source of truth

And from `app/api/billing/portal/route.ts:44-46`: the route returns 404 when the row has no `stripe_customer_id`.
  </read_first>
  <action>
Create `lib/billing/subscription-view.ts`. No imports. Give it a file header in the voice of `lib/billing/tier.ts` saying it maps a guild's tier plus its stored Stripe subscription row to the state the Premium card renders, and that it is dependency-free so the trial rule lives in exactly one client-side place.

Export a structural row type - call it `BillingSubscriptionLike` - with the two optional nullable fields these predicates read: `status` and `stripe_customer_id`, plus `stripe_subscription_id`. Keep every field optional so both call sites' differently-shaped selects satisfy it structurally: `BillingSection` selects five columns, `usePremiumCheckout` selects one.

Export `BillingViewState` as a union of exactly four string literals: `'pro'`, `'paused'`, `'free'`, `'loading'`.

Export `billingViewState(guildIsPro, sub)` returning `BillingViewState`, where `sub` accepts the row, `null`, or `undefined`. Evaluate the guards in this order, and document why each ordering choice matters in an adjacent comment:
1. If `guildIsPro` is true, return `'pro'` - unconditionally, before anything else looks at the row. Tier is the entitlement source of truth. This is what keeps a complimentary Pro guild (no row at all) and any guild carrying a stale paused row on the Pro branch instead of being shown a downgrade notice.
2. If `sub` is `undefined`, return `'loading'`. `undefined` means the lookup has not resolved; `null` means it resolved and found no row. Conflating the two is what would flash the wrong copy for a frame.
3. If the row's `status` is the literal `paused` AND the row has a truthy `stripe_customer_id`, return `'paused'`. Both conditions are required. Without a customer id the portal route answers 404, so a state whose only action is the portal must not be entered.
4. Otherwise return `'free'`. Every other Stripe status that maps to the free tier - canceled, unpaid, incomplete_expired, and a null status - lands here by design; this change is scoped to the paused case only.

Export `trialEligible(sub)` taking the same row-or-null-or-undefined and returning a boolean: true when the row carries no `stripe_subscription_id`. Document that it mirrors the server rule at `app/api/billing/checkout/route.ts:69`, that the server remains authoritative, and that this predicate exists so copy cannot drift from that rule. Note in the comment that a null or absent row means the guild never subscribed, which is the eligible case.

Create `lib/billing/__tests__/subscription-view.test.ts` covering the `<behavior>` table below. Use `describe`/`it`/`expect` with vitest globals, matching `lib/billing/__tests__/tier.test.ts` - no imports from React, no DOM.

Do not touch `lib/billing/tier.ts`, `lib/billing/sync.ts` or any file outside the two named above in this task.
  </action>
  <behavior>
`billingViewState(guildIsPro, sub)`:
- (true, undefined) is 'pro' - a complimentary Pro guild has no subscription row and must never wait on one
- (true, row with status 'active') is 'pro'
- (true, row with status 'paused' and a customer id) is 'pro' - tier wins; a stale paused row must not downgrade the display of a guild the DB says is Pro
- (false, undefined) is 'loading'
- (false, null) is 'free' - resolved, no row, never subscribed
- (false, row with status 'paused' and customer id 'cus_123') is 'paused'
- (false, row with status 'paused' and stripe_customer_id null) is 'free' - the portal would 404, so the paused state is not offered
- (false, row with status 'canceled' and customer id 'cus_123') is 'free'
- (false, row with status null and customer id 'cus_123') is 'free'

`trialEligible(sub)`:
- (undefined) is true
- (null) is true
- (row with stripe_subscription_id null) is true - a row can exist from an abandoned checkout with no subscription yet
- (row with stripe_subscription_id 'sub_123') is false
  </behavior>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npx vitest run lib/billing/__tests__/subscription-view.test.ts</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npm run typecheck</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "^import" lib/billing/subscription-view.ts || true  # expect 0 - the module must stay dependency-free</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "it(" lib/billing/__tests__/subscription-view.test.ts  # expect at least 13, one per behavior row</automated>
  </verify>
  <done>
`lib/billing/subscription-view.ts` exists, imports nothing, and exports `BillingViewState`, `BillingSubscriptionLike`, `billingViewState` and `trialEligible`, each with an explanatory comment in the voice of `lib/billing/tier.ts`. `lib/billing/__tests__/subscription-view.test.ts` asserts all thirteen `<behavior>` rows and passes. `npm run typecheck` passes. No other file has been modified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Render the paused state in BillingSection and de-duplicate the trial rule</name>
  <files>app/(app)/guild-settings/components/BillingSection.tsx, app/hooks/usePremiumCheckout.ts</files>
  <read_first>
Re-read `app/(app)/guild-settings/components/BillingSection.tsx` in full - it is 131 lines. Four things in it are load-bearing:
- the `SubscriptionRow` interface at lines 13-19 and the matching five-column select string at line 40. They must stay in sync; a column added to one and not the other is a silent `undefined`.
- the Active badge at lines 81-85: `text-11 font-semibold uppercase tracking-wide bg-success/15 text-success rounded-full px-2 py-0.5`. The new badge mirrors this exactly, swapping only the colour pair.
- `openPortal` at lines 46-66, already written, already handling `busy` and the error notification. Reuse it as-is; do not write a second portal fetch.
- the `guildIsPro ? ... : ...` ternary at lines 92-127. Its true-branch holds the renewal copy and the only "Manage billing" button; its false-branch holds the upsell paragraph, the "See what's in Premium" button and `UpgradeModal`. This ternary is what Task 2 replaces.

In `app/hooks/usePremiumCheckout.ts`, note only lines 23-40: the `trialAvailable` state and the `.then` callback that sets it.

The design tokens are confirmed present: `--warning` is defined in `app/globals.css` for both themes, and the `bg-warning/15 text-warning` pairing at `text-11 font-semibold` in a `rounded-full` pill is already the house pattern - see `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx:1087` and `app/(app)/guild-settings/components/MemberManager.tsx:669`. Do not reach for `StatusBadge` from `components/ui/status-badge.tsx`: its `status` union is domain-specific to submissions and attendance, and widening it for a billing state would push a billing concept into an unrelated component.
  </read_first>
  <action>
**Part A - `BillingSection.tsx`.**

Import `billingViewState` and `trialEligible` from `@/lib/billing/subscription-view` on one line.

Add `stripe_subscription_id` as a `string | null` field to the `SubscriptionRow` interface, and add the same column name to the select string at line 40. Both, or the field reads `undefined` at runtime while typechecking clean.

Change the `subscription` state to be initialized to `undefined` rather than `null`, widening its type to allow `undefined`. Add a short comment saying that `undefined` means the lookup has not resolved and `null` means it resolved with no row, and that the distinction is what keeps the wrong branch from rendering for a frame. In the `.then` callback, coerce a missing result to `null` so the state always leaves the not-resolved value once the query settles - a failed lookup should present as "no row", never as a permanently empty card.

Compute the view state once, after the early return, by calling `billingViewState` with `guildIsPro` and `subscription`.

In the header, keep the existing Active badge but key it off the view state being `'pro'` rather than off `guildIsPro` directly, so one expression drives both badges. Add a second badge, rendered when the view state is `'paused'`, whose label is the word Paused and whose classes are the Active badge's classes with `bg-success/15 text-success` replaced by `bg-warning/15 text-warning`. Everything else about the badge - sizing, weight, tracking, radius, padding - stays identical.

Replace the two-way ternary in the card body with three independent guarded blocks, one per view state. Do not nest ternaries. The `'loading'` state deliberately renders nothing in the body; the header still renders immediately.

- The `'pro'` block is the existing true-branch, moved verbatim. Its renewal copy, its `stripe_customer_id` guard and its "Manage billing" button are unchanged.
- The `'paused'` block is new. One paragraph with the same `text-13 text-muted-foreground` classes the other branches use, reading: `Your trial ended, so Premium is paused. Add a payment method to turn it back on. Your guild data is safe and nothing was lost.` Below it, one `Button` with `variant="primary"`, `onClick` bound to the existing `openPortal`, `disabled` on `busy`, and the label `Add payment method` - falling back to the same `Opening…` string the Manage billing button already uses while busy. This block renders no `UpgradeModal` and no checkout entry point of any kind; the portal is the only exit.
- The `'free'` block is the existing false-branch with its paragraph made conditional. Keep the first two sentences as they are today. Then append one of two sentences based on `trialEligible(subscription)`: when eligible, `It starts with a 14-day free trial, and no credit card is required.`; when not, `Your guild has already used its free trial, so Premium starts as soon as you subscribe.` The "See what's in Premium" button and `UpgradeModal` stay exactly where they are, in this block only.

Because the `'free'` block is unreachable until the lookup resolves, `trialEligible` is never evaluated against an unresolved row, and the trial promise can no longer appear and then vanish.

No em dashes anywhere - CLAUDE.md. All four strings above are a starting point pending the user's copy sign-off, recorded as human-check D in Task 3; write them as given and do not improvise alternatives.

**Part B - `usePremiumCheckout.ts`.** One line only. Import `trialEligible` from `@/lib/billing/subscription-view` and have the `.then` callback pass the returned row straight into it, instead of negating the row's subscription-id field inline. Leave the `useState(true)` optimistic default, the `cancelled` guard, the select and the effect dependencies exactly as they are - this hook's behaviour must not change, only where its rule is defined. Update the adjacent comment to point at the shared predicate.

Modify no other file. In particular do not touch `app/api/billing/portal/route.ts` (the paused button reuses it unchanged), `app/api/billing/checkout/route.ts`, `app/components/UpgradeModal.tsx`, or `app/components/landing/PremiumPricing.tsx`.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npm run typecheck</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npm run lint</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npx vitest run</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "stripe_subscription_id" "app/(app)/guild-settings/components/BillingSection.tsx"  # expect 2 - the interface field and the select string, in sync</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "viewState ===" "app/(app)/guild-settings/components/BillingSection.tsx"  # expect at least 3 - one guard per rendered state, no nested ternary</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "onClick={openPortal}" "app/(app)/guild-settings/components/BillingSection.tsx"  # expect 2 - Bug 1: the portal is now reachable from the paused branch as well as the Pro branch</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "UpgradeModal" "app/(app)/guild-settings/components/BillingSection.tsx"  # expect 2 - Bug 2: the import plus exactly one render site, still in the free block only</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "bg-warning/15 text-warning" "app/(app)/guild-settings/components/BillingSection.tsx"  # expect 1 - the PAUSED badge uses the house token pair, not a new literal colour</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "trialEligible" "app/(app)/guild-settings/components/BillingSection.tsx"  # expect 2 - imported and applied, never reimplemented</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "trialEligible(data)" app/hooks/usePremiumCheckout.ts  # expect 1</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -c "data?.stripe_subscription_id" app/hooks/usePremiumCheckout.ts || true  # expect 0 - PPS-05: the client-side rule now exists in one place only</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; grep -rn "—" "app/(app)/guild-settings/components/BillingSection.tsx" || true  # expect no output - CLAUDE.md forbids em dashes</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; git status --porcelain | tr '\n' '|'  # expect exactly these four and nothing else: BillingSection.tsx, usePremiumCheckout.ts, subscription-view.ts, subscription-view.test.ts</automated>
  </verify>
  <done>
`BillingSection` renders three mutually exclusive states driven by one `billingViewState` call, plus a no-op loading state. A paused guild gets the PAUSED badge, the three-beat paragraph and a single portal button, and no route into `UpgradeModal`. A free guild's trial sentence is gated on `trialEligible`. `usePremiumCheckout` consumes the shared predicate rather than restating the rule. `npm run typecheck`, `npm run lint` and `npx vitest run` all pass. `git status --porcelain` lists exactly the four files in this plan's `files_modified`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Run the full gate and record the paused-and-resume human-checks</name>
  <files>(no file is modified by this task - verification only)</files>
  <action>
Run the three automated gates below and confirm all pass; report the vitest pass count. Modify no file. If a gate fails, fix the cause under Task 1's or Task 2's constraints rather than relaxing the gate.

Then work the human-checks. They are the only way to observe the two facts the constraint named as unverifiable by automation: that a genuinely paused subscription renders this state, and that the portal resumes the existing subscription rather than creating a second one. Human-check B is the decisive one - read `<open_risk>` before running it, and record the literal subscription id and status you observe, not a summary.

The Stripe CLI is not on PATH in this environment, so the Dashboard path is primary and CLI commands are given only as an alternative. Run everything against a test-mode key.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npm run typecheck</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npm run lint</automated>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus &amp;&amp; npx vitest run</automated>
    <human-check>
**A. A genuinely paused subscription renders the paused state (PPS-01, PPS-03)**

Reuse the test-clock recipe from quick task 260921-ut5, which produced this state in the first place.

1. Point `.env.local` at an `sk_test_...` key and test-mode price ids. Run `npm run dev` (port 3100).
2. Stripe Dashboard, test mode, Developers, Test clocks: create a clock frozen at now. Create a customer on that clock and note its `cus_...`. (CLI alternative: `stripe test_helpers test_clocks create --frozen-time $(date +%s)` then `stripe customers create --test-clock clock_xxx`.)
3. In the test Supabase project, set the test guild's `guild_subscriptions` row to that `stripe_customer_id` with `stripe_subscription_id` null, so the checkout route still treats it as trial eligible and reuses the clock-bound customer.
4. As an officer with `manage_settings`, start the trial from Guild Settings and complete checkout without adding a card.
5. Advance the clock past day 14 and let `stripe listen --forward-to localhost:3100/api/webhooks/stripe` deliver the events, or re-send them from the Dashboard.
6. Confirm the database first: the Stripe subscription reads status `paused`, `guild_subscriptions.status` is `paused`, and `guilds.subscription_tier` is `free`. Record the `sub_...` id - **you need it again in B**.
7. Reload Guild Settings and confirm all of: a PAUSED badge sits beside the LootList+ Premium heading in the warning colour; the paragraph carries all three locked beats; there is exactly one button and it reads Add payment method; **the free-tier upsell paragraph and the See what's in Premium button are both absent**. Record PASS or FAIL with what you actually saw.
8. Confirm there is no flash: on a hard reload the free-tier copy must never appear before the paused card. If you see it for a frame, the `undefined`-versus-`null` distinction from Task 2 was collapsed.

**B. The portal resumes the same subscription rather than creating a second one (PPS-02, PPS-03) - decisive**

`<open_risk>` explains why this is genuinely uncertain: Stripe documents that a subscription paused this way "remains `paused` until explicitly resumed", and the portal's feature list does not mention resuming.

1. From the paused card, click Add payment method. Confirm the Stripe customer portal opens rather than an error notification. If it 404s, `billingViewState` returned `'paused'` without a `stripe_customer_id` and Task 1 regressed.
2. Add a test card (4242 4242 4242 4242) as the payment method and return to the app.
3. In the Stripe Dashboard, list ALL subscriptions for that `cus_...`. Record: how many exist, their ids, and their statuses. **Expected: exactly one, and it is the same `sub_...` you recorded in A.6.** Two subscriptions, or a different id, means the resume path minted a duplicate - the exact failure Bug 2 is about.
4. Record what the original `sub_...` status became. If it is `active`, Stripe fired `customer.subscription.resumed`, the webhook case from 9b8c4bce synced the tier, and `guilds.subscription_tier` should now read `pro` with the card showing the Active badge again. Confirm all three.
5. If the status is still `paused` after adding the card, that is a FAIL of the locked copy's promise, not of this plan's structure. Stop, record it, and raise the required follow-up from `<followups>` item 1 - a server-side resume. Do not patch it inside this task.
6. Clean up: delete the seeded row and the test clock.

**C. Free-tier trial copy matches actual eligibility (PPS-04)**

1. Guild with no `guild_subscriptions` row: expect the free-tier paragraph ending in the sentence that promises the 14-day trial with no credit card.
2. Guild whose row carries a non-null `stripe_subscription_id` with status `canceled`: expect the free-tier paragraph ending in the sentence saying the trial is already used. **This is the Bug 3 case** - before this change it promised a trial the checkout route would refuse at `route.ts:69`. Record both sentences verbatim as rendered.
3. Confirm the UpgradeModal's own trial line still behaves as it did: `usePremiumCheckout` changed where its rule lives, not what it returns.

**D. Copy sign-off (blocking, CLAUDE.md)**

Show the user the four strings exactly as rendered - the paused paragraph, the Add payment method label, and both free-tier variants. CLAUDE.md requires user sign-off on user-facing copy and states that plan copy is a starting point. Record the approved wording, or the user's replacement, in the summary. Confirm no em dashes survived.

**E. Follow-ups - report only, change nothing**

Record the three items in `<followups>` in the summary. Item 1's status depends entirely on B's outcome; say which.
    </human-check>
  </verify>
  <done>
`npm run typecheck`, `npm run lint` and `npx vitest run` all pass with the vitest pass count recorded. Human-checks A, B and C are each recorded PASS or FAIL with concrete observations - specifically the `sub_...` id and status before and after the portal visit in B, the subscription count for that customer, and both free-tier sentences verbatim in C. Copy sign-off from D is recorded. The follow-ups from E are recorded, with item 1 marked required or not-required according to B.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| officer's browser to `POST /api/billing/portal` | `guild_id` arrives untrusted. `getAuthenticatedUser` then `verifyPermission(..., 'manage_settings')` gate it before any Stripe call. **Unchanged by this plan** - the plan only adds a second UI entry point to an already-hardened route. |
| browser to Supabase `guild_subscriptions` SELECT (anon key, RLS) | The component's own select widens by one column, `stripe_subscription_id`. RLS is the control and is not modified. The same column is already read from the browser by `usePremiumCheckout`. |
| `guilds.subscription_tier` to feature gating | `isPro()` remains the only entitlement gate. Nothing in this plan grants, extends or infers a feature; the view state is presentation only. |
| Stripe to `POST /api/webhooks/stripe` | Signature-verified, untouched. It is the path that carries `paused` and `resumed` into the tier, and this plan depends on it without altering it. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-vns-01 | Information Disclosure | the widened `guild_subscriptions` select in `BillingSection` | low | mitigate | The added column is an internal Stripe identifier. It is never rendered and never logged - only the boolean derived by `trialEligible` reaches the DOM. The row is fetched only when `hasPermission('manage_settings')` is already true (the effect's existing guard at line 37), and `guild_subscriptions` RLS is officer-scoped, which is what already makes the identical read in `usePremiumCheckout` safe. No new reader gains access to any row. |
| T-vns-02 | Elevation of Privilege | the new Add payment method button | low | mitigate | It is a second client entry to an already-hardened route, not a new capability. `POST /api/billing/portal` independently re-runs `getAuthenticatedUser` and `verifyPermission(..., 'manage_settings')` and 404s when the guild has no `stripe_customer_id`, so the button can grant nothing the existing Manage billing button could not. `billingViewState` additionally refuses to return `'paused'` without a customer id, so the button is never rendered into a guaranteed failure. Verified by the `(false, paused, null customer id)` case in Task 1. |
| T-vns-03 | Tampering | client-derived view state | low | accept | `billingViewState` is presentation only. A user who tampers with client state can render the paused card or the Pro card at will, and gains nothing: Premium entitlement continues to come from `guilds.subscription_tier`, written only by the signature-verified webhook, and the portal route re-derives the customer from the server-side row rather than from anything the client sends. No server decision trusts the branch chosen. |
| T-vns-04 | Repudiation | the resume path is untracked | low | accept | Checkout emits `pro_upgrade_clicked` via `trackClientEvent`; portal opens emit nothing, so a resume attempt leaves no PostHog trail and recovery cannot be measured against the activation metric. This is a pre-existing gap that this plan inherits rather than creates - adding an event is outside the locked design. Recorded as follow-up 3. |
| T-vns-05 | Denial of Service | a `guild_subscriptions` lookup that never settles | low | mitigate | With the state initialized to `undefined`, a lookup that never resolves would leave the card body permanently empty - a self-inflicted dead end on a billing surface. Task 2 mitigates it by coercing a missing result to `null` in the `.then` callback, so the body always leaves the loading state and falls through to the free block at worst. |
| T-vns-SC | Tampering | npm / pip / cargo installs | n/a | accept | This plan installs no packages and adds no third-party imports. The only new import is a first-party module created in Task 1. The package-legitimacy gate has no new surface to audit, and no RESEARCH.md audit table is required. |

No threat is rated high or critical, so `workflow.security_block_on: high` is satisfied at ASVS level 1.
</threat_model>

<followups>
Record these in the summary. Do not implement any of them in this plan.

1. **Server-side resume, if human-check B shows the portal does not resume.** Stripe documents that a subscription paused by `missing_payment_method: 'pause'` "remains `paused` until explicitly resumed". If adding a card in the portal leaves the status at `paused`, the locked copy's promise is unmet and the fix is a server-side `stripe.subscriptions.resume()` - most likely on the portal return, or triggered by `payment_method.attached`. This is **required** if B fails and **not needed** if B passes. Do not pre-build it: calling resume on a subscription Stripe already resumed is an error.

2. **Converge the server trial rule onto the shared predicate.** `app/api/billing/checkout/route.ts:69` still computes eligibility inline. It is out of scope here by constraint, and the server must keep enforcing independently regardless - but it could enforce by calling the same predicate, which would take the rule from two definitions to one. Small, safe, separate.

3. **`PremiumPricing.tsx` line 104 and analytics on the resume path.** The constraint puts `app/components/landing/PremiumPricing.tsx` out of scope, and its "Every new guild starts with a 14-day free trial" is addressed to new guilds, so it is defensible as written. It still misleads a signed-in officer of a lapsed guild who lands on `/premium`, which is now the second surface where trial copy and trial eligibility can disagree - worth revisiting with the same conditional treatment. Separately, portal opens emit no analytics event (T-vns-04), so resumes cannot be measured against the activation metric.
</followups>

<verification>
Automated, in order:
1. `npx vitest run lib/billing/__tests__/subscription-view.test.ts` - the primary gate. Thirteen table-driven cases pin every branch of both predicates, including the two most likely to regress: paused-without-a-customer-id must not enter the paused state, and Pro tier must win over a stale paused row.
2. `npm run typecheck` - proves the widened `SubscriptionRow`, the `undefined`-widened state type, and both call sites' structural conformance to `BillingSubscriptionLike`.
3. `npm run lint`.
4. `npx vitest run` - full-suite regression sweep, including `lib/billing/__tests__/tier.test.ts` and the 22 existing component tests.
5. Structural greps in Task 2 pinning each bug fix: two `onClick={openPortal}` sites (Bug 1), exactly one `UpgradeModal` render site still in the free block (Bug 2), `trialEligible` imported rather than reimplemented (Bug 3 and PPS-05), the eligibility negation gone from `usePremiumCheckout`, the badge using the house token pair, the interface and select string in sync, and no em dashes.
6. `git status --porcelain` lists exactly the four files in `files_modified`.

Human, in Task 3's `<verify><human-check>` (`workflow.human_verify_mode` is `end-of-phase`, so these are checks rather than a blocking checkpoint task): a real test-clock-paused subscription renders the paused state with no upsell and no copy flash; the portal acts on the same `sub_...` and produces exactly one subscription for the customer; the free-tier trial sentence matches real eligibility on both a never-subscribed and a lapsed guild; and the user signs off the copy.
</verification>

<success_criteria>
- A `free`-tier guild with a `paused` subscription and a `stripe_customer_id` renders the PAUSED badge, the three locked beats, and exactly one button that opens the existing billing portal (PPS-01, PPS-02).
- That state exposes no `UpgradeModal` and no checkout entry point, so recovery cannot mint a duplicate subscription against `guild_subscriptions`' upsert-on-`guild_id` (PPS-03).
- The free-tier trial sentence appears only when `trialEligible` is true, and only after the subscription lookup resolves (PPS-04).
- `billingViewState` returns `'paused'` only with a `stripe_customer_id` present, and returns `'pro'` whenever the guild's tier is pro regardless of row contents (PPS-01, PPS-02).
- The client-side trial rule is defined once in `lib/billing/subscription-view.ts` and imported by both `BillingSection` and `usePremiumCheckout` (PPS-05).
- Exactly four files changed. The checkout route, the webhook, `lib/billing/tier.ts`, `lib/billing/sync.ts`, `app/api/billing/portal/route.ts`, `PremiumPricing.tsx` and the schema are untouched (PPS-06).
- `npm run typecheck`, `npm run lint` and `npx vitest run` all pass.
- Human-checks A, B, C recorded with concrete observations; copy sign-off recorded; follow-up 1 marked required or not-required per B's outcome.
</success_criteria>

<output>
Create `.planning/quick/260921-vns-add-a-paused-premium-state-to-billingsec/260921-vns-SUMMARY.md` when done.

The summary must record: the vitest pass count; human-check A's PASS/FAIL with what rendered; human-check B's subscription count, the `sub_...` id before and after, and the literal status after the card was added; human-check C's two rendered sentences verbatim; the user's copy sign-off; and the three follow-ups, with follow-up 1 explicitly marked required or not-required based on B.
</output>
</content>
</invoke>
