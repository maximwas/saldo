-- Calendar of phase 2 (calendar.sql): calendar_entries returns facts and plans of one space with a paid plan and its
-- payment as one entry, calendar_day_totals sums exactly those entries in the base currency, filters change both,
-- members read, strangers do not; calendar_saved_filters RLS on four roles. Fictional data only.
begin;
select plan(26);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000501', 'pgtap-calendar-owner@example.com'),
  ('00000000-0000-4000-8000-000000000502', 'pgtap-calendar-editor@example.com'),
  ('00000000-0000-4000-8000-000000000503', 'pgtap-calendar-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000504', 'pgtap-calendar-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000501'
union all
select 'stranger', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000504';
grant select on spaces to authenticated;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000502'::uuid, 'editor' from spaces where name = 'shared'
union all
select ledger_id, '00000000-0000-4000-8000-000000000503'::uuid, 'viewer' from spaces where name = 'shared';

create function pg_temp.space(p_name text) returns uuid language sql as $$
  select ledger_id from spaces where name = p_name
$$;
create function pg_temp.cat(p_name text, p_kind text) returns uuid language sql as $$
  select id from public.categories where ledger_id = pg_temp.space('shared') and name = p_name and kind = p_kind
$$;
create function pg_temp.op(p_id uuid, p_kind text, p_amount bigint, p_on text, p_counterparty text, p_category uuid)
returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space('shared'), 'kind', p_kind,
    'account_id', 'a0000000-0000-4000-8000-000000000501', 'amount_minor', p_amount, 'currency', 'UAH',
    'occurred_at', p_on || 'T09:00:00Z', 'counterparty', p_counterparty, 'category_id', p_category)
$$;
create function pg_temp.october(p_filter jsonb default '{}') returns table (entry_id uuid, entry text, day date, kind text,
  state text, amount_minor bigint, obligation_id uuid, planned_on date) language sql as $$
  select e.entry_id, e.entry, e.day, e.kind, e.state, e.amount_minor, e.obligation_id, e.planned_on
  from public.calendar_entries(pg_temp.space('shared'), '2026-10-01', '2026-10-31', p_filter) e
$$;
create function pg_temp.day(p_day date, p_filter jsonb default '{}') returns bigint[] language sql as $$
  select array[t.fact_income_minor, t.fact_expense_minor, t.plan_in_minor, t.plan_out_minor, t.unknown_count, t.entries_count]
  from public.calendar_day_totals(pg_temp.space('shared'), '2026-10-01', '2026-10-31', p_filter) t
  where t.day = p_day
$$;

insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000501'::uuid, ledger_id, 'Основна картка', 'bank', 'UAH', 5000000, '2026-10-01'::date
from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000502'::uuid, ledger_id, 'Ощадний', 'savings', 'UAH', 0, '2026-10-01'::date
from spaces where name = 'shared';
insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on)
values (pg_temp.space('shared'), 'USD', 'UAH', 41.6, '2026-10-01');
insert into public.subscriptions (id, ledger_id, name, currency, first_on) values
  ('c3000000-0000-4000-8000-000000000501', pg_temp.space('shared'), 'Netflix', 'UAH', '2026-01-05'),
  ('c3000000-0000-4000-8000-000000000502', pg_temp.space('shared'), 'Spotify', 'UAH', '2026-01-12'),
  ('c3000000-0000-4000-8000-000000000503', pg_temp.space('shared'), 'Google One', 'USD', '2026-01-22');
