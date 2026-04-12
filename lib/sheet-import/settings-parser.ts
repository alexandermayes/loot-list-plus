/**
 * Parser for Master Sheet "Information" tab.
 * Row-based config format. Labels in column C, values in column D.
 * Some rows have secondary values in column E.
 *
 * Real format example:
 *   ,,Number of Raid Days a Week,2,Pick from 1-5,Region
 *   ,,1st Raid Day of the Week,Tuesday,...
 *   ,,Max Attendence Bonus,4,0.9,
 *   ,,Rank 1,Pro Yiker,0,...
 */

import { parseCSV } from './csv-parser'

export interface ParsedSettings {
  // Attendance
  attendance_type?: string
  rolling_attendance_weeks?: number
  use_signups?: boolean
  signup_weight?: number

  // Attendance bonus tiers
  max_attendance_bonus?: number
  max_attendance_threshold?: number
  middle_attendance_bonus?: number
  middle_attendance_threshold?: number
  bottom_attendance_bonus?: number
  bottom_attendance_threshold?: number

  // Minimum raids
  minimum_raid_days_enabled?: boolean
  minimum_raid_days?: number

  // Late/early penalty
  late_early_penalty_enabled?: boolean
  late_early_penalty_value?: number

  // BLP
  blp_enabled?: boolean
  blp_increment?: number

  // Rank modifiers
  guild_rank_bonuses_enabled?: boolean
  number_of_ranks?: number
  rank_modifiers?: Record<string, number>

  // Priority toggles
  role_bonus_priority_single_item?: boolean
  class_bonus_priority_single_item?: boolean
  raid_roles_overall_bonus_priority?: boolean
  single_raider_overall_bonus?: boolean
  single_raider_bonus_single_item?: boolean

  // Donation
  donation_bonuses_enabled?: boolean
  donation_cap_enabled?: boolean
  donation_bonus_type?: string

  // Raid days
  raid_days_per_week?: number
  first_raid_day?: number
  second_raid_day?: number
  third_raid_day?: number
  fourth_raid_day?: number
  fifth_raid_day?: number

  // General
  decimal_places?: number
  reset_date?: string
}

const DAY_MAP: Record<string, number> = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
}

function parseDayName(value: string): number | null {
  const normalized = value.toLowerCase().trim()
  return DAY_MAP[normalized] ?? null
}

