-- Category palette: the standard set of a new space and the upgrade of existing spaces (migration category_palette).
begin;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-4000-8000-000000000301', 'pgtap-palette@example.com');

create temp table palette_space as
  select id as ledger_id from public.ledgers where created_by = '00000000-0000-4000-8000-000000000301';

select is((select count(*)::int from public.categories where ledger_id = (select ledger_id from palette_space)), 15,
  'a new space gets 15 standard categories');
select is((select count(distinct color)::int from public.categories where ledger_id = (select ledger_id from palette_space)),
  15, 'all 15 have a different colour');
select is((select count(*)::int from public.categories
  where ledger_id = (select ledger_id from palette_space) and icon is null), 0, 'every standard category has an icon');

-- a space seeded before the migration: old colours, no icons; the owner recoloured one category and gave another an icon
update public.categories set color = 'blue', icon = 'coffee'
  where ledger_id = (select ledger_id from palette_space) and name = 'Кафе';
update public.categories set color = 'red', icon = null
  where ledger_id = (select ledger_id from palette_space) and name = 'Авто';
update public.categories set color = 'cyan', icon = null
  where ledger_id = (select ledger_id from palette_space) and name = 'Транспорт';
update public.categories set color = null, icon = null
  where ledger_id = (select ledger_id from palette_space) and name = 'Податки';

select private.apply_category_palette();

select is((select color || '/' || icon from public.categories
  where ledger_id = (select ledger_id from palette_space) and name = 'Транспорт'), 'cyan/bus',
  'an untouched old default gets its icon');
select is((select color || '/' || icon from public.categories
  where ledger_id = (select ledger_id from palette_space) and name = 'Податки'), 'slate/landmark',
  'an old neutral default gets the new colour and icon');
select is((select color || '/' || icon from public.categories
  where ledger_id = (select ledger_id from palette_space) and name = 'Кафе'), 'blue/coffee',
  'a category the user changed (colour and icon) is not overwritten');
select is((select color from public.categories
  where ledger_id = (select ledger_id from palette_space) and name = 'Авто' and icon is null), 'red',
  'a recoloured category without an icon keeps its colour');

select * from finish();
rollback;
