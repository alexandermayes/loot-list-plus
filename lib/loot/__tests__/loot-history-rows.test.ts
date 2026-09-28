// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildAddonAwardRow, buildBulkAwardRow, buildImportStringAwardRow, type LootItemScope } from '../loot-history-rows'

const ITEM: LootItemScope = { id: 'item-1', raid_tier_id: 'tier-1', expansion_id: 'exp-1' }

describe('buildAddonAwardRow', () => {
  it('emits guild_id, loot_item_id, raid_tier_id and expansion_id from its inputs', () => {
    const row = buildAddonAwardRow({
      guildId: 'guild-1',
      item: ITEM,
      characterId: 'char-1',
      characterName: 'Thrall',
      awardedDate: '2026-09-20',
      awardedBy: 'user-1',
      notes: null,
      bossName: null,
      today: '2026-09-21',
    })
    expect(row.guild_id).toBe('guild-1')
    expect(row.loot_item_id).toBe('item-1')
    expect(row.raid_tier_id).toBe('tier-1')
    expect(row.expansion_id).toBe('exp-1')
  })

  it('sets source "addon"', () => {
    const row = buildAddonAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21',
    })
    expect(row.source).toBe('addon')
  })

  it('falls back to today when awardedDate is absent or empty', () => {
    const row = buildAddonAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21', awardedDate: '',
    })
    expect(row.awarded_date).toBe('2026-09-21')

    const rowNoDate = buildAddonAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21',
    })
    expect(rowNoDate.awarded_date).toBe('2026-09-21')
  })

  it('uses the given awardedDate when present', () => {
    const row = buildAddonAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21', awardedDate: '2026-09-15',
    })
    expect(row.awarded_date).toBe('2026-09-15')
  })

  it('uses notes when given, else "Dropped from <boss>" when a boss name is given, else null', () => {
    const withNotes = buildAddonAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21', notes: 'Officer call', bossName: 'Nefarian',
    })
    expect(withNotes.notes).toBe('Officer call')

    const withBoss = buildAddonAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21', bossName: 'Nefarian',
    })
    expect(withBoss.notes).toBe('Dropped from Nefarian')

    const withNeither = buildAddonAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21',
    })
    expect(withNeither.notes).toBeNull()
  })
})

describe('buildImportStringAwardRow', () => {
  it('emits guild_id, loot_item_id, raid_tier_id and expansion_id from its inputs', () => {
    const row = buildImportStringAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: 'char-1', characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21',
    })
    expect(row.guild_id).toBe('guild-1')
    expect(row.loot_item_id).toBe('item-1')
    expect(row.raid_tier_id).toBe('tier-1')
    expect(row.expansion_id).toBe('exp-1')
  })

  it('sets source "addon"', () => {
    const row = buildImportStringAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21',
    })
    expect(row.source).toBe('addon')
  })

  it('takes the date part of awardedAt when given', () => {
    const row = buildImportStringAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21', awardedAt: '2026-09-15T20:00:00Z',
    })
    expect(row.awarded_date).toBe('2026-09-15')
  })

  it('falls back to today when awardedAt is absent', () => {
    const row = buildImportStringAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21',
    })
    expect(row.awarded_date).toBe('2026-09-21')
  })

  it('sets notes "Manual award from addon" for manual awards, else null', () => {
    const manual = buildImportStringAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21', manual: true,
    })
    expect(manual.notes).toBe('Manual award from addon')

    const notManual = buildImportStringAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21', manual: false,
    })
    expect(notManual.notes).toBeNull()

    const unset = buildImportStringAwardRow({
      guildId: 'guild-1', item: ITEM, characterId: null, characterName: 'Thrall',
      awardedBy: 'user-1', today: '2026-09-21',
    })
    expect(unset.notes).toBeNull()
  })
})

describe('buildBulkAwardRow', () => {
  it('emits guild_id, loot_item_id, raid_tier_id and expansion_id from its inputs', () => {
    const row = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null,
    })
    expect(row.guild_id).toBe('guild-1')
    expect(row.loot_item_id).toBe('item-1')
    expect(row.raid_tier_id).toBe('tier-1')
    expect(row.expansion_id).toBe('exp-1')
  })

  it('omits the source key entirely (DB default "web" applies)', () => {
    const row = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null,
    })
    expect('source' in row).toBe(false)
  })

  it('omits awarded_date entirely when absent (DB default CURRENT_DATE applies)', () => {
    const row = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null,
    })
    expect('awarded_date' in row).toBe(false)
  })

  it('includes awarded_date when given', () => {
    const row = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null, awardedDate: '2026-09-20',
    })
    expect(row.awarded_date).toBe('2026-09-20')
  })

  it('includes character_id and character_name only when given', () => {
    const withoutChar = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null,
    })
    expect('character_id' in withoutChar).toBe(false)
    expect('character_name' in withoutChar).toBe(false)

    const withChar = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null,
      characterId: 'char-1', characterName: 'Thrall',
    })
    expect(withChar.character_id).toBe('char-1')
    expect(withChar.character_name).toBe('Thrall')
  })

  it('sets raid_event_id to null when not given, or to the given value', () => {
    const withoutEvent = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null,
    })
    expect(withoutEvent.raid_event_id).toBeNull()

    const withEvent = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: null, raidEventId: 'event-1',
    })
    expect(withEvent.raid_event_id).toBe('event-1')
  })

  it('carries the given notes through as-is', () => {
    const row = buildBulkAwardRow({
      guildId: 'guild-1', awardedBy: 'user-1', item: ITEM, notes: 'Score winner: great roll',
    })
    expect(row.notes).toBe('Score winner: great roll')
  })
})
