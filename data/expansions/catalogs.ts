/**
 * Server-only expansion catalogs: one adapter per expansion, resolved by the
 * stored expansions.name through the registry's keys.
 *
 * Do not import this file from client code. It loads all five legacy raid
 * catalogs and their classification and role maps at import, which is why the
 * Forever sync lives in a sibling service and the client-safe registry lives
 * in registry.ts.
 *
 * The five legacy adapters are frozen by the golden files in
 * app/services/__tests__/__golden__ until those catalogs become manifests:
 * the name lookups keep their `|| 'Unlimited'` and `|| []` defaults exactly,
 * with no own-property check, because changing that could change a seeded row.
 * Forever is the one native catalog: its raids come from FOREVER_MANIFEST and
 * carry no loot items.
 */
import { classicRaids } from '@/data/classic-wow-raids'
import { tbcRaids } from '@/data/tbc-raids'
import { wrathRaids } from '@/data/wrath-raids'
import { cataRaids } from '@/data/cata-raids'
import { mopRaids } from '@/data/mop-raids'
import { ITEM_CLASSIFICATIONS } from '@/data/classic-wow-item-classifications'
import { TBC_ITEM_CLASSIFICATIONS } from '@/data/tbc-item-classifications'
import { WOTLK_ITEM_CLASSIFICATIONS } from '@/data/wrath-item-classifications'
import { CATA_ITEM_CLASSIFICATIONS } from '@/data/cata-item-classifications'
import { MOP_ITEM_CLASSIFICATIONS } from '@/data/mop-item-classifications'
import { CLASSIC_ITEM_ROLES } from '@/data/classic-item-roles'
import { TBC_ITEM_ROLES } from '@/data/tbc-item-roles'
import { WOTLK_ITEM_ROLES } from '@/data/wrath-item-roles'
import { CATA_ITEM_ROLES } from '@/data/cata-item-roles'
import { MOP_ITEM_ROLES } from '@/data/mop-item-roles'
import { getRaidPhase } from '@/data/expansion-phases'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import type {
  BossDefinition,
  ExpansionCatalog,
  ItemClassification,
  ItemRole,
  LegacyCatalog,
  LootItemDefinition,
  NativeCatalog,
  RaidDefinition,
} from '@/data/expansions/types'

export type {
  BossDefinition,
  ExpansionCatalog,
  ItemClassification,
  ItemRole,
  LegacyCatalog,
  LootItemDefinition,
  NativeCatalog,
  RaidDefinition,
}

// The shape every static raid file shares (data/*-raids.ts each declare their
// own identical Raid interface).
interface StaticRaid {
  name: string
  bosses: ReadonlyArray<{
    name: string
    items: ReadonlyArray<{ name: string; slot: string; wowhead_id: number }>
  }>
}

/**
 * Transform a static raid file into the format the seeder inserts. The first
 * raid is marked active by default (Molten Core, Karazhan, Naxxramas, and so
 * on); phases come from the slug's phase list.
 */
function transformRaids(slug: string, raids: readonly StaticRaid[]): RaidDefinition[] {
  return raids.map((raid, index) => ({
    name: raid.name,
    isActive: index === 0,
    phase: getRaidPhase(slug, raid.name),
    bosses: raid.bosses.map(boss => ({
      name: boss.name,
      lootItems: boss.items.map(item => ({
        name: item.name,
        slot: item.slot,
        wowheadId: item.wowhead_id.toString()
      }))
    }))
  }))
}

function legacyCatalog(
  slug: string,
  raids: readonly StaticRaid[],
  classifications: Record<string, ItemClassification>,
  roles: Record<string, ItemRole[]>
): LegacyCatalog {
  return {
    kind: 'legacy',
    raids: transformRaids(slug, raids),
    classify: (itemName) => classifications[itemName] || 'Unlimited',
    // Items without an explicit mapping default to an empty array (available to all specs)
    rolesFor: (itemName) => roles[itemName] || [],
  }
}

// Forever tiers are written by the sync service; bosses are manifest-only and
// seed no loot rows (D-01).
function foreverCatalog(): NativeCatalog {
  return {
    kind: 'native',
    raids: FOREVER_MANIFEST.raids.map((raid, index) => ({
      name: raid.name,
      isActive: index === 0,
      phase: getRaidPhase(FOREVER_MANIFEST.slug, raid.name),
      bosses: raid.bosses.map(boss => ({ name: boss.name, lootItems: [] }))
    }))
  }
}

// One catalog per expansion with data, keyed by the registry's stored name.
const EXPANSION_CATALOGS: Readonly<Record<string, ExpansionCatalog>> = Object.freeze({
  'Classic': legacyCatalog('classic', classicRaids, ITEM_CLASSIFICATIONS, CLASSIC_ITEM_ROLES),
  'The Burning Crusade': legacyCatalog('tbc', tbcRaids, TBC_ITEM_CLASSIFICATIONS, TBC_ITEM_ROLES),
  'Wrath of the Lich King': legacyCatalog('wrath', wrathRaids, WOTLK_ITEM_CLASSIFICATIONS, WOTLK_ITEM_ROLES),
  'Cataclysm': legacyCatalog('cata', cataRaids, CATA_ITEM_CLASSIFICATIONS, CATA_ITEM_ROLES),
  'Mists of Pandaria': legacyCatalog('mop', mopRaids, MOP_ITEM_CLASSIFICATIONS, MOP_ITEM_ROLES),
  'Forever': foreverCatalog(),
})

/**
 * Look up a catalog by stored expansion name. Only an own key resolves, so
 * prototype-pollution names and non-string input return null, as do
 * expansions that have no data yet.
 */
export function getExpansionCatalog(storedName: unknown): ExpansionCatalog | null {
  if (typeof storedName !== 'string' || !Object.prototype.hasOwnProperty.call(EXPANSION_CATALOGS, storedName)) {
    return null
  }
  return EXPANSION_CATALOGS[storedName]
}
