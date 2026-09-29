---
phase: 02-checkable-conversion-copy
plan: 07
subsystem: blog-repositioning-and-phase-close-out
tags: [copy, positioning, seo, blog, phase-verification]
requires:
  - phase: 02-checkable-conversion-copy
    plan: 02
    provides: "D-16 consolidated copy sign-off in 02-COPY-DRAFT.md, including the G1 full-broaden resolution and every APPROVED-STRING value used by this plan"
  - phase: 02-checkable-conversion-copy
    plan: 04
    provides: "LandingCompare.tsx C2b fix, the precedent this plan follows for shipping an orphaned scope-extension item inside an already-owned file"
  - phase: 02-checkable-conversion-copy
    plan: 05
    provides: "app/layout.tsx, app/(landing)/landing/page.tsx, app/changelog/layout.tsx, app/compare/page.tsx repositioned, checked as part of this plan's phase-wide sweep"
  - phase: 02-checkable-conversion-copy
    plan: 06
    provides: "app/about/page.tsx, app/terms/page.tsx, app/privacy/page.tsx, LandingHero.tsx, public/site.webmanifest, README.md repositioned, checked as part of this plan's phase-wide sweep"
provides:
  - "Both blog posts (how-to-run-loot-without-a-spreadsheet, how-to-set-up-a-fair-loot-system-for-your-wow-guild) fully repositioned to World of Warcraft per G1's full-broaden resolution, with one title agreeing across post/index/related-posts/breadcrumb/tracker/H1"
  - "The C2b best-parts superlative fix and the previously-unshipped C2d migration-speed claim fix, both landed"
  - "A verified, whole-phase sweep proof: 14-file residual-allowance parity, approved-string parity, Retail-claim absence, and full suite health, all recorded with real numbers"
affects:
  - "app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx"
  - "app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx"
  - "app/blog/page.tsx"
  - "app/components/landing/BlogRelatedPosts.tsx"
actuals:
  tokens: 1677
  tasks: 4
  commits: 3
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx
    - app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx
    - app/blog/page.tsx
    - app/components/landing/BlogRelatedPosts.tsx
key-decisions:
  - "Applied G1's recorded resolution (Option A, full broaden) exactly: all 6 occurrences in how-to-run-loot-without-a-spreadsheet/page.tsx (title, openGraph.title, JSON-LD headline, breadcrumb name, BlogTracker title prop, on-page H1) changed together in one commit, with no partial state where the page title and H1 disagree."
  - "Shipped C2d (the blog-spreadsheet migration-speed superlative fix) as an unplanned scope extension: Task 3's approved-string parity check found claim.blog-spreadsheet.migration-speed unshipped by any of plans 02-01 through 02-06, and its target file (app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx) is already this plan's own file, so it was closed here rather than left standing — same precedent as 02-04's LandingCompare.tsx C2b scope extension."
  - "Did not fix 3 pre-existing em dashes found in code comments in app/components/landing/LandingHero.tsx and app/layout.tsx during the phase-wide em-dash gate, since neither file is in this plan's declared file_modified scope and neither em-dash line was touched by any diff hunk in the phase (confirmed via git diff against the pre-phase base commit). Reported as an issue per this plan's own deviation-rule instruction not to unilaterally patch other plans' files."
  - "Treated 5 grep -F \"MISSING\" results from the literal approved-string parity check as false positives after manual verification: signup.title (unicode escape \\u2219 vs literal ∙), claim.blog-fair-loot.best-parts and meta.compare.description/repos.app/compare/page.tsx.10 (sentence wraps across JSX lines / escaped apostrophe differs from literal apostrophe — single-line grep -F cannot match either). claim.blog-spreadsheet.migration-speed was flagged for the same line-wrap reason after this plan's own fix landed it."
