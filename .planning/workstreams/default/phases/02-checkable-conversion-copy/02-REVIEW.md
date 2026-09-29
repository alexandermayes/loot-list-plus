---
phase: 02-checkable-conversion-copy
reviewed: 2026-08-31T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - README.md
  - app/(landing)/landing/page.tsx
  - app/about/page.tsx
  - app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx
  - app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx
  - app/blog/page.tsx
  - app/changelog/layout.tsx
  - app/compare/page.tsx
  - app/components/LoginPage.tsx
  - app/components/__tests__/LoginPage.test.tsx
  - app/components/landing/BlogRelatedPosts.tsx
  - app/components/landing/LandingCompare.tsx
  - app/components/landing/LandingHero.tsx
  - app/components/landing/LandingValueProps.tsx
  - app/components/landing/__tests__/LandingValueProps.test.tsx
  - app/layout.tsx
  - app/page.tsx
  - app/privacy/page.tsx
  - app/terms/page.tsx
  - public/site.webmanifest
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: fixed
resolution:
  fixed_by: orchestrator (manual, not the automated --fix agent)
  fixed_commit: b4daec8
  fixed:
    - CR-01
    - WR-01
  deferred:
    - WR-02
  not_actionable:
    - IN-01
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-31T00:00:00Z
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found, then fixed (see resolution below)

## Resolution (2026-08-31, orchestrator)

- **CR-01 fixed** in commit `b4daec8`: both titles now use `title: { absolute: '...' }` to bypass `layout.tsx`'s `title.template`, shipping the exact approved string with no duplicated brand suffix. Verified directly against `next/dist/lib/metadata/resolvers/resolve-title.js`.
- **WR-01 fixed** in commit `b4daec8`: the dead `verified_customer_dated` branch now matches the locked D-03 line format (`Verified LootList+ customer ∙ Interviewed {Month Year}`).
- **WR-02 deferred, not fixed**: whether "World of Warcraft Classic" → "World of Warcraft" counts as a substantive-enough change to bump the Privacy/Terms "Last updated" date is a legal/editorial judgment call, not a mechanical fix. Flagged for the user rather than decided unilaterally.
- **IN-01 not actionable here**: pre-existing lint warnings, confirmed to predate this phase. Left as-is, optional future cleanup.

## Summary

This phase is almost entirely a copy/metadata swap and was cross-checked string-by-string against the signed-off values in `02-COPY-DRAFT.md` (all `APPROVED-STRING` and `repos.*` entries). Every checked string matches the approved value exactly, the two bundled non-copy fixes (`/compare`'s `APP_URL` constant and `LandingCompare.tsx`'s superlative reword) are both correct, no `dangerouslySetInnerHTML` JSON-LD payload in the diff introduces `<`, `>`, or `&`, `npx tsc --noEmit` is clean, and both new/expanded test files (`LoginPage.test.tsx`, `LandingValueProps.test.tsx`) pass.

However, this review found one confirmed, empirically-verified **rendering bug**: two of the new approved page titles (`app/(landing)/landing/page.tsx` and `app/page.tsx`) end in the literal string "LootList+", and both routes inherit `app/layout.tsx`'s `title.template = "%s | LootList+"` (unchanged by this phase). Next.js's title resolver substitutes the page's title string into `%s` unconditionally, so the actual rendered `<title>` tag duplicates the brand suffix. This was verified by calling the project's own installed `next/dist/lib/metadata/resolvers/resolve-title.js` directly against both strings (see finding CR-01) — it is not a hypothetical. Neither previous title (`LootList+ | Transparent Loot Management for WoW Classic` / `LootList+ ∙ Sign up`) triggered this, since neither happened to end in the bare brand name; this is a regression newly introduced by this phase's specific approved copy choices, and it directly undermines the phase's own stated SEO goal (clean, category-forward titles) for exactly the two highest-traffic pages touched.

## Critical Issues

### CR-01: Homepage and signup page titles render with a duplicated "LootList+" suffix

**File:** `app/(landing)/landing/page.tsx:23`, `app/page.tsx:10` (interacting with `app/layout.tsx:32-35`, unchanged by this phase)

**Issue:** `app/layout.tsx` defines `title: { default: "...", template: "%s | LootList+" }`. Any page metadata `title` that is a plain string gets substituted into `%s`, unconditionally, per Next.js's `resolveTitle()`. Both of the following approved strings for this phase already end in the literal brand name, so the template appends it a second time:

- `app/(landing)/landing/page.tsx`: `title: 'Loot Lists, Attendance & Loot Score Tracking | LootList+'` → renders as `Loot Lists, Attendance & Loot Score Tracking | LootList+ | LootList+`
- `app/page.tsx`: `title: 'Sign up ∙ LootList+'` → renders as `Sign up ∙ LootList+ | LootList+`

Verified directly against this repo's installed Next.js build (not inferred from docs):

