'use client'

import { useState } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Heading, Text, LabelText } from '@/components/ui/typography'
import { AddonExportDialog } from '@/components/addon/AddonExportDialog'
import { AddonImportDialog } from '@/components/addon/AddonImportDialog'
import { HugeiconsIcon } from '@hugeicons/react'
import { Download04Icon, Upload04Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'

export default function AddonPage() {
  const { activeGuild } = useGuildContext()
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)

  if (!activeGuild) {
    return (
      <div className="p-8">
        <Text color="muted">No active guild selected.</Text>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <Heading level={1}>WoW Addon</Heading>
        <Text color="secondary" className="mt-1">
          Sync data between LootList+ and the in-game addon.
        </Text>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <HugeiconsIcon icon={InformationCircleIcon} size={20} className="text-accent mt-0.5 shrink-0" />
            <div className="space-y-2">
              <Text size="sm">
                The LootList+ addon lets officers distribute loot in-game using your guild&apos;s priority data. Install the addon, then use the export/import below to sync.
              </Text>
              <Text size="xs" color="muted">
                Download the addon from CurseForge or copy it manually to your WoW AddOns folder.
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Export card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Upload04Icon} size={20} />
              Export to Addon
            </CardTitle>
            <CardDescription>
              Send guild data to the in-game addon. Includes items, submissions, scores, attendance, and settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <LabelText>How it works</LabelText>
              <ol className="text-xs text-foreground-secondary space-y-1 list-decimal list-inside">
                <li>Click &ldquo;Generate export string&rdquo; below</li>
                <li>Copy the generated string</li>
                <li>In WoW, type <code className="px-1 py-0.5 bg-background-subtle rounded text-accent">/llp import</code></li>
                <li>Paste the string and click Import</li>
              </ol>
              <Button variant="primary" onClick={() => setShowExport(true)} className="w-full">
                <HugeiconsIcon icon={Upload04Icon} size={16} className="mr-2" />
                Export for Addon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Import card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Download04Icon} size={20} />
              Import from Addon
            </CardTitle>
            <CardDescription>
              Import loot awards and attendance records captured during a raid.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <LabelText>How it works</LabelText>
              <ol className="text-xs text-foreground-secondary space-y-1 list-decimal list-inside">
                <li>In WoW after a raid, type <code className="px-1 py-0.5 bg-background-subtle rounded text-accent">/llp export</code></li>
                <li>Copy the generated string</li>
                <li>Click &ldquo;Import from addon&rdquo; below</li>
                <li>Paste the string and click Import</li>
              </ol>
              <Button variant="outline" onClick={() => setShowImport(true)} className="w-full">
                <HugeiconsIcon icon={Download04Icon} size={16} className="mr-2" />
                Import from Addon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Slash commands reference */}
      <Card>
        <CardHeader>
          <CardTitle>Addon Commands</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm">
            {[
              { cmd: '/llp', desc: 'Open the main overlay' },
              { cmd: '/llp import', desc: 'Paste guild data from web app' },
              { cmd: '/llp export', desc: 'Copy awards/attendance for web app' },
              { cmd: '/llp loot', desc: 'Toggle loot distribution frame' },
              { cmd: '/llp scores', desc: 'View raid roster scores' },
              { cmd: '/llp list', desc: 'View your loot list' },
              { cmd: '/llp attendance', desc: 'View attendance tracking' },
              { cmd: '/llp status', desc: 'Show sync status' },
            ].map(({ cmd, desc }) => (
              <div key={cmd} className="flex items-center gap-3">
                <code className="px-2 py-0.5 bg-background-subtle rounded text-accent text-xs font-mono shrink-0 w-32">
                  {cmd}
                </code>
                <Text size="xs" color="secondary">{desc}</Text>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddonExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        guildId={activeGuild.id}
      />
      <AddonImportDialog
        open={showImport}
        onClose={() => setShowImport(false)}
        guildId={activeGuild.id}
      />
    </div>
  )
}
