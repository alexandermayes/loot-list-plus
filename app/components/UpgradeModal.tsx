'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon } from '@hugeicons/core-free-icons'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { usePremiumCheckout, type BillingInterval } from '@/app/hooks/usePremiumCheckout'
import { trackClientEvent } from '@/utils/analytics/client'
import PremiumItemTooltip from './PremiumItemTooltip'

const FEATURES = [
  'Multiple raid teams with separate schedules and attendance',
  'Officer activity feed — every change, who made it, and when',
  'Priority support in the LootList+ Discord',
  'Covers every member of your guild',
]

const PRICING: Record<BillingInterval, { amount: string; per: string; note: string }> = {
  annual: { amount: '$39', per: '/year', note: '$3.25 a month — save 35%' },
  monthly: { amount: '$4.99', per: '/month', note: 'Cancel anytime' },
}

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  /** Where the modal was opened from, for the pro_modal_viewed event */
  source: string
}

/**
 * In-app upgrade modal: what Premium includes, a Monthly/Annual toggle, and
 * checkout right here for officers. Members see the same pitch with a nudge
 * to their officers instead of a buy button.
 */
export default function UpgradeModal({ open, onClose, source }: UpgradeModalProps) {
  const { activeGuild, hasPermission } = useGuildContext()
  const { startCheckout, redirecting } = usePremiumCheckout(source)
  const [interval, setInterval] = useState<BillingInterval>('annual')

  const isOfficer = hasPermission('manage_settings')
  const requirementMet = !activeGuild || isOfficer
  const price = PRICING[interval]

  useEffect(() => {
    if (open) {
      trackClientEvent('pro_modal_viewed', { source, guild_id: activeGuild?.id })
    }
  }, [open, source, activeGuild?.id])

  return (
    <Modal open={open} onClose={onClose} size="full">
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr]">
        {/* The drop itself — Val'anyr above its legendary tooltip */}
        <div className="relative flex flex-col items-center justify-center gap-2 p-6 md:p-7 bg-[#0c0b0e] border-b md:border-b-0 md:border-r border-border overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 35%, rgba(255,128,0,0.18) 0%, transparent 60%)' }}
            aria-hidden="true"
          />
          <div className="relative w-[150px] h-[140px] hidden md:block">
            <Image src="/images/landing/items/valanyr.webp" alt="" fill sizes="150px" className="object-contain" style={{ transform: 'rotate(-14deg)' }} />
          </div>
          <PremiumItemTooltip
            variant="compact"
            requirementMet={requirementMet}
            className="relative w-full max-w-[320px]"
          />
        </div>

        {/* Plan panel */}
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <SegmentedControl
              options={[
                { value: 'annual', label: 'Annual · save 35%' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              value={interval}
              onChange={(v) => setInterval(v)}
            />
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} />
            </button>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[40px] leading-none text-foreground">{price.amount}</span>
              <span className="text-[14px] text-muted-foreground">{price.per} per guild</span>
            </div>
            <p className="text-[13px] text-muted-foreground mt-1.5">{price.note}</p>
          </div>

          <div>
            <p className="text-[13px] font-medium text-foreground-secondary mb-2">Unlock for your whole guild:</p>
            <ul className="space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[13px] text-foreground">
                  <span className="text-[#ff8000] shrink-0">✦</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-2">
            {isOfficer ? (
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Maybe later
                </Button>
                <Button
                  variant="primary"
                  onClick={() => startCheckout(interval)}
                  loading={redirecting !== null}
                >
                  Upgrade — {interval === 'annual' ? '$39/year' : '$4.99/month'}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] text-muted-foreground">
                  Only guild officers can upgrade — send one this way.
                </p>
                <Button variant="outline" onClick={onClose}>
                  Got it
                </Button>
              </div>
            )}
            <Link
              href="/premium"
              onClick={onClose}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors text-right underline"
            >
              See full details
            </Link>
          </div>
        </div>
      </div>
    </Modal>
  )
}
