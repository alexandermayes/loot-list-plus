'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, scaleUp, staggerContainer } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'

function DashboardPreview() {
  return (
    <div className="relative w-full bg-background-elevated rounded-2xl border border-border overflow-hidden shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background-inset border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 bg-background rounded-lg text-xs text-foreground-muted">
            lootlistplus.com
          </div>
        </div>
      </div>

      {/* Dashboard screenshot */}
      <Image
        src="/images/landing/dashboard-preview.png"
        alt="LootList+ dashboard showing character overview, score breakdown, attendance tracking, priority queue and recently received loot"
        width={1456}
        height={816}
        className="w-full h-auto"
        priority
      />

      {/* Feature tip overlays */}

      {/* Score breakdown - top left card area */}
      <motion.div
        className="absolute top-[39%] left-[15%] hidden md:block"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-accent/30 rounded-lg px-3 py-2 shadow-lg shadow-accent/10">
          <div className="text-[10px] text-accent font-semibold uppercase tracking-wider">Loot Score</div>
          <div className="text-xs text-foreground-secondary">Attendance, role and item ranking</div>
        </div>
      </motion.div>

      {/* Attendance - middle card area */}
      <motion.div
        className="absolute top-[32%] right-[26%] hidden md:block"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-2 shadow-lg shadow-green-500/10">
          <div className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Attendance</div>
          <div className="text-xs text-foreground-secondary">Automatic raid tracking</div>
        </div>
      </motion.div>

      {/* Next in line - bottom left */}
      <motion.div
        className="absolute bottom-[22%] left-[15%] hidden md:block"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-purple-500/30 rounded-lg px-3 py-2 shadow-lg shadow-purple-500/10">
          <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Priority queue</div>
          <div className="text-xs text-foreground-secondary">Real-time rankings per item</div>
        </div>
      </motion.div>

      {/* Recently received - bottom right */}
      <motion.div
        className="absolute bottom-[12%] right-[2%] hidden md:block"
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-green-500/30 rounded-lg px-3 py-2 shadow-lg shadow-green-500/10">
          <div className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Loot history</div>
          <div className="text-xs text-foreground-secondary">Track every drop</div>
        </div>
      </motion.div>
    </div>
  )
}

export default function LandingAppPreview() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'preview' })
  }, [isInView])

  return (
    <section id="preview" className="relative py-32 md:py-40 bg-background overflow-hidden">
      {/* Orange glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-1.5 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider rounded-full mb-4"
          >
            App preview
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[36px] text-foreground mb-4"
          >
            Designed for raiders, by raiders
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-poppins text-base text-foreground-secondary max-w-2xl mx-auto"
          >
            A clean, intuitive interface that makes loot management straightforward.
          </motion.p>
        </motion.div>

        {/* Dashboard Preview */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={scaleUp}
        >
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-3xl blur-xl" />
            <DashboardPreview />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
