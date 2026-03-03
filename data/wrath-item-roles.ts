/**
 * Item Role Mappings for WotLK (Wrath of the Lich King)
 *
 * This mapping defines which roles (tank/healer/physical/caster) can use each item.
 * Items not listed default to an empty array (available to all specs).
 *
 * Roles:
 * - tank: Protection Warriors, Protection Paladins, Feral Druids (bear), Blood/Frost DKs
 * - healer: Holy/Disc Priests, Restoration Druids, Restoration Shamans, Holy Paladins
 * - physical: Rogues, Hunters, Warriors (DPS), Enhancement Shamans, Feral Druids (cat), Ret Paladins, DPS DKs
 * - caster: Mages, Warlocks, Shadow Priests, Elemental Shamans, Balance Druids
 *
 * Note: WotLK adds Death Knights. DK tanks fall under 'tank', DK DPS under 'physical'.
 * Items without explicit mapping default to [] (available to all specs).
 */

export const WOTLK_ITEM_ROLES: Record<string, ('tank' | 'healer' | 'physical' | 'caster')[]> = {
  // ============================================================================
  // LEGENDARY ITEMS
  // ============================================================================
  "Val'anyr, Hammer of Ancient Kings": ['healer'],
  "Fragment of Val'anyr": ['healer'],
  'Shadowmourne': ['physical'],
  'Shadowfrost Shard': ['physical'],

  // ============================================================================
  // KEY RESERVED ITEMS WITH SPECIFIC ROLES
  // ============================================================================
  // ICC - Lich King
  "Archus, Greatstaff of Antonidas": ['caster'],
  "Havoc's Call, Blade of Lordaeron Kings": ['physical'],
  "Heaven's Fall, Kryss of a Thousand Lies": ['physical'],
  "Mithrios, Bronzebeard's Legacy": ['tank'],
  "Oathbinder, Charge of the Ranger-General": ['healer'],
  "Troggbane, Axe of the Frostborne King": ['tank'],
  "Windrunner's Heartseeker": ['physical'],
  "Royal Scepter of Terenas II": ['healer', 'caster'],
  "Fal'inrush, Defender of Quel'thalas": ['physical'],
  "Tainted Twig of Nordrassil": ['caster', 'healer'],

  // ICC - Other bosses
  "Deathbringer's Will": ['physical'],
  'Sundial of Eternal Dusk': ['caster'],
  'Unidentifiable Organ': ['tank'],
  'Last Word': ['tank'],
  'Bloodfall': ['physical'],

  // ToC
  "Death's Verdict": ['physical'],
  "Death's Choice": ['physical'],
  "Reign of the Dead": ['caster'],
  "Reign of the Unliving": ['caster'],

  // Naxx
  "Calamity's Grasp": ['physical'],
  'The Turning Tide': ['caster', 'healer'],

  // Ulduar
  "Reply-Code Alpha": ['caster', 'healer'],
  'Starshard Edge': ['physical'],
}
