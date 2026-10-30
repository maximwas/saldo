-- Reminders of phase 3 (reminders.sql): RLS of reminder_rules, notifications and push_subscriptions on four roles;
-- due_reminder_fires is service-role only, returns one row per member with a channel on at the rule's local time,
-- none for a member who turned the space's reminders off, nothing twice and nothing after the obligation is paid.
-- Fictional data only (docs/design/demo-data.md).
begin;
select plan(20);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- rows of a table one user sees, back as postgres afterwards
create function pg_temp.count_as(p_user uuid, p_table text) returns bigint language plpgsql as $$
declare
  v_count bigint;
begin
  perform pg_temp.login(p_user);
  execute format('select count(*) from public.%I', p_table) into v_count;
  reset role;
  return v_count;
end $$;

-- rows a write statement touched under the current role (RLS filters an update or delete to zero rows silently)
create function pg_temp.affected(p_sql text) returns bigint language plpgsql as $$
declare
  v_count bigint;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- 1 owner, 2 editor, 3 viewer, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000901', 'pgtap-reminders-owner@example.com'),
  ('00000000-0000-4000-8000-000000000902', 'pgtap-reminders-editor@example.com'),
  ('00000000-0000-4000-8000-000000000903', 'pgtap-reminders-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000904', 'pgtap-reminders-stranger@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000901'
union all
select 'stranger', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000904';
grant select on spaces to authenticated, service_role;

-- members due a reminder in the test space only: the seed's demo space has reminders of its own
create function pg_temp.fire_users(p_now timestamptz) returns setof uuid language sql as $$
  select f.user_id from public.due_reminder_fires(p_now) f join spaces s on s.ledger_id = f.ledger_id and s.name = 'shared'
$$;

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000902'::uuid, 'editor' from spaces where name = 'shared'
union all
select ledger_id, '00000000-0000-4000-8000-000000000903'::uuid, 'viewer' from spaces where name = 'shared';

-- internet bill due 10.11 (Europe/Kyiv, UTC+2 in November), reminded 3 and 1 days before at 09:00 local
insert into public.obligations (id, ledger_id, title, occurrence_on, due_on, planned_amount_minor, currency)
select 'b0000000-0000-4000-8000-000000000901'::uuid, ledger_id, 'Інтернет', '2026-11-10', '2026-11-10', 30000, 'UAH'
from spaces where name = 'shared';
insert into public.reminder_rules (id, ledger_id, source_type, source_id, offsets_days)
select 'c0000000-0000-4000-8000-000000000901'::uuid, ledger_id, 'obligation', 'b0000000-0000-4000-8000-000000000901',
  '{3,1}'
from spaces where name = 'shared';

-- a new subscription gets the §25 default rule
insert into public.subscriptions (ledger_id, name, currency, first_on)
select ledger_id, 'Netflix', 'UAH', '2026-11-05' from spaces where name = 'shared';
select is(
  (select offsets_days from public.reminder_rules where source_type = 'subscription'
    and ledger_id = (select ledger_id from spaces where name = 'shared')),
  '{3,2}'::int[], 'a new subscription is reminded 3 and 2 days before (§25)');

-- due_reminder_fires
select pg_temp.login('00000000-0000-4000-8000-000000000901');
select throws_ok($$ select * from public.due_reminder_fires(now()) $$, '42501', null,
  'authenticated cannot execute due_reminder_fires');
reset role;

set local role service_role;
select is((select count(*) from pg_temp.fire_users('2026-11-07 06:59:59+00')), 0::bigint,
  'nothing before 09:00 Kyiv three days before');
select results_eq(
  $$ select u from pg_temp.fire_users('2026-11-07 07:00:00+00') u order by u $$,
  $$ values ('00000000-0000-4000-8000-000000000901'::uuid), ('00000000-0000-4000-8000-000000000902'::uuid),
    ('00000000-0000-4000-8000-000000000903'::uuid) $$,
  'at 09:00 Kyiv one row per member of the space, none for a stranger');
reset role;

select pg_temp.login('00000000-0000-4000-8000-000000000903');
select public.set_my_notify_channels((select ledger_id from spaces where name = 'shared'), '{}');
reset role;

create temp table due as
select f.* from public.due_reminder_fires('2026-11-07 07:00:00+00') f join spaces s on s.ledger_id = f.ledger_id
where s.name = 'shared';
select is((select count(*) from due where user_id = '00000000-0000-4000-8000-000000000903'), 0::bigint,
  'a viewer with the space''s reminders off gets none');

-- what /api/cron/reminders inserts: on conflict (user_id, fire_key) do nothing returning
create function pg_temp.deliver() returns bigint language sql as $$
  with inserted as (
    insert into public.notifications (user_id, ledger_id, reminder_rule_id, obligation_id, fire_key, title, body)
    select user_id, ledger_id, reminder_rule_id, obligation_id, fire_key, title, 'Оплата через 3 дні' from due
    on conflict (user_id, fire_key) do nothing
    returning 1
  )
  select count(*) from inserted
$$;
select is(pg_temp.deliver(), 2::bigint, 'first run: one notification per member with channels on');
select is(pg_temp.deliver(), 0::bigint, 'the same fires again: no second notification');
select is((select count(*) from pg_temp.fire_users('2026-11-07 07:10:00+00')), 0::bigint,
  'the next cron run finds nothing new');

select is((select count(*) from pg_temp.fire_users('2026-11-09 07:00:00+00')), 2::bigint,
  'one day before: due again');
update public.obligations set settled_at = now() where id = 'b0000000-0000-4000-8000-000000000901';
select is((select count(*) from pg_temp.fire_users('2026-11-09 07:00:00+00')), 0::bigint,
  'a paid obligation gets no more reminders (§24)');

-- RLS: reads on four roles (owner, editor, viewer, stranger)
select pg_temp.login('00000000-0000-4000-8000-000000000901');
insert into public.push_subscriptions (endpoint, p256dh, auth)
values ('https://push.example.com/send/pgtap-owner', 'BPgtapKey', 'pgtapAuth');
reset role;

select results_eq(
  $$ select pg_temp.count_as(u, 'reminder_rules') from unnest(array[
    '00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000902',
    '00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000904']::uuid[]) with ordinality x(u, n)
    order by n $$,
  $$ values (2::bigint), (2::bigint), (2::bigint), (0::bigint) $$,
  'reminder_rules: every member reads the space''s rules, a stranger none');
select results_eq(
  $$ select pg_temp.count_as(u, 'notifications') from unnest(array[
    '00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000902',
    '00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000904']::uuid[]) with ordinality x(u, n)
    order by n $$,
  $$ values (1::bigint), (1::bigint), (0::bigint), (0::bigint) $$,
  'notifications: each member reads only their own');
select results_eq(
  $$ select pg_temp.count_as(u, 'push_subscriptions') from unnest(array[
    '00000000-0000-4000-8000-000000000901', '00000000-0000-4000-8000-000000000902',
    '00000000-0000-4000-8000-000000000903', '00000000-0000-4000-8000-000000000904']::uuid[]) with ordinality x(u, n)
    order by n $$,
  $$ values (1::bigint), (0::bigint), (0::bigint), (0::bigint) $$,
  'push_subscriptions: only the owner of the device reads it');

-- RLS: writes
select pg_temp.login('00000000-0000-4000-8000-000000000902');
select is(pg_temp.affected($$ update public.reminder_rules set offsets_days = '{2}' where source_type = 'obligation' $$),
  1::bigint, 'an editor changes a rule');
select is(pg_temp.affected($$ update public.notifications set read_at = now()
  where user_id = '00000000-0000-4000-8000-000000000901' $$), 0::bigint, 'nobody marks another member''s notification');
select pg_temp.login('00000000-0000-4000-8000-000000000903');
select is(pg_temp.affected($$ update public.reminder_rules set enabled = false $$), 0::bigint,
  'a viewer cannot change rules');
select pg_temp.login('00000000-0000-4000-8000-000000000901');
select is(pg_temp.affected($$ update public.notifications set read_at = now() $$), 1::bigint,
  'a member marks their own notification read');
select throws_ok($$ update public.notifications set title = 'x' $$, '42501', null,
  'a member changes nothing but read_at');
select pg_temp.login('00000000-0000-4000-8000-000000000904');
select throws_ok(
  $$ insert into public.reminder_rules (ledger_id, source_type, source_id, offsets_days)
     select ledger_id, 'obligation', gen_random_uuid(), '{0}' from spaces where name = 'shared' $$,
  '42501', null, 'a stranger cannot add a rule to the space');
select throws_ok(
  $$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('00000000-0000-4000-8000-000000000901', 'https://push.example.com/send/pgtap-x', 'k', 'a') $$,
  '42501', null, 'nobody registers a device for someone else');
reset role;

select * from finish();
rollback;
