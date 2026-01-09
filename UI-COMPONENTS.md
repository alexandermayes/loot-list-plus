# UI Components Guide

## Overview
This document outlines the reusable UI components available in the LootList+ application.

## Installed shadcn/ui Components

Located in `components/ui/`:

- **Button** - Standardized button with variants (default, destructive, outline, secondary, ghost, link)
- **Card** - Container component with CardHeader, CardContent, CardFooter
- **Badge** - Small status/label indicators
- **Table** - Styled table components
- **Skeleton** - Loading placeholders
- **Alert** - Notification/message displays

## Custom Components

### LoadingSpinner (`components/ui/loading-spinner.tsx`)
A centralized loading spinner component.

**Usage:**
```tsx
import { LoadingSpinner } from '@/components/ui/loading-spinner'

// Full screen loading
<LoadingSpinner fullScreen />

// Inline loading
<LoadingSpinner className="w-6 h-6" />

// With text
<LoadingSpinner text="Loading data..." />
```

### EmptyState (`components/ui/empty-state.tsx`)
Displays when there's no data to show.

**Usage:**
```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { Calendar } from 'lucide-react'

<EmptyState
  icon={Calendar}
  title="No raids yet"
  description="Create your first raid to start tracking"
  action={{
    label: "Create Raid",
    onClick: () => createRaid()
  }}
/>
```

### PageHeader (`components/ui/page-header.tsx`)
Consistent page header with optional back button and action.

**Usage:**
```tsx
import { PageHeader } from '@/components/ui/page-header'

<PageHeader
  title="Attendance Tracking"
  description="Optional subtitle"
  showBack
  backUrl="/dashboard"
  action={{
    label: "+ New Raid",
    onClick: () => setShowForm(true),
    variant: "default"
  }}
/>
```

### ActionCard (`components/ui/action-card.tsx`)
Clickable card for dashboard actions.

**Usage:**
```tsx
import { ActionCard } from '@/components/ui/action-card'
import { ClipboardList } from 'lucide-react'

<ActionCard
  title="My Loot List"
  description="Submit or edit your rankings"
  icon={ClipboardList}
  iconColor="bg-primary"
  onClick={() => router.push('/loot-list')}
/>
```

### StatusBadge (`components/ui/status-badge.tsx`)
Pre-configured badge for loot submission statuses.

**Usage:**
```tsx
import { StatusBadge } from '@/components/ui/status-badge'

<StatusBadge status="approved" />
<StatusBadge status="pending" />
<StatusBadge status="needs_revision" />
<StatusBadge status="rejected" />
<StatusBadge status="draft" />
```

## Icon Library

All icons are from `lucide-react`. Common icons used:

```tsx
import {
  Loader2,      // Loading spinner
  ArrowLeft,    // Back button
  LogOut,       // Sign out
  Clock,        // Deadlines
  ClipboardList,// Loot lists
  FileBarChart, // Analytics/sheets
  Settings,     // Admin
  ClipboardCheck,// Attendance
  Calendar,     // Events
  ExternalLink  // External URLs
} from 'lucide-react'
```

## Design System

### Color Variables
All components use CSS variables for theming:

- `bg-background` - Main background
- `bg-card` - Card backgrounds
- `bg-primary` - Primary accent
- `text-foreground` - Primary text
- `text-muted-foreground` - Secondary text
- `border-border` - Border colors

### Common Patterns

**Card with Header:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

**Button Variants:**
```tsx
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="ghost">Subtle Action</Button>
<Button variant="destructive">Delete</Button>
```

**Loading States:**
```tsx
if (loading) return <LoadingSpinner fullScreen />
```

**Empty States:**
```tsx
{items.length === 0 ? (
  <EmptyState
    icon={Icon}
    title="No items"
    description="Description text"
  />
) : (
  // Render items
)}
```

## Migration Guide

To update an existing page:

1. **Replace loading spinners:**
   - Old: `<div className="w-8 h-8 border-2 ...animate-spin"></div>`
   - New: `<LoadingSpinner fullScreen />`

2. **Replace empty states:**
   - Old: `<div className="text-center">No data</div>`
   - New: `<EmptyState icon={Icon} title="No data" />`

3. **Replace cards:**
   - Old: `<div className="bg-card border border-border rounded-xl p-6">...</div>`
   - New: `<Card>...</Card>`

4. **Replace buttons:**
   - Old: `<button className="px-4 py-2 bg-primary...">Click</button>`
   - New: `<Button>Click</Button>`

5. **Replace badges:**
   - Old: `<span className="px-2 py-1 rounded...">Badge</span>`
   - New: `<Badge>Badge</Badge>`

## Best Practices

1. **Always use LoadingSpinner** instead of creating custom spinners
2. **Use EmptyState** for all "no data" scenarios
3. **Use Button component** with appropriate variants instead of styled divs
4. **Use Card components** for content containers
5. **Import icons from lucide-react** consistently
6. **Use CSS variables** for colors instead of hardcoded values

## Examples

See the following files for complete examples:
- `app/dashboard/page.tsx` - ActionCards, Cards, Badges
- `app/attendance/page.tsx` - PageHeader, EmptyStates, LoadingSpinner
