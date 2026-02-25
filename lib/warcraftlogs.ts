/**
 * Warcraft Logs API v2 client.
 * Handles OAuth token management, guild URL parsing, and report fetching.
 *
 * All public functions are non-throwing. If env vars are missing, the API fails,
 * or no match is found, they return null. WCL is best-effort enrichment.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WclToken {
  access_token: string
  expires_at: number
}

export interface WclGuildInfo {
  region: string
  serverSlug: string
  guildName: string
  isClassic: boolean
}

export interface WclGuildById {
  guildId: number
  isClassic: boolean
}

export type WclGuildRef = WclGuildInfo | WclGuildById

export interface WclReport {
  code: string
  title: string
  startTime: number
  endTime: number
}

// ---------------------------------------------------------------------------
// Module-level token cache
// ---------------------------------------------------------------------------

let cachedToken: WclToken | null = null

async function getWclToken(): Promise<string | null> {
  const clientId = process.env.WARCRAFTLOGS_CLIENT_ID
  const clientSecret = process.env.WARCRAFTLOGS_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
    return cachedToken.access_token
  }

  try {
    const response = await fetch('https://www.warcraftlogs.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error('WCL token exchange failed:', response.status, body)
      return null
    }

    const data = await response.json()
    cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    }
    return cachedToken.access_token
  } catch (err) {
    console.error('WCL token exchange error:', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// URL parsing
// ---------------------------------------------------------------------------

/**
 * Parse a WCL guild page URL into its components.
 *
 * Accepts formats like:
 *   https://classic.warcraftlogs.com/guild/us/faerlina/guild-name  (slug-based)
 *   https://classic.warcraftlogs.com/guild/id/772496               (ID-based)
 *   https://www.warcraftlogs.com/guild/us/faerlina/guild-name
 */
export function parseWclGuildUrl(url: string): WclGuildRef | null {
  try {
    const parsed = new URL(url.trim())
    const hostname = parsed.hostname.toLowerCase()

    if (!hostname.endsWith('warcraftlogs.com')) return null

    const isClassic = hostname.startsWith('classic.')

    // Path segments: /guild/...
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length < 3 || segments[0] !== 'guild') return null

    // ID-based format: /guild/id/{numericId}
    if (segments[1] === 'id' && /^\d+$/.test(segments[2])) {
      return {
        guildId: parseInt(segments[2], 10),
        isClassic,
      }
    }

    // Slug-based format: /guild/{region}/{server}/{guild-name}
    if (segments.length < 4) return null

    return {
      region: segments[1].toLowerCase(),
      serverSlug: segments[2].toLowerCase(),
      guildName: decodeURIComponent(segments[3]).replace(/-/g, ' '),
      isClassic,
    }
  } catch {
    return null
  }
}

function isGuildById(ref: WclGuildRef): ref is WclGuildById {
  return 'guildId' in ref
}

// ---------------------------------------------------------------------------
// Report fetching
// ---------------------------------------------------------------------------

const WCL_API_URL = 'https://www.warcraftlogs.com/api/v2/client'

/**
 * Check whether a WCL zone name matches any of the given raid tier names.
 *
 * WCL zone names don't always match DB tier names exactly:
 *   WCL: "Gruul / Magtheridon"  DB: "Gruul's Lair", "Magtheridon's Lair"
 *   WCL: "Karazhan"             DB: "Karazhan"
 *
 * Strategy: extract the first word of each tier name and check if the
 * zone name contains it. This handles combined zones and name variants.
 */
