-- Phase 1 money tables and RPCs on four roles: owner, editor, viewer, stranger (docs/conventions.md §0, §6.2).
-- Composite FKs keep every reference inside one space; RPCs are idempotent by client id and raise PT409 on a stale
-- version. Fictional data only.
begin;
select plan(74);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000101', 'pgtap-money-owner@example.com'),
  ('00000000-0000-4000-8000-000000000102', 'pgtap-money-editor@example.com'),
  ('00000000-0000-4000-8000-000000000103', 'pgtap-money-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000104', 'pgtap-money-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000101'
union all
select 'stranger', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000104';
grant select on spaces to authenticated;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000102'::uuid, 'editor' from spaces where name = 'shared'
union all
select ledger_id, '00000000-0000-4000-8000-000000000103'::uuid, 'viewer' from spaces where name = 'shared';

-- a: main card UAH 1 000.00; b: currency account USD; s: the stranger's own account
insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on, created_by)
select 'a0000000-0000-4000-8000-000000000001'::uuid, ledger_id, 'Основна картка', 'bank', 'UAH', 100000, '2026-10-01'::date,
  '00000000-0000-4000-8000-000000000101'::uuid from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000002'::uuid, ledger_id, 'Валютний', 'bank', 'USD', 0, '2026-10-01'::date,
  '00000000-0000-4000-8000-000000000101'::uuid from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000003'::uuid, ledger_id, 'Чужа картка', 'cash', 'UAH', 0, '2026-10-01'::date,
  '00000000-0000-4000-8000-000000000104'::uuid from spaces where name = 'stranger';

create function pg_temp.space(p_name text) returns uuid language sql as $$
  select ledger_id from spaces where name = p_name
$$;
create function pg_temp.cat(p_name text, p_kind text) returns uuid language sql as $$
  select id from public.categories where ledger_id = pg_temp.space('shared') and name = p_name and kind = p_kind
$$;
-- an operation payload in the shared space, keys = column names (what the client sends)
create function pg_temp.op(p_id uuid, p_kind text, p_account uuid, p_amount bigint, p_currency text,
  p_category uuid default null) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space('shared'), 'kind', p_kind, 'account_id', p_account,
    'amount_minor', p_amount, 'currency', p_currency, 'occurred_at', '2026-10-15T10:00:00Z', 'category_id', p_category)
$$;
create function pg_temp.balance(p_account uuid) returns bigint language sql as $$
  select balance_minor from public.account_balances where account_id = p_account
$$;

select is((select count(*)::int from public.categories where ledger_id = pg_temp.space('shared')), 15,
  'a new space starts with the standard categories of §6');
select is((select count(*)::int from public.categories where ledger_id = pg_temp.space('shared') and kind = 'income'), 4,
  'income and expense categories are separate');

-- owner
select pg_temp.login('00000000-0000-4000-8000-000000000101');
select lives_ok(
  $$ select public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000001', 'expense',
       'a0000000-0000-4000-8000-000000000001', 10000, 'UAH', pg_temp.cat('Продукти', 'expense'))) $$,
  'owner creates an expense');
select is(pg_temp.balance('a0000000-0000-4000-8000-000000000001'), 90000::bigint, 'the expense lowers the balance once');
select is(
  (public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000001', 'expense',
     'a0000000-0000-4000-8000-000000000001', 99999, 'UAH'))).amount_minor,
  10000::bigint, 'a repeated create returns the first row');
select is((select count(*)::int from public.operations where id = 'b0000000-0000-4000-8000-000000000001'), 1,
  'a repeated create writes no second row');
select is(
  (select array[direction, occurred_on::text, base_currency, base_amount_minor::text, created_by::text]
   from public.operations where id = 'b0000000-0000-4000-8000-000000000001'),
  array['out', '2026-10-15', 'UAH', '10000', '00000000-0000-4000-8000-000000000101'],
  'the server fills direction, local date, base snapshot and author');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'expense', 'a0000000-0000-4000-8000-000000000001', 100, 'USD')) $$,
  '23503', null, 'the operation currency is the account currency');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'income', 'a0000000-0000-4000-8000-000000000001', 100, 'UAH',
       pg_temp.cat('Продукти', 'expense'))) $$,
  '23503', null, 'income cannot take an expense category');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'expense', 'a0000000-0000-4000-8000-000000000003', 100, 'UAH')) $$,
  '23503', null, 'an operation cannot reference an account of another space');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'adjustment', 'a0000000-0000-4000-8000-000000000001', 100, 'UAH')
       || '{"direction": "in"}') $$,
  '23514', null, 'an adjustment needs a note');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'transfer_out', 'a0000000-0000-4000-8000-000000000001', 100, 'UAH')) $$,
  '22023', null, 'transfer legs come only from create_transfer');
