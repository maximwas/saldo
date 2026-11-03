-- MCP (migration mcp_audit_log, plan 10.5): the journal of tool calls under RLS, and the rule that an OAuth client
-- (a token with client_id) never deletes, directly or through a security definer RPC, while the app session does.
-- Fictional data only.
begin;
select plan(17);

-- p_client: the client_id claim of an OAuth access token; null = the app's own session
create function pg_temp.login(p_user uuid, p_client text default null) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'client_id', p_client)::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000a01', 'pgtap-mcp-owner@example.com'),
  ('00000000-0000-4000-8000-000000000a02', 'pgtap-mcp-editor@example.com'),
  ('00000000-0000-4000-8000-000000000a03', 'pgtap-mcp-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000a04', 'pgtap-mcp-stranger@example.com');

create temp table spaces (ledger_id uuid);
insert into spaces select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000a01';
grant select on spaces to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000a02'::uuid, 'editor' from spaces
union all
select ledger_id, '00000000-0000-4000-8000-000000000a03'::uuid, 'viewer' from spaces;

create function pg_temp.space() returns uuid language sql as $$ select ledger_id from spaces $$;
create function pg_temp.audit(p_user uuid, p_client text) returns void language sql as $$
  insert into public.mcp_audit_log (user_id, ledger_id, client_id, tool, input_hash, outcome)
  values (p_user, pg_temp.space(), p_client, 'get_balances', repeat('a', 64), 'ok')
$$;

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
     and not exists (select 1 from pg_trigger g where g.tgrelid = c.oid and g.tgname = c.relname || '_oauth_no_delete')),
  0::bigint, 'every table with RLS in public has the OAuth no-delete trigger');

-- journal: written only as yourself, with your own client, in your own spaces
select pg_temp.login('00000000-0000-4000-8000-000000000a01', 'client-a');
select lives_ok($$ select pg_temp.audit('00000000-0000-4000-8000-000000000a01', 'client-a') $$,
  'an OAuth client writes a call of its user');
select throws_ok($$ select pg_temp.audit('00000000-0000-4000-8000-000000000a01', 'client-b') $$, '42501', null,
  'a call cannot name another client');
select throws_ok($$ select pg_temp.audit('00000000-0000-4000-8000-000000000a02', 'client-a') $$, '42501', null,
  'a call cannot name another user');
select pg_temp.login('00000000-0000-4000-8000-000000000a03', 'client-v');
select lives_ok($$ select pg_temp.audit('00000000-0000-4000-8000-000000000a03', 'client-v') $$,
  'a viewer''s calls are written too');
select pg_temp.login('00000000-0000-4000-8000-000000000a04', 'client-s');
select throws_ok($$ select pg_temp.audit('00000000-0000-4000-8000-000000000a04', 'client-s') $$, '42501', null,
  'a stranger cannot write into someone else''s space');
select pg_temp.login('00000000-0000-4000-8000-000000000a02');
select throws_ok($$ select pg_temp.audit('00000000-0000-4000-8000-000000000a02', 'client-e') $$, '42501', null,
  'the app session (no client_id) writes no journal rows');

-- reading: own calls, the owner sees every call of the space
select pg_temp.login('00000000-0000-4000-8000-000000000a01');
select is((select count(*) from public.mcp_audit_log), 2::bigint, 'the owner sees own and the viewer''s calls');
select pg_temp.login('00000000-0000-4000-8000-000000000a03');
select is((select count(*) from public.mcp_audit_log), 1::bigint, 'the viewer sees only own calls');
select pg_temp.login('00000000-0000-4000-8000-000000000a02');
select is((select count(*) from public.mcp_audit_log), 0::bigint, 'an editor does not see other members'' calls');
select pg_temp.login('00000000-0000-4000-8000-000000000a01');
select throws_ok($$ update public.mcp_audit_log set outcome = 'error' $$, '42501', null, 'nobody rewrites the journal');
select throws_ok($$ delete from public.mcp_audit_log $$, '42501', null, 'nobody deletes the journal');

-- no delete for an OAuth client: through a security definer RPC and directly
reset role;
insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000a01'::uuid, ledger_id, 'Card', 'bank', 'UAH', 100000, '2026-10-01'::date
from spaces;
select pg_temp.login('00000000-0000-4000-8000-000000000a01', 'client-a');
select lives_ok($$ select public.create_operation(jsonb_build_object('id', 'b0000000-0000-4000-8000-000000000a01',
  'ledger_id', pg_temp.space(), 'kind', 'expense', 'account_id', 'a0000000-0000-4000-8000-000000000a01',
  'amount_minor', 1500, 'currency', 'UAH', 'occurred_at', '2026-10-06T10:00:00Z')) $$,
  'an OAuth client of an owner adds an operation');
select throws_ok($$ select public.delete_operation('b0000000-0000-4000-8000-000000000a01', 1) $$, '42501', null,
  'an OAuth client cannot delete an operation through delete_operation');
select pg_temp.login('00000000-0000-4000-8000-000000000a01');
select lives_ok($$ select public.delete_operation('b0000000-0000-4000-8000-000000000a01', 1) $$,
  'the app session deletes the same operation');

insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example.com/a01', 'key', 'auth');
select pg_temp.login('00000000-0000-4000-8000-000000000a01', 'client-a');
select throws_ok($$ delete from public.push_subscriptions $$, '42501', null, 'an OAuth client cannot delete directly');
select pg_temp.login('00000000-0000-4000-8000-000000000a01');
delete from public.push_subscriptions;
reset role;
select is((select count(*) from public.push_subscriptions where user_id = '00000000-0000-4000-8000-000000000a01'),
  0::bigint, 'the app session deletes its own row');

select * from finish();
rollback;
