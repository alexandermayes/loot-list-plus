# Phase 08: Primitive Contracts - Context

**Gathered:** 2026-09-17
**Status:** Ready for planning

<domain>
## Phase Boundary

The shared primitives that Phases 09, 10 and 11 will mass-migrate onto become correct, accessible and singular on their own, before any sweep touches them. This phase edits `components/ui/label.tsx`, `components/ui/typography.tsx` (deletes `LabelText`), `app/globals.css` (deletes `.section-label`), `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/modal.tsx`, and `components/ui/skeletons.tsx` (three named fixes only), plus the small number of call sites that reference the two deleted label primitives and the three Modal usages that currently have no `ModalTitle`. It does not touch the mass `text-[Npx]` codemod (Phase 09), does not migrate colour literals (Phase 10), and changes no user-facing copy or labels — only the container/wrapper styling around existing text.

Requirements: TYPE-02, PRIM-02, PRIM-03, PRIM-04, PRIM-05.

</domain>

<decisions>
## Implementation Decisions

Hard constraints inherited from the roadmap: no user-facing copy changes; nothing is edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint.

### Label and section-heading consolidation (PRIM-02)
- **D-01:** Delete `LabelText` (`components/ui/typography.tsx`) and `.section-label` (`app/globals.css:604-607`) entirely. The single non-uppercase section-heading style that survives is the existing `Text` component (`components/ui/typography.tsx`) used as `<Text size="sm" weight="semibold" color="secondary">` — no new component, no new CSS class. | Reversibility: costly — touches every former call site if reverted; the uppercase/tracking-wider visual treatment is fully retired, not preserved as an option.
- **D-02:** One style for every former use, no exceptions. Sidebar wayfinding labels ("Current Guild", "Character" in `app/(app)/design-system/_client.tsx:1984,1996` today, and the real sidebar component) and form-section labels (8 `LabelText` sites: `sheet-import/_client.tsx`, `admin/addon/_client.tsx`, `loot-list/components/LootListContent.tsx`, `reserve/runs/[id]/_client.tsx`) all become the same `<Text size="sm" weight="semibold" color="secondary">`. No sidebar-specific lighter variant.
- **Scope confirmed small:** only 2 real `.section-label` uses (both in the design-system showcase page, not the live sidebar component itself — the planner should locate the actual sidebar rendering, not just the docs page) and 8 `LabelText` uses across 4 files. This is a small, fully-enumerable migration, not a mass sweep.

### Modal accessibility (PRIM-04)
- **D-03:** Add `role="dialog"`, `aria-modal="true"`, a focus trap, focus return to the trigger on close, and Escape handling to `components/ui/modal.tsx`'s `Modal` component.
- **D-04:** When multiple `Modal` instances are open simultaneously (the existing stacking pattern — e.g. `DashboardContent.tsx` opens `CreateCharacterModal` over other first-run modals, coordinated today only by the `zIndex` prop), only the topmost/last-mounted `Modal` installs the focus trap and the Escape handler. Lower stacked modals stay inert underneath; their own trap/Escape does not fire. | Reversibility: reversible — an internal stacking-order concern, no public API change.
- **D-05:** `Modal`'s accessible name comes from `aria-labelledby` pointing at `ModalTitle`'s id. `ModalTitle` becomes effectively required — the three usages that currently render no `ModalTitle` (`app/components/JoinGuildModal.tsx`, `app/components/OnboardingModal.tsx`, `app/components/UpgradeModal.tsx`) each get one added. If a given modal's design doesn't want the title visible, use a visually-hidden (`sr-only`) `ModalTitle` — it must still be present in the DOM for `aria-labelledby` to resolve. No optional `aria-label` fallback prop.

### Focus ring on text-input primitives (PRIM-03)
- **D-06:** `Input`, `Textarea` and `Select` (`components/ui/input.tsx`, `textarea.tsx`, `select.tsx`) add `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background` — the exact class string already used by `Button`, `Switch`, `Checkbox` and `RadioGroup`. One consistent focus-ring language across every focusable primitive in the app.
- **D-07:** The existing `focus:border-accent` (fires on every focus, including mouse clicks) is kept unchanged and stacks alongside the new ring. Only the new ring is `focus-visible:` scoped (keyboard-only, no ring on mouse click) — this is a behavior *addition*, not a behavior change to the existing border treatment. Do not change `focus:border-accent` to `focus-visible:border-accent`.
- **Verification note for the planner:** confirm the combined ring + border treatment measures at least 3:1 against the input's own surface per PRIM-03's acceptance criterion, using the `--ring` values already defined (light `30 100% 45%`, dark `30 100% 50%`, `app/globals.css:175,280`).

### Skeleton fidelity (PRIM-05)
- **D-08:** Exactly three fixes, matching ROADMAP's named scope — no broader audit of `components/ui/skeletons.tsx`'s other ~20 skeleton exports:
  1. `GuildSettingsContentSkeleton` (`components/ui/skeletons.tsx:470-480`): renders 2 `SettingsCardSkeleton` today; the real guild-settings page renders 8 cards. Match the real count.
  2. The raid-tracking legend skeleton inside `RaidTrackingPageSkeleton` (`components/ui/skeletons.tsx:738-745`): renders 4 swatches today (`Array.from({ length: 4 })`). The real legend (`app/(app)/raid-tracking/_client.tsx:2517-2549`) renders 5 swatches — Attended, Late, Standby, No show, Excused — plus a conditional 6th indicator (a `Checkbox`, not a colour swatch) when `guildSettings?.use_signups` is true. Match the 5 always-rendered swatches at minimum; the planner should decide whether to also skeleton the conditional signup indicator.
  3. `LootListBracketSkeleton` (`components/ui/skeletons.tsx:486`): drop the `border-l-4 border-l-muted` 4px left border from the bracket header.
