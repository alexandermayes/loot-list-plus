'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'

const ParallaxItem = dynamic(() => import('./ParallaxItem'), { ssr: false })

export default function PremiumHero() {
  return (
    <section className="relative w-full bg-[#080808]">
      {/* Background gradient (shared with the landing hero) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/landing/bg/hero-bg-gradient.svg"
        alt=""
        className="absolute left-0 top-0 w-full h-[900px] pointer-events-none"
        aria-hidden="true"
      />

      <div className="absolute inset-0 max-w-[1440px] mx-auto overflow-visible">
        {/* Val'anyr — the gold legendary, left */}
        <ParallaxItem
          speed={-0.15}
          slideFrom="left"
          delay={0.5}
          depth={1.2}
          float={{ distance: 14, duration: 7, delay: 0 }}
          clickEffect="shockwave"
          className="absolute left-[-180px] top-[140px] w-[480px] h-[460px] hidden lg:block pointer-events-none breathing-glow z-30"
          style={{ '--glow-color': 'rgba(255,128,0,0.3)', '--glow-duration': '4.5s', '--glow-delay': '0s' } as React.CSSProperties}
          tooltip={{ name: "Val'anyr, Hammer of Ancient Kings", quality: 'legendary', type: 'One-Hand Mace', flavor: 'The gift of the titans.' }}
        >
          <Image src="/images/landing/items/valanyr.webp" alt="" fill sizes="500px" loading="lazy" className="object-contain" style={{ transform: 'rotate(-18deg)' }} />
        </ParallaxItem>

        {/* Gold mace glow — right */}
        <ParallaxItem
          speed={0.2}
          slideFrom="right"
          delay={0.7}
          depth={1.5}
          float={{ distance: 10, duration: 5.5, delay: 1.2 }}
          className="absolute right-[-160px] top-[220px] w-[420px] h-[400px] hidden lg:block pointer-events-none breathing-glow z-30"
          style={{ '--glow-color': 'rgba(255,110,8,0.3)', '--glow-duration': '3.8s', '--glow-delay': '1s' } as React.CSSProperties}
        >
          <Image src="/images/landing/items/item-gold-mace.webp" alt="" fill sizes="450px" loading="lazy" className="object-contain" style={{ transform: 'rotate(24deg)' }} />
        </ParallaxItem>
      </div>

      {/* Hero content — plain markup so it's in the SSR HTML */}
      <div className="relative z-20 flex flex-col items-center pt-[100px] md:pt-[148px] px-6 animate-hero-fade-in">
        <div className="max-w-[900px] w-full flex flex-col items-center gap-6 md:gap-9">
          {/* Badge */}
          <div className="flex items-center gap-2 bg-[#17151b] rounded-[60px] pl-1 pr-3 py-1 max-w-full">
            <span className="flex items-center justify-center px-2 py-1 bg-[#ff8000] rounded-[60px] font-poppins font-semibold text-[10px] text-black shrink-0">
              PREMIUM
            </span>
            <span className="font-poppins text-[14px] text-white whitespace-nowrap truncate min-w-0">
              One subscription covers your whole guild
            </span>
          </div>

          {/* Headline */}
          <div className="text-center w-full max-w-[760px]">
            <h1 className="font-poppins font-bold text-[40px] md:text-[56px] lg:text-[72px] leading-[0.92] text-white mb-6">
              <span className="font-wow text-shimmer-gold text-[48px] md:text-[64px] lg:text-[80px] leading-[0.82]">Legendary</span>
              {' '}tools for serious guilds.
            </h1>
            <p className="font-poppins font-medium text-[16px] text-[#bababa] leading-normal max-w-[620px] mx-auto">
              Everything your guild already uses stays free. Premium adds the tools
              multi-team guilds ask for — for less than one raider&apos;s consumables budget.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
