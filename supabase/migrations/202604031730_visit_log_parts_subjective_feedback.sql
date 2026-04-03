alter table public.visit_log_parts
  add column if not exists fat_level text,
  add column if not exists texture_level text,
  add column if not exists satisfaction integer,
  add column if not exists want_again boolean;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'visit_log_parts_fat_level_check'
  ) then
    alter table public.visit_log_parts
      add constraint visit_log_parts_fat_level_check
      check (fat_level is null or fat_level in ('light', 'balanced', 'rich'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'visit_log_parts_texture_level_check'
  ) then
    alter table public.visit_log_parts
      add constraint visit_log_parts_texture_level_check
      check (texture_level is null or texture_level in ('firm', 'smooth', 'melty'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'visit_log_parts_satisfaction_check'
  ) then
    alter table public.visit_log_parts
      add constraint visit_log_parts_satisfaction_check
      check (satisfaction is null or satisfaction between 1 and 5);
  end if;
end $$;