- No other skeleton in the file is in scope for this phase, even if a similar drift is noticed while editing. Note it for a later phase instead of fixing inline.

### Claude's Discretion
- Exact `Text` prop values if `size="sm" weight="semibold" color="secondary"` doesn't render legibly in a specific former `.section-label`/`LabelText` context discovered during implementation — flag any such case at the plan checkpoint rather than silently deviating.
- Whether the conditional 6th "Signed Up" indicator in the raid-tracking legend needs its own skeleton placeholder (D-08 item 2) or can be omitted since it's conditional on guild settings.
- `label.tsx`'s own arbitrary-pixel sizes (`text-[12px]`, `text-[13px]`, `text-[14px]`) should be converted to the Phase 07 pixel aliases (`text-12`, `text-13`, `text-14`) to satisfy TYPE-02's "no `text-[Npx]`" requirement — mechanical, no visual change since the alias resolves to the same value.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Findings and scope
- `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md` — the audit: kicker/label-primitive findings, focus/dialog semantics gaps, skeleton drift examples
- `.planning/workstreams/design-system/ROADMAP.md` §Phase 08 — goal, success criteria 1-5, the risk note on focus rings and modal nesting, the note on `LabelText` deletion forcing a design-system-page edit
- `.planning/workstreams/design-system/REQUIREMENTS.md` — TYPE-02, PRIM-02, PRIM-03, PRIM-04, PRIM-05 wording
- `.planning/workstreams/design-system/phases/07-token-foundation/07-CONTEXT.md` and `07-EVIDENCE.md` — prior phase's token decisions this phase builds on (D-02 pixel aliases, D-04/D-06 contrast tokens, `--ring` values)

### Design quality bar
- `.claude/skills/impeccable/reference/craft-floor.md` — the Verify/Refuse list this phase's primitives must satisfy (focus visibility, dialog semantics)
- `.claude/skills/impeccable/reference/document.md` — the DESIGN.md schema Phase 12 will need; record the label/focus/modal/skeleton contracts in a shape it can consume

### Project conventions
- `.claude/CLAUDE.md` — no em dashes, kebab-case files, vitest in `__tests__`, CI facts

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/ui/typography.tsx`: `Text` component (lines ~70-120) with `size`/`weight`/`color` variants already covers the target label shape (`size="sm" weight="semibold" color="secondary"`) — no new component needed
- `components/ui/button.tsx:33`, `switch.tsx:19`, `checkbox.tsx:19`, `radio-group.tsx:31`: the canonical `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background` class string to copy onto Input/Textarea/Select
- `app/globals.css:175,280`: `--ring` token already defined for both themes (light `30 100% 45%`, dark `30 100% 50%`)
- `components/ui/confirm-modal.tsx`: existing consumer of `Modal`/`ModalHeader`/`ModalTitle` — a reference for what a compliant modal usage looks like

### Established Patterns
- `Modal` (`components/ui/modal.tsx`) already has a `zIndex` prop supporting stacking, an Escape-key `useEffect`, and body-scroll-lock logic — the focus trap and stacking-order logic in D-04 extends this existing structure rather than replacing it
- `label.tsx`'s `labelVariants` (cva) already follows the sm/default/lg size pattern used elsewhere; converting its arbitrary pixel values to Phase 07's aliases is a same-shape edit
- No test currently covers `Modal`'s accessibility contract or `skeletons.tsx`'s fidelity to real layouts — PRIM-04's acceptance criterion requires a vitest component test asserting trap/return/Escape behavior

### Integration Points
- `app/(app)/design-system/_client.tsx` renders both `.section-label` (lines 1984, 1996) and is the one place `LabelText`'s deletion forces a typecheck-driven edit (ROADMAP's explicit note) — keep that edit to the deletion only, per ROADMAP; the full documentation pass is Phase 12's ENF-03
- `app/(app)/overview/components/DashboardContent.tsx` auto-opens `CreateCharacterModal` based on guild/character state — the concrete site where D-04's stacking behavior is exercised
- `app/(app)/raid-tracking/_client.tsx:2517-2549` — the real legend markup the raid-tracking skeleton (D-08 item 2) must match in swatch count

</code_context>

<specifics>
## Specific Ideas

- The user consistently chose the "exact same as existing sibling primitives" option across all four areas (Text component reuse, ring class reuse, focus-visible scoping matching Button/Switch, ModalTitle required not optional) — the throughline is minimizing new primitives/variants and maximizing consistency with what Button/Switch/Checkbox/Radio already do.
- Scope discipline was explicit in two areas (skeleton fidelity, label uniformity): stick to exactly what ROADMAP names, do not expand into adjacent drift noticed along the way.

</specifics>

<deferred>
## Deferred Ideas

- A broader audit of `components/ui/skeletons.tsx`'s remaining ~20 skeleton exports for layout drift beyond the 3 named fixes — noted, not scheduled to a phase.
- None — discussion stayed within phase scope otherwise.

</deferred>

---

*Phase: 08-primitive-contracts*
*Context gathered: 2026-09-17*
