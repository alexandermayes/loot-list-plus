// @vitest-environment node
// Runs in the root vitest suite. companion/tsconfig.json excludes
// __tests__, so the companion typecheck never needs vitest's types.
import { describe, it, expect } from 'vitest'
import { convertItemsToLuaFormat, convertMembersToLuaFormat, toPendingAwardRequests } from '../addon-format'
import { parseLuaTable } from '../lua-parser'
import { toLuaTable } from '../lua-writer'
import type { GuildData } from '../api-client'
// Relative, not '@/': inside companion/ that alias points at companion/src.
import { addonAwardKeys } from '../../../../lib/loot/addon-award-insert'

const AWARDED_AT = '2026-09-20T20:00:00Z'
const AWARD_ID = '2026-09-20T20:00:00Z-1-a1b2c3'

describe('toPendingAwardRequests (FU-A of 261001-tv5, D-07)', () => {
  it('P1 forwards the date part as awarded_date and the raw awardedAt as awarded_at', () => {
    const [request] = toPendingAwardRequests([
      { wowheadId: 20928, characterName: 'Thrall', bossName: 'Shared Boss Loot', awardedAt: AWARDED_AT },
    ])
    expect(request).toEqual({
      wowhead_id: 20928,
      character_name: 'Thrall',
      boss_name: 'Shared Boss Loot',
      awarded_date: '2026-09-20',
      awarded_at: AWARDED_AT,
      award_id: undefined,
    })
  })

  it('P2 forwards a string awardId as award_id; without one the request has no award_id key', () => {
    const [withId, withoutId] = toPendingAwardRequests([
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT, awardId: AWARD_ID },
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT },
    ])
    expect(withId.award_id).toBe(AWARD_ID)
    expect(withoutId.award_id).toBeUndefined()
    expect(JSON.parse(JSON.stringify(withoutId))).not.toHaveProperty('award_id')
    expect(JSON.parse(JSON.stringify(withId))).toMatchObject({ award_id: AWARD_ID, awarded_at: AWARDED_AT })
  })

  it('P3 a non-string awardedAt or awardId leaves those fields undefined without throwing', () => {
    const [request] = toPendingAwardRequests([
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: 1758398400, awardId: 7 },
    ])
    expect(request.awarded_date).toBeUndefined()
    expect(request.awarded_at).toBeUndefined()
    expect(request.award_id).toBeUndefined()
  })

  it('P4 a missing, empty-table or non-array pending value gives []', () => {
    expect(toPendingAwardRequests(undefined)).toEqual([])
    expect(toPendingAwardRequests(null)).toEqual([])
    // An empty Lua table parses as {}.
    expect(toPendingAwardRequests({})).toEqual([])
    expect(toPendingAwardRequests('nope')).toEqual([])
    expect(toPendingAwardRequests([])).toEqual([])
  })

  it('P5 the companion request and the export-string award give the server the same keys', () => {
    for (const award of [
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT, awardId: AWARD_ID },
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT },
    ]) {
      const [request] = toPendingAwardRequests([award])
      // POST /api/addon/loot-award (companion path)
      const fromCompanion = addonAwardKeys({
        awardedAt: request.awarded_at,
        wowheadId: request.wowhead_id,
        characterName: request.character_name,
        awardId: request.award_id,
      })
      // POST /api/addon/import-string (export string path)
      const fromExport = addonAwardKeys({
        awardedAt: award.awardedAt,
        wowheadId: award.wowheadId,
        characterName: award.characterName,
        awardId: award.awardId,
      })
      expect(fromCompanion).toEqual(fromExport)
      expect(fromCompanion.key).toBe(
        award.awardId ? `addon2:${AWARD_ID}:20928:thrall` : `addon:${AWARDED_AT}:20928:thrall`,
      )
    }
  })
})

type Member = GuildData['members'][number]
type Item = GuildData['items'][number]

function member(items: Member['items'], extra: Partial<Member> = {}): Member {
  return {
    character_id: 'c1',
    name: 'Thrall',
    class_token: 'SHAMAN',
    class_color: '#0070DE',
    spec_name: 'Enhancement',
    spec_id: 'spec-1',
    role: 'dps',
    guild_role: 'raider',
    membership_status: 'full',
    items,
    ...extra,
  }
}

function item(wowheadId: number, extra: Partial<Item> = {}): Item {
  return {
    id: `li-${wowheadId}`,
    name: `Item ${wowheadId}`,
    wowhead_id: wowheadId,
    boss_name: 'Shared Boss Loot',
    raid_name: "Temple of Ahn'Qiraj",
    classification: null,
    slot: 'Wrist',
    item_type: null,
    ...extra,
  }
}

