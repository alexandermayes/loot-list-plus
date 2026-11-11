// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { discordFetch, sendDirectMessage } from '@/lib/discord'
import {
  SET_YOUR_FIVE_NO_CHANNEL_ERROR,
  buildSetYourFiveMessage,
  buildSetYourFiveUrl,
} from '@/domain/loot/set-your-five'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/lib/discord', () => ({ discordFetch: vi.fn(), sendDirectMessage: vi.fn() }))

// Why these cases: the route messages a whole guild, so it must post once with
// one safe link, reach each member once, and answer with counts only. Every id
// below is synthetic.

const GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const EXPANSION_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const CHANNEL_ID = '700000000000000001'
const SENDER_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const BOT_TOKEN = 'test-bot-token-not-real'
const APP_URL = 'https://app.example.test'

const userId = (n: number) => `eeeeeeee-0000-0000-0000-0000000001${String(n).padStart(2, '0')}`
const discordIdOf = (n: number) => `8000000000000001${String(n).padStart(2, '0')}`

interface Fixture {
  channelId: string | null
  activeExpansionId: string | null
  tiers: Array<{ id: string; list_mode: string; is_guild_active: boolean }>
  // One row per active character; a user with two characters has two rows.
  memberships: Array<{ user_id: string }>
  prefs: Array<{ user_id: string; discord_id: string | null }>
  auditRows: Array<{ created_at: string }>
}

let fixture: Fixture
let calls: Array<{ table: string; filters: Array<[string, string, unknown]> }>

function makeBuilder(table: string) {
  const call = { table, filters: [] as Array<[string, string, unknown]> }
  calls.push(call)
  let range: [number, number] | null = null
  const result = () => {
    switch (table) {
      case 'guild_settings':
        return { data: { raid_summary_channel_id: fixture.channelId }, error: null }
      case 'guilds':
        return { data: { active_expansion_id: fixture.activeExpansionId }, error: null }
      case 'raid_tiers': {
        const wantMode = call.filters.find((f) => f[0] === 'eq' && f[1] === 'list_mode')?.[2]
        const wantActive = call.filters.find((f) => f[0] === 'eq' && f[1] === 'is_guild_active')?.[2]
        const rows = fixture.tiers.filter(
          (t) => (wantMode === undefined || t.list_mode === wantMode) && (wantActive === undefined || t.is_guild_active === wantActive),
        )
        return { data: rows.slice(0, 1), error: null }
      }
      case 'audit_logs':
        return { data: fixture.auditRows.slice(0, 1), error: null }
      case 'character_guild_memberships': {
        const rows = fixture.memberships.map((m) => ({ characters: { user_id: m.user_id } }))
        return { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null }
      }
      case 'user_preferences': {
        const wanted = (call.filters.find((f) => f[0] === 'in' && f[1] === 'user_id')?.[2] as string[]) ?? []
        const rows = fixture.prefs.filter((p) => wanted.includes(p.user_id))
        return { data: range ? rows.slice(range[0], range[1] + 1) : rows, error: null }
      }
      default:
        return { data: null, error: { message: `unexpected table ${table}` } }
    }
  }
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.eq = (column: string, value: unknown) => {
    call.filters.push(['eq', column, value])
    return builder
  }
  builder.in = (column: string, values: unknown) => {
    call.filters.push(['in', column, values])
    return builder
  }
  builder.not = () => builder
  builder.order = () => builder
  builder.limit = () => builder
  builder.range = (start: number, end: number) => {
    range = [start, end]
    return builder
  }
  builder.single = async () => result()
  builder.maybeSingle = async () => result()
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result()).then(resolve, reject)
  return builder
}

function request(body: unknown = { guild_id: GUILD_ID }) {
  return new NextRequest('http://localhost/api/discord/set-your-five', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('DISCORD_BOT_TOKEN', BOT_TOKEN)
  vi.stubEnv('NEXT_PUBLIC_APP_URL', APP_URL)
  calls = []
  fixture = {
    channelId: CHANNEL_ID,
    activeExpansionId: EXPANSION_ID,
    tiers: [{ id: 't-1', list_mode: 'discovery', is_guild_active: true }],
    memberships: [{ user_id: userId(1) }, { user_id: userId(2) }],
    prefs: [
      { user_id: userId(1), discord_id: discordIdOf(1) },
      { user_id: userId(2), discord_id: discordIdOf(2) },
    ],
    auditRows: [],
  }
  vi.mocked(createServiceRoleClient).mockReturnValue({ from: (table: string) => makeBuilder(table) } as never)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: SENDER_ID }, error: null } as never)
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  vi.mocked(discordFetch).mockResolvedValue({ ok: true, status: 200 } as Response)
  vi.mocked(sendDirectMessage).mockResolvedValue({ ok: true, stage: 'send_message', status: 200 })
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('[D-23] POST /api/discord/set-your-five tracer', () => {
  it('posts one link-button message and DMs both members with the same body', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ posted: true, sent: 2, skipped: 0 })

    const expected = buildSetYourFiveMessage(buildSetYourFiveUrl(APP_URL, GUILD_ID))
    expect(discordFetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(discordFetch).mock.calls[0]
    expect(url).toBe(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`)
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bot ${BOT_TOKEN}`)
    expect(JSON.parse(init?.body as string)).toEqual(expected)

    expect(sendDirectMessage).toHaveBeenCalledTimes(2)
    for (const [token, , body] of vi.mocked(sendDirectMessage).mock.calls) {
      expect(token).toBe(BOT_TOKEN)
      expect(body).toEqual(expected)
    }
    const recipients = vi.mocked(sendDirectMessage).mock.calls.map((c) => c[1]).sort()
    expect(recipients).toEqual([discordIdOf(1), discordIdOf(2)])
  })

  it('checks manage_settings for the sender before anything else', async () => {
    await POST(request())
    expect(verifyPermission).toHaveBeenCalledWith(expect.anything(), SENDER_ID, GUILD_ID, 'manage_settings')
  })

  it('answers 401 without a session and 400 without a guild id, with no Discord call', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({ user: null, error: new Error('no') } as never)
    expect((await POST(request())).status).toBe(401)
    expect((await POST(request({}))).status).toBe(400)
    expect(discordFetch).not.toHaveBeenCalled()
    expect(sendDirectMessage).not.toHaveBeenCalled()
  })

  it('answers 400 when no raid summary channel is set, with no Discord call', async () => {
    fixture.channelId = null
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe(SET_YOUR_FIVE_NO_CHANNEL_ERROR)
    expect(discordFetch).not.toHaveBeenCalled()
    expect(sendDirectMessage).not.toHaveBeenCalled()
  })
})
