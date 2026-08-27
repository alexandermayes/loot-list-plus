# Technology Stack

**Analysis Date:** 2026-08-27

## Languages

**Primary:**
- TypeScript 5 - Application code, server functions, components, type-safe database interactions
- JavaScript/JSX - React components (React 19.2.3)
- SQL - Supabase migrations and seed data

**Secondary:**
- Lua - WoW addon scripts in `addon/` directory
- Go - Companion app backend scaffolding

## Runtime

**Environment:**
- Node.js 20 - Main application (Next.js) and Discord bot
- Node.js 22 - Companion app (Electron-vite)
- Browser - React client (ES2017 target)

**Package Manager:**
- npm 10+ (based on package-lock.json)
- Lockfile: `package-lock.json` (committed)

## Frameworks

**Core:**
- Next.js 16.2.12 - Full-stack React framework with App Router, API routes, Server Components
- React 19.2.3 - UI components and state management via hooks
- Supabase 0.8.0+ (@supabase/ssr) - PostgreSQL database + Auth + Real-time
- Electron 43.0.0 - Desktop companion app in `companion/`

**UI & Styling:**
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- PostCSS 8.5.18 - CSS processing
- Autoprefixer 10.4.23 - CSS vendor prefixes
- Radix UI (checkbox, dropdown, label, radio, slot, switch) - Accessible component primitives
- HugeIcons (@hugeicons/react) - Icon library
- Framer Motion 12.29.2 - Animation library
- dnd-kit 6.3.1+ - Drag-and-drop toolkit
- TailwindCSS Animate 1.0.7 - Tailwind animation utilities

**Testing:**
- Vitest 4.1.0 - Unit and component tests
- @testing-library/react 16.3.2 - React component testing
- @testing-library/jest-dom 6.9.1 - DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- jsdom 29.1.1 - DOM environment for tests

**Build & Dev:**
- eslint 9 + eslint-config-next - Linting with React hooks rules enforced
- TypeScript compiler (tsc) - Type checking
- tsx 4.22.4 - TypeScript executor for scripts
- Electron-vite 3.1.0 - Build tool for Electron app in `companion/`
- Vite 6.4.3 - Build tool for Electron renderer in `companion/`
- @next/bundle-analyzer - Next.js bundle analysis (opt-in via ANALYZE=true)
- electron-builder 26.15.3 - Electron app packaging

**Load Testing:**
- k6 - JavaScript load testing framework
- Artillery - YAML-based load testing tool

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.90.0 - PostgreSQL client with Auth, real-time subscriptions
- next 16.2.12 - React framework and server runtime
- stripe 22.5.0 - Payment processing
- discord.js 14.25.1 - Discord bot framework (discord-bot/)
- posthog-js 1.345.2 - Client-side analytics
- posthog-node 5.24.14 - Server-side analytics

**Infrastructure:**
- @upstash/redis 1.36.1 - Redis client for caching
- @upstash/ratelimit 2.0.8 - Rate limiting middleware
- @vercel/analytics 2.0.1 - Vercel Web Analytics
- @vercel/speed-insights 1.3.1 - Vercel Speed Insights
- dotenv 17.2.3 - Environment variable loading

**Data & Utilities:**
- wow-classic-items 2.0.1 - WoW item database
- html2canvas 1.4.1 - HTML-to-image conversion
- swr 2.3.8 - Data fetching with caching
- postgres 3.4.8 - PostgreSQL client for admin/script tasks
- class-variance-authority 0.7.1 - CSS class composition
- clsx 2.1.1 - Conditional className builder
- tailwind-merge 3.4.0 - Tailwind CSS conflict resolution
- @tanstack/react-virtual 3.13.18 - Virtual scrolling for lists
- next-themes 0.4.6 - Dark mode support
- chokidar 3.6.0 - File system watcher (companion app)

## Configuration

**Environment:**
- Configuration via environment variables (`NEXT_PUBLIC_*`, `STRIPE_*`, `BLIZZARD_*`, etc.)
- `.env.local` for local development (not committed)
- `.env.example` documents required variables
- Supabase project credentials: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Analytics: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`

**Build:**
- `next.config.ts` - Next.js configuration with CSP headers, image remapping, security headers
- `tsconfig.json` - TypeScript: ES2017 target, strict mode, path aliases (`@/*`)
- `tailwind.config.js` - Dark mode, custom typography (Poppins, WoW fonts), design tokens
- `postcss.config.js` - PostCSS with Tailwind
- `vitest.config.ts` - jsdom environment, globals enabled, path aliases
- `vitest.setup.ts` - Test cleanup registration
- `.vercel/` - Vercel deployment configuration
- `vercel.json` - Cron job schedule (3 jobs)
- `railway.json` - Railway deployment config for Discord bot
- `nixpacks.toml` - Deployment for Discord bot: Node 20, npm install, start script
- `components.json` - shadcn/ui component registry (minimal setup)
- `package.json` overrides - Force specific versions of postcss, sharp

## Platform Requirements

**Development:**
- Node.js 20 (main app) or Node.js 22 (companion app)
- Postgres/Supabase CLI for local development
- Git for version control
- bash for shell scripts

**Production:**
- Vercel - Main application deployment (Next.js)
- Railway or Cloud Run - Discord bot deployment (Node.js)
- Electron - Desktop companion app (macOS, Windows, Linux)
- PostgreSQL - Supabase hosted database
- Upstash - Redis cache and rate limiting (serverless)

---

*Stack analysis: 2026-08-27*
