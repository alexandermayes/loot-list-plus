---
phase: 07-token-foundation
reviewed: 2026-09-16T00:00:00Z
depth: standard
files_reviewed: 42
files_reviewed_list:
  - __tests__/design-tokens/contrast.ts
  - __tests__/design-tokens/fixtures/accent-probe.txt
  - __tests__/design-tokens/report.ts
  - __tests__/design-tokens/source-files.ts
  - __tests__/token-contrast.test.ts
  - __tests__/token-palette-literals.test.ts
  - __tests__/type-scale-floor.test.ts
  - .github/workflows/ci.yml
  - app/(app)/admin/analytics/_client.tsx
  - app/(app)/attendance/components/AttendanceContent.tsx
  - app/(app)/expansions/[expansionId]/_client.tsx
  - app/(app)/guild-settings/components/ExpansionManager.tsx
  - app/(app)/guild-settings/components/MemberManager.tsx
  - app/(app)/guild-settings/components/RoleManager.tsx
  - app/(app)/loot-list/components/LootListContent.tsx
  - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
  - app/(app)/master-sheet/components/BossSection.tsx
  - app/(app)/master-sheet/components/ItemCandidateModal.tsx
  - app/(app)/master-sheet/components/MasterSheetContent.tsx
  - app/(app)/master-sheet/components/RaidModeView.tsx
  - app/(app)/overview/components/DashboardContent.tsx
  - app/(app)/raid-tracking/_client.tsx
  - app/(app)/raid-tracking/components/__tests__/cell-state.test.ts
  - app/(app)/raid-tracking/components/cell-state.ts
  - app/(app)/raid-tracking/components/RaidMemberList.tsx
  - app/(app)/reserve/runs/[id]/_client.tsx
  - app/components/CharacterSelector.tsx
  - app/components/CreateGuildModal.tsx
  - app/components/landing/LandingHero.tsx
  - app/components/landing/LandingLootDecision.tsx
  - app/components/landing/PremiumHero.tsx
  - app/components/LootListSummaryView.tsx
  - app/components/ReserveItemPicker.tsx
  - app/components/SearchableItemSelect.tsx
  - app/components/Sidebar.tsx
  - app/customers/[slug]/__tests__/page.test.tsx
  - app/globals.css
  - app/reserve/join/[token]/page.tsx
  - components/ui/alert.tsx
  - components/ui/classification-badge.tsx
  - components/ui/status-badge.tsx
  - scripts/visual/baseline.mjs
  - tailwind.config.js
  - package.json
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-09-16
**Depth:** standard
**Files Reviewed:** 42
**Status:** issues_found

## Summary

This phase is scoped to design tokens only: a Tailwind `fontSize` floor change (`xs` 10px→11px, new `15` step, pixel-named aliases), a 109-site `text-[9px]`/`text-[10px]` → `text-11` sweep across 25 component files, a `globals.css` token rewrite (muted text, `--accent-text`, a lifted dark card/border ramp, a new `--standby` token), a `textColor.accent` split in `tailwind.config.js`, a palette-literal-to-token migration in `status-badge.tsx`/`alert.tsx`/raid-tracking, new vitest guards under `__tests__/design-tokens/`, and a new Puppeteer-based visual-baseline script plus its CI accommodation.

I diffed every file in scope against `0eab0139` and read each changed hunk in full. The 25 swept component files, `status-badge.tsx`, `alert.tsx`, and `classification-badge.tsx` all check out as pure class-literal swaps — no user-facing string, prop, or logic changed anywhere in that set. The new token test suite (`contrast.ts`, `report.ts`, `source-files.ts`, and the three `*.test.ts` files) is well-built: every helper fails loud on a missing file/selector/token instead of returning a vacuous pass, and I ran the three new test files directly — all 51 assertions pass against the actual `globals.css`/`tailwind.config.js` values, confirming the contrast and floor claims in the code comments are real, not asserted from memory.

