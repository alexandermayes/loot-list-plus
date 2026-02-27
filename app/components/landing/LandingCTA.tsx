'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { trackClientEvent } from '@/utils/analytics/client'

const APP_URL = 'https://www.lootlistplus.com'

export default function LandingCTA() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'cta' })
  }, [isInView])

  return (
    <section id="cta" className="relative py-32 md:py-40 overflow-hidden">
      {/* Background with image */}
      <div className="absolute inset-0">
        <picture>
          <source
            type="image/webp"
            srcSet="/images/landing/landing-background-640w.webp 640w, /images/landing/landing-background-1024w.webp 1024w, /images/landing/landing-background-1920w.webp 1920w, /images/landing/landing-background-2560w.webp 2560w"
            sizes="100vw"
          />
          <Image
            src="/images/landing/landing-background-2560w.webp"
            alt=""
            fill
            className="object-cover object-center opacity-30"
            quality={82}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/80" />
      </div>

      {/* Orange glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent/10 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 lg:px-20">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center"
        >
          {/* Icon */}
          <motion.div variants={fadeInUp} className="flex justify-center mb-6">
            <Image
              src="/lootlist-icon.svg"
              alt="LootList+ Icon"
              width={48}
              height={64}
              className="w-12 h-auto"
            />
          </motion.div>

          {/* Headline */}
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[42px] leading-tight text-foreground mb-4"
          >
            Ready to modernize your loot system?
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="font-poppins text-base md:text-lg text-foreground-secondary mb-10 max-w-xl mx-auto"
          >
            Join guilds who have already made the switch. Set up in minutes, not hours.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              size="lg"
              asChild
              className="gap-3 font-poppins font-semibold shadow-lg hover:shadow-xl"
            >
              <a href={APP_URL} onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'bottom_get_started' })}>
                <Image
                  src="/discord-icon.svg"
                  alt="Discord"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                Get started free
              </a>
            </Button>
          </motion.div>

          {/* Secondary link */}
          <motion.p variants={fadeInUp} className="mt-6 text-sm text-foreground-muted">
            Already have an account?{' '}
            <a href={APP_URL} onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'bottom_login' })} className="text-foreground hover:text-accent transition-colors">
              Log in
            </a>
          </motion.p>

          {/* Terms */}
          <motion.p variants={fadeInUp} className="mt-8 text-xs text-foreground-muted max-w-md mx-auto">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="/privacy" className="text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors">
              Privacy Policy
            </a>.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