select is(
  (public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000002', 'expense', 'a0000000-0000-4000-8000-000000000002',
     500, 'USD'))).base_amount_minor,
  null::bigint, 'a foreign-currency amount without a rate has an unknown base amount, not 0');

-- transfers: 415.00 UAH → 10.00 USD with a 5.00 UAH fee
select lives_ok(
  $$ select public.create_transfer(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000001', 'ledger_id', pg_temp.space('shared'),
       'from_account_id', 'a0000000-0000-4000-8000-000000000001', 'from_amount_minor', 41500, 'from_currency', 'UAH',
       'to_account_id', 'a0000000-0000-4000-8000-000000000002', 'to_amount_minor', 1000, 'to_currency', 'USD',
       'fee_minor', 500, 'occurred_at', '2026-10-14T09:00:00Z', 'occurred_on', '2026-10-14')) $$,
  'owner creates a transfer with a fee');
select is(
  (select array_agg(kind order by kind) from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000001'),
  array['expense', 'transfer_in', 'transfer_out'], 'a transfer is two legs plus the fee as an expense');
select is(pg_temp.balance('a0000000-0000-4000-8000-000000000001'), 48000::bigint, 'the source loses the amount and the fee');
select is(pg_temp.balance('a0000000-0000-4000-8000-000000000002'), 500::bigint, 'the target gains the received amount');
select lives_ok(
  $$ select public.create_transfer(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000001', 'ledger_id', pg_temp.space('shared'),
       'from_account_id', 'a0000000-0000-4000-8000-000000000001', 'from_amount_minor', 41500, 'from_currency', 'UAH',
       'to_account_id', 'a0000000-0000-4000-8000-000000000002', 'to_amount_minor', 1000, 'to_currency', 'USD',
       'fee_minor', 500, 'occurred_at', '2026-10-14T09:00:00Z')) $$,
  'a repeated transfer is accepted');
