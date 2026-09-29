# Phase 08: Primitive Contracts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-17
**Phase:** 08-primitive-contracts
**Areas discussed:** Label/section-heading shape, Modal focus-trap & stacking, Focus ring on Input/Textarea/Select, Skeleton fidelity scope

---

## Label/section-heading shape

| Option | Description | Selected |
|--------|-------------|----------|
| Text component, size sm, weight semibold, secondary color | Reuses existing Text component, no new primitive | ✓ |
| New SectionLabel component, non-uppercase but keeps letter-spacing | Preserves more of current visual rhythm | |
| Heading level=6 (text-base font-medium) | Semantically a heading, larger/heavier | |

**User's choice:** Text component, size="sm" weight="semibold" color="secondary" — no new component.
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| One style everywhere | Same Text props for sidebar and form-section labels | ✓ |
| Sidebar keeps a lighter weight/color variant | Two variants of same component, different props | |

**User's choice:** One style everywhere.
**Notes:** Matches PRIM-02's "exactly one label convention survives" literally.

---

## Modal focus-trap & stacking

| Option | Description | Selected |
|--------|-------------|----------|
| Only the topmost Modal traps | Last-mounted instance installs trap/Escape; lower modals stay inert | ✓ |
| Every open Modal traps independently | Simpler but risks Tab/Escape conflicts across stacked modals | |
| Disallow true stacking — queue instead | Bigger change, touches DashboardContent's open logic, out of PRIM-04's stated scope | |

**User's choice:** Only the topmost Modal traps.
**Notes:** Matches how the existing `zIndex` prop already implies a stacking order.

| Option | Description | Selected |
|--------|-------------|----------|
| Require ModalTitle always; add it to the 3 gaps | JoinGuildModal, OnboardingModal, UpgradeModal each get a ModalTitle (sr-only allowed) | ✓ |
| Optional aria-label prop as a fallback | Modal falls back aria-labelledby → aria-label → dev warning | |

**User's choice:** Require ModalTitle always.
**Notes:** Every modal in the app ends up with a real accessible name, no exceptions.

---

## Focus ring on Input/Textarea/Select

| Option | Description | Selected |
|--------|-------------|----------|
| Exact same ring as Button/Switch | focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background, kept alongside focus:border-accent | ✓ |
| Ring without offset | Ring hugs the border instead of floating a gap outside it | |
| Keep border-color-only, strengthen it | No ring; thicker border on focus instead | |

**User's choice:** Exact same ring as Button/Switch.
**Notes:** One consistent focus language across every focusable primitive.

| Option | Description | Selected |
|--------|-------------|----------|
| Ring is focus-visible-only; border-accent stays on all focus | Keyboard users see border + ring; mouse users see border only | ✓ |
| Both become focus-visible-only | Behavior change — mouse clicks would no longer show border-color change | |

**User's choice:** Ring is focus-visible-only; border-accent stays on all focus.
**Notes:** No behavior change to existing mouse-click border treatment.

---

## Skeleton fidelity scope

| Option | Description | Selected |
|--------|-------------|----------|
| Exactly the 3 named fixes | GuildSettingsContentSkeleton card count, raid-tracking legend swatch count, LootListBracketSkeleton border | ✓ |
| Quick audit of all skeletons.tsx exports | Bounded but wider audit of the ~20 other skeleton exports | |

**User's choice:** Exactly the 3 named fixes.
**Notes:** ROADMAP itself accepts skeleton-to-layout coupling as an ongoing drift risk, to be documented in DESIGN.md (Phase 12) rather than solved exhaustively here.

---

## Claude's Discretion

- Exact `Text` prop values if the chosen shape doesn't render legibly in a specific former `.section-label`/`LabelText` context discovered during implementation.
- Whether the conditional 6th "Signed Up" legend indicator needs its own skeleton placeholder.
- Converting `label.tsx`'s arbitrary pixel sizes to Phase 07's pixel aliases (mechanical, satisfies TYPE-02).

## Deferred Ideas

- A broader audit of `components/ui/skeletons.tsx`'s remaining ~20 skeleton exports for layout drift beyond the 3 named fixes.
