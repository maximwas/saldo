-- The system category «Subscriptions» (system_subscriptions_category.sql) on the four roles (owner, editor, viewer, outsider):
-- every space has one, nobody renames, archives or deletes it, a new subscription takes it, and emptying the space
-- brings it back. Fictional data only.
begin;
select plan(13);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000501', 'pgtap-sys-owner@example.com'),
  ('00000000-0000-4000-8000-000000000502', 'pgtap-sys-editor@example.com'),
  ('00000000-0000-4000-8000-000000000503', 'pgtap-sys-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000504', 'pgtap-sys-outsider@example.com');

create temp table space (ledger_id uuid);
insert into space select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000501';
grant select on space to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000502'::uuid, 'editor' from space
union all
select ledger_id, '00000000-0000-4000-8000-000000000503'::uuid, 'viewer' from space;

-- ids are taken before the roles log in: an outsider's RLS shows no categories at all
create temp table ids as select
  (select id from public.categories where ledger_id = (select ledger_id from space) and system_key = 'subscriptions') as sys,
  (select id from public.categories where ledger_id = (select ledger_id from space) and name = 'Інше' and kind = 'expense') as other;
grant select on ids to authenticated;

select is((select count(*)::int from public.categories where ledger_id = (select ledger_id from space) and system_key = 'subscriptions'),
  1, 'a new space has one system «Subscriptions»');
select is((select name from public.categories where id = (select sys from ids)), 'Підписки', 'it is «Підписки»');

select pg_temp.login('00000000-0000-4000-8000-000000000501');
select throws_ok($$ update public.categories set name = 'Сервіси' where id = (select sys from ids) $$,
  '42501', null, 'owner cannot rename it');
select throws_ok($$ select public.archive_category((select sys from ids)) $$, '42501', null, 'owner cannot archive it');
select lives_ok($$ update public.categories set color = 'violet', sort_order = 1 where id = (select sys from ids) $$,
  'owner recolours and moves it in the list');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000502');
select throws_ok(format('select public.delete_category(%L, %L)', (select sys from ids), (select other from ids)),
  '42501', null, 'editor cannot delete it');
select throws_ok($$ delete from public.categories where id = (select sys from ids) $$, '42501', null, 'not even directly');
with s as (
  insert into public.subscriptions (ledger_id, name, currency, first_on, category_id)
  values ((select ledger_id from space), 'Сервіс', 'UAH', '2026-11-01', (select other from ids)) returning category_id
)
select is(category_id, (select sys from ids), 'a new subscription takes it, whatever category is sent') from s;
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000503');
with u as (update public.categories set name = 'x' where id = (select sys from ids) returning 1)
select is(count(*)::int, 0, 'viewer changes nothing') from u;
select throws_ok(format('select public.delete_category(%L)', (select sys from ids)), '42501', null, 'viewer cannot delete it');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000504');
select throws_ok(format('select public.delete_category(%L)', (select sys from ids)), '42501', null, 'outsider cannot delete it');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000501');
select lives_ok($$ select public.delete_ledger_data((select ledger_id from space)) $$, 'owner empties the space');
reset role;
select is((select count(*)::int from public.categories where ledger_id = (select ledger_id from space) and system_key = 'subscriptions'),
  1, 'the emptied space has its system category again');

select * from finish();
rollback;
