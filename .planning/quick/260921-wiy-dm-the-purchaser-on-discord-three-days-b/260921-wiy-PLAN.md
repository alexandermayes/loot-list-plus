---
phase: quick-260921-wiy
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/discord.ts
  - lib/billing/purchaser.ts
  - lib/billing/discord-premium.ts
  - lib/billing/trial-ending.ts
  - lib/billing/__tests__/trial-ending.test.ts
  - app/api/webhooks/stripe/route.ts
autonomous: true
requirements:
  - TWE-01
  - TWE-02
  - TWE-03
  - TWE-04
  - TWE-05
  - TWE-06
  - TWE-07
  - TWE-08
  - TWE-09
  - TWE-10

user_setup:
  - service: stripe
    why: "Stripe delivers only the events an endpoint is explicitly subscribed to. `customer.subscription.trial_will_end` is not on the live endpoint, so without this step every line of code in this plan is dead in production and an officer still loses Premium with no warning. This same trap has already cost this project twice today, which is why the operator action is Task 3's first item rather than its last."
    dashboard_config:
      - task: "Open the live webhook endpoint's Select events list and READ the current selection before changing anything. Ensure BOTH `customer.subscription.trial_will_end` (this plan) and `payment_method.attached` (quick task 260921-w4u, possibly still unapplied) are present, adding whichever is missing. These five must remain selected and must not be replaced: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, customer.subscription.paused, customer.subscription.resumed. This is an addition, never a replacement. Record the resulting full list verbatim in the summary."
        location: "Stripe Dashboard -> Developers -> Webhooks -> we_1U8UUlFV7dhwtnIjYXou6I5i -> Update details -> Select events"

estimate:
  # `estimate-calibration` reports factor 1.0, applied false, 0 samples for the
  # default workstream, so `tokens` equals `raw_tokens` rather than being scaled.
  # Recorded for context and deliberately NOT applied: every empirical datapoint
  # in this repo runs far under 1.0. The design-system workstream's 6 samples
  # mean actual/estimate 0.175; quick task 260921-vns came in at 3092 against a
  # raw 40000 (0.077); quick task 260921-w4u estimated 32000 on a comparable
  # shape. Expect this to land nearer 5000 than 45000. Confidence stays low
  # because the handler has zero samples for this workstream, not because the
  # projection is a guess.
  tokens: 45000
  raw_tokens: 45000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "An officer whose Premium trial is three days from ending, with no payment method on file, receives a Discord DM that names their guild, gives the end date, links where to add a card, and says their guild data is safe."
    - "An officer who already has a payment method on file receives nothing. The DM is a warning about an outcome that will not happen to them, and sending it would be a false alarm."
    - "A trialing subscription that is not ours (no `metadata.guild_id`) produces no DM and no error."
    - "An officer with no linked `discord_id`, or whose DMs are closed to the bot, degrades to one informational log line. No `console.error`, no thrown exception, no user-visible failure."
    - "The webhook answers HTTP 200 for `customer.subscription.trial_will_end` in every one of those cases, including when Stripe or Discord fails, so Stripe never retries the event and never disables the endpoint."
  artifacts:
    - lib/billing/trial-ending.ts
    - lib/billing/__tests__/trial-ending.test.ts
    - lib/billing/purchaser.ts
    - "`sendDirectMessage` exported from lib/discord.ts"
    - "`case 'customer.subscription.trial_will_end'` in app/api/webhooks/stripe/route.ts"
  key_links:
    - "Stripe Dashboard endpoint we_1U8UUlFV7dhwtnIjYXou6I5i subscribed to `customer.subscription.trial_will_end`. This is the single link on which the entire plan's production value depends, and it is the one no automated check in this repo can reach."
    - "`subscription.metadata.user_id` -> `guilds.created_by` fallback -> `user_preferences.discord_id`. The purchaser identity chain; if it resolves wrong, a stranger gets told about a guild's billing."
    - "`subscriptions.default_payment_method`/`default_source` -> `customer.invoice_settings.default_payment_method`/`default_source`. The false-alarm suppression chain; if only the subscription leg is checked, every officer who added a card through the billing portal gets warned anyway."
---

<objective>
Warn the purchaser on Discord three days before a Premium trial ends, so that losing Premium is a choice rather than a surprise.

Purpose: earlier today Checkout began sending `payment_method_collection: 'if_required'` together with `trial_settings.end_behavior.missing_payment_method: 'pause'` (app/api/billing/checkout/route.ts:83, :103). Those two lines inverted the trial's default from opt-out to opt-in. Before them, a trial collected a card up front and an officer who did nothing converted to paid. After them, an officer who does nothing LOSES Premium on day 15. That is the right default for a product that does not want to charge people who forgot, but it is only the right default if the officer knows it is the default. Right now nothing tells them. Stripe fires `customer.subscription.trial_will_end` exactly three days before the trial ends, and the app neither subscribes to that event nor handles it, so the first an officer learns is that Premium stopped working mid raid week.

Output: a `customer.subscription.trial_will_end` case in the Stripe webhook; a tested pure module holding the decision of whether a given subscription warrants a warning and the copy of the warning itself; a reusable `sendDirectMessage` in lib/discord.ts; a shared purchaser-resolution module that lib/billing/discord-premium.ts also adopts; and an operator action that makes any of it run in production.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/workstreams/default/STATE.md
@.claude/CLAUDE.md
@app/api/webhooks/stripe/route.ts
@lib/billing/discord-premium.ts
@lib/billing/resume-paused.ts
@lib/discord.ts
@lib/discord-loot-announcements.ts
@app/api/cron/resubmit-reminders/route.ts
</context>

<verified_facts>
Confirmed this session against the installed `stripe@22.5.0`, the live Stripe documentation, and the repository. Do not re-derive any of it; it cost real tool calls.

**Stripe SDK**

