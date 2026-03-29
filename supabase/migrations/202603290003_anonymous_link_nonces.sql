-- 匿名ユーザーが Google/Apple で「連携」する際、OAuth 後にアプリデータを移すためのワンタイム nonce。
-- RLS により anon/authenticated からは一切アクセス不可。API ルートが service_role のみ使用する。

create table if not exists public.anonymous_link_nonces (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null,
  nonce text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint anonymous_link_nonces_nonce_length check (char_length(nonce) = 64)
);

create index if not exists anonymous_link_nonces_from_user_idx
  on public.anonymous_link_nonces (from_user_id);

create index if not exists anonymous_link_nonces_expires_at_idx
  on public.anonymous_link_nonces (expires_at);

alter table public.anonymous_link_nonces enable row level security;
alter table public.anonymous_link_nonces force row level security;

revoke all on public.anonymous_link_nonces from anon, authenticated, public;
grant all on public.anonymous_link_nonces to service_role;
