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
import { Textarea } from '@/components/ui/textarea'
import ItemLink from '@/app/components/ItemLink'

interface NotesModalItem {
  id: string
  name: string
  wowhead_id: number
}

interface NotesModalProps {
  item: NotesModalItem | null
  value: string
  saving: boolean
  onValueChange: (value: string) => void
  onClose: () => void
  /** Returns true if the save succeeded — modal closes on success. */
  onSave: (itemId: string, value: string) => Promise<boolean>
}

export function NotesModal({
  item,
  value,
  saving,
  onValueChange,
  onClose,
  onSave,
}: NotesModalProps) {
  return (
    <Modal open={!!item} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Officer notes</ModalTitle>
        {item && (
          <ModalDescription>
            <ItemLink wowheadId={item.wowhead_id} name={item.name} />
          </ModalDescription>
        )}
      </ModalHeader>
      <ModalBody>
        <Textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Add notes for officers..."
          rows={4}
          variant="rounded"
          autoFocus
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="primary"
          loading={saving}
          onClick={async () => {
            if (!item) return
            const success = await onSave(item.id, value)
            if (success) onClose()
          }}
        >
          Save note
        </Button>
      </ModalFooter>
    </Modal>
  )
}
