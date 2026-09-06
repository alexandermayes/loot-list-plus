---
phase: 04-verified-guild-case-study
reviewed: 2026-09-06T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - app/__tests__/sitemap.test.ts
  - app/components/landing/LandingValueProps.tsx
  - app/customers/[slug]/__tests__/page.test.tsx
  - app/customers/[slug]/page.tsx
  - app/customers/[slug]/sections.tsx
  - data/case-studies/example-guild-fixture.ts
  - data/case-studies/index.ts
  - data/case-studies/types.ts
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-09-06T00:00:00Z
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The case-study template (`app/customers/[slug]/page.tsx`, `sections.tsx`), the registry (`data/case-studies/`), and the accompanying test suites are well structured: slug resolution is exact-match with a validated charset pattern, the fixture is correctly excluded from production builds and from the sitemap, and the copy-parity tests genuinely trace back to the fixture and the approved-copy artifact rather than to literals. `npm run typecheck`, `eslint`, and the two reviewed test files all pass cleanly.

No BLOCKER-tier issues were found (no injection, no auth bypass, no crash, no data loss). Five WARNING-tier issues were found, the most notable being a mismatch between the page's visible breadcrumb trail and its BreadcrumbList structured data (which undermines the sprint's own SEO goal), an omit-if-absent contract in `buildBylineMeta` that the type system makes unreachable in production, and two latent-but-real defense-in-depth gaps (unescaped JSON-LD injection, unvalidated external href scheme) around content that is explicitly documented as guild-authored. Four INFO-tier items cover dead code and process risk.

## Warnings

### WR-01: BreadcrumbList structured data doesn't match the visible breadcrumb trail

**File:** `app/customers/[slug]/page.tsx:213-229` (schema) vs `app/customers/[slug]/page.tsx:240-246` (rendered nav)
**Issue:** The visible breadcrumb nav renders `Home / {breadcrumbLabel}` where `breadcrumbLabel` resolves to the static approved string `"Customers"`. The `BreadcrumbList` JSON-LD emitted a few lines earlier uses a completely different second segment: `name: h1`, i.e. the full resolved headline (e.g. "How Example Guild (Fixture) Cut Weekly Loot Admin from 6 hours a week to 45 minutes a week"). Google's structured-data guidelines require breadcrumb markup to reflect the page's actual visible breadcrumb trail; a mismatch this large risks the rich result being dropped or flagged, which directly cuts against this phase's own "Search & AI Visibility" purpose. Note: this exact pattern is copied from the pre-existing `app/research/wow-classic-loot-systems-2026/page.tsx` (not in this phase's scope), so it isn't a regression introduced here, but it is being propagated into new surface area and none of the added tests (`page.test.tsx:150-163`) assert on the breadcrumb's second-item name, so the mismatch ships uncaught.
**Fix:** Either make the visible crumb match the schema (unlikely to be desirable, since "Customers" reads better as a label than a full sentence), or make the schema match the visible crumb, e.g.:
```ts
const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.getlootlist.com' },
    { '@type': 'ListItem', position: 2, name: breadcrumbLabel },
  ],
}
```

### WR-02: `buildBylineMeta`'s omit-if-absent contract is unreachable for real entries

