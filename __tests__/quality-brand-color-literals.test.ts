import { describe, it, expect } from 'vitest'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
import { QUALITY_COLORS, BRAND_COLORS } from '../lib/design-system/quality-colors'

// COLOR-05 absence guard (D-12/D-13/D-14, 10-05-PLAN.md): 10-03 migrated the
// 15 Tailwind arbitrary-value class sites onto named `theme.extend.colors`
// keys and 10-05 rewired the remaining 19 plain JS/TS data sites (object
// values, an object key, SVG attributes, inline style strings and a docs
// display string) onto imports from `lib/design-system/quality-colors.ts`.
// This suite is the executable form of "none of the five hex values is ever
// spelled raw under app/ or components/ again": it fails naming the file and
// line if any of the five reappears, at any letter case and inside an
// eight-digit hex-plus-alpha form, not only the exact spellings this
// migration removed.
//
// Scope contrast with the sibling COLOR-07 guard
// (__tests__/purple-gradient-guard.test.ts): that guard carves the landing
// subtree out of its scan (D-05, marketing purple is deliberately out of
// scope there). This guard has NO landing carve-out. REQUIREMENTS.md's
// COLOR-05 wording covers `app/` and `components/` with no exception, and
// the landing subtree's own WoW-quality hex values (ClickEffects.tsx,
// ParallaxItem.tsx) are squarely in this phase's scope -- 10-05 Task 2
// migrated exactly those ten sites. A reader must not assume the two guards
// share a scope.
//
// Pattern derivation: the five-value detection pattern below is built from
// `lib/design-system/quality-colors.ts`'s own exported values, not restated
// as a literal list in this file -- the same discipline
// `hand-rolled-cards.test.ts` follows by reading its predicate from a
// committed file rather than re-typing it. A restated pattern is exactly how
// a guard and its source drift apart. The match is case-insensitive, since
// the Battle.net and Discord hexes are spelled with uppercase letters
// (`0074E0`, `5865F2`) at some historical call sites even though the
// constants module normalises them to lowercase, and a future reintroduction
// might use either case. The pattern is deliberately NOT right-anchored: the
// six-digit form must also match when it appears as a prefix of an
// eight-digit hex-plus-alpha form (e.g. `#1eff0050`, `#a335ee80`), which is
// exactly the shape four of the landing sites use, so those cannot slip back
// in unnoticed.
//
// Code/comment limitation (disclosed, not hidden): `matchesIn` tests each
// line as plain text and draws no distinction between code and a comment.
// This is exactly why `AccentColorContext.tsx:14`'s comment -- which used to
// spell `#1eff00` in prose even though that line's actual code value is a
// different, darkened green (`#15b300`) that is not one of the five -- was
// REWORDED during 10-05 Task 1 rather than excluded from this guard's scan.
// A line-based guard cannot tell "this hex is in a comment, not code" apart
// from a real reintroduction, so the source line itself had to stop
// spelling the literal.
//
// Scope limit (disclosed, not hidden): this guard covers exactly the five
// values named below -- WoW Epic purple, WoW Uncommon green, and the
// Battle.net/Discord/Warcraft-Logs brand blues/orange. The remaining WoW
// quality tiers (Legendary, Rare, Artifact, Heirloom -- see
// `AccentColorContext.tsx`'s `ACCENT_COLORS` and
// `ParallaxItem.tsx`'s `qualityColors` map, both deliberately left
// uncentralized by D-14), the semantic class-colour palette guarded by
// `__tests__/token-palette-literals.test.ts`, and every other colour literal
// in the tree pass this guard untouched. A green result here must not be
// read as "no hard-coded colour remains in this codebase".

const ALL_FIVE_VALUES = { ...QUALITY_COLORS, ...BRAND_COLORS }

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Strip the leading '#' from each constant and re-add it in the pattern so
// the alternation is built from the module's own values verbatim, then
// deliberately omit any trailing boundary so the six-digit form still
// matches when embedded inside an eight-digit hex-plus-alpha form.
const HEX_ALTERNATION = Object.values(ALL_FIVE_VALUES)
  .map((hex) => escapeRegExp(hex.replace(/^#/, '')))
  .join('|')

const FIVE_HEX_VALUES_PATTERN = new RegExp(`#(?:${HEX_ALTERNATION})`, 'i')

// Scan roots match ROADMAP success criterion 3's own grep scope and
// REQUIREMENTS.md's COLOR-05 wording: `app` and `components`, with no
// directory exclusion and no landing carve-out.
const SCAN_ROOTS = ['app', 'components']

const scannedFiles = () => sourceFiles(SCAN_ROOTS)

describe('quality/brand colour literal guard (COLOR-05)', () => {
  it('finds no raw spelling of the five quality/brand hex values anywhere under app/ or components/, in any letter case, including inside an eight-digit hex-plus-alpha form', () => {
    const matches = matchesIn(scannedFiles(), FIVE_HEX_VALUES_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['components/ui/this-file-does-not-exist.tsx'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
