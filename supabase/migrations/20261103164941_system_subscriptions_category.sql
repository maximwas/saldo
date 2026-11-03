-- System category «Subscriptions» (Maxim, 3.11.2026): every space always has exactly one; it cannot be renamed, archived,
-- moved or deleted, and every subscription takes it, so every payment of a subscription series does too. The
-- subscription form has no category field any more. Its colour, icon and place in the list stay editable.

alter table public.categories add column system_key text
  constraint categories_system_key_check check (system_key in ('subscriptions'));
-- a system category is a live top-level expense category
alter table public.categories add constraint categories_system_shape
  check (system_key is null or (kind = 'expense' and parent_id is null and archived_at is null));
create unique index categories_ledger_id_system_key_key on public.categories (ledger_id, system_key)
  where system_key is not null;

-- Standard categories of §6 for a new space (create_ledger, the new-user trigger, delete_ledger_data): as before, with
-- «Subscriptions» marked as the system one.
create or replace function private.seed_categories(p_ledger_id uuid, p_created_by uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.categories (ledger_id, kind, name, color, icon, sort_order, created_by, system_key)
  select p_ledger_id, c.kind, c.name, c.color, c.icon, c.sort_order, p_created_by,
    case when c.kind = 'expense' and c.name = 'Підписки' then 'subscriptions' end
  from (values
    ('expense', 'Житло', 'blue', 'house', 1), ('expense', 'Продукти', 'green', 'shopping-basket', 2),
    ('expense', 'Кафе', 'yellow', 'coffee', 3), ('expense', 'Транспорт', 'cyan', 'bus', 4),
    ('expense', 'Авто', 'orange', 'car', 5), ('expense', 'Підписки', 'pink', 'repeat', 6),
    ('expense', 'Здоров''я', 'red', 'heart-pulse', 7), ('expense', 'Покупки', 'purple', 'shopping-bag', 8),
    ('expense', 'Відпочинок', 'teal', 'tree-palm', 9), ('expense', 'Податки', 'slate', 'landmark', 10),
    ('expense', 'Інше', 'graphite', 'ellipsis', 11),
    ('income', 'Зарплата', 'forest', 'briefcase', 1), ('income', 'Фриланс', 'lime', 'laptop', 2),
    ('income', 'Подарунки', 'magenta', 'gift', 3), ('income', 'Інше', 'sand', 'coins', 4)
  ) as c (kind, name, color, icon, sort_order)
$$;

-- Existing spaces: their top-level expense «Subscriptions» becomes the system one (a live one first, an archived one comes
-- back); a space without one gets a new category at the end of its expense list.
update public.categories c
set system_key = 'subscriptions', name = 'Підписки', archived_at = null
from (
  select distinct on (ledger_id) id
  from public.categories
  where kind = 'expense' and parent_id is null and lower(btrim(name)) = 'підписки'
  order by ledger_id, archived_at nulls first, sort_order, created_at
) pick
where c.id = pick.id;

insert into public.categories (ledger_id, kind, name, color, icon, sort_order, created_by, system_key)
select l.id, 'expense', 'Підписки', 'pink', 'repeat',
  coalesce((select max(c.sort_order) from public.categories c
    where c.ledger_id = l.id and c.kind = 'expense' and c.parent_id is null), 0) + 1,
  l.created_by, 'subscriptions'
from public.ledgers l
where not exists (select 1 from public.categories c where c.ledger_id = l.id and c.system_key = 'subscriptions');

-- Existing subscriptions and the unpaid active dates of their series move to it; paid dates and their operations keep
-- the category they were paid with (§26: history is not rewritten).
update public.subscriptions s
set category_id = c.id
from public.categories c
where c.ledger_id = s.ledger_id and c.system_key = 'subscriptions' and s.category_id is distinct from c.id;

update public.obligations o
set category_id = c.id
from public.categories c
where c.ledger_id = o.ledger_id and c.system_key = 'subscriptions' and o.category_id is distinct from c.id
  and o.id in (
    select x.id from public.obligations x
    where x.source_type = 'subscription' and x.lifecycle = 'active' and private.is_unpaid(x)
  );

-- The guard. Rows go only through the space: a ledger deletion (its cascade, delete_ledger_data, a deleted account)
-- takes the system category along; anything else that deletes it, renames, archives, re-kinds or re-parents it, or
-- moves the marker, is refused.
create function private.guard_system_category() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.ledgers where id = old.ledger_id) then
      raise exception 'the system category cannot be deleted' using errcode = '42501';
    end if;
    return old;
  end if;

  if new.system_key is distinct from old.system_key
    or (new.name, new.kind, new.parent_id, new.archived_at)
      is distinct from (old.name, old.kind, old.parent_id, old.archived_at) then
    raise exception 'the system category cannot be renamed, archived or moved' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function private.guard_system_category() from public;

create trigger categories_guard_system_update before update on public.categories
  for each row when (old.system_key is not null or new.system_key is not null)
  execute function private.guard_system_category();
create trigger categories_guard_system_delete before delete on public.categories
  for each row when (old.system_key is not null)
  execute function private.guard_system_category();

-- Every subscription takes the system category of its space, whatever the client (form, MCP, delete_category's move)
-- sends; upsert_series_obligations and the daily horizon copy it into each new date.
create function private.subscription_system_category() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.category_id := (
    select id from public.categories where ledger_id = new.ledger_id and system_key = 'subscriptions'
  );
  return new;
end $$;
revoke execute on function private.subscription_system_category() from public;

create trigger subscriptions_system_category before insert or update of category_id, ledger_id on public.subscriptions
  for each row execute function private.subscription_system_category();
