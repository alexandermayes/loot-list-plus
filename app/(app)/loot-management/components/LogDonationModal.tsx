'use client'

import { useState, useEffect } from 'react'
import {
  Modal, ModalHeader, ModalTitle, ModalDescription,
  ModalBody, ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Text } from '@/components/ui/typography'
import { useNotification } from '@/app/contexts/NotificationContext'

export type DonationKind = 'gold' | 'materials' | 'consumables' | 'other'

export interface DonationRecord {
  id: string
  guild_id: string
  character_id: string | null
  character_name: string
  points: number
  kind: DonationKind
  amount_text: string | null
  note: string | null
  awarded_at: string
  awarded_by: string | null
  created_at: string
  updated_at: string
}

interface Member {
  character_id: string
  character_name: string
  class_color: string
}

interface LogDonationModalProps {
  open: boolean
  onClose: () => void
  guildId: string
  members: Member[]
  /** When provided, the modal opens in edit mode. */
  editing?: DonationRecord | null
  /** Fired after a successful create/edit so the parent can refresh the list. */
  onSaved: () => void
}

const KIND_LABELS: Record<DonationKind, string> = {
  gold: 'Gold',
  materials: 'Materials',
  consumables: 'Consumables',
  other: 'Other',
}

const today = () => new Date().toISOString().slice(0, 10)

export default function LogDonationModal({
  open, onClose, guildId, members, editing, onSaved,
}: LogDonationModalProps) {
  const { showNotification } = useNotification()

  const [characterId, setCharacterId] = useState('')
  const [kind, setKind] = useState<DonationKind>('gold')
  const [amountText, setAmountText] = useState('')
  const [points, setPoints] = useState('')
  const [note, setNote] = useState('')
  const [awardedAt, setAwardedAt] = useState(today())
  const [submitting, setSubmitting] = useState(false)

  const isEdit = !!editing

  // Reset form whenever the modal opens (or the editing target changes).
  useEffect(() => {
    if (!open) return
    if (editing) {
      setCharacterId(editing.character_id ?? '')
      setKind(editing.kind)
      setAmountText(editing.amount_text ?? '')
      setPoints(String(editing.points))
      setNote(editing.note ?? '')
      setAwardedAt(editing.awarded_at)
    } else {
      setCharacterId('')
      setKind('gold')
      setAmountText('')
      setPoints('')
      setNote('')
      setAwardedAt(today())
    }
  }, [open, editing])

  const selectedMember = members.find(m => m.character_id === characterId) || null
  const parsedPoints = Number(points)
  const pointsValid = points !== '' && Number.isFinite(parsedPoints) && parsedPoints !== 0 && parsedPoints >= -1000 && parsedPoints <= 1000
  const canSubmit = !submitting && pointsValid && (isEdit || !!characterId)

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)

    try {
      let response: Response
      if (isEdit && editing) {
        response = await fetch(`/api/donations/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            points: parsedPoints,
            kind,
            amount_text: amountText.trim() || null,
            note: note.trim() || null,
            awarded_at: awardedAt,
          }),
        })
      } else {
        response = await fetch('/api/donations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: guildId,
            character_id: characterId,
            points: parsedPoints,
            kind,
            amount_text: amountText.trim() || null,
            note: note.trim() || null,
            awarded_at: awardedAt,
          }),
        })
      }

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        showNotification('error', result.error || `Couldn't ${isEdit ? 'save' : 'log'} donation. Try again.`)
        return
      }

      showNotification('success', isEdit ? 'Donation updated.' : 'Donation logged.')
      onSaved()
      onClose()
    } catch (err) {
      console.error('Donation save error:', err)
      showNotification('error', `Couldn't ${isEdit ? 'save' : 'log'} donation. Try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="default">
      <ModalHeader onClose={onClose}>
        <ModalTitle>{isEdit ? 'Edit donation' : 'Log donation'}</ModalTitle>
        <ModalDescription>
          {isEdit
            ? 'Update the details. The original timestamp is preserved.'
            : 'Record a bank donation. Points apply to the raider’s Loot Score.'}
        </ModalDescription>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4">
          <div>
            <Label className="mb-2">Character</Label>
            {isEdit ? (
              <div className="px-3 py-2 rounded-pill border border-border bg-background-subtle text-sm">
                <span style={{ color: editing?.character_id
                  ? members.find(m => m.character_id === editing.character_id)?.class_color
                  : undefined }}>
                  {editing?.character_name}
                </span>
                <Text size="xs" color="muted" className="ml-2 inline">
                  (cannot reassign: delete and recreate to move)
                </Text>
              </div>
            ) : (
              <Select
                variant="pill"
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
              >
                <option value="">Select a character...</option>
                {members.map(m => (
                  <option key={m.character_id} value={m.character_id}>
                    {m.character_name}
                  </option>
                ))}
              </Select>
            )}
            {selectedMember && !isEdit && (
              <Text size="xs" className="mt-1.5 ml-1" style={{ color: selectedMember.class_color }}>
                {selectedMember.character_name}
              </Text>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Kind</Label>
              <Select
                variant="pill"
                value={kind}
                onChange={(e) => setKind(e.target.value as DonationKind)}
              >
                {(Object.keys(KIND_LABELS) as DonationKind[]).map(k => (
                  <option key={k} value={k}>{KIND_LABELS[k]}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="mb-2">Date</Label>
              <DatePicker
                variant="pill"
                value={awardedAt}
                onChange={(e) => setAwardedAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="mb-2">Amount</Label>
            <Input
              variant="pill"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              placeholder="50,000g · 200 flasks · stack of saronite"
              maxLength={200}
            />
            <Text size="xs" color="muted" className="mt-1 ml-1">
              Free-form description for the audit trail.
            </Text>
          </div>

          <div>
            <Label className="mb-2">Points awarded</Label>
            <Input
              variant="pill"
              type="number"
              step="0.5"
              min={-1000}
              max={1000}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="5"
            />
            <Text size="xs" color="muted" className="mt-1 ml-1">
              Signed. Negative values clawback prior bonuses. Range: -1000 to 1000.
            </Text>
          </div>

          <div>
            <Label className="mb-2">Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth remembering later"
              maxLength={500}
              rows={2}
            />
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
        >
          {isEdit ? 'Save changes' : 'Log donation'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
