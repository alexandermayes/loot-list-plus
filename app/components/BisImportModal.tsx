'use client'

import { useState, useEffect } from 'react'
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
import {
  CheckmarkCircle02Icon,
  LinkSquare01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon
} from '@hugeicons/core-free-icons'
import { parseWowSimsExport } from '@/lib/wowsims-parser'

interface BisImportModalProps {
  isOpen: boolean
  onClose: () => void
  characterId: string
  characterName: string
  hasGearImported: boolean
  gearItemCount: number
  rankedCount?: number
  onImportBis: () => Promise<{ success: boolean; importedCount: number; error?: string }>
  onGearImported: () => void
  isImportingBis: boolean
}

export function BisImportModal({
  isOpen,
  onClose,
  characterId,
  characterName,
  hasGearImported,
  gearItemCount,
  rankedCount = 0,
  onImportBis,
  onGearImported,
  isImportingBis
}: BisImportModalProps) {
  const [showGearSection, setShowGearSection] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [gearLoading, setGearLoading] = useState(false)
  const [gearError, setGearError] = useState('')
  const [gearSuccess, setGearSuccess] = useState(false)
  const [bisResult, setBisResult] = useState<{ success: boolean; count: number; error?: string } | null>(null)

  // Auto-expand gear section if no gear imported
  useEffect(() => {
    if (isOpen && !hasGearImported) {
      setShowGearSection(true)
    }
  }, [isOpen, hasGearImported])

  const handleClose = () => {
    setJsonInput('')
    setGearError('')
    setGearSuccess(false)
    setBisResult(null)
    setShowGearSection(false)
    onClose()
  }

  const handleImportGear = async () => {
    setGearError('')
    setGearSuccess(false)

    if (!jsonInput.trim()) {
      setGearError('Please paste your WowSims export JSON')
      return
    }

    // Validate locally first
    const parseResult = parseWowSimsExport(jsonInput)
    if (!parseResult.success || !parseResult.data) {
      setGearError(parseResult.error || 'Invalid export format')
      return
    }

    setGearLoading(true)

    try {
      const response = await fetch('/api/character-gear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: characterId,
          wowsims_json: jsonInput
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setGearError(data.error || 'Couldn\'t import gear. Try again.')
        return
      }

      setGearSuccess(true)
      setJsonInput('')
      onGearImported()

      // Collapse gear section after successful import
      setTimeout(() => {
        setShowGearSection(false)
      }, 1000)
    } catch (err) {
      console.error('Error importing gear:', err)
      setGearError('Couldn\'t import gear. Try again.')
    } finally {
      setGearLoading(false)
    }
  }

  const handleImportBis = async () => {
    setBisResult(null)
    const result = await onImportBis()
    setBisResult({
      success: result.success,
      count: result.importedCount,
      error: result.error
    })

    if (result.success) {
      // Auto-close after showing success
      setTimeout(() => {
        handleClose()
      }, 1500)
    }
  }

  return (
    <Modal open={isOpen} onClose={handleClose} size="lg">
      <ModalHeader onClose={handleClose}>
        <ModalTitle>Import BIS items</ModalTitle>
        <ModalDescription>
          Auto-fill your loot list with Best-in-Slot items for <strong>{characterName}</strong>
        </ModalDescription>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* BIS Result */}
        {bisResult && (
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            bisResult.success
              ? 'bg-success/10 border-success/30'
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={24}
              className={bisResult.success ? 'text-success' : 'text-destructive'}
            />
            <div>
              {bisResult.success ? (
                <>
                  <Text size="sm" className="font-medium text-success">
                    Imported {bisResult.count} BIS items
                  </Text>
                  <Text size="xs" color="muted">
                    Items you already own were automatically excluded
                  </Text>
                </>
              ) : (
                <Text size="sm" className="text-destructive">
                  {bisResult.error || 'Couldn\'t import BIS items. Try again.'}
                </Text>
              )}
            </div>
          </div>
        )}

        {/* Main Info */}
        {!bisResult?.success && (
          <>
            {/* Warning if there are existing rankings */}
            {rankedCount > 0 && (
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                <Text size="sm" className="text-warning">
                  This will replace your current {rankedCount} ranked items with BIS items.
                </Text>
              </div>
            )}

            <div className="p-4 bg-background-subtle rounded-xl border border-border">
              <Text size="sm" color="secondary">
                This will populate your loot list with spec-appropriate BIS items, ranked by priority.
                Items you already own will be automatically excluded.
              </Text>
            </div>

            {/* Gear Status / Import Section */}
            <div className="border border-border rounded-xl overflow-hidden">
              {/* Header - always visible */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowGearSection(!showGearSection)}
                className="w-full flex items-center justify-between p-4 h-auto bg-background-subtle hover:bg-muted rounded-none"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${hasGearImported ? 'bg-success' : 'bg-muted-foreground'}`} />
                  <div className="text-left">
                    <Text size="sm" className="font-medium">
                      Current gear {hasGearImported ? '(imported)' : '(not imported)'}
                    </Text>
                    <Text size="xs" color="muted">
                      {hasGearImported
                        ? `${gearItemCount} items tracked - owned items will be excluded`
                        : 'Optional: Import gear to exclude items you already own'
                      }
                    </Text>
                  </div>
                </div>
                <HugeiconsIcon
                  icon={showGearSection ? ArrowUp01Icon : ArrowDown01Icon}
                  size={20}
                  className="text-muted-foreground"
                />
              </Button>

              {/* Expandable gear import section */}
              {showGearSection && (
                <div className="p-4 border-t border-border space-y-4">
                  {gearSuccess && (
                    <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/30 rounded-lg">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} className="text-success" />
                      <Text size="sm" className="text-success">Gear imported successfully.</Text>
                    </div>
                  )}

                  {gearError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <Text size="sm" className="text-destructive">{gearError}</Text>
                    </div>
                  )}

                  {!gearSuccess && (
                    <>
                      <div className="space-y-3 text-foreground-secondary text-[13px]">
                        {/* Option A: Website Export */}
                        <div className="space-y-2">
                          <Text size="xs" className="font-semibold text-foreground uppercase tracking-wide">Option A: WoWSims Website</Text>
                          <div className="flex gap-2">
                            <span className="text-accent font-medium">1.</span>
                            <span>Go to <a href="https://wowsims.github.io/cata/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">wowsims.github.io <HugeiconsIcon icon={LinkSquare01Icon} size={14} /></a> and load your character</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-accent font-medium">2.</span>
                            <span>Click <strong>Export</strong> in the top menu and copy the JSON</span>
                          </div>
                        </div>

                        <div className="border-t border-border pt-3">
                          {/* Option B: In-Game Addon */}
                          <Text size="xs" className="font-semibold text-foreground uppercase tracking-wide mb-2">Option B: In-Game Addon</Text>
                          <div className="flex gap-2">
                            <span className="text-accent font-medium">1.</span>
                            <span>Install the <a href="https://www.curseforge.com/wow/addons/wowsimsexporter" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-1">WowSims Exporter addon <HugeiconsIcon icon={LinkSquare01Icon} size={14} /></a></span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-accent font-medium">2.</span>
                            <span>Type <code className="px-1.5 py-0.5 bg-background rounded text-[12px]">/wowsims</code> in-game and copy the export</span>
                          </div>
                        </div>
                      </div>

                      <Textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='Paste WowSims JSON here...'
                        rows={4}
                        className="font-mono text-[12px]"
                      />

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleImportGear}
                        loading={gearLoading}
                        disabled={!jsonInput.trim()}
                      >
                        Import gear
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isImportingBis}
        >
          {bisResult?.success ? 'Close' : 'Cancel'}
        </Button>
        {!bisResult?.success && (
          <Button
            variant="primary"
            onClick={handleImportBis}
            loading={isImportingBis}
          >
            Import BIS items
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
