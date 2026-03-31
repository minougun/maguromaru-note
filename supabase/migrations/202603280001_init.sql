create extension if not exists pgcrypto;

drop view if exists public.user_collected_parts;
drop table if exists public.quiz_stats cascade;
drop table if exists public.visit_log_parts cascade;
drop table if exists public.visit_logs cascade;
drop table if exists public.store_status cascade;
drop table if exists public.menu_items cascade;
drop table if exists public.parts cascade;
drop table if exists public.menu_status cascade;
drop table if exists public.titles cascade;
drop table if exists public.profiles cascade;

create table public.parts (
  id text primary key,
  name text not null,
  area text not null,
  rarity integer not null check (rarity between 1 and 3),
  description text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null unique check (sort_order > 0)
);

create table public.menu_items (
  id text primary key,
  name text not null,
  price integer not null check (price > 0),
  sort_order integer not null unique check (sort_order > 0)
);

create table public.visit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_item_id text not null references public.menu_items(id),
  visited_at date not null default current_date,
  memo text,
  photo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint visit_logs_memo_length check (memo is null or char_length(memo) <= 120)
);

create table public.visit_log_parts (
  id uuid primary key default gen_random_uuid(),
  visit_log_id uuid not null references public.visit_logs(id) on delete cascade,
  part_id text not null references public.parts(id) on delete restrict,
  constraint visit_log_parts_unique unique (visit_log_id, part_id)
);

create table public.store_status (
  id integer primary key default 1 check (id = 1),
  recommendation text not null default '',
  status text not null default 'open' check (status in ('open', 'busy', 'closing_soon', 'closed')),
  status_note text not null default '',
  weather_comment text not null default '',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint store_status_recommendation_length check (char_length(recommendation) <= 280),
  constraint store_status_note_length check (char_length(status_note) <= 120),
  constraint store_status_weather_comment_length check (char_length(weather_comment) <= 120)
);

create table public.quiz_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_correct_answers integer not null default 0 check (total_correct_answers >= 0),
  total_answered_questions integer not null default 0 check (total_answered_questions >= 0),
  quizzes_completed integer not null default 0 check (quizzes_completed >= 0),
  best_score integer not null default 0 check (best_score >= 0),
  best_question_count integer not null default 0 check (best_question_count >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint quiz_stats_score_range check (best_score <= best_question_count),
  constraint quiz_stats_total_range check (total_correct_answers <= total_answered_questions)
);

alter table public.parts enable row level security;
alter table public.menu_items enable row level security;
alter table public.visit_logs enable row level security;
alter table public.visit_log_parts enable row level security;
alter table public.store_status enable row level security;
alter table public.quiz_stats enable row level security;

alter table public.parts force row level security;
alter table public.menu_items force row level security;
alter table public.visit_logs force row level security;
alter table public.visit_log_parts force row level security;
alter table public.store_status force row level security;
alter table public.quiz_stats force row level security;

revoke all on public.parts from anon, authenticated;
revoke all on public.menu_items from anon, authenticated;
revoke all on public.visit_logs from anon, authenticated;
revoke all on public.visit_log_parts from anon, authenticated;
revoke all on public.store_status from anon, authenticated;
revoke all on public.quiz_stats from anon, authenticated;

grant select on public.parts to authenticated;
grant select on public.menu_items to authenticated;
grant select, insert, delete on public.visit_logs to authenticated;
grant select, insert on public.visit_log_parts to authenticated;
grant select on public.store_status to authenticated;
grant select, insert, update on public.quiz_stats to authenticated;

grant all on public.parts to service_role;
grant all on public.menu_items to service_role;
grant all on public.visit_logs to service_role;
grant all on public.visit_log_parts to service_role;
grant all on public.store_status to service_role;
grant all on public.quiz_stats to service_role;

create policy "parts_read"
on public.parts
for select
to authenticated
using (true);

create policy "menu_read"
on public.menu_items
for select
to authenticated
using (true);

create policy "own_logs_select"
on public.visit_logs
for select
to authenticated
using (auth.uid() = user_id);

create policy "own_logs_insert"
on public.visit_logs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "own_logs_delete"
on public.visit_logs
for delete
to authenticated
using (auth.uid() = user_id);

create policy "own_parts_select"
on public.visit_log_parts
for select
to authenticated
using (
  visit_log_id in (
    select id
    from public.visit_logs
    where user_id = auth.uid()
  )
);

create policy "own_parts_insert"
on public.visit_log_parts
for insert
to authenticated
with check (
  visit_log_id in (
    select id
    from public.visit_logs
    where user_id = auth.uid()
  )
);

create policy "status_read"
on public.store_status
for select
to authenticated
using (true);

create policy "quiz_stats_select_own"
on public.quiz_stats
for select
to authenticated
using (auth.uid() = user_id);

create policy "quiz_stats_insert_own"
on public.quiz_stats
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "quiz_stats_update_own"
on public.quiz_stats
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into public.parts (id, name, area, rarity, description, color, sort_order)
values
  ('otoro', '大とろ', '腹部', 3, '最高級の脂のり', '#e85555', 1),
  ('chutoro', '中とろ', '腹部', 2, '脂と赤身のバランス', '#ff6b6b', 2),
  ('akami', '赤身', '背部', 1, '旨味の王道', '#cc3333', 3),
  ('noten', '脳天', '頭部', 3, '大とろ級のとろける食感', '#ff8585', 4),
  ('hoho', 'ほほ肉', '頭部', 3, '肉のような弾力と濃厚な旨味', '#d94444', 5),
  ('meura', '目裏', '頭部', 3, '目の裏側にある濃厚でとろける希少部位', '#f08d7d', 6),
  ('kama', 'カマ', '胸部', 2, '脂がのった希少部位', '#f07070', 7),
  ('haramo', 'ハラモ', '腹部', 2, '腹の大とろに近い部分', '#e06060', 8),
  ('senaka', '中とろ', '背部', 2, '赤身に近い上品な脂', '#d35050', 9);

insert into public.menu_items (id, name, price, sort_order)
values
  ('maguro_don', 'まぐろ丼', 2000, 1),
  ('maguro_don_mini', 'まぐろ丼ミニ', 1500, 2),
  ('tokujo_don', '特上まぐろ丼（大とろ入り）', 3000, 3),
  ('tokujo_don_mini', '特上まぐろ丼ミニ', 2500, 4);

insert into public.store_status (id, recommendation, status, status_note, weather_comment)
values (1, '', 'open', '', '')
on conflict (id) do nothing;

create view public.user_collected_parts as
select distinct
  vlp.part_id,
  vl.user_id
from public.visit_log_parts vlp
join public.visit_logs vl on vl.id = vlp.visit_log_id;

insert into storage.buckets (id, name, public)
values ('don-photos', 'don-photos', true)
on conflict (id) do update
set public = excluded.public;

create policy "don_photos_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'don-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "don_photos_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'don-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'don-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "don_photos_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'don-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
