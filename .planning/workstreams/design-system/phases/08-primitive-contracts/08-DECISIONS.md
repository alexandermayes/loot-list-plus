# Phase 08: Primitive Contracts — Decisions Gate

**Purpose:** ROADMAP hard constraint 2 requires an explicit, recorded user go-ahead before the first
source edit of Phase 08. This document records the re-measured scope (not a number quoted from
CONTEXT.md or RESEARCH.md), the measured `--ring` contrast numbers, the before-baseline
determination, and the resolution of the seven open items RESEARCH.md raised.

## GO-AHEAD

**Date:** 2026-09-17
**Approved by:** Alexander Mayes
**Scope approved:** The full corrected scope as presented at the checkpoint — 61 label call sites
across 10 files (PRIM-02); the three input primitives' focus rings — `Input`, `Textarea`, `Select`
(PRIM-03); the modal accessibility work — `Modal` role/aria-modal/accessible name/focus trap/focus
return/stacking-aware Escape, plus new `ModalTitle` elements added to `JoinGuildModal`,
`OnboardingModal` and `UpgradeModal` (PRIM-04); the three named skeleton fixes (PRIM-05); and the
`label.tsx` arbitrary-pixel-to-named-alias swap (TYPE-02).
**Approval message (verbatim):** "Approved with defaults."

**Copy sign-off (OI-4 resolved to branch (b)):** The user, Alexander Mayes, granted explicit
user-facing copy sign-off on 2026-09-17 for the four hand-rolled `app/components/Sidebar.tsx` label
strings. Plan 08-06's Task 3 is authorized to recase these four strings (not merely strip the
uppercase CSS utilities) when it touches `Sidebar.tsx`:

| Site (line) | Before | After |
|---|---|---|
| 346 | `GUILD` | `Guild` |
| 441 | `GUILDS` | `Guilds` |
| 562 | `CHARACTER` | `Character` |
| 626 | `ADMIN SETTINGS` | `Admin settings` |

