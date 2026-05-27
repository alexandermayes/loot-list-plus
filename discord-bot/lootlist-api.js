// Thin client for calling the LootList+ API from the bot. All requests are
// server-to-server, authenticated via the shared BOT_API_KEY secret.

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function baseUrl() {
  return process.env.LOOTLIST_API_BASE_URL || 'https://lootlistplus.com';
}

async function botGet(path, params) {
  const apiKey = requireEnv('BOT_API_KEY');
  const qs = new URLSearchParams(params).toString();
  const url = `${baseUrl()}${path}?${qs}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bot ${apiKey}`, Accept: 'application/json' },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { ok: res.ok, status: res.status, body: json };
}

async function fetchScore(discordGuildId, characterName) {
  return botGet('/api/bot/score', { discord_guild_id: discordGuildId, character_name: characterName });
}

async function fetchPriority(discordGuildId, itemQuery) {
  return botGet('/api/bot/priority', { discord_guild_id: discordGuildId, item_query: itemQuery });
}

module.exports = { fetchScore, fetchPriority };
