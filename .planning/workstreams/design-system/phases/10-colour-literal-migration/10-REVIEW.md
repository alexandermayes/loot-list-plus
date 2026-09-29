---
phase: 10-colour-literal-migration
reviewed: 2026-09-20T00:00:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - __tests__/background-inset-absence.test.ts
  - __tests__/faction-color-literals.test.ts
  - __tests__/purple-gradient-guard.test.ts
  - __tests__/quality-brand-color-literals.test.ts
  - __tests__/quality-brand-token-parity.test.ts
  - app/(app)/AppLayout.client.tsx
  - app/(app)/attendance/components/AttendanceContent.tsx
  - app/(app)/characters/[id]/edit/_client.tsx
  - app/(app)/design-system/_client.tsx
  - app/(app)/guild-settings/components/GuildSettingsContent.tsx
  - app/(app)/master-sheet/components/MasterSheetContent.tsx
  - app/(app)/overview/components/DashboardContent.tsx
  - app/(app)/profile/components/ProfileContent.tsx
  - app/(app)/raid-tracking/components/RaidCardHeader.tsx
  - app/(app)/raid-tracking/components/WeekGroup.tsx
  - app/components/CreateCharacterModal.tsx
  - app/components/EditCharacterModal.tsx
  - app/components/ItemLink.tsx
  - app/components/KonamiEasterEgg.tsx
  - app/components/landing/ClickEffects.tsx
  - app/components/landing/LandingLootDecision.tsx
  - app/components/landing/ParallaxItem.tsx
  - app/components/LootListSummaryView.tsx
  - app/components/OnboardingModal.tsx
  - app/components/PremiumItemTooltip.tsx
  - app/components/ScoreComparisonModal.tsx
  - app/components/Sidebar.tsx
  - app/contexts/AccentColorContext.tsx
  - app/globals.css
  - components/ui/horizontal-scroll.tsx
  - components/ui/skeletons.tsx
  - lib/design-system/index.ts
  - lib/design-system/quality-colors.ts
  - scripts/visual/baseline.mjs
  - tailwind.config.js
findings:
  critical: 0
  warning: 3
  warning_retracted: 1
  info: 3
  total: 6
  total_active: 5
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-09-20
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found (no blockers; 2 active warnings + 1 retracted, 3 info)

**Post-review correction (2026-09-21, orchestrator):** WR-02 was independently reproduced and found factually incorrect -- both flagged guards already catch chained/stacked Tailwind variants (`dark:hover:bg-purple-500`, `sm:hover:bg-background-inset` both verified to match, via `matchesIn`'s own unanchored regex search). See the retraction note appended under WR-02 below for the reproduction. No fix was applied to either guard.

## Summary

This phase migrated hardcoded Tailwind palette classes, raw `rgb()`/`rgba()` values and raw hex literals onto design tokens across 34 files (7 plans, 5 new guard tests). I read every touched file in full, diffed each one against the pre-phase commit (`27b3df5e`) line-by-line, and independently re-ran the equivalent of every guard's own grep to verify the migration's claims rather than trust the plan summaries.

**Correctness verdict: the migration itself is exceptionally clean.** Every diff I inspected is a pure, minimal rename — no accidental value changes, no dropped alpha/opacity modifiers in the composed template-literal color strings (`ClickEffects.tsx`, `ParallaxItem.tsx` all verified byte-for-byte against the pre-migration literals), no dropped click handlers or padding/layout classes in any of the six `Card variant="nested"` conversions, and no orphaned references left behind after the `--background-inset` token deletion in `app/globals.css` / `tailwind.config.js`. Independent repo-wide greps for the five centralized hex values, the six purple/gradient class strings, and the `background-inset` token all return zero matches outside the two files where a disclosed, tracked duplicate intentionally remains (see WR-03).

The issues below are not shipped correctness bugs. They are: (1) an unverified visual-risk pattern introduced by combining the new `Card variant="nested"` primitive with a `space-y-*` gap on its parent, (2) a live, disclosed duplicate-token state (two different "Discord blue" Tailwind keys) with no guard preventing future confusion, and (3) two small pieces of dead/duplicate code the phase's own tooling documents but does not fix. (A fourth item, a claimed regex false-negative in two guards' variant-prefix handling, was investigated and retracted -- see WR-02.) None of these block correctness of what shipped; the two live warnings are worth fixing or explicitly accepting before this phase closes.

## Critical Issues

None found.

## Warnings

### WR-01: `Card variant="nested"` combined with a `space-y-*` parent produces an unverified "floating divider" risk on 4 of 6 conversion sites

