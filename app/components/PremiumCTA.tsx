'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { isPro } from '@/domain/guild/feature-flags'
import { trackClientEvent } from '@/utils/analytics/client'

/**
 * Upgrade call-to-action for the /premium page. Renders the right action for
 * the viewer: checkout buttons for officers, guidance for members, a link to
 * settings for guilds that already have Premium, sign-in for visitors.
 */
export function PremiumCTA() {
  const { activeGuild, loading, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()
  const [redirecting, setRedirecting] = useState<'monthly' | 'annual' | null>(null)

  useEffect(() => {
    trackClientEvent('pro_modal_viewed', { source: 'premium_page', guild_id: activeGuild?.id })
  }, [activeGuild?.id])

  const startCheckout = async (interval: 'monthly' | 'annual') => {
    if (!activeGuild || redirecting) return
    trackClientEvent('pro_upgrade_clicked', { source: 'premium_page', interval, guild_id: activeGuild.id })
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
      window.location.href = data.url
    } catch {
      showNotification('error', 'Couldn\'t start checkout. Try again.')
      setRedirecting(null)
    }
  }

  if (loading) return null

  if (!activeGuild) {
    return (
      <div className="text-center space-y-3">
        <Link href="/">
          <Button variant="primary" size="lg">Sign in to upgrade your guild</Button>
        </Link>
      </div>
    )
  }

  if (isPro(activeGuild)) {
    return (
      <div className="text-center space-y-3">
        <p className="text-success font-medium">{activeGuild.name} already has LootList+ Premium.</p>
        <Link href="/guild-settings">
          <Button variant="outline" size="lg">Manage billing in guild settings</Button>
        </Link>
      </div>
    )
  }

  if (!hasPermission('manage_settings')) {
    return (
      <p className="text-center text-muted-foreground">
        Upgrading is done by a guild officer — send them this page.
      </p>
    )
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        variant="primary"
        size="lg"
        disabled={redirecting !== null}
        onClick={() => startCheckout('annual')}
      >
        {redirecting === 'annual' ? 'Redirecting…' : 'Upgrade — $39/year'}
      </Button>
      <Button
        variant="outline"
        size="lg"
        disabled={redirecting !== null}
        onClick={() => startCheckout('monthly')}
      >
        {redirecting === 'monthly' ? 'Redirecting…' : '$4.99/month'}
      </Button>
    </div>
  )
}
