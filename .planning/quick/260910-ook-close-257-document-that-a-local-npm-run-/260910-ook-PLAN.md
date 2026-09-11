---
phase: quick-260910-ook
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
autonomous: true
requirements: [GH-257]

estimate:
  tokens: 16000
  raw_tokens: 8000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "A developer reading README.md's Local development section learns that a local `npm run build` needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and why (prerender constructs the Supabase browser client)."
    - "The same note tells the developer which commands run without those variables, and that Vercel supplies them automatically."
    - "No credential value of any kind appears in README.md, only variable names."
    - "README.md still contains zero em dash characters."
  artifacts:
    - "README.md (modified, new `### Building locally` subsection)"
  key_links:
    - "The note lives inside `## Local development` (line 49), immediately after the LOCAL_DEVELOPMENT.md pointer and before `## Project structure`, so a developer setting up locally reads it in the same pass."
---

<objective>
Close GitHub issue #257 by documenting, not code-changing, the build-time environment requirement that makes a local `npm run build` fail.

Purpose: quick task 260910-oaz (commit `3cf9a3b`) fixed the first failure point (`/api/guild-count` prerendering against the service-role client). The build now advances to "Generating static pages" and fails on the first static page with `@supabase/ssr: Your project's URL and API key are required to create a Supabase client!`. Root cause: `app/layout.tsx` wraps every page in client context providers (`app/contexts/GuildContext.tsx:183`, `ExpansionContext.tsx:43`, `LootListContext.tsx:142`, `AccentColorContext.tsx:103`) that each call `createClient()` from `utils/supabase/client.js` in their render body, which calls `createBrowserClient(...)` during server-side prerender. Every statically prerendered page therefore needs the two public Supabase variables at build time. Vercel supplies them; a bare local checkout does not.

The user chose the documentation fix over a code change. Issue #257 itself lists "document required env vars for local builds in README" as an acceptable resolution.

Output: a short `### Building locally` subsection in README.md and one atomic commit.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@README.md
@.planning/quick/260910-oaz-fix-258-repo-wide-npm-run-lint-fails-on-/260910-oaz-SUMMARY.md

Facts already established (do not re-derive):
- README.md `## Local development` starts at line 49. The section ends with `See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for details.` (line 67). `## Project structure` starts at line 69.
- README.md already uses `###` subheadings (`### For raiders` line 12, `### For officers` line 19), so `###` is the correct level for a subsection under `## Local development`.
- Baseline em dash count in README.md is 0, confirmed at plan time against both the working tree and `git show HEAD:README.md`. The gate is therefore an absolute "must stay 0", no before/after diffing needed.
</context>

<hard_boundaries>
These are locked user constraints, not suggestions:

1. **Do NOT read, create, open, or modify `.env.example` or `.env.local`.** The user declined access to those files. The README note may reference `.env.local` by name in prose only.
2. **Never write a credential value.** Variable NAMES only. No project URL, no key, no partial or example value, no placeholder that looks like a real value.
3. **No em dash characters anywhere** in README.md or in the commit message. Use a comma, a period, or the word "and".
4. **No code changes.** This plan touches README.md and nothing else. If a code fix looks tempting while executing, do not make it.
</hard_boundaries>

<copy_draft>
Starting point for the note, not gospel. Per CLAUDE.md the developer may adjust the wording, provided every required content item in the task's `<action>` still lands. This is repository developer documentation, not user-facing site copy, so the sprint copy sign-off gate does not apply.

```markdown
### Building locally

`npm run build` prerenders pages, and the root layout's context providers construct the Supabase browser client during that prerender. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, or export them in your shell, or the build fails at "Generating static pages". Both are public values that ship to the browser anyway, not secrets. `npm run typecheck`, `npm run lint` and `npm run test` run without them. Vercel builds supply them automatically.
```
</copy_draft>

<planner_note_on_npm_run_dev>
The task brief listed `npm run dev` among the commands that "do not need them". The draft above deliberately omits `npm run dev` from that list, for two reasons:

1. README.md line 51 and line 58 already state that `npm run dev` against the production project requires a `.env.local` with Supabase credentials. Listing dev as not needing them would contradict the README seven lines earlier.
2. It would not be true. The same provider code path runs in dev at request time, so a dev server with no Supabase variables throws the same error on first page load. It fails later, not never.

Shipping the list as typecheck, lint and test keeps the note accurate and preserves the brief's actual intent, which is to separate "commands that need the variables" from "commands that do not". If the user wants `npm run dev` named explicitly, the honest phrasing is that dev needs them too, as the section above already says. Flag rather than silently write the stronger claim.
</planner_note_on_npm_run_dev>

<tasks>

<task type="auto">
  <name>Task 1: Document the public Supabase variables a local build needs (GH-257)</name>
  <files>README.md</files>
  <read_first>README.md lines 49 to 69, to confirm the anchor line and the surrounding tone before editing.</read_first>
  <action>
Insert a new `### Building locally` subsection into README.md using the Edit tool, anchored on the existing line `See [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) for details.` The new subsection goes directly after that line and before the `## Project structure` heading, separated by blank lines, so it closes out the Local development section. Use heading level `###` to match `### For raiders` and `### For officers` elsewhere in the file. Do not touch any other part of README.md.

