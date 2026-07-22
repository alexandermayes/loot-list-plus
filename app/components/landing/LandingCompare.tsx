'use client'

import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { fadeInUp, staggerContainerSlow } from '@/lib/animations'
import { trackClientEvent } from '@/utils/analytics/client'

type CellValue = boolean | string

const features: { name: string; tip: string; lootlist: CellValue; tmb: CellValue; dkp: CellValue; epgp: CellValue; council: CellValue }[] = [
  { name: 'Ranked loot lists', tip: 'Raiders rank up to 50 items by priority. Officers see exactly what everyone wants.', lootlist: true, tmb: true, dkp: false, epgp: false, council: false },
  { name: 'Automated scoring', tip: 'A 7-component formula computes who should get each item based on rank, attendance, role, and more.', lootlist: true, tmb: false, dkp: true, epgp: true, council: false },
  { name: 'Attendance feeds the loot score', tip: 'TMB does track attendance (percentages, decay, Warcraft Logs import) but only displays it next to a raider\'s name. In LootList+ it is a weighted component of the score itself.', lootlist: true, tmb: 'shown only', dkp: true, epgp: true, council: false },
  { name: 'Score breakdown per item', tip: 'Every raider can see exactly why they\'re ranked #1 or #5 for any item, with a full component-by-component explanation.', lootlist: true, tmb: false, dkp: false, epgp: false, council: false },
  { name: 'Bad luck protection', tip: 'Raiders who keep getting passed on an item get an incremental score boost automatically. Configurable by officers.', lootlist: true, tmb: false, dkp: false, epgp: false, council: false },
  { name: 'Compiled per-item rankings', tip: 'A compiled view of every raider\'s score for every item, sortable by boss, with a raid-mode view for use during pulls. TMB compiles wishlists and prios per item, but without computed scores.', lootlist: true, tmb: 'wishlists only', dkp: false, epgp: false, council: false },
]

function Check() {
  return <span className="text-emerald-400">&#10003;</span>
}
function Cross() {
  return <span className="text-red-400/50">&#10005;</span>
}
function Cell({ value }: { value: CellValue }) {
  if (value === true) return <Check />
  if (value === false) return <Cross />
  return <span className="text-yellow-400 text-[11px] font-medium">{value}</span>
}

function FeatureTip({ name, tip }: { name: string; tip: string }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const spanRef = useRef<HTMLSpanElement>(null)

  const show = useCallback(() => {
    if (!spanRef.current) return
    const rect = spanRef.current.getBoundingClientRect()
    setPos({ x: rect.left, y: rect.bottom + 8 })
  }, [])

  const hide = useCallback(() => setPos(null), [])

  return (
    <>
      <span
        ref={spanRef}
        className="border-b border-dashed border-[#bababa]/30 cursor-default"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {name}
      </span>
      {pos && createPortal(
        <span
          className="fixed w-[260px] px-3 py-2 rounded-lg bg-[#1a1a2e]/95 border border-[#4a4a6a] text-[12px] text-[#bababa] leading-relaxed pointer-events-none z-[9999] backdrop-blur-sm shadow-xl font-poppins"
          style={{ left: pos.x, top: pos.y }}
        >
          {tip}
        </span>,
        document.body
      )}
    </>
  )
}

export default function LandingCompare() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section id="compare" className="relative pt-0 pb-12 md:pb-16 bg-[#080808]">
      <div ref={ref} className="max-w-[900px] mx-auto px-6 md:px-12">
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainerSlow}
          className="text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="font-poppins font-bold text-[28px] md:text-[40px] text-white leading-tight mb-4"
          >
            Already using <span className="font-wow text-shimmer-purple text-[32px] md:text-[44px]">TMB, DKP, or EPGP</span>?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="font-poppins text-[16px] text-[#bababa] leading-relaxed max-w-[600px] mx-auto mb-10"
          >
            LootList+ combines the best parts of every loot system into one. No spreadsheets, no guesswork, full transparency for every raider.
          </motion.p>

          {/* Comparison table */}
          <motion.div variants={fadeInUp} className="mb-10">
            <div className="overflow-x-auto rounded-xl border border-[#383838]">
              <table className="w-full text-sm font-poppins">
                <thead>
                  <tr className="bg-[#17151b] border-b border-[#383838]">
                    <th className="text-left py-3 px-4 font-semibold text-white min-w-[180px]">Feature</th>
                    <th className="text-center py-3 px-3 font-semibold text-accent min-w-[80px]">
                      <span className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/images/landing/logo-landing.svg" alt="LootList+" width={77} height={12} />
                      </span>
                    </th>
                    <th className="text-center py-3 px-3 font-semibold text-[#bababa] min-w-[80px]">TMB</th>
                    <th className="text-center py-3 px-3 font-semibold text-[#bababa] min-w-[80px]">DKP</th>
                    <th className="text-center py-3 px-3 font-semibold text-[#bababa] min-w-[80px]">EPGP</th>
                    <th className="text-center py-3 px-3 font-semibold text-[#bababa] min-w-[80px]">Council</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f, i) => (
                    <tr key={f.name} className={`border-b border-[#383838]/50 ${i % 2 === 0 ? 'bg-[#0d0d0f]' : 'bg-[#121214]'}`}>
                      <td className="py-3 px-4 text-left text-white">
                        <FeatureTip name={f.name} tip={f.tip} />
                      </td>
                      <td className="py-3 px-3 text-center"><Cell value={f.lootlist} /></td>
                      <td className="py-3 px-3 text-center"><Cell value={f.tmb} /></td>
                      <td className="py-3 px-3 text-center"><Cell value={f.dkp} /></td>
                      <td className="py-3 px-3 text-center"><Cell value={f.epgp} /></td>
                      <td className="py-3 px-3 text-center"><Cell value={f.council} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.a
            variants={fadeInUp}
            href="/compare"
            onClick={() => trackClientEvent('landing_nav_clicked', { target: 'compare', source: 'compare_section' })}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#121218] border border-[#383838] font-poppins font-semibold text-[14px] text-white no-underline hover:bg-[#1a1a22] transition-colors"
          >
            See the full comparison
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  )
}
