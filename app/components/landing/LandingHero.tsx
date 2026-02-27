'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { heroFadeIn, staggerContainer, scrollToSection } from '@/lib/animations'
import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/components/ui/button'
import { trackClientEvent } from '@/utils/analytics/client'

const APP_URL = 'https://www.lootlistplus.com'

export default function LandingHero() {

  return (
    <section id="hero" className="relative min-h-screen w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 bg-background-elevated">
        <picture>
          <source
            type="image/webp"
            srcSet="/images/landing/landing-background-640w.webp 640w, /images/landing/landing-background-1024w.webp 1024w, /images/landing/landing-background-1920w.webp 1920w, /images/landing/landing-background-2560w.webp 2560w"
            sizes="100vw"
          />
          <Image
            src="/images/landing/landing-background-2560w.webp"
            alt="Epic loot background"
            fill
            className="object-cover object-center"
            priority
            quality={82}
          />
        </picture>
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      </div>

      {/* Hero Content */}
      <motion.div
        className="relative z-20 min-h-screen flex items-center"
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            {/* Icon */}
            <motion.div variants={heroFadeIn} className="mb-6">
              <Image
                src="/lootlist-icon.svg"
                alt="LootList+ Icon"
                width={48}
                height={64}
                className="w-12 h-auto"
              />
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={heroFadeIn}
              className="font-poppins font-bold text-[32px] md:text-[42px] lg:text-[56px] leading-[1.05] text-foreground mb-6"
            >
              Epic loot deserves an epic system.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={heroFadeIn}
              className="font-poppins text-base md:text-lg text-foreground-secondary mb-10 max-w-2xl"
            >
              LootList+ is a transparent loot management system for WoW guilds.
              Fair distribution, attendance tracking and complete visibility, all in one place.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={heroFadeIn} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                size="lg"
                asChild
                className="font-poppins font-semibold shadow-lg hover:shadow-xl"
              >
                <a href={APP_URL} onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'hero_start_free' })}>Start for free</a>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  trackClientEvent('landing_nav_clicked', { target: 'features', source: 'hero' })
                  scrollToSection('features')
                }}
                className="font-poppins font-medium bg-background-elevated/80 hover:bg-background-elevated backdrop-blur-sm"
              >
                See features
              </Button>
            </motion.div>

            {/* Privacy note */}
            <motion.p variants={heroFadeIn} className="mt-4 text-xs text-foreground-muted">
              Sign in with Discord. We only use it for identity, email is optional.
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 inset-x-0 flex justify-center z-20"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Button
            variant="ghost"
            onClick={() => {
              trackClientEvent('landing_nav_clicked', { target: 'features', source: 'hero_scroll' })
              scrollToSection('features')
            }}
            className="flex flex-col items-center gap-2 h-auto p-2 text-foreground-muted hover:text-foreground hover:bg-transparent"
          >
            <span className="text-xs font-medium uppercase tracking-wider">Scroll</span>
            <HugeiconsIcon icon={ArrowDown01Icon} size={20} />
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
