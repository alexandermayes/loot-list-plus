/**
 * Shared test fixtures for scoring calculations.
 *
 * These fixtures serve two purposes:
 * 1. Golden tests — lock current behavior before refactoring
 * 2. Lua parity — export as JSON to verify addon/ScoreEngine.lua matches
 *
 * Each fixture defines inputs and the expected output from the current implementation.
 */

// --- Attendance record helpers ---

export function attended(signedUp = false) {
  return { signed_up: signedUp, attended: true, no_call_no_show: false }
}

export function signedUpOnly() {
  return { signed_up: true, attended: false, no_call_no_show: false }
}

export function ncns() {
  return { signed_up: false, attended: false, no_call_no_show: true }
}

export function absent() {
  return { signed_up: false, attended: false, no_call_no_show: false }
}

export function late(signedUp = false) {
  return { signed_up: signedUp, attended: true, no_call_no_show: false, was_late: true }
}

export function benched(signedUp = false) {
  return { signed_up: signedUp, attended: false, no_call_no_show: false, was_benched: true }
}

export function excused() {
  return { signed_up: false, attended: false, no_call_no_show: false, is_excused: true }
}

// --- Settings presets ---

export const DEFAULT_PPR_SETTINGS = {
  attendance_type: 'points-per-raid' as const,
  signup_weight: 0.25,
  max_attendance_bonus: 4,
}

export const DEFAULT_LINEAR_SETTINGS = {
  attendance_type: 'linear' as const,
  use_signups: true,
  signup_weight: 0.25,
  max_attendance_bonus: 4,
}

export const DEFAULT_BREAKPOINT_SETTINGS = {
  attendance_type: 'breakpoint' as const,
  max_attendance_bonus: 4,
  max_attendance_threshold: 0.9,
  middle_attendance_bonus: 2,
  middle_attendance_threshold: 0.5,
  bottom_attendance_bonus: 1,
  bottom_attendance_threshold: 0.25,
}

// --- Loot score fixtures (for cross-engine parity) ---

export const LOOT_SCORE_FIXTURES = [
  {
    name: 'basic_full_member',
    input: { itemRank: 50, attendanceScore: 3.0, rankModifier: 0, badLuckBonus: 0, priorityBonus: 0, trialPenalty: 0, roleBonus: 0 },
    expected: 53.0,
  },
  {
    name: 'all_components',
    input: { itemRank: 45, attendanceScore: 2.5, rankModifier: -1, badLuckBonus: 3, priorityBonus: 5, trialPenalty: -2, roleBonus: 2 },
    expected: 54.5,
  },
  {
    name: 'zero_rank',
    input: { itemRank: 1, attendanceScore: 0, rankModifier: 0, badLuckBonus: 0, priorityBonus: 0, trialPenalty: 0, roleBonus: 0 },
    expected: 1.0,
  },
  {
    name: 'negative_total_possible',
    input: { itemRank: 1, attendanceScore: 0, rankModifier: -4, badLuckBonus: 0, priorityBonus: 0, trialPenalty: -2, roleBonus: 0 },
    expected: -5.0,
  },
] as const
