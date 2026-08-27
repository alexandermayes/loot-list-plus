# Codebase Structure

**Analysis Date:** 2026-08-27

## Directory Layout

```
loot-list-plus/
├── app/                          # Next.js app router (React pages, API routes)
│   ├── (app)/                    # Route group: authenticated pages
│   │   ├── admin/                # Officer/admin dashboards
│   │   ├── attendance/           # Attendance tracking
│   │   ├── audit-log/            # Audit log view
│   │   ├── characters/           # Character management
│   │   ├── guild-settings/       # Guild configuration
│   │   ├── help/                 # Help articles page
│   │   ├── loot-list/            # Loot list view (officers)
│   │   ├── loot-management/      # Loot management UI
│   │   ├── loot-submissions/     # Player submission form
│   │   ├── master-sheet/         # Master sheet (scoring UI)
│   │   ├── overview/             # Guild dashboard
│   │   ├── profile/              # User profile
│   │   ├── raid-teams/           # Raid team management
│   │   ├── raid-tracking/        # Raid event creation/tracking
│   │   ├── reserve/              # Reserve runs (Premium feature)
│   │   ├── sheet-import/         # Sheet import UI
│   │   ├── updates/              # Update feed
│   │   ├── design-system/        # Component showcase
│   │   ├── AppLayout.client.tsx  # Main app layout wrapper
│   │   ├── PrefetchProvider.tsx  # Server prefetch hydration
│   │   ├── layout.tsx            # (app) layout: prefetch + render
│   │   ├── error.tsx             # (app)-level error boundary
│   │   └── loading.tsx           # (app)-level loading skeleton
│   │
│   ├── (landing)/                # Route group: public pages
│   │   ├── page.tsx              # Landing page
│   │   ├── layout.tsx            # Landing layout (no sidebar)
│   │
│   ├── api/                      # Next.js Route Handlers
│   │   ├── addon/                # In-game addon endpoints
│   │   │   ├── attendance/       # Addon attendance sync
│   │   │   ├── export-string/    # Addon data export
│   │   │   ├── guild-data/       # Addon pull guild state
│   │   │   ├── import-string/    # Addon data import
│   │   │   └── loot-award/       # Addon loot award POST
│   │   ├── admin/                # Admin-only endpoints
│   │   │   ├── analytics/        # Admin analytics queries
│   │   │   ├── clear-all-guilds/ # Nuke all data (dev)
│   │   │   ├── diagnose/         # Debug endpoint
│   │   │   └── sheet-import/     # Admin sheet import
│   │   ├── attendance/           # Attendance CRUD
│   │   │   ├── auto-link/        # Auto-link to characters
│   │   │   └── bulk/             # Bulk operations
│   │   ├── auth/                 # Auth flow endpoints
│   │   │   └── battlenet/        # Battle.net OAuth callback
│   │   ├── billing/              # Stripe integration
│   │   │   ├── checkout/         # Stripe checkout session
│   │   │   └── portal/           # Stripe customer portal
│   │   ├── characters/           # Character endpoints
│   │   │   └── [id]/             # Character-specific routes
│   │   ├── cron/                 # Scheduled jobs (Vercel cron)
│   │   │   ├── auto-promote-trials/
│   │   │   ├── post-update/
│   │   │   └── resubmit-reminders/
│   │   ├── discord/              # Discord webhooks & API
│   │   │   ├── channels/         # Discord channel list
│   │   │   ├── check-bot/        # Bot permission check
│   │   │   ├── notify-officers/  # Send officer alert
│   │   │   ├── post-raid-summary/
│   │   │   ├── post-update/      # Post update to Discord
│   │   │   └── send-notification/
│   │   ├── guilds/               # Guild management
│   │   │   ├── [id]/             # Guild-specific endpoints
│   │   │   ├── change-expansion/
│   │   │   ├── delete/
│   │   │   ├── leave/
│   │   │   ├── reset-season/
│   │   │   └── transfer-ownership/
│   │   ├── loot-submissions/     # Loot submission CRUD
│   │   │   ├── delete/
│   │   │   ├── item-counts/      # Stats endpoint
│   │   │   ├── pending-count/    # Pending count
│   │   │   ├── remove-item/      # Remove one item from submission
│   │   │   ├── revert/           # Revert to previous state
│   │   │   ├── review/           # Officer review endpoint
│   │   │   ├── statuses/         # Submission statuses
│   │   │   └── submit/           # Player submit
│   │   ├── loot-history/         # Award loot endpoint
│   │   │   ├── bulk/             # Bulk awards
│   │   │   └── route.ts          # Fetch history
│   │   ├── raid-events/          # Raid event CRUD
│   │   │   ├── bonus/            # Bonus DKP endpoint
│   │   │   └── ensure/           # Ensure raid event exists
│   │   ├── raid-teams/           # Raid team CRUD
│   │   ├── raid-tiers/           # Raid tier list
│   │   ├── reserve-runs/         # Reserve run management
│   │   ├── user/                 # User preferences
│   │   │   ├── active-character/
│   │   │   ├── active-guild/
│   │   │   └── delete-account/
│   │   ├── wcl/                  # WarcraftLogs integration
│   │   │   └── link-report/      # Parse WCL report
│   │   ├── webhooks/             # Incoming webhooks
│   │   │   └── stripe/           # Stripe webhook handler
│   │   └── version/              # App version
│   │
│   ├── auth/                     # Auth pages (login, callback)
│   ├── components/               # Full-page components
│   │   ├── LoginPage.tsx         # Login form
│   │   ├── BattlenetCharacterPickerModal.tsx
│   │   ├── LootListSummaryView.tsx
│   │   ├── WowSimsImportModal.tsx
│   │   ├── SearchableItemSelect.tsx
│   │   ├── ThemeSelector.tsx
│   │   ├── TeamSelector.tsx
│   │   ├── FeedbackModal.tsx
│   │   ├── ThemeProvider.tsx     # next-themes wrapper
│   │   ├── SWRProvider.tsx       # SWR configuration
│   │   ├── PostHogProviderDeferred.tsx
│   │   ├── ChunkErrorReload.tsx  # Re-render on chunk errors
│   │   ├── NotificationContainer.tsx
│   │   └── ... (30+ more)
│   │
│   ├── contexts/                 # React Context providers
│   │   ├── GuildContext.tsx      # Selected guild, member, permissions
│   │   ├── LootListContext.tsx   # Loot submissions, scoring state
│   │   ├── ExpansionContext.tsx  # Selected expansion
│   │   ├── NotificationContext.tsx
│   │   ├── SidebarContext.tsx
│   │   ├── AccentColorContext.tsx
│   │   └── derive-prefetched-state.ts
│   │
│   ├── hooks/                    # React hooks
│   │   ├── use-api.ts            # SWR wrapper with auth token
│   │   ├── useRaidTeam.ts        # Raid team state hook
│   │   ├── usePendingSubmissionCount.ts
│   │   ├── useResubmitCount.ts
│   │   └── usePremiumCheckout.ts
│   │
│   ├── services/                 # Server-side services
│   │   └── expansionSeeder.ts    # Initialize expansion for guild
│   │
│   ├── layout.tsx                # Root layout (providers, fonts, metadata)
│   ├── page.tsx                  # Root page (redirects to /app or landing)
│   ├── error.tsx                 # Root-level error boundary
│   ├── global-error.tsx          # Unrecoverable error page
│   ├── globals.css               # Global styles (Tailwind)
│   ├── sitemap.ts                # SEO sitemap
│   └── robots.ts                 # SEO robots.txt
│
├── domain/                       # Domain logic (DDD)
│   ├── index.ts                  # Barrel export
│   ├── types.ts                  # Type definitions (Guild, Character, etc.)
│   ├── loot/                     # Loot domain
│   │   ├── calculateLootScore.ts
│   │   ├── scoringRules.ts
│   │   ├── itemClassifications.ts
│   │   ├── lootHistoryQuery.ts
│   │   └── ...
│   ├── guild/                    # Guild domain
│   │   ├── guildPermissions.ts
│   │   ├── guildValidator.ts
│   │   └── ...
│   ├── scoring/                  # Scoring domain
│   │   ├── attendanceWeighting.ts
│   │   ├── classPriority.ts
│   │   └── ...
│   ├── expansion/                # Expansion domain
│   │   └── resolvePhaseGroups.ts
│   ├── raid-team/                # Raid team domain
│   └── reserve/                  # Reserve runs domain
│
├── lib/                          # Shared utilities & integrations
│   ├── database.types.ts         # Generated Supabase types (79KB)
│   ├── db.ts                     # DB type aliases (use instead of DB types directly)
│   ├── battlenet.ts              # Battle.net API client
│   ├── warcraftlogs.ts           # WarcraftLogs API client
│   ├── wowsims-parser.ts         # WoWsims build parser
│   ├── wowhead.ts                # Wowhead item lookup
│   ├── discord.ts                # Discord API client
│   ├── discord-loot-announcements.ts
│   ├── help-content.ts           # Help articles (58KB static data)
│   ├── updates-data.ts           # App updates changelog (59KB)
│   ├── loot-items-query.ts       # Item search/filter logic
│   ├── animations.ts             # Framer Motion utilities
│   ├── utils.ts                  # Misc helpers
│   ├── design-system/            # Design tokens (colors, spacing)
│   ├── cache/
│   │   └── user-bundle.ts        # Cache guild/character/preferences
│   ├── billing/                  # Stripe integration
│   │   ├── client.ts
│   │   ├── webhooks.ts
│   │   └── ...
│   ├── donations/                # Donation tracking
│   ├── sheet-import/             # Sheet import utilities
│   └── __tests__/                # Unit tests for lib utilities
│
├── utils/                        # Cross-cutting utilities
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client (session)
│   │   └── service-role.ts       # Admin Supabase client (RLS bypass)
│   ├── analytics/
│   │   ├── server.ts             # PostHog server-side tracking
│   │   ├── funnel.ts             # Funnel analysis helpers
│   │   └── ...
│   ├── cache.ts                  # Cache key management
│   ├── feature-flags.ts          # Client-side feature flags
│   ├── feature-gate.ts           # Server-side feature gates
│   ├── server-roles.ts           # Discord role helpers
│   ├── bossImages.ts             # Boss image mappings
│   ├── bossOrder.ts              # Boss order per tier
│   ├── raidIcons.ts              # Raid tier icons
│   ├── expansionVisuals.ts       # Expansion colors/visuals
│   ├── specPrimaryStat.ts        # Class/spec primary stats
│   ├── reserve-access.ts         # Reserve run permissions
│   ├── api/
│   │   └── buildQueryString.ts   # Query builder utilities
│   ├── audit/                    # Audit log utilities
│   ├── blp/                      # BLP tracking (analytics)
│   ├── raid-events/              # Raid event helpers
│   └── __tests__/                # Unit tests
│
├── data/                         # Static reference data
│   ├── classic-wow-raids.ts      # Classic raids (65KB)
│   ├── tbc-raids.ts              # TBC raids (69KB)
│   ├── wrath-raids.ts            # Wrath raids (117KB)
│   ├── cata-raids.ts             # Cataclysm raids (86KB)
│   ├── mop-raids.ts              # MOP raids (159KB)
│   ├── item-icons.ts             # Item icon CDN URLs (192KB)
│   ├── item-types.ts             # Item type classifications (55KB)
│   ├── item-unique.ts            # Unique item IDs
│   ├── classic-item-roles.ts
│   ├── classic-wow-item-classifications.ts
│   ├── tbc-item-roles.ts
│   ├── tbc-item-classifications.ts
│   ├── wrath-item-classifications.ts
│   ├── cata-item-classifications.ts
│   ├── mop-item-classifications.ts
│   ├── class-proficiencies.ts
│   ├── wowClassRestrictions.ts   # Class restrictions per item
│   ├── boss-quotes.ts
│   ├── expansion-phases.ts
│   ├── token-class-mapping.ts
│   ├── wow-realms.ts
│   └── bis/                      # Best-in-slot items per class
│
├── components/                   # Design system (UI component library)
│   ├── ui/                       # shadcn/ui components (imported)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   └── ... (20+ more)
│
├── public/                       # Static assets
│   ├── fonts/                    # Custom fonts (Friz Quadrata)
│   ├── favicon-*.png             # Favicons
│   ├── og-image.jpg              # Open Graph image
│   ├── site.webmanifest          # PWA manifest
│   └── ... (images, icons)
│
├── discord-bot/                  # Separate Discord bot app
│   ├── package.json              # Discord bot dependencies
│   ├── src/
│   │   ├── commands/
│   │   └── events/
│   └── ... (standalone app)
│
├── companion/                    # Companion app (Electron/Tauri)
│   ├── package.json              # Companion dependencies
│   └── ... (excluded from tsconfig)
│
├── addon/                        # Firefox addon source
│   ├── manifest.json
│   └── ... (browser extension)
│
├── loadtest/                     # Performance testing
│   ├── k6-loadtest.js            # k6 load test
│   ├── k6-loadtest-auth.js       # k6 auth stress test
│   └── artillery.yml             # Artillery config
│
├── scripts/                      # Utility scripts
│   ├── generate-seed-reference-data.ts
│   ├── fetch-item-icons.ts
│   ├── seed-classic-raids.ts
│   ├── seed-test-data.ts
│   ├── setup-loot-database.ts
│   ├── reseed-bwl.ts
│   ├── create-test-users.ts
│   └── ... (20+ more)
│
├── .planning/                    # GSD planning documents
│   ├── codebase/                 # This directory
│   │   ├── ARCHITECTURE.md       # System architecture
│   │   ├── STRUCTURE.md          # Directory structure (this file)
│   │   ├── CONVENTIONS.md        # Coding conventions
│   │   └── TESTING.md            # Testing patterns
│   └── ...
│
├── .claude/                      # Claude Code configuration
│   ├── settings.json             # Project settings
│   └── skills/                   # Project-level skills
│
├── .github/                      # GitHub Actions workflows
│   └── workflows/                # CI/CD pipelines
│
├── public/                       # Static assets served by Next.js
├── node_modules/                 # Installed dependencies
├── .next/                        # Next.js build output
│
├── eslint.config.mjs             # ESLint configuration
├── tsconfig.json                 # TypeScript configuration
├── next.config.ts                # Next.js configuration (CSP, image optimization)
├── components.json               # shadcn/ui component registry
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
│
├── package.json                  # Root dependencies & scripts
├── package-lock.json             # Dependency lock file
├── LOCAL_DEVELOPMENT.md          # Dev setup guide
├── LICENSE                       # MIT license
└── README.md                     # Project overview
```

