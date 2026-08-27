# External Integrations

**Analysis Date:** 2026-08-27

## APIs & External Services

**Authentication & Authorization:**
- Battle.net OAuth 2.0 - WoW character linking and session management
  - Implementation: `lib/battlenet.ts`, `app/api/auth/battlenet/route.ts`, `app/api/auth/battlenet/callback/route.ts`
  - Scope: `wow.profile`
  - Regions: US, EU
  - Env vars: `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET`

**Gaming Data & Stats:**
- Blizzard WoW API (REST) - Character profiles, realm data, item information
  - API hosts: `https://us.api.blizzard.com`, `https://eu.api.blizzard.com`
  - Implementation: `lib/battlenet.ts`
  - Auth: OAuth token-based

- Warcraft Logs API v2 (GraphQL) - Raid reports, guild performance data
  - Implementation: `lib/warcraftlogs.ts`
  - Client: None (direct GraphQL via fetch)
  - Scope: Guild metadata, raid report codes
  - Env vars: `WARCRAFTLOGS_CLIENT_ID`, `WARCRAFTLOGS_CLIENT_SECRET`
  - Token caching: Module-level cache with expiration tracking

- Wowhead APIs - Item lookups, tooltips, zone/dungeon metadata
  - Implementation: `lib/wowhead.ts`
  - Domain: `https://wow.zamimg.com`
  - Use: Icon URLs, item stats (via client-side tooltip integration)

- WowSims - Simulation data parsing and DPS metrics
  - Implementation: `lib/wowsims-parser.ts`
  - Use: Parse damage sims for item stat optimization

## Data Storage

**Databases:**
- Supabase PostgreSQL - Primary application database
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (browser), `SUPABASE_URL` (server)
  - Auth: Anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), Service role key (`SUPABASE_SERVICE_ROLE_KEY`)
  - Clients: 
    - Browser: `@supabase/ssr` via `utils/supabase/client.js`
    - Server: `@supabase/ssr` via `utils/supabase/server.ts`
    - Admin: Service role via `utils/supabase/service-role.ts`
  - Schema: 27+ tables (migrations in `supabase/migrations/`)
  - Key tables: characters, guilds, raid_teams, loot_history, users, battlenet_accounts
  - Row-level security (RLS) enabled for multi-tenancy

**File Storage:**
- Discord CDN - User avatars, guild icons
  - Domains: `https://cdn.discordapp.com` (avatars, embed images)
  - Image remapping: Next.js allowed remote patterns in `next.config.ts`

- Wikia/Fandom - WoW static assets
  - Domain: `https://static.wikia.nocookie.net`
  - Use: Boss images, zone artwork

- Akamai CDN - Blizzard-hosted game assets
  - Domain: `https://*.akamaihd.net`
  - Use: WoW item icons and textures

- Local filesystem - Item data, boss metadata, seed files
  - Location: `data/` (JSON reference files)
  - Storage type: Committed reference data, not runtime uploads

**Caching:**
- Upstash Redis (serverless)
  - Client: `@upstash/redis` 1.36.1
  - Use: User bundle prefetching, submission tags, dashboard attendance
  - Implementation: `lib/cache/`
  - Strategy: Next.js `unstable_cache` with tag-based revalidation
  - Env var: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth with Battle.net OAuth
  - Implementation: Custom OAuth flow in `app/api/auth/`
  - Session management: JWT-based cookies set by Supabase
  - State parameter: CSRF token stored in httpOnly cookie
  - Cookie settings: Secure in prod, sameSite=lax, 10min state TTL
  - Redirect handling: Post-OAuth callback at `/api/auth/battlenet/callback`

**User Session Verification:**
- Server-side: `utils/supabase/server.ts` - `getAuthenticatedUser()`
- Client-side: Supabase session listener via `@supabase/ssr`
- Service-role access: `utils/supabase/service-role.ts` for admin operations

## Payments & Billing

**Payment Processor:**
- Stripe 22.5.0
  - Implementation: `lib/billing/stripe.ts`
  - Client: Server-side only via `getStripe()`
  - Plans: Two subscription tiers (monthly, annual)
  - Price IDs: `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`
  - Secret key: `STRIPE_SECRET_KEY`

