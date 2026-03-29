alter table public.quiz_sessions
  add column if not exists score integer not null default 0;

create table if not exists public.share_bonus_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('visit_log', 'quiz_session')),
  target_id uuid not null,
  channel text not null check (channel in ('x', 'line', 'instagram')),
  bonus_visit_tenths integer not null default 0 check (bonus_visit_tenths >= 0),
  bonus_correct_tenths integer not null default 0 check (bonus_correct_tenths >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  constraint share_bonus_events_target_unique unique (user_id, target_type, target_id)
);

alter table public.share_bonus_events enable row level security;
alter table public.share_bonus_events force row level security;

revoke all on public.share_bonus_events from anon, authenticated;
grant all on public.share_bonus_events to service_role;
