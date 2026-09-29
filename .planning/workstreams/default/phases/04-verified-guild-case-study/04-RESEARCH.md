# Phase 4: Verified Guild Case Study - Research

**Researched:** 2026-09-06
**Domain:** Next.js App Router public marketing page (reusable content template) + copy-fidelity/consent-gating process, extending Phase 2's testimonial-verification pattern and Phase 3's page/sitemap/publish conventions
**Confidence:** HIGH for architecture/conventions (all in-repo, read this session); LOW/UNRESOLVED for content (hard-blocked on a real interview that has not happened)

## Summary

Phase 4 is really two separable deliverables wearing one roadmap entry. **EVID-04** (the template) is pure engineering: a page that renders an outcome-focused H1, a proof strip, a before/after narrative, and a credible-limitation section at `/customers/{guild-slug}`, self-canonical and sitemap-correct, following the exact conventions Phase 3 already established (metadata + JSON-LD shape, interim-`robots`-then-publish gating, approved-string copy-fidelity, contextual CTA placement) and the exact verification-line component Phase 2 already built and locked (`VerificationLine`/`TestimonialVerification` in `app/components/landing/LandingValueProps.tsx`). **EVID-05** (the content) cannot be researched into existence: the phase's own checkpoint forbids drafting or inferring the guild's name, quotes, or outcome numbers, and REQUIREMENTS.md already marks EVID-05 "Blocked (user interview)." STATE.md confirms the interview has not happened as of this research date.

The one genuine architecture decision this phase must make — and CONTEXT.md does not exist to have already made it — is how "`{guild-slug}`" becomes a real route without either (a) inventing a guild identity to prove the template renders, or (b) hard-coding the eventual real guild's slug into a folder name chosen before that guild is known. Phase 3 never faced this because it published exactly one, already-named page (`/research/wow-classic-loot-systems-2026`) with no reuse requirement. This research recommends a **Next.js dynamic segment** (`app/customers/[slug]/page.tsx` + `generateStaticParams()` sourced from a small committed case-study data file) over the static-per-page-folder convention Phase 2/3 used for blog posts and the report — see Architecture Patterns and Open Questions for the full tradeoff and why a placeholder-identity static folder is the wrong call here.

**Primary recommendation:** Ship the reusable dynamic-route template and its render/metadata/sitemap tests now, backed by a small, typed case-study data module with **zero** entries (so `generateStaticParams()` returns `[]` and no page is reachable or in the sitemap). Do not fabricate a sample guild. If the interview clears during this phase's execution, a single follow-up plan adds one data-module entry (the guild's approved content) and the sitemap/publish step; if it does not clear, EVID-04 still ships complete and EVID-05 stays honestly recorded as blocked in STATE.md, exactly as the roadmap checkpoint instructs.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Case study page render (H1, proof strip, narrative, limitation) | Frontend Server (SSR) | — | Server Component, build-time data import, no client fetch — matches `app/research/.../page.tsx` (Phase 3) exactly |
| Per-guild case-study content (quotes, numbers, slug) | Database / Storage (as a committed static data module, not a live DB) | Frontend Server | Content is a build-time artifact, not user-editable at runtime; same tier Phase 3 used for `aggregates.json` |
| Verification line (WCL link vs. verified-customer note) | Frontend Server (SSR) | — | Reuses the pure `VerificationLine`/`TestimonialVerification` discriminated union already shipped in Phase 2 — no new tier |
| Sitemap entry / canonical / robots gating | Frontend Server (SSR) | CDN / Static (search-engine-facing) | `app/sitemap.ts` and page `metadata` are both server-rendered config, same tier as Phase 3's publish step |
| Page-view / CTA-click analytics | Browser / Client | — | `BlogTracker`-style client component, same pattern as every other landing/blog page |
| Quote/number/guild-name consent record (the written approval itself) | Database / Storage (planning artifact, not shipped to the site) | — | Lives in `.planning/phases/04-.../04-COPY-DRAFT.md`-equivalent, gates what may appear in the Frontend Server tier — never itself rendered |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EVID-04 | Case study page template exists at `/customers/{guild-slug}` following the plan's format (outcome H1, proof strip, before/after, credible limitation) | Architecture Patterns (dynamic-route template), Code Examples, Standard Stack — fully unblocked, no user dependency |
| EVID-05 | Case study is published with user-approved interview content (blocked on user-conducted guild interview) | Cannot be researched into readiness. Required interview questions and quote-approval gate are documented verbatim below (from the sprint plan) for when the interview happens; the plan must not invent any answer. STATE.md already records this blocker; this research does not change that status. |
</phase_requirements>

