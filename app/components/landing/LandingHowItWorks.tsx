'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainerSlow } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  LinkSquare02Icon,
  CheckListIcon,
  Award01Icon
} from '@hugeicons/core-free-icons'

const steps = [
  {
    number: '01',
    title: 'Connect your guild',
    description: 'Sign in with Discord and link your WoW guild. Your members can join instantly with their existing Discord accounts.',
    icon: LinkSquare02Icon,
    color: 'from-blue-500 to-blue-600'
  },
  {
    number: '02',
    title: 'Submit Loot Lists',
    description: 'Raiders rank their most wanted items using our 50-level priority system. Color-coded brackets make organization easy.',
    icon: CheckListIcon,
    color: 'from-accent to-orange-600'
  },
  {
    number: '03',
    title: 'Distribute fairly',
    description: 'Officers review submissions and allocate loot using attendance-weighted priority scores. Transparent and unbiased.',
    icon: Award01Icon,
    color: 'from-green-500 to-green-600'
  }
]

function StepCard({ step, index, isLast }: { step: typeof steps[0], index: number, isLast: boolean }) {
  return (
    <motion.div variants={fadeInUp} className="relative">
      {/* Connecting line (hidden on mobile, shown on desktop) */}
      {!isLast && (
        <div className="hidden lg:block absolute top-16 left-[calc(100%+1rem)] w-[calc(100%-2rem)] h-[2px]">
          <motion.div
            className="h-full bg-gradient-to-r from-border-strong via-accent/30 to-border-strong"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5 + index * 0.2 }}
            style={{ transformOrigin: 'left' }}
          />
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        {/* Step number badge */}
        <div className={`relative w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}>
          <HugeiconsIcon icon={step.icon} size={32} className="text-white" />
          {/* Number badge */}
          <span className="absolute -top-2 -right-2 w-8 h-8 bg-background-elevated border-2 border-border-strong rounded-full flex items-center justify-center text-xs font-bold text-foreground">
            {step.number}
          </span>
        </div>

        {/* Content */}
        <h3 className="font-poppins font-semibold text-xl text-foreground mb-3">
          {step.title}
        </h3>
        <p className="font-poppins text-sm text-foreground-secondary leading-relaxed max-w-xs">
          {step.description}
        </p>
      </div>
    </motion.div>
  )
}

export default function LandingHowItWorks() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'how_it_works' })
  }, [isInView])

  return (
    <section id="how-it-works" className="relative py-32 md:py-40 bg-background-subtle">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-50">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainerSlow}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-1.5 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider rounded-full mb-4"
          >
            How it works
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[36px] text-foreground mb-4"
          >
            Three simple steps
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-poppins text-base text-foreground-secondary max-w-2xl mx-auto"
          >
            Get your guild set up and distributing loot fairly in minutes.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainerSlow}
          className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8"
        >
          {steps.map((step, index) => (
            <StepCard
              key={step.number}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
