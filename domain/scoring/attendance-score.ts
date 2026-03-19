import type { AttendanceRecord, ScoringConfig } from '../types'
import { DEFAULT_SETTINGS } from './defaults'

/**
 * Calculate attendance score based on guild settings.
 *
 * Three modes:
 * - points-per-raid: flat points per attended/signed-up raid (default)
 * - linear: percentage-based scaling
 * - breakpoint: tiered bonuses at thresholds
 *
 * NCNS raids are excluded entirely (not counted as 0, just skipped).
 */
export function calculateAttendanceScore(
  records: AttendanceRecord[],
  totalRaids: number,
  settings: Partial<ScoringConfig> = {}
): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (records.length === 0 || totalRaids === 0) return 0

  let attendedCount = 0
  let signedUpCount = 0

  records.forEach(r => {
    if (r.no_call_no_show) return
    if (r.attended) attendedCount++
    if (r.signed_up) signedUpCount++
  })

  const attendancePercentage = attendedCount / totalRaids

  if (config.attendance_type === 'points-per-raid') {
    const attendancePointsPerRaid = 1 - config.signup_weight
    const signupPointsPerRaid = config.signup_weight

    let totalScore = 0

    records.forEach(r => {
      if (r.no_call_no_show) return
      let raidPoints = 0
      if (r.signed_up) {
        raidPoints += signupPointsPerRaid
      }
      if (r.attended) {
        raidPoints += attendancePointsPerRaid
      }
      totalScore += Math.min(raidPoints, 1.0)
    })

    return Math.min(totalScore, config.max_attendance_bonus)
  } else if (config.attendance_type === 'linear') {
    const baseScore = attendancePercentage * config.max_attendance_bonus

    if (config.use_signups) {
      const signupPercentage = signedUpCount / totalRaids
      const signupBonus = signupPercentage * config.max_attendance_bonus * config.signup_weight
      return Math.min(baseScore + signupBonus, config.max_attendance_bonus)
    }

    return Math.min(baseScore, config.max_attendance_bonus)
  } else {
    if (attendancePercentage >= config.max_attendance_threshold) {
      return config.max_attendance_bonus
    } else if (attendancePercentage >= config.middle_attendance_threshold) {
      return config.middle_attendance_bonus
    } else if (attendancePercentage >= config.bottom_attendance_threshold) {
      return config.bottom_attendance_bonus
    }
    return 0
  }
}
