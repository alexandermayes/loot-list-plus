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
import { logAudit } from '@/utils/audit/log'
import {
  SET_YOUR_FIVE_COOLDOWN_ERROR,
  SET_YOUR_FIVE_NOT_OFFICER_ERROR,
  SET_YOUR_FIVE_NO_CHANNEL_ERROR,
  SET_YOUR_FIVE_NO_DISCOVERY_ERROR,
  SET_YOUR_FIVE_POST_FAILED_ERROR,
  buildSetYourFiveMessage,
  buildSetYourFiveUrl,
} from '@/domain/loot/set-your-five'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/lib/discord', () => ({ discordFetch: vi.fn(), sendDirectMessage: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))

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

  // regression for WR-02 (Phase 4 review): the stored channel id is officer
  // text, and fetch normalises dot segments, so a value with a path in it
  // would re-target the bot-token POST at another Discord API path.
  it.each([
    ['a path with dot segments', '700000000000000001/../../guilds/700000000000000002/x?'],
    ['letters', '70000000000000000a'],
    ['a query string', '700000000000000001?x=1'],
    ['too few digits', '7000000000000000'],
    ['too many digits', '700000000000000000001'],
    ['surrounding space', ' 700000000000000001'],
  ])('answers 400 with the no-channel error for %s, with no Discord call', async (_label, channelId) => {
    fixture.channelId = channelId
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe(SET_YOUR_FIVE_NO_CHANNEL_ERROR)
    expect(discordFetch).not.toHaveBeenCalled()
    expect(sendDirectMessage).not.toHaveBeenCalled()
  })
})

// ─── Task 2: gates, cooldown, bounded DMs, quiet refusals ───

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

function manyMembers(count: number) {
  fixture.memberships = Array.from({ length: count }, (_, i) => ({ user_id: userId(i + 1) }))
  fixture.prefs = Array.from({ length: count }, (_, i) => ({ user_id: userId(i + 1), discord_id: discordIdOf(i + 1) }))
}

function expectNoDiscordCalls() {
  expect(discordFetch).not.toHaveBeenCalled()
  expect(sendDirectMessage).not.toHaveBeenCalled()
}

describe('[T-04-18-01] who may send', () => {
  it('refuses a user without manage_settings with 403 and no Discord call', async () => {
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as never)
    const response = await POST(request())
    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe(SET_YOUR_FIVE_NOT_OFFICER_ERROR)
    expectNoDiscordCalls()
    expect(calls.filter((c) => c.table !== 'guilds')).toEqual([])
  })
})

describe('[D-23] the Discovery gate', () => {
  it('answers 400 when the active expansion has no guild-active Discovery tier', async () => {
    fixture.tiers = [
      { id: 't-known', list_mode: 'known', is_guild_active: true },
      { id: 't-off', list_mode: 'discovery', is_guild_active: false },
    ]
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe(SET_YOUR_FIVE_NO_DISCOVERY_ERROR)
    expectNoDiscordCalls()
  })

  it('answers the same 400 when the guild has no active expansion', async () => {
    fixture.activeExpansionId = null
    const response = await POST(request())
    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe(SET_YOUR_FIVE_NO_DISCOVERY_ERROR)
    expectNoDiscordCalls()
  })

  it('asks the tier table for the active expansion, Discovery mode and a guild-active tier', async () => {
    await POST(request())
    const tierRead = calls.find((c) => c.table === 'raid_tiers')
    expect(tierRead?.filters).toEqual(
      expect.arrayContaining([
        ['eq', 'expansion_id', EXPANSION_ID],
        ['eq', 'list_mode', 'discovery'],
        ['eq', 'is_guild_active', true],
      ]),
    )
  })

  it('checks the Discovery gate before the channel', async () => {
    fixture.tiers = []
    fixture.channelId = null
    const response = await POST(request())
    expect((await response.json()).error).toBe(SET_YOUR_FIVE_NO_DISCOVERY_ERROR)
  })
})

