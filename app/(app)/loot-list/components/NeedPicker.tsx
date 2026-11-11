'use client'

/**
 * NeedPicker: the five-row list a Discovery group's raider fills in instead of
 * the 50-rank editor (D-11, D-12, D-27).
 *
 * Edits stay local until the primary button: the editor's autosave does not run
 * here, because saveSubmission with explicit rankings writes the whole list at
 * once (five picks fanned out over every Discovery tier, D-02). Both save
 * buttons submit to officer review; nothing is approved here (D-27).
 */
import { useMemo, useState } from 'react'

import { useGuildContext } from '@/app/contexts/GuildContext'
import { useLootList } from '@/app/contexts/LootListContext'
import { Button } from '@/components/ui/button'
import { isNeedRow } from '@/domain/loot/item-identity'
import { defaultNeedsFor, matchesSpecDefault } from '@/domain/loot/need-defaults'
import {
  NEED_PICK_COUNT,
  buildNeedRankings,
  readNeedPositions,
} from '@/domain/loot/need-picks'
import { findNeedDefinition } from '@/domain/loot/needs'

type Positions = ReadonlyArray<string | null>

const EMPTY_POSITIONS: Positions = Array.from({ length: NEED_PICK_COUNT }, () => null)

function samePositions(a: Positions, b: Positions): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index])
}

export function NeedPicker() {
  const { lootItems, submission, rankings, phaseTiers, needTierSlots, isSaving, saveSubmission } = useLootList()
  const { activeCharacter } = useGuildContext()
  const className = activeCharacter?.class?.name
  const specName = activeCharacter?.spec?.name

  const needRows = useMemo(() => lootItems.filter(isNeedRow), [lootItems])
  const rowsById = useMemo(
    () =>
      new Map(
        needRows.map((row) => [
          row.id,
          { need_key: row.need_key ?? null, raid_tier_id: row.raid_tier_id ?? null, kind: row.kind ?? null },
        ]),
      ),
    [needRows],
  )
  const rowIdByTierAndKey = useMemo(() => {
    const byTierAndKey = new Map<string, string>()
    for (const row of needRows) {
      if (row.need_key) byTierAndKey.set(`${row.raid_tier_id}|${row.need_key}`, row.id)
    }
    return byTierAndKey
  }, [needRows])

  // need_tier_slots counts every tier of the group, turned-off ones included, so
  // a lock never moves. The server serves need rows for the active tiers only,
  // so the picker builds rows for those; a turned-off tier's saved rows are
  // carried over untouched on save.
  const activeSlots = useMemo(() => {
    const active = new Set(phaseTiers.filter((tier) => tier.is_guild_active !== false).map((tier) => tier.id))
    return Object.fromEntries(Object.entries(needTierSlots ?? {}).filter(([tierId]) => active.has(tierId)))
  }, [phaseTiers, needTierSlots])

  const saved = useMemo(() => {
    const slots = new Set(Object.values(activeSlots))
    const visible: Record<string, string> = {}
    for (const [key, id] of Object.entries(rankings)) {
      if (slots.has(Number(key.split('-')[1]))) visible[key] = id
    }
    return readNeedPositions({ rankings: visible, rowsById, tierIds: Object.keys(activeSlots) })
  }, [rankings, rowsById, activeSlots])

  const hasSavedList = saved.positions.some((key) => key !== null)
  const defaults = defaultNeedsFor(className, specName)
  const base: Positions = hasSavedList ? saved.positions : (defaults ?? EMPTY_POSITIONS)

  // null until the raider changes something; the saved or default list shows until then.
  const [edited] = useState<Positions | null>(null)
  const positions = edited ?? base

  // A saved list the picker cannot read back cleanly opens as changed, so a
  // re-save writes the rows that were missing.
  const changed =
    (edited !== null && !samePositions(edited, base)) ||
    (hasSavedList && (!saved.consistent || saved.missingTiers.length > 0))
  const status = submission?.status ?? null
  const looksRight = matchesSpecDefault(positions, className, specName) && !changed && (status === null || status === 'draft')
  const complete = positions.every((key) => key !== null)

  const handleSave = async () => {
    if (!complete || isSaving) return
    const { rankings: fanOut, missing } = buildNeedRankings({
      positions,
      tierSlots: activeSlots,
      needRowFor: (tierId, needKey) => rowIdByTierAndKey.get(`${tierId}|${needKey}`),
    })
    // Need rows are seeded data, so a gap means the load is incomplete. Saving
    // fewer rows than the tiers need would be silent data loss.
    if (missing.length > 0) return

    // Rows the picker cannot see (a turned-off tier's) ride along unchanged.
    const carried: Record<string, string> = {}
    for (const [key, id] of Object.entries(rankings)) {
      if (!rowsById.has(id)) carried[key] = id
    }
    await saveSubmission(true, { rankings: { ...carried, ...fanOut } })
  }

  return (
    <section className="mx-auto w-full max-w-xl">
      <h2 className="text-3xl font-semibold">Your top 5 for Forever raids</h2>
      <ol className="mt-4 space-y-2">
        {positions.map((key, index) => (
          <li key={index}>
            Number {index + 1}: {(key && findNeedDefinition(key)?.name) || 'Pick a need'}
          </li>
        ))}
      </ol>
      <Button variant="primary" size="lg" className="mt-4 w-full" disabled={!complete} loading={isSaving} onClick={handleSave}>
        {looksRight ? 'Looks right' : 'Save my 5'}
      </Button>
    </section>
  )
}
