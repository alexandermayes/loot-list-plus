'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import { TiltCard } from './LandingValueProps'

const cardGradient = 'linear-gradient(190deg, rgb(12, 11, 14) 15%, rgb(23, 21, 27) 83%)'
const highlightGradient = 'linear-gradient(200deg, rgb(46, 42, 53) 15%, rgb(80, 73, 95) 83%)'

const FEATURES = [
  {
    icon: '/images/landing/icons/sword-01.svg',
    title: 'Multiple raid teams',
    description:
      'Split your roster into separate raid groups, each with its own schedule, attendance tracking, and loot views. Built for guilds running more than one raid night.',
    highlight: true,
  },
  {
    icon: '/images/landing/icons/list-view.svg',
    title: 'Officer activity feed',
    description:
      'A full audit log of everything that changes in your guild — loot awards, roster moves, setting changes — with who did it and when.',
    highlight: false,
  },
  {
    icon: '/images/landing/icons/ranking.svg',
    title: 'Priority support',
    description:
      'A dedicated supporter role in Discord and first-in-line help when something goes wrong on raid night.',
    highlight: false,
  },
  {
    icon: '/images/landing/icons/body-armor.svg',
    title: 'Support development',
    description:
      'LootList+ is built by one person. Premium keeps the servers running and the features coming for every guild, free tier included.',
    highlight: false,
  },
]

export default function PremiumFeatures() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'premium_features' })
  }, [isInView])

  return (
    <section className="relative pt-20 md:pt-28 pb-8 bg-[#080808]">
      <div ref={ref} className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-12 md:mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[40px] leading-[1.1] text-white"
          >
            What&apos;s in the{' '}
            <span className="font-wow text-shimmer-gold text-[32px] md:text-[44px]">bag</span>?
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {FEATURES.map((feature) => (
            <TiltCard
              key={feature.title}
              className="flex flex-col gap-4 overflow-hidden rounded-[20px] md:rounded-[28px] p-8 md:p-10"
              style={{ backgroundImage: feature.highlight ? highlightGradient : cardGradient }}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-[#ff8000]/10 border border-[#ff8000]/25">
                <Image src={feature.icon} alt="" width={24} height={24} />
              </div>
              <p className="font-poppins font-semibold text-[20px] text-white leading-tight">
                {feature.title}
              </p>
              <p className="font-poppins font-medium text-[15px] text-[#bababa] leading-normal">
                {feature.description}
              </p>
            </TiltCard>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
