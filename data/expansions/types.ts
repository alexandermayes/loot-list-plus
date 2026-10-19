/**
 * Shared types for the expansion registry and the expansion catalogs.
 *
 * Types only, safe for client and server code: the one import below is
 * type-only, so nothing here ever reaches a bundle. data/expansions/registry.ts
 * (client-safe) and data/expansions/catalogs.ts (server-only) both import from
 * this file, so neither has to import the other just for a type. The zod
 * manifest schema stays in domain/expansion/manifest-schema.ts, outside this
 * file and outside the domain barrel.
 */
import type { GameVersion } from '@/domain/expansion/game'

/**
 * How an expansion's raid tiers are written: 'legacy-insert' runs the seeder's
 * raid loop over the static catalog; 'sync' hands the expansion to
 * syncExpansionCatalog and the manifest.
 */
export type SeedMode = 'legacy-insert' | 'sync'

/**
 * One registry row. Keyed by the stored expansions.name, because every caller
 * and every guild row already uses that name; the slug is a field.
 */
export interface ExpansionMeta {
  storedName: string
  slug: string
  /** null for expansions that have no data yet (the retail "coming soon" rows). */
  game: GameVersion | null
  /** null for expansions that have no data yet. */
  seedMode: SeedMode | null
  hasData: boolean
}

export interface LootItemDefinition {
  name: string
  slot: string
  wowheadId: string
}

export interface BossDefinition {
  name: string
  lootItems: LootItemDefinition[]
}

export interface RaidDefinition {
  name: string
  isActive: boolean
  phase: number | null
  bosses: BossDefinition[]
}

export type ItemClassification = 'Reserved' | 'Limited' | 'Unlimited'

export type ItemRole = 'tank' | 'healer' | 'physical' | 'caster'

/**
 * The five name-keyed Classic-line catalogs, wrapped so the seeder never picks
 * a classification or role map by comparing display names. Frozen by the
 * golden files until the legacy catalogs are converted to manifests.
 */
export interface LegacyCatalog {
  kind: 'legacy'
  raids: RaidDefinition[]
  classify(itemName: string): ItemClassification
  rolesFor(itemName: string): ItemRole[]
}

/**
 * A manifest-driven catalog (Forever). Its tiers are written by the sync
 * service and it carries no loot items, so there is nothing to classify.
 */
export interface NativeCatalog {
  kind: 'native'
  raids: RaidDefinition[]
}

/**
 * Discriminated union: only a legacy catalog can reach the insert loop, so an
 * expansion with items but no classification map of its own cannot fall back
 * to Classic's maps.
 */
export type ExpansionCatalog = LegacyCatalog | NativeCatalog
