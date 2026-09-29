# Phase 4: Verified Guild Case Study - Pattern Map

**Mapped:** 2026-09-05
**Files analyzed:** 7 (new/modified)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `app/customers/[slug]/page.tsx` | route (Server Component) | request-response (build-time static render) | `app/research/wow-classic-loot-systems-2026/page.tsx` | exact (role: dynamic vs static folder differs, but every other pattern — copy-fidelity, metadata, JSON-LD, layout shape — is identical) |
| `data/case-studies/index.ts` + `data/case-studies/<slug>.ts` | model / config (committed static data module) | CRUD (read-only, build-time) | `public/research/wow-classic-loot-systems-2026-aggregates.json` + its typed import in `page.tsx` (lines 9, 21-50) | role-match (JSON artifact vs TS module, same "committed data, no DB" pattern) |
| `app/customers/[slug]/__tests__/page.test.tsx` | test | request-response (render assertions) | `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` | exact |
| `app/__tests__/sitemap.test.ts` (extend) | test | CRUD (list assertions) | itself (existing file, extend don't replace) | exact |
| `app/sitemap.ts` (extend) | config | CRUD (static array) | itself (existing file, append one entry) | exact |
| `app/components/landing/LandingValueProps.tsx` (export boundary change) | component | transform (pure render) | itself — extract/export `QuoteCard`/`VerificationLine`/`TestimonialVerification` | exact (self-analog; only change is export visibility) |
| Interview kit artifact (`04-INTERVIEW-KIT.md` or similar, planning doc not shipped code) | config/doc | file-I/O (static markdown) | `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md` sign-off convention | role-match |

## Pattern Assignments

### `app/customers/[slug]/page.tsx` (route, request-response)

**Analog:** `app/research/wow-classic-loot-systems-2026/page.tsx` (full file, 549 lines, read this session)

**Imports pattern** (lines 1-9):
```typescript
import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogTracker from '@/app/components/landing/BlogTracker'
import { Button } from '@/components/ui/button'
import aggregates from '@/public/research/wow-classic-loot-systems-2026-aggregates.json'
```
For the case study, swap the JSON import for the typed data-module import (e.g. `import { getCaseStudy } from '@/data/case-studies'`) and additionally import `QuoteCard`/`VerificationLine` (once exported per Pattern below) from `LandingValueProps.tsx`.

**Copy-fidelity gate pattern** (lines 63-199, 193-199 core):
```typescript
const APPROVED_STRINGS: Record<string, string> = { /* one entry per visible string, {token} placeholders */ }
function resolveTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in tokens)) {
      throw new Error(`Unresolved token {${key}} in approved string: "${template}"`)
    }
    return tokens[key]
  })
}
function approved(key: string): string {
  const template = APPROVED_STRINGS[key]
  if (template === undefined) {
    throw new Error(`Missing approved string for key "${key}" (see 04-COPY-DRAFT.md)`)
  }
  return resolveTokens(template, TOKENS)
}
```
For the case study, `TOKENS` must resolve only from the one case-study data-module entry for the current `slug` param — never a hand-typed literal (RESEARCH.md Pattern 2).

**Metadata + canonical pattern** (lines 295-317):
```typescript
export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_META_DESCRIPTION,
  alternates: { canonical: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026' },
  openGraph: { title: PAGE_TITLE, description: PAGE_META_DESCRIPTION, type: 'article', publishedTime: PUBLISHED_ISO, modifiedTime: MODIFIED_ISO, authors: ['LootList+'], url: '...' },
}
```
The case study needs `generateMetadata({ params })` instead of a static `export const metadata` (dynamic route requires the per-slug function form; see Next.js docs cited in RESEARCH.md). Add `robots: { index: false, follow: false }` during the interim/unpublished period per Pattern 3 below — omit entirely once publish clears (D-07/Pitfall 2, do not just set `index: true`).

**JSON-LD pattern — Article + BreadcrumbList only, reuse Zev `@id`** (lines 319-373, and `app/about/page.tsx` lines 24-31):
```typescript
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: PAGE_H1, // must equal rendered H1, not page.title
  description: PAGE_META_DESCRIPTION,
  datePublished: PUBLISHED_ISO,
  dateModified: MODIFIED_ISO,
  author: {
    '@type': 'Person',
    '@id': 'https://www.getlootlist.com/about#creator',
    name: 'Zev',
    description: 'Creator of LootList+ and guild officer and raid lead',
    url: 'https://www.getlootlist.com/about',
  },
  publisher: { '@type': 'Organization', name: 'LootList+', url: 'https://www.getlootlist.com', logo: { '@type': 'ImageObject', url: 'https://www.getlootlist.com/lootlist-icon.svg' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': '...' },
}
const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.getlootlist.com' },
    { '@type': 'ListItem', position: 2, name: PAGE_H1 },
  ],
}
```
**Do not add `Review`/`AggregateRating`** anywhere (D-05, RESEARCH.md Pattern 4) — the single highest-risk mistake for a testimonial-showcase page.

**Page layout / render pattern** (lines 375-549, esp. 386-424 header, 527-541 CTA):
```tsx
<main className="bg-background overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #0f0e12 0%, #080808 40%)' }}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
  <LandingNav />
  <article className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
    <BlogTracker slug={slug} title={PAGE_H1} />
    <div className="max-w-3xl mx-auto">
      <nav>{/* breadcrumb */}</nav>
      <header>{/* eyebrow, H1, standfirst, byline w/ /about link to Zev */}</header>
      <div className="prose ...">{/* body content */}</div>
      <div className="my-12 p-8 rounded-xl border border-border bg-background-elevated flex flex-col items-start gap-4">
        {/* contextual CTA, sibling to prose wrapper — never nested inside it */}
        <Button asChild variant="accent" size="lg" className="font-bold"><a href={CTA_URL}>{CTA_BUTTON_LABEL}</a></Button>
      </div>
    </div>
  </article>
  <LandingCTA />
  <LandingFooter />
</main>
```
Replace the `<div className="prose ...">` body with case-study-specific sections in the exact order UI-SPEC/RESEARCH.md's template specifies: proof strip (4 stat blocks, `StatCard`-style from `LandingValueProps.tsx` lines 46-56) → lead paragraph → before/after narrative → quote block (`QuoteCard`) → credible-limitation section → CTA.

**Error handling pattern:** Same as the report page — `throw new Error(...)` at module-eval time for any missing/unresolved approved string or missing finding (fail the build loudly, never render an empty/undefined string). Apply the identical `requireFinding`-style helper (lines 154-160) as `requireCaseStudy(slug)` that throws if `generateStaticParams()`'s slug list and the data module disagree.

---

### `data/case-studies/index.ts` + `data/case-studies/<slug>.ts` (model, CRUD read-only)

**Analog:** `public/research/wow-classic-loot-systems-2026-aggregates.json` consumed via `page.tsx` lines 9, 21-50, 151-160

**Core pattern** — typed interface + `Record`-keyed lookup with throwing accessor:
```typescript
interface Finding { metric_id: string; label: string; /* ... */ }
const findingsById: Record<string, Finding> = Object.fromEntries(findings.map((f) => [f.metric_id, f]))
function requireFinding(metricId: string): Finding {
  const finding = findingsById[metricId]
  if (!finding) {
    throw new Error(`Expected published finding "${metricId}" not found in the committed aggregates artifact`)
  }
  return finding
}
```
For the case-study module: export a typed `CaseStudy` interface (all interview-sourced fields non-optional per UI-SPEC E7), an array/record of entries (empty in the shipped state per D-01), and `getCaseStudy(slug)` throwing on an unknown slug — mirrors this exact shape. `generateStaticParams()` reads the same list; zero entries → `[]` returned → route unreachable in production (D-01, D-06, Pitfall 1).

**Fixture entry gating (D-08, D-09):** Add a `isFixture: boolean` (or separate `fixtureOnly` export) field so `generateStaticParams()`'s production output filters it out (`entries.filter(e => !e.isFixture)`) while a dev-only path (`NODE_ENV !== 'production'` check, or equivalent per CONTEXT.md's Claude's Discretion) can still resolve it for `npm run dev` review. Never let the fixture slug reach `app/sitemap.ts`.

---

### `app/customers/[slug]/__tests__/page.test.tsx` (test, request-response)

**Analog:** `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` (full file, 402 lines, read this session)

**jsdom mocks pattern** (lines 10-45):
```typescript
beforeAll(() => {
  if (!window.matchMedia) { window.matchMedia = (...) as unknown as typeof window.matchMedia }
  if (!('IntersectionObserver' in window)) { class MockIntersectionObserver { observe(){} unobserve(){} disconnect(){} takeRecords(){return []} }
    ;(window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = MockIntersectionObserver
  }
})
vi.mock('@/utils/analytics/client', () => ({
  trackClientEvent: () => {},
  trackMarketingPageView: () => {},
  trackMarketingCta: () => {},
  getFirstTouchLandingPage: () => null,
}))
```
Copy verbatim — `LandingValueProps`/`LandingNav`/`BlogTracker` all need these same mocks under jsdom.

**Independent-approved-string parity pattern** (lines 91-97+, and full `APPROVED` map through end of file — not re-read here, same shape continues):
```typescript
const APPROVED: Record<string, string> = { /* reproduced here, not imported from page.tsx, so the test proves rendered output independently */ }
```
Reproduce the case study's `APPROVED_STRINGS` map here against a fixture data-module entry (never the production/empty module) so the render assertions are independent of `page.tsx`'s internal implementation.

**Assertions to add (per RESEARCH.md's test map):**
- H1/proof-strip/before-after/limitation sections render from a fixture entry
- metadata self-canonical, matches visible H1/description
- `container.querySelectorAll('script[type="application/ld+json"]')` — assert no `Review`/`AggregateRating` type present (mirrors `LandingValueProps.test.tsx`'s existing D-05 assertion, not read this session but referenced in RESEARCH.md line 336)
- `generateStaticParams()` returns `[]` when the case-study data module is empty

---

### `app/sitemap.ts` (config, CRUD) + `app/__tests__/sitemap.test.ts` (test)

**Analog:** itself, full files read this session (120 lines / 51 lines)

**Core pattern** — flat array literal, no dedup logic, append one object:
```typescript
{
  url: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  lastModified: new Date(2026, 8, 4),
  changeFrequency: 'monthly',
  priority: 0.9,
},
```
Add a case-study entry only once, only at publish time (D-07), in the SAME commit that removes `robots: { index: false, follow: false }` from the case-study page's metadata (Pitfall 2). Currently zero entries expected while the data module is empty.

**Test pattern** (full file):
```typescript
const REPORT_URL = 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026'
it('lists the report URL exactly once', () => {
  const entries = sitemap()
  expect(entries.filter((entry) => entry.url === REPORT_URL)).toHaveLength(1)
})
it('never duplicates any URL in the whole array', () => { /* Set size check */ })
it('agrees with the report page\'s own canonical URL rather than restating it', () => {
  const entry = sitemap().find((e) => e.url === REPORT_URL)
  expect(entry?.url).toBe(metadata.alternates?.canonical)
})
it('exposes no robots override on the report page metadata', () => {
  expect(metadata.robots).toBeUndefined()
})
```
Extend this exact file (don't replace) with a `CASE_STUDY_URL` constant and the same five assertion shapes, added in the same commit as the real data-module entry (RESEARCH.md Code Examples section, "Sitemap test extension pattern").

---

### `app/components/landing/LandingValueProps.tsx` (component, transform) — export-boundary change

**Analog:** itself, full file read this session (234 lines)

**Current state (module-private):**
```typescript
type TestimonialVerification =
  | { type: 'wcl_link'; url: string; monthYear?: string }
  | { type: 'verified_customer' }
  | { type: 'verified_customer_dated'; monthYear: string }

function VerificationLine({ verification }: { verification: TestimonialVerification }) { /* lines 72-80 */ }
function QuoteCard({ quote, author, className }: { ... }) { /* lines 82-123 */ }
```
**Change needed:** export `TestimonialVerification`, `QuoteAuthor`, `VerificationLine`, and `QuoteCard` (either add `export` in place, or extract to a shared module per CONTEXT.md's Claude's Discretion — either way, never re-type this union; RESEARCH.md Pattern 1 / Assumption A3). The case-study page imports these directly rather than reimplementing the quote/verification rendering.

**Outbound link `rel` attribute** (lines 96-103) — reuse verbatim, do not hand-roll a new anchor:
```tsx
<a href={author.verification.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
  {author.guild}
</a>
```

---

## Shared Patterns

### Copy-fidelity gate (APPROVED_STRINGS + {token} resolver)
**Source:** `app/research/wow-classic-loot-systems-2026/page.tsx` lines 63-199 (full pattern)
**Apply to:** `app/customers/[slug]/page.tsx` — every visible string, tokens resolved only from the current case-study data-module entry.

### JSON-LD shape — Article + BreadcrumbList, no Review/AggregateRating, reuse Zev `@id`
**Source:** `app/research/wow-classic-loot-systems-2026/page.tsx` lines 319-373; `app/about/page.tsx` lines 17-32
**Apply to:** `app/customers/[slug]/page.tsx` — this is the single highest-risk pitfall for this phase (D-05 precedent + Google's self-serving-review suppression).

### Interim noindex → same-commit publish (robots + sitemap)
**Source:** RESEARCH.md Pattern 3, quoting `.planning/phases/03-anonymized-product-data-report/03-01-PLAN.md` and `03-06-PLAN.md`; enforced by `app/__tests__/sitemap.test.ts` lines 41-43 (`expect(metadata.robots).toBeUndefined()` once published)
**Apply to:** `app/customers/[slug]/page.tsx` metadata (or `generateMetadata`) + `app/sitemap.ts` — must change in the same commit at publish time.

### Verified-customer quote rendering
**Source:** `app/components/landing/LandingValueProps.tsx` lines 58-123 (`TestimonialVerification`, `VerificationLine`, `QuoteCard`)
**Apply to:** `app/customers/[slug]/page.tsx`'s quote block — import, never reimplement (Pattern 1, D-03/D-04 inherited from Phase 2).

### jsdom test mocks for landing/analytics components
**Source:** `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` lines 10-45
**Apply to:** `app/customers/[slug]/__tests__/page.test.tsx` — matchMedia, IntersectionObserver, `@/utils/analytics/client` mock, all verbatim.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None — all files classified above have a strong in-repo analog | — | — | This phase is explicitly "100% in-repo" per RESEARCH.md Standard Stack; the only genuinely new pattern (dynamic `[slug]` route with `generateStaticParams`) has no in-repo precedent but is fully specified by official Next.js docs cited in RESEARCH.md (Sources, Secondary) |

Note: the interview kit artifact (D-04) and the interview questions themselves are content, not code — no code analog applies; RESEARCH.md already quotes the sprint plan's verbatim template and ten questions in full (Code Examples section) for direct reuse in the kit document.

## Metadata

**Analog search scope:** `app/research/wow-classic-loot-systems-2026/`, `app/components/landing/`, `app/about/page.tsx`, `app/sitemap.ts`, `app/__tests__/`, `.planning/phases/02-*`, `.planning/phases/03-*`
**Files scanned:** 7 read in full or targeted range this session (all ≤ 549 lines, no large-file Grep-then-Read needed)
**Pattern extraction date:** 2026-09-05