**File:** `app/(app)/overview/components/DashboardContent.tsx:2234` (and `:2408`), `app/(app)/profile/components/ProfileContent.tsx:900`, `app/components/EditCharacterModal.tsx:397`, `components/ui/skeletons.tsx:65`

**Issue:** The `nested` Card variant (`components/ui/card.tsx`) renders only a `border-t border-border` top divider (suppressed on the first child via `first:border-t-0`) — it was designed and previously only used (Phase 09, `SettingsModal.tsx`) for single, mutually-exclusive conditional blocks with no gap between siblings. This phase is the first to use it inside a `.map()`-rendered list whose parent still carries a `space-y-2` / `space-y-3` / `space-y-4` gap class (e.g. `DashboardContent.tsx:2234`'s `<div className="space-y-2 sm:space-y-3">`, `ProfileContent.tsx:900`'s `<div className="space-y-3">`). Before this migration, each list item was a fully self-contained bordered card (`bg-background-inset border border-border rounded-xl`), so the gap between items was simple whitespace between two independent boxes. After the conversion, item 2+ in each list now renders a vertical gap **and then** a `border-t` line directly above it, floating in what used to be plain whitespace — a visibly different composition than either "a list of separate cards" or "a single card with divided rows" (the pattern `nested` was built for).

This is not hypothetical: it applies to every list with 2+ items in `DashboardContent.tsx`'s "Next in line" and "Actions needed" widgets, `ProfileContent.tsx`'s guild list, and `EditCharacterModal.tsx`'s guild-membership list — all common, non-edge-case states. The phase's own plan summaries (`10-06-SUMMARY.md` coverage item D1) explicitly flag this as `human_judgment: true` / not confirmed, and the after-capture (`10-07-SUMMARY.md`) fell back to a Home-only screenshot that never reached any of these four screens, so this has never actually been visually verified.

**Fix:** Either (a) drop the `space-y-*` gap on these four parents so the `nested` divider does the full job it was designed for (matching the `SettingsModal.tsx` precedent), or (b) if the gap is intentionally kept for touch-target/readability reasons, run the deferred visual UAT before closing the phase and explicitly confirm the "gap + top border" look is acceptable rather than leaving it as an open, untested assumption.

### WR-02 [RETRACTED]: Two of the five new guard tests only recognize a single Tailwind variant prefix, silently missing chained/stacked variants

**File:** `__tests__/purple-gradient-guard.test.ts:63-65`, `__tests__/background-inset-absence.test.ts:53`

**Issue:** Both regexes use `(?:[a-z-]+:)?` to make a variant prefix optional, e.g. `hover:bg-purple-500`. This only supports **zero or one** colon-delimited modifier. A stacked/chained Tailwind variant such as `dark:hover:bg-purple-500` or `sm:hover:bg-background-inset` will not match `[a-z-]+:` (which stops at the first `:`) followed directly by a recognized utility prefix, because the character immediately after the first colon is another variant name (`hover`), not `bg`/`text`/etc. A reintroduced purple class or a reintroduced `background-inset` reference behind a second stacked variant would pass both guards undetected.

This is a real, not merely theoretical, gap: the sibling `faction-color-literals.test.ts` guard was written with awareness of this exact limitation and worked around it by adding explicit compound array entries (`'group-hover:text'`, `'group-hover:border'`) for the one two-part variant it needed to cover in `GuildSettingsContent.tsx`. The purple-gradient and background-inset guards were not given the same treatment, and their own "Scope limit (disclosed, not hidden)" header comments do not mention this limitation — they disclose the hex/rgb/oklch-spelling gap but not the chained-variant gap.

**Fix:** Change the optional-prefix group from `(?:[a-z-]+:)?` to `(?:[a-z-]+:)*` (or `(?:[a-z-]+:)+`) in both `PURPLE_CLASS_PATTERN` and `CLASS_PATTERN`, and add a line to each guard's disclosed scope-limit comment noting the variant-chaining behavior explicitly (matching the rigor the rest of these guards' comments already apply to every other disclosed gap).

