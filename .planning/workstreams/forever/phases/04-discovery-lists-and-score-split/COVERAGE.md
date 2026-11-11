# API Coverage: Discord REST (Phase 4, "Set your 5" sender)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
> Scope: the Discord REST calls the app makes from `POST /api/discord/set-your-five` (plan 04-18) through `lib/discord.ts`. The bot (`discord-bot/`) is not changed and Railway does not redeploy in this phase (D-23). Existing Discord features (officer notifications, raid summaries, loot announcements, updates cron) are unchanged and out of this matrix.

| capability | decision | reason |
|---|---|---|
| Channel message: POST /channels/{id}/messages to the raid summary channel | INTEGRATE | |
| Open DM channel: POST /users/@me/channels with recipient_id | INTEGRATE | |
| DM message: POST /channels/{dm id}/messages, content plus one link button | INTEGRATE | |
| Rate-limit handling (429 Retry-After, 5xx retry) | INTEGRATE | |
| DM refusals: 403 code 50007, 50278, 40003 counted as skipped | INTEGRATE | |
| allowed_mentions with parse [] on every message | INTEGRATE | |
| Embeds on the Set your 5 message | OPT-OUT | explicitly out of scope: UI-SPEC surface 2 asks for plain content with one link button |
| Interactive components (custom_id buttons, select menus, modals) | OPT-OUT | not needed: a link button sends no interaction, so the bot needs no handler (D-23) |
| Edit or delete a sent message (PATCH or DELETE /channels/{id}/messages/{id}) | OPT-OUT | not needed: each send is a one-off notice; resends are rate limited to one per guild per hour (D-30) |
| Reactions (PUT /channels/{id}/messages/{id}/reactions) | OPT-OUT | not needed: nothing reads them |
| Threads (start thread, thread messages) | OPT-OUT | not needed yet: the live Discord loot thread is Phase 6 work |
| Pins | OPT-OUT | not needed: the message links to the picker and stays a plain notice |
| Bot slash commands (for example /setmy5) | OPT-OUT | explicitly out of scope: deferred in 04-CONTEXT.md while the app sends the link (D-23) |
| Guild member lookups (GET /guilds/{id}/members) | OPT-OUT | not needed: recipients come from the app's own active memberships and user_preferences.discord_id |
| Webhooks | OPT-OUT | not needed: the bot token already posts to the configured channel |
| Gateway events | OPT-OUT | not needed: the sender is a single request-response route with no live connection |
