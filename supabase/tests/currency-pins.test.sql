-- Pinned rates (migration currency_pins): every member reads and sets their own pinned_currencies through
-- my_pinned_currencies / set_my_pinned_currencies, at most three distinct ISO codes, and nobody else's. fx_rates takes
-- any ISO code now (the daily cron stores every NBU currency). Fictional data only.
begin;
select plan(16);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- c01 owner, c02 editor, c03 viewer, c04 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000c01', 'pgtap-pins-owner@example.com'),
  ('00000000-0000-4000-8000-000000000c02', 'pgtap-pins-editor@example.com'),
  ('00000000-0000-4000-8000-000000000c03', 'pgtap-pins-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000c04', 'pgtap-pins-stranger@example.com');

create temp table spaces (ledger_id uuid);
insert into spaces select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000c01';
grant select on spaces to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000c02'::uuid, 'editor' from spaces
union all
select ledger_id, '00000000-0000-4000-8000-000000000c03'::uuid, 'viewer' from spaces;

create function pg_temp.space() returns uuid language sql as $$ select ledger_id from spaces $$;
-- read as the test owner (postgres): the row as it really is, whoever is logged in
create function pg_temp.pins(p_user uuid) returns text[] language sql as $$
  select pinned_currencies from public.ledger_members where ledger_id = pg_temp.space() and user_id = p_user
$$;

select is(pg_temp.pins('00000000-0000-4000-8000-000000000c02'), array['USD', 'EUR'],
  'a new member sees USD and EUR by default');

select pg_temp.login('00000000-0000-4000-8000-000000000c01');
select lives_ok($$ select public.set_my_pinned_currencies(pg_temp.space(), array['USD', 'EUR', 'PLN']) $$,
  'the owner pins three currencies');
select is(public.my_pinned_currencies(pg_temp.space()), array['USD', 'EUR', 'PLN'], 'the owner reads their own pins');
select pg_temp.login('00000000-0000-4000-8000-000000000c02');
select lives_ok($$ select public.set_my_pinned_currencies(pg_temp.space(), array['GBP']) $$,
  'an editor pins their own currencies');
select is(public.my_pinned_currencies(pg_temp.space()), array['GBP'], 'an editor reads their own pins, not the owner''s');
select pg_temp.login('00000000-0000-4000-8000-000000000c03');
select lives_ok($$ select public.set_my_pinned_currencies(pg_temp.space(), array[]::text[]) $$,
  'a viewer may pin too, even nothing: it is their own view');
select throws_ok($$ select public.set_my_pinned_currencies(pg_temp.space(), array['USD', 'EUR', 'PLN', 'GBP']) $$,
  '22023', null, 'a fourth pin is refused');
select throws_ok($$ select public.set_my_pinned_currencies(pg_temp.space(), array['USD', 'USD']) $$,
  '22023', null, 'a currency pinned twice is refused');
select throws_ok($$ select public.set_my_pinned_currencies(pg_temp.space(), array['usd']) $$,
  '22023', null, 'a code that is not ISO 4217 is refused');
select pg_temp.login('00000000-0000-4000-8000-000000000c04');
select throws_ok($$ select public.set_my_pinned_currencies(pg_temp.space(), array['CHF']) $$,
  '42501', null, 'a stranger cannot pin in someone else''s space');
select is(public.my_pinned_currencies(pg_temp.space()), null::text[], 'a stranger reads no pins of someone else''s space');

-- the column is not in the update grant: a direct update fails even on the own row
select pg_temp.login('00000000-0000-4000-8000-000000000c02');
select throws_ok($$ update public.ledger_members set pinned_currencies = array['XAU']
  where ledger_id = pg_temp.space() and user_id = '00000000-0000-4000-8000-000000000c02' $$,
  '42501', null, 'a member cannot update pinned_currencies directly');
reset role;

select is(pg_temp.pins('00000000-0000-4000-8000-000000000c01'), array['USD', 'EUR', 'PLN'],
  'the owner''s pins stay theirs');
select is(pg_temp.pins('00000000-0000-4000-8000-000000000c03'), array[]::text[], 'the viewer''s empty choice is kept');

-- the daily cron's rows: any NBU currency against the base, a code of another shape is refused
select lives_ok($$ insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on, source, source_name)
  values (pg_temp.space(), 'PLN', 'UAH', 9.65, '2026-11-03', 'reference', 'nbu') $$, 'fx_rates takes a PLN rate');
select throws_ok($$ insert into public.fx_rates (ledger_id, base_currency, quote_currency, rate, rate_on)
  values (pg_temp.space(), 'zl', 'UAH', 9.65, '2026-11-03') $$, '23514', null, 'fx_rates refuses a code that is not ISO');

select * from finish();
rollback;
