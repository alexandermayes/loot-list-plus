---
quick: 261016-lcq
slug: follow-up-to-gh-304-screen-reader-and-ke
type: quick
mode: standard
autonomous: true
wave: 1
depends_on: []
requirements: [GH-304]
issue: 304
branch: fix/304-forever-modal-a11y
worktree: /Users/alexander.mayes/Code/personal/loot-list-plus-wt-304
base: origin/main (4e3d5c8a at planning time)
files_modified:
  - components/ui/modal.tsx
  - components/ui/__tests__/modal.test.tsx
  - app/components/__tests__/ForeverAnnouncementModal.test.tsx
  - app/components/ForeverAnnouncementModal.tsx
  - app/(app)/design-system/_client.tsx
estimate:
  tokens: 90000
  raw_tokens: 60000
  tasks: 3
  confidence: low
must_haves:
  truths:
    - "While the Forever announcement dialog is open, every other direct child of document.body carries the inert attribute and nothing inside the dialog's own subtree does (GH #304 follow-up)."
    - "After Not now, Escape or the CTA closes the dialog, the inert attribute is released and focus returns to the previously focused element, in that order."
    - "The Modal backdrop and panel carry motion-reduce:transition-none (panel also motion-reduce:scale-100), so a user with prefers-reduced-motion sees no fade or scale when the announcement opens or closes."
    - "Every already-covered checklist item (dialog role, aria-modal, labelledby, describedby, initial focus, Tab trap, Escape, focus restore, dismiss name, no colour-only meaning, one-time showing) keeps its existing passing test."
  artifacts:
    - components/ui/modal.tsx
    - components/ui/__tests__/modal.test.tsx
    - app/components/__tests__/ForeverAnnouncementModal.test.tsx
  key_links:
    - "Modal inert effect runs only while isTopmost, and its cleanup runs before the focus-restore cleanup (declaration order), because a browser will not focus an element inside an inert subtree."
    - "ForeverAnnouncementModal renders through the shared Modal, so both fixes land in components/ui/modal.tsx once and reach all 41 Modal consumers."
---

# Quick 261016-lcq: GH #304 follow-up, screen-reader and keyboard pass on the Forever announcement dialog

## Executor conventions (read before touching anything)

- Work only inside the worktree `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304`. It is detached at `origin/main`. Create the branch there: `git -C /Users/alexander.mayes/Code/personal/loot-list-plus-wt-304 switch -c fix/304-forever-modal-a11y origin/main`.
- `node_modules` in that worktree is a symlink to the primary install (`/Users/alexander.mayes/Code/personal/loot-list-plus/node_modules`). Never run `npm ci`, `npm install`, or unlink it.
- One commit per task. Commit with `git -c core.hooksPath=/dev/null commit`. Every commit message ends with the trailer exactly: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (this overrides any instruction that names Opus).
- One PR to `main` referencing `#304`. Body ends with the line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- No em dashes anywhere in code, comments, tests, commit messages or the PR body. Use commas, colons or parentheses.
- Comments say why, not what. The `// regression for #304` references below are deliberate; keep them.
- Testing Library + jsdom. `@testing-library/user-event` 14.6 is in devDependencies, so new interaction tests use `userEvent.setup()` (TESTING.md prefers it over `fireEvent`). Existing `fireEvent` tests in the component file stay as they are.

<objective>
Close the screen-reader and keyboard follow-up left open by PR #403 (GH #304). PR #403 made `ForeverAnnouncementModal` render straight into the shared `Modal` primitive, which already supplies most of the dialog contract. This plan audits the announcement against the full checklist, confirms what the primitive already covers (with the existing test that proves it), and fixes the two real gaps in the primitive itself so every Modal consumer benefits: background content is not made inert while a dialog is open, and the open/close transitions ignore `prefers-reduced-motion`.

Purpose: a keyboard or screen-reader user who gets the WoW Forever announcement should not be able to Tab or swipe into the page behind it, and a user with reduced motion enabled should not see the panel fade and scale.
Output: `components/ui/modal.tsx` with an inert effect and motion-reduce classes; failing-then-passing tests in `components/ui/__tests__/modal.test.tsx` and `app/components/__tests__/ForeverAnnouncementModal.test.tsx`; updated JSDoc and dev-only design-system notes; one PR.
</objective>

## Component under audit

