-- "Delete all data" (plan 7.4, 7.7): the owner empties the active space. One delete of the ledgers row cascades to
-- every table of the space, today's and the ones later phases add (ADR 27: ledger_id is always on delete cascade);
-- then the space row, its members and pending invites come back as they were, with the default categories of a new
-- space, so nobody is left without a space and the active-space cookie stays valid.
-- Returns the Storage paths of the deleted attachments: the caller removes the files through the Storage API (an SQL
-- delete on storage.objects leaves the file in the bucket); what it misses, the daily orphan cleanup takes.
create function public.delete_ledger_data(p_ledger_id uuid) returns setof text
language plpgsql security definer set search_path = '' as $$
declare
  v_ledger public.ledgers;
  v_members public.ledger_members[];
  v_invites public.ledger_invites[];
  v_last_users uuid[];
begin
  if p_ledger_id is null or p_ledger_id not in (select private.my_owned_ledger_ids()) then
    raise exception 'only the owner deletes the data of a space' using errcode = '42501';
  end if;
  select * into v_ledger from public.ledgers where id = p_ledger_id for update;
  v_members := array(select m from public.ledger_members m where m.ledger_id = p_ledger_id);
  v_invites := array(select i from public.ledger_invites i where i.ledger_id = p_ledger_id);
  v_last_users := array(select s.user_id from public.user_settings s where s.last_ledger_id = p_ledger_id);

  return query select a.storage_path from public.attachments a where a.ledger_id = p_ledger_id;

  delete from public.ledgers where id = p_ledger_id;
  insert into public.ledgers select (v_ledger).*;
  insert into public.ledger_members select * from unnest(v_members);
  insert into public.ledger_invites select * from unnest(v_invites);
  update public.user_settings set last_ledger_id = p_ledger_id where user_id = any(v_last_users);
  perform private.seed_categories(p_ledger_id, (select auth.uid()));
end $$;

revoke execute on function public.delete_ledger_data(uuid) from public, anon;
grant execute on function public.delete_ledger_data(uuid) to authenticated;
