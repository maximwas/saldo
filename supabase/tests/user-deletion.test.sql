-- Deleting an auth user (ADR 27): owned spaces go with their data, memberships elsewhere go, created_by becomes null.
-- Runs as the test superuser, like the Dashboard / auth.admin.deleteUser path (supabase_auth_admin).
begin;
select plan(13);

-- 11 owner of a shared space, 12 editor in it, 13 owns a space that 11 created (a future ownership transfer),
-- 14 has no space at all
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000011', 'pgtap-del-owner@example.com'),
  ('00000000-0000-4000-8000-000000000012', 'pgtap-del-editor@example.com'),
  ('00000000-0000-4000-8000-000000000013', 'pgtap-del-heir@example.com'),
  ('00000000-0000-4000-8000-000000000014', 'pgtap-del-empty@example.com');

create temp table spaces (name text primary key, ledger_id uuid);
insert into spaces
select 'shared', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000011'
union all
select 'editor_own', id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000012'
union all
select 'handed_over', gen_random_uuid();

insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000012'::uuid, 'editor' from spaces where name = 'shared';
insert into public.ledger_invites (ledger_id, email, role, token_hash, created_by)
select ledger_id, 'friend@example.com', 'viewer', sha256('del-token'), '00000000-0000-4000-8000-000000000011'
from spaces where name = 'shared';
insert into public.ledgers (id, name, created_by)
select ledger_id, 'Передано', '00000000-0000-4000-8000-000000000011' from spaces where name = 'handed_over';
insert into public.ledger_members (ledger_id, user_id, role)
select ledger_id, '00000000-0000-4000-8000-000000000013'::uuid, 'owner' from spaces where name = 'handed_over';
update public.user_settings set last_ledger_id = (select ledger_id from spaces where name = 'shared')
where user_id = '00000000-0000-4000-8000-000000000013';

-- editor: only their own space and their membership go; the shared space stays with its owner
select lives_ok($$ delete from auth.users where id = '00000000-0000-4000-8000-000000000012' $$, 'editor can be deleted');
select is((select count(*)::int from public.ledgers where id = (select ledger_id from spaces where name = 'shared')),
  1, 'shared space stays after the editor is deleted');
select is((select count(*)::int from public.ledger_members where ledger_id = (select ledger_id from spaces where name = 'shared')),
  1, 'only the owner row is left in the shared space');
select is((select role from public.ledger_members where ledger_id = (select ledger_id from spaces where name = 'shared')),
  'owner', 'the remaining member is the owner');
select is((select count(*)::int from public.ledgers where id = (select ledger_id from spaces where name = 'editor_own')),
  0, 'the editor''s own space is deleted');

-- owner: the owned space goes with members and invites; a space they created but do not own stays
select lives_ok($$ delete from auth.users where id = '00000000-0000-4000-8000-000000000011' $$, 'owner can be deleted');
select is((select count(*)::int from public.ledgers where id = (select ledger_id from spaces where name = 'shared')),
  0, 'the owned space is deleted');
select is((select count(*)::int from public.ledger_members where ledger_id = (select ledger_id from spaces where name = 'shared')),
  0, 'its members are deleted');
select is((select count(*)::int from public.ledger_invites where ledger_id = (select ledger_id from spaces where name = 'shared')),
  0, 'its invites are deleted');
select is((select created_by from public.ledgers where id = (select ledger_id from spaces where name = 'handed_over')),
  null::uuid, 'a space created but not owned stays, created_by becomes null');
select is((select last_ledger_id from public.user_settings where user_id = '00000000-0000-4000-8000-000000000013'),
  null::uuid, 'another user''s last_ledger_id pointing at the deleted space becomes null');

-- a user without any space
delete from public.ledgers where created_by = '00000000-0000-4000-8000-000000000014';
select lives_ok($$ delete from auth.users where id = '00000000-0000-4000-8000-000000000014' $$, 'a user with no space can be deleted');

-- a direct update still cannot clear the author
select throws_ok(
  $$ update public.ledgers set created_by = null where created_by = '00000000-0000-4000-8000-000000000013' $$,
  '42501', null, 'created_by cannot be cleared by hand');

select * from finish();
rollback;
