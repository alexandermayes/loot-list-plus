---
phase: quick-261013-jsj
plan: 01
status: complete
requirements: [GH-304]
commits:
  - dd64e4f4
  - cdd83b49
branch: fix/304-forever-modal-dialog
actuals:
  tasks: 2
  commits: 2
---

# Quick Task 261013-jsj: Fix GH #304 ForeverAnnouncementModal dialog nesting

ForeverAnnouncementModal now renders straight into the shared Modal, so the Modal container is the single, correctly named and described dialog; Modal gained an additive optional aria-describedby passthrough to make that possible.

## Commits

| Task | Hash | Subject |
| ---- | ---- | ------- |
| 1 | dd64e4f4 | feat(modal): forward aria-describedby to the dialog container (GH #304) |
| 2 | cdd83b49 | fix(forever-modal): use the shared Modal dialog instead of nesting a second one (GH #304) |

Four files changed: components/ui/modal.tsx, components/ui/__tests__/modal.test.tsx, app/components/ForeverAnnouncementModal.tsx, app/components/__tests__/ForeverAnnouncementModal.test.tsx.

## What changed

- Modal: optional "aria-describedby" prop on ModalProps, destructured as ariaDescribedBy and set on the ModalContainer after aria-labelledby. React omits the attribute when undefined, so other consumers are unchanged.
- ForeverAnnouncementModal: removed the nested role=dialog wrapper, the local Tab trap (getFocusableElements, handleKeyDown), dialogRef container focus, previousFocusRef and the manual focus restore in handleClose, and the titleId. ModalTitle now has no id, so Modal's context id labels the real dialog. Modal gets aria-describedby={bodyId}. Component JSDoc explains why (GH #304). Approved copy constants and analytics calls are untouched.

## RED results

- Task 1: only the new test "forwards aria-describedby to the dialog element when passed, and omits it otherwise" failed (attribute was null); the 7 existing tests passed.
- Task 2 (before the component change): 2 failed, 15 passed. Failures were "renders exactly one dialog, named by the title and described by the body" and "focuses the Not now button after open", as predicted. The new focus-return test passed already (guard against regression), as predicted.

## Verification

- `npx vitest run app/components/__tests__/ForeverAnnouncementModal.test.tsx components/ui/__tests__/modal.test.tsx`: 2 files, 25 tests passed (17 + 8; baseline was 22).
- `npm run typecheck` (tsc --noEmit): exit 0.
- `npx eslint` on the four touched files: exit 0.
- Plan grep checks: no removed helpers, refs or role/aria-modal/tabIndex outside comments; exactly one `aria-describedby={bodyId}` and one `<ModalTitle>{TITLE}</ModalTitle>`; no em dashes in added lines.
- `git log --oneline origin/main..HEAD` shows exactly the two commits above; `git diff --stat origin/main..HEAD` lists only the four files, nothing under .planning/. Nothing pushed, no PR.

## Behaviour note

The CTA path ("Create a Forever guild") now also gets Modal's standard focus restore on unmount; previously only dismiss restored focus. If navigation has already disconnected the previously focused element, the focus call is a no-op. This is the primitive's standard behaviour and needs no code.

## Deviations from Plan

None. The Tab-wrap test passed unchanged, so no keyDown target change was needed. The commit trailer is `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` per orchestrator override.
