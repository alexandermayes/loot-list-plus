'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon, Cancel01Icon } from '@hugeicons/core-free-icons'

interface GuardianConversionBannerProps {
  guildId: string
}

export default function GuardianConversionBanner({ guildId }: GuardianConversionBannerProps) {
  const [count, setCount] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch(`/api/guilds/${guildId}/feral-conversion-count`)
        if (!res.ok) return
        const data = await res.json()
        setCount(data.count || 0)
      } catch {
        // Silently fail
      } finally {
        setLoaded(true)
      }
    }
    fetchCount()
  }, [guildId])

  if (!loaded || count === 0 || dismissed) return null

  return (
    <Alert className="relative">
      <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-accent" />
      <AlertDescription className="pr-8">
        {count} guild {count === 1 ? 'member hasn\'t' : 'members haven\'t'} chosen between Feral (DPS) and Guardian (Tank).
        They'll see a prompt on their next visit.
      </AlertDescription>
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={16} />
      </button>
    </Alert>
  )
}
