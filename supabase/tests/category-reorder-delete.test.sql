-- reorder_categories and delete_category on the four roles (owner, editor, viewer, outsider). Fictional data only.
begin;
select plan(14);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000401', 'pgtap-cat-owner@example.com'),
  ('00000000-0000-4000-8000-000000000402', 'pgtap-cat-editor@example.com'),
  ('00000000-0000-4000-8000-000000000403', 'pgtap-cat-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000404', 'pgtap-cat-outsider@example.com');

create temp table space (ledger_id uuid);
insert into space select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000401';
grant select on space to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000402'::uuid, 'editor' from space
union all
select ledger_id, '00000000-0000-4000-8000-000000000403'::uuid, 'viewer' from space;

-- ids are taken before the roles log in: an outsider's RLS shows no categories at all
create temp table cats as
  select name, id from public.categories where ledger_id = (select ledger_id from space) and kind = 'expense';
grant select on cats to authenticated;
create function pg_temp.cat(p_name text) returns uuid language sql as $$ select id from cats where name = p_name $$;
create function pg_temp.items(p_first text, p_second text) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('id', pg_temp.cat(p_first), 'version', (select version from public.categories where id = pg_temp.cat(p_first)), 'sort_order', 2),
    jsonb_build_object('id', pg_temp.cat(p_second), 'version', (select version from public.categories where id = pg_temp.cat(p_second)), 'sort_order', 1));
$$;
grant execute on function pg_temp.cat(text), pg_temp.items(text, text) to authenticated;

-- one account and an operation in the Cafe category (made by the superuser: the RPC under test is category-only)
insert into public.accounts (id, ledger_id, name, kind, currency, opening_balance_on)
select 'a0000000-0000-4000-8000-000000000401', ledger_id, 'Картка', 'bank', 'UAH', '2026-10-01' from space;
insert into public.operations (id, ledger_id, kind, direction, account_id, amount_minor, currency, category_id, occurred_at, occurred_on, base_currency, base_amount_minor, created_by)
select 'b0000000-0000-4000-8000-000000000401', ledger_id, 'expense', 'out', 'a0000000-0000-4000-8000-000000000401', 5000, 'UAH',
  pg_temp.cat('Кафе'), '2026-10-05T10:00:00Z', '2026-10-05', 'UAH', 5000, '00000000-0000-4000-8000-000000000401' from space;

-- reorder_categories
select pg_temp.login('00000000-0000-4000-8000-000000000401');
select lives_ok($$ select public.reorder_categories(pg_temp.items('Житло', 'Продукти')) $$, 'owner reorders');
select is((select sort_order from public.categories where id = pg_temp.cat('Житло')), 2, 'the new place is written');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000402');
select lives_ok($$ select public.reorder_categories(pg_temp.items('Житло', 'Продукти')) $$, 'editor reorders');
select throws_ok(
  $$ select public.reorder_categories(jsonb_build_array(jsonb_build_object('id', pg_temp.cat('Житло'), 'version', 1, 'sort_order', 9))) $$,
  'PT409', null, 'a stale version is refused');
select is((select sort_order from public.categories where id = pg_temp.cat('Житло')), 2, 'nothing is written on a conflict');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000403');
select throws_ok($$ select public.reorder_categories(pg_temp.items('Житло', 'Продукти')) $$, '42501', null, 'viewer cannot reorder');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000404');
select throws_ok($$ select public.reorder_categories(pg_temp.items('Житло', 'Продукти')) $$, '42501', null, 'outsider cannot reorder');
reset role;

-- delete_category
select pg_temp.login('00000000-0000-4000-8000-000000000403');
select throws_ok(format('select public.delete_category(%L, %L)', pg_temp.cat('Кафе'), pg_temp.cat('Інше')),
  '42501', null, 'viewer cannot delete');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000404');
select throws_ok(format('select public.delete_category(%L, %L)', pg_temp.cat('Кафе'), pg_temp.cat('Інше')),
  '42501', null, 'outsider cannot delete');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000402');
select throws_ok(format('select public.delete_category(%L)', pg_temp.cat('Кафе')),
  '23503', null, 'a category in use cannot be deleted without a target');
select throws_ok(format('select public.delete_category(%L, %L)', pg_temp.cat('Кафе'), pg_temp.cat('Кафе')),
  '22023', null, 'the target cannot be the deleted category');
select lives_ok(format('select public.delete_category(%L, %L)', pg_temp.cat('Кафе'), pg_temp.cat('Інше')),
  'editor deletes and moves');
reset role;
select is((select category_id from public.operations where id = 'b0000000-0000-4000-8000-000000000401'),
  pg_temp.cat('Інше'), 'the operation moved to the target');
select is((select count(*)::int from public.categories where ledger_id = (select ledger_id from space) and name = 'Кафе'), 0,
  'the category is gone, not archived');

select * from finish();
rollback;
