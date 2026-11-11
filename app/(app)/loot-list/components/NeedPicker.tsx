'use client'

/**
 * NeedPicker: the five-row list a Discovery group's raider fills in instead of
 * the 50-rank editor (D-11, D-12, D-27).
 *
 * Edits stay local until the primary button: the editor's autosave does not run
 * here, because saveSubmission with explicit rankings writes the whole list at
 * once (five picks fanned out over every Discovery tier, D-02). Both save
 * buttons submit to officer review; nothing is approved here (D-27).
 *
 * All copy is DRAFT for the owner's 04-19 sign-off, so it sits in one table.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { UserAdd01Icon } from '@hugeicons/core-free-icons'

import { NeedPickerRow } from '@/app/(app)/loot-list/components/NeedPickerRow'
import { BudgetLine } from '@/app/components/need-picker/BudgetLine'
import { NeedQuestionSheet } from '@/app/components/need-picker/NeedQuestionSheet'
import type { NeedOptionContext } from '@/app/components/need-picker/NeedQuestionFlow'
import { useGuildContext, type Character } from '@/app/contexts/GuildContext'
import { useLootList } from '@/app/contexts/LootListContext'
import { Button } from '@/components/ui/button'
import { badgeVariants } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { isNeedRow } from '@/domain/loot/item-identity'
import { positionKey } from '@/domain/loot/list-row-updates'
import {
  NEED_BUDGET_POINTS,
  budgetForPicks,
  costForSlot,
  needCopyViolation,
  needOverBudgetSentence,
  wouldGoOver,
} from '@/domain/loot/need-budget'
import { defaultNeedsFor, matchesSpecDefault } from '@/domain/loot/need-defaults'
import { eligibleNeedsFor } from '@/domain/loot/need-eligibility'
import {
  NEED_PICK_COUNT,
  NEED_PICK_RANKS,
  buildNeedRankings,
  readNeedPositions,
} from '@/domain/loot/need-picks'
import type { NeedQuestion, NeedOptionKey } from '@/domain/loot/need-questions'
import type { NeedDefinition, NeedSlotKey } from '@/domain/loot/needs'
import { lockedRankTitle } from '@/domain/loot/slot-locks'
import { cn } from '@/lib/utils'

const EditCharacterModal = dynamic(() =>
  import('@/app/components/EditCharacterModal').then((mod) => ({ default: mod.EditCharacterModal })),
)
const CreateCharacterModal = dynamic(() =>
  import('@/app/components/CreateCharacterModal').then((mod) => ({ default: mod.CreateCharacterModal })),
)

// DRAFT copy, UI-SPEC "Picker (surface 1)". The over-budget sentence comes from
// needOverBudgetSentence so the picker and the submit route say the same words.
export const NEED_PICKER_COPY = {
  title: 'Your top 5 for Forever raids',
  orderHelper: 'Number 1 is the gear you want most.',
  noDefaultHelper: 'Pick the five gear needs you want most.',
  thirdCopy: 'You already have two of these in your 5.',
  duplicate: 'That need is already in your 5.',
  lookRight: 'Looks right',
  save: 'Save my 5',
  saving: 'Saving...',
  noCharacterTitle: 'Create a character first',
  noCharacterBody: 'You need a character in this guild before you can set your 5.',
  noCharacterAction: 'Create character',
} as const

const defaultHelper = (spec: string, className: string) =>
  `We picked these for ${spec} ${className}. Tap a row to change it.`
const incompleteHelper = (picked: number) => `Pick all 5 to save. ${picked} of ${NEED_PICK_COUNT} picked.`
const scopeLine = (raids: number) =>
  raids === 1 ? 'One list for the Forever raid this phase.' : `One list for all ${raids} Forever raids this phase.`

type Positions = ReadonlyArray<string | null>

const EMPTY_POSITIONS: Positions = Array.from({ length: NEED_PICK_COUNT }, () => null)

function samePositions(a: Positions, b: Positions): boolean {
  return a.length === b.length && a.every((key, index) => key === b[index])
}

/** Gate: the picker needs a character in this guild. */
export function NeedPicker() {
  const { activeCharacter } = useGuildContext()
  const [creating, setCreating] = useState(false)

  if (!activeCharacter) {
    return (
      <>
        <EmptyState
          icon={UserAdd01Icon}
          title={NEED_PICKER_COPY.noCharacterTitle}
          description={NEED_PICKER_COPY.noCharacterBody}
          action={{ label: NEED_PICKER_COPY.noCharacterAction, onClick: () => setCreating(true) }}
          variant="card"
          size="lg"
        />
        {creating ? <CreateCharacterModal isOpen onClose={() => setCreating(false)} /> : null}
      </>
    )
  }
  return <NeedPickerBody character={activeCharacter} />
}

