'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { scaleUp, scrollToSection } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import MagneticButton from './MagneticButton'
import CountUp from './CountUp'

const ParallaxItem = dynamic(() => import('./ParallaxItem'), { ssr: false })

const APP_URL = 'https://www.lootlistplus.com'

export default function LandingHero({ recentFeatures = 'See what\'s new' }: { recentFeatures?: string }) {
  const previewRef = useRef(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isPreviewInView = useInView(previewRef, { once: true, margin: '-100px' })
  const [stats, setStats] = useState<{ guilds: number; raiders: number; loot: number } | null>(null)

  // Dashboard scale-up on scroll — uses page scroll so it always starts at 1 when at top
  const dashboardRef = useRef(null)
  const { scrollY } = useScroll()
  const dashboardScale = useTransform(scrollY, [0, 250], [1, 1.15], { clamp: true })

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
      <div className="absolute inset-0 max-w-[1440px] mx-auto overflow-visible">
      {/* 1. Thunderfury - top left, angled with tip pointing up-right */}
      <ParallaxItem
        speed={-0.15}
        slideFrom="left"
        delay={0.6}
        depth={1.2}
        float={{ distance: 14, duration: 7, delay: 0 }}
        className="absolute left-[-200px] top-[160px] w-[580px] h-[530px] hidden lg:block pointer-events-none breathing-glow z-30"
        style={{ '--glow-color': 'rgba(24,110,238,0.25)', '--glow-duration': '4.5s', '--glow-delay': '0s' } as React.CSSProperties}
        clickEffect="lightning"
        tooltip={{ name: "Thunderfury, Blessed Blade of the Windseeker", quality: "legendary", type: "One-Hand Sword", flavor: "Forged from the shattered remnants of Thunderaan's prison." }}
      >
        <Image src="/images/landing/items/thunderfury.webp" alt="" fill sizes="600px" loading="lazy" className="object-contain" style={{ transform: 'rotate(158deg) scaleY(-1)' }} />
      </ParallaxItem>

      {/* 2. Hand of Rag - top right */}
      <ParallaxItem
        speed={-0.2}
        slideFrom="right"
        delay={0.8}
        depth={1.5}
        float={{ distance: 10, duration: 5.5, delay: 1.2 }}
        clickEffect="shockwave"
        className="absolute right-[-250px] top-[190px] w-[550px] h-[500px] hidden lg:block pointer-events-none breathing-glow z-30"
        style={{ '--glow-color': 'rgba(241,131,24,0.5)', '--glow-duration': '3.8s', '--glow-delay': '1s' } as React.CSSProperties}
        tooltip={{ name: "Sulfuras, Hand of Ragnaros", quality: "legendary", type: "Two-Hand Mace", flavor: "Too hot to handle." }}
      >
        <Image src="/images/landing/items/hand-of-rag.webp" alt="" fill sizes="600px" loading="lazy" className="object-contain" style={{ transform: 'rotate(50deg)' }} />
      </ParallaxItem>

      {/* 3. Warglaives - bottom left */}
      <ParallaxItem
        speed={0.15}
        slideFrom="left"
        depth={0.8}
        float={{ distance: 16, duration: 8, delay: 2.5 }}
        clickEffect="slash"
        className="absolute left-[-280px] bottom-[-250px] w-[641px] h-[616px] hidden lg:block pointer-events-none z-30 breathing-glow"
        style={{ '--glow-color': 'rgba(141,244,31,0.25)', '--glow-duration': '5s', '--glow-delay': '0.5s' } as React.CSSProperties}
        tooltip={{ name: "Warglaive of Azzinoth", quality: "legendary", type: "One-Hand Sword", flavor: "Wielded by the Betrayer himself." }}
      >
        <Image src="/images/landing/items/warglaives.webp" alt="" fill sizes="600px" loading="lazy" className="object-contain" style={{ transform: 'rotate(41deg)' }} />
      </ParallaxItem>

      {/* 4. Cursed Vision of Sargeras - bottom right */}
      <ParallaxItem
        speed={0.25}
        slideFrom="right"
        depth={2}
        float={{ distance: 8, duration: 4.5, delay: 0.8 }}
        clickEffect="eyeFlash"
        className="absolute right-[-20px] bottom-[-100px] w-[208px] h-[199px] hidden lg:block pointer-events-none z-30 breathing-glow"
        style={{ '--glow-color': 'rgba(208,37,19,0.25)', '--glow-duration': '3.5s', '--glow-delay': '1.8s' } as React.CSSProperties}
        tooltip={{ name: "Cursed Vision of Sargeras", quality: "epic", type: "Leather Helmet", flavor: "His eyes see what yours cannot." }}
      >
        <Image src="/images/landing/items/cursed-vision.webp" alt="" fill sizes="600px" className="object-contain" style={{ transform: 'rotate(14deg)' }} />
      </ParallaxItem>

      </div>{/* end max-width wrapper for floating items */}

      {/* Hero Content + Dashboard Preview */}
      <div className="relative z-20">
        {/* Hero text content — no motion wrapper so content is visible in SSR HTML */}
        <div className="flex flex-col items-center pt-[100px] md:pt-[148px] px-6 animate-hero-fade-in">
          <div className="max-w-[900px] w-full flex flex-col items-center gap-6 md:gap-9">
            {/* NEW badge */}
            <a
              href="/changelog"
              className="flex items-center gap-2 bg-[#17151b] rounded-[60px] pl-1 pr-3 py-1 no-underline hover:bg-[#1f1d25] transition-colors max-w-full"
            >
              <span className="flex items-center justify-center px-2 py-1 bg-[#9940ec] rounded-[60px] font-poppins font-semibold text-[10px] text-white shrink-0">
                NEW
              </span>
              <span className="font-poppins text-[14px] text-white whitespace-nowrap truncate min-w-0">
                {recentFeatures}
              </span>
              <Image src="/images/landing/icons/arrow-right-02.svg" alt="" width={16} height={16} className="shrink-0" />
            </a>

            {/* Headline */}
            <div className="text-center w-full max-w-[720px]">
              <h1 className="font-poppins font-bold text-[40px] md:text-[56px] lg:text-[72px] leading-[0.92] text-white mb-6">
                <span className="font-wow text-shimmer-purple text-[48px] md:text-[64px] lg:text-[80px] leading-[0.82]">Epic loot</span>
                {' '}deserves an epic system.
              </h1>
              <p className="font-poppins font-medium text-[16px] text-[#bababa] leading-normal max-w-[620px] mx-auto">
                LootList+ is loot management for WoW Classic guilds. Raiders rank what they
                want, officers set the rules, and every drop gets a priority the whole guild
                can see.
              </p>
            </div>

            {/* CTA Buttons - Magnetic */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-[18px]">
                <MagneticButton
                  as="button"
                  onClick={() => {
                    trackClientEvent('landing_nav_clicked', { target: 'features', source: 'hero' })
                    scrollToSection('features')
                  }}
                  className="flex items-center justify-center px-4 py-3 rounded-[60px] bg-[#121218] border border-[#383838] font-poppins font-semibold text-[16px] text-white cursor-pointer hover:bg-[#1a1a22] transition-colors"
                >
                  See a loot decision
                </MagneticButton>
                <MagneticButton
                  as="a"
                  href={APP_URL}
                  onClick={() => trackClientEvent('landing_cta_clicked', { cta: 'hero_create_guild' })}
                  className="flex items-center justify-center px-4 py-3 rounded-[60px] bg-white font-poppins font-semibold text-[16px] text-black no-underline hover:bg-white/90 transition-colors"
                >
                  Create your guild free
                </MagneticButton>
              </div>
              <p className="font-poppins text-[13px] text-[#bababa]/70">
                Free core plan · Discord sign-in · Classic Era through Mists of Pandaria
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Preview with zoom-out on scroll */}
        <div ref={previewRef} className="relative max-w-[1165px] mx-auto px-6 md:px-12 mt-12 md:mt-16">
          <motion.div
            ref={dashboardRef}
            initial="hidden"
            animate={isPreviewInView ? 'visible' : 'hidden'}
            variants={scaleUp}
            style={{ scale: dashboardScale }}
          >
            <div className="relative rounded-[16px] border border-[#383838] shadow-[0px_-4px_40px_0px_rgba(255,255,255,0.05)] overflow-hidden">
              <Image
                src="/images/landing/dashboard-preview.webp"
                alt="LootList+ dashboard preview"
                width={1998}
                height={1151}
                priority
                sizes="(max-width: 1165px) 100vw, 1165px"
                className="w-full h-auto"
                style={{ filter: 'brightness(1.5) contrast(1.05) saturate(1.1)' }}
              />
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                className="absolute inset-0 w-full h-full"
                style={{ filter: 'brightness(1.5) contrast(1.05) saturate(1.1)' }}
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
