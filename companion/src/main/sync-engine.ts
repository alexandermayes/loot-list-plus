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
  removePendingEntries,
  toPendingAttendancePairs,
  toPendingAwardPairs,
  type SentPending,
} from './addon-format'
import { toLuaTable } from './lua-writer'
import {
  CLEARED_LOG_FILE,
  STUCK_STORE_FILE,
  appendClearedLog,
  parkedEntries,
  partitionPending,
  pruneStore,
  readStuckStore,
  recordOutcomes,
  writeStuckStore,
} from './stuck-entries'
import { describeStuck, statusText } from './sync-status'
import type { SyncStatus } from './sync-status'
import { WowFinder } from './wow-finder'

export interface SyncConfig {
  apiUrl: string
  guildId: string
  wowPath: string
  interval: number  // minutes
  token?: string
  /**
   * The Electron userData folder, where the stuck-entry store and the
   * cleared-entries log live (GH #320 follow-up). When absent, attempt
   * counts live only in memory for this process and nothing is written.
   */
  stateDir?: string
}

export type { SyncStatus }

/**
 * Orchestrates data flow between LootList+ API and WoW addon SavedVariables.
 *
 * Sync cycle (one pass):
 * 1. Read pending awards/attendance from SavedVariables
 * 2. Load the stuck-entry store, prune it to the entries still in the file,
 *    split pending into sendable and parked, send only the sendable ones
 *    (attendance, then awards), record each outcome (accepted deletes the
 *    record, a permanent rejection counts one more attempt, a transient one
 *    is ignored), and write the store
 * 3. Fetch guild data from the API (it now includes what was just pushed)
 * 4. In one SavedVariables write, replace guildData and remove only the
 *    pending entries the server accepted (a 2xx, including a repeat it
 *    already had); the addon reads the file on login or /reload. Rejected
 *    entries stay in the file and are sent again on the next pass, and their
 *    counts and a sentence go into the status (GH #320).
 * If step 3 fails nothing is written to SavedVariables, so all pending data
 * is sent again on the next pass (awards dedupe by key, attendance upserts);
 * the store was already written, so attempt counts survive.
 * An entry the server rejects with 400, 404 or 422 three times
 * (MAX_PERMANENT_ATTEMPTS) is parked: it stays in the file but is no longer
 * sent, and the status says how many are parked. clearParkedEntries removes
 * them from the file on the user's request (GH #320 follow-up).
 * Between passes, SavedVariables is watched for changes (the addon writes
 * on logout or /reload) and new sendable pending data triggers a pass.
 */
export class SyncEngine extends EventEmitter {
  private config: SyncConfig
  private api: ApiClient
  private watcher: chokidar.FSWatcher | null = null
  private syncTimer: NodeJS.Timeout | null = null
  private stuckStorePath: string | null
  private clearedLogPath: string | null
  private status: SyncStatus = {
    state: 'idle',
    lastSync: null,
    lastError: null,
    pendingAwards: 0,
    pendingAttendance: 0,
    parkedAwards: 0,
    parkedAttendance: 0,
  }

