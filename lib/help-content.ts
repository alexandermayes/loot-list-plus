/**
 * Help Center Content
 *
 * All help articles and categories are defined here.
 * To add a new article, add it to the appropriate category's articles array.
 */

export interface HelpArticle {
  slug: string
  title: string
  description: string
  content: string // Markdown content
}

export interface HelpCategory {
  id: string
  title: string
  description: string
  icon: string // HugeIcon name (we'll map to actual icons in the component)
  articles: HelpArticle[]
}

export const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of LootList+ and set up your account',
    icon: 'RocketIcon',
    articles: [
      {
        slug: 'welcome',
        title: 'Welcome to LootList+',
        description: 'An introduction to LootList+ and its features',
        content: `
# Welcome to LootList+

LootList+ is a loot priority system for World of Warcraft guilds. It speeds up raid loot distribution, sets clear expectations and removes drama.

- **Loot Lists** - Raiders rank items by priority before raids
- **Attendance tracking** - Attendance factors into your Loot Score automatically
- **Loot Score** - A transparent formula combining ranking, attendance and role modifiers
- **Master Sheet** - Officers see everyone's priorities at a glance during raids

## How it works

1. **Join a guild** using an invite code or Discord
2. **Create a character** and pick your class and spec
3. **Submit your Loot List** ranking items from 50 (highest) to 1 (lowest)
4. **Officers review** and approve your list
5. **During raids**, the Master Sheet shows who gets priority on each drop

## Your dashboard

The **Overview** page is your home base. It shows:

- Your Loot Score breakdown (ranking + attendance + modifiers)
- Attendance snapshot and progress
- Top 5 items you're next in line for
- Recently received loot
- Any Loot Lists that need your attention

Ready to get started? Check out the guides below.
        `,
      },
      {
        slug: 'joining-a-guild',
        title: 'Joining a guild',
        description: 'How to join an existing guild using an invite code or Discord',
        content: `
# Joining a guild

If your guild already uses LootList+, you can join with an invite code or through Discord.

## Using an invite code

1. Ask your guild officer for an invite code
2. On the welcome screen, paste the code into the **Join with code** field
3. Click **Join**

## Using Discord

If your guild has Discord integration enabled:

1. Click **Select guild** on the welcome screen
2. LootList+ checks which Discord servers you're in and matches them with guilds
3. Pick your guild and click **Join**

If no guilds appear, your Discord servers may not have LootList+ linked yet. Ask your guild officer to enable Discord integration or give you an invite code.

## After joining

Once you're in a guild:

1. Create a character using the character selector in the sidebar
2. Submit your Loot Lists for active raid phases
3. Check the **Overview** page to see your Loot Score and priorities

## Multiple guilds

You can be a member of multiple guilds. Switch between them using the guild selector at the top of the sidebar. Each guild has its own Loot Lists, attendance and settings.
        `,
      },
      {
        slug: 'creating-a-character',
        title: 'Creating a character',
        description: 'How to add your WoW characters to LootList+',
        content: `
# Creating a character

Characters are how you submit Loot Lists and track your priority.

## Adding a new character

1. Click the **character selector** in the sidebar
2. Click **Create character**
3. Fill in your details:
   - **Name** - Your character's in-game name
   - **Class** - Your WoW class (warrior, paladin, etc.)
   - **Specialization** - Your spec (holy, arms, etc.)
   - **Main or alt** - Toggle whether this is your primary raider
4. Click **Create**

Your character is automatically added to your active guild and becomes your selected character.

## Main vs alt

Your **main** character is your primary raider. It's prioritized in the character selector and used for guild-wide views. You can change which character is your main anytime from the manage characters page.

## Managing characters

Open the character selector in the sidebar and click **Manage characters** to:

- Edit character details (class, spec, name)
- Switch between main and alt designation
- See which guilds each character belongs to

## Multiple characters in one guild

If you raid on alts, each character gets its own Loot List and attendance record. Use the character selector to switch between them.

## Adding a character to another guild

If a character exists but isn't in your current guild, it appears under "Not in [Guild Name]" in the character selector. Click the add button to join them to the guild.
        `,
      },
      {
        slug: 'profile-settings',
        title: 'Profile and preferences',
        description: 'Customize your account settings and appearance',
        content: `
# Profile and preferences

Access your profile by clicking your name at the bottom of the sidebar.

## Account tab

- **Discord connection** - Shows your linked Discord account and verification status
- **Sign out** - Log out of LootList+
- **Danger zone** - Disconnect Discord or permanently delete your account

## Preferences tab

- **Theme** - Choose between System, Light or Dark mode
- **Accent color** - Pick from 6 WoW item quality colors:
  - Legendary (orange, default)
  - Epic (purple)
  - Rare (blue)
  - Uncommon (green)
  - Artifact (gold)
  - Heirloom (cyan)

Your accent color applies to buttons, links, active states and focus rings across the app.

## Guilds tab

View all guilds you belong to, your role in each and leave guilds you no longer need. Guild Masters can't leave directly. Transfer ownership or delete the guild from Guild Settings first.
        `,
      },
    ],
  },
  {
    id: 'loot-lists',
    title: 'Loot Lists',
    description: 'Submit and manage your item priorities',
    icon: 'ScrollIcon',
    articles: [
      {
        slug: 'submitting-loot-list',
        title: 'Submitting a Loot List',
        description: 'How to rank items and submit your loot preferences',
        content: `
# Submitting a Loot List

Your Loot List tells officers which items you want and how badly you want them.

## How ranking works

Rank items from **50 (highest priority) to 1 (lowest priority)**. Each rank has 2 item slots. Higher number = higher priority.

## Creating your list

1. Go to **Loot List** from the sidebar
2. Select the phase you want to submit for
3. Browse items organized into bracket sections
4. Use the item dropdowns to place items into rank slots
5. Click **Submit for Review** when you're done

Your list auto-saves as a draft while you work.

## Brackets

Your list is divided into bracket sections, each with specific rules:

- **Brackets 1-4** (ranks 50-39) - Your highest priority items with allocation limits
- **No bracket** (ranks 38-25) - Main-spec items with no allocation limits
- **Off-spec** (ranks 24-1) - Lower priority items for guild flexibility

### Bracket rules (brackets 1-4 only)

Each bracket has a **3-point allocation limit**:
- **Reserved** items cost 1 point
- **Limited** items cost 1 point
- **Unlimited** items cost 0 points

You can also only have 1 item of each type per bracket (no duplicate weapon types), and Reserved items must be alone at their rank (no companion item in slot 2).

## Item classifications

Officers assign classifications to each item:

- **Reserved** - High-demand items. 1 allocation point, must be alone at rank.
- **Limited** - Moderate-demand items. 1 allocation point.
- **Unlimited** - Freely available items. 0 allocation points.

## Submission statuses

After submitting, your list goes through review:

- **Draft** - Saved but not submitted to officers
- **Pending** - Waiting for officer review
- **Approved** - Your list is active and counts toward priority
- **Needs revision** - Officers left feedback. Check review notes and resubmit.
- **Rejected** - The submission was rejected. Revise and resubmit.

## Tips

- **Rank honestly** based on actual upgrade value
- **Focus on your spec** and prioritize items that benefit your role
- **Check classifications** before spending allocation points
- **You don't need to fill every slot.** Only rank items you genuinely want.
- Use the **unranked items** sidebar (from the menu) to see what you haven't ranked yet
- Use **Import BIS** to pull your best-in-slot gear from WowSims
        `,
      },
      {
        slug: 'understanding-priority',
        title: 'Understanding Loot Score',
        description: 'How your Loot Score is calculated',
        content: `
# Understanding Loot Score

Your Loot Score determines where you stand in line for each item. It's fully transparent so there are no surprises.

## The formula

\`Loot Score = Rank + Attendance Score + Role Modifier - Trial Penalty + Bad Luck Bonus\`

### Rank

How high you ranked the item on your Loot List. Rank 50 = 50 points, rank 1 = 1 point. This is the biggest factor.

### Attendance score

Based on your raid attendance over a rolling window (e.g., last 4 weeks). Higher attendance = more points, up to a configurable max (commonly 8 points).

If your guild uses **attendance tiers**, reaching milestones (like "High" tier) unlocks bonus points.

### Role modifier

Guild-configured bonuses or penalties based on your role. Officers and Guild Masters may receive a small bonus.

### Trial penalty

New members marked as trials receive a score penalty. This resets once you're promoted to full member.

### Bad luck bonus

If enabled, you gain extra points the longer you go without receiving loot. Resets when you receive an item.

## Viewing your score

Check your Loot Score in several places:

- **Overview** - Score breakdown widget shows each component
- **Master Sheet** - Click any item to see the full score breakdown for all players wanting it
- **Next in line** - Your overview shows your top 5 priority items

## Ties

When players have the same Loot Score, they're tied for the item. Ties are broken by /roll.

## Improving your score

- **Show up to raids.** Attendance is the easiest way to boost your score.
- **Rank items thoughtfully.** High ranks on fewer items beats spreading thin.
- **Be patient.** Priority naturally improves as others receive items.
        `,
      },
    ],
  },
  {
    id: 'guild-management',
    title: 'Guild Management',
    description: 'For officers: configure your guild and manage loot',
    icon: 'Settings01Icon',
    articles: [
      {
        slug: 'guild-setup',
        title: 'Setting up your guild',
        description: 'Initial configuration for new guilds',
        content: `
# Setting up your guild

This guide is for guild officers setting up LootList+ for the first time.

## Step 1: Create the guild

1. On the welcome screen, click **Select guild** or use an invite code
2. If creating a new guild, enter your guild name, realm and faction
3. You'll automatically become the Guild Master

## Step 2: Configure your expansion

1. Open **Guild Settings** (gear icon next to your guild name in the sidebar)
2. In the Expansion section, select your current expansion
3. Set your **raid start date** and **raid schedule** (days per week, specific days, timezone)
4. Enable the raid tiers your guild is progressing through
5. Toggle **Loot** to include a tier in Loot Lists and **Ranks** to show rankings on the Master Sheet

## Step 3: Configure loot items

1. Go to **Loot Management** in the sidebar (officer-only section)
2. Browse items by raid tier
3. Set item classifications: Reserved, Limited or Unlimited
4. Assign primary and secondary specs to items (controls which classes can rank them)

## Step 4: Invite members

1. Open **Guild Settings** (gear icon in the sidebar)
2. Create invite codes with optional expiration and usage limits
3. Share codes with your raiders
4. Or set up **Discord integration** by adding your Discord server ID so members join automatically

## Step 5: Review and approve

Once members submit their Loot Lists:

1. Go to **Loot Submissions** in the sidebar
2. Review each submission for reasonable rankings
3. Approve, reject or request revisions with review notes
        `,
      },
      {
        slug: 'managing-members',
        title: 'Managing members',
        description: 'Roles, trials and member administration',
        content: `
# Managing members

Control who's in your guild and what they can do.

## Roles

- **Guild Master** - Full control over everything. Can delete the guild and transfer ownership.
- **Officer** - Can manage loot, approve submissions, track raids and manage members below their rank.
- **Member** - Can submit Loot Lists, view priorities and track attendance.

Custom roles can be created with positions between Officer and Member for more granular permissions.

## Adding members

Members join via:

- **Invite codes** - Generate in Guild Settings with optional expiration and max uses
- **Discord** - Automatic if you've linked your Discord server ID

## Managing members

1. Open **Guild Settings** (gear icon next to your guild name in the sidebar)
2. The members list shows all characters with their class, spec, role and trial status

From here you can:

- **Change roles** - Use the role dropdown (you can only assign roles below your own rank)
- **Toggle trial status** - Set new members as trials (they receive a Loot Score penalty) or promote to full member
- **Remove members** - Kick from the guild. They can rejoin with a new invite code.

## Trial system

Trial members receive a Loot Score penalty to give established raiders priority. The trial duration is tracked automatically. Officers can promote trials to full members at any time.

## Role manager

Open the role manager from Guild Settings to:

- Create custom roles (up to 10 total)
- Reorder role hierarchy
- Edit role names and colors
- Delete custom roles

## Danger zone (Guild Master only)

- **Transfer ownership** - Hand the guild to another member. You'll be demoted to Officer.
- **Delete guild** - Permanently removes the guild, all members, Loot Lists and attendance data. Requires typing the guild name to confirm.
        `,
      },
      {
        slug: 'reviewing-submissions',
        title: 'Reviewing loot submissions',
        description: 'How to review and approve Loot Lists from your raiders',
        content: `
# Reviewing loot submissions

Officers review Loot Lists before they become active on the Master Sheet.

## Finding submissions

1. Go to **Loot Submissions** in the sidebar (officer-only section)
2. Filter by phase or status: All, Pending, Approved, Rejected
3. Click a submission to view the full ranked list

## What to check

- **Rankings make sense for the class/spec** - A holy priest ranking a melee weapon is suspicious
- **Item classifications respected** - Reserved items should be high-priority picks
- **Reasonable spread** - Are they ranking enough items or only going for one thing?

## Actions

- **Approve** - The list becomes active and shows on the Master Sheet
- **Reject** - For invalid or problematic submissions
- **Review notes** - Add feedback in the text area before approving or rejecting. The raider sees these notes on their Loot List page.

## Bulk actions

- **Delete pending** - Remove all pending submissions at once
- **Delete all** - Clear all submissions for the selected phase

## Best practices

- Review submissions promptly so raiders can see their priority
- Be consistent with feedback across all members
- Communicate ranking guidelines before the submission deadline
        `,
      },
      {
        slug: 'loot-management',
        title: 'Loot Management',
        description: 'Configure items, classifications and spec assignments',
        content: `
# Loot Management

The Loot Management page lets officers configure which items are available and how they're classified.

## Accessing loot management

Go to **Loot Management** in the sidebar. This page is only visible to officers.

## Item classifications

Every item has a classification that affects how it can be ranked:

- **Reserved** (1 allocation point) - High-demand items. Must be placed alone at a rank (no companion item). Shown with a red badge.
- **Limited** (1 allocation point) - Moderate-demand items. Can share a rank with another item. Shown with an orange badge.
- **Unlimited** (0 allocation points) - Freely available items. No ranking restrictions. Shown with a green badge.

## Spec assignments

For each item, you can assign:

- **Primary specs** - The specs this item is intended for. Shown with green badges.
- **Secondary specs** - Alternative specs that can use the item. Shown with orange badges.

Spec assignments help raiders know which items are relevant to them.

## Stats dashboard

The top of the page shows:
- Total items count
- Available items
- Reserved items
- Limited items

## Filtering

Use the search bar to find items by name or boss, and filter by raid tier.
        `,
      },
    ],
  },
  {
    id: 'raids',
    title: 'Raids & Attendance',
    description: 'Track attendance and manage raid nights',
    icon: 'Calendar01Icon',
    articles: [
      {
        slug: 'attendance-tracking',
        title: 'Attendance tracking',
        description: 'How attendance affects your Loot Score',
        content: `
# Attendance tracking

Attendance rewards players who consistently show up to raids.

## How it works

Your guild tracks raid attendance over a **rolling window** (e.g., last 4 weeks). Your attendance score factors directly into your Loot Score.

## Attendance statuses

Officers mark each raider with one of these statuses per raid:

- **Attended** - You were at the raid
- **Late** - You showed up but arrived late
- **Benched** - You were online but sat out (partial credit)
- **Signed up** - You signed up but didn't attend
- **No-show** - Missed without notice

## Viewing your attendance

Check your attendance in two places:

- **Overview** - Shows your attendance percentage, raids attended count and progress toward the next tier (if your guild uses attendance tiers)
- **Attendance** page - Shows the full attendance grid with raids grouped by week

## Attendance tiers

If your guild uses the breakpoint attendance mode, reaching milestones unlocks bonus points:

- **High tier** - Maximum attendance bonus (e.g., +8 pts)
- **Mid tier** - Moderate bonus (e.g., +5 pts)
- **Low tier** - Small bonus (e.g., +2 pts)

Your Overview page shows how many more raids you need to reach the next tier.

## New member handling

Guilds can configure how new members are scored:

- **Raw** - Count all raids from the start of the rolling window
- **Fair** - Only count raids after you joined
- **Minimum gate** - Only count after joining, with a minimum raid threshold

## For officers

Track attendance from the **Raid Tracking** page in the sidebar. Create raid events, mark attendance for each member and record loot drops.
        `,
      },
      {
        slug: 'raid-tracking',
        title: 'Raid tracking for officers',
        description: 'How to log raids, track attendance and record loot',
        content: `
# Raid tracking for officers

The Raid Tracking page is where officers log raids, record attendance and track loot distribution.

## Accessing raid tracking

Go to **Raid Tracking** in the sidebar. This page is only visible to officers.

## Creating raid events

Log each raid night with:

- **Date** - When the raid happened
- **Notes** - Optional details about the run
- **Skip raid** - Mark a scheduled raid as cancelled with a reason

## Recording attendance

For each raid event, mark every member's status:

- **Signed up** - Member signed up for the raid
- **Attended** - Member was present
- **No-show** - Member didn't show without notice
- **Late** - Member arrived late
- **Benched** - Member was available but sat out

## Recording loot

When items drop, record who received them:

- Select the character who received the item
- Select the item from the loot table
- Award date is tracked automatically

## Loot history

The loot history tab shows all awarded items with:

- Character name (colored by class)
- Item name with Wowhead tooltip
- Award date

## Raid schedule

Configure your raid schedule in **Guild Settings** under the expansion section:

- Days per week (1-5)
- Specific raid days
- Guild timezone

The attendance system uses this schedule to calculate the rolling attendance window.
        `,
      },
      {
        slug: 'master-sheet',
        title: 'Using the Master Sheet',
        description: 'View all loot priorities during raids',
        content: `
# Using the Master Sheet

The Master Sheet compiles all approved Loot Lists into a single view. It's the primary tool for loot distribution during raids.

## Accessing the Master Sheet

Click **Master Sheet** in the sidebar. It's available to all guild members (when officers enable visibility for a raid tier).

## How it's organized

- **Tabs** for each raid tier (Molten Core, Blackwing Lair, etc.)
- **Collapsible boss sections** within each tier
- **Items listed under each boss** with all players who ranked them

## What you see for each item

- Player name (colored by class)
- Their **rank** (position on their list)
- Their **Loot Score** (the combined priority number)
- Whether they're **tied** with other players

Players are sorted by Loot Score, highest first.

## Score breakdown

Click on any player's score to see the full breakdown: rank + attendance + role modifier + trial penalty + bad luck bonus.

## During raids

When an item drops:

1. Find the item on the Master Sheet (use the boss section to narrow it down)
2. See who has it ranked and their Loot Scores
3. Award to the highest priority player
4. Ties are broken by /roll

## Officer view

Officers see an additional **aggregate view** that shows total demand for each item across all raiders, useful for understanding which items are most contested.

## Visibility

Officers control which raid tiers are visible on the Master Sheet using the **Loot** and **Ranks** toggles in Guild Settings. This lets you phase out old content or hide upcoming tiers.
        `,
      },
    ],
  },
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Common questions about how loot priority works',
    icon: 'HelpCircleIcon',
    articles: [
      {
        slug: 'how-ties-are-broken',
        title: 'How ties are broken',
        description: 'What happens when two players have the same Loot Score',
        content: `
# How ties are broken

When two or more players have the same Loot Score for an item, it's settled by **/roll**. Highest roll wins.

## Why ties happen

Ties are most common when players rank an item at the same position and have similar attendance. The more raiders in your guild, the more likely you'll see ties on popular items.

## Recent loot and fairness

Getting an item earlier in the night doesn't automatically disqualify you from winning another piece. Recent loot is context, not a hard "one item per night" rule. If your Loot Score is higher (or you win the tiebreak roll), the item is yours.
        `,
      },
      {
        slug: 'ranking-strategy',
        title: 'Ranking strategy tips',
        description: 'How to approach ranking items on your Loot List',
        content: `
# Ranking strategy tips

Your Loot List should reflect what you actually want. Here are common questions about how to approach it.

## Should I rank non-BiS items high?

Yes, if they're a big upgrade. Don't avoid ranking a strong item high because you're worried it'll "cost" you your BiS later. The system rewards honest rankings.

If an item is a major upgrade for you now, rank it where it deserves to be. Your priority on other items isn't affected by winning something else (unless your guild uses Bad Luck Bonus, which resets on loot).

## What if I only want a few items?

That's fine. You don't need to fill every slot. A focused list with 10-15 high-priority items beats padding your list with things you don't care about.

## Can I rank the same item twice?

No. Each item can only appear once on your list. If you want a specific piece badly, rank it high and let the Loot Score do the work.

## Should I spread my rankings or stack the top?

Both are valid strategies:

- **Stacking the top** means your best items get maximum priority, but you may miss mid-tier upgrades
- **Spreading out** gives you decent priority across more items

Most raiders do best with a mix: stack your top bracket with the pieces you need most, then fill in solid upgrades in the middle ranks.
        `,
      },
      {
        slug: 'token-ranking',
        title: 'How to rank tokens',
        description: 'Rules for ranking tier tokens and set pieces',
        content: `
# How to rank tokens

Tier tokens (like Conqueror, Protector, Vanquisher) follow the same ranking system as other items, with a few notes.

## Main-spec tokens

Rank tokens for your main spec in your regular brackets just like any other item. Place them based on how much you want the set piece.

## Off-spec tokens

If you want a token for an off-spec set, rank it in the off-spec bracket (ranks 24 and below). This keeps main-spec tokens prioritized for players who need them for their primary role.

## Token classifications

Officers classify tokens the same way as other items (Reserved, Limited, Unlimited). Check the classification before ranking to understand the allocation cost.

## Multiple set pieces from the same token

Some tier tokens unlock multiple set slots. If you want the 4-piece bonus, you'll need to rank each token that drops from different bosses. Spread them across your list based on which set pieces matter most to your build.
        `,
      },
      {
        slug: 'loot-council-role',
        title: 'When does Loot Council step in?',
        description: 'Understanding when and why LC overrides happen',
        content: `
# When does Loot Council step in?

The short answer: rarely. LootList+ is designed to resolve almost everything through Loot Score alone. Loot Council exists as a final check, not a regular part of distribution.

## LC is an override, not a tiebreaker

Ties are handled by /roll. Loot Council is a separate tool that lets officers redirect loot when the numbers alone would hurt the raid. Think of it as a safety net for situations like:

- **Key upgrades** - A tank weapon drops during progression and it needs to go to the right person
- **Emergency swaps** - A player is about to bench their character or leave the guild
- **Progression-sensitive bottlenecks** - Gearing a specific role would meaningfully help the raid clear content

## The system is list-first

The vast majority of loot decisions are settled by Loot Score alone. LC intervention is the exception, not the rule. Officers aren't sitting in judgment on every drop. They're watching for the rare case where following the numbers blindly would hurt the guild.

## Transparency

All Loot Scores are visible on the Master Sheet. Every player can see exactly where they stand for every item. If you disagree with a decision, the numbers are right there.

## What if an item isn't on anyone's list?

If an item drops and nobody ranked it, it goes to free roll. /roll determines the winner, same as any other unlisted loot.
        `,
      },
      {
        slug: 'how-to-record-loot',
        title: 'How do I award loot on the website?',
        description: 'How loot distribution is recorded in LootList+',
        content: `
# How do I award loot on the website?

Loot isn't awarded manually on the website. Instead, you **import loot data** into the Raid Tracking page after your raid.

## Using Gargul (recommended)

1. Use the [Gargul](https://www.curseforge.com/wow/addons/gargul) addon during your raid to handle loot distribution
2. After the raid, export your loot history from Gargul
3. Go to **Raid Tracking** in LootList+
4. Paste the export into the loot import field

Gargul tracks who received what automatically, so you don't have to remember anything after the raid.

## Manual import

If Gargul isn't an option, you can paste loot data manually using this format:

\`\`\`
DD/MM/YYYY;[itemId];CharacterName
\`\`\`

For example:
\`\`\`
15/03/2026;[29764];Memer
15/03/2026;[29753];Jrocbaby
15/03/2026;[28783];Bpie
\`\`\`

Find item IDs on [Wowhead](https://www.wowhead.com) (the number in the item's URL).

## Why not manual awarding?

Importing from your raid keeps records accurate and saves time. Instead of going back and forth between the game and the website, you handle all loot in one paste after the raid is done.
        `,
      },
      {
        slug: 'how-to-create-list-for-new-phase',
        title: 'How do I make a Loot List for a new phase?',
        description: 'How to enable new raid tiers and create lists for Phase 2 and beyond',
        content: `
# How do I make a Loot List for a new phase?

If you only see Phase 1 items on your Loot List, your guild needs to **enable the raid tier** for the new phase first.

## For officers

1. Click the **gear icon** next to your guild name in the sidebar to open Guild Settings
2. Find your expansion (e.g., Burning Crusade)
3. Click the raid tier you want to enable (e.g., SSC / TK for Phase 2)
4. Toggle **Loot** on to include those items in Loot Lists

Once the tier is enabled, all raiders can see and rank items from that phase.

## For raiders

If you don't see items from a new phase, ask your officers to enable the raid tier in Guild Settings. You can't enable tiers yourself.

Once the tier is active:

1. Go to **Loot List** in the sidebar
2. Select the new phase from the phase selector
3. Rank items and submit for review

You can have separate Loot Lists for each phase. Your Phase 1 list stays active while you work on Phase 2.
        `,
      },
    ],
  },
]

