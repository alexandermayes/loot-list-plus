const { Client, GatewayIntentBits, ActivityType, Partials, Events } = require('discord.js');

// Only load .env.local in development (not in production like Railway)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env.local' });
}

const { handleMessageCreate, handleReactionAdd, isFeedbackConfigured, warnMissingOnce } = require('./feedback');
const { scheduleDigest } = require('./digest');
const { scheduleClosureSweep } = require('./closures');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // privileged — must be enabled in Dev Portal
    GatewayIntentBits.GuildMessageReactions,
  ],
  // Partials let us receive reaction events on messages posted before the
  // bot started (i.e. not in the message cache).
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

client.once('clientReady', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  console.log(`📊 Connected to ${client.guilds.cache.size} servers`);
  client.guilds.cache.forEach(guild => {
    console.log(`   - ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
  });

  client.user.setPresence({
    activities: [{
      name: 'LootList+ | getlootlist.com',
      type: ActivityType.Playing
    }],
    status: 'online'
  });

  if (isFeedbackConfigured()) {
    console.log('[feedback] enabled — channel + reaction listeners active');
  } else {
    warnMissingOnce();
  }
  scheduleDigest(client);
  scheduleClosureSweep(client);
});

client.on(Events.MessageCreate, handleMessageCreate);
client.on(Events.MessageReactionAdd, handleReactionAdd);

client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

client.on('shardDisconnect', () => {
  console.log('⚠️  Disconnected from Discord');
});

client.on('shardReconnecting', () => {
  console.log('🔄 Reconnecting to Discord...');
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN not found in environment variables');
  console.error('   Please set DISCORD_BOT_TOKEN in Railway dashboard or .env.local for local development');
  process.exit(1);
}

client.login(token).catch(error => {
  console.error('❌ Failed to login to Discord:', error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...');
  client.destroy();
  process.exit(0);
});
