---
phase: 04-verified-guild-case-study
verified: 2026-09-06T23:10:00Z
status: human_needed
score: 15/15 must-haves verified (excludes 2 roadmap success criteria intentionally checkpoint-gated, see below)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Start `npm run dev` and open `/customers/example-guild-fixture` (or use a working `.env.local`). Confirm: (1) the four proof-strip figures are the most visually dominant element below the H1, (2) the H1 wraps at a single 32px size on narrow and wide windows, (3) the before/after panels sit side by side on desktop and stack on mobile with no clipped text, (4) the limitation section reads as honest, not alarming, and carries no accent or destructive color, (5) the quote block matches the homepage testimonial look, (6) there is exactly one filled accent create-your-guild button, (7) no horizontal scrollbar appears at any width."
    expected: "Layout and hierarchy match 04-UI-SPEC.md's Focal Point, Typography, and Color contracts as judged by eye; this is the D6/D7 coverage item both 04-01-SUMMARY.md and 04-03-SUMMARY.md explicitly could not complete in their sandboxed environment (missing `.env.local` makes every route, not only this one, 500 under `npm run dev`; confirmed independently during this verification via `npm run build`, which reproduces the identical `NEXT_PUBLIC_SUPABASE_URL is required` failure)."
    why_human: "Visual hierarchy, spacing, and 'does the limitation read as honest rather than alarming' are judgment calls no automated test can substitute for; jsdom-rendered assertions (61 passing tests) prove the DOM shape and class lists are correct but not how the page actually looks in a browser."
---

# Phase 4: Verified Guild Case Study Verification Report

**Phase Goal:** One real guild's before-and-after story is published as proof, with content that guild approved
**Verified:** 2026-09-06
**Status:** human_needed
**Re-verification:** No, initial verification

## Context: The Checkpoint Governs This Verification

The ROADMAP's Phase 4 checkpoint is explicit: *"EVID-05 is blocked on the user conducting the guild interview... If the interview has not happened when this phase runs, ship the template, leave the case study unpublished, and record the block in STATE.md. Do not draft or infer customer quotes, guild names, or outcome numbers."*

The interview has not happened (confirmed: no `04-APPROVAL-RECORD.md` exists anywhere in the phase directory or repo). This means Success Criteria 3 and 4 (a published, guild-approved case study, and the page demonstrating verification of a real outcome) are **designed to be unmet at this point in the milestone**, not gaps in execution. This report verifies (a) that Success Criteria 1 and 2's template-half are actually true in the codebase, and (b) that the block on 3 and 4 is recorded honestly with zero fabricated guild-specific content anywhere in the repository.

## Goal Achievement

