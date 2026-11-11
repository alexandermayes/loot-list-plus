'use client'

/**
 * NeedQuestionFlow: the reusable, controlled question flow behind the Discovery
 * need picker (D-16, UI-01).
 *
 * It renders only the questions, no dialog: NeedQuestionSheet wraps it in a
 * bottom sheet for the raider's rows, and the Phase 5 Drop Desk mounts it
 * inline with eligibility null to classify a drop as any need. The parent owns
 * the answers (value and onChange) and decides what happens on the last one
 * (onComplete), so the flow never knows about budgets, lists or saving.
 *
 * Every offered option comes from the eligible list, so eligibility cannot fail
 * inside the flow. A decided question is skipped when the flow moves on, and a
 * tap advances after 150ms, with no delay under prefers-reduced-motion.
 *
 * All copy is DRAFT for the owner's 04-19 sign-off.
 */
import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'

import { NEED_SLOT_ICONS } from '@/app/components/need-picker/need-slot-icons'
import { cn } from '@/lib/utils'
import {
  needCostWord,
  nextNeedQuestion,
  applyNeedAnswer,
  optionsFor,
  pruneNeedValue,
  questionsFor,
  resolveNeed,
  topArmourFor,
  NEED_ARMOUR_LABELS,
  NEED_SLOT_LABELS,
  NEED_STAT_LABELS,
  type NeedFlowValue,
  type NeedOption,
  type NeedOptionKey,
  type NeedQuestion,
} from '@/domain/loot/need-questions'
import { findNeedDefinition, type NeedDefinition, type NeedSlotKey, type NeedStatKey } from '@/domain/loot/needs'

/** The auto-advance delay, the same as duration-fast. */
const ADVANCE_MS = 150

export const NEED_QUESTION_TITLES: Readonly<Record<NeedQuestion, string>> = Object.freeze({
  slot: 'Which slot?',
  armour: 'Which armour?',
  stat: 'Which stats?',
})

const CURRENT_TAG = 'Current'
const TOP_ARMOUR_TAG = 'Your armour'
const STAT_HELPERS: Readonly<Partial<Record<NeedStatKey, string>>> = Object.freeze({
  physical: 'Strength or agility',
})

/** What the sheet header needs to draw itself around the flow. */
export interface NeedStepInfo {
  question: NeedQuestion
  title: string
  /** 1-based position among the questions that apply. */
  number: number
  /** Null until a slot is chosen: only then is the number of questions known. */
  total: number | null
  canGoBack: boolean
}

export interface NeedQuestionFlowHandle {
  /** Back to the previous shown question, answers kept. */
  goBack: () => void
}

export function formatStepLine(number: number, total: number | null): string {
  return total === null ? `Question ${number}` : `Question ${number} of ${total}`
}

