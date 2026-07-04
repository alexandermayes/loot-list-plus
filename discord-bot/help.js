// feedback.js is required lazily (inside the functions that need it) so this
// module's pure helpers — e.g. parseStructured — can be imported in unit tests
// without pulling in discord.js.

// On-demand help answerer for the `/help` slash command, backed by a searchable,
// self-growing knowledge base (the `help_articles` table).
//
// Flow: user runs `/help question:<text>` →
//   1. search_help_articles RPC returns the top matching articles (Postgres
//      full-text + pg_trgm fuzzy, seeded from lib/help-content.ts)
//   2. GitHub is searched for related issues ("is this a known bug / fixed?")
//   3. Claude answers using ONLY that context, or returns NO_ANSWER when it
//      isn't confident (we then defer to a human)
//   4. If the question was answerable but NOT covered by an existing article,
//      Claude drafts a clean article. We store it as `pending_review` and post
//      it to the ops channel for an officer to approve (see help-review.js).
//
// Everything soft-gates on ANTHROPIC_API_KEY; without it /help just posts the
// human-fallback message so a half-configured deploy never crashes the bot.

const HELP_MODEL = process.env.HELP_MODEL || 'claude-3-5-haiku-20241022';
const ANSWER_MAX_CHARS = 3800; // keep under Discord's 4096 embed-description cap
const ARTICLE_SNIPPET_CHARS = 800; // per-article budget in the Claude prompt
const CANDIDATE_LIMIT = 8;
const EMBED_COLOR_ORANGE = 0xff8000;
const EMBED_COLOR_GREY = 0x9aa0a6;
const EMBED_COLOR_BLUE = 0x5865f2;

// Sentinel Claude returns when the context doesn't confidently cover the ask.
const NO_ANSWER = 'NO_ANSWER';

// Reactions officers use on a queued draft in the ops channel.
const REVIEW_APPROVE_EMOJI = '✅';
const REVIEW_REJECT_EMOJI = '🗑️';

function isHelpConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

// Top matching published articles via the hybrid FTS + trigram RPC. Soft-fails
// to [] so a search hiccup just means "answer from issues / defer to human".
async function searchArticles(question) {
  const { getSupabase } = require('./feedback');
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('search_help_articles', {
    p_query: question,
    p_limit: CANDIDATE_LIMIT,
  });
  if (error) {
    console.warn('[help] article search failed:', error.message);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// GitHub full-text search over this repo's issues (open AND closed) so the bot
// can say "known bug, tracked in #123" or "fixed in #98". Soft-fails to [].
async function searchIssues(question) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return [];

  const terms = question.replace(/[?#:"']/g, ' ').trim().slice(0, 200);
  if (!terms) return [];

  const q = `repo:${repo} is:issue ${terms}`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=6`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) {
      console.warn(`[help] issue search failed: ${res.status}`);
      return [];
    }
    const json = await res.json();
    const items = Array.isArray(json.items) ? json.items : [];
    return items
      .filter((i) => !i.pull_request)
      .map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        stateReason: i.state_reason || null,
        url: i.html_url,
        snippet: stripIssueMeta(i.body).slice(0, 240).replace(/\s+/g, ' ').trim(),
      }));
  } catch (err) {
    console.warn('[help] issue search error:', err.message);
    return [];
  }
}

function stripIssueMeta(body) {
  return (body || '').split('\n## Details')[0].replace(/^## Description\n/, '').trim();
}

// ---------------------------------------------------------------------------
// Prompt + structured reply
// ---------------------------------------------------------------------------

function buildArticleContext(articles) {
  if (articles.length === 0) return '(no matching articles found)';
  return articles
    .map((a, i) => {
      const body = (a.content || '').replace(/\s+/g, ' ').trim().slice(0, ARTICLE_SNIPPET_CHARS);
      const slug = a.slug || '(no slug)';
      return `[${i + 1}] slug: ${slug}\nTitle: ${a.title}\n${body}`;
    })
    .join('\n\n');
}

function buildIssueContext(issues) {
  if (issues.length === 0) return '(no related issues found)';
  return issues
    .map((i) => {
      const status = i.state === 'closed'
        ? `CLOSED${i.stateReason === 'not_planned' ? ' (not planned)' : ' (resolved)'}`
        : 'OPEN';
      const snippet = i.snippet ? ` — ${i.snippet}` : '';
      return `#${i.number} [${status}] ${i.title}${snippet}`;
    })
    .join('\n');
}

function buildPrompt(question, articles, issues) {
  return `You are the LootList+ help assistant answering a user's question in a Discord help channel. LootList+ is a World of Warcraft loot-management app.

Answer using ONLY the help articles and GitHub issues below. Do not invent features, settings, or steps that aren't supported by that context. If the context does not confidently answer the question, decline (see the ANSWER rules).

Respond in EXACTLY this format, using the marker lines verbatim:

COVERAGE: <one word: "covered", "novel", or "none">
===ANSWER===
<your answer to show the user, OR the exact token ${NO_ANSWER}>
===ARTICLE_TITLE===
<only when COVERAGE is novel: a short, general title for a new help article>
===ARTICLE_DESCRIPTION===
<only when COVERAGE is novel: a one-line description>
===ARTICLE_CONTENT===
<only when COVERAGE is novel: a clean, reusable markdown help article that answers this question for anyone (not addressed to one person)>

Rules:
- COVERAGE "covered": an existing article above already answers this well. In ANSWER, answer the question; leave the ARTICLE_* sections empty.
- COVERAGE "novel": you can answer confidently from the context, but no single article above already covers it. Fill in ANSWER *and* the ARTICLE_* sections.
- COVERAGE "none": the context does not let you answer confidently. Set ANSWER to exactly ${NO_ANSWER} and leave ARTICLE_* empty. When in doubt, choose this — deferring to a human is better than guessing.
- In ANSWER: be concise and direct. If a related issue is clearly relevant, mention it by number (e.g. "this is tracked in #123").

=== HELP ARTICLES ===
${buildArticleContext(articles)}

=== RELATED GITHUB ISSUES ===
${buildIssueContext(issues)}

=== USER QUESTION ===
${question}`;
}

async function askClaude(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: HELP_MODEL,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      console.warn(`[help] claude call failed: ${res.status}`);
      return null;
    }
    const json = await res.json();
    return (json.content?.[0]?.text || '').trim();
  } catch (err) {
    console.warn('[help] claude error:', err.message);
    return null;
  }
}

