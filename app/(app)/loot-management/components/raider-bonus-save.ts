// Raider bonus save wiring for the Priorities tab (#329).
//
// Kept out of PriorityListTab so the save rules (tidy before saving, show the
// server's 400 message, roll back on failure) can be tested with a mocked
// fetch instead of rendering the whole tab.

import { tidyRaiderModifiers, type RaiderBonusMap } from '@/domain/scoring'
import type { NotificationType } from '@/app/contexts/NotificationContext'

export const RAIDER_BONUS_SAVE_FAILED = "Couldn't save the raider bonus. Check your connection and try again."

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
