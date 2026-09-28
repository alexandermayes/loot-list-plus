import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { findByWowheadId, wowheadIdCandidates } from '@/domain/loot/faction-item-aliases'

/**
 * Source guard for GH #277 (D-03, D-05) and SCOPE-01.
 *
 * _client.tsx is too large (2000+ lines, heavy context/Supabase wiring) to
 * render in a unit test. The component's pasted-loot import format is
 * Gargul's ("Imported from Gargul" notes), even though the GH #277 issue
 * calls this the RCLootCouncil import — there is no RCLootCouncil-specific
 * importer in this repo. This guard reads the component's source text to
 * prove every wowhead_id lookup in it goes through the alias-aware,
 * guild-scoped helpers instead of a raw equality match, so a Horde head
 * (or any other guild's row) can never slip back in undetected.
 */
const SOURCE = fs.readFileSync(path.join(__dirname, '../_client.tsx'), 'utf8')

describe('raid-tracking _client.tsx wowhead lookup source guard (GH #277)', () => {
  it('imports the alias helpers and the guild-scoped lookup helper', () => {
    expect(SOURCE).toMatch(/import\s*\{\s*findByWowheadId,\s*wowheadIdCandidates\s*\}\s*from\s*'@\/domain\/loot\/faction-item-aliases'/)
    expect(SOURCE).toMatch(/import\s*\{\s*findGuildLootItemsByWowheadIds\s*\}\s*from\s*'@\/lib\/loot\/guild-scoped-lookup'/)
  })

  it('calls findByWowheadId( exactly 3 times (parseLootPreview, the import handler, parseLootImportData)', () => {
    const matches = SOURCE.match(/findByWowheadId\(/g) ?? []
    expect(matches).toHaveLength(3)
  })

  it('has zero strict-equality comparisons of a row wowhead_id with itemId', () => {
    const matches = SOURCE.match(/\.wowhead_id\s*===\s*itemId/g) ?? []
    expect(matches).toHaveLength(0)
  })

  it('has zero Supabase equality filters on the wowhead_id column', () => {
    const matches = SOURCE.match(/\.eq\(\s*['"]wowhead_id['"]/g) ?? []
    expect(matches).toHaveLength(0)
  })

  it('has exactly one fallback query, scoped to the guild, over the alias candidates', () => {
    const matches = SOURCE.match(/findGuildLootItemsByWowheadIds\(\s*supabase,\s*activeGuild\.id,\s*wowheadIdCandidates\(itemId\)\s*\)/g) ?? []
    expect(matches).toHaveLength(1)
  })
})

describe('raid-tracking Gargul import behaviour (GH #277)', () => {
  it('matches a Horde-id (19002) Gargul line against a lootItems list holding only the Alliance (19003) row', () => {
    const line = '12/15/2026;[19002];Thrall'
    const parts = line.split(';')
    const itemIdMatch = parts[1].match(/\[(\d+)\]/)
    expect(itemIdMatch).not.toBeNull()
    const itemId = parseInt((itemIdMatch as RegExpMatchArray)[1])

    const lootItems = [{ id: 'item-19003', name: 'Head of Nefarian', wowhead_id: 19003, raid_tier_id: 'tier-bwl' }]
    const matched = findByWowheadId(lootItems, itemId)
    expect(matched).toBe(lootItems[0])
  })

  it('wowheadIdCandidates(19002) yields the exact id first for a direct-match guild copy', () => {
    expect(wowheadIdCandidates(19002)).toEqual([19002, 19003])
  })
})
