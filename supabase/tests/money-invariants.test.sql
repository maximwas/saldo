-- Invariants an adversarial review of PR #21 broke with plain calls (2026-10-30); each block failed before its fix.
-- Money moves only through the RPCs (operations, transfers, obligation_payments are read-only for clients), every RPC
-- checks the write role itself, and no call makes money out of nothing. Fictional data only.
begin;
select plan(48);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000201', 'pgtap-inv-owner@example.com'),
  ('00000000-0000-4000-8000-000000000202', 'pgtap-inv-editor@example.com'),
  ('00000000-0000-4000-8000-000000000203', 'pgtap-inv-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000204', 'pgtap-inv-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000201'
union all
select 'stranger', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000204';
grant select on spaces to authenticated;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000202'::uuid, 'editor' from spaces where name = 'shared'
union all
select ledger_id, '00000000-0000-4000-8000-000000000203'::uuid, 'viewer' from spaces where name = 'shared';

create function pg_temp.space(p_name text) returns uuid language sql as $$
  select ledger_id from spaces where name = p_name
$$;
create function pg_temp.cat(p_name text, p_kind text) returns uuid language sql as $$
  select id from public.categories where ledger_id = pg_temp.space('shared') and name = p_name and kind = p_kind
$$;
create function pg_temp.op(p_id uuid, p_kind text, p_account uuid, p_amount bigint, p_currency text) returns jsonb
language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space('shared'), 'kind', p_kind, 'account_id', p_account,
    'amount_minor', p_amount, 'currency', p_currency, 'occurred_at', '2026-10-06T10:00:00Z')
$$;
create function pg_temp.transfer(p_id uuid, p_amount bigint, p_fee bigint) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space('shared'),
    'from_account_id', 'a0000000-0000-4000-8000-000000000201', 'from_amount_minor', p_amount, 'from_currency', 'UAH',
    'to_account_id', 'a0000000-0000-4000-8000-000000000202', 'to_amount_minor', p_amount, 'to_currency', 'UAH',
    'fee_minor', p_fee, 'occurred_at', '2026-10-06T10:00:00Z')
$$;
create function pg_temp.balance(p_account uuid) returns bigint language sql as $$
  select balance_minor from public.account_balances where account_id = p_account
$$;

-- card UAH 1 000.00, savings UAH, a USD account; the stranger's own card
insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000201'::uuid, ledger_id, 'Картка', 'bank', 'UAH', 100000, '2026-10-01'::date
from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000202'::uuid, ledger_id, 'Ощадний', 'savings', 'UAH', 0, '2026-10-01'::date
from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000203'::uuid, ledger_id, 'Валютний', 'bank', 'USD', 0, '2026-10-01'::date
from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000204'::uuid, ledger_id, 'Чужа', 'cash', 'UAH', 0, '2026-10-01'::date
from spaces where name = 'stranger';
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on)
values (pg_temp.space('shared'), 'USD', 'UAH', 41.5, '2026-10-01');
insert into public.obligations (id, ledger_id, title, occurrence_on, due_on, planned_amount_minor, currency)
values
  ('d0000000-0000-4000-8000-000000000201', pg_temp.space('shared'), 'Оренда', current_date, current_date, 30000, 'UAH'),
  ('d0000000-0000-4000-8000-000000000202', pg_temp.space('shared'), 'Кредит', current_date, current_date, 100000000, 'UAH'),
  ('d0000000-0000-4000-8000-000000000203', pg_temp.space('shared'), 'Інтернет', current_date, current_date, 35000, 'UAH');

select pg_temp.login('00000000-0000-4000-8000-000000000201');

-- 1. a payment made by a transfer leg, cancelled with its operation, takes the whole transfer
select lives_ok(
  $$ select public.create_transfer(pg_temp.transfer('c0000000-0000-4000-8000-000000000201', 30000, 500)) $$,
  'owner moves 300.00 to savings with a 5.00 fee');
select is(
  (select state from public.pay_obligation('e0000000-0000-4000-8000-000000000201', 'd0000000-0000-4000-8000-000000000201', 1,
     30000, p_existing_operation_id => (select id from public.operations
       where transfer_id = 'c0000000-0000-4000-8000-000000000201' and kind = 'transfer_out'))),
  'paid', 'a transfer leg may pay an obligation');
select lives_ok(
  $$ select * from public.delete_obligation_payment('e0000000-0000-4000-8000-000000000201', true) $$,
  'owner cancels that payment together with its operation');
