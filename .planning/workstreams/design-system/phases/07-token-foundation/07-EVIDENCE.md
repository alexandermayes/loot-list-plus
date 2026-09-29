# Phase 07: Token Foundation — Evidence Record

Closes the phase with evidence rather than assertion. Every contrast number below is the verbatim output of `npx tsx __tests__/design-tokens/report.ts` (extended once, additively, in this plan to cover the four D-11 pairs the committed script's fixed nine-row table did not); nothing here was typed by hand from memory or arithmetic.

## Token record

The values this phase changed or added, in the shape `.claude/skills/impeccable/reference/document.md`'s frontmatter token schema expects (`colors`, one entry per token; `typography` for the scale steps).

### Typography (`tailwind.config.js` `theme.extend.fontSize`)

| step | before | after | change |
|------|--------|-------|--------|
| `xs` | `10px` / line-height 1.5 | `11px` / line-height 1.5 | floor raised (TYPE-01) |
| `15` (new) | — | `15px` / line-height 1.5 | new step between `base` (13px) and `lg` (16px) |
| `sm`, `base`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl` | unchanged | unchanged | not touched by this phase |
| pixel aliases `11`, `12`, `13`, `14`, `16`, `18`, `20`, `24`, `32`, `42` (new) | — | each a literal twin of its semantic step | added for the Phase 09 codemod to target by name |

### Colors — light (`:root` in `app/globals.css`)

| token | before | after | hex (after) |
|-------|--------|-------|-------------|
| `--foreground-muted` | `25 6% 45%` | `25 6% 42%` | `#726a65` |
| `--accent-text` (new) | — | `30 100% 36%` | `#b85c00` |
| `--standby` (new) | — | `38 92% 42%` | `#ce8509` |
| `--standby-foreground` (new) | — | `0 0% 4%` | `#0a0a0a` |

Every other light token is byte-identical to its pre-phase value (D-11: "Light mode: change nothing" beyond these four).

### Colors — dark (`.dark` in `app/globals.css`)

| token | before | after | hex (after) |
|-------|--------|-------|-------------|
| `--foreground-muted` | `0 0% 40%` | `0 0% 53%` | `#878787` |
| `--background-elevated` | `228 12% 8%` | `228 12% 13%` | `#1d1f25` |
| `--card` | `228 12% 8%` | `228 12% 13%` | `#1d1f25` |
| `--popover` | `228 12% 8%` | `228 12% 13%` | `#1d1f25` |
| `--secondary` | `228 12% 8%` | `228 12% 13%` | `#1d1f25` |
| `--muted` | `0 0% 12%` | `0 0% 16%` | `#292929` |
| `--border` | `0 0% 10%` | `0 0% 18%` | `#2e2e2e` |
| `--border-strong` | `0 0% 22%` | `0 0% 26%` | `#424242` |
| `--input` | `0 0% 10%` | `0 0% 18%` | `#2e2e2e` |
| `--accent-text` (new) | — | `30 100% 50%` | `#ff8000` (identical to `--accent`) |
| `--standby` (new) | — | `38 92% 50%` | `#f59f0a` |
| `--standby-foreground` (new) | — | `0 0% 4%` | `#0a0a0a` |
| `--background`, `--background-subtle`, `--background-inset` | unchanged | unchanged | the near-black identity anchor and the still-darker inset level are deliberately untouched |

### New Tailwind wiring (`tailwind.config.js`)

- `theme.extend.textColor.accent` = `{ DEFAULT: hsl(var(--accent-text)), foreground: hsl(var(--accent-foreground)), subtle: hsl(var(--accent-subtle)) }` — splits `text-accent` from the `bg-accent`/`border-accent`/`ring-accent` fill colour with zero call-site churn.
- `theme.extend.colors.standby` = `{ DEFAULT: hsl(var(--standby)), foreground: hsl(var(--standby-foreground)) }`.

## Contrast record

Verbatim output of `npx tsx __tests__/design-tokens/report.ts`, run at the end of this plan. Fixed order: page, card, inset, border, border-strong, hover surface, muted text, accent text, standby (matches `07-DECISIONS.md`'s measured-baseline order).

**After (this plan's run):**

| pair | dark | light |
|------|------|-------|
| page | 1.223 | 1.062 |
| card | 1.079 | 1.086 |
| inset | 1.134 | 1.022 |
| border | 1.213 | 1.504 |
| border-strong | 1.649 | 2.061 |
| hover surface | 1.131 | 1.242 |
| muted text | 4.601 | 5.305 |
| accent text | 6.530 | 4.613 |
| standby | 7.716 | 3.003 |

**Before** (`## Measured baseline at plan time` in `07-DECISIONS.md`, recorded before any edit, same generator, same order):

| pair | dark | light |
|------|------|-------|
| page | 1.086 | 1.062 |
| card | 1.044 | 1.086 |
| inset | — (not measured pre-plan for dark; page-vs-inset was) | 1.022 |
| border | 1.062 | 1.504 |
| border-strong | 1.587 | — |
| hover surface | 1.122 | — |
| muted text | 3.235 (vs card) | 4.743 (vs card) |
| accent text | 7.354 | 3.093 |
| standby | absent (token did not exist) | absent |

Because both tables come from the same generator in the same order, the two diff line for line: `page` and `border` both cross the 1.2 dark floor (COLOR-02), `muted text` and `accent text` both cross 4.5 (COLOR-01), and `standby` moves from absent to a real, floor-clearing number in both themes (COLOR-06).

**D-11 additional pairs** (this plan's extension of `report.ts`; the primary table above only measures muted/accent text against the card, and D-11 also asks for the page and sidebar surfaces):

| pair | dark | light |
|------|------|-------|
| muted text vs page | 5.625 | 4.996 |
| muted text vs sidebar | 5.462 | 4.676 |
| accent text vs page | 7.984 | 4.344 |
| accent text vs sidebar | 7.753 | 4.066 |

## Light mode, measured and unchanged

D-11's deliverable. The only light-mode token values this phase changed are `--foreground-muted` (`25 6% 45%` → `25 6% 42%`) and the two new tokens (`--accent-text`, `--standby`); every surface and border token in light mode is byte-identical to its pre-phase value.

| measurement | value |
|-------------|-------|
| page to card | 1.062 |
| card to inset | 1.086 |
| page to inset | 1.022 |
| border to card | 1.504 |
| muted text vs page | 4.996 |
| muted text vs card | 5.305 |
| muted text vs sidebar | 4.676 |
| accent text vs page (cream) | 4.344 |
| accent text vs card (white) | 4.613 |
| accent text vs sidebar | 4.066 |

All nine come from this plan's two report runs above (the primary table for page/card/inset/border/muted-vs-card/accent-vs-card, the D-11 extension table for muted/accent vs page and sidebar).

## Success criteria

One row per ROADMAP Phase 07 success criterion.

| # | Criterion (verbatim) | Answer |
|---|----------------------|--------|
| 1 | `tailwind.config.js` defines `xs` at 11px and adds a 15px step, and `grep -rE "text-\[(9\|10)px\]" app components` returns zero matches (108 occurrences today: 95 at 10px, 13 at 9px) | `tailwind.config.js`: `'xs': ['11px', { lineHeight: '1.5' }]` and `'15': ['15px', { lineHeight: '1.5' }]` (see Token record above). `grep -rE "text-\[(9\|10)px\]" app components \| wc -l` → **`0`**. Actual pre-phase count was 109 across 26 files (07-03-SUMMARY's re-measured live grep), one more than the roadmap's 108 estimate because `app/globals.css:571`'s `.section-label` `@apply text-[10px]` was not counted in the original audit; it is included and swept here. |
| 2 | A committed contrast check reports dark `--foreground-muted` at 4.5:1 or better against `--background`, `--background-elevated` and `--background-subtle`, and accent text on white at 4.5:1 or better in light mode | Dark muted text: **5.625** vs page, **4.601** vs card, **5.462** vs sidebar — all ≥ 4.5. Light accent text vs white card: **4.613** ≥ 4.5. Both rows are asserted by the committed test `__tests__/token-contrast.test.ts` (`muted text (COLOR-01)` and `accent text (COLOR-01)` describe blocks, 31/31 passing). |
| 3 | Dark `--border` measures at least 1.2:1 against `--background-elevated`, and the `--background` to `--background-elevated` step measures at least 1.2:1, with the before and after values written down for DESIGN.md to pick up in Phase 12 | `border` row: **1.062 → 1.213** (≥ 1.2). `page` row: **1.086 → 1.223** (≥ 1.2). Both before/after pairs are recorded in the Contrast record above and in `__tests__/token-contrast.test.ts`'s `surface and border ramp (COLOR-02)` describe block. |
| 4 | `components/ui/status-badge.tsx` and `components/ui/alert.tsx` contain no Tailwind palette colour class; they render from `--warning`, `--success`, `--error` and `--info`, and a new `--standby` token replaces the three duplicated orange-500 literals in raid tracking | `grep -cE 'yellow-500\|orange-500' components/ui/status-badge.tsx components/ui/alert.tsx "app/(app)/raid-tracking/components/cell-state.ts" "app/(app)/raid-tracking/components/RaidMemberList.tsx" "app/(app)/raid-tracking/_client.tsx"` → **`0`** in all five files. `standby` contrast row: **7.716** (dark) / **3.003** (light), a real number instead of `absent`. Guard: `__tests__/token-palette-literals.test.ts` (3/3 passing). |
| 5 | `npm run lint`, `npm run typecheck` and `npm run test` pass, and a fixed screenshot set (one public page, one app page, light and dark, 1440 and 390) is captured before and after so later phases have a comparison baseline | `npm run lint` → **0 errors** (397 pre-existing warnings, unrelated to this phase). `npm run typecheck` → **exit 0**. `npm run test` → **1176/1176 passing**. Baseline directories: `.planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/` and `.planning/workstreams/design-system/baselines/2026-09-16-post-phase-07/`, Home-only (public page) in both themes at both widths; the app-page half (Overview) is symmetrically skipped in both captures per the D-16 fallback (see Carried forward). |

## Carried forward

Every finding this phase measured but did not fix, each with its number and a named destination. None of these were fixed, deferred casually, or declared acceptable on the developer's behalf without a destination.

1. **OI-3, three dark tokens crossing the 4.5 floor from the card lift.** `--destructive`, `--error` and `--horde` move from **4.910** (against the pre-phase card) to **4.360** (against the lifted card), independently reverified against the committed `globals.css` with `contrast.ts`'s `ratio()`. None of the three were edited by this phase (the user approved only the token families in D-04 through D-10). Routed to **Phase 12's DESIGN.md** (the drop must be documented as a known state, not silently absorbed) and, for `--horde` specifically, also to **Phase 10's COLOR-04** requirement (faction colour migration), since Phase 10 is the phase that next touches `--horde`.
2. **OI-3, `--info` and `--alliance` losing headroom but staying above the floor.** Both move from **5.118** to **4.545** against the lifted card — still clears 4.5, but with very little margin left. Recorded so a future surface lift (or a future card-lightness change) knows exactly how little headroom these two tokens have before they cross the line the way `--destructive`/`--error`/`--horde` just did.
3. **`--background-inset` sitting darker than the card it is meant to nest inside.** The `card` contrast row is **1.079** in dark mode — `--background-inset` (`228 12% 10%`) is now darker than the lifted `--background-elevated` (`228 12% 13%`), inverting the "nested surface is lighter" convention light mode already follows (`1.086`, card-to-inset, in light — also darker there, so this is consistent with light mode's existing behaviour, not a new inversion, but it is now more pronounced). Routed to **Phase 10's COLOR-03**, which deletes `--background-inset` outright and its 12 uses migrate onto the `Card` primitive's `nested` variant.
4. **Light-mode status-token text contrast, as a class rather than a single finding.** Measured directly against the white card: `--warning` **1.983**, `--success` **2.298**, `--standby` **3.003** — all well under 4.5 when used as *text* on a light surface (they were designed as fill colours with a paired `-foreground`, not as text colours in their own right, and the light badge/alert variants in this phase use them as fills with a separate `-foreground` text colour, not this way — but any future light-mode usage of these tokens as direct text colour would fail COLOR-01). Routed to **Phase 12** (DESIGN.md must document this constraint explicitly: these three tokens are fill-only in light mode) and **milestone B** (marketing surfaces that might otherwise reach for one of these as inline coloured text).
5. **Light accent text under 4.5 on two of the three light surfaces (OI-2 accepted gap).** The shipped OI-2 Option A value (`30 100% 36%`) measures **4.613** on the white card (clears COLOR-01, which only requires "on white") but **4.344** on the cream page and **4.066** on the sidebar — both under 4.5. The unchosen OI-2 Option B (`30 100% 33%`, darker) would have measured **5.324** on the white card, **5.014** on the cream page, and **4.693** on the sidebar — clearing all three surfaces, at the cost of a bigger identity shift from the current light accent hue. Recorded with both options' numbers so Phase 12's DESIGN.md and any future revisit of this token can see the full trade-off, not just the value that shipped.
6. **The density consequence of the 11px raise (OI-8, D-03).** Because the pixel aliases carry a line-height per D-02, raising a sub-11px site to `text-11` also sets line-height 1.5 where the arbitrary class previously inherited whichever line-height its container had, changing vertical rhythm on chip-heavy screens (the changelog alone has 241 former 10px chips). This is an intended density change, not a bug, but per-screen tuning was explicitly deferred. Routed to **Phase 09** (the mechanical codemod phase) and **milestone C** (app screen work) for any screen that needs individual tuning beyond the uniform raise.
7. **Every item the deferred `<human-check>`s across Plans 03, 04 and 05 have not yet resolved**, all already recorded in `.planning/WINDOWS.md` as open `unrun-verify` entries (per `workflow.human_verify_mode=end-of-phase`, they were deferred rather than run mid-plan):
   - Entry 4: the dark surface/border ramp's visual density and card-readability, against the pre-phase-07 baseline, at 1440/390 in both themes.
   - Entry 5: the standby cell rail, legend swatch and member pill reading as a distinct amber from late-yellow and accent-orange, and benched not being mistakable for late.
   - **New, from this plan's Task 1:** the post-phase-07 baseline is Home-only (a marketing page with no cards, no borders, no hover surfaces, and no standby chips in the visible viewport), so the side-by-side comparison performed in this plan confirms no regression on Home (no layout shift, no clipped or wrapped text, no shrunk text) but cannot itself confirm the ramp/standby visual judgments WINDOWS entries 4 and 5 are waiting on — those still need a card-dense, authenticated screen (Overview, guild settings, raid tracking) captured with a service-role credential before they can close. Routed to the same **end-of-phase UAT** these two entries already point to; not a new entry, a clarification that Task 1's capture does not substitute for it.

## Guard inventory

The four committed tests this phase added or extended, what each asserts, the command that runs it, and (for the palette guard) its recorded scope limit.

| test file | asserts | command |
|-----------|---------|---------|
| `__tests__/type-scale-floor.test.ts` | `tailwind.config.js`'s `fontSize.xs` is `11px`; the new `'15'` step exists at `15px`; all ten pixel-named aliases (`'11'` through `'42'`) are deep-equal to their semantic twin; zero `text-[9px]`/`text-[10px]` literals remain anywhere under `app/` or `components/`; no site interpolates a pixel size from a variable (the dynamic-interpolation bypass vector) | `npx vitest run __tests__/type-scale-floor.test.ts` (17/17 passing) |
| `__tests__/token-contrast.test.ts` | Dark and light `--foreground-muted` clear 4.5:1 on every surface COLOR-01 names; `--accent-text` exists in both themes and `text-accent` resolves to it via the compiled-CSS probe while `bg-accent`/`border-accent`/`ring-accent`/`text-accent-foreground` are unaffected; dark page-to-card and border-to-card both clear 1.2:1 and the card family moves in lockstep; `--standby`/`--standby-foreground` exist in both themes, clear a real 4.5:1 floor everywhere standby is a fill with text on it, and strictly improve on the `orange-500` literal they replace | `npx vitest run __tests__/token-contrast.test.ts` (31/31 passing) |
| `__tests__/token-palette-literals.test.ts` | Zero Tailwind palette colour classes remain in an explicit five-file list (`status-badge.tsx`, `alert.tsx`, `cell-state.ts`, `RaidMemberList.tsx`, `_client.tsx`); `pending` and `needs_revision` `StatusBadge` variants render different class strings with unchanged labels. **Recorded scope limit (Plan 05's flagged assumption):** the guard recognises only a Tailwind utility prefix crossed with one of 22 Tailwind palette hue names crossed with a standard numeric shade, with an optional variant prefix (`hover:`, `dark:`, …) and an optional alpha suffix (`/NN`). A colour introduced by a raw hex, an `rgb()`/`oklch()` call, or an arbitrary-value class passes this guard untouched — widening it to those spellings is Phase 10's work under COLOR-03 through COLOR-07. A green result here must not be read as "no hard-coded colour remains in these files." | `npx vitest run __tests__/token-palette-literals.test.ts` (3/3 passing) |
| `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts` | `getCellStyle`'s standby branch resolves to `border-l-standby` instead of the `orange-500` literal; all five non-empty attendance states resolve to five *distinct* left-border colour utilities (a digit-excluding lookahead separates the shared `border-l-2` width utility from the per-state colour utility, so two states silently sharing a colour would fail this assertion by name, not just pass five separate `toContain` checks) | `npx vitest run "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts"` (part of the 74-test combined run below) |

Combined run of all four: `npx vitest run __tests__/type-scale-floor.test.ts __tests__/token-contrast.test.ts __tests__/token-palette-literals.test.ts "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts"` → **4 files, 74 tests, all passing**.

---
*Phase: 07-token-foundation*
*Recorded: 2026-09-16*
