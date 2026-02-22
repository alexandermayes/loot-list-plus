-- Battle.net account linking for character import and gear sync
-- Stores OAuth tokens per user (one Battle.net account per user)

create table if not exists battlenet_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  battlenet_id bigint not null,
  battletag text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz not null,
  region text not null default 'us',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint battlenet_accounts_user_unique unique(user_id)
);

-- RLS: users can only manage their own Battle.net account link
alter table battlenet_accounts enable row level security;

create policy "Users can view own battlenet account"
  on battlenet_accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own battlenet account"
  on battlenet_accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own battlenet account"
  on battlenet_accounts for update
  using (auth.uid() = user_id);

create policy "Users can delete own battlenet account"
  on battlenet_accounts for delete
  using (auth.uid() = user_id);

-- Service role needs access for token refresh operations
-- (service role bypasses RLS by default, so no policy needed)
