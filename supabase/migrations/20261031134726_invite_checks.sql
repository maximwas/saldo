-- Invite checks (Figma «Saldo» 32:94877 / 32:95165): the invitee must already have a Saldo account and must not be in
-- the space yet. Reading auth.users needs security definer, so the owner check that RLS made is explicit here.
-- Errors: 42501 not the owner, SL404 no Saldo account with this email, SL409 already a member, 23514 role «owner».
create or replace function public.create_ledger_invite(p_id uuid, p_ledger_id uuid, p_email text, p_role text, p_token_hash bytea)
returns public.ledger_invites
language plpgsql security definer set search_path = '' as $$
declare
  r public.ledger_invites;
begin
  if p_ledger_id not in (select private.my_owned_ledger_ids()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from auth.users u where lower(u.email) = lower(p_email)) then
    raise exception 'no saldo account with this email' using errcode = 'SL404';
  end if;
  if exists (
    select 1 from public.ledger_members m join auth.users u on u.id = m.user_id
    where m.ledger_id = p_ledger_id and lower(u.email) = lower(p_email)
  ) then
    raise exception 'already a member' using errcode = 'SL409';
  end if;
  insert into public.ledger_invites (id, ledger_id, email, role, token_hash)
  values (p_id, p_ledger_id, p_email, p_role, p_token_hash)
  on conflict (id) do nothing
  returning * into r;
  if r.id is null then
    -- a replay of this owner's own invite; definer skips RLS, so never hand back another space's row
    select * into r from public.ledger_invites where id = p_id and ledger_id = p_ledger_id;
  end if;
  return r;
end $$;

revoke execute on function public.create_ledger_invite(uuid, uuid, text, text, bytea) from public, anon;
grant execute on function public.create_ledger_invite(uuid, uuid, text, text, bytea) to authenticated;
