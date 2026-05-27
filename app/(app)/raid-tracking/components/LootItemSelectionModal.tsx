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
import { EmptyState } from '@/components/ui/empty-state'
import { Search01Icon } from '@hugeicons/core-free-icons'
import type { LootItem } from './types'

interface LootItemSelectionTarget {
  itemId: string
  characterName: string
}

interface LootItemSelectionModalProps {
  target: LootItemSelectionTarget | null
  searchQuery: string
  filteredItems: LootItem[]
  onSearchQueryChange: (value: string) => void
  onSelect: (item: LootItem) => void
  onSkip: () => void
}

export function LootItemSelectionModal({
  target,
  searchQuery,
  filteredItems,
  onSearchQueryChange,
  onSelect,
  onSkip,
}: LootItemSelectionModalProps) {
  return (
    <Modal open={!!target} onClose={onSkip} size="default" zIndex={60}>
      <ModalHeader>
        <ModalTitle>Item not found</ModalTitle>
        {target && (
          <ModalDescription>
            Could not find item ID{' '}
            <span className="text-accent font-mono">[{target.itemId}]</span> for{' '}
            <span className="text-foreground font-medium">{target.characterName}</span>
          </ModalDescription>
        )}
      </ModalHeader>
      <ModalBody className="space-y-4">
        <Input
          variant="rounded"
          size="sm"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search loot tables..."
          autoFocus
        />

        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredItems.slice(0, 20).map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onSelect(item)}
              className="w-full px-4 py-3 h-auto bg-background-elevated hover:bg-muted border border-border rounded-xl text-left justify-start"
            >
              <div>
                <p className="text-foreground text-sm font-medium">{item.name}</p>
                <p className="text-muted-foreground text-xs">
                  {item.boss_name} • ID: {item.wowhead_id}
                </p>
              </div>
            </Button>
          ))}
          {filteredItems.length === 0 && (
            <EmptyState
              icon={Search01Icon}
              title="No items found"
              description="Try a different search term."
              size="compact"
            />
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onSkip}>
          Skip this item
        </Button>
      </ModalFooter>
    </Modal>
  )
}
