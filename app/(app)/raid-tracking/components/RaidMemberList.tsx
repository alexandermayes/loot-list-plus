'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import { Cancel01Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ItemLink from '@/app/components/ItemLink'
import { getCellState, getCellStyle, type CellState } from './cell-state'
import type {
  AttendanceStatus,
  Member,
  RaidLootEntry,
  UnlinkedAttendee,
} from './types'

interface RaidMemberListProps {
  raidId: string
  members: Member[]
  attendanceMap: Record<string, AttendanceStatus> | undefined
  loot: RaidLootEntry[] | undefined
  unlinkedAttendees: UnlinkedAttendee[] | undefined
  useSignups: boolean
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

function StatusPill({ state, isSignedUp }: { state: CellState; isSignedUp: boolean }) {
  return (
    <>
      {state === 'attended' && (
        <span className="text-[11px] font-medium text-success bg-success/15 px-2 py-0.5 rounded-full flex-shrink-0">
          Attended
        </span>
      )}
      {state === 'late' && (
        <span className="text-[11px] font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full flex-shrink-0">
          Late
        </span>
      )}
      {state === 'standby' && (
        <span className="text-[11px] font-medium text-orange-500 bg-orange-500/15 px-2 py-0.5 rounded-full flex-shrink-0">
          Standby
        </span>
      )}
      {state === 'no-show' && (
        <span className="text-[11px] font-medium text-destructive bg-destructive/15 px-2 py-0.5 rounded-full flex-shrink-0">
          No Show
        </span>
      )}
      {state === 'excused' && (
        <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
          Excused
        </span>
      )}
      {isSignedUp && (
        <span className="text-[11px] font-medium text-accent bg-accent/15 px-2 py-0.5 rounded-full flex-shrink-0">
          Signed up
        </span>
      )}
    </>
  )
}

export function RaidMemberList({
  raidId,
  members,
  attendanceMap,
  loot,
  unlinkedAttendees,
  useSignups,
  onCycleStatus,
  onSetAttendanceStatus,
  onToggleSignup,
  onRemoveFromAttendance,
  onMarkAllAttended,
  onOpenReassign,
  onDeleteLootEntry,
}: RaidMemberListProps) {
  const noMembers = members.length === 0
  const noUnlinked = !unlinkedAttendees || unlinkedAttendees.length === 0

  if (noMembers && noUnlinked) {
    return (
      <div className="border-t border-border px-4 sm:px-6 py-4">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-foreground-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h4 className="text-[16px] font-semibold text-foreground mb-2">
            No raiders with loot lists
          </h4>
          <p className="text-foreground-muted text-[13px] max-w-md mx-auto">
            Guild members with loot submissions will appear here. Use the "Import data"
            button to add attendance for this raid day.
          </p>
        </div>
      </div>
    )
  }

  const anyEmpty = members.some(
    (m) => getCellState(attendanceMap?.[m.character_id]) === 'empty'
  )

  const visibleUnlinked = (unlinkedAttendees ?? []).filter(
    (attendee) =>
      !members.some(
        (m) => m.character_name.toLowerCase() === attendee.character_name.toLowerCase()
      )
  )

  return (
    <div className="border-t border-border px-4 sm:px-6 py-4">
      {anyEmpty && (
        <div className="flex justify-end mb-2">
          <Button
            variant="success-outline"
            size="sm"
            onClick={() => onMarkAllAttended(raidId, members)}
          >
            Mark all attended
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {members.map((member) => {
          const status = attendanceMap?.[member.character_id]
          const state = getCellState(status)
          const isSignedUp = status?.signed_up || false
          const memberLoot = (loot ?? []).filter(
            (l) =>
              l.character_name.toLowerCase() === member.character_name.toLowerCase()
          )

          return (
            <div
              key={member.character_id}
              className={`flex flex-col rounded-lg transition-colors ${getCellStyle(state)}`}
            >
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => onCycleStatus(raidId, member.character_id, member.user_id)}
                  className="flex items-center gap-2 min-w-0 flex-1 px-3 py-2 text-left cursor-pointer hover:bg-muted/50 rounded-l-lg transition-colors"
                >
                  <span
                    className="font-medium text-[13px] truncate"
                    style={{ color: member.class_color }}
                  >
                    {member.character_name}
                  </span>

                  {memberLoot.length > 0 && (
                    <span className="hidden sm:flex items-center gap-2 text-[12px] min-w-0 overflow-hidden">
                      <span className="text-muted-foreground flex-shrink-0">→</span>
                      {memberLoot.slice(0, 2).map((lootEntry) => (
                        <span
                          key={lootEntry.id}
                          className="min-w-0 max-w-[180px] flex-shrink overflow-hidden"
                        >
                          <ItemLink
                            name={lootEntry.item_name}
                            wowheadId={lootEntry.item_wowhead_id}
                            className="text-[12px]"
                          />
                        </span>
                      ))}
                      {memberLoot.length > 2 && (
                        <span
                          className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0"
                          title={memberLoot
                            .slice(2)
                            .map((l) => l.item_name)
                            .join(', ')}
                        >
                          +{memberLoot.length - 2} more
                        </span>
                      )}
                    </span>
                  )}

                  <span className="flex-1" />

                  <StatusPill state={state} isSignedUp={isSignedUp} />
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 mr-1"
                    >
                      <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        onSetAttendanceStatus(
                          raidId,
                          member.character_id,
                          member.user_id,
                          'attended'
                        )
                      }
                      className={state === 'attended' ? 'bg-muted' : ''}
                    >
                      Mark as attended
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onSetAttendanceStatus(
                          raidId,
                          member.character_id,
                          member.user_id,
                          'late'
                        )
                      }
                      className={state === 'late' ? 'bg-muted' : ''}
                    >
                      Mark as late
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onSetAttendanceStatus(
                          raidId,
                          member.character_id,
                          member.user_id,
                          'standby'
                        )
                      }
                      className={state === 'standby' ? 'bg-muted' : ''}
                    >
                      Mark as standby
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onSetAttendanceStatus(
                          raidId,
                          member.character_id,
                          member.user_id,
                          'no-show'
                        )
                      }
                      className={state === 'no-show' ? 'bg-muted' : ''}
                    >
                      Mark as no show
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onSetAttendanceStatus(
                          raidId,
                          member.character_id,
                          member.user_id,
                          'empty'
                        )
                      }
                      className={state === 'empty' ? 'bg-muted' : ''}
                    >
                      Clear status
                    </DropdownMenuItem>
                    {useSignups && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            onToggleSignup(raidId, member.character_id, member.user_id)
                          }
                        >
                          {isSignedUp ? 'Remove signup' : 'Mark as signed up'}
                        </DropdownMenuItem>
                      </>
                    )}
                    {memberLoot.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            onOpenReassign({
                              raidId,
                              lootEntries: memberLoot,
                              currentMember: member,
                            })
                          }
                        >
                          Reassign loot
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onRemoveFromAttendance(raidId, member.character_id)}
                      className="text-destructive"
                    >
                      Remove from raid
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {memberLoot.length > 0 && (
                <div className="flex items-center gap-2 text-[12px] sm:hidden px-3 pb-2 flex-wrap">
                  <span className="text-muted-foreground">→</span>
                  {memberLoot.map((lootEntry) => (
                    <div key={lootEntry.id} className="flex items-center gap-1">
                      <ItemLink
                        name={lootEntry.item_name}
                        wowheadId={lootEntry.item_wowhead_id}
                        className="text-[12px]"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteLootEntry(lootEntry.id, raidId)
                        }}
                        className="text-destructive hover:text-destructive/80 h-5 w-5 p-0"
                        title="Remove loot"
                      >
                        <HugeiconsIcon icon={Cancel01Icon} size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {visibleUnlinked.map((attendee, idx) => {
          const state = getCellState(attendee.status)

          return (
            <div
              key={`unlinked-${idx}`}
              className={`flex items-center px-3 py-2 rounded-lg opacity-60 ${getCellStyle(state)}`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className="font-medium text-muted-foreground text-[13px] truncate"
                  title={`${attendee.character_name} (account not linked)`}
                >
                  {attendee.character_name}
                </span>
                <span className="flex-1" />
                <StatusPill state={state} isSignedUp={false} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
