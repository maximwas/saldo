-- Category palette: 20 hues (10 new, Figma «Saldo» palette) and an icon for every standard category.

alter table public.accounts drop constraint accounts_color_check;
alter table public.accounts add constraint accounts_color_check check (color in (
  'blue', 'green', 'orange', 'pink', 'purple', 'teal', 'yellow', 'red', 'cyan', 'lime',
  'brown', 'sand', 'olive', 'forest', 'indigo', 'violet', 'magenta', 'wine', 'slate', 'graphite'));

alter table public.categories drop constraint categories_color_check;
alter table public.categories add constraint categories_color_check check (color in (
  'blue', 'green', 'orange', 'pink', 'purple', 'teal', 'yellow', 'red', 'cyan', 'lime',
  'brown', 'sand', 'olive', 'forest', 'indigo', 'violet', 'magenta', 'wine', 'slate', 'graphite'));

-- Standard categories of §6 for a new space: all 15 differ in colour, every one has an icon.
create or replace function private.seed_categories(p_ledger_id uuid, p_created_by uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.categories (ledger_id, kind, name, color, icon, sort_order, created_by)
  select p_ledger_id, c.kind, c.name, c.color, c.icon, c.sort_order, p_created_by
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

-- Existing spaces: a top-level category still carrying the old seeded colour and no icon gets the new pair. A category
-- someone gave an icon or another colour does not match, so it is never overwritten; a second run matches nothing.
-- A function so the pgTAP test can run it on prepared rows.
create function private.apply_category_palette() returns void
language sql security definer set search_path = '' as $$
update public.categories c
set color = d.color, icon = d.icon
from (values
  ('expense', 'Житло', 'blue', 'blue', 'house'), ('expense', 'Продукти', 'green', 'green', 'shopping-basket'),
  ('expense', 'Кафе', 'yellow', 'yellow', 'coffee'), ('expense', 'Транспорт', 'cyan', 'cyan', 'bus'),
  ('expense', 'Авто', 'orange', 'orange', 'car'), ('expense', 'Підписки', 'pink', 'pink', 'repeat'),
  ('expense', 'Здоров''я', 'red', 'red', 'heart-pulse'), ('expense', 'Покупки', 'purple', 'purple', 'shopping-bag'),
  ('expense', 'Відпочинок', 'teal', 'teal', 'tree-palm'), ('expense', 'Податки', null, 'slate', 'landmark'),
  ('expense', 'Інше', null, 'graphite', 'ellipsis'),
  ('income', 'Зарплата', 'green', 'forest', 'briefcase'), ('income', 'Фриланс', 'lime', 'lime', 'laptop'),
  ('income', 'Подарунки', 'pink', 'magenta', 'gift'), ('income', 'Інше', null, 'sand', 'coins')
) as d (kind, name, old_color, color, icon)
where c.kind = d.kind and c.name = d.name and c.parent_id is null and c.icon is null
  and c.color is not distinct from d.old_color;
$$;
revoke execute on function private.apply_category_palette() from public;

select private.apply_category_palette();
