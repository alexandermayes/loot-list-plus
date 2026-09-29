# post-phase-08 visual baseline

Pairs with: `.planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/`

08-DECISIONS.md's "Before-baseline for Phase 08" section names this pairing directly: the git
log over all in-scope Phase 08 files (`components/ui/label.tsx`, `components/ui/typography.tsx`,
`app/globals.css`, `components/ui/input.tsx`, `components/ui/textarea.tsx`,
`components/ui/select.tsx`, `components/ui/modal.tsx`, `components/ui/skeletons.tsx`, the ten
label call-site files, `app/components/Sidebar.tsx`, `JoinGuildModal.tsx`, `OnboardingModal.tsx`,
`UpgradeModal.tsx`) was empty as of the post-phase-07 baseline (`010babb3`), so post-phase-07 is
reused as the phase-08 before-baseline rather than capturing a redundant, functionally-identical
before set.

Commit range bracketed by this capture (`git log --oneline 010babb3..HEAD`, in-scope commits only):

```
0f5ccb71 docs(08): record phase 08 gate go-ahead and open-item resolutions
52018f1c docs(08): re-measure phase-08 inventory and --ring contrast numbers
c8d6c755 test(08-02): add failing tests for Modal dialog semantics and focus management
196996f0 feat(08-02): wire Modal dialog semantics, id-context, focus trap and stacking-aware Escape
2bf942f5 feat(08-02): give JoinGuildModal, OnboardingModal and UpgradeModal a real ModalTitle (D-05)
81d579ae test(08-02): cover Tab-wrap boundaries and the D-04 stacked-modal case
ded52a58 feat(08-03): add focus-visible ring to Input plus report.ts evidence rows
83e5c840 feat(08-03): apply identical focus-visible ring to Textarea and Select
e28d694d test(08-04): add failing test for D-08 skeleton fidelity fixes
2b61d362 feat(08-04): fix 3 named skeleton fidelity mismatches (D-08)
be35726f feat(08-05): migrate LabelText to Text at admin/addon and sheet-import
b2112b94 feat(08-05): migrate LabelText to Text at raid-teams, LootListContent, InlineSettingsEditor
10e85386 feat(08-05): migrate LabelText to Text at reserve/runs and join/page; add source-scan test
154b123d feat(08-06): prove LabelText-to-Text migration rule on 4 docs-page sites
ac6d9da3 feat(08-06): migrate remaining docs-page LabelText/section-label sites to Text
4a9b0099 feat(08-06): resolve Sidebar OI-4, swap label.tsx aliases, delete LabelText/section-label
```

(The full `git log --oneline 010babb3..HEAD` range also includes non-source commits — plan
metadata, decisions-gate documents, phase-planning artifacts — omitted above for readability;
the list here is the subset that touches an in-scope Phase 08 file.)

What changed between the two captures: `Modal` gained `role="dialog"`, `aria-modal`, an
accessible name wired from a new `ModalTitle`, a hand-rolled focus trap, focus return on close,
and stacking-aware `Escape` handling, plus new `ModalTitle` elements in `JoinGuildModal`,
`OnboardingModal` and `UpgradeModal` (PRIM-04); `Input`, `Textarea` and `Select` gained the same
keyboard-only focus-visible ring `Button`/`Switch`/`Checkbox`/`Radio` already carried (PRIM-03);
three named skeleton fidelity fixes landed in `skeletons.tsx` (PRIM-05); and all 61 `LabelText`/
`.section-label`/hand-rolled `Sidebar.tsx` label call sites were consolidated onto `Text
size="sm" weight="semibold" color="secondary"`, with `LabelText`/`.section-label` deleted from
disk and `label.tsx`'s three arbitrary pixel sizes swapped for Phase 07's named aliases (PRIM-02,
TYPE-02).

Same subset as the before capture: Home only (light/dark x 1440/390), 4 images. `overview` is
symmetrically skipped in both manifests (`GET /api/dev/test-users returned 404` in both) because
`loadtest/test-users.json` is still absent in this dev server's environment; the D-16 fallback
applies identically on both sides, so the comparison stays Home-only rather than becoming
asymmetric.

**Scope note:** Home renders no `Modal`, no `Input`/`Textarea`/`Select`, no skeleton, and no
migrated label call site — every one of this phase's actual changes lives on authenticated
screens this Home-only baseline cannot show. This pairing confirms no regression on Home itself;
it is not a verification of PRIM-02/03/04/05's real behavior. See `08-EVIDENCE.md`'s `## Carried
forward` section, item 4.
