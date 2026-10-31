-- Base-currency snapshot of operations (migration operation_base_amounts): the server converts by rule A on the
-- operation date, keeps the rate it used, leaves null without a rate and never rewrites a snapshot for a newer rate.
-- Fictional data only.
begin;
select plan(17);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000301', 'pgtap-base-owner@example.com'),
  ('00000000-0000-4000-8000-000000000302', 'pgtap-base-editor@example.com'),
  ('00000000-0000-4000-8000-000000000303', 'pgtap-base-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000304', 'pgtap-base-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000301';
grant select on spaces to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000302'::uuid, 'editor' from spaces
union all
select ledger_id, '00000000-0000-4000-8000-000000000303'::uuid, 'viewer' from spaces;

create function pg_temp.space() returns uuid language sql as $$ select ledger_id from spaces where name = 'shared' $$;
create function pg_temp.op(p_id uuid, p_account uuid, p_amount bigint, p_currency text) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space(), 'kind', 'expense', 'account_id', p_account,
    'amount_minor', p_amount, 'currency', p_currency, 'occurred_at', '2026-10-06T10:00:00Z')
$$;
create function pg_temp.snap(p_id uuid) returns text[] language sql as $$
  select array[base_amount_minor::text, fx_rate::text, fx_source, fx_rate_on::text] from public.operations where id = p_id
$$;

-- space base UAH: a UAH card, a USD account, a EUR account; USD→UAH 41.5 known from 2026-10-01, no EUR rate yet
insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000301'::uuid, pg_temp.space(), 'Картка', 'bank', 'UAH', 0, '2026-10-01'::date
union all
select 'a0000000-0000-4000-8000-000000000302'::uuid, pg_temp.space(), 'Долари', 'cash', 'USD', 0, '2026-10-01'::date
union all
select 'a0000000-0000-4000-8000-000000000303'::uuid, pg_temp.space(), 'Євро', 'cash', 'EUR', 0, '2026-10-01'::date;
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on, source)
values (pg_temp.space(), 'USD', 'UAH', 41.5, '2026-10-01', 'reference');

select pg_temp.login('00000000-0000-4000-8000-000000000301');

select is(
  pg_temp.snap((public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000301',
    'a0000000-0000-4000-8000-000000000302', 1000, 'USD'))).id),
  array['41500', '41.5000000000', 'reference', '2026-10-01'],
  'a USD expense with a known rate gets its base amount and the rate it used');
select is(
  pg_temp.snap((public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000302',
    'a0000000-0000-4000-8000-000000000303', 1000, 'EUR'))).id),
  array[null, null, null, null]::text[],
  'a EUR expense without a rate keeps an unknown base amount, not 0');
select is(
  pg_temp.snap((public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000303',
    'a0000000-0000-4000-8000-000000000302', 1000, 'USD')
    || '{"base_amount_minor": 1, "fx_rate": 1, "fx_source": "manual", "fx_rate_on": "2026-01-01"}')).id),
  array['41500', '41.5000000000', 'reference', '2026-10-01'],
  'a base amount or rate sent by the client is ignored');

-- a manual rate on the operation date arrives after the operation
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on, source)
values (pg_temp.space(), 'USD', 'UAH', 42, '2026-10-06', 'manual');
select is(
  pg_temp.snap((public.update_operation('b0000000-0000-4000-8000-000000000301', 1, '{"note": "кава"}')).id),
  array['41500', '41.5000000000', 'reference', '2026-10-01'],
  'a later rate does not rewrite the snapshot when the note changes');
select is(
  pg_temp.snap((public.update_operation('b0000000-0000-4000-8000-000000000301', 2,
    pg_temp.op('b0000000-0000-4000-8000-000000000301', 'a0000000-0000-4000-8000-000000000302', 1000, 'USD')
    || '{"note": "кава"}')).id),
  array['41500', '41.5000000000', 'reference', '2026-10-01'],
  'a full-form patch with the same amount, currency and date keeps the snapshot');
