'use client'

import { useEffect } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Notification03Icon,
  SparklesIcon,
  Wrench01Icon,
  Bug01Icon,
} from '@hugeicons/core-free-icons'
import { Heading, Text } from '@/components/ui/typography'
import { updates, type UpdateCategory, type UpdateItem, type UpdateEntry } from '@/lib/updates-data'
import { trackClientEvent } from '@/utils/analytics/client'

// Category styling
const categoryConfig: Record<UpdateCategory, { label: string; icon: typeof SparklesIcon; color: string }> = {
  feature: {
    label: 'New',
    icon: SparklesIcon,
    color: 'text-success',
  },
  improvement: {
    label: 'Improved',
    icon: Wrench01Icon,
    color: 'text-accent',
  },
  fix: {
    label: 'Fixed',
    icon: Bug01Icon,
    color: 'text-muted-foreground',
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
        <p className="text-sm font-medium text-foreground">{item.title}</p>
        {item.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
        )}
      </div>
    </div>
  )
}

function UpdateEntryCard({ entry }: { entry: UpdateEntry }) {
  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-2 bottom-0 w-px bg-border last:hidden" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full bg-background-elevated border-2 border-accent" />

      {/* Content */}
      <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background-subtle">
          <span className="text-sm font-medium text-foreground">{entry.date}</span>
          {entry.version && (
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
              v{entry.version}
            </span>
          )}
        </div>

        {/* Items */}
        <div className="px-5 divide-y divide-border">
          {entry.items.map((item, index) => (
            <UpdateItemCard key={index} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UpdatesPage() {
  useEffect(() => {
    trackClientEvent('updates_page_viewed')
  }, [])

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <HugeiconsIcon icon={Notification03Icon} size={20} className="text-accent" />
          </div>
          <div>
            <Heading level={1}>Updates</Heading>
            <Text color="muted" size="sm">What&apos;s new in LootList+</Text>
          </div>
        </div>

        {/* Updates timeline */}
        {updates.map((entry, index) => (
          <UpdateEntryCard key={index} entry={entry} />
        ))}
      </div>
    </div>
  )
}
