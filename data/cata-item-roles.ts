/**
 * Item Role Mappings for Cataclysm
 *
 * This mapping defines which roles (tank/healer/physical/caster) can use each item.
 * Items not listed default to an empty array (available to all specs).
 *
 * Roles:
 * - tank: Protection Warriors, Protection Paladins, Blood DKs, Feral Druids (bear)
 * - healer: Holy/Disc Priests, Restoration Druids, Restoration Shamans, Holy Paladins
 * - physical: Rogues, Hunters, Warriors (DPS), Enhancement Shamans, Feral Druids (cat), Ret Paladins, DPS DKs
 * - caster: Mages, Warlocks, Shadow Priests, Elemental Shamans, Balance Druids
 *
 * Items without explicit mapping default to [] (available to all specs).
 */

export const CATA_ITEM_ROLES: Record<string, ('tank' | 'healer' | 'physical' | 'caster')[]> = {
  // Items default to empty array (all specs) - only add role-specific items as needed
}
