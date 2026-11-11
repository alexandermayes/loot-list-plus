'use client'

/**
 * One row of the need picker (UI-SPEC surface 1, D-16).
 *
 * The top line is a single button that opens the question sheet; the bottom
 * line holds the cost marker and Move up. Rows are plain Cards in an ol, 8px
 * apart, and the need sentence wraps to as many lines as it needs, because it
 * is never truncated. Copy signed off 2026-11-11 (04-19).
 */
import type { Ref } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUp01Icon, Edit02Icon, PlusSignIcon } from '@hugeicons/core-free-icons'

import { NEED_SLOT_ICONS } from '@/app/components/need-picker/need-slot-icons'
import { NeedCostMarker } from '@/app/components/need-picker/NeedCostMarker'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { needCostWord } from '@/domain/loot/need-questions'
import { findNeedDefinition } from '@/domain/loot/needs'
import { LOCKED_RANK_LABEL } from '@/domain/loot/slot-locks'

export const EMPTY_ROW_LABEL = 'Pick a need'
export const MOVE_UP_LABEL = 'Move up'

interface NeedPickerRowProps {
  /** 1-based position in the list. */
  number: number
  needKey: string | null
  /** An award sits on this rank in some tier (D-05): the row cannot change or move. */
  locked: boolean
  lockTitle?: string
  /** Move up swaps with the row above; false when that row or this one is locked. */
  canMoveUp: boolean
  /**
   * The list is approved and not unlocked: the row is plain content, with no
   * tap target and no Move up (UI-SPEC surface 1). Unlike `locked`, it carries
   * no lock wording, because nothing about this one row is pinned.
   */
  readOnly?: boolean
  /** A short line for the row (04-20 renders the server refusals here). */
  warning?: string | null
  /** Brief neutral highlight after a change. */
  highlighted?: boolean
  onChange: () => void
  onMoveUp: () => void
  mainRef?: Ref<HTMLButtonElement>
  moveUpRef?: Ref<HTMLButtonElement>
}

export function NeedPickerRow({
  number,
  needKey,
  locked,
  lockTitle,
  canMoveUp,
  readOnly = false,
  warning = null,
  highlighted = false,
  onChange,
  onMoveUp,
  mainRef,
  moveUpRef,
}: NeedPickerRowProps) {
  const definition = findNeedDefinition(needKey)
  const sentence = definition?.name ?? null
  // Only the main-spec need is ever shown, so no spec word appears in a name.
  const label =
    definition === null
      ? `Number ${number}: ${EMPTY_ROW_LABEL}.`
      : `Number ${number}: ${definition.name}. ${needCostWord(definition.slot)} pick. Change.`

  return (
    <li>
      <Card
        className={`p-4 transition-colors duration-slow motion-reduce:transition-none sm:p-6 ${
          highlighted ? 'bg-muted' : ''
        } ${definition === null ? 'border-dashed border-border-strong' : ''}`}
      >
        {readOnly ? (
          <div className="flex min-h-14 w-full items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-md font-semibold tabular-nums"
            >
              {number}
            </span>
            {definition !== null ? (
              <>
                <HugeiconsIcon
                  icon={NEED_SLOT_ICONS[definition.slot]}
                  size={24}
                  aria-hidden="true"
                  className="shrink-0 text-foreground-secondary"
                />
                <span className="min-w-0 flex-1 break-words text-lg font-semibold leading-tight">{sentence}</span>
              </>
            ) : (
              <span className="min-w-0 flex-1 text-lg font-semibold leading-tight text-foreground-secondary">
                {EMPTY_ROW_LABEL}
              </span>
            )}
          </div>
        ) : (
          <button
            ref={mainRef}
            type="button"
            aria-label={label}
            title={locked ? lockTitle : undefined}
            disabled={locked}
            onClick={onChange}
            className="flex min-h-14 w-full items-center gap-2 rounded-lg text-left hover:bg-muted active:bg-muted disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-md font-semibold tabular-nums"
            >
              {number}
            </span>
            {definition !== null ? (
              <>
                <HugeiconsIcon
                  icon={NEED_SLOT_ICONS[definition.slot]}
                  size={24}
                  aria-hidden="true"
                  className="shrink-0 text-foreground-secondary"
                />
                <span className="min-w-0 flex-1 break-words text-lg font-semibold leading-tight">
                  {sentence}
                </span>
                {locked ? null : (
                  <HugeiconsIcon icon={Edit02Icon} size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                )}
              </>
            ) : (
              <>
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  size={24}
                  aria-hidden="true"
                  className="shrink-0 text-foreground-secondary"
                />
                <span className="min-w-0 flex-1 text-lg font-semibold leading-tight">
                  {EMPTY_ROW_LABEL}
                </span>
              </>
            )}
          </button>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {definition !== null ? <NeedCostMarker slot={definition.slot} /> : null}
            {locked ? <span className="text-12 text-foreground-secondary">{LOCKED_RANK_LABEL}</span> : null}
          </div>
          {number > 1 && !readOnly ? (
            <Button
              ref={moveUpRef}
              type="button"
              variant="ghost"
              disabled={!canMoveUp}
              aria-label={`Move ${sentence ?? EMPTY_ROW_LABEL.toLowerCase()} up to number ${number - 1}`}
              onClick={onMoveUp}
              className="shrink-0"
            >
              <HugeiconsIcon icon={ArrowUp01Icon} size={16} aria-hidden="true" />
              {MOVE_UP_LABEL}
            </Button>
          ) : null}
        </div>

        {warning ? (
          <div className="mt-2 rounded-lg border border-warning/30 bg-warning/10 p-2">
            <p className="text-md text-foreground">{warning}</p>
          </div>
        ) : null}
      </Card>
    </li>
  )
}