select is(
  (select count(*)::int from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000201')
    + (select count(*)::int from public.transfers where id = 'c0000000-0000-4000-8000-000000000201'),
  0, 'deleting a transfer leg through its payment deletes both legs, the fee and the transfer');
select is(
  array[pg_temp.balance('a0000000-0000-4000-8000-000000000201'), pg_temp.balance('a0000000-0000-4000-8000-000000000202')],
  array[100000, 0]::bigint[], 'both balances are back: no money out of nothing');

-- 2. the fee deleted alone leaves no fee on the transfer
select lives_ok(
  $$ select public.create_transfer(pg_temp.transfer('c0000000-0000-4000-8000-000000000202', 10000, 300)) $$,
  'owner moves 100.00 with a 3.00 fee');
select lives_ok(
  $$ select public.delete_operation((select id from public.operations
       where transfer_id = 'c0000000-0000-4000-8000-000000000202' and kind = 'expense'), 1) $$,
  'owner deletes the fee alone');
select is((select fee_minor from public.transfers where id = 'c0000000-0000-4000-8000-000000000202'), null::bigint,
  'a deleted fee leaves the transfer without fee_minor');
select is(pg_temp.balance('a0000000-0000-4000-8000-000000000201'), 90000::bigint, 'the transfer stays, the fee is gone');

-- 3. a missing expected version is a conflict, never a pass
select lives_ok(
  $$ select public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000201', 'expense',
       'a0000000-0000-4000-8000-000000000201', 1000, 'UAH')) $$,
  'owner spends 10.00');
select throws_ok(
  $$ select public.update_operation('b0000000-0000-4000-8000-000000000201', null, '{"amount_minor": 2000}') $$,
  'PT409', null, 'an update without an expected version is a conflict');
select throws_ok(
  $$ select public.delete_operation('b0000000-0000-4000-8000-000000000201', null) $$,
  'PT409', null, 'a delete without an expected version is a conflict');
select throws_ok(
  $$ select * from public.pay_obligation(gen_random_uuid(), 'd0000000-0000-4000-8000-000000000203', null, 100,
       p_existing_operation_id => 'b0000000-0000-4000-8000-000000000201') $$,
  'PT409', null, 'a payment without an expected version is a conflict');

-- 5. the base currency is the space's, whatever the client sends
select is(
  (select array[base_currency, base_amount_minor::text] from public.create_operation(
     pg_temp.op('b0000000-0000-4000-8000-000000000202', 'expense', 'a0000000-0000-4000-8000-000000000201', 1000, 'UAH')
       || '{"base_currency": "USD"}')),
  array['UAH', '1000'], 'the base-currency snapshot ignores a client base_currency');

-- 4. payments are measured in the operation currency
select lives_ok(
  $$ select public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000203', 'expense',
       'a0000000-0000-4000-8000-000000000203', 100, 'USD')) $$,
  'owner spends 1.00 USD');
select throws_ok(
  $$ select * from public.pay_obligation('e0000000-0000-4000-8000-000000000202', 'd0000000-0000-4000-8000-000000000202', 1,
       100000000, p_existing_operation_id => 'b0000000-0000-4000-8000-000000000203') $$,
  '23514', null, 'a 1.00 USD operation cannot pay 1 000 000.00 USD toward a UAH obligation');
select is(
  (select paid_minor from public.pay_obligation('e0000000-0000-4000-8000-000000000203', 'd0000000-0000-4000-8000-000000000202', 1,
     100, p_existing_operation_id => 'b0000000-0000-4000-8000-000000000203')),
  4150::bigint, 'the whole 1.00 USD pays 41.50 UAH');
select throws_ok(
  $$ select * from public.pay_obligation('e0000000-0000-4000-8000-000000000204', 'd0000000-0000-4000-8000-000000000203',
       (select version from public.obligations where id = 'd0000000-0000-4000-8000-000000000203'), 1,
       p_existing_operation_id => 'b0000000-0000-4000-8000-000000000203') $$,
  '23514', null, 'a used-up foreign-currency operation cannot pay another obligation');

-- 8, 9. category kinds and depth
select throws_ok(
  $$ insert into public.obligations (ledger_id, title, occurrence_on, due_on, currency, category_id)
     values (pg_temp.space('shared'), 'Аванс', current_date, current_date, 'UAH', pg_temp.cat('Зарплата', 'income')) $$,
  '23503', null, 'an expense obligation cannot take an income category');
select lives_ok(
  $$ insert into public.categories (id, ledger_id, kind, parent_id, name)
     values ('f0000000-0000-4000-8000-000000000201', pg_temp.space('shared'), 'expense', pg_temp.cat('Продукти', 'expense'), 'Овочі') $$,
  'owner adds a subcategory');
select throws_ok(
  $$ insert into public.categories (ledger_id, kind, parent_id, name)
     values (pg_temp.space('shared'), 'expense', 'f0000000-0000-4000-8000-000000000201', 'Морква') $$,
  '23503', null, 'a subcategory has no subcategories of its own');
select throws_ok(
  $$ update public.categories set parent_id = pg_temp.cat('Кафе', 'expense') where id = pg_temp.cat('Продукти', 'expense') $$,
  '23503', null, 'a category with subcategories cannot become a subcategory');
reset role;

