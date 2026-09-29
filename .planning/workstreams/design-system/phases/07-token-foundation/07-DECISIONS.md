# Phase 07 (Token Foundation) — Decisions

Recorded 2026-09-15. This file is the single record of the open-item resolutions, the measured baseline the resolutions were computed against, the planner-resolved items carried forward from Task 2's diff plan, and (once granted) the go-ahead required by ROADMAP Hard Constraint 2 before any source file in this phase is edited.

## Resolutions

OI-1 RESOLVED: option-b
    User selected Option B (planner default): dark card at `228 12% 13%`, dark muted text at `0 0% 53%`. Real margin on every floor (page vs card 1.223, muted vs card 4.601, muted vs page 5.625, muted vs sidebar 5.462) and the card lightness stays the integer D-09 named, over Option A's 0.006 margins riding on a fractional lightness value.
OI-2 RESOLVED: option-a
    User selected Option A (planner default): light `--accent-text` at `30 100% 36%`, exactly as D-06 names it. Meets COLOR-01 and ROADMAP criterion 2 as written (4.613 against the white card, up from 3.093 today) with the smallest identity shift from the current light accent. Accepted as carried-forward, recorded finding: accent text on the cream page (4.344) and the sidebar (4.066) remain under 4.5, because the requirement says "on white" and this phase does not chase the darker Option B value to close that gap.
OI-3 RESOLVED: accept-and-record
    User selected accept-and-record (planner default): lifting the card surface lowers every dark text ratio by about 0.55, and three tokens the user did not ask this phase to touch cross the 4.5 line as a result: `--destructive`, `--error` and `--horde` move from 4.910 to 4.360 against the card. Accepted so the phase changes only the token families the user approved (D-04 to D-10); the drop is recorded here and carried forward into DESIGN.md in Phase 12, with `--horde` also tracked against Phase 10's COLOR-04 requirement.
OI-6 RESOLVED: user-shell-export
    User selected user-shell-export (planner default): the user exports `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in their own terminal and runs `npm run dev` there on `http://localhost:3100`. Next.js reads `NEXT_PUBLIC_*` from the process environment, so no file is written, no value enters the agent transcript, and the agent only needs the server to answer on that port; the agent never reads, writes or prints either value.

## Measured baseline at plan time

Every ratio below was computed during planning with the WCAG 2.x relative-luminance formula over the HSL triplets currently in `app/globals.css` (sRGB linearize, weighted sum, `(L1+0.05)/(L2+0.05)`). They are the numbers the checkpoints present and the numbers the Plan 04 test reproduces. Fixed reporting order: page, card, inset, border, border-strong, hover, muted text, accent text, standby.

DARK, current values (`--background` 230 18% 3%, `--background-elevated` 228 12% 8%, `--background-inset` 228 12% 10%, `--border` 0 0% 10%, `--border-strong` 0 0% 22%, `--muted` 0 0% 12%, `--foreground-muted` 0 0% 40%):

| pair | current | floor |
|------|---------|-------|
| page vs card | 1.086 | 1.2 (COLOR-02) |
| card vs inset | 1.044 | recorded only |
| border vs card | 1.062 | 1.2 (COLOR-02) |
| border-strong vs card | 1.587 | recorded only |
| border vs border-strong | 1.494 | recorded only |
| hover surface vs card | 1.122 | recorded only |
| muted text vs page | 3.512 | 4.5 (COLOR-01) |
| muted text vs card | 3.235 | 4.5 (COLOR-01) |
| muted text vs sidebar | 3.411 | 4.5 (COLOR-01) |
| muted text vs hover surface | 2.884 | recorded only |

LIGHT, current values (`--background` 35 33% 97%, `--background-elevated` 0 0% 100%, `--background-subtle` 35 20% 94%, `--background-inset` 35 25% 96%, `--border` 35 12% 82%, `--foreground-muted` 25 6% 45%, `--accent` 30 100% 45%):

| pair | current | floor |
|------|---------|-------|
| page vs card | 1.062 | recorded only (D-11) |
| card vs inset | 1.086 | recorded only (D-11) |
| page vs inset | 1.022 | recorded only (D-11) |
| border vs card | 1.504 | recorded only (D-11) |
| muted text vs page | 4.467 | 4.5 |
| muted text vs card | 4.743 | recorded only |
| muted text vs sidebar | 4.181 | recorded only |
| accent text vs card (white) | 3.093 | 4.5 (COLOR-01) |

## Planner-resolved items

These items carry no locked-decision conflict and no open user choice; they are recorded here for confirmation at Task 2 rather than decision at Task 1, so this file remains the single record of the whole diff plan.

OI-4: Dark `--input` follows `--border` at `0 0% 18%` rather than the card value. Its single consumer is `components/ui/switch.tsx` line 19 as the unchecked track fill (`data-[state=unchecked]:bg-input`) sitting on a card; the card value would render that track at 1.004 against its container while 18 percent renders it at 1.213. `components/ui/input.tsx` does not reference the token at all, contrary to what D-10 assumed.

OI-5: Dark `--muted` moves to `0 0% 16%`, which restores the pre-phase hover-to-card ratio (1.122 before, 1.131 after) rather than inventing a new floor.

OI-7: The badge and alert mapping is `pending` and `late` onto `--warning`, `needs_revision` and `benched` onto `--standby`, with `approved`, `attended`, `rejected`, `no_show`, `draft`, `excused` and `signed_up` untouched because they are already token-clean.

OI-8: Because the pixel aliases carry a line-height per D-02, raising a sub-11px site also sets line-height 1.5 where the arbitrary class previously inherited it, so vertical rhythm changes on chip-heavy screens. This is the intended density change D-03 acknowledges, and the screenshot review is where it is judged.

OI-9: The sub-11px inventory is 109 occurrences across 26 files, not the 108 across 22 recorded in RESEARCH.md, because `app/globals.css` line 571 carries `@apply text-[10px]` inside `.section-label`. That one moves to the 11px alias here while the class itself is deleted in Phase 08.

OI-10: The `text-accent` override must be an object carrying `DEFAULT`, `foreground` and `subtle`, not a bare string, because `text-accent-foreground` is used 9 times and a flat string would stop those 9 sites resolving.

## Go-ahead

GO-AHEAD: approved 2026-09-16 by Alexander Mayes
PUPPETEER-24.43.1: approved
No changes requested. The user approved the complete diff plan (file list, token table, contrast table, six planner-resolved items) and the puppeteer 24.43.1 legitimacy evidence together, exactly as presented.

## Amendments

OI-6 AMENDED 2026-09-16: at the user's request during Phase 07 execution, the orchestrator supplied the two public Supabase variables and started the dev server itself instead of the user exporting them in their own shell. NEXT_PUBLIC_SUPABASE_URL was derived from the project ref already committed in package.json, and NEXT_PUBLIC_SUPABASE_ANON_KEY was written into the gitignored .env.local through a Supabase CLI to file pipe; neither value was printed, read back or placed in the agent transcript, and the OI-6 privacy intent (no value enters the transcript, no value is committed) still holds. Plans 02 and 06 assert the dev server precondition with a read-only HTTP check exactly as before.

OI-6 AMENDMENT NOTE 2026-09-16: the first key written was the legacy anon JWT, which this Supabase project has disabled (auth answered 401 "Legacy API keys are disabled"), producing a client sign-out redirect loop on Home. It was replaced through the same CLI to file pipe with the project's current publishable key (sb_publishable prefix); still no value printed, read back or committed.
