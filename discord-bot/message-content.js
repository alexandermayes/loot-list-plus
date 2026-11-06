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

module.exports = {
  isMessageContentIntentEnabled,
  buildGatewayIntents,
  messageContentStartupNotice,
};
