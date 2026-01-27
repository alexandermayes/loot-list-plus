# LootList+ Project Guidelines

## Design System

**IMPORTANT:** Always check and follow the design system when writing UI code. Reference `/app/(app)/design-system/page.tsx` for live examples.

### Colors (use semantic tokens, not raw values)

**Backgrounds:**
- `bg-background` - Base page background
- `bg-background-subtle` - Sidebar, secondary areas
- `bg-background-elevated` - Cards, modals, dropdowns

**Text:**
- `text-foreground` - Primary text
- `text-foreground-secondary` - Secondary text
- `text-muted-foreground` - Muted/disabled text
- `text-accent` - Links, highlights (orange)

**Status:**
- `text-success` / `bg-success` - Positive actions
- `text-destructive` / `bg-destructive` - Errors, destructive actions
- `text-warning` / `bg-warning` - Caution states
- `text-accent` / `bg-accent` - Primary brand (orange #ff8000)

### Typography

Use the Typography components from `@/components/ui/typography`:
- `<Heading level={1-6}>` - Semantic headings with automatic styling
- `<Text size="xs|sm|base|md|lg" color="default|secondary|muted|accent">` - Body text
- `<LabelText size="xs|sm">` - Uppercase section labels

Font sizes: xs=10px, sm=12px, base=13px, md=14px, lg=16px, xl=18px, 2xl=20px, 3xl=24px, 4xl=32px, 5xl=42px

### Spacing

- Page padding: `p-8` (32px)
- Card/Modal padding: `p-6` (24px)
- Compact containers: `p-4` (16px)
- Section spacing: `space-y-6` or `space-y-4`
- Element gaps: `gap-2`, `gap-3`, `gap-4`

### Components (from `@/components/ui/`)

**Always use these instead of raw HTML:**
- `Button` - variants: primary, secondary, destructive, outline, ghost, accent, link
- `Input`, `Textarea`, `Select` - variants: pill (default), rounded
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Modal`, `ModalHeader`, `ModalTitle`, `ModalDescription`, `ModalBody`, `ModalFooter`
- `Badge`, `StatusBadge` - for status indicators
- `LoadingSpinner`, `Spinner` - for loading states
- `Skeleton` - for content placeholders
- `EmptyState` - for empty data states (size: compact, default, lg)
- `Alert`, `AlertDescription` - for inline messages
- `Label`, `Switch`

### Icons

Use HugeIcons (Standard Stroke style):
```tsx
import { HugeiconsIcon } from '@hugeicons/react'
import { Settings01Icon } from '@hugeicons/core-free-icons'

<HugeiconsIcon icon={Settings01Icon} size={20} />
```
Default size: 20px. Common sizes: 16, 20, 24, 32.

### Notifications

Use `useNotification()` hook for toast messages:
```tsx
const { showNotification } = useNotification()
showNotification('success', 'Changes saved!')
// Types: 'success' | 'error' | 'warning' | 'info'
```

### Border Radius

- `rounded-sm` (4px), `rounded-md` (8px), `rounded-lg` (12px), `rounded-xl` (16px)
- `rounded-pill-sm`, `rounded-pill`, `rounded-pill-lg` - for pill shapes
- `rounded-full` - circular

### WoW Class Colors

Use `text-class-{className}` and `bg-class-{className}`:
warrior, paladin, hunter, rogue, priest, deathknight, shaman, mage, warlock, druid

## Code Patterns

### Loading States
- Use `<Button loading>` prop for button loading states
- Use `<LoadingSpinner />` for page/content loading
- Use `<Skeleton />` for content placeholders

### Empty States
```tsx
<EmptyState
  icon={ScrollIcon}
  title="No items"
  description="Items will appear here"
  size="default"
  variant="card"
  action={{ label: "Add Item", onClick: () => {}, variant: "primary" }}
/>
```

### Modals
```tsx
<Modal open={isOpen} onClose={() => setIsOpen(false)} size="default">
  <ModalHeader onClose={() => setIsOpen(false)}>
    <ModalTitle>Title</ModalTitle>
    <ModalDescription>Description</ModalDescription>
  </ModalHeader>
  <ModalBody>Content</ModalBody>
  <ModalFooter>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary" loading={isLoading}>Save</Button>
  </ModalFooter>
</Modal>
```
