-- Foundation: extensions, shared trigger functions, personal settings (docs/architecture.md §5, §5.1)

create extension if not exists pg_trgm with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists pg_net with schema extensions;
-- pg_cron creates its own `cron` schema; Supabase installs it into pg_catalog
create extension if not exists pg_cron with schema pg_catalog;

-- Not exposed through the Data API: membership functions and trigger functions live here (ADR 19)
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- before update on every editable table: optimistic-lock counter (ADR 6, PT409 in RPCs)
create function private.bump_version() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;

-- before update on every table with created_by: the author never changes
create function private.keep_created_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;

revoke execute on function private.bump_version(), private.keep_created_by() from public;

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  locale text not null default 'uk-UA',
  theme text not null default 'system' constraint user_settings_theme_check check (theme in ('light', 'dark', 'system')),
  overview_layout jsonb,
  last_ledger_id uuid, -- FK to ledgers is added with the ledgers table
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);

create trigger user_settings_bump_version before update on public.user_settings
  for each row execute function private.bump_version();

alter table public.user_settings enable row level security;

create policy user_settings_self on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.user_settings from anon, authenticated;
grant select, insert, update on table public.user_settings to authenticated;
