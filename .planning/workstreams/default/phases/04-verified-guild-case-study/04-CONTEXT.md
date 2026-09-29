# Phase 4: Verified Guild Case Study - Context

**Gathered:** 2026-09-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a reusable case-study page template rendering at `/customers/{guild-slug}` with an outcome-focused H1, proof strip, before/after narrative, and credible-limitation section (EVID-04), plus the machinery to publish one real guild's approved story when the interview happens (EVID-05). EVID-05 is blocked: the interview is not scheduled, and no guild name, quote, or outcome number may be drafted or inferred. The phase completes with the template, tests, and an interview kit shipped, and EVID-05 recorded blocked in STATE.md. Visual design is already locked by the approved 04-UI-SPEC.md; copy sign-off and no-em-dash rules apply to all visible strings.

</domain>

<decisions>
## Implementation Decisions

### Route architecture
- **D-01:** Dynamic route: `app/customers/[slug]/page.tsx` + `generateStaticParams()` reading a typed, committed case-study data module. Zero entries means `generateStaticParams()` returns `[]` and no page is reachable at any real URL. A second interviewed guild costs one new data-module entry, never new page code. — **Reversibility:** costly — EVID-04's tests, the copy-fidelity gate, and the data-module type contract all target the dynamic-route layout; converting to static per-guild folders later reworks the tests and the publish plan (public URLs stay identical either way).
- **D-02:** No bare `/customers` index page. Only `/customers/{slug}` routes exist; the bare path 404s. An index is a deferred idea for when there are enough case studies to list.

### Proof-strip data source
- **D-03:** The proof strip's roster size, expansion/tier, and months-using figures come from the interview, via explicit added questions (11 and 12). Single data source, single consent surface: everything published traces to the guild's written answers. Do NOT pull these figures from the guild's own LootList+ product data. — **Reversibility:** costly — if the interview is conducted without the added questions, the proof-strip fields cannot be backfilled without re-contacting the guild for a second consent round.
- **D-04:** The phase ships a committed interview kit artifact: the ten sprint-plan questions verbatim (never paraphrased), the drafted additional questions (roster size, expansion/tier, months using LootList+), the question-10 public-linking ask, and a written-approval checklist. The user runs the interview from this one document.
- **D-05:** Visual fallback for an unavailable proof-strip stat is already locked by 04-UI-SPEC.md: the block is omitted entirely (a 3-block strip is acceptable); never "N/A", a placeholder, or an invented value.

