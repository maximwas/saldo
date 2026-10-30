-- Own name in a space (review of phase 1 wave B): every member, the owner included, sets their own
-- ledger_members.display_name. An RPC rather than a self-update policy: RLS picks rows, not columns, and the column
-- grant on ledger_members includes role (the owner changes roles), so a policy letting a member update their own row
-- would let them make themselves owner or editor. This one writes display_name of the caller's own row and nothing else.
-- Blank → null (the UI falls back to the email prefix).
create function public.set_my_display_name(p_ledger_id uuid, p_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(p_name), '');
begin
  if char_length(v_name) > 60 then
    raise exception 'display name is longer than 60 characters' using errcode = '22023';
  end if;
  update public.ledger_members set display_name = v_name
  where ledger_id = p_ledger_id and user_id = auth.uid();
  if not found then
    raise exception 'not a member of this space' using errcode = '42501';
  end if;
end $$;

revoke execute on function public.set_my_display_name(uuid, text) from public, anon;
grant execute on function public.set_my_display_name(uuid, text) to authenticated;
