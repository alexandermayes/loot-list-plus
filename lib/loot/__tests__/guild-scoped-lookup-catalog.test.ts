// @vitest-environment node
// GH #307: every item the raid catalogs list in more than one raid must
// resolve to the raid it dropped in, from the live boss or instance name an
// addon export carries. Mirrors how app/services/expansionSeeder.ts seeds a
// guild (tier name = raid name, loot_items.boss_name = boss name): one
// expansion, one raid_tiers row per catalog raid, one loot_items row per
// catalog row. The droppers, the group-label test and the instance names
// are all read from data/raid-catalog-names.ts, so a catalog change that
// adds, removes or makes undecidable a multi-tier item, or adds a repeated
// boss label without listing it as a group, fails here until reviewed.
import { describe, it, expect } from 'vitest'
import { classicRaids } from '@/data/classic-wow-raids'
import { tbcRaids } from '@/data/tbc-raids'
import { wrathRaids } from '@/data/wrath-raids'
import { cataRaids } from '@/data/cata-raids'
import { mopRaids } from '@/data/mop-raids'
import { CATALOG_GROUP_LABELS, RAID_INSTANCE_NAMES } from '@/data/raid-catalog-names'
import { resolveGuildLootItem, normalizeCatalogName } from '../guild-scoped-lookup'

interface CatalogRaid {
  name: string
  bosses: Array<{ name: string; items: Array<{ name: string; slot: string; wowhead_id: number }> }>
}

interface CatalogSpec {
  catalog: string
  raids: CatalogRaid[]
  ids: number[]
  bossCases: number
  instanceCases: number
  aliasCases: number
  cachedFallback: number
  cachedBoss: number
}

const CATALOGS: CatalogSpec[] = [
  {
    catalog: 'classic',
    raids: classicRaids as CatalogRaid[],
    ids: [20727, 20728, 20729, 20730, 20731, 20734, 20736],
    bossCases: 105,
    instanceCases: 14,
    aliasCases: 7,
    cachedFallback: 14,
    cachedBoss: 0,
  },
  {
    catalog: 'tbc',
    raids: tbcRaids as CatalogRaid[],
    ids: [30183, 32428, 32736, 32739, 32745, 32746, 32748, 32751, 32752, 32755],
    bossCases: 136,
    instanceCases: 20,
    aliasCases: 11,
    cachedFallback: 20,
    cachedBoss: 0,
  },
  {
    catalog: 'wrath',
    raids: wrathRaids as CatalogRaid[],
    ids: [],
    bossCases: 0,
    instanceCases: 0,
    aliasCases: 0,
    cachedFallback: 0,
    cachedBoss: 0,
  },
  {
    catalog: 'cata',
    raids: cataRaids as CatalogRaid[],
    ids: [63682, 63683, 63684, 64314, 64315, 64316, 65000, 65001, 65002, 65087, 65088, 65089],
    bossCases: 24,
    instanceCases: 24,
    aliasCases: 0,
    cachedFallback: 0,
    cachedBoss: 24,
  },
  {
    catalog: 'mop',
    raids: mopRaids as CatalogRaid[],
    ids: [],
    bossCases: 0,
    instanceCases: 0,
    aliasCases: 0,
    cachedFallback: 0,
    cachedBoss: 0,
  },
]

const TIER_ORDERS = ['forward', 'reverse'] as const
type TierOrder = (typeof TIER_ORDERS)[number]

/** True when label is one of data/raid-catalog-names.ts's CATALOG_GROUP_LABELS. */
function isGroup(label: string | null): boolean {
  const normalized = normalizeCatalogName(label)
  if (normalized === null) return false
  return CATALOG_GROUP_LABELS.some(group => normalizeCatalogName(group) === normalized)
}

