'use client'

import { useState } from 'react'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useNotification } from '@/app/contexts/NotificationContext'

interface AddonExportDialogProps {
  open: boolean
  onClose: () => void
  guildId: string
}

export function AddonExportDialog({ open, onClose, guildId }: AddonExportDialogProps) {
  const [exportString, setExportString] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<{ items: number; members: number; submissions: number; raidTiers: number; expansion: string | null; compressedSize: number } | null>(null)
  const { showNotification } = useNotification()

  const generateExport = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/addon/export-string?guild_id=${guildId}`)
      const data = await res.json()

      if (!res.ok) {
        showNotification('error', data.error || 'Failed to generate export string')
        return
      }

      setExportString(data.exportString)
      setStats(data.stats)
    } catch {
      showNotification('error', 'Failed to generate export string')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportString)
      showNotification('success', 'Copied to clipboard')
    } catch {
      // Fallback: select the text
      const textarea = document.querySelector('#addon-export-text') as HTMLTextAreaElement
      textarea?.select()
      showNotification('info', 'Select all and copy manually')
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>Export for addon</ModalTitle>
        <ModalDescription>
          Generate a data string to paste into the LootList+ WoW addon. This includes all item data, member submissions, scores, and settings.
        </ModalDescription>
      </ModalHeader>
      <ModalBody>
        {!exportString ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-sm text-foreground-secondary">
              Click generate to create the export string. This may take a moment for large guilds.
            </p>
            <Button variant="primary" onClick={generateExport} loading={isLoading}>
              Generate export string
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {stats && (
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{stats.expansion || 'No expansion'}</span>
                <span>{stats.raidTiers} raid tiers</span>
                <span>{stats.items} items</span>
                <span>{stats.members} members</span>
                <span>{stats.submissions} submissions</span>
                <span>{(stats.compressedSize / 1024).toFixed(1)} KB</span>
              </div>
            )}
            <textarea
              id="addon-export-text"
              className="w-full h-40 p-3 bg-background-subtle border border-border rounded-md text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={exportString}
              readOnly
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <p className="text-xs text-muted-foreground">
              In WoW, type <code className="px-1 py-0.5 bg-background-subtle rounded text-accent">/llp import</code> and paste this string.
            </p>
          </div>
        )}
      </ModalBody>
      {exportString && (
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="primary" onClick={copyToClipboard}>Copy to clipboard</Button>
        </ModalFooter>
      )}
    </Modal>
  )
}
