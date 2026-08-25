'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import Image from 'next/image'
import ParallaxItem from './ParallaxItem'

const statGradient = 'linear-gradient(200deg, rgb(46, 42, 53) 15%, rgb(80, 73, 95) 83%)'
const quoteGradient = 'linear-gradient(190deg, rgb(12, 11, 14) 15%, rgb(23, 21, 27) 83%)'

export function TiltCard({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTransform(`perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`)
  }

  const handleMouseLeave = () => {
    setTransform('')
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        ...style,
        transform,
        transition: transform ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out',
      }}
    >
      {children}
    </div>
  )
}

function StatCard({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <TiltCard
      className={`flex flex-col items-center justify-center overflow-hidden rounded-[28px] pb-4 ${className || ''}`}
      style={{ backgroundImage: statGradient }}
    >
      <p className="font-poppins font-bold text-[48px] md:text-[72px] text-white leading-normal">{value}</p>
      <p className="font-poppins font-medium text-[16px] text-[#bababa] leading-normal text-center px-4">{label}</p>
    </TiltCard>
  )
}

function QuoteCard({ quote, author, className }: { quote: string; author?: { name: string; guild: string }; className?: string }) {
  return (
    <TiltCard
      className={`flex flex-col items-center justify-center overflow-hidden rounded-[20px] md:rounded-[28px] p-6 md:p-12 lg:p-20 ${className || ''}`}
      style={{ backgroundImage: quoteGradient }}
    >
      <p className="font-poppins font-medium text-[16px] text-[#bababa] leading-normal text-center">
        &ldquo;{quote}&rdquo;
      </p>
      {author && (
        <div className="mt-5">
          <p className="font-poppins font-semibold text-[13px] text-white leading-tight text-center">{author.name}</p>
          <p className="font-poppins text-[12px] text-[#bababa] leading-tight text-center">{author.guild}</p>
        </div>
      )}
    </TiltCard>
  )
}

export default function LandingValueProps() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'value_props' })
  }, [isInView])

  return (
    <section id="value-props" className="relative pt-24 md:pt-32 pb-12 md:pb-16 bg-[#080808]">
      <div className="absolute inset-0 max-w-[1440px] mx-auto">
        {/* 6. Invincible's Reins - right side */}
        <ParallaxItem
          speed={-0.15}
          slideFrom="right"
          depth={1.0}
          float={{ distance: 13, duration: 7.5, delay: 1.8 }}
          clickEffect="frostShatter"
          className="absolute right-[-250px] top-[-180px] w-[639px] h-[507px] hidden lg:block pointer-events-none z-30 breathing-glow"
          style={{ '--glow-color': 'rgba(72,205,244,0.25)', '--glow-duration': '5.5s', '--glow-delay': '0.8s' } as React.CSSProperties}
          tooltip={{ name: "Invincible's Reins", quality: "epic", type: "Mount", flavor: "Riding him will make you Invincible, not invisible." }}
        >
          <Image src="/images/landing/items/invincibles-reins.webp" alt="" fill sizes="640px" className="object-contain" style={{ transform: 'rotate(-6deg)' }} />
        </ParallaxItem>
      </div>


      <div ref={ref} className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[40px] leading-[1.1] text-white"
          >
            Built for guilds who take<br />
            <span className="font-wow text-shimmer-purple text-[32px] md:text-[44px]">loot seriously</span>.
          </motion.h2>
        </motion.div>

        {/* Row 1: 100% stat + quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="flex flex-col md:flex-row gap-4 mb-4"
        >
          <StatCard value="100%" label="transparent" className="h-[250px] md:h-[300px] flex-shrink-0 md:w-auto md:flex-1" />
          <QuoteCard
            quote="One of the biggest benefits we've seen is how much it cuts down on loot drama. The transparency and structure it provides keep things fair and clear for everyone, while also incentivizing raiders to maintain good attendance and consistently show up prepared."
            author={{ name: 'Scizophrenic', guild: 'Crucible' }}
            className="h-[250px] md:h-[300px] md:flex-[2]"
          />
        </motion.div>

        {/* Row 2: stat + stat + stat */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="flex flex-col md:flex-row gap-4 mb-4"
        >
          <StatCard value="3+" label="hours saved a week" className="h-[250px] md:h-[300px] flex-shrink-0 md:w-auto md:flex-1" />
          <StatCard value="0" label="spreadsheets needed" className="h-[250px] md:h-[300px] flex-shrink-0 md:w-auto md:flex-1" />
          <StatCard value="1" label="system for loot, attendance, and priorities" className="h-[250px] md:h-[300px] flex-shrink-0 md:w-auto md:flex-1" />
        </motion.div>

        {/* Row 3: two quotes side-by-side */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.4 }}
          className="flex flex-col md:flex-row gap-4"
        >
          <QuoteCard
            quote="LootList+ is a game changer. As someone who has always dreaded being a loot master, I no longer despise handling loot. Cannot recommend it enough."
            author={{ name: 'Para/Kidney', guild: 'Indecisive' }}
            className="h-[250px] md:h-[300px] md:flex-1"
          />
          <QuoteCard
            quote="I chose LootList+ for the intuitive design and was pleasantly surprised by the depth of features. If you've used other loot tools and want something cleaner and easier for your raiders, this is the answer."
            author={{ name: '2laxs', guild: 'Bad Guys' }}
            className="h-[250px] md:h-[300px] md:flex-1"
          />
          <QuoteCard
            quote="The best feature I never expected was the community support from the creators. Honestly, it's a 10/10 and the best loot management system I've ever used."
            author={{ name: 'Xx_', guild: 'Soul Stoned' }}
            className="h-[250px] md:h-[300px] md:flex-1"
          />
        </motion.div>
      </div>
    </section>
  )
}
