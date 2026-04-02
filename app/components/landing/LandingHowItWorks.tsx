'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainerSlow } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import Image from 'next/image'
import ParallaxItem from './ParallaxItem'

const steps = [
  {
    number: 1,
    title: 'Connect your guild',
    description: 'Link your WoW guild with Discord so members can join instantly.',
    icon: '/images/landing/items/howit-icon-guild.png',
  },
  {
    number: 2,
    title: 'Submit loot lists',
    description: 'Raiders rank their most wanted items with a simple 50-level system.',
    icon: '/images/landing/items/item-submit-icon.png',
  },
  {
    number: 3,
    title: 'Distribute fairly',
    description: 'Officers assign loot using transparent, attendance-based priority.',
    icon: '/images/landing/items/howit-icon-distribute.png',
  },
]

export default function LandingHowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'how_it_works' })
  }, [isInView])

  return (
    <section id="how-it-works" className="relative py-24 md:py-32" style={{ background: 'linear-gradient(180deg, #0C0B0E 0%, #17151B 100%)' }}>

      <div className="absolute inset-0 max-w-[1440px] mx-auto">
        {/* 5. Val'anyr */}
        <ParallaxItem
          speed={-0.2}
          slideFrom="left"
          className="absolute left-[-100px] top-[-180px] w-[420px] h-[500px] hidden lg:block pointer-events-none z-30 breathing-glow"
          style={{ '--glow-color': 'rgba(72,205,244,0.25)' } as React.CSSProperties}
          tooltip={{ name: "Val'anyr, Hammer of Ancient Kings", quality: "legendary", type: "One-Hand Mace", flavor: "The power of creation courses through its crystal core." }}
        >
          <Image src="/images/landing/items/valanyr.png" alt="" fill className="object-contain" style={{ transform: 'rotate(73deg)' }} />
        </ParallaxItem>
      </div>

      <div ref={ref} className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainerSlow}
          className="text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[40px] leading-[1.1] text-white mb-4 max-w-[562px] mx-auto"
          >
            Set up your guild and start{' '}
            <span className="font-wow text-shimmer-purple text-[32px] md:text-[44px]">getting loot</span>
            {' '}in minutes.
          </motion.h2>
        </motion.div>

        {/* Steps - 3 column grid with sequential lighting */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="relative"
        >
          {/* Arrows between columns (desktop only) - positioned in the gaps */}
          <div className="hidden md:block absolute top-[68px] left-0 right-0 z-10 pointer-events-none">
            <div className="max-w-[960px] mx-auto relative">
              <motion.div
                className="absolute left-[33.33%] -translate-x-1/2 w-10 h-10"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 0.6 } : {}}
                transition={{ duration: 0.5, delay: 1.0 }}
              >
                <Image src="/images/landing/icons/arrow-right-01.svg" alt="" width={40} height={40} />
              </motion.div>
              <motion.div
                className="absolute left-[66.66%] -translate-x-1/2 w-10 h-10"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 0.6 } : {}}
                transition={{ duration: 0.5, delay: 1.4 }}
              >
                <Image src="/images/landing/icons/arrow-right-01.svg" alt="" width={40} height={40} />
              </motion.div>
            </div>
          </div>

          {/* 3 columns - sequential reveal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 max-w-[960px] mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                className="flex flex-col items-center"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.4 + index * 0.3 }}
              >
                {/* Circular icon with glow on reveal */}
                <motion.div
                  className="relative mb-6"
                  initial={{ scale: 0.8 }}
                  animate={isInView ? { scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.3, type: 'spring', stiffness: 200 }}
                >
                  <div className="w-[130px] h-[130px] md:w-[175px] md:h-[175px] rounded-full bg-[#18151c] overflow-hidden">
                    <Image
                      src={step.icon}
                      alt=""
                      width={187}
                      height={190}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  {/* Glow ring on reveal */}
                  <motion.div
                    className="absolute inset-[-4px] rounded-full border-2 border-[#9940ec]/40"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: [0, 1, 0], scale: [0.9, 1.05, 1.1] } : {}}
                    transition={{ duration: 1, delay: 0.6 + index * 0.3 }}
                  />
                  {/* Number badge */}
                  <motion.div
                    className="absolute top-[14px] right-[2px] w-[30px] h-[30px] bg-white rounded-full flex items-center justify-center shadow-md"
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.7 + index * 0.3, type: 'spring', stiffness: 300 }}
                  >
                    <span className="font-poppins font-black text-[18px] text-black leading-none">
                      {step.number}
                    </span>
                  </motion.div>
                </motion.div>

                {/* Text */}
                <div className="text-center max-w-[240px]">
                  <p className="font-poppins font-semibold text-[18px] leading-[45px] text-white">
                    {step.title}
                  </p>
                  <p className="font-poppins text-[16px] text-[#bababa] leading-normal">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