patterns-established: []
requirements-completed: []
coverage:
  - id: D1
    description: "Both blog posts repositioned per G1's full-broaden resolution: how-to-run-loot-without-a-spreadsheet's 6 occurrences (title/openGraph/headline/breadcrumb/tracker/H1) moved together; how-to-set-up-a-fair-loot-system-for-your-wow-guild's 2 duplicated description occurrences moved together"
    requirement: "PROOF-02"
    verification:
      - kind: unit
        ref: "npm run typecheck; residual-allowance parity check for both files (actual=0, allowed=0 each)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Blog index card and related-posts card titles mirror the post's own final title string byte for byte"
    requirement: "PROOF-02"
    verification:
      - kind: unit
        ref: "node title-read + grep -qF cross-check against app/blog/page.tsx and BlogRelatedPosts.tsx; git diff scoped to title values only"
        status: pass
    human_judgment: false
  - id: D3
    description: "C2b best-parts superlative and C2d migration-speed superlative both replaced with checkable, non-superlative claims"
    requirement: "PROOF-02"
    verification:
      - kind: unit
        ref: "manual sed/grep confirmation of both replaced sentences, preserving the Loot Score emphasis and the untouched trailing/second sentence in each"
        status: pass
    human_judgment: false
  - id: D4
    description: "Whole 13(+1)-file phase sweep proven consistent: per-file and repo-wide residual counts equal approved allowances, no Retail claim exists, full suite is green"
    requirement: "PROOF-02"
    verification:
      - kind: unit
        ref: "manual per-file grep -cE 'WoW Classic|World of Warcraft Classic' against all 14 RESIDUAL-ALLOWANCE files (actual total=1, allowed total=1); npm test 781/781; npm run typecheck 0 errors; npm run lint 0 errors"
        status: pass
      - kind: manual
        ref: "approved-string parity loop over all 68 APPROVED-STRING lines, no key filter; Retail-claim grep; diff-scoped em-dash grep"
        status: pass
    human_judgment: true
duration: 70min
completed: 2026-08-31
status: complete
---

# Phase 2 Plan 7: Blog Repositioning & Phase Close-Out Summary

**Both blog posts now carry the G1 full-broaden decision consistently across every copy of their titles, the previously-orphaned C2d migration-speed superlative is closed, and the entire 14-file phase sweep is proven whole: matching residual counts, matching approved strings, no Retail claim, and a green test/typecheck/lint suite.**

## Performance

- Duration: ~70min
- Tasks: 3 plan tasks + 1 scope-extension fix (C2d)
- Files modified: 4

## Accomplishments

