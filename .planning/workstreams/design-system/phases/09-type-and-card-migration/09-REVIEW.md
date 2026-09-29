---
phase: 09-type-and-card-migration
reviewed: 2026-09-19T22:20:42Z
depth: standard
files_reviewed: 128
files_reviewed_list:
  - __tests__/arbitrary-text-sizes.test.ts
  - __tests__/hand-rolled-cards.test.ts
  - __tests__/type-scale-floor.test.ts
  - app/(app)/admin/analytics/_client.tsx
  - app/(app)/AppLayout.client.tsx
  - app/(app)/attendance/components/AttendanceContent.tsx
  - app/(app)/audit-log/_client.tsx
  - app/(app)/characters/[id]/edit/_client.tsx
  - app/(app)/characters/manage/_client.tsx
  - app/(app)/design-system/_client.tsx
  - app/(app)/expansions/[expansionId]/_client.tsx
  - app/(app)/guild-settings/components/BillingSection.tsx
  - app/(app)/guild-settings/components/ExpansionManager.tsx
  - app/(app)/guild-settings/components/GuildSettingsContent.tsx
  - app/(app)/guild-settings/components/InviteCodeManager.tsx
  - app/(app)/guild-settings/components/MemberManager.tsx
  - app/(app)/guild-settings/components/RoleManager.tsx
  - app/(app)/help/_client.tsx
  - app/(app)/help/loading.tsx
  - app/(app)/loot-list/components/LootListContent.tsx
  - app/(app)/loot-management/components/DonationsTab.tsx
  - app/(app)/loot-management/components/ItemRow.tsx
  - app/(app)/loot-management/components/LootSettingsContent.tsx
  - app/(app)/loot-management/components/PriorityListTab.tsx
  - app/(app)/loot-management/components/SettingsModal.tsx
  - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
  - app/(app)/master-loot/_client.tsx
  - app/(app)/master-sheet/components/BossSection.tsx
  - app/(app)/master-sheet/components/ItemCandidateModal.tsx
  - app/(app)/master-sheet/components/MasterSheetContent.tsx
  - app/(app)/master-sheet/components/RaidModeView.tsx
  - app/(app)/master-sheet/components/RaidTierHeader.tsx
  - app/(app)/overview/components/DashboardContent.tsx
  - app/(app)/overview/components/SetupGuide.tsx
  - app/(app)/profile/components/ProfileContent.tsx
  - app/(app)/profile/loading.tsx
  - app/(app)/profile/page.tsx
  - app/(app)/raid-teams/_client.tsx
  - app/(app)/raid-tracking/_client.tsx
  - app/(app)/raid-tracking/components/LootHistoryTab.tsx
  - app/(app)/raid-tracking/components/PlayerLootModal.tsx
  - app/(app)/raid-tracking/components/RaidCard.tsx
  - app/(app)/raid-tracking/components/RaidCardHeader.tsx
  - app/(app)/raid-tracking/components/RaidMemberList.tsx
  - app/(app)/raid-tracking/components/WeekGroup.tsx
  - app/(app)/raid-tracking/import/_client.tsx
  - app/(app)/reserve/_client.tsx
  - app/(app)/reserve/components/CreateReserveRunModal.tsx
  - app/(app)/reserve/loading.tsx
  - app/(app)/reserve/runs/[id]/_client.tsx
  - app/(app)/reserve/runs/[id]/loading.tsx
  - app/(app)/sheet-import/_client.tsx
  - app/(app)/updates/_client.tsx
  - app/(app)/updates/loading.tsx
  - app/about/page.tsx
  - app/blog/page.tsx
  - app/changelog/page.tsx
  - app/components/BattlenetCharacterPickerModal.tsx
  - app/components/BisImportModal.tsx
  - app/components/CharacterCard.tsx
  - app/components/CharacterSelector.tsx
  - app/components/ClassPrioritySubline.tsx
  - app/components/CreateCharacterModal.tsx
  - app/components/CreateGuildModal.tsx
  - app/components/EditCharacterModal.tsx
  - app/components/FeedbackModal.tsx
  - app/components/GuardianConversionModal.tsx
  - app/components/JoinGuildModal.tsx
  - app/components/KonamiEasterEgg.tsx
  - app/components/landing/BlogRelatedPosts.tsx
  - app/components/landing/LandingCompare.tsx
  - app/components/landing/LandingCTA.tsx
  - app/components/landing/LandingFeatures.tsx
  - app/components/landing/LandingHero.tsx
  - app/components/landing/LandingHowItWorks.tsx
  - app/components/landing/LandingLootDecision.tsx
  - app/components/landing/LandingNav.tsx
  - app/components/landing/LandingValueProps.tsx
  - app/components/landing/ParallaxItem.tsx
  - app/components/landing/PremiumFeatures.tsx
  - app/components/landing/PremiumHero.tsx
  - app/components/landing/PremiumPricing.tsx
  - app/components/LoginPage.tsx
  - app/components/LootListSummaryView.tsx
  - app/components/MultiSelectDropdown.tsx
  - app/components/Navigation.tsx
  - app/components/OnboardingModal.tsx
  - app/components/PremiumItemTooltip.tsx
  - app/components/PrioListItemModal.tsx
  - app/components/ReserveItemPicker.tsx
  - app/components/ScoreBreakdownModal.tsx
  - app/components/ScoreComparisonModal.tsx
  - app/components/SearchableItemSelect.tsx
  - app/components/Sidebar.tsx
  - app/components/StyledSelect.tsx
  - app/components/ThemeSelector.tsx
  - app/components/UpgradeModal.tsx
  - app/components/WelcomeScreen.tsx
  - app/components/WowSimsImportModal.tsx
  - app/customers/[slug]/sections.tsx
  - app/global-error.tsx
  - app/guild-select/create/page.tsx
  - app/pricing/page.tsx
  - app/research/wow-classic-loot-systems-2026/page.tsx
  - app/reserve/join/[token]/components/InlineSettingsEditor.tsx
  - app/reserve/join/[token]/loading.tsx
  - app/reserve/join/[token]/page.tsx
  - components/profile/profile-stats.tsx
  - components/ui/__tests__/card.test.tsx
  - components/ui/card.tsx
  - components/ui/classification-badge.tsx
  - components/ui/date-picker.tsx
  - components/ui/date-time-picker.tsx
  - components/ui/info-tooltip.tsx
  - components/ui/input.tsx
  - components/ui/modal.tsx
  - components/ui/searchable-dropdown.tsx
  - components/ui/segmented-control.tsx
  - components/ui/select.tsx
  - components/ui/skeletons.tsx
  - components/ui/textarea.tsx
  - scripts/codemods/hand-rolled-card-pattern.json
  - scripts/codemods/hand-rolled-cards.mjs
  - scripts/codemods/nested-card-ancestry.mjs
  - scripts/codemods/text-size-map.json
  - scripts/codemods/text-sizes.mjs
  - scripts/visual/baseline.mjs
  - tailwind.config.js
