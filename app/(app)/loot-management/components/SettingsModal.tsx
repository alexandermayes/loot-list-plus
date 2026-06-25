'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  Calendar03Icon,
  DiceIcon,
  GiftIcon,
  Layers01Icon,
  Medal01Icon,
  Settings01Icon,
  Settings02Icon,
  UserAdd01Icon,
} from '@hugeicons/core-free-icons'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '@/components/ui/modal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { useConfirm } from '@/components/ui/confirm-modal'
import { useNotification } from '@/app/contexts/NotificationContext'
import { allRoles, getRoleDisplayName } from '@/domain/loot/spec-role-mapping'
import { toDateString } from '@/utils/date'

interface GuildRole {
  name: string
  position: number
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settings: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSettings: (next: any) => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  advancedExpanded: boolean
  setAdvancedExpanded: (v: boolean) => void
  guildRoles: GuildRole[]
}

export function SettingsModal({
  open,
  onClose,
  settings,
  setSettings,
  saveStatus,
  advancedExpanded,
  setAdvancedExpanded,
  guildRoles,
}: SettingsModalProps) {
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  return (
    <>
      {/* Loot System Settings Modal */}
      <Modal open={open} onClose={() => onClose()} size="xl">
        <ModalHeader onClose={() => onClose()}>
          <div className="flex items-center gap-3">
            <ModalTitle>Loot system settings</ModalTitle>
            {saveStatus === 'saving' && <span className="text-[12px] text-muted-foreground">Saving...</span>}
            {saveStatus === 'saved' && <span className="text-[12px] text-success">Saved</span>}
            {saveStatus === 'error' && <span className="text-[12px] text-destructive">Save failed</span>}
          </div>
        </ModalHeader>
        <ModalBody className="space-y-6">
              {/* General Settings */}
              <Card variant="unified">
                <CardHeader>
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    <HugeiconsIcon icon={Settings01Icon} size={18} className="text-muted-foreground" />
                    General settings
                  </CardTitle>
                  <CardDescription>Configure how Loot Scores are displayed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label className="block mb-2">Score precision</Label>
                    <Select
                      variant="pill"
                      value={settings.decimal_places}
                      onChange={(e) => setSettings({ ...settings, decimal_places: Number(e.target.value) })}
                      className="bg-background-elevated"
                    >
                      <option value="0">Whole numbers (e.g., 42)</option>
                      <option value="1">One decimal (e.g., 42.5)</option>
                      <option value="2">Two decimals (e.g., 42.50)</option>
                    </Select>
                    <p className="text-muted-foreground text-[12px] mt-1">How many decimal places to show</p>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance Settings - Basic */}
              <Card variant="unified">
                <CardHeader>
                  <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                    <HugeiconsIcon icon={Calendar03Icon} size={18} className="text-muted-foreground" />
                    Attendance
                  </CardTitle>
                  <CardDescription>Control how attendance bonuses are calculated. Consistent raiders get priority on loot.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2 inline-flex items-center gap-1">Type of attendance bonus <InfoTooltip content="How attendance points are calculated. Points-per-raid gives flat points, linear scales with %, breakpoint gives fixed bonuses at thresholds." iconSize={12} /></Label>
                      <Select
                        variant="pill"
                        value={settings.attendance_type}
                        onChange={(e) => setSettings({ ...settings, attendance_type: e.target.value as 'linear' | 'breakpoint' | 'points-per-raid' })}
                        className="bg-background-elevated"
                      >
                        <option value="points-per-raid">Points per raid</option>
                        <option value="linear">Linear (percentage)</option>
                        <option value="breakpoint">Breakpoint</option>
                      </Select>
                      <p className="text-muted-foreground text-[12px] mt-1">
                        {settings.attendance_type === 'points-per-raid'
                          ? 'Flat points per raid: signup + attendance = 1 point/raid'
                          : settings.attendance_type === 'linear'
                          ? 'Scales with % of raids attended'
                          : 'Fixed bonus at attendance thresholds'}
                      </p>
                    </div>

                    <div>
                      <Label className="block mb-2 inline-flex items-center gap-1">Rolling attendance period (weeks) <InfoTooltip content="How far back to look when calculating attendance. Only raids within this window count toward a raider's score." iconSize={12} /></Label>
                      <Input
                        variant="pill"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={settings.rolling_attendance_weeks}
                        onChange={(e) => setSettings({ ...settings, rolling_attendance_weeks: Number(e.target.value) })}
                        className="bg-background-elevated"
                      />
                      <p className="text-muted-foreground text-[12px] mt-1">How many weeks to track attendance</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2 inline-flex items-center gap-1">Minimum raids per week for full credit <InfoTooltip content="If a raider attends at least this many raids in a calendar week, the week counts as full attendance. Helps shift workers who can't make every raid. Leave blank to require all scheduled raids." iconSize={12} /></Label>
                      <Input
                        variant="pill"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="7"
                        placeholder="Off"
                        value={settings.weekly_attendance_minimum ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          setSettings({
                            ...settings,
                            weekly_attendance_minimum: raw === '' ? null : Number(raw),
                          })
                        }}
                        className="bg-background-elevated"
                      />
                      <p className="text-muted-foreground text-[12px] mt-1">
                        {settings.weekly_attendance_minimum
                          ? `Attending ${settings.weekly_attendance_minimum}+ raids in a week = full weekly credit`
                          : 'Off — every scheduled raid counts toward the week'}
                      </p>
                    </div>

                    <div>
                      <Label className="block mb-2 inline-flex items-center gap-1">Weekly raid reset day <InfoTooltip content="Anchors the attendance week to your region's raid lockout reset. Raids in the current reset week don't count toward scoring until the next reset, so officers can finish entering attendance without it shifting priorities mid-evening." iconSize={12} /></Label>
                      <Select
                        variant="pill"
                        value={String(settings.week_reset_day ?? 2)}
                        onChange={(e) => setSettings({ ...settings, week_reset_day: Number(e.target.value) })}
                        className="bg-background-elevated"
                      >
                        <option value="2">Tuesday (NA)</option>
                        <option value="3">Wednesday (EU)</option>
                        <option value="4">Thursday (KR/TW/CN)</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </Select>
                      <p className="text-muted-foreground text-[12px] mt-1">In-progress reset weeks are excluded until the next reset</p>
                    </div>
                  </div>

                  {/* Linear: show max bonus */}
                  {settings.attendance_type === 'linear' && (
                    <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                      <div className="w-full sm:w-1/3">
                        <Label className="block mb-2">Maximum attendance bonus</Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          value={settings.max_attendance_bonus}
                          onChange={(e) => setSettings({ ...settings, max_attendance_bonus: Number(e.target.value) })}
                          placeholder="Points"
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">Bonus at 100% attendance</p>
                      </div>
                    </div>
                  )}

                  {/* Breakpoint: show all tiers */}
                  {settings.attendance_type === 'breakpoint' && (
                    <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                      <p className="text-muted-foreground text-[12px] mb-3">Configure bonus points for different attendance thresholds (points | threshold %)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label size="sm" className="block text-muted-foreground mb-1">Max attendance</Label>
                          <div className="flex gap-2">
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              value={settings.max_attendance_bonus}
                              onChange={(e) => setSettings({ ...settings, max_attendance_bonus: Number(e.target.value) })}
                              placeholder="Points"
                              className="bg-background-elevated"
                            />
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              value={settings.max_attendance_threshold}
                              onChange={(e) => setSettings({ ...settings, max_attendance_threshold: Number(e.target.value) })}
                              placeholder="Threshold"
                              className="bg-background-elevated"
                            />
                          </div>
                        </div>
                        <div>
                          <Label size="sm" className="block text-muted-foreground mb-1">Middle attendance</Label>
                          <div className="flex gap-2">
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              value={settings.middle_attendance_bonus}
                              onChange={(e) => setSettings({ ...settings, middle_attendance_bonus: Number(e.target.value) })}
                              placeholder="Points"
                              className="bg-background-elevated"
                            />
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              value={settings.middle_attendance_threshold}
                              onChange={(e) => setSettings({ ...settings, middle_attendance_threshold: Number(e.target.value) })}
                              placeholder="Threshold"
                              className="bg-background-elevated"
                            />
                          </div>
                        </div>
                        <div>
                          <Label size="sm" className="block text-muted-foreground mb-1">Bottom attendance</Label>
                          <div className="flex gap-2">
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              value={settings.bottom_attendance_bonus}
                              onChange={(e) => setSettings({ ...settings, bottom_attendance_bonus: Number(e.target.value) })}
                              placeholder="Points"
                              className="bg-background-elevated"
                            />
                            <Input
                              variant="pill"
                              size="sm"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              value={settings.bottom_attendance_threshold}
                              onChange={(e) => setSettings({ ...settings, bottom_attendance_threshold: Number(e.target.value) })}
                              placeholder="Threshold"
                              className="bg-background-elevated"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Points-per-raid: show max cap */}
                  {settings.attendance_type === 'points-per-raid' && (
                    <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                      <div className="w-full sm:w-1/3">
                        <Label className="block mb-2">Max points cap</Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          value={settings.max_attendance_bonus}
                          onChange={(e) => setSettings({ ...settings, max_attendance_bonus: Number(e.target.value) })}
                          placeholder="Points"
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">
                          Max possible: {settings.rolling_attendance_weeks * 2} pts ({settings.rolling_attendance_weeks} weeks × 2 raids)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Raid Signups */}
                  <div className="border-t border-border pt-4">
                    <p className="text-[13px] font-medium text-foreground mb-3">Raid signups</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="block mb-2">Use raid signups for attendance</Label>
                        <Select
                          variant="pill"
                          value={settings.use_signups ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, use_signups: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                        <p className="text-muted-foreground text-[12px] mt-1">Give bonus for signing up to raids</p>
                      </div>

                      <div>
                        <Label className="block mb-2">
                          {settings.attendance_type === 'points-per-raid'
                            ? 'Signup points (per raid)'
                            : 'Signup % of attendance (decimal)'}
                        </Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.signup_weight}
                          onChange={(e) => setSettings({ ...settings, signup_weight: Number(e.target.value) })}
                          disabled={settings.attendance_type !== 'points-per-raid' && !settings.use_signups}
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">
                          {settings.attendance_type === 'points-per-raid'
                            ? `Signup: ${settings.signup_weight} pts, Attend: ${(1 - settings.signup_weight).toFixed(2)} pts per raid`
                            : 'Portion of attendance bonus from signups'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Penalties */}
                  <div className="border-t border-border pt-4">
                    <p className="text-[13px] font-medium text-foreground mb-3">Penalties</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="block mb-2">Late show / leave early penalty</Label>
                        <Select
                          variant="pill"
                          value={settings.late_early_penalty_enabled ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, late_early_penalty_enabled: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                        <p className="text-muted-foreground text-[12px] mt-1">Penalize partial attendance</p>
                      </div>

                      <div>
                        <Label className="block mb-2">Penalty value</Label>
                        <Input
                          variant="pill"
                          type="number"
                          inputMode="numeric"
                          step="0.05"
                          value={settings.late_early_penalty_value}
                          onChange={(e) => setSettings({ ...settings, late_early_penalty_value: Number(e.target.value) })}
                          disabled={!settings.late_early_penalty_enabled}
                          className="bg-background-elevated"
                        />
                        <p className="text-muted-foreground text-[12px] mt-1">Attendance deduction for late/early</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Settings - Collapsible */}
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setAdvancedExpanded(!advancedExpanded)}
                  className="w-full flex items-center justify-between py-3 px-4 bg-background-subtle hover:bg-background-elevated border border-border-strong rounded-xl h-auto"
                >
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Settings02Icon} size={18} className="text-muted-foreground" />
                    <span className="text-[16px] font-semibold text-foreground">Advanced settings</span>
                    <span className="text-[12px] text-muted-foreground">(optional)</span>
                  </div>
                  <HugeiconsIcon
                    icon={advancedExpanded ? ArrowUp01Icon : ArrowDown01Icon}
                    size={20}
                    className="text-muted-foreground"
                  />
                </Button>

                {advancedExpanded && (
                  <div className="space-y-4 pt-2">
                    {/* New Members - Combined Policy and Trial System */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={UserAdd01Icon} size={18} className="text-muted-foreground" />
                          New members
                        </CardTitle>
                        <CardDescription>Control how new members are treated for loot eligibility and trial periods.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Attendance Calculation Mode */}
                        <div className="space-y-3">
                          <p className="text-[13px] font-medium text-foreground">Attendance calculation</p>
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.new_member_mode === 'raw' ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'}`}>
                            <input
                              type="radio"
                              name="new_member_mode"
                              value="raw"
                              checked={settings.new_member_mode === 'raw'}
                              onChange={() => setSettings({ ...settings, new_member_mode: 'raw' })}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium text-foreground">Raw attendance</div>
                              <div className="text-muted-foreground text-[13px]">Score calculated against full rolling window. New members naturally have lower priority until they&apos;ve attended enough raids.</div>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.new_member_mode === 'fair' ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'}`}>
                            <input
                              type="radio"
                              name="new_member_mode"
                              value="fair"
                              checked={settings.new_member_mode === 'fair'}
                              onChange={() => setSettings({ ...settings, new_member_mode: 'fair' })}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium text-foreground">Fair attendance</div>
                              <div className="text-muted-foreground text-[13px]">Score only counts raids since member joined guild. New members can compete equally if they&apos;re consistent.</div>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${settings.new_member_mode === 'minimum_gate' ? 'border-accent bg-accent/5' : 'border-border hover:border-border-strong'}`}>
                            <input
                              type="radio"
                              name="new_member_mode"
                              value="minimum_gate"
                              checked={settings.new_member_mode === 'minimum_gate'}
                              onChange={() => setSettings({ ...settings, new_member_mode: 'minimum_gate' })}
                              className="mt-1"
                            />
                            <div>
                              <div className="font-medium text-foreground">Minimum raids required</div>
                              <div className="text-muted-foreground text-[13px]">Members must attend a minimum number of raids before becoming eligible for loot. Uses fair attendance calculation once eligible.</div>
                            </div>
                          </label>

                          {settings.new_member_mode === 'minimum_gate' && (
                            <div className="ml-7 mt-2">
                              <Label className="block mb-2 inline-flex items-center gap-1">Minimum raids before eligible <InfoTooltip content="New members must attend this many raids before they can receive loot. Their score still tracks in the background." iconSize={12} /></Label>
                              <Input
                                variant="pill"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="20"
                                value={settings.minimum_raid_days}
                                onChange={(e) => setSettings({ ...settings, minimum_raid_days: Number(e.target.value) })}
                                className="bg-background-elevated w-24"
                              />
                              <p className="text-muted-foreground text-[12px] mt-1">Members must attend this many raids before they can receive loot.</p>
                            </div>
                          )}
                        </div>

                        {/* Trial System */}
                        <div className="space-y-4 pt-2 border-t border-border">
                          <p className="text-[13px] font-medium text-foreground pt-2">Trial system</p>
                          <p className="text-muted-foreground text-[12px] -mt-2">Apply a score penalty to members on trial status until promoted to full member.</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="block mb-2 inline-flex items-center gap-1">Enable trial penalty <InfoTooltip content="Applies a score penalty to trial members, giving established raiders priority. Removed when promoted to full member." iconSize={12} /></Label>
                              <Select
                                variant="pill"
                                value={settings.trial_penalty_enabled ? 'yes' : 'no'}
                                onChange={(e) => setSettings({ ...settings, trial_penalty_enabled: e.target.value === 'yes' })}
                                className="bg-background-elevated"
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </Select>
                            </div>

                            <div>
                              <Label className="block mb-2">Trial penalty value</Label>
                              <Input
                                variant="pill"
                                type="number"
                                inputMode="numeric"
                                step="0.5"
                                value={settings.trial_penalty_value}
                                onChange={(e) => setSettings({ ...settings, trial_penalty_value: Number(e.target.value) })}
                                disabled={!settings.trial_penalty_enabled}
                                className="bg-background-elevated"
                              />
                              <p className="text-muted-foreground text-[11px] mt-1">Negative value reduces trial member scores</p>
                            </div>
                          </div>

                          <div>
                            <Label className="block mb-2">New members start as trial</Label>
                            <Select
                              variant="pill"
                              value={settings.new_members_start_as_trial ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, new_members_start_as_trial: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                            <p className="text-muted-foreground text-[11px] mt-1">When enabled, new members joining the guild will automatically be set to trial status</p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label className="block mb-2">Auto-promote trials</Label>
                              <Select
                                variant="pill"
                                value={settings.trial_auto_promote_enabled ? 'yes' : 'no'}
                                onChange={(e) => setSettings({ ...settings, trial_auto_promote_enabled: e.target.value === 'yes' })}
                                className="bg-background-elevated"
                              >
                                <option value="no">No</option>
                                <option value="yes">Yes</option>
                              </Select>
                            </div>

                            <div>
                              <Label className="block mb-2">Weeks until promotion</Label>
                              <Input
                                variant="pill"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max="52"
                                value={settings.trial_auto_promote_weeks}
                                onChange={(e) => setSettings({ ...settings, trial_auto_promote_weeks: Number(e.target.value) })}
                                disabled={!settings.trial_auto_promote_enabled}
                                className="bg-background-elevated"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Bad Luck Prevention (BLP) */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={DiceIcon} size={18} className="text-muted-foreground" />
                          Bad luck prevention
                        </CardTitle>
                        <CardDescription>Compensate raiders who lose rolls or get passed over for items they want. When a raider is &quot;in running&quot; (has the item ranked and attended the raid) but doesn&apos;t receive it, their BLP bonus increases. Resets to 0 when they finally win the item.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="block mb-2">Enable BLP tracking</Label>
                            <Select
                              variant="pill"
                              value={settings.blp_enabled ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, blp_enabled: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Bonus per loss <InfoTooltip content="How many points a raider gains each time they're in running for an item but don't receive it." iconSize={12} /></Label>
                            <Input
                              variant="pill"
                              type="number"
                              inputMode="numeric"
                              step="0.01"
                              min="0.01"
                              max="10"
                              value={settings.blp_increment}
                              onChange={(e) => setSettings({ ...settings, blp_increment: Number(e.target.value) })}
                              disabled={!settings.blp_enabled}
                              className="bg-background-elevated"
                            />
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Maximum bonus <InfoTooltip content="Cap on how high bad luck protection can stack. Prevents runaway scores from long absence periods." iconSize={12} /></Label>
                            <Input
                              variant="pill"
                              type="number"
                              inputMode="numeric"
                              step="0.1"
                              min="0.1"
                              max="50"
                              value={settings.blp_maximum}
                              onChange={(e) => setSettings({ ...settings, blp_maximum: Number(e.target.value) })}
                              disabled={!settings.blp_enabled}
                              className="bg-background-elevated"
                            />
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Include benched raiders <InfoTooltip content="Count benched raiders as in running. They showed up and were in the pool but got sat by officers, so they accrue BLP even though they couldn't roll." iconSize={12} /></Label>
                            <Select
                              variant="pill"
                              value={settings.blp_includes_benched ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, blp_includes_benched: e.target.value === 'yes' })}
                              disabled={!settings.blp_enabled}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Loot List Rules */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={Layers01Icon} size={18} className="text-muted-foreground" />
                          Loot list rules
                        </CardTitle>
                        <CardDescription>Control how raiders can arrange items in their priority brackets.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Allocation points <InfoTooltip content="How many allocation points (from Reserved and Limited items) a raider can spend in each bracket. Unlimited items cost 0." iconSize={12} /></Label>
                            <Select
                              variant="pill"
                              value={settings.max_allocation_points_per_bracket}
                              onChange={(e) => setSettings({ ...settings, max_allocation_points_per_bracket: Number(e.target.value) })}
                              className="bg-background-elevated"
                            >
                              {[1, 2, 3, 4, 5, 6].map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </Select>
                            <p className="text-muted-foreground text-[12px] mt-1">Max per bracket</p>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Same category <InfoTooltip content="How many items of the same equipment type (e.g. weapon, chest) a raider can place in each bracket. Tokens are excluded from this limit." iconSize={12} /></Label>
                            <Select
                              variant="pill"
                              value={settings.max_category_per_bracket}
                              onChange={(e) => setSettings({ ...settings, max_category_per_bracket: Number(e.target.value) })}
                              className="bg-background-elevated"
                            >
                              {[1, 2, 3, 4, 5, 6].map(n => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </Select>
                            <p className="text-muted-foreground text-[12px] mt-1">Max per bracket</p>
                          </div>

                          <div>
                            <Label className="block mb-2">Limit tier tokens</Label>
                            <Select
                              variant="pill"
                              value={settings.enforce_slot_restrictions ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, enforce_slot_restrictions: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                            <p className="text-muted-foreground text-[12px] mt-1">Restrict tokens per bracket</p>
                          </div>
                        </div>

                        {settings.enforce_slot_restrictions && (
                          <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                            <div className="w-full sm:w-1/3">
                              <Label className="block mb-2 inline-flex items-center gap-1">Max tier tokens <InfoTooltip content="How many tier token items a raider can place in each bracket." iconSize={12} /></Label>
                              <Select
                                variant="pill"
                                value={settings.max_tokens_per_bracket}
                                onChange={(e) => setSettings({ ...settings, max_tokens_per_bracket: Number(e.target.value) })}
                                className="bg-background-elevated"
                              >
                                {[1, 2, 3, 4, 5, 6].map(n => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </Select>
                              <p className="text-muted-foreground text-[12px] mt-1">Per bracket</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Rank, Role, Class Bonuses */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={Medal01Icon} size={18} className="text-muted-foreground" />
                          Rank, role and class bonuses
                        </CardTitle>
                        <CardDescription>Fine-tune priority systems to value guild rank, raid roles, class needs or individual contributions.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">

                      <div>
                        <Label className="block mb-2">Guild ranks give bonuses (positive or negative)</Label>
                        <Select
                          variant="pill"
                          value={settings.guild_rank_bonuses_enabled ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, guild_rank_bonuses_enabled: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                      </div>

                      {settings.guild_rank_bonuses_enabled && (
                        <div className="bg-background-elevated border border-border-strong p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[13px] font-medium text-foreground">Rank bonuses</p>
                            <p className="text-[11px] text-muted-foreground">Can be positive or negative. For negative, use - before number (e.g., -1)</p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[...guildRoles].sort((a, b) => b.position - a.position).map((role) => (
                              <div key={role.name}>
                                <Label size="sm" className="block text-foreground-muted mb-1">{role.name}</Label>
                                <Input
                                  variant="pill"
                                  size="sm"
                                  type="number"
                                  inputMode="numeric"
                                  step="0.1"
                                  value={settings.rank_modifiers[role.name] === 0 || settings.rank_modifiers[role.name] === undefined ? '' : settings.rank_modifiers[role.name]}
                                  onChange={(e) => {
                                    const newModifiers = { ...settings.rank_modifiers }
                                    if (e.target.value === '') {
                                      newModifiers[role.name] = 0
                                    } else {
                                      newModifiers[role.name] = Number(e.target.value)
                                    }
                                    setSettings({
                                      ...settings,
                                      rank_modifiers: newModifiers
                                    })
                                  }}
                                  placeholder="0"
                                  className="bg-background-elevated"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-accent mt-2">
                            Ensure you have assigned roles for each raider in the Master Sheet or calculations will not work.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="block mb-2 inline-flex items-center gap-1">Role bonus priority on single item <InfoTooltip content="When enabled, raiders whose role matches an item's role tag (e.g. Tank) get a score boost for that item." iconSize={12} /></Label>
                          <Select
                            variant="pill"
                            value={settings.role_bonus_priority_single_item ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, role_bonus_priority_single_item: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Boost priority for the intended role when an item has a role tag (e.g., Tank gear)</p>
                        </div>

                        <div>
                          <Label className="block mb-2">Class bonus priority on single item</Label>
                          <Select
                            variant="pill"
                            value={settings.class_bonus_priority_single_item ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, class_bonus_priority_single_item: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Boost priority for specific classes when an item has a class tag</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="block mb-2">Raid roles overall bonus priority</Label>
                          <Select
                            variant="pill"
                            value={settings.raid_roles_overall_bonus_priority ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, raid_roles_overall_bonus_priority: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Give certain raid roles (Tank, Healer, DPS) a global score bonus</p>
                        </div>

                        <div>
                          <Label className="block mb-2">Single raider overall bonus</Label>

                          <Select
                            variant="pill"
                            value={settings.single_raider_overall_bonus ? 'yes' : 'no'}
                            onChange={(e) => setSettings({ ...settings, single_raider_overall_bonus: e.target.value === 'yes' })}
                            className="bg-background-elevated"
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </Select>
                          <p className="text-muted-foreground text-[11px] mt-1">Give individual raiders a custom bonus or penalty, permanent or just for the week. Set amounts on the Priorities tab.</p>
                        </div>
                      </div>

                      {settings.raid_roles_overall_bonus_priority && (
                        <div className="bg-background-elevated border border-border-strong p-4 rounded-xl space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[13px] font-medium text-foreground">Role bonuses</p>
                            <p className="text-[11px] text-muted-foreground">Can be positive or negative. For negative, use - before number (e.g., -1)</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {allRoles.map((role) => (
                              <div key={role}>
                                <Label size="sm" className="block text-foreground-muted mb-1">{getRoleDisplayName(role)}</Label>
                                <Input
                                  variant="pill"
                                  size="sm"
                                  type="number"
                                  inputMode="numeric"
                                  step="0.1"
                                  value={settings.role_modifiers[role] === 0 || settings.role_modifiers[role] === undefined ? '' : settings.role_modifiers[role]}
                                  onChange={(e) => {
                                    const newModifiers = { ...settings.role_modifiers }
                                    if (e.target.value === '') {
                                      newModifiers[role] = 0
                                    } else {
                                      newModifiers[role] = Number(e.target.value)
                                    }
                                    setSettings({
                                      ...settings,
                                      role_modifiers: newModifiers
                                    })
                                  }}
                                  placeholder="0"
                                  className="bg-background-elevated"
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-[11px] text-accent mt-2">
                            Roles are determined by each raider&apos;s spec. Make sure specs are set correctly.
                          </p>
                        </div>
                      )}

                      {settings.single_raider_overall_bonus && (
                        <div className="bg-background-elevated border border-border-strong p-4 rounded-xl">
                          <p className="text-[12px] text-muted-foreground">
                            Set each raider&apos;s bonus or penalty on the <span className="text-accent font-medium">Priorities</span> tab, under &quot;Raider bonuses.&quot; You can give a permanent modifier or one that falls off at the next weekly reset.
                          </p>
                        </div>
                      )}

                      <div>
                        <Label className="block mb-2">Single raider bonus on single item</Label>
                        <Select
                          variant="pill"
                          value={settings.single_raider_bonus_single_item ? 'yes' : 'no'}
                          onChange={(e) => setSettings({ ...settings, single_raider_bonus_single_item: e.target.value === 'yes' })}
                          className="bg-background-elevated"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </Select>
                        <p className="text-muted-foreground text-[11px] mt-1">Allow boosting a specific raider&apos;s priority on a specific item</p>
                      </div>
                      </CardContent>
                    </Card>

                    {/* Donations */}
                    <Card variant="unified">
                      <CardHeader>
                        <CardTitle className="text-[15px] font-semibold flex items-center gap-2">
                          <HugeiconsIcon icon={GiftIcon} size={18} className="text-muted-foreground" />
                          Donations
                        </CardTitle>
                        <CardDescription>Reward members who donate gold, materials, or consumables to the guild bank.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label className="block mb-2">Enable donation bonuses</Label>
                            <Select
                              variant="pill"
                              value={settings.donation_bonuses_enabled ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, donation_bonuses_enabled: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                          </div>

                          <div>
                            <Label className="block mb-2">Cap on donation points</Label>
                            <Select
                              variant="pill"
                              value={settings.donation_cap_enabled ? 'yes' : 'no'}
                              onChange={(e) => setSettings({ ...settings, donation_cap_enabled: e.target.value === 'yes' })}
                              className="bg-background-elevated"
                              disabled={!settings.donation_bonuses_enabled}
                            >
                              <option value="no">No</option>
                              <option value="yes">Yes</option>
                            </Select>
                            <p className="text-muted-foreground text-[11px] mt-1">Limit max donation bonus to prevent pay-to-win</p>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Donation bonus type <InfoTooltip content="How donation points persist. Permanent stays forever, rolling decays over time, hard reset clears on a schedule." iconSize={12} /></Label>
                            <Select
                              variant="pill"
                              value={settings.donation_bonus_type}
                              onChange={(e) => setSettings({ ...settings, donation_bonus_type: e.target.value as 'permanent' | 'rolling' | 'hard-reset' })}
                              className="bg-background-elevated"
                              disabled={!settings.donation_bonuses_enabled}
                            >
                              <option value="permanent">Permanent</option>
                              <option value="rolling">Rolling</option>
                              <option value="hard-reset">Hard reset</option>
                            </Select>
                            <p className="text-muted-foreground text-[11px] mt-1">How donation points persist over time</p>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Cap points <InfoTooltip content="Maximum total donation bonus a raider can accumulate. Applies to all donations including historical ones." iconSize={12} /></Label>
                            <Input
                              variant="pill"
                              type="number"
                              min={0}
                              max={1000}
                              step="0.5"
                              value={settings.donation_cap_points ?? 0}
                              onChange={(e) => setSettings({ ...settings, donation_cap_points: Number(e.target.value) || 0 })}
                              disabled={!settings.donation_bonuses_enabled || !settings.donation_cap_enabled}
                            />
                            <p className="text-muted-foreground text-[11px] mt-1">Max bonus per raider</p>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Rolling window (weeks) <InfoTooltip content="Donations older than this are excluded from a raider's bonus. Leave blank to reuse the attendance rolling window." iconSize={12} /></Label>
                            <Input
                              variant="pill"
                              type="number"
                              min={1}
                              max={52}
                              step="1"
                              placeholder={`${settings.rolling_attendance_weeks ?? 4} (attendance window)`}
                              value={settings.donation_rolling_weeks ?? ''}
                              onChange={(e) => {
                                const raw = e.target.value
                                const parsed = raw === '' ? null : Math.max(1, Math.min(52, Number(raw) || 1))
                                setSettings({ ...settings, donation_rolling_weeks: parsed })
                              }}
                              disabled={!settings.donation_bonuses_enabled || settings.donation_bonus_type !== 'rolling'}
                            />
                            <p className="text-muted-foreground text-[11px] mt-1">Only applies in rolling mode</p>
                          </div>

                          <div>
                            <Label className="block mb-2 inline-flex items-center gap-1">Hard reset <InfoTooltip content="Hides all donations dated before this anchor from scoring. Use when starting a new tier or season. Records are preserved in the audit log." iconSize={12} /></Label>
                            {settings.donation_reset_at && (
                              <p className="text-foreground-secondary text-[12px] mt-1 mb-1">
                                Anchor: <span className="tabular-nums">{settings.donation_reset_at}</span>
                              </p>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              disabled={!settings.donation_bonuses_enabled || settings.donation_bonus_type !== 'hard-reset'}
                              onClick={() => {
                                const today = toDateString(new Date())
                                confirm({
                                  title: 'Reset donations?',
                                  description: `Donations dated before ${today} will no longer count toward Loot Score. Records stay in the audit log — this is non-destructive.`,
                                  confirmLabel: 'Reset donations',
                                  variant: 'danger',
                                  onConfirm: () => {
                                    setSettings({ ...settings, donation_reset_at: today })
                                    showNotification('success', `Donations reset to ${today}.`)
                                  },
                                })
                              }}
                            >
                              {settings.donation_reset_at ? 'Reset again' : 'Reset now'}
                            </Button>
                            <p className="text-muted-foreground text-[11px] mt-1">Only applies in hard-reset mode</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                  </div>
                )}
              </div>
        </ModalBody>
      </Modal>
      {ConfirmDialog}
    </>
  )
}
