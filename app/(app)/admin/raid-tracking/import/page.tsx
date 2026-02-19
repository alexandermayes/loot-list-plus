'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Heading } from '@/components/ui/typography'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function ImportPage() {
  const [loading, setLoading] = useState(false)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<'attendance' | 'loot_items' | 'members'>('attendance')

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Import'
  }, [])

  useEffect(() => {
    if (guildLoading) return

    // Check if officer using context
    if (!isOfficer) {
      router.push('/overview')
      return
    }

    if (activeGuild) {
      setGuildId(activeGuild.id)
    }
  }, [guildLoading, activeGuild, isOfficer])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n')
    return lines.map(line => {
      const result: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    })
  }

  const handleImport = async () => {
    if (!file || !guildId) return

    setLoading(true)

    try {
      const text = await file.text()
      const rows = parseCSV(text)

      if (rows.length < 2) {
        throw new Error('CSV file must have at least a header row and one data row')
      }

      const headers = rows[0].map(h => h.toLowerCase().trim())

      if (importType === 'attendance') {
        await importAttendance(headers, rows.slice(1))
      } else if (importType === 'loot_items') {
        await importLootItems(headers, rows.slice(1))
      } else if (importType === 'members') {
        await importMembers(headers, rows.slice(1))
      }

      showNotification('success', 'Import complete')
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t import data. Try again.')
    }

    setLoading(false)
  }

  const importAttendance = async (headers: string[], rows: string[][]) => {
    // Expected headers: date, character_name, signed_up, attended, no_call_no_show
    const dateIdx = headers.indexOf('date') >= 0 ? headers.indexOf('date') : headers.indexOf('raid_date')
    const nameIdx = headers.indexOf('character_name') >= 0 ? headers.indexOf('character_name') : headers.indexOf('name')
    const signedUpIdx = headers.indexOf('signed_up') >= 0 ? headers.indexOf('signed_up') : -1
    const attendedIdx = headers.indexOf('attended') >= 0 ? headers.indexOf('attended') : -1
    const ncnsIdx = headers.indexOf('no_call_no_show') >= 0 ? headers.indexOf('no_call_no_show') : headers.indexOf('ncns')

    if (dateIdx < 0 || nameIdx < 0) {
      throw new Error('CSV must have "date" and "character_name" columns')
    }

    // Get active raid tier
    const { data: tierData } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('guild_id', guildId)
      .eq('is_active', true)
      .single()

    if (!tierData) {
      throw new Error('No active raid tier found')
    }

    for (const row of rows) {
      if (row.length < Math.max(dateIdx, nameIdx) + 1) continue

      const raidDate = row[dateIdx]
      const characterName = row[nameIdx]

      if (!raidDate || !characterName) continue

      // Find or create raid event
      const { data: existingRaid } = await supabase
        .from('raid_events')
        .select('id')
        .eq('guild_id', guildId)
        .eq('raid_date', raidDate)
        .single()

      let raidEventId: string

      if (existingRaid) {
        raidEventId = existingRaid.id
      } else {
        const { data: newRaid, error: raidError } = await supabase
          .from('raid_events')
          .insert({
            guild_id: guildId,
            raid_date: raidDate,
            notes: 'Imported from CSV'
          })
          .select()
          .single()

        if (raidError) throw raidError
        raidEventId = newRaid.id
      }

      // Find user by character name
      const { data: member } = await supabase
        .from('guild_members')
        .select('user_id')
        .eq('guild_id', guildId)
        .eq('character_name', characterName)
        .single()

      if (!member) continue

      // Create or update attendance record
      const signedUp = signedUpIdx >= 0 ? row[signedUpIdx]?.toLowerCase() === 'true' || row[signedUpIdx] === '1' : false
      const attended = attendedIdx >= 0 ? row[attendedIdx]?.toLowerCase() === 'true' || row[attendedIdx] === '1' : false
      const ncns = ncnsIdx >= 0 ? row[ncnsIdx]?.toLowerCase() === 'true' || row[ncnsIdx] === '1' : false

      const { error: recordError } = await supabase
        .from('attendance_records')
        .upsert({
          user_id: member.user_id,
          raid_event_id: raidEventId,
          signed_up: signedUp,
          attended: attended,
          no_call_no_show: ncns
        }, {
          onConflict: 'user_id,raid_event_id'
        })

      if (recordError) console.error('Error importing record:', recordError)
    }
  }

  const importLootItems = async (headers: string[], rows: string[][]) => {
    // Expected headers: name, boss_name, item_slot, wowhead_id
    const nameIdx = headers.indexOf('name')
    const bossIdx = headers.indexOf('boss_name')
    const slotIdx = headers.indexOf('item_slot')
    const wowheadIdx = headers.indexOf('wowhead_id')

    if (nameIdx < 0 || bossIdx < 0 || slotIdx < 0 || wowheadIdx < 0) {
      throw new Error('CSV must have "name", "boss_name", "item_slot", and "wowhead_id" columns')
    }

    // Get active raid tier
    const { data: tierData } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('guild_id', guildId)
      .eq('is_active', true)
      .single()

    if (!tierData) {
      throw new Error('No active raid tier found')
    }

    for (const row of rows) {
      if (row.length < Math.max(nameIdx, bossIdx, slotIdx, wowheadIdx) + 1) continue

      const { error } = await supabase
        .from('loot_items')
        .insert({
          raid_tier_id: tierData.id,
          name: row[nameIdx],
          boss_name: row[bossIdx],
          item_slot: row[slotIdx],
          wowhead_id: parseInt(row[wowheadIdx]) || 0
        })

      if (error) console.error('Error importing item:', error)
    }
  }

  const importMembers = async (headers: string[], rows: string[][]) => {
    // Expected headers: character_name, role, class_name, user_id (discord id)
    const nameIdx = headers.indexOf('character_name')
    const roleIdx = headers.indexOf('role')
    const classIdx = headers.indexOf('class_name')
    const userIdIdx = headers.indexOf('user_id')

    if (nameIdx < 0) {
      throw new Error('CSV must have "character_name" column')
    }

    // This would need to match users by Discord ID or email
    // For now, just show a message that this requires manual setup
    throw new Error('Member import requires user authentication. Please add members through the app interface.')
  }

  return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        {/* Header */}
        <div>
          <Heading level={1}>Import raid data</Heading>
          <p className="text-muted-foreground mt-1 text-base">Import raid tracking data from CSV files</p>
        </div>

        <div className="bg-background-elevated border border-border rounded-xl p-6">
          <h2 className="text-[24px] font-semibold text-foreground mb-4">Import data from CSV</h2>

          <div className="space-y-4">
            <div>
              <Label className="mb-2">Import type</Label>
              <Select
                variant="rounded"
                size="sm"
                value={importType}
                onChange={(e) => setImportType(e.target.value as any)}
              >
                <option value="attendance">Attendance records</option>
                <option value="loot_items">Loot items</option>
                <option value="members">Guild Members (Not Available)</option>
              </Select>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-foreground mb-2">CSV file</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-5 py-3 bg-background-elevated border border-border-strong rounded-[52px] text-foreground text-[13px] focus:outline-none focus:border-accent"
              />
            </div>

            <div className="bg-background-elevated rounded-xl p-4">
              <h3 className="text-foreground font-medium mb-2 text-[14px]">Expected CSV format:</h3>
              {importType === 'attendance' && (
                <div className="text-muted-foreground text-[13px] space-y-1">
                  <p><strong className="text-foreground">Headers:</strong> date, character_name, signed_up, attended, no_call_no_show</p>
                  <p><strong className="text-foreground">Example:</strong></p>
                  <pre className="bg-background-subtle p-2 rounded text-xs mt-2">
{`date,character_name,signed_up,attended,no_call_no_show
2025-01-14,PlayerName,true,true,false`}
                  </pre>
                </div>
              )}
              {importType === 'loot_items' && (
                <div className="text-muted-foreground text-[13px] space-y-1">
                  <p><strong className="text-foreground">Headers:</strong> name, boss_name, item_slot, wowhead_id</p>
                  <p><strong className="text-foreground">Example:</strong></p>
                  <pre className="bg-background-subtle p-2 rounded text-xs mt-2">
{`name,boss_name,item_slot,wowhead_id
Thunderfury,Prince,Weapon,19019`}
                  </pre>
                </div>
              )}
            </div>

            <Button
              variant="primary"
              onClick={handleImport}
              disabled={!file}
              loading={loading}
              className="w-full"
            >
              Import data
            </Button>
          </div>
        </div>
      </div>
  )
}
