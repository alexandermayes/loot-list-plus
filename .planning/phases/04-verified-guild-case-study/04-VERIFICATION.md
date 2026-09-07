---
phase: 04-verified-guild-case-study
verified: 2026-09-07T06:05:00Z
status: passed
score: 18/18 must-haves verified (excludes 2 roadmap success criteria intentionally checkpoint-gated, see below)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 15/15
  gaps_closed:
    - "G-04-1: proof-strip figures overflowed and clipped their cards at the fixed 42px size"
    - "G-04-3: the lead paragraph and meta description doubled the roster-size unit ('28-player-player')"
    - "G-04-2: /research and /customers redirected logged-out visitors and crawlers to the landing page instead of serving 200"
  gaps_remaining: []
  regressions: []
---

# Phase 4: Verified Guild Case Study Verification Report

**Phase Goal:** One real guild's before-and-after story is published as proof, with content that guild approved
**Verified:** 2026-09-07
**Status:** passed
**Re-verification:** Yes, after gap closure (04-05-PLAN.md plus quick task 260906-ure)

## Context: The Checkpoint Still Governs This Verification

The ROADMAP's Phase 4 checkpoint is explicit: *"EVID-05 is blocked on the user conducting the guild interview... If the interview has not happened when this phase runs, ship the template, leave the case study unpublished, and record the block in STATE.md. Do not draft or infer customer quotes, guild names, or outcome numbers."*

The interview still has not happened (confirmed: no `04-APPROVAL-RECORD.md` exists anywhere in the phase directory or repo). Success Criteria 3 and 4 (a published, guild-approved case study, and the page demonstrating verification of a real outcome) remain **designed to be unmet at this point in the milestone**, not gaps in execution. This report re-verifies (a) that Success Criteria 1 and 2's template-half are still true in the codebase after the three gap closures, (b) that the three UAT-found defects (G-04-1, G-04-2, G-04-3) are actually fixed rather than merely claimed fixed, and (c) that the block on SC3/SC4 remains recorded honestly with zero fabricated guild-specific content anywhere in the repository.

## What Changed Since the Prior Report

The prior report's single open item was a human visual review, deferred because the sandboxed execution environment had no working `.env.local`. That review has since happened (04-UAT.md: 2 tests, 2 passed, 0 issues) and found and closed three real defects:

- **G-04-1** (blocker): every proof-strip figure overflowed its card at a fixed 42px size (`scrollWidth` 155 to 238 vs `clientWidth` 142). Closed by 04-05-PLAN.md's `proofFigureSizeClass()` length-aware sizing (42/32/20px), a `min-w-0 break-words` shrink-and-wrap backstop, and a grid that steps to four columns at `lg` instead of `md`.
- **G-04-3** (major): the lead paragraph rendered "a 28-player-player Cataclysm Classic Tier 11 guild" (doubled unit). Closed by correcting the fixture's `size` field from `'28-player'` to `'28'` and adding `CASE_STUDY_SIZE_PATTERN`, a module-load guard that throws if any entry's `size` carries its own unit.
- **G-04-2** (blocker, found during environment setup, not in the original checklist): `proxy.ts`'s inline `isPublicRoute` allowlist never listed `/research` or `/customers`, so both the Phase 3 report and this phase's case-study template 307-redirected logged-out visitors and crawlers to the landing page, which would have made Success Criteria 1 and 2 true in the code but unreachable by the audience they exist for. Closed by quick task `260906-ure`: an extracted, tested `isPublicPathname()` predicate in `lib/public-routes.ts`, wired into `proxy.ts`, using exact-or-child boundary matching so `/researchers` and `/customersecret` stay gated.

All three fixes were independently re-verified in this pass, not accepted on the SUMMARY's word alone (see Truths 16 to 18 below).

## Goal Achievement

