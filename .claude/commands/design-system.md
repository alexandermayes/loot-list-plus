# Design System Audit & Enforcement

Audit the codebase for design system compliance and ensure all UI uses the LootList+ design system components.

## Instructions

Before implementing ANY new feature or modifying UI code, you MUST:

1. **Check the design system** at `/app/(app)/design-system/page.tsx` for available components
2. **Use design system components** instead of raw HTML elements
3. **Create missing components** if a reusable pattern doesn't exist in the design system
4. **Follow the design tokens** defined in CLAUDE.md and the design system

## Design System Components (from `/components/ui/`)

### Layout & Containers
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` - for content containers
- `Modal`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalBody`, `ModalFooter` - for dialogs

### Form Elements
- `Button` - variants: primary, secondary, destructive, outline, ghost, accent, link
- `Input` - variants: pill (default), rounded
- `Textarea` - variants: pill (default), rounded
- `Select` - variants: pill (default), rounded
- `DatePicker` - variants: pill (default), rounded
- `Label` - for form labels
- `Switch` - for toggles
- `SegmentedControl` - for tab-like selection

### Typography
- `Heading` - level={1-6} for semantic headings
- `Text` - size="xs|sm|base|md|lg" color="default|secondary|muted|accent"
- `LabelText` - uppercase section labels

### Feedback & Status
- `Badge`, `StatusBadge` - for status indicators
- `Alert`, `AlertDescription` - for inline messages
- `EmptyState` - for empty data states
- `LoadingSpinner`, `Spinner` - for loading states
- `Skeleton` - for content placeholders

### Icons
```tsx
import { HugeiconsIcon } from '@hugeicons/react'
import { IconName } from '@hugeicons/core-free-icons'

<HugeiconsIcon icon={IconName} size={20} />
```

### Notifications
```tsx
const { showNotification } = useNotification()
showNotification('success' | 'error' | 'warning' | 'info', 'Message')
```

## Common Violations to Check

### Raw HTML to Replace

| Raw HTML | Design System Replacement |
|----------|---------------------------|
| `<button>` | `<Button>` |
| `<input type="text">` | `<Input>` |
| `<input type="date">` | `<DatePicker>` |
| `<textarea>` | `<Textarea>` |
| `<select>` | `<Select>` |
| `<h1>` through `<h6>` | `<Heading level={n}>` |
| `<p>` with styling | `<Text>` |
| `<label>` | `<Label>` |
| Raw modal divs | `<Modal>` components |
| Raw card divs | `<Card>` components |
| Spinner SVGs | `<LoadingSpinner>` or `<Spinner>` |

### Acceptable Raw HTML

Some raw HTML is acceptable when:
- Inside design system components (internal implementation)
- For layout structure (`<div>`, `<section>`, `<nav>`)
- For semantic elements (`<main>`, `<article>`, `<aside>`)
- For tables (`<table>`, `<tr>`, `<td>`) - no table component yet
- For lists (`<ul>`, `<li>`) - for simple lists
- For links that aren't button-styled (`<a>`, `<Link>`)

## Audit Checklist

When auditing, check each file for:

1. **Buttons**: Any `<button>` that should be `<Button>`
2. **Inputs**: Any `<input>` that should be `<Input>` or `<DatePicker>`
3. **Selects**: Any `<select>` that should use the design system
4. **Modals**: Any modal implementation not using `<Modal>`
5. **Cards**: Any card-like UI not using `<Card>`
6. **Typography**: Any styled text not using `<Heading>`, `<Text>`, or `<LabelText>`
7. **Loading States**: Any custom spinners instead of `<LoadingSpinner>`
8. **Empty States**: Any empty state UI not using `<EmptyState>`
9. **Colors**: Any hardcoded colors instead of semantic tokens
10. **Spacing**: Any inconsistent spacing not following the system

## Creating New Components

If you identify a reusable pattern that should be a component:

1. Create it in `/components/ui/` following existing patterns
2. Use CVA (class-variance-authority) for variants
3. Export from the component file
4. Add it to the design system page at `/app/(app)/design-system/page.tsx`
5. Document it in CLAUDE.md under the Components section

## Output Format

When running this audit, produce a report with:

### Summary
- Total files scanned
- Files with violations
- Total violations found

### Violations by Category
For each category (Buttons, Inputs, etc.), list:
- **File**: Path to file
- **Line**: Line number
- **Issue**: What was found
- **Fix**: How to fix it

### Missing Components
List any UI patterns that should be components but aren't:
- **Pattern**: Description of the pattern
- **Occurrences**: Where it appears
- **Recommendation**: Component to create

### Action Items
Prioritized list of fixes needed

## Grep Commands for Quick Checks

```bash
# Find raw buttons (excluding Button component itself)
grep -rn "<button" --include="*.tsx" app/ | grep -v "components/ui" | grep -v ".test."

# Find raw inputs
grep -rn "<input" --include="*.tsx" app/ | grep -v "components/ui" | grep -v ".test."

# Find raw selects
grep -rn "<select" --include="*.tsx" app/ | grep -v "components/ui" | grep -v ".test."

# Find inline color values
grep -rn "text-\[#\|bg-\[#\|border-\[#" --include="*.tsx" app/

# Find hardcoded spacing
grep -rn "p-\[.*px\]\|m-\[.*px\]\|gap-\[.*px\]" --include="*.tsx" app/
```

## Enforcement Rules

**CRITICAL**: When implementing new features:

1. NEVER use raw `<button>` - always use `<Button>`
2. NEVER use raw `<input>` - always use `<Input>` or `<DatePicker>`
3. NEVER use raw `<select>` - always use design system Select
4. NEVER create custom modals - always use `<Modal>`
5. NEVER create custom spinners - always use `<LoadingSpinner>`
6. NEVER hardcode colors - always use semantic tokens
7. ALWAYS check the design system first for existing components
8. ALWAYS create reusable components for patterns used 2+ times