insert into public.obligations (id, ledger_id, source_type, source_id, title, occurrence_on, due_on, planned_amount_minor,
  currency, lifecycle) values
  ('d5000000-0000-4000-8000-000000000501', pg_temp.space('shared'), 'subscription', 'c3000000-0000-4000-8000-000000000501',
   'Netflix', '2026-10-05', '2026-10-05', 34900, 'UAH', 'active'),
  ('d5000000-0000-4000-8000-000000000502', pg_temp.space('shared'), 'subscription', 'c3000000-0000-4000-8000-000000000502',
   'Spotify', '2026-10-12', '2026-10-12', 19900, 'UAH', 'active'),
  ('d5000000-0000-4000-8000-000000000503', pg_temp.space('shared'), 'manual', null, 'Інтернет', '2026-10-20', '2026-10-20',
   35000, 'UAH', 'active'),
  ('d5000000-0000-4000-8000-000000000504', pg_temp.space('shared'), 'manual', null, 'Комунальні', '2026-10-20', '2026-10-20',
   null, 'UAH', 'active'),
  ('d5000000-0000-4000-8000-000000000505', pg_temp.space('shared'), 'subscription', 'c3000000-0000-4000-8000-000000000503',
   'Google One', '2026-10-22', '2026-10-22', 299, 'USD', 'active'),
  ('d5000000-0000-4000-8000-000000000506', pg_temp.space('shared'), 'manual', null, 'Старий план', '2026-10-25', '2026-10-25',
   10000, 'UAH', 'cancelled');

select pg_temp.login('00000000-0000-4000-8000-000000000501');
select public.create_operation(pg_temp.op('b5000000-0000-4000-8000-000000000501', 'income', 5800000, '2026-10-03',
  'Оплата проєкту', pg_temp.cat('Фриланс', 'income')));
-- Netflix paid a day early; a refund the same day; Spotify paid in part; a transfer with a fee
select public.pay_obligation('e5000000-0000-4000-8000-000000000501', 'd5000000-0000-4000-8000-000000000501', 1, 34900,
  pg_temp.op('b5000000-0000-4000-8000-000000000502', 'expense', 34900, '2026-10-04', 'Netflix', pg_temp.cat('Підписки', 'expense')));
select public.create_operation(pg_temp.op('b5000000-0000-4000-8000-000000000503', 'refund', 5000, '2026-10-04', 'Сільпо',
  pg_temp.cat('Продукти', 'expense')));
select public.pay_obligation('e5000000-0000-4000-8000-000000000502', 'd5000000-0000-4000-8000-000000000502', 1, 10000,
  pg_temp.op('b5000000-0000-4000-8000-000000000504', 'expense', 10000, '2026-10-12', 'Spotify', null));
select public.create_transfer(jsonb_build_object('id', 'f5000000-0000-4000-8000-000000000501', 'ledger_id', pg_temp.space('shared'),
  'from_account_id', 'a0000000-0000-4000-8000-000000000501', 'from_amount_minor', 100000, 'from_currency', 'UAH',
  'to_account_id', 'a0000000-0000-4000-8000-000000000502', 'to_amount_minor', 100000, 'to_currency', 'UAH',
  'fee_minor', 500, 'occurred_at', '2026-10-14T09:00:00Z'));

-- one entry per thing: a paid plan is its payment, on the payment day, with the planned date kept
select is(
  (select array[count(*)::text, min(entry), min(day)::text, min(planned_on)::text] from pg_temp.october()
   where obligation_id = 'd5000000-0000-4000-8000-000000000501'),
  array['1', 'fact', '2026-10-04', '2026-10-05'], 'a paid plan and its payment are one fact on the payment day');
select is(
  (select array_agg(entry || ':' || amount_minor order by entry) from pg_temp.october()
   where obligation_id = 'd5000000-0000-4000-8000-000000000502'),
  array['fact:10000', 'plan:9900'], 'a partial payment and the remainder are shown apart');
select is(
  (select array[count(*) filter (where kind = 'transfer_out'), count(*) filter (where kind = 'transfer_in')]::bigint[]
   from pg_temp.october()),
  array[1, 0]::bigint[], 'a transfer is one entry');
select is(
  (select array_agg(kind) from pg_temp.october('{"account_ids": ["a0000000-0000-4000-8000-000000000502"]}')),
  array['transfer_out'], 'the transfer matches its receiving account too');
