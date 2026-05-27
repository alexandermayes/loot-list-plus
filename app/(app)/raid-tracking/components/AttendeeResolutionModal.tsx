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
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Search01Icon } from '@hugeicons/core-free-icons'
import type { Member } from './types'

interface AttendeeResolutionTarget {
  index: number
  name: string
}

interface AttendeeResolutionModalProps {
  target: AttendeeResolutionTarget | null
  totalUnmatched: number
  searchQuery: string
  filteredMembers: Member[]
  rememberAlias: boolean
  onSearchQueryChange: (value: string) => void
  onResolve: (member: Member) => void
  onSkip: () => void
  onSkipAll: () => void
  onCancel: () => void
  onRememberAliasChange: (checked: boolean) => void
}

export function AttendeeResolutionModal({
  target,
  totalUnmatched,
  searchQuery,
  filteredMembers,
  rememberAlias,
  onSearchQueryChange,
  onResolve,
  onSkip,
  onSkipAll,
  onCancel,
  onRememberAliasChange,
}: AttendeeResolutionModalProps) {
  return (
    <Modal open={!!target} onClose={onCancel} size="default" zIndex={60}>
      <ModalHeader onClose={onCancel}>
        <ModalTitle>Unmatched attendee</ModalTitle>
        {target && (
          <ModalDescription>
            Assign{' '}
            <span className="text-accent font-medium">{target.name}</span> to a guild member
            <span className="text-muted-foreground">
              {' '}({target.index + 1}/{totalUnmatched})
            </span>
          </ModalDescription>
        )}
      </ModalHeader>
      <ModalBody className="space-y-4">
        <Input
          variant="rounded"
          size="sm"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search raiders..."
          autoFocus
        />

        <div
          className={`overflow-y-auto space-y-1 transition-[max-height] duration-200 ${
            searchQuery.length > 0 ? 'max-h-[400px]' : 'max-h-64'
          }`}
        >
          {filteredMembers.length > 0 ? (
            filteredMembers.map((m) => (
              <Button
                key={m.character_id}
                variant="ghost"
                onClick={() => onResolve(m)}
                className="w-full justify-between"
              >
                <span className="text-sm font-medium" style={{ color: m.class_color }}>
                  {m.character_name}
                </span>
                <span className="text-xs text-muted-foreground">{m.class_name}</span>
              </Button>
            ))
          ) : (
            <EmptyState
              icon={Search01Icon}
              title="No members found"
              description="Try a different search term."
              size="compact"
            />
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id="remember-alias"
            checked={rememberAlias}
            onCheckedChange={(checked) => onRememberAliasChange(checked === true)}
          />
          <Label htmlFor="remember-alias" className="text-sm text-muted-foreground cursor-pointer">
            Remember this alias for future imports
          </Label>
        </div>
      </ModalBody>
      <ModalFooter className="flex justify-between">
        <Button variant="ghost" onClick={onCancel}>
          Cancel import
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSkip}>
            Skip this name
          </Button>
          <Button variant="outline" onClick={onSkipAll}>
            Skip all remaining
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
