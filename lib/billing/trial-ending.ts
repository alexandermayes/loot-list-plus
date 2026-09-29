/**
 * Decides which trialing Premium subscriptions warrant a Discord warning DM
 * three days before the trial ends, and owns the copy of that warning, and
 * owns the orchestration of sending it.
 *
 * The pure decision surface below (hasPaymentMethodOnFile,
 * trialWarningDecision, discordTimestamp, sanitizeGuildName,
 * buildTrialEndingMessage) imports nothing from `stripe`,
 * `@supabase/supabase-js` or `@/lib/discord`, so it is unit-testable with
 * plain object literals. See trial-ending.test.ts. The orchestrator
 * (`notifyTrialEnding`, near the bottom of this file) performs the I/O and
 * gets no unit test - see the plan's <test_strategy_decision>.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolvePurchaser } from '@/lib/billing/purchaser'
import { sendDirectMessage } from '@/lib/discord'

/**
 * The shape this module reads off a Stripe subscription. Optional and
 * nullable throughout so a real `Stripe.Subscription` satisfies it
 * structurally with no cast.
 */
export interface TrialEndingSubscriptionLike {
  id: string
  status?: string | null
  metadata?: { [key: string]: string } | null
  default_payment_method?: string | { id: string } | null
  default_source?: string | { id: string } | null
  trial_end?: number | null
}

/**
 * The shape this module reads off a Stripe customer's invoice defaults.
 */
export interface CustomerPaymentDefaults {
  invoice_settings?: { default_payment_method?: string | { id: string } | null } | null
  default_source?: string | { id: string } | null
}

/**
 * Reduce the bare-id-string / expanded-object / null / undefined union every
 * payment-method-like field on Stripe carries down to present-or-absent.
 * Empty string counts as absent - Stripe never returns '' for a real id, and
 * treating it as present would report a payment method that isn't there.
 */
function isPresent(value: string | { id: string } | null | undefined): boolean {
  if (typeof value === 'string') return value.length > 0
  return value != null
}

/**
 * Walk the four-leg invoice-payment-method resolution chain in the order the
 * Stripe SDK's own docstring on `Subscription.default_payment_method`
 * specifies: subscription default payment method, subscription default
 * source, then - because the docstring says invoices fall back to the
 * customer's own defaults when neither subscription field is set - the
 * customer's invoice-settings default payment method, then the customer's
 * default source.
 *
 * The customer legs exist because the Stripe billing portal sets a newly
 * added card as the CUSTOMER's default, not the subscription's. Checking
 * only the subscription leg would warn precisely the officers who had
 * already added a card through the portal to fix the problem.
 *
 * A null `customer` means the retrieve failed or the customer was deleted.
 * Returning false there is deliberate: the ambiguity resolves toward
 * sending a warning that might turn out to be unnecessary rather than
 * withholding one that is needed, because a redundant nudge costs a
 * notification and a missed one costs a paying customer their Premium.
 */
export function hasPaymentMethodOnFile(
  sub: TrialEndingSubscriptionLike,
  customer: CustomerPaymentDefaults | null
): boolean {
  if (isPresent(sub.default_payment_method)) return true
  if (isPresent(sub.default_source)) return true
  if (!customer) return false
  if (isPresent(customer.invoice_settings?.default_payment_method)) return true
  if (isPresent(customer.default_source)) return true
  return false
}

export type TrialWarningReason = 'not_ours' | 'not_trialing' | 'payment_method_on_file' | 'warn'

export interface TrialWarningDecision {
  warn: boolean
  reason: TrialWarningReason
}

/**
 * Decide whether a trialing subscription warrants a warning DM. Ownership
 * is checked first via a non-empty `metadata.guild_id` - the same is-this-
 * ours test used at route.ts:112 and in `resumableSubscriptionIds` - because
 * it is the only gate that costs no I/O, so a foreign subscription never
 * pays for a `status` check it doesn't need.
 *
 * The `status === 'trialing'` gate is not redundant type-narrowing: a
 * Stripe redelivery arriving after the trial has already ended carries
 * `paused` or `active`, so this gate turns a stale redelivery into a no-op.
 * That property is what makes accepting at-least-once delivery safe (see
 * the plan's `<duplicate_dm_decision>`).
 */