### Observable Truths (In Scope Now)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A reusable page template renders at `/customers/{slug}` with an outcome-focused H1, proof strip, before/after narrative, and a credible-limitation section (SC1) | ✓ VERIFIED | `app/customers/[slug]/page.tsx` composes `ProofStrip`, `NarrativePanels`, `LimitationSection`, `ContextualCta` from `app/customers/[slug]/sections.tsx`; the scoped test file now carries 64 passing tests (up from 61) asserting the H1, all four proof-strip blocks (including the new length-aware sizing), both narrative panels, and the limitation section render from the fixture entry |
| 2 | Page is self-canonical, metadata matches visible content, structured data agrees with the rendered H1 (SC2, template half) | ✓ VERIFIED | `generateMetadata` sets `alternates.canonical` to `https://www.getlootlist.com/customers/<slug>`; Article JSON-LD `headline` is computed from the same `resolveH1()` call as the rendered `<h1>`; unchanged and still passing |
| 3 | Sitemap entry for the case study is deliberately absent while unpublished, with a test that fails if one appears (SC2's sitemap half) | ✓ VERIFIED | `app/sitemap.ts` contains zero `/customers/` entries (`grep -c '/customers/' app/sitemap.ts` returns 0, re-run this pass); `app/__tests__/sitemap.test.ts` still asserts `listPublishedSlugs()` agreement |
| 4 | Zero production reachability: an empty published registry means a production build emits no case-study URL | ✓ VERIFIED | `publishedCaseStudies` in `data/case-studies/index.ts` is still `[]`; `dynamicParams = false`; ran `npm run build` independently this pass, Turbopack and TypeScript phases succeed, `.next/server/app/customers/[slug]/` contains only the compiled route module and manifests, zero `.html` files under `.next/server/app/customers` (`find` returned nothing) |
| 5 | The quote block reuses the homepage's own `QuoteCard`/`VerificationLine` components rather than a re-implementation | ✓ VERIFIED | `page.tsx` still imports `QuoteCard` from `@/app/components/landing/LandingValueProps`; `LandingValueProps.test.tsx` still passes untouched |
| 6 | Outbound guild profile links carry `rel="noopener noreferrer"` | ✓ VERIFIED | Unchanged since prior verification; re-confirmed by direct read of `QuoteCard`'s anchor |
| 7 | A proof-strip stat the interview did not collect produces no block at all, never a placeholder, dash, or invented value (D-05) | ✓ VERIFIED | `ProofStrip` still filters candidates by non-empty figure before rendering; the new `data-proof-figure` selector replaces the old size-class selector in the omit-rule tests, still passing |
| 8 | Every visible string on the page byte-matches an `APPROVED-STRING` value in the signed-off `04-COPY-DRAFT.md` | ✓ VERIFIED | Copy-fidelity parity test still reads `04-COPY-DRAFT.md` from disk at test time; the fixture's `size` field change did not touch any `APPROVED-STRING` value, only a `CONTENT-TOKEN` input, so the gate's scope is unaffected and still passes |
| 9 | No guild content is or can be sourced from the production database (D-03 privacy boundary) | ✓ VERIFIED | `grep -rli 'supabase' data/case-studies app/customers` returns no files, re-run this pass |
| 10 | Slug resolution is exact ASCII equality with no case-folding, Unicode-normalization, or percent-decoding ambiguity | ✓ VERIFIED | `CASE_STUDY_SLUG_PATTERN` and `requireCaseStudy` unchanged, tests still pass |
| 11 | The interview kit carries the ten verbatim questions plus the two proof-strip additions and a written-approval checklist, with zero fabricated example content | ✓ VERIFIED | `04-INTERVIEW-KIT.md` untouched by 04-05 or the quick task (confirmed by `files_modified` in both plans); content unchanged from prior verification |
| 12 | The copy draft is signed off, holds all approved strings and content tokens, with zero guild-specific literals | ✓ VERIFIED | `04-COPY-DRAFT.md` untouched by this round's fixes; `STATUS: APPROVED` and `SIGN-OFF: APPROVED 2026-09-06` still present |
| 13 | The publish runbook is self-contained and describes an atomic robots+sitemap+test-swap commit, contextual link sweep, and one-time recrawl discipline with rollback | ✓ VERIFIED | `04-PUBLISH-RUNBOOK.md` untouched; unchanged from prior verification |
| 14 | `STATE.md` and `REQUIREMENTS.md` honestly record EVID-05 as blocked, not resolved, naming the unblocking artifacts | ✓ VERIFIED | `STATE.md`'s Blockers/Concerns section still records "[Phase 4] Guild interview not conducted; EVID-05 blocked", naming `04-INTERVIEW-KIT.md` and `04-PUBLISH-RUNBOOK.md` as the unblock path; `REQUIREMENTS.md` line 25 keeps the `EVID-05` checkbox unchecked, line 69 reads "Blocked (user interview)", line 85 dates the blocker 2026-09-06 and points at the runbook; `EVID-04` (line 24, line 68) correctly marked complete. No guild name, quote, or outcome number appears anywhere in either file |
| 15 | No em dash anywhere in phase-touched copy and source files; full suite, typecheck, and scoped tests all pass; build fails only at the pre-existing unrelated baseline | ✓ VERIFIED | Ran independently this pass: `npx vitest run` on the four phase test files (89/89 pass, including the new `public-routes.test.ts`), `npm test` (915/915 pass, up from 887), `npm run typecheck` (clean), `npm run build` (Turbopack and TypeScript succeed, fails only at `/api/guild-count`'s pre-existing `NEXT_PUBLIC_SUPABASE_URL is required` prerender error, byte-identical to the documented baseline); em-dash byte search (`\xe2\x80\x94`) across `04-COPY-DRAFT.md`, `04-INTERVIEW-KIT.md`, `04-PUBLISH-RUNBOOK.md`, `COVERAGE.md`, `page.tsx`, `sections.tsx`, all `data/case-studies/*.ts`, `lib/public-routes.ts`, and its test file returns zero matches in every file |
| 16 | G-04-1: every proof-strip figure fits inside its card at every tested width, with a short numeral-led figure still hitting the 42px focal size and a phrase-length figure stepping down instead of clipping | ✓ VERIFIED | Read `proofFigureSizeClass()` in `sections.tsx` directly: digit-led and <=8 chars keeps `text-5xl` (42px), <=16 chars with longest word <=9 steps to `text-4xl` (32px), everything else drops to `text-2xl` (20px); the fixture's actual values (`'28 raiders'`, `'Cataclysm Classic, Tier 11'`, `'6 hours to 45 minutes a week'`, `'5 months using LootList+'`) exercise all three tiers; cards additionally carry `min-w-0 break-words` as a backstop; 04-UAT.md's re-check confirms this behaviorally in a real browser at 1543px ("all four figures fit their cards, scrollWidth equals clientWidth, no horizontal scroll") |
| 17 | G-04-3: the lead paragraph and meta description carry the roster-size unit exactly once, never doubled | ✓ VERIFIED | `data/case-studies/example-guild-fixture.ts` sets `size: '28'` (not `'28-player'`); `APPROVED_STRINGS['page.lead']` and `['page.meta-description']` both append `-player` themselves via the `{size}` token, so the resolved string reads "a 28-player Cataclysm Classic Tier 11 guild"; `data/case-studies/index.ts` adds `CASE_STUDY_SIZE_PATTERN = /^[0-9]+$/` to the same module-load guard loop that already validates slugs, throwing at import time for any future entry whose `size` carries a unit; 04-UAT.md's re-check independently confirms the rendered lead reads correctly in a real browser |
| 18 | G-04-2: a logged-out visitor or crawler reaches `/customers/{slug}` (and `/research`) with HTTP 200, while protected app routes and lookalike paths stay gated | ✓ VERIFIED | Read `lib/public-routes.ts`'s `isPublicPathname()` directly: admits `/customers` and `/customers/*` and `/research` and `/research/*` via exact-or-child boundary checks (not bare `startsWith`), confirmed wired into `proxy.ts` at line 298; `lib/__tests__/public-routes.test.ts` (12 tests) asserts the new paths, every previously-public path, still-gated app routes, and the `/researchers`/`/customersecret` lookalike boundary; independently curled `http://localhost:3100/customers/example-guild-fixture` this pass and got `200`, while `http://localhost:3100/overview` still returns `307` |

**Score:** 18/18 in-scope truths verified.

### Roadmap Success Criteria 3 & 4, Checkpoint-Gated (Excluded From Pass/Fail Scoring)

| Criterion | Status | Why This Is Not a Gap |
|-----------|--------|------------------------|
| SC3: "One case study is published using quotes, numbers, and identifying details the interviewed guild approved in writing" | Not met, by design | The ROADMAP's own Phase 4 checkpoint instructs: if the interview has not happened, ship the template and record the block, rather than publish. The interview has still not happened (no `04-APPROVAL-RECORD.md` exists). Publishing here would require exactly the fabrication the checkpoint forbids. |
| SC4: "The page shows how the story was verified... and claims no outcome the interview did not support" | Not applicable yet, mechanism proven, no live content | The verification-line mechanism (`VerificationLine`, three outcome variants) is proven end-to-end on the fixture and unit-tested; it cannot be evaluated against a real guild's claims because no real guild's claims exist in the registry yet. |

Both remain honestly and legibly recorded as blocked in `STATE.md` and `REQUIREMENTS.md` (Truth #14 above), not silently passed over or overstated as complete.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `data/case-studies/types.ts` | `CaseStudy` contract, `size` field documented as bare count | ✓ VERIFIED | Doc comment on `size` now names the unit rule and the enforcing guard, added by 04-05 |
| `data/case-studies/index.ts` | Published registry (empty), fixture gate, slug guard, size guard | ✓ VERIFIED | `publishedCaseStudies = []`; `CASE_STUDY_SIZE_PATTERN` added alongside the pre-existing `CASE_STUDY_SLUG_PATTERN`, both enforced in the same module-load loop |
| `data/case-studies/example-guild-fixture.ts` | Dev-only labelled fixture, corrected `size` | ✓ VERIFIED | `size: '28'` (was `'28-player'`); guild name still literally "Example Guild (Fixture)", unmistakably not real customer content |
| `app/customers/[slug]/page.tsx` | Complete dynamic route | ✓ VERIFIED | Unchanged by the gap-closure plans; `generateStaticParams`, `generateMetadata`, `dynamicParams`, `APPROVED_STRINGS`, `resolveTokens`, `approved`, `Eyebrow`, JSON-LD, full section composition all present and re-read this pass |
| `app/customers/[slug]/sections.tsx` | Presentational sections with length-aware proof-strip sizing | ✓ VERIFIED | `proofFigureSizeClass()` exported alongside the pre-existing `ProofStrip`, `NarrativePanels`, `buildBylineMeta`, `LimitationSection`, `ContextualCta`; cards gained `min-w-0 break-words`; grid steps to four columns at `lg` |
| `app/customers/[slug]/__tests__/page.test.tsx` | Full test coverage | ✓ VERIFIED | 64 tests in the scoped file (up from 61), covering the size-tier table, the shrink/wrap backstop, and the exactly-once unit assertion |
| `lib/public-routes.ts` | Extracted, tested public-route predicate | ✓ VERIFIED | New file; `isPublicPathname()` and `exactPublicPaths` exported, framework-free (no `next/server` import), imported by `proxy.ts` |
| `lib/__tests__/public-routes.test.ts` | Regression coverage for the public-route predicate | ✓ VERIFIED | 12 tests: newly-public paths, previously-public paths, still-gated app routes, lookalike-prefix boundary |
| `.planning/phases/04-verified-guild-case-study/04-INTERVIEW-KIT.md` | Interview kit | ✓ VERIFIED | Unchanged from prior verification |
| `.planning/phases/04-verified-guild-case-study/04-COPY-DRAFT.md` | Signed-off copy | ✓ VERIFIED | Unchanged from prior verification |
| `.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md` | Publish path | ✓ VERIFIED | Unchanged from prior verification |
| `.planning/phases/04-verified-guild-case-study/COVERAGE.md` | No-external-API declaration | ✓ VERIFIED | Unchanged from prior verification |
| `.planning/phases/04-verified-guild-case-study/04-UAT.md` | Human UAT record | ✓ VERIFIED | `status: complete`, 2 tests, 2 passed, 0 issues; both gaps and their resolving plans/commits recorded |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `app/customers/[slug]/page.tsx` | `data/case-studies/index.ts` | `requireCaseStudy`/`listRoutableCaseStudies` imports | ✓ WIRED | Confirmed by direct import read and passing tests |
| `app/customers/[slug]/page.tsx` | `app/components/landing/LandingValueProps.tsx` | `QuoteCard` import | ✓ WIRED | Confirmed by direct import read |
| `data/case-studies/index.ts` | `app/sitemap.ts` | `listPublishedSlugs()` agreement test | ✓ WIRED | Still vacuous (empty registry), activates on first publish |
| `.planning/.../04-COPY-DRAFT.md` | `app/customers/[slug]/page.tsx` | Dynamic file-read parity test | ✓ WIRED | Confirmed: the parity test reads the actual markdown file at test run time |
| `proxy.ts` | `lib/public-routes.ts` | `isPublicPathname(pathname)` call at line 298 | ✓ WIRED | Confirmed by direct read of `proxy.ts` around line 298 and by the passing regression suite; independently confirmed by curl (`/customers/example-guild-fixture` → 200, `/overview` → 307) |
| `data/case-studies/example-guild-fixture.ts` | `data/case-studies/index.ts`'s `CASE_STUDY_SIZE_PATTERN` | Module-load validation loop | ✓ WIRED | The guard runs at import time over every entry in `publishedCaseStudies` and the fixture array; a reverted fixture value would fail every test that imports the module, not just a dedicated unit test |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Scoped case-study/sitemap/LandingValueProps/public-routes tests pass | `npx vitest run 'app/customers/[slug]/__tests__/page.test.tsx' app/__tests__/sitemap.test.ts app/components/landing/__tests__/LandingValueProps.test.tsx lib/__tests__/public-routes.test.ts` | 4 files, 89 tests, all passed | ✓ PASS |
| Full test suite passes | `npm test` | 50 files, 915 tests, all passed | ✓ PASS |
| Typecheck clean | `npm run typecheck` | exit 0, no output | ✓ PASS |
| Build compiles/typechecks; fails only at documented pre-existing baseline | `npm run build` | Compiled in 16.9s, TypeScript in 39.9s, fails at `/api/guild-count` prerender (`NEXT_PUBLIC_SUPABASE_URL is required`) | ✓ PASS (matches documented baseline, byte-identical error) |
| Zero static output for any `/customers/{slug}` page after build | `find .next/server/app/customers -name '*.html'` | No output | ✓ PASS |
| No `/customers/` entry in sitemap | `grep -c '/customers/' app/sitemap.ts` | 0 | ✓ PASS |
| No Supabase import in case-study code | `grep -rli supabase data/case-studies app/customers` | No files | ✓ PASS |
| No em dash in phase-touched copy/source files | `grep -c $'\xe2\x80\x94'` across the 4 planning artifacts + 7 source/test files | 0 in every file | ✓ PASS |
| Logged-out visitor reaches the case-study page | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/customers/example-guild-fixture` | `200` | ✓ PASS |
| Protected app route still gated | `curl -s -o /dev/null -w '%{http_code}' http://localhost:3100/overview` | `307` | ✓ PASS |
| Commits referenced in SUMMARYs exist | `git log --oneline --all` for `6d9eb76`, `20cf110`, `9bf3e98`, `e16de7e` | All 4 found | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| EVID-04 | 04-01, 04-02, 04-03, 04-05 | Case study page template exists at `/customers/{guild-slug}` following the plan's format | ✓ SATISFIED | Template complete, tested, self-contained, zero production reachability, and now free of the two UAT-found rendering defects; `REQUIREMENTS.md` correctly marks it Complete |
| EVID-05 | 04-04 | Case study is published with user-approved interview content | ✗ BLOCKED (by design, per checkpoint) | Honestly recorded as blocked in `STATE.md` and `REQUIREMENTS.md`; not silently marked done; unblock path documented |

No orphaned requirements: `REQUIREMENTS.md`'s traceability table maps exactly EVID-04 and EVID-05 to Phase 4. All five plans declare their requirement: 04-01/02/03/05 declare `requirements: [EVID-04]`, 04-04 declares `requirements: [EVID-05]`. The quick task that closed G-04-2 (`260906-ure`) is not itself a phase plan and carries no `requirements:` field of its own, but its fix is a precondition for EVID-04's success criteria (a template nobody outside a session can reach does not satisfy "renders at `/customers/{guild-slug}`" in the sense the roadmap intends), so it is folded into EVID-04's evidence above rather than left as an untracked side effect.

### Anti-Patterns Found

None. Scanned all phase-created/modified files (`data/case-studies/*`, `app/customers/[slug]/*`, `lib/public-routes.ts`, `lib/__tests__/public-routes.test.ts`, all four `.md` planning artifacts) for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER`, "not yet implemented", "coming soon", and hardcoded-empty stub patterns. Zero findings. `publishedCaseStudies = []` remains the documented, tested, intentional mechanism for keeping the route unreachable, not a stub.

### Human Verification Required

None. The prior report's single open item (visual review of the rendered template) is closed: 04-UAT.md records it complete, with the two defects it surfaced (G-04-1, G-04-3) resolved by 04-05-PLAN.md and re-checked visually in a real browser at 1543px ("all four figures fit their cards, scrollWidth equals clientWidth, sizes 32/20/20/20px, no horizontal scroll, lead reads a 28-player Cataclysm Classic Tier 11 guild"). No new visual concern was raised in the re-check.

### Gaps Summary

No gaps found. Every truth in scope for this phase at this point in the milestone, including the three UAT-found defects and their fixes, is verified present, substantive, wired, and passing, independently of the SUMMARY.md and UAT narration. The two roadmap success criteria that remain unmet (a published case study, and its verification claims) are unmet by explicit design per the ROADMAP's own Phase 4 checkpoint; the user has not yet conducted the guild interview, and that block is recorded honestly in both `STATE.md` and `REQUIREMENTS.md` rather than glossed over. No guild name, quote, or outcome number is fabricated anywhere in the repository.

---

*Verified: 2026-09-07*
*Verifier: Claude (gsd-verifier)*
