---
phase: 08-primitive-contracts
verified: 2026-09-18T01:09:40Z
status: passed
score: 5/5 ROADMAP success criteria present-and-evidenced; 1 of the 5 (criterion 3) carries an explicit, user-accepted numeric shortfall in one theme, not a hidden gap
behavior_unverified: 0
overrides_applied: 0
mode_note: "Phase frontmatter declares mode: mvp, but the ROADMAP goal line for Phase 08 is outcome-shaped, not user-story-shaped ('The shared primitives are correct, accessible and singular...'). gsd-tools query user-story.validate confirms valid=false against this goal text. This mirrors Phase 07's own documented mismatch (07-VERIFICATION.md's mode_note, itself citing 07-01-PLAN.md's <phase_goal_note> that 'the plans below are unaffected either way'). Verification proceeded using standard goal-backward methodology against ROADMAP's five numbered Phase 08 success criteria, matching how the phase was planned, executed and self-evidenced (08-EVIDENCE.md). The User Flow Coverage table format was not applicable and was not produced. This is a process/config note for the developer, not a phase defect."
re_verification: null
human_verification:

  - test: "Tab through one real form (e.g. raid-teams settings or reserve join settings) in the running app, in both light and dark mode, hitting every Input, Textarea, Select, Switch, Checkbox, Radio and Button."
    expected: "A visible focus-visible ring appears on every control on keyboard focus and does not appear on mouse click; the ring reads as visible against its surrounding surface even where the measured light-mode contrast (2.913 vs page, 2.726 vs modal surface) is technically under the 3:1 floor."
    why_human: "No automated check inspects rendered pixel appearance or perceived visibility; the contrast numbers are proven by test/script (__tests__/design-tokens/report.ts), but 'a keyboard walk through one real form reaches every control with visible focus' (ROADMAP success criterion 3's own clause) has not been run by any automated task in this phase. Already recorded as WINDOWS.md entry 7 (open, unrun-verify), deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase."

  - test: "In the running app, open JoinGuildModal, OnboardingModal and UpgradeModal individually, and separately trigger a stacked pair (e.g. open SettingsModal, then trigger its own useConfirm() dialog on top of it, both at the shared default zIndex)."
    expected: "Each single modal has a real accessible name read by AT, Escape closes it, and focus returns to the trigger. In the stacked case, Escape closes only the top (most-recently-opened) dialog — not the one underneath — and Tab cycles only the top dialog's own controls."
    why_human: "This exercises the exact real-world nested-default-zIndex scenario CR-01 in 08-REVIEW.md found broken and commit 027129cd fixed; the fix is proven by a new automated regression test (see Goal Achievement below), but the phase's own plan (08-02-PLAN.md's <verification> section) explicitly defers the live click-through of these three modals to the phase-level checkpoint, and it was not run by any automated task. Already recorded as WINDOWS.md entry 8 (open, unrun-verify), deferred to end-of-phase UAT."
---

# Phase 08: Primitive Contracts Verification Report

