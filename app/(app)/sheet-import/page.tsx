'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Heading, Text, LabelText } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeletons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ClassificationBadge } from '@/components/ui/classification-badge'
import { trackClientEvent } from '@/utils/analytics/client'

type Step = 'upload' | 'preview' | 'result'

interface SettingsChange {
  field: string
  from: any
  to: any
  enabled: boolean
}

interface MatchedItemPreview {
  sheetName: string
  dbName: string
  dbId: string
  updates: Record<string, any>
  specCount: number
}

interface UnmatchedItemPreview {
  name: string
  raid: string
  category: string
}

export default function SheetImportPage() {
  const router = useRouter()
  const { activeGuild, guildExpansions, currentExpansion, loading: guildLoading, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()

  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)

  // Upload state
  const [settingsCSV, setSettingsCSV] = useState('')
  const [itemsCSV, setItemsCSV] = useState('')
  const [importSettings, setImportSettings] = useState(true)
  const [importItems, setImportItems] = useState(false)
  const [selectedExpansionId, setSelectedExpansionId] = useState('')

  // Preview state
  const [settingsChanges, setSettingsChanges] = useState<SettingsChange[]>([])
  const [matchedItems, setMatchedItems] = useState<MatchedItemPreview[]>([])
  const [unmatchedItems, setUnmatchedItems] = useState<UnmatchedItemPreview[]>([])

  // Result state
  const [resultMessage, setResultMessage] = useState('')
  const [settingsApplied, setSettingsApplied] = useState(false)
  const [itemsUpdated, setItemsUpdated] = useState(0)

  useEffect(() => {
    document.title = 'LootList+ \u2022 Import from spreadsheet'
    if (activeGuild?.id) trackClientEvent('sheet_import_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  useEffect(() => {
    if (guildLoading) return
    if (!hasPermission('manage_settings')) {
      router.push('/overview')
      return
    }
  }, [guildLoading, hasPermission])

  useEffect(() => {
    if (currentExpansion && !selectedExpansionId) {
      setSelectedExpansionId(currentExpansion.expansion_id)
    }
  }, [currentExpansion])

  const handlePreview = async () => {
    if (!activeGuild) return
    if (!importSettings && !importItems) {
      showNotification('warning', 'Select at least one import type.')
      return
    }
    if (importSettings && !settingsCSV.trim()) {
      showNotification('warning', 'Paste the Information tab CSV to import settings.')
      return
    }
    if (importItems && !itemsCSV.trim()) {
      showNotification('warning', 'Paste the Items tab CSV to import item data.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/sheet-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: activeGuild.id,
          settingsCSV: importSettings ? settingsCSV : undefined,
          itemsCSV: importItems ? itemsCSV : undefined,
          expansionId: importItems ? selectedExpansionId : undefined,
          dryRun: true,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Preview failed.')
      }

      const data = await res.json()

      // Process settings preview
      if (data.settings) {
        setSettingsChanges(
          data.settings.changes.map((c: any) => ({ ...c, enabled: true }))
        )
      }

      // Process items preview
      if (data.items) {
        setMatchedItems(data.items.matched || [])
        setUnmatchedItems(data.items.unmatched || [])
      }

      setStep('preview')
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t preview import data.')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!activeGuild) return

    setLoading(true)
    try {
      const res = await fetch('/api/admin/sheet-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guildId: activeGuild.id,
          settingsCSV: importSettings ? settingsCSV : undefined,
          itemsCSV: importItems ? itemsCSV : undefined,
          expansionId: importItems ? selectedExpansionId : undefined,
          dryRun: false,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Import failed.')
      }

      const data = await res.json()

      setSettingsApplied(!!data.settingsApplied)
      setItemsUpdated(data.itemsUpdated || 0)

      const parts: string[] = []
      if (data.settingsApplied) parts.push('Settings applied')
      if (data.itemsUpdated) parts.push(`${data.itemsUpdated} items updated`)
      setResultMessage(parts.join('. ') || 'Nothing to update.')

      setStep('result')
      showNotification('success', 'Import complete.')
    } catch (error: any) {
      showNotification('error', error.message || 'Import failed. Check your CSV format.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSettingsChange = (idx: number) => {
    setSettingsChanges(prev =>
      prev.map((c, i) => i === idx ? { ...c, enabled: !c.enabled } : c)
    )
  }

  const handleFileUpload = (type: 'settings' | 'items') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (type === 'settings') setSettingsCSV(text)
      else setItemsCSV(text)
    }
    reader.readAsText(file)
  }

  if (guildLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins max-w-4xl">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96 mt-1" />
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  const itemsWithChanges = matchedItems.filter(
    m => Object.keys(m.updates).length > 0 || m.specCount > 0
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins max-w-4xl">
      <div>
        <Heading level={1}>Import from spreadsheet</Heading>
        <Text color="secondary" className="mt-1">
          Migrate your guild's loot configuration from the Master Sheet system.
        </Text>
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Import type selection */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={importSettings}
                    onCheckedChange={(v) => setImportSettings(!!v)}
                  />
                  <Text size="md">Guild settings</Text>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={importItems}
                    onCheckedChange={(v) => setImportItems(!!v)}
                  />
                  <Text size="md">Loot item configuration</Text>
                </label>
              </div>

              {importItems && (
                <div>
                  <Label className="mb-2">Expansion</Label>
                  <Select
                    variant="rounded"
                    size="sm"
                    value={selectedExpansionId}
                    onChange={(e) => setSelectedExpansionId(e.target.value)}
                  >
                    {guildExpansions.map(exp => (
                      <option key={exp.expansion_id} value={exp.expansion_id}>
                        {exp.expansion_name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settings CSV */}
          {importSettings && (
            <Card>
              <CardHeader>
                <CardTitle>Information tab (settings)</CardTitle>
                <CardDescription>
                  Paste the CSV export from the "Information" tab of your Master Sheet,
                  or upload a .csv file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={settingsCSV}
                  onChange={(e) => setSettingsCSV(e.target.value)}
                  placeholder="Paste CSV here..."
                  rows={8}
                  className="font-mono text-xs"
                />
                <div>
                  <Text size="sm" color="muted" className="mb-1">Or upload a file:</Text>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload('settings')}
                    className="text-sm text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-full file:border file:border-border file:text-sm file:font-medium file:bg-background-elevated file:text-foreground hover:file:bg-muted"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items CSV */}
          {importItems && (
            <Card>
              <CardHeader>
                <CardTitle>Items tab (loot configuration)</CardTitle>
                <CardDescription>
                  Paste the CSV export from the "Items" tab of the Loot List sheet (gid=821394787),
                  or upload a .csv file. Items are matched to your existing loot database by name.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={itemsCSV}
                  onChange={(e) => setItemsCSV(e.target.value)}
                  placeholder="Available,Name,Primary Class,Secondary Class,Category,Raid,Classification&#10;TRUE,Aegis of the Vindicator,Physical,,Back,Gruul's Lair,Limited"
                  rows={8}
                  className="font-mono text-xs"
                />
                <div>
                  <Text size="sm" color="muted" className="mb-1">Or upload a file:</Text>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload('items')}
                    className="text-sm text-muted-foreground file:mr-4 file:py-1 file:px-3 file:rounded-full file:border file:border-border file:text-sm file:font-medium file:bg-background-elevated file:text-foreground hover:file:bg-muted"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/guild-settings')}>
              Go back
            </Button>
            <Button
              variant="primary"
              onClick={handlePreview}
              loading={loading}
              disabled={!importSettings && !importItems}
            >
              Preview import
            </Button>
          </div>

          <Alert>
            <AlertDescription>
              <Text size="sm" color="secondary">
                To export CSV from Google Sheets: open the sheet, go to File &gt; Download &gt; Comma Separated Values (.csv).
                Export each tab separately. The sheet must be at least view-accessible.
              </Text>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 'preview' && (
        <div className="space-y-6">
          {/* Settings preview */}
          {importSettings && settingsChanges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Settings changes</CardTitle>
                <CardDescription>
                  {settingsChanges.filter(c => c.enabled).length} of {settingsChanges.length} changes selected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {settingsChanges.map((change, idx) => (
                    <div key={change.field} className="flex items-center gap-3 py-2.5">
                      <Checkbox
                        checked={change.enabled}
                        onCheckedChange={() => toggleSettingsChange(idx)}
                      />
                      <div className="flex-1 min-w-0">
                        <Text size="sm" className="font-medium">
                          {formatFieldName(change.field)}
                        </Text>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Text size="xs" color="muted">
                            {formatValue(change.from)}
                          </Text>
                          <span className="text-muted-foreground text-xs">&rarr;</span>
                          <Text size="xs" color="accent" className="font-medium">
                            {formatValue(change.to)}
                          </Text>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {importSettings && settingsChanges.length === 0 && settingsCSV && (
            <Card>
              <CardContent className="py-6">
                <Text color="muted">No settings changes detected. Your current settings match the spreadsheet.</Text>
              </CardContent>
            </Card>
          )}

          {/* Items preview */}
          {importItems && (
            <Card>
              <CardHeader>
                <CardTitle>Item matches</CardTitle>
                <CardDescription>
                  {matchedItems.length} matched, {unmatchedItems.length} unmatched
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="flex gap-4 text-sm">
                  <span className="text-success font-medium">{matchedItems.length} matched</span>
                  {itemsWithChanges.length > 0 && (
                    <span className="text-accent font-medium">{itemsWithChanges.length} with changes</span>
                  )}
                  {unmatchedItems.length > 0 && (
                    <span className="text-warning font-medium">{unmatchedItems.length} unmatched</span>
                  )}
                </div>

                {/* Items with changes */}
                {itemsWithChanges.length > 0 && (
                  <div>
                    <LabelText size="xs" className="mb-2">Items to update</LabelText>
                    <div className="max-h-64 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                      {itemsWithChanges.map((item, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <Text size="sm" className="truncate">{item.dbName}</Text>
                            {item.sheetName !== item.dbName && (
                              <Text size="xs" color="muted">from: {item.sheetName}</Text>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {item.updates.classification && (
                              <ClassificationBadge classification={item.updates.classification} />
                            )}
                            {item.updates.is_available === false && (
                              <Badge variant="outline" className="text-xs">Unavailable</Badge>
                            )}
                            {item.specCount > 0 && (
                              <Text size="xs" color="muted">{item.specCount} specs</Text>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unmatched items */}
                {unmatchedItems.length > 0 && (
                  <div>
                    <LabelText size="xs" className="mb-2">Unmatched items (will be skipped)</LabelText>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                      {unmatchedItems.map((item, idx) => (
                        <div key={idx} className="px-3 py-2 flex items-center justify-between">
                          <Text size="sm" className="text-warning">{item.name}</Text>
                          <Text size="xs" color="muted">{item.raid} / {item.category}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('upload')}>
              Go back
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              loading={loading}
              disabled={
                (importSettings && settingsChanges.filter(c => c.enabled).length === 0) &&
                (importItems && matchedItems.length === 0)
              }
            >
              Import {[
                importSettings && settingsChanges.filter(c => c.enabled).length > 0 ? 'settings' : '',
                importItems && matchedItems.length > 0 ? `${matchedItems.length} items` : '',
              ].filter(Boolean).join(' + ')}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'result' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <Heading level={3}>Import complete</Heading>
              <Text color="secondary">{resultMessage}</Text>

              <div className="flex gap-4 justify-center mt-4 text-sm">
                {settingsApplied && (
                  <span className="text-success font-medium">Settings updated</span>
                )}
                {itemsUpdated > 0 && (
                  <span className="text-success font-medium">{itemsUpdated} items updated</span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => {
              setStep('upload')
              setSettingsChanges([])
              setMatchedItems([])
              setUnmatchedItems([])
            }}>
              Import more
            </Button>
            <Button variant="primary" onClick={() => router.push('/loot-management')}>
              View loot management
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('Blp', 'BLP')
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '(not set)'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
