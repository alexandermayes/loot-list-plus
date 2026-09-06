# Publish Runbook: Verified Guild Case Study

**Purpose:** This is the one file whoever publishes the case study needs, once the interview has happened and the guild's written approval is on file. It assumes no other context: not the phase's plan history, not the route's git blame, nothing but this document and the approved interview record. Follow the steps in order. Do not skip the entry gate.

This runbook exists because of D-07: Phase 5 runs its one-time internal-linking and recrawl pass without the case study, since the interview is not scheduled and the roadmap does not hold Phase 5 hostage to it. By the time the interview clears, Phase 5's recrawl request will already have been submitted and spent. The one-request-per-URL discipline (ROADMAP.md LINK-02) means the case study cannot ride along on that pass after the fact. This publish path has to carry everything the case study needs on its own: its own registry entry, its own atomic sitemap and robots commit, its own contextual link sweep, and its own recrawl request.

---

## Entry Gate

Before running step one, confirm the written approval record exists at `.planning/phases/04-verified-guild-case-study/04-APPROVAL-RECORD.md` and every line of the interview kit's Written-Approval Checklist is checked against it. A verbal yes from the interview call is not approval; only the written record is. If any checklist line is unchecked or the file does not exist, stop here. Publishing a named guild's quote, figures, or identity without that written approval on file is publishing on the guild's behalf without permission, which is the exact harm this gate exists to prevent.

---

## Step 1: The Registry Entry

Add one new `CaseStudy` object to the `publishedCaseStudies` array in `data/case-studies/index.ts`. Populate every field only from the approved interview record filed in step zero, never from anywhere else, and never from the guild's own LootList+ product data (D-03). Every field on the `CaseStudy` type in `data/case-studies/types.ts` is required; a value the interview did not produce is a reason to hold publication, not a reason to invent one.

Choose the `title` variant by whether the interview produced both a before-admin-time and an after-admin-time figure: only then does the `preferred` variant apply, because it cannot render without both. Otherwise use the `fallback` variant.

Choose the slug once. It becomes a public URL and, once the recrawl request in step five is submitted, a target search engines have specifically been told to look at. It cannot be casually renamed afterward without a second recrawl for the old and new URLs both. The slug must match `CASE_STUDY_SLUG_PATTERN` in `data/case-studies/index.ts`, the same lowercase, hyphen-separated pattern the fixture entry already satisfies.

Nothing in this entry may be read from the guild's LootList+ account data. Every field traces back to the interview record and nothing else.

## Step 2: Resolving the Copy

The page's `APPROVED_STRINGS` map in `app/customers/[slug]/page.tsx` resolves every `{token}` from the new entry via `tokensFor()`. Confirm the new entry supplies every field that function reads. If any approved string's wording needs to change specifically for this guild, that is a new round of copy sign-off, not an in-place edit: the parity gate that guards this page will fail the moment a live string drifts from what was signed off, and that gate failing is the intended outcome of an unapproved edit, not a bug to work around.

## Step 3: The Atomic Publish Commit

This step is one commit, not three. It contains all of the following together:

1. In `app/customers/[slug]/page.tsx`, remove the `robots` key from the `generateMetadata` return value entirely. Delete the key; do not set `index` to `true`. There is no site-wide robots default this page falls back to, so an absent key is what makes the page indexable, matching the convention the research report page already established.
2. In `app/sitemap.ts`, add one entry for the new case-study URL (`https://www.getlootlist.com/customers/{slug}`), with `lastModified` set to a literal `new Date(YYYY, M, D)` using the actual ship date in this repo's zero-indexed month convention (month 8 is September, following the pattern already used for the report page's entry), `changeFrequency: 'monthly'`, and `priority: 0.9` to match the report and blog entries.
3. In `app/__tests__/sitemap.test.ts`, swap the `CUSTOMERS_PATH_FRAGMENT` absence assertion (the test named `'contains no /customers/ entry while the case study is unpublished'`) for a single-occurrence assertion on the new canonical URL, mirroring the existing `'lists the report URL exactly once'` test. Also add or extend an assertion, matching the existing `'exposes no robots override on the report page metadata'` test, confirming the case-study page's own metadata carries no robots override once published. The existing `'agrees with listPublishedSlugs(): exactly one sitemap entry per published case-study slug'` test already loops over `publishedCaseStudies` generically; once the registry is non-empty that loop starts exercising the new entry on its own, so it needs no edit, only confirmation that it now passes non-vacuously.

