# LootList+ — Search & AI Sprint Completion

## What This Is

LootList+ is a transparent loot-management system for World of Warcraft Classic guilds: raiders submit ranked loot lists, officers track attendance, and Loot Scores show who has priority for each item and why. This milestone finishes the remaining items of the 30-day Search & AI Visibility Sprint (Aug 26–Sep 24, 2026) — the sprint's P0 foundation shipped in PRs #243–#247; what remains is proof, evidence content, and measurement wrap-up.

## Core Value

An officer who lands on the site immediately understands the category, trusts checkable proof, and completes enough setup to become an activated guild — measured as 7-day activated guilds per weekly cohort (+30% by the Sep 18–24 cohort vs the Aug 24–30 baseline).

## Business Context

- **Customer**: WoW Classic guild officers (free core plan); guilds needing multi-team support (Premium, $4.99/mo or $39/yr per guild)
- **Revenue model**: Per-guild Premium subscription via Stripe (live since 2026-08-26)
- **Success metric**: 7-day activated guilds per weekly acquisition cohort
- **Strategy notes**: Full sprint plan at `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` (exact copy, event schemas, acceptance criteria — read before doing sprint work)

## Requirements

### Validated

- ✓ Ranked loot lists, attendance-weighted Loot Scores, score breakdowns, bad-luck protection — existing core product
- ✓ Discord OAuth signup, guild creation, Warcraft Logs import, in-game addon workflows — existing
- ✓ Premium billing (Stripe checkout, portal, webhook, Discord role grant, 14-day trial) — shipped #233–#251
- ✓ Sprint #1: /about rebuilt as self-canonical entity page (AboutPage + Person "Zev" schema) — shipped #243
- ✓ Sprint #2: /pricing live; free/Premium language corrected everywhere; schema offers point at /pricing — shipped #243
- ✓ Sprint #3 (hero half): homepage hero rewrite (kept "Epic loot deserves an epic system" H1), loot-decision proof section, Pricing in nav — shipped #244–#245
- ✓ Sprint #4: acquisition + activation funnel events, guild_funnel_milestones, four pinned PostHog dashboards (2036463–2036466) — shipped #245–#246
- ✓ Sprint #9: consistent Zev author identity (Person schema + visible byline) on all 9 blog posts — shipped #247

### Active

- [ ] Signup page copy rewrite (sprint #3, second half) — plan has exact copy; must be taste-checked against LoginPage and the established hero voice
- [ ] Sprint #6: testimonial verification format — every homepage quote gets role/guild/expansion/date + verification note; unsupported stats ("3+ hours saved") replaced with checkable product facts
- [ ] Sprint #11: anonymized product-data report at `/research/wow-classic-loot-systems-2026` — methodology, ≥3 findings, ≥10 guilds per published segment, numbers reproducible from saved queries (prod data via Supabase Management API)
- [ ] Sprint #12: verified guild case study page at `/customers/{guild-slug}` — page template + publish; content blocked on user-conducted interview (questions in plan)
- [ ] Sprint #10: GSC baseline export — blocked on user regenerating GSC OAuth creds (wiped from .env.local by `vercel env pull`; steps in `scripts/analytics/pull-gsc.py` docstring); PostHog baseline already pulled 2026-08-26
- [ ] Sprint #14: contextual internal linking across marketing pages + one-time recrawl requests after everything is final
- [ ] Sprint #15: week-4 review — cohort comparison vs baseline, CTR/query review, pick the next bet from data
- [ ] Weekly AI-answer test set — 6 fixed prompts from the plan, run from clean sessions, results recorded

### Out of Scope

- Sprint #8 (Reddit/Blizzard dated corrections) — user chose to keep external-surface work out of this milestone; founder-owned actions
- Sprint #13 (CurseForge listing + walkthrough video) — same; requires user's CurseForge/YouTube accounts
- New blog volume / keyword-variant pages — plan explicitly forbids; evidence content only
- llms.txt, purchased backlinks, AI-written listicles — plan's "what not to do" list
- Separate TMB/DKP/EPGP articles — not until GSC shows the Compare page can't capture the queries

## Context

- Brownfield: Next.js 16 App Router + React 19 + Supabase (Postgres/Auth/RLS), TypeScript, Tailwind. Codebase map in `.planning/codebase/` (refreshed 2026-08-27).
- The sprint plan doc contains exact copy for every remaining page — but the user rejected the plan's hero copy once already for being wordy; all plan copy needs a taste-check before shipping (concise, personality-first; "Epic loot deserves an epic system" is sacred).
- No em dashes in user-facing copy (enforced repo-wide in #253).
- Prod DB access is only via Supabase Management API (CLI token in macOS keychain); no Supabase keys in .env.local.
- Data report privacy floor: minimum 10 guilds per published segment; no player/guild names in analytics or published data.
- PostHog funnels must not mix user-scoped events with guild-scoped milestone events (different distinct-id spaces).
- Any feature/pricing/positioning change triggers a full surface sweep (site, schema, Discord, GitHub, legal, external posts).

## Constraints

- **Timeline**: Sprint window ends Sep 24, 2026; week-4 review is Sep 20–24; recrawl requests happen once, only after all content is final
- **Dependencies**: Case study content blocked on user interview; GSC baseline blocked on user regenerating OAuth creds
- **Privacy**: Report publishes only aggregate, privacy-safe measures; ≥10 guilds per segment; raise the floor if combinations could identify a guild
- **Copy voice**: Plan copy is a starting point, not gospel — user sign-off required on user-facing copy; no em dashes
- **CI/CD**: Migration-only PRs need --admin merge; migrations auto-deploy ~12s after merge; CodeQL blocks tainted format strings

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep "Epic loot deserves an epic system" as H1; fold category into body | User rejected the plan's wordy hero copy; tagline is sacred | ✓ Good |
| Public creator identity stays "Zev", not linked to real-name GitHub | Privacy preference; can opt in later | ✓ Good |
| External surfaces (#8, #13) deferred out of this milestone | Founder-owned accounts/actions; user chose to focus on in-repo + evidence + measurement | — Pending |
| Case study ships as template + checkpoint, not fabricated content | Proof must be verifiable; interview is user-owned | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-27 after initialization*
