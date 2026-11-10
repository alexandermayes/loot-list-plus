/**
 * Strict zod schema for an expansion manifest (EXPN-04 foundation).
 *
 * This module imports zod, so it is deliberately NOT re-exported from
 * domain/expansion/index.ts: that barrel is reached by every client bundle
 * through @/domain, and zod must not ride along. Client code takes the types
 * with `import type` only; the schema runs in the CI gate
 * (data/expansions/__tests__/manifest-gate.test.ts), not at request time.
 *
 * Everything is z.strictObject so a typo such as `previousName` fails the
 * gate instead of being silently stripped.
 *
 * No raid phase numbers live here: EXPANSION_PHASES.forever in
 * data/expansion-phases.ts is the only phase source.
 */
import { z } from 'zod'

// Items and token classes are keyed by wowhead_id as a string, matching the
// seeder's write path. Bosses are keyed by their slug `key`, never by id (D-16).
const WowheadIdSchema = z.string().regex(/^\d+$/)

const VerificationSchema = z.literal(['verified', 'provisional'])

const ManifestBossSchema = z
  .strictObject({
    // Lowercase kebab slug, unique within the raid.
    key: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    verification: VerificationSchema,
    verifiedBy: z.literal(['wago-dungeon-encounter', 'owner']).optional(),
    // Per-entry provenance note (D-12): where this name came from.
    source: z.string().min(1),
    // wago DungeonEncounter.ID once a row confirms the boss.
    encounterId: z.int().nullable().default(null),
  })
  .superRefine((boss, ctx) => {
    if (boss.verification === 'verified' && !boss.verifiedBy) {
      ctx.addIssue({
        code: 'custom',
        message: 'a verified boss needs verifiedBy',
        path: ['verifiedBy'],
        input: boss,
      })
    }
    if (boss.verification === 'provisional' && boss.verifiedBy) {
      ctx.addIssue({
        code: 'custom',
        message: 'a provisional boss must not carry verifiedBy',
        path: ['verifiedBy'],
        input: boss,
      })
    }
  })

const ManifestRaidSchema = z.strictObject({
  // Exact raid_tiers.name, plain with no game suffix (D-04).
  name: z.string().min(1),
  previousNames: z.array(z.string().min(1)).default([]),
  size: z.int().positive(),
  // Data only (D-06): nothing gates on this date.
  opens_on: z.iso.date().nullable(),
  // wago Map.ID once known.
  mapId: z.int().nullable().default(null),
  // Empty is allowed and means "Bosses to be announced".
  bosses: z.array(ManifestBossSchema),
})

export const ExpansionManifestSchema = z.strictObject({
  slug: z.string().regex(/^[a-z]+$/),
  storedName: z.string().min(1),
  gameVersion: z.literal(['classic', 'forever']),
  reference: z.strictObject({ product: z.string(), buildPrefix: z.string() }),
  raids: z.array(ManifestRaidSchema).min(1),
  // Forever has no items yet. z.never() makes an item added early fail the
  // gate rather than be silently ignored by sync; the schema widens together
  // with item sync support in a later phase.
  items: z.record(WowheadIdSchema, z.never()).default({}),
  tokenClasses: z.record(WowheadIdSchema, z.array(z.string()).min(1)).default({}),
})

export type ExpansionManifest = z.infer<typeof ExpansionManifestSchema>
export type ExpansionManifestInput = z.input<typeof ExpansionManifestSchema>
export type ManifestRaid = ExpansionManifest['raids'][number]
export type ManifestBoss = ManifestRaid['bosses'][number]
