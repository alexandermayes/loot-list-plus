/**
 * Scoring domain — barrel export.
 *
 * ## Public API (use these in app code)
 *
 * - `computeScore(input)` — single entry point for all loot scoring
 * - `explainScore(result, input?)` — human-readable score breakdown for UI
 * - `computeAttendance(input)` — attendance computation with windowing/dedup
 * - `resolveStatus(record)` — derive attendance status from boolean flags
 * - `withDefaults(config)` / `getDefaultSettings()` — config helpers
 *
 * ## Utility (legitimate for UI display, not scoring)
 *
 * - `calculateBadLuckBonus(timesPassed, config)` — BLP range preview
 * - `getRoleModifierWithLabel(roles, config)` — role bonus with matched role name
 * - `getRankModifier(rank, config)` — rank modifier for display labels
 *
 * ## Internal (called by engine internals, exported for tests only)
 *
 * Do NOT call these directly for scoring — use `computeScore()` instead.
 * These are exported so unit tests can verify individual components.
 *
 * - `calculateAttendanceScore` — raw attendance formula (use computeAttendance)
 * - `calculateLootScore` — legacy 7-param positional API (use computeScore)
 * - `getRoleModifier` — raw role modifier (use computeScore)
 * - `getTrialPenalty` — raw trial penalty (use computeScore)
 * - `calculatePriorityBonus` — raw priority calc (use computeScore)
 */

// ─── Public API ──────────────────────────────────────────────
export { computeScore } from './engine'
export { explainScore } from './explain'
export { computeAttendance, resolveStatus, getAttendanceWindowEnd, getAttendanceWindowStart, getCurrentResetWeekEnd, getNextResetWeek, resolveOwnedEvents } from './attendance'
export { resolveAttendanceWindow } from './attendance-window'
export type { AttendanceWindow } from './attendance-window'
export { withDefaults, getDefaultSettings } from './defaults'

// ─── Utility (display helpers, not scoring) ──────────────────
export { calculateBadLuckBonus, getRoleModifierWithLabel, getRankModifier, getRaiderBonus, resolveActiveRaiderModifiers, isRaiderBonusEntryActive, getActiveRaiderBonusEntries } from './modifiers'

// ─── Raider bonuses (pure map helpers for officers and raiders, #329) ────
export {
  RAIDER_BONUS_LABEL_MAX, RAIDER_BONUS_MAX_RAIDERS, RAIDER_BONUS_MAX_ENTRIES_PER_RAIDER,
  normalizeRaiderModifiers, tidyRaiderModifiers, validateRaiderModifiers,
  addRaiderBonusBatch, removeRaiderBonusBatch, removeRaiderBonusEntry,
  raiderBonusStatus, groupRaiderBonuses, resolveBonusWindow, formatBonusDate,
  describeRaiderBonusEntries,
} from './raider-bonus'

// ─── Donations (pure; not yet wired into computeScore — see PR3) ────────
export { calculateDonationBonus } from './donations'

// ─── Internal (engine internals, exported for tests) ─────────
/** @internal Use computeAttendance() instead */
export { calculateAttendanceScore } from './attendance-score'
/** @internal Use computeScore() instead */
export { calculateLootScore } from './loot-score'
/** @internal Use computeScore() instead */
export { getRoleModifier, getTrialPenalty } from './modifiers'
/** @internal Use computeScore() instead */
export { calculatePriorityBonus } from './priority'
/** @internal */
export { DEFAULT_SETTINGS } from './defaults'

// ─── Types ───────────────────────────────────────────────────
export type { ItemPriority } from './priority'
export type {
  RaiderBonusMap, RaiderBonusStatus, BonusWindowMode, RaiderBonusBatchView, RaiderBonusSingleView,
} from './raider-bonus'
export type {
  ScoringConfig, GuildSettings, RaiderBonusEntry, AttendanceRecord,
  CharacterContext, ScoreInput, ScoreResult, ScoreComponents,
  ScoreExplanation, ScoreLine,
  AttendanceStatus, RaidEvent, AttendanceInput, AttendanceResult,
  DonationRecord,
} from '../types'
