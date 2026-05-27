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