/** wowhead_id -> every (raid, boss) catalog row it appears under. */
function indexById(raids: CatalogRaid[]): Map<number, Array<{ raid: string; boss: string }>> {
  const byId = new Map<number, Array<{ raid: string; boss: string }>>()
  for (const raid of raids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        if (!byId.has(item.wowhead_id)) byId.set(item.wowhead_id, [])
        byId.get(item.wowhead_id)!.push({ raid: raid.name, boss: boss.name })
      }
    }
  }
  return byId
}

/** ids whose rows span two or more of this catalog's raids. */
function multiTier(raids: CatalogRaid[]): Array<[number, Array<{ raid: string; boss: string }>]> {
  return [...indexById(raids)].filter(([, hits]) => new Set(hits.map(h => h.raid)).size > 1)
}

/** "Droppers" of a (raid, boss) hit (GH #307 D-05): the row's boss when it
 * is not a group label, else every boss of that raid that is not a group
 * label. */
function droppersOf(raid: CatalogRaid, boss: string): string[] {
  return isGroup(boss) ? raid.bosses.map(b => b.name).filter(name => !isGroup(name)) : [boss]
}

interface FakeTier {
  id: string
  expansion_id: string
  name: string
}
interface FakeItem {
  id: string
  name: string
  raid_tier_id: string
  wowhead_id: number
  boss_name: string
}

/** Seeds one expansion with one raid_tiers row per catalog raid (tier name
 * = raid name) and one loot_items row per catalog row (boss_name = boss
 * name), the way app/services/expansionSeeder.ts seeds a guild. Tier ids
 * run low-to-high in catalog order ('forward') or high-to-low ('reverse'),
 * so a right answer can never come from the lowest-id fallback alone. */
function seed(raids: CatalogRaid[], order: TierOrder) {
  const tiers: FakeTier[] = raids.map((raid, i) => ({
    id: `t${String(order === 'forward' ? i : 99 - i).padStart(2, '0')}`,
    expansion_id: 'exp',
    name: raid.name,
  }))
  const tierIdByRaidName = new Map(raids.map((raid, i) => [raid.name, tiers[i].id]))
  const items: FakeItem[] = raids.flatMap((raid, i) =>
    raid.bosses.flatMap(boss =>
      boss.items.map((item, j) => ({
        id: `${tiers[i].id}-${boss.name}-${j}`,
        name: item.name,
        raid_tier_id: tiers[i].id,
        wowhead_id: item.wowhead_id,
        boss_name: boss.name,
      }))
    )
  )
  return { tiers, items, tierIdByRaidName }
}

/** Fake client in the style of makeClient in guild-scoped-lookup.test.ts:
 * expansions, raid_tiers, guilds single with active_expansion_id 'exp',
 * loot_items filtered by raid_tier_id in and optional wowhead_id eq. */
