const { PermissionFlagsBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const TRIGGER_EMOJI = '🐛';
const FEATURE_TRIGGER_EMOJI = '💡';
const BUG_LABELS = ['bug', 'user-feedback', 'discord-source'];
const FEATURE_LABELS = ['enhancement', 'user-feedback', 'discord-source'];

// Reaction emoji → labels applied when an officer reacts on any message.
// Lets feature requests be filed from any channel just like bugs.
const REACTION_TRIGGERS = {
  [TRIGGER_EMOJI]: BUG_LABELS,
  [FEATURE_TRIGGER_EMOJI]: FEATURE_LABELS,
};

// Channels the bot watches in realtime. Each entry maps an env var holding
// a Discord channel ID to the labels applied to the resulting GitHub issue.
// To add a third intake channel later, add another entry here.
const WATCHED_CHANNELS = [
  { envVar: 'FEEDBACK_CHANNEL_ID', labels: BUG_LABELS, kind: 'bug report' },
  { envVar: 'FEATURE_REQUEST_CHANNEL_ID', labels: FEATURE_LABELS, kind: 'feature request' },
];

// Feedback handling is gated on these being present. If any are missing, the
// bot logs a one-time warning and falls back to presence-only behavior so a
// half-configured deploy can't take the bot offline.
const REQUIRED_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GITHUB_TOKEN', 'GITHUB_REPO'];

let _supabase = null;
let _missingWarned = false;

function envOrNull(name) {
  return process.env[name] || null;
}

function missingRequiredVars() {
  return REQUIRED_VARS.filter((v) => !process.env[v]);
}

function isFeedbackConfigured() {
  return missingRequiredVars().length === 0;
}

function warnMissingOnce() {
  if (_missingWarned) return;
  _missingWarned = true;
  const missing = missingRequiredVars();
  console.warn(`[feedback] disabled — missing env var(s): ${missing.join(', ')}`);
  console.warn('[feedback] bot will stay online for presence only. set these on Railway and redeploy to enable feedback capture.');
}

function getSupabase() {
  if (_supabase) return _supabase;
  if (!isFeedbackConfigured()) return null;
  _supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
  return _supabase;
}

async function lookupExistingIssue(messageId) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('discord_feedback_map')
    .select('github_issue_number')
    .eq('discord_message_id', messageId)
    .maybeSingle();
  if (error) {
    console.error('[feedback] dedupe lookup failed:', error);
    return null;
  }
  return data?.github_issue_number ?? null;
}

async function recordMapping(row) {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('discord_feedback_map').insert(row);
  if (error) {
    console.error('[feedback] failed to record mapping:', error);
  }
}

// Mirrors the title-gen approach in app/api/feedback/route.ts so Discord-sourced
// issues read the same as in-app ones.
async function generateTitle(description) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const fallback = description.trim().slice(0, 80) + (description.trim().length > 80 ? '...' : '');
  if (!apiKey) return fallback;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: `Generate a concise bug ticket title (max 10 words) for this bug report. Return ONLY the title, no quotes or extra text.\n\nBug description: ${description.trim()}`
        }]
      })
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    const title = json.content?.[0]?.text?.trim();
    return (title && title.length > 0 && title.length < 100) ? title : fallback;
  } catch (err) {
    console.error('[feedback] title generation failed:', err);
    return fallback;
  }
}

// Fetches up to 50 open issues in this repo that share the kind-label
// (bug or enhancement) so we can ask Haiku whether the new report is a
// duplicate. Limited to discord-source so we're not comparing against
// completely unrelated tracker work.
async function fetchOpenIssuesForDupeCheck(kindLabel) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return [];
  const url = `https://api.github.com/repos/${repo}/issues?state=open&labels=${encodeURIComponent(kindLabel + ',discord-source')}&per_page=50`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    console.warn(`[feedback] dupe-check fetch failed: ${res.status}`);
    return [];
  }
  const issues = await res.json();
  return issues.filter((i) => !i.pull_request);
}