```
$ node -e "
const { resolveTitle } = require('./node_modules/next/dist/lib/metadata/resolvers/resolve-title.js');
console.log(resolveTitle('Loot Lists, Attendance & Loot Score Tracking | LootList+', '%s | LootList+'));
console.log(resolveTitle('Sign up ∙ LootList+', '%s | LootList+'));
"
{ absolute: 'Loot Lists, Attendance & Loot Score Tracking | LootList+ | LootList+', template: null }
{ absolute: 'Sign up ∙ LootList+ | LootList+', template: null }
```

This is a regression this phase introduces: the *previous* titles (`LootList+ | Transparent Loot Management for WoW Classic`, `LootList+ ∙ Sign up`) did not end in the bare brand name, so they did not trigger the duplicate. The plan's own `02-COPY-DRAFT.md` (Section D3) shows the drafters were aware `title.template` exists and correctly avoided this for the changelog title (`LootList+ Changelog: Recent Updates`, no trailing "LootList+"), but the homepage (H-T2) and signup (T-B) candidates were approved without checking this same interaction — every other approved `title` field in this diff (`compare`, both blog posts, `about`) correctly omits the trailing brand name and is unaffected.

Ships as-is, this means the actual browser tab, Google SERP snippet, and social-share title for the two most important pages in the sprint (homepage and signup) will visibly read with "LootList+" twice in a row.

**Fix:** Bypass the template for these two pages so the exact approved string ships unmodified, rather than re-opening a copy sign-off round:

```tsx
// app/(landing)/landing/page.tsx
export const metadata: Metadata = {
  title: { absolute: 'Loot Lists, Attendance & Loot Score Tracking | LootList+' },
  // ...
}

// app/page.tsx
export const metadata: Metadata = {
  title: { absolute: 'Sign up ∙ LootList+' },
  // ...
}
```

(Alternatively, drop the trailing `| LootList+` / `∙ LootList+` from the two source strings and let the root template supply it — but that changes the literal signed-off string, so `title.absolute` is the fix that ships the approved copy exactly as approved.)

## Warnings

### WR-01: Dead testimonial-verification branch renders copy inconsistent with the locked line format

**File:** `app/components/landing/LandingValueProps.tsx:72-80`

**Issue:** The new `TestimonialVerification` discriminated union includes a `verified_customer_dated` variant, rendered by `VerificationLine`:

```tsx
const text =
  verification.type === 'verified_customer_dated'
    ? `Verified customer, interviewed ${verification.monthYear}`
    : 'Verified LootList+ customer'
```

None of the four current testimonials use this variant (all four resolved to the plain `verified_customer` or `wcl_link` case per `02-COPY-DRAFT.md` D-04), so this is currently dead code and no test exercises it. But per `02-COPY-DRAFT.md` Section B's locked line format (D-03): `Verified LootList+ customer ∙ Interviewed {Month Year} ∙ [Guild or Warcraft Logs profile]`. The dead branch's actual text drops the "LootList+" brand name entirely ("Verified customer..." vs "Verified LootList+ customer...") and uses a comma instead of the locked "∙" separator. If this variant is ever activated for a future testimonial (its entire reason for existing), it will ship copy that visibly disagrees with the format used by every other card on the same section.

**Fix:**
```tsx
const text =
  verification.type === 'verified_customer_dated'
    ? `Verified LootList+ customer, interviewed ${verification.monthYear}`
    : 'Verified LootList+ customer'
```

### WR-02: Privacy/Terms "Last updated" date not bumped despite shipped content changes

**File:** `app/privacy/page.tsx:23`, `app/terms/page.tsx:23`

**Issue:** Both pages display `Last updated: May 12, 2026` and both had their body text substantively edited by this phase (removing "World of Warcraft Classic" → "World of Warcraft" from the service description, `app/privacy/page.tsx:33` and `app/terms/page.tsx:40`). Neither the copy draft nor any phase plan addresses bumping this date. A legal-document "last updated" stamp is meant to reflect the actual last edit date; leaving it at the pre-phase date is misleading to anyone relying on it to know whether the terms changed (a low-severity wording tweak in this case, but the field itself has no other purpose than to be accurate).

**Fix:** Update both dates to the phase's ship date (or leave a decision note if the team considers "World of Warcraft Classic" → "World of Warcraft" too immaterial to count as a policy change worth re-dating).

## Info

### IN-01: Pre-existing unused imports/vars surfaced by lint in two touched files (not introduced by this phase)

**File:** `app/components/LoginPage.tsx:27` (`setUser` unused), `app/components/landing/LandingCompare.tsx:6` (`Image` unused)

**Issue:** `npx eslint` flags both as `@typescript-eslint/no-unused-vars` warnings. Confirmed via `git show <base>:<file>` that both predate this phase's diff (this phase only touched copy strings in these files) — flagging for visibility only, not attributable to this phase's changes.

**Fix:** Optional cleanup, out of scope for this phase; safe to defer to a follow-up.

---

_Reviewed: 2026-08-31T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