### Interview timing & phase shape
- **D-06:** The interview is not scheduled. Phase 4 completes without waiting: template, tests, and interview kit ship; the phase closes with EVID-05 recorded blocked in STATE.md, exactly as the roadmap checkpoint instructs. Publish becomes a small follow-up plan whenever the interview clears.
- **D-07:** The future publish step is self-contained: it adds the case study to contextual links on the relevant marketing pages, performs the sitemap entry + robots removal in one commit (Phase 3's atomic publish discipline), and submits a single URL Inspection recrawl request for the new URL plus any pages whose links changed. Phase 5 proceeds without the case study and does not wait for it. — **Reversibility:** costly — once Phase 5's one-time recrawl runs without the case study, the self-contained path is the only remaining route to publish; the one-request-per-URL rule means the publish plan must carry its own recrawl and cannot be re-merged into Phase 5.

### Template review mechanism
- **D-08:** End-of-phase UAT uses a dev-only fixture route: a fixture entry in the case-study data module gated out of `generateStaticParams()`'s production output and never present in `app/sitemap.ts`. The user reviews the rendered template at `/customers/{fixture-slug}` via `npm run dev`. The fixture route must never be reachable in a production build.
- **D-09:** Fixture content is obviously fake with realistic lengths: clearly-labeled placeholder content (e.g. a guild name like "Example Guild (Fixture)") with realistic string lengths and plausible-shaped numbers, so wrapping, hierarchy, and the proof strip can be judged. It must be impossible to mistake for a real customer; it satisfies the no-fabrication checkpoint because it never ships to a reachable production URL and is visibly labeled as a fixture.

### Claude's Discretion
- Data module directory placement (`data/case-studies/` vs `app/customers/_data/` or similar) and file shape (TS vs JSON), within TypeScript strict typing (required fields non-optional per 04-UI-SPEC.md E7).
- Mechanics of extracting/exporting `QuoteCard`/`VerificationLine`/`TestimonialVerification` from `LandingValueProps.tsx` (export in place vs shared module) — never re-type the union (RESEARCH.md Pattern 1 / A3).
- Exact gating mechanism for the dev-only fixture (NODE_ENV check, env flag, or equivalent), provided a production build can never emit or serve the fixture route.
- `dynamicParams` setting and 404 behavior for unknown slugs (V5 guard from RESEARCH.md's security section applies if runtime lookup is ever enabled).
- Drafted wording of interview questions 11/12 and the kit's layout (internal artifact, no copy sign-off gate, still no em dashes).
- Draft CTA copy per 04-UI-SPEC.md's Copywriting Contract — goes through the user copy sign-off gate before ship like every visible string.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 artifacts (already produced this phase)
- `.planning/phases/04-verified-guild-case-study/04-UI-SPEC.md` — APPROVED design contract (2026-09-05, 6/6 dimensions): spacing, typography, color, proof-strip hierarchy, copywriting contract, UI considerations. Governs every visual rule; do not re-derive.
- `.planning/phases/04-verified-guild-case-study/04-RESEARCH.md` — architecture patterns (verification-line reuse, copy-fidelity gate, interim robots, JSON-LD shape), pitfalls, security table, and the sprint plan's verbatim case-study template + ten interview questions.
- `.planning/phases/04-verified-guild-case-study/04-VALIDATION.md` — validation contract: vitest sampling, per-task verification map, Wave 0 requirements, manual-only verifications.

### Sprint plan (content source)
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` §case-study template (~lines 470–514) and §ten interview questions (~lines 501–514) — the exact `{token}` template and the questions quoted verbatim in 04-RESEARCH.md. Plan copy is a starting point; user sign-off required on all visible wording.

### Prior-phase decisions this phase inherits
- `.planning/phases/02-checkable-conversion-copy/02-CONTEXT.md` — D-03/D-04 verification-line format (the public proof pattern this page echoes), D-05 no Review/AggregateRating schema (binding here too).
- `.planning/phases/03-anonymized-product-data-report/03-CONTEXT.md` — article page shape, Zev byline/Person schema (D-11), publish conventions the case study mirrors.

### Code surfaces
- `app/components/landing/LandingValueProps.tsx` — source of `QuoteCard`, `VerificationLine`, `TestimonialVerification` (import/extract, never re-implement).
- `app/research/wow-classic-loot-systems-2026/page.tsx` — the APPROVED_STRINGS + token-resolver copy-fidelity pattern and article layout to mirror.
- `app/sitemap.ts` and `app/__tests__/sitemap.test.ts` — sitemap conventions; the case-study slug appears zero times until publish, exactly once after.
- `app/about/page.tsx` — the canonical Zev Person `@id` (`https://www.getlootlist.com/about#creator`) to reuse, never redefine.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `QuoteCard` / `VerificationLine` / `TestimonialVerification` discriminated union in `LandingValueProps.tsx` — currently module-private; export or extract to a shared module so the case study's quote block matches the homepage testimonials exactly (RESEARCH.md Pattern 1, A3).
- APPROVED_STRINGS map + `{token}` resolver pattern from the research report page — reuse the shape; tokens resolve only from the case-study data-module entry, never hand-typed literals.
- `components/ui/button.tsx` `variant="accent"` for the single CTA; `BlogTracker`-style client component for page-view/CTA analytics.
- Vitest + Testing Library conventions from `app/research/.../__tests__/page.test.tsx` (jsdom `matchMedia`/`IntersectionObserver`/`trackClientEvent` mocks).

### Established Patterns
- Interim `robots: { index: false, follow: false }` while draft; robots removal + sitemap entry in the SAME commit at publish (Phase 3 discipline; RESEARCH.md Pitfall 2).
- No Review/AggregateRating JSON-LD anywhere (Phase 2 D-05 + Google self-serving-review suppression). Article + BreadcrumbList only, reusing the Zev Person `@id`.
- Copy sign-off is a hard gate for all visible strings; no em dashes (repo-enforced #253).
- Outbound public-profile links reuse `QuoteCard`'s anchor markup (carries `rel="noopener noreferrer"`).

### Integration Points
- `app/sitemap.ts` — one entry per published slug, none until publish.
- Contextual CTA links into the existing signup flow (LoginPage surface, Phase 2).
- Phase 5 interlinks the other evidence pages; the case study's own links + recrawl ride the self-contained publish plan (D-07).

</code_context>

<specifics>
## Specific Ideas

- Empty data module is the shipped state: `generateStaticParams()` returns `[]`, no reachable case-study URL exists in production, nothing enters the sitemap. No "coming soon" page (RESEARCH.md Pitfall 1).
- Fixture guild name style: visibly fake, e.g. "Example Guild (Fixture)" — realistic lengths for wrapping/hierarchy review, impossible to read as a real customer.
- The publish plan's mini-sweep (D-07) covers: data-module entry from the signed-off interview record, contextual links on relevant pages, atomic sitemap+robots commit, one recrawl request per new/changed URL, recorded so nobody re-requests.

</specifics>

<deferred>
## Deferred Ideas

- `/customers` index page listing published case studies — add when there is more than one case study to list (D-02).

### Reviewed Todos (not folded)
All six pending todos keyword-matched this phase but were already reviewed in Phase 3's context as unrelated (keyword-only matches); that review carries forward unchanged:
- **Redesign admin analytics dashboard** — deferred until after the sprint (user decision, 2026-08-29)
- **Fix admin analytics dashboard showing zero data** — same deferral
- **Review PostHog data for growth experiments** — same deferral
- **Explore top-of-funnel and paid ads strategy** — same deferral
- **Fix "loot list" query cannibalization** — folded into Phase 2 and shipped; todo file can be archived
- **Rework /compare search snippet** — folded into Phase 2 and shipped; todo file can be archived

</deferred>

---

*Phase: 4-Verified Guild Case Study*
*Context gathered: 2026-09-05*
