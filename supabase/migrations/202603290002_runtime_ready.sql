create table if not exists public.menu_item_statuses (
  menu_item_id text primary key references public.menu_items(id) on delete cascade,
  status text not null check (status in ('available', 'few', 'soldout')),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_count integer not null check (question_count in (10, 20, 30, 50)),
  question_ids jsonb not null,
  submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  constraint quiz_sessions_question_ids_array check (jsonb_typeof(question_ids) = 'array'),
  constraint quiz_sessions_expiry_order check (expires_at > created_at)
);

alter table public.menu_item_statuses enable row level security;
alter table public.quiz_sessions enable row level security;

alter table public.menu_item_statuses force row level security;
alter table public.quiz_sessions force row level security;

revoke all on public.menu_item_statuses from anon, authenticated;
revoke all on public.quiz_sessions from anon, authenticated;

grant select on public.menu_item_statuses to authenticated;
grant all on public.menu_item_statuses to service_role;
grant all on public.quiz_sessions to service_role;

create policy "menu_item_statuses_read"
on public.menu_item_statuses
for select
to authenticated
using (true);

insert into public.menu_item_statuses (menu_item_id, status)
values
  ('maguro_don', 'available'),
  ('maguro_don_mini', 'available'),
  ('tokujo_don', 'few'),
  ('tokujo_don_mini', 'soldout')
on conflict (menu_item_id) do nothing;
