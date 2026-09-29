import { describe, it, expect } from 'vitest'
import path from 'node:path'
import React from 'react'
import { render } from '@testing-library/react'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
import { StatusBadge } from '@/components/ui/status-badge'

// COLOR-06 (07-05-PLAN.md): the 2026-09-15 audit found 16 Tailwind palette
// colour classes in components/ui/status-badge.tsx's statusConfig map and
// one more in components/ui/alert.tsx's warning variant, the two status
// primitives every submission/attendance badge and every inline alert
// render through. This suite is the executable form of "neither primitive
// ever contains a Tailwind palette colour class again": it fails naming
// the file and line if either primitive, or (from Plan 05 Task 3 onward)
// the three raid-tracking standby call sites, regresses onto a bare
// palette literal instead of a semantic token (--warning, --standby,
// --success, --destructive, --info, --accent, --muted-foreground).
//
// Scope limit (flagged assumption, 07-05-PLAN.md): this guard recognises
// only the spellings below, a Tailwind utility prefix crossed with one of
// the 22 Tailwind palette hue names crossed with a standard numeric shade,
// with an optional variant prefix (hover:, focus:, dark:, and so on) and
// an optional alpha suffix (/NN). A colour introduced by any other
// spelling, a raw hex, an rgb() call, an oklch() call, or an
// arbitrary-value class, passes this guard untouched. Widening it to those
// spellings is Phase 10's work under COLOR-03 through COLOR-07. A green
// result here must not be read as "no hard-coded colour remains in these
// files".

const UTILITY_PREFIXES = [
  'bg',
  'text',
  'border-l',
  'border-r',
  'border-t',
  'border-b',
  'border',
  'ring',
  'from',
  'via',
  'to',
  'fill',
  'stroke',
  'divide',
  'outline',
  'shadow',
  'decoration',
  'placeholder',
  'caret',
  'accent',
]

const PALETTE_HUES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]

const STANDARD_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

const PALETTE_CLASS_PATTERN = new RegExp(
  `\\b(?:[a-z-]+:)?(?:${UTILITY_PREFIXES.join('|')})-(?:${PALETTE_HUES.join('|')})-(?:${STANDARD_SHADES.join('|')})(?:\\/\\d{1,3})?\\b`
)

// Explicit file list, not a directory scan: the rest of the raid-tracking
// tree (and the rest of the codebase) still carries literals owned by
// Phase 10, and a directory scan would go red on work this phase is not
// doing.
const SCANNED_PATHS = [
  'components/ui/status-badge.tsx',
  'components/ui/alert.tsx',
  'app/(app)/raid-tracking/components/cell-state.ts',
  'app/(app)/raid-tracking/components/RaidMemberList.tsx',
  'app/(app)/raid-tracking/_client.tsx',
]

const scannedFiles = () => SCANNED_PATHS.map((f) => path.resolve(process.cwd(), f))

describe('palette-literal guard (COLOR-06)', () => {
  it('finds no Tailwind palette colour class in the scanned primitives', () => {
    const matches = matchesIn(scannedFiles(), PALETTE_CLASS_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['components/ui/this-file-does-not-exist.tsx'])).toThrowError(
      /this-file-does-not-exist/
    )
  })

  it('renders pending and needs_revision with different class strings and unchanged labels, so the two neighbouring ambers stay distinguishable', () => {
    const pending = render(React.createElement(StatusBadge, { status: 'pending' }))
    const needsRevision = render(React.createElement(StatusBadge, { status: 'needs_revision' }))

    const pendingBadge = pending.container.querySelector('[class]')
    const needsRevisionBadge = needsRevision.container.querySelector('[class]')

    expect(pendingBadge?.className).not.toEqual(needsRevisionBadge?.className)
    expect(pending.getByText('Pending')).toBeInTheDocument()
    expect(needsRevision.getByText('Needs Revision')).toBeInTheDocument()

    pending.unmount()
    needsRevision.unmount()
  })
})
