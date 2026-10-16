/**
 * Strict zod schema for the committed wago.tools reference snapshot
 * (EXPN-06 snapshot half, D-13, D-14).
 *
 * This module imports zod, so it is deliberately NOT re-exported from
 * domain/expansion/index.ts: that barrel is reached by every client bundle
 * through @/domain, and zod must not ride along. Elsewhere take the type with
 * `import type`; the schema runs in the reference test and in the offline
 * refresh script, never at request time.
 *
 * The snapshot is data-only JSON. It is validated by this schema before it is
 * written and again by the reference test, so a poisoned or half-written file
 * fails CI instead of reaching the manifest checks.
 *
 * Provenance rules: a null `build` is the committed placeholder (D-14) and
 * forces null fetchedAt and sha256 and empty tables; a set `build` forces both
 * and must start with `buildPrefix`.
 */
import { z } from 'zod'

// Column names follow WoWDBDefs; the first successful pull (plan 02-08) confirms them.
const DungeonEncounterRowSchema = z.strictObject({
  ID: z.int(),
  Name_lang: z.string(),
  MapID: z.int(),
  OrderIndex: z.int(),
  DifficultyID: z.int(),
})

const MapRowSchema = z.strictObject({
  ID: z.int(),
  MapName_lang: z.string(),
  InstanceType: z.int(),
  ExpansionID: z.int(),
  Directory: z.string(),
})

const ItemSparseRowSchema = z.strictObject({
  ID: z.int(),
  Display_lang: z.string(),
  InventoryType: z.int(),
})

const TablesSchema = z.strictObject({
  DungeonEncounter: z.array(DungeonEncounterRowSchema),
  Map: z.array(MapRowSchema),
  ItemSparse: z.array(ItemSparseRowSchema),
})

export const ReferenceSnapshotSchema = z
  .strictObject({
    // The URL template the rows came from, with {table} and {build} placeholders.
    source: z.string().min(1),
    product: z.string().min(1),
    buildPrefix: z.string().min(1),
    build: z.string().min(1).nullable(),
    fetchedAt: z.iso.datetime().nullable(),
    // sha256 of canonicalSnapshotPayload, as lowercase hex.
    sha256: z
      .string()
      .regex(/^[0-9a-f]{64}$/)
      .nullable(),
    tables: TablesSchema,
  })
  .superRefine((snapshot, ctx) => {
    if (snapshot.build === null) {
      if (snapshot.fetchedAt !== null) {
        ctx.addIssue({
          code: 'custom',
          message: 'a placeholder snapshot (build null) must have fetchedAt null',
          path: ['fetchedAt'],
          input: snapshot,
        })
      }
      if (snapshot.sha256 !== null) {
        ctx.addIssue({
          code: 'custom',
          message: 'a placeholder snapshot (build null) must have sha256 null',
          path: ['sha256'],
          input: snapshot,
        })
      }
      for (const [name, rows] of Object.entries(snapshot.tables)) {
        if (rows.length > 0) {
          ctx.addIssue({
            code: 'custom',
            message: `a placeholder snapshot (build null) must have an empty ${name} table`,
            path: ['tables', name],
            input: snapshot,
          })
        }
      }
      return
    }
    if (snapshot.fetchedAt === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'a snapshot with a build needs fetchedAt',
        path: ['fetchedAt'],
        input: snapshot,
      })
    }
    if (snapshot.sha256 === null) {
      ctx.addIssue({
        code: 'custom',
        message: 'a snapshot with a build needs sha256',
        path: ['sha256'],
        input: snapshot,
      })
    }
    if (!snapshot.build.startsWith(snapshot.buildPrefix)) {
      ctx.addIssue({
        code: 'custom',
        message: `build must start with buildPrefix "${snapshot.buildPrefix}"`,
        path: ['build'],
        input: snapshot,
      })
    }
  })

export type ReferenceSnapshot = z.infer<typeof ReferenceSnapshotSchema>

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

function sortKeysDeep(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value !== null && typeof value === 'object') {
    const sorted: { [key: string]: JsonValue } = {}
    for (const key of Object.keys(value).sort()) sorted[key] = sortKeysDeep(value[key])
    return sorted
  }
  return value
}

function sortRowsById<Row extends { ID: number }>(rows: readonly Row[]): Row[] {
  // The JSON tie-break keeps the order total if a table ever repeats an ID.
  return [...rows].sort(
    (a, b) => a.ID - b.ID || JSON.stringify(sortKeysDeep(a)).localeCompare(JSON.stringify(sortKeysDeep(b))),
  )
}

/**
 * The sha256 input: the build plus every table with rows sorted by ID, as JSON
 * with recursively sorted keys. fetchedAt is deliberately excluded so a re-pull
 * of unchanged data hashes the same and the weekly refresh opens no PR for it
 * (research Pitfall 4). Pure and order-insensitive on rows and keys.
 */
export function canonicalSnapshotPayload(input: {
  build: string | null
  tables: ReferenceSnapshot['tables']
}): string {
  const { tables } = input
  const payload = {
    build: input.build,
    tables: {
      DungeonEncounter: sortRowsById(tables.DungeonEncounter),
      Map: sortRowsById(tables.Map),
      ItemSparse: sortRowsById(tables.ItemSparse),
    },
  }
  return JSON.stringify(sortKeysDeep(payload))
}