## Directory Purposes

**app/:** Next.js App Router application. Contains all pages, API routes, components, and context. Generated pages use app-based routing (no pages/ directory).

**domain/:** Business logic layer (DDD pattern). Pure functions without side effects. Imported by API routes and client hooks. Easily testable.

**lib/:** Shared libraries and integrations. External API clients, cache logic, database type aliases, analytics, design system tokens.

**utils/:** Cross-cutting utilities. Supabase client initialization, analytics tracking, cache management, server roles, feature flags.

**data/:** Static reference data. Raid definitions, item classifications, boss quotes, WoW realm names. Generated/updated by scripts.

**components/:** Design system component library. shadcn/ui exports. Imported by app/components and pages.

**public/:** Static assets served directly by Next.js. Fonts, favicons, images. Cached aggressively.

**scripts/:** Utility scripts for data generation, seeding, fetching external data, testing. Executed manually or in CI.

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout — providers, fonts, metadata
- `app/page.tsx`: Root page — redirects to /app or /auth
- `app/(app)/layout.tsx`: Authenticated layout — user bundle prefetch
- `app/api/**/route.ts`: API endpoints — handler functions

**Configuration:**
- `next.config.ts`: CSP headers, image optimization, redirects
- `tsconfig.json`: Path aliases (`@/*` = root), TypeScript strict mode
- `package.json`: Scripts (dev, build, test, seed), dependencies
- `.env.local`: Environment variables (dev mode only)