select is((select count(*)::int from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000001'), 3,
  'a repeated transfer writes nothing');
select throws_ok(
  $$ select public.create_transfer(jsonb_build_object('id', gen_random_uuid(), 'ledger_id', pg_temp.space('shared'),
       'from_account_id', 'a0000000-0000-4000-8000-000000000001', 'from_amount_minor', 100, 'from_currency', 'UAH',
       'to_account_id', 'a0000000-0000-4000-8000-000000000001', 'to_amount_minor', 100, 'to_currency', 'UAH',
       'occurred_at', '2026-10-14T09:00:00Z')) $$,
  '23514', null, 'a transfer needs two different accounts');

-- update / delete with versions
select is(
  (public.update_operation('b0000000-0000-4000-8000-000000000001', 1, '{"amount_minor": 12000}')).version, 2,
  'an update bumps the version');
select is(pg_temp.balance('a0000000-0000-4000-8000-000000000001'), 46000::bigint, 'the balance follows the edit');
select throws_ok(
  $$ select public.update_operation('b0000000-0000-4000-8000-000000000001', 1, '{"amount_minor": 13000}') $$,
  'PT409', null, 'a stale version is a conflict');
select throws_ok(
  $$ select public.update_operation((select id from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000001'
       and kind = 'transfer_out'), 1, '{"amount_minor": 1}') $$,
  '22023', null, 'a transfer leg is not edited alone');
select lives_ok(
  $$ select public.delete_operation((select id from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000001'
       and kind = 'transfer_in'), 1) $$,
  'owner deletes a transfer through one of its legs');
select is((select count(*)::int from public.operations where transfer_id = 'c0000000-0000-4000-8000-000000000001'), 0,
  'deleting a leg removes the whole transfer');

-- obligations: internet 350.00 due in 3 days; one without an amount; one already past
insert into public.obligations (id, ledger_id, title, occurrence_on, due_on, planned_amount_minor, currency)
values
  ('d0000000-0000-4000-8000-000000000001', pg_temp.space('shared'), 'Інтернет', current_date + 3, current_date + 3, 35000, 'UAH'),
  ('d0000000-0000-4000-8000-000000000002', pg_temp.space('shared'), 'Сервіс', current_date + 9, current_date + 9, null, 'UAH'),
  ('d0000000-0000-4000-8000-000000000003', pg_temp.space('shared'), 'Вода', current_date - 2, current_date - 2, 20000, 'UAH');
select is(
  (select array_agg(state order by obligation_id) from public.obligation_states where ledger_id = pg_temp.space('shared')),
  array['plan', 'plan', 'unconfirmed'], 'a past unconfirmed date is «unconfirmed», not overdue');
select is(
  (select remaining_minor from public.obligation_states where obligation_id = 'd0000000-0000-4000-8000-000000000002'),
  null::bigint, 'an unknown amount leaves the remainder unknown');
select is(
  (select state from public.pay_obligation('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, 35000,
     pg_temp.op('b0000000-0000-4000-8000-000000000003', 'expense', 'a0000000-0000-4000-8000-000000000001', 35000, 'UAH'))),
  'paid', 'paying the full amount makes the obligation paid');
select is(pg_temp.balance('a0000000-0000-4000-8000-000000000001'), 53000::bigint, 'the payment is one debit');
select is(
  (select paid_minor from public.pay_obligation('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, 35000,
     pg_temp.op('b0000000-0000-4000-8000-000000000003', 'expense', 'a0000000-0000-4000-8000-000000000001', 35000, 'UAH'))),
  35000::bigint, 'a replayed payment returns the state without writing');
select throws_ok(
  $$ select * from public.pay_obligation('e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 1, 35000,
       pg_temp.op(gen_random_uuid(), 'expense', 'a0000000-0000-4000-8000-000000000001', 35000, 'UAH')) $$,
  'PT409', null, 'a second payment from a stale screen is a conflict');
select is(
  (select state from public.delete_obligation_payment('e0000000-0000-4000-8000-000000000001')),
  'plan', 'cancelling the payment returns the obligation to plan');
select is((select count(*)::int from public.operations where id = 'b0000000-0000-4000-8000-000000000003'), 1,
  'cancelling a payment keeps its operation by default');
select is(
  (select state from public.pay_obligation('e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001',
     (select version from public.obligations where id = 'd0000000-0000-4000-8000-000000000001'), 35000,
     p_existing_operation_id => 'b0000000-0000-4000-8000-000000000003')),
  'paid', 'an existing operation is linked without a second debit');
select throws_ok(
  $$ select * from public.pay_obligation('e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 1, 100,
       p_existing_operation_id => 'b0000000-0000-4000-8000-000000000003') $$,
  '23514', null, 'the parts of one operation never exceed it');
select is(
  (select state from public.pay_obligation('e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 1, 5000,
     pg_temp.op('b0000000-0000-4000-8000-000000000004', 'expense', 'a0000000-0000-4000-8000-000000000001', 5000, 'UAH'))),
  'partial', 'a smaller amount is a partial payment');
select lives_ok(
  $$ select public.delete_operation('b0000000-0000-4000-8000-000000000003', 1) $$, 'owner deletes the paying operation');
select is((select state from public.obligation_states where obligation_id = 'd0000000-0000-4000-8000-000000000001'), 'plan',
  'deleting the operation returns the obligation to plan');
select lives_ok($$ select public.delete_operation('b0000000-0000-4000-8000-000000000003', 1) $$, 'a repeated delete is a no-op');

-- a payment in another currency is stored in the obligation currency by the space's rate (EUR→UAH 41.5)
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on)
values (pg_temp.space('shared'), 'USD', 'UAH', 41.5, '2026-10-01');
select is(
  (select paid_minor from public.pay_obligation('e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 1, 300,
     pg_temp.op('b0000000-0000-4000-8000-000000000005', 'expense', 'a0000000-0000-4000-8000-000000000002', 300, 'USD'))),
  12450::bigint, 'a USD payment of a UAH obligation is converted by the space rate');

-- editing a paying operation keeps the payment and the obligation consistent (update_operation)
insert into public.obligations (id, ledger_id, title, occurrence_on, due_on, planned_amount_minor, currency)
values ('d0000000-0000-4000-8000-000000000004', pg_temp.space('shared'), 'Електрика', current_date + 5, current_date + 5,
  20000, 'UAH');
