# Anthropic Haiku migration

The web feedback route and Discord bot now default to
`claude-haiku-4-5-20251001`. Haiku 3.5 was retired on February 19, 2026.
The replacement is listed as active in Anthropic's
[model lifecycle documentation](https://platform.claude.com/docs/en/about-claude/model-deprecations).

## Request compatibility

All four calls use the direct `/v1/messages` endpoint, the `2023-06-01`
API version, and one user message. Output budgets remain 100 tokens for
titles, 20 for duplicate detection, and 1500 for help answers/article drafts.
There are no sampling parameters, assistant prefills, tools, or enabled
extended thinking to migrate. No Anthropic SDK upgrade is required.

Existing title validation, duplicate candidate validation, and human-help
fallbacks remain in place. HTTP title-generation failures now log a warning
with the status code; they do not log response bodies, prompts, or keys.
An accepted feedback submission alone does not prove Claude succeeded.

## Deployment checklist

- Deploy the updated web app and the separate Railway Discord bot service.
  Updating the web app does not update the running bot.
- Keep `ANTHROPIC_API_KEY` server-only and configured independently in each
  environment where AI features should run. This migration does not require
  changing or rotating that key.
- On the bot, inspect `HELP_MODEL`. If it selects the retired model, remove
  the override to use the new default, or set it to
  `claude-haiku-4-5-20251001`. Restart/redeploy after changing it: the bot reads
  this override at module initialization. Other intentional supported-model
  overrides remain supported.
- Titles and duplicate detection use the pinned code model, not `HELP_MODEL`.
- Verify environment scope: a production key does not automatically enable
  AI behavior in preview. Use an appropriate test key/environment for live
  smoke tests rather than copying production credentials into local files.

## Verification before closing the incident

Run `npm test -- discord-bot/anthropic.test.mjs discord-bot/help.test.mjs
discord-bot/interactions.test.mjs app/api/feedback/route.test.ts`.
These tests mock outbound requests and verify model IDs, request shapes,
successful responses, and fallback behavior; they do not verify live account
access or model output quality.

In a controlled test deployment/channel, verify:

1. In-app feedback and Discord feedback both get a generated title rather
   than a truncated description.
2. A clear duplicate matches an existing candidate; a distinct report does
   not match. Inspect the upstream result as well as the downstream action.
3. `/help` answers a known question using the expected model; a novel answer
   still parses into a draft, and an unsupported question defers to a human.
4. Logs show no Anthropic HTTP failures. Confirm the deployed commit and bot
   effective model; successful feedback delivery can conceal an AI failure.

## Attributing a retirement alert

A key label is not a service identity. This repository historically used
Anthropic title generation with Linear, before switching feedback filing to
GitHub. That history can explain a Linear-themed key label, but cannot alone
attribute a particular request.

Compare masked key metadata privately, then correlate the alert's UTC window
with web and bot logs and their deployed revisions. Check other consumers of
the same key if no request-level evidence is available. Do not copy key values
or private alert contents into issues, pull requests, logs, or this document.
An absent log match is inconclusive: older code silently ignored non-2xx title
responses, and log retention may have expired. Keep request attribution open
until corroborated; a repository patch is not evidence that every consumer
has migrated.
