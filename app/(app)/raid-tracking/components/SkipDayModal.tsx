'use client'

import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseDate } from '@/utils/date'

interface SkipDayModalProps {
  open: boolean
  date: string | null
  reason: string
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function SkipDayModal({
  open,
  date,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
}: SkipDayModalProps) {
  return (
    <Modal open={open} onClose={onCancel} size="sm">
      <ModalHeader onClose={onCancel}>
        <ModalTitle>Skip raid day</ModalTitle>
        {date && (
          <ModalDescription>
            {parseDate(date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </ModalDescription>
        )}
      </ModalHeader>
      <ModalBody>
        <Label className="mb-2">Reason for skipping</Label>
        <Input
          variant="rounded"
          size="sm"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g., Holiday, Cancelled, Not enough signups..."
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Skip day
        </Button>
      </ModalFooter>
    </Modal>
  )
}
