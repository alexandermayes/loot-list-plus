const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

// Only load .env.local in development (not in production like Railway)
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: '../.env.local' });
}

// Create a new Discord client with minimal intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ]
});

// When the bot is ready
client.once('clientReady', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
  console.log(`📊 Connected to ${client.guilds.cache.size} servers`);

  // List all servers the bot is in
  client.guilds.cache.forEach(guild => {
    console.log(`   - ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
  });

  // Set bot status/activity
  client.user.setPresence({
    activities: [{
      name: 'LootList+ | getlootlist.com',
      type: ActivityType.Playing
    }],
    status: 'online'
  });
});

// Handle errors
client.on('error', error => {
  console.error('❌ Discord client error:', error);
});

// Handle disconnections
client.on('shardDisconnect', () => {
  console.log('⚠️  Disconnected from Discord');
});

client.on('shardReconnecting', () => {
  console.log('🔄 Reconnecting to Discord...');
});

// Login to Discord
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...');
  client.destroy();
  process.exit(0);
});
