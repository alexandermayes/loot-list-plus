'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { scrollToSection } from '@/lib/animations'
import { Button } from '@/components/ui/button'
import { trackClientEvent } from '@/utils/analytics/client'

const APP_URL = 'https://www.lootlistplus.com'

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
          <Button
            variant="ghost"
            onClick={() => scrollToSection('hero')}
            className="p-0 h-auto hover:bg-transparent hover:opacity-80"
          >
            <Image
              src="/logo.svg"
              alt="LootList+"
              width={100}
              height={16}
              className="h-4 w-auto"
            />
          </Button>

          {/* Nav Links - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-10">
            <Button
              variant="ghost"
              onClick={() => {
                trackClientEvent('landing_nav_clicked', { target: 'features', source: 'nav' })
                scrollToSection('features')
              }}
              className="p-0 h-auto text-base font-medium text-foreground hover:text-accent hover:bg-transparent"
            >
              Features
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                trackClientEvent('landing_nav_clicked', { target: 'how-it-works', source: 'nav' })
                scrollToSection('how-it-works')
              }}
              className="p-0 h-auto text-base font-medium text-foreground hover:text-accent hover:bg-transparent"
            >
              How it works
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                trackClientEvent('landing_nav_clicked', { target: 'testimonials', source: 'nav' })
                scrollToSection('testimonials')
              }}
              className="p-0 h-auto text-base font-medium text-foreground hover:text-accent hover:bg-transparent"
            >
              Testimonials
            </Button>
            <a
              href="/blog"
              onClick={() => trackClientEvent('landing_nav_clicked', { target: 'blog', source: 'nav' })}
              className="text-base font-medium text-foreground hover:text-accent transition-colors"
            >
              Blog
            </a>
          </div>

          {/* CTA Button */}
          <Button
            variant="primary"
            size="sm"
            asChild
            className="bg-white hover:bg-white/90 text-background font-poppins font-semibold shadow-md"
          >
            <a href={APP_URL} onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'nav_login' })}>
              <Image
                src="/discord-icon.svg"
                alt=""
                width={18}
                height={18}
                className="w-4 h-4 md:w-[18px] md:h-[18px] brightness-0"
              />
              <span>Log in</span>
            </a>
          </Button>
        </nav>
      </div>
    </motion.header>
  )
}
