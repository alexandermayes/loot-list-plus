# Phase 09 Deferred Items

Out-of-scope discoveries found during phase 09 execution, logged per the
executor's scope-boundary rule ("only auto-fix issues directly caused by the
current task's changes") rather than fixed inline. Each entry names the
phase/plan that introduced the issue, the file, and the destination it still
needs.

## DI-1 (RESOLVED): `app/(app)/characters/[id]/edit/_client.tsx:386`: a real `<form>` was renamed to `<Card>`, breaking the Save button

**Found during:** 09-07 Task 1, while reading the ancestry script's output to describe the `Card > div > div > div > Card` hit at this file's line 474 for the checkpoint.

**Severity:** High: this is a live functional regression, not a visual one. The "Save changes" button on the character edit page currently does nothing when clicked.

**What happened:** Commit `c6a4f8e6` (09-06 Task 2, migrating `app/(app)/characters/`) ran `hand-rolled-cards.mjs` against this file. The element at line 386 was originally:

```tsx
<form onSubmit={handleSubmit} className="bg-background-elevated border border-border rounded-xl p-6 mb-6">
```

`hand-rolled-cards.mjs`'s interactive-intrinsic-tag denylist (`button`, `a`, `input`, `select`, `textarea`, `option`, `summary`, `label`) does not include `form`, so the codemod treated `<form>` as a safe intrinsic and rewrote it to:

```tsx
<Card onSubmit={handleSubmit} className="p-6 mb-6">
```

`Card` renders a plain `<div>`. A `<div onSubmit={...}>` never fires: React only invokes `onSubmit` on a real `<form>` element, and the "Save changes" button inside it is `<Button type="submit">` with no `onClick` of its own -- it depends entirely on native form submission. The result: clicking "Save changes" on `/characters/[id]/edit` does nothing at all. (The "Go back" button on the same row is unaffected -- it has its own `onClick`.)

**Verification of the claim:** `handleSubmit` is typed `(e: React.FormEvent) => ...` at line 161; `grep -rn '<Card[^>]*onSubmit' app components` finds exactly this one site repo-wide, confirming it is not a repeated pattern elsewhere.

**Why not fixed here:** 09-07's own `files_modified` list does not include this file, and the fix (restoring a real `<form>` element, or attaching `onClick`/keyboard-submit handling to the `Card`) is unrelated to this plan's card-in-card ancestry conversion. Per the executor's scope-boundary rule, an out-of-scope bug is logged, not patched, even when severe.

**Fixed:** (post-checkpoint, before Task 2 resumed) Reverted the element to `<form>` with its original card-shaped surface classes restored (commit `e002f947`), added `form` to `hand-rolled-cards.mjs`'s `INTERACTIVE_INTRINSIC_TAGS` denylist so a future codemod run cannot reintroduce this, and added the file to `hand-rolled-card-pattern.json`'s `scanExclusions` (17 entries) since the restored `<form>` once again carries the classes PRIM-01's guard matches on. Full suite (67 files / 1198 tests), typecheck and lint all green after.

**Ledger:** recorded as `.planning/WINDOWS.md` entry 12, `status: fixed`. The ledger's `windows append`/`status` commands were also broken this session (see below) and were fixed as part of closing this out.

## WINDOWS.md ledger fixed (was broken)

Root cause found: entry 11's `status` field had been hand-set to `"resolved"`, which is not a valid value in `broken-windows.cjs`'s schema (`['open', 'waived', 'fixed']`) -- not a pre-existing tool bug as 09-05/09-06's summaries assumed, but a data error introduced when that entry was first closed out. Corrected entry 11's status to `"fixed"`, reconciled the frontmatter `open_count`/`fixed_count` with the entries array, and confirmed `gsd-tools windows status --raw` now returns `"ok": true`. DI-1 was then appended as entry 12 through the now-working ledger.
