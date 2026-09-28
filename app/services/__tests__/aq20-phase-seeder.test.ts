import { describe, it, expect, beforeAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { seedExpansionForGuild } from '../expansionSeeder'

// GH-279: data/expansion-phases.ts listed Classic Phase 4 as the orphan raid
// name "Ahn'Qiraj", but data/classic-wow-raids.ts (the catalog the seeder
// actually copies) names the raid "Ruins of Ahn'Qiraj". getRaidPhase matches
// names exactly, so every Classic guild has been seeded with AQ20 at phase
// NULL since the phase system shipped (commit 5febb4f5, 2026-02-04). A
// NULL-phase tier is invisible everywhere phase-keyed: no Phase card, no
// toggle, filtered out of /api/raid-tiers and the loot-list bootstrap.
//
// This file proves the fix through the real seeder only, with no dependency
// on the backfill migration (that migration and its own SQL-shape assertions
// ship in a separate PR, per OD-02's merge-order split). It confirms
// seedExpansionForGuild now writes phase 4 for AQ20, switched off for the
// guild and for rankings visibility (OD-01: switching guilds already past
// Phase 4 onto AQ20 is a deliberately separate, not-yet-decided product
// decision).

interface QueryResult {
  data: unknown
  error: unknown
}

interface RaidTierPayload {
  expansion_id: string
  name: string
  is_active: boolean
  is_guild_active: boolean
  master_sheet_visible: boolean
  phase: number | null
}

/**
 * Minimal chainable stand-in for the Supabase client calls
 * seedExpansionForGuild makes on the service-role path: expansions lookup +
 * insert, guilds update (setAsCurrent), raid_tiers insert (recorded here),
 * loot_items bulk insert, wow_classes select and loot_item_classes insert.
 * Modelled on createSeederFake in classic-loot-backfill-migration.test.ts.
 */
function createSeederFake() {
  const raidTierPayloads: RaidTierPayload[] = []
  let nextId = 0

  function from(table: string) {
    let payload: unknown = null

    function resolve(): QueryResult {
      switch (table) {
        case 'expansions':
          return payload
            ? { data: { id: 'expansion-classic' }, error: null }
            : { data: null, error: { message: 'no rows' } }
        case 'guilds':
          return { data: null, error: null }
        case 'raid_tiers': {
          const tier = payload as RaidTierPayload
          raidTierPayloads.push(tier)
          return { data: { id: `tier-${nextId++}` }, error: null }
        }
        case 'loot_items': {
          const rows = (payload as Array<{ name: string; item_slot: string }>).map(row => ({
            id: `item-${nextId++}`,
            name: row.name,
            item_slot: row.item_slot,
          }))
          return { data: rows, error: null }
        }
        case 'wow_classes':
          return { data: [], error: null }
        case 'loot_item_classes':
          return { data: null, error: null }
        default:
          return { data: null, error: { message: `unexpected table ${table}` } }
      }
    }

    const chain = {
      insert(value: unknown) {
        payload = value
        return chain
      },
      update(value: unknown) {
        payload = value
        return chain
      },
      select() {
        return chain
      },
      eq() {
        return chain
      },
      single() {
        return Promise.resolve(resolve())
      },
      then<T>(onFulfilled: (result: QueryResult) => T, onRejected?: (reason: unknown) => T) {
        return Promise.resolve(resolve()).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  return { client: { from } as unknown as SupabaseClient, raidTierPayloads }
}

describe('AQ20 Phase 4 fix, seeder output (GH-279-R1)', () => {
  const fake = createSeederFake()

  beforeAll(async () => {
    const result = await seedExpansionForGuild(fake.client, 'guild-279', 'Classic', true, true)
    expect(result.error).toBeUndefined()
  })

  it('produces exactly 7 raid_tiers insert payloads, all with a non-null phase', () => {
    expect(fake.raidTierPayloads).toHaveLength(7)
    for (const tier of fake.raidTierPayloads) {
      expect(tier.phase, `${tier.name} was seeded with a null phase`).not.toBeNull()
    }
  })

  it('seeds "Ruins of Ahn\'Qiraj" at phase 4, switched off for the guild and rankings', () => {
    const aq20 = fake.raidTierPayloads.find(tier => tier.name === "Ruins of Ahn'Qiraj")
    expect(aq20).toBeDefined()
    expect(aq20!.phase).toBe(4)
    expect(aq20!.is_guild_active).toBe(false)
    expect(aq20!.master_sheet_visible).toBe(false)
  })
})
