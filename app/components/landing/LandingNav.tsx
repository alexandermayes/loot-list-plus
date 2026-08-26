'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { scrollToSection } from '@/lib/animations'
import { trackClientEvent, trackMarketingPageView, trackMarketingCta } from '@/utils/analytics/client'

const APP_URL = 'https://www.lootlistplus.com'

function navigateToSection(sectionId: string) {
  const el = document.getElementById(sectionId)
  if (el) {
    scrollToSection(sectionId)
  } else {
    window.location.href = `/#${sectionId}`
  }
}

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  // LandingNav is on every marketing page, so it owns the standardized
  // acquisition page-view event and first-touch attribution.
  useEffect(() => {
    trackMarketingPageView()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080808]/80 backdrop-blur-xl border-b border-[#383838]/50 shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 lg:px-[120px] py-4">
        <nav className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigateToSection('hero')}
            className="p-0 h-auto bg-transparent border-none cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/landing/logo-landing.svg"
              alt="LootList+"
              width={100}
              height={16}
              className="h-4 w-auto"
            />
          </button>

          {/* Nav Links + Buttons */}
          <div className="hidden md:flex items-center gap-6">
            {/* Links */}
            <div className="flex items-center gap-10 font-poppins font-semibold text-[14px] text-white">
              <button
                onClick={() => {
                  trackClientEvent('landing_nav_clicked', { target: 'features', source: 'nav' })
                  navigateToSection('features')
                }}
                className="bg-transparent border-none cursor-pointer text-white hover:text-[#9940ec] transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => {
                  trackClientEvent('landing_nav_clicked', { target: 'how-it-works', source: 'nav' })
                  navigateToSection('how-it-works')
                }}
                className="bg-transparent border-none cursor-pointer text-white hover:text-[#9940ec] transition-colors"
              >
                How it works
              </button>
              <a
                href="/pricing"
                onClick={() => trackClientEvent('landing_nav_clicked', { target: 'pricing', source: 'nav' })}
                className="text-white hover:text-[#9940ec] transition-colors no-underline"
              >
                Pricing
              </a>
              <a
                href="/compare"
                onClick={() => trackClientEvent('landing_nav_clicked', { target: 'compare', source: 'nav' })}
                className="text-white hover:text-[#9940ec] transition-colors no-underline"
              >
                Compare
              </a>
              <a
                href="/blog"
                onClick={() => trackClientEvent('landing_nav_clicked', { target: 'blog', source: 'nav' })}
                className="text-white hover:text-[#9940ec] transition-colors no-underline"
              >
                Blog
              </a>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-5">
              <a
                href={APP_URL}
                onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'nav_login' })}
                className="flex items-center justify-center h-9 px-4 py-2 rounded-[60px] bg-[#121218] border border-[#383838] font-poppins font-semibold text-[14px] text-white no-underline hover:bg-[#1a1a22] transition-colors"
              >
                Log in
              </a>
              <a
                href={APP_URL}
                onClick={() => {
                  trackClientEvent('landing_cta_clicked', { cta: 'nav_start_free' })
                  trackMarketingCta({ cta_text: 'Start for free', cta_placement: 'nav', destination: APP_URL })
                }}
                className="flex items-center justify-center h-9 px-4 py-2 rounded-[60px] bg-white font-poppins font-semibold text-[14px] text-black no-underline hover:bg-white/90 transition-colors"
              >
                Start for free
              </a>
            </div>
          </div>

          {/* Mobile CTA */}
          <a
            href={APP_URL}
            className="md:hidden flex items-center justify-center h-9 px-4 py-2 rounded-[60px] bg-white font-poppins font-semibold text-[14px] text-black no-underline"
          >
            Start for free
          </a>
        </nav>
      </div>
    </header>
  )
}
