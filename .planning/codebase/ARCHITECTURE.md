<!-- refreshed: 2026-08-27 -->
# Architecture

**Analysis Date:** 2026-08-27

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Browser / Next.js Client                    │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ React Components + Context (Guild, Expansion, LootList)  ││
│  │ `app/components`, `app/contexts`, `app/hooks`            ││
│  └────────────┬─────────────────────────────────────────────┘│
│               │ SWR data fetching                             │
└───────────────┼─────────────────────────────────────────────┘
                │ HTTP
┌───────────────▼─────────────────────────────────────────────┐
│              Next.js API Routes (Route Handlers)             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ POST /api/loot-submissions/submit                       ││
│  │ GET /api/guilds/[id]                                    ││
│  │ POST /api/raid-events/bonus                             ││
│  │ `app/api/**/route.ts`                                   ││
│  └────────────┬─────────────────────────────────────────────┘│
│               │ Auth, validation, delegation                 │
└───────────────┼─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│           Domain Logic & Business Rules                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ calculateLootScore, scoringRules, guildPermissions       ││
│  │ lootHistoryQuery, warcraftlogsParser                     ││
│  │ `domain/*`, `lib/**`                                    ││
│  └────────────┬─────────────────────────────────────────────┘│
│               │ Supabase client queries                      │
└───────────────┼─────────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────────┐
│     Supabase (PostgreSQL + Auth + Realtime)                  │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ Tables: guilds, characters, loot_submissions,            ││
│  │         raid_events, loot_history, attendance_records    ││
│  │ RLS: Row-level security enforces guild/user access      ││
│  │ Service Role: Bypasses RLS for admin/batch operations    ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Route Handler (Auth/Validation) | Extract user, validate input, check permissions | `app/api/**/route.ts` |
| Domain Logic | Pure business rules: scoring, permissions, queries | `domain/**`, `lib/**` |
| Context Provider | UI state: selected guild, expansion, loot list | `app/contexts/*.tsx` |
| React Component | Render UI, bind to context/hooks | `app/components/*.tsx` |
| Supabase Client | SQL execution, auth session, RLS enforcement | `utils/supabase/*` |
| Cache Layer | User bundle prefetch, tag-based revalidation | `lib/cache/user-bundle.ts` |

## Pattern Overview

**Overall:** Full-stack Next.js with Domain-Driven Design (DDD) + Server-Side Rendering (SSR) + Server Context Prefetch

**Key Characteristics:**
- **Server-first**: Root layout, middleware, and (app) layout precompute guild/user data, passed to client via Context Prefetch
- **Route group separation**: `(app)` for authenticated pages, `(landing)` for public pages
- **Domain layer**: Scoring, permissions, and query logic live in `domain/` — imported by API and client hooks
- **React Context for UI state**: GuildContext (selected guild), ExpansionContext, LootListContext manage what the user is viewing
- **Supabase RLS**: Every query includes `user_id` filters; service role client bypasses RLS for admin/batch work
- **SWR for client data**: `use-api` hook wraps SWR, handles Supabase auth tokens, retries
- **Cache invalidation by tag**: `revalidateUserBundle()` revalidates `/api/user-bundle` when guild/expansion/preferences change

## Layers

**Presentation Layer (Browser & Server Components):**
- Location: `app/components`, `app/(app)`, `app/(landing)`
- Contains: Page layouts, form components, tables, modals
- Depends on: Context, hooks, client utilities
- Used by: Browser user, route handlers for initial render

**Context & State Management Layer:**
- Location: `app/contexts`
- Contains: GuildContext, ExpansionContext, LootListContext, NotificationContext
- Depends on: Supabase client, use-api hook
- Used by: React components, prefetch provider

**API/Route Handler Layer:**
- Location: `app/api`
- Contains: Supabase auth validation, request/response transformation
- Depends on: Domain logic, Supabase client, utilities
- Used by: Browser (fetch), server (next/navigation), cron jobs

**Domain Logic Layer:**
- Location: `domain/`
- Contains: Scoring algorithms, guild permissions, loot prioritization rules
- Depends on: Database types (lib/database.types.ts)
- Used by: API routes, client-side hooks, scripts

