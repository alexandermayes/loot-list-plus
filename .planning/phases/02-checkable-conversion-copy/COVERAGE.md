# Phase 02: API Coverage Decision

No external API integration: this phase ships zero code that calls an external service, so there is no capability surface to subtract from.

## Why the detector fired

`api-coverage.cjs` matched the noun `api` in CONTEXT.md D-04 ("checks each quoted guild's recent activity via the Supabase Management API"). That match is real but it is not an integration.

## What actually happens

The Supabase Management API is called **once, at authoring time**, by the executor during plan `02-01`:

| Capability | Decision | Reason |
|---|---|---|
| `POST /v1/projects/{ref}/database/query` (read-only SELECT) | `INTEGRATE` (authoring-time only) | One aggregate lookup per quoted guild for the D-03 Warcraft Logs URL and the D-04 activity flag. Result is read by a human and hand-typed into static JSX props. |
| Every other Management API capability (projects, branches, secrets, functions, backups, config) | `OPT-OUT` | Out of phase scope. This phase changes copy; it provisions and mutates nothing. |
| Any runtime API surface (new route handler, client fetch, cron, webhook) | `OPT-OUT` | 02-RESEARCH.md "Anti-Patterns to Avoid" explicitly forbids wiring the D-04 activity check as a live component or API route: it would add a runtime surface, an attack surface, and a per-pageview query that no requirement asks for. |

No `app/api/**` route, no client fetch, no new environment variable, and no new dependency is created by this phase. The committed diff contains only static copy.

*Recorded at plan time, 2026-08-28.*
