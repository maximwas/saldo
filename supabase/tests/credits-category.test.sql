-- The system category «Credits» (credits_system_category.sql) and the backfill of plan payments
-- (plan_payments_backfill.sql) on the four roles (owner, editor, viewer, outsider): every space has one, nobody renames,
-- archives or deletes it, a credit installment takes it, so its payment is filed under it; the backfill fills only
-- empty values. Fictional data only.
begin;
select plan(17);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000611', 'pgtap-credits-owner@example.com'),
  ('00000000-0000-4000-8000-000000000612', 'pgtap-credits-editor@example.com'),
  ('00000000-0000-4000-8000-000000000613', 'pgtap-credits-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000614', 'pgtap-credits-outsider@example.com');

create temp table space (ledger_id uuid);
insert into space select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000611';
grant select on space to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000612'::uuid, 'editor' from space
union all
select ledger_id, '00000000-0000-4000-8000-000000000613'::uuid, 'viewer' from space;

insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_minor, opening_balance_on, created_by)
select 'a0000000-0000-4000-8000-000000000611'::uuid, ledger_id, 'Картка', 'bank', 'UAH', 1000000, '2026-10-01'::date,
  '00000000-0000-4000-8000-000000000611'::uuid from space;

-- ids are taken before the roles log in: an outsider's RLS shows no categories at all
create temp table ids as select
  (select id from public.categories where ledger_id = (select ledger_id from space) and system_key = 'credits') as sys,
  (select id from public.categories where ledger_id = (select ledger_id from space) and name = 'Інше' and kind = 'expense') as other;
grant select on ids to authenticated;

-- a new operation of the «Paid» sheet: no payee, no category (what the client sends for a credit installment)
create function pg_temp.op(p_id uuid, p_amount bigint) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'ledger_id', (select ledger_id from space), 'kind', 'expense',
    'account_id', 'a0000000-0000-4000-8000-000000000611', 'amount_minor', p_amount, 'currency', 'UAH',
    'occurred_at', '2026-11-05T10:00:00Z')
$$;
create function pg_temp.installment(p_no int) returns uuid language sql as $$
  select id from public.obligations where source_type = 'credit' and sequence_no = p_no
    and source_id = 'c0000000-0000-4000-8000-000000000611'
$$;

select is((select name || '/' || kind from public.categories where id = (select sys from ids)), 'Кредити/expense',
  'a new space has the system expense category «Кредити»');
select is((select count(*)::int from public.categories where ledger_id = (select ledger_id from space) and system_key is not null),
  2, 'next to «Підписки», two system categories');

select pg_temp.login('00000000-0000-4000-8000-000000000611');
select throws_ok($$ update public.categories set name = 'Позики' where id = (select sys from ids) $$,
  '42501', null, 'owner cannot rename it');
select throws_ok($$ select public.archive_category((select sys from ids)) $$, '42501', null, 'owner cannot archive it');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000612');
select throws_ok(format('select public.delete_category(%L, %L)', (select sys from ids), (select other from ids)),
  '42501', null, 'editor cannot delete it');
select lives_ok($$ select public.save_credit(
    jsonb_build_object('id', 'c0000000-0000-4000-8000-000000000611', 'ledger_id', (select ledger_id from space),
      'name', 'Магазин — телевізор', 'currency', 'UAH', 'installments_count', 3, 'regular_installment_minor', 100000,
      'account_id', 'a0000000-0000-4000-8000-000000000611'),
    '[{"sequence_no": 1, "due_on": "2026-11-05", "amount_minor": 100000},
      {"sequence_no": 2, "due_on": "2026-12-05", "amount_minor": 100000},
      {"sequence_no": 3, "due_on": "2027-01-05", "amount_minor": 100000}]') $$, 'editor adds a credit');
select is((select count(*)::int from public.obligations
    where source_id = 'c0000000-0000-4000-8000-000000000611' and category_id = (select sys from ids)),
  3, 'every installment takes «Кредити»');
select lives_ok($$ select public.pay_obligation('e0000000-0000-4000-8000-000000000611', pg_temp.installment(1), 1, 100000,
    pg_temp.op('b0000000-0000-4000-8000-000000000611', 100000)) $$, 'editor pays the first installment');
select is((select category_id from public.operations where id = 'b0000000-0000-4000-8000-000000000611'), (select sys from ids),
  'the paid installment is an expense in «Кредити», not without a category');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000613');
with u as (update public.categories set name = 'x' where id = (select sys from ids) returning 1)
select is(count(*)::int, 0, 'viewer changes nothing') from u;
select throws_ok(format('select public.delete_category(%L)', (select sys from ids)), '42501', null, 'viewer cannot delete it');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000614');
select throws_ok(format('select public.delete_category(%L)', (select sys from ids)), '42501', null, 'outsider cannot delete it');
reset role;

-- the backfill: two installments paid before the fix (no payee, no category), the second one with a payee and a
-- category its author typed in afterwards
select pg_temp.login('00000000-0000-4000-8000-000000000612');
select public.pay_obligation('e0000000-0000-4000-8000-000000000612', pg_temp.installment(2), 1, 100000,
  pg_temp.op('b0000000-0000-4000-8000-000000000612', 100000));
select public.pay_obligation('e0000000-0000-4000-8000-000000000613', pg_temp.installment(3), 1, 100000,
  pg_temp.op('b0000000-0000-4000-8000-000000000613', 100000));
reset role;
update public.operations set counterparty = null, category_id = null
  where id in ('b0000000-0000-4000-8000-000000000611', 'b0000000-0000-4000-8000-000000000612');
update public.operations set counterparty = 'Мій опис', category_id = (select other from ids)
  where id = 'b0000000-0000-4000-8000-000000000613';
create temp table before as select id, version from public.operations
  where id::text like 'b0000000-0000-4000-8000-00000000061_';

select lives_ok($$ select private.fill_plan_payment_operations() $$, 'the backfill runs');
select is((select counterparty || '/' || (category_id = (select sys from ids))::text from public.operations
    where id = 'b0000000-0000-4000-8000-000000000611'),
  'Магазин — телевізор/true', 'an old installment payment gets the plan title and «Кредити»');
select is((select counterparty || '/' || (category_id = (select other from ids))::text from public.operations
    where id = 'b0000000-0000-4000-8000-000000000613'),
  'Мій опис/true', 'a payee and a category someone set are kept');
select is((select array_agg(o.version - b.version order by o.id) from public.operations o join before b using (id)),
  array[1, 1, 0], 'only the filled rows get a new version');
select private.fill_plan_payment_operations();
select is((select array_agg(o.version - b.version order by o.id) from public.operations o join before b using (id)),
  array[1, 1, 0], 'a second run changes nothing');

select * from finish();
rollback;
