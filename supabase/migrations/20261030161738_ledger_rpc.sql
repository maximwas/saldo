-- Space RPCs (docs/architecture.md §3.8, §5.0, §5.10; ADR 19, 20). The UI comes in phase 1 wave B.

-- ledgers and ledger_members have no INSERT policy: a policy that lets a user insert an owner row would let them
-- become owner of any space. So this one is security definer and checks auth.uid() itself.
create function public.create_ledger(p_id uuid, p_name text, p_base_currency text default 'UAH') returns public.ledgers
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.ledgers;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  insert into public.ledgers (id, name, base_currency, created_by)
  values (p_id, p_name, p_base_currency, v_uid)
  on conflict (id) do nothing
  returning * into r;
  if r.id is null then
    -- replay of the same create; someone else's id is not revealed
    select * into r from public.ledgers where id = p_id and created_by = v_uid;
    if not found then
      raise exception 'ledger id is taken' using errcode = '23505';
    end if;
    return r;
  end if;
  insert into public.ledger_members (ledger_id, user_id, role) values (r.id, v_uid, 'owner');
  perform private.seed_categories(r.id, v_uid);
  return r;
end $$;

-- Owner only (ledger_invites RLS): an editor gets 42501. The token is made and kept in the browser; only its hash
-- comes here.
create function public.create_ledger_invite(p_id uuid, p_ledger_id uuid, p_email text, p_role text, p_token_hash bytea)
returns public.ledger_invites
language plpgsql security invoker set search_path = '' as $$
declare
  r public.ledger_invites;
begin
  insert into public.ledger_invites (id, ledger_id, email, role, token_hash)
  values (p_id, p_ledger_id, p_email, p_role, p_token_hash)
  on conflict (id) do nothing
  returning * into r;
  if r.id is null then
    select * into r from public.ledger_invites where id = p_id;
  end if;
  return r;
end $$;

-- The invitee is not a member yet, so RLS hides the invite from them: security definer, with every check explicit.
-- token_hash = SHA-256 of the UTF-8 token string from the link. Errors: P0002 no such invite, PT410 expired /
-- revoked / used by someone else, 42501 the signed-in email is not the invited one. A repeat by the same person
-- returns the space again.
create function public.accept_ledger_invite(p_token text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  i public.ledger_invites;
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  select * into i from public.ledger_invites where token_hash = sha256(convert_to(p_token, 'UTF8')) for update;
  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;
  if i.accepted_at is not null then
    if i.accepted_by = v_uid then
      return i.ledger_id;
    end if;
    raise exception 'invite already used' using errcode = 'PT410';
  end if;
  if i.revoked_at is not null or i.expires_at <= now() then
    raise exception 'invite expired or revoked' using errcode = 'PT410';
  end if;
  -- citext operators live in the extensions schema, outside this empty search_path: compare lowercased text
  if lower(i.email::text) is distinct from lower(auth.jwt() ->> 'email') then
    raise exception 'invite is for another email' using errcode = '42501';
  end if;

  insert into public.ledger_members (ledger_id, user_id, role)
  values (i.ledger_id, v_uid, i.role)
  on conflict (ledger_id, user_id) do nothing;
  update public.ledger_invites set accepted_at = now(), accepted_by = v_uid where id = i.id;
  return i.ledger_id;
end $$;

-- Owner only, never the owner row (ledger_members RLS); nothing changed = not allowed
create function public.set_member_role(p_ledger_id uuid, p_user_id uuid, p_role text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if p_role not in ('editor', 'viewer') then
    raise exception 'role must be editor or viewer' using errcode = '22023';
  end if;
  update public.ledger_members set role = p_role where ledger_id = p_ledger_id and user_id = p_user_id;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;

-- The owner removes anyone but themselves; any other member removes themselves (leave the space)
create function public.remove_member(p_ledger_id uuid, p_user_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.ledger_members where ledger_id = p_ledger_id and user_id = p_user_id;
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
end $$;

revoke execute on function public.create_ledger(uuid, text, text),
  public.create_ledger_invite(uuid, uuid, text, text, bytea), public.accept_ledger_invite(text),
  public.set_member_role(uuid, uuid, text), public.remove_member(uuid, uuid) from public, anon;
grant execute on function public.create_ledger(uuid, text, text),
  public.create_ledger_invite(uuid, uuid, text, text, bytea), public.accept_ledger_invite(text),
  public.set_member_role(uuid, uuid, text), public.remove_member(uuid, uuid) to authenticated;