export function trialWarningDecision(
  sub: TrialEndingSubscriptionLike,
  customer: CustomerPaymentDefaults | null
): TrialWarningDecision {
  if (!sub.metadata?.guild_id) return { warn: false, reason: 'not_ours' }
  if (sub.status !== 'trialing') return { warn: false, reason: 'not_trialing' }
  if (hasPaymentMethodOnFile(sub, customer)) return { warn: false, reason: 'payment_method_on_file' }
  return { warn: true, reason: 'warn' }
}

/**
 * Render a Unix-seconds timestamp as Discord timestamp markdown, which
 * Discord resolves client-side into each viewer's own timezone and locale
 * (see the plan's `<timestamp_rationale>`). `trial_end` is typed
 * `number | null` by the SDK, and interpolating the null branch unguarded
 * would render the literal text of a null token inside a DM to a paying
 * customer, so anything not finite and not strictly positive is rejected
 * rather than coerced.
 */
export function discordTimestamp(unixSeconds: number | null | undefined): string | null {
  if (typeof unixSeconds !== 'number' || !Number.isFinite(unixSeconds) || unixSeconds <= 0) return null
  return `<t:${Math.floor(unixSeconds)}:D>`
}

const MAX_GUILD_NAME_LENGTH = 64
// Strips Discord markdown/mention syntax this module treats as unsafe to
// interpolate into an embed description: brackets and parens (link syntax),
// @ (mentions), and the emphasis/code characters (* _ ~ ` |).
const UNSAFE_GUILD_NAME_CHARS = /[[\]()@*_~`|]/g

/**
 * `guilds.name` is user-controlled text interpolated into a Discord embed
 * description, and embed descriptions render Discord markdown, including
 * link syntax (`[text](url)`) and mentions. An unsanitised name could plant
 * a live link or an @everyone ping inside a billing warning - the
 * highest-credibility place in the product to plant one. See T-wiy-04.
 */
export function sanitizeGuildName(name: string | null | undefined): string | null {
  if (!name) return null
  const cleaned = name
    .replace(UNSAFE_GUILD_NAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_GUILD_NAME_LENGTH)
  return cleaned.length > 0 ? cleaned : null
}

export interface TrialEndingMessage {
  title: string
  description: string
  color: number
}

const EMBED_COLOR_YELLOW = 0xeab308
// Discord's embed description limit; the same limit `clampDescription`
// respects in lib/discord-loot-announcements.ts.
const EMBED_DESCRIPTION_LIMIT = 4096

function clampDescription(s: string): string {
  if (s.length <= EMBED_DESCRIPTION_LIMIT) return s
  return s.slice(0, EMBED_DESCRIPTION_LIMIT - 32) + '\n…(truncated)'
}

/**
 * Assemble the trial-ending warning embed.
 *
 * Copy approved by the user as drafted (2026-09-22), including the closing
 * data-safety paragraph and the "Nothing is charged before then, and
 * nothing is charged if you do nothing" sentence. See
 * .planning/quick/260921-wiy-dm-the-purchaser-on-discord-three-days-b/260921-wiy-PLAN.md
 * `<draft_copy>` for the source of record - implement those strings
 * verbatim if this block is ever revised.
 *
 * The guild name is sanitised and, when nothing usable remains, the
 * possessive clause is dropped entirely rather than filled with a
 * placeholder (per the plan's degraded-case table). The date is resolved
 * through `discordTimestamp` and falls back to the word-form "ends soon"
 * when `trial_end` is null. The timestamp token appears only in the
 * description - Discord does not resolve timestamp markdown in embed
 * titles, so the title stays date-free (see `<timestamp_rationale>`).
 */
export function buildTrialEndingMessage({
  guildName,
  trialEnd,
  billingUrl,
}: {
  guildName: string | null | undefined
  trialEnd: number | null | undefined
  billingUrl: string
}): TrialEndingMessage {
  const safeName = sanitizeGuildName(guildName)
  const timestamp = discordTimestamp(trialEnd)
  const endsWhen = timestamp ?? 'soon'

  const firstLine = safeName
    ? `Your Premium trial for **${safeName}** ends ${endsWhen}.`
    : `Your LootList+ Premium trial ends ${endsWhen}.`

  const description = clampDescription(
    `${firstLine}\n\n` +
      `There is no payment method on file, so Premium will pause when the trial ends. Nothing is charged before then, and nothing is charged if you do nothing.\n\n` +
      `Add a payment method to keep Premium: ${billingUrl}\n\n` +
      `Your guild data is safe either way. Loot lists, attendance and loot history all stay exactly as they are. If Premium pauses you drop to the free plan, and adding a card later switches Premium straight back on.`
  )

  return {
    title: 'Your Premium trial is ending',
    description,
    color: EMBED_COLOR_YELLOW,
  }
}

// ---------------------------------------------------------------------------
// Orchestrator. Everything above this line is pure and covered by
// trial-ending.test.ts; everything below performs I/O (Supabase reads, a
// Stripe customer retrieve, a Discord DM) and gets no unit test - see the
// plan's <test_strategy_decision>. What remains here is sequencing, and
// sequencing is what Task 3's human-checks observe against live Stripe and
// live Discord.
// ---------------------------------------------------------------------------

/**
 * The subscription shape `notifyTrialEnding` needs, beyond the pure
 * decision surface above: `customer` and `metadata.user_id`, to resolve the
 * Stripe customer and the purchaser. A real `Stripe.Subscription` satisfies
 * this structurally with no cast.
 */
export interface TrialEndingWebhookSubscription extends TrialEndingSubscriptionLike {
  customer: string | { id: string } | null
}

/**
 * The minimal Stripe surface `notifyTrialEnding` needs: a customer
 * retrieve. Declared as its own interface rather than importing `Stripe`,
 * matching `StripeResumePort` in resume-paused.ts - it exists so the
 * orchestrator's failure behaviour (a rejected retrieve) can be exercised
 * against a fake that throws on purpose, if this file ever grows an
 * orchestrator test.
 */
export interface TrialEndingStripePort {
  customers: {
    // `deleted` is typed `unknown` rather than `boolean` because the Stripe
    // SDK's own `Customer.deleted` field is typed `void` (a deliberate
    // discriminant trick against `DeletedCustomer.deleted: true`) -
    // `unknown` is the narrowest type both `void` and `true` satisfy, so
    // the real `stripe.customers.retrieve` return type is assignable here
    // with no cast.
    retrieve(customerId: string): Promise<(CustomerPaymentDefaults & { deleted?: unknown }) | null>
  }
}

/**
 * Resolve a customer id off `subscription.customer`, which per the Stripe
 * SDK is a bare id string, an expanded object carrying `id`, or null (the
 * deleted-customer arm also carries `id`, just no `invoice_settings`).
 */
function resolveCustomerId(customer: string | { id: string } | null | undefined): string | null {
  if (typeof customer === 'string') return customer.length > 0 ? customer : null
  if (customer && typeof customer === 'object') return customer.id
  return null
}

function resolveAppOrigin(): string {
  // Canonical origin per app/layout.tsx metadataBase and app/robots.ts.
  // Deliberately NOT the stale https://lootlistplus.com fallback used at
  // app/api/cron/resubmit-reminders/route.ts:116 - see the plan's
  // <followups>.
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.getlootlist.com'
}

export type NotifyTrialEndingReason = TrialWarningReason | 'no_discord_id' | 'dm_refused' | 'send_failed'

export interface NotifyTrialEndingOutcome {
  sent: boolean
  reason: NotifyTrialEndingReason
}

/**
 * Warn the purchaser on Discord that their Premium trial is ending, when
 * `trialWarningDecision` says to. Never throws: every awaited call that can
 * reject is individually caught, so a Stripe, Supabase, or Discord failure
 * degrades to a logged outcome rather than an exception reaching the
 * webhook route's catch (which would answer 500 and make Stripe retry the
 * whole event - see T-wiy-02).
 *
 * Cheap gates run before any I/O: ownership and trial status are checked
 * off the subscription object alone before a customer retrieve, a
 * purchaser lookup, or a guild-name read ever happens.
 */
export async function notifyTrialEnding(
  serviceSupabase: SupabaseClient,
  stripe: TrialEndingStripePort,
  subscription: TrialEndingWebhookSubscription
): Promise<NotifyTrialEndingOutcome> {
  const guildId = subscription.metadata?.guild_id
  if (!guildId) return { sent: false, reason: 'not_ours' }
  if (subscription.status !== 'trialing') return { sent: false, reason: 'not_trialing' }

  // Skip the customer retrieve entirely when the subscription's own legs
  // already have a default - there is nothing the customer object could add.
  let customer: CustomerPaymentDefaults | null = null
  if (!hasPaymentMethodOnFile(subscription, null)) {
    const customerId = resolveCustomerId(subscription.customer)
    if (customerId) {
      try {
        const retrieved = await stripe.customers.retrieve(customerId)
        // A deleted customer carries no invoice_settings; treat it the same
        // as a failed retrieve, which resolves toward warning (see
        // hasPaymentMethodOnFile's doc comment).
        customer = retrieved && !retrieved.deleted ? retrieved : null
      } catch (err) {
        console.error(`notifyTrialEnding: customers.retrieve failed for ${customerId} (subscription ${subscription.id}):`, err)
        customer = null
      }
    }
  }

  const decision = trialWarningDecision(subscription, customer)
  if (!decision.warn) {
    // A decline is the system working, not a fault.
    console.log(`notifyTrialEnding: subscription ${subscription.id} declined (${decision.reason})`)
    return { sent: false, reason: decision.reason }
  }

  // Resolve the purchaser's Discord id. Null means they never linked
  // Discord - an expected state for a real officer, logged at console.log
  // rather than console.error so it doesn't train log readers to ignore
  // the channel. Caught individually (rather than relying solely on the
  // webhook case's outer try/catch) so this function honours its own
  // never-throws contract regardless of caller.
  let purchaser: Awaited<ReturnType<typeof resolvePurchaser>>
  try {
    purchaser = await resolvePurchaser(serviceSupabase, guildId, subscription.metadata?.user_id ?? null)
  } catch (err) {
    console.error(`notifyTrialEnding: resolvePurchaser threw for guild ${guildId} (subscription ${subscription.id}):`, err)
    return { sent: false, reason: 'no_discord_id' }
  }
  if (!purchaser) {
    console.log(`notifyTrialEnding: subscription ${subscription.id} - purchaser has no linked Discord account`)
    return { sent: false, reason: 'no_discord_id' }
  }

  // Guild display name is deliberately read from guilds.name, not
  // subscription metadata: subscription_data.metadata carries only
  // guild_id and user_id, so the name genuinely isn't on the object (see
  // <verified_facts>). A failed lookup (thrown or returned-null) yields a
  // null name, which buildTrialEndingMessage already handles by dropping
  // the clause.
  let guildName: string | null = null
  try {
    const { data: guild } = await serviceSupabase.from('guilds').select('name').eq('id', guildId).maybeSingle()
    guildName = (guild?.name as string | null | undefined) ?? null
  } catch (err) {
    console.error(`notifyTrialEnding: guild name lookup threw for guild ${guildId} (subscription ${subscription.id}):`, err)
  }

  const billingUrl = `${resolveAppOrigin()}/guild-settings`
  const message = buildTrialEndingMessage({
    guildName,
    trialEnd: subscription.trial_end,
    billingUrl,
  })

  const botToken = process.env.DISCORD_BOT_TOKEN
  if (!botToken) {
    console.log(`notifyTrialEnding: subscription ${subscription.id} - DISCORD_BOT_TOKEN not configured`)
    return { sent: false, reason: 'send_failed' }
  }

  const sendOutcome = await sendDirectMessage(botToken, purchaser.discordId, {
    embeds: [message],
    // Belt to sanitizeGuildName's braces (T-wiy-04): no payload can ping
    // anyone regardless of what any interpolated text contains.
    allowed_mentions: { parse: [] },
  })

  if (!sendOutcome.ok) {
    if (sendOutcome.status === 403) {
      // DMs closed to the bot / no shared server / stale id - a state of
      // the world, not a fault.
      console.log(`notifyTrialEnding: subscription ${subscription.id} - DM refused (403, DMs closed to the bot)`)
      return { sent: false, reason: 'dm_refused' }
    }
    console.error(
      `notifyTrialEnding: subscription ${subscription.id} - DM send failed at ${sendOutcome.stage} (status ${sendOutcome.status})`
    )
    return { sent: false, reason: 'send_failed' }
  }

  return { sent: true, reason: 'warn' }
}