The note is 3 to 6 lines of prose under the heading and must convey all five of these points, in the plain declarative tone the rest of the section uses:
  1. `npm run build` prerenders pages, and the root layout's context providers construct the Supabase browser client during that prerender. This is the reason, and it must be stated, not just the requirement.
  2. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set in `.env.local`, or exported in the shell, for a local build to finish. Both variable names must appear verbatim.
  3. Without them the build fails at the static generation step.
  4. `npm run typecheck`, `npm run lint` and `npm run test` run without them. See the planner note above on why `npm run dev` is not in this list.
  5. Vercel builds supply these automatically, so this is a local-checkout concern only.
Optionally add one short sentence noting that both are public values that ship to the browser anyway, rather than secrets. `<copy_draft>` above is a usable starting point.

Write variable names only. Do not write any actual key, host, token, project reference, or example-shaped value into the file, and do not open, read or edit `.env.example` or `.env.local` to look one up. Do not use any em dash character; use a comma, a period, or the word "and" instead.

Then commit README.md alone, with this exact subject line:
  docs(build): note the public Supabase vars a local npm run build needs (#257)
and the trailer line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. If this session's own attribution reminder names a different Co-Authored-By identity, use that identity with the same subject line.
  </action>
  <verify>
    <automated>grep -c 'NEXT_PUBLIC_SUPABASE_ANON_KEY' README.md</automated>
    <automated>grep -c 'NEXT_PUBLIC_SUPABASE_URL' README.md</automated>
    <automated>grep -c '### Building locally' README.md</automated>
    <automated>grep -c '—' README.md || true</automated>
    <automated>grep -cEi 'eyJ[A-Za-z0-9_-]{10,}|[a-z0-9]{16,}\.supabase\.co|sb_(secret|publishable)_' README.md || true</automated>
    <automated>git status --short</automated>
    <automated>git show --stat --format='%s%n%b' HEAD</automated>
  </verify>
  <done>
- First three greps each return at least 1.
- The em dash grep returns 0. Note that `grep -c` exits 1 when the count is 0, so the `|| true` suffix is required; read the printed number, not the exit code.
- The credential-shape grep returns 0.
- `git status --short` shows a clean tree with no modification to `.env.example`, `.env.local`, `.gitignore`, or any file under `app/`, `utils/`, or `contexts/`.
- `git show --stat` shows exactly one commit touching exactly one file (README.md), with the required subject line and a Co-Authored-By trailer.
- Reading README.md lines 49 to 75 back, the new subsection sits inside `## Local development`, above `## Project structure`, and does not contradict the `.env.local` guidance already on lines 51 and 58.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo working tree to git history | Anything committed to README.md is permanent and distributed to everyone with repo access. A pasted secret cannot be unpublished by a later edit. |
| local env files to documentation | `.env.local` holds real credentials. Documentation must reference variable names across this boundary, never values. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ook-01 | Information Disclosure | README.md | high | mitigate | Variable names only, enforced two ways: `<hard_boundaries>` forbids opening `.env.example` and `.env.local` at all, and the task's credential-shape grep (JWT prefix, project URL host, Supabase key prefixes) must return 0 before the commit is accepted. |
| T-ook-02 | Information Disclosure | anon key framing | low | accept | The note states the anon key is public and browser-shipped. That is accurate: it is a publishable key protected by row level security, and the codebase already ships it to every browser via `NEXT_PUBLIC_*`. Documenting its name discloses nothing not already public. |
| T-ook-SC | Tampering | package installs | n/a | accept | No package manager install occurs in this plan. No legitimacy gate required. |
</threat_model>

<verification>
1. `grep -n 'Building locally' README.md` shows the heading inside the Local development section, between line 67 and the `## Project structure` heading.
2. Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` appear verbatim in README.md.
3. `grep -c '—' README.md || true` prints 0 (baseline was 0).
4. The credential-shape grep prints 0.
5. `git log --oneline -1` shows exactly one new commit, README.md only.
6. `npm run typecheck` and `npm run lint` are not required, since no code changed. Do not run them.
</verification>

<success_criteria>
- A developer who clones the repo and runs `npm run build` with no Supabase variables set can find, in README.md, both the cause and the fix without opening a GitHub issue.
- Zero code files changed.
- Zero credential values committed.
- Zero em dash characters in README.md.
- GitHub issue #257 is closeable on the documentation path the user chose.
</success_criteria>

<output>
Create `.planning/quick/260910-ook-close-257-document-that-a-local-npm-run-/260910-ook-SUMMARY.md` when done.

Record in the summary:
- Whether the `npm run dev` wording question (see `<planner_note_on_npm_run_dev>`) was resolved as planned or adjusted by the user.
- That the underlying code behavior is unchanged: every statically prerendered page still constructs the Supabase browser client at build time. If a future phase wants a build that works with no Supabase variables at all, the code fix is to make `createClient()` lazy or guard the provider bodies. That is explicitly out of scope here and deserves its own issue.
</output>
