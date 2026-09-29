---
name: "LootList+"
description: "Transparent loot management for World of Warcraft Classic guilds"
colors:
  primary: "#080a0c"
  primary-foreground: "#ffffff"
  accent: "#e67300"
  accent-foreground: "#ffffff"
  accent-text: "#b85c00"
  background: "#faf8f5"
  background-subtle: "#f3f0ed"
  background-elevated: "#ffffff"
  foreground: "#080a0c"
  foreground-secondary: "#58514b"
  foreground-muted: "#726a65"
  border: "#d7d2cc"
  border-strong: "#bab4ab"
typography:
  display:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 700
    lineHeight: "1.02"
  body:
    fontFamily: "Poppins, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.5"
  scale:
    11: "11px"
    12: "12px"
    13: "13px"
    14: "14px"
    15: "15px"
    16: "16px"
    18: "18px"
    20: "20px"
    24: "24px"
    28: "28px"
    32: "32px"
    40: "40px"
    42: "42px"
    44: "44px"
    48: "48px"
    56: "56px"
    64: "64px"
    72: "72px"
    80: "80px"
rounded:
  none: "0px"
  sm: "4px"
  DEFAULT: "8px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  2xl: "20px"
  full: "9999px"
  pill-sm: "40px"
  pill: "52px"
  pill-lg: "60px"
spacing:
  4.5: "18px"
  5.5: "22px"
  13: "52px"
  15: "60px"
---

## Overview

LootList+ is a dark-first product with a supported light theme. The dark theme is the primary
design target (built from Figma), pairing a near-black background with a single warm orange
accent that carries the brand identity across both themes. Poppins is the sole UI typeface,
used at every weight from body copy through the display headings, with a dedicated WoW-flavored
serif reserved for class and faction identity moments.

The interface is dense and data-first: officers scan loot tables, attendance grids, and Loot
Score breakdowns rather than browsing marketing pages, so contrast, tabular alignment, and
consistent status colors matter more than decorative flourish. WoW domain identity shows up
through class colors, item quality tiers, and faction colors layered on top of the neutral base
palette rather than replacing it.

The colour values in this file's frontmatter are normative for the light theme and are guard
tested against `app/globals.css`'s `:root` custom properties (see
`__tests__/design-tokens/design-md-parity.test.ts`). A green result there proves this document
matches the source; it does not by itself certify that the source values are good.

**Key Characteristics:**
- Dark-first, warm palette with a fully supported light theme
- Poppins throughout, one WoW-flavored serif for class/faction identity
- Single orange accent (`#ff8000` dark, `#e67300` light) carrying brand identity across both themes
- Dense, data-first screens: loot tables, attendance grids, Loot Score breakdowns
- WoW domain identity (class colors, item quality, faction colors) layered on a neutral base

## Colors

