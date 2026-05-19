/**
 * Canonical domain types for the loot scoring system.
 *
 * These types are the single source of truth for scoring inputs/outputs.
 * They replace the non-exported interfaces in utils/calculations.ts
 * and the various inline type definitions across page components.
 */

// ─── Scoring Configuration ──────────────────────────────────

/**
 * Scoring-relevant subset of guild_settings.
 * Replaces the non-exported GuildSettings interface in calculations.ts.
 *
 * Named ScoringConfig to distinguish from the full guild_settings DB row.
 * Re-exported as GuildSettings for backward compatibility.
 */
export interface ScoringConfig {
  attendance_type: 'linear' | 'breakpoint' | 'points-per-raid'
  rolling_attendance_weeks: number
  use_signups: boolean
  signup_weight: number
  max_attendance_bonus: number
  max_attendance_threshold: number
  middle_attendance_bonus: number
  middle_attendance_threshold: number
  bottom_attendance_bonus: number
  bottom_attendance_threshold: number
  guild_rank_bonuses_enabled: boolean
  rank_modifiers: Record<string, number>
  raid_roles_overall_bonus_priority: boolean
  role_modifiers: Record<string, number>
  minimum_raid_days_enabled: boolean
  minimum_raid_days: number
  late_early_penalty_enabled: boolean
  late_early_penalty_value: number
  // Trial system
  trial_penalty_enabled: boolean
  trial_penalty_value: number
  trial_auto_promote_enabled: boolean
  trial_auto_promote_weeks: number
  new_members_start_as_trial: boolean
  // BLP
  blp_enabled: boolean
  blp_increment: number
  blp_maximum: number
  // Donations
  donation_bonuses_enabled: boolean
  donation_cap_enabled: boolean
  donation_cap_points: number
  donation_bonus_type: 'permanent' | 'rolling' | 'hard-reset'
  /** Window for rolling-decay mode. Null = fall back to rolling_attendance_weeks. */
  donation_rolling_weeks: number | null
  /** Anchor date for hard-reset mode (YYYY-MM-DD). Null = no reset yet, include all. */
  donation_reset_at: string | null
}

/** Backward-compatible alias */
export type GuildSettings = ScoringConfig

// ─── Attendance ──────────────────────────────────────────────

export interface AttendanceRecord {
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
  was_late?: boolean
  was_benched?: boolean
  is_excused?: boolean
  points_override?: number | null
}

// ─── Donations ───────────────────────────────────────────────

/**
 * Minimal donation record for scoring.
 * The full DB row (kind, amount_text, note, character_id, etc.) is irrelevant
 * to score computation — only the signed point value and award date matter.
 */
export interface DonationRecord {
  /** Signed score impact. Negative = clawback / revocation. */
  points: number
  /** YYYY-MM-DD */
  awarded_at: string
}

// ─── Item Priority ───────────────────────────────────────────

export interface ItemPriority {
  role_priorities: Record<string, number | null>
  class_priorities: Record<string, number | null>
  character_priorities: Record<string, number | null>
  priority_bonuses: { role: number; class: number; character: number }
}

// ─── Attendance Engine Types ─────────────────────────────────

/** Canonical attendance status, derived from 5 boolean flags */
export type AttendanceStatus =
  | 'attended'    // Full credit
  | 'late'        // Attended but late
  | 'benched'     // Available but sat out
  | 'no_show'     // Unexcused absence (excluded from totals)
  | 'excused'     // Excused absence (excluded from totals, like NCNS)
  | 'signed_up'   // Signed up but didn't attend
  | 'absent'      // Not present, no signup

/** A raid event for attendance computation */
export interface RaidEvent {
  id: string
  raid_date: string  // YYYY-MM-DD
}

