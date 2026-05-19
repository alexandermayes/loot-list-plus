/**
 * Friendly type aliases for database tables.
 *
 * Import from here instead of defining inline interfaces:
 *   import type { DbCharacter, DbGuild } from '@/lib/db'
 *
 * Regenerate with: npm run gen:types
 */

import type { Database } from './database.types'

// ─── Table Row Types ─────────────────────────────────────────

type Tables = Database['public']['Tables']

export type DbAttendanceRecord = Tables['attendance_records']['Row']
export type DbAuditLog = Tables['audit_logs']['Row']
export type DbBattlenetAccount = Tables['battlenet_accounts']['Row']
export type DbBlpTracking = Tables['blp_tracking']['Row']
export type DbCharacterAlias = Tables['character_aliases']['Row']
export type DbCharacterEquippedItem = Tables['character_equipped_items']['Row']
export type DbCharacterGuildMembership = Tables['character_guild_memberships']['Row']
export type DbCharacter = Tables['characters']['Row']
export type DbClassSpec = Tables['class_specs']['Row']
export type DbDonationRecord = Tables['donation_records']['Row']
export type DbExpansion = Tables['expansions']['Row']
export type DbGuildInviteCode = Tables['guild_invite_codes']['Row']
export type DbGuildItemPriority = Tables['guild_item_priorities']['Row']
export type DbGuildRole = Tables['guild_roles']['Row']
export type DbGuildSettings = Tables['guild_settings']['Row']
export type DbGuild = Tables['guilds']['Row']
export type DbLootHistory = Tables['loot_history']['Row']
export type DbLootItemClass = Tables['loot_item_classes']['Row']
export type DbLootItem = Tables['loot_items']['Row']
export type DbLootSubmissionItem = Tables['loot_submission_items']['Row']
export type DbLootSubmission = Tables['loot_submissions']['Row']
export type DbRaidEvent = Tables['raid_events']['Row']
export type DbRaidTier = Tables['raid_tiers']['Row']
export type DbUserPreference = Tables['user_preferences']['Row']
export type DbWowClass = Tables['wow_classes']['Row']

// ─── Insert Types ────────────────────────────────────────────

export type DbAttendanceRecordInsert = Tables['attendance_records']['Insert']
export type DbAuditLogInsert = Tables['audit_logs']['Insert']
export type DbDonationRecordInsert = Tables['donation_records']['Insert']
export type DbLootHistoryInsert = Tables['loot_history']['Insert']
export type DbLootSubmissionInsert = Tables['loot_submissions']['Insert']

// ─── Update Types ────────────────────────────────────────────

export type DbAttendanceRecordUpdate = Tables['attendance_records']['Update']
export type DbDonationRecordUpdate = Tables['donation_records']['Update']
export type DbLootSubmissionUpdate = Tables['loot_submissions']['Update']

// ─── Re-export Database type for createClient<Database> ──────

export type { Database } from './database.types'