## Standard Stack

No new packages. This phase is 100% in-repo React/Next.js/TypeScript, reusing the exact dependency set Phase 2 and Phase 3 already used for public marketing pages.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | `^16.2.12` [VERIFIED: package.json] | App Router page, `generateStaticParams`, `generateMetadata`, `MetadataRoute.Sitemap` | Already the project's framework; every prior landing/blog/report page uses these exact APIs |
| react / react-dom | 19.2.3 [VERIFIED: package.json] | Server Component rendering | Project standard |
| tailwindcss | ^3.4.19 [VERIFIED: package.json] | All page styling | Project standard, no new utility needed |
| framer-motion | ^12.29.2 [VERIFIED: package.json] | Only if the page reuses `LandingValueProps`-style animated stat/quote cards | Already used by `LandingValueProps.tsx`, `LandingCTA.tsx`, `LandingNav.tsx` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | ^4.1.0 [VERIFIED: package.json] | Render/metadata/sitemap unit tests | Same suite Phase 3 used for `page.test.tsx` and `sitemap.test.ts` |
| @testing-library/react | ^16.3.2 [VERIFIED: package.json] | Component render assertions | Same convention as `app/research/.../__tests__/page.test.tsx` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| One dynamic `[slug]` route + data module | One static folder per guild (Phase 2/3 blog/report convention) | Static-per-guild is simpler for exactly one guild today, but fails the roadmap's literal "reusable page template" requirement the moment a second guild is interviewed — every future case study would require copy-pasting a whole `page.tsx`, re-deriving the copy-fidelity gate, and re-adding a sitemap entry by hand, instead of one new data-module entry |
| Committed static data module (TS/JSON) | A `case_studies` Supabase table | The report's own precedent (Phase 3) never stores public-content copy in the database; a table would need RLS, an admin UI, and a migration for content two people (the user + the interviewed guild) edit a handful of times per quarter — pure over-engineering for this volume |

**Installation:** None — no `npm install` needed for this phase.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new external packages. All required functionality (dynamic routes, metadata, sitemap, JSON-LD, Tailwind styling, Vitest/Testing Library) is already present in `package.json` and used by the Phase 2/3 pages this phase extends. If a planner later decides a new dependency is needed (e.g., a schema-validation library for the case-study data module), run the Package Legitimacy Gate protocol against that specific package before adding it.

## Architecture Patterns

### System Architecture Diagram

```
Guild interview (user, offline)
   -> written quote/number/slug approval
        (held as a planning artifact, e.g. 04-COPY-DRAFT.md + SIGN-OFF,
         mirroring 03-COPY-DRAFT.md's APPROVED-STRING convention)
   -> one entry added to a committed case-study data module
        (data/case-studies/<slug>.ts -- typed, no DB)
                |
                v
   generateStaticParams() reads the data module's slug list
                |
                v
   app/customers/[slug]/page.tsx (Server Component)
        - generateMetadata(params) -> per-slug title/description/canonical
        - JSON-LD: Article + BreadcrumbList (Person "Zev" @id reused,
          NO Review/AggregateRating -- Phase 2 D-05 precedent + Google's
          own self-serving-review restriction, both apply here)
        - renders: eyebrow/H1 (outcome-focused) -> proof strip (4 stats)
          -> lead paragraph -> before/after narrative -> quote block
          (reuses QuoteCard/VerificationLine from LandingValueProps.tsx)
          -> credible-limitation section -> contextual CTA
                |
                v
   app/sitemap.ts -- ONE entry per published slug, added only once that
        slug's page has cleared its interim `robots: noindex` gate
                |
                v
   Search engines / AI crawlers (Phase 5 recrawl request, once, later)
```

A reader can trace the primary path: an approved interview turns into one data-module entry, which the dynamic route renders and metadata reflects, which the sitemap then exposes -- exactly mirroring Phase 3's draft-then-publish flow, but parameterized so a second guild never requires new page code.