**Core Logic:**
- `domain/`: Business rules (scoring, permissions, queries)
- `lib/db.ts`: Database type aliases
- `utils/supabase/`: Supabase client initialization
- `lib/cache/user-bundle.ts`: Server-side cache for user data

**State Management:**
- `app/contexts/GuildContext.tsx`: Selected guild, member info
- `app/contexts/LootListContext.tsx`: Loot submissions, scoring state
- `app/hooks/use-api.ts`: SWR wrapper for data fetching

**Testing:**
- `lib/__tests__/`: Unit tests for utilities
- `utils/__tests__/`: Unit tests for cross-cutting utilities
- `vitest.config.ts`: Vitest configuration (not present but can add)

## Naming Conventions

**Files:**
- Page: `page.tsx` (Next.js pages)
- Route handler: `route.ts` (API endpoints)
- Component: `PascalCase.tsx` (e.g., `LoginPage.tsx`)
- Context: `PascalCase.tsx` (e.g., `GuildContext.tsx`)
- Utility: `camelCase.ts` (e.g., `bossImages.ts`)
- Type definition: `types.ts` (e.g., `domain/types.ts`)

**Directories:**
- Feature routes: kebab-case (e.g., `loot-submissions/`)
- Context grouping: `contexts/`
- Hook grouping: `hooks/`
- API routes: kebab-case matching feature name (e.g., `/api/loot-submissions`)
- Domain modules: kebab-case (e.g., `domain/raid-team/`)

