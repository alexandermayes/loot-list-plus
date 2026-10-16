---
phase: quick-261016-lcq
plan: 01
subsystem: components/ui/modal.tsx (shared dialog primitive) and the Forever announcement
tags: [a11y, modal, forever, gh-304]
requirements: [GH-304]
key-files:
  modified:
    - components/ui/modal.tsx
    - components/ui/__tests__/modal.test.tsx
    - app/components/ForeverAnnouncementModal.tsx
    - app/components/__tests__/ForeverAnnouncementModal.test.tsx
    - app/(app)/design-system/_client.tsx
status: complete
completed: 2026-10-16
---

# Quick 261016-lcq: screen-reader and keyboard pass on the Forever announcement (GH #304 follow-up)

## Commits

Branch fix/304-forever-modal-a11y, PR #430:
- f03339f4 fix(modal): make the page behind the topmost dialog inert while it is open (GH #304)
- 9ad65239 fix(modal): respect prefers-reduced-motion for the dialog fade and scale (GH #304)
- c3c1685c docs(modal): note the inert background and reduced-motion guarantees for the Forever announcement (GH #304)

## What changed

- Audit result: the shared Modal primitive already provided role="dialog" with aria-modal, aria-labelledby and aria-describedby, initial focus, Tab and Shift+Tab trapping, Escape, focus restore, an accessibly named dismiss control and one-time showing, each with an existing test. Two gaps remained.
- Gap A: the page behind the topmost modal was never inert, so Shift+Tab from the container could leak out and screen readers could reach the background. The topmost Modal now sets the `inert` attribute on every body child except its own backdrop root (skipping elements already inert) and removes exactly that set on cleanup, before focus is restored. Attribute, not property, so unsupported browsers ignore it.
- Gap B: the open and close fade and scale ignored prefers-reduced-motion. The backdrop and panel wrapper gained motion-reduce classes; TRANSITION_MS is untouched.
- Dev-only design-system Modal Behaviour card documents both guarantees. No user-facing copy changed.

## Verification

- `npx vitest run components/ui/__tests__/modal.test.tsx app/components/__tests__/ForeverAnnouncementModal.test.tsx`: 30 pass (25 existing, 5 new; each new test seen failing first)
- `npm test` (full, 41 Modal consumers): 217 files, 3901 tests pass
- `npm run lint` 0 errors; `npm run typecheck` clean

## Deviations from Plan

- One commit per task instead of separate red and green commits.
- Extra defensive guards in the inert effect (document and body null checks, `!child.contains(root)`).
- PR title shortened to fit 70 characters.

## Flags for the user

- Out of scope and still open: the announcement auto-opens 800ms after load and steals focus (locked by the earlier D-01 decision).
- Pre-existing em dashes in untouched modal.tsx comments were left alone.

## Known Stubs

None.

## Threat Flags

None.