### Observable Truths (In Scope Now)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A reusable page template renders at `/customers/{slug}` with an outcome-focused H1, proof strip, before/after narrative, and a credible-limitation section (SC1) | ✓ VERIFIED | `app/customers/[slug]/page.tsx` composes `ProofStrip`, `NarrativePanels`, `LimitationSection`, `ContextualCta` from `app/customers/[slug]/sections.tsx`; 61 passing tests in `app/customers/[slug]/__tests__/page.test.tsx` assert the H1, all four proof-strip blocks, both narrative panels, and the limitation section render from the fixture entry |
| 2 | Page is self-canonical, metadata matches visible content, structured data agrees with the rendered H1 (SC2, template half) | ✓ VERIFIED | `generateMetadata` sets `alternates.canonical` to `https://www.getlootlist.com/customers/<slug>`; Article JSON-LD `headline` is computed from the same `resolveH1()` call as the rendered `<h1>`, so title/H1/JSON-LD cannot drift; tests parse the structured data and assert exactly two objects (Article, BreadcrumbList), no Review/AggregateRating at any depth |
| 3 | Sitemap entry for the case study is deliberately absent while unpublished, with a test that fails if one appears (SC2's sitemap half, explicitly deferred to publish time per the plan) | ✓ VERIFIED | `app/sitemap.ts` contains zero `/customers/` entries (grep-verified); `app/__tests__/sitemap.test.ts` asserts `CUSTOMERS_PATH_FRAGMENT` never appears and that `listPublishedSlugs()` (currently `[]`) agrees 1:1 with sitemap entries, the guard activates automatically the moment a slug is published |
| 4 | Zero production reachability: an empty published registry means a production build emits no case-study URL | ✓ VERIFIED | `publishedCaseStudies` in `data/case-studies/index.ts` is `[]`; `dynamicParams = false`; ran `npm run build` independently during this verification, Turbopack compile and TypeScript phases both succeed, and `.next/server/app/customers/[slug]/` contains only the compiled route module with no generated static HTML for any slug (confirmed by direct filesystem inspection) |
| 5 | The quote block reuses the homepage's own `QuoteCard`/`VerificationLine` components rather than a re-implementation | ✓ VERIFIED | `app/customers/[slug]/page.tsx` imports `QuoteCard` from `@/app/components/landing/LandingValueProps`; that file's exports (`TestimonialVerification`, `QuoteAuthor`, `VerificationLine`, `QuoteCard`) were confirmed present by direct grep, and the pre-existing `LandingValueProps.test.tsx` (14 tests) still passes, proving the export-widening broke nothing on the homepage |
| 6 | Outbound guild profile links carry `rel="noopener noreferrer"` | ✓ VERIFIED | Read `QuoteCard`'s anchor directly: `target="_blank" rel="noopener noreferrer"` is present on the `wcl_link` branch |
| 7 | A proof-strip stat the interview did not collect produces no block at all, never a placeholder, dash, or invented value (D-05) | ✓ VERIFIED | `ProofStrip` in `sections.tsx` filters candidates by non-empty figure before rendering; tests assert a three-block render for both a start-position (roster) and end-position (tenure) omission, with no not-applicable marker |
| 8 | Every visible string on the page byte-matches an `APPROVED-STRING` value in the signed-off `04-COPY-DRAFT.md` | ✓ VERIFIED | The test file's own "Copy-fidelity parity" describe block reads `04-COPY-DRAFT.md` from disk at test time (not a hardcoded literal) and asserts every `APPROVED-STRING` line's value appears verbatim in `page.tsx`'s source, this is a genuine regression-proof gate, not a one-time check |
| 9 | No guild content is or can be sourced from the production database (D-03 privacy boundary) | ✓ VERIFIED | `grep -rli 'supabase' data/case-studies app/customers` returns no files |
| 10 | Slug resolution is exact ASCII equality with no case-folding, Unicode-normalization, or percent-decoding ambiguity | ✓ VERIFIED | `CASE_STUDY_SLUG_PATTERN` and `requireCaseStudy`'s exact-match lookup are tested against a case-differing slug and a percent-encoded slug, both rejected |
| 11 | The interview kit carries the ten verbatim questions plus the two proof-strip additions and a written-approval checklist, with zero fabricated example content | ✓ VERIFIED | Read `04-INTERVIEW-KIT.md` in full: all ten questions present verbatim with page-section notes, questions 11–12 added and clearly labelled, D-03's product-data-consent-boundary warning present, written-approval checklist covers quote/guild name/byline/expansion/each number/linking permission, explicit "no example answer... no sample guild" closing statement, zero em dashes |
| 12 | The copy draft is signed off, holds all 18 approved strings and 13 content tokens, with zero guild-specific literals | ✓ VERIFIED | Read `04-COPY-DRAFT.md` in full: `STATUS: APPROVED` (line 1), `SIGN-OFF: APPROVED 2026-09-06` present, all 13 `CONTENT-TOKEN` and 18 `APPROVED-STRING` lines present and byte-identical to what `page.tsx`'s `APPROVED_STRINGS` record uses, closing line explicitly disclaims guild names/quotes/figures |
| 13 | The publish runbook is self-contained and describes an atomic robots+sitemap+test-swap commit, contextual link sweep, and one-time recrawl discipline with rollback | ✓ VERIFIED | Read `04-PUBLISH-RUNBOOK.md` in full: entry gate on written approval, 6 numbered steps naming real identifiers (`publishedCaseStudies`, `app/sitemap.ts`, `app/__tests__/sitemap.test.ts`), explicit "one commit, not three" rationale, per-URL recrawl log table, full rollback procedure |
| 14 | `STATE.md` and `REQUIREMENTS.md` honestly record EVID-05 as blocked, not resolved, naming the unblocking artifacts | ✓ VERIFIED | `STATE.md` line 131: not struck through, states template shipped with empty registry / zero production reachability, names both `04-INTERVIEW-KIT.md` and `04-PUBLISH-RUNBOOK.md`. `REQUIREMENTS.md`: `EVID-05` checkbox unchecked, traceability row reads "Blocked (user interview)", blocked-on-user-action bullet dated 2026-09-06 pointing at the runbook. `EVID-04` row correctly marked Complete |
| 15 | No em dash anywhere in any phase-touched file; full suite, typecheck, and scoped tests all pass; build fails only at the pre-existing unrelated baseline | ✓ VERIFIED | Ran independently: `npx vitest run` on the three phase test files (61/61 pass), `npm test` (887/887 pass), `npm run typecheck` (clean), `npm run build` (Turbopack + TypeScript succeed, fails only at `/api/guild-count`'s pre-existing `NEXT_PUBLIC_SUPABASE_URL is required` prerender error, reproduces the exact failure documented in 03-06-SUMMARY.md and 04-01/04-03-SUMMARY.md); em-dash grep across all phase-touched source and planning files returns nothing |

**Score:** 15/15 in-scope truths verified.

### Roadmap Success Criteria 3 & 4, Checkpoint-Gated (Excluded From Pass/Fail Scoring)

| Criterion | Status | Why This Is Not a Gap |
|-----------|--------|------------------------|
| SC3: "One case study is published using quotes, numbers, and identifying details the interviewed guild approved in writing" | Not met, by design | The ROADMAP's own Phase 4 checkpoint instructs: if the interview has not happened, ship the template and record the block, rather than publish. The interview has not happened (no `04-APPROVAL-RECORD.md` exists). Publishing here would require exactly the fabrication the checkpoint forbids. |
| SC4: "The page shows how the story was verified... and claims no outcome the interview did not support" | Not applicable yet, mechanism proven, no live content | The verification-line mechanism (`VerificationLine`, three outcome variants) is proven end-to-end on the fixture and unit-tested; it cannot be evaluated against a real guild's claims because no real guild's claims exist in the registry yet. |

Both are honestly and legibly recorded as blocked in `STATE.md` and `REQUIREMENTS.md` (Truth #14 above), not silently passed over or overstated as complete.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `data/case-studies/types.ts` | `CaseStudy` contract | ✓ VERIFIED | 62 lines, exports `CaseStudy`, `CaseStudyTitle`, `CaseStudyProofStrip`, interview-sourced-only header comment present |
| `data/case-studies/index.ts` | Published registry (empty), fixture gate, slug guard | ✓ VERIFIED | `publishedCaseStudies = []`, `isFixtureRouteEnabled()`, `listRoutableCaseStudies()`, `listPublishedSlugs()`, `requireCaseStudy()`, `CASE_STUDY_SLUG_PATTERN` all present and match plan spec exactly |
| `data/case-studies/example-guild-fixture.ts` | Dev-only labelled fixture | ✓ VERIFIED | Guild name literally "Example Guild (Fixture)", author "Fixture Officer", unmistakably not real customer content |
| `app/customers/[slug]/page.tsx` | Complete dynamic route | ✓ VERIFIED | 320 lines; `generateStaticParams`, `generateMetadata`, `dynamicParams`, `APPROVED_STRINGS`, `resolveTokens`, `approved`, `Eyebrow`, JSON-LD, full section composition all present |
| `app/customers/[slug]/sections.tsx` | Presentational sections | ✓ VERIFIED | 187 lines; exports `ProofStrip`, `NarrativePanels`, `buildBylineMeta`, `LimitationSection`, `ContextualCta`, all holding no copy of their own (props-only) |
| `app/customers/[slug]/__tests__/page.test.tsx` | Full test coverage | ✓ VERIFIED | 531 lines, 42 `it(` blocks across 10 `describe` blocks, all passing |
| `.planning/phases/04-verified-guild-case-study/04-INTERVIEW-KIT.md` | Interview kit | ✓ VERIFIED | 68 lines, all required content present |
| `.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md` | Signed-off copy | ✓ VERIFIED | 119 lines, `STATUS: APPROVED`, `SIGN-OFF: APPROVED 2026-09-06` |
| `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` | Publish path | ✓ VERIFIED | 81 lines, all six steps plus entry gate and rollback present |
| `.planning/phases/04-verified-guild-case-study/COVERAGE.md` | No-external-API declaration | ✓ VERIFIED | 1 substantive line, correctly declares no external API integration |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `app/customers/[slug]/page.tsx` | `data/case-studies/index.ts` | `requireCaseStudy`/`listRoutableCaseStudies` imports | ✓ WIRED | Confirmed by direct import read and passing tests |
| `app/customers/[slug]/page.tsx` | `app/components/landing/LandingValueProps.tsx` | `QuoteCard` import | ✓ WIRED | Confirmed by direct import read; homepage's own component, not a copy |
| `data/case-studies/index.ts` | `app/sitemap.ts` | `listPublishedSlugs()` agreement test | ✓ WIRED | `sitemap.test.ts` imports `listPublishedSlugs` directly and asserts 1:1 agreement (currently vacuous, activates on first publish) |
| `.planning/.../04-COPY-DRAFT.md` | `app/customers/[slug]/page.tsx` | Dynamic file-read parity test | ✓ WIRED | Confirmed: the parity test reads the actual markdown file at test run time, not a snapshot |
| `.planning/.../04-INTERVIEW-KIT.md` | `.planning/.../04-COPY-DRAFT.md` | Shared token vocabulary (roster size, expansion/tier, months using) | ✓ WIRED | Confirmed by cross-reading both files: kit's questions 11–12 collect exactly the fields the draft's tokens declare |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Scoped case-study/sitemap/LandingValueProps tests pass | `npx vitest run 'app/customers/[slug]/__tests__/page.test.tsx' app/__tests__/sitemap.test.ts app/components/landing/__tests__/LandingValueProps.test.tsx` | 3 files, 61 tests, all passed | ✓ PASS |
| Full test suite passes | `npm test` | 49 files, 887 tests, all passed | ✓ PASS |
| Typecheck clean | `npm run typecheck` | exit 0, no output | ✓ PASS |
| Build compiles/typechecks; fails only at documented pre-existing baseline | `npm run build` | Compiled in 4.6s, TypeScript in 11.6s, fails at `/api/guild-count` prerender (`NEXT_PUBLIC_SUPABASE_URL is required`) | ✓ PASS (matches documented baseline) |
| Zero static output for any `/customers/{slug}` page after build | `find .next/server/app/customers -name '*.html'` | No output | ✓ PASS |
| No `/customers/` entry in sitemap | `grep -c '/customers/' app/sitemap.ts` | 0 | ✓ PASS |
| No Supabase import in case-study code | `grep -rli supabase data/case-studies app/customers` | No files | ✓ PASS |
| No em dash in phase-touched files | `grep -rn ', ' data/case-studies 'app/customers/[slug]' .planning/phases/04-.../*.md` | No output | ✓ PASS |
| No clipping utility classes outside comments | `grep -vE "^\s*(//\|\*)" page.tsx sections.tsx \| grep -ci 'line-clamp\|truncate'` | 0 | ✓ PASS |
| Commits referenced in SUMMARYs exist | `git log --oneline --all \| grep <hash>` for all 8 task commits | All 8 found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EVID-04 | 04-01, 04-02, 04-03 | Case study page template exists at `/customers/{guild-slug}` following the plan's format | ✓ SATISFIED | Template complete, tested, self-contained, zero production reachability; `REQUIREMENTS.md` correctly marks it Complete |
| EVID-05 | 04-04 | Case study is published with user-approved interview content | ✗ BLOCKED (by design, per checkpoint) | Honestly recorded as blocked in `STATE.md` and `REQUIREMENTS.md`; not silently marked done; unblock path documented |

No orphaned requirements: `REQUIREMENTS.md`'s traceability table maps exactly EVID-04 and EVID-05 to Phase 4, and both are addressed by this phase's plans (04-01/02/03 declare `requirements: [EVID-04]`; 04-04 declares `requirements: [EVID-05]`).

### Anti-Patterns Found

None. Scanned all phase-created/modified files (`data/case-studies/*`, `app/customers/[slug]/*`, all four `.md` planning artifacts written by this phase) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER`, "not yet implemented", "coming soon", and hardcoded-empty stub patterns. Zero findings. The one place a value is deliberately empty (`publishedCaseStudies = []`) is the documented, tested, intentional mechanism for keeping the route unreachable, not a stub, it is exercised by dedicated tests on both sides (empty-array production build, and the sitemap-agreement test).

### Human Verification Required

1. **Visual review of the rendered case-study template**
   **Test:** Start `npm run dev` (with a working `.env.local`) and open `/customers/example-guild-fixture`. Judge layout, hierarchy, wrapping, and color treatment against the seven checklist items in `04-03-PLAN.md`'s `<human-check>` block (proof-strip dominance, H1 wrapping, panel stacking, limitation reading as honest not alarming, quote-block visual parity with the homepage, exactly one filled CTA button, no horizontal scroll at any width).
   **Expected:** All seven items hold visually.
   **Why human:** This is a pure visual/hierarchy judgment call. Both `04-01-SUMMARY.md` (D6) and `04-03-SUMMARY.md` (D7) explicitly flag this as undone in their sandboxed environment because `npm run dev` returns 500 on every route (not only this one) without a materialized `.env.local` supplying Supabase credentials. This verification independently reproduced the same root-cause failure via `npm run build`'s identical `NEXT_PUBLIC_SUPABASE_URL is required` error, confirming the blocker is real, environment-wide, and not specific to this phase's code.

### Gaps Summary

No gaps found. Every truth that is in scope for this phase at this point in the milestone (the template, its tests, its copy-fidelity gate, the interview kit, the copy sign-off, the publish runbook, and the honest blocker record) is verified present, substantive, wired, and passing. The two roadmap success criteria that remain unmet (a published case study, and its verification claims) are unmet by explicit design per the ROADMAP's own Phase 4 checkpoint, the user has not yet conducted the guild interview, and that block is recorded honestly rather than glossed over. The only open item is a human visual review of the rendered template, which cannot run in this sandboxed environment for reasons unrelated to this phase's code (a repo-wide missing `.env.local`), and which was already correctly identified and flagged by the phase's own executors rather than hidden.

---

*Verified: 2026-09-06*
*Verifier: Claude (gsd-verifier)*