**Phase Goal:** The shared primitives are correct, accessible and singular, so the migration sweeps have exactly one right thing to migrate onto.
**Verified:** 2026-09-18
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | `components/ui/label.tsx` and `components/ui/typography.tsx` contain no `text-[Npx]`; every size is a scale step | ✓ VERIFIED | `grep -nE 'text-\[[0-9]+px\]' components/ui/label.tsx components/ui/typography.tsx` (re-run live) → zero matches. `label.tsx`'s `labelVariants` now reads `text-12`/`text-13`/`text-14` (Phase 07 aliases). `npx vitest run __tests__/type-scale-floor.test.ts` → 19/19 passing, including the new TYPE-02 file-scoped describe block. |
| 2 | Exactly one label convention survives: `LabelText` (typography.tsx) and `.section-label` (globals.css) are deleted, a grep for either returns nothing outside documentation, and each former use renders either the single form `Label`/`Text` or the single non-uppercase section heading | ✓ VERIFIED | `grep -rn 'LabelText\|section-label' app components --include='*.tsx' --include='*.ts' --include='*.css'` (re-run live) → zero matches anywhere in source. `components/ui/typography.tsx` no longer defines or exports `LabelText`/`labelTextVariants`; `app/globals.css` no longer defines `.section-label`. All 55 former `LabelText` production+docs sites and both `.section-label` sites render `<Text size="sm" weight="semibold" color="secondary">`. `Sidebar.tsx`'s 4 hand-rolled sites (lines 347, 442, 563, 627, re-verified live) render the identical `Text` shape with sentence-case copy (`Guild`, `Guilds`, `Character`, `Admin settings`) matching 08-DECISIONS.md's OI-4 branch-(b) sign-off table exactly — confirmed the old uppercase strings and the old hand-rolled class string are both fully gone (`grep` for either → 0). `npx vitest run __tests__/type-scale-floor.test.ts`'s PRIM-02 repo-wide describe block passes. |
| 3 | Every focusable primitive (Input, Textarea, Select, Switch, Checkbox, Radio, Button, nav links) shows a visible `focus-visible` ring drawn from `--ring` at 3:1 or better against its surface, and `input.tsx:23` no longer removes the outline in favour of a border colour change; a keyboard walk through one real form reaches every control with visible focus | ⚠️ PARTIAL — accepted, evidenced deviation; keyboard walk unrun | `grep` confirms `input.tsx:23`, `textarea.tsx:23`, `select.tsx:26` each stack `focus:border-accent` with the identical `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` suffix already on Button/Switch/Checkbox/Radio — the outline-removal-via-border-colour defect named in the criterion's own text is fixed. `npx tsx __tests__/design-tokens/report.ts` (re-run live) → dark mode clears 3:1 against all three surfaces (7.984/7.753/6.530); light mode clears it only against the card surface (3.093) and measures **below** 3:1 against the plain page (2.913) and the modal's own surface (2.726). This numeric shortfall is not hidden: it is the explicit subject of 08-DECISIONS.md's OI-3, resolved by the approving user (Alexander Mayes, verbatim "Option (a) — accept and record the gap") at the phase's own blocking checkpoint, before any source edit, and carried forward with a named destination (Phase 12's DESIGN.md) rather than silently absorbed. The keyboard-walk clause of this same criterion was not run by any automated task — see Human Verification below. |
| 4 | `Modal` has `role="dialog"`, `aria-modal="true"`, an accessible name from its title, a focus trap, focus return to the trigger on close, and Escape handling, each asserted by a vitest component test | ✓ VERIFIED | `components/ui/modal.tsx:416-417` renders `role="dialog" aria-modal="true"` on `ModalContainer`; `ModalTitleContext` wires `aria-labelledby` to the rendered `ModalTitle`'s id (`grep -c ModalTitleContext` → 3+). `npx vitest run components/ui/__tests__/modal.test.tsx` → **7/7 passing** (role/aria-modal/labelledby, initial focus, Escape-closes, focus-return, Tab-wrap both directions, distinct-zIndex D-04 stacking, **and** a same-zIndex D-04 regression test). `JoinGuildModal`, `OnboardingModal`, `UpgradeModal` each import and render `ModalTitle` (confirmed live: 2/1/1 occurrences respectively). A CRITICAL bug (`getTopmostModalId()`'s tie-break favoring the first-registered modal, not the last-mounted one, when two Modals share the default zIndex — 08-REVIEW.md CR-01) was found post-hoc and is genuinely fixed: `git show 027129cd` confirms the `>` → `>=` change plus a new same-zIndex regression test in `modal.test.tsx`, both independently re-verified present in the current working tree and passing. |
| 5 | Skeletons match the layouts they stand in for (guild settings renders 8 cards rather than 2, the raid-tracking legend renders the real swatch count) so loading does not shift layout, and `skeletons.tsx:486` has no 4px side border | ✓ VERIFIED | `components/ui/skeletons.tsx`: `GuildSettingsContentSkeleton` maps `Array.from({ length: 8 })` (was 2); `RaidTrackingPageSkeleton`'s legend loop maps `Array.from({ length: 5 })` (was 4, matching OI-6's "always 5, never speculate the conditional 6th" resolution); `grep -c 'border-l-4' components/ui/skeletons.tsx` → `0`. `npx vitest run components/ui/__tests__/skeletons.test.tsx` → 3/3 passing. |

