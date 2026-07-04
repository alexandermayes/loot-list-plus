const { getSupabase, isAllowedReactor } = require('./feedback');
const { REVIEW_APPROVE_EMOJI, REVIEW_REJECT_EMOJI } = require('./help');

// Officer review of auto-drafted help articles.
//
// When /help answers a question that wasn't covered, help.js stores a
// `pending_review` article and posts it to the ops channel with ✅ / 🗑️
// reactions. An allowed reactor (admin or a configured feedback role — same
// permission model as the 🐛/💡 flow) approves or discards it here:
//   ✅ → status 'published' (gets a slug, becomes searchable via /help)
//   🗑️ → status 'archived'
//
// We only act on messages that map to a pending_review article, so this never
// collides with the feedback bug/feature reaction flow.

const EMBED_COLOR_GREEN = 0x57f287;
const EMBED_COLOR_GREY = 0x9aa0a6;

function slugify(text) {
  const s = (text || 'article')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'article';
}

async function resolvePartials(reaction) {
  if (reaction.partial) {
    try { await reaction.fetch(); } catch (err) {
      console.warn('[help-review] failed to fetch partial reaction:', err.message);
      return false;
    }
  }
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch (err) {
      console.warn('[help-review] failed to fetch partial message:', err.message);
      return false;
    }
  }
  return true;
}

async function handleHelpReviewReaction(reaction, user) {
  if (user.bot) return;
  const emoji = reaction.emoji.name;
  if (emoji !== REVIEW_APPROVE_EMOJI && emoji !== REVIEW_REJECT_EMOJI) return;

  const supabase = getSupabase();
  if (!supabase) return;

  if (!(await resolvePartials(reaction))) return;
  const message = reaction.message;
  if (!message.guild) return;

  // Only act if this message is a pending help-article review.
  const { data: article, error } = await supabase
    .from('help_articles')
    .select('id, title, status')
    .eq('review_message_id', message.id)
    .eq('status', 'pending_review')
    .maybeSingle();
  if (error) {
    console.warn('[help-review] lookup failed:', error.message);
    return;
  }
  if (!article) return; // not a review message, or already decided

  const member = await message.guild.members.fetch(user.id).catch(() => null);
  if (!isAllowedReactor(member)) {
    console.log(`[help-review] reaction by ${user.tag} ignored (not allowed)`);
    return;
  }

  const approve = emoji === REVIEW_APPROVE_EMOJI;
  const now = new Date().toISOString();
  const update = approve
    ? { status: 'published', slug: `${slugify(article.title)}-${article.id.slice(0, 8)}`, updated_at: now }
    : { status: 'archived', updated_at: now };

  const { error: upErr } = await supabase
    .from('help_articles')
    .update(update)
    .eq('id', article.id);
  if (upErr) {
    console.warn('[help-review] update failed:', upErr.message);
    return;
  }
  console.log(`[help-review] ${approve ? 'published' : 'archived'} article ${article.id} by ${user.tag}`);

  // Reflect the decision on the ops message.
  try {
    const decided = approve
      ? `✅ Published by ${user.tag} — now searchable via /help.`
      : `🗑️ Discarded by ${user.tag}.`;
    const original = message.embeds?.[0]?.data;
    const embed = original
      ? { ...original, color: approve ? EMBED_COLOR_GREEN : EMBED_COLOR_GREY, footer: { text: decided } }
      : { description: decided, color: approve ? EMBED_COLOR_GREEN : EMBED_COLOR_GREY };
    await message.edit({ embeds: [embed] });
  } catch (err) {
    console.warn('[help-review] could not update review message:', err.message);
  }
}

module.exports = { handleHelpReviewReaction };
