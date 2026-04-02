'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import { heroFadeIn, staggerContainer, scaleUp, scrollToSection } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import ParallaxItem from './ParallaxItem'
import MagneticButton from './MagneticButton'
import CountUp from './CountUp'
import { updates } from '@/lib/updates-data'

// Get the latest feature from updates
function getLatestFeature() {
  for (const entry of updates) {
    const feature = entry.items.find(item => item.category === 'feature')
    if (feature) return feature.title
  }
  return 'Check out what\'s new in LootList+'
}

const APP_URL = 'https://www.lootlistplus.com'

export default function LandingHero() {
  const previewRef = useRef(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isPreviewInView = useInView(previewRef, { once: true, margin: '-100px' })
  const [stats, setStats] = useState<{ guilds: number; raiders: number; loot: number } | null>(null)

  // Dashboard zoom-out on scroll
  const dashboardRef = useRef(null)
  const { scrollYProgress: dashScroll } = useScroll({
    target: dashboardRef,
    offset: ['start end', 'end start'],
  })
  const dashboardScale = useTransform(dashScroll, [0, 0.15, 0.35, 0.55, 0.75, 1], [1.12, 1.08, 1.04, 1.01, 0.99, 0.97])

  useEffect(() => {
    fetch('/api/guild-count')
      .then(res => res.json())
      .then(data => {
        if (data.guilds) setStats(data)
      })
      .catch(() => {})
  }, [])

  return (
    <section id="hero" className="relative w-full bg-[#080808]">
      {/* Background gradient SVG */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/landing/bg/hero-bg-gradient.svg"
        alt=""
        className="absolute left-0 top-0 w-full h-[1675px] pointer-events-none"
        aria-hidden="true"
      />

      {/* Max-width wrapper for floating items so they don't drift too far on wide screens */}
      <div className="absolute inset-0 max-w-[1440px] mx-auto">
      {/* Floating decorative items with parallax + breathing glow + slide-in */}
      <ParallaxItem
        speed={-0.15}
        slideFrom="left"
        delay={0.6}
        className="absolute left-[-68px] top-[183px] w-[280px] h-[312px] hidden lg:block pointer-events-none breathing-glow z-30"
        style={{ '--glow-color': 'rgba(148,240,175,0.5)' } as React.CSSProperties}
        tooltip={{ name: "Corrupted Ashbringer", quality: "epic", type: "Two-Hand Sword", flavor: "Blade of the Scarlet Highlord." }}
      >
        <Image src="/images/landing/items/item-green-glow.png" alt="" fill className="object-contain" />
      </ParallaxItem>

      <ParallaxItem
        speed={-0.2}
        slideFrom="right"
        delay={0.8}
        className="absolute right-[-74px] top-[273px] w-[299px] h-[347px] hidden lg:block pointer-events-none breathing-glow z-30"
        style={{ '--glow-color': 'rgba(82,209,120,0.5)' } as React.CSSProperties}
        tooltip={{ name: "Arcanite Ripper", quality: "epic", type: "Two-Hand Axe", flavor: "Rocketh on." }}
      >
        <Image src="/images/landing/items/item-green-crystal.png" alt="" fill className="object-contain" style={{ transform: 'rotate(149deg) scaleY(-1)' }} />
      </ParallaxItem>

      {/* Cyan item */}
      <ParallaxItem
        speed={0.15}
        slideFrom="left"
        className="absolute left-[21px] bottom-[-200px] w-[240px] h-[389px] hidden lg:block pointer-events-none z-30 breathing-glow"
        style={{ transform: 'rotate(15deg)', '--glow-color': 'rgba(14,240,253,0.5)' } as React.CSSProperties}
        tooltip={{ name: "Spire of Frozen Reckoning", quality: "epic", type: "Staff", flavor: "Cold enough to crack a hearthstone." }}
      >
        <Image src="/images/landing/items/item-cyan-glow.png" alt="" fill className="object-contain" />
      </ParallaxItem>

      {/* Orange item */}
      <ParallaxItem
        speed={0.25}
        slideFrom="right"
        className="absolute right-[-40px] bottom-[-200px] w-[287px] h-[394px] hidden lg:block pointer-events-none z-30 breathing-glow"
        style={{ transform: 'scaleX(-1) rotate(45deg)', '--glow-color': 'rgba(223,96,19,0.5)' } as React.CSSProperties}
        tooltip={{ name: "Emberfang, Oath of the Pyreguard", quality: "epic", type: "One-Hand Sword", flavor: "Every swing leaves a scar on the air." }}
      >
        <Image src="/images/landing/items/item-orange-glow.png" alt="" fill className="object-contain" />
      </ParallaxItem>

      </div>{/* end max-width wrapper for floating items */}

      {/* Hero Content + Dashboard Preview */}
      <div className="relative z-20">
        {/* Hero text content */}
        <motion.div
          className="flex flex-col items-center pt-[100px] md:pt-[148px] px-6"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <div className="max-w-[900px] w-full flex flex-col items-center gap-6 md:gap-9">
            {/* NEW badge */}
            <motion.a
              href="/changelog"
              variants={heroFadeIn}
              className="flex items-center gap-2 bg-[#17151b] rounded-[60px] pl-1 pr-3 py-1 no-underline hover:bg-[#1f1d25] transition-colors"
            >
              <span className="flex items-center justify-center px-2 py-1 bg-[#9940ec] rounded-[60px] font-poppins font-semibold text-[10px] text-white">
                NEW
              </span>
              <span className="font-poppins text-[14px] text-white">
                Just shipped: {getLatestFeature()}
              </span>
              <Image src="/images/landing/icons/arrow-right-02.svg" alt="" width={16} height={16} />
            </motion.a>

            {/* Headline */}
            <motion.div variants={heroFadeIn} className="text-center w-full max-w-[696px]">
              <h1 className="font-poppins font-bold text-[40px] md:text-[56px] lg:text-[72px] leading-[0.92] text-white mb-6">
                <span className="font-wow text-shimmer-purple text-[48px] md:text-[64px] lg:text-[80px] leading-[0.82]">Epic loot</span>
                {' '}deserves an epic system.
              </h1>
              <p className="font-poppins font-medium text-[16px] text-[#bababa] leading-normal">
                LootList+ is a transparent loot management system for WoW guilds. Includes loot submissions, attendance, tracking, and more!
              </p>
            </motion.div>

            {/* CTA Buttons - Magnetic */}
            <motion.div variants={heroFadeIn} className="flex items-center gap-[18px]">
              <MagneticButton
                as="button"
                onClick={() => {
                  trackClientEvent('landing_nav_clicked', { target: 'features', source: 'hero' })
                  scrollToSection('features')
                }}
                className="flex items-center justify-center px-4 py-3 rounded-[60px] bg-[#121218] border border-[#383838] font-poppins font-semibold text-[16px] text-white cursor-pointer hover:bg-[#1a1a22] transition-colors"
              >
                See features
              </MagneticButton>
              <MagneticButton
                as="a"
                href={APP_URL}
                onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'hero_start_free' })}
                className="flex items-center justify-center px-4 py-3 rounded-[60px] bg-white font-poppins font-semibold text-[16px] text-black no-underline hover:bg-white/90 transition-colors"
              >
                Start for free
              </MagneticButton>
            </motion.div>
          </div>
        </motion.div>

        {/* Dashboard Preview with zoom-out on scroll */}
        <div ref={previewRef} className="max-w-[1165px] mx-auto px-6 md:px-12 mt-12 md:mt-16">
          <motion.div
            ref={dashboardRef}
            initial="hidden"
            animate={isPreviewInView ? 'visible' : 'hidden'}
            variants={scaleUp}
            style={{ scale: dashboardScale }}
          >
            <div className="relative rounded-[16px] border border-[#383838] shadow-[0px_-4px_40px_0px_rgba(255,255,255,0.05)] overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="w-full h-auto"
                poster="/images/landing/dashboard-preview.png"
                onCanPlay={() => videoRef.current?.play().catch(() => {})}
              >
                <source src="/images/landing/hero-demo.mp4" type="video/mp4" />
              </video>
            </div>
          </motion.div>

          {/* Social proof counter with count-up */}
          <motion.p
            className="text-center mt-16 md:mt-20 font-poppins font-medium text-[16px] md:text-[20px] text-white pb-20 md:pb-32"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-[#ff6e08]">
              {stats ? <CountUp end={stats.guilds} suffix="+ guilds" /> : '...'}
            </span>
            {', '}
            <span className="text-[#ff6e08]">
              {stats ? <CountUp end={stats.raiders} duration={2500} suffix="+ raiders" /> : '...'}
            </span>
            {', and '}
            <span className="text-[#ff6e08]">
              {stats ? <CountUp end={stats.loot} duration={3000} suffix="+ items distributed" /> : '...'}
            </span>
            {' '}through LootList+
          </motion.p>
        </div>
      </div>
    </section>
  )
}