select is(
  pg_temp.snap((public.update_operation('b0000000-0000-4000-8000-000000000301', 3, '{"amount_minor": 2000}')).id),
  array['84000', '42.0000000000', 'manual', '2026-10-06'],
  'a new amount takes the rate again: the manual one of the same date');
select is(
  pg_temp.snap((public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000304',
    'a0000000-0000-4000-8000-000000000302', 1000, 'USD') || '{"occurred_at": "2026-10-03T10:00:00Z"}')).id),
  array['41500', '41.5000000000', 'reference', '2026-10-01'],
  'an older operation keeps the rate of its own date');

-- an inverse pair: the rate is stored as EUR per 1 UAH
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on)
values (pg_temp.space(), 'UAH', 'EUR', 0.025, '2026-10-01');
select is(
  pg_temp.snap((public.update_operation('b0000000-0000-4000-8000-000000000302', 1, '{"note": "вже з курсом"}')).id),
  array['40000', '40.0000000000', 'manual', '2026-10-01'],
  'an unknown base amount is filled on the next edit, through the inverse pair');

-- a transfer EUR → UAH with a fee in EUR: the EUR leg and the fee get base amounts
select lives_ok(
  $$ select public.create_transfer(jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000301',
       'ledger_id', pg_temp.space(), 'from_account_id', 'a0000000-0000-4000-8000-000000000303', 'from_amount_minor', 1000,
       'from_currency', 'EUR', 'to_account_id', 'a0000000-0000-4000-8000-000000000301', 'to_amount_minor', 40000,
       'to_currency', 'UAH', 'fee_minor', 50, 'occurred_at', '2026-10-06T10:00:00Z')) $$,
  'owner makes a EUR → UAH transfer with a fee');
select is(
  (select array_agg(kind || ':' || base_amount_minor::text order by kind) from public.operations
   where transfer_id = 'c0000000-0000-4000-8000-000000000301'),
  array['expense:2000', 'transfer_in:40000', 'transfer_out:40000'],
  'the EUR fee and the EUR leg get base amounts in UAH');

-- roles
select pg_temp.login('00000000-0000-4000-8000-000000000302');
select is(
  pg_temp.snap((public.create_operation(pg_temp.op('b0000000-0000-4000-8000-000000000305',
    'a0000000-0000-4000-8000-000000000302', 100, 'USD'))).id),
  array['4200', '42.0000000000', 'manual', '2026-10-06'],
  'an editor''s USD expense gets its base amount too');
select pg_temp.login('00000000-0000-4000-8000-000000000303');
select throws_ok(
  $$ select public.create_operation(pg_temp.op(gen_random_uuid(), 'a0000000-0000-4000-8000-000000000302', 100, 'USD')) $$,
  '42501', null, 'a viewer still cannot create an operation');
select is(
  (select base_amount_minor from public.operations where id = 'b0000000-0000-4000-8000-000000000301'),
  84000::bigint, 'a viewer reads the base amount');
select pg_temp.login('00000000-0000-4000-8000-000000000304');
select is(
  (select count(*)::int from public.operations where ledger_id = pg_temp.space()), 0,
  'a stranger sees none of it');

-- the base currency changes only while the space has no operations (migration storage_and_guards)
with u as (
  update public.ledgers set base_currency = 'EUR'
  where id = (select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000304')
  returning base_currency
)
select is(min(base_currency), 'EUR', 'an owner changes the base currency of a space with no operations') from u;
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000301');
select throws_ok(
  $$ update public.ledgers set base_currency = 'EUR' where id = pg_temp.space() $$,
  '23514', 'new row for relation "ledgers" violates check constraint "ledgers_base_currency_locked"',
  'a space with operations keeps its base currency: old base amounts would mix with new ones');
with u as (
  update public.ledgers set name = 'Спільний бюджет', base_currency = 'UAH' where id = pg_temp.space() returning 1
)
select is(count(*)::int, 1, 'saving the settings with the same base currency still works') from u;
reset role;

select * from finish();
rollback;
