# Phase 2: Checkable Conversion Copy - Research

**Researched:** 2026-08-28
**Domain:** Next.js App Router copy/metadata changes + one-time aggregate DB lookup (no new libraries, no new runtime surfaces)
**Confidence:** HIGH (all claims below are grounded in files read this session; the only genuinely open items are marked ASSUMED/Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All 5 homepage quotes stay up. They are already author-sourced: the user collected each quote directly from its author on Discord, and the wording is the author's own. No quote is pulled, no re-approval round is needed, wording is not edited.
- **D-02:** Per-quote metadata (role, expansion/tier, interview month/year) is supplied by the user at an execution checkpoint, the same pattern as the Phase 1 AI-answer run. The executor must not invent, infer, or approximate any metadata field. A quote whose metadata the user cannot supply keeps only the attribution that is already true on the page today.
- **D-03:** Verification line format follows the sprint plan: link the guild's public Warcraft Logs page where one exists; otherwise use the "Verified LootList+ customer" note. Reversibility: costly — the format becomes the public proof pattern the case study (Phase 4) and report (Phase 3) pages will echo; changing it later means touching every proof surface.
- **D-04:** The executor checks each quoted guild's recent activity via the Supabase Management API (aggregate lookup only, no player data). Currently active guilds get "Verified LootList+ customer"; inactive guilds get date-anchored phrasing ("Verified customer, interviewed {Month Year}") so the page never implies a historical quote is from a currently active guild.
- **D-05:** No structured data for testimonials. Self-serving review markup violates Google guidelines; the verification lines are visible text for humans and AI crawlers. Executors must not add Review/AggregateRating schema to quotes.
- **D-06:** Replace only the "3+ hours saved a week" StatCard. Its replacement is "5 supported Classic expansions", which must be fact-checked against the product (Era through MoP) before shipping. The existing "0 spreadsheets needed" and "1 system for loot, attendance, and priorities" cards stay as-is.
- **D-07:** The sprint plan's signup copy (title, H1 "Set up fair loot in minutes.", body, CTA "Continue with Discord", secondary link) is the starting point. The executor drafts a voice-adapted version (concise, personality-first, matching the established hero voice) for the user's sign-off. Plan copy is never shipped without that approval.
- **D-08:** The signup page's secondary link "See how LootList+ works" anchors to the homepage LandingHowItWorks section.
- **D-09:** /changelog gets an unambiguous changelog-intent title/meta and the homepage title is strengthened to own "loot list" intent. No noindex on /changelog. Reversibility: reversible.
- **D-10:** Homepage title tag is category-forward (searcher's words first, brand attached), e.g. leading with loot list / attendance / Loot Score vocabulary. The on-page H1 "Epic loot deserves an epic system" is sacred and does not change.
- **D-11:** /compare title/meta are rewritten to earn clicks from competitor queries ("tmb loot" etc.) using checkable claims, not marketing superlatives. Context: the week-1 AI answer log shows Claude cites /compare in 4 of 6 answers but flagged it as vendor-written marketing; GSC shows position ~9 to 12.6 with 0 to 1.31% CTR on those queries.
- **D-12:** Broaden positioning wording from "WoW Classic" to "World of Warcraft" across ALL in-repo user-facing surfaces: marketing pages, titles/metas, app text, JSON-LD schema. Reversibility: costly — this touches many surfaces and the standing full-sweep rule; a half-applied broadening (marketing broad, schema narrow) is worse than either consistent state.
- **D-13:** No Retail-support claim ships anywhere. Retail support does not exist today; the user wants to investigate building it (deferred, see below). Feature-level claims stay expansion-specific and checkable ("5 supported Classic expansions" is true and stays). "For World of Warcraft guilds" is acceptable broad wording because Classic is WoW; "works with Retail" is not.
- **D-14:** External founder-owned surfaces (Discord server description, GitHub repo description, old external posts) are NOT edited by executors. The phase produces a handoff checklist of externally needed wording changes for the user, consistent with the sprint #8 out-of-scope decision.
- **D-15:** The unsupported-claims audit sweeps the FULL marketing surface: homepage, /about, /pricing, /compare, and blog posts. Every unverifiable claim is flagged and fixed or removed, subject to sign-off.
- **D-16:** Copy sign-off is ONE consolidated checkpoint: all drafted copy (signup, stats, quote formats, titles/metas, repositioned wording) is presented in a single approval pass. Nothing user-facing ships before that approval. No em dashes in any authored copy (repo-enforced).

### Claude's Discretion

- Exact voice-adapted phrasing of drafts (within the plan's copy as starting point and the established voice), presented at the sign-off checkpoint.
- Which pages beyond the named ones contain unverifiable claims (audit findings).
- Mechanics of the guild-activity lookup query (aggregate only, no player/guild-identifying data in artifacts or commits).

### Deferred Ideas (OUT OF SCOPE)

- **Investigate Retail loot-system support** (item data, current-tier loot tables, addon implications). New product capability, user explicitly wants to explore it; belongs in its own phase or next milestone. Until it exists, no Retail claim ships (D-13).
- **External-surface repositioning sweep** (Discord server, GitHub description, old posts): founder-owned; Phase 2 delivers the checklist (D-14), the user executes it.
- **"loot list" cluster gap**: the top generic query is unclustered in the fixed GSC keyword scheme; do not edit cluster lists mid-sprint, flag at the Phase 6 review.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COPY-01 | Signup page shows rewritten officer-intent copy (title, H1, body, CTA, secondary link), taste-checked against hero voice, no em dashes | `app/components/LoginPage.tsx` and `app/page.tsx` fully read (current copy, current metadata, current secondary-link bug); anchor target `#how-it-works` verified in `LandingHowItWorks.tsx`; cross-domain link mechanics documented below |
| PROOF-01 | Every homepage testimonial displays name/character, role, guild, expansion/tier, interview date, and a verification link or "Verified LootList+ customer" note | Current `QuoteCard` shape read in full (`LandingValueProps.tsx`) — only name+guild exist today, needs extension; DB columns for the D-04 activity/D-03 WCL-link lookup verified (`guild_settings.wcl_guild_url`, `raid_events.raid_date`, `loot_history.awarded_date`); Management API mechanics verified against `scripts/deploy-migrations.sh` |
| PROOF-02 | Unsupported claims (e.g. "3+ hours saved a week") removed or replaced with checkable product facts | `StatCard` row read in full; found a 4th, undecided StatCard ("100% transparent") and a superlative ("the best parts of every loot system") not covered by D-06 — flagged as audit-scope questions, not assumed answers |
</phase_requirements>

## Summary

This phase is almost entirely a content-and-metadata phase inside an already-built Next.js 16 App Router codebase — no new libraries, no new runtime surfaces, and only one piece of new "infrastructure": a one-time, read-only aggregate SQL lookup against the production Supabase database to answer two questions per quoted guild (is it still active, and does it have a public Warcraft Logs URL on file). That lookup already has a proven, documented path in this repo (`scripts/deploy-migrations.sh`'s Management API pattern) and the two columns it needs already exist (`guild_settings.wcl_guild_url`, plus `raid_events.raid_date` / `loot_history.awarded_date` for activity). It is a one-time authoring step whose output gets hand-typed into React props — not a live API integration, not a new route, not a client fetch.

The single biggest structural fact for planning: **the marketing homepage and the signup/login page are two different files on two different domains that happen to share a codebase.** `app/page.tsx` (root route, `lootlistplus.com`, `noindex`) renders `LoginPage.tsx` — this is COPY-01's target. The actual marketing homepage with the hero, testimonials, and stats lives at `app/(landing)/landing/page.tsx` (canonical `www.getlootlist.com`) and is composed of `LandingHero.tsx`, `LandingValueProps.tsx` (testimonials/stats), `LandingCompare.tsx`, `LandingHowItWorks.tsx`. A route-group folder name does not by itself make `/landing` serve at `/` on a different host — no `middleware.ts` exists in this repo to do that rewrite, so the getlootlist.com-root ↔ `/landing` mapping is almost certainly configured at the hosting/DNS layer outside this repo (see Open Questions). This doesn't block the plan (the file to edit is unambiguous either way), but it means D-08's cross-domain anchor link must be written as an absolute URL (`https://www.getlootlist.com/#how-it-works`), not a relative `/#how-it-works`, because the signup page's own domain does not serve that section.

The D-12 repositioning sweep touches more surfaces than the phase description's four named pages: `app/layout.tsx`'s root metadata (title template default, description, keywords array, and the site-wide JSON-LD `@graph` with three nodes) cascades into every page that doesn't override it, plus `/terms`, `/privacy`, `public/site.webmanifest`, and `README.md` all carry "WoW Classic" / "World of Warcraft Classic" wording today. The blog post titles (`app/blog/how-to-run-loot-without-a-spreadsheet`, plus meta descriptions on two others) also say "WoW Classic" — changing indexed blog **titles** (not just meta descriptions) carries more SEO-volatility risk than changing metadata alone, since titles are what's actually ranking; flagged as a discretion call for the planner, not a locked decision.

**Primary recommendation:** Treat this phase as three independent copy-editing passes over an already-stable file set (signup copy, testimonial proof format + one aggregate DB read, and a full-repo find/audit for unverifiable-claim and "WoW Classic" strings) that converge on a single sign-off checkpoint (D-16) before any commit ships. No new dependencies, no new architecture, no new tests beyond simple render/content assertions and a manual em-dash grep (there is no automated em-dash lint despite the "repo-enforced" framing — see Common Pitfalls).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Signup page copy (COPY-01) | Frontend Server (SSR) | Browser/Client | `app/page.tsx` sets `Metadata` (SSR); `LoginPage.tsx` is `'use client'` and renders the H1/body/CTA text as JSX literals — both files change together |
| Testimonial proof format (PROOF-01) | Browser/Client | — | `QuoteCard` in `LandingValueProps.tsx` is a client component; all new fields (role, expansion/tier, date, verification line) are static JSX props, no client-side fetch needed |
| Guild-activity + WCL-link lookup (D-04, D-03) | Database / Storage (one-time, authoring-time) | — | A single read-only Management API call against prod Postgres, run once by the executor during implementation; output is hand-copied into `QuoteCard` props, not wired as a runtime data source |
| Stats block replacement (PROOF-02) | Browser/Client | — | `StatCard` in the same file, same pattern as testimonials — static text swap, no live data needed for the D-06 replacement stat itself (contrast with the *existing* live guild/raider/loot counter in `LandingHero.tsx`, which is a different, already-shipped pattern) |
| Title/meta rewrites (D-09/D-10/D-11) | Frontend Server (SSR) | — | Next.js App Router `Metadata` exports (`app/(landing)/landing/page.tsx`, `app/changelog/layout.tsx`, `app/compare/page.tsx`) — all server-rendered, no client involvement |
| Repositioning sweep (D-12) | Frontend Server (SSR) | Browser/Client | Root `Metadata`/JSON-LD in `app/layout.tsx` (SSR) cascades to child pages; individual page copy (hero body text, About/Terms/Privacy prose) is a mix of SSR page content and client component text |
| External handoff checklist (D-14) | — (no code tier) | — | Pure documentation deliverable; no surface in this codebase is touched |

## Standard Stack

No new libraries are introduced by this phase. All work uses frameworks already in the codebase:

| Library | Version (verified) | Purpose in this phase |
|---------|---------|--------------|
| Next.js | 16.2.12 [VERIFIED: package.json via CLAUDE.md tech-stack doc, cross-checked against `Metadata` type imports read this session in `app/page.tsx`, `app/(landing)/landing/page.tsx`] | App Router `Metadata` exports for every title/meta change (D-09/D-10/D-11/D-12) |
| React | 19.2.3 [VERIFIED: CLAUDE.md tech-stack doc] | `QuoteCard`/`StatCard` prop extensions, `LoginPage.tsx` copy edits |
| Vitest | 4.1.0 [VERIFIED: CLAUDE.md tech-stack doc, `package.json` `"test": "vitest run"` read this session] | Any new render/content assertions for the changed components |

**No installation step applies to this phase.** Skip the Package Legitimacy Audit gate — see below.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new external packages; all files are edits to existing React/Next.js code already present in the repo. No `npm install` step belongs in any plan for this phase. If a plan surfaces a need for a new package (e.g., a slug library, a schema-diff tool), that is scope creep relative to CONTEXT.md and should be flagged back to the user rather than silently added.

## Architecture Patterns

### Data flow for the one-time guild-activity / WCL-link lookup (D-03, D-04)

```
Executor (design time, not runtime)
  1. Read guild names off the 5 QuoteCard `author.guild` props already in
     LandingValueProps.tsx (no new data needed to identify which guilds)
  2. Retrieve Supabase personal access token from macOS keychain:
       security find-generic-password -s "Supabase CLI" -w
  3. POST one read-only SQL query to the Management API:
       https://api.supabase.com/v1/projects/zjnhjstbqekudlsozsvi/database/query
     joining guilds.name -> guild_settings.wcl_guild_url,
     and guilds.id -> max(raid_events.raid_date), max(loot_history.awarded_date)
     for a 30-day (or sprint-defined) activity window
  4. Read the JSON response by hand (5 rows, guild-level aggregates only)
  5. Hand-type the verification line into the QuoteCard props per D-04's branch:
       active guild      -> "Verified LootList+ customer"
       inactive guild     -> "Verified customer, interviewed {Month Year}"
       has wcl_guild_url  -> link it (D-03); else -> text-only note
  6. Nothing from step 3-4 is committed as raw query output; only the
     resulting static copy (guild name + date + link, already public-facing)
     lands in the diff.
```
This is a **design-time / authoring-time** data flow, not a new runtime dependency. No API route, no client fetch, no new environment variable in `.env.local` is required — the token comes from the keychain the same way `scripts/deploy-migrations.sh` already does it in CI (`SUPABASE_ACCESS_TOKEN` / `SUPABASE_PROJECT_ID` env vars feed the same endpoint there) [VERIFIED: scripts/deploy-migrations.sh:11-20 — `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` are the required env vars, `API="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query"`].

### Recommended file touch list (grouped by requirement)

```
COPY-01 (signup):
  app/page.tsx                          # Metadata: title, robots (keep noindex — this is an app surface)
  app/components/LoginPage.tsx          # H1, body copy, CTA text, secondary link href+text

PROOF-01 (testimonials):
  app/components/landing/LandingValueProps.tsx   # QuoteCard signature + all 5 quote call sites

PROOF-02 (stats):
  app/components/landing/LandingValueProps.tsx   # StatCard "3+ hours" -> "5 supported Classic expansions"
                                                   # (same file as testimonials, same pass)

D-09/D-10 (homepage + changelog titles):
  app/(landing)/landing/page.tsx        # title/description/OG/Twitter metadata
  app/changelog/layout.tsx              # title/description/OG metadata

D-11 (compare titles):
  app/compare/page.tsx                  # title/description/keywords/OG metadata (jsonLd Article
                                          # description field mirrors the meta description --keep in sync)

D-12 (repositioning sweep -- confirmed in-repo hits this session):
  app/layout.tsx                        # title.default, description, keywords[], JSON-LD @graph
                                          # (WebSite + Organization + SoftwareApplication descriptions)
  app/(landing)/landing/page.tsx        # title/description/OG/Twitter (shared edit with D-10)
  app/about/page.tsx                    # title/description metadata (H1/body prose does NOT say
                                          # "WoW Classic" -- only the metadata block does)
  app/compare/page.tsx                  # title/description/keywords (shared edit with D-11)
  app/terms/page.tsx                    # metadata description + body prose
  app/privacy/page.tsx                  # body prose ("World of Warcraft Classic")
  app/components/landing/LandingHero.tsx # hero body copy ("WoW Classic guilds")
  public/site.webmanifest               # "description" field
  README.md                             # opening description line (git-tracked, in scope --
                                          # distinct from the GitHub repo *description* field,
                                          # which is D-14/external and out of scope)
  app/blog/page.tsx                     # blog index card title
  app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx   # title/meta/H1/JSON-LD headline
  app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx  # meta description (x2)
  app/components/landing/BlogRelatedPosts.tsx   # related-post title string (mirrors blog title)
```

### Pattern: Next.js Metadata API for title/meta changes

```typescript
// Source: app/(landing)/landing/page.tsx (read this session, current shipped state)
export const metadata: Metadata = {
  title: 'LootList+ | Transparent Loot Management for WoW Classic',
  description: 'Rank loot lists, track attendance, and calculate transparent item priority for your WoW Classic guild. Create your guild free with Discord.',
  alternates: { canonical: 'https://www.getlootlist.com' },
  openGraph: { title: '...', description: '...', url: '...', siteName: 'LootList+', locale: 'en_US', type: 'website', images: [...] },
  twitter: { card: 'summary_large_image', title: '...', description: '...', images: [...] },
}
```
Every page that changes title/meta for this phase follows this exact shape — `title`, `description`, and (where present) mirrored `openGraph`/`twitter` blocks must all be updated together or they drift out of sync (this already happened once: `openGraph.description` on the homepage currently says "The ultimate loot management system..." — a different, more superlative sentence than the plain `description` field one line above it).

### Pattern: extending QuoteCard without a rebuild

```typescript
// Current shape, read this session (app/components/landing/LandingValueProps.tsx:58-75)
function QuoteCard({ quote, author, className }: { quote: string; author?: { name: string; guild: string }; className?: string }) {
  // renders quote text, then author.name and author.guild only
}
```
PROOF-01 requires role, guild, expansion/tier, interview date, and a verification line per quote. The natural extension is widening the `author` object (`role`, `expansionTier`, `interviewedMonthYear`, `verification: { type: 'wcl_link', url: string } | { type: 'verified_customer' } | { type: 'verified_customer_dated', monthYear: string }`) and adding a small render block below the existing name/guild lines — this is additive to the existing component, not a rebuild, consistent with the CONTEXT.md code-context note.

### Anti-Patterns to Avoid

- **Do not wire the D-04 guild-activity check as a live component/API route.** It is a one-time authoring lookup (see data flow above). Building a `/api/testimonial-status` endpoint or a client-side fetch for this would add a new runtime surface, a new attack surface, and a new "is this guild still active" query running on every homepage pageview for no requirement that asks for it.
- **Do not add Review/AggregateRating JSON-LD to the testimonial section** — explicitly forbidden by D-05 (self-serving review markup violates Google's structured-data guidelines).
- **Do not treat "5 supported Classic expansions" as needing new database schema.** The `expansions` table is per-guild free text (`guild_id`, `name`) — there is no global "supported expansions" enum to query. The claim is already asserted, word-for-word consistent, on `/about` ("Classic Era, The Burning Crusade, Wrath of the Lich King, Cataclysm, and Mists of Pandaria") and `/pricing` ("Classic Era through Mists of Pandaria") — the D-06 fact-check is confirming consistency with already-shipped copy, not deriving a new fact from the database.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading production data for the D-04 activity check | A new authenticated API route, a service-role Supabase client in a script, or a `.env.local` credential | The existing Management API + macOS-keychain token pattern (`scripts/deploy-migrations.sh`'s approach) | No Supabase keys exist in `.env.local` on this machine; the Management API + CLI token is the only working path documented and verified this session, and it's already proven in this repo |
| Em-dash compliance (D-16) | A new ESLint rule or CI check | A manual `grep -rn "—"` (or `—`) pass over changed files before the sign-off checkpoint | No automated enforcement exists despite "repo-enforced" framing — PR #253 was a one-time manual sweep, not a lint rule (verified: no em-dash pattern in `eslint.config.mjs`) |
| Title/meta consistency across `title` + `openGraph` + `twitter` blocks | Three independent edits per page, one per block | Update all three together per page as a single copy unit (see Pattern above) | The existing homepage already has this drift (plain description vs. more superlative OG description) — an easy failure mode without a habit of checking both |

**Key insight:** everything this phase needs already exists as a pattern somewhere in the repo (Metadata blocks, keychain-backed Management API access, QuoteCard/StatCard components). The work is disciplined copy-editing across a known file list plus one careful read-only data pull, not new engineering.

## Common Pitfalls

### Pitfall 1: Editing the wrong "homepage"
**What goes wrong:** An executor searching for "the homepage" finds `app/page.tsx` first (it's the literal root route) and edits copy there, missing that it's actually the signup/login page for a different domain.
**Why it happens:** Two files legitimately answer to "the homepage" depending on which domain you mean; only one (`app/(landing)/landing/page.tsx`) has the hero/testimonials/stats content this phase's PROOF-01/PROOF-02 requirements target.
**How to avoid:** Confirm file identity by grepping for the exact string being changed (e.g., "3+ hours saved" only exists in `LandingValueProps.tsx`) before editing, not by filename intuition.
**Warning signs:** A diff touching `app/page.tsx` for testimonial or stats changes.

### Pitfall 2: Relative anchor link breaks across domains (D-08)
**What goes wrong:** Writing the signup page's secondary link as `href="/#how-it-works"` would 404 or land on the wrong page, because the signup page's own domain (`lootlistplus.com`) does not serve the `#how-it-works` section — that section only exists on `www.getlootlist.com`.
**Why it happens:** The two domains share a codebase, so a relative link looks correct in the same file tree but resolves against the wrong deployed origin at runtime.
**How to avoid:** Use the full absolute URL: `https://www.getlootlist.com/#how-it-works` (the section's `id="how-it-works"` is confirmed in `LandingHowItWorks.tsx:40`).
**Warning signs:** A relative href change in `LoginPage.tsx`'s secondary link.

### Pitfall 3: Half-applied repositioning inconsistency (D-12)
**What goes wrong:** Updating page-level metadata to "World of Warcraft" while `app/layout.tsx`'s root metadata (which several pages inherit via the `%s | LootList+` title template and the default description) still says "WoW Classic," producing a site where some pages broaden and others don't — the exact failure mode D-12 calls out as "worse than either consistent state."
**Why it happens:** `app/layout.tsx` metadata is easy to forget because it's not a "marketing page" in the everyday sense, but it cascades: its `description` and JSON-LD `@graph` (WebSite + Organization + SoftwareApplication nodes) are the fallback/canonical description used anywhere a page doesn't override it, and Google/AI crawlers read JSON-LD independent of visible page text.
**How to avoid:** Treat `app/layout.tsx` as the first file in the D-12 sweep, not an afterthought — it has 6 separate "WoW Classic" occurrences across metadata, keywords array, and two JSON-LD description fields (lines 33, 39, 40, 54, 100, 130).
**Warning signs:** Any repositioning PR that doesn't touch `app/layout.tsx`.

### Pitfall 4: Pre-existing `/compare` CTA link bug
**What goes wrong:** `app/compare/page.tsx` defines `const APP_URL = 'https://www.getlootlist.com'` (line 32) — this is the **marketing homepage domain**, not the signup domain. Every other file that defines this constant (`LandingNav.tsx`, `LandingHero.tsx`, `app/about/page.tsx`, `app/pricing/page.tsx`) correctly points to `https://www.lootlistplus.com`. The "Create your guild free" / "Start for free" CTAs on `/compare` currently send a clicking officer back to the marketing homepage instead of the signup flow.
**Why it happens:** Pre-existing bug, unrelated to this phase's decisions, discovered while reading the file for D-11's title/meta work.
**How to avoid:** Not a locked decision for this phase (D-11 only covers title/meta), but flag it to the user at the sign-off checkpoint since the executor will already be in this file — cheap to fix, meaningfully affects conversion (the actual metric this milestone is measuring).
**Warning signs:** N/A — this is a report-up-and-ask item, not a silent fix (out-of-scope changes need the same sign-off discipline as in-scope copy per D-16's spirit).

### Pitfall 5: Assuming "5 supported Classic expansions" needs new verification
**What goes wrong:** Spending execution time trying to derive expansion support from the database (the `expansions` table is per-guild, not a global catalog — see Anti-Patterns) when the claim is already shipped, word-for-word consistent, on two other pages.
**How to avoid:** Fact-check by grep/cross-reference against `/about` and `/pricing`'s existing expansion lists, not by querying the database for a "supported expansions" concept that doesn't exist as a schema object.

## Code Examples

### Current QuoteCard/StatCard shape (baseline to extend, not rebuild)
```typescript
// Source: app/components/landing/LandingValueProps.tsx:46-75 (read this session)
function StatCard({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <TiltCard className={...} style={{ backgroundImage: statGradient }}>
      <p className="...">{value}</p>
      <p className="...">{label}</p>
    </TiltCard>
  )
}

function QuoteCard({ quote, author, className }: { quote: string; author?: { name: string; guild: string }; className?: string }) {
  return (
    <TiltCard className={...} style={{ backgroundImage: quoteGradient }}>
      <p>&ldquo;{quote}&rdquo;</p>
      {author && (
        <div className="mt-5">
          <p>{author.name}</p>
          <p>{author.guild}</p>
        </div>
      )}
    </TiltCard>
  )
}
```

### Current signup page copy (COPY-01 starting state)
```tsx
// Source: app/components/LoginPage.tsx:144-178 (read this session)
<h1 className="...">Epic loot deserves an epic system.</h1>
<p className="...">
  LootList+ is a transparent loot management system for WoW guilds. Includes loot submissions, attendance tracking and more.
</p>
{/* Primary CTA */}
<Button onClick={handleDiscordLogin} ...>Sign up with Discord</Button>
{/* Secondary link -- currently a hardcoded absolute URL to the homepage root, not an anchor */}
<a href="https://www.getlootlist.com" ...>See how it works</a>
```
Current `app/page.tsx` metadata for this page: `title: 'LootList+ ∙ Sign up'`, `robots: { index: false, follow: true }` — noindex is intentional (this is an authenticated-app surface) and should stay noindex; D-09/D-10/D-11 do not apply to this file.

### Management API call shape for the D-04/D-03 lookup
```bash
# Source: scripts/deploy-migrations.sh:17-39 (read this session) -- same endpoint/auth pattern
T=$(security find-generic-password -s "Supabase CLI" -w)
BODY=$(python3 -c 'import json,sys;print(json.dumps({"query":sys.stdin.read()}))' <<<"$SQL")
curl -sS -X POST "https://api.supabase.com/v1/projects/zjnhjstbqekudlsozsvi/database/query" \
  -H "Authorization: Bearer $T" -H "Content-Type: application/json" -d "$BODY"
```
Verified columns for the `$SQL` query [VERIFIED: lib/database.types.ts]:
- `guilds` table: `id`, `name`, `is_active` (lines 1106-1120)
- `guild_settings` table: `wcl_guild_url` (line 952, table starts line 885)
- `raid_events` table: `guild_id`, `raid_date` (lines 1622-1635)
- `loot_history` table: `guild_id`, `awarded_date` (lines 1207-1223)

## State of the Art

Not applicable in the traditional sense (no library-version drift risk here — this is a copy phase in an existing codebase). The one relevant "state of the art" note: this repo already has a live, API-backed social-proof pattern (`app/components/landing/LandingHero.tsx`'s guild/raider/loot-item counter, fetched from `/api/guild-count`) that is a stronger proof pattern than static stat cards. It is **not** part of this phase's decisions (D-06 only replaces one specific static StatCard) but is useful context: the codebase already knows how to do "checkable, live" numbers when a future phase wants to extend that pattern.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The getlootlist.com-root ↔ `app/(landing)/landing/page.tsx` (`/landing` path) domain mapping happens outside this repo (Vercel project config or DNS-level routing), since no `middleware.ts` or host-based `rewrites()` exists in `next.config.ts` | Summary | Low — doesn't change which file to edit; only matters if the planner tries to "fix" routing as part of this phase, which is out of scope regardless |
| A2 | "Superlative" language not named in D-15/D-06 (the homepage's "100% transparent" StatCard, "the ultimate loot management system" in OG/webmanifest text, LandingCompare's "the best parts of every loot system into one") falls under the "Claude's Discretion: which pages beyond the named ones contain unverifiable claims" bucket rather than being pre-approved for change or pre-approved to leave alone | Common Pitfalls, Architecture Patterns | Low-medium — if the planner assumes these are already decided (either direction), the sign-off checkpoint (D-16) is the safety net either way, but flagging now saves a re-round |
| A3 | The `/compare` `APP_URL` link-destination bug is worth surfacing to the user rather than silently fixing, treated as "found during D-11 work, not itself a locked decision" | Common Pitfalls | Low — worst case the user says "just fix it," which is a trivial one-line change either way |

## Open Questions

1. **Does the getlootlist.com → `/landing` domain routing live in a Vercel dashboard config not visible in this repo?**
   - What we know: `app/(landing)/landing/page.tsx`'s canonical URL is declared as `https://www.getlootlist.com` (the bare root), and no `middleware.ts` or `next.config.ts` rewrite performs that host-based root mapping in-repo.
   - What's unclear: whether this is two separate Vercel projects sharing one repo, a single project with dashboard-level (non-committed) rewrites, or something else.
   - Recommendation: Not a blocker for this phase — the planner only needs the file identity (confirmed), not the routing mechanism. Worth a one-line note to the user if it ever needs debugging, but out of scope here.

2. **Should blog post H1/title changes for D-12 be scoped down to meta-description-only, given SEO-ranking risk on already-indexed titles?**
   - What we know: `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` has "WoW Classic" in its `<title>`, its H1, and its JSON-LD `headline` — all three would need to change together for consistency, and title changes on ranking content carry more volatility risk than meta-description-only edits.
   - What's unclear: whether the user wants full consistency (title+H1+JSON-LD, higher SEO risk) or a narrower "metadata and body prose only, leave ranking titles alone" approach for already-indexed blog URLs.
   - Recommendation: Surface this explicitly at the D-16 sign-off checkpoint as a named choice, don't default silently either way.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| macOS Keychain entry "Supabase CLI" | D-04/D-03 guild-activity + WCL-link lookup | Verified present this session (`security find-generic-password -s "Supabase CLI"` exits 0, secret not printed) | — | None needed — already present |
| Supabase Management API (`api.supabase.com`) | Same lookup | Assumed reachable (same endpoint `scripts/deploy-migrations.sh` and CI already use) | — | If unreachable, the executor cannot complete D-04's activity check for any quote — this would block PROOF-01 entirely, not degrade gracefully |
| Node.js / npm | All copy/component edits | Present (project already builds/tests in this environment per prior phase execution) | Node 20 [CITED: CLAUDE.md tech stack] | — |

**Missing dependencies with no fallback:** none identified — all required access paths (keychain token, Management API, existing DB columns) are already verified present.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 [VERIFIED: package.json `"test": "vitest run"`, `vitest.config.ts` read this session] |
| Config file | `vitest.config.ts` (jsdom environment, globals enabled, `@/` alias, setup file `vitest.setup.ts`) |
| Quick run command | `npm test -- LandingValueProps` (or the eventual new test file name) |
| Full suite command | `npm test` |

No existing test file covers `LandingValueProps.tsx`, `LoginPage.tsx`, or any marketing metadata (`grep` for `*.test.tsx` under `app/components/landing` returned nothing this session) — this is a Wave 0 gap, not a regression risk, since the components are presentational.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COPY-01 | Signup page renders new H1/body/CTA/secondary-link text and correct href | unit (RTL render) | `npx vitest run app/components/__tests__/LoginPage.test.tsx` | ❌ Wave 0 |
| PROOF-01 | Each QuoteCard renders role, guild, expansion/tier, date, and the correct verification variant (link vs. "Verified LootList+ customer" vs. dated) | unit (RTL render, parameterized over the 5 quotes) | `npx vitest run app/components/landing/__tests__/LandingValueProps.test.tsx` | ❌ Wave 0 |
| PROOF-01 (D-05) | No Review/AggregateRating `<script type="application/ld+json">` is emitted anywhere in the testimonial section | unit (RTL query for `application/ld+json` scoped to the section) | same file as above | ❌ Wave 0 |
| PROOF-02 | StatCard row no longer contains "3+ hours saved a week"; contains "5 supported Classic expansions" | unit (RTL render) | same file as above | ❌ Wave 0 |
| D-16 (no em dash) | No changed file in the phase diff contains "—" (U+2014) | manual/scripted grep, not a Vitest test | `git diff --name-only <base>...HEAD | xargs grep -n "—"` (expect no output) | ❌ Wave 0 — no existing script; recommend a one-off shell check per plan, not a permanent test |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run <changed test file>`
- **Per wave merge:** `npm test` (full suite) + `npm run typecheck` + the em-dash grep above
- **Phase gate:** Full suite green, `npm run lint` clean, em-dash grep clean, and D-16's human sign-off obtained — before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `app/components/__tests__/LoginPage.test.tsx` — covers COPY-01
- [ ] `app/components/landing/__tests__/LandingValueProps.test.tsx` — covers PROOF-01, PROOF-02, D-05
- [ ] No shared fixture gap — these components take no external data dependencies beyond static props
- [ ] No framework install needed — Vitest + Testing Library already configured project-wide

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase touches no auth logic (LoginPage's OAuth flow itself is unchanged — only its surrounding copy) |
| V3 Session Management | No | Not touched |
| V4 Access Control | No | Not touched |
| V5 Input Validation | Yes (narrow) | The D-04 Management API query embeds guild names as literal SQL text (the endpoint takes a raw `query` string, no parameterization support — confirmed in `scripts/deploy-migrations.sh`'s `run_sql()`). Guild names here are typed by the executor from known, already-public testimonial data (not user-supplied at runtime), so injection risk is low, but the query should still use literal string escaping or a `WHERE name = ANY($1)`-style safe construction rather than raw string concatenation, as a matter of discipline |
| V6 Cryptography | No | Not touched — the Supabase access token is read from the OS keychain and never persisted to a file or committed, consistent with existing repo practice |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental commit of the Management API response (which could include internal guild UUIDs alongside names) into a plan/summary artifact | Information Disclosure | Per CONTEXT.md's own discretion note: "no player/guild-identifying data in artifacts or commits" — only the final human-readable copy (guild name + date + public WCL link, all already public-facing on the homepage) should land in any committed file; raw query JSON stays in the executor's scratch context only |
| SQL string interpolation of the guild-name filter | Tampering (low likelihood, executor-authored input) | Treat guild names as literal constants in the query, sanity-check for quote characters before interpolating (e.g. an apostrophe in a guild name breaking the query), rather than trusting `author.guild` verbatim |

## Sources

### Primary (HIGH confidence — read directly this session)
- `app/page.tsx`, `app/components/LoginPage.tsx` — signup page current state
- `app/(landing)/landing/page.tsx`, `app/components/landing/LandingHero.tsx`, `app/components/landing/LandingValueProps.tsx`, `app/components/landing/LandingHowItWorks.tsx`, `app/components/landing/LandingCompare.tsx` — homepage composition and current copy
- `app/layout.tsx`, `app/about/page.tsx`, `app/pricing/page.tsx`, `app/compare/page.tsx`, `app/changelog/layout.tsx`, `app/changelog/page.tsx`, `app/terms/page.tsx` (grep), `app/privacy/page.tsx` (grep), `public/site.webmanifest`, `README.md` (grep) — metadata and D-12 inventory
- `lib/database.types.ts` (guilds, guild_settings, raid_events, loot_history table definitions) — D-04/D-03 lookup schema
- `scripts/deploy-migrations.sh`, `.github/workflows/deploy-migrations.yml` — Management API auth/endpoint pattern and project ref, cross-verified against the (28-day-old) `prod-sql-via-management-api` memory
- `next.config.ts` — confirmed no host-based rewrite/middleware exists for domain routing
- `vitest.config.ts`, `package.json` — test framework baseline
- Git history: `069c61c` ("Remove em dashes from all user-facing copy... #253") — confirmed manual sweep, no lint rule
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` — exact copy sources for signup, testimonial format, stats replacement, positioning (per canonical_refs)

### Secondary (MEDIUM confidence)
- `~/.claude/.../memory/prod-sql-via-management-api.md` — 28 days old per its own system-reminder; cross-verified against current `scripts/deploy-migrations.sh` and `.github/workflows/deploy-migrations.yml` this session and found consistent (same project ref `zjnhjstbqekudlsozsvi`, same env var names)

### Tertiary (LOW confidence)
- None — no WebSearch was needed for this phase; it is entirely an in-repo audit and copy-editing task with no external library or framework unknowns.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, existing versions cited from project docs
- Architecture: HIGH — every file/pattern claim was read directly this session, not inferred
- Pitfalls: HIGH — all five pitfalls were discovered by reading actual current code (bugs and gaps found in-session, not hypothesized)

**Research date:** 2026-08-28
**Valid until:** Effectively the life of this phase (content/copy audit of a fixed snapshot of the codebase) — re-verify file line numbers if execution is delayed more than a few weeks and other phases touch the same files first.