- `'customer.subscription.trial_will_end'` is a member of `Stripe.Event.Type` (node_modules/stripe/cjs/resources/Events.d.ts:78) and its dedicated event interface declares `type: 'customer.subscription.trial_will_end'` at Events.d.ts:1076. Inside the case, `event.data.object` is a `Stripe.Subscription`.
- `Subscription.trial_end` is `number | null` (Subscriptions.d.ts:274). The null branch is reachable per the SDK's own typing and must not be interpolated blindly into a message.
- `Subscription.default_payment_method` is `string | PaymentMethod | null` (Subscriptions.d.ts:170) and `Subscription.default_source` is `string | CustomerSource | null` (Subscriptions.d.ts:176). Same three-shape union `paymentMethodCustomerId` already handles in resume-paused.ts.
- `Subscription.customer` is `string | Customer | DeletedCustomer` (Subscriptions.d.ts:158). The deleted arm is real and carries no `invoice_settings`.
- `Customer.invoice_settings.default_payment_method` is `string | PaymentMethod | null` (Customers.d.ts:295) and `Customer.default_source` is `string | CustomerSource | null` (Customers.d.ts:182).
- The SDK's own docstring on `Subscription.default_payment_method` states the resolution order verbatim: "This takes precedence over `default_source`. If neither are set, invoices will use the customer's `invoice_settings.default_payment_method` or `default_source`." That sentence is the specification for the four-leg check in Task 1 and the reason a subscription-only check is wrong.

**Stripe behaviour**

- `customer.subscription.trial_will_end` is "Sent 3 days before the trial period ends. If the trial is less than 3 days, it triggers this event immediately." Our trials are 14 days (checkout route: `trial_period_days: 14`), so it is always exactly three days.
- The documentation describes the pause condition only as "after a free trial ends without a payment method and if the subscription's `missing_payment_method` end behavior is set to `pause`". It does not enumerate which fields count. The four-leg invoice resolution chain above is the closest authoritative statement, which is why Task 1 implements that chain and fails toward warning when it cannot confirm.
- Nothing in the documentation suppresses `trial_will_end` when a payment method is already on file. The event fires for every trialing subscription. The filter has to be ours.

**Repository**

- `lib/discord.ts` currently exports only `discordFetch`. There is no DM helper.
- The two-call DM dance (`POST /users/@me/channels` with `{ recipient_id }`, then `POST /channels/{id}/messages`) is written out by hand in FOUR separate places today, each with different error handling: app/api/discord/notify-officers/route.ts:224, app/api/discord/send-notification/route.ts:182, app/api/cron/resubmit-reminders/route.ts:134, and nowhere in `lib/`. This duplication is evidence, and it settles the helper-placement decision below.
- `lib/billing/discord-premium.ts:33-51` resolves the purchaser: prefer `subscription.metadata.user_id`, fall back to `guilds.created_by`, then read `discord_id` from `user_preferences`. It is covered by lib/billing/__tests__/discord-premium.test.ts, which exercises all three branches.
- `user_preferences` has exactly four notification columns: `notify_loot_deadline`, `notify_new_raids`, `notify_resubmit_reminder`, `notify_submission_status` (lib/database.types.ts:2135-2138). All four are raider-facing loot-workflow toggles. None governs billing.
- The guild display name is NOT on the subscription. Checkout writes `guild_name` into the *session* metadata but `subscription_data.metadata` is only `{ guild_id, user_id }` (checkout route:91-92). The name must be read from `guilds.name`.
- The canonical origin is `https://www.getlootlist.com` (app/layout.tsx:60 `metadataBase`, app/robots.ts:68). The `https://lootlistplus.com` fallback in app/api/cron/resubmit-reminders/route.ts:116 is stale and must not be copied. See `<followups>`.
- Embed colour precedent: `0xff8000` is the accent orange used for announcements and updates; `0xeab308` is the yellow used by the one existing reminder DM (resubmit-reminders:130).
- The webhook currently handles six event types and the route doc comment lists them at route.ts:14-20.
- This plan installs ZERO new packages, so the package-legitimacy gate is satisfied trivially and no `[ASSUMED]`/`[SUS]` checkpoint is required.
</verified_facts>

<helper_placement_decision>
The constraint asked whether the DM helper belongs in `lib/discord.ts` as a general `sendDirectMessage`, or in a billing-specific module, and specifically flagged that a general helper puts a Discord concern into a file that is currently a pure fetch wrapper. **Decision: `sendDirectMessage` goes in `lib/discord.ts`.**

1. **The generality is already proven by four existing copies, not assumed.** The exact two-call sequence is hand-written at notify-officers:224, send-notification:182, and resubmit-reminders:134. A helper that three unrelated features already need is general by demonstration. Putting it in `lib/billing/` would make this the fourth hand-written copy in a place no non-billing caller would ever think to look, and would guarantee a fifth.
2. **The four copies do not agree with each other, which is the actual cost of the duplication.** resubmit-reminders `continue`s silently on a failed channel open; notify-officers logs `console.error` and increments a failure counter; each makes its own decision about what a non-ok response means. There is no single place where the question "what does it mean when a DM fails" is answered, which is precisely the question this plan has to get right.
3. **The purity objection does not survive reading the file.** `lib/discord.ts` is not a generic transport. `discordFetch` already knows Discord's `Retry-After` semantics, Discord's 429 status convention, and Discord's rate-limit behaviour (lib/discord.ts:31-37). It is a Discord-domain module with one export, not a fetch wrapper that happens to be used for Discord. Adding a second Discord-domain export changes the file's size, not its nature.
4. **It creates no new import edge.** Every one of the four existing call sites already imports `discordFetch` from `@/lib/discord`. The helper lands in a module they all already depend on.

Scope discipline: this plan does NOT refactor the four existing call sites onto the new helper. Each carries its own success bookkeeping (resubmit-reminders stamps database rows only on success; notify-officers maintains sent/failed counters), so converting them is a behaviour-bearing change that deserves its own task and its own verification rather than a ride-along. Recorded in `<followups>`.
</helper_placement_decision>

<test_strategy_decision>
The constraint asked what is genuinely worth unit testing given that most of this is I/O, invited the answer "nothing, the logic is too thin", and forbade tests that only assert a mock was called. **Decision: there IS a pure core worth extracting and testing, and it is larger than it first appears. The orchestrator and the transport get no unit test at all.**

**What gets tested, and why each is not a tautology:**

