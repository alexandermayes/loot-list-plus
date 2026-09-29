# Phase 07: Token Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md; this log preserves the alternatives considered.

**Date:** 2026-09-15
**Phase:** 07-token-foundation
**Areas discussed:** Type floor mechanics, Muted + accent contrast, Surface and border ramp, Baselines and rendering

---

## Type floor mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Redefine xs as 11px | One-line change; 137 text-xs uses grow automatically | ✓ |
| Add a new 11px step, leave xs at 10px | Keeps rendering until Phase 09; TYPE-01 could not close | |

| Option | Description | Selected |
|--------|-------------|----------|
| Add pixel aliases alongside | text-11 to text-42 as aliases; codemod maps text-[Npx] to text-N mechanically | ✓ |
| Semantic names only | Invent a name for 15px; codemod needs a mapping table | |
| Pixel names only, drop semantic | Rename the whole scale; largest churn | |

| Option | Description | Selected |
|--------|-------------|----------|
| All to 11px, uniform | Mechanical, one screenshot pass; tuning later | ✓ |
| Case by case now | Chips 11, footer/meta 12, table headers 12 | |
| You decide | Claude picks per site with a stated rule | |

**User's choice:** Redefine xs; pixel aliases; uniform 11px. Moved to next area without further questions.

---

## Muted + accent contrast

| Option | Description | Selected |
|--------|-------------|----------|
| Raise dark muted to L52% | #858585, about 5.2:1 page, 4.9:1 cards | ✓ |
| Raise to L50% | Minimum pass | |
| Merge into one muted token at L63% | Alias to --muted-foreground; loses the tier | |

| Option | Description | Selected |
|--------|-------------|----------|
| Darken light muted to about L42% | About 5:1 on cream | ✓ |
| Leave light mode alone | Accept 4.46:1 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Add --accent-text token | Text-only darker orange in light; alias text-accent to it if clean | ✓ |
| Darken --accent globally | Buttons go browner in light | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Amber --standby, distinct from brand and warning | About 38 92% 50% | ✓ |
| Reuse --warning | Standby and late share yellow | |
| You decide | | |

**User's choice:** all recommended options. Proceeded without further questions.

---

## Surface and border ramp

| Option | Description | Selected |
|--------|-------------|----------|
| Lift cards to about L12% | Page stays deep; cards read on their own | ✓ |
| Darken the page, keep cards | No room below L3% | |
| You decide | | |

| Option | Description | Selected |
|--------|-------------|----------|
| Border L18%, subtle but present | About 1.25:1 vs L12% card; border-strong to about 26% | ✓ |
| Border L22%, promote border-strong | About 1.4:1; border-strong to about 30% | |

| Option | Description | Selected |
|--------|-------------|----------|
| Light: only verify and record | Measure and write down for DESIGN.md | ✓ |
| Tighten light too | Nudge light border darker | |

**Notes:** Computed after the choice: elevated at L12% measures 1.19:1 against the page; the plan tunes to L12 to 13% to clear 1.2:1.

---

## Baselines and rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Puppeteer devDependency | Shared by the baseline script and the Phase 12 CI job | ✓ |
| Separate tools/visual package | Keeps main install lean | |
| Keep out of the project | Scratchpad only | |

| Option | Description | Selected |
|--------|-------------|----------|
| User adds the two public Supabase vars to .env.local | | |
| Public pages only for now | | |
| Other: "I will need you to add them, I don't want to add them myself." | User asked Claude to add them | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Home + Overview dashboard | Most token surface plus the first authenticated screen | ✓ |
| Home + design-system page | Reference page, less representative | |
| Home + Loot list | Densest screen, noisiest diff | |

**Notes:** Claude attempted the append (public URL from the project ref, anon key from the Supabase Management API, names-only presence check, values never printed); the tool-approval classifier blocked the env-file write. Recorded as an open item (D-16) for the plan's first checkpoint.

## Claude's Discretion

- Exact hue/saturation within stated targets, with contrast numbers shown.
- Badge and alert variant-to-token mapping.
- text-accent alias wiring versus a new utility.
- Baseline script shape and file naming.

## Deferred Ideas

- Per-screen chip density tuning after the 11px raise (Phase 09 or milestone C).
- text-accent call-site migration if aliasing is not clean (Phase 10).
- --background-inset deletion (Phase 10).
- Hover surface token review beyond the forced bump (Phase 08 or 11).
- Light-mode border tightening (Phase 12, with DESIGN.md numbers).
