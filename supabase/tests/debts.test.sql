-- Personal debts of phase 2 (series_sources.sql, series_rpc.sql): RLS on four roles, a loan that changes the balance
-- but is never income or expense, a due date that becomes an obligation, repayments that pay it, the three origins,
-- replays and PT409. Fictional data only (docs/design/demo-data.md).
begin;
select plan(40);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000401', 'pgtap-debts-owner@example.com'),
  ('00000000-0000-4000-8000-000000000402', 'pgtap-debts-editor@example.com'),
  ('00000000-0000-4000-8000-000000000403', 'pgtap-debts-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000404', 'pgtap-debts-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000401'
union all
select 'stranger', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000404';
grant select on spaces to authenticated;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000402'::uuid, 'editor' from spaces where name = 'shared'
union all
select ledger_id, '00000000-0000-4000-8000-000000000403'::uuid, 'viewer' from spaces where name = 'shared';

create function pg_temp.space(p_name text) returns uuid language sql as $$
  select ledger_id from spaces where name = p_name
$$;
create function pg_temp.debt(p_id uuid, p_space text, p_direction text, p_person text, p_amount bigint, p_origin text,
  p_due date) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', pg_temp.space(p_space), 'direction', p_direction, 'person', p_person,
    'principal_minor', p_amount, 'currency', 'UAH', 'arisen_on', '2026-10-10', 'origin', p_origin, 'due_on', p_due)
$$;
create function pg_temp.op(p_id uuid) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'account_id', 'a0000000-0000-4000-8000-000000000401',
    'occurred_at', '2026-10-10T10:00:00Z', 'kind', 'income', 'amount_minor', 1, 'category_id', null)
$$;
create function pg_temp.debt_ob(p_debt uuid) returns public.obligation_states language sql as $$
  select * from public.obligation_states where source_type = 'debt' and source_id = p_debt
  order by lifecycle = 'active' desc limit 1
$$;
create function pg_temp.balance() returns bigint language sql as $$
  select balance_minor from public.account_balances where account_id = 'a0000000-0000-4000-8000-000000000401'
$$;

-- card with 10 000.00
insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000401'::uuid, ledger_id, 'Основна картка', 'bank', 'UAH', 1000000, '2026-10-01'::date
from spaces where name = 'shared'
union all
select 'a0000000-0000-4000-8000-000000000402'::uuid, ledger_id, 'Чужа', 'cash', 'UAH', 0, '2026-10-01'::date
from spaces where name = 'stranger';

select pg_temp.login('00000000-0000-4000-8000-000000000401');

-- I lend Andrii 3 500.00 now, due 15 November: money leaves the card, no income or expense
select lives_ok(
  format('select public.save_debt(%L, %L)',
    pg_temp.debt('d4000000-0000-4000-8000-000000000401', 'shared', 'owed_to_me', 'Андрій', 350000, 'new_movement', '2026-11-15'),
    pg_temp.op('b4000000-0000-4000-8000-000000000401')),
  'owner lends 3 500.00 with a due date');
select is(
  (select array[kind, coalesce(category_id::text, '-'), amount_minor::text] from public.operations
   where id = 'b4000000-0000-4000-8000-000000000401'),
  array['debt_out', '-', '350000'], 'the loan is a debt_out of the debt amount without a category, whatever the client sent');
