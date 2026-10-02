# LootList+

LootList+ is a transparent loot-management system for World of Warcraft guilds. Raiders submit ranked loot lists, officers track attendance, and Loot Scores show who has priority for each item and why. Core features are free; Premium adds multi-team support, an officer activity feed, and reserve runs. Learn more at [getlootlist.com](https://www.getlootlist.com) or compare plans on the [pricing page](https://www.getlootlist.com/pricing).

Comes with a full in-game addon for real-time loot distribution. No spreadsheets, no drama.

- **Website:** [getlootlist.com](https://www.getlootlist.com)
- **App:** [lootlistplus.com](https://www.lootlistplus.com) (same product: the website is the public front door, the app is where guilds sign in)

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
| WoW Forever | Guild setup (region and ruleset) | Forever raids aren't in LootList+ yet | - |
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

### Building locally

`npm run build` prerenders pages, and the root layout's context providers construct the Supabase browser client during that prerender. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, or export them in your shell, or the build fails at the static generation step. Both are public values that ship to the browser anyway, not secrets. `npm run typecheck`, `npm run lint` and `npm run test` run without them. Vercel builds supply them automatically.

## Project structure

```
app/(app)/           # Authenticated app routes
app/api/             # API routes (guilds, loot, auth, addon, etc.)
components/ui/       # Design system components
data/                # Raid definitions, item data, class mappings
lib/                 # Shared utilities (scoring, brackets, validation)
supabase/migrations/ # Database migrations
```

## WoW addon

The LootList+ WoW addon lives in its own repository, [alexandermayes/loot-list-plus-addon](https://github.com/alexandermayes/loot-list-plus-addon). Its `Modules/ScoreEngine.lua` is the Lua port of `domain/scoring/` and is updated whenever the web scoring rules change. Its `tests/tools/gen_web_fixtures.mts` is the parity check: run from a checkout of this repo, it generates expected scores from `domain/scoring/` that the addon's luajit tests compare against (see `tests/README.md` in the addon repo).

## License

Proprietary. See [LICENSE](LICENSE) for details.
