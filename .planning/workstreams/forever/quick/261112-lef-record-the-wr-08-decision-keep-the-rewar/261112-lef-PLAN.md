---
phase: quick-261112-lef
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [04-WR-08]
must_haves:
  truths:
    - "04-CONTEXT.md D-17 records that every new guild starts with the six officer-bonus flags off, a change from the column defaults, for every game"
    - "04-REVIEW.md WR-08 carries the owner's decision and the fix-status note no longer lists it as open"
    - "The CreateGuildModal comment no longer says the default preset changes nothing"
    - "No behaviour change: the preset values, POST /api/guilds and every test stay as they are"
---

# Quick 261112-lef: Record the WR-08 decision

<objective>
The owner chose option (b) for review finding WR-08: keep the Reward attendance preset as it is and record under D-17 that every new guild starts with officer bonuses off. Write that down where the next reader looks (`04-CONTEXT.md`, `04-REVIEW.md`), correct the one code comment the finding named, and change nothing else.
</objective>

<context>
- Finding: `04-REVIEW.md` WR-08, left as "Not fixed (owner decision)" by quick task 261111-kgu with options (a) and (b).
- Decision text: `04-CONTEXT.md` holds the earlier D-17 amendment under "Clarifications after research"; the new one goes in its own dated subsection so the owner's decision is not mixed with the orchestrator's clarifications.
- Code: `app/components/CreateGuildModal.tsx` (the "changes nothing" comment). `domain/guild/loot-style-presets.ts` stays as it is; its comment already says the six flags differ from the column defaults.
- Wording to check while the flag is off: `app/(app)/loot-management/components/PriorityListTab.tsx` and `app/components/ScoreBreakdownModal.tsx`.
</context>

<tasks>

<task id="1" branch="fix/wr-08-create-guild-default-comment">
Replace the `CreateGuildModal` comment so it says the default preset turns the six officer-bonus flags off and that the owner kept that (D-17, WR-08). Comment only. Lint the file, typecheck, run the component and preset tests.
</task>

<task id="2" branch="gsd/quick-261112-lef-record-the-wr-08-decision-keep-the-rewar">
Add a "Decision after code review (2026-11-12, owner)" subsection to `04-CONTEXT.md` with the D-17 amendment; add a "Decision" block under WR-08 in `04-REVIEW.md` and update its fix-status note; record the wording check; STATE.md row and last activity.
</task>

</tasks>

<verification>
- `grep -n "changes nothing" app/components/CreateGuildModal.tsx` finds nothing on the code branch.
- `04-CONTEXT.md` has one "D-17 amended (review finding WR-08)" entry; `04-REVIEW.md` WR-08 has one "Decision (2026-11-12, owner)" block.
- `npx eslint app/components/CreateGuildModal.tsx` clean; `npm run typecheck` clean; `npx vitest run app/components domain/guild` green.
</verification>
