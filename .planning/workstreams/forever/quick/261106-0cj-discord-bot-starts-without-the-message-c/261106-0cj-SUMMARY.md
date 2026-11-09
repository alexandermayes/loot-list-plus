---
phase: quick-261106-0cj
plan: 01
subsystem: discord-bot
tags: [discord, intents, feedback-bot]
status: complete
completed: 2026-11-06
requires: []
provides:
  - Bot logs in without the privileged Message Content intent by default
  - Opt-in DISCORD_MESSAGE_CONTENT_INTENT=true restores the intent with no code change
  - Reactions on messages the bot cannot read still file issues
key-files:
  created:
    - discord-bot/message-content.js
    - discord-bot/message-content.test.mjs
  modified:
    - discord-bot/bot.js
    - discord-bot/feedback.js
decisions:
  - "Message Content intent is opt-in via exact string true, default off"
  - "Only source reaction may reach the blank-message fallback; channel and digest paths still skip"
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
---

# Quick Task 261106-0cj: Bot starts without the Message Content intent

The bot no longer requests the privileged Message Content intent unless `DISCORD_MESSAGE_CONTENT_INTENT=true`, so Discord stops refusing the login. Officer reactions on messages whose text the bot cannot read now still file a GitHub issue.

## Commits on fix/bot-message-content-intent

- `dd893e2f` fix(discord-bot): start without the Message Content intent (Task 1)
- `60cfa2c2` fix(discord-bot): file reactions on messages the bot cannot read (Task 2)

## What changed

- `discord-bot/message-content.js` (new, dependency-free): `isMessageContentIntentEnabled`, `buildGatewayIntents`, `messageContentStartupNotice`, `decideReportHandling`, `fallbackReportTitle`, `messageDescription`.
- `discord-bot/bot.js`: Client intents come from `buildGatewayIntents(GatewayIntentBits, process.env)`; one `console.warn` startup line when the intent is off.
- `discord-bot/feedback.js`: `fileFeedback` uses `decideReportHandling`; `fallback` titles as `Discord report in #channel` (channel label only, no author); issue body uses `messageDescription`. `skip` still applies to blank channel messages and the digest backfill, forum starters keep the thread name.
- `discord-bot/message-content.test.mjs`: 23 Vitest cases covering every export.

## Verification

- `npx vitest run discord-bot/message-content.test.mjs`: 23 passed.
- Boot check against the real discord.js Client with `login` stubbed: intent off by default (notice printed), on with `true`; Guilds, GuildMessages, GuildMessageReactions requested in both. Re-run after Task 2: still passes.
- Filing check through the real `fileFeedback` with `fetch` stubbed: blank reaction files with fallback title, new body wording and the Discord link; blank channel message files nothing; forum starter keeps thread name; text and attachment-only messages title as before.
- Em dash gate on added lines and new files: clean. Scope gate: only the four planned files changed.
- `npm run lint`: exit 0, 0 errors (375 warnings, all pre-existing, none in discord-bot files touched here).
- `npm run typecheck`: exit 0.
- `npm test`: exit 0, 256 files passed and 1 skipped, 5113 tests passed and 1 skipped.

## Deviations from Plan

- Reworded the comment above the title selection in feedback.js to drop an em dash, as the plan permitted. Otherwise the plan was executed as written.
- The tracer gate was satisfied by the autonomous boot check (passed) rather than an interactive checkpoint, since the orchestrator asked for the whole plan to run.

## Test gap

The wiring in bot.js and feedback.js has no committed test, because those files need the bot's dependencies and the root run does not install them. It was proven by the two local end-to-end checks above.

## What the owner still has to do

1. ~~Merge the PR for `fix/bot-message-content-intent`.~~ Done 2026-11-09: PR #482 merged on the owner's explicit go-ahead, using the admin bypass of the one-review rule. Merging also carried the owner's sign-off on the two new strings (the fallback title and the body placeholder).
2. Confirm the Railway deploy shows the bot online with the intents notice and no disallowed-intents crash. Railway reported the deploy of the merge commit as successful on 2026-11-09; the runtime logs have not been read yet.
3. Leave `DISCORD_MESSAGE_CONTENT_INTENT` unset until Discord approves the privileged intent, then set it to `true`.
4. Run the human check: as an officer, add a bug reaction to another user's recent message in a text channel; expect an issue titled `Discord report in #channel`, a bot reply with the link and ack reaction, and the new body wording with a working Discord link.

## Known Stubs

None.

## Self-Check: PASSED

Both commits exist on the branch, all four files exist, no files outside the plan were staged.
