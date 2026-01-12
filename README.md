# LootList+ 🎮

A modern loot management system for World of Warcraft Classic guilds, built to streamline loot distribution, track attendance, and manage guild member submissions.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat-square&logo=supabase)
![Discord](https://img.shields.io/badge/Discord-Integration-5865F2?style=flat-square&logo=discord)

## ✨ Features

### Core Functionality
- **Loot Management** - Create and manage loot lists for multiple raid tiers
- **Master Sheet** - View guild-wide loot rankings with real-time calculations
- **Attendance Tracking** - Track raid attendance with flexible scoring systems
- **Submission System** - Members submit ranked loot preferences for officer review
- **Discord Integration** - Seamless Discord OAuth and guild syncing
- **Multi-Guild Support** - Manage multiple guilds from a single account

### Advanced Features
- **Dynamic Loot Scoring** - Configurable ranking algorithms with attendance bonuses
- **Item Classification** - Reserved, Limited, and Unlimited item tiers
- **Wowhead Integration** - Live item tooltips and links
- **Expansion Support** - Full support for Classic, TBC, and future expansions
- **Role-Based Permissions** - Officer and Guild Master access controls
- **Deadline Management** - Set and enforce submission deadlines with locking

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Poppins Font** - Modern, clean typography

### Backend
- **Supabase** - PostgreSQL database, authentication, and real-time
- **Row Level Security** - Database-level permission enforcement
- **Discord OAuth** - Secure authentication via Discord

### Infrastructure
- **Vercel** - Web application hosting
- **Railway** - Discord bot hosting
- **Discord.js** - Bot framework for presence and server integration

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **Supabase Account** - [Sign up here](https://supabase.com)
- **Discord Application** - [Discord Developer Portal](https://discord.com/developers/applications)
- **Git** - For version control

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/alexandermayes/loot-list-plus.git
cd loot-list-plus
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Discord OAuth
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/auth/callback

# Discord Bot (optional for local development)
DISCORD_BOT_TOKEN=your_discord_bot_token

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Database Setup

Run the migrations in order from the `migrations/` folder in your Supabase SQL Editor:

```sql
-- Core tables and schema
001_initial_schema.sql
002_add_loot_features.sql
...

-- Or use the Supabase CLI
npx supabase db push
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 6. Run Discord Bot (Optional)

```bash
cd discord-bot
npm install
npm start
```

## 🏗️ Project Structure

```
lootlist-plus/
├── app/                          # Next.js App Router
│   ├── (app)/                   # Authenticated app routes
│   │   ├── admin/              # Admin dashboard & settings
│   │   ├── attendance/         # Attendance tracking
│   │   ├── dashboard/          # Main dashboard
│   │   ├── loot-list/          # Personal loot list management
│   │   ├── master-sheet/       # Guild-wide rankings
│   │   └── profile/            # User profile & settings
│   ├── api/                    # API routes
│   │   ├── discord-guilds/     # Discord integration
│   │   ├── guild-invites/      # Invite code system
│   │   └── verify-discord/     # Discord verification
│   ├── components/             # Shared React components
│   ├── contexts/               # React Context providers
│   └── guild-select/           # Guild selection flow
├── components/                  # UI components
│   ├── profile/                # Profile-specific components
│   └── ui/                     # Reusable UI elements
├── discord-bot/                # Discord bot service
│   ├── bot.js                  # Main bot entry point
│   └── package.json
├── migrations/                 # Database migrations
├── public/                     # Static assets
│   ├── icons/                  # App icons
│   └── logo.svg
├── scripts/                    # Utility scripts
└── utils/                      # Helper functions
    └── supabase/               # Supabase client setup
```

## 📊 Key Features Breakdown

### Loot List System
- **Ranked Submissions** - Members rank items 1-8 by priority
- **Officer Approval** - Officers review and approve/reject submissions
- **Deadline Enforcement** - Lock submissions after deadline
- **Item Slots** - Track allocations and restrictions per slot

### Scoring Algorithm
```
Final Score = Item Rank + Attendance Score + Role Modifiers
```

- **Item Rank**: 1-8 (higher = higher priority)
- **Attendance Score**: 0-8 based on raid participation (4 week rolling)
- **Role Modifiers**: Configurable bonuses/penalties by guild role

### Attendance Tracking
- **Flexible Systems**: Linear or breakpoint-based scoring
- **Rolling Window**: Configurable weeks (default: 4)
- **Signup Weights**: Optional bonus for pre-signing raids
- **Bad Luck Prevention**: Bonus for seeing item but not winning

## 🔒 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Discord OAuth** - Secure authentication
- **Officer Permissions** - Role-based access to admin features
- **Guild Isolation** - Data scoped to guild membership
- **Invite Codes** - Secure guild joining with expiration and usage limits

## 🚢 Deployment

### Web Application (Vercel)

1. **Push to GitHub**
2. **Connect to Vercel**
3. **Configure Environment Variables** (same as `.env.local`)
4. **Deploy**

### Discord Bot (Railway)

1. **Create Railway Project**
2. **Connect GitHub Repository**
3. **Set Root Directory**: `discord-bot`
4. **Configure Environment Variables**:
   ```
   DISCORD_BOT_TOKEN=your_bot_token
   NODE_ENV=production
   ```
5. **Deploy**

## 🧪 Running Migrations

For new database schema changes:

```bash
# Using Supabase CLI
npx supabase migration new migration_name
npx supabase db push

# Or manually via Supabase Dashboard
# Copy SQL from migrations/ folder → SQL Editor → Run
```

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary. All rights reserved.

## 🐛 Bug Reports

Found a bug? Please open an issue with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)

## 📧 Support

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for World of Warcraft Classic guilds**
