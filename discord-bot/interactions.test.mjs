import { describe, it, expect } from 'vitest'
// interactions.js has no top-level discord/supabase requires beyond
// lootlist-api.js and help.js, neither of which requires discord.js or
// supabase at module load, so importing it here is dependency-free. This
// file is .mjs (ESM) so Vitest imports it correctly, and is excluded from
// tsconfig.
import interactions from './interactions.js'

const { priorityReply } = interactions

describe('priorityReply', () => {
  it('returns the existing notLinkedEmbed for no_guild_linked', () => {
    const embed = priorityReply({ ok: false, status: 404, body: { error: 'no_guild_linked' } }, 'bilegrip')
    expect(embed.description).toContain("isn't linked to a LootList+ guild yet")
  })

  it('returns the existing item-not-found embed for item_not_found', () => {
    const embed = priorityReply({ ok: false, status: 404, body: { error: 'item_not_found' } }, 'bilegrip')
    expect(embed.description).toBe("Couldn't find an item matching **bilegrip**.")
  })

  it('returns the existing item-not-found embed for no_items_in_expansion', () => {
    const embed = priorityReply({ ok: false, status: 404, body: { error: 'no_items_in_expansion' } }, 'bilegrip')
    expect(embed.description).toBe("Couldn't find an item matching **bilegrip**.")
  })

  it('returns the existing item-not-found embed for no_active_expansion', () => {
    const embed = priorityReply({ ok: false, status: 404, body: { error: 'no_active_expansion' } }, 'bilegrip')
    expect(embed.description).toBe("Couldn't find an item matching **bilegrip**.")
  })

  it('returns an orange embed with C-1 for a 403 rankings_hidden answer', () => {
    const embed = priorityReply(
      { ok: false, status: 403, body: { error: 'rankings_hidden', item_name: 'Bilegrip Boots', item_wowhead_id: 1001 } },
      'bilegrip'
    )
    expect(embed.color).toBe(0xff8000)
    expect(embed.description).toBe(
      'Rankings for **Bilegrip Boots** are hidden right now. An officer can turn on **Ranks** for its raid tier in Guild Settings.'
    )
  })

  it('returns the existing generic try-again embed for a 500 answer', () => {
    const embed = priorityReply({ ok: false, status: 500, body: { error: 'Internal server error' } }, 'bilegrip')
    expect(embed.description).toBe("LootList+ couldn't run that lookup. Try again in a sec.")
  })

  it('returns the existing generic try-again embed for a 404 with an unknown error', () => {
    const embed = priorityReply({ ok: false, status: 404, body: { error: 'something_else' } }, 'bilegrip')
    expect(embed.description).toBe("LootList+ couldn't run that lookup. Try again in a sec.")
  })

  it('returns the existing title and raider lines plus C-2 footer for an ok answer with raiders', () => {
    const embed = priorityReply(
      {
        ok: true,
        status: 200,
        body: {
          item_name: 'Bilegrip Boots',
          item_wowhead_id: 1001,
          raiders: [{ name: 'Active', class: 'Mage', rank: 40 }],
        },
      },
      'bilegrip'
    )
    expect(embed.title).toBe('Top priority \u2014 Bilegrip Boots')
    expect(embed.description).toContain('`#1` **Active** *(Mage)* \u2014 rank 40')
    expect(embed.footer).toEqual({ text: 'Sorted by loot list rank. Loot Scores are on the Master Sheet.' })
  })

  it('returns the existing empty state with no footer for an ok answer with no raiders', () => {
    const embed = priorityReply(
      { ok: true, status: 200, body: { item_name: 'Bilegrip Boots', item_wowhead_id: 1001, raiders: [] } },
      'bilegrip'
    )
    expect(embed.description).toContain('_No raiders have ranked this item._')
    expect(embed.footer).toBeUndefined()
  })
})
