'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, scaleUp, staggerContainer } from '@/lib/animations'

// Stylized mockup representing the dashboard
function DashboardMockup() {
  return (
    <div className="relative w-full aspect-[16/10] bg-background-elevated rounded-2xl border border-border overflow-hidden shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background-inset border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 bg-background rounded-lg text-xs text-foreground-muted">
            lootlist.gg/dashboard
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex h-[calc(100%-44px)]">
        {/* Sidebar mockup */}
        <div className="w-16 md:w-20 bg-background-subtle border-r border-border p-2 md:p-3 flex flex-col gap-2">
          <div className="w-full aspect-square bg-accent/20 rounded-lg" />
          <div className="w-full aspect-square bg-background-inset rounded-lg" />
          <div className="w-full aspect-square bg-background-inset rounded-lg" />
          <div className="w-full aspect-square bg-background-inset rounded-lg" />
          <div className="flex-1" />
          <div className="w-full aspect-square bg-background-inset rounded-lg" />
        </div>

        {/* Main area */}
        <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-6 w-32 md:w-48 bg-foreground/10 rounded-lg mb-2" />
              <div className="h-4 w-24 md:w-32 bg-foreground/5 rounded" />
            </div>
            <div className="h-10 w-24 md:w-32 bg-accent/20 rounded-full" />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="bg-background-inset rounded-xl p-3 md:p-4">
              <div className="h-3 w-16 bg-foreground/5 rounded mb-2" />
              <div className="h-6 w-12 bg-green-500/30 rounded" />
            </div>
            <div className="bg-background-inset rounded-xl p-3 md:p-4">
              <div className="h-3 w-16 bg-foreground/5 rounded mb-2" />
              <div className="h-6 w-8 bg-accent/30 rounded" />
            </div>
            <div className="bg-background-inset rounded-xl p-3 md:p-4">
              <div className="h-3 w-16 bg-foreground/5 rounded mb-2" />
              <div className="h-6 w-14 bg-blue-500/30 rounded" />
            </div>
          </div>

          {/* Table mockup */}
          <div className="bg-background-inset rounded-xl p-3 md:p-4 flex-1">
            <div className="h-3 w-24 bg-foreground/5 rounded mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg" />
                  <div className="flex-1 h-3 bg-foreground/5 rounded" />
                  <div className="w-16 h-6 bg-green-500/20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating highlight callouts */}
      <motion.div
        className="absolute top-24 right-4 md:right-8"
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <div className="bg-background border border-accent/30 rounded-lg px-3 py-2 shadow-lg shadow-accent/10">
          <div className="text-[10px] text-accent font-semibold uppercase tracking-wider">Priority queue</div>
          <div className="text-xs text-foreground-secondary">Real-time rankings</div>
        </div>
      </motion.div>

      <motion.div
        className="absolute bottom-20 left-24 md:left-32"
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <div className="bg-background border border-green-500/30 rounded-lg px-3 py-2 shadow-lg shadow-green-500/10">
          <div className="text-[10px] text-green-400 font-semibold uppercase tracking-wider">Attendance score</div>
          <div className="text-xs text-foreground-secondary">94% this month</div>
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

        {/* Mockup */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={scaleUp}
        >
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 rounded-3xl blur-xl" />
            <DashboardMockup />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