findings:
  critical: 0
  warning: 3
  info: 0
  total: 3
status: issues_found
---

# Phase 09: Code Review Report

**Reviewed:** 2026-09-19T22:20:42Z
**Depth:** standard
**Files Reviewed:** 128
**Status:** issues_found

## Summary

This was a mechanical, script-driven migration (two codemods: `text-sizes.mjs` and `hand-rolled-cards.mjs`) across ~150 call sites. I read both codemods end to end, the `Card` primitive, the ancestry-check script, all three guard test files, the pattern/map JSON files, the already-fixed regression (`app/(app)/characters/[id]/edit/_client.tsx`), the "sacred hero" landing files, and every file in the required-reading list, plus targeted greps across the full 128-file scope for the specific bug class the phase context asked me to hunt (a renamed-to-`Card` element that silently lost native-tag behavior).

I could not reproduce the confirmed-class-of-bug (a second lost `onSubmit`/interactive-tag rename) anywhere in the current tree: every `onSubmit` in the reviewed scope is still on a real `<form>`, every `<Card ref=...>` site forwards correctly (`Card` is `React.forwardRef`), no duplicate/unused `Card` imports exist, no malformed (double-space/dangling) class strings survived the mechanical strip-and-splice, the `nested` variant's `first:border-t-0` suppression is correctly higher-specificity than the base `border-t` rule (confirmed against the primitive and its usage sites), and the "sacred hero" H1s in `LandingHero.tsx`/`PremiumHero.tsx` diff cleanly — only the `text-[Npx]` class tokens changed; the explicit `leading-[0.92]` override still wins the cascade over `text-40`'s bundled `line-height: 1.2` because Tailwind's `lineHeight` core plugin is registered (and thus generated) after `fontSize`, which I verified by compiling the actual utility CSS.

