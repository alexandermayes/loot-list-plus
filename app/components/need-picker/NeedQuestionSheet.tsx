'use client'

/**
 * NeedQuestionSheet: NeedQuestionFlow in a phone bottom sheet (D-16, UI-01).
 *
 * Modal placement="sheet" supplies the focus trap, inert page, Escape, focus
 * return and body scroll lock. The sheet adds the header (question title, step
 * line, step dots, Back) and closes itself when the last question is answered.
 * Closing any other way discards the unfinished change: the flow lives inside
 * the dialog, which unmounts on close, so it always opens fresh at Q1.
 *
 * Copy signed off 2026-11-11 (04-19).
 */
import * as React from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'

import {
  NeedQuestionFlow,
  formatStepLine,
  type NeedQuestionFlowHandle,
  type NeedQuestionFlowProps,
  type NeedStepInfo,
} from '@/app/components/need-picker/NeedQuestionFlow'
import { Modal, ModalBody, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { cn } from '@/lib/utils'
import { EMPTY_NEED_FLOW_VALUE, type NeedFlowValue } from '@/domain/loot/need-questions'

export interface NeedQuestionSheetProps
  extends Pick<NeedQuestionFlowProps, 'eligibility' | 'currentNeedKey' | 'onComplete'> {
  open: boolean
  onClose: () => void
}

// Before the flow reports its first step the header shows the first question.
const FIRST_STEP: NeedStepInfo = {
  question: 'slot',
  title: 'Which slot?',
  number: 1,
  total: null,
  canGoBack: false,
}

export function NeedQuestionSheet({
  open,
  onClose,
  onComplete,
  eligibility,
  currentNeedKey,
}: NeedQuestionSheetProps) {
  return (
    <Modal open={open} onClose={onClose} placement="sheet" size="sm">
      <SheetContent
        onClose={onClose}
        onComplete={onComplete}
        eligibility={eligibility}
        currentNeedKey={currentNeedKey}
      />
    </Modal>
  )
}

function SheetContent({
  onClose,
  onComplete,
  eligibility,
  currentNeedKey,
}: Pick<NeedQuestionSheetProps, 'onClose' | 'onComplete' | 'eligibility' | 'currentNeedKey'>) {
  const [value, setValue] = React.useState<NeedFlowValue>(EMPTY_NEED_FLOW_VALUE)
  const [info, setInfo] = React.useState<NeedStepInfo>(FIRST_STEP)
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const flowRef = React.useRef<NeedQuestionFlowHandle>(null)

  return (
    <>
      <ModalHeader onClose={onClose}>
        <div className="flex items-center gap-2">
          {info.canGoBack ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => flowRef.current?.goBack()}
              className={cn(
                '-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground-secondary hover:bg-muted hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={24} aria-hidden="true" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <ModalTitle
              ref={titleRef}
              tabIndex={-1}
              className="text-lg font-semibold leading-tight outline-none"
            >
              {info.title}
            </ModalTitle>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-12 text-foreground-secondary">
                {formatStepLine(info.number, info.total)}
              </span>
              <StepDots number={info.number} total={info.total ?? info.number} />
            </div>
          </div>
        </div>
      </ModalHeader>
      <ModalBody>
        <NeedQuestionFlow
          ref={flowRef}
          variant="sheet"
          showHeading={false}
          headingRef={titleRef}
          onStepChange={setInfo}
          value={value}
          onChange={setValue}
          eligibility={eligibility}
          currentNeedKey={currentNeedKey}
          onComplete={(need) => {
            onComplete(need)
            onClose()
          }}
        />
      </ModalBody>
    </>
  )
}

// Decorative: the step line already says where the raider is, so the dots are
// aria-hidden. Only the current dot is accent (UI-SPEC colour rule 3).
function StepDots({ number, total }: { number: number; total: number }) {
  return (
    <ol data-testid="need-step-dots" aria-hidden="true" className="flex items-center gap-1">
      {Array.from({ length: total }, (_, index) => (
        <li
          key={index}
          className={cn('h-2 w-2 rounded-full', index + 1 === number ? 'bg-accent' : 'bg-muted')}
        />
      ))}
    </ol>
  )
}
