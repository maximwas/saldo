-- Budget (budget.sql) and statistics / search (statistics_search.sql): RLS of budget_months and budget_limits on four
-- roles, budget_month_facts counts expense minus refund and leaves transfers, debt movements and adjustments out,
-- copy_budget_month copies once and carries the remainder, a stats total equals its components, strangers get 42501,
-- search finds an operation by its note. Fictional data only.
begin;
select plan(16);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000601', 'pgtap-budget-owner@example.com'),
  ('00000000-0000-4000-8000-000000000602', 'pgtap-budget-editor@example.com'),
  ('00000000-0000-4000-8000-000000000603', 'pgtap-budget-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000604', 'pgtap-budget-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000601';
grant select on spaces to authenticated;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000602'::uuid, 'editor' from spaces
union all
select ledger_id, '00000000-0000-4000-8000-000000000603'::uuid, 'viewer' from spaces;

create function pg_temp.space() returns uuid language sql as $$
  select ledger_id from spaces where name = 'shared'
$$;
create function pg_temp.cat(p_name text, p_kind text) returns uuid language sql as $$
  select id from public.categories where ledger_id = pg_temp.space() and name = p_name and kind = p_kind
$$;
create function pg_temp.op(p_id uuid, p_kind text, p_amount bigint, p_on text, p_note text, p_category uuid)
returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space(), 'kind', p_kind, 'direction', 'out',
    'account_id', 'a0000000-0000-4000-8000-000000000601', 'amount_minor', p_amount, 'currency', 'UAH',
    'occurred_at', p_on || 'T09:00:00Z', 'note', p_note, 'category_id', p_category)
$$;
-- a month with one limit in one statement, so each role's write touches both tables
create function pg_temp.budget(p_month text, p_category text) returns text language sql as $$
  select format($q$
    with m as (insert into public.budget_months (ledger_id, month, income_plan_minor) values (%L, %L, 3000000)
      returning id, ledger_id)
    insert into public.budget_limits (ledger_id, budget_month_id, category_id, limit_minor, carry_mode)
    select ledger_id, id, %L, 500000, 'carry' from m$q$, pg_temp.space(), p_month, pg_temp.cat(p_category, 'expense'))
$$;
create function pg_temp.visible() returns bigint[] language sql as $$
  select array[(select count(*) from public.budget_months where ledger_id = pg_temp.space()),
    (select count(*) from public.budget_limits where ledger_id = pg_temp.space())]
$$;

insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000601'::uuid, ledger_id, 'Основна картка', 'bank', 'UAH', 5000000, '2026-10-01'::date
from spaces
union all
select 'a0000000-0000-4000-8000-000000000602'::uuid, ledger_id, 'Ощадний', 'savings', 'UAH', 0, '2026-10-01'::date
from spaces;

-- October: salary, groceries and their partial refund; a transfer, a loan to a friend and a balance adjustment,
-- none of which is income or expense
select pg_temp.login('00000000-0000-4000-8000-000000000601');
select public.create_operation(pg_temp.op('b6000000-0000-4000-8000-000000000601', 'income', 3000000, '2026-10-01', null,
  pg_temp.cat('Зарплата', 'income')));
select public.create_operation(pg_temp.op('b6000000-0000-4000-8000-000000000602', 'expense', 120000, '2026-10-05',
  'Тижневі закупи', pg_temp.cat('Продукти', 'expense')));
select public.create_operation(pg_temp.op('b6000000-0000-4000-8000-000000000603', 'refund', 20000, '2026-10-06', null,
  pg_temp.cat('Продукти', 'expense')));
select public.create_transfer(jsonb_build_object('id', 'f6000000-0000-4000-8000-000000000601', 'ledger_id', pg_temp.space(),
  'from_account_id', 'a0000000-0000-4000-8000-000000000601', 'from_amount_minor', 100000, 'from_currency', 'UAH',
  'to_account_id', 'a0000000-0000-4000-8000-000000000602', 'to_amount_minor', 100000, 'to_currency', 'UAH',
  'occurred_at', '2026-10-07T09:00:00Z'));
select public.save_debt(
  jsonb_build_object('id', 'd6000000-0000-4000-8000-000000000601', 'ledger_id', pg_temp.space(), 'direction', 'owed_to_me',
    'person', 'Олег', 'principal_minor', 50000, 'currency', 'UAH', 'arisen_on', '2026-10-08', 'origin', 'new_movement'),
  jsonb_build_object('id', 'b6000000-0000-4000-8000-000000000604', 'account_id', 'a0000000-0000-4000-8000-000000000601',
    'occurred_at', '2026-10-08T10:00:00Z', 'kind', 'income', 'amount_minor', 1, 'category_id', null));
