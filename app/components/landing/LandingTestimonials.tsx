'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import Image from 'next/image'

const testimonials = [
  {
    quote: "Finally, a loot system that doesn't cause drama. Our guild went from weekly arguments to zero disputes since switching.",
    author: "Mythic Raid Leader",
    guild: "Echoes of Eternity",
    avatar: "/testimonials/avatar-1.png",
    fallbackColor: "bg-red-500"
  },
  {
    quote: "The attendance tracking alone saved us hours of spreadsheet work. Now our officers can focus on actually raiding.",
    author: "Guild Master",
    guild: "Vanguard",
    avatar: "/testimonials/avatar-2.png",
    fallbackColor: "bg-blue-500"
  },
  {
    quote: "Transparent, fair, and stupidly easy to use. Every guild should be using this.",
    author: "Loot Council Officer",
    guild: "Silent Oath",
    avatar: "/testimonials/avatar-3.png",
    fallbackColor: "bg-purple-500"
  }
]

const stats = [
  { value: '500+', label: 'Active guilds' },
  { value: '25K+', label: 'Raiders' },
  { value: '100K+', label: 'Items distributed' },
  { value: '99.9%', label: 'Uptime' }
]

function TestimonialCard({ testimonial, index }: { testimonial: typeof testimonials[0], index: number }) {
  return (
    <motion.div
      variants={fadeInUp}
      className="relative bg-background-elevated/30 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8"
    >
      {/* Quote mark */}
      <div className="absolute top-4 right-6 text-6xl text-accent/10 font-serif leading-none">
        "
      </div>

      {/* Quote */}
      <p className="font-poppins text-base md:text-lg text-foreground leading-relaxed mb-6 relative z-10">
        "{testimonial.quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${testimonial.fallbackColor} flex items-center justify-center text-white font-semibold text-sm`}>
          {testimonial.author.charAt(0)}
        </div>
        <div>
          <p className="font-poppins font-medium text-sm text-foreground">
            {testimonial.author}
          </p>
          <p className="font-poppins text-xs text-foreground-muted">
            {testimonial.guild}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function LandingTestimonials() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="testimonials" className="relative py-32 md:py-40 bg-background-subtle overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        {/* Stats Row */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-20 md:mb-28"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="text-center"
            >
              <p className="font-poppins font-bold text-3xl md:text-4xl lg:text-5xl text-accent mb-1">
                {stat.value}
              </p>
              <p className="font-poppins text-sm text-foreground-secondary">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-1.5 bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider rounded-full mb-4"
          >
            Testimonials
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[36px] text-foreground mb-4"
          >
            Trusted by guilds worldwide
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-poppins text-base text-foreground-secondary max-w-2xl mx-auto"
          >
            See what raid leaders and guild masters are saying about LootList+.
          </motion.p>
        </motion.div>

        {/* Testimonial Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={testimonial.guild} testimonial={testimonial} index={index} />
          ))}
        </motion.div>

        {/* Game/Platform Icons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-16 md:mt-20 text-center"
        >
          <p className="text-xs text-foreground-muted uppercase tracking-wider mb-6">
            Built for World of Warcraft guilds
          </p>
          <div className="flex items-center justify-center gap-8 opacity-40">
            <div className="w-12 h-12 bg-foreground/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">⚔️</span>
            </div>
            <div className="w-12 h-12 bg-foreground/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🛡️</span>
            </div>
            <div className="w-12 h-12 bg-foreground/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🗡️</span>
            </div>
            <div className="w-12 h-12 bg-foreground/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏰</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
