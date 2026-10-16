/**
 * LootList+ API client for the companion app.
 * Handles sync token auth and guild data exchange.
 */

import type { PendingAwardRequest } from './addon-format'

export interface SyncTokenAuth {
  token: string
  guildId: string
}

export interface GuildData {
  guildId: string
  guildName: string
  expansionId: string
  phase: number
  settings: Record<string, unknown>
  items: Array<{
    id: string
    name: string
    wowhead_id: number
    boss_name: string
    raid_name: string
    classification: string | null
    slot: string | null
    item_type: string | null
  }>
  members: Array<{
    character_id: string
    name: string
    class_token: string
    class_color: string
    spec_name: string | null
    spec_id: string | null
    role: string | null
    guild_role: string
    membership_status: string
    items: Array<{ wowhead_id: number; rank: number }>
  }>
  priorities: Record<string, unknown>
  blp: Record<string, Record<string, number>>
  attendance: Record<string, unknown>
}

/**
 * What the server said about one submitted request. status is the HTTP
 * status, or null when the fetch itself threw (network down, DNS, abort).
 * error is the server body's `error` string when the body was JSON and had
 * one, truncated to 200 characters, or the thrown Error's message; null
 * otherwise. It is kept for the stuck-entry store's diagnostics only and is
 * never shown in the status (GH #320).
 */
export interface SubmitOutcome {
  status: number | null
  error: string | null
}

/**
 * accepted holds the indices, into the array that was submitted, of the
 * requests that got a 2xx. A 200 with already_recorded is a repeat the
 * server already has and counts as accepted; any other status or a thrown
 * fetch is a reject, which the sync engine keeps in SavedVariables for the
 * next pass (GH #320). outcomes[i] describes input i, accepted or not, so
 * the engine can tell a permanent rejection (400, 404, 422) from a transient
 * one and stop resending the former after a few passes (GH #320 follow-up).
 */
export interface SubmitResult {
  processed: number
  errors: number
  accepted: number[]
  outcomes: SubmitOutcome[]
}

/** Longest server error string kept on an outcome. */
const MAX_ERROR_LENGTH = 200

export class ApiClient {
  private baseUrl: string
  private auth: SyncTokenAuth | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  setAuth(auth: SyncTokenAuth) {
    this.auth = auth
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.auth) {
      headers['Authorization'] = `Bearer ${this.auth.token}`
    }
    return headers
  }

  /**
   * The `error` string of a rejection's JSON body, truncated, or null when
   * the body is not JSON or has no string error. Only called on non-ok
   * responses; an accepted response's body is not read, as before.
   */
  private async rejectionError(res: Response): Promise<string | null> {
    const body: unknown = await res.json().catch(() => null)
    if (body === null || typeof body !== 'object') return null
    const error = (body as Record<string, unknown>)['error']
    return typeof error === 'string' ? error.slice(0, MAX_ERROR_LENGTH) : null
  }

  /** The outcome of a fetch that threw, for the catch branches below. */
  private thrownOutcome(err: unknown): SubmitOutcome {
    return { status: null, error: err instanceof Error ? err.message.slice(0, MAX_ERROR_LENGTH) : null }
  }

  /**
   * Fetch full guild data for the addon
   */
  async getGuildData(): Promise<GuildData> {
    if (!this.auth) throw new Error('Not authenticated')

    const res = await fetch(
      `${this.baseUrl}/api/addon/guild-data?guild_id=${this.auth.guildId}`,
      { headers: this.getHeaders() }
    )

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${res.status}`)
    }

    return res.json()
  }

  /**
   * Generate export string for the addon
   */
  async getExportString(): Promise<{ exportString: string; stats: { items: number; members: number } }> {
    if (!this.auth) throw new Error('Not authenticated')

    const res = await fetch(
      `${this.baseUrl}/api/addon/export-string?guild_id=${this.auth.guildId}`,
      { headers: this.getHeaders() }
    )

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `API error: ${res.status}`)
    }

    return res.json()
  }

  /**
   * Submit loot awards from the addon. Each award is posted as is, so
   * awarded_at and award_id reach the server when the addon recorded them.
   * The result lists the indices of the accepted awards (GH #320).
   */
  async submitAwards(awards: PendingAwardRequest[]): Promise<SubmitResult> {
    if (!this.auth) throw new Error('Not authenticated')

    let processed = 0
    let errors = 0
    const accepted: number[] = []
    const outcomes: SubmitOutcome[] = []

    for (let i = 0; i < awards.length; i++) {
      const award = awards[i]
      try {
        const res = await fetch(`${this.baseUrl}/api/addon/loot-award`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            guild_id: this.auth.guildId,
            ...award,
          }),
        })
        if (res.ok) {
          processed++
          accepted.push(i)
        } else {
          errors++
        }
        outcomes.push({ status: res.status, error: res.ok ? null : await this.rejectionError(res) })
      } catch (err) {
        errors++
        outcomes.push(this.thrownOutcome(err))
      }
    }

    return { processed, errors, accepted, outcomes }
  }

  /**
   * Submit attendance from the addon. The result lists the indices of the
   * accepted records (GH #320).
   */
  async submitAttendance(records: Array<{
    raid_date: string
    raid_name: string
    start_time?: string
    attended: string[]
    boss_kills?: Array<{ boss_name: string }>
  }>): Promise<SubmitResult> {
    if (!this.auth) throw new Error('Not authenticated')

    let processed = 0
    let errors = 0
    const accepted: number[] = []
    const outcomes: SubmitOutcome[] = []

    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      try {
        const res = await fetch(`${this.baseUrl}/api/addon/attendance`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            guild_id: this.auth.guildId,
            ...record,
          }),
        })
        if (res.ok) {
          processed++
          accepted.push(i)
        } else {
          errors++
        }
        outcomes.push({ status: res.status, error: res.ok ? null : await this.rejectionError(res) })
      } catch (err) {
        errors++
        outcomes.push(this.thrownOutcome(err))
      }
    }

    return { processed, errors, accepted, outcomes }
  }
}
