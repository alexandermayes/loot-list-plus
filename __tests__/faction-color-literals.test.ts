import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// COLOR-04 (10-01-PLAN.md): the faction toggle in GuildSettingsContent.tsx
// was migrated off Tailwind's blue/red palette classes and off raw
// rgb()/rgba() triplets onto the --alliance/--horde custom properties (D-09,
// D-10, D-11). This suite is the executable form of "the faction region of
// this file never regresses onto a hard-coded colour again": it fails
// naming the file and line if either mechanism returns.
//
// The file is scanned as a whole rather than by line range because line
// numbers drift as the file is edited by later, unrelated changes.
//
// Scope limit (disclosed, not hidden): this guard recognises exactly two
// mechanisms -- a Tailwind blue/red palette utility class (any standard
// shade, any variant prefix, any alpha suffix) and a numeric rgb()/rgba()
// call. A faction colour introduced by a raw hex literal or by an
// oklch()/hsl() call with numeric arguments would pass this guard
// untouched. A green result here must not be read as "no hard-coded colour
// remains in this file" -- only that these two specific mechanisms are
// absent.

const UTILITY_PREFIXES = ['bg', 'text', 'border', 'ring', 'group-hover:text', 'group-hover:border']

const FACTION_HUES = ['blue', 'red']

const STANDARD_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

const PALETTE_CLASS_PATTERN = new RegExp(
  `\\b(?:[a-z-]+:)?(?:${UTILITY_PREFIXES.join('|')})-(?:${FACTION_HUES.join('|')})-(?:${STANDARD_SHADES.join('|')})(?:\\/\\d{1,3})?\\b`
)

const RGB_FUNCTION_PATTERN = /\brgba?\(\s*\d/

// Explicit file list, not a directory scan: COLOR-04 owns only the faction
// toggle in this one file. A directory scan would go red on faction-adjacent
// literals elsewhere in the tree that this phase's other tracks own.
const SCANNED_PATHS = ['app/(app)/guild-settings/components/GuildSettingsContent.tsx']

const scannedFiles = () => SCANNED_PATHS.map((f) => path.resolve(process.cwd(), f))

describe('faction-color-literal guard (COLOR-04)', () => {
  it('finds no Tailwind blue/red palette colour class in the faction toggle', () => {
    const matches = matchesIn(scannedFiles(), PALETTE_CLASS_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('finds no numeric rgb()/rgba() call in the faction toggle', () => {
    const matches = matchesIn(scannedFiles(), RGB_FUNCTION_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['components/ui/this-file-does-not-exist.tsx'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
