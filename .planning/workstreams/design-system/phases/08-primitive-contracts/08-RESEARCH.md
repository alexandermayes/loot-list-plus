# Phase 08: Primitive Contracts - Research

**Researched:** 2026-09-17
**Domain:** React/Tailwind design-system primitives (label/typography, focus rings, modal accessibility, skeleton fidelity) in a Next.js 16 / React 19 app
**Confidence:** HIGH for file contents and line numbers (all read directly this session); MEDIUM for the focus-trap implementation shape (a recommended pattern, not yet built); LOW/flagged where the `--ring` contrast math fails a locked acceptance number

## Summary

This phase touches eight files whose current contents were re-read in full this session, not assumed from the audit or from CONTEXT.md. Two of CONTEXT.md's factual claims have drifted from the live codebase and must be corrected before the planner presents a checkpoint: the `LabelText` migration is roughly 5.7x larger than "8 sites in 4 files" (actual: 55 `LabelText` sites in 8 files, plus 2 `.section-label` sites, for 57 total — see Runtime State Inventory), and a fourth, previously-unnamed hand-rolled label convention exists in the real `Sidebar.tsx` that CONTEXT.md's D-02 implicitly wants folded into the same migration. Everything else CONTEXT.md asserts about file locations (label.tsx sizes, `.section-label`'s line range, the three Modal call sites missing `ModalTitle`, the three named skeleton fixes) was verified byte-for-byte against the live files and matches exactly.

The riskiest new finding is mechanical, not judgment-based: the exact ring class D-06 mandates copying (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`, all four utilities carrying the `focus-visible:` prefix — CONTEXT.md's stated string drops the prefix from three of the four) produces a `--ring` vs. `--background`/`--background-subtle` contrast of 2.91:1 / 2.73:1 in light mode, computed with the repo's own `__tests__/design-tokens/contrast.ts`. That is below the 3:1 floor ROADMAP's Phase 08 success criterion 3 states, and it is the same token every existing Button/Switch/Checkbox/Radio already uses (so it is a pre-existing, accepted gap, not a regression this phase introduces) — but it means the acceptance bar cannot be proven true by a mechanical check in light mode without either accepting the gap on record or amending a token that D-06/D-07 do not authorize touching. This must go to the plan's checkpoint as a named open item, not be silently declared passing.

For Modal accessibility (PRIM-04), there is no focus-trap library anywhere in the repo (`@radix-ui/react-dialog` is not a dependency; nothing in `dependencies` matches `dialog`, `focus-trap`, or `aria`), and no `role="dialog"`/`aria-modal` exists anywhere in `app/` or `components/` today. `components/ui/card.tsx` already establishes the exact compound-component Context pattern (`createContext` + `Provider` wrapping children + `useContext` in sub-components, lines 18/26/38/47) that a Modal-scoped `titleId` context should copy for wiring `ModalTitle`'s `id` into `aria-modal`/`aria-labelledby` without a public API change. `components/ui/confirm-modal.tsx` and `app/(app)/raid-tracking/components/__tests__/SkipDayModal.test.tsx` together are the concrete pattern to extend for the new `components/ui/__tests__/modal.test.tsx` (a directory that does not yet exist).

**Primary recommendation:** Execute D-01 through D-08 exactly as CONTEXT.md locked them, but replan the LabelText migration's checkpoint presentation around the real count (55 sites / 8 files, enumerated below, not 8/4), fold in the four hand-rolled Sidebar.tsx labels CONTEXT.md's prose already implies belong in scope, build the focus trap by hand (no new dependency) using a Context-based `titleId` following `card.tsx`'s existing pattern, and record the light-mode `--ring` contrast shortfall as an accepted, pre-existing gap at the plan checkpoint rather than asserting the acceptance criterion passes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Label/section-heading text rendering | Browser / Client (React component) | — | `Label`, `Text`, `LabelText` are all pure presentational client components under `components/ui/`; no data or server concern |
| Focus-visible ring on form controls | Browser / Client (CSS/Tailwind) | — | Pure CSS pseudo-class styling on existing client components; no state machine change |
| Modal dialog semantics (role, aria-modal, focus trap, Escape) | Browser / Client (React component + DOM focus APIs) | — | All logic lives in `components/ui/modal.tsx`'s client component; `document.activeElement`/`document.addEventListener` are browser APIs, not server-renderable |
| Skeleton layout fidelity | Browser / Client (React component) | — | Skeletons are pure loading-state placeholders rendered client-side; no data dependency to match, only markup shape |

No capability in this phase touches the API/backend, database, or CDN tiers. This is the correct tier assignment already implied by CONTEXT.md's phase boundary (only `components/ui/*` and a small number of `app/` call sites).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Hard constraints inherited from the roadmap: no user-facing copy changes; nothing is edited in the codebase without the user's explicit confirmation at the plan's blocking checkpoint.

**Label and section-heading consolidation (PRIM-02)**
- D-01: Delete `LabelText` (`components/ui/typography.tsx`) and `.section-label` (`app/globals.css:604-607`) entirely. The single non-uppercase section-heading style that survives is the existing `Text` component used as `<Text size="sm" weight="semibold" color="secondary">` — no new component, no new CSS class. Reversibility: costly — touches every former call site if reverted; the uppercase/tracking-wider visual treatment is fully retired, not preserved as an option.
- D-02: One style for every former use, no exceptions. Sidebar wayfinding labels ("Current Guild", "Character" in `app/(app)/design-system/_client.tsx:1984,1996` today, and the real sidebar component) and form-section labels (8 `LabelText` sites: `sheet-import/_client.tsx`, `admin/addon/_client.tsx`, `loot-list/components/LootListContent.tsx`, `reserve/runs/[id]/_client.tsx`) all become the same `<Text size="sm" weight="semibold" color="secondary">`. No sidebar-specific lighter variant.
- Scope confirmed small: only 2 real `.section-label` uses (both in the design-system showcase page, not the live sidebar component itself) and 8 `LabelText` uses across 4 files. **[Research correction: this count has drifted — see Runtime State Inventory below. The instruction "one style for every former use, no exceptions" is unaffected; only the enumerated site count is wrong.]**

**Modal accessibility (PRIM-04)**
- D-03: Add `role="dialog"`, `aria-modal="true"`, a focus trap, focus return to the trigger on close, and Escape handling to `components/ui/modal.tsx`'s `Modal` component.
- D-04: When multiple `Modal` instances are open simultaneously (coordinated today only by the `zIndex` prop), only the topmost/last-mounted `Modal` installs the focus trap and the Escape handler. Lower stacked modals stay inert underneath. Reversibility: reversible — an internal stacking-order concern, no public API change.
- D-05: `Modal`'s accessible name comes from `aria-labelledby` pointing at `ModalTitle`'s id. `ModalTitle` becomes effectively required — the three usages that currently render no `ModalTitle` (`app/components/JoinGuildModal.tsx`, `app/components/OnboardingModal.tsx`, `app/components/UpgradeModal.tsx`) each get one added. If a modal's design doesn't want the title visible, use a visually-hidden (`sr-only`) `ModalTitle` — it must still be present in the DOM for `aria-labelledby` to resolve. No optional `aria-label` fallback prop.

**Focus ring on text-input primitives (PRIM-03)**
- D-06: `Input`, `Textarea` and `Select` add `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background` — the exact class string already used by `Button`, `Switch`, `Checkbox` and `RadioGroup`. **[Research correction: the actual shared string in all four sibling primitives repeats the `focus-visible:` modifier on every utility — see Common Pitfalls #2. Copy the actual string, not the abbreviated one written in this decision.]**
- D-07: The existing `focus:border-accent` is kept unchanged and stacks alongside the new ring. Only the new ring is `focus-visible:` scoped. Do not change `focus:border-accent` to `focus-visible:border-accent`.
- Verification note for the planner: confirm the combined ring + border treatment measures at least 3:1 against the input's own surface, using the `--ring` values already defined (light `30 100% 45%`, dark `30 100% 50%`, `app/globals.css:175,280`). **[Research correction: mechanically confirmed and it does NOT clear 3:1 in light mode against the two most common surfaces — see Common Pitfalls #1. This is a locked-decision-compatible finding to raise at the checkpoint, not a reason to deviate from D-06/D-07.]**

**Skeleton fidelity (PRIM-05)**
- D-08: Exactly three fixes, no broader audit:
  1. `GuildSettingsContentSkeleton` (`components/ui/skeletons.tsx:470-477`): renders 2 `SettingsCardSkeleton` today; the real page renders 8 cards.
  2. The raid-tracking legend skeleton inside `RaidTrackingPageSkeleton` (`components/ui/skeletons.tsx:738-747`, swatch loop at line 741): renders 4 swatches today; the real legend (`app/(app)/raid-tracking/_client.tsx:2517-2549`) renders 5 always-visible swatches plus a conditional 6th `Checkbox` indicator.
  3. `LootListBracketSkeleton` (`components/ui/skeletons.tsx:486`): drop the `border-l-4 border-l-muted` 4px left border.

### Claude's Discretion
- Exact `Text` prop values if `size="sm" weight="semibold" color="secondary"` doesn't render legibly in a specific former context — flag at the plan checkpoint rather than silently deviating.
- Whether the conditional 6th "Signed Up" indicator in the raid-tracking legend needs its own skeleton placeholder or can be omitted since it's conditional.
- `label.tsx`'s arbitrary-pixel sizes (`text-[12px]`, `text-[13px]`, `text-[14px]`) should be converted to the Phase 07 pixel aliases (`text-12`, `text-13`, `text-14`) — mechanical, no visual change.

### Deferred Ideas (OUT OF SCOPE)
- A broader audit of `components/ui/skeletons.tsx`'s remaining ~20 skeleton exports for layout drift beyond the 3 named fixes — noted, not scheduled to a phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TYPE-02 | `Label` and `Heading`/`Text` express sizes through scale steps, not `text-[Npx]` | `label.tsx:19-21` confirmed as the only offender (three sites); `typography.tsx` already has zero `text-[Npx]` — only `label.tsx` needs the mechanical alias swap. Reusable guard: `matchesIn()` from `__tests__/design-tokens/source-files.ts` against both files. |
| PRIM-02 | Exactly one label convention: single form `Label`, single non-uppercase section heading | Full corrected site enumeration in Runtime State Inventory; `Text`/`LabelText` component code read in full; the hidden fourth (Sidebar.tsx hand-rolled) convention identified and reconciled against D-01's "uppercase treatment fully retired" instruction. |
| PRIM-03 | Every focusable primitive shows a visible `focus-visible` ring at ≥3:1; `input.tsx` no longer just swaps border color | Exact current ring class from Button/Switch/Checkbox/RadioGroup read and corrected; `--ring` contrast mechanically computed against 4 candidate surfaces using the repo's own contrast utility; no ring-offset clipping risk found in current Modal/Input wrapper markup. |
| PRIM-04 | `Modal` has `role="dialog"`, `aria-modal`, labelled title, focus trap, focus return, Escape, verified by a vitest test | Current `modal.tsx` read in full (312 lines); confirmed zero existing focus-trap dependency or `role="dialog"` anywhere in repo; `card.tsx`'s Context pattern identified as the precedent for `ModalTitle` id wiring; `SkipDayModal.test.tsx` identified as the closest existing test pattern; no `components/ui/__tests__/` directory exists yet. |
| PRIM-05 | Skeletons match real layouts; `skeletons.tsx:486` drops its 4px border | All three fix sites read and confirmed byte-for-byte against CONTEXT.md's citations; real raid-tracking legend markup read and quoted verbatim. |
</phase_requirements>

## Standard Stack

No new runtime dependency is required or recommended for this phase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled focus trap in `modal.tsx` | `@radix-ui/react-dialog` (npm, current version `1.1.23`) [ASSUMED — version confirmed via `npm view` this session but the package's fit is a judgment call, not a verified-safe substitution] | Radix Dialog ships a correct, tested focus trap, `role="dialog"`, and `aria-modal` for free. But it owns its own Portal/Overlay/Content composition model and its own single-instance modal-open state; grafting it under the existing `Modal`/`ModalHeader`/`ModalBody`/`ModalFooter`/`ModalTitle` compound-component API (10+ call sites, a custom `zIndex`-based stacking model where only the topmost of several *simultaneously mounted* modals traps focus) is a much larger, riskier rewrite than D-03/D-04's "no public API change" instruction implies. Not recommended — extend the existing component instead. |
| Hand-rolled focus trap | `focus-trap-react` (npm, current version `12.0.3`) [ASSUMED — same caveat] | Smaller and more surgical than adopting a full dialog primitive, and it would compose with the existing `Modal` markup more easily than Radix Dialog. Still a new dependency for a ~30-line, well-documented DOM pattern (query focusable descendants, trap Tab/Shift+Tab at the ends) that the project has never needed before. Not recommended given the phase's "confirm before change" and minimal-blast-radius posture — implement by hand. |

**Package Legitimacy Audit:** Not applicable — no new package is being installed. The two alternatives above were inspected only to confirm they exist and are not being adopted; if the planner's checkpoint reverses this recommendation, run the Package Legitimacy Gate (`gsd_run query package-legitimacy check --ecosystem npm @radix-ui/react-dialog focus-trap-react`) before either is added.

## Architecture Patterns

### System Architecture Diagram

```
Consumer component (e.g. CreateCharacterModal.tsx)
        │
        │ renders
        ▼
<Modal open onClose zIndex?>              (components/ui/modal.tsx)
        │
        │ provides ModalTitleContext { titleId }   ← NEW: mirrors CardContext
        │ pattern in components/ui/card.tsx:18/26
        ▼
  ModalHeader → ModalTitle (id={titleId} via context)  ← NEW: id now resolvable
        │                                                  for aria-labelledby
        ▼
  outer dialog <div role="dialog" aria-modal="true"      ← NEW attrs
                     aria-labelledby={titleId}>
        │
        ├─ on mount (if this Modal is the topmost open instance):
        │     • save document.activeElement as "returnFocusTo"
        │     • query focusable descendants inside ModalContainer
        │     • move focus to first focusable element (or the container itself)
        │     • install Tab/Shift+Tab keydown trap
        │     • install Escape keydown handler
        │
        ├─ on unmount / close:
        │     • remove trap + Escape listeners
        │     • restore focus to "returnFocusTo"
        │
        └─ if NOT topmost (another Modal with a higher/later zIndex is open):
              • skip trap + Escape installation entirely (D-04)
```

### Recommended Project Structure

No new files or folders beyond one new test directory:
```
components/ui/
├── modal.tsx            # extended in place: Context, trap, role/aria attrs
├── label.tsx            # mechanical alias swap only
├── typography.tsx       # LabelText deleted
├── input.tsx             # + focus-visible ring classes
├── textarea.tsx          # + focus-visible ring classes
├── select.tsx             # + focus-visible ring classes
├── skeletons.tsx          # 3 named fixes only
└── __tests__/             # NEW — does not exist yet
    └── modal.test.tsx      # NEW — role/aria-modal/trap/return/Escape assertions
```

### Pattern 1: Context-based id wiring for `aria-labelledby` (new to this file, precedented elsewhere in the codebase)
**What:** `Modal` generates a stable id via `React.useId()` and exposes it through a small React Context; `ModalTitle` reads that context and self-assigns `id={contextId}` unless the caller passes an explicit `id`. The outer dialog element reads the same context value for `aria-labelledby`.
**When to use:** Exactly this case — a compound component where the parent needs to reference a descendant's DOM id without the caller wiring it by hand at every one of the ~10+ call sites.
**Example (the existing precedent to mirror, not modal code):**
```typescript
// Source: components/ui/card.tsx:18,26,38,47 (read this session)
const CardContext = React.createContext<CardVariant>("default")
// ...
<CardContext.Provider value={variant}>
  <div ref={ref} className={cn(...)} {...props}>{children}</div>
</CardContext.Provider>
// ... in a sub-component:
const variant = React.useContext(CardContext)
```
No `useId()` precedent exists yet in this repo (`grep -rn "useId\b" app components` returned nothing) — this is a new, standard React API, not a new dependency.

### Pattern 2: Minimal DOM focus trap (WAI-ARIA APG dialog pattern — no library)
**What:** On mount (only for the topmost open Modal), query all focusable descendants of the `ModalContainer` node with a selector such as `'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'`, move focus to the first one (or to the container itself if none exist), and add a `keydown` listener that wraps `Tab` from the last focusable element back to the first (and `Shift+Tab` from the first back to the last). Remove the listener on unmount/close and restore focus to the element that was focused before the modal opened (captured via `document.activeElement` at mount time).
**When to use:** `components/ui/modal.tsx`'s `Modal` component, gated so it only runs for the topmost simultaneously-open instance per D-04.
**Note:** `Modal`'s existing Escape-key `useEffect` (lines 221-228) and body-scroll-lock `useEffect` (lines 231-248) are the established pattern for this file — the new trap/return logic should be added as sibling `useEffect`s in the same style, not a rewritten component.

### Anti-Patterns to Avoid
- **Swapping the entire `Modal` primitive for a third-party dialog library:** rejected above — breaks D-04's "no public API change" and the existing stacking model used at 4+ call sites (`LootSubmissionsContent.tsx:1506`, `AttendeeResolutionModal.tsx:52`, `LootItemSelectionModal.tsx:41`, `WelcomeScreen.tsx:366`, `JoinGuildModal.tsx:168`, all passing `zIndex`).
- **Treating the light-mode `--ring` contrast shortfall as something this phase can silently fix by nudging the token:** `--ring` is a Phase 07 token; D-06/D-07 authorize copying the existing class string exactly, not adjusting `--ring`'s HSL value. Silently changing it would also change Button/Switch/Checkbox/Radio's ring color everywhere, which is out of this phase's stated file list.
- **Assuming `grep -rn "LabelText\|section-label"` returning zero after the edit is sufficient proof of PRIM-02 completion:** it proves the two deleted primitives are gone, but not that the Sidebar.tsx hand-rolled fourth convention (which never matched either grep pattern) has been reconciled per D-02's "one style, no exceptions."

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting whether a file still contains `text-[Npx]` | A new one-off `grep`/regex script for this phase | `matchesIn()` + explicit file paths from `__tests__/design-tokens/source-files.ts` (already used by `__tests__/type-scale-floor.test.ts`) | Already handles line numbers, trimmed text, and the "empty match array is a pass, not silence" contract this project's tests rely on. Note: `sourceFiles()` walks *directories*; for the two specific files in scope (`components/ui/label.tsx`, `components/ui/typography.tsx`) pass their resolved absolute paths straight into `matchesIn()`, do not route them through `sourceFiles()`. |
| Computing WCAG contrast for the `--ring` check | A new contrast formula/script | `__tests__/design-tokens/contrast.ts`'s `loadThemeTokens()` / `ratio()` (already used by `__tests__/design-tokens/report.ts` and `__tests__/token-contrast.test.ts`) | Single source of truth for every contrast number cited in this milestone per the file's own header comment; reused for Phase 07's evidence record. Extending `report.ts`'s `ROWS` array with a `{ label: 'focus ring', a: '--ring', b: '--background' }` (and `--background-subtle`) entry is the idiomatic way to make this phase's number reproducible in a commit message, matching Phase 07's precedent. |
| Restoring focus / trapping Tab in a modal | A hand-invented ad hoc keyboard handler with no reference | The WAI-ARIA APG "Dialog (Modal)" pattern (standard, no library) — see Architecture Patterns Pattern 2 | The failure modes (focus escaping to the page behind the modal, focus not restored after close, Tab cycling through hidden elements) are well-documented; deviating from the standard selector/ordering invites exactly the P1 bug this phase exists to fix. |

**Key insight:** every mechanical-check need in this phase already has a matching helper committed in Phase 07's test infrastructure. The only genuinely new code this phase writes is the focus-trap/id-context logic inside `modal.tsx` itself.

## Runtime State Inventory

Not a rename/refactor/migration phase in the GSD sense (no database keys, service configs, or OS registrations change), so the five-category inventory does not apply. What follows instead is the **corrected site enumeration** for the `LabelText`/`.section-label` migration, since CONTEXT.md's count was verified this session to be wrong and is load-bearing for the plan's checkpoint.

### Corrected `LabelText` call-site count (grep run this session against live files)

CONTEXT.md claims 8 `LabelText` sites across 4 files. The actual count is **55 `LabelText` JSX usages across 8 files** (29 in production code, 26 in the design-system docs page):

| File | Sites | Line numbers |
|------|-------|--------------|
| `app/(app)/sheet-import/_client.tsx` | 2 | 435, 465 |
| `app/(app)/reserve/runs/[id]/_client.tsx` | 12 | 739, 765, 789, 829, 879, 904, 955, 1045, 1076, 1169, 1211, 1271 |
| `app/(app)/admin/addon/_client.tsx` | 2 | 66, 94 |
| `app/(app)/raid-teams/_client.tsx` | 3 | 600, 609, 626 |
| `app/(app)/loot-list/components/LootListContent.tsx` | 3 | 2133, 2143, 2181 |
| `app/reserve/join/[token]/components/InlineSettingsEditor.tsx` | 4 | 221, 307, 345, 391 |
| `app/reserve/join/[token]/page.tsx` | 3 | 989, 1019, 1054 |
| **Production subtotal** | **29** | across **7 files** — CONTEXT.md named only 4 of these 7, and undercounted even within those 4 (its named files alone total 19 sites, not 8) |
| `app/(app)/design-system/_client.tsx` (docs/showcase page — also demoes `LabelText` itself as a component, not just as a label) | 26 | 428, 438, 449, 466, 470, 517, 528, 543, 1496, 1504, 1633, 1695, 1730, 1736, 1754, 1776, 1785, 1797, 1817, 1826, 1848, 1867, 1889, 1911, 1920, 1932 |

Plus the 2 `.section-label` sites (also in `design-system/_client.tsx`, lines 1984 and 1996 — this part of CONTEXT.md is accurate). **Grand total: 57 sites across 8 unique files.**

All 55 `LabelText` sites migrate to the identical `<Text size="sm" weight="semibold" color="secondary">` target regardless of their current `size` prop (`xs` or `sr`/`sm` or unset) — the migration mechanics D-01/D-02 already specified are unaffected by the larger count; only the checkpoint's presented scope and effort estimate need correcting. **Action required:** re-enumerate at the plan checkpoint using this table, not CONTEXT.md's "8 sites / 4 files."

### The hidden fourth convention: `app/components/Sidebar.tsx`

CONTEXT.md's D-02 names "the real sidebar component" as an in-scope site for "Current Guild"/"Character" labels, but the real `Sidebar.tsx` uses **neither** `.section-label` nor `LabelText`. It hand-rolls the same visual effect with a fourth convention:

```
// Verbatim, components/ui... no: app/components/Sidebar.tsx:346,441,562,626
<p className="font-poppins font-medium text-11 text-muted-foreground uppercase tracking-wide">
  GUILD
</p>
```
Four sites total: line 346 ("GUILD"), line 441 ("GUILDS", inside the guild-switcher dropdown), line 562 ("CHARACTER"), line 626 ("ADMIN SETTINGS"). `[VERIFIED: app/components/Sidebar.tsx:346,441,562,626]`

Two things the planner must resolve, neither answered by CONTEXT.md's decisions as written:
1. **Grep-invisibility:** `grep -rE "section-label|LabelText"` will report clean after the two named primitives are deleted, even though these 4 sites still exist as a distinct, un-migrated third/fourth convention. ROADMAP success criterion 2's grep check is satisfied without touching these lines — but D-02's "one style for every former use, no exceptions" plainly intends them in scope, since CONTEXT.md explicitly names "Current Guild"/"Character" as sidebar wayfinding labels to unify.
2. **Copy-safety nuance:** the text nodes here are *already* literally uppercase in source (`GUILD`, not `Guild`), unlike the docs-page `.section-label` sites (`Current Guild`, `Character` — mixed case, uppercase only via the CSS class). Migrating these 4 sites to `<Text size="sm" weight="semibold" color="secondary">` (which has no `uppercase` transform) leaves the DOM text content byte-identical (satisfies the no-copy-change hard constraint) but drops the `tracking-wide` letter-spacing, so the label still reads as cramped full-caps rather than the intended lowercase/title-case look D-01 describes for the *surviving* style. Recasing the literal strings to `Guild`/`Guilds`/`Character`/`Admin settings` would fix the visual result but **is a copy change** requiring the sign-off the milestone's hard constraint #1 reserves for milestone B. **Flag this exact tension at the plan checkpoint; do not silently recase the strings and do not silently leave them looking like leftover shouting.**

Both `--foreground-secondary` (Text's "secondary" color) and `--muted-foreground` (Sidebar's current color class) resolve to the identical HSL value in both themes (`25 8% 32%` light / `0 0% 63%` dark — `app/globals.css:140,165,232,263`), so the color swap itself is a no-op visually; only the case/tracking/weight (medium → semibold) and size (11px → 12px) change.

### Nothing found in these categories
- **Stored data / live service config / OS-registered state / secrets:** none — this phase edits only client-rendered React/CSS files, no database, service config, or OS registration references the strings or class names being deleted.
- **Test breakage:** `grep -rn "LabelText\|section-label"` against every `*.test.tsx` file in the repo returns zero matches — no existing test asserts on either deleted primitive's rendered classes.

## Common Pitfalls

### Pitfall 1: The `--ring` focus-visible color fails 3:1 in light mode on the two most common input surfaces
**What goes wrong:** Copying D-06's ring class exactly (as corrected in Pitfall 2) produces a focus ring that is measurably below the WCAG-style 3:1 non-text-contrast floor ROADMAP's Phase 08 success criterion 3 states, in light mode only.
**Why it happens:** `ring-offset-background` resolves to `--background` (the page background), and the ring color is `--ring` (`30 100% 45%` light / `30 100% 50%` dark). Computed this session with the repo's own `__tests__/design-tokens/contrast.ts` (`loadThemeTokens()` + `ratio()`):

| `--ring` vs. | dark | light |
|---|---|---|
| `--background` | 7.984 | **2.913** |
| `--background-subtle` (Modal's own background, `modal.tsx:52`) | 7.753 | **2.726** |
| `--background-elevated` / `--card` | 6.530 | 3.093 (passes, barely) |

Dark mode clears 3:1 everywhere. Light mode fails against the plain page background and against Modal's own `--background-subtle` container — meaning any `Input`/`Select`/`Textarea` inside a light-mode `Modal` (a very common case: `CreateCharacterModal`, `JoinGuildModal`, `OnboardingModal`, `UpgradeModal` all render forms inside `Modal`) will show a focus ring measurably below the stated floor.
**How to avoid:** This is not a defect this phase introduces — Button/Switch/Checkbox/Radio already ship this exact `--ring` value today, so implementing D-06/D-07 exactly as written does not regress anything. Do not attempt to fix it by nudging `--ring`'s HSL (out of scope — a Phase 07 token, and changing it would recolor every existing focus ring app-wide, not just the three primitives this phase touches). Record the measured numbers at the plan checkpoint as an accepted, pre-existing gap (mirroring Phase 07's own "OI-3 resolved accept-and-record" precedent for a similar sub-target contrast number), and let ROADMAP success criterion 3 be answered honestly ("passes in dark mode and against elevated/card surfaces in light mode; measured short of 3:1 against the plain page background and `--background-subtle` in light mode, a pre-existing token characteristic shared with every other focus-visible primitive in the app") rather than asserted clean.
**Warning signs:** A vitest or manual check that only measures `--ring` vs. `--background-elevated` (the highest-scoring pair) would incorrectly report a pass; measure all surfaces the primitives actually render on.

### Pitfall 2: CONTEXT.md's D-06 class string is missing three `focus-visible:` prefixes
**What goes wrong:** D-06 states the ring class to copy is `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`. Read verbatim against the four sibling primitives this session:
```
// button.tsx:33
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
// switch.tsx:19 / checkbox.tsx:19 / radio-group.tsx:31 — identical suffix
```
Every one of the four ring-related utilities carries the `focus-visible:` modifier. Tailwind requires the modifier on each utility class it should scope — writing `ring-ring` without the prefix (as D-06's string does) would apply that ring color unconditionally on every render, not just on keyboard focus, silently breaking the "keyboard-only, no ring on mouse click" behavior D-07 explicitly requires.
**Why it happens:** CONTEXT.md's decision text abbreviated the string for readability during the discuss-phase conversation; it was never re-verified against the live files.
**How to avoid:** Copy the literal four-utility, four-times-prefixed string from any of `button.tsx:33` / `switch.tsx:19` / `checkbox.tsx:19` / `radio-group.tsx:31` character-for-character. `Button`/`Switch`/`Checkbox` also prefix `outline-none` with `focus-visible:`; `Input`/`Textarea`/`Select` currently use `focus:outline-none` (unconditional, not `focus-visible:` scoped) — D-07 does not require changing this, and since outline suppression is harmless on both mouse and keyboard focus, leaving it as `focus:outline-none` is the minimal-diff choice; flag the alternative (matching siblings exactly with `focus-visible:outline-none`) as a discretion point at the checkpoint if visual parity with Button/Switch is preferred.
**Warning signs:** A visual check on mouse click showing a ring that should only appear on keyboard `Tab` focus.

### Pitfall 3: `Modal`'s `ModalTitle` has no id today — `aria-labelledby` needs new wiring, not a one-line attribute add
**What goes wrong:** `aria-labelledby={someId}` requires an element with `id={someId}` to exist in the DOM. `ModalTitle` (`modal.tsx:127-137`) forwards `...props` but nothing currently supplies an `id`; none of the 10+ call sites pass one.
**Why it happens:** `Modal` and `ModalTitle` are siblings-under-a-common-parent in the compound-component tree, not parent/child, so `Modal` cannot read `ModalTitle`'s props directly.
**How to avoid:** Add a small Context (see Architecture Patterns Pattern 1) generated via `React.useId()` inside `Modal`, provided to all children, consumed by `ModalTitle` to self-assign its `id` (unless the caller passes one explicitly) and by the outer dialog `div` for `aria-labelledby`. This mirrors the existing `CardContext` pattern in `card.tsx:18,26,38,47` — no new architectural idiom for this codebase.
**Warning signs:** `aria-labelledby` pointing at an id that resolves to nothing, which axe/accessibility linters flag but a human eyeballing the modal will not notice.

### Pitfall 4: The design-system docs page (`app/(app)/design-system/_client.tsx`) has 26 `LabelText` sites, not "a minimal deletion-only edit"
**What goes wrong:** ROADMAP's Phase 08 note says deleting `LabelText` "forces a minimal edit to `app/(app)/design-system/_client.tsx` so typecheck stays green. Keep that edit to the deletion only." Read literally, this could be mistaken for a single-line import removal; it is 26 separate JSX call sites (see Runtime State Inventory table above), several of which use `LabelText` specifically to *demonstrate* `LabelText` as a component (e.g. line 428 `<LabelText className="mb-3">Sizes</LabelText>` heading a `LabelText`-sizes showcase block).
**Why it happens:** The audit and CONTEXT.md correctly identified that this file needs *an* edit to stay green, but didn't enumerate how many JSX usages that implies.
**How to avoid:** The mechanically simplest fix that satisfies both "keep the edit to the deletion only" and D-01/D-02's "no exceptions" is the same swap used everywhere else: `LabelText` → `Text size="sm" weight="semibold" color="secondary"` at all 26 sites, leaving the surrounding showcase prose (which now describes a deleted component) stale until Phase 12's ENF-03 full documentation pass rewrites it. Do not attempt a fuller docs rewrite in this phase — that is explicitly Phase 12's job.
**Warning signs:** A typecheck pass that's actually failing on a different file, or a plan that estimates this file's edit at "1 line."

## Code Examples

### Corrected focus-visible ring class (apply to `input.tsx`, `textarea.tsx`, `select.tsx`)
```typescript
// Source: components/ui/button.tsx:33 (read verbatim this session — copy exactly, not CONTEXT.md's abbreviated string)
"focus:outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
// ^ keeps the existing focus:outline-none / focus:border-accent (D-07: unchanged),
//   adds all four focus-visible: prefixed ring utilities (matches Button/Switch/Checkbox/RadioGroup exactly)
```

### `label.tsx`'s mechanical alias swap (TYPE-02, Claude's Discretion note)
```typescript
// Source: components/ui/label.tsx:14-28 (full file read this session)
const labelVariants = cva(
  "font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      size: {
        sm: "text-12",      // was text-[12px] — Phase 07 alias, app/tailwind.config.js:48
        default: "text-13", // was text-[13px] — tailwind.config.js:49
        lg: "text-14",      // was text-[14px] — tailwind.config.js:50
      },
    },
    defaultVariants: { size: "default" },
  }
)
```

### Reusable guard-test scan for TYPE-02 (extend, don't reinvent)
```typescript
// Pattern from __tests__/type-scale-floor.test.ts, adapted for the two
// specific files in scope. Pass explicit file paths — sourceFiles() walks
// directories and would throw ENOTDIR on a bare file path.
import path from 'node:path'
import { matchesIn } from './design-tokens/source-files'

const files = [
  path.resolve(process.cwd(), 'components/ui/label.tsx'),
  path.resolve(process.cwd(), 'components/ui/typography.tsx'),
]
const matches = matchesIn(files, /text-\[\d+px\]/)
expect(matches, matches.map(m => `${m.file}:${m.line}: ${m.text}`).join('\n')).toHaveLength(0)
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@radix-ui/react-dialog` (npm, `1.1.23`) and `focus-trap-react` (npm, `12.0.3`) are legitimate, non-slopsquatted packages — confirmed to exist via `npm view` this session, but package legitimacy was not run through the full `package-legitimacy check` seam since neither is being adopted | Standard Stack / Alternatives Considered | Low — informational only; recorded as "considered, not adopted." If the planner reverses course and adopts either, run the full legitimacy gate first. |
| A2 | Recasing the four Sidebar.tsx literal-uppercase strings (`GUILD`, `GUILDS`, `CHARACTER`, `ADMIN SETTINGS`) to sentence case would count as a "user-facing copy change" requiring milestone-B sign-off, versus dropping only the CSS `uppercase`/`tracking-wide` classes and leaving the strings as-is | Runtime State Inventory, "hidden fourth convention" | Medium — if wrong (i.e., if the user considers this purely a CSS-class change, not a copy change), the plan may unnecessarily defer a straightforward visual fix; if right and the planner recases anyway without sign-off, it violates the milestone's hard constraint #1. Flagged explicitly for the checkpoint either way. |

## Open Questions

1. **How should the plan's checkpoint present the corrected `LabelText` scope (57 sites / 8 files) given CONTEXT.md's "8 sites / 4 files, not a mass sweep" framing?**
   - What we know: the migration target and mechanics (`<Text size="sm" weight="semibold" color="secondary">` everywhere, no exceptions) are unaffected by the count.
   - What's unclear: whether the user, on seeing the real count, still wants this handled as one Phase 08 batch or wants it split (e.g., production call sites in one commit, the design-system docs page in a separate commit, consistent with ROADMAP's "one token family per commit" precedent from Phase 07 D-12).
   - Recommendation: present the full table from Runtime State Inventory verbatim at the checkpoint; let the user decide batching, but do not let "small, fully-enumerable" stand uncorrected.

2. **Does the light-mode `--ring` sub-3:1 shortfall (Pitfall 1) get recorded as an accepted gap, or does it change what "3:1 or better" in ROADMAP success criterion 3 is allowed to mean (e.g., "3:1 against the elevated/card surface, which is where most inputs render")?**
   - What we know: dark mode always passes; light mode passes against `--background-elevated`/`--card` (3.093) but not against `--background`/`--background-subtle` (2.913/2.726).
   - What's unclear: whether ROADMAP intended "its surface" to mean the literal adjacent pixel color (what WCAG non-text-contrast actually measures) or a looser "the general vicinity."
   - Recommendation: measure and report both readings at the checkpoint; do not pick one silently.

3. **Should `Input`/`Textarea`/`Select`'s existing `focus:outline-none` become `focus-visible:outline-none` to match Button/Switch/Checkbox exactly, or stay as-is (Pitfall 2)?**
   - What we know: functionally near-identical (outline is suppressed either way; the visible ring is what actually communicates focus).
   - What's unclear: whether visual/code parity with the sibling primitives is itself a phase goal beyond what D-06/D-07 state.
   - Recommendation: default to the minimal-diff choice (leave `focus:outline-none` unchanged) unless the checkpoint reviewer prefers strict parity.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 (`package.json` devDependency), jsdom environment |
| Config file | `vitest.config.ts` (globals enabled, `jsdom`, `@/` alias, `vitest.setup.ts` for cleanup) |
| Quick run command | `npx vitest run components/ui/__tests__/modal.test.tsx` (or the two other touched test files) |
| Full suite command | `npm run test` (= `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TYPE-02 | No `text-[Npx]` in `label.tsx`/`typography.tsx` | unit (source scan) | `npx vitest run __tests__/type-scale-floor.test.ts` pattern, new assertion — see Code Examples | ❌ Wave 0 — extend `type-scale-floor.test.ts` or add a small sibling test |
| PRIM-02 | No `LabelText`/`.section-label` reference outside docs, all former uses render `Text` | unit (source scan) + manual visual check | `matchesIn()` scan for `LabelText\|section-label` across `app/`, `components/` excluding `.claude`/docs prose | ❌ Wave 0 — new test |
| PRIM-03 | Visible `focus-visible` ring, ≥3:1 against surface | unit (contrast) + manual keyboard walk | Extend `__tests__/design-tokens/report.ts`'s `ROWS` with `--ring` rows; a real keyboard `Tab` walk through one form is not automatable in jsdom and stays manual | ❌ Wave 0 for the contrast row; manual walk is inherently manual-only |
| PRIM-04 | `role="dialog"`, `aria-modal`, labelled title, focus trap, focus return, Escape | component test (RTL + userEvent) | `npx vitest run components/ui/__tests__/modal.test.tsx` | ❌ Wave 0 — new file, new directory |
| PRIM-05 | Skeleton swatch/card counts match real layout | unit (component render count assertion) | `npx vitest run components/ui/__tests__/skeletons.test.tsx` (or add assertions inline if a skeletons test file already exists elsewhere — none was found this session) | ❌ Wave 0 — new test; no existing `skeletons.test.*` found in the repo |

### Sampling Rate
- **Per task commit:** the quick run command for whichever file that commit touches.
- **Per wave merge:** `npm run test` (full suite).
- **Phase gate:** full suite green plus the manual keyboard walk (PRIM-03) and a manual click-through of the three previously-title-less modals (`JoinGuildModal`, `OnboardingModal`, `UpgradeModal`) before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `components/ui/__tests__/modal.test.tsx` — new file, new directory; covers PRIM-04 (role/aria-modal/focus trap/focus return/Escape), following `SkipDayModal.test.tsx`'s RTL + `userEvent` pattern (portals render into `document.body`, which `screen` queries traverse without extra setup).
- [ ] A source-scan test (new file or an addition to `type-scale-floor.test.ts`) covering TYPE-02 and the `LabelText`/`.section-label` grep for PRIM-02.
- [ ] `report.ts`'s `ROWS` extended with `{ label: 'focus ring', a: '--ring', b: '--background' }` and a `--background-subtle` variant, covering PRIM-03's numeric claim.
- [ ] A skeleton-count assertion test (new file `components/ui/__tests__/skeletons.test.tsx` — none exists today) covering PRIM-05's card/swatch counts.
- [ ] Framework install: none — Vitest, RTL, and `@testing-library/user-event` are already devDependencies.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase touches no auth logic |
| V3 Session Management | No | Phase touches no session logic |
| V4 Access Control | No | Phase touches no authorization logic |
| V5 Input Validation | No | `Input`/`Textarea`/`Select` changes are styling-only (focus ring classes); no validation behavior changes |
| V6 Cryptography | No | Phase touches no cryptographic code |

This phase is a pure client-rendered presentational/accessibility change with no data, auth, or crypto surface. The closest analog to a "threat" here is a WCAG failure (keyboard trap that can't be escaped, focus lost off-screen), which is an accessibility defect, not a STRIDE category — covered instead by the vitest component test required for PRIM-04 and the manual keyboard walk in Validation Architecture.

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| N/A — no applicable STRIDE pattern for a styling/accessibility-only phase | — | The relevant risk (a focus trap implemented wrong creates an inescapable keyboard trap, a WCAG 2.1.2 failure) is mitigated by the required vitest test asserting Escape closes the modal and focus returns to the trigger, not by a security control. |

## Sources

### Primary (HIGH confidence — read directly this session)
- `components/ui/label.tsx`, `components/ui/typography.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `components/ui/select.tsx`, `components/ui/modal.tsx`, `components/ui/skeletons.tsx`, `components/ui/card.tsx`, `components/ui/confirm-modal.tsx`, `components/ui/button.tsx`, `components/ui/switch.tsx`, `components/ui/checkbox.tsx`, `components/ui/radio-group.tsx` — full or targeted reads
- `app/globals.css` (lines 133-280, 604-611), `tailwind.config.js` (full file) — full reads
- `app/(app)/overview/components/DashboardContent.tsx` (lines 510-580), `app/components/Sidebar.tsx` (lines 320-630), `app/components/JoinGuildModal.tsx`, `app/components/OnboardingModal.tsx`, `app/components/UpgradeModal.tsx`, `app/(app)/raid-tracking/_client.tsx` (lines 2510-2554) — targeted reads
- `__tests__/design-tokens/contrast.ts`, `__tests__/design-tokens/report.ts`, `__tests__/design-tokens/source-files.ts`, `__tests__/type-scale-floor.test.ts`, `app/(app)/raid-tracking/components/__tests__/SkipDayModal.test.tsx` — full or targeted reads
- Live grep/npm output this session: `LabelText`/`section-label` site enumeration, `--ring` contrast computed via the repo's own `contrast.ts` functions, `npm view @radix-ui/react-dialog version` / `npm view focus-trap-react version`

### Secondary (MEDIUM confidence)
- `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md`, `07-CONTEXT.md`, `07-EVIDENCE.md` — prior-phase decisions and the token record this phase builds on

### Tertiary (LOW confidence)
- WAI-ARIA APG "Dialog (Modal)" pattern (training-knowledge description of the standard focusable-descendant-query + Tab-wrap approach) — not fetched from a live doc this session; a well-established, widely-documented pattern but tagged `[ASSUMED]` rather than `[CITED]` since no URL was fetched. If the planner wants a citable primary source, fetch `https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/` before locking the exact keydown-handler code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; the "don't adopt X" recommendation rests on directly-read existing file structure, not speculation.
- Architecture: HIGH for the `Context` pattern (precedented in `card.tsx`, read this session); MEDIUM for the exact focus-trap keydown code (a recommended shape, not yet implemented or test-verified).
- Pitfalls: HIGH — all four are either a direct file-content mismatch against CONTEXT.md (Pitfalls 2, 3, 4) or a number computed with the repo's own contrast utility (Pitfall 1), not inferred.

**Research date:** 2026-09-17
**Valid until:** Until the next edit to `components/ui/modal.tsx`, `label.tsx`, `typography.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `skeletons.tsx`, `app/globals.css`, or any of the enumerated call-site files — this research is a snapshot of live file contents, not a stable external fact. Re-verify line numbers if any of those files change before the plan executes (Phase 07 evidence shows this codebase's line numbers can drift within the same milestone).
