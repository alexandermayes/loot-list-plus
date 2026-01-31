'use client'

import { useState } from 'react'
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
import { Text } from '@/components/ui/typography'
import { HugeiconsIcon } from '@hugeicons/react'
import { CheckmarkCircle02Icon, LinkSquare01Icon } from '@hugeicons/core-free-icons'
import { parseWowSimsExport, type ParsedGear } from '@/lib/wowsims-parser'

interface WowSimsImportModalProps {
  isOpen: boolean
  onClose: () => void
  characterId: string
  characterName: string
  onSuccess?: (gear: ParsedGear) => void
}

export function WowSimsImportModal({
  isOpen,
  onClose,
  characterId,
  characterName,
  onSuccess
}: WowSimsImportModalProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successInfo, setSuccessInfo] = useState<{ itemCount: number; importedName: string } | null>(null)

  const handleClose = () => {
    setJsonInput('')
    setError('')
    setSuccessInfo(null)
    onClose()
  }

  const handleImport = async () => {
    setError('')
    setSuccessInfo(null)

    if (!jsonInput.trim()) {
      setError('Please paste your WowSims export JSON')
      return
    }

    // First validate locally
    const parseResult = parseWowSimsExport(jsonInput)
    if (!parseResult.success || !parseResult.data) {
      setError(parseResult.error || 'Invalid export format')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/character-gear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          character_id: characterId,
          wowsims_json: jsonInput
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to import gear')
        setLoading(false)
        return
      }

      setSuccessInfo({
        itemCount: data.items_imported,
        importedName: data.imported_character_name
      })

      // Call success callback with parsed data
      if (onSuccess && parseResult.data) {
        onSuccess(parseResult.data)
      }

      // Auto-close after brief delay to show success message
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err) {
      console.error('Error importing gear:', err)
      setError('Failed to import gear. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>
        <ModalTitle>Import Gear from WowSims</ModalTitle>
        <ModalDescription>
          Import your current equipped gear for <strong>{characterName}</strong>
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Success State */}
        {successInfo && (
          <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-xl">
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={24} className="text-success flex-shrink-0" />
            <div>
              <Text size="sm" className="font-medium text-success">
                Successfully imported {successInfo.itemCount} items
              </Text>
              <Text size="xs" color="muted">
                From character: {successInfo.importedName}
              </Text>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
            <Text size="sm" className="text-destructive">{error}</Text>
          </div>
        )}

        {/* Instructions */}
        {!successInfo && (
          <>
            <div className="space-y-3 p-4 bg-background-subtle rounded-xl border border-border">
              <Text size="sm" className="font-medium">How to export your gear:</Text>
              <ol className="space-y-2 text-foreground-secondary text-[13px]">
                <li className="flex gap-2">
                  <span className="text-accent font-medium">1.</span>
                  <span>Install the <a href="https://www.curseforge.com/wow/addons/wowsimsexporter" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">WowSims Exporter addon <HugeiconsIcon icon={LinkSquare01Icon} size={14} /></a></span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-medium">2.</span>
                  <span>Log in to your character in-game</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-medium">3.</span>
                  <span>Type <code className="px-1.5 py-0.5 bg-background rounded text-[12px]">/wowsims</code> to open the export window</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-accent font-medium">4.</span>
                  <span>Click "Copy to Clipboard" and paste below</span>
                </li>
              </ol>
            </div>

            <div>
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='{"character":{"name":"YourChar"...}'
                rows={8}
                className="font-mono text-[12px]"
              />
              <Text size="xs" color="muted" className="mt-2">
                Paste the complete JSON export from WowSims Exporter
              </Text>
            </div>
          </>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={loading}
        >
          {successInfo ? 'Close' : 'Cancel'}
        </Button>
        {!successInfo && (
          <Button
            type="button"
            variant="primary"
            onClick={handleImport}
            loading={loading}
            disabled={!jsonInput.trim()}
          >
            Import Gear
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
