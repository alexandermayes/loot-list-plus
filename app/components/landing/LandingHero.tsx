'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { heroFadeIn, staggerContainer, scrollToSection } from '@/lib/animations'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export default function LandingHero() {
  return (
    <section id="hero" className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-background-elevated">
        <Image
          src="/landing-background.png"
          alt="Epic loot background"
          fill
          className="object-cover object-center"
          priority
          quality={100}
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Hero Content */}
      <motion.div
        className="relative z-20 min-h-screen flex items-center"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="max-w-2xl">
            {/* Icon */}
            <motion.div variants={heroFadeIn} className="mb-6">
              <Image
                src="/lootlist-icon.svg"
                alt="LootList+ Icon"
                width={40}
                height={53}
                className="w-10 h-auto"
              />
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={heroFadeIn}
              className="font-poppins font-bold text-[32px] md:text-[42px] lg:text-[52px] leading-[1.05] text-foreground mb-6"
            >
              Epic loot deserves an epic system.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={heroFadeIn}
              className="font-poppins text-base md:text-lg text-foreground-secondary mb-10 max-w-xl"
            >
              LootList+ is a transparent loot management system for WoW guilds.
              Fair distribution, attendance tracking, and complete visibility — all in one place.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={heroFadeIn} className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => scrollToSection('cta')}
                className="px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-poppins font-semibold text-base rounded-[52px] transition-all duration-200 active:scale-[0.98] shadow-lg hover:shadow-xl"
              >
                Get Started Free
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="px-8 py-4 bg-background-elevated/80 hover:bg-background-elevated text-foreground font-poppins font-medium text-base rounded-[52px] border border-border-strong transition-all duration-200 active:scale-[0.98] backdrop-blur-sm"
              >
                See Features
              </button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.button
          onClick={() => scrollToSection('features')}
          className="flex flex-col items-center gap-2 text-foreground-muted hover:text-foreground transition-colors"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-xs font-medium uppercase tracking-wider">Scroll</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={20} />
        </motion.button>
      </motion.div>
    </section>
  )
}