- **Task 1:** Applied the recorded G1 answer (Option A, full broaden) to both blog posts. `how-to-run-loot-without-a-spreadsheet/page.tsx`'s six occurrences (Metadata `title`, `openGraph.title`, JSON-LD `headline`, `BreadcrumbList` item `name`, `BlogTracker`'s `title` prop, and the on-page `<h1>`) all moved together in one commit — no state where the page title and H1 disagree. `how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx`'s duplicated meta-description sentence (Metadata `description` and JSON-LD `description`) moved together. The C2b best-parts superlative ("LootList+ combines the best parts of loot council and priority lists...") was replaced with the approved mechanism-describing claim, preserving the `<strong>Loot Score</strong>` emphasis and leaving "Here's how it works:" untouched.
- **Task 2:** Read the post's own final Metadata `title` value out of the shipped file (not retyped from the draft) and copied it verbatim into both `app/blog/page.tsx`'s index card and `app/components/landing/BlogRelatedPosts.tsx`'s related-post card. All three now byte-match: `How to Run Loot in World of Warcraft Without a Spreadsheet`.
- **Scope extension (C2d):** Task 3's approved-string parity sweep discovered `claim.blog-spreadsheet.migration-speed` had never been shipped by any prior plan in the phase (02-01 through 02-06). Its target sentence lives in `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx`, already this plan's own file (it's the same file Task 1 edited), so it was closed here — following the same precedent 02-04 set when it shipped an orphaned `LandingCompare.tsx` fix inside its own declared scope. "Most guilds are fully migrated within two raid resets." became "Most guilds find the migration lighter than expected once rosters and rules are set up once."; the second sentence ("The spreadsheet sits untouched...") is untouched.
- **Task 3 (phase-wide gates, no code changes of its own beyond the C2d fix above):** Ran every check the plan specifies across all 14 files named by a `RESIDUAL-ALLOWANCE` line (13 named in Section E plus `app/layout.tsx`'s own allowance-1 row), all 68 `APPROVED-STRING` lines with no key filter, a Retail-claim grep across `app/`, `public/`, and `README.md`, a diff-scoped em-dash grep, and the full `npm test` / `npm run typecheck` / `npm run lint` suite.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Apply the approved blog disposition to both posts | `49bed28` | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx`, `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` |
| 2 | Keep every external copy of a post title in agreement with the post | `1061194` | `app/blog/page.tsx`, `app/components/landing/BlogRelatedPosts.tsx` |
| Scope extension | Ship the orphaned C2d migration-speed claim fix | `0e02ff5` | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` |
| 3 | Prove the whole phase landed as one consistent state | (verification only, no commit — findings below) | n/a |

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified

- `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` — all six occurrences of the post's title string broadened; the C2d migration-speed sentence replaced
- `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` — both copies of the meta-description sentence broadened; the C2b best-parts sentence replaced
- `app/blog/page.tsx` — index card `title` mirrors the post's final title
- `app/components/landing/BlogRelatedPosts.tsx` — related-post card `title` mirrors the post's final title

## Decisions Made

See `key-decisions` in frontmatter for full detail. Summary:
1. G1's full-broaden answer applied with no partial mix, exactly as recorded.
2. The C2d migration-speed fix was unowned by any of the phase's 7 plans and was shipped here since its file is already in this plan's scope — the same precedent 02-04 established.
3. Three pre-existing em dashes found in code comments in files this plan does not own (`LandingHero.tsx`, `app/layout.tsx`) were reported, not fixed — see Issues Encountered.
4. Five "MISSING" results from a literal `grep -F` approved-string parity loop were investigated by hand and confirmed to be false positives (line-wrapped JSX text, an escaped apostrophe, and a unicode escape sequence), not real content gaps.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality, scope extension] Shipped the orphaned C2d migration-speed claim fix**
- **Found during:** Task 3's approved-string parity sweep
- **Issue:** `claim.blog-spreadsheet.migration-speed` (the approved fix for the unverifiable "fully migrated within two raid resets" claim) was never shipped by plans 02-01 through 02-06, and no plan in the phase's 7-plan breakdown explicitly owned it.
- **Fix:** Replaced the sentence in `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` with the approved wording, preserving the untouched second sentence.
- **Files modified:** `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx`
- **Verification:** `npm run typecheck` exits 0; residual-allowance count for the file unaffected (still 0); manual `sed`/`grep` confirmation of the exact replacement text.
- **Commit:** `0e02ff5`

**Total deviations:** 1 auto-fixed (Rule 2, scope extension inside an already-owned file). **Impact:** closes a real content gap PROOF-02 exists to catch; consistent with the plan's own "nothing silently left standing" mandate.

## Issues Encountered

**1. Three pre-existing em dashes found in code comments outside this plan's scope.**

The plan's Task 3 em-dash gate (diff-scoped grep over every non-`.planning/` file the phase touched, base commit `769d89b`, the last commit before any phase-02 work) found:

- `app/components/landing/LandingHero.tsx:22` — `// Dashboard scale-up on scroll — uses page scroll so it always starts at 1 when at top`
- `app/components/landing/LandingHero.tsx:111` — `{/* Hero text content — no motion wrapper so content is visible in SSR HTML */}`
- `app/layout.tsx:36` — `// The one definitive product description — keep identical across the`

All three are code comments (not user-facing copy), and all three predate this phase: confirmed by diffing each file against the pre-phase base commit — none of the three lines appears as an added (`+`) line in any phase-02 diff hunk. `LandingHero.tsx` was touched by plan 02-06 (only its body-paragraph text at line 135), and `app/layout.tsx` was touched by plan 02-05 (only its `description` value) — neither plan's edit introduced or modified these comment lines. Neither file is in this plan's declared `files_modified` scope.

Per this plan's own deviation-rule instruction — "if this plan's own verification finds that the phase-wide sweep is inconsistent ... report it clearly as an issue rather than silently patching files outside this plan's declared scope" — these are reported here, not fixed. CLAUDE.md's "no em dashes" constraint reads as governing shipped, user-facing copy voice (its own sentence describing the rule contains an em dash: "gospel — user sign-off required"), so this is very likely a non-issue for the phase's actual intent, but the literal, whole-file-content grep the plan specifies does produce output, so it is recorded honestly rather than reported as a clean pass. If cleanup of these two comments is wanted, it is a one-line style fix in files owned by 02-05 and 02-06, outside this plan's scope to make unilaterally.

**2. Five false-positive "MISSING" results from the literal approved-string parity check.**

Task 3's parity loop (`grep -rqF -- "$val" app public README.md` for all 68 `APPROVED-STRING` lines) flagged 5 keys as not found. All 5 were manually confirmed present:

- `signup.title` — shipped as `'Sign up ∙ LootList+'` (a unicode escape sequence) in `app/page.tsx`; the approved value uses the literal `∙` character. Identical at runtime, different source encoding; `grep -F` cannot match across the encoding difference.
- `claim.blog-fair-loot.best-parts` — the shipped sentence wraps across two JSX text lines (`app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx:334-335`); a single-line `grep -F` cannot match text spanning a newline. Confirmed present via `sed -n`.
- `meta.compare.description` / `repos.app/compare/page.tsx.10` (same value, two keys) — shipped with an escaped apostrophe (`That\'s My BiS`) in `app/compare/page.tsx:10`; the approved value uses a literal apostrophe (`That's My BiS`). Confirmed present via `sed -n`.
- `claim.blog-spreadsheet.migration-speed` — same line-wrap limitation as the best-parts key, flagged even after this plan's own fix landed it; confirmed present via `sed -n`.

No genuine approved-string gap remains after these five were individually investigated and this plan's own C2d fix landed.

## User Setup Required

None — no external service configuration required. Per D-14, the Discord server description, the GitHub repository description field, and old external posts (Reddit, Blizzard forum) remain founder-owned and unedited by any plan in this phase.

**Restated founder-owned handoff checklist (Section F of `02-COPY-DRAFT.md`), item by item, since this is the phase's closing plan:**

1. **Discord server description** — current wording not captured in this repo (unknown to any executor). Proposed: "Transparent loot management for World of Warcraft guilds. Ranked lists, attendance tracking, and Loot Score priority." Change it in Discord: Server Settings → Overview → Description field.
2. **GitHub repository description field** (distinct from the in-repo `README.md`, which this phase does edit — plan 02-06 shipped that) — current wording not captured in this repo. Proposed: "Transparent loot management for World of Warcraft guilds: ranked lists, attendance, and Loot Score priority." Change it at github.com/alexandermayes/loot-list-plus, gear icon next to "About" in the repo sidebar, Description field.
3. **Old external posts** (Reddit, Blizzard forum launch posts) — historical posts, not in this repo, predate the current pricing and current "World of Warcraft" wording. Add this banner at the top of each post without rewriting the historical post underneath: "Update, August 25, 2026: LootList+ is now out of beta. The core loot system remains free. Optional Premium adds multiple raid teams and the officer activity feed for $4.99 per month or $39 per year per guild. The original post below predates Premium." Apply as an edit to the existing Reddit thread and the existing Blizzard forum post, not a new post.

No plan in this phase's 7-plan breakdown touches any of these three; they are outstanding, founder-owned work outside this repo.

## Next Phase Readiness

**The full 13(+1)-file, ~35-occurrence D-12 repositioning sweep is now verified consistent.** Concretely, as of this plan's final commit:

- Every one of the 14 files named by a `RESIDUAL-ALLOWANCE` line exists and its actual residual occurrence count of `WoW Classic`/`World of Warcraft Classic` equals its approved allowance: 13 files at `0`, and `app/layout.tsx` at its approved `1` (the intentionally-kept `keywords` array entry, per the user's standing note that "WoW Classic" stays as a distinct search keyword).
- The repo-wide residual total (`1`) equals the sum of the approved allowances (`1`) — both numbers computed and printed above, not collapsed into a boolean.
- All 68 `APPROVED-STRING` values in `02-COPY-DRAFT.md` are shipped verbatim somewhere under `app/`, `public/`, or `README.md`; the 5 that a naive single-line `grep -F` flagged were each manually confirmed present (see Issues Encountered #2), and the one genuine gap found (`claim.blog-spreadsheet.migration-speed`) is now closed by this plan.
- No Retail or current-expansion compatibility claim exists anywhere under `app/`, `public/`, or `README.md`.
- One article (`how-to-run-loot-without-a-spreadsheet`) has one title, verified identical across its own metadata/openGraph/JSON-LD/breadcrumb/tracker/H1 and across the blog index card and the related-posts card.
- `npm test` (781/781), `npm run typecheck` (0 errors), and `npm run lint` (0 errors, 397 pre-existing warnings unrelated to any file this phase touched) all pass.
- The only known gap against a literal, whole-phase reading of the plan's must-haves is the pre-existing em-dash finding in Issues Encountered #1 — two code comments in files this plan does not own, predating the phase, and not user-facing copy.

This closes Phase 2's Search & AI Visibility copy work. The founder-owned external handoff checklist above (Discord, GitHub, old external posts) is the only work explicitly out of any executor's scope per D-14.

Shared-ID note: requirement PROOF-02 is shared across every plan in this phase (02-01 through 02-07, all now complete). `requirements-completed` is left empty per this plan's execution instructions; the orchestrator should reconcile `REQUIREMENTS.md` centrally now that this is the last declaring plan in the phase.

## Self-Check: PASSED

- FOUND: app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx
- FOUND: app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx
- FOUND: app/blog/page.tsx
- FOUND: app/components/landing/BlogRelatedPosts.tsx
- FOUND: commit 49bed28 (Task 1)
- FOUND: commit 1061194 (Task 2)
- FOUND: commit 0e02ff5 (scope-extension C2d fix)