### Recommended Project Structure
```
app/
├── customers/
│   └── [slug]/
│       ├── page.tsx              # dynamic case-study template (this phase's EVID-04 deliverable)
│       └── __tests__/
│           └── page.test.tsx     # render + metadata + D-05-no-Review-schema tests
data/                              # NEW top-level dir, or app/customers/_data/ -- planner's call
└── case-studies/
    ├── index.ts                  # exports the typed list generateStaticParams reads
    └── <slug>.ts                 # one file per approved guild (none exist yet)
app/sitemap.ts                    # append one entry per published slug (currently: none)
app/__tests__/sitemap.test.ts     # extend, don't replace, per Phase 3's own file
app/components/landing/
└── LandingValueProps.tsx         # SOURCE of VerificationLine/QuoteCard -- import/reuse, do not re-implement
```

### Pattern 1: Reuse the locked verification-line component instead of re-inventing it
**What:** `app/components/landing/LandingValueProps.tsx` already exports (module-private today) the exact discriminated union the case study needs: `TestimonialVerification = { type: 'wcl_link'; url } | { type: 'verified_customer' } | { type: 'verified_customer_dated'; monthYear }`, plus `VerificationLine` and `QuoteCard` that render it.
**When to use:** Any place the case study shows a quote with a verification line -- this is Phase 4's success criterion 4 ("public profile link where permitted, otherwise a verified-customer note") verbatim.
**Example:**
```typescript
// Source: app/components/landing/LandingValueProps.tsx lines 58-80 (read this session)
type TestimonialVerification =
  | { type: 'wcl_link'; url: string; monthYear?: string }
  | { type: 'verified_customer' }
  | { type: 'verified_customer_dated'; monthYear: string }

function VerificationLine({ verification }: { verification: TestimonialVerification }) {
  const text =
    verification.type === 'verified_customer_dated'
      ? `Verified LootList+ customer ∙ Interviewed ${verification.monthYear}`
      : 'Verified LootList+ customer'
  return <p className="font-poppins text-[12px] text-[#bababa] leading-tight text-center">{text}</p>
}
```
These types/components are currently unexported locals of `LandingValueProps.tsx`. The plan should either export them from that file, or extract them into a small shared module (e.g. `app/components/landing/QuoteVerification.tsx`) that both `LandingValueProps.tsx` and the new case-study page import — never re-type this union from scratch, or a future edit to the verification rule (D-03/D-04 in Phase 2's `02-CONTEXT.md`) has to be made twice.

### Pattern 2: Copy-fidelity gate (APPROVED_STRINGS + token resolution), same shape as Phase 3
**What:** Every visible string on the page is drafted into a `04-COPY-DRAFT.md` (or equivalent), signed off by the user AND by the interviewed guild in writing, then wired through an `APPROVED_STRINGS` map + `{token}` resolver exactly like `app/research/wow-classic-loot-systems-2026/page.tsx` lines 55-60 and 274-320 (read this session).
**When to use:** All page copy, but especially the quote text, the guild name, and any outcome number — these are the exact three things the phase's checkpoint forbids drafting or inferring.
**Example:**
```typescript
// Source: app/research/wow-classic-loot-systems-2026/page.tsx (read this session, pattern only, not literal reuse)
function approved(key: string): string {
  const template = APPROVED_STRINGS[key]
  if (template === undefined) {
    throw new Error(`Missing approved string for key "${key}" (see 04-COPY-DRAFT.md)`)
  }
  return resolveTokens(template, TOKENS)
}
```
For the case study, `TOKENS` should resolve only from the one case-study data-module entry (never a hand-typed literal), so a quote or number can never appear on the page without having first been written into that data file under a sign-off.

### Pattern 3: Interim noindex, then publish -- reused verbatim from Phase 3
**What:** `metadata.robots = { index: false, follow: false }` ships with the page/route while content is still draft or the slug list is empty; the sitemap entry and the robots removal happen together, in one commit, only once the guild's written approval is in hand.
**When to use:** This is the exact mechanism the roadmap checkpoint is asking for ("ship the template, leave the case study unpublished"). With the dynamic-route recommendation, "unpublished" is even stronger than Phase 3's case: with zero entries in the case-study data module, `generateStaticParams()` returns `[]` and the route is unreachable by any real URL at all -- there is no draft page sitting live-but-noindexed the way the report was during Phase 3's Wave 1-4.
**Example:**
```typescript
// Source: pattern extracted from .planning/phases/03-anonymized-product-data-report/03-01-PLAN.md
// line 237 and 03-06-PLAN.md line 107 (read this session; quoted content is
// the PLAN's own instruction text, not application code)
// 03-01-PLAN.md: "set `robots: { index: false, follow: false }` on this
// metadata export, with a code comment stating that plan 03-05 removes it
// at publish time once the copy sign-off gate has cleared."
```
Apply the same discipline here: if the planner chooses to ship one placeholder/fixture route for testing purposes (see Open Questions), it must carry this same interim-robots block and must never be added to `app/sitemap.ts`.

### Pattern 4: JSON-LD -- Article + BreadcrumbList only, reusing the "Zev" Person `@id`, never Review/AggregateRating
**What:** Same JSON-LD shape as the report and blog posts.
**When to use:** Every case-study page.
**Example:**
```typescript
// Source: app/about/page.tsx lines 24-31 (read this session) -- reuse this
// exact @id, do not redefine a second Person entity for "Zev"
author: {
  '@type': 'Person',
  '@id': 'https://www.getlootlist.com/about#creator',
  name: 'Zev',
  description: 'Product designer, guild officer, and raid lead. Creator of LootList+.',
  url: 'https://www.getlootlist.com/about',
}
```
Do **not** add `Review` or `AggregateRating` JSON-LD anywhere on the case-study page. This was already locked as D-05 in Phase 2 ("No structured data for testimonials... Executors must not add Review/AggregateRating schema to quotes" — `.planning/phases/02-checkable-conversion-copy/02-CONTEXT.md` line 21, read this session) and is independently confirmed by Google's own guidance: reviews are "self-serving" when a review about entity A appears on entity A's own site, and Google suppresses Review/AggregateRating rich results for Organization-type entities in exactly that case [CITED: developers.google.com/search/docs/appearance/structured-data/review-snippet]. A guild testimonial about LootList+, published on getlootlist.com, is precisely this case.

### Anti-Patterns to Avoid
- **Inventing a placeholder guild to "prove the template works":** The phase's checkpoint explicitly forbids drafting or inferring "customer quotes, guild names, or outcome numbers." A fixture guild used only in a Vitest render test (never rendered at a real, reachable URL, never in the sitemap) is fine; a fixture guild that becomes a live page at `/customers/example-guild` is not — it is exactly the fabrication the checkpoint prohibits, even if labeled "example."
- **Adding Review/AggregateRating JSON-LD:** See Pattern 4. This is the single most likely mistake on a page whose entire purpose is showcasing praise.
- **Re-typing the verification-line discriminated union:** See Pattern 1. Two independently-maintained copies of "is this a WCL link, a plain verified-customer note, or a dated note" will drift the first time D-03/D-04's rule is revisited.
- **Storing the guild's approved quote/number data as a hand-typed literal inside `page.tsx`:** Breaks the copy-fidelity gate (Pattern 2) and makes a future audit of "did we only publish what was approved" much harder than diffing one data-module file against the sign-off artifact.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-guild verification line (WCL link vs. text note) | A new switch/union type on the case-study page | Import/extract the existing `TestimonialVerification` union + `VerificationLine` from `LandingValueProps.tsx` | Already built, tested (implicitly, via `LandingValueProps.test.tsx`), and locked as the sprint plan's verbatim format (D-03) |
| Static-page-per-guild routing when a second case study ships | Copy-pasting `app/research/.../page.tsx`'s whole-file structure per guild | `app/customers/[slug]/page.tsx` + `generateStaticParams()` reading a small typed data module | One route, one test suite, one copy-fidelity gate, no matter how many guilds are eventually interviewed |
| Copy-approval tracking | An ad hoc comment or Slack message as "proof" the guild approved wording | The same `APPROVED-STRING` / sign-off artifact convention Phase 2/3 already use (`0X-COPY-DRAFT.md`) | Gives the plan-checker and code-review agents something to grep for, exactly as `03-05-PLAN.md`'s "approved-string parity" gate does |
| Review/rating rich-result eligibility | Any Review/AggregateRating JSON-LD "to help it show stars in search" | Nothing — do not add it | D-05 precedent (Phase 2) plus Google's explicit self-serving-review suppression rule for entity-controls-its-own-review pages |

**Key insight:** Nothing about this phase's engineering half is genuinely novel except the dynamic-route decision (see Open Questions). Every other primitive — verification lines, copy-fidelity gating, JSON-LD shape, sitemap/robots publish sequencing, contextual CTA placement — already exists in this repo, built and locked by Phase 2 and Phase 3. The main risk is re-deriving these patterns slightly differently rather than reusing them.

## Common Pitfalls

### Pitfall 1: Treating "ship the template" as license to invent content
**What goes wrong:** A plan drafts realistic-looking sample quotes/numbers "to unblock EVID-04," and either they leak into a real route, or they get treated as a starting point that quietly becomes the shipped copy once the interview finally happens ("close enough").
**Why it happens:** The roadmap's success criterion literally says "renders at `/customers/{guild-slug}`," which reads like it wants a live example.
**How to avoid:** Zero entries in the case-study data module is a valid, complete way to satisfy "the template exists and renders" — `generateStaticParams()` returning `[]` plus a passing render test against a fixture that is never deployed to a real URL is suffient proof. Do not create a reachable route with invented guild content.
**Warning signs:** Any guild name, quote, or number in `page.tsx`, a data-module file, or a test fixture that does not trace back to a written approval on file.

### Pitfall 2: Publishing before the sitemap/robots pair is atomic
**What goes wrong:** The robots-noindex directive is removed in one commit and the sitemap entry is added in a later, separate commit (or vice versa), leaving a window where the page is indexable-but-unlisted or listed-but-noindexed.
**Why it happens:** Phase 3 split this across two plans (03-01 added the interim directive, 03-06 removed it and added the sitemap entry in the same commit) — easy to only copy half of that discipline.
**How to avoid:** Follow Phase 3's exact discipline: robots-removal and sitemap-entry-addition happen in the same commit, gated on the copy sign-off having cleared (`03-06-PLAN.md` line 107, read this session: "remove the interim `robots` block... The copy sign-off has cleared and the findings are final").
**Warning signs:** A `git diff` for the publish commit that touches only one of `page.tsx`'s `robots` key or `app/sitemap.ts`, not both.

### Pitfall 3: Guild-identity fields the ten interview questions don't actually collect
**What goes wrong:** The proof strip's exact template (sprint plan, quoted below) needs roster size and expansion/tier, but the plan's ten required interview questions never explicitly ask for either — they ask about workflow, time, setup, and a defensible measurable difference. A plan could silently infer roster size/expansion from LootList+'s own database (which the guild's officer already entered) instead of from the interview, without flagging that as a distinct data source needing its own consent check.
**Why it happens:** The proof-strip template and the interview-question list were drafted at different times in the sprint plan and were never explicitly cross-checked against each other.
**How to avoid:** Flag this at plan time (see Open Questions) — decide explicitly whether roster size/expansion for the proof strip come from the interview transcript, from the guild's own product data (which would need its own privacy sign-off, distinct from the quote-approval sign-off, since it's usage data about a named guild), or are added as an eleventh ad hoc question when the interview happens.
**Warning signs:** A proof-strip number in the shipped page that does not appear anywhere in the guild's written quote/number approval artifact.

