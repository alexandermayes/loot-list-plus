---
phase: quick-261013-jsj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/modal.tsx
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/__tests__/modal.test.tsx
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/ForeverAnnouncementModal.tsx
  - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/__tests__/ForeverAnnouncementModal.test.tsx
autonomous: true
requirements:
  - GH-304

estimate:
  tokens: 35000
  raw_tokens: 35000
  tasks: 2
  confidence: low  # no calibration samples available in this worktree; factor 1.0

must_haves:
  truths:
    - "When the WoW Forever announcement opens, exactly one element with role dialog is in the document (the shared Modal container)"
    - "That dialog's accessible name is 'WoW Forever is here': its aria-labelledby resolves to the ModalTitle, which takes Modal's context id because it has no explicit id"
    - "That dialog's aria-describedby resolves to the ModalBody, so both approved paragraphs are announced as the description"
    - "On open, keyboard focus lands on the 'Not now' button (Modal's trap focuses the first focusable descendant)"
    - "Tab from 'Create a Forever guild' wraps to 'Not now' and Shift+Tab from 'Not now' wraps to 'Create a Forever guild', driven only by Modal's document-level trap"
    - "Escape and 'Not now' still close the dialog, write the per-user seen key and fire announcement_dismissed; after 'Not now' focus returns to the element that was focused before the dialog opened"
    - "Modal accepts an optional aria-describedby and forwards it to its dialog container; when not passed the attribute is absent, so every other Modal consumer is unchanged"
    - "Approved user-facing copy (title, two paragraphs, CTA, dismiss label) and analytics events are byte-for-byte unchanged"
  artifacts:
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/modal.tsx"
      provides: "ModalProps with optional aria-describedby forwarded to ModalContainer"
      contains: "aria-describedby={ariaDescribedBy}"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/__tests__/modal.test.tsx"
      provides: "Test that aria-describedby reaches the dialog element and is absent when omitted"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/ForeverAnnouncementModal.tsx"
      provides: "Announcement rendered directly inside Modal with no nested dialog, no local focus trap, no manual focus restore"
      contains: "aria-describedby={bodyId}"
    - path: "/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/__tests__/ForeverAnnouncementModal.test.tsx"
      provides: "17 tests: single named and described dialog, initial focus on Not now, Tab wrap, focus return, plus the 13 unchanged tests"
  key_links:
    - from: "ForeverAnnouncementModal.tsx"
      to: "components/ui/modal.tsx Modal"
      via: "aria-describedby={bodyId} prop, forwarded to ModalContainer"
      pattern: "aria-describedby=\\{bodyId\\}"
    - from: "ForeverAnnouncementModal.tsx ModalTitle (no id prop)"
      to: "ModalContainer aria-labelledby"
      via: "ModalTitleContext id assigned by ModalTitle when id is undefined"
      pattern: "<ModalTitle>"
---

<objective>
Fix GH #304: ForeverAnnouncementModal nests its own dialog element (with its own Tab trap, container focus and manual focus restore) inside the design-system Modal. Because its ModalTitle carries an explicit id, the outer Modal dialog's aria-labelledby points at an id that does not exist, so the real dialog has no accessible name, and there are two nested dialogs and two Tab traps.

After this plan the component relies on Modal for its dialog role, accessible name, focus trap, initial focus, Escape and focus restore. The only primitive change is additive: Modal gains an optional aria-describedby passthrough so the announcement body is still announced as the dialog description.

Purpose: one correctly named and described dialog for screen-reader users, one focus trap, and no bespoke focus code to drift from the primitive.
Output: two commits on branch fix/304-forever-modal-dialog (one per task), four files changed, test count for the two files goes from 22 to 25.

Locked constraints carried into every task:
- User-facing copy in ForeverAnnouncementModal.tsx (TITLE, PARAGRAPH_1, PARAGRAPH_2, CTA_LABEL, DISMISS_LABEL) is locked and must not change.
- No em dashes anywhere in added lines: code, comments, test names, commit messages, SUMMARY.
- TypeScript strict, 2-space indent, trailing commas, `import type` for type-only imports. Comments explain why and cite GH #304.
- Do not touch app/(app)/AppLayout.client.tsx (it mounts the component with no props; nothing changes there).
- Do not commit anything under .planning/, do not push, do not open a PR.
- Work only inside /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357. Never read or write /Users/alexander.mayes/Code/personal/loot-list-plus (another session is committing there).