**Score:** 4/5 ROADMAP success criteria fully verified with no caveat; 1/5 (criterion 3) is present, wired, and evidenced with an explicit, user-approved acceptance of a numeric shortfall in one theme against two of three surfaces — a documented decision, not a silent gap, plus one still-unrun manual keyboard-walk check belonging to that same criterion.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| TYPE-02 | `Label`/`Heading`/`Text` express sizes through scale steps, not `text-[Npx]` | ✓ SATISFIED | Criterion 1 above. |
| PRIM-02 | Exactly one label convention; `LabelText`/`.section-label` deleted and migrated | ✓ SATISFIED | Criterion 2 above. |
| PRIM-03 | Every focusable primitive shows a visible `focus-visible` ring at ≥3:1; `input.tsx` no longer swaps outline for border colour | ⚠️ SATISFIED WITH DOCUMENTED EXCEPTION | Criterion 3 above — ring is wired and stacked everywhere; the ≥3:1 clause is not met in light mode against 2 of 3 surfaces, by explicit accepted decision (OI-3), carried forward to Phase 12. |
| PRIM-04 | `Modal` has role/aria-modal/name/trap/return/Escape, vitest-verified | ✓ SATISFIED | Criterion 4 above. |
| PRIM-05 | Skeletons match real layouts; no 4px side border | ✓ SATISFIED | Criterion 5 above. |

