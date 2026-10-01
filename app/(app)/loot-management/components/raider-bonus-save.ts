// Raider bonus save wiring for the Priorities tab (#329).
//
// Kept out of PriorityListTab so the save rules (tidy before saving, show the
// server's 400 message, roll back on failure, and the pasted-list flow with
// its alias save) can be tested with a mocked fetch instead of rendering the
// whole tab.

import { addRaiderBonusBatch, tidyRaiderModifiers, type RaiderBonusMap } from '@/domain/scoring'
import type { RosterAlias } from '@/domain/guild/roster-name-match'
import type { NotificationType } from '@/app/contexts/NotificationContext'

export const RAIDER_BONUS_SAVE_FAILED = "Couldn't save the raider bonus. Check your connection and try again."
export const RAIDER_BONUS_ALIAS_FAILED = "Bonus saved. The name matches couldn't be remembered, so pick them again next time."

/** Success toast after a pasted-list bonus is saved. */
export function bonusAddedMessage(count: number): string {
  return count === 1 ? 'Bonus added for 1 raider.' : `Bonus added for ${count} raiders.`
}

type FetchFn = typeof fetch

/**
 * PUT the whole raider bonus map for a guild. Returns ok, or the message to
 * show: the server's own error text for a 400 (validation), otherwise the
 * generic save-failed message.
 */
export async function putRaiderModifiers(
  guildId: string,
  mods: RaiderBonusMap,
  fetchFn: FetchFn = fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetchFn('/api/guild-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guild_id: guildId, settings: { single_raider_modifiers: mods } }),
    })
    if (response.ok) return { ok: true }

    let message = RAIDER_BONUS_SAVE_FAILED
    if (response.status === 400) {
      try {
        const body = await response.json()
        if (body && typeof body.error === 'string' && body.error) message = body.error
      } catch {}
    }
    console.error('Error saving raider bonuses, status:', response.status)
    return { ok: false, message }
  } catch (error) {
    console.error('Error saving raider bonuses:', error)
    return { ok: false, message: RAIDER_BONUS_SAVE_FAILED }
  }
}

export interface PersistRaiderModifiersDeps {
  guildId: string
  /** The map before this change, restored if the save fails. */
  previous: RaiderBonusMap
  /** Local YYYY-MM-DD; entries that ended before it are dropped on save. */
  today: string
  setMods: (mods: RaiderBonusMap) => void
  setSaving: (saving: boolean) => void
  notify: (type: NotificationType, message: string) => void
  fetchFn?: FetchFn
}

/**
 * Save a new raider bonus map: drop ended entries, update local state
 * optimistically, PUT it, and roll back with an error toast on failure.
 * Resolves true when the save succeeded.
 */
export async function persistRaiderModifiers(
  next: RaiderBonusMap,
  deps: PersistRaiderModifiersDeps,
): Promise<boolean> {
  const tidied = tidyRaiderModifiers(next, deps.today)
  deps.setMods(tidied)
  deps.setSaving(true)
  try {
    const result = await putRaiderModifiers(deps.guildId, tidied, deps.fetchFn)
    if (!result.ok) {
      deps.setMods(deps.previous)
      deps.notify('error', result.message)
      return false
    }
    return true
  } finally {
    deps.setSaving(false)
  }
}

/** What the bulk modal hands back to save. */
export interface RaiderBonusBatchDraft {
  characterIds: string[]
  amount: number
  label: string | null
  starts_at: string | null
  expires_at: string
  aliasesToSave: RosterAlias[]
}

export interface SaveRaiderBonusBatchDeps {
  guildId: string
  mods: RaiderBonusMap
  /** Shared by every entry from this paste. */
  batchId: string
  /** Saves the new map; resolves false after it has already shown the error. */
  persist: (next: RaiderBonusMap) => Promise<boolean>
  /** Called once the bonus is saved (closes the modal). */
  onSaved: () => void
  /** Receives the aliases the server stored. */
  onAliasesSaved: (aliases: (RosterAlias & { id?: string })[]) => void
  notify: (type: NotificationType, message: string) => void
  fetchFn?: FetchFn
}

/**
 * Save one bonus for every raider in a pasted list, all under one batch id.
 * On success: close, show the success toast, then save any remembered name
 * matches. A failed alias save (including a 403 for officers who cannot
 * manage members) keeps the bonus and shows a notice instead. On a failed
 * bonus save the modal stays open; `persist` has already shown the error.
 * Resolves true when the bonus was saved.
 */
export async function saveRaiderBonusBatch(
  draft: RaiderBonusBatchDraft,
  deps: SaveRaiderBonusBatchDeps,
): Promise<boolean> {
  const next = addRaiderBonusBatch(
    deps.mods,
    draft.characterIds,
    { amount: draft.amount, starts_at: draft.starts_at, expires_at: draft.expires_at, label: draft.label },
    deps.batchId,
  )
  const ok = await deps.persist(next)
  if (!ok) return false

  deps.onSaved()
  deps.notify('success', bonusAddedMessage(new Set(draft.characterIds).size))

  if (draft.aliasesToSave.length > 0) {
    const fetchFn = deps.fetchFn ?? fetch
    try {
      const response = await fetchFn('/api/character-aliases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: deps.guildId, aliases: draft.aliasesToSave }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      deps.onAliasesSaved(Array.isArray(body?.aliases) ? body.aliases : [])
    } catch (error) {
      console.error('Error saving character aliases:', error)
      deps.notify('warning', RAIDER_BONUS_ALIAS_FAILED)
    }
  }
  return true
}