### Pitfall 4: Missing `rel="noopener noreferrer"` on the guild's outbound public-profile link
**What goes wrong:** Question 10 of the interview ("May the page link your Warcraft Logs, guild profile, or another public identity?") produces an outbound link; if it's added without the same attributes the existing `QuoteCard` component already applies, it's a regression from the Phase 2 pattern, not a new mistake, but an easy one to reintroduce if the case study builds its own link markup instead of reusing `QuoteCard`.
**Why it happens:** Building a new component instead of reusing `QuoteCard`/`VerificationLine`.
**How to avoid:** See Pattern 1 and Don't Hand-Roll — reuse, don't rebuild.
**Warning signs:** A `<a href=...>` in the case-study page that isn't produced by the shared verification-line component.

## Code Examples

### The sprint plan's exact case-study template (verbatim, from the plan doc)
```
Preferred title:  How {Guild} Cut Weekly Loot Admin from {Before} to {After}
Fallback title:   How {Guild} Made Every Loot Decision Explainable
Slug:             /customers/{guild-slug}
Meta description: How {Guild}, a {size}-player {expansion} guild, replaced
                   {old system} with ranked lists, attendance-weighted
                   scores, and visible loot decisions.

H1:    {Outcome-focused title}
Lead:  {Guild} is a {size}-player {expansion/tier} guild. Before LootList+,
       its officers used {old process}. The system took {time/cost} and
       created {specific failure}. After {time period} with LootList+, the
       guild {verified result}.

Proof strip:
  - {Roster size}
  - {Expansion and tier}
  - {Before -> after admin time or other metric}
  - {Months using LootList+}

Quote block:
  "{Approved customer quote}"
  {Character or real name} - {Role}, {Guild} - {Expansion/tier}
  Verified LootList+ customer - Interviewed {Month Year} - [Guild or
  Warcraft Logs profile]
```
*Source: `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` lines 470-514 and 393-401 (read this session — the user's own sprint plan doc, referenced by CLAUDE.md/STATE.md as the canonical source for this milestone's exact copy templates). Every `{token}` must resolve from the guild's written interview approval, never a placeholder value carried into a shipped page.*