What I did find: one documentation/audit-trail integrity gap in the closed guard's own commentary, one stale numeric claim in an unrelated-but-in-scope visual-baseline script, and a pre-existing (not newly introduced) accessibility inconsistency across several `<Card onClick>` "fake button" sites that this phase touched but didn't fix, even though the same phase's own `RaidModeView.tsx` already demonstrates the correct pattern. None of these rise to a shipped-behavior regression; they're all Warnings.

## Warnings

### WR-01: `__tests__/hand-rolled-cards.test.ts`'s audit-trail comment for `app/reserve/join/[token]/page.tsx` is inaccurate — the file has two live matching sites, only one is disclosed

**File:** `__tests__/hand-rolled-cards.test.ts:78-136` (comment), exclusion applies to `app/reserve/join/[token]/page.tsx`

**Issue:** The guard's own comment states, as a hard invariant: "All 10 newly-excluded files are disclosed here by name, file and line, each independently confirmed (by dry-running that single file after the batch) to have no remaining live match other than the named exception — not a blanket, unverified exclusion." For `app/reserve/join/[token]/page.tsx` the comment names exactly one exception: the native `<button type="button" disabled={disabled} onClick={...}>` (now at line 202; the comment cites line 198, drift is expected and fine). Re-running the guard's own detection regex against the file's current content shows **two** live matches, not one:

- Line 202 — the disclosed `<button>` (legitimately un-rewritable: interactive intrinsic, denylisted).
- Line 850 — an **undisclosed** `<Link href="/reserve" className="flex items-center gap-2.5 rounded-full border border-border bg-background-elevated pl-1.5 pr-3.5 py-1 hover:bg-muted transition-colors group">`, which predates this phase entirely (introduced in commit `73536eca`, "Polish reserve feature").

The `Link` site is *functionally* safe to leave excluded — it's a custom component tag (`isComponentTag` in `hand-rolled-cards.mjs` would also skip it, correctly, for the same "would discard the component's own semantics" reason given for `<Button>`/`<Link>` elsewhere in the same comment. But the comment's own stated confidence claim ("no remaining live match other than the named exception," "not a blanket, unverified exclusion") is false for this specific file: a second, unnamed match existed at exclusion time and still exists, and was never independently confirmed or disclosed the way the doc claims every exclusion was. This is exactly the kind of drift the phase asked to be checked for (item 5): the exclusion itself isn't wrong, but the audit trail backing it is incomplete, so a future reader can't actually trust the "verified, not blanket" claim for this file.

**Fix:** Amend the `__tests__/hand-rolled-cards.test.ts` comment block to name both sites for `app/reserve/join/[token]/page.tsx` (the button at ~202 and the `<Link>` at ~850), matching the disclosure style already used for `sheet-import/_client.tsx`'s two-site exclusion:

```diff
- app/reserve/join/[token]/page.tsx:198's <button type="button"
- disabled={disabled} onClick={...}>) would have lost native
- keyboard/disabled/ARIA semantics -- its disabled:cursor-not-allowed and
- disabled:opacity-50 utilities depend on the real :disabled pseudo-class,
- which a div can never match. All 4 sites are reported SKIPPED by name
+ app/reserve/join/[token]/page.tsx:202's <button type="button"
+ disabled={disabled} onClick={...}>) would have lost native
+ keyboard/disabled/ARIA semantics -- its disabled:cursor-not-allowed and
+ disabled:opacity-50 utilities depend on the real :disabled pseudo-class,
+ which a div can never match. The same file also carries a second,
+ previously-undisclosed match at line 850 (a <Link href="/reserve">
+ styled as a pill), excluded for the identical custom-component-tag
+ reason. All 4 sites named in this paragraph are reported SKIPPED by name
```

### WR-02: `scripts/visual/baseline.mjs` claims "5 pages" / "20 images per run" twice, but the committed `PAGES` array only has 4 entries (16 images)

**File:** `scripts/visual/baseline.mjs:19`, `scripts/visual/baseline.mjs:93`, `scripts/visual/baseline.mjs:94-99`

