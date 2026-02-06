# LootList+

A loot management system for World of Warcraft Classic guilds.

LootList+ helps guilds distribute raid loot fairly. Raiders submit ranked lists of the items they want, officers track attendance, and the system calculates priority scores to help decide who gets what. No spreadsheets, no drama.

## What it does

- **Loot lists** - Raiders rank up to 50 items across different priority brackets
- **Attendance tracking** - Automatic scoring based on raid participation
- **Master sheet** - Officers see everyone's priorities in one place
- **Phase support** - Lists are organized by content phase (all raids in a phase share one list)
- **BIS import** - Import gear from WowSims to track what you already have

## Tech stack

- Next.js 16 (React)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL database, auth)
- Discord OAuth
- Vercel (hosting)

## Local development

```bash
npm install
npm run dev
```

Requires a `.env.local` file with Supabase and Discord OAuth credentials.

## License

Private and proprietary. All rights reserved.