### The ten required interview questions (verbatim -- do not paraphrase when the user conducts the interview)
```
1. What did you use before LootList+?
2. What failed most often: list collection, attendance, prioritization,
   in-raid distribution, or explaining decisions?
3. Roughly how much officer time did the old workflow take per week?
4. What made you willing to try another system?
5. How long did real setup take -- not just account creation?
6. What changed during the first two raid nights?
7. What do raiders use or mention most?
8. What measurable difference can you defend publicly?
9. What still needs improvement?
10. May the page link your Warcraft Logs, guild profile, or another
    public identity?
```
*Source: same file, lines 501-514. The plan doc also directs: "Include the answer to question nine. A credible limitation makes the rest of the story more believable" — this is where the phase's "section for a credible limitation" success criterion comes from.*

### Sitemap test extension pattern (once a real slug exists)
```typescript
// Source: app/__tests__/sitemap.test.ts (read this session, full file) --
// same shape, new URL constant, when/if a real case-study slug ships
const CASE_STUDY_URL = 'https://www.getlootlist.com/customers/<real-slug>'
it('lists the case study URL exactly once', () => {
  const entries = sitemap()
  expect(entries.filter((e) => e.url === CASE_STUDY_URL)).toHaveLength(1)
})
```
Do not write this test against an invented slug before a real one exists — write it as part of the same commit that adds the real entry, exactly as `03-06-PLAN.md` did.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A dynamic `[slug]` route + committed data module is the right architecture, over a static-per-guild folder | Architecture Patterns, Open Questions | If the planner/user actually wants exactly-one, hand-written page (mirroring the report/blog convention), the dynamic-route scaffolding is wasted work; low cost to redo since no real content exists yet either way |
| A2 | Roster size and expansion/tier for the proof strip should come from the interview, not silently pulled from the guild's existing LootList+ product data | Common Pitfalls (Pitfall 3) | If the planner instead pulls these from the database without flagging it, that's a second, undisclosed data source feeding a public page about a specific named guild -- worth an explicit decision, not a silent default |
| A3 | `VerificationLine`/`TestimonialVerification`/`QuoteCard` should be extracted/exported from `LandingValueProps.tsx` rather than duplicated | Architecture Patterns (Pattern 1) | If duplicated instead, a future change to the verification-line format (D-03/D-04) has to be applied in two places; not fabricated content, just a maintainability call |

