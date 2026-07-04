-- Discord help bot knowledge base.
--
-- Backs the `/help` slash command (discord-bot/help.js). The bot searches this
-- table for relevant articles, hands the top matches to Claude, and answers.
-- When a question isn't covered, the bot drafts a new article here with
-- status='pending_review' — an officer approves it in the ops channel, flipping
-- it to 'published' so the next search finds it (self-growing FAQ).
--
-- Seeded from lib/help-content.ts (the same curated corpus that powers the
-- in-app help center) via `npm run seed:help`, so both surfaces share one
-- source of truth.
--
-- Search is keyword + fuzzy (no external vendor): a generated tsvector powers
-- Postgres full-text search, and pg_trgm similarity adds typo tolerance. The
-- search_help_articles() RPC combines both and returns ranked, published rows.

create extension if not exists "pg_trgm" with schema "extensions";

create table if not exists "public"."help_articles" (
    "id" uuid primary key default gen_random_uuid(),
    -- Stable identifier. For seeded rows this mirrors the help-content.ts slug
    -- (so re-seeding upserts in place). Auto-drafted rows get a slug only once
    -- an officer publishes them.
    "slug" text unique,
    "category" text,
    "title" text not null,
    "description" text,
    "content" text not null,
    -- Extra searchable terms / aliases (e.g. glossary synonyms). Weighted into
    -- the search vector alongside the body.
    "keywords" text,
    "source" text not null default 'manual'
        check ("source" = any (array['seed', 'audit', 'auto', 'manual'])),
    "status" text not null default 'published'
        check ("status" = any (array['published', 'pending_review', 'archived'])),
    -- Self-growth provenance: the raw user question that spawned an auto draft,
    -- and who asked it.
    "origin_question" text,
    "asked_by_discord_id" text,
    -- Review-queue linkage: the ops-channel message an officer reacts on to
    -- approve/reject a pending draft.
    "review_channel_id" text,
    "review_message_id" text,
    "usage_count" integer not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    -- Full-text index source. The 2-arg to_tsvector with a constant config is
    -- IMMUTABLE, which a generated column requires.
    "search_vector" tsvector generated always as (
        to_tsvector('english',
            coalesce("title", '') || ' ' ||
            coalesce("description", '') || ' ' ||
            coalesce("content", '') || ' ' ||
            coalesce("keywords", ''))
    ) stored
);

alter table "public"."help_articles" owner to "postgres";

comment on table "public"."help_articles" is 'Knowledge base for the LootList+ Discord /help command. Seeded from lib/help-content.ts and grown automatically from answered questions (pending officer review). Searched via search_help_articles().';
comment on column "public"."help_articles"."source" is 'Where the row came from: seed/audit = imported from help-content.ts, auto = drafted by the bot from a user question, manual = hand-added.';
comment on column "public"."help_articles"."status" is 'published = searchable, pending_review = drafted by the bot awaiting officer approval, archived = rejected/retired.';
comment on column "public"."help_articles"."review_message_id" is 'Discord message ID (in review_channel_id) whose approve/reject reaction publishes or archives a pending_review draft.';

-- Full-text search over the whole article.
create index "idx_help_articles_search_vector" on "public"."help_articles" using gin ("search_vector");
-- Fuzzy match on the short fields for typo tolerance ("gargle" -> "gargul").
create index "idx_help_articles_trgm" on "public"."help_articles"
    using gin (("title" || ' ' || coalesce("description", '')) extensions.gin_trgm_ops);
create index "idx_help_articles_status" on "public"."help_articles" using btree ("status");

alter table "public"."help_articles" enable row level security;

-- The bot uses the service role (bypasses RLS). This policy lets the web app
-- read published articles as an authenticated/anon user (step 6: in-app help
-- center reads approved articles).
create policy "help_articles_read_published" on "public"."help_articles"
    for select using ("status" = 'published');

grant all on table "public"."help_articles" to "anon";
grant all on table "public"."help_articles" to "authenticated";
grant all on table "public"."help_articles" to "service_role";

-- Hybrid search: full-text (whole article, weighted higher) OR'd with trigram
-- similarity (short fields, typo tolerant). Returns published rows ranked by the
-- combined score. Handles stopword-only / empty queries by leaning on trigram.
create or replace function "public"."search_help_articles"(
    "p_query" text,
    "p_limit" integer default 8
) returns table (
    "id" uuid,
    "slug" text,
    "category" text,
    "title" text,
    "description" text,
    "content" text,
    "rank" real
)
    language sql stable security definer
    set "search_path" to 'public', 'extensions', 'pg_temp'
    as $$
    select
        a.id,
        a.slug,
        a.category,
        a.title,
        a.description,
        a.content,
        (ts_rank(a.search_vector, websearch_to_tsquery('english', p_query)) * 2.0
            + similarity(a.title || ' ' || coalesce(a.description, ''), p_query))::real as rank
    from public.help_articles a
    where a.status = 'published'
      and coalesce(trim(p_query), '') <> ''
      and (
          a.search_vector @@ websearch_to_tsquery('english', p_query)
          or similarity(a.title || ' ' || coalesce(a.description, ''), p_query) > 0.15
      )
    order by rank desc
    limit greatest(p_limit, 1);
$$;

alter function "public"."search_help_articles"(text, integer) owner to "postgres";

grant execute on function "public"."search_help_articles"(text, integer) to "anon";
grant execute on function "public"."search_help_articles"(text, integer) to "authenticated";
grant execute on function "public"."search_help_articles"(text, integer) to "service_role";
