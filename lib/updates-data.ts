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
    date: 'March 25, 2026',
    items: [
      {
        category: 'feature',
        title: 'Officer diagnostic tool',
        description: 'Officers can now check a raider\'s data integrity via /api/admin/diagnose. Returns character info, submission status, attendance records, and computed score to help troubleshoot issues.',
      },
      {
        category: 'feature',
        title: 'Score breakdown on Master Sheet',
        description: 'Officers can click any raider on the Master Sheet to see a full breakdown of how their Loot Score was calculated, including ranking, attendance, and modifiers.',
      },
      {
        category: 'improvement',
        title: 'Priorities tab search',
        description: 'The search bar on the Priorities tab no longer disappears, and now includes a clear button.',
      },
      {
        category: 'fix',
        title: 'Attendance score showing 0 for some raiders',
        description: 'Personal attendance score could show 0 even when the guild table showed the correct value. Now uses the same computation path as the guild table.',
      },
      {
        category: 'fix',
        title: 'Attendance calculation for new members',
        description: 'The "fair" new member mode wasn\'t using your join date, counting raids from before you joined against your attendance. Fixed.',
      },
      {
        category: 'fix',
        title: 'Loot settings not saving',
        description: 'Phase deadlines, raid tier toggles, and loot item changes weren\'t persisting due to a permissions issue. All fixed.',
      },
      {
        category: 'fix',
        title: 'Guild owner role editing',
        description: 'Guild owners couldn\'t edit their own role name or position. Now works correctly.',
      },
    ],
  },
  {
    date: 'March 21, 2026',
    items: [
      {
        category: 'feature',
        title: 'Excused absences',
        description: 'Officers can now mark raiders as excused for a raid. Excused raids are excluded from your attendance score denominator, so they won\'t hurt your Loot Score.',
      },
      {
        category: 'feature',
        title: 'Attendance points override',
        description: 'Officers can set a manual points override on any attendance record, replacing the calculated value for that raid.',
      },
      {
        category: 'feature',
        title: 'Setup checklist for new guilds',
        description: 'New guild officers see a progress checklist on the overview page showing what to set up: expansion, raid schedule, loot settings, roster, and first raid.',
      },
      {
        category: 'feature',
        title: 'First-time loot list guidance',
        description: 'Raiders who haven\'t ranked any items yet see a helpful banner explaining how to get started with their loot list.',
      },
      {
        category: 'improvement',
        title: 'Class filtering by expansion',
        description: 'Character creation now only shows classes available in your guild\'s active expansion. No more Death Knights in Classic.',
      },
      {
        category: 'improvement',
        title: 'Guild creation without leaving the page',
        description: 'Creating a new guild now opens a modal instead of navigating to a separate page.',
      },
      {
        category: 'improvement',
        title: 'Faster page loads',
        description: 'Reduced Largest Contentful Paint and layout shift across the app for snappier navigation.',
      },
      {
        category: 'fix',
        title: 'Master Sheet sorting',
        description: 'Summary view now correctly sorts players by highest item rank, and collapsed groups show the right top entries.',
      },
      {
        category: 'fix',
        title: 'Sheet import column warnings',
        description: 'Import now warns when Item #1 or Item #2 columns are completely empty, catching misconfigured spreadsheets before they cause blank lists.',
      },
      {
        category: 'fix',
        title: 'Submission diff accuracy',
        description: 'The "what changed" comparison on resubmissions now correctly snapshots the list at approval time, not at resubmission time.',
      },
    ],
  },
  {
    date: 'March 18, 2026',
    items: [
      {
        category: 'feature',
        title: 'Resubmission review for officers',
        description: 'When a raider resubmits their loot list, officers now see "Approve changes" and "Reject changes" buttons. Rejecting reverts the list to its previously approved state.',
      },
      {
        category: 'feature',
        title: 'New help articles',
        description: 'Added FAQs for how to record loot awards (Gargul or manual import) and how to create loot lists for new phases.',
      },
      {
        category: 'fix',
        title: 'Cleared loot list reappearing',
        description: 'Fixed a bug where clearing all rankings from a loot list (especially after a WowSims import) would repopulate the deleted list on refresh.',
      },
      {
        category: 'fix',
        title: 'Tooltip positioning',
        description: 'Info tooltips no longer appear offset from their icon when the page or table is scrolled.',
      },
      {
        category: 'improvement',
        title: 'Loot management pagination',
        description: 'The item list now scrolls to the top when changing pages, and the pagination bar takes up less space.',
      },
      {
        category: 'fix',
        title: 'Guild creation and permissions',
        description: 'Fixed guild creation failing when Discord auto-verification was missing, and fixed officer permissions when the membership record was out of sync.',
      },
    ],
  },
  {
    date: 'March 15, 2026',
    items: [
      {
        category: 'feature',
        title: 'Remove items from approved loot lists',
        description: 'Officers can now remove individual items from a raider\'s approved loot list without requiring a full resubmission.',
      },
      {
        category: 'improvement',
        title: 'Mobile layout fixes',
        description: 'Fixed guild cards overlapping on the profile page, improved overview page for smaller screens, and prevented background scrolling when modals are open (including iOS).',
      },
      {
        category: 'improvement',
        title: 'Faster page loads',
        description: 'Optimized Largest Contentful Paint and reduced layout shift across the app.',
      },
      {
        category: 'improvement',
        title: 'Cleaner Master Sheet ranks',
        description: 'Simplified rank display in the Master Sheet summary view.',
      },
    ],
  },
  {
    date: 'March 11, 2026',
    items: [
      {
        category: 'fix',
        title: 'Raid tracking reliability',
        description: 'Fixed attendance entered on the raid tracking page not appearing on the attendance page. Resolved an issue where the first scheduled raid day of the week could disappear from both pages.',
      },
      {
        category: 'improvement',
        title: 'Guardian conversion banner',
        description: 'The officer banner now lists unconverted Feral Druids by name with quick actions to convert or dismiss each one.',
      },
    ],
  },
  {
    date: 'March 10, 2026',
    items: [
      {
        category: 'feature',
        title: 'Role-based score modifiers',
        description: 'Officers can assign score bonuses or penalties by role (tank, healer, physical DPS, caster DPS). Useful for incentivizing underrepresented roles.',
      },
      {
        category: 'feature',
        title: 'Guardian Druid',
        description: 'Guardian is now a separate spec from Feral. Existing Feral Druids are prompted to choose between DPS (Feral) and Tank (Guardian).',
      },
      {
        category: 'feature',
        title: 'Death Knight and Monk',
        description: 'Full class and spec support for WotLK and MoP expansions.',
      },
      {
        category: 'improvement',
        title: 'Faster page loads',
        description: 'Lazy-loaded item icon data and memoized expensive computations on the raid tracking page.',
      },
      {
        category: 'improvement',
        title: 'Full loot in Discord summaries',
        description: 'Raid summaries posted to Discord now show all awarded items instead of truncating.',
      },
      {
        category: 'fix',
        title: 'Master Sheet accuracy',
        description: 'Fixed awarded items not being removed from the sheet, and the wrong entry being removed when the same item appeared at multiple ranks.',
      },
      {
        category: 'fix',
        title: 'Guild settings region',
        description: 'Fixed realm region reverting to US when saving other guild settings.',
      },
      {
        category: 'fix',
        title: 'Overview filtering',
        description: 'Fixed awarded items still appearing in "Next in line" across tiers.',
      },
      {
        category: 'fix',
        title: 'Stale data on guild switch',
        description: 'Switching between guilds no longer shows leftover data from the previous guild.',
      },
    ],
  },
  {
    date: 'March 9, 2026',
    items: [
      {
        category: 'feature',
        title: 'Cataclysm and Mists of Pandaria',
        description: 'Full loot data for both expansions. 978 items across 5 Cata raids and 1,705 items across 5 MoP raids.',
      },
      {
        category: 'feature',
        title: 'Character aliases',
        description: 'Map alternate names (alts, name changes) so imported attendance and loot auto-resolves to the right member. Unmatched names trigger a step-through picker during import.',
      },
      {
        category: 'improvement',
        title: 'Boss and tier icons',
        description: 'Added boss portraits and raid tier icons for WotLK, Cataclysm and Mists of Pandaria.',
      },
      {
        category: 'improvement',
        title: 'Karazhan loot data',
        description: 'Added 19 missing items from Karazhan.',
      },
      {
        category: 'fix',
        title: 'Date handling overhaul',
        description: 'Fixed 12 timezone bugs that caused dates to shift by a day in US timezones.',
      },
      {
        category: 'fix',
        title: 'Loot history reliability',
        description: 'Fixed loot history and Master Sheet showing zero results for some guilds.',
      },
      {
        category: 'fix',
        title: 'Officer data writes',
        description: 'Fixed attendance, signups and loot imports failing silently for officers.',
      },
      {
        category: 'fix',
        title: 'Onboarding modal in Firefox',
        description: 'Fixed the close button being unclickable in Firefox.',
      },
    ],
  },
  {
    date: 'March 8, 2026',
    items: [
      {
        category: 'feature',
        title: 'Wrath of the Lich King',
        description: 'Full loot data for all 5 phases, from Naxxramas through Ruby Sanctum. 1,353 items across 8 raids.',
      },
      {
        category: 'feature',
        title: 'Submission diff tracking',
        description: 'Officers can see exactly what changed when a raider resubmits their loot list. Added items, removed items and rank changes are highlighted.',
      },
      {
        category: 'improvement',
        title: 'Loot submissions grouped by phase',
        description: 'Pending submissions are now organized by phase group with raid icons for easier review.',
      },
      {
        category: 'fix',
        title: 'Attendance scores for imported raids',
        description: 'Members with retroactively imported attendance now get proper credit. Fair mode no longer ignores raids that happened before a member joined the app.',
      },
      {
        category: 'fix',
        title: 'Loot history loading',
        description: 'Fixed an issue where the loot history tab showed zero results despite imported loot existing.',
      },
      {
        category: 'fix',
        title: 'Item slot swap on submissions',
        description: 'Fixed items in the same rank appearing flip-flopped (Item #1 and #2 swapped) when officers reviewed a submission.',
      },
    ],
  },
  {
    date: 'February 28, 2026',
    items: [
      {
        category: 'feature',
        title: 'First character prompt',
        description: 'New guild members without a character now see a creation modal automatically on first login.',
      },
      {
        category: 'fix',
        title: 'TBC loot data overhaul',
        description: 'Fixed 10 incorrect item tooltips across SSC and TK, removed encounter-phase weapons that aren\'t real drops, and verified all P3-P5 items.',
      },
      {
        category: 'fix',
        title: 'Loot history access',
        description: 'Fixed an issue where new guild members couldn\'t view loot history.',
      },
      {
        category: 'fix',
        title: 'Guild settings reliability',
        description: 'Officer changes to guild settings now save consistently.',
      },
      {
        category: 'fix',
        title: 'Item classification permissions',
        description: 'Guild creators can now manage item classifications without needing an explicit officer role.',
      },
    ],
  },
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