function makeClient(tiers: FakeTier[], items: FakeItem[]) {
  return {
    from(table: string) {
      const filters: Array<[string, unknown]> = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          filters.push([col, val])
          return builder
        },
        in: (col: string, val: unknown) => {
          filters.push([col, val])
          return builder
        },
        single: () => {
          if (table !== 'guilds') return Promise.resolve({ data: null, error: null })
          return Promise.resolve({ data: { active_expansion_id: 'exp' }, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'expansions') return Promise.resolve({ data: [{ id: 'exp' }], error: null }).then(resolve)
          if (table === 'raid_tiers') return Promise.resolve({ data: tiers, error: null }).then(resolve)
          if (table === 'loot_items') {
            const tierIdsFilter = filters.find(([col]) => col === 'raid_tier_id')?.[1] as string[] | undefined
            const wowheadFilter = filters.find(([col]) => col === 'wowhead_id')
            const rows = items.filter(item => {
              if (!(tierIdsFilter ?? []).includes(item.raid_tier_id)) return false
              if (wowheadFilter && item.wowhead_id !== wowheadFilter[1]) return false
              return true
            })
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
}

describe.each(CATALOGS)(
  '$catalog catalog multi-tier items (GH #307)',
  ({ raids, ids, bossCases, instanceCases, aliasCases, cachedFallback, cachedBoss }) => {
    it('T-1: the sorted multi-tier ids match the pinned list', () => {
      const multi = multiTier(raids)
        .map(([id]) => id)
        .sort((a, b) => a - b)
      expect(multi).toEqual([...ids].sort((a, b) => a - b))
    })

    it('T-2: a live boss of the dropping raid resolves to that raid, by boss or boss_tier, in both tier orders', async () => {
      const failures: string[] = []
      const counts: Record<TierOrder, number> = { forward: 0, reverse: 0 }
      for (const order of TIER_ORDERS) {
        const { tiers, items, tierIdByRaidName } = seed(raids, order)
        for (const [id, hits] of multiTier(raids)) {
          for (const hit of hits) {
            const raid = raids.find(r => r.name === hit.raid)!
            const wantTierId = tierIdByRaidName.get(hit.raid)!
            for (const boss of droppersOf(raid, hit.boss)) {
              const client = makeClient(tiers, items)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const result = await resolveGuildLootItem(client as any, 'guild-test', id, { bossName: boss })
              counts[order]++
              const chosenRaid = tiers.find(t => t.id === result?.raid_tier_id)?.name
              const ok =
                result?.raid_tier_id === wantTierId &&
                (result?.matched_by === 'boss' || result?.matched_by === 'boss_tier')
              if (!ok) {
                failures.push(`${order} | ${id} boss ${boss} in ${hit.raid}: ${result?.matched_by} ${chosenRaid}`)
              }
            }
          }
        }
      }
      expect(failures).toEqual([])
      expect(counts.forward).toBe(bossCases)
      expect(counts.reverse).toBe(bossCases)
    })

    it('T-3: the raid catalog name or an in-game instance name resolves to the dropping raid in both tier orders', async () => {
      const failures: string[] = []
      const catalogNameCounts: Record<TierOrder, number> = { forward: 0, reverse: 0 }
      const aliasCounts: Record<TierOrder, number> = { forward: 0, reverse: 0 }
      for (const order of TIER_ORDERS) {
        const { tiers, items, tierIdByRaidName } = seed(raids, order)
        for (const [id, hits] of multiTier(raids)) {
          for (const hit of hits) {
            const wantTierId = tierIdByRaidName.get(hit.raid)!
            const ownAliases = Object.prototype.hasOwnProperty.call(RAID_INSTANCE_NAMES, hit.raid)
              ? RAID_INSTANCE_NAMES[hit.raid]
              : []
            const names = [hit.raid, ...ownAliases]
            for (const instanceName of names) {
              const client = makeClient(tiers, items)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const result = await resolveGuildLootItem(client as any, 'guild-test', id, {
                bossName: null,
                raidName: instanceName,
              })
              if (instanceName === hit.raid) catalogNameCounts[order]++
              else aliasCounts[order]++
              const chosenRaid = tiers.find(t => t.id === result?.raid_tier_id)?.name
              const ok = result?.raid_tier_id === wantTierId && result?.matched_by === 'raid'
              if (!ok) {
                failures.push(`${order} | ${id} raid ${instanceName} in ${hit.raid}: ${result?.matched_by} ${chosenRaid}`)
              }
            }
          }
        }
      }
      expect(failures).toEqual([])
      expect(catalogNameCounts.forward).toBe(instanceCases)
      expect(catalogNameCounts.reverse).toBe(instanceCases)
      expect(aliasCounts.forward).toBe(aliasCases)
      expect(aliasCounts.reverse).toBe(aliasCases)
    })

    it('T-4: the cached catalog label a companion award receives today (OD-1) resolves per row', async () => {
      const failures: string[] = []
      const fallbackCounts: Record<TierOrder, number> = { forward: 0, reverse: 0 }
      const bossCounts: Record<TierOrder, number> = { forward: 0, reverse: 0 }
      for (const order of TIER_ORDERS) {
        const { tiers, items, tierIdByRaidName } = seed(raids, order)
        for (const [id, hits] of multiTier(raids)) {
          for (const hit of hits) {
            const wantTierId = tierIdByRaidName.get(hit.raid)!
            const client = makeClient(tiers, items)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await resolveGuildLootItem(client as any, 'guild-test', id, { bossName: hit.boss })
            if (isGroup(hit.boss)) {
              fallbackCounts[order]++
              if (result?.matched_by !== 'fallback') {
                failures.push(`${order} | ${id} cached ${hit.boss} in ${hit.raid}: ${result?.matched_by}`)
              }
            } else {
              bossCounts[order]++
              const ok = result?.matched_by === 'boss' && result?.raid_tier_id === wantTierId
              if (!ok) {
                failures.push(`${order} | ${id} cached ${hit.boss} in ${hit.raid}: ${result?.matched_by}`)
              }
            }
          }
        }
      }
      expect(failures).toEqual([])
      expect(fallbackCounts.forward).toBe(cachedFallback)
      expect(fallbackCounts.reverse).toBe(cachedFallback)
      expect(bossCounts.forward).toBe(cachedBoss)
      expect(bossCounts.reverse).toBe(cachedBoss)
    })
  }
)

it('T-5: every boss label repeated across raids of one catalog is a group label, and every group label is used', () => {
  const failures: string[] = []
  const usedGroupLabels = new Set<string>()
  for (const { catalog, raids } of CATALOGS) {
    const bossToRaids = new Map<string, Set<string>>()
    for (const raid of raids) {
      for (const boss of raid.bosses) {
        const normalized = normalizeCatalogName(boss.name)
        if (normalized === null) continue
        if (!bossToRaids.has(normalized)) bossToRaids.set(normalized, new Set())
        bossToRaids.get(normalized)!.add(raid.name)
        if (isGroup(boss.name)) usedGroupLabels.add(normalized)
      }
    }
    for (const [normalized, raidNames] of bossToRaids) {
      if (raidNames.size > 1 && !isGroup(normalized)) {
        failures.push(`${catalog}: ${normalized}`)
      }
    }
  }
  expect(failures).toEqual([])

  const unusedGroupLabels = CATALOG_GROUP_LABELS.map(label => normalizeCatalogName(label)).filter(
    (label): label is string => label !== null && !usedGroupLabels.has(label)
  )
  expect(unusedGroupLabels).toEqual([])
})

it('T-6: RAID_INSTANCE_NAMES keys are catalog raid names with no self or sibling collisions', () => {
  const expectedKeys = [
    "Temple of Ahn'Qiraj",
    'Serpentshrine Cavern',
    'Tempest Keep: The Eye',
    'Hyjal Summit',
    'Sunwell Plateau',
    'Naxxramas (Wrath)',
    'Eye of Eternity',
    'Obsidian Sanctum',
    "Onyxia's Lair (Wrath)",
    'Ruby Sanctum',
  ].sort()
  const keys = Object.keys(RAID_INSTANCE_NAMES).sort()
  expect(keys).toEqual(expectedKeys)

  const failures: string[] = []
  for (const key of Object.keys(RAID_INSTANCE_NAMES)) {
    const owningCatalogs = CATALOGS.filter(({ raids }) => raids.some(raid => raid.name === key))
    if (owningCatalogs.length !== 1) {
      failures.push(`${key}: owned by ${owningCatalogs.length} catalogs`)
      continue
    }
    const { raids } = owningCatalogs[0]
    const normalizedKey = normalizeCatalogName(key)
    for (const instanceName of RAID_INSTANCE_NAMES[key]) {
      const normalizedInstance = normalizeCatalogName(instanceName)
      if (normalizedInstance === normalizedKey) {
        failures.push(`${key}: instance name ${instanceName} normalizes to its own key`)
      }
      for (const raid of raids) {
        if (raid.name !== key && normalizeCatalogName(raid.name) === normalizedInstance) {
          failures.push(`${key}: instance name ${instanceName} collides with raid ${raid.name}`)
        }
      }
    }
  }
  expect(failures).toEqual([])
})
