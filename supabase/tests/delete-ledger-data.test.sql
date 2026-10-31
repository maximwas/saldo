-- "Delete all data" (migration delete_ledger_data): only the owner empties the space; the space, its members and
-- invites stay, every data row goes, and the call returns the Storage paths of the receipts. Fictional data only.
begin;
select plan(9);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000501', 'pgtap-wipe-owner@example.com'),
  ('00000000-0000-4000-8000-000000000502', 'pgtap-wipe-editor@example.com'),
  ('00000000-0000-4000-8000-000000000503', 'pgtap-wipe-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000504', 'pgtap-wipe-stranger@example.com');

create temp table spaces (ledger_id uuid);
insert into spaces select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000501';
grant select on spaces to authenticated;
create function pg_temp.space() returns uuid language sql as $$ select ledger_id from spaces $$;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000502'::uuid, 'editor' from spaces
union all
select ledger_id, '00000000-0000-4000-8000-000000000503'::uuid, 'viewer' from spaces;
update public.ledgers set name = 'Сімейний' where id = pg_temp.space();
insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
values ('a0000000-0000-4000-8000-000000000501', pg_temp.space(), 'Картка', 'bank', 'UAH', 100000, '2026-10-01');

select pg_temp.login('00000000-0000-4000-8000-000000000501');
select public.create_operation(jsonb_build_object('id', 'b0000000-0000-4000-8000-000000000501',
  'ledger_id', pg_temp.space(), 'kind', 'expense', 'account_id', 'a0000000-0000-4000-8000-000000000501',
  'amount_minor', 12550, 'currency', 'UAH', 'occurred_at', '2026-10-15T10:00:00Z'));
reset role;
insert into public.attachments (ledger_id, owner_type, owner_id, storage_path, mime, size_bytes)
values (pg_temp.space(), 'operation', 'b0000000-0000-4000-8000-000000000501',
  pg_temp.space() || '/operation/b0000000-0000-4000-8000-000000000501/a.jpg', 'image/jpeg', 1000);

select pg_temp.login('00000000-0000-4000-8000-000000000502');
select throws_ok($$ select public.delete_ledger_data(pg_temp.space()) $$, '42501', null, 'an editor cannot delete the data');
select pg_temp.login('00000000-0000-4000-8000-000000000503');
select throws_ok($$ select public.delete_ledger_data(pg_temp.space()) $$, '42501', null, 'a viewer cannot delete the data');
select pg_temp.login('00000000-0000-4000-8000-000000000504');
select throws_ok($$ select public.delete_ledger_data(pg_temp.space()) $$, '42501', null, 'a stranger cannot delete the data');

select pg_temp.login('00000000-0000-4000-8000-000000000501');
select results_eq($$ select public.delete_ledger_data(pg_temp.space()) $$,
  $$ values (pg_temp.space() || '/operation/b0000000-0000-4000-8000-000000000501/a.jpg') $$,
  'the owner deletes the data and gets the receipt paths back');
reset role;

select is((select count(*)::int from public.operations where ledger_id = pg_temp.space()), 0, 'operations are gone');
select is((select count(*)::int from public.accounts where ledger_id = pg_temp.space()), 0, 'accounts are gone');
select is((select count(*)::int from public.attachments where ledger_id = pg_temp.space()), 0, 'attachment rows are gone');
select is((select name from public.ledgers where id = pg_temp.space()), 'Сімейний', 'the space itself stays');
select is((select count(*)::int from public.ledger_members where ledger_id = pg_temp.space()), 3,
  'owner, editor and viewer keep their access');

select * from finish();
rollback;
