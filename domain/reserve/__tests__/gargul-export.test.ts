/**
 * @vitest-environment node
 *
 * Uses Node's native Blob.stream(), which jsdom's Blob doesn't implement.
 * The default jsdom environment (vitest.config.ts) breaks the round-trip
 * tests here; this directive opts this file into Node.
 */
import { describe, it, expect } from 'vitest'
import {
  encodeGargulExport,
  decodeGargulExport,
  normalizeClassForGargul,
  buildGargulSoftReserves,
  buildGargulHardReserves,
  type GargulPayload,
} from '../gargul-export'
import { FACTION_ITEM_ALIASES } from '@/domain/loot/faction-item-aliases'

// ─── Fixtures ───────────────────────────────────────────────

function makePayload(overrides: Partial<GargulPayload> = {}): GargulPayload {
  return {
    metadata: {
      id: 'test-token-abc',
      createdAt: 1712793600,
      updatedAt: 1712793600,
      discordUrl: '',
      hidden: false,
      url: 'https://lootlistplus.com/reserve/join/test-token-abc',
      raidStartsAt: 1712793600,
    },
    softreserves: [
      {
        name: 'Legolas',
        class: 'hunter',
        note: '',
        plusOnes: 0,
        items: [{ id: 30883 }, { id: 30886 }],
      },
      {
        name: 'Arthas',
        class: 'death knight',
        note: '',
        plusOnes: 2,
        items: [{ id: 40343 }],
      },
    ],
    hardreserves: [
      { id: 32837, for: 'Officers', note: 'Warglaive' },
    ],
    instances: [],
    ...overrides,
  }
}

// ─── normalizeClassForGargul ────────────────────────────────

describe('normalizeClassForGargul', () => {
  it('lowercases standard classes', () => {
    expect(normalizeClassForGargul('Warrior')).toBe('warrior')
    expect(normalizeClassForGargul('Paladin')).toBe('paladin')
    expect(normalizeClassForGargul('MAGE')).toBe('mage')
  })

  it('adds space for Death Knight variants', () => {
    expect(normalizeClassForGargul('DeathKnight')).toBe('death knight')
    expect(normalizeClassForGargul('Death-Knight')).toBe('death knight')
    expect(normalizeClassForGargul('Death Knight')).toBe('death knight')
  })

  it('adds space for Demon Hunter variants', () => {
    expect(normalizeClassForGargul('DemonHunter')).toBe('demon hunter')
    expect(normalizeClassForGargul('Demon-Hunter')).toBe('demon hunter')
    expect(normalizeClassForGargul('Demon Hunter')).toBe('demon hunter')
  })

  it('handles empty/null-ish input', () => {
    expect(normalizeClassForGargul('')).toBe('')
    expect(normalizeClassForGargul(null as unknown as string)).toBe('')
  })
})

// ─── Round-trip encode → decode ─────────────────────────────

