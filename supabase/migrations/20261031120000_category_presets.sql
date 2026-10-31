-- Category palette: 31 presets (11 new, Figma «Saldo» category/* variables, 31.10.2026). Existing colour names stay.

alter table public.accounts drop constraint accounts_color_check;
alter table public.accounts add constraint accounts_color_check check (color in (
  'blue', 'green', 'orange', 'pink', 'purple', 'teal', 'yellow', 'red', 'cyan', 'lime',
  'brown', 'sand', 'olive', 'forest', 'indigo', 'violet', 'magenta', 'wine', 'slate', 'graphite',
  'navy', 'ocean', 'jade', 'pine', 'plum', 'berry', 'terracotta', 'rose', 'lavender', 'sage', 'stone'));

alter table public.categories drop constraint categories_color_check;
alter table public.categories add constraint categories_color_check check (color in (
  'blue', 'green', 'orange', 'pink', 'purple', 'teal', 'yellow', 'red', 'cyan', 'lime',
  'brown', 'sand', 'olive', 'forest', 'indigo', 'violet', 'magenta', 'wine', 'slate', 'graphite',
  'navy', 'ocean', 'jade', 'pine', 'plum', 'berry', 'terracotta', 'rose', 'lavender', 'sage', 'stone'));
