'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  SparklesIcon,
  Wrench01Icon,
  Bug01Icon,
} from '@hugeicons/core-free-icons'
import { updates, type UpdateCategory, type UpdateItem, type UpdateEntry } from '@/lib/updates-data'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingFooter from '@/app/components/landing/LandingFooter'

const categoryConfig: Record<UpdateCategory, { label: string; icon: typeof SparklesIcon; color: string }> = {
  feature: {
    label: 'New',
    icon: SparklesIcon,
    color: 'text-green-400',
  },
  improvement: {
    label: 'Improved',
    icon: Wrench01Icon,
    color: 'text-[#9940ec]',
  },
  fix: {
    label: 'Fixed',
    icon: Bug01Icon,
    color: 'text-[#bababa]/60',
  },
}

function UpdateItemCard({ item }: { item: UpdateItem }) {
  const config = categoryConfig[item.category]

  return (
    <div className="flex gap-3 py-3">
      <div className={`flex items-center gap-1.5 min-w-[90px] ${config.color}`}>
        <HugeiconsIcon icon={config.icon} size={14} />
        <span className="text-xs font-medium">{config.label}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{item.title}</p>
        {item.description && (
          <p className="text-sm text-[#bababa]/70 mt-0.5">{item.description}</p>
        )}
      </div>
    </div>
  )
}

function UpdateEntryCard({ entry }: { entry: UpdateEntry }) {
  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-2 bottom-0 w-px bg-[#383838] last:hidden" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-[#17151b] border-2 border-[#9940ec]" />

      {/* Content */}
      <div className="bg-[#17151b] border border-[#383838] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#383838] bg-[#0f0e12]">
          <span className="text-sm font-medium text-white">{entry.date}</span>
          {entry.version && (
            <span className="text-xs font-medium text-[#bababa]/60 bg-[#383838]/50 px-2 py-0.5 rounded">
              v{entry.version}
            </span>
          )}
        </div>

        {/* Items */}
        <div className="px-5 divide-y divide-[#383838]/50">
          {entry.items.map((item, index) => (
            <UpdateItemCard key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PublicUpdatesPage() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <LandingNav />

      <div className="max-w-2xl mx-auto px-6 pt-32 pb-20">
        {/* Header */}
        <div className="mb-10">
          <h1 className="font-poppins font-bold text-[32px] text-white mb-2">Updates</h1>
          <p className="font-poppins text-[16px] text-[#bababa]">What&apos;s new in LootList+</p>
        </div>

        {/* Updates timeline */}
        {updates.map((entry, index) => (
          <UpdateEntryCard key={index} entry={entry} />
        ))}
      </div>

      <LandingFooter />
    </div>
  )
}