-- 7. editors write money only through the RPCs
select pg_temp.login('00000000-0000-4000-8000-000000000202');
select throws_ok(sql, '42501', null, 'editor cannot ' || name || ' past the RPCs')
from (values
  ('insert an operation', format($$ insert into public.operations (ledger_id, kind, direction, account_id, amount_minor,
     currency, occurred_at, occurred_on, base_currency) values (%L, 'income', 'in', 'a0000000-0000-4000-8000-000000000201',
     100, 'UAH', now(), current_date, 'UAH') $$, pg_temp.space('shared'))),
  ('update an operation', $$ update public.operations set amount_minor = 1 where id = 'b0000000-0000-4000-8000-000000000201' $$),
  ('delete an operation', $$ delete from public.operations where id = 'b0000000-0000-4000-8000-000000000201' $$),
  ('insert a transfer', format($$ insert into public.transfers (ledger_id, from_account_id, from_amount_minor, from_currency,
     to_account_id, to_amount_minor, to_currency, occurred_at) values (%L, 'a0000000-0000-4000-8000-000000000201', 100, 'UAH',
     'a0000000-0000-4000-8000-000000000202', 100, 'UAH', now()) $$, pg_temp.space('shared'))),
  ('update a transfer', $$ update public.transfers set to_amount_minor = 1 where id = 'c0000000-0000-4000-8000-000000000202' $$),
  ('delete a transfer', $$ delete from public.transfers where id = 'c0000000-0000-4000-8000-000000000202' $$),
  ('insert a payment', format($$ insert into public.obligation_payments (ledger_id, obligation_id, operation_id, amount_minor)
     values (%L, 'd0000000-0000-4000-8000-000000000203', 'b0000000-0000-4000-8000-000000000201', 1) $$, pg_temp.space('shared'))),
  ('update a payment', $$ update public.obligation_payments set amount_minor = 1 where id = 'e0000000-0000-4000-8000-000000000203' $$),
  ('delete a payment', $$ delete from public.obligation_payments where id = 'e0000000-0000-4000-8000-000000000203' $$)
) as t (name, sql);
reset role;

-- 7. viewer and stranger get 42501 from every write RPC; ids are literal, the stranger cannot look them up
create temp table rpc_calls (name text, sql text);
insert into rpc_calls values
  ('create_operation', format('select public.create_operation(%L)',
     pg_temp.op(gen_random_uuid(), 'expense', 'a0000000-0000-4000-8000-000000000201', 100, 'UAH'))),
  ('update_operation', $$ select public.update_operation('b0000000-0000-4000-8000-000000000201', 1, '{"note": "x"}') $$),
  ('delete_operation', $$ select public.delete_operation('b0000000-0000-4000-8000-000000000201', 1) $$),
  ('create_transfer', format('select public.create_transfer(%L)', pg_temp.transfer(gen_random_uuid(), 100, null))),
  ('pay_obligation', $$ select * from public.pay_obligation(gen_random_uuid(), 'd0000000-0000-4000-8000-000000000203', 1, 100,
     p_existing_operation_id => 'b0000000-0000-4000-8000-000000000201') $$),
  ('delete_obligation_payment', $$ select * from public.delete_obligation_payment('e0000000-0000-4000-8000-000000000203', true) $$),
  ('archive_category', format('select public.archive_category(%L)', pg_temp.cat('Авто', 'expense')));
grant select on rpc_calls to authenticated;

select pg_temp.login('00000000-0000-4000-8000-000000000203');
select throws_ok(sql, '42501', null, 'viewer gets 42501 from ' || name) from rpc_calls order by name;
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000204');
select throws_ok(sql, '42501', null, 'stranger gets 42501 from ' || name) from rpc_calls order by name;
reset role;

select ok(
  not bool_or(has_function_privilege('anon', f, 'execute') or has_function_privilege('public', f, 'execute')),
  'anon and public cannot execute any money write RPC')
from unnest(array['public.create_operation(jsonb)', 'public.update_operation(uuid, int, jsonb)',
  'public.delete_operation(uuid, int)', 'public.create_transfer(jsonb)',
  'public.pay_obligation(uuid, uuid, int, bigint, jsonb, uuid, boolean)', 'public.delete_obligation_payment(uuid, boolean)',
  'public.archive_category(uuid, uuid)']) f;

-- rule A for rates (the space has a manual USD→UAH 41.5 from 2026-10-01)
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on, source)
values (pg_temp.space('shared'), 'USD', 'UAH', 42, '2026-10-03', 'reference');
select is(private.convert_minor(pg_temp.space('shared'), 100, 'USD', 'UAH', '2026-10-06'), 4200::bigint,
  'a newer reference rate beats an older manual one');
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on, source)
values (pg_temp.space('shared'), 'USD', 'UAH', 43, '2026-10-04', 'manual'),
  (pg_temp.space('shared'), 'USD', 'UAH', 44, '2026-10-04', 'reference');
select is(private.convert_minor(pg_temp.space('shared'), 100, 'USD', 'UAH', '2026-10-06'), 4300::bigint,
  'on the same date a manual rate beats the reference one');

select * from finish();
rollback;
