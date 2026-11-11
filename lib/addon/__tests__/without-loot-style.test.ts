import { describe, it, expect } from 'vitest'
import { withoutLootStyle } from '../without-loot-style'

// Why these cases: the addon export string is byte-compared against Known
// guilds' fixtures, so the helper must drop exactly one key and nothing else,
// and keep the order of the rest.

describe('withoutLootStyle', () => {
  it('drops loot_style and keeps every other key in its order', () => {
    const row = { guild_id: 'g', attendance_type: 'linear', loot_style: 'reward_attendance', decimal_places: 2 }

    const result = withoutLootStyle(row)

    expect(Object.keys(result)).toEqual(['guild_id', 'attendance_type', 'decimal_places'])
    expect(result).toEqual({ guild_id: 'g', attendance_type: 'linear', decimal_places: 2 })
  })

  it('leaves a row without loot_style as it was', () => {
    const row = { guild_id: 'g', attendance_type: 'linear' }

    expect(withoutLootStyle(row)).toEqual(row)
  })

  it('does not change the row it was given', () => {
    const row = { guild_id: 'g', loot_style: 'even_rotation' as string | null }

    withoutLootStyle(row)

    expect(row.loot_style).toBe('even_rotation')
  })

  it('serialises the same as a row that never had the column', () => {
    const before = JSON.stringify({ a: 1, b: 'two' })
    const after = JSON.stringify(withoutLootStyle({ a: 1, loot_style: 'officers_decide', b: 'two' }))

    expect(after).toBe(before)
  })
})
