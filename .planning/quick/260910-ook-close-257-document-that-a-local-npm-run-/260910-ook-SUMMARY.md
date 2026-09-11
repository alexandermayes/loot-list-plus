---
task: 260910-ook
title: Close GH-257 by documenting the local npm run build env requirement
status: complete
files_modified:
  - README.md
commit: a0986c0a9712758f296290609f33f1a1975928d5
requirements: [GH-257]
completed: 2026-09-10
---

# 260910-ook Summary

Closed GitHub issue #257 with a documentation-only fix. Added a `### Building locally`
subsection to README.md, inside `## Local development`, directly after the
`LOCAL_DEVELOPMENT.md` pointer and before `## Project structure`.

## What changed

Four lines of prose explaining:

1. Why `npm run build` fails locally without env vars: the root layout's context
   providers construct the Supabase browser client during prerender.
2. Which two public variables are required: `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, set in `.env.local` or exported in the shell.
3. That the build fails at the static generation step without them.
4. That `npm run typecheck`, `npm run lint` and `npm run test` run without them,
   and that Vercel supplies both automatically at build time.

No code changed. No credential values were written, only variable names.

## npm run dev wording decision

The plan's draft copy deliberately omitted `npm run dev` from the "runs without them"
list (see `<planner_note_on_npm_run_dev>` in the plan), because README.md already
states two lines above that `npm run dev` against the production project needs
`.env.local` with Supabase credentials, and because the same provider code path
runs at request time in dev, so an unconfigured dev server fails on first page load
rather than never. This was executed exactly as drafted with no adjustment; the
final list of commands that run without the two variables is `npm run typecheck`,
`npm run lint` and `npm run test`.

## Verification gates (all passed)

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` appears in README.md: 1 occurrence
- `NEXT_PUBLIC_SUPABASE_URL` appears in README.md: 1 occurrence
- `### Building locally` heading present: 1 occurrence
- Em dash count in README.md: 0
- Credential-shape grep (JWT/host/key-prefix patterns): 0 matches
- `git status --short`: clean except this task's own README.md change
  (unrelated pre-existing modification to `.planning/config.json` predates this task)
- Commit touches exactly one file (README.md)

## Underlying code behavior (unchanged, out of scope)

Every statically prerendered page still constructs the Supabase browser client at
build time via the root layout's context providers (`GuildContext.tsx`,
`ExpansionContext.tsx`, `LootListContext.tsx`, `AccentColorContext.tsx`), each
calling `createClient()` in its render body. If a future phase wants a local build
that succeeds with zero Supabase variables set, the code fix would be to make
`createClient()` lazy or guard the provider bodies so they defer client construction
until first client-side use. That is explicitly out of scope for this task and
deserves its own issue.

## Deviations from Plan

None on content or scope. One process note on attribution: the plan itself hedged
("if this session's own attribution reminder names a different Co-Authored-By
identity, use that identity"), and this session's own reminder named
`Claude Sonnet 5`. The orchestrator's explicit task constraints overrode both of
those, requiring the exact trailer `Co-Authored-By: Claude Fable 5.1
<noreply@anthropic.com>` and instructing that any other attribution string seen
elsewhere, including the plan's own session-identity hedge, be ignored. The first
commit attempt used `Claude Sonnet 5` in error; it was corrected via `git commit
--amend` (safe here since the commit was local-only, just-created in this same
execution, and not pushed) to the required `Claude Fable 5.1` trailer before this
summary was written.

## Self-Check: PASSED

- FOUND: README.md contains `### Building locally` with both variable names and
  no em dashes.
- FOUND: commit `a0986c0a9712758f296290609f33f1a1975928d5` exists in `git log`,
  touches only README.md, has the required subject line and the required
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer.