select is(
  (select state from public.pay_obligation('e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000004', 1, 20000,
     pg_temp.op('b0000000-0000-4000-8000-000000000008', 'expense', 'a0000000-0000-4000-8000-000000000001', 20000, 'UAH'))),
  'paid', 'an operation pays the electricity in full');
select throws_ok(
  $$ select public.update_operation('b0000000-0000-4000-8000-000000000008', 1, '{"amount_minor": 15000}') $$,
  '23514', null, 'a paying operation cannot go below the part it paid');
select throws_ok(
  $$ select public.update_operation('b0000000-0000-4000-8000-000000000008', 1,
       '{"account_id": "a0000000-0000-4000-8000-000000000002", "currency": "USD", "amount_minor": 500}') $$,
  '22023', null, 'a paying operation keeps its currency');
select is(
  (public.update_operation('b0000000-0000-4000-8000-000000000008', 1, '{"amount_minor": 25000}')).amount_minor,
  25000::bigint, 'a paying operation can grow');
select is((select state from public.obligation_states where obligation_id = 'd0000000-0000-4000-8000-000000000004'), 'paid',
  'raising the paying operation keeps the obligation paid');

-- «duplicate» (plan 1.8) keeps the link to the operation it copies
select is(
  (public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000009', 'expense',
     'a0000000-0000-4000-8000-000000000001', 25000, 'UAH')
     || '{"duplicated_from_id": "b0000000-0000-4000-8000-000000000008"}')).duplicated_from_id,
  'b0000000-0000-4000-8000-000000000008'::uuid, 'a duplicate stores the operation it was copied from');

-- archive with a move
select lives_ok(
  $$ select public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000006', 'expense', 'a0000000-0000-4000-8000-000000000001',
       2000, 'UAH', pg_temp.cat('Кафе', 'expense'))) $$,
  'owner adds a café expense');
select throws_ok(
  format('select public.archive_category(%L, %L)', pg_temp.cat('Кафе', 'expense'), pg_temp.cat('Зарплата', 'income')),
  '23503', null, 'operations cannot move into a category of the other kind');
select lives_ok(
  format('select public.archive_category(%L, %L)', pg_temp.cat('Кафе', 'expense'), pg_temp.cat('Продукти', 'expense')),
  'owner archives a category and moves its operations');
select is(
  (select category_id from public.operations where id = 'b0000000-0000-4000-8000-000000000006'), pg_temp.cat('Продукти', 'expense'),
  'archiving moves the operations, never destroys them');
select isnt((select archived_at from public.categories where id = pg_temp.cat('Кафе', 'expense')), null, 'the category is archived');

select lives_ok(
  $$ insert into public.attachments (ledger_id, owner_type, owner_id, storage_path, mime, size_bytes)
     values (pg_temp.space('shared'), 'operation', 'b0000000-0000-4000-8000-000000000006',
       pg_temp.space('shared') || '/operation/b0000000-0000-4000-8000-000000000006/receipt.jpg', 'image/jpeg', 1000) $$,
  'owner attaches a receipt');
select throws_ok(
  $$ insert into public.attachments (ledger_id, owner_type, owner_id, storage_path, mime, size_bytes)
     values (pg_temp.space('shared'), 'operation', gen_random_uuid(), pg_temp.space('stranger') || '/operation/x/y.jpg', 'image/jpeg', 1) $$,
  '23514', null, 'an attachment path lies under its own space');
reset role;

-- editor
select pg_temp.login('00000000-0000-4000-8000-000000000102');
select is((select count(*)::int from public.operations where ledger_id = pg_temp.space('shared')), 7, 'editor sees the shared operations');
select lives_ok(
  $$ select public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000007', 'income', 'a0000000-0000-4000-8000-000000000001',
       5000, 'UAH', pg_temp.cat('Фриланс', 'income'))) $$,
  'editor creates an operation');
select lives_ok(
  $$ insert into public.accounts (ledger_id, name, kind, currency, opening_balance_on) values (pg_temp.space('shared'), 'Готівка', 'cash', 'UAH', '2026-10-01') $$,
  'editor adds an account');