select is(pg_temp.balance(), 650000::bigint, 'the balance goes down by the loan');
select is(
  (select array[direction, state, planned_amount_minor::text, due_on::text] from pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')),
  array['in', 'plan', '350000', '2026-11-15'], 'a due date makes an expected inflow of the whole debt');
select is(
  (select count(*)::int from public.operations where ledger_id = pg_temp.space('shared') and kind in ('income', 'expense')),
  0, 'lending is neither income nor expense');

-- Andrii returns 1 000.00: the repayment pays the obligation
select lives_ok(
  format('select public.add_debt_movement(%L, %L)',
    '{"id": "d4100000-0000-4000-8000-000000000401", "debt_id": "d4000000-0000-4000-8000-000000000401", "amount_minor": 100000}',
    pg_temp.op('b4000000-0000-4000-8000-000000000402')),
  'owner records a partial repayment');
select is(
  array[(select kind from public.operations where id = 'b4000000-0000-4000-8000-000000000402'), pg_temp.balance()::text],
  array['debt_in', '750000'], 'the repayment is a debt_in and the balance goes up');
select is(
  (select array[state, paid_minor::text, remaining_minor::text] from pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')),
  array['partial', '100000', '250000'], 'the obligation is partly paid by the repayment');
select is(
  (public.add_debt_movement('{"id": "d4100000-0000-4000-8000-000000000401", "debt_id": "d4000000-0000-4000-8000-000000000401",
     "amount_minor": 999}', pg_temp.op('b4000000-0000-4000-8000-000000000499'))).amount_minor,
  100000::bigint, 'a replay of the repayment returns it');
select is(
  (select array[count(*) filter (where kind = 'debt_in'), (select count(*) from public.debt_movements
     where debt_id = 'd4000000-0000-4000-8000-000000000401')]::bigint[]
   from public.operations where ledger_id = pg_temp.space('shared')),
  array[1, 2]::bigint[], 'the replay wrote no operation and no movement');
select throws_ok(
  format('select * from public.pay_obligation(%L, %L, %s, 100, %L)', 'e4000000-0000-4000-8000-000000000401',
    (pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')).obligation_id,
    (pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')).version,
    jsonb_build_object('id', 'b4000000-0000-4000-8000-000000000403', 'ledger_id', pg_temp.space('shared'), 'kind', 'income',
      'account_id', 'a0000000-0000-4000-8000-000000000401', 'amount_minor', 100, 'currency', 'UAH',
      'occurred_at', '2026-10-11T10:00:00Z')),
  '22023', null, 'a debt obligation cannot be paid as income');
select lives_ok(
  $$ select public.add_debt_movement('{"id": "d4100000-0000-4000-8000-000000000402",
       "debt_id": "d4000000-0000-4000-8000-000000000401", "amount_minor": 50000, "occurred_on": "2026-10-01"}') $$,
  'owner records 500.00 returned before tracking, with no operation');
select is(
  (select array[planned_amount_minor, paid_minor, remaining_minor] from pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')),
  array[300000, 100000, 200000]::bigint[], 'a repayment without money lowers the plan; 2 000.00 still owed');
select is(pg_temp.balance(), 750000::bigint, 'a repayment without an operation does not touch the balance');

-- edits: a later due date moves the obligation, the nominal date stays; a stale version is refused
select lives_ok(
  format('select public.save_debt(%L)', '{"id": "d4000000-0000-4000-8000-000000000401", "version": 1,
    "due_on": "2026-11-20", "principal_minor": 1}'::jsonb || jsonb_build_object('ledger_id', pg_temp.space('shared'))),
  'owner moves the due date');
select is(
  (select array[due_on::text, occurrence_on::text, planned_amount_minor::text, (select principal_minor::text from public.debts
     where id = 'd4000000-0000-4000-8000-000000000401')] from pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')),
  array['2026-11-20', '2026-11-15', '300000', '350000'], 'due_on moves, occurrence_on and the principal stay');
select throws_ok(
  format('select public.save_debt(%L)', '{"id": "d4000000-0000-4000-8000-000000000401", "version": 1,
    "note": "x"}'::jsonb || jsonb_build_object('ledger_id', pg_temp.space('shared'))),
  'PT409', null, 'an edit from a stale version is refused');

-- an old debt I owe Taras, no movement now; a dinner share Iryna owes me; a debt without a due date
select lives_ok(
  format('select public.save_debt(%L)',
    pg_temp.debt('d4000000-0000-4000-8000-000000000402', 'shared', 'i_owe', 'Тарас', 200000, 'existing_no_movement', '2026-11-20')),
  'owner records an old debt without a movement');
select is(
  (select array[direction, planned_amount_minor::text] from pg_temp.debt_ob('d4000000-0000-4000-8000-000000000402'))
  || (select count(*)::text from public.operations where ledger_id = pg_temp.space('shared')),
  array['out', '200000', '2'], 'an old debt I owe is a planned outflow and makes no operation');
select throws_ok(
  format('select public.save_debt(%L, %L)',
    pg_temp.debt('d4000000-0000-4000-8000-000000000403', 'shared', 'i_owe', 'Тарас', 1, 'existing_no_movement', null),
    pg_temp.op('b4000000-0000-4000-8000-000000000404')),
  '22023', null, 'an old debt cannot come with an operation');
select throws_ok(
  format('select public.save_debt(%L)',
    pg_temp.debt('d4000000-0000-4000-8000-000000000403', 'shared', 'owed_to_me', 'Тарас', 1, 'new_movement', null)),
  '22023', null, 'a new movement needs its operation');
select lives_ok(
  format('select public.create_operation(%L)', jsonb_build_object('id', 'b4000000-0000-4000-8000-000000000405',
    'ledger_id', pg_temp.space('shared'), 'kind', 'expense', 'account_id', 'a0000000-0000-4000-8000-000000000401',
    'amount_minor', 240000, 'currency', 'UAH', 'occurred_at', '2026-10-18T19:00:00Z', 'counterparty', 'Львівська кава')),
  'owner pays 2 400.00 for a dinner');
select throws_ok(
  format('select public.save_debt(%L)', pg_temp.debt('d4000000-0000-4000-8000-000000000403', 'shared', 'owed_to_me',
    'Ірина', 300000, 'purchase_share', null) || '{"share_of_operation_id": "b4000000-0000-4000-8000-000000000405"}'),
  '22023', null, 'a share cannot exceed the purchase');
select lives_ok(
  format('select public.save_debt(%L)', pg_temp.debt('d4000000-0000-4000-8000-000000000403', 'shared', 'owed_to_me',
    'Ірина', 120000, 'purchase_share', null) || '{"share_of_operation_id": "b4000000-0000-4000-8000-000000000405"}'),
  'Ірина owes her half of the dinner');
select is(
  (select array[count(*)::text, sum(amount_minor)::text] from public.operations
   where ledger_id = pg_temp.space('shared') and kind = 'expense')
  || (select count(*)::text from public.obligations where source_id = 'd4000000-0000-4000-8000-000000000403'),
  array['1', '240000', '0'], 'the purchase stays one whole expense; a share without a due date has no obligation');
select is(
  (public.save_debt(pg_temp.debt('d4000000-0000-4000-8000-000000000403', 'shared', 'owed_to_me', 'x', 1,
    'existing_no_movement', null))).person,
  'Ірина', 'a replay of the create returns the debt unchanged');

-- deleting the repayment operation removes the movement and its payment
select lives_ok(
  $$ select public.delete_operation('b4000000-0000-4000-8000-000000000402', 1) $$, 'owner deletes the repayment');
select is(
  (select array[paid_minor, (select count(*) from public.debt_movements where id = 'd4100000-0000-4000-8000-000000000401')]
   from pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')),
  array[0, 0]::bigint[], 'the movement and the payment go with the operation');

-- writing the debt off cancels its obligation and closes it to movements
select lives_ok(
  format('select public.save_debt(%L)', '{"id": "d4000000-0000-4000-8000-000000000401", "version": 2,
    "status": "written_off"}'::jsonb || jsonb_build_object('ledger_id', pg_temp.space('shared'))),
  'owner writes the debt off');
select is((pg_temp.debt_ob('d4000000-0000-4000-8000-000000000401')).state, 'cancelled',
  'a written-off debt cancels its obligation');
select throws_ok(
  $$ select public.add_debt_movement('{"id": "d4100000-0000-4000-8000-000000000403",
       "debt_id": "d4000000-0000-4000-8000-000000000401", "amount_minor": 1, "occurred_on": "2026-10-20"}') $$,
  '22023', null, 'a written-off debt takes no movement');
select throws_ok(
  format('select public.save_debt(%L)', pg_temp.debt('d4000000-0000-4000-8000-000000000404', 'shared', 'i_owe', 'x', 1,
    'existing_no_movement', null) || '{"account_id": "a0000000-0000-4000-8000-000000000402"}'),
  '23503', null, 'a debt cannot use an account of another space');
reset role;

-- editor
select pg_temp.login('00000000-0000-4000-8000-000000000402');
select lives_ok(
  format('select public.save_debt(%L)',
    pg_temp.debt('d4000000-0000-4000-8000-000000000405', 'shared', 'i_owe', 'Марина', 45000, 'existing_no_movement', null)),
  'editor records a debt');
select throws_ok(
  $$ insert into public.debts (ledger_id, direction, person, principal_minor, currency, arisen_on, origin)
     values (pg_temp.space('shared'), 'i_owe', 'x', 1, 'UAH', '2026-10-01', 'existing_no_movement') $$,
  '42501', null, 'editor cannot write a debt past the RPC');
select throws_ok(
  $$ insert into public.debt_movements (ledger_id, debt_id, kind, amount_minor, occurred_on)
     values (pg_temp.space('shared'), 'd4000000-0000-4000-8000-000000000405', 'repayment', 1, '2026-10-01') $$,
  '42501', null, 'editor cannot write a movement past the RPC');
reset role;

-- viewer
select pg_temp.login('00000000-0000-4000-8000-000000000403');
select is(
  (select count(*)::int from public.debts where ledger_id = pg_temp.space('shared')), 4, 'viewer sees the debts');
select throws_ok(
  $$ select public.add_debt_movement('{"id": "d4100000-0000-4000-8000-000000000404",
       "debt_id": "d4000000-0000-4000-8000-000000000402", "amount_minor": 1, "occurred_on": "2026-10-20"}') $$,
  '42501', null, 'viewer cannot record a repayment');
reset role;

-- stranger
select pg_temp.login('00000000-0000-4000-8000-000000000404');
select is(
  (select count(*)::int from (select ledger_id from public.debts union all select ledger_id from public.debt_movements) v
   where ledger_id = pg_temp.space('shared')),
  0, 'stranger sees no debt or movement of the shared space');
select throws_ok(
  format('select public.save_debt(%L)',
    pg_temp.debt('d4000000-0000-4000-8000-000000000402', 'stranger', 'i_owe', 'x', 1, 'existing_no_movement', null)),
  '23505', null, 'a debt id of another space is refused without revealing it');
select throws_ok(
  $$ select public.add_debt_movement('{"id": "d4100000-0000-4000-8000-000000000405",
       "debt_id": "d4000000-0000-4000-8000-000000000402", "amount_minor": 1, "occurred_on": "2026-10-20"}') $$,
  '42501', null, 'stranger cannot record a repayment of a foreign debt');
reset role;

select * from finish();
rollback;
