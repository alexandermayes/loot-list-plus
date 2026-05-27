'use client'

import { RaidCardHeader } from './RaidCardHeader'
import { RaidMemberList } from './RaidMemberList'
import type { CellState } from './cell-state'
import type {
  AttendanceStatus,
  Member,
  RaidEvent,
  RaidLootEntry,
  UnlinkedAttendee,
} from './types'

interface RaidCardProps {
  raid: RaidEvent
  isExpanded: boolean
  isPast: boolean
  today: string
  hasImportedData: boolean
  attendedCount: number
  signupCount: number
  lootCount: number
  members: Member[]
  attendanceMap: Record<string, AttendanceStatus> | undefined
  loot: RaidLootEntry[] | undefined
  unlinkedAttendees: UnlinkedAttendee[] | undefined
  useSignups: boolean
  canPostDiscord: boolean
  canLinkWcl: boolean
  isPostingDiscord: boolean
  isLinkingWcl: boolean
  onToggleExpanded: (raidId: string) => void
  onImport: (raid: RaidEvent, hasImportedData: boolean) => void | Promise<void>
  onPostToDiscord: (raidId: string) => void
  onLinkWcl: (raidId: string) => void
  onSkipDay: (raidId: string, isSkipped: boolean) => void
  onCycleStatus: (raidId: string, characterId: string, userId: string) => void
  onSetAttendanceStatus: (
    raidId: string,
    characterId: string,
    userId: string,
    state: CellState
  ) => void
  onToggleSignup: (raidId: string, characterId: string, userId: string) => void
  onRemoveFromAttendance: (raidId: string, characterId: string) => void
  onMarkAllAttended: (raidId: string, members: Member[]) => void
  onOpenReassign: (target: {
    raidId: string
    lootEntries: RaidLootEntry[]
    currentMember: Member
  }) => void
  onDeleteLootEntry: (lootId: string, raidId: string) => void
}

export function RaidCard(props: RaidCardProps) {
  const {
    raid,
    isExpanded,
    isPast,
    today,
    hasImportedData,
    attendedCount,
    signupCount,
    lootCount,
    members,
    attendanceMap,
    loot,
    unlinkedAttendees,
    useSignups,
    canPostDiscord,
    canLinkWcl,
    isPostingDiscord,
    isLinkingWcl,
    onToggleExpanded,
    onImport,
    onPostToDiscord,
    onLinkWcl,
    onSkipDay,
    onCycleStatus,
    onSetAttendanceStatus,
    onToggleSignup,
    onRemoveFromAttendance,
    onMarkAllAttended,
    onOpenReassign,
    onDeleteLootEntry,
  } = props

  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      <RaidCardHeader
        raid={raid}
        isExpanded={isExpanded}
        isPast={isPast}
        today={today}
        hasImportedData={hasImportedData}
        attendedCount={attendedCount}
        signupCount={signupCount}
        lootCount={lootCount}
        canPostDiscord={canPostDiscord}
        canLinkWcl={canLinkWcl}
        isPostingDiscord={isPostingDiscord}
        isLinkingWcl={isLinkingWcl}
        onToggleExpanded={onToggleExpanded}
        onImport={onImport}
        onPostToDiscord={onPostToDiscord}
        onLinkWcl={onLinkWcl}
        onSkipDay={onSkipDay}
      />

      {isExpanded && !raid.is_skipped && (
        <RaidMemberList
          raidId={raid.id}
          members={members}
          attendanceMap={attendanceMap}
          loot={loot}
          unlinkedAttendees={unlinkedAttendees}
          useSignups={useSignups}
          onCycleStatus={onCycleStatus}
          onSetAttendanceStatus={onSetAttendanceStatus}
          onToggleSignup={onToggleSignup}
          onRemoveFromAttendance={onRemoveFromAttendance}
          onMarkAllAttended={onMarkAllAttended}
          onOpenReassign={onOpenReassign}
          onDeleteLootEntry={onDeleteLootEntry}
        />
      )}
    </div>
  )
}