// Pull marker-delimited sections out of Claude's structured reply.
function parseStructured(raw) {
  const marker = (name) => `===${name}===`;
  const answerStart = raw.indexOf(marker('ANSWER'));
  const header = answerStart >= 0 ? raw.slice(0, answerStart) : raw;
  const covMatch = header.match(/COVERAGE:\s*([a-z]+)/i);
  const coverage = covMatch ? covMatch[1].trim().toLowerCase() : 'none';

  const section = (name, nextNames) => {
    const open = raw.indexOf(marker(name));
    if (open < 0) return '';
    const from = open + marker(name).length;
    let end = raw.length;
    for (const nn of nextNames) {
      const idx = raw.indexOf(marker(nn), from);
      if (idx >= 0 && idx < end) end = idx;
    }
    return raw.slice(from, end).trim();
  };

  return {
    coverage,
    answer: section('ANSWER', ['ARTICLE_TITLE', 'ARTICLE_DESCRIPTION', 'ARTICLE_CONTENT']),
    title: section('ARTICLE_TITLE', ['ARTICLE_DESCRIPTION', 'ARTICLE_CONTENT']),
    description: section('ARTICLE_DESCRIPTION', ['ARTICLE_CONTENT']),
    content: section('ARTICLE_CONTENT', []),
  };
}

