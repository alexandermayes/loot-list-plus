'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'
import Image from 'next/image'

const CYCLE_DURATION = 5000

const leaderFeatures = [
  {
    icon: '/images/landing/icons/check-list.svg',
    text: 'Create clear, transparent loot priorities',
    image: '/images/landing/features-leader-1.png',
  },
  {
    icon: '/images/landing/icons/calendar-03.svg',
    text: 'Track attendance and reward consistency',
    image: '/images/landing/features-leader-2.png',
  },
  {
    icon: '/images/landing/icons/body-armor.svg',
    text: "See every raider's loot needs in one place",
    image: '/images/landing/features-leader-3.png',
  },
  {
    icon: '/images/landing/icons/clipboard.svg',
    text: 'Manage loot across every raid and phase',
    image: '/images/landing/features-leader-4.png',
  },
]

const raiderFeatures = [
  {
    icon: '/images/landing/icons/list-view.svg',
    text: 'Build your loot list in minutes',
    image: '/images/landing/features-raider-1.png',
  },
  {
    icon: '/images/landing/icons/sword-01.svg',
    text: 'Get rewarded for showing up consistently',
    image: '/images/landing/features-raider-2.png',
  },
  {
    icon: '/images/landing/icons/ranking.svg',
    text: 'See where you stand on every item',
    image: '/images/landing/features-raider-3.png',
  },
  {
    icon: '/images/landing/icons/list-start.svg',
    text: 'Keep your priorities organized each phase',
    image: '/images/landing/features-raider-4.png',
  },
]

const imageVariants = {
  enter: { opacity: 0, scale: 1.02, y: 8 },
  center: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -8 },
}

export default function LandingFeatures() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const sectionInView = useInView(ref, { margin: '200px' })
  const [activeTab, setActiveTab] = useState<'leaders' | 'raiders'>('leaders')
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())

  const features = activeTab === 'leaders' ? leaderFeatures : raiderFeatures
  const isRaiders = activeTab === 'raiders'

  // Auto-cycle timer
  useEffect(() => {
    if (!sectionInView) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    startTimeRef.current = Date.now()
    setProgress(0)

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const p = Math.min(elapsed / CYCLE_DURATION, 1)
      setProgress(p)

      if (p >= 1) {
        setActiveIndex(prev => (prev + 1) % features.length)
        setProgress(0)
        startTimeRef.current = Date.now()
      }
    }, 30)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sectionInView, features.length, activeTab])

  useEffect(() => {
    setActiveIndex(0)
    setProgress(0)
    startTimeRef.current = Date.now()
  }, [activeTab])

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'features' })
  }, [isInView])

  const handleFeatureClick = (index: number) => {
    setActiveIndex(index)
    setProgress(0)
    startTimeRef.current = Date.now()
  }

  const bulletList = (
    <div className={`flex-1 flex flex-col gap-2 justify-center ${isRaiders ? 'items-start' : 'items-end'}`}>
      {features.map((feature, i) => {
        const isActive = i === activeIndex
        return (
          <button
            key={`${activeTab}-${i}`}
            onClick={() => handleFeatureClick(i)}
            className={`relative flex items-center gap-4 md:gap-6 w-full lg:max-w-[417px] text-left rounded-xl px-3 md:px-4 py-3 cursor-pointer transition-colors border-none bg-transparent ${
              isActive ? 'bg-white/[0.03]' : 'hover:bg-white/[0.02]'
            }`}
          >
            {isActive && (
              <div
                className="absolute inset-0 rounded-xl bg-white/[0.06] origin-left"
                style={{
                  transform: `scaleX(${progress})`,
                  transformOrigin: 'left',
                  transition: 'transform 30ms linear',
                }}
              />
            )}

            <Image
              src={feature.icon}
              alt=""
              width={24}
              height={24}
              className={`relative z-10 w-6 h-6 flex-shrink-0 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-30'}`}
            />
            <p className={`relative z-10 font-poppins text-[16px] leading-8 transition-all duration-300 ${
              isActive
                ? 'font-semibold text-white'
                : 'font-normal text-[#bababa]/50'
            }`}>
              {feature.text}
            </p>
          </button>
        )
      })}
    </div>
  )

  const screenshot = (
    <div className={`shrink-0 w-full lg:w-[544px] bg-[#17151b] border border-[#383838] rounded-[20px] md:rounded-[28px] overflow-hidden relative flex flex-col ${
      isRaiders ? 'items-start pr-4 md:pr-[44px]' : 'items-end pl-4 md:pl-[44px]'
    } justify-center pt-6 md:pt-[40px]`}>
      {/* Inner shadow overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none rounded-[28px]" style={{
        boxShadow: 'inset 0 0 40px 10px rgba(0,0,0,0.5)',
      }} />

      <div className={`relative h-[280px] md:h-[380px] w-full lg:w-[500px] ${isRaiders ? 'rounded-tr-[20px]' : 'rounded-tl-[20px]'} overflow-hidden`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${activeIndex}`}
            variants={imageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={features[activeIndex].image}
              alt={features[activeIndex].text}
              fill
              className="object-cover object-left-top"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )

  return (
    <section id="features" className="relative py-24 md:py-32 bg-[#080808]">
      <div className="relative z-10 max-w-[1165px] mx-auto px-6 md:px-12">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[40px] leading-[1.1] text-white mb-6"
          >
            Everything your guild<br />
            <span className="font-wow text-shimmer-purple text-[32px] md:text-[44px]">needs/greeds</span>
            {' '}and more
          </motion.h2>
        </motion.div>

        {/* Tab Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-12"
        >
          <div className="inline-flex items-center bg-[#17151b] border border-[#383838] rounded-[40px] p-1">
            <button
              onClick={() => {
                setActiveTab('leaders')
                trackClientEvent('landing_nav_clicked', { target: 'features_tab_leaders', source: 'features' })
              }}
              className={`flex items-center justify-center w-[150px] md:w-[200px] rounded-[40px] font-poppins font-medium text-[14px] md:text-[16px] leading-[40px] md:leading-[45px] cursor-pointer transition-colors ${
                activeTab === 'leaders'
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white hover:text-white/80'
              }`}
              style={{ border: 'none' }}
            >
              For Guild Leaders
            </button>
            <button
              onClick={() => {
                setActiveTab('raiders')
                trackClientEvent('landing_nav_clicked', { target: 'features_tab_raiders', source: 'features' })
              }}
              className={`flex items-center justify-center w-[150px] md:w-[200px] rounded-[40px] font-poppins font-medium text-[14px] md:text-[16px] leading-[40px] md:leading-[45px] cursor-pointer transition-colors ${
                activeTab === 'raiders'
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white hover:text-white/80'
              }`}
              style={{ border: 'none' }}
            >
              For Raiders
            </button>
          </div>
        </motion.div>

        {/* Features content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3 }}
          className="flex flex-col lg:flex-row items-center gap-[60px]"
        >
          {isRaiders ? (
            <>
              {screenshot}
              {bulletList}
            </>
          ) : (
            <>
              {bulletList}
              {screenshot}
            </>
          )}
        </motion.div>
      </div>
    </section>
  )
}