Every colour custom property `app/globals.css` declares, for both themes, guard tested against
`:root` and `.dark` by `__tests__/design-tokens/design-md-parity.test.ts`. Light and Dark are
computed with `rgbToHex(hslToRgb())`, never the trailing `/* #rrggbb */` comments in
`app/globals.css` (several of those comments are wrong, `--foreground`'s among them). Alpha
records the declared opacity for the one token that carries a slash suffix; every other token's
Alpha cell is empty.

| Token | Light | Dark | Alpha | Role |
|---|---|---|---|---|
| `--accent` | #e67300 | #ff8000 | | Orange brand accent fill |
| `--accent-foreground` | #ffffff | #ffffff | | Text on the accent fill |
| `--accent-subtle` | #e67300 | #ff8000 | 0.15 / 0.2 | Low-opacity accent wash |
| `--accent-text` | #b85c00 | #ff8000 | | Text-only accent, contrast-safe on the elevated light surface |
| `--alliance` | #3c83f6 | #3c83f6 | | WoW Alliance faction colour |
| `--background` | #faf8f5 | #060709 | | Base page background |
| `--background-elevated` | #ffffff | #1d1f25 | | Cards, popovers, inputs |
| `--background-subtle` | #f3f0ed | #0b0c0f | | Sidebar and other subtle surfaces |
| `--border` | #d7d2cc | #2e2e2e | | Default border |
| `--border-strong` | #bab4ab | #424242 | | Stronger border, kept distinct from the default |
| `--card` | #ffffff | #1d1f25 | | Card surface, mirrors `--background-elevated` |
| `--card-foreground` | #080a0c | #ffffff | | Text on the card surface |
| `--chart-1` | #e76e50 | #2662d9 | | Chart series 1 |
| `--chart-2` | #2a9d90 | #2eb88a | | Chart series 2 |
| `--chart-3` | #274754 | #e88c30 | | Chart series 3 |
| `--chart-4` | #e8c468 | #af57db | | Chart series 4 |
| `--chart-5` | #f4a462 | #e23670 | | Chart series 5 |
| `--destructive` | #c52020 | #ef4343 | | Destructive action fill |
| `--destructive-foreground` | #ffffff | #ffffff | | Text on the destructive fill |
| `--discord` | #5966f3 | #5966f3 | | Discord brand fill used as a token |
| `--discord-foreground` | #ffffff | #ffffff | | Text on the Discord fill |
| `--error` | #dc2828 | #ef4343 | | Error status fill |
| `--error-foreground` | #420b0b | #420b0b | | Text on the error fill |
| `--foreground` | #080a0c | #ffffff | | Primary text |
| `--foreground-muted` | #726a65 | #878787 | | Muted text |
| `--foreground-secondary` | #58514b | #a1a1a1 | | Secondary text |
| `--horde` | #ef4343 | #ef4343 | | WoW Horde faction colour |
| `--info` | #3c83f6 | #3c83f6 | | Info status fill |
| `--info-foreground` | #031e49 | #031e49 | | Text on the info fill |
| `--input` | #d7d2cc | #2e2e2e | | Input border and track, tracks `--border` |
| `--muted` | #e9e6e2 | #292929 | | Hover surface |
| `--muted-foreground` | #58514b | #a1a1a1 | | Text on the hover surface |
| `--popover` | #ffffff | #1d1f25 | | Popover surface, mirrors `--background-elevated` |
| `--popover-foreground` | #080a0c | #ffffff | | Text on the popover surface |
| `--primary` | #080a0c | #ffffff | | Primary action fill |
| `--primary-foreground` | #ffffff | #0a0a0a | | Text on the primary fill |
| `--ring` | #e67300 | #ff8000 | | Focus ring |
| `--secondary` | #e9e6e2 | #1d1f25 | | Secondary action fill |
| `--secondary-foreground` | #080a0c | #ffffff | | Text on the secondary fill |
| `--standby` | #ce8509 | #f59f0a | | Benched, needs-revision status fill |
| `--standby-foreground` | #0a0a0a | #0a0a0a | | Text on the standby fill |
| `--success` | #21c45d | #21c45d | | Success status fill |
| `--success-foreground` | #072c15 | #072c15 | | Text on the success fill |
| `--warning` | #e7b008 | #e7b008 | | Warning status fill |
| `--warning-foreground` | #080a0c | #080a0c | | Text on the warning fill |

### Contrast record

Every ratio below is `contrast.ts`'s `ratio()`, recomputed from the current tokens to three
decimals, so a token change turns this table (and its guard) red rather than leaving a stale
figure standing.

| Pair | Foreground | Surface | Theme | Ratio |
|---|---|---|---|---|
| page | `--background` | `--background-elevated` | dark | 1.223 |
| page | `--background` | `--background-elevated` | light | 1.062 |
| border | `--border` | `--background-elevated` | dark | 1.213 |
| border | `--border` | `--background-elevated` | light | 1.504 |
| border-strong | `--border-strong` | `--background-elevated` | dark | 1.649 |
| border-strong | `--border-strong` | `--background-elevated` | light | 2.061 |
| hover surface | `--muted` | `--background-elevated` | dark | 1.131 |
| hover surface | `--muted` | `--background-elevated` | light | 1.242 |
| muted text | `--foreground-muted` | `--background-elevated` | dark | 4.601 |
| muted text | `--foreground-muted` | `--background-elevated` | light | 5.305 |
| accent text | `--accent-text` | `--background-elevated` | dark | 6.530 |
| accent text | `--accent-text` | `--background-elevated` | light | 4.613 |
| standby | `--standby` | `--background-elevated` | dark | 7.716 |
| standby | `--standby` | `--background-elevated` | light | 3.003 |
| muted text vs page | `--foreground-muted` | `--background` | light | 4.996 |
| muted text vs sidebar | `--foreground-muted` | `--background-subtle` | light | 4.676 |
| accent text vs page | `--accent-text` | `--background` | light | 4.344 |
| accent text vs sidebar | `--accent-text` | `--background-subtle` | light | 4.066 |
| focus ring vs page | `--ring` | `--background` | light | 2.913 |
| focus ring vs modal surface | `--ring` | `--background-subtle` | light | 2.726 |
| focus ring vs card | `--ring` | `--background-elevated` | light | 3.093 |
| focus ring vs page | `--ring` | `--background` | dark | 7.984 |
| focus ring vs modal surface | `--ring` | `--background-subtle` | dark | 7.753 |
| focus ring vs card | `--ring` | `--background-elevated` | dark | 6.530 |
| destructive | `--destructive` | `--background-elevated` | dark | 4.360 |
| error | `--error` | `--background-elevated` | dark | 4.360 |
| horde | `--horde` | `--background-elevated` | dark | 4.360 |
| warning | `--warning` | `--background-elevated` | light | 1.983 |
| success | `--success` | `--background-elevated` | light | 2.298 |

Accepted gaps, named by row rather than restated as a number: the `accent text vs page` and
`accent text vs sidebar` rows are the OI-2 gap, an accepted shortfall against two of the three
light surfaces. The `destructive`, `error` and `horde` rows are the OI-3 gap, a drop these three
dark tokens took when the card surface lifted, accepted rather than expanding scope to a token
family the user did not approve. The `focus ring vs page` and `focus ring vs modal surface`
light rows are the ring shortfall, an accepted, pre-existing characteristic of `--ring` shared
by every focus-visible primitive. The `warning` and `success` light rows are status tokens used
as fills paired with their own `-foreground` text, not as text sitting directly on a light
surface, and read far below 4.5:1 exactly because that is not their use.

## Typography

Poppins (`--font-poppins`) carries every weight of UI text, from body copy through the display
headings. Friz Quadrata (`--font-wow`) is loaded by `localFont` from `public/fonts/FrizQuadrata.woff`
and reserved for class and faction identity moments through the `font-wow` utility. Figtree
(`--font-tabular`) is applied only by the `.tabular-nums` rule, chosen for zero glyph-advance
jitter across weights so tabular figures line up; a bare `td`/`th` gets tabular alignment but
not the Figtree face, since the shared tabular-numerals rule carries no `font-family` on those
selectors.

The scale's floor is 11px (`text-xs` / `text-11`); no step in this table goes below it.

| Class | Size | Line height | Kind |
|---|---|---|---|
| `text-xs` | 11px | 1.5 | scale |
| `text-sm` | 12px | 1.5 | scale |
| `text-base` | 13px | 1.5 | scale |
| `text-md` | 14px | 1.5 | scale |
| `text-15` | 15px | 1.5 | scale |
| `text-lg` | 16px | 1.5 | scale |
| `text-xl` | 18px | 1.2 | scale |
| `text-2xl` | 20px | 1.2 | scale |
| `text-3xl` | 24px | 1.2 | scale |
| `text-4xl` | 32px | 1.2 | scale |
| `text-5xl` | 42px | 1.02 | scale |
| `text-11` | 11px | 1.5 | pixel alias |
| `text-12` | 12px | 1.5 | pixel alias |
| `text-13` | 13px | 1.5 | pixel alias |
| `text-14` | 14px | 1.5 | pixel alias |
| `text-16` | 16px | 1.5 | pixel alias |
| `text-18` | 18px | 1.2 | pixel alias |
| `text-20` | 20px | 1.2 | pixel alias |
| `text-24` | 24px | 1.2 | pixel alias |
| `text-32` | 32px | 1.2 | pixel alias |
| `text-42` | 42px | 1.02 | pixel alias |
| `text-28` | 28px | 1.2 | display alias |
| `text-40` | 40px | 1.2 | display alias |
| `text-44` | 44px | 1.2 | display alias |
| `text-48` | 48px | 1.2 | display alias |
| `text-56` | 56px | 1.02 | display alias |
| `text-64` | 64px | 1.02 | display alias |
| `text-72` | 72px | 1.02 | display alias |
| `text-80` | 80px | 1.02 | display alias |

## Layout

Spacing follows Tailwind's default 4px grid, extended by four steps this project adds beyond
the defaults: `4.5` (18px), `5.5` (22px), `13` (52px) and `15` (60px). The container is
centred, carries 2rem of padding, and caps at 1400px from the `2xl` breakpoint up.

Screens are dense and data-first: officers scan loot tables, attendance grids and Loot Score
breakdowns rather than browsing marketing pages, so the layout favours information density over
generous whitespace. `.prose-measure` caps long-form public reading at 70ch (the blog posts, the
research page, the compare page, and pricing's intro copy); it is not used inside the
authenticated app, where dense tabular content has no reading-measure constraint.

## Elevation & Depth

The surface ramp is `--background`, `--background-subtle` and `--background-elevated`
(mirrored by `--card`). Cards are defined by a border and a surface step, not a heavy shadow;
the ramp itself carries the sense of depth.

COLOR-02 widened the dark surface ramp partway through this project's history: the `page` step
(`--background` to `--background-elevated`) measured 1.086 before that change and the `border`
step measured 1.062, both recorded as history from `07-EVIDENCE.md`. The Contrast record's
`page` and `border` dark rows above carry the current, guarded figures; read those, not these
before values, for what ships today.

| Class | Shadow |
|---|---|
| `shadow-glow-accent` | `0 0 20px rgba(255, 128, 0, 0.3)` |
| `shadow-glow-success` | `0 0 20px rgba(34, 197, 94, 0.3)` |
| `shadow-glow-error` | `0 0 20px rgba(239, 68, 68, 0.3)` |

The SURF-01 browser surfaces are themed too: text selection washes at accent alpha 0.3 with no
foreground override, so selected text keeps its own colour; the caret uses `--accent`; and every
scrollable region gets a thin scrollbar whose thumb is `--border`, brightening to `--border-strong`
on hover.

## Shapes

| Class | Radius |
|---|---|
| `rounded-none` | 0px |
| `rounded-sm` | 4px |
| `rounded` | 8px |
| `rounded-md` | 8px |
| `rounded-lg` | 12px |
| `rounded-xl` | 16px |
| `rounded-2xl` | 20px |
| `rounded-full` | 9999px |
| `rounded-pill-sm` | 40px |
| `rounded-pill` | 52px |
| `rounded-pill-lg` | 60px |

`--radius` records 12px, the same value `rounded-lg` carries. Card's base radius is
`rounded-xl` at 16px, a different, larger step than `--radius`, not the same one; the two moved
apart when Card's base migrated from `rounded-lg` to `rounded-xl`.

## Components

**Card is the only card.** Base radius is `rounded-xl`. Three variants: `default` (padding on
CardHeader and CardContent separately), `unified` (padding on Card itself, a 12px gap between
header and content) and `nested` (a divider-only region: no fill, no border beyond the top
divider, no radius; padding passes through via className exactly like every other variant). The
divider is suppressed when the nested card is the first child of its parent, via
`first:border-t-0`, so no call site has to remember to turn it off.

**One label convention.** `Label` for form fields, `Text` for section headings. The former
`LabelText` and `.section-label` primitives are gone; do not reintroduce them.

**The focus ring is shared.** Every focusable primitive (Button, Input, Textarea, Select,
Switch, Checkbox, RadioGroup) carries the identical
`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background`
utility string, drawn from `--ring`. Dark mode clears 3:1 against every surface it renders on
(see the Contrast record's `focus ring vs page`, `focus ring vs modal surface` and
`focus ring vs card` dark rows); light mode clears it only against the card (its own
`focus ring vs card` row), falling short against the page and the modal surface, a known,
accepted gap.

**Modal follows the WAI-ARIA dialog pattern.** `role="dialog"` and `aria-modal="true"` on the
container, an accessible name supplied by `ModalTitle` via `aria-labelledby`, a focus trap that
wraps Tab at the first and last focusable element, focus returned to the triggering element on
close, and Escape closing only the topmost of any stacked Modals.

**Status renders as fills, never as light-surface text.** Badge and alert render `--warning`,
`--success`, `--error`, `--info` and `--standby` as fills paired with their own `-foreground`
text. The Contrast record's `warning` and `success` light rows show why: both read well under
4.5:1 as text on a light surface, because that is not how they are used.

**Skeleton counts are coupled, not independent.** `components/ui/skeletons.tsx`'s placeholder
counts track the real layouts they stand in for; a skeleton's count drifts when the screen it
precedes changes shape, and needs updating alongside it.

### Motion

| Class | Duration |
|---|---|
| `duration-fast` | `150ms` |
| `duration-normal` | `200ms` |
| `duration-slow` | `300ms` |

## Do's and Don'ts

- **No text below 11px, and no arbitrary pixel text classes.** `text-xs` (11px) is the floor;
  reach for a table row above, never a `text-[Npx]` literal.
- **`Card` is the only card.** Use `variant="nested"` for a card region living inside another
  Card, never a second bordered Card.
- **Semantic tokens, not Tailwind palette colour classes.** Reach for `bg-warning`, `text-accent`,
  `border-border` and so on; a raw palette class (`bg-yellow-500`, `text-purple-600`) is a
  regression, not a shortcut.
- **No purple in the authenticated app.** Marketing purple (`#9940ec`) is a deliberate accent
  reserved for public pages only, a decision the user recorded on 2026-09-15; it has no place
  inside the authenticated app.
- **Item quality, third-party brand and WoW class colours stay tokenised.** Item quality
  (`quality-epic` `#a335ee`, `quality-uncommon` `#1eff00`) and third-party brand colours
  (Battle.net `#0074e0`, Discord `#5865f2`, Warcraft Logs `#e35e15`) resolve through their own
  named tokens, never a hand-typed hex at the call site.
- **Monospace is reserved.** `font-mono` is for type-to-confirm targets and invite codes only,
  not a stylistic choice elsewhere in the app.
- **`animate-pulse` is a skeleton-only signal.** Reusing it elsewhere overloads the "this is
  loading" cue it exists to give.
- **`.tabular-nums` on numeric columns.** Scores, rankings and attendance figures line up only
  when the class is applied explicitly; a bare `td`/`th` gets tabular alignment but not the
  Figtree face.
- **Prefer the card surface for accent text.** Light mode's `--accent-text` clears 4.5:1 on the
  card (the Contrast record's `accent text` row) but falls short on the plain page and the
  sidebar (its own two rows), the accepted OI-2 gap; reach for the card surface when accent
  text is the only option.

Every value in this file is checked against source by
`__tests__/design-tokens/design-md-parity.test.ts`; a value that drifts fails that guard before
it reaches review.
