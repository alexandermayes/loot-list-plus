import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { ApiClient, GuildData } from './api-client'
import { parseLuaTable } from './lua-parser'
import { toLuaTable } from './lua-writer'
import { WowFinder } from './wow-finder'

export interface SyncConfig {
  apiUrl: string
  guildId: string
  wowPath: string
  interval: number  // minutes
  token?: string
}

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'watching' | 'error'
  lastSync: string | null
  lastError: string | null
  pendingAwards: number
  pendingAttendance: number
}

/**
 * Orchestrates data flow between LootList+ API and WoW addon SavedVariables.
 *
 * Sync cycle:
 * 1. Fetch guild data from API
 * 2. Write to SavedVariables file (addon reads on /reload)
 * 3. Watch SavedVariables for changes (addon writes on logout)
 * 4. Read pending awards/attendance from SavedVariables
 * 5. Push to API
 * 6. Clear pending data from SavedVariables
 */
export class SyncEngine extends EventEmitter {
  private config: SyncConfig
  private api: ApiClient
  private watcher: chokidar.FSWatcher | null = null
  private syncTimer: NodeJS.Timeout | null = null
  private status: SyncStatus = {
    state: 'idle',
    lastSync: null,
    lastError: null,
    pendingAwards: 0,
    pendingAttendance: 0,
  }

  constructor(config: SyncConfig) {
    super()
    this.config = config
    this.api = new ApiClient(config.apiUrl)
    if (config.token) {
      this.api.setAuth({ token: config.token, guildId: config.guildId })
    }
  }

  /**
   * Start the sync engine
   */
  start() {
    this.updateStatus({ state: 'watching' })

    // Initial sync
    this.syncNow()

    // Set up periodic sync
    const intervalMs = this.config.interval * 60 * 1000
    this.syncTimer = setInterval(() => this.syncNow(), intervalMs)

    // Watch SavedVariables for changes
    this.startFileWatcher()
  }

