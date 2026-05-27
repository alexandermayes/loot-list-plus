const { getSupabase, isFeedbackConfigured } = require('./feedback');

// 10-min sweep: query GitHub for recently-closed discord-source issues,
// look each one up in the dedupe map, and post a follow-up in the Discord
// thread the issue was filed from. Tracked via closure_announced_at so we
// never announce the same closure twice.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const LOOKBACK_HOURS = 24;

async function fetchRecentlyClosedIssues() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return [];

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  // labels= is an AND filter — only `discord-source` issues are eligible
  const url = `https://api.github.com/repos/${repo}/issues?state=closed&labels=discord-source&since=${since}&per_page=100`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    console.error(`[closures] github issues fetch failed: ${res.status}`);
    return [];
  }
  const issues = await res.json();
  return issues.filter((i) => !i.pull_request); // /issues endpoint also returns PRs
}

function buildCloseMessage(issue) {
  const tag = issue.state_reason === 'not_planned'
    ? '🚫 Closed (not planned)'
    : '✅ Closed (completed)';
  return `${tag}. See: <${issue.html_url}>`;
}

async function announceClosure(client, supabase, issue) {
  const { data: row, error } = await supabase
    .from('discord_feedback_map')
    .select('discord_channel_id, discord_message_id, closure_announced_at')
    .eq('github_issue_number', issue.number)
    .maybeSingle();
  if (error) {
    console.error(`[closures] lookup failed for #${issue.number}:`, error.message);
    return;
  }
  if (!row) return; // issue not filed by us — skip
  if (row.closure_announced_at) return; // already announced

  const channel = await client.channels.fetch(row.discord_channel_id).catch(() => null);
  if (!channel?.isTextBased?.()) {
    console.warn(`[closures] channel ${row.discord_channel_id} not found or not text-based for #${issue.number}`);
    return;
  }

  try {
    await channel.send(buildCloseMessage(issue));
  } catch (err) {
    console.warn(`[closures] could not post in ${row.discord_channel_id} for #${issue.number}:`, err.message);
    return;
  }

  const { error: updateError } = await supabase
    .from('discord_feedback_map')
    .update({ closure_announced_at: new Date().toISOString() })
    .eq('discord_message_id', row.discord_message_id);
  if (updateError) {
    console.error(`[closures] failed to stamp closure for #${issue.number}:`, updateError.message);
    return;
  }

  console.log(`[closures] announced closure of #${issue.number} in channel ${row.discord_channel_id}`);
}

async function runClosureSweep(client) {
  if (!isFeedbackConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const issues = await fetchRecentlyClosedIssues();
  if (issues.length === 0) return;

  for (const issue of issues) {
    try {
      await announceClosure(client, supabase, issue);
    } catch (err) {
      console.error(`[closures] error processing #${issue.number}:`, err);
    }
  }
}

function scheduleClosureSweep(client) {
  if (!isFeedbackConfigured()) {
    console.log('[closures] not scheduled — feedback not configured');
    return;
  }
  // First sweep 30s after boot so any closures while the bot was offline
  // are caught quickly. Then every 10 min.
  setTimeout(() => {
    runClosureSweep(client).catch((err) => console.error('[closures] initial sweep error:', err));
  }, 30000);
  setInterval(() => {
    runClosureSweep(client).catch((err) => console.error('[closures] sweep error:', err));
  }, SWEEP_INTERVAL_MS);
  console.log(`[closures] scheduled, sweeps every ${SWEEP_INTERVAL_MS / 60000} min`);
}

module.exports = { scheduleClosureSweep, runClosureSweep };
