-- Phase 1 database gaps before v0.2.0: receipts of deleted operations, files nobody references, and a base currency
-- that would mix two currencies in the month totals.

-- attachments.owner_id has no FK (polymorphic): whatever deletes an operation (delete_operation, a payment cancelled
-- with its operation, the transfer cascade) takes its attachment rows. The files go with the daily cron.
create function private.remove_operation_attachments() returns trigger
language plpgsql set search_path = '' as $$
begin
  delete from public.attachments a using removed r
  where a.ledger_id = r.ledger_id and a.owner_type = 'operation' and a.owner_id = r.id;
  return null;
end $$;
revoke execute on function private.remove_operation_attachments() from public;

create trigger operations_remove_attachments after delete on public.operations
  referencing old table as removed
  for each statement execute function private.remove_operation_attachments();

-- Files of the attachments bucket with no attachments row (a deleted operation or space, an upload whose row was never
-- written), older than a day so an upload in progress is never taken. Only the daily cron calls it with the secret
-- key and removes them through the Storage API: an SQL delete on storage.objects leaves the file in the bucket.
-- At most 1000 a run, the most one Storage remove call takes; a backlog goes over the next days.
create function public.list_orphan_attachments() returns setof text
language sql stable set search_path = '' as $$
  select o.name from storage.objects o
  where o.bucket_id = 'attachments' and o.created_at < now() - interval '1 day'
    and not exists (select 1 from public.attachments a where a.storage_path = o.name)
  order by o.created_at
  limit 1000
$$;
revoke execute on function public.list_orphan_attachments() from public, anon, authenticated;
grant execute on function public.list_orphan_attachments() to service_role;

-- Base amounts are a snapshot in the base currency of their day (§21: a new rate does not rewrite history), and the
-- spec defines no recompute, so the base currency changes only while the space has no operations; otherwise the
-- month totals would add up two currencies. The form maps this constraint name to its message.
create function private.lock_base_currency() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.operations where ledger_id = new.id) then
    raise exception 'new row for relation "ledgers" violates check constraint "ledgers_base_currency_locked"'
      using errcode = '23514', constraint = 'ledgers_base_currency_locked';
  end if;
  return new;
end $$;
revoke execute on function private.lock_base_currency() from public;

create trigger ledgers_lock_base_currency before update of base_currency on public.ledgers
  for each row when (old.base_currency is distinct from new.base_currency)
  execute function private.lock_base_currency();
