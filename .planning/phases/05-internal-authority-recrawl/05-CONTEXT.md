# Phase 5: Internal Authority & Recrawl - Context

**Gathered:** 2026-09-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Every marketing surface (homepage, /compare, /pricing, /about, the relevant blog guides) links contextually to the research report, and the report links back to Compare and Pricing; the sitemap lists only preferred canonical URLs with truthful `lastmod` dates driven by a single committed source; the pending sprint commits are deployed; and Google is asked exactly once per materially changed URL, after the final deploy, with an append-only record so nobody re-requests.

Not in this phase: the case-study link sweep and its recrawl (owned by `04-PUBLISH-RUNBOOK.md`), new pages or content, nav/footer restructuring, external-surface updates, and Phase 6 measurement.

Requirements: LINK-01, LINK-02.

</domain>

<decisions>
## Implementation Decisions

### Link placement and shape
- **D-01:** Links to the research report on the homepage, /compare, /pricing and /about are inline in existing prose, placed exactly where the page already makes the claim the report backs up (e.g. the homepage loot-decision section, the compare page's fairness claims). No shared "further reading" / evidence block is added to marketing pages; `BlogRelatedPosts` stays blog-only.
- **D-02:** The report page and the case-study template keep their CTAs pointed at the app host (`https://www.lootlistplus.com`). Existing href tests stay green and no CTA copy is re-signed. Contextual links to marketing pages go elsewhere on those pages.
- **D-03:** "Relevant guides" is a topic-matched subset of the 9 blog posts: only guides whose subject the report actually informs (loot-system comparisons, loot drama, running loot without a spreadsheet, priority lists vs council, and similar). Recruitment/onboarding-style posts stay untouched. The executor proposes the exact list at sign-off with a one-line reason per guide.
- **D-04:** The report links out to /compare (where it discusses systems) and /pricing (near the CTA area), each in newly added connective text placed outside the byte-matched approved strings from `03-COPY-DRAFT.md`. The same rule is pre-wired into the case-study template for its runbook sweep. — **Reversibility:** costly — the copy-parity tests on both evidence pages byte-match every approved string; a link placed inside an approved literal breaks the gate and forces a fresh sign-off round.

### Anchor text and sign-off
- **D-05:** One consolidated sign-off checkpoint: the executor drafts every new link (page, surrounding sentence, anchor text, target) into a single copy-draft table and the user approves or edits in one pass before anything ships. The approved table doubles as the record of which pages changed, feeding the lastmod bumps and the recrawl list. No em dashes.
- **D-06:** Anchor text is the specific claim the target proves, written in the linking page's voice (e.g. "84.8% of guilds weight attendance", "how LootList+ compares to TMB"). Never the destination's title repeated, never "learn more" / "read more".
- **D-07:** Density ceiling is one link per target per page, and only where a claim earns it. A page with no natural spot for a target gets no link rather than a forced sentence.
- **D-08:** Phase 5 adds no case-study links and no hidden placeholders. `04-PUBLISH-RUNBOOK.md` step 4 owns that sweep and its sign-off. The Phase 5 sign-off table carries a note per page marking the sentence where a case-study link would naturally slot in later.

### lastmod source of truth
- **D-09:** A single committed dates module (route to last-content-change date) becomes the source `app/sitemap.ts` reads. A test cross-checks each blog post's JSON-LD `dateModified` against the module. `new Date()` is removed from the sitemap entirely. — **Reversibility:** costly — the module becomes the contract for the sitemap, the blog-date parity test and the publish runbook; reverting to hand-typed literals means re-establishing the four-way duplication and rewriting the tests.
- **D-10:** Any visible content change bumps a page's lastmod, links and connective sentences included. Code refactors, test changes and metadata-only tweaks do not. This rule is documented next to the dates module.
- **D-11:** Pages changed in Phases 2 to 4 but not yet live carry the deploy date (the day the change became publicly visible), not the git commit date. The dates module records that date once the deploy lands, not before.
- **D-12:** `/blog` and `/changelog` lastmod are derived from their newest item (newest post date in the dates module; newest entry in `lib/updates-data.ts`), never hand-maintained and never build time.

### Deploy gate and recrawl record
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sprint plan (source of the requirements and acceptance wording)
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` §"Prioritized implementation backlog" row 14, §"September 13–19: Connect and distribute", §"Technical acceptance checklist" — descriptive anchors (not "learn more"), sitemap contains only canonical URLs with accurate lastmod, URL Inspection confirms rendered HTML, recrawl requests once per materially changed URL after deployment.

### Prior-phase contracts this phase must respect
- `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` — steps 3 to 5: the case study's own atomic sitemap/robots commit, additive contextual link sweep, and one-time recrawl. Phase 5 replaces its step-5 table with a pointer to the single recrawl log (D-15) and otherwise leaves it as the owner of case-study linking (D-08).
- `.planning/phases/04-verified-guild-case-study/04-CONTEXT.md` — D-07 (case study publish is self-contained; Phase 5 proceeds without it).
- `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md` — the 45 approved report strings; new links go around, never inside, these literals (D-04).
- `.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md` — the 18 approved case-study strings; same rule.
- `.planning/phases/02-checkable-conversion-copy/02-CONTEXT.md` — D-16 consolidated copy sign-off pattern and the no-em-dash rule that D-05 reuses.
- `.planning/phases/04-verified-guild-case-study/04-SECURITY.md` — T-04-CR1, T-04-CR2 (open medium items; discretion item above).

### Code and tests that constrain the change
- `app/sitemap.ts` — current hand-typed sitemap; replaced by the dates-module-driven version (D-09).
- `app/__tests__/sitemap.test.ts` — 8 existing assertions (report URL once, no duplicates, stable report lastmod, canonical parity, no `/customers/` entry while unpublished, `listPublishedSlugs()` agreement) that must keep passing.
- `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` and `app/customers/[slug]/__tests__/page.test.tsx` — copy-parity gates and href assertions (`/about`, CSV/JSON, CTA host).
- `scripts/analytics/gsc-auth.py`, `scripts/analytics/pull-gsc.py` — existing GSC OAuth (scope `webmasters.readonly`, site `sc-domain:getlootlist.com`) and reusable `get_access_token()` / `query()` helpers for the inspection half of D-14.
- `lib/public-routes.ts` — `/research` and `/customers` public allowlist; the probe (D-14) must confirm no redirect on these.
- `lib/updates-data.ts` — source for the `/changelog` derived lastmod (D-12).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/components/landing/BlogRelatedPosts.tsx` (`ALL_POSTS` registry): not used for marketing-page links (D-01), but its post registry is a candidate seed for the dates module's blog entries.
- `scripts/analytics/pull-gsc.py` token/query helpers: reusable for a URL Inspection call (`urlInspection.index.inspect`) in the probe or a companion script.
- `app/__tests__/sitemap.test.ts`: extend rather than replace; add dates-module parity and "no `new Date()`" assertions alongside the existing eight.

### Established Patterns
- Copy sign-off via a committed `NN-COPY-DRAFT.md` with `APPROVED-STRING:` markers byte-matched by tests (Phases 3 and 4). Phase 5's link table follows the same shape so a parity test can assert each approved anchor appears exactly once on its page.
- Atomic publish commits (sitemap + robots + test in one commit) from Phase 3/4; the dates module bump for deploy two should be atomic with the link edits.
- Python analytics tooling in `scripts/analytics/` with provenance READMEs (Phases 1 and 3).
- Personal-account git enforcement (PreToolUse guard, pre-push hooks); deploys go through `origin/main` and Vercel.

### Integration Points
- Marketing page bodies: `app/components/landing/*` (homepage sections), `app/compare/page.tsx`, `app/pricing/page.tsx`, `app/about/page.tsx`, `app/blog/<slug>/page.tsx` (hand-written TSX, dates triplicated in metadata + JSON-LD + `<time>`).
- `app/research/wow-classic-loot-systems-2026/page.tsx` and `app/customers/[slug]/sections.tsx`: new connective text for outbound links (D-04).
- Blog date duplication today: `openGraph.publishedTime`, JSON-LD `datePublished`/`dateModified`, rendered `<time>`, `app/blog/page.tsx` `posts` array, and `app/sitemap.ts`. The dates module is the fix (D-09), with a parity test rather than a mass refactor of each page.
- Deploy state: local `main` ahead of `origin/main` by ~92 commits; production serves the pre-sprint build (old sitemap, no report). D-13 makes the baseline push the first plan.

</code_context>

<specifics>
## Specific Ideas

- Anchor examples the user endorsed: "84.8% of guilds weight attendance", "how LootList+ compares to TMB"; the plan's own examples "transparent WoW Classic loot management" and "LootList+ vs That's My BiS".
- The sign-off table should carry, per page: the sentence before/after, the anchor, the target, and a "case-study slot" note (D-08).
- URL Inspection API is read-only diagnostics under the current OAuth scope; "Request indexing" has no API and is clicked by the user (D-16). The sitemap is resubmitted once in GSC in the same session.
- Recrawl log fields: URL, deploy SHA, probe result, inspection result, request date, requester.

</specifics>

<deferred>
## Deferred Ideas

- Nav/footer "Research" entry: not discussed as a link surface; if wanted it is a navigation change, not a contextual link, and belongs in a later pass.
- Blog post date refactor (single source for metadata, JSON-LD, `<time>`, listing array): the dates module plus parity test covers the sitemap need; consolidating the per-page copies is a cleanup for later.
- `/customers` index page: still deferred from Phase 4 D-02.

### Reviewed Todos (not folded)
Keyword matches only; carrying forward the Phase 3/4 review unchanged:
- **Rework /compare search snippet for competitor queries** — folded into Phase 2 (D-11) and shipped; todo file can be archived.
- **Fix "loot list" query cannibalization (changelog vs homepage)** — folded into Phase 2 (D-09/D-10) and shipped; todo file can be archived.
- **Explore top-of-funnel and paid ads strategy** — deferred by the user until after the sprint.
- **Review PostHog data for growth experiments** — same deferral.

</deferred>

---

*Phase: 05-internal-authority-recrawl*
*Context gathered: 2026-09-07*