The one real defect is in the new visual-baseline script, and it's a correctness bug the script's own design didn't anticipate: whenever a seeded dev test user is available, the "home" (unauthenticated) screenshots silently become screenshots of the authenticated `/overview` dashboard instead, with no error surfaced. `app/customers/[slug]/__tests__/page.test.tsx`'s one-line change is a `.planning` path fix from an unrelated repo reorganization commit (`edf32b32`), not phase-07 work — noted below rather than treated as a finding.

## Critical Issues

### CR-01: Visual baseline script silently screenshots the wrong page for "home" once a test user exists

**File:** `scripts/visual/baseline.mjs:185-238`
**Issue:**
`main()` logs in as the seeded dev test user (if one exists) once, unconditionally, *before* the per-page capture loop:

```js
const overviewPages = PAGES.filter((p) => p.auth)
const testUser = overviewPages.length > 0 ? await fetchTestUser(origin, overviewPages, skipped) : null
...
if (testUser) {
  await gotoWithRetry(browserPage, new URL('/dev-login', origin).href, { waitUntil: 'load' })
  // ...types credentials, submits, waits for navigation off /dev-login
}

for (const capturePage of PAGES) {   // PAGES = [{ name: 'home', path: '/', auth: false }, { name: 'overview', path: '/', auth: true }]
  ...
  await gotoWithRetry(browserPage, origin.href, { waitUntil: 'load' })       // navigates to "/"
  ...
  await gotoWithRetry(browserPage, new URL(capturePage.path, origin).href, ...) // "/" again for capturePage.path === '/'
```

`PAGES` lists `home` (`auth: false`, path `/`) *before* `overview`, but login happens once at the top regardless of which page is captured first. `app/page.tsx` unconditionally redirects any authenticated visitor with no invite-code query param straight to `/overview`:

```ts
if (user && !hasInviteCode) {
  redirect('/overview')
}
```

