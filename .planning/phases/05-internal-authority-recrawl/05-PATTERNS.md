# Phase 5: Internal Authority & Recrawl - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 15
**Analogs found:** 13 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `data/content-dates.json` | config/data | transform | `public/research/wow-classic-loot-systems-2026-aggregates.json` (imported via `resolveJsonModule`) | role-match |
| `lib/content-dates.ts` | utility | transform | `app/research/wow-classic-loot-systems-2026/page.tsx` (JSON import + typed wrapper pattern) | role-match |
| `app/sitemap.ts` (modified) | route (metadata route) | batch/transform | itself (existing file) — hand-typed `MetadataRoute.Sitemap` array | exact (modify in place) |
| `app/__tests__/sitemap.test.ts` (extend) | test | request-response/unit | itself (existing file) | exact (extend in place) |
| new blog-date parity test (e.g. `app/__tests__/blog-dates.test.ts` or similar) | test | unit | `app/__tests__/sitemap.test.ts` (structure: `describe`/`it`, imports page `metadata`, cross-checks a literal against a source) | role-match |
| `app/components/landing/LandingLootDecision.tsx` (inline link edit) | component | request-response (static render) | itself (existing file, client component with copy strings) | exact (modify in place) |
| `app/compare/page.tsx` (inline link edit) | route/page | request-response | `app/research/wow-classic-loot-systems-2026/page.tsx` (approved-copy + link-injection patterns) | role-match |
| `app/pricing/page.tsx` (inline link edit) | route/page | request-response | `app/compare/page.tsx`, `app/pricing/page.tsx` itself (FAQ/CTA block conventions) | exact (modify in place) |
| `app/about/page.tsx` (inline link edit) | route/page | request-response | `app/about/page.tsx` itself (`Section`/`Body` helper components) | exact (modify in place) |
| Selected `app/blog/<slug>/page.tsx` guides (inline link edit) | route/page | request-response | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` (metadata + JSON-LD + body shape shared by all 9 posts) | exact (template shared across siblings) |
| `app/research/wow-classic-loot-systems-2026/page.tsx` (connective text) | route/page | request-response | itself — Pattern 2 (sibling `<p>` outside `.prose`) and Pattern 1 (index-split an approved string) | exact (modify in place) |
| `app/customers/[slug]/sections.tsx` (connective text) | component | request-response | `app/research/wow-classic-loot-systems-2026/page.tsx` (same approved-copy discipline, case-study equivalent) | role-match |
| `scripts/analytics/probe-recrawl-urls.py` (new) | script/utility | request-response (HTTP fetch + assert) | `scripts/analytics/pull-gsc.py` (stdlib-only Python, `load_env`, `urllib.request` pattern) | role-match |
| `scripts/analytics/inspect-url.py` (new, or extend `pull-gsc.py`) | script/utility | request-response (API call) | `scripts/analytics/pull-gsc.py`'s `get_access_token()`/`query()` | exact |
| `scripts/analytics/RECRAWL-LOG.md` (or `.csv`) | data (append-only log) | batch | `scripts/analytics/ai-answer-log.csv` + `scripts/analytics/log-ai-answer.py` (append-only, header-row-if-missing, validate-before-write) | exact |
| `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` step 5 (edit) | doc | transform | itself (existing Step 5 table) | exact (modify in place) |
| `05-COPY-DRAFT.md` (new) | doc (sign-off artifact) | transform | `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md`, `.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md` | exact |

## Pattern Assignments

### `app/sitemap.ts` (route, metadata/batch)

**Analog:** itself, plus `app/api/version/route.ts` for the "don't hand-roll" deploy-SHA precedent (not directly reused here, but confirms literal-source discipline).

**Current shape to replace** (`app/sitemap.ts:1-120`, read this session): a flat array literal, three `new Date()` calls (homepage, `/blog`, `/changelog` — lines 7, 37, 103) mixed with hand-typed `new Date(2026, N, N)` literals for every other entry. No dedup logic exists; the test file is the only guard.

**Target pattern:** replace every `lastModified` value with a lookup into `lib/content-dates.ts` / `data/content-dates.json`. Example shape:
```typescript
import { MetadataRoute } from 'next'
import { contentDate, latestBlogDate, latestChangelogDate } from '@/lib/content-dates'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.getlootlist.com',
      lastModified: contentDate('/'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    // ...
    {
      url: 'https://www.getlootlist.com/blog',
      lastModified: latestBlogDate(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: 'https://www.getlootlist.com/changelog',
      lastModified: latestChangelogDate(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ]
}
```
Keep every existing `url`/`changeFrequency`/`priority` value unchanged (D-09 only replaces `lastModified`'s source, not the entries themselves); do not touch entries for pages this phase does not edit (D-10 — code refactors/metadata-only tweaks don't bump lastmod, and per RESEARCH.md git-history finding, `/compare`, `/pricing`, `/about`, and all 9 blog posts are unchanged since `origin/main`, so their existing literal dates carry forward into the JSON as-is unless this phase's own link edits touch them).

### `data/content-dates.json` + `lib/content-dates.ts` (config/utility, transform)

**Analog:** `public/research/wow-classic-loot-systems-2026-aggregates.json` imported at `app/research/wow-classic-loot-systems-2026/page.tsx:9` via `import aggregates from '@/public/research/wow-classic-loot-systems-2026-aggregates.json'`, relying on `resolveJsonModule: true` (`tsconfig.json:12`).

**JSON import pattern** (from `page.tsx:9`):
```typescript
import aggregates from '@/public/research/wow-classic-loot-systems-2026-aggregates.json'
```

**Typed wrapper pattern** — mirror the `Finding`/`UnavailableMetric` interface-plus-cast approach at `page.tsx:22-46` (declare a shape, cast the imported JSON, export small pure accessor functions rather than re-exporting the raw object):
```typescript
// lib/content-dates.ts
import dates from '@/data/content-dates.json'

interface ContentDates {
  routes: Record<string, string> // ISO date strings, e.g. "2026-09-04"
  blogPosts: Record<string, string> // slug -> ISO date
}

const DATES = dates as ContentDates

export function contentDate(route: string): Date {
  const iso = DATES.routes[route]
  if (!iso) throw new Error(`No content-dates entry for route "${route}"`)
  return new Date(iso)
}

export function latestBlogDate(): Date {
  const isoValues = Object.values(DATES.blogPosts)
  return new Date(isoValues.sort().at(-1)!)
}
```
Note the `throw new Error(...)` on a missing lookup mirrors the fail-loud convention already used twice in `page.tsx:225` (`BYLINE_ZEV_INDEX === -1`) and `page.tsx:238` (`REPRODUCE_URL_INDEX === -1`) — don't silently fall back to `new Date()` on a missing key, that reintroduces the exact bug D-09 removes.

### `app/__tests__/sitemap.test.ts` (extend, unit)

**Analog:** itself. Existing 8 assertions (`app/__tests__/sitemap.test.ts:23-80`) use `describe('app/sitemap.ts', ...)` with a fresh `sitemap()` call per `it`. The precedent test for "literal, non-drifting" is already there:
```typescript
it('gives the report entry a literal, non-drifting lastModified date', () => {
  const first = sitemap().find((entry) => entry.url === REPORT_URL)
  const second = sitemap().find((entry) => entry.url === REPORT_URL)
  expect(first?.lastModified).toBeInstanceOf(Date)
  const firstDate = first?.lastModified as Date
  const secondDate = second?.lastModified as Date
  expect(firstDate.getTime()).toBe(secondDate.getTime())
})
```
Extend this exact pattern to run over every entry (not just the report), plus a new assertion asserting `app/sitemap.ts`'s source text contains no `new Date()` call (a `fs.readFileSync` + string/regex check, or a static import-based check against the dates module's exported keys covering every sitemap URL).

### New blog-date JSON-LD parity test

**Analog:** `app/__tests__/sitemap.test.ts`'s own pattern of importing a page's `metadata` export and cross-checking one field (`import { metadata } from '../research/wow-classic-loot-systems-2026/page'` at line 3, then `expect(entry?.url).toBe(metadata.alternates?.canonical)` at line 48).

**Pattern to reuse:** for each blog post in the D-03 topic-matched subset (or all 9, discretion of planner), import its `page.tsx` module (or render it and read the injected `<script type="application/ld+json">` JSON-LD block, per the JSON-LD shape shown in `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx:41-`), extract `dateModified`, and assert it equals `lib/content-dates.ts`'s `contentDate('/blog/<slug>')` (formatted to the same ISO precision). Follow the substring/render-then-assert convention already used by the report/case-study `__tests__/page.test.tsx` files (`container.textContent.toContain(...)`) rather than a byte-exact string match, since JSON-LD is a script tag not prose.

### Marketing pages: `app/compare/page.tsx`, `app/pricing/page.tsx`, `app/about/page.tsx`, `app/components/landing/LandingLootDecision.tsx`

**Analog:** the report page's Pattern 1 (index-split an approved string) and Pattern 2 (sibling paragraph outside `.prose`) from `app/research/wow-classic-loot-systems-2026/page.tsx:225-260, 527-534` — same two techniques apply in reverse: these pages are the *linking* pages, not the *linked-to* page, but the byte-preservation discipline is identical wherever the sentence carrying the new link is not itself a Phase 3/4 approved string.

**Compare page** — natural slot already exists at `app/compare/page.tsx:212-` ("Q&A with Zev, creator of LootList+"), specifically the Q4/Q8-style attendance and bad-luck-protection answers (lines 253-297) already discuss the report's subject matter in the site's own voice. New connective sentence is plain prose, not wrapped in a special component:
```tsx
<p>
  {existingAnswerText} See the data: <a href="/research/wow-classic-loot-systems-2026">84.8% of guilds weight attendance</a>.
</p>
```

**Pricing page** — CTA area is the natural slot (`app/pricing/page.tsx:60-` header/FAQ block); add a connective sentence near the CTA, not inside the `FAQ` array's approved-feeling copy (this file has no `APPROVED_STRINGS` gate today, so no byte-match risk here — just keep it as plain new prose per D-05/D-06).

**About page** — uses `Section`/`Body` helper components (`app/about/page.tsx:32-46`); a new link goes inside a `<Body>` paragraph via the same `{children}` prop, no new component needed.

**Homepage (`LandingLootDecision.tsx`)** — the caption is the named D-01 "loot-decision section." Current caption text at line 111-114:
```tsx
<div className="px-6 py-3 bg-[#080808]/40">
  <p className="font-poppins text-[12px] text-[#bababa]/60">
    Anonymized example. In the app, every score opens into its full calculation.
  </p>
</div>
```
This is a `'use client'` component (line 1) with Framer Motion wrappers; any new link must render as a plain `<a>`/`<Link>` inside the existing `motion.p` (the h2/subhead text block at lines 40-53) or the caption `<p>` — do not add a new `motion.div` section (D-01 forbids a new "further reading" block).

### Blog guides (D-03 subset): `app/blog/<slug>/page.tsx`

**Analog:** `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` — every one of the 9 posts shares this exact shape: `metadata` export with `openGraph.publishedTime`, a `jsonLd` const with `datePublished`/`dateModified`, imports of `LandingNav`, `LandingCTA`, `LandingFooter`, `BlogRelatedPosts`, `BlogTracker` (lines 1-6). The report-link insertion point is body prose within the article, following the report page's plain-`<a>`-in-paragraph convention (no special component — `BlogRelatedPosts` stays reserved for the existing blog-to-blog cross-linking, per D-01).

**dateModified location for the parity test:** `jsonLd.dateModified` — locate via `grep -n "dateModified" app/blog/<slug>/page.tsx` per post (not read in full this session per file for all 9; the one post read confirms the field exists at the same relative position as `datePublished`, immediately following `headline`/`description` in the `jsonLd` object literal).

### `app/research/wow-classic-loot-systems-2026/page.tsx` connective text to `/compare` and `/pricing`

**Analog:** itself — Pattern 2, the CTA sibling block at lines 527-534:
```tsx
{/* Contextual CTA (EVID-03): rendered as a sibling outside the
    prose wrapper above, not nested inside it. ... */}
<div className="my-12 p-8 rounded-xl border border-border bg-background-elevated flex flex-col items-start gap-4">
  <div className="text-2xl font-bold text-foreground">{CTA_HEADING}</div>
  <p className="text-lg text-foreground-secondary">{CTA_BODY}</p>
  <Button asChild variant="accent" size="lg" className="font-bold">
    <a href={CTA_URL}>{CTA_BUTTON_LABEL}</a>
  </Button>
</div>
```
New `/compare`/`/pricing` connective sentences should be a new plain `<p>` sibling near this block (not a new `<h2>` — see Pitfall 2 in RESEARCH.md: `h2s.toHaveLength(aggregates.findings.length + 2)` is an exact-count assertion). If the sentence must incorporate part of an `APPROVED_STRINGS` value, use the index-split technique from Pattern 1 (`BYLINE_ZEV_INDEX`/`REPRODUCE_URL_INDEX`, lines 225-238) — locate the substring, slice before/after, render three pieces. If it is wholly new text (the more likely case per D-04 "newly added connective text"), skip the split entirely and just add a new `const` + `<p>`, same as any non-approved string elsewhere in this file (e.g. the data-driven `unavailableMetrics.map(...)` block at lines 507-516 shows plain new JSX added outside the approved-copy discipline).

### `app/customers/[slug]/sections.tsx` connective text

**Analog:** same as above — the case-study template is explicitly "pre-wired into the... template for its runbook sweep" per D-04, so it should follow the identical sibling-paragraph, index-split-if-touching-approved-copy pattern. Not read in full this session (out of the required-reading list and D-08 scopes actual case-study *links* out of Phase 5), but the wiring for a future link slot should match `page.tsx`'s Pattern 1/2 exactly since `04-COPY-DRAFT.md`'s approved strings use the same `CONTENT-TOKEN`/`APPROVED-STRING` discipline (see `04-COPY-DRAFT.md:1-40`).

### `scripts/analytics/probe-recrawl-urls.py` (new)

**Analog:** `scripts/analytics/pull-gsc.py` — reuse `load_env()` (lines 32-39) for `.env.local` reading (though the probe likely needs no secrets, just the production origin), and the `urllib.request.Request(...)` + `urlopen(..., timeout=60)` pattern (lines 51-58) for each HTTP fetch. Reuse the namespace-aware `xml.etree.ElementTree` sitemap parser from RESEARCH.md's Code Examples section verbatim:
```python
import xml.etree.ElementTree as ET

NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

def parse_sitemap(xml_text: str) -> dict[str, str]:
    root = ET.fromstring(xml_text)
    return {
        url_el.find("sm:loc", NS).text: url_el.find("sm:lastmod", NS).text
        for url_el in root.findall("sm:url", NS)
    }
```
Follow `pull-gsc.py`'s top-of-file docstring convention (usage examples, "stdlib only" declaration) and its `argparse` CLI shape (`parse_args()`, lines 100-114) for accepting a URL list or reading `RECRAWL-LOG.md`'s pending rows.

**Error handling:** mirror `pull-gsc.py`'s `except urllib.error.HTTPError as e: print(...); sys.exit(1)` pattern (lines 149-152, 187-189) rather than a bare `except Exception`.

### `scripts/analytics/inspect-url.py` (new, or extend `pull-gsc.py`)

**Analog:** `scripts/analytics/pull-gsc.py`'s `get_access_token()` (lines 41-55) — reuse verbatim (same OAuth refresh-token exchange, same `.env.local` keys `GSC_CLIENT_ID`/`GSC_CLIENT_SECRET`/`GSC_REFRESH_TOKEN`/`GSC_SITE_URL`). Replace the `query()` function's endpoint and body per the URL Inspection contract documented in RESEARCH.md:
```python
def inspect(token, site, url):
    req = urllib.request.Request(
        "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect",
        data=json.dumps({
            "inspectionUrl": url,
            "siteUrl": site,
            "languageCode": "en-US",
        }).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)
```
Also copy `gsc-auth.py`'s "No tokens are printed" discipline (docstring line 16, and the fact that `main()` in `gsc-auth.py` never logs `tokens` or `refresh` directly) — never `print()` the access token, refresh token, or client secret, including in error paths (RESEARCH.md Security Domain table, Information Disclosure row).

### `scripts/analytics/RECRAWL-LOG.md` (or `.csv`) (new, append-only log)

**Analog:** `scripts/analytics/ai-answer-log.csv` + `scripts/analytics/log-ai-answer.py`.

**Header-row convention** (`log-ai-answer.py:17-26`):
```python
HEADER = [
    "date",
    "ai_surface",
    "prompt_id",
    "lootlist_appeared",
    "factually_correct",
    "cited_url",
    "competing_sources",
    "notes",
]
```
Equivalent for the recrawl log per D-15's named fields: `["url", "deploy_sha", "probe_result", "inspection_result", "request_date", "requester"]`.

**Append-only writer** (`log-ai-answer.py:append_row`, lines 92-113): validate first, create parent dir with `os.makedirs(dirname, exist_ok=True)`, write header only if file missing or zero bytes (`needs_header = not os.path.exists(log_path) or os.path.getsize(log_path) == 0`), then `csv.writer(f).writerow(...)` — never string-join with commas (the docstring explicitly warns: "Never assembles a line by joining on a comma"). If the log is Markdown instead of CSV (planner's discretion), keep the same validate-then-append discipline but append a new table row via a small Python helper rather than hand-editing the `.md` file, mirroring `04-PUBLISH-RUNBOOK.md`'s existing `| URL | Submitted (date) |` table shape (`04-PUBLISH-RUNBOOK.md:58-60`) for a familiar reader experience.

**Read-only reader convention** (`log-ai-answer.py:read_rows`, lines 116-123): "never sorts, deduplicates, or rewrites" — same rule applies to any script reading the recrawl log before checking whether a URL was already submitted; append order is the log's own audit trail.

### `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` step 5 (edit)

**Analog:** itself, current Step 5 (`04-PUBLISH-RUNBOOK.md:52-60`):
```markdown
## Step 5: The One-Time Recrawl

Submit a Search Console URL Inspection recrawl request exactly once for the new case-study URL, and exactly once for each page whose links changed in step four. ...

Record every submitted URL and the date it was submitted in the table below before this step is considered complete...

| URL | Submitted (date) |
|-----|-------------------|
| _(fill in at publish time)_ | |
```
Per D-15, replace the in-file table with a pointer sentence and remove the empty table, e.g.:
```markdown
## Step 5: The One-Time Recrawl

Submit a Search Console URL Inspection recrawl request exactly once for the new case-study URL, and exactly once for each page whose links changed in step four. Do not submit a request more than once for the same URL under any circumstance.

Before submitting, and immediately after, append a row to `scripts/analytics/RECRAWL-LOG.md` (the single append-only record shared with Phase 5's link sweep) — do not track submitted URLs in this file.
```
Preserve the surrounding paragraph's warning language verbatim (it is not an `APPROVED_STRINGS` value, but it is prior-phase prose worth keeping intact per the "prior-phase contracts this phase must respect" note in CONTEXT.md).

### `05-COPY-DRAFT.md` (new sign-off artifact)

**Analog:** `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md` and `.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md`.

**Header block convention** (`03-COPY-DRAFT.md:1-7`, `04-COPY-DRAFT.md:1-5`):
```markdown
STATUS: APPROVED

# Phase 5 Copy Draft

**Purpose:** ...

**Sign-off:** received <date>, ... Provenance: ...
```
Start `05-COPY-DRAFT.md` with `STATUS: DRAFT` (not `APPROVED`) until the D-05 sign-off happens, flipping to `APPROVED` with a sign-off paragraph once the user approves.

**APPROVED-STRING convention** (`03-COPY-DRAFT.md:53-60`):
```
APPROVED-STRING: page.title = How WoW Classic Guilds Actually Run Loot in 2026: Data from {sample_active_guilds} Guilds
APPROVED-STRING: page.byline = By Zev, creator of LootList+
```
Per D-05, `05-COPY-DRAFT.md`'s table is a link table, not a flat string list — model it as a Markdown table with columns: page, surrounding sentence (before/after), anchor text, target URL, case-study-slot note (D-08). Each row's anchor text can still carry an `APPROVED-STRING: <page>.link-<n> = <anchor text>` line beneath the table for a byte-match test to key off, following the existing key-naming convention (`page.title`, `methodology.reproduce`) — e.g. `compare.link-report = 84.8% of guilds weight attendance`.

**Token declaration convention** (`04-COPY-DRAFT.md:11-19`, `CONTENT-TOKEN: guild = CaseStudy.guild`): not needed for Phase 5 (no guild-specific interview data), skip this section.

## Shared Patterns

### Approved-copy byte-match discipline (D-04)
**Source:** `app/research/wow-classic-loot-systems-2026/page.tsx:52-` (`const PAGE_TITLE = approved('page.title')` and friends), cross-checked against `03-COPY-DRAFT.md`'s `APPROVED-STRING` lines.
**Apply to:** any edit to `app/research/wow-classic-loot-systems-2026/page.tsx` or `app/customers/[slug]/sections.tsx`. Never edit a string returned by `approved(key)`; add new connective text as a wholly separate `const`/JSX sibling, using the index-split technique (Pattern 1) only if a link must be embedded inside an already-approved sentence.

### Sibling-paragraph-outside-prose for new CTAs/links (D-04, Pitfall 2)
**Source:** `app/research/wow-classic-loot-systems-2026/page.tsx:527-534` comment block.
**Apply to:** `app/research/.../page.tsx`, `app/customers/[slug]/sections.tsx`, and any marketing page where a `.prose`-wrapped block's link styling would clash with a new button/CTA-style link. New plain-text links (not CTA buttons) can go inside prose directly as normal `<a>` tags.

### Plain inline `<a>` for contextual links, never a new component (D-01)
**Source:** every marketing page and blog post reviewed uses raw `<a href="...">` or `next/link`'s `<Link href="...">` directly in JSX (e.g. `app/pricing/page.tsx` imports `Link from 'next/link'` at line 2; `app/compare/page.tsx:204` uses a raw `<a>` for the Discord link with `className="text-accent underline underline-offset-2 hover:text-accent/80"`).
**Apply to:** all new contextual links on homepage/compare/pricing/about/guides — match the existing anchor `className` conventions per page rather than introducing a shared "evidence link" component.

### Stdlib-only Python in `scripts/analytics/` (D-14, D-15)
**Source:** `scripts/analytics/pull-gsc.py:1-24` and `scripts/analytics/gsc-auth.py:1-20` docstrings, both stating "stdlib only — no node, no google client libraries" / "no google client libraries."
**Apply to:** `probe-recrawl-urls.py`, `inspect-url.py`. Use `urllib.request`, `urllib.parse`, `json`, `argparse`, `xml.etree.ElementTree`, `csv` only — no `requests`, no `google-api-python-client`.

### Validate-then-append for the recrawl log (D-15)
**Source:** `scripts/analytics/log-ai-answer.py`'s `validate_row()` (lines 47-76) + `append_row()` (lines 92-113).
**Apply to:** whatever script or manual process writes to `scripts/analytics/RECRAWL-LOG.md`/`.csv` — validate required fields (URL, deploy SHA, probe result) before writing, create the file with a header row if missing, never rewrite/dedupe/sort existing rows.

### No-tokens-in-logs discipline (Security)
**Source:** `scripts/analytics/gsc-auth.py:16` ("No tokens are printed").
**Apply to:** `inspect-url.py`, `probe-recrawl-urls.py` — never print/log the OAuth access token, refresh token, or client secret.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Blog-date JSON-LD parity test's exact assertion shape | test | unit | No existing test reads a blog post's `jsonLd` object directly (only the report/case-study `__tests__/page.test.tsx` files test their own pages' JSON-LD); RESEARCH.md's Wave 0 Gaps table already flags this as new. Use `app/__tests__/sitemap.test.ts`'s "import page module, cross-check one field" shape as the nearest structural precedent (documented above) even though no file does this specifically for blog JSON-LD today. |
| Per-marketing-page RTL link-presence tests (compare/pricing/about/homepage) | test | unit | RESEARCH.md confirms none of these pages currently have a `__tests__` directory. Nearest structural analog is `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx`'s `getByRole('link', {name: ...})`-style assertions, but that file was not fully read this session — the planner should read it directly before drafting new marketing-page tests to match its exact RTL setup (render helper, `screen` queries). |

## Metadata

**Analog search scope:** `app/sitemap.ts`, `app/__tests__/sitemap.test.ts`, `app/research/wow-classic-loot-systems-2026/page.tsx`, `app/compare/page.tsx`, `app/pricing/page.tsx`, `app/about/page.tsx`, `app/components/landing/LandingLootDecision.tsx`, `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx`, `scripts/analytics/pull-gsc.py`, `scripts/analytics/gsc-auth.py`, `scripts/analytics/log-ai-answer.py`, `scripts/analytics/ai-answer-log.csv`, `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md`, `.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md`, `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md`, `tsconfig.json` (resolveJsonModule check).
**Files scanned:** 17 read directly this session (plus RESEARCH.md/CONTEXT.md's own file:line citations reused where a file was not re-read).
**Pattern extraction date:** 2026-09-07