function parseNumber(value: string): number | null {
  const cleaned = value.replace(/[,$]/g, '').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseBool(value: string): boolean | null {
  const lower = value.toLowerCase().trim()
  if (lower === 'true' || lower === 'yes' || lower === 'on' || lower === '1') return true
  if (lower === 'false' || lower === 'no' || lower === 'off' || lower === '0') return false
  return null
}

function parsePercentage(value: string): number | null {
  const cleaned = value.replace('%', '').trim()
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  return num > 1 ? num / 100 : num
}

/**
 * Parse a date string in various formats.
 * Handles DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.
 */
function parseDate(value: string): string | null {
  // DD.MM.YYYY format (European)
  const dotMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) {
    const [, d, m, y] = dotMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // MM/DD/YYYY format (US)
  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // YYYY-MM-DD format
  const isoMatch = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (isoMatch) {
    const [, y, m, d] = isoMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

interface RowData {
  label: string  // Normalized lowercase label text
  raw: string    // Original label text
  value: string  // Column D value
  extra: string  // Column E value
  extraLabel: string // Column E as potential label (for side-by-side pairs)
  extraValue: string // Column F value (for side-by-side pairs)
}

/**
 * Extract labeled rows from the CSV.
 * The Master Sheet format puts labels in column C (index 2) and values in column D (index 3).
 * Some rows have secondary data in columns E-F.
 */
function extractRows(csv: string): RowData[] {
  const rawRows = parseCSV(csv)
  const rows: RowData[] = []

  for (const row of rawRows) {
    // Try column C first (index 2), fall back to column A (index 0)
    let labelCol = 2
    let valueCol = 3
    let extraCol = 4
    let extraLabelCol = 4
    let extraValueCol = 5

    // If column C is empty but column A has content, use that
    const colC = row[2]?.trim() || ''
    const colA = row[0]?.trim() || ''

    if (!colC && colA) {
      labelCol = 0
      valueCol = 1
      extraCol = 2
      extraLabelCol = 2
      extraValueCol = 3
    }

    const label = row[labelCol]?.trim() || ''
    if (!label) continue

    rows.push({
      label: label.toLowerCase(),
      raw: label,
      value: row[valueCol]?.trim() || '',
      extra: row[extraCol]?.trim() || '',
      extraLabel: row[extraLabelCol]?.trim().toLowerCase() || '',
      extraValue: row[extraValueCol]?.trim() || '',
    })
  }

  return rows
}

/**
 * Parse the "Information" tab CSV into guild settings.
 */
export function parseInformationTab(csv: string): ParsedSettings {
  const rows = extractRows(csv)
  const settings: ParsedSettings = {}

  for (const row of rows) {
    const { label, value, extra, extraLabel, extraValue } = row

    // --- General ---
    if (label.includes('number of raid days')) {
      const num = parseNumber(value)
      if (num !== null) settings.raid_days_per_week = num
      continue
    }

    if (label.includes('1st raid day')) {
      const day = parseDayName(value)
      if (day !== null) settings.first_raid_day = day
      continue
    }
    if (label.includes('2nd raid day')) {
      const day = parseDayName(value)
      if (day !== null) settings.second_raid_day = day
      continue
    }
    if (label.includes('3rd raid day')) {
      const day = parseDayName(value)
      if (day !== null) settings.third_raid_day = day
      continue
    }
    if (label.includes('4th raid day')) {
      const day = parseDayName(value)
      if (day !== null) settings.fourth_raid_day = day
      continue
    }
    if (label.includes('5th raid day')) {
      const day = parseDayName(value)
      if (day !== null) settings.fifth_raid_day = day
      continue
    }

    if (label.includes('date') && label.includes('1st full raid week') || label.includes('date of the 1st')) {
      const date = parseDate(value)
      if (date) settings.reset_date = date
      continue
    }

    if (label.includes('place value') || label.includes('decimal')) {
      const num = parseNumber(value)
      if (num !== null) settings.decimal_places = num
      continue
    }

    // --- Attendance ---
    if (label.includes('type of attendance')) {
      const lower = value.toLowerCase()
      if (lower.includes('linear')) settings.attendance_type = 'linear'
      else if (lower.includes('break')) settings.attendance_type = 'break-point'
      else settings.attendance_type = 'points-per-raid'
      continue
    }

    if (label.includes('rolling attendance period') || label.includes('rolling') && label.includes('weeks')) {
      const num = parseNumber(value)
      if (num !== null) settings.rolling_attendance_weeks = num
      continue
    }

    if (label.includes('signup') && label.includes('attendance')) {
      const bool = parseBool(value)
      if (bool !== null) settings.use_signups = bool
      // Extra column often has the signup weight
      if (extra) {
        const pct = parsePercentage(extra)
        if (pct !== null) settings.signup_weight = pct
      }
      continue
    }

    // Attendance bonus tiers: "Max Attendence Bonus,4,0.9"
    if (label.includes('max attend') && label.includes('bonus')) {
      const num = parseNumber(value)
      if (num !== null) settings.max_attendance_bonus = num
      const threshold = parsePercentage(extra)
      if (threshold !== null) settings.max_attendance_threshold = threshold
      continue
    }
    if (label.includes('middle attend') && label.includes('bonus')) {
      const num = parseNumber(value)
      if (num !== null) settings.middle_attendance_bonus = num
      const threshold = parsePercentage(extra)
      if (threshold !== null) settings.middle_attendance_threshold = threshold
      continue
    }
    if (label.includes('bottom attend') && label.includes('bonus')) {
      const num = parseNumber(value)
      if (num !== null) settings.bottom_attendance_bonus = num
      const threshold = parsePercentage(extra)
      if (threshold !== null) settings.bottom_attendance_threshold = threshold
      continue
    }

    // Minimum raids: "Do you have a minimum number of raid days...,Yes,2"
    if (label.includes('minimum') && label.includes('raid day')) {
      const bool = parseBool(value)
      if (bool !== null) settings.minimum_raid_days_enabled = bool
      const num = parseNumber(extra)
      if (num !== null) settings.minimum_raid_days = num
      continue
    }

    // Late/early penalty: 'late show" or "leave early" penalty?,Yes,0.25'
    if (label.includes('late') && (label.includes('early') || label.includes('show'))) {
      const bool = parseBool(value)
      if (bool !== null) settings.late_early_penalty_enabled = bool
      const num = parseNumber(extra)
      if (num !== null) settings.late_early_penalty_value = Math.abs(num)
      continue
    }

    // --- Bad Luck Prevention ---
    if (label.includes('seeing an item') || label.includes('see') && label.includes('not receiv')) {
      const bool = parseBool(value)
      if (bool !== null) settings.blp_enabled = bool
      const num = parseNumber(extra)
      if (num !== null) settings.blp_increment = num
      continue
    }

    // --- Rank bonuses ---
    if (label.includes('guild ranks') && label.includes('bonus')) {
      const bool = parseBool(value)
      if (bool !== null) settings.guild_rank_bonuses_enabled = bool
      const num = parseNumber(extra)
      if (num !== null) settings.number_of_ranks = num
      continue
    }

    // --- Priority toggles ---
    // "Do you want the ability to give a specific role a bonus priority on a single item?,Yes,..."
    if (label.includes('role') && label.includes('bonus') && label.includes('single item')) {
      const bool = parseBool(value)
      if (bool !== null) settings.role_bonus_priority_single_item = bool
      // Check for side-by-side: "Do you want...single raider an overall bonus?,Yes"
      if (extraLabel.includes('single raider') && extraLabel.includes('overall')) {
        const bool2 = parseBool(extraValue)
        if (bool2 !== null) settings.single_raider_overall_bonus = bool2
      }
      continue
    }
    if (label.includes('class') && label.includes('bonus') && label.includes('single item')) {
      const bool = parseBool(value)
      if (bool !== null) settings.class_bonus_priority_single_item = bool
      // Side-by-side: single raider bonus on single item
      if (extraLabel.includes('single raider') && extraLabel.includes('single item')) {
        const bool2 = parseBool(extraValue)
        if (bool2 !== null) settings.single_raider_bonus_single_item = bool2
      }
      continue
    }
    if (label.includes('raid roles') && label.includes('overall')) {
      const bool = parseBool(value)
      if (bool !== null) settings.raid_roles_overall_bonus_priority = bool
      continue
    }
    // Catch-all for single raider if not caught side-by-side
    if (label.includes('single raider') && label.includes('overall')) {
      const bool = parseBool(value)
      if (bool !== null) settings.single_raider_overall_bonus = bool
      continue
    }
    if (label.includes('single raider') && label.includes('single item')) {
      const bool = parseBool(value)
      if (bool !== null) settings.single_raider_bonus_single_item = bool
      continue
    }

    // --- Donations ---
    if (label.includes('donation bonus') && !label.includes('cap') && !label.includes('permanent') && !label.includes('rolling')) {
      const bool = parseBool(value)
      if (bool !== null) settings.donation_bonuses_enabled = bool
      continue
    }
    if (label.includes('cap') && label.includes('donation')) {
      const bool = parseBool(value)
      if (bool !== null) settings.donation_cap_enabled = bool
      continue
    }
    if (label.includes('donation') && (label.includes('permanent') || label.includes('rolling') || label.includes('reset'))) {
      const lower = value.toLowerCase()
      if (lower === 'rolling' || lower === 'permanent' || lower === 'hard resets') {
        settings.donation_bonus_type = lower === 'hard resets' ? 'hard-reset' : lower
      }
      continue
    }
  }

  // --- Rank modifiers (second pass) ---
  // Format: ,,Rank 1,Pro Yiker,0,...
  const rankModifiers: Record<string, number> = {}

  for (const row of rows) {
    const rankMatch = row.label.match(/^rank\s*(\d+)$/)
    if (rankMatch) {
      // value = rank name, extra = bonus value
      const rankName = row.value || `Rank ${rankMatch[1]}`
      const bonus = parseNumber(row.extra)
      if (bonus !== null) {
        rankModifiers[rankName] = bonus
      }
    }
  }

  if (Object.keys(rankModifiers).length > 0) {
    settings.rank_modifiers = rankModifiers
    if (settings.guild_rank_bonuses_enabled === undefined) {
      settings.guild_rank_bonuses_enabled = true
    }
    if (settings.number_of_ranks === undefined) {
      settings.number_of_ranks = Object.keys(rankModifiers).length
    }
  }

  return settings
}