describe('convertMembersToLuaFormat (FU-A of 261001-tv5, D-08)', () => {
  it('C1 two entries give the highest rank in items and every rank, highest first, in itemRanks', () => {
    const result = convertMembersToLuaFormat([member([{ wowhead_id: 20928, rank: 30 }, { wowhead_id: 20928, rank: 50 }])])
    expect(result.c1).toMatchObject({ items: { '20928': 50 }, itemRanks: { '20928': [50, 30] } })
  })

  it('C2 one entry gives items 50 and itemRanks [50]', () => {
    const result = convertMembersToLuaFormat([member([{ wowhead_id: 20928, rank: 50 }])])
    expect(result.c1).toMatchObject({ items: { '20928': 50 }, itemRanks: { '20928': [50] } })
  })

  it('C3 no entries give empty items and itemRanks', () => {
    const result = convertMembersToLuaFormat([member([])])
    expect(result.c1).toMatchObject({ items: {}, itemRanks: {} })
  })

  it('C4 equal ranks in two slots stay two entries', () => {
    const result = convertMembersToLuaFormat([member([{ wowhead_id: 20928, rank: 40 }, { wowhead_id: 20928, rank: 40 }])])
    expect(result.c1).toMatchObject({ items: { '20928': 40 }, itemRanks: { '20928': [40, 40] } })
  })

  it('C5 every other member field is unchanged', () => {
    const result = convertMembersToLuaFormat([member([{ wowhead_id: 16921, rank: 3 }])])
    expect(result).toEqual({
      c1: {
        name: 'Thrall',
        class: 'SHAMAN',
        classColor: '#0070DE',
        spec: 'Enhancement',
        specId: 'spec-1',
        role: 'dps',
        guildRole: 'raider',
        membershipStatus: 'full',
        items: { '16921': 3 },
        itemRanks: { '16921': [3] },
      },
    })
  })
})

describe('Lua output keys (FU-A of 261001-tv5, D-09)', () => {
  function writeDb() {
    const db = {
      profiles: {
        Default: {
          guildData: {
            guildId: 'g1',
            items: convertItemsToLuaFormat([item(20928), item(16921)]),
            members: convertMembersToLuaFormat([member([{ wowhead_id: 20928, rank: 30 }, { wowhead_id: 20928, rank: 50 }])]),
          },
        },
      },
    }
    return toLuaTable('LootListPlusDB', db)
  }

  /** The text of the first table after `name = {`, up to its matching close. */
  function block(lua: string, name: string): string {
    const start = lua.indexOf(`${name} = {`)
    expect(start).toBeGreaterThanOrEqual(0)
    let depth = 0
    for (let i = lua.indexOf('{', start); i < lua.length; i++) {
      if (lua[i] === '{') depth++
      if (lua[i] === '}' && --depth === 0) return lua.slice(start, i + 1)
    }
    throw new Error(`unclosed ${name}`)
  }

  it('W1 item keys are Lua numbers; member items and itemRanks keep string keys', () => {
    const lua = writeDb()
    const items = block(lua, 'items')
    expect(items).toContain('[20928] = {')
    expect(items).toContain('[16921] = {')
    expect(items).not.toContain('["20928"]')

    const members = block(lua, 'members')
    expect(members).toContain('["20928"] = 50')
    const ranks = block(members, 'itemRanks')
    expect(ranks).toMatch(/\["20928"\] = \{\s*50,\s*30,\s*\}/)
  })

  it('W2 parsing and re-writing reproduces the output byte for byte', () => {
    const lua = writeDb()
    const parsed = parseLuaTable(lua)
    expect(toLuaTable('LootListPlusDB', parsed['LootListPlusDB'])).toBe(lua)
  })

  it('W3 a file the addon wrote with [20928] item keys keeps them after a parse and write', () => {
    const addonFile = [
      'LootListPlusDB = {',
      '\t["profiles"] = {',
      '\t\t["Default"] = {',
      '\t\t\t["guildData"] = {',
      '\t\t\t\t["items"] = {',
      '\t\t\t\t\t[20928] = {',
      '\t\t\t\t\t\t["name"] = "Qiraji Bindings of Command",',
      '\t\t\t\t\t},',
      '\t\t\t\t},',
      '\t\t\t\t["members"] = {',
      '\t\t\t\t\t["c1"] = {',
      '\t\t\t\t\t\t["items"] = {',
      '\t\t\t\t\t\t\t["20928"] = 50,',
      '\t\t\t\t\t\t},',
      '\t\t\t\t\t},',
      '\t\t\t\t},',
      '\t\t\t},',
      '\t\t},',
      '\t},',
      '}',
      '',
    ].join('\n')
    const rewritten = toLuaTable('LootListPlusDB', parseLuaTable(addonFile)['LootListPlusDB'])
    expect(block(rewritten, 'items')).toContain('[20928] = {')
    expect(rewritten).toContain('["20928"] = 50')
  })

  it('W4 identifier keys stay bare and other string keys keep the ["k"] form', () => {
    const lua = toLuaTable('X', { plain: 1, 'with space': 2, '123abc': 3, '20928': 4 })
    expect(lua).toContain('plain = 1,')
    expect(lua).toContain('["with space"] = 2,')
    expect(lua).toContain('["123abc"] = 3,')
    // An unmarked numeric-looking key is a string key, exactly as today.
    expect(lua).toContain('["20928"] = 4,')
  })
})
