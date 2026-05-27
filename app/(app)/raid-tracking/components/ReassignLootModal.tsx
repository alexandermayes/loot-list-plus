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
import { Select } from '@/components/ui/select'
import ItemLink from '@/app/components/ItemLink'
import type { Member, RaidLootEntry } from './types'

interface ReassignTarget {
  lootEntries: RaidLootEntry[]
  currentMember: Member
}

interface ReassignLootModalProps {
  target: ReassignTarget | null
  members: Member[]
  onClose: () => void
  onReassign: (lootId: string, characterId: string, characterName: string) => void
}

export function ReassignLootModal({
  target,
  members,
  onClose,
  onReassign,
}: ReassignLootModalProps) {
  return (
    <Modal open={!!target} onClose={onClose} size="sm">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Reassign loot</ModalTitle>
        <ModalDescription>
          {target?.lootEntries.length === 1 ? (
            <ItemLink
              name={target.lootEntries[0].item_name}
              wowheadId={target.lootEntries[0].item_wowhead_id}
            />
          ) : (
            <span>
              {target?.lootEntries.length} items from {target?.currentMember.character_name}
            </span>
          )}
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {target?.lootEntries.map((loot) => (
            <div key={loot.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ItemLink name={loot.item_name} wowheadId={loot.item_wowhead_id} />
              </div>
              <Select
                variant="rounded"
                value=""
                onChange={(e) => {
                  const member = members.find((m) => m.character_id === e.target.value)
                  if (member) {
                    onReassign(loot.id, member.character_id, member.character_name)
                  }
                }}
              >
                <option value="" disabled>
                  Select new owner...
                </option>
                {members
                  .filter((m) => m.character_id !== target.currentMember.character_id)
                  .map((m) => (
                    <option key={m.character_id} value={m.character_id}>
                      {m.character_name} ({m.class_name})
                    </option>
                  ))}
              </Select>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