Decomposition note: this quick task uses the orchestrator-defined two-task split (primitive passthrough, then consumer) instead of a tracer task. Task 1 is a strictly additive primitive change proven by a DOM test; Task 2 is the consumer change that exercises it end to end through the real Modal.
</objective>

<execution_context>
Quick-task execution in a git worktree. The gsd-core workflow files are not present in this worktree; follow this plan directly. Write the SUMMARY described in the output section but do not commit it.
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/modal.tsx
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/__tests__/modal.test.tsx
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/ForeverAnnouncementModal.tsx
@/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/__tests__/ForeverAnnouncementModal.test.tsx

Facts verified at planning time (2026-10-13):
- Branch is fix/304-forever-modal-dialog, working tree clean, HEAD 523e2efe.
- Baseline: `npx vitest run app/components/__tests__/ForeverAnnouncementModal.test.tsx components/ui/__tests__/modal.test.tsx` passes 22 tests (15 + 7). jsdom prints "Not implemented: Window's scrollTo()" noise; that is expected and not a failure.
- package.json scripts: `typecheck` is `tsc --noEmit`, `lint` is `eslint`. node_modules is installed in the worktree.
- Modal behaviour relied on (components/ui/modal.tsx): ModalContainer renders role="dialog", aria-modal="true", aria-labelledby={titleId}, tabIndex={-1}; ModalTitle uses `id ?? contextId`; the topmost Modal focuses the first element matching its focusable selector (which skips tabindex="-1") on open and installs a Tab/Shift+Tab wrap listener on document; Escape is handled on document; the element focused when the Modal mounted is re-focused when it unmounts, which happens 150ms (TRANSITION_MS) after open flips false.
- ModalBody is `flex-1 overflow-y-auto` and ModalHeader/ModalFooter are `flex-shrink-0`; ModalContainer is `flex flex-col` with a max height. A flex item with overflow other than visible gets an automatic minimum height of 0, so ModalBody scrolls correctly as a direct child of Modal without any min-h-0 wrapper. BisImportModal, FeedbackModal, LoginPage and WelcomeScreen already render ModalHeader/ModalBody/ModalFooter directly inside Modal.
- No other component passes aria-describedby to Modal; the only aria-describedby in app/components and components/ui is the one in ForeverAnnouncementModal.tsx.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Modal forwards an optional aria-describedby to its dialog container</name>
  <files>/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/modal.tsx, /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/__tests__/modal.test.tsx</files>
  <read_first>
    - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/modal.tsx (ModalProps interface around line 227, Modal destructure around line 236, ModalContainer JSX around line 414)
    - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/components/ui/__tests__/modal.test.tsx (first test, for the render pattern and imports)
  </read_first>
  <behavior>
    - New test "forwards aria-describedby to the dialog element when passed, and omits it otherwise": render an open Modal with aria-describedby set to the string modal-description, containing a ModalHeader (showCloseButton false) with a ModalTitle "Modal heading" and a ModalBody with id modal-description and the plain text "Body copy". Assert the element from getByRole('dialog') has attribute aria-describedby equal to modal-description and toHaveAccessibleDescription('Body copy'). Then use the `rerender` returned by render to render the same tree without the aria-describedby prop and assert the dialog does not have an aria-describedby attribute (proves existing consumers are unaffected).
    - All 7 existing modal tests keep passing unchanged.
  </behavior>
  <action>
    RED first: add the new test described in behavior to the end of the existing describe('Modal') block in modal.test.tsx, using only imports the file already has (Modal, ModalHeader, ModalTitle, ModalBody, render, screen). Run `npx vitest run components/ui/__tests__/modal.test.tsx` and confirm only the new test fails (the attribute is missing because Modal drops the prop). Do not run typecheck at this point; the test intentionally passes a prop Modal does not declare yet.

    GREEN: in components/ui/modal.tsx make exactly these three edits and nothing else in the primitive:
    1. In the ModalProps interface add an optional property whose key is the quoted string "aria-describedby" with type string, preceded by a one-line JSDoc saying it is the id of the element that describes the dialog, forwarded to the dialog container so consumers do not need to nest their own dialog (GH #304).
    2. In the Modal function's destructured parameters add the entry "aria-describedby": ariaDescribedBy (quoted key renamed to a camelCase local, with a trailing comma, placed after zIndex = 50).
    3. On the ModalContainer element add aria-describedby={ariaDescribedBy} directly after the existing aria-labelledby={titleId} line. React omits the attribute when the value is undefined, which is why every other consumer is unaffected.

    Do not change ModalTitleContext, the focus trap, Escape handling, focus restore, sizes or any existing comment (existing em dashes in old comments stay; only added lines must be em-dash free). Run the test file again; all 8 tests pass.

    Commit only these two files with `git add` naming both paths explicitly (never `git add -A` or `git add .`). Commit message subject: feat(modal): forward aria-describedby to the dialog container (GH #304). Body, one or two sentences: Modal now accepts an optional aria-describedby and puts it on its role=dialog container, so a consumer can describe the dialog without nesting a second dialog element. Additive; consumers that omit it render no attribute. End the message with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` as directed by the orchestrator (if the executor's own attribution reminder names a different model, use that reminder's trailer instead).
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 && npx vitest run components/ui/__tests__/modal.test.tsx && test "$(grep -c 'aria-describedby={ariaDescribedBy}' components/ui/modal.tsx)" = "1" && test "$(git diff 523e2efe -U0 -- components/ui/modal.tsx components/ui/__tests__/modal.test.tsx | grep '^+' | grep -c '—')" = "0"</automated>
  </verify>
  <done>
    modal.test.tsx has 8 tests and all pass; the new test failed before the modal.tsx change and passes after. modal.tsx contains exactly one aria-describedby={ariaDescribedBy}; ModalProps declares the optional "aria-describedby" string. No added line contains an em dash. One commit on fix/304-forever-modal-dialog touching only these two files.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ForeverAnnouncementModal relies on Modal for dialog role, name, focus trap and focus restore</name>
  <files>/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/ForeverAnnouncementModal.tsx, /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/__tests__/ForeverAnnouncementModal.test.tsx</files>
  <read_first>
    - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/ForeverAnnouncementModal.tsx (whole file, 186 lines)
    - /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/app/components/__tests__/ForeverAnnouncementModal.test.tsx (whole file; tests at lines 71-75 and 77-90 are the ones touched or relied on)
  </read_first>
  <behavior>
    - Replace the test "focuses the dialog container after open" with "focuses the Not now button after open": render with delayMs 0, await findByRole('dialog', { name: APPROVED.title }), get the button named APPROVED.dismiss, then await waitFor(() => expect(dismissButton).toHaveFocus()).
    - Add "renders exactly one dialog, named by the title and described by the body": render with delayMs 0, await findByRole('dialog', { name: APPROVED.title }); assert screen.getAllByRole('dialog') has length 1; assert the dialog toHaveAccessibleName(APPROVED.title); read dialog.getAttribute('aria-describedby'), assert it is truthy, look it up with document.getElementById (not querySelector, because React useId values contain characters that need CSS escaping), assert that element is not null and its textContent contains APPROVED.paragraph1 and APPROVED.paragraph2.
    - Add "returns focus to the previously focused element after Not now": render a fragment containing a plain button with type button and text Trigger followed by the component with delayMs 0; immediately after render (synchronously, before the 0ms timer fires) get the Trigger button and call .focus() on it; await findByRole('dialog', { name: APPROVED.title }); fireEvent.click the APPROVED.dismiss button; await waitFor(() => expect(trigger).toHaveFocus()) with the default timeout (Modal restores on unmount, 150ms after close).
    - Keep the Tab-trap test ("traps focus: Tab from the last element wraps ...") exactly as written. It fires keyDown on the dialog element, which is now the Modal container, and the event bubbles to document where Modal's trap listens. Only if it fails after the component change, switch both fireEvent.keyDown targets to document.activeElement (cast to HTMLElement); do not otherwise change it.
    - The other 12 existing tests stay byte-for-byte unchanged (the Escape test also relies on bubbling to Modal's document listener).
    - Final count: 17 tests in this file.
  </behavior>
  <action>
    RED first: make the three test edits from behavior in ForeverAnnouncementModal.test.tsx. Place the two new tests inside describe('ForeverAnnouncementModal, eligible user'), the single-dialog test right after the "shows the approved copy" test and the focus-return test right after the "Not now closes the dialog" test. No new imports are needed (render, screen, fireEvent, waitFor are already imported). Run `npx vitest run app/components/__tests__/ForeverAnnouncementModal.test.tsx` BEFORE touching the component and record the result in the SUMMARY: expected failures are the single-dialog test (two dialogs today) and the Not-now-focus test (today the Modal trap focuses the inner tabbable container). The focus-return test is expected to pass already (today both the component and Modal restore focus); it is a guard that removing the manual restore does not regress. If the failure set differs, note it in the SUMMARY before continuing.

    GREEN: edit ForeverAnnouncementModal.tsx per GH #304.
    <!-- planner-discipline-allow: getFocusableElements -->
    <!-- planner-discipline-allow: handleKeyDown -->
    <!-- planner-discipline-allow: dialogRef -->
    <!-- planner-discipline-allow: previousFocusRef -->
    <!-- planner-discipline-allow: titleId -->
    1. Delete the module-level getFocusableElements helper and its JSDoc.
    2. In the component body delete previousFocusRef, titleId, dialogRef and handleKeyDown. Keep closedRef, viewedRef and bodyId (bodyId still comes from useId).
    3. In the open timer inside the useEffect, delete the line that stores document.activeElement into previousFocusRef; keep setOpen(true) and the once-only announcement_viewed tracking. Keep the existing eslint-disable comment and dependency array unchanged.
    4. In handleClose delete the whole `if (action === 'dismiss')` block that re-focuses the stored element. Keep the seen-key write, closedRef, setOpen(false) and the analytics call exactly as they are; the useCallback dependency list stays [userId].
    5. Delete the wrapper div that carries the role, aria-modal, aria-labelledby, aria-describedby, the tabIndex and its explanatory comment, the outline/flex/min-h-0 className and the keydown handler. Render ModalHeader, ModalBody and ModalFooter as the direct children of Modal, in the same order and with the same props and contents as today, with one change: ModalTitle gets no id prop at all, so it takes Modal's context id and the Modal container's aria-labelledby resolves to it. ModalBody keeps id={bodyId} and its existing className; do not add min-h-0 or any other class (ModalBody's own overflow-y-auto makes it shrink and scroll inside Modal's flex column, as in every other Modal consumer).
    6. On the Modal element add aria-describedby={bodyId} alongside the existing open, onClose and size="sm" props (uses the passthrough from Task 1).
    7. Imports: after the edits useCallback, useEffect, useId, useRef and useState are all still used (handleClose, the open effect, bodyId, closedRef/viewedRef, open state). Remove any React import that eslint reports as unused; keep the Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Image and Link imports.
    8. Rewrite the component JSDoc (currently "Signed-in-only WoW Forever announcement dialog (D-01) ...") so it keeps the existing two facts (mounted once in app/(app)/AppLayout.client.tsx; shows at most once per user per browser) and adds why: the shared Modal owns the dialog semantics, its container is the single dialog, named by ModalTitle through Modal's title context and described by the body through aria-describedby, and Modal supplies the Tab trap, initial focus on the first control (Not now), Escape and focus restore on close; a second dialog element or a local focus trap must not be added here because that nesting left the real dialog unnamed (GH #304). Write it in plain prose without code identifiers of the removed helpers and without em dashes.
    9. Do not change TITLE, PARAGRAPH_1, PARAGRAPH_2, CTA_LABEL, DISMISS_LABEL, the D-01 copy comment, the props interface, the eligibility logic, FOREVER_CREATE_PATH usage or any analytics call.

    Known, accepted behaviour change: the CTA path now also gets Modal's focus restore on unmount (previously only dismiss restored focus). The restore calls focus on the element that was focused before open; if navigation has disconnected it, the call is a no-op. This is the primitive's standard behaviour and needs no code; mention it in the SUMMARY.

    Run the test file again: all 17 pass. Run `npm run typecheck` and eslint on all four touched files; both clean.

    Commit only the two files of this task with `git add` naming both paths explicitly. Commit message subject: fix(forever-modal): use the shared Modal dialog instead of nesting a second one (GH #304). Body, two or three sentences: the announcement rendered its own dialog element, Tab trap and focus restore inside Modal, and its ModalTitle id override left Modal's real dialog without an accessible name. It now renders its header, body and footer straight into Modal, which names it by the title, describes it by the body via aria-describedby, focuses Not now on open and restores focus on close. End with the same Co-Authored-By trailer rule as Task 1.
  </action>
  <verify>
    <automated>cd /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357 && npx vitest run app/components/__tests__/ForeverAnnouncementModal.test.tsx components/ui/__tests__/modal.test.tsx && npm run typecheck && npx eslint app/components/ForeverAnnouncementModal.tsx app/components/__tests__/ForeverAnnouncementModal.test.tsx components/ui/modal.tsx components/ui/__tests__/modal.test.tsx && test "$(grep -vE '^[[:space:]]*(//|\*|/\*)' app/components/ForeverAnnouncementModal.tsx | grep -cE 'getFocusableElements|previousFocusRef|dialogRef|handleKeyDown|titleId|role="dialog"|aria-modal|tabIndex')" = "0" && test "$(grep -c 'aria-describedby={bodyId}' app/components/ForeverAnnouncementModal.tsx)" = "1" && test "$(grep -c '<ModalTitle>{TITLE}</ModalTitle>' app/components/ForeverAnnouncementModal.tsx)" = "1" && test "$(git diff 523e2efe -U0 -- app/components/ForeverAnnouncementModal.tsx app/components/__tests__/ForeverAnnouncementModal.test.tsx components/ui/modal.tsx components/ui/__tests__/modal.test.tsx | grep '^+' | grep -c '—')" = "0" && git diff 523e2efe --stat</automated>
  </verify>
  <done>
    ForeverAnnouncementModal.test.tsx has 17 tests and modal.test.tsx has 8; all 25 pass, and the SUMMARY records that the single-dialog and Not-now-focus tests failed before the component change. ForeverAnnouncementModal.tsx renders ModalHeader/ModalBody/ModalFooter directly inside Modal with aria-describedby={bodyId}, ModalTitle has no id, and outside comments no line has the removed helpers, refs, the role/aria-modal/tabIndex wrapper attributes, or titleId. Approved copy constants are unchanged (git diff shows no change to the TITLE, PARAGRAPH_1, PARAGRAPH_2, CTA_LABEL or DISMISS_LABEL lines). typecheck and eslint are clean. No added line in either commit contains an em dash. Two commits total on fix/304-forever-modal-dialog, touching exactly the four planned files; nothing under .planning/ committed; nothing pushed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none new | Client-only presentational and accessibility change. No new input, network call, storage key, analytics event or dependency. The existing localStorage seen-key write and analytics calls are untouched. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-304-01 | Denial of Service (keyboard users trapped outside, or focus lost) | ForeverAnnouncementModal focus handling after removing the local trap | low | mitigate | Rely on Modal's topmost-only document Tab trap and unmount focus restore; covered by the kept Tab-wrap test, the new "focuses the Not now button after open" test and the new "returns focus to the previously focused element after Not now" test |
| T-304-02 | Tampering | Modal aria-describedby passthrough | low | accept | The value is a consumer-supplied string rendered as an attribute by React (escaped); no user input reaches it and omitting it renders nothing, verified by the rerender assertion in the new modal test |
| T-304-03 | Information disclosure | Announcement copy and analytics payload | low | accept | Copy constants and announcementEventProps('app_modal') calls are not modified; no PII added. No package installs in this plan, so no supply-chain gate applies |
</threat_model>

<verification>
From /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357:
- `npx vitest run app/components/__tests__/ForeverAnnouncementModal.test.tsx components/ui/__tests__/modal.test.tsx` passes 25 tests (17 + 8).
- `npm run typecheck` exits 0.
- `npx eslint app/components/ForeverAnnouncementModal.tsx app/components/__tests__/ForeverAnnouncementModal.test.tsx components/ui/modal.tsx components/ui/__tests__/modal.test.tsx` exits 0.
- `git log --oneline -3` shows the two new commits on top of 523e2efe on fix/304-forever-modal-dialog, both mentioning GH #304; `git diff 523e2efe HEAD --stat` lists exactly the four planned files.
- `git diff 523e2efe HEAD -U0 | grep '^+' | grep -c '—'` prints 0.
- `git status --short` shows no staged or committed .planning/ files (the untracked plan directory and SUMMARY are expected).
</verification>

<success_criteria>
- One dialog in the DOM when the announcement opens, with accessible name "WoW Forever is here" and a description containing both approved paragraphs.
- Initial focus on "Not now"; Tab and Shift+Tab wrap between "Not now" and "Create a Forever guild"; Escape and "Not now" dismiss with the seen key and announcement_dismissed; focus returns to the prior element after "Not now".
- Modal's only API change is the optional aria-describedby passthrough; all pre-existing Modal tests pass unchanged.
- No bespoke focus code remains in ForeverAnnouncementModal.tsx; approved copy unchanged.
- Two commits, no push, no PR, no .planning/ files committed.
</success_criteria>

<output>
Create /Users/alexander.mayes/Code/personal/loot-list-plus-wt-357/.planning/quick/261013-jsj-fix-gh-304-foreverannouncementmodal-reli/261013-jsj-SUMMARY.md when done (do not commit it). Include: the two commit hashes and subjects, the RED results for both tasks (which tests failed before each change), final test counts, typecheck and eslint results, the CTA focus-restore behaviour note from Task 2, and any deviation from this plan. No em dashes.
</output>
