const { getSupabase, fileFeedback, isFeedbackConfigured } = require('./feedback');

// Backfill window: re-scan the last 48h of the feedback channel on each cron
// firing. Anything not already in discord_feedback_map gets filed. This
// catches messages posted while the bot was offline or while Discord's
// gateway hiccupped.
const BACKFILL_HOURS = 48;
const BACKFILL_MESSAGE_LIMIT = 200;

async function fetchTodayMappings() {
  const supabase = getSupabase();
  if (!supabase) return { count: 0, channelCount: 0, reactionCount: 0 };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error, count } = await supabase
    .from('discord_feedback_map')
    .select('github_issue_number, source', { count: 'exact' })
    .gte('created_at', since);
  if (error) {
    console.error('[digest] failed to fetch mappings:', error);
    return { count: 0, channelCount: 0, reactionCount: 0 };
  }
  return {
    count: count || 0,
    channelCount: data.filter((d) => d.source === 'channel').length,
    reactionCount: data.filter((d) => d.source === 'reaction').length,
  };
}

async function fetchOpenIssueCount() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return null;

  // Search API gives total_count cheaply
  const url = `https://api.github.com/search/issues?q=repo:${repo}+is:issue+is:open+label:user-feedback+label:discord-source`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    console.error('[digest] github search failed:', res.status);
    return null;
  }
  const json = await res.json();
  return json.total_count ?? null;
}

async function runBackfill(client) {
  const channelId = process.env.FEEDBACK_CHANNEL_ID;
  if (!channelId) return { scanned: 0, filed: 0 };

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    console.warn('[digest] backfill: feedback channel not found or not text-based');
    return { scanned: 0, filed: 0 };
  }

  const cutoff = Date.now() - BACKFILL_HOURS * 60 * 60 * 1000;
  let filed = 0;
  let scanned = 0;

  try {
    const messages = await channel.messages.fetch({ limit: BACKFILL_MESSAGE_LIMIT });
    for (const message of messages.values()) {
      if (message.createdTimestamp < cutoff) continue;
      if (message.author?.bot) continue;
      scanned += 1;
      const result = await fileFeedback({ message, source: 'channel' });
      if (result && !result.deduped) filed += 1;
    }
  } catch (err) {
    console.error('[digest] backfill error:', err);
  }

  return { scanned, filed };
}

async function postDigest(client, { todayCount, channelCount, reactionCount, openCount, backfill }) {
  const opsChannelId = process.env.FEEDBACK_OPS_CHANNEL_ID;
  if (!opsChannelId) {
    console.log('[digest] no FEEDBACK_OPS_CHANNEL_ID set, skipping post');
    return;
  }
  const channel = await client.channels.fetch(opsChannelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    console.warn('[digest] ops channel not found or not text-based');
    return;
  }

  const lines = [
    `📋 **Discord feedback digest** — last 24h`,
    `Filed: **${todayCount}** (${channelCount} from channel, ${reactionCount} from reactions)`,
    openCount !== null ? `Open total: **${openCount}**` : null,
    backfill.filed > 0 ? `Backfill: caught ${backfill.filed} missed message(s) out of ${backfill.scanned} scanned` : null,
  ].filter(Boolean);

  await channel.send(lines.join('\n'));
}

async function runDigest(client) {
  if (!isFeedbackConfigured()) {
    console.log('[digest] skipped — feedback not configured');
    return;
  }
  console.log('[digest] running daily digest');
  const backfill = await runBackfill(client);
  const { count, channelCount, reactionCount } = await fetchTodayMappings();
  const openCount = await fetchOpenIssueCount();
  await postDigest(client, {
    todayCount: count,
    channelCount,
    reactionCount,
    openCount,
    backfill,
  });
}

// Compute ms until the next 9:00 AM in America/Los_Angeles. Using
// Intl APIs to read the current LA wall-clock time avoids a date-fns-tz
// dependency for this one-shot scheduling need.
function msUntilNext9amPT() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const nowSecPT = (parseInt(parts.hour, 10) * 3600) + (parseInt(parts.minute, 10) * 60) + parseInt(parts.second, 10);
  const targetSec = 9 * 3600;
  const dayInSec = 24 * 3600;
  const deltaSec = ((targetSec - nowSecPT) + dayInSec) % dayInSec || dayInSec;
  return deltaSec * 1000;
}

function scheduleDigest(client) {
  if (!isFeedbackConfigured()) {
    console.log('[digest] not scheduled — feedback not configured');
    return;
  }
  const tick = () => {
    runDigest(client).catch((err) => console.error('[digest] run failed:', err));
    setTimeout(tick, 24 * 60 * 60 * 1000);
  };
  const ms = msUntilNext9amPT();
  setTimeout(tick, ms);
  const nextRun = new Date(Date.now() + ms);
  console.log(`[digest] scheduled, next run at ${nextRun.toISOString()} (9:00 AM PT)`);
}

module.exports = { scheduleDigest, runDigest };