**Data Access Layer:**
- Location: `utils/supabase/`, `lib/db.ts`
- Contains: Supabase client initialization, auth helpers, DB type aliases
- Depends on: Supabase client library, environment variables
- Used by: API routes, contexts, domain logic

**Integration Layer:**
- Location: `lib/` (external service clients)
- Contains: Battle.net API, WarcraftLogs API, Discord webhooks, Stripe
- Depends on: HTTP clients, API keys from env
- Used by: API routes, domain logic

## Data Flow

### Primary Request Path (Submit Loot)

1. User fills form in `app/(app)/loot-submissions` (`app/(app)/loot-submissions/page.tsx`)
2. Component calls `useApi('/api/loot-submissions/submit', 'POST')` hook → `app/hooks/use-api.ts`
3. Hook creates SWR request with Supabase auth token → HTTP POST to `/api/loot-submissions/submit`
4. Route handler at `app/api/loot-submissions/submit/route.ts`:
   - Extracts user via `getAuthenticatedUser()`
   - Validates request body (character name, items, guild)
   - Calls domain function: `calculateLootScore(...)` from `domain/scoring/`
   - Inserts record: `supabase.from('loot_submissions').insert(...)`
   - Returns JSON response
5. SWR hook receives response → triggers `revalidateUserBundle()` to bust cache
6. GuildContext refetches guild data → components re-render with updated state

### Raid Scoring Flow

1. Officer opens `app/(app)/master-sheet` → LootListContext loads loot submissions + raid history
2. Scoring engine combines:
   - Submissions from `loot_submissions` table
   - Attendance from `attendance_records` table
   - Loot history from `loot_history` table
3. `calculateLootScore()` (domain) applies rules: class priority, spec bonus, attendance multiplier, item history
4. Scores computed client-side in LootListContext → displayed in UI
5. Officer approves item award → POST `/api/loot-history` → Supabase insert + Discord webhook

### Prefetch/Cache Flow

1. User navigates to `app/(app)/` → layout.tsx SSR executes
2. `(app)/layout.tsx` calls `getCachedUserBundle(user.id)` (line 20)
3. Cache miss → queries Supabase:
   - `getCachedUserBundle()` fetches characters, guild memberships, preferences
   - Stores in Next.js Data Cache with tag `user-${user.id}`
4. Data passed to `<PrefetchProvider>` → hydrates React Context (line 33)
5. When data changes, API route calls `revalidateUserBundle(userId)` → invalidates tag → cache busts on next request

**State Management:**
- Server: User bundle in Next.js Data Cache (keyed by user ID)
- Client: React Context (GuildContext holds selected guild ID, ExpansionContext holds selected expansion)
- Refresh: `revalidateUserBundle()` called after mutations (guild create, raid event, etc.)

## Key Abstractions

**GuildContext:**
- Purpose: Manages selected guild, active guild member, permissions state
- Examples: `app/contexts/GuildContext.tsx` (900 lines)
- Pattern: Provider wraps entire app; useGuild() hook accessed by components
- Scope: Includes guild info, member role, subscription tier

**LootListContext:**
- Purpose: Manages loot submissions list, filtering, sorting, editing state
- Examples: `app/contexts/LootListContext.tsx` (1200 lines)
- Pattern: Complex state machine for item selection, multi-item edit, resubmit workflow
- Scope: Loot submissions + raid events for selected guild + expansion

**Domain Modules (Scoring):**
- Purpose: Encapsulate pure business logic for loot priority scoring
- Examples: `domain/scoring/calculateLootScore.ts`, `domain/scoring/scoringRules.ts`
- Pattern: Functions accept DB rows, return computed scores (no side effects)
- Scope: Attendance weighting, class priority, item cooldown, spec bonus

**Supabase Clients:**
- Purpose: Separate auth context — client (auth token), server (session), service role (admin)
- Examples: `utils/supabase/client.ts`, `utils/supabase/server.ts`, `createServiceRoleClient()`
- Pattern: `createClient()` returns context-aware Supabase client; RLS filters automatically applied
- Scope: Authentication, query signing, real-time subscriptions

## Entry Points