  constructor(config: SyncConfig) {
    super()
    this.config = config
    this.api = new ApiClient(config.apiUrl)
    if (config.token) {
      this.api.setAuth({ token: config.token, guildId: config.guildId })
    }
    this.stuckStorePath = config.stateDir ? path.join(config.stateDir, STUCK_STORE_FILE) : null
    this.clearedLogPath = config.stateDir ? path.join(config.stateDir, CLEARED_LOG_FILE) : null
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
      const now = new Date().toISOString()

      // Step 1: Read pending data from SavedVariables
      const svPath = this.getSavedVarsPath()
      const saved = this.readSavedVars(svPath)
      const pending: SentPending = saved ? readPendingLists(saved) : { awards: [], attendance: [] }
      // The pending sessions supply each award's raid night when the addon
      // did not stamp one (GH #321).
      const awardPairs = toPendingAwardPairs(pending.awards, pending.attendance)
      const attendancePairs = toPendingAttendancePairs(pending.attendance)

      // Step 2: Split off parked entries, push the rest to the API, and
      // record what the server said. Attendance goes first: its import
      // creates the raid night that the awards then link to (#295). The
      // request arrays are exactly sendable.map(p => p.request), so the
      // accepted indices and the outcomes index into the SENDABLE pairs,
      // never into the full pair arrays.
      const store = readStuckStore(this.stuckStorePath)
      pruneStore(store, pending)
      // regression for #320
      const attendance = partitionPending('attendance', attendancePairs, store)
      const awards = partitionPending('award', awardPairs, store)
      let acceptedAttendance: number[] = []
      let acceptedAwards: number[] = []

      if (attendance.sendable.length > 0) {
        const result = await this.api.submitAttendance(attendance.sendable.map(p => p.request))
        acceptedAttendance = result.accepted
        recordOutcomes('attendance', attendance.sendable, result.outcomes, store, now)
        console.log('Synced attendance records:', result.processed, 'errors:', result.errors)
      }

      if (awards.sendable.length > 0) {
        const result = await this.api.submitAwards(awards.sendable.map(p => p.request))
        acceptedAwards = result.accepted
        recordOutcomes('award', awards.sendable, result.outcomes, store, now)
        console.log('Synced awards:', result.processed, 'errors:', result.errors)
      }

      // The store is written before the guild-data fetch, so a failed fetch
      // still keeps the attempt counts.
      writeStuckStore(this.stuckStorePath, store)

      // Step 3: Fetch fresh guild data. A failure throws before anything is
      // written to SavedVariables, so the pending data stays in the file for
      // the next pass.
      const guildData = await this.api.getGuildData()

      // Step 4: One write: guild data in, accepted pending entries out. Only
      // accepted entries are removed; rejected ones stay in the file for the
      // next pass (GH #320).
      const sent: SentPending = {
        awards: acceptedEntries(awards.sendable, acceptedAwards),
        attendance: acceptedEntries(attendance.sendable, acceptedAttendance),
      }
      const hadPending = pending.awards.length > 0 || pending.attendance.length > 0
      this.writeSyncResult(svPath, guildData, hadPending ? sent : null)

      const retryingAwards = awards.sendable.length - sent.awards.length
      const retryingAttendance = attendance.sendable.length - sent.attendance.length
      const parkedAwards = awards.parked.length
      const parkedAttendance = attendance.parked.length
      if (parkedAwards + parkedAttendance > 0) {
        console.log('Parked entries not sent:', parkedAwards, 'awards,', parkedAttendance, 'attendance records')
      }
      this.updateStatus({
        state: 'watching',
        lastSync: new Date().toISOString(),
        lastError: describeStuck(retryingAwards, retryingAttendance, parkedAwards, parkedAttendance),
        pendingAwards: retryingAwards,
        pendingAttendance: retryingAttendance,
        parkedAwards,
        parkedAttendance,
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
   * Removes the parked entries (permanent rejections at the limit) from the
   * SavedVariables file and forgets their attempt counts, on the user's
   * request from the tray or the renderer (GH #320 follow-up).
   *
   * Refused while a pass is running: the pass holds both the file and the
   * store, and a write here would race its step 4. The raw entries are
   * appended to cleared-entries.jsonl BEFORE the file is written, so the
   * only copy of an entry is never lost even if the write fails. As with
   * every companion write, WoW owns the file while the game is running and
   * writes its own copy back at logout, so a clear made while WoW is open
   * is undone at logout (see the README).
   */
  async clearParkedEntries(): Promise<{ cleared: boolean; awards: number; attendance: number }> {
    const nothing = { cleared: false, awards: 0, attendance: 0 }
    if (this.status.state === 'syncing') return nothing

    try {
      const svPath = this.getSavedVarsPath()
      const saved = this.readSavedVars(svPath)
      if (!saved) return { cleared: true, awards: 0, attendance: 0 }

      const store = readStuckStore(this.stuckStorePath)
      const parked = parkedEntries(store, readPendingLists(saved))
      if (parked.awards.length === 0 && parked.attendance.length === 0) {
        return { cleared: true, awards: 0, attendance: 0 }
      }

      const now = new Date().toISOString()
      appendClearedLog(this.clearedLogPath, parked, now)
      const db = removePendingEntries(saved, parked)
      fs.writeFileSync(svPath, toLuaTable('LootListPlusDB', db), 'utf-8')

      // saved was changed in place, so pruning against its pending lists
      // drops exactly the parked records.
      pruneStore(store, readPendingLists(saved))
      writeStuckStore(this.stuckStorePath, store)

      console.log('Cleared parked entries:', parked.awards.length, 'awards,', parked.attendance.length, 'attendance records')
      this.updateStatus({
        parkedAwards: 0,
        parkedAttendance: 0,
        lastError: describeStuck(this.status.pendingAwards, this.status.pendingAttendance, 0, 0),
      })
      return { cleared: true, awards: parked.awards.length, attendance: parked.attendance.length }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      console.error('Clearing parked entries failed:', msg)
      this.updateStatus({ state: 'error', lastError: msg })
      return nothing
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

  /**
   * Counts of the file's pending entries split by the store, without
   * pruning or writing it: the watcher only needs to know whether a pass is
   * worth starting (GH #320 follow-up).
   */
  private readPendingPartition() {
    const saved = this.readSavedVars(this.getSavedVarsPath())
    const pending: SentPending = saved ? readPendingLists(saved) : { awards: [], attendance: [] }
    const store = readStuckStore(this.stuckStorePath)
    const awards = partitionPending('award', toPendingAwardPairs(pending.awards, pending.attendance), store)
    const attendance = partitionPending('attendance', toPendingAttendancePairs(pending.attendance), store)
    return {
      sendableAwards: awards.sendable.length,
      sendableAttendance: attendance.sendable.length,
      parkedAwards: awards.parked.length,
      parkedAttendance: attendance.parked.length,
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
        const counts = this.readPendingPartition()
        const totalSendable = counts.sendableAwards + counts.sendableAttendance

        this.updateStatus({
          pendingAwards: counts.sendableAwards,
          pendingAttendance: counts.sendableAttendance,
          parkedAwards: counts.parkedAwards,
          parkedAttendance: counts.parkedAttendance,
        })

        // Parked entries alone do not start a pass: they would not be sent.
        if (totalSendable > 0) {
          console.log(`Found ${totalSendable} pending records, syncing...`)
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
