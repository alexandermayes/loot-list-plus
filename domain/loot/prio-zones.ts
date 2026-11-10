/**
 * Which list zones an item may be ranked in, given the officers' class prio.
 * One rule shared by the editor pickers, the drag guard and Import BIS, so
 * Import BIS cannot place what the editor would refuse (#484).
 */

/** 'bracket' is Brackets 1-4 (ranks 50-39), 'noBracket' is ranks 38-25, 'offSpec' is ranks 24-1. */
export type ListZone = 'bracket' | 'noBracket' | 'offSpec'

/** Structural, so loot item types from the app satisfy it without domain importing them. */
export interface PrioZoneItem {
  is_loot_council?: boolean
  character_spec_type?: 'primary' | 'secondary' | null
  is_allocated?: boolean
  has_primary_only?: boolean
}

export function canRankInZone(item: PrioZoneItem, zone: ListZone): boolean {
  // Loot Council items are listed but never rankable by raiders
  if (item.is_loot_council) return false

  switch (zone) {
    case 'offSpec':
      // The API already filtered by proficiency, so anything here is equippable
      return true
    case 'noBracket':
      return (
        item.character_spec_type === 'primary' ||
        item.character_spec_type === 'secondary' ||
        !item.is_allocated ||
        // Primary prio with no secondary filled in is open to everyone here
        item.has_primary_only === true
      )
    case 'bracket':
      return item.character_spec_type === 'primary' || !item.is_allocated
  }
}
