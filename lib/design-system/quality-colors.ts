/**
 * Quality and brand colour constants (COLOR-05, D-12/D-13).
 *
 * Single TypeScript source of truth for the five hex values this codebase
 * hard-coded independently at ~20-31 sites across `app/` and `components/`:
 * two WoW item-quality colours (Epic purple, Uncommon green) and three
 * external-brand colours (Battle.net blue, Discord blurple, Warcraft Logs
 * orange).
 *
 * This is a plain TS data module, not a CSS custom property, because every
 * consumer reads these values as JS data rather than as CSS: conditional
 * style objects, SVG/style attributes, and `AccentColorContext.tsx`'s
 * hex-keyed CSS filter lookup. A CSS variable can't be interpolated into
 * that lookup's object keys.
 *
 * Five matching keys also exist in `tailwind.config.js`
 * (`quality-epic`, `quality-uncommon`, `brand-battlenet`, `brand-discord`,
 * `brand-wcl`) for Tailwind class sites. Tailwind's extractor scans source
 * files as plain text and never evaluates an interpolated class name, so a
 * class built from this module's values would silently generate no CSS.
 * Class sites must use the named Tailwind key instead of importing this
 * module. A CJS `tailwind.config.js` also cannot import this ESM/TS module,
 * and importing the config into a client bundle would pull the whole
 * design-system module in — so the two representations are deliberately
 * duplicated, not shared, and kept in agreement by
 * `__tests__/quality-brand-token-parity.test.ts`, which deep-equals the
 * Tailwind keys against these constants and fails naming either side on
 * drift.
 *
 * D-13 naming: the green is named `uncommon`, not `legendary`, because this
 * codebase already binds `legendary` to a different orange hex
 * (`AccentColorContext.tsx:11`, `#ff8000`), already calls this exact green
 * "Uncommon" in `AccentColorContext.tsx:14`'s own comment, and already maps
 * the same literal to an `uncommon` key in `ParallaxItem.tsx:35`. All three
 * precedents predate this module.
 */

/** WoW item-quality colours. Exact current hex values, verbatim. */
export const QUALITY_COLORS = {
  epic: '#a335ee',
  uncommon: '#1eff00',
} as const

/** External-brand colours. Exact current hex values, verbatim. */
export const BRAND_COLORS = {
  battlenet: '#0074e0',
  discord: '#5865f2',
  wcl: '#e35e15',
} as const
