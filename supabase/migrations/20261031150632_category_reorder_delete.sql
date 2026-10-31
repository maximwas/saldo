-- Category order and a real delete (Figma «Saldo» 35:104232 / 2:52713).

-- New order for any set of categories in one transaction: p_items = [{"id", "version", "sort_order"}]. A stale version
-- raises PT409 and nothing is written; rows whose place does not change are left alone (their version stays).
create function public.reorder_categories(p_items jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  item record;
  c public.categories;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be an array' using errcode = '22023';
  end if;

  -- id order: two concurrent reorders lock the same rows in the same order
  for item in
    select (e->>'id')::uuid as id, (e->>'version')::int as version, (e->>'sort_order')::int as sort_order
    from jsonb_array_elements(p_items) e
    order by 1
  loop
    select * into c from public.categories where id = item.id for update;
    if not found then
      raise exception 'category not found' using errcode = 'P0002';
    end if;
    perform private.assert_writable(c.ledger_id);
    if c.version <> item.version then
      raise exception 'category was changed by someone else' using errcode = 'PT409';
    end if;
    if c.sort_order <> item.sort_order then
      update public.categories set sort_order = item.sort_order where id = c.id;
    end if;
  end loop;
end $$;

-- Deletes a category with its subcategories (two levels at most). Their operations, obligations and subscriptions move
-- to p_move_to first (same kind, outside the deleted family); without it a category in use cannot go
-- (the foreign keys refuse, 23503). Budget limits of the deleted categories go with them (on delete cascade).
create function public.delete_category(p_id uuid, p_move_to uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.categories;
  family uuid[];
begin
  select * into c from public.categories where id = p_id for update;
  if not found then
    raise exception 'category not found' using errcode = 'P0002';
  end if;
  perform private.assert_writable(c.ledger_id);

  select array_agg(id) into family from public.categories
  where ledger_id = c.ledger_id and (id = p_id or parent_id = p_id);

  if p_move_to is not null then
    if p_move_to = any (family) then
      raise exception 'cannot move into the deleted category' using errcode = '22023';
    end if;
    update public.operations set category_id = p_move_to
    where ledger_id = c.ledger_id and category_id = any (family);
    update public.obligations set category_id = p_move_to
    where ledger_id = c.ledger_id and category_id = any (family);
    update public.subscriptions set category_id = p_move_to
    where ledger_id = c.ledger_id and category_id = any (family);
  end if;

  delete from public.categories where ledger_id = c.ledger_id and parent_id = p_id;
  delete from public.categories where id = p_id;
end $$;

revoke execute on function public.reorder_categories(jsonb), public.delete_category(uuid, uuid) from public, anon;
grant execute on function public.reorder_categories(jsonb), public.delete_category(uuid, uuid) to authenticated;