**Issue:** The file's top-of-file doc comment states: "It captures Home (public), Overview, Guild Settings (expansion-manager panel expanded) and Loot Management (SettingsModal open) -- all authenticated pages via the dev-only /dev-login flow ... at two viewports and both themes: 5 pages x 2 themes x 2 widths = 20 images per run (D-17)." The comment immediately above the `PAGES` constant repeats the same claim: "Fixed capture matrix (D-17): 5 pages x 2 themes x 2 viewports = 20 images." Both comments enumerate only **4** pages by name (Home, Overview, Guild Settings, Loot Management), and the actual `PAGES` array has exactly 4 entries:

```js
const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'overview', path: '/overview', auth: true },
  { name: 'guild-settings', path: '/guild-settings', auth: true, afterGoto: expandExpansionSchedule },
  { name: 'loot-management', path: '/loot-management', auth: true, afterGoto: openLootSettingsModal },
]
```

4 pages × 2 themes × 2 viewports = 16 images, not 20. Either a fifth page that D-17 called for (e.g. a Master Sheet or Raid Tracking capture) was dropped from the array without updating either doc comment, or the "5 pages / 20 images" figure was never accurate and nobody has run this script against the stated design intent since. Either way, this script is the sole visual-regression evidence gate for this whole design-system workstream (used to validate Phases 07-12, including this Card/type migration), so a silently-smaller capture matrix than what D-17 specified is a real coverage gap in exactly the kind of "checkable proof" this milestone's core value proposition is about.

**Fix:** Reconcile the count — either restore the missing fifth page to `PAGES` (and confirm which page D-17 actually named), or correct both doc comments to say "4 pages ... 16 images":

```diff
- * screenshot set for the Phase 07 design-token
- * ... at two viewports and both themes: 5 pages x 2 themes x 2 widths = 20 images per run
- * (D-17).
+ * screenshot set for the Phase 07 design-token
+ * ... at two viewports and both themes: 4 pages x 2 themes x 2 widths = 16 images per run
+ * (D-17).
```

### WR-03: Several `<Card onClick=...>` "fake button" sites lack keyboard accessibility, inconsistent with the accessible pattern already established elsewhere in this same phase

**File:** `app/(app)/help/_client.tsx:35, 72`; `app/(app)/overview/components/DashboardContent.tsx:1998-2001`; `app/(app)/reserve/_client.tsx:161-166`; `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx:1068-1072`; `app/components/CharacterCard.tsx:33-36`

**Issue:** These `Card` elements are used as clickable rows/tiles (`onClick` + `cursor-pointer` + hover styling) but render a plain `<div>` with no `role="button"`, no `tabIndex`, and no `onKeyDown` handler — they are unreachable and unactivatable by keyboard, and expose no accessible role to assistive tech. This is not a regression introduced by the div→Card rename itself (these were already hand-rolled `<div onClick>` elements before the codemod ran, and the codemod is a pure tag/class rewrite that doesn't touch other attributes), so it is not a BLOCKER for this phase. It is flagged because:

1. This exact phase already fixed one Card call site to be properly accessible — `app/(app)/master-sheet/components/RaidModeView.tsx:106-111` renders `<Card role="button" tabIndex={0} onClick={...} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(ir) }}>` — so the correct pattern is already established in the same codebase, in a file this migration touched.
2. Consolidating ad-hoc hand-rolled divs onto one shared `Card` primitive was the express purpose of this phase; leaving several of the surviving click-target instances without the accessible-interactive-card treatment that a sibling call site already uses is an inconsistency a design-system migration is well-positioned to catch and standardize.

**Fix:** Apply the same `role="button"`/`tabIndex={0}`/`onKeyDown` pattern already used in `RaidModeView.tsx` to the other clickable `Card` sites, e.g. for `DashboardContent.tsx:1998`:

```diff
  <Card
+   role="button"
+   tabIndex={0}
    onClick={() => setShowCreateCharacterModal(true)}
+   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowCreateCharacterModal(true) }}
    className="p-6 hover:border-accent/50 transition-colors cursor-pointer"
  >
```


## Info

_(none — see Summary for confirmed-clean checks)_

---

_Reviewed: 2026-09-19T22:20:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
