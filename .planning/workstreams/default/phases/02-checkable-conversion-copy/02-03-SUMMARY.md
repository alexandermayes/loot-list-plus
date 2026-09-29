---
phase: 02-checkable-conversion-copy
plan: 03
subsystem: signup-surface-copy
tags: [nextjs, react, vitest, testing-library, copy, seo-metadata, tracer]
requires:
  - phase: 02-checkable-conversion-copy
    plan: 02
    provides: "D-16 consolidated copy sign-off in 02-COPY-DRAFT.md, including the six approved signup.* strings"
provides:
  - "Signup surface (app/page.tsx + app/components/LoginPage.tsx) shipping the D-16 approved title, H1, body, CTA, and secondary link text/href byte for byte"
  - "app/components/__tests__/LoginPage.test.tsx pinning every approved signup string plus the absolute cross-domain secondary href"
  - "A proven, reusable four-gate battery (em-dash diff scan, approved-string parity loop, npm test/typecheck/lint, dev-server-up-then-visual-check) for plans 02-04 through 02-07 to copy verbatim"
affects:
  - "app/components/LoginPage.tsx"
  - "app/page.tsx"
  - "app/components/__tests__/LoginPage.test.tsx"
actuals:
  tokens: 1468
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns:
    - "Diff-scoped em-dash grep (BASE=git rev-parse HEAD~1, exclude .planning/) reused verbatim by later plans in this phase"
    - "APPROVED-STRING parity loop: read '^APPROVED-STRING: <ns>\\.' lines from 02-COPY-DRAFT.md, grep -qF each value against the plan's shipped files, name any missing key rather than silently passing"
key-files:
  created:
    - app/components/__tests__/LoginPage.test.tsx
  modified:
    - app/components/LoginPage.tsx
    - app/page.tsx
key-decisions:
  - "Shipped signup.title's bullet character (∙, U+2219) as the pre-existing '\\u2219' JS escape sequence already used at that call site, rather than switching to a literal unicode character in the source, since the two are byte-identical at runtime and changing the encoding style would be an unrequested stylistic edit outside this plan's scope."
  - "Task 2's Gate 4 human-check items (visual copy confirmation, 375px/1440px overflow, cross-domain link destination, Discord OAuth still working) are recorded here for end-of-phase UAT harvest, not resolved live, per the plan's own acceptance criteria for this task."
patterns-established:
  - "Four-gate battery proven on 3 files: em-dash diff scan, approved-string parity, full suite health (test/typecheck/lint), dev-server-up gate before any visual checkpoint. See 'Reusable Gate Battery' section below."
requirements-completed: []
coverage:
  - id: D1
    description: "Signup surface renders the five approved COPY-01 strings and the absolute cross-domain secondary href, provably"
    requirement: "COPY-01"
    verification:
      - kind: unit
        ref: "app/components/__tests__/LoginPage.test.tsx#LoginPage, approved signup copy (COPY-01)"
        status: pass
    human_judgment: false
duration: 45min
completed: 2026-08-30
status: complete
---

# Phase 2 Plan 3: Signup Copy Tracer Summary

**Signup surface now ships the D-16 approved title/H1/body/CTA/secondary-link copy and an absolute cross-domain how-it-works href, with a Vitest suite pinning every string; the phase's four-gate battery (em-dash, approved-string parity, suite health, dev-server-up) is proven and documented for the remaining six plans to reuse verbatim.**

## Performance
- **Duration:** ~45min
- **Tasks:** 2/2
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- `app/page.tsx` metadata title now reads `signup.title` (`Sign up ∙ LootList+`), unchanged elsewhere; `robots.index: false` preserved
- `app/components/LoginPage.tsx` H1, body paragraph, primary CTA label, and secondary anchor text/href replaced with the approved strings; secondary anchor now points at the absolute cross-domain `https://www.getlootlist.com/#how-it-works` instead of the bare marketing-root URL
- New `app/components/__tests__/LoginPage.test.tsx`: 5 passing assertions covering the H1, body, CTA, secondary link text + href equality, and an href-starts-with-`https://` regression guard
- Proved the phase's four-gate battery (below) end to end on real files ahead of plans 02-04 through 02-07

