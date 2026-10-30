-- Receipts of deleted operations (migration storage_and_guards): every path that deletes an operation takes its
-- attachment rows, and only the daily cron (service_role) lists the files left with no row. Fictional data only.
begin;
select plan(10);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

insert into auth.users (id, email) values ('00000000-0000-4000-8000-000000000401', 'pgtap-files-owner@example.com');
create temp table spaces (ledger_id uuid);
insert into spaces select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000401';
grant select on spaces to authenticated, service_role;

create function pg_temp.space() returns uuid language sql as $$ select ledger_id from spaces $$;
create function pg_temp.op(p_id uuid, p_amount bigint) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space(), 'kind', 'expense',
    'account_id', 'a0000000-0000-4000-8000-000000000401', 'amount_minor', p_amount, 'currency', 'UAH',
    'occurred_at', '2026-10-15T10:00:00Z')
$$;
-- a receipt row; the path is {ledger_id}/operation/{operation_id}/{file}
create function pg_temp.receipt(p_owner uuid, p_file text) returns void language sql as $$
  insert into public.attachments (ledger_id, owner_type, owner_id, storage_path, mime, size_bytes)
  values (pg_temp.space(), 'operation', p_owner, pg_temp.space() || '/operation/' || p_owner || '/' || p_file,
    'image/jpeg', 1000)
$$;
create function pg_temp.receipts(p_owner uuid) returns int language sql as $$
  select count(*)::int from public.attachments where owner_id = p_owner
$$;

insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000401'::uuid, pg_temp.space(), 'Картка', 'bank', 'UAH', 100000, '2026-10-01'::date
union all
select 'a0000000-0000-4000-8000-000000000402'::uuid, pg_temp.space(), 'Готівка', 'cash', 'UAH', 0, '2026-10-01'::date;
insert into public.obligations (id, ledger_id, title, occurrence_on, due_on, planned_amount_minor, currency)
values ('d0000000-0000-4000-8000-000000000401', pg_temp.space(), 'Інтернет', current_date + 3, current_date + 3, 35000, 'UAH');

-- two expenses, one payment with a new operation, one transfer; each operation has a receipt
select pg_temp.login('00000000-0000-4000-8000-000000000401');
do $$
begin
  perform public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000401', 10000));
  perform public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000402', 20000));
  perform public.pay_obligation('e0000000-0000-4000-8000-000000000401', 'd0000000-0000-4000-8000-000000000401', 1,
    35000, pg_temp.op('b0000000-0000-4000-8000-000000000403', 35000));
  perform public.create_transfer(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000401',
    'ledger_id', pg_temp.space(), 'from_account_id', 'a0000000-0000-4000-8000-000000000401', 'from_amount_minor', 5000,
    'from_currency', 'UAH', 'to_account_id', 'a0000000-0000-4000-8000-000000000402', 'to_amount_minor', 5000,
    'to_currency', 'UAH', 'occurred_at', '2026-10-15T10:00:00Z'));
  perform pg_temp.receipt('b0000000-0000-4000-8000-000000000401', 'a.jpg');
  perform pg_temp.receipt('b0000000-0000-4000-8000-000000000402', 'b.jpg');
  perform pg_temp.receipt('b0000000-0000-4000-8000-000000000403', 'c.jpg');
  perform pg_temp.receipt(id, 'leg.jpg') from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000401';
end $$;

select lives_ok($$ select public.delete_operation('b0000000-0000-4000-8000-000000000401', 1) $$,
  'owner deletes an operation with a receipt');
select is(pg_temp.receipts('b0000000-0000-4000-8000-000000000401'), 0, 'deleting an operation removes its receipt rows');
select is(pg_temp.receipts('b0000000-0000-4000-8000-000000000402'), 1, 'other operations keep their receipts');
select lives_ok($$ select public.delete_obligation_payment('e0000000-0000-4000-8000-000000000401', true) $$,
  'owner cancels a payment together with its operation');
select is(pg_temp.receipts('b0000000-0000-4000-8000-000000000403'), 0,
  'cancelling a payment with its operation removes the operation''s receipt rows');
select lives_ok(
  $$ select public.delete_operation((select id from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000401'
       and kind = 'transfer_in'), 1) $$,
  'owner deletes a transfer through one of its legs');
select is((select count(*)::int from public.attachments where storage_path like '%/leg.jpg'), 0,
  'deleting a transfer removes the receipt rows of both legs');
reset role;

-- files: one whose row is gone (2 days old), one just uploaded with no row yet, one that still has its row
insert into storage.objects (bucket_id, name, created_at) values
  ('attachments', pg_temp.space() || '/operation/b0000000-0000-4000-8000-000000000401/a.jpg', now() - interval '2 days'),
  ('attachments', pg_temp.space() || '/operation/b0000000-0000-4000-8000-000000000401/fresh.jpg', now()),
  ('attachments', pg_temp.space() || '/operation/b0000000-0000-4000-8000-000000000402/b.jpg', now() - interval '2 days');

set local role service_role;
select is(
  (select array_agg(path order by path) from public.list_orphan_attachments() path where path like pg_temp.space() || '/%'),
  array[pg_temp.space() || '/operation/b0000000-0000-4000-8000-000000000401/a.jpg'],
  'the cron lists only files with no row that are older than a day');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000401');
select throws_ok($$ select public.list_orphan_attachments() $$, '42501', null,
  'a signed-in person cannot list the files of all spaces');
reset role;
set local role anon;
select throws_ok($$ select public.list_orphan_attachments() $$, '42501', null, 'anon cannot list them either');
reset role;

select * from finish();
rollback;
