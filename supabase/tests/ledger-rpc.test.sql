-- Space RPCs (ADR 19, 20): create_ledger, invites (expired / foreign / repeated, editor cannot invite), roles, leaving.
-- Fictional data only.
begin;
select plan(30);

create function pg_temp.login(p_user uuid, p_email text default null) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated', 'email', p_email)::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 invitee, 4 someone else, 5 viewer
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000205', 'pgtap-rpc-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000201', 'pgtap-rpc-owner@example.com'),
  ('00000000-0000-4000-8000-000000000202', 'pgtap-rpc-editor@example.com'),
  ('00000000-0000-4000-8000-000000000203', 'pgtap-rpc-invitee@example.com'),
  ('00000000-0000-4000-8000-000000000204', 'pgtap-rpc-other@example.com');

create temp table shared_space (ledger_id uuid);
insert into shared_space select id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000201';
grant select on shared_space to authenticated;
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000202'::uuid, 'editor' from shared_space
union all
select ledger_id, '00000000-0000-4000-8000-000000000205'::uuid, 'viewer' from shared_space;

-- invites made by hand for the expiry, revoke and foreign-email cases
insert into public.ledger_invites (ledger_id, email, role, token_hash, expires_at, revoked_at, created_by)
select ledger_id, 'pgtap-rpc-invitee@example.com', 'viewer', sha256(convert_to('token-expired', 'UTF8')),
  now() - interval '1 day', null::timestamptz, '00000000-0000-4000-8000-000000000201'::uuid from shared_space
union all
select ledger_id, 'pgtap-rpc-invitee@example.com', 'viewer', sha256(convert_to('token-revoked', 'UTF8')),
  now() + interval '1 day', now(), '00000000-0000-4000-8000-000000000201'::uuid from shared_space
union all
select ledger_id, 'someone-else@example.com', 'viewer', sha256(convert_to('token-foreign', 'UTF8')),
  now() + interval '1 day', null, '00000000-0000-4000-8000-000000000201'::uuid from shared_space;

-- create_ledger
select pg_temp.login('00000000-0000-4000-8000-000000000203', 'pgtap-rpc-invitee@example.com');
select is(
  (public.create_ledger('f0000000-0000-4000-8000-000000000001', 'Друга', 'EUR')).base_currency, 'EUR',
  'a user creates a second space');
select is(
  (select role from public.ledger_members where ledger_id = 'f0000000-0000-4000-8000-000000000001'
     and user_id = '00000000-0000-4000-8000-000000000203'),
  'owner', 'the author owns the new space');
select is((select count(*)::int from public.categories where ledger_id = 'f0000000-0000-4000-8000-000000000001'), 15,
  'the new space gets the standard categories');
-- Figma «Saldo» 13:74335 (default categories)
select is(
  (select string_agg(concat_ws(' ', kind, name, color, icon), ', ' order by kind desc, sort_order) from public.categories
     where ledger_id = 'f0000000-0000-4000-8000-000000000001'),
  'income Зарплата forest briefcase, income Фриланс lime laptop, income Подарунки magenta gift, income Інше sand coins, '
  'expense Житло blue house, expense Продукти green shopping-basket, expense Кафе yellow coffee, expense Транспорт cyan bus, '
  'expense Авто orange car, expense Підписки pink repeat, expense Здоров''я red heart-pulse, '
  'expense Покупки purple shopping-bag, expense Відпочинок teal tree-palm, expense Податки slate landmark, '
  'expense Інше graphite ellipsis',
  'the standard categories carry the names, colours and icons of the defaults table');
select lives_ok($$ select public.create_ledger('f0000000-0000-4000-8000-000000000001', 'Друга', 'EUR') $$,
  'a repeated create is accepted');
select is((select count(*)::int from public.ledger_members where ledger_id = 'f0000000-0000-4000-8000-000000000001'), 1,
  'a repeated create writes nothing');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000204');
select throws_ok($$ select public.create_ledger('f0000000-0000-4000-8000-000000000001', 'Чужа', 'UAH') $$,
  '23505', null, 'someone else''s space id cannot be taken over');
reset role;

-- create_ledger_invite
select pg_temp.login('00000000-0000-4000-8000-000000000201');
select lives_ok(
  $$ select public.create_ledger_invite('f1000000-0000-4000-8000-000000000001', (select ledger_id from shared_space),
       'PGTAP-RPC-Invitee@example.com', 'editor', sha256(convert_to('token-valid', 'UTF8'))) $$,
  'owner invites');
select lives_ok(
  $$ select public.create_ledger_invite('f1000000-0000-4000-8000-000000000001', (select ledger_id from shared_space),
       'PGTAP-RPC-Invitee@example.com', 'editor', sha256(convert_to('token-valid', 'UTF8'))) $$,
  'a repeated invite is accepted');
