---
phase: 08-primitive-contracts
reviewed: 2026-09-17T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - __tests__/design-tokens/report.ts
  - __tests__/label-text-production-sites.test.ts
  - __tests__/type-scale-floor.test.ts
  - app/(app)/admin/addon/_client.tsx
  - app/(app)/design-system/_client.tsx
  - app/(app)/loot-list/components/LootListContent.tsx
  - app/(app)/raid-teams/_client.tsx
  - app/(app)/reserve/runs/[id]/_client.tsx
  - app/(app)/sheet-import/_client.tsx
  - app/components/JoinGuildModal.tsx
  - app/components/OnboardingModal.tsx
  - app/components/Sidebar.tsx
  - app/components/UpgradeModal.tsx
  - app/globals.css
  - app/reserve/join/[token]/components/InlineSettingsEditor.tsx
  - app/reserve/join/[token]/page.tsx
  - components/ui/__tests__/modal.test.tsx
  - components/ui/__tests__/skeletons.test.tsx
  - components/ui/input.tsx
  - components/ui/label.tsx
  - components/ui/modal.tsx
  - components/ui/select.tsx
  - components/ui/skeletons.tsx
  - components/ui/textarea.tsx
  - components/ui/typography.tsx
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
fixed_at: 2026-09-17T18:03:00Z
fix_commits:
  - 027129cd  # CR-01: modal.tsx tie-break fix + regression test
  - ba7d8224  # WR-01: stale Label Text demo captions (initial pass)
  - cf8a6d55  # WR-01: follow-up — removed literal "LabelText" mention that tripped PRIM-02 guard test
fix_status: partial  # CR-01 and WR-01 fixed; WR-02 (accepted per 08-DECISIONS.md OI-3) and WR-03 (dead code) intentionally left unaddressed
---

# Phase 08: Code Review Report

**Reviewed:** 2026-09-17
**Depth:** standard
**Files Reviewed:** 24 (+1 `components/ui/confirm-modal.tsx` pulled in as a direct consumer of `modal.tsx`'s stacking logic to verify a reachable real-world trigger — cited in CR-01, not counted in `files_reviewed`)
**Status:** issues_found

## Summary

Reviewed the Phase 08 primitive-contracts work: the `Modal` accessibility/focus-trap/stacking rewrite in `components/ui/modal.tsx`, the `LabelText`/`.section-label` → `Text` consolidation across ~10 files, the shared focus-visible ring on `Input`/`Textarea`/`Select`, the `label.tsx` pixel-to-named-alias swap, and the 3 named skeleton fidelity fixes.

The `LabelText → Text` migration itself is mechanically clean and matches `08-DECISIONS.md`'s approved rule everywhere I traced it (production sites, docs page, `Sidebar.tsx`'s 4 recased strings). The one genuine functional bug is in the new Modal-stacking logic (`getTopmostModalId`): its tie-break is backwards for the default (and overwhelmingly common) case where two simultaneously-open `Modal`s share the same `zIndex`, which is reachable today via `SettingsModal` + its own `useConfirm()` confirmation dialog. The project's own `08-CONTEXT.md` D-04 requirement ("only the topmost/last-mounted Modal...") is not satisfied for that case, and the new `modal.test.tsx` D-04 test only exercises the distinct-zIndex case, so this ships untested. I've also flagged a stale/self-contradicting demo in the design-system docs page left over from the migration, a residual (documented-but-shipping) light-mode focus-ring contrast gap that this phase widens the blast radius of, and one piece of dead code.

## Critical Issues

### CR-01: Modal stacking tie-break picks the wrong (first-opened, not topmost) Modal when zIndex ties — breaks D-04 for the default case

**FIXED** (commit `027129cd`): `getTopmostModalId()` now uses `>=` instead of `>`, so a later-registered entry with an equal zIndex wins the tie. Added a same-zIndex regression test to `components/ui/__tests__/modal.test.tsx` (verified it fails against the old `>` comparison and passes with the fix).

