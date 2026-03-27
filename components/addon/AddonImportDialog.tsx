'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useNotification } from '@/app/contexts/NotificationContext'

interface ImportResults {
  awards: { processed: number; errors: number }
  attendance: { processed: number; errors: number }
}

interface AddonImportDialogProps {
  open: boolean
  onClose: () => void
  guildId?: string
  onImportComplete?: () => void
}

export function AddonImportDialog({ open, onClose, onImportComplete }: AddonImportDialogProps) {
  const [importString, setImportString] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ImportResults | null>(null)
  const { showNotification } = useNotification()

  const processImport = async () => {
    if (!importString.trim()) {
      showNotification('warning', 'Paste an export string from the addon first')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/addon/import-string', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importString: importString.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        showNotification('error', data.error || 'Import failed')
        return
      }

      setResults(data.data)

      const totalProcessed = data.data.awards.processed + data.data.attendance.processed
      const totalErrors = data.data.awards.errors + data.data.attendance.errors

      if (totalErrors === 0) {
        showNotification('success', `Imported ${totalProcessed} records`)
      } else {
        showNotification('warning', `Imported ${totalProcessed} records with ${totalErrors} errors`)
      }

      if (onImportComplete) onImportComplete()
    } catch {
      showNotification('error', 'Import failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setImportString('')
    setResults(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>
        <ModalTitle>Import from addon</ModalTitle>
        <ModalDescription>
          Paste the export string from the LootList+ WoW addon. This will import loot awards and attendance records.
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        {!results ? (
          <div className="space-y-4">
            <textarea
              className="w-full h-40 p-3 bg-background-subtle border border-border rounded-md text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Paste addon export string here (starts with LLP1E:)..."
              value={importString}
              onChange={(e) => setImportString(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              In WoW, type <code className="px-1 py-0.5 bg-background-subtle rounded text-accent">/llp export</code> to generate the export string.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-background-subtle rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-secondary">Loot awards</span>
                <span className="text-sm">
                  <span className="text-success">{results.awards.processed} imported</span>
                  {results.awards.errors > 0 && (
                    <span className="text-destructive ml-2">{results.awards.errors} failed</span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground-secondary">Attendance records</span>
                <span className="text-sm">
                  <span className="text-success">{results.attendance.processed} imported</span>
                  {results.attendance.errors > 0 && (
                    <span className="text-destructive ml-2">{results.attendance.errors} failed</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {!results ? (
          <>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button variant="primary" onClick={processImport} loading={isLoading}>
              Import
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={handleClose}>Done</Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