**Billing Sync:**
- Discord Premium tiers synced to Supabase `billing_tier` column
  - Implementation: `lib/billing/discord-premium.ts`, `lib/billing/sync.ts`
  - Use: Feature gating (guild size limits, advanced features)

## Monitoring & Observability

**Error Tracking:**
- Not detected - Error handling via try-catch and graceful degradation

**Analytics:**
- PostHog (client + server)
  - Client SDK: `posthog-js` 1.345.2
  - Server SDK: `posthog-node` 5.24.14
  - Implementation: `utils/analytics/client.ts`, `utils/analytics/server.ts`
  - Key: `NEXT_PUBLIC_POSTHOG_KEY`
  - Host: `NEXT_PUBLIC_POSTHOG_HOST` (default: `https://us.i.posthog.com`)
  - Proxy: Rewritten at `/a/` to bypass ad blockers
  - Features: Event tracking, user properties, feature flags (via `utils/feature-flags-server.ts`)
  - Config: Immediate flush for serverless (`flushAt: 1`)

**Logs:**
- Vercel - Built-in logs for function invocations
- Console logging - Application-level debug logs (no external logging)

**Performance Monitoring:**
- Vercel Analytics (`@vercel/analytics`)
- Vercel Speed Insights (`@vercel/speed-insights`)
- CSP compliance for both services

## CI/CD & Deployment

**Hosting:**
- Vercel - Main application (Next.js 16)
  - Deployment: Git push to GitHub
  - Environment: Serverless Functions
  - Cron jobs: 3 scheduled tasks via `vercel.json`

- Railway or Cloud Run - Discord bot
  - Deployment: Via `nixpacks.toml`
  - Runtime: Node.js 20
  - Startup: `cd discord-bot && npm start`

- Electron Builder - Companion app
  - Platforms: macOS (dmg, zip), Windows (NSIS, portable), Linux (AppImage)
  - Publish: GitHub releases
  - Distribution: `release/` directory

**CI Pipeline:**
- GitHub Actions (workflows in `.github/`)
  - Tests: Vitest, TypeScript type-check
  - Linting: ESLint
  - Build: Next.js build verification

## Environment Configuration

**Required env vars (main app):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side admin access
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog analytics
- `BLIZZARD_CLIENT_ID`, `BLIZZARD_CLIENT_SECRET` - Battle.net OAuth
- `WARCRAFTLOGS_CLIENT_ID`, `WARCRAFTLOGS_CLIENT_SECRET` - WCL API
- `STRIPE_SECRET_KEY` - Stripe billing
- `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` - Stripe plan IDs
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` - Redis cache

**Optional env vars:**
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog instance URL (defaults to US)
- `ANALYZE=true` - Enable Next.js bundle analyzer on build

**Discord Bot env vars:**
- `DISCORD_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord application ID
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` - Database access

**Secrets location:**
- Vercel Secrets - Production environment variables
- macOS Keychain - CLI auth tokens (per memory: `Prod SQL via Management API`)
- `.env.local` - Local development (git-ignored)

## Webhooks & Callbacks

**Incoming:**
- `POST /api/auth/battlenet/callback` - Battle.net OAuth callback
- `GET /api/cron/post-update` - Hourly cron job
- `GET /api/cron/auto-promote-trials` - 6 AM daily cron job
- `GET /api/cron/resubmit-reminders` - 4 PM daily cron job
- `POST /api/donations` - Stripe donation webhooks (not detected but implied)

**Outgoing:**
- PostHog event flushing - Analytics endpoint rewrite via `/a/` proxy
- Stripe API calls - Subscription management (outbound HTTP via Stripe SDK)
- Battle.net API calls - Character profile fetches
- Warcraft Logs GraphQL queries - Guild/report data fetching
- Discord API - Bot messages (discord-bot app)

## Rate Limiting & Quotas

**Rate Limiting:**
- Upstash RateLimit (`@upstash/ratelimit`)
  - Use: API endpoint protection
  - Implementation: Middleware in API routes
  - Config: Per-user/per-IP with sliding window

**Known Quotas:**
- Battle.net API - Standard Blizzard rate limits
- Warcraft Logs GraphQL - Token-based rate limiting
- Supabase - Depends on plan tier

---

*Integration audit: 2026-08-27*
