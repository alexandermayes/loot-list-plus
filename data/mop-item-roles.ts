/**
 * Item Role Mappings for Mists of Pandaria
 *
 * This mapping defines which roles (tank/healer/physical/caster) can use each item.
 * Items not listed default to an empty array (available to all specs).
 *
 * Roles:
 * - tank: Protection Warriors, Protection Paladins, Blood DKs, Brewmaster Monks, Guardian Druids
 * - healer: Holy/Disc Priests, Restoration Druids, Restoration Shamans, Holy Paladins, Mistweaver Monks
 * - physical: Rogues, Hunters, Warriors (DPS), Enhancement Shamans, Feral Druids, Ret Paladins, DPS DKs, Windwalker Monks
 * - caster: Mages, Warlocks, Shadow Priests, Elemental Shamans, Balance Druids
 *
 * Items without explicit mapping default to [] (available to all specs).
 */

export const MOP_ITEM_ROLES: Record<string, ('tank' | 'healer' | 'physical' | 'caster')[]> = {
  // Items default to empty array (all specs) - only add role-specific items as needed
}