select public.create_operation(pg_temp.op('b6000000-0000-4000-8000-000000000605', 'adjustment', 30000, '2026-10-09',
  'Звірка з банком', null));

-- RLS: owner and editor write a month with a limit, viewer and stranger cannot; members read, the stranger does not
select lives_ok(pg_temp.budget('2026-10-01', 'Продукти'), 'owner writes a budget month and a limit');
select pg_temp.login('00000000-0000-4000-8000-000000000602');
select lives_ok(pg_temp.budget('2026-12-01', 'Кафе'), 'editor writes a budget month and a limit');
select pg_temp.login('00000000-0000-4000-8000-000000000603');
select throws_ok(pg_temp.budget('2027-01-01', 'Кафе'), '42501', null, 'viewer cannot write a budget');
select is(pg_temp.visible(), array[2, 2]::bigint[], 'viewer reads months and limits');
select pg_temp.login('00000000-0000-4000-8000-000000000602');
select is(pg_temp.visible(), array[2, 2]::bigint[], 'editor reads months and limits');
select pg_temp.login('00000000-0000-4000-8000-000000000604');
select throws_ok(pg_temp.budget('2027-02-01', 'Кафе'), '42501', null, 'stranger cannot write a budget');
select is(pg_temp.visible(), array[0, 0]::bigint[], 'stranger reads no months and no limits');
select throws_ok(
  format('select * from public.stats_cashflow(%L, %L, %L)', pg_temp.space(), '2026-10-01', '2026-10-31'),
  '42501', null, 'stranger cannot read statistics');
select pg_temp.login('00000000-0000-4000-8000-000000000601');
select is(pg_temp.visible(), array[2, 2]::bigint[], 'owner reads months and limits');

-- budget fact: expense minus refund in the limited category; the transfer, the loan and the adjustment are absent
select is(
  (select array_agg(format('%s:%s:%s:%s:%s:%s:%s', f.category_kind, c.name, f.limit_minor, f.gross_minor, f.refund_minor,
     f.fact_minor, f.remaining_minor) order by f.category_kind)
   from public.budget_month_facts(pg_temp.space(), '2026-10-01') f
   left join public.categories c on c.id = f.category_id),
  array['expense:Продукти:500000:120000:20000:100000:400000', 'income:Зарплата::3000000:0:3000000:'],
  'budget fact is expense minus refund; transfers, debts and adjustments are not in it');

-- copy: once, with the October remainder carried into November; a repeat writes nothing; a viewer cannot copy
select is(public.copy_budget_month(pg_temp.space(), '2026-10-01', '2026-11-01'), 1, 'copy writes the limit');
select is(public.copy_budget_month(pg_temp.space(), '2026-10-15', '2026-11-30'), 0, 'a repeated copy writes nothing');
select is(
  (select array[count(*), min(l.carried_in_minor), min(m.income_plan_minor)]
   from public.budget_limits l join public.budget_months m on m.id = l.budget_month_id
   where m.ledger_id = pg_temp.space() and m.month = '2026-11-01'),
  array[1, 400000, 3000000]::bigint[], 'November has the limit, the carried remainder and the income plan');
select pg_temp.login('00000000-0000-4000-8000-000000000603');
select throws_ok(format('select public.copy_budget_month(%L, %L, %L)', pg_temp.space(), '2026-10-01', '2027-03-01'),
  '42501', null, 'viewer cannot copy a budget');

-- statistics: the result is income - expense + refund, and the expense categories add up to expense - refund
select is(
  (select array[s.income_minor, s.expense_minor, s.refund_minor, s.result_minor,
     (select sum(c.fact_minor)::bigint from public.stats_by_category(pg_temp.space(), '2026-10-01', '2026-10-31') c
      where c.category_kind = 'expense')]
   from public.stats_cashflow(pg_temp.space(), '2026-10-01', '2026-10-31') s),
  array[3000000, 120000, 20000, 2900000, 100000]::bigint[], 'a stats total equals the sum of its components');

-- search (as the viewer: any member may search)
select is(
  (select array_agg(entity_type || ':' || entity_id) from public.search_entities(pg_temp.space(), 'закупи')),
  array['operation:b6000000-0000-4000-8000-000000000602'], 'search finds an operation by its note');

select * from finish();
rollback;