select is((select count(*)::int from public.ledger_invites where ledger_id = (select ledger_id from shared_space)), 4,
  'a repeated invite writes nothing');
select throws_ok(
  $$ select public.create_ledger_invite(gen_random_uuid(), (select ledger_id from shared_space), 'pgtap-rpc-other@example.com', 'owner',
       sha256(convert_to('token-owner', 'UTF8'))) $$,
  '23514', null, 'nobody is invited as owner');
select throws_ok(
  $$ select public.create_ledger_invite(gen_random_uuid(), (select ledger_id from shared_space), 'nobody@example.com', 'viewer',
       sha256(convert_to('token-nobody', 'UTF8'))) $$,
  'SL404', null, 'an email without a Saldo account is refused');
select throws_ok(
  $$ select public.create_ledger_invite(gen_random_uuid(), (select ledger_id from shared_space), 'PGTAP-RPC-Editor@example.com',
       'viewer', sha256(convert_to('token-member', 'UTF8'))) $$,
  'SL409', null, 'a member of the space is refused');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000205');
select throws_ok(
  $$ select public.create_ledger_invite(gen_random_uuid(), (select ledger_id from shared_space), 'pgtap-rpc-other@example.com',
       'viewer', sha256(convert_to('token-viewer', 'UTF8'))) $$,
  '42501', null, 'viewer cannot invite');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000202');
select throws_ok(
  $$ select public.create_ledger_invite(gen_random_uuid(), (select ledger_id from shared_space), 'x@example.com', 'viewer',
       sha256(convert_to('token-editor', 'UTF8'))) $$,
  '42501', null, 'editor cannot invite');
reset role;

-- accept_ledger_invite
select pg_temp.login('00000000-0000-4000-8000-000000000203', 'pgtap-rpc-invitee@example.com');
select throws_ok($$ select public.accept_ledger_invite('token-expired') $$, 'PT410', null, 'an expired invite is refused');
select throws_ok($$ select public.accept_ledger_invite('token-revoked') $$, 'PT410', null, 'a revoked invite is refused');
select throws_ok($$ select public.accept_ledger_invite('token-foreign') $$, '42501', null, 'an invite for another email is refused');
select throws_ok($$ select public.accept_ledger_invite('token-unknown') $$, 'P0002', null, 'an unknown token is refused');
select is(public.accept_ledger_invite('token-valid'), (select ledger_id from shared_space),
  'the invitee accepts (email compared case-insensitively)');
select is(
  (select role from public.ledger_members where ledger_id = (select ledger_id from shared_space)
     and user_id = '00000000-0000-4000-8000-000000000203'),
  'editor', 'the invitee joins with the invited role');
select is(public.accept_ledger_invite('token-valid'), (select ledger_id from shared_space), 'a repeated accept is safe');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000204', 'pgtap-rpc-invitee@example.com');
select throws_ok($$ select public.accept_ledger_invite('token-valid') $$, 'PT410', null, 'a used invite cannot be reused');
reset role;

-- roles and leaving
select pg_temp.login('00000000-0000-4000-8000-000000000202');
select throws_ok(
  $$ select public.set_member_role((select ledger_id from shared_space), '00000000-0000-4000-8000-000000000203', 'viewer') $$,
  '42501', null, 'editor cannot change roles');
select throws_ok(
  $$ select public.remove_member((select ledger_id from shared_space), '00000000-0000-4000-8000-000000000203') $$,
  '42501', null, 'editor cannot remove another member');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000201');
select lives_ok(
  $$ select public.set_member_role((select ledger_id from shared_space), '00000000-0000-4000-8000-000000000203', 'viewer') $$,
  'owner changes a role');
select throws_ok(
  $$ select public.set_member_role((select ledger_id from shared_space), '00000000-0000-4000-8000-000000000203', 'owner') $$,
  '22023', null, 'nobody becomes a second owner');
select throws_ok(
  $$ select public.remove_member((select ledger_id from shared_space), '00000000-0000-4000-8000-000000000201') $$,
  '42501', null, 'owner cannot remove self');
select lives_ok(
  $$ select public.remove_member((select ledger_id from shared_space), '00000000-0000-4000-8000-000000000202') $$,
  'owner revokes the editor');
reset role;
select pg_temp.login('00000000-0000-4000-8000-000000000203');
select lives_ok(
  $$ select public.remove_member((select ledger_id from shared_space), '00000000-0000-4000-8000-000000000203') $$,
  'a member leaves the space');
reset role;

select * from finish();
rollback;
