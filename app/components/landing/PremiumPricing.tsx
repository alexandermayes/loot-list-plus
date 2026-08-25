'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { isPro } from '@/domain/guild/feature-flags'
import { trackClientEvent } from '@/utils/analytics/client'
import { TiltCard } from './LandingValueProps'
import MagneticButton from './MagneticButton'

const annualGradient = 'linear-gradient(200deg, rgb(46, 42, 53) 15%, rgb(80, 73, 95) 83%)'
const monthlyGradient = 'linear-gradient(190deg, rgb(12, 11, 14) 15%, rgb(23, 21, 27) 83%)'

const INCLUDED = [
  'Multiple raid teams',
  'Officer activity feed',
  'Priority Discord support',
  'Covers every member of your guild',
]

/**
 * Pricing cards with viewer-aware checkout: officers get Stripe Checkout,
 * members get a nudge to their officers, Pro guilds get a settings link,
 * signed-out visitors get sign-in.
 */
export default function PremiumPricing() {
  const { activeGuild, loading, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()
  const [redirecting, setRedirecting] = useState<'monthly' | 'annual' | null>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    trackClientEvent('pro_modal_viewed', { source: 'premium_page', guild_id: activeGuild?.id })
  }, [activeGuild?.id])

  const guildIsPro = isPro(activeGuild)
  const canBuy = !!activeGuild && hasPermission('manage_settings') && !guildIsPro

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
      window.location.assign(data.url)
    } catch {
      showNotification('error', 'Couldn\'t start checkout. Try again.')
      setRedirecting(null)
    }
  }

  const buttonFor = (interval: 'monthly' | 'annual', label: string, primary: boolean) => {
    const className = primary
      ? 'inline-flex items-center justify-center px-5 py-3 rounded-[60px] bg-white font-poppins font-semibold text-[16px] text-black no-underline hover:bg-white/90 transition-colors cursor-pointer'
      : 'inline-flex items-center justify-center px-5 py-3 rounded-[60px] bg-[#121218] border border-[#383838] font-poppins font-semibold text-[16px] text-white no-underline hover:bg-[#1a1a22] transition-colors cursor-pointer'

    if (canBuy) {
      return (
        <MagneticButton as="button" onClick={() => startCheckout(interval)} className={className}>
          {redirecting === interval ? 'Redirecting…' : label}
        </MagneticButton>
      )
    }
    // Signed-out visitors head to sign-in; everyone else gets guidance below.
    if (!activeGuild && !loading) {
      return (
        <MagneticButton as="a" href="/" className={className}>
          Sign in to upgrade
        </MagneticButton>
      )
    }
    return null
  }

  return (
    <section className="relative pt-12 md:pt-16 pb-24 md:pb-32 bg-[#080808]">
      <div ref={ref} className="relative z-10 max-w-[900px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-10 md:mb-14"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[40px] leading-[1.1] text-white"
          >
            Simple <span className="font-wow text-shimmer-gold text-[32px] md:text-[44px]">pricing</span>, whole guild covered.
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch"
        >
          {/* Annual — best value */}
          <TiltCard
            className="relative flex flex-col gap-5 overflow-hidden rounded-[20px] md:rounded-[28px] p-8 md:p-10 border border-[#f0b232]/40"
            style={{ backgroundImage: annualGradient }}
          >
            <span className="absolute top-5 right-5 px-2.5 py-1 bg-[#f0b232] rounded-[60px] font-poppins font-semibold text-[10px] text-black">
              BEST VALUE
            </span>
            <p className="font-poppins font-semibold text-[14px] uppercase tracking-wide text-[#f0b232]">Annual</p>
            <div className="flex items-baseline gap-2">
              <span className="font-poppins font-bold text-[56px] leading-none text-white">$39</span>
              <span className="font-poppins font-medium text-[16px] text-[#bababa]">/year</span>
            </div>
            <p className="font-poppins font-medium text-[14px] text-[#bababa]">
              $3.25 a month — save 35% versus monthly.
            </p>
            <ul className="flex flex-col gap-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-2 font-poppins font-medium text-[14px] text-white">
                  <span className="text-[#f0b232]">✦</span> {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">{buttonFor('annual', 'Upgrade yearly', true)}</div>
          </TiltCard>

          {/* Monthly */}
          <TiltCard
            className="flex flex-col gap-5 overflow-hidden rounded-[20px] md:rounded-[28px] p-8 md:p-10"
            style={{ backgroundImage: monthlyGradient }}
          >
            <p className="font-poppins font-semibold text-[14px] uppercase tracking-wide text-[#bababa]">Monthly</p>
            <div className="flex items-baseline gap-2">
              <span className="font-poppins font-bold text-[56px] leading-none text-white">$4.99</span>
              <span className="font-poppins font-medium text-[16px] text-[#bababa]">/month</span>
            </div>
            <p className="font-poppins font-medium text-[14px] text-[#bababa]">
              Same everything. Cancel anytime.
            </p>
            <ul className="flex flex-col gap-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-2 font-poppins font-medium text-[14px] text-white">
                  <span className="text-[#bababa]">✦</span> {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-2">{buttonFor('monthly', 'Upgrade monthly', false)}</div>
          </TiltCard>
        </motion.div>

        {/* Viewer-state guidance under the cards */}
        <div className="mt-8 text-center">
          {guildIsPro && (
            <p className="font-poppins font-medium text-[15px] text-[#bababa]">
              <span className="text-[#f0b232]">✦</span> {activeGuild?.name} already has Premium —{' '}
              <Link href="/guild-settings" className="text-white underline hover:text-[#f0b232] transition-colors">
                manage billing in guild settings
              </Link>
            </p>
          )}
          {!guildIsPro && activeGuild && !canBuy && (
            <p className="font-poppins font-medium text-[15px] text-[#bababa]">
              Upgrading is done by a guild officer — send them this page.
            </p>
          )}
          <p className="font-poppins text-[13px] text-[#bababa]/60 mt-3">
            One subscription covers your whole guild. Cancel anytime — you keep Premium
            until the end of the billing period.
          </p>
        </div>
      </div>
    </section>
  )
}