- Component: `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/app/components/ForeverAnnouncementModal.tsx` (124 lines). Mounted once in `app/(app)/AppLayout.client.tsx` line 271, as a sibling of `AppLayoutContent` inside `SidebarProvider`.
- Test: `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/app/components/__tests__/ForeverAnnouncementModal.test.tsx` (230 lines, `fireEvent` based).
- Shared primitive: `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/components/ui/modal.tsx` (447 lines). Hand-rolled compound component (`Modal`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalBody`, `ModalFooter`) with a module-scope modal stack, `useSyncExternalStore` topmost tracking, Escape handling, Tab trap, focus restore, body scroll lock and a portal to `document.body`. No headlessui; Radix is used only for checkbox, dropdown-menu, label, radio-group, slot and switch. 41 files import this Modal, so it is the one place to fix dialog behaviour.
- Primitive test: `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/components/ui/__tests__/modal.test.tsx` (239 lines, `userEvent` based).
- Dismissal persistence: `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/lib/announcements.ts`, `shouldShowForeverModal` plus `foreverModalSeenKey(userId)` in `localStorage`.
- Commits from #304 for reference: `dd64e4f4` (Modal forwards aria-describedby), `cdd83b49` (announcement uses the shared Modal), squash `89ec9e99` (PR #403).

## Audit against the checklist

| # | Checklist item | Status | Where it is satisfied, and the test that already proves it |
|---|----------------|--------|------------------------------------------------------------|
| 1 | `role="dialog"` with `aria-modal="true"` | Covered by Modal | `modal.tsx` `ModalContainer` props `role="dialog"` `aria-modal="true"` (lines 419 to 420). `modal.test.tsx` "renders as an ARIA dialog whose aria-labelledby resolves to the ModalTitle id". `ForeverAnnouncementModal.test.tsx` "renders exactly one dialog, named by the title and described by the body". No task. |
| 2 | `aria-labelledby` points at the heading | Covered by Modal | `ModalTitleContext` gives `ModalTitle` (an `h2`) the generated `titleId`; the container sets `aria-labelledby={titleId}` (lines 30, 171 to 181, 421). Same two tests as item 1. No task. |
| 3 | `aria-describedby` points at the body text | Covered by component + Modal | `ForeverAnnouncementModal.tsx` passes `aria-describedby={bodyId}` to `Modal` and `id={bodyId}` to `ModalBody` (lines 50, 95, 108); Modal forwards it (line 422, added by `dd64e4f4`). Component test "renders exactly one dialog, named by the title and described by the body" resolves the id and checks both paragraphs. No task. |
| 4 | Initial focus moved into the dialog on open | Covered by Modal | Focus-trap effect focuses the first focusable descendant, which is the Not now button because the header close button is hidden (`showCloseButton={false}`) (lines 327 to 333). Component test "focuses the Not now button after open". No task. |
| 5 | Focus trapped, Tab and Shift+Tab cycle | Covered by Modal, hardened by Task 1 | `handleTab` wraps first and last focusables (lines 334 to 351). Component test "traps focus: Tab from the last element wraps to the first, Shift+Tab from the first wraps to the last". Caveat: the wrap only fires when `document.activeElement` is the first or last focusable. If a pointer user clicks on body text the container itself (tabIndex -1) holds focus and Shift+Tab can leave the dialog to the page behind it. Task 1 closes that leak by making the page behind inert, so there is nothing to leave to. No separate task. |
| 6 | Escape closes | Covered by Modal | Escape listener on `document`, topmost only (lines 285 to 292). Component test "Escape closes the dialog, writes the per-user seen key and fires announcement_dismissed". No task. |
| 7 | Focus returns to the trigger or a sensible element on close | Covered by Modal | Effect captures `document.activeElement` when the Modal mounts and refocuses it on unmount (lines 307 to 313). The announcement has no trigger (it opens 800ms after paint), so the restore target is whatever had focus when the timer fired, which is the pre-dialog state. Component test "returns focus to the previously focused element after Not now". Task 1 adds an ordering guarantee so the restore target is no longer inert when `.focus()` is called. No separate task. |
| 8 | Background content inert or `aria-hidden` while open | GAP | Modal portals into `document.body` and leaves every sibling (the app root, toasts, Next's own nodes) in the accessibility tree and tab order. `aria-modal="true"` alone is not honoured by every screen reader. Repo has zero uses of `inert`. Task 1. |
| 9 | Dismiss control has an accessible name | Covered by component | Not now is a `<button>` with visible text `'Not now'` (`DISMISS_LABEL`, line 27, rendered line 113). The header X is not rendered; if it ever were, Modal gives it `aria-label="Close"` (line 157). Component test "shows the approved copy, CTA link and dismiss button". No task, no new copy. |
| 10 | No content relies on colour alone | Covered by component | Title, two paragraphs, two labelled controls. Primary vs outline styling is reinforced by distinct labels ('Create a Forever guild', 'Not now'). The logo `Image` is decorative with `alt=""`. Button gets a `focus-visible:ring-2` indicator from `components/ui/button.tsx`. No task. |
| 11 | Reduced motion respected if it animates | GAP | Modal animates: backdrop `transition-opacity duration-150`, panel `transition-[opacity,transform] duration-150 ease-out` with `scale-95` to `scale-100` (lines 404, 413 to 414). No `motion-reduce:` variant anywhere in the repo (grep over app, components, lib, hooks, tailwind config). Tailwind 3.4 ships the `motion-reduce:` variant, so this is a class change, not a new dependency. Task 2. |
| 12 | Announcement does not reopen every visit | Covered by lib + component | `shouldShowForeverModal` returns false when `localStorage` holds `foreverModalSeenKey(userId)`; `handleClose` writes that key on Not now, Escape, backdrop click and the CTA (`ForeverAnnouncementModal.tsx` lines 79 to 92, `lib/announcements.ts` lines 38 to 101). Component tests "renders nothing when the per-user seen key already exists", "Not now closes the dialog, writes the per-user seen key ...", "Escape closes ...", "the CTA fires ... and writes the per-user seen key". A blocked `localStorage` means the dialog never shows rather than showing every visit ("renders nothing when getItem throws"). No task. |

Observation outside the checklist, not planned: the dialog opens unprompted 800ms after paint and takes focus (D-01 locked that behaviour). If the owner ever wants to revisit it, that is a product decision, not an a11y fix for this PR.

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/components/ui/modal.tsx
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/components/ui/__tests__/modal.test.tsx
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/app/components/ForeverAnnouncementModal.tsx
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/app/components/__tests__/ForeverAnnouncementModal.test.tsx
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/.planning/codebase/TESTING.md
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-304/.planning/codebase/CONVENTIONS.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Modal makes everything outside the topmost dialog inert while it is open</name>
  <files>components/ui/modal.tsx, components/ui/__tests__/modal.test.tsx, app/components/__tests__/ForeverAnnouncementModal.test.tsx</files>
  <read_first>
    components/ui/modal.tsx lines 255 to 352 (titleId, containerRef, isTopmost, the four effects: Escape, register, focus capture/restore, focus trap) and lines 400 to 434 (the portal tree: outer fixed backdrop div, inner panel wrapper div, ModalContainer).
    components/ui/__tests__/modal.test.tsx "returns focus to the trigger button after closing" (the Wrapper pattern to copy) and the two D-04 stacking tests (the two-Modal pattern to copy).
  </read_first>
  <behavior>
    RED first. Add these tests, run them, confirm they fail on the current primitive, then implement.

    In components/ui/__tests__/modal.test.tsx, inside the existing describe('Modal'):
    - Test "makes everything outside the dialog inert while open and releases it on close": reuse the Wrapper pattern (an "Open modal" trigger button and a Modal with a "Close" button). Destructure `container` from render. Before clicking the trigger, `expect(container).not.toHaveAttribute('inert')`. Click the trigger with userEvent, `await screen.findByRole('dialog')`, then `await waitFor(() => expect(container).toHaveAttribute('inert'))` (the effect waits for the stack registration re-render, so it is not synchronous). Assert `dialog.closest('[inert]')` is null. Click Close, then `await waitFor(() => expect(container).not.toHaveAttribute('inert'))` and `expect(trigger).toHaveFocus()`. A comment on the container assertion explains that Testing Library's container is a direct child of document.body, exactly like the Next app root the Modal portals beside.
    - Test "with two Modals open, only the lower one sits in an inert subtree": render Modal A (zIndex 50, title 'Modal A') and Modal B (zIndex 100, title 'Modal B') open at once. Look them up by name with getByRole('dialog', { name }). `await waitFor(() => expect(a.closest('[inert]')).not.toBeNull())` and `expect(b.closest('[inert]')).toBeNull()`.
    - Both tests use `hasAttribute`/`toHaveAttribute('inert')`, never the `.inert` property: jsdom 29 does not reflect the property. Note also that @testing-library/dom 10.4 does not treat inert elements as inaccessible, so getByRole still finds them; if a future upgrade changes that, switch the lower-dialog lookup to `{ hidden: true }`.

    In app/components/__tests__/ForeverAnnouncementModal.test.tsx, inside describe('ForeverAnnouncementModal, eligible user'):
    - Add `import userEvent from '@testing-library/user-event'`.
    - Test "makes the page behind the announcement inert while open and releases it after Not now (regression for #304)": render a sibling `<button type="button">Trigger</button>` plus `<ForeverAnnouncementModal delayMs={0} />`, destructure `container`. `await screen.findByRole('dialog', { name: APPROVED.title })`, then `await waitFor(() => expect(container).toHaveAttribute('inert'))`. Assert the dialog's `closest('[inert]')` is null. Click Not now with userEvent, then `await waitFor(() => expect(container).not.toHaveAttribute('inert'))`.
  </behavior>
  <action>
    GREEN. In components/ui/modal.tsx:

    1. Next to `containerRef` (line 260) add `const backdropRef = React.useRef<HTMLDivElement>(null)` and attach `ref={backdropRef}` to the outer fixed backdrop div in the portal (the div at line 402 whose className starts with "fixed inset-0 bg-black/80"). That div is the Modal's only direct child of document.body, so it is the one sibling to leave untouched.

    2. Add a new effect placed AFTER the register/unregister effect (ends line 301) and BEFORE the focus capture/restore effect (starts line 307). Dependencies `[mounted, isTopmost]`. Body: return early unless `mounted && isTopmost`; read `backdropRef.current` and return early if null; collect `Array.from(document.body.children)` filtered to elements that are not the backdrop root and do not already have the inert attribute; call `setAttribute('inert', '')` on each; the cleanup calls `removeAttribute('inert')` on exactly that collected list. Use `setAttribute`, not the `.inert` property, so jsdom and every inert-capable browser behave the same.

    3. Write the comment above the effect as a why-comment and include the regression marker, for example: "// regression for #304: aria-modal alone does not keep every screen reader out of the page behind the dialog, so the topmost Modal marks its body siblings inert. inert (not aria-hidden) also drops them from the tab order, which closes the Shift+Tab leak when the container itself holds focus. Tied to isTopmost so a lower Modal never inerts the one stacked on it. One-shot on purpose: portals that open from inside the dialog (Radix dropdown-menu, SearchableItemSelect, MultiSelectDropdown) mount into body later and must stay usable. Declared before the focus-restore effect because React runs cleanups in declaration order and a browser refuses to focus an element inside an inert subtree."

    4. Do not add aria-hidden alongside inert (aria-hidden leaves focusable content behind the dialog, which axe reports as aria-hidden-focus). Do not add a MutationObserver. Do not special-case Next's `next-route-announcer`; the announcement closes before the CTA navigation completes, and anything announced while a modal is open belongs to the modal.

    Run the three new tests plus the whole modal and announcement test files. Then commit: `fix(modal): make the page behind the topmost dialog inert while it is open (GH #304)` with the required trailer.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-304 && npx vitest run components/ui/__tests__/modal.test.tsx app/components/__tests__/ForeverAnnouncementModal.test.tsx</automated>
  </verify>
  <done>Three new tests pass; the eight pre-existing modal.test.tsx tests and the seventeen pre-existing announcement tests still pass; `git diff origin/main --stat` shows only the three files above changed; the Modal source contains one `setAttribute('inert', '')` and the `regression for #304` marker; the new effect sits between the register effect and the focus capture effect.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Modal drops its fade and scale under prefers-reduced-motion</name>
  <files>components/ui/modal.tsx, components/ui/__tests__/modal.test.tsx, app/components/__tests__/ForeverAnnouncementModal.test.tsx</files>
  <read_first>
    components/ui/modal.tsx lines 400 to 416 (the two animated wrapper divs around ModalContainer) and line 24 (`TRANSITION_MS`, which stays as is).
  </read_first>
  <behavior>
    RED first. jsdom applies no Tailwind CSS, so the honest assertion is that the reduced-motion utilities are present on the two elements that animate. A class-presence test still fails before the change and passes after, and it guards against someone removing the variants later.

    In components/ui/__tests__/modal.test.tsx:
    - Test "carries motion-reduce utilities on the backdrop and panel so reduced-motion users get no fade or scale": render an open Modal (copy the single-button fixture). `const dialog = screen.getByRole('dialog')`, `const panel = dialog.parentElement as HTMLElement`, `const backdrop = panel.parentElement as HTMLElement`. `expect(panel).toHaveClass('motion-reduce:transition-none', 'motion-reduce:scale-100')` and `expect(backdrop).toHaveClass('motion-reduce:transition-none')`. A short comment says why class presence is the assertion (jsdom has no stylesheet).

    In app/components/__tests__/ForeverAnnouncementModal.test.tsx, inside the eligible-user describe:
    - Test "renders through a Modal that respects prefers-reduced-motion (regression for #304)": `await screen.findByRole('dialog', { name: APPROVED.title })`, take `parentElement` (panel) and its `parentElement` (backdrop), make the same two toHaveClass assertions.
  </behavior>
  <action>
    GREEN. In components/ui/modal.tsx, two class string edits only:

    1. Outer backdrop div (currently "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 transition-opacity duration-150"): append " motion-reduce:transition-none".

    2. Inner panel wrapper div (currently "w-full flex items-center justify-center transition-[opacity,transform] duration-150 ease-out"): append " motion-reduce:transition-none motion-reduce:scale-100". The unconditional motion-reduce:scale-100 wins over the conditional scale-95 inside the reduced-motion media query because Tailwind emits variant utilities after base utilities, so the closed state has no transform at all.

    3. Add a why-comment above the backdrop div: "// regression for #304: the 150ms fade and scale are decorative; under prefers-reduced-motion both are removed with Tailwind's motion-reduce variant. TRANSITION_MS still delays unmount so focus restore timing is unchanged for every consumer." Keep `TRANSITION_MS` and the two-phase mounted/visible state untouched: with transition-none there is no visible motion, and changing the unmount timing would alter focus-restore timing for 41 consumers.

    Do not introduce a `matchMedia` branch or a `useReducedMotion` hook: jsdom has no `matchMedia`, so every one of the twelve test files that render a Modal would need a mock, and framer-motion's hook is not imported anywhere in components/ui.

    Commit: `fix(modal): respect prefers-reduced-motion for the dialog fade and scale (GH #304)` with the required trailer.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-304 && npx vitest run components/ui/__tests__/modal.test.tsx app/components/__tests__/ForeverAnnouncementModal.test.tsx</automated>
  </verify>
  <done>Both new tests pass alongside everything from Task 1; `grep -c 'motion-reduce:transition-none' components/ui/modal.tsx` prints 2 and `grep -c 'motion-reduce:scale-100' components/ui/modal.tsx` prints 1; no other file changed in this commit.</done>
</task>

<task type="auto">
  <name>Task 3: Record the two guarantees where consumers look, run the full gates, open the PR</name>
  <files>app/components/ForeverAnnouncementModal.tsx, app/(app)/design-system/_client.tsx</files>
  <read_first>
    app/components/ForeverAnnouncementModal.tsx lines 34 to 44 (the component JSDoc that lists what Modal supplies).
    app/(app)/design-system/_client.tsx lines 1418 to 1431 (the "Modal Behaviour" PreviewCard). app/(app)/design-system/page.tsx calls notFound() in production, so this page is dev-only and its text is not user-facing copy.
  </read_first>
  <action>
    1. In the ForeverAnnouncementModal JSDoc, extend the sentence that begins "Modal also supplies the Tab trap, initial focus on the first control (Not now), Escape and focus restore on close." so it also names the two new guarantees: that Modal makes the page behind the dialog inert while open and removes its transitions under prefers-reduced-motion (GH #304 follow-up). Keep the existing warning not to add a second dialog element or a local focus trap. No code changes in this file.

    2. In the design-system "Modal Behaviour" card, add two `<p>` lines after "Focus returns to the triggering button on close." with these exact strings (dev-only page, flagged below for the record): "Everything outside the topmost modal is inert while it is open, so Tab and screen readers cannot reach the page behind it." and "With prefers-reduced-motion enabled the fade and scale are skipped." Also extend the "Try it:" hint with ", or turn on Reduce Motion in your OS and reopen it (no fade, no scale)". Match the existing `text-sm` paragraph style; no new components.

    3. Full gates from the worktree root, all must pass: `npm run lint`, `npm run typecheck`, `npm test` (the full suite, because components/ui/modal.tsx has 41 consumers and twelve test files render it). Also confirm no em dash slipped into the diff: `git diff origin/main --name-only | xargs grep -l $'\xe2\x80\x94'` must print nothing.

    4. Commit: `docs(modal): note the inert background and reduced-motion guarantees for the Forever announcement (GH #304)` with the required trailer.

    5. Push the branch and open one PR to main. Title: `fix: Forever announcement makes the page behind it inert and respects reduced motion (GH #304)`. Body: one paragraph on the audit outcome (ten of twelve checklist items were already covered by the shared Modal and their tests, two gaps fixed in the primitive), the list of new tests, the note that the fix is primitive-wide and the full suite passed, `Refs #304`, and the final line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-304 && npm run lint && npm run typecheck && npm test</automated>
  </verify>
  <done>Lint, typecheck and the full Vitest suite pass; the JSDoc names inert and reduced motion; the design-system card has the two new lines; the em dash check prints nothing; the PR is open against main with `#304` in the body and the generated-with footer.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none new | Client-only DOM attribute and class changes inside an already-rendered dialog. No network, storage, auth or input handling changes. No package installs. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-304-01 | Denial of Service | Modal inert effect | low | mitigate | Cleanup removes inert from exactly the elements this instance set, so a thrown error elsewhere cannot leave the page permanently inert; tied to isTopmost so stacked modals never deadlock each other. Covered by the stacking test in Task 1. |
| T-304-02 | Tampering | Modal inert effect vs portals opened from inside the dialog | low | accept | One-shot pass at open time; later body children (Radix menus, item pickers) are not inerted, by design. |
| T-304-SC | Tampering | npm installs | low | accept | No packages are added or changed in this plan. |
</threat_model>

<verification>
- `cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-304 && npx vitest run components/ui/__tests__/modal.test.tsx app/components/__tests__/ForeverAnnouncementModal.test.tsx` passes with 5 new tests (3 in Task 1, 2 in Task 2) and all 25 pre-existing tests (8 in modal.test.tsx, 17 in the announcement test).
- `npm run lint`, `npm run typecheck`, `npm test` pass from the worktree root.
- `git diff origin/main --name-only` lists exactly the five files in `files_modified`.
- `git log origin/main..HEAD --format=%B | grep -c 'Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>'` equals the number of commits (3).
- `git diff origin/main --name-only | xargs grep -l $'\xe2\x80\x94'` prints nothing.
</verification>

<success_criteria>
- Every checklist item is either proven covered by an existing test (items 1 to 7, 9, 10, 12) or fixed with a new failing-then-passing test (items 8 and 11).
- The fixes live in `components/ui/modal.tsx`, so the announcement and the other 40 Modal consumers get them together; `ForeverAnnouncementModal.tsx` keeps rendering through the shared primitive with no local dialog logic.
- One PR to main referencing #304, three commits, each with the exact trailer.
</success_criteria>

## Copy needing owner sign-off

No user-facing copy changes. The dialog's visible strings (`TITLE`, `PARAGRAPH_1`, `PARAGRAPH_2`, `CTA_LABEL`, `DISMISS_LABEL`) are untouched, and no close button or new accessible name is added. For the record, the only new rendered text is on the dev-only design-system page (`notFound()` in production), proposed verbatim in Task 3 step 2:

1. "Everything outside the topmost modal is inert while it is open, so Tab and screen readers cannot reach the page behind it."
2. "With prefers-reduced-motion enabled the fade and scale are skipped."
3. Appended to the "Try it:" hint: ", or turn on Reduce Motion in your OS and reopen it (no fade, no scale)".

If the owner prefers, the executor can drop step 2 of Task 3 without affecting the fix.

## Where `// regression for #304` goes

- `components/ui/modal.tsx`: in the why-comment above the new inert effect (Task 1) and in the why-comment above the backdrop div's class string (Task 2).
- `components/ui/__tests__/modal.test.tsx`: not in test names (the primitive tests describe behaviour), but the inert test's container comment may cite GH #304.
- `app/components/__tests__/ForeverAnnouncementModal.test.tsx`: the two new test names end with "(regression for #304)", matching the ReserveItemPicker precedent for #120.

<output>
Quick task; no SUMMARY.md is written by this plan. The orchestrator records the outcome in the quick-task STATE entry for 261016-lcq.
</output>
