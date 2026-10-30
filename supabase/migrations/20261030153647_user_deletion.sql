-- Deleting an auth user (Dashboard, auth.admin.deleteUser) failed with "Database error deleting user":
-- ledgers.created_by referenced auth.users with no action, and every user has a space from handle_new_user.
-- Semantics (ADR 27): the spaces the user owns go with all their data; their memberships elsewhere cascade away;
-- created_by is audit only and becomes null.

alter table public.ledgers
  alter column created_by drop not null,
  drop constraint ledgers_created_by_fkey,
  add constraint ledgers_created_by_fkey foreign key (created_by) references auth.users on delete set null;

-- The FK set-null runs an UPDATE from inside the cascade (trigger depth > 1); a direct UPDATE (depth 1) still cannot
-- change the author, so an owner cannot wipe created_by through the Data API.
create or replace function private.keep_created_by() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by
     and not (new.created_by is null and pg_trigger_depth() > 1) then
    raise exception 'created_by cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;

-- before delete: the owner row in ledger_members still exists here (FK cascades run after the delete).
-- Everything that references ledgers cascades: ledger_members, ledger_invites; user_settings.last_ledger_id sets null.
create function private.handle_deleted_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.ledgers
  where id in (select ledger_id from public.ledger_members where user_id = old.id and role = 'owner');
  return old;
end $$;
revoke execute on function private.handle_deleted_user() from public;

create trigger on_auth_user_deleted before delete on auth.users
  for each row execute function private.handle_deleted_user();
