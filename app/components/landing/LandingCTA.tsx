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
        {/* 7. Tusks of Mannoroth - bottom left */}
        <ParallaxItem
          speed={0.1}
          slideFrom="left"
          depth={1.4}
          float={{ distance: 9, duration: 6, delay: 0.3 }}
          clickEffect="warCry"
          className="absolute left-[-220px] top-[-10%] w-[600px] h-[600px] hidden md:block pointer-events-none breathing-glow"
          style={{ transform: 'rotate(3deg)', '--glow-color': 'rgba(253,87,27,0.5)', '--glow-duration': '4s', '--glow-delay': '1.2s' } as React.CSSProperties}
          tooltip={{ name: "Tusks of Mannoroth", quality: "epic", type: "Plate Shoulder", flavor: "The trophy of a lifetime." }}
        >
          <Image src="/images/landing/items/tusks-of-mannoroth.png" alt="" fill sizes="600px" className="object-contain" />
        </ParallaxItem>

        {/* 8. Cursed Ashbringer - bottom right */}
        <ParallaxItem
          speed={-0.1}
          slideFrom="right"
          depth={1.1}
          float={{ distance: 12, duration: 7, delay: 2.0 }}
          clickEffect="shadowCleave"
          className="absolute right-[-120px] top-[10%] w-[380px] h-[380px] hidden md:block pointer-events-none breathing-glow"
          style={{ '--glow-color': 'rgba(100,200,100,0.25)', '--glow-duration': '4.8s', '--glow-delay': '0.6s' } as React.CSSProperties}
          tooltip={{ name: "Corrupted Ashbringer", quality: "epic", type: "Two-Hand Sword", flavor: "Blade of the Scarlet Highlord." }}
        >
          <Image src="/images/landing/items/cursed-ashbringer.png" alt="" fill sizes="600px" className="object-contain" />
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
