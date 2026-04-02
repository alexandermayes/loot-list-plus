'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import Image from 'next/image'
import ParallaxItem from './ParallaxItem'
import MagneticButton from './MagneticButton'

const APP_URL = 'https://www.lootlistplus.com'

export default function LandingCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'cta' })
  }, [isInView])

  return (
    <section id="cta" className="relative pt-16 md:pt-24 pb-32 md:pb-40 bg-[#080808]">
      <div className="absolute inset-0 max-w-[1440px] mx-auto">
        {/* Floating decorative items - flanking the CTA content */}
        <ParallaxItem
          speed={0.1}
          slideFrom="left"
          className="absolute left-[80px] top-[35%] w-[195px] h-[171px] hidden md:block pointer-events-none breathing-glow"
          style={{ transform: 'translateY(-50%) rotate(-23deg)', '--glow-color': 'rgba(237,89,6,0.5)' } as React.CSSProperties}
          tooltip={{ name: "Cinderheart Crown", quality: "epic", type: "Plate Helmet", flavor: "Warm to the touch. Always." }}
        >
          <Image src="/images/landing/items/item-orange-bottom.png" alt="" fill className="object-contain" />
        </ParallaxItem>

        <ParallaxItem
          speed={-0.1}
          slideFrom="right"
          className="absolute right-[17px] top-[30%] w-[300px] h-[240px] hidden md:block pointer-events-none breathing-glow"
          style={{ transform: 'translateY(-50%)', '--glow-color': 'rgba(67,163,236,0.5)' } as React.CSSProperties}
          tooltip={{ name: "Frostmaw, Blade of the Deep", quality: "epic", type: "One-Hand Sword", flavor: "Pulled from a frozen lakebed. Still dripping." }}
        >
          <Image src="/images/landing/items/item-blue-bottom.png" alt="" fill className="object-contain" />
        </ParallaxItem>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 lg:px-20">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="flex flex-col items-center gap-6 text-center"
        >
          {/* Headline */}
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[40px] md:text-[72px] leading-[1.05] text-white max-w-[696px]"
          >
            A better way to run{' '}
            <span className="font-wow text-shimmer-purple text-[48px] md:text-[80px]">loot</span>.
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="font-poppins font-medium text-[16px] text-[#bababa] max-w-[696px]"
          >
            Bring loot lists, attendance, and fair distribution into one system your whole guild can trust.
          </motion.p>

          {/* CTA Button - Magnetic */}
          <motion.div variants={fadeInUp}>
            <MagneticButton
              as="a"
              href={APP_URL}
              onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'bottom_get_started' })}
              className="inline-flex items-center justify-center px-4 py-3 rounded-[60px] bg-white font-poppins font-semibold text-[16px] text-black no-underline hover:bg-white/90 transition-colors"
            >
              Get started for free
            </MagneticButton>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