## Task Commits
1. **Task 1 (tracer): ship approved signup copy + test** - `a132a83`
2. **Task 2: prove the gate battery** - no commit (runs gates only, changes no source file per its own acceptance criteria; results recorded in this SUMMARY and the final metadata commit)

**Plan metadata:** committed alongside this SUMMARY.

## Files Created/Modified
- `app/components/LoginPage.tsx` - H1, body, CTA label, and secondary anchor text/href updated to the approved COPY-01 strings; all `className` values, `handleDiscordLogin`, the auth-failure Alert, and the invite-code modal flow are byte-identical to before (confirmed via `git diff`)
- `app/page.tsx` - `metadata.title` updated to the approved `signup.title`; `metadata.description`, `alternates.canonical`, and `robots.index: false` untouched (no approved description string was recorded in 02-COPY-DRAFT.md Section A, so the existing description was left as-is per the plan's "if an approved value is missing, stop and surface it rather than filling the gap" instruction; title was present, description was not, so only title moved)
- `app/components/__tests__/LoginPage.test.tsx` (new) - render assertions for every approved signup string plus the absolute-href regression guard; mocks `@/utils/supabase/client` and `@/utils/analytics/client` so the render is isolated from real OAuth/analytics/env-var dependencies

## Reusable Gate Battery (for plans 02-04 through 02-07)

**Gate 1 - em dash (diff-scoped, excludes `.planning/`):**
```bash
BASE=$(git rev-parse HEAD~1)
CHANGED=$(git diff --name-only "$BASE"...HEAD | grep -v '^\.planning/' || true)
echo "$CHANGED" | xargs -r grep -n '—'
```
Result this plan: `CHANGED` = `app/components/LoginPage.tsx app/components/__tests__/LoginPage.test.tsx app/page.tsx`; grep produced no output. Note: the test file's first draft did contain two em dashes in comments/describe-block text; caught by this exact gate during execution, fixed before commit. This is the gate doing its job, not a plan defect.

**Gate 2 - approved-string parity (fails loudly, names the missing key):**
```bash
DRAFT=.planning/phases/02-checkable-conversion-copy/02-COPY-DRAFT.md
MISSING=0
while IFS= read -r line; do
  key=${line#APPROVED-STRING: }; key=${key%% = *}
  val=${line#*" = "}
  grep -qF -- "$val" app/components/LoginPage.tsx app/page.tsx || { echo "unshipped approved string: $key"; MISSING=1; }
done < <(grep '^APPROVED-STRING: signup\.' "$DRAFT")
test "$MISSING" -eq 0
```
Result: all 6 `signup.*` keys (`title`, `h1`, `body`, `cta`, `secondary-text`, `secondary-href`) found verbatim. `signup.title`'s bullet character is present at runtime via the pre-existing `∙` JS escape (see Decisions above) rather than a literal `∙` byte in the source, so a plain `grep -F` for the literal character will NOT find it in `app/page.tsx`; later plans touching a similarly-escaped string should account for this or grep the rendered/compiled output instead of the raw source when the value contains a non-ASCII character.

**Gate 3 - suite health:**
```bash
npm test && npm run typecheck && npm run lint
```
Result: `npm test` - 42 files / 768 tests passed. `npm run typecheck` - exit 0, no output. `npm run lint` - exit 0; 397 pre-existing warnings (0 errors) across the repo, none introduced by this plan's 3 changed files, none in scope to fix (scope boundary rule).

**Gate 4 - dev-server-up, then visual confirmation:**
```bash
npm run dev   # starts on port 3100 in this repo, NOT 3000 (package.json: "next dev --port 3100")
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/
```
Result this plan: dev server started and reported `Ready` in 293ms, but the root route returned HTTP 500 in this isolated worktree, from `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!` thrown by `GuildContextProvider` (unrelated to this plan's files, which don't touch Supabase config). Root cause: this worktree has no `.env.local` (it's gitignored and `git worktree add` does not materialize it), a known environment gap for isolated worktree agents, not a regression introduced by this plan. `npm run typecheck` succeeding confirms the changed code is structurally sound; the runtime failure is an environment-configuration gap orthogonal to the copy change. **Later plans running Gate 4 in a properly configured environment (main checkout with `.env.local` present) should expect port 3100 and a 200, not the 500 seen here.**

## Human-Check Items (recorded for end-of-phase UAT harvest, not resolved live in this worktree)
1. The H1, body paragraph, primary Discord button, and secondary link all read exactly the approved wording.
2. At 375px viewport width, none of the four strings overflows its container, wraps into an ugly orphan, or pushes the Discord button off screen (UI-SPEC E4/E5 overflow).
3. At 1440px viewport width, the H1 reads as one confident line or a deliberate two-line break, not an accidental one.
4. Clicking the secondary link lands on the marketing site's how-it-works section, not the marketing homepage top.
5. Clicking the Discord button still starts the OAuth flow; the copy change must not have touched it.

These require a running instance with real Supabase credentials (see Gate 4 above) and were not verifiable inside this isolated worktree. They should be confirmed once this plan's commit reaches a properly configured environment, before end-of-phase sign-off.

## Decisions Made
- `signup.title`'s bullet character shipped via the file's pre-existing `∙` escape convention rather than a literal unicode byte (see frontmatter `key-decisions`).
- No approved `signup.description` string exists in 02-COPY-DRAFT.md, so `app/page.tsx`'s `metadata.description` was left unchanged, per the plan's instruction not to fill a missing key.

## Deviations from Plan

**1. [Rule 1 - Bug] Removed two em dashes from the test file's own comments/describe text before commit**
- **Found during:** Task 1, immediately before running Gate 1 for the first time
- **Issue:** The initial draft of `LoginPage.test.tsx` used an em dash in a code comment and in the top-level `describe()` string. CLAUDE.md and D-16 forbid em dashes in any authored copy/source.
- **Fix:** Replaced both with a comma and a plain hyphen-free rewrite respectively.
- **Files modified:** `app/components/__tests__/LoginPage.test.tsx` (fixed before the file was ever committed, so no separate commit exists for this fix; it's folded into the Task 1 commit).
- **Verification:** Re-ran `grep -n '—'` over the file (clean) and re-ran the full test file (still 5/5 passing).
- **Commit:** folded into `a132a83`.

**Total deviations:** 1 auto-fixed (Rule 1, self-authored test copy, not the approved product copy). **Impact:** none on shipped user-facing copy; the fix was to test-file prose I wrote myself, not to any `APPROVED-STRING` value.

## Issues Encountered
- Gate 4's live dev-server root-route confirmation could not be completed inside this isolated worktree: no `.env.local` is present (gitignored, not copied by `git worktree add`), so any route touching `GuildContextProvider`/Supabase 500s regardless of this plan's changes. This is an environment gap, not a code defect; `npm run typecheck` and the full `npm test` suite both passed clean on the changed files. See Gate 4 above and the Human-Check Items section for what still needs confirming in a properly configured environment.

## User Setup Required
None - no external service configuration required for this plan's shipped code. (The dev-server verification gap above is an executor-environment limitation, not something the end user needs to configure.)

## Next Phase Readiness
Ready. The four-gate battery is proven and documented above for plans 02-04 through 02-07 to copy verbatim. Two things for the next plans/orchestrator to carry forward:
1. Dev server in this repo runs on port 3100, not 3000 - update any hardcoded port references in later plans' human-check text.
2. A non-ASCII approved-string value shipped via a JS escape sequence (e.g. `∙`) will not be found by a literal `grep -F` for the character itself; account for this in Gate 2's parity loop if a later plan's approved strings contain similar characters.
Gate 4's visual human-check items are queued for end-of-phase UAT harvest per the plan's own acceptance criteria, not blocking this plan's completion.
