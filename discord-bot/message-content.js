// Decisions about the privileged Message Content intent. Dependency-free on
// purpose: bot.js logs in at require time and feedback.js loads discord.js and
// supabase, so this is the only one of the three a Vitest run can import.

function isMessageContentIntentEnabled(env) {
  // Strict match: a typo leaves the intent off, which is the state that logs in.
  return env.DISCORD_MESSAGE_CONTENT_INTENT === 'true';
}

// Requesting a privileged intent that the Developer Portal has not approved
// makes Discord refuse the whole login ("Used disallowed intents"), so the
// intent stays off until the env var says Discord approved it.
function buildGatewayIntents(intentBits, env) {
  const intents = [intentBits.Guilds, intentBits.GuildMessages];
  if (isMessageContentIntentEnabled(env)) intents.push(intentBits.MessageContent);
  intents.push(intentBits.GuildMessageReactions);
  return intents;
}

function messageContentStartupNotice(env) {
  if (isMessageContentIntentEnabled(env)) return null;
  return '[intents] Message Content intent is off, so reports will file without message text. Set DISCORD_MESSAGE_CONTENT_INTENT=true once Discord approves it.';
}

// Why `skip` remains: with the intent off every message arrives blank, so
// filing blank channel messages would turn all chat in a text intake channel
// into issues. Only the exact source `reaction` may reach `fallback`, because an
// officer chose that message and the reaction is already gated by
// isAllowedReactor. The channel listener and the digest backfill both pass
// `channel`, so they stay on `skip`.
function decideReportHandling({ text, attachmentCount, forumStarter, source }) {
  if (forumStarter) return 'thread-name';
  if ((text && text.trim()) || attachmentCount > 0) return 'generated';
  if (source === 'reaction') return 'fallback';
  return 'skip';
}

// Takes the channel label only, so no author data can reach an issue title.
function fallbackReportTitle(label) {
  return `Discord report in ${label}`;
}

function messageDescription(content) {
  const trimmed = typeof content === 'string' ? content.trim() : '';
  return trimmed || '(message text not available to the bot, see the Discord link below)';
}

module.exports = {
  isMessageContentIntentEnabled,
  buildGatewayIntents,
  messageContentStartupNotice,
  decideReportHandling,
  fallbackReportTitle,
  messageDescription,
};
