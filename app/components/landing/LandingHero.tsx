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
      {/* 1. Thunderfury - top left, angled with tip pointing up-right */}
      <ParallaxItem
        speed={-0.15}
        slideFrom="left"
        delay={0.6}
        depth={1.2}
        float={{ distance: 14, duration: 7, delay: 0 }}
        className="absolute left-[-200px] top-[160px] w-[580px] h-[530px] hidden lg:block pointer-events-none breathing-glow z-30"
        style={{ '--glow-color': 'rgba(24,110,238,0.25)', '--glow-duration': '4.5s', '--glow-delay': '0s' } as React.CSSProperties}
        tooltip={{ name: "Thunderfury, Blessed Blade of the Windseeker", quality: "legendary", type: "One-Hand Sword", flavor: "Forged from the shattered remnants of Thunderaan's prison." }}
      >
        <Image src="/images/landing/items/thunderfury.png" alt="" fill className="object-contain" style={{ transform: 'rotate(158deg) scaleY(-1)' }} />
      </ParallaxItem>

      {/* 2. Hand of Rag - top right */}
      <ParallaxItem
        speed={-0.2}
        slideFrom="right"
        delay={0.8}
        depth={1.5}
        float={{ distance: 10, duration: 5.5, delay: 1.2 }}
        className="absolute right-[-250px] top-[190px] w-[550px] h-[500px] hidden lg:block pointer-events-none breathing-glow z-30"
        style={{ '--glow-color': 'rgba(241,131,24,0.5)', '--glow-duration': '3.8s', '--glow-delay': '1s' } as React.CSSProperties}
        tooltip={{ name: "Sulfuras, Hand of Ragnaros", quality: "legendary", type: "Two-Hand Mace", flavor: "Too hot to handle." }}
      >
        <Image src="/images/landing/items/hand-of-rag.png" alt="" fill className="object-contain" style={{ transform: 'rotate(50deg)' }} />
      </ParallaxItem>

      {/* 3. Warglaives - bottom left */}
      <ParallaxItem
        speed={0.15}
        slideFrom="left"
        depth={0.8}
        float={{ distance: 16, duration: 8, delay: 2.5 }}
        className="absolute left-[-280px] bottom-[-250px] w-[641px] h-[616px] hidden lg:block pointer-events-none z-30 breathing-glow"
        style={{ '--glow-color': 'rgba(141,244,31,0.25)', '--glow-duration': '5s', '--glow-delay': '0.5s' } as React.CSSProperties}
        tooltip={{ name: "Warglaive of Azzinoth", quality: "legendary", type: "One-Hand Sword", flavor: "Wielded by the Betrayer himself." }}
      >
        <Image src="/images/landing/items/warglaives.png" alt="" fill className="object-contain" style={{ transform: 'rotate(41deg)' }} />
      </ParallaxItem>

      {/* 4. Cursed Vision of Sargeras - bottom right */}
      <ParallaxItem
        speed={0.25}
        slideFrom="right"
        depth={2}
        float={{ distance: 8, duration: 4.5, delay: 0.8 }}
        className="absolute right-[-20px] bottom-[-100px] w-[208px] h-[199px] hidden lg:block pointer-events-none z-30 breathing-glow"
        style={{ '--glow-color': 'rgba(208,37,19,0.25)', '--glow-duration': '3.5s', '--glow-delay': '1.8s' } as React.CSSProperties}
        tooltip={{ name: "Cursed Vision of Sargeras", quality: "epic", type: "Leather Helmet", flavor: "His eyes see what yours cannot." }}
      >
        <Image src="/images/landing/items/cursed-vision.png" alt="" fill className="object-contain" style={{ transform: 'rotate(14deg)' }} />
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