These three changes belong in the same commit and nowhere else. Splitting the robots removal from the sitemap entry leaves a window, however short, in which the page is in one of two wrong states: indexable but unlisted (robots removed, no sitemap entry, so nothing tells a crawler the page exists) or listed but unindexed (sitemap entry present, robots still blocking, so the crawler finds a URL it is told not to index). Either window is a state this runbook does not allow to exist, even briefly, even between two commits pushed seconds apart. Swapping the sitemap test's assertion in the same commit, rather than deleting it outright, is what keeps that guard alive going forward instead of leaving the sitemap permanently unguarded against a future duplicate or a future re-added robots override.

## Step 4: The Contextual Link Sweep

Add descriptive, contextual links to the new case-study URL from the following surfaces, using anchor text specific to what the guild's story demonstrates rather than a generic "learn more" or "read more":

- The homepage
- `/compare`
- `/pricing`
- `/about`
- The research report at `/research/wow-classic-loot-systems-2026`
- The relevant guides in `/blog`

Phase 5 (ROADMAP.md LINK-01/LINK-02) will already have run its own contextual-linking sweep across these same surfaces without the case study, because the case study did not exist yet at that point. This sweep is additive to that pass, not a duplicate of it: it adds the one set of links Phase 5 could not have added. Each page whose links change in this step is itself a materially changed URL and belongs in the recrawl list in step five, alongside the new case-study URL itself.

## Step 5: The One-Time Recrawl

Submit a Search Console URL Inspection recrawl request exactly once for the new case-study URL, and exactly once for each page whose links changed in step four. Do not submit a request more than once for the same URL under any circumstance: repeat requests do not accelerate indexing, and the one-request-per-URL discipline (ROADMAP.md LINK-02) is not a courtesy, it is the rule this whole runbook is built to satisfy without exception.

Record every submitted URL and the date it was submitted in the table below before this step is considered complete, so that nobody reading this runbook after the fact mistakes an already-submitted URL for one still needing a request.

| URL | Submitted (date) |
|-----|-------------------|
| _(fill in at publish time)_ | |

## Step 6: The Record

Update `.planning/STATE.md` to close the EVID-05 blocker entry: state that the case study is published, name the live URL, and remove the blocked framing. Update `.planning/REQUIREMENTS.md`'s traceability row for EVID-05 from Blocked to Complete, and check its requirement box. Note the publish date in both files.

Add a short provenance paragraph to this runbook, below this line, naming where the approval record lives (`.planning/phases/04-verified-guild-case-study/04-APPROVAL-RECORD.md`) and the date it was filed, so a later reader can trace the published page back to its consent record in one step.

---

## Rollback: If the Guild Withdraws Permission

If a guild withdraws permission after publication, make all of the following changes in one commit, mirroring the atomic discipline of step three:

1. Remove the entry from `publishedCaseStudies` in `data/case-studies/index.ts`.
2. Restore the `robots: { index: false, follow: false }` key to `generateMetadata` in `app/customers/[slug]/page.tsx`.
3. Remove the entry from `app/sitemap.ts`.
4. Restore the `CUSTOMERS_PATH_FRAGMENT` absence assertion in `app/__tests__/sitemap.test.ts` (or confirm the generic `listPublishedSlugs()` loop now passes vacuously again with an empty registry).
5. Remove any contextual links added in step four that point at the withdrawn URL.

State plainly: a removed page still needs its own recrawl request. Submitting a page for recrawl once, to have Google notice it disappeared or now 404s, is a new request for that URL, distinct from the original publish-time request in step five, and does not violate the one-request-per-URL rule because the URL's state materially changed again.
