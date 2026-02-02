'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface LandingCTAProps {
  onLogin?: () => void
}

export default function LandingCTA({ onLogin }: LandingCTAProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const supabase = createClient()

  const handleDiscordLogin = async () => {
    if (onLogin) {
      onLogin()
    } else {
      await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'identify guilds'
        }
      })
    }
  }

  return (
    <section id="cta" className="relative py-32 md:py-40 overflow-hidden">
      {/* Background with image */}
      <div className="absolute inset-0">
        <Image
          src="/landing-background.png"
          alt=""
          fill
          className="object-cover object-center opacity-30"
          quality={80}
        />
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
              onClick={handleDiscordLogin}
              className="gap-3 font-poppins font-semibold shadow-lg hover:shadow-xl"
            >
              <Image
                src="/discord-icon.svg"
                alt="Discord"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              Continue with Discord
            </Button>
          </motion.div>

          {/* Secondary link */}
          <motion.p variants={fadeInUp} className="mt-6 text-sm text-foreground-muted">
            Already have an account?{' '}
            <Button
              variant="link"
              onClick={handleDiscordLogin}
              className="text-foreground hover:text-accent"
            >
              Log in
            </Button>
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