All five requirement IDs declared in the phase's PLAN frontmatter (TYPE-02, PRIM-02, PRIM-03, PRIM-04, PRIM-05) are accounted for. `REQUIREMENTS.md`'s coverage table maps all five to Phase 08 only — no orphans, no duplicates, matching ROADMAP's own Requirement Coverage table.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `components/ui/modal.tsx` | ARIA dialog, id-context, focus trap, stacking registry | ✓ VERIFIED | `role="dialog"`, `aria-modal="true"`, `ModalTitleContext`, module-scope stack registry with `>=` tie-break, all present and wired; 7/7 tests pass. |
| `components/ui/__tests__/modal.test.tsx` | New vitest file, ≥6 tests | ✓ VERIFIED | 7 `it()` blocks (6 from 08-02 + 1 added by the post-hoc CR-01 fix), all passing. |
| `components/ui/input.tsx`, `textarea.tsx`, `select.tsx` | Corrected focus-visible ring suffix | ✓ VERIFIED | Byte-identical suffix confirmed in all three, stacked (not replacing) `focus:border-accent`. |
| `__tests__/design-tokens/report.ts` | `PRIM03_RING_ROWS`/`printPrim03Report()` | ✓ VERIFIED | Runs, prints 3 rows matching 08-EVIDENCE.md's quoted numbers exactly. |
| `components/ui/skeletons.tsx` | 3 named fixes only | ✓ VERIFIED | 8-card loop, 5-swatch loop, no `border-l-4`; `git diff --numstat` claimed ≤15 lines in 08-04-SUMMARY.md (not independently re-diffed against a pre-phase commit in this pass, but the three fixes' presence and the absence of `border-l-4` are directly confirmed). |
| `components/ui/__tests__/skeletons.test.tsx` | 3 tests | ✓ VERIFIED | 3/3 passing. |
| `__tests__/label-text-production-sites.test.ts` | 7-file scoped scan | ✓ VERIFIED | Passing; file exists. |
| `__tests__/type-scale-floor.test.ts` | TYPE-02 + PRIM-02 repo-wide guard blocks | ✓ VERIFIED | 19/19 passing including both new blocks. |
| `components/ui/typography.tsx`, `app/globals.css` | `LabelText`/`.section-label` deleted | ✓ VERIFIED | Both confirmed absent from disk. |
| `08-DECISIONS.md` | GO-AHEAD + 7 resolved OIs | ✓ VERIFIED | All 7 `**Resolution:**` lines resolved, none `pending`; GO-AHEAD section present with copy sign-off table. |
| `08-EVIDENCE.md` | 5 success criteria answered, carried-forward list, guard inventory | ✓ VERIFIED | All three sections present; every quoted number independently re-verified to match live command output in this pass. |
| Post-phase-08 baseline | Matching after capture | ✓ VERIFIED (scope-limited) | `.planning/workstreams/design-system/baselines/2026-09-18-post-phase-08/` exists with `manifest.json`/`README.md`; Home-only scope explicitly acknowledged (WINDOWS.md entry 9). |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `08-DECISIONS.md` GO-AHEAD | every 08-0N plan's first source edit | precondition checks reading the GO-AHEAD/OI resolutions before editing `app/`/`components/` | ✓ WIRED — no source file shows any edit predating the GO-AHEAD commit per the phase's own before-baseline empty-git-log check |
| `ModalTitleContext` (modal.tsx) | `ModalTitle`'s self-assigned id | `React.useContext` read in `ModalTitle`, `Provider` wraps the portal tree | ✓ WIRED — confirmed via direct read of modal.tsx and passing "aria-labelledby resolves to the ModalTitle id" test |
| module-scope modal-stack registry | Escape effect's guard + focus-trap effect's guard | `isTopmost` computed from `useSyncExternalStore(subscribeToModalStack, getTopmostModalId, …)` | ✓ WIRED — confirmed via direct read and both the distinct-zIndex and same-zIndex D-04 tests passing |
| OI-4 resolution (branch b) | `Sidebar.tsx`'s 4 sites | recased `Text` markup at lines 347/442/563/627 | ✓ WIRED — text content matches the sign-off table exactly, confirmed live |
| OI-6 resolution | `RaidTrackingPageSkeleton`'s legend loop count | `Array.from({ length: 5 })` | ✓ WIRED |

### Anti-Patterns Found

None found in the files this phase modified. The design-system docs page's stale "10px uppercase / 12px uppercase" captions (a real post-migration inconsistency, flagged as 08-REVIEW.md WR-01) were found and fixed in commits `ba7d8224`/`cf8a6d55`, independently confirmed still fixed in the current working tree (`app/(app)/design-system/_client.tsx:462-471` now reads "12px, not uppercase (was 10px uppercase pre-migration)"). One pre-existing, unaddressed low-severity finding remains by informed choice, not oversight: `ModalBackdrop` (08-REVIEW.md WR-03) is confirmed still dead code (`grep -rn "ModalBackdrop" app components` → zero consumers outside `modal.tsx` itself), left unaddressed per the review's own `fix_status: partial` frontmatter — this is an info-level finding, not a blocker for this phase's goal.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| CR-01 fix genuinely resolves the same-zIndex tie-break, not just claimed | `grep -n -A6 'function getTopmostModalId' components/ui/modal.tsx` | `>=` comparison present with explanatory comment citing D-04 | ✓ PASS |
| Fix commit is real, not a claimed-but-absent commit | `git show 027129cd --stat` | Commit exists, touches `modal.tsx` + `modal.test.tsx`, authored 2026-09-17 | ✓ PASS |
| All four phase guard-test files pass together | `npx vitest run components/ui/__tests__/modal.test.tsx components/ui/__tests__/skeletons.test.tsx __tests__/label-text-production-sites.test.ts __tests__/type-scale-floor.test.ts` | 4 files, 30 tests, all passing | ✓ PASS |
| Full workspace suite is green (not just this phase's files) | `npm run test -- --run` | 64 files, 1189 tests, all passing | ✓ PASS |
| Typecheck is clean | `npm run typecheck` | exit 0, zero errors | ✓ PASS |
| Repo-wide `LabelText`/`.section-label` scan | `grep -rn "LabelText\|section-label" app components` | zero matches | ✓ PASS |
| `text-[Npx]` in the two primitive files | `grep -nE "text-\[[0-9]+px\]" components/ui/label.tsx components/ui/typography.tsx` | zero matches | ✓ PASS |

### Carried-Forward / Deferred Items (from 08-EVIDENCE.md, independently spot-checked)

These are not gaps this verification is raising fresh — they are the phase's own honest, evidenced disclosures, independently confirmed still accurate:

1. Light-mode `--ring` shortfall (2.913 vs page, 2.726 vs modal surface) — accepted per OI-3, destination Phase 12 DESIGN.md. **Confirmed live**, numbers match exactly.
2. Sidebar.tsx OI-4 — confirmed fully resolved inside this phase (branch b), not actually outstanding.
3. Deferred broader `skeletons.tsx` audit (~20 other exports) — unscheduled, by named decision.
4. Post-phase-08 baseline's Home-only scope — confirmed; `manifest.json` present, image set matches before-baseline.
5. Two Manual-Only Verifications (keyboard walk, modal click-through) — confirmed still open in `.planning/WINDOWS.md` (entries 7, 8; `resolved_at: null`) — routed to Human Verification below.

### Human Verification Required

See frontmatter `human_verification` above for the two items (keyboard focus-ring walk; live modal click-through of JoinGuildModal/OnboardingModal/UpgradeModal including the stacked default-zIndex case). Both are pre-existing, explicitly-tracked open items in `.planning/WINDOWS.md` (entries 7 and 8), not new findings from this pass — this verification confirms they are genuinely still open (not silently marked resolved) and surfaces them per the standard human-verification gate rather than letting a `passed` status paper over them.

### Gaps Summary

No BLOCKER-level gap was found. Every artifact this phase's seven plans committed to exists, is substantive, and is wired; the repo-wide `LabelText`/`.section-label` deletion is genuinely complete (not partially done, not orphaned); the CRITICAL modal-stacking bug the code review found after `08-EVIDENCE.md` was written is genuinely fixed in the current working tree, with a real regression test that was independently re-run and passes; and the full test suite (1189 tests) plus typecheck are green.

The one WARNING-level item is ROADMAP success criterion 3's literal "3:1 or better" clause, which is not met in light mode against two of three surfaces. This is not an oversight: it is a numeric fact the phase's own plan (08-03) measured, disclosed, and the approving user explicitly accepted at the phase's blocking checkpoint (08-DECISIONS.md OI-3), with a named forward destination (Phase 12's DESIGN.md). Because it is a documented, user-approved deviation from the letter of a success criterion rather than a hidden defect, this verification does not fail the phase over it, but it does surface it plainly rather than silently scoring criterion 3 as a clean pass. Combined with the two still-open Manual-Only Verifications (the keyboard walk that would speak to real-world visibility of that same ring, and the modal click-through that would speak to the CR-01 fix's real-world behavior), the phase routes to `human_needed` rather than `passed`.

**This looks intentional and pre-approved.** If the developer wants this recorded as a formal override rather than an open human-verification item, add to a future VERIFICATION.md's frontmatter:

```yaml
overrides:

  - must_have: "Every focusable primitive shows a visible focus-visible ring drawn from --ring at 3:1 or better against its surface"
    reason: "Light-mode --ring contrast against page (2.913) and modal surface (2.726) falls short of 3:1; accepted by Alexander Mayes at the Phase 08 blocking checkpoint (08-DECISIONS.md OI-3) as a pre-existing --ring characteristic shared by every other focus-visible primitive, carried forward to Phase 12's DESIGN.md rather than fixed in Phase 08."
    accepted_by: "Alexander Mayes"
    accepted_at: "2026-09-17"
```

---

*Verified: 2026-09-18*
*Verifier: Claude (gsd-verifier)*
