# Phase 2: Checkable Conversion Copy - Pattern Map

**Mapped:** 2026-08-28
**Files analyzed:** 16 (from CONTEXT.md canonical refs + RESEARCH.md touch list)
**Analogs found:** 16 / 16 (this phase edits existing files in place — every "analog" is the file's own current state, since there is no net-new file being created)

**Note on this phase's shape:** Unlike a typical feature phase, Phase 2 creates zero new files. Every item below is a modification to an existing file, so the "analog" is the file's own current pattern, and the job is extending that pattern consistently (same component shape, same Metadata block shape) rather than importing a pattern from elsewhere. Where a shared shape exists across multiple files (Metadata blocks), that shape is called out once under Shared Patterns instead of repeated per file.

## File Classification

| File to Modify | Role | Data Flow | Pattern Source | Match Quality |
|---|---|---|---|---|
| `app/page.tsx` | route/config (Metadata) | request-response (SSR) | itself — current `metadata` export | exact (self) |
| `app/components/LoginPage.tsx` | component | request-response (client render) | itself — current JSX copy block | exact (self) |
| `app/components/landing/LandingValueProps.tsx` | component | request-response (client render, static props) | itself — `QuoteCard`/`StatCard` | exact (self) |
| `app/(landing)/landing/page.tsx` | route/config (Metadata) | request-response (SSR) | itself + shared Metadata shape (below) | exact (self) |
| `app/changelog/layout.tsx` | route/config (Metadata) | request-response (SSR) | itself + shared Metadata shape | exact (self) |
| `app/compare/page.tsx` | route/config (Metadata + JSON-LD) | request-response (SSR) | itself + shared Metadata shape | exact (self) |
| `app/layout.tsx` | route/config (root Metadata + JSON-LD) | request-response (SSR, cascades) | itself | exact (self) |
| `app/about/page.tsx` | route/config (Metadata) | request-response (SSR) | shared Metadata shape (this file) | exact (self) |
| `app/terms/page.tsx` | route/config (Metadata) + component | request-response (SSR) | shared Metadata shape | exact (self) |
| `app/privacy/page.tsx` | component (body prose) | request-response (SSR) | shared Metadata shape | exact (self) |
| `app/components/landing/LandingHero.tsx` | component | request-response (client render) | itself | exact (self) |
| `public/site.webmanifest` | config | static | itself | exact (self) |
| `README.md` | doc | static | itself | exact (self) |
| `app/blog/page.tsx` | route (index) | request-response (SSR) | shared Metadata shape | exact (self) |
| `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` | route (article) | request-response (SSR) | shared Metadata shape | exact (self) |
| `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` | route (article) | request-response (SSR) | shared Metadata shape | exact (self) |
| `app/components/landing/BlogRelatedPosts.tsx` | component | request-response (client render) | itself | exact (self) |

**No new test file exists for the two components that need behavioral coverage.** Closest test-pattern analog: none in `app/components/landing/` or `app/components/__tests__/` currently cover presentational marketing components (confirmed no matches this session). Use any existing Vitest + RTL test file elsewhere in the repo as the structural analog for `render()` + `screen.getByText`/`getByRole` assertions — RESEARCH.md already specifies the exact target paths (`app/components/__tests__/LoginPage.test.tsx`, `app/components/landing/__tests__/LandingValueProps.test.tsx`).

## Pattern Assignments

### `app/components/landing/LandingValueProps.tsx` (component, request-response — PROOF-01, PROOF-02)

**Current QuoteCard shape** (lines 58-75):
```typescript
function QuoteCard({ quote, author, className }: { quote: string; author?: { name: string; guild: string }; className?: string }) {
  return (
    <TiltCard
      className={`flex flex-col items-center justify-center overflow-hidden rounded-[20px] md:rounded-[28px] p-6 md:p-12 lg:p-20 ${className || ''}`}
      style={{ backgroundImage: quoteGradient }}
    >
      <p className="font-poppins font-medium text-[16px] text-[#bababa] leading-normal text-center">
        &ldquo;{quote}&rdquo;
      </p>
      {author && (
        <div className="mt-5">
          <p className="font-poppins font-semibold text-[13px] text-white leading-tight text-center">{author.name}</p>
          <p className="font-poppins text-[12px] text-[#bababa] leading-tight text-center">{author.guild}</p>
        </div>
      )}
    </TiltCard>
  )
}
```
**Extension pattern for PROOF-01:** widen the `author` prop type additively (`role`, `expansionTier`, `interviewedMonthYear`, and a `verification` discriminated union: `{ type: 'wcl_link'; url: string } | { type: 'verified_customer' } | { type: 'verified_customer_dated'; monthYear: string }`), and add a small render block below the existing `author.name`/`author.guild` lines using the same `font-poppins text-[12px] text-[#bababa]` styling convention already used for `author.guild`. Do not touch `TiltCard`, `quoteGradient`, or the outer card structure — additive only, per CONTEXT.md's "extends, does not rebuild" note.

**Current StatCard shape** (lines 46-56) — same file, same pattern, used for PROOF-02's "3+ hours" → "5 supported Classic expansions" swap:
```typescript
function StatCard({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <TiltCard className={`... ${className || ''}`} style={{ backgroundImage: statGradient }}>
      <p className="font-poppins font-bold text-[48px] md:text-[72px] text-white leading-normal">{value}</p>
      <p className="font-poppins font-medium text-[16px] text-[#bababa] leading-normal text-center px-4">{label}</p>
    </TiltCard>
  )
}
```
**Call site to change** (Row 2, current):
```tsx
<StatCard value="3+" label="hours saved a week" className="h-[250px] md:h-[300px] flex-shrink-0 md:w-auto md:flex-1" />
```
Replace only `value`/`label` props with the fact-checked replacement; leave the two sibling `StatCard` calls ("0" / "spreadsheets needed" and "1" / "system for loot, attendance, and priorities") untouched per D-06. The "100%" / "transparent" StatCard in Row 1 and the "the best loot management system" superlative inside a QuoteCard's own quoted text are flagged in RESEARCH.md as audit-scope discretion, not pre-decided — do not silently touch them; escalate at the D-16 sign-off checkpoint.

**No Review/AggregateRating JSON-LD exists in this file today** — D-05 requires none be added. There is no JSON-LD block in this component to pattern-match against; the absence itself is the pattern to preserve.

**All 5 current quote call sites** (author name/guild pairs, needed to identify which guilds go through the D-04 lookup): `Scizophrenic / Crucible`, `Para/Kidney / Indecisive`, `2laxs / Bad Guys`, `Xx_ / Soul Stoned`, plus a 5th quote further down the file not shown in this excerpt window — read the full file before editing to confirm all 5 call sites are updated consistently.

---

### `app/components/LoginPage.tsx` (component, request-response — COPY-01)

**Current copy block** (JSX, read this session):
```tsx
<h1 className="text-[32px] lg:text-[42px] font-bold text-foreground text-center leading-[1.02]">
  Epic loot deserves an epic system.
</h1>
<p className="text-muted-foreground text-base text-center">
  LootList+ is a transparent loot management system for WoW guilds. Includes loot submissions, attendance tracking and more.
</p>
...
<Button onClick={handleDiscordLogin} variant="primary" ...>
  Sign up with Discord
</Button>
<a
  href="https://www.getlootlist.com"
  className="w-full bg-[#141519] hover:bg-[#1c1d24] text-foreground font-medium text-base px-5 py-3 rounded-full flex items-center justify-center transition-colors"
>
  See how it works
</a>
```
**Pattern for COPY-01:** the H1/body/CTA/secondary-link text are plain JSX string literals inside a client component — no i18n layer, no CMS, no separate copy file. Edit in place. D-08 requires the secondary link's `href` become the absolute cross-domain anchor `https://www.getlootlist.com/#how-it-works` (not the current bare `https://www.getlootlist.com`), because `LoginPage.tsx` renders on `lootlistplus.com` and the `#how-it-works` section only exists on `www.getlootlist.com` (confirmed target: `id="how-it-works"` in `app/components/landing/LandingHowItWorks.tsx`). Keep the existing `className` styling on both the button and the anchor — only the text content and the anchor's `href` change under this pattern.

**Metadata analog** (`app/page.tsx`, the file that wraps `LoginPage`):
```typescript
export const metadata: Metadata = {
  title: 'LootList+ ∙ Sign up',
  description: 'Sign in to LootList+ with Discord to manage your guild\'s loot.',
  alternates: { canonical: 'https://lootlistplus.com' },
  robots: { index: false, follow: true },
}
```
D-09/D-10/D-11 do not apply here — `robots.index: false` is intentional and must stay noindex per RESEARCH.md; this file is out of scope for the SEO/metadata decisions, only COPY-01's title copy (if the drafted signup title differs from "Sign up") is in scope.

---

### Metadata files (D-09, D-10, D-11, D-12) — shared shape, multiple files

**Canonical Metadata shape** (`app/(landing)/landing/page.tsx`, current shipped state — this is the pattern every title/meta edit in this phase must follow):
```typescript
export const metadata: Metadata = {
  title: 'LootList+ | Transparent Loot Management for WoW Classic',
  description: 'Rank loot lists, track attendance, and calculate transparent item priority for your WoW Classic guild. Create your guild free with Discord.',
  alternates: { canonical: 'https://www.getlootlist.com' },
  openGraph: {
    title: 'LootList+ - Loot Management for WoW Classic Guilds',
    description: 'The ultimate loot management system for World of Warcraft Classic guilds. Track attendance, manage priority lists, and streamline loot distribution.',
    url: 'https://www.getlootlist.com',
    siteName: 'LootList+',
    locale: 'en_US',
    type: 'website',
    images: [{ url: 'https://www.getlootlist.com/og-image.jpg', width: 2400, height: 1264, alt: '...' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LootList+ - Loot Management for WoW Classic Guilds',
    description: 'The ultimate loot management system for World of Warcraft Classic guilds.',
    images: ['https://www.getlootlist.com/og-image.jpg'],
  },
}
```
**Pre-existing drift already present in this exact file (fix while editing, don't reintroduce):** plain `description` says "Rank loot lists, track attendance..." while `openGraph.description` says "The ultimate loot management system..." — a different sentence. When applying D-10 (category-forward homepage title) and D-12 (WoW Classic → World of Warcraft) here, update `title`, `description`, `openGraph.title`, `openGraph.description`, `twitter.title`, and `twitter.description` together as one copy unit, per RESEARCH.md's explicit anti-pattern warning.

**`app/compare/page.tsx`** follows the same shape plus a `keywords` array and a `jsonLd` object (`Article` schema) whose `headline`/`description` fields mirror the meta description and must be kept in sync:
```typescript
export const metadata: Metadata = {
  title: 'LootList+ vs TMB, DKP, EPGP, and Loot Council',
  description: 'An honest comparison of WoW Classic loot systems. See how LootList+ stacks up against That\'s My BiS, DKP, EPGP, and traditional loot council.',
  keywords: [ 'lootlist vs tmb', 'thatsmybis alternative', 'wow loot system comparison', ... ],
  alternates: { canonical: 'https://www.getlootlist.com/compare' },
  openGraph: { title: '...', description: '...', type: 'article', url: '...' },
}
const jsonLd = {
  '@context': 'https://schema.org', '@type': 'Article',
  headline: 'LootList+ vs TMB, DKP, EPGP, and Loot Council',
  description: 'An honest comparison of WoW Classic loot systems. See how LootList+ stacks up against the alternatives.',
  ...
}
```
D-11's competitor-query rewrite and D-12's wording broaden both `metadata` and `jsonLd.description`/`headline` together — this file has three separate copies of the description-style text (`metadata.description`, `metadata.openGraph.description`, `jsonLd.description`) that must move in lockstep.

**Also flag while in this file (not itself a locked decision, per RESEARCH.md Pitfall 4):** `const APP_URL = 'https://www.getlootlist.com'` (line 32) sends CTA clicks to the marketing domain instead of the signup domain (`https://www.lootlistplus.com`, used correctly by `LandingNav.tsx`, `LandingHero.tsx`, `app/about/page.tsx`, `app/pricing/page.tsx`). Surface this to the user at sign-off; do not silently fix without confirmation per D-16's discipline.

**`app/changelog/layout.tsx`** — narrower shape (no `keywords`, no `jsonLd`), same `title`/`description`/`alternates`/`openGraph` fields:
```typescript
export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Every LootList+ update: new features, improvements, and fixes for WoW guild loot management, attendance tracking, and Discord integration.',
  alternates: { canonical: '/changelog' },
  openGraph: { title: 'LootList+ Changelog', description: '...', url: 'https://www.getlootlist.com/changelog', type: 'website' },
}
```
D-09 requires this title/description become unambiguously changelog-intent (already reasonably distinct) while D-10 makes the homepage title claim the generic "loot list" query — these are two ends of the same cannibalization fix and should be authored together, not independently.

---

### `app/layout.tsx` (root Metadata + JSON-LD — D-12, highest-risk file per RESEARCH.md Pitfall 3)

**Current root metadata** (read this session):
```typescript
export const metadata: Metadata = {
  title: { default: "LootList+ - Loot Management for WoW Classic Guilds", template: "%s | LootList+" },
  description: "LootList+ is a transparent loot-management system for World of Warcraft Classic guilds. Raiders submit ranked loot lists, officers track attendance, and Loot Scores show who has priority for each item and why. Core features are free; Premium adds multi-team support, an officer activity feed, and reserve runs for $4.99 per month or $39 per year per guild.",
  keywords: ["WoW Classic", "loot management", "guild management", "raid loot", "loot tracking", "World of Warcraft", "loot council", "DKP alternative", "TBC Classic", "WotLK Classic"],
  ...
  metadataBase: new URL("https://www.getlootlist.com"),
  openGraph: { siteName: "LootList+", locale: "en_US", type: "website", images: [{ url: "/og-image.jpg", ... }] },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
  ...
}
```
Note the existing inline comment already flags this description as canonical: "The one definitive product description — keep identical across the homepage, About page, GitHub README, JSON-LD, and directory listings." **This means D-12's repositioning wording change to this string must be propagated to every surface that comment names** — treat that comment as the authoritative cross-reference checklist for the D-12 sweep, not just this file's own edit. `keywords[]` mixes "WoW Classic" and "World of Warcraft" already; per the user's added specific idea, both "WoW" and "World of Warcraft" should remain present in the repositioned array, not a wholesale find-replace.

**JSON-LD `@graph`** (referenced further in file, not fully shown in this excerpt window — RESEARCH.md cites 6 total "WoW Classic" occurrences across this file at lines 33, 39, 40, 54, 100, 130): read the full file before editing to catch all six; this file is the first stop in the D-12 sweep per RESEARCH.md Pitfall 3, not an afterthought.

## Shared Patterns

### Metadata block consistency (applies to all D-09/D-10/D-11/D-12 files)
**Source:** `app/(landing)/landing/page.tsx`, `app/compare/page.tsx`, `app/changelog/layout.tsx`, `app/layout.tsx`
**Rule:** `title`, `description`, `openGraph.title`, `openGraph.description`, `twitter.title`, `twitter.description` (and `jsonLd.headline`/`jsonLd.description` where present) are logically one copy unit per page. Every plan touching any one of these fields must update all present siblings in the same edit, or reintroduce the exact drift already found in the homepage file.

### Additive component extension, not rebuild (applies to PROOF-01/PROOF-02)
**Source:** `app/components/landing/LandingValueProps.tsx` — `QuoteCard`/`StatCard`
**Rule:** widen prop types and add render blocks below existing fields using the same Tailwind class conventions already in the file (`font-poppins`, `text-[#bababa]`, `text-[12px]`/`text-[13px]` scale for secondary metadata lines). Do not change `TiltCard`, gradients, or outer layout classes.

### No em dash in authored copy (applies to every file in this phase)
**Source:** git history `069c61c` ("Remove em dashes from all user-facing copy... #253") — manual sweep, no lint rule exists.
**Rule:** run `git diff --name-only <base>...HEAD | xargs grep -n "—"` before the D-16 sign-off checkpoint; there is no automated enforcement to rely on.

### Cross-domain absolute links (applies to any link between `lootlistplus.com` and `getlootlist.com` surfaces)
**Source:** `app/components/LoginPage.tsx`'s existing secondary link (currently `https://www.getlootlist.com`, needs to become `https://www.getlootlist.com/#how-it-works` per D-08) and the pre-existing `/compare` `APP_URL` bug.
**Rule:** never use a relative href for a link that must resolve on the other domain; always write the full `https://www.getlootlist.com/...` or `https://www.lootlistplus.com/...` form, and double-check which of the two domains a given file's CTAs should point to (signup domain for "sign up" CTAs, marketing domain for "learn more" anchors).

## No Analog Found

None. Every file in this phase's scope is a modification to an existing, already-read file — there is no net-new file that lacks a same-repo precedent. The two Vitest test files RESEARCH.md flags as Wave 0 gaps (`app/components/__tests__/LoginPage.test.tsx`, `app/components/landing/__tests__/LandingValueProps.test.tsx`) have no direct analog in `app/components/landing/` (no existing tests there), but the planner should use any standard Vitest + RTL component test in the repo as the structural template (render + `screen.getByText`/`getByRole` assertions, `vitest.config.ts`'s jsdom environment already configured project-wide).

## Metadata

**Analog search scope:** `app/`, `app/components/landing/`, `app/components/`, `public/`, `README.md` — all files named in CONTEXT.md canonical_refs and RESEARCH.md's recommended file touch list.
**Files scanned this session:** `app/components/landing/LandingValueProps.tsx` (full), `app/page.tsx` (partial), `app/components/LoginPage.tsx` (partial), `app/(landing)/landing/page.tsx` (partial), `app/compare/page.tsx` (partial), `app/changelog/layout.tsx` (full), `app/layout.tsx` (partial) — remaining files in the D-12 touch list (`app/about/page.tsx`, `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/components/landing/LandingHero.tsx`, `public/site.webmanifest`, `README.md`, blog pages, `BlogRelatedPosts.tsx`) were verified present and characterized in RESEARCH.md this session but not re-read here to avoid duplicate reads; planner/executor should read each in full before editing since only line-range citations (not full excerpts) exist for them.
**Pattern extraction date:** 2026-08-28
