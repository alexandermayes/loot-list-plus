'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  DiscordIcon,
  MoreVerticalIcon,
  Upload01Icon,
} from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { parseDate } from '@/utils/date'

interface RaidLike {
  id: string
  raid_date: string
  is_skipped: boolean
  skip_reason: string | null
  is_bonus?: boolean
  wcl_report_code: string | null
}

interface RaidCardHeaderProps {
  raid: RaidLike
  isExpanded: boolean
  isPast: boolean
  today: string
  hasImportedData: boolean
  attendedCount: number
  signupCount: number
  lootCount: number
  canPostDiscord: boolean
  canLinkWcl: boolean
  isPostingDiscord: boolean
  isLinkingWcl: boolean
  onToggleExpanded: (raidId: string) => void
  onImport: (raid: RaidLike, hasImportedData: boolean) => void
  onPostToDiscord: (raidId: string) => void
  onLinkWcl: (raidId: string) => void
  onSkipDay: (raidId: string, isSkipped: boolean) => void
}

export function RaidCardHeader({
  raid,
  isExpanded,
  isPast,
  today,
  hasImportedData,
  attendedCount,
  signupCount,
  lootCount,
  canPostDiscord,
  canLinkWcl,
  isPostingDiscord,
  isLinkingWcl,
  onToggleExpanded,
  onImport,
  onPostToDiscord,
  onLinkWcl,
  onSkipDay,
}: RaidCardHeaderProps) {
  return (
    <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggleExpanded(raid.id)}
          className="text-foreground hover:text-accent transition-colors h-auto w-auto p-0"
        >
          {isExpanded ? (
            <HugeiconsIcon icon={ArrowUp01Icon} size={20} />
          ) : (
            <HugeiconsIcon icon={ArrowDown01Icon} size={20} />
          )}
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h3
              className={`text-[18px] font-bold ${
                raid.is_skipped ? 'line-through opacity-50' : 'text-foreground'
              }`}
            >
              {parseDate(raid.raid_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </h3>
            {raid.is_skipped && (
              <Badge variant="destructive-subtle">Skipped: {raid.skip_reason}</Badge>
            )}
            {raid.is_bonus && !raid.is_skipped && (
              <Badge variant="accent-subtle">Bonus</Badge>
            )}
            {!isPast && !raid.is_skipped && raid.raid_date === today && (
              <Badge variant="accent">Today</Badge>
            )}
            {hasImportedData && !raid.is_skipped && (
              <Badge variant="success-subtle">Imported</Badge>
            )}
          </div>
          {!raid.is_skipped && (
            <p className="text-foreground-muted text-[13px] mt-1">
              {attendedCount} attended • {signupCount} signed up
              {lootCount > 0 && (
                <span className="text-[#a335ee]"> • {lootCount} loot</span>
              )}
              {raid.wcl_report_code && (
                <span>
                  {' '}
                  •{' '}
                  <a
                    href={`https://classic.warcraftlogs.com/reports/${raid.wcl_report_code}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#e35e15] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    WCL Report
                  </a>
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {!raid.is_skipped && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onImport(raid, hasImportedData)}
            className={
              hasImportedData ? 'border-success/50 text-success hover:bg-success/20' : ''
            }
          >
            <HugeiconsIcon icon={Upload01Icon} size={16} />
            <span className="hidden sm:inline">
              {hasImportedData ? 'Edit import' : 'Import data'}
            </span>
            <span className="sm:hidden">{hasImportedData ? 'Edit' : 'Import'}</span>
          </Button>
        )}
        {!raid.is_skipped && hasImportedData && canPostDiscord && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPostToDiscord(raid.id)}
            loading={isPostingDiscord}
            className="border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10"
          >
            <HugeiconsIcon icon={DiscordIcon} size={16} />
            <span className="hidden sm:inline">Post to Discord</span>
            <span className="sm:hidden">Discord</span>
          </Button>
        )}
        {raid.is_skipped ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onSkipDay(raid.id, raid.is_skipped)}
            className="bg-destructive/30 hover:bg-destructive/40"
          >
            Unskip
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="More raid actions"
                className="px-2"
              >
                <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {hasImportedData && canLinkWcl && (
                <DropdownMenuItem
                  onClick={() => onLinkWcl(raid.id)}
                  disabled={isLinkingWcl}
                >
                  {isLinkingWcl ? 'Linking WCL…' : 'Link WCL'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onSkipDay(raid.id, false)}
                className="text-destructive focus:text-destructive"
              >
                Skip day
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