1. **`hasPaymentMethodOnFile` (the four-leg chain).** This is the single most consequential piece of logic in the plan and it is pure. Get it wrong in the obvious way (check `subscription.default_payment_method` only) and every officer who adds a card through the billing portal gets warned that Premium is about to pause, which is a false alarm about money. The portal sets the card as the CUSTOMER's default, not the subscription's, so the naive check fails for exactly the population that did the right thing. Four legs, each independently reachable, each with a string form and an expanded-object form. That is real branching over real data.
2. **`trialWarningDecision`.** Three suppression reasons and one warn, each with a distinct product meaning. The `status === 'trialing'` gate in particular is doing work beyond type narrowing: a Stripe redelivery that arrives after the trial has already ended carries `paused` or `active`, and the gate turns that stale delivery into a no-op. That property is load-bearing for the dedupe decision below, so it is worth pinning.
3. **`discordTimestamp`.** `trial_end` is typed `number | null`. Interpolating the null branch produces the literal text `<t:null:D>` in a DM to a paying customer. The function has genuine reject cases (null, undefined, non-finite, non-positive) and one accept case, and the failure it prevents is user-visible.
4. **`sanitizeGuildName`.** `guilds.name` is user-controlled text interpolated into a Discord embed description, and embed descriptions render markdown links. See T-wiy-04. The sanitiser is pure, the threat is real, and the test is an assertion about adversarial input rather than about our own call graph.
5. **`buildTrialEndingMessage`.** Two assertions here are worth more than the string equality that a change-detector test would make. First, the description must contain no U+2014 or U+2013 character, which mechanically enforces the project copy rule in CLAUDE.md against every future copy edit. Second, neither `null` nor `undefined` may appear as literal text in the rendered description under any combination of missing guild name and missing trial end, which is the composed version of failure 3.

**What gets no test, stated plainly rather than omitted:**

`notifyTrialEnding` (Supabase reads, a Stripe customer retrieve, a Discord DM) and `sendDirectMessage` (two HTTP calls) get no unit test. Every assertion available to them is the tautology the constraint warned about: having mocked the DM sender to return `{ ok: true }`, asserting that we called it establishes only that a mock returns what we told it to. The properties that DO matter about those two functions ("never throws", "a 403 is quiet") are cheap to state in code and expensive to fake honestly, and the real versions are covered by Task 3's human-checks against live Stripe and live Discord. This is not test avoidance: the extraction is exactly what makes the difference, because everything decidable was moved out of the untestable functions and into the tested ones. What remains in `notifyTrialEnding` is sequencing, and sequencing is what the human-checks observe.

**Precedent.** This split (pure exports plus a no-throw orchestrator taking an injected port, all in one file next to one test file) is the shape lib/billing/resume-paused.ts established today and lib/billing/sync.ts and lib/billing/discord-premium.ts established before it.
</test_strategy_decision>

<duplicate_dm_decision>
The constraint asked whether to guard against duplicate DMs given that Stripe can redeliver and there is no store of sent notifications, and asked for the tradeoff to be explicit rather than silently picked. **Decision: accept at-least-once delivery. No dedupe store, no dedupe flag.**

**Why the risk is smaller than it looks.** The `status === 'trialing'` gate in `trialWarningDecision` already suppresses the most likely redelivery, and so does the payment-method gate. Work the two realistic cases:

- A redelivery that arrives AFTER the officer added a card: `hasPaymentMethodOnFile` now returns true, decision is `payment_method_on_file`, nothing is sent. Suppressed by correctness logic, not by luck.
- A redelivery that arrives AFTER the trial ended: the subscription is `paused` or `active`, decision is `not_trialing`, nothing is sent. Also suppressed.

What remains is the narrow window where Stripe redelivers within the same three days while the officer has still done nothing. In that window the officer receives a second copy of a warning they have not yet acted on, which is the definition of a reminder.

**Why the asymmetry points this way.** A duplicate warning costs a mildly redundant notification nudging the officer toward the action we want. A missed warning costs Premium, silently, mid raid week, to a paying customer who did nothing wrong. Those are not comparable, and at-least-once is the side to err on.

**Why the available dedupe mechanisms are worse than the problem.** The schema is off limits by constraint, so the only store within reach is Stripe subscription metadata (writing something like `trial_warning_sent_at` back onto the subscription). That would mean: a write to Stripe on every delivery, a new failure mode where the write fails and the DM duplicates anyway, racy read-modify-write against a document Stripe and our own checkout both mutate, and durable notification state living somewhere with no migration story and no query surface. It would add three failure modes to remove one annoyance.

**What would change this.** If a billing-notification history table ever exists, this becomes a one-line insert-if-absent and should be revisited. Recorded in `<followups>`.

**Adjacent decision, same reasoning: no opt-out check.** `user_preferences` carries exactly four notification toggles and all four are raider loot-workflow settings (see `<verified_facts>`). None governs billing, so consulting any of them would be applying an unrelated opt-out to a message it was never meant to cover. A trial-ending notice to the person who personally started the paid trial is transactional. If a billing opt-out is ever wanted it needs its own column, which this plan may not add.
</duplicate_dm_decision>

<draft_copy>
## REQUIRES USER SIGN-OFF BEFORE SHIPPING

Per CLAUDE.md this is a starting point, not gospel. Task 3's human-check reads the rendered DM back so the user can approve or revise it. No em dashes anywhere below; the test in Task 1 enforces that mechanically.

**Embed title**

```
Your Premium trial is ending
```

**Embed description, full case (guild name known, `trial_end` present)**

```
Your Premium trial for **{guild}** ends {trialEndTimestamp}.

There is no payment method on file, so Premium will pause when the trial ends. Nothing is charged before then, and nothing is charged if you do nothing.

Add a payment method to keep Premium: {appUrl}/guild-settings

Your guild data is safe either way. Loot lists, attendance and loot history all stay exactly as they are. If Premium pauses you drop to the free plan, and adding a card later switches Premium straight back on.
```

**Degraded first lines**

| Condition | First line becomes |
|-----------|--------------------|
| guild name missing | `Your LootList+ Premium trial ends {trialEndTimestamp}.` (the "for X" clause is dropped entirely rather than filled with a placeholder) |
| `trial_end` null | `... ends soon.` |
| both missing | `Your LootList+ Premium trial ends soon.` |

