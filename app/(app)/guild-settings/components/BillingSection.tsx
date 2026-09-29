'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Heading } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { isPro } from '@/domain/guild/feature-flags'
import UpgradeModal from '@/app/components/UpgradeModal'
import { Card } from '@/components/ui/card'
import { billingViewState, trialEligible } from '@/lib/billing/subscription-view'

interface SubscriptionRow {
  status: string | null
  billing_interval: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

/**
 * LootList+ Premium card in guild settings. Officers see the guild's tier,
 * can upgrade (Stripe Checkout) or manage/cancel (Stripe customer portal).
 */
export function BillingSection() {
  const { activeGuild, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()
  const supabase = createClient()
  // undefined = the guild_subscriptions lookup has not resolved yet; null =
  // it resolved and found no row. Keeping these distinct (rather than
  // starting from null) is what stops a paused guild from flashing the
  // free-tier upsell, or a lapsed guild from flashing the trial promise,
  // for one frame before the lookup settles.
  const [subscription, setSubscription] = useState<SubscriptionRow | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const guildIsPro = isPro(activeGuild)
  const canManage = hasPermission('manage_settings')

  useEffect(() => {
    if (!activeGuild?.id || !canManage) return
    supabase
      .from('guild_subscriptions')
      .select('status, billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id')
      .eq('guild_id', activeGuild.id)
      .maybeSingle()
      .then(({ data }: { data: SubscriptionRow | null }) => setSubscription(data ?? null))
  }, [activeGuild?.id, canManage, supabase])

  const openPortal = useCallback(async () => {
    if (!activeGuild || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        showNotification('error', data.error || 'Couldn\'t open the billing portal. Try again.')
        setBusy(false)
        return
      }
      window.location.href = data.url
    } catch {
      showNotification('error', 'Couldn\'t open the billing portal. Try again.')
      setBusy(false)
    }
  }, [activeGuild, busy, showNotification])

  if (!activeGuild || !canManage) return null

  const viewState = billingViewState(guildIsPro, subscription)

  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Heading level={2}>LootList+ Premium</Heading>
          {viewState === 'pro' && (
            <span className="text-11 font-semibold uppercase tracking-wide bg-success/15 text-success rounded-full px-2 py-0.5">
              Active
            </span>
          )}
          {viewState === 'paused' && (
            <span className="text-11 font-semibold uppercase tracking-wide bg-warning/15 text-warning rounded-full px-2 py-0.5">
              Paused
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-13 mt-1">
          Multiple raid teams, officer activity feed, reserve runs, and priority support
        </p>
      </div>
      <div className="p-6 space-y-4">
        {viewState === 'pro' && (
          <>
            <p className="text-13 text-muted-foreground">
              {subscription?.stripe_customer_id ? (
                subscription.cancel_at_period_end && renewalDate
                  ? `Premium is cancelled and ends on ${renewalDate}.`
                  : renewalDate
                    ? `Renews ${subscription.billing_interval === 'year' ? 'yearly' : 'monthly'} on ${renewalDate}.`
                    : 'Premium is active.'
              ) : (
                'Premium is active (complimentary).'
              )}
            </p>
            {subscription?.stripe_customer_id && (
              <Button variant="outline" onClick={openPortal} disabled={busy}>
                {busy ? 'Opening…' : 'Manage billing'}
              </Button>
            )}
          </>
        )}
        {viewState === 'paused' && (
          <>
            <p className="text-13 text-muted-foreground">
              Your trial ended, so Premium is paused. Add a payment method to
              turn it back on. Your guild data is safe and nothing was lost.
            </p>
            <Button variant="primary" onClick={openPortal} disabled={busy}>
              {busy ? 'Opening…' : 'Add payment method'}
            </Button>
          </>
        )}
        {viewState === 'free' && (
          <>
            <p className="text-13 text-muted-foreground">
              Your guild is on the free tier. Premium is $4.99/month or $39/year
              for the whole guild.{' '}
              {trialEligible(subscription)
                ? 'It starts with a 14-day free trial, and no credit card is required.'
                : 'Premium starts as soon as you subscribe.'}
            </p>
            <Button variant="primary" onClick={() => setShowUpgradeModal(true)}>
              See what&apos;s in Premium
            </Button>
            <UpgradeModal
              open={showUpgradeModal}
              onClose={() => setShowUpgradeModal(false)}
              source="guild_settings"
            />
          </>
        )}
      </div>
    </Card>
  )
}