// Returns the matched issue object, or null if no duplicate. Soft-fails on
// any error (network, parse, missing key) — duplicate detection is a polish
// feature; not blocking the actual filing.
async function findDuplicate({ title, body, labels }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const kindLabel = labels.includes('enhancement') ? 'enhancement' : 'bug';
  const issues = await fetchOpenIssuesForDupeCheck(kindLabel);
  if (issues.length === 0) return null;

  // Body snippet: just the Description section (skip our auto-appended Details/footer)
  const stripMeta = (s) => (s || '').split('\n## Details')[0].replace(/^## Description\n/, '').trim();

  const candidates = issues
    .map((i) => `#${i.number} — ${i.title}\n   ${stripMeta(i.body).slice(0, 200).replace(/\n/g, ' ')}`)
    .join('\n');
  const newSnippet = stripMeta(body).slice(0, 500);

  const prompt = `You are checking whether a new ${kindLabel === 'enhancement' ? 'feature request' : 'bug report'} duplicates an existing open issue.

NEW REPORT:
Title: ${title}
${newSnippet}

EXISTING OPEN ISSUES (number — title and snippet):
${candidates}

Return ONLY the issue number (e.g. "42") if the new report is clearly a duplicate of one of them. Return ONLY the word "none" if no existing issue is a clear duplicate. Be conservative — when in doubt, return "none".`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 20,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.warn(`[feedback] dupe-check claude call failed: ${res.status}`);
      return null;
    }
    const json = await res.json();
    const text = (json.content?.[0]?.text || '').trim().toLowerCase();
    if (!text || text.startsWith('none')) return null;
    const num = parseInt(text.match(/\d+/)?.[0] || '', 10);
    if (!num) return null;
    return issues.find((i) => i.number === num) || null;
  } catch (err) {
    console.warn('[feedback] dupe-check error:', err.message);
    return null;
  }
}

async function addGithubComment(issueNumber, body) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub comment failed (${res.status}): ${text}`);
  }
}

async function createGithubIssue({ title, body, labels }) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // format: owner/repo
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body, labels })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub issue creation failed (${res.status}): ${text}`);
  }
  return await res.json();
}

function isForumStarter(message) {
  return Boolean(message.channel?.isThread?.() && message.id === message.channel.id);
}

function channelLabel(message) {
  if (isForumStarter(message)) {
    const parentName = message.channel.parent?.name;
    return parentName ? `#${parentName} → "${message.channel.name}"` : `forum post "${message.channel.name}"`;
  }
  return message.channel?.name ? `#${message.channel.name}` : message.channel?.id || 'unknown';
}

function buildIssueBody({ message, source, triggeredBy }) {
  const author = `${message.author.tag} (${message.author.id})`;
  const label = channelLabel(message);
  const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
  const attachments = [...message.attachments.values()];

  const lines = [
    '## Description',
    message.content?.trim() || '(no message text)',
    '',
    '## Details',
    `- **Source:** ${source === 'channel' ? `Auto-captured from ${label}` : `Reaction (${TRIGGER_EMOJI}) by ${triggeredBy?.tag || 'unknown'} in ${label}`}`,
    `- **Reporter:** ${author}`,
    `- **Posted:** ${message.createdAt.toISOString()}`,
    `- **Discord link:** ${messageLink}`,
  ];

  if (attachments.length > 0) {
    lines.push('', '## Attachments');
    for (const att of attachments) {
      lines.push(`- [${att.name || 'attachment'}](${att.url})`);
    }
  }

  lines.push('', '---', '*Filed by LootList+ feedback bot from Discord*');
  return lines.join('\n');
}

async function fileFeedback({ message, source, triggeredBy, labels = BUG_LABELS }) {
  if (!message.guild) return; // DMs ignored
  if (message.author?.bot) return;

  const existing = await lookupExistingIssue(message.id);
  if (existing) {
    console.log(`[feedback] message ${message.id} already filed as #${existing}, skipping`);
    return { issueNumber: existing, deduped: true };
  }

  const text = message.content?.trim();
  const forumStarter = isForumStarter(message);
  if (!text && message.attachments.size === 0 && !forumStarter) {
    console.log(`[feedback] message ${message.id} has no content and no attachments, skipping`);
    return null;
  }

  // For forum posts, the user already wrote a title (the thread name). Use it
  // directly — no need to ask Claude to summarize the body into a title.
  const title = forumStarter
    ? message.channel.name
    : await generateTitle(text || '(image only)');
  const body = buildIssueBody({ message, source, triggeredBy });

  // Soft duplicate check before filing — we still file the new issue (so
  // nothing's lost if Haiku is wrong) but flag the suspected duplicate in
  // both the Discord reply and as a GitHub comment for officer review.
  const duplicate = await findDuplicate({ title, body, labels });
  if (duplicate) {
    console.log(`[feedback] possible duplicate of #${duplicate.number} for message ${message.id}`);
  }

  const issue = await createGithubIssue({ title, body, labels });
  console.log(`[feedback] filed message ${message.id} as issue #${issue.number}: ${title}`);

  // Visible confirmation in-thread so the reporter can see the issue link
  // without having to spot the small ✅ reaction.
  try {
    const kind = labels.includes('enhancement') ? 'feature request' : 'bug report';
    const dupeNote = duplicate
      ? `\n\n👀 Possible duplicate of **#${duplicate.number}: ${duplicate.title}** — <${duplicate.html_url}>`
      : '';
    await message.reply({
      content: `Thanks — this ${kind} is tracked as **#${issue.number}** on GitHub.\n<${issue.html_url}>${dupeNote}`,
      allowedMentions: { repliedUser: false },
    });
  } catch (err) {
    console.warn('[feedback] could not post thread reply:', err.message);
  }

  // Cross-link on GitHub so the dupe candidate shows up in the new issue's
  // timeline and vice-versa (GH auto-creates a back-reference on #duplicate).
  if (duplicate) {
    try {
      await addGithubComment(issue.number, `Possible duplicate of #${duplicate.number} — flagged automatically by the feedback bot. Close as duplicate if confirmed.`);
    } catch (err) {
      console.warn('[feedback] could not post dupe-link comment:', err.message);
    }
  }

  await recordMapping({
    discord_message_id: message.id,
    discord_channel_id: message.channel.id,
    discord_guild_id: message.guild.id,
    github_issue_number: issue.number,
    github_repo: process.env.GITHUB_REPO,
    source,
    triggered_by_discord_id: triggeredBy?.id || null,
    author_discord_id: message.author.id,
    author_display_name: message.author.username,
  });

  // Acknowledge in the channel so the reporter knows it was captured
  try {
    await message.react('✅');
  } catch (err) {
    // Non-fatal — bot may not have add-reactions permission
    console.warn('[feedback] could not react with ack emoji:', err.message);
  }

  return { issueNumber: issue.number, deduped: false };
}

