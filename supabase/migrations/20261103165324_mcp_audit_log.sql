-- MCP server (phase 10, architecture section 12). An access token of the Supabase OAuth 2.1 server carries client_id,
-- the app's own session has none: that claim tells an MCP client apart from the app.

-- Every MCP tool call: who (the token's user), in which space, which client, which tool, a hash of the arguments (the
-- call is traceable without keeping amounts and notes twice) and what came of it.
create table public.mcp_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  -- null for a call outside one space (list_ledgers) or one that failed before the space was known
  ledger_id uuid references public.ledgers on delete cascade,
  client_id text not null default (auth.jwt() ->> 'client_id'),
  tool text not null constraint mcp_audit_log_tool_check check (tool ~ '^[a-z_]{1,64}$'),
  input_hash text not null constraint mcp_audit_log_input_hash_check check (input_hash ~ '^[0-9a-f]{64}$'),
  outcome text not null constraint mcp_audit_log_outcome_check check (outcome in ('ok', 'preview', 'error')),
  error_code text constraint mcp_audit_log_error_code_check check (char_length(error_code) <= 64),
  created_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index mcp_audit_log_user_id_created_at_idx on public.mcp_audit_log (user_id, created_at desc);
create index mcp_audit_log_ledger_id_created_at_idx on public.mcp_audit_log (ledger_id, created_at desc);

alter table public.mcp_audit_log enable row level security;

-- own calls; the owner of a space also sees the calls its members made in it
create policy mcp_audit_log_self on public.mcp_audit_log for select to authenticated
  using (user_id = (select auth.uid()));
create policy mcp_audit_log_owner_read on public.mcp_audit_log for select to authenticated
  using (ledger_id in (select private.my_owned_ledger_ids()));
-- the MCP route writes it with the caller's own token: only as themselves, with their own client, in their spaces;
-- nobody updates or deletes the journal
create policy mcp_audit_log_write on public.mcp_audit_log for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and client_id = (select auth.jwt() ->> 'client_id')
    and (ledger_id is null or ledger_id in (select private.my_ledger_ids()))
  );

revoke all on table public.mcp_audit_log from anon, authenticated;
grant select, insert on table public.mcp_audit_log to authenticated;

-- An OAuth client never deletes (plan 10.5). A restrictive RLS policy would not do: operations, transfers and payments
-- are deleted only by security definer RPCs (delete_operation, delete_obligation_payment, delete_category,
-- delete_ledger_data), which bypass RLS. A before delete trigger stops both paths, direct and through an RPC, and a
-- cascade started by such a client too. A new table with RLS gets the same trigger (pgTAP mcp-audit-log checks it).
create function private.forbid_oauth_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'client_id', '') <> '' then
    raise exception 'an OAuth client cannot delete from %', tg_table_name using errcode = '42501';
  end if;
  return old;
end $$;
revoke execute on function private.forbid_oauth_delete() from public;

do $$
declare
  t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('create trigger %I before delete on public.%I for each row execute function private.forbid_oauth_delete()',
      t.relname || '_oauth_no_delete', t.relname);
  end loop;
end $$;