  /**
   * Stop the sync engine
   */
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    this.updateStatus({ state: 'idle' })
  }

  /**
   * Perform a sync cycle now
   */
  async syncNow(): Promise<boolean> {
    if (this.status.state === 'syncing') return false

    this.updateStatus({ state: 'syncing' })

    try {
      // Step 1: Fetch fresh guild data from API
      const guildData = await this.api.getGuildData()

      // Step 2: Write to SavedVariables
      await this.writeGuildDataToSavedVars(guildData)

      // Step 3: Read pending data from SavedVariables
      const pending = this.readPendingFromSavedVars()

      // Step 4: Push pending data to API
      if (pending.awards.length > 0) {
        const result = await this.api.submitAwards(pending.awards)
        console.log(`Synced ${result.processed} awards (${result.errors} errors)`)
      }

      if (pending.attendance.length > 0) {
        const result = await this.api.submitAttendance(pending.attendance)
        console.log(`Synced ${result.processed} attendance records (${result.errors} errors)`)
      }

      // Step 5: Clear pending data from SavedVariables
      if (pending.awards.length > 0 || pending.attendance.length > 0) {
        this.clearPendingInSavedVars()
      }

      this.updateStatus({
        state: 'watching',
        lastSync: new Date().toISOString(),
        lastError: null,
        pendingAwards: 0,
        pendingAttendance: 0,
      })

      return true
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('Sync failed:', msg)
      this.updateStatus({
        state: 'error',
        lastError: msg,
      })
      return false
    }
  }

  /**
   * Get current status
   */
  getStatus(): SyncStatus {
    return { ...this.status }
  }

  getStatusText(): string {
    if (this.status.state === 'syncing') return 'Syncing...'
    if (this.status.state === 'error') return `Error: ${this.status.lastError}`
    if (this.status.lastSync) return `Last sync: ${this.status.lastSync}`
    return 'Not synced yet'
  }

  // ---- Private methods ----

  private getSavedVarsPath(): string {
    const wowInstall = WowFinder.validate(this.config.wowPath)
    if (!wowInstall || wowInstall.versions.length === 0) {
      throw new Error('WoW installation not found at: ' + this.config.wowPath)
    }

    // Use the first version that has SavedVariables
    for (const version of wowInstall.versions) {
      if (version.savedVarsPath) {
        return WowFinder.getSavedVarsFile(version.savedVarsPath)
      }
    }

    // Fallback: use the first version's expected SavedVariables path
    const firstVersion = wowInstall.versions[0]
    const svDir = path.join(firstVersion.path, 'WTF', 'Account')
    throw new Error('No SavedVariables folder found. Make sure the addon is installed and WoW has been launched at least once. Expected: ' + svDir)
  }

  private async writeGuildDataToSavedVars(guildData: GuildData) {
    const svPath = this.getSavedVarsPath()
    const dir = path.dirname(svPath)

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Read existing SavedVariables or create new
    let existing: Record<string, unknown> = {}
    if (fs.existsSync(svPath)) {
      const content = fs.readFileSync(svPath, 'utf-8')
      existing = parseLuaTable(content)
    }

    // Navigate to the profile's guildData
    const db = (existing['LootListPlusDB'] as Record<string, unknown>) || {}
    const profiles = (db['profiles'] as Record<string, unknown>) || {}
    const defaultProfile = (profiles['Default'] as Record<string, unknown>) || {}

    // Update guild data
    defaultProfile['guildData'] = {
      guildId: guildData.guildId,
      guildName: guildData.guildName,
      importedAt: new Date().toISOString(),
      expansionId: guildData.expansionId,
      phase: guildData.phase,
      settings: guildData.settings,
      items: this.convertItemsToLuaFormat(guildData.items),
      members: this.convertMembersToLuaFormat(guildData.members),
      priorities: guildData.priorities,
      blp: guildData.blp,
      attendance: guildData.attendance,
    }

    profiles['Default'] = defaultProfile
    db['profiles'] = profiles
    existing['LootListPlusDB'] = db

    // Write back
    const lua = toLuaTable('LootListPlusDB', db)
    fs.writeFileSync(svPath, lua, 'utf-8')
  }

  private convertItemsToLuaFormat(items: GuildData['items']): Record<number, unknown> {
    const result: Record<number, unknown> = {}
    for (const item of items) {
      result[item.wowhead_id] = {
        id: item.id,
        name: item.name,
        bossName: item.boss_name,
        raidName: item.raid_name,
        classification: item.classification,
        slot: item.slot,
        itemType: item.item_type,
        wowheadId: item.wowhead_id,
      }
    }
    return result
  }

  private convertMembersToLuaFormat(members: GuildData['members']): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const member of members) {
      const items: Record<string, number> = {}
      for (const item of member.items) {
        items[String(item.wowhead_id)] = item.rank
      }
      result[member.character_id] = {
        name: member.name,
        class: member.class_token,
        classColor: member.class_color,
        spec: member.spec_name,
        specId: member.spec_id,
        role: member.role,
        guildRole: member.guild_role,
        membershipStatus: member.membership_status,
        items,
      }
    }
    return result
  }

  private readPendingFromSavedVars(): {
    awards: Array<{ wowhead_id: number; character_name: string; boss_name?: string; awarded_date?: string }>
    attendance: Array<{ raid_date: string; raid_name: string; attended: string[] }>
  } {
    const svPath = this.getSavedVarsPath()
    if (!fs.existsSync(svPath)) {
      return { awards: [], attendance: [] }
    }

    const content = fs.readFileSync(svPath, 'utf-8')
    const data = parseLuaTable(content)

    const db = (data['LootListPlusDB'] as Record<string, unknown>) || {}
    const profiles = (db['profiles'] as Record<string, unknown>) || {}
    const profile = (profiles['Default'] as Record<string, unknown>) || {}

    const awards = (profile['pendingAwards'] as Array<Record<string, unknown>>) || []
    const attendance = (profile['pendingAttendance'] as Array<Record<string, unknown>>) || []

    return {
      awards: awards.map(a => ({
        wowhead_id: a['wowheadId'] as number,
        character_name: a['characterName'] as string,
        boss_name: a['bossName'] as string | undefined,
        awarded_date: a['awardedAt'] ? (a['awardedAt'] as string).split('T')[0] : undefined,
      })),
      attendance: attendance.map(a => ({
        raid_date: a['raidDate'] as string,
        raid_name: a['raidName'] as string,
        attended: (a['attended'] as string[]) || [],
      })),
    }
  }

  private clearPendingInSavedVars() {
    const svPath = this.getSavedVarsPath()
    if (!fs.existsSync(svPath)) return

    const content = fs.readFileSync(svPath, 'utf-8')
    const data = parseLuaTable(content)

    const db = (data['LootListPlusDB'] as Record<string, unknown>) || {}
    const profiles = (db['profiles'] as Record<string, unknown>) || {}
    const profile = (profiles['Default'] as Record<string, unknown>) || {}

    profile['pendingAwards'] = []
    profile['pendingAttendance'] = []

    profiles['Default'] = profile
    db['profiles'] = profiles

    const lua = toLuaTable('LootListPlusDB', db)
    fs.writeFileSync(svPath, lua, 'utf-8')
  }

  private startFileWatcher() {
    try {
      const svPath = this.getSavedVarsPath()
      const dir = path.dirname(svPath)

      if (!fs.existsSync(dir)) return

      this.watcher = chokidar.watch(svPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 500,
        },
      })

      this.watcher.on('change', () => {
        console.log('SavedVariables file changed, checking for pending data...')
        const pending = this.readPendingFromSavedVars()
        const totalPending = pending.awards.length + pending.attendance.length

        this.updateStatus({
          pendingAwards: pending.awards.length,
          pendingAttendance: pending.attendance.length,
        })

        if (totalPending > 0) {
          console.log(`Found ${totalPending} pending records, syncing...`)
          this.syncNow()
        }
      })
    } catch (error) {
      console.error('Failed to start file watcher:', error)
    }
  }

  private updateStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial }
    this.emit('status', this.status)
  }
}
