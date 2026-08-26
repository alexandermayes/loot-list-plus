'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'

// WoW class colors — the small authenticity cues matter to this audience
const CLASS_COLORS: Record<string, string> = {
  Warrior: '#C79C6E',
  Hunter: '#ABD473',
}

// Anonymized example chosen to demonstrate the system: equal list ranks are
// separated by attendance, and a high-attendance raider with a low rank
// still waits their turn. BLP shows it helps without overriding intent.
const CANDIDATES = [
  { name: 'Thorgrim', wowClass: 'Warrior', spec: 'Fury', rank: 1, attendance: '92%', blp: '—', score: 88.4, winner: true },
  { name: 'Kregor', wowClass: 'Warrior', spec: 'Arms', rank: 1, attendance: '64%', blp: '+3', score: 71.9, winner: false },
  { name: 'Sylvara', wowClass: 'Hunter', spec: 'Marksmanship', rank: 4, attendance: '98%', blp: '—', score: 63.5, winner: false },
]

export default function LandingLootDecision() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  useEffect(() => {
    if (isInView) trackClientEvent('landing_section_viewed', { section: 'loot_decision' })
  }, [isInView])

  return (
    <section id="loot-decision" className="relative pt-20 md:pt-28 pb-8 bg-[#080808]">
      <div ref={ref} className="relative z-10 max-w-[860px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="text-center mb-10 md:mb-12"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[40px] leading-[1.1] text-white"
          >
            When an item drops, the decision is already{' '}
            <span className="font-wow text-shimmer-purple text-[32px] md:text-[44px]">explainable</span>.
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-poppins font-medium text-[16px] text-[#bababa] mt-4 max-w-[560px] mx-auto"
          >
            Every candidate&apos;s list rank, attendance, and bad-luck protection roll into one
            Loot Score anyone can inspect.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="rounded-[20px] border border-[#383838] overflow-hidden"
          style={{ backgroundImage: 'linear-gradient(190deg, rgb(12, 11, 14) 15%, rgb(23, 21, 27) 83%)' }}
        >
          {/* Item header */}
          <div className="px-6 py-4 border-b border-[#383838]">
            <p className="font-poppins font-bold text-[17px] text-[#a335ee] leading-tight">
              Ashkandi, Greatsword of the Brotherhood
            </p>
            <p className="font-poppins text-[12px] text-[#bababa] mt-0.5">
              Blackwing Lair · Two-Hand Sword · 3 candidates
            </p>
          </div>

          {/* Column labels */}
          <div className="hidden sm:grid grid-cols-[1fr_repeat(4,minmax(70px,auto))] gap-4 px-6 py-2 border-b border-[#383838]/60">
            {['Candidate', 'List rank', 'Attendance', 'BLP', 'Loot Score'].map((label) => (
              <p key={label} className="font-poppins font-semibold text-[11px] uppercase tracking-wide text-[#bababa]/60 last:text-right">
                {label}
              </p>
            ))}
          </div>

          {/* Candidates */}
          {CANDIDATES.map((c) => (
            <div
              key={c.name}
              className={`grid grid-cols-2 sm:grid-cols-[1fr_repeat(4,minmax(70px,auto))] gap-2 sm:gap-4 items-center px-6 py-3.5 border-b border-[#383838]/40 last:border-b-0 ${
                c.winner ? 'bg-[#9940ec]/10 border-l-2 border-l-[#9940ec]' : ''
              }`}
            >
              <div className="col-span-2 sm:col-span-1">
                <p className="font-poppins font-semibold text-[14px] leading-tight" style={{ color: CLASS_COLORS[c.wowClass] }}>
                  {c.name}
                  {c.winner && (
                    <span className="ml-2 px-1.5 py-0.5 bg-[#9940ec] rounded-[60px] font-semibold text-[9px] uppercase tracking-wide text-white align-middle">
                      Next in line
                    </span>
                  )}
                </p>
                <p className="font-poppins text-[11px] text-[#bababa]">{c.wowClass} · {c.spec}</p>
              </div>
              <p className="font-poppins text-[13px] text-white"><span className="sm:hidden text-[#bababa]/60">Rank </span>#{c.rank}</p>
              <p className="font-poppins text-[13px] text-white"><span className="sm:hidden text-[#bababa]/60">Att </span>{c.attendance}</p>
              <p className="font-poppins text-[13px] text-white"><span className="sm:hidden text-[#bababa]/60">BLP </span>{c.blp}</p>
              <p className={`font-poppins font-bold text-[15px] sm:text-right ${c.winner ? 'text-[#9940ec]' : 'text-white'}`}>
                {c.score.toFixed(1)}
              </p>
            </div>
          ))}

          {/* Caption */}
          <div className="px-6 py-3 bg-[#080808]/40">
            <p className="font-poppins text-[12px] text-[#bababa]/60">
              Anonymized example. In the app, every score opens into its full calculation.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
