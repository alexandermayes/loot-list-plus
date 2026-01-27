'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { scrollToSection } from '@/lib/animations'
import { createClient } from '@/utils/supabase/client'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleDiscordLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'identify email guilds guilds.members.read'
      }
    })
  }

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <button
            onClick={() => scrollToSection('hero')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/lootlist-icon.svg"
              alt="LootList+"
              width={28}
              height={36}
              className="h-7 w-auto"
            />
            <Image
              src="/logo.svg"
              alt="LootList+"
              width={100}
              height={16}
              className="h-4 w-auto hidden sm:block"
            />
          </button>

          {/* Nav Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('testimonials')}
              className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
            >
              Testimonials
            </button>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleDiscordLogin}
            className="inline-flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-accent hover:bg-accent/90 text-background font-poppins font-semibold text-sm rounded-full transition-all duration-200 active:scale-[0.98]"
          >
            <Image
              src="/discord-icon.svg"
              alt=""
              width={18}
              height={18}
              className="w-4 h-4 md:w-[18px] md:h-[18px] brightness-0"
            />
            <span className="hidden sm:inline">Get Started</span>
            <span className="sm:hidden">Start</span>
          </button>
        </nav>
      </div>
    </motion.header>
  )
}
