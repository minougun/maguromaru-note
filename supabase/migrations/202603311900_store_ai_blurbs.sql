-- ホーム用 AI 一言（営業中は差分時のみ / 終了後はまとめ 1 行）。挿入は service_role のみ。

create table public.store_ai_blurbs (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) <= 200),
  kind text not null check (kind in ('intraday', 'closing_summary')),
  jst_date text not null check (jst_date ~ '^\d{4}-\d{2}-\d{2}$'),
  source_fingerprint text not null check (char_length(source_fingerprint) <= 128),
  created_at timestamptz not null default timezone('utc', now())
);

create index store_ai_blurbs_jst_kind_created
  on public.store_ai_blurbs (jst_date, kind, created_at desc);

create unique index store_ai_blurbs_one_closing_per_day
  on public.store_ai_blurbs (jst_date)
  where kind = 'closing_summary';

alter table public.store_ai_blurbs enable row level security;
alter table public.store_ai_blurbs force row level security;

revoke all on public.store_ai_blurbs from anon, authenticated;
grant select on public.store_ai_blurbs to authenticated;
grant all on public.store_ai_blurbs to service_role;

create policy "store_ai_blurbs_read"
on public.store_ai_blurbs
for select
to authenticated
using (true);
