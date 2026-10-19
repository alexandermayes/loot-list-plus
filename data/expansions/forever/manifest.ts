/**
 * The native WoW Forever manifest: three raids and their bosses, provisional
 * until a wago DungeonEncounter row on the raid's map confirms them (D-15).
 *
 * Client-safe: the schema is imported type-only, so zod never reaches a client
 * bundle through this file. data/expansions/__tests__/manifest-gate.test.ts
 * parses it under ExpansionManifestSchema and compares it with an independent
 * transcription of the names.
 *
 * Every field is written out, including the defaulted ones, so the parse
 * output deep-equals this constant.
 *
 * Raid names are plain (D-04): a guild is one game version, so no "(Forever)"
 * suffix is needed to tell them apart from Classic raids.
 *
 * Owner input on boss names is due 2026-10-21 (Decision 26). Each answer lands
 * as a one-line edit to a boss entry here. Open question for the owner: is
 * "Well of Sorrow" a boss or a place? It reads like a place and ships
 * provisional either way.
 */
import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'
import { FOREVER_EXPANSION_NAME } from '@/domain/expansion/game'

const GUIDE_SOURCE =
  '2026-09-13 todo, section "Day-one checklist results, checked 2026-09-25": names came from third-party guides and were not in wago DungeonEncounter on 2026-09-25'

const ONYXIA_SOURCE =
  'inferred from the raid name; awaits wago DungeonEncounter or owner confirmation'

export const FOREVER_MANIFEST: ExpansionManifest = {
  slug: 'forever',
  storedName: FOREVER_EXPANSION_NAME,
  gameVersion: 'forever',
  reference: { product: 'wow_classic_beta', buildPrefix: '1.60.' },
  raids: [
    {
      name: 'Barrow Deeps',
      previousNames: [],
      size: 10,
      opens_on: '2026-12-09',
      mapId: null,
      // Guide order, assumed to be encounter order. The owner confirms on 2026-10-21.
      bosses: [
        { key: 'deepscar-matriarch', name: 'Deepscar Matriarch', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
        { key: 'khalith-the-dreadspinner', name: 'Khalith the Dreadspinner', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
        { key: 'amethrax', name: 'Amethrax', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
        { key: 'ravus-and-darlissa', name: 'Ravus and Darlissa', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
        { key: 'elder-tangleclaw', name: 'Elder Tangleclaw', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
        { key: 'well-of-sorrow', name: 'Well of Sorrow', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
        { key: 'dellynar-songwood', name: "Del'lynar Songwood", verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
        { key: 'sonya-darkhallow', name: 'Sonya Darkhallow', verification: 'provisional', source: GUIDE_SOURCE, encounterId: null },
      ],
    },
    {
      name: 'Hyjal Summit',
      previousNames: [],
      size: 20,
      opens_on: '2026-12-09',
      mapId: null,
      // No boss name exists in any repo artifact yet.
      bosses: [],
    },
    {
      name: "Onyxia's Lair",
      previousNames: [],
      size: 40,
      opens_on: '2026-12-09',
      mapId: null,
      bosses: [
        {
          key: 'onyxia',
          name: 'Onyxia',
          verification: 'verified',
          verifiedBy: 'wago-dungeon-encounter',
          source: ONYXIA_SOURCE,
          encounterId: 1084,
        },
      ],
    },
  ],
  items: {},
  tokenClasses: {},
}
