-- System category «Credits» (decision 12.11.2026), the same way as «Subscriptions» (20261103164941): every space
-- always has exactly one; it cannot be renamed, archived, moved or deleted (private.guard_system_category). A credit
-- installment without a category takes it, so pay_obligation files a paid installment under it instead of «No
-- category» in Budget and Statistics. Its colour, icon and place in the list stay editable.

alter table public.categories drop constraint categories_system_key_check;
alter table public.categories add constraint categories_system_key_check
  check (system_key in ('subscriptions', 'credits'));

-- Standard categories of §6 for a new space (create_ledger, the new-user trigger, delete_ledger_data): as in
-- 20261103164941, with «Credits» before «Other».
create or replace function private.seed_categories(p_ledger_id uuid, p_created_by uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.categories (ledger_id, kind, name, color, icon, sort_order, created_by, system_key)
  select p_ledger_id, c.kind, c.name, c.color, c.icon, c.sort_order, p_created_by, c.system_key
  from (values
    ('expense', 'Житло', 'blue', 'house', 1, null), ('expense', 'Продукти', 'green', 'shopping-basket', 2, null),
    ('expense', 'Кафе', 'yellow', 'coffee', 3, null), ('expense', 'Транспорт', 'cyan', 'bus', 4, null),
    ('expense', 'Авто', 'orange', 'car', 5, null), ('expense', 'Підписки', 'pink', 'repeat', 6, 'subscriptions'),
    ('expense', 'Здоров''я', 'red', 'heart-pulse', 7, null), ('expense', 'Покупки', 'purple', 'shopping-bag', 8, null),
    ('expense', 'Відпочинок', 'teal', 'tree-palm', 9, null), ('expense', 'Податки', 'slate', 'landmark', 10, null),
    ('expense', 'Кредити', 'indigo', 'credit-card', 11, 'credits'), ('expense', 'Інше', 'graphite', 'ellipsis', 12, null),
    ('income', 'Зарплата', 'forest', 'briefcase', 1, null), ('income', 'Фриланс', 'lime', 'laptop', 2, null),
    ('income', 'Подарунки', 'magenta', 'gift', 3, null), ('income', 'Інше', 'sand', 'coins', 4, null)
  ) as c (kind, name, color, icon, sort_order, system_key)
$$;

-- Existing spaces: their top-level expense «Credits» becomes the system one (a live one first, an archived one comes
-- back); a space without one gets a new category at the end of its expense list. The guard refuses a new marker on an
-- existing row, so it is off for this one statement.
alter table public.categories disable trigger categories_guard_system_update;
update public.categories c
set system_key = 'credits', name = 'Кредити', archived_at = null
from (
  select distinct on (ledger_id) id
  from public.categories
  where kind = 'expense' and parent_id is null and system_key is null and lower(btrim(name)) = 'кредити'
  order by ledger_id, archived_at nulls first, sort_order, created_at
) pick
where c.id = pick.id;
alter table public.categories enable trigger categories_guard_system_update;

insert into public.categories (ledger_id, kind, name, color, icon, sort_order, created_by, system_key)
select l.id, 'expense', 'Кредити', 'indigo', 'credit-card',
  coalesce((select max(c.sort_order) from public.categories c
    where c.ledger_id = l.id and c.kind = 'expense' and c.parent_id is null), 0) + 1,
  l.created_by, 'credits'
from public.ledgers l
where not exists (select 1 from public.categories c where c.ledger_id = l.id and c.system_key = 'credits');

-- A new installment (save_credit, replace_credit_schedule) without a category takes the system one; a category set on
-- an installment stays, and pay_obligation copies the installment's category into the operation it writes.
create function private.credit_system_category() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.category_id := (
    select id from public.categories where ledger_id = new.ledger_id and system_key = 'credits'
  );
  return new;
end $$;
revoke execute on function private.credit_system_category() from public;

create trigger obligations_credit_system_category before insert on public.obligations
  for each row when (new.source_type = 'credit' and new.category_id is null)
  execute function private.credit_system_category();

-- Existing installments without a category take it too; a category already there is never overwritten.
update public.obligations o
set category_id = c.id
from public.categories c
where c.ledger_id = o.ledger_id and c.system_key = 'credits' and o.source_type = 'credit' and o.category_id is null;
