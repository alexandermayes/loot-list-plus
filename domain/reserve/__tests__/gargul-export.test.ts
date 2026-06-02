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
  type GargulPayload,
} from '../gargul-export'

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
