---
schema_version: 1
open_count: 3
waived_count: 0
fixed_count: 0
total_count: 3
last_updated: 2026-09-04T18:25:03.470Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | quick-260901-hkj | unrun-verify | app/api/cron/sync-discord-premium/route.ts |  | Task 3 human-check not run: trigger the new cron once post-deploy with the CRON_SECRET bearer token and confirm the JSON tally / Server Members Intent log line, per PLAN.md | open |  | 2026-09-01T19:52:10.739Z |  |
| 2 | 03 | unrun-verify | eslint.config.mjs |  | npm run lint (full project) fails with pre-existing config error: rule react-hooks/purity references missing plugin react-hooks (unrelated to plan 03-01; scoped eslint on this plan's files passes clean) | open |  | 2026-09-04T18:24:46.583Z |  |
| 3 | 03 | unrun-verify | app/api/guild-count/route.ts |  | npm run build (full project) cannot complete in this sandbox: pre-existing /api/guild-count route requires SUPABASE_SERVICE_ROLE_KEY at prerender time, not present here; verified instead via successful Turbopack compile and a grep of the emitted server chunk confirming the aggregates JSON binding for this plan's page resolved correctly before the unrelated route failed | open |  | 2026-09-04T18:25:03.470Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "quick-260901-hkj",
    "file": "app/api/cron/sync-discord-premium/route.ts",
    "line": null,
    "description": "Task 3 human-check not run: trigger the new cron once post-deploy with the CRON_SECRET bearer token and confirm the JSON tally / Server Members Intent log line, per PLAN.md",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-01T19:52:10.739Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "eslint.config.mjs",
    "line": null,
    "description": "npm run lint (full project) fails with pre-existing config error: rule react-hooks/purity references missing plugin react-hooks (unrelated to plan 03-01; scoped eslint on this plan's files passes clean)",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T18:24:46.583Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "app/api/guild-count/route.ts",
    "line": null,
    "description": "npm run build (full project) cannot complete in this sandbox: pre-existing /api/guild-count route requires SUPABASE_SERVICE_ROLE_KEY at prerender time, not present here; verified instead via successful Turbopack compile and a grep of the emitted server chunk confirming the aggregates JSON binding for this plan's page resolved correctly before the unrelated route failed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T18:25:03.470Z",
    "resolved_at": null
  }
]
````
