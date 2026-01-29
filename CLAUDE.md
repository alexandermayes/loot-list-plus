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
- `Badge`, `StatusBadge`, `ClassificationBadge` - for status indicators
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

Tailwind utilities: `text-class-{className}` and `bg-class-{className}`:
warrior, paladin, hunter, rogue, priest, deathknight, shaman, mage, warlock, druid

**Character names** - Color with class color directly (preferred over separate class badges):
```tsx
<span style={{ color: character.class?.color_hex }}>
  {character.name}
</span>
```

### Badges

**StatusBadge** - For submission/attendance statuses:
```tsx
<StatusBadge status="pending" />
<StatusBadge status="approved" />
// Statuses: approved, pending, needs_revision, rejected, draft, attended, late, benched, no_show, signed_up, excused
```

**ClassificationBadge** - For loot item classifications:
```tsx
<ClassificationBadge classification="Reserved" />
<ClassificationBadge classification="Limited" />
<ClassificationBadge classification="Unlimited" />
<ClassificationBadge classification="Reserved" compact /> // Single letter version
// Classifications: Reserved (1pt, red), Limited (1pt, orange), Unlimited (0pt, green)
```

**Dynamic color badges** - When you need a badge with a dynamic color (not a StatusBadge):
```tsx
// Use semi-transparent background with colored text for readability
<span
  className="px-2.5 py-0.5 rounded-full text-xs font-semibold border"
  style={{
    backgroundColor: `${colorHex}20`,
    color: colorHex,
    borderColor: `${colorHex}40`
  }}
>
  {label}
</span>
```

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

## Content Design

**Voice:** Sound like the guild officer who has their shit together: knowledgeable, direct, and fair. Speak gamer fluently without trying too hard.

### Principles

- **Clarity first** - Raiders scan between pulls. They need to grok it instantly.
- **Be specific about numbers** - Never vague about scores, points, or rankings
- **Confident but not arrogant** - Technical when needed, plain when possible
- **Never corporate, never cringe** - No marketing hype, no excessive slang

### What to Avoid

- Em dashes (use commas or periods instead)
- Excessive Gen Z slang (no "slay," "bestie," "no cap")
- Marketing hype ("revolutionary," "game-changing")
- Condescension (assume users understand WoW)
- Exclamation points in errors or bad news

### Capitalization

**Sentence case by default.** Reserve capitals for:
- Proper nouns: LootList+, Discord, WoW
- Branded terms: Loot Score, Master Sheet
- Role names: Officer, Guild Master, Trial

**WoW terms:** Follow Blizzard conventions:
- Class/spec names: lowercase (warrior, holy, balance)
- Raid names: capitalized (Firelands, Blackwing Descent)
- Item names: as displayed in-game

### Numbers

Always use figures in UI (not spelled out):
- `50 items` not "fifty items"
- `4-week window` not "four-week window"
- `+1 bonus` not "plus one bonus"

| Element | Format | Example |
|---------|--------|---------|
| Scores | Plain number | 58 |
| Rankings | #N or Nth | #1, 2nd priority |
| Attendance | X/Y or X pts | 6/8 pts |
| Modifiers | +N or -N | -1 (trial penalty) |
| Percentages | N% | 87% attendance |

### Punctuation

- **No Oxford comma** in simple series: "Ranking, attendance and modifiers"
- **Apostrophes:** "the raider's score" / "the officers' decision" / "DKPs" (no apostrophe for plurals)
- **Exclamation points:** Max one per screen, only for celebrations ("Grats!")

### CTAs (Calls to Action)

Start with a verb. Be specific about what happens.

| Weak | Better | Best |
|------|--------|------|
| Submit | Save list | Save and notify officers |
| OK | Got it | View my score |
| Cancel | Go back | Keep editing |
| Yes | Confirm | Remove item |

**Destructive actions:** Be explicit ("Delete list" not "Remove"), restate in confirm dialogs.

### Error Messages

Every error should say: what happened + what to do about it.

| Vague | Specific |
|-------|----------|
| Error | Couldn't load your loot list. Check your connection. |
| Invalid input | Item names must match the WoW database. Check spelling. |
| Something went wrong | Sync failed. Your changes are saved locally. |
| Try again later | Server maintenance until 3:00 PM PST. |

### Empty States

Guide users to the next action:
- "No items ranked yet. Time to hit the loot tables."
- "No raids logged yet. Your score updates after first pull."
- "Looking empty in here. Invite your guildies to get started."

### Success Messages

Brief confirmation with a little personality:
- "List saved. You're locked in."
- "Attendance synced. Looking good."
- "Item added to position #12"
- "Grats! You won the roll."

### Confirmation Dialogs

State the action, the consequence, then the options:
```
Title: Remove Dragonwrath from your list?
Body: This will move all items below it up one rank.
Primary: Remove item
Secondary: Keep item
```

### LootList+ Terminology

**Branded terms (capitalize):**
- **Loot Score** - Combined number from ranking + attendance + modifiers
- **Loot List** - A raider's ranked item list (up to 50 items)
- **Master Sheet** - Compiled view of all raiders' lists

**Common terms (lowercase):**
- attendance, attendance points, ranking, priority
- modifier, bonus, penalty, override
- sick day, excused absence

### WoW Lingo (Use Sparingly)

Fair game in the right context:
- grats, guildies, bis, prog, parse, pug, pull

Avoid deeper cuts casual raiders might not know: pumper, sweaty, zug.

### Content Checklist

Before shipping UI copy:
- [ ] Is every word necessary?
- [ ] Can a raider understand this between pulls?
- [ ] Numbers formatted consistently?
- [ ] Sentence case (not Title Case)?
- [ ] No em dashes?
- [ ] No marketing hype or cringe slang?
- [ ] CTA clearly states what happens?
- [ ] Error messages specific and actionable?