**If this table is empty:** N/A — see above.

## Open Questions

1. **Static-per-guild folder vs. dynamic `[slug]` route: which does the planner commit to?**
   - What we know: Phase 2 and Phase 3 both used static, hand-named folders (`app/about/`, `app/research/wow-classic-loot-systems-2026/`) for every prior public content page; no dynamic `[slug]` route exists anywhere in `app/(landing)` or the public route groups today (the only `[slug]`/`[id]` routes in the repo are inside the authenticated `(app)` group: `(app)/help/[slug]`, `(app)/characters/[id]`, `(app)/expansions/[expansionId]`, all client-rendered, none doing `generateMetadata`/`generateStaticParams`).
   - What's unclear: Whether the roadmap's "reusable page template" phrase was meant literally (build for N future guilds) or just means "a template exists, ship one instance of it" (i.e., still one static folder, just cleanly componentized so a second guild is a fast copy-paste).
   - Recommendation: If a second case study is realistically expected within this milestone or soon after, use the dynamic-route approach recommended above. If this milestone truly only ever needs one case study ever, a single static folder (Phase 3's convention) is simpler and lower-risk, and the "reusable" requirement is satisfied by extracting the visual sections into reusable components even without a dynamic route. This is a genuine judgment call the planner should make explicitly (and could route through a checkpoint or a quick user confirmation) rather than infer silently, since it changes the file layout EVID-04's tests will target.

2. **Where does the proof strip's roster size / expansion / tenure data come from?**
   - What we know: The ten required interview questions don't explicitly ask for roster size, expansion/tier, or "how many months has this guild used LootList+."
   - What's unclear: Whether the plan should treat these as an implicit eleventh/twelfth interview ask, or pull them from the guild's own LootList+ data (which would need its own explicit consent framing, separate from "may we quote you," since it's usage data about a specific named guild being published).
   - Recommendation: Surface this to the user before or during the interview, not as a planner-side inference. See Pitfall 3.

3. **Does EVID-04 need a fixture/sample render to prove structure, and if so, where does it live?**
   - What we know: The checkpoint forbids a real, reachable route with invented content; a Vitest fixture used only inside a test file, asserting on a component in isolation, never touches a real URL or the sitemap.
   - What's unclear: Whether the plan-checker / verifier will accept "the render test passes against a fixture" as satisfying success criterion 1's "renders at `/customers/{guild-slug}`," or whether it expects a human to visit a real URL in a browser during UAT.
   - Recommendation: If human verification is required (`workflow.human_verify_mode: "end-of-phase"` in `.planning/config.json`, confirmed this session), the plan should make explicit that the human check visits the dynamic route with a *test-only* param not present in the real sitemap/data module (e.g. a dev-only fixture entry gated out of `generateStaticParams()`'s production output), rather than a page a search engine could ever reach.

## Environment Availability

No external tool/service dependency beyond what's already installed and verified working by Phase 2/3 (Node.js, npm, Next.js dev server, Vitest). Skipped: this phase is code/config-only, no new external dependency.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.0 [VERIFIED: package.json] + @testing-library/react ^16.3.2 [VERIFIED: package.json] |
| Config file | `vitest.config.ts` (jsdom environment, path aliases, globals enabled -- project-wide, unchanged by this phase) |
| Quick run command | `npx vitest run app/customers/[slug]/__tests__/page.test.tsx app/__tests__/sitemap.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EVID-04 | Template renders H1/proof-strip/before-after/limitation sections from a fixture data entry | unit (RTL render) | `npx vitest run app/customers/[slug]/__tests__/page.test.tsx` | ❌ Wave 0 |
| EVID-04 | Page metadata is self-canonical and matches visible H1/description | unit | same file, additional assertions (mirrors `page.test.tsx`'s existing canonical-matching test in Phase 3) | ❌ Wave 0 |
| EVID-04 | No Review/AggregateRating JSON-LD present (D-05) | unit | same file, `querySelectorAll('script[type="application/ld+json"]')` assertion, mirrors `LandingValueProps.test.tsx`'s existing D-05 assertion | ❌ Wave 0 |
| EVID-04 | Empty case-study data module produces zero static params / zero sitemap entries | unit | new test asserting `generateStaticParams()` returns `[]` while the data module is empty | ❌ Wave 0 |
| EVID-05 | Case study slug appears exactly once in sitemap, robots override absent, once (and only once) a real approved entry exists | unit | extend `app/__tests__/sitemap.test.ts`, same shape as the existing report-URL assertions | ❌ Wave 0 (and content-blocked regardless) |

### Sampling Rate
- **Per task commit:** `npx vitest run` scoped to the new/changed test files
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`; `npm run typecheck`, `npm run build` scoped-verified per Phase 3's documented pre-existing, out-of-scope lint/build gaps (unrelated `react-hooks/purity` and `/api/guild-count` issues, confirmed still present as of Phase 3's close per `03-06-SUMMARY.md`)

### Wave 0 Gaps
- [ ] `app/customers/[slug]/page.tsx` (or the static-folder equivalent, per Open Question 1) -- does not exist yet
- [ ] `app/customers/[slug]/__tests__/page.test.tsx` -- does not exist yet; model on `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx`'s jsdom `matchMedia`/`IntersectionObserver` mocks and `trackClientEvent` mock (both read this session)
- [ ] A typed case-study data module (`data/case-studies/` or similar) -- does not exist yet, ships empty
- [ ] `VerificationLine`/`TestimonialVerification`/`QuoteCard` export boundary decision (Pattern 1 / Assumption A3) -- currently module-private in `LandingValueProps.tsx`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Public, unauthenticated marketing page, same as the report/blog |
| V3 Session Management | no | No session state involved |
| V4 Access Control | no | No user-scoped data; content is a build-time static artifact |
| V5 Input Validation | yes (narrow) | If a dynamic `[slug]` route is chosen: `params.slug` must only ever match an entry actually present in the committed data module (`generateStaticParams()`'s own list) -- Next.js already 404s any slug not returned by `generateStaticParams()` for a fully static route, but if the route is ever changed to `dynamicParams: true` with a runtime lookup, add the same path-safety-style guard Phase 3 used for `resolve_export_path` (reject anything not an exact match against the known slug list; never interpolate `params.slug` into a file path or query) |
| V6 Cryptography | no | Nothing to encrypt; the interview-approval artifact is a planning-directory document, not a secret |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Publishing a guild's name/quote/numbers before written approval clears | Information Disclosure / Repudiation | Copy-fidelity gate (Pattern 2): every visible string traces to an `APPROVED_STRINGS`-equivalent map sourced only from the signed-off data-module entry; no literal guild content typed directly into `page.tsx` |
| Self-serving Review/AggregateRating rich-result markup | Spoofing (of review legitimacy) | D-05 precedent (Phase 2) + Google's own self-serving-review suppression rule [CITED: developers.google.com/search/docs/appearance/structured-data/review-snippet]; never add this schema type |
| A fabricated "example" case study becoming reachable/indexable | Spoofing (of a real customer relationship) | Zero-entry data module + `generateStaticParams()` returning `[]` in production; any test fixture stays inside the test file, never a deployed route (Pitfall 1) |
| Outbound guild public-profile link (WCL, etc.) missing `rel="noopener noreferrer"` | Tampering (reverse tabnabbing) | Reuse `QuoteCard`'s existing anchor markup (already carries this attribute per Phase 2's `02-VERIFICATION.md` line 48, read this session) rather than hand-rolling a new link |
| Interim-robots/sitemap publish race (page indexable but unlisted, or listed but noindexed) | Information Disclosure | Same-commit robots-removal + sitemap-entry-addition, exactly as Phase 3's `03-06-PLAN.md` did (Pitfall 2) |

## Sources

### Primary (HIGH confidence -- read directly this session)
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/config.json` -- phase scope, blocker status, workflow toggles
- `.planning/phases/03-anonymized-product-data-report/03-PATTERNS.md`, `03-06-SUMMARY.md`, `03-01-PLAN.md`, `03-05-PLAN.md`, `03-06-PLAN.md` -- publish/robots/sitemap/copy-fidelity conventions
- `app/research/wow-classic-loot-systems-2026/page.tsx` (full file), `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx`, `app/sitemap.ts`, `app/__tests__/sitemap.test.ts`, `app/about/page.tsx`, `app/components/landing/LandingValueProps.tsx`, `app/components/landing/LandingCTA.tsx`, `app/components/landing/LandingNav.tsx`, `app/components/landing/BlogTracker.tsx` -- all read in full or in relevant part this session
- `.planning/phases/02-checkable-conversion-copy/02-CONTEXT.md`, `02-RESEARCH.md`, `02-COPY-DRAFT.md`, `02-UI-SPEC.md`, `02-VERIFICATION.md`, `02-SECURITY.md` -- D-03/D-04/D-05 verification-line and no-structured-data decisions
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` (lines 78-120, 393-514, 655-705) -- the sprint plan's exact case-study template, ten interview questions, and "what not to do" list; referenced by CLAUDE.md and STATE.md as the canonical copy source for this milestone
- `package.json`, `tsconfig.json` -- verified dependency versions and `resolveJsonModule: true`

### Secondary (MEDIUM confidence)
- [CITED: nextjs.org/docs/app/api-reference/functions/generate-static-params] and [CITED: nextjs.org/docs/app/api-reference/functions/generate-metadata] -- confirms `generateStaticParams`/`generateMetadata` semantics for dynamic segments (fetched via WebSearch, official docs)
- [CITED: developers.google.com/search/docs/appearance/structured-data/review-snippet] -- confirms self-serving Review/AggregateRating suppression for entity-controls-its-own-review pages (fetched via WebSearch, official docs)

### Tertiary (LOW confidence)
- None relied upon for any claim in this document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, all versions read from `package.json` this session
- Architecture: HIGH for reused patterns (verification line, copy-fidelity, robots/sitemap sequencing, JSON-LD shape), MEDIUM for the dynamic-route recommendation (a genuinely new pattern for this repo's public pages, confirmed only via official Next.js docs, not an in-repo precedent) -- flagged as Open Question 1 rather than asserted as locked
- Pitfalls: HIGH - all four pitfalls trace to an explicit in-repo precedent (Phase 2/3 plans/summaries) or the phase's own checkpoint text
- Content readiness (EVID-05): N/A / blocked - no research can resolve a missing interview; documented verbatim so the plan does not need to re-derive it later

**Research date:** 2026-09-06
**Valid until:** 30 days (stable Next.js/React APIs; the real constraint is the user-owned interview, not technology drift)
