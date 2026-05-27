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

interface BonusRaidModalProps {
  open: boolean
  date: string
  notes: string
  maxDate: string
  creating: boolean
  activeTeamId: string | null
  hasTeams: boolean
  onDateChange: (value: string) => void
  onNotesChange: (value: string) => void
  onCancel: () => void
  onSubmit: () => void
}

export function BonusRaidModal({
  open,
  date,
  notes,
  maxDate,
  creating,
  activeTeamId,
  hasTeams,
  onDateChange,
  onNotesChange,
  onCancel,
  onSubmit,
}: BonusRaidModalProps) {
  const teamHint = activeTeamId
    ? ' Tied to the selected team.'
    : hasTeams
      ? ' No team selected, so this event will be unassigned.'
      : ''

  return (
    <Modal open={open} onClose={() => !creating && onCancel()} size="sm">
      <ModalHeader onClose={() => !creating && onCancel()}>
        <ModalTitle>Add bonus raid day</ModalTitle>
        <ModalDescription>
          Track an off-schedule raid. Attendance and loot count like a regular raid day.{teamHint}
        </ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div>
          <Label className="mb-2">Raid date</Label>
          <Input
            type="date"
            variant="rounded"
            size="sm"
            value={date}
            max={maxDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-2">Notes (optional)</Label>
          <Input
            variant="rounded"
            size="sm"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="e.g., Heroic split run, Saturday alt night..."
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onCancel} disabled={creating}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          loading={creating}
          disabled={!date || creating}
        >
          Add raid day
        </Button>
      </ModalFooter>
    </Modal>
  )
}
