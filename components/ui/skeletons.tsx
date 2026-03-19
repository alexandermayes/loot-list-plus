import { cn } from '@/lib/utils'

/**
 * Base skeleton element with pulse animation
 */
interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
    />
  )
}

/**
 * Stat card skeleton for Dashboard and Attendance stat cards
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-background-elevated border border-border rounded-xl p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-16 sm:w-24" />
          <Skeleton className="h-8 sm:h-10 w-12 sm:w-16" />
        </div>
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
      </div>
    </div>
  )
}

/**
 * Character info card skeleton for Dashboard
 */
export function CharacterCardSkeleton() {
  return (
    <div className="bg-background-elevated border border-border rounded-xl p-6 lg:w-1/3">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Item list skeleton for Dashboard loot priority items
 */
export function ItemListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-background-inset border border-border rounded-xl p-4"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Loot card skeleton for Dashboard "Next in Line" and "Recently Received" sections
 */
export function LootCardSkeleton() {
  return (
    <div className="bg-background-elevated border border-border rounded-xl p-6">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-8 h-8 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <ItemListSkeleton count={3} />
    </div>
  )
}

/**
 * Submission card skeleton for Pending Submissions and Loot Submissions pages
 */
export function SubmissionCardSkeleton() {
  return (
    <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Skeleton className="h-[19px] w-24" />
        <Skeleton className="h-[13px] w-16" />
        <Skeleton className="h-5 w-[68px] rounded-full" />
        <Skeleton className="h-[13px] w-40 hidden sm:block" />
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Skeleton className="h-8 w-[52px] rounded-[40px]" />
        <Skeleton className="h-8 w-8 rounded-[40px]" />
      </div>
    </div>
  )
}

/**
 * Guild card skeleton for Profile guilds list
 */
export function GuildCardSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-background-inset border border-border rounded-lg">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-24 sm:w-32" />
          <Skeleton className="h-4 w-20 sm:w-24" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      </div>
      <Skeleton className="h-10 w-20 sm:w-28 rounded-[52px] shrink-0" />
    </div>
  )
}

/**
 * Tier tabs skeleton for pages with raid tier selection
 */
export function TierTabsSkeleton() {
  return (
    <div className="flex items-center gap-3">
      {/* Matches phase tab buttons: h-11 (default Button size) with pill shape */}
      <div className="hidden sm:flex gap-2 flex-1 min-w-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-32 rounded-[40px] flex-shrink-0" />
        ))}
      </div>
      {/* Mobile: single dropdown */}
      <div className="sm:hidden flex-1">
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Table skeleton for Master Sheet, Loot List, Attendance tables
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-background-subtle">
        <div className="flex items-center gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex items-center gap-4">
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    'h-4',
                    colIndex === 0 ? 'w-32' : 'w-16'
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Boss section skeleton for Master Sheet boss navigation
 */
export function BossSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-[40px] flex-shrink-0" />
        ))}
      </div>
    </div>
  )
}

/**
 * Full dashboard content skeleton
 */
export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Character Card and Stats Row */}
      <div className="flex flex-col lg:flex-row gap-6">
        <CharacterCardSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:flex-1">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      </div>

      <DashboardDataSkeleton />
    </div>
  )
}

/**
 * Skeleton for dashboard data sections below the hero (insights + loot grids).
 * Used when the hero/character card renders immediately from GuildContext
 * while dashboard data is still loading.
 */
export function DashboardDataSkeleton() {
  return (
    <div className="space-y-6">
      {/* Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-5 h-5 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Loot Priority and Received Items Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LootCardSkeleton />
        <LootCardSkeleton />
      </div>
    </div>
  )
}

/**
 * Profile content skeleton
 * Matches the Account tab (default) layout of ProfilePage
 */
export function ProfileContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Card - matches flex-col sm:flex-row layout */}
      <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-7 w-40" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          {/* Logout button: full-width on mobile, auto on desktop */}
          <Skeleton className="h-10 w-full sm:w-28 rounded-[52px]" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-[40px]" />
        ))}
      </div>

      {/* Content - matches Account tab (default) layout */}
      <div className="space-y-6">
        {/* Notifications section - 2 rows to match real content */}
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
          <div className="p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-64" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-72" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </div>
        {/* Battle.net section */}
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56 mt-1" />
          </div>
          <div className="p-4 sm:p-6">
            <Skeleton className="h-4 w-72" />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-4">
              <Skeleton className="h-9 w-24 rounded-[40px]" />
              <Skeleton className="h-9 w-36 rounded-[40px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Attendance stats skeleton for personal stats section
 */
export function AttendanceStatsSkeleton() {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </>
  )
}

/**
 * Submissions list skeleton
 */
export function SubmissionsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SubmissionCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Pending submission card skeleton (larger with more details)
 */
export function PendingSubmissionCardSkeleton() {
  return (
    <div className="p-6 bg-background-elevated border border-border rounded-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-5 h-5 rounded" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-28 rounded-[52px]" />
          <Skeleton className="h-12 w-24 rounded-[52px]" />
        </div>
      </div>
    </div>
  )
}

/**
 * Pending submissions list skeleton
 */
export function PendingSubmissionsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <PendingSubmissionCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Settings card skeleton for Guild Settings page
 */
