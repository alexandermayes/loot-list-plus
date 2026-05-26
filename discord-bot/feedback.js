const { PermissionFlagsBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

const TRIGGER_EMOJI = '🐛';
const ISSUE_LABELS = ['bug', 'user-feedback', 'discord-source'];

const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function envOrNull(name) {
  return process.env[name] || null;
}

async function lookupExistingIssue(messageId) {
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

async function createGithubIssue({ title, body }) {
  const token = requireEnv('GITHUB_TOKEN');
  const repo = requireEnv('GITHUB_REPO'); // format: owner/repo
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body, labels: ISSUE_LABELS })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub issue creation failed (${res.status}): ${text}`);
  }
  return await res.json();
}

function buildIssueBody({ message, source, triggeredBy }) {
  const author = `${message.author.tag} (${message.author.id})`;
  const channel = message.channel?.name ? `#${message.channel.name}` : message.channel?.id || 'unknown';
  const messageLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
  const attachments = [...message.attachments.values()];

  const lines = [
    '## Description',
    message.content?.trim() || '(no message text)',
    '',
    '## Details',
    `- **Source:** ${source === 'channel' ? `Auto-captured from ${channel}` : `Reaction (${TRIGGER_EMOJI}) by ${triggeredBy?.tag || 'unknown'} in ${channel}`}`,
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

async function fileFeedback({ message, source, triggeredBy }) {
  if (!message.guild) return; // DMs ignored
  if (message.author?.bot) return;

  const existing = await lookupExistingIssue(message.id);
  if (existing) {
    console.log(`[feedback] message ${message.id} already filed as #${existing}, skipping`);
    return { issueNumber: existing, deduped: true };
  }

  const text = message.content?.trim();
  if (!text && message.attachments.size === 0) {
    console.log(`[feedback] message ${message.id} has no content and no attachments, skipping`);
    return null;
  }

  const title = await generateTitle(text || '(image only)');
  const body = buildIssueBody({ message, source, triggeredBy });

  const issue = await createGithubIssue({ title, body });
  console.log(`[feedback] filed message ${message.id} as issue #${issue.number}: ${title}`);

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
  const channelId = envOrNull('FEEDBACK_CHANNEL_ID');
  if (!channelId) return;
  if (message.channel.id !== channelId) return;
  if (message.author?.bot) return;

  try {
    await fileFeedback({ message, source: 'channel' });
  } catch (err) {
    console.error('[feedback] channel listener error:', err);
  }
}

async function handleReactionAdd(reaction, user) {
  if (user.bot) return;
  if (reaction.emoji.name !== TRIGGER_EMOJI) return;

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
    await fileFeedback({ message, source: 'reaction', triggeredBy: user });
  } catch (err) {
    console.error('[feedback] reaction listener error:', err);
  }
}

module.exports = {
  handleMessageCreate,
  handleReactionAdd,
  fileFeedback,
  supabase,
  TRIGGER_EMOJI,
};