describe('[D-30] the 60-minute cooldown', () => {
  it('answers 429 with the minutes left when the last send was 20 minutes ago', async () => {
    fixture.auditRows = [{ created_at: minutesAgo(20) }]
    const response = await POST(request())
    expect(response.status).toBe(429)
    expect(await response.json()).toEqual({ error: SET_YOUR_FIVE_COOLDOWN_ERROR, retry_after_minutes: 40 })
    expectNoDiscordCalls()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('reads the latest send row for this guild only', async () => {
    await POST(request())
    const auditRead = calls.find((c) => c.table === 'audit_logs')
    expect(auditRead?.filters).toEqual(
      expect.arrayContaining([
        ['eq', 'guild_id', GUILD_ID],
        ['eq', 'table_name', 'set_your_five_sends'],
      ]),
    )
  })

  it('does not block when the last send was 61 minutes ago', async () => {
    fixture.auditRows = [{ created_at: minutesAgo(61) }]
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(discordFetch).toHaveBeenCalledTimes(1)
  })

  it('writes the send row after the channel post, counts only', async () => {
    await POST(request())
    expect(logAudit).toHaveBeenCalledTimes(1)
    expect(logAudit).toHaveBeenCalledWith({
      supabase: expect.anything(),
      guildId: GUILD_ID,
      tableName: 'set_your_five_sends',
      recordId: GUILD_ID,
      action: 'INSERT',
      userId: SENDER_ID,
      newData: { posted: true },
    })
    const auditOrder = vi.mocked(logAudit).mock.invocationCallOrder[0]
    expect(vi.mocked(discordFetch).mock.invocationCallOrder[0]).toBeLessThan(auditOrder)
    expect(vi.mocked(sendDirectMessage).mock.invocationCallOrder[0]).toBeGreaterThan(auditOrder)
  })
})

describe('channel post failure', () => {
  it('answers 502 with no DMs and no send row when Discord refuses the post', async () => {
    vi.mocked(discordFetch).mockResolvedValue({ ok: false, status: 403 } as Response)
    const response = await POST(request())
    expect(response.status).toBe(502)
    expect((await response.json()).error).toBe(SET_YOUR_FIVE_POST_FAILED_ERROR)
    expect(sendDirectMessage).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('answers 502 the same way when the request itself throws', async () => {
    vi.mocked(discordFetch).mockRejectedValue(new Error('network'))
    const response = await POST(request())
    expect(response.status).toBe(502)
    expect(sendDirectMessage).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })
})

describe('[D-30] DM outcomes', () => {
  it('counts a 403 refusal as skipped without logging an error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(sendDirectMessage)
      .mockResolvedValueOnce({ ok: true, stage: 'send_message', status: 200 })
      .mockResolvedValueOnce({ ok: false, stage: 'open_channel', status: 403 })
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 1, skipped: 1 })
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('counts any other failure as skipped and logs a fixed message with stage and status only', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(sendDirectMessage)
      .mockResolvedValueOnce({ ok: true, stage: 'send_message', status: 200 })
      .mockResolvedValueOnce({ ok: false, stage: 'send_message', status: 500 })
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 1, skipped: 1 })
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('[set-your-five] DM send failed', { stage: 'send_message', status: 500 })
    errorSpy.mockRestore()
  })

  it('logs a null status for a failure that never reached Discord', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(sendDirectMessage).mockResolvedValue({ ok: false, stage: 'open_channel', status: null })
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 0, skipped: 2 })
    expect(errorSpy).toHaveBeenCalledWith('[set-your-five] DM send failed', { stage: 'open_channel', status: null })
    errorSpy.mockRestore()
  })
})

describe('[DISC-11 ordering] who is counted', () => {
  it('counts a member without a Discord id as skipped', async () => {
    fixture.prefs = [{ user_id: userId(1), discord_id: discordIdOf(1) }]
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 1, skipped: 1 })
    expect(sendDirectMessage).toHaveBeenCalledTimes(1)
  })

  it('counts a user with two characters once and sends them one DM', async () => {
    fixture.memberships = [{ user_id: userId(1) }, { user_id: userId(1) }, { user_id: userId(2) }]
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 2, skipped: 0 })
    const recipients = vi.mocked(sendDirectMessage).mock.calls.map((c) => c[1])
    expect(recipients.filter((id) => id === discordIdOf(1))).toHaveLength(1)
  })

  it('never messages the sender', async () => {
    fixture.memberships.push({ user_id: SENDER_ID })
    fixture.prefs.push({ user_id: SENDER_ID, discord_id: discordIdOf(99) })
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 2, skipped: 0 })
    expect(vi.mocked(sendDirectMessage).mock.calls.map((c) => c[1])).not.toContain(discordIdOf(99))
  })

  it('answers zero counts when nobody else is in the guild', async () => {
    fixture.memberships = [{ user_id: SENDER_ID }]
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 0, skipped: 0 })
    expect(discordFetch).toHaveBeenCalledTimes(1)
  })
})

