/**
 * LootList+ API client for the companion app.
 * Handles sync token auth and guild data exchange.
 */

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
   * Submit loot awards from the addon
   */
  async submitAwards(awards: Array<{
    wowhead_id: number
    character_name: string
    boss_name?: string
    awarded_date?: string
  }>): Promise<{ processed: number; errors: number }> {
    if (!this.auth) throw new Error('Not authenticated')

    let processed = 0
    let errors = 0

    for (const award of awards) {
      try {
        const res = await fetch(`${this.baseUrl}/api/addon/loot-award`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            guild_id: this.auth.guildId,
            ...award,
          }),
        })
        if (res.ok) processed++
        else errors++
      } catch {
        errors++
      }
    }

    return { processed, errors }
  }

  /**
   * Submit attendance from the addon
   */
  async submitAttendance(records: Array<{
    raid_date: string
    raid_name: string
    attended: string[]
    boss_kills?: Array<{ boss_name: string }>
  }>): Promise<{ processed: number; errors: number }> {
    if (!this.auth) throw new Error('Not authenticated')

    let processed = 0
    let errors = 0

    for (const record of records) {
      try {
        const res = await fetch(`${this.baseUrl}/api/addon/attendance`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            guild_id: this.auth.guildId,
            ...record,
          }),
        })
        if (res.ok) processed++
        else errors++
      } catch {
        errors++
      }
    }

    return { processed, errors }
  }
}
