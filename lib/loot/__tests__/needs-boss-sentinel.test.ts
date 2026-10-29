// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { NEED_BOSS_NAME } from '@/domain/loot/needs'
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { getBossImage, getBossPortrait } from '@/utils/bossImages'
import { getBossQuote } from '@/data/boss-quotes'
import { CATALOG_GROUP_LABELS, RAID_INSTANCE_NAMES } from '@/data/raid-catalog-names'

/**
 * The 'Needs' boss sentinel (D-13, D-16, DISC-06). Research A4 gave every need
 * row boss_name 'Needs' so each boss_name-typed component keeps working
 * without a new column. Research also proposed adding 'Needs' to
 * CATALOG_GROUP_LABELS; the planner dropped that because
 * guild-scoped-lookup-catalog.test.ts requires every label to be used by a
 * legacy catalog. This file is the replacement guard: it runs the sentinel
 * through every helper that keys on a boss name, and lists every file that
 * names boss_name or bossName with how it treats 'Needs'. A new boss_name
 * file fails CI until it is listed.
 *
 * Dispositions:
 *   order       sorts or groups by getBossOrder or normalizeBossName; 'Needs'
 *               sorts last (999)
 *   lookup      calls getBossImage, getBossPortrait or getBossQuote; all three
 *               return null for 'Needs', so the caller's fallback renders
 *   items-only  never sees a need row: the file holds an item-only filter, or
 *               `via` names the file that does
 *   catalog     legacy catalog or addon payload boss names; a need row never
 *               takes this path
 *   display     shows the boss name as plain text
 *   type        field declaration
 *   writer      writes legacy item rows with real boss names
 *   source      defines the sentinel
 */

const REPO_ROOT = path.resolve(__dirname, '../../..')
const BOSS_ROOTS = ['app', 'lib', 'domain', 'utils', 'data'] as const
const EXCLUDED_FILES = new Set(['lib/database.types.ts'])

type BossNameDisposition =
  | 'order'
  | 'lookup'
  | 'items-only'
  | 'catalog'
  | 'display'
  | 'type'
  | 'writer'
  | 'source'

interface BossNameReader {
  file: string
  dispositions: readonly BossNameDisposition[]
  /** For 'items-only' files without a filter of their own: the file that feeds them. */
  via?: string
  note: string
}