**Web Application:**
- Location: `app/layout.tsx` (root layout, providers)
- Triggers: Browser request to getlootlist.com
- Responsibilities: Render root HTML, wrap children in ThemeProvider, SWRProvider, GuildContextProvider, PostHog, analytics

**Authenticated Routes:**
- Location: `app/(app)/layout.tsx`
- Triggers: User navigates to /overview, /master-sheet, /loot-submissions
- Responsibilities: Fetch user bundle, prefetch guild/character data, render AppLayout client component

**API Routes:**
- Location: `app/api/**/route.ts` (multiple)
- Triggers: XHR/fetch from browser or POST/GET from cron jobs
- Responsibilities: Validate auth, parse input, call domain logic, return JSON

**Cron Jobs:**
- Location: `app/api/cron/**/route.ts` (Vercel cron)
- Triggers: Scheduled via vercel.json
- Responsibilities: Post-update notifications, trial auto-promote, resubmit reminders

## Architectural Constraints

- **Threading:** Single-threaded event loop (Node.js); blocking operations offloaded to Supabase via async queries
- **Global state:** Limited use of module-level singletons; Supabase clients cached per request context (not global)
- **Circular imports:** `domain/index.ts` barrel-exports all domain modules; checked by eslint
- **RLS enforcement:** All client queries include user_id filter; service role client used only in API routes for batch operations
- **Authentication:** Supabase Auth (magic link, OAuth); session token passed in Authorization header
- **Data consistency:** Optimistic updates in UI; client sends request, Supabase enforces RLS, response triggers cache revalidation

## Anti-Patterns

### Direct DB Access in Components

**What happens:** Components fetch Supabase data directly without going through API route
**Why it's wrong:** Auth token exposed to browser; RLS bypass risk; no centralized validation
**Do this instead:** Export from `app/hooks/use-api.ts`, which wraps API route calls via SWR. Example: `const { data } = useApi('/api/guilds')` instead of `supabase.from('guilds').select()`

### Mixing Domain Logic with API Routes

**What happens:** Scoring logic, permission checks, business rules coded inline in route.ts files
**Why it's wrong:** Logic not testable, not reusable by client/scripts, scattered across codebase
**Do this instead:** Extract to `domain/` module; import and call from API route. Example: `domain/scoring/calculateLootScore.ts` used by both `/api/loot-submissions` and client-side LootListContext

### Synchronous Database Calls in Route Handlers

**What happens:** Await Supabase queries without retry/backoff; single failure crashes request
**Why it's wrong:** Timeout risk; no resilience to transient DB issues
**Do this instead:** Use SWR retry logic on client; Supabase's built-in exponential backoff on server; wrap critical paths in try/catch with fallback responses

### Context Props Drilling

**What happens:** Passing guild ID, user ID through 5+ levels of component props
**Why it's wrong:** Fragile; adds noise; hard to refactor
**Do this instead:** Consume from Context directly via hooks (useGuild(), useExpansion())

## Error Handling

**Strategy:** Fail safely; show user-friendly error messages; log errors for debugging

**Patterns:**
- **API routes**: Try/catch wrapping Supabase calls; return 400/403/500 with error message
- **Client components**: Error boundaries (ChunkErrorReload) catch React render errors; NotificationContext displays toast messages
- **Async operations**: SWR handles fetch errors; component displays "Error loading data" with retry button
- **Auth errors**: 401 Unauthorized → redirect to /auth/login via middleware or useRouter
- **RLS violations**: 403 Forbidden → log to analytics, display "You don't have access"

## Cross-Cutting Concerns

**Logging:** PostHog (client) + console (server) for analytics; `trackEvent()`, `trackApiError()` exported from `utils/analytics/server.ts`

**Validation:** Zod schemas planned but not yet adopted; currently inline checks in API routes + domain functions

**Authentication:** Supabase Auth session validated in middleware (`next-auth-like` pattern); token re-verified in API routes via `getAuthenticatedUser()`

**Authorization:** Guild membership checked in API routes; RLS in Supabase enforces row-level access (guild_id filter on all queries)

**Rate Limiting:** Upstash Redis + Rate-limit middleware for public endpoints (`@upstash/ratelimit`)

---

*Architecture analysis: 2026-08-27*
