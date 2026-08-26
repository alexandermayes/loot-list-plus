'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Heading } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { isPro } from '@/domain/guild/feature-flags'
import UpgradeModal from '@/app/components/UpgradeModal'

interface SubscriptionRow {
  status: string | null
  billing_interval: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  stripe_customer_id: string | null
}

/**
 * LootList+ Premium card in guild settings. Officers see the guild's tier,
 * can upgrade (Stripe Checkout) or manage/cancel (Stripe customer portal).
 */
export function BillingSection() {
  const { activeGuild, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()
  const supabase = createClient()
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null)
  const [busy, setBusy] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const guildIsPro = isPro(activeGuild)
  const canManage = hasPermission('manage_settings')

  useEffect(() => {
    if (!activeGuild?.id || !canManage) return
    supabase
      .from('guild_subscriptions')
      .select('status, billing_interval, current_period_end, cancel_at_period_end, stripe_customer_id')
      .eq('guild_id', activeGuild.id)
      .maybeSingle()
      .then(({ data }: { data: SubscriptionRow | null }) => setSubscription(data))
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

  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Heading level={2}>LootList+ Premium</Heading>
          {guildIsPro && (
            <span className="text-[11px] font-semibold uppercase tracking-wide bg-success/15 text-success rounded-full px-2 py-0.5">
              Active
            </span>
          )}
        </div>
        <p className="text-muted-foreground text-[13px] mt-1">
          Multiple raid teams, officer activity feed, and priority support
        </p>
      </div>
      <div className="p-6 space-y-4">
        {guildIsPro ? (
          <>
            <p className="text-[13px] text-muted-foreground">
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
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground">
              Your guild is on the free tier. Premium is $4.99/month or $39/year
              for the whole guild.
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
    </div>
  )
}