select is((select count(*)::int from pg_temp.october()), 10, 'six facts and four open plans in October');
select is(
  (select array[count(*) filter (where entry_id = 'd5000000-0000-4000-8000-000000000506'),
     (select count(*) from pg_temp.october('{"states": ["cancelled"]}'))]::bigint[] from pg_temp.october()),
  array[0, 1]::bigint[], 'a cancelled plan is hidden unless the state filter asks for it');

-- daily totals in the base currency
select is(pg_temp.day('2026-10-03'), array[5800000, 0, 0, 0, 0, 1]::bigint[], 'income of the 3rd');
select is(pg_temp.day('2026-10-04'), array[0, 29900, 0, 0, 0, 2]::bigint[], 'expenses of the 4th are expense minus refund');
select is(pg_temp.day('2026-10-12'), array[0, 10000, 0, 9900, 0, 2]::bigint[], 'the 12th: paid part as fact, rest as plan');
select is(pg_temp.day('2026-10-14'), array[0, 500, 0, 0, 0, 2]::bigint[], 'the transfer is no expense, its fee is');
select is(pg_temp.day('2026-10-20'), array[0, 0, 0, 35000, 1, 2]::bigint[], 'an unknown plan amount is counted, never 0');
select is(pg_temp.day('2026-10-22'), array[0, 0, 0, 12438, 0, 1]::bigint[], '2.99 USD planned = 124.38 UAH at 41.60');

-- filters change entries and totals alike
select is(pg_temp.day('2026-10-12', '{"entry": "plan"}'), array[0, 0, 0, 9900, 0, 1]::bigint[],
  'with plans only the 12th has no fact');
select is(
  (select count(*)::int from public.calendar_day_totals(pg_temp.space('shared'), '2026-10-01', '2026-10-31', '{"kinds": ["income"]}')),
  1, 'with incomes only one day has totals');
select is((select count(*)::int from pg_temp.october('{"source_types": ["subscription"]}')), 4,
  'subscriptions: two payments, the Spotify remainder and Google One');
select is((select count(*)::int from pg_temp.october('{"source_id": "c3000000-0000-4000-8000-000000000502"}')), 2,
  'one subscription: its payment and its remainder');
select is((select array_agg(entry_id) from pg_temp.october('{"q": "інтер"}')),
  array['d5000000-0000-4000-8000-000000000503'::uuid], 'text search ignores case');
select is((select count(*)::int from pg_temp.october('{"direction": "in"}')), 2, 'inflows: the income and the refund');
select is((select count(*)::int from pg_temp.october('{"min_amount_minor": 1000000}')), 1, 'amount filter in the base currency');
select is((select count(*)::int from pg_temp.october('{"currencies": ["USD"]}')), 1, 'currency filter');
select lives_ok(
  $$ insert into public.calendar_saved_filters (ledger_id, name, filter)
     values (pg_temp.space('shared'), 'До оплати', '{"entry": "plan", "direction": "out"}') $$,
  'owner saves a filter set');
reset role;

-- editor, viewer, stranger
select pg_temp.login('00000000-0000-4000-8000-000000000502');
select lives_ok(
  $$ update public.calendar_saved_filters set name = 'До сплати' where ledger_id = pg_temp.space('shared') $$,
  'editor renames the saved set');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000503');
select is((select count(*)::int from pg_temp.october()), 10, 'viewer reads the calendar');
select throws_ok(
  $$ insert into public.calendar_saved_filters (ledger_id, name) values (pg_temp.space('shared'), 'x') $$,
  '42501', null, 'viewer cannot save a filter set');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000504');
select throws_ok(
  $$ select * from public.calendar_entries(pg_temp.space('shared'), '2026-10-01', '2026-10-31') $$,
  '42501', null, 'stranger cannot read the calendar of the space');
select is((select count(*)::int from public.calendar_saved_filters where ledger_id = pg_temp.space('shared')), 0,
  'stranger sees no saved set of the space');
reset role;

select * from finish();
rollback;
