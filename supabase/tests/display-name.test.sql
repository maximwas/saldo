-- Own name in a space (migration member_display_name): every member sets their own display_name through
-- set_my_display_name and nothing else of their row. Fictional data only.
begin;
select plan(11);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000401', 'pgtap-name-owner@example.com'),
  ('00000000-0000-4000-8000-000000000402', 'pgtap-name-editor@example.com'),
  ('00000000-0000-4000-8000-000000000403', 'pgtap-name-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000404', 'pgtap-name-stranger@example.com');

create temp table spaces (ledger_id uuid);
insert into spaces select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000401';
grant select on spaces to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000402'::uuid, 'editor' from spaces
union all
select ledger_id, '00000000-0000-4000-8000-000000000403'::uuid, 'viewer' from spaces;

create function pg_temp.space() returns uuid language sql as $$ select ledger_id from spaces $$;
-- read as the test owner (postgres): the row as it really is, whoever is logged in
create function pg_temp.member(p_user uuid) returns text[] language sql as $$
  select array[role, display_name] from public.ledger_members where ledger_id = pg_temp.space() and user_id = p_user
$$;

select pg_temp.login('00000000-0000-4000-8000-000000000401');
select lives_ok($$ select public.set_my_display_name(pg_temp.space(), '  Олена  ') $$, 'the owner sets their own name');
select pg_temp.login('00000000-0000-4000-8000-000000000402');
select lives_ok($$ select public.set_my_display_name(pg_temp.space(), 'Тарас') $$, 'an editor sets their own name');
select pg_temp.login('00000000-0000-4000-8000-000000000403');
select lives_ok($$ select public.set_my_display_name(pg_temp.space(), 'Ліна') $$, 'a viewer sets their own name');
select pg_temp.login('00000000-0000-4000-8000-000000000404');
select throws_ok($$ select public.set_my_display_name(pg_temp.space(), 'Чужий') $$, '42501', null,
  'a stranger cannot set a name in someone else''s space');

select pg_temp.login('00000000-0000-4000-8000-000000000403');
select throws_ok($$ select public.set_my_display_name(pg_temp.space(), repeat('я', 61)) $$, '22023', null,
  'a name longer than 60 characters is refused');
-- direct updates of the own row still match nothing (owner-only, never the owner row)
update public.ledger_members set role = 'editor', display_name = 'Хакер'
where ledger_id = pg_temp.space() and user_id = '00000000-0000-4000-8000-000000000403';
select pg_temp.login('00000000-0000-4000-8000-000000000402');
update public.ledger_members set role = 'owner'
where ledger_id = pg_temp.space() and user_id = '00000000-0000-4000-8000-000000000402';
reset role;

select is(pg_temp.member('00000000-0000-4000-8000-000000000401'), array['owner', 'Олена'],
  'the owner''s name is trimmed and the role stays');
select is(pg_temp.member('00000000-0000-4000-8000-000000000402'), array['editor', 'Тарас'],
  'an editor cannot raise their own role');
select is(pg_temp.member('00000000-0000-4000-8000-000000000403'), array['viewer', 'Ліна'],
  'a viewer changes only the name, and only through the RPC');

select pg_temp.login('00000000-0000-4000-8000-000000000403');
select lives_ok($$ select public.set_my_display_name(pg_temp.space(), '   ') $$, 'a blank name clears it');
reset role;
select is(pg_temp.member('00000000-0000-4000-8000-000000000403'), array['viewer', null],
  'a blank name is stored as null (the UI falls back to the email prefix)');

select ok(not has_function_privilege('anon', 'public.set_my_display_name(uuid, text)', 'execute'),
  'anon cannot call it');

select * from finish();
rollback;
