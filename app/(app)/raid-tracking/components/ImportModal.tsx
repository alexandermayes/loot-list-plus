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
import { Label } from '@/components/ui/label'
import { parseDate } from '@/utils/date'
import type { AttendancePreview, LootPreview, SignupsPreview } from './types'

interface ImportModalTarget {
  raidId: string
  date: string
  isEdit: boolean
}

interface ImportModalProps {
  target: ImportModalTarget | null
  attendanceData: string
  lootData: string
  signupsData: string
  initialAttendanceData: string
  initialLootData: string
  initialSignupsData: string
  attendancePreview: AttendancePreview | null
  lootPreview: LootPreview | null
  signupsPreview: SignupsPreview | null
  importing: boolean
  useSignups: boolean
  onAttendanceChange: (value: string) => void
  onLootChange: (value: string) => void
  onSignupsChange: (value: string) => void
  onClose: () => void
  onClearFields: () => void
  onClearSavedData: () => void
  onImport: () => void
}

export function ImportModal({
  target,
  attendanceData,
  lootData,
  signupsData,
  initialAttendanceData,
  initialLootData,
  initialSignupsData,
  attendancePreview,
  lootPreview,
  signupsPreview,
  importing,
  useSignups,
  onAttendanceChange,
  onLootChange,
  onSignupsChange,
  onClose,
  onClearFields,
  onClearSavedData,
  onImport,
}: ImportModalProps) {
  const isEdit = target?.isEdit ?? false
  const unchanged =
    isEdit &&
    attendanceData === initialAttendanceData &&
    lootData === initialLootData &&
    signupsData === initialSignupsData

  return (
    <Modal open={!!target} onClose={onClose} size="xl">
      <ModalHeader onClose={onClose}>
        <ModalTitle>{isEdit ? 'Edit raid data' : 'Import raid data'}</ModalTitle>
        {target && (
          <ModalDescription>
            {parseDate(target.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </ModalDescription>
        )}
      </ModalHeader>
      <ModalBody className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <div>
              <Label className="text-md font-semibold">
                Attendance <span className="text-accent">*</span>
              </Label>
              <p className="text-muted-foreground text-sm">Who attended this raid day</p>
            </div>
            <Textarea
              variant="rounded"
              value={attendanceData}
              onChange={(e) => onAttendanceChange(e.target.value)}
              placeholder={
                'Paste character names (one per line, comma, or semicolon separated)\n\nZev\nDeny\nCheck'
              }
              className="h-44 font-mono resize-none"
            />
            {attendancePreview && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-success">{attendancePreview.matched} matched</span>
                {attendancePreview.aliasMatched > 0 && (
                  <span className="text-accent">
                    {attendancePreview.aliasMatched} via alias
                  </span>
                )}
                {attendancePreview.unmatched > 0 && (
                  <span className="text-warning">
                    {attendancePreview.unmatched} unmatched
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-md font-semibold">
                Loot <span className="text-accent">*</span>
              </Label>
              <p className="text-muted-foreground text-sm">Gargul export format</p>
            </div>
            <Textarea
              variant="rounded"
              value={lootData}
              onChange={(e) => onLootChange(e.target.value)}
              placeholder={
                'DATE;[ITEM_ID];CHARACTER\n\n12/15/2024;[16859];Zev\n12/15/2024;[18203];Deny\n12/15/2024;[17113];Check'
              }
              className="h-44 font-mono resize-none"
            />
            {lootPreview && (
              <div className="flex items-center gap-2 text-sm">
                {lootPreview.linked > 0 && (
                  <span className="text-success">{lootPreview.linked} linked</span>
                )}
                {lootPreview.unlinked > 0 && (
                  <span className="text-warning">{lootPreview.unlinked} unlinked</span>
                )}
                {lootPreview.failed > 0 && (
                  <span className="text-destructive">{lootPreview.failed} failed</span>
                )}
              </div>
            )}
          </div>
        </div>

        {useSignups && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-md font-semibold">
                  Signups{' '}
                  <span className="text-muted-foreground text-sm font-normal">(optional)</span>
                </Label>
                <p className="text-muted-foreground text-sm">Who signed up for this raid</p>
              </div>
            </div>
            <Textarea
              variant="rounded"
              value={signupsData}
              onChange={(e) => onSignupsChange(e.target.value)}
              placeholder={
                'Paste character names (one per line, comma, or semicolon separated)\n\nZev\nDeny\nCheck'
              }
              className="h-24 font-mono resize-none"
            />
            {signupsPreview && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-success">{signupsPreview.matched} matched</span>
                {signupsPreview.aliasMatched > 0 && (
                  <span className="text-accent">
                    {signupsPreview.aliasMatched} via alias
                  </span>
                )}
                {signupsPreview.unmatched > 0 && (
                  <span className="text-warning">
                    {signupsPreview.unmatched} unmatched
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onClearFields}
            disabled={
              importing ||
              (!attendanceData.trim() && !lootData.trim() && !signupsData.trim())
            }
          >
            Clear fields
          </Button>
          <Button variant="destructive" onClick={onClearSavedData} disabled={importing}>
            Clear saved data
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onImport}
            disabled={
              importing ||
              (!attendanceData.trim() && !lootData.trim()) ||
              unchanged
            }
            loading={importing}
          >
            {isEdit ? 'Save changes' : 'Import all'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