**Embed colour:** `0xeab308`, the yellow the one existing reminder DM already uses (resubmit-reminders:130). Not the `0xff8000` accent orange, which this codebase reserves for announcements and updates.

**Notes on specific wording choices, for the reviewer:**

- "There is no payment method on file" is stated as fact, not as a condition, because `trialWarningDecision` has already established it. A hedged "if there is no payment method" would be a weaker sentence bought with nothing.
- "Nothing is charged if you do nothing" is the sentence that makes the new opt-in default trustworthy instead of alarming. It is the single most important line in the message and is the one most likely to be cut for brevity. It should not be.
- `{trialEndTimestamp}` is Discord timestamp markdown, `<t:{unix}:D>`. See `<timestamp_rationale>`.
- The closing paragraph exists because "your Premium is pausing" reads, to a guild officer, as "am I about to lose my loot lists". Answering that unasked question is the difference between a warning and a scare.
</draft_copy>

<timestamp_rationale>
The date renders as Discord timestamp markdown, `<t:{unixSeconds}:D>`, rather than as a server-formatted date string.

Discord resolves that token in each viewer's own client, in that viewer's own timezone and locale. Formatting the date ourselves would mean choosing a timezone for an officer whose timezone we do not store, and getting it wrong by a day for anyone near a boundary, in a message whose entire payload is a deadline. The markdown form deletes that bug class rather than mitigating it.

One placement constraint, which the implementation must respect: Discord renders timestamp markdown in message content and in embed descriptions and field values, but NOT in embed titles, author names, or footers. The date therefore belongs in the description and the title must stay date-free, which is why the drafted title above is `Your Premium trial is ending` rather than naming a date.
</timestamp_rationale>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extract the warning decision and the message copy into a tested pure module</name>
  <files>lib/billing/trial-ending.ts, lib/billing/__tests__/trial-ending.test.ts</files>
  <behavior>
Write these tests first and watch them fail before implementing. Every row is a property about data, not about our call graph.

`hasPaymentMethodOnFile(sub, customer)` (TWE-07):

| sub.default_payment_method | sub.default_source | customer | result |
|---|---|---|---|
| `'pm_1'` | null | null | true |
| `{ id: 'pm_1' }` | null | null | true |
| null | `'card_1'` | null | true (legacy leg) |
| null | `{ id: 'card_1' }` | null | true |
| null | null | `{ invoice_settings: { default_payment_method: 'pm_2' } }` | true (this is the portal case) |
| null | null | `{ invoice_settings: { default_payment_method: { id: 'pm_2' } } }` | true |
| null | null | `{ default_source: 'card_2' }` | true |
| null | null | `{ invoice_settings: { default_payment_method: null } }` | false |
| null | null | `null` | false (customer retrieve failed or customer deleted; see the fail-toward-warning note) |
| `''` | `''` | `{ invoice_settings: { default_payment_method: '' } }` | false (empty string is absence, not presence) |
| absent keys entirely | absent | `{}` | false |

`trialWarningDecision(sub, customer)` returns `{ warn, reason }`:

| subscription | reason | warn |
|---|---|---|
| no `metadata` key | `not_ours` | false |
| `metadata: { other: 'x' }` | `not_ours` | false |
| `metadata: { guild_id: '' }` | `not_ours` | false |
| ours, `status: 'active'` | `not_trialing` | false |
| ours, `status: 'paused'` | `not_trialing` | false |
| ours, `status` absent | `not_trialing` | false |
| ours, `status: 'trialing'`, `default_payment_method: 'pm_1'` | `payment_method_on_file` | false |
| ours, `status: 'trialing'`, customer has an invoice-settings default | `payment_method_on_file` | false |
| ours, `status: 'trialing'`, nothing anywhere | `warn` | true |
| ours, `status: 'trialing'`, nothing on the sub, `customer` is null | `warn` | true |

Also assert ordering: a subscription that is BOTH not ours and not trialing reports `not_ours`, because ownership is checked before anything else and is the only check that costs no I/O.

`discordTimestamp(unixSeconds)`:

| input | output |
|---|---|
| `1790000000` | `'<t:1790000000:D>'` |
| `1790000000.9` | `'<t:1790000000:D>'` (floored) |
| `null` | `null` |
| `undefined` | `null` |
| `NaN` | `null` |
| `0` | `null` |
| `-1` | `null` |

`sanitizeGuildName(name)` (T-wiy-04):

| input | output |
|---|---|
| `'Midnight Council'` | `'Midnight Council'` |
| a name containing square brackets and parentheses forming a markdown link | the bracket and parenthesis characters removed, so no live link can render |
| a name containing `@everyone` | the at sign removed |
| a name containing asterisks, underscores, tildes, backticks or pipes | those characters removed |
| a 200-character name | truncated to at most 64 characters |
| `'   '` | `null` (nothing left after sanitising, so the caller drops the clause) |
| `null` | `null` |

`buildTrialEndingMessage({ guildName, trialEnd, billingUrl })` returns `{ title, description, color }`:

| case | assertions |
|---|---|
| guild name and trial end both present | description contains the guild name, contains `<t:`, contains `billingUrl` |
| guild name null | description contains neither the string `null` nor `undefined`, and does not contain the phrase fragment "for **" |
| trial end null | description contains no `<t:`, contains neither `null` nor `undefined` |
| both null | description contains neither `null` nor `undefined` |
| any case | `description` matches no `/[—–]/` (the project copy rule in CLAUDE.md, enforced mechanically) |
| any case | `description.length` is at most 4096 (Discord's embed description limit, the same limit `clampDescription` respects in discord-loot-announcements.ts) |
| any case | `color` is `0xeab308` |
  </behavior>
  <action>
Create `lib/billing/trial-ending.ts` containing ONLY the pure exports in this task. The orchestrator is added to the same file in Task 3; do not write it yet.

Open the file with a header comment in the house style of lib/billing/resume-paused.ts, explaining that this module holds the decision of which trialing subscriptions warrant a warning DM and the copy of that warning, extracted out of the webhook so both are unit-testable without the `stripe` module, and cross-referencing the test file.

Declare the structural input types, optional and nullable throughout so a real `Stripe.Subscription` and a real `Stripe.Customer` satisfy them with no cast, the way `PausedSubscriptionLike` does in resume-paused.ts. `TrialEndingSubscriptionLike` needs `id`, `status`, `metadata`, `default_payment_method`, `default_source` and `trial_end`. `CustomerPaymentDefaults` needs `invoice_settings.default_payment_method` and `default_source`. Both payment-method fields accept the bare-id-string form and the expanded-object form, matching the SDK unions recorded in `<verified_facts>`.

Write a small internal helper that reduces `string | { id: string } | null | undefined` to a present-or-absent boolean, treating the empty string as absent. Four call sites use it, so factor it once.

`hasPaymentMethodOnFile(sub, customer)` walks the four legs in the order the SDK docstring specifies: subscription default payment method, subscription default source, customer invoice-settings default payment method, customer default source. Comment WHY the customer legs exist rather than what they do: the Stripe billing portal sets a newly added card as the customer's default, not the subscription's, so an implementation that checked only the subscription would warn precisely the officers who had already solved the problem. Also comment that a null `customer` means the retrieve failed or the customer is deleted, and that returning false there is deliberate: the ambiguity resolves toward sending a warning that might be unnecessary rather than withholding one that is needed, because a redundant nudge costs a notification and a missed nudge costs a paying customer their Premium.

`trialWarningDecision(sub, customer)` returns `{ warn, reason }` with reason drawn from a small exported union. Check ownership first via a non-empty `metadata.guild_id`, which is the same is-this-ours test used at route.ts:112 and in `resumableSubscriptionIds`, and is checked first because it is the only gate that costs nothing. Then require `status === 'trialing'`. Comment that this gate is not redundant type-narrowing: a Stripe redelivery arriving after the trial has already ended carries `paused` or `active`, so the gate turns a stale redelivery into a no-op, and that property is what makes accepting at-least-once delivery safe. Then apply `hasPaymentMethodOnFile`. Return a structured outcome rather than a bare boolean for the same reason `ResumeOutcome` is structured: the log line needs to distinguish "not ours" from "already has a card", and the tests need something more informative than a boolean to assert against.

`discordTimestamp(unixSeconds)` returns the Discord timestamp token or null. Reject anything not finite and anything not strictly positive; floor the rest. Comment the reject case concretely: `trial_end` is typed nullable by the SDK, and interpolating it unguarded renders the literal text of a null token inside a DM to a paying customer.

`sanitizeGuildName(name)` strips the characters Discord treats as markdown or mention syntax, collapses whitespace, truncates to 64 characters, and returns null when nothing usable remains. Comment the reason as the threat, not the mechanism: `guilds.name` is user-controlled text and Discord renders markdown links inside embed descriptions, so an unsanitised name can plant a live link in a billing warning. Cross-reference T-wiy-04.

`buildTrialEndingMessage({ guildName, trialEnd, billingUrl })` assembles the embed fields from `<draft_copy>` verbatim. Sanitise the guild name through `sanitizeGuildName` and, when the result is null, drop the possessive clause entirely rather than substituting a placeholder. Resolve the date through `discordTimestamp` and fall back to the word-form ending when it is null. Put the timestamp token in the description only; the title stays free of any date because Discord does not resolve the token in embed titles (see `<timestamp_rationale>`). Carry a comment above the copy block noting it is pending user sign-off per CLAUDE.md and pointing at this plan's `<draft_copy>` section as the source of record.

Then create `lib/billing/__tests__/trial-ending.test.ts` covering every row of the behavior table above, following the describe-per-export shape of resume-paused.test.ts. Write the copy-rule assertion as a regex over the Unicode escapes for the dash characters rather than pasting the characters themselves, so the test file does not itself violate the rule it enforces.
  </action>
  <verify>
    <automated>npx vitest run lib/billing/__tests__/trial-ending.test.ts</automated>
  </verify>
  <done>Every behavior-table row passes. `lib/billing/trial-ending.ts` imports nothing from `stripe`, nothing from `@supabase/supabase-js`, and nothing from `@/lib/discord`, so the whole decision surface is testable with plain object literals.</done>
</task>

<task type="auto">
  <name>Task 2: Add a reusable Discord DM sender and share the purchaser resolution</name>
  <files>lib/discord.ts, lib/billing/purchaser.ts, lib/billing/discord-premium.ts</files>
  <action>
Two pieces of shared machinery, neither of which changes any existing behaviour.

**1. `sendDirectMessage` in `lib/discord.ts`** (TWE-06, per `<helper_placement_decision>`).

Add a second export alongside `discordFetch`, taking the bot token, the recipient's Discord user id, and the message body to post. It performs the two-call sequence: `POST https://discord.com/api/v10/users/@me/channels` with `{ recipient_id }`, read the channel id off the JSON response, then `POST https://discord.com/api/v10/channels/{id}/messages` with the supplied body. Both calls go through `discordFetch` so the existing 429 and 5xx retry behaviour applies unchanged.

Return a structured outcome carrying whether it succeeded, which stage it reached (opening the channel, or sending the message), and the HTTP status when there was one. Callers need the stage because the two stages fail for different reasons and deserve different log severities.

Contract: this function never throws. Note that `discordFetch` DOES throw once its network retries are exhausted (lib/discord.ts:64), so a try/catch here is load-bearing rather than defensive, and a thrown network error must come back as a not-ok outcome with a null status.

Document the expected, non-exceptional failures in the function's own comment so the four existing hand-rolled copies have somewhere to converge on later: the recipient shares no server with the bot, the recipient has DMs from server members disabled, or the id is stale. Discord answers 403 with error code 50007 for the DM-refused family. These are states of the world, not faults, and the helper reports them without logging at error severity. Let the caller decide what to say about them.

Do NOT refactor notify-officers, send-notification or resubmit-reminders onto this helper in this plan. Each carries success-conditional bookkeeping and converting them is a behaviour-bearing change; it is recorded in `<followups>`.

**2. `lib/billing/purchaser.ts`** (TWE-02).

Extract the purchaser resolution that currently lives inline at lib/billing/discord-premium.ts:33-51 into a new module exporting one function, which takes the service-role Supabase client, the guild id and the recorded purchaser user id, and resolves to the purchaser's user id together with their linked `discord_id`, or null when either is unavailable. Preserve the existing logic exactly: prefer the passed purchaser id, fall back to `guilds.created_by` for subscriptions predating purchaser metadata, then read `discord_id` from `user_preferences`. Return the user id as well as the discord id, because `syncPremiumDiscordRole`'s multi-guild guard still needs it for its `created_by` lookup.

A new neutral module rather than a new export on discord-premium.ts: a trial-warning module importing from a module named for the Premium-role feature would be an import edge that describes nothing true about the dependency. Both consumers are billing plus Discord, so the shared piece belongs beside them rather than inside one of them.

Then rewrite discord-premium.ts to call it, deleting the inlined copy. Nothing else in that file changes: the env-var guard, the multi-guild guard, the 404-is-fine handling and the outer try/catch all stay exactly as they are.
  </action>
  <verify>
    <automated>npx vitest run lib/billing/__tests__/discord-premium.test.ts && npm run typecheck</automated>
  </verify>
  <done>`discord-premium.test.ts` passes with its assertions unedited. That the existing tests still pass against the refactor, without being adjusted to fit it, is the whole safety argument for touching a path already verified live in production. `sendDirectMessage` is exported from `@/lib/discord` and typechecks.</done>
</task>

<task type="auto">
  <name>Task 3: Wire the webhook case, run the full gate, and enable the event in Stripe</name>
  <files>lib/billing/trial-ending.ts, app/api/webhooks/stripe/route.ts</files>
  <precondition>The operator action and human-checks B, C and D require Stripe Dashboard access, a test-mode secret key in `.env.local`, the ability to edit webhook endpoint we_1U8UUlFV7dhwtnIjYXou6I5i, and a Discord account linked to a test purchaser. None of that is available to an autonomous executor. If it is unavailable, run the automated gate and human-check A, then record the operator action and B, C and D as NOT RUN with that reason. Do not report the plan complete without saying so.</precondition>
  <action>
**1. Append `notifyTrialEnding` to `lib/billing/trial-ending.ts`** (TWE-01, TWE-02, TWE-04, TWE-05).

Below the pure exports, add the orchestrator, following the injected-port shape of `resumePausedSubscriptions`. It takes the service-role Supabase client, a minimal Stripe port exposing only a customer retrieve, and the subscription off the event. Declare that port as its own exported interface rather than importing `Stripe`, matching `StripeResumePort`.

Sequence, with the cheap gates before the expensive ones:

1. Read the guild id from `metadata.guild_id`. Absent means not ours; return immediately, before any I/O.
2. Require `status === 'trialing'`; if not, return immediately, still before any I/O.
3. If `hasPaymentMethodOnFile(sub, null)` is already true from the subscription's own legs, skip the customer retrieve entirely. There is nothing the customer object could add once the subscription itself has a default.
4. Otherwise retrieve the customer. Resolve the customer id from `subscription.customer`, which per `<verified_facts>` may be a bare id string, an expanded object, or a deleted-customer object. Catch a failed retrieve, log it, and carry on with a null customer, which per Task 1 resolves toward warning.
5. Call `trialWarningDecision`. When it declines, log the reason at `console.log` and return; a decline is the system working, not a fault.
6. Resolve the purchaser's Discord id through the Task 2 module. Null means they never linked Discord. Log it at `console.log`, not `console.error`, and return. This is an expected state for a real officer, and treating it as an error trains whoever reads these logs to ignore them.
7. Read the guild display name from `guilds.name`. It is deliberately NOT read from subscription metadata: `subscription_data.metadata` carries only `guild_id` and `user_id`, so the name genuinely is not on the object (see `<verified_facts>`). A failed lookup yields a null name, which `buildTrialEndingMessage` already handles by dropping the clause.
8. Build the message and send it with `sendDirectMessage`, passing `allowed_mentions: { parse: [] }` alongside the embed so the payload cannot ping anyone regardless of what any interpolated text contains (T-wiy-04, belt to `sanitizeGuildName`'s braces). Resolve the destination link from `NEXT_PUBLIC_APP_URL`, falling back to the canonical `https://www.getlootlist.com`. Do NOT copy the fallback used in resubmit-reminders:116; it points at a stale domain, recorded in `<followups>`.
9. Treat a 403 from the send as quiet: log at `console.log` naming it as DMs being closed to the bot. Any other non-ok status is unexpected and logs at `console.error`.

Return a structured outcome shaped for one log line, carrying at least whether a DM was sent and the reason when it was not.

Contract, stated in the function's doc comment and honoured in the code: never throws. Every awaited call sits inside a catch, for the same reason spelled out at route.ts:87-94 and in resume-paused.ts.

**2. Add the case to the webhook** (TWE-01, TWE-04).

Add `case 'customer.subscription.trial_will_end'` to the switch. Give it its own case that builds a service-role client, calls `notifyTrialEnding`, logs the outcome in one line using the route's existing template-literal shape carrying the event type and the subscription id, and returns the acknowledgement directly.

It must NOT fall through into the shared `subscription` variable that the four subscription-lifecycle cases assign. Those cases exist to run `syncSubscriptionToGuild` and `syncPremiumDiscordRole`, and a `trial_will_end` subscription is still `trialing`, so the tier it would write is the tier already stored. Routing this event through that path would spend a database write and a Discord role call to change nothing, and would put a notification failure on the same code path as tier sync. Returning early is the same structure `payment_method.attached` uses at route.ts:79-105 and for the same reason.

Wrap the call in its own try/catch even though `notifyTrialEnding` already contracts not to throw. This is the belt to that module's braces and it matches the precedent set twice already in this file. A throw escaping to the outer catch at route.ts:164 would answer 500, and a 500 makes Stripe retry the whole event with backoff and eventually disable the endpoint, taking down tier sync for every guild over a notification that is optional by construction.

Extend the route's doc-comment event list at route.ts:14-20 to include the new event, and restate there that the list describes a Dashboard setting on we_1U8UUlFV7dhwtnIjYXou6I5i that must actually exist.

**3. Then run the gate, then the operator action, then the human-checks, in that order.** The operator action precedes every check because each one is meaningless without it, and because the failure it prevents is the failure that already happened twice today.
  </action>
  <verify>
    <automated>npm run typecheck && npm run lint && npx vitest run</automated>
    <human-check>
**A. OPERATOR ACTION, do this first. Subscribe the live endpoint to the event.**

Stripe Dashboard -> Developers -> Webhooks -> `we_1U8UUlFV7dhwtnIjYXou6I5i` -> Update details -> Select events.

READ the current selection before changing anything, and write down what is actually there. There is a known discrepancy in the record: quick task 260921-w4u described the endpoint as carrying five events and asked for `payment_method.attached` to be added as a sixth, while the brief for this task describes six events with `payment_method.attached` still outstanding. Do not trust either count. Read the live list.

Then ensure BOTH of these are selected, adding whichever is missing:

- `customer.subscription.trial_will_end` (this plan)
- `payment_method.attached` (quick task 260921-w4u, possibly still unapplied)

These five must remain selected and must not be replaced: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`.

Record the resulting full list verbatim, with a timestamp, in the summary. Without `customer.subscription.trial_will_end` on this endpoint, every line this plan adds is dead code in production and officers keep losing Premium with no warning.

**B. A real `trial_will_end` produces a DM.** This is the check the whole plan exists to make.

Note first that `stripe trigger customer.subscription.trial_will_end` is NOT sufficient. It fabricates a subscription with no `metadata.guild_id`, so the handler will correctly report `not_ours` and send nothing. That outcome is worth observing (it proves the ownership filter holds against a foreign subscription) but it does not exercise the DM.

To exercise the DM: in test mode, start a Premium trial through the real Checkout flow on a test guild whose purchaser has a linked `discord_id`, attach a Stripe test clock to that customer, and advance the clock to three days before trial end.

Record: the log line verbatim; whether the DM arrived; the full rendered text; whether the date rendered as a real local date rather than as literal markdown; whether the guild name appeared. Then read the message back against `<draft_copy>` and get the user's sign-off or revisions on the copy. The copy is explicitly not approved until this happens.

**C. An officer with no linked Discord degrades quietly.** Clear `user_preferences.discord_id` for the test purchaser (or use a purchaser who never linked Discord) and re-fire the event.

Expect: HTTP 200, exactly one `console.log` naming the reason, zero `console.error`, no DM, and no retry scheduled in the Stripe Dashboard's event view. Record the HTTP status and the literal log line. If this appears as an error in the logs, the severity is wrong and must be fixed: an officer who never linked Discord is a normal officer, not an incident.

While here, also observe the DM-refused path if it is cheap to reach: point the test purchaser's `discord_id` at an account that shares no server with the bot, re-fire, and confirm a 403 is logged quietly and the route still answers 200.

**D. An officer who already has a card is not warned.** This proves the false-alarm filter, which is the reason the pure module exists.

Attach a payment method to the test customer through the billing portal (which sets it as the CUSTOMER's default, not the subscription's, and is therefore the case a subscription-only check would get wrong), then re-fire `trial_will_end` on the same subscription.

Expect: no DM, and a log line reporting the payment-method-on-file reason. Record the log line and confirm which field the card actually landed on, since that is a durable fact about the portal worth writing down.
    </human-check>
  </verify>
  <done>`npm run typecheck`, `npm run lint` and `npx vitest run` all pass. The webhook handles `customer.subscription.trial_will_end` in its own case, returning 200 on every path including Stripe and Discord failures. The event is selected on the live endpoint alongside `payment_method.attached`, with the post-change list recorded verbatim. Human-checks B, C and D are recorded with their literal log lines, or recorded as NOT RUN with the reason. The drafted copy is either signed off by the user or carries the user's revisions.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Stripe -> `POST /api/webhooks/stripe` | Untrusted HTTP crosses here. Authenticated by HMAC in the unchanged `constructEvent` before the switch is ever reached. |
| `guilds.name` -> Discord embed description | User-controlled text crosses into a rendering context that interprets markdown. |
| Our server -> Discord API | Outbound. Carries `DISCORD_BOT_TOKEN` and the purchaser's Discord user id. |
| Service-role Supabase reads | RLS is bypassed by construction, so the guild id the query is keyed on is the only thing limiting the blast radius. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wiy-01 | Information Disclosure | purchaser resolution in `notifyTrialEnding` | low | mitigate | The DM discloses a guild's name, trial end date and billing state to whoever it reaches, so resolving the wrong person is the disclosure. The chain is keyed on `subscription.metadata.user_id`, which only app/api/billing/checkout/route.ts writes, falling back to `guilds.created_by`, which only guild creation writes. Nothing in the chain is attacker-supplied, and nothing in it is read from the event body except the guild id that has already passed the ownership filter. Task 2 shares the exact resolution already covered by discord-premium.test.ts rather than writing a second one that could drift. |
| T-wiy-02 | Denial of Service | a Stripe or Discord failure converted into a 500 | medium | mitigate | A throw from `customers.retrieve`, from a Supabase read, or from `discordFetch` exhausting its retries would reach the route's outer catch and answer 500. Stripe responds to 500s by retrying the whole event with backoff and, after sustained failure, disabling the endpoint, which takes down tier sync for EVERY guild over a notification that is optional by construction. Mitigated in three layers: `sendDirectMessage` contracts not to throw, `notifyTrialEnding` contracts not to throw with every awaited call individually caught, and the webhook case wraps the call in its own try/catch anyway. This is the same three-layer shape route.ts already uses for `payment_method.attached` and `syncPremiumDiscordRole`. Observed by human-check C. |
| T-wiy-03 | Spoofing | a forged `trial_will_end` event | low | mitigate | Unchanged HMAC verification in `constructEvent` runs before the switch. A forged event that somehow passed it would still have to carry a `metadata.guild_id` we wrote, and its only reachable effect is one DM to the legitimate purchaser of that guild telling them about their own trial. There is no state mutation on this path at all: it performs reads and sends a message. |
| T-wiy-04 | Tampering | `guilds.name` interpolated into a Discord embed description | low | mitigate | Embed descriptions render Discord markdown, including link syntax, so an unsanitised guild name could plant a live link inside a billing warning, which is the highest-credibility place in the product to plant one. Severity is low because the name is set within a guild and the message goes to that guild's purchaser, so the usual case is self-injection; it is not dismissed because `created_by` and rename permission are not guaranteed to be the same person. Mitigated twice: `sanitizeGuildName` strips markdown and mention characters and caps length (pure, and pinned by Task 1's behavior table), and the message body carries `allowed_mentions: { parse: [] }` so no payload can ping regardless. |
| T-wiy-05 | Repudiation | no record that a warning was sent | low | accept | There is no notification history, so if an officer says they were never warned there is nothing but application logs to check. Accepted: the schema is off limits by constraint, the log line is sufficient evidence for the support conversations this product actually has, and the alternative considered (writing state back onto Stripe subscription metadata) is rejected in `<duplicate_dm_decision>` as adding three failure modes to remove one. Revisit if a billing-notification table is ever added. |
| T-wiy-SC | Tampering | npm/pip/cargo installs | n/a | accept | This plan installs no packages. The package-legitimacy gate has nothing to evaluate and no checkpoint is required. |
</threat_model>

<followups>
Not in scope here. Recorded so they are not rediscovered.

1. **Converge the four hand-rolled DM implementations on `sendDirectMessage`.** notify-officers:224, send-notification:182 and resubmit-reminders:134 each reimplement the same two calls with different failure handling. Converting them is behaviour-bearing (resubmit-reminders stamps database rows only on success, notify-officers keeps sent/failed counters), so each needs its own verification.
2. **The stale app-URL fallback.** app/api/cron/resubmit-reminders/route.ts:116 falls back to `https://lootlistplus.com`, while the canonical origin is `https://www.getlootlist.com` (app/layout.tsx:60, app/robots.ts:68). If `NEXT_PUBLIC_APP_URL` is ever unset in production, that cron DMs raiders a link to the wrong domain. This plan does not copy the stale value; the cron itself is untouched.
3. **A billing notification preference.** `user_preferences` has four notification toggles and all four are raider loot-workflow settings. If billing notices should ever be opt-out, that needs its own column and this plan may not add one.
4. **Dedupe, if a notification history ever exists.** `<duplicate_dm_decision>` accepts at-least-once delivery on the grounds that the only store within reach is Stripe metadata. If a billing-notification table is ever added, this becomes an insert-if-absent and should be revisited.
5. **Copy sign-off.** The `<draft_copy>` strings are unapproved until human-check B reads the rendered DM back to the user. Record the approval or the revisions in the summary, following the sign-off convention used in Phase 03 and Phase 04.
</followups>

<verification>
Automated, in Task 3's `<verify>`: `npm run typecheck`, `npm run lint`, `npx vitest run`. Task 1 additionally gates on its own file alone so the RED-GREEN cycle stays fast, and Task 2 gates on discord-premium.test.ts specifically, since the unedited passing of those existing assertions is the entire safety argument for refactoring a path already verified live in production.

Human, in Task 3's `<verify><human-check>`, because `workflow.human_verify_mode` is `end-of-phase`. The operator action comes first and is blocking for production: without `customer.subscription.trial_will_end` on endpoint we_1U8UUlFV7dhwtnIjYXou6I5i, Stripe never delivers the event and every line of this plan is inert. Then three checks no unit test can reach: that a real trial-ending event produces a real DM whose date renders correctly (and that the user signs off on its copy), that an officer with no linked Discord degrades to a quiet log line and a 200, and that an officer who already added a card through the billing portal is not warned.

What the automated gate deliberately does not cover, and why, is argued in `<test_strategy_decision>`: the orchestrator and the DM transport get no unit test because every available assertion about them is a tautology, and the extraction in Task 1 is what makes that acceptable rather than lazy.
</verification>

<success_criteria>
1. A trialing Premium subscription that is ours, three days from its end, with no payment method on any of the four legs, produces a Discord DM to the purchaser naming the guild, giving the end date, linking to `/guild-settings`, and saying the guild data is safe.
2. The same event produces no DM when a card is on file, when the subscription is not ours, when the subscription is no longer trialing, or when the purchaser has no linked Discord, and each of those produces one informational log line rather than an error.
3. The webhook answers HTTP 200 for `customer.subscription.trial_will_end` on every path, including when the Stripe customer retrieve fails, when Supabase fails, and when Discord fails or refuses the DM. Stripe schedules no retry.
4. `lib/billing/trial-ending.ts` exposes the whole decision surface as pure functions covered by `lib/billing/__tests__/trial-ending.test.ts`, importing nothing from `stripe`, `@supabase/supabase-js` or `@/lib/discord`.
5. `discord-premium.test.ts` passes unedited against the shared purchaser module.
6. The message contains no U+2014 or U+2013 character, enforced by a test rather than by review.
7. `customer.subscription.trial_will_end` and `payment_method.attached` are both selected on live endpoint we_1U8UUlFV7dhwtnIjYXou6I5i, with the post-change list recorded verbatim.
8. The three decisions the constraints demanded (helper placement, test strategy, duplicate delivery) are each argued in this plan and reflected in the code, not silently defaulted.
</success_criteria>

<output>
Create `.planning/quick/260921-wiy-dm-the-purchaser-on-discord-three-days-b/260921-wiy-SUMMARY.md` when done.

The summary must record: the vitest pass count and the new test file's contribution; whether the real `Stripe.Subscription` and `Stripe.Customer` satisfied the structural interfaces with no cast, or whether an adapter was needed, since that is a durable fact about the SDK; the operator action's post-change event list verbatim with a timestamp, together with the true prior count that resolves the five-versus-six discrepancy, or NOT RUN with the reason; human-check B's literal log line, the rendered DM text, and the user's copy sign-off or revisions; human-check C's HTTP status, log line and log severity; human-check D's log line and which field the billing portal actually wrote the card to; and the five follow-ups with their status.
</output>