function zoneMatchesTiers(zoneName: string, tierNames: string[]): boolean {
  const zLower = zoneName.toLowerCase()
  return tierNames.some(tier => {
    // Use the first word of the tier name (e.g. "Gruul" from "Gruul's Lair")
    const keyword = tier.split(/[\s']/)[0].toLowerCase()
    return keyword.length >= 3 && zLower.includes(keyword)
  })
}

/**
 * Fetch the WCL report matching a given raid date for a guild.
 *
 * Searches for reports within +-18h of the raid date to account for
 * timezone differences between the guild and WCL upload times.
 *
 * If raidTierNames is provided, only reports whose WCL zone matches
 * one of those tier names will be considered.
 */
export async function fetchWclReportForDate(
  guildUrl: string,
  raidDate: string,
  raidTierNames?: string[]
): Promise<WclReport | null> {
  const guildRef = parseWclGuildUrl(guildUrl)
  if (!guildRef) return null

  const token = await getWclToken()
  if (!token) return null

  // Build time window: raid date noon +-18h (in ms)
  const dateNoon = new Date(raidDate + 'T12:00:00Z').getTime()
  const windowStart = dateNoon - 18 * 60 * 60 * 1000
  const windowEnd = dateNoon + 18 * 60 * 60 * 1000

  // Resolve guild ID — needed for reportData.reports() query
  let guildId: number
  if (isGuildById(guildRef)) {
    guildId = guildRef.guildId
  } else {
    // Look up guild ID by name/server/region
    const lookupQuery = `
      query($name: String!, $serverSlug: String!, $serverRegion: String!) {
        guildData {
          guild(name: $name, serverSlug: $serverSlug, serverRegion: $serverRegion) {
            id
          }
        }
      }
    `
    try {
      const lookupRes = await fetch(WCL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: lookupQuery,
          variables: {
            name: guildRef.guildName,
            serverSlug: guildRef.serverSlug,
            serverRegion: guildRef.region,
          },
        }),
      })
      const lookupJson = await lookupRes.json()
      const resolvedId = lookupJson?.data?.guildData?.guild?.id
      if (!resolvedId) return null
      guildId = resolvedId
    } catch {
      return null
    }
  }

  // Query reports via reportData (reports field lives here, not on Guild type)
  const query = `
    query($guildID: Int!, $startTime: Float!, $endTime: Float!) {
      reportData {
        reports(guildID: $guildID, startTime: $startTime, endTime: $endTime) {
          data {
            code
            title
            startTime
            endTime
            zone { name }
          }
        }
      }
    }
  `
  const variables = {
    guildID: guildId,
    startTime: windowStart,
    endTime: windowEnd,
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(WCL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error('WCL API error:', response.status)
      return null
    }

    const json = await response.json()
    const rawReports: Array<WclReport & { zone?: { name: string } }> | undefined =
      json?.data?.reportData?.reports?.data

    if (!rawReports || rawReports.length === 0) return null

    // Filter by zone if raid tier names were provided
    let reports = rawReports
    if (raidTierNames && raidTierNames.length > 0) {
      reports = rawReports.filter(r =>
        r.zone?.name && zoneMatchesTiers(r.zone.name, raidTierNames)
      )
      if (reports.length === 0) return null
    }

    // Pick the report with startTime closest to raid date noon
    let best = reports[0]
    let bestDist = Math.abs(best.startTime - dateNoon)
    for (let i = 1; i < reports.length; i++) {
      const dist = Math.abs(reports[i].startTime - dateNoon)
      if (dist < bestDist) {
        best = reports[i]
        bestDist = dist
      }
    }

    return best
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error('WCL API request timed out')
    } else {
      console.error('WCL API request error:', err)
    }
    return null
  }
}

/**
 * Check whether WCL API credentials are configured.
 */
export function isWclConfigured(): boolean {
  return !!(process.env.WARCRAFTLOGS_CLIENT_ID && process.env.WARCRAFTLOGS_CLIENT_SECRET)
}

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

/**
 * Build the full WCL report URL from a report code.
 * Uses the classic subdomain when the guild URL indicates classic.
 */
export function getWclReportUrl(reportCode: string, guildUrl?: string | null): string {
  const guildRef = guildUrl ? parseWclGuildUrl(guildUrl) : null
  const isClassic = guildRef ? guildRef.isClassic : true
  const host = isClassic
    ? 'https://classic.warcraftlogs.com'
    : 'https://www.warcraftlogs.com'
  return `${host}/reports/${reportCode}`
}
