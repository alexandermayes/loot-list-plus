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

### Validated (Phase 4)

- ✓ Sprint #12 (template half): case-study template at `/customers/{guild-slug}` with outcome H1, length-aware proof strip, before/after panels, credible-limitation section, one contextual CTA; every visible string byte-matched to the signed-off copy draft; production reachability zero until publish (empty registry, interim noindex, sitemap guard) — Phase 4 (UAT passed 2026-09-06, 18/18 must-haves)
- ✓ Interview kit (ten verbatim questions plus roster, tier and tenure asks, written-approval checklist) and self-contained publish runbook — Phase 4. The interview itself and the published case study (EVID-05) remain blocked on the user.
- ✓ Middleware fix: `/research` and `/customers` are public routes with boundary matching (`lib/public-routes.ts`, tested); before this, the Phase 3 report and the case study redirected every logged-out visitor and crawler to the landing page — Phase 4 (quick task 260906-ure)

### Validated (Phase 3)

- ✓ Sprint #11: anonymized product-data report at `/research/wow-classic-loot-systems-2026` with methodology, four published findings, the 10-guild floor on every segment, saved SQL and committed JSON/CSV artifacts, reproducible against the pinned final snapshot — Phase 3 (completed 2026-09-05)

### Validated (Phase 2)

- ✓ Signup page copy rewrite (sprint #3, second half) — approved copy shipped through metadata, component, cross-domain link, and render test — Phase 2 (UAT passed 2026-09-01)
- ✓ Sprint #6: testimonial verification format — per-quote verification lines (name, guild, verification link or self-attestation note); unsupported stats replaced with checkable facts ("5 supported Classic expansions") — Phase 2. Note: role/expansion/date omitted (not fabricated) where the user did not supply per-quote metadata; accepted as data-availability gap per D-02, confirmed at UAT test 3.

### Validated (Phase 1)

- ✓ Sprint #10: GSC baseline export — trend exports (3 months) plus the complete Aug 24 to 30 cohort committed with provenance and query clusters (brand/competitor/problem/expansion); OAuth blocker resolved 2026-08-28; complete cohort re-pulled 2026-09-03 (final data through 2026-08-30, partial file replaced) — Phase 1
- ✓ Weekly AI-answer test set instrument — RUNBOOK.md (6 verbatim prompts, 3 surfaces, session hygiene), validating log appender, and the week-1 run recorded (18/18 cells, 2026-08-28) — Phase 1. Weekly runs continue through the sprint as an operational cadence (next runs feed the Phase 6 week-4 review).

### Active

- [ ] Sprint #12 (publish half): conduct the guild interview from `04-INTERVIEW-KIT.md`, obtain written approval, then follow `04-PUBLISH-RUNBOOK.md` (EVID-05, blocked on user)
- [ ] Deploy Phases 2 to 4: local `main` is far ahead of `origin/main`; nothing from the sprint is live, and Phase 5's one-time recrawl must wait for that deploy
- [ ] Harden the case-study publish commit: escape `<` in JSON-LD injection and assert https-only public-profile URLs at registry load (two medium findings in `04-SECURITY.md`)
- [ ] Sprint #14: contextual internal linking across marketing pages + one-time recrawl requests after everything is final
- [ ] Sprint #15: week-4 review — cohort comparison vs baseline, CTR/query review, pick the next bet from data

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
| Testimonial metadata gap accepted, not backfilled | User did not supply role/expansion/date per quote; D-02 forbids invention, so fields are omitted rather than guessed | ✓ Good (UAT 2026-09-01) |
| Blog titles keep indexed-title decision; title mirrors kept in agreement | Preserve existing rankings while sweeping repositioning copy | ✓ Good |
| Partial cohort shipped labelled, complete window re-pulled on dated follow-up (D-03) | GSC final-data lag must not hold the phase hostage, and missing days are never approximated | ✓ Good (closed 2026-09-03) |
| Premium Discord role sync verified live in prod; hardening deferred to post-sprint task | Grant+revoke pipeline confirmed working (env vars, webhook, discord_id coverage); gaps are structural: no backfill/reconciliation, comped guilds excluded, fire-and-forget call | — Pending (design awaiting user sign-off) |
| Proof-strip figures use length-aware sizing (42/32/20px tiers) rather than a value/unit data split | Guild answers are phrases, not numerals; sizing keeps approved copy and the data shape intact with no re-sign-off | ✓ Good (visual re-check 2026-09-06) |
| Middleware public-route allowlist extended with boundary matching for /research and /customers | Both evidence pages were auth-gated for crawlers; boundary matching keeps lookalikes such as /researchers gated | ✓ Good (tests + live probe) |
| Case-study CTA analytics namespace accepted as-is (AR-04-01) | Attribution holds through BlogTracker delegation; renaming is analytics cleanup already in the todo list | — Accepted |

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
*Last updated: 2026-09-06 after Phase 4*
