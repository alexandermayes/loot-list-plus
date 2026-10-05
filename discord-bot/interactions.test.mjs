import { describe, it, expect } from 'vitest'
// interactions.js has no top-level discord/supabase requires beyond
// lootlist-api.js and help.js, neither of which requires discord.js or
// supabase at module load, so importing it here is dependency-free. This
// file is .mjs (ESM) so Vitest imports it correctly, and is excluded from
// tsconfig.
import interactions from './interactions.js'

const { priorityReply, scoreReply } = interactions

const PREMIUM_REQUIRED_BODY = {
  error: 'premium_required',
  guild_name: 'Test Guild',
  premium_url: 'https://www.getlootlist.com/premium',
}

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

  it('returns an orange, description-only C-5 embed for a 403 premium_required answer naming the guild', () => {
    const embed = priorityReply({ ok: false, status: 403, body: PREMIUM_REQUIRED_BODY }, 'bilegrip')
    expect(embed.color).toBe(0xff8000)
    expect(embed.title).toBeUndefined()
    expect(embed.footer).toBeUndefined()
    expect(embed.description).toBe(
      'Bot lookups are part of LootList+ Premium. An officer can upgrade **Test Guild** at https://www.getlootlist.com/premium.'
    )
  })

  it('returns C-5b when guild_name is null', () => {
    const embed = priorityReply(
      { ok: false, status: 403, body: { ...PREMIUM_REQUIRED_BODY, guild_name: null } },
      'bilegrip'
    )
    expect(embed.description).toBe(
      'Bot lookups are part of LootList+ Premium. An officer can upgrade your guild at https://www.getlootlist.com/premium.'
    )
  })

  it('returns C-5b when the guild name is made only of unsafe characters', () => {
    const embed = priorityReply(
      { ok: false, status: 403, body: { ...PREMIUM_REQUIRED_BODY, guild_name: '[]()@*_~`|' } },
      'bilegrip'
    )
    expect(embed.description).toBe(
      'Bot lookups are part of LootList+ Premium. An officer can upgrade your guild at https://www.getlootlist.com/premium.'
    )
  })

  it('cleans link, mention and emphasis characters from the guild name and collapses whitespace', () => {
    const embed = priorityReply(
      {
        ok: false,
        status: 403,
        body: { ...PREMIUM_REQUIRED_BODY, guild_name: '[Raid]   (Night) @Guild *Elite*  _Crew_' },
      },
      'bilegrip'
    )
    expect(embed.description).toBe(
      'Bot lookups are part of LootList+ Premium. An officer can upgrade **Raid Night Guild Elite Crew** at https://www.getlootlist.com/premium.'
    )
  })

  it('cuts a guild name longer than 64 characters to 64', () => {
    const longName = 'A'.repeat(70)
    const embed = priorityReply(
      { ok: false, status: 403, body: { ...PREMIUM_REQUIRED_BODY, guild_name: longName } },
      'bilegrip'
    )
    expect(embed.description).toBe(
      `Bot lookups are part of LootList+ Premium. An officer can upgrade **${'A'.repeat(64)}** at https://www.getlootlist.com/premium.`
    )
  })

  it('falls back to the default premium url when premium_url is missing or not https', () => {
    const missing = priorityReply(
      { ok: false, status: 403, body: { error: 'premium_required', guild_name: 'Test Guild' } },
      'bilegrip'
    )
    expect(missing.description).toBe(
      'Bot lookups are part of LootList+ Premium. An officer can upgrade **Test Guild** at https://www.getlootlist.com/premium.'
    )

    const notHttps = priorityReply(
      { ok: false, status: 403, body: { ...PREMIUM_REQUIRED_BODY, premium_url: 'http://evil.example.com' } },
      'bilegrip'
    )
    expect(notHttps.description).toBe(
      'Bot lookups are part of LootList+ Premium. An officer can upgrade **Test Guild** at https://www.getlootlist.com/premium.'
    )
  })

  it('returns the existing generic try-again embed for a 403 with an unrecognized error code', () => {
    const embed = priorityReply({ ok: false, status: 403, body: { error: 'something_else' } }, 'bilegrip')
    expect(embed.description).toBe("LootList+ couldn't run that lookup. Try again in a sec.")
  })
})

describe('scoreReply', () => {
  it('returns the existing notLinkedEmbed for no_guild_linked', () => {
    const embed = scoreReply({ ok: false, status: 404, body: { error: 'no_guild_linked' } }, 'Thrall')
    expect(embed.description).toContain("isn't linked to a LootList+ guild yet")
  })

  it('returns the existing character-not-found text for character_not_found', () => {
    const embed = scoreReply(
      { ok: false, status: 404, body: { error: 'character_not_found', character_name: 'Thrall' } },
      'Thrall'
    )
    expect(embed.description).toBe("Couldn't find a character named **Thrall** in this guild.")
  })

  it('returns C-5 for a 403 premium_required answer', () => {
    const embed = scoreReply({ ok: false, status: 403, body: PREMIUM_REQUIRED_BODY }, 'Thrall')
    expect(embed.color).toBe(0xff8000)
    expect(embed.description).toBe(
      'Bot lookups are part of LootList+ Premium. An officer can upgrade **Test Guild** at https://www.getlootlist.com/premium.'
    )
  })

  it('returns the existing generic try-again text for a 500 answer', () => {
    const embed = scoreReply({ ok: false, status: 500, body: { error: 'Internal server error' } }, 'Thrall')
    expect(embed.description).toBe("LootList+ couldn't load that score. Try again in a sec.")
  })

  it('returns the existing title, description lines and footer for an ok answer', () => {
    const embed = scoreReply(
      {
        ok: true,
        status: 200,
        body: {
          character_name: 'Active',
          guild_name: 'Test Guild',
          team_name: null,
          attendance: { score: 2, max_score: 4, score_percent: 50, raids_attended: 3, raids_in_window: 4 },
          rolling_weeks: 4,
        },
      },
      'Active'
    )
    expect(embed.title).toBe('Active \u2014 Loot Score')
    expect(embed.description).toBe('**Attendance credit:** 2 / 4 (50%)\n**Raids attended:** 3 of 4 tracked (last 4 weeks)')
    expect(embed.footer).toEqual({ text: 'Test Guild \u00b7 LootList+' })
  })
})
