'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserMultiple02Icon, Download04Icon, Link01Icon } from '@hugeicons/core-free-icons'
import type { GameVersion } from '@/lib/battlenet'

interface BattlenetCharacter {
  name: string
  battlenet_id: number
  realm: string
  realm_slug: string
  class_name: string
  class_id: number
  level: number
  faction: string
}

// Map Battle.net class names to CSS class color utilities
const CLASS_COLORS: Record<string, string> = {
  Warrior: '#C69B6D',
  Paladin: '#F48CBA',
  Hunter: '#AAD372',
  Rogue: '#FFF468',
  Priest: '#FFFFFF',
  'Death Knight': '#C41E3A',
  Shaman: '#0070DD',
  Mage: '#3FC7EB',
  Warlock: '#8788EE',
  Druid: '#FF7C0A',
}

interface BattlenetCharacterPickerModalProps {
  open: boolean
  onClose: () => void
  existingBattleNetIds?: number[]
  onImportComplete?: () => void
  mode?: 'import' | 'link'
  linkCharacterId?: string
  linkCharacterName?: string
  onLinkComplete?: () => void
  /** Whether imported characters should be created as main (default: true) */
  isMain?: boolean
}

export function BattlenetCharacterPickerModal({
  open,
  onClose,
  existingBattleNetIds = [],
  onImportComplete,
  mode = 'import',
  linkCharacterId,
  linkCharacterName,
  onLinkComplete,
  isMain = true,
}: BattlenetCharacterPickerModalProps) {
  const router = useRouter()
  const { activeGuild, refreshCharacters } = useGuildContext()
  const { showNotification } = useNotification()

  const [version, setVersion] = useState<GameVersion>('cata-classic')
  const [characters, setCharacters] = useState<BattlenetCharacter[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<number | null>(null)
  const [linking, setLinking] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [needsReauth, setNeedsReauth] = useState(false)
  const [specPicker, setSpecPicker] = useState<{
    char: BattlenetCharacter
    specs: Array<{ id: string; name: string }>
    className: string
  } | null>(null)
  const [selectedSpecId, setSelectedSpecId] = useState<string>('')

  useEffect(() => {
    if (open) {
      fetchCharacters()
    }
  }, [open, version])

  const fetchCharacters = async () => {
    setLoading(true)
    setError('')
    setNeedsReauth(false)

    try {
      const response = await fetch(`/api/battlenet/characters?version=${version}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Couldn\'t load characters from Battle.net')
        setNeedsReauth(response.status === 401)
        setCharacters([])
      } else {
        setCharacters(data.characters || [])
      }
    } catch {
      setError('Couldn\'t connect to Battle.net. Check your connection.')
      setCharacters([])
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (char: BattlenetCharacter, specId?: string) => {
    setImporting(char.battlenet_id)

    try {
      const response = await fetch('/api/battlenet/characters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: char.name,
          realmSlug: char.realm_slug,
          version,
          guildId: activeGuild?.id,
          isMain,
          importGear: true,
          ...(specId && { specId }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t import character')
        return
      }

      // API needs us to pick a spec
      if (data.needs_spec) {
        setSpecPicker({
          char,
          specs: data.available_specs,
          className: data.class_name,
        })
        setSelectedSpecId('')
        setImporting(null)
        return
      }

      const gearMsg = data.gear_imported > 0
        ? ` with ${data.gear_imported} gear items`
        : ''

      showNotification('success', `${char.name} imported${gearMsg}`)
      setSpecPicker(null)
      await refreshCharacters()
      onImportComplete?.()
      onClose()
      router.push('/characters/manage')
    } catch {
      showNotification('error', 'Couldn\'t import character. Try again.')
    } finally {
      setImporting(null)
    }
  }

  const handleLink = async (char: BattlenetCharacter) => {
    if (!linkCharacterId) return
    setLinking(char.battlenet_id)

    try {
      const response = await fetch(`/api/characters/${linkCharacterId}/link-battlenet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmSlug: char.realm_slug,
          characterName: char.name,
          version,
          importGear: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t link character')
        return
      }

      const gearMsg = data.gear_imported > 0
        ? ` with ${data.gear_imported} gear items`
        : ''

      showNotification('success', `${linkCharacterName || char.name} linked to Battle.net${gearMsg}`)
      await refreshCharacters()
      onLinkComplete?.()
      onClose()
    } catch {
      showNotification('error', 'Couldn\'t link character. Try again.')
    } finally {
      setLinking(null)
    }
  }

  const isLinkMode = mode === 'link'
  const isBusy = importing !== null || linking !== null

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <ModalTitle>{isLinkMode ? 'Link to Battle.net' : 'Import from Battle.net'}</ModalTitle>
        <ModalDescription>
          {isLinkMode
            ? `Select the Battle.net character to link with ${linkCharacterName || 'your character'}`
            : 'Select a character to import with their equipped gear'}
        </ModalDescription>
      </ModalHeader>

      <ModalBody>
        <div className="space-y-4">
          {/* Spec picker (shown when Battle.net couldn't detect spec) */}
          {specPicker ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Couldn&apos;t detect the spec for <span className="font-semibold text-foreground">{specPicker.char.name}</span>. Select their specialization to continue.
              </p>
              <div>
                <Label htmlFor="spec-select" size="sm" className="block text-foreground-muted mb-2">Specialization</Label>
                <Select
                  id="spec-select"
                  variant="pill"
                  size="sm"
                  value={selectedSpecId}
                  onChange={(e) => setSelectedSpecId(e.target.value)}
                >
                  <option value="">Select spec...</option>
                  {specPicker.specs.map(spec => (
                    <option key={spec.id} value={spec.id}>{spec.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSpecPicker(null)
                    setSelectedSpecId('')
                  }}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedSpecId || importing !== null}
                  loading={importing !== null}
                  onClick={() => handleImport(specPicker.char, selectedSpecId)}
                >
                  Import {specPicker.char.name}
                </Button>
              </div>
            </div>
          ) : (
          <>
          {/* Version selector */}
          <div className="flex items-center gap-3">
            <Label htmlFor="game-version">Game version</Label>
            <Select
              id="game-version"
              variant="rounded"
              size="sm"
              value={version}
              onChange={(e) => setVersion(e.target.value as GameVersion)}
              className="w-44"
            >
              <option value="cata-classic">Cataclysm Classic</option>
              <option value="tbc-anniversary">TBC Anniversary</option>
              <option value="classic-era">Classic Era</option>
            </Select>
          </div>

          {/* Character list */}
          {loading ? (
            <div className="space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-background-elevated">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 rounded-md" style={{ width: `${80 + (i % 3) * 24}px` }} />
                      <Skeleton className="h-3 w-6 rounded-md" />
                    </div>
                    <Skeleton className="h-3 w-40 rounded-md" />
                  </div>
                  <Skeleton className="h-8 w-[86px] rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <div className="flex items-center justify-center gap-2 mt-3">
                {needsReauth ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      window.location.href = '/api/auth/battlenet'
                    }}
                  >
                    Reconnect Battle.net
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={fetchCharacters}>
                    Try again
                  </Button>
                )}
              </div>
            </div>
          ) : characters.length === 0 ? (
            <EmptyState
              icon={UserMultiple02Icon}
              title="No characters found"
              description={`No ${version === 'classic-era' ? 'Classic Era' : version === 'tbc-anniversary' ? 'TBC Anniversary' : 'Cataclysm Classic'} characters found on this account`}
              size="compact"
            />
          ) : (
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {(() => {
                const guildRealm = activeGuild?.realm?.toLowerCase()

                // Sort: guild realm first, then by level desc
                const sorted = [...characters].sort((a, b) => {
                  if (guildRealm) {
                    const aMatch = a.realm.toLowerCase() === guildRealm
                    const bMatch = b.realm.toLowerCase() === guildRealm
                    if (aMatch && !bMatch) return -1
                    if (!aMatch && bMatch) return 1
                  }
                  return b.level - a.level || a.name.localeCompare(b.name)
                })

                // Find where guild-realm characters end for the divider
                const guildRealmCount = guildRealm
                  ? sorted.filter((c) => c.realm.toLowerCase() === guildRealm).length
                  : 0

                return sorted.map((char, index) => {
                  const alreadyImported = existingBattleNetIds.includes(char.battlenet_id)
                  const isImporting = importing === char.battlenet_id
                  const onGuildRealm = guildRealm && char.realm.toLowerCase() === guildRealm
                  const showDivider = guildRealm && guildRealmCount > 0 && index === guildRealmCount

                  return (
                    <div key={`${char.battlenet_id}-${char.realm_slug}`}>
                      {showDivider && (
                        <div className="flex items-center gap-3 py-2 px-1">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-[11px] text-muted-foreground uppercase tracking-wide shrink-0">
                            Other servers
                          </span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      )}
                      <div
                        className={`flex items-center justify-between px-4 py-3 rounded-lg border border-border ${
                          alreadyImported
                            ? 'opacity-50 bg-muted/20'
                            : !onGuildRealm && guildRealm
                              ? 'opacity-60 bg-background-elevated hover:bg-muted/30 hover:opacity-100'
                              : 'bg-background-elevated hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-semibold text-[14px] truncate"
                                style={{ color: CLASS_COLORS[char.class_name] || '#808080' }}
                              >
                                {char.name}
                              </span>
                              <span className="text-[12px] text-muted-foreground shrink-0">
                                {char.level}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                              <span>{char.class_name}</span>
                              <span>·</span>
                              <span>{char.realm}</span>
                              <span>·</span>
                              <span>{char.faction}</span>
                            </div>
                          </div>
                        </div>

                        {alreadyImported ? (
                          <span className="text-[12px] text-muted-foreground shrink-0">
                            {isLinkMode ? 'Already linked' : 'Already imported'}
                          </span>
                        ) : isLinkMode ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleLink(char)}
                            loading={linking === char.battlenet_id}
                            disabled={isBusy}
                          >
                            <HugeiconsIcon icon={Link01Icon} size={14} />
                            Link
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleImport(char)}
                            loading={isImporting}
                            disabled={isBusy}
                          >
                            <HugeiconsIcon icon={Download04Icon} size={14} />
                            Import
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}
          </>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}