export function SettingsCardSkeleton() {
  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56 mt-2" />
      </div>
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full rounded-[52px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-12 w-full rounded-[52px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-12 rounded-[52px]" />
            <Skeleton className="h-12 rounded-[52px]" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Guild Settings content skeleton
 */
export function GuildSettingsContentSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SettingsCardSkeleton />
      <SettingsCardSkeleton />
    </div>
  )
}

/**
 * Loot List bracket section skeleton
 */
export function LootListBracketSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Bracket header */}
      <div className="bg-muted/30 border-l-4 border-l-muted px-4 py-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48 mt-1" />
      </div>
      {/* Bracket rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-3 py-2.5">
            <Skeleton className="h-6 w-10 rounded" />
            <Skeleton className="h-10 w-64 rounded-[52px]" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-10 w-64 rounded-[52px]" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Loot List content skeleton - status banner + brackets
 */
export function LootListContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Note: Status banner skeleton is rendered in the sticky header section of loot-list/page.tsx */}
      {/* Brackets */}
      <LootListBracketSkeleton />
      <LootListBracketSkeleton />
      <LootListBracketSkeleton />
      <LootListBracketSkeleton />
    </div>
  )
}

/**
 * Master Sheet boss section skeleton
 */
export function MasterSheetBossSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
      {/* Boss header - matches BossSection: px-5 py-3 with 24x24 icon */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-[15px] w-36" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      </div>
      {/* Rankings table header */}
      <div className="border-t border-border bg-background-subtle px-5 py-2.5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          {Array.from({ length: 5 }).map((_, j) => (
            <Skeleton key={j} className="h-3 w-8" />
          ))}
        </div>
      </div>
      {/* Rankings rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-2.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-4 ml-auto">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-20 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Master Sheet content skeleton - boss nav + boss sections
 */
export function MasterSheetContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Note: Boss navigation skeleton is rendered in the sticky header section of master-sheet/page.tsx */}
      {/* Boss Sections - show 4 to better approximate typical raid tier height */}
      <MasterSheetBossSkeleton rows={5} />
      <MasterSheetBossSkeleton rows={4} />
      <MasterSheetBossSkeleton rows={3} />
      <MasterSheetBossSkeleton rows={4} />
    </div>
  )
}

/**
 * Character form skeleton for Create/Edit Character pages
 */
export function CharacterFormSkeleton() {
  return (
    <div className="min-h-screen bg-background-subtle p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-8 w-16 mb-4" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-64 mt-1" />
        </div>

        {/* Form Card */}
        <div className="bg-background-elevated border border-border rounded-xl p-6">
          <div className="space-y-6">
            {/* Character Name */}
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-12 w-full rounded-[52px]" />
            </div>

            {/* Class */}
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-12 w-full rounded-[52px]" />
            </div>

            {/* Spec */}
            <div>
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-12 w-full rounded-[52px]" />
            </div>

            {/* Main/Alt Toggle */}
            <div>
              <Skeleton className="h-4 w-28 mb-3" />
              <div className="flex gap-3">
                <Skeleton className="h-10 flex-1 rounded-[40px]" />
                <Skeleton className="h-10 flex-1 rounded-[40px]" />
              </div>
              <Skeleton className="h-3 w-full mt-2" />
            </div>

            {/* Info Box */}
            <div className="bg-background-subtle border border-border rounded-lg p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4 mt-1" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8">
            <Skeleton className="h-12 w-40 rounded-[52px]" />
            <Skeleton className="h-12 w-24 rounded-[52px]" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Loot Items admin page skeleton
 */
export function LootItemsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-5 w-56 mt-1" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12 mt-1" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-background-elevated border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="px-4 py-3 border-b border-border bg-muted">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        {/* Table Rows */}
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-6 w-32 rounded" />
                <Skeleton className="h-6 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Raid tracking page skeleton
 * Matches: flex-col sm:flex-row header with Heading level={1} (42px) + SegmentedControl,
 * status legend row, week accordion headers, and raid day cards.
 */
export function RaidTrackingPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* Header - matches flex-col sm:flex-row sm:items-start sm:justify-between gap-4 */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Skeleton className="h-[42px] w-48" />
          <Skeleton className="h-5 w-72 mt-1" />
        </div>
        {/* SegmentedControl: inline-flex rounded-[40px] with two options */}
        <Skeleton className="h-10 w-56 rounded-[40px] self-start" />
      </div>

      {/* Legend row - matches status legend with 4 colored squares + labels */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Skeleton className="h-4 w-12" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-14" />
          </div>
        ))}
      </div>

      {/* Week accordion sections */}
      <div className="space-y-6">
        {/* First week - expanded with raid day cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
            <Skeleton className="h-[24px] w-72" />
            <div className="flex-1 h-[1px] bg-foreground/10" />
          </div>

          {/* Raid day cards (2 per week) */}
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-background-elevated border border-border rounded-xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                  <div>
                    <Skeleton className="h-[18px] w-56" />
                    <Skeleton className="h-4 w-40 mt-1" />
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Skeleton className="h-9 w-28 rounded-[40px]" />
                  <Skeleton className="h-9 w-20 rounded-[40px]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Second collapsed week */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
            <Skeleton className="h-[24px] w-64" />
            <div className="flex-1 h-[1px] bg-foreground/10" />
          </div>
        </div>

        {/* Third collapsed week */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded flex-shrink-0" />
            <Skeleton className="h-[24px] w-60" />
            <div className="flex-1 h-[1px] bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Loot settings page skeleton
 * Matches the Items tab (default) layout of AdminLootItems
 */
export function LootSettingsPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* Header with Tabs and Settings Button */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Skeleton className="h-[42px] w-48" />
          <Skeleton className="h-5 w-72 mt-1" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-10 w-48 rounded-[52px]" />
          <Skeleton className="h-10 w-44 rounded-[52px]" />
        </div>
      </div>

      {/* Stats Grid - 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-12 mt-1" />
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-background-elevated border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-9 w-full rounded-[52px]" />
            </div>
          ))}
        </div>
      </div>

      {/* Item Table Rows */}
      <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0">
            <Skeleton className="w-8 h-8 rounded shrink-0" />
            <Skeleton className="h-4 w-48 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
