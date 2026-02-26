'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, scaleUp, staggerContainer } from '@/lib/animations'

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

        {/* Dashboard + Mobile Preview */}
        <div className="relative">
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

          {/* Mobile phone mockup */}
          <motion.div
            className="absolute -bottom-8 -right-4 md:-bottom-12 md:-right-8 w-[120px] md:w-[200px] lg:w-[240px] z-20"
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            {/* Phone frame */}
            <div className="relative bg-[#1a1a1a] rounded-[20px] md:rounded-[28px] border-2 border-border shadow-2xl shadow-black/50 overflow-hidden">
              {/* Dynamic Island */}
              <div className="relative h-8 md:h-12 bg-[#1a1a1a] flex items-end justify-center pb-1 md:pb-1.5">
                <div className="w-[60px] md:w-[90px] h-[14px] md:h-[22px] bg-black rounded-full" />
              </div>

              {/* iOS status bar */}
              <div className="flex items-center justify-between px-4 md:px-6 py-0.5 md:py-1 bg-[#1a1a1a]">
                {/* Time */}
                <span className="text-[8px] md:text-[11px] font-semibold text-white">9:41</span>
                {/* Right icons: signal, wifi, battery */}
                <div className="flex items-center gap-0.5 md:gap-1">
                  {/* Signal bars */}
                  <svg className="w-2.5 h-2 md:w-4 md:h-3" viewBox="0 0 17 11" fill="white">
                    <rect x="0" y="7" width="3" height="4" rx="0.5" />
                    <rect x="4.5" y="4.5" width="3" height="6.5" rx="0.5" />
                    <rect x="9" y="2" width="3" height="9" rx="0.5" />
                    <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
                  </svg>
                  {/* WiFi */}
                  <svg className="w-2.5 h-2 md:w-4 md:h-3" viewBox="0 0 16 12" fill="white">
                    <path d="M8 11.5a1.25 1.25 0 100-2.5 1.25 1.25 0 000 2.5z" />
                    <path d="M4.7 8.3a4.5 4.5 0 016.6 0" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    <path d="M2.2 5.8a8 8 0 0111.6 0" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  </svg>
                  {/* Battery */}
                  <svg className="w-4 h-2 md:w-6 md:h-3" viewBox="0 0 27 13" fill="none">
                    <rect x="0.5" y="0.5" width="23" height="12" rx="2.5" stroke="white" strokeOpacity="0.35" />
                    <rect x="2" y="2" width="20" height="9" rx="1.5" fill="white" />
                    <path d="M25 4.5v4a2 2 0 000-4z" fill="white" fillOpacity="0.4" />
                  </svg>
                </div>
              </div>

              {/* Screenshot (clipped to hide original status bar) */}
              <div className="overflow-hidden">
                <Image
                  src="/images/landing/mobile-preview.jpg"
                  alt="LootList+ mobile view showing character overview and score breakdown"
                  width={390}
                  height={844}
                  className="w-full h-auto -mt-[8%]"
                />
              </div>

              {/* Home indicator */}
              <div className="h-4 md:h-5 bg-[#1a1a1a] flex items-center justify-center">
                <div className="w-8 md:w-10 h-1 bg-white/20 rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
