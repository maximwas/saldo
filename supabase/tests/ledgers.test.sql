-- RLS of spaces on four roles: owner, editor, viewer, stranger (docs/conventions.md §0, §6.2).
-- Auth by hand (`role` + `request.jwt.claims`) instead of basejump-supabase_test_helpers: see docs/conventions.md §6.2.
begin;
select plan(34);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000001', 'owner@example.com'),
  ('00000000-0000-4000-8000-000000000002', 'editor@example.com'),
  ('00000000-0000-4000-8000-000000000003', 'viewer@example.com'),
  ('00000000-0000-4000-8000-000000000004', 'stranger@example.com');

create temp table t (ledger_id uuid);
insert into t select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000001';
grant select on t to authenticated;

-- Trigger on auth.users: own space + owner row + settings pointing at it
select is((select count(*)::int from public.ledger_members where role = 'owner'), 4, 'every new user owns one space');
select is(
  (select count(*)::int from public.user_settings s join public.ledger_members m
     on m.ledger_id = s.last_ledger_id and m.user_id = s.user_id and m.role = 'owner'),
  4, 'user_settings.last_ledger_id points at the own space');
select is((select count(*)::int from pg_tables where schemaname = 'public' and not rowsecurity), 0, 'RLS on every public table');

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000002'::uuid, 'editor' from t
union all
select ledger_id, '00000000-0000-4000-8000-000000000003'::uuid, 'viewer' from t;
insert into public.ledger_invites (ledger_id, email, role, token_hash, created_by)
select ledger_id, 'friend@example.com', 'viewer', sha256('setup-token'), '00000000-0000-4000-8000-000000000001' from t;

-- owner
select pg_temp.login('00000000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.ledgers), 1, 'owner sees own space');
select is((select count(*)::int from public.ledger_members), 3, 'owner sees all three members');
select is((select count(*)::int from public.ledger_invites), 1, 'owner sees the invite');
with u as (update public.ledgers set name = 'Спільний' where id = (select ledger_id from t) returning 1)
select is(count(*)::int, 1, 'owner renames the space') from u;
select lives_ok(
  $$ insert into public.ledger_invites (ledger_id, email, role, token_hash) select ledger_id, 'other@example.com', 'editor', sha256('owner-token') from t $$,
  'owner invites');
with u as (update public.ledger_members set role = 'viewer' where user_id = '00000000-0000-4000-8000-000000000002' returning 1)
select is(count(*)::int, 1, 'owner changes a role') from u;
update public.ledger_members set role = 'editor' where user_id = '00000000-0000-4000-8000-000000000002';
select throws_ok(
  $$ update public.ledger_members set role = 'owner' where user_id = '00000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'owner cannot make a second owner');
with u as (update public.ledger_members set role = 'editor' where user_id = '00000000-0000-4000-8000-000000000001' returning 1)
select is(count(*)::int, 0, 'owner cannot demote self') from u;
with d as (delete from public.ledger_members where user_id = '00000000-0000-4000-8000-000000000001' returning 1)
select is(count(*)::int, 0, 'owner cannot remove self') from d;
select throws_ok(
  $$ update public.ledgers set created_by = '00000000-0000-4000-8000-000000000004' where id = (select ledger_id from t) $$,
  '42501', null, 'created_by cannot be changed');
reset role;

-- editor
select pg_temp.login('00000000-0000-4000-8000-000000000002');
select is((select count(*)::int from public.ledgers), 2, 'editor sees own and shared space');
select ok((select ledger_id from t) in (select private.my_writable_ledger_ids()), 'editor can write to the shared space');
select is((select count(*)::int from public.ledger_invites), 0, 'editor does not see invites');
select throws_ok(
  $$ insert into public.ledger_invites (ledger_id, email, role, token_hash) select ledger_id, 'x@example.com', 'editor', sha256('editor-token') from t $$,
  '42501', null, 'editor cannot invite');
with u as (update public.ledger_members set role = 'editor' where user_id = '00000000-0000-4000-8000-000000000003' returning 1)
select is(count(*)::int, 0, 'editor cannot change roles') from u;
with u as (update public.ledgers set name = 'x' where id = (select ledger_id from t) returning 1)
select is(count(*)::int, 0, 'editor cannot edit space settings') from u;
reset role;
select is(
  (select role from public.ledger_members where user_id = '00000000-0000-4000-8000-000000000003' and ledger_id = (select ledger_id from t)),
  'viewer', 'viewer role unchanged after the editor attempt');

-- viewer
select pg_temp.login('00000000-0000-4000-8000-000000000003');
select is((select count(*)::int from public.ledgers), 2, 'viewer sees own and shared space');
select ok((select ledger_id from t) not in (select private.my_writable_ledger_ids()), 'viewer cannot write to the shared space');
select throws_ok(
  $$ insert into public.ledger_invites (ledger_id, email, role, token_hash) select ledger_id, 'y@example.com', 'viewer', sha256('viewer-token') from t $$,
  '42501', null, 'viewer gets 42501 on write');
with u as (update public.ledgers set name = 'y' where id = (select ledger_id from t) returning 1)
select is(count(*)::int, 0, 'viewer cannot edit the space') from u;
with d as (delete from public.ledger_members where user_id = '00000000-0000-4000-8000-000000000002' returning 1)
select is(count(*)::int, 0, 'viewer cannot remove another member') from d;
with d as (delete from public.ledger_members where user_id = '00000000-0000-4000-8000-000000000003' returning 1)
select is(count(*)::int, 1, 'viewer leaves the space') from d;
reset role;

-- stranger
select pg_temp.login('00000000-0000-4000-8000-000000000004');
select is((select count(*)::int from public.ledgers where id = (select ledger_id from t)), 0, 'stranger does not see the space');
select is((select count(*)::int from public.ledger_members where ledger_id = (select ledger_id from t)), 0, 'stranger sees no members');
select is((select count(*)::int from public.ledger_invites), 0, 'stranger sees no invites');
select is((select count(*)::int from public.user_settings), 1, 'stranger sees only own settings');
select throws_ok(
  $$ insert into public.ledger_invites (ledger_id, email, role, token_hash) select ledger_id, 'z@example.com', 'viewer', sha256('stranger-token') from t $$,
  '42501', null, 'stranger cannot invite into a foreign space');
with u as (update public.user_settings set locale = 'en' where user_id = '00000000-0000-4000-8000-000000000001' returning 1)
select is(count(*)::int, 0, 'stranger cannot touch foreign settings') from u;
reset role;

-- anon
set local role anon;
select throws_ok($$ select 1 from public.ledgers $$, '42501', null, 'anon has no access to ledgers');
reset role;
select is(
  (select count(*)::int from information_schema.routine_privileges
    where routine_schema = 'private' and grantee in ('anon', 'PUBLIC')),
  0, 'private functions are not executable by anon or public');

select * from finish();
rollback;
