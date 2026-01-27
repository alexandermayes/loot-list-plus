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
    description: 'Learn the basics of LootList+ and set up your guild',
    icon: 'RocketIcon',
    articles: [
      {
        slug: 'welcome',
        title: 'Welcome to LootList+',
        description: 'An introduction to LootList+ and its features',
        content: `
# Welcome to LootList+

LootList+ is a loot council management tool designed for World of Warcraft guilds. It helps you:

- **Manage loot lists** - Raiders submit their item priorities before raids
- **Track attendance** - Monitor who shows up and factor it into loot decisions
- **Coordinate loot council** - Officers can review submissions and make fair decisions
- **View the master sheet** - See everyone's priorities at a glance during raids

## How it works

1. **Guild officers** set up the guild, configure raid tiers, and manage members
2. **Raiders** create characters and submit their loot lists for each raid tier
3. **Officers** review and approve loot lists
4. **During raids**, use the master sheet to quickly see who wants each item

Ready to get started? Check out the guides below.
        `,
      },
      {
        slug: 'joining-a-guild',
        title: 'Joining a Guild',
        description: 'How to join an existing guild using an invite code',
        content: `
# Joining a Guild

If your guild already uses LootList+, you can join with an invite code or Discord integration.

## Using an Invite Code

1. Ask your guild officers for an invite code
2. Go to the guild selection screen
3. Click "Join Guild"
4. Enter the invite code
5. You're in!

## Using Discord

If your guild uses Discord integration:

1. Click "Join via Discord" on the guild selection screen
2. Authorize the Discord connection
3. You'll automatically join guilds linked to your Discord servers

## After Joining

Once you've joined a guild:

1. Create a character (or multiple characters)
2. Submit your loot lists for active raid tiers
3. Start tracking your loot priority!
        `,
      },
      {
        slug: 'creating-a-character',
        title: 'Creating a Character',
        description: 'How to add your WoW characters to your profile',
        content: `
# Creating a Character

Characters are how you submit loot lists and track your loot history.

## Adding a New Character

1. Go to **Characters** > **Manage**
2. Click **Create Character**
3. Fill in your character details:
   - **Name** - Your character's name
   - **Realm** - Your server (optional)
   - **Class** - Your WoW class
   - **Spec** - Your specialization (optional)
   - **Level** - Your character level (optional)
4. Toggle **Main Character** if this is your primary raider
5. Click **Save**

## Managing Multiple Characters

You can add multiple characters if you raid on alts. Use the character switcher in the sidebar to change which character you're viewing.

Your **main character** is highlighted and used for certain guild-wide views.
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

Your loot list tells officers which items you want and how much you want them.

## Creating Your List

1. Go to **Loot List** from the sidebar
2. Select the raid tier you want to submit for
3. Browse available items by boss or slot
4. **Rank items** by priority (1 = highest priority)
5. Click **Submit for Review**

## Ranking Tips

- **Be honest** - Rank items based on actual upgrade value
- **Consider your spec** - Focus on items that benefit your role
- **Check classifications** - Some items are "Limited" and require higher priority
- **Don't rank everything** - Only rank items you genuinely want

## After Submission

Your list goes to officers for review. You'll see one of these statuses:

- **Pending** - Waiting for officer review
- **Approved** - Your list is active
- **Needs Revision** - Officers have feedback; check comments and resubmit

## Editing Your List

You can edit a draft list anytime. Once submitted, you may need officer approval to make changes.
        `,
      },
      {
        slug: 'understanding-priority',
        title: 'Understanding Priority',
        description: 'How loot priority is calculated',
        content: `
# Understanding Priority

Your loot priority determines where you stand in line for each item.

## Priority Score

Your priority score combines several factors:

- **Item Rank** - How highly you ranked the item (higher rank = more priority)
- **Attendance** - Your raid attendance percentage
- **Role Modifiers** - Guild-configured bonuses for certain roles

## Viewing Your Priority

Check your priority in several places:

- **Overview** - See your top priority items in "Next in Line"
- **Master Sheet** - View all characters' priorities for each item
- **Loot List** - See your rankings and current standing

## Ties

When multiple players have the same priority score, they're "tied" for an item. The loot council decides between tied players.

## Improving Your Priority

- **Show up to raids** - Attendance matters!
- **Rank items thoughtfully** - Use your high ranks wisely
- **Be patient** - Priority naturally improves as others receive items
        `,
      },
    ],
  },
  {
    id: 'guild-management',
    title: 'Guild Management',
    description: 'For officers: configure your guild settings',
    icon: 'Settings01Icon',
    articles: [
      {
        slug: 'guild-setup',
        title: 'Setting Up Your Guild',
        description: 'Initial configuration for new guilds',
        content: `
# Setting Up Your Guild

This guide is for guild officers setting up LootList+ for the first time.

## Step 1: Create the Guild

1. Click **Create Guild** on the guild selection screen
2. Enter your guild name and realm
3. You'll automatically become the Guild Master

## Step 2: Configure Expansion

1. Go to **Admin** > **Manage Expansions**
2. Select your current expansion
3. Enable the raid tiers your guild is progressing

## Step 3: Set Up Loot Items

Each raid tier needs loot items configured:

1. Go to **Admin** > **Manage Expansions** > Select a tier
2. Import items from Wowhead or add manually
3. Set item classifications (Limited, Open, etc.)

## Step 4: Invite Members

1. Go to **Admin** > **Guild Settings**
2. Create invite codes or set up Discord integration
3. Share codes with your raiders

## Step 5: Configure Settings

Customize how loot priority works:

- **Attendance tracking** - Rolling weeks, signup weight
- **Role modifiers** - Bonuses for tanks, healers, etc.
- **Priority formula** - How scores are calculated
        `,
      },
      {
        slug: 'managing-members',
        title: 'Managing Members',
        description: 'Add, remove, and configure guild members',
        content: `
# Managing Members

Control who's in your guild and what they can do.

## Member Roles

- **Guild Master** - Full control over everything
- **Officer** - Can manage loot, approve lists, run raids
- **Member** - Can submit loot lists and view their priority

## Adding Members

Members join via:

- **Invite codes** - Generate in Guild Settings
- **Discord** - Automatic if you've linked Discord

## Removing Members

1. Go to **Admin** > **Guild Settings** > **Members**
2. Find the member
3. Click **Remove**

Their loot history is preserved but they lose access.

## Changing Roles

1. Find the member in Guild Settings
2. Use the role dropdown to change their permission level
        `,
      },
      {
        slug: 'reviewing-submissions',
        title: 'Reviewing Loot Submissions',
        description: 'How to review and approve loot lists',
        content: `
# Reviewing Loot Submissions

Officers review loot lists before they become active.

## Pending Submissions

1. Go to **Admin** > **Pending Submissions**
2. You'll see all lists waiting for review
3. Click a submission to view details

## Reviewing a List

Check for:

- **Reasonable rankings** - Do priorities make sense for their class/spec?
- **Item classifications** - Are limited items ranked appropriately?
- **Completeness** - Did they rank enough items?

## Actions

- **Approve** - List becomes active
- **Request Revision** - Add a comment explaining what to fix
- **Reject** - Rare, for invalid submissions

## Best Practices

- Review promptly so raiders can see their priority
- Be consistent with feedback across all members
- Communicate ranking guidelines to your guild
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
        title: 'Attendance Tracking',
        description: 'How attendance affects loot priority',
        content: `
# Attendance Tracking

Attendance rewards players who consistently show up to raids.

## How It Works

Your guild tracks raid attendance over a rolling window (e.g., last 4 weeks). Your attendance percentage factors into your loot priority score.

## Attendance Statuses

- **Attended** - You were at the raid
- **Signed Up** - You signed up but didn't attend (partial credit if enabled)
- **No Call No Show** - Missed without notice (may have penalties)

## Checking Your Attendance

View your attendance history in your **Profile** or **Overview** page.

## For Officers

Track attendance via:

- Manual entry in Raid Tracking
- Integration with raid logging addons
- Discord bot commands
        `,
      },
      {
        slug: 'master-sheet',
        title: 'Using the Master Sheet',
        description: 'View all loot priorities during raids',
        content: `
# Using the Master Sheet

The master sheet shows everyone's priorities at a glance—essential during raids.

## Accessing the Master Sheet

Click **Master Sheet** in the sidebar.

## Features

- **Filter by boss** - See items from a specific encounter
- **Sort by priority** - Highest priority players at top
- **View tied players** - See who's competing for items
- **Item tooltips** - Hover for Wowhead item details

## During Raids

When an item drops:

1. Find the item on the master sheet
2. See who has it ranked and their priority scores
3. Award to the highest priority player (or loot council decision for ties)
4. Mark item as awarded to update priorities

## Tips

- Keep the master sheet open on a second monitor
- Use boss filters to quickly find relevant items
- Award items promptly to keep priorities accurate
        `,
      },
    ],
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
