'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Notification03Icon,
  SparklesIcon,
  Wrench01Icon,
  Bug01Icon,
} from '@hugeicons/core-free-icons'
import { Heading, Text } from '@/components/ui/typography'

// Update entry types
type UpdateCategory = 'feature' | 'improvement' | 'fix'

interface UpdateItem {
  category: UpdateCategory
  title: string
  description?: string
}

interface UpdateEntry {
  date: string
  version?: string
  items: UpdateItem[]
}

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

// Updates data - newest first
const updates: UpdateEntry[] = [
  {
    date: 'February 2, 2026',
    items: [
      {
        category: 'feature',
        title: 'Accent color customization',
        description: 'Personalize your interface with WoW item quality colors (Legendary, Epic, Rare, and more).',
      },
      {
        category: 'feature',
        title: 'Trial/probation system',
        description: 'Track new guild members with automatic score penalties that decay over time.',
      },
      {
        category: 'feature',
        title: 'Loot history tracking',
        description: 'Record who received loot and when for better transparency.',
      },
      {
        category: 'improvement',
        title: 'Timezone support for deadlines',
        description: 'Submission deadlines now respect your guild timezone setting.',
      },
      {
        category: 'improvement',
        title: 'Per-expansion raid schedules',
        description: 'Configure different raid days for each expansion your guild is playing.',
      },
      {
        category: 'improvement',
        title: 'Simplified admin navigation',
        description: 'Consolidated admin menu from 7 items to 3 for easier access.',
      },
    ],
  },
  {
    date: 'February 1, 2026',
    items: [
      {
        category: 'feature',
        title: 'Audit log for officers',
        description: 'View a complete history of loot awards and administrative actions.',
      },
    ],
  },
  {
    date: 'January 31, 2026',
    items: [
      {
        category: 'improvement',
        title: 'Multiple WowSims export formats',
        description: 'Import gear from various WowSims export formats.',
      },
      {
        category: 'fix',
        title: 'Loot submission deletion',
        description: 'Fixed an issue where deleting loot submissions was not working.',
      },
      {
        category: 'fix',
        title: 'Security audit fixes',
        description: 'Addressed issues identified in our Supabase security audit.',
      },
    ],
  },
  {
    date: 'January 30, 2026',
    items: [
      {
        category: 'feature',
        title: 'BIS import',
        description: 'Import your Best in Slot list directly into your loot list.',
      },
      {
        category: 'feature',
        title: 'Class proficiency filtering',
        description: 'Filter loot items by which classes can use them.',
      },
      {
        category: 'feature',
        title: 'Community consensus indicator',
        description: 'See how other players rank items in the loot dropdown.',
      },
      {
        category: 'improvement',
        title: 'API performance',
        description: 'Faster page loads with caching and parallel queries.',
      },
      {
        category: 'improvement',
        title: 'Privacy improvements',
        description: 'Reduced Discord OAuth scopes to minimum required permissions.',
      },
    ],
  },
  {
    date: 'January 29, 2026',
    items: [
      {
        category: 'feature',
        title: '"Why didn\'t I get this item?" comparison',
        description: 'Compare your score against the winner to understand loot decisions.',
      },
      {
        category: 'feature',
        title: 'Officer loot list summary',
        description: 'Officers can view a summary of all submitted loot lists.',
      },
      {
        category: 'feature',
        title: 'Custom 404 page',
        description: 'Lost? Our friendly gnome will help you find your way.',
      },
      {
        category: 'improvement',
        title: 'Mobile sidebar',
        description: 'Improved navigation with close button and header icons on mobile.',
      },
      {
        category: 'improvement',
        title: 'Character names with class colors',
        description: 'Your character name now shows in your class color on the loot list.',
      },
      {
        category: 'improvement',
        title: 'Onboarding wizard',
        description: 'Multi-step wizard with animations to guide new users.',
      },
      {
        category: 'fix',
        title: 'Security fix',
        description: 'Prevented a privilege escalation vulnerability in member promotion.',
      },
    ],
  },
  {
    date: 'January 28, 2026',
    items: [
      {
        category: 'feature',
        title: 'Score breakdown modal',
        description: 'Click any score on the Master Sheet to see exactly how it was calculated.',
      },
      {
        category: 'feature',
        title: 'Gargul DFT export',
        description: 'Export loot priorities to Gargul addon format for in-game use.',
      },
      {
        category: 'feature',
        title: 'Account deletion',
        description: 'Delete your account and all associated data from the profile page.',
      },
      {
        category: 'feature',
        title: 'Bug report button',
        description: 'Floating feedback button to quickly report issues to our GitHub.',
      },
      {
        category: 'improvement',
        title: 'Smart item classification defaults',
        description: 'Items now have sensible default classifications based on their type.',
      },
      {
        category: 'improvement',
        title: 'Toast notifications',
        description: 'Replaced browser alerts with styled toast notifications.',
      },
      {
        category: 'improvement',
        title: 'Performance optimizations',
        description: 'Fixed bottlenecks identified in load testing.',
      },
    ],
  },
]

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
  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <HugeiconsIcon icon={Notification03Icon} size={20} className="text-accent" />
          </div>
          <div>
            <Heading level={1}>Updates</Heading>
            <Text color="muted" size="sm">What's new in LootList+</Text>
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
