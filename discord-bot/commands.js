const { SlashCommandBuilder } = require('discord.js');

const COMMANDS = [
  new SlashCommandBuilder()
    .setName('score')
    .setDescription("Show a raider's current Loot Score breakdown")
    .addStringOption((opt) =>
      opt.setName('character')
        .setDescription('Character name')
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('priority')
    .setDescription('See who has an item ranked highest on their loot list')
    .addStringOption((opt) =>
      opt.setName('item')
        .setDescription('Item name (or part of it)')
        .setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Ask a question — answered from the LootList+ FAQ and known issues')
    .addStringOption((opt) =>
      opt.setName('question')
        .setDescription('What do you need help with?')
        .setRequired(true)
    )
    .toJSON(),
];

// Registers slash commands globally. Global commands can take up to an hour
// to propagate to all servers on first publish but are instant on updates.
// Safe to call on every boot — Discord dedupes by name+options shape.
async function registerCommands(client) {
  try {
    if (!client.application) {
      console.warn('[commands] client.application not ready, skipping registration');
      return;
    }
    await client.application.commands.set(COMMANDS);
    console.log(`[commands] registered ${COMMANDS.length} global commands`);
  } catch (err) {
    console.error('[commands] failed to register:', err.message || err);
  }
}

module.exports = { COMMANDS, registerCommands };