function NeedPickerBody({ character }: { character: Character }) {
  const { lootItems, submission, rankings, phaseTiers, needTierSlots, lockedPositions, isSaving, saveSubmission } =
    useLootList()
  const className = character.class?.name
  const specName = character.spec?.name

  const eligibility = useMemo(() => eligibleNeedsFor({ className, specName }), [className, specName])

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
  const raidCount = Object.keys(activeSlots).length

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
  const [edited, setEdited] = useState<Positions | null>(null)
  const positions = edited ?? base

  // A saved list the picker cannot read back cleanly opens as changed, so a
  // re-save writes the rows that were missing.
  const changed =
    (edited !== null && !samePositions(edited, base)) ||
    (hasSavedList && (!saved.consistent || saved.missingTiers.length > 0))
  const status = submission?.status ?? null
  const isDefaultList = matchesSpecDefault(positions, className, specName)
  const looksRight = isDefaultList && !changed && (status === null || status === 'draft')

  const picked = positions.filter((key) => key !== null).length
  const complete = picked === NEED_PICK_COUNT
  const budget = budgetForPicks(positions)
  const overSentence = budget.used > NEED_BUDGET_POINTS ? needOverBudgetSentence(budget.bigPicks) : null

  // D-05: an award on this rank in any tier, turned-off ones included, pins the row.
  const allSlots = useMemo(() => Object.values(needTierSlots ?? {}), [needTierSlots])
  const locks = useMemo(
    () =>
      NEED_PICK_RANKS.map((rank) => {
        for (const slot of allSlots) {
          const lock = lockedPositions[positionKey(rank, slot)]
          if (lock) return lock
        }
        return null
      }),
    [allSlots, lockedPositions],
  )

  const [sheetRow, setSheetRow] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [highlightRow, setHighlightRow] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [specOpen, setSpecOpen] = useState(false)

  const mainRefs = useRef<Array<HTMLButtonElement | null>>([])
  const moveRefs = useRef<Array<HTMLButtonElement | null>>([])
  const pendingFocus = useRef<number | null>(null)

  // Focus follows the moved row, but only after React has put the rows in
  // their new order.
  useEffect(() => {
    const row = pendingFocus.current
    if (row === null) return
    pendingFocus.current = null
    // Row 1 has no Move up, so focus falls to its main button.
    ;(row === 0 ? mainRefs.current[row] : moveRefs.current[row])?.focus()
  }, [positions])

  useEffect(() => {
    if (highlightRow === null) return
    const timer = setTimeout(() => setHighlightRow(null), 600)
    return () => clearTimeout(timer)
  }, [highlightRow])

  // The list is padded by the footer's height so the sticky footer can never
  // sit over the last row. No setState here: the padding is written straight to
  // the element from the observer.
  const footerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const footer = footerRef.current
    const list = listRef.current
    if (!footer || !list || typeof ResizeObserver === 'undefined') return
    const apply = () => {
      list.style.paddingBottom = `${footer.offsetHeight}px`
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  const replaceRow = (row: number, key: string) => {
    const next = [...positions]
    next[row] = key
    setEdited(next)
    setHighlightRow(row)
  }

  const moveUp = (row: number) => {
    if (row < 1 || locks[row] || locks[row - 1]) return
    const next = [...positions]
    ;[next[row - 1], next[row]] = [next[row], next[row - 1]]
    pendingFocus.current = row - 1
    setEdited(next)
    setAnnouncement(`Moved to number ${row}.`)
  }

  // The sheet asks this for every option it could show. Budget is judged on the
  // slot question (cost depends on the slot alone), duplicates and copy caps on
  // the need the tap would finish.
  const optionState = (question: NeedQuestion, option: NeedOptionKey, context: NeedOptionContext): string | null => {
    if (question === 'slot') {
      const slot = option as NeedSlotKey
      const cost = costForSlot(slot)
      if (wouldGoOver(positions, sheetRow, cost)) {
        const others = positions.map((key, position) => (position === sheetRow ? null : key))
        return needOverBudgetSentence(budgetForPicks(others).bigPicks + (cost === 3 ? 1 : 0))
      }
    }
    if (context.need !== null) {
      const violation = needCopyViolation(positions, sheetRow, context.need.key)
      if (violation === 'third-copy') return NEED_PICKER_COPY.thirdCopy
      if (violation === 'duplicate') return NEED_PICKER_COPY.duplicate
    }
    return null
  }

  const handleSave = async () => {
    if (!complete || overSentence !== null || isSaving) return
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

  const specLabel = specName ? `${specName} ${className}` : `${className ?? 'Class'}`
  const showDefaultHelper = defaults !== null && isDefaultList
  const showNoDefaultHelper = picked === 0

  return (
    <section className="mx-auto w-full max-w-xl">
      <div ref={listRef}>
        <div>
          <h2 className="text-3xl font-semibold">{NEED_PICKER_COPY.title}</h2>
          <p className="mt-1 text-md text-foreground-secondary">{NEED_PICKER_COPY.orderHelper}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-lg font-semibold" style={{ color: character.class?.color_hex }}>
              {character.name}
            </span>
            <button
              type="button"
              aria-label={`${specLabel}. Change spec.`}
              onClick={() => setSpecOpen(true)}
              className={cn(badgeVariants({ variant: 'outline' }), 'min-h-11 gap-2 px-3 hover:bg-muted')}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: character.class?.color_hex }}
              />
              <span className="text-12 font-semibold">{specLabel}</span>
            </button>
          </div>
        </div>

        {showDefaultHelper ? (
          <p className="mt-4 text-md text-foreground-secondary">{defaultHelper(specName ?? '', className ?? '')}</p>
        ) : showNoDefaultHelper ? (
          <p className="mt-4 text-md text-foreground-secondary">{NEED_PICKER_COPY.noDefaultHelper}</p>
        ) : null}

        <ol className="mt-4 space-y-2">
          {positions.map((key, row) => (
            <NeedPickerRow
              key={row}
              number={row + 1}
              needKey={key}
              locked={locks[row] !== null}
              lockTitle={locks[row] ? lockedRankTitle(locks[row].locked_at) : undefined}
              canMoveUp={row > 0 && !locks[row] && !locks[row - 1]}
              highlighted={highlightRow === row}
              onChange={() => {
                setSheetRow(row)
                setSheetOpen(true)
              }}
              onMoveUp={() => moveUp(row)}
              mainRef={(element) => {
                mainRefs.current[row] = element
              }}
              moveUpRef={(element) => {
                moveRefs.current[row] = element
              }}
            />
          ))}
        </ol>

        <p className="mt-4 text-12 text-muted-foreground">{scopeLine(raidCount)}</p>
        <p role="status" aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </div>

      <div
        ref={footerRef}
        className="sticky bottom-0 mt-4 border-t border-border bg-background-subtle p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <BudgetLine used={budget.used} overSentence={overSentence} />
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="mt-4 w-full"
          disabled={!complete || overSentence !== null}
          loading={isSaving}
          loadingText={NEED_PICKER_COPY.saving}
          aria-describedby={complete ? undefined : 'need-picker-incomplete'}
          onClick={handleSave}
        >
          {looksRight ? NEED_PICKER_COPY.lookRight : NEED_PICKER_COPY.save}
        </Button>
        {complete ? null : (
          <p id="need-picker-incomplete" className="mt-2 text-12 text-foreground-secondary">
            {incompleteHelper(picked)}
          </p>
        )}
      </div>

      <NeedQuestionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        // An empty flow value, not the row's need: pre-filled answers would count as decided and skip the questions.
        currentNeedKey={positions[sheetRow]}
        eligibility={eligibility}
        optionState={optionState}
        onComplete={(need: NeedDefinition) => replaceRow(sheetRow, need.key)}
      />

      {specOpen ? <EditCharacterModal isOpen onClose={() => setSpecOpen(false)} character={character} /> : null}
    </section>
  )
}
