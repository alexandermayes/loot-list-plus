// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  SET_YOUR_FIVE_BODY,
  SET_YOUR_FIVE_CTA,
  SET_YOUR_FIVE_TITLE,
  buildSetYourFiveMessage,
  buildSetYourFiveUrl,
  parseSetYourFiveParams,
  pickLinkCharacter,
  resolveAppOrigin,
} from '@/domain/loot/set-your-five'

// Why these cases: the Discord message, the Overview card and the deep link all
// read this one module (D-14, D-23, D-24), so the copy, the link shape and the
// "which character opens the picker" rule have to hold here. All ids are
// synthetic.

const GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

describe('[D-14, D-23] shared copy', () => {
  it('uses the locked title, the draft body and the draft button label', () => {
    expect(SET_YOUR_FIVE_TITLE).toBe('Set your 5 for Forever raids (1 minute)')
    expect(SET_YOUR_FIVE_BODY).toBe(
      'Pick the five gear needs you want most. Officers review your list before it counts.',
    )
    expect(SET_YOUR_FIVE_CTA).toBe('Set my 5')
  })

  it('has no em dash in any of it', () => {
    for (const text of [SET_YOUR_FIVE_TITLE, SET_YOUR_FIVE_BODY, SET_YOUR_FIVE_CTA]) {
      expect(text).not.toContain('—')
    }
  })
})

describe('resolveAppOrigin', () => {
  it('uses NEXT_PUBLIC_APP_URL without a trailing slash', () => {
    expect(resolveAppOrigin({ NEXT_PUBLIC_APP_URL: 'https://example.test/' })).toBe('https://example.test')
  })

  it('falls back to the canonical origin', () => {
    expect(resolveAppOrigin({})).toBe('https://www.getlootlist.com')
    expect(resolveAppOrigin({ NEXT_PUBLIC_APP_URL: '' })).toBe('https://www.getlootlist.com')
  })
})

describe('[D-24] buildSetYourFiveUrl', () => {
  it('builds the picker link from the origin and the guild id', () => {
    expect(buildSetYourFiveUrl('https://www.getlootlist.com/', 'g-1')).toBe(
      'https://www.getlootlist.com/loot-list?guild=g-1&picker=1',
    )
  })

  it('carries only the guild and picker parameters', () => {
    const url = new URL(buildSetYourFiveUrl('https://www.getlootlist.com', GUILD_ID))
    expect([...url.searchParams.keys()].sort()).toEqual(['guild', 'picker'])
    expect(url.search).not.toMatch(/character|token|code|key/i)
  })

  it('encodes the guild id', () => {
    expect(buildSetYourFiveUrl('https://x.test', 'a b&c')).toBe('https://x.test/loot-list?guild=a%20b%26c&picker=1')
  })
})

describe('[D-23] buildSetYourFiveMessage', () => {
  const url = buildSetYourFiveUrl('https://www.getlootlist.com', GUILD_ID)
  const message = buildSetYourFiveMessage(url)

  it('puts the title and the body in plain content', () => {
    expect(message.content).toBe(`${SET_YOUR_FIVE_TITLE}\n${SET_YOUR_FIVE_BODY}`)
    expect(message.content.length).toBeLessThan(2000)
  })

  it('carries one link button and no embed', () => {
    expect(message.components).toEqual([
      { type: 1, components: [{ type: 2, style: 5, label: 'Set my 5', url }] },
    ])
    expect('embeds' in message).toBe(false)
  })

  it('pings nobody', () => {
    expect(message.allowed_mentions).toEqual({ parse: [] })
  })
})

describe('[D-24] parseSetYourFiveParams', () => {
  it('reads the guild id and the picker flag', () => {
    expect(parseSetYourFiveParams(new URLSearchParams(`guild=${GUILD_ID}&picker=1`))).toEqual({
      guildId: GUILD_ID,
      picker: true,
    })
  })

  it('gives a null guild for a value that is not a UUID', () => {
    expect(parseSetYourFiveParams(new URLSearchParams('guild=not-a-uuid&picker=1')).guildId).toBeNull()
    expect(parseSetYourFiveParams(new URLSearchParams('picker=1')).guildId).toBeNull()
  })

  it('is picker only for exactly 1', () => {
    expect(parseSetYourFiveParams(new URLSearchParams(`guild=${GUILD_ID}&picker=true`)).picker).toBe(false)
    expect(parseSetYourFiveParams(new URLSearchParams(`guild=${GUILD_ID}`)).picker).toBe(false)
  })
})

describe('[D-24] pickLinkCharacter', () => {
  const membership = (
    id: string,
    isMain: boolean,
    createdAt: string,
    over: { guild_id?: string; is_active?: boolean } = {},
  ) => ({
    guild_id: over.guild_id ?? GUILD_ID,
    is_active: over.is_active ?? true,
    character: { id, is_main: isMain, created_at: createdAt },
  })

  it('prefers the main character', () => {
    const picked = pickLinkCharacter(
      [membership('c-old', false, '2026-01-01T00:00:00Z'), membership('c-main', true, '2026-06-01T00:00:00Z')],
      GUILD_ID,
    )
    expect(picked?.id).toBe('c-main')
  })

  it('falls back to the oldest character, then the lowest id', () => {
    expect(
      pickLinkCharacter(
        [membership('c-new', false, '2026-06-01T00:00:00Z'), membership('c-old', false, '2026-01-01T00:00:00Z')],
        GUILD_ID,
      )?.id,
    ).toBe('c-old')
    expect(
      pickLinkCharacter(
        [membership('c-b', false, '2026-01-01T00:00:00Z'), membership('c-a', false, '2026-01-01T00:00:00Z')],
        GUILD_ID,
      )?.id,
    ).toBe('c-a')
  })

  it('ignores inactive memberships and other guilds', () => {
    expect(
      pickLinkCharacter(
        [
          membership('c-inactive', true, '2026-01-01T00:00:00Z', { is_active: false }),
          membership('c-other', true, '2026-01-01T00:00:00Z', { guild_id: 'other' }),
        ],
        GUILD_ID,
      ),
    ).toBeNull()
  })

  it('returns null for no memberships', () => {
    expect(pickLinkCharacter([], GUILD_ID)).toBeNull()
  })
})
