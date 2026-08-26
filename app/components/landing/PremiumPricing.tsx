'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { usePremiumCheckout } from '@/app/hooks/usePremiumCheckout'
import { isPro } from '@/domain/guild/feature-flags'
import { trackClientEvent } from '@/utils/analytics/client'
import MagneticButton from './MagneticButton'
import PremiumItemTooltip from '@/app/components/PremiumItemTooltip'

/**
 * The Premium offer, presented as the one artifact every WoW player has
 * memorized: an in-game item tooltip, at legendary quality. Styling matches
 * the hover tooltips on the floating hero items (ParallaxItem) so the page
 * speaks one visual language. Checkout is viewer-aware: officers buy,
 * members see a (red, in-game style) unmet requirement, Pro guilds get a
 * settings link, signed-out visitors get sign-in.
 */
export default function PremiumPricing() {
  const { activeGuild, loading, hasPermission } = useGuildContext()
  const { startCheckout, redirecting } = usePremiumCheckout('premium_page')
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    trackClientEvent('pro_modal_viewed', { source: 'premium_page', guild_id: activeGuild?.id })
  }, [activeGuild?.id])

  const guildIsPro = isPro(activeGuild)
  const isOfficer = !!activeGuild && hasPermission('manage_settings')
  const canBuy = isOfficer && !guildIsPro
  // In-game red for an unmet requirement: a member who can't purchase
  const requirementMet = !activeGuild || isOfficer

  const primaryBtn =
    'inline-flex items-center justify-center px-5 py-3 rounded-[60px] bg-white font-poppins font-semibold text-[16px] text-black no-underline hover:bg-white/90 transition-colors cursor-pointer'
  const secondaryBtn =
    'inline-flex items-center justify-center px-5 py-3 rounded-[60px] bg-[#121218] border border-[#383838] font-poppins font-semibold text-[16px] text-white no-underline hover:bg-[#1a1a22] transition-colors cursor-pointer'

  return (
    <section className="relative pt-12 md:pt-16 pb-24 md:pb-32 bg-[#080808]">
      <div ref={ref} className="relative z-10 max-w-[560px] mx-auto px-6">
        <h2 className="sr-only">Pricing</h2>

        {/* Loot-announce line, straight from the in-game chat log */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.4 }}
          className="font-poppins text-[14px] text-[#bababa] text-center mb-4"
        >
          Your guild receives loot:
        </motion.p>

        {/* The legendary item tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mx-auto max-w-[440px] breathing-glow"
          style={{ '--glow-color': 'rgba(255,128,0,0.25)', '--glow-duration': '4.5s', '--glow-delay': '0.5s' } as React.CSSProperties}
        >
          <PremiumItemTooltip variant="full" requirementMet={requirementMet} />
        </motion.div>

        {/* Roll on it */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8 flex flex-col items-center gap-4"
        >
          {canBuy && (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <MagneticButton as="button" onClick={() => startCheckout('annual')} className={primaryBtn}>
                {redirecting === 'annual' ? 'Redirecting…' : 'Upgrade yearly — $39'}
              </MagneticButton>
              <MagneticButton as="button" onClick={() => startCheckout('monthly')} className={secondaryBtn}>
                {redirecting === 'monthly' ? 'Redirecting…' : '$4.99/month'}
              </MagneticButton>
            </div>
          )}
          {!activeGuild && !loading && (
            <MagneticButton as="a" href="/" className={primaryBtn}>
              Sign in to upgrade your guild
            </MagneticButton>
          )}
          {guildIsPro && (
            <p className="font-poppins font-medium text-[15px] text-[#bababa] text-center">
              <span className="text-[#ff8000]">✦</span> {activeGuild?.name} already has Premium —{' '}
              <Link href="/guild-settings" className="text-white underline hover:text-[#ff8000] transition-colors">
                manage billing in guild settings
              </Link>
            </p>
          )}
          {!guildIsPro && activeGuild && !isOfficer && (
            <p className="font-poppins font-medium text-[15px] text-[#bababa] text-center">
              Upgrading is done by a guild officer — send them this page.
            </p>
          )}
          <p className="font-poppins text-[13px] text-[#bababa]/60 text-center max-w-[400px]">
            Every new guild starts with a 14-day free trial — cancel during the trial
            and you won&apos;t be charged. One subscription covers your whole guild, and
            you keep Premium until the end of the billing period if you cancel later.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