**Imports/Exports:**
- Barrel exports: `export * from './module'` in index.ts
- Path alias: `@/` refers to repo root (see tsconfig.json)
- Example: `import { calculateLootScore } from '@/domain'`

## Where to Add New Code

**New Feature (e.g., Feature X):**
- Primary code: `app/(app)/feature-x/page.tsx` (page layout), `app/(app)/feature-x/components/` (feature components)
- API endpoint: `app/api/feature-x/route.ts` (GET/POST handlers)
- Domain logic: `domain/feature-x/` (business rules, exported via `domain/index.ts`)
- Tests: `lib/__tests__/feature-x.test.ts` or `app/(app)/feature-x/__tests__/` (co-located)

**New API Endpoint (e.g., POST /api/items/award):**
- Route handler: `app/api/items/award/route.ts` (POST function)
- Domain logic: `domain/loot/` (if related to loot scoring)
- Call pattern: Handler validates → calls domain → returns JSON
- Example: `/app/api/loot-history/route.ts` (single POST handler for awards)

**New Utility/Helper:**
- Server/API helper: `lib/[category]/[name].ts` (e.g., `lib/cache/new-cache.ts`)
- Client helper: `utils/[category]/[name].ts` (e.g., `utils/analytics/new-tracker.ts`)
- Supabase helper: `utils/supabase/[name].ts` (e.g., `utils/supabase/permissions.ts`)
- Cross-app helper: `lib/[name].ts` (e.g., `lib/notifications.ts`)