**File:** `app/customers/[slug]/sections.tsx:127-136` vs `data/case-studies/types.ts:59-60`
**Issue:** `buildBylineMeta` is documented and tested as dropping an absent `interviewedMonthYear` or `expansionTier` "rather than leaving a blank slot" (same omit rule as the proof strip). But `CaseStudy.interviewedMonthYear` and `CaseStudy.expansionTier` are declared as **required, non-optional** `string` fields on the interface (unlike `CaseStudyProofStrip`'s members, which are correctly `?: string`). Every real entry that passes `npm run typecheck` is therefore guaranteed to supply both fields, so the omit branch in `buildBylineMeta` can only be exercised in production by an entry author deliberately setting one to `''`, which contradicts the interface's stated intent that these fields are required. The function's contract and the type it consumes disagree.
**Fix:** If the byline meta row is genuinely allowed to be partial for a real interview (e.g. expansion/tier not disclosed), make the two fields optional on `CaseStudy` to match:
```ts
interviewedMonthYear?: string
expansionTier?: string
```
If they truly must always be present, drop the optional-omit handling from `buildBylineMeta` and document that the function is defensive-only, not a real production code path.

### WR-03: JSON-LD is injected via `dangerouslySetInnerHTML` without escaping script-breakout sequences

**File:** `app/customers/[slug]/page.tsx:233-234`
**Issue:** `JSON.stringify(jsonLd)` / `JSON.stringify(breadcrumbLd)` are passed straight into `dangerouslySetInnerHTML` with no escaping of `<` (in particular `</script>`). `jsonLd` embeds interview-sourced content (`h1`, `description`, and transitively every `CaseStudy` field feeding those templates), fields this module's own header comment says are "a value a guild states in its written interview answers" (`data/case-studies/types.ts:1-13`). If any such field ever contains the literal sequence `</script>`, the browser HTML parser will close the JSON-LD `<script>` tag early and interpret the remainder of the string as HTML/script, defeating React's own escaping since this content never passes through JSX text nodes. Current committed data (the fixture) doesn't trigger this, and the same unescaped pattern already exists in `app/research/wow-classic-loot-systems-2026/page.tsx`, but it's still a real gap being carried into new code that will ingest externally-authored guild content.
**Fix:** Escape `<` before embedding, e.g.:
```ts
const toSafeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
// ...
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toSafeJsonLd(jsonLd) }} />
```

### WR-04: `wcl_link` verification renders an unvalidated external URL as `href`

**File:** `app/components/landing/LandingValueProps.tsx:95-103`
**Issue:** When `author.verification.type === 'wcl_link'`, `author.verification.url` is rendered directly as `<a href={...}>`, with no check that the scheme is `http(s)`. Every currently-shipped caller supplies a hardcoded, developer-controlled literal (the three landing-page testimonials, and no `wcl_link` fixture in `data/case-studies/`), so there's no live exploit path today. But `CaseStudy.author` (`QuoteAuthor`) is explicitly documented as sourced from a guild's written interview answers, transcribed by a person into a committed file, a single copy/paste of an unreviewed "verification link" value (e.g. a `javascript:` URI) would render unguarded.
**Fix:** Validate the scheme before rendering, e.g.:
```ts
const isSafeExternalUrl = (url: string) => /^https:\/\//.test(url)
// ...
{author.verification?.type === 'wcl_link' && isSafeExternalUrl(author.verification.url) ? (
  <a href={author.verification.url} ...>
```

### WR-05: Site origin is repeated as a hardcoded literal instead of reusing the existing helper/constant

**File:** `app/customers/[slug]/page.tsx:193, 196, 201, 204, 221`
**Issue:** `canonicalUrl()` (line 94) already centralizes `https://www.getlootlist.com/customers/${slug}`, but the same origin string `https://www.getlootlist.com` is separately hardcoded five more times inside `jsonLd`/`breadcrumbLd` (author `@id`, author `url`, publisher `url`, publisher logo `url`, breadcrumb "Home" `item`). This mirrors an existing repo-wide pattern (the same literal appears in `app/layout.tsx`, every blog page, `app/research/...`, etc.), so it isn't a new convention violation, but it means a domain change requires touching many call sites with no single point of failure protection.
**Fix:** Extract a shared `SITE_ORIGIN` constant (even module-local) and derive `canonicalUrl()` and the JSON-LD literals from it:
```ts
const SITE_ORIGIN = 'https://www.getlootlist.com'
function canonicalUrl(slug: string) {
  return `${SITE_ORIGIN}/customers/${slug}`
}
```

## Info

### IN-01: Dead `'page.title'` key in `APPROVED_STRINGS`

**File:** `app/customers/[slug]/page.tsx:27`
**Issue:** `APPROVED_STRINGS['page.title']` is defined (identical to `'page.h1-preferred'`) but never read, `generateMetadata` sets `title: h1` directly (line 130), never `approved('page.title', tokens)`. It's leftover from before the "H1 and title must always be the same string" refactor documented at lines 82-87.
**Fix:** Delete the unused `'page.title'` entry to avoid a future editor updating it and assuming it has an effect.

### IN-02: `openGraph.modifiedTime` always equals `publishedIso`

**File:** `app/customers/[slug]/page.tsx:137-138`
**Issue:** `modifiedTime: entry.publishedIso` means the Open Graph "last modified" signal can never differ from "first published," even if a case study's copy is later corrected. Not incorrect today (no entries have been modified), but it's a signal that will silently misreport itself the moment content changes.
**Fix:** Add an optional `updatedIso` field to `CaseStudy`, defaulting to `publishedIso` when absent, and use it for `modifiedTime`.

### IN-03: `app/sitemap.ts` is a flat literal, not wired to `listPublishedSlugs()`

**File:** `data/case-studies/index.ts:67-69` (unused by `app/sitemap.ts`, which is out of this phase's file scope but is exercised by `app/__tests__/sitemap.test.ts`)
**Issue:** `listPublishedSlugs()` exists specifically so the sitemap can stay in sync with the published-case-study registry, but `app/sitemap.ts` is a hand-maintained flat array that never imports or calls it. `sitemap.test.ts:68-79` only asserts this holds vacuously today (`publishedSlugs` is `[]`); the moment a real entry is added to `publishedCaseStudies`, nothing will automatically add its URL to the sitemap; a human has to remember to hand-add the entry. The test file's own comments acknowledge this is expected to be handled "in the same commit that ships the first case study," so this is a documented process risk rather than a bug in code shipped today.
**Fix:** When wiring the publish commit, generate the case-study sitemap entries from `listPublishedSlugs()` inside `app/sitemap.ts` rather than hand-typing a new literal entry, so the guarantee is structural instead of procedural.

### IN-04: Test file maintains its own copy of `APPROVED_STRINGS`, independent of `page.tsx`'s

**File:** `app/customers/[slug]/__tests__/page.test.tsx:61-66`
**Issue:** `page.test.tsx` re-declares a local `APPROVED` map (a subset of `page.tsx`'s `APPROVED_STRINGS`) rather than importing the one in `page.tsx`, by design ("proves the rendered output independently of the page module's own implementation"). That's a reasonable test-independence goal, but it means these four templates now have two hand-maintained copies that must be updated in lockstep; a copy edit in `page.tsx` that isn't mirrored here will make the test fail for the wrong reason (a false "regression") rather than surfacing as a copy-fidelity issue, and an edit made only here would mask a real drift from `page.tsx`. The separate `04-COPY-DRAFT.md` parity test (lines 496-530) protects against drift from the approved-copy artifact, but nothing protects these two in-repo copies from drifting from each other.
**Fix:** No change required if this tradeoff is intentional; if churn on these four strings becomes frequent, consider deriving `EXPECTED_H1`/`EXPECTED_LEAD`/etc. from the copy-draft parity mechanism instead of a second hardcoded map.

---

_Reviewed: 2026-09-06T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
