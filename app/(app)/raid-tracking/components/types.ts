export interface RaidEvent {
  id: string
  raid_date: string
  notes: string | null
  is_skipped: boolean
  skip_reason: string | null
  wcl_report_code: string | null
  is_bonus?: boolean
}

export interface AttendanceStatus {
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
  was_late: boolean
  was_benched: boolean
  is_excused?: boolean
}

export interface UnlinkedAttendee {
  character_name: string
  status: AttendanceStatus
}

export interface Member {
  character_id: string
  user_id: string
  character_name: string
  class_name: string
  class_color: string
  role: string
}

export interface RaidLootEntry {
  id: string
  character_name: string
  character_class_color: string
  item_name: string
  item_wowhead_id: number
  awarded_date: string
}

export interface LootItem {
  id: string
  name: string
  wowhead_id: number
  boss_name: string
  raid_tier_id: string
}

export interface AttendancePreview {
  total: number
  matched: number
  aliasMatched: number
  unmatched: number
}

export interface LootPreview {
  total: number
  linked: number
  unlinked: number
  failed: number
  items: string[]
}

export type SignupsPreview = AttendancePreview