**New React Hook:**
- Location: `app/hooks/use-[name].ts`
- Pattern: Use SWR via `use-api.ts` for async data; expose loading/error/data
- Example: `usePendingSubmissionCount()` in `app/hooks/usePendingSubmissionCount.ts`

**New Context Provider:**
- Location: `app/contexts/[Name]Context.tsx`
- Pattern: Create context, provider component, useHook to consume
- Wire up: Import in `app/layout.tsx` or `app/(app)/layout.tsx`, wrap children
- Example: GuildContext provides guild/member/permissions to entire (app) subtree

**New Static Data:**
- Location: `data/[name].ts`
- Pattern: Export as const array/object; typed with domain types
- Example: `data/cata-raids.ts` exports `const CATA_RAIDS: RaidTier[]`
- Script to generate: `scripts/seed-[name].ts` (if data is generated)

**New Script:**
- Location: `scripts/[task-name].ts`
- Pattern: Use Supabase client, log progress, handle errors
- Execute: `tsx scripts/[task-name].ts` (assumes tsx is installed)
- Example: `scripts/fetch-item-icons.ts` downloads icon URLs from Wowhead

## Special Directories

**app/api/admin/:** Admin-only endpoints. Gated by permission check in handler. Examples: analytics, bulk cleanup, diagnostics. No RLS — uses service role client.

**app/api/cron/:** Scheduled jobs (Vercel cron). Triggered by cron schedule (vercel.json). Examples: post-update notifications, trial auto-promote. No auth — IP gating via Vercel webhook signature.

**app/api/addon/:** In-game addon endpoints. Low-latency, high-volume endpoints for auction house addon. Examples: sync token, guild data, loot awards. Auth via addon sync token.

**lib/billing/:** Stripe integration. Checkout session creation, webhook handlers, customer portal. Handles subscription lifecycle (create, cancel, update).

**data/:** Read-only static data. Raids, items, classifications. Generated by scripts (`scripts/fetch-*`, `scripts/seed-*`). Committed to repo (no runtime fetch).

**public/:** Static assets. Fonts, favicons, manifest. Served directly; cached by CDN (immutable paths). Not deployed dynamically.

**.next/:** Next.js build output. Contains compiled pages, API routes, static optimization. Gitignored. Regenerated on every deploy.

**.planning/codebase/:** GSD analysis documents (this file). Written by `/gsd-map-codebase`; read by `/gsd-plan-phase` and `/gsd-execute-phase`. Updated when architecture changes significantly.

---

*Structure analysis: 2026-08-27*