So once `testUser` is truthy, both navigations to `/` inside the `home` iteration (`gotoWithRetry(browserPage, origin.href, ...)` for theme-setting, and `gotoWithRetry(browserPage, new URL(capturePage.path, origin).href, ...)` for the actual capture) land on `/overview`, not the public landing page. The script writes the resulting screenshot to `home-<theme>-<width>.png` and records `{ page: 'home', path: '/' }` in `manifest.json` — nothing about the output signals that the captured page was actually Overview. The one run currently committed (`.planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/`) happens to be unaffected only because `/api/dev/test-users` returned 404 in that environment (`testUser` was `null`, login was skipped) — the bug is latent, not exercised, in the one artifact checked in. The moment `npm run test:users:create` has been run locally before `npm run visual:baseline`, every future "home" baseline for this phase and the phases that reuse this script (08–12, per the script's own header comment) will silently diff the wrong page against itself, defeating the tool's entire purpose (regression-detecting token changes on the public landing page) without any error or warning.

**Fix:** Capture unauthenticated pages before logging in, or use a separate incognito/authless browser context for `auth: false` pages so `/dev-login` state can never leak into them. Minimally:

```js
// Capture every auth:false page first, while the browser has no session.
for (const capturePage of PAGES.filter(p => !p.auth)) { /* ...capture... */ }

// Then log in and capture auth:true pages.
if (testUser) {
  await gotoWithRetry(browserPage, new URL('/dev-login', origin).href, { waitUntil: 'load' })
  // ...
  for (const capturePage of PAGES.filter(p => p.auth)) { /* ...capture... */ }
}
```
Also add an assertion inside the capture loop for `auth: false` pages (e.g. verify no `sb-*-auth-token` cookie is present, or that the resolved URL after navigation still equals the requested path) so a future regression fails loudly instead of silently mislabeling a screenshot.

## Warnings

### WR-01: `browser.close()` in `finally` can mask the original failure

**File:** `scripts/visual/baseline.mjs:277-279`
**Issue:**
```js
} finally {
  await browser.close()
}
```
If the `try` block throws (a real capture failure) and `browser.close()` itself then throws (e.g. the browser process already crashed, which is exactly the kind of state a capture failure can leave it in), the `close()` exception replaces the original one. `main().catch(error => console.error(error.message))` then reports the less useful `close()` error, hiding the real root cause of the CI/local failure.
**Fix:**
```js
} finally {
  await browser.close().catch(() => {})
}
```

### WR-02: Retry-count doc comment doesn't match the code

**File:** `scripts/visual/baseline.mjs:104,115`
**Issue:** The doc comment above `withTransientRetry` says "Up to 3 attempts total," but the function signature is `async function withTransientRetry(action, attempts = 4)`, and both call sites (`gotoWithRetry` and the per-image capture wrapper) use the default. The script actually retries up to 4 times, not 3. Minor, but it will mislead whoever tunes CI timeouts or debugs a flaky capture based on the comment's stated attempt count.
**Fix:** Either change the default to `3` to match the comment, or update the comment to say "Up to 4 attempts total."

### WR-03: Visual-baseline output directory has no `.gitignore` entry and its screenshots are already committed

**File:** `.gitignore` (not modified by this phase); `scripts/visual/baseline.mjs`
**Issue:** `npm run visual:baseline` writes PNGs and a `manifest.json` to `.planning/workstreams/design-system/baselines/<date>-<label>/`, a path under version control with no exclusion rule. `git ls-files` confirms two runs' worth of PNGs are already tracked in this repo (`.planning/workstreams/design-system/baselines/2026-09-16-{pre,post}-phase-07/*.png`). The currently-committed images are only the public Home page and are not sensitive, but nothing in the script or the repo config prevents a future run — once a seeded test user exists (see CR-01) — from committing an authenticated `/overview` screenshot the same way. Binary screenshot churn under `.planning/` also isn't reviewable in a normal diff.
**Fix:** Add `.planning/workstreams/*/baselines/` (or the more general `**/baselines/`) to `.gitignore`, and decide deliberately whether baseline images should ever be committed; if they should (e.g. for the Phase 12 visual-diff job), keep them out of `.planning/` and put them somewhere already covered by LFS/artifact handling instead.

### WR-04: Unused test fixture — `accent-probe.txt` is never referenced by any test

**File:** `__tests__/design-tokens/fixtures/accent-probe.txt:1`
**Issue:** This file was added in this phase (`text-accent bg-accent border-accent text-accent-foreground`) but no test in `__tests__/token-contrast.test.ts`, `__tests__/token-palette-literals.test.ts`, `__tests__/type-scale-floor.test.ts`, or anywhere else in the repo reads it (`grep -rn "accent-probe"` across `.ts`/`.tsx`/`.js`/`.mjs` returns nothing). It reads like a fixture meant to exercise the D-06 `text-accent` split (e.g. compiling this literal string through Tailwind/PostCSS to assert the resolved color, or feeding it through `matchesIn`), but the wiring never landed.
**Fix:** Either wire it into a test (e.g. assert Tailwind resolves each class in this fixture to the expected CSS custom property) or delete the file — an unreferenced fixture is dead weight that will confuse the next person touching this suite.

## Info

### IN-01: `app/customers/[slug]/__tests__/page.test.tsx` change is out of phase-07 scope

**File:** `app/customers/[slug]/__tests__/page.test.tsx:661`
**Issue:** The only change in this file is a `.planning` path fix (`.planning/phases/...` → `.planning/workstreams/default/phases/...`), landed in commit `edf32b32` ("fix: resolve post-merge conflicts from wave 1"), which is a repo-wide workstream-reorganization fix, not phase-07 design-token work. It is not claimed by any phase-07 SUMMARY. No action needed from this review; flagging so it isn't mistaken for an untracked phase-07 change.
**Fix:** N/A — informational only.

---

_Reviewed: 2026-09-16_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
