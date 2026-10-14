import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import { ApiClient, GuildData } from './api-client'
import { parseLuaTable } from './lua-parser'
import {
  acceptedEntries,
  applyGuildDataToSavedVars,
  buildGuildDataLua,
  readPendingLists,
  toPendingAttendancePairs,
  toPendingAttendanceRequests,
  toPendingAwardPairs,
  toPendingAwardRequests,
  type SentPending,
} from './addon-format'
import { toLuaTable } from './lua-writer'
import { describeRejected, statusText } from './sync-status'
import type { SyncStatus } from './sync-status'
import { WowFinder } from './wow-finder'

export interface SyncConfig {
  apiUrl: string
  guildId: string
  wowPath: string
  interval: number  // minutes
  token?: string
}

export type { SyncStatus }

/**
 * Orchestrates data flow between LootList+ API and WoW addon SavedVariables.
 *
 * Sync cycle (one pass):
 * 1. Read pending awards/attendance from SavedVariables
 * 2. Push attendance, then awards, to the API
 * 3. Fetch guild data from the API (it now includes what was just pushed)
 * 4. In one SavedVariables write, replace guildData and remove only the
 *    pending entries the server accepted (a 2xx, including a repeat it
 *    already had); the addon reads the file on login or /reload. Rejected
 *    entries stay in the file and are sent again on the next pass, and their
 *    counts and a sentence go into the status (GH #320).
 * If step 3 fails nothing is written, so all pending data is sent again on
 * the next pass (awards dedupe by key, attendance upserts).
 * A rejection the server will always give (for example a 404 for an item it
 * does not know) is retried every pass; the status count is what makes it
 * visible.
 * Between passes, SavedVariables is watched for changes (the addon writes
 * on logout or /reload) and new pending data triggers a pass.
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
      // Step 1: Read pending data from SavedVariables
      const svPath = this.getSavedVarsPath()
      const saved = this.readSavedVars(svPath)
      const pending: SentPending = saved ? readPendingLists(saved) : { awards: [], attendance: [] }
      const awardPairs = toPendingAwardPairs(pending.awards)
      const attendancePairs = toPendingAttendancePairs(pending.attendance)
      let acceptedAttendance: number[] = []
      let acceptedAwards: number[] = []

      // Step 2: Push pending data to API. Attendance goes first: its import
      // creates the raid night that the awards then link to (#295). The
      // request arrays are exactly pairs.map(p => p.request), so the accepted
      // indices index into the pairs.
      if (attendancePairs.length > 0) {
        const result = await this.api.submitAttendance(attendancePairs.map(p => p.request))
        acceptedAttendance = result.accepted
        console.log('Synced attendance records:', result.processed, 'errors:', result.errors)
      }

      if (awardPairs.length > 0) {
        const result = await this.api.submitAwards(awardPairs.map(p => p.request))
        acceptedAwards = result.accepted
        console.log('Synced awards:', result.processed, 'errors:', result.errors)
      }

      // Step 3: Fetch fresh guild data. A failure throws before anything is
      // written, so the pending data stays in the file for the next pass.
      const guildData = await this.api.getGuildData()

      // Step 4: One write: guild data in, accepted pending entries out. Only
      // accepted entries are removed; rejected ones stay in the file for the
      // next pass (GH #320).
      const sent: SentPending = {
        awards: acceptedEntries(awardPairs, acceptedAwards),
        attendance: acceptedEntries(attendancePairs, acceptedAttendance),
      }
      const hadPending = pending.awards.length > 0 || pending.attendance.length > 0
      this.writeSyncResult(svPath, guildData, hadPending ? sent : null)

      const stuckAwards = awardPairs.length - sent.awards.length
      const stuckAttendance = attendancePairs.length - sent.attendance.length
      this.updateStatus({
        state: 'watching',
        lastSync: new Date().toISOString(),
        lastError: describeRejected(stuckAwards, stuckAttendance),
        pendingAwards: stuckAwards,
        pendingAttendance: stuckAttendance,
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
    return statusText(this.status)
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

  /** The parsed SavedVariables file, or null when it does not exist yet. */
  private readSavedVars(svPath: string): Record<string, unknown> | null {
    if (!fs.existsSync(svPath)) return null
    return parseLuaTable(fs.readFileSync(svPath, 'utf-8'))
  }

  /**
   * Re-reads the file (the addon may have added pending data while the pass
   * ran), applies guild data and the sent pending entries in place, and
   * writes it once.
   */
  private writeSyncResult(svPath: string, guildData: GuildData, sent: SentPending | null) {
    const dir = path.dirname(svPath)

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const existing = this.readSavedVars(svPath) ?? {}
    const db = applyGuildDataToSavedVars(existing, buildGuildDataLua(guildData, new Date().toISOString()), sent)
    fs.writeFileSync(svPath, toLuaTable('LootListPlusDB', db), 'utf-8')
  }

  private readPendingFromSavedVars() {
    const saved = this.readSavedVars(this.getSavedVarsPath())
    const pending = saved ? readPendingLists(saved) : { awards: [], attendance: [] }
    return {
      awards: toPendingAwardRequests(pending.awards),
      attendance: toPendingAttendanceRequests(pending.attendance),
    }
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