describe('encodeGargulExport / decodeGargulExport round-trip', () => {
  it('produces a non-empty base64 string', async () => {
    const payload = makePayload()
    const encoded = await encodeGargulExport(payload)
    expect(encoded.length).toBeGreaterThan(0)
    // Must be valid base64 (no whitespace, only base64 chars)
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it('decodes back to the original payload', async () => {
    const payload = makePayload()
    const encoded = await encodeGargulExport(payload)
    const decoded = await decodeGargulExport(encoded)
    expect(decoded).toEqual(payload)
  })

  it('preserves metadata.id (required by Gargul)', async () => {
    const payload = makePayload()
    const decoded = await decodeGargulExport(await encodeGargulExport(payload))
    expect(decoded.metadata.id).toBe('test-token-abc')
  })

  it('preserves all softreserve entries with correct shape', async () => {
    const payload = makePayload()
    const decoded = await decodeGargulExport(await encodeGargulExport(payload))
    expect(decoded.softreserves).toHaveLength(2)
    // Check Gargul's required fields per entry
    for (const entry of decoded.softreserves) {
      expect(typeof entry.name).toBe('string')
      expect(typeof entry.class).toBe('string')
      expect(typeof entry.plusOnes).toBe('number')
      expect(Array.isArray(entry.items)).toBe(true)
      for (const item of entry.items) {
        expect(typeof item.id).toBe('number')
        expect(item.id).toBeGreaterThan(0)
      }
    }
  })

  it('preserves hardreserve entries', async () => {
    const payload = makePayload()
    const decoded = await decodeGargulExport(await encodeGargulExport(payload))
    expect(decoded.hardreserves).toHaveLength(1)
    expect(decoded.hardreserves[0].id).toBe(32837)
    expect(decoded.hardreserves[0].for).toBe('Officers')
  })

  it('handles empty reserves', async () => {
    const payload = makePayload({ softreserves: [], hardreserves: [] })
    const decoded = await decodeGargulExport(await encodeGargulExport(payload))
    expect(decoded.softreserves).toEqual([])
    expect(decoded.hardreserves).toEqual([])
    expect(decoded.metadata.id).toBe('test-token-abc')
  })

  it('handles a large number of reserves without encoding errors', async () => {
    const softreserves = Array.from({ length: 40 }, (_, i) => ({
      name: `Player${i + 1}`,
      class: 'warrior',
      note: '',
      plusOnes: 0,
      items: Array.from({ length: 5 }, (_, j) => ({ id: 30000 + i * 10 + j })),
    }))
    const payload = makePayload({ softreserves })
    const encoded = await encodeGargulExport(payload)
    const decoded = await decodeGargulExport(encoded)
    expect(decoded.softreserves).toHaveLength(40)
    expect(decoded.softreserves[39].items).toHaveLength(5)
  })
})

// ─── Gargul parser contract ─────────────────────────────────
// These tests assert the structural invariants that importGargulData checks
// before accepting the payload. If any of these fail, Gargul will reject.

describe('Gargul importGargulData contract', () => {
  it('decoded payload has softreserves as an array', async () => {
    const decoded = await decodeGargulExport(await encodeGargulExport(makePayload()))
    expect(Array.isArray(decoded.softreserves)).toBe(true)
  })

  it('decoded payload has metadata.id as a truthy string', async () => {
    const decoded = await decodeGargulExport(await encodeGargulExport(makePayload()))
    expect(decoded.metadata.id).toBeTruthy()
    expect(typeof decoded.metadata.id).toBe('string')
  })

  it('class names are lowercase (Gargul lowercases and looks up in Constants.Classes)', async () => {
    const payload = makePayload({
      softreserves: [
        { name: 'Test', class: normalizeClassForGargul('Death Knight'), note: '', plusOnes: 0, items: [{ id: 1234 }] },
        { name: 'Test2', class: normalizeClassForGargul('Warrior'), note: '', plusOnes: 0, items: [{ id: 5678 }] },
      ],
    })
    const decoded = await decodeGargulExport(await encodeGargulExport(payload))
    expect(decoded.softreserves[0].class).toBe('death knight')
    expect(decoded.softreserves[1].class).toBe('warrior')
  })

  it('item ids are positive numbers (Gargul checks higherThanZero)', async () => {
    const decoded = await decodeGargulExport(await encodeGargulExport(makePayload()))
    for (const entry of decoded.softreserves) {
      for (const item of entry.items) {
        expect(item.id).toBeGreaterThan(0)
      }
    }
  })

  it('plusOnes defaults to 0 (non-negative number)', async () => {
    const decoded = await decodeGargulExport(await encodeGargulExport(makePayload()))
    for (const entry of decoded.softreserves) {
      expect(entry.plusOnes).toBeGreaterThanOrEqual(0)
    }
  })
})

// ─── buildGargulSoftReserves / buildGargulHardReserves ──────

function itemsMap(rows: Array<{ id: string; wowhead_id: number | null }>) {
  return new Map(rows.map(r => [r.id, { wowhead_id: r.wowhead_id }]))
}

describe('buildGargulSoftReserves', () => {
  it('normalizes class, drops unknown loot item uuids and non-positive/null wowhead ids', () => {
    const items = itemsMap([
      { id: 'item-a', wowhead_id: 1001 },
      { id: 'item-zero', wowhead_id: 0 },
      { id: 'item-null', wowhead_id: null },
    ])
    const result = buildGargulSoftReserves(
      [
        {
          character_name: 'Arthas',
          character_class: 'DeathKnight',
          items: ['item-a', 'item-unknown', 'item-zero', 'item-null'],
        },
      ],
      items
    )
    expect(result).toEqual([
      { name: 'Arthas', class: 'death knight', note: '', plusOnes: 0, items: [{ id: 1001 }] },
    ])
  })

  it('omits a submission with no resolvable items entirely', () => {
    const items = itemsMap([{ id: 'item-a', wowhead_id: 1001 }])
    const result = buildGargulSoftReserves(
      [
        { character_name: 'Ghost', character_class: 'Mage', items: ['item-unknown'] },
        { character_name: 'Bob', character_class: 'Warrior', items: ['item-a'] },
      ],
      items
    )
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Bob')
  })

  it('note is empty and plusOnes is 0', () => {
    const items = itemsMap([{ id: 'item-a', wowhead_id: 1001 }])
    const result = buildGargulSoftReserves(
      [{ character_name: 'Bob', character_class: 'Warrior', items: ['item-a'] }],
      items
    )
    expect(result[0].note).toBe('')
    expect(result[0].plusOnes).toBe(0)
  })
})

describe('buildGargulHardReserves', () => {
  it('skips entries whose item is missing or has a falsy wowhead_id', () => {
    const items = itemsMap([
      { id: 'item-a', wowhead_id: 2002 },
      { id: 'item-zero', wowhead_id: 0 },
      { id: 'item-null', wowhead_id: null },
    ])
    const result = buildGargulHardReserves(
      [
        { loot_item_id: 'item-a', reserved_for: 'Officers' },
        { loot_item_id: 'item-unknown' },
        { loot_item_id: 'item-zero' },
        { loot_item_id: 'item-null' },
      ],
      items
    )
    expect(result).toEqual([{ id: 2002, for: 'Officers', note: '' }])
  })

  it('maps a missing reserved_for to an empty string', () => {
    const items = itemsMap([{ id: 'item-a', wowhead_id: 2002 }])
    const result = buildGargulHardReserves([{ loot_item_id: 'item-a' }], items)
    expect(result).toEqual([{ id: 2002, for: '', note: '' }])
  })
})

describe('buildGargulSoftReserves / buildGargulHardReserves do not mirror faction-variant items (GH #290, PD-04)', () => {
  it('a submission reserving the Alliance-head uuid gives items [{ id: alliance }] only, for every alias pair', () => {
    for (const allianceId of Object.values(FACTION_ITEM_ALIASES)) {
      const items = itemsMap([{ id: 'alliance-item', wowhead_id: allianceId }])
      const result = buildGargulSoftReserves(
        [{ character_name: 'Thrall', character_class: 'Shaman', items: ['alliance-item'] }],
        items
      )
      expect(result).toHaveLength(1)
      expect(result[0].items).toEqual([{ id: allianceId }])
    }
  })

  it('a hard reserve on the Alliance-head uuid gives exactly one entry with id alliance, for every alias pair', () => {
    for (const allianceId of Object.values(FACTION_ITEM_ALIASES)) {
      const items = itemsMap([{ id: 'alliance-item', wowhead_id: allianceId }])
      const result = buildGargulHardReserves(
        [{ loot_item_id: 'alliance-item', reserved_for: 'Officers' }],
        items
      )
      expect(result).toEqual([{ id: allianceId, for: 'Officers', note: '' }])
    }
  })

  it('round trip: a payload built from the builders, encoded then decoded, still has exactly one item id per reservation', async () => {
    for (const allianceId of Object.values(FACTION_ITEM_ALIASES)) {
      const items = itemsMap([{ id: 'alliance-item', wowhead_id: allianceId }])
      const softreserves = buildGargulSoftReserves(
        [{ character_name: 'Thrall', character_class: 'Shaman', items: ['alliance-item'] }],
        items
      )
      const hardreserves = buildGargulHardReserves(
        [{ loot_item_id: 'alliance-item', reserved_for: 'Officers' }],
        items
      )
      const payload = makePayload({ softreserves, hardreserves })
      const decoded = await decodeGargulExport(await encodeGargulExport(payload))
      expect(decoded.softreserves[0].items).toEqual([{ id: allianceId }])
      expect(decoded.hardreserves).toEqual([{ id: allianceId, for: 'Officers', note: '' }])
    }
  })
})
