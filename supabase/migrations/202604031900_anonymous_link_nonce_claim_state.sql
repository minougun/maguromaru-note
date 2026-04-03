alter table public.anonymous_link_nonces
  add column if not exists claimed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.anonymous_link_nonces
  drop constraint if exists anonymous_link_nonces_completion_order;

alter table public.anonymous_link_nonces
  add constraint anonymous_link_nonces_completion_order
  check (
    completed_at is null
    or claimed_at is not null
  );
