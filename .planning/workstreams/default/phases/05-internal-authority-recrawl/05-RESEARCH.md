# Phase 5: Internal Authority & Recrawl - Research

**Researched:** 2026-09-07
**Domain:** Next.js App Router sitemap/metadata mechanics, Google Search Console URL Inspection API, contextual internal linking under a copy-parity gate, Vercel deploy verification
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Link placement and shape**
- **D-01:** Links to the research report on the homepage, /compare, /pricing and /about are inline in existing prose, placed exactly where the page already makes the claim the report backs up (e.g. the homepage loot-decision section, the compare page's fairness claims). No shared "further reading" / evidence block is added to marketing pages; `BlogRelatedPosts` stays blog-only.
- **D-02:** The report page and the case-study template keep their CTAs pointed at the app host (`https://www.lootlistplus.com`). Existing href tests stay green and no CTA copy is re-signed. Contextual links to marketing pages go elsewhere on those pages.
- **D-03:** "Relevant guides" is a topic-matched subset of the 9 blog posts: only guides whose subject the report actually informs (loot-system comparisons, loot drama, running loot without a spreadsheet, priority lists vs council, and similar). Recruitment/onboarding-style posts stay untouched. The executor proposes the exact list at sign-off with a one-line reason per guide.
- **D-04:** The report links out to /compare (where it discusses systems) and /pricing (near the CTA area), each in newly added connective text placed outside the byte-matched approved strings from `03-COPY-DRAFT.md`. The same rule is pre-wired into the case-study template for its runbook sweep. — **Reversibility:** costly — the copy-parity tests on both evidence pages byte-match every approved string; a link placed inside an approved literal breaks the gate and forces a fresh sign-off round.

**Anchor text and sign-off**
- **D-05:** One consolidated sign-off checkpoint: the executor drafts every new link (page, surrounding sentence, anchor text, target) into a single copy-draft table and the user approves or edits in one pass before anything ships. The approved table doubles as the record of which pages changed, feeding the lastmod bumps and the recrawl list. No em dashes.
- **D-06:** Anchor text is the specific claim the target proves, written in the linking page's voice (e.g. "84.8% of guilds weight attendance", "how LootList+ compares to TMB"). Never the destination's title repeated, never "learn more" / "read more".
- **D-07:** Density ceiling is one link per target per page, and only where a claim earns it. A page with no natural spot for a target gets no link rather than a forced sentence.
- **D-08:** Phase 5 adds no case-study links and no hidden placeholders. `04-PUBLISH-RUNBOOK.md` step 4 owns that sweep and its sign-off. The Phase 5 sign-off table carries a note per page marking the sentence where a case-study link would naturally slot in later.

**lastmod source of truth**
- **D-09:** A single committed dates module (route to last-content-change date) becomes the source `app/sitemap.ts` reads. A test cross-checks each blog post's JSON-LD `dateModified` against the module. `new Date()` is removed from the sitemap entirely. — **Reversibility:** costly — the module becomes the contract for the sitemap, the blog-date parity test and the publish runbook; reverting to hand-typed literals means re-establishing the four-way duplication and rewriting the tests.
- **D-10:** Any visible content change bumps a page's lastmod, links and connective sentences included. Code refactors, test changes and metadata-only tweaks do not. This rule is documented next to the dates module.
- **D-11:** Pages changed in Phases 2 to 4 but not yet live carry the deploy date (the day the change became publicly visible), not the git commit date. The dates module records that date once the deploy lands, not before.
- **D-12:** `/blog` and `/changelog` lastmod are derived from their newest item (newest post date in the dates module; newest entry in `lib/updates-data.ts`), never hand-maintained and never build time.

**Deploy gate and recrawl record**
- **D-13:** Two deploys. The first plan ships the pending Phase 2 to 4 commits (local `main` ahead of `origin/main` by ~92) as the baseline deploy so the report is live and checkable. The link sweep and dates module land as a second deploy. Recrawl waits for the second deploy. — **Reversibility:** one-way — once the baseline is live, Google can crawl the pre-link versions; the phase must not request indexing after deploy one, since the one-request-per-URL rule would then be spent before the final state exists.
- **D-14:** "Final" is proven by a committed probe script plus GSC URL Inspection. The script fetches every URL in the recrawl list from production and asserts 200, self-canonical, no noindex, the new link present in HTML, and the sitemap `lastmod` matching the dates module. The user then runs URL Inspection in GSC per URL (the read-only API scope covers inspection, not requests) to confirm Google's render shows the canonical and main content. Both outputs go into the recrawl record.
- **D-15:** One append-only recrawl log lives in `scripts/analytics/` (e.g. `RECRAWL-LOG.md` or `.csv`) with URL, deploy SHA, probe result, inspection result, request date, requester. `04-PUBLISH-RUNBOOK.md` step 5's in-file table is replaced by a pointer to append to this log, so there is exactly one record. — **Reversibility:** costly — the runbook and any later publish path depend on this being the single place to check before requesting.
- **D-16:** "Request indexing" is a manual GSC click. The phase ends at a checkpoint: the executor hands the user a checklist of probe-passed URLs, each with its inspection link, and the log pre-filled except the request date. The user submits each URL once, resubmits the sitemap once in the same session, and confirms; the executor records the dates and commits. No browser automation against the GSC UI.

### Claude's Discretion
- Dates module location and shape (e.g. `lib/content-dates.ts` vs `data/`), the exact date-derivation helpers for `/blog` and `/changelog`, and how the blog-date parity test reads each post's JSON-LD.
- Probe script language and location (Python in `scripts/analytics/` matches Phase 1/3 tooling; a Vitest-driven fetch is acceptable if simpler), and the log's exact column layout (Markdown table vs CSV).
- Which sentence on each marketing page carries each link, and the drafted connective wording, all presented at the D-05 sign-off.
- Which four-plus guides make the topic-matched subset (proposed with reasons at sign-off).
- Deploy mechanics for the two deploys (push to `origin/main` and Vercel production build), including the standing personal-account guard and any pre-push checks (`npm test`, `npm run lint`, `npm run typecheck`).
- Whether the two open Phase 4 medium security items (JSON-LD `<` escaping, https-only public-profile URL) ride along in deploy two or stay with the case-study publish commit as recorded.

### Deferred Ideas (OUT OF SCOPE)
- Nav/footer "Research" entry: not discussed as a link surface; if wanted it is a navigation change, not a contextual link, and belongs in a later pass.
- Blog post date refactor (single source for metadata, JSON-LD, `<time>`, listing array): the dates module plus parity test covers the sitemap need; consolidating the per-page copies is a cleanup for later.
- `/customers` index page: still deferred from Phase 4 D-02.
- Case-study linking and its own recrawl (owned by `04-PUBLISH-RUNBOOK.md`), new pages or content, nav/footer restructuring, external-surface updates, Phase 6 measurement.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LINK-01 | Homepage, Compare, Pricing, About, report, case study, and relevant guides interlink contextually with descriptive anchor text | "Marketing-Page Link Surfaces" table below names the exact file/component and candidate sentence per surface; "Copy-Parity Constraints" pitfall explains what must NOT be touched on the report page; case study is explicitly out of scope per D-08 (owned by 04-PUBLISH-RUNBOOK.md) |
| LINK-02 | Sitemap `lastmod` is accurate and one-time recrawl requests are made once per materially changed URL, after all content is final | "Sitemap & Dates Module" and "GSC URL Inspection API" sections give the exact `MetadataRoute.Sitemap` contract, the caching gotcha behind `new Date()`, the confirmed OAuth scope for inspection vs. sitemap resubmission, and the `/api/version` build-id endpoint for recording deploy SHA |
</phase_requirements>

## Summary

Phase 5 is almost entirely a code-and-copy exercise inside a codebase whose conventions are already fully established by Phases 1–4: a stdlib-only Python script pattern in `scripts/analytics/`, an `APPROVED-STRING`-gated copy-sign-off pattern with byte-parity tests, and an atomic-commit discipline around `app/sitemap.ts`. Nothing about GSC's URL Inspection API, Next.js's sitemap route, or Vercel deploy verification requires a new library: the existing `scripts/analytics/pull-gsc.py` token/query helpers extend directly to `urlInspection.index:inspect` (same OAuth token exchange, same `webmasters.readonly` scope — confirmed sufficient by Google's own docs), and the repo already ships a purpose-built deploy-SHA endpoint (`app/api/version/route.ts`) that answers the "how do I prove which deploy is live" question better than parsing Vercel response headers.

The two decisions with the most planning leverage are (1) **`new Date()` inside `app/sitemap.ts` is deceptive, not just untidy** — Next.js's own docs confirm the sitemap route is cached and rendered at build time unless a request-time API is used, so today's three `new Date()` calls freeze at whatever moment Vercel last built the app, not "now"; D-09's removal is a correctness fix, not only a cleanup — and (2) **the git history proves the baseline sitemap dates for `/compare`, `/pricing`, `/about`, and all 9 blog posts are still accurate**, because none of those files have been touched since `origin/main` — only the report and case-study routes are new. That means the dates module only needs a genuinely new lastmod value for pages Phase 5 itself edits (the four marketing pages, whichever guides get links, and the report page), not a wholesale re-dating of the sitemap.

The report page's copy-parity test suite (`app/research/.../__tests__/page.test.tsx`) uses `container.textContent.toContain(...)`, not exact-match, and its H2 count assertion is `findings.length + 2` — so new connective text for D-04's /compare and /pricing links is safe anywhere that doesn't add a new `<h2>` or fall inside a rendered `APPROVED_STRINGS` value. The safest slot is a new paragraph adjacent to the existing CTA block (outside the `prose` wrapper, same as the CTA itself), which the report page's own comments already flag as a special-cased sibling.

**Primary recommendation:** Reuse `scripts/analytics/pull-gsc.py`'s `get_access_token()`/`query()` pattern for a small `inspect-url.py` (or extend `pull-gsc.py`) that calls `urlInspection.index:inspect` with the existing `webmasters.readonly` token; write the probe as a second stdlib-only Python script that fetches `/api/version` for the deploy SHA and `sitemap.xml` via `xml.etree.ElementTree` (namespace-aware) to cross-check `lastmod`; store the dates module as a plain object (or a companion JSON file, matching the `resolveJsonModule: true` pattern already used for the aggregates artifact) so both `app/sitemap.ts` and the Python probe can read the same literal dates without cross-language coupling.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Contextual internal links (marketing pages, report, guides) | Frontend Server (SSR) — static JSX in App Router page/component files | — | All target pages are statically rendered React Server Components; links are literal `<a>`/`<Link>` elements in existing prose, not client state |
| Sitemap `lastmod` accuracy | Frontend Server (SSR) — `app/sitemap.ts` (a Next.js metadata route, cached at build time) | Database / Storage — the dates module is a committed source file, not a query | The sitemap route runs server-side at build/request time depending on caching; its data source must be a static, version-controlled module, not a runtime DB read |
| GSC URL Inspection / recrawl requests | External API / Backend (Google Search Console REST API) | CDN / Static — the probe validates what the CDN actually serves before inspection is requested | Inspection is a Google-hosted service reached via OAuth from a local script; it is explicitly decoupled from the app's own deploy pipeline |
| Deploy-SHA verification | Frontend Server (SSR) — `app/api/version/route.ts` reads `process.env.VERCEL_GIT_COMMIT_SHA` at request time | CDN / Static — Vercel's edge serves the response with `Cache-Control: no-store` | Already implemented for stale-bundle detection; reusable as-is for the probe's deploy-SHA column |
| Recrawl log / probe script | Database / Storage — committed CSV or Markdown file under version control, not a live datastore | — | Matches the existing `ai-answer-log.csv` append-only pattern; no database involved |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js `MetadataRoute.Sitemap` (built-in, no install) | Next.js 16.2.12 (repo-pinned) `[VERIFIED: package.json:63]` | `app/sitemap.ts` default export contract | Already in use; `lastModified` accepts `string \| Date` `[CITED: nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap]` |
| Python 3 stdlib (`urllib`, `json`, `argparse`, `csv`, `xml.etree.ElementTree`, `http.server`) | System Python 3 (no version pin in repo; matches `scripts/analytics/*.py` which declare "stdlib only") | GSC API calls, probe script, recrawl log writer | Every existing script in `scripts/analytics/` is stdlib-only by explicit design (`pull-gsc.py`, `gsc-auth.py`, `log-ai-answer.py` docstrings all say "stdlib only — no node, no google client libraries") `[VERIFIED: scripts/analytics/pull-gsc.py:1-24, scripts/analytics/gsc-auth.py:1-20]` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest 4.1.0 `[VERIFIED: package.json]` | existing | Blog-date/dates-module parity test (D-09), extends `app/__tests__/sitemap.test.ts` | Already the repo's only test runner; no alternative needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Stdlib-only Python probe | `requests` / `google-api-python-client` | Would be the first non-stdlib dependency in `scripts/analytics/`; breaks the established convention and adds a Package Legitimacy Gate obligation for zero functional gain (stdlib already handles HTTP + OAuth token exchange, as `pull-gsc.py` proves) |
| Python probe script | Vitest-driven `fetch()` probe (explicitly allowed by CONTEXT.md discretion) | Viable if the team prefers TS; would still need to read `sitemap.xml` and parse HTML, which Vitest/Node can do with the built-in `fetch` + a small regex or `DOMParser` polyfill, but loses the `scripts/analytics/` sibling-script convention (no OAuth reuse from `pull-gsc.py`) |

**Installation:** None required — this phase installs no new packages. See Package Legitimacy Audit below.

**Version verification:** No new packages are introduced; the Next.js and Vitest versions above were confirmed by reading `package.json` directly (`next": "^16.2.12"`, and `npx next --version` returning `Next.js v16.2.12`) rather than by running a registry lookup, since nothing is being installed or upgraded.

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.** The probe script, the GSC URL Inspection call, and the dates module all use stdlib Python and already-installed Next.js/Vitest APIs. This mirrors Phase 4's own recorded disposition: `04-01-PLAN.md`/`04-03-PLAN.md`/`04-05-PLAN.md` each state "RESEARCH.md records the Package Legitimacy Audit as not applicable because this phase installs no packages. If any install becomes necessary, the package-legitimacy gate plus a blocking-human checkpoint applies before it runs." `[VERIFIED: .planning/phases/04-verified-guild-case-study/04-01-PLAN.md:277]` The same rule should carry forward: if the planner later decides the probe needs a third-party library, gate that specific install behind a `checkpoint:human-verify` task and run the Package Legitimacy Gate at that time.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                     ┌─────────────────────────────────────────┐
                     │   Deploy 1: push pending Phase 2-4       │
                     │   commits to origin/main (D-13)          │
                     │   -> Vercel builds & deploys production  │
                     └───────────────────┬───────────────────────┘
                                          │
                                          v
        ┌──────────────────────────────────────────────────────────┐
        │  Content sign-off (D-05): executor drafts link table      │
        │  (page, sentence, anchor, target) -> single user approval │
        └───────────────────────────┬──────────────────────────────┘
                                     │ approved
                                     v
        ┌──────────────────────────────────────────────────────────┐
        │  Deploy 2: dates module + link edits, one atomic commit   │
        │  - lib/content-dates.ts (or similar) becomes the sitemap's│
        │    single source (D-09)                                  │
        │  - app/sitemap.ts reads dates module, no new Date()       │
        │  - marketing pages / report / guides get contextual links │
        │  -> push to origin/main -> Vercel builds & deploys        │
        └───────────────────────────┬──────────────────────────────┘
                                     │ production live
                                     v
        ┌──────────────────────────────────────────────────────────┐
        │  Probe script (D-14): fetch each changed URL from prod    │
        │   - GET /api/version -> deploy SHA                        │
        │   - GET <url> -> 200, self-canonical <link>, no noindex,  │
        │     new anchor text present                                │
        │   - GET /sitemap.xml -> parse <lastmod>, compare to        │
        │     dates module value                                    │
        └───────────────────────────┬──────────────────────────────┘
                                     │ all probes pass
                                     v
        ┌──────────────────────────────────────────────────────────┐
        │  GSC URL Inspection (D-14): OAuth token via                │
        │  scripts/analytics/pull-gsc.py-style refresh-token flow    │
        │  -> POST urlInspection/index:inspect per URL (read scope)  │
        │  -> confirms googleCanonical/verdict/indexingState          │
        └───────────────────────────┬──────────────────────────────┘
                                     │ inspection confirms rendered state
                                     v
        ┌──────────────────────────────────────────────────────────┐
        │  checkpoint:human-verify (D-16): user manually clicks       │
        │  "Request indexing" once per URL in the GSC UI (no API),    │
        │  resubmits sitemap once in the same session                 │
        │  -> executor appends dates to RECRAWL-LOG, commits          │
        └──────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
lib/
├── content-dates.ts          # D-09 single source; exported as a plain object or
│                              # re-exported from a companion JSON file so the
│                              # Python probe can read the same literal dates
app/
├── sitemap.ts                 # reads content-dates.ts, no `new Date()` anywhere
├── __tests__/
│   └── sitemap.test.ts        # extend with dates-module parity + "no new Date()" assertions
scripts/analytics/
├── inspect-url.py             # (new) urlInspection.index:inspect, reuses pull-gsc.py's
│                              # get_access_token()/query() shape
├── probe-recrawl-urls.py      # (new) fetches each URL + sitemap.xml, asserts D-14's checks
├── RECRAWL-LOG.md (or .csv)   # (new) D-15's single append-only record, mirrors
│                              # ai-answer-log.csv's header-row + append-only convention
```

### Pattern 1: Index-splitting an approved string to inject a link without changing its bytes
**What:** The report and case-study pages already convert a substring of an `APPROVED_STRINGS` value (the word "Zev" in the byline) into a `<a href="/about">` anchor by locating the substring's index and rendering three pieces (`before`, `<a>substring</a>`, `after`) instead of editing the approved string itself.
**When to use:** Any time D-04/D-06 calls for turning existing approved copy into a link (not for brand-new connective sentences, which are simpler — just add a new `<p>`).
**Example:**
```typescript
// Source: app/research/wow-classic-loot-systems-2026/page.tsx:225-244 (read this session)
const BYLINE_ZEV_INDEX = PAGE_BYLINE.indexOf('Zev')
if (BYLINE_ZEV_INDEX === -1) {
  throw new Error('page.byline no longer contains "Zev"; the /about link binding broke')
}
const BYLINE_BEFORE_ZEV = PAGE_BYLINE.slice(0, BYLINE_ZEV_INDEX)
const BYLINE_AFTER_ZEV = PAGE_BYLINE.slice(BYLINE_ZEV_INDEX + 'Zev'.length)
// ...rendered as: {BYLINE_BEFORE_ZEV}<a href="/about">Zev</a>{BYLINE_AFTER_ZEV}
```
This pattern is reused for `methodology.reproduce`'s GitHub URL (`REPRODUCE_BEFORE`/`REPRODUCE_AFTER`, same file, lines 236-249). It keeps `container.textContent` byte-identical to the approved string while adding a real `<a>`.

### Pattern 2: New connective text lives outside the prose wrapper, as a plain sibling `<div>`/`<p>`
**What:** The report page's contextual CTA is rendered as a sibling `<div>` after the `.prose` wrapper closes, not nested inside it, specifically because the wrapper's `[&_a]:text-accent [&_a]:underline` rule is wrong for a filled button `[VERIFIED: app/research/wow-classic-loot-systems-2026/page.tsx:527-534]` (comment quotes: "rendered as a sibling outside the prose wrapper above, not nested inside it").
**When to use:** For D-04's new /compare and /pricing connective sentences on the report page — add them as a new `<p>` sibling near the existing CTA block (not a new `<h2>` section, which would break the `h2s.toHaveLength(aggregates.findings.length + 2)` assertion in `app/research/.../__tests__/page.test.tsx`).

### Pattern 3: Approved-copy resolution is a small hash map + template-token resolver
**What:** `APPROVED_STRINGS: Record<string, string>` + a `resolveTokens()`/`approved()` pair that throws loudly (`Missing approved string for key "..."`) rather than silently rendering `undefined`.
**When to use:** Not directly needed for Phase 5's new links (they are net-new plain text, not tokenized against a data artifact), but the copy-parity **test** convention that byte-matches against this map is the gate any new report-page string must pass through without disturbing.

### Anti-Patterns to Avoid
- **Adding a shared "Related evidence" component to marketing pages:** D-01 explicitly forbids this; `BlogRelatedPosts` stays blog-only. Links must be inline in existing prose sentences.
- **Editing an `APPROVED_STRINGS` value to insert a link:** Any edit to a string in `APPROVED_STRINGS` that doesn't match the byte-matched value in `03-COPY-DRAFT.md`/`04-COPY-DRAFT.md` breaks the parity test and requires a fresh sign-off round (D-04's costly-reversibility note).
- **Trusting `03-COPY-DRAFT.md`'s literal text for `page.read-time`:** the file still shows `page.read-time = 6 min read`, but the shipped page and its test both use `7 min read`, recalculated per the G4 action item and documented inline in `page.tsx`'s comment `[VERIFIED: app/research/wow-classic-loot-systems-2026/page.tsx:71-76, __tests__/page.test.tsx: 'page.read-time': '7 min read']`. Treat the rendered page + its test as the source of truth for "what's actually approved," not a stale literal in the `.md` file.
- **Using `new Date()` anywhere in `app/sitemap.ts`:** see Pitfall 1 below — it doesn't do what it looks like it does on a cached Next.js route.
- **Calling the Indexing API for these page types:** it is scoped to `JobPosting`/`BroadcastEvent`-in-`VideoObject` pages only; submitting a marketing/report/blog URL is outside its documented contract and provides no crawl-priority benefit `[CITED: developers.google.com/search/apis/indexing-api overview, cross-checked via WebSearch against multiple third-party summaries of the official restriction]`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth token refresh for the GSC API | A second OAuth client/refresh-token flow | `scripts/analytics/pull-gsc.py`'s existing `get_access_token(cid, secret, refresh)` function, called with the same `.env.local` values `gsc-auth.py` already wrote | One refresh token, one scope (`webmasters.readonly`), already verified working (STATE.md: "token re-minted 2026-08-28, so no 7-day expiry") `[VERIFIED: .planning/STATE.md:136]` |
| Sitemap XML parsing | A hand-rolled regex over raw XML text | `xml.etree.ElementTree`, namespace-aware (`{http://www.sitemaps.org/schemas/sitemap/0.9}url`) | The sitemap's `<urlset>` default namespace makes naive tag-name matching silently return zero elements; ElementTree's namespace dict handles this correctly and is stdlib |
| Deploy verification | Parsing `x-vercel-id` response headers or shelling out to the `vercel` CLI | The already-committed `GET /api/version` endpoint, which returns `{ buildId }` sourced from `VERCEL_GIT_COMMIT_SHA` (sliced to 8 chars), falling back to `VERCEL_DEPLOYMENT_ID` then `NEXT_BUILD_ID` then `'dev'` `[VERIFIED: app/api/version/route.ts:1-16, quoted below]` | Purpose-built for exactly this need ("client checks this on navigation to detect stale bundles after a new deploy"); reusing it avoids guessing at undocumented Vercel header formats and needs no new auth |

**Key insight:** Every tool this phase needs already exists in the repo in some form — an OAuth flow, a stdlib HTTP pattern, a deploy-SHA endpoint, an append-only CSV-log convention, and a copy-sign-off table format. The planning risk in this phase is almost entirely about **sequencing and byte-level copy discipline** (don't break the parity tests, don't request recrawl before the final deploy, don't submit a URL twice), not about missing tooling.

`app/api/version/route.ts`, verbatim (read this session):
```typescript
import { NextResponse } from 'next/server'

// Returns the current deployment's build ID.
// The client checks this on navigation to detect stale bundles after a new deploy.
export function GET() {
  const buildId = process.env.NEXT_BUILD_ID
    || process.env.VERCEL_DEPLOYMENT_ID
    || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8)
    || 'dev'

  return NextResponse.json(
    { buildId },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  )
}
```
This route is NOT gated by the auth middleware: `proxy.ts` explicitly excludes any path starting with `/api` from the public/protected auth-gate branch (`if (!pathname.startsWith('/api') && !pathname.startsWith('/auth')) { ... }`, so `/api` routes fall through to their own per-route auth handling — and `/api/version` has none) `[VERIFIED: proxy.ts:284-326, quoted: "// Page navigations (not API/auth routes — those have their own auth checks)\n  if (!pathname.startsWith('/api') && !pathname.startsWith('/auth')) {"]`.

## Common Pitfalls

### Pitfall 1: `new Date()` inside `app/sitemap.ts` does not mean "the current moment," it means "whenever this route was last built"
**What goes wrong:** A sitemap entry with `lastModified: new Date()` looks like it produces a fresh timestamp on every crawl, but Next.js documents that `sitemap.js is a special Route Handler that is cached by default unless it uses a Request-time API or dynamic config option` `[CITED: nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap]`. `sitemap()` in this repo calls no request-time API (no `cookies()`, `headers()`, dynamic params), so on Vercel it is statically generated at build time and the three `new Date()` calls (homepage, `/blog`, `/changelog`) freeze at deploy time, then stay frozen until the next deploy — which could be days or weeks later, silently understating page age or, worse, making an unchanged page look freshly modified on every redeploy for unrelated reasons.
**Why it happens:** `new Date()` reads correctly as "now" in a local dev server (which re-evaluates the module on every request) and in unit tests, so the staleness only shows up in production, which is exactly the environment the phase can't easily re-test without a real deploy.
**How to avoid:** D-09 already mandates removing `new Date()` from the sitemap entirely — this finding is the technical justification, not just a style preference. Every entry's `lastModified` must be a literal (`Date` object or ISO string — both are accepted per the `Sitemap` type: `lastModified?: string | Date` `[CITED: nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap "## Returns"]`) sourced from the dates module.
**Warning signs:** A `sitemap.test.ts` assertion like the existing `'gives the report entry a literal, non-drifting lastModified date'` test (`app/__tests__/sitemap.test.ts`, calls `sitemap()` twice and asserts the same `getTime()`) is exactly the guard to extend to every entry, not just the report's.

### Pitfall 2: The report page's copy-parity test is substring-based, but its heading-count test is exact — new sections must not add an `<h2>`
**What goes wrong:** `container.textContent.toContain(...)` assertions tolerate extra text anywhere, but `h2s.toHaveLength(aggregates.findings.length + 2)` (methodology + downloads) `[VERIFIED: app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx: "expect(h2s).toHaveLength(aggregates.findings.length + 2)"]` will fail the moment a D-04 connective paragraph is wrapped in its own `<h2>` section.
**Why it happens:** It's tempting to give a new "See how this compares" blurb its own heading for visual weight; the test was written before this phase existed and has no way to know a new section is "supposed" to be headingless.
**How to avoid:** Add D-04's new /compare and /pricing sentences as plain `<p>` text near the existing CTA block (Pattern 2 above), never as a new `<h2>...</h2>` pair.
**Warning signs:** Run `npx vitest run app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` after any report-page edit — it currently passes cleanly (97/97 across the three suites checked this session) and any new failure here is the direct signal.

### Pitfall 3: The report and case-study pages inject JSON-LD via `dangerouslySetInnerHTML` with no `<` escaping — this phase touches the report page, so the open Phase 4 security item applies here too
**What goes wrong:** `04-SECURITY.md` records T-04-CR1 (medium, open) against the case-study page's JSON-LD block and explicitly states "The research report page shares the JSON-LD pattern and should receive the same wrapper" `[VERIFIED: .planning/phases/04-verified-guild-case-study/04-SECURITY.md:54,61]`. Phase 5 does not introduce this risk, but if the planner decides (per the CONTEXT.md discretion item) to ride the fix along in deploy two, `app/research/wow-classic-loot-systems-2026/page.tsx:378-385` (`dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}`) is the exact block that needs the same `<`-escaping wrapper the remediation note recommends for the case-study page.
**Why it happens:** `JSON.stringify` does not escape `<`, so a `</script` substring inside any JSON-LD string value would prematurely close the script tag; today's risk is theoretical (all JSON-LD values are committed source, not request input) but becomes real the moment any string in `jsonLd` is user- or interview-sourced.
**How to avoid:** Not a blocking requirement for Phase 5 (severity is medium, non-blocking per the recorded threat), but worth a one-line note in the plan's discretion section since the CONTEXT.md explicitly leaves the "ride along in deploy two" decision open.

### Pitfall 4: A Python probe script cannot `import` a TypeScript dates module directly
**What goes wrong:** If `lib/content-dates.ts` (D-09) is authored as a plain `.ts` module exporting a typed object, the stdlib-only Python probe (D-14) has no way to read its values without either a build step or a duplicated literal — which reintroduces the exact "four-way duplication" D-09 is meant to eliminate.
**Why it happens:** The two halves of this phase (sitemap correctness in TS, recrawl verification in Python) are naturally written in different languages, and there is no existing cross-language bridge in this repo for content data (the closest precedent, `public/research/wow-classic-loot-systems-2026-aggregates.json`, is imported by TS via `resolveJsonModule: true` `[VERIFIED: tsconfig.json:12, "\"resolveJsonModule\": true,"]` but is never read by a Python script).
**How to avoid:** Make the dates module's actual data a plain JSON file (e.g. `data/content-dates.json`) that `app/sitemap.ts` imports the same way `page.tsx` already imports the aggregates artifact, and that the Python probe reads with `json.load()`. A thin `lib/content-dates.ts` can still exist as a typed wrapper (`import dates from '@/data/content-dates.json'` + helper functions like `latestBlogDate()`), but the single source of truth stays JSON so both languages read the identical file with no derivation logic duplicated on either side.
**Warning signs:** If the probe script ends up hand-typing the expected lastmod dates as Python literals, that is the duplication D-09 was written to prevent — the moment those two literal sets diverge, the probe will pass while the sitemap is wrong (or vice versa), silently.

### Pitfall 5: Recrawl requests must wait for deploy two, not deploy one
**What goes wrong:** Deploy one (baseline, D-13) makes the report page live but does not include the link sweep or corrected `lastmod` values. Requesting recrawl after deploy one spends the one-shot budget on a URL state that is about to change again.
**Why it happens:** Deploy one is itself exciting progress ("the report is finally live!") and the temptation to immediately ask Google to look is strong, especially since GSC URL Inspection is available the moment the property is verified.
**How to avoid:** D-13 explicitly forbids this; the plan's task ordering must gate the URL Inspection / recrawl checkpoint behind deploy two's completion, not deploy one's. The probe script (D-14) itself is a natural gate: it can only pass once the link sweep and dates module are live, which structurally prevents an early recrawl if the plan requires "probe passes" before "checkpoint:human-verify."

### Pitfall 6: Local `npm run lint` currently fails with a config-resolution error unrelated to this phase's content
**What goes wrong:** Running `npm run lint` in this environment produces `ESLint: 9.39.2 ... A configuration object specifies rule "react-hooks/purity", but could not find plugin "react-hooks"` and exits before linting a single file `[VERIFIED: command run this session, "npm run lint 2>&1"]`.
**Why it happens:** `eslint.config.mjs` was last modified 2026-06-25 (commit `b807e2f`), which predates the fork point between `origin/main` and local `main` (`git merge-base origin/main HEAD` = `b4c56e6`, an ancestor of that commit) `[VERIFIED: git log -1 --format='%H %ci' -- eslint.config.mjs → b807e2f 2026-06-25; git merge-base origin/main HEAD → b4c56e62ae7e6fdb0fe6f0712836f2025cfb7842]`, so this is a pre-existing local-environment issue (likely a stale/partial `node_modules`, since `eslint-plugin-react-hooks@7.0.1` does resolve via `require.resolve` from the repo root), not a regression introduced by any pending Phase 2–4 or Phase 5 commit. CI (`.github/workflows/ci.yml`) runs `npm ci` fresh before `npm run lint` on every push to `main` `[VERIFIED: .github/workflows/ci.yml, steps: "run: npm ci" then "run: npm run lint"]`, so this is very unlikely to reproduce there.
**How to avoid:** Before trusting a local `npm run lint` result as a pre-push gate (per the CONTEXT.md discretion item on pre-push checks), run `npm ci` first to rule out a stale local install. Do not treat this failure as a Phase 5 code defect.
**Warning signs:** The exact error string above, occurring before any file is linted (a global config-resolution failure, not a per-file rule violation).

## Code Examples

### Verified GSC OAuth token exchange + query pattern (reusable for URL Inspection)
```python
# Source: scripts/analytics/pull-gsc.py:41-55 (read this session)
def get_access_token(cid, secret, refresh):
    data = urllib.parse.urlencode({
        "client_id": cid,
        "client_secret": secret,
        "refresh_token": refresh,
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["access_token"]
```
For URL Inspection, the same `token` is passed as a Bearer header to `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` with body `{"inspectionUrl": "<url>", "siteUrl": "sc-domain:getlootlist.com"}` (site URL already stored as `GSC_SITE_URL` in `.env.local` per `gsc-auth.py`'s `DEFAULT_SITE_URL` `[VERIFIED: scripts/analytics/gsc-auth.py:29, 'DEFAULT_SITE_URL = "sc-domain:getlootlist.com"']`). `[CITED: developers.google.com/webmaster-tools/v1/urlInspection.index/inspect — "POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"]`

### GSC URL Inspection: exact request/response contract
```
POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
Authorization: Bearer <token>
Content-Type: application/json

{
  "inspectionUrl": "https://www.getlootlist.com/research/wow-classic-loot-systems-2026",
  "siteUrl": "sc-domain:getlootlist.com",
  "languageCode": "en-US"
}
```
Response (`inspectionResult.indexStatusResult`):
```json
{
  "sitemap": ["string"],
  "referringUrls": ["string"],
  "verdict": "PASS | PARTIAL | FAIL | NEUTRAL | VERDICT_UNSPECIFIED",
  "coverageState": "string",
  "robotsTxtState": "ALLOWED | DISALLOWED | ROBOTS_TXT_STATE_UNSPECIFIED",
  "indexingState": "INDEXING_ALLOWED | BLOCKED_BY_META_TAG | BLOCKED_BY_HTTP_HEADER | BLOCKED_BY_ROBOTS_TXT | INDEXING_STATE_UNSPECIFIED",
  "lastCrawlTime": "RFC3339 UTC string",
  "pageFetchState": "SUCCESSFUL | SOFT_404 | BLOCKED_ROBOTS_TXT | NOT_FOUND | ACCESS_DENIED | SERVER_ERROR | REDIRECT_ERROR | ACCESS_FORBIDDEN | BLOCKED_4XX | INTERNAL_CRAWL_ERROR | INVALID_URL | PAGE_FETCH_STATE_UNSPECIFIED",
  "googleCanonical": "string",
  "userCanonical": "string",
  "crawledAs": "DESKTOP | MOBILE | CRAWLING_USER_AGENT_UNSPECIFIED"
}
```
`[CITED: developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult — field names and enum values reproduced verbatim from the official schema page]`. D-14's "Google's render shows the canonical and main content" check maps to: `verdict === "PASS"`, `googleCanonical === userCanonical === <the page's own canonical URL>`, `indexingState === "INDEXING_ALLOWED"`, `pageFetchState === "SUCCESSFUL"`, `robotsTxtState === "ALLOWED"`.

**Authorization scopes** (verbatim from the official page): "Requires one of the following OAuth scopes: `https://www.googleapis.com/auth/webmasters` [or] `https://www.googleapis.com/auth/webmasters.readonly`" `[CITED: developers.google.com/webmaster-tools/v1/urlInspection.index/inspect, "Authorization Scopes" section]` — the existing token (scope `webmasters.readonly`, confirmed by reading `gsc-auth.py`'s `SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"` `[VERIFIED: scripts/analytics/gsc-auth.py:28]`) is sufficient. No re-authorization is needed for the inspection half of D-14.

**Quota:** 2,000 requests/day and 600 requests/minute per verified site property; 10,000,000/day and 15,000/minute per Cloud project `[CITED: developers.google.com/webmaster-tools/limits]`. Phase 5's URL count (a handful of marketing pages, the report, and topic-matched guides — well under a few dozen) is nowhere near this ceiling; no throttling logic is needed in the probe/inspect script.

### Sitemap resubmission needs the WRITE scope — confirms D-16's manual choice
`sitemaps.submit` is `PUT https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}`, and requires the `https://www.googleapis.com/auth/webmasters` scope (write-enabled), not `.readonly` `[CITED: developers.google.com/webmaster-tools/v1/sitemaps/submit]`. Since the repo's stored refresh token only carries `webmasters.readonly` `[VERIFIED: scripts/analytics/gsc-auth.py:28]`, an automated `sitemaps.submit` call would fail authorization today — this independently confirms D-16's decision to resubmit the sitemap manually in the GSC UI rather than build an API call, without needing to re-run the OAuth consent flow with a broader scope just for this one-time action.

### Indexing API is explicitly out of scope for these page types
The Indexing API "can only be used to crawl pages with either JobPosting or BroadcastEvent embedded in a VideoObject... submitting other page types is outside the documented scope" `[CITED: multiple third-party summaries of developers.google.com/search/apis/indexing-api, cross-checked via WebSearch — no marketing/report/blog page qualifies]`. None of Phase 5's URLs (homepage, /compare, /pricing, /about, the report, blog guides) carry either schema type, so the Indexing API is not a viable substitute for URL Inspection + manual "Request indexing," consistent with D-16.

### Sitemap parsing: use a namespace-aware stdlib parser, not a bare tag-name match
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
A bare `root.findall("url")` (no namespace prefix) silently returns an empty list against the actual `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` document Next.js emits, because ElementTree treats the default namespace as part of every child tag's fully-qualified name.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `lastModified: new Date()` treated as "always fresh" | Literal, module-sourced `lastModified` per D-09 | This phase | Sitemap `lastmod` becomes trustworthy evidence of actual content change instead of an artifact of build cadence |
| Manual per-URL recrawl table embedded in each publish runbook (Phase 4's original step 5) | Single append-only `RECRAWL-LOG` in `scripts/analytics/`, referenced by pointer from every runbook (D-15) | This phase | Prevents the exact failure mode D-15 names: "nobody reading this runbook after the fact mistakes an already-submitted URL for one still needing a request" |
| OAuth Playground manual token minting (Phase 1's original setup) | `scripts/analytics/gsc-auth.py`'s local-loopback OAuth helper | Phase 1 (2026-08-28, per STATE.md) | Already resolved before Phase 5 begins; reuse it, don't reinvent it |

**Deprecated/outdated:**
- Nothing in this phase's domain has been formally deprecated; the main "old approach" being corrected is this repo's own pre-Phase-5 sitemap code (`new Date()`), not an industry-wide pattern change.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Indexing API's JobPosting/BroadcastEvent-only restriction, as summarized by third-party sources, accurately reflects Google's current official documentation (the primary `developers.google.com/search/apis/indexing-api` page itself was not directly fetched and quoted in this session — only cross-checked via WebSearch summaries of it) | "Anti-Patterns to Avoid," "Code Examples" | Low — this is well-established, widely-cited public information and D-16 already independently reaches the same conclusion (no API for general "Request indexing"); if wrong, the only consequence is a missed optional recrawl-acceleration path, not an incorrect published claim |
| A2 | System Python 3 (unversioned) is available in the environment that will run the probe/inspect scripts, matching the existing `scripts/analytics/*.py` convention with no `requirements.txt` | "Standard Stack," Environment Availability | Low-medium — if Python 3 is missing from the deploy/CI environment (it is not currently run in `ci.yml`, only locally), the probe becomes a manual-run tool rather than an automated gate; recommend the plan verify `python3 --version` early as a Wave 0 step |

**If this table is empty:** N/A — see entries above.

## Open Questions

1. **Exact final shape of the dates module (JSON vs. TS-only)**
   - What we know: `resolveJsonModule: true` is enabled and already proven with the aggregates artifact; a JSON companion file solves the Python-probe cross-check cleanly (Pitfall 4).
   - What's unclear: Whether the planner wants the dates module to also carry derivation *logic* (e.g., "latest of these N posts") in TypeScript, which a plain JSON file can't express — likely resolved by pairing a `data/content-dates.json` (literal values) with a `lib/content-dates.ts` (typed accessor + `/blog` and `/changelog` derivation helpers), per D-12.
   - Recommendation: Plan for both files; JSON is the source of truth for individual page dates, TS wraps it with the two derived (`/blog`, `/changelog`) helpers.

2. **Exact topic-matched guide subset (D-03) and exact per-page anchor sentences (D-05/D-06)**
   - What we know: This is explicitly executor discretion, resolved at the D-05 sign-off checkpoint, not at research time. Candidate natural slots were identified in code (e.g., `/compare`'s Q4/Q8 answers already discuss attendance-weighting and bad-luck protection in almost the same language as the report's findings; `LandingLootDecision`'s caption "Every candidate's list rank, attendance, and bad-luck protection roll into one Loot Score" is the "homepage loot-decision section" D-01 names).
   - What's unclear: The final wording, which requires user sign-off per D-05 and is out of scope for research.
   - Recommendation: The planner should draft the sign-off table referencing the specific slots below (see "Marketing-Page Link Surfaces") but must not pre-approve wording — that is a plan-time/execute-time checkpoint, not a research-time decision.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3 | Probe script, GSC Inspection call | ✓ (used by all existing `scripts/analytics/*.py`) | Unversioned in repo; `pull-gsc.py`/`gsc-auth.py` run stdlib-only | — |
| Existing GSC OAuth refresh token | GSC Inspection call | ✓ | Scope `webmasters.readonly`, re-minted 2026-08-28, no 7-day expiry `[VERIFIED: .planning/STATE.md:136]` | — |
| Node.js 20 / npm | `app/sitemap.ts`, dates-module TS, Vitest tests | ✓ | Node 20 per CLAUDE.md; `npx next --version` returned `Next.js v16.2.12` this session | — |
| `npm run typecheck` | Pre-push verification | ✓ passes clean (`tsc --noEmit`, no output, verified this session) | — | — |
| `npm run lint` | Pre-push verification | ✗ locally (config-resolution error, Pitfall 6) | ESLint 9.39.2 | Run `npm ci` first; CI runs it fresh on every push and is the authoritative gate, not the local run |
| `npm test` (Vitest) | Pre-push verification, dates-module parity test | ✓ — 97/97 passed across `sitemap.test.ts`, report page test, case-study page test this session | Vitest 4.1.0 | — |
| Git remote / personal-account guard | Both deploys (D-13) | ✓ — `.git/hooks/pre-push` and `pre-commit` both active, block work-account identities and non-personal remotes `[VERIFIED: .git/hooks/pre-push, .git/hooks/pre-commit, read this session]` | — | — |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** `npm run lint` locally (fallback: trust CI's clean-install run, or run `npm ci` locally first).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0, jsdom environment `[VERIFIED: vitest.config.ts]` |
| Config file | `vitest.config.ts` (globals enabled, `@/` alias, `./vitest.setup.ts` setup file) |
| Quick run command | `npx vitest run app/__tests__/sitemap.test.ts` |
| Full suite command | `npm test` (= `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LINK-01 | Homepage/Compare/Pricing/About/guides render the new contextual link with correct anchor text and href | unit (RTL render + `getByRole('link', {name: ...})`) | `npx vitest run <new test file per changed page>` | ❌ Wave 0 — no test currently asserts marketing-page link content; new tests needed per changed page, following the `page.test.tsx` conventions already used for report/case-study |
| LINK-01 | Report page gains connective /compare and /pricing links without breaking existing copy-parity or heading-count assertions | unit (existing suite, extended) | `npx vitest run app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` | ✅ exists; extend, don't replace |
| LINK-01 | Blog guides (D-03 subset) gain the report link | unit (per-guide `page.test.tsx`, if one exists — otherwise a new smoke test) | `npx vitest run app/blog/<slug>/__tests__/page.test.tsx` | ❌ Wave 0 — none of the 9 blog post directories currently have a `__tests__` subfolder (confirmed absent via directory listing this session); the planner should decide whether to add a lightweight link-presence test per guide or a single parameterized test over the D-03 subset |
| LINK-02 | Sitemap contains every entry with a literal (non-`new Date()`) `lastModified`, sourced from the dates module | unit | `npx vitest run app/__tests__/sitemap.test.ts` | ✅ exists (extend with "no `new Date()` anywhere in sitemap.ts" and "every entry's lastModified matches the dates module" assertions) |
| LINK-02 | Blog post `dateModified` (JSON-LD) matches the dates module | unit | `npx vitest run <new dates-module parity test>` | ❌ Wave 0 — new test, per D-09 |
| LINK-02 | Every changed production URL returns 200, self-canonical, no noindex, contains the new anchor, and its sitemap `lastmod` matches the dates module | integration / probe (not Vitest — a standalone script against production) | `python3 scripts/analytics/probe-recrawl-urls.py` (new) | ❌ Wave 0 — script does not exist yet |
| LINK-02 | GSC URL Inspection confirms canonical/indexing/fetch state per URL | manual-assisted script + human review | `python3 scripts/analytics/inspect-url.py <url>` (new), output reviewed by user before the D-16 checkpoint | ❌ Wave 0 — script does not exist yet |
| LINK-02 | Exactly one recrawl request per URL, recorded | manual-only (D-16, no API) | N/A — human action in GSC UI, recorded via `checkpoint:human-verify` | ❌ Wave 0 — `RECRAWL-LOG` does not exist yet |

### Sampling Rate
- **Per task commit:** `npx vitest run app/__tests__/sitemap.test.ts app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` plus any newly-added test file for the task's specific page
- **Per wave merge:** `npm test` (full suite) — currently 97+ tests pass across the three files checked this session; the planner should confirm the full count via `npm test` once new tests are added
- **Phase gate:** Full suite green (`npm test`, `npm run typecheck`) before the probe script runs against production; probe script green before the D-16 human checkpoint; human checkpoint confirmed before `RECRAWL-LOG` is committed

### Wave 0 Gaps
- [ ] `scripts/analytics/probe-recrawl-urls.py` — new, covers LINK-02's "probe passed" requirement (D-14)
- [ ] `scripts/analytics/inspect-url.py` (or extend `pull-gsc.py`) — new, covers LINK-02's GSC Inspection call (D-14)
- [ ] `scripts/analytics/RECRAWL-LOG.md` or `.csv` — new, covers D-15 (create with header row only, following `ai-answer-log.csv`'s convention, before the first append)
- [ ] `data/content-dates.json` + `lib/content-dates.ts` — new, covers D-09
- [ ] Per-changed-marketing-page test coverage (compare/pricing/about/homepage components) for the new link's anchor text and href — none of these currently have a `__tests__` directory; the planner should decide the minimum bar (a full RTL render test per page vs. a lighter smoke assertion)
- [ ] Blog-date JSON-LD parity test — new, covers D-09's "test cross-checks each blog post's JSON-LD `dateModified` against the module"

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | This phase adds no auth surface; the GSC OAuth flow is pre-existing and unchanged |
| V3 Session Management | no | N/A |
| V4 Access Control | no | No new access-controlled resource; `/api/version` is intentionally public (no sensitive data — a build ID) |
| V5 Input Validation | low relevance | The probe script's inputs are a hardcoded URL list (from the D-05 sign-off table), not user input; no injection surface. The GSC Inspection call's `inspectionUrl`/`siteUrl` are also from the same hardcoded, committed list |
| V6 Cryptography | no | No new cryptographic operation; OAuth token exchange over HTTPS is pre-existing (`gsc-auth.py`/`pull-gsc.py`), unchanged by this phase |
| V14 Configuration | yes | Sitemap and robots configuration integrity: the sitemap route must not accidentally list a non-canonical or `noindex` URL. Standard control: the probe script's own "self-canonical, no noindex" assertions (D-14) function as the ASVS V14 control for this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| JSON-LD script-tag injection via unescaped `<` in `dangerouslySetInnerHTML` | Tampering | Escape `<` to `<` before `JSON.stringify` output is injected; open on the report page as a carried-forward Phase 4 item (T-04-CR1), non-blocking for Phase 5 but worth folding in if deploy two touches `page.tsx` anyway (see Pitfall 3) |
| Stale/incorrect `lastmod` misleading crawlers about page freshness | Tampering (of metadata, not data) | D-09's dates-module + parity-test approach is itself the mitigation; no additional control needed |
| Committed OAuth secrets leaking via the probe/inspect scripts' logging | Information Disclosure | Follow `gsc-auth.py`'s existing discipline: "No tokens are printed" `[VERIFIED: scripts/analytics/gsc-auth.py:16]`; new scripts must not `print()` the access token, refresh token, or client secret at any point, including in error paths |
| Recrawl request submitted twice for the same URL (not a security threat, but a documented "waste the one-shot" failure mode) | — (not STRIDE, a process-integrity concern) | D-15's append-only log with a `requester`/`request date` column, checked before each submission per D-16, is the control |

## Sources

### Primary (HIGH confidence)
- `app/sitemap.ts`, `app/__tests__/sitemap.test.ts` — read directly this session
- `app/research/wow-classic-loot-systems-2026/page.tsx` and its `__tests__/page.test.tsx` — read directly, ran tests this session (97 passed)
- `app/customers/[slug]/page.tsx` and its `__tests__/page.test.tsx` — read directly, ran tests this session
- `app/api/version/route.ts` — read directly this session
- `proxy.ts` — read directly this session (auth-gate scoping)
- `app/layout.tsx` — read directly this session (site-wide robots default)
- `lib/public-routes.ts` — read directly this session
- `scripts/analytics/pull-gsc.py`, `scripts/analytics/gsc-auth.py`, `scripts/analytics/log-ai-answer.py`, `scripts/analytics/ai-answer-log.csv`, `scripts/analytics/RUNBOOK.md` — read directly this session
- `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md`, `04-SECURITY.md`, `04-COPY-DRAFT.md` — read directly this session
- `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md` — read directly this session
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` — read directly this session (backlog row 14, schedule section, technical acceptance checklist)
- `tsconfig.json`, `vitest.config.ts`, `next.config.ts`, `.git/hooks/pre-push`, `.git/hooks/pre-commit`, `.github/workflows/ci.yml`, `eslint.config.mjs` — read directly this session
- `git log`, `git diff --stat`, `git rev-list --count`, `git merge-base` against `origin/main..main` — run directly this session
- `npm run typecheck`, `npm run lint`, `npx vitest run` — run directly this session
- [Metadata Files: sitemap.xml (Next.js official docs)](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap) — fetched directly this session
- [Method: index.inspect (Search Console API official docs)](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect) — fetched directly this session, including the verbatim Authorization Scopes quote
- [UrlInspectionResult schema (Search Console API official docs)](https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult) — fetched directly this session, full field/enum list reproduced
- [Usage Limits (Search Console API official docs)](https://developers.google.com/webmaster-tools/limits) — fetched directly this session, exact QPD/QPM figures

### Secondary (MEDIUM confidence)
- [Sitemaps: submit (Search Console API official docs)](https://developers.google.com/webmaster-tools/v1/sitemaps/submit) — fetched via WebSearch summary this session; scope requirement (`webmasters` write scope) cross-checked against the repo's own read-only token
- Indexing API JobPosting/BroadcastEvent restriction — WebSearch summary of `developers.google.com/search/apis/indexing-api`, not the primary page fetched directly this session; widely and consistently corroborated across multiple independent third-party sources in the same search

### Tertiary (LOW confidence)
- None — every claim in this document is either read directly from the codebase this session, fetched from an official Google/Next.js docs page this session, or explicitly marked `[ASSUMED]`/logged in the Assumptions table above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; every tool used is either already in the repo or a stdlib module
- Architecture: HIGH — all patterns cited from code read directly this session, with file:line provenance
- Pitfalls: HIGH — each pitfall is grounded in either an official docs quote (Next.js caching behavior, GSC scope requirements) or a direct read of the affected source file (copy-parity test internals, `04-SECURITY.md`, git history)

**Research date:** 2026-09-07
**Valid until:** 14 days (fast-moving: Google API quota/scope details and Next.js caching semantics can change between minor versions; the sprint's own Sep 24, 2026 deadline makes this window moot for this milestone regardless)