export interface NeedQuestionFlowProps {
  value: NeedFlowValue
  onChange: (value: NeedFlowValue) => void
  /** Called once, when the last applicable question is answered. */
  onComplete: (need: NeedDefinition) => void
  /** The needs the character may pick, or null for any need (the Drop Desk). */
  eligibility: readonly NeedDefinition[] | null
  variant: 'sheet' | 'inline'
  /** The need the row holds now; its slot carries a Current tag. */
  currentNeedKey?: string | null
  /**
   * False when the host draws the question title and step line itself (the
   * sheet puts them in its dialog header, where the dialog is labelled).
   */
  showHeading?: boolean
  /** The host's title element, focused on each step change when showHeading is false. */
  headingRef?: React.RefObject<HTMLElement | null>
  onStepChange?: (info: NeedStepInfo) => void
  ref?: React.Ref<NeedQuestionFlowHandle>
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function firstOpenQuestion(value: NeedFlowValue, eligibility: readonly NeedDefinition[] | null): NeedQuestion {
  return questionsFor(value, eligibility).find((question) => value[question] === null) ?? 'slot'
}

// The sentence follows the resolved need when there is one, so a class with a
// single stat still reads "Chest, Plate, Tank" and not "Chest, Plate".
function buildingSentence(value: NeedFlowValue, eligibility: readonly NeedDefinition[] | null): string {
  const resolved = resolveNeed(value, eligibility)
  const parts = resolved ?? value
  const words = [
    parts.slot ? NEED_SLOT_LABELS[parts.slot] : null,
    parts.armour ? NEED_ARMOUR_LABELS[parts.armour] : null,
    parts.stat ? NEED_STAT_LABELS[parts.stat] : null,
  ].filter((word): word is string => word !== null)
  return words.length === 0 ? '' : `Picking: ${words.join(', ')}`
}

const OPTION_FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'

function optionSurface(pressed: boolean): string {
  return pressed
    ? 'border-accent bg-accent/10'
    : 'border-border bg-card hover:border-border-strong'
}

export function NeedQuestionFlow({
  value,
  onChange,
  onComplete,
  eligibility,
  variant,
  currentNeedKey = null,
  showHeading = true,
  headingRef: hostHeadingRef,
  onStepChange,
  ref,
}: NeedQuestionFlowProps) {
  const ownHeadingRef = React.useRef<HTMLHeadingElement>(null)
  const focusPending = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [step, setStep] = React.useState<NeedQuestion>(() => firstOpenQuestion(value, eligibility))
  // The questions already shown, so Back skips the ones auto-advance skipped.
  const [history, setHistory] = React.useState<NeedQuestion[]>([])

  const questions = questionsFor(value, eligibility)
  const shown = questions.includes(step) ? step : questions[0]
  const number = questions.indexOf(shown) + 1
  const total = value.slot !== null ? questions.length : null
  const canGoBack = history.length > 0

  const currentNeed = findNeedDefinition(currentNeedKey)
  const topArmour = topArmourFor(eligibility)

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  React.useEffect(() => clearTimer, [clearTimer])

  // Focus follows the question so a screen reader reads the new title first.
  // Only after an advance or Back: opening the flow must not steal focus from
  // the dialog's own first control.
  React.useEffect(() => {
    if (!focusPending.current) return
    focusPending.current = false
    ;(showHeading ? ownHeadingRef.current : hostHeadingRef?.current)?.focus()
  }, [shown, showHeading, hostHeadingRef])

  // The host header must be right before first paint, or the dialog would be
  // labelled by an empty title for a frame. The callback sits in a ref so a
  // new function identity each render cannot re-fire this.
  const onStepChangeRef = React.useRef(onStepChange)
  React.useLayoutEffect(() => {
    onStepChangeRef.current = onStepChange
  })
  React.useLayoutEffect(() => {
    onStepChangeRef.current?.({ question: shown, title: NEED_QUESTION_TITLES[shown], number, total, canGoBack })
  }, [shown, number, total, canGoBack])

  const goBack = React.useCallback(() => {
    clearTimer()
    const previous = history[history.length - 1]
    if (previous === undefined) return
    focusPending.current = true
    setHistory(history.slice(0, -1))
    setStep(previous)
  }, [clearTimer, history])
  React.useImperativeHandle(ref, () => ({ goBack }), [goBack])

  const advanceTo = (next: NeedQuestion) => {
    const run = () => {
      focusPending.current = true
      setHistory((shownBefore) => [...shownBefore, shown])
      setStep(next)
    }
    if (prefersReducedMotion()) run()
    else timer.current = setTimeout(run, ADVANCE_MS)
  }

  const pick = (question: NeedQuestion, key: NeedOptionKey) => {
    clearTimer()
    const answered = pruneNeedValue(applyNeedAnswer(value, question, key), eligibility)
    onChange(answered)

    const next = nextNeedQuestion(answered, question, eligibility)
    if (next !== null) {
      advanceTo(next)
      return
    }
    const need = resolveNeed(answered, eligibility)
    if (need !== null) onComplete(need)
  }

  const groups = optionsFor(shown, value, eligibility)
  const titleId = React.useId()

  return (
    <div data-variant={variant} className={cn('flex flex-col gap-4', variant === 'inline' && 'rounded-xl border border-border bg-card p-4')}>
      <div className="flex flex-col gap-1">
        {variant === 'inline' && canGoBack ? (
          <button
            type="button"
            onClick={goBack}
            className={cn(
              'flex min-h-[44px] w-fit items-center gap-1 rounded-lg px-2 text-12 font-semibold text-foreground-secondary hover:bg-muted',
              OPTION_FOCUS,
            )}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
            Back
          </button>
        ) : null}
        {showHeading ? (
          <>
            <h3
              id={titleId}
              ref={ownHeadingRef}
              tabIndex={-1}
              className="text-lg font-semibold leading-tight text-foreground outline-none"
            >
              {NEED_QUESTION_TITLES[shown]}
            </h3>
            <p className="text-12 text-foreground-secondary">{formatStepLine(number, total)}</p>
          </>
        ) : null}
        <p
          data-testid="need-building-sentence"
          aria-live="polite"
          className="min-h-[1.5rem] text-12 text-foreground-secondary"
        >
          {buildingSentence(value, eligibility)}
        </p>
      </div>

      {shown === 'slot' ? (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label ?? undefined} className="flex flex-col gap-2">
              <h4 className="text-12 font-semibold uppercase tracking-wide text-foreground-secondary">
                {group.label}
              </h4>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.options.map((option) => (
                  <SlotTile
                    key={option.key}
                    option={option}
                    pressed={value.slot === option.key}
                    isCurrent={currentNeed?.slot === option.key}
                    onPick={() => pick('slot', option.key)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div
          role="group"
          aria-label={showHeading ? undefined : NEED_QUESTION_TITLES[shown]}
          aria-labelledby={showHeading ? titleId : undefined}
          className="flex flex-col gap-2"
        >
          {groups.flatMap((group) =>
            group.options.map((option) => (
              <ChoiceRow
                key={option.key}
                option={option}
                pressed={value[option.question] === option.key}
                tag={option.question === 'armour' && option.key === topArmour ? TOP_ARMOUR_TAG : null}
                helper={option.question === 'stat' ? (STAT_HELPERS[option.key as NeedStatKey] ?? null) : null}
                onPick={() => pick(option.question, option.key)}
              />
            )),
          )}
        </div>
      )}
    </div>
  )
}

function SlotTile({
  option,
  pressed,
  isCurrent,
  onPick,
}: {
  option: NeedOption
  pressed: boolean
  isCurrent: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPick}
      className={cn(
        'flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition-colors duration-fast motion-reduce:transition-none',
        optionSurface(pressed),
        OPTION_FOCUS,
      )}
    >
      <HugeiconsIcon
        icon={NEED_SLOT_ICONS[option.key as NeedSlotKey]}
        size={24}
        aria-hidden="true"
        className="shrink-0 text-foreground-secondary"
      />
      <span className="text-12 font-semibold text-foreground">{option.label}</span>
      <span className="text-12 text-muted-foreground">{needCostWord(option.key as NeedSlotKey)}</span>
      {isCurrent ? (
        <span className="rounded border border-border px-1 text-12 font-semibold text-foreground-secondary">
          {CURRENT_TAG}
        </span>
      ) : null}
    </button>
  )
}

function ChoiceRow({
  option,
  pressed,
  tag,
  helper,
  onPick,
}: {
  option: NeedOption
  pressed: boolean
  tag: string | null
  helper: string | null
  onPick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onPick}
      className={cn(
        'flex min-h-[56px] w-full items-center justify-between gap-2 rounded-lg border px-4 py-2 text-left transition-colors duration-fast motion-reduce:transition-none',
        optionSurface(pressed),
        OPTION_FOCUS,
      )}
    >
      <span className="flex flex-col">
        <span className="text-lg font-semibold leading-tight text-foreground">{option.label}</span>
        {helper ? <span className="text-12 text-muted-foreground">{helper}</span> : null}
      </span>
      {tag ? (
        <span className="rounded border border-border px-1 text-12 font-semibold text-foreground-secondary">
          {tag}
        </span>
      ) : null}
    </button>
  )
}
