-- Spaces, members, invites (ADR 19, 20; docs/architecture.md §5.0). Only the owner invites and changes roles.

create table public.ledgers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_currency text not null default 'UAH' constraint ledgers_base_currency_check check (base_currency in ('UAH', 'USD', 'EUR')),
  time_zone text not null default 'Europe/Kyiv',
  week_starts_on smallint not null default 1 constraint ledgers_week_starts_on_check check (week_starts_on between 0 and 6),
  next_income_on date,
  subscription_defaults jsonb,
  reminder_defaults jsonb,
  created_by uuid not null default auth.uid() references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1
);
create index ledgers_created_by_idx on public.ledgers (created_by);

create table public.ledger_members (
  ledger_id uuid not null references public.ledgers on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null constraint ledger_members_role_check check (role in ('owner', 'editor', 'viewer')),
  display_name text,
  notify_channels text[] not null default '{in_app,push}',
  calendar_sync boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (ledger_id, user_id)
);
create unique index ledger_members_one_owner on public.ledger_members (ledger_id) where role = 'owner';
create index ledger_members_user_id_idx on public.ledger_members (user_id);

create table public.ledger_invites (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references public.ledgers on delete cascade,
  email extensions.citext not null,
  role text not null constraint ledger_invites_role_check check (role in ('editor', 'viewer')),
  token_hash bytea not null constraint ledger_invites_token_hash_key unique, -- SHA-256; the token itself is never stored
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users on delete set null,
  revoked_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index ledger_invites_ledger_id_idx on public.ledger_invites (ledger_id);
create index ledger_invites_created_by_idx on public.ledger_invites (created_by);
create index ledger_invites_accepted_by_idx on public.ledger_invites (accepted_by);

alter table public.user_settings
  add constraint user_settings_last_ledger_id_fkey foreign key (last_ledger_id) references public.ledgers on delete set null;
create index user_settings_last_ledger_id_idx on public.user_settings (last_ledger_id);

-- Membership functions: security definer reads ledger_members past its own RLS, so policies do not recurse.
-- Membership is read on every request (not a JWT claim), so a revoked member loses access at once.
create function private.my_ledger_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select ledger_id from public.ledger_members where user_id = (select auth.uid())
$$;

create function private.my_writable_ledger_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select ledger_id from public.ledger_members
  where user_id = (select auth.uid()) and role in ('owner', 'editor')
$$;

create function private.my_owned_ledger_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select ledger_id from public.ledger_members where user_id = (select auth.uid()) and role = 'owner'
$$;

revoke execute on function private.my_ledger_ids(), private.my_writable_ledger_ids(), private.my_owned_ledger_ids() from public;
grant execute on function private.my_ledger_ids(), private.my_writable_ledger_ids(), private.my_owned_ledger_ids() to authenticated;

-- Every new account gets its own space, the owner row and personal settings
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ledger_id uuid := gen_random_uuid();
begin
  insert into public.ledgers (id, name, created_by) values (v_ledger_id, 'Мій простір', new.id);
  insert into public.ledger_members (ledger_id, user_id, role) values (v_ledger_id, new.id, 'owner');
  insert into public.user_settings (user_id, last_ledger_id) values (new.id, v_ledger_id);
  return new;
end $$;
revoke execute on function private.handle_new_user() from public;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger ledgers_bump_version before update on public.ledgers
  for each row execute function private.bump_version();
create trigger ledgers_keep_created_by before update on public.ledgers
  for each row execute function private.keep_created_by();
create trigger ledger_invites_keep_created_by before update on public.ledger_invites
  for each row execute function private.keep_created_by();

alter table public.ledgers enable row level security;
alter table public.ledger_members enable row level security;
alter table public.ledger_invites enable row level security;

-- ledgers: members read; the owner edits the space settings. New spaces come from create_ledger (phase 1).
create policy ledgers_read on public.ledgers for select to authenticated
  using (id in (select private.my_ledger_ids()));
create policy ledgers_write on public.ledgers for update to authenticated
  using (id in (select private.my_owned_ledger_ids()))
  with check (id in (select private.my_owned_ledger_ids()));

-- ledger_members: members read; only the owner changes roles; the owner row is never changed or removed;
-- a member may remove their own row (leave the space). New rows come from the trigger above and accept_ledger_invite.
create policy ledger_members_read on public.ledger_members for select to authenticated
  using (ledger_id in (select private.my_ledger_ids()));
create policy ledger_members_write on public.ledger_members for update to authenticated
  using (role <> 'owner' and ledger_id in (select private.my_owned_ledger_ids()))
  with check (role <> 'owner' and ledger_id in (select private.my_owned_ledger_ids()));
create policy ledger_members_delete on public.ledger_members for delete to authenticated
  using (
    role <> 'owner'
    and (ledger_id in (select private.my_owned_ledger_ids()) or user_id = (select auth.uid()))
  );

-- ledger_invites: only the owner reads and writes
create policy ledger_invites_write on public.ledger_invites for all to authenticated
  using (ledger_id in (select private.my_owned_ledger_ids()))
  with check (ledger_id in (select private.my_owned_ledger_ids()));

revoke all on table public.ledgers, public.ledger_members, public.ledger_invites from anon, authenticated;
grant select, update on table public.ledgers to authenticated;
grant select, delete on table public.ledger_members to authenticated;
grant update (role, display_name, notify_channels, calendar_sync) on table public.ledger_members to authenticated;
grant select, insert, update, delete on table public.ledger_invites to authenticated;