/** Input for computeAttendance() */
export interface AttendanceInput {
  /** Raw attendance records with raid event IDs */
  records: {
    raid_event_id: string
    signed_up: boolean
    attended: boolean
    no_call_no_show: boolean
    was_late?: boolean
    was_benched?: boolean
    is_excused?: boolean
    points_override?: number | null
  }[]
  /** All raid events in the period (pre-filtered by guild_id, is_skipped) */
  raidEvents: RaidEvent[]
  config: Partial<ScoringConfig>
  /** Configured raid days as JS day numbers (0=Sun, 6=Sat). Empty = no filtering. */
  raidDays: number[]
  /** For fair/minimum_gate mode: character's guild join date (YYYY-MM-DD). */
  memberJoinedAt?: string
  /** Defaults to today. Pass explicitly for deterministic tests. */
  asOfDate?: string  // YYYY-MM-DD
  /**
   * Expansion raid start date (YYYY-MM-DD). When set, the rolling window's
   * lower bound is clamped to this date so events from before the expansion
   * started (e.g., auto-created blanks from `/api/raid-events/ensure`) don't
   * leak into the denominator.
   */
  raidStartDate?: string
  /** New member mode: 'raw' | 'fair' | 'minimum_gate'. Defaults to 'raw'. */
  newMemberMode?: 'raw' | 'fair' | 'minimum_gate'
  /**
   * Fill-in credit: additional guild events (from other teams) where
   * the character has attendance. These contribute to the numerator
   * (raids attended) but NOT the denominator (expected raids).
   * Capped per week at the team's raids_per_week.
   */
  fillInEvents?: RaidEvent[]
  /** Attendance records for fill-in events. Only needs raid_event_id + attended. */
  fillInRecords?: { raid_event_id: string; attended: boolean }[]
  /** Max attendance credits per week (typically raids_per_week). Enables per-week capping. */
  weeklyAttendanceCap?: number
}

/** Result from computeAttendance() */
export interface AttendanceResult {
  score: number
  raidsAttended: number
  raidsInWindow: number
  isEligible: boolean  // false when minimum_gate and raids < minimum_raid_days
}

// ─── Score Engine Types ─────────────────────────────────────

/** Character context needed for score computation */
export interface CharacterContext {
  characterId: string
  specId: string | null
  /** Spec roles: e.g. ['tank'], ['physical', 'tank'], ['healer'] */
  specRoles: string[]
  /** Guild rank name: e.g. 'Officer', 'Raider' */
  guildRank: string
  /** 'trial' | 'full' */
  membershipStatus: string
}

/** Structured input for computeScore() */
export interface ScoreInput {
  itemRank: number
  character: CharacterContext
  /** Attendance result — at minimum needs { score: number } */
  attendance: { score: number }
  config: Partial<ScoringConfig>
  /** Item priority config from guild_item_priorities, or null */
  itemPriority: ItemPriority | null
  /** BLP times_passed for this character+item, or 0 */
  timesPassed: number
  /**
   * Pre-computed donation bonus for this character.
   * Compute once per character with `calculateDonationBonus(records, config)`,
   * then pass the result here for every item that character is scored on.
   * Pass 0 when donations are disabled or the character has no records.
   */
  donationBonus: number
}

/** Breakdown of all score components */
export interface ScoreComponents {
  itemRank: number
  attendanceScore: number
  rankModifier: number
  roleBonus: number
  badLuckBonus: number
  priorityBonus: number
  trialPenalty: number
  donationBonus: number
}

/** Result from computeScore() */
export interface ScoreResult {
  total: number
  components: ScoreComponents
}

/** One line of a score explanation */
export interface ScoreLine {
  label: string
  value: number
  detail: string
  /** Optional key identifying the component (for UI styling/icons) */
  key?: 'itemRank' | 'attendance' | 'rankModifier' | 'roleBonus' | 'priorityBonus' | 'trialPenalty' | 'badLuckBonus' | 'donationBonus'
  /** Optional context for richer UI rendering (e.g., rank name, role label) */
  context?: Record<string, string | number | boolean>
}

/** Human-readable score breakdown from explainScore() */
export interface ScoreExplanation {
  total: number
  lines: ScoreLine[]
}

// ─── Award Decision Receipt ─────────────────────────────────

/** Officer-selected reason at the moment of award. Empty string = default "score winner". */
export type AwardReason = '' | 'score' | 'loot_council' | 'override' | 'offspec' | 'roll'

/** Canonical outcome categories stored in the audit receipt. */
export type AwardOutcomeType = 'score' | 'roll' | 'loot_council' | 'override' | 'offspec'

/** Compact per-candidate snapshot captured at award time for the audit receipt. */
export interface DecisionCandidateSummary {
  character_id: string
  player_name: string
  loot_score: number
  is_trial: boolean
  is_eligible: boolean
  has_received: boolean
  bad_luck_bonus: number
  components: ScoreComponents
}

/**
 * Structured "why this award happened" snapshot sent from the officer UI
 * to the award API and persisted in audit_logs.new_data. Lets us reconstruct
 * the decision later without rerunning scoring.
 */
export interface DecisionContext {
  outcome_type: AwardOutcomeType
  was_score_winner: boolean
  tied_at_top: boolean
  gap_to_next: number | null
  awarded_character_id: string
  winner_score: number
  winner_components: ScoreComponents
  /** Up to 3 candidates, ordered by loot_score desc. */
  top_candidates: DecisionCandidateSummary[]
}
