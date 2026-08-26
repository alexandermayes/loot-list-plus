'use client'

import { useCallback, useState } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { trackClientEvent } from '@/utils/analytics/client'

export type BillingInterval = 'monthly' | 'annual'

/**
 * Starts Stripe Checkout for the active guild. Shared by every upgrade
 * surface (upgrade modal, /premium page) so the funnel behaves identically
 * everywhere; `source` tags the pro_upgrade_clicked analytics event.
 */
export function usePremiumCheckout(source: string) {
  const { activeGuild } = useGuildContext()
  const { showNotification } = useNotification()
  const [redirecting, setRedirecting] = useState<BillingInterval | null>(null)

  const startCheckout = useCallback(async (interval: BillingInterval) => {
    if (!activeGuild || redirecting) return
    trackClientEvent('pro_upgrade_clicked', { source, interval, guild_id: activeGuild.id })
    setRedirecting(interval)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, interval }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        showNotification('error', data.error || 'Couldn\'t start checkout. Try again.')
        setRedirecting(null)
        return
      }
      window.location.assign(data.url)
    } catch {
      showNotification('error', 'Couldn\'t start checkout. Try again.')
      setRedirecting(null)
    }
  }, [activeGuild, redirecting, showNotification, source])

  return { startCheckout, redirecting }
}
