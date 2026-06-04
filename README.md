# LootList+

A loot management platform for World of Warcraft Classic guilds.

LootList+ helps guilds distribute raid loot fairly. Raiders submit ranked lists of the items they want, officers track attendance, and the system calculates priority scores to help decide who gets what. Comes with a full in-game addon for real-time loot distribution. No spreadsheets, no drama.

## Features

### For raiders
- **Loot lists** - Rank up to 50 items across priority brackets with smart item search
- **Score tracking** - See your Loot Score breakdown (ranking, attendance, modifiers)
- **Master sheet** - View everyone's priorities, filter by item, boss, or class
- **Attendance** - Track your raid participation and points
- **Battle.net import** - Pull your characters and gear directly from Blizzard's API

### For officers
- **Submission review** - Approve, request revisions, or reject loot lists with notes
- **Raid tracking** - Import attendance from WarcraftLogs reports or log manually
- **Phase management** - Merge phases, configure raid schedules, manage expansions
- **Loot history** - Full audit trail of every item awarded
- **Discord webhooks** - Notify channels on submissions, approvals, and awards

## Supported expansions

| Expansion | Status | Raids | Items |
|-----------|--------|-------|-------|
| Classic | Full loot data | 6 phases (MC/Onyxia through Naxx) | 800+ |
| The Burning Crusade | Full loot data | 5 phases (Kara through Sunwell) | 651 |
| Wrath of the Lich King | Full loot data | 5 phases (Naxx/EoE through Ruby Sanctum) | 1,353 |
| Cataclysm | Full loot data | 5 phases (BWD/BoT through Dragon Soul) | 978 |
| Mists of Pandaria | Full loot data | 5 phases (MSV through Siege of Orgrimmar) | 1,705 |
| Warlords of Draenor through The War Within | Phase definitions only | Coming soon | - |

## Tech stack

- Next.js 16 (App Router, React 19)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL, auth, RLS)
- Discord and Battle.net OAuth
- Upstash Redis (rate limiting)
- PostHog (analytics)
- Vercel (hosting)
- Lua (WoW addon, Ace3 framework)

## Local development

Against the production project (needs `.env.local`):

```bash
npm install
npm run dev
```

Requires a `.env.local` with Supabase, Discord OAuth, and Battle.net OAuth credentials. See `.env.example` for the full list.

Or run fully local with a seeded test guild (no prod access needed):

```bash
npm run db:local:seed   # local Supabase + schema + a seeded test guild
npm run dev:local       # next dev wired to the local stack
```

See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for details.

## Project structure

```
app/(app)/           # Authenticated app routes
app/api/             # API routes (guilds, loot, auth, addon, etc.)
addon/LootListPlus/  # WoW addon (Lua, multi-TOC)
components/ui/       # Design system components
data/                # Raid definitions, item data, class mappings
lib/                 # Shared utilities (scoring, brackets, validation)
supabase/migrations/ # Database migrations
```

## License

Proprietary. See [LICENSE](LICENSE) for details.
