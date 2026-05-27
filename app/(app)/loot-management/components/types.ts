export interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification: string
  item_type: string
  allocation_cost: number
  is_available: boolean
  is_loot_council: boolean
  roles: string[]
  officer_notes?: string
  raid_tier: {
    name: string
  }
}

export interface ClassSpecOption {
  id: string
  label: string
  classColor?: string
}

export type SpecType = 'primary' | 'secondary'
