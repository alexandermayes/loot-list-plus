// Scoring domain — barrel export
// All scoring-related functions and types from one import path

export { calculateAttendanceScore } from './attendance-score'
export { calculateLootScore } from './loot-score'
export { getRankModifier, getRoleModifier, getRoleModifierWithLabel, getTrialPenalty, calculateBadLuckBonus } from './modifiers'
export { calculatePriorityBonus } from './priority'
export { DEFAULT_SETTINGS, withDefaults, getDefaultSettings } from './defaults'
export { computeScore } from './engine'
export { explainScore } from './explain'
export { computeAttendance, resolveStatus } from './attendance'

// Re-export types so consumers can import from '@/domain/scoring'
export type { ItemPriority } from './priority'
export type {
  ScoringConfig, GuildSettings, AttendanceRecord,
  CharacterContext, ScoreInput, ScoreResult, ScoreComponents,
  ScoreExplanation, ScoreLine,
  AttendanceStatus, RaidEvent, AttendanceInput, AttendanceResult,
} from '../types'