// regression for WR-03 (Phase 4 review): every Discord call carries one
// deadline from the start of the request, so a long Retry-After on a DM can
// never run the function past maxDuration after the channel post has landed.
describe('[WR-03] the request deadline', () => {
  const DEADLINE_MS = 55_000

  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes one abort signal to the channel post and to every DM', async () => {
    await POST(request())

    const [, init] = vi.mocked(discordFetch).mock.calls[0]
    const signal = init?.signal
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)
    expect(sendDirectMessage).toHaveBeenCalledTimes(2)
    for (const call of vi.mocked(sendDirectMessage).mock.calls) {
      expect(call[3]).toEqual({ signal })
    }
  })

  it('counts a DM still in flight at the deadline as skipped, with no error log', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const abortedWhenAnswered: boolean[] = []
    vi.mocked(sendDirectMessage).mockImplementation(async (_token, _recipient, _body, options) => {
      // Discord holds the DM until the deadline passes.
      vi.advanceTimersByTime(DEADLINE_MS)
      abortedWhenAnswered.push(options?.signal?.aborted ?? false)
      return { ok: false, stage: 'send_message', status: null }
    })

    const response = await POST(request())

    // The first DM was in flight at the deadline; the second never started,
    // because the 45 second budget had passed by then. Both count as skipped.
    expect(await response.json()).toEqual({ posted: true, sent: 0, skipped: 2 })
    expect(abortedWhenAnswered).toEqual([true])
    expect(sendDirectMessage).toHaveBeenCalledTimes(1)
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('still logs a DM failure that happened before the deadline', async () => {
    vi.useFakeTimers()
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(sendDirectMessage).mockResolvedValue({ ok: false, stage: 'send_message', status: 500 })

    const response = await POST(request())

    expect(await response.json()).toEqual({ posted: true, sent: 0, skipped: 2 })
    expect(errorSpy).toHaveBeenCalledTimes(2)
    errorSpy.mockRestore()
  })

  it('answers 502 when the channel post itself is cut off at the deadline', async () => {
    vi.useFakeTimers()
    vi.mocked(discordFetch).mockImplementation(async (_url, init) => {
      vi.advanceTimersByTime(DEADLINE_MS)
      expect(init?.signal?.aborted).toBe(true)
      return { ok: false, status: 429 } as Response
    })

    const response = await POST(request())

    expect(response.status).toBe(502)
    expect(sendDirectMessage).not.toHaveBeenCalled()
  })
})

describe('[D-30] bounded DMs', () => {
  it('keeps at most 5 DMs in flight with 12 recipients', async () => {
    manyMembers(12)
    let inFlight = 0
    let peak = 0
    vi.mocked(sendDirectMessage).mockImplementation(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
      return { ok: true, stage: 'send_message', status: 200 }
    })
    const response = await POST(request())
    expect(await response.json()).toEqual({ posted: true, sent: 12, skipped: 0 })
    expect(sendDirectMessage).toHaveBeenCalledTimes(12)
    expect(peak).toBe(5)
  })

  it('stops starting new DMs after the 45-second budget and counts the rest as skipped', async () => {
    manyMembers(12)
    const realNow = Date.now()
    let clock = realNow
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => clock)
    vi.mocked(sendDirectMessage).mockImplementation(async () => {
      // Each finished DM moves the clock on 10 seconds, so the 45-second
      // budget runs out part way through the list.
      await Promise.resolve()
      clock += 10_000
      return { ok: true, stage: 'send_message', status: 200 }
    })
    const response = await POST(request())
    nowSpy.mockRestore()
    const body = await response.json()
    expect(body.posted).toBe(true)
    expect(body.sent + body.skipped).toBe(12)
    expect(body.sent).toBeGreaterThanOrEqual(5)
    expect(body.sent).toBeLessThan(12)
    expect(body.skipped).toBeGreaterThan(0)
  })
})

describe('[T-04-18-03] counts only, nothing identifying', () => {
  it('puts no Discord id, user id or name in any console argument or in the response', async () => {
    const spies = (['error', 'warn', 'log', 'info'] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => {}))
    vi.mocked(sendDirectMessage)
      .mockResolvedValueOnce({ ok: false, stage: 'send_message', status: 500 })
      .mockResolvedValueOnce({ ok: false, stage: 'open_channel', status: 403 })
    const response = await POST(request())
    const text = JSON.stringify(await response.json())
    const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls))
    spies.forEach((spy) => spy.mockRestore())

    for (const needle of [discordIdOf(1), discordIdOf(2), userId(1), userId(2), SENDER_ID, CHANNEL_ID, BOT_TOKEN]) {
      expect(text).not.toContain(needle)
      expect(logged).not.toContain(needle)
    }
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['posted', 'sent', 'skipped'])
  })

  it('pings nobody on the channel post or any DM', async () => {
    await POST(request())
    const [, init] = vi.mocked(discordFetch).mock.calls[0]
    expect(JSON.parse(init?.body as string).allowed_mentions).toEqual({ parse: [] })
    for (const [, , body] of vi.mocked(sendDirectMessage).mock.calls) {
      expect((body as { allowed_mentions: unknown }).allowed_mentions).toEqual({ parse: [] })
    }
  })

  it('puts no character id or token in the link', async () => {
    await POST(request())
    const [, init] = vi.mocked(discordFetch).mock.calls[0]
    const button = JSON.parse(init?.body as string).components[0].components[0]
    const url = new URL(button.url)
    expect([...url.searchParams.keys()].sort()).toEqual(['guild', 'picker'])
    expect(button.url).not.toContain(BOT_TOKEN)
  })
})

describe('[D-30] route config', () => {
  it('sets a maxDuration', async () => {
    const route = await import('../route')
    expect(route.maxDuration).toBe(60)
  })
})