select lives_ok(
  $$ insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on) values (pg_temp.space('shared'), 'EUR', 'UAH', 41.5, '2026-10-02') $$,
  'editor adds a rate');
reset role;

-- viewer
select pg_temp.login('00000000-0000-4000-8000-000000000103');
select is(
  (select count(*)::int from public.account_balances where ledger_id = pg_temp.space('shared')), 3, 'viewer sees the balances');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'expense', 'a0000000-0000-4000-8000-000000000001', 100, 'UAH')) $$,
  '42501', null, 'viewer cannot create an operation');
select throws_ok(
  $$ select public.update_operation('b0000000-0000-4000-8000-000000000007', 1, '{"note": "x"}') $$,
  '42501', null, 'viewer cannot edit an operation');
select throws_ok(
  $$ select public.delete_operation('b0000000-0000-4000-8000-000000000007', 1) $$, '42501', null, 'viewer cannot delete an operation');
select throws_ok(
  $$ select * from public.pay_obligation(gen_random_uuid(), 'd0000000-0000-4000-8000-000000000001', 4, 100,
       p_existing_operation_id => 'b0000000-0000-4000-8000-000000000007') $$,
  '42501', null, 'viewer cannot pay an obligation');
select throws_ok(
  $$ insert into public.accounts (ledger_id, name, kind, currency, opening_balance_on) values (pg_temp.space('shared'), 'x', 'cash', 'UAH', '2026-10-01') $$,
  '42501', null, 'viewer cannot add an account');
select throws_ok(
  format('select public.archive_category(%L)', pg_temp.cat('Авто', 'expense')), '42501', null, 'viewer cannot archive a category');
reset role;

-- stranger
select pg_temp.login('00000000-0000-4000-8000-000000000104');
select is(
  (select count(*)::int from (
     select ledger_id from public.accounts union all select ledger_id from public.categories
     union all select ledger_id from public.fx_rates union all select ledger_id from public.transfers
     union all select ledger_id from public.operations union all select ledger_id from public.attachments
     union all select ledger_id from public.obligations union all select ledger_id from public.obligation_payments
     union all select ledger_id from public.account_balances union all select ledger_id from public.obligation_states
   ) visible where ledger_id = pg_temp.space('shared')),
  0, 'stranger sees no row of the shared space in any phase 1 table or view');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'expense', 'a0000000-0000-4000-8000-000000000001', 100, 'UAH')) $$,
  '42501', null, 'stranger cannot write into a foreign space');
select throws_ok(
  $$ insert into public.obligations (ledger_id, title, occurrence_on, due_on, currency) values (pg_temp.space('shared'), 'x', current_date, current_date, 'UAH') $$,
  '42501', null, 'stranger cannot add an obligation to a foreign space');
select throws_ok(
  $$ select public.update_operation('b0000000-0000-4000-8000-000000000007', 1, '{"note": "x"}') $$,
  '42501', null, 'stranger cannot edit a foreign operation');
reset role;

-- Storage: the first folder of the object name is the space
select pg_temp.login('00000000-0000-4000-8000-000000000102');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('attachments', pg_temp.space('shared') || '/operation/x/editor.jpg') $$,
  'editor uploads into the shared space folder');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000103');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('attachments', pg_temp.space('shared') || '/operation/x/viewer.jpg') $$,
  '42501', null, 'viewer cannot upload');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000104');
select is((select count(*)::int from storage.objects where bucket_id = 'attachments'), 0, 'stranger sees no files of the space');
reset role;

-- account deletion (ADR 27): the editor's rows stay with no author; the owner's space goes with all its data
delete from auth.users where id = '00000000-0000-4000-8000-000000000102';
select is(
  (select created_by from public.operations where id = 'b0000000-0000-4000-8000-000000000007'), null::uuid,
  'a deleted editor''s operation stays with created_by null');
delete from auth.users where id = '00000000-0000-4000-8000-000000000101';
select is(
  (select count(*)::int from (
     select ledger_id from public.accounts union all select ledger_id from public.categories
     union all select ledger_id from public.operations union all select ledger_id from public.obligations
     union all select ledger_id from public.obligation_payments union all select ledger_id from public.fx_rates
   ) rows where ledger_id = (select ledger_id from spaces where name = 'shared')),
  0, 'deleting the owner deletes the space with all its money data');

select * from finish();
rollback;
