'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  CheckListIcon,
  Calendar03Icon,
  UserGroupIcon,
  GridTableIcon,
  LinkSquare02Icon,
  Layers01Icon
} from '@hugeicons/core-free-icons'
import Image from 'next/image'

const features = [
  {
    title: 'Loot priority system',
    description: '50-level ranking with color-coded brackets. Raiders prioritize gear from most to least desired.',
    icon: CheckListIcon,
    color: 'text-red-400'
  },
  {
    title: 'Attendance tracking',
    description: 'Credit scoring ensures fair distribution. Consistent raiders get prioritized loot.',
    icon: Calendar03Icon,
    color: 'text-green-400'
  },
  {
    title: 'Officer dashboard',
    description: 'Streamlined review and approval workflow. Approve, reject, or request revisions with one click.',
    icon: UserGroupIcon,
    color: 'text-blue-400'
  },
  {
    title: 'Master Sheet',
    description: 'Complete guild visibility. See who wants what and make informed allocation decisions.',
    icon: GridTableIcon,
    color: 'text-purple-400'
  },
  {
    title: 'Discord integration',
    description: 'One-click authentication. Your guild members sign in with their existing Discord accounts.',
    customIcon: '/icons/discord-white.svg',
    color: 'text-[#5865F2]'
  },
  {
    title: 'Multi-raid support',
    description: 'Manage BWL, AQ40, Naxx and beyond. Separate loot lists for each tier, all in one place.',
    icon: Layers01Icon,
    color: 'text-amber-400'
  }
]

function FeatureCard({ feature, index }: { feature: typeof features[0], index: number }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="group relative bg-background-elevated/50 backdrop-blur-sm border border-border hover:border-accent/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,128,0,0.1)]"
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="relative z-10">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl bg-background-inset border border-border flex items-center justify-center mb-4 ${feature.color}`}>
          {feature.customIcon ? (
            <Image src={feature.customIcon} alt="" width={24} height={24} className="w-6 h-6" />
          ) : (
            <HugeiconsIcon icon={feature.icon!} size={24} />
          )}
        </div>

        {/* Title */}
        <h3 className="font-poppins font-semibold text-lg text-foreground mb-2">
          {feature.title}
        </h3>

        {/* Description */}
        <p className="font-poppins text-sm text-foreground-secondary leading-relaxed">
          {feature.description}
        </p>
      </div>
    </motion.div>
  )
}

export default function LandingFeatures() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="features" className="relative py-32 md:py-40 bg-background">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/[0.02] to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
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
            Features
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[36px] text-foreground mb-4"
          >
            Everything your guild needs
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-poppins text-base text-foreground-secondary max-w-2xl mx-auto"
          >
            From loot submissions to officer approvals, LootList+ handles every step of fair loot distribution.
          </motion.p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