This is a deliberate, named exception to Standing Constraint 1 in `STATE.md` ("No user-facing copy
changes in this milestone... Copy changes go to milestone B with separate sign-off"), granted
specifically and only for these four strings, per ROADMAP hard constraint 1's sign-off requirement.

## Re-measured inventory (run 2026-09-17)

Commands run live against the current working tree, not quoted from RESEARCH.md.

### LabelText JSX call sites

```
grep -roh '[<]LabelText' app components | wc -l   # => 55
```

| File | Sites | Line numbers |
|------|-------|--------------|
| `app/(app)/sheet-import/_client.tsx` | 2 | 435, 465 |
| `app/(app)/reserve/runs/[id]/_client.tsx` | 12 | 739, 765, 789, 829, 879, 904, 955, 1045, 1076, 1169, 1211, 1271 |
| `app/(app)/admin/addon/_client.tsx` | 2 | 66, 94 |
| `app/(app)/raid-teams/_client.tsx` | 3 | 600, 609, 626 |
| `app/(app)/loot-list/components/LootListContent.tsx` | 3 | 2133, 2143, 2181 |
| `app/reserve/join/[token]/components/InlineSettingsEditor.tsx` | 4 | 221, 307, 345, 391 |
| `app/reserve/join/[token]/page.tsx` | 3 | 989, 1019, 1054 |
| `app/(app)/design-system/_client.tsx` (docs/showcase page) | 26 | 428, 438, 449, 466, 470, 517, 528, 543, 1496, 1504, 1633, 1695, 1730, 1736, 1754, 1776, 1785, 1797, 1817, 1826, 1848, 1867, 1889, 1911, 1920, 1932 |
| **Total** | **55** | across **8 files** |

### `.section-label` occurrences

```
grep -rn 'section-label' app components
```

- `app/globals.css:604` — the CSS rule itself (not a call site).
- `app/(app)/design-system/_client.tsx:1984` — `<p className="section-label px-3 mb-1">Current Guild</p>`
- `app/(app)/design-system/_client.tsx:1996` — `<p className="section-label px-3 mb-1">Character</p>`

2 call sites, both in the design-system docs page (matches CONTEXT.md's claim for this primitive only).

### Hand-rolled Sidebar.tsx label convention (grep-invisible to `LabelText`/`section-label`)

```
grep -n 'font-poppins font-medium text-11 text-muted-foreground' app/components/Sidebar.tsx
```

- Line 346 — "GUILD"
- Line 441 — "GUILDS" (guild-switcher dropdown)
- Line 562 — "CHARACTER"
- Line 626 — "ADMIN SETTINGS"

4 sites, all in `app/components/Sidebar.tsx`, matching neither deleted primitive's grep signature.

### Grand total

**55 LabelText + 2 `.section-label` + 4 Sidebar.tsx = 61 call sites in scope.**

CONTEXT.md's "8 sites in 4 files, not a mass sweep" framing is superseded by this measurement: the
actual scope is 61 sites across 10 files (8 LabelText files + `app/(app)/design-system/_client.tsx`
already counted + `app/components/Sidebar.tsx`, i.e. 9 unique files carrying LabelText/section-label
plus Sidebar.tsx = 10 files total). The migration mechanics (`<Text size="sm" weight="semibold"
color="secondary">` everywhere, no exceptions) are unaffected by the larger count.

## Measured --ring contrast (run 2026-09-17)

Computed via a throwaway `npx tsx -e` invocation importing `loadThemeTokens()` and `ratio()` from
`__tests__/design-tokens/contrast.ts` (the milestone's single source of truth for contrast numbers).
No file under `__tests__/` was created or edited in this task — the permanent report rows are plan
08-03's job.

```
npx tsx -e "
import { loadThemeTokens, ratio } from './__tests__/design-tokens/contrast';
const { light, dark } = loadThemeTokens();
for (const [a, b] of [['--ring','--background'],['--ring','--background-subtle'],['--ring','--background-elevated']]) {
  console.log(a, 'vs', b, '| dark:', ratio(dark,a,b).toFixed(3), '| light:', ratio(light,a,b).toFixed(3));
}
"
```

| Row | dark | light |
|-----|------|-------|
| ring vs page (`--ring` vs `--background`) | 7.984 (pass) | 2.913 (**fail**, below 3.000) |
| ring vs modal surface (`--ring` vs `--background-subtle`) | 7.753 (pass) | 2.726 (**fail**, below 3.000) |
| ring vs card (`--ring` vs `--background-elevated`) | 6.530 (pass) | 3.093 (pass) |

All three dark-mode numbers clear 3.000. In light mode, `ring vs page` and `ring vs modal surface`
both measure below the 3:1 floor; `ring vs card` clears it, barely (3.093). This is a pre-existing
property of the `--ring` token (`30 100% 45%` light / `30 100% 50%` dark, `app/globals.css:175,280`)
that every existing Button, Switch, Checkbox and Radio already ships — not a regression introduced
by this phase.

## Before-baseline for Phase 08

```
git log --since="2026-09-16T19:29:39Z" --oneline -- \
  components/ui/label.tsx components/ui/typography.tsx app/globals.css \
  components/ui/input.tsx components/ui/textarea.tsx components/ui/select.tsx \
  components/ui/modal.tsx components/ui/skeletons.tsx \
  "app/(app)/sheet-import/_client.tsx" "app/(app)/reserve/runs/[id]/_client.tsx" \
  "app/(app)/admin/addon/_client.tsx" "app/(app)/raid-teams/_client.tsx" \
  "app/(app)/loot-list/components/LootListContent.tsx" \
  "app/reserve/join/[token]/components/InlineSettingsEditor.tsx" \
  "app/reserve/join/[token]/page.tsx" "app/(app)/design-system/_client.tsx" \
  app/components/Sidebar.tsx app/components/JoinGuildModal.tsx \
  app/components/OnboardingModal.tsx app/components/UpgradeModal.tsx
```

Result: **empty log.** No commit has touched any of the eight primitive files or the ten call-site
files this phase will edit since the post-phase-07 baseline was captured
(`2026-09-16T19:29:39.616Z`, git sha `010babb3`).

Because the log is empty, `.planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/`
is recorded as the phase-08 before baseline, with the git evidence above as the justification
(ROADMAP hard constraint 4 asks for a before/after comparison, not necessarily a redundant capture
when nothing in scope has moved since the last one).

## Open items

### OI-1 — Corrected label scope and batching

**Resolution:** Approved as planned. Keep it inside Phase 08, at the corrected 61-site scope, with
production sites landing in one commit/plan and the docs page in another, per the batching already
described (this matches what plans 08-05 and 08-06 already implement). No re-split, no deferral.

### OI-2 — Corrected focus-ring class string

**Resolution:** Confirmed. Copy the corrected string with all four ring utilities
`focus-visible:`-prefixed: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
focus-visible:ring-offset-background`. D-06's abbreviated three-prefix version is not used. On the
sub-question: minimal-diff — leave `Input`/`Textarea`/`Select`'s existing `focus:outline-none`
unchanged; do not force strict parity with `Button`'s `focus-visible:outline-none`.

### OI-3 — Light-mode ring contrast falls short of 3:1

**Resolution:** Option (a) — accept and record the gap. ROADMAP success criterion 3 is answered
honestly: the ring passes in dark mode against all three surfaces (page 7.984, modal surface 7.753,
card 6.530); in light mode it passes against the card/elevated surface (3.093) but measures short of
the 3:1 floor against the plain page (2.913) and the modal's own surface (2.726). The `--ring` token
fix is carried forward as a named finding for a future phase; the token is not modified in Phase 08.

### OI-4 — Sidebar labels: the copy-change tension

**Resolution:** Branch (b) — migrate and recase. This is an explicit, deliberate user-facing copy
sign-off, approved by Alexander Mayes on 2026-09-17 (see the GO-AHEAD section above for the full
before/after table of the four strings). This authorizes plan 08-06's Task 3 (Sidebar.tsx handling)
to actually recase `GUILD`→`Guild`, `GUILDS`→`Guilds`, `CHARACTER`→`Character`, and
`ADMIN SETTINGS`→`Admin settings` when it runs, not just drop the uppercase CSS utilities.

### OI-5 — New accessibility-only strings for two modals

**Resolution:** Approved the proposed wording as-is: `"Upgrade to LootList+ Pro"` for `UpgradeModal`'s
visually-hidden `ModalTitle`. Also approved the related micro-change: `OnboardingModal`'s converted
heading picks up `ModalTitle`'s `text-balance` styling as a side effect, with no size, weight or
colour change.

### OI-6 — The conditional sixth legend swatch

**Resolution:** Confirmed default. Render exactly 5 placeholders, always; the skeleton does not
speculate the conditional sixth signup indicator.

### OI-7 — Element type at migrated label sites

**Resolution:** Confirmed default. `as="span"` is passed at all 55 former `LabelText` sites; the two
`.section-label` sites and the four Sidebar sites keep the default `p` (they are already `p`
elements).