**RETRACTED (verified incorrect during phase closure, 2026-09-21):** Independently reproduced with the exact regex construction and `matchesIn`'s own unanchored `.test(text)` call (`__tests__/design-tokens/source-files.ts:88-102`, no `^`/`$` anchors, `g` flag stripped). Both `dark:hover:bg-purple-500` and `sm:hover:bg-background-inset` **do** match their respective patterns:
```
node -e "... PURPLE_CLASS_PATTERN.test('dark:hover:bg-purple-500')" => true
node -e "... CLASS_PATTERN.test('dark:sm:hover:bg-background-inset')" => true
```
The reasoning error: `(?:[a-z-]+:)?` is optional and the regex is unanchored, so `RegExp.test()` searches the whole line for *any* matching substring rather than requiring the match to start at position 0. With a chained variant, the engine simply starts its match one variant later -- at `hover:bg-purple-500` inside `dark:hover:bg-purple-500` -- skipping the earlier `dark:` entirely, since nothing requires the whole line to be consumed. The claimed contrast with `faction-color-literals.test.ts` is also inaccurate: that guard uses the byte-identical `(?:[a-z-]+:)?` construction (confirmed by direct comparison, `__tests__/faction-color-literals.test.ts:31`), not a compound-array workaround for this issue -- its `'group-hover:text'`-style entries are additional *hue+prefix* combinations, unrelated to variant-chaining. No fix applied; both guards already catch chained/stacked variants as originally shipped.

### WR-03: `brand-discord` and the pre-existing `discord` Tailwind key now coexist as two different "Discord blue" values

**File:** `tailwind.config.js:142-145` (existing `discord` key, `hsl(var(--discord))`) vs `tailwind.config.js:179` (new `brand-discord`, `#5865f2`)

**Issue:** This phase intentionally added `brand-discord: "#5865f2"` rather than reusing the existing `discord` color object, because the existing `--discord` CSS variable resolves to a measurably different blue. This was a deliberate, disclosed decision (10-02's gate, "option a") and is commented at both definition sites, routed to Phase 12's design documentation. Flagging it here anyway because it is a real, shipped state of the codebase today: two visually-different "Discord brand color" Tailwind keys exist side by side (`text-discord` vs `text-brand-discord`) with no lint rule, guard, or naming convention preventing a future call site from picking the wrong one. The consumer-existence guard (`quality-brand-token-parity.test.ts`) only proves `brand-discord` has a consumer — it does nothing to prevent the confusion between the two keys.

**Fix:** No code change required for this phase to close, since the duplicate is disclosed and already routed. Recommend prioritizing the Phase 12 reconciliation (retire one of the two keys or rename one to remove the ambiguity) before more call sites accumulate on either one.

## Info

### IN-01: `GuildCardSkeleton` remains fully dead code after this phase touched it

**File:** `components/ui/skeletons.tsx:132`

**Issue:** This phase's Task 2 (10-06) converted `GuildCardSkeleton`'s wrapper `<div>` to `<Card variant="nested">`, but the function itself has zero call sites anywhere in `app/`, `components/`, or `lib/` (confirmed via repo-wide grep). This was already noted by `10-06-SUMMARY.md` as a known, out-of-scope finding, but it is worth restating in review since the file was touched and the dead code was carried forward rather than removed.

**Fix:** Either wire `GuildCardSkeleton` into `ProfileContentSkeleton`'s guilds tab (the component it appears to have been built for, given its name and the real `GuildCardSkeleton`-shaped row it now visually matches in `ProfileContent.tsx`), or remove it in a follow-up cleanup pass.

### IN-02: A second, unrelated dead "Discord" token (`lib/design-system/tokens.ts`'s `discord: { 500: '#5865F2' }`) is cited by name but left unfixed

**File:** `lib/design-system/tokens.ts:80`, referenced by `__tests__/quality-brand-token-parity.test.ts:71` (test description) and `quality-colors.ts`'s own header comment

**Issue:** Both new guard tests explicitly cite `lib/design-system/tokens.ts`'s unconsumed `discord: { 500: '#5865F2' }` entry as the "second dead token" precedent the new consumer-existence guard exists to prevent recurring — but that precedent entry itself is neither removed nor covered by any guard. The codebase now has three separate "Discord blue" definitions: `--discord`/`discord` (CSS var, Tailwind key, in active use), `brand-discord` (new, in active use), and this pre-existing dead `tokens.ts` entry (unused, unguarded).

**Fix:** Out of this phase's stated scope (D-14-style exclusion), but worth a follow-up ticket to delete the dead `tokens.ts` entry now that its role as a "what we're preventing" example has been documented in two committed test files.

### IN-03: Single-quote/double-quote inconsistency in one import line

**File:** `app/(app)/design-system/_client.tsx:16`

**Issue:** The new `import { BRAND_COLORS } from '@/lib/design-system/quality-colors';` line uses single quotes while every other import in this file uses double quotes. This was a deliberate, disclosed choice recorded in `10-05-SUMMARY.md` (to satisfy a plan acceptance-criteria grep pattern) and causes no lint violation since this repo has no `quotes` ESLint rule configured. Flagging only because it is a visible, avoidable inconsistency in an otherwise-consistent file.

**Fix:** None required; cosmetic only.

---

_Reviewed: 2026-09-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