// Returns { answered, text?, coverage?, draft? }. answered=false → show the
// human-fallback message. draft is set only when the answer is novel and the
// model produced a usable article to queue for review.
async function answerQuestion(question) {
  if (!isHelpConfigured()) return { answered: false };

  const [articles, issues] = await Promise.all([
    searchArticles(question),
    searchIssues(question),
  ]);
  const raw = await askClaude(buildPrompt(question, articles, issues));
  if (!raw) return { answered: false };

  const parsed = parseStructured(raw);
  const normalized = (parsed.answer || '').replace(/^[\s"'`*]+/, '').toUpperCase();
  if (!parsed.answer || normalized.startsWith(NO_ANSWER)) {
    return { answered: false };
  }

  const text = parsed.answer.length > ANSWER_MAX_CHARS
    ? parsed.answer.slice(0, ANSWER_MAX_CHARS - 1) + '…'
    : parsed.answer;

  const isNovel = parsed.coverage.startsWith('novel');
  const draft = (isNovel && parsed.title && parsed.content)
    ? { title: parsed.title, description: parsed.description, content: parsed.content }
    : null;

  return { answered: true, text, coverage: parsed.coverage, draft };
}

// ---------------------------------------------------------------------------
// Retroactive add — queue a drafted article for officer review
// ---------------------------------------------------------------------------

function reviewEmbed(question, draft) {
  const preview = draft.content.length > 1500
    ? draft.content.slice(0, 1499) + '…'
    : draft.content;
  return {
    color: EMBED_COLOR_BLUE,
    title: '🆕 New help article — pending review',
    description: `**${draft.title}**\n${draft.description || ''}\n\n${preview}`,
    fields: [{ name: 'Asked in Discord', value: question.slice(0, 1024) }],
    footer: { text: `React ${REVIEW_APPROVE_EMOJI} to publish · ${REVIEW_REJECT_EMOJI} to discard` },
  };
}

// Insert a pending_review row, post it to the ops channel with approve/reject
// reactions, and record the review message id so help-review.js can act on it.
// Soft-fails at every step: worst case the article stays pending in the DB.
async function queuePendingArticle(client, question, draft, askedById) {
  const { getSupabase } = require('./feedback');
  const supabase = getSupabase();
  if (!supabase) return;

  const { data, error } = await supabase
    .from('help_articles')
    .insert({
      title: draft.title,
      description: draft.description || null,
      content: draft.content,
      source: 'auto',
      status: 'pending_review',
      origin_question: question,
      asked_by_discord_id: askedById || null,
    })
    .select('id')
    .single();
  if (error) {
    console.warn('[help] could not queue pending article:', error.message);
    return;
  }
  console.log(`[help] queued pending article ${data.id}: ${draft.title}`);

  const opsChannelId = process.env.FEEDBACK_OPS_CHANNEL_ID;
  if (!opsChannelId) {
    console.log('[help] no FEEDBACK_OPS_CHANNEL_ID — article left pending (approve via DB)');
    return;
  }
  const channel = await client.channels.fetch(opsChannelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    console.warn('[help] ops channel not found or not text-based');
    return;
  }

  let msg;
  try {
    msg = await channel.send({ embeds: [reviewEmbed(question, draft)] });
  } catch (err) {
    console.warn('[help] could not post review message:', err.message);
    return;
  }
  try {
    await msg.react(REVIEW_APPROVE_EMOJI);
    await msg.react(REVIEW_REJECT_EMOJI);
  } catch (err) {
    console.warn('[help] could not add review reactions:', err.message);
  }

  const { error: updateError } = await supabase
    .from('help_articles')
    .update({ review_channel_id: channel.id, review_message_id: msg.id })
    .eq('id', data.id);
  if (updateError) {
    console.warn('[help] could not link review message:', updateError.message);
  }
}

// ---------------------------------------------------------------------------
// Slash command entry point
// ---------------------------------------------------------------------------

function answerEmbed(text) {
  return {
    color: EMBED_COLOR_ORANGE,
    title: '💬 Help',
    description: text,
    footer: { text: '🤖 Auto-answer — an officer will confirm if this isn\'t quite right.' },
  };
}

function fallbackEmbed() {
  return {
    color: EMBED_COLOR_GREY,
    description:
      "I couldn't find a confident answer in the help articles or known issues, so I'll leave this one for a human. An officer will help you out — hang tight! 🙏",
  };
}

// interaction is already deferred (public) by handleInteractionCreate.
async function handleHelp(interaction) {
  const question = interaction.options.getString('question', true);
  const result = await answerQuestion(question);

  if (result.answered) {
    await interaction.editReply({ embeds: [answerEmbed(result.text)] });
  } else {
    await interaction.editReply({ embeds: [fallbackEmbed()] });
  }

  // Retroactively grow the KB when we answered something not yet covered.
  if (result.answered && result.draft) {
    try {
      await queuePendingArticle(interaction.client, question, result.draft, interaction.user?.id);
    } catch (err) {
      console.warn('[help] queue pending article failed:', err.message);
    }
  }
}

module.exports = {
  handleHelp,
  answerQuestion,
  isHelpConfigured,
  parseStructured,
  searchArticles,
  REVIEW_APPROVE_EMOJI,
  REVIEW_REJECT_EMOJI,
};
