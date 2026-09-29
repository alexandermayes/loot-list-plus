---
status: complete
phase: 08-primitive-contracts
source: [08-VERIFICATION.md]
started: 2026-09-18T01:15:00Z
updated: 2026-09-18T01:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Keyboard focus-ring walk across all focusable primitives
expected: A visible focus-visible ring appears on every control on keyboard focus and does not appear on mouse click; the ring reads as visible against its surrounding surface even where the measured light-mode contrast (2.913 vs page, 2.726 vs modal surface) is technically under the 3:1 floor.
result: pass

### 2. Live modal click-through, including the stacked default-zIndex case
expected: Each single modal (JoinGuildModal, OnboardingModal, UpgradeModal) has a real accessible name read by AT, Escape closes it, and focus returns to the trigger. In the stacked case (e.g. SettingsModal + its own useConfirm() dialog, both at default zIndex), Escape closes only the top (most-recently-opened) dialog, and Tab cycles only the top dialog's own controls.
result: pass

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none — both tests passed]

## Notes

- User reported a side note while testing (not tied to either enumerated test): "it's not letting me delete a guild." Not logged as a Gap against Test 1 or Test 2 since it wasn't offered as a description of what's wrong with either — it's a separate observation.
- **Triaged, out of Phase 08 scope:** Investigated `app/(app)/guild-settings/components/GuildSettingsContent.tsx`. The delete-guild confirmation dialog uses a standalone `Modal` directly (not `useConfirm()`/`ConfirmModal`), is never stacked under/over another modal in the normal flow, and the delete button is disabled via an unrelated, pre-existing "type `DELETE {guild name}` to confirm" exact-match gate (`deleteConfirmInput !== deleteConfirmText`) with no inline feedback if the typed text doesn't match — a classic "looks broken but isn't" UX pattern, untouched by Phase 08's modal.tsx changes (focus trap only intercepts Tab, not character input; role="dialog" is a no-op ARIA attribute). Not a Phase 08 regression. Reported to the user directly with a suggestion to verify they typed the exact confirmation string; not filed as a gap against this phase.
