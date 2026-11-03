-- One profile photo per person for every space (Figma section 59:153077): a 512×512 image in the
-- private bucket avatars at <user_id>.webp. The person writes and deletes only their own object; they and everyone
-- who shares a space with them read it, strangers do not. user_settings keeps the reference: avatar_path is null
-- without a photo, avatar_updated_at changes the image URL so browsers drop the old one.
alter table public.user_settings
  add column avatar_path text,
  add column avatar_updated_at timestamptz,
  add constraint user_settings_avatar_path check (avatar_path is null or avatar_path = user_id::text || '.webp');

-- WebP, or JPEG from browsers whose canvas cannot encode WebP (Safari); the client sends 512×512, well under 1 MiB
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

-- Everyone who shares a space with the caller, the caller included (they are a member of their own space)
create function private.my_co_member_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct other.user_id
  from public.ledger_members mine
  join public.ledger_members other on other.ledger_id = mine.ledger_id
  where mine.user_id = (select auth.uid())
$$;

revoke execute on function private.my_co_member_ids() from public;
grant execute on function private.my_co_member_ids() to authenticated;

create policy avatars_objects_read on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and name in (select id::text || '.webp' from private.my_co_member_ids() id));
-- upsert (a new photo over the old one) needs insert, select and update
create policy avatars_objects_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');
create policy avatars_objects_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp')
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');
create policy avatars_objects_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '.webp');

-- Authorship of planned payments in rows of shared spaces: the view gains the obligation's created_by (appended, so
-- the functions returning setof obligation_states keep their columns in place)
create or replace view public.obligation_states with (security_invoker = true) as
select
  o.id as obligation_id,
  o.ledger_id,
  o.direction,
  o.source_type,
  o.source_id,
  o.title,
  o.occurrence_on,
  o.due_on,
  o.sequence_no,
  o.planned_amount_minor,
  o.currency,
  o.account_id,
  o.category_id,
  o.lifecycle,
  o.settled_at,
  o.settled_by,
  o.version,
  p.paid_minor,
  case when o.planned_amount_minor is not null then greatest(o.planned_amount_minor - p.paid_minor, 0) end as remaining_minor,
  case when o.planned_amount_minor is not null then greatest(p.paid_minor - o.planned_amount_minor, 0) end as overpaid_minor,
  case
    when o.lifecycle <> 'active' then o.lifecycle
    when o.settled_at is not null or p.paid_minor >= o.planned_amount_minor then 'paid'
    when p.paid_minor > 0 then 'partial'
    when o.due_on < (now() at time zone l.time_zone)::date then 'unconfirmed'
    else 'plan'
  end as state,
  o.created_by
from public.obligations o
join public.ledgers l on l.id = o.ledger_id
cross join lateral (
  select coalesce(sum(op.amount_minor), 0)::bigint as paid_minor
  from public.obligation_payments op
  where op.ledger_id = o.ledger_id and op.obligation_id = o.id
) p;
