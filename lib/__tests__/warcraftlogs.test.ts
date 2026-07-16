import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseWclGuildUrl, wclApiUrlForSubdomain, fetchWclReportForDate } from '../warcraftlogs'

describe('parseWclGuildUrl', () => {
  it('parses an ID-based fresh (Anniversary) guild URL', () => {
    const ref = parseWclGuildUrl('https://fresh.warcraftlogs.com/guild/id/825913')
    expect(ref).toEqual({ guildId: 825913, isClassic: true, subdomain: 'fresh' })
  })

  it('parses an ID-based classic guild URL', () => {
    const ref = parseWclGuildUrl('https://classic.warcraftlogs.com/guild/id/772496')
    expect(ref).toEqual({ guildId: 772496, isClassic: true, subdomain: 'classic' })
  })

  it('parses a slug-based retail guild URL', () => {
    const ref = parseWclGuildUrl('https://www.warcraftlogs.com/guild/us/faerlina/guild-name')
    expect(ref).toEqual({
      region: 'us',
      serverSlug: 'faerlina',
      guildName: 'guild name',
      isClassic: false,
      subdomain: 'www',
    })
  })

  it('rejects non-WCL hosts', () => {
    expect(parseWclGuildUrl('https://evil.com/guild/id/1')).toBeNull()
    expect(parseWclGuildUrl('not a url')).toBeNull()
  })
})

describe('wclApiUrlForSubdomain', () => {
  // Regression guard for #124: Fresh/Anniversary (and other classic-flavor)
  // website subdomains have no /api/v2/client endpoint. Every non-retail
  // subdomain must route to the classic API host, or report linking fails
  // with a misleading "no matching report found".
  it('routes retail (www) to the retail API host', () => {
    expect(wclApiUrlForSubdomain('www')).toBe('https://www.warcraftlogs.com/api/v2/client')
  })

  it('routes classic to the classic API host', () => {
    expect(wclApiUrlForSubdomain('classic')).toBe('https://classic.warcraftlogs.com/api/v2/client')
  })

  it.each(['fresh', 'vanilla', 'sod', 'era', 'cata'])(
    'collapses the %s frontend subdomain to the classic API host',
    (subdomain) => {
      expect(wclApiUrlForSubdomain(subdomain)).toBe('https://classic.warcraftlogs.com/api/v2/client')
    }
  )
})

describe('fetchWclReportForDate', () => {
  // End-to-end guard for #124: a Fresh/Anniversary guild URL must send its
  // report query to the classic API host, not fresh.warcraftlogs.com (which
  // has no /api/v2/client endpoint). Asserting on the actual request URL
  // proves the fix at the level the bug occurred, not just the seam.
  const RAID_DATE = '2026-07-01'
  const REPORT_START = new Date(RAID_DATE + 'T12:00:00Z').getTime()

  function jsonResponse(body: unknown) {
    return { ok: true, status: 200, json: async () => body, text: async () => '' }
  }

  beforeEach(() => {
    vi.stubEnv('WARCRAFTLOGS_CLIENT_ID', 'test-id')
    vi.stubEnv('WARCRAFTLOGS_CLIENT_SECRET', 'test-secret')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('queries the classic API host for an ID-based Fresh guild URL', async () => {
    const fetchMock = vi.fn(async (url: string | URL) => {
      const u = String(url)
      if (u.includes('/oauth/token')) {
        return jsonResponse({ access_token: 'test-token', expires_in: 3600 })
      }
      if (u.includes('/api/v2/client')) {
        return jsonResponse({
          data: {
            reportData: {
              reports: {
                data: [
                  { code: 'aBc123', title: 'BT', startTime: REPORT_START, endTime: REPORT_START + 3_600_000 },
                ],
              },
            },
          },
        })
      }
      throw new Error(`unexpected fetch to ${u}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const report = await fetchWclReportForDate(
      'https://fresh.warcraftlogs.com/guild/id/825913',
      RAID_DATE
    )

    expect(report?.code).toBe('aBc123')

    // The GraphQL report query must have gone to the classic API host.
    const apiCalls = fetchMock.mock.calls.filter(
      ([u]) => new URL(String(u)).pathname === '/api/v2/client'
    )
    expect(apiCalls).toHaveLength(1)
    expect(String(apiCalls[0][0])).toBe('https://classic.warcraftlogs.com/api/v2/client')
    // Regression assertion: the dead fresh host must never be contacted.
    const hosts = fetchMock.mock.calls.map(([u]) => new URL(String(u)).hostname)
    expect(hosts).not.toContain('fresh.warcraftlogs.com')
  })
})
