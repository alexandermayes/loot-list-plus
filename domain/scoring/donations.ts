/**
 * Donation bonus calculation.
 *
 * Sums signed point values from `donation_records` that fall inside the
 * configured decay window. The result feeds into computeScore() as one more
 * component of the Loot Score.
 *
 * Decay modes (driven by donation_bonus_type):
 *   - 'permanent'  — every record counts forever
 *   - 'rolling'    — records older than donation_rolling_weeks (or
 *                    rolling_attendance_weeks as fallback) are excluded
 *   - 'hard-reset' — records before donation_reset_at are excluded
 *
 * Cap (when donation_cap_enabled):
 *   The final sum is capped above at donation_cap_points. The cap is not
 *   applied to negative sums (clawback can still produce a net negative).
 *
 * Pure function. No I/O.
 */

import type { DonationRecord, ScoringConfig } from '../types'
import { withDefaults } from './defaults'

// Timezone-safe date parsing (mirrors utils/date.ts; inlined to keep domain
// layer free of cross-package imports — matches the attendance.ts pattern).
function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Compute the donation bonus for one character.
 *
 * @param records - Donation records for the character. Caller pre-filters by guild + character.
 * @param settings - Partial ScoringConfig; defaults are applied internally.
 * @param asOfDate - YYYY-MM-DD reference date for rolling window calculation. Defaults to today.
 * @returns Signed bonus to add to the score. Always 0 when donations are disabled.
 */
export function calculateDonationBonus(
  records: DonationRecord[],
  settings: Partial<ScoringConfig> = {},
  asOfDate?: string,
): number {
  const config = withDefaults(settings)

  if (!config.donation_bonuses_enabled || records.length === 0) {
    return 0
  }

  const eligible = filterByDecay(records, config, asOfDate)
  const sum = eligible.reduce((acc, r) => acc + r.points, 0)

  if (config.donation_cap_enabled && sum > config.donation_cap_points) {
    return config.donation_cap_points
  }

  return sum
}

function filterByDecay(
  records: DonationRecord[],
  config: ScoringConfig,
  asOfDate: string | undefined,
): DonationRecord[] {
  switch (config.donation_bonus_type) {
    case 'permanent':
      return records

    case 'rolling': {
      const weeks = config.donation_rolling_weeks ?? config.rolling_attendance_weeks
      const asOf = asOfDate ? parseDateLocal(asOfDate) : new Date()
      const cutoff = new Date(asOf)
      cutoff.setDate(cutoff.getDate() - weeks * 7)
      const cutoffStr = formatDate(cutoff)
      return records.filter(r => r.awarded_at >= cutoffStr)
    }

    case 'hard-reset': {
      if (!config.donation_reset_at) return records
      return records.filter(r => r.awarded_at >= config.donation_reset_at!)
    }
  }
}