**File:** `components/ui/modal.tsx:52-55`
**Issue:**
```ts
function getTopmostModalId(): string | undefined {
  if (modalStack.length === 0) return undefined
  return modalStack.reduce((top, entry) => (entry.zIndex > top.zIndex ? entry : top)).id
}
```
`registerOpenModal` appends newly-(re)registered entries to the *end* of `modalStack` (`[...filtered, newEntry]`), so array order is insertion order. The `reduce` above uses strict `>`, so when a later-registered entry has a zIndex *equal to* an earlier one, the earlier entry is kept as "top" (ties always favor the first array element encountered, i.e. the modal that opened first).

Nearly every `<Modal>` call site in the app relies on the default `zIndex={50}` — only `JoinGuildModal` passes a non-default value (`100`). This means any time two default-zIndex `Modal`s are open simultaneously, the tie-break silently keeps the *older* modal as "topmost," not the one that actually opened on top of it. This directly contradicts the phase's own documented requirement in `.planning/workstreams/design-system/phases/08-primitive-contracts/08-CONTEXT.md` (D-04): *"only the topmost/**last-mounted** `Modal` installs the focus trap and the Escape handler."* The implementation satisfies "topmost by zIndex" but not "last-mounted" when zIndex ties — which is the common path, not an edge case.

This is concretely reachable in production: `app/(app)/loot-management/components/SettingsModal.tsx` renders its own `<Modal open={open} ...>` (default zIndex) and, inside it, calls `confirm({...})` (from `useConfirm()` / `components/ui/confirm-modal.tsx`) which mounts a second `<Modal open size="sm">` (also default zIndex) as a delete/confirm dialog on top of it. Because both share zIndex 50 and the settings modal registered first, `getTopmostModalId()` keeps returning the *settings* modal's id:
- The confirm dialog's own `isTopmost` is `false`, so its focus trap never installs and its initial-focus effect never runs.
- Its own Escape handler never installs either — instead, the **settings modal's** Escape handler (still `isTopmost === true`) fires, so pressing Escape while a "Delete this?" confirmation is showing **closes the entire settings modal underneath it**, not just the confirmation — an unexpected, potentially disruptive loss of context (any unsaved settings-modal state goes away with it).
- Tab continues to cycle through the (now visually-covered) settings modal's fields instead of the confirm dialog's own Cancel/Confirm buttons.

The only stacking test in `components/ui/__tests__/modal.test.tsx` ("D-04: only the topmost of two simultaneously-open Modals traps focus and handles Escape") explicitly uses two *different* zIndexes (`50` and `100`), so this regression has zero test coverage despite being the realistic, default-configuration case.

**Fix:** Break ties in favor of the most-recently-registered entry (array order already reflects insertion order), and add a same-zIndex regression test:
```ts
function getTopmostModalId(): string | undefined {
  if (modalStack.length === 0) return undefined
  return modalStack.reduce((top, entry) => (entry.zIndex >= top.zIndex ? entry : top)).id
}
```
Add a `modal.test.tsx` case that opens two `Modal`s with the *same* (default) `zIndex`, asserts the second one traps focus/handles Escape, and — ideally — a component test that reproduces the `SettingsModal` + `useConfirm()` nested-default-zIndex scenario directly.

## Warnings

### WR-01: Design-system docs "Label Text" demo is now stale and self-contradicting after the `LabelText → Text` migration

**FIXED** (commits `ba7d8224`, `cf8a6d55`): Rewrote the subsection description and both captions in `app/(app)/design-system/_client.tsx` to describe what actually renders today (12px, not uppercase for both examples) instead of the pre-migration 10px-uppercase/12px-uppercase claims.

**File:** `app/(app)/design-system/_client.tsx:460-476`
**Issue:** Before this phase, this section demoed `<LabelText size="xs">Extra Small</LabelText>` (10px, `uppercase tracking-wider`) next to `<LabelText size="sm">Small</LabelText>` (12px, same uppercase treatment), matching the captions below each ("10px uppercase" / "12px uppercase"). The migration (commit `154b123d`) replaced *both* with the identical `<Text size="sm" weight="semibold" color="secondary" as="span">`, per the approved mechanical migration rule. The section header ("Uppercase labels for sections and forms") and both captions were left unchanged, so the page now:
- Renders "Extra Small" and "Small" as visually identical (both 12px, same weight/color) despite being captioned as 10px vs. 12px.
- Renders neither example in uppercase, despite the section explicitly being titled "Uppercase labels for sections and forms" and both captions repeating "uppercase."