export const BOSS_NAME_PATTERN = /\bboss_name\b|\bbossName\b/
export const MIN_BOSS_NAME_FILES = 45
const ORDER_MARKER = /getBossOrder\(|normalizeBossName\(/
const LOOKUP_MARKER = /getBoss(Image|Portrait|Quote)\(/
// Mirrors the 'exclude' marker in need-reader-inventory.test.ts; the two test
// files do not import each other, so a change to one means editing both.
const EXCLUDE_MARKER =
  /\.eq\(\s*['"]kind['"]\s*,\s*['"]item['"]\s*\)|\.eq\(\s*['"]list_mode['"]\s*,\s*['"]known['"]\s*\)|isNeedRow\(/
const SKIP_DIRS = new Set(['__tests__', 'node_modules', 'out', 'release', 'dist', 'build', '.next'])
const TEST_FILE = /\.test\.(m?[jt]sx?|cjs)$/

// Sorted by file.
export const BOSS_NAME_READERS: readonly BossNameReader[] = [
  {
    file: 'app/(app)/loot-list/components/LootListContent.tsx',
    dispositions: ['order'],
    note: 'groups the raider\'s list with normalizeBossName; rows come from fetchFilteredLootItems, items only until Phase 4',
  },
  {
    file: 'app/(app)/loot-management/components/ItemRow.tsx',
    dispositions: ['items-only'],
    via: 'app/(app)/loot-management/components/LootSettingsContent.tsx',
    note: 'fed by the officer classification editor, which lists items only',
  },
  {
    file: 'app/(app)/loot-management/components/LootSettingsContent.tsx',
    dispositions: ['items-only'],
    note: 'own kind filter (03-07)',
  },
  {
    file: 'app/(app)/loot-management/components/PriorityListTab.tsx',
    dispositions: ['order', 'lookup', 'items-only'],
    note: 'own kind filter (03-07)',
  },
  {
    file: 'app/(app)/loot-management/components/types.ts',
    dispositions: ['type'],
    note: 'field declaration',
  },
  {
    file: 'app/(app)/loot-submissions/components/LootSubmissionsContent.tsx',
    dispositions: ['display'],
    note: 'shows \'Needs\' as plain text in officer review',
  },
  {
    file: 'app/(app)/master-loot/_client.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/(app)/master-sheet/components/BossSection.tsx',
    dispositions: ['lookup'],
    note: 'getBossImage(\'Needs\') is null, so the header shows its fallback; the Needs group render is tested in 03-10',
  },
  {
    file: 'app/(app)/master-sheet/components/ItemCandidateModal.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/(app)/master-sheet/components/MasterSheetContent.tsx',
    dispositions: ['order', 'lookup'],
    note: '\'Needs\' sorts last (999)',
  },
  {
    file: 'app/(app)/master-sheet/components/RaidModeView.tsx',
    dispositions: ['display'],
    note: 'search guarded with `?? \'\'`, tested in 03-10',
  },
  {
    file: 'app/(app)/master-sheet/components/VirtualizedMasterSheet.tsx',
    dispositions: ['order'],
    note: 'sorts groups through getBossOrder',
  },
  {
    file: 'app/(app)/overview/components/DashboardContent.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/(app)/raid-tracking/_client.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/(app)/raid-tracking/components/LootHistoryTab.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/(app)/raid-tracking/components/LootItemSelectionModal.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/(app)/raid-tracking/components/PlayerLootModal.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/(app)/raid-tracking/components/types.ts',
    dispositions: ['type'],
    note: 'field declaration',
  },
  {
    file: 'app/(app)/raid-tracking/import/_client.tsx',
    dispositions: ['writer'],
    note: 'CSV item rows carry real boss names',
  },
  {
    file: 'app/(app)/reserve/components/CreateReserveRunModal.tsx',
    dispositions: ['items-only'],
    via: 'app/api/reserve-runs/items/route.ts',
    note: 'reserve item list comes from the item-only public list',
  },
  {
    file: 'app/(app)/reserve/runs/[id]/_client.tsx',
    dispositions: ['items-only'],
    via: 'app/api/reserve-runs/[id]/route.ts',
    note: 'run items come from the item-only run route',
  },
  {
    file: 'app/api/addon/attendance/route.ts',
    dispositions: ['catalog'],
    note: 'boss name comes from the addon session payload',
  },
  {
    file: 'app/api/addon/export-string/route.ts',
    dispositions: ['items-only'],
    note: 'own isNeedRow flatten filter (03-06)',
  },
  {
    file: 'app/api/addon/guild-data/route.ts',
    dispositions: ['items-only'],
    note: 'own kind filter (03-06)',
  },
  {
    file: 'app/api/addon/import-string/route.ts',
    dispositions: ['catalog'],
    note: 'the addon\'s boss name only steers resolveGuildLootItem among rows matched by wowhead_id, which a need never has (03-18)',
  },
  {
    file: 'app/api/addon/loot-award/route.ts',
    dispositions: ['catalog'],
    note: 'same as import-string',
  },
  {
    file: 'app/api/loot-history/route.ts',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/api/prio-list/route.ts',
    dispositions: ['display'],
    note: 'embed select only',
  },
  {
    file: 'app/api/reserve-runs/[id]/route.ts',
    dispositions: ['items-only'],
    note: 'own kind filter (03-08)',
  },
  {
    file: 'app/api/reserve-runs/items/route.ts',
    dispositions: ['items-only'],
    note: 'own kind filter (03-08)',
  },
  {
    file: 'app/api/reserve-runs/join/[token]/route.ts',
    dispositions: ['items-only'],
    note: 'own kind filter (03-08)',
  },
  {
    file: 'app/components/LootListSummaryView.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/components/PrioListItemModal.tsx',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'app/components/ReserveItemPicker.tsx',
    dispositions: ['order'],
    note: 'reserve lists are items only (03-08)',
  },
  {
    file: 'app/components/SearchableItemSelect.tsx',
    dispositions: ['order'],
    note: 'sorts groups through getBossOrder',
  },
  {
    file: 'app/hooks/use-api.ts',
    dispositions: ['type'],
    note: 'field declaration',
  },
  {
    file: 'app/reserve/join/[token]/page.tsx',
    dispositions: ['items-only'],
    via: 'app/api/reserve-runs/join/[token]/route.ts',
    note: 'join list comes from the item-only join route',
  },
  {
    file: 'app/services/expansionSeeder.ts',
    dispositions: ['writer'],
    note: 'legacy catalog boss names, golden-pinned',
  },
  {
    file: 'data/boss-quotes.ts',
    dispositions: ['lookup'],
    note: 'defines getBossQuote',
  },
  {
    file: 'data/raid-catalog-names.ts',
    dispositions: ['catalog'],
    note: 'defines CATALOG_GROUP_LABELS; \'Needs\' deliberately absent',
  },
  {
    file: 'data/tbc-raids.ts',
    dispositions: ['writer'],
    note: 'catalog source the legacy seeder writes',
  },
  {
    file: 'domain/loot/needs.ts',
    dispositions: ['source'],
    note: 'defines NEED_BOSS_NAME',
  },
  {
    file: 'lib/addon/award-session.ts',
    dispositions: ['catalog'],
    note: 'addon session boss name',
  },
  {
    file: 'lib/loot-items-query.ts',
    dispositions: ['items-only'],
    note: 'own kind filter (03-07)',
  },
  {
    file: 'lib/loot/guild-scoped-lookup.ts',
    dispositions: ['catalog'],
    note: 'boss-tier rule runs only on rows matched by wowhead_id; need case in 03-18',
  },
  {
    file: 'lib/loot/loot-history-rows.ts',
    dispositions: ['display'],
    note: 'award notes text from the request\'s boss name',
  },
  {
    file: 'lib/loot/master-sheet-summary.ts',
    dispositions: ['display'],
    note: 'plain text',
  },
  {
    file: 'lib/loot/tier-need-rows.ts',
    dispositions: ['display'],
    note: 'selects need rows, whose boss_name is always \'Needs\'',
  },
  {
    file: 'utils/bossImages.ts',
    dispositions: ['lookup'],
    note: 'defines getBossImage and getBossPortrait',
  },
  {
    file: 'utils/bossOrder.ts',
    dispositions: ['order'],
    note: 'defines getBossOrder and normalizeBossName',
  },
]

/** Every .ts and .tsx file under the roots that names boss_name or bossName. */
export function findBossNameFiles(roots: readonly string[], baseDir: string = REPO_ROOT): string[] {
  const found: string[] = []
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(full)
        continue
      }
      if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.endsWith('.d.ts') || TEST_FILE.test(entry.name)) {
        continue
      }
      const relative = path.relative(baseDir, full).split(path.sep).join('/')
      if (EXCLUDED_FILES.has(relative)) continue
      if (BOSS_NAME_PATTERN.test(fs.readFileSync(full, 'utf8'))) found.push(relative)
    }
  }
  for (const root of roots) {
    if (fs.existsSync(path.join(baseDir, root))) visit(path.join(baseDir, root))
  }
  return found.sort()
}

/** Reports each disposition whose route to the boss helpers, or to an item-only source, is missing. */
export function findBossMarkerProblems(
  entries: readonly BossNameReader[],
  readSource: (file: string) => string,
): string[] {
  const problems: string[] = []
  for (const entry of entries) {
    const source = readSource(entry.file)
    if (entry.dispositions.includes('order') && !ORDER_MARKER.test(source)) {
      problems.push(`${entry.file}: 'order' but it calls neither getBossOrder nor normalizeBossName`)
    }
    if (entry.dispositions.includes('lookup') && !LOOKUP_MARKER.test(source)) {
      problems.push(`${entry.file}: 'lookup' but it calls none of getBossImage, getBossPortrait, getBossQuote`)
    }
    if (entry.dispositions.includes('items-only') && !EXCLUDE_MARKER.test(source)) {
      if (!entry.via) {
        problems.push(`${entry.file}: 'items-only' with no item-only filter and no via`)
      } else if (!EXCLUDE_MARKER.test(readSource(entry.via))) {
        problems.push(`${entry.file}: 'items-only' via ${entry.via}, which has no item-only filter`)
      }
    }
  }
  return problems
}

const readRepoFile = (file: string) => fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')
const bossNameFiles = findBossNameFiles(BOSS_ROOTS)

describe("the 'Needs' sentinel through every boss_name helper (D-13)", () => {
  it("is 'Needs'", () => {
    expect(NEED_BOSS_NAME).toBe('Needs')
  })

  it('sorts last: 999, above every group label order', () => {
    expect(getBossOrder(NEED_BOSS_NAME)).toBe(999)
    for (const label of ['Crafting Materials', 'Trash', 'Shared Boss Loot', 'Tier 3 Tokens']) {
      expect(getBossOrder(NEED_BOSS_NAME), label).toBeGreaterThan(getBossOrder(label))
    }
    expect(['Needs', 'Trash', 'Onyxia'].sort((a, b) => getBossOrder(a) - getBossOrder(b)).at(-1)).toBe(
      'Needs',
    )
  })

  it('is left unchanged by normalizeBossName', () => {
    expect(normalizeBossName(NEED_BOSS_NAME)).toBe('Needs')
  })

  it('matches no boss image, portrait or quote', () => {
    expect(getBossImage(NEED_BOSS_NAME)).toBeNull()
    expect(getBossPortrait(NEED_BOSS_NAME)).toBeNull()
    expect(getBossQuote(NEED_BOSS_NAME)).toBeNull()
  })

  it("is not a catalog group label or a raid instance name (the label list stays as the catalogs use it)", () => {
    expect(CATALOG_GROUP_LABELS).not.toContain(NEED_BOSS_NAME)
    expect(Object.keys(RAID_INSTANCE_NAMES)).not.toContain(NEED_BOSS_NAME)
    expect(Object.values(RAID_INSTANCE_NAMES).flat()).not.toContain(NEED_BOSS_NAME)
  })
})

describe('boss_name reader inventory (D-16)', () => {
  it(`finds at least ${MIN_BOSS_NAME_FILES} files that name boss_name or bossName`, () => {
    expect(bossNameFiles.length).toBeGreaterThanOrEqual(MIN_BOSS_NAME_FILES)
  })

  it('lists every such file, and names only files that still name a boss', () => {
    const listed = new Set(BOSS_NAME_READERS.map((entry) => entry.file))
    const found = new Set(bossNameFiles)
    const missing = bossNameFiles.filter((file) => !listed.has(file))
    const stale = [...listed].filter((file) => !found.has(file))
    expect(missing, `boss_name files missing from BOSS_NAME_READERS:\n${missing.join('\n')}`).toEqual([])
    expect(stale, `stale BOSS_NAME_READERS entries:\n${stale.join('\n')}`).toEqual([])
  })

  it('keeps BOSS_NAME_READERS sorted with a disposition and a note on every entry', () => {
    const files = BOSS_NAME_READERS.map((entry) => entry.file)
    expect(files).toEqual([...files].sort())
    expect(new Set(files).size).toBe(files.length)
    expect(
      BOSS_NAME_READERS.filter((entry) => entry.dispositions.length === 0 || entry.note.trim() === ''),
    ).toEqual([])
  })

  it("holds each disposition's marker: order and lookup reach the helpers, items-only reaches an item-only filter", () => {
    expect(findBossMarkerProblems(BOSS_NAME_READERS, readRepoFile)).toEqual([])
  })

  it("reports an 'items-only' synthetic entry with no marker and an unfiltered via (synthetic self-check)", () => {
    const sources: Record<string, string> = {
      'synthetic/own.ts': "supabase.from('loot_items').select('boss_name').eq('kind', 'item')",
      'synthetic/feeder-ok.ts': "if (!isNeedRow(row)) rows.push(row)",
      'synthetic/feeder-bad.ts': "supabase.from('loot_items').select('boss_name')",
      'synthetic/bare.ts': 'const boss_name = row.boss_name',
    }
    const read = (file: string) => sources[file]
    const entry = (file: string, via?: string): BossNameReader => ({
      file,
      dispositions: ['items-only'],
      via,
      note: 'synthetic',
    })
    expect(findBossMarkerProblems([entry('synthetic/own.ts')], read)).toEqual([])
    expect(findBossMarkerProblems([entry('synthetic/bare.ts', 'synthetic/feeder-ok.ts')], read)).toEqual([])
    expect(findBossMarkerProblems([entry('synthetic/bare.ts')], read)).toHaveLength(1)
    expect(findBossMarkerProblems([entry('synthetic/bare.ts', 'synthetic/feeder-bad.ts')], read)).toHaveLength(1)
  })

  it("reports an 'order' or 'lookup' synthetic entry that reaches no helper (synthetic self-check)", () => {
    const read = () => 'const name = row.boss_name'
    const problems = findBossMarkerProblems(
      [
        { file: 'synthetic/order.ts', dispositions: ['order'], note: 'synthetic' },
        { file: 'synthetic/lookup.ts', dispositions: ['lookup'], note: 'synthetic' },
      ],
      read,
    )
    expect(problems).toHaveLength(2)
  })
})
