create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.parts (
  id text primary key,
  name text not null,
  area text not null,
  rarity integer not null check (rarity between 1 and 3),
  description text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null unique check (sort_order > 0)
);

create table if not exists public.visit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  visited_at date not null,
  photo_url text,
  memo text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint visit_logs_memo_length check (memo is null or char_length(memo) <= 120)
);

create table if not exists public.visit_log_parts (
  id uuid primary key default gen_random_uuid(),
  visit_log_id uuid not null references public.visit_logs(id) on delete cascade,
  part_id text not null references public.parts(id) on delete restrict,
  constraint visit_log_parts_unique unique (visit_log_id, part_id)
);

create table if not exists public.titles (
  id text primary key,
  name text not null,
  icon text not null,
  required_visits integer not null check (required_visits > 0),
  sort_order integer not null unique check (sort_order > 0)
);

create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  price integer not null check (price > 0),
  sort_order integer not null unique check (sort_order > 0)
);

create table if not exists public.menu_status (
  id uuid primary key default gen_random_uuid(),
  menu_item_id text not null unique references public.menu_items(id) on delete cascade,
  status text not null check (status in ('available', 'few', 'soldout')),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid not null references public.profiles(id) on delete restrict
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '匿名のまぐろ好き'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_staff()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'staff', false);
$$;

alter table public.profiles enable row level security;
alter table public.parts enable row level security;
alter table public.visit_logs enable row level security;
alter table public.visit_log_parts enable row level security;
alter table public.titles enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_status enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "parts_read_all" on public.parts;
create policy "parts_read_all"
on public.parts
for select
to authenticated
using (true);

drop policy if exists "titles_read_all" on public.titles;
create policy "titles_read_all"
on public.titles
for select
to authenticated
using (true);

drop policy if exists "menu_items_read_all" on public.menu_items;
create policy "menu_items_read_all"
on public.menu_items
for select
to authenticated
using (true);

drop policy if exists "visit_logs_select_own" on public.visit_logs;
create policy "visit_logs_select_own"
on public.visit_logs
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "visit_logs_insert_own" on public.visit_logs;
create policy "visit_logs_insert_own"
on public.visit_logs
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "visit_logs_update_own" on public.visit_logs;
create policy "visit_logs_update_own"
on public.visit_logs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "visit_logs_delete_own" on public.visit_logs;
create policy "visit_logs_delete_own"
on public.visit_logs
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "visit_log_parts_select_own" on public.visit_log_parts;
create policy "visit_log_parts_select_own"
on public.visit_log_parts
for select
to authenticated
using (
  exists (
    select 1
    from public.visit_logs
    where public.visit_logs.id = visit_log_parts.visit_log_id
      and public.visit_logs.user_id = auth.uid()
  )
);

drop policy if exists "visit_log_parts_insert_own" on public.visit_log_parts;
create policy "visit_log_parts_insert_own"
on public.visit_log_parts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.visit_logs
    where public.visit_logs.id = visit_log_parts.visit_log_id
      and public.visit_logs.user_id = auth.uid()
  )
);

drop policy if exists "visit_log_parts_delete_own" on public.visit_log_parts;
create policy "visit_log_parts_delete_own"
on public.visit_log_parts
for delete
to authenticated
using (
  exists (
    select 1
    from public.visit_logs
    where public.visit_logs.id = visit_log_parts.visit_log_id
      and public.visit_logs.user_id = auth.uid()
  )
);

drop policy if exists "menu_status_read_all" on public.menu_status;
create policy "menu_status_read_all"
on public.menu_status
for select
to authenticated
using (true);

drop policy if exists "menu_status_staff_insert" on public.menu_status;
create policy "menu_status_staff_insert"
on public.menu_status
for insert
to authenticated
with check (public.is_staff() and auth.uid() = updated_by);

drop policy if exists "menu_status_staff_update" on public.menu_status;
create policy "menu_status_staff_update"
on public.menu_status
for update
to authenticated
using (public.is_staff())
with check (public.is_staff() and auth.uid() = updated_by);

insert into public.parts (id, name, area, rarity, description, color, sort_order)
values
  ('otoro', '大トロ', '腹部', 3, '最高級の脂のり', '#ff6b6b', 1),
  ('chutoro', '中トロ', '腹部', 2, '脂と赤身のバランス', '#e85555', 2),
  ('akami', '赤身', '背部', 1, '旨味の王道', '#cc3333', 3),
  ('noten', '脳天', '頭部', 3, '大トロ級のとろける食感', '#ff8585', 4),
  ('hoho', 'ほほ肉', '頭部', 3, '肉のような弾力と濃厚な旨味', '#d94444', 5),
  ('kama', 'カマ', '胸部', 2, '脂がのった希少部位', '#f07070', 6),
  ('haramo', 'ハラモ', '腹部', 2, '腹の大トロに近い部分', '#e06060', 7),
  ('senaka', '背トロ', '背部', 2, '赤身に近い上品な脂', '#d35050', 8)
on conflict (id) do update
set
  name = excluded.name,
  area = excluded.area,
  rarity = excluded.rarity,
  description = excluded.description,
  color = excluded.color,
  sort_order = excluded.sort_order;

insert into public.titles (id, name, icon, required_visits, sort_order)
values
  ('beginner', 'まぐろ入門者', '🐟', 1, 1),
  ('akami_fan', '赤身の理解者', '🎣', 3, 2),
  ('chutoro', '中トロ通', '🍣', 5, 3),
  ('hunter', '希少部位ハンター', '🏆', 10, 4),
  ('master', '一頭理解者', '👑', 20, 5)
on conflict (id) do update
set
  name = excluded.name,
  icon = excluded.icon,
  required_visits = excluded.required_visits,
  sort_order = excluded.sort_order;

insert into public.menu_items (id, name, price, sort_order)
values
  ('maguro_don', 'まぐろ丼', 2000, 1),
  ('maguro_don_mini', 'まぐろ丼ミニ', 1500, 2),
  ('tokujo_don', '特上まぐろ丼（大トロ入り）', 3000, 3),
  ('tokujo_don_mini', '特上まぐろ丼ミニ', 2500, 4)
on conflict (id) do update
set
  name = excluded.name,
  price = excluded.price,
  sort_order = excluded.sort_order;

insert into storage.buckets (id, name, public)
values ('don-photos', 'don-photos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "don_photos_read_all" on storage.objects;
create policy "don_photos_read_all"
on storage.objects
for select
to authenticated
using (bucket_id = 'don-photos');

drop policy if exists "don_photos_write_own" on storage.objects;
create policy "don_photos_write_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'don-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "don_photos_update_own" on storage.objects;
create policy "don_photos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'don-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'don-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "don_photos_delete_own" on storage.objects;
create policy "don_photos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'don-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
