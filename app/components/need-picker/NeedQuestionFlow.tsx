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
}: NeedQuestionFlowProps) {
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const focusPending = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [step, setStep] = React.useState<NeedQuestion>(() => firstOpenQuestion(value, eligibility))

  const questions = questionsFor(value, eligibility)
  const shown = questions.includes(step) ? step : questions[0]
  const slotKnown = value.slot !== null
  const stepLine = slotKnown
    ? `Question ${questions.indexOf(shown) + 1} of ${questions.length}`
    : `Question ${questions.indexOf(shown) + 1}`

  const currentNeed = findNeedDefinition(currentNeedKey)
  const topArmour = topArmourFor(eligibility)

  const clearTimer = React.useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  React.useEffect(() => clearTimer, [clearTimer])

  // Focus follows the question so a screen reader reads the new title first.
  // Only after an advance: opening the flow must not steal focus from the
  // dialog's own first control.
  React.useEffect(() => {
    if (!focusPending.current) return
    focusPending.current = false
    headingRef.current?.focus()
  }, [shown])

  const advanceTo = (next: NeedQuestion) => {
    const run = () => {
      focusPending.current = true
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
        <h3
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold leading-tight text-foreground outline-none"
        >
          {NEED_QUESTION_TITLES[shown]}
        </h3>
        <p className="text-12 text-foreground-secondary">{stepLine}</p>
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
        <div role="group" aria-labelledby={titleId} className="flex flex-col gap-2">
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
