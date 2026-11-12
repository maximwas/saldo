-- Profile photos (migration avatars): bucket avatars, object <user_id>.webp. The person writes, replaces and deletes
-- only their own photo; they and members of a space they share read it; a stranger does not. Fictional data only.
begin;
select plan(13);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- 1 owner, 2 editor, 3 viewer of the owner's space, 4 stranger
insert into auth.users (id, email) values
  ('00000000-0000-4000-8000-000000000501', 'pgtap-photo-owner@example.com'),
  ('00000000-0000-4000-8000-000000000502', 'pgtap-photo-editor@example.com'),
  ('00000000-0000-4000-8000-000000000503', 'pgtap-photo-viewer@example.com'),
  ('00000000-0000-4000-8000-000000000504', 'pgtap-photo-stranger@example.com');
insert into public.ledger_members (ledger_id, user_id, role)
select id, '00000000-0000-4000-8000-000000000502'::uuid, 'editor' from public.ledgers
where created_by = '00000000-0000-4000-8000-000000000501'
union all
select id, '00000000-0000-4000-8000-000000000503'::uuid, 'viewer' from public.ledgers
where created_by = '00000000-0000-4000-8000-000000000501';

-- the Storage API deletes with this flag on; without it storage.protect_delete refuses any SQL delete
select set_config('storage.allow_delete_query', 'true', true);

create function pg_temp.upload(p_name text) returns void language sql as $$
  insert into storage.objects (bucket_id, name) values ('avatars', p_name)
$$;
create function pg_temp.visible(p_name text) returns int language sql as $$
  select count(*)::int from storage.objects where bucket_id = 'avatars' and name = p_name
$$;
create function pg_temp.replace(p_name text) returns int language plpgsql as $$
declare v_count int;
begin
  update storage.objects set metadata = '{"size": 1}' where bucket_id = 'avatars' and name = p_name;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
create function pg_temp.remove(p_name text) returns int language plpgsql as $$
declare v_count int;
begin
  delete from storage.objects where bucket_id = 'avatars' and name = p_name;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

select pg_temp.login('00000000-0000-4000-8000-000000000501');
select lives_ok($$ select pg_temp.upload('00000000-0000-4000-8000-000000000501.webp') $$, 'the owner uploads their photo');
select throws_ok($$ select pg_temp.upload('00000000-0000-4000-8000-000000000502.webp') $$, '42501', null,
  'nobody uploads a photo under another person''s name');
select is(pg_temp.visible('00000000-0000-4000-8000-000000000501.webp'), 1, 'the owner sees their own photo');
select throws_ok($$ update public.user_settings set avatar_path = '00000000-0000-4000-8000-000000000502.webp'
  where user_id = '00000000-0000-4000-8000-000000000501' $$, '23514', null,
  'user_settings points only at the person''s own photo');

select pg_temp.login('00000000-0000-4000-8000-000000000502');
select is(pg_temp.visible('00000000-0000-4000-8000-000000000501.webp'), 1, 'an editor of a shared space sees the photo');
select is(pg_temp.replace('00000000-0000-4000-8000-000000000501.webp'), 0, 'an editor cannot replace someone''s photo');
select is(pg_temp.remove('00000000-0000-4000-8000-000000000501.webp'), 0, 'an editor cannot delete someone''s photo');

select pg_temp.login('00000000-0000-4000-8000-000000000503');
select is(pg_temp.visible('00000000-0000-4000-8000-000000000501.webp'), 1, 'a viewer of a shared space sees the photo');

select pg_temp.login('00000000-0000-4000-8000-000000000504');
select is(pg_temp.visible('00000000-0000-4000-8000-000000000501.webp'), 0, 'a stranger does not see the photo');
select throws_ok($$ select pg_temp.upload('00000000-0000-4000-8000-000000000501.webp') $$, '42501', null,
  'a stranger cannot write the owner''s photo');

select pg_temp.login('00000000-0000-4000-8000-000000000501');
select is(pg_temp.replace('00000000-0000-4000-8000-000000000501.webp'), 1, 'the owner replaces their photo');
select is(pg_temp.remove('00000000-0000-4000-8000-000000000501.webp'), 1, 'the owner deletes their photo');
reset role;
select is(pg_temp.visible('00000000-0000-4000-8000-000000000501.webp'), 0, 'the deleted photo is gone');

select * from finish();
rollback;
