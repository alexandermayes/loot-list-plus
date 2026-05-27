const { fetchScore, fetchPriority } = require('./lootlist-api');

const EMBED_COLOR_ORANGE = 0xff8000;
const EMBED_COLOR_RED = 0xd73a4a;

function errorEmbed(message) {
  return { color: EMBED_COLOR_RED, description: message };
}

function notLinkedEmbed() {
  return errorEmbed(
    "This Discord server isn't linked to a LootList+ guild yet. An officer can link it from **Guild Settings → Discord** in the app.",
  );
}

function scoreEmbed(payload) {
  const a = payload.attendance;
  // Lead with the score-credit ratio so the bot reads the same as the app's
  // attendance page. Raw raid count is secondary context — partial raid
  // attendance can still earn full score via per-week capping, so showing
  // only "4/8 = 50%" was misleading raiders into thinking they're at half.
  const fmt = (n) => Number.isInteger(n) ? n.toString() : n.toFixed(2);
  const lines = [
    `**Attendance credit:** ${fmt(a.score)} / ${fmt(a.max_score)} (${a.score_percent}%)`,
    `**Raids attended:** ${a.raids_attended} of ${a.raids_in_window} tracked (last ${payload.rolling_weeks} weeks)`,
  ];
  return {
    color: EMBED_COLOR_ORANGE,
    title: `${payload.character_name} — Loot Score`,
    description: lines.join('\n'),
    footer: { text: `${payload.guild_name} · LootList+` },
  };
}

function priorityEmbed(payload) {
  const itemLine = payload.item_wowhead_id
    ? `[**${payload.item_name}**](https://www.wowhead.com/item=${payload.item_wowhead_id})`
    : `**${payload.item_name}**`;
  if (!payload.raiders || payload.raiders.length === 0) {
    return {
      color: EMBED_COLOR_ORANGE,
      title: `Top priority — ${payload.item_name}`,
      description: `${itemLine}\n\n_No raiders have ranked this item._`,
    };
  }
  const lines = payload.raiders.map((r, i) => {
    const classPart = r.class ? ` *(${r.class})*` : '';
    return `\`#${i + 1}\` **${r.name}**${classPart} — rank ${r.rank}`;
  });
  return {
    color: EMBED_COLOR_ORANGE,
    title: `Top priority — ${payload.item_name}`,
    description: `${itemLine}\n\n${lines.join('\n')}`,
  };
}

async function handleScore(interaction) {
  const characterName = interaction.options.getString('character', true);
  if (!interaction.guildId) {
    await interaction.editReply({ embeds: [errorEmbed('Slash commands only work inside a server.')] });
    return;
  }
  const res = await fetchScore(interaction.guildId, characterName);
  if (res.status === 404 && res.body?.error === 'no_guild_linked') {
    await interaction.editReply({ embeds: [notLinkedEmbed()] });
    return;
  }
  if (res.status === 404 && res.body?.error === 'character_not_found') {
    await interaction.editReply({
      embeds: [errorEmbed(`Couldn't find a character named **${characterName}** in this guild.`)],
    });
    return;
  }
  if (!res.ok) {
    await interaction.editReply({
      embeds: [errorEmbed("LootList+ couldn't load that score. Try again in a sec.")],
    });
    return;
  }
  await interaction.editReply({ embeds: [scoreEmbed(res.body)] });
}

async function handlePriority(interaction) {
  const itemQuery = interaction.options.getString('item', true);
  if (!interaction.guildId) {
    await interaction.editReply({ embeds: [errorEmbed('Slash commands only work inside a server.')] });
    return;
  }
  const res = await fetchPriority(interaction.guildId, itemQuery);
  if (res.status === 404 && res.body?.error === 'no_guild_linked') {
    await interaction.editReply({ embeds: [notLinkedEmbed()] });
    return;
  }
  if (res.status === 404 && res.body?.error === 'item_not_found') {
    await interaction.editReply({
      embeds: [errorEmbed(`Couldn't find an item matching **${itemQuery}**.`)],
    });
    return;
  }
  if (!res.ok) {
    await interaction.editReply({
      embeds: [errorEmbed("LootList+ couldn't run that lookup. Try again in a sec.")],
    });
    return;
  }
  await interaction.editReply({ embeds: [priorityEmbed(res.body)] });
}

async function handleInteractionCreate(interaction) {
  if (!interaction.isChatInputCommand?.()) return;

  // Defer immediately so we don't hit Discord's 3s response window when the
  // API call is slow. Public — anyone reading the channel can see the reply.
  try {
    await interaction.deferReply();
  } catch (err) {
    console.warn('[interactions] deferReply failed:', err.message);
    return;
  }

  try {
    switch (interaction.commandName) {
      case 'score':
        await handleScore(interaction);
        break;
      case 'priority':
        await handlePriority(interaction);
        break;
      default:
        await interaction.editReply({ embeds: [errorEmbed(`Unknown command: ${interaction.commandName}`)] });
    }
  } catch (err) {
    console.error('[interactions] handler error:', err);
    try {
      await interaction.editReply({
        embeds: [errorEmbed('Something went sideways running that command. Try again in a sec.')],
      });
    } catch {}
  }
}

module.exports = { handleInteractionCreate };
