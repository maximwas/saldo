-- Subscriptions, prices and credits of phase 2 (series_sources.sql, series_rpc.sql): RLS on four roles, series
-- obligations, a price change that never rewrites the past, a credit whose price is never an expense and whose
-- installments paid before tracking leave no operations, schedule replacement, replays and PT409. Fictional data only.
begin;
select plan(48);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000301', 'pgtap-series-owner@example.com'),
  ('00000000-0000-4000-8000-000000000302', 'pgtap-series-editor@example.com'),
  ('00000000-0000-4000-8000-000000000303', 'pgtap-series-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000304', 'pgtap-series-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000301'
union all
select 'stranger', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000304';
grant select on spaces to authenticated;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000302'::uuid, 'editor' from spaces where name = 'shared'
union all
select ledger_id, '00000000-0000-4000-8000-000000000303'::uuid, 'viewer' from spaces where name = 'shared';

create function pg_temp.space(p_name text) returns uuid language sql as $$
  select ledger_id from spaces where name = p_name
$$;
create function pg_temp.cat(p_space text, p_name text, p_kind text) returns uuid language sql as $$
  select id from public.categories where ledger_id = pg_temp.space(p_space) and name = p_name and kind = p_kind
$$;
create function pg_temp.ob(p_id uuid) returns public.obligations language sql as $$
  select * from public.obligations where id = p_id
$$;
create function pg_temp.credit(p_id uuid, p_space text, p_paid int, p_account uuid) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space(p_space), 'name', 'Comfy — ноутбук',
    'lender', 'Comfy', 'purchase_price_minor', 3249900, 'total_payable_minor', 3249900, 'currency', 'UAH',
    'installments_count', 12, 'regular_installment_minor', 270825, 'paid_before_tracking_count', p_paid,
    'paid_before_tracking_minor', p_paid * 270825, 'account_id', p_account)
$$;
-- monthly installments from p_first: numbers p_from_no..p_to_no, ids c5..0<p_tag><no>
create function pg_temp.schedule(p_tag int, p_from_no int, p_to_no int, p_first date, p_amount bigint) returns jsonb
language sql as $$
  select jsonb_agg(jsonb_build_object(
    'id', format('c5000000-0000-4000-8000-%s', lpad((p_tag * 100 + n)::text, 12, '0'))::uuid,
    'sequence_no', n, 'due_on', (p_first + make_interval(months => n - p_from_no))::date, 'amount_minor', p_amount))
  from generate_series(p_from_no, p_to_no) n
$$;
create function pg_temp.inst(p_tag int, p_no int) returns uuid language sql as $$
  select format('c5000000-0000-4000-8000-%s', lpad((p_tag * 100 + p_no)::text, 12, '0'))::uuid
$$;

insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000301'::uuid, ledger_id, 'Основна картка', 'bank', 'UAH', 5000000, '2026-10-01'::date
from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000302'::uuid, ledger_id, 'Чужа', 'cash', 'UAH', 0, '2026-10-01'::date
from spaces where name = 'stranger';

select pg_temp.login('00000000-0000-4000-8000-000000000301');

-- subscriptions: a direct row, the price, then the series dates
select lives_ok(
  $$ insert into public.subscriptions (id, ledger_id, name, currency, first_on, account_id, category_id)
     values ('c3000000-0000-4000-8000-000000000301', pg_temp.space('shared'), 'Netflix', 'UAH', '2026-01-05',
       'a0000000-0000-4000-8000-000000000301', pg_temp.cat('shared', 'Підписки', 'expense')) $$,
  'owner adds a subscription');
