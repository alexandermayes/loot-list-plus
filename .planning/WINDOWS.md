---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-09-01T19:52:10.739Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | quick-260901-hkj | unrun-verify | app/api/cron/sync-discord-premium/route.ts |  | Task 3 human-check not run: trigger the new cron once post-deploy with the CRON_SECRET bearer token and confirm the JSON tally / Server Members Intent log line, per PLAN.md | open |  | 2026-09-01T19:52:10.739Z |  |

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
  }
]
````
