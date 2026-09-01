import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { syncPremiumDiscordRole } from '../discord-premium'

/**
 * Minimal chainable Supabase fake keyed by table name, matching the
 * project's existing mock convention (see lib/__tests__/loot-items-query.test.ts).
 * Every intermediate method returns the builder; `maybeSingle` is the only
 * terminal and resolves `{ data, error }` from the table's queued response.
 *
 * The three chains this module actually issues:
 *   .from('guilds').select('created_by').eq('id', guildId).maybeSingle()
 *   .from('user_preferences').select('discord_id').eq('user_id', userId).maybeSingle()
 *   .from('guilds').select('id').eq('created_by', userId).eq('subscription_tier', 'pro').neq('id', guildId).limit(1).maybeSingle()
 */
type MaybeSingleResult = { data: Record<string, unknown> | null; error: null }

function makeMockSupabase(responses: {
  guildCreatedBy?: MaybeSingleResult
  userPrefs?: MaybeSingleResult
  otherProGuild?: MaybeSingleResult
}) {
  const guildsCalls: Array<'created_by' | 'other_pro_guild'> = []

  function fromBuilder(table: string) {
    let selectedCols = ''

    const builder = {
      select(cols: string) {
        selectedCols = cols
        return builder
      },
      eq() {
        return builder
      },
      neq() {
        return builder
      },
      limit() {
        return builder
      },
      maybeSingle(): Promise<MaybeSingleResult> {
        if (table === 'guilds' && selectedCols === 'created_by') {
          guildsCalls.push('created_by')
          return Promise.resolve(responses.guildCreatedBy ?? { data: null, error: null })
        }
        if (table === 'guilds' && selectedCols === 'id') {
          guildsCalls.push('other_pro_guild')
          return Promise.resolve(responses.otherProGuild ?? { data: null, error: null })
        }
        if (table === 'user_preferences') {
          return Promise.resolve(responses.userPrefs ?? { data: null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
    }
    return builder
  }

  return { from: fromBuilder } as unknown as SupabaseClient
}

const ENV_KEYS = ['DISCORD_BOT_TOKEN', 'DISCORD_COMMUNITY_GUILD_ID', 'DISCORD_PREMIUM_ROLE_ID'] as const
const ORIGINAL_ENV: Record<string, string | undefined> = {}

function setFullEnv() {
  process.env.DISCORD_BOT_TOKEN = 'bot-token'
  process.env.DISCORD_COMMUNITY_GUILD_ID = 'community-guild-id'
  process.env.DISCORD_PREMIUM_ROLE_ID = 'premium-role-id'
}

beforeEach(() => {
  for (const key of ENV_KEYS) ORIGINAL_ENV[key] = process.env[key]
  setFullEnv()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 204, text: () => Promise.resolve('') })
  )
})

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (ORIGINAL_ENV[key] === undefined) delete process.env[key]
    else process.env[key] = ORIGINAL_ENV[key]
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('syncPremiumDiscordRole', () => {
  it('issues zero HTTP calls when any Discord env var is unset', async () => {
    delete process.env.DISCORD_COMMUNITY_GUILD_ID
    const supabase = makeMockSupabase({ userPrefs: { data: { discord_id: 'disc-1' }, error: null } })

    await syncPremiumDiscordRole(supabase, 'guild-1', 'user-1', true)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('grants the role with a single PUT to the role URL', async () => {
    const supabase = makeMockSupabase({ userPrefs: { data: { discord_id: 'disc-1' }, error: null } })

    await syncPremiumDiscordRole(supabase, 'guild-1', 'user-1', true)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.method).toBe('PUT')
    expect(url).toMatch(/\/roles\/premium-role-id$/)
  })

  it('revokes with a single DELETE when the purchaser owns no other pro guild', async () => {
    const supabase = makeMockSupabase({
      userPrefs: { data: { discord_id: 'disc-1' }, error: null },
      otherProGuild: { data: null, error: null },
    })

    await syncPremiumDiscordRole(supabase, 'guild-1', 'user-1', false)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(init.method).toBe('DELETE')
  })

  it('skips the revoke entirely when the purchaser still owns another pro guild (two-guild regression)', async () => {
    const supabase = makeMockSupabase({
      userPrefs: { data: { discord_id: 'disc-1' }, error: null },
      otherProGuild: { data: { id: 'other-guild' }, error: null },
    })

    await syncPremiumDiscordRole(supabase, 'guild-1', 'user-1', false)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('falls back to guilds.created_by when purchaserUserId is null', async () => {
    const supabase = makeMockSupabase({
      guildCreatedBy: { data: { created_by: 'creator-1' }, error: null },
      userPrefs: { data: { discord_id: 'disc-1' }, error: null },
    })

    await syncPremiumDiscordRole(supabase, 'guild-1', null, true)

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('issues zero HTTP calls when purchaserUserId is null and the guild has no creator', async () => {
    const supabase = makeMockSupabase({ guildCreatedBy: { data: null, error: null } })

    await syncPremiumDiscordRole(supabase, 'guild-1', null, true)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('issues zero HTTP calls when the purchaser has no linked discord_id', async () => {
    const supabase = makeMockSupabase({ userPrefs: { data: null, error: null } })

    await syncPremiumDiscordRole(supabase, 'guild-1', 'user-1', true)

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('resolves without throwing and logs no error on a 404 (member not in server)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') })
    )
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = makeMockSupabase({ userPrefs: { data: { discord_id: 'disc-1' }, error: null } })

    await expect(syncPremiumDiscordRole(supabase, 'guild-1', 'user-1', true)).resolves.toBeUndefined()

    expect(errorSpy).not.toHaveBeenCalled()
  })
})
