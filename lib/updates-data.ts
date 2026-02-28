export type UpdateCategory = 'feature' | 'improvement' | 'fix'

export interface UpdateItem {
  category: UpdateCategory
  title: string
  description?: string
}

export interface UpdateEntry {
  date: string
  version?: string
  items: UpdateItem[]
}

export const updates: UpdateEntry[] = [
  {
    date: 'February 27, 2026',
    items: [
      {
        category: 'feature',
        title: 'Invite code join flow',
        description: 'Invite links now show a guild preview on the login page. Sign in with Discord and you\'re in.',
      },
      {
        category: 'feature',
        title: 'Info tooltips',
        description: 'Hover over score components, brackets and stats for quick explanations of how they work.',
      },
      {
        category: 'feature',
        title: 'Help center glossary',
        description: 'Quick definitions for common terms like Loot Score, BLP and allocation points.',
      },
      {
        category: 'feature',
        title: 'Warcraft Logs integration',
        description: 'Link your guild\'s WCL page to auto-attach reports to raid summaries.',
      },
      {
        category: 'improvement',
        title: 'Guild Master promotion safety',
        description: 'Promoting to Guild Master now shows a confirmation and automatically demotes the current GM to Officer.',
      },
      {
        category: 'improvement',
        title: 'Smarter raid tracking dates',
        description: 'New guilds no longer see phantom weeks from before the guild was created.',
      },
      {
        category: 'improvement',
        title: 'Invite code management',
        description: 'Generate codes in a modal, remove codes with one click, and see status badges for expired or maxed-out codes.',
      },
      {
        category: 'fix',
        title: 'Loot list resubmission',
        description: 'The submit button no longer gets stuck after auto-save. Changes are properly detected for resubmission.',
      },
      {
        category: 'fix',
        title: 'Battle.net character import',
        description: 'Characters imported from Battle.net are now correctly created as mains instead of alts.',
      },
      {
        category: 'fix',
        title: 'Login page stability',
        description: 'Fixed a page flickering issue that affected users across all browsers.',
      },
      {
        category: 'fix',
        title: 'Guild icon display',
        description: 'Discord server icons now load correctly for new guilds.',
      },
    ],
  },
  {
    date: 'February 17, 2026',
    items: [
      {
        category: 'feature',
        title: 'Loot Council items',
        description: 'Officers can mark items as Loot Council. LC items are visible on the master sheet and loot list but cannot be ranked by raiders.',
      },
      {
        category: 'feature',
        title: 'Dashboard insight widgets',
        description: 'New overview widgets for score breakdown, attendance snapshot, trial progress, upcoming raids and competition indicators.',
      },
      {
        category: 'feature',
        title: 'Attendance trend sparkline',
        description: 'A mini chart in the attendance widget showing your weekly attendance over the last 8 weeks.',
      },
      {
        category: 'feature',
        title: 'BLP highlights on priority items',
        description: 'See your Bad Luck Protection bonus directly on each priority item.',
      },
      {
        category: 'feature',
        title: 'Low-competition callout',
        description: 'Spot items on your list with little or no competition for easy wins.',
      },
      {
        category: 'improvement',
        title: 'Loot efficiency stat',
        description: 'The "Recently received" section now shows how many items you\'ve won out of your total list.',
      },
      {
        category: 'improvement',
        title: 'Simplified raid attendance UI',
        description: 'Attendance tracking now uses a checkbox with status cycle instead of separate controls.',
      },
    ],
  },
  {
    date: 'February 11, 2026',
    items: [
      {
        category: 'feature',
        title: 'Officer DM notifications',
        description: 'Officers now receive a Discord DM when a raider submits or resubmits their loot list.',
      },
      {
        category: 'feature',
        title: 'Automatic Discord update posts',
        description: 'App updates are now automatically posted to the LootList+ Discord on each deploy.',
      },
      {
        category: 'improvement',
        title: 'Redesigned sign-in page',
        description: 'New split-layout login page with a cleaner look.',
      },
      {
        category: 'improvement',
        title: 'Faster member management',
        description: 'Promoting, demoting and removing members now updates instantly.',
      },
      {
        category: 'fix',
        title: 'Officer notification reliability',
        description: 'Fixed an issue where officer notifications would silently fail for non-officer submissions.',
      },
    ],
  },
  {
    date: 'February 2, 2026',
    items: [
      {
        category: 'feature',
        title: 'Accent color customization',
        description: 'Personalize your interface with WoW item quality colors (Legendary, Epic, Rare and more).',
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