function parseCsv(value) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAllowedReactor(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  const allowedIds = parseCsv(envOrNull('FEEDBACK_REACTION_ROLE_IDS'));
  if (allowedIds.length > 0 && member.roles.cache.some((r) => allowedIds.includes(r.id))) {
    return true;
  }

  const allowedNames = parseCsv(envOrNull('FEEDBACK_REACTION_ROLE_NAMES')).map((n) => n.toLowerCase());
  if (allowedNames.length > 0 && member.roles.cache.some((r) => allowedNames.includes(r.name.toLowerCase()))) {
    return true;
  }

  return false;
}

async function handleMessageCreate(message) {
  if (!isFeedbackConfigured()) { warnMissingOnce(); return; }
  if (message.author?.bot) return;

  // Match the message against each configured intake channel. Two valid
  // shapes per channel:
  //   1. Plain text channel — message lands directly in it
  //   2. Forum channel — each post is a thread whose parent is the forum.
  //      We only file the starter message (skip replies) so each post = 1 issue.
  let matched = null;
  for (const config of WATCHED_CHANNELS) {
    const channelId = envOrNull(config.envVar);
    if (!channelId) continue;
    const isDirectMatch = message.channel.id === channelId;
    const isForumPostStarter =
      message.channel.parentId === channelId &&
      message.channel.isThread?.() &&
      message.id === message.channel.id;
    if (isDirectMatch || isForumPostStarter) {
      matched = config;
      break;
    }
  }
  if (!matched) return;

  console.log(`[feedback] ${matched.kind} candidate: msgId=${message.id} channel=${message.channel.id} author=${message.author?.tag}`);

  try {
    await fileFeedback({ message, source: 'channel', labels: matched.labels });
  } catch (err) {
    console.error('[feedback] channel listener error:', err);
  }
}

async function handleReactionAdd(reaction, user) {
  if (!isFeedbackConfigured()) { warnMissingOnce(); return; }
  if (user.bot) return;
  const labels = REACTION_TRIGGERS[reaction.emoji.name];
  if (!labels) return;

  // Logged only for trigger-emoji reactions — across 49 servers, logging
  // every reaction is too noisy.
  console.log(`[feedback] ${reaction.emoji.name} reaction by=${user.tag} msgId=${reaction.message?.id} channelId=${reaction.message?.channel?.id}`);

  // Reaction may be partial (uncached message) — fetch full
  if (reaction.partial) {
    try { await reaction.fetch(); } catch (err) {
      console.warn('[feedback] failed to fetch partial reaction:', err.message);
      return;
    }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch (err) {
      console.warn('[feedback] failed to fetch partial message:', err.message);
      return;
    }
  }

  const message = reaction.message;
  if (!message.guild) return;

  const member = await message.guild.members.fetch(user.id).catch(() => null);
  if (!isAllowedReactor(member)) {
    console.log(`[feedback] reaction by ${user.tag} ignored (not allowed)`);
    return;
  }

  try {
    await fileFeedback({ message, source: 'reaction', triggeredBy: user, labels });
  } catch (err) {
    console.error('[feedback] reaction listener error:', err);
  }
}

module.exports = {
  handleMessageCreate,
  handleReactionAdd,
  fileFeedback,
  getSupabase,
  isFeedbackConfigured,
  isAllowedReactor,
  warnMissingOnce,
  TRIGGER_EMOJI,
};