This is the project's own component-library reference page contradicting itself about a component (`LabelText`) that no longer exists. Low user-impact (internal docs page), but it's exactly the kind of "migration looked complete but the demo lied" gap worth catching before merge.
**Fix:** Either delete this subsection (the `LabelText` component and its uppercase convention are retired, so there's nothing left to document) or rewrite the header/captions to describe what `Text size="sm" weight="semibold" color="secondary"` actually renders today.

### WR-02: This phase widens the surface of an already-known light-mode focus-ring contrast failure

**File:** `__tests__/design-tokens/report.ts:85-112` (see also `components/ui/input.tsx:23`, `components/ui/textarea.tsx:23`, `components/ui/select.tsx:26`)
**Issue:** `report.ts`'s own comment states the accepted-but-unfixed fact plainly: in light mode, the shared `--ring` token measures **2.913:1** against the plain page and **2.726:1** against the modal surface — both below the WCAG 1.4.11 non-text-contrast floor of 3:1 (it only clears the floor against the card/elevated surface, at 3.093:1). `08-DECISIONS.md` OI-3 explicitly accepted this as a carried-forward gap rather than a phase-08 fix. That's a reasonable scoping call, but this phase is precisely what multiplies the number of on-page elements now relying on that same failing token: `Input`, `Textarea`, and `Select` all gained `focus-visible:ring-2 focus-visible:ring-ring ...` in this phase, on top of the existing `Button`/`Switch`/`Checkbox`/`Radio`. Every form field on every light-mode page (which is most of the app's forms — `raid-teams`, `sheet-import`, `reserve` join settings, etc., several of which are in this review's own file list) now has a keyboard-focus indicator that fails the accessibility floor against its own surrounding surface.
**Fix:** Not blocking this phase's merge given the explicit, recorded decision — but this should be tracked as a must-fix-soon item (adjust `--ring`'s lightness in light mode) rather than something that keeps getting re-accepted phase over phase as more primitives adopt it.

### WR-03: `ModalBackdrop` is dead code with divergent click-guard logic from the backdrop `Modal` actually renders

**File:** `components/ui/modal.tsx:63-84` (unused), vs. the inline backdrop at `components/ui/modal.tsx:394-402`
**Issue:** `ModalBackdrop` is exported from `modal.tsx` and re-exported at the bottom of the file, but `grep -rn "ModalBackdrop" app components` finds no consumer anywhere in the codebase. `Modal` itself builds its own backdrop `<div>` inline instead, with a *different* click-guard implementation (`handleBackdropMouseDown`/`handleBackdropClick`, tracking `mouseDownOnBackdrop` across mousedown+click) than `ModalBackdrop`'s own `onClick`-only guard. Keeping an unused, differently-behaved component alongside the one actually in use is confusing for future maintainers and a likely source of "I fixed the backdrop bug in the wrong place" mistakes.
**Fix:** Delete `ModalBackdrop` (and its export) if it's not needed, or wire `Modal` to actually render it and drop the duplicated inline implementation.

## Info

### IN-01: Sidebar.tsx recasing and Text migration verified consistent

**File:** `app/components/Sidebar.tsx:346-349, 442-444, 562-565, 626-629`
No issue — noting for the record since it was explicitly called out as a review focus area. All four hand-rolled `GUILD`/`GUILDS`/`CHARACTER`/`ADMIN SETTINGS` label sites were migrated identically to `<Text size="sm" weight="semibold" color="secondary">` (default `as="p"`, matching the original `<p>` element) with recasing exactly matching `08-DECISIONS.md`'s OI-4 table (`Guild`, `Guilds`, `Character`, `Admin settings`). No inconsistency found between the four sites.

---

_Reviewed: 2026-09-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
