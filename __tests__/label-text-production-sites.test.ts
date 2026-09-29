import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn } from './design-tokens/source-files'

// Regression suite for PRIM-02 (Plan 08-05): the 29 production `LabelText`
// call sites named in RESEARCH.md's Runtime State Inventory have been
// migrated to `Text size="sm" weight="semibold" color="secondary"`. This
// file asserts zero `LabelText` occurrences remain across exactly the 7
// production files this plan touched.
//
// Scope note: this test's scope is these 7 production files only. The
// design-system docs page (`app/(app)/design-system/_client.tsx`, 26 sites)
// and `app/components/Sidebar.tsx` (4 hand-rolled sites) still carry
// `LabelText`/the uppercase convention at this point in the phase — a
// full-repo, all-conventions-clean assertion is a later plan's job once
// those and the primitive deletion land.
const PRODUCTION_FILES = [
  'app/(app)/sheet-import/_client.tsx',
  'app/(app)/reserve/runs/[id]/_client.tsx',
  'app/(app)/admin/addon/_client.tsx',
  'app/(app)/raid-teams/_client.tsx',
  'app/(app)/loot-list/components/LootListContent.tsx',
  'app/reserve/join/[token]/components/InlineSettingsEditor.tsx',
  'app/reserve/join/[token]/page.tsx',
].map((relativePath) => path.resolve(process.cwd(), relativePath))

describe('LabelText production sites migration (PRIM-02, plan 08-05)', () => {
  it('finds no LabelText occurrence across the 7 migrated production files', () => {
    const matches = matchesIn(PRODUCTION_FILES, /LabelText/)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })
})
