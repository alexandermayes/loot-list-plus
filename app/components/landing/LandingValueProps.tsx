'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, slideInLeft, slideInRight, staggerContainer } from '@/lib/animations'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  EyeIcon,
  BalanceScaleIcon,
  DashboardSpeed01Icon,
  GridTableIcon
} from '@hugeicons/core-free-icons'

const valueProps = [
  {
    title: 'Complete Transparency',
    description: 'Every loot decision is visible to everyone. See who submitted what, attendance records, and exactly why loot was allocated the way it was. No more "loot council drama" — just data.',
    icon: EyeIcon,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    glowColor: 'shadow-blue-500/20'
  },
  {
    title: 'Built-in Fairness',
    description: 'Attendance-based scoring means consistent raiders get priority. The system tracks who shows up, on time, week after week — rewarding dedication automatically.',
    icon: BalanceScaleIcon,
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    glowColor: 'shadow-green-500/20'
  },
  {
    title: 'Save Hours Every Week',
    description: 'Auto-save, real-time validation, and streamlined workflows eliminate manual tracking. What used to take hours of spreadsheet work now happens in minutes.',
    icon: DashboardSpeed01Icon,
    color: 'bg-accent/10 text-accent border-accent/20',
    glowColor: 'shadow-accent/20'
  },
  {
    title: 'Replace the Chaos',
    description: 'No more Discord messages, Google Sheets, or manual lists. Everything your guild needs is in one organized, searchable, always-up-to-date system.',
    icon: GridTableIcon,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    glowColor: 'shadow-purple-500/20'
  }
]

function ValuePropCard({ prop, index }: { prop: typeof valueProps[0], index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const isEven = index % 2 === 0

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={isEven ? slideInLeft : slideInRight}
      className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 md:gap-12`}
    >
      {/* Icon side */}
      <div className="flex-shrink-0">
        <div className={`w-24 h-24 md:w-32 md:h-32 rounded-2xl ${prop.color} border flex items-center justify-center shadow-lg ${prop.glowColor}`}>
          <HugeiconsIcon icon={prop.icon} size={48} className="md:w-14 md:h-14" />
        </div>
      </div>

      {/* Content side */}
      <div className={`flex-1 ${isEven ? 'md:text-left' : 'md:text-right'} text-center`}>
        <h3 className="font-poppins font-semibold text-xl md:text-2xl text-foreground mb-3">
          {prop.title}
        </h3>
        <p className="font-poppins text-sm md:text-base text-foreground-secondary leading-relaxed max-w-lg mx-auto md:mx-0">
          {prop.description}
        </p>
      </div>
    </motion.div>
  )
}

export default function LandingValueProps() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="value-props" className="relative py-24 md:py-32 bg-background-subtle">
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-1.5 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider rounded-full mb-4"
          >
            Why LootList+
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[36px] text-foreground mb-4"
          >
            Built different
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-poppins text-base text-foreground-secondary max-w-2xl mx-auto"
          >
            We rebuilt loot management from the ground up with the features guilds actually need.
          </motion.p>
        </motion.div>

        {/* Value Props */}
        <div className="space-y-16 md:space-y-20">
          {valueProps.map((prop, index) => (
            <ValuePropCard key={prop.title} prop={prop} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
