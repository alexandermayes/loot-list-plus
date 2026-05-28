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
    date: 'May 28, 2026',
    items: [
      {
        category: 'feature',
        title: 'Drag-and-drop loot list reordering',
        description: 'Rearrange ranked items by dragging them. No more deleting and re-adding to fix a slot.',
      },
      {
        category: 'feature',
        title: 'Donations bonus on Loot Score',
        description: 'Officers can credit bank donations as a configurable Loot Score bonus. Set the rules in the Donations tab under loot management.',
      },
      {
        category: 'feature',
        title: 'Discord slash commands',
        description: 'Use /score and /priority in your guild\'s Discord to check your Loot Score, attendance ratio, and next-in-line items without opening the app.',
      },
      {
        category: 'feature',
        title: 'Loot awards posted to Discord',
        description: 'Awarded items now announce to a configurable channel in your guild\'s Discord with the item link, winner, and source.',
      },
      {
        category: 'feature',
        title: 'Bonus raid days',
        description: 'Add one-off raid sessions outside your regular schedule. They appear on raid tracking and feed into attendance.',
      },
      {
        category: 'feature',
        title: 'Per-character role and team',
        description: 'Assign role and raid team per character, not per account. Alt-tanks and split rosters now score correctly, and individual characters can be removed from the guild without touching the rest.',
      },
      {
        category: 'feature',
        title: 'Team-aware attendance scoring',
        description: 'Master sheet, overview, attendance grid, addon export, and Discord /score now compute attendance per raid team instead of pooling all raid days.',
      },
      {
        category: 'improvement',
        title: 'Big performance pass',
        description: 'Server-rendered page headers, code-split modals and tabs, cached layout prefetch, and PostHog deferred so it no longer blocks LCP. Noticeably faster overview, loot list, master sheet, loot management, attendance, profile, and submissions pages.',
      },
      {
        category: 'improvement',
        title: 'Reset week excluded from attendance',
        description: 'The in-progress reset week no longer counts toward your attendance score, so prio doesn\'t shuffle mid-raid on reset day.',
      },
      {
        category: 'improvement',
        title: 'Late penalty applies in all attendance modes',
        description: 'Late raids now reduce attendance credit under linear and breakpoint modes, not just the legacy mode.',
      },
      {
        category: 'improvement',
        title: 'Raid tracking polish',
        description: 'Week headers show a date range plus a "This week"/"Last week" tag and an inline raid/attended/loot summary, top 2 weeks auto-expand, and per-raid actions tuck into an overflow menu. Plus a spinner on the Import button while it prepares.',
      },
      {
        category: 'improvement',
        title: 'Number-key shortcuts in attendance grid',
        description: 'Hover any cell and press 1-5 to cycle status. Two-handed officer workflow.',
      },
      {
        category: 'improvement',
        title: 'Alts always visible in member manager',
        description: 'Alts now render as their own rows instead of being tucked under a main. Toolbar pins to the top and alts collapse by default.',
      },
      {
        category: 'improvement',
        title: 'Pagination past 1000 rows everywhere',
        description: 'Attendance, master sheet, overview, dashboard, loot management, and admin analytics now paginate past the Supabase 1000-row default. Large guilds finally see complete data.',
      },
      {
        category: 'improvement',
        title: 'Bosses ordered by pull progression',
        description: 'WotLK, Cataclysm, and MoP raids now list bosses in the order most guilds clear them, not alphabetically.',
      },
      {
        category: 'improvement',
        title: 'Item dropdown stays on screen',
        description: 'Item search dropdowns near the bottom of the page now flip upward and clamp to the viewport instead of getting cut off.',
      },
      {
        category: 'improvement',
        title: 'Report bugs from Discord',
        description: 'React with 🐛 or 💡 to any message in the LootList+ Discord and the bot files a GitHub issue with a thread link. It also stamps (FIXED) or (CLOSED) on the thread title when the issue ships.',
      },
      {
        category: 'fix',
        title: 'Best-rank wins on Overview',
        description: 'When the same item appears at two ranks on your loot list, the Overview now picks the higher rank for "next in line" instead of the lower one.',
      },
      {
        category: 'fix',
        title: 'Item classifications under custom role names',
        description: 'Editing item classifications no longer fails for officers whose role name was customized away from the default.',
      },
      {
        category: 'fix',
        title: 'Tier 16 Heroic tokens cost an allocation point',
        description: 'Heroic Siege of Orgrimmar tier tokens are now Limited, matching the rest of the tier 16 ruleset.',
      },
      {
        category: 'fix',
        title: 'Tier token class coverage',
        description: 'Backfilled missing class assignments on Wrath T8 Wayward, T9 Regalia, Death Knight Vanquisher, Monk Protector, and several MoP Int/Agi specs. If a token wasn\'t showing up for your class, it should now.',
      },
      {
        category: 'fix',
        title: 'Wildfury Greatstaff source',
        description: 'No longer appears in both SSC and TK, just where it actually drops.',
      },
      {
        category: 'fix',
        title: 'Discord connection status',
        description: 'The guild Discord link now reflects connection state accurately and offers a reconnect path when the OAuth round-trip drops.',
      },
    ],
  },
  {
    date: 'May 18, 2026',
    items: [
      {
        category: 'feature',
        title: 'Guild recruitment blog post',
        description: '"How to Recruit for Your WoW Guild" is live on the blog with full SEO and sitemap coverage.',
      },
      {
        category: 'improvement',
        title: 'Class-colored submission DMs',
        description: 'Discord submission notifications now use rich embeds colored by the submitter\'s class, both for the submitter\'s receipt and the officer alert. Spot who submitted what at a glance.',
      },
      {
        category: 'improvement',
        title: 'Submission alerts follow the permission',
        description: 'Anyone with the manage submissions permission now gets pinged for new submissions, not just Officers and Guild Masters.',
      },
      {
        category: 'improvement',
        title: 'More Warcraft Logs URL formats',
        description: 'Paste your guild\'s profile, reports list, calendar, or ID page from WCL and we\'ll link the matching report. The error message is also clearer when a URL can\'t be read.',
      },
      {
        category: 'improvement',
        title: 'Attendance window respects expansion start',
        description: 'Attendance ratios now begin counting from each expansion\'s raid start date, so seasons that have just launched don\'t show stale numbers.',
      },
      {
        category: 'improvement',
        title: 'Award decisions in the audit log',
        description: 'Each loot award now writes a structured decision receipt to the audit log so you can review exactly what was awarded.',
      },
      {
        category: 'fix',
        title: 'Stable pagination',
        description: 'Tables no longer shuffle rows when you change pages. Every paginated query now uses a deterministic sort.',
      },
      {
        category: 'fix',
        title: 'Item counts on submissions and history',
        description: 'Submissions and master sheet history now show the correct item counts. Some views were previously displaying 0 or wrong totals.',
      },
      {
        category: 'fix',
        title: 'Master sheet capacity and orphans',
        description: 'Master sheet no longer drops raiders past 1000 items or hides raiders whose submissions referenced removed characters.',
      },
      {
        category: 'fix',
        title: 'Loot pill overlap on raid tracking',
        description: 'Long lists of inline loot pills are now capped so they no longer overlap other content on the raid tracking page.',
      },
      {
        category: 'fix',
        title: 'Auto-reject submissions for removed characters',
        description: 'When a character is removed from your active raid roster, their pending submissions are now auto-rejected instead of staying stuck in review.',
      },
      {
        category: 'fix',
        title: 'Twinblade of the Phoenix slot',
        description: 'Now correctly listed as a two-handed weapon. It was showing as one-handed in TBC loot lists.',
      },
    ],
  },
  {
    date: 'May 13, 2026',
    items: [
      {
        category: 'feature',
        title: 'Configurable bracket limits',
        description: 'Officers can now customize allocation point caps, token limits, and per-category restrictions for each loot list bracket. Defaults still match the standard 50-39 ranking system.',
      },
      {
        category: 'feature',
        title: 'Auto-promote trial members',
        description: 'Turn on "new members start as trial" in guild settings and members automatically promote to full status when their trial period ends.',
      },
      {
        category: 'feature',
        title: 'Two new blog posts',
        description: '"How to Run Loot Without a Spreadsheet" and "How to Handle Loot Drama Without Losing Raiders" are live on the blog.',
      },
      {
        category: 'improvement',
        title: 'Auto-save loot settings',
        description: 'Phase deadlines, raid tier toggles, and loot rules now save automatically as you change them. Save status moved into the modal header so you always know your changes persisted.',
      },
      {
        category: 'improvement',
        title: 'Audit log redesigned',
        description: 'The audit log is now an activity feed with clearer event grouping and faster scanning.',
      },
      {
        category: 'improvement',
        title: 'Onboarding flow polish',
        description: 'Welcome screen redesigned to reduce drop-off between signup and guild creation. Setup guide steps are clearer, and the first-character modal handles dismissal correctly.',
      },
      {
        category: 'improvement',
        title: 'Smoother loading states',
        description: 'Replaced the logo spinner with skeleton loaders tailored to each page. Routes now show structure instantly while data fetches in the background.',
      },
      {
        category: 'improvement',
        title: 'Granular submission permissions',
        description: 'Manage submissions is now a separate permission from manage loot. Officers can review submissions without getting access to settings and roster management.',
      },
      {
        category: 'improvement',
        title: 'Sidebar updates',
        description: 'Give feedback moved from a floating button to the sidebar nav. A subtle fade gradient at the bottom hints at scrollable content.',
      },
      {
        category: 'improvement',
        title: 'Faster page loads',
        description: 'Eliminated redundant auth network calls and added optimistic updates for team and role changes.',
      },
      {
        category: 'fix',
        title: 'Trial penalty missing on master sheet',
        description: 'Trial penalties were silently dropped due to an RLS issue, so trial members showed inflated scores. Now applied correctly across all views.',
      },
      {
        category: 'fix',
        title: 'Off-spec bracket items',
        description: 'The off-spec bracket now shows all items your class can equip, not just a filtered subset.',
      },
      {
        category: 'fix',
        title: 'Submission item counts',
        description: 'Loot submissions occasionally showed 0 items due to a 1000-row default limit from Supabase. Counts now load reliably regardless of submission size.',
      },
      {
        category: 'fix',
        title: 'Deadline timezone drift',
        description: 'Setting a phase deadline could shift the displayed date by a day in some timezones. Now stored and shown consistently.',
      },
      {
        category: 'fix',
        title: 'Custom role permissions',
        description: 'Renaming a custom role now propagates everywhere it appears, and a missing default role no longer locks members out.',
      },
      {
        category: 'fix',
        title: 'Roster management for non-officers',
        description: 'Members with the manage roster permission can now add and remove characters from the guild, not just officers.',
      },
      {
        category: 'fix',
        title: 'Modal layout polish',
        description: 'Modal backdrops cover the full viewport even when content scrolls, and the submission detail modal now has a properly sticky table header.',
      },
    ],
  },
  {
    date: 'May 5, 2026',
    items: [
      {
        category: 'feature',
        title: 'Filter loot submissions by raid team',
        description: 'Officers can now filter the Loot Submissions page by raid team, so you only see submissions from the team you manage.',
      },
      {
        category: 'feature',
        title: 'Granular officer permissions',
        description: 'Guild Masters can now assign specific permissions to officers (manage loot, attendance, roster, settings) instead of all-or-nothing access.',
      },
      {
        category: 'feature',
        title: 'Reserve run management from the join page',
        description: 'Reserve run creators can now manage submissions, toggle visibility, and update settings directly from the join page without leaving it.',
      },
      {
        category: 'improvement',
        title: 'Any guild member can create reserve runs',
        description: 'Reserve runs are no longer restricted to officers. Any member can create and manage their own runs.',
      },
      {
        category: 'improvement',
        title: 'Missed raid dates on the overview',
        description: 'Your attendance widget now shows which specific raids you missed, with dates and reasons (absent, late, excused).',
      },
      {
        category: 'improvement',
        title: 'Revamped member list',
        description: 'The guild members list now includes search, sorting, class icons, and raid team assignments for easier management.',
      },
      {
        category: 'improvement',
        title: 'Reserve join page auto-refreshes',
        description: 'The reserve join page now polls for new submissions every 15 seconds, so you see updates without manually refreshing.',
      },
      {
        category: 'improvement',
        title: 'UI polish pass',
        description: 'Smoother modal animations, balanced text wrapping on headings, tabular number alignment on scores, and subtle icon outlines across the app.',
      },
    ],
  },
  {
    date: 'April 28, 2026',
    items: [
      {
        category: 'feature',
        title: 'Crafting materials in loot tables',
        description: 'Raid loot tables now include crafting materials so you can rank them on your loot list alongside gear.',
      },
      {
        category: 'feature',
        title: 'Dual-wield weapon listing',
        description: 'Classes that can dual-wield can now list the same one-handed weapon twice on their loot list.',
      },
      {
        category: 'feature',
        title: 'Score breakdown for all members',
        description: 'Click any member\'s score on the Master Sheet to see a full breakdown, not just your own. Gap explanations show how far each player is from the one above.',
      },
      {
        category: 'improvement',
        title: 'Faster page loads across the app',
        description: 'Server-side data prefetching, code-split settings pages, parallelized dashboard queries, and collapsed API waterfalls on loot list and loot settings pages.',
      },
      {
        category: 'improvement',
        title: 'Smaller landing page',
        description: 'Converted landing images from PNG to WebP (21MB down to 3.7MB), optimized fonts, and improved caching for faster first load.',
      },
      {
        category: 'improvement',
        title: 'Reserve run creation wizard',
        description: 'Creating a reserve run now uses a step-by-step wizard with smart defaults instead of a single long form.',
      },
      {
        category: 'improvement',
        title: 'Gargul SoftRes export',
        description: 'Reserve run exports now use the real Gargul SoftRes format for direct addon import.',
      },
      {
        category: 'fix',
        title: 'Auth redirect loop resolved',
        description: 'Fixed an issue where stale auth cookies could cause a login redirect loop. Sessions now clean up correctly across devices.',
      },
      {
        category: 'fix',
        title: 'Reserve submission reliability',
        description: 'Fixed reserve submissions failing for some users due to a database index conflict.',
      },
      {
        category: 'fix',
        title: 'Attendance import no longer deletes no-shows',
        description: 'Importing loot-only data for a raid no longer wipes existing no-show attendance records.',
      },
      {
        category: 'fix',
        title: 'Login button visible on mobile',
        description: 'The login button on the landing page is now visible on small screens.',
      },
    ],
  },
  {
    date: 'April 9, 2026',
    items: [
      {
        category: 'feature',
        title: 'Reserve runs',
        description: 'Create soft reserve runs for any raid, share a public link, and players reserve items without needing a LootList+ account. Includes per-item caps, class restrictions, hard reserves, Gargul and WeakAura exports, CSV, audit log, and a raid leader token so co-leaders can lock and award without full officer access.',
      },
      {
        category: 'feature',
        title: 'Logged-in users auto-fill their reserves',
        description: 'If you have a character in the run\'s guild, the reserve form pre-selects it with class color and spec. Pick "+ Use a different character" in the dropdown to submit as a guest alt that isn\'t tracked in LootList+.',
      },
      {
        category: 'feature',
        title: 'Reserve links unfurl in Discord',
        description: 'Pasting a reserve share link in Discord now shows the raid icon, guild name, raid time, and lock status as a link preview.',
      },
      {
        category: 'feature',
        title: 'Locked reserve board',
        description: 'When a run locks, the public page pivots to a reserve board grouped by item and sorted by most contested, with awards rendered inline. A "By player" toggle keeps the old view, and your own submission is highlighted in both.',
      },
      {
        category: 'improvement',
        title: 'Award flow upgrades',
        description: 'The Item Candidate modal now has keyboard shortcuts, a top-2 comparison card, inline score explanations, award notes, and BLP status. Recent awards can be undone from a toast, and the award button is now primary and visible on hover.',
      },
      {
        category: 'improvement',
        title: 'Master Sheet tied and gap indicators',
        description: 'Tied scores show a dice badge on every tied candidate, and the table now shows how far each player is from the next one above them. Both work on the mobile card view too.',
      },
      {
        category: 'improvement',
        title: 'Overview page redesign',
        description: 'The overview now leads with the info a raider actually cares about: their next-in-line item, current Loot Score, and upcoming raid night, with a tighter meta line.',
      },
      {
        category: 'improvement',
        title: 'Item priorities now add points directly',
        description: 'Guild item priorities are treated as direct point bonuses on Loot Score instead of a separate tiebreaker, so officers can see the weight they\'re applying in real numbers.',
      },
      {
        category: 'improvement',
        title: 'Faster landing page on mobile',
        description: 'Landing page LCP is down significantly on mobile. Static rewrite via middleware, WebP poster, lazy-loaded below-fold sections, and CSS animations in place of framer-motion on the hero.',
      },
      {
        category: 'improvement',
        title: 'Next.js 16 and security hardening',
        description: 'Upgraded to Next.js 16.1.7, closed 12 CodeQL alerts, added a responsible disclosure policy, and fixed all dependency vulnerabilities.',
      },
      {
        category: 'fix',
        title: 'Attendance correctness fixes',
        description: 'Capped attendance at 100% so fill-ins can\'t push a player over the denominator, fixed timezone drift on raid event dates, and corrected the tracked raids count so it matches the overview.',
      },
    ],
  },
  {
    date: 'April 3, 2026',
    items: [
      {
        category: 'improvement',
        title: 'Landing page polish',
        description: 'Floating items now react to your mouse, click to interact with them, and stay contained on ultra-wide monitors. Items updated to iconic WoW legendaries.',
      },
      {
        category: 'feature',
        title: 'New blog post: DKP Is Dead',
        description: 'A guide to what Classic guilds are running instead of DKP in 2026, and why priority lists are winning.',
      },
    ],
  },
  {
    date: 'April 1, 2026',
    items: [
      {
        category: 'feature',
        title: 'Personalized greetings',
        description: 'The overview greeting now adapts to your faction, class, and time of day. Horde players see Horde greetings, Alliance see Alliance, and your class gets its own lines too.',
      },
      {
        category: 'feature',
        title: 'Boss quotes on the Master Sheet',
        description: 'Expanding a boss section now shows an iconic quote from that boss. Over 100 quotes from Classic through Mists of Pandaria.',
      },
      {
        category: 'feature',
        title: 'Loot award glow',
        description: 'Newly awarded items in loot history now briefly glow when they first appear, so you can spot fresh awards at a glance.',
      },
      {
        category: 'feature',
        title: 'Tied score indicator',
        description: 'When players have the same Loot Score on the Master Sheet, a dice icon now appears next to their score.',
      },
      {
        category: 'improvement',
        title: 'Hearthstone logout',
        description: 'Logging out now shows a hearthstone cast bar instead of a generic loading spinner.',
      },
      {
        category: 'improvement',
        title: 'Dynamic overview subtitle',
        description: 'The overview subtitle now shows contextual info like upcoming raid nights, Loot List deadlines, pending reviews, or your #1 priority item.',
      },
      {
        category: 'improvement',
        title: 'Help page tips',
        description: 'The help page now shows a random loading-screen-style tip about LootList+ features below the search bar.',
      },
      {
        category: 'improvement',
        title: 'Better empty states and toast messages',
        description: 'Empty states and success notifications across the app now use clearer, more helpful copy that guides you to the next action.',
      },
      {
        category: 'improvement',
        title: 'Landing page redesign',
        description: 'Completely redesigned landing page with new layout, animations, and interactive feature previews.',
      },
      {
        category: 'improvement',
        title: 'Faster page loading',
        description: 'Replaced the fullscreen loading spinner with a skeleton app shell that renders instantly while data loads in the background.',
      },
      {
        category: 'feature',
        title: 'Hidden surprises',
        description: 'We hid a few things around the app for you to find. Keep your eyes open.',
      },
      {
        category: 'fix',
        title: 'Multi-device logout fixed',
        description: 'Logging out on one device no longer causes auth errors on other devices. Sessions are now properly cleaned up.',
      },
      {
        category: 'fix',
        title: 'Character switching fully reloads page data',
        description: 'Switching characters now triggers a full page remount so all data refreshes correctly, matching guild switch behavior.',
      },
    ],
  },
  {
    date: 'March 30, 2026',
    items: [
      {
        category: 'fix',
        title: 'Candidate comparison shows correct recent awards',
        description: 'The "Recent awards" section in the item comparison modal was showing random recent loot instead of awards for the specific item. Now correctly filtered.',
      },
      {
        category: 'fix',
        title: 'Navigation stays fresh after updates',
        description: 'Clicking between pages after a site update no longer shows stale or broken content. The app now detects new deployments and refreshes automatically.',
      },
    ],
  },
  {
    date: 'March 29, 2026',
    items: [
      {
        category: 'fix',
        title: 'Bad luck protection now works',
        description: 'BLP was only updating from one of seven loot award paths. Now handled server-side so every loot award correctly increments BLP for non-winners and resets for winners.',
      },
      {
        category: 'improvement',
        title: 'BLP display clarified',
        description: 'BLP is no longer shown as a confusing global modifier in the score breakdown. It now appears per item in your "Next in line" section where it makes sense.',
      },
      {
        category: 'improvement',
        title: 'Help center updated',
        description: 'New FAQ articles for "What is Bad Luck Protection?" and "Why can\'t I select an item?" plus updated articles covering Raid Mode, excused absences, priorities, and more.',
      },
      {
        category: 'improvement',
        title: 'Comma and semicolon attendance import',
        description: 'Paste attendance names separated by commas, semicolons, or one per line. Previously only newlines worked despite the placeholder saying otherwise.',
      },
      {
        category: 'fix',
        title: 'Shamans blocked from Mail items',
        description: 'Items with "gauntlets" in the name were incorrectly classified as Plate armor, preventing Mail-wearing classes from selecting them.',
      },
      {
        category: 'fix',
        title: 'Navigation breaking after overnight tab',
        description: 'Leaving the app open in a background tab overnight no longer requires a hard refresh. The app now detects expired sessions and redirects to login automatically.',
      },
      {
        category: 'fix',
        title: 'Rejecting a never-approved resubmission',
        description: 'Officers could not reject a list that was edited and resubmitted before first approval. Now falls back to a normal rejection instead of showing "No snapshot found."',
      },
      {
        category: 'fix',
        title: 'Wildfury Greatstaff boss fix',
        description: 'Moved from Leotheras the Blind to Trash drops where it belongs.',
      },
      {
        category: 'improvement',
        title: 'Faster page loads',
        description: 'Overview and Loot Management pages load faster. Stats and character card render immediately while score insights load in the background.',
      },
    ],
  },
  {
    date: 'March 27, 2026',
    items: [
      {
        category: 'feature',
        title: 'Item candidate comparison',
        description: 'Officers can click any item on the Master Sheet to see all ranked candidates with full score breakdowns, eligibility badges, priority rules, and recent award history.',
      },
      {
        category: 'feature',
        title: 'Raid mode',
        description: 'New compact view on the Master Sheet for use during raids. Searchable item list with top 3 candidates per item. Click to open the full comparison.',
      },
      {
        category: 'feature',
        title: 'Setup guide for new guilds',
        description: 'Officers see a 5-step progress tracker on the Overview page that auto-checks as you invite raiders, set raid days, get loot lists, and log your first raid.',
      },
      {
        category: 'improvement',
        title: 'Role-aware onboarding',
        description: 'The welcome tutorial now shows different content for officers (admin checklist) and raiders (how to submit your first loot list).',
      },
      {
        category: 'improvement',
        title: 'Smarter empty states',
        description: 'Empty Master Sheet and Loot List pages now show role-specific guidance. Officers see "check submissions," raiders see "create my loot list."',
      },
      {
        category: 'fix',
        title: 'Audit log search accuracy',
        description: 'Search was matching unrelated logs when any character name appeared in results. Now matches only the specific log entry. Search window also increased from 200 to 2000 entries.',
      },
      {
        category: 'fix',
        title: 'Priority list showing only your own character',
        description: 'The individual raiders dropdown in loot management only showed the current user. Now shows all guild members.',
      },
      {
        category: 'fix',
        title: 'Date handling corrections',
        description: 'Fixed a timezone issue where loot award dates could shift by one day for users in US timezones.',
      },
    ],
  },
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