select is(
  (public.set_subscription_price('{"id": "c3100000-0000-4000-8000-000000000301",
     "subscription_id": "c3000000-0000-4000-8000-000000000301", "effective_on": "2026-01-05", "amount_minor": 34900}')).currency,
  'UAH', 'a price without a currency takes the subscription currency');
select is(
  public.upsert_series_obligations('subscription', 'c3000000-0000-4000-8000-000000000301',
    '[{"id": "c5000000-0000-4000-8000-000000000311", "due_on": "2026-11-05"},
      {"id": "c5000000-0000-4000-8000-000000000312", "due_on": "2026-12-05"},
      {"id": "c5000000-0000-4000-8000-000000000313", "due_on": "2027-01-05"}]'),
  3, 'three series dates are written');
select is(
  (select count(*)::int from public.obligations where source_type = 'subscription'
     and source_id = 'c3000000-0000-4000-8000-000000000301' and planned_amount_minor = 34900 and currency = 'UAH'
     and title = 'Netflix' and occurrence_on = due_on),
  3, 'each date takes the price in force, the title and occurrence_on = due_on');
select is(
  public.upsert_series_obligations('subscription', 'c3000000-0000-4000-8000-000000000301',
    '[{"id": "c5000000-0000-4000-8000-000000000399", "due_on": "2026-11-05"},
      {"due_on": "2026-12-05"}, {"due_on": "2027-01-05"}]'),
  0, 'a replay of the same dates writes nothing (with or without ids)');
select is(
  (select state from public.pay_obligation('e3000000-0000-4000-8000-000000000301', 'c5000000-0000-4000-8000-000000000311',
     (pg_temp.ob('c5000000-0000-4000-8000-000000000311')).version, 34900,
     jsonb_build_object('id', 'b3000000-0000-4000-8000-000000000301', 'ledger_id', pg_temp.space('shared'), 'kind', 'expense',
       'account_id', 'a0000000-0000-4000-8000-000000000301', 'amount_minor', 34900, 'currency', 'UAH',
       'occurred_at', '2026-11-05T09:00:00Z', 'category_id', pg_temp.cat('shared', 'Підписки', 'expense')))),
  'paid', 'the November date is paid');

-- a new price from 1 November: the paid November date and its payment keep 349.00, the unpaid ones take 399.00
select lives_ok(
  $$ select public.set_subscription_price('{"id": "c3100000-0000-4000-8000-000000000302",
       "subscription_id": "c3000000-0000-4000-8000-000000000301", "effective_on": "2026-11-01", "amount_minor": 39900}') $$,
  'owner sets a new price from 1 November');
select is((pg_temp.ob('c5000000-0000-4000-8000-000000000311')).planned_amount_minor, 34900::bigint,
  'a paid obligation keeps its old price');
select is(
  (select amount_minor from public.obligation_payments where id = 'e3000000-0000-4000-8000-000000000301'), 34900::bigint,
  'the payment is not rewritten');
select is((pg_temp.ob('c5000000-0000-4000-8000-000000000312')).planned_amount_minor, 39900::bigint,
  'an unpaid later date takes the new price');
select lives_ok(
  $$ select public.set_subscription_price('{"id": "c3100000-0000-4000-8000-000000000303",
       "subscription_id": "c3000000-0000-4000-8000-000000000301", "effective_on": "2027-01-01", "amount_minor": 44900}') $$,
  'owner sets a price from January');
select is(
  array[(pg_temp.ob('c5000000-0000-4000-8000-000000000312')).planned_amount_minor,
    (pg_temp.ob('c5000000-0000-4000-8000-000000000313')).planned_amount_minor],
  array[39900, 44900]::bigint[], 'each date keeps the price in force on it, an earlier date is not rewritten');
select is(
  (public.set_subscription_price('{"id": "c3100000-0000-4000-8000-000000000303",
     "subscription_id": "c3000000-0000-4000-8000-000000000301", "effective_on": "2027-01-01", "amount_minor": 1}')).amount_minor,
  44900::bigint, 'a replay of a price returns it unchanged');

-- settings change: from December the series is just December; January is cancelled, its row stays as history
update public.subscriptions set name = 'Netflix Premium' where id = 'c3000000-0000-4000-8000-000000000301';
select is(
  public.upsert_series_obligations('subscription', 'c3000000-0000-4000-8000-000000000301',
    '[{"due_on": "2026-12-05"}]', '2026-12-01'),
  2, 'with p_from the January date is cancelled and December takes the new name');
select is(
  array[(pg_temp.ob('c5000000-0000-4000-8000-000000000311')).title, (pg_temp.ob('c5000000-0000-4000-8000-000000000312')).title,
    (pg_temp.ob('c5000000-0000-4000-8000-000000000313')).lifecycle],
  array['Netflix', 'Netflix Premium', 'cancelled'], 'the paid date keeps its title, the dropped date is cancelled');
select is(
  public.upsert_series_obligations('subscription', 'c3000000-0000-4000-8000-000000000301', '[{"due_on": "2027-01-05"}]'),
  1, 'a cancelled date can be planned again: a new active row next to the history');
select throws_ok(
  $$ select public.upsert_series_obligations('credit', 'c3000000-0000-4000-8000-000000000301', '[]') $$,
  '22023', null, 'credits are not a series source of upsert_series_obligations');
select throws_ok(
  $$ delete from public.subscriptions where id = 'c3000000-0000-4000-8000-000000000301' $$,
  '42501', null, 'a subscription is archived, never deleted');
select throws_ok(
  $$ insert into public.subscriptions (ledger_id, name, currency, first_on, category_id)
     values (pg_temp.space('shared'), 'x', 'UAH', '2026-01-01', pg_temp.cat('shared', 'Зарплата', 'income')) $$,
  '23503', null, 'a subscription takes an expense category only');

-- credits: 3 of 12 paid before tracking, 9 installments from 5 November, no operation at all
select lives_ok(
  format('select public.save_credit(%L, %L)',
    pg_temp.credit('c4000000-0000-4000-8000-000000000301', 'shared', 3, 'a0000000-0000-4000-8000-000000000301'),
    pg_temp.schedule(1, 4, 12, '2026-11-05', 270825)),
  'owner adds a credit with 3 installments paid before tracking');
select is(
  (select array[count(*), sum(planned_amount_minor), min(sequence_no)]::bigint[] from public.obligations
   where source_type = 'credit' and source_id = 'c4000000-0000-4000-8000-000000000301' and lifecycle = 'active'),
  array[9, 2437425, 4]::bigint[], 'nine installments from number 4, 24 374.25 in total');
select is(
  (select count(*)::int from public.operations where ledger_id = pg_temp.space('shared')), 1,
  'no operation for the purchase price or the installments paid before tracking (only the Netflix payment)');
select throws_ok(
  format('select public.save_credit(%L, %L)',
    pg_temp.credit('c4000000-0000-4000-8000-000000000302', 'shared', 3, null), pg_temp.schedule(2, 3, 12, '2026-11-05', 270825)),
  '22023', null, 'an installment cannot repeat one paid before tracking');
select is(
  (public.save_credit(pg_temp.credit('c4000000-0000-4000-8000-000000000301', 'shared', 3, null),
     pg_temp.schedule(3, 4, 12, '2026-11-05', 1))).version,
  1, 'a replay of the create returns the credit unchanged');
select is(
  (select count(*)::int from public.obligations where source_type = 'credit' and source_id = 'c4000000-0000-4000-8000-000000000301'),
  9, 'the replay wrote no installment');
select is(
  (select state from public.pay_obligation('e3000000-0000-4000-8000-000000000302', pg_temp.inst(1, 4), 1, 270825,
     jsonb_build_object('id', 'b3000000-0000-4000-8000-000000000302', 'ledger_id', pg_temp.space('shared'), 'kind', 'expense',
       'account_id', 'a0000000-0000-4000-8000-000000000301', 'amount_minor', 270825, 'currency', 'UAH',
       'occurred_at', '2026-11-05T09:00:00Z'))),
  'paid', 'installment 4 is paid: only this payment is an expense');

-- early payoff confirmed by the person: the bank's new schedule replaces the unpaid installments
select throws_ok(
  format('select public.replace_credit_schedule(%L, 7, %L)', 'c4000000-0000-4000-8000-000000000301',
    pg_temp.schedule(4, 5, 8, '2026-12-05', 609319)),
  'PT409', null, 'a stale version cannot replace the schedule');
select lives_ok(
  format('select public.replace_credit_schedule(%L, 1, %L)', 'c4000000-0000-4000-8000-000000000301',
    pg_temp.schedule(4, 5, 8, '2026-12-05', 609319)),
  'owner replaces the schedule with 4 installments');
select is(
  (select array[count(*) filter (where lifecycle = 'replaced'), count(*) filter (where lifecycle = 'active')]::bigint[]
   from public.obligations where source_type = 'credit' and source_id = 'c4000000-0000-4000-8000-000000000301'),
  array[8, 5]::bigint[], 'eight unpaid installments are replaced; the paid one and four new ones are active');
select is((pg_temp.ob(pg_temp.inst(1, 5))).replaced_by_id, pg_temp.inst(4, 5),
  'a replaced installment points at the new one with its number');
select is((pg_temp.ob(pg_temp.inst(1, 4))).lifecycle, 'active', 'the paid installment stays');
select is(
  (public.replace_credit_schedule('c4000000-0000-4000-8000-000000000301', 1, pg_temp.schedule(4, 5, 8, '2026-12-05', 609319))).version,
  2, 'a replay of the replacement returns the credit without writing');
select throws_ok(
  format('select public.save_credit(%L)', pg_temp.credit('c4000000-0000-4000-8000-000000000301', 'shared', 3, null)
    || '{"version": 1, "name": "x"}'),
  'PT409', null, 'an edit from a stale version is refused');
select lives_ok(
  format('select public.save_credit(%L)', '{"id": "c4000000-0000-4000-8000-000000000301", "version": 2,
    "name": "Comfy — ноутбук 15"}'::jsonb || jsonb_build_object('ledger_id', pg_temp.space('shared'))),
  'owner renames the credit with a partial patch');
select is(
  array[(pg_temp.ob(pg_temp.inst(4, 5))).title, (pg_temp.ob(pg_temp.inst(1, 4))).title,
    (select lender from public.credits where id = 'c4000000-0000-4000-8000-000000000301')],
  array['Comfy — ноутбук 15', 'Comfy — ноутбук', 'Comfy'],
  'unpaid installments follow the name, the paid one keeps it, untouched fields stay');
select lives_ok(
  format('select public.save_credit(%L)', '{"id": "c4000000-0000-4000-8000-000000000301", "version": 3,
    "status": "cancelled"}'::jsonb || jsonb_build_object('ledger_id', pg_temp.space('shared'))),
  'owner cancels the credit');
select is(
  (select array[count(*) filter (where lifecycle = 'cancelled'), count(*) filter (where lifecycle = 'active')]::bigint[]
   from public.obligations where source_type = 'credit' and source_id = 'c4000000-0000-4000-8000-000000000301'),
  array[4, 1]::bigint[], 'a cancelled credit cancels its unpaid installments, the paid one stays');
select throws_ok(
  format('select public.save_credit(%L)',
    pg_temp.credit('c4000000-0000-4000-8000-000000000303', 'shared', 0, 'a0000000-0000-4000-8000-000000000302')),
  '23503', null, 'a credit cannot use an account of another space');
reset role;

-- editor
select pg_temp.login('00000000-0000-4000-8000-000000000302');
select lives_ok(
  $$ select public.set_subscription_price('{"id": "c3100000-0000-4000-8000-000000000304",
       "subscription_id": "c3000000-0000-4000-8000-000000000301", "effective_on": "2027-02-01", "amount_minor": 45900}') $$,
  'editor sets a price');
select throws_ok(
  $$ insert into public.subscription_prices (ledger_id, subscription_id, effective_on, amount_minor, currency)
     values (pg_temp.space('shared'), 'c3000000-0000-4000-8000-000000000301', '2027-03-01', 1, 'UAH') $$,
  '42501', null, 'editor cannot write a price past the RPC');
select throws_ok(
  $$ insert into public.credits (ledger_id, name, currency, installments_count) values (pg_temp.space('shared'), 'x', 'UAH', 1) $$,
  '42501', null, 'editor cannot write a credit past the RPC');
reset role;

-- viewer
select pg_temp.login('00000000-0000-4000-8000-000000000303');
select is(
  (select count(*)::int from (select ledger_id from public.subscriptions union all select ledger_id from public.subscription_prices
     union all select ledger_id from public.credits) v where ledger_id = pg_temp.space('shared')),
  6, 'viewer sees the subscription, its four prices and the credit');
select throws_ok(
  $$ insert into public.subscriptions (ledger_id, name, currency, first_on) values (pg_temp.space('shared'), 'x', 'UAH', '2026-01-01') $$,
  '42501', null, 'viewer cannot add a subscription');
select throws_ok(
  $$ select public.upsert_series_obligations('subscription', 'c3000000-0000-4000-8000-000000000301', '[{"due_on": "2027-03-05"}]') $$,
  '42501', null, 'viewer cannot write series dates');
select throws_ok(
  format('select public.save_credit(%L)', pg_temp.credit('c4000000-0000-4000-8000-000000000304', 'shared', 0, null)),
  '42501', null, 'viewer cannot add a credit');
reset role;

-- stranger
select pg_temp.login('00000000-0000-4000-8000-000000000304');
select is(
  (select count(*)::int from (select ledger_id from public.subscriptions union all select ledger_id from public.subscription_prices
     union all select ledger_id from public.credits) v where ledger_id = pg_temp.space('shared')),
  0, 'stranger sees no subscription, price or credit of the shared space');
select throws_ok(
  $$ select public.set_subscription_price('{"id": "c3100000-0000-4000-8000-000000000305",
       "subscription_id": "c3000000-0000-4000-8000-000000000301", "effective_on": "2027-03-01", "amount_minor": 1}') $$,
  '42501', null, 'stranger cannot price a foreign subscription');
select throws_ok(
  format('select public.save_credit(%L)', pg_temp.credit('c4000000-0000-4000-8000-000000000301', 'stranger', 0, null)),
  '23505', null, 'a credit id of another space is refused without revealing it');
reset role;

select * from finish();
rollback;