// Glossary terms for the help page and dashboard tooltips
export interface GlossaryTerm {
  term: string
  definition: string
  articleSlug?: string
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Allocation points',
    definition:
      'Points spent when ranking Reserved or Limited items in a bracket. Each costs 1 point, Unlimited costs 0. You can spend up to 3 points per bracket.',
    articleSlug: 'submitting-loot-list',
  },
  {
    term: 'Attendance score',
    definition:
      'Points earned from attending raids within the rolling window. Contributes directly to your Loot Score.',
    articleSlug: 'attendance-tracking',
  },
  {
    term: 'Attendance tiers',
    definition:
      'Milestone thresholds (High, Mid, Low) that unlock bonus attendance points. Configured by officers.',
    articleSlug: 'attendance-tracking',
  },
  {
    term: 'Bad luck protection',
    definition:
      'Bonus points that grow the longer you go without receiving loot. Resets on your next item. Must be enabled by officers.',
    articleSlug: 'understanding-priority',
  },
  {
    term: 'Brackets',
    definition:
      'Priority tiers on your Loot List. Bracket 1 (50-48) is the highest priority, down to Bracket 4 (41-39). Items in higher brackets get bigger score bonuses.',
    articleSlug: 'submitting-loot-list',
  },
  {
    term: 'Classification',
    definition:
      'Item demand tier set by officers. Reserved and Limited items cost 1 allocation point each. Unlimited items cost 0 points.',
    articleSlug: 'loot-management',
  },
  {
    term: 'Loot Council',
    definition:
      'When enabled on an item, officers decide the winner instead of using Loot Score. Used for progression-critical items.',
    articleSlug: 'loot-council-role',
  },
  {
    term: 'Loot List',
    definition:
      'Your ranked list of up to 50 items, submitted for officer review. Higher rank = higher priority when that item drops.',
    articleSlug: 'submitting-loot-list',
  },
  {
    term: 'Loot Score',
    definition:
      'Your combined priority number: Rank + Attendance + Role bonus - Trial penalty + Bad luck protection. Determines who gets loot.',
    articleSlug: 'understanding-priority',
  },
  {
    term: 'Master Sheet',
    definition:
      'The compiled view of all approved Loot Lists. Shows who has priority on each item during raids.',
    articleSlug: 'master-sheet',
  },
  {
    term: 'Rank',
    definition:
      'Position of an item on your Loot List (50 = highest, 1 = lowest). The single biggest factor in your Loot Score.',
    articleSlug: 'submitting-loot-list',
  },
  {
    term: 'Role bonus',
    definition:
      'A guild-configured score modifier based on your role (Guild Master, Officer, Member, etc.). Most members have 0.',
    articleSlug: 'understanding-priority',
  },
  {
    term: 'Trial penalty',
    definition:
      'Score penalty applied to trial members, giving established raiders priority. Removed when promoted to full member.',
    articleSlug: 'understanding-priority',
  },
]

// Helper function to find an article by slug
export function findArticle(slug: string): { article: HelpArticle; category: HelpCategory } | null {
  for (const category of helpCategories) {
    const article = category.articles.find((a) => a.slug === slug)
    if (article) {
      return { article, category }
    }
  }
  return null
}

// Helper function to get all articles (flattened)
export function getAllArticles(): Array<HelpArticle & { categoryId: string; categoryTitle: string }> {
  return helpCategories.flatMap((category) =>
    category.articles.map((article) => ({
      ...article,
      categoryId: category.id,
      categoryTitle: category.title,
    }))
  )
}
